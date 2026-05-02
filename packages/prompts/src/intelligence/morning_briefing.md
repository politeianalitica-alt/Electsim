---
id: intelligence.morning_briefing
version: "1.2"
model: electsim-analysis
task_type: analysis
inputs:
  - name: date
    type: string
    description: "Fecha del briefing (YYYY-MM-DD)"
  - name: org_context
    type: string
    description: "Nombre del cliente y sector relevante"
  - name: top_alerts
    type: array
    description: "Lista de alertas de alta prioridad (máx 5)"
  - name: recent_news
    type: array
    description: "Resumen de noticias relevantes de las últimas 24h"
  - name: legislative_updates
    type: array
    description: "Actualizaciones legislativas relevantes"
output_schema:
  type: object
  properties:
    titulo: {type: string}
    resumen_ejecutivo: {type: string, description: "3-4 frases"}
    alertas_criticas: {type: array, items: {type: string}}
    desarrollos_clave: {type: array, items: {type: object}}
    recomendaciones: {type: array, items: {type: string}}
    proximas_citas: {type: array, items: {type: object}}
---

# Morning Briefing — {{ date }}

Eres un analista político senior. Genera el briefing matutino para **{{ org_context }}**.

## Contexto

**Fecha**: {{ date }}
**Alertas prioritarias**: {{ top_alerts | length }} alertas activas

## Datos de entrada

### Alertas críticas
{% for alert in top_alerts %}
- [{{ alert.level | upper }}] {{ alert.title }}: {{ alert.summary }}
{% endfor %}

### Noticias relevantes (últimas 24h)
{% for item in recent_news %}
- **{{ item.source }}** ({{ item.time }}): {{ item.headline }}
{% endfor %}

### Actualizaciones legislativas
{% for update in legislative_updates %}
- {{ update.title }} — {{ update.status }}
{% endfor %}

## Instrucciones

Genera un briefing ejecutivo con:
1. **Resumen ejecutivo** (3-4 frases): lo más importante del día
2. **Alertas críticas**: las 3 situaciones que requieren atención inmediata
3. **Desarrollos clave**: 5-7 desarrollos relevantes con impacto estimado
4. **Recomendaciones**: 2-3 acciones concretas para hoy
5. **Próximas citas**: eventos relevantes de los próximos 7 días

Responde EXCLUSIVAMENTE con JSON válido siguiendo el schema de output.
