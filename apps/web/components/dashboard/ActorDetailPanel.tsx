"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink, RefreshCw } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

interface Props {
  actorId: string;
  onClose: () => void;
}

function sentimentColor(s: number): string {
  if (s > 0.2) return "text-green1";
  if (s < -0.2) return "text-red1";
  return "text-text2";
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return "ahora mismo";
  if (diff < 60) return `hace ${diff} min`;
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`;
  if (diff < 10080) return `hace ${Math.floor(diff / 1440)} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function lifecycleBadge(l: string): string {
  if (l === "pico") return "badge-red";
  if (l === "emergente") return "badge-amber";
  if (l === "declinante") return "badge-blue";
  return "badge-cyan";
}

const TABS = [
  { id: "menciones",  label: "Noticias" },
  { id: "narrativas", label: "Narrativas" },
  { id: "historial",  label: "Historial" },
] as const;

type TabId = typeof TABS[number]["id"];

export function ActorDetailPanel({ actorId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("menciones");

  const actorQ = useQuery({
    queryKey: ["actor", actorId],
    queryFn: () => endpoints.actors.get(actorId),
    staleTime: 5 * 60_000,
  });

  const mentionsQ = useQuery({
    queryKey: ["actor-mentions", actorId],
    queryFn: () => endpoints.actors.mentions(actorId, 20),
    enabled: activeTab === "menciones",
    staleTime: 5 * 60_000,
  });

  const narrativesQ = useQuery({
    queryKey: ["actor-narratives", actorId],
    queryFn: () => endpoints.actors.narratives(actorId),
    enabled: activeTab === "narrativas",
    staleTime: 5 * 60_000,
  });

  const historyQ = useQuery({
    queryKey: ["actor-history", actorId],
    queryFn: () => endpoints.actors.history(actorId, 30),
    enabled: activeTab === "historial",
    staleTime: 10 * 60_000,
  });

  const actor = actorQ.data;
  const mentions = mentionsQ.data ?? [];
  const narratives = narrativesQ.data ?? [];
  const history = historyQ.data ?? [];

  const tabLabels: Record<TabId, string> = {
    menciones:  `Noticias (${mentions.length})`,
    narrativas: `Narrativas (${narratives.length})`,
    historial:  "Historial",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-bg2 border-l border-border1 flex flex-col h-full overflow-hidden shadow-2xl animate-slide-in-right">
        {actorQ.isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <RefreshCw className="w-6 h-6 text-cyan1 animate-spin" />
          </div>
        ) : actorQ.isError || !actor ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-text1">Actor no encontrado</h2>
              <button onClick={onClose} className="p-1 rounded hover:bg-bg3 transition">
                <X className="w-5 h-5 text-text2" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="p-5 border-b border-border1"
              style={{ borderTopColor: actor.party_color ?? "#94A3B8", borderTopWidth: 3 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {actor.photo_url ? (
                    <img
                      src={actor.photo_url}
                      alt={actor.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0 border border-border1"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${actor.party_color ?? "#94A3B8"}, #3B82F6)` }}
                    >
                      {actor.name.split(" ").slice(0, 2).map(p => p[0] || "").join("").toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-text1 truncate">{actor.name}</h2>
                    <p className="text-xs text-muted truncate">{actor.party ?? "—"} · {actor.role ?? "—"}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1 rounded hover:bg-bg3 transition shrink-0">
                  <X className="w-5 h-5 text-text2" />
                </button>
              </div>
              {actor.bio && <p className="text-sm text-text2 leading-relaxed">{actor.bio}</p>}
              {actor.auto_created && (
                <span className="badge badge-cyan mt-2 inline-block">Auto-descubierto</span>
              )}

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="kpi-card">
                  <div className="text-[10px] uppercase text-muted mb-0.5">Relevancia</div>
                  <div className="text-xl font-bold text-cyan1">{Math.round(actor.relevance_score)}</div>
                </div>
                <div className="kpi-card">
                  <div className="text-[10px] uppercase text-muted mb-0.5">Aprobación</div>
                  <div className="text-xl font-bold text-text1">{Math.round(actor.approval)}%</div>
                </div>
                <div className="kpi-card">
                  <div className="text-[10px] uppercase text-muted mb-0.5">Menciones 7d</div>
                  <div className="text-xl font-bold text-text1">
                    {actor.mention_count_7d}
                    {actor.mention_count_24h > 0 && (
                      <span className="text-[10px] text-cyan1 font-normal ml-1">+{actor.mention_count_24h} hoy</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border1 flex px-5">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2.5 -mb-px text-xs border-b-2 transition ${
                    activeTab === t.id ? "border-cyan1 text-cyan1 font-semibold" : "border-transparent text-text2 hover:text-text1"
                  }`}
                >
                  {tabLabels[t.id]}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "menciones" && (
                <div className="space-y-2">
                  {mentionsQ.isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-bg3 rounded-lg animate-pulse" />)
                  ) : mentions.length === 0 ? (
                    <p className="text-center text-text2 text-sm py-8">Sin noticias vinculadas aún.</p>
                  ) : (
                    mentions.map(m => (
                      <div key={m.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-text1 line-clamp-2 leading-snug">{m.title}</h4>
                          {m.url && (
                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-0.5">
                              <ExternalLink className="w-3.5 h-3.5 text-cyan1 hover:text-cyan1/80" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted">
                          {m.source && <span>{m.source}</span>}
                          {m.published_at && <span>{timeAgo(m.published_at)}</span>}
                          {m.sentiment != null && (
                            <span className={`ml-auto font-mono ${sentimentColor(m.sentiment)}`}>
                              {m.sentiment > 0 ? "+" : ""}{(m.sentiment * 100).toFixed(0)}
                            </span>
                          )}
                        </div>
                        {m.summary && <p className="text-xs text-text2 mt-1.5 line-clamp-2">{m.summary}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "narrativas" && (
                <div className="space-y-2">
                  {narrativesQ.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-bg3 rounded-lg animate-pulse" />)
                  ) : narratives.length === 0 ? (
                    <p className="text-center text-text2 text-sm py-8">Sin narrativas asociadas aún.</p>
                  ) : (
                    narratives.map(n => (
                      <div key={n.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`badge ${lifecycleBadge(n.lifecycle)}`}>{n.lifecycle}</span>
                          <h4 className="text-sm font-semibold text-text1 truncate">{n.frame_label}</h4>
                        </div>
                        {n.description && <p className="text-xs text-text2 mb-2 line-clamp-2">{n.description}</p>}
                        <div className="flex items-center gap-3 text-[10px] text-muted">
                          <span>Vel: <span className="text-text2">{n.velocity}</span></span>
                          <span>Intensidad:</span>
                          <div className="flex-1 h-1 bg-bg3 rounded-full overflow-hidden">
                            <div className="h-full bg-amber1" style={{ width: `${n.intensity * 100}%` }} />
                          </div>
                          <span className="font-mono">{(n.intensity * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "historial" && (
                <div>
                  {historyQ.isLoading ? (
                    <div className="h-32 bg-bg3 rounded-lg animate-pulse" />
                  ) : history.length === 0 ? (
                    <p className="text-center text-text2 text-sm py-8">Sin historial registrado.</p>
                  ) : (
                    <div className="premium-card">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">
                        Evolución de relevancia ({history.length} mediciones)
                      </h3>
                      <svg width="100%" height="80" viewBox="0 0 300 80">
                        {(() => {
                          const vals = history.map(h => h.score).reverse();
                          if (vals.length < 2) return null;
                          const max = Math.max(...vals, 1);
                          const min = Math.min(...vals, 0);
                          const range = max - min || 1;
                          const pts = vals.map((v, i) => {
                            const x = (i / (vals.length - 1)) * 296 + 2;
                            const y = 76 - ((v - min) / range) * 68 + 2;
                            return `${x},${y}`;
                          }).join(" ");
                          return (
                            <>
                              <polyline points={`2,78 ${pts} 298,78`} fill="rgba(0,212,255,0.10)" stroke="none" />
                              <polyline points={pts} fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" />
                            </>
                          );
                        })()}
                      </svg>
                      <div className="flex justify-between text-[10px] text-muted mt-1">
                        <span>{history[history.length - 1] && new Date(history[history.length - 1].date).toLocaleDateString("es-ES")}</span>
                        <span>{history[0] && new Date(history[0].date).toLocaleDateString("es-ES")}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
