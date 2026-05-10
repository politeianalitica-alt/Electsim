export function formatMillones(n: number, decimals = 1): string {
  return (n / 1_000_000).toFixed(decimals) + 'M€'
}

export function formatMilesMillones(n: number, decimals = 2): string {
  return (n / 1_000_000_000).toFixed(decimals) + ' mil M€'
}

export function formatKilos(n: number): string {
  return (n / 1000).toFixed(0) + 'K€'
}

export function diasColor(dias: number): string {
  if (dias < 0) return '#525258'
  if (dias <= 7) return '#DC2626'
  if (dias <= 21) return '#F97316'
  return '#16A34A'
}

export function riesgoColor(r: string): string {
  const m: Record<string, string> = {
    'CRÍTICO': '#DC2626',
    'ALTO': '#F97316',
    'MEDIO': '#EAB308',
    'BAJO': '#0EA5E9',
  }
  return m[r] ?? '#6e6e73'
}

export function parseDate(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
