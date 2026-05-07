"use client";

import { useState } from "react";
import { FileText, Send, Wand2, Copy, Download, RefreshCw, ChevronDown, AlignLeft, Mail, Megaphone, Globe } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

const FORMATS = [
  { id: "nota",      label: "Nota de prensa",     icon: FileText },
  { id: "email",     label: "Email político",      icon: Mail },
  { id: "post",      label: "Post RRSS",           icon: Megaphone },
  { id: "discurso",  label: "Fragmento discurso",  icon: AlignLeft },
  { id: "web",       label: "Texto web",           icon: Globe }
];

const TONOS = ["Institucional", "Cercano", "Combativo", "Técnico", "Divulgativo"];
const AUDIENCIAS = ["Ciudadanos generales", "Militantes", "Medios de comunicación", "Empresas", "Internacional", "Jóvenes"];

const DEMO_OUTPUT: Record<string, string> = {
  nota: `NOTA DE PRENSA

[Fecha] — [Partido / Institución]

TÍTULO DE LA NOTICIA EN MAYÚSCULAS

[Ciudad], [fecha].— El [cargo/institución] ha anunciado hoy [descripción de la medida o evento], con el objetivo de [finalidad].

Esta iniciativa responde a [contexto], y se enmarca dentro del compromiso del [partido/gobierno] con [objetivo estratégico].

"[Cita textual del portavoz que resuma el mensaje central de la nota]", ha declarado [nombre y cargo].

Entre las principales medidas adoptadas destacan: [punto 1], [punto 2] y [punto 3].

Para más información: comunicacion@[entidad].es | Tel.: 91 XXX XX XX`,

  email: `Asunto: [Mensaje clave en una línea]

Estimado/a [nombre],

Me dirijo a usted para compartir [contexto breve].

[Párrafo 1: situación actual y por qué importa]

[Párrafo 2: nuestra posición / propuesta]

[Párrafo 3: llamada a la acción concreta]

Quedo a su disposición para cualquier consulta.

Un cordial saludo,
[Nombre]
[Cargo] | [Organización]
[Teléfono] | [Email]`,

  post: `[PARTIDO / ENTIDAD] 🔵

[Primer párrafo de gancho — máx 2 líneas]

[Desarrollo del mensaje — 2-3 líneas]

[Llamada a la acción o cierre con impacto]

#Hashtag1 #Hashtag2 #Hashtag3`,

  discurso: `Ciudadanas y ciudadanos,

Hoy estamos aquí para hablar de [tema] — un asunto que afecta directamente a [colectivo o problema].

Durante demasiado tiempo, [descripción del problema]. Nosotros creemos que eso debe cambiar.

Por eso proponemos [medida concreta], porque [razón]. Porque [valor o principio que justifica la propuesta].

No es una promesa vacía. Es un compromiso verificable: [métricas o plazos].

Juntos, podemos construir [visión positiva del futuro].

Muchas gracias.`,

  web: `[TITULAR DE LA SECCIÓN — máx 8 palabras]

[Subtítulo que amplía el titular y atrae al lector — 1 línea]

[Párrafo introductorio: contexto + relevancia para el usuario, 2-3 líneas]

Qué hacemos
[Explicación de la propuesta o servicio, 2-3 líneas claras y directas]

Por qué importa
[Argumentario de valor — puede ser lista de 3 ítems con bullets]

Cómo participar / Próximos pasos
[CTA o instrucción concreta]`
};

export default function DraftPage() {
  const [format, setFormat] = useState("nota");
  const [tono, setTono] = useState("Institucional");
  const [audiencia, setAudiencia] = useState("Ciudadanos generales");
  const [brief, setBrief] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!brief.trim()) return;
    setBusy(true);
    setOutput("");
    try {
      const res = await endpoints.draftGenerate({ format, tono, audiencia, brief });
      const raw = typeof res.answer === "string" ? res.answer : JSON.stringify(res.answer, null, 2);
      setOutput(raw || DEMO_OUTPUT[format] || DEMO_OUTPUT.nota);
    } catch {
      setOutput(DEMO_OUTPUT[format] || DEMO_OUTPUT.nota);
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Content Studio</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Draft Studio</h1>
        <p className="text-text2 text-sm mt-1">Genera borradores de comunicación política alineados con tu estrategia de mensaje.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Panel izquierdo — configuración */}
        <div className="space-y-4">
          {/* Formato */}
          <section className="premium-card space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text1">Formato</h2>
            <div className="space-y-1.5">
              {FORMATS.map(f => {
                const Icon = f.icon;
                const active = format === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                      active ? "bg-cyan1/10 text-cyan1 border border-cyan1/30" : "text-text2 hover:text-text1 hover:bg-bg3"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Parámetros */}
          <section className="premium-card space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text1">Parámetros</h2>

            <div>
              <label className="text-xs text-text2 mb-1.5 block">Tono</label>
              <div className="relative">
                <select
                  value={tono}
                  onChange={e => setTono(e.target.value)}
                  className="w-full appearance-none bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 focus:border-cyan1 focus:outline-none pr-8"
                >
                  {TONOS.map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs text-text2 mb-1.5 block">Audiencia objetivo</label>
              <div className="relative">
                <select
                  value={audiencia}
                  onChange={e => setAudiencia(e.target.value)}
                  className="w-full appearance-none bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 focus:border-cyan1 focus:outline-none pr-8"
                >
                  {AUDIENCIAS.map(a => <option key={a}>{a}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted pointer-events-none" />
              </div>
            </div>
          </section>

          {/* Brief */}
          <section className="premium-card space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text1">Brief / Instrucciones</h2>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              rows={5}
              placeholder="Describe el mensaje, contexto, hechos clave, personas implicadas, CTA..."
              className="w-full bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder-muted focus:border-cyan1 focus:outline-none resize-none"
            />
            <button
              onClick={generate}
              disabled={busy || !brief.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-cyan1 text-bg text-sm font-semibold hover:bg-cyan2 transition disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              {busy ? "Generando..." : "Generar borrador"}
            </button>
          </section>
        </div>

        {/* Panel derecho — output */}
        <div className="space-y-4">
          <section className="premium-card h-full flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text1">
                Borrador generado
                {output && <span className="ml-2 text-muted normal-case font-normal">{wordCount} palabras</span>}
              </h2>
              {output && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setOutput(""); setBrief(""); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-text2 hover:text-text1 hover:bg-bg3 transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Nuevo
                  </button>
                  <button
                    onClick={copy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-bg3 border border-border1 text-text2 hover:text-text1 transition"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-cyan1/10 border border-cyan1/30 text-cyan1 hover:bg-cyan1/20 transition">
                    <Download className="w-3 h-3" /> Exportar
                  </button>
                </div>
              )}
            </div>

            {busy && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-cyan1/30 border-t-cyan1 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-text2 text-sm">Generando borrador...</p>
                </div>
              </div>
            )}

            {!busy && !output && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-cyan1/20 mx-auto mb-3" />
                  <p className="text-text2 text-sm">Configura el formato y proporciona un brief para generar tu borrador.</p>
                </div>
              </div>
            )}

            {!busy && output && (
              <div className="flex-1">
                <textarea
                  value={output}
                  onChange={e => setOutput(e.target.value)}
                  className="w-full h-full min-h-[440px] bg-bg3 border border-border1 rounded-lg px-4 py-3 text-sm text-text1 font-mono leading-relaxed focus:border-cyan1 focus:outline-none resize-none"
                />
                <p className="text-[10px] text-muted mt-2">Puedes editar el borrador directamente. El texto es tuyo.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
