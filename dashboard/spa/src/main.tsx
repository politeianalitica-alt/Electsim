import React from "react";
import { createRoot } from "react-dom/client";
import { OntologyExplorerPage } from "./pages/OntologyExplorerPage";
import { ScenarioBuilderPage } from "./pages/ScenarioBuilderPage";
import { RiskDashboardPage } from "./pages/RiskDashboardPage";

function App() {
  return (
    <main style={{ fontFamily: "Inter, sans-serif", padding: 16 }}>
      <h1>ElectSim Operational UI</h1>
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
