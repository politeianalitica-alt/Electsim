---
id: comms.crisis_response_kit
version: "1.0"
model: electsim-analysis
task_type: plan
inputs:
  - name: crisis_description
    type: string
    description: "Descripción de la crisis o situación adversa"
  - name: actor_name
    type: string
    description: "Nombre del político/organización"
  - name: stakeholders
    type: array
    description: "Partes interesadas relevantes"
  - name: media_coverage
    type: string
    description: "Tipo y volumen de cobertura mediática actual"
output_schema:
  type: object
  properties:
    marco_narrativo: {type: string, description: "La narrativa que se debe impulsar"}
    mensajes_clave: {type: array, items: {type: string}, maxItems: 3}
    acciones_inmediatas: {type: array, items: {type: object}}
    lineas_a_evitar: {type: array, items: {type: string}}
    portavoces_recomendados: {type: array, items: {type: string}}
    calendario_comunicacion: {type: array, items: {type: object}}
---

# Kit de Respuesta a Crisis — {{ actor_name }}

**Situación**: {{ crisis_description }}
**Cobertura mediática**: {{ media_coverage }}

## Partes interesadas
{% for stakeholder in stakeholders %}
- {{ stakeholder }}
{% endfor %}

Genera un kit completo de respuesta a crisis con:
1. Marco narrativo que debe impulsarse
2. 3 mensajes clave (concisos, memorables)
3. Acciones inmediatas (próximas 24-48h)
4. Líneas argumentales que deben evitarse
5. Portavoces recomendados por canal
6. Calendario de comunicación (7 días)

Responde SOLO con JSON válido.
