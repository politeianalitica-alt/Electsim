"""
Clustering de perfiles de votante (microdatos) y persistencia en ``perfiles_votante``.
"""

from __future__ import annotations

import json
import logging
import os

import numpy as np
import pandas as pd
from sklearn.impute import KNNImputer
from sklearn.mixture import BayesianGaussianMixture
from sklearn.preprocessing import StandardScaler
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

VARIABLES_CLUSTERING = [
    "escala_ideologica",
    "edad",
    "estudios_num",
    "situacion_laboral_num",
    "tamano_habitat_num",
    "valoracion_gobierno",
    "valoracion_oposicion",
    "clase_social_num",
    "identidad_territorial_num",
    "situacion_economia_personal_num",
]

ENCODING_MAPS: dict[str, dict[str, int]] = {
    "estudios_num": {
        "sin_estudios": 1,
        "primaria": 2,
        "secundaria": 3,
        "fp": 4,
        "universitarios": 5,
    },
    "situacion_laboral_num": {
        "desempleado": 1,
        "estudiante": 2,
        "ama_casa": 2,
        "jubilado": 3,
        "ocupado": 4,
    },
    "tamano_habitat_num": {
        "<2000": 1,
        "2001-10000": 2,
        "10001-50000": 3,
        "50001-100000": 4,
        "100001-400000": 5,
        ">400000": 6,
    },
    "clase_social_num": {
        "baja": 1,
        "media_baja": 2,
        "media": 3,
        "media_alta": 4,
        "alta": 5,
    },
    "identidad_territorial_num": {
        "solo_ccaa": 1,
        "mas_ccaa": 2,
        "tan_español_como_ccaa": 3,
        "mas_español": 4,
        "solo_español": 5,
    },
    "situacion_economia_personal_num": {
        "muy_mala": 1,
        "mala": 2,
        "regular": 3,
        "buena": 4,
        "muy_buena": 5,
    },
}


def encodificar_variables(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for nueva_col, mapping in ENCODING_MAPS.items():
        col_orig = nueva_col.replace("_num", "")
        if col_orig in out.columns:
            out[nueva_col] = out[col_orig].map(mapping)
    return out


def _generar_descripcion(centroide: pd.Series, dist_voto: dict) -> str:
    partido_principal = max(dist_voto, key=dist_voto.get) if dist_voto else "indeciso"
    ideologia = float(centroide.get("escala_ideologica", 5.5) or 5.5)
    edad = int(centroide.get("edad", 45) or 45)
    if ideologia <= 3:
        pos = "de izquierda"
    elif ideologia <= 6:
        pos = "de centro"
    else:
        pos = "de derecha"
    val_gob = float(centroide.get("valoracion_gobierno", 5) or 5)
    val_txt = (
        "valora negativamente la gestión del gobierno actual"
        if val_gob < 5
        else "tiene una valoración moderada o positiva del gobierno"
    )
    tam = centroide.get("tamano_habitat_num", 3)
    entorno = "entorno urbano medio"
    if tam is not None and tam <= 2:
        entorno = "entorno rural o pequeño municipio"
    elif tam is not None and tam >= 5:
        entorno = "gran ciudad o área metropolitana"
    return (
        f"Persona española de ~{edad} años, ideología {pos} ({ideologia:.1f}/10), "
        f"tiende a votar {partido_principal}. {val_txt.capitalize()}. "
        f"Reside en {entorno}."
    )


def _label_cluster(centroide: pd.Series, dist_voto: dict) -> str:
    ideologia = float(centroide.get("escala_ideologica", 5.5) or 5.5)
    edad = int(centroide.get("edad", 45) or 45)
    partido_principal = max(dist_voto, key=dist_voto.get) if dist_voto else "mixto"
    if ideologia <= 3.5:
        bloque = "izquierda"
    elif ideologia >= 6.5:
        bloque = "derecha"
    else:
        bloque = "centro"
    tramo = "joven" if edad < 35 else "adulto" if edad < 55 else "senior"
    return f"{bloque}_{tramo}_{str(partido_principal).lower().replace(' ', '_')}"


def generar_perfiles(engine, n_clusters: int = 12) -> pd.DataFrame:
    with engine.connect() as conn:
        df = pd.read_sql(text("SELECT m.* FROM microdatos_encuesta m"), conn)

    if df.empty:
        return pd.DataFrame()

    df = encodificar_variables(df)

    features = [c for c in VARIABLES_CLUSTERING if c in df.columns]
    if not features:
        logger.warning("No hay features de clustering disponibles")
        return pd.DataFrame()

    X_raw = df[features].to_numpy(dtype=float)
    w = df["peso_muestral"].fillna(1.0).to_numpy(dtype=float) if "peso_muestral" in df.columns else np.ones(len(df))

    if len(df) < 3:
        return pd.DataFrame()

    X_imp = KNNImputer(n_neighbors=min(5, max(1, len(df) - 1))).fit_transform(X_raw)
    X_scaled = StandardScaler().fit_transform(X_imp)

    n_clusters = int(os.getenv("ELECTSIM_MAX_PERFILES", str(n_clusters)))
    n_comp = max(3, min(n_clusters, len(df) - 1, 18))
    bgm = BayesianGaussianMixture(
        n_components=n_comp,
        covariance_type="full",
        max_iter=500,
        random_state=42,
        weight_concentration_prior_type="dirichlet_process",
        weight_concentration_prior=1.0,
    )
    try:
        bgm.fit(X_scaled, sample_weight=w)
    except TypeError:
        bgm.fit(X_scaled)
    labels = bgm.predict(X_scaled)
    df = df.copy()
    df["cluster_id"] = labels

    perfiles_rows: list[dict] = []
    peso_total = float(w.sum()) or 1.0

    for cid in sorted(df["cluster_id"].unique()):
        sub = df[df["cluster_id"] == cid]
        if "peso_muestral" in sub.columns:
            sw = sub["peso_muestral"].fillna(1.0)
        else:
            sw = pd.Series([1.0] * len(sub), index=sub.index)
        mask = sub.index
        X_sub = X_imp[df.index.get_indexer(mask)]
        centroide_vals = np.average(X_sub, axis=0, weights=sw.values)
        centroide = pd.Series(centroide_vals, index=features)

        vcol = "intencion_voto" if "intencion_voto" in sub.columns else None
        if vcol is None:
            dist_dict = {}
        else:
            tmp = sub[[vcol]].copy()
            tmp["_w"] = sw.values
            agg = tmp.groupby(tmp[vcol].astype(str), dropna=False)["_w"].sum()
            tot = float(agg.sum()) or 1.0
            dist_dict = (agg / tot).sort_values(ascending=False).head(5).to_dict()

        desc = _generar_descripcion(centroide, dist_dict)
        perfiles_rows.append(
            {
                "cluster_id": int(cid),
                "label": _label_cluster(centroide, dist_dict),
                "n_respondentes": len(sub),
                "peso_demografico_pct": round(float(sw.sum() / peso_total) * 100, 3),
                "edad_media": round(float(centroide.get("edad", np.nan)), 1) if "edad" in centroide.index else None,
                "ideologia_media": round(float(centroide.get("escala_ideologica", np.nan)), 2)
                if "escala_ideologica" in centroide.index
                else None,
                "distribucion_voto_json": json.dumps(dist_dict, ensure_ascii=False),
                "descripcion_perfil_llm": desc,
            }
        )

    out_df = pd.DataFrame(perfiles_rows)
    upsert = text(
        """
        INSERT INTO perfiles_votante (
            cluster_id, label, n_respondentes, peso_demografico_pct,
            edad_media, ideologia_media, distribucion_voto_json, descripcion_perfil_llm
        ) VALUES (
            :cluster_id, :label, :n_respondentes, :peso_demografico_pct,
            :edad_media, :ideologia_media, :distribucion_voto_json, :descripcion_perfil_llm
        )
        ON CONFLICT (cluster_id) DO UPDATE SET
            label = EXCLUDED.label,
            n_respondentes = EXCLUDED.n_respondentes,
            peso_demografico_pct = EXCLUDED.peso_demografico_pct,
            edad_media = EXCLUDED.edad_media,
            ideologia_media = EXCLUDED.ideologia_media,
            distribucion_voto_json = EXCLUDED.distribucion_voto_json,
            descripcion_perfil_llm = EXCLUDED.descripcion_perfil_llm
        """
    )
    with engine.begin() as conn:
        for _, row in out_df.iterrows():
            conn.execute(
                upsert,
                {
                    "cluster_id": int(row["cluster_id"]),
                    "label": row["label"],
                    "n_respondentes": int(row["n_respondentes"]),
                    "peso_demografico_pct": row["peso_demografico_pct"],
                    "edad_media": row["edad_media"],
                    "ideologia_media": row["ideologia_media"],
                    "distribucion_voto_json": row["distribucion_voto_json"],
                    "descripcion_perfil_llm": row["descripcion_perfil_llm"],
                },
            )
    return out_df


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    perf = generar_perfiles(engine)
    print(f"Generados {len(perf)} perfiles")
    if not perf.empty:
        print(
            perf[
                ["cluster_id", "label", "n_respondentes", "ideologia_media", "descripcion_perfil_llm"]
            ].to_string()
        )
