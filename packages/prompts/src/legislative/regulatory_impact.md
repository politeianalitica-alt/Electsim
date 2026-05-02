---
id: legislative.regulatory_impact
version: "1.0"
model: electsim-analysis
task_type: analysis
inputs:
  - name: regulation_text
    type: string
    description: "Texto o resumen de la regulación"
  - name: industry
    type: string
    description: "Sector industrial afectado"
  - name: company_profile
    type: string
    description: "Perfil de la empresa cliente"
output_schema:
  type: object
  properties:
    resumen_regulatorio: {type: string}
    impacto_operacional: {type: string, enum: [alto, medio, bajo]}
    costes_estimados: {type: string}
    plazos: {type: array, items: {type: object}}
    oportunidades: {type: array, items: {type: string}}
    riesgos: {type: array, items: {type: string}}
    pasos_accion: {type: array, items: {type: string}}
---

# Análisis de Impacto Regulatorio

**Sector**: {{ industry }}
**Perfil empresa**: {{ company_profile }}

## Texto regulatorio
{{ regulation_text }}

Analiza el impacto de esta regulación en la empresa cliente,
identificando costes, plazos, oportunidades y pasos de acción.
