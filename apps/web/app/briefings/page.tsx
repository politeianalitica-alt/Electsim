"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { FileText, Download, Volume2, Plus, Calendar, RefreshCw } from "lucide-react";

export default function BriefingsPage() {
  const { data: briefing, isLoading: loadingBriefing, refetch } = useQuery({
    queryKey: ["briefing", "morning"],
    queryFn: () => endpoints.morningBriefing("default").catch(() => null),
  });

  const { data: historyData } = useQuery({
    queryKey: ["briefings", "v2", "list"],
    queryFn: () => endpoints.briefingsListV2("default", 10).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const historyItems: any[] = (historyData as any)?.briefings ?? (historyData as any)?.items ?? [];

  const DEMO_HISTORY = [
    { id: "1", date: "5 may", title: "Briefing matinal — España" },
    { id: "2", date: "4 may", title: "Briefing matinal — España" },
    { id: "3", date: "3 may", title: "Briefing crisis — DANA Valencia" },
    { id: "4", date: "2 may", title: "Briefing cliente — Sector banca" },
  ];

  const displayHistory = historyItems.length > 0
    ? historyItems.slice(0, 6).map((b: any) => ({
        id: b.id,
        date: b.generated_at ? new Date(b.generated_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—",
        title: b.title ?? b.executive_summary?.slice(0, 50) ?? "Briefing",
      }))
    : DEMO_HISTORY;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Inteligencia editorial</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Briefings</h1>
          <p className="text-text2 text-sm mt-1">Generación, archivo y exportación de briefings premium con evidencia.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBriefing ? "animate-spin" : ""}`} />
          </button>
          <button className="px-4 py-2 rounded-md bg-cyan1 text-bg font-semibold flex items-center gap-2 hover:bg-cyan2 transition">
            <Plus className="w-4 h-4" /> Crear briefing
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 premium-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="label-cap">Briefing matinal</span>
              <h2 className="text-xl font-bold text-text1 mt-1">Análisis ejecutivo del día</h2>
              <p className="text-text2 text-xs flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString("es-ES", { dateStyle: "full" })}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button className="px-3 py-1.5 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-xs flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Audio 5min
              </button>
            </div>
          </div>

          <h3 className="text-sm font-bold text-cyan1 mb-2 uppercase tracking-wider">Resumen ejecutivo</h3>
          <p className="text-text1 leading-relaxed mb-6">{briefing?.executive_summary || "Cargando análisis..."}</p>

          <h3 className="text-sm font-bold text-cyan1 mb-2 uppercase tracking-wider">Señales críticas</h3>
          <ul className="space-y-2 mb-6">
            {(briefing?.key_alerts || []).map((alert, i) => (
              <li key={i} className="flex gap-3 p-3 rounded-lg bg-bg/50 border border-border1">
                <span className={`w-1 rounded-full ${alert.level === "high" ? "bg-red1" : "bg-amber1"}`} />
                <div>
                  <div className="text-sm text-text1 font-medium">{alert.title}</div>
                  <div className="text-xs text-text2 mt-1">{alert.body}</div>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="text-sm font-bold text-cyan1 mb-2 uppercase tracking-wider">Top noticias seleccionadas</h3>
          <ul className="space-y-2 mb-6">
            {(briefing?.top_stories || []).map((s, i) => (
              <li key={i} className="text-sm">
                <span className="text-muted text-xs">[{s.source}]</span>{" "}
                <span className="text-text1">{s.title}</span>
              </li>
            ))}
          </ul>

          <h3 className="text-sm font-bold text-cyan1 mb-2 uppercase tracking-wider">Tres preguntas estratégicas</h3>
          <ol className="space-y-2 list-decimal list-inside text-text1">
            {(briefing?.three_questions || []).map((q, i) => (
              <li key={i} className="text-sm">{q}</li>
            ))}
          </ol>
        </section>

        <aside className="space-y-4">
          <div className="premium-card">
            <h3 className="text-sm font-bold text-text1 mb-3">Tipos de briefing</h3>
            <ul className="space-y-1">
              {["Diario", "Cliente", "Campaña", "Crisis", "Geopolítico", "Legislativo"].map(t => (
                <li key={t}>
                  <button className="w-full text-left px-3 py-2 rounded-md text-sm text-text2 hover:text-cyan1 hover:bg-bg3 transition flex items-center justify-between group">
                    <span>{t}</span>
                    <FileText className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="premium-card">
            <h3 className="text-sm font-bold text-text1 mb-3">Historial reciente</h3>
            <ul className="space-y-2">
              {displayHistory.map((b, i) => (
                <li key={b.id ?? i} className="text-xs">
                  <button className="w-full text-left p-2 rounded hover:bg-bg3 transition">
                    <div className="text-muted">{b.date}</div>
                    <div className="text-text1 truncate">{b.title}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="premium-card border-cyan1/30">
            <h3 className="text-sm font-bold text-cyan1 mb-2">Audio summary 5min</h3>
            <p className="text-xs text-text2 mb-3">Versión resumida del briefing en audio para escuchar de camino a la oficina.</p>
            <button className="w-full px-3 py-2 rounded-md bg-cyan1/10 border border-cyan1/30 text-cyan1 text-sm hover:bg-cyan1/20 transition flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4" /> Generar audio
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
