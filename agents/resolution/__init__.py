"""
agents.resolution — Bloque 2: Resolucion de identidades en cascada.

Estrategia A → B → C:
  A. Lookup YAML exacto       (ya realizado en Bloque 1; este modulo lo verifica)
  B. Similitud de embedding   (paraphrase-multilingual-mpnet-base-v2)
  C. Arbitro Ollama           (temperature=0, JSON estructurado)

Umbrales:
  >= 0.88  → auto-resolver (metodo embedding o ollama)
  >= 0.72  → resolver + encolar para revision humana
  <  0.72  → no resolver + encolar para revision humana
  <  0.65  → no resolver, descartar candidatos de baja calidad

Output: entity_mentions (BD) + resolution_review_queue (BD, si aplica)
"""
