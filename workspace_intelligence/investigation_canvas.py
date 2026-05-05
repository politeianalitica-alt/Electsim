"""
Investigation Canvas — ElectSim.

Canvas de investigación tipo Gotham: objetos, conexiones, hipótesis y líneas de tiempo.
Cada canvas es un espacio de investigación colaborativo para un workspace.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class CanvasObjectType(str, Enum):
    actor = "actor"
    event = "event"
    document = "document"
    alert = "alert"
    narrative = "narrative"
    location = "location"
    organization = "organization"
    unknown = "unknown"


class ConnectionType(str, Enum):
    connected_to = "connected_to"
    caused_by = "caused_by"
    part_of = "part_of"
    contradicts = "contradicts"
    supports = "supports"
    unknown = "unknown"


class EvidenceStrength(str, Enum):
    confirmed = "confirmed"
    probable = "probable"
    possible = "possible"
    disputed = "disputed"
    unknown = "unknown"


# ── Models ────────────────────────────────────────────────────────────────────

class CanvasObject(BaseModel):
    id: str
    canvas_id: str
    object_type: CanvasObjectType
    title: str
    description: str = ""
    source_ref: str = ""
    tags: list[str] = Field(default_factory=list)
    evidence_strength: EvidenceStrength = EvidenceStrength.possible
    x_pos: float = 0.0
    y_pos: float = 0.0
    created_at: datetime
    created_by: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class CanvasConnection(BaseModel):
    id: str
    canvas_id: str
    from_object_id: str
    to_object_id: str
    connection_type: ConnectionType
    label: str = ""
    weight: float = 0.5
    notes: str = ""
    created_at: datetime


class InvestigationHypothesis(BaseModel):
    id: str
    canvas_id: str
    title: str
    description: str
    confidence: float = 0.5
    supporting_object_ids: list[str] = Field(default_factory=list)
    status: str = "open"  # open / confirmed / refuted


class InvestigationCanvas(BaseModel):
    id: str
    workspace_id: str
    tenant_id: str
    title: str
    description: str = ""
    created_at: datetime
    updated_at: datetime
    created_by: str = ""
    objects: list[CanvasObject] = Field(default_factory=list)
    connections: list[CanvasConnection] = Field(default_factory=list)
    hypotheses: list[InvestigationHypothesis] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


# ── Store ─────────────────────────────────────────────────────────────────────

_CANVASES: dict[str, InvestigationCanvas] = {}


# ── Demo seed ─────────────────────────────────────────────────────────────────

def _init_demo_canvas() -> None:
    """Crea un canvas de demostración si el store está vacío."""
    now = datetime(2026, 5, 5, 10, 0, 0)
    canvas_id = "canvas_demo_mocion_2026"

    # Objetos
    obj_sanchez = CanvasObject(
        id="obj_sanchez",
        canvas_id=canvas_id,
        object_type=CanvasObjectType.actor,
        title="Pedro Sánchez",
        description="Presidente del Gobierno en funciones.",
        source_ref="actor_pedro_sanchez",
        tags=["psoe", "gobierno"],
        evidence_strength=EvidenceStrength.confirmed,
        x_pos=100.0,
        y_pos=200.0,
        created_at=now,
        created_by="sistema",
    )
    obj_feijoo = CanvasObject(
        id="obj_feijoo",
        canvas_id=canvas_id,
        object_type=CanvasObjectType.actor,
        title="Alberto Feijóo",
        description="Líder del Partido Popular, promotor de la moción.",
        source_ref="actor_alberto_feijoo",
        tags=["pp", "oposicion"],
        evidence_strength=EvidenceStrength.confirmed,
        x_pos=400.0,
        y_pos=100.0,
        created_at=now,
        created_by="sistema",
    )
    obj_mocion = CanvasObject(
        id="obj_mocion",
        canvas_id=canvas_id,
        object_type=CanvasObjectType.event,
        title="Moción de Censura",
        description="Presentación formal de moción de censura constructiva en el Congreso.",
        source_ref="event_mocion_2026",
        tags=["congreso", "mocion"],
        evidence_strength=EvidenceStrength.confirmed,
        x_pos=250.0,
        y_pos=300.0,
        created_at=now,
        created_by="sistema",
    )
    obj_congreso = CanvasObject(
        id="obj_congreso",
        canvas_id=canvas_id,
        object_type=CanvasObjectType.location,
        title="Congreso de los Diputados",
        description="Cámara legislativa donde se debate la moción.",
        source_ref="loc_congreso_diputados",
        tags=["institucional"],
        evidence_strength=EvidenceStrength.confirmed,
        x_pos=250.0,
        y_pos=500.0,
        created_at=now,
        created_by="sistema",
    )
    obj_acuerdo = CanvasObject(
        id="obj_acuerdo_pp_vox",
        canvas_id=canvas_id,
        object_type=CanvasObjectType.document,
        title="Acuerdo PP-VOX",
        description="Documento de acuerdo programático entre PP y VOX para investidura.",
        source_ref="doc_acuerdo_pp_vox_2026",
        tags=["pp", "vox", "pacto"],
        evidence_strength=EvidenceStrength.disputed,
        x_pos=500.0,
        y_pos=300.0,
        created_at=now,
        created_by="sistema",
    )
    obj_narrativa = CanvasObject(
        id="obj_narrativa_debil",
        canvas_id=canvas_id,
        object_type=CanvasObjectType.narrative,
        title='Narrativa "Gobierno débil"',
        description="Encuadre mediático que presenta al ejecutivo como incapaz de gobernar en minoría.",
        source_ref="narrative_gobierno_debil",
        tags=["medios", "narrativa", "pp"],
        evidence_strength=EvidenceStrength.probable,
        x_pos=600.0,
        y_pos=150.0,
        created_at=now,
        created_by="sistema",
    )

    # Conexiones
    conn1 = CanvasConnection(
        id="conn_feijoo_mocion",
        canvas_id=canvas_id,
        from_object_id="obj_feijoo",
        to_object_id="obj_mocion",
        connection_type=ConnectionType.caused_by,
        label="Promotor principal",
        weight=0.9,
        created_at=now,
    )
    conn2 = CanvasConnection(
        id="conn_abascal_mocion",
        canvas_id=canvas_id,
        from_object_id="obj_acuerdo_pp_vox",
        to_object_id="obj_mocion",
        connection_type=ConnectionType.connected_to,
        label="Respaldo condicionado",
        weight=0.6,
        created_at=now,
    )
    conn3 = CanvasConnection(
        id="conn_mocion_sanchez",
        canvas_id=canvas_id,
        from_object_id="obj_mocion",
        to_object_id="obj_sanchez",
        connection_type=ConnectionType.part_of,
        label="Afecta directamente",
        weight=1.0,
        created_at=now,
    )
    conn4 = CanvasConnection(
        id="conn_narrativa_mocion",
        canvas_id=canvas_id,
        from_object_id="obj_narrativa_debil",
        to_object_id="obj_mocion",
        connection_type=ConnectionType.supports,
        label="Justificación narrativa",
        weight=0.7,
        created_at=now,
    )

    # Hipótesis
    hyp1 = InvestigationHypothesis(
        id="hyp_investidura_octubre",
        canvas_id=canvas_id,
        title="PP buscará investidura en octubre",
        description=(
            "Si la moción prospera, el PP intentará formar gobierno antes del cierre "
            "del año parlamentario, aprovechando la ventana de octubre."
        ),
        confidence=0.65,
        supporting_object_ids=["obj_feijoo", "obj_mocion", "obj_acuerdo_pp_vox"],
        status="open",
    )
    hyp2 = InvestigationHypothesis(
        id="hyp_vox_palanca",
        canvas_id=canvas_id,
        title="VOX apoyará moción como palanca negociadora",
        description=(
            "VOX usará su apoyo a la moción como moneda de cambio para obtener "
            "concesiones programáticas del PP en inmigración y educación."
        ),
        confidence=0.45,
        supporting_object_ids=["obj_acuerdo_pp_vox", "obj_mocion"],
        status="open",
    )

    canvas = InvestigationCanvas(
        id=canvas_id,
        workspace_id="ws_espana_2026",
        tenant_id="tenant_politeia",
        title="Análisis Moción de Censura 2026",
        description=(
            "Canvas de análisis sobre la moción de censura presentada por el PP "
            "y sus implicaciones para el escenario político español."
        ),
        created_at=now,
        updated_at=now,
        created_by="sistema",
        objects=[obj_sanchez, obj_feijoo, obj_mocion, obj_congreso, obj_acuerdo, obj_narrativa],
        connections=[conn1, conn2, conn3, conn4],
        hypotheses=[hyp1, hyp2],
        tags=["mocion", "pp", "psoe", "2026"],
    )
    _CANVASES[canvas_id] = canvas


_init_demo_canvas()


# ── CRUD functions ────────────────────────────────────────────────────────────

def create_canvas(
    workspace_id: str,
    tenant_id: str,
    title: str,
    description: str = "",
    created_by: str = "",
) -> InvestigationCanvas:
    """Crea un nuevo canvas de investigación."""
    now = datetime.utcnow()
    canvas = InvestigationCanvas(
        id=f"canvas_{uuid.uuid4().hex[:12]}",
        workspace_id=workspace_id,
        tenant_id=tenant_id,
        title=title,
        description=description,
        created_at=now,
        updated_at=now,
        created_by=created_by,
    )
    _CANVASES[canvas.id] = canvas
    return canvas


def get_canvas(canvas_id: str) -> InvestigationCanvas | None:
    """Devuelve un canvas por id o None si no existe."""
    return _CANVASES.get(canvas_id)


def list_canvases(workspace_id: str, tenant_id: str) -> list[InvestigationCanvas]:
    """Lista todos los canvases de un workspace/tenant."""
    return [
        c for c in _CANVASES.values()
        if c.workspace_id == workspace_id and c.tenant_id == tenant_id
    ]


def add_object(
    canvas_id: str,
    object_type: CanvasObjectType,
    title: str,
    description: str = "",
    source_ref: str = "",
    tags: list[str] | None = None,
    evidence_strength: EvidenceStrength = EvidenceStrength.possible,
    created_by: str = "",
) -> CanvasObject:
    """Añade un objeto al canvas y devuelve el objeto creado."""
    canvas = _CANVASES[canvas_id]
    obj = CanvasObject(
        id=f"obj_{uuid.uuid4().hex[:12]}",
        canvas_id=canvas_id,
        object_type=object_type,
        title=title,
        description=description,
        source_ref=source_ref,
        tags=tags or [],
        evidence_strength=evidence_strength,
        created_at=datetime.utcnow(),
        created_by=created_by,
    )
    canvas.objects.append(obj)
    canvas.updated_at = datetime.utcnow()
    return obj


def add_connection(
    canvas_id: str,
    from_object_id: str,
    to_object_id: str,
    connection_type: ConnectionType,
    label: str = "",
    notes: str = "",
) -> CanvasConnection:
    """Añade una conexión entre dos objetos del canvas."""
    canvas = _CANVASES[canvas_id]
    conn = CanvasConnection(
        id=f"conn_{uuid.uuid4().hex[:12]}",
        canvas_id=canvas_id,
        from_object_id=from_object_id,
        to_object_id=to_object_id,
        connection_type=connection_type,
        label=label,
        notes=notes,
        created_at=datetime.utcnow(),
    )
    canvas.connections.append(conn)
    canvas.updated_at = datetime.utcnow()
    return conn


def add_hypothesis(
    canvas_id: str,
    title: str,
    description: str,
    confidence: float = 0.5,
    supporting_ids: list[str] | None = None,
) -> InvestigationHypothesis:
    """Añade una hipótesis al canvas."""
    canvas = _CANVASES[canvas_id]
    hyp = InvestigationHypothesis(
        id=f"hyp_{uuid.uuid4().hex[:12]}",
        canvas_id=canvas_id,
        title=title,
        description=description,
        confidence=confidence,
        supporting_object_ids=supporting_ids or [],
    )
    canvas.hypotheses.append(hyp)
    canvas.updated_at = datetime.utcnow()
    return hyp


def update_hypothesis_status(canvas_id: str, hypothesis_id: str, status: str) -> bool:
    """Actualiza el estado de una hipótesis. Devuelve True si se actualizó."""
    canvas = _CANVASES.get(canvas_id)
    if canvas is None:
        return False
    for hyp in canvas.hypotheses:
        if hyp.id == hypothesis_id:
            hyp.status = status
            canvas.updated_at = datetime.utcnow()
            return True
    return False


def remove_object(canvas_id: str, object_id: str) -> bool:
    """Elimina un objeto y todas las conexiones que lo referencian."""
    canvas = _CANVASES.get(canvas_id)
    if canvas is None:
        return False
    original_count = len(canvas.objects)
    canvas.objects = [o for o in canvas.objects if o.id != object_id]
    if len(canvas.objects) == original_count:
        return False
    # Eliminar conexiones asociadas
    canvas.connections = [
        c for c in canvas.connections
        if c.from_object_id != object_id and c.to_object_id != object_id
    ]
    canvas.updated_at = datetime.utcnow()
    return True


def get_canvas_summary(canvas_id: str) -> dict[str, Any]:
    """Devuelve un resumen estadístico del canvas."""
    canvas = _CANVASES.get(canvas_id)
    if canvas is None:
        return {}

    by_type: dict[str, int] = {}
    for obj in canvas.objects:
        by_type[obj.object_type.value] = by_type.get(obj.object_type.value, 0) + 1

    confirmed_hypotheses = sum(1 for h in canvas.hypotheses if h.status == "confirmed")
    open_hypotheses = sum(1 for h in canvas.hypotheses if h.status == "open")

    return {
        "title": canvas.title,
        "object_count": len(canvas.objects),
        "connection_count": len(canvas.connections),
        "hypothesis_count": len(canvas.hypotheses),
        "by_type": by_type,
        "confirmed_hypotheses": confirmed_hypotheses,
        "open_hypotheses": open_hypotheses,
    }


def export_canvas_as_text(canvas_id: str) -> str:
    """Exporta el canvas a texto legible para análisis LLM."""
    canvas = _CANVASES.get(canvas_id)
    if canvas is None:
        return ""

    lines: list[str] = []
    lines.append(f"CANVAS DE INVESTIGACIÓN: {canvas.title}")
    lines.append(f"Descripción: {canvas.description}")
    lines.append(f"Creado: {canvas.created_at.strftime('%Y-%m-%d %H:%M')}")
    lines.append("")

    lines.append("== OBJETOS ==")
    for obj in canvas.objects:
        lines.append(
            f"[{obj.object_type.value.upper()}] {obj.title} "
            f"(evidencia: {obj.evidence_strength.value})"
        )
        if obj.description:
            lines.append(f"  {obj.description}")
        if obj.source_ref:
            lines.append(f"  Referencia: {obj.source_ref}")
    lines.append("")

    lines.append("== CONEXIONES ==")
    obj_map = {o.id: o.title for o in canvas.objects}
    for conn in canvas.connections:
        from_title = obj_map.get(conn.from_object_id, conn.from_object_id)
        to_title = obj_map.get(conn.to_object_id, conn.to_object_id)
        label_part = f" ({conn.label})" if conn.label else ""
        lines.append(
            f"  {from_title} --[{conn.connection_type.value}]--> {to_title}{label_part}"
        )
    lines.append("")

    lines.append("== HIPÓTESIS ==")
    for hyp in canvas.hypotheses:
        lines.append(
            f"[{hyp.status.upper()}] {hyp.title} (confianza: {hyp.confidence:.0%})"
        )
        lines.append(f"  {hyp.description}")
        if hyp.supporting_object_ids:
            support_titles = [obj_map.get(oid, oid) for oid in hyp.supporting_object_ids]
            lines.append(f"  Apoyada por: {', '.join(support_titles)}")
    lines.append("")

    return "\n".join(lines)
