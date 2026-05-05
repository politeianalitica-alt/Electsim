# Navigation Matrix — ElectSim

> Fuente de verdad para el estado de cada página del dashboard.
> Actualizado: 2026-05

## Páginas activas (D-series)

| file | label | status | module_id | replacement | notes |
|------|-------|--------|-----------|-------------|-------|
| D1_Briefings.py | Briefings | active | briefings | — | Briefings de inteligencia diarios |
| D2_Actores.py | Mapa de Actores | active | actors | — | CRM, stakeholders, grafos de relaciones |
| D3_Termometro.py | Termómetro de Riesgo | active | risk | — | Indicadores de riesgo político |
| D4_Legislativo.py | Legislativo | active | legislative | — | BOE, Congreso, actividad institucional |
| D5_Coalicion.py | Gobierno y Coalición | active | coalition | — | Escenarios de coalición, hemiciclo |
| D6_Alertas.py | Alertas | active | alerts | — | Sistema de alertas y señales |
| D7_Medios.py | Medios | active | media | — | Monitor de medios y RRSS |
| D8_Geopolitica.py | Geopolítica | active | geopolitics | — | ACLED, GDELT, riesgo país |
| D9_Communication.py | Comunicaciones | active | comms | — | Comunicación estratégica |
| D10_Centro_Operaciones.py | Centro de Operaciones | active | operations | — | Vista operativa de negocio |
| D11_MapaNoticias.py | Mapa de Noticias | active | media | — | Mapa geográfico de noticias |

## Páginas activas (N-series)

| file | label | status | module_id | replacement | notes |
|------|-------|--------|-----------|-------------|-------|
| N0_Inicio.py | Inicio | active | — | — | Pantalla de bienvenida y resumen |
| N1_Electoral.py | Electoral | active | electoral | — | Simulación electoral, D'Hondt |
| N2_Inteligencia.py | Inteligencia | active | briefings | — | Módulo de inteligencia avanzada |
| N3_Medios.py | Medios Avanzado | active | media | — | Análisis avanzado de medios |
| N4_Institucional.py | Institucional | active | legislative | — | Actividad institucional ampliada |
| N5_Campana.py | Campaña | active | campaign | — | Gestión de campaña electoral |
| N6_Economia.py | Economía | active | economy | — | Indicadores económicos y macroeco |
| N8_ChatIA.py | Brain (IA) | active | brain | — | Chat con herramientas LLM |
| N9_Command_Center.py | Command Center | active | command_center | — | Vista técnica del sistema |

## Páginas legacy (sustituidas por D/N-series)

| file | label | status | module_id | replacement | notes |
|------|-------|--------|-----------|-------------|-------|
| 0_Pagina_Inicial.py | Página Inicial | legacy | — | N0_Inicio.py | Sustituida por N0 |
| 1_Mapa_Electoral.py | Mapa Electoral | legacy | electoral | N1_Electoral.py | Sustituida por N1 |
| 2_Nowcasting.py | Nowcasting | legacy | electoral | N1_Electoral.py | Integrado en N1 |
| 3_Escenarios.py | Escenarios | legacy | simulation | N1_Electoral.py | Integrado en N1 |
| 4_Coaliciones.py | Coaliciones | legacy | coalition | D5_Coalicion.py | Sustituida por D5 |
| 5_Agentes_LLM.py | Agentes LLM | legacy | brain | N8_ChatIA.py | Sustituida por N8 |
| 6_Riesgo.py | Riesgo | legacy | risk | D3_Termometro.py | Sustituida por D3 |
| 7_Validacion.py | Validación | legacy | — | — | Sin sucesor directo |
| 8_Tiempo_Real.py | Tiempo Real | legacy | alerts | D6_Alertas.py | Sustituida por D6 |
| 9_Indices_Politeia.py | Índices Politeia | legacy | risk | D3_Termometro.py | Integrado en D3 |
| 10_Prensa_Agenda.py | Prensa y Agenda | legacy | media | D7_Medios.py | Sustituida por D7 |
| 11_Congreso_Institucional.py | Congreso Institucional | legacy | legislative | D4_Legislativo.py | Sustituida por D4 |
| 12_Macroeconomia.py | Macroeconomía | legacy | economy | N6_Economia.py | Sustituida por N6 |
| 14_Monitor_Sentimiento.py | Monitor Sentimiento | legacy | media | D7_Medios.py | Integrado en D7 |
| 15_Agenda_Lideres.py | Agenda Líderes | legacy | legislative | D4_Legislativo.py | Integrado en D4 |
| 16_Fichas_Politicos.py | Fichas Políticos | legacy | actors | D2_Actores.py | Integrado en D2 |
| 17_Nowcasting_Component.py | Nowcasting Component | legacy | electoral | N1_Electoral.py | Componente integrado en N1 |
| 18_War_Room_Espana.py | War Room España | legacy | campaign | N5_Campana.py | Sustituida por N5 |
| 19_Impacto_Campana.py | Impacto Campaña | legacy | campaign | N5_Campana.py | Integrado en N5 |
| 20_Monitor_Medios_RRSS.py | Monitor Medios RRSS | legacy | media | D7_Medios.py | Integrado en D7 |
| 21_Opposition_Research.py | Opposition Research | legacy | actors | D2_Actores.py | Integrado en D2 |
| 22_Coordinacion_Campana.py | Coordinación Campaña | legacy | campaign | N5_Campana.py | Integrado en N5 |
| 23_Memoria_Institucional.py | Memoria Institucional | legacy | legislative | D4_Legislativo.py | Integrado en D4 |
| 24_Tracker_Narrativas.py | Tracker Narrativas | legacy | media | D7_Medios.py | Integrado en D7 |
| 25_Voto_Blando.py | Voto Blando | legacy | electoral | N1_Electoral.py | Integrado en N1 |
| 26_Centro_Operaciones.py | Centro de Operaciones (v1) | legacy | operations | D10_Centro_Operaciones.py | Sustituida por D10 |
| 27_IA_Local.py | IA Local | legacy | brain | N8_ChatIA.py | Integrado en N8 |
| 34_Geopolitica.py | Geopolítica (v1) | legacy | geopolitics | D8_Geopolitica.py | Sustituida por D8 |
| 44_Radar_Mediatico.py | Radar Mediático | legacy | media | D7_Medios.py | Sustituida por D7 |

## Páginas debug/lab

| file | label | status | module_id | replacement | notes |
|------|-------|--------|-----------|-------------|-------|
| D10_Workspace.py | Workspace (UI Lab) | debug | — | — | Laboratorio de UI state, no en producción |
| N7_Laboratorio.py | Laboratorio | debug | — | — | Experimentos y pruebas, no en producción |

## Reglas de sidebar

El sidebar principal debe mostrar solo páginas con `status=active`.
Las páginas legacy se mantienen pero no aparecen en la navegación principal.
Las páginas `debug` tampoco se incluyen en el sidebar de producción.

En `DEV_MODE=true` se pueden mostrar las páginas debug en el sidebar con un indicador visual.
