"""
NarrativeDetectionEngine — Clustering de narrativas con BERTopic.

Detecta narrativas dominantes en un corpus de textos politicos:
  1. Genera embeddings (sentence-transformers o nomic-embed-text via Ollama)
  2. Reduce dimensionalidad con UMAP
  3. Clusterea con HDBSCAN
  4. Extrae keywords representativas por cluster (YAKE o c-TF-IDF)
  5. Asigna etiqueta automatica al cluster via LLM o TF-IDF

Dependencias opcionales:
  bertopic      — pip install bertopic
  sentence-transformers — ya en requirements
  yake          — ya en requirements

Fallback: clustering TF-IDF + KMeans si BERTopic no disponible.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

@dataclass
class Narrative:
    topic_id: int
    label: str
    keywords: list[str]
    document_count: int
    representative_docs: list[str] = field(default_factory=list)
    coherence_score: float = 0.0
    temporal_trend: str = "estable"   # emergente, estable, decreciente


@dataclass
class NarrativeDetectionResult:
    narratives: list[Narrative] = field(default_factory=list)
    noise_ratio: float = 0.0
    method_used: str = "bertopic"
    total_documents: int = 0
    is_available: bool = True
    error: str = ""

    def top_narratives(self, n: int = 5) -> list[Narrative]:
        return sorted(
            self.narratives, key=lambda n: n.document_count, reverse=True
        )[:n]

    def get_narrative(self, topic_id: int) -> Narrative | None:
        return next((n for n in self.narratives if n.topic_id == topic_id), None)


# ---------------------------------------------------------------------------
# NarrativeDetectionEngine
# ---------------------------------------------------------------------------

class NarrativeDetectionEngine:
    """
    Detecta narrativas en corpus de texto politico con BERTopic.

    Uso:
        engine = NarrativeDetectionEngine()
        result = engine.detect(textos, min_topic_size=3)
        for narrative in result.top_narratives(5):
            print(f"{narrative.label}: {narrative.keywords[:5]}")
    """

    def __init__(
        self,
        language: str = "spanish",
        min_topic_size: int = 3,
        nr_topics: int | str = "auto",
        embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2",
    ) -> None:
        self._language = language
        self._min_topic_size = min_topic_size
        self._nr_topics = nr_topics
        self._embedding_model = embedding_model

    def detect(
        self,
        documents: list[str],
        timestamps: list[str] | None = None,
    ) -> NarrativeDetectionResult:
        """
        Detecta narrativas en el corpus.

        Args:
            documents: lista de textos a analizar
            timestamps: fechas ISO asociadas a cada documento (para tendencias)
        """
        if not documents:
            return NarrativeDetectionResult(
                is_available=False, error="No hay documentos"
            )

        if len(documents) < self._min_topic_size * 2:
            return NarrativeDetectionResult(
                is_available=False,
                error=f"Corpus muy pequeño: {len(documents)} docs",
            )

        # Intentar BERTopic
        result = self._run_bertopic(documents, timestamps)
        if result.is_available:
            return result

        # Fallback: TF-IDF + KMeans
        return self._run_tfidf_kmeans(documents)

    def _run_bertopic(
        self,
        documents: list[str],
        timestamps: list[str] | None,
    ) -> NarrativeDetectionResult:
        try:
            from bertopic import BERTopic  # type: ignore[import]
            from sentence_transformers import SentenceTransformer  # type: ignore[import]
        except ImportError as exc:
            return NarrativeDetectionResult(
                is_available=False,
                error=f"BERTopic no disponible: {exc}",
            )

        try:
            embedding_model = SentenceTransformer(self._embedding_model)
            topic_model = BERTopic(
                language=self._language,
                min_topic_size=self._min_topic_size,
                nr_topics=self._nr_topics,
                embedding_model=embedding_model,
                verbose=False,
            )

            topics, probs = topic_model.fit_transform(documents)

            # Extraer informacion de cada topic
            topic_info = topic_model.get_topic_info()
            narratives = []

            for _, row in topic_info.iterrows():
                topic_id = int(row["Topic"])
                if topic_id == -1:
                    continue

                keywords_raw = topic_model.get_topic(topic_id)
                keywords = [kw for kw, _ in keywords_raw[:10]] if keywords_raw else []

                # Documentos representativos
                try:
                    rep_docs = topic_model.get_representative_docs(topic_id)
                    rep_docs = [d[:200] for d in rep_docs[:3]]
                except Exception:
                    rep_docs = []

                narratives.append(Narrative(
                    topic_id=topic_id,
                    label=self._auto_label(keywords),
                    keywords=keywords,
                    document_count=int(row.get("Count", 0)),
                    representative_docs=rep_docs,
                ))

            # Ratio de ruido (topic -1)
            noise_docs = sum(1 for t in topics if t == -1)
            noise_ratio = noise_docs / len(documents)

            return NarrativeDetectionResult(
                narratives=narratives,
                noise_ratio=noise_ratio,
                method_used="bertopic",
                total_documents=len(documents),
            )

        except Exception as exc:
            logger.warning("BERTopic error: %s", exc)
            return NarrativeDetectionResult(
                is_available=False, error=str(exc)
            )

    def _run_tfidf_kmeans(self, documents: list[str]) -> NarrativeDetectionResult:
        """Fallback: TF-IDF vectorization + KMeans clustering."""
        try:
            from sklearn.cluster import KMeans
            from sklearn.feature_extraction.text import TfidfVectorizer
        except ImportError:
            return NarrativeDetectionResult(
                is_available=False, error="scikit-learn no disponible"
            )

        try:
            vectorizer = TfidfVectorizer(
                max_features=500,
                stop_words=None,  # No stop words built-in para espanol
                ngram_range=(1, 2),
            )
            X = vectorizer.fit_transform(documents)
            feature_names = vectorizer.get_feature_names_out()

            n_clusters = min(8, max(2, len(documents) // 5))
            km = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
            labels = km.fit_predict(X)

            narratives = []
            for cluster_id in range(n_clusters):
                cluster_docs = [d for d, l in zip(documents, labels) if l == cluster_id]
                if not cluster_docs:
                    continue

                # Keywords: terminos con mayor peso en el centroide del cluster
                import numpy as np
                centroid = km.cluster_centers_[cluster_id]
                top_indices = centroid.argsort()[-10:][::-1]
                keywords = [feature_names[i] for i in top_indices]

                narratives.append(Narrative(
                    topic_id=cluster_id,
                    label=self._auto_label(keywords),
                    keywords=keywords,
                    document_count=len(cluster_docs),
                    representative_docs=[d[:200] for d in cluster_docs[:2]],
                ))

            return NarrativeDetectionResult(
                narratives=narratives,
                noise_ratio=0.0,
                method_used="tfidf_kmeans",
                total_documents=len(documents),
            )
        except Exception as exc:
            logger.warning("TF-IDF fallback error: %s", exc)
            return NarrativeDetectionResult(
                is_available=False, error=str(exc)
            )

    @staticmethod
    def _auto_label(keywords: list[str]) -> str:
        """Genera una etiqueta automatica a partir de las keywords principales."""
        if not keywords:
            return "tema_sin_etiquetar"
        # Usar las 3 primeras keywords como etiqueta
        return "_".join(kw.replace(" ", "_") for kw in keywords[:3])

    def detect_trending(
        self,
        documents: list[str],
        timestamps: list[str],
        baseline_documents: list[str] | None = None,
    ) -> list[Narrative]:
        """
        Detecta narrativas emergentes comparando con un baseline.

        Retorna narrativas clasificadas como 'emergente'.
        """
        result = self.detect(documents, timestamps)
        if not result.is_available:
            return []

        if not baseline_documents:
            return result.top_narratives(3)

        baseline_result = self.detect(baseline_documents)
        baseline_keywords = set()
        for n in baseline_result.narratives:
            baseline_keywords.update(n.keywords)

        trending = []
        for narrative in result.narratives:
            overlap = len(set(narrative.keywords) & baseline_keywords)
            if overlap < 3:  # Narrativa con pocas keywords en comun con baseline
                narrative.temporal_trend = "emergente"
                trending.append(narrative)

        return sorted(trending, key=lambda n: n.document_count, reverse=True)
