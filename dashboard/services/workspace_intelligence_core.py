"""
Servicio de inteligencia de workspace para el dashboard.

Todas las funciones retornan dicts serializables (no Pydantic) con modo real/demo/fallback.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone

log = logging.getLogger(__name__)

_DEFAULT_WORKSPACES = [
    {"workspace_id": "ws_default", "name": "Workspace Principal", "description": "Demo"},
    {"workspace_id": "ws_demo", "name": "Demo Consultoría", "description": "Demo"},
]


def cargar_workspace_overview(workspace_id: str, tenant_id: str = "default") -> dict:
    """Overview completo del workspace para el War Room."""
    try:
        from workspace_intelligence.issue_board import list_issues
        from workspace_intelligence.action_queue import list_pending_actions, get_next_best_actions
        from workspace_intelligence.decision_log import list_decisions
        from dashboard.services.media_intelligence_core import cargar_top_stories, cargar_narrativas_reales

        issues = list_issues(workspace_id, tenant_id, status="open")
        critical = [i for i in issues if i.severity == "critical"]
        pending = list_pending_actions(workspace_id, tenant_id)
        top_news = cargar_top_stories(tenant_id, n=5)
        narratives = cargar_narrativas_reales(tenant_id)

        return {
            "workspace_id": workspace_id,
            "open_issues": len(issues),
            "critical_signals": len(critical),
            "pending_actions": len(pending),
            "relevant_news_count": len(top_news),
            "active_narratives": len([n for n in narratives if not n.get("is_demo")]),
            "top_news": top_news[:5],
            "narratives": narratives[:3],
            "pending_actions_list": [a.model_dump() if hasattr(a, 'model_dump') else a for a in pending[:5]],
            "next_best_actions": get_next_best_actions(workspace_id, tenant_id),
            "mode": "real",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        log.debug("cargar_workspace_overview error: %s", e)
        return _demo_workspace_overview(workspace_id)


def cargar_workspace_issue_board(workspace_id: str, tenant_id: str = "default") -> list[dict]:
    try:
        from workspace_intelligence.issue_board import list_issues
        issues = list_issues(workspace_id, tenant_id)
        return [i.model_dump() for i in issues] or _demo_issues()
    except Exception:
        return _demo_issues()


def cargar_workspace_action_queue(workspace_id: str, tenant_id: str = "default") -> list[dict]:
    try:
        from workspace_intelligence.action_queue import list_pending_actions
        actions = list_pending_actions(workspace_id, tenant_id)
        return [a.model_dump() for a in actions] or _demo_actions()
    except Exception:
        return _demo_actions()


def cargar_workspace_top_news(workspace_id: str, tenant_id: str = "default",
                               workspace_keywords: list[str] | None = None) -> list[dict]:
    try:
        from dashboard.services.media_intelligence_core import cargar_articulos_relevantes
        from media_intelligence.editorial_selector import select_news_for_workspace
        articles = cargar_articulos_relevantes(tenant_id, limit=100)
        return select_news_for_workspace(articles, workspace_keywords or [], n=8)
    except Exception as e:
        log.debug("cargar_workspace_top_news error: %s", e)
        return []


def cargar_workspace_narratives(workspace_id: str, tenant_id: str = "default") -> list[dict]:
    try:
        from dashboard.services.media_intelligence_core import cargar_narrativas_reales
        return cargar_narrativas_reales(tenant_id)
    except Exception:
        return []


def cargar_workspace_decision_log(workspace_id: str, tenant_id: str = "default") -> list[dict]:
    try:
        from workspace_intelligence.decision_log import list_decisions
        decisions = list_decisions(workspace_id, tenant_id)
        return [d.model_dump() for d in decisions] or _demo_decisions()
    except Exception:
        return _demo_decisions()


def cargar_next_best_actions(workspace_id: str, tenant_id: str = "default") -> list[dict]:
    try:
        from workspace_intelligence.action_queue import get_next_best_actions
        return get_next_best_actions(workspace_id, tenant_id)
    except Exception:
        return _demo_actions()[:3]


def list_workspaces(tenant_id: str = "default") -> list[dict]:
    try:
        import importlib
        ws_signals = importlib.import_module("dashboard.services.workspace_signals")
        get_active = getattr(ws_signals, "get_active_workspaces", None)
        ws = get_active() if callable(get_active) else []
        return ws or _DEFAULT_WORKSPACES
    except Exception:
        return _DEFAULT_WORKSPACES


def _demo_workspace_overview(workspace_id: str) -> dict:
    return {
        "workspace_id": workspace_id,
        "open_issues": 3, "critical_signals": 1, "pending_actions": 5,
        "relevant_news_count": 0, "active_narratives": 0,
        "top_news": [],
        "narratives": [],
        "pending_actions_list": _demo_actions()[:3],
        "next_best_actions": _demo_actions()[:2],
        "mode": "demo",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _demo_issues() -> list[dict]:
    return [
        {"issue_id": "demo_1", "title": "DEMO — Crisis de vivienda",
         "status": "open", "severity": "high", "workspace_id": "demo", "tenant_id": "default",
         "created_at": datetime.now(timezone.utc).isoformat()},
    ]


def _demo_actions() -> list[dict]:
    return [
        {"action_id": "demo_a1", "title": "DEMO — Preparar briefing", "action_type": "briefing",
         "priority": "high", "status": "pending", "workspace_id": "demo"},
        {"action_id": "demo_a2", "title": "DEMO — Revisar narrativas", "action_type": "analysis",
         "priority": "normal", "status": "pending", "workspace_id": "demo"},
    ]


def _demo_decisions() -> list[dict]:
    return []
