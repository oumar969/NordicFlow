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
