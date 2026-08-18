locals {
  name_prefix = "nf-${var.environment}"
  common_tags = merge(var.tags, {
    application         = "nordicflow"
    environment         = var.environment
    managed-by          = "terraform"
    data-classification = "confidential"
  })
}

resource "random_string" "suffix" {
  length  = 6
  upper   = false
  special = false
}

resource "azurerm_resource_group" "this" {
  name     = "rg-${local.name_prefix}-${random_string.suffix.result}"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_virtual_network" "this" {
  name                = "vnet-${local.name_prefix}"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  address_space       = ["10.40.0.0/16"]
  tags                = local.common_tags
}

resource "azurerm_subnet" "postgres" {
  name                 = "snet-postgres"
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.40.1.0/24"]
  service_endpoints    = ["Microsoft.Storage"]

  delegation {
    name = "postgres-flexible-server"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "${local.name_prefix}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.this.id
  resource_group_name   = azurerm_resource_group.this.name
  tags                  = local.common_tags
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                          = "psql-${local.name_prefix}-${random_string.suffix.result}"
  resource_group_name           = azurerm_resource_group.this.name
  location                      = azurerm_resource_group.this.location
  version                       = "16"
  zone                          = "1"
  delegated_subnet_id           = azurerm_subnet.postgres.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false
  sku_name                      = var.environment == "prod" ? "GP_Standard_D2s_v3" : "B_Standard_B1ms"
  storage_mb                    = 32768
  backup_retention_days         = var.environment == "prod" ? 35 : 7
  geo_redundant_backup_enabled  = var.environment == "prod"
  tags                          = local.common_tags

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = false
    tenant_id                     = data.azurerm_client_config.current.tenant_id
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

resource "azurerm_postgresql_flexible_server_active_directory_administrator" "this" {
  server_name         = azurerm_postgresql_flexible_server.this.name
  resource_group_name = azurerm_resource_group.this.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  object_id           = var.postgres_administrator_object_id
  principal_name      = var.postgres_administrator_name
  principal_type      = "Group"
}

data "azurerm_client_config" "current" {}

resource "azurerm_storage_account" "lake" {
  name                            = "stnf${var.environment}${random_string.suffix.result}"
  resource_group_name             = azurerm_resource_group.this.name
  location                        = azurerm_resource_group.this.location
  account_tier                    = "Standard"
  account_replication_type        = var.environment == "prod" ? "ZRS" : "LRS"
  account_kind                    = "StorageV2"
  is_hns_enabled                  = true
  min_tls_version                 = "TLS1_2"
  public_network_access_enabled   = var.environment != "prod"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  local_user_enabled              = false
  tags                            = local.common_tags

  blob_properties {
    delete_retention_policy { days = 14 }
    container_delete_retention_policy { days = 14 }
  }
}

resource "azurerm_storage_data_lake_gen2_filesystem" "layers" {
  for_each           = toset(["bronze", "silver", "gold", "quarantine"])
  name               = each.value
  storage_account_id = azurerm_storage_account.lake.id
}

resource "azurerm_eventhub_namespace" "this" {
  name                          = "evhns-${local.name_prefix}-${random_string.suffix.result}"
  location                      = azurerm_resource_group.this.location
  resource_group_name           = azurerm_resource_group.this.name
  sku                           = "Standard"
  capacity                      = 1
  public_network_access_enabled = false
  minimum_tls_version           = "1.2"
  local_authentication_enabled  = false
  tags                          = local.common_tags
}

resource "azurerm_eventhub" "orders" {
  name              = "order-events"
  namespace_id      = azurerm_eventhub_namespace.this.id
  partition_count   = 4
  message_retention = 7
}

resource "azurerm_role_assignment" "api_eventhub_sender" {
  count                = var.api_principal_object_id == null ? 0 : 1
  scope                = azurerm_eventhub.orders.id
  role_definition_name = "Azure Event Hubs Data Sender"
  principal_id         = var.api_principal_object_id
}

resource "azurerm_role_assignment" "databricks_eventhub_receiver" {
  count                = var.databricks_ingestion_principal_object_id == null ? 0 : 1
  scope                = azurerm_eventhub.orders.id
  role_definition_name = "Azure Event Hubs Data Receiver"
  principal_id         = var.databricks_ingestion_principal_object_id
}

resource "azurerm_api_management" "this" {
  count               = var.api_origin_url == null ? 0 : 1
  name                = "apim-${local.name_prefix}-${random_string.suffix.result}"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  publisher_name      = "NordicFlow Platform Team"
  publisher_email     = var.apim_publisher_email
  sku_name            = "Consumption_0"
  tags                = local.common_tags
}

resource "azurerm_api_management_api" "nordicflow" {
  count                 = var.api_origin_url == null ? 0 : 1
  name                  = "nordicflow-api"
  resource_group_name   = azurerm_resource_group.this.name
  api_management_name   = azurerm_api_management.this[0].name
  revision              = "1"
  display_name          = "NordicFlow API"
  path                  = "nordicflow"
  protocols             = ["https"]
  service_url           = var.api_origin_url
  subscription_required = false
}

resource "azurerm_api_management_api_policy" "oidc" {
  count               = var.api_origin_url == null ? 0 : 1
  api_name            = azurerm_api_management_api.nordicflow[0].name
  api_management_name = azurerm_api_management.this[0].name
  resource_group_name = azurerm_resource_group.this.name

  xml_content = <<XML
<policies>
  <inbound>
    <base />
    <rate-limit-by-key calls="300" renewal-period="60" counter-key="@(context.Request.IpAddress)" />
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401" require-scheme="Bearer">
      <openid-config url="https://login.microsoftonline.com/${var.oidc_tenant_id}/v2.0/.well-known/openid-configuration" />
      <audiences><audience>${var.oidc_api_audience}</audience></audiences>
    </validate-jwt>
    <set-header name="traceparent" exists-action="skip">
      <value>@($"00-{Guid.NewGuid():N}-{Guid.NewGuid().ToString("N").Substring(0,16)}-01")</value>
    </set-header>
  </inbound>
  <backend><base /></backend>
  <outbound><base /></outbound>
  <on-error><base /></on-error>
</policies>
XML

  lifecycle {
    precondition {
      condition     = var.oidc_tenant_id != null && var.oidc_api_audience != null
      error_message = "oidc_tenant_id and oidc_api_audience are required when api_origin_url is set."
    }
  }
}
