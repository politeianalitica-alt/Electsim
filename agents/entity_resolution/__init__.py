"""
agents.entity_resolution — Bloque 1: extraccion y normalizacion de menciones.

Flujo:
  1. extractor.py   — spaCy NER + EntityRuler produce RawMention por cada span
  2. normalizer.py  — T1-T8 normaliza la superficie + lookup inmediato en aliases.yaml
  3. context_builder.py — extrae ventana de oraciones alrededor de la mencion
  4. pipeline.py    — Prefect flow que orquesta los tres pasos y escribe en raw_mentions
"""
