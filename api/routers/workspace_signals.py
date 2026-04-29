from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from dashboard.services import workspace_signals as svc

router = APIRouter()


def _payload(value: Any) -> Any:
    return svc.api_payload(value)


@router.get("/workspaces")
def list_workspaces() -> Any:
    return _payload(svc.list_workspaces())


@router.get("/workspaces/{workspace_id}/status")
def workspace_status(workspace_id: str) -> Any:
    return _payload(svc.workspace_status(workspace_id))


@router.get("/workspaces/{workspace_id}/signals")
def workspace_all_signals(workspace_id: str) -> Any:
    return _payload(svc.all_signals(workspace_id))


@router.get("/workspaces/{workspace_id}/estado-ahora")
def workspace_estado_ahora(workspace_id: str) -> Any:
    return _payload(svc.workspace_estado_ahora(workspace_id))


@router.get("/workspaces/{workspace_id}/timeline")
def workspace_timeline(workspace_id: str, limit: int = Query(default=30, ge=1, le=100)) -> Any:
    return _payload(svc.workspace_timeline(workspace_id, limit=limit))


@router.get("/workspaces/{workspace_id}/briefing/today")
def workspace_briefing_today(workspace_id: str) -> Any:
    return _payload(svc.morning_briefing(workspace_id))


@router.get("/workspaces/activity")
def workspace_global_activity(limit: int = Query(default=8, ge=1, le=50)) -> Any:
    return _payload(svc.global_activity(limit=limit))


@router.get("/riesgo/{workspace_id}/signal")
def riesgo_signal(workspace_id: str) -> Any:
    return _payload(svc.signal_riesgo(workspace_id))


@router.get("/alertas/{workspace_id}/signal")
def alertas_signal(workspace_id: str) -> Any:
    return _payload(svc.signal_alertas(workspace_id))


@router.get("/legislativo/{workspace_id}/signal")
def legislativo_signal(workspace_id: str) -> Any:
    return _payload(svc.signal_legislativo(workspace_id))


@router.get("/medios/{workspace_id}/signal")
def medios_signal(workspace_id: str) -> Any:
    return _payload(svc.signal_medios(workspace_id))


@router.get("/electoral/{workspace_id}/signal")
def electoral_signal(workspace_id: str) -> Any:
    return _payload(svc.signal_electoral(workspace_id))


@router.get("/geopolitica/{workspace_id}/signal")
def geopolitica_signal(workspace_id: str) -> Any:
    return _payload(svc.signal_geopolitica(workspace_id))
