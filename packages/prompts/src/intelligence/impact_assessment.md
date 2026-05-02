---
id: intelligence.impact_assessment
version: "1.0"
model: electsim-analysis
task_type: analysis
inputs:
  - name: norm_title
    type: string
    description: "Título de la norma o propuesta legislativa"
  - name: norm_summary
    type: string
    description: "Resumen del contenido normativo"
  - name: sector
    type: string
    description: "Sector de actividad del cliente"
  - name: client_activities
    type: array
    description: "Actividades principales del cliente relevantes"
output_schema:
  type: object
  properties:
    impacto_global: {type: string, enum: [muy_alto, alto, medio, bajo, sin_impacto]}
    score_impacto: {type: number, minimum: 0, maximum: 100}
    areas_afectadas: {type: array, items: {type: string}}
    plazos_clave: {type: array, items: {type: object}}
    acciones_recomendadas: {type: array, items: {type: string}}
    riesgos_incumplimiento: {type: array, items: {type: string}}
---

# Evaluación de Impacto Normativo

**Norma**: {{ norm_title }}
**Sector cliente**: {{ sector }}

## Contenido normativo
{{ norm_summary }}

## Actividades del cliente
{% for activity in client_activities %}
- {{ activity }}
{% endfor %}

Evalúa el impacto de esta norma en el cliente, identificando:
1. Nivel de impacto global y score (0-100)
2. Áreas de la organización afectadas
3. Plazos de cumplimiento clave
4. Acciones recomendadas priorizadas
5. Riesgos de incumplimiento

Responde SOLO con JSON válido.
