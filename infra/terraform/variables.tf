variable "subscription_id" {
  description = "Azure subscription ID."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be dev, test, or prod."
  }
}

variable "location" {
  description = "Azure region."
  type        = string
  default     = "northeurope"
}

variable "postgres_administrator_object_id" {
  description = "Microsoft Entra object ID for the PostgreSQL administrator group."
  type        = string
}

variable "postgres_administrator_name" {
  description = "Display name of the Microsoft Entra administrator group."
  type        = string
}

variable "tags" {
  description = "Additional governance tags."
  type        = map(string)
  default     = {}
}

variable "api_principal_object_id" {
  description = "Object ID of the API managed identity. Null skips Event Hubs sender assignment."
  type        = string
  default     = null
  nullable    = true
}

variable "databricks_ingestion_principal_object_id" {
  description = "Object ID used by Databricks Bronze ingestion. Null skips receiver RBAC."
  type        = string
  default     = null
  nullable    = true
}

variable "api_origin_url" {
  description = "HTTPS origin URL for the NordicFlow API. Null skips API Management."
  type        = string
  default     = null
  nullable    = true
}

variable "oidc_tenant_id" {
  description = "Microsoft Entra tenant ID used by API Management JWT validation."
  type        = string
  default     = null
  nullable    = true
}

variable "oidc_api_audience" {
  description = "Expected API audience/application ID URI."
  type        = string
  default     = null
  nullable    = true
}

variable "apim_publisher_email" {
  description = "API Management publisher contact."
  type        = string
  default     = "platform@nordicflow.invalid"
}

variable "databricks_enabled" {
  description = "Provision the VNet-injected Azure Databricks workspace and access connector."
  type        = bool
  default     = true
}
