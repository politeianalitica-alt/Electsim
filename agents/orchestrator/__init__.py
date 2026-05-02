"""
agents/orchestrator — LangGraph orchestrator para pipelines de inteligencia.

Componentes:
  state.py          AnalysisState (Pydantic StateGraph state)
  router.py         StateGraph con nodos y edges condicionales
  nodes/            Implementacion de cada nodo del grafo
  playbooks/        Playbooks predefinidos (morning_briefing, etc.)
  scheduler_integration.py  Integracion con APScheduler/Celery
"""
