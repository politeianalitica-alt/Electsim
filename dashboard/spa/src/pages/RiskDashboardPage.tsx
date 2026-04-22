import { useEffect, useState } from "react";
import { getRisk } from "../api/client";

export function RiskDashboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getRisk()
      .then((x) => {
        setRows(x as any[]);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error cargando riesgo");
      });
  }, []);
  return (
    <section>
      <h2>Risk Dashboard</h2>
      <p>Últimos valores de volatilidad electoral (proxy riesgo).</p>
      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      <pre>{JSON.stringify(rows.slice(0, 20), null, 2)}</pre>
    </section>
  );
}
