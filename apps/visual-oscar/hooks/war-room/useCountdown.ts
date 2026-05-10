import { useEffect, useState } from 'react'

export interface CountdownResult {
  dias: number
  horas: number
  min: number
}

export function useCountdown(targetDate: Date): CountdownResult {
  const [tiempo, setTiempo] = useState<CountdownResult>({ dias: 0, horas: 0, min: 0 })

  useEffect(() => {
    const calc = () => {
      const diff = targetDate.getTime() - Date.now()
      setTiempo({
        dias:  Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))),
        horas: Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24)),
        min:   Math.max(0, Math.floor((diff / (1000 * 60)) % 60)),
      })
    }
    calc()
    const id = setInterval(calc, 30_000)
    return () => clearInterval(id)
  }, [targetDate])

  return tiempo
}
