"""
agents/brain/pipelines — pipelines de orquestación que combinan tools del
GroqBrain con datos del sistema (BD, RAG, scrapers, ontología).

Cada pipeline es una pieza ejecutable que:
  · Toma input estructurado del sistema.
  · Llama a varias tools del brain.
  · Persiste o devuelve resultado enriquecido + trazas.
  · Nunca crashea — captura errores y los registra.
"""
from __future__ import annotations
