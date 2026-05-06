"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import type { DataMode } from "@/lib/types/status";

const DOMAIN_LABELS: Record<string, string> = {
  electoral: "Electoral",
  legislative: "Legislativo",
  media: "Medios",
  economic: "Económico",
  regulatory: "Reguladores",
  geopolitical: "Geopolítica",
  osint: "OSINT",
  territorial: "Territorial",
  contracts: "Contratación",
  workspace: "Workspace",
  system: "Sistema",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400",
  degraded: "text-amber-400",
  down: "text-red-400",
  unknown: "text-zinc-500",
  disabled: "text-zinc-600",
};

export default function FuentesPage() {
  const qc = useQueryClient();
  const [domainFilter, setDomainFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showProblems, setShowProblems] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<unknown>(null);

  const healthQ = useQuery({
    queryKey: ["sources-health", domainFilter, statusFilter],
    queryFn: () => endpoints.sourcesHealth({
      domain: domainFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const coverageQ = useQuery({
    queryKey: ["sources-coverage"],
    queryFn: () => endpoints.sourcesCoverage(),
  });

  const runsQ = useQuery({
    queryKey: ["sources-runs"],
    queryFn: () => endpoints.sourcesRuns(30),
  });

  const runMutation = useMutation({
    mutationFn: (sourceId: string) =>
      endpoints.sourcesRun({ source_id: sourceId, dry_run: true, limit: 100 }),
    onSuccess: (data) => {
      setLastRunResult(data);
      qc.invalidateQueries({ queryKey: ["sources-runs"] });
    },
  });

  const runAllMutation = useMutation({
    mutationFn: () => endpoints.sourcesRunAllDry(),
    onSuccess: (data) => {
      setLastRunResult(data);
    },
  });

  const items = healthQ.data?.items ?? [];
  const summary = healthQ.data?.summary;
  const globalMode = (healthQ.data?.mode ?? "fallback") as DataMode;

  const filtered = items.filter((item) => {
    if (showProblems && !["degraded", "down", "unknown"].includes(item.health.status)) return false;
    if (search && !item.definition.name.toLowerCase().includes(search.toLowerCase()) &&
        !item.definition.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Fuentes & Ingesta</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Estado operativo de las fuentes que alimentan la inteligencia política, regulatoria, mediática, económica y OSINT.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ModeBadge mode={globalMode} />
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["sources-health"] })}
            className="px-3 py-1.5 rounded text-xs border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Actualizar
          </button>
          <button
            onClick={() => runAllMutation.mutate()}
            disabled={runAllMutation.isPending}
            className="px-3 py-1.5 rounded text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white"
          >
            {runAllMutation.isPending ? "Verificando..." : "Dry-run global"}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard label="Total" value={summary.total} />
          <KpiCard label="Activas" value={summary.active} color="text-green-400" />
          <KpiCard label="Degradadas" value={summary.degraded} color="text-amber-400" />
          <KpiCard label="Caídas" value={summary.down} color="text-red-400" />
          <KpiCard label="Sin datos" value={summary.unknown} color="text-zinc-500" />
          <KpiCard label="Registros 24h" value={items.reduce((s, i) => s + i.health.records_24h, 0)} />
          <KpiCard
            label="Calidad media"
            value={(() => {
              const scores = items.map(i => i.health.quality_score).filter((v): v is number => v !== null);
              return scores.length ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100)}%` : "—";
            })()}
          />
        </div>
      )}

      {/* Coverage grid */}
      {coverageQ.data?.domains && coverageQ.data.domains.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Cobertura por dominio</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {coverageQ.data.domains.map((d) => (
              <button
                key={d.domain}
                onClick={() => setDomainFilter(domainFilter === d.domain ? "" : d.domain)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  domainFilter === d.domain
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/50"
                }`}
              >
                <p className="text-xs text-zinc-400 mb-1">{DOMAIN_LABELS[d.domain] ?? d.domain}</p>
                <p className="text-lg font-bold text-white">{d.total}</p>
                <div className="flex gap-1 mt-1">
                  {d.active > 0 && <span className="text-[9px] text-green-400">{d.active} activas</span>}
                  {(d.degraded + d.down) > 0 && (
                    <span className="text-[9px] text-amber-400">{d.degraded + d.down} issues</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Buscar fuente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 w-48"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
        >
          <option value="">Todo estado</option>
          <option value="active">Activa</option>
          <option value="degraded">Degradada</option>
          <option value="down">Caída</option>
          <option value="unknown">Sin datos</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showProblems}
            onChange={(e) => setShowProblems(e.target.checked)}
            className="rounded"
          />
          Solo problemas
        </label>
        {(domainFilter || statusFilter || search || showProblems) && (
          <button
            onClick={() => { setDomainFilter(""); setStatusFilter(""); setSearch(""); setShowProblems(false); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Sources table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          {healthQ.isLoading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Cargando fuentes...</div>
          ) : healthQ.isError ? (
            <div className="p-8 text-center text-red-400 text-sm">
              Error al cargar fuentes. El backend puede no estar activo.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No hay fuentes con los filtros seleccionados.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left py-2 px-3 text-zinc-500 text-xs font-medium">Fuente</th>
                  <th className="text-left py-2 px-3 text-zinc-500 text-xs font-medium">Dominio</th>
                  <th className="text-left py-2 px-3 text-zinc-500 text-xs font-medium">Tipo</th>
                  <th className="text-left py-2 px-3 text-zinc-500 text-xs font-medium">Estado</th>
                  <th className="text-left py-2 px-3 text-zinc-500 text-xs font-medium">Último éxito</th>
                  <th className="text-right py-2 px-3 text-zinc-500 text-xs font-medium">24h</th>
                  <th className="text-right py-2 px-3 text-zinc-500 text-xs font-medium">Calidad</th>
                  <th className="text-left py-2 px-3 text-zinc-500 text-xs font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.definition.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="py-2 px-3">
                      <div>
                        <p className="text-white text-xs font-medium">{item.definition.name}</p>
                        <p className="text-zinc-600 text-[10px] font-mono">{item.definition.id}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-zinc-400 text-xs">{DOMAIN_LABELS[item.definition.domain] ?? item.definition.domain}</td>
                    <td className="py-2 px-3 text-zinc-500 text-[10px] font-mono">{item.definition.mode}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs font-medium ${STATUS_COLORS[item.health.status] ?? "text-zinc-400"}`}>
                        {item.health.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-zinc-500 text-xs">
                      {item.health.last_success_at
                        ? new Date(item.health.last_success_at).toLocaleDateString("es-ES")
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-300 text-xs">{item.health.records_24h}</td>
                    <td className="py-2 px-3 text-right text-xs">
                      {item.health.quality_score !== null
                        ? <span className="text-zinc-300">{Math.round((item.health.quality_score ?? 0) * 100)}%</span>
                        : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => runMutation.mutate(item.definition.id)}
                        disabled={runMutation.isPending}
                        className="px-2 py-1 text-[10px] rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-40"
                      >
                        Dry-run
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Run result panel */}
      {(lastRunResult || runMutation.data) && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Resultado de ingesta</h3>
          <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(runMutation.data ?? lastRunResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Recent runs */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Últimos runs</h2>
        {runsQ.isLoading ? (
          <p className="text-zinc-600 text-sm">Cargando historial...</p>
        ) : !runsQ.data?.items?.length ? (
          <p className="text-zinc-600 text-sm">
            Sin historial de runs. Los runs aparecerán aquí cuando se ejecuten pipelines.
          </p>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left py-2 px-3 text-zinc-500">ID</th>
                  <th className="text-left py-2 px-3 text-zinc-500">Fuente</th>
                  <th className="text-left py-2 px-3 text-zinc-500">Estado</th>
                  <th className="text-left py-2 px-3 text-zinc-500">Dry-run</th>
                  <th className="text-right py-2 px-3 text-zinc-500">Nuevos</th>
                  <th className="text-left py-2 px-3 text-zinc-500">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {runsQ.data.items.slice(0, 20).map((run) => (
                  <tr key={run.run_id} className="border-b border-zinc-800/50">
                    <td className="py-1.5 px-3 font-mono text-zinc-600">{run.run_id}</td>
                    <td className="py-1.5 px-3 text-zinc-300">{run.source_id}</td>
                    <td className="py-1.5 px-3">
                      <span className={
                        run.status === "success" ? "text-green-400" :
                        run.status === "error" ? "text-red-400" :
                        run.status === "skipped" ? "text-zinc-500" : "text-amber-400"
                      }>{run.status}</span>
                    </td>
                    <td className="py-1.5 px-3 text-zinc-500">{run.dry_run ? "si" : "no"}</td>
                    <td className="py-1.5 px-3 text-right text-zinc-300">{run.records_new}</td>
                    <td className="py-1.5 px-3 text-zinc-500 max-w-xs truncate">{run.message || run.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color = "text-white" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
