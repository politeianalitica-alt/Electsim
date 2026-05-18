"""
Data sources externos para los pipelines de fichas dinámicas.

Cada módulo es un wrapper liviano sobre una API pública:
  · ine_municipio.py        — INE (padrón, demografía, renta)
  · wikidata_territorios.py — Wikidata SPARQL (códigos INE, alcaldes, escudos)
  · wikidata_politicos.py   — Wikidata SPARQL (cargos, biografías, partidos)
  · infoelectoral_index.py  — Histórico electoral Ministerio del Interior
  · rss_news.py             — Búsqueda de noticias por keyword (Google News RSS)
  · congreso_actividad.py   — congreso.es datos abiertos (intervenciones, votos)

Todos:
  · Sin dependencias pesadas (urllib + json + stdlib)
  · Caché en memoria con TTL
  · Devuelven dataclasses/dicts predecibles
  · Errores → devuelven estructura vacía + flag `ok=False` (no levantan)
"""
