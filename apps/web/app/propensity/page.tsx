"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map, Target, RefreshCw, AlertTriangle } from "lucide-react";
import { endpoints, type SwingDistrict, type PropensityOportunidad } from "@/lib/api/endpoints";

const PARTIDOS = ["PP", "PSOE", "VOX", "Sumar", "Junts", "ERC", "PNV"] as const;

type Tab = "swing" | "oportunidades";

export default function PropensityPage() {
  const [tab, setTab] = useState<Tab>("swing");
  const [partidoA, setPartidoA] = useState<string>("PP");
  const [partidoB, setPartidoB] = useState<string>("PSOE");
  const [partido, setPartido] = useState<string>("PP");

  // Swing districts
  const swingQ = useQuery({
    queryKey: ["propensity", "swing", partidoA, partidoB],
    queryFn: () => endpoints.intelligence.swingDistricts(partidoA.toLowerCase(), partidoB.toLowerCase(), 50),
    enabled: tab === "swing",
    staleTime: 10 * 60_000,
    retry: 1,
  });

  // Oportunidades
  const opQ = useQuery({
    queryKey: ["propensity", "oportunidades", partido],
    queryFn: () => endpoints.intelligence.propensityOportunidades(partido.toLowerCase(), 0.05),
    enabled: tab === "oportunidades",
    staleTime: 10 * 60_000,
    retry: 1,
  });

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Análisis Electoral / Propensity</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Propensity & Swing</h1>
        <p className="text-text2 text-sm mt-1">
          Secciones competitivas, oportunidades de campaña y simulación de escenarios.
        </p>
      </header>

      {/* Tabs */}
      <div className="border-b border-border1 flex gap-1">
        {[
          { id: "swing" as Tab,         label: "Swing Districts", icon: Map },
          { id: "oportunidades" as Tab, label: "Oportunidades",   icon: Target },
        ].map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 -mb-px text-sm flex items-center gap-2 border-b-2 transition ${
                active ? "border-cyan1 text-cyan1 font-semibold" : "border-transparent text-text2 hover:text-text1"
              }`}
            >
              <Icon className="w-4 h-4"/> {t.label}
            </button>
          );
        })}
      </div>

      {/* Swing Districts */}
      {tab === "swing" && (
        <div className="space-y-4">
          <section className="premium-card">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text2">Partido A:</span>
                <select
                  value={partidoA}
                  onChange={e => setPartidoA(e.target.value)}
                  className="bg-bg3 border border-border1 rounded px-3 py-1.5 text-sm text-text1 focus:border-cyan1 focus:outline-none"
                >
                  {PARTIDOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <span className="text-text2 text-sm">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text2">Partido B:</span>
                <select
                  value={partidoB}
                  onChange={e => setPartidoB(e.target.value)}
                  className="bg-bg3 border border-border1 rounded px-3 py-1.5 text-sm text-text1 focus:border-cyan1 focus:outline-none"
                >
                  {PARTIDOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-muted">
                {swingQ.isFetching && <RefreshCw className="w-3 h-3 animate-spin"/>}
                {swingQ.data && <span>{swingQ.data.length} secciones</span>}
              </div>
            </div>
          </section>

          {swingQ.isError ? (
            <ErrorCard onRetry={() => swingQ.refetch()} />
          ) : swingQ.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="premium-card h-32 animate-pulse bg-bg3/30"/>)}
            </div>
          ) : (swingQ.data ?? []).length === 0 ? (
            <EmptyCard text="Sin secciones competitivas detectadas para este par."/>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(swingQ.data ?? []).slice(0, 30).map((s: SwingDistrict, i: number) => {
                const a = (s as any)[partidoA.toLowerCase()] ?? s.pct_a ?? 0;
                const b = (s as any)[partidoB.toLowerCase()] ?? s.pct_b ?? 0;
                const margin = Math.abs(a - b);
                return (
                  <div key={i} className="premium-card hover:border-cyan1/40 transition cursor-pointer group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted uppercase tracking-wider truncate">{s.ccaa ?? s.provincia ?? "—"}</div>
                        <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition truncate">
                          {s.nombre ?? s.municipio ?? s.seccion_id}
                        </div>
                      </div>
                      <span className="badge badge-amber shrink-0">Swing</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <div className="text-muted mb-0.5">{partidoA}</div>
                        <div className="text-cyan1 font-mono">{(a * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted mb-0.5">{partidoB}</div>
                        <div className="text-cyan1 font-mono">{(b * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted mb-0.5">
                        <span>Margen</span>
                        <span className="font-mono">{(margin * 100).toFixed(1)}pp</span>
                      </div>
                      <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan1 to-blue1"
                          style={{ width: `${Math.min(100, (1 - margin) * 100)}%`, transition: "width 600ms ease" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Oportunidades */}
      {tab === "oportunidades" && (
        <div className="space-y-4">
          <section className="premium-card">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-text2">Partido:</span>
              <select
                value={partido}
                onChange={e => setPartido(e.target.value)}
                className="bg-bg3 border border-border1 rounded px-3 py-1.5 text-sm text-text1 focus:border-cyan1 focus:outline-none"
              >
                {PARTIDOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="ml-auto flex items-center gap-2 text-xs text-muted">
                {opQ.isFetching && <RefreshCw className="w-3 h-3 animate-spin"/>}
                {opQ.data && <span>{opQ.data.n_secciones} zonas con ROI positivo</span>}
              </div>
            </div>
          </section>

          {opQ.isError ? (
            <ErrorCard onRetry={() => opQ.refetch()} />
          ) : opQ.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="premium-card h-20 animate-pulse bg-bg3/30"/>)}
            </div>
          ) : (opQ.data?.secciones ?? []).length === 0 ? (
            <EmptyCard text="Sin oportunidades sobre el umbral 0.05."/>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(opQ.data?.secciones ?? []).slice(0, 30).map((s, i) => {
                const roi = s.roi ?? s.delta ?? 0;
                return (
                  <div key={i} className="premium-card hover:border-cyan1/40 transition cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted uppercase tracking-wider truncate">{s.ccaa ?? "—"}</div>
                        <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition truncate">
                          {s.municipio ?? s.seccion_id}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-muted">ROI campaña</div>
                        <div className={`font-mono font-bold ${roi >= 0 ? "text-cyan1" : "text-red1"}`}>
                          {roi >= 0 ? "+" : ""}{(roi * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan1 to-blue1"
                        style={{ width: `${Math.min(100, Math.abs(roi) * 500)}%`, transition: "width 600ms ease" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="premium-card flex items-center gap-3 py-6">
      <AlertTriangle className="w-5 h-5 text-amber1 shrink-0"/>
      <div className="flex-1">
        <div className="text-sm font-semibold text-text1">Error al cargar datos</div>
        <div className="text-xs text-muted">El backend de inteligencia no respondió. Reintenta o verifica la conexión.</div>
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 text-xs rounded bg-cyan1 text-bg font-semibold hover:bg-cyan2 transition"
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="premium-card text-center py-10">
      <p className="text-text2 text-sm">{text}</p>
    </div>
  );
}
