# Azure infrastructure baseline

This stack provisions private Azure Database for PostgreSQL Flexible Server, an ADLS
Gen2 account with Bronze, Silver, Gold, and quarantine filesystems, and a Premium
Azure Databricks workspace injected into the platform VNet. Databricks compute has no
public IP addresses and uses a NAT Gateway for explicit outbound connectivity.
Password authentication, public database access, shared keys, and anonymous blob
access are disabled.

The Databricks access connector receives only `Storage Blob Data Contributor` on the
NordicFlow lake and `Azure Event Hubs Data Receiver` on the orders hub. Its
`databricks_identity_object_id` output is the object ID to map to the least-privilege
PostgreSQL Entra role after the workspace has been deployed.

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
