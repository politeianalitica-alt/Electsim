"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Sparkles, Database, AlertCircle, FileText } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

interface Msg { role: "user" | "brain"; text: string; time: string; }

const SUGGESTED = [
  "¿Cuál es la situación actual de las encuestas electorales?",
  "Explica la composición actual del Congreso de los Diputados",
  "¿Cuáles son los principales riesgos políticos para el gobierno?",
  "Analiza el estado de las negociaciones de coalición"
];

export default function BrainPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [contextFlags, setContextFlags] = useState({ briefing: true, alerts: false, narratives: false });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const time = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    setMessages(m => [...m, { role: "user", text: question, time }]);
    setInput("");
    setBusy(true);
    try {
      // Construcción REAL de contexto: hace fetches paralelos sólo si los
      // checkboxes correspondientes están activos. El backend Brain recibe
      // un texto sustancial con los datos vivos, no flags booleanos.
      const ctxParts: string[] = [];
      const fetchOps: Promise<void>[] = [];

      if (contextFlags.briefing) {
        fetchOps.push(
          endpoints.morningBriefing("default")
            .then(b => {
              const summary = b?.executive_summary?.slice(0, 600) ?? "";
              const alerts = (b?.key_alerts ?? []).slice(0, 4).map(a => `[${a.level}] ${a.title}`).join(" | ");
              ctxParts.push(`BRIEFING MATINAL:\n${summary}\nALERTAS DEL BRIEFING: ${alerts}`);
            })
            .catch(() => undefined)
        );
      }
      if (contextFlags.alerts) {
        fetchOps.push(
          endpoints.alertsList(true)
            .then(arr => {
              const text = (arr ?? []).slice(0, 6).map(a => `[${a.level.toUpperCase()}] ${a.title}: ${(a.body ?? "").slice(0, 80)}`).join("\n");
              if (text) ctxParts.push(`ALERTAS ACTIVAS NO LEÍDAS:\n${text}`);
            })
            .catch(() => undefined)
        );
      }
      if (contextFlags.narratives) {
        fetchOps.push(
          endpoints.mediaNarratives()
            .then(arr => {
              const text = (arr ?? []).slice(0, 5).map(n => `${n.frame_label} (${n.velocity}) — ${n.article_count ?? "?"} arts, emoción: ${n.dominant_emotion ?? "—"}`).join("\n");
              if (text) ctxParts.push(`NARRATIVAS ACTIVAS:\n${text}`);
            })
            .catch(() => undefined)
        );
      }

      await Promise.all(fetchOps);
      const ctx = ctxParts.length > 0
        ? ctxParts.join("\n\n")
        : "Sin contexto adicional seleccionado.";

      const res = await endpoints.brainAsk(question, ctx).catch(() => null);
      const answer = res?.answer || demoAnswer(question);
      setMessages(m => [...m, { role: "brain", text: answer, time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) }]);
    } finally {
      setBusy(false);
    }
  };

  // Brain status para el badge "Modelo activo"
  const { data: brainStatus } = useQuery({
    queryKey: ["brain", "status"],
    queryFn: () => endpoints.brainStatus(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-9rem)]">
      <section className="flex flex-col bg-bg2 border border-border1 rounded-xl overflow-hidden">
        <header className="px-6 py-4 border-b border-border1 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan1" />
              <h1 className="text-xl font-bold text-text1">Politeia Brain</h1>
            </div>
            <p className="text-text2 text-xs">Asistente IA con acceso al contexto del workspace</p>
          </div>
          <span className={`badge ${brainStatus?.available ? "badge-green" : "badge-red"} flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${brainStatus?.available ? "bg-green1" : "bg-red1"}`} />
            {brainStatus
              ? `${brainStatus.available ? "Activo" : "Caído"} · ${brainStatus.model || "—"}`
              : "Comprobando…"}
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div>
              <p className="text-text2 text-sm mb-4">Empieza con una pregunta o usa una sugerencia:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTED.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => ask(q)}
                    className="text-left p-3 rounded-lg bg-bg3 border border-border1 hover:border-cyan1/40 transition text-sm text-text1"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                m.role === "user"
                  ? "bg-bg3 border border-border1"
                  : "bg-bg/60 border border-cyan1/20 border-l-4 border-l-cyan1"
              }`}>
                <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
                  {m.role === "user" ? "Tú" : "Brain"} · {m.time}
                </div>
                <div className="text-sm text-text1 whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="bg-bg/60 border border-cyan1/20 border-l-4 border-l-cyan1 rounded-lg px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan1 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan1 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan1 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          className="px-6 py-4 border-t border-border1 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta al Brain con contexto del workspace..."
            disabled={busy}
            className="flex-1 px-4 py-2.5 bg-bg3 border border-border1 rounded-md text-text1 focus:border-cyan1 focus:outline-none placeholder-muted"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="px-4 py-2.5 bg-cyan1 text-bg rounded-md font-semibold disabled:opacity-50 hover:bg-cyan2 transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Enviar
          </button>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="premium-card">
          <h3 className="text-sm font-bold text-text1 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan1" /> Contexto activo
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contextFlags.briefing}
                  onChange={(e) => setContextFlags(f => ({ ...f, briefing: e.target.checked }))}
                  className="accent-cyan1"
                />
                <span className="text-text2">Incluir briefing matinal</span>
              </label>
            </li>
            <li>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contextFlags.alerts}
                  onChange={(e) => setContextFlags(f => ({ ...f, alerts: e.target.checked }))}
                  className="accent-cyan1"
                />
                <span className="text-text2">Incluir alertas activas</span>
              </label>
            </li>
            <li>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contextFlags.narratives}
                  onChange={(e) => setContextFlags(f => ({ ...f, narratives: e.target.checked }))}
                  className="accent-cyan1"
                />
                <span className="text-text2">Incluir narrativas activas</span>
              </label>
            </li>
          </ul>
        </div>

        <div className="premium-card">
          <h3 className="text-sm font-bold text-text1 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan1" /> Historial sesión
          </h3>
          <div className="text-text2 text-sm">{messages.length} mensajes</div>
          <button
            onClick={() => setMessages([])}
            className="mt-3 w-full px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm text-text2 hover:text-text1 transition"
          >
            Nueva conversación
          </button>
        </div>

        <div className="premium-card border-amber1/30">
          <h3 className="text-sm font-bold text-amber1 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Modelo
          </h3>
          <p className="text-xs text-text2 mb-2">Modo demo activo. Configura GROQ_API_KEY o instala Ollama para respuestas en tiempo real.</p>
        </div>
      </aside>
    </div>
  );
}

function demoAnswer(q: string): string {
  if (/PP|popular/i.test(q)) {
    return "El PP mantiene el liderazgo en intención de voto con 33.2% según el último agregado de sondeos. Su trayectoria reciente muestra estabilidad con ligero crecimiento (+0.4pp en la última semana). Las debilidades clave están en la franja 18-34 años en ciudades grandes y en territorios donde compite con VOX.\n\nFactores a vigilar: erosión por narrativa de vivienda, posibles efectos del recurso al TC sobre la amnistía, y el impacto del próximo congreso interno previsto para junio.\n\n[Respuesta de demostración — conecta Ollama o Groq para análisis en tiempo real con datos vivos del workspace.]";
  }
  if (/PSOE/i.test(q)) {
    return "El PSOE se sitúa en 28.5% de intención de voto, en una posición defensiva pero estable. La narrativa de lawfare contribuye a movilizar bases pero no consigue traspasar al votante moderado. Su socio Sumar acumula tensiones por el ritmo de las reformas pendientes (fiscal, laboral).\n\nOportunidades: capitalizar mejora macro (datos IPC y paro), agenda social. Riesgos: bloqueos en Congreso por Junts, casos en investigación.\n\n[Respuesta de demostración.]";
  }
  if (/economía|presupuesto|fiscal/i.test(q)) {
    return "La situación macroeconómica es favorable: IPC subyacente sorprende a la baja (3.1%), paro en mejora (-0.1pp QoQ), y el Banco de España revisa al alza la previsión de PIB 2026. Esto abre margen al gobierno para iniciativas fiscales antes del cierre del semestre.\n\nPuntos críticos: alquileres y vivienda siguen en pico de presión, energía vuelve a tensionar tras decisiones europeas. El gobierno tiene una ventana comunicacional pero cualquier mensaje fiscal debe coordinarse con Sumar para evitar fricciones.\n\n[Respuesta de demostración.]";
  }
  return "He recibido tu pregunta. En modo demo, mi capacidad de respuesta es limitada y genérica. Para análisis profundo con acceso al contexto real de tu workspace (briefings, alertas activas, narrativas en curso, datos electorales), conecta Ollama localmente o configura GROQ_API_KEY.\n\nMientras tanto, te sugiero: revisar el briefing matinal en /briefings, consultar las alertas críticas en /alertas, o explorar las narrativas activas en /medios.\n\n[Respuesta de demostración.]";
}
