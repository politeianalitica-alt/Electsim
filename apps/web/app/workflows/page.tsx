"use client";

import { useState } from "react";
import {
  Workflow,
  Clock,
  PlayCircle,
  FileText,
  Megaphone,
  Vote,
  Search,
  CalendarDays,
  Mic,
  TrendingUp,
  Users,
  ChevronRight
} from "lucide-react";

type WF = {
  id: string;
  name: string;
  category: string;
  time: string;
  description: string;
  icon: any;
};

const WORKFLOWS: WF[] = [
  { id: "1", name: "Briefing rápido", category: "briefings", time: "5 min", description: "Resumen ejecutivo de prensa, alertas y agenda del día.", icon: FileText },
  { id: "2", name: "Respuesta a crisis", category: "comms", time: "10 min", description: "Plan reactivo en tiempo real ante un evento de alto impacto.", icon: Megaphone },
  { id: "3", name: "Crear dossier de actor", category: "intelligence", time: "15 min", description: "Perfil completo: trayectoria, declaraciones, red, exposición.", icon: Users },
  { id: "4", name: "Plan de respuesta a narrativa", category: "comms", time: "8 min", description: "Detección, framing y mensajes clave para neutralizar narrativa adversa.", icon: Mic },
  { id: "5", name: "Planificación semanal", category: "planning", time: "20 min", description: "Calendario integrado de votaciones, comparecencias y comunicaciones.", icon: CalendarDays },
  { id: "6", name: "Preparación rueda de prensa", category: "comms", time: "15 min", description: "Argumentario, Q&A previsibles y mensajes pivote.", icon: Mic },
  { id: "7", name: "Simulación electoral", category: "electoral", time: "10 min", description: "Escenarios D'Hondt con ajuste de hipótesis demoscópicas.", icon: Vote },
  { id: "8", name: "Plan outreach stakeholders", category: "planning", time: "12 min", description: "Mapeo y secuencia de contactos institucionales priorizados.", icon: TrendingUp }
];

const CATEGORIES = [
  { code: "all", label: "Todos" },
  { code: "briefings", label: "Briefings" },
  { code: "comms", label: "Comunicación" },
  { code: "electoral", label: "Electoral" },
  { code: "intelligence", label: "Inteligencia" },
  { code: "planning", label: "Planificación" }
];

const ACTIVE = [
  { id: "a1", name: "Crear dossier de actor", actor: "Pedro Sánchez", progress: 65, eta: "5 min" },
  { id: "a2", name: "Plan de respuesta a narrativa", actor: "Vivienda asequible", progress: 30, eta: "6 min" }
];

export default function WorkflowsPage() {
  const [cat, setCat] = useState("all");
  const filtered = WORKFLOWS.filter(w => cat === "all" || w.category === cat);

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Operaciones / Workflows</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Workflows guiados</h1>
        <p className="text-text2 text-sm mt-1">Procedimientos asistidos por IA con estructura, plantillas y validaciones humanas.</p>
      </header>

      {/* Filter bar */}
      <section className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button
            key={c.code}
            onClick={() => setCat(c.code)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              cat === c.code
                ? "border-cyan1 bg-cyan1/10 text-cyan1"
                : "border-border1 text-text2 hover:border-cyan1/40"
            }`}
          >
            {c.label}
          </button>
        ))}
      </section>

      {/* Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map(w => {
          const Icon = w.icon;
          return (
            <div key={w.id} className="premium-card hover:border-cyan1/40 transition group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-cyan1/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-cyan1" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                  <Clock className="w-3 h-3" />
                  {w.time}
                </span>
              </div>
              <h3 className="text-sm font-bold text-text1 mb-1.5 group-hover:text-cyan1 transition">{w.name}</h3>
              <p className="text-xs text-text2 leading-relaxed flex-1 mb-4">{w.description}</p>
              <button className="inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded border border-cyan1/40 text-cyan1 hover:bg-cyan1/10 transition w-full">
                <PlayCircle className="w-3.5 h-3.5" />
                Iniciar
              </button>
            </div>
          );
        })}
      </section>

      {/* Active workflows */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-4">
          <Workflow className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Tus workflows en curso</h2>
        </div>
        {ACTIVE.length === 0 ? (
          <div className="text-center py-6 text-text2 text-sm">
            <Search className="w-8 h-8 mx-auto mb-2 text-muted" />
            No tienes workflows activos.
          </div>
        ) : (
          <ul className="space-y-3">
            {ACTIVE.map(a => (
              <li key={a.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition">{a.name}</div>
                    <div className="text-[11px] text-muted">Sobre: {a.actor}</div>
                  </div>
                  <span className="text-[10px] text-amber1 shrink-0">ETA {a.eta}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${a.progress}%` }} />
                  </div>
                  <span className="text-cyan1 font-mono text-xs">{a.progress}%</span>
                  <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
