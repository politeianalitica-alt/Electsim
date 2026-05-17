'use client'
/**
 * PillSelect · selector pill estilo hemiciclo (escenarios, mapa, partidos).
 *
 * Aspecto: borde fino #ECECEF, fondo blanco, chevron SVG personalizado,
 * fontFamily inherit · pill rounded · color suave cuando vacío y oscuro
 * cuando hay valor seleccionado.
 *
 * Compatible con dos tamaños:
 *   - sm  · 11px font, 4px·10px padding (matches escenarios pills)
 *   - md  · 13px font, 9px·14px padding (matches form inputs)
 */
import { useId } from 'react'

export interface PillSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: PillSelectOption[]
  placeholder?: string
  size?: 'sm' | 'md'
  label?: string                 // si se pasa, renderiza un label encima
  fullWidth?: boolean
  disabled?: boolean
  ariaLabel?: string
}

export default function PillSelect({
  value, onChange, options, placeholder,
  size = 'md', label, fullWidth = true, disabled, ariaLabel,
}: Props) {
  const id = useId()
  const isFilled = value !== '' && value != null
  const padding = size === 'sm' ? '4px 26px 4px 10px' : '9px 32px 9px 14px'
  const fontSize = size === 'sm' ? 11 : 13

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label htmlFor={id} style={{
          display:'block', fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
          color:'#6e6e73', textTransform:'uppercase', marginBottom:5,
        }}>
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel || label}
        style={{
          width: fullWidth ? '100%' : 'auto',
          fontFamily:'inherit',
          fontSize,
          fontWeight: isFilled ? 600 : 500,
          padding,
          borderRadius: 999,
          border: '1px solid ' + (isFilled ? '#1d1d1f' : '#ECECEF'),
          background:'#fff',
          color: isFilled ? '#1d1d1f' : '#6e6e73',
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance:'none',
          WebkitAppearance:'none',
          MozAppearance:'none',
          outline:'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%236e6e73' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundRepeat:'no-repeat',
          backgroundPosition: size === 'sm' ? 'right 8px center' : 'right 12px center',
          transition:'all 160ms',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

/**
 * Input pill estilo hemiciclo · borde, padding y radius coherentes con
 * PillSelect. Útil para campos de texto/numero/date dentro del mismo
 * formulario.
 */
export function PillInput(props: {
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'date'
  placeholder?: string
  size?: 'sm' | 'md'
  label?: string
  fullWidth?: boolean
  min?: number
  max?: number
  step?: number
  ariaLabel?: string
}) {
  const id = useId()
  const isFilled = props.value !== '' && props.value != null
  const size = props.size ?? 'md'
  const padding = size === 'sm' ? '4px 10px' : '9px 14px'
  const fontSize = size === 'sm' ? 11 : 13
  return (
    <div style={{ width: props.fullWidth !== false ? '100%' : 'auto' }}>
      {props.label && (
        <label htmlFor={id} style={{
          display:'block', fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
          color:'#6e6e73', textTransform:'uppercase', marginBottom:5,
        }}>
          {props.label}
        </label>
      )}
      <input
        id={id}
        type={props.type || 'text'}
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        min={props.min} max={props.max} step={props.step}
        aria-label={props.ariaLabel || props.label}
        style={{
          width: props.fullWidth !== false ? '100%' : 'auto',
          fontFamily:'inherit',
          fontSize,
          fontWeight: isFilled ? 600 : 500,
          padding,
          borderRadius: 999,
          border: '1px solid ' + (isFilled ? '#1d1d1f' : '#ECECEF'),
          background:'#fff',
          color: isFilled ? '#1d1d1f' : '#6e6e73',
          outline:'none',
          transition:'all 160ms',
        }}
      />
    </div>
  )
}

/**
 * PillTabs · grupo de tabs estilo segmented control (escenarios "Est.2026 / 2023").
 */
export function PillTabs<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:2 }}>
      {options.map(o => {
        const active = value === o.value
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{
            background: active ? '#fff' : 'transparent',
            color: active ? '#1d1d1f' : '#6e6e73',
            border:'none', borderRadius:999, padding:'4px 10px',
            fontSize:11, fontWeight: active ? 600 : 500, cursor:'pointer',
            fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            transition:'all 160ms',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}
