'use client'
/**
 * <TiposSolPlaya /> · Turismo v3 · Sprint T7 · DATO VIVO
 *
 * Sol y playa: el corazón del modelo turístico español. Combina DOS fuentes
 * vivas del módulo Turismo:
 *   - `/api/turismo/ccaa` → subset costero (Baleares, Canarias, C. Valenciana,
 *     Andalucía, Cataluña, Murcia): pernoctaciones + cuota + YoY (Eurostat NUTS2).
 *   - `/api/turismo/estacionalidad?ccaa=` → índice de demanda mensual + temperatura
 *     media (AEMET) de la CCAA costera elegida (selector).
 *
 * Degradación honesta: si AEMET no responde, la temperatura queda '—' y se sigue
 * mostrando el índice de demanda. Si Eurostat cae, se muestra el estado de error.
 * Cero emojis · Unicode.
 */
import { useState } from 'react'
import { SerieLineChart } from '@/components/SectorialWidgets'
import {
  ACCENT,
  TiposPanelHeader,
  TiposStatGrid,
  TiposBar,
  TiposCard,
  TiposNote,
  TiposErrorState,
  useEnvelope,
  fmt,
  fmtCompact,
  type Stat,
  type BarDatum,
} from './TiposShared'

// CCAA costeras (NUTS2 ISO sin prefijo, tal como vienen en /api/turismo/ccaa)
// + clave AEMET de /api/turismo/estacionalidad.
const COSTERAS: Array<{ iso: string; aemet: string; label: string }> = [
  { iso: 'IB', aemet: 'BAL', label: 'Illes Balears' },
  { iso: 'CN', aemet: 'CAN', label: 'Canarias' },
  { iso: 'VC', aemet: 'CVA', label: 'Comunitat Valenciana' },
  { iso: 'AN', aemet: 'AND', label: 'Andalucía' },
  { iso: 'CT', aemet: 'CAT', label: 'Cataluña' },
  { iso: 'MC', aemet: 'MUR', label: 'Región de Murcia' },
]
const COSTERAS_ISO = new Set(COSTERAS.map((c) => c.iso))

interface CcaaRow {
  ccaa: string
  ccaa_iso: string
  pernoctaciones: number | null
  cuota_pct: number | null
  yoy_pct: number | null
  llegadas: number | null
}
interface CcaaData {
  rows: CcaaRow[]
  year: number | null
  total_pernoctaciones: number | null
}

interface SeasonMonth {
  mes_nombre: string
  indice_turismo: number
  temp_media?: number | null
}
interface EstacData {
  meses: SeasonMonth[]
  pico: { mes_nombre: string; indice_turismo: number }
  valle: { mes_nombre: string; indice_turismo: number }
  ratio_pico_valle: number
  ccaa_clima: string
  clima_source: 'aemet' | 'unavailable'
}

export function TiposSolPlaya() {
  const [ccaaSel, setCcaaSel] = useState<string>('AND') // clave AEMET
  const ccaaQ = useEnvelope<CcaaData>('/api/turismo/ccaa')
  const estacQ = useEnvelope<EstacData>(`/api/turismo/estacionalidad?ccaa=${ccaaSel}`)

  const costeras = (ccaaQ.data?.rows ?? []).filter((r) => COSTERAS_ISO.has(r.ccaa_iso))
  // Sumas del subset costero.
  const totalCosta = costeras.reduce((s, r) => s + (r.pernoctaciones ?? 0), 0) || null
  const cuotaCostaNac =
    totalCosta != null && ccaaQ.data?.total_pernoctaciones
      ? (totalCosta / ccaaQ.data.total_pernoctaciones) * 100
      : null
  const lider = costeras.slice().sort((a, b) => (b.pernoctaciones ?? 0) - (a.pernoctaciones ?? 0))[0]

  const stats: Stat[] = [
    {
      label: `Pernoct. CCAA costeras (${ccaaQ.data?.year ?? '—'})`,
      value: fmtCompact(totalCosta),
      foot: 'suma 6 CCAA de litoral',
    },
    {
      label: 'Cuota sobre total nacional',
      value: cuotaCostaNac != null ? `${fmt(cuotaCostaNac, 0)}%` : '—',
      foot: 'Eurostat tour_occ_nin2',
      color: '#0E7490',
    },
    {
      label: 'CCAA costera líder',
      value: lider?.ccaa ?? '—',
      foot: lider ? `${fmtCompact(lider.pernoctaciones)} pernoct.` : undefined,
      color: ACCENT,
    },
    {
      label: 'Concentración temporada (pico/valle)',
      value: estacQ.data ? `${fmt(estacQ.data.ratio_pico_valle, 1)}×` : '—',
      foot: estacQ.data ? `${estacQ.data.pico.mes_nombre} vs ${estacQ.data.valle.mes_nombre}` : 'INE FRONTUR/EOH',
      color: '#B45309',
    },
  ]

  const bars: BarDatum[] = costeras
    .filter((r) => r.pernoctaciones != null)
    .sort((a, b) => (b.pernoctaciones ?? 0) - (a.pernoctaciones ?? 0))
    .map((r) => ({ name: r.ccaa, value: r.pernoctaciones as number }))

  const ccaaFailed = ccaaQ.state === 'error' && !ccaaQ.data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TiposCard>
        <TiposPanelHeader
          glyph="☼"
          title="Sol y playa"
          desc="El segmento dominante del turismo español: el litoral mediterráneo y los archipiélagos concentran el grueso de las pernoctaciones. Se cruza la demanda territorial (Eurostat, por CCAA costera) con la estacionalidad y la temperatura (AEMET)."
          kind="live"
          degraded={estacQ.data?.clima_source === 'unavailable' || ccaaQ.env?.partial}
          fuentes={['Eurostat · tour_occ_nin2 (NUTS2)', 'INE FRONTUR/EOH', 'AEMET (clima)']}
        />
        {ccaaFailed ? (
          <TiposErrorState fuente="Eurostat pernoctaciones NUTS2" />
        ) : (
          <TiposStatGrid items={stats} loading={ccaaQ.state === 'loading' && !ccaaQ.data} />
        )}
      </TiposCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <TiposCard>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
            Pernoctaciones por CCAA costera
          </div>
          {ccaaFailed ? (
            <TiposErrorState fuente="Eurostat pernoctaciones NUTS2" />
          ) : (
            <TiposBar data={bars} unit="pernoctaciones" />
          )}
          <TiposNote>
            Sol y playa = subset costero de las pernoctaciones por CCAA (Eurostat tour_occ_nin2, NUTS2).
            Año de referencia {ccaaQ.data?.year ?? '—'}. Las cuotas YoY por comunidad se ven en la pestaña Destinos.
          </TiposNote>
        </TiposCard>

        <TiposCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f' }}>
              Estacionalidad y clima
            </div>
            <select
              value={ccaaSel}
              onChange={(e) => setCcaaSel(e.target.value)}
              aria-label="CCAA costera para el clima"
              style={{
                fontSize: 11.5,
                fontFamily: 'inherit',
                border: '1px solid #E4E4E7',
                borderRadius: 8,
                padding: '5px 8px',
                background: '#fff',
                color: '#1d1d1f',
                cursor: 'pointer',
              }}
            >
              {COSTERAS.map((c) => (
                <option key={c.aemet} value={c.aemet}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {estacQ.state === 'error' && !estacQ.data ? (
            <TiposErrorState fuente="INE FRONTUR/EOH (estacionalidad)" />
          ) : (
            <>
              <SerieLineChart
                points={(estacQ.data?.meses ?? []).map((m) => ({ t: m.mes_nombre.slice(0, 3), v: m.indice_turismo }))}
                color={ACCENT}
                height={150}
                formatY={(n) => `${n.toFixed(0)}`}
                unit="índice"
                label="Índice demanda"
              />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 6 }}>
                  Temperatura media mensual (AEMET)
                </div>
                {estacQ.data?.clima_source === 'aemet' ? (
                  <SerieLineChart
                    points={(estacQ.data?.meses ?? []).map((m) => ({ t: m.mes_nombre.slice(0, 3), v: m.temp_media ?? null }))}
                    color="#EA580C"
                    height={120}
                    formatY={(n) => `${n.toFixed(0)}°`}
                    unit="°C"
                    label="Temp. media"
                  />
                ) : (
                  <div style={{ fontSize: 11, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5 }}>
                    Temperatura no disponible (AEMET_API_KEY ausente o sin datos para esta comunidad). El índice de
                    demanda mensual se muestra igualmente.
                  </div>
                )}
              </div>
            </>
          )}
          <TiposNote>
            Índice de demanda mensual (media anual = 100) de INE FRONTUR/EOH, cruzado con la temperatura media de AEMET.
            Pico {estacQ.data?.pico.mes_nombre ?? '—'} · valle {estacQ.data?.valle.mes_nombre ?? '—'}.
          </TiposNote>
        </TiposCard>
      </div>
    </div>
  )
}

export default TiposSolPlaya
