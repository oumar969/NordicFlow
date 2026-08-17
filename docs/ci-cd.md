# CI/CD configuration

The GitHub Actions workflow runs application build/test, Python syntax checks and
Terraform formatting/validation on every pull request. `terraform plan` runs only on
`main` or manual dispatch and is protected by the `development` GitHub Environment.

Configure Azure workload-identity federation for GitHub Actions; do not create a
client secret. Add these environment secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `POSTGRES_ADMIN_OBJECT_ID`

Add `POSTGRES_ADMIN_NAME` as an environment variable. Protect `main`, require the
`application` and `terraform-validate` checks, and require approval for the
`development` environment if plans expose sensitive topology. A later deployment
workflow should consume a reviewed, immutable plan artifact rather than replanning.

Terraform state must move to the centrally governed remote backend before apply is
introduced. The current pipeline intentionally performs plan only and changes no
cloud resources.
