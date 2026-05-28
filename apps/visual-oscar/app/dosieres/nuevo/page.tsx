'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ── Tipos · espejo del shape del fixture (DossierCompleto) ───────────────
type TipoApartado = 'identidad' | 'trayectoria' | 'posiciones' | 'redes' | 'declaraciones' | 'controversias' | 'evidencia'
type TipoItem = 'dato' | 'declaracion' | 'evento' | 'contacto' | 'documento'

interface FormItem {
  uid: string
  tipo: TipoItem
  titulo: string
  contenido: string
  fecha: string
  fuente_url: string
  fuente_titulo: string
  tags: string[]
  nota?: number | null  // solo para apartado redes (-10 a +10)
}

interface FormApartado {
  tipo: TipoApartado
  items: FormItem[]
}

// ── Metadata de apartados (igual que detail page) ────────────────────────
const APARTADO_META: Record<TipoApartado, { label: string; help: string; color: string; bg: string }> = {
  identidad:     { label: 'Quién es',              help: 'Perfil personal, formación, datos identitarios.', color: '#1F4E8C', bg: '#EFF4FB' },
  trayectoria:   { label: 'Trayectoria',           help: 'Cargos, ascensos, cronología profesional.',        color: '#7C3AED', bg: '#F4EFFE' },
  posiciones:    { label: 'Posiciones',            help: 'Postura pública sobre temas clave, ideología.',    color: '#0F766E', bg: '#E7F5F2' },
  redes:         { label: 'Quién está cerca',      help: 'Aliados, rivales, relaciones con notas +/-N.',     color: '#0EA5E9', bg: '#E6F4FB' },
  declaraciones: { label: 'Ha dicho',              help: 'Declaraciones públicas relevantes con fuente.',    color: '#D97706', bg: '#FBF1E3' },
  controversias: { label: 'Lo que se le critica',  help: 'Casos judiciales, polémicas, escándalos.',         color: '#DC2626', bg: '#FBEAEA' },
  evidencia:     { label: 'Patrimonio',            help: 'Bienes declarados, ingresos, enlaces oficiales.',  color: '#525258', bg: '#F2F2F4' },
}

const APARTADO_ORDER: TipoApartado[] = [
  'identidad', 'trayectoria', 'posiciones', 'redes', 'declaraciones', 'controversias', 'evidencia',
]

const PARTIDOS_OPCIONES = [
  'PSOE', 'PP', 'Vox', 'Sumar', 'Podemos', 'Más Madrid',
  'ERC', 'Junts', 'EH Bildu', 'PNV', 'BNG', 'CC', 'UPN',
  'Compromís', 'IU', 'PRC', 'UPL', 'Independiente',
]

const TIPOS_ITEM_LABEL: Record<TipoItem, string> = {
  dato: 'Dato',
  declaracion: 'Declaración',
  evento: 'Evento',
  contacto: 'Contacto / relación',
  documento: 'Documento / enlace',
}

// ── Helpers ──────────────────────────────────────────────────────────────
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function emptyItem(tipo: TipoItem = 'dato'): FormItem {
  return {
    uid: uid(),
    tipo,
    titulo: '',
    contenido: '',
    fecha: '',
    fuente_url: '',
    fuente_titulo: '',
    tags: [],
    nota: null,
  }
}

// Convierte un item con nota (-10..+10) al formato "**Cargo** (nota +N/10) — Justif"
function applyNotaToContenido(item: FormItem): string {
  if (item.nota === null || item.nota === undefined) return item.contenido
  const sign = item.nota >= 0 ? '+' : '-'
  // Si el contenido ya tiene formato Feijóo, reemplaza la nota
  const stripped = item.contenido.replace(/\*\*[^*]+\*\*\s*\(nota\s*[+\-]?\d+\/10\)\s*[—\-]?\s*/, '')
  const cargo = item.titulo || 'Relación'
  return `**${cargo}** (nota ${sign}${Math.abs(item.nota)}/10)${stripped ? ' — ' + stripped : ''}`
}

function notaColor(n: number): string {
  if (n >= 7) return '#16A34A'
  if (n >= 3) return '#84CC16'
  if (n >= -2) return '#9CA3AF'
  if (n >= -6) return '#F97316'
  return '#DC2626'
}

function notaLabel(n: number): string {
  if (n >= 7) return 'Aliado fuerte'
  if (n >= 3) return 'Afín'
  if (n >= -2) return 'Neutral'
  if (n >= -6) return 'Tensión'
  return 'Enfrentamiento'
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function NuevoDossierPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  // Datos básicos
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [slugAutogen, setSlugAutogen] = useState(true)
  const [alias, setAlias] = useState('')
  const [cargo, setCargo] = useState('')
  const [partido, setPartido] = useState('')
  const [bioCorta, setBioCorta] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [fuentePrincipal, setFuentePrincipal] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  // Apartados — uno por cada tipo (vacío al inicio salvo identidad con 1 item)
  const [apartados, setApartados] = useState<FormApartado[]>([
    { tipo: 'identidad', items: [emptyItem()] },
  ])
  const [apartadoActivo, setApartadoActivo] = useState<TipoApartado>('identidad')

  // UI: preview, copy, save
  const [preview, setPreview] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Slug derivado del nombre si está en modo auto
  useEffect(() => {
    if (slugAutogen) setSlug(slugify(nombre))
  }, [nombre, slugAutogen])

  // Tags como array
  const tagsArr = useMemo(
    () => tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    [tagsInput],
  )

  // Asegurar que existe el apartado activo (lo añade si no está)
  const ensureApartado = (tipo: TipoApartado) => {
    setApartados(prev => prev.some(a => a.tipo === tipo) ? prev : [...prev, { tipo, items: [] }])
  }
  const apartadoActual = apartados.find(a => a.tipo === apartadoActivo)

  // Item helpers
  const addItem = () => {
    ensureApartado(apartadoActivo)
    setApartados(prev => prev.map(a =>
      a.tipo === apartadoActivo
        ? { ...a, items: [...a.items, emptyItem(apartadoActivo === 'redes' ? 'contacto' : 'dato')] }
        : a,
    ))
  }
  const updateItem = (uidVal: string, patch: Partial<FormItem>) => {
    setApartados(prev => prev.map(a => ({
      ...a,
      items: a.items.map(it => it.uid === uidVal ? { ...it, ...patch } : it),
    })))
  }
  const removeItem = (uidVal: string) => {
    setApartados(prev => prev.map(a => ({
      ...a,
      items: a.items.filter(it => it.uid !== uidVal),
    })))
  }

  // Construir el JSON final con shape DossierCompleto
  const dossierJSON = useMemo(() => {
    const tipo = (() => {
      // Inferir tipo: si partido → político; si tags incluye empresa/ibex35 → actor
      if (partido && partido !== 'Independiente') return 'politico'
      if (tagsArr.some(t => /empresa|ibex35|directivo|ceo|fondo|familia/i.test(t))) return 'actor'
      return 'politico'
    })()
    return {
      slug: slug || slugify(nombre),
      tipo,
      nombre,
      alias: alias || null,
      cargo: cargo || null,
      partido: partido === 'Independiente' ? null : (partido || null),
      foto_url: fotoUrl || null,
      bio_corta: bioCorta || null,
      tags: tagsArr,
      fuente_principal: fuentePrincipal || null,
      confidence: 0.8,
      completeness: Math.min(1, apartados.reduce((s, a) => s + a.items.length, 0) / 10),
      apartados: apartados
        .filter(a => a.items.length > 0)
        .map(a => ({
          tipo: a.tipo,
          titulo: a.tipo === 'redes' ? 'Relaciones políticas' : null,
          resumen: null,
          orden: APARTADO_ORDER.indexOf(a.tipo),
          items: a.items.map((it, i) => ({
            tipo: it.tipo,
            titulo: it.titulo || null,
            contenido: a.tipo === 'redes' && it.nota !== null && it.nota !== undefined
              ? applyNotaToContenido(it)
              : it.contenido,
            fecha: it.fecha || null,
            fuente_url: it.fuente_url || null,
            fuente_titulo: it.fuente_titulo || null,
            tags: it.nota !== null && it.nota !== undefined
              ? [...it.tags, `nota-${it.nota >= 0 ? '+' : '-'}${Math.abs(it.nota)}`]
              : it.tags,
            orden: i,
          })),
        })),
    }
  }, [slug, nombre, alias, cargo, partido, fotoUrl, bioCorta, tagsArr, fuentePrincipal, apartados])

  const validacion = useMemo(() => {
    const errs: string[] = []
    if (!nombre.trim()) errs.push('El nombre completo es obligatorio.')
    if (!slug.trim()) errs.push('El slug es obligatorio (se autogenera del nombre).')
    if (apartados.every(a => a.items.length === 0)) errs.push('Añade al menos un item en algún apartado.')
    return errs
  }, [nombre, slug, apartados])

  const totalItems = apartados.reduce((s, a) => s + a.items.length, 0)

  // Acciones
  const copyJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(dossierJSON, null, 2))
      setSavedMsg('JSON copiado al portapapeles')
      setTimeout(() => setSavedMsg(''), 2400)
    } catch {
      setSavedMsg('No se pudo copiar (usa el botón descargar)')
      setTimeout(() => setSavedMsg(''), 3000)
    }
  }
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(dossierJSON, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug || 'dossier'}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSavedMsg('JSON descargado')
    setTimeout(() => setSavedMsg(''), 2400)
  }
  const saveLocal = () => {
    try {
      const key = `dossier-borrador-${slug || 'sin-slug'}`
      localStorage.setItem(key, JSON.stringify(dossierJSON))
      setSavedMsg(`Borrador guardado: ${key}`)
      setTimeout(() => setSavedMsg(''), 2400)
    } catch {
      setSavedMsg('No se pudo guardar en localStorage')
      setTimeout(() => setSavedMsg(''), 3000)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#FBFBFD', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 80px' }}>
        <nav style={{ marginBottom: 16, fontSize: 12 }}>
          <Link href="/dosieres" style={{ color: '#86868b', textDecoration: 'none' }}>← Volver a Personas</Link>
        </nav>

        {/* Hero */}
        <header style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 10, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Crear nuevo dossier
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0 6px', color: '#1d1d1f' }}>
            {nombre || 'Nuevo dossier'}
          </h1>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, maxWidth: 720, lineHeight: 1.5 }}>
            Rellena los datos básicos y añade items en los apartados que apliquen.
            El JSON resultante se puede copiar, descargar o guardar como borrador local.
          </p>
        </header>

        {/* ═══ Datos básicos ═══ */}
        <Section title="Datos básicos">
          <Grid2>
            <Field label="Nombre completo *" required>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. María Jesús Montero Cuadrado"
                style={inputStyle()}
              />
            </Field>
            <Field label="Alias / nombre corto">
              <input
                type="text"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                placeholder="Ej. Montero"
                style={inputStyle()}
              />
            </Field>
          </Grid2>

          <Field label="Slug (URL)" hint="Se autogenera desde el nombre. Click 'editar' para modificarlo a mano.">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={slug}
                onChange={e => { setSlugAutogen(false); setSlug(e.target.value) }}
                disabled={slugAutogen}
                style={{ ...inputStyle(), opacity: slugAutogen ? 0.6 : 1, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setSlugAutogen(s => !s)}
                style={btnSecondaryStyle()}
              >
                {slugAutogen ? 'Editar' : 'Auto'}
              </button>
            </div>
          </Field>

          <Grid2>
            <Field label="Cargo actual">
              <input
                type="text"
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                placeholder="Ej. Vicepresidenta primera y ministra de Hacienda"
                style={inputStyle()}
              />
            </Field>
            <Field label="Partido / vinculación">
              <select
                value={partido}
                onChange={e => setPartido(e.target.value)}
                style={inputStyle()}
              >
                <option value="">— elegir —</option>
                {PARTIDOS_OPCIONES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </Grid2>

          <Field label="Bio corta (1-3 frases de presentación)">
            <textarea
              value={bioCorta}
              onChange={e => setBioCorta(e.target.value)}
              rows={3}
              placeholder="Quién es y por qué importa. Aparecerá como subtítulo del dossier."
              style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          <Grid2>
            <Field label="Foto (URL)">
              <input
                type="url"
                value={fotoUrl}
                onChange={e => setFotoUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle()}
              />
            </Field>
            <Field label="Fuente principal (URL)">
              <input
                type="url"
                value={fuentePrincipal}
                onChange={e => setFuentePrincipal(e.target.value)}
                placeholder="Web oficial, biografía, BOE..."
                style={inputStyle()}
              />
            </Field>
          </Grid2>

          <Field label="Tags (separados por coma)" hint="Ej. ministra, hacienda, andalucía">
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="tag1, tag2, tag3"
              style={inputStyle()}
            />
            {tagsArr.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {tagsArr.map(t => (
                  <span key={t} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 4, background: '#F4F4F6', color: '#525258' }}>{t}</span>
                ))}
              </div>
            )}
          </Field>
        </Section>

        {/* ═══ Apartados ═══ */}
        <Section title={`Apartados (${totalItems} items totales)`}>
          {/* Tabs apartados */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14, borderBottom: '1px solid #ECECEF', paddingBottom: 10 }}>
            {APARTADO_ORDER.map(t => {
              const ap = apartados.find(a => a.tipo === t)
              const count = ap ? ap.items.length : 0
              const meta = APARTADO_META[t]
              const active = apartadoActivo === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setApartadoActivo(t); ensureApartado(t) }}
                  style={{
                    padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${active ? meta.color : '#ECECEF'}`,
                    background: active ? meta.color : '#fff',
                    color: active ? '#fff' : '#1d1d1f',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 120ms',
                  }}
                >
                  {meta.label}
                  {count > 0 && (
                    <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Help text del apartado activo */}
          <p style={{ fontSize: 12, color: '#6e6e73', margin: '0 0 14px', fontStyle: 'italic' }}>
            {APARTADO_META[apartadoActivo].help}
          </p>

          {/* Items del apartado activo */}
          {apartadoActual?.items.length === 0 || !apartadoActual ? (
            <div style={{ padding: 18, background: '#FBFBFD', borderRadius: 8, textAlign: 'center', color: '#86868b', fontSize: 13 }}>
              Aún no hay items en este apartado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {apartadoActual.items.map((item, idx) => (
                <ItemEditor
                  key={item.uid}
                  item={item}
                  idx={idx}
                  isRedes={apartadoActivo === 'redes'}
                  meta={APARTADO_META[apartadoActivo]}
                  onChange={patch => updateItem(item.uid, patch)}
                  onRemove={() => removeItem(item.uid)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addItem}
            style={{
              marginTop: 12, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: `1px dashed ${APARTADO_META[apartadoActivo].color}80`,
              background: APARTADO_META[apartadoActivo].bg,
              color: APARTADO_META[apartadoActivo].color,
              cursor: 'pointer', fontFamily: 'inherit', width: '100%',
            }}
          >
            + Añadir item a "{APARTADO_META[apartadoActivo].label}"
          </button>
        </Section>

        {/* ═══ Validación + acciones ═══ */}
        {validacion.length > 0 && (
          <div style={{ background: '#FFF4F4', border: '1px solid #FCDADA', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <strong style={{ fontSize: 12, color: '#DC2626' }}>Atención:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#7B1D1D' }}>
              {validacion.map(e => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        <Section title="Guardar / exportar">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={copyJSON}
              disabled={validacion.length > 0}
              style={{ ...btnPrimaryStyle(), opacity: validacion.length ? 0.5 : 1 }}
            >
              Copiar JSON
            </button>
            <button
              type="button"
              onClick={downloadJSON}
              disabled={validacion.length > 0}
              style={{ ...btnSecondaryStyle(), opacity: validacion.length ? 0.5 : 1 }}
            >
              Descargar .json
            </button>
            <button
              type="button"
              onClick={saveLocal}
              disabled={validacion.length > 0}
              style={{ ...btnSecondaryStyle(), opacity: validacion.length ? 0.5 : 1 }}
            >
              Guardar borrador local
            </button>
            <button
              type="button"
              onClick={() => setPreview(p => !p)}
              style={btnSecondaryStyle()}
            >
              {preview ? 'Ocultar' : 'Ver'} JSON
            </button>
          </div>

          {savedMsg && (
            <p style={{ marginTop: 10, fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
              ✓ {savedMsg}
            </p>
          )}

          {preview && (
            <pre style={{
              marginTop: 14, padding: 14, background: '#1d1d1f', color: '#e2e2e7',
              borderRadius: 10, fontSize: 11, overflow: 'auto', maxHeight: 400, lineHeight: 1.55,
            }}>
              {JSON.stringify(dossierJSON, null, 2)}
            </pre>
          )}

          <p style={{ marginTop: 14, fontSize: 11.5, color: '#86868b', lineHeight: 1.5 }}>
            <strong>Siguiente paso:</strong> añade el JSON resultante a{' '}
            <code style={{ background: '#F4F4F6', padding: '1px 5px', borderRadius: 3 }}>
              data/ibex35/conexos.json
            </code>{' '}
            (si es actor/empresa) o crea un PR con el nuevo seed. Cuando se cargue a la BD
            mediante <code style={{ background: '#F4F4F6', padding: '1px 5px', borderRadius: 3 }}>
              scripts/migrate_dossieres_to_unified.py
            </code>, aparecerá automáticamente en este listado.
          </p>
        </Section>
      </main>
    </div>
  )
}

// ── Subcomponentes ───────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#fff', borderRadius: 14, border: '1px solid #ECECEF',
      padding: '20px 24px', marginBottom: 16,
    }}>
      <h2 style={{
        fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: '0 0 14px',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{title}</h2>
      {children}
    </section>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 }}>
      {children}
    </div>
  )
}

function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column' }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#525258', marginBottom: 4, letterSpacing: '0.02em' }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 10.5, color: '#86868b', margin: '4px 0 0', fontStyle: 'italic' }}>{hint}</p>}
    </div>
  )
}

function ItemEditor({
  item, idx, isRedes, meta, onChange, onRemove,
}: {
  item: FormItem
  idx: number
  isRedes: boolean
  meta: { color: string; bg: string }
  onChange: (patch: Partial<FormItem>) => void
  onRemove: () => void
}) {
  const [showTags, setShowTags] = useState(item.tags.length > 0)

  return (
    <div style={{
      borderLeft: `3px solid ${meta.color}`, paddingLeft: 14, paddingBottom: 6,
      background: meta.bg + '40', borderRadius: '0 8px 8px 0', padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: meta.color, letterSpacing: '0.04em' }}>
          ITEM {idx + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'transparent', border: 'none', color: '#DC2626',
            fontSize: 11, cursor: 'pointer', fontWeight: 600,
          }}
        >
          Eliminar
        </button>
      </div>

      <Grid2>
        <Field label="Título">
          <input
            type="text"
            value={item.titulo}
            onChange={e => onChange({ titulo: e.target.value })}
            placeholder={isRedes ? 'Nombre del contacto' : 'Título del dato/evento'}
            style={inputStyle()}
          />
        </Field>
        <Field label="Tipo">
          <select
            value={item.tipo}
            onChange={e => onChange({ tipo: e.target.value as TipoItem })}
            style={inputStyle()}
          >
            {Object.entries(TIPOS_ITEM_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </Grid2>

      {/* Slider de nota solo para apartado redes */}
      {isRedes && (
        <Field label={`Nota analítica · ${item.nota === null || item.nota === undefined ? 'sin valorar' : `${item.nota >= 0 ? '+' : ''}${item.nota}/10 (${notaLabel(item.nota)})`}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min={-10} max={10} step={1}
              value={item.nota ?? 0}
              onChange={e => onChange({ nota: parseInt(e.target.value, 10) })}
              style={{ flex: 1, accentColor: item.nota !== null && item.nota !== undefined ? notaColor(item.nota) : '#9CA3AF' }}
            />
            <button
              type="button"
              onClick={() => onChange({ nota: item.nota === null ? 0 : null })}
              style={{ ...btnSecondaryStyle(), padding: '4px 10px', fontSize: 11 }}
            >
              {item.nota === null || item.nota === undefined ? 'Activar' : 'Sin nota'}
            </button>
          </div>
          {item.nota !== null && item.nota !== undefined && (
            <div style={{
              fontSize: 11.5, color: notaColor(item.nota), fontWeight: 700, marginTop: 4,
              padding: '2px 8px', display: 'inline-block', borderRadius: 4,
              background: notaColor(item.nota) + '20',
            }}>
              {notaLabel(item.nota)}
            </div>
          )}
        </Field>
      )}

      <Field label={isRedes ? 'Justificación / contexto' : 'Contenido'}>
        <textarea
          value={item.contenido}
          onChange={e => onChange({ contenido: e.target.value })}
          rows={isRedes ? 2 : 3}
          placeholder={
            isRedes
              ? 'Por qué la relación se valora así. (Aparecerá tras "(nota +N/10) —")'
              : 'Descripción del item. Markdown ligero soportado: **negrita**.'
          }
          style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      <Grid2>
        <Field label="Fecha (opcional)">
          <input
            type="text"
            value={item.fecha}
            onChange={e => onChange({ fecha: e.target.value })}
            placeholder="YYYY-MM-DD"
            style={inputStyle()}
          />
        </Field>
        <Field label="URL fuente (opcional)">
          <input
            type="url"
            value={item.fuente_url}
            onChange={e => onChange({ fuente_url: e.target.value })}
            placeholder="https://..."
            style={inputStyle()}
          />
        </Field>
      </Grid2>

      {/* Tags toggle */}
      <button
        type="button"
        onClick={() => setShowTags(s => !s)}
        style={{
          background: 'transparent', border: 'none', color: meta.color,
          fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: '4px 0',
        }}
      >
        {showTags ? '− Tags' : '+ Tags'}
      </button>
      {showTags && (
        <input
          type="text"
          value={item.tags.join(', ')}
          onChange={e => onChange({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
          placeholder="tag1, tag2"
          style={inputStyle()}
        />
      )}
    </div>
  )
}

// ── Estilos compartidos ──────────────────────────────────────────────────
function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 11px', fontSize: 13,
    border: '1px solid #ECECEF', borderRadius: 8,
    fontFamily: 'inherit', outline: 'none',
    background: '#fff', color: '#1d1d1f',
  }
}
function btnPrimaryStyle(): React.CSSProperties {
  return {
    background: '#0071e3', border: 'none', color: '#fff',
    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
function btnSecondaryStyle(): React.CSSProperties {
  return {
    background: '#fff', border: '1px solid #ECECEF', color: '#1d1d1f',
    padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
