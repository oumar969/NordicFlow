# OIDC ingress and dashboard serving

The API validates JWTs against `Authentication:Authority` and
`Authentication:Audience`. The gateway must validate TLS, preserve `traceparent`,
apply rate limits and forward bearer tokens; it must not inject trusted identity
headers. Producers require `orders:write`; dashboard clients require
`dashboard:read` and an immutable `tenant_id` claim.

The dashboard endpoint derives tenant identity from the verified token, never from a
query parameter. `IDashboardQuery` isolates the read side from the write domain. The
PostgreSQL views expose only delay predictions and inventory status needed by the UI.
A governed Gold-to-serving synchronization job must upsert those tables after model
scoring. PostgreSQL row-level security should be added as defense in depth when
database workload identities are split per tenant.

The React API adapter accepts an access token from the selected OIDC client library;
token acquisition and refresh remain the responsibility of that library, not custom
browser storage code.

Terraform can provision an Azure API Management Consumption gateway when
`api_origin_url`, `oidc_tenant_id` and `oidc_api_audience` are supplied. Its policy
validates the JWT again, rate-limits by client IP and creates a W3C trace context only
when the caller did not supply one. Replace the default publisher email before use.
