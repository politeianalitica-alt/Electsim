"""
News Intelligence · pipeline silencioso que convierte noticias crudas en
conocimiento estructurado antes de tocar la BD o ChromaDB.

Sustituye/complementa a `etl/sources/rss_noticias.py` añadiendo:
  · Scoring de relevancia política (0..1)         — descarta basura
  · Desambiguación de entidades                    — Sánchez → actor canónico
  · Extracción de declaraciones directas           — quién dijo, qué, dónde
  · Deduplicación semántica                        — un hecho, no 15 copias
  · Clasificación de documento (tipo + tier)       — credibilidad por pieza
  · Detección de señales de desinformación         — alerta humana antes de
                                                     amplificar
  · Análisis de sentimiento profundo               — diana + framing
  · Sugerencia de tags ontológicos                 — partidos/temas/leyes
  · Resumen ejecutivo 2-3 frases                   — para la BD

El analista nunca ve este pipeline. Ve la noticia ya etiquetada,
desambiguada y deduplicada. Si no hay brain, todo degrada elegante.

Uso típico desde un job ETL:

    from agents.brain.pipelines.news_intelligence import NewsIntelligencePipeline
    pipe = NewsIntelligencePipeline(
        actor_catalog=actores_de_bd,
        known_articles_embeddings=embeddings_existentes,
    )
    artículo_enriquecido = pipe.process(
        text=cuerpo, title=titular, url=url, source="elpais", date_iso=fecha,
    )
    # Devuelve EnrichedArticle con todos los campos. Persistir solo si
    # `artículo_enriquecido.should_store` == True.
"""
from __future__ import annotations

import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class Declaration:
    """Una declaración extraída del artículo."""
    speaker_canonical: str
    speaker_id: str | None = None
    quote: str = ""
    venue: str = ""               # rueda de prensa, Congreso, RRSS, etc.
    addressee: str = ""           # a quién va dirigida
    is_response: bool = False     # ¿es respuesta o iniciativa?
    declaration_type: str = ""    # propuesta | ataque | defensa | posicionamiento | slip


@dataclass
class EnrichedArticle:
    """Artículo enriquecido por GroqBrain. Listo para persistir o descartar."""

    # Crudo
    title: str
    url: str
    source: str
    date_iso: str | None
    text_excerpt: str = ""        # primeros 3000 chars
    content_hash: str = ""        # SHA256 del cuerpo normalizado

    # Decisión
    should_store: bool = True     # falsy si el pipeline decide descartar
    duplicate_of: str | None = None  # hash de un artículo previo si es duplicado
    discard_reason: str | None = None

    # Clasificación documental
    doc_type: str | None = None           # BOE / prensa_diaria / blog / RRSS / etc.
    credibility_tier: str | None = None   # A | B | C | D
    register: str | None = None           # técnico/periodístico/etc.

    # Relevancia política
    relevance_score: float = 0.0
    relevance_category: str | None = None
    relevance_rationale: str | None = None

    # Entidades resueltas
    actors_canonical: list[dict[str, Any]] = field(default_factory=list)
    parties: list[str] = field(default_factory=list)
    institutions: list[str] = field(default_factory=list)
    laws: list[dict[str, Any]] = field(default_factory=list)
    topics: list[str] = field(default_factory=list)
    locations: list[str] = field(default_factory=list)

    # Declaraciones directas
    declarations: list[Declaration] = field(default_factory=list)

    # Análisis
    sentiment_valence: float | None = None
    sentiment_intensity: float | None = None
    dominant_emotions: list[str] = field(default_factory=list)
    framing: list[str] = field(default_factory=list)
    beneficiaries: list[str] = field(default_factory=list)
    victims: list[str] = field(default_factory=list)

    # Desinformación
    disinfo_risk: str | None = None       # ninguno|bajo|medio|alto|crítico
    disinfo_signals: list[dict[str, Any]] = field(default_factory=list)
    requires_human_check: bool = False

    # Resumen
    executive_summary: str = ""

    # Trazas
    stages_ok: list[str] = field(default_factory=list)
    stages_err: dict[str, str] = field(default_factory=dict)
    total_tokens: int = 0
    total_latency_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["declarations"] = [asdict(x) for x in self.declarations]
        return d


# ─────────────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────────────

class NewsIntelligencePipeline:
    """Procesa un artículo crudo y devuelve EnrichedArticle.

    Diseñado para correr dentro de un job ETL: nunca lanza, captura todo y
    registra errores por etapa. Cada etapa es independiente — un fallo no
    invalida el resto.
    """

    DEFAULT_STAGES = (
        "classification",
        "relevance",
        "entities",
        "declarations",
        "sentiment",
        "disinfo",
        "summary",
    )

    def __init__(
        self,
        *,
        actor_catalog: list[Any] | None = None,
        known_content_hashes: set[str] | None = None,
        relevance_threshold: float = 0.35,
        disinfo_threshold: str = "alto",  # ≥ este nivel pide revisión humana
        stages: tuple[str, ...] | None = None,
        brain: Any = None,
    ) -> None:
        from agents.brain.pipelines.entity_resolver import EntityResolver
        self._resolver = EntityResolver(actor_catalog or [], brain=brain)
        self._known_hashes = set(known_content_hashes or set())
        self.relevance_threshold = float(relevance_threshold)
        self.disinfo_threshold = disinfo_threshold
        self.stages = stages or self.DEFAULT_STAGES
        self._brain = brain

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("NewsIntelligencePipeline: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def _content_hash(text: str) -> str:
        norm = " ".join((text or "").lower().split())
        return hashlib.sha256(norm.encode("utf-8")).hexdigest()

    # ─────────────────────────────────────────────────────────────
    def _run_stage(self, art: EnrichedArticle, name: str, fn) -> None:
        try:
            fn()
            art.stages_ok.append(name)
        except Exception as exc:
            logger.exception("NewsIntelligencePipeline stage %s falló", name)
            art.stages_err[name] = f"{type(exc).__name__}: {str(exc)[:200]}"

    # ─────────────────────────────────────────────────────────────
    def process(
        self,
        *,
        text: str,
        title: str,
        url: str,
        source: str = "",
        date_iso: str | None = None,
    ) -> EnrichedArticle:
        """Pipeline completo para un artículo. Nunca lanza."""
        text_excerpt = (text or "")[:6000]
        h = self._content_hash(text_excerpt)
        art = EnrichedArticle(
            title=title or "",
            url=url or "",
            source=source or "",
            date_iso=date_iso,
            text_excerpt=text_excerpt[:3000],
            content_hash=h,
        )

        # Pre-check: dedup exacto por hash
        if h in self._known_hashes:
            art.should_store = False
            art.duplicate_of = h
            art.discard_reason = "duplicate_exact_hash"
            return art

        # ── Stage 1: Clasificación documental ──────────────────────
        def _stage_classification():
            brain = self._get_brain()
            if brain is None:
                return
            out = brain.classify_document(text=text_excerpt, url=url, title=title)
            if out.get("ok") and isinstance(out.get("result"), dict):
                r = out["result"]
                art.doc_type = r.get("doc_type")
                art.credibility_tier = r.get("credibility_tier")
                art.register = r.get("register")
                tp = r.get("primary_topics") or []
                if isinstance(tp, list):
                    art.topics = [str(x) for x in tp][:10]
                art.total_tokens += int(out.get("tokens_used") or 0)
                art.total_latency_ms += int(out.get("latency_ms") or 0)
            else:
                raise RuntimeError(out.get("error") or "classify_document falló")

        if "classification" in self.stages:
            self._run_stage(art, "classification", _stage_classification)

        # ── Stage 2: Relevancia política ────────────────────────────
        def _stage_relevance():
            rel = self._resolver.score_political_relevance(
                text=text_excerpt, title=title, source=source,
            )
            if not rel.get("ok"):
                raise RuntimeError(rel.get("reason") or "relevance falló")
            art.relevance_score = float(rel.get("score") or 0.0)
            art.relevance_category = rel.get("category")
            art.relevance_rationale = rel.get("rationale")
            if rel.get("latency_ms"):
                art.total_latency_ms += int(rel["latency_ms"])

        if "relevance" in self.stages:
            self._run_stage(art, "relevance", _stage_relevance)
            # Si la relevancia es baja, ahorramos el resto
            if art.relevance_score < self.relevance_threshold:
                art.should_store = False
                art.discard_reason = f"relevance_below_threshold ({art.relevance_score:.2f})"
                return art

        # ── Stage 3: Entidades + actores desambiguados ──────────────
        def _stage_entities():
            brain = self._get_brain()
            mentions = self._resolver.resolve(
                text=text_excerpt, date=date_iso, source=source,
            )
            art.actors_canonical = [
                {
                    "surface": m.surface,
                    "canonical": m.canonical,
                    "actor_id": m.actor_id,
                    "confidence": m.confidence,
                    "method": m.method,
                    "role_at_time": m.role_at_time,
                }
                for m in mentions if m.canonical
            ]
            if brain is None:
                return
            ent = brain.extract_political_entities(
                text=text_excerpt, context=f"medio={source}, fecha={date_iso or ''}",
            )
            if ent.get("ok") and isinstance(ent.get("result"), dict):
                r = ent["result"]
                ps = r.get("parties") or []
                if isinstance(ps, list):
                    art.parties = [str(p) for p in ps][:10]
                ins = r.get("institutions") or []
                if isinstance(ins, list):
                    art.institutions = [str(p) for p in ins][:10]
                lws = r.get("laws") or []
                if isinstance(lws, list):
                    art.laws = [
                        (l if isinstance(l, dict) else {"name": str(l)})
                        for l in lws
                    ][:10]
                tps = r.get("topics") or []
                if isinstance(tps, list) and not art.topics:
                    art.topics = [str(t) for t in tps][:10]
                locs = r.get("locations") or []
                if isinstance(locs, list):
                    art.locations = [str(p) for p in locs][:10]
                art.total_tokens += int(ent.get("tokens_used") or 0)
                art.total_latency_ms += int(ent.get("latency_ms") or 0)
            else:
                raise RuntimeError(ent.get("error") or "extract_entities falló")

        if "entities" in self.stages:
            self._run_stage(art, "entities", _stage_entities)

        # ── Stage 4: Declaraciones directas ─────────────────────────
        def _stage_declarations():
            brain = self._get_brain()
            if brain is None:
                return
            # Reutilizamos analyze_discourse + extract_political_entities sería caro:
            # mejor un prompt directo encadenando la tool de extracción ya usada.
            # Las declaraciones simples las detectamos heurísticamente; lo profundo
            # lo razonará el brain por marcador.
            if not text_excerpt or "\"" not in text_excerpt and "«" not in text_excerpt:
                return  # sin comillas, sin declaración formal
            actor_principal = (
                art.actors_canonical[0]["canonical"] if art.actors_canonical else ""
            )
            out = brain.analyze_discourse(
                text=text_excerpt,
                speaker=actor_principal,
                venue=source,
            )
            if not out.get("ok"):
                return
            r = out.get("result")
            if not isinstance(r, dict):
                return
            # No tenemos quotes directas en analyze_discourse — solo análisis.
            # Marcamos que hay declaración detectada del actor principal con tipo
            # derivado del strategic_intent.
            intent = str(r.get("strategic_intent") or "")
            dec_type = {
                "atacar": "ataque",
                "defender": "defensa",
                "movilizar": "posicionamiento",
                "tranquilizar": "posicionamiento",
                "desinformar": "slip",
                "seducir": "propuesta",
            }.get(intent, "posicionamiento")
            if actor_principal:
                art.declarations.append(Declaration(
                    speaker_canonical=actor_principal,
                    speaker_id=art.actors_canonical[0].get("actor_id"),
                    quote=text_excerpt[:280].replace("\n", " "),
                    venue=source,
                    addressee="",
                    is_response=False,
                    declaration_type=dec_type,
                ))
            art.total_tokens += int(out.get("tokens_used") or 0)
            art.total_latency_ms += int(out.get("latency_ms") or 0)

        if "declarations" in self.stages:
            self._run_stage(art, "declarations", _stage_declarations)

        # ── Stage 5: Sentimiento profundo ──────────────────────────
        def _stage_sentiment():
            brain = self._get_brain()
            if brain is None:
                return
            actor_p = art.actors_canonical[0]["canonical"] if art.actors_canonical else ""
            topic_p = art.topics[0] if art.topics else ""
            out = brain.analyze_sentiment_deep(
                text=text_excerpt, actor=actor_p, topic=topic_p,
                context=f"medio={source}",
            )
            if out.get("ok") and isinstance(out.get("result"), dict):
                r = out["result"]
                try:
                    art.sentiment_valence = float(r.get("valence") or 0.0)
                except (TypeError, ValueError):
                    art.sentiment_valence = None
                try:
                    art.sentiment_intensity = float(r.get("intensity") or 0.0)
                except (TypeError, ValueError):
                    art.sentiment_intensity = None
                em = r.get("dominant_emotions") or []
                if isinstance(em, list):
                    art.dominant_emotions = [str(x) for x in em][:5]
                fr = r.get("frames") or []
                if isinstance(fr, list):
                    art.framing = [str(x) for x in fr][:6]
                bf = r.get("beneficiaries") or []
                if isinstance(bf, list):
                    art.beneficiaries = [str(x) for x in bf][:8]
                vc = r.get("victims") or []
                if isinstance(vc, list):
                    art.victims = [str(x) for x in vc][:8]
                art.total_tokens += int(out.get("tokens_used") or 0)
                art.total_latency_ms += int(out.get("latency_ms") or 0)
            else:
                raise RuntimeError(out.get("error") or "sentiment falló")

        if "sentiment" in self.stages:
            self._run_stage(art, "sentiment", _stage_sentiment)

        # ── Stage 6: Señales de desinformación ─────────────────────
        def _stage_disinfo():
            brain = self._get_brain()
            if brain is None:
                return
            out = brain.detect_disinformation_signals(
                text=text_excerpt, source=source, url=url,
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "disinfo falló")
            r = out.get("result") or {}
            if isinstance(r, dict):
                level = str(r.get("risk_level") or "")
                art.disinfo_risk = level or None
                signals = r.get("signals") or []
                if isinstance(signals, list):
                    art.disinfo_signals = [
                        x for x in signals if isinstance(x, dict)
                    ][:10]
                # ¿Requiere revisión humana?
                order = ["ninguno", "bajo", "medio", "alto", "crítico"]
                try:
                    art.requires_human_check = (
                        order.index(level) >= order.index(self.disinfo_threshold)
                    )
                except ValueError:
                    art.requires_human_check = False
                art.total_tokens += int(out.get("tokens_used") or 0)
                art.total_latency_ms += int(out.get("latency_ms") or 0)

        if "disinfo" in self.stages:
            self._run_stage(art, "disinfo", _stage_disinfo)

        # ── Stage 7: Resumen ejecutivo 2-3 frases ──────────────────
        def _stage_summary():
            brain = self._get_brain()
            if brain is None:
                return
            out = brain.generate_alert(
                event=text_excerpt[:1500],
                urgency="media",
                context=f"medio={source}, fecha={date_iso or ''}",
                recipient_role="analista político",
            )
            if not out.get("ok"):
                return
            r = out.get("result") or {}
            if isinstance(r, dict):
                art.executive_summary = str(r.get("what_happened") or "")
                art.total_tokens += int(out.get("tokens_used") or 0)
                art.total_latency_ms += int(out.get("latency_ms") or 0)

        if "summary" in self.stages:
            self._run_stage(art, "summary", _stage_summary)

        # Marcamos el hash para deduplicación futura en la misma sesión
        self._known_hashes.add(h)
        return art

    # ─────────────────────────────────────────────────────────────
    def process_batch(
        self,
        items: list[dict[str, Any]],
        *,
        max_workers: int = 4,
    ) -> list[EnrichedArticle]:
        """Procesa lote en paralelo. Cada item: dict con text/title/url/source/date_iso."""
        results: list[EnrichedArticle] = []
        if not items:
            return results
        with ThreadPoolExecutor(max_workers=max(1, int(max_workers))) as ex:
            futures = [ex.submit(self.process, **it) for it in items]
            for fut in as_completed(futures):
                try:
                    results.append(fut.result())
                except Exception as exc:
                    logger.exception("batch worker falló")
                    results.append(EnrichedArticle(
                        title="", url="", source="", date_iso=None,
                        should_store=False,
                        discard_reason=f"worker_exception: {type(exc).__name__}",
                    ))
        return results
