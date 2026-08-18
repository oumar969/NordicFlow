# Databricks pipeline

The `silver_processing` job in `databricks.yml` validates Bronze events, merges valid
records into Silver, writes rejected records to quarantine, and publishes small
tenant-level operational aggregates to PostgreSQL. Grant the job service principal
SELECT on Bronze and MODIFY on only the target Silver and quarantine schemas.

Bronze is append-only and must retain `_raw_payload`, `_ingested_at`, source topic,
partition and offset. Silver uses a Delta MERGE keyed by `eventId`; quarantined rows
include `_quality_errors` and remain replayable after correction.

## Event Hubs to Bronze

`bronze/event_hubs_to_bronze.py` consumes the Event Hubs Kafka endpoint using TLS and
OAuth bearer tokens. It never accepts a connection string. Build the Azure Identity
callback with:

```powershell
mvn -f data-platform/connectors/eventhubs-oauth/pom.xml clean package
```

Upload the resulting `*-all.jar` to a governed Unity Catalog Volume and pass its URI
as the Databricks bundle variable `oauth_callback_jar`. Configure the Databricks
workload identity so `DefaultAzureCredential` can resolve it, grant only `Azure Event
Hubs Data Receiver`, and set a unique durable `bronze_checkpoint` path. The continuous
job is initially `PAUSED`; deploy, validate network/DNS and identity, then unpause it.

Do not delete or reuse a checkpoint for another query. Starting from `earliest` only
applies when no checkpoint exists. Bronze remains append-only; downstream Silver is
responsible for contract validation and `eventId` deduplication.

## Operational metrics serving

Set the bundle variables `postgres_host`, `postgres_database`, and `postgres_user`.
The job explicitly uses the workspace-bound `nordicflow-azure-services` Unity Catalog
service credential to acquire its short-lived PostgreSQL token. The job principal
must have only `ACCESS` on that credential.
The PostgreSQL user must be an Entra database principal representing the Databricks
workload identity, with INSERT/UPDATE/SELECT permissions limited to
`data_quality_runs`, `data_lineage_stages`, `data_contract_violations`, `alert_rules`,
and `operational_alerts`. Apply `src/backend/NordicFlow.Infrastructure/Persistence/schema.sql`
before enabling the job.

The publisher requests a short-lived Azure Database for PostgreSQL token through the
named Unity Catalog service credential. No database password, connection string,
event payload, or token is stored in the bundle, PostgreSQL tables, or task logs.
Network access should be restricted to the Databricks VNet/private endpoint path.

Each tenant/run pair uses a deterministic identifier. A repaired or retried job
updates the same quality snapshot and alert instead of creating duplicates. When the
quarantine rate falls below the configured threshold, previous open quarantine-rate
alerts are automatically resolved.
