"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  Users, Search, TrendingUp, TrendingDown, Minus, Network,
  ChevronRight, Plus, RefreshCw, Zap,
} from "lucide-react";
import { endpoints, type Actor } from "@/lib/api/endpoints";
import { ActorDetailPanel } from "@/components/dashboard/ActorDetailPanel";
import { AddActorModal } from "@/components/dashboard/AddActorModal";

// D3 force-directed graph: client-only (usa SVG manipulation y window)
// Dynamic import con ssr:false reduce el bundle inicial y evita errores SSR
const ActorGraph = dynamic(
  () => import("@/components/dashboard/ActorGraph").then(m => ({ default: m.ActorGraph })),
  {
    ssr: false,
    loading: () => (
      <div className="premium-card p-0 overflow-hidden">
        <div className="h-14 border-b border-border1 bg-bg3/30 animate-pulse"/>
        <div className="h-[600px] bg-bg3/20 animate-pulse"/>
      </div>
    ),
  }
);

// ── Mapas de partidos ────────────────────────────────────────────────────────
const PARTIES = [
  { code: "PSOE",    color: "#E03A3E" },
  { code: "PP",      color: "#1F77FF" },
  { code: "VOX",     color: "#5BC035" },
  { code: "Sumar",   color: "#D81E5B" },
  { code: "Junts",   color: "#00C2A8" },
  { code: "ERC",     color: "#F4B400" },
  { code: "PNV",     color: "#1D8042" },
  { code: "Bildu",   color: "#A4D65E" },
  { code: "Podemos", color: "#6E2A78" },
];

// ── Fallback data (los 24 actores hardcoded del directorio original) ─────────
const ACTORS_FALLBACK: Actor[] = [
  { id: "p1", name: "Pedro Sánchez",            party: "PSOE",          party_color: "#E03A3E", role: "Presidente del Gobierno",     bio: "Secretario General del PSOE desde 2017.", source: "manual", relevance_score: 96, exposure: 96, approval: 38, sentiment: "down",   mention_count_24h: 0, mention_count_7d: 0, is_active: true, auto_created: false, created_at: "", updated_at: "" },
  { id: "p2", name: "Alberto Núñez Feijóo",     party: "PP",            party_color: "#1F77FF", role: "Líder de la oposición",        bio: "Presidente del PP desde 2022.", source: "manual", relevance_score: 91, exposure: 91, approval: 42, sentiment: "up",     mention_count_24h: 0, mention_count_7d: 0, is_active: true, auto_created: false, created_at: "", updated_at: "" },
  { id: "p3", name: "Santiago Abascal",         party: "VOX",           party_color: "#5BC035", role: "Presidente",                   bio: "Líder y fundador de VOX.", source: "manual", relevance_score: 78, exposure: 78, approval: 28, sentiment: "stable", mention_count_24h: 0, mention_count_7d: 0, is_active: true, auto_created: false, created_at: "", updated_at: "" },
  { id: "p4", name: "Yolanda Díaz",             party: "Sumar",         party_color: "#D81E5B", role: "Vicepresidenta segunda",       bio: "Ministra de Trabajo y líder de Sumar.", source: "manual", relevance_score: 74, exposure: 74, approval: 36, sentiment: "down",   mention_count_24h: 0, mention_count_7d: 0, is_active: true, auto_created: false, created_at: "", updated_at: "" },
  { id: "p5", name: "Isabel Díaz Ayuso",        party: "PP",            party_color: "#1F77FF", role: "Presidenta CAM",               bio: "Presidenta de la Comunidad de Madrid.", source: "manual", relevance_score: 88, exposure: 88, approval: 45, sentiment: "up",     mention_count_24h: 0, mention_count_7d: 0, is_active: true, auto_created: false, created_at: "", updated_at: "" },
  { id: "p6", name: "Carles Puigdemont",        party: "Junts",         party_color: "#00C2A8", role: "Presidente",                   bio: "Expresidente de la Generalitat.", source: "manual", relevance_score: 71, exposure: 71, approval: 22, sentiment: "stable", mention_count_24h: 0, mention_count_7d: 0, is_active: true, auto_created: false, created_at: "", updated_at: "" },
];

function SentimentIcon({ s }: { s: string }) {
  if (s === "up")   return <TrendingUp className="w-3.5 h-3.5 text-green1" />;
  if (s === "down") return <TrendingDown className="w-3.5 h-3.5 text-red1" />;
  return <Minus className="w-3.5 h-3.5 text-text2" />;
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map(p => p[0] || "").join("").toUpperCase();
}

export default function ActoresPage() {
  const [view, setView] = useState<"directory" | "graph">("directory");
  const [parties, setParties] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: actors = ACTORS_FALLBACK, isLoading, isFetching } = useQuery({
    queryKey: ["actors", { search }],
    queryFn: () => endpoints.actors.list({ search: search || undefined, limit: 150 }),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    placeholderData: ACTORS_FALLBACK,
  });

  const discoveryMut = useMutation({
    mutationFn: () => endpoints.actors.triggerDiscovery(48, 3),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["actors"] });
      qc.invalidateQueries({ queryKey: ["actor-graph"] });
    },
  });

  const toggleParty = (p: string) =>
    setParties(parties.includes(p) ? parties.filter(x => x !== p) : [...parties, p]);

  const filtered = useMemo(() => {
    return actors.filter(a => {
      if (parties.length && a.party && !parties.includes(a.party)) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [actors, parties, search]);

  const topRelevance = useMemo(
    () => [...actors].sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 5),
    [actors]
  );
  const autoDiscovered = useMemo(() => actors.filter(a => a.auto_created), [actors]);

  const partyCounts = useMemo(() => {
    return PARTIES.map(p => ({
      ...p,
      count: actors.filter(a => a.party === p.code).length,
    })).filter(p => p.count > 0);
  }, [actors]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <span className="label-cap">Inteligencia / Mapa de Actores</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Mapa de Actores</h1>
          <p className="text-text2 text-sm mt-1 flex items-center gap-2 flex-wrap">
            {actors.length} actores monitorizados
            {autoDiscovered.length > 0 && (
              <span className="badge badge-cyan">{autoDiscovered.length} auto-descubiertos</span>
            )}
            {isFetching && <RefreshCw className="inline w-3 h-3 animate-spin text-muted" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => discoveryMut.mutate()}
            disabled={discoveryMut.isPending}
            className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 text-amber1 ${discoveryMut.isPending ? "animate-pulse" : ""}`} />
            {discoveryMut.isPending ? "Buscando…" : "Descubrir figuras"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 rounded-md bg-cyan1 text-bg font-semibold text-sm flex items-center gap-2 hover:bg-cyan1/90 transition"
          >
            <Plus className="w-4 h-4" /> Añadir actor
          </button>
        </div>
      </header>

      {/* Discovery notification */}
      {discoveryMut.isSuccess && (discoveryMut.data?.created ?? 0) > 0 && (
        <div className="premium-card border-cyan1/30 bg-cyan1/5 flex items-center gap-3">
          <Zap className="w-4 h-4 text-cyan1 shrink-0" />
          <p className="text-sm text-cyan1">
            {discoveryMut.data!.created} nueva{discoveryMut.data!.created !== 1 ? "s figuras detectadas" : " figura detectada"} y añadida{discoveryMut.data!.created !== 1 ? "s" : ""} al directorio
            {discoveryMut.data!.relations?.relations_upserted > 0 && <> · {discoveryMut.data!.relations.relations_upserted} relaciones recalculadas</>}.
          </p>
        </div>
      )}
      {discoveryMut.isSuccess && (discoveryMut.data?.created ?? 0) === 0 && (
        <div className="premium-card border-border1 bg-bg3/30 flex items-center gap-3">
          <Zap className="w-4 h-4 text-text2 shrink-0" />
          <p className="text-sm text-text2">
            Sin nuevas figuras detectadas. Mentions ingestadas: {discoveryMut.data?.ingest?.mentions_inserted ?? 0} · Relaciones: {discoveryMut.data?.relations?.relations_upserted ?? 0}
          </p>
        </div>
      )}

      {/* Top relevance strip */}
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">
          Mayor relevancia esta semana
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-3 h-32 rounded-lg animate-pulse bg-bg3/30"/>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {topRelevance.map(a => (
              <div
                key={a.id}
                onClick={() => setSelectedActor(a.id)}
                className="p-3 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/40 transition cursor-pointer"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2"
                  style={{ background: `linear-gradient(135deg, ${a.party_color}, #00D4FF)` }}
                >
                  {initials(a.name)}
                </div>
                <div className="text-sm font-semibold text-text1 leading-tight">{a.name}</div>
                <div className="text-[10px] uppercase text-muted mt-0.5">{a.party ?? "—"}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-cyan1 font-mono text-xs">{Math.round(a.relevance_score)}</span>
                  <SentimentIcon s={a.sentiment}/>
                  {a.mention_count_24h > 0 && (
                    <span className="text-[9px] text-muted font-mono ml-auto">{a.mention_count_24h}m/24h</span>
                  )}
                </div>
                {a.auto_created && (
                  <div className="mt-1.5">
                    <span className="badge badge-cyan text-[9px]">Auto</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* View toggle */}
      <div className="border-b border-border1 flex gap-1">
        {[
          { id: "directory" as const, label: "Directorio", icon: Users },
          { id: "graph"     as const, label: "Red de relaciones", icon: Network },
        ].map(t => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`px-4 py-2.5 -mb-px text-sm flex items-center gap-2 border-b-2 transition ${
                active ? "border-cyan1 text-cyan1 font-semibold" : "border-transparent text-text2 hover:text-text1"
              }`}
            >
              <Icon className="w-4 h-4"/> {t.label}
            </button>
          );
        })}
      </div>

      {/* DIRECTORY VIEW */}
      {view === "directory" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <section className="lg:col-span-3 space-y-4">
            <div className="premium-card space-y-3">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-cyan1 shrink-0"/>
                <input
                  type="text"
                  placeholder="Buscar actor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {PARTIES.map(p => (
                  <button
                    key={p.code}
                    onClick={() => toggleParty(p.code)}
                    className={`text-xs px-3 py-1 rounded-full border transition ${
                      parties.includes(p.code)
                        ? "border-cyan1 bg-cyan1/10 text-cyan1"
                        : "border-border1 text-text2 hover:border-cyan1/40"
                    }`}
                    style={parties.includes(p.code) ? {} : { borderLeftColor: p.color, borderLeftWidth: 3 }}
                  >
                    {p.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => <div key={i} className="premium-card h-40 animate-pulse bg-bg3/30"/>)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="premium-card text-center py-12 text-text2">
                <Users className="w-8 h-8 text-muted mx-auto mb-2"/>
                No hay actores con los filtros actuales.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedActor(a.id)}
                    className="premium-card hover:border-cyan1/40 transition cursor-pointer group text-left w-full"
                    style={{ borderLeftColor: a.party_color, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${a.party_color}, #3B82F6)` }}
                      >
                        {initials(a.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition truncate flex items-center gap-2">
                          {a.name}
                          {a.auto_created && <span className="badge badge-cyan text-[9px] shrink-0">Auto</span>}
                        </div>
                        <div className="text-[10px] uppercase text-muted">{a.party ?? "—"}</div>
                      </div>
                    </div>
                    <div className="text-xs text-text2 mb-1">{a.role ?? "—"}</div>
                    <div className="text-[11px] text-muted mb-3 line-clamp-1">{a.bio ?? ""}</div>
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[10px] text-muted mb-0.5">
                          <span>Relevancia</span>
                          <span className="text-cyan1 font-mono">{Math.round(a.relevance_score)}</span>
                        </div>
                        <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan1 to-blue1"
                               style={{ width: `${Math.min(100, a.relevance_score)}%`, transition: "width 600ms ease" }}/>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 text-text2">
                          <SentimentIcon s={a.sentiment}/>
                          <span className="font-mono">{Math.round(a.approval)}% aprob.</span>
                        </div>
                        <span className="text-cyan1 hover:underline flex items-center gap-0.5 text-xs">
                          Dossier <ChevronRight className="w-3 h-3"/>
                        </span>
                      </div>
                      {a.mention_count_24h > 0 && (
                        <div className="text-[10px] text-muted">
                          {a.mention_count_24h} menciones 24h · {a.mention_count_7d} esta semana
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="premium-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">Por partido</h3>
              <ul className="space-y-2">
                {partyCounts.map(p => (
                  <li key={p.code} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}/>
                      <span className="text-text1">{p.code}</span>
                    </div>
                    <span className="text-muted font-mono">{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="premium-card">
              <Users className="w-4 h-4 text-cyan1 mb-2"/>
              <div className="text-2xl font-bold text-text1">{actors.length}</div>
              <div className="text-[11px] text-muted">Actores monitorizados</div>
              {autoDiscovered.length > 0 && (
                <div className="mt-1 text-[10px] text-cyan1">{autoDiscovered.length} auto-descubiertos</div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* GRAPH VIEW */}
      {view === "graph" && (
        <ActorGraph onNodeClick={(id) => setSelectedActor(id)}/>
      )}

      {/* Slide-in detail panel */}
      {selectedActor && (
        <ActorDetailPanel
          actorId={selectedActor}
          onClose={() => setSelectedActor(null)}
        />
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddActorModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["actors"] });
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
