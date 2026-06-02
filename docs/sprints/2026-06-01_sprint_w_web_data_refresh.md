# Sprint W · Web Data Refresh · plan

**Fecha**: 2026-06-01
**Contexto**: tras Sprint Data (3 commits en main) que cierra los endpoints
rotos en macro, el dashboard responde JSON limpio para los 277 indicadores
pero queda la siguiente capa: **¿devuelven datos al día?** Si una serie INE
está paralizada en 2024 Q2 o un dataset de Eurostat está vacío, el endpoint
es 200 OK pero el panel queda sin contenido útil.

## Objetivo

Para cada uno de los **277 indicadores macro** (15 catálogos) garantizar:

1. La respuesta del endpoint NO está vacía (`n_points > 0`).
2. El último punto está dentro de la ventana de frescura esperada según la
   cadencia declarada (diaria, mensual, trimestral, anual).
3. El parser interpreta correctamente el shape de la respuesta (no produce
   `series: []` por bug de parserKey).
4. Donde una fuente esté oficialmente retirada, migrar a la fuente
   sustituta (Eurostat retira datasets cada 6-12 meses, INE migra series
   entre bases).
5. Donde falte cobertura conocida (AIReF, BdE-BLS, BCE-BMPE, OECD-EO), añadir
   los indicadores.

## Cinco fases (Sprint W.1 → W.5)

### W.1 · Diagnóstico (script de sonda)

**Deliverable**: `scripts/data-probe.ts` + reporte
`docs/audits/2026-06-01_macro_freshness_report.md`.

**Qué hace**:
- Itera los 277 indicadores.
- Hace fetch contra el endpoint local (asume `BASE_URL` env o
  `http://localhost:3000`).
- Para cada uno computa: `{ ok, n_points, last_period, days_since_last,
  expected_max_days_since_last, status: 'fresh'|'stale'|'empty'|'error' }`.
- Genera tabla markdown + JSON.

**Criterios de frescura** (`expected_max_days_since_last`):
- `daily` → 7 días (mercados pueden estar cerrados fin de semana + festivos).
- `monthly` → 75 días (INE publica con lag ~45-60 días, dejamos margen).
- `quarterly` → 150 días.
- `annual` → 540 días (WEO oct → siguiente abril; HDI publica en septiembre).

**Salida esperada**: ~30-60 indicadores con problema (estimación basada en
experiencia con catálogos similares).

### W.2 · Triage

Categorizar cada fallo en 4 buckets:

| Bucket | Causa típica | Fix |
|---|---|---|
| `empty_series` | Endpoint OK pero parserKey apunta a key inexistente en JSON | Actualizar parserKey |
| `stale_data` | Fuente externa congelada o cambió código | Migrar a fuente sustituta |
| `wrong_shape` | API cambió el JSON shape (Eurostat v2.1 vs v3) | Refactor parser |
| `dead_source` | Dataset retirado | Borrar indicador o migrar |

**Output**: una tabla en el reporte W.1 con la categoría asignada por indicador.

### W.3 · Refresco por familia

Una pasada por cada gran fuente, con commits separados:

#### W.3.a · Eurostat (155 indicadores · prioridad alta)
- Eurostat publica `eurostat-bulk-download/datasets.json` con todos los
  códigos activos. Cross-comparar contra los 155 que usamos.
- Datasets retirados típicamente: `nama_10*` → `nama_10v2*` en 2025.
- Verificar dimension codes (`indic`, `s_adj`, `unit`) contra el catálogo
  oficial de codelists.

#### W.3.b · INE (15 indicadores · prioridad alta)
- INE publicó CNT base 2020 → en 2026 sale base 2024. Migrar IDs cuando salga.
- Verificar series codes en `https://servicios.ine.es/wstempus/jsCache/ES/SERIE/{code}`.
- IPC: actualizado a base 2026 ya en marzo, validar tabla 38.

#### W.3.c · IMF (12 indicadores · prioridad media)
- Pasar de WEO 2025-Oct a WEO 2026-Apr cuando se publique (mayo).
- IMF DataMapper expone `/api/imf/external/datamapper/api/v1/{indicator}` —
  verificar que `NGDP_RPCH`, `GGXWDG_NGDP`, etc. siguen activos.

#### W.3.d · BdE (7 indicadores · prioridad media)
- BdE migra series antiguas de SAR a webstat. Verificar `BE_4_18`, `TI_1_1245`,
  `TI_1_1.6`, `TI_1_1240`.
- BdE webstat tiene `https://www.bde.es/webbde/es/estadis/infoest/series/{code}.csv`
  que puede haber cambiado.

#### W.3.e · spanish-stats catch-all (28 indicadores · prioridad baja)
- Endpoint propio Politeia. Verificar handler y que las series internas no
  estén corrupteadas.

#### W.3.f · AEMET, OECD, UNDP, WorldBank, governance-indices, Tesoro, CIS,
BIS, ESIOS, datos.gob, Finnhub, derived (resto)
- Una pasada cada uno. Algunos tienen 1-3 indicadores, son fixes pequeños.

### W.4 · Gap filling · indicadores nuevos (opcional)

Solo si los hallazgos W.1 muestran cobertura insuficiente en áreas clave.
Candidatos:

| Indicador | Fuente | Tipo |
|---|---|---|
| AIReF previsión déficit estructural | AIReF API | annual |
| BdE Encuesta Préstamos Bancarios BLS | BdE webstat | quarterly |
| BCE BMPE Spain projections | ECB SDW | quarterly |
| OECD Economic Outlook Spain | OECD.Stat | quarterly |
| Eurostat Quality of Government Survey | Eurostat | annual |
| World Bank Doing Business 2026 | WB API | annual |
| INE Encuesta Innovación I+D | INE | annual |
| Tesoro deuda viva detallada | Tesoro JSON | monthly |
| CIS barómetros mensuales completos | CIS API | monthly |

### W.5 · Monitorización continua

- Endpoint `/api/health/macro-freshness` que devuelve el resumen del último
  probe (cache 6h).
- Banner en /macro si > 5 indicadores en estado `stale` (sin alarmar).
- Cron daily: ejecuta el probe, archiva el reporte en
  `docs/audits/freshness/YYYY-MM-DD.md`.
- Si > 10% de indicadores caen → email al operador (opcional, requiere
  Resend).

## Estimación de esfuerzo

| Fase | Tiempo | Commits | Salida |
|---|---|---|---|
| W.1 Probe + reporte | 1h | 1 | scripts/data-probe.ts + reporte markdown |
| W.2 Triage | 30m | 0 | Categorización en el reporte W.1 |
| W.3 Refresco Eurostat | 1.5h | 1-3 | catálogos actualizados |
| W.3 Refresco INE | 1h | 1 | catálogos actualizados |
| W.3 Refresco IMF | 30m | 1 | catálogos actualizados |
| W.3 Refresco BdE | 1h | 1 | catálogos actualizados |
| W.3 Refresco resto | 1h | 1-2 | catálogos actualizados |
| W.4 Gap fill | 2h | 2-3 | nuevos indicadores + handlers si hace falta |
| W.5 Monitorización | 1h | 1 | endpoint health + cron |
| **TOTAL** | **~10h** | **10-13** | Cobertura macro completa al día |

## Riesgos

1. **APIs externas con rate limit**: probar todo en una pasada puede levantar
   429 de IMF/Eurostat. Mitigación: espaciar requests (200 ms entre cada uno).
2. **Vercel Hobby 100 deploys/día**: hacer commits agrupados para no agotar
   cuota. Mitigación: commits por familia, no por indicador.
3. **Series con paywall (AIReF API)**: requieren key. Mitigación: env var
   opcional + fallback al CSV público.
4. **Datos sensibles a cambios metodológicos**: cambiar fuente puede romper
   comparabilidad histórica. Mitigación: avisar al usuario con badge "metodología
   actualizada" cuando ocurre.

## Estado en este turno

Voy a ejecutar **W.1 (probe + reporte)** ahora mismo. Las siguientes fases
(W.2..W.5) las dejo planificadas pendientes de tu OK por familia, porque cada
una son fixes específicos y prefiero ir validando contigo.
