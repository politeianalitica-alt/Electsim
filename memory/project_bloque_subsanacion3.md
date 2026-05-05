# Bloque Subsanación 3 — Intelligence Layer

## Estado
Implementado y verificado. 158+ tests pasando.

## Problema que resolvía
- Fuentes internacionales (BBC, Reuters, Le Monde, etc.) tenían lang='es' incorrecto → titulares no se traducían
- D7 mostraba 'SIN DATOS · 0 arts.' sin diagnóstico del motivo del fallo
- Narrativas eran temas hardcodeados, no frames reales
- Ollama bloqueaba UI con llamadas síncronas
- Briefings usaban demo data hardcodeada
- No había estrategia de comunicación (mensajes, contranarrativas, Q&A)
- Workspace era solo señales, no sala de trabajo del analista

## Correcciones y nuevos módulos

### Bug fix: lang en media_sources.py
- BBC News, Reuters, Guardian, FT, Le Monde, Der Spiegel, etc. → corregido a en/fr/de
- Bug en data_aggregator.py: añadida detección automática _detect_likely_non_spanish()

### media_intelligence/ (nuevo paquete)
- schemas.py: MediaSourceProfile, MediaSourceHealth, MediaArticle, ArticleQualityScore, ArticleRelevanceScore
- source_health.py: registro de salud real (active/degraded/down/blocked/non_xml/redirect)
- rss_validator.py: validación de feeds con clasificación de error
- acquisition.py: fetch paralelo con registro de health por fuente
- html_article_extractor.py: fallback HTML scraper
- language_detection.py: detección automática (langdetect + stopwords fallback)
- translation_service.py: caché MD5 + Ollama fast + fallback graceful
- article_quality.py: penaliza clickbait, deportes no-político, entretenimiento, stale
- article_ranker.py: score 8 dimensiones (política, novedad, credibilidad, actores, narrativa, territorial, riesgo, diversidad)
- editorial_selector.py: select_top_stories, select_diverse_news, select_news_for_briefing, select_news_for_workspace
- narrative_pipeline.py: envuelve analytics/narrative_engine.py con graceful degradation, valida que sean frames reales (no temas)
- repository.py: CRUD artículos con DB fallback

### agents/brain/llm_router.py (nuevo)
- 10 task types: translation, classification, extraction, narrative_frame, briefing, comms_strategy, qna, red_team, deep_analysis, evidence_check
- Caché SHA256 con TTL por task type
- Timeout y retries por tarea
- Fallback cloud (Anthropic/OpenAI) si Ollama falla
- No bloquea Streamlit

### services/intelligence/ (nuevo)
- briefing_editorial_engine.py: selección editorial real, generate_executive_briefing, validate_briefing_quality
- briefing_pdf_exporter.py: PDF azul marino/blanco, Times New Roman, exportación con reportlab o WeasyPrint

### communications/strategy_engine.py (nuevo)
- analyze_issue_for_comms(): diagnóstico completo (marco rival, propio, mensaje, argumentos, riesgos, Q&A hostil, contranarrativa)
- build_message_triangle(), generate_counter_narratives(), generate_hostile_qna()
- red_team_message() + comms_guardrails
- recommend_channel_mix() por urgencia

### workspace_intelligence/ (nuevo paquete)
- schemas.py: WorkspaceIssue, WorkspaceEvidence, WorkspaceAction, WorkspaceDecision, WorkspaceOverview
- issue_board.py: CRUD de issues con persistencia
- action_queue.py: cola con get_next_best_actions por prioridad
- decision_log.py: log de decisiones del analista

### dashboard/services/ (nuevos)
- media_intelligence_core.py: cargar_estado_fuentes, cargar_top_stories, cargar_narrativas_reales, cargar_media_kpis, cargar_source_health_summary (TTL cache)
- workspace_intelligence_core.py: cargar_workspace_overview, cargar_workspace_issue_board, cargar_workspace_action_queue, cargar_next_best_actions, cargar_workspace_decision_log

### db/migrations/versions/0055_media_source_health.py
- Tablas: media_source_health, llm_jobs

## Tests
- tests/test_media_intelligence_foundation.py — 23 tests
- tests/test_article_intelligence.py — 35 tests
- tests/test_llm_router_narrative.py — 27 tests
- tests/test_briefing_comms_strategy.py — tests briefing + comms strategy
- tests/test_subsanacion3.py — 36 tests

## Resultado visual esperado
- D7 muestra estado real de fuentes: activa/degradada/caída/bloqueada
- Titulares de BBC/Reuters/Le Monde se traducen al español
- Noticias políticas suben vs deportes/entretenimiento
- Narrativas son frames reales, no temas genéricos
- Ollama no bloquea UI (caché + fallback)
- Briefings con selección editorial real
- Comms produce mensajes, contranarrativas, Q&A
- Workspace = War Room de analista/consultor
