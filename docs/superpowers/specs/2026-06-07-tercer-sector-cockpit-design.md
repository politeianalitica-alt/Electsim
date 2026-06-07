# Tercer Sector · Cockpit de analista (mejora v4)

> Reorientar `/sector-tercer-sector` de "colección de fuentes" a sistema de
> inteligencia centrado en 4 preguntas de analista:
> 1. **Oportunidades** — qué subvenciones/licitaciones/grants/convocatorias abiertas o próximas.
> 2. **Encaje** — qué oportunidades son aptas para ONG/tercer sector y por qué (scoring).
> 3. **Territorio** — dónde hay actividad, financiación, compradores, concentración de entidades, huecos.
> 4. **Evidencia** — qué informes/datasets/memorias citar para justificar proyectos.
>
> NO rehacer arquitectura: ya existe `TercerSectorShell` con 6 pestañas. Mantener
> envelope `{ok,data,error?,fetched_at,source_url,_meta}`, degradación honesta,
> `runtime='nodejs'`, `dynamic='force-dynamic'`. Cero emojis. No inventar importes.

## ⚠️ LEY VERCEL HOBBY (no romper otra vez)
Vercel cuenta **1 función serverless por configuración distinta de `maxDuration`**.
Estamos en **8 configs** (`{}` , 20, 30, 45, 60, 90, 120, 300) + 4 crons = **12 funciones (límite)**.
**Todo route.ts nuevo DEBE usar `export const maxDuration = 30` (o un valor de esa
lista, o omitir maxDuration para `{}`). NUNCA 15, 10, 25 ni un valor nuevo** — eso
crearía la función 13 y rompería el deploy. Endpoints estáticos (informes) → omitir maxDuration.

## Contratos de datos

### OportunidadTS (`lib/tercer-sector/oportunidades/types.ts`)
```ts
type TipoOportunidad='subvencion'|'licitacion'|'grant_ue'|'cooperacion_internacional'|'convenio'|'premio'|'otro'
interface OportunidadTS { id, tipo:TipoOportunidad, titulo, organismo, fuente, fuente_url, url,
  pais, region:string|null, ccaa:string|null, fecha_publicacion:string|null, fecha_limite:string|null,
  dias_restantes:number|null, importe_eur:number|null, moneda, sector_ts:string|null, cpv:string|null,
  dac_sector:string|null, beneficiarios_objetivo:string[], requisitos_resumen:string|null,
  documentos:{nombre,url,tipo,formato}[], score_ong:number, score_label:'alta'|'media'|'baja'|'incierta',
  razones_score:string[], riesgo:'bajo'|'medio'|'alto'|'incierto' }
```

### Scoring (`lib/tercer-sector/oportunidades/scoring.ts`) — fuente ÚNICA de verdad
`export function scoreOportunidad(o): { score:number; label:'alta'|'media'|'baja'|'incierta'; razones:string[]; riesgo }`
Reglas: +25 CPV∈{85,853,8531,8532,752,751,804,805,981,982}; +20 título con {servicios sociales,
inclusión,vulnerabilidad,discapacidad,infancia,migrantes,refugiados,cooperación,humanitario,
voluntariado,igualdad,empleo social,dependencia}; +20 tipo∈{subvencion,grant_ue,cooperacion_internacional};
+10 docs descargables; +10 plazo>10d; −20 importe>5M sin lotes; −15 idioma∉{es,en}; −15 sin importe ni
plazo; −20 texto sugiere obra/construcción/suministro industrial/servicios puramente técnicos.
label: alta≥55, media 35-54, baja 1-34; **incierta si faltan datos clave** (no inventar aptitud).
La extensión de licitaciones (`enrich.ts`) IMPORTA este `scoreOportunidad` (no duplicar listas).

### TerritorioTS (`lib/tercer-sector/territorio.ts`)
```ts
interface TerritorioTS { ccaa, provincia?, entidades:number, ingresos_eur:number|null,
  empleados:number|null, subvenciones_eur:number|null, concesiones:number, convocatorias_abiertas:number,
  licitaciones:number, licitaciones_valor_eur:number|null,
  sectores_top:{sector,count,importe_eur:number|null}[], compradores_top:{nombre,count,importe_eur:number|null}[],
  beneficiarios_top:{nombre,count,importe_eur:number|null}[], alertas:string[] }
```
Fuente inicial: catálogo organizaciones + concesiones/convocatorias BDNS + licitaciones PLACE/BDNS.
Alertas: "muchas entidades, poca financiación reciente"; "muchas convocatorias, poca presencia de entidades".

### InformeTS (`lib/tercer-sector/informes-catalog.ts` curado + datado)
```ts
interface InformeTS { id, titulo, entidad, anio:number, ambito:'espana'|'ccaa'|'ue'|'global',
  temas:string[], url, tipo:'informe'|'dataset'|'memoria'|'estadistica'|'normativa', resumen, utilidad_analista }
```
Fuentes: Plataforma Tercer Sector, EAPN, FOESSA, Plataforma Voluntariado, Fundación Lealtad,
Coordinadora ONGD, CEPES, INE, Eurostat, OCDE, mdsocialesa2030.

### Extensiones (campos OPCIONALES, no romper conectores)
- `LicitacionNormalizada` (+): categoria_ts, score_ong, score_label, razones_score, dias_restantes,
  valor_bucket:'micro'|'pequena'|'media'|'grande'|'mega'|'desconocido', comprador_tipo:'ayuntamiento'|'ccaa'|'age'|'ue'|'org_internacional'|'otro', riesgo_pliego.
- `Organizacion` (catalog) (+): registro_ids{aecid_ongd,registro_nacional_asociaciones,registro_fundaciones,eu_transparency_register},
  acreditaciones{fundacion_lealtad,coordinadora_ongd,plataforma_tercer_sector,cepes}, actividad_territorial{ccaa_presencia,paises_intervencion},
  transparencia{memoria_url,cuentas_url,auditoria_url,portal_transparencia_url,ultimo_ejercicio}, iati_refs:string[], tags_analista:string[].

## Endpoints nuevos (TODOS reutilizan configs existentes)
- `/api/tercer-sector/oportunidades` (maxDuration=30) — agrega financiacion+licitaciones (vía libs bdns/sedia/place/ted/worldbank), normaliza a OportunidadTS, aplica scoring, filtros `tipo,ccaa,pais,sector,q,diasMax,importeMin,importeMax,scoreMin,page,pageSize`. Orden: score↓, dias↑, importe↓.
- `/api/tercer-sector/territorio` (maxDuration=30) — TerritorioTS por CCAA.
- `/api/tercer-sector/informes` (omit maxDuration → `{}`) — catálogo curado, filtros tema/anio/entidad/ambito.
- `/api/tercer-sector/organizaciones/[slug]/inteligencia` (maxDuration=30) — dossier: {org, subvenciones_bdns, oportunidades_relacionadas, actividades_iati, territorios, documentos, alertas}. Match por NIF/nombre normalizado/IATI ref/alias.

## UI por pestaña
- **global**: fila "alertas de analista" (oportunidades alta prioridad · territorios calientes · financiadores activos · riesgos concentración) + `TerritorioPanel` snapshot.
- **organizaciones**: ficha → dossier (7 secciones) consumiendo `/inteligencia`.
- **cooperacion**: mantener IATI-MAX; botón "ver oportunidades relacionadas" por país/sector → /oportunidades.
- **financiacion**: `FinPipelineOportunidades` (3 columnas urgentes/alta/grandes, filtros rápidos) + `FinanciadoresActivos` (group by organismo).
- **licitaciones**: `LicFiltros` (+aptoOng,diasMax,valorMin/Max,soloConDocs,soloAnalizable,sectorTs,compradorTipo) + `LicRadarOportunidades` (entre LicResumen y LicMapaMundi). Wire `enrichLicitacionTS` en el route.
- **contexto**: `TerritorioPanel` (full) + `CtxInformesBiblioteca`.

## Olas
- **Ola 1 (datos, paralelo)**: W1a oportunidades+scoring · W1b licitaciones enrich+types+route · W1c territorio · W1d informes+org-inteligencia+catalog-ext. Tests harness `node --experimental-strip-types`.
- **Ola 2 (UI, 1 agente por VISTA para no colisionar)**: financiacion · licitaciones · organizaciones · contexto(crea TerritorioPanel+InformesBiblioteca) · global(importa TerritorioPanel) · cooperacion. `TerritorioPanel.tsx` lo crea el agente de contexto y lo importa el de global (prop `compact?`).
- **Ola 3**: QA runtime + build + typecheck + tests + commit + push main+Visual_Oscar + vercel --prod + smoke.

## Aceptación
build verde, typecheck, tests; smoke de /oportunidades /territorio /informes; sin importes inventados;
degradación honesta intacta; IATI no rota sin key; sin emojis; SIN nuevas configs serverless; UI con
filtros/scoring/ranking accionable (no solo texto).
