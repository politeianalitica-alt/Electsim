# Sprint W.2 · Triage de indicadores macro · 2026-06-01

> Análisis estructurado de los 139 indicadores non-fresh tras Sprint W.1
> (middleware fix) y Sprint W.2.4 (parser spanish-stats-points).
>
> Estado final del probe (`scripts/data-probe-output.json`):
> **fresh=138 · stale=37 · empty=100 · error=2** (277 totales)
>
> ## Actualización Sprint W.3.1c · Eurostat ei_*_m deprecation masiva
>
> Eurostat retiró del catálogo de diseminación TODA la familia `ei_bs*_m`
> (Business Surveys monthly) entre 2024-2025. Datasets confirmados como
> "is not available for dissemination":
>
> | Dataset deprecated | Uso anterior |
> |---|---|
> | `ei_bsei_m` | ESI Economic Sentiment Indicator (pulso-esi-sentiment) |
> | `ei_bsin_m` | Industrial Confidence (eb-confianza-empresarial) |
> | `ei_bssi_m` | Services Confidence (eb-confianza-servicios) |
> | `ei_bsbo_m` | Construction Confidence (rs-credito-pib-es) |
> | `ei_bsfi_m` | Financial Stocks EA (ma-stocks-financial-ea) |
> | `ei_bsbo_m` | Construction Output (referido) |
> | `ei_isfb_n` | Structural Balance AMECO (mf-saldo-estructural) |
> | `ei_mfm3_m` | M3 Growth EA (ma-m3-growth-ea) |
> | `sts_intvi_m` | Industrial Turnover (eb-volumen-negocios) |
> | `gov_10dd_ggdebt` | Annual Govt Debt (mf-deuda-bruta-eurostat) |
>
> Solo sobrevive `ei_bsco_m` (Consumer Surveys), de donde se extrae el
> Consumer Confidence Indicator (BS-CSMCI) como sustituto pragmático del
> ESI compuesto (W.3.1c, commit pendiente).
>
> Los reemplazos correctos para los demás requieren consulta a la nueva
> nomenclatura de DG ECFIN — la API SDMX 2.1 de Eurostat no lista bien
> los dataflows nuevos. Plan: contactar ECFIN directly o usar FRED como
> fuente alternativa (FRED expone BCS-ES.CIBR / BCS-ES.CSBR, etc.).

## 1 · Resumen ejecutivo

Sprint W ha cerrado el grueso de fallos de routing con dos commits a `main`:

| Commit | Δ fresh | Δ error | Bug |
|--------|--------:|--------:|-----|
| `4cb1ca6c` Sprint W.1 | +0 | −61 (63→2) | middleware whitelist + precedencia URL |
| `9e220fc0` Sprint W.2 | +20 | 0 | parser spanish-stats-points para 25 entries |
| **Total** | **+20** | **−61** | de 277 indicadores: 50% fresh |

Lo que queda (139 non-fresh) se reparte así:

| Bucket | n | Tipo |
|--------|--:|------|
| Eurostat empty | 56 | Dataset codes que ya no devuelven datos para ES |
| INE stale | 27 | Handlers internos pidiendo períodos viejos (FALSO POSITIVO) |
| AEMET empty | 14 | Falta `AEMET_API_KEY` o handler stub en local |
| Finnhub empty | 6 | API key vencida o rate-limit free tier |
| CIS-snapshot empty | 6 | Handler stub interno |
| OECD empty | 4 | Dataset codes |
| Macro-internal empty | 4 | Endpoints derivados sin data |
| BdE empty | 4 | Series codes (parser bde-series espera shape concreto) |
| Spanish-stats stale | 4 | Snapshots con última observación fuera de ventana |
| Tesoro stale | 3 | Datos viejos en el origen |
| IMF empty | 3 | Datasets |
| CIS stale | 3 | Última oleada antigua |
| WorldBank empty | 1 | Dataset |
| INE empty | 1 | Edge case |
| ESIOS error | 1 | `mr-renovables-mix` (subroute inexistente) |
| BIS empty + error | 2 | `fc-bis-claims` requiere custom SDMX parser |

## 2 · Por catálogo (UI impact)

Los catálogos del panel `/macro` con más indicadores rotos:

| Catálogo | empty | stale | error | total |
|----------|------:|------:|------:|------:|
| medio-rural | 14 | 0 | 1 | 15 |
| pulso-macro | 4 | 11 | 0 | 15 |
| hogares-empleo-vivienda | 9 | 3 | 0 | 12 |
| demografia-territorio | 6 | 0 | 0 | 6 |
| mercados-activos | 10 | 0 | 0 | 10 |
| empresas-beneficios | 10 | 1 | 0 | 11 |
| instituciones-estado | 7 | 0 | 0 | 7 |
| cultura-ocio | 5 | 1 | 0 | 6 |
| flujos-capital | 8 | 0 | 1 | 9 |
| sociedad-bienestar | 7 | 0 | 0 | 7 |
| dependencias-externas | 6 | 2 | 0 | 8 |
| riesgo-sistemico | 4 | 0 | 0 | 4 |
| regimen-monetario | 1 | 3 | 0 | 4 |
| margen-fiscal | 3 | 3 | 0 | 6 |
| productividad-competitividad | 2 | 0 | 0 | 2 |

## 3 · Buckets accionables · Sprint W.3

### W.3.1 · Eurostat refresh · prioridad ALTA (56 indicadores)

Patrón: dataset codes que en su día funcionaron pero la API SDMX-JSON ya no
devuelve observaciones para los filtros que usamos (típicamente `geo=ES`).

**Códigos a verificar** (top 10 con más impacto):

| Catálogo · ID | Dataset Eurostat | Hipótesis |
|---|---|---|
| pulso-macro · pulso-ventas-retail | `sts_trtu_m` | Filtro `nace_r2=G47;indic_bt=TOVV` deprecated · STS pasó a `sbs_na_dt_r2` |
| pulso-macro · pulso-ipi-manufactura | `sts_inpr_m` | Filtro `nace_r2=B-D` debería ser `B_TO_D` |
| pulso-macro · pulso-construccion | `sts_copr_m` | Filtro `unit=I15_A` deprecated · ahora `I21_A` |
| regimen-monetario · rm-hicp-core | `prc_hicp_manr` | `coicop=CP00X` válido · revisar `unit=RCH_A` |
| pulso-macro · pulso-esi-sentiment | `ei_bsei_m` | Dataset existe · verificar key `BS-ESI-I` |
| margen-fiscal · mf-saldo-primario | `gov_10dd_edpt1` | Reemplazado por `gov_10a_main` |
| margen-fiscal · mf-saldo-estructural | `ei_isfb_n` | Dataset deprecated |
| margen-fiscal · mf-deuda-bruta-eurostat | `gov_10dd_ggdebt` | OK código · revisar filtros |
| riesgo-sistemico · rs-credito-pib-es | `ei_bsbo_m` | Sentiment construcción · verificar key |
| dependencias-externas · de-bop-{usa,deu,chn} | `bop_c6_q` | OK código · revisar `partner=US/DE/CN_X_HK` |

**Plan**: 1 commit por subgrupo (PIB/inflación/empleo/fiscal/BoP), ~10 entries
por commit. Verificación manual contra
<https://ec.europa.eu/eurostat/databrowser/> + correr probe local entre commits.

### W.3.2 · INE stale FALSO POSITIVO · prioridad ALTA (27 indicadores)

**No es bug del INE**: el endpoint `/api/ine/cnt-desglose` y similares están
hardcoded con períodos viejos o no incluyen `nult=N` para pedir las últimas
N observaciones.

Ejemplo: `pib-yoy` reporta `last=2020-Q1` (6 años) cuando INE WSTempus tiene
datos hasta 2025-Q1. El handler está cortando la query.

**Acción**: auditar handlers internos `/api/ine/cnt-desglose`, `/api/ine/ipc`,
`/api/ine/epa` y añadir parámetro `nult=24` para pedir las últimas 24 obs.

**Indicadores afectados (catálogo · id)**:
- pulso-macro (11): pib-yoy, consumo-hogares-yoy, exports-yoy, exterior-pp,
  consumo-aapp-yoy, inversion-fbcf-yoy, imports-yoy, paro-epa-general,
  paro-epa-jovenes, ipc-anual, ipc-mensual
- regimen-monetario (3): rm-ipc-anual, rm-ipc-mensual, rm-ipc-acumulada
- hogares-empleo-vivienda (11): EPA/IPC variants
- dependencias-externas (2): de-bienes-export-mensual + 1
- margen-fiscal (1)

Si el handler INE se arregla con un `nult=24`, **27 indicadores pasan de stale
a fresh de golpe**. ROI altísimo, 1-2 commits.

### W.3.3 · AEMET · prioridad MEDIA (14 indicadores)

14 indicadores de precipitación/temperatura por CCAA. Mismo endpoint
`/api/aemet/precipitacion-ccaa?ccaa=XXX` con CCAA distinto. Si AEMET API key
no está en local, todos vuelven vacíos.

**Verificar**:
1. ¿`AEMET_API_KEY` está en `apps/visual-oscar/.env.local`? Si no, configurar.
2. ¿En Vercel prod sí está? Si está pero local no, los 14 se ven en prod pero
   no en local — no es bug, es config.
3. Si está y siguen vacíos: handler stub o endpoint AEMET cambió de path.

**Acción mínima**: probar en prod (Vercel) y reportar; si en prod sí van, marcar
como "config-only-prod" y bajar prioridad.

### W.3.4 · Finnhub · prioridad BAJA (6 indicadores)

6 ADRs (Santander, BBVA, Telefónica, AENA, Iberdrola, Inditex). Finnhub free
tier limita 60req/min. Si la probe llamó a los 6 en una ráfaga sin retry, todos
quedan empty.

**Acción**: introducir retry con backoff en parser `finnhub-quote` o
serializar las 6 calls. Trivial.

### W.3.5 · CIS-snapshot · prioridad MEDIA (6 indicadores)

6 endpoints internos `/api/cis-snapshot/{problemas-precios,problemas-vivienda,
problemas-paro,confianza-gobierno,confianza-congreso,confianza-tribunales}`.
Probablemente handler stub que devuelve `{ok:true, points:[]}` por defecto.

**Acción**: leer el handler, confirmar stub, decidir si rellenar con snapshots
manuales (como spanish-stats) o eliminar entries del catálogo.

### W.3.6 · BdE / IMF / OECD / WorldBank · prioridad BAJA (12 indicadores)

Series codes en API tipo SDMX. Cada uno requiere verificación individual contra
catálogo de la fuente.

### W.3.7 · BIS + ESIOS errores · prioridad BAJA (2 indicadores)

- `fc-bis-claims` (BIS): requiere parser SDMX-JSON 2.0 custom. Mejor eliminar
  del catálogo y rehacer con `/api/bis/banking-spain` cuando se tenga parser.
- `mr-renovables-mix` (ESIOS): cambiar endpoint a
  `/api/esios/historico/porcentaje_renovable?range=1y` y crear parser
  `esios-historico-serie` si hace falta.

## 4 · Plan recomendado para Sprint W.3

| Sub-sprint | Indicadores fix | Esfuerzo | Prioridad |
|------------|----------------:|---------:|-----------|
| **W.3.2** INE `nult=24` | 27 | 1h | ⬢ ALTA |
| **W.3.1** Eurostat codes | 56 | 4-5h | ⬢ ALTA |
| **W.3.4** Finnhub retry | 6 | 30min | ⊞ MEDIA |
| **W.3.5** CIS-snapshot | 6 | 1h | ⊞ MEDIA |
| **W.3.3** AEMET verify | 14 | 30min | ⊟ BAJA |
| **W.3.6** BdE/IMF/OECD | 12 | 2h | ⊟ BAJA |
| **W.3.7** BIS+ESIOS | 2 | 1h | ⊟ BAJA |

Si se atacan **W.3.2 + W.3.1**, **+83 indicadores pasarían a fresh** (fresh
138 → ~221, 80% del total). Es el mejor ROI.

## 5 · Validación

Tras cada sub-sprint, re-correr el probe:

```bash
# Desde apps/visual-oscar/
nohup npm run dev > /tmp/dev.log 2>&1 &
sleep 15
cd ../..
BASE_URL=http://localhost:3001 npx tsx scripts/data-probe.ts
# Lee docs/audits/<fecha>_macro_freshness_report.md
```

El reporte de freshness actualiza automáticamente
`docs/audits/<fecha>_macro_freshness_report.md`.

---

*Generado por Sprint W.2.2. Datos del probe en
`scripts/data-probe-output.json` (3.328 líneas).*
