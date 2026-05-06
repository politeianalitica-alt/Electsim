"use client";

import { Globe2, AlertTriangle, Flag, Anchor } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type {
  GeoOverview,
  GeoEventItem,
  CountryRiskItem,
  PresenceItem,
} from "@/lib/types/geopolitica_api";

const FALLBACK_KPIS = [
  { label: "Eventos críticos 24h", value: 18, color: "text-red1" },
  { label: "Países con escalada", value: 7, color: "text-amber1" },
  { label: "Conflictos activos", value: 23, color: "text-red1" },
  { label: "Sanctions afectan ES", value: 12, color: "text-cyan1" },
];

const FALLBACK_COUNTRIES: CountryRiskItem[] = [
  { code: "UA", iso3: "UKR", name: "Ucrania", risk: 92, status: "war", trend: "stable" },
  { code: "PS", iso3: "PSE", name: "Gaza/Palestina", risk: 95, status: "war", trend: "rising" },
  { code: "TW", iso3: "TWN", name: "Taiwán", risk: 71, status: "tense", trend: "rising" },
  { code: "ML", iso3: "MLI", name: "Sahel (Mali)", risk: 84, status: "war", trend: "stable" },
  { code: "VE", iso3: "VEN", name: "Venezuela", risk: 68, status: "tense", trend: "stable" },
  { code: "MA", iso3: "MAR", name: "Marruecos", risk: 58, status: "tense", trend: "stable" },
  { code: "US", iso3: "USA", name: "EE.UU.", risk: 49, status: "watch", trend: "stable" },
  { code: "CN", iso3: "CHN", name: "China", risk: 62, status: "watch", trend: "rising" },
  { code: "RU", iso3: "RUS", name: "Rusia", risk: 88, status: "war", trend: "stable" },
  { code: "IR", iso3: "IRN", name: "Irán", risk: 76, status: "tense", trend: "rising" },
  { code: "TR", iso3: "TUR", name: "Turquía", risk: 51, status: "watch", trend: "stable" },
  { code: "MX", iso3: "MEX", name: "México", risk: 44, status: "watch", trend: "stable" },
];

const FALLBACK_PRESENCE: PresenceItem[] = [
  { territory: "Sáhara Occidental", status: "Disputa diplomática activa", level: "high", category: "diplomatic" },
  { territory: "Gibraltar", status: "Acuerdo post-Brexit en negociación", level: "medium", category: "diplomatic" },
  { territory: "Ceuta y Melilla", status: "Presión migratoria estable", level: "medium", category: "territorial" },
  { territory: "Latinoamérica (cumbres)", status: "Tensión Venezuela y Argentina-España", level: "high", category: "diplomatic" },
  { territory: "OTAN flanco sur", status: "Compromiso 2% PIB defensa pendiente", level: "medium", category: "defense" },
  { territory: "UE Comisión 2026", status: "Posicionamiento agenda climática y migratoria", level: "low", category: "diplomatic" },
];

const FALLBACK_EVENTS: GeoEventItem[] = [
  { event_id: "f1", country: "Ucrania", country_iso3: "UKR", event_date: "2026-05-05", event_type: "Conflicto", severity: "CRITICAL", description: "Ofensiva rusa en Donbass amplía línea de frente 8km", fatalities: 12, impact: 78 },
  { event_id: "f2", country: "Israel-Gaza", country_iso3: "PSE", event_date: "2026-05-05", event_type: "Conflicto", severity: "CRITICAL", description: "Negociación rehenes se rompe; expansión operación terrestre", fatalities: 47, impact: 72 },
  { event_id: "f3", country: "EE.UU.", country_iso3: "USA", event_date: "2026-05-04", event_type: "Política", severity: "HIGH", description: "Aranceles 25% importaciones UE selectivas anunciados", fatalities: 0, impact: 81 },
  { event_id: "f4", country: "Marruecos", country_iso3: "MAR", event_date: "2026-05-04", event_type: "Diplomático", severity: "MEDIUM", description: "Movimientos navales en aguas Sáhara generan tensión bilateral", fatalities: 0, impact: 64 },
];

function formatEventDate(item: GeoEventItem): string {
  try {
    const d = new Date(item.event_date);
    return `${d.getDate()} ${d.toLocaleString("es", { month: "short" })}`;
  } catch {
    return item.event_date;
  }
}

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
  const { data, isLoading, isError } = useQuery<GeoOverview>({
    queryKey: ["geopoliticaOverview"],
    queryFn: () => endpoints.geopoliticaOverview(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const mode = data?.mode ?? (isError ? "error" : "demo");
  const kpis = data?.kpis ?? FALLBACK_KPIS;
  const events = data?.events ?? FALLBACK_EVENTS;
  const countries = data?.countries ?? FALLBACK_COUNTRIES;
  const presence = data?.presence ?? FALLBACK_PRESENCE;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Geopolítica</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Geopolítica & RRII</h1>
          <ModeBadge
            mode={mode as any}
            source={mode === "real" ? "eventos_acled" : "fixtures"}
            message={mode === "real" ? "Datos ACLED/GDELT en tiempo real" : "Datos de ejemplo"}
          />
        </div>
        <p className="text-text2 text-sm mt-1">Eventos internacionales, riesgo país e impacto sobre los intereses españoles.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{isLoading ? "—" : k.value}</div>
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
          {countries.map(c => (
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
            {events.map((e) => (
              <li key={e.event_id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan1 font-mono">{formatEventDate(e)}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted">{e.country}</span>
                  </div>
                  <span className="badge badge-cyan">{e.event_type}</span>
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
            {presence.map((p, i) => (
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
