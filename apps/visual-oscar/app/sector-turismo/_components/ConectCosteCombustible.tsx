'use client'
/**
 * <ConectCosteCombustible /> · Turismo v3 · Sprint T8 (Conectividad)
 *
 * Coste de conectividad aérea = combustible de aviación. El combustible es la
 * mayor partida variable de coste de una aerolínea (~25-30% en años de crudo
 * caro) y determina, vía tarifas, la elasticidad de la demanda turística.
 *
 * No existe una fuente pública gratuita y fiable del precio spot del JET FUEL
 * (queroseno de aviación). Los dos mejores proxies públicos son:
 *   - Brent (crudo de referencia europeo): driver primario del coste del jet.
 *   - Heating oil / diésel (HO=F · destilado medio NYMEX): el jet es también un
 *     destilado medio, cuyo precio se mueve casi en paralelo al heating oil.
 * Se muestran ambos con su serie y variaciones, y un crack jet≈HO − Brent
 * (margen del destilado sobre el crudo) normalizado a $/bbl, marcando con
 * honestidad que es un PROXY (CLAUDE.md). Si no hay series → estado vacío.
 *
 * Consume el map de `/api/energia/commodities?category=oil` que resuelve la vista
 * padre (cascada Alpha Vantage → Nasdaq DL → Yahoo). Reusa los tipos del cliente
 * de commodities de energía sin tocar app/api ni lib. Cero emojis · Unicode (⇡ ⇣).
 */
import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { EnergyCommodityResponse, EnergyCommoditySeries } from '@/lib/energia/types'

const BRENT_COLOR = '#0F766E'
const JET_COLOR = '#B45309'

type DataMap = Record<string, EnergyCommodityResponse>

interface Props {
  /** Map símbolo→respuesta de /api/energia/commodities (oil). null mientras carga. */
  data: DataMap | null
  loading?: boolean
}

function seriesOf(data: DataMap | null, sym: string): EnergyCommoditySeries | null {
  const r = data?.[sym]
  return r?.ok ? r.data ?? null : null
}

export function ConectCosteCombustible({ data, loading = false }: Props) {
  const brent = seriesOf(data, 'brent')
  // El proxy del jet fuel es el heating oil / diésel (destilado medio).
  const jet = seriesOf(data, 'diesel')

  // Crack jet≈HO − Brent normalizado a $/bbl (HO cotiza en $/gal · ×42).
  const crackSeries = useMemo(() => {
    if (!brent || !jet) return []
    const brentByDate = new Map(brent.series.map((p) => [p.date, p.value]))
    const out: Array<{ date: string; value: number }> = []
    for (const h of jet.series) {
      const b = brentByDate.get(h.date)
      if (b != null && Number.isFinite(b)) out.push({ date: h.date, value: h.value * 42 - b })
    }
    return out
  }, [brent, jet])

  const crackLast = crackSeries.length ? crackSeries[crackSeries.length - 1].value : null

  if (loading) {
    return <div style={{ height: 220, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
  }

  if (!brent && !jet) {
    return (
      <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
        Coste de combustible no disponible ahora. El precio del jet fuel no tiene fuente pública gratuita;
        sus proxies (Brent y heating oil/diésel) recorren Alpha Vantage (rate-limit 25/día), Nasdaq Data
        Link y Yahoo Finance. Si todas fallan se muestra este estado honesto; reintenta en unos minutos.
      </p>
    )
  }

  return (
    <div>
      {/* Métricas spot de los dos proxies + crack */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 14 }}>
        <ProxyMetric
          label="Brent (driver del jet)"
          series={brent}
          color={BRENT_COLOR}
        />
        <ProxyMetric
          label="Diésel / heating oil (proxy jet)"
          series={jet}
          color={JET_COLOR}
        />
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>
            Crack jet≈HO − Brent
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {crackLast != null ? `${crackLast >= 0 ? '+' : ''}${crackLast.toFixed(1)} $/bbl` : '—'}
          </div>
          <div style={{ fontSize: 9.5, color: '#9CA3AF' }}>margen del destilado sobre el crudo</div>
        </div>
      </div>

      {/* Series superpuestas de los dos proxies (normalizadas para comparar forma) */}
      <DualProxyChart brent={brent} jet={jet} />

      <p style={{ margin: '10px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Proxy honesto: no hay fuente pública gratuita del queroseno de aviación. El{' '}
        <strong>Brent</strong> es el driver primario del coste del jet; el <strong>heating oil/diésel</strong>{' '}
        (HO=F, destilado medio NYMEX) se mueve casi en paralelo al jet fuel. Fuentes:{' '}
        {brent?.source_label ?? jet?.source_label ?? 'Alpha Vantage / Nasdaq DL / Yahoo'}. El combustible es
        la mayor partida variable de coste aéreo, así que su tendencia anticipa presión en tarifas y, por
        tanto, en la demanda turística sensible al precio.
      </p>
    </div>
  )
}

function ProxyMetric({ label, series, color }: { label: string; series: EnergyCommoditySeries | null; color: string }) {
  const latest = series?.latest ?? null
  const chg = series?.change_24h ?? null
  const chgColor = chg == null ? '#86868b' : chg >= 0 ? '#16A34A' : '#DC2626'
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {latest != null ? latest.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—'}
        </span>
        <span style={{ fontSize: 10, color: '#86868b' }}>{series?.unit ?? ''}</span>
        {chg != null && (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: chgColor }}>
            {chg >= 0 ? '⇡' : '⇣'} {Math.abs(chg).toFixed(2)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 9.5, color: '#9CA3AF' }}>{latest != null ? 'spot · 24h' : 'sin dato'}</div>
    </div>
  )
}

/**
 * Dos áreas superpuestas (Brent y proxy jet) normalizadas a índice 100 en el
 * primer punto común, para comparar la FORMA de la tendencia pese a estar en
 * unidades distintas ($/bbl vs $/gal).
 */
function DualProxyChart({ brent, jet }: { brent: EnergyCommoditySeries | null; jet: EnergyCommoditySeries | null }) {
  const rows = useMemo(() => {
    const map = new Map<string, { date: string; brent?: number; jet?: number }>()
    const base = { brent: brent?.series[0]?.value ?? null, jet: jet?.series[0]?.value ?? null }
    for (const p of brent?.series ?? []) {
      if (base.brent && base.brent !== 0) map.set(p.date, { date: p.date, brent: (p.value / base.brent) * 100 })
    }
    for (const p of jet?.series ?? []) {
      if (!base.jet || base.jet === 0) continue
      const idx = (p.value / base.jet) * 100
      const prev = map.get(p.date)
      if (prev) prev.jet = idx
      else map.set(p.date, { date: p.date, jet: idx })
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [brent, jet])

  if (rows.length < 2) {
    return (
      <div style={{ fontSize: 11.5, color: '#86868b', lineHeight: 1.5 }}>
        Serie insuficiente para el gráfico comparado (se necesita histórico de Brent y del proxy diésel).
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={rows} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="conectBrentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRENT_COLOR} stopOpacity={0.18} />
            <stop offset="100%" stopColor={BRENT_COLOR} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="conectJetFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={JET_COLOR} stopOpacity={0.18} />
            <stop offset="100%" stopColor={JET_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} width={38} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #ECECEF' }}
          formatter={(v: number | string, name: string) => [
            `${Number(v).toFixed(1)}`,
            name === 'brent' ? 'Brent (índice 100)' : 'Proxy jet (índice 100)',
          ]}
        />
        <Area type="monotone" dataKey="brent" name="brent" stroke={BRENT_COLOR} strokeWidth={2} fill="url(#conectBrentFill)" dot={false} connectNulls />
        <Area type="monotone" dataKey="jet" name="jet" stroke={JET_COLOR} strokeWidth={2} fill="url(#conectJetFill)" dot={false} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default ConectCosteCombustible
