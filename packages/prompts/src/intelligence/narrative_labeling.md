---
id: intelligence.narrative_labeling
version: "1.1"
model: electsim-fast
task_type: classification
inputs:
  - name: text
    type: string
    description: "Texto a clasificar"
  - name: candidate_narratives
    type: array
    description: "Lista de narrativas candidatas (máx 10)"
output_schema:
  type: object
  properties:
    primary_narrative: {type: string}
    confidence: {type: number, minimum: 0, maximum: 1}
    secondary_narratives: {type: array, items: {type: string}}
    framing: {type: string, enum: [positivo, negativo, neutro, alarmista, esperanzador]}
    actors_mentioned: {type: array, items: {type: string}}
---

# Clasificación de Narrativa

Clasifica el siguiente texto político en las narrativas disponibles.

## Texto
{{ text }}

## Narrativas candidatas
{% for narrative in candidate_narratives %}
{{ loop.index }}. {{ narrative }}
{% endfor %}

Identifica la narrativa principal, confianza (0-1), narrativas secundarias,
el encuadre dominante y actores mencionados.

Responde SOLO con JSON válido.
