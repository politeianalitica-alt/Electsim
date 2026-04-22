import React from "react";
import { createRoot } from "react-dom/client";
import { getApiHealth } from "./api/client";
import { OntologyExplorerPage } from "./pages/OntologyExplorerPage";
import { ScenarioBuilderPage } from "./pages/ScenarioBuilderPage";
import { RiskDashboardPage } from "./pages/RiskDashboardPage";

function App() {
  const [apiStatus, setApiStatus] = React.useState<"loading" | "ok" | "error">("loading");
  const [apiMessage, setApiMessage] = React.useState("Comprobando API...");

  React.useEffect(() => {
    getApiHealth()
      .then((h) => {
        setApiStatus(h?.status === "ok" ? "ok" : "error");
        setApiMessage(h?.status === "ok" ? `API activa (${h.service})` : "API sin estado válido");
      })
      .catch((err) => {
        setApiStatus("error");
        setApiMessage(`API no disponible: ${err instanceof Error ? err.message : "error desconocido"}`);
      });
  }, []);

  const statusColor = apiStatus === "ok" ? "#16a34a" : apiStatus === "error" ? "#dc2626" : "#d97706";

  return (
    <main style={{ fontFamily: "Inter, sans-serif", padding: 16 }}>
      <h1>ElectSim Operational UI</h1>
      <div
        style={{
          margin: "8px 0 16px",
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${statusColor}`,
          color: statusColor,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Estado API: {apiMessage}
      </div>
      <OntologyExplorerPage />
      <ScenarioBuilderPage />
      <RiskDashboardPage />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
