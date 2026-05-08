"use client";

import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ChevronLeft, TrendingUp, TrendingDown, Minus, Network,
  Newspaper, Tag, AlertTriangle, RefreshCw,
} from "lucide-react";
import { endpoints, type PersonaPublica, type PersonaGrafo, type PersonaMencion } from "@/lib/api/endpoints";

// Mapa partido → color
const PARTY_COLORS: Record<string, string> = {
  PSOE: "#E03A3E", PP: "#1F77FF", VOX: "#5BC035", Sumar: "#D81E5B",
  Junts: "#00C2A8", ERC: "#F4B400", PNV: "#1D8042", Bildu: "#A4D65E",
  Podemos: "#6E2A78", Independiente: "#94A3B8",
};

const TABS = [
  { id: "grafo",       label: "Red de relaciones", icon: Network },
  { id: "menciones",   label: "Menciones recientes", icon: Newspaper },
  { id: "narrativas",  label: "Narrativas asociadas", icon: Tag },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ActorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<TabId>("grafo");

  // Personas — el endpoint /personas devuelve lista, así que cogemos la primera con ese id
  // (no hay /personas/{id} singular en el backend actual, fallback a search)
  const personaQ = useQuery<PersonaPublica | null>({
    queryKey: ["persona", id],
    queryFn: async () => {
      try {
        return await endpoints.intelligence.persona(id);
      } catch {
        // Fallback: buscar en lista
        const list = await endpoints.intelligence.personasList({ limit: 200 });
        return list.find(p => String(p.id) === String(id)) ?? null;
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const grafoQ = useQuery<PersonaGrafo | null>({
    queryKey: ["persona", id, "grafo"],
    queryFn: () => endpoints.intelligence.personaGrafo(id, 2).catch(() => null),
    staleTime: 5 * 60_000,
    enabled: tab === "grafo",
  });

  const mencionesQ = useQuery<PersonaMencion[]>({
    queryKey: ["persona", id, "menciones"],
    queryFn: () => endpoints.intelligence.personaMenciones(id, 20).catch(() => []),
    staleTime: 2 * 60_000,
    enabled: tab === "menciones",
  });

  const persona = personaQ.data;
  const partyColor = PARTY_COLORS[persona?.partido ?? ""] ?? "#94A3B8";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/actores" className="text-xs text-cyan1 hover:underline flex items-center gap-1 w-fit">
          <ChevronLeft className="w-3 h-3"/> Mapa de Actores
        </Link>
      </div>

      {personaQ.isLoading ? (
        <div className="premium-card animate-pulse h-40 bg-bg3/30"/>
      ) : personaQ.isError || !persona ? (
        <div className="premium-card text-center py-12">
          <AlertTriangle className="w-8 h-8 text-amber1 mx-auto mb-2"/>
          <p className="text-text2 text-sm">Actor no encontrado.</p>
          <button onClick={() => personaQ.refetch()} className="mt-3 px-3 py-1.5 text-xs rounded bg-cyan1 text-bg font-semibold">Reintentar</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* Profile card */}
          <aside className="premium-card space-y-4" style={{ borderLeftColor: partyColor, borderLeftWidth: 3 }}>
            <div className="flex items-start gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                style={{ background: `linear-gradient(135deg, ${partyColor}, #3B82F6)` }}
              >
                {persona.nombre_completo.split(" ").slice(0, 2).map(p => p[0] || "").join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-text1 leading-tight">{persona.nombre_completo}</h1>
                <p className="text-sm text-text2">{persona.cargo_actual ?? "—"}</p>
                <div className="text-[10px] uppercase text-muted mt-1">{persona.partido ?? "—"}</div>
              </div>
            </div>

            {/* Sentiment + influencia gauges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="kpi-card">
                <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Influencia</div>
                <div className="text-2xl font-bold text-cyan1">{Math.round(persona.score_influencia ?? 0)}</div>
                <div className="mt-2 h-1 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${Math.min(100, persona.score_influencia ?? 0)}%` }}/>
                </div>
              </div>
              <div className="kpi-card">
                <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Sentimiento</div>
                <div className="text-2xl font-bold flex items-center gap-1.5"
                     style={{ color: (persona.sentimiento_actual ?? 0) > 0 ? "#16A34A" : (persona.sentimiento_actual ?? 0) < 0 ? "#EF4444" : "#9CA3AF" }}>
                  {(persona.sentimiento_actual ?? 0) > 0 ? "+" : ""}{(persona.sentimiento_actual ?? 0).toFixed(2)}
                  <SentimentIcon dir={persona.tendencia_sentimiento}/>
                </div>
                <div className="text-[10px] text-muted mt-1">{persona.tendencia_sentimiento ?? "estable"}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Riesgo reputacional</div>
              <div className="text-xl font-bold" style={{ color: (persona.score_riesgo ?? 0) > 60 ? "#EF4444" : (persona.score_riesgo ?? 0) > 30 ? "#F59E0B" : "#10B981" }}>
                {Math.round(persona.score_riesgo ?? 0)}/100
              </div>
            </div>

            {persona.ambito && <div className="text-xs text-muted">Ámbito: <span className="text-text2">{persona.ambito}</span></div>}
            {persona.tipo && <div className="text-xs text-muted">Tipo: <span className="text-text2">{persona.tipo}</span></div>}
          </aside>

          {/* Tabs section */}
          <main>
            <div className="border-b border-border1 flex gap-1 mb-4">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-4 py-2.5 -mb-px text-sm flex items-center gap-2 border-b-2 transition ${
                      active ? "border-cyan1 text-cyan1 font-semibold" : "border-transparent text-text2 hover:text-text1"
                    }`}
                  >
                    <Icon className="w-4 h-4"/> {t.label}
                  </button>
                );
              })}
            </div>

            {tab === "grafo" && <GrafoTab data={grafoQ.data} loading={grafoQ.isLoading} error={grafoQ.isError}/>}
            {tab === "menciones" && <MencionesTab data={mencionesQ.data ?? []} loading={mencionesQ.isLoading} error={mencionesQ.isError}/>}
            {tab === "narrativas" && <NarrativasTab persona={persona}/>}
          </main>
        </div>
      )}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function GrafoTab({ data, loading, error }: { data: PersonaGrafo | null | undefined; loading: boolean; error: boolean }) {
  if (loading) return <div className="premium-card h-40 animate-pulse bg-bg3/30"/>;
  if (error || !data) return <ErrorBox text="Sin grafo disponible para este actor."/>;

  // Group edges by tipo_relacion (label)
  const grouped: Record<string, typeof data.edges> = {};
  data.edges.forEach(e => {
    const key = e.label || "relacionado";
    grouped[key] = grouped[key] || [];
    grouped[key].push(e);
  });

  // Build node lookup
  const nodeById = Object.fromEntries(data.nodes.map(n => [n.id, n]));

  return (
    <div className="space-y-4">
      <div className="premium-card">
        <div className="text-xs text-muted mb-2 flex items-center gap-2">
          <Network className="w-3.5 h-3.5 text-cyan1"/>
          {data.nodes.length} nodos · {data.edges.length} relaciones
        </div>
        {Object.entries(grouped).length === 0 ? (
          <p className="text-text2 text-sm">Sin relaciones registradas.</p>
        ) : (
          Object.entries(grouped).map(([relType, edges]) => (
            <div key={relType} className="mb-3 last:mb-0">
              <div className="text-[10px] uppercase tracking-wider text-cyan1 font-bold mb-1.5">{relType} ({edges.length})</div>
              <div className="space-y-1.5">
                {edges.slice(0, 8).map(e => {
                  const targetNode = nodeById[e.target] || nodeById[e.source];
                  const label = (targetNode as any)?.label ?? targetNode?.id ?? e.target;
                  const w = Math.min(1, (e.weight ?? 0.5));
                  return (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="text-text1 truncate flex-1">{label}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <div className="w-16 h-1 bg-bg3 rounded overflow-hidden">
                          <div className="h-full bg-cyan1" style={{ width: `${w * 100}%` }}/>
                        </div>
                        <span className="text-muted font-mono w-8 text-right">{(w * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MencionesTab({ data, loading, error }: { data: PersonaMencion[]; loading: boolean; error: boolean }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="premium-card h-16 animate-pulse bg-bg3/30"/>)}</div>;
  if (error || data.length === 0) return <ErrorBox text="Sin menciones recientes."/>;

  return (
    <ul className="space-y-2">
      {data.map(m => (
        <li key={m.id} className="premium-card hover:border-cyan1/40 transition cursor-pointer group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted">{m.source ?? "—"}</div>
              <div className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug">{m.title}</div>
              {m.summary && <p className="text-xs text-text2 mt-1 line-clamp-2">{m.summary}</p>}
            </div>
            {m.sentiment && (
              <span className={`badge shrink-0 ${
                m.sentiment === "positivo" ? "badge-green" :
                m.sentiment === "negativo" ? "badge-red" :
                "badge-blue"
              }`}>{m.sentiment}</span>
            )}
          </div>
          {m.url && (
            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan1 hover:underline mt-1 inline-block">
              Ver fuente →
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function NarrativasTab({ persona }: { persona: PersonaPublica }) {
  // Sin endpoint específico de narrativas-por-persona, mostramos placeholder con tipo
  const tags = [persona.tipo, persona.partido, persona.ambito].filter(Boolean) as string[];
  return (
    <div className="premium-card">
      <p className="text-text2 text-sm mb-3">
        Narrativas detectadas en torno a <strong className="text-text1">{persona.nombre_completo}</strong> en las últimas semanas.
      </p>
      {tags.length === 0 ? (
        <p className="text-muted text-xs">Sin narrativas asociadas todavía.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map(t => (
            <span key={t} className="badge badge-cyan">{t}</span>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted mt-3 italic">
        El endpoint dedicado de narrativas-por-actor está pendiente. Por ahora se muestran los tags primarios.
      </p>
    </div>
  );
}

function SentimentIcon({ dir }: { dir?: string }) {
  if (dir === "ascendente" || dir === "up") return <TrendingUp className="w-4 h-4 text-green1"/>;
  if (dir === "descendente" || dir === "down") return <TrendingDown className="w-4 h-4 text-red1"/>;
  return <Minus className="w-4 h-4 text-text2"/>;
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="premium-card text-center py-8 text-text2 text-sm">{text}</div>
  );
}
