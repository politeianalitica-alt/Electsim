/** Tipos para Politeia Slides (M9). */

export type SlideLayout =
  | "title"        // título + subtítulo + autor
  | "section"      // separador de sección grande
  | "content"      // título + bullets
  | "kpi"          // 3-4 métricas grandes con label
  | "quote"        // cita destacada
  | "two_column"   // título + 2 columnas (bullets izquierda, bullets derecha)
  | "closing";     // cierre con CTA

export interface SlideKpi {
  label: string;
  value: string;
  hint?:  string;
}

export interface Slide {
  id:        string;
  layout:    SlideLayout;
  title?:    string;
  subtitle?: string;
  bullets?:  string[];
  rightBullets?: string[];
  kpis?:     SlideKpi[];
  quote?:    string;
  author?:   string;
  /** Color de acento opcional para overrides. */
  accent?:   string;
  /** Hint visual: gráfico/icono a mostrar (futuro). */
  visualHint?: "bar" | "pie" | "line" | "map" | "table";
  /** Notas del presentador. */
  notes?:    string;
}

export interface Deck {
  id:           string;
  workspaceId:  string;
  title:        string;
  subtitle?:    string;
  client?:      string;
  generatedAt:  string;
  source:       "ollama" | "mock";
  slides:       Slide[];
}
