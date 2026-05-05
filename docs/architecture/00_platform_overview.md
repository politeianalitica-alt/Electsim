# ElectSim — Visión General de la Plataforma

## Qué es ElectSim

ElectSim (Politeia) es una plataforma SaaS B2B de inteligencia política y comunicación estratégica.
Ayuda a consultoras, partidos, think-tanks y empresas a entender el entorno político,
gestionar stakeholders y producir comunicación estratégica con evidencias verificables.

## Bloques implementados

| Bloque | Módulo | Estado | Descripción |
|--------|--------|--------|-------------|
| B1-B4 | Core ETL, Analytics, Agentes | Completo | Scrapers, NLP, D'Hondt, agentes LLM |
| B5 | Multi-tenant SaaS | Completo | Auth, tenancy, RLS |
| B6 | Product & Module Config | Completo | Products YAML, módulos dinámicos |
| B7 | Observabilidad | Completo | OTel, métricas, logging JSON |
| B8 | Arquitectura monorepo | En progreso | Turborepo, packages/ |
| B9 | Document Intelligence | Completo | Docling, RAG, evidencias |
| B10 | Open Data Core | Completo | 18 conectores ETL, catalog |
| B11 | Simulation Core | Completo | Monte Carlo, stress testing |
| B12 | Dashboard UX | Completo | Design system, 15 módulos UI |
| B13 | Security Core | Completo | RBAC, audit, PII, secrets |
| B14 | Geopolitical Intelligence | Completo | ACLED, GDELT, riesgo país |
| B15 | Stakeholder CRM | Completo | Contactos, stakeholders, outreach |
| B16 | Communications Core | Completo | Contenido, calendar, distribución |
| S1 | Subsanación 1 | Completo | DB, migraciones, repositories, CI |
| S2 | Subsanación 2 | Completo | Seguridad aplicada, governance, docs |

## Capas de la arquitectura

```text
┌─────────────────────────────────────────────┐
│  Dashboard (Streamlit)     N8 Brain          │
│  D1-D10 · N1-N9           Tool Authorizer    │
├──────────────────┬──────────────────────────┤
│  Dashboard       │  Agents / Brain           │
│  Services        │  Tool Registry            │
├──────────────────┴──────────────────────────┤
│  Domain Services (crm/, comms/, security/)   │
├─────────────────────────────────────────────┤
│  Repositories (crm/repo, comms/repo, ...)   │
├─────────────────────────────────────────────┤
│  db/session.py  →  PostgreSQL               │
└─────────────────────────────────────────────┘
```

## Principios

1. **Graceful degradation**: todo módulo funciona sin DB con modo fallback.
2. **Tenant isolation**: datos privados siempre filtrados por tenant_id.
3. **Evidence first**: afirmaciones públicas requieren evidencia.
4. **Human in the loop**: comunicaciones requieren aprobación humana.
5. **No auto-publish**: `requires_manual_publish=True` siempre.
6. **Audit trail**: acciones sensibles siempre registradas.
