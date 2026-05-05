# Bloque 15 — Stakeholder CRM & Mobilization Core

## Objetivo
Convertir ElectSim en una plataforma de acción relacional: CRM institucional
responsable que conecta contactos → organizaciones → sectores → territorios →
temas → riesgos → interacciones → tareas → campañas.

## Principios éticos
- Solo contactos institucionales/profesionales — nunca ciudadanos privados
- Consentimiento obligatorio para contacto directo (email, teléfono, SMS)
- Auditable: toda acción queda en audit log
- Multi-tenant: datos completamente aislados por tenant_id
- No microtargeting opaco: scoring visible y explicable

## Archivos creados

### crm/ (18 módulos)

| Archivo | Contenido |
|---------|-----------|
| `__init__.py` | Package init con principios éticos |
| `schemas.py` | 11 modelos Pydantic v2: Contact, Organization, Relationship, Interaction, OutreachTask, Segment, MobilizationEvent, StakeholderProfile, ConsentEvent, MeetingPack, CRMRunResult |
| `contacts.py` | CRUD contactos: create_contact (ON CONFLICT DO UPDATE), search_contacts, get_contact, update_contact, deduplicate_contact_candidates |
| `organizations.py` | CRUD organizaciones: create_organization, search_organizations, get_organization, link_organization_to_risk_entity, link_organization_to_actor_graph |
| `crm_scoring.py` | Motor de scoring: WEIGHTS dict, compute_influence_score, compute_proximity_score, compute_relationship_freshness, compute_stakeholder_priority, get_priority_label |
| `stakeholders.py` | Perfiles de prioridad: compute_stakeholder_profile, get_stakeholder_profile, list_priority_stakeholders |
| `relationships.py` | Grafo de relaciones: create_relationship, get_relationship_graph (BFS depth=2), find_bridge_contacts, infer_relationships_from_actor_graph |
| `interactions.py` | Timeline: log_interaction, get_contact_timeline, get_organization_timeline, summarize_recent_interactions, get_last_interaction_date |
| `tasks.py` | Tareas outreach: create_task, get_due_tasks, mark_task_done, create_follow_up_task, detect_overdue_tasks |
| `consent.py` | Gestión consentimiento: can_contact, update_consent_status, mark_do_not_contact, get_consent_history, _log_audit |
| `outreach.py` | Acciones relacionales: recommend_outreach_actions, generate_briefing_for_contact, prepare_meeting_pack, create_outreach_plan |
| `segments.py` | Segmentos: create_segment, list_segments, evaluate_segment_rules, add_static_member, remove_static_member |
| `mobilization.py` | Movilización: create_mobilization_event, assign_contacts_to_event, list_mobilization_events, summarize_event_outcome |
| `field_operations.py` | Operaciones de campo: get_field_plan_by_territory, compute_mobilization_capacity, recommend_field_actions |
| `crm_importer.py` | Importación: import_contacts_csv/excel, import_organizations_csv, normalize_contact_row, _import_contacts_df (con dedup) |
| `crm_exporter.py` | Exportación: export_contacts_csv, export_tasks_csv, export_meeting_pack_markdown |
| `crm_recommender.py` | Recomendaciones: recommend_actions_for_all_contacts, detect_stale_relationships, generate_crm_alerts |
| `crm_monitor.py` | Monitor pipeline: CRMRunResult, run_full_crm_pipeline |

### db/migrations/versions/
- `0052_crm_core.py` — 8 tablas: crm_contacts, crm_organizations, crm_stakeholder_profiles, crm_relationships, crm_interactions, crm_outreach_tasks, crm_segments, crm_mobilization_events. revision="0052", down_revision="0051"

### dashboard/services/
- `crm_core.py` — 13 funciones: cargar_crm_kpis, cargar_contactos, cargar_organizaciones, cargar_stakeholders_prioritarios, cargar_contacto, cargar_organizacion, cargar_timeline_contacto, cargar_relationship_graph, cargar_tareas_pendientes, cargar_eventos_movilizacion, cargar_segmentos_crm, cargar_alertas_crm

### dashboard/components/
- `crm_components.py` — 10 componentes: render_contact_card, render_organization_card, render_stakeholder_priority_card, render_interaction_timeline, render_outreach_task_card, render_relationship_graph_panel, render_segment_card, render_mobilization_event_card, render_meeting_pack_panel, render_crm_kpis_row

### agents/tools/
- `crm_tools.py` — 8 Brain tools: search_contacts, get_contact_profile, get_organization_profile, get_stakeholder_priorities, recommend_outreach_actions, prepare_meeting_pack, get_due_crm_tasks, get_field_plan_by_territory

### pipelines/
- `crm_core.py` — CLI: --score-stakeholders, --detect-followups, --recommend-actions, --import-contacts, --import-organizations, --export-contacts, --source all

### Páginas adaptadas
- `dashboard/pages/D2_Actores.py` — Bloque CRM import añadido
- `dashboard/pages/N5_Campana.py` — CRM Field Ops import añadido
- `dashboard/pages/D10_Centro_Operaciones.py` — CRM KPIs import añadido

### tests/
- `test_crm_core.py` — 20+ tests / 8 clases: TestContactSchema, TestContactCRUD, TestConsent, TestStakeholderScoring, TestInteractions, TestRelationships, TestImportExport, TestCrmService, TestCrmTools

## Fórmula de scoring stakeholder

```
priority = 0.25×influence + 0.20×proximity + 0.15×topic_urgency
         + 0.15×risk_exposure + 0.10×responsiveness
         + 0.10×territorial + 0.05×freshness
```

| Score | Label |
|-------|-------|
| 76-100 | CRÍTICA |
| 51-75 | ALTA |
| 26-50 | NORMAL |
| 0-25 | BAJA |

## Consent status

| Status | Contacto email/phone | Contacto presencial |
|--------|---------------------|---------------------|
| consented | ✅ | ✅ |
| legitimate_interest | ✅ | ✅ |
| unknown | ❌ | ✅ |
| do_not_contact | ❌ | ❌ |
| revoked | ❌ | ❌ |

## Tipos de contacto
public_official, political_actor, journalist, business_actor, civil_society, academic, other

## Tipos de organización
political_party, government_body, business_association, ngo, media_outlet, think_tank, union, international_org, other

## Variables de entorno
Ninguna requerida — todo con fallback in-memory. El CRM funciona sin base de datos.

## Tests
20+ tests cubriendo schemas, CRUD, consentimiento, scoring, interacciones, relaciones, importación, servicio y brain tools.
