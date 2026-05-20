'use client';

/**
 * ThemeProvider — bloqueado en modo claro.
 *
 * Decisión de producto: la app sólo se sirve en versión clara, sin importar
 * la preferencia del sistema operativo (`prefers-color-scheme`).
 *
 * Mantenemos la API pública (theme, toggleTheme, setTheme) por
 * compatibilidad con el código existente (ej. `useTheme()` desde otros
 * componentes) pero todas las llamadas devuelven 'light' y los setters son
 * no-ops. Si en el futuro se quiere reactivar el toggle, restaurar la
 * versión anterior desde git history.
 */
import { createContext, useContext, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const NOOP_CONTEXT: ThemeContextValue = {
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(NOOP_CONTEXT);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Garantizamos que el atributo data-theme="light" esté siempre puesto en
  // <html>, incluso si algún script externo lo cambia.
  useEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') !== 'light') {
      html.setAttribute('data-theme', 'light');
    }
    // Limpiamos cualquier preferencia previa guardada en sessionStorage que
    // pudiera dejar el provider antiguo.
    try { sessionStorage.removeItem('oscar-theme'); } catch {}
  }, []);

  return (
 <ThemeContext.Provider value={NOOP_CONTEXT}>
      {children}
 </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
