"use client";

import { useState } from "react";
import { Briefcase, Plus, MessageCircle, FileText, Users, CheckSquare, Activity } from "lucide-react";

const TABS = [
  { id: "panorama", label: "Panorama", icon: Activity },
  { id: "issues", label: "Issues", icon: CheckSquare },
  { id: "evidence", label: "Evidence wall", icon: FileText },
  { id: "actions", label: "Acciones", icon: CheckSquare },
  { id: "decisions", label: "Decisiones", icon: MessageCircle },
  { id: "team", label: "Equipo", icon: Users }
];

const DEMO_ISSUES = [
  { title: "Ley de vivienda — riesgo bloqueo Junts", priority: "critical", assignee: "MR", status: "in_progress", deadline: "8 may" },
  { title: "Crisis comunicacional sondeos PP", priority: "high", assignee: "AL", status: "open", deadline: "6 may" },
  { title: "Plan reforma fiscal Sumar", priority: "medium", assignee: "JS", status: "open", deadline: "12 may" },
  { title: "Análisis pacto PP-VOX Galicia", priority: "low", assignee: "VG", status: "in_progress", deadline: "15 may" }
];

const DEMO_ACTIONS = [
  { title: "Preparar Q&A para entrevista TVE viernes", priority: "critical", deadline: "9 may", responsible: "Comunicación" },
  { title: "Reunión interna análisis sondeos territoriales", priority: "high", deadline: "7 may", responsible: "Analítica" },
  { title: "Briefing para socio de coalición", priority: "high", deadline: "8 may", responsible: "Estrategia" },
  { title: "Revisar marco legal amnistía", priority: "medium", deadline: "10 may", responsible: "Legal" }
];

const DEMO_DECISIONS = [
  { date: "5 may", title: "No responder al ataque de OK Diario sobre alto cargo", by: "Comité de comunicación", rationale: "Amplificaría narrativa rival." },
  { date: "4 may", title: "Activar mensaje sobre vivienda con propuestas concretas", by: "Estrategia", rationale: "Capturar agenda mediática antes que oposición." },
  { date: "3 may", title: "Aplazar reforma fiscal hasta cierre semestre", by: "Hacienda", rationale: "Mejor coyuntura macro tras datos IPC." }
];

const TEAM = [
  { initials: "AL", name: "Antonio López", role: "Senior Analyst", status: "active", workload: 4 },
  { initials: "MR", name: "María Ruiz", role: "Senior Analyst", status: "active", workload: 6 },
  { initials: "JS", name: "Javier Sanz", role: "Analyst", status: "in_meeting", workload: 3 },
  { initials: "VG", name: "Vera Gómez", role: "Junior Analyst", status: "active", workload: 2 }
];

function priorityClass(p: string) {
  if (p === "critical") return "badge-red";
  if (p === "high") return "badge-red";
  if (p === "medium") return "badge-amber";
  return "badge-blue";
}

export default function WorkspacePage() {
  const [tab, setTab] = useState("panorama");

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">War room operativo</span>
          <h1 className="text-3xl font-bold text-text1 mt-1 flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-cyan1" /> Workspace — España 2026
          </h1>
          <p className="text-text2 text-sm mt-1">Centro operativo del equipo · 4 issues abiertos · 12 acciones pendientes · 4 miembros activos</p>
        </div>
        <button className="px-4 py-2 rounded-md bg-cyan1 text-bg font-semibold flex items-center gap-2 hover:bg-cyan2 transition">
          <Plus className="w-4 h-4" /> Crear issue
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Issues abiertos</div>
          <div className="text-2xl font-bold text-amber1">{DEMO_ISSUES.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Acciones pendientes</div>
          <div className="text-2xl font-bold text-cyan1">{DEMO_ACTIONS.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Decisiones esta semana</div>
          <div className="text-2xl font-bold text-text1">{DEMO_DECISIONS.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Miembros activos</div>
          <div className="text-2xl font-bold text-green1">{TEAM.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border1 flex gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 -mb-px text-sm flex items-center gap-2 border-b-2 transition ${
                active ? "border-cyan1 text-cyan1 font-semibold" : "border-transparent text-text2 hover:text-text1"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "panorama" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="premium-card">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Issues prioritarios</h2>
            <ul className="space-y-3">
              {DEMO_ISSUES.map((iss, i) => (
                <li key={i} className="p-3 rounded-lg bg-bg/50 hover:bg-bg3 transition cursor-pointer">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <span className="text-sm text-text1 font-medium flex-1">{iss.title}</span>
                    <span className={`badge ${priorityClass(iss.priority)} shrink-0`}>{iss.priority}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text2">
                    <span className="w-5 h-5 rounded-full bg-cyan1/15 text-cyan1 text-[10px] font-bold flex items-center justify-center">{iss.assignee}</span>
                    <span>{iss.status}</span>
                    <span>·</span>
                    <span>vence {iss.deadline}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="premium-card">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Próximas acciones</h2>
            <ul className="space-y-3">
              {DEMO_ACTIONS.map((a, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg/50 hover:bg-bg3 transition cursor-pointer">
                  <span className={`badge ${priorityClass(a.priority)} shrink-0`}>{a.priority}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text1">{a.title}</div>
                    <div className="text-xs text-text2 mt-0.5">{a.responsible} · vence {a.deadline}</div>
                  </div>
                  <button className="text-xs text-cyan1 hover:underline shrink-0">Completar</button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === "decisions" && (
        <section className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Decision log</h2>
          <ul className="space-y-4">
            {DEMO_DECISIONS.map((d, i) => (
              <li key={i} className="border-l-2 border-cyan1 pl-4 pb-2">
                <div className="text-xs text-cyan1 font-mono mb-1">{d.date}</div>
                <h3 className="text-base font-bold text-text1 mb-1">{d.title}</h3>
                <div className="text-xs text-text2 mb-1">Decidido por: {d.by}</div>
                <p className="text-sm text-text2">{d.rationale}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "team" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEAM.map(m => (
            <div key={m.initials} className="premium-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan1 to-blue1 flex items-center justify-center font-bold text-bg">
                {m.initials}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-text1">{m.name}</div>
                <div className="text-xs text-text2">{m.role}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-green1" : "bg-amber1"}`} />
                  <span className="text-[10px] text-text2">{m.status === "active" ? "Activo" : "En reunión"}</span>
                  <span className="text-[10px] text-muted ml-auto">{m.workload} tareas</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {(tab === "issues" || tab === "evidence" || tab === "actions") && (
        <section className="premium-card">
          <p className="text-text2 text-center py-12">Vista detallada de {tab} — disponible en versión completa.</p>
        </section>
      )}
    </div>
  );
}
