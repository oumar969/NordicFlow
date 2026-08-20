import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { Dashboard } from "./Dashboard";
import { createDemoNordicFlowApi } from "./api/demoNordicFlowApi";
import { AuthenticatedDashboard } from "./auth/AuthenticatedDashboard";
import { createAuthSettings } from "./auth/authConfig";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);

async function renderApplication() {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    root.render(<StrictMode><Dashboard api={createDemoNordicFlowApi()} /></StrictMode>);
    return;
  }

  const settings = createAuthSettings(import.meta.env);
  const msal = new PublicClientApplication(settings.configuration);
  await msal.initialize();
  const redirectResult = await msal.handleRedirectPromise();
  const account = redirectResult?.account ?? msal.getAllAccounts()[0];
  if (account) msal.setActiveAccount(account);

  root.render(
    <StrictMode>
      <MsalProvider instance={msal}>
        <AuthenticatedDashboard
          apiBaseUrl={import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7080"}
          apiScopes={settings.apiScopes}
        />
      </MsalProvider>
    </StrictMode>,
  );
}

void renderApplication();
