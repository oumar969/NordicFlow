# Databricks pipeline

Create a job using `silver/order_created_silver.py` and pass fully-qualified Unity
Catalog table names through the `bronze_table`, `silver_table`, and
`quarantine_table` widgets. Grant the job service principal SELECT on Bronze and
MODIFY on only the target Silver and quarantine schemas.

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
