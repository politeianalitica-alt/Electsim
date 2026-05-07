'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number   // ms
  decimals?: number
  format?: (n: number) => string
  className?: string
  style?: React.CSSProperties
}

/**
 * Componente que anima un número desde 0 (o desde el último valor visto)
 * hasta el target con easing cubic-out. Reanima cuando `value` cambia.
 */
export default function CountUp({ value, duration = 900, decimals = 0, format, className, style }: Props) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const target = value
    if (from === target) return
    startRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const t = Math.min(1, elapsed / duration)
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const cur = from + (target - from) * eased
      setDisplay(cur)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        setDisplay(target)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = display
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  const text = format
    ? format(display)
    : decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString('es-ES')

  return <span className={className} style={style}>{text}</span>
}
