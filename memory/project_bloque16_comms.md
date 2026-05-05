# Bloque 16 — Communications & Content Operations Core

## Objetivo
Convertir ElectSim de "detección de inteligencia" a "producción de comunicación estratégica".
Cadena: señal → interpretación estratégica → mensaje recomendado → formato → canal → aprobación → publicación manual → medición → aprendizaje.

## Restricciones éticas irrenunciables
- `requires_manual_publish=True` en todo `PublicationJob` — nunca auto-publicar
- Aprobación humana obligatoria para contenido sensible (press_note, speech, thread)
- Consentimiento CRM validado antes de cualquier distribución (do_not_contact/revoked bloqueados)
- `comms_guardrails.py` detecta: PII, difamación, afirmaciones sin evidencia, microtargeting sensible
- Q&A pack marcado "⚠️ Uso exclusivo interno"

## Estructura del paquete `communications/`

| Módulo | Responsabilidad |
|--------|----------------|
| `schemas.py` | 10 modelos Pydantic v2 |
| `channel_registry.py` | 7 canales predeterminados, CRUD |
| `template_library.py` | 10 plantillas `{variable}` con SafeDict fallback |
| `message_studio.py` | Pipeline MessageFrame → ContentAsset |
| `social_post_builder.py` | LinkedIn, tweet, thread, infographic caption |
| `newsletter_builder.py` | Newsletter semanal, client update |
| `press_note_builder.py` | Nota de prensa, declaración reactiva, Q&A |
| `content_assets.py` | CRUD de ContentAsset |
| `content_calendar.py` | Calendario editorial, slots sugeridos |
| `approval_workflow.py` | Flujo aprobación: request → approve/reject |
| `publication_queue.py` | Cola manual, mark_as_published |
| `briefing_distribution.py` | Resolución de listas + validación consentimiento |
| `comms_guardrails.py` | Detección de riesgos en contenido |
| `message_testing.py` | Scoring: claridad, evidencia, riesgo, channel_fit |
| `performance_tracker.py` | Registro métricas, outliers (2σ) |
| `comms_recommender.py` | Recomendaciones desde alertas/narrativas/stakeholders |
| `comms_monitor.py` | Pipeline completo + health check |
| `__init__.py` | Package con `__all__` de 17 módulos |

## Schemas clave

```python
# MessageFrame — el mensaje estratégico nuclear
MessageFrame(
    frame_id="frm_...",
    title="El empleo crece un 3%",
    core_claim="La política X ha generado Y empleos",
    key_points=["Punto 1", "Punto 2"],
    evidence_ids=["ev_001"],
    target_audiences=["medios", "stakeholders"],
    tone="balanced",
    tenant_id="t1",
)

# ContentAsset — formato específico derivado del frame
ContentAsset(
    asset_id="ast_...",
    frame_id="frm_...",
    asset_type="linkedin_post",  # tweet|thread|newsletter|press_note|email|speech|q_and_a|briefing|infographic_caption
    channel_id="ch_...",
    body="Texto del contenido",
    status="draft",  # draft|review|approved|scheduled|published|archived|rejected
    requires_approval=True,
)

# PublicationJob — siempre manual
PublicationJob(
    job_id="pub_...",
    asset_id="ast_...",
    channel_id="ch_...",
    requires_manual_publish=True,  # SIEMPRE True
    status="pending",
)
```

## Patrones de implementación

### ID generation
```python
from communications.schemas import _new_id
asset_id = _new_id("ast_")  # "ast_" + uuid4().hex[:12]
```

### Template rendering (format_map, NO Jinja2)
```python
class SafeDict(dict):
    def __missing__(self, key: str) -> str:
        return f"[{key}]"
body.format_map(SafeDict(context))
```

### Almacenamiento en memoria (fallback sin DB)
```python
_FRAMES: dict[str, MessageFrame] = {}
_ASSETS: dict[str, ContentAsset] = {}
_CHANNELS: dict[str, CommunicationChannel] = {}
_JOBS: dict[str, PublicationJob] = {}
_APPROVALS: dict[str, ContentApproval] = {}
```

### Guardrails
```python
flags = check_content_risks(asset.body, context={"asset_type": asset.asset_type})
# flags puede contener: "claim_without_evidence", "personal_data",
# "defamatory_language", "overconfident_forecast",
# "sensitive_political_targeting", "osint_sensitive_reference"
```

## Migración DB
- Archivo: `db/migrations/versions/0053_comms_core.py`
- Revisión: `0053`, down_revision: `0052`
- 8 tablas: `comms_channels`, `message_frames`, `content_assets`, `editorial_calendar`, `distribution_lists`, `publication_jobs`, `content_approvals`, `content_performance`

## Dashboard service (`dashboard/services/comms_core.py`)
10 funciones `cargar_*()` con cache TTL:
- `cargar_comms_kpis(tenant_id)` → dict
- `cargar_content_assets(tenant_id, status, asset_type)` → list
- `cargar_content_asset(asset_id, tenant_id)` → ContentAsset | None
- `cargar_editorial_calendar(tenant_id, days_ahead)` → list
- `cargar_publication_queue(tenant_id)` → list
- `cargar_pending_approvals(tenant_id)` → list
- `cargar_distribution_lists(tenant_id)` → list
- `cargar_content_performance(tenant_id, days)` → list
- `cargar_recommended_content(tenant_id)` → list
- `cargar_channels(tenant_id)` → list

Llama a `seed_default_channels()` en import.

## Componentes Streamlit (`dashboard/components/comms_components.py`)
9 funciones `render_*()`:
- `render_comms_kpis_row(kpis)` — métricas cabecera
- `render_content_asset_card(asset)` — tarjeta con badge de estado
- `render_editorial_calendar(items)` — tabla de calendario
- `render_publication_queue(jobs)` — cola de publicación manual
- `render_approval_panel(approvals)` — panel de aprobaciones pendientes
- `render_message_frame_card(frame)` — tarjeta del frame estratégico
- `render_distribution_list_card(dl)` — lista de distribución
- `render_performance_panel(performances)` — métricas de rendimiento
- `render_content_recommendation_card(rec)` — recomendación de contenido
- `render_channel_card(channel)` — tarjeta de canal

## Brain Tools (`agents/tools/comms_tools.py`)
8 tools en `COMMS_TOOLS`:
- `generate_linkedin_post` — genera post LinkedIn desde MessageFrame
- `generate_twitter_thread` — genera hilo desde MessageFrame
- `generate_newsletter` — genera newsletter semanal de inteligencia
- `generate_qna_pack` — genera Q&A pack interno
- `recommend_content_for_alert` — recomienda tipo de contenido para una alerta
- `get_editorial_calendar` — obtiene calendario editorial próximo
- `get_pending_content_approvals` — lista contenido pendiente de aprobación
- `prepare_stakeholder_update` — prepara email de actualización a stakeholder

## Pipeline CLI (`pipelines/comms_core.py`)
```bash
.venv/bin/python -m pipelines.comms_core --recommend-from-alerts --tenant-id t1
.venv/bin/python -m pipelines.comms_core --generate-calendar --days 14
.venv/bin/python -m pipelines.comms_core --check-approvals
.venv/bin/python -m pipelines.comms_core --check-guardrails
.venv/bin/python -m pipelines.comms_core --import-performance metrics.csv
.venv/bin/python -m pipelines.comms_core --source all
```

## Adaptaciones de páginas
- `D1_Briefings.py`: create_message_frame, build_linkedin_post, build_thread, build_qna_pack, build_press_note
- `D7_Medios.py`: recommend_content_for_narrative, build_qna_pack, create_calendar_item
- `D10_Centro_Operaciones.py`: cargar_comms_kpis, cargar_pending_approvals, cargar_publication_queue + componentes

## Tests
- `tests/test_comms_core.py` — 26 tests, **26/26 passing**
- Fix aplicado: `render_template` usaba Jinja2 (que ignoraba `{variable}` syntax) → cambiado a `format_map` directo

## Canales predeterminados (seed)
| ID | Tipo | Aprobación requerida |
|----|------|---------------------|
| `ch_twitter_x` | twitter_x | Sí |
| `ch_linkedin` | linkedin | Sí |
| `ch_newsletter` | newsletter | Sí |
| `ch_press_release` | press_release | Sí |
| `ch_email` | email | No |
| `ch_internal` | internal | No |
| `ch_web` | web | Sí |
