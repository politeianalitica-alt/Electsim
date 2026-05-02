"""
Nodo alert_trigger — Procesa y escala alertas criticas.

Lee output_alerts del estado y:
  - Filtra alertas por nivel
  - Escala las CRITICAS a canales prioritarios (webhook, email)
  - Registra en BD (si DATABASE_URL disponible)
  - Actualiza alerts_sent y alerts_escalated
"""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "")


async def alert_trigger_node(state: dict[str, Any], engine: Any) -> dict[str, Any]:
    """Nodo de disparo de alertas."""
    alerts: list[dict[str, Any]] = state.get("output_alerts", [])

    sent: list[str] = []
    escalated: list[str] = []

    for alert in alerts:
        alert_id = alert.get("id", "")
        level = alert.get("level", "BAJO")

        # Registrar siempre
        logger.info(
            "ALERTA [%s] %s: %s",
            level,
            alert.get("title", ""),
            alert.get("body", "")[:100],
        )
        sent.append(alert_id)

        # Escalar CRITICO y ALTO
        if level in ("CRITICO", "ALTO"):
            escalated.append(alert_id)
            if WEBHOOK_URL:
                await _send_webhook(alert, WEBHOOK_URL)

    return {
        **state,
        "alerts_sent": sent,
        "alerts_escalated": escalated,
        "meta_nodes_executed": state.get("meta_nodes_executed", []) + ["alert_trigger"],
    }


async def _send_webhook(alert: dict[str, Any], url: str) -> None:
    """Envia alerta a webhook externo."""
    try:
        import httpx
        payload = {
            "text": f"[{alert.get('level')}] {alert.get('title')}",
            "body": alert.get("body", "")[:300],
            "actors": alert.get("actors", []),
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            logger.info("Webhook enviado: %s -> %d", alert.get("id"), resp.status_code)
    except Exception as exc:
        logger.warning("Webhook error: %s", exc)
