# Tercer Sector / ONGs v3 · Diseño + plan de sprints (autónomo)

> Mejora de `/sector-tercer-sector`. Objetivos del propietario: exhaustiva, info
> relevante de ONGs con detalle en todos sus niveles, SIN repetición entre
> pestañas, SIN hardcodear (fuentes vivas + nuevas si hacen falta), buena viz.
> ÉNFASIS ESPECIAL: (1) exprimir la API de IATI; (2) Licitaciones MUY potente —
> multinivel (CCAA→nacional→UE→otros países→regional extranjero→org.
> internacionales) + procesar documentos en TODOS los formatos + extraer
> requisitos/información de cada licitación. Ejecución autónoma sin validación.

## Estado actual (auditado)
- `app/sector-tercer-sector/page.tsx` (596 líneas) = página PLANA, **100%
  hardcodeada**: 30 ONGs seed (`SocialOrg[]`), PROGRAMAS/AREAS/marco estáticos.
  Panel IATI ya hace fetch a `/api/iati/spain-overview` (vivo, caché 1h).
- Backend S9: `etl/sources/spain/bdns.py` (BDNS subvenciones, JSON keyless),
  `etl/sources/global_intel/iati_client.py` (IATI Datastore, requiere IATI_API_KEY),
  `etl/sources/eu/eib.py` (RSS). Tabla `social_orgs` (migr. 0069) VACÍA. Sin
  endpoint dinámico de ONGs.
- Licitaciones existente (fragmentado): `/licitaciones` (Socrata Cataluña +
  Valenciana + PLACSP + TED desde cliente), `etl/sources/eu/ted.py`. PLACE
  connector no hallado en código. Sin tabla unificada de licitaciones.
- Procesado docs (PYTHON backend, no en frontend): markitdown, docling,
  entity_extractor, table_extractor en `etl/sources/documents/`. El FRONTEND no
  tiene parser — usaremos Gemini (multimodal, PDF nativo) + libs Node.

## Fuentes (de la investigación)
### IATI (3 APIs; solo Datastore necesita key)
- **Datastore** `https://api.iatistandard.org/datastore/{activity,transaction,budget}/select`
  (Solr; `q`, `fl`, `rows`≤1000, `start`, `wt=json`). Header `Ocp-Apim-Subscription-Key: IATI_API_KEY`.
  Free; tier Exploratory 5/min·100/sem (pedir Full Access). Filtros: `recipient_country_code`,
  `reporting_org_ref`, `sector_code` (DAC), `transaction_type_code` (3=desembolso),
  `transaction_value`, `participating_org_ref/role`, `activity_date_iso_date`.
- **Registry CKAN** (KEYLESS) `https://iatiregistry.org/api/action/` →
  `organization_list?all_fields=true`, `organization_show?id=<slug>` (da `publisher_iati_id`).
- **Codelists** (KEYLESS) `https://iatistandard.org/codelists/downloads/clv3/json/<X>.json`
  (Sector DAC, OrganisationType, Country, TransactionType). Cachear.
- ONGD ES verificadas: Oxfam Intermón `ES-CIF-G58236803`, Acción contra el Hambre
  `ES-CIF-G81164105`, AECID (histórico). Patrón `ES-CIF-<CIF>`.
- **Degradación**: sin IATI_API_KEY el Datastore da 401 → usar Registry+Codelists
  (keyless) + el endpoint backend existente; marcar honesto.

### Licitaciones multinivel (priorizar keyless/OCDS)
- **ES nacional**: PLACE/PLACSP ATOM (`contrataciondelestado.es/sindicacion/...atom`,
  CODICE/UBL embebido, docs en `cac:*DocumentReference/cbc:URI`); BDNS API
  (`infosubvenciones.es/bdnstrans/api`, JSON keyless); BOE sección V.
- **CCAA**: la mayoría se agregan en el ATOM de PLACE; profundidad vía Cataluña
  (Socrata `analisi.transparenciacatalunya.cat`), Euskadi (`opendata.euskadi.eus`),
  `datos.gob.es/apidata` (DCAT).
- **UE**: TED v3 (`api.ted.europa.eu/v3/notices/search`, key gratis; bulk sin key,
  eForms XML); EU Funding&Tenders SEDIA (`api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA`, grants ONG: CERV/ESF+/Horizon).
- **Otros países (OCDS keyless)**: UK Find a Tender + Contracts Finder (OCDS JSON),
  ProZorro (OCDS), Australia AusTender; con key: US SAM.gov + Grants.gov.
- **Regional extranjero**: vía OCDS Data Registry (estados MX, provincias AR,
  Colombia SECOP, Paraguay DNCP).
- **Org. internacionales (clave ONG)**: World Bank procnotices (`search.worldbank.org/api/v2/procnotices`, keyless), UNGM, UNDP, bancos desarrollo (RSS).
- **Agregadores multi-país**: OCDS Data Registry (`data.open-contracting.org`),
  OpenTender.eu, **Tenders.guru** (`tenders.guru/api/<cc>/tenders` + `/tenders/{id}/docs`).
- **Docs de pliegos**: PDF (mayoría), DOCX/ODT, XLSX. OCDS `tender.documents[]`
  (url+documentType+format). TED/PLACE en sus XML.

### Procesado de documentos (frontend)
- **Gemini** (`lib/ai/gemini-client.ts`, GEMINI_API_KEY ya en Vercel) — multimodal,
  ingiere **PDF nativo** (base64 inline). Para DOCX/XLSX/HTML: extraer texto con lib
  Node si disponible (mammoth/xlsx/SheetJS — comprobar package.json) y enviar texto.
- Extracción estructurada de pliego: objeto, presupuesto base, valor estimado,
  plazos (presentación, ejecución), criterios de adjudicación (con pesos),
  solvencia (económica/técnica), CPV, lotes, garantías, idioma, lugar.

### Cross-source plataforma
- BDNS (subvenciones a ONGs), geopolítica (AOD/cooperación, riesgo país receptor),
  macro (gasto social, empleo tercer sector), EU Transparency Register (lobby/ONGs UE).

## Patrón técnico
Copiar `lib/energia/agsi.ts` + `app/api/energia/gas-storage/route.ts`. Cliente
`{ok,data|null,error?,fetched_at,source_url}`, caché TTL, route
`dynamic/runtime/maxDuration`, 200 aun degradado, helpers puros testables.
Reutilizar primitivas `app/sector-energia/_components/shared/` (HeroKpis,
CommoditySnapshot) + recharts + CCAAHexmap + mapas SVG.

## Arquitectura v3: shell con sub-tabs (como Energía/Turismo)
`TercerSectorShell`. 6 vistas:
1. **Visión Global** — tamaño del tercer sector (entidades, empleo, ingresos,
   IRPF 0,7%), snapshot financiación, snapshot cooperación IATI, top licitaciones.
2. **Organizaciones (ONGs)** — directorio DINÁMICO de-hardcodeado (catálogo rico
   + EU Transparency Register + beneficiarios BDNS), filtros (tipo/sector/CCAA/
   ámbito), ficha por org (presupuesto, empleo, IRPF, actividades IATI si es
   reporting org, subvenciones/licitaciones relacionadas).
3. **Cooperación internacional (IATI)** — EXPRIMIR IATI: actividades por país
   receptor (mapa mundi), por ONGD española reportante, por sector DAC,
   transacciones/desembolsos (timeline), top donantes/ejecutores, resultados.
4. **Financiación** — dinero HACIA el tercer sector: BDNS subvenciones (a ONGs),
   EU grants SEDIA (CERV/ESF+/Horizon social), EIB, IRPF 0,7%.
5. **Licitaciones** (PIEZA CENTRAL) — buscador multinivel exhaustivo + análisis
   de pliegos (ver detalle abajo).
6. **Contexto e impacto** — tercer sector en macro (gasto social, empleo),
   marco regulatorio, transparencia.

## Licitaciones — diseño detallado (centerpiece)
- **Agregador multinivel** (`lib/tercer-sector/licitaciones/*` + `/api/tercer-sector/licitaciones`):
  fuentes con nivel: `ccaa`, `nacional_es`, `ue`, `pais_extranjero`,
  `regional_extranjero`, `org_internacional`. Conectores: PLACE ATOM (ES+CCAA),
  BDNS (subv ES), TED (UE), SEDIA grants (UE), World Bank (org intl), UK OCDS
  (Find a Tender/Contracts Finder), Tenders.guru (multi-país + docs), OpenTender.eu,
  US SAM/Grants (si key). Normalizar a shape común:
  `{ id, titulo, comprador, nivel, pais, region?, valor_eur?, moneda, cpv?, plazo,
     fecha_pub, url, fuente, documentos:[{nombre,url,formato,tipo}], idioma }`.
  Filtros: nivel, país, CPV/categoría (priorizar CPVs sociales/salud/cooperación
  relevantes a ONGs), texto, plazo, valor. Paginación + dedup.
- **Análisis de pliegos** (`/api/tercer-sector/licitaciones/analizar`): recibe
  una URL de documento (o id de licitación → sus documentos). Descarga el doc,
  detecta formato; PDF→Gemini nativo, DOCX/XLSX/HTML→texto→Gemini. Devuelve
  requisitos ESTRUCTURADOS: `{ objeto, presupuesto_base, valor_estimado, plazos:
  {presentacion,ejecucion}, criterios:[{nombre,peso}], solvencia:{economica,tecnica},
  cpv, lotes:[], garantias, idioma, lugar, resumen, apto_para_ong }`. Cachear por URL.
- **UI**: buscador con filtros por nivel (chips), tabla/cards de resultados, ficha
  de licitación con sus documentos, botón "Analizar pliego" → muestra requisitos
  estructurados extraídos por IA (con disclaimer generated_by_llm). Mapa-mundi
  opcional de licitaciones internacionales.

## Olas
### Ola 1 — fundación (paralelo, ficheros disjuntos)
- **TS1 · Shell** + 6 vistas stub + de-hardcode page + primitivas.
- **TS2-iati · IATI** (lib + endpoints: registry orgs, datastore activities/
  transactions por país/org/sector, codelists; degrada sin key).
- **TS2-orgs · ONGs + Financiación** (directorio dinámico de-hardcode + BDNS
  subvenciones + EU grants SEDIA + EIB).
- **TS2-lic-src · Licitaciones agregador multinivel** (conectores + normalizador
  + endpoint con filtros por nivel).
- **TS2-lic-doc · Análisis de pliegos** (endpoint Gemini extracción estructurada,
  PDF nativo + DOCX/XLSX/HTML texto).

### Ola 2 — profundidad por vista (paralelo, 1 vista cada uno)
- TS3 Visión Global · TS4 Organizaciones · TS5 Cooperación IATI · TS6 Financiación
  · TS7 Licitaciones (buscador multinivel + análisis pliegos UI) · TS8 Contexto.

### Ola 3 — cierre
- TS9: QA runtime-safety, no-repetición (licitaciones generales→/licitaciones
  enlazado; aquí enfoque tercer sector/cooperación), build, commit, push
  main+Visual_Oscar, vercel --prod, smoke.

## Principios
No repetir (las licitaciones generales viven en /licitaciones; aquí el ángulo es
tercer sector + cooperación + multinivel internacional con análisis de pliegos).
Nada hardcodeado donde haya fuente viva; curado siempre datado+fuente. Cero
emojis. Degradación honesta (sin IATI_API_KEY, sin SAM key, etc.). Build verde por ola.
Env vars nuevas: `IATI_API_KEY` (opcional, mejora IATI), `SAM_GOV_API_KEY`
(opcional, US). GEMINI_API_KEY ya está.
