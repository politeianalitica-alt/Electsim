# War Room España operativa

Esta guía convierte ElectSim en centro de mando operacional.

## Flujo operativo recomendado

1. **Detección**: alerta en `alertas_sistema` + scraping en `scraping_log`.
2. **Diagnóstico**: `POST /actions/semantic_search_posts` + `GET /analytics/nowcast`.
3. **Simulación**: `POST /actions/simulate_campaign`.
4. **Decisión**: aprobar acción y registrar en `decision_log`.
5. **Seguimiento**: refresco 2h/24h/72h en `dashboard/pages/18_War_Room_Espana.py`.

## Playbooks

- **Escándalo político**: activar red-team, extraer narrativas, preparar contra-mensaje en 15 minutos.
- **Shock macroeconómico**: recalcular nowcast + riesgo + framing económico.
- **Encuesta adversa**: comparar con tracking histórico y ejecutar simulador de campaña por segmento.
- **Debate electoral**: monitor de narrativas cada 10 min, alertas por cambio de tono.

## KPIs de operación

- `time_to_detect`
- `time_to_decide`
- `time_to_message`
- `alert_precision`
- `nowcast_error`
