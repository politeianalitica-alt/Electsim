"use client";

import { useState, useRef, useEffect } from "react";
import { Search, FileText, Users, AlertTriangle, Newspaper, Building2, Globe, Clock, ArrowRight, X } from "lucide-react";

const RESULT_TYPES = [
  { id: "all",        label: "Todo" },
  { id: "briefings",  label: "Briefings" },
  { id: "actores",    label: "Actores" },
  { id: "alertas",    label: "Alertas" },
  { id: "medios",     label: "Medios" },
  { id: "legislativo",label: "Legislativo" },
  { id: "docs",       label: "Documentos" }
];

interface Result {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  date: string;
  href: string;
  icon: typeof FileText;
}

const DEMO_RESULTS: Result[] = [
  { id: "1", type: "briefings",   title: "Briefing matinal — Reforma fiscal y respuesta PP",        excerpt: "El PP anuncia enmiendas a la reforma del IRPF mientras el Gobierno defiende el impacto distributivo de la medida...", date: "Hoy, 08:00", href: "/briefings", icon: FileText },
  { id: "2", type: "actores",     title: "Alberto Núñez Feijóo — Perfil completo",                  excerpt: "Líder del PP desde abril 2022. Ex-presidente de la Xunta de Galicia (2009-2022). Estilo pragmático...", date: "Actualizado ayer", href: "/actores", icon: Users },
  { id: "3", type: "alertas",     title: "ALERTA ALTA: Tensión en bloque de investidura",           excerpt: "Junts exige reunión urgente con La Moncloa antes del viernes. Amenaza con retirar apoyo a decreto ómnibus...", date: "Hace 2 h", href: "/alertas", icon: AlertTriangle },
  { id: "4", type: "medios",      title: "El País: Gobierno presenta plan de estabilidad",      excerpt: "El plan reduce el déficit al 2,8% del PIB para 2026. Oposición critica el calendario de consolidación...", date: "Hace 4 h", href: "/medios", icon: Newspaper },
  { id: "5", type: "legislativo", title: "Reforma Ley Vivienda — Tramitación en comisión",          excerpt: "La ponencia aprueba 12 enmiendas. VOX y PP votan en contra. Sumar logra incluir tope de alquiler de lujo...", date: "Ayer", href: "/legislativo", icon: Building2 },
  { id: "6", type: "actores",     title: "Pedro Sánchez — Actividad reciente",                      excerpt: "Agenda de la semana: reunión bilateral con Macron (lunes), sesión de control en el Congreso (miércoles)...", date: "Actualizado hoy", href: "/actores", icon: Users },
  { id: "7", type: "docs",        title: "Informe interno: Análisis de coalición para 2027",        excerpt: "Escenario base: PSOE + Sumar + PNV = 176 escaños. Escenario alternativo requiere apoyo de Junts...", date: "Hace 3 días", href: "/workspace", icon: FileText },
  { id: "8", type: "medios",      title: "ABC: Oposición pide comisión de investigación",       excerpt: "El PP registra la solicitud de comisión de investigación sobre la gestión de los fondos de cohesión...", date: "Hace 6 h", href: "/medios", icon: Newspaper },
  { id: "9", type: "briefings",   title: "Briefing especial — Cumbre europea Barcelona",            excerpt: "España acogerá la próxima cumbre del Consejo Europeo. Agenda: migración, defensa y competitividad...", date: "Hace 2 días", href: "/briefings", icon: FileText },
  { id: "10", type: "alertas",    title: "ALERTA MEDIA: Convocatoria huelga sector sanitario",      excerpt: "Los sindicatos de enfermería anuncian huelga indefinida si no hay acuerdo en 10 días sobre ratios...", date: "Ayer", href: "/alertas", icon: AlertTriangle }
];

const RECENT = ["reforma fiscal", "Feijóo investidura", "coalición Junts", "reforma vivienda"];

const TYPE_COLOR: Record<string, string> = {
  briefings: "text-cyan1 bg-cyan1/10",
  actores: "text-blue1 bg-blue1/10",
  alertas: "text-red1 bg-red1/10",
  medios: "text-purple1 bg-purple1/10",
  legislativo: "text-amber1 bg-amber1/10",
  docs: "text-green1 bg-green1/10"
};

export default function BuscarPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = async (q = query) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearched(false);
    await new Promise(r => setTimeout(r, 500));
    const res = DEMO_RESULTS.filter(r =>
      r.title.toLowerCase().includes(q.toLowerCase()) ||
      r.excerpt.toLowerCase().includes(q.toLowerCase()) ||
      q.length > 2
    );
    setResults(res);
    setSearching(false);
    setSearched(true);
  };

  const filtered = filter === "all" ? results : results.filter(r => r.type === filter);

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(re, `<mark class="bg-cyan1/20 text-cyan1 rounded px-0.5">$1</mark>`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header>
        <span className="label-cap">Knowledge Base</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Búsqueda Global</h1>
        <p className="text-text2 text-sm mt-1">Busca en briefings, actores, alertas, legislativo, medios y documentos del workspace.</p>
      </header>

      {/* Barra de búsqueda */}
      <section className="premium-card">
        <div className="relative flex items-center gap-3">
          <Search className="absolute left-4 w-5 h-5 text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Buscar actores, alertas, briefings, legislativo..."
            className="w-full pl-11 pr-12 py-3.5 bg-bg3 border border-border1 rounded-lg text-text1 text-base placeholder-muted focus:border-cyan1 focus:outline-none transition"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
              className="absolute right-12 text-muted hover:text-text1 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => search()}
            disabled={searching || !query.trim()}
            className="absolute right-3 px-3 py-1.5 rounded bg-cyan1 text-bg text-xs font-bold hover:bg-cyan2 transition disabled:opacity-50"
          >
            {searching ? "..." : "Buscar"}
          </button>
        </div>

        {/* Búsquedas recientes */}
        {!searched && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> Recientes:</span>
            {RECENT.map(r => (
              <button
                key={r}
                onClick={() => { setQuery(r); search(r); }}
                className="text-xs px-2.5 py-1 rounded-full bg-bg3 border border-border1 text-text2 hover:text-text1 hover:border-cyan1/40 transition"
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Filtros */}
      {searched && (
        <div className="flex items-center gap-1 flex-wrap">
          {RESULT_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === t.id
                  ? "bg-cyan1 text-bg"
                  : "bg-bg3 border border-border1 text-text2 hover:text-text1"
              }`}
            >
              {t.label}
              {t.id !== "all" && (
                <span className="ml-1 opacity-60">
                  {results.filter(r => r.type === t.id).length}
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Resultados */}
      {searching && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-cyan1/30 border-t-cyan1 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text2 text-sm">Buscando en todas las fuentes...</p>
        </div>
      )}

      {searched && !searching && filtered.length === 0 && (
        <div className="premium-card text-center py-12">
          <Search className="w-12 h-12 text-cyan1/20 mx-auto mb-3" />
          <p className="text-text1 font-medium">Sin resultados para "{query}"</p>
          <p className="text-text2 text-sm mt-1">Prueba con otros términos o amplía los filtros.</p>
        </div>
      )}

      {searched && !searching && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(r => {
            const Icon = r.icon;
            return (
              <a
                key={r.id}
                href={r.href}
                className="premium-card flex items-start gap-4 cursor-pointer group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[r.type] || "bg-bg3 text-text2"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge text-[10px] ${TYPE_COLOR[r.type] || ""}`}>
                      {RESULT_TYPES.find(t => t.id === r.type)?.label || r.type}
                    </span>
                    <span className="text-muted text-xs">{r.date}</span>
                  </div>
                  <h3
                    className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug"
                    dangerouslySetInnerHTML={{ __html: highlight(r.title) }}
                  />
                  <p
                    className="text-xs text-text2 mt-1 leading-relaxed line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: highlight(r.excerpt) }}
                  />
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-cyan1 transition shrink-0 mt-1" />
              </a>
            );
          })}
        </div>
      )}

      {!searched && !searching && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Briefings", icon: FileText, href: "/briefings", desc: "Últimos análisis diarios", color: "text-cyan1" },
            { label: "Actores", icon: Users, href: "/actores", desc: "24 perfiles activos", color: "text-blue1" },
            { label: "Alertas", icon: AlertTriangle, href: "/alertas", desc: "Bandeja de inteligencia", color: "text-red1" },
            { label: "Medios", icon: Newspaper, href: "/medios", desc: "Top stories y narrativas", color: "text-purple1" },
            { label: "Legislativo", icon: Building2, href: "/legislativo", desc: "Iniciativas en tramitación", color: "text-amber1" },
            { label: "Geopolítica", icon: Globe, href: "/geopolitica", desc: "Eventos globales", color: "text-green1" }
          ].map(s => {
            const Icon = s.icon;
            return (
              <a key={s.label} href={s.href} className="premium-card flex items-start gap-3 cursor-pointer group">
                <Icon className={`w-5 h-5 mt-0.5 ${s.color} shrink-0`} />
                <div>
                  <div className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition">{s.label}</div>
                  <div className="text-xs text-text2 mt-0.5">{s.desc}</div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
