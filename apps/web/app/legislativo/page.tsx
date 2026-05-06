"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, BookOpen, ChevronRight, Vote } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import type { Initiative, BoeItem, LegislativeKpis } from "@/lib/types/legislative";
import type { DataMode } from "@/lib/types/status";

const CALENDAR = [
  { day: "Lun", item: "Pleno: convalidación RDL fondos UE", type: "Pleno" },
  { day: "Mar", item: "Comisión Justicia: informes", type: "Comisión" },
  { day: "Mié", item: "Pleno: votación reforma fiscal", type: "Pleno" },
  { day: "Jue", item: "Comisión Hacienda: enmiendas vivienda", type: "Comisión" },
  { day: "Vie", item: "Diputación Permanente", type: "Pleno" },
];

function urgencyBadge(u: string) {
  if (u === "high") return "badge-red";
  if (u === "medium") return "badge-amber";
  return "badge-blue";
}

function typeBadge(t: string) {
  if (t.includes("Real Decreto")) return "badge-red";
  if (t.includes("Proyecto")) return "badge-cyan";
  return "badge-blue";
}

export default function LegislativoPage() {
  const { data: kpisData } = useQuery({
    queryKey: ["legislative", "kpis"],
    queryFn: () => endpoints.legislativeKpis(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: initiativesData } = useQuery({
    queryKey: ["legislative", "initiatives"],
    queryFn: () => endpoints.legislativeInitiatives(10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: boeData } = useQuery({
    queryKey: ["legislative", "boe"],
    queryFn: () => endpoints.legislativeBoe(5),
    staleTime: 5 * 60 * 1000,
  });

  const kpis: LegislativeKpis = kpisData ?? {
    active_initiatives: 187,
    approved_this_month: 23,
    critical_tramitation: 9,
    upcoming_votes: 14,
    mode: "fallback",
  };

  const initiatives: Initiative[] = initiativesData?.items ?? [];
  const boeItems: BoeItem[] = boeData?.items ?? [];
  const overallMode: DataMode = kpisData?.mode ?? initiativesData?.mode ?? "fallback";

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Monitor Legislativo</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Monitor Legislativo</h1>
          <ModeBadge mode={overallMode} source="api/legislative" />
        </div>
        <p className="text-text2 text-sm mt-1">Iniciativas en tramitación, calendario parlamentario y publicaciones BOE.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Iniciativas activas", value: kpis.active_initiatives, color: "text-cyan1" },
          { label: "Aprobadas este mes", value: kpis.approved_this_month, color: "text-green1" },
          { label: "Tramitación crítica", value: kpis.critical_tramitation, color: "text-red1" },
          { label: "Próximas votaciones", value: kpis.upcoming_votes, color: "text-amber1" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Initiatives */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Iniciativas urgentes</h2>
          </div>
          {initiatives.length === 0 ? (
            <div className="text-sm text-text2 text-center py-8">Cargando iniciativas…</div>
          ) : (
            <ul className="space-y-3">
              {initiatives.map(it => (
                <li key={it.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug">{it.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className={`badge ${typeBadge(it.type)}`}>{it.type || "Iniciativa"}</span>
                    <span className={`badge ${urgencyBadge(it.urgency)}`}>{it.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text2">
                    <span>{it.proponent}</span>
                    {it.submitted_at && (
                      <span className="text-amber1">
                        Presentada: {it.submitted_at.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Calendar — static, no real API yet */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Calendario semana</h2>
          </div>
          <ul className="space-y-3">
            {CALENDAR.map((c, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg3 transition cursor-pointer">
                <div className="text-xs text-cyan1 font-mono w-12 shrink-0">{c.day}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text1 leading-snug">{c.item}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Vote className="w-3 h-3 text-muted" />
                    <span className="text-[10px] uppercase text-muted tracking-wider">{c.type}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* BOE */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
              BOE — {boeData ? boeData.date : "último día"}
            </h2>
          </div>
          {boeItems.length === 0 ? (
            <div className="text-sm text-text2 text-center py-8">Cargando BOE…</div>
          ) : (
            <ul className="space-y-3">
              {boeItems.map((b, i) => (
                <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">{b.section}</div>
                  <div className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug">{b.title}</div>
                  {b.url ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 text-[11px] text-cyan1 hover:underline"
                    >
                      Ver disposición <ChevronRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-cyan1">
                      Ver disposición <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
