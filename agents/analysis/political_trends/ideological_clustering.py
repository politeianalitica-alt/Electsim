"""
IdeologicalClusteringEngine — Posicionamiento ideologico de partidos.

Metodologia:
  1. Construir matriz de voto (partidos x votaciones parlamentarias)
  2. Reduccion dimensional con PCA (varianza explicada >= 80%)
  3. Reduccion 2D con UMAP para visualizacion
  4. Clustering con HDBSCAN

El eje PC1 tipicamente captura izquierda-derecha economica.
El eje PC2 captura dimension territorial/social.

Dependencias opcionales: scikit-learn (PCA), umap-learn (UMAP), hdbscan.
Fallback a PCA+KMeans si UMAP/HDBSCAN no disponibles.
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
class PartyPosition:
    party: str
    pc1: float               # eje izquierda-derecha
    pc2: float               # eje territorial/social
    umap_x: float = 0.0
    umap_y: float = 0.0
    cluster_id: int = -1     # -1 = ruido (HDBSCAN)
    cluster_label: str = ""


@dataclass
class IdeologicalClusterResult:
    parties: list[PartyPosition] = field(default_factory=list)
    variance_explained_pc1: float = 0.0
    variance_explained_pc2: float = 0.0
    n_clusters: int = 0
    cluster_labels: dict[int, str] = field(default_factory=dict)
    method_used: str = "pca_kmeans"
    is_available: bool = True
    error: str = ""

    def get_party(self, name: str) -> PartyPosition | None:
        return next((p for p in self.parties if p.party == name), None)

    def parties_in_cluster(self, cluster_id: int) -> list[PartyPosition]:
        return [p for p in self.parties if p.cluster_id == cluster_id]


# ---------------------------------------------------------------------------
# IdeologicalClusteringEngine
# ---------------------------------------------------------------------------

class IdeologicalClusteringEngine:
    """
    Calcula el posicionamiento ideologico de partidos a partir de
    matrices de voto parlamentario.

    Uso:
        engine = IdeologicalClusteringEngine()
        # vote_matrix: dict[partido: list[int]] donde int es -1/0/1
        result = engine.fit(vote_matrix)
        for p in result.parties:
            print(f"{p.party}: ({p.pc1:.2f}, {p.pc2:.2f}) cluster={p.cluster_label}")
    """

    def __init__(
        self,
        n_components_pca: int = 10,
        n_clusters_fallback: int = 4,
        min_cluster_size: int = 2,
    ) -> None:
        self._n_pca = n_components_pca
        self._n_clusters_fallback = n_clusters_fallback
        self._min_cluster_size = min_cluster_size

    def fit(
        self,
        vote_matrix: dict[str, list[int]],
        party_names: list[str] | None = None,
    ) -> IdeologicalClusterResult:
        """
        Calcula el posicionamiento ideologico.

        Args:
            vote_matrix: {partido: [voto1, voto2, ...]}
                         voto: 1=SI, -1=NO, 0=ABSTENCION
            party_names: orden de partidos (si no se infiere de vote_matrix)
        """
        if not vote_matrix:
            return IdeologicalClusterResult(
                is_available=False, error="vote_matrix vacio"
            )

        try:
            import numpy as np
        except ImportError:
            return IdeologicalClusterResult(
                is_available=False, error="numpy no disponible"
            )

        parties = party_names or list(vote_matrix.keys())
        X = np.array([vote_matrix[p] for p in parties], dtype=float)

        # Reemplazar NaN
        X = np.nan_to_num(X, nan=0.0)

        if X.shape[0] < 2 or X.shape[1] < 2:
            return IdeologicalClusterResult(
                is_available=False, error=f"Datos insuficientes: {X.shape}"
            )

        # PCA
        try:
            from sklearn.decomposition import PCA
            from sklearn.preprocessing import StandardScaler
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            n_comp = min(self._n_pca, X_scaled.shape[0], X_scaled.shape[1])
            pca = PCA(n_components=n_comp)
            X_pca = pca.fit_transform(X_scaled)
            var_pc1 = float(pca.explained_variance_ratio_[0])
            var_pc2 = float(pca.explained_variance_ratio_[1]) if n_comp > 1 else 0.0
        except ImportError:
            return IdeologicalClusterResult(
                is_available=False, error="scikit-learn no disponible"
            )

        # UMAP + HDBSCAN
        umap_coords = self._run_umap(X_scaled)
        cluster_ids = self._run_hdbscan(X_pca)

        positions = []
        for i, party in enumerate(parties):
            positions.append(PartyPosition(
                party=party,
                pc1=float(X_pca[i, 0]),
                pc2=float(X_pca[i, 1]) if X_pca.shape[1] > 1 else 0.0,
                umap_x=float(umap_coords[i, 0]) if umap_coords is not None else 0.0,
                umap_y=float(umap_coords[i, 1]) if umap_coords is not None else 0.0,
                cluster_id=int(cluster_ids[i]),
            ))

        # Etiquetas de cluster
        cluster_labels = self._label_clusters(positions)
        for p in positions:
            p.cluster_label = cluster_labels.get(p.cluster_id, "indefinido")

        method = "pca_umap_hdbscan" if umap_coords is not None else "pca_kmeans"
        n_clusters = len(set(c for c in cluster_ids if c >= 0))

        return IdeologicalClusterResult(
            parties=positions,
            variance_explained_pc1=var_pc1,
            variance_explained_pc2=var_pc2,
            n_clusters=n_clusters,
            cluster_labels=cluster_labels,
            method_used=method,
        )

    def _run_umap(self, X: Any) -> Any:
        try:
            import umap  # type: ignore[import]
            reducer = umap.UMAP(n_components=2, random_state=42)
            return reducer.fit_transform(X)
        except (ImportError, Exception) as exc:
            logger.debug("UMAP no disponible: %s", exc)
            return None

    def _run_hdbscan(self, X_pca: Any) -> Any:
        try:
            import hdbscan  # type: ignore[import]
            import numpy as np
            clusterer = hdbscan.HDBSCAN(min_cluster_size=self._min_cluster_size)
            return clusterer.fit_predict(X_pca)
        except (ImportError, Exception):
            pass
        # Fallback: KMeans
        try:
            import numpy as np
            from sklearn.cluster import KMeans
            k = min(self._n_clusters_fallback, X_pca.shape[0])
            km = KMeans(n_clusters=k, random_state=42, n_init="auto")
            return km.fit_predict(X_pca)
        except Exception as exc:
            logger.debug("KMeans fallback error: %s", exc)
            import numpy as np
            return np.zeros(X_pca.shape[0], dtype=int)

    @staticmethod
    def _label_clusters(positions: list[PartyPosition]) -> dict[int, str]:
        """Asigna etiquetas a clusters basandose en la posicion PC1."""
        from collections import defaultdict
        cluster_pc1: dict[int, list[float]] = defaultdict(list)
        for p in positions:
            if p.cluster_id >= 0:
                cluster_pc1[p.cluster_id].append(p.pc1)

        labels: dict[int, str] = {-1: "ruido"}
        for cluster_id, pc1_vals in cluster_pc1.items():
            mean_pc1 = sum(pc1_vals) / len(pc1_vals)
            if mean_pc1 < -1.0:
                labels[cluster_id] = "izquierda"
            elif mean_pc1 < -0.3:
                labels[cluster_id] = "centroizquierda"
            elif mean_pc1 < 0.3:
                labels[cluster_id] = "centro"
            elif mean_pc1 < 1.0:
                labels[cluster_id] = "centroderecha"
            else:
                labels[cluster_id] = "derecha"

        return labels

    @staticmethod
    def build_vote_matrix_from_congress(
        votaciones: list[dict[str, Any]]
    ) -> dict[str, list[int]]:
        """
        Construye la matriz de voto desde una lista de votaciones del Congreso.

        Formato entrada:
            [{"partido": "PSOE", "voto": "Si"}, ...]
        """
        matrix: dict[str, list[int]] = {}
        for vot in votaciones:
            partido = str(vot.get("partido", ""))
            voto_raw = str(vot.get("voto", "")).lower()
            voto = 1 if "si" in voto_raw or "yes" in voto_raw else (
                -1 if "no" in voto_raw else 0
            )
            matrix.setdefault(partido, []).append(voto)
        return matrix
