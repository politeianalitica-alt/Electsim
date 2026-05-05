"""
Message Consistency Tracker — ElectSim.

Rastrea la coherencia del mensaje entre comunicaciones del cliente.
Detecta contradicciones, drift semántico y riesgos de inconsistencia.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

# ── Modelos Pydantic v2 ────────────────────────────────────────────────────────


class MessageRecord(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id: str
    date: datetime
    content: str
    asset_type: str
    channel: str
    tenant_id: str
    workspace_id: str = "default"
    key_claims: list[str] = []
    approved_by: str = ""

    @field_validator("id")
    @classmethod
    def id_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("id no puede estar vacío")
        return v


class ConsistencyReport(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    checked_at: datetime
    total_messages: int
    consistency_score: float  # 0-1
    inconsistencies: list[dict[str, Any]]  # cada item: message1_id, message2_id, description, severity
    drift_detected: bool
    drift_description: str = ""
    recommendations: list[str]

    @field_validator("consistency_score")
    @classmethod
    def score_range(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("consistency_score debe estar entre 0.0 y 1.0")
        return round(v, 4)


# ── Almacén en memoria ────────────────────────────────────────────────────────

_MESSAGE_LOG: dict[str, list[MessageRecord]] = {}

# Patrones de extracción de afirmaciones clave
_CLAIM_PATTERNS = [
    re.compile(r"\d[\d\.,]*\s*%"),                          # porcentajes
    re.compile(r"\d[\d\.,]*\s*(millones?|miles?|euros?|empleos?|viviendas?)", re.IGNORECASE),
    re.compile(r"\b(nunca|siempre|jamás|todos|ninguno|en ningún caso)\b", re.IGNORECASE),
    re.compile(r"\b(es un hecho|según datos|según cifras|los datos demuestran|queda demostrado)\b", re.IGNORECASE),
]

# Palabras con polaridad positiva / negativa para detección de contradicción básica
_POSITIVE_TERMS = frozenset([
    "mejora", "mejoran", "aumenta", "sube", "subida", "crecimiento", "creció",
    "récord", "máximo", "exitoso", "éxito", "avance", "progreso", "solución",
    "resuelto", "aprobado", "aprobada", "implementado",
])
_NEGATIVE_TERMS = frozenset([
    "fracaso", "fracasa", "crisis", "caos", "problema", "falla", "fallo",
    "disminuye", "baja", "bajada", "desciende", "mínimo", "rechazado",
    "rechazada", "paralizado", "bloqueado",
])


# ── Funciones públicas ─────────────────────────────────────────────────────────


def log_message(
    tenant_id: str,
    content: str,
    asset_type: str,
    channel: str,
    workspace_id: str = "default",
    approved_by: str = "",
) -> MessageRecord:
    """Registra un nuevo mensaje en el log del tenant."""
    claims = extract_key_claims(content)
    record = MessageRecord(
        id=str(uuid.uuid4()),
        date=datetime.now(timezone.utc),
        content=content,
        asset_type=asset_type,
        channel=channel,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        key_claims=claims,
        approved_by=approved_by,
    )
    _MESSAGE_LOG.setdefault(tenant_id, []).append(record)
    return record


def extract_key_claims(text: str) -> list[str]:
    """
    Extrae afirmaciones clave del texto usando reglas simples.

    Busca: números/%, palabras absolutas (nunca/siempre),
    frases de autoridad epistémica (según datos, es un hecho).
    """
    if not text or not text.strip():
        return []

    claims: list[str] = []
    sentences = re.split(r"[.!?;]", text)

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        for pattern in _CLAIM_PATTERNS:
            if pattern.search(sentence):
                claims.append(sentence[:200])
                break  # una sola vez por frase

    return claims


def check_consistency(
    tenant_id: str,
    workspace_id: str = "default",
) -> ConsistencyReport:
    """
    Analiza los últimos 20 mensajes del tenant en busca de contradicciones.

    Regla básica: si dos mensajes contienen términos de polaridad opuesta
    sobre entidades similares → inconsistencia.
    """
    messages = _MESSAGE_LOG.get(tenant_id, [])
    # Filtrar por workspace si se especifica
    ws_messages = [m for m in messages if m.workspace_id == workspace_id] if workspace_id != "default" else messages
    recent = ws_messages[-20:]

    if not recent:
        return ConsistencyReport(
            checked_at=datetime.now(timezone.utc),
            total_messages=0,
            consistency_score=1.0,
            inconsistencies=[],
            drift_detected=False,
            drift_description="",
            recommendations=["No hay mensajes registrados para analizar."],
        )

    inconsistencies: list[dict[str, Any]] = []

    # Comparar pares de mensajes
    for i, msg_a in enumerate(recent):
        for msg_b in recent[i + 1 :]:
            contradiction = _detect_contradiction(msg_a, msg_b)
            if contradiction:
                inconsistencies.append(
                    {
                        "message1_id": msg_a.id,
                        "message2_id": msg_b.id,
                        "description": contradiction,
                        "severity": "alta" if "nunca" in contradiction.lower() or "siempre" in contradiction.lower() else "media",
                    }
                )

    n = len(recent)
    n_pairs = max(1, n * (n - 1) // 2)
    n_inc = len(inconsistencies)
    score = max(0.0, 1.0 - (n_inc / n_pairs))

    # Detección de drift: si el ratio de mensajes negativos cambia mucho
    drift_detected = False
    drift_description = ""
    if n >= 6:
        first_half = recent[: n // 2]
        second_half = recent[n // 2 :]
        neg_first = _negativity_ratio(first_half)
        neg_second = _negativity_ratio(second_half)
        if abs(neg_second - neg_first) > 0.35:
            drift_detected = True
            direction = "más negativo" if neg_second > neg_first else "más positivo"
            drift_description = (
                f"El tono ha derivado hacia un registro {direction} en los últimos mensajes "
                f"(ratio negativo: {neg_first:.0%} → {neg_second:.0%})."
            )

    recommendations = _build_recommendations(inconsistencies, drift_detected, score)

    return ConsistencyReport(
        checked_at=datetime.now(timezone.utc),
        total_messages=n,
        consistency_score=round(score, 4),
        inconsistencies=inconsistencies,
        drift_detected=drift_detected,
        drift_description=drift_description,
        recommendations=recommendations,
    )


def get_recent_messages(tenant_id: str, limit: int = 10) -> list[MessageRecord]:
    """Devuelve los mensajes más recientes del tenant, limitado a `limit`."""
    messages = _MESSAGE_LOG.get(tenant_id, [])
    return messages[-limit:]


def get_consistency_score(tenant_id: str) -> float:
    """Devuelve la puntuación de consistencia actual (0-1). Default 1.0 si no hay mensajes."""
    messages = _MESSAGE_LOG.get(tenant_id, [])
    if not messages:
        return 1.0
    report = check_consistency(tenant_id)
    return report.consistency_score


def _demo_consistency_report() -> ConsistencyReport:
    """Reporte de demo realista con 2-3 inconsistencias."""
    id1 = "demo-msg-001"
    id2 = "demo-msg-002"
    id3 = "demo-msg-003"
    id4 = "demo-msg-004"
    return ConsistencyReport(
        checked_at=datetime.now(timezone.utc),
        total_messages=12,
        consistency_score=0.74,
        inconsistencies=[
            {
                "message1_id": id1,
                "message2_id": id3,
                "description": (
                    "El mensaje del 01/05 afirma que el paro juvenil 'nunca ha sido menor', "
                    "mientras el mensaje del 04/05 reconoce una 'crisis en el empleo joven'. "
                    "Contradicción directa."
                ),
                "severity": "alta",
            },
            {
                "message1_id": id2,
                "message2_id": id4,
                "description": (
                    "El tono sobre vivienda varía: el comunicado de prensa usa 'solución definitiva' "
                    "y la entrevista posterior habla de 'problema sin resolver a corto plazo'."
                ),
                "severity": "media",
            },
            {
                "message1_id": id1,
                "message2_id": id4,
                "description": (
                    "El dato de crecimiento del PIB citado difiere en 0.3 puntos entre el tweet (2.8%) "
                    "y la nota de prensa (2.5%). Verificar fuente oficial."
                ),
                "severity": "baja",
            },
        ],
        drift_detected=True,
        drift_description=(
            "El tono comunicativo ha derivado hacia un registro más defensivo en la segunda mitad del período analizado "
            "(ratio negativo: 18% → 54%). Revisar estrategia de encuadre."
        ),
        recommendations=[
            "Establecer un documento de líneas rojas con afirmaciones que nunca deben contradecirse entre sí.",
            "Revisar el mensaje sobre empleo joven: elegir un encuadre consistente y mantenerlo.",
            "Centralizar la fuente de datos de PIB y citar siempre la misma referencia oficial.",
            "Reducir el tono defensivo — preferir proactividad con datos y propuestas.",
        ],
    )


# ── Helpers internos ──────────────────────────────────────────────────────────


def _detect_contradiction(msg_a: MessageRecord, msg_b: MessageRecord) -> str | None:
    """
    Heurística simple: detecta si dos mensajes tienen polaridades opuestas
    sobre las mismas entidades clave.
    """
    words_a = set(re.findall(r"\b\w+\b", msg_a.content.lower()))
    words_b = set(re.findall(r"\b\w+\b", msg_b.content.lower()))

    pos_a = bool(words_a & _POSITIVE_TERMS)
    neg_a = bool(words_a & _NEGATIVE_TERMS)
    pos_b = bool(words_b & _POSITIVE_TERMS)
    neg_b = bool(words_b & _NEGATIVE_TERMS)

    # Contradicción solo si hay superposición de entidades y polaridades opuestas
    common_words = words_a & words_b
    # Palabras sustantivas de contenido compartidas (>4 letras, no stopwords)
    _STOP = frozenset(["para", "como", "este", "esta", "esto", "pero", "también", "más",
                       "una", "uno", "con", "del", "los", "las", "que", "por", "sus"])
    shared_content = [w for w in common_words if len(w) > 4 and w not in _STOP]

    if not shared_content:
        return None

    if (pos_a and neg_b) or (neg_a and pos_b):
        entity = shared_content[0]
        direction_a = "positivo" if pos_a else "negativo"
        direction_b = "positivo" if pos_b else "negativo"
        return (
            f"Mensajes con tono opuesto sobre '{entity}': "
            f"mensaje A es {direction_a}, mensaje B es {direction_b}."
        )

    # Afirmación absoluta contradictoria (nunca vs siempre)
    has_never_a = bool(re.search(r"\bnunca\b", msg_a.content, re.IGNORECASE))
    has_always_b = bool(re.search(r"\bsiempre\b", msg_b.content, re.IGNORECASE))
    has_always_a = bool(re.search(r"\bsiempre\b", msg_a.content, re.IGNORECASE))
    has_never_b = bool(re.search(r"\bnunca\b", msg_b.content, re.IGNORECASE))

    if (has_never_a and has_always_b) or (has_always_a and has_never_b):
        if shared_content:
            return (
                f"Contradicción lógica: un mensaje usa 'nunca' y otro 'siempre' "
                f"sobre '{shared_content[0]}'."
            )

    return None


def _negativity_ratio(messages: list[MessageRecord]) -> float:
    """Ratio de mensajes con tono negativo (0-1)."""
    if not messages:
        return 0.0
    neg_count = 0
    for m in messages:
        words = set(re.findall(r"\b\w+\b", m.content.lower()))
        if words & _NEGATIVE_TERMS:
            neg_count += 1
    return neg_count / len(messages)


def _build_recommendations(
    inconsistencies: list[dict[str, Any]],
    drift: bool,
    score: float,
) -> list[str]:
    """Genera recomendaciones basadas en los resultados del análisis."""
    recs: list[str] = []

    if score >= 0.9:
        recs.append("Coherencia de mensaje excelente. Mantener la disciplina comunicativa actual.")
    elif score >= 0.7:
        recs.append("Coherencia de mensaje aceptable. Revisar los puntos de inconsistencia detectados.")
    else:
        recs.append(
            "Coherencia de mensaje baja. Urgente: crear un documento de mensajes aprobados y distribuirlo al equipo."
        )

    if any(i["severity"] == "alta" for i in inconsistencies):
        recs.append(
            "Hay inconsistencias de severidad alta. Corregir antes de la próxima aparición pública."
        )

    if drift:
        recs.append(
            "Se detecta drift semántico. Revisar si el cambio de tono es estratégico o accidental."
        )

    if len(inconsistencies) > 3:
        recs.append(
            "Múltiples inconsistencias: considerar un briefing de equipo para realinear el mensaje."
        )

    if not recs:
        recs.append("Continuar monitorizando la coherencia del mensaje en próximas comunicaciones.")

    return recs
