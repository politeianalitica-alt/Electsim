"""
Slack Connector — ElectSim.

Envía alertas, briefings y notificaciones a canales de Slack.
Requiere: SLACK_BOT_TOKEN o SLACK_WEBHOOK_URL.
"""
from __future__ import annotations

import logging
import os

from pydantic import BaseModel, ConfigDict

log = logging.getLogger(__name__)

_SLACK_API_URL = "https://slack.com/api/chat.postMessage"

_LEVEL_COLOR: dict[str, str] = {
    "critical": "danger",
    "high": "warning",
    "medium": "good",
    "low": "good",
}


class SlackMessage(BaseModel):
    model_config = ConfigDict()

    channel: str
    text: str
    blocks: list[dict] = []
    thread_ts: str = ""


def _send_via_webhook(webhook_url: str, payload: dict) -> bool:
    """Envía payload a un Incoming Webhook de Slack."""
    try:
        import requests  # type: ignore

        resp = requests.post(webhook_url, json=payload, timeout=5)
        if resp.status_code == 200 and resp.text == "ok":
            return True
        log.warning("Webhook Slack devolvió %s: %s", resp.status_code, resp.text[:200])
        return False
    except Exception as exc:
        log.warning("Error enviando via webhook Slack: %s", exc)
        return False


def _send_via_bot_token(token: str, channel: str, payload: dict) -> bool:
    """Envía mensaje usando Bot Token a la Slack Web API."""
    try:
        import requests  # type: ignore

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        data = {"channel": channel, **payload}
        resp = requests.post(_SLACK_API_URL, headers=headers, json=data, timeout=5)
        body = resp.json()
        if body.get("ok"):
            return True
        log.warning("Slack API error: %s", body.get("error", "unknown"))
        return False
    except Exception as exc:
        log.warning("Error enviando via bot token Slack: %s", exc)
        return False


def _dispatch(channel: str, payload: dict) -> bool:
    """Selecciona el método de envío según las credenciales disponibles."""
    bot_token = os.environ.get("SLACK_BOT_TOKEN", "").strip()
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL", "").strip()

    if bot_token:
        return _send_via_bot_token(bot_token, channel, payload)
    if webhook_url:
        return _send_via_webhook(webhook_url, payload)

    log.debug("Slack no configurado; mensaje descartado")
    return False


def send_alert(
    channel: str,
    alert_title: str,
    alert_body: str,
    level: str = "medium",
) -> bool:
    """Envía una alerta formateada con Block Kit a un canal de Slack."""
    if not is_configured():
        return False

    color = _LEVEL_COLOR.get(level.lower(), "good")
    level_label = level.upper()

    payload: dict = {
        "text": f"[{level_label}] {alert_title}",
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*{alert_title}*\n{alert_body}",
                        },
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"Nivel: *{level_label}* | ElectSim Alertas",
                            }
                        ],
                    },
                ],
            }
        ],
    }
    return _dispatch(channel, payload)


def send_briefing_summary(
    channel: str,
    briefing_summary: str,
    date: str,
) -> bool:
    """Envía el briefing matutino como mensaje formateado a Slack."""
    if not is_configured():
        return False

    payload: dict = {
        "text": f"Briefing ElectSim — {date}",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"Briefing de inteligencia — {date}",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": briefing_summary,
                },
            },
            {
                "type": "divider",
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Generado por *ElectSim* | Politeia Analytics",
                    }
                ],
            },
        ],
    }
    return _dispatch(channel, payload)


def send_simple_message(channel: str, text: str) -> bool:
    """Envía un mensaje de texto simple a un canal de Slack."""
    if not is_configured():
        return False

    return _dispatch(channel, {"text": text})


def is_configured() -> bool:
    """True si SLACK_BOT_TOKEN o SLACK_WEBHOOK_URL están configurados."""
    return bool(
        os.environ.get("SLACK_BOT_TOKEN", "").strip()
        or os.environ.get("SLACK_WEBHOOK_URL", "").strip()
    )
