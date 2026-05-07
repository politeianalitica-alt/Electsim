"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints, type LegislationItem, type LegislationStats } from "@/lib/api/endpoints";
import { FileText, Calendar, BookOpen, ChevronRight, Vote, Search } from "lucide-react";

const DEFAULT_STATS: LegislationStats = {
  hoy: 0, semana: 0, mes: 0,
  n_boe: 0, n_eurlex: 0, n_ccaa: 0,
  en_tramite: 0, alta_urgencia: 0,
};

function urgencyBadge(score?: number) {
  if (!score) return "badge-blue";
  if (score >= 8) return "badge-red";
  if (score >= 5) return "badge-amber";
  return "badge-blue";
}

function typeBadge(tipo?: string) {
  if (!tipo) return "badge-blue";
  if (tipo === "real_decreto") return "badge-red";
  if (tipo === "ley" || tipo === "proyecto_ley") return "badge-cyan";
  if (tipo === "directiva_ue") return "badge-blue";
  return "badge-blue";
}

function tipoLabel(tipo?: string): string {
  const map: Record<string, string> = {
    ley: "Ley",
    proyecto_ley: "Proyecto Ley",
    proposicion_ley: "Proposición",
    real_decreto: "Real Decreto",
    real_decreto_ley: "RDL",
    orden_ministerial: "Orden Min.",
    directiva_ue: "Directiva UE",
    reglamento_ue: "Reglamento UE",
    otro: "Otro",
  };
  return map[tipo ?? ""] ?? tipo ?? "Norma";
}

function estadoBadge(estado?: string) {
  if (estado === "publicado") return "badge-green";
  if (estado === "en_tramite") return "badge-cyan";
  if (estado === "pleno") return "badge-amber";
  if (estado === "comision") return "badge-blue";
  if (estado === "rechazado" || estado === "retirado") return "badge-red";
  return "badge-blue";
}

export default function LegislativoPage() {
  const [search, setSearch] = useState("");
  const [fuente, setFuente] = useState("");

  const { data: stats = DEFAULT_STATS } = useQuery({
    queryKey: ["legislation", "stats"],
    queryFn: () => endpoints.legislationStats().catch(() => DEFAULT_STATS),
    staleTime: 5 * 60 * 1000,
  });

  const { data: legislation = [], isLoading } = useQuery({
    queryKey: ["legislation", "list", fuente],
    queryFn: () =>
      endpoints.legislationList({ fuente: fuente || undefined, limit: 30 })
        .then((r: any) => (Array.isArray(r) ? r : r?.items ?? []))
        .catch(() => [] as LegislationItem[]),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tramite = [] } = useQuery({
    queryKey: ["legislation", "tramite"],
    queryFn: () =>
      endpoints.legislationTramite()
        .then((r: any) => (Array.isArray(r) ? r : r?.items ?? []))
        .catch(() => [] as LegislationItem[]),
    staleTime: 5 * 60 * 1000,
  });

  const urgent = legislation
    .filter((l: LegislationItem) => (l.score_urgencia_cliente ?? 0) >= 6)
    .slice(0, 6);

  const boe = legislation
    .filter((l: LegislationItem) => l.fuente === "BOE")
    .slice(0, 5);

  const filtered = search
    ? legislation.filter((l: LegislationItem) =>
        (l.titulo_corto ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : legislation;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Monitor Legislativo</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Monitor Legislativo</h1>
        <p className="text-text2 text-sm mt-1">Iniciativas en tramitación, kalendario parlamentario y publicaciones BOE.</p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Iniciativas activas</div>
          <div className="text-2xl font-bold text-cyan1">{stats.en_tramite}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Publicadas hoy</div>
          <div className="text-2xl font-bold text-green1">{stats.hoy}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Alta urgencia</div>
          <div className="text-2xl font-bold text-red1">{stats.alta_urgencia}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Este mes</div>
          <div className="text-2xl font-bold text-amber1">{stats.mes}</div>
        </div>
      </div>

      {/* Search + filter */}
      <section className="premium-card">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-cyan1" />
          <input
            type="text"
            placeholder="Buscar norma..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1"
          />
          <select
            value={fuente}
            onChange={e => setFuente(e.target.value)}
            className="bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1"
          >
            <option value="">Todas las fuentes</option>
            <option value="BOE">BOE</option>
            <option value="EUR-LEX">EUR-Lex</option>
            <option value="CCAA">CCAA</option>
            <option value="CONGRESO">Congreso</option>
          </select>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Iniciativas urgentes */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Iniciativas urgentes</h2>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-bg3 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : urgent.length > 0 ? (
            <ul className="space-y-3">
              {urgent.map((it: LegislationItem) => (
                <li key={it.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <h3 className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug mb-1.5">
                    {it.titulo_corto}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className={`badge ${typeBadge(it.tipo)}`}>{tipoLabel(it.tipo)}</span>
                    <span className={`badge ${estadoBadge(it.estado)}`}>{it.estado}</span>
                    <span className={`badge ${urgencyBadge(it.score_urgencia_cliente)}`}>
                      Urgencia {it.score_urgencia_cliente?.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text2">
                    <span>{it.fuente}</span>
                    {it.fecha_publicacion && (
                      <span className="text-muted">{new Date(it.fecha_publicacion).toLocaleDateString("es-ES")}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted text-center py-8">Sin normas urgentes en los últimos 30 días.</p>
          )}
        </section>

        {/* En tramitación */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">En tramitación</h2>
          </div>
          {tramite.length > 0 ? (
            <ul className="space-y-3">
              {tramite.slice(0, 6).map((c: LegislationItem) => (
                <li key={c.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg3 transition cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text1 leading-snug">{c.titulo_corto}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Vote className="w-3 h-3 text-muted" />
                      <span className="text-[10px] uppercase text-muted tracking-wider">{c.estado}</span>
                    </div>
                  </div>
                  <span className={`badge ${urgencyBadge(c.score_urgencia_cliente)} shrink-0`}>
                    {c.score_urgencia_cliente?.toFixed(0) ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted text-center py-8">Sin iniciativas en tramitación.</p>
          )}
        </section>

        {/* BOE reciente */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">BOE reciente</h2>
          </div>
          {boe.length > 0 ? (
            <ul className="space-y-3">
              {boe.map((b: LegislationItem) => (
                <li key={b.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">{b.tipo}</div>
                  <div className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug">
                    {b.titulo_corto}
                  </div>
                  {b.resumen_ejecutivo && (
                    <div className="text-[11px] text-text2 mt-1 line-clamp-2">{b.resumen_ejecutivo}</div>
                  )}
                  {b.url_fuente && (
                    <a
                      href={b.url_fuente}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 text-[11px] text-cyan1 hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      Ver disposición <ChevronRight className="w-3 h-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted text-center py-8">Sin publicaciones BOE recientes.</p>
          )}
        </section>
      </div>
    </div>
  );
}
