"""
Bloque 4 — DynamicOntologyManager.

Auto-expande el universo de entidades canonicas: cuando el extractor NER detecta
un span que no resuelve en el catalogo YAML ni via embedding (score < AUTO_THRESHOLD),
este modulo lo registra como CandidateEntity y gestiona su ciclo de vida:

  pending → promoted  (nuevo QID canonico tras N menciones o aprobacion humana)
         → merged     (fusionado con una entidad existente)
         → discarded  (ruido / falso positivo)

Flujo principal:
  1. process_unknown_span()  — evalua + persiste candidato
  2. auto_promote_loop()     — promueve candidatos con N menciones
  3. merge_candidate()       — fusion humana-en-el-bucle
  4. discard_candidate()     — descarte
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_NEW_ENTITY_THRESHOLD: float = 0.85   # debajo → posiblemente entidad nueva
_DEFINITELY_NEW_THRESHOLD: float = 0.60  # debajo → definitivamente nueva
_AUTO_PROMOTE_MENTIONS: int = 5        # menciones minimas para auto-promocion
_COOCCURRENCE_WINDOW: int = 3          # QIDs del mismo articulo como coocurrentes


# ---------------------------------------------------------------------------
# Modelo de datos
# ---------------------------------------------------------------------------

@dataclass
class CandidateEntity:
    surface_text: str
    surface_norm: str
    ner_label: str
    context_sample: str = ""
    embedding: Optional[list[float]] = None
    nearest_qid: Optional[str] = None
    nearest_score: float = 0.0
    cooccurrence_qids: list[str] = field(default_factory=list)
    candidate_id: str = field(default_factory=lambda: f"CAND-{uuid.uuid4().hex[:10].upper()}")
    n_mentions: int = 1
    status: str = "pending"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Generador de candidate_id determinista (mismo surface → mismo ID)
# ---------------------------------------------------------------------------

def _candidate_id_for(surface_norm: str, ner_label: str) -> str:
    digest = hashlib.sha1(f"{surface_norm}|{ner_label}".encode()).hexdigest()[:10].upper()
    return f"CAND-{digest}"


# ---------------------------------------------------------------------------
# Core: DynamicOntologyManager
# ---------------------------------------------------------------------------

class DynamicOntologyManager:
    """
    Gestiona el universo de entidades candidatas.

    Requiere una conexion psycopg v3 al instanciar (conn) o usa
    get_conn() de dashboard.db si conn=None.
    """

    def __init__(self, conn=None) -> None:
        if conn is None:
            try:
                from dashboard.db import get_conn
                self._conn = get_conn()
            except Exception:
                self._conn = None
        else:
            self._conn = conn

    # ------------------------------------------------------------------
    # 1. Procesar span desconocido
    # ------------------------------------------------------------------

    def process_unknown_span(
        self,
        surface_text: str,
        surface_norm: str,
        ner_label: str,
        context_sample: str = "",
        embedding: Optional[list[float]] = None,
        nearest_qid: Optional[str] = None,
        nearest_score: float = 0.0,
        cooccurrence_qids: Optional[list[str]] = None,
    ) -> CandidateEntity:
        """
        Registra o actualiza un candidato.

        Si el candidato ya existe (misma surface_norm + ner_label),
        incrementa n_mentions y agrega cooccurrentes.
        Retorna el CandidateEntity resultante.
        """
        cid = _candidate_id_for(surface_norm, ner_label)
        coocc = list(set(cooccurrence_qids or []))

        candidate = CandidateEntity(
            candidate_id=cid,
            surface_text=surface_text,
            surface_norm=surface_norm,
            ner_label=ner_label,
            context_sample=context_sample,
            embedding=embedding,
            nearest_qid=nearest_qid,
            nearest_score=nearest_score,
            cooccurrence_qids=coocc,
        )

        if self._conn is None:
            log.warning("DynamicOntologyManager: sin conexion BD, candidato no persistido")
            return candidate

        try:
            self._upsert_candidate(candidate)
        except Exception as exc:
            log.warning("DynamicOntologyManager: error upsert candidato %s: %s", cid, exc)

        return candidate

    def _upsert_candidate(self, c: CandidateEntity) -> None:
        import json as _json
        sql = """
            INSERT INTO candidate_entities
              (candidate_id, surface_text, surface_norm, ner_label,
               context_sample, embedding, nearest_qid, nearest_score,
               cooccurrence_qids, n_mentions, status, created_at, updated_at)
            VALUES
              (%(cid)s, %(surface)s, %(norm)s, %(label)s,
               %(ctx)s, %(emb)s, %(nqid)s, %(nscore)s,
               %(coocc)s, 1, 'pending', NOW(), NOW())
            ON CONFLICT (candidate_id) DO UPDATE SET
              n_mentions        = candidate_entities.n_mentions + 1,
              cooccurrence_qids = (
                  SELECT jsonb_agg(DISTINCT v)
                  FROM (
                      SELECT jsonb_array_elements_text(candidate_entities.cooccurrence_qids) AS v
                      UNION
                      SELECT jsonb_array_elements_text(%(coocc)s::jsonb)
                  ) sub
              ),
              updated_at = NOW()
        """
        params = {
            "cid":    c.candidate_id,
            "surface": c.surface_text,
            "norm":    c.surface_norm,
            "label":   c.ner_label,
            "ctx":     c.context_sample[:600] if c.context_sample else "",
            "emb":     _json.dumps(c.embedding) if c.embedding else None,
            "nqid":    c.nearest_qid,
            "nscore":  c.nearest_score,
            "coocc":   _json.dumps(c.cooccurrence_qids),
        }
        try:
            self._conn.execute(sql, params)
            self._conn.commit()
        except Exception:
            try:
                self._conn.rollback()
            except Exception:
                pass
            raise

    # ------------------------------------------------------------------
    # 2. Auto-promover candidatos con N menciones
    # ------------------------------------------------------------------

    def auto_promote_loop(
        self,
        min_mentions: int = _AUTO_PROMOTE_MENTIONS,
        min_cooccurrences: int = 2,
    ) -> list[str]:
        """
        Promueve candidatos pending que superan los umbrales.
        Devuelve lista de candidate_ids promovidos.

        Criterios de auto-promocion:
        - n_mentions >= min_mentions
        - len(cooccurrence_qids) >= min_cooccurrences  (co-aparece con conocidos)
        - nearest_score < _NEW_ENTITY_THRESHOLD  (no es alias de nadie)
        """
        if self._conn is None:
            return []

        promoted: list[str] = []
        try:
            rows = list(self._conn.execute(
                """
                SELECT candidate_id, surface_text, surface_norm, ner_label
                FROM candidate_entities
                WHERE status = 'pending'
                  AND n_mentions >= %(min_m)s
                  AND jsonb_array_length(cooccurrence_qids) >= %(min_c)s
                  AND (nearest_score < %(thr)s OR nearest_score IS NULL)
                ORDER BY n_mentions DESC
                LIMIT 20
                """,
                {"min_m": min_mentions, "min_c": min_cooccurrences, "thr": _NEW_ENTITY_THRESHOLD},
            ))
            for row in rows:
                cid = row[0]
                new_qid = self._generate_qid(row[2], row[3])
                self._promote(cid, new_qid)
                promoted.append(cid)
                log.info("DynamicOntology: auto-promovido %s → %s", cid, new_qid)
        except Exception as exc:
            log.warning("DynamicOntology: error en auto_promote_loop: %s", exc)

        return promoted

    def _generate_qid(self, surface_norm: str, ner_label: str) -> str:
        """Genera un QID temporal para entidades auto-promovidas."""
        prefix_map = {"PER": "Q9", "ORG": "Q8", "LOC": "Q7", "GPE": "Q7"}
        prefix = prefix_map.get(ner_label, "Q0")
        digest = hashlib.sha1(surface_norm.encode()).hexdigest()[:6].upper()
        return f"{prefix}{digest}"

    def _promote(self, candidate_id: str, promoted_qid: str) -> None:
        try:
            self._conn.execute(
                """
                UPDATE candidate_entities
                SET status = 'promoted', promoted_qid = %(qid)s, updated_at = NOW()
                WHERE candidate_id = %(cid)s
                """,
                {"qid": promoted_qid, "cid": candidate_id},
            )
            self._conn.commit()
        except Exception:
            try:
                self._conn.rollback()
            except Exception:
                pass
            raise

    # ------------------------------------------------------------------
    # 3. Fusion humana-en-el-bucle
    # ------------------------------------------------------------------

    def merge_candidate(self, candidate_id: str, target_qid: str) -> bool:
        """
        Fusiona un candidato con una entidad canonica existente.
        Registra el alias en entity_aliases para futuros lookups.
        Devuelve True si la operacion tiene exito.
        """
        if self._conn is None:
            return False
        try:
            row = next(iter(self._conn.execute(
                "SELECT surface_norm, ner_label FROM candidate_entities WHERE candidate_id = %(cid)s",
                {"cid": candidate_id},
            )), None)
            if not row:
                log.warning("merge_candidate: candidato %s no encontrado", candidate_id)
                return False

            surface_norm, ner_label = row

            # Registrar alias en el catalogo canónico
            self._conn.execute(
                """
                INSERT INTO entity_aliases (qid, alias_raw, alias_norm, fuente)
                VALUES (%(qid)s, %(raw)s, %(norm)s, 'dynamic_ontology')
                ON CONFLICT (alias_norm) DO NOTHING
                """,
                {"qid": target_qid, "raw": surface_norm, "norm": surface_norm},
            )

            # Actualizar candidato
            self._conn.execute(
                """
                UPDATE candidate_entities
                SET status = 'merged', merged_into_qid = %(qid)s, updated_at = NOW()
                WHERE candidate_id = %(cid)s
                """,
                {"qid": target_qid, "cid": candidate_id},
            )
            self._conn.commit()

            # Forzar recarga del alias index en memoria
            try:
                from agents.entity_resolution.normalizer import reload_aliases
                reload_aliases()
            except Exception:
                pass

            return True
        except Exception as exc:
            log.error("merge_candidate error: %s", exc)
            try:
                self._conn.rollback()
            except Exception:
                pass
            return False

    # ------------------------------------------------------------------
    # 4. Descarte
    # ------------------------------------------------------------------

    def discard_candidate(self, candidate_id: str) -> bool:
        """Marca un candidato como descartado (ruido / falso positivo)."""
        if self._conn is None:
            return False
        try:
            self._conn.execute(
                """
                UPDATE candidate_entities
                SET status = 'discarded', updated_at = NOW()
                WHERE candidate_id = %(cid)s
                """,
                {"cid": candidate_id},
            )
            self._conn.commit()
            return True
        except Exception as exc:
            log.warning("discard_candidate error: %s", exc)
            try:
                self._conn.rollback()
            except Exception:
                pass
            return False

    # ------------------------------------------------------------------
    # 5. Consultas de estado
    # ------------------------------------------------------------------

    def get_pending(self, limit: int = 50) -> list[dict]:
        """Devuelve candidatos pendientes ordenados por menciones."""
        if self._conn is None:
            return []
        try:
            rows = self._conn.execute(
                """
                SELECT candidate_id, surface_text, ner_label, n_mentions,
                       nearest_qid, nearest_score, created_at
                FROM candidate_entities
                WHERE status = 'pending'
                ORDER BY n_mentions DESC, created_at DESC
                LIMIT %(lim)s
                """,
                {"lim": limit},
            )
            return [
                {
                    "candidate_id": r[0],
                    "surface_text": r[1],
                    "ner_label": r[2],
                    "n_mentions": r[3],
                    "nearest_qid": r[4],
                    "nearest_score": r[5],
                    "created_at": r[6],
                }
                for r in rows
            ]
        except Exception as exc:
            log.warning("get_pending error: %s", exc)
            return []

    def stats(self) -> dict:
        """Estadisticas del catalogo de candidatos."""
        if self._conn is None:
            return {}
        try:
            row = next(iter(self._conn.execute(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
                    COUNT(*) FILTER (WHERE status = 'promoted')  AS promoted,
                    COUNT(*) FILTER (WHERE status = 'merged')    AS merged,
                    COUNT(*) FILTER (WHERE status = 'discarded') AS discarded,
                    COUNT(*) AS total
                FROM candidate_entities
                """
            )), None)
            if not row:
                return {}
            return {
                "pending": row[0],
                "promoted": row[1],
                "merged": row[2],
                "discarded": row[3],
                "total": row[4],
            }
        except Exception as exc:
            log.warning("DynamicOntology stats error: %s", exc)
            return {}
