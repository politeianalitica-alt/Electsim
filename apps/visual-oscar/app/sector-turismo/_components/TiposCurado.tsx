'use client'
/**
 * <TiposCurado /> · Turismo v3 · Sprint T7 · CURADO + DATADO
 *
 * Paneles de los tipos de turismo SIN endpoint propio de dato vivo: MICE,
 * salud/wellness, deportivo (esquí/golf), gastronómico, religioso (Camino),
 * idiomático y shopping. Cada uno se construye con fichas curadas + DATADAS
 * (fuente + fecha obligatorias · TiposCatalog) — cifras públicas verificables,
 * NUNCA inventadas (CLAUDE.md).
 *
 * Donde aplica (gastronómico, shopping), se añade un strip con el GASTO turístico
 * agregado en vivo de INE EGATUR (`/api/turismo/egatur`) para anclar el contexto
 * en dato real. EGATUR publica el gasto agregado y medio (no un desglose por
 * concepto en esta tabla); se etiqueta honestamente como gasto total/medio.
 *
 * Un único componente parametrizado por `id` → evita 7 ficheros casi idénticos
 * manteniendo "una sección por tipo". Cero emojis · Unicode.
 */
import {
  ACCENT_DARK,
  TiposPanelHeader,
  TiposStatGrid,
  TiposCard,
  TiposNote,
  TiposFicha,
  TiposFichaGrid,
  useEnvelope,
  fmt,
  fmtCompact,
  pct,
  type DataKind,
  type Stat,
  type FichaProps,
} from './TiposShared'
import {
  MICE_FICHAS,
  SALUD_FICHAS,
  DEPORTIVO_FICHAS,
  GASTRO_FICHAS,
  RELIGIOSO_FICHAS,
  IDIOMATICO_FICHAS,
  SHOPPING_FICHAS,
  type TipoId,
} from './TiposCatalog'

// ─────────────────────────────────────────────────────────────────────────
// Strip de gasto turístico en vivo (INE EGATUR) · ancla de dato real
// ─────────────────────────────────────────────────────────────────────────

interface EgaturMetric {
  last: { period: string; value: number | null } | null
  yoy_pct: number | null
  unit: string
}
interface EgaturData {
  gasto_total: EgaturMetric
  gasto_medio_persona: EgaturMetric
  gasto_medio_diario: EgaturMetric
  estancia_media: EgaturMetric
  last_period: string | null
}

function EgaturStrip({ nota }: { nota: string }) {
  const q = useEnvelope<EgaturData>('/api/turismo/egatur')
  const d = q.data
  const stats: Stat[] = [
    {
      label: `Gasto total turístico (${d?.last_period ?? '—'})`,
      value: d?.gasto_total.last?.value != null ? `${fmtCompact(d.gasto_total.last.value)} M€` : '—',
      foot: d?.gasto_total.yoy_pct != null ? `${pct(d.gasto_total.yoy_pct)} interanual` : 'INE EGATUR',
    },
    {
      label: 'Gasto medio por turista',
      value: d?.gasto_medio_persona.last?.value != null ? `${fmt(d.gasto_medio_persona.last.value, 0)} €` : '—',
      foot: 'por viaje',
      color: '#0E7490',
    },
    {
      label: 'Gasto medio diario',
      value: d?.gasto_medio_diario.last?.value != null ? `${fmt(d.gasto_medio_diario.last.value, 0)} €` : '—',
      foot: 'por turista y día',
      color: ACCENT_DARK,
    },
    {
      label: 'Estancia media',
      value: d?.estancia_media.last?.value != null ? `${fmt(d.estancia_media.last.value, 1)}` : '—',
      foot: 'noches',
      color: '#B45309',
    },
  ]
  return (
    <TiposCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f' }}>
          Gasto del turista internacional · INE EGATUR
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 999, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
          ◉ DATO VIVO
        </span>
      </div>
      <TiposStatGrid items={stats} loading={q.state === 'loading' && !q.data} />
      <TiposNote>{nota}</TiposNote>
    </TiposCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Configuración por tipo curado
// ─────────────────────────────────────────────────────────────────────────

interface CuradoConfig {
  glyph: string
  title: string
  desc: string
  kind: DataKind
  fuentes: string[]
  fichas: FichaProps[]
  /** Si true, añade el strip de gasto EGATUR en vivo. */
  egatur?: boolean
  egaturNota?: string
}

const CONFIG: Partial<Record<TipoId, CuradoConfig>> = {
  mice: {
    glyph: '◰',
    title: 'MICE / turismo de negocios',
    desc: 'Meetings, Incentives, Conferences & Exhibitions. España es de forma estable top mundial en congresos internacionales (ICCA), con Madrid y Barcelona como ciudades de referencia y dos de los mayores recintos feriales de Europa (IFEMA, Fira).',
    kind: 'curado',
    fuentes: ['ICCA', 'IFEMA Madrid', 'Fira de Barcelona', 'INE EGATUR'],
    fichas: MICE_FICHAS,
  },
  salud: {
    glyph: '✚',
    title: 'Turismo de salud y wellness',
    desc: 'Turismo médico (fertilidad, dental, cirugía) y de bienestar (balnearios, talasoterapia, spa). Un segmento de alto valor y baja estacionalidad, con España como destino europeo de referencia en reproducción asistida y termalismo.',
    kind: 'curado',
    fuentes: ['Spaincares', 'ANBAL / Imserso', 'SEF'],
    fichas: SALUD_FICHAS,
  },
  deportivo: {
    glyph: '⛷',
    title: 'Turismo deportivo · esquí y golf',
    desc: 'Nieve (Pirineos, Sierra Nevada, Cantábrico) y golf (Costa del Sol, Costa Blanca, Murcia, Canarias). Dos segmentos de gasto elevado que desestacionalizan: el esquí en invierno y el golf en otoño-primavera.',
    kind: 'curado',
    fuentes: ['ATUDEM', 'RFEG', 'Cetursa / Baqueira'],
    fichas: DEPORTIVO_FICHAS,
  },
  gastronomico: {
    glyph: '◐',
    title: 'Turismo gastronómico y enoturismo',
    desc: 'Alta cocina (≈270 restaurantes con estrella Michelin), enoturismo (Rutas del Vino de España) y producto local. La gastronomía es un motor de marca-país y de turismo de gama alta, con la restauración entre las grandes partidas del gasto.',
    kind: 'mixto',
    fuentes: ['Guía Michelin', 'ACEVIN', 'INE EGATUR'],
    fichas: GASTRO_FICHAS,
    egatur: true,
    egaturNota:
      'La restauración y la alimentación son partidas centrales del gasto turístico. EGATUR publica el gasto agregado y medio del turista internacional (no un desglose por concepto en esta tabla); aquí se ancla el contexto gastronómico en el gasto total real.',
  },
  religioso: {
    glyph: '✦',
    title: 'Turismo religioso · Camino de Santiago',
    desc: 'El Camino de Santiago es el gran activo de turismo religioso y espiritual de España, con cifras anuales en máximos históricos cercanas al medio millón de peregrinos y un peso internacional muy elevado. Se suman Semana Santa, romerías y santuarios.',
    kind: 'curado',
    fuentes: ['Oficina de Acogida al Peregrino', 'Turespaña'],
    fichas: RELIGIOSO_FICHAS,
  },
  idiomatico: {
    glyph: '◵',
    title: 'Turismo idiomático',
    desc: 'España es el principal destino mundial para aprender español. Salamanca, Madrid, Málaga, Granada y Valencia concentran la oferta acreditada; el estudiante idiomático realiza estancias largas y un gasto total por viaje elevado.',
    kind: 'curado',
    fuentes: ['Instituto Cervantes', 'FEDELE'],
    fichas: IDIOMATICO_FICHAS,
  },
  shopping: {
    glyph: '◇',
    title: 'Turismo de compras',
    desc: 'El gasto en compras (incluido el tax free de extracomunitarios) es un termómetro del turismo de gama alta. Madrid y Barcelona concentran ejes premium y outlets, con fuerte peso de visitantes de EE. UU., América Latina y Asia-Pacífico.',
    kind: 'mixto',
    fuentes: ['Global Blue', 'INE EGATUR', 'Turespaña'],
    fichas: SHOPPING_FICHAS,
    egatur: true,
    egaturNota:
      'El concepto «compras y otros» es una de las grandes partidas del gasto turístico internacional. EGATUR publica el gasto agregado y medio (no el desglose por concepto en esta tabla); el barómetro tax free de Global Blue aporta la lectura específica de shopping de lujo.',
  },
}

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────

export function TiposCurado({ id }: { id: TipoId }) {
  const cfg = CONFIG[id]
  if (!cfg) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TiposCard>
        <TiposPanelHeader glyph={cfg.glyph} title={cfg.title} desc={cfg.desc} kind={cfg.kind} fuentes={cfg.fuentes} />
        <p style={{ margin: 0, fontSize: 11, color: '#86868b', lineHeight: 1.5 }}>
          Las cifras de esta sección son públicas y están datadas con su organismo emisor y año de referencia. No se
          muestran estimaciones propias (degradación honesta · CLAUDE.md).
        </p>
      </TiposCard>

      {cfg.egatur && <EgaturStrip nota={cfg.egaturNota ?? 'INE EGATUR · gasto del turista internacional.'} />}

      <TiposCard>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
          Datos y contexto curado
        </div>
        <TiposFichaGrid>
          {cfg.fichas.map((f) => (
            <TiposFicha key={f.titulo} {...f} />
          ))}
        </TiposFichaGrid>
      </TiposCard>
    </div>
  )
}

export default TiposCurado
