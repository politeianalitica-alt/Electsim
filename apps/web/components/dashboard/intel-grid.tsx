"use client";

import { AlertTriangle, Newspaper, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

const ALERTS = [
  { title: "Caída PP en sondeos territoriales", level: "high", source: "Motor nowcasting", time: "hace 40 min" },
  { title: "Narrativa vivienda en pico mediático", level: "medium", source: "Narrative Engine", time: "hace 1 h" },
  { title: "Bloqueo Junts en comisión Justicia", level: "high", source: "Monitor legislativo", time: "hace 2 h" },
  { title: "Volumen positivo VOX en RRSS", level: "low", source: "Social listening", time: "hace 3 h" }
];

const STORIES = [
  { title: "TC admite a trámite el recurso del PP contra la amnistía", source: "El País", score: 0.92 },
  { title: "Sumar exige acelerar la reforma del IRPF", source: "elDiario.es", score: 0.81 },
  { title: "VOX rompe gobierno en una nueva CCAA", source: "ABC", score: 0.78 },
  { title: "BdE revisa al alza el PIB 2026", source: "Cinco Días", score: 0.74 },
  { title: "Investigación judicial alto cargo Moncloa", source: "OK Diario", score: 0.69 }
];

const NARRATIVES = [
  { label: "Crisis vivienda asequible", velocity: "up", action: "Mensaje de respuesta con propuestas concretas" },
  { label: "Lawfare contra el gobierno", velocity: "up", action: "Vigilar amplificación + contra-frame" },
  { label: "Pactos PP-VOX en CCAA", velocity: "stable", action: "Monitorizar tensiones internas" },
  { label: "Reforma fiscal pendiente", velocity: "up", action: "Analizar movimientos de Sumar" }
];

function levelClass(level: string) {
  if (level === "critical" || level === "high") return "bg-red1";
  if (level === "medium") return "bg-amber1";
  return "bg-blue1";
}

function velocityArrow(v: string) {
  if (v === "up") return { symbol: "▲", color: "text-red1" };
  if (v === "down") return { symbol: "▼", color: "text-green1" };
  return { symbol: "→", color: "text-text2" };
}

export function IntelGrid() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[.14em] text-cyan1">Centro de inteligencia</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Alertas */}
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber1" />
              <h3 className="text-sm font-bold text-text1">Alertas activas</h3>
            </div>
            <span className="badge badge-amber">{ALERTS.length}</span>
          </div>
          <ul className="space-y-3">
            {ALERTS.map((a, i) => (
              <li key={i} className="flex gap-3 group">
                <span className={`w-1 rounded-full self-stretch ${levelClass(a.level)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text1 font-medium leading-snug group-hover:text-cyan1 transition truncate">
                    {a.title}
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                    <span>{a.source}</span>
                    <span>·</span>
                    <span>{a.time}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/alertas" className="mt-4 inline-flex items-center gap-1 text-xs text-cyan1 hover:underline">
            Ver todas las alertas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Top Stories */}
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-cyan1" />
              <h3 className="text-sm font-bold text-text1">Top noticias</h3>
            </div>
            <span className="badge badge-cyan">selección editorial</span>
          </div>
          <ul className="space-y-2.5">
            {STORIES.map((s, i) => (
              <li key={i} className="group cursor-pointer">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted">{s.source}</span>
                  <span className="text-[10px] font-mono text-cyan1">{(s.score * 100).toFixed(0)}</span>
                </div>
                <div className="text-sm text-text1 leading-snug group-hover:text-cyan1 transition">
                  {s.title}
                </div>
                <div className="mt-1 h-0.5 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${s.score * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <Link href="/medios" className="mt-4 inline-flex items-center gap-1 text-xs text-cyan1 hover:underline">
            Monitor de medios <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Narrativas */}
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple1" />
              <h3 className="text-sm font-bold text-text1">Narrativas activas</h3>
            </div>
            <span className="badge bg-purple1/15 text-purple1 border border-purple1/30">{NARRATIVES.length}</span>
          </div>
          <ul className="space-y-3">
            {NARRATIVES.map((n, i) => {
              const v = velocityArrow(n.velocity);
              return (
                <li key={i} className="group">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm ${v.color} font-bold`}>{v.symbol}</span>
                    <span className="text-sm text-text1 font-medium group-hover:text-cyan1 transition truncate">
                      {n.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-text2 ml-6">{n.action}</div>
                </li>
              );
            })}
          </ul>
          <Link href="/medios#narrativas" className="mt-4 inline-flex items-center gap-1 text-xs text-cyan1 hover:underline">
            Tracker de narrativas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
