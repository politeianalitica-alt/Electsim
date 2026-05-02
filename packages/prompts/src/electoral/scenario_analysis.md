---
id: electoral.scenario_analysis
version: "1.0"
model: electsim-analysis
task_type: analysis
inputs:
  - name: poll_data
    type: array
    description: "Datos de encuestas recientes"
  - name: historical_results
    type: object
    description: "Resultados históricos de referencia"
  - name: key_factors
    type: array
    description: "Factores de campaña relevantes"
output_schema:
  type: object
  properties:
    escenarios:
      type: array
      items:
        type: object
        properties:
          nombre: {type: string}
          probabilidad: {type: number}
          descripcion: {type: string}
          resultados_estimados: {type: object}
    escenario_central: {type: string}
    factores_determinantes: {type: array, items: {type: string}}
    recomendaciones_estrategicas: {type: array, items: {type: string}}
---

# Análisis de Escenarios Electorales

## Datos de encuestas
{% for poll in poll_data %}
- {{ poll.pollster }} ({{ poll.date }}): {% for party, pct in poll.results.items() %}{{ party }}={{ pct }}% {% endfor %}
{% endfor %}

## Factores de campaña
{% for factor in key_factors %}
- {{ factor }}
{% endfor %}

Genera 3-5 escenarios electorales con probabilidades, describe el escenario
central más probable y proporciona recomendaciones estratégicas.
