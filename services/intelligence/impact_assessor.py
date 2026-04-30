"""
ImpactAssessor — Evalua el impacto de normas, narrativas y eventos sobre un cliente.

Para cada objeto (norma BOE, evento parlamentario, narrativa):
  1. Recupera el objeto y sus relaciones del grafo.
  2. Recupera el perfil del cliente (sector, intereses, watchlist).
  3. Pide al LLM: score de impacto, desagregacion por dimension, rationale.
  4. Guarda el ImpactAssessment en la ontologia.
  5. Crea relacion AFFECTS_CLIENT entre el objeto y el cliente.

Dimensiones de impacto:
  regulatory, media, financial, reputational, operational

Sin emojis.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from services.intelligence.models import ImpactAssessment

logger = logging.getLogger(__name__)

_DIMENSIONS = ["regulatory", "media", "financial", "reputational", "operational"]
_MAX_RELATIONS_CONTEXT = 10


class ImpactAssessor:
    """
    Evalua el impacto de objetos del grafo sobre clientes especificos.
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
    # Evaluacion principal
    # ------------------------------------------------------------------

    async def assess(
        self,
        client_id: str,
        object_type: str,
        object_id: str,
    ) -> ImpactAssessment:
        """
        Evalua el impacto de un objeto sobre un cliente.

        Args:
            client_id:    ID del cliente.
            object_type:  Tipo del objeto ('legislation', 'narrative', 'event').
            object_id:    UUID o ID externo del objeto.
        """
        # Recuperar contexto del objeto
        object_context = await self._fetch_object_context(object_type, object_id)

        # Recuperar perfil del cliente
        client_profile = await self._fetch_client_profile(client_id)

        # Construir prompt
        prompt = self._build_assess_prompt(
            client_id=client_id,
            object_type=object_type,
            object_id=object_id,
            object_context=object_context,
            client_profile=client_profile,
        )

        assessment = await self.llm.analyze_structured(
            prompt=prompt,
            schema=ImpactAssessment,
            task_type="analysis",
            temperature=0.2,
        )
        # Asegurar IDs correctos
        assessment = assessment.model_copy(update={
            "client_id": client_id,
            "object_type": object_type,
            "object_id": object_id,
        })

        # Persistir y crear relaciones
        await self._persist_assessment(assessment)
        await self._link_affects_client(assessment)

        return assessment

    # ------------------------------------------------------------------
    # Construccion del prompt
    # ------------------------------------------------------------------

    def _build_assess_prompt(
        self,
        client_id: str,
        object_type: str,
        object_id: str,
        object_context: dict,
        client_profile: dict,
    ) -> str:
        lines = [
            "Eres un analista de riesgos politico-regulatorios.",
            f"\nObjeto a evaluar (tipo={object_type}, id={object_id}):",
            json.dumps(object_context, ensure_ascii=False, indent=2)[:3000],
            f"\nPerfil del cliente (id={client_id}):",
            json.dumps(client_profile, ensure_ascii=False, indent=2)[:1500],
            "\nEvalua el impacto de este objeto sobre el cliente.",
            "Responde con JSON exacto:\n"
            "{\n"
            '  "client_id": "<string>",\n'
            '  "object_type": "<string>",\n'
            '  "object_id": "<string>",\n'
            '  "impact_score": <float 0.0-1.0>,\n'
            '  "impact_dimension": {\n'
            '    "regulatory": <float 0.0-1.0>,\n'
            '    "media": <float 0.0-1.0>,\n'
            '    "financial": <float 0.0-1.0>,\n'
            '    "reputational": <float 0.0-1.0>,\n'
            '    "operational": <float 0.0-1.0>\n'
            "  },\n"
            '  "rationale_markdown": "<explicacion en markdown, 3-5 parrafos>"\n'
            "}\n"
            "impact_score: media ponderada de las dimensiones.\n"
            "Solo evalua las dimensiones relevantes; 0.0 si no aplica.",
        ]
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    async def _persist_assessment(self, assessment: ImpactAssessment) -> None:
        """Guarda el ImpactAssessment como objeto de ontologia."""
        if self.ontology_repo is None:
            return
        try:
            self.ontology_repo.upsert_object_from_pipeline(
                object_type_code="analysis_result",
                external_table="impact_assessments",
                external_id=f"{assessment.client_id}:{assessment.object_type}:{assessment.object_id}",
                properties={
                    "type": "impact_assessment",
                    "client_id": assessment.client_id,
                    "object_type": assessment.object_type,
                    "object_id": assessment.object_id,
                    "impact_score": assessment.impact_score,
                    "impact_dimension": assessment.impact_dimension,
                    "rationale_markdown": assessment.rationale_markdown[:2000],
                    "assessed_at": assessment.assessed_at.isoformat(),
                },
            )
            if self.session:
                self.session.commit()
        except Exception as exc:
            logger.warning("ImpactAssessor._persist_assessment: %s", exc)

    async def _link_affects_client(self, assessment: ImpactAssessment) -> None:
        """Crea relacion AFFECTS_CLIENT entre el objeto y el cliente."""
        if self.ontology_repo is None:
            return
        try:
            # UUID del objeto evaluado
            obj_uuid = self.ontology_repo.get_object_by_source(
                assessment.object_type, assessment.object_id
            )
            if not obj_uuid:
                return
            obj_id_str = str(obj_uuid.id)

            # UUID del assessment recien creado
            assessment_uuid = self.ontology_repo.resolve_entity_name(
                f"{assessment.client_id}:{assessment.object_type}:{assessment.object_id}"
            )
            if obj_id_str and assessment_uuid:
                self.ontology_repo.link_entities(
                    source_id=obj_id_str,
                    target_id=assessment_uuid,
                    relation_type_code="AFFECTS_CLIENT",
                    weight=assessment.impact_score,
                )
            if self.session:
                self.session.commit()
        except Exception as exc:
            logger.debug("_link_affects_client: %s", exc)

    # ------------------------------------------------------------------
    # Consultas al grafo
    # ------------------------------------------------------------------

    async def _fetch_object_context(self, object_type: str, object_id: str) -> dict:
        """Recupera el objeto y sus relaciones mas relevantes del grafo."""
        if self.ontology_repo is None:
            return {"id": object_id, "type": object_type}

        try:
            obj = self.ontology_repo.get_object_by_source(object_type, object_id)
            if not obj:
                return {"id": object_id, "type": object_type}

            context = {
                "id": object_id,
                "type": object_type,
                "properties": obj.properties or {},
            }

            # Relaciones de salida
            _, relations = self.ontology_repo.list_relations(
                object_id=obj.id,
                direction="out",
                limit=_MAX_RELATIONS_CONTEXT,
            )
            if relations:
                context["outgoing_relations"] = [
                    {
                        "relation_type": r.relation_type,
                        "target_id": str(r.target_object_id),
                        "weight": r.weight,
                    }
                    for r in relations
                ]

            return context
        except Exception as exc:
            logger.debug("_fetch_object_context: %s", exc)
            return {"id": object_id, "type": object_type}

    async def _fetch_client_profile(self, client_id: str) -> dict:
        """Recupera el perfil del cliente desde la BD."""
        if self.session is None:
            return {"client_id": client_id}
        try:
            from sqlalchemy import text as sa_text
            row = self.session.execute(
                sa_text(
                    "SELECT nombre, sector, sub_sector, ideologia_cliente, "
                    "       watchlist_terminos, config_alertas "
                    "FROM clientes WHERE id = :cid LIMIT 1"
                ),
                {"cid": client_id},
            ).first()
            if row:
                return {
                    "client_id": client_id,
                    "nombre": row[0],
                    "sector": row[1],
                    "sub_sector": row[2],
                    "ideologia_cliente": row[3],
                    "watchlist_terminos": row[4],
                }
            return {"client_id": client_id}
        except Exception as exc:
            logger.debug("_fetch_client_profile: %s", exc)
            return {"client_id": client_id}

    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------

    def list_assessments_for_client(
        self, client_id: str, limit: int = 20
    ) -> list[dict]:
        """Lista los impactos evaluados para un cliente, ordenados por score."""
        if self.session is None:
            return []
        try:
            from sqlalchemy import text as sa_text
            rows = self.session.execute(
                sa_text(
                    "SELECT "
                    "  o.properties->>'object_type' as object_type, "
                    "  o.properties->>'object_id' as object_id, "
                    "  (o.properties->>'impact_score')::float as impact_score, "
                    "  o.properties->>'assessed_at' as assessed_at "
                    "FROM ontology_object o "
                    "JOIN ontology_object_type t ON t.id = o.object_type_id "
                    "WHERE t.code = 'analysis_result' "
                    "AND o.properties->>'type' = 'impact_assessment' "
                    "AND o.properties->>'client_id' = :cid "
                    "ORDER BY impact_score DESC NULLS LAST "
                    "LIMIT :lim"
                ),
                {"cid": client_id, "lim": limit},
            ).fetchall()
            return [
                {
                    "object_type": r[0],
                    "object_id": r[1],
                    "impact_score": r[2],
                    "assessed_at": r[3],
                }
                for r in rows
            ]
        except Exception as exc:
            logger.debug("list_assessments_for_client: %s", exc)
            return []
