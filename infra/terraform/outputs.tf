output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}

output "storage_account_name" {
  value = azurerm_storage_account.lake.name
}

output "event_hubs_fully_qualified_namespace" {
  value = "${azurerm_eventhub_namespace.this.name}.servicebus.windows.net"
}

output "orders_event_hub_name" {
  value = azurerm_eventhub.orders.name
}

output "databricks_workspace_name" {
  value = var.databricks_enabled ? azurerm_databricks_workspace.this[0].name : null
}

output "databricks_workspace_url" {
  value = var.databricks_enabled ? azurerm_databricks_workspace.this[0].workspace_url : null
}

output "databricks_access_connector_id" {
  value = var.databricks_enabled ? azurerm_databricks_access_connector.this[0].id : null
}

output "databricks_identity_object_id" {
  description = "System-assigned bootstrap identity object ID."
  value       = var.databricks_enabled ? azurerm_databricks_access_connector.this[0].identity[0].principal_id : null
}

output "databricks_jobs_identity_id" {
  description = "Resource ID of the least-privilege managed identity used by Databricks jobs."
  value       = var.databricks_enabled ? azurerm_user_assigned_identity.databricks_jobs[0].id : null
}

output "databricks_jobs_identity_object_id" {
  description = "Object ID used to create the PostgreSQL runtime principal."
  value       = var.databricks_enabled ? azurerm_user_assigned_identity.databricks_jobs[0].principal_id : null
}
