"""
Strategic News Intelligence Pipeline para Politeia OS.

Arquitectura de dos fases:

  Fase 1 — StrategicRelevanceFilter
    Descarta el ruido (deportes, celebrity, relleno) y puntua cada articulo
    en 5 ejes: relevancia de actor (0.30), relevancia tematica (0.30),
    saliencia del evento (0.20), novedad (0.10), credibilidad de fuente (0.10).
    Solo los articulos con score >= 0.65 pasan a la Fase 2.
    No usa LLM — es deliberadamente rapido y barato.

  Fase 2 — DeepNewsExtractor
    Sobre los articulos que pasan el filtro:
      - trafilatura: extrae texto completo limpio de la URL
      - spaCy es_core_news_lg: NER (PER/ORG/LOC)
      - pysentimiento: score de sentimiento -1..+1
      - IPTC classifier (HuggingFace): areas de politica
      - Ollama (qwen3:8b): resumen ejecutivo 3 frases + hechos verificables
      - Ollama (llama3.2:3b): enriquecimiento de entidades (cargo, partido)
      - Patron regex: extraccion de citas directas
      - Deteccion de senales estrategicas de cambio politico

Filosofia:
    Palantir Foundry usa Contention Detection + Entity Resolution en cada
    documento antes de meterlo al grafo. NationBuilder usa IQ Score para
    priorizar contactos. Aqui hacemos lo mismo con noticias: solo el 20-30%
    de los articulos de staging merece analisis profundo. El filtro de Fase 1
    garantiza que el LLM solo ve contenido que importa.
"""
from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import psycopg
import requests
from psycopg.rows import dict_row

from config.settings import get_settings

log = logging.getLogger(__name__)

_settings = get_settings()

# ── DSN helper ────────────────────────────────────────────────────────────────


def _dsn() -> str:
    return re.sub(r"postgresql\+\w+://", "postgresql://", _settings.database_url_raw)


# ── Constantes de Ollama ──────────────────────────────────────────────────────

_OLLAMA_BASE     = _settings.ollama_base_url          # http://localhost:11434
_MODEL_RESUMEN   = _settings.ollama_model_resumen     # qwen3:8b
_MODEL_ENTIDADES = _settings.ollama_model_entidades   # llama3.2:3b
_MODEL_ANALISIS  = _settings.ollama_model_analisis    # gemma3:12b
_OLLAMA_TIMEOUT  = 30                                 # segundos por llamada


# ═══════════════════════════════════════════════════════════════════════════════
# ESTRUCTURAS DE DATOS
# ═══════════════════════════════════════════════════════════════════════════════


@dataclass
class StrategicScore:
    """Score de relevancia estrategica desglosado por eje."""

    actor_relevance:    float = 0.0   # Eje 1: actores monitorizados (peso 0.30)
    topic_relevance:    float = 0.0   # Eje 2: temas estrategicos definidos (0.30)
    event_salience:     float = 0.0   # Eje 3: evento real con consecuencias (0.20)
    novelty_score:      float = 0.0   # Eje 4: frescura temporal (0.10)
    source_credibility: float = 0.0   # Eje 5: credibilidad editorial (0.10)

    @property
    def total(self) -> float:
        return (
            self.actor_relevance    * 0.30
            + self.topic_relevance  * 0.30
            + self.event_salience   * 0.20
            + self.novelty_score    * 0.10
            + self.source_credibility * 0.10
        )

    def to_dict(self) -> dict:
        return {
            "actor_relevance":    round(self.actor_relevance,    3),
            "topic_relevance":    round(self.topic_relevance,    3),
            "event_salience":     round(self.event_salience,     3),
            "novelty_score":      round(self.novelty_score,      3),
            "source_credibility": round(self.source_credibility, 3),
            "total":              round(self.total,              3),
        }


@dataclass
class ExtractedIntelligence:
    """Resultado de la extraccion profunda de un articulo estrategico."""

    # Identificacion
    article_url:  str = ""
    source_media: str = ""
    published_at: str = ""

    # Contenido
    headline:   str = ""
    full_text:  str = ""
    summary_es: str = ""   # resumen 3 frases generado por LLM

    # Entidades extraidas
    persons:       list[dict] = field(default_factory=list)  # {name, role, party, sentiment}
    organizations: list[dict] = field(default_factory=list)  # {name, type, relevance}
    locations:     list[dict] = field(default_factory=list)  # {name, type, nuts_code}

    # Clasificacion
    event_type:   str       = ""                             # votacion | declaracion | crisis ...
    policy_areas: list[str] = field(default_factory=list)   # IPTC tags

    # Analisis NLP
    sentiment:    float = 0.0    # -1 a +1
    tone_primary: str   = ""     # neutral | critico | positivo | alarmista

    # Inteligencia estructurada
    key_facts:         list[str]  = field(default_factory=list)  # hechos verificables
    direct_quotes:     list[dict] = field(default_factory=list)  # {speaker, quote, context}
    strategic_signals: list[str]  = field(default_factory=list)  # senales de cambio politico

    # Scoring
    score: Optional[StrategicScore] = None

    def to_db_dict(self) -> dict:
        return {
            "url":               self.article_url,
            "source_media":      self.source_media,
            "published_at":      self.published_at or None,
            "headline":          self.headline,
            "summary_es":        self.summary_es,
            "persons":           json.dumps(self.persons,       ensure_ascii=False),
            "organizations":     json.dumps(self.organizations, ensure_ascii=False),
            "locations":         json.dumps(self.locations,     ensure_ascii=False),
            "event_type":        self.event_type,
            "policy_areas":      json.dumps(self.policy_areas,  ensure_ascii=False),
            "sentiment":         self.sentiment,
            "tone_primary":      self.tone_primary,
            "key_facts":         json.dumps(self.key_facts,         ensure_ascii=False),
            "direct_quotes":     json.dumps(self.direct_quotes,     ensure_ascii=False),
            "strategic_signals": json.dumps(self.strategic_signals, ensure_ascii=False),
            "score_total":       self.score.total    if self.score else 0.0,
            "score_detail":      json.dumps(self.score.to_dict() if self.score else {}),
            "processed_at":      datetime.now(timezone.utc).isoformat(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# CLIENTE OLLAMA INTERNO
# ═══════════════════════════════════════════════════════════════════════════════


class _OllamaClient:
    """
    Cliente Ollama minimalista con:
      - health-check con cache de 60s
      - reintentos exponenciales (max 2)
      - extraccion robusta de JSON del response (el modelo a veces incluye
        texto de razonamiento antes del bloque JSON)
    """

    _ok: Optional[bool] = None
    _ok_ts: float = 0.0
    _OK_TTL = 60.0

    @classmethod
    def available(cls) -> bool:
        now = time.monotonic()
        if cls._ok is not None and (now - cls._ok_ts) < cls._OK_TTL:
            return cls._ok
        try:
            r = requests.get(f"{_OLLAMA_BASE}/api/tags", timeout=3)
            cls._ok = r.ok
        except Exception:
            cls._ok = False
        cls._ok_ts = now
        return cls._ok

    @classmethod
    def generate(
        cls,
        prompt: str,
        model: str = "",
        temperature: float = 0.1,
        max_tokens: int = 600,
        system: str = "",
    ) -> str:
        """Llama a /api/generate con reintento. Devuelve '' si falla."""
        if not cls.available():
            return ""
        model = model or _MODEL_RESUMEN
        payload: dict = {
            "model":  model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "top_p": 0.9,
                "repeat_penalty": 1.05,
            },
        }
        if system:
            payload["system"] = system

        for attempt in range(2):
            try:
                r = requests.post(
                    f"{_OLLAMA_BASE}/api/generate",
                    json=payload,
                    timeout=_OLLAMA_TIMEOUT,
                )
                if r.ok:
                    return r.json().get("response", "").strip()
            except Exception as exc:
                log.debug("Ollama generate attempt %d: %s", attempt + 1, exc)
                if attempt == 0:
                    time.sleep(1)
        return ""

    @classmethod
    def extract_json(cls, raw: str) -> dict:
        """
        Extrae el primer bloque JSON valido de un response Ollama.
        El modelo a veces incluye texto de razonamiento (thinking) antes del JSON.
        """
        if not raw:
            return {}
        # Intentar directo primero
        try:
            return json.loads(raw)
        except Exception:
            pass
        # Buscar bloque ```json ... ``` o { ... }
        for pattern in (r"```json\s*(.*?)\s*```", r"(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})"):
            m = re.search(pattern, raw, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    pass
        return {}


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 1: STRATEGIC RELEVANCE FILTER
# ═══════════════════════════════════════════════════════════════════════════════


class StrategicRelevanceFilter:
    """
    Puntua cada articulo en 5 ejes y descarta los que no superan el umbral.

    Rapido y sin LLM: diseñado para procesar miles de articulos por minuto.
    Los actores se cargan dinamicamente desde persona_publica en BD.
    """

    # ── Blacklist tematica: descarte inmediato ────────────────────────────────
    _NOISE_PATTERNS = [
        r"\bfutbol\b", r"\bbaloncesto\b", r"\blig(a|as)\b", r"\bchampions\b",
        r"\breal madrid\b", r"\bbarcelona fc\b", r"\bbarça\b",
        r"\bformula[\s_-]?1\b", r"\bmoto[\s_-]?gp\b",
        r"\btelevisión\b", r"\btelenovela\b", r"\bconcurso\b",
        r"\bhoroscopo\b", r"\breceta\b", r"\bcocina\b",
        r"\bmoda\b", r"\bbelleza\b", r"\bcelebrity\b", r"\bsalseo\b",
        r"\bchiste\b", r"\bhumor\b",
    ]

    # ── Temas estrategicos con peso ──────────────────────────────────────────
    _STRATEGIC_TOPICS: dict[str, float] = {
        # Electoral / politico
        "elecciones": 1.0, "votacion": 1.0, "encuesta": 0.9,
        "intencion de voto": 1.0, "coalicion": 0.9, "investidura": 1.0,
        "mocion de censura": 1.0, "presupuestos": 0.95,
        "reforma electoral": 1.0, "candidato": 0.85,
        # Defensa / seguridad
        "defensa": 1.0, "nato": 1.0, "otan": 1.0, "ejercito": 0.9,
        "ciberataque": 1.0, "terrorismo": 1.0, "guerra": 1.0,
        "conflicto armado": 1.0, "misil": 0.95,
        "ucrania": 0.9, "israel": 0.9, "iran": 0.9, "rusia": 0.9,
        # Economico-estrategico
        "ipc": 0.85, "inflacion": 0.85, "pib": 0.85, "desempleo": 0.85,
        "deuda publica": 0.9, "prima de riesgo": 0.9, "bce": 0.85,
        "aranceles": 0.9, "sanciones": 0.9, "rating": 0.85,
        # Geopolitico
        "gibraltar": 0.9, "ceuta": 0.9, "melilla": 0.9,
        "marruecos": 0.85, "cataluna": 0.9, "independencia": 0.9,
        "referendum": 1.0, "autonomia": 0.8,
        # Judicial / corrupcion
        "tribunal supremo": 0.9, "tribunal constitucional": 0.9,
        "corrupcion": 0.95, "financiacion ilegal": 1.0,
        "espionaje": 1.0, "pegasus": 1.0, "imputado": 0.9,
        "detenido": 0.85, "condena": 0.85,
    }

    # ── Actores institucionales como fallback ─────────────────────────────────
    _ACTORS_FALLBACK: frozenset[str] = frozenset({
        "sanchez", "feijoo", "abascal", "diaz", "puigdemont",
        "junqueras", "otegi", "ortuzar", "moncloa", "congreso",
        "senado", "gobierno", "pp", "psoe", "vox", "sumar",
        "junts", "pnv", "erc", "bildu", "von der leyen",
        "macron", "scholz", "meloni", "trump", "nato",
        "indra", "iberdrola", "repsol", "santander", "telefonica",
        "inditex", "bbva", "sabadell",
    })

    # ── Patrones de evento real ───────────────────────────────────────────────
    _EVENT_PATTERNS = [
        r"\banuncia\b", r"\bdeclara\b", r"\baprueba\b", r"\brechaza\b",
        r"\bdimite\b", r"\bcesa\b", r"\bnombra\b", r"\bconvoca\b",
        r"\bfirma\b", r"\bveta\b", r"\bsuspende\b",
        r"\bdetienen\b", r"\bdetenido\b", r"\bjuicio\b", r"\bcondena\b",
        r"\bmanifestacion\b", r"\bhuelga\b", r"\bprotesta\b",
        r"\bpacto\b", r"\bacuerdo\b", r"\bcrisis\b",
        r"\bvotacion\b", r"\baprobacion\b",
    ]

    # ── Credibilidad de fuentes ───────────────────────────────────────────────
    _SOURCE_CREDIBILITY: dict[str, float] = {
        "el_pais": 0.95, "el_mundo": 0.90, "abc": 0.85,
        "la_vanguardia": 0.90, "el_confidencial": 0.88,
        "politico_eu": 0.95, "expansion": 0.88,
        "eldiario": 0.82, "la_razon": 0.80,
        "el_espanol": 0.78, "okdiario": 0.55,
        "efe": 0.95, "reuters": 0.97, "ap": 0.97,
        "boe": 1.0, "congreso": 1.0, "europarl_votes": 1.0,
        "consejo_ue": 1.0, "nato_press": 0.98,
        "_default": 0.60,
    }

    def __init__(self) -> None:
        self._noise_re   = [re.compile(p, re.I | re.U) for p in self._NOISE_PATTERNS]
        self._event_re   = [re.compile(p, re.I | re.U) for p in self._EVENT_PATTERNS]
        self._actors:  set[str] = set()
        self._actors_loaded = False

    def _ensure_actors(self) -> None:
        if self._actors_loaded:
            return
        try:
            with psycopg.connect(_dsn(), row_factory=dict_row) as conn:
                rows = conn.execute(
                    """
                    SELECT LOWER(nombre_completo) AS nombre,
                           LOWER(COALESCE(partido, '')) AS partido
                    FROM persona_publica
                    WHERE activo = TRUE
                    """
                ).fetchall()
            for r in rows:
                nombre = r["nombre"]
                self._actors.add(nombre)
                parts = nombre.split()
                if len(parts) >= 2:
                    self._actors.add(parts[0])        # nombre
                    self._actors.add(parts[-1])       # primer apellido
                if r["partido"]:
                    self._actors.add(r["partido"])
            log.debug("StrategicFilter: %d tokens de actores cargados", len(self._actors))
        except Exception as exc:
            log.debug("actor load fallback: %s", exc)
            self._actors = set(self._ACTORS_FALLBACK)
        self._actors_loaded = True

    def _is_noise(self, text: str) -> bool:
        return any(p.search(text) for p in self._noise_re)

    def score_article(
        self,
        title: str,
        text: str,
        source: str,
        published_at: str = "",
    ) -> StrategicScore:
        self._ensure_actors()
        corpus = (title + " " + text[:2000]).lower()
        s = StrategicScore()

        # Eje 1: actores monitorizados
        hits = sum(
            1 for a in self._actors
            if len(a) > 3 and a in corpus
        )
        s.actor_relevance = min(hits / 3.0, 1.0)

        # Eje 2: temas estrategicos (top-3 para no inflar con densidad de keywords)
        topic_hits = [w for kw, w in self._STRATEGIC_TOPICS.items() if kw in corpus]
        if topic_hits:
            top3 = sorted(topic_hits, reverse=True)[:3]
            s.topic_relevance = min(sum(top3) / 3.0, 1.0)

        # Eje 3: saliencia de evento
        event_hits = sum(1 for p in self._event_re if p.search(corpus))
        s.event_salience = min(event_hits / 4.0, 1.0)

        # Eje 4: novedad temporal
        if published_at:
            try:
                pub = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                if pub.tzinfo is None:
                    pub = pub.replace(tzinfo=timezone.utc)
                hours_old = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
                # < 6h = 1.0 / > 48h = 0.2 / lineal entre medias
                s.novelty_score = max(0.2, min(1.0, 1.0 - (hours_old / 60)))
            except Exception:
                s.novelty_score = 0.5
        else:
            s.novelty_score = 0.5

        # Eje 5: credibilidad de fuente
        s.source_credibility = self._SOURCE_CREDIBILITY.get(
            source.lower().replace(" ", "_"),
            self._SOURCE_CREDIBILITY["_default"],
        )

        return s

    def filter_batch(
        self,
        articles: list[dict],
        threshold: float = 0.65,
    ) -> list[tuple[dict, StrategicScore]]:
        """
        Filtra articulos y devuelve (article, score) para los que superan el umbral.
        """
        passed: list[tuple[dict, StrategicScore]] = []
        n_noise = n_low = 0

        for art in articles:
            title  = art.get("title", "")
            text   = art.get("summary", "") or art.get("raw", "")
            source = art.get("source", "") or art.get("media", "")
            pub_at = art.get("published_at", "")

            if self._is_noise(title + " " + text[:300]):
                n_noise += 1
                continue

            sc = self.score_article(title, text, source, pub_at)
            if sc.total >= threshold:
                passed.append((art, sc))
            else:
                n_low += 1

        log.info(
            "StrategicFilter: %d/%d pasan filtro (descartados ruido=%d score_bajo=%d)",
            len(passed), len(articles), n_noise, n_low,
        )
        return passed


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 2: DEEP NEWS EXTRACTOR
# ═══════════════════════════════════════════════════════════════════════════════


class DeepNewsExtractor:
    """
    Extrae inteligencia estructurada de los articulos que pasan el filtro.

    Pipeline:
      1. trafilatura — texto completo limpio desde URL
      2. spaCy NER   — personas, organizaciones, lugares
      3. Ollama (llama3.2:3b) — enriquecimiento de entidades: cargo + partido
      4. pysentimiento — score sentimiento -1..+1
      5. IPTC classifier — areas de politica publica
      6. Regex — citas directas con atribucion periodistica
      7. Regex — senales de cambio estrategico
      8. Ollama (qwen3:8b) — resumen ejecutivo 3 frases + hechos verificables
    """

    # ── Tipos de evento ──────────────────────────────────────────────────────
    _EVENT_TYPE_PATTERNS: dict[str, str] = {
        "declaracion":   r"declara|afirma|asegura|señala|sostiene|dice\b",
        "votacion":      r"vota|aprueba|rechaza|mayoría|enmienda|sesión plenaria",
        "nombramiento":  r"nombra|designa|nombrado|cesa|dimite|renuncia|releva",
        "acuerdo_pacto": r"pacto|acuerdo|coalicion|alianza|firma|suscribe",
        "escandalo":     r"escandalo|corrupcion|imputado|deteni|juicio|investigado",
        "crisis":        r"crisis|ruptura|fractura|colapso|urgencia|estado de alarma",
        "movilizacion":  r"manifestacion|huelga|protesta|movilizacion|paro",
        "electoral":     r"elecciones|convoca|campana|candidato|sondeo|papeleta",
        "legislativo":   r"ley|decreto|reforma|proyecto de ley|presupuesto|boe",
        "judicial":      r"sentencia|tribunal|condena|absolucion|recurso|auto",
        "internacional": r"cumbre|visita oficial|tratado|sancion internacional|veto",
    }

    # ── Senales de cambio estrategico ────────────────────────────────────────
    _SIGNAL_PATTERNS: dict[str, str] = {
        "cambio_posicion":        r"cambia|giro|rectifica|da marcha atras|matiza",
        "tension_coalicion":      r"fractura|tension|discrepancia|enfrentamiento interno",
        "amenaza_electoral":      r"anticipa|adelanta|convoca|elecciones anticipadas",
        "riesgo_institucional":   r"constitucional|golpe|democracia|estado de derecho",
        "movimiento_internacional": r"embajador|expulsion|sanciones|alianza nueva",
        "escandalo_emergente":    r"filtracion|grabacion|documentos|investigacion abierta",
        "impacto_economico":      r"mercados|bolsa|prima de riesgo|rebaja rating|moody",
    }

    # ── System prompts Ollama ─────────────────────────────────────────────────
    _SYSTEM_EXTRACTOR = (
        "Eres un analista de inteligencia politica espanola. "
        "Extraes informacion estructurada de articulos de prensa con maxima precision. "
        "Responde SIEMPRE y UNICAMENTE con JSON valido, sin texto adicional antes ni despues. "
        "No incluyas bloques de razonamiento. Solo el JSON."
    )

    _SYSTEM_ENRICHER = (
        "Eres un experto en politica espanola. "
        "Identificas cargos y afiliaciones politicas de personas mencionadas en textos. "
        "Responde SIEMPRE y UNICAMENTE con JSON valido."
    )

    def __init__(self) -> None:
        self._nlp      = None   # lazy: spaCy
        self._analyzer = None   # lazy: pysentimiento
        self._iptc     = None   # lazy: IPTC classifier
        self._event_re = {
            k: re.compile(v, re.I | re.U)
            for k, v in self._EVENT_TYPE_PATTERNS.items()
        }
        self._signal_re = {
            k: re.compile(v, re.I | re.U)
            for k, v in self._SIGNAL_PATTERNS.items()
        }

    # ── Lazy loaders ─────────────────────────────────────────────────────────

    @property
    def nlp(self):
        if self._nlp is None:
            try:
                import spacy
                self._nlp = spacy.load("es_core_news_lg")
                log.debug("spaCy es_core_news_lg cargado")
            except Exception as exc:
                log.warning("spaCy no disponible: %s", exc)
                self._nlp = False
        return self._nlp

    @property
    def sentiment_analyzer(self):
        if self._analyzer is None:
            try:
                from pysentimiento import create_analyzer
                self._analyzer = create_analyzer(task="sentiment", lang="es")
                log.debug("pysentimiento cargado")
            except Exception:
                self._analyzer = False
        return self._analyzer

    @property
    def iptc_classifier(self):
        if self._iptc is None:
            try:
                from transformers import pipeline as hf_pipeline
                self._iptc = hf_pipeline(
                    "text-classification",
                    model="TajaKuzman/IPTC-Media-Topic-Classification",
                    top_k=3,
                )
                log.debug("IPTC classifier cargado")
            except Exception as exc:
                log.debug("IPTC classifier no disponible: %s", exc)
                self._iptc = False
        return self._iptc

    # ── Texto completo via trafilatura ────────────────────────────────────────

    def _fetch_full_text(self, url: str) -> str:
        if not url or not url.startswith("http"):
            return ""
        try:
            import trafilatura
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                text = trafilatura.extract(
                    downloaded,
                    include_comments=False,
                    include_tables=False,
                    favor_precision=True,
                )
                return text or ""
        except Exception as exc:
            log.debug("trafilatura %s: %s", url, exc)
        return ""

    # ── NER con spaCy ────────────────────────────────────────────────────────

    def _extract_entities_spacy(
        self, text: str
    ) -> tuple[list[dict], list[dict], list[dict]]:
        if not self.nlp or not text:
            return [], [], []
        try:
            doc = self.nlp(text[:5000])
            persons: list[dict] = []
            orgs:    list[dict] = []
            locs:    list[dict] = []
            seen: set[tuple] = set()

            for ent in doc.ents:
                key = (ent.label_, ent.text.strip())
                if key in seen or len(ent.text.strip()) < 3:
                    continue
                seen.add(key)
                ctx = text[max(0, ent.start_char - 80): ent.end_char + 80].strip()

                if ent.label_ == "PER":
                    persons.append({"name": ent.text.strip(), "context": ctx,
                                    "role": "", "party": ""})
                elif ent.label_ == "ORG":
                    orgs.append({"name": ent.text.strip(), "type": "organizacion",
                                 "relevance": 1.0})
                elif ent.label_ in ("LOC", "GPE"):
                    locs.append({"name": ent.text.strip(), "type": ent.label_})

            return persons[:15], orgs[:10], locs[:8]
        except Exception as exc:
            log.debug("spaCy NER: %s", exc)
            return [], [], []

    # ── Enriquecimiento de entidades con Ollama ───────────────────────────────

    def _enrich_persons_ollama(
        self, persons: list[dict], text: str
    ) -> list[dict]:
        """
        Usa llama3.2:3b para identificar cargo y partido de cada persona.
        Rapido y barato — modelo pequeno, prompt corto.
        """
        if not persons or not _OllamaClient.available():
            return persons

        names = [p["name"] for p in persons[:8]]  # limite para no sobrecargar
        prompt = (
            f"TEXTO:\n{text[:1500]}\n\n"
            f"PERSONAS MENCIONADAS: {json.dumps(names, ensure_ascii=False)}\n\n"
            "Para cada persona, identifica su cargo actual y partido politico "
            "basandote SOLO en el texto. Si no se menciona, deja el campo vacio.\n\n"
            "Responde SOLO con este JSON (sin texto adicional):\n"
            '{"personas": [{"name": "...", "role": "...", "party": ""}]}'
        )
        raw = _OllamaClient.generate(
            prompt,
            model=_MODEL_ENTIDADES,
            temperature=0.05,
            max_tokens=400,
            system=self._SYSTEM_ENRICHER,
        )
        parsed = _OllamaClient.extract_json(raw)
        enriched = parsed.get("personas", [])

        # Merge: preservar lo que extrae Ollama sobre lo que extrae spaCy
        name_map = {p["name"].lower(): p for p in enriched}
        for p in persons:
            key = p["name"].lower()
            if key in name_map:
                p["role"]  = name_map[key].get("role", "")
                p["party"] = name_map[key].get("party", "")
        return persons

    # ── Deteccion de tipo de evento ───────────────────────────────────────────

    def _detect_event_type(self, text: str) -> str:
        scores: dict[str, int] = {}
        t = text.lower()
        for etype, pattern in self._event_re.items():
            n = len(pattern.findall(t))
            if n:
                scores[etype] = n
        return max(scores, key=lambda k: scores[k]) if scores else "informacion_general"

    # ── Senales estrategicas ──────────────────────────────────────────────────

    def _detect_signals(self, text: str) -> list[str]:
        t = text.lower()
        return [sig for sig, p in self._signal_re.items() if p.search(t)]

    # ── Citas directas ────────────────────────────────────────────────────────

    def _extract_quotes(self, text: str, persons: list[dict]) -> list[dict]:
        pattern = re.compile(
            r'["“«]([^”»"]{20,300})["”»]'
            r'[^.]{0,100}'
            r'(?:segun|dijo|afirmo|señalo|declaro|aseguro|explico|indico)\s+'
            r'([A-Z\xc1\xc9\xcd\xd3\xda][a-z\xe1\xe9\xed\xf3\xfa\xf1]+'
            r'(?:\s+[A-Z\xc1\xc9\xcd\xd3\xda][a-z\xe1\xe9\xed\xf3\xfa\xf1]+){1,3})',
            re.IGNORECASE,
        )
        known_names = {p["name"].lower() for p in persons}
        quotes: list[dict] = []
        for m in pattern.finditer(text):
            speaker = m.group(2).strip()
            known   = speaker.lower() in known_names or any(
                n in speaker.lower() for n in known_names
            )
            quotes.append({
                "speaker":      speaker,
                "quote":        m.group(1).strip(),
                "known_person": known,
                "context":      m.group(0)[:200],
            })
        return quotes[:5]

    # ── Sentimiento ───────────────────────────────────────────────────────────

    def _analyze_sentiment(self, text: str) -> tuple[float, str]:
        if self.sentiment_analyzer and self.sentiment_analyzer is not False:
            try:
                result = self.sentiment_analyzer.predict(text[:512])
                score  = result.probas.get("POS", 0) - result.probas.get("NEG", 0)
                tone   = {"POS": "positivo", "NEG": "critico",
                          "NEU": "neutral"}.get(result.output, "neutral")
                return round(score, 3), tone
            except Exception:
                pass
        # Fallback lexico minimo
        POSITIVAS = ["acuerdo", "aprueba", "logro", "avance", "respaldo"]
        NEGATIVAS = ["crisis", "dimite", "escandalo", "corrupcion", "fracaso"]
        t = text.lower()
        sc = sum(0.15 for p in POSITIVAS if p in t) - sum(0.15 for p in NEGATIVAS if p in t)
        return max(-1.0, min(1.0, sc)), "neutral"

    # ── Clasificacion IPTC ────────────────────────────────────────────────────

    def _classify_iptc(self, title: str, text: str) -> list[str]:
        if not self.iptc_classifier or self.iptc_classifier is False:
            return []
        try:
            snippet = (title + ". " + text[:256])[:512]
            results = self.iptc_classifier(snippet)
            return [r["label"] for r in results[0] if r["score"] > 0.3]
        except Exception:
            return []

    # ── LLM: resumen + hechos clave ──────────────────────────────────────────

    def _extract_key_intelligence_ollama(
        self, title: str, text: str, persons: list[dict], signals: list[str]
    ) -> tuple[str, list[str]]:
        """
        Usa qwen3:8b para:
          1. Resumen ejecutivo en 3 frases (para analista, no para lector general)
          2. Hechos verificables: quién hizo qué, cuándo, cifra si la hay
          3. Si Ollama no disponible, extraccion extractiva como fallback
        """
        if not _OllamaClient.available():
            # Fallback extractivo
            sentences = re.split(r'(?<=[.!?])\s+', (text or "").strip())
            summary = " ".join(sentences[:3])
            facts   = [s.strip() for s in sentences[3:7] if len(s) > 40]
            return summary, facts[:4]

        persons_ctx = ", ".join(p["name"] for p in persons[:5]) if persons else "ninguna"
        signals_ctx = ", ".join(signals) if signals else "ninguna"

        prompt = (
            f"TITULO: {title}\n\n"
            f"PERSONAS CLAVE: {persons_ctx}\n"
            f"SENALES DETECTADAS: {signals_ctx}\n\n"
            f"TEXTO:\n{text[:3000]}\n\n"
            "Analiza este articulo desde la perspectiva de un analista de inteligencia "
            "politica espanola. Extrae:\n"
            "1. Un resumen ejecutivo en EXACTAMENTE 3 frases que capture la "
            "informacion critica para la toma de decisiones politicas.\n"
            "2. Entre 3 y 5 hechos verificables concretos (quién, qué, cuándo, cifra).\n\n"
            "Responde SOLO con este JSON:\n"
            '{"resumen": "frase1. frase2. frase3.", '
            '"hechos_clave": ["hecho1", "hecho2", "hecho3"]}'
        )

        raw = _OllamaClient.generate(
            prompt,
            model=_MODEL_RESUMEN,
            temperature=0.1,
            max_tokens=700,
            system=self._SYSTEM_EXTRACTOR,
        )
        parsed = _OllamaClient.extract_json(raw)
        summary = parsed.get("resumen", "")
        facts   = parsed.get("hechos_clave", [])

        # Fallback parcial si el LLM devuelve campos vacios
        if not summary:
            sentences = re.split(r'(?<=[.!?])\s+', (text or "").strip())
            summary = " ".join(sentences[:3])
        if not facts:
            sentences = re.split(r'(?<=[.!?])\s+', (text or "").strip())
            facts = [s.strip() for s in sentences[3:7] if len(s) > 40][:4]

        return summary, [str(f) for f in facts]

    # ── Pipeline principal de extraccion ──────────────────────────────────────

    def extract(self, article: dict, score: StrategicScore) -> ExtractedIntelligence:
        url    = article.get("url", "")
        title  = article.get("title", "")
        source = article.get("source", "") or article.get("media", "")
        pub_at = article.get("published_at", "")

        # 1. Texto completo
        text = self._fetch_full_text(url)
        if not text or len(text) < 200:
            text = article.get("raw", "") or article.get("summary", "")
        text = text[:8000]

        intel = ExtractedIntelligence(
            article_url=url,
            source_media=source,
            published_at=pub_at,
            headline=title,
            full_text=text,
            score=score,
        )

        if not text:
            return intel

        # 2. NER con spaCy
        intel.persons, intel.organizations, intel.locations = (
            self._extract_entities_spacy(title + ". " + text)
        )

        # 3. Enriquecimiento de personas con Ollama (cargo + partido)
        if intel.persons:
            intel.persons = self._enrich_persons_ollama(intel.persons, title + " " + text[:1500])

        # 4. Tipo de evento
        intel.event_type = self._detect_event_type(title + " " + text[:500])

        # 5. Senales estrategicas
        intel.strategic_signals = self._detect_signals(title + " " + text[:1000])

        # 6. Citas directas
        intel.direct_quotes = self._extract_quotes(text, intel.persons)

        # 7. Sentimiento
        intel.sentiment, intel.tone_primary = self._analyze_sentiment(
            title + ". " + text[:512]
        )

        # 8. IPTC
        intel.policy_areas = self._classify_iptc(title, text)

        # 9. LLM: resumen ejecutivo + hechos verificables
        intel.summary_es, intel.key_facts = self._extract_key_intelligence_ollama(
            title, text, intel.persons, intel.strategic_signals
        )

        return intel


# ═══════════════════════════════════════════════════════════════════════════════
# ORQUESTADOR: STRATEGIC NEWS PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════


class StrategicNewsPipeline:
    """
    Orquesta el pipeline completo:
      data_lake_staging (processed=FALSE) -> filter -> extract -> strategic_articles

    Llamado cada 15 minutos por master_pipeline.
    """

    THRESHOLD = 0.65
    STAGING_SOURCES = (
        "media_rss", "gdelt", "nato_press", "boletin_autonomico",
        "contratacion", "maldita", "telegram", "ep_votes",
        "twitter_monitor", "europarl", "ine_notas",
    )

    def __init__(self) -> None:
        self._filter    = StrategicRelevanceFilter()
        self._extractor = DeepNewsExtractor()

    # ── Lectura de staging ────────────────────────────────────────────────────

    def _fetch_unprocessed(self, limit: int) -> list[dict]:
        sources_sql = ", ".join(f"'{s}'" for s in self.STAGING_SOURCES)
        with psycopg.connect(_dsn(), row_factory=dict_row) as conn:
            rows = conn.execute(
                f"""
                SELECT id, source, payload, ingested_at
                FROM data_lake_staging
                WHERE processed = FALSE
                  AND source IN ({sources_sql})
                ORDER BY ingested_at DESC
                LIMIT %s
                """,
                (limit,),
            ).fetchall()

        articles: list[dict] = []
        for row in rows:
            payload = row["payload"]
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except Exception:
                    payload = {"raw": str(payload)}
            payload["_staging_id"] = row["id"]
            articles.append(payload)

        log.info("Staging: %d articulos sin procesar", len(articles))
        return articles

    # ── Persistencia en strategic_articles ───────────────────────────────────

    def _save_intelligence(self, items: list[ExtractedIntelligence]) -> int:
        if not items:
            return 0
        saved = 0
        with psycopg.connect(_dsn()) as conn:
            for intel in items:
                d = intel.to_db_dict()
                try:
                    conn.execute(
                        """
                        INSERT INTO strategic_articles (
                            url, source_media, published_at, headline,
                            summary_es, persons, organizations, locations,
                            event_type, policy_areas, sentiment, tone_primary,
                            key_facts, direct_quotes, strategic_signals,
                            score_total, score_detail, processed_at
                        ) VALUES (
                            %(url)s, %(source_media)s, %(published_at)s, %(headline)s,
                            %(summary_es)s, %(persons)s, %(organizations)s, %(locations)s,
                            %(event_type)s, %(policy_areas)s, %(sentiment)s, %(tone_primary)s,
                            %(key_facts)s, %(direct_quotes)s, %(strategic_signals)s,
                            %(score_total)s, %(score_detail)s, %(processed_at)s
                        )
                        ON CONFLICT (url) DO UPDATE SET
                            summary_es        = EXCLUDED.summary_es,
                            persons           = EXCLUDED.persons,
                            organizations     = EXCLUDED.organizations,
                            strategic_signals = EXCLUDED.strategic_signals,
                            score_total       = EXCLUDED.score_total,
                            score_detail      = EXCLUDED.score_detail,
                            processed_at      = EXCLUDED.processed_at
                        """,
                        d,
                    )
                    saved += 1
                except Exception as exc:
                    log.warning("strategic_articles insert error: %s", exc)
        return saved

    def _mark_processed(self, staging_ids: list) -> None:
        if not staging_ids:
            return
        with psycopg.connect(_dsn()) as conn:
            conn.execute(
                "UPDATE data_lake_staging SET processed = TRUE WHERE id = ANY(%s)",
                (staging_ids,),
            )

    # ── Emision de senales criticas ───────────────────────────────────────────

    def _emit_signals(self, items: list[ExtractedIntelligence]) -> None:
        """
        Inserta en signal_politeia los articulos con senales estrategicas
        activas y score >= 0.80 (umbral de alerta).
        """
        critical = [
            i for i in items
            if i.strategic_signals and i.score and i.score.total >= 0.80
        ]
        if not critical:
            return
        with psycopg.connect(_dsn()) as conn:
            for intel in critical:
                signals_str = ", ".join(intel.strategic_signals)
                urgencia = 4 if intel.score and intel.score.total >= 0.90 else 3
                try:
                    conn.execute(
                        """
                        INSERT INTO signal_politeia
                            (tipo, urgencia, titulo, resumen, modulo_origen)
                        VALUES ('mediatico', %s, %s, %s, 'strategic_news_pipeline')
                        """,
                        (
                            urgencia,
                            f"[{intel.event_type.upper()}] {intel.headline[:120]}",
                            (
                                f"Senales: {signals_str}. "
                                f"Fuente: {intel.source_media}. "
                                f"Score: {intel.score.total:.2f}"
                            ),
                        ),
                    )
                except Exception as exc:
                    log.debug("signal emit: %s", exc)

    # ── Run principal ─────────────────────────────────────────────────────────

    def run(self, limit: int = 500) -> dict:
        """
        Ejecuta el pipeline completo. Llamado cada 15 min por master_pipeline.
        """
        t0 = time.perf_counter()

        # Fase 0: leer staging
        raw_articles = self._fetch_unprocessed(limit)
        if not raw_articles:
            return {"status": "ok", "ingested": 0, "strategic": 0,
                    "extracted": 0, "saved": 0}

        # Fase 1: filtrado estrategico
        filtered = self._filter.filter_batch(raw_articles, self.THRESHOLD)

        # Fase 2: extraccion profunda
        intelligence: list[ExtractedIntelligence] = []
        for article, score in filtered:
            try:
                intel = self._extractor.extract(article, score)
                intelligence.append(intel)
            except Exception as exc:
                log.warning("Extraccion fallida [%s]: %s",
                            article.get("url", "?")[:60], exc)

        # Marcar todos los staging como procesados (incluidos los descartados)
        all_ids = [a["_staging_id"] for a in raw_articles if "_staging_id" in a]
        self._mark_processed(all_ids)

        # Guardar inteligencia estructurada
        saved = self._save_intelligence(intelligence)

        # Emitir senales criticas
        self._emit_signals(intelligence)

        elapsed = round(time.perf_counter() - t0, 1)
        n_raw = len(raw_articles)
        n_fil = len(filtered)
        stats = {
            "status":      "ok",
            "ingested":    n_raw,
            "strategic":   n_fil,
            "filter_rate": f"{100 * n_fil / max(n_raw, 1):.1f}%",
            "extracted":   len(intelligence),
            "saved":       saved,
            "elapsed_s":   elapsed,
            "ollama_ok":   _OllamaClient.available(),
        }
        log.info("StrategicNewsPipeline: %s", stats)
        return stats
