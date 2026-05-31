/**
 * apps/visual-oscar/app/fonts.ts · Sprint Quality-1
 *
 * Centraliza la carga de fuentes vía next/font para:
 *   - Identidad visual coherente cross-platform (Windows/Linux/Mac/Android/iOS)
 *   - Cero Cumulative Layout Shift (next/font precarga + size-adjust)
 *   - Self-hosted desde Google Fonts (sin request a fonts.googleapis.com en runtime,
 *     mejor performance + GDPR-friendly)
 *
 * Tres familias por separación semántica clara:
 *   - sansVariable  → UI body + nav + KPIs · Inter (alta legibilidad pantallas)
 *   - serifVariable → titulares y citas largas · Source Serif 4 (transitional, neutra)
 *   - monoVariable  → código, slugs, IDs · JetBrains Mono (legibilidad técnica)
 *
 * Las variables CSS resultantes (--font-sans, --font-serif, --font-mono) se
 * encadenan con el system stack Apple en tokens.css → en macOS sigue mandando
 * SF Pro cuando está disponible, en el resto entra Inter/Source Serif.
 */

import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google'

/* IMPORTANTE · cada variable expone un NUEVO nombre que NO colisione con los
   tokens existentes (--font-text, --font-serif, --font-mono) · evita recursión
   cuando tokens.css define `--font-mono: var(--font-mono), ...`. */

/** Inter como sans display + text — display=swap evita FOIT. */
export const sans = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
  // Sólo los pesos que realmente usamos · reduce el peso del bundle
  weight: ['400', '500', '600', '700'],
  // Subsetting agresivo para CSS literal en JSX (acentos español, í/ñ/ó)
  preload: true,
})

/** Source Serif 4 para titulares serif y "italic display" (var hero.serif). */
export const serif = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-source-serif',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  preload: true,
})

/** JetBrains Mono para código, IDs largos, slugs en chips. */
export const mono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-jetbrains',
  weight: ['400', '500'],
  preload: false,  // no se usa en first paint
})
