import { useEffect, useState } from "react";
import { getRisk } from "../api/client";

export function RiskDashboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    getRisk().then((x) => setRows(x as any[])).catch(console.error);
  }, []);
  return (
    <section>
      <h2>Risk Dashboard</h2>
      <p>Últimos valores de volatilidad electoral (proxy riesgo).</p>
      <pre>{JSON.stringify(rows.slice(0, 20), null, 2)}</pre>
    </section>
  );
}
