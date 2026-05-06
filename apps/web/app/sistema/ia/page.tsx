"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import type { DataMode } from "@/lib/types/status";

export default function IALocalPage() {
  const [testPrompt, setTestPrompt] = useState("¿Cuál es la situación política actual en España?");
  const [testTaskType, setTestTaskType] = useState("qna");
  const [embedText, setEmbedText] = useState("El Congreso de los Diputados aprobó ayer...");

  const statusQuery = useQuery({
    queryKey: ["brain-status"],
    queryFn: () => endpoints.brainStatus(),
    refetchInterval: 30_000,
  });

  const testMutation = useMutation({
    mutationFn: () =>
      endpoints.brainTest({ prompt: testPrompt, task_type: testTaskType }),
  });

  const embedMutation = useMutation({
    mutationFn: () => endpoints.brainEmbedTest({ text: embedText }),
  });

  const statusData = statusQuery.data;
  const mode: DataMode = (statusData?.mode as DataMode) ?? "fallback";
  const brain = statusData?.data;
  const routing = brain?.routing;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IA Local — Diagnóstico</h1>
          <p className="text-sm text-zinc-400 mt-1">Estado del motor de inteligencia artificial local (Ollama)</p>
        </div>
        <ModeBadge mode={mode} source={statusData?.source} />
      </div>

      {/* KPI cards row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Ollama" value={brain?.ollama_available ? "Activo" : "Inactivo"} ok={brain?.ollama_available} />
        <KpiCard label="Brain" value={brain?.brain_available ? "Disponible" : "No disponible"} ok={brain?.brain_available} />
        <KpiCard label="Modelo activo" value={brain?.active_model ?? "—"} />
      </div>

      {/* Environment variables */}
      <Section title="Variables de entorno">
        <table className="w-full text-sm">
          <tbody>
            {brain?.env &&
              Object.entries(brain.env).map(([key, val]) => (
                <tr key={key} className="border-b border-zinc-800">
                  <td className="py-2 pr-4 text-zinc-400 font-mono text-xs">{key}</td>
                  <td className="py-2 font-mono text-xs text-white">{val}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Section>

      {/* Routing table */}
      <Section title="Router de modelos (10 tipos de tarea)">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs border-b border-zinc-800">
              <th className="text-left py-2 pr-4">Tipo</th>
              <th className="text-left py-2 pr-4">Velocidad</th>
              <th className="text-left py-2 pr-4">Modelo</th>
              <th className="text-left py-2 pr-4">Timeout</th>
              <th className="text-left py-2">TTL caché</th>
            </tr>
          </thead>
          <tbody>
            {routing?.task_types &&
              Object.entries(routing.task_types).map(([type, cfg]) => (
                <tr key={type} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 pr-4 font-mono text-xs text-white">{type}</td>
                  <td className="py-2 pr-4">
                    <SpeedBadge speed={cfg.speed} />
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-300">{cfg.model}</td>
                  <td className="py-2 pr-4 text-xs text-zinc-400">{cfg.timeout}s</td>
                  <td className="py-2 text-xs text-zinc-400">{cfg.cache_ttl_seconds}s</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Section>

      {/* Brain test form */}
      <Section title="Test de prompt">
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={testTaskType}
              onChange={(e) => setTestTaskType(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
            >
              {["qna", "briefing", "classification", "extraction", "narrative_frame",
                "comms_strategy", "red_team", "deep_analysis", "evidence_check", "translation"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white resize-none"
          />
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white"
          >
            {testMutation.isPending ? "Procesando..." : "Ejecutar test"}
          </button>
          {testMutation.data && (
            <div className="rounded bg-zinc-800 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <ModeBadge mode={testMutation.data.mode as DataMode} />
                <span className="text-zinc-400 text-xs">{testMutation.data.data.elapsed_ms}ms</span>
                {testMutation.data.data.cached && <span className="text-xs text-amber-400">cached</span>}
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap">{testMutation.data.data.response ?? testMutation.data.data.error}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Embed test form */}
      <Section title="Test de embeddings">
        <div className="space-y-3">
          <textarea
            value={embedText}
            onChange={(e) => setEmbedText(e.target.value)}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white resize-none"
          />
          <button
            onClick={() => embedMutation.mutate()}
            disabled={embedMutation.isPending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded text-sm font-medium text-white"
          >
            {embedMutation.isPending ? "Generando..." : "Generar embedding"}
          </button>
          {embedMutation.data && (
            <div className="rounded bg-zinc-800 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <ModeBadge mode={embedMutation.data.mode as DataMode} />
                <span className="text-zinc-400 text-xs">{embedMutation.data.data.elapsed_ms}ms</span>
              </div>
              <p className="text-zinc-400">
                {embedMutation.data.data.success
                  ? `✓ Embedding generado con ${embedMutation.data.data.model} (${embedMutation.data.data.char_count} chars)`
                  : `✕ Error: ${embedMutation.data.data.error}`}
              </p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// Sub-components
function KpiCard({ label, value, ok }: { label: string; value: string | undefined; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${ok === true ? "text-green-400" : ok === false ? "text-red-400" : "text-white"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function SpeedBadge({ speed }: { speed: string }) {
  const colors: Record<string, string> = {
    fast: "bg-green-500/20 text-green-400",
    normal: "bg-blue-500/20 text-blue-400",
    deep: "bg-purple-500/20 text-purple-400",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${colors[speed] ?? "bg-zinc-700 text-zinc-300"}`}>
      {speed}
    </span>
  );
}
