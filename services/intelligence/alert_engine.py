"""
Alert Intelligence Engine — ElectSim.

Motor de alertas inteligentes: deteccion automatica, priorizacion y enrutamiento.
Sistema de alertas multicapa con escalado automatico por urgencia.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AlertLevel(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class AlertCategory(str, Enum):
    electoral = "electoral"
    legislative = "legislative"
    media = "media"
    risk = "risk"
    economic = "economic"
    geopolitical = "geopolitical"
    operational = "operational"
    intelligence = "intelligence"


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

class IntelAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    body: str
    level: AlertLevel
    category: AlertCategory
    source: str
    tenant_id: str
    workspace_id: str = "default"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: datetime | None = None
    escalated: bool = False
    tags: list[str] = Field(default_factory=list)
    action_required: bool = False
    action_text: str = ""
    related_entity: str = ""


# ---------------------------------------------------------------------------
# Alert store (in-memory, keyed by tenant_id)
# ---------------------------------------------------------------------------

_ALERT_STORE: dict[str, list[IntelAlert]] = defaultdict(list)
_DEMO_INITIALIZED: bool = False


def _now(offset_hours: float = 0.0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=offset_hours)


def _init_demo_alerts() -> None:
    global _DEMO_INITIALIZED
    if _DEMO_INITIALIZED:
        return
    _DEMO_INITIALIZED = True

    demos: list[IntelAlert] = [
        IntelAlert(
            title="Caida PP 2,3pp en sondeo independiente",
            body=(
                "El Partido Popular registra una caida de 2,3 puntos porcentuales en el "
                "ultimo sondeo de Metroscopia, con correlacion directa (-0,82) con el "
                "incremento de cobertura negativa en televisiones nacionales durante las "
                "ultimas 72 horas. Activar protocolo de respuesta mediatica."
            ),
            level=AlertLevel.critical,
            category=AlertCategory.electoral,
            source="Metroscopia / Monitor de medios",
            tenant_id="demo",
            created_at=_now(1.5),
            action_required=True,
            action_text="Activar protocolo de contranarrrativa y monitorizar evolución horaria",
            related_entity="PP",
            tags=["sondeo", "pp", "tendencia", "urgente"],
        ),
        IntelAlert(
            title="Narrativa 'crisis de vivienda' alcanza pico historico de menciones",
            body=(
                "El encuadre 'crisis de vivienda' acumula 1.240 menciones en medios "
                "digitales en las ultimas 48 horas, superando el maximo historico previo "
                "(987 menciones, octubre 2024). El 68% de las piezas tienen valencia "
                "negativa hacia el Gobierno central."
            ),
            level=AlertLevel.high,
            category=AlertCategory.media,
            source="Monitor de narrativas / NLP Pipeline",
            tenant_id="demo",
            created_at=_now(3.0),
            action_required=False,
            tags=["vivienda", "narrativa", "medios", "pico"],
            related_entity="Gobierno",
        ),
        IntelAlert(
            title="Mocion de censura anunciada — detalles en 24h",
            body=(
                "Fuentes parlamentarias de alta fiabilidad confirman que el Grupo "
                "Parlamentario Popular presentara una mocion de censura en el plazo de "
                "24 horas. Se esperan declaraciones publicas del lider de la oposicion "
                "esta tarde. Impacto elevado en agenda mediatica y mercados financieros."
            ),
            level=AlertLevel.high,
            category=AlertCategory.legislative,
            source="Inteligencia parlamentaria",
            tenant_id="demo",
            created_at=_now(6.0),
            action_required=True,
            action_text="Activar protocolo de monitorizacion de mocion de censura",
            related_entity="Congreso",
            tags=["mocion-censura", "congreso", "oposicion", "critico"],
        ),
        IntelAlert(
            title="IPC sube 0,3pp mas de lo previsto — impacto en narrativa de gestion economica",
            body=(
                "El IPC de abril supera las previsiones en 0,3 puntos porcentuales segun "
                "datos adelantados del INE. El diferencial con la media de la eurozona "
                "se amplia a 0,8pp. Impacto esperado en encuadre mediático de 'mala "
                "gestion economica' en proximas 48 horas."
            ),
            level=AlertLevel.medium,
            category=AlertCategory.economic,
            source="INE / Modelo de impacto economico",
            tenant_id="demo",
            created_at=_now(8.0),
            action_required=False,
            tags=["ipc", "economia", "inflacion"],
            related_entity="INE",
        ),
        IntelAlert(
            title="Crisis bilateral Espana-Marruecos — 3 reuniones canceladas",
            body=(
                "El Ministerio de Asuntos Exteriores ha cancelado tres reuniones "
                "bilaterales programadas con la contraparte marroqui sin justificacion "
                "publica. Fuentes diplomaticas apuntan a tension por el expediente de "
                "Brahim Ghali. Posible impacto en narrativa de politica exterior."
            ),
            level=AlertLevel.medium,
            category=AlertCategory.geopolitical,
            source="Monitor diplomatico / OSINT",
            tenant_id="demo",
            created_at=_now(12.0),
            action_required=False,
            tags=["marruecos", "diplomatico", "exterior"],
            related_entity="MAEC",
        ),
        IntelAlert(
            title="VOX pierde 1,8pp en CCAA — posible transferencia a PP",
            body=(
                "El ultimo sondeo autonomico situa a VOX en minimos de legislatura con "
                "una caida de 1,8 puntos porcentuales. El analisis de transferencias de "
                "voto indica que el 62% migra hacia el PP, con especial incidencia en "
                "Madrid, Murcia y Castilla y Leon. Revision del modelo de coalicion recomendada."
            ),
            level=AlertLevel.medium,
            category=AlertCategory.electoral,
            source="Tracker de sondeos autonomicos",
            tenant_id="demo",
            created_at=_now(18.0),
            action_required=False,
            tags=["vox", "pp", "transferencia", "ccaa"],
            related_entity="VOX",
        ),
        IntelAlert(
            title="Nuevo encuadre mediatico: 'gobierno debil' aparece en 14 cabeceras",
            body=(
                "El encuadre semantico 'gobierno debil' ha emergido de forma coordinada "
                "en 14 cabeceras nacionales en las ultimas 36 horas. El patron de "
                "difusion sugiere coordinacion editorial. Aun sin impacto medible en "
                "intencion de voto."
            ),
            level=AlertLevel.low,
            category=AlertCategory.media,
            source="NLP Pipeline / Detector de encuadres",
            tenant_id="demo",
            created_at=_now(30.0),
            action_required=False,
            tags=["encuadre", "medios", "gobierno"],
            related_entity="Gobierno",
        ),
        IntelAlert(
            title="Actualizacion de datos de sondeos — 3 nuevas oleadas procesadas",
            body=(
                "El pipeline ETL ha procesado correctamente 3 nuevas oleadas de sondeos: "
                "CIS (n=3.840), Metroscopia (n=1.200) y GAD3 (n=1.050). Los modelos de "
                "nowcasting han sido recalibrados. Los resultados estan disponibles en "
                "los dashboards de intencion de voto."
            ),
            level=AlertLevel.info,
            category=AlertCategory.operational,
            source="Pipeline ETL / Sistema de datos",
            tenant_id="demo",
            created_at=_now(48.0),
            action_required=False,
            tags=["sondeos", "etl", "datos"],
        ),
    ]

    for alert in demos:
        _ALERT_STORE["demo"].append(alert)


# Inicializar demos al importar el modulo
_init_demo_alerts()


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def create_alert(
    tenant_id: str,
    title: str,
    body: str,
    level: AlertLevel,
    category: AlertCategory,
    source: str,
    workspace_id: str = "default",
    tags: list[str] | None = None,
    action_required: bool = False,
    action_text: str = "",
    related_entity: str = "",
) -> IntelAlert:
    """Crea y almacena una nueva alerta para el tenant."""
    alert = IntelAlert(
        title=title,
        body=body,
        level=level,
        category=category,
        source=source,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        tags=tags or [],
        action_required=action_required,
        action_text=action_text,
        related_entity=related_entity,
    )
    _ALERT_STORE[tenant_id].append(alert)
    return alert


def get_alerts(
    tenant_id: str,
    level: AlertLevel | None = None,
    category: AlertCategory | None = None,
    unread_only: bool = False,
    limit: int = 50,
) -> list[IntelAlert]:
    """Recupera alertas filtradas, ordenadas por created_at desc."""
    alerts = list(_ALERT_STORE.get(tenant_id, []))

    if level is not None:
        alerts = [a for a in alerts if a.level == level]
    if category is not None:
        alerts = [a for a in alerts if a.category == category]
    if unread_only:
        alerts = [a for a in alerts if a.read_at is None]

    alerts.sort(key=lambda a: a.created_at, reverse=True)
    return alerts[:limit]


def mark_read(tenant_id: str, alert_id: str) -> bool:
    """Marca una alerta como leida. Devuelve True si se encontro."""
    for alert in _ALERT_STORE.get(tenant_id, []):
        if alert.id == alert_id and alert.read_at is None:
            alert.read_at = datetime.now(timezone.utc)
            return True
    return False


def mark_all_read(tenant_id: str) -> int:
    """Marca todas las alertas sin leer como leidas. Devuelve el numero marcado."""
    now = datetime.now(timezone.utc)
    count = 0
    for alert in _ALERT_STORE.get(tenant_id, []):
        if alert.read_at is None:
            alert.read_at = now
            count += 1
    return count


def get_unread_count(tenant_id: str) -> int:
    """Devuelve el numero de alertas sin leer para el tenant."""
    return sum(1 for a in _ALERT_STORE.get(tenant_id, []) if a.read_at is None)


def get_alerts_by_level(tenant_id: str) -> dict[str, int]:
    """Devuelve el conteo de alertas por nivel."""
    counts: dict[str, int] = {level.value: 0 for level in AlertLevel}
    for alert in _ALERT_STORE.get(tenant_id, []):
        counts[alert.level.value] += 1
    return counts


def get_critical_alerts(tenant_id: str) -> list[IntelAlert]:
    """Devuelve solo las alertas criticas sin leer."""
    return get_alerts(tenant_id, level=AlertLevel.critical, unread_only=True)


def escalate_alert(tenant_id: str, alert_id: str) -> bool:
    """Escala una alerta (escalated=True). Devuelve True si se encontro."""
    for alert in _ALERT_STORE.get(tenant_id, []):
        if alert.id == alert_id:
            alert.escalated = True
            return True
    return False


def generate_auto_alerts(tenant_id: str, context: dict[str, Any]) -> list[IntelAlert]:
    """
    Generacion de alertas basada en reglas a partir de datos de contexto.

    Reglas:
    - nowcasting_delta < -2.0 -> alerta electoral por caida
    - narrative_velocity == 'critical' -> alerta mediatica
    - risk_score > 75 -> alerta de riesgo
    """
    created: list[IntelAlert] = []

    nowcasting_delta = context.get("nowcasting_delta", 0.0)
    if nowcasting_delta < -2.0:
        alert = create_alert(
            tenant_id=tenant_id,
            title=f"Caida significativa en nowcasting: {nowcasting_delta:.1f}pp",
            body=(
                f"El modelo de nowcasting detecta una caida de {abs(nowcasting_delta):.1f} "
                "puntos porcentuales, superando el umbral de alerta (-2pp). "
                "Se recomienda revision inmediata del tracker de intencion de voto."
            ),
            level=AlertLevel.high,
            category=AlertCategory.electoral,
            source="Motor de nowcasting",
            workspace_id=context.get("workspace_id", "default"),
            action_required=True,
            action_text="Revisar tracker de intencion de voto y activar protocolo de respuesta",
            tags=["nowcasting", "caida", "electoral"],
        )
        created.append(alert)

    narrative_velocity = context.get("narrative_velocity")
    if narrative_velocity == "critical":
        alert = create_alert(
            tenant_id=tenant_id,
            title="Velocidad de narrativa en nivel critico",
            body=(
                "El monitor de narrativas detecta una velocidad de propagacion critica. "
                "La narrativa dominante se esta expandiendo a un ritmo que supera los "
                "umbrales de alerta. Revision inmediata del encuadre mediatico recomendada."
            ),
            level=AlertLevel.high,
            category=AlertCategory.media,
            source="Monitor de narrativas",
            workspace_id=context.get("workspace_id", "default"),
            action_required=True,
            action_text="Activar protocolo de respuesta mediatica y monitorizar en tiempo real",
            tags=["narrativa", "velocidad", "critico"],
        )
        created.append(alert)

    risk_score = context.get("risk_score", 0.0)
    if risk_score > 75:
        alert = create_alert(
            tenant_id=tenant_id,
            title=f"Puntuacion de riesgo elevada: {risk_score:.0f}/100",
            body=(
                f"El motor de riesgo ha calculado una puntuacion de {risk_score:.0f} sobre 100, "
                "superando el umbral de alerta alta (75). Se recomienda revision del "
                "perfil de riesgo y activacion de protocolos de contingencia."
            ),
            level=AlertLevel.high,
            category=AlertCategory.risk,
            source="Motor de riesgo",
            workspace_id=context.get("workspace_id", "default"),
            action_required=True,
            action_text="Revisar perfil de riesgo y activar protocolos de contingencia",
            tags=["riesgo", "puntuacion", "umbral"],
        )
        created.append(alert)

    return created


def get_alert_summary(tenant_id: str) -> dict[str, Any]:
    """
    Resumen del estado de alertas para el tenant.

    Devuelve: total, unread, by_level, by_category, has_critical, oldest_unread_hours.
    """
    all_alerts = list(_ALERT_STORE.get(tenant_id, []))
    unread = [a for a in all_alerts if a.read_at is None]

    by_level: dict[str, int] = {level.value: 0 for level in AlertLevel}
    by_category: dict[str, int] = {cat.value: 0 for cat in AlertCategory}

    for alert in all_alerts:
        by_level[alert.level.value] += 1
        by_category[alert.category.value] += 1

    has_critical = any(
        a.level == AlertLevel.critical and a.read_at is None for a in all_alerts
    )

    oldest_unread_hours: float | None = None
    if unread:
        now = datetime.now(timezone.utc)
        oldest = min(unread, key=lambda a: a.created_at)
        oldest_unread_hours = (now - oldest.created_at).total_seconds() / 3600.0

    return {
        "total": len(all_alerts),
        "unread": len(unread),
        "by_level": by_level,
        "by_category": by_category,
        "has_critical": has_critical,
        "oldest_unread_hours": oldest_unread_hours,
    }


def dismiss_old_alerts(tenant_id: str, older_than_days: int = 30) -> int:
    """
    Elimina alertas antiguas de nivel info o low.

    Devuelve el numero de alertas eliminadas.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    original = _ALERT_STORE.get(tenant_id, [])
    dismissable_levels = {AlertLevel.info, AlertLevel.low}
    remaining = [
        a for a in original
        if not (a.level in dismissable_levels and a.created_at < cutoff)
    ]
    removed = len(original) - len(remaining)
    _ALERT_STORE[tenant_id] = remaining
    return removed
