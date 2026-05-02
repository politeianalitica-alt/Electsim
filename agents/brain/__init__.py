"""
agents/brain — Capa de inteligencia proactiva (Brain/Ollama).

Componentes:
  ollama_client.py          OllamaClient simplificado para el brain
  web_ingestion/
    url_extractor.py        Extraccion de contenido web (Playwright + BS4)
    search_agent.py         Busqueda web (DuckDuckGo)
    feed_monitor.py         Monitor de feeds RSS
  analyst_brain.py          AnalystBrain — insights proactivos
  context_engine.py         ContextEngine — contexto en background
"""
