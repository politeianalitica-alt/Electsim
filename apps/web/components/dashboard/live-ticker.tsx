"use client";

import { useEffect, useState } from "react";

const DEMO_TICKER = [
  { text: "PP 33.2%", color: "#00D4FF" },
  { text: "PSOE 28.5%", color: "#00D4FF" },
  { text: "VOX 11.3%", color: "#00D4FF" },
  { text: "SUMAR 9.8%", color: "#00D4FF" },
  { text: "ITPE 52.3", color: "#00D4FF" },
  { text: "ALERTA: narrativa vivienda en alza", color: "#EF4444" },
  { text: "Congreso: 17 iniciativas activas", color: "#3B82F6" },
  { text: "IPC abril 3.1% (+0.2pp YoY)", color: "#94A3B8" },
  { text: "Paro 11.6% (-0.1pp QoQ)", color: "#94A3B8" },
  { text: "Polarización 0.68 (alta)", color: "#F59E0B" },
  { text: "Sentimiento gob -0.18", color: "#94A3B8" },
  { text: "Fuentes activas 412/487", color: "#10B981" },
  { text: "3 narrativas emergentes detectadas", color: "#F59E0B" }
];

export function LiveTicker() {
  const [items, setItems] = useState(DEMO_TICKER);

  useEffect(() => {
    // Try to fetch live ticker from API
    fetch("/api/system/ticker", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data.map((it: any) => ({ text: it.text, color: it.color || "#94A3B8" })));
        }
      })
      .catch(() => { /* keep demo */ });
  }, []);

  // Duplicate items for seamless infinite scroll
  const doubled = [...items, ...items];

  return (
    <div className="bg-bg2 border-y border-cyan1/20 -mx-6 overflow-hidden">
      <div className="flex animate-ticker py-2 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="px-6 text-sm font-medium" style={{ color: item.color }}>
            {item.text}
            <span className="ml-6 text-muted">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
