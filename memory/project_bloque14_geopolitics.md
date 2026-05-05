# Bloque 14 — Geopolitical Intelligence Core

## Objetivo
Core geopolítico persistente para ElectSim: conecta eventos internacionales
(ACLED/GDELT/UCDP) con el impacto doméstico en España.

## Principio clave
Degradación graciosa en 3 niveles:
1. API real (ACLED_API_KEY + ACLED_EMAIL) / GDELT pública / UCDP pública
2. Scrapers legados (etl/sources/geo/)
3. Datos demo / lista vacía

Nunca rompe el dashboard.

## Archivos creados

### etl/sources/geopolitics/ (13 módulos)

| Archivo | Contenido |
|---------|-----------|
| `__init__.py` | Package init |
| `schemas.py` | 8 modelos Pydantic v2: GeoEvent, CountryRiskProfile, SpanishPresence, GeoNarrativeSignal, DomesticImpact, GeoAlert, GeoBriefing, GeoSourceHealth |
| `acled_client.py` | fetch_acled_events (API→scraper→demo), normalize_acled_event, acled_health_check, SPAIN_RELEVANCE dict (40+ países) |
| `gdelt_client.py` | search_gdelt_articles (API pública v2), extract_geo_narrative_signals, compute_gdelt_tone_signal, gdelt_health_check |
| `ucdp_client.py` | fetch_ucdp_events (API paginada), normalize_ucdp_event, ucdp_health_check, fetch_ucdp_for_spain_relevant_countries |
| `geo_event_adapter.py` | normalize_events, deduplicate_events, map_country_to_iso3 (80+ variantes), compute_event_severity, enrich_events_with_spain_relevance, merge_events_from_all_sources |
| `geo_risk_scorer.py` | compute_country_risk_profile (8 componentes ponderados), score_all_countries, get_severity_label. WEIGHTS: conflict=0.25, fatality_trend=0.15, political=0.15, energy/migration/spanish_exposure/media_tone=0.10, eu_nato=0.05 |
| `geo_signal_detector.py` | detect_signals (10 tipos), save_alerts. Tipos: conflict_escalation, fatalities_spike, country_risk_spike, negative_tone_spike, spanish_exposure_risk, energy_security_risk, migration_pressure, defense_mission_risk, diplomatic_crisis, domestic_narrative_risk |
| `geo_impact_model.py` | estimate_domestic_impacts, map_geo_event_to_domestic_modules, explain_domestic_impact. 10 dominios: energy/defense/migration/trade/inflation/public_opinion/party_politics/security/corporate_exposure/diplomacy |
| `geo_enricher.py` | enrich_event_with_llm (Ollama→determinístico), enrich_briefing_with_llm, batch_enrich_events |
| `geo_briefing_builder.py` | build_country_briefing, build_daily_spain_digest, build_top_risk_briefings (top N por riesgo), save_briefing |
| `geopolitics_monitor.py` | run_full_pipeline (orquestador), run_source_only, get_health_status, GeopoliticsRunResult |
| `spanish_presence_provider.py` | get_spanish_presence (military/energy/business/diplomatic/diaspora), 4 scrapers legados + 26 datos estáticos |
| `country_risk_provider.py` | save_risk_profile, get_risk_profile, list_risk_profiles, in-memory cache fallback |

### db/migrations/versions/
- `0051_geopolitics_core.py` — 5 tablas: geo_events, geo_country_risk, geo_alerts, geo_briefings, geo_domestic_impact. GIN indexes en JSONB.

### dashboard/services/
- `geopolitics_core.py` — 8 funciones: cargar_eventos_geopoliticos, cargar_perfiles_riesgo_pais, cargar_alertas_geopoliticas, cargar_presencia_espanola, cargar_impactos_domesticos, cargar_narrativas_gdelt, cargar_briefings_recientes, cargar_source_health

### agents/tools/
- `geopolitics_tools.py` — 6 herramientas: get_geopolitical_events, get_country_risk_profile, get_active_geo_alerts, get_spanish_presence_abroad, get_domestic_impact_assessment, get_daily_geo_briefing

### pipelines/
- `geopolitics_core.py` — CLI con 8 comandos: --source (acled/gdelt/ucdp/all), --risk, --signals, --briefing, --presence, --health, --full, --save-db

### tests/
- `test_geopolitics_core.py` — 9 clases de tests

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| ACLED_API_KEY | Clave ACLED | — (usa demo) |
| ACLED_EMAIL | Email ACLED | — (usa demo) |
| GEOPOLITICO_UMBRAL_CRITICO | Score mín CRÍTICO | 71 |
| GEOPOLITICO_UMBRAL_MUY_ALTO | Score mín MUY ALTO | 56 |
| GEOPOLITICO_UMBRAL_ALTO | Score mín ALTO | 41 |
| GEOPOLITICO_UMBRAL_MODERADO | Score mín MODERADO | 26 |

## Pipeline de datos

```
ACLED/GDELT/UCDP
      ↓
geo_event_adapter (normalizar + deduplicar)
      ↓
geo_risk_scorer → CountryRiskProfile
      ↓
geo_signal_detector → GeoAlert
      ↓
geo_impact_model → DomesticImpact
      ↓
geo_briefing_builder → GeoBriefing
      ↓
dashboard/services/geopolitics_core.py → Streamlit
```

## Países relevantes para España (SPAIN_RELEVANCE)
- 0.95: DZA (Argelia — gas crítico)
- 0.92: MAR (Marruecos — vecino + energía)
- 0.88: UKR (Ucrania — guerra activa)
- 0.85: RUS, LBY
- 0.80: VEN, LBN
- 0.75+: ISR, PSE, SYR, MEX, TUR, TUN
- ...

## Tests: completados (ver tests/test_geopolitics_core.py)
