"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Sparkles, Database, AlertCircle, FileText, CheckCircle2, Cpu } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // Bold section headers like **Estado actual**
        const boldLine = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-cyan1/90">$1</strong>');
        // Bullet points
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-cyan1 flex-shrink-0 mt-0.5">•</span>
              <span className="text-text1" dangerouslySetInnerHTML={{ __html: boldLine.replace(/^[•\-]\s+/, "") }} />
            </div>
          );
        }
        if (line.startsWith("_") && line.endsWith("_")) {
          return <p key={i} className="text-xs text-muted italic">{line.slice(1, -1)}</p>;
        }
        return (
          <p key={i} className="text-sm text-text1 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: boldLine }} />
        );
      })}
    </div>
  );
}

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

  const { data: brainStatus } = useQuery({
    queryKey: ["brain", "status"],
    queryFn: () => endpoints.brainStatus().catch(() => ({ available: false, model: "desconocido", mode: "error" })),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

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
      const ctx = [
        contextFlags.briefing ? "Incluye análisis del briefing matinal." : "",
        contextFlags.alerts ? "Incluye las alertas activas en el análisis." : "",
        contextFlags.narratives ? "Incluye narrativas mediáticas activas." : "",
        "Razona estructurando tu respuesta: primero el estado actual, luego los riesgos, luego las oportunidades y finalmente la acción recomendada.",
      ].filter(Boolean).join(" ");
      const res = await endpoints.brainAsk(question, ctx).catch(() => null);
      const rawAnswer = res?.answer;
      const answer = rawAnswer && rawAnswer.length > 20 ? rawAnswer : demoAnswer(question);
      setMessages(m => [...m, { role: "brain", text: answer, time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) }]);
    } finally {
      setBusy(false);
    }
  };

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
          {brainStatus?.available ? (
            <span className="badge badge-green flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green1 animate-pulse" />
              {brainStatus.model ?? "Modelo activo"}
            </span>
          ) : (
            <span className="badge badge-amber flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> Sin modelo
            </span>
          )}
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
                {m.role === "brain"
                  ? <MarkdownText text={m.text} />
                  : <div className="text-sm text-text1 whitespace-pre-wrap">{m.text}</div>
                }
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

        <div className={`premium-card ${brainStatus?.available ? "border-green1/30" : "border-amber1/30"}`}>
          <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${brainStatus?.available ? "text-green1" : "text-amber1"}`}>
            {brainStatus?.available ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            Modelo
          </h3>
          {brainStatus?.available ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-green1 shrink-0" />
                <span className="text-xs text-text1 font-medium">{brainStatus.model}</span>
              </div>
              <p className="text-[10px] text-muted">Ollama corriendo localmente. Modelo <strong>politeia-brain:latest</strong> disponible para análisis en tiempo real.</p>
            </div>
          ) : (
            <p className="text-xs text-text2">Sin modelo LLM activo. Inicia Ollama con <code className="text-cyan1 bg-bg3 px-1 rounded text-[10px]">ollama serve</code> para activar el Brain.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function demoAnswer(q: string): string {
  const lower = q.toLowerCase();
  if (/pp|popular|feijóo|feijoo/i.test(lower)) {
    return `**Estado actual:** El PP lidera la intención de voto con 33.2% según el último agregado ponderado (n=7 encuestas, última actualización: hoy). Tendencia: +0.4pp en 7 días, +1.8pp en 30 días. Primera fuerza en todas las encuestas desde junio 2023.

**Fortalezas:** Dominio absoluto en el electorado mayor de 55 años (41%), fuertes posiciones en CCAA gobernadas (CAM, Galicia, Castilla y León, Murcia). Isabel Díaz Ayuso mantiene un 45% de aprobación personal.

**Riesgos:** Posible saturación por el "efecto techo" en torno al 34-35%. Fricciones con VOX en gobiernos autonómicos compartidos (Extremadura, Aragón). Narrativa de "vivienda" golpea al electorado joven donde el PP es débil.

**Vectores de cambio:** Congreso del PP previsto para junio podría generar tensiones internas. El recurso al TC por la amnistía puede ser un arma de doble filo si se prolonga. Agenda de oposición constructiva necesaria para contrastar con el desgaste del gobierno.

**Acción recomendada:** Monitorizar el diferencial PP-PSOE semanalmente. Activar alerta si PSOE recupera >2pp.

_Análisis de demostración basado en datos del motor nowcasting · Conecta Ollama o Groq para análisis en tiempo real._`;
  }
  if (/psoe|sánchez|sanchez|gobierno/i.test(lower)) {
    return `**Estado actual:** El PSOE se sitúa en 27.4% de intención de voto (-0.6pp en 7 días, -1.2pp en 30 días). En posición defensiva pero dentro del margen histórico. El gobierno mantiene la mayoría de investidura pero en precario equilibrio.

**Fortalezas:** Datos macroeconómicos favorables (PIB +0.6% T1, paro cayendo). Control de la agenda gubernamental. Movilización defensiva de base ante "lawfare".

**Riesgos críticos:** Bloqueo de Junts en comisiones (alerta activa). Recurso amnistía en TC puede complicar el relato. Sumar exige avances en reforma fiscal. Sentimiento mediático negativo (-0.31, en mínimos).

**Indicadores a vigilar en 72h:** Declaraciones Puigdemont tras el fallo del TC. Votación en comisión de Justicia (riesgo de bloqueo). Reunión del comité federal prevista para el viernes.

**Acción recomendada:** Activar protocolo de comunicación de crisis. Preparar mensaje sobre datos de empleo para contrarrestar narrativa negativa.

_Análisis de demostración · Para profundidad máxima configura el modelo LLM en ajustes._`;
  }
  if (/economía|pib|paro|macro|presupuesto|fiscal|inflación|ipc/i.test(lower)) {
    return `**Situación macroeconómica actual (datos en tiempo real):**
• PIB T1 2026: +0.6% (consenso: +0.4%) — dato positivo
• IPC abril: 3.8% (consenso: 3.4%) — tensión
• Tasa de paro: 11.6% (EPA T1) — mejora continua
• Prima de riesgo: 78pb — bajo control
• Deuda/PIB: 107.4% — pendiente reducción estructural

**Implicaciones políticas:** La mejora del PIB abre espacio narrativo para el gobierno, pero el IPC persistente limita el margen. El Banco de España podría revisar proyecciones en su próxima publicación (15 mayo).

**Riesgos:** Tensión energética por política europea. Mercado de alquiler en pico histórico (+18% Barcelona, +14% Madrid). Presión de Sumar para reforma fiscal progresiva podría generar ruido con empresarios (CEOE).

**Ventana de oportunidad:** Próximas 3 semanas antes del cierre del semestre parlamentario son óptimas para comunicar la agenda económica del gobierno.

_Fuentes: INE, BdE, AIReF · Modo demostración._`;
  }
  if (/riesgo|crisis|inestabilidad/i.test(lower)) {
    return `**Índice de riesgo político actual: 67/100 — ZONA DE ALERTA**

**Desglose por dimensión:**
• Inestabilidad legislativa: 82/100 (crítico) — Bloqueo Junts, amnistía en TC
• Presión mediática: 74/100 (alto) — Narrativa crisis +340%
• Fragmentación parlamentaria: 68/100 (alto) — Mayoría en precario
• Riesgo económico: 44/100 (moderado) — Macro favorable pero IPC
• Riesgo geopolítico: 61/100 (alto) — España-Marruecos, OTAN

**Factores aceleradores de riesgo:** Junts tiene incentivos para usar el bloqueo legislativo como palanca negociadora. El TC podría emitir resolución relevante en 30 días. El calendario electoral (elecciones autonómicas Canarias, diciembre) aumenta la presión.

**Escenarios de baja probabilidad/alto impacto:** Ruptura de coalición (P=12%), convocatoria anticipada de elecciones (P=8%).

**Acción recomendada:** Activar sistema de alertas tempranas en módulo /riesgo. Preparar planes de contingencia para escenario de moción de censura.

_Motor de riesgo v2.1 · Modo demostración._`;
  }
  if (/congreso|escaños|parlamento|coalición|coalition/i.test(lower)) {
    return `**Composición del Congreso de los Diputados (350 escaños):**
PP: 137 escaños · PSOE: 121 · VOX: 33 · Sumar: 31 · Junts: 7 · ERC: 7 · PNV: 5 · Bildu: 6 · otros: 3

**Mayorías clave:**
• Mayoría absoluta: 176 escaños
• Coalición PSOE+Sumar: 152 (insuficiente, necesita +24)
• Coalición PP+VOX: 170 (insuficiente, necesita +6)
• Coalición PP+VOX+otros: potencialmente viable (180+)

**El pivote Junts (7 escaños):** Es el "partido bisagra" con mayor poder de bloqueo. Sus condiciones incluyen avances en amnistía, negociación del concierto económico catalán y respeto al autogobierno.

**Análisis de viabilidad:** El gobierno actual solo puede mantener mayorías con apoyo táctico de Junts, ERC o PNV. La pérdida de cualquiera de estos socios en votaciones críticas puede comprometer la legislatura.

_Simulación de escaños mediante D'Hondt con datos de encuestas actuales · Modo demo._`;
  }
  return `**Análisis de Politeia Brain** — Pregunta recibida sobre: "${q.slice(0, 60)}${q.length > 60 ? "..." : ""}"

En modo demostración, el Brain utiliza respuestas analíticas preconfiguradas con los datos del sistema actual (nowcasting, alertas, legislativo, riesgo).

**Para activar el análisis completo con IA:**
1. **Ollama local:** Instala Ollama y descarga \`politeia-brain:latest\` o \`llama3:8b\`
2. **Groq API:** Añade \`GROQ_API_KEY\` en las variables de entorno
3. **OpenAI:** Añade \`OPENAI_API_KEY\` y configura en /integraciones

**Módulos disponibles sin IA:** Nowcasting (/nowcasting), Análisis legislativo (/legislativo), Riesgo & Crisis (/riesgo), Mapa de actores (/actores), Geopolítica (/geopolitica).

_Politeia Brain v3.0 · Modo demo activo · Para configurar el modelo, visita /settings._`;
}
