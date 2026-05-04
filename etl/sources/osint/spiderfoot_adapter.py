"""
SpiderFoot Adapter — Bloque 4.

Importa exports EXTERNOS de SpiderFoot (JSON / GEXF).
ElectSim NO lanza SpiderFoot internamente. Solo importa resultados generados fuera.

SpiderFoot: https://github.com/smicallef/spiderfoot
  +200 módulos OSINT. UI web + CLI + API.
  ElectSim lo usa solo como fuente de datos externa, no como motor integrado.

Regla: SpiderFoot entra como fuente externa de resultados, no como motor que
ElectSim lanza automáticamente.

Confianza de resultados importados:
  - Por defecto MEDIA-BAJA (0.40-0.55)
  - Se marca fuente como "spiderfoot_import"
  - Requieren revisión antes de usar en análisis de riesgo
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from .schemas import GraphExport, RiskEntity, RiskRelation

logger = logging.getLogger(__name__)

# Tipos de eventos SpiderFoot que se mapean a entity_type
_SF_TYPE_MAP: dict[str, str] = {
    "PERSON_NAME": "person",
    "COMPANY_NAME": "company",
    "INTERNET_NAME": "unknown",
    "DOMAIN_NAME": "unknown",
    "IP_ADDRESS": "unknown",
    "EMAILADDR": "unknown",
    "USERNAME": "unknown",
    "SOCIAL_MEDIA": "person",
    "LINKEDIN_ID": "person",
    "TWITTER_ID": "person",
    "PHONE_NUMBER": "unknown",
    "PHYSICAL_ADDRESS": "unknown",
    "COUNTRY_NAME": "country",
    "JURISDICTION": "country",
    "COMPANY_REGISTRATION": "company",
    "GEOINFO": "unknown",
    "WEBSERVER": "unknown",
    "AFFILIATE_EMAILADDR": "unknown",
    "AFFILIATE_IPADDR": "unknown",
}

# Tipos de eventos que generan relaciones
_SF_RELATION_EVENTS = {
    "AFFILIATE",
    "LINKED_URL_INTERNAL",
    "LINKED_URL_EXTERNAL",
    "SIMILARDOMAIN",
    "PROVIDER_HOSTING",
    "PROVIDER_MAIL",
}


def import_spiderfoot_json(
    path: str | Path,
    source_tag: str = "spiderfoot_import",
) -> tuple[list[RiskEntity], list[RiskRelation]]:
    """
    Importa un export JSON de SpiderFoot.

    El formato esperado es el export estándar de SpiderFoot:
    [
      {"type": "PERSON_NAME", "data": "John Doe", "source": "...", "module": "...", ...},
      ...
    ]

    Args:
        path: Ruta al archivo JSON de SpiderFoot.
        source_tag: Etiqueta de fuente para los registros importados.

    Returns:
        (entities, relations)
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"SpiderFoot export no encontrado: {path}")

    logger.info("Importando SpiderFoot JSON desde %s", path)

    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)

    if not isinstance(raw, list):
        # Formato alternativo con wrapper
        if isinstance(raw, dict):
            for key in ("results", "data", "events"):
                if key in raw and isinstance(raw[key], list):
                    raw = raw[key]
                    break

    events: list[dict[str, Any]] = [e for e in raw if isinstance(e, dict)]

    entities: list[RiskEntity] = []
    relations: list[RiskRelation] = []
    seen_data: dict[str, str] = {}  # data → entity.id para deduplicar

    for event in events:
        evt_type = event.get("type", "")
        data = str(event.get("data", "")).strip()
        if not data:
            continue

        entity_type = _SF_TYPE_MAP.get(evt_type)
        if entity_type:
            if data in seen_data:
                continue  # Deduplicar
            source_id = f"sf_{hash(data) & 0xFFFFFF:06x}"
            entity = RiskEntity(
                source=source_tag,
                source_id=source_id,
                entity_type=entity_type,  # type: ignore[arg-type]
                name=data,
                confidence=0.45,  # Confianza media-baja para imports externos
                raw_payload=event,
            )
            entities.append(entity)
            seen_data[data] = entity.id

        elif evt_type in _SF_RELATION_EVENTS:
            # Intentar crear relación si hay fuente e input conocidos
            src_data = str(event.get("source_data", "")).strip()
            tgt_data = data
            src_id = seen_data.get(src_data)
            tgt_id = seen_data.get(tgt_data)
            if src_id and tgt_id:
                rel = RiskRelation(
                    source=source_tag,
                    source_id=f"sf_rel_{hash(src_data + tgt_data) & 0xFFFFFF:06x}",
                    subject_entity_id=src_id,
                    object_entity_id=tgt_id,
                    relation_type="ENTITY_RELATED_TO_ENTITY",
                    confidence=0.40,
                    raw_payload=event,
                )
                relations.append(rel)

    logger.info(
        "SpiderFoot JSON: %d entidades, %d relaciones (de %d eventos)",
        len(entities), len(relations), len(events),
    )
    return entities, relations


def import_spiderfoot_gexf(
    path: str | Path,
    source_tag: str = "spiderfoot_import",
) -> GraphExport:
    """
    Importa un export GEXF de SpiderFoot como GraphExport.

    GEXF es el formato de exportación de grafos de SpiderFoot.
    Requiere la librería `networkx` (opcional).

    Args:
        path: Ruta al archivo GEXF.
        source_tag: Etiqueta de fuente.

    Returns:
        GraphExport con nodos y aristas.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"SpiderFoot GEXF no encontrado: {path}")

    logger.info("Importando SpiderFoot GEXF desde %s", path)

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    try:
        import networkx as nx
        G = nx.read_gexf(str(path))

        for node_id, attrs in G.nodes(data=True):
            nodes.append({
                "id": node_id,
                "label": attrs.get("label", str(node_id)),
                "type": attrs.get("type", "unknown"),
                "source": source_tag,
                "confidence": 0.45,
                "attrs": attrs,
            })

        for u, v, attrs in G.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "relation_type": attrs.get("label", "ENTITY_RELATED_TO_ENTITY"),
                "confidence": 0.40,
                "attrs": attrs,
            })

        logger.info("GEXF: %d nodos, %d aristas", len(nodes), len(edges))

    except ImportError:
        logger.warning("networkx no disponible. Importando GEXF como texto plano.")
        # Parseo básico sin networkx
        with open(path, encoding="utf-8") as fh:
            content = fh.read()
        import re
        node_ids = re.findall(r'<node id="([^"]+)"', content)
        edge_pairs = re.findall(r'<edge source="([^"]+)" target="([^"]+)"', content)
        for nid in node_ids:
            nodes.append({"id": nid, "label": nid, "source": source_tag})
        for src, tgt in edge_pairs:
            edges.append({"source": src, "target": tgt})
        logger.info("GEXF básico: %d nodos, %d aristas", len(nodes), len(edges))

    return GraphExport(
        nodes=nodes,
        edges=edges,
        meta={"source": source_tag, "file": str(path.name), "format": "gexf"},
    )


class SpiderFootAdapter:
    """
    Adaptador de SpiderFoot para ElectSim.

    No lanza scans. Solo importa exports externos.
    """

    SOURCE_TAG = "spiderfoot_import"

    @classmethod
    def from_json(cls, path: str | Path) -> tuple[list[RiskEntity], list[RiskRelation]]:
        """Importa desde JSON."""
        return import_spiderfoot_json(path, cls.SOURCE_TAG)

    @classmethod
    def from_gexf(cls, path: str | Path) -> GraphExport:
        """Importa desde GEXF."""
        return import_spiderfoot_gexf(path, cls.SOURCE_TAG)

    @staticmethod
    def is_scan_disabled() -> bool:
        """
        ElectSim NO lanza scans de SpiderFoot.
        Esta función siempre devuelve True como garantía.
        """
        return True
