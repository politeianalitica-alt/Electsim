"""
agents.intelligence.disinfo_analyzer
=======================================
Enriquecimiento LLM de items de desinformacion y enlace semantico
con perfiles narrativos existentes.

Pipeline:
  1. Recibe DisinfoItem sin enriquecer (del DisinfoScraper)
  2. Calcula similitud coseno con narrative_profiles via sentence-transformers
  3. Si similitud > umbral, enlaza el item al perfil narrativo mas cercano
  4. Llama a Ollama (qwen3:8b) para producir:
       - narrativa_padre      — narrativa macro a la que pertenece
       - audiencia_objetivo   — publico diana
       - cadena_difusion      — canales y mecanismos probables
       - contramedida         — estrategia de respuesta recomendada
       - nivel_alerta         — BAJO / MEDIO / ALTO / CRITICO
  5. Persiste resultado enriquecido en disinfo_items (PostgreSQL via psycopg v3)

Uso:
    from agents.intelligence.disinfo_analyzer import DisinfoAnalyzer
    from agents.intelligence.disinfo_scraper import DisinfoScraper

    scraper = DisinfoScraper()
    analyzer = DisinfoAnalyzer(db_url=DATABASE_URL)

    items = scraper.fetch_all(since_hours=24)
    enriched = analyzer.enrich_batch(items, narrative_profiles_df)
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

import numpy as np
import requests

from .disinfo_scraper import DisinfoItem

log = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen3:8b"
NARRATIVE_SIMILARITY_THRESHOLD = 0.55


# ---------------------------------------------------------------------------
# DisinfoAnalyzer
# ---------------------------------------------------------------------------

class DisinfoAnalyzer:
    """
    Enriquece DisinfoItem con analisis LLM y enlace narrativo.

    Params:
        db_url           — connection string PostgreSQL (psycopg v3)
        ollama_url       — URL base de Ollama
        ollama_model     — modelo a usar
        similarity_thr   — umbral de similitud para enlace narrativo
        use_sbert        — usar sentence-transformers para similitud semantica
    """

    def __init__(
        self,
        db_url: str | None = None,
        ollama_url: str = OLLAMA_BASE_URL,
        ollama_model: str = OLLAMA_MODEL,
        similarity_thr: float = NARRATIVE_SIMILARITY_THRESHOLD,
        use_sbert: bool = True,
    ) -> None:
        self.db_url = db_url
        self.ollama_url = ollama_url
        self.ollama_model = ollama_model
        self.similarity_thr = similarity_thr
        self._sbert = self._load_sbert() if use_sbert else None

    # ------------------------------------------------------------------
    # Carga de modelo
    # ------------------------------------------------------------------

    def _load_sbert(self):
        try:
            from sentence_transformers import SentenceTransformer
            return SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        except Exception as exc:
            log.warning("SentenceTransformer no disponible: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Punto de entrada: enriquecimiento por lotes
    # ------------------------------------------------------------------

    def enrich_batch(
        self,
        items: list[DisinfoItem],
        narrative_profiles: list[dict[str, Any]] | None = None,
    ) -> list[DisinfoItem]:
        """
        Enriquece una lista de DisinfoItem.

        narrative_profiles es una lista de dicts con claves:
          - id          (int)
          - label       (str)  — narrative_label
          - top_keywords (list[str])

        Si se proporciona, se calcula similitud y se enlaza cada item
        al perfil narrativo mas cercano.
        """
        # Pre-calcular embeddings de perfiles narrativos
        profile_embeddings = self._embed_profiles(narrative_profiles or [])

        enriched: list[DisinfoItem] = []
        for item in items:
            try:
                enriched.append(self._enrich_item(item, narrative_profiles or [], profile_embeddings))
            except Exception as exc:
                log.warning("Error enriching item %s: %s", item.item_id, exc)
                enriched.append(item)

        return enriched

    def enrich_single(
        self,
        item: DisinfoItem,
        narrative_profiles: list[dict[str, Any]] | None = None,
    ) -> DisinfoItem:
        """Enriquece un solo DisinfoItem."""
        profile_embeddings = self._embed_profiles(narrative_profiles or [])
        return self._enrich_item(item, narrative_profiles or [], profile_embeddings)

    # ------------------------------------------------------------------
    # Enriquecimiento de item individual
    # ------------------------------------------------------------------

    def _enrich_item(
        self,
        item: DisinfoItem,
        profiles: list[dict[str, Any]],
        profile_embeddings: np.ndarray | None,
    ) -> DisinfoItem:
        # 1. Enlace narrativo
        item = self._link_to_narrative(item, profiles, profile_embeddings)

        # 2. Analisis LLM
        llm_result = self._llm_enrich(item)
        item.llm_enrichment = llm_result

        return item

    # ------------------------------------------------------------------
    # Enlace semantico a narrativa
    # ------------------------------------------------------------------

    def _embed_profiles(
        self, profiles: list[dict[str, Any]]
    ) -> np.ndarray | None:
        if not profiles or self._sbert is None:
            return None
        try:
            texts = [
                f"{p.get('label', '')} {' '.join(p.get('top_keywords', []))}"
                for p in profiles
            ]
            return self._sbert.encode(texts, show_progress_bar=False)
        except Exception as exc:
            log.warning("Profile embedding error: %s", exc)
            return None

    def _link_to_narrative(
        self,
        item: DisinfoItem,
        profiles: list[dict[str, Any]],
        profile_embeddings: np.ndarray | None,
    ) -> DisinfoItem:
        if not profiles or profile_embeddings is None or self._sbert is None:
            return item

        try:
            from sklearn.metrics.pairwise import cosine_similarity

            item_text = f"{item.title} {item.summary} {' '.join(item.keywords)}"
            item_emb = self._sbert.encode([item_text], show_progress_bar=False)
            sims = cosine_similarity(item_emb, profile_embeddings)[0]
            best_idx = int(np.argmax(sims))
            best_sim = float(sims[best_idx])

            if best_sim >= self.similarity_thr:
                item.narrative_id = profiles[best_idx].get("id")
                item.narrative_similarity = round(best_sim, 3)
                log.debug(
                    "Item %s -> narrative %s (sim=%.3f)",
                    item.item_id, item.narrative_id, best_sim,
                )
        except Exception as exc:
            log.warning("Narrative linking error: %s", exc)

        return item

    # ------------------------------------------------------------------
    # Enriquecimiento LLM
    # ------------------------------------------------------------------

    def _llm_enrich(self, item: DisinfoItem) -> dict[str, Any]:
        prompt = f"""Eres un analista de inteligencia especializado en desinformacion y operaciones de influencia.

Analiza el siguiente item detectado por un sistema de verificacion de hechos y produce un informe de inteligencia.

FUENTE: {item.source_name}
TITULO: {item.title}
RESUMEN: {item.summary[:600]}
VEREDICTO: {item.verdict}
ORIGEN INFERIDO: {item.origin}
TAXONOMIA: {item.taxonomy}
ACTORES MENCIONADOS: {', '.join(item.actors[:6]) or 'ninguno identificado'}
PALABRAS CLAVE: {', '.join(item.keywords[:8]) or 'ninguna'}

Responde SOLO con un JSON valido con esta estructura:
{{
  "narrativa_padre": "narrativa macro a la que pertenece este contenido falso (ej: 'debilitamiento institucional', 'miedo al inmigrante', 'crisis energetica fabricada')",
  "audiencia_objetivo": "publico diana principal de este contenido falso",
  "cadena_difusion": "canales y mecanismos probables de difusion (redes sociales, medios afines, canales Telegram, etc.)",
  "contramedida": "estrategia de respuesta recomendada para operadores politicos o comunicacion institucional",
  "nivel_alerta": "uno de: BAJO / MEDIO / ALTO / CRITICO",
  "razonamiento_nivel_alerta": "breve justificacion del nivel de alerta asignado",
  "indicadores_fimi": "si hay indicadores de operacion de influencia extranjera, describir brevemente; si no, escribir 'ninguno detectado'"
}}"""

        try:
            resp = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.2, "num_predict": 800},
                },
                timeout=60,
            )
            resp.raise_for_status()
            raw = resp.json().get("response", "")
            raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
            json_match = re.search(r"\{.*\}", raw, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {"raw": raw, "parse_error": True}

        except requests.exceptions.ConnectionError:
            log.warning("Ollama no disponible en %s", self.ollama_url)
            return {"error": "Ollama no disponible"}
        except Exception as exc:
            log.warning("LLM enrich error para item %s: %s", item.item_id, exc)
            return {"error": str(exc)}

    # ------------------------------------------------------------------
    # Persistencia PostgreSQL (psycopg v3)
    # ------------------------------------------------------------------

    def save_items(self, items: list[DisinfoItem]) -> int:
        """
        Persiste items enriquecidos en la tabla disinfo_items.
        Usa ON CONFLICT DO UPDATE para upsert por item_id.

        Returns numero de filas insertadas/actualizadas.
        """
        if not self.db_url or not items:
            return 0
        try:
            import psycopg  # psycopg v3
        except ImportError:
            log.error("psycopg v3 no instalado — no se pueden persistir items")
            return 0

        sql = """
            INSERT INTO disinfo_items (
                item_id, url, source_id, source_name, title, summary,
                published_at, verdict, origin, taxonomy,
                actors, keywords, raw_tags,
                narrative_id, narrative_similarity, llm_enrichment, scraped_at
            ) VALUES (
                %(item_id)s, %(url)s, %(source_id)s, %(source_name)s,
                %(title)s, %(summary)s, %(published_at)s,
                %(verdict)s, %(origin)s, %(taxonomy)s,
                %(actors)s, %(keywords)s, %(raw_tags)s,
                %(narrative_id)s, %(narrative_similarity)s,
                %(llm_enrichment)s, %(scraped_at)s
            )
            ON CONFLICT (item_id) DO UPDATE SET
                title               = EXCLUDED.title,
                summary             = EXCLUDED.summary,
                verdict             = EXCLUDED.verdict,
                origin              = EXCLUDED.origin,
                taxonomy            = EXCLUDED.taxonomy,
                actors              = EXCLUDED.actors,
                keywords            = EXCLUDED.keywords,
                narrative_id        = EXCLUDED.narrative_id,
                narrative_similarity = EXCLUDED.narrative_similarity,
                llm_enrichment      = EXCLUDED.llm_enrichment,
                scraped_at          = EXCLUDED.scraped_at
        """

        count = 0
        try:
            with psycopg.connect(self.db_url) as conn:
                with conn.cursor() as cur:
                    for item in items:
                        params = {
                            "item_id": item.item_id,
                            "url": item.url,
                            "source_id": item.source_id,
                            "source_name": item.source_name,
                            "title": item.title,
                            "summary": item.summary,
                            "published_at": item.published_at,
                            "verdict": item.verdict,
                            "origin": item.origin,
                            "taxonomy": item.taxonomy,
                            "actors": json.dumps(item.actors),
                            "keywords": json.dumps(item.keywords),
                            "raw_tags": json.dumps(item.raw_tags),
                            "narrative_id": item.narrative_id,
                            "narrative_similarity": item.narrative_similarity,
                            "llm_enrichment": json.dumps(item.llm_enrichment),
                            "scraped_at": item.scraped_at,
                        }
                        cur.execute(sql, params)
                        count += 1
                conn.commit()
        except Exception as exc:
            log.error("DB save error: %s", exc)

        return count

    def load_narrative_profiles_from_db(self) -> list[dict[str, Any]]:
        """
        Carga los perfiles narrativos desde la tabla narrative_profiles.
        Returns lista de dicts con id, label, top_keywords.
        """
        if not self.db_url:
            return []
        try:
            import psycopg
            import psycopg.rows

            with psycopg.connect(self.db_url, row_factory=psycopg.rows.dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id,
                               narrative_label AS label,
                               top_keywords
                        FROM narrative_profiles
                        ORDER BY last_analyzed_at DESC
                        LIMIT 200
                        """
                    )
                    rows = cur.fetchall()
                    return [
                        {
                            "id": r["id"],
                            "label": r["label"],
                            "top_keywords": r.get("top_keywords") or [],
                        }
                        for r in rows
                    ]
        except Exception as exc:
            log.warning("Error loading narrative profiles: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Agregacion: estadisticas de disinfo
    # ------------------------------------------------------------------

    def summary_stats(self, items: list[DisinfoItem]) -> dict[str, Any]:
        """Estadisticas agregadas sobre una lista de items."""
        if not items:
            return {}

        from collections import Counter

        verdicts = Counter(i.verdict for i in items)
        origins = Counter(i.origin for i in items)
        taxonomies = Counter(i.taxonomy for i in items)
        sources = Counter(i.source_name for i in items)
        alert_levels = Counter(
            i.llm_enrichment.get("nivel_alerta", "desconocido") for i in items
        )

        top_actors: Counter = Counter()
        for item in items:
            for actor in item.actors:
                top_actors[actor] += 1

        linked = sum(1 for i in items if i.narrative_id is not None)

        return {
            "total": len(items),
            "linked_to_narrative": linked,
            "link_rate": round(linked / len(items), 3),
            "by_verdict": dict(verdicts.most_common()),
            "by_origin": dict(origins.most_common()),
            "by_taxonomy": dict(taxonomies.most_common()),
            "by_source": dict(sources.most_common()),
            "by_alert_level": dict(alert_levels.most_common()),
            "top_actors": dict(top_actors.most_common(10)),
        }
