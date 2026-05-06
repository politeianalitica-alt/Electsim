"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { AlertTriangle, Newspaper, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

function levelClass(level: string) {
  if (level === "critical" || level === "high") return "bg-red1";
  if (level === "medium") return "bg-amber1";
  return "bg-blue1";
}

function urgenciaToLevel(u: number): string {
  if (u >= 5) return "critical";
  if (u >= 4) return "high";
  if (u >= 3) return "medium";
  return "low";
}

function velocityArrow(v: string | number) {
  const val = typeof v === "number" ? (v > 3 ? "up" : "stable") : v;
  if (val === "up") return { symbol: "▲", color: "text-red1" };
  if (val === "down") return { symbol: "▼", color: "text-green1" };
  return { symbol: "→", color: "text-text2" };
}

function timeAgo(ts?: string): string {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)} h`;
  return `hace ${Math.round(diff / 86400)} d`;
}

export function IntelGrid() {
  const { data: signals = [] } = useQuery({
    queryKey: ["signals", "intel-grid"],
    queryFn: () => endpoints.signalsActivas(3).catch(() => []),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["media", "intel-grid-stories"],
    queryFn: () => endpoints.mediaTopStories(5).catch(() => []),
    refetchInterval: 10 * 60 * 1000,
    staleTime: 8 * 60 * 1000,
  });

  const { data: narrativas = [] } = useQuery({
    queryKey: ["osint", "intel-grid-narrativas"],
    queryFn: () => endpoints.osintNarrativas({ horas: 48 }).catch(() => []),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  // Normalize signals to alert items
  const sevMap: Record<string, string> = { critical: "critical", high: "high", medium: "medium" };
  const alerts = (signals as any[]).slice(0, 4).map((s: any) => ({
    title: s.titulo ?? s.title ?? "",
    level: urgenciaToLevel(s.urgencia ?? 0) !== "low" ? urgenciaToLevel(s.urgencia ?? 0) : (sevMap[s.severity] ?? "low"),
    source: s.modulo_origen ?? s.domain ?? "motor señales",
    time: timeAgo(s.created_at),
  }));

  // Normalize stories
  const topStories = (stories as any[]).slice(0, 5).map((s: any) => ({
    title: s.title ?? s.titulo,
    source: s.source ?? s.fuente,
    score: s.relevance_score ?? s.relevancia_cliente ?? 0,
  }));

  // Normalize narratives
  const topNarrativas = (narrativas as any[]).slice(0, 4).map((n: any) => ({
    label: n.titulo ?? n.frame_label ?? n.label ?? "",
    velocity: (n.velocidad_por_hora ?? 0) > 3 ? "up" : n.velocity === "up" ? "up" : "stable",
    action: n.accion_recomendada ?? n.recommended_action ?? "Monitorizar evolución",
  }));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[.14em] text-cyan1">Centro de inteligencia</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Alertas */}
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber1" />
              <h3 className="text-sm font-bold text-text1">Alertas activas</h3>
            </div>
            <span className="badge badge-amber">{alerts.length || "—"}</span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Sin señales activas</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a, i) => (
                <li key={i} className="flex gap-3 group">
                  <span className={`w-1 rounded-full self-stretch ${levelClass(a.level)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text1 font-medium leading-snug group-hover:text-cyan1 transition truncate">
                      {a.title}
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                      <span>{a.source}</span>
                      <span>·</span>
                      <span>{a.time}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/alertas" className="mt-4 inline-flex items-center gap-1 text-xs text-cyan1 hover:underline">
            Ver todas las alertas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Top Stories */}
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-cyan1" />
              <h3 className="text-sm font-bold text-text1">Top noticias</h3>
            </div>
            <span className="badge badge-cyan">selección editorial</span>
          </div>
          {topStories.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Sin noticias disponibles</p>
          ) : (
            <ul className="space-y-2.5">
              {topStories.map((s, i) => (
                <li key={i} className="group cursor-pointer">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted">{s.source}</span>
                    <span className="text-[10px] font-mono text-cyan1">{(s.score * 100).toFixed(0)}</span>
                  </div>
                  <div className="text-sm text-text1 leading-snug group-hover:text-cyan1 transition">
                    {s.title}
                  </div>
                  <div className="mt-1 h-0.5 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${s.score * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/medios" className="mt-4 inline-flex items-center gap-1 text-xs text-cyan1 hover:underline">
            Monitor de medios <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Narrativas */}
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple1" />
              <h3 className="text-sm font-bold text-text1">Narrativas activas</h3>
            </div>
            <span className="badge bg-purple1/15 text-purple1 border border-purple1/30">
              {topNarrativas.length || "—"}
            </span>
          </div>
          {topNarrativas.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Sin narrativas detectadas</p>
          ) : (
            <ul className="space-y-3">
              {topNarrativas.map((n, i) => {
                const v = velocityArrow(n.velocity);
                return (
                  <li key={i} className="group">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm ${v.color} font-bold`}>{v.symbol}</span>
                      <span className="text-sm text-text1 font-medium group-hover:text-cyan1 transition truncate">
                        {n.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-text2 ml-6">{n.action}</div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/medios#narrativas" className="mt-4 inline-flex items-center gap-1 text-xs text-cyan1 hover:underline">
            Tracker de narrativas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
