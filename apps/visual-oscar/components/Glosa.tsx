'use client'
/**
 * <Glosa term="PVPC" /> · término del glosario con tooltip al hover.
 *
 * Sprint Quality-Q-B.2 · cierra el gap de la auditoría de contenido
 * (docs/audits/2026-05-31_content_audit_top5_modulos.md):
 *
 *   "El usuario ve 50+ acrónimos sin glosa la 1ª vez (BERD, NAIRU, FCI, ULC,
 *   REER, MAPE, V-Dem, SIPRI, ACLED, GDELT, PVPC, ESIOS, OMIE, IRC, IRPC...).
 *   Cada uno explicado caso por caso ⇒ inviable. Necesario glosario único."
 *
 * Diseño:
 *
 *   1. El término se renderiza con underline punteado discreto (4px offset)
 *      y `cursor: help` para anunciar que es interactivo (WCAG 1.4.13).
 *
 *   2. El tooltip aparece al hover/focus con la definición corta (≤140 chars).
 *      Posición: encima del término · ancho fijo 260 px · z-index alto.
 *
 *   3. El tooltip incluye un enlace a `/glosario#<term>` para ampliar
 *      (definición extendida + fuente + URL oficial cuando aplica).
 *
 *   4. Si el término NO existe en el glosario, renderiza el texto en plano
 *      (sin underline, sin tooltip) para evitar promesas rotas en UI.
 *      Útil para añadir nuevos términos sin que rompa nada.
 *
 *   5. Accesibilidad:
 *      - role="button" + tabIndex={0} para entrar en el orden de tabulación
 *      - aria-describedby apunta al tooltip
 *      - Enter/Space abren el tooltip (sticky · click fuera lo cierra)
 *      - El tooltip respeta `prefers-reduced-motion` (sin fade-in)
 *
 *   6. SSR-safe: solo usa `useState` + CSS · no toca window/document hasta
 *      el primer interaction.
 *
 * Uso típico:
 *
 *   <HeroKPI label={<><Glosa term="PVPC" /> · tarifa hogar</>} value={...} />
 *   <p>El BERD (<Glosa term="BERD" />) español ronda 0,7% PIB...</p>
 *
 * No usar para texto largo. Para definir un concepto en un párrafo, mejor
 * usar un componente de prosa explícito (TabExplainerBlock, MethodologyNote).
 */
import Link from 'next/link'
import { useState, useId, useRef, useEffect, KeyboardEvent } from 'react'
import { findGlossaryEntry, type GlossaryEntry } from '@/lib/glossary'

interface Props {
  /**
   * Término canónico del glosario (case-insensitive · acepta alias).
   * Si no existe, se renderiza como texto plano.
   */
  term: string
  /**
   * Texto opcional a mostrar en lugar del término canónico.
   * Útil para mantener el flow gramatical: <Glosa term="BERD">su BERD</Glosa>.
   */
  children?: React.ReactNode
  /** Variante visual · `inline` (default) o `kpi` (más sutil para usar en labels). */
  variant?: 'inline' | 'kpi'
}

export default function Glosa({ term, children, variant = 'inline' }: Props) {
  const entry = findGlossaryEntry(term)
  const [open, setOpen] = useState(false)
  const [sticky, setSticky] = useState(false)
  const tooltipId = useId()
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const label = children ?? entry?.term ?? term

  // Click fuera cierra el tooltip cuando está en modo sticky.
  useEffect(() => {
    if (!sticky) return
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setSticky(false)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sticky])

  // Si el término no está en el glosario, renderiza plano (no rompemos).
  if (!entry) {
    return <span>{label}</span>
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSticky((s) => !s)
      setOpen(true)
    } else if (e.key === 'Escape') {
      setSticky(false)
      setOpen(false)
    }
  }

  const visible = open || sticky

  return (
    <span
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !sticky && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => !sticky && setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        aria-describedby={visible ? tooltipId : undefined}
        aria-expanded={visible}
        onKeyDown={handleKeyDown}
        onClick={() => { setSticky((s) => !s); setOpen(true) }}
        style={{
          cursor: 'help',
          textDecoration: 'underline dotted',
          textDecorationColor: variant === 'kpi' ? 'rgba(110,110,115,0.45)' : 'rgba(0,113,227,0.55)',
          textUnderlineOffset: 4,
          textDecorationThickness: 1,
          color: 'inherit',
          // Quita el outline por defecto en favor del focus-visible global
          outline: 'none',
        }}
      >
        {label}
      </span>
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 260,
            padding: '10px 12px',
            background: '#1d1d1f',
            color: '#fff',
            fontSize: 12,
            lineHeight: 1.45,
            borderRadius: 8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
            zIndex: 9999,
            // Texto del tooltip · permite saltos de línea
            whiteSpace: 'normal',
            textAlign: 'left',
            fontWeight: 400,
            // Reset · puede estar dentro de un h1/strong
            letterSpacing: 'normal',
            textTransform: 'none',
          }}
        >
          <strong style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
            {entry.term}
          </strong>
          {entry.short}
          {entry.source && (
            <span style={{ display: 'block', marginTop: 6, fontSize: 10.5, opacity: 0.7 }}>
              Fuente: {entry.source}
            </span>
          )}
          <Link
            href={`/glosario#${encodeURIComponent(entry.term)}`}
            style={{
              display: 'inline-block',
              marginTop: 8,
              fontSize: 11,
              color: '#7fb8ff',
              textDecoration: 'none',
              fontWeight: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            Ver en glosario →
          </Link>
          {/* Pico inferior del tooltip · pequeño triángulo decorativo */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1d1d1f',
            }}
          />
        </span>
      )}
    </span>
  )
}

// Re-export del tipo para que consumers tipados puedan usar la entrada cruda.
export type { GlossaryEntry }
