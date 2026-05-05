"""
Actor Graph — ElectSim.

Ontología de actores políticos: entidades ricas con relaciones, atributos dinámicos
y trazabilidad de eventos. Inspirado en el modelo de objetos de Palantir Gotham.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ActorType(str, Enum):
    politician = "politician"
    party = "party"
    institution = "institution"
    media = "media"
    think_tank = "think_tank"
    ngo = "ngo"
    business = "business"
    union = "union"
    international = "international"


class RelationshipType(str, Enum):
    member_of = "member_of"
    allied_with = "allied_with"
    opposed_to = "opposed_to"
    influences = "influences"
    influenced_by = "influenced_by"
    leads = "leads"
    part_of = "part_of"
    competes_with = "competes_with"
    coalition_partner = "coalition_partner"
    former_member = "former_member"
    advisor_to = "advisor_to"
    funded_by = "funded_by"


class ActorStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    monitoring = "monitoring"
    watch_list = "watch_list"


# ---------------------------------------------------------------------------
# Modelos Pydantic v2
# ---------------------------------------------------------------------------

class ActorAttribute(BaseModel):
    key: str
    value: str
    source: str = ""
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    confidence: float = 1.0

    @field_validator("confidence")
    @classmethod
    def _clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, v))


class ActorRelationship(BaseModel):
    id: str = Field(default_factory=lambda: f"rel_{uuid.uuid4().hex[:10]}")
    from_actor_id: str
    to_actor_id: str
    relationship_type: RelationshipType
    weight: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence: str = ""
    since: datetime | None = None
    active: bool = True
    notes: str = ""


class ActorEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:10]}")
    actor_id: str
    event_type: str
    description: str
    date: datetime
    source: str = ""
    impact_score: float = 0.0


class PoliticalActor(BaseModel):
    id: str
    name: str
    aliases: list[str] = Field(default_factory=list)
    actor_type: ActorType
    party_affiliation: str = ""
    status: ActorStatus = ActorStatus.active
    attributes: list[ActorAttribute] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    influence_score: float = Field(default=0.5, ge=0.0, le=1.0)
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    sentiment_score: float = Field(default=0.0, ge=-1.0, le=1.0)
    media_presence: float = Field(default=0.0, ge=0.0)
    tenant_id: str = "demo"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    description: str = ""


# ---------------------------------------------------------------------------
# Almacenes en memoria
# ---------------------------------------------------------------------------

_ACTORS: dict[str, PoliticalActor] = {}
_RELATIONSHIPS: list[ActorRelationship] = []
_EVENTS: dict[str, list[ActorEvent]] = {}

_INITIALIZED = False


def _dt(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day)


def _add_rel(
    from_id: str,
    to_id: str,
    rel_type: RelationshipType,
    weight: float = 1.0,
    since: datetime | None = None,
    notes: str = "",
) -> None:
    _RELATIONSHIPS.append(
        ActorRelationship(
            from_actor_id=from_id,
            to_actor_id=to_id,
            relationship_type=rel_type,
            weight=weight,
            since=since,
            notes=notes,
        )
    )


def _add_event(
    actor_id: str,
    event_type: str,
    description: str,
    date: datetime,
    source: str = "ElectSim Demo",
    impact_score: float = 0.0,
) -> None:
    evt = ActorEvent(
        actor_id=actor_id,
        event_type=event_type,
        description=description,
        date=date,
        source=source,
        impact_score=impact_score,
    )
    _EVENTS.setdefault(actor_id, []).append(evt)


def _init_demo_actors() -> None:
    global _INITIALIZED
    if _INITIALIZED:
        return

    # ---- Actores ----
    actors_raw: list[dict[str, Any]] = [
        {
            "id": "sanchez",
            "name": "Pedro Sánchez",
            "aliases": ["Pedro Sanchez", "PSOE Pedro"],
            "actor_type": ActorType.politician,
            "party_affiliation": "PSOE",
            "influence_score": 0.92,
            "risk_score": 0.45,
            "sentiment_score": -0.28,
            "media_presence": 0.95,
            "description": "Secretario general del PSOE y Presidente del Gobierno desde 2018.",
            "tags": ["gobierno", "izquierda", "presidente"],
        },
        {
            "id": "feijoo",
            "name": "Alberto Núñez Feijóo",
            "aliases": ["Feijoo", "Núñez Feijóo"],
            "actor_type": ActorType.politician,
            "party_affiliation": "PP",
            "influence_score": 0.88,
            "risk_score": 0.30,
            "sentiment_score": 0.12,
            "media_presence": 0.88,
            "description": "Presidente del Partido Popular y líder de la oposición.",
            "tags": ["oposicion", "derecha", "pp"],
        },
        {
            "id": "abascal",
            "name": "Santiago Abascal",
            "aliases": ["Abascal", "VOX Santiago"],
            "actor_type": ActorType.politician,
            "party_affiliation": "VOX",
            "influence_score": 0.74,
            "risk_score": 0.38,
            "sentiment_score": -0.71,
            "media_presence": 0.70,
            "description": "Presidente de VOX, partido de ultraderecha.",
            "tags": ["vox", "ultraderecha", "oposicion"],
        },
        {
            "id": "ydiaz",
            "name": "Yolanda Díaz",
            "aliases": ["Yolanda Diaz", "Díaz Vicepresidenta"],
            "actor_type": ActorType.politician,
            "party_affiliation": "SUMAR",
            "influence_score": 0.71,
            "risk_score": 0.28,
            "sentiment_score": 0.08,
            "media_presence": 0.72,
            "description": "Vicepresidenta segunda y ministra de Trabajo. Lidera SUMAR.",
            "tags": ["gobierno", "izquierda", "trabajo"],
        },
        {
            "id": "puigdemont",
            "name": "Carles Puigdemont",
            "aliases": ["Puigdemont", "expresident"],
            "actor_type": ActorType.politician,
            "party_affiliation": "JUNTS",
            "influence_score": 0.68,
            "risk_score": 0.75,
            "sentiment_score": -0.52,
            "media_presence": 0.65,
            "description": "Expresident de la Generalitat de Catalunya en el exilio.",
            "tags": ["independentismo", "junts", "exilio"],
        },
        {
            "id": "ribera",
            "name": "Teresa Ribera",
            "aliases": ["Ribera", "Teresa Ribera Rodriguez"],
            "actor_type": ActorType.politician,
            "party_affiliation": "PSOE",
            "influence_score": 0.61,
            "risk_score": 0.22,
            "sentiment_score": 0.15,
            "media_presence": 0.55,
            "description": "Ministra para la Transición Ecológica. Vicepresidenta tercera.",
            "tags": ["gobierno", "medioambiente", "psoe"],
        },
        {
            "id": "ayuso",
            "name": "Isabel Díaz Ayuso",
            "aliases": ["Ayuso", "Díaz Ayuso"],
            "actor_type": ActorType.politician,
            "party_affiliation": "PP",
            "influence_score": 0.76,
            "risk_score": 0.35,
            "sentiment_score": 0.05,
            "media_presence": 0.85,
            "description": "Presidenta de la Comunidad de Madrid. Figura destacada del PP.",
            "tags": ["madrid", "pp", "autonomia"],
        },
        {
            "id": "illa",
            "name": "Salvador Illa",
            "aliases": ["Illa", "Salvador Illa Roca"],
            "actor_type": ActorType.politician,
            "party_affiliation": "PSC",
            "influence_score": 0.58,
            "risk_score": 0.20,
            "sentiment_score": 0.18,
            "media_presence": 0.52,
            "description": "Presidente de la Generalitat de Catalunya por el PSC.",
            "tags": ["cataluna", "psc", "socialismo"],
        },
        {
            "id": "psoe",
            "name": "PSOE",
            "aliases": ["Partido Socialista Obrero Español", "Socialistas"],
            "actor_type": ActorType.party,
            "influence_score": 0.90,
            "risk_score": 0.30,
            "sentiment_score": -0.10,
            "media_presence": 0.88,
            "description": "Partido Socialista Obrero Español. Partido en el gobierno.",
            "tags": ["gobierno", "izquierda", "socialismo"],
        },
        {
            "id": "pp",
            "name": "PP",
            "aliases": ["Partido Popular", "Populares"],
            "actor_type": ActorType.party,
            "influence_score": 0.87,
            "risk_score": 0.25,
            "sentiment_score": 0.10,
            "media_presence": 0.85,
            "description": "Partido Popular. Principal partido de la oposición.",
            "tags": ["oposicion", "derecha", "centro-derecha"],
        },
        {
            "id": "vox",
            "name": "VOX",
            "aliases": ["Vox partido", "Vox España"],
            "actor_type": ActorType.party,
            "influence_score": 0.72,
            "risk_score": 0.40,
            "sentiment_score": -0.60,
            "media_presence": 0.70,
            "description": "VOX. Partido de ultraderecha, tercera fuerza parlamentaria.",
            "tags": ["ultraderecha", "oposicion"],
        },
        {
            "id": "sumar",
            "name": "SUMAR",
            "aliases": ["Sumar coalicion", "Plataforma Sumar"],
            "actor_type": ActorType.party,
            "influence_score": 0.65,
            "risk_score": 0.22,
            "sentiment_score": 0.05,
            "media_presence": 0.60,
            "description": "SUMAR. Coalición de izquierdas liderada por Yolanda Díaz.",
            "tags": ["gobierno", "izquierda", "coalicion"],
        },
        {
            "id": "junts",
            "name": "JUNTS",
            "aliases": ["Junts per Catalunya", "Junts"],
            "actor_type": ActorType.party,
            "influence_score": 0.60,
            "risk_score": 0.65,
            "sentiment_score": -0.40,
            "media_presence": 0.55,
            "description": "Junts per Catalunya. Partido independentista catalán.",
            "tags": ["independentismo", "cataluna"],
        },
        {
            "id": "congreso",
            "name": "Congreso de los Diputados",
            "aliases": ["Congreso", "Cámara Baja", "Parlamento"],
            "actor_type": ActorType.institution,
            "influence_score": 0.95,
            "risk_score": 0.05,
            "sentiment_score": 0.0,
            "media_presence": 0.80,
            "description": "Cámara baja del Parlamento español. 350 diputados.",
            "tags": ["institucion", "parlamento", "legislativo"],
        },
        {
            "id": "gobierno",
            "name": "Gobierno de España",
            "aliases": ["Gobierno", "Ejecutivo", "Moncloa"],
            "actor_type": ActorType.institution,
            "influence_score": 0.97,
            "risk_score": 0.10,
            "sentiment_score": -0.05,
            "media_presence": 0.92,
            "description": "Poder ejecutivo del Estado español. Presidido por Pedro Sánchez.",
            "tags": ["institucion", "ejecutivo", "estado"],
        },
    ]

    for raw in actors_raw:
        actor = PoliticalActor(**raw)
        _ACTORS[actor.id] = actor
        _EVENTS[actor.id] = []

    # ---- Relaciones ----
    _add_rel("sanchez", "gobierno", RelationshipType.leads, weight=1.0, since=_dt(2018, 6, 1))
    _add_rel("sanchez", "psoe", RelationshipType.member_of, weight=1.0, since=_dt(2014, 7, 1))
    _add_rel("feijoo", "pp", RelationshipType.leads, weight=1.0, since=_dt(2022, 4, 2))
    _add_rel("feijoo", "pp", RelationshipType.member_of, weight=1.0, since=_dt(1990, 1, 1))
    _add_rel("abascal", "vox", RelationshipType.leads, weight=1.0, since=_dt(2013, 12, 17))
    _add_rel("abascal", "vox", RelationshipType.member_of, weight=1.0, since=_dt(2013, 12, 17))
    _add_rel("ydiaz", "sumar", RelationshipType.leads, weight=1.0, since=_dt(2022, 7, 2))
    _add_rel("sumar", "psoe", RelationshipType.allied_with, weight=0.6, notes="Coalicion de gobierno")
    _add_rel("pp", "vox", RelationshipType.competes_with, weight=0.8, notes="Competencia electoral derecha")
    _add_rel("psoe", "pp", RelationshipType.opposed_to, weight=0.9, notes="Oposicion principal")
    _add_rel("puigdemont", "junts", RelationshipType.leads, weight=1.0, since=_dt(2018, 3, 1))
    _add_rel("ribera", "psoe", RelationshipType.member_of, weight=1.0)
    _add_rel("ayuso", "pp", RelationshipType.member_of, weight=1.0, since=_dt(1999, 1, 1))
    _add_rel("feijoo", "abascal", RelationshipType.competes_with, weight=0.5, notes="Competencia por voto derecha")
    _add_rel("illa", "psoe", RelationshipType.allied_with, weight=0.85, notes="PSC aliado del PSOE")
    _add_rel("junts", "psoe", RelationshipType.influenced_by, weight=0.4, notes="Dependencia parlamentaria")
    _add_rel("sanchez", "congreso", RelationshipType.part_of, weight=0.8)

    # ---- Eventos ----
    # Pedro Sánchez
    _add_event("sanchez", "investidura", "Elegido Presidente del Gobierno mediante moción de censura", _dt(2018, 6, 1), impact_score=0.95)
    _add_event("sanchez", "confianza", "Ganó segunda cuestión de confianza en el Congreso", _dt(2022, 10, 5), impact_score=0.70)
    _add_event("sanchez", "reforma_fiscal", "Anunció reforma fiscal progresiva para 2024", _dt(2023, 5, 22), impact_score=0.55)
    _add_event("sanchez", "investidura_2023", "Re-investido Presidente tras acuerdo con SUMAR y partidos minoritarios", _dt(2023, 11, 16), impact_score=0.90)

    # Alberto Núñez Feijóo
    _add_event("feijoo", "investidura_fallida", "Perdió la investidura en el Congreso sin mayoría suficiente", _dt(2023, 9, 29), impact_score=-0.75)
    _add_event("feijoo", "elecciones_autonómicas", "El PP ganó las elecciones autonómicas en varias CC.AA.", _dt(2023, 5, 28), impact_score=0.80)
    _add_event("feijoo", "congreso_pp", "Aprobó el manifiesto del PP en el congreso nacional del partido", _dt(2022, 4, 2), impact_score=0.60)

    # Santiago Abascal
    _add_event("abascal", "elecciones_2019", "VOX obtuvo representación en el Congreso por primera vez: 24 escaños", _dt(2019, 4, 28), impact_score=0.85)
    _add_event("abascal", "elecciones_2023", "VOX redujo su representación a 33 escaños en las elecciones generales", _dt(2023, 7, 23), impact_score=-0.40)
    _add_event("abascal", "mocion_censura_vox", "VOX presentó una moción de censura contra el gobierno de Sánchez", _dt(2023, 3, 22), impact_score=0.20)

    # Yolanda Díaz
    _add_event("ydiaz", "reforma_laboral", "Impulsó y aprobó la reforma laboral, reduciendo la temporalidad", _dt(2021, 12, 23), impact_score=0.90)
    _add_event("ydiaz", "lanzamiento_sumar", "Lanzó SUMAR como plataforma de confluencia de izquierdas", _dt(2022, 7, 2), impact_score=0.75)
    _add_event("ydiaz", "elecciones_2023", "SUMAR obtuvo 31 escaños, integrándose en el gobierno de coalición", _dt(2023, 7, 23), impact_score=0.55)

    # Carles Puigdemont
    _add_event("puigdemont", "exilio", "Huyó a Bélgica tras el referéndum de independencia del 1-O", _dt(2017, 10, 30), impact_score=-0.90)
    _add_event("puigdemont", "acuerdo_investidura", "Llegó a un acuerdo con el PSOE para apoyar la investidura de Sánchez", _dt(2023, 11, 9), impact_score=0.80)
    _add_event("puigdemont", "ley_amnistia", "El Congreso aprobó la ley de amnistía que le beneficia", _dt(2024, 5, 30), impact_score=0.85)

    _INITIALIZED = True


# Inicialización al importar
_init_demo_actors()


# ---------------------------------------------------------------------------
# Funciones principales
# ---------------------------------------------------------------------------

def get_actor(actor_id: str) -> PoliticalActor | None:
    """Devuelve un actor por su ID, o None si no existe."""
    return _ACTORS.get(actor_id)


def search_actors(
    query: str,
    actor_type: ActorType | None = None,
) -> list[PoliticalActor]:
    """Busca actores por nombre o alias. Filtro opcional por tipo."""
    q = query.lower().strip()
    results: list[PoliticalActor] = []
    for actor in _ACTORS.values():
        if actor_type is not None and actor.actor_type != actor_type:
            continue
        if q in actor.name.lower() or any(q in alias.lower() for alias in actor.aliases):
            results.append(actor)
    return sorted(results, key=lambda a: a.influence_score, reverse=True)


def get_actor_relationships(
    actor_id: str,
    direction: str = "both",
) -> list[ActorRelationship]:
    """
    Devuelve las relaciones de un actor.
    direction: 'out' (origen), 'in' (destino), 'both'.
    """
    rels: list[ActorRelationship] = []
    for rel in _RELATIONSHIPS:
        if direction in ("out", "both") and rel.from_actor_id == actor_id:
            rels.append(rel)
        elif direction == "in" and rel.to_actor_id == actor_id:
            rels.append(rel)
        elif direction == "both" and rel.to_actor_id == actor_id and rel.from_actor_id != actor_id:
            rels.append(rel)
    return rels


def get_actor_network(actor_id: str, depth: int = 2) -> dict:
    """
    Devuelve la red del actor hasta profundidad depth (max 2).
    Formato: {center_actor, nodes, edges, depths}
    """
    depth = min(depth, 2)
    center = get_actor(actor_id)
    if center is None:
        return {"center_actor": None, "nodes": [], "edges": [], "depths": {}}

    visited: dict[str, int] = {actor_id: 0}
    queue: list[tuple[str, int]] = [(actor_id, 0)]
    edge_set: set[tuple[str, str]] = set()
    edges_out: list[dict] = []

    while queue:
        current_id, current_depth = queue.pop(0)
        if current_depth >= depth:
            continue
        for rel in _RELATIONSHIPS:
            neighbor_id: str | None = None
            if rel.from_actor_id == current_id:
                neighbor_id = rel.to_actor_id
            elif rel.to_actor_id == current_id:
                neighbor_id = rel.from_actor_id

            if neighbor_id is None or neighbor_id not in _ACTORS:
                continue

            edge_key = (min(rel.from_actor_id, rel.to_actor_id), max(rel.from_actor_id, rel.to_actor_id))
            if edge_key not in edge_set:
                edge_set.add(edge_key)
                edges_out.append({
                    "from": rel.from_actor_id,
                    "to": rel.to_actor_id,
                    "type": rel.relationship_type.value,
                    "weight": rel.weight,
                })

            if neighbor_id not in visited:
                visited[neighbor_id] = current_depth + 1
                queue.append((neighbor_id, current_depth + 1))

    nodes: list[dict] = []
    for nid, ndepth in visited.items():
        actor = _ACTORS.get(nid)
        if actor is None:
            continue
        nodes.append({
            "id": nid,
            "name": actor.name,
            "type": actor.actor_type.value,
            "influence": actor.influence_score,
            "sentiment": actor.sentiment_score,
            "party": actor.party_affiliation,
            "depth": ndepth,
        })

    return {
        "center_actor": {
            "id": center.id,
            "name": center.name,
            "type": center.actor_type.value,
        },
        "nodes": nodes,
        "edges": edges_out,
        "depths": visited,
    }


def add_actor_event(
    actor_id: str,
    event_type: str,
    description: str,
    source: str,
    impact_score: float,
) -> ActorEvent:
    """Registra un evento para un actor."""
    evt = ActorEvent(
        actor_id=actor_id,
        event_type=event_type,
        description=description,
        date=datetime.utcnow(),
        source=source,
        impact_score=impact_score,
    )
    _EVENTS.setdefault(actor_id, []).append(evt)
    return evt


def update_actor_scores(
    actor_id: str,
    influence: float | None = None,
    sentiment: float | None = None,
    media_presence: float | None = None,
) -> bool:
    """Actualiza las puntuaciones de un actor. Devuelve False si no existe."""
    actor = _ACTORS.get(actor_id)
    if actor is None:
        return False
    if influence is not None:
        actor.influence_score = max(0.0, min(1.0, influence))
    if sentiment is not None:
        actor.sentiment_score = max(-1.0, min(1.0, sentiment))
    if media_presence is not None:
        actor.media_presence = max(0.0, media_presence)
    actor.updated_at = datetime.utcnow()
    return True


def get_top_actors_by_influence(
    n: int = 10,
    actor_type: ActorType | None = None,
) -> list[PoliticalActor]:
    """Devuelve los N actores con mayor puntuación de influencia."""
    actors = list(_ACTORS.values())
    if actor_type is not None:
        actors = [a for a in actors if a.actor_type == actor_type]
    return sorted(actors, key=lambda a: a.influence_score, reverse=True)[:n]


def get_relationship_matrix(actor_ids: list[str]) -> dict:
    """
    Devuelve una matriz de adyacencia para los actor_ids dados.
    Formato: {from_id: {to_id: {"type": rel_type, "weight": weight}}}
    """
    id_set = set(actor_ids)
    matrix: dict[str, dict[str, dict]] = {aid: {} for aid in actor_ids}
    for rel in _RELATIONSHIPS:
        if rel.from_actor_id in id_set and rel.to_actor_id in id_set:
            matrix[rel.from_actor_id][rel.to_actor_id] = {
                "type": rel.relationship_type.value,
                "weight": rel.weight,
            }
    return matrix


def list_all_actors(tenant_id: str = "demo") -> list[PoliticalActor]:
    """Lista todos los actores de un tenant."""
    return [a for a in _ACTORS.values() if a.tenant_id == tenant_id]


def get_actor_events(actor_id: str, limit: int = 10) -> list[ActorEvent]:
    """Devuelve los eventos recientes de un actor."""
    events = _EVENTS.get(actor_id, [])
    return sorted(events, key=lambda e: e.date, reverse=True)[:limit]


def get_actor_summary(actor_id: str) -> dict:
    """
    Devuelve un resumen completo del actor: campos base + conteo de relaciones
    + eventos recientes + partidos conectados.
    """
    actor = get_actor(actor_id)
    if actor is None:
        return {}

    rels = get_actor_relationships(actor_id, direction="both")
    events = get_actor_events(actor_id, limit=5)

    connected_parties: set[str] = set()
    for rel in rels:
        other_id = rel.to_actor_id if rel.from_actor_id == actor_id else rel.from_actor_id
        other = get_actor(other_id)
        if other and other.actor_type == ActorType.party:
            connected_parties.add(other.name)
        if other and other.party_affiliation:
            connected_parties.add(other.party_affiliation)

    return {
        "id": actor.id,
        "name": actor.name,
        "aliases": actor.aliases,
        "actor_type": actor.actor_type.value,
        "party_affiliation": actor.party_affiliation,
        "status": actor.status.value,
        "influence_score": actor.influence_score,
        "risk_score": actor.risk_score,
        "sentiment_score": actor.sentiment_score,
        "media_presence": actor.media_presence,
        "tags": actor.tags,
        "description": actor.description,
        "tenant_id": actor.tenant_id,
        "created_at": actor.created_at.isoformat(),
        "updated_at": actor.updated_at.isoformat(),
        "relationship_count": len(rels),
        "recent_events": [
            {
                "event_type": e.event_type,
                "description": e.description,
                "date": e.date.isoformat(),
                "impact_score": e.impact_score,
            }
            for e in events
        ],
        "connected_parties": sorted(connected_parties),
    }
