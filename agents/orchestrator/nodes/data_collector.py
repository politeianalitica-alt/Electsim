"""
Nodo data_collector — Extrae entidades, hechos y señales de los textos de entrada.

Actualiza el estado con:
  extracted_entities
  extracted_facts
  extracted_signals
  extracted_text_len
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def data_collector_node(state: dict[str, Any], engine: Any) -> dict[str, Any]:
    """
    Nodo de extraccion de datos estructurados.

    Args:
        state: estado actual del grafo
        engine: OllamaEngine ya inicializado
    """
    from agents.analysis.extractor import StructuredExtractor

    texts: list[str] = state.get("input_texts", [])
    if not texts:
        return {
            **state,
            "extracted_entities": {},
            "extracted_facts": [],
            "extracted_signals": [],
            "extracted_text_len": 0,
            "meta_nodes_executed": state.get("meta_nodes_executed", []) + ["data_collector"],
            "meta_errors": state.get("meta_errors", []) + ["data_collector: no hay textos de entrada"],
        }

    combined = "\n\n".join(t[:2000] for t in texts[:20])
    extractor = StructuredExtractor(engine)

    try:
        result = await extractor.extract(combined)
        entities = {
            "personas": result.entities.personas,
            "organizaciones": result.entities.organizaciones,
            "lugares": result.entities.lugares,
            "temas": result.entities.temas,
            "partidos": result.entities.partidos,
        }
        facts = [
            {
                "actor": f.actor,
                "action": f.action,
                "object": f.object_,
                "date": f.date_hint,
                "confidence": f.confidence,
            }
            for f in result.facts[:15]
        ]
        signals = [
            {
                "type": s.signal_type,
                "urgency": s.urgency,
                "actors": s.actors,
                "summary": s.summary,
                "confidence": s.confidence,
                "tags": s.tags,
            }
            for s in result.signals[:10]
        ]
        return {
            **state,
            "extracted_entities": entities,
            "extracted_facts": facts,
            "extracted_signals": signals,
            "extracted_text_len": result.raw_text_len,
            "meta_nodes_executed": state.get("meta_nodes_executed", []) + ["data_collector"],
        }
    except Exception as exc:
        logger.warning("data_collector_node error: %s", exc)
        return {
            **state,
            "extracted_entities": {},
            "extracted_facts": [],
            "extracted_signals": [],
            "extracted_text_len": len(combined),
            "meta_nodes_executed": state.get("meta_nodes_executed", []) + ["data_collector"],
            "meta_errors": state.get("meta_errors", []) + [f"data_collector: {exc}"],
            "meta_is_degraded": True,
        }
