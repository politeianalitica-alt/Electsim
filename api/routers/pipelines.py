from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
async def get_pipeline_status(limit: int = 10) -> list[dict[str, Any]]:
    try:
        from prefect.client.orchestration import get_client
    except Exception as exc:
        return [{"nombre": "prefect", "estado": "unavailable", "error": str(exc)}]

    try:
        items: list[dict[str, Any]] = []
        async with get_client() as client:
            flows = await client.read_flow_runs(limit=max(1, min(int(limit), 50)))
            for f in flows:
                start = getattr(f, "start_time", None)
                end = getattr(f, "end_time", None)
                dur = None
                if isinstance(start, datetime) and isinstance(end, datetime):
                    dur = int((end - start).total_seconds())
                state_type = str(getattr(f, "state_type", "")) or str(getattr(getattr(f, "state", None), "type", "UNKNOWN"))
                items.append(
                    {
                        "nombre": getattr(f, "name", "flow-run"),
                        "estado": state_type,
                        "inicio": start,
                        "duracion_s": dur,
                    }
                )
        return items
    except Exception as exc:
        return [{"nombre": "prefect", "estado": "error", "error": str(exc)}]
