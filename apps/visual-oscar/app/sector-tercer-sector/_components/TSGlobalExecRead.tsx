'use client'
/**
 * <TSGlobalExecRead /> · Tercer Sector v3 · Sprint TS3 (Visión Global)
 *
 * LECTURA EJECUTIVA del cuadro: 2-3 frases que sintetizan los snapshots vivos
 * (tamaño del sector, financiación, cooperación, licitaciones) en un veredicto
 * para el analista. NO es un LLM ni una previsión: es texto curado que ancla las
 * cifras EN VIVO cuando están disponibles y, si no, redacta honestamente sin
 * inventar números (CLAUDE.md · degradación honesta).
 *
 * Recibe las señales ya resueltas por la vista (un solo origen de datos, sin
 * re-fetch). Cero emojis · Unicode geométrico (✦).
 */
import { fmtEur, fmtInt, TS_ACCENT, TS_ACCENT_DARK } from './TSGlobalShared'

export interface ExecReadSignals {
  /** Nº de entidades del catálogo (organizaciones · catalogo_total). */
  entidades: number | null
  /** Total subvenciones concedidas (BDNS, EUR). */
  totalSubvenciones: number | null
  /** Nº de actividades IATI (solo modo datastore). */
  iatiActividades: number | null
  /** Total desembolsado cooperación (IATI, EUR). */
  iatiDesembolsado: number | null
  /** Modo IATI: datastore (con key) o registry (degradado). */
  iatiMode: 'datastore' | 'registry' | null
  /** Total de licitaciones multinivel detectadas. */
  licitacionesTotal: number | null
  /** País receptor #1 de cooperación (nombre legible). */
  topPaisCoop: string | null
}

export function TSGlobalExecRead({ signals, loading }: { signals: ExecReadSignals; loading: boolean }) {
  const {
    entidades,
    totalSubvenciones,
    iatiActividades,
    iatiDesembolsado,
    iatiMode,
    licitacionesTotal,
    topPaisCoop,
  } = signals

  // Frase 1 · tamaño + financiación del sector.
  const fraseTamano =
    entidades != null
      ? `El directorio del tercer sector reúne ${fmtInt(entidades)} entidades curadas (fundaciones, asociaciones, ONGD y economía social).`
      : 'El tercer sector español agrupa miles de fundaciones, asociaciones, ONGD y entidades de economía social.'

  const fraseFinanciacion =
    totalSubvenciones != null && totalSubvenciones > 0
      ? ` En las concesiones recientes de la BDNS clasificadas como tercer sector se identifican ${fmtEur(totalSubvenciones)} en subvenciones públicas, a los que se suman los grants de la UE y el tramo estatal del IRPF 0,7%.`
      : ' Su financiación pública combina subvenciones de la BDNS (Estado, CCAA y entes locales), grants de la UE y el tramo del IRPF 0,7% para fines sociales.'

  // Frase 2 · cooperación internacional.
  const fraseCoop =
    iatiMode === 'datastore' && iatiActividades != null
      ? `En cooperación internacional, las organizaciones españolas declaran ${fmtInt(iatiActividades)} actividades a IATI${
          iatiDesembolsado != null ? ` con ${fmtEur(iatiDesembolsado)} desembolsados` : ''
        }${topPaisCoop ? `, concentradas en países como ${topPaisCoop}` : ''}.`
      : 'La cooperación internacional declarada a IATI por las ONGD españolas requiere el Datastore (IATI_API_KEY) para cuantificar actividades y desembolsos; sin clave solo se listan las entidades reportantes.'

  // Frase 3 · licitaciones multinivel (el ángulo diferencial).
  const fraseLicitaciones =
    licitacionesTotal != null && licitacionesTotal > 0
      ? `Además, el agregador multinivel localiza ${fmtInt(licitacionesTotal)} oportunidades de licitación —de la escala autonómica a las organizaciones internacionales— con análisis de pliegos asistido por IA.`
      : 'El agregador multinivel de licitaciones rastrea oportunidades desde la escala autonómica hasta organizaciones internacionales, con análisis de pliegos asistido por IA.'

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '16px 20px',
        borderLeft: `4px solid ${TS_ACCENT}`,
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: TS_ACCENT_DARK,
        }}
      >
        <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
        Lectura ejecutiva
      </p>
      {loading ? (
        <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8' }}>Sintetizando el cuadro del sector…</p>
      ) : (
        <p style={{ margin: 0, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.6 }}>
          {fraseTamano}
          {fraseFinanciacion} {fraseCoop} {fraseLicitaciones}
        </p>
      )}
    </section>
  )
}

export default TSGlobalExecRead
