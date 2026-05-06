"use client";

import Link from "next/link";
import {
  FileText, Users, Activity, Building2, GitBranch, AlertTriangle,
  Newspaper, Globe, MessageSquare, Briefcase, Brain, Workflow
} from "lucide-react";

const MODULES = [
  { href: "/briefings",   icon: FileText,       title: "Briefings",            desc: "Generar y exportar briefings premium" },
  { href: "/actores",     icon: Users,          title: "Mapa de Actores",      desc: "Ontología política y red de relaciones" },
  { href: "/riesgo",      icon: Activity,       title: "Termómetro Riesgo",    desc: "Score y alertas por dominio" },
  { href: "/legislativo", icon: Building2,      title: "Legislativo",          desc: "BOE, Congreso, iniciativas" },
  { href: "/coalicion",   icon: GitBranch,      title: "Coaliciones",          desc: "Simulador y kingmaker analysis" },
  { href: "/alertas",     icon: AlertTriangle,  title: "Alertas",              desc: "Bandeja priorizada y escalación" },
  { href: "/medios",      icon: Newspaper,      title: "Medios & Narrativa",   desc: "Top stories, fuentes, narrativas" },
  { href: "/geopolitica", icon: Globe,          title: "Geopolítica",          desc: "Eventos globales con impacto local" },
  { href: "/comms",       icon: MessageSquare,  title: "Communication Intel",  desc: "Strategy room para comunicación" },
  { href: "/workspace",   icon: Briefcase,      title: "Workspace",            desc: "War room operativo del equipo" },
  { href: "/brain",       icon: Brain,          title: "Politeia Brain",       desc: "Asistente IA con contexto" },
  { href: "/workflows",   icon: Workflow,       title: "Workflows",            desc: "Wizards guiados para tareas" }
];

export function ModuleGrid() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[.14em] text-cyan1">Acceso a módulos</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MODULES.map(m => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group bg-bg2 border border-border1 rounded-xl p-4 hover:border-cyan1/40 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-md bg-cyan1/10 border border-cyan1/20 flex items-center justify-center group-hover:bg-cyan1/20 transition">
                  <Icon className="w-4 h-4 text-cyan1" />
                </div>
                <span className="text-sm font-bold text-text1 group-hover:text-cyan1 transition">{m.title}</span>
              </div>
              <p className="text-xs text-text2 leading-relaxed">{m.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
