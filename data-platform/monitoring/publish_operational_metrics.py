"""Publish tenant-scoped Silver quality metrics to the PostgreSQL serving layer."""

import argparse
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from pyspark.sql import DataFrame, SparkSession, functions as F

sys.path.insert(0, str(Path(__file__).parents[1] / "silver"))
from order_created_silver import UUID_PATTERN, with_quality_results  # noqa: E402

TOKEN_SCOPE = "https://ossrdbms-aad.database.windows.net/.default"
CONTRACT_VERSION = "order-event.v1"
QUARANTINE_METRIC = "silver.quarantine.rate"

QUALITY_METADATA = {
    "INVALID_EVENT_ID": ("Valid UUID", "eventId", "Critical"),
    "INVALID_EVENT_TYPE": ("Supported event type", "eventType", "Critical"),
    "UNSUPPORTED_SCHEMA_VERSION": ("Supported schema", "schemaVersion", "Critical"),
    "MISSING_OCCURRED_AT": ("Required timestamp", "occurredAt", "Warning"),
    "INVALID_SOURCE": ("Valid source", "source", "Warning"),
    "INVALID_TENANT_ID": ("Valid tenant", "tenantId", "Critical"),
    "INVALID_ORDER_ID": ("Valid UUID", "data.orderId", "Critical"),
    "INVALID_CUSTOMER_ID": ("Valid UUID", "data.customerId", "Critical"),
    "INVALID_ORDER_NUMBER": ("Required value", "data.orderNumber", "Critical"),
    "INVALID_CURRENCY": ("Valid ISO currency", "data.currency", "Warning"),
    "INVALID_TOTAL_AMOUNT": ("Non-negative amount", "data.totalAmountMinor", "Critical"),
    "MISSING_ORDER_LINES": ("Required order lines", "data.lines", "Critical"),
    "INVALID_LINE_NUMBER": ("Positive line number", "data.lines[].lineNumber", "Critical"),
    "INVALID_SKU": ("Required SKU", "data.lines[].sku", "Critical"),
    "INVALID_QUANTITY": ("Positive quantity", "data.lines[].quantity", "Critical"),
    "INVALID_UNIT_PRICE": ("Non-negative price", "data.lines[].unitPriceMinor", "Critical"),
    "DUPLICATE_LINE_NUMBER": ("Unique line number", "data.lines[].lineNumber", "Warning"),
}


@dataclass(frozen=True)
class TenantQuality:
    tenant_id: str
    processed: int
    valid: int
    quarantined: int

    @property
    def error_rate(self) -> float:
        return self.quarantined / self.processed if self.processed else 0.0


def collect_tenant_quality(checked: DataFrame) -> list[TenantQuality]:
    """Collect only small per-tenant aggregates; event payloads stay in Delta Lake."""
    rows = (
        checked.filter(F.col("tenantId").rlike(UUID_PATTERN))
        .groupBy("tenantId")
        .agg(
            F.count("*").alias("processed"),
            F.sum(F.when(F.size("_quality_errors") == 0, 1).otherwise(0)).alias("valid"),
            F.sum(F.when(F.size("_quality_errors") > 0, 1).otherwise(0)).alias("quarantined"),
        )
        .collect()
    )
    return [TenantQuality(row.tenantId, row.processed, row.valid, row.quarantined) for row in rows]


def collect_violations(checked: DataFrame, tenant_id: str) -> list[tuple[str, str, int, str, str]]:
    rows = (
        checked.filter(F.col("tenantId") == tenant_id)
        .select("eventId", F.explode("_quality_errors").alias("code"))
        .groupBy("code")
        .agg(F.count("*").alias("count"), F.max("eventId").alias("latest_event_id"))
        .collect()
    )
    result = []
    for row in rows:
        rule, field, severity = QUALITY_METADATA.get(row.code, (row.code, "unknown", "Warning"))
        result.append((rule, field, row["count"], severity, row.latest_event_id or "not-set"))
    return result


def publish(
    spark: SparkSession,
    bronze_table: str,
    window_start: str,
    pipeline_run_id: str,
    postgres_host: str,
    postgres_database: str,
    postgres_user: str,
    azure_service_credential: str,
    quarantine_threshold: float,
) -> None:
    from databricks.sdk.runtime import dbutils
    import psycopg

    if not 0 < quarantine_threshold <= 1:
        raise ValueError("quarantine_threshold must be between 0 and 1")
    evaluated_at = datetime.now(timezone.utc)
    bronze = spark.table(bronze_table).filter(F.col("_ingested_at") >= F.to_timestamp(F.lit(window_start)))
    checked = with_quality_results(bronze)
    credential = dbutils.credentials.getServiceCredentialsProvider(azure_service_credential)
    token = credential.get_token(TOKEN_SCOPE).token

    with psycopg.connect(
        host=postgres_host,
        dbname=postgres_database,
        user=postgres_user,
        password=token,
        sslmode="require",
        connect_timeout=15,
    ) as connection:
        for quality in collect_tenant_quality(checked):
            run_id = uuid.uuid5(uuid.NAMESPACE_URL, f"nordicflow:{pipeline_run_id}:{quality.tenant_id}")
            violations = collect_violations(checked, quality.tenant_id)
            _upsert_quality(connection, run_id, quality, evaluated_at, violations)
            _evaluate_quarantine_alert(connection, run_id, quality, evaluated_at, quarantine_threshold)


def _upsert_quality(connection, run_id, quality, evaluated_at, violations) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO data_quality_runs
               (id, tenant_id, contract_version, processed_events, valid_events,
                quarantined_events, error_rate, evaluated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (id) DO UPDATE SET
                 processed_events = EXCLUDED.processed_events,
                 valid_events = EXCLUDED.valid_events,
                 quarantined_events = EXCLUDED.quarantined_events,
                 error_rate = EXCLUDED.error_rate,
                 evaluated_at = EXCLUDED.evaluated_at""",
            (run_id, quality.tenant_id, CONTRACT_VERSION, quality.processed, quality.valid,
             quality.quarantined, quality.error_rate, evaluated_at),
        )
        stages = [
            (1, "API ingress", quality.processed, "Healthy"),
            (2, "Event Hubs", quality.processed, "Healthy"),
            (3, "Bronze", quality.processed, "Healthy"),
            (4, "Silver", quality.valid, "Warning" if quality.quarantined else "Healthy"),
        ]
        cursor.executemany(
            """INSERT INTO data_lineage_stages
               (run_id, stage_order, name, status, event_count, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON CONFLICT (run_id, stage_order) DO UPDATE SET
                 status = EXCLUDED.status, event_count = EXCLUDED.event_count,
                 updated_at = EXCLUDED.updated_at""",
            [(run_id, order, name, status, count, evaluated_at) for order, name, count, status in stages],
        )
        cursor.execute("DELETE FROM data_contract_violations WHERE run_id = %s", (run_id,))
        cursor.executemany(
            """INSERT INTO data_contract_violations
               (run_id, rule, field, violation_count, severity, latest_event_id)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            [(run_id, *violation) for violation in violations],
        )


def _evaluate_quarantine_alert(connection, run_id, quality, evaluated_at, threshold) -> None:
    rule_id = uuid.uuid5(uuid.NAMESPACE_URL, f"nordicflow:{quality.tenant_id}:{QUARANTINE_METRIC}")
    alert_id = uuid.uuid5(uuid.NAMESPACE_URL, f"nordicflow:{run_id}:{QUARANTINE_METRIC}")
    threshold_percent = threshold * 100
    current_percent = quality.error_rate * 100
    with connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO alert_rules
               (id, tenant_id, name, metric, threshold, unit, evaluation_window_minutes, severity, enabled)
               VALUES (%s, %s, 'Quarantine rate', %s, %s, '%%', 15, 'Critical', true)
               ON CONFLICT (tenant_id, metric) DO UPDATE SET threshold = EXCLUDED.threshold, enabled = true""",
            (rule_id, quality.tenant_id, QUARANTINE_METRIC, threshold_percent),
        )
        if quality.error_rate >= threshold:
            cursor.execute(
                """INSERT INTO operational_alerts
                   (id, tenant_id, rule_id, title, source, severity, status, current_value,
                    threshold, unit, triggered_at, correlation_id)
                   VALUES (%s, %s, %s, 'Quarantine error rate spike', 'Silver validation',
                           'Critical', 'Open', %s, %s, '%%', %s, %s)
                   ON CONFLICT (id) DO UPDATE SET current_value = EXCLUDED.current_value,
                     threshold = EXCLUDED.threshold""",
                (alert_id, quality.tenant_id, rule_id, current_percent, threshold_percent,
                 evaluated_at, f"pipeline-run-{run_id}"),
            )
        else:
            cursor.execute(
                """UPDATE operational_alerts SET status = 'Resolved', resolved_at = %s
                   WHERE tenant_id = %s AND rule_id = %s AND status <> 'Resolved'""",
                (evaluated_at, quality.tenant_id, rule_id),
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bronze-table", required=True)
    parser.add_argument("--window-start", required=True)
    parser.add_argument("--pipeline-run-id", required=True)
    parser.add_argument("--postgres-host", required=True)
    parser.add_argument("--postgres-database", required=True)
    parser.add_argument("--postgres-user", required=True)
    parser.add_argument("--azure-service-credential", required=True)
    parser.add_argument("--quarantine-threshold", type=float, default=0.01)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    publish(spark, args.bronze_table, args.window_start, args.pipeline_run_id,  # noqa: F821
            args.postgres_host, args.postgres_database, args.postgres_user,
            args.azure_service_credential, args.quarantine_threshold)
