import { useMemo } from "react";
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { Dashboard } from "../Dashboard";
import { createNordicFlowApi } from "../api/nordicFlowApi";
import type { DashboardUser } from "../Dashboard";

interface AuthenticatedDashboardProps {
  apiBaseUrl: string;
  apiScopes: string[];
}

export function AuthenticatedDashboard({ apiBaseUrl, apiScopes }: AuthenticatedDashboardProps) {
  const { instance, accounts } = useMsal();
  const account = instance.getActiveAccount() ?? accounts[0];
  const permissions = useMemo(
    () => new Set(apiScopes.map((scope) => scope.slice(scope.lastIndexOf("/") + 1))),
    [apiScopes],
  );
  const user = useMemo<DashboardUser>(() => {
    const displayName = account?.name ?? account?.username ?? "NordicFlow user";
    const roles = account?.idTokenClaims?.roles;
    const firstRole = Array.isArray(roles) && typeof roles[0] === "string" ? roles[0] : "Platform user";
    return {
      displayName,
      roleLabel: firstRole,
      initials: getInitials(displayName),
      permissions,
      onLogout: account
        ? () => void instance.logoutRedirect({ account, postLogoutRedirectUri: window.location.origin })
        : undefined,
    };
  }, [account, instance, permissions]);
  const api = useMemo(
    () => createNordicFlowApi(apiBaseUrl, async () => {
      if (!account) throw new Error("The user is not signed in.");
      const result = await instance.acquireTokenSilent({ account, scopes: apiScopes });
      return result.accessToken;
    }),
    [account, apiBaseUrl, apiScopes, instance],
  );

  return (
    <>
      <AuthenticatedTemplate><Dashboard api={api} user={user} /></AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <main className="login-shell">
          <section className="login-card">
            <p className="eyebrow">NordicFlow</p>
            <h1>Supply Chain Intelligence</h1>
            <p>Log ind med din organisationskonto for at se drift, datakvalitet og alarmer.</p>
            <button type="button" onClick={() => void instance.loginRedirect({ scopes: apiScopes })}>
              Log ind med Microsoft
            </button>
          </section>
        </main>
      </UnauthenticatedTemplate>
    </>
  );
}

function getInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "NF";
}
