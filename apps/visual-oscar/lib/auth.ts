// Auth · helpers para gestionar tokens en localStorage.
const A = 'electsim_access'
const R = 'electsim_refresh'

export const getAccessToken = (): string | null =>
  typeof window === 'undefined' ? null : localStorage.getItem(A)

export const setTokens = (a: string, r: string) => {
  localStorage.setItem(A, a)
  localStorage.setItem(R, r)
}

export const clearTokens = () => {
  localStorage.removeItem(A)
  localStorage.removeItem(R)
}

export const isAuthenticated = (): boolean => !!getAccessToken()

// Modo demo: si no hay NEXT_PUBLIC_API_URL configurada, asumimos que no hay backend
// y la app funciona en modo demostración con datos mock y login permisivo.
export const isDemoMode = (): boolean => !process.env.NEXT_PUBLIC_API_URL
