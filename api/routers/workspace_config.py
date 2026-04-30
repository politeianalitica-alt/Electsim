"""
Router /workspaces — Configuracion del workspace actual (Bloque 6).

Endpoints:
  GET /workspaces/me/config    -> org_id, workspace_id, modulos, alertas, saved searches
  GET /workspaces/me/modules   -> solo lista de modulos activos
  GET /workspaces/me/alerts    -> alertas configuradas en el workspace
  GET /workspaces/me/searches  -> saved searches y watchlists

Depende de enforce_tenancy (RLS activo) y get_active_modules.
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.auth import AuthenticatedUser, get_db
from api.modules import get_active_modules
from api.tenancy import enforce_tenancy

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


# ---------------------------------------------------------------------------
# Config completa del workspace (para bootstrapping de frontend)
# ---------------------------------------------------------------------------

@router.get("/me/config")
def get_my_workspace_config(
    user: AuthenticatedUser = Depends(enforce_tenancy),
    modules: List[str] = Depends(get_active_modules),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Retorna la configuracion completa del workspace activo:
    modulos habilitados, plantillas de alerta y saved searches.

    El frontend usa este endpoint para construir el menu lateral
    y activar/desactivar features dinamicamente.
    """
    alerts = _fetch_workspace_alerts(db, user.workspace_id, user.org_id)
    searches = _fetch_workspace_searches(db, user.workspace_id, user.org_id)

    return {
        "organisation_id": user.org_id,
        "workspace_id": user.workspace_id,
        "role": user.role_code,
        "modules": modules,
        "alerts": alerts,
        "saved_searches": searches,
    }


# ---------------------------------------------------------------------------
# Solo modulos
# ---------------------------------------------------------------------------

@router.get("/me/modules")
def get_my_modules(
    modules: List[str] = Depends(get_active_modules),
) -> Dict[str, Any]:
    """Lista de modulos activos en el workspace actual."""
    return {"modules": modules}


# ---------------------------------------------------------------------------
# Alertas del workspace
# ---------------------------------------------------------------------------

@router.get("/me/alerts")
def get_my_alerts(
    user: AuthenticatedUser = Depends(enforce_tenancy),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Plantillas de alerta configuradas en el workspace actual."""
    alerts = _fetch_workspace_alerts(db, user.workspace_id, user.org_id)
    return {"alerts": alerts, "total": len(alerts)}


# ---------------------------------------------------------------------------
# Saved searches del workspace
# ---------------------------------------------------------------------------

@router.get("/me/searches")
def get_my_searches(
    user: AuthenticatedUser = Depends(enforce_tenancy),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Saved searches y watchlists del workspace actual."""
    searches = _fetch_workspace_searches(db, user.workspace_id, user.org_id)
    return {"saved_searches": searches, "total": len(searches)}


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _fetch_workspace_alerts(
    db: Session,
    workspace_id: str,
    organisation_id: str,
) -> List[Dict[str, Any]]:
    rows = db.execute(
        text("""
            SELECT alert_code, alert_name, enabled, level, channels, conditions, source_product
            FROM workspace_alert_config
            WHERE workspace_id = :ws AND organisation_id = :org
            ORDER BY level DESC, alert_code
        """),
        {"ws": workspace_id, "org": organisation_id},
    ).mappings().fetchall()
    return [dict(r) for r in rows]


def _fetch_workspace_searches(
    db: Session,
    workspace_id: str,
    organisation_id: str,
) -> List[Dict[str, Any]]:
    rows = db.execute(
        text("""
            SELECT search_code, search_name, search_type, semantic_query,
                   watchlist_config, source_product
            FROM workspace_saved_search
            WHERE workspace_id = :ws AND organisation_id = :org
            ORDER BY search_type, search_code
        """),
        {"ws": workspace_id, "org": organisation_id},
    ).mappings().fetchall()
    return [dict(r) for r in rows]
