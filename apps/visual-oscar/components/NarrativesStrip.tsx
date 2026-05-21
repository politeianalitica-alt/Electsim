'use client'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'

interface Topic { topic: string; cnt: number }

/**
 * Strip de narrativas activas — muestra los temas extraídos por Ollama de las
 * últimas 48h con tamaño de chip proporcional a su frecuencia.
 */
export default function NarrativesStrip() {
  const { data } = useApi<{ topics: Topic[] }>('/api/news/topics?hours_back=48&limit=15', { refreshInterval: 120_000 })
  const topics = data?.topics ?? []
  const max = topics[0]?.cnt || 1

  return (
 <section style={{
      marginTop: 16, marginBottom: 18,
      background: 'linear-gradient(120deg, #FAFAFB 0%, #F5F5F7 100%)',
      borderRadius: 16, padding: '16px 22px',
      border: '1px solid #ECECEF',
    }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
 <LiveDot color="#1F4E8C"/>
          Narrativas activas — extraídas de las noticias
 </h2>
        {topics.length > 0 && (
 <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 500 }}>
 <CountUp value={topics.length}/> temas en 48h · top: <strong style={{ color: 'var(--ink-2)' }}>{topics[0].topic}</strong>
 </span>
        )}
 </div>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {topics.length > 0 ? topics.map((t, i) => {
          const intensity = t.cnt / max
          const fontSize = 11 + intensity * 4   // 11–15px
          return (
 <span key={t.topic + i} style={{
              fontSize, padding: '4px 10px', borderRadius: 999,
              background: `rgba(31, 78, 140, ${0.04 + intensity * 0.18})`,
              color: '#1F4E8C', border: '1px solid rgba(31,78,140,0.18)',
              fontWeight: 500 + Math.round(intensity * 200),
              animation: 'pol-fade-in 360ms ease-out',
              animationDelay: `${i * 25}ms`, animationFillMode: 'backwards',
              cursor: 'default',
            }}
            title={`${t.cnt} menciones en 48h`}>
              {t.topic} <span style={{ opacity: 0.55, fontWeight: 400, marginLeft: 2 }}>{t.cnt}</span>
 </span>
          )
        }) : (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} width={70 + i * 8} height={22} radius={999}/>)
        )}
 </div>
 </section>
  )
}
