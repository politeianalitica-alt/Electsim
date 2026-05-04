"""
FollowTheMoney mapper — Bloque 4.

Convierte esquemas FollowTheMoney (FtM) a modelos ElectSim (RiskEntity / RiskRelation).

FollowTheMoney es el modelo de datos de OpenSanctions y otros proyectos de periodismo
de investigación. Define entidades tipadas (Person, Company, Organization…) y
propiedades estandarizadas.

Referencia: https://followthemoney.tech/explorer/
           https://github.com/alephdata/followthemoney

NOTA: No requiere que el paquete `followthemoney` esté instalado.
      Parsea el JSON crudo directamente. Si la librería está disponible, puede usarse
      para validación adicional, pero no es obligatoria.
"""
from __future__ import annotations

import logging
from typing import Any

from .schemas import RiskEntity, RiskRelation

logger = logging.getLogger(__name__)

# ── Mapeo de esquemas FtM → entity_type de ElectSim ─────────────────────────

_FTM_SCHEMA_TO_TYPE: dict[str, str] = {
    # Personas
    "Person": "person",
    "LegalEntity": "company",
    "Company": "company",
    "Organization": "organization",
    "PublicBody": "public_body",
    "Asset": "asset",
    "Airplane": "asset",
    "Vessel": "asset",
    "RealEstate": "asset",
    "Vehicle": "asset",
    "CryptoWallet": "asset",
    "BankAccount": "asset",
    "Security": "asset",
    "Passport": "unknown",
    "Email": "unknown",
    "Phone": "unknown",
    "Address": "unknown",
    "Identification": "unknown",
    "UnknownLink": "unknown",
    "Interval": "unknown",
}

# Relaciones FtM → RELATION_TYPE de ElectSim
_FTM_RELATION_MAP: dict[str, str] = {
    "Directorship": "DIRECTORSHIP",
    "Ownership": "OWNERSHIP",
    "Membership": "MEMBERSHIP",
    "Family": "FAMILY",
    "Associate": "ASSOCIATE",
    "Sanction": "SANCTION",
    "Documentation": "ENTITY_RELATED_TO_ENTITY",
    "UnknownLink": "ENTITY_RELATED_TO_ENTITY",
    "Interval": "ENTITY_RELATED_TO_ENTITY",
    "Employment": "PERSON_HELD_POSITION",
    "Representation": "PERSON_HELD_POSITION",
    "Contract": "COMPANY_AWARDED_CONTRACT",
}

# Esquemas que representan relaciones (no entidades)
_FTM_RELATION_SCHEMAS = set(_FTM_RELATION_MAP.keys())

# Propiedades FtM que indican estatus PEP
_PEP_INDICATORS = {"position", "positionPep", "topics"}

# Valores en "topics" que indican sanción o PEP
_SANCTION_TOPICS = {"sanction", "sanctioned", "debarment"}
_PEP_TOPICS = {"pep", "pep-class-1", "pep-class-2", "pep-class-3", "pep-class-4"}

# Esquemas FtM que representan sanciones específicas
_SANCTION_SCHEMAS = {"Sanction"}


def map_ftm_entity(raw: dict[str, Any], source: str = "opensanctions") -> RiskEntity | None:
    """
    Convierte un objeto FtM (dict) en un RiskEntity de ElectSim.

    Args:
        raw: Objeto FtM tal como aparece en el export JSON/JSONL.
             Estructura esperada:
               {"id": "...", "schema": "Person", "properties": {...}, "datasets": [...]}
        source: Identificador de la fuente.

    Returns:
        RiskEntity o None si el esquema no es una entidad (es una relación o inválido).
    """
    schema = raw.get("schema", "")
    if schema in _FTM_RELATION_SCHEMAS:
        return None  # Es una relación, no una entidad

    entity_type = _FTM_SCHEMA_TO_TYPE.get(schema, "unknown")
    props = raw.get("properties", {})

    def _first(key: str) -> str:
        """Retorna el primer valor de una propiedad multi-valor."""
        vals = props.get(key, [])
        return vals[0] if vals else ""

    def _all(key: str) -> list[str]:
        """Retorna todos los valores de una propiedad."""
        return [str(v) for v in props.get(key, [])]

    # Nombre principal
    name_parts = _all("name") or _all("registrationNumber") or [raw.get("id", "")]
    name = name_parts[0] if name_parts else ""
    if not name:
        return None

    # Aliases
    aliases: list[str] = []
    for key in ("alias", "weakAlias", "previousName", "altSpelling", "nameLatin"):
        aliases.extend(_all(key))
    aliases = list({a for a in aliases if a and a != name})

    # Países
    countries: list[str] = []
    for key in ("country", "jurisdiction", "nationality", "registrationNumber"):
        if key in ("country", "nationality", "jurisdiction"):
            countries.extend(_all(key))
    countries = list(set(c.upper()[:2] for c in countries if len(c) >= 2))

    # Identificadores
    identifiers: list[dict] = []
    for id_key in ("idNumber", "registrationNumber", "taxNumber", "innCode", "bikCode", "swiftBic"):
        for val in _all(id_key):
            identifiers.append({"scheme": id_key, "id": val})

    # Fechas
    import datetime as dt

    def _parse_date(s: str) -> dt.date | None:
        if not s:
            return None
        for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
            try:
                return dt.datetime.strptime(s[:len(fmt.replace("%Y", "YYYY").replace("%m", "MM").replace("%d", "DD"))], fmt).date()
            except ValueError:
                continue
        return None

    birth_date = _parse_date(_first("birthDate"))
    inc_date = _parse_date(_first("incorporationDate") or _first("registrationDate"))

    # PEP y sanciones
    topics = set(_all("topics"))
    pep_status = bool(topics & _PEP_TOPICS) or schema == "Person" and bool(_all("position"))
    sanctions_status = bool(topics & _SANCTION_TOPICS) or schema in _SANCTION_SCHEMAS

    # Risk flags iniciales
    risk_flags: list[str] = []
    if sanctions_status:
        risk_flags.append("sanctioned")
    if pep_status:
        risk_flags.append("pep")

    # URL
    source_url = _first("sourceUrl") or _first("wikidataId") or None

    return RiskEntity(
        source=source,
        source_id=raw.get("id", ""),
        entity_type=entity_type,  # type: ignore[arg-type]
        name=name,
        aliases=aliases,
        countries=countries,
        identifiers=identifiers,
        birth_date=birth_date,
        incorporation_date=inc_date,
        pep_status=pep_status,
        sanctions_status=sanctions_status,
        risk_flags=risk_flags,
        confidence=0.85,  # alta confianza para datos FtM
        source_url=source_url,
        raw_payload=raw,
    )


def map_ftm_relation(
    raw: dict[str, Any],
    entity_id_map: dict[str, str],
    source: str = "opensanctions",
) -> RiskRelation | None:
    """
    Convierte una relación FtM en un RiskRelation de ElectSim.

    Args:
        raw: Objeto FtM de tipo relación.
        entity_id_map: Mapeo source_id → id interno de RiskEntity.
        source: Identificador de la fuente.

    Returns:
        RiskRelation o None si no se puede mapear (entidades no encontradas).
    """
    schema = raw.get("schema", "")
    if schema not in _FTM_RELATION_SCHEMAS:
        return None

    props = raw.get("properties", {})
    relation_type = _FTM_RELATION_MAP.get(schema, "ENTITY_RELATED_TO_ENTITY")

    def _first(key: str) -> str:
        vals = props.get(key, [])
        return vals[0] if vals else ""

    # FtM usa "subject" y "object" o nombres específicos según el schema
    role_map = {
        "Directorship": ("director", "organization"),
        "Ownership": ("owner", "asset"),
        "Membership": ("member", "organization"),
        "Family": ("person", "relative"),
        "Associate": ("person", "associate"),
        "Sanction": ("entity", "authority"),
        "Employment": ("employee", "employer"),
        "Contract": ("contractor", "authority"),
    }
    subj_key, obj_key = role_map.get(schema, ("subject", "object"))

    subj_ftm_id = _first(subj_key) or _first("subject")
    obj_ftm_id = _first(obj_key) or _first("object")

    if not subj_ftm_id or not obj_ftm_id:
        return None

    subj_id = entity_id_map.get(subj_ftm_id)
    obj_id = entity_id_map.get(obj_ftm_id)

    if not subj_id or not obj_id:
        logger.debug("FtM relation %s: entidades no encontradas (%s, %s)", raw.get("id"), subj_ftm_id, obj_ftm_id)
        return None

    import datetime as dt

    def _parse_date(s: str) -> dt.date | None:
        if not s:
            return None
        try:
            return dt.date.fromisoformat(s[:10])
        except ValueError:
            return None

    return RiskRelation(
        source=source,
        source_id=raw.get("id", ""),
        subject_entity_id=subj_id,
        object_entity_id=obj_id,
        relation_type=relation_type,
        start_date=_parse_date(props.get("startDate", [""])[0] if props.get("startDate") else ""),
        end_date=_parse_date(props.get("endDate", [""])[0] if props.get("endDate") else ""),
        confidence=0.80,
        evidence=[],
        raw_payload=raw,
    )


def batch_map_ftm(
    objects: list[dict[str, Any]],
    source: str = "opensanctions",
) -> tuple[list[RiskEntity], list[RiskRelation]]:
    """
    Mapea un batch de objetos FtM (mezclados entidades + relaciones).

    Returns:
        (entities, relations)
    """
    entities: list[RiskEntity] = []
    relations_raw: list[dict] = []
    entity_id_map: dict[str, str] = {}

    for obj in objects:
        schema = obj.get("schema", "")
        if schema in _FTM_RELATION_SCHEMAS:
            relations_raw.append(obj)
        else:
            entity = map_ftm_entity(obj, source=source)
            if entity:
                entities.append(entity)
                entity_id_map[obj.get("id", "")] = entity.id

    relations: list[RiskRelation] = []
    for raw_rel in relations_raw:
        rel = map_ftm_relation(raw_rel, entity_id_map, source=source)
        if rel:
            relations.append(rel)

    logger.info(
        "FtM batch: %d entidades, %d relaciones (de %d objetos)",
        len(entities), len(relations), len(objects),
    )
    return entities, relations
