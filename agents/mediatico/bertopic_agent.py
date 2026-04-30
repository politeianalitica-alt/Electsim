"""
BERTopic Agent — Modelado de topics sobre corpus de prensa espanola.

Dos modos:
  - Batch: reentrenamiento diario completo con BERTopic (UMAP + HDBSCAN + c-TF-IDF)
  - Streaming: transformacion horaria sobre modelo entrenado (sin reentrenar)

Modelo de embeddings: paraphrase-multilingual-MiniLM-L12-v2 (50x mas rapido que XLM-R)
Seed topics: 10 temas estrategicos para Espana

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import json
import logging
import os
import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Seed topics para guided topic modeling (espanol politico)
# ---------------------------------------------------------------------------

SEED_TOPICS_ES: list[list[str]] = [
    # 0 — Economia y presupuestos
    ["presupuesto", "deficit", "pib", "inflacion", "hacienda", "deuda", "erte", "paro", "empleo"],
    # 1 — Politica interior
    ["gobierno", "congreso", "psoe", "pp", "vox", "podemos", "sumar", "coalicion", "oposicion"],
    # 2 — Elecciones
    ["elecciones", "encuesta", "sondeo", "voto", "candidato", "partido", "campana", "urnas"],
    # 3 — Politica territorial
    ["cataluna", "euskadi", "galicia", "autonomia", "independencia", "estatuto", "referendum"],
    # 4 — Seguridad y defensa
    ["otan", "ejercito", "defensa", "militar", "terrorismo", "orden publico", "ffcc", "guardia civil"],
    # 5 — Politica exterior
    ["ue", "union europea", "marruecos", "migracion", "ucrania", "rusia", "eeuu", "latinoamerica"],
    # 6 — Energia y clima
    ["energia", "renovables", "gas", "electricidad", "transicion energetica", "co2", "clima"],
    # 7 — Corrupcion y justicia
    ["corrupcion", "tribunal", "juicio", "imputado", "caso", "fiscal", "sentencia", "investigacion"],
    # 8 — Vivienda y sociedad
    ["vivienda", "alquiler", "precio", "hipoteca", "desahucio", "urbanismo", "ley vivienda"],
    # 9 — Sanidad y bienestar
    ["sanidad", "salud", "hospital", "medico", "lista espera", "farmaco", "dependencia", "pensiones"],
]

# Fichero donde se persiste el modelo entrenado
_DEFAULT_MODEL_PATH = Path(os.getenv("BERTOPIC_MODEL_PATH", "/tmp/bertopic_model_espana.pkl"))


class BERTopicAgent:
    """
    Agente de modelado de topics sobre corpus de prensa espanola.

    Uso batch (reentrenamiento):
        agent = BERTopicAgent()
        topics, probs = agent.entrenar(textos)
        agent.guardar_modelo()

    Uso streaming (transformacion sin reentrenar):
        agent = BERTopicAgent()
        agent.cargar_modelo()
        topics = agent.transformar(textos_nuevos)
    """

    def __init__(
        self,
        model_path: Path | None = None,
        n_topics: int | str = "auto",
        min_topic_size: int = 10,
    ) -> None:
        self._model_path = model_path or _DEFAULT_MODEL_PATH
        self._n_topics = n_topics
        self._min_topic_size = min_topic_size
        self._topic_model: Any = None
        self._embedding_model: Any = None

    # ------------------------------------------------------------------
    # Carga de modelos
    # ------------------------------------------------------------------

    def _cargar_embedding_model(self) -> Any:
        if self._embedding_model is not None:
            return self._embedding_model
        try:
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
            logger.info("SentenceTransformer MiniLM cargado")
        except ImportError:
            logger.warning("sentence-transformers no instalado — embeddings desactivados")
            self._embedding_model = None
        return self._embedding_model

    def _crear_topic_model(self) -> Any:
        """Crea un BERTopic con UMAP + HDBSCAN configurados para prensa espanola."""
        try:
            from bertopic import BERTopic
            from umap import UMAP
            from hdbscan import HDBSCAN

            umap_model = UMAP(
                n_components=5,
                n_neighbors=15,
                min_dist=0.0,
                metric="cosine",
                random_state=42,
            )
            hdbscan_model = HDBSCAN(
                min_cluster_size=self._min_topic_size,
                metric="euclidean",
                cluster_selection_method="eom",
                prediction_data=True,
            )
            embedding_model = self._cargar_embedding_model()

            n_topics_param: Any = None
            if self._n_topics != "auto":
                n_topics_param = int(self._n_topics)

            topic_model = BERTopic(
                embedding_model=embedding_model,
                umap_model=umap_model,
                hdbscan_model=hdbscan_model,
                seed_topic_list=SEED_TOPICS_ES,
                nr_topics=n_topics_param,
                verbose=False,
                calculate_probabilities=True,
                language="multilingual",
            )
            return topic_model

        except ImportError as exc:
            logger.warning("BERTopic/UMAP/HDBSCAN no instalados: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Entrenamiento (modo batch)
    # ------------------------------------------------------------------

    def entrenar(self, textos: list[str]) -> tuple[list[int], Any]:
        """
        Entrena BERTopic sobre el corpus completo.
        Retorna (topics, probabilidades).
        """
        if not textos:
            logger.warning("BERTopicAgent.entrenar: lista vacia")
            return [], None

        # Filtrar textos muy cortos
        textos_validos = [t for t in textos if len(t.strip()) > 50]
        if len(textos_validos) < self._min_topic_size:
            logger.warning("BERTopicAgent: corpus demasiado pequeno (%d textos)", len(textos_validos))
            return [0] * len(textos), None

        model = self._crear_topic_model()
        if model is None:
            return self._fallback_topics_tfidf(textos_validos), None

        try:
            topics, probs = model.fit_transform(textos_validos)
            self._topic_model = model
            n_topics = len(set(t for t in topics if t != -1))
            logger.info("BERTopic: %d topics sobre %d textos", n_topics, len(textos_validos))
            return topics, probs
        except Exception as exc:
            logger.error("BERTopic entrenar error: %s", exc)
            return self._fallback_topics_tfidf(textos_validos), None

    def _fallback_topics_tfidf(self, textos: list[str]) -> list[int]:
        """Fallback: asignar topics por seed topic mas cercano (TF-IDF simple)."""
        resultado: list[int] = []
        for texto in textos:
            texto_lower = texto.lower()
            mejor_topic = -1
            mejor_score = 0
            for idx, seed_words in enumerate(SEED_TOPICS_ES):
                score = sum(1 for w in seed_words if w in texto_lower)
                if score > mejor_score:
                    mejor_score = score
                    mejor_topic = idx
            resultado.append(mejor_topic)
        return resultado

    # ------------------------------------------------------------------
    # Transformacion (modo streaming — sin reentrenar)
    # ------------------------------------------------------------------

    def transformar(self, textos: list[str]) -> list[int]:
        """
        Asigna topics a textos nuevos usando el modelo ya entrenado.
        Requiere modelo cargado previamente.
        """
        if self._topic_model is None:
            logger.warning("BERTopicAgent.transformar: modelo no cargado — usando fallback")
            return self._fallback_topics_tfidf(textos)

        try:
            topics, _ = self._topic_model.transform(textos)
            return list(topics)
        except Exception as exc:
            logger.warning("BERTopic transformar error: %s — fallback", exc)
            return self._fallback_topics_tfidf(textos)

    # ------------------------------------------------------------------
    # Persistencia del modelo
    # ------------------------------------------------------------------

    def guardar_modelo(self) -> bool:
        """Serializa el modelo entrenado a disco."""
        if self._topic_model is None:
            logger.warning("BERTopicAgent: no hay modelo que guardar")
            return False
        try:
            self._model_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._model_path, "wb") as f:
                pickle.dump(self._topic_model, f)
            logger.info("BERTopic modelo guardado: %s", self._model_path)
            return True
        except Exception as exc:
            logger.error("BERTopic guardar_modelo error: %s", exc)
            return False

    def cargar_modelo(self) -> bool:
        """Carga el modelo serializado desde disco."""
        if not self._model_path.exists():
            logger.info("BERTopic: modelo no encontrado en %s", self._model_path)
            return False
        try:
            with open(self._model_path, "rb") as f:
                self._topic_model = pickle.load(f)
            logger.info("BERTopic modelo cargado: %s", self._model_path)
            return True
        except Exception as exc:
            logger.error("BERTopic cargar_modelo error: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Informacion de topics para dashboard
    # ------------------------------------------------------------------

    def obtener_topics_dashboard(
        self,
        articulos_con_topic: list[dict],
    ) -> list[dict]:
        """
        Prepara datos de topics para el dashboard.
        Espera lista de dicts con {url_hash, titulo, medio, categoria_iptc, topic_id, ...}.
        Retorna lista de {topic_id, label, n_articulos, medios, score_medio_sesgo}.
        """
        if self._topic_model is not None:
            try:
                topic_info = self._topic_model.get_topic_info()
                topic_labels = {
                    row["Topic"]: row.get("Name", f"topic_{row['Topic']}")
                    for _, row in topic_info.iterrows()
                    if row["Topic"] != -1
                }
            except Exception:
                topic_labels = {}
        else:
            topic_labels = {idx: "_".join(words[:3]) for idx, words in enumerate(SEED_TOPICS_ES)}

        # Agrupar articulos por topic
        grupos: dict[int, list[dict]] = {}
        for art in articulos_con_topic:
            tid = int(art.get("topic_id", -1))
            if tid == -1:
                continue
            grupos.setdefault(tid, []).append(art)

        resultado: list[dict] = []
        for tid, arts in sorted(grupos.items(), key=lambda x: -len(x[1])):
            medios_en_topic = list({a.get("medio", "") for a in arts if a.get("medio")})
            sesgos = [float(a.get("score_sesgo", 0.0)) for a in arts if "score_sesgo" in a]
            sesgo_medio = round(sum(sesgos) / len(sesgos), 3) if sesgos else 0.0

            resultado.append({
                "topic_id": tid,
                "label": topic_labels.get(tid, f"topic_{tid}"),
                "n_articulos": len(arts),
                "medios": medios_en_topic[:10],
                "score_medio_sesgo": sesgo_medio,
                "titulos_muestra": [a.get("titulo", "")[:100] for a in arts[:3]],
            })

        return resultado

    def obtener_palabras_topic(self, topic_id: int, n_palabras: int = 10) -> list[str]:
        """Retorna las palabras mas representativas de un topic."""
        if self._topic_model is None:
            if 0 <= topic_id < len(SEED_TOPICS_ES):
                return SEED_TOPICS_ES[topic_id][:n_palabras]
            return []
        try:
            palabras_scores = self._topic_model.get_topic(topic_id)
            if palabras_scores:
                return [w for w, _ in palabras_scores[:n_palabras]]
        except Exception:
            pass
        return []

    def get_topic_timeline(
        self,
        articulos_con_topic: list[dict],
        topic_id: int,
        freq: str = "D",  # "D" = daily, "H" = hourly
    ) -> list[dict]:
        """
        Retorna serie temporal de frecuencia para un topic dado.
        Retorna [{fecha, n_articulos}].
        """
        from collections import defaultdict

        arts_topic = [a for a in articulos_con_topic if int(a.get("topic_id", -1)) == topic_id]
        conteo: dict[str, int] = defaultdict(int)
        for art in arts_topic:
            fecha_str = str(art.get("fecha_pub", ""))[:10 if freq == "D" else 13]
            if fecha_str:
                conteo[fecha_str] += 1

        return sorted(
            [{"fecha": k, "n_articulos": v} for k, v in conteo.items()],
            key=lambda x: x["fecha"],
        )
