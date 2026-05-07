"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { ExternalLink, Filter, ChevronRight, Globe, Newspaper } from "lucide-react";

const CATEGORIES = [
  { value: "", label: "Todas" },
  { value: "politica", label: "Política" },
  { value: "economia", label: "Economía" },
  { value: "vivienda", label: "Vivienda" },
  { value: "justicia", label: "Justicia" },
  { value: "sanidad", label: "Sanidad" },
  { value: "inmigracion", label: "Inmigración" },
  { value: "energia", label: "Energía" },
  { value: "educacion", label: "Educación" },
  { value: "generalista", label: "Generalista" },
];

const BIAS_OPTIONS = [
  { value: "", label: "Todos los sesgos" },
  { value: "izquierda", label: "◀ Izquierda" },
  { value: "centroizquierda", label: "◂ Centro-izq." },
  { value: "centro", label: "● Centro" },
  { value: "centroderecha", label: "▸ Centro-der." },
  { value: "derecha", label: "▶ Derecha" },
];

const SCOPE_OPTIONS = [
  { value: "all", label: "Todo" },
  { value: "spain", label: "España" },
  { value: "international", label: "Internacional" },
];

const PARTIES = ["", "PP", "PSOE", "VOX", "SUMAR", "JUNTS", "ERC", "PNV", "BILDU"];

function SentimentBadge({ score, label }: { score: number; label: string }) {
  const cls = score > 0.1 ? "badge-green" : score < -0.1 ? "badge-red" : "badge-cyan";
  const emoji = score > 0.1 ? "▲" : score < -0.1 ? "▼" : "→";
  return <span className={`badge ${cls} text-[9px]`}>{emoji} {label || (score > 0.1 ? "positivo" : score < -0.1 ? "negativo" : "neutro")}</span>;
}

function BiasBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  );
}

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(Math.min(score * 100, 100));
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="h-1 flex-1 bg-bg3 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan1 to-blue1 rounded-full"
          style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-muted w-7 text-right">{pct}</span>
    </div>
  );
}

export function MediaFeed() {
  const [category, setCategory] = useState("");
  const [bias, setBias] = useState("");
  const [partido, setPartido] = useState("");
  const [scope, setScope] = useState("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["media-intel", "feed", category, bias, partido, scope, page],
    queryFn: () => endpoints.mediaIntelFeed({
      category: category || undefined,
      bias: bias || undefined,
      partido: partido || undefined,
      scope,
      page,
      page_size: PAGE_SIZE,
    }).catch(() => ({ items: [], total: 0, page: 1, page_size: PAGE_SIZE, mode: "error" })),
    staleTime: 2 * 60 * 1000,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function resetFilters() {
    setCategory(""); setBias(""); setPartido(""); setScope("all"); setPage(1);
  }

  const hasFilters = !!(category || bias || partido || scope !== "all");

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="premium-card py-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-text2 shrink-0" />

          {/* Scope tabs */}
          <div className="flex gap-0.5 border border-border1 rounded-md overflow-hidden">
            {SCOPE_OPTIONS.map(o => (
              <button key={o.value} onClick={() => { setScope(o.value); setPage(1); }}
                className={`px-2.5 py-1 text-xs transition ${scope === o.value
                  ? "bg-cyan1/15 text-cyan1 font-semibold"
                  : "text-text2 hover:text-text1"}`}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Category */}
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="bg-bg3 border border-border1 rounded px-2 py-1 text-xs text-text1 focus:border-cyan1 focus:outline-none">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {/* Bias */}
          <select value={bias} onChange={e => { setBias(e.target.value); setPage(1); }}
            className="bg-bg3 border border-border1 rounded px-2 py-1 text-xs text-text1 focus:border-cyan1 focus:outline-none">
            {BIAS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Party */}
          <select value={partido} onChange={e => { setPartido(e.target.value); setPage(1); }}
            className="bg-bg3 border border-border1 rounded px-2 py-1 text-xs text-text1 focus:border-cyan1 focus:outline-none">
            <option value="">Todos los partidos</option>
            {PARTIES.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {hasFilters && (
            <button onClick={resetFilters}
              className="text-xs text-muted hover:text-text2 transition ml-auto">
              × Limpiar filtros
            </button>
          )}

          <span className="ml-auto text-xs text-muted">
            {isLoading ? "Cargando..." : `${total} artículos`}
            {isFetching && !isLoading && " •"}
          </span>
        </div>
      </div>

      {/* Articles list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="premium-card animate-pulse">
              <div className="h-3 bg-bg3 rounded w-3/4 mb-2" />
              <div className="h-2 bg-bg3 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item: any) => {
            const isOpen = expanded === item.id;
            return (
              <div key={item.id}
                className="group border border-border1 rounded-lg hover:border-cyan1/30 transition bg-bg2">
                <div className="flex items-start gap-3 p-3 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : item.id)}>
                  {/* Relevance */}
                  <span className="text-cyan1 font-mono text-xs mt-0.5 w-6 shrink-0 text-right">
                    {Math.round(item.relevance * 100)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-muted font-medium uppercase tracking-wide">
                        {item.scope === "international"
                          ? <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{item.source}</span>
                          : <span className="flex items-center gap-1"><Newspaper className="w-3 h-3" />{item.source}</span>
                        }
                      </span>
                      {item.date && <span className="text-[9px] text-muted">{String(item.date).slice(0, 10)}</span>}
                      {item.bias_label && item.scope === "spain" && (
                        <BiasBadge label={item.bias_label} color={item.bias_color} />
                      )}
                      {item.scope === "international" && item.country && (
                        <span className="badge badge-blue text-[9px]">{item.country}</span>
                      )}
                    </div>

                    <p className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug">
                      {item.title}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                      <SentimentBadge score={item.sentiment_score} label={item.sentiment_label} />
                      {item.category && item.category !== "generalista" && (
                        <span className="badge badge-cyan text-[9px]">{item.category}</span>
                      )}
                      {item.parties && (
                        <span className="text-[9px] text-muted">{item.parties}</span>
                      )}
                    </div>

                    <RelevanceBar score={item.relevance} />
                  </div>

                  <ChevronRight className={`w-4 h-4 text-muted shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </div>

                {/* Expanded summary */}
                {isOpen && (
                  <div className="px-3 pb-3 pt-0 border-t border-border1/50">
                    <p className="text-xs text-text2 mt-2 leading-relaxed">
                      {item.summary || "Sin resumen disponible."}
                    </p>
                    {item.url && item.url !== "#" && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-cyan1 hover:underline">
                        Ver artículo completo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="premium-card text-center py-10">
              <p className="text-text2 text-sm">No hay artículos con los filtros seleccionados.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded border border-border1 text-text2 hover:text-text1 disabled:opacity-40 transition">
            ← Anterior
          </button>
          <span className="text-xs text-muted">Pág. {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs rounded border border-border1 text-text2 hover:text-text1 disabled:opacity-40 transition">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
