"use client";

import { Globe2, AlertTriangle, Flag, Anchor } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";

const KPIS = [
  { label: "Eventos críticos 24h", value: 18, color: "text-red1" },
  { label: "Países con escalada", value: 7, color: "text-amber1" },
  { label: "Conflictos activos", value: 23, color: "text-red1" },
  { label: "Sanctions afectan ES", value: 12, color: "text-cyan1" }
];

const COUNTRIES = [
  { code: "UA", name: "Ucrania", risk: 92, status: "war" },
  { code: "PS", name: "Gaza/Palestina", risk: 95, status: "war" },
  { code: "TW", name: "Taiwán", risk: 71, status: "tense" },
  { code: "ML", name: "Sahel (Mali)", risk: 84, status: "war" },
  { code: "VE", name: "Venezuela", risk: 68, status: "tense" },
  { code: "MA", name: "Marruecos", risk: 58, status: "tense" },
  { code: "US", name: "EE.UU.", risk: 49, status: "watch" },
  { code: "CN", name: "China", risk: 62, status: "watch" },
  { code: "RU", name: "Rusia", risk: 88, status: "war" },
  { code: "IR", name: "Irán", risk: 76, status: "tense" },
  { code: "TR", name: "Turquía", risk: 51, status: "watch" },
  { code: "MX", name: "México", risk: 44, status: "watch" }
];

const EVENTS = [
  { date: "5 may", country: "Ucrania", type: "Conflicto", description: "Ofensiva rusa en Donbass amplía línea de frente 8km", impact: 78 },
  { date: "5 may", country: "Israel-Gaza", type: "Conflicto", description: "Negociación rehenes se rompe; expansión operación terrestre", impact: 72 },
  { date: "4 may", country: "EE.UU.", type: "Política", description: "Trump anuncia aranceles 25% importaciones UE selectivas", impact: 81 },
  { date: "4 may", country: "Marruecos", type: "Diplomático", description: "Movimientos navales en aguas Sáhara generan tensión bilateral", impact: 64 },
  { date: "3 may", country: "Venezuela", type: "Crisis", description: "Maduro acelera elecciones; oposición denuncia inhabilitaciones", impact: 52 },
  { date: "3 may", country: "Sahel", type: "Conflicto", description: "Ataque yihadista en Burkina Faso deja 35 víctimas", impact: 48 },
  { date: "2 may", country: "Taiwán", type: "Militar", description: "China ejecuta nuevos ejercicios navales en estrecho", impact: 67 },
  { date: "2 may", country: "Latam", type: "Económico", description: "Argentina-Milei firma acuerdo bilateral con EE.UU.", impact: 41 }
];

const PRESENCE = [
  { territory: "Sáhara Occidental", status: "Disputa diplomática activa", level: "high" },
  { territory: "Gibraltar", status: "Acuerdo post-Brexit en negociación", level: "medium" },
  { territory: "Ceuta y Melilla", status: "Presión migratoria estable", level: "medium" },
  { territory: "Latinoamérica (cumbres)", status: "Tensión Venezuela y Argentina-España", level: "high" },
  { territory: "OTAN flanco sur", status: "Compromiso 2% PIB defensa pendiente", level: "medium" },
  { territory: "UE Comisión 2026", status: "Posicionamiento agenda climática y migratoria", level: "low" }
];

function riskColor(r: number) {
  if (r >= 80) return "#EF4444";
  if (r >= 60) return "#F59E0B";
  if (r >= 40) return "#3B82F6";
  return "#10B981";
}

function statusBadge(s: string) {
  if (s === "war") return "badge-red";
  if (s === "tense") return "badge-amber";
  return "badge-blue";
}

function levelBadge(l: string) {
  if (l === "high") return "badge-red";
  if (l === "medium") return "badge-amber";
  return "badge-blue";
}

export default function GeopoliticaPage() {
  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Geopolítica</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Geopolítica & RRII</h1>
          <ModeBadge mode="demo" source="fixtures" message="Datos de ejemplo — ETL en Sprint 5" />
        </div>
        <p className="text-text2 text-sm mt-1">Eventos internacionales, riesgo país e impacto sobre los intereses españoles.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Country grid */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-4">
          <Globe2 className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Mapa de riesgo país</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {COUNTRIES.map(c => (
            <div
              key={c.code}
              className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer"
              style={{ borderLeftColor: riskColor(c.risk), borderLeftWidth: 3 }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Flag className="w-3.5 h-3.5 text-text2" />
                <span className="text-[10px] uppercase tracking-wider text-muted font-mono">{c.code}</span>
              </div>
              <div className="text-sm font-bold text-text1 leading-tight mb-1.5">{c.name}</div>
              <div className="flex items-center justify-between">
                <span className={`badge ${statusBadge(c.status)}`}>
                  {c.status === "war" ? "Guerra" : c.status === "tense" ? "Tenso" : "Vigilar"}
                </span>
                <span className="font-mono text-xs" style={{ color: riskColor(c.risk) }}>{c.risk}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Eventos esta semana</h2>
          </div>
          <ul className="space-y-3">
            {EVENTS.map((e, i) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan1 font-mono">{e.date}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted">{e.country}</span>
                  </div>
                  <span className="badge badge-cyan">{e.type}</span>
                </div>
                <p className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug mb-2">{e.description}</p>
                <div>
                  <div className="flex justify-between text-[10px] text-muted mb-0.5">
                    <span>Impacto sobre España</span><span className="font-mono" style={{ color: riskColor(e.impact) }}>{e.impact}</span>
                  </div>
                  <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${e.impact}%`, backgroundColor: riskColor(e.impact) }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Presence */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Presencia española en el exterior</h2>
          </div>
          <ul className="space-y-3">
            {PRESENCE.map((p, i) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-bold text-text1">{p.territory}</h3>
                  <span className={`badge ${levelBadge(p.level)} shrink-0`}>
                    {p.level === "high" ? "Alta" : p.level === "medium" ? "Media" : "Baja"}
                  </span>
                </div>
                <p className="text-xs text-text2 leading-relaxed">{p.status}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
