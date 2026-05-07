"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, BookOpen, ChevronRight, Vote } from "lucide-react";
import { endpoints, type LegislationItem } from "@/lib/api/endpoints";

function typeBadge(t?: string) {
  if (!t) return "badge-blue";
  if (t === "Real Decreto" || t === "RDL") return "badge-red";
  if (t === "Proyecto Ley" || t === "Ley") return "badge-cyan";
  return "badge-blue";
}

function urgencyBadge(u?: string) {
  if (u === "alto" || u === "high") return "badge-red";
  if (u === "medio" || u === "medium") return "badge-amber";
  return "badge-blue";
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch { return iso; }
}

export default function LegislativoPage() {
  // Iniciativas urgentes — alta relevancia, últimos 14 días
  const { data: urgent = [], isLoading: loadingUrgent } = useQuery({
    queryKey: ["legislation", "urgent"],
    queryFn: () => endpoints.intelligence.legislationImpact({ minRelevance: 7, daysBack: 14 }),
    staleTime: 300_000,
    refetchInterval: 600_000,
  });

  // BOE último día
  const { data: boe = [], isLoading: loadingBoe } = useQuery({
    queryKey: ["legislation", "boe-day"],
    queryFn: () => endpoints.intelligence.legislationImpact({ daysBack: 1, level: "estatal" }),
    staleTime: 600_000,
  });

  // Calendar — próximos eventos: usamos los que tienen scheduled_date futuro (filtrado en cliente)
  const { data: calendar = [], isLoading: loadingCal } = useQuery({
    queryKey: ["legislation", "calendar"],
    queryFn: () => endpoints.intelligence.legislationImpact({ daysBack: 7 }),
    staleTime: 300_000,
  });

  // Filtrar calendar a los próximos 7 días con status pleno/comision
  const calendarFiltered = (calendar as LegislationItem[]).filter(c => {
    const status = (c.status || "").toLowerCase();
    return status.includes("pleno") || status.includes("comis") || status.includes("ponen");
  }).slice(0, 8);

  // KPIs derivados
  const kpis = [
    { label: "Iniciativas activas", value: urgent.length + calendarFiltered.length, color: "text-cyan1" },
    { label: "Alta relevancia 14d",  value: urgent.filter(u => (u.ai_relevance ?? 0) >= 7).length, color: "text-amber1" },
    { label: "BOE 24h",              value: boe.length, color: "text-blue1" },
    { label: "Próx. votaciones",     value: calendarFiltered.length, color: "text-red1" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Monitor Legislativo</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Monitor Legislativo</h1>
        <p className="text-text2 text-sm mt-1">Iniciativas en tramitación, calendario parlamentario y publicaciones BOE — datos en vivo.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Iniciativas urgentes */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Iniciativas urgentes (rel ≥7)</h2>
          </div>
          <ul className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loadingUrgent
              ? Array.from({ length: 5 }).map((_, i) => <li key={i} className="p-3 rounded-lg animate-pulse h-24 bg-bg3/30" />)
              : urgent.length === 0
                ? <li className="text-xs text-muted italic">Sin iniciativas de alta relevancia.</li>
                : urgent.slice(0, 8).map((it, i) => (
                    <li key={it.id || i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug">{it.titulo}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {it.nivel && <span className={`badge ${typeBadge(it.nivel)}`}>{it.nivel}</span>}
                        {it.ai_impact_level && <span className={`badge ${urgencyBadge(it.ai_impact_level)}`}>{it.ai_impact_level}</span>}
                        {it.ai_relevance != null && <span className="badge bg-bg3 text-text2 border border-border1 text-[10px]">R{it.ai_relevance}</span>}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-text2">
                        <span>{it.ai_category || "—"}</span>
                        <span className="text-amber1">{fmtDate(it.published_at)}</span>
                      </div>
                      {(it.sectores_afectados || []).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(it.sectores_afectados || []).slice(0, 3).map(s => (
                            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan1/10 text-cyan1">{s}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
          </ul>
        </section>

        {/* Calendar (filtrado de iniciativas con status pleno/comisión) */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Tramitación próxima</h2>
          </div>
          <ul className="space-y-3">
            {loadingCal
              ? Array.from({ length: 5 }).map((_, i) => <li key={i} className="p-3 rounded-lg animate-pulse h-12 bg-bg3/30" />)
              : calendarFiltered.length === 0
                ? <li className="text-xs text-muted italic">Sin actos parlamentarios programados.</li>
                : calendarFiltered.map((c, i) => (
                    <li key={c.id || i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg3 transition cursor-pointer">
                      <div className="text-xs text-cyan1 font-mono w-12 shrink-0">{fmtDate(c.scheduled_date || c.published_at)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text1 leading-snug line-clamp-2">{c.titulo}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Vote className="w-3 h-3 text-muted" />
                          <span className="text-[10px] uppercase text-muted tracking-wider">{c.status}</span>
                        </div>
                      </div>
                    </li>
                  ))}
          </ul>
        </section>

        {/* BOE último día */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">BOE último día</h2>
          </div>
          <ul className="space-y-3">
            {loadingBoe
              ? Array.from({ length: 5 }).map((_, i) => <li key={i} className="p-3 rounded-lg animate-pulse h-16 bg-bg3/30" />)
              : boe.length === 0
                ? <li className="text-xs text-muted italic">Sin disposiciones BOE en 24h.</li>
                : boe.slice(0, 6).map((b, i) => (
                    <li key={b.id || i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                      <div className="text-[10px] uppercase tracking-wider text-muted mb-1">{b.ai_category || b.nivel || "BOE"}</div>
                      <div className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug line-clamp-3">{b.titulo}</div>
                      {b.url && (
                        <a href={b.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-[11px] text-cyan1">
                          Ver disposición <ChevronRight className="w-3 h-3" />
                        </a>
                      )}
                    </li>
                  ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
