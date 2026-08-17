# Lineage and observability

`eventId` is the immutable end-to-end lineage key. The API adds event, correlation,
tenant and message-type attributes to its W3C trace. Bronze retains the original
payload and ingestion coordinates. Silver and Gold copy `_lineage_event_id` and
`_lineage_correlation_id`; Unity Catalog captures table- and column-level lineage for
Databricks reads and writes.

Telemetry is exported over OTLP using standard `OTEL_EXPORTER_OTLP_ENDPOINT` and
related environment variables. Deploy an OpenTelemetry Collector between workloads
and the selected backend. Avoid putting customer data, order numbers, payloads or
credentials in telemetry attributes.

The quarantine monitor evaluates a rolling 15-minute error rate. A Databricks job
failure triggers the configured distribution list. Production should route failures
to the incident platform as well and use two thresholds: warning and critical.

The API persists the order and full integration event atomically in PostgreSQL. A
background outbox publisher delivers it at least once to Event Hubs using
`DefaultAzureCredential`. `eventId`, `correlationId`, tenant and W3C trace context are
Event Hubs application properties. Consumers must deduplicate on `eventId`.

Event Hubs-to-Bronze streaming ingestion remains a separate Databricks deployment
component implemented by `event_hubs_to_bronze.py`. It preserves raw bytes, Event
Hubs application properties, topic, partition, offset and enqueue time. Network
private endpoints, DNS and Databricks workload-identity binding must be completed
before the Terraform namespace, which denies public access, is reachable.
