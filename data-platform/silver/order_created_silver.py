"""Databricks Silver transformation for OrderCreated v1.

Reads a Bronze Delta table, applies the contract's semantic quality rules, writes
valid records idempotently to Silver, and appends invalid records to quarantine.
Expected Bronze columns: the contract fields plus `_ingested_at` and `_raw_payload`.
"""

from pyspark.sql import DataFrame, SparkSession, functions as F

EVENT_TYPE = "nordicflow.order.created.v1"
UUID_PATTERN = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"


def with_quality_results(bronze: DataFrame) -> DataFrame:
    """Return rows enriched with an array of stable, machine-readable errors."""
    checks = [
        (F.col("eventId").isNull() | ~F.col("eventId").rlike(UUID_PATTERN), "INVALID_EVENT_ID"),
        (F.col("eventType") != EVENT_TYPE, "INVALID_EVENT_TYPE"),
        (F.col("schemaVersion") != 1, "UNSUPPORTED_SCHEMA_VERSION"),
        (F.col("occurredAt").isNull(), "MISSING_OCCURRED_AT"),
        (F.col("source").isNull() | ~F.length("source").between(1, 100), "INVALID_SOURCE"),
        (F.col("tenantId").isNull() | ~F.col("tenantId").rlike(UUID_PATTERN), "INVALID_TENANT_ID"),
        (F.col("data.orderId").isNull() | ~F.col("data.orderId").rlike(UUID_PATTERN), "INVALID_ORDER_ID"),
        (F.col("data.customerId").isNull() | ~F.col("data.customerId").rlike(UUID_PATTERN), "INVALID_CUSTOMER_ID"),
        (F.col("data.orderNumber").isNull() | ~F.length("data.orderNumber").between(1, 50), "INVALID_ORDER_NUMBER"),
        (F.col("data.currency").isNull() | ~F.col("data.currency").rlike(r"^[A-Z]{3}$"), "INVALID_CURRENCY"),
        (F.col("data.totalAmountMinor").isNull() | (F.col("data.totalAmountMinor") < 0), "INVALID_TOTAL_AMOUNT"),
        (F.col("data.lines").isNull() | (F.size("data.lines") < 1), "MISSING_ORDER_LINES"),
        (F.exists("data.lines", lambda line: line.lineNumber < 1), "INVALID_LINE_NUMBER"),
        (F.exists("data.lines", lambda line: line.sku.isNull() | ~F.length(line.sku).between(1, 100)), "INVALID_SKU"),
        (F.exists("data.lines", lambda line: line.quantity <= 0), "INVALID_QUANTITY"),
        (F.exists("data.lines", lambda line: line.unitPriceMinor < 0), "INVALID_UNIT_PRICE"),
        (F.size(F.array_distinct(F.transform("data.lines", lambda line: line.lineNumber))) != F.size("data.lines"), "DUPLICATE_LINE_NUMBER"),
    ]
    errors = F.array(*[F.when(condition, F.lit(code)) for condition, code in checks])
    return bronze.withColumn("_quality_errors", F.array_compact(errors))


def prepare_valid(checked: DataFrame) -> DataFrame:
    """Normalize and deduplicate records which passed all quality gates."""
    return (
        checked.filter(F.size("_quality_errors") == 0)
        .withColumn("occurred_at", F.to_timestamp("occurredAt"))
        .withColumn("order_number", F.trim("data.orderNumber"))
        .withColumn("currency", F.upper("data.currency"))
        .withColumn("_lineage_event_id", F.col("eventId"))
        .withColumn("_lineage_correlation_id", F.col("correlationId"))
        .withColumn("_lineage_source", F.col("source"))
        .withColumn("_silver_processed_at", F.current_timestamp())
        .dropDuplicates(["eventId"])
    )


def run(spark: SparkSession, bronze_table: str, silver_table: str, quarantine_table: str) -> None:
    from delta.tables import DeltaTable

    checked = with_quality_results(spark.table(bronze_table))
    invalid = (
        checked.filter(F.size("_quality_errors") > 0)
        .withColumn(
            "_record_fingerprint",
            F.sha2(F.coalesce(F.col("_raw_payload"), F.to_json(F.struct("*"))), 256),
        )
        .withColumn("_quarantined_at", F.current_timestamp())
        .dropDuplicates(["_record_fingerprint"])
    )
    if not spark.catalog.tableExists(quarantine_table):
        invalid.write.format("delta").saveAsTable(quarantine_table)
    else:
        DeltaTable.forName(spark, quarantine_table).alias("target").merge(
            invalid.alias("source"),
            "target._record_fingerprint = source._record_fingerprint",
        ).whenNotMatchedInsertAll().execute()

    valid = prepare_valid(checked)

    if not spark.catalog.tableExists(silver_table):
        valid.write.format("delta").partitionBy("tenantId").saveAsTable(silver_table)
        return

    target = DeltaTable.forName(spark, silver_table)
    target.alias("target").merge(
        valid.alias("source"), "target.eventId = source.eventId"
    ).whenNotMatchedInsertAll().execute()


if __name__ == "__main__":
    run(spark, dbutils.widgets.get("bronze_table"), dbutils.widgets.get("silver_table"), dbutils.widgets.get("quarantine_table"))  # noqa: F821
