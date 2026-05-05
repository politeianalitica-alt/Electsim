# Navegación del Dashboard

## Sidebar principal (páginas activas)

| Orden | Página | Módulo | Permiso |
|-------|--------|--------|---------|
| 1 | D1 Briefings | briefings | briefings:read |
| 2 | D2 Mapa de Actores | actors | risk:read |
| 3 | D3 Termómetro | risk | risk:read |
| 4 | D4 Legislativo | legislative | legislative:read |
| 5 | D5 Gobierno/Coalición | coalition | electoral:read |
| 6 | D6 Alertas | alerts | briefings:read |
| 7 | D7 Medios | media | media:read |
| 8 | D8 Geopolítica | geopolitics | geopolitics:read |
| 9 | D10 Centro de Operaciones | operations | data_ops:read |
| 10 | N1 Electoral | electoral | electoral:read |
| 11 | N5 Campaña | campaign | campaign:read |
| 12 | N6 Economía | economy | economic:read |
| 13 | N8 Brain | brain | brain:use_tools |
| 14 | N9 Command Center | command_center | data_ops:read |

## Páginas legacy (no en sidebar principal)

Ver `docs/navigation_matrix.md` para lista completa.

## Regla

El sidebar solo muestra páginas con `status=active` en navigation_matrix.
Las legacy se acceden directamente por URL pero no aparecen en el menú.

## D10 vs N9

| D10 Centro de Operaciones | N9 Command Center |
|--------------------------|-------------------|
| Vista operativa de negocio | Vista técnica del sistema |
| Alertas, CRM, Comms | DB, pipelines, migraciones |
| Stakeholders, briefings | Esquemas, fuentes, audit |
| Riesgos emergentes | Salud técnica, secretos |
