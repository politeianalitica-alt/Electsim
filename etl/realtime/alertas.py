"""
Entrega de ``alertas_sistema`` a log, email, Slack y Telegram. ``python -m etl.realtime.alertas``.
"""

from __future__ import annotations

import json
import logging
import os
import smtplib
from email.mime.text import MIMEText
import requests
from sqlalchemy import text

logger = logging.getLogger(__name__)


def formatear_alerta_texto(alerta: dict) -> str:
    sev = (alerta.get("severidad") or "").upper()
    if sev == "CRITICAL":
        pre = "🚨 "
    elif sev == "WARNING":
        pre = "⚠️ "
    else:
        pre = "ℹ️ "
    ts = alerta.get("created_at")
    ts_s = ts.isoformat() if hasattr(ts, "isoformat") else str(ts or "")
    return f"{pre}[{sev}] {alerta.get('titulo', '')}\n{alerta.get('descripcion', '')}\n{ts_s}"


def enviar_email(alerta: dict, config: dict | None = None) -> bool:
    host = os.getenv("ELECTSIM_SMTP_HOST")
    if not host:
        return False
    cfg = config or {}
    port = int(os.getenv("ELECTSIM_SMTP_PORT", "587"))
    user = os.getenv("ELECTSIM_SMTP_USER", "")
    password = os.getenv("ELECTSIM_SMTP_PASSWORD", "")
    to_raw = os.getenv("ELECTSIM_ALERT_EMAIL_TO", "")
    if not to_raw:
        return False
    to_list = [x.strip() for x in to_raw.split(",") if x.strip()]
    body = formatear_alerta_texto(alerta)
    if alerta.get("datos_json"):
        try:
            body += "\n\n" + json.dumps(json.loads(alerta["datos_json"]), indent=2, ensure_ascii=False)
        except (json.JSONDecodeError, TypeError):
            body += "\n\n" + str(alerta.get("datos_json"))
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = f'[ElectSim] {alerta.get("severidad")}: {alerta.get("titulo", "")}'
    msg["From"] = user or "electsim@localhost"
    msg["To"] = ", ".join(to_list)
    try:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.sendmail(msg["From"], to_list, msg.as_string())
        return True
    except Exception as exc:
        logger.warning("email alerta: %s", exc)
        return False


def _color_slack(severidad: str) -> str:
    s = (severidad or "").upper()
    if s == "CRITICAL":
        return "danger"
    if s == "WARNING":
        return "warning"
    return "good"


def enviar_slack(alerta: dict, webhook_url: str) -> bool:
    payload = {
        "text": formatear_alerta_texto(alerta),
        "attachments": [
            {
                "color": _color_slack(str(alerta.get("severidad", ""))),
                "fields": [
                    {
                        "title": "datos_json",
                        "value": str(alerta.get("datos_json", ""))[:2000],
                        "short": False,
                    }
                ],
            }
        ],
    }
    try:
        r = requests.post(webhook_url, json=payload, timeout=15)
        return r.ok
    except Exception as exc:
        logger.warning("slack: %s", exc)
        return False


def enviar_telegram(alerta: dict, token: str, chat_id: str) -> bool:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    text_html = (
        f"<b>[{alerta.get('severidad', '')}]</b> {alerta.get('titulo', '')}\n"
        f"{alerta.get('descripcion', '')}"
    )
    try:
        r = requests.post(
            url,
            json={"chat_id": chat_id, "text": text_html, "parse_mode": "HTML"},
            timeout=15,
        )
        return r.ok
    except Exception as exc:
        logger.warning("telegram: %s", exc)
        return False


def procesar_alertas_pendientes(engine) -> int:
    sev_rank = {"INFO": 0, "WARNING": 1, "CRITICAL": 2}
    q = text(
        """
        SELECT id, tipo, severidad, titulo, descripcion, datos_json, created_at
        FROM alertas_sistema
        WHERE leida = false
        ORDER BY created_at ASC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(q).mappings().fetchall()
    n = 0
    for row in rows:
        alerta = dict(row)
        ok_any = False
        sev = (alerta.get("severidad") or "INFO").upper()
        # LOG: siempre
        log_fn = logger.warning if sev_rank.get(sev, 0) >= 1 else logger.info
        log_fn("%s", formatear_alerta_texto(alerta))
        ok_any = True

        if os.getenv("ELECTSIM_SMTP_HOST") and sev in ("WARNING", "CRITICAL"):
            if enviar_email(alerta):
                ok_any = True

        wh = os.getenv("ELECTSIM_SLACK_WEBHOOK")
        if wh and sev in ("WARNING", "CRITICAL"):
            if enviar_slack(alerta, wh):
                ok_any = True

        tok = os.getenv("ELECTSIM_TELEGRAM_TOKEN")
        cid = os.getenv("ELECTSIM_TELEGRAM_CHAT_ID")
        if tok and cid and sev == "CRITICAL":
            if enviar_telegram(alerta, tok, cid):
                ok_any = True

        if ok_any:
            with engine.begin() as conn:
                conn.execute(
                    text("UPDATE alertas_sistema SET leida = true WHERE id = :id"),
                    {"id": alerta["id"]},
                )
            n += 1
    return n


if __name__ == "__main__":
    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.getenv("DATABASE_URL"))
    n = procesar_alertas_pendientes(engine)
    print(f"Procesadas {n} alertas pendientes")
