'use client'
/**
 * <VisionTEstacionalidad /> · Turismo v3 · Sprint T3 (Visión Global)
 *
 * MINI-estacionalidad ejecutiva: barras del índice de demanda mensual (media
 * anual = 100) con la temperatura media superpuesta (AEMET) cuando hay clima.
 * Es un SNAPSHOT de cabecera: marca pico/valle y el ratio de concentración en
 * una línea. El detalle estacional fino (curva por mercado emisor, cruce con
 * EOH) vive en la pestaña Demanda y mercados — aquí no se replica.
 *
 * Consume `/api/turismo/estacionalidad` (envelope `{ok,data,...}`):
 *   data = { meses:[{mes_nombre,indice_turismo,temp_media}], pico, valle,
 *            ratio_pico_valle, clima_source }
 *
 * No hace fetch propio: recibe `data` ya resuelto por la vista padre (un solo
 * Promise.all para toda la Visión Global). Degradación honesta (CLAUDE.md):
 * sin datos → estado vacío; sin AEMET → solo barras de demanda, sin línea de
 * temperatura. Cero emojis · Unicode geométrico.
 */
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface EstacionalidadMonth {
  mes_nombre: string
  indice_turismo: number
  temp_media?: number | null
}
export interface EstacionalidadPayload {
  meses: EstacionalidadMonth[]
  pico?: { mes_nombre: string; indice_turismo: number } | null
  valle?: { mes_nombre: string; indice_turismo: number } | null
  ratio_pico_valle?: number | null
  clima_source?: 'aemet' | 'unavailable'
}

interface Props {
  data: EstacionalidadPayload | null
  accent?: string
  loading?: boolean
}

const SHORT = (m: string) => m.slice(0, 3)

export function VisionTEstacionalidad({ data, accent = '#0EA5E9', loading = false }: Props) {
  const meses = data?.meses ?? []
  const hasClima = data?.clima_source === 'aemet' && meses.some((m) => m.temp_media != null)

  const rows = meses.map((m) => ({
    mes: SHORT(m.mes_nombre),
    indice: m.indice_turismo,
    temp: m.temp_media ?? null,
  }))

  return (
    <div>
      {/* Titular pico/valle/concentración */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
        <Stat label="Pico" value={data?.pico ? `${data.pico.mes_nombre}` : '—'} sub={data?.pico ? `índice ${data.pico.indice_turismo}` : ''} color="#DC2626" />
        <Stat label="Valle" value={data?.valle ? `${data.valle.mes_nombre}` : '—'} sub={data?.valle ? `índice ${data.valle.indice_turismo}` : ''} color="#2563EB" />
        <Stat
          label="Ratio pico/valle"
          value={data?.ratio_pico_valle != null ? `${data.ratio_pico_valle.toFixed(2)}×` : '—'}
          sub="concentración estacional"
          color="#1d1d1f"
        />
      </div>

      {loading ? (
        <div style={{ height: 180, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
      ) : rows.length === 0 ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 12 }}>
          Sin datos de estacionalidad disponibles ahora.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={rows} margin={{ top: 6, right: hasClima ? 8 : 4, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="idx" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} width={34} />
            {hasClima && (
              <YAxis
                yAxisId="temp"
                orientation="right"
                tick={{ fontSize: 9, fill: '#F97316' }}
                axisLine={false}
                tickLine={false}
                width={30}
                unit="°"
              />
            )}
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #ECECEF' }}
              formatter={(v: number | string, name: string) =>
                name === 'temp' ? [`${v} °C`, 'Temp. media'] : [v, 'Índice demanda']
              }
            />
            <Bar yAxisId="idx" dataKey="indice" name="indice" fill={accent} radius={[3, 3, 0, 0]} maxBarSize={26} />
            {hasClima && (
              <Line yAxisId="temp" type="monotone" dataKey="temp" name="temp" stroke="#F97316" strokeWidth={2} dot={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        Índice de demanda mensual (media anual = 100) · INE FRONTUR + EOH.
        {hasClima
          ? ' Línea naranja: temperatura media mensual de AEMET en CCAA costera de referencia.'
          : ' Temperatura no disponible (AEMET_API_KEY ausente) · solo índice de demanda.'}
      </p>
    </div>
  )
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 9.5, color: '#9CA3AF' }}>{sub}</div>}
    </div>
  )
}

export default VisionTEstacionalidad
