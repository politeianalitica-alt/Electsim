"""
Smart Ingestion Pipeline · ingesta razonada por GroqBrain.

Filosofía: cada documento que entra en el sistema pasa por un razonamiento
estructurado antes de quedar disponible. No es un dato bruto: es información
clasificada, con entidades extraídas, con tier de credibilidad y con riesgos
señalados.

Cinco etapas por documento:
  1. classify_document      → doc_type, register, credibility_tier
  2. extract_political_entities → actores, partidos, leyes, eventos, lugares
  3. identify_source_relevance → si la fuente es desconocida, ¿debe seguir?
  4. detect_disinformation_signals → flags de riesgo (siempre humano decide)
  5. analyze_sentiment_deep → marco emocional, beneficiarios, víctimas

Las etapas son independientes: si una falla, el resto continúa. El resultado
final es un dict `IngestedDocument` que se puede persistir o devolver.

Uso típico desde un connector:

    from agents.brain.pipelines.smart_ingestion import (
        SmartIngestionPipeline, IngestedDocument,
    )
    pipe = SmartIngestionPipeline()
    enriched = pipe.process_one(text, url, source_name, title=titulo)
    # enriched.classification, .entities, .relevance, .disinfo, .sentiment

Y para lotes:
    results = pipe.process_batch([{...}, {...}], max_workers=4)
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class IngestedDocument:
    """Documento crudo enriquecido por el brain."""

    # Crudo
    text: str
    url: str = ""
    title: str = ""
    source_name: str = ""
    fetched_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Enriquecimiento (los `result` originales del brain — dicts normalizados)
    classification: dict[str, Any] | None = None
    entities: dict[str, Any] | None = None
    relevance: dict[str, Any] | None = None
    disinfo: dict[str, Any] | None = None
    sentiment: dict[str, Any] | None = None

    # Resumen rápido derivado (para indexar/filtrar sin re-parsear)
    doc_type: str | None = None
    credibility_tier: str | None = None
    risk_level: str | None = None
    actors: list[str] = field(default_factory=list)
    parties: list[str] = field(default_factory=list)
    topics: list[str] = field(default_factory=list)
    laws: list[str] = field(default_factory=list)
    valence: float | None = None
    intensity: float | None = None

    # Trazas
    stages_ok: list[str] = field(default_factory=list)
    stages_err: dict[str, str] = field(default_factory=dict)
    total_latency_ms: int = 0
    total_tokens_used: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def summary_line(self) -> str:
        """Resumen 1-línea para logs / debug."""
        parts = [
            f"[{self.doc_type or '?'}/{self.credibility_tier or '?'}]",
            f"actors={len(self.actors)}",
            f"parties={','.join(self.parties[:3]) or '-'}",
            f"risk={self.risk_level or '?'}",
            f"sent={self.valence:+.2f}" if self.valence is not None else "sent=-",
            f"({self.total_latency_ms}ms, {self.total_tokens_used}tok)",
        ]
        return " ".join(parts)


# ─────────────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────────────

class SmartIngestionPipeline:
    """Pipeline de enriquecimiento por GroqBrain.

    Stages se ejecutan secuencialmente sobre un documento; cada stage es
    opcional (puedes desactivarlo). Si el brain no está disponible, la
    pipeline degrada elegante (deja campos a None y registra error).
    """

    DEFAULT_STAGES = (
        "classification",
        "entities",
        "relevance",
        "disinfo",
        "sentiment",
    )

    def __init__(
        self,
        *,
        stages: tuple[str, ...] | None = None,
        known_sources: set[str] | None = None,
        topic_focus: str = "política española",
        brain: Any = None,
    ) -> None:
        self.stages = stages or self.DEFAULT_STAGES
        self.known_sources = {s.lower() for s in (known_sources or set())}
        self.topic_focus = topic_focus
        self._brain = brain  # lazy

    # ─────────────────────────────────────────────────────────────
    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("SmartIngestion: brain no disponible — %s", exc)
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    def process_one(
        self,
        text: str,
        *,
        url: str = "",
        title: str = "",
        source_name: str = "",
        source_excerpt: str | None = None,
    ) -> IngestedDocument:
        """Procesa un documento. Nunca lanza excepción."""
        doc = IngestedDocument(
            text=str(text or "")[:20000],
            url=str(url or ""),
            title=str(title or ""),
            source_name=str(source_name or ""),
        )
        brain = self._get_brain()
        if brain is None:
            doc.stages_err["brain"] = "brain no disponible"
            return doc

        # Stage 1 — Clasificación de documento
        if "classification" in self.stages:
            self._safe_stage(doc, "classification", lambda: brain.classify_document(
                text=doc.text, url=doc.url, title=doc.title,
            ))
            if isinstance(doc.classification, dict) and isinstance(doc.classification.get("result"), dict):
                r = doc.classification["result"]
                doc.doc_type = str(r.get("doc_type") or "") or None
                doc.credibility_tier = str(r.get("credibility_tier") or "") or None
                tp = r.get("primary_topics") or []
                if isinstance(tp, list):
                    doc.topics = [str(x) for x in tp][:10]

        # Stage 2 — Entidades políticas
        if "entities" in self.stages:
            self._safe_stage(doc, "entities", lambda: brain.extract_political_entities(
                text=doc.text, context=f"medio={doc.source_name}",
            ))
            if isinstance(doc.entities, dict) and isinstance(doc.entities.get("result"), dict):
                r = doc.entities["result"]
                acs = r.get("actors") or []
                if isinstance(acs, list):
                    doc.actors = [
                        (a.get("name") if isinstance(a, dict) else str(a))
                        for a in acs if a
                    ][:15]
                ps = r.get("parties") or []
                if isinstance(ps, list):
                    doc.parties = [str(p) for p in ps][:10]
                ls = r.get("laws") or []
                if isinstance(ls, list):
                    doc.laws = [
                        (l.get("name") if isinstance(l, dict) else str(l))
                        for l in ls if l
                    ][:10]

        # Stage 3 — Relevancia de fuente
        # I7 · Si source_name está vacío, lo marcamos en stages_err en lugar
        # de saltarlo silenciosamente (un doc sin fuente debería ser visible).
        if "relevance" in self.stages:
            if not doc.source_name:
                doc.stages_err["relevance"] = "skipped: source_name vacío (documento sin metadata de origen)"
            elif doc.source_name.lower() in self.known_sources:
                doc.stages_err["relevance"] = f"skipped: fuente conocida ({doc.source_name})"
            else:
                self._safe_stage(doc, "relevance", lambda: brain.identify_source_relevance(
                    source_url=doc.url,
                    source_title=doc.title,
                    source_excerpt=source_excerpt or doc.text[:2000],
                    topic_focus=self.topic_focus,
                ))

        # Stage 4 — Señales de desinformación
        # A7 · Pasamos cross_check_summary derivado de las entidades extraídas
        # cuando es posible. Si no hay nada que cruzar, lo marcamos explícito
        # ('not_available') para que el modelo no asuma cross-check positivo.
        if "disinfo" in self.stages:
            cross_check = self._build_cross_check_summary(doc)
            self._safe_stage(doc, "disinfo", lambda: brain.detect_disinformation_signals(
                text=doc.text,
                source=doc.source_name,
                url=doc.url,
                cross_check_summary=cross_check,
            ))
            if isinstance(doc.disinfo, dict) and isinstance(doc.disinfo.get("result"), dict):
                doc.risk_level = str(doc.disinfo["result"].get("risk_level") or "") or None

        # Stage 5 — Sentimiento profundo
        if "sentiment" in self.stages:
            actor_principal = doc.actors[0] if doc.actors else ""
            topic_principal = doc.topics[0] if doc.topics else ""
            self._safe_stage(doc, "sentiment", lambda: brain.analyze_sentiment_deep(
                text=doc.text,
                actor=actor_principal,
                topic=topic_principal,
                context=f"medio={doc.source_name}",
            ))
            if isinstance(doc.sentiment, dict) and isinstance(doc.sentiment.get("result"), dict):
                r = doc.sentiment["result"]
                try:
                    doc.valence = float(r.get("valence") or 0.0)
                except (TypeError, ValueError):
                    doc.valence = None
                try:
                    doc.intensity = float(r.get("intensity") or 0.0)
                except (TypeError, ValueError):
                    doc.intensity = None

        return doc

    # ─────────────────────────────────────────────────────────────
    def _safe_stage(
        self,
        doc: IngestedDocument,
        stage_name: str,
        fn: Callable[[], dict[str, Any]],
    ) -> None:
        """Ejecuta una stage y registra metadata. Captura todo error."""
        try:
            out = fn() or {}
            setattr(doc, stage_name, out)
            if out.get("ok"):
                doc.stages_ok.append(stage_name)
                doc.total_latency_ms += int(out.get("latency_ms") or 0)
                doc.total_tokens_used += int(out.get("tokens_used") or 0)
            else:
                doc.stages_err[stage_name] = str(out.get("error") or "unknown")[:200]
        except Exception as exc:
            logger.exception("Stage %s falló", stage_name)
            doc.stages_err[stage_name] = f"{type(exc).__name__}: {str(exc)[:200]}"

    # ─────────────────────────────────────────────────────────────
    def _build_cross_check_summary(self, doc: IngestedDocument) -> str:
        """A7 · Construye un cross_check_summary mínimo para detect_disinfo.

        Si tenemos entidades extraídas (stage 2 OK), las incluimos como
        contexto cruzable. Si no, devolvemos 'not_available' para que el
        modelo sepa que no debe asumir contraste con otras fuentes.
        """
        ents = doc.entities if isinstance(doc.entities, dict) else {}
        res = ents.get("result") if isinstance(ents.get("result"), dict) else {}
        actors = res.get("actors") or []
        parties = res.get("parties") or []
        laws = res.get("laws") or []
        if not (actors or parties or laws):
            return "not_available"
        bits: list[str] = []
        if actors:
            bits.append(
                "actores mencionados: " + ", ".join(
                    (a.get("name") if isinstance(a, dict) else str(a))
                    for a in actors[:5]
                )
            )
        if parties:
            bits.append("partidos: " + ", ".join(str(p) for p in parties[:5]))
        if laws:
            bits.append(
                "leyes/normas: " + ", ".join(
                    (l.get("name") if isinstance(l, dict) else str(l))
                    for l in laws[:5]
                )
            )
        bits.append("nota: contraste basado solo en entidades del mismo texto, no en otras fuentes")
        return " | ".join(bits)

    # ─────────────────────────────────────────────────────────────
    def process_batch(
        self,
        items: list[dict[str, Any]],
        *,
        max_workers: int = 2,
    ) -> list[IngestedDocument]:
        """Procesa una lista en paralelo respetando rate-limit de Groq.

        I1 · max_workers reducido a 2 por defecto: cada documento dispara 5
        stages → 5 llamadas Groq. Con 4 workers eran 20 req simultáneas, muy
        por encima del rate-limit 30/min del tier gratuito.
        El rate-limiter centralizado de `groq_client._acquire_rate_slot()`
        es el que bloquea cuando se satura — los workers simplemente esperan.
        """
        results: list[IngestedDocument] = []
        if not items:
            return results
        with ThreadPoolExecutor(max_workers=max(1, int(max_workers))) as ex:
            futures = {
                ex.submit(self.process_one, **item): i
                for i, item in enumerate(items)
            }
            for fut in as_completed(futures):
                try:
                    results.append(fut.result())
                except Exception as exc:
                    logger.exception("process_batch worker failed")
                    results.append(IngestedDocument(
                        text="", stages_err={"worker": f"{type(exc).__name__}: {str(exc)[:200]}"},
                    ))
        return results


# ─────────────────────────────────────────────────────────────────
# Helper de conveniencia para pipelines existentes
# ─────────────────────────────────────────────────────────────────

def enrich_dataframe(
    df,
    *,
    text_col: str,
    url_col: str | None = None,
    title_col: str | None = None,
    source_col: str | None = None,
    stages: tuple[str, ...] | None = None,
    max_rows: int = 50,
    max_workers: int = 4,
):
    """Enriquece un DataFrame de filas crudas con metadata del brain.

    Devuelve el mismo df + columnas: brain_doc_type, brain_tier, brain_risk,
    brain_actors, brain_parties, brain_topics, brain_valence, brain_intensity,
    brain_ok_stages.

    Importa pandas perezosamente para no obligar a quien sólo quiera
    `process_one`.
    """
    import pandas as pd  # local import
    if df is None or len(df) == 0:
        return df
    df = df.copy().head(int(max_rows)).reset_index(drop=True)
    items: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        items.append({
            "text": str(row.get(text_col) or ""),
            "url": str(row.get(url_col) or "") if url_col else "",
            "title": str(row.get(title_col) or "") if title_col else "",
            "source_name": str(row.get(source_col) or "") if source_col else "",
        })
    pipe = SmartIngestionPipeline(stages=stages)
    # I6 · enriquecemos con `(idx, title, url)` para evitar colisiones cuando
    # el mismo título+URL aparece duplicado en varios rows. process_batch
    # devuelve los docs en orden arbitrario (as_completed); cada item lleva
    # _row_idx y reasociamos por índice exacto.
    indexed_items = [{**it, "_row_idx": i} for i, it in enumerate(items)]
    # process_one no acepta _row_idx → lo extraemos antes del submit
    enriched_unordered: list[tuple[int, IngestedDocument]] = []
    with ThreadPoolExecutor(max_workers=max(1, int(max_workers))) as ex:
        future_to_idx = {}
        for it in indexed_items:
            idx = it.pop("_row_idx")
            future_to_idx[ex.submit(pipe.process_one, **it)] = idx
        for fut in as_completed(future_to_idx):
            idx = future_to_idx[fut]
            try:
                enriched_unordered.append((idx, fut.result()))
            except Exception as exc:
                logger.exception("enrich_dataframe worker idx=%s failed", idx)
                enriched_unordered.append((idx, IngestedDocument(
                    text=str(items[idx].get("text") or ""),
                    stages_err={"worker": f"{type(exc).__name__}: {str(exc)[:200]}"},
                )))
    # Reordenar por índice original
    enriched_unordered.sort(key=lambda t: t[0])
    enriched_ordered = [d for _, d in enriched_unordered]
    df["brain_doc_type"] = [d.doc_type for d in enriched_ordered]
    df["brain_tier"] = [d.credibility_tier for d in enriched_ordered]
    df["brain_risk"] = [d.risk_level for d in enriched_ordered]
    df["brain_actors"] = [",".join(d.actors[:5]) for d in enriched_ordered]
    df["brain_parties"] = [",".join(d.parties[:5]) for d in enriched_ordered]
    df["brain_topics"] = [",".join(d.topics[:5]) for d in enriched_ordered]
    df["brain_valence"] = [d.valence for d in enriched_ordered]
    df["brain_intensity"] = [d.intensity for d in enriched_ordered]
    df["brain_ok_stages"] = [len(d.stages_ok) for d in enriched_ordered]
    return df
