"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home, Newspaper, Users, AlertTriangle, FileText, Building2,
  Globe, MessageSquare, Briefcase, Brain, Workflow, Search,
  Settings, GitBranch, Database, Shield, Activity, Map
} from "lucide-react";

interface NavGroup {
  label: string;
  items: Array<{ href: string; label: string; icon: typeof Home; badge?: string }>;
  defaultOpen?: boolean;
}

const NAV: NavGroup[] = [
  {
    label: "Inteligencia",
    defaultOpen: true,
    items: [
      { href: "/",            label: "Inicio",             icon: Home },
      { href: "/briefings",   label: "Briefings",          icon: FileText },
      { href: "/actores",     label: "Mapa de Actores",    icon: Users },
      { href: "/medios",      label: "Medios & Narrativa", icon: Newspaper },
      { href: "/alertas",     label: "Alertas",            icon: AlertTriangle },
      { href: "/riesgo",      label: "Termómetro Riesgo",  icon: Activity }
    ]
  },
  {
    label: "Operaciones",
    defaultOpen: true,
    items: [
      { href: "/legislativo", label: "Monitor Legislativo", icon: Building2 },
      { href: "/coalicion",   label: "Gobierno & Coalición", icon: GitBranch },
      { href: "/propensity",  label: "Propensity & Swing",  icon: Map },
      { href: "/geopolitica", label: "Geopolítica & RRII",  icon: Globe },
      { href: "/comms",       label: "Communication Intel", icon: MessageSquare },
      { href: "/draft",       label: "Draft Studio",        icon: FileText },
      { href: "/workspace",   label: "Centro Operaciones",  icon: Briefcase }
    ]
  },
  {
    label: "Laboratorio",
    defaultOpen: false,
    items: [
      { href: "/brain",       label: "Politeia Brain",     icon: Brain },
      { href: "/workflows",   label: "Workflows",          icon: Workflow },
      { href: "/buscar",      label: "Búsqueda Global",    icon: Search },
      { href: "/memoria",     label: "Memoria del WS",     icon: Database },
      { href: "/integraciones", label: "Integraciones",    icon: Shield },
      { href: "/settings",    label: "Preferencias",       icon: Settings }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] shrink-0 border-r border-border1 bg-bg2 flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border1">
        <div className="flex items-baseline gap-2">
          <span className="text-cyan1 text-2xl font-black tracking-tight">POLITEIA</span>
          <span className="text-text2 text-xs">Intelligence</span>
        </div>
        <div className="text-muted text-[10px] mt-1 uppercase tracking-widest">v3.0 — Platform</div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map(group => (
          <div key={group.label} className="mb-4">
            <div className="px-5 mb-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-cyan1/80">
              {group.label}
            </div>
            <ul className="space-y-0.5 px-2">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150",
                        active
                          ? "bg-cyan1/10 text-cyan1 border-l-2 border-cyan1"
                          : "text-text2 hover:text-text1 hover:bg-bg3 border-l-2 border-transparent"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="badge badge-cyan text-[10px]">{item.badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border1 text-muted text-xs">
        <div>Modo: <span className="text-green1">Producción</span></div>
        <div className="text-[10px] mt-1">© 2026 Politeia</div>
      </div>
    </aside>
  );
}
