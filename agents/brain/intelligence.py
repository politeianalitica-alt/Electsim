"""
Bloque 4 — Intelligence · 5 tools del GroqBrain.

Inteligencia política accionable sobre actores, oposición, posiciones
legislativas, geopolítica y voto blando.

  · build_actor_profile          — perfil 360º de un actor político
  · opposition_research          — análisis del rival (estilo war room)
  · analyze_legislative_position — postura del actor sobre una ley/tema
  · geopolitical_impact          — impacto geopolítico sobre España
  · analyze_soft_vote            — quiénes son los blandos y cómo moverlos

Estos tools producen output operativo, no narrativo: el output es para
estrategia y decisión.

────────────────────────────────────────────────────────────────────────────
A3 · AUDIT TRAIL OBLIGATORIO PARA opposition_research
────────────────────────────────────────────────────────────────────────────
`opposition_research` produce attack_vectors y predicted_responses sobre
un actor político REAL. Para evitar uso indebido (campañas de daño
reputacional, desinformación dirigida) y para cumplir con RGPD/derecho al
honor:

  - El método requiere `requester_id` y `purpose` obligatorios.
  - Cada llamada se persiste a `logs/opposition_research_audit.jsonl`
    (también a BD si la tabla `audit_opposition_research` existe).
  - Rate-limit: 5 actores/día por `requester_id` (se puede subir o bajar
    via env var POLITEIA_OPPRES_DAILY_LIMIT).

A6 · DISTINCIÓN DATOS VERIFICADOS vs INFERIDOS POR LLM
────────────────────────────────────────────────────────────────────────────
`build_actor_profile` ahora devuelve dos secciones:
  - `verified_inputs`: lo que pasó el caller (known_facts, recent_statements)
  - `inferred_by_llm`: lo que el modelo añadió de su conocimiento paramétrico
Si el caller no aporta `known_facts`, el output se marca
`requires_human_verification=True` para que el analista no confunda
inferencia con dato verificado.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# A3 · Audit trail · log JSONL local + tabla BD opcional + rate-limit
# ─────────────────────────────────────────────────────────────────

_AUDIT_PATH = Path(
    os.environ.get(
        "POLITEIA_OPPRES_AUDIT_LOG",
        "logs/opposition_research_audit.jsonl",
    )
).expanduser()

_OPPRES_DAILY_LIMIT = int(os.environ.get("POLITEIA_OPPRES_DAILY_LIMIT", "5"))

_AUDIT_LOCK = threading.Lock()
# In-memory rate counter por requester_id (reset diario)
_RATE_COUNTERS: dict[str, dict[str, Any]] = {}


def _today_utc_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _check_rate_limit(requester_id: str) -> tuple[bool, int, int]:
    """Comprueba el cupo diario del requester. Devuelve (allowed, used, limit)."""
    today = _today_utc_str()
    with _AUDIT_LOCK:
        bucket = _RATE_COUNTERS.get(requester_id)
        if not bucket or bucket.get("date") != today:
            bucket = {"date": today, "count": 0}
            _RATE_COUNTERS[requester_id] = bucket
        used = int(bucket.get("count", 0))
        if used >= _OPPRES_DAILY_LIMIT:
            return False, used, _OPPRES_DAILY_LIMIT
        bucket["count"] = used + 1
        return True, used + 1, _OPPRES_DAILY_LIMIT


def _write_audit_entry(entry: dict[str, Any]) -> None:
    """Persiste a JSONL local (siempre) y a BD si está disponible."""
    # 1) JSONL local (always-on)
    try:
        _AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _AUDIT_LOCK:
            with open(_AUDIT_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as exc:
        logger.warning("audit jsonl write failed: %s", exc)

    # 2) BD opcional (best-effort)
    try:
        from db.session import get_engine
        from sqlalchemy import text as sql_text
        engine = get_engine()
        if engine is None:
            return
        with engine.begin() as conn:
            conn.execute(sql_text("""
                CREATE TABLE IF NOT EXISTS audit_opposition_research (
                    id BIGSERIAL PRIMARY KEY,
                    requester_id TEXT NOT NULL,
                    target_actor TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    time_window TEXT,
                    ok BOOLEAN,
                    error TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(
                sql_text("""
                    INSERT INTO audit_opposition_research
                    (requester_id, target_actor, purpose, time_window, ok, error)
                    VALUES (:rid, :ta, :pp, :tw, :ok, :err)
                """),
                {
                    "rid": entry.get("requester_id"),
                    "ta": entry.get("target_actor"),
                    "pp": entry.get("purpose"),
                    "tw": entry.get("time_window"),
                    "ok": bool(entry.get("ok", True)),
                    "err": entry.get("error") or "",
                },
            )
    except Exception as exc:
        logger.debug("audit BD write skipped: %s", exc)


# ─────────────────────────────────────────────────────────────────
# Mixin
# ─────────────────────────────────────────────────────────────────

class IntelligenceMixin:
    """Bloque 4 · Inteligencia política accionable."""

    # ─────────────────────────────────────────────────────────────
    def build_actor_profile(
        self,
        *,
        actor_name: str,
        role: str = "",
        known_facts: list[str] | str = "",
        recent_statements: list[str] | None = None,
    ) -> dict[str, Any]:
        """Construye perfil 360º: biografía política, estilo, redes, momentum,
        riesgos, palancas.

        A6 · Distingue datos verificados (aportados por el caller) de
        inferencias del LLM (su conocimiento paramétrico). Si no se aportan
        `known_facts` ni `recent_statements`, marca el resultado como
        `requires_human_verification=True` para que el analista sepa que
        TODO el contenido es inferencia del modelo (no datos validados).

        Devuelve: {biography, political_style, key_relations, momentum,
                   strengths, weaknesses, leverage_points,
                   verified_inputs: {known_facts, recent_statements},
                   data_quality: {has_verified_facts, requires_human_verification, ...}}
        """
        kf_list: list[str] = []
        if isinstance(known_facts, list):
            kf_list = [str(x) for x in known_facts if x]
        elif isinstance(known_facts, str) and known_facts.strip():
            kf_list = [known_facts.strip()]

        rs_list = [str(x) for x in (recent_statements or []) if x]

        has_verified = bool(kf_list or rs_list)

        result = self._call(
            "intel_build_actor_profile",
            {
                "actor_name": actor_name,
                "role": role,
                "known_facts": kf_list,
                "recent_statements": rs_list,
                "has_verified_inputs": has_verified,
            },
        )

        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["verified_inputs"] = {
                "known_facts": kf_list,
                "recent_statements": rs_list,
            }
            result["result"]["data_quality"] = {
                "has_verified_facts": bool(kf_list),
                "has_recent_statements": bool(rs_list),
                "requires_human_verification": not has_verified,
                "note": (
                    "Todo el contenido del perfil proviene del conocimiento "
                    "paramétrico del LLM (puede estar desactualizado). Aporta "
                    "`known_facts` y/o `recent_statements` para fijar la base "
                    "fáctica del análisis."
                ) if not has_verified else (
                    "El análisis se construyó sobre los inputs verificados aportados "
                    "más el conocimiento paramétrico del LLM como contexto."
                ),
            }
        return result

    # ─────────────────────────────────────────────────────────────
    def opposition_research(
        self,
        *,
        target_actor: str,
        client_position: str,
        recent_actions: list[str] | None = None,
        time_window: str = "últimos 6 meses",
        requester_id: str | None = None,
        purpose: str | None = None,
    ) -> dict[str, Any]:
        """Análisis del rival desde una posición concreta. Genera vectores de
        ataque y contraataque, prediciendo su respuesta probable.

        A3 · Para usar esta tool es obligatorio aportar:
          - `requester_id`: identificador del analista/equipo que solicita
          - `purpose`: descripción breve del por qué (auditoría posterior)

        Si falta alguno, devuelve ok=False con error explícito (no llama LLM).
        Cada uso queda registrado en `logs/opposition_research_audit.jsonl` y
        en la tabla `audit_opposition_research` (si hay BD configurada).
        Rate-limit: `POLITEIA_OPPRES_DAILY_LIMIT` (default 5) por requester.

        Devuelve: {vulnerabilities, attack_vectors, predicted_responses,
                   counter_arguments, risks_for_client, audit: {...}}
        """
        # A3 · Validar inputs de auditoría
        rid = (requester_id or "").strip()
        pp = (purpose or "").strip()
        if not rid or not pp:
            return {
                "ok": False, "result": None, "raw": "", "confidence": 0.0,
                "sources": [], "reasoning_steps": [],
                "model": "", "tokens_used": 0, "latency_ms": 0,
                "prompt_name": "intel_opposition_research", "from_fallback": False,
                "error": (
                    "audit_required: 'requester_id' y 'purpose' son obligatorios "
                    "para opposition_research (uso responsable y RGPD). No se ha "
                    "llamado al LLM."
                ),
            }

        # A3 · Rate-limit diario por requester
        allowed, used, limit = _check_rate_limit(rid)
        if not allowed:
            return {
                "ok": False, "result": None, "raw": "", "confidence": 0.0,
                "sources": [], "reasoning_steps": [],
                "model": "", "tokens_used": 0, "latency_ms": 0,
                "prompt_name": "intel_opposition_research", "from_fallback": False,
                "error": (
                    f"rate_limited: {used}/{limit} consultas opposition_research "
                    f"hoy para requester_id='{rid}'. Sube POLITEIA_OPPRES_DAILY_LIMIT "
                    f"si tu organización lo requiere."
                ),
            }

        result = self._call(
            "intel_opposition_research",
            {
                "target_actor": target_actor,
                "client_position": client_position,
                "recent_actions": recent_actions or [],
                "time_window": time_window,
            },
        )

        # A3 · Audit entry · siempre, ok o no
        audit_entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "requester_id": rid,
            "target_actor": target_actor,
            "purpose": pp[:500],
            "time_window": time_window,
            "ok": bool(result.get("ok") if isinstance(result, dict) else False),
            "error": (result.get("error") if isinstance(result, dict) else "") or "",
            "model": (result.get("model") if isinstance(result, dict) else "") or "",
            "tokens_used": (result.get("tokens_used") if isinstance(result, dict) else 0) or 0,
            "daily_count_after": used,
            "daily_limit": limit,
        }
        _write_audit_entry(audit_entry)

        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["audit"] = {
                "requester_id": rid,
                "purpose": pp[:200],
                "logged_at": audit_entry["ts"],
                "daily_count": used,
                "daily_limit": limit,
                "note": (
                    "Esta consulta se ha registrado en el audit log de Politeia. "
                    "Uso indebido (campañas de daño, desinformación) infringe RGPD "
                    "y la política interna."
                ),
            }
        return result

    # ─────────────────────────────────────────────────────────────
    def analyze_legislative_position(
        self,
        *,
        actor_or_party: str,
        law_or_topic: str,
        historical_votes: str = "",
        public_statements: list[str] | None = None,
    ) -> dict[str, Any]:
        """Predice y explica la postura del actor/partido sobre una ley o tema.

        Devuelve: {predicted_vote, certainty, official_position, real_position,
                   internal_dissent, conditions_for_change, ...}
        """
        return self._call(
            "intel_analyze_legislative_position",
            {
                "actor_or_party": actor_or_party,
                "law_or_topic": law_or_topic,
                "historical_votes": historical_votes,
                "public_statements": public_statements or [],
            },
        )

    # ─────────────────────────────────────────────────────────────
    def geopolitical_impact(
        self,
        *,
        event: str,
        region: str = "España",
        sectors: list[str] | None = None,
        time_horizon: str = "3-12 meses",
    ) -> dict[str, Any]:
        """Razona el impacto geopolítico de un evento sobre intereses
        nacionales/sectoriales.

        Devuelve: {direct_impacts, indirect_impacts, sectors_affected,
                   policy_implications, opportunities, risks, ...}
        """
        return self._call(
            "intel_geopolitical_impact",
            {
                "event": event,
                "region": region,
                "sectors": sectors or [],
                "time_horizon": time_horizon,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def analyze_soft_vote(
        self,
        *,
        party: str,
        territory: str = "España",
        polls_summary: str = "",
        segments_data: dict[str, Any] | str = "",
    ) -> dict[str, Any]:
        """Identifica el voto blando y propone palancas de movilización o
        captura.

        Devuelve: {soft_voter_segments, motivations, persuasive_messages,
                   channels, expected_yield, ...}
        """
        return self._call(
            "intel_analyze_soft_vote",
            {
                "party": party,
                "territory": territory,
                "polls_summary": polls_summary,
                "segments_data": segments_data,
            },
        )
