"""Bootstrap the PostgreSQL schema and least-privilege Databricks runtime role."""

import argparse
from pathlib import Path

import psycopg
from psycopg import sql
from databricks.sdk.runtime import dbutils


TOKEN_SCOPE = "https://ossrdbms-aad.database.windows.net/.default"
SCHEMA_OWNER = "nordicflow_schema_owner"
OWNED_TABLES = (
    "orders",
    "order_lines",
    "processed_events",
    "outbox_messages",
    "delay_predictions",
    "inventory_status",
    "data_quality_runs",
    "data_lineage_stages",
    "data_contract_violations",
    "alert_rules",
    "operational_alerts",
)
OWNED_VIEWS = ("dashboard_delay_predictions", "dashboard_inventory_status")
RUNTIME_TABLES = (
    "data_quality_runs",
    "data_lineage_stages",
    "data_contract_violations",
    "alert_rules",
    "operational_alerts",
)


def _connect(host: str, database: str, user: str, token: str) -> psycopg.Connection:
    return psycopg.connect(
        host=host,
        dbname=database,
        user=user,
        password=token,
        sslmode="require",
        connect_timeout=15,
    )


def _ensure_runtime_principal(
    connection: psycopg.Connection,
    principal_name: str,
    principal_object_id: str,
) -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = %s)", (principal_name,))
        if not cursor.fetchone()[0]:
            cursor.execute(
                "SELECT * FROM pg_catalog.pgaadauth_create_principal_with_oid(%s, %s, 'service', false, false)",
                (principal_name, principal_object_id),
            )


def _apply_schema_and_grants(
    connection: psycopg.Connection,
    database: str,
    principal_name: str,
    schema_path: Path,
) -> None:
    schema = schema_path.read_text(encoding="utf-8")
    with connection.cursor() as cursor:
        cursor.execute(schema)
        cursor.execute(
            sql.SQL("""DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = {}) THEN
                    CREATE ROLE {} NOLOGIN;
                END IF;
            END $$""").format(sql.Literal(SCHEMA_OWNER), sql.Identifier(SCHEMA_OWNER))
        )
        cursor.execute(
            sql.SQL("GRANT {} TO CURRENT_USER").format(sql.Identifier(SCHEMA_OWNER))
        )
        cursor.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
        cursor.execute(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                sql.Identifier(database), sql.Identifier(principal_name)
            )
        )
        cursor.execute(
            sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(sql.Identifier(principal_name))
        )
        for table in OWNED_TABLES:
            cursor.execute(
                sql.SQL("ALTER TABLE {} OWNER TO {}").format(
                    sql.Identifier(table), sql.Identifier(SCHEMA_OWNER)
                )
            )
        for view in OWNED_VIEWS:
            cursor.execute(
                sql.SQL("ALTER VIEW {} OWNER TO {}").format(
                    sql.Identifier(view), sql.Identifier(SCHEMA_OWNER)
                )
            )
        for table in RUNTIME_TABLES:
            cursor.execute(
                sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {} TO {}").format(
                    sql.Identifier(table), sql.Identifier(principal_name)
                )
            )
        cursor.execute(
            sql.SQL("REVOKE {} FROM CURRENT_USER").format(sql.Identifier(SCHEMA_OWNER))
        )


def bootstrap(args: argparse.Namespace) -> None:
    credential = dbutils.credentials.getServiceCredentialsProvider(args.bootstrap_credential)
    token = credential.get_token(TOKEN_SCOPE).token
    schema_path = Path(__file__).parents[2] / "src/backend/NordicFlow.Infrastructure/Persistence/schema.sql"

    with _connect(args.postgres_host, "postgres", args.bootstrap_user, token) as connection:
        _ensure_runtime_principal(
            connection, args.runtime_principal_name, args.runtime_principal_object_id
        )

    with _connect(args.postgres_host, args.postgres_database, args.bootstrap_user, token) as connection:
        _apply_schema_and_grants(
            connection, args.postgres_database, args.runtime_principal_name, schema_path
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--postgres-host", required=True)
    parser.add_argument("--postgres-database", required=True)
    parser.add_argument("--bootstrap-user", required=True)
    parser.add_argument("--bootstrap-credential", required=True)
    parser.add_argument("--runtime-principal-name", required=True)
    parser.add_argument("--runtime-principal-object-id", required=True)
    return parser.parse_args()


if __name__ == "__main__":
    bootstrap(parse_args())
