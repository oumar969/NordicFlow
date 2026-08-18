# NordicFlow

Reference foundation for the NordicFlow Enterprise Supply Chain Intelligence Platform.

## Repository layout

```text
contracts/                  Versioned event contracts and examples
docs/                       Architecture and data-governance decisions
src/backend/                .NET Clean Architecture solution
data-platform/silver/       Databricks/PySpark Silver transformation
infra/terraform/            Azure PostgreSQL and ADLS Gen2 baseline
.github/workflows/          GitHub Actions build, validation and plan
databricks.yml              Databricks Asset Bundle monitoring job
```

## Quick start

```powershell
dotnet restore src/backend/NordicFlow.slnx
dotnet test src/backend/NordicFlow.slnx
dotnet run --project src/backend/NordicFlow.WebApi

cd src/frontend
npm ci
npm run dev
```

The dashboard reads `VITE_API_BASE_URL` and expects an OIDC access token in
`sessionStorage` under `nordicflow.access_token`. Its tenant-scoped overview is
served by `GET /api/v1/dashboard/summary` with the `dashboard:read` scope.

POST `contracts/order-created/v1/example.json` to `/api/v1/orders/events`. Duplicate
`eventId` values are accepted idempotently and return the existing resource.

Terraform and Databricks setup are documented in their local READMEs. Never commit
real credentials or Terraform state.

CI/CD setup and required GitHub environment values are described in
`docs/ci-cd.md`; lineage, OTLP configuration and quarantine alerting are described in
`docs/lineage-and-observability.md`.

Event Hubs publishing is disabled for local development. Production enables it with
`EventHubs__Enabled=true`, `EventHubs__FullyQualifiedNamespace` and
`EventHubs__EventHubName`; identity is resolved exclusively by `DefaultAzureCredential`.
OIDC ingress and the dashboard serving contract are documented in
`docs/ingress-and-serving.md`.
