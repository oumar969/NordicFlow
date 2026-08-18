import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Dashboard } from "./Dashboard";
import { createNordicFlowApi } from "./api/nordicFlowApi";
import { createDemoNordicFlowApi } from "./api/demoNordicFlowApi";
import "./styles.css";

const productionApi = createNordicFlowApi(
  import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7080",
  async () => {
    const token = sessionStorage.getItem("nordicflow.access_token");
    if (!token) throw new Error("No access token is available.");
    return token;
  },
);
const api = import.meta.env.VITE_DEMO_MODE === "true" ? createDemoNordicFlowApi() : productionApi;

createRoot(document.getElementById("root")!).render(<StrictMode><Dashboard api={api} /></StrictMode>);
