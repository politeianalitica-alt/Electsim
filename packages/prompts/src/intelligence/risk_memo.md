---
id: intelligence.risk_memo
version: "1.0"
model: electsim-analysis
task_type: analysis
inputs:
  - name: actor
    type: string
    description: "Actor político analizado"
  - name: timeframe
    type: string
    description: "Período de análisis (ej: '30 días')"
  - name: events
    type: array
    description: "Eventos relevantes del período"
  - name: current_risk_score
    type: number
    description: "Score de riesgo actual (0-100)"
output_schema:
  type: object
  properties:
    nivel_riesgo: {type: string, enum: [bajo, medio, alto, critico]}
    score: {type: number, minimum: 0, maximum: 100}
    factores_riesgo: {type: array, items: {type: string}}
    tendencia: {type: string, enum: [mejorando, estable, empeorando]}
    recomendaciones: {type: array, items: {type: string}}
    horizonte_temporal: {type: string}
---

# Memo de Riesgo Político — {{ actor }}

Período: {{ timeframe }} | Score actual: {{ current_risk_score }}/100

## Eventos del período
{% for event in events %}
- {{ event.date }}: {{ event.description }} (impacto: {{ event.impact }})
{% endfor %}

Analiza el riesgo político actual de **{{ actor }}** considerando:
- Posición en encuestas y evolución
- Presión mediática y narrativa dominante
- Riesgos legislativos y regulatorios
- Vulnerabilidades de comunicación

Responde con JSON según el schema definido.
