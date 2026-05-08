"use client";

import { useState } from "react";
import { MessageSquare, Send, Target, Shield, Megaphone, AlertTriangle, ChevronDown, XCircle, CheckCircle, Tv, Newspaper, Mail } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

const TABS = [
  { id: "strategy", label: "Estrategia", icon: Target },
  { id: "triangle", label: "Triángulo", icon: MessageSquare },
  { id: "counter",  label: "Contranarrativas", icon: Shield },
  { id: "redteam",  label: "Simulacro prensa", icon: AlertTriangle },
  { id: "guardian", label: "Guardián mensaje", icon: Shield },
  { id: "channels", label: "Mix de canales", icon: Megaphone }
];

export default function CommsPage() {
  const [tab, setTab] = useState("strategy");
  const [issue, setIssue] = useState("");
  const [audience, setAudience] = useState("ciudadanos");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (!issue.trim()) return;
    setBusy(true);
    try {
      const r = await endpoints.commsStrategy(issue, "", audience).catch(() => null);
      setResult(r || demoStrategy(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Communication intel</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Strategy Room</h1>
        <p className="text-text2 text-sm mt-1">Diagnóstico, framing, contranarrativa, red-team y mix de canales en una sola sala.</p>
      </header>

      {/* Input bar */}
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Issue / Asunto a gestionar</h2>
        <textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="Describe el asunto, crisis o iniciativa de comunicación..."
          rows={3}
          className="w-full px-4 py-3 bg-bg3 border border-border1 rounded-md text-text1 focus:border-cyan1 focus:outline-none placeholder-muted resize-none"
        />
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text2">Audiencia:</span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="bg-bg3 border border-border1 rounded px-3 py-1.5 text-sm text-text1 focus:border-cyan1 focus:outline-none"
            >
              <option value="ciudadanos">Ciudadanos</option>
              <option value="militantes">Militantes</option>
              <option value="medios">Medios</option>
              <option value="empresas">Empresas / sector</option>
              <option value="internacional">Internacional</option>
            </select>
          </div>
          <button
            onClick={run}
            disabled={busy || !issue.trim()}
            className="ml-auto px-4 py-2 rounded-md bg-cyan1 text-bg font-semibold disabled:opacity-50 hover:bg-cyan2 transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> {busy ? "Analizando..." : "Analizar estrategia"}
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-border1 flex gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 -mb-px text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                active ? "border-cyan1 text-cyan1 font-semibold" : "border-transparent text-text2 hover:text-text1"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {!result && !busy && (
        <div className="premium-card text-center py-12">
          <MessageSquare className="w-12 h-12 text-cyan1/30 mx-auto mb-3" />
          <p className="text-text2">Introduce un issue arriba y pulsa "Analizar estrategia" para empezar.</p>
        </div>
      )}

      {result && tab === "strategy" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Marco rival" body={result.rival_frame} accent="red" />
          <Card title="Nuestro marco" body={result.own_frame} accent="cyan" />
          <Card title="Mensaje central" body={result.central_message} accent="cyan" />
          <Card title="Canal recomendado" body={result.recommended_channel || "press_note"} accent="blue" />
          <section className="premium-card md:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan1 mb-3">Tres argumentos clave</h3>
            <ol className="space-y-3 list-decimal list-inside">
              {(result.three_arguments || []).map((arg: string, i: number) => (
                <li key={i} className="text-text1 text-sm">{arg}</li>
              ))}
            </ol>
          </section>
          <section className="premium-card md:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber1 mb-3">Lo que NO decir</h3>
            <ul className="space-y-1.5 text-sm text-text2">
              {(result.do_not_say || []).map((d: string, i: number) => (
                <li key={i} className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red1 shrink-0 mt-0.5"/> {d}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {result && tab === "redteam" && (
        <section className="premium-card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Preguntas hostiles esperables</h3>
          <ul className="space-y-4">
            {(result.hostile_questions || []).map((q: string, i: number) => (
              <li key={i} className="bg-bg/50 border border-amber1/30 rounded-lg p-4">
                <div className="text-amber1 text-sm font-semibold mb-2">P{i + 1}: {q}</div>
                <div className="text-text1 text-sm">
                  <span className="text-green1 font-semibold">R:</span>{" "}
                  {(result.answers && result.answers[i]) || "Respuesta sugerida pendiente de generación."}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result && tab === "triangle" && (
        <TriangleView result={result} audience={audience} />
      )}

      {result && tab === "counter" && (
        <CounterView result={result} />
      )}

      {result && tab === "guardian" && (
        <GuardianView result={result} />
      )}

      {result && tab === "channels" && (
        <ChannelsView result={result} />
      )}
    </div>
  );
}

// ── Triángulo: marcos en disposición triangular ────────────────────────────
function TriangleView({ result, audience }: { result: any; audience: string }) {
  const audienceLabels: Record<string, string> = {
    ciudadanos: "Ciudadanos", militantes: "Militantes", medios: "Medios",
    empresas: "Empresas / sector", internacional: "Internacional",
  };
  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Triángulo del marco comunicativo</h3>
      <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
        <div className="premium-card border-red1/30">
          <div className="text-xs font-bold uppercase tracking-wider text-red1 mb-2">Marco rival</div>
          <p className="text-text1 text-sm leading-relaxed">{result.rival_frame || "—"}</p>
        </div>
        <div className="premium-card border-cyan1/30">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan1 mb-2">Marco propio</div>
          <p className="text-text1 text-sm leading-relaxed">{result.own_frame || "—"}</p>
        </div>
      </div>
      <div className="mt-4 max-w-md mx-auto">
        <div className="premium-card border-amber1/30">
          <div className="text-xs font-bold uppercase tracking-wider text-amber1 mb-2">Audiencia objetivo</div>
          <p className="text-text1 text-sm">{audienceLabels[audience] ?? audience}</p>
          <p className="text-text2 text-xs mt-1">El marco propio debe optimizarse para esta audiencia.</p>
        </div>
      </div>
    </section>
  );
}

// ── Contranarrativas: lo que NO decir + argumentos counter ────────────────
function CounterView({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <section className="premium-card border-red1/30">
        <h3 className="text-sm font-bold uppercase tracking-wider text-red1 mb-3 flex items-center gap-2">
          <XCircle className="w-4 h-4"/> Lo que NO decir
        </h3>
        <ul className="space-y-2 text-sm text-text2">
          {(result.do_not_say || []).map((d: string, i: number) => (
            <li key={i} className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red1 shrink-0 mt-0.5"/>
              <span>{d}</span>
            </li>
          ))}
          {(result.do_not_say || []).length === 0 && <li className="text-muted text-xs italic">Sin restricciones específicas detectadas.</li>}
        </ul>
      </section>
      <section className="premium-card border-green1/30">
        <h3 className="text-sm font-bold uppercase tracking-wider text-green1 mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/> Contraargumentos clave
        </h3>
        <ul className="space-y-3">
          {(result.three_arguments || []).map((arg: string, i: number) => (
            <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg/50 border border-green1/20">
              <CheckCircle className="w-4 h-4 text-green1 shrink-0 mt-0.5"/>
              <span className="text-text1 text-sm">{arg}</span>
            </li>
          ))}
          {(result.three_arguments || []).length === 0 && <li className="text-muted text-xs italic">Sin contraargumentos disponibles.</li>}
        </ul>
      </section>
    </div>
  );
}

// ── Guardián mensaje: mensaje central destacado + pills do_not_say ────────
function GuardianView({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <section className="premium-card bg-cyan1/10 border-cyan1/30">
        <div className="text-xs uppercase tracking-wider text-cyan1 font-bold mb-2">Mensaje central</div>
        <p className="text-text1 text-base leading-relaxed">{result.central_message || "—"}</p>
      </section>
      <section className="premium-card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber1 mb-3">Bloqueos del guardián</h3>
        <p className="text-text2 text-xs mb-3">Ninguna pieza comunicativa debe contener estos enunciados:</p>
        <div className="flex flex-wrap gap-2">
          {(result.do_not_say || []).map((d: string, i: number) => (
            <span key={i} className="bg-red1/10 border border-red1/30 text-red1 text-xs rounded-full px-3 py-1">
              {d}
            </span>
          ))}
          {(result.do_not_say || []).length === 0 && <span className="text-muted text-xs italic">Sin bloqueos.</span>}
        </div>
      </section>
      <section className="premium-card border-blue1/30">
        <h3 className="text-sm font-bold uppercase tracking-wider text-blue1 mb-3">Argumentos protegidos</h3>
        <ol className="space-y-2 list-decimal list-inside text-sm text-text1">
          {(result.three_arguments || []).map((arg: string, i: number) => (
            <li key={i}>{arg}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// ── Mix de canales: parsear recommended_channel + matriz de efectividad ──
function ChannelsView({ result }: { result: any }) {
  const channelStr = (result.recommended_channel as string) || "";
  const lower = channelStr.toLowerCase();
  const detected: Array<{ name: string; icon: any }> = [];
  if (/(rueda de prensa|prime time|tv|televisión)/i.test(lower)) detected.push({ name: "TV / prime time", icon: Tv });
  if (/(nota|prensa|press)/i.test(lower)) detected.push({ name: "Nota institucional / prensa escrita", icon: Newspaper });
  if (/(red|social|x |twitter|instagram|tiktok)/i.test(lower)) detected.push({ name: "Redes sociales", icon: MessageSquare });
  if (/(email|newsletter|mail)/i.test(lower)) detected.push({ name: "Email / newsletter", icon: Mail });
  if (detected.length === 0) detected.push({ name: channelStr || "Comunicación general", icon: Megaphone });

  // Matriz de efectividad por canal
  const matrix = [
    { canal: "TV / prime time",  alcance: "Alto",  velocidad: "Medio", credibilidad: "Alto"  },
    { canal: "Nota institucional", alcance: "Medio", velocidad: "Lento", credibilidad: "Alto"  },
    { canal: "Redes sociales",   alcance: "Alto",  velocidad: "Inmediato", credibilidad: "Bajo" },
    { canal: "Email / newsletter", alcance: "Bajo",  velocidad: "Rápido", credibilidad: "Medio" },
    { canal: "Entrevista impresa", alcance: "Medio", velocidad: "Lento", credibilidad: "Alto"  },
  ];

  const valueClass = (v: string) =>
    v === "Alto" || v === "Inmediato" ? "text-green1" :
    v === "Medio" || v === "Rápido" ? "text-amber1" :
    v === "Bajo" || v === "Lento" ? "text-red1" : "text-text2";

  return (
    <div className="space-y-4">
      <section className="premium-card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-cyan1 mb-3">Canales recomendados</h3>
        <p className="text-text2 text-xs mb-4">Detectados desde el análisis: <span className="text-text1">{channelStr || "—"}</span></p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {detected.map((d, i) => {
            const Icon = d.icon;
            return (
              <div key={i} className="premium-card hover:border-cyan1/40 transition flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-lg bg-cyan1/10 border border-cyan1/30 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-cyan1"/>
                </div>
                <div>
                  <div className="text-sm font-semibold text-text1">{d.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="premium-card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1 mb-3">Matriz de efectividad por canal</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted">
              <th className="text-left pb-2">Canal</th>
              <th className="text-center pb-2">Alcance</th>
              <th className="text-center pb-2">Velocidad</th>
              <th className="text-center pb-2">Credibilidad</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((m, i) => (
              <tr key={i} className="border-t border-border1">
                <td className="py-2 text-text1">{m.canal}</td>
                <td className={`py-2 text-center font-mono ${valueClass(m.alcance)}`}>{m.alcance}</td>
                <td className={`py-2 text-center font-mono ${valueClass(m.velocidad)}`}>{m.velocidad}</td>
                <td className={`py-2 text-center font-mono ${valueClass(m.credibilidad)}`}>{m.credibilidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Card({ title, body, accent }: { title: string; body: string; accent: "red" | "cyan" | "blue" }) {
  const borderClass = accent === "red" ? "border-red1/30" : accent === "blue" ? "border-blue1/30" : "border-cyan1/30";
  const colorClass = accent === "red" ? "text-red1" : accent === "blue" ? "text-blue1" : "text-cyan1";
  return (
    <section className={`premium-card ${borderClass}`}>
      <h3 className={`text-xs font-bold uppercase tracking-wider ${colorClass} mb-2`}>{title}</h3>
      <p className="text-text1 text-sm leading-relaxed">{body}</p>
    </section>
  );
}

function demoStrategy(issue: string) {
  return {
    issue,
    rival_frame: "El gobierno no sabe gestionar y improvisa decisiones por presión política.",
    own_frame: "Acciones decididas y responsables ante un contexto complejo.",
    central_message: "Estamos respondiendo con decisiones técnicas, transparentes y orientadas a resultados.",
    three_arguments: [
      "Datos: las medidas adoptadas ya muestran resultados medibles en X variables.",
      "Comparativa: respuesta más rápida que CCAA o gobiernos anteriores.",
      "Compromiso: revisión transparente al cierre del semestre con métricas públicas."
    ],
    hostile_questions: [
      "¿Por qué no se actuó antes?",
      "¿Qué responde a las críticas de la oposición?",
      "¿Está dispuesto a asumir responsabilidades si las cifras no mejoran?",
      "¿Qué garantías tienen los ciudadanos de que esto no se repetirá?"
    ],
    answers: [
      "La respuesta se ajustó al ritmo de los datos disponibles. Hoy disponemos de información que no teníamos hace seis meses.",
      "Respeto sus posiciones, pero los datos muestran una mejora medible y verificable.",
      "Por supuesto. Comprometo una evaluación independiente al cierre del semestre.",
      "Las garantías son los datos, los protocolos publicados y la transparencia en la rendición de cuentas."
    ],
    recommended_channel: "Rueda de prensa + nota institucional + entrevista programa de prime time",
    do_not_say: [
      "No tenemos información todavía",
      "No es responsabilidad nuestra",
      "Es culpa de la oposición",
      "Esto no es relevante"
    ],
    mode: "demo"
  };
}
