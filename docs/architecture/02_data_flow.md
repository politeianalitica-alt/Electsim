# Flujo de Datos

## Pipeline principal

```
Fuentes externas              ETL (apps/workers/)
──────────────────────────    ───────────────────
BOE / Eurostat / INE   ──►   connectors/
ACLED / GDELT          ──►   pipelines/
Congreso.es            ──►   nlp/
Twitter/RSS            ──►   normalization/
                             ↓
                        PostgreSQL (datos normalizados)
                             ↓
                        Dashboard Services
                        (dashboard/services/)
                             ↓
                        UI (Streamlit D/N pages)
                        Brain (agents/ + tools/)
```

## Flujo de comunicaciones

```
Señal / Alerta
    ↓
comms_recommender.py → ContentRecommendation
    ↓
message_studio.py → MessageFrame → ContentAsset (status=draft)
    ↓
comms_guardrails.py → ContentRiskCheck
    ↓
approval_workflow.py → ContentApproval (status=pending)
    ↓
[Revisión humana] → status=approved
    ↓
publication_queue.py → PublicationJob (requires_manual_publish=True)
    ↓
[Publicación manual]
    ↓
performance_tracker.py → ContentPerformance
```

## Jerarquía de tenants

```
Platform (super_admin)
    └── Tenant A (tenant_admin)
        └── Workspace 1
            └── Users (analyst, viewer, ...)
    └── Tenant B
        └── ...
```
