/**
 * Cuaderno · Plantillas (Templates)
 *
 * Sistema inspirado en Obsidian Templater: cada plantilla es una nota base
 * con placeholders que se sustituyen al instanciar. Las plantillas son la
 * forma de estandarizar el método del analista — toda reunión, todo
 * análisis, todo actor político se nota con la misma estructura.
 *
 * El método de un analista es la suma de sus plantillas.
 */

import { slugify } from './store'

export interface Template {
  id:          string
  name:        string         // Mostrado en el menú
  folder:      string         // Carpeta destino
  description: string         // Una línea
  glyph:       string         // Unicode glyph (no emojis)
  body:        (ctx: TemplateContext) => string  // Cuerpo Markdown
  tags?:       string[]
}

export interface TemplateContext {
  date:    string             // YYYY-MM-DD
  time:    string             // HH:MM
  weekday: string             // 'lunes', 'martes'…
  year:    number
  month:   string             // 'mayo'
  day:     number
  title?:  string             // Para nombrar la nota
}

function ctx(extra?: Partial<TemplateContext>): TemplateContext {
  const d = new Date()
  const weekdays = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const months   = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return {
    date:    d.toISOString().slice(0,10),
    time:    d.toTimeString().slice(0,5),
    weekday: weekdays[d.getDay()],
    year:    d.getFullYear(),
    month:   months[d.getMonth()],
    day:     d.getDate(),
    ...extra,
  }
}

// ── Plantillas ──────────────────────────────────────────────────────────────

const DAILY_NOTE: Template = {
  id:          'daily',
  name:        'Diario · Bitácora del día',
  folder:      'Bitácora',
  description: 'Tu registro diario: pulso macro+social en vivo + prioridades, decisiones, hallazgos',
  glyph:       '◷',
  tags:        ['#diario'],
  body: c => `---
tipo: diario
fecha: ${c.date}
estado: en-curso
---

# Bitácora · ${c.date}

> ${c.weekday}, ${c.day} de ${c.month} de ${c.year}

## Pulso de hoy · macro + social

**Economía**  {macro:ipc-anual}  {macro:paro-epa}  {stats:salario-medio}

**Opinión pública**  {cis:problemas-paro}  {cis:problemas-vivienda}  {cis:valoracion-presidente}  {cis:confianza-gobierno}

> Sprint N6 · estos embeds se hidratan al ver la nota · valor + Δ YoY si está disponible

## Prioridades de hoy

- [ ]
- [ ]
- [ ]

## Decisiones tomadas

-

## Hallazgos · Inteligencia

-

## Reuniones / Llamadas

-

## Lecturas y fuentes

-

## Próximos pasos

- [ ]

## Conexiones

Enlaza aquí los actores, temas o expedientes tocados hoy:

- [[Pedro Sánchez]]
- [[Alberto Núñez Feijóo]]
- [[]]

---
*Generado desde plantilla diaria · ${c.time}*
`,
}

const REUNION: Template = {
  id:          'reunion',
  name:        'Reunión / Llamada',
  folder:      'Reuniones',
  description: 'Acta estructurada: asistentes, agenda, decisiones, acciones',
  glyph:       '◑',
  tags:        ['#reunion'],
  body: c => `---
tipo: reunion
fecha: ${c.date}
hora: ${c.time}
participantes: []
estado: completada
---

# Reunión · ${c.date}

## Contexto

¿Por qué se convocó? ¿Qué se busca decidir?

## Participantes

- [[]] — rol
- [[]] — rol

## Agenda

1.
2.
3.

## Discusión

###

## Decisiones

-

## Acciones (con responsable y fecha)

- [ ] **[Responsable]** ·  · vence \`YYYY-MM-DD\`
- [ ] **[Responsable]** ·  · vence \`YYYY-MM-DD\`

## Riesgos / Disensos

-

## Próxima reunión

-

---
Enlaces relacionados: [[]]
`,
}

const ANALISIS: Template = {
  id:          'analisis',
  name:        'Análisis · Hipótesis',
  folder:      'Análisis',
  description: 'Método estructurado: pregunta, hipótesis, evidencia, conclusión',
  glyph:       '✦',
  tags:        ['#analisis'],
  body: c => `---
tipo: analisis
fecha: ${c.date}
estado: borrador
confianza: media
---

# Análisis · ${c.title ?? 'Sin título'}

## Pregunta clave

¿Qué quiero entender o decidir?

## Hipótesis principal

> Afirmación falsable que voy a evaluar.

## Hipótesis alternativas

1. **H1** ·
2. **H2** ·

## Evidencia a favor

| Fuente | Fuerza | Nota |
|--------|--------|------|
|        |        |      |

## Evidencia en contra

| Fuente | Fuerza | Nota |
|--------|--------|------|
|        |        |      |

## Sesgos a vigilar

- [ ] ¿Estoy buscando lo que quiero encontrar? (confirmación)
- [ ] ¿Sobrepondero un evento reciente? (recencia)
- [ ] ¿Estoy anclando en una primera lectura? (anclaje)

## Conclusión provisional

> Una frase. Con nivel de confianza explícito.

## Lo que falta saber

- [ ]

## Conexiones

- Actores: [[]]
- Temas: [[]]
- Análisis previos: [[]]
`,
}

const ACTOR: Template = {
  id:          'actor',
  name:        'Actor político',
  folder:      'Actores',
  description: 'Ficha viva: posición, intereses, red, historial, leverage',
  glyph:       '',
  tags:        ['#actor'],
  body: c => `---
tipo: actor
nivel: ${''}
partido: ${''}
cargo: ${''}
actualizado: ${c.date}
---

# ${c.title ?? 'Nuevo actor'}

## Identidad

- **Nombre completo**:
- **Cargo actual**:
- **Partido / Bloque**: [[]]
- **Territorio**:
- **Edad / Trayectoria**:

## Posición pública

¿Qué defiende? ¿En qué eje político se sitúa?

## Intereses reales

¿Qué busca? ¿Qué teme perder? ¿Qué quiere ganar?

## Red de relaciones

- **Aliados**: [[]] · [[]]
- **Rivales**: [[]]
- **Mentor / Padrino**: [[]]
- **Pupilos / Equipo**: [[]]

## Historial relevante

- \`${c.date}\` ·

## Patrones observados

-

## Leverage

¿Qué incentivos lo mueven? ¿Qué presión funciona y cuál no?

## Notas en curso

-

## Fuentes

-
`,
}

const FUENTE: Template = {
  id:          'fuente',
  name:        'Fuente · Documento',
  folder:      'Fuentes',
  description: 'Registro de fuente con metadatos, citas y fiabilidad',
  glyph:       '⊡',
  tags:        ['#fuente'],
  body: c => `---
tipo: fuente
origen: ${''}
fecha-publicacion: ${''}
fiabilidad: alta|media|baja
accedido: ${c.date}
url: ${''}
---

# ${c.title ?? 'Fuente sin título'}

## Tipo

- [ ] Documento oficial (BOE, BOCG, sentencia)
- [ ] Estudio / Informe
- [ ] Noticia / Prensa
- [ ] Declaración pública
- [ ] Filtración
- [ ] Datos primarios
- [ ] Otro

## Resumen ejecutivo

3-5 líneas. Si no sabes resumirlo, aún no lo entiendes.

## Citas literales clave

> "" — ubicación

> "" — ubicación

## Fiabilidad

- **Fuente primaria/secundaria**:
- **Verificación cruzada**:
- **Conflictos de interés**:

## Relevancia

¿Por qué importa? ¿Qué hipótesis confirma o refuta?

## Enlaces

- Análisis donde la cito: [[]]
- Actores mencionados: [[]]
- Temas: [[]]
`,
}

const DECISION: Template = {
  id:          'decision',
  name:        'Decisión',
  folder:      'Decisiones',
  description: 'Decision log: opciones, criterios, decisión, revisión',
  glyph:       '',
  tags:        ['#decision'],
  body: c => `---
tipo: decision
fecha: ${c.date}
estado: tomada
revisar: ${c.date}
---

# Decisión · ${c.title ?? 'Sin título'}

## Contexto

¿Qué situación obliga a decidir? ¿Qué pasa si no decido?

## Opciones consideradas

### Opción A ·
- Pros:
- Contras:

### Opción B ·
- Pros:
- Contras:

### Opción C ·
- Pros:
- Contras:

## Criterios

¿Cómo se evalúan? ¿Con qué pesos?

## Decisión tomada

> Opción X. Razón principal.

## Reversibilidad

- [ ] Decisión de **una vía** (difícil de revertir)
- [ ] Decisión de **dos vías** (revertir es barato)

## Riesgos asumidos

-

## Cuándo revisar

\`${c.date}\` + N semanas · ¿qué señales me harían cambiar de opinión?

## Conexiones

- [[]]
`,
}

const BRIEFING: Template = {
  id:          'briefing',
  name:        'Briefing',
  folder:      'Briefings',
  description: 'Resumen ejecutivo con KPI vivos: situación, riesgo, recomendación',
  glyph:       '⊟',
  tags:        ['#briefing'],
  body: c => `---
tipo: briefing
fecha: ${c.date}
destinatario: ${''}
clasificacion: interno
---

# Briefing · ${c.title ?? c.date}

## Bottom Line Up Front (BLUF)

> Una frase. La conclusión primero.

## Indicadores de cabecera

| Eje | Valor actual | Δ |
|---|---|---|
| Inflación | {macro:ipc-anual} | — |
| Paro EPA  | {macro:paro-epa}  | — |
| Confianza Gobierno (CIS) | {cis:confianza-gobierno} | — |
| Valoración Presidente | {cis:valoracion-presidente} | — |
| Valoración Oposición  | {cis:valoracion-oposicion}  | — |

## Situación

3-5 líneas. Lo que está pasando.

## Movimiento clave de las últimas 24-48h

-

## Análisis

¿Por qué pasa esto? ¿Qué señales hay debajo?

## Implicaciones

- **Corto plazo (1-2 semanas)**:
- **Medio plazo (1-3 meses)**:

## Riesgos / Watchlist

-

## Recomendación

> Acción concreta. Quien tiene que actuar. Para cuándo.

## Conexiones

- Actores: [[Pedro Sánchez]] · [[Alberto Núñez Feijóo]] · [[]]
- Partidos: [[PSOE]] · [[PP]] · [[]]

## Fuentes

- [[]]
`,
}

const HIPOTESIS: Template = {
  id:          'hipotesis',
  name:        'Hipótesis viva',
  folder:      'Hipótesis',
  description: 'Hipótesis que vas evaluando con evidencia entrante',
  glyph:       '◇',
  tags:        ['#hipotesis'],
  body: c => `---
tipo: hipotesis
abierta: ${c.date}
estado: abierta
confianza: 50
---

# Hipótesis · ${c.title ?? 'Sin título'}

## Enunciado

> Afirmación falsable, fechable.

## ¿Cómo se confirmaría?

-

## ¿Cómo se refutaría?

-

## Evidencia entrante

| Fecha | Evidencia | Fuente | Δ confianza |
|-------|-----------|--------|-------------|
| \`${c.date}\` |  | [[]] | +0 |

## Estado actual

- Confianza: 50%
- Próxima revisión:

## Conexiones

- [[]]
`,
}

// ── Sprint Cuaderno N6 · Plantillas nuevas con live data ──────────────────

const PULSO_MACRO: Template = {
  id:          'pulso-macro',
  name:        'Pulso macro · España hoy',
  folder:      'Análisis',
  description: 'Snapshot rápido del estado España · 10 embeds vivos + ranking de actores',
  glyph:       '◐',
  tags:        ['#pulso', '#macro'],
  body: c => `---
tipo: pulso
fecha: ${c.date}
ambito: nacional-es
estado: borrador
---

# Pulso España · ${c.date}

> ${c.weekday}, ${c.day} de ${c.month} de ${c.year}

## Economía

{macro:ipc-anual} · {macro:paro-epa} · {stats:salario-medio} · {stats:salario-mediano}

**Precios y vivienda**
{stats:precio-m2-vivienda} · {stats:esfuerzo-vivienda} · {stats:kaitz-ratio}

## Estado y gobernanza

{gov:cpi} · {wb:CC.PER.RNK} · {wb:GE.PER.RNK} · {wb:RL.PER.RNK}

## Opinión pública (CIS)

**Top problemas**
{cis:problemas-paro} · {cis:problemas-vivienda} · {cis:problemas-precios}

**Confianza institucional**
{cis:confianza-gobierno} · {cis:confianza-congreso} · {cis:confianza-tribunales}

**Liderazgos**
{cis:valoracion-presidente} · {cis:valoracion-oposicion}

**Expectativas**
{cis:situacion-economica} · {cis:sit-economica-futura}

## Lectura del analista

- **Hipótesis dominante**:
- **Señales que la confirman**:
- **Señales que la rompen**:

## Actores en el radar

### Gobierno y oposición
- [[Pedro Sánchez]] ·
- [[Alberto Núñez Feijóo]] ·
- [[Yolanda Díaz]] ·

### Partidos
- [[PSOE]] · [[PP]] · [[VOX]] · [[Sumar]]

## Próxima revisión

\`${c.date}\` + N días · qué métrica me hace volver antes
`,
}

const BRIEFING_SECTORIAL: Template = {
  id:          'briefing-sectorial',
  name:        'Briefing sectorial',
  folder:      'Briefings',
  description: 'Análisis sectorial con embeds + actores político-empresariales',
  glyph:       '⊞',
  tags:        ['#briefing', '#sectorial'],
  body: c => `---
tipo: briefing-sectorial
fecha: ${c.date}
sector: ${''}
estado: borrador
---

# Briefing sectorial · ${c.title ?? '(elige sector)'}

## Bottom Line Up Front

> Una frase. Lo más importante primero.

## Contexto macro de fondo

| Indicador | Valor | Implicación |
|---|---|---|
| IPC anual | {macro:ipc-anual} |  |
| Paro EPA | {macro:paro-epa} |  |
| Salario medio | {stats:salario-medio} |  |
| Confianza Gobierno (CIS) | {cis:confianza-gobierno} |  |

## Sector · indicadores propios

(Sustituye los embeds según el sector elegido)

**Energía**: {stats:contratacion-pub}
**Vivienda**: {stats:precio-m2-vivienda} · {stats:esfuerzo-vivienda}
**Agro**: {stats:pac-fondos} · {stats:precio-tierra}
**Estado**: {stats:ejecucion-presup} · {stats:contratacion-pub}

## Actores clave

### Reguladores
- [[CNMC]] · [[CNMV]] · [[Banco de España]]

### Empresas
- [[]] · [[]] · [[]]

### Políticos
- [[]] (gobierno) · [[]] (oposición)

## Movimientos de última semana

-

## Riesgos / Watchlist

-

## Posicionamiento partidos

| Partido | Posición declarada | Coherencia con el voto |
|---|---|---|
| [[PSOE]] |  |  |
| [[PP]] |  |  |
| [[VOX]] |  |  |
| [[Sumar]] |  |  |

## Recomendación

> Acción · responsable · plazo.

## Fuentes

- [[]]
`,
}

// ── Registry ────────────────────────────────────────────────────────────────

export const TEMPLATES: Template[] = [
  DAILY_NOTE,
  PULSO_MACRO,         // Sprint N6 · nueva
  REUNION,
  ANALISIS,
  ACTOR,
  FUENTE,
  DECISION,
  BRIEFING,
  BRIEFING_SECTORIAL,  // Sprint N6 · nueva
  HIPOTESIS,
]

export function getTemplate(id: string): Template | null {
  return TEMPLATES.find(t => t.id === id) ?? null
}

export function instantiate(tpl: Template, title?: string): {
  title: string
  folder: string
  content: string
} {
  const c = ctx({ title })
  const body = tpl.body(c)
  const noteTitle = title?.trim() || (
    tpl.id === 'daily' ? `Bitácora · ${c.date}` :
    `${tpl.name} · ${c.date}`
  )
  return {
    title:   noteTitle,
    folder:  tpl.folder,
    content: body,
  }
}
