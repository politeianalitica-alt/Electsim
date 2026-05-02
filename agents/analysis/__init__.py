"""
agents/analysis — Motor de inteligencia de Politeia.

Capas:
  0  ollama_engine       Motor LLM local (OllamaEngine, CircuitBreaker)
  1  extractor           StructuredExtractor — extraccion de entidades/hechos
  2  strategic_analyzer  StrategicAnalyzer — analisis estrategico de actor
  3  synthesis_engine    SynthesisEngine — briefings, alertas, RAG
  5  layer5_classifier   IntelligenceClassifier — clasificacion de señales
  6  layer6_context      ContextAnalyzer — contexto historico y comparativo
  7  layer7_strategic    StrategicAnalyzer7 — analisis multi-motor
  8  layer8_orchestrator PoliteiaMasterOrchestrator — orquestacion de capas
  9  layer9_products     IntelligenceProductFactory — productos finales

Modulos de dominio:
  economic_timeseries   TimeSeriesProcessor (TimescaleDB)
  economic_forecasting  ProphetForecaster, SARIMAForecaster, VARForecaster, GDPNowcaster
  economic_llm_analyst  EconomicLLMAnalyst
  itpe_engine           ITPEEngine, ITPESnapshot
  risk_integrator       inject_itpe_into_risk_index
  political_trends/     ideological_clustering, economic_vote_model,
                        narrative_detection, influence_graph
"""
