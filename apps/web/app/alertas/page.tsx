"use client";

import { useState } from "react";
import { AlertTriangle, Filter, Check, ArrowUpRight } from "lucide-react";

const DEMO_ALERTS = [
  { id: "1", title: "Caída PP en sondeos territoriales", body: "Tres sondeos consecutivos muestran erosión en mayores de 55 años en Cataluña y País Vasco.", level: "high", source: "Motor nowcasting v2.3", time: "hace 40 min", read: false, category: "electoral" },
  { id: "2", title: "Narrativa de vivienda alcanza pico mediático", body: "Crecimiento sostenido +18% sin moderación visible. Volumen total 1.842 menciones en 24h.", level: "medium", source: "Narrative Engine", time: "hace 1 h", read: false, category: "media" },
  { id: "3", title: "Bloqueo Junts en comisión de Justicia", body: "Riesgo de obstrucción legislativa en comisión esta semana. 3 votaciones críticas en juego.", level: "high", source: "Monitor legislativo", time: "hace 2 h", read: false, category: "legislativo" },
  { id: "4", title: "Volumen positivo VOX en RRSS detectado", body: "Pico de menciones favorables en plataformas X e Instagram tras intervención de Abascal.", level: "low", source: "Social listening", time: "hace 3 h", read: true, category: "media" },
  { id: "5", title: "Recurso amnistía admitido por TC", body: "Implicaciones legales en próximas votaciones de la coalición.", level: "critical", source: "Monitor judicial", time: "hace 5 h", read: false, category: "legal" },
  { id: "6", title: "Datos paro abril mejor de lo esperado", body: "Variación -0.3pp respecto a marzo. Oportunidad comunicacional para gobierno.", level: "low", source: "Macro pipeline", time: "hace 8 h", read: true, category: "economico" }
];

const FILTERS = ["Todas", "Críticas", "Altas", "Medias", "Bajas", "Sin leer"];

function levelClasses(level: string) {
  if (level === "critical") return { bar: "bg-red1", text: "text-red1", badge: "badge-red", label: "CRÍTICA" };
  if (level === "high") return { bar: "bg-red1/70", text: "text-red1", badge: "badge-red", label: "ALTA" };
  if (level === "medium") return { bar: "bg-amber1", text: "text-amber1", badge: "badge-amber", label: "MEDIA" };
  return { bar: "bg-blue1", text: "text-blue1", badge: "badge-blue", label: "BAJA" };
}

export default function AlertasPage() {
  const [filter, setFilter] = useState("Todas");
  const filtered = DEMO_ALERTS.filter(a => {
    if (filter === "Todas") return true;
    if (filter === "Sin leer") return !a.read;
    return a.level.toLowerCase() === filter.toLowerCase().slice(0, -1) ||
      (filter === "Críticas" && a.level === "critical") ||
      (filter === "Altas" && a.level === "high") ||
      (filter === "Medias" && a.level === "medium") ||
      (filter === "Bajas" && a.level === "low");
  });

  const unread = DEMO_ALERTS.filter(a => !a.read).length;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Bandeja operativa</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Alertas</h1>
          <p className="text-text2 text-sm mt-1">{unread} sin leer · {DEMO_ALERTS.length} totales · priorizadas por riesgo</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Marcar todas leídas
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-muted shrink-0" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${
              filter === f ? "bg-cyan1 text-bg font-semibold" : "bg-bg3 text-text2 hover:text-text1 border border-border1"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map(a => {
          const cls = levelClasses(a.level);
          return (
            <article key={a.id} className={`premium-card cursor-pointer hover:border-cyan1/30 ${a.read ? "opacity-70" : ""}`}>
              <div className="flex gap-4">
                <span className={`w-1 self-stretch rounded-full ${cls.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`badge ${cls.badge}`}>{cls.label}</span>
                    <span className="badge bg-bg3 text-text2 border border-border1 text-[10px]">{a.category}</span>
                    {!a.read && <span className="w-1.5 h-1.5 rounded-full bg-cyan1 animate-pulse" />}
                    <span className="text-[10px] text-muted ml-auto">{a.time}</span>
                  </div>
                  <h3 className="text-base font-bold text-text1 mb-1">{a.title}</h3>
                  <p className="text-sm text-text2 leading-relaxed">{a.body}</p>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-muted">Fuente: {a.source}</span>
                    <div className="flex gap-3">
                      <button className="text-cyan1 hover:underline">Investigar</button>
                      <button className="text-cyan1 hover:underline">Añadir a workspace</button>
                      <button className="text-cyan1 hover:underline flex items-center gap-1">Detalle <ArrowUpRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
