# Separación grano/paja de repos en `gits amigos`

Resultado de revisión repo-a-repo para decidir adopción en ElectSim.

| Repo | Decisión | Motivo |
|---|---|---|
| AgentTorch-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| alembic-main | 🟡 Referencia | Patrones de arquitectura de datos/migraciones ya alineados con el stack actual. |
| anesr-master | 🟡 Referencia | Repositorio metodológico/estadístico valioso como base analítica, sin integración directa de código en esta iteración. |
| BDA_course_Aalto-master | 🟡 Referencia | Repositorio metodológico/estadístico valioso como base analítica, sin integración directa de código en esta iteración. |
| candidator-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| civio-graphs-public-main | 🟡 Referencia | Buenas prácticas de visualización narrativa y explicativa. |
| congreso-scrapper-main | 🟡 Referencia | Patrones para scraping del Congreso de España. |
| congress-main | 🟡 Referencia | Estructura de ingesta legislativa y normalización de eventos. |
| dash-dev | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| data-master | 🟡 Referencia | Fuente de patrones de ingesta y datos abiertos; posible incorporación incremental por conectores específicos. |
| data-master 2 | 🟡 Referencia | Fuente de patrones de ingesta y datos abiertos; posible incorporación incremental por conectores específicos. |
| dbt-core-main | ✅ Adoptado | Práctica de contratos y pruebas de datos; trasladado a configuración YAML de SLAs operativos. |
| everypolitician-gh-pages | 🟡 Referencia | Estrategia de catálogo global de legisladores. |
| great_expectations-develop | ✅ Adoptado | Práctica de validaciones declarativas por expectativas; trasladado a SLAs y checks por fase. |
| group_mention_detection-main | ✅ Adoptado | Idea de detección de menciones de grupos; aplicada al refuerzo de tracker con sugerencias automáticas. |
| infoelectoral-master | 🟡 Referencia | Conector de resultados oficiales de España para enriquecer base electoral. |
| involvement_polarization-main | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| kmodes-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| langchain-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| legislative-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| Machine-Learning-with-Python-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| manifestoR-master | 🟡 Referencia | Integración de corpus de manifiestos para análisis programático. |
| manifestos-converter-main | 🟡 Referencia | Conversión de manifiestos PDF a texto estructurado. |
| mesa-main | 🟡 Referencia | Repositorio metodológico/estadístico valioso como base analítica, sin integración directa de código en esta iteración. |
| openstates-scrapers-main | 🟡 Referencia | Buenas prácticas de scrapers legislativos robustos. |
| pewmethods-master | 🟡 Referencia | Repositorio metodológico/estadístico valioso como base analítica, sin integración directa de código en esta iteración. |
| phrasemachine-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| plot-main | 🟡 Referencia | EDA visual declarativa; útil como inspiración para futuros módulos frontend. |
| plotly.py-main | ✅ Adoptado | Buenas prácticas de visualización y layout; usadas en páginas de monitor y operaciones. |
| PolData-master | 🟡 Referencia | Fuente de patrones de ingesta y datos abiertos; posible incorporación incremental por conectores específicos. |
| prefect-main | ✅ Adoptado | Patrón de observabilidad de pipelines y estados; aplicado en vista operacional por fases. |
| presupuesto-master | 🟡 Referencia | Excelentes principios de visualización presupuestaria comprensible para no expertos. |
| prince-master | 🟡 Referencia | Repositorio metodológico/estadístico valioso como base analítica, sin integración directa de código en esta iteración. |
| pymc-6 | 🟡 Referencia | Repositorio metodológico/estadístico valioso como base analítica, sin integración directa de código en esta iteración. |
| pyreadstat-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| pysim-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| qhld-backend-main | 🟡 Referencia | Arquitectura backend político útil para evolución de API. |
| qhld-data-main | 🟡 Referencia | Modelado de datos parlamentarios para enriquecimientos futuros. |
| qhld.es-main | 🟡 Referencia | UX de monitor parlamentario para inspiración funcional. |
| scraper-alcaldes-master | 🟡 Referencia | Fuente de patrones de ingesta y datos abiertos; posible incorporación incremental por conectores específicos. |
| scraper-ccaa-budget-summaries-master | 🟡 Referencia | Fuente de patrones de ingesta y datos abiertos; posible incorporación incremental por conectores específicos. |
| scraper-party-register-master | 🟡 Referencia | Fuente de patrones de ingesta y datos abiertos; posible incorporación incremental por conectores específicos. |
| scraper-pge-master | 🟡 Referencia | Fuente de patrones de ingesta y datos abiertos; posible incorporación incremental por conectores específicos. |
| scrapy-master | 🟡 Referencia | Fuente de patrones de ingesta y datos abiertos; posible incorporación incremental por conectores específicos. |
| SpainPoliticsAnalytics-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| sqlmodel-main | 🟡 Referencia | Patrones de arquitectura de datos/migraciones ya alineados con el stack actual. |
| statsmodels-main | 🟡 Referencia | Repositorio metodológico/estadístico valioso como base analítica, sin integración directa de código en esta iteración. |
| streamlit-aggrid-main | 🟡 Referencia | Tabla avanzada interesante, no integrada para evitar dependencia extra y complejidad UX en esta iteración. |
| streamlit-extras-main | ✅ Adoptado | Patrón UX de componentes utilitarios y quick actions; aplicado en sugerencias de tracker y UI operativa. |
| theyworkforyou-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| us-potus-model-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| vega-lite-main | 🟡 Referencia | Gramática visual valiosa; no integrada por stack JS adicional. |
| verba-master | ⚪ Descartado | No aporta valor directo al dashboard actual o queda fuera de alcance funcional inmediato. |
| votainteligente-portal-electoral-master | 🟡 Referencia | Mecánicas de compromiso ciudadano y comparación de candidatos. |
| weightedcalcs-master | 🟡 Referencia | Cálculos ponderados útiles para score de sentimiento/alcance en próxima iteración. |
| worldmonitor-main | ✅ Adoptado | Patrón de centro de situación unificado; inspira nueva página 26 Centro de Operaciones. |

## Cambios aplicados en esta iteración
- Centro de Operaciones por fases (inspiración worldmonitor/prefect/dbt/great-expectations).
- SLAs operativos declarativos en YAML para datasets críticos.
- Correcciones de fiabilidad en DB (macro + filtros nulos).
- Mejora de operativa en Tracker con sugerencias automáticas de objetos.