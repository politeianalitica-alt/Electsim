'use client'
/**
 * <CtxInformesBiblioteca /> · Tercer Sector v3 · Cockpit W2 · Contexto e impacto
 *
 * Biblioteca CURADA de informes y evidencia: responde a "¿qué informe/dataset
 * cito para justificar un proyecto?". Consume el endpoint EXISTENTE
 * `GET /api/tercer-sector/informes` → `{ ok, data:{ informes, total, facetas } }`
 * (catálogo estático con entidad/año/URL real; regla CLAUDE.md: nada sin cita,
 * no se inventan URLs).
 *
 * Filtros desde las `facetas` del propio endpoint (tema / año / entidad / ámbito
 * / tipo + búsqueda de texto). Cada card muestra resumen + «por qué importa»
 * (`utilidad_analista`) + botón «abrir informe» (URL real) + botón «copiar cita»
 * (copia "{titulo} — {entidad} ({anio}). {url}" al portapapeles).
 *
 * Re-fetch en cada cambio de filtro (el endpoint ya filtra server-side y es
 * estático/cacheado). Degradación honesta: error → mensaje sobrio, sin inventar.
 *
 * Cero emojis · Unicode geométrico (⬡ ⊞ → ✓). Mismo lenguaje visual sobrio.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

const ACCENT = '#16A34A'

// ─────────────────────────────────────────────────────────────────────────
// Contrato del endpoint (subset · ver informes-catalog.ts). Plano y local.
// ─────────────────────────────────────────────────────────────────────────

type InformeAmbito = 'espana' | 'ccaa' | 'ue' | 'global'
type InformeTipo = 'informe' | 'dataset' | 'memoria' | 'estadistica' | 'normativa'

interface InformeTS {
  id: string
  titulo: string
  entidad: string
  anio: number
  ambito: InformeAmbito
  temas: string[]
  url: string
  tipo: InformeTipo
  resumen: string
  utilidad_analista: string
}

interface Facetas {
  temas: string[]
  entidades: string[]
  anios: number[]
  ambitos: InformeAmbito[]
  tipos: InformeTipo[]
}

interface InformesEnvelope {
  ok: boolean
  data: {
    informes: InformeTS[]
    total: number
    catalogo_total?: number
    facetas: Facetas
  } | null
  error?: string
}

type LoadState = 'loading' | 'ready' | 'error'

interface Filtros {
  tema: string
  entidad: string
  ambito: string
  tipo: string
  anio: string
  q: string
}

const EMPTY_FILTROS: Filtros = { tema: '', entidad: '', ambito: '', tipo: '', anio: '', q: '' }

// Etiquetas legibles para enumeraciones (las facetas vienen como claves).
const AMBITO_LABEL: Record<string, string> = {
  espana: 'España',
  ccaa: 'CCAA',
  ue: 'Unión Europea',
  global: 'Global',
}
const TIPO_LABEL: Record<string, string> = {
  informe: 'Informe',
  memoria: 'Memoria',
  estadistica: 'Estadística',
  dataset: 'Dataset',
  normativa: 'Normativa',
}
/** Tema en snake_case → texto legible. */
function temaLabel(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Cita en formato copiable: "{titulo} — {entidad} ({anio}). {url}". */
function citaDe(i: InformeTS): string {
  return `${i.titulo} — ${i.entidad} (${i.anio}). ${i.url}`
}

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────

export function CtxInformesBiblioteca() {
  const [informes, setInformes] = useState<InformeTS[]>([])
  const [facetas, setFacetas] = useState<Facetas | null>(null)
  const [total, setTotal] = useState<number>(0)
  const [catalogoTotal, setCatalogoTotal] = useState<number | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [filtros, setFiltros] = useState<Filtros>(EMPTY_FILTROS)
  // Id del informe cuya cita acabamos de copiar (feedback efímero).
  const [copiadoId, setCopiadoId] = useState<string | null>(null)
  const copiadoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-fetch en cada cambio de filtro. El endpoint filtra server-side.
  useEffect(() => {
    const ctrl = new AbortController()
    async function load() {
      setState((prev) => (prev === 'ready' ? 'ready' : 'loading'))
      try {
        const qs = new URLSearchParams()
        if (filtros.tema) qs.set('tema', filtros.tema)
        if (filtros.entidad) qs.set('entidad', filtros.entidad)
        if (filtros.ambito) qs.set('ambito', filtros.ambito)
        if (filtros.tipo) qs.set('tipo', filtros.tipo)
        if (filtros.anio) qs.set('anio', filtros.anio)
        if (filtros.q.trim()) qs.set('q', filtros.q.trim())
        const url = `/api/tercer-sector/informes${qs.toString() ? `?${qs.toString()}` : ''}`
        const res = await fetch(url, { signal: ctrl.signal })
        const json: InformesEnvelope = await res.json()
        if (ctrl.signal.aborted) return
        if (!json.ok || !json.data) {
          setState('error')
          return
        }
        setInformes(json.data.informes ?? [])
        setTotal(json.data.total ?? 0)
        // Las facetas son globales (no dependen del filtro): se fijan una vez.
        if (json.data.facetas) setFacetas((prev) => prev ?? json.data!.facetas)
        if (json.data.catalogo_total != null) setCatalogoTotal((prev) => prev ?? json.data!.catalogo_total ?? null)
        setState('ready')
      } catch {
        if (ctrl.signal.aborted) return
        setState('error')
      }
    }
    load()
    return () => ctrl.abort()
  }, [filtros])

  useEffect(() => {
    return () => {
      if (copiadoTimer.current) clearTimeout(copiadoTimer.current)
    }
  }, [])

  const hayFiltrosActivos = useMemo(
    () => Object.values(filtros).some((v) => v.trim() !== ''),
    [filtros],
  )

  function set<K extends keyof Filtros>(key: K, value: string) {
    setFiltros((f) => ({ ...f, [key]: value }))
  }

  async function copiarCita(i: InformeTS) {
    const cita = citaDe(i)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cita)
      } else {
        // Fallback para contextos sin Clipboard API.
        const ta = document.createElement('textarea')
        ta.value = cita
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiadoId(i.id)
      if (copiadoTimer.current) clearTimeout(copiadoTimer.current)
      copiadoTimer.current = setTimeout(() => setCopiadoId(null), 1800)
    } catch {
      // Si el portapapeles falla, no rompemos la UI; el usuario tiene la URL.
    }
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header style={{ marginBottom: 14 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: '-0.013em',
            color: '#1d1d1f',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span aria-hidden="true" style={{ color: ACCENT, fontSize: 13 }}>⬡</span>
          Biblioteca de informes y evidencia
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Catálogo curado y datado · cada pieza con entidad, año y URL real para citar
          {catalogoTotal != null && <span> · {catalogoTotal} recursos</span>}
        </p>
      </header>

      {/* Filtros · facetas del endpoint */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <SearchInput value={filtros.q} onChange={(v) => set('q', v)} />
        <Select label="Tema" value={filtros.tema} onChange={(v) => set('tema', v)} options={(facetas?.temas ?? []).map((t) => ({ value: t, label: temaLabel(t) }))} />
        <Select label="Entidad" value={filtros.entidad} onChange={(v) => set('entidad', v)} options={(facetas?.entidades ?? []).map((e) => ({ value: e, label: e }))} />
        <Select label="Ámbito" value={filtros.ambito} onChange={(v) => set('ambito', v)} options={(facetas?.ambitos ?? []).map((a) => ({ value: a, label: AMBITO_LABEL[a] ?? a }))} />
        <Select label="Tipo" value={filtros.tipo} onChange={(v) => set('tipo', v)} options={(facetas?.tipos ?? []).map((t) => ({ value: t, label: TIPO_LABEL[t] ?? t }))} />
        <Select label="Año" value={filtros.anio} onChange={(v) => set('anio', v)} options={(facetas?.anios ?? []).map((a) => ({ value: String(a), label: String(a) }))} />
      </div>

      {/* Barra de estado del resultado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: '#6e6e73' }}>
          {state === 'ready' ? (
            <>
              <strong style={{ color: '#1d1d1f' }}>{total}</strong> resultado{total === 1 ? '' : 's'}
              {hayFiltrosActivos ? ' con los filtros activos' : ''}
            </>
          ) : state === 'loading' ? (
            'Cargando biblioteca…'
          ) : (
            ''
          )}
        </span>
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={() => setFiltros(EMPTY_FILTROS)}
            style={{
              border: '1px solid #ECECEF',
              background: '#FBFBFC',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 10.5,
              fontWeight: 600,
              color: '#3a3a3c',
              cursor: 'pointer',
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Contenido */}
      {state === 'error' ? (
        <p style={{ margin: 0, fontSize: 12.5, color: '#6e6e73', lineHeight: 1.55 }}>
          No se pudo cargar la biblioteca de informes en este momento. Reintenta más tarde; el catálogo no se inventa.
        </p>
      ) : state === 'loading' ? (
        <SkeletonGrid />
      ) : informes.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: '#6e6e73', lineHeight: 1.55 }}>
          Ningún recurso coincide con los filtros seleccionados. Prueba a ampliar el tema, el año o limpia los filtros.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {informes.map((i) => (
            <InformeCard key={i.id} informe={i} copiado={copiadoId === i.id} onCopiar={() => copiarCita(i)} onTema={(t) => set('tema', t)} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-componentes (privados)
// ─────────────────────────────────────────────────────────────────────────

/** Card de un informe · resumen + por qué importa + abrir + copiar cita. */
function InformeCard({
  informe: i,
  copiado,
  onCopiar,
  onTema,
}: {
  informe: InformeTS
  copiado: boolean
  onCopiar: () => void
  onTema: (tema: string) => void
}) {
  return (
    <article
      style={{
        border: '1px solid #ECECEF',
        borderRadius: 12,
        padding: '14px 16px',
        background: '#FBFBFC',
        borderTop: `3px solid ${ACCENT}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Chips de tipo + ámbito + año */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <Chip>{TIPO_LABEL[i.tipo] ?? i.tipo}</Chip>
        <Chip>{AMBITO_LABEL[i.ambito] ?? i.ambito}</Chip>
        <Chip mono>{i.anio}</Chip>
      </div>

      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 13.5,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: '#1d1d1f',
          lineHeight: 1.3,
        }}
      >
        {i.titulo}
      </h3>
      <p style={{ margin: '4px 0 0', fontSize: 10.5, fontWeight: 600, color: ACCENT }}>{i.entidad}</p>

      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#3a3a3c', lineHeight: 1.55 }}>{i.resumen}</p>

      {/* Por qué importa (utilidad_analista) */}
      <div
        style={{
          margin: '10px 0 0',
          background: '#fff',
          border: '1px solid #ECECEF',
          borderRadius: 9,
          padding: '8px 10px',
          borderLeft: `3px solid ${ACCENT}`,
        }}
      >
        <p style={{ margin: '0 0 3px', fontSize: 8.5, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
          Por qué importa
        </p>
        <p style={{ margin: 0, fontSize: 11.5, color: '#3a3a3c', lineHeight: 1.5 }}>{i.utilidad_analista}</p>
      </div>

      {/* Temas como chips clicables (refiltran) */}
      {i.temas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '10px 0 0' }}>
          {i.temas.slice(0, 5).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTema(t)}
              title={`Filtrar por tema: ${temaLabel(t)}`}
              style={{
                border: '1px solid #ECECEF',
                background: '#fff',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 9.5,
                color: '#6e6e73',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {temaLabel(t)}
            </button>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <a
          href={i.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: '1 1 auto',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            background: ACCENT,
            borderRadius: 8,
            padding: '7px 12px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Abrir informe →
        </a>
        <button
          type="button"
          onClick={onCopiar}
          title="Copiar la cita al portapapeles"
          aria-live="polite"
          style={{
            flex: '0 0 auto',
            fontSize: 11,
            fontWeight: 700,
            color: copiado ? ACCENT : '#3a3a3c',
            background: copiado ? '#ECFDF5' : '#fff',
            border: `1px solid ${copiado ? ACCENT : '#ECECEF'}`,
            borderRadius: 8,
            padding: '7px 12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span aria-hidden="true">{copiado ? '✓' : '⊞'}</span>
          {copiado ? 'Cita copiada' : 'Copiar cita'}
        </button>
      </div>
    </article>
  )
}

/** Chip neutro pequeño. */
function Chip({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: mono ? 'none' : 'uppercase',
        letterSpacing: '0.05em',
        color: '#6e6e73',
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 6,
        padding: '2px 7px',
        fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
      }}
    >
      {children}
    </span>
  )
}

/** Input de búsqueda de texto libre. */
function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 8.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buscar</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Título, entidad, tema…"
        style={{
          border: '1px solid #ECECEF',
          borderRadius: 8,
          padding: '6px 9px',
          fontSize: 12,
          color: '#1d1d1f',
          background: '#fff',
          outline: 'none',
        }}
      />
    </label>
  )
}

/** Select de faceta (incluye opción "Todas/Todos"). */
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 8.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: '1px solid #ECECEF',
          borderRadius: 8,
          padding: '6px 9px',
          fontSize: 12,
          color: value ? '#1d1d1f' : '#6e6e73',
          background: '#fff',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Skeleton mientras carga la primera vez. */
function SkeletonGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 220,
            border: '1px solid #ECECEF',
            borderRadius: 12,
            background: 'linear-gradient(180deg, #FBFBFC 0%, #F4F4F6 100%)',
            borderTop: `3px solid ${ACCENT}33`,
          }}
        />
      ))}
    </div>
  )
}

export default CtxInformesBiblioteca
