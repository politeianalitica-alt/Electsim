"use client";

import { useState } from "react";

interface KPI {
  label: string;
  value: number;
  format: "pct" | "num" | "score";
  delta: number;
  spark: number[];
  color?: string;
}

const KPIS: KPI[] = [
  { label: "Intención voto líder", value: 33.2, format: "pct", delta: 0.4, spark: [32.1, 32.4, 32.6, 32.5, 32.8, 33.0, 33.2] },
  { label: "Polarización", value: 0.68, format: "score", delta: 0.03, spark: [0.61, 0.62, 0.63, 0.64, 0.66, 0.67, 0.68] },
  { label: "Volatilidad mediática", value: 24.1, format: "score", delta: -1.2, spark: [25.5, 25.0, 24.8, 24.5, 24.3, 24.2, 24.1] },
  { label: "Sentimiento gobierno", value: -0.18, format: "score", delta: -0.04, spark: [-0.12, -0.13, -0.14, -0.15, -0.16, -0.17, -0.18] },
  { label: "Volumen mediático 24h", value: 14820, format: "num", delta: 12.3, spark: [11200, 11800, 12400, 12900, 13500, 14100, 14820] }
];

function Sparkline({ values, color = "#00D4FF" }: { values: number[]; color?: string }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120, h = 32;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const lastY = h - ((values[values.length - 1] - min) / range) * h;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#grad-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={w} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

export function KpiStrip() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[.14em] text-cyan1">Pulso operativo</h2>
        <span className="text-xs text-muted">Actualizado hace 2 min</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {KPIS.map((k, i) => {
          const positive = k.delta > 0;
          const deltaColor = (k.label.includes("voto") || k.label.includes("mediático") || k.label.includes("Sentimiento"))
            ? (positive ? "text-green1" : "text-red1")
            : "text-text2";
          const formatValue = (v: number) => {
            if (k.format === "pct") return `${v.toFixed(1)}%`;
            if (k.format === "num") return v.toLocaleString("es-ES");
            return v.toFixed(2);
          };
          return (
            <div
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`kpi-card cursor-pointer transition-transform ${hovered === i ? "scale-[1.02]" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text2 truncate">
                  {k.label}
                </span>
                <span className={`text-[10px] font-bold ${deltaColor}`}>
                  {positive ? "▲" : "▼"} {Math.abs(k.delta).toFixed(2)}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-text1 tracking-tight">
                  {formatValue(k.value)}
                </span>
                <Sparkline values={k.spark} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
