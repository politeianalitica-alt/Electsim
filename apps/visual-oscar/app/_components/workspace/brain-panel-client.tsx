"use client"
/**
 * BrainPanelClient · variante client del BrainPanel.
 *
 * Llama al GroqBrain a través del route handler `/api/brain-v2/tool/[name]`
 * (que internamente proxea a FastAPI). Se usa cuando la página padre ya es
 * "use client".
 *
 * Renderiza KPIs, resultado y razonamiento. Botón "Re-ejecutar" para forzar
 * recálculo. Maneja `loading`, `error`, `ok=false` con estilos suaves.
 */
import { useCallback, useEffect, useRef, useState } from "react"

type BrainResponse = {
  ok: boolean
  tool?: string
  result?: unknown
  confidence?: number
  sources?: string[]
  reasoning_steps?: string[]
  model?: string
  tokens_used?: number
  latency_ms?: number
  error?: string | null
}

type Props = {
  title?: string
  tool: string
  kwargs: Record<string, unknown>
  autoRun?: boolean
  buttonLabel?: string
}

export default function BrainPanelClient({
  title = "Análisis IA",
  tool,
  kwargs,
  autoRun = false,
  buttonLabel = "Ejecutar análisis IA",
}: Props) {
  const [data, setData] = useState<BrainResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [err, setErr] = useState<string | null>(null)
  // Bug previo: el side-effect del auto-run vivía en el cuerpo del render,
  // lo que viola las reglas de React y causaba doble disparo en StrictMode.
  // Ahora va en un useEffect controlado por un ref para garantizar un solo
  // arranque por instancia (incluso si kwargs cambian por identidad).
  const autoRunRef = useRef<boolean>(false)

  const run = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch(`/api/brain-v2/tool/${encodeURIComponent(tool)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kwargs }),
      })
      const j: BrainResponse = await r.json()
      setData(j)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [tool, kwargs])

  useEffect(() => {
    if (autoRun && !autoRunRef.current) {
      autoRunRef.current = true
      void run()
    }
  }, [autoRun, run])

  return (
    <section className="rounded-xl border border-neutral-800 bg-gradient-to-br from-purple-950/30 to-blue-950/20 p-4 my-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[0.65rem] uppercase tracking-[0.14em] font-extrabold text-purple-300">
            {title}
          </div>
          <div className="text-[0.72rem] text-neutral-400 mt-0.5">
            Tool <code className="px-1 rounded bg-neutral-900/60">{tool}</code> · LLaMA 3.3 70B (Groq)
          </div>
        </div>
        <button
          onClick={() => void run()}
          disabled={loading}
          className="text-xs px-3 py-1 rounded bg-purple-800/80 hover:bg-purple-700 text-white disabled:opacity-50"
        >
          {loading ? "Razonando…" : data ? "Re-ejecutar" : buttonLabel}
        </button>
      </header>

      {err && <div className="text-sm text-rose-300/80">Error: {err}</div>}
      {data && !data.ok && (
        <div className="text-sm text-amber-300/80">
          IA no disponible: {data.error ?? "sin detalle"}
        </div>
      )}
      {data && data.ok && <BrainBody data={data} />}
      {!data && !loading && !err && (
        <div className="text-xs text-neutral-500">
          Pulsa el botón para invocar al razonador.
        </div>
      )}
    </section>
  )
}

function BrainBody({ data }: { data: BrainResponse }) {
  const conf = data.confidence ?? 0
  const color = conf >= 0.7 ? "text-emerald-400" : conf >= 0.4 ? "text-amber-400" : "text-rose-400"
  return (
    <div className="space-y-3 text-sm text-neutral-200">
      <div className="flex items-center gap-4 text-[0.72rem] text-neutral-400">
        <span>conf <strong className={color}>{conf.toFixed(2)}</strong></span>
        <span>{data.latency_ms ?? 0} ms</span>
        <span>{data.tokens_used ?? 0} tok</span>
        <span className="opacity-70">{data.model ?? ""}</span>
      </div>
      <BrainResultRender result={data.result} />
      {(data.reasoning_steps?.length ?? 0) > 0 && (
        <details>
          <summary className="cursor-pointer text-neutral-400 text-xs">
            Ver razonamiento ({data.reasoning_steps!.length})
          </summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-xs">
            {data.reasoning_steps!.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}
      {(data.sources?.length ?? 0) > 0 && (
        <details>
          <summary className="cursor-pointer text-neutral-400 text-xs">
            Fuentes ({data.sources!.length})
          </summary>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
            {data.sources!.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function BrainResultRender({ result }: { result: unknown }) {
  if (result === null || result === undefined) {
    return <div className="text-neutral-500">Sin resultado.</div>
  }
  if (typeof result === "string") {
    return <div className="whitespace-pre-wrap leading-relaxed">{result}</div>
  }
  if (typeof result !== "object") {
    return <div>{String(result)}</div>
  }
  const r = result as Record<string, unknown>
  const headline =
    (r.headline as string) ||
    (r.title as string) ||
    (r.executive_summary as string) ||
    (r.executive_takeaway as string) ||
    (r.narrative_name as string) ||
    (r.core_claim as string) ||
    (r.summary_one_liner as string)
  const LIST_KEYS = [
    "key_points", "today_actions", "watch_next", "watch_list", "recommended_actions",
    "vulnerabilities", "attack_vectors", "early_indicators", "drivers",
    "supporting_arguments", "scenarios", "soft_voter_segments",
    "persuasive_messages", "signals", "recommended_checks", "risks", "opportunities",
  ]
  const simple = Object.entries(r).filter(
    ([k, v]) => ["string", "number", "boolean"].includes(typeof v) &&
                !["model", "tokens_used", "latency_ms", "confidence"].includes(k),
  )
  return (
    <div className="space-y-3">
      {headline && <p className="text-base font-semibold">{String(headline)}</p>}
      {simple.length > 0 && (
        <ul className="space-y-0.5">
          {simple.map(([k, v]) => (
            <li key={k} className="text-xs">
              <span className="text-neutral-400">{k}:</span>{" "}
              <span className="text-neutral-200">{String(v)}</span>
            </li>
          ))}
        </ul>
      )}
      {LIST_KEYS.map((key) => {
        const v = r[key]
        if (!Array.isArray(v) || v.length === 0) return null
        return (
          <div key={key}>
            <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">
              {key.replace(/_/g, " ")}
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {v.slice(0, 12).map((it, i) => (
                <li key={i} className="text-xs">{labelOf(it)}</li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function labelOf(it: unknown): string {
  if (typeof it === "string") return it
  if (it && typeof it === "object") {
    const o = it as Record<string, unknown>
    return String(
      o.name ?? o.action ?? o.lesson ?? o.vector ?? o.driver ??
      o.type ?? o.partido ?? o.signal ??
      JSON.stringify(o).slice(0, 80),
    )
  }
  return String(it)
}
