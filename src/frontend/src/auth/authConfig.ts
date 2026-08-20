import type { Configuration } from "@azure/msal-browser";

export interface AuthSettings {
  configuration: Configuration;
  apiScopes: string[];
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} must be configured when demo mode is disabled.`);
  return value;
}

export function createAuthSettings(environment: ImportMetaEnv): AuthSettings {
  const tenantId = required("VITE_ENTRA_TENANT_ID", environment.VITE_ENTRA_TENANT_ID);
  const clientId = required("VITE_ENTRA_CLIENT_ID", environment.VITE_ENTRA_CLIENT_ID);
  const apiScopes = required("VITE_API_SCOPES", environment.VITE_API_SCOPES)
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  return {
    configuration: {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
      },
      cache: { cacheLocation: "sessionStorage" },
    },
    apiScopes,
  };
}
