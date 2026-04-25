"""
Motor de análisis de cohortes sobre microdatos de encuestas.

Calcula distribuciones de voto, asociaciones estadísticas (chi², tau Goodman-Kruskal,
V de Cramér), construye perfiles multidimensionales y genera prompts listos para LLM.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ── Etiquetas canónicas ────────────────────────────────────────────────────────
ETIQUETAS_SEXO      = {1: "Hombre", 2: "Mujer"}
ETIQUETAS_ESTUDIOS  = {
    1: "Sin estudios", 2: "Primaria incompleta", 3: "Primaria (EGB/Bach. elem.)",
    4: "Secundaria (ESO/Bach.)", 5: "FP medio/superior",
    6: "Universitaria (grado/diplomatura)", 7: "Universitaria (máster/doctorado)",
}
ETIQUETAS_SITLAB    = {
    1: "Trabajando (ajena)", 2: "Trabajando (propia)", 3: "Desempleado/a",
    4: "Jubilado/pensionista", 5: "Estudiante", 6: "Labores del hogar",
}
ETIQUETAS_CLASESUB  = {
    1: "Alta/Media-alta", 2: "Media", 3: "Media-baja", 4: "Obrera", 5: "Pobre/Baja",
}
ETIQUETAS_CCAA      = {
    1: "Andalucía", 2: "Aragón", 3: "Asturias", 4: "Baleares", 5: "Canarias",
    6: "Cantabria", 7: "Castilla-La Mancha", 8: "Castilla y León", 9: "Cataluña",
    10: "C. Valenciana", 11: "Extremadura", 12: "Galicia", 13: "Madrid",
    14: "Murcia", 15: "Navarra", 16: "País Vasco", 17: "La Rioja",
    18: "Ceuta", 19: "Melilla",
}
ETIQUETAS_HABITAT   = {
    1: "<2.000 hab.", 2: "2.001–10.000", 3: "10.001–50.000",
    4: "50.001–100.000", 5: "100.001–400.000", 6: "400.001–1M", 7: ">1M",
}

IDEO_LABEL = {
    1: "Extrema izquierda", 2: "Izquierda", 3: "Centro-izquierda",
    4: "Centro-izquierda", 5: "Centro", 6: "Centro",
    7: "Centro-derecha", 8: "Centro-derecha", 9: "Derecha", 10: "Extrema derecha",
}

MISSING_CODES = frozenset({97, 98, 99, 997, 998, 999, -1, -99})


# ── Utilidades internas ────────────────────────────────────────────────────────

def _clean(series: pd.Series) -> pd.Series:
    """Reemplaza códigos de no-respuesta por NaN."""
    return series.where(~series.isin(MISSING_CODES), other=np.nan)


def _weighted_freq(series: pd.Series, weights: pd.Series | None = None) -> pd.Series:
    """Frecuencias ponderadas normalizadas (%)."""
    if weights is None:
        weights = pd.Series(1.0, index=series.index)
    valid = series.notna()
    s = series[valid]
    w = weights[valid]
    if s.empty:
        return pd.Series(dtype=float)
    totals = w.groupby(s).sum()
    return (totals / totals.sum() * 100).round(2)


def _age_tramo(edad: pd.Series) -> pd.Series:
    """Categoriza edad en tramos estándar."""
    bins   = [17, 24, 34, 44, 54, 64, 74, 120]
    labels = ["18-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75+"]
    return pd.cut(edad, bins=bins, labels=labels, right=True)


# ── Análisis estadístico de asociación ────────────────────────────────────────

def contingency_stats(
    df: pd.DataFrame,
    var_fila: str,
    var_col: str,
    weight_col: str = "peso",
) -> dict[str, Any]:
    """
    Tabla de contingencia ponderada + chi², V Cramér, tau Goodman-Kruskal.

    Returns dict con keys: chi2, p_valor, cramer_v, tau_gk, tabla (dict anidado).
    """
    if var_fila not in df.columns or var_col not in df.columns:
        return {"chi2": None, "p_valor": None, "cramer_v": None, "tau_gk": None, "tabla": {}}

    w = df[weight_col].fillna(1.0) if weight_col in df.columns else pd.Series(1.0, index=df.index)
    sub = df[[var_fila, var_col]].copy()
    sub[var_fila] = _clean(pd.to_numeric(sub[var_fila], errors="coerce"))
    sub[var_col]  = _clean(pd.to_numeric(sub[var_col],  errors="coerce"))
    valid = sub.notna().all(axis=1)
    sub, w = sub[valid], w[valid]

    if len(sub) < 10:
        return {"chi2": None, "p_valor": None, "cramer_v": None, "tau_gk": None, "tabla": {}}

    # Tabla de contingencia ponderada
    rows = sorted(sub[var_fila].unique())
    cols = sorted(sub[var_col].unique())
    tabla = pd.DataFrame(0.0, index=rows, columns=cols)
    for (r, c), grp in sub.groupby([var_fila, var_col]):
        tabla.loc[r, c] = w.loc[grp.index].sum()

    tabla_pct = tabla.div(tabla.sum().sum()) * 100

    # Chi²
    try:
        from scipy.stats import chi2_contingency  # type: ignore
        chi2_stat, p_val, dof, _ = chi2_contingency(tabla.values)
    except ImportError:
        # Sin scipy: estimación manual chi²
        expected = np.outer(tabla.sum(axis=1), tabla.sum(axis=0)) / tabla.values.sum()
        chi2_stat = float(((tabla.values - expected) ** 2 / (expected + 1e-10)).sum())
        p_val = 0.0 if chi2_stat > 100 else 0.05
        dof   = (len(rows) - 1) * (len(cols) - 1)

    n = tabla.values.sum()
    k = min(len(rows), len(cols))

    # V de Cramér
    cramer_v = float(np.sqrt(chi2_stat / (n * max(k - 1, 1)))) if n > 0 else 0.0

    # Tau de Goodman-Kruskal (tau_c→r: columna predice fila = voto)
    tau_gk = _goodman_kruskal_tau(tabla.values)

    return {
        "chi2":     round(float(chi2_stat), 4),
        "p_valor":  round(float(p_val), 8),
        "cramer_v": round(cramer_v, 6),
        "tau_gk":   round(tau_gk, 6),
        "tabla":    tabla_pct.round(2).to_dict(),
    }


def _goodman_kruskal_tau(tabla: np.ndarray) -> float:
    """
    Tau de Goodman-Kruskal (c → r).
    Mide cuánto reduce la variable-columna la variación en la fila.
    """
    n = tabla.sum()
    if n == 0:
        return 0.0
    row_marg = tabla.sum(axis=1)
    col_marg = tabla.sum(axis=0)

    # Error de predicción marginal (fila)
    p_row = row_marg / n
    e1 = 1.0 - (p_row ** 2).sum()

    # Error de predicción condicional (columna dado fila)
    e2 = 0.0
    for j, col_sum in enumerate(col_marg):
        if col_sum == 0:
            continue
        p_col_j = tabla[:, j] / col_sum
        e2 += (col_sum / n) * (1.0 - (p_col_j ** 2).sum())

    return float((e1 - e2) / e1) if e1 > 0 else 0.0


# ── Motor principal de análisis de cohortes ──────────────────────────────────

class CohortAnalyzer:
    """
    Analiza microdatos de encuesta para construir perfiles de votante calibrados.

    Parameters
    ----------
    df : DataFrame normalizado con columnas canónicas (ver microdatos_loader)
    weight_col : columna de pesos muestrales (default "peso")
    vote_col : columna de intención de voto (default "intencion_voto_grupo" o "intencion_voto")
    """

    def __init__(
        self,
        df: pd.DataFrame,
        weight_col: str = "peso",
        vote_col: str | None = None,
    ) -> None:
        self.df = df.copy()
        self.weight_col = weight_col if weight_col in df.columns else None

        # Seleccionar columna de voto disponible
        if vote_col and vote_col in df.columns:
            self.vote_col = vote_col
        elif "intencion_voto_grupo" in df.columns:
            self.vote_col = "intencion_voto_grupo"
        elif "intencion_voto" in df.columns:
            self.vote_col = "intencion_voto"
        else:
            self.vote_col = None

        self._weights = (
            self.df[weight_col].fillna(1.0)
            if weight_col in df.columns
            else pd.Series(1.0, index=df.index)
        )

    # ── Filtrado ──────────────────────────────────────────────────────────────

    def filter(self, criterios: dict[str, Any]) -> "CohortAnalyzer":
        """
        Filtra el DataFrame por criterios.

        criterios = {
            "sexo": 2,                         # valor exacto
            "escideol": (1, 4),                # rango [min, max]
            "ccaa": [13, 16],                  # lista de valores
            "edad": (25, 45),                  # rango
        }
        """
        mask = pd.Series(True, index=self.df.index)
        for col, val in criterios.items():
            if col not in self.df.columns:
                continue
            series = pd.to_numeric(self.df[col], errors="coerce")
            if isinstance(val, (list, tuple)) and len(val) == 2 and not isinstance(val[0], (list, tuple)):
                # Rango o lista de 2 elementos: distinguir por tipo
                if isinstance(val, tuple):
                    mask &= series.between(val[0], val[1], inclusive="both")
                else:
                    mask &= series.isin(val)
            elif isinstance(val, list):
                mask &= series.isin(val)
            else:
                mask &= series == val
        return CohortAnalyzer(self.df[mask], self.weight_col or "peso", self.vote_col)

    # ── Distribuciones ────────────────────────────────────────────────────────

    def vote_distribution(self) -> dict[str, float]:
        """Distribución ponderada de intención de voto (%)."""
        if not self.vote_col:
            return {}
        series = _clean(self.df[self.vote_col].astype(str))
        freq = _weighted_freq(series, self._weights)
        return freq.sort_values(ascending=False).to_dict()

    def ideology_distribution(self) -> dict[str, float]:
        """Distribución ponderada de escala ideológica 1-10 (%)."""
        if "escideol" not in self.df.columns:
            return {}
        series = _clean(pd.to_numeric(self.df["escideol"], errors="coerce"))
        freq = _weighted_freq(series, self._weights)
        return {str(int(k)): v for k, v in freq.items() if pd.notna(k)}

    def distribution_of(self, col: str, etiquetas: dict | None = None) -> dict[str, float]:
        """Distribución ponderada genérica para cualquier variable categórica."""
        if col not in self.df.columns:
            return {}
        series = _clean(pd.to_numeric(self.df[col], errors="coerce"))
        freq = _weighted_freq(series, self._weights)
        if etiquetas:
            return {etiquetas.get(int(k), str(int(k))): v
                    for k, v in freq.items() if pd.notna(k)}
        return {str(int(k)): v for k, v in freq.items() if pd.notna(k)}

    def ccaa_distribution(self) -> dict[str, float]:
        return self.distribution_of("ccaa", ETIQUETAS_CCAA)

    def age_distribution(self) -> dict[str, float]:
        if "edad" not in self.df.columns:
            return {}
        tramos = _age_tramo(_clean(pd.to_numeric(self.df["edad"], errors="coerce")))
        freq = _weighted_freq(tramos.astype(str), self._weights)
        return freq.to_dict()

    # ── Estadísticos clave ────────────────────────────────────────────────────

    def key_stats(self) -> dict[str, Any]:
        """Estadísticos resumidos del cohorte."""
        n = len(self.df)
        peso_total = float(self._weights.sum())

        ideo = _clean(pd.to_numeric(self.df.get("escideol", pd.Series(dtype=float)), errors="coerce"))
        edad = _clean(pd.to_numeric(self.df.get("edad",    pd.Series(dtype=float)), errors="coerce"))

        w = self._weights

        def wmean(s: pd.Series) -> float | None:
            valid = s.notna()
            if valid.sum() == 0:
                return None
            return float((s[valid] * w[valid]).sum() / w[valid].sum())

        def wstd(s: pd.Series, mean: float | None) -> float | None:
            if mean is None:
                return None
            valid = s.notna()
            if valid.sum() < 2:
                return None
            variance = ((s[valid] - mean) ** 2 * w[valid]).sum() / w[valid].sum()
            return float(np.sqrt(variance))

        ideo_mean = wmean(ideo)
        edad_mean = wmean(edad)

        return {
            "n_respondentes":    n,
            "peso_ponderado":    round(peso_total, 2),
            "escideol_media":    round(ideo_mean, 2) if ideo_mean is not None else None,
            "escideol_std":      round(wstd(ideo, ideo_mean) or 0, 2),
            "edad_media":        round(edad_mean, 1) if edad_mean is not None else None,
            "pct_mujeres":       round(float((self.df.get("sexo", pd.Series()) == 2).sum() / max(n, 1) * 100), 1),
        }

    # ── Análisis de asociaciones ──────────────────────────────────────────────

    def top_associations(
        self,
        predictoras: list[str] | None = None,
        top_n: int = 10,
    ) -> list[dict[str, Any]]:
        """
        Calcula tau GK entre cada variable predictora y la intención de voto.
        Devuelve lista ordenada de mayor a menor asociación.
        """
        if not self.vote_col:
            return []
        predictoras = predictoras or [
            "escideol", "recuerdo_voto", "cercania_partido",
            "sexo", "estudios", "sitlab", "clase_subjetiva",
            "ccaa", "habitat", "edad_tramo",
        ]
        results = []
        for var in predictoras:
            if var not in self.df.columns:
                continue
            stats = contingency_stats(self.df, self.vote_col, var, self.weight_col or "peso")
            if stats["chi2"] is not None:
                results.append({
                    "variable":  var,
                    "chi2":      stats["chi2"],
                    "tau_gk":    stats["tau_gk"],
                    "cramer_v":  stats["cramer_v"],
                    "p_valor":   stats["p_valor"],
                })
        results.sort(key=lambda x: x["tau_gk"] or 0, reverse=True)
        return results[:top_n]

    # ── Construcción de perfiles ──────────────────────────────────────────────

    def build_voter_profile(self, etiqueta: str = "Perfil derivado de microdatos") -> dict[str, Any]:
        """
        Construye un perfil de votante completo (compatible con la estructura de PERFILES
        usada en 5_Agentes_LLM.py) a partir de los datos del cohorte.
        """
        stats   = self.key_stats()
        voto    = self.vote_distribution()
        ideo    = self.ideology_distribution()
        ccaa    = self.ccaa_distribution()
        edad_d  = self.age_distribution()
        sexo_d  = self.distribution_of("sexo",        ETIQUETAS_SEXO)
        est_d   = self.distribution_of("estudios",     ETIQUETAS_ESTUDIOS)
        cls_d   = self.distribution_of("clase_subjetiva", ETIQUETAS_CLASESUB)
        sit_d   = self.distribution_of("sitlab",       ETIQUETAS_SITLAB)

        ideo_media = stats.get("escideol_media") or 5.0
        ideo_label = IDEO_LABEL.get(int(round(ideo_media)), "Centro")

        top_preocupaciones = self._extract_preocupaciones()
        top_ccaa = dict(sorted(ccaa.items(), key=lambda x: x[1], reverse=True)[:6])

        return {
            "etiqueta":            etiqueta,
            "peso":                round(stats["peso_ponderado"] / max(stats["peso_ponderado"], 1), 4),
            "n_respondentes":      stats["n_respondentes"],
            "ideo_media":          round(ideo_media, 2),
            "ideo_label":          ideo_label,
            "edad_media":          stats.get("edad_media") or 45,
            "intencion_voto":      voto,
            "preocupaciones":      top_preocupaciones,
            "ccaa":                top_ccaa,
            "distribucion_sexo":   sexo_d,
            "distribucion_estudios": est_d,
            "distribucion_clase":  cls_d,
            "distribucion_sitlab": sit_d,
            "distribucion_ideo":   ideo,
            "fuente_datos":        "microdatos_reales",
        }

    def _extract_preocupaciones(self) -> list[tuple[str, int]]:
        """Extrae distribución de problemas mencionados si existen las variables."""
        prob_cols = ["problema_principal_1", "problema_principal_2",
                     "problema_personal_1", "problema_personal_2"]
        available = [c for c in prob_cols if c in self.df.columns]
        if not available:
            return []

        all_vals: list[str] = []
        for col in available:
            all_vals.extend(self.df[col].dropna().astype(str).tolist())

        freq = pd.Series(all_vals).value_counts(normalize=True)
        return [(str(v), int(round(pct * 100))) for v, pct in freq.head(8).items()]

    # ── Prompt LLM ────────────────────────────────────────────────────────────

    def build_llm_prompt(
        self,
        criterios: dict[str, Any] | None = None,
        etiqueta: str = "votante",
    ) -> str:
        """
        Genera un prompt descriptivo del perfil para el LLM.
        Basado en el método de Yu et al. (2024): descripción demográfica + ideológica + historial.
        """
        stats   = self.key_stats()
        voto    = self.vote_distribution()
        ideo    = self.key_stats().get("escideol_media") or 5.0

        top_voto = sorted(voto.items(), key=lambda x: x[1], reverse=True)[:3]
        voto_desc = ", ".join(f"{p} ({v:.0f}%)" for p, v in top_voto)

        sexo_d  = self.distribution_of("sexo", ETIQUETAS_SEXO)
        sexo_mayoritario = max(sexo_d, key=sexo_d.get, default="") if sexo_d else ""

        edad_media = stats.get("edad_media")
        edad_desc  = f"{edad_media:.0f} años" if edad_media else "edad media desconocida"

        est_d = self.distribution_of("estudios", ETIQUETAS_ESTUDIOS)
        est_mayoritario = max(est_d, key=est_d.get, default="") if est_d else ""

        cls_d = self.distribution_of("clase_subjetiva", ETIQUETAS_CLASESUB)
        cls_mayoritaria = max(cls_d, key=cls_d.get, default="") if cls_d else ""

        ccaa_d = self.ccaa_distribution()
        ccaa_top = max(ccaa_d, key=ccaa_d.get, default="") if ccaa_d else ""

        ideo_label = IDEO_LABEL.get(int(round(ideo)), "Centro")

        criterios_desc = ""
        if criterios:
            parts = []
            for k, v in criterios.items():
                parts.append(f"{k}={v}")
            criterios_desc = f" (filtro: {', '.join(parts)})"

        return (
            f"Eres un {etiqueta} español{criterios_desc}. "
            f"Tu perfil demográfico predominante: {sexo_mayoritario}, "
            f"{edad_desc}, estudios {est_mayoritario.lower() or 'medios'}, "
            f"clase {cls_mayoritaria.lower() or 'media'}, "
            f"residente principalmente en {ccaa_top or 'España'}. "
            f"Te ubicas en el {ideo_label.lower()} de la escala ideológica "
            f"(posición media {ideo:.1f}/10). "
            f"En este segmento, la intención de voto se distribuye: {voto_desc}. "
            f"Basándote en estas características, ¿a qué partido votarías hoy y por qué? "
            f"Responde en primera persona de forma breve y directa."
        )


# ── Segmentación automática en perfiles ──────────────────────────────────────

def auto_segment(
    df: pd.DataFrame,
    n_perfiles: int = 6,
    method: str = "ideology_x_vote",
    weight_col: str = "peso",
) -> list[dict[str, Any]]:
    """
    Segmentación automática del electorado en N perfiles.

    method="ideology_x_vote": cruza escala ideológica con recuerdo de voto.
    Devuelve lista de dicts con datos de cada cohorte (compatible con PERFILES en 5_Agentes_LLM).
    """
    if method == "ideology_x_vote" and "escideol" in df.columns:
        return _segment_by_ideology(df, n_perfiles, weight_col)
    return _segment_by_demographics(df, n_perfiles, weight_col)


def _segment_by_ideology(
    df: pd.DataFrame,
    n_perfiles: int,
    weight_col: str,
) -> list[dict[str, Any]]:
    ideo = _clean(pd.to_numeric(df.get("escideol", pd.Series(dtype=float)), errors="coerce"))
    valid_mask = ideo.notna()
    df_v = df[valid_mask].copy()
    ideo_v = ideo[valid_mask]

    # Definir cortes según n_perfiles solicitados
    if n_perfiles <= 3:
        bins = [0.5, 3.5, 6.5, 10.5]
        labels = ["Izquierda (1-3)", "Centro (4-6)", "Derecha (7-10)"]
    elif n_perfiles <= 5:
        bins = [0.5, 2.5, 4.5, 6.5, 8.5, 10.5]
        labels = ["Extrema izq. (1-2)", "Izquierda (3-4)", "Centro (5-6)",
                  "Derecha (7-8)", "Extrema der. (9-10)"]
    else:
        bins = [0.5, 1.5, 3.5, 5.5, 6.5, 8.5, 10.5]
        labels = ["Extrema izq. (1)", "Izquierda (2-3)", "Centro-izq. (4-5)",
                  "Centro-der. (6)", "Derecha (7-8)", "Extrema der. (9-10)"]

    tramos = pd.cut(ideo_v, bins=bins, labels=labels)
    df_v = df_v.copy()
    df_v["_tramo_ideo"] = tramos.values

    total_peso = (df_v[weight_col].fillna(1.0) if weight_col in df_v.columns
                  else pd.Series(1.0, index=df_v.index)).sum()

    perfiles: list[dict[str, Any]] = []
    for label in labels:
        sub = df_v[df_v["_tramo_ideo"] == label]
        if len(sub) < 10:
            continue
        analyzer = CohortAnalyzer(sub, weight_col)
        perfil = analyzer.build_voter_profile(etiqueta=label)
        # Calcular peso relativo al total
        sub_peso = (sub[weight_col].fillna(1.0) if weight_col in sub.columns
                    else pd.Series(1.0, index=sub.index)).sum()
        perfil["peso"] = round(float(sub_peso / max(total_peso, 1)), 4)
        perfiles.append(perfil)

    return perfiles


def _segment_by_demographics(
    df: pd.DataFrame,
    n_perfiles: int,
    weight_col: str,
) -> list[dict[str, Any]]:
    """Fallback: segmentación por edad × estudios."""
    age_col = "edad"
    if age_col not in df.columns:
        return []

    df = df.copy()
    df["_tramo_edad"] = _age_tramo(_clean(pd.to_numeric(df[age_col], errors="coerce")))

    perfiles: list[dict[str, Any]] = []
    total_peso = (df[weight_col].fillna(1.0) if weight_col in df.columns
                  else pd.Series(1.0, index=df.index)).sum()

    for tramo, sub in df.groupby("_tramo_edad", observed=True):
        if len(sub) < 10:
            continue
        analyzer = CohortAnalyzer(sub, weight_col)
        perfil = analyzer.build_voter_profile(etiqueta=f"Tramo {tramo}")
        sub_peso = (sub[weight_col].fillna(1.0) if weight_col in sub.columns
                    else pd.Series(1.0, index=sub.index)).sum()
        perfil["peso"] = round(float(sub_peso / max(total_peso, 1)), 4)
        perfiles.append(perfil)
        if len(perfiles) >= n_perfiles:
            break

    return perfiles


# ── Corrección de sesgo del LLM (calibración) ─────────────────────────────────

def calibrate_llm_output(
    llm_distribution: dict[str, float],
    empirical_distribution: dict[str, float],
    alpha: float = 0.5,
) -> dict[str, float]:
    """
    Combina la distribución generada por el LLM con la distribución empírica real
    para reducir el sesgo de amplificación de cohortes (Yu et al., 2024).

    alpha=0: 100% distribución LLM; alpha=1: 100% datos empíricos; default 0.5 = promedio.
    """
    todos = set(llm_distribution) | set(empirical_distribution)
    result: dict[str, float] = {}
    for p in todos:
        v_llm = llm_distribution.get(p, 0.0)
        v_emp = empirical_distribution.get(p, 0.0)
        result[p] = round((1 - alpha) * v_llm + alpha * v_emp, 3)
    total = sum(result.values())
    if total > 0:
        result = {k: round(v / total * 100, 2) for k, v in result.items()}
    return dict(sorted(result.items(), key=lambda x: x[1], reverse=True))
