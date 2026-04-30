"""
NarrativeTracker — Etiqueta clusters de narrativas con IA.

Cuando el pipeline detecta un nuevo cluster (o un cluster se actualiza),
este servicio:
  1. Recupera 3-5 piezas representativas del cluster desde la ontologia.
  2. Construye un prompt con esos ejemplos.
  3. Pide al LLM: nombre, descripcion, nivel de amenaza.
  4. Guarda el NarrativeLabel como objeto de ontologia (narrative_cluster).
  5. Crea relaciones HAS_NARRATIVE entre los documentos y el cluster.

Se invoca desde:
  scheduler.tasks.intelligence.task_label_narrative_cluster

Sin emojis.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from services.intelligence.models import NarrativeLabel

logger = logging.getLogger(__name__)

_MAX_EXAMPLES = 5      # ejemplos a inyectar en el prompt
_MAX_EXAMPLE_CHARS = 500   # truncar cada ejemplo a estos chars


class NarrativeTracker:
    """
    Etiqueta clusters de narrativas usando LLM.
    """

    def __init__(
        self,
        llm,                    # LLMClient
        ontology_repo,          # OntologyGraphRepository
        db_session=None,        # SQLAlchemy Session
    ) -> None:
        self.llm = llm
        self.ontology_repo = ontology_repo
        self.session = db_session

    # ------------------------------------------------------------------
    # Etiquetado de un cluster
    # ------------------------------------------------------------------

    async def label_cluster(self, cluster_id: str) -> NarrativeLabel:
        """
        Genera una etiqueta semantica para un cluster de narrativas.

        Args:
            cluster_id: ID del cluster (entero o string).

        Retorna NarrativeLabel con label, description, threat_level.
        """
        examples = await self._fetch_cluster_examples(cluster_id)
        entities = await self._fetch_cluster_entities(cluster_id)

        prompt = self._build_label_prompt(cluster_id, examples, entities)

        label = await self.llm.analyze_structured(
            prompt=prompt,
            schema=NarrativeLabel,
            task_type="analysis",
            temperature=0.3,
        )
        # Asegurar que cluster_id sea el correcto
        label = label.model_copy(update={"cluster_id": str(cluster_id)})

        # Persistir
        await self._persist_label(label)
        await self._link_documents_to_cluster(cluster_id, label)

        return label

    # ------------------------------------------------------------------
    # Construccion del prompt
    # ------------------------------------------------------------------

    def _build_label_prompt(
        self,
        cluster_id: str,
        examples: list[dict],
        entities: list[str],
    ) -> str:
        lines: list[str] = [
            f"Analiza el siguiente cluster de narrativas (id={cluster_id}).",
            "Aqui tienes ejemplos representativos:",
        ]

        for i, ex in enumerate(examples[:_MAX_EXAMPLES], 1):
            title = ex.get("title", "")
            text = (ex.get("text") or ex.get("content") or "")[:_MAX_EXAMPLE_CHARS]
            lines.append(f"\n[Ejemplo {i}] {title}\n{text}")

        if entities:
            lines.append(f"\nEntidades mencionadas: {', '.join(entities[:15])}")

        lines.append(
            "\nDevuelve un JSON con la estructura exacta:\n"
            "{\n"
            '  "cluster_id": "<string>",\n'
            '  "label": "<nombre corto de la narrativa, max 8 palabras>",\n'
            '  "description": "<descripcion en 2-3 frases>",\n'
            '  "threat_level": "<ruido|emergente|crisis>",\n'
            '  "supporting_examples": ["<frase 1>", "<frase 2>", "<frase 3>"],\n'
            '  "entity_mentions": ["<entidad 1>", "<entidad 2>"]\n'
            "}\n"
            "threat_level:\n"
            "  ruido = narrativa sin impacto significativo\n"
            "  emergente = narrativa en crecimiento con potencial de impacto\n"
            "  crisis = narrativa que ya causa dano reputacional o politico\n"
        )

        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Persistencia y relaciones
    # ------------------------------------------------------------------

    async def _persist_label(self, label: NarrativeLabel) -> None:
        """Guarda el NarrativeLabel como objeto de ontologia."""
        if self.ontology_repo is None:
            return
        try:
            self.ontology_repo.upsert_object_from_pipeline(
                object_type_code="narrative_cluster",
                external_table="narrative_clusters",
                external_id=label.cluster_id,
                properties={
                    "label": label.label,
                    "description": label.description,
                    "threat_level": label.threat_level,
                    "supporting_examples": label.supporting_examples,
                    "entity_mentions": label.entity_mentions,
                    "labeled_at": label.labeled_at.isoformat(),
                },
            )
            if self.session:
                self.session.commit()
        except Exception as exc:
            logger.warning("NarrativeTracker._persist_label: %s", exc)

    async def _link_documents_to_cluster(
        self, cluster_id: str, label: NarrativeLabel
    ) -> None:
        """Crea relaciones HAS_NARRATIVE de documentos al cluster."""
        if self.session is None or self.ontology_repo is None:
            return
        try:
            from sqlalchemy import text as sa_text
            # Obtener UUID del cluster
            cluster_uuid = self.ontology_repo.resolve_entity_name(label.label)
            if not cluster_uuid:
                return

            # Obtener documentos del cluster por cluster_id
            rows = self.session.execute(
                sa_text(
                    "SELECT id FROM ontology_object "
                    "WHERE properties->>'cluster_id' = :cid LIMIT 50"
                ),
                {"cid": str(cluster_id)},
            ).fetchall()

            for row in rows:
                doc_uuid = str(row[0])
                self.ontology_repo.link_entities(
                    source_id=doc_uuid,
                    target_id=cluster_uuid,
                    relation_type_code="HAS_NARRATIVE",
                    weight=1.0,
                )
            if self.session:
                self.session.commit()
        except Exception as exc:
            logger.debug("_link_documents_to_cluster: %s", exc)

    # ------------------------------------------------------------------
    # Consultas al grafo
    # ------------------------------------------------------------------

    async def _fetch_cluster_examples(self, cluster_id: str) -> list[dict]:
        """Recupera ejemplos representativos del cluster desde la ontologia."""
        if self.session is None:
            return []
        try:
            from sqlalchemy import text as sa_text
            rows = self.session.execute(
                sa_text(
                    "SELECT "
                    "  o.properties->>'title' as title, "
                    "  o.properties->>'raw_text' as text "
                    "FROM ontology_object o "
                    "WHERE o.properties->>'cluster_id' = :cid "
                    "ORDER BY o.updated_at DESC LIMIT :lim"
                ),
                {"cid": str(cluster_id), "lim": _MAX_EXAMPLES},
            ).fetchall()
            return [{"title": r[0] or "", "text": r[1] or ""} for r in rows]
        except Exception as exc:
            logger.debug("_fetch_cluster_examples: %s", exc)
            return []

    async def _fetch_cluster_entities(self, cluster_id: str) -> list[str]:
        """Recupera entidades frecuentes del cluster."""
        if self.session is None:
            return []
        try:
            from sqlalchemy import text as sa_text
            rows = self.session.execute(
                sa_text(
                    "SELECT DISTINCT e.properties->>'name' "
                    "FROM ontology_object o "
                    "JOIN ontology_relation r ON r.source_object_id = o.id "
                    "JOIN ontology_object e ON e.id = r.target_object_id "
                    "JOIN ontology_object_type t ON t.id = e.object_type_id "
                    "WHERE o.properties->>'cluster_id' = :cid "
                    "AND t.code IN ('person','organization') "
                    "LIMIT 20"
                ),
                {"cid": str(cluster_id)},
            ).fetchall()
            return [r[0] for r in rows if r[0]]
        except Exception as exc:
            logger.debug("_fetch_cluster_entities: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Resumen de narrativas activas (para dashboards)
    # ------------------------------------------------------------------

    def list_active_narratives(self, limit: int = 20) -> list[dict]:
        """Lista las narrativas activas ordenadas por threat_level."""
        if self.session is None:
            return []
        try:
            from sqlalchemy import text as sa_text
            rows = self.session.execute(
                sa_text(
                    "SELECT "
                    "  o.properties->>'label' as label, "
                    "  o.properties->>'description' as description, "
                    "  o.properties->>'threat_level' as threat_level, "
                    "  o.updated_at "
                    "FROM ontology_object o "
                    "JOIN ontology_object_type t ON t.id = o.object_type_id "
                    "WHERE t.code = 'narrative_cluster' "
                    "ORDER BY "
                    "  CASE o.properties->>'threat_level' "
                    "    WHEN 'crisis' THEN 0 "
                    "    WHEN 'emergente' THEN 1 "
                    "    ELSE 2 "
                    "  END, o.updated_at DESC "
                    "LIMIT :lim"
                ),
                {"lim": limit},
            ).fetchall()
            return [
                {
                    "label": r[0],
                    "description": r[1],
                    "threat_level": r[2],
                    "updated_at": r[3].isoformat() if r[3] else None,
                }
                for r in rows
            ]
        except Exception as exc:
            logger.debug("list_active_narratives: %s", exc)
            return []
