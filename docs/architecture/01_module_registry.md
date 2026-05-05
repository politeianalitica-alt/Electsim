# Registro de Módulos

> Ver `core/module_registry.py` para la fuente de verdad en código.

## Módulos activos

| ID | Label | Página | Permiso lectura | Tabla DB |
|----|-------|--------|-----------------|----------|
| briefings | Briefings | D1 | briefings:read | source_documents |
| actors | Mapa de Actores | D2 | risk:read | crm_contacts |
| risk | Termómetro | D3 | risk:read | — |
| legislative | Legislativo | D4 | legislative:read | — |
| coalition | Gobierno/Coalición | D5 | electoral:read | — |
| alerts | Alertas | D6 | briefings:read | — |
| media | Medios | D7 | media:read | — |
| geopolitics | Geopolítica | D8 | geopolitics:read | geo_events |
| operations | Operaciones | D10 | data_ops:read | — |
| electoral | Electoral | N1 | electoral:read | — |
| campaign | Campaña | N5 | campaign:read | — |
| economy | Economía | N6 | economic:read | — |
| brain | Brain | N8 | brain:use_tools | — |
| command_center | Command Center | N9 | data_ops:read | — |
| crm | CRM | CRM | crm:read | crm_contacts |
| comms | Comunicaciones | COMMS | comms:read | content_assets |
| documents | Documentos | DOCS | documents:read | source_documents |
| simulation | Simulación | SIM | simulation:read | simulation_scenarios |
| security | Seguridad | SEC | audit:read | audit_events |
| data_ops | Data Ops | DATAOPS | data_ops:read | — |
| opendata | Open Data | D9 | opendata:read | — |

## Grupos de módulos

- **intelligence**: briefings, actors, risk, legislative, alerts, media, geopolitics, documents
- **electoral**: coalition, electoral
- **campaign**: campaign
- **analytics**: economy, simulation
- **ai**: brain
- **crm**: crm, comms
- **ops**: operations, command_center, security, data_ops
- **data**: opendata
