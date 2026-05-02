---
id: comms.actor_briefing
version: "1.0"
model: electsim-analysis
task_type: analysis
inputs:
  - name: actor_name
    type: string
    description: "Nombre del actor político"
  - name: actor_role
    type: string
    description: "Cargo o posición actual"
  - name: context
    type: string
    description: "Contexto del briefing (reunión, debate, entrevista...)"
  - name: key_issues
    type: array
    description: "Temas clave a abordar"
output_schema:
  type: object
  properties:
    perfil_ejecutivo: {type: string}
    posiciones_conocidas: {type: array, items: {type: object}}
    puntos_de_presion: {type: array, items: {type: string}}
    alianzas_y_enemigos: {type: object}
    como_negociar: {type: array, items: {type: string}}
    preguntas_evitar: {type: array, items: {type: string}}
---

# Briefing de Actor — {{ actor_name }}

**Cargo**: {{ actor_role }}
**Contexto**: {{ context }}

## Temas a abordar
{% for issue in key_issues %}
- {{ issue }}
{% endfor %}

Genera un briefing completo sobre {{ actor_name }} para preparar {{ context }},
incluyendo perfil ejecutivo, posiciones conocidas, puntos de presión,
mapa de relaciones y recomendaciones de negociación.
