import { z } from "zod";

export const SlideKpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  hint:  z.string().optional(),
});

export const SlideSchema = z.object({
  id:        z.string(),
  layout:    z.enum(["title", "section", "content", "kpi", "quote", "two_column", "closing"]),
  title:     z.string().optional(),
  subtitle:  z.string().optional(),
  bullets:   z.array(z.string()).optional(),
  rightBullets: z.array(z.string()).optional(),
  kpis:      z.array(SlideKpiSchema).optional(),
  quote:     z.string().optional(),
  author:    z.string().optional(),
  notes:     z.string().optional(),
});

export const DeckPayloadSchema = z.object({
  title:    z.string(),
  subtitle: z.string().optional(),
  slides:   z.array(SlideSchema).min(3).max(20),
});

export const SLIDES_SCHEMA_HINT = `Devuelve ÚNICAMENTE JSON con este shape:
{
  "title": "Título del deck",
  "subtitle": "Subtítulo descriptivo",
  "slides": [
    { "id": "s1", "layout": "title",     "title": "...", "subtitle": "...", "author": "..." },
    { "id": "s2", "layout": "section",   "title": "Contexto" },
    { "id": "s3", "layout": "kpi",       "title": "Estado actual", "kpis": [
        { "label": "...", "value": "12.4%", "hint": "..." },
        { "label": "...", "value": "+2.3pp" }
    ] },
    { "id": "s4", "layout": "content",   "title": "...", "bullets": ["...", "...", "..."] },
    { "id": "s5", "layout": "two_column","title": "...", "bullets": ["..."], "rightBullets": ["..."] },
    { "id": "s6", "layout": "quote",     "quote": "...", "author": "..." },
    { "id": "s7", "layout": "closing",   "title": "Conclusiones", "bullets": ["...", "...", "..."] }
  ]
}
Reglas: 8-12 slides, contenido en español, sin Markdown, sin emojis, frases concisas.`;
