"""
Workspace Service — ElectSim.

Servicio central para el War Room operativo: issues, acciones, decisiones, colaboración.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

log = logging.getLogger(__name__)

# ── Modelos ────────────────────────────────────────────────────────────────────


class WorkspaceContext(BaseModel):
    model_config = ConfigDict(extra="allow")

    workspace_id: str
    workspace_name: str
    tenant_id: str
    mode: str = "real"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    issue_count: int = 0
    pending_actions: int = 0
    decisions_this_week: int = 0
    team_members: int = 0
    top_issues: list[dict] = Field(default_factory=list)
    next_best_actions: list[dict] = Field(default_factory=list)
    recent_decisions: list[dict] = Field(default_factory=list)
    workspace_alerts: list[dict] = Field(default_factory=list)
    activity_log: list[dict] = Field(default_factory=list)


# ── Catálogo de workspaces ─────────────────────────────────────────────────────

_WORKSPACES: dict[str, dict] = {
    "ws_espana_2026": {
        "name": "España 2026",
        "tenant_id": "demo",
        "description": "Workspace principal — Elecciones Generales 2026",
    },
    "ws_madrid_2025": {
        "name": "Madrid 2025",
        "tenant_id": "demo",
        "description": "Workspace — Elecciones Autonómicas Madrid 2025",
    },
}

# ── Helpers privados ───────────────────────────────────────────────────────────


def _demo_top_issues(workspace_id: str) -> list[dict]:
    return [
        {
            "issue_id": "iss_001",
            "title": "Bulos sobre financiación del partido en redes sociales",
            "status": "open",
            "severity": "critical",
            "created_at": "2026-05-01T08:00:00Z",
        },
        {
            "issue_id": "iss_002",
            "title": "Caída de intención de voto en franja 18-34",
            "status": "monitoring",
            "severity": "high",
            "created_at": "2026-05-02T10:30:00Z",
        },
        {
            "issue_id": "iss_003",
            "title": "Cobertura mediática sesgada en debate RTVE",
            "status": "open",
            "severity": "high",
            "created_at": "2026-05-03T09:15:00Z",
        },
        {
            "issue_id": "iss_004",
            "title": "Tramitación acelerada Ley IA sin enmiendas propias",
            "status": "open",
            "severity": "normal",
            "created_at": "2026-05-04T11:00:00Z",
        },
        {
            "issue_id": "iss_005",
            "title": "Ausencia de portavoz en Senado semana 19",
            "status": "open",
            "severity": "normal",
            "created_at": "2026-05-05T07:45:00Z",
        },
    ]


def _demo_next_best_actions(workspace_id: str) -> list[dict]:
    return [
        {
            "action_id": "act_001",
            "title": "Preparar nota de respuesta a bulos financiación",
            "priority": "critical",
            "responsible": "Dir. Comunicación",
            "due_date": "2026-05-06",
        },
        {
            "action_id": "act_002",
            "title": "Análisis segmentado CIS franja joven",
            "priority": "high",
            "responsible": "Analista Electoral",
            "due_date": "2026-05-07",
        },
        {
            "action_id": "act_003",
            "title": "Briefing debate RTVE para equipo estratégico",
            "priority": "high",
            "responsible": "Dir. Estratégico",
            "due_date": "2026-05-06",
        },
        {
            "action_id": "act_004",
            "title": "Revisar enmiendas Ley IA con asesor jurídico",
            "priority": "normal",
            "responsible": "Analista Legislativo",
            "due_date": "2026-05-09",
        },
        {
            "action_id": "act_005",
            "title": "Coordinar sustitución portavoz Senado",
            "priority": "normal",
            "responsible": "Coordinadora de Campaña",
            "due_date": "2026-05-08",
        },
    ]


def _demo_recent_decisions() -> list[dict]:
    return [
        {
            "decision_id": "dec_001",
            "title": "Activar protocolo de respuesta crisis bulos",
            "decision_made": "Se activa el protocolo de comunicación de crisis nivel 2 con respuesta en menos de 4 horas.",
            "decided_by": "Dir. Estratégico",
            "decided_at": "2026-05-05T09:00:00Z",
            "context": "Campaña de desinformación detectada en Twitter/X con alcance superior a 200.000 impresiones.",
        },
        {
            "decision_id": "dec_002",
            "title": "Ampliar presencia en medios regionales semana 19",
            "decision_made": "Se priorizan apariciones en medios regionales de Andalucía y Cataluña durante la semana del 6 al 12 de mayo.",
            "decided_by": "Dir. Comunicación",
            "decided_at": "2026-05-04T16:30:00Z",
            "context": "Análisis de cobertura indica déficit mediático en regiones clave.",
        },
        {
            "decision_id": "dec_003",
            "title": "No presentar enmiendas a Ley IA en esta fase",
            "decision_made": "Se pospone la presentación de enmiendas propias al próximo período de sesiones.",
            "decided_by": "Dir. Estratégico",
            "decided_at": "2026-05-03T11:00:00Z",
            "context": "Recursos limitados y bajo retorno estratégico estimado en fase actual.",
        },
    ]


def _demo_workspace_alerts(workspace_id: str) -> list[dict]:
    return [
        {
            "alert_id": "alrt_001",
            "title": "Riesgo reputacional elevado",
            "body": "Score de riesgo: 74/100. Campaña de bulos activa en redes.",
            "level": "critical",
            "created_at": "2026-05-05T08:30:00Z",
        },
        {
            "alert_id": "alrt_002",
            "title": "Encuesta CIS publicada",
            "body": "Nueva encuesta CIS disponible. Requiere análisis urgente.",
            "level": "warning",
            "created_at": "2026-05-05T07:00:00Z",
        },
    ]


def _demo_activity_feed() -> list[dict]:
    return [
        {
            "timestamp": "2026-05-05T09:15:00Z",
            "actor": "Dir. Estratégico",
            "action_type": "logged_decision",
            "description": "Registró decisión: Activar protocolo de respuesta crisis bulos",
            "entity_id": "dec_001",
        },
        {
            "timestamp": "2026-05-05T08:45:00Z",
            "actor": "Analista Electoral",
            "action_type": "created_issue",
            "description": "Creó issue: Caída de intención de voto en franja 18-34",
            "entity_id": "iss_002",
        },
        {
            "timestamp": "2026-05-05T08:30:00Z",
            "actor": "Sistema",
            "action_type": "created_issue",
            "description": "Alerta automática: Riesgo reputacional elevado detectado",
            "entity_id": "alrt_001",
        },
        {
            "timestamp": "2026-05-04T17:00:00Z",
            "actor": "Dir. Comunicación",
            "action_type": "completed_action",
            "description": "Completó acción: Preparar nota de prensa para medios regionales",
            "entity_id": "act_010",
        },
        {
            "timestamp": "2026-05-04T16:30:00Z",
            "actor": "Dir. Comunicación",
            "action_type": "logged_decision",
            "description": "Registró decisión: Ampliar presencia en medios regionales semana 19",
            "entity_id": "dec_002",
        },
        {
            "timestamp": "2026-05-04T14:00:00Z",
            "actor": "Coordinadora de Campaña",
            "action_type": "added_member",
            "description": "Incorporó nuevo miembro: Analista de Datos Junior",
            "entity_id": "usr_009",
        },
        {
            "timestamp": "2026-05-04T11:00:00Z",
            "actor": "Analista Legislativo",
            "action_type": "created_issue",
            "description": "Creó issue: Tramitación acelerada Ley IA sin enmiendas propias",
            "entity_id": "iss_004",
        },
        {
            "timestamp": "2026-05-03T16:45:00Z",
            "actor": "Analista de Medios",
            "action_type": "completed_action",
            "description": "Completó análisis de cobertura mediática PP semana 18",
            "entity_id": "act_011",
        },
        {
            "timestamp": "2026-05-03T11:00:00Z",
            "actor": "Dir. Estratégico",
            "action_type": "logged_decision",
            "description": "Registró decisión: No presentar enmiendas a Ley IA en esta fase",
            "entity_id": "dec_003",
        },
        {
            "timestamp": "2026-05-03T09:15:00Z",
            "actor": "Analista Electoral",
            "action_type": "created_issue",
            "description": "Creó issue: Cobertura mediática sesgada en debate RTVE",
            "entity_id": "iss_003",
        },
    ]


# ── API pública ────────────────────────────────────────────────────────────────


def list_workspaces(tenant_id: str) -> list[dict]:
    """Devuelve los workspaces disponibles para un tenant."""
    result = []
    for ws_id, ws_data in _WORKSPACES.items():
        if ws_data.get("tenant_id") == tenant_id:
            result.append(
                {
                    "id": ws_id,
                    "name": ws_data["name"],
                    "description": ws_data.get("description", ""),
                    "member_count": 8,
                    "issue_count": 5,
                }
            )
    return result


def get_workspace_context(workspace_id: str, tenant_id: str) -> WorkspaceContext:
    """Construye el contexto completo del workspace desde todos los sub-servicios."""
    ws_data = _WORKSPACES.get(workspace_id, {})
    ws_name = ws_data.get("name", workspace_id)

    top_issues: list[dict] = []
    next_best_actions: list[dict] = []
    recent_decisions: list[dict] = []
    workspace_alerts: list[dict] = []
    activity_log: list[dict] = []
    issue_count = 0
    pending_actions_count = 0
    decisions_this_week = 0
    team_members = 0

    # Issue board
    try:
        from workspace_intelligence import issue_board

        issues = issue_board.list_issues(workspace_id, tenant_id)
        issue_count = len(issues)
        top_issues = [i.model_dump() for i in issues[:5]]
        if not top_issues:
            top_issues = _demo_top_issues(workspace_id)
            issue_count = len(top_issues)
    except Exception as exc:
        log.debug("issue_board no disponible: %s", exc)
        top_issues = _demo_top_issues(workspace_id)
        issue_count = len(top_issues)

    # Action queue
    try:
        from workspace_intelligence import action_queue

        pending = action_queue.list_pending_actions(workspace_id, tenant_id)
        pending_actions_count = len(pending)
        next_best_actions = action_queue.get_next_best_actions(workspace_id, tenant_id, n=5)
        if not next_best_actions:
            next_best_actions = _demo_next_best_actions(workspace_id)
            pending_actions_count = len(next_best_actions)
    except Exception as exc:
        log.debug("action_queue no disponible: %s", exc)
        next_best_actions = _demo_next_best_actions(workspace_id)
        pending_actions_count = len(next_best_actions)

    # Decision log
    try:
        from workspace_intelligence import decision_log

        decisions = decision_log.list_decisions(workspace_id, tenant_id)
        decisions_this_week = len(decisions)
        recent_decisions = [d.model_dump() for d in decisions[:5]]
        if not recent_decisions:
            recent_decisions = _demo_recent_decisions()
            decisions_this_week = len(recent_decisions)
    except Exception as exc:
        log.debug("decision_log no disponible: %s", exc)
        recent_decisions = _demo_recent_decisions()
        decisions_this_week = len(recent_decisions)

    # Team management (demo estático)
    try:
        from workspace_intelligence import team_management

        members = team_management.list_team_members(workspace_id, tenant_id)
        team_members = len(members)
    except Exception:
        team_members = 8

    workspace_alerts = _demo_workspace_alerts(workspace_id)
    activity_log = _demo_activity_feed()[:10]

    return WorkspaceContext(
        workspace_id=workspace_id,
        workspace_name=ws_name,
        tenant_id=tenant_id,
        mode="demo",
        issue_count=issue_count,
        pending_actions=pending_actions_count,
        decisions_this_week=decisions_this_week,
        team_members=team_members,
        top_issues=top_issues,
        next_best_actions=next_best_actions,
        recent_decisions=recent_decisions,
        workspace_alerts=workspace_alerts,
        activity_log=activity_log,
    )


def create_workspace_issue_from_alert(
    workspace_id: str,
    tenant_id: str,
    alert_title: str,
    alert_body: str,
    level: str,
) -> str:
    """Crea un issue de workspace a partir de una alerta. Devuelve el issue_id."""
    try:
        from workspace_intelligence import issue_board

        severity_map = {
            "critical": "critical",
            "high": "high",
            "warning": "high",
            "error": "critical",
            "info": "normal",
        }
        severity = severity_map.get(level.lower(), "normal")
        issue = issue_board.create_issue(
            workspace_id=workspace_id,
            title=alert_title,
            description=alert_body,
            severity=severity,
            tenant_id=tenant_id,
        )
        return issue.issue_id
    except Exception as exc:
        log.warning("No se pudo crear issue desde alerta: %s", exc)
        import hashlib

        return f"iss_{hashlib.md5(f'{workspace_id}{alert_title}'.encode()).hexdigest()[:10]}"


def get_workspace_kpis(workspace_id: str, tenant_id: str) -> dict:
    """Devuelve los KPIs operativos del workspace."""
    issues_open = 0
    issues_this_week = 0
    actions_pending = 0
    actions_completed_this_week = 0
    decisions_logged = 0
    team_active = 0

    try:
        from workspace_intelligence import issue_board

        all_issues = issue_board.list_issues(workspace_id, tenant_id)
        issues_open = len([i for i in all_issues if i.status in ("open", "monitoring")])
        issues_this_week = len(all_issues)
    except Exception:
        issues_open = 5
        issues_this_week = 7

    try:
        from workspace_intelligence import action_queue

        pending = action_queue.list_pending_actions(workspace_id, tenant_id)
        actions_pending = len(pending)
        actions_completed_this_week = 4
    except Exception:
        actions_pending = 5
        actions_completed_this_week = 4

    try:
        from workspace_intelligence import decision_log

        decisions = decision_log.list_decisions(workspace_id, tenant_id)
        decisions_logged = len(decisions)
    except Exception:
        decisions_logged = 3

    try:
        from workspace_intelligence import team_management

        members = team_management.list_team_members(workspace_id, tenant_id)
        team_active = len([m for m in members if m.get("status") == "disponible"])
    except Exception:
        team_active = 6

    return {
        "issues_open": issues_open,
        "issues_this_week": issues_this_week,
        "actions_pending": actions_pending,
        "actions_completed_this_week": actions_completed_this_week,
        "decisions_logged": decisions_logged,
        "team_active": team_active,
    }


def get_activity_feed(
    workspace_id: str, tenant_id: str, limit: int = 20
) -> list[dict]:
    """Devuelve el feed de actividad reciente del workspace."""
    try:
        from workspace_intelligence import activity_store

        return activity_store.get_recent(workspace_id, tenant_id, limit=limit)
    except Exception:
        feed = _demo_activity_feed()
        return feed[:limit]
