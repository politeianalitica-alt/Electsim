"""Servicio commodity_alerts · CRUD + evaluador + notificador.

Sustituye el storage localStorage del Sprint 7 Vesper-FE. Diseño:

  · CRUD via funciones simples · falla cerrado sin BD
  · evaluate_all() · una pasada del cron, evalúa todas las alertas activas
    contra snapshots Yahoo Finance y dispara los eventos correspondientes
  · cooldown_minutes evita spam · una alerta no se dispara más de una vez
    cada N minutos
  · notify_event() abstrae el envío · soporta 'inapp' (siempre, vía BD) +
    'email' (Resend opt-in si RESEND_API_KEY) + 'push' (placeholder)

Falla cerrado: cualquier excepción → {error: str, ...vacío}.
"""
from __future__ import annotations

import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

logger = logging.getLogger(__name__)


AlertKind = Literal["price_above", "price_below", "change_pct"]
Channel = Literal["inapp", "email", "push"]


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_id() -> str:
    return f"alert_{secrets.token_hex(8)}"


# ────────────────────────────────────────────────────────────────────
# CRUD
# ────────────────────────────────────────────────────────────────────

_KEYS = [
    "id", "user_id", "commodity_slug", "kind", "threshold", "period_days",
    "channels", "active", "last_triggered_at", "last_evaluated_at",
    "cooldown_minutes", "metadata_payload", "created_at", "updated_at",
]


def create_alert(
    *,
    user_id: str,
    commodity_slug: str,
    kind: AlertKind,
    threshold: float,
    channels: list[Channel],
    period_days: int | None = None,
    cooldown_minutes: int = 60,
    active: bool = True,
    metadata: dict | None = None,
) -> dict[str, Any]:
    """Inserta una nueva alerta. Devuelve la fila creada."""
    engine = _get_engine()
    if engine is None:
        return {"error": "no engine", "id": None}
    if kind not in ("price_above", "price_below", "change_pct"):
        return {"error": f"kind '{kind}' no válido"}
    if kind == "change_pct" and not period_days:
        period_days = 7  # default razonable

    aid = _make_id()
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO commodity_alerts (
                  id, user_id, commodity_slug, kind, threshold,
                  period_days, channels, active, cooldown_minutes, metadata_payload
                ) VALUES (
                  :id, :uid, :slug, :kind, :thr,
                  :period, CAST(:ch AS JSONB), :active, :cd, CAST(:meta AS JSONB)
                )
            """), {
                "id": aid,
                "uid": user_id,
                "slug": commodity_slug.lower(),
                "kind": kind,
                "thr": threshold,
                "period": period_days,
                "ch": json.dumps(channels),
                "active": active,
                "cd": cooldown_minutes,
                "meta": json.dumps(metadata or {}),
            })
        return get_alert(aid) or {"id": aid}
    except Exception as exc:
        logger.exception("create_alert · %s", exc)
        return {"error": str(exc), "id": None}


def get_alert(alert_id: str) -> dict[str, Any] | None:
    engine = _get_engine()
    if engine is None or not alert_id:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text(f"""
                SELECT {", ".join(_KEYS)}
                FROM commodity_alerts WHERE id = :id
            """), {"id": alert_id}).first()
            if row is None:
                return None
            return _row_to_dict(row)
    except Exception as exc:
        logger.debug("get_alert · %s", exc)
        return None


def list_alerts(user_id: str | None = None, active_only: bool = False) -> list[dict[str, Any]]:
    engine = _get_engine()
    if engine is None:
        return []
    clauses: list[str] = []
    params: dict[str, Any] = {}
    if user_id:
        clauses.append("user_id = :uid")
        params["uid"] = user_id
    if active_only:
        clauses.append("active = true")
    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(f"""
                SELECT {", ".join(_KEYS)}
                FROM commodity_alerts {where}
                ORDER BY created_at DESC
            """), params).all()
        return [_row_to_dict(r) for r in rows]
    except Exception as exc:
        logger.debug("list_alerts · %s", exc)
        return []


def update_alert(alert_id: str, **patch: Any) -> dict[str, Any] | None:
    """Update parcial · acepta: active, threshold, channels, cooldown_minutes,
    metadata_payload, period_days."""
    engine = _get_engine()
    if engine is None or not alert_id:
        return None
    allowed = {"active", "threshold", "channels", "cooldown_minutes",
               "metadata_payload", "period_days"}
    set_parts: list[str] = []
    params: dict[str, Any] = {"id": alert_id}
    for k, v in patch.items():
        if k not in allowed:
            continue
        if k in ("channels", "metadata_payload"):
            set_parts.append(f"{k} = CAST(:{k} AS JSONB)")
            params[k] = json.dumps(v)
        else:
            set_parts.append(f"{k} = :{k}")
            params[k] = v
    if not set_parts:
        return get_alert(alert_id)
    set_parts.append("updated_at = NOW()")

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(
                text(f"UPDATE commodity_alerts SET {', '.join(set_parts)} WHERE id = :id"),
                params,
            )
        return get_alert(alert_id)
    except Exception as exc:
        logger.debug("update_alert · %s", exc)
        return None


def delete_alert(alert_id: str) -> bool:
    engine = _get_engine()
    if engine is None or not alert_id:
        return False
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            res = conn.execute(text("DELETE FROM commodity_alerts WHERE id = :id"), {"id": alert_id})
            return (res.rowcount or 0) > 0
    except Exception as exc:
        logger.debug("delete_alert · %s", exc)
        return False


def _row_to_dict(row: Any) -> dict[str, Any]:
    d = {k: v for k, v in zip(_KEYS, row)}
    # Normalizar timestamps → ISO
    for k in ("last_triggered_at", "last_evaluated_at", "created_at", "updated_at"):
        v = d.get(k)
        if v is not None and hasattr(v, "isoformat"):
            d[k] = v.isoformat()
    # threshold puede venir Decimal
    if d.get("threshold") is not None:
        try:
            d["threshold"] = float(d["threshold"])
        except Exception:
            pass
    return d


# ────────────────────────────────────────────────────────────────────
# Evento · histórico de disparos + lectura in-app
# ────────────────────────────────────────────────────────────────────

def record_event(
    *,
    alert: dict[str, Any],
    trigger_value: float,
    channels_notified: list[Channel],
    delivery_log: dict[str, Any] | None = None,
) -> int | None:
    engine = _get_engine()
    if engine is None:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            res = conn.execute(text("""
                INSERT INTO commodity_alert_events (
                  alert_id, user_id, commodity_slug, kind,
                  trigger_value, threshold,
                  channels_notified, delivery_log
                ) VALUES (
                  :aid, :uid, :slug, :kind,
                  :val, :thr,
                  CAST(:ch AS JSONB), CAST(:dlog AS JSONB)
                )
                RETURNING id
            """), {
                "aid": alert["id"],
                "uid": alert["user_id"],
                "slug": alert["commodity_slug"],
                "kind": alert["kind"],
                "val": trigger_value,
                "thr": alert["threshold"],
                "ch": json.dumps(channels_notified),
                "dlog": json.dumps(delivery_log or {}),
            }).first()
            # Marcar alerta como disparada
            conn.execute(text("""
                UPDATE commodity_alerts
                SET last_triggered_at = NOW(), updated_at = NOW()
                WHERE id = :aid
            """), {"aid": alert["id"]})
            return int(res[0]) if res else None
    except Exception as exc:
        logger.debug("record_event · %s", exc)
        return None


def list_events(
    user_id: str | None = None,
    *,
    unread_only: bool = False,
    limit: int = 50,
) -> list[dict[str, Any]]:
    engine = _get_engine()
    if engine is None:
        return []
    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if user_id:
        clauses.append("user_id = :uid")
        params["uid"] = user_id
    if unread_only:
        clauses.append("in_app_read = false")
    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(f"""
                SELECT id, alert_id, user_id, commodity_slug, kind,
                       trigger_value, threshold, channels_notified,
                       delivery_log, in_app_read, created_at
                FROM commodity_alert_events
                {where}
                ORDER BY created_at DESC
                LIMIT :limit
            """), params).all()
        keys = [
            "id", "alert_id", "user_id", "commodity_slug", "kind",
            "trigger_value", "threshold", "channels_notified",
            "delivery_log", "in_app_read", "created_at",
        ]
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            v = d.get("created_at")
            if v is not None and hasattr(v, "isoformat"):
                d["created_at"] = v.isoformat()
            if d.get("trigger_value") is not None:
                try:
                    d["trigger_value"] = float(d["trigger_value"])
                except Exception:
                    pass
            if d.get("threshold") is not None:
                try:
                    d["threshold"] = float(d["threshold"])
                except Exception:
                    pass
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("list_events · %s", exc)
        return []


def mark_event_read(event_id: int) -> bool:
    engine = _get_engine()
    if engine is None:
        return False
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE commodity_alert_events SET in_app_read = true WHERE id = :id"),
                {"id": event_id},
            )
        return True
    except Exception:
        return False


# ────────────────────────────────────────────────────────────────────
# Evaluador (cron worker entry-point)
# ────────────────────────────────────────────────────────────────────

def _evaluate_condition(
    alert: dict[str, Any],
    last_price: float | None,
    change_pct: float | None,
) -> tuple[bool, float | None]:
    """Devuelve (triggered, trigger_value)."""
    kind = alert["kind"]
    threshold = float(alert["threshold"])
    if kind == "price_above" and last_price is not None and last_price > threshold:
        return True, last_price
    if kind == "price_below" and last_price is not None and last_price < threshold:
        return True, last_price
    if kind == "change_pct" and change_pct is not None:
        if threshold >= 0 and change_pct >= threshold:
            return True, change_pct
        if threshold < 0 and change_pct <= threshold:
            return True, change_pct
    return False, None


def _in_cooldown(alert: dict[str, Any]) -> bool:
    last = alert.get("last_triggered_at")
    cd = alert.get("cooldown_minutes") or 60
    if not last:
        return False
    try:
        last_dt = (
            datetime.fromisoformat(last.replace("Z", "+00:00"))
            if isinstance(last, str) else last
        )
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        return (_now() - last_dt) < timedelta(minutes=cd)
    except Exception:
        return False


def evaluate_all(dry_run: bool = False) -> dict[str, Any]:
    """Una pasada del cron · evalúa todas las alertas activas contra snapshots
    live de Yahoo Finance y dispara las que se cumplan (respeta cooldown).

    Args:
      dry_run: si True, no graba eventos ni envía notifications · útil para tests

    Returns:
      {"evaluated": int, "triggered": int, "events": [...], "errors": [...]}
    """
    alerts = list_alerts(active_only=True)
    if not alerts:
        return {"evaluated": 0, "triggered": 0, "events": [], "errors": []}

    # Cache de snapshots por slug · una llamada YF por commodity, no por alerta
    try:
        from etl.sources.commodities.prices import get_yahoo_client
        from etl.sources.commodities.catalog import get_commodity
        yf = get_yahoo_client()
    except Exception as exc:
        return {"evaluated": 0, "triggered": 0, "events": [], "errors": [str(exc)]}

    snapshot_cache: dict[str, dict[str, Any]] = {}

    def _snap(slug: str) -> dict[str, Any]:
        if slug in snapshot_cache:
            return snapshot_cache[slug]
        c = get_commodity(slug)
        if c is None or not c.get("yahoo_ticker"):
            snapshot_cache[slug] = {}
            return {}
        s = yf.quote_snapshot(c["yahoo_ticker"]) or {}
        snapshot_cache[slug] = s
        return s

    events: list[dict[str, Any]] = []
    errors: list[str] = []
    triggered = 0

    for a in alerts:
        try:
            if _in_cooldown(a):
                continue
            s = _snap(a["commodity_slug"])
            triggered_ok, trigger_value = _evaluate_condition(
                a,
                s.get("last_price"),
                s.get("change_pct"),
            )
            if not triggered_ok or trigger_value is None:
                continue
            triggered += 1
            channels = a.get("channels") or []
            if isinstance(channels, str):
                try:
                    channels = json.loads(channels)
                except Exception:
                    channels = []

            if dry_run:
                events.append({
                    "alert_id": a["id"],
                    "commodity_slug": a["commodity_slug"],
                    "kind": a["kind"],
                    "trigger_value": trigger_value,
                    "threshold": a["threshold"],
                    "channels_planned": channels,
                    "dry_run": True,
                })
                continue

            # Notificar + persistir
            delivery_log = notify_event(a, trigger_value, channels)
            channels_notified = [c for c, status in delivery_log.items() if status == "ok"]
            event_id = record_event(
                alert=a,
                trigger_value=trigger_value,
                channels_notified=channels_notified,
                delivery_log=delivery_log,
            )
            events.append({
                "event_id": event_id,
                "alert_id": a["id"],
                "commodity_slug": a["commodity_slug"],
                "trigger_value": trigger_value,
                "channels_notified": channels_notified,
                "delivery_log": delivery_log,
            })
        except Exception as exc:
            errors.append(f"alert {a.get('id')}: {exc}")

    # Marcar todas como evaluadas (no solo las disparadas)
    if not dry_run:
        _mark_evaluated([a["id"] for a in alerts])

    return {
        "evaluated": len(alerts),
        "triggered": triggered,
        "events": events,
        "errors": errors,
        "ts": _now().isoformat(),
    }


def _mark_evaluated(alert_ids: list[str]) -> None:
    if not alert_ids:
        return
    engine = _get_engine()
    if engine is None:
        return
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE commodity_alerts SET last_evaluated_at = NOW() WHERE id = ANY(:ids)"),
                {"ids": alert_ids},
            )
    except Exception as exc:
        logger.debug("mark_evaluated · %s", exc)


# ────────────────────────────────────────────────────────────────────
# Notificador · in-app siempre · email opt-in vía Resend
# ────────────────────────────────────────────────────────────────────

def notify_event(
    alert: dict[str, Any],
    trigger_value: float,
    channels: list[Channel],
) -> dict[str, str]:
    """Envía notificaciones por cada canal pedido. Devuelve {channel: status}.

    Status: 'ok' | 'skipped' | 'error: <msg>'
    """
    out: dict[str, str] = {}
    for ch in channels:
        try:
            if ch == "inapp":
                # In-app · el evento mismo en la BD ES la notificación
                # (la fila aparece como unread y la UI la lee)
                out[ch] = "ok"
            elif ch == "email":
                out[ch] = _send_email(alert, trigger_value)
            elif ch == "push":
                out[ch] = "skipped"  # placeholder · web push fuera de scope
            else:
                out[ch] = f"error: canal desconocido '{ch}'"
        except Exception as exc:
            out[ch] = f"error: {exc}"
    return out


def _send_email(alert: dict[str, Any], trigger_value: float) -> str:
    """Envía email vía Resend si RESEND_API_KEY está definido."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        return "skipped"
    user_id = alert.get("user_id", "")
    if not user_id or "@" not in user_id:
        return "error: user_id no es email válido"
    slug = alert.get("commodity_slug", "?")
    kind = alert.get("kind", "?")
    threshold = alert.get("threshold")
    subject = f"[Politeia] Alerta {slug} · {kind} {threshold}"
    body = (
        f"La alerta de {slug} se ha disparado.\n\n"
        f"Condición: {kind} (umbral {threshold})\n"
        f"Valor observado: {trigger_value}\n"
        f"Fecha: {_now().isoformat()}\n\n"
        f"---\nPoliteia Analítica · sistema de alertas commodities"
    )
    try:
        import requests  # type: ignore
        r = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": os.environ.get("RESEND_FROM", "alerts@politeia-analitica.es"),
                "to": [user_id],
                "subject": subject,
                "text": body,
            },
            timeout=10,
        )
        if r.status_code in (200, 201, 202):
            return "ok"
        return f"error: resend {r.status_code}"
    except Exception as exc:
        return f"error: {exc}"


__all__ = [
    "create_alert",
    "get_alert",
    "list_alerts",
    "update_alert",
    "delete_alert",
    "record_event",
    "list_events",
    "mark_event_read",
    "evaluate_all",
    "notify_event",
    "_evaluate_condition",  # exported for tests
    "_in_cooldown",
]
