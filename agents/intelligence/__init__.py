"""
agents.intelligence
===================
Capa de inteligencia narrativa y desinformacion.

Modulos:
  narrative_analyzer  — clustering, framing, propaganda, NER, coordinacion
  disinfo_scraper     — ingestion de fact-checkers y registros FIMI
  disinfo_analyzer    — enriquecimiento LLM y enlace a narrativas
"""
from .narrative_analyzer import NarrativeAnalyzer
from .disinfo_scraper import DisinfoScraper, DisinfoItem
from .disinfo_analyzer import DisinfoAnalyzer

__all__ = [
    "NarrativeAnalyzer",
    "DisinfoScraper",
    "DisinfoItem",
    "DisinfoAnalyzer",
]
