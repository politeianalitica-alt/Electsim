"""
OpenSanctions Adapter — Bloque 4.

Importa exports de OpenSanctions (JSON / JSONL / NDJSON) y los convierte
a entidades ElectSim (RiskEntity, RiskRelation, RiskFlag).

NOTA LEGAL:
  OpenSanctions publica su código bajo licencia MIT, pero los DATOS agregados
  tienen su propio régimen de licencias que incluye restricciones de uso comercial
  para ciertos conjuntos de datos. Revisa siempre:
    https://www.opensanctions.org/licensing/
  antes de usar en un contexto comercial. Para uso no comercial / investigación
  los datos están disponibles gratuitamente.

Uso:
    from etl.sources.osint.opensanctions_adapter import load_opensanctions_file

    entities, relations, flags = load_opensanctions_file("data/raw/entities.ftm.json")

No descarga automáticamente datos. El archivo debe estar disponible localmente
o a través de la API si se configura OPENSANCTIONS_API_KEY.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Iterator

from .followthemoney_mapper import batch_map_ftm
from .schemas import RiskEntity, RiskFlag, RiskRelation

logger = logging.getLogger(__name__)

# Jurisdicciones de alto riesgo (FATF high-risk / monitorized, EU high-risk third countries)
# Lista conservadora — se puede ampliar vía config
_HIGH_RISK_JURISDICTIONS = {
    "AF", "IR", "KP", "MM", "SY", "YE",         # FATF black list
    "AL", "BB", "BF", "CM", "CD", "GI", "HT",    # FATF grey list
    "JM", "ML", "MZ", "NG", "PA", "PH", "SN",
    "SS", "TZ", "TT", "UG", "AE", "VN",
    # EU high-risk
    "RU", "BY", "VE", "CU",
}


def _iter_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    """Itera línea a línea un archivo JSONL/NDJSON."""
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                logger.debug("JSONL parse error en %s: %s", path.name, exc)


def _iter_json_array(path: Path) -> Iterator[dict[str, Any]]:
    """Itera un archivo JSON que contiene un array de objetos."""
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, list):
        yield from data
    elif isinstance(data, dict):
        # Formato con wrapper {"entities": [...]}
        for key in ("entities", "results", "data", "items"):
            if key in data and isinstance(data[key], list):
                yield from data[key]
                return
        yield data


def _load_objects(path: Path) -> list[dict[str, Any]]:
    """Detecta formato y carga todos los objetos FtM del archivo."""
    suffix = path.suffix.lower()
    try:
        if suffix in {".jsonl", ".ndjson"}:
            return list(_iter_jsonl(path))
        elif suffix == ".json":
            # Intentar array primero, luego JSONL
            try:
                return list(_iter_json_array(path))
            except (json.JSONDecodeError, ValueError):
                return list(_iter_jsonl(path))
        else:
            # Intentar JSONL por defecto
            try:
                return list(_iter_jsonl(path))
            except Exception:
                return list(_iter_json_array(path))
    except Exception as exc:
        logger.error("Error cargando %s: %s", path, exc)
        return []


def detect_risk_flags(entity: RiskEntity, raw: dict[str, Any]) -> list[RiskFlag]:
    """
    Detecta RiskFlag iniciales para una entidad.

    Reglas:
      sanctioned      — en dataset de sanciones
      pep             — indicadores PEP en metadata
      jurisdiction_risk — países de alto riesgo
      ownership_opacity — muchas relaciones incompletas (calculado externamente)
      adverse_media   — se activa al cruzar con Bloque 2 (no aquí)
      contracting_risk — se activa al cruzar con contratación pública (no aquí)
    """
    flags: list[RiskFlag] = []
    entity_id = entity.id
    props = raw.get("properties", {})
    datasets = raw.get("datasets", [])

    # ── sanctioned ────────────────────────────────────────────────────────────
    if entity.sanctions_status:
        flags.append(RiskFlag(
            entity_id=entity_id,
            flag_type="sanctioned",
            severity="CRITICAL",
            description=f"Entidad sancionada. Fuente: {', '.join(datasets[:3]) or 'opensanctions'}",
            source="opensanctions",
            confidence=0.95,
            raw_payload={"datasets": datasets},
        ))

    # ── pep ───────────────────────────────────────────────────────────────────
    if entity.pep_status:
        positions = props.get("position", [])[:3]
        desc = f"Persona políticamente expuesta (PEP). Cargos: {', '.join(positions)}" if positions else "Persona políticamente expuesta (PEP)."
        flags.append(RiskFlag(
            entity_id=entity_id,
            flag_type="pep",
            severity="HIGH",
            description=desc,
            source="opensanctions",
            confidence=0.90,
        ))

    # ── jurisdiction_risk ─────────────────────────────────────────────────────
    high_risk = [c for c in entity.countries if c in _HIGH_RISK_JURISDICTIONS]
    if high_risk:
        flags.append(RiskFlag(
            entity_id=entity_id,
            flag_type="jurisdiction_risk",
            severity="HIGH" if len(high_risk) >= 2 else "MEDIUM",
            description=f"Jurisdicción(es) de alto riesgo: {', '.join(high_risk)}",
            source="opensanctions",
            confidence=0.80,
            raw_payload={"high_risk_countries": high_risk},
        ))

    return flags


def load_opensanctions_file(
    path: str | Path,
    source_name: str = "opensanctions",
    max_entities: int | None = None,
) -> tuple[list[RiskEntity], list[RiskRelation], list[RiskFlag]]:
    """
    Carga un export de OpenSanctions y devuelve entidades, relaciones y flags.

    Args:
        path: Ruta al archivo JSON/JSONL/NDJSON de OpenSanctions.
              Debe ser un export de formato FtM (FollowTheMoney).
        source_name: Etiqueta de fuente para los registros.
        max_entities: Límite de entidades (None = sin límite).

    Returns:
        (entities, relations, flags)

    Raises:
        FileNotFoundError: Si el archivo no existe.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"OpenSanctions export no encontrado: {path}")

    logger.info("Cargando OpenSanctions desde %s", path)
    objects = _load_objects(path)

    if max_entities:
        # Priorizar entidades sobre relaciones al recortar
        entity_objs = [o for o in objects if o.get("schema", "") not in {
            "Directorship", "Ownership", "Membership", "Family",
            "Associate", "Sanction", "UnknownLink", "Interval",
        }][:max_entities]
        rel_objs = [o for o in objects if o.get("schema", "") in {
            "Directorship", "Ownership", "Membership", "Family",
            "Associate", "Sanction", "UnknownLink", "Interval",
        }]
        objects = entity_objs + rel_objs

    entities, relations = batch_map_ftm(objects, source=source_name)

    # Detectar flags para cada entidad
    # Construir índice source_id → raw para acceso rápido
    raw_by_id: dict[str, dict] = {}
    for obj in objects:
        obj_id = obj.get("id", "")
        if obj_id:
            raw_by_id[obj_id] = obj

    all_flags: list[RiskFlag] = []
    for entity in entities:
        raw = raw_by_id.get(entity.source_id, {})
        flags = detect_risk_flags(entity, raw)
        all_flags.extend(flags)

    logger.info(
        "OpenSanctions: %d entidades, %d relaciones, %d flags (archivo: %s)",
        len(entities), len(relations), len(all_flags), path.name,
    )
    return entities, relations, all_flags


def load_opensanctions_api(
    entity_id: str | None = None,
    query: str | None = None,
    api_key: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Consulta la API de OpenSanctions (si hay API key configurada).

    Args:
        entity_id: ID concreto a buscar.
        query: Texto de búsqueda.
        api_key: Clave API. Si es None, usa OPENSANCTIONS_API_KEY del entorno.
        limit: Máximo de resultados.

    Returns:
        Lista de objetos FtM crudos.

    NOTA: Requiere configurar OPENSANCTIONS_API_KEY en el entorno.
          https://www.opensanctions.org/api/
    """
    key = api_key or os.getenv("OPENSANCTIONS_API_KEY", "")
    if not key:
        logger.warning("OPENSANCTIONS_API_KEY no configurada. Salta llamada a API.")
        return []

    try:
        import requests
        base = "https://api.opensanctions.org"
        headers = {"Authorization": f"ApiKey {key}"}

        if entity_id:
            resp = requests.get(f"{base}/entities/{entity_id}", headers=headers, timeout=15)
            resp.raise_for_status()
            return [resp.json()]

        if query:
            resp = requests.get(
                f"{base}/search/default",
                params={"q": query, "limit": limit},
                headers=headers,
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("results", [])

    except Exception as exc:
        logger.error("OpenSanctions API error: %s", exc)

    return []
