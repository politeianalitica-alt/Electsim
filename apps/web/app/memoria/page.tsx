"use client";

import { useState } from "react";
import { Database, FileText, MessageSquare, Search, Trash2, Tag, Clock, ChevronRight, Pin, Archive } from "lucide-react";

const MEMORY_ITEMS = [
  {
    id: "m1", type: "decision", pinned: true,
    title: "Estrategia de comunicación Q2 2026",
    summary: "Foco en economía doméstica (precio vivienda, inflación) y alejarse del debate identitario. Audiencia prioritaria: votantes urbanos 35-55 años.",
    tags: ["comunicación", "estrategia", "q2-2026"],
    date: "Hace 2 días", workspace: "España 2026"
  },
  {
    id: "m2", type: "analysis", pinned: true,
    title: "Análisis: Debilidades narrativas del PP en materia fiscal",
    summary: "El PP tiene un flanco abierto en el impuesto de sucesiones y en la propuesta de bajada del IRPF solo para rentas altas. Aprovechar diferenciación.",
    tags: ["PP", "fiscal", "contranarrativa"],
    date: "Hace 3 días", workspace: "España 2026"
  },
  {
    id: "m3", type: "brief", pinned: false,
    title: "Brief reunión con sindicatos sector sanitario",
    summary: "Reunión el 15/05. Demandas: ratio enfermera/paciente, jornada 35h, carrera profesional. No comprometer cifras sin consultar Hacienda.",
    tags: ["sanidad", "sindicatos", "reunión"],
    date: "Hace 4 días", workspace: "España 2026"
  },
  {
    id: "m4", type: "context", pinned: false,
    title: "Contexto: Posición de Junts sobre la ley de amnistía",
    summary: "Junts condiciona apoyo a la reforma de financiación catalana. Plazo implícito: antes de verano. Riesgo de ruptura si no hay avances concretos.",
    tags: ["Junts", "amnistía", "coalición"],
    date: "Hace 5 días", workspace: "España 2026"
  },
  {
    id: "m5", type: "decision", pinned: false,
    title: "Decisión: No entrar en debate sobre pacto de rentas",
    summary: "Evitar posicionamiento público hasta tener consenso interno. Respuesta oficial: 'estamos dialogando con todos los actores sociales'.",
    tags: ["rentas", "economía", "posicionamiento"],
    date: "Hace 1 semana", workspace: "España 2026"
  },
  {
    id: "m6", type: "analysis", pinned: false,
    title: "Perfil de riesgo: Moción de censura — escenarios",
    summary: "Probabilidad estimada de MC exitosa: 12% en escenario base. Disparo de riesgo si dos socios de investidura votan en contra en misma semana.",
    tags: ["riesgo", "moción", "estabilidad"],
    date: "Hace 1 semana", workspace: "España 2026"
  }
];

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  decision:  { label: "Decisión",  color: "text-cyan1 bg-cyan1/10 border-cyan1/20" },
  analysis:  { label: "Análisis",  color: "text-blue1 bg-blue1/10 border-blue1/20" },
  brief:     { label: "Brief",     color: "text-amber1 bg-amber1/10 border-amber1/20" },
  context:   { label: "Contexto",  color: "text-purple1 bg-purple1/10 border-purple1/20" }
};

const FILTER_TYPES = ["Todo", "Decisión", "Análisis", "Brief", "Contexto"];

export default function MemoriaPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todo");
  const [items, setItems] = useState(MEMORY_ITEMS);

  const togglePin = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, pinned: !i.pinned } : i));
  };

  const filtered = items.filter(i => {
    const matchQuery = !query || i.title.toLowerCase().includes(query.toLowerCase()) || i.summary.toLowerCase().includes(query.toLowerCase()) || i.tags.some(t => t.includes(query.toLowerCase()));
    const matchType = activeFilter === "Todo" || TYPE_CONFIG[i.type]?.label === activeFilter;
    return matchQuery && matchType;
  });

  const pinned = filtered.filter(i => i.pinned);
  const rest = filtered.filter(i => !i.pinned);

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Workspace Memory</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Memoria del Workspace</h1>
        <p className="text-text2 text-sm mt-1">Contexto persistente: decisiones, análisis, briefs y posicionamientos del equipo.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Entradas totales", value: items.length, icon: Database },
          { label: "Fijadas", value: items.filter(i => i.pinned).length, icon: Pin },
          { label: "Esta semana", value: 4, icon: Clock },
          { label: "Etiquetas activas", value: [...new Set(items.flatMap(i => i.tags))].length, icon: Tag }
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text2">{s.label}</span>
                <Icon className="w-4 h-4 text-muted" />
              </div>
              <div className="text-2xl font-bold text-text1">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar en la memoria..."
            className="w-full pl-9 pr-3 py-2 bg-bg3 border border-border1 rounded-md text-sm text-text1 placeholder-muted focus:border-cyan1 focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {FILTER_TYPES.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-2 rounded-md text-xs font-medium transition ${
                activeFilter === f ? "bg-cyan1 text-bg" : "bg-bg3 border border-border1 text-text2 hover:text-text1"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="px-3 py-2 rounded-md bg-cyan1/10 border border-cyan1/30 text-cyan1 text-xs font-medium hover:bg-cyan1/20 transition flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Nueva entrada
        </button>
      </div>

      {/* Fijadas */}
      {pinned.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-3.5 h-3.5 text-cyan1" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan1">Fijadas</span>
          </div>
          <div className="space-y-3">
            {pinned.map(item => <MemoryCard key={item.id} item={item} onPin={togglePin} />)}
          </div>
        </section>
      )}

      {/* Resto */}
      {rest.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-text2" />
              <span className="text-xs font-bold uppercase tracking-wider text-text2">Recientes</span>
            </div>
          )}
          <div className="space-y-3">
            {rest.map(item => <MemoryCard key={item.id} item={item} onPin={togglePin} />)}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="premium-card text-center py-12">
          <Database className="w-12 h-12 text-cyan1/20 mx-auto mb-3" />
          <p className="text-text1 font-medium">Sin entradas que coincidan</p>
          <p className="text-text2 text-sm mt-1">Prueba con otros términos o crea una nueva entrada.</p>
        </div>
      )}
    </div>
  );
}

function MemoryCard({ item, onPin }: { item: typeof MEMORY_ITEMS[0]; onPin: (id: string) => void }) {
  const cfg = TYPE_CONFIG[item.type];
  return (
    <div className="premium-card group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`badge text-[10px] border ${cfg.color}`}>{cfg.label}</span>
              <span className="text-muted text-xs">{item.date}</span>
              <span className="text-muted text-xs">· {item.workspace}</span>
            </div>
            <h3 className="text-sm font-semibold text-text1 leading-snug mb-2">{item.title}</h3>
            <p className="text-xs text-text2 leading-relaxed">{item.summary}</p>
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {item.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-bg3 border border-border1 text-muted">
                  <Tag className="w-2.5 h-2.5" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button onClick={() => onPin(item.id)} title={item.pinned ? "Desfijar" : "Fijar"} className="p-1.5 rounded hover:bg-bg3 transition">
            <Pin className={`w-3.5 h-3.5 ${item.pinned ? "text-cyan1" : "text-muted"}`} />
          </button>
          <button title="Ver detalle" className="p-1.5 rounded hover:bg-bg3 transition">
            <ChevronRight className="w-3.5 h-3.5 text-muted hover:text-text1" />
          </button>
          <button title="Archivar" className="p-1.5 rounded hover:bg-bg3 transition">
            <Archive className="w-3.5 h-3.5 text-muted hover:text-amber1" />
          </button>
        </div>
      </div>
    </div>
  );
}
