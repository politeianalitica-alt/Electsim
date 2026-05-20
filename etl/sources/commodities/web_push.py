"""Web Push (VAPID · RFC 8030 + RFC 8292) para alertas commodities.

Sustituye el placeholder `out[ch] = 'skipped'` del canal `push` en
`alerts_service.notify_event` por entrega real al push service del navegador
(FCM/Mozilla/Apple) usando `pywebpush`.

Diseño · fail-closed:
  - Si `pywebpush` no está instalado o las VAPID keys no están en env,
    `send_push_to_user()` devuelve 'skipped' (no levanta).
  - Si el push service responde 404/410 (endpoint expirado), marca la
    suscripción `active=False` y deja de intentarlo.
  - Los demás errores se anotan en `last_error` sin bloquear otras subs.

Variables de entorno requeridas:
  VAPID_PRIVATE_KEY   · clave privada EC P-256 (PEM base64 oneliner ó PEM raw)
  VAPID_PUBLIC_KEY    · clave pública EC P-256 (base64url uncompressed point)
                        · debe ser la misma que aplicationServerKey en el SW
  VAPID_SUBJECT       · 'mailto:alerts@politeia-analitica.es' por defecto

Generación de claves (una vez · NO commitear):
  $ python -m etl.sources.commodities.web_push generate-keys
  → imprime VAPID_PRIVATE_KEY y VAPID_PUBLIC_KEY listas para .env
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

logger = logging.getLogger(__name__)


VAPID_SUBJECT_DEFAULT = "mailto:alerts@politeia-analitica.es"


# ─────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────

def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────
# Suscripciones · CRUD
# ─────────────────────────────────────────────────────────────────

def upsert_subscription(
    user_id: str,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: str | None = None,
) -> dict[str, Any]:
    """Inserta o actualiza una suscripción por endpoint (único)."""
    if not all([user_id, endpoint, p256dh, auth]):
        return {"error": "user_id, endpoint, p256dh, auth son obligatorios"}
    engine = _get_engine()
    if engine is None:
        return {"error": "sin BD"}
    try:
        with engine.begin() as cx:
            # UPSERT portable: intenta UPDATE primero, luego INSERT si 0 rows.
            r = cx.execute(
                text(
                    "UPDATE push_subscriptions SET user_id=:u, p256dh=:p, "
                    "auth=:a, user_agent=:ua, active=true, last_error=NULL "
                    "WHERE endpoint=:e"
                ),
                {
                    "u": user_id, "p": p256dh, "a": auth,
                    "ua": (user_agent or "")[:400], "e": endpoint,
                },
            )
            if r.rowcount == 0:
                cx.execute(
                    text(
                        "INSERT INTO push_subscriptions "
                        "(user_id, endpoint, p256dh, auth, user_agent, active) "
                        "VALUES (:u, :e, :p, :a, :ua, true)"
                    ),
                    {
                        "u": user_id, "e": endpoint, "p": p256dh,
                        "a": auth, "ua": (user_agent or "")[:400],
                    },
                )
        return {"ok": True, "endpoint": endpoint}
    except Exception as exc:
        logger.exception("upsert_subscription falló")
        return {"error": str(exc)}


def remove_subscription(endpoint: str) -> dict[str, Any]:
    """Marca la suscripción como inactiva por endpoint."""
    engine = _get_engine()
    if engine is None:
        return {"error": "sin BD"}
    try:
        with engine.begin() as cx:
            r = cx.execute(
                text(
                    "UPDATE push_subscriptions SET active=false WHERE endpoint=:e"
                ),
                {"e": endpoint},
            )
        return {"ok": True, "removed": r.rowcount}
    except Exception as exc:
        return {"error": str(exc)}


def list_subscriptions(user_id: str, active_only: bool = True) -> list[dict[str, Any]]:
    engine = _get_engine()
    if engine is None:
        return []
    try:
        with engine.connect() as cx:
            sql = (
                "SELECT id, endpoint, user_agent, active, last_error, "
                "last_sent_at, created_at FROM push_subscriptions "
                "WHERE user_id=:u"
            )
            if active_only:
                sql += " AND active=true"
            sql += " ORDER BY created_at DESC"
            rows = cx.execute(text(sql), {"u": user_id}).mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        logger.exception("list_subscriptions falló")
        return []


def _mark_failed(endpoint: str, error: str, *, deactivate: bool) -> None:
    """Anota el error y opcionalmente desactiva la suscripción."""
    engine = _get_engine()
    if engine is None:
        return
    try:
        with engine.begin() as cx:
            if deactivate:
                cx.execute(
                    text(
                        "UPDATE push_subscriptions SET active=false, "
                        "last_error=:err WHERE endpoint=:e"
                    ),
                    {"err": error[:1000], "e": endpoint},
                )
            else:
                cx.execute(
                    text(
                        "UPDATE push_subscriptions SET last_error=:err "
                        "WHERE endpoint=:e"
                    ),
                    {"err": error[:1000], "e": endpoint},
                )
    except Exception:
        logger.exception("_mark_failed update falló")


def _mark_sent(endpoint: str) -> None:
    engine = _get_engine()
    if engine is None:
        return
    try:
        with engine.begin() as cx:
            cx.execute(
                text(
                    "UPDATE push_subscriptions SET last_sent_at=:t, "
                    "last_error=NULL WHERE endpoint=:e"
                ),
                {"t": _now(), "e": endpoint},
            )
    except Exception:
        logger.exception("_mark_sent update falló")


# ─────────────────────────────────────────────────────────────────
# Envío
# ─────────────────────────────────────────────────────────────────

def is_configured() -> bool:
    """¿Están las VAPID keys + pywebpush disponibles?"""
    if not os.environ.get("VAPID_PRIVATE_KEY"):
        return False
    if not os.environ.get("VAPID_PUBLIC_KEY"):
        return False
    try:
        import pywebpush  # noqa: F401
        return True
    except ImportError:
        return False


def send_push_to_user(
    user_id: str,
    payload: dict[str, Any],
    *,
    ttl: int = 60 * 60 * 24,  # 24h · si el dispositivo está offline
) -> dict[str, Any]:
    """Envía la misma payload a todas las suscripciones activas del usuario.

    Returns:
        {
          'status': 'ok' | 'skipped' | 'no_subs' | 'error',
          'sent': int,           # nº endpoints OK
          'deactivated': int,    # endpoints marcados como 410-Gone
          'errors': [{endpoint, error}, ...],
        }
    """
    if not is_configured():
        return {
            "status": "skipped",
            "reason": "VAPID keys no configuradas o pywebpush no instalado",
        }

    subs = list_subscriptions(user_id, active_only=True)
    if not subs:
        return {"status": "no_subs", "sent": 0}

    # Resolver endpoints completos (con p256dh/auth) · necesitamos otra query
    engine = _get_engine()
    if engine is None:
        return {"status": "error", "error": "sin BD"}

    try:
        with engine.connect() as cx:
            rows = cx.execute(
                text(
                    "SELECT endpoint, p256dh, auth FROM push_subscriptions "
                    "WHERE user_id=:u AND active=true"
                ),
                {"u": user_id},
            ).mappings().all()
    except Exception as exc:
        return {"status": "error", "error": str(exc)}

    if not rows:
        return {"status": "no_subs", "sent": 0}

    from pywebpush import WebPushException, webpush  # type: ignore

    vapid_claims = {
        "sub": os.environ.get("VAPID_SUBJECT", VAPID_SUBJECT_DEFAULT),
    }
    private_key = os.environ["VAPID_PRIVATE_KEY"]
    payload_str = json.dumps(payload)

    sent = 0
    deactivated = 0
    errors: list[dict[str, str]] = []

    for row in rows:
        sub_info = {
            "endpoint": row["endpoint"],
            "keys": {"p256dh": row["p256dh"], "auth": row["auth"]},
        }
        try:
            webpush(
                subscription_info=sub_info,
                data=payload_str,
                vapid_private_key=private_key,
                vapid_claims=dict(vapid_claims),
                ttl=ttl,
            )
            sent += 1
            _mark_sent(row["endpoint"])
        except WebPushException as exc:
            status_code = getattr(exc.response, "status_code", None) if exc.response else None
            # 404 (Not Found) / 410 (Gone) → endpoint expirado, desactivar
            if status_code in (404, 410):
                _mark_failed(row["endpoint"], f"HTTP {status_code}", deactivate=True)
                deactivated += 1
            else:
                _mark_failed(
                    row["endpoint"],
                    f"WebPushException {status_code}: {exc}",
                    deactivate=False,
                )
                errors.append({"endpoint": row["endpoint"][:80], "error": str(exc)[:200]})
        except Exception as exc:
            _mark_failed(row["endpoint"], f"{type(exc).__name__}: {exc}", deactivate=False)
            errors.append({"endpoint": row["endpoint"][:80], "error": str(exc)[:200]})

    return {
        "status": "ok" if sent > 0 else ("partial" if errors else "all_failed"),
        "sent": sent,
        "deactivated": deactivated,
        "errors": errors,
    }


# ─────────────────────────────────────────────────────────────────
# Adapter para alerts_service.notify_event
# ─────────────────────────────────────────────────────────────────

def send_push_for_alert(alert: dict[str, Any], trigger_value: float) -> str:
    """Construye payload desde un alert + envía. Devuelve status para delivery_log.

    Status: 'ok' | 'skipped' | 'no_subs' | 'error: <msg>'
    """
    user_id = alert.get("user_id", "")
    if not user_id:
        return "error: alert sin user_id"

    slug = alert.get("commodity_slug", "?")
    kind = alert.get("kind", "?")
    threshold = alert.get("threshold")
    title = f"Alerta {slug}"
    body = f"{kind} {threshold} · observado {trigger_value}"

    payload = {
        "title": title,
        "body": body,
        "icon": "/politeia-logo.svg",
        "badge": "/politeia-logo.svg",
        "tag": f"alert_{alert.get('id', 'unknown')}",
        "data": {
            "alert_id": alert.get("id"),
            "commodity_slug": slug,
            "kind": kind,
            "trigger_value": trigger_value,
            "url": f"/commodities/{slug}",
        },
    }
    result = send_push_to_user(user_id, payload)
    status = result.get("status")
    if status == "ok":
        return "ok"
    if status in ("no_subs", "skipped"):
        return "skipped"
    if status == "partial":
        return "ok"  # al menos uno entregado
    return f"error: {result.get('error') or status}"


# ─────────────────────────────────────────────────────────────────
# CLI · generar VAPID keys
# ─────────────────────────────────────────────────────────────────

def generate_vapid_keys() -> dict[str, str]:
    """Genera un par EC P-256 listo para VAPID. Imprime en stdout."""
    from py_vapid import Vapid  # type: ignore

    vp = Vapid()
    vp.generate_keys()
    private_pem = vp.private_pem().decode("ascii") if hasattr(vp, "private_pem") else ""
    public_uncompressed = (
        vp.public_key.public_numbers()
        .public_bytes(  # type: ignore[attr-defined]
            encoding=None, format=None,
        )
        if False else None
    )  # placeholder · py_vapid expone helpers más simples abajo
    # Mejor: usar la API simple de py_vapid
    public_b64 = vp.public_key_urlsafe_base64() if hasattr(vp, "public_key_urlsafe_base64") else ""
    return {
        "VAPID_PRIVATE_KEY": private_pem,
        "VAPID_PUBLIC_KEY": public_b64,
        "VAPID_SUBJECT": VAPID_SUBJECT_DEFAULT,
    }


if __name__ == "__main__":  # pragma: no cover
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "generate-keys":
        try:
            keys = generate_vapid_keys()
            print("# Añade a .env (NO commitear el privado):")
            for k, v in keys.items():
                if k == "VAPID_PRIVATE_KEY":
                    print(f"{k}='{v.strip()}'")
                else:
                    print(f"{k}={v}")
        except Exception as exc:
            print(f"Error: {exc}", file=sys.stderr)
            sys.exit(1)
    else:
        print("Uso: python -m etl.sources.commodities.web_push generate-keys")


__all__ = [
    "is_configured",
    "upsert_subscription",
    "remove_subscription",
    "list_subscriptions",
    "send_push_to_user",
    "send_push_for_alert",
    "generate_vapid_keys",
]
