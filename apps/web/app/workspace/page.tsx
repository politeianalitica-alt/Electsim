"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Plus, MessageCircle, FileText, Users, CheckSquare, Activity, Archive, Calendar, Download } from "lucide-react";

const INTEL_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";

interface Workspace {
  id: string;
  name: string;
  issue_count?: number;
  pending_actions?: number;
  decisions_this_week?: number;
  team_members?: number;
}
interface BriefingArchive {
  id?: string;
  date?: string;
  title?: string;
  type?: string;
  workspace?: string;
}

async function downloadBriefingPDF(id: string): Promise<boolean> {
  try {
    const r = await fetch(`${INTEL_BASE}/api/briefings/${id}/pdf`);
    if (!r.ok) return false;
    const data: { url?: string; bytes_b64?: string } = await r.json();
    if (data.bytes_b64) {
      const bytes = Uint8Array.from(atob(data.bytes_b64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `briefing-${id}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
    if (data.url) { window.open(data.url, "_blank"); return true; }
  } catch { /* ignore */ }
  return false;
}

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
  const [selectedWs, setSelectedWs] = useState<string>("ws_espana_2026");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => fetch(`${INTEL_BASE}/api/workspaces`).then(r => r.json())
      .catch(() => [{ id: "ws_espana_2026", name: "España 2026", issue_count: 4, pending_actions: 12, decisions_this_week: 3, team_members: 4 }]),
    staleTime: 5 * 60_000,
  });

  const { data: wsOverview } = useQuery<Workspace | null>({
    queryKey: ["workspace", "overview", selectedWs],
    queryFn: () => fetch(`${INTEL_BASE}/api/workspaces/${selectedWs}/overview`).then(r => r.json())
      .catch(() => null),
    enabled: !!selectedWs,
    staleTime: 60_000,
  });

  const { data: briefingsList = [] } = useQuery<BriefingArchive[]>({
    queryKey: ["briefings", "list-workspace"],
    queryFn: () => fetch(`${INTEL_BASE}/api/briefings`).then(r => r.json()).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    await downloadBriefingPDF(id);
    setDownloadingId(null);
  };

  const liveOverview: Workspace = wsOverview ?? {
    id: selectedWs, name: "España 2026", issue_count: 4, pending_actions: 12, decisions_this_week: 3, team_members: 4,
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="label-cap">War room operativo</span>
          <h1 className="text-3xl font-bold text-text1 mt-1 flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-cyan1" /> Workspace — {liveOverview.name}
          </h1>
          <p className="text-text2 text-sm mt-1">
            Centro operativo · {liveOverview.issue_count ?? 0} issues abiertos · {liveOverview.pending_actions ?? 0} acciones pendientes · {liveOverview.team_members ?? 0} miembros
          </p>
        </div>
        <button className="px-4 py-2 rounded-md bg-cyan1 text-bg font-semibold flex items-center gap-2 hover:bg-cyan2 transition">
          <Plus className="w-4 h-4" /> Crear issue
        </button>
      </header>

      {/* Workspace selector */}
      {workspaces.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setSelectedWs(ws.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                selectedWs === ws.id
                  ? "border-cyan1 bg-cyan1/10 text-cyan1"
                  : "border-border1 text-text2 hover:border-cyan1/40"
              }`}
            >
              {ws.name}
            </button>
          ))}
        </div>
      )}

      {/* KPI bar from live overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Asuntos activos</div>
          <div className="text-3xl font-bold text-text1 font-mono">{liveOverview.issue_count ?? 0}</div>
          {(liveOverview.issue_count ?? 0) > 0 && <div className="badge badge-cyan mt-1.5">activos</div>}
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Acciones pendientes</div>
          <div className="text-3xl font-bold text-text1 font-mono">{liveOverview.pending_actions ?? 0}</div>
          {(liveOverview.pending_actions ?? 0) > 0 && <div className="badge badge-amber mt-1.5">por completar</div>}
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Decisiones (semana)</div>
          <div className="text-3xl font-bold text-text1 font-mono">{liveOverview.decisions_this_week ?? 0}</div>
          {(liveOverview.decisions_this_week ?? 0) > 0 && <div className="badge badge-green mt-1.5">tomadas</div>}
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Miembros del equipo</div>
          <div className="text-3xl font-bold text-text1 font-mono">{liveOverview.team_members ?? 0}</div>
          <div className="badge badge-blue mt-1.5">activos</div>
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

      {/* Archivo de Briefings */}
      <section className="premium-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 flex items-center gap-2">
            <Archive className="w-4 h-4 text-cyan1"/>
            Archivo de Briefings
          </h2>
          <span className="text-xs text-text2">{briefingsList.length} disponibles</span>
        </div>
        {briefingsList.length === 0 ? (
          <div className="text-center py-8">
            <span className="badge badge-cyan">No hay briefings archivados</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-text2 border-b border-border1">
                <tr>
                  <th className="text-left py-2 font-medium">Fecha</th>
                  <th className="text-left py-2 font-medium">Tipo</th>
                  <th className="text-left py-2 font-medium">Workspace</th>
                  <th className="text-left py-2 font-medium">Título</th>
                  <th className="text-right py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {briefingsList.map(b => {
                  const id = b.id ?? "";
                  const dateLabel = b.date
                    ? new Date(b.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
                    : "—";
                  return (
                    <tr key={id} className="border-b border-border1/50 hover:bg-bg3 transition">
                      <td className="py-2.5 text-text1 font-mono">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-cyan1"/>
                          {dateLabel}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {b.type && <span className="badge badge-cyan">{b.type}</span>}
                      </td>
                      <td className="py-2.5">
                        <span className="badge badge-blue">{b.workspace ?? "default"}</span>
                      </td>
                      <td className="py-2.5 text-text1">{b.title ?? "Briefing matinal"}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button className="px-2.5 py-1 text-[10px] rounded border border-border1 text-text2 hover:border-cyan1 hover:text-cyan1 transition">
                            Ver
                          </button>
                          <button
                            onClick={() => id && handleDownload(id)}
                            disabled={!id || downloadingId === id}
                            className="px-2.5 py-1 text-[10px] rounded border border-border1 text-text2 hover:border-cyan1 hover:text-cyan1 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Download className="w-2.5 h-2.5"/>
                            {downloadingId === id ? "…" : "PDF"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
