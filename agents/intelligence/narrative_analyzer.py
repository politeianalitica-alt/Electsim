"""
agents.intelligence.narrative_analyzer
=======================================
Pipeline de analisis narrativo sobre corpus de articulos periodisticos.

Etapas:
  1. Clustering tematico — BERTopic (o TF-IDF si no disponible)
  2. Clasificacion de marco cognitivo — framing-roberta-multilingual
  3. Deteccion de tecnicas de propaganda — Babelscape/roberta-base-propaganda
  4. Extraccion de actores narrativos — spaCy es_core_news_lg + sentimiento dirigido
  5. Analisis de audiencia objetivo — proxies lexicales
  6. Serie temporal — evolucion diaria con deteccion de picos y caidas
  7. Deteccion de coordinacion — similitud coseno (sentence-transformers)
  8. Analisis profundo LLM — qwen3:8b via Ollama (cubre los 7 componentes narrativos)

Todas las etapas son tolerantes a fallos: si una dependencia opcional no esta
instalada, la etapa se omite y se registra un aviso.

Uso:
    from agents.intelligence.narrative_analyzer import NarrativeAnalyzer

    analyzer = NarrativeAnalyzer()
    profile = analyzer.analyze(df_articles, narrative_label="Soberania energetica")
"""
from __future__ import annotations

import json
import logging
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd
import requests

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen3:8b"

# Tecnicas de propaganda (etiquetas EN → ES)
_PROP_LABELS: dict[str, str] = {
    "Appeal_to_Fear-Prejudice": "apelacion_al_miedo",
    "Causal_Oversimplification": "simplificacion_causal",
    "Black-and-White_Fallacy": "falacia_blanco_negro",
    "Loaded_Language": "lenguaje_cargado",
    "Name_Calling,Labeling": "etiquetado_descalificador",
    "Repetition": "repeticion",
    "Whataboutism": "whataboutismo",
    "Bandwagon": "efecto_arrastre",
    "Red_Herring": "pista_falsa",
    "Doubt": "siembra_de_duda",
}

# Marcos cognitivos (framing categories)
_FRAME_LABELS: dict[str, str] = {
    "conflict": "conflicto",
    "economic": "economico",
    "morality": "moralidad",
    "human_interest": "interes_humano",
    "attribution_of_responsibility": "atribucion_de_responsabilidad",
    "strategy": "estrategia_politica",
}

# Proxies lexicales de audiencia
_AUDIENCE_LEXICON: dict[str, list[str]] = {
    "trabajadores": ["trabajador", "sindicato", "convenio", "huelga", "salario", "ERE"],
    "empresarios": ["empresa", "mercado", "competitividad", "regulacion", "aranceles"],
    "jovenes": ["universidad", "hipoteca", "empleo juvenil", "formacion", "digital"],
    "mayores": ["pension", "sanidad publica", "dependencia", "jubilacion"],
    "nacionalistas": ["nacion", "territorio", "competencias", "autogobierno", "independencia"],
    "europeistas": ["Union Europea", "Bruselas", "Parlamento Europeo", "tratado", "directiva"],
}


# ---------------------------------------------------------------------------
# Dataclasses de salida
# ---------------------------------------------------------------------------

@dataclass
class NarrativeCluster:
    cluster_id: int
    top_keywords: list[str]
    representative_docs: list[str]
    size: int


@dataclass
class ActorProfile:
    name: str
    entity_type: str          # PER / ORG / LOC
    mentions: int
    mean_sentiment: float     # -1.0 a 1.0
    roles: list[str]          # ["protagonista", "antagonista", "testigo"]


@dataclass
class TemporalPoint:
    date: str                 # ISO date YYYY-MM-DD
    count: int
    mean_sentiment: float
    is_spike: bool
    is_drop: bool


@dataclass
class NarrativeProfile:
    narrative_label: str
    analyzed_at: str

    # Estructura
    clusters: list[NarrativeCluster]
    dominant_frame: str
    propaganda_techniques: list[str]

    # Actores
    actors: list[ActorProfile]

    # Audiencia
    target_audience: dict[str, float]   # audiencia -> score

    # Evolucion temporal
    timeline: list[TemporalPoint]
    peak_date: str | None
    drop_date: str | None

    # Coordinacion
    coordination_score: float           # 0.0 - 1.0
    coordinated_sources: list[str]

    # Analisis LLM
    llm_analysis: dict[str, Any]        # keys: marco, actores, tecnicas, contranarrativas, riesgo
    llm_available: bool

    # Estadisticas
    total_articles: int
    mean_sentiment: float
    sentiment_trend: float              # pendiente lineal de sentimiento


# ---------------------------------------------------------------------------
# NarrativeAnalyzer principal
# ---------------------------------------------------------------------------

class NarrativeAnalyzer:
    """
    Analizador narrativo completo.

    Params:
        ollama_url   — URL base de Ollama (default localhost:11434)
        ollama_model — modelo a usar para analisis profundo
        use_bertopic — activar clustering BERTopic (requiere bertopic instalado)
        use_framing  — activar clasificador de marco (requiere transformers)
        use_propaganda — activar detector de propaganda (requiere transformers)
        use_spacy    — activar NER spaCy (requiere es_core_news_lg)
        use_sbert    — activar deteccion de coordinacion (requiere sentence-transformers)
    """

    def __init__(
        self,
        ollama_url: str = OLLAMA_BASE_URL,
        ollama_model: str = OLLAMA_MODEL,
        use_bertopic: bool = True,
        use_framing: bool = True,
        use_propaganda: bool = True,
        use_spacy: bool = True,
        use_sbert: bool = True,
    ) -> None:
        self.ollama_url = ollama_url
        self.ollama_model = ollama_model

        # Carga perezosa de modelos pesados
        self._bertopic = self._load_bertopic() if use_bertopic else None
        self._framing = self._load_framing() if use_framing else None
        self._propaganda = self._load_propaganda() if use_propaganda else None
        self._nlp = self._load_spacy() if use_spacy else None
        self._sbert = self._load_sbert() if use_sbert else None

    # ------------------------------------------------------------------
    # Carga de modelos
    # ------------------------------------------------------------------

    def _load_bertopic(self):
        try:
            from bertopic import BERTopic
            return BERTopic(language="multilingual", min_topic_size=3, verbose=False)
        except ImportError:
            log.warning("BERTopic no instalado — clustering via TF-IDF")
            return None

    def _load_framing(self):
        try:
            from transformers import pipeline
            return pipeline(
                "text-classification",
                model="mlburnham/Political_DEBATE_framing_roberta_large_v1.0",
                top_k=None,
                truncation=True,
                max_length=512,
            )
        except Exception as exc:
            log.warning("Framing classifier no disponible: %s", exc)
            return None

    def _load_propaganda(self):
        try:
            from transformers import pipeline
            return pipeline(
                "text-classification",
                model="Babelscape/roberta-base-propaganda",
                top_k=None,
                truncation=True,
                max_length=512,
            )
        except Exception as exc:
            log.warning("Propaganda detector no disponible: %s", exc)
            return None

    def _load_spacy(self):
        try:
            import spacy
            return spacy.load("es_core_news_lg")
        except Exception as exc:
            log.warning("spaCy es_core_news_lg no disponible: %s", exc)
            return None

    def _load_sbert(self):
        try:
            from sentence_transformers import SentenceTransformer
            return SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        except Exception as exc:
            log.warning("SentenceTransformer no disponible: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Entrada principal
    # ------------------------------------------------------------------

    def analyze(
        self,
        df: pd.DataFrame,
        narrative_label: str = "narrativa_principal",
        text_col: str = "headline",
        date_col: str = "published_at",
        source_col: str = "source_media",
        sentiment_col: str = "sentiment",
    ) -> NarrativeProfile:
        """
        Analiza un DataFrame de articulos y devuelve un NarrativeProfile completo.

        El DataFrame debe contener al menos la columna text_col.
        Las demas columnas son opcionales pero enriquecen el analisis.
        """
        if df.empty:
            return self._empty_profile(narrative_label)

        # Normalizar textos
        texts = df[text_col].fillna("").astype(str).tolist()
        texts_clean = [re.sub(r"\s+", " ", t).strip() for t in texts]

        # Sentimiento base
        sentiments = self._get_sentiments(df, sentiment_col, texts_clean)

        # Etapa 1: clustering
        clusters = self._cluster_topics(texts_clean)

        # Etapa 2: marco cognitivo
        dominant_frame = self._classify_frame(texts_clean[:50])  # muestra

        # Etapa 3: tecnicas de propaganda
        propaganda_techniques = self._detect_propaganda(texts_clean[:50])

        # Etapa 4: actores narrativos
        actors = self._extract_actors(texts_clean, sentiments)

        # Etapa 5: audiencia
        target_audience = self._analyze_audience(texts_clean)

        # Etapa 6: serie temporal
        dates = df[date_col] if date_col in df.columns else None
        sources = df[source_col].fillna("desconocido") if source_col in df.columns else None
        timeline, peak_date, drop_date = self._build_timeline(texts_clean, dates, sentiments)

        # Etapa 7: coordinacion
        coord_score, coord_sources = self._detect_coordination(texts_clean, sources)

        # Estadisticas basicas
        mean_sent = float(np.mean(sentiments)) if sentiments else 0.0
        sent_trend = self._sentiment_trend(timeline)

        # Etapa 8: LLM profundo
        llm_analysis, llm_available = self._llm_deep_analysis(
            narrative_label, clusters, dominant_frame, propaganda_techniques,
            actors, target_audience, coord_score, mean_sent, texts_clean[:10],
        )

        return NarrativeProfile(
            narrative_label=narrative_label,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            clusters=clusters,
            dominant_frame=dominant_frame,
            propaganda_techniques=propaganda_techniques,
            actors=actors,
            target_audience=target_audience,
            timeline=timeline,
            peak_date=peak_date,
            drop_date=drop_date,
            coordination_score=coord_score,
            coordinated_sources=coord_sources,
            llm_analysis=llm_analysis,
            llm_available=llm_available,
            total_articles=len(df),
            mean_sentiment=mean_sent,
            sentiment_trend=sent_trend,
        )

    # ------------------------------------------------------------------
    # Etapa 1: Clustering tematico
    # ------------------------------------------------------------------

    def _cluster_topics(self, texts: list[str]) -> list[NarrativeCluster]:
        if len(texts) < 3:
            return []

        if self._bertopic is not None:
            return self._bertopic_cluster(texts)
        return self._tfidf_cluster(texts)

    def _bertopic_cluster(self, texts: list[str]) -> list[NarrativeCluster]:
        try:
            topics, _ = self._bertopic.fit_transform(texts)
            topic_info = self._bertopic.get_topic_info()
            clusters = []
            for _, row in topic_info.iterrows():
                tid = int(row["Topic"])
                if tid == -1:
                    continue
                keywords = [kw for kw, _ in self._bertopic.get_topic(tid)[:8]]
                docs_idx = [i for i, t in enumerate(topics) if t == tid]
                rep_docs = [texts[i][:120] for i in docs_idx[:3]]
                clusters.append(NarrativeCluster(
                    cluster_id=tid,
                    top_keywords=keywords,
                    representative_docs=rep_docs,
                    size=len(docs_idx),
                ))
            return clusters[:6]
        except Exception as exc:
            log.warning("BERTopic fallo en cluster: %s", exc)
            return self._tfidf_cluster(texts)

    def _tfidf_cluster(self, texts: list[str]) -> list[NarrativeCluster]:
        """Fallback clustering via TF-IDF + K-Means."""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.cluster import KMeans

            n_clusters = min(5, max(2, len(texts) // 5))
            vec = TfidfVectorizer(max_features=200, ngram_range=(1, 2), min_df=1)
            X = vec.fit_transform(texts)
            km = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
            labels = km.fit_predict(X)
            feature_names = vec.get_feature_names_out()

            clusters = []
            for cid in range(n_clusters):
                mask = labels == cid
                center = km.cluster_centers_[cid]
                top_idx = center.argsort()[-8:][::-1]
                keywords = [feature_names[i] for i in top_idx]
                docs_idx = [i for i, m in enumerate(mask) if m]
                rep_docs = [texts[i][:120] for i in docs_idx[:3]]
                clusters.append(NarrativeCluster(
                    cluster_id=cid,
                    top_keywords=keywords,
                    representative_docs=rep_docs,
                    size=int(mask.sum()),
                ))
            return sorted(clusters, key=lambda c: c.size, reverse=True)
        except Exception as exc:
            log.warning("TF-IDF cluster fallo: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Etapa 2: Marco cognitivo
    # ------------------------------------------------------------------

    def _classify_frame(self, texts: list[str]) -> str:
        if not texts:
            return "sin_clasificar"

        if self._framing is not None:
            try:
                combined = " ".join(texts[:20])[:1000]
                results = self._framing(combined)[0]
                top = max(results, key=lambda x: x["score"])
                label = top["label"].lower()
                return _FRAME_LABELS.get(label, label)
            except Exception as exc:
                log.warning("Framing classifier error: %s", exc)

        # Fallback lexical
        frame_scores: dict[str, int] = defaultdict(int)
        combined = " ".join(texts).lower()
        lexicon = {
            "conflicto": ["enfrentamiento", "batalla", "ataque", "tension", "crisis"],
            "economico": ["PIB", "inflacion", "presupuesto", "gasto", "deuda"],
            "moralidad": ["etico", "valor", "principio", "correcto", "dignidad"],
            "estrategia_politica": ["pacto", "negociacion", "alianza", "maniobra", "voto"],
            "atribucion_de_responsabilidad": ["culpable", "responsable", "fracaso", "exito"],
        }
        for frame, words in lexicon.items():
            for word in words:
                if word.lower() in combined:
                    frame_scores[frame] += 1
        if frame_scores:
            return max(frame_scores, key=frame_scores.get)
        return "sin_clasificar"

    # ------------------------------------------------------------------
    # Etapa 3: Tecnicas de propaganda
    # ------------------------------------------------------------------

    def _detect_propaganda(self, texts: list[str]) -> list[str]:
        detected: set[str] = set()

        if self._propaganda is not None:
            try:
                for text in texts[:20]:
                    if not text.strip():
                        continue
                    results = self._propaganda(text[:512])[0]
                    for r in results:
                        if r["score"] > 0.60:
                            label = _PROP_LABELS.get(r["label"], r["label"])
                            detected.add(label)
            except Exception as exc:
                log.warning("Propaganda detector error: %s", exc)

        # Fallback lexical si no hay modelo
        if not detected:
            combined = " ".join(texts).lower()
            rules = {
                "apelacion_al_miedo": ["peligro", "amenaza", "catastrofe", "colapso", "riesgo grave"],
                "simplificacion_causal": ["la culpa es de", "todo se debe a", "el problema es uno"],
                "lenguaje_cargado": ["traicion", "dictador", "extremista", "radical"],
                "etiquetado_descalificador": ["corrupto", "mentiroso", "antiespanol"],
                "efecto_arrastre": ["todo el mundo sabe", "nadie duda", "es evidente para todos"],
            }
            for tech, triggers in rules.items():
                if any(t in combined for t in triggers):
                    detected.add(tech)

        return sorted(detected)

    # ------------------------------------------------------------------
    # Etapa 4: Actores narrativos (NER + sentimiento dirigido)
    # ------------------------------------------------------------------

    def _extract_actors(self, texts: list[str], sentiments: list[float]) -> list[ActorProfile]:
        actor_mentions: dict[str, list] = defaultdict(list)
        actor_types: dict[str, str] = {}

        if self._nlp is not None:
            try:
                for i, text in enumerate(texts[:100]):
                    if not text.strip():
                        continue
                    doc = self._nlp(text[:500])
                    sent_val = sentiments[i] if i < len(sentiments) else 0.0
                    for ent in doc.ents:
                        if ent.label_ in ("PER", "ORG", "LOC"):
                            name = ent.text.strip()
                            if len(name) > 2:
                                actor_mentions[name].append(sent_val)
                                actor_types[name] = ent.label_
            except Exception as exc:
                log.warning("spaCy NER error: %s", exc)

        # Fallback: entidades con mayusculas
        if not actor_mentions:
            pat = re.compile(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b")
            combined = " ".join(texts[:50])
            for match in pat.finditer(combined):
                name = match.group(1)
                actor_mentions[name].append(0.0)
                actor_types.setdefault(name, "PER")

        profiles = []
        for name, sents in sorted(actor_mentions.items(), key=lambda x: -len(x.values())):
            if len(sents) < 2:
                continue
            mean_s = float(np.mean(sents))
            # Rol simplificado segun sentimiento medio
            if mean_s > 0.2:
                roles = ["protagonista_positivo"]
            elif mean_s < -0.2:
                roles = ["antagonista"]
            else:
                roles = ["actor_neutral"]
            profiles.append(ActorProfile(
                name=name,
                entity_type=actor_types.get(name, "PER"),
                mentions=len(sents),
                mean_sentiment=mean_s,
                roles=roles,
            ))

        return sorted(profiles, key=lambda a: -a.mentions)[:15]

    # ------------------------------------------------------------------
    # Etapa 5: Audiencia objetivo (proxies lexicales)
    # ------------------------------------------------------------------

    def _analyze_audience(self, texts: list[str]) -> dict[str, float]:
        combined = " ".join(texts).lower()
        total_words = max(len(combined.split()), 1)
        scores: dict[str, float] = {}
        for audience, keywords in _AUDIENCE_LEXICON.items():
            hits = sum(combined.count(kw.lower()) for kw in keywords)
            scores[audience] = round(hits / total_words * 1000, 3)
        total = sum(scores.values()) or 1.0
        return {k: round(v / total, 3) for k, v in sorted(scores.items(), key=lambda x: -x[1])}

    # ------------------------------------------------------------------
    # Etapa 6: Serie temporal
    # ------------------------------------------------------------------

    def _build_timeline(
        self,
        texts: list[str],
        dates,
        sentiments: list[float],
    ) -> tuple[list[TemporalPoint], str | None, str | None]:
        if dates is None or len(texts) == 0:
            return [], None, None

        try:
            df_t = pd.DataFrame({
                "date": pd.to_datetime(dates, utc=True, errors="coerce"),
                "sentiment": sentiments,
            }).dropna(subset=["date"])
            df_t["date_str"] = df_t["date"].dt.strftime("%Y-%m-%d")

            grouped = df_t.groupby("date_str").agg(
                count=("sentiment", "count"),
                mean_sent=("sentiment", "mean"),
            ).reset_index().sort_values("date_str")

            if grouped.empty:
                return [], None, None

            counts = grouped["count"].values.astype(float)
            mean_c = counts.mean()
            std_c = counts.std() if len(counts) > 1 else 1.0

            timeline = []
            for _, row in grouped.iterrows():
                z = (row["count"] - mean_c) / (std_c + 1e-9)
                timeline.append(TemporalPoint(
                    date=row["date_str"],
                    count=int(row["count"]),
                    mean_sentiment=round(float(row["mean_sent"]), 3),
                    is_spike=bool(z > 2.0),
                    is_drop=bool(z < -2.0),
                ))

            peak = next((t for t in sorted(timeline, key=lambda x: -x.count) if t.is_spike), None)
            drop = next((t for t in sorted(timeline, key=lambda x: x.count) if t.is_drop), None)
            return timeline, (peak.date if peak else None), (drop.date if drop else None)

        except Exception as exc:
            log.warning("Timeline build error: %s", exc)
            return [], None, None

    def _sentiment_trend(self, timeline: list[TemporalPoint]) -> float:
        if len(timeline) < 2:
            return 0.0
        x = np.arange(len(timeline), dtype=float)
        y = np.array([t.mean_sentiment for t in timeline], dtype=float)
        try:
            slope = float(np.polyfit(x, y, 1)[0])
            return round(slope, 4)
        except Exception:
            return 0.0

    # ------------------------------------------------------------------
    # Etapa 7: Deteccion de coordinacion
    # ------------------------------------------------------------------

    def _detect_coordination(
        self,
        texts: list[str],
        sources,
    ) -> tuple[float, list[str]]:
        if self._sbert is None or len(texts) < 4:
            return 0.0, []

        try:
            sample = texts[:60]
            embeddings = self._sbert.encode(sample, show_progress_bar=False)
            # Similitud media entre pares
            from sklearn.metrics.pairwise import cosine_similarity
            sim_matrix = cosine_similarity(embeddings)
            np.fill_diagonal(sim_matrix, 0)
            mean_sim = float(sim_matrix.mean())

            coord_score = round(min(max((mean_sim - 0.3) / 0.4, 0.0), 1.0), 3)

            # Fuentes mas frecuentes en pares de alta similitud
            coord_sources: list[str] = []
            if sources is not None and coord_score > 0.4:
                src_list = list(sources.values[:60])
                for i in range(len(sample)):
                    for j in range(i + 1, len(sample)):
                        if sim_matrix[i, j] > 0.75:
                            if i < len(src_list):
                                coord_sources.append(src_list[i])
                            if j < len(src_list):
                                coord_sources.append(src_list[j])
                # Top 5 fuentes por frecuencia
                freq = Counter(coord_sources)
                coord_sources = [s for s, _ in freq.most_common(5)]

            return coord_score, coord_sources

        except Exception as exc:
            log.warning("Coordination detection error: %s", exc)
            return 0.0, []

    # ------------------------------------------------------------------
    # Etapa 8: Analisis LLM profundo (Ollama)
    # ------------------------------------------------------------------

    def _llm_deep_analysis(
        self,
        narrative_label: str,
        clusters: list[NarrativeCluster],
        dominant_frame: str,
        propaganda_techniques: list[str],
        actors: list[ActorProfile],
        target_audience: dict[str, float],
        coordination_score: float,
        mean_sentiment: float,
        sample_texts: list[str],
    ) -> tuple[dict[str, Any], bool]:
        """Llama a Ollama para producir el analisis de los 7 componentes narrativos."""

        keywords_str = ", ".join(
            kw for c in clusters[:3] for kw in c.top_keywords[:4]
        ) or "no disponible"
        actors_str = ", ".join(a.name for a in actors[:6]) or "no identificados"
        audience_top = list(target_audience.keys())[:3]
        sample_str = "\n- ".join(sample_texts[:6]) or "sin muestra"
        prop_str = ", ".join(propaganda_techniques) or "ninguna detectada"

        prompt = f"""Eres un analista de inteligencia politica y comunicacion estrategica.
Analiza la siguiente narrativa mediatica y produce un informe estructurado en JSON.

NARRATIVA: {narrative_label}

DATOS DETECTADOS:
- Palabras clave dominantes: {keywords_str}
- Marco cognitivo predominante: {dominant_frame}
- Tecnicas de persuasion detectadas: {prop_str}
- Actores principales: {actors_str}
- Audiencia objetivo estimada: {", ".join(audience_top)}
- Sentimiento medio: {mean_sentiment:.2f} (escala -1 a 1)
- Score de coordinacion mediatica: {coordination_score:.2f} (0=organico, 1=altamente coordinado)
- Titulares de muestra:
- {sample_str}

Responde SOLO con un JSON valido con esta estructura exacta:
{{
  "marco_cognitivo": "descripcion del marco narrativo dominante y como construye realidad",
  "actores": "analisis de los actores: protagonistas, antagonistas, sus roles y relacion de poder",
  "tecnicas_persuasion": "descripcion de las tecnicas usadas y su eficacia probable",
  "contranarrativas": "posibles contranarrativas efectivas para neutralizar o reencuadrar",
  "riesgo_politico": "nivel de riesgo (BAJO/MEDIO/ALTO/CRITICO) y razonamiento",
  "evolucion_probable": "proyeccion de la evolucion de la narrativa en los proximos 7-14 dias",
  "recomendacion": "accion estrategica recomendada para operadores politicos"
}}"""

        try:
            resp = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 1200},
                },
                timeout=90,
            )
            resp.raise_for_status()
            raw = resp.json().get("response", "")
            # Eliminar bloques <think>...</think> de modelos de razonamiento
            raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
            # Extraer JSON
            json_match = re.search(r"\{.*\}", raw, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
                return analysis, True
            return {"raw": raw}, True

        except requests.exceptions.ConnectionError:
            log.warning("Ollama no disponible en %s", self.ollama_url)
            return {"error": "Ollama no disponible"}, False
        except Exception as exc:
            log.warning("LLM deep analysis error: %s", exc)
            return {"error": str(exc)}, False

    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------

    def _get_sentiments(
        self, df: pd.DataFrame, col: str, texts: list[str]
    ) -> list[float]:
        if col in df.columns:
            return df[col].fillna(0.0).astype(float).tolist()
        # Fallback lexical muy simple
        pos = {"bien", "bueno", "positivo", "avance", "acuerdo", "exito"}
        neg = {"mal", "crisis", "escandalo", "caos", "fracaso", "ataque"}
        result = []
        for text in texts:
            words = set(text.lower().split())
            score = len(words & pos) - len(words & neg)
            result.append(max(-1.0, min(1.0, score * 0.2)))
        return result

    def _empty_profile(self, label: str) -> NarrativeProfile:
        return NarrativeProfile(
            narrative_label=label,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            clusters=[],
            dominant_frame="sin_datos",
            propaganda_techniques=[],
            actors=[],
            target_audience={},
            timeline=[],
            peak_date=None,
            drop_date=None,
            coordination_score=0.0,
            coordinated_sources=[],
            llm_analysis={},
            llm_available=False,
            total_articles=0,
            mean_sentiment=0.0,
            sentiment_trend=0.0,
        )

    def to_dict(self, profile: NarrativeProfile) -> dict[str, Any]:
        """Serializa NarrativeProfile a dict apto para JSONB de PostgreSQL."""
        return {
            "narrative_label": profile.narrative_label,
            "analyzed_at": profile.analyzed_at,
            "dominant_frame": profile.dominant_frame,
            "propaganda_techniques": profile.propaganda_techniques,
            "actors": [
                {
                    "name": a.name,
                    "type": a.entity_type,
                    "mentions": a.mentions,
                    "sentiment": a.mean_sentiment,
                    "roles": a.roles,
                }
                for a in profile.actors
            ],
            "target_audience": profile.target_audience,
            "timeline": [
                {
                    "date": t.date,
                    "count": t.count,
                    "sentiment": t.mean_sentiment,
                    "spike": t.is_spike,
                    "drop": t.is_drop,
                }
                for t in profile.timeline
            ],
            "peak_date": profile.peak_date,
            "drop_date": profile.drop_date,
            "coordination_score": profile.coordination_score,
            "coordinated_sources": profile.coordinated_sources,
            "llm_analysis": profile.llm_analysis,
            "llm_available": profile.llm_available,
            "total_articles": profile.total_articles,
            "mean_sentiment": profile.mean_sentiment,
            "sentiment_trend": profile.sentiment_trend,
            "top_keywords": [kw for c in profile.clusters[:2] for kw in c.top_keywords[:5]],
            "clusters": [
                {
                    "id": c.cluster_id,
                    "keywords": c.top_keywords,
                    "size": c.size,
                }
                for c in profile.clusters
            ],
        }
