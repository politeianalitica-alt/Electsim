'use client'
/**
 * `<Combobox />` · typeahead reutilizable para selectores grandes
 * (países ISO3, códigos HS, navieras…). Sin librerías externas.
 *
 * Props:
 *   value         · cadena seleccionada
 *   onChange      · callback cuando cambia
 *   options       · lista de opciones disponibles (filtrada por el caller)
 *   onSearch      · función llamada al cambiar el input (para que el caller
 *                   actualice `options`). Si no se pasa, el componente filtra
 *                   internamente sobre la lista entera.
 *   placeholder   · texto del input vacío
 *   renderOption  · función personalizada para pintar cada opción
 *   getValue      · cómo extraer la cadena de una opción
 *   getLabel      · cómo extraer el label visible
 */
import { useEffect, useRef, useState } from 'react'

interface Props<T> {
  value: string
  onChange: (val: string, item?: T) => void
  options: T[]
  onSearch?: (q: string) => void
  placeholder?: string
  renderOption?: (item: T, active: boolean) => React.ReactNode
  getValue: (item: T) => string
  getLabel: (item: T) => string
  width?: number | string
}

export function Combobox<T>({
  value,
  onChange,
  options,
  onSearch,
  placeholder = 'Buscar…',
  renderOption,
  getValue,
  getLabel,
  width = 220,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selectedLabel = (() => {
    const found = options.find((o) => getValue(o) === value)
    return found ? getLabel(found) : value
  })()

  function handlePick(item: T) {
    onChange(getValue(item), item)
    setOpen(false)
    setQuery('')
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (options[active]) handlePick(options[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <input
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => {
          const q = e.target.value
          setQuery(q)
          setActive(0)
          setOpen(true)
          onSearch?.(q)
        }}
        onFocus={() => {
          setOpen(true)
          setQuery('')
          onSearch?.('')
        }}
        onKeyDown={handleKey}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '7px 11px',
          fontSize: 13,
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          background: '#fff',
          boxSizing: 'border-box',
        }}
      />
      {open && options.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            marginTop: 4,
            padding: 0,
            listStyle: 'none',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: 12,
          }}
        >
          {options.map((item, i) => (
            <li
              key={getValue(item)}
              onMouseDown={(e) => {
                e.preventDefault()
                handlePick(item)
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '7px 11px',
                cursor: 'pointer',
                background: i === active ? '#f1f5f9' : 'transparent',
                borderBottom: '1px solid #f8fafc',
              }}
            >
              {renderOption ? renderOption(item, i === active) : getLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Combobox
