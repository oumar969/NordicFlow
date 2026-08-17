# Azure infrastructure baseline

This stack provisions private Azure Database for PostgreSQL Flexible Server and an
ADLS Gen2 account with Bronze, Silver, Gold, and quarantine filesystems. Password
authentication, public access, shared keys, and anonymous blob access are disabled.

Use remote encrypted state with locking before team deployment (for example, an
existing centrally governed Azure Storage backend). The backend is intentionally not
bootstrapped here to avoid a state/backend dependency cycle.

```powershell
Copy-Item terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -check
terraform validate
terraform plan -out plan.tfplan
```

Production should additionally add private endpoints/DNS for ADLS, diagnostic
settings, customer-managed keys if policy requires them, and workload-identity RBAC
assignments for Databricks and the API. Those identities are deployment-specific and
therefore not guessed in this baseline.
