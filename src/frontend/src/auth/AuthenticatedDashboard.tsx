import { useMemo } from "react";
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { Dashboard } from "../Dashboard";
import { createNordicFlowApi } from "../api/nordicFlowApi";

interface AuthenticatedDashboardProps {
  apiBaseUrl: string;
  apiScopes: string[];
}

export function AuthenticatedDashboard({ apiBaseUrl, apiScopes }: AuthenticatedDashboardProps) {
  const { instance, accounts } = useMsal();
  const account = instance.getActiveAccount() ?? accounts[0];
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
      <AuthenticatedTemplate><Dashboard api={api} /></AuthenticatedTemplate>
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
