"""
agents.enrichment — Bloque 3: Enriquecimiento, grafo y briefings.

Modulos:
  entity_enricher.py  — enriquece perfiles de entidades con Ollama + pysentimiento
  graph_builder.py    — construye/actualiza el grafo Neo4j con relaciones temporales
  anomaly_detector.py — z-score sobre menciones + deteccion de cambio de tono
  briefing_generator.py — genera briefings markdown por entidad o tema
  pipeline.py         — Prefect master flow que orquesta los tres pasos
"""
