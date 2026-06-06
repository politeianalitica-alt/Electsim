"use client";

import { useEffect, useState } from "react";
import "@/app/osint-global/osiris.css";
import IntelFeed from "@/components/osiris/IntelFeed";
import LiveAlerts from "@/components/osiris/LiveAlerts";

/**
 * Vigilancia OSINT — pestaña de workspace que reúne los módulos de información
 * en vivo (Intel/Noticias, Alertas) que antes vivían en el panel del mapa,
 * más un resumen de métricas globales. Re-obtiene los feeds OSINT por su cuenta.
 */
export default function VigilanciaPage() {
  const [data, setData] = useState<{ news: any[]; earthquakes: any[] }>({ news: [], earthquakes: [] });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [n, e] = await Promise.all([
          fetch("/api/osiris/news").then((r) => (r.ok ? r.json() : {})),
          fetch("/api/osiris/earthquakes").then((r) => (r.ok ? r.json() : {})),
        ]);
        if (alive) setData({ news: n.news || [], earthquakes: e.earthquakes || [] });
      } catch { /* sin feeds */ }
      try {
        const s = await fetch("/api/osiris/stats").then((r) => (r.ok ? r.json() : null));
        if (alive && s) setStats(s.stats || s);
      } catch { /* sin stats */ }
    };
    load();
    const iv = setInterval(load, 120000); // 2 min
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const openMap = () => window.open("/osint-global", "_blank");
  const metrics: Array<[string, number | undefined]> = [
    ["Aviones", stats?.flights], ["Satélites", stats?.sats], ["CCTV", stats?.cctv],
    ["Clima", stats?.weather], ["Nuclear", stats?.nuclear],
  ];

  return (
    <div className="osiris-root" style={{ background: "#05070f", minHeight: "100%", padding: 20, borderRadius: 12 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase" }}>Workspace · Vigilancia</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-heading)", margin: "2px 0" }}>Vigilancia OSINT</h1>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Inteligencia en vivo del mapa OSINT — noticias, alertas sísmicas y métricas globales.{" "}
          <a href="/osint-global" style={{ color: "var(--gold-primary)", textDecoration: "underline" }}>Abrir mapa ↗</a>
        </p>
      </div>

      {/* Métricas globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
        {metrics.map(([label, val]) => (
          <div key={label} className="glass-panel" style={{ padding: "10px 12px" }}>
            <div className="hud-label">{label}</div>
            <div className="hud-value" style={{ fontSize: 16 }}>{typeof val === "number" ? val.toLocaleString() : "—"}</div>
          </div>
        ))}
      </div>

      {/* Módulos de información (re-ubicados desde el mapa) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px,1fr))", gap: 14, alignItems: "start" }}>
        <IntelFeed data={data} onLocate={openMap} />
        <LiveAlerts data={data} onLocate={openMap} onWatchFeed={(url: string) => window.open(url, "_blank")} />
      </div>
    </div>
  );
}
