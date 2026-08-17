# Architecture baseline

## Backend dependency rule

```text
WebApi -> Application -> Domain
   |            ^
   +-> Infrastructure
```

- **Domain** owns business invariants and contains no framework dependencies.
- **Application** owns use cases and narrow ports such as `IOrderRepository`.
- **Infrastructure** implements ports with PostgreSQL/Npgsql.
- **WebApi** is the composition root and translates HTTP contracts to commands.

The incoming event schema is the integration contract. It is deliberately separate
from the domain model: API DTOs can evolve without leaking serialization concerns
into the domain. The application handler provides the transaction boundary and
idempotency behavior.

## Event lifecycle

1. Producer publishes `nordicflow.order.created.v1` using the Avro schema.
2. Ingestion persists the immutable payload to Bronze with ingestion metadata.
3. Silver validates contract rules, normalizes values, deduplicates by `eventId`,
   and quarantines invalid records with machine-readable reasons.
4. Gold models business measures such as order value, fulfilment lead time and OTIF.

## Security and governance

- OAuth2/OIDC authentication is required at the production ingress; authorization
  policies map the verified `orders:write` scope to the ingestion endpoint. There is
  no anonymous production bypass.
- PostgreSQL uses TLS, private networking and Microsoft Entra authentication where
  supported. Secrets belong in a secret manager, never Terraform variables/state.
- ADLS Gen2 denies public access, requires TLS 1.2, and separates Bronze/Silver/Gold
  containers for least-privilege RBAC.
- Contract compatibility is backward-compatible within a major version. New required
  fields require a new major event type. PII classification and retention metadata
  must be recorded before adding fields.

## Medallion rules

| Layer | Content | Mutability | Failed records |
|---|---|---|---|
| Bronze | Original event plus ingestion metadata | Append-only | Retained unchanged |
| Silver | Typed, valid, normalized, deduplicated events | MERGE by eventId | Quarantine table |
| Gold | Aggregated domain facts and dimensions | Rebuild/MERGE by business key | Prevented by Silver gate |
