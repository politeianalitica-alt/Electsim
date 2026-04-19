"""
segmentacion_microdatos.py

Motor de extraccion de perfiles electorales desde microdatos CIS.

Uso:
  python -m etl.models.segmentacion_microdatos
"""

from __future__ import annotations

import json
import math
import os
from typing import Any

import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

from etl.logger import get_logger

logger = get_logger(__name__)

# Mapping columnas CIS -> nombres internos normalizados.
COLUMNAS_CIS: dict[str, str] = {
    "SEXO": "sexo",
    "EDAD": "edad",
    "ESTUDIOS": "estudios",
    "CCAA": "ccaa",
    "HABITAT": "habitat",
    "CLASESOCIAL": "clase_social",
    "SITUACION_L": "situacion_laboral",
    "RELIGION": "religion",
    "INGRESOS": "ingresos",
    "INTENCION_V": "intencion_voto",
    "RECUERDO_V": "recuerdo_voto",
    "IDEOLOGIA": "ideologia",
    "P_REDISTRIB": "eje_redistribucion",
    "P_INMIGRACION": "eje_inmigracion",
    "P_TERRITORIAL": "eje_territorial",
    "P_VALORES": "eje_valores",
    "P_PRINCIPAL1": "problema_1",
    "P_PRINCIPAL2": "problema_2",
    "P_PERSONAL1": "problema_personal",
    "SATISF_DEMO": "satisfaccion_demo",
    "CONF_PARTIDOS": "confianza_partidos",
    "INTERES_POL": "interes_politica",
    "SIT_ECO_PERS": "eco_personal",
    "SIT_ECO_ESP": "eco_espana",
    "PERSPECT_ECO": "perspectiva_eco",
    "PESO": "peso",
}


# Alias para tablas ya normalizadas (microdatos propios)
COLUMNAS_CIS.update({
    "peso_muestral": "peso",
    "escala_ideologica": "ideologia",
    "recuerdo_voto_anterior": "recuerdo_voto",
    "principal_problema": "problema_1",
    "ccaa_id": "ccaa",
    "tamano_habitat": "habitat",
})

COLUMNAS_REQUERIDAS = [
    "peso",
    "ideologia",
    "intencion_voto",
    "recuerdo_voto",
    "problema_1",
    "sexo",
    "edad",
    "estudios",
    "ccaa",
    "habitat",
]

CCAA_NOMBRES = {
    "01": "Andalucia",
    "02": "Aragon",
    "03": "Asturias",
    "04": "Baleares",
    "05": "Canarias",
    "06": "Cantabria",
    "07": "C-La Mancha",
    "08": "C y Leon",
    "09": "Cataluna",
    "10": "C. Valenciana",
    "11": "Extremadura",
    "12": "Galicia",
    "13": "Madrid",
    "14": "Murcia",
    "15": "Navarra",
    "16": "Pais Vasco",
    "17": "La Rioja",
    "18": "Ceuta",
    "19": "Melilla",
}

PROBLEMAS_LABELS = {
    "1": "Paro / Empleo",
    "2": "Vivienda y alquiler",
    "3": "Economia",
    "4": "Sanidad publica",
    "5": "Educacion",
    "6": "Corrupcion",
    "7": "Inmigracion",
    "8": "Pensiones",
    "9": "Cambio climatico",
    "10": "Igualdad de genero",
    "11": "Politica en general",
    "12": "Independentismo / Unidad Espana",
    "13": "Inseguridad ciudadana",
    "14": "Crisis de valores",
    "99": "Otros",
}

PARTIDOS_LABEL = {
    "1": "PP",
    "2": "PSOE",
    "3": "VOX",
    "4": "SUMAR",
    "5": "ERC",
    "6": "JUNTS",
    "7": "PNV",
    "8": "EH BILDU",
    "9": "CC",
    "97": "Otros",
    "98": "Abstencion",
    "99": "NS/NC",
}

COHORTES = {
    "GenZ": (18, 27),
    "Millennial": (28, 43),
    "GenX": (44, 59),
    "Boomer": (60, 78),
    "Silent": (79, 120),
}


PERFILES_PREDEFINIDOS: list[dict[str, Any]] = [
    {
        "cluster_id": 1001,
        "nombre": "Socialista de Siempre",
        "etiqueta_corta": "Izquierda consolidada",
        "color": "#E31C1C",
        "filtros": {
            "intencion_voto": ["2"],
            "ideologia": (1, 5),
            "edad": (45, 90),
        },
    },
    {
        "cluster_id": 1002,
        "nombre": "Joven Progresista Urbano",
        "etiqueta_corta": "Izquierda joven",
        "color": "#6B21D6",
        "filtros": {
            "intencion_voto": ["4", "2"],
            "ideologia": (1, 4),
            "edad": (18, 35),
            "habitat": ["5", "6"],
        },
    },
    {
        "cluster_id": 1003,
        "nombre": "Popular Clasico",
        "etiqueta_corta": "Derecha consolidada",
        "color": "#1A56DB",
        "filtros": {
            "intencion_voto": ["1"],
            "ideologia": (6, 10),
            "edad": (50, 90),
        },
    },
    {
        "cluster_id": 1004,
        "nombre": "Votante de VOX",
        "etiqueta_corta": "Derecha radical",
        "color": "#5E9E23",
        "filtros": {
            "intencion_voto": ["3"],
            "ideologia": (7, 10),
        },
    },
    {
        "cluster_id": 1005,
        "nombre": "Centro Pragmatico",
        "etiqueta_corta": "Centro volatil",
        "color": "#F59E0B",
        "filtros": {
            "ideologia": (4, 7),
            "intencion_voto": ["1", "2"],
        },
    },
    {
        "cluster_id": 1006,
        "nombre": "Abstencionista Desencantado",
        "etiqueta_corta": "No participante",
        "color": "#6B7280",
        "filtros": {
            "intencion_voto": ["98", "99"],
        },
    },
    {
        "cluster_id": 1007,
        "nombre": "Independentista Catalan",
        "etiqueta_corta": "Bloque independentista",
        "color": "#FDB833",
        "filtros": {
            "ccaa": ["09"],
            "intencion_voto": ["5", "6"],
        },
    },
    {
        "cluster_id": 1008,
        "nombre": "Nacionalista Vasco",
        "etiqueta_corta": "Bloque abertzale",
        "color": "#007A3D",
        "filtros": {
            "ccaa": ["16"],
            "intencion_voto": ["7", "8"],
        },
    },
    {
        "cluster_id": 1009,
        "nombre": "Rural Conservador",
        "etiqueta_corta": "Interior tradicional",
        "color": "#92400E",
        "filtros": {
            "habitat": ["1", "2"],
            "ideologia": (6, 10),
        },
    },
    {
        "cluster_id": 1010,
        "nombre": "Mujer Trabajadora de Izquierda",
        "etiqueta_corta": "Izquierda femenina",
        "color": "#DB2777",
        "filtros": {
            "sexo": ["2"],
            "situacion_laboral": ["1"],
            "ideologia": (1, 5),
        },
    },
    {
        "cluster_id": 1011,
        "nombre": "Pensionista Centro-Derecha",
        "etiqueta_corta": "Mayor conservador",
        "color": "#0E7490",
        "filtros": {
            "situacion_laboral": ["3"],
            "ideologia": (5, 10),
            "edad": (65, 90),
        },
    },
    {
        "cluster_id": 1012,
        "nombre": "Empresario Liberal",
        "etiqueta_corta": "Derecha economica",
        "color": "#1D4ED8",
        "filtros": {
            "clase_social": ["1", "2"],
            "ideologia": (6, 10),
            "intencion_voto": ["1"],
        },
    },
]


def cargar_microdatos(conn) -> pd.DataFrame:
    """Carga microdatos y normaliza nombres/tipos."""
    df = pd.read_sql("SELECT * FROM microdatos_encuesta", conn)

    rename_map = {k: v for k, v in COLUMNAS_CIS.items() if k in df.columns}
    df = df.rename(columns=rename_map)

    if "peso" not in df.columns:
        logger.warning("Columna PESO no encontrada; usando peso = 1.0")
        df["peso"] = 1.0

    numericas = [
        "ideologia",
        "edad",
        "peso",
        "satisfaccion_demo",
        "confianza_partidos",
        "interes_politica",
        "eco_personal",
        "eco_espana",
        "eje_redistribucion",
        "eje_inmigracion",
        "eje_territorial",
        "eje_valores",
        "perspectiva_eco",
    ]
    for col in numericas:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in [
        "ideologia",
        "satisfaccion_demo",
        "confianza_partidos",
        "eco_personal",
        "eco_espana",
    ]:
        if col in df.columns:
            df[col] = df[col].replace({98: np.nan, 99: np.nan, 8: np.nan, 9: np.nan})

    return df


def aplicar_filtros(df: pd.DataFrame, filtros: dict[str, Any]) -> pd.DataFrame:
    """Aplica filtros heterogeneos sobre microdatos."""
    mask = pd.Series([True] * len(df), index=df.index)
    for col, condicion in filtros.items():
        if col not in df.columns:
            logger.warning("Columna de filtro '%s' no existe; se ignora", col)
            continue

        if isinstance(condicion, tuple) and len(condicion) == 2:
            lo, hi = condicion
            mask &= pd.to_numeric(df[col], errors="coerce").between(lo, hi)
            continue

        if isinstance(condicion, list):
            vals = {str(v) for v in condicion}
            mask &= df[col].astype(str).isin(vals)
            continue

        mask &= df[col].astype(str) == str(condicion)
    return df.loc[mask].copy()


def calcular_metricas_subconjunto(df: pd.DataFrame) -> dict[str, Any]:
    """Calcula metricas agregadas ponderadas para un subconjunto."""
    if df.empty or "peso" not in df.columns:
        return {}

    w = pd.to_numeric(df["peso"], errors="coerce").fillna(0.0)
    W = float(w.sum())
    if W <= 0:
        return {}

    def wmean(col: str) -> float | None:
        if col not in df.columns:
            return None
        vals = pd.to_numeric(df[col], errors="coerce")
        mask = vals.notna() & (w > 0)
        if int(mask.sum()) < 5:
            return None
        return float(np.average(vals[mask], weights=w[mask]))

    def wmedian(col: str) -> float | None:
        if col not in df.columns:
            return None
        vals = pd.to_numeric(df[col], errors="coerce")
        mask = vals.notna() & (w > 0)
        if int(mask.sum()) < 5:
            return None
        vals_np = vals[mask].to_numpy(dtype=float)
        w_np = w[mask].to_numpy(dtype=float)
        order = np.argsort(vals_np)
        vals_sorted = vals_np[order]
        w_sorted = w_np[order]
        cum = np.cumsum(w_sorted)
        cut = cum[-1] / 2.0
        idx = int(np.searchsorted(cum, cut, side="left"))
        idx = min(max(idx, 0), len(vals_sorted) - 1)
        return float(vals_sorted[idx])

    def wstd(col: str) -> float | None:
        m = wmean(col)
        if m is None:
            return None
        vals = pd.to_numeric(df[col], errors="coerce")
        mask = vals.notna() & (w > 0)
        if int(mask.sum()) < 5:
            return None
        variance = np.average((vals[mask] - m) ** 2, weights=w[mask])
        return float(math.sqrt(float(variance)))

    def dist_categorica(col: str, top_n: int = 10) -> list[dict[str, Any]]:
        if col not in df.columns:
            return []
        serie = df[col].astype(str)
        mask = (
            df[col].notna()
            & ~serie.isin(["98", "99", "98.0", "99.0", "nan", "None", ""])
            & (w > 0)
        )
        if int(mask.sum()) < 5:
            return []
        agg = (
            pd.DataFrame({"categoria": serie[mask], "peso": w[mask]})
            .groupby("categoria", as_index=False)["peso"]
            .sum()
            .sort_values("peso", ascending=False)
            .head(top_n)
        )
        total = float(agg["peso"].sum() or 1.0)
        agg["pct"] = (agg["peso"] * 100.0 / total).round(1)
        return agg[["categoria", "pct"]].to_dict("records")

    def pct_rango(col: str, lo: float, hi: float) -> float | None:
        if col not in df.columns:
            return None
        vals = pd.to_numeric(df[col], errors="coerce")
        mask = vals.notna() & (w > 0)
        if int(mask.sum()) < 5:
            return None
        in_range = (vals[mask] >= lo) & (vals[mask] <= hi)
        return float(w[mask][in_range].sum() / w[mask].sum() * 100.0)

    def pct_equals(col: str, value: float) -> float | None:
        if col not in df.columns:
            return None
        vals = pd.to_numeric(df[col], errors="coerce")
        mask = vals.notna() & (w > 0)
        if int(mask.sum()) < 5:
            return None
        return float(w[mask][vals[mask] == value].sum() / w[mask].sum() * 100.0)

    def modal_ponderado(col: str) -> str | None:
        if col not in df.columns:
            return None
        series = df[col].astype(str)
        mask = df[col].notna() & (w > 0)
        if int(mask.sum()) < 5:
            return None
        agg = (
            pd.DataFrame({"cat": series[mask], "peso": w[mask]})
            .groupby("cat", as_index=False)["peso"]
            .sum()
            .sort_values("peso", ascending=False)
        )
        if agg.empty:
            return None
        return str(agg.iloc[0]["cat"])

    cohorte_dominante = None
    if "edad" in df.columns:
        scores: dict[str, float] = {}
        edad = pd.to_numeric(df["edad"], errors="coerce")
        for nombre, (lo, hi) in COHORTES.items():
            m = edad.between(lo, hi, inclusive="both") & (w > 0)
            scores[nombre] = float(w[m].sum() / W * 100.0) if int(m.sum()) else 0.0
        if scores:
            cohorte_dominante = max(scores, key=scores.get)

    voto_dist = dist_categorica("intencion_voto", top_n=12)
    recuerdo_dist = dist_categorica("recuerdo_voto", top_n=12)

    problemas_dist = dist_categorica("problema_1", top_n=12)
    for item in problemas_dist:
        item["label"] = PROBLEMAS_LABELS.get(str(item["categoria"]), str(item["categoria"]))

    ccaa_dist = dist_categorica("ccaa", top_n=19)
    for item in ccaa_dist:
        item["label"] = CCAA_NOMBRES.get(str(item["categoria"]).zfill(2), str(item["categoria"]))

    ejes: dict[str, dict[str, float | None]] = {}
    for eje in [
        "ideologia",
        "eje_redistribucion",
        "eje_inmigracion",
        "eje_territorial",
        "eje_valores",
    ]:
        ejes[eje] = {
            "media": wmean(eje),
            "mediana": wmedian(eje),
            "sd": wstd(eje),
            "pct_izq": pct_rango(eje, 1, 4),
            "pct_centro": pct_rango(eje, 5, 6),
            "pct_der": pct_rango(eje, 7, 10),
        }

    return {
        "n_respondentes": int(len(df)),
        "peso_total": float(W),
        "cohorte_generacional": cohorte_dominante,
        "ideologia_media": wmean("ideologia"),
        "eje_redistribucion": wmean("eje_redistribucion"),
        "eje_inmigracion": wmean("eje_inmigracion"),
        "eje_territorial": wmean("eje_territorial"),
        "eje_valores": wmean("eje_valores"),
        "satisfaccion_demo_media": wmean("satisfaccion_demo"),
        "confianza_partidos_media": wmean("confianza_partidos"),
        "interes_politica_media": wmean("interes_politica"),
        "eco_personal_media": wmean("eco_personal"),
        "eco_espana_media": wmean("eco_espana"),
        "pct_pesimistas_eco": pct_equals("perspectiva_eco", 3),
        "clase_social_modal": modal_ponderado("clase_social"),
        "estudios_modal": modal_ponderado("estudios"),
        "situacion_laboral_modal": modal_ponderado("situacion_laboral"),
        "habitat_dominante": modal_ponderado("habitat"),
        "voto_dist": voto_dist,
        "recuerdo_dist": recuerdo_dist,
        "problemas_dist": problemas_dist,
        "ccaa_dist": ccaa_dist,
        "ejes_detalle": ejes,
        "edad_media": wmean("edad"),
    }


def _safe_voto_json(voto_dist: list[dict[str, Any]]) -> str:
    out: dict[str, float] = {}
    for item in voto_dist:
        cat = str(item.get("categoria", "")).strip()
        if not cat:
            continue
        partido = PARTIDOS_LABEL.get(cat, cat)
        try:
            out[partido] = float(item.get("pct") or 0.0)
        except Exception:
            continue
    return json.dumps(out, ensure_ascii=False)


def upsert_perfil_bd(
    conn,
    cluster_id: int,
    nombre: str,
    color: str,
    metricas: dict[str, Any],
    etiqueta_corta: str = "",
    tipo: str = "predefinido",
) -> None:
    """Upsert del perfil principal y recarga de tablas satelite."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO perfiles_votante (
                cluster_id, label, nombre_perfil, color, ideologia_media, edad_media,
                n_respondentes, cohorte_generacional, habitat_dominante,
                clase_social_modal, estudios_modal, situacion_laboral_modal,
                eje_redistribucion, eje_inmigracion, eje_territorial, eje_valores,
                satisfaccion_demo_media, confianza_partidos_media, interes_politica_media,
                eco_personal_media, eco_espana_media, pct_pesimistas_eco,
                distribucion_voto_json, tipo_perfil, fuente_datos, fecha_calculo,
                descripcion_perfil_llm
            ) VALUES (
                %(cluster_id)s, %(label)s, %(nombre_perfil)s, %(color)s, %(ideologia_media)s, %(edad_media)s,
                %(n_respondentes)s, %(cohorte_generacional)s, %(habitat_dominante)s,
                %(clase_social_modal)s, %(estudios_modal)s, %(situacion_laboral_modal)s,
                %(eje_redistribucion)s, %(eje_inmigracion)s, %(eje_territorial)s, %(eje_valores)s,
                %(satisfaccion_demo_media)s, %(confianza_partidos_media)s, %(interes_politica_media)s,
                %(eco_personal_media)s, %(eco_espana_media)s, %(pct_pesimistas_eco)s,
                %(distribucion_voto_json)s, %(tipo_perfil)s, 'microdatos_cis', NOW(), %(descripcion_perfil_llm)s
            )
            ON CONFLICT (cluster_id) DO UPDATE SET
                label                    = EXCLUDED.label,
                nombre_perfil            = EXCLUDED.nombre_perfil,
                color                    = EXCLUDED.color,
                ideologia_media          = EXCLUDED.ideologia_media,
                edad_media               = EXCLUDED.edad_media,
                n_respondentes           = EXCLUDED.n_respondentes,
                cohorte_generacional     = EXCLUDED.cohorte_generacional,
                habitat_dominante        = EXCLUDED.habitat_dominante,
                clase_social_modal       = EXCLUDED.clase_social_modal,
                estudios_modal           = EXCLUDED.estudios_modal,
                situacion_laboral_modal  = EXCLUDED.situacion_laboral_modal,
                eje_redistribucion       = EXCLUDED.eje_redistribucion,
                eje_inmigracion          = EXCLUDED.eje_inmigracion,
                eje_territorial          = EXCLUDED.eje_territorial,
                eje_valores              = EXCLUDED.eje_valores,
                satisfaccion_demo_media  = EXCLUDED.satisfaccion_demo_media,
                confianza_partidos_media = EXCLUDED.confianza_partidos_media,
                interes_politica_media   = EXCLUDED.interes_politica_media,
                eco_personal_media       = EXCLUDED.eco_personal_media,
                eco_espana_media         = EXCLUDED.eco_espana_media,
                pct_pesimistas_eco       = EXCLUDED.pct_pesimistas_eco,
                distribucion_voto_json   = EXCLUDED.distribucion_voto_json,
                tipo_perfil              = EXCLUDED.tipo_perfil,
                fuente_datos             = EXCLUDED.fuente_datos,
                descripcion_perfil_llm   = EXCLUDED.descripcion_perfil_llm,
                fecha_calculo            = NOW()
            """,
            {
                **metricas,
                "cluster_id": cluster_id,
                "label": nombre,
                "nombre_perfil": nombre,
                "color": color,
                "tipo_perfil": tipo,
                "descripcion_perfil_llm": etiqueta_corta or nombre,
                "distribucion_voto_json": _safe_voto_json(metricas.get("voto_dist", [])),
            },
        )

        for tabla in ["perfil_problemas", "perfil_ccaa", "perfil_voto", "perfil_ejes"]:
            cur.execute(f"DELETE FROM {tabla} WHERE cluster_id = %s", (cluster_id,))

        problemas_rows = [
            (cluster_id, p.get("label", str(p.get("categoria", ""))), float(p.get("pct") or 0.0), i)
            for i, p in enumerate(metricas.get("problemas_dist", []), 1)
            if p.get("categoria") is not None
        ]
        if problemas_rows:
            execute_values(
                cur,
                """
                INSERT INTO perfil_problemas (cluster_id, problema, pct, ranking)
                VALUES %s
                ON CONFLICT (cluster_id, problema) DO UPDATE SET
                    pct = EXCLUDED.pct,
                    ranking = EXCLUDED.ranking
                """,
                problemas_rows,
                page_size=500,
            )

        ccaa_rows = [
            (cluster_id, p.get("label", str(p.get("categoria", ""))), float(p.get("pct") or 0.0))
            for p in metricas.get("ccaa_dist", [])
            if p.get("categoria") is not None
        ]
        if ccaa_rows:
            execute_values(
                cur,
                """
                INSERT INTO perfil_ccaa (cluster_id, ccaa, pct)
                VALUES %s
                ON CONFLICT (cluster_id, ccaa) DO UPDATE SET
                    pct = EXCLUDED.pct
                """,
                ccaa_rows,
                page_size=500,
            )

        voto_map: dict[str, dict[str, float | None]] = {}
        for p in metricas.get("voto_dist", []):
            cat = str(p.get("categoria", "")).strip()
            if not cat:
                continue
            party = PARTIDOS_LABEL.get(cat, cat)
            voto_map.setdefault(party, {"pct_intencion": None, "pct_recuerdo": None})
            voto_map[party]["pct_intencion"] = float(p.get("pct") or 0.0)
        for p in metricas.get("recuerdo_dist", []):
            cat = str(p.get("categoria", "")).strip()
            if not cat:
                continue
            party = PARTIDOS_LABEL.get(cat, cat)
            voto_map.setdefault(party, {"pct_intencion": None, "pct_recuerdo": None})
            voto_map[party]["pct_recuerdo"] = float(p.get("pct") or 0.0)
        voto_rows = [
            (cluster_id, party, vals.get("pct_intencion"), vals.get("pct_recuerdo"))
            for party, vals in voto_map.items()
        ]
        if voto_rows:
            execute_values(
                cur,
                """
                INSERT INTO perfil_voto (cluster_id, partido, pct_intencion, pct_recuerdo)
                VALUES %s
                ON CONFLICT (cluster_id, partido) DO UPDATE SET
                    pct_intencion = EXCLUDED.pct_intencion,
                    pct_recuerdo = EXCLUDED.pct_recuerdo
                """,
                voto_rows,
                page_size=500,
            )

        ejes_rows = [
            (
                cluster_id,
                eje,
                vals.get("media"),
                vals.get("mediana"),
                vals.get("sd"),
                vals.get("pct_izq"),
                vals.get("pct_centro"),
                vals.get("pct_der"),
            )
            for eje, vals in metricas.get("ejes_detalle", {}).items()
        ]
        if ejes_rows:
            execute_values(
                cur,
                """
                INSERT INTO perfil_ejes
                    (cluster_id, eje, media, mediana, sd, pct_izq, pct_centro, pct_der)
                VALUES %s
                ON CONFLICT (cluster_id, eje) DO UPDATE SET
                    media = EXCLUDED.media,
                    mediana = EXCLUDED.mediana,
                    sd = EXCLUDED.sd,
                    pct_izq = EXCLUDED.pct_izq,
                    pct_centro = EXCLUDED.pct_centro,
                    pct_der = EXCLUDED.pct_der
                """,
                ejes_rows,
                page_size=500,
            )

    conn.commit()


def _encontrar_cluster_cercano(metricas: dict[str, Any], conn) -> tuple[int | None, float]:
    """Devuelve cluster predefinido mas cercano usando cosine similarity."""
    df_pv = pd.read_sql(
        """
        SELECT cluster_id, ideologia_media, eje_redistribucion,
               eje_inmigracion, eje_territorial, eje_valores, eco_personal_media
        FROM perfiles_votante
        WHERE tipo_perfil = 'predefinido' AND cluster_id IS NOT NULL
        """,
        conn,
    )
    if df_pv.empty:
        return None, 0.0

    ejes = [
        "ideologia_media",
        "eje_redistribucion",
        "eje_inmigracion",
        "eje_territorial",
        "eje_valores",
        "eco_personal_media",
    ]

    vec_nuevo = np.array([float(metricas.get(e) or 5.0) for e in ejes], dtype=float)
    mejor_id: int | None = None
    mejor_sim = 0.0

    for _, row in df_pv.iterrows():
        vec_ref = np.array([float(row.get(e) or 5.0) for e in ejes], dtype=float)
        norma = float(np.linalg.norm(vec_nuevo) * np.linalg.norm(vec_ref))
        if norma == 0:
            continue
        sim = float(np.dot(vec_nuevo, vec_ref) / norma)
        if sim > mejor_sim:
            mejor_sim = sim
            mejor_id = int(row["cluster_id"])

    return mejor_id, round(mejor_sim, 3)


def run_segmentacion(conn) -> dict[str, int]:
    """Ejecuta segmentacion completa de perfiles predefinidos."""
    logger.info("Cargando microdatos...")
    df = cargar_microdatos(conn)
    logger.info("Microdatos cargados: %s filas, %s columnas", len(df), len(df.columns))

    faltantes = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
    if faltantes:
        raise ValueError(f"Microdatos incompletos; faltan columnas: {faltantes}")

    resultados: dict[str, int] = {}
    for perfil_def in PERFILES_PREDEFINIDOS:
        nombre = str(perfil_def["nombre"])
        sub = aplicar_filtros(df, dict(perfil_def.get("filtros", {})))
        logger.info("Perfil '%s': %s encuestados", nombre, len(sub))
        if len(sub) < 30:
            logger.warning("Perfil '%s' omitido por bajo n (%s)", nombre, len(sub))
            continue

        metricas = calcular_metricas_subconjunto(sub)
        if not metricas:
            logger.warning("Perfil '%s' sin metricas validas; se omite", nombre)
            continue

        upsert_perfil_bd(
            conn=conn,
            cluster_id=int(perfil_def["cluster_id"]),
            nombre=nombre,
            color=str(perfil_def.get("color", "#666666")),
            metricas=metricas,
            etiqueta_corta=str(perfil_def.get("etiqueta_corta", "")),
            tipo="predefinido",
        )
        resultados[nombre] = int(metricas.get("n_respondentes") or 0)

    return resultados


def analizar_perfil_personalizado(
    conn,
    filtros: dict[str, Any],
    nombre: str = "Perfil personalizado",
    usuario: str = "default",
) -> dict[str, Any]:
    """Calcula y persiste analisis de un perfil ad-hoc por filtros."""
    df = cargar_microdatos(conn)
    sub = aplicar_filtros(df, filtros)

    if len(sub) < 10:
        return {"error": "Subconjunto demasiado pequeno (< 10 casos). Amplia los filtros."}

    metricas = calcular_metricas_subconjunto(sub)
    if not metricas:
        return {"error": "No se pudieron calcular metricas para el subconjunto."}

    metricas["pct_poblacion"] = round(float(sub["peso"].sum()) / float(df["peso"].sum()) * 100.0, 2)

    cluster_cercano, similitud = _encontrar_cluster_cercano(metricas, conn)
    metricas["cluster_mas_cercano"] = cluster_cercano
    metricas["similitud_cluster"] = similitud

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO perfiles_personalizados
                (usuario, nombre, filtros_json, n_respondentes, pct_poblacion,
                 resultado_json, cluster_mas_cercano, similitud_cluster, actualizado_en)
            VALUES (%s, %s, %s::jsonb, %s, %s, %s::jsonb, %s, %s, NOW())
            ON CONFLICT (usuario, nombre) DO UPDATE SET
                filtros_json = EXCLUDED.filtros_json,
                n_respondentes = EXCLUDED.n_respondentes,
                pct_poblacion = EXCLUDED.pct_poblacion,
                resultado_json = EXCLUDED.resultado_json,
                cluster_mas_cercano = EXCLUDED.cluster_mas_cercano,
                similitud_cluster = EXCLUDED.similitud_cluster,
                actualizado_en = NOW()
            """,
            (
                usuario,
                nombre,
                json.dumps(filtros, ensure_ascii=False),
                int(metricas.get("n_respondentes") or 0),
                float(metricas.get("pct_poblacion") or 0.0),
                json.dumps(metricas, ensure_ascii=False, default=str),
                cluster_cercano,
                similitud,
            ),
        )
    conn.commit()

    return metricas


if __name__ == "__main__":
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL no definida")

    conn = psycopg2.connect(db_url)
    try:
        resultados = run_segmentacion(conn)
        for nombre, n in resultados.items():
            logger.info("perfil=%s n_respondentes=%s", nombre, n)
    finally:
        conn.close()
