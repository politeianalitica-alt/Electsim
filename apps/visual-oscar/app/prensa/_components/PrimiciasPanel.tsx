'use client'

/**
 * PrimiciasPanel — "Quién marca la agenda": para cada narrativa, el medio que
 * publicó PRIMERO (first-mover), cuánto se adelantó al segundo y cuántos le
 * siguieron. Se calcula con los timestamps de supporting_news. Sin emojis.
 */

import ArchiveLink from '@/components/medios/ArchiveLink'

interface SupportingNews {
  title: string
  medium: string
  url: string
  published_at?: string | null
}
interface ClusterLike {
  title: string
  main_topic?: string
  supporting_news?: SupportingNews[]
}

function ts(s?: string | null): number {
  if (!s) return NaN
  const t = Date.parse(s)
  return Number.isNaN(t) ? NaN : t
}
function gapLabel(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 1) return 'casi a la vez'
  if (min < 60) return `+${min} min de ventaja`
  const h = Math.round(min / 60)
  if (h < 24) return `+${h} h de ventaja`
  return `+${Math.round(h / 24)} d de ventaja`
}

export default function PrimiciasPanel({ clusters }: { clusters?: ClusterLike[] }) {
  if (!clusters || clusters.length === 0) return null

  const rows = clusters
    .map((c) => {
      const news = (c.supporting_news ?? [])
        .filter((n) => !Number.isNaN(ts(n.published_at)))
        .sort((a, b) => ts(a.published_at) - ts(b.published_at))
      if (news.length < 2) return null // necesitamos al menos 2 para hablar de "primicia"
      const first = news[0]
      const gap = ts(news[1].published_at) - ts(first.published_at)
      return { narrative: c.title, topic: c.main_topic, first, followers: news.length - 1, gap, when: first.published_at as string }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 8)

  if (rows.length === 0) return null

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0F766E', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#0F766E', textTransform: 'uppercase' }}>
          Quién marca la agenda · primicias
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#64748b' }}>
          El medio que publicó primero cada narrativa y cuánto se adelantó al resto.
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '9px 12px', background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 9 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3 }}>
                <a href={r.first.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d1d1f', textDecoration: 'none' }}>{r.narrative}</a>{' '}
                <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}><ArchiveLink url={r.first.url} size={18} /></span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                Primero: <strong style={{ color: '#0F766E' }}>{r.first.medium}</strong>
                {' · '}{r.followers} medio{r.followers === 1 ? '' : 's'} después
              </div>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#0F766E', background: 'rgba(15,118,110,0.08)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
              {gapLabel(r.gap)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
