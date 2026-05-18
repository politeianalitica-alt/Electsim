/**
 * BrainPanel · componente React Server-Component reutilizable.
 *
 * Inyecta el razonamiento del GroqBrain (29 tools) en cualquier página del
 * workspace. Server Component: la llamada al backend ocurre en el server,
 * no en el browser, y se beneficia del caché de Next.
 *
 * Uso:
 *
 *   import BrainPanel from '@/app/_components/workspace/brain-panel'
 *   <BrainPanel
 *     title="Análisis IA · narrativa del caso"
 *     tool="analyze_narrative"
 *     kwargs={{ pieces: titulares, topic: 'amnistía', time_window: 'última semana' }}
 *     revalidateSeconds={300}
 *   />
 */
import { callBrainTool, type BrainToolResponse } from '@/lib/brain'

type Props = {
  title?: string
  tool: string
  kwargs: Record<string, unknown>
  revalidateSeconds?: number
  showReasoning?: boolean
  showSources?: boolean
  emptyFallback?: React.ReactNode
}

export default async function BrainPanel(props: Props) {
  const {
    title = 'Análisis IA',
    tool,
    kwargs,
    revalidateSeconds = 300,
    showReasoning = true,
    showSources = true,
    emptyFallback = null,
  } = props

  const out: BrainToolResponse = await callBrainTool(tool, kwargs, { revalidateSeconds })

  return (
    <section className="brain-panel rounded-xl border border-neutral-800 bg-gradient-to-br from-purple-950/30 to-blue-950/20 p-4 my-4">
      <header className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[0.65rem] uppercase tracking-[0.14em] font-extrabold text-purple-300">
            {title}
          </div>
          <div className="text-[0.72rem] text-neutral-400 mt-0.5">
            Tool <code className="px-1 rounded bg-neutral-900/60">{tool}</code> · LLaMA 3.3 70B (Groq)
          </div>
        </div>
        <BrainBadges out={out} />
      </header>

      {!out.ok ? (
        <div className="text-sm text-amber-300/80">
          IA no disponible: {out.error ?? 'sin detalle'}
          {emptyFallback}
        </div>
      ) : (
        <BrainBody out={out} showReasoning={showReasoning} showSources={showSources} />
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// Subcomponentes (todos Server Components)
// ─────────────────────────────────────────────────────────────────

function BrainBadges({ out }: { out: BrainToolResponse }) {
  if (!out.ok) return null
  const conf = out.confidence ?? 0
  const color = conf >= 0.7 ? 'text-emerald-400' : conf >= 0.4 ? 'text-amber-400' : 'text-rose-400'
  return (
    <div className="flex items-center gap-3 text-[0.72rem] text-neutral-400">
      <span>conf <strong className={color}>{conf.toFixed(2)}</strong></span>
      <span>{(out.latency_ms ?? 0)} ms</span>
      <span>{out.tokens_used ?? 0} tok</span>
    </div>
  )
}

function BrainBody({
  out,
  showReasoning,
  showSources,
}: {
  out: BrainToolResponse
  showReasoning: boolean
  showSources: boolean
}) {
  const result = out.result
  return (
    <div className="space-y-3">
      <BrainResult result={result} />
      {showReasoning && (out.reasoning_steps?.length ?? 0) > 0 && (
        <details className="text-sm text-neutral-300">
          <summary className="cursor-pointer text-neutral-400">
            Ver razonamiento ({out.reasoning_steps!.length} pasos)
          </summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            {out.reasoning_steps!.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}
      {showSources && (out.sources?.length ?? 0) > 0 && (
        <details className="text-sm text-neutral-300">
          <summary className="cursor-pointer text-neutral-400">
            Fuentes citadas ({out.sources!.length})
          </summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {out.sources!.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function BrainResult({ result }: { result: unknown }) {
  if (result === null || result === undefined) {
    return <div className="text-sm text-neutral-500">Sin resultado.</div>
  }
  if (typeof result === 'string') {
    // Markdown plano — usamos prose si la app tiene tailwind typography
    return (
      <div className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">{result}</div>
    )
  }
  if (typeof result === 'object') {
    const r = result as Record<string, unknown>
    const headline =
      (r.headline as string) ||
      (r.title as string) ||
      (r.executive_summary as string) ||
      (r.executive_takeaway as string) ||
      (r.synthesis as string) ||
      (r.narrative_name as string) ||
      (r.core_claim as string) ||
      (r.summary_one_liner as string)
    return (
      <div className="text-sm text-neutral-200">
        {headline && <p className="text-base font-semibold mb-2">{String(headline)}</p>}
        <DictFriendly d={r} />
      </div>
    )
  }
  return <div className="text-sm text-neutral-500">Resultado no renderizable.</div>
}

/** Render heurístico de un dict-resultado del brain. */
function DictFriendly({ d }: { d: Record<string, unknown> }) {
  // Listas relevantes a destacar
  const LIST_KEYS = [
    'key_points',
    'today_actions',
    'watch_next',
    'watch_list',
    'recommended_actions',
    'key_lessons',
    'what_worked',
    'what_failed',
    'top_lessons',
    'vulnerabilities',
    'attack_vectors',
    'early_indicators',
    'drivers',
    'supporting_arguments',
    'big_movers',
    'scenarios',
    'soft_voter_segments',
    'persuasive_messages',
    'signals',
    'recommended_checks',
    'opportunities',
    'risks',
    'sectors_affected',
  ]
  const simpleKeys = Object.entries(d).filter(
    ([k, v]) =>
      ['string', 'number', 'boolean'].includes(typeof v) &&
      !['model', 'tokens_used', 'latency_ms', 'confidence'].includes(k),
  )
  return (
    <div className="space-y-3">
      {simpleKeys.length > 0 && (
        <ul className="space-y-0.5">
          {simpleKeys.map(([k, v]) => (
            <li key={k}>
              <span className="text-neutral-400">{k}:</span>{' '}
              <span className="text-neutral-200">{String(v)}</span>
            </li>
          ))}
        </ul>
      )}
      {LIST_KEYS.map((key) => {
        const v = d[key]
        if (!Array.isArray(v) || v.length === 0) return null
        return (
          <div key={key}>
            <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">
              {key.replace(/_/g, ' ')}
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {v.slice(0, 12).map((it, i) => (
                <li key={i}>{labelOf(it)}</li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function labelOf(it: unknown): string {
  if (typeof it === 'string') return it
  if (it && typeof it === 'object') {
    const o = it as Record<string, unknown>
    return String(
      o.name ??
        o.action ??
        o.lesson ??
        o.vector ??
        o.driver ??
        o.type ??
        o.partido ??
        o.signal ??
        JSON.stringify(o).slice(0, 80),
    )
  }
  return String(it)
}
