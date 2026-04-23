"""Modelo de propensión al voto blando y transferible."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd

_PESOS = {
    "volatilidad_historica": 0.30,
    "distancia_ideologica": 0.25,
    "insatisfaccion_gobierno": 0.20,
    "desempleo_local": 0.15,
    "fragmentacion": 0.10,
}


@dataclass
class InputsBlandura:
    circunscripcion: str
    partido_ref: str
    volatilidad_historica: float = 0.0
    distancia_ideologica: float = 0.0
    insatisfaccion_gobierno: float = 0.0
    desempleo_local: float = 0.0
    fragmentacion: float = 0.0
    segmento_edad: Optional[str] = None
    segmento_estudios: Optional[str] = None
    segmento_ideologia: Optional[str] = None
    n_electores_est: int = 0


@dataclass
class ResultadoBlandura:
    circunscripcion: str
    partido_ref: str
    score_medio_blando: float
    pct_voto_blando: float
    pct_probable_abst: float
    pct_transferible: float
    dist_quintiles: dict = field(default_factory=dict)
    etiqueta: str = "blando"
    contribuciones: dict = field(default_factory=dict)


def _clip01(v: float) -> float:
    return min(max(float(v), 0.0), 1.0)


def _score_to_pct_blando(score: float) -> float:
    return _clip01(1 / (1 + math.exp(-10 * (score - 0.45))))


def _score_to_pct_abst(score: float, insatisfaccion: float) -> float:
    return _clip01(score * 0.4 + insatisfaccion * 0.2)


def _score_to_pct_transferible(score: float, fragmentacion: float) -> float:
    return _clip01(min(score * 0.5 * (1 + fragmentacion * 0.3), 0.60))


def _etiqueta(score: float) -> str:
    if score >= 0.60:
        return "muy_blando"
    if score >= 0.33:
        return "blando"
    return "duro"


def calcular_score_analitico(inp: InputsBlandura) -> ResultadoBlandura:
    valores = {
        "volatilidad_historica": _clip01(inp.volatilidad_historica),
        "distancia_ideologica": _clip01(inp.distancia_ideologica),
        "insatisfaccion_gobierno": _clip01(inp.insatisfaccion_gobierno),
        "desempleo_local": _clip01(inp.desempleo_local),
        "fragmentacion": _clip01(inp.fragmentacion),
    }

    bonus_centro = 0.05 if inp.segmento_ideologia in {"centro", "centro_izq", "centro_der"} else 0.0
    score = _clip01(sum(_PESOS[k] * valores[k] for k in _PESOS) + bonus_centro)

    quintiles = {
        "q20": round(max(score - 0.25, 0.0), 3),
        "q40": round(max(score - 0.10, 0.0), 3),
        "q60": round(min(score + 0.10, 1.0), 3),
        "q80": round(min(score + 0.25, 1.0), 3),
    }

    pct_blando = _score_to_pct_blando(score)
    pct_abst = _score_to_pct_abst(score, valores["insatisfaccion_gobierno"])
    pct_transfer = _score_to_pct_transferible(score, valores["fragmentacion"])

    contrib = {k: round(_PESOS[k] * valores[k], 4) for k in _PESOS}

    return ResultadoBlandura(
        circunscripcion=inp.circunscripcion,
        partido_ref=inp.partido_ref,
        score_medio_blando=round(score, 4),
        pct_voto_blando=round(pct_blando, 4),
        pct_probable_abst=round(pct_abst, 4),
        pct_transferible=round(pct_transfer, 4),
        dist_quintiles=quintiles,
        etiqueta=_etiqueta(score),
        contribuciones=contrib,
    )


def calcular_scores_dataframe(df_inputs: pd.DataFrame) -> pd.DataFrame:
    if df_inputs.empty:
        return pd.DataFrame()
    out: list[dict] = []
    for _, row in df_inputs.iterrows():
        inp = InputsBlandura(
            circunscripcion=str(row.get("circunscripcion", "nacional")),
            partido_ref=str(row.get("partido_ref", "PSOE")),
            volatilidad_historica=float(row.get("volatilidad_historica", 0.0) or 0.0),
            distancia_ideologica=float(row.get("distancia_ideologica", 0.0) or 0.0),
            insatisfaccion_gobierno=float(row.get("insatisfaccion_gobierno", 0.0) or 0.0),
            desempleo_local=float(row.get("desempleo_local", 0.0) or 0.0),
            fragmentacion=float(row.get("fragmentacion", 0.0) or 0.0),
            segmento_edad=row.get("segmento_edad"),
            segmento_estudios=row.get("segmento_estudios"),
            segmento_ideologia=row.get("segmento_ideologia"),
            n_electores_est=int(row.get("n_electores_est", 0) or 0),
        )
        r = calcular_score_analitico(inp)
        out.append(
            {
                "circunscripcion": r.circunscripcion,
                "partido_ref": r.partido_ref,
                "score_medio_blando": r.score_medio_blando,
                "pct_voto_blando": r.pct_voto_blando,
                "pct_probable_abst": r.pct_probable_abst,
                "pct_transferible": r.pct_transferible,
                "dist_quintiles": r.dist_quintiles,
                "etiqueta": r.etiqueta,
                "contribuciones": r.contribuciones,
            }
        )
    return pd.DataFrame(out)


# ─────────────────────────────────────────────────────────────────────────────
# Extensiones bloque 7 (agregación provincial + segmentos + payload API)
# ─────────────────────────────────────────────────────────────────────────────

_PROVINCIAS_ES = [
    "Madrid",
    "Barcelona",
    "Valencia",
    "Sevilla",
    "Alicante",
    "Malaga",
    "Murcia",
    "Cadiz",
    "Vizcaya",
    "Zaragoza",
    "A Coruna",
    "Pontevedra",
    "Asturias",
    "Las Palmas",
    "Santa Cruz de Tenerife",
    "Cordoba",
    "Valladolid",
    "Granada",
    "Badajoz",
    "Huelva",
    "Jaen",
    "Almeria",
    "Castellon",
    "Tarragona",
    "Lleida",
    "Girona",
    "Toledo",
    "Ciudad Real",
    "Albacete",
    "Cuenca",
    "Guadalajara",
    "Caceres",
    "Salamanca",
    "Burgos",
    "Leon",
    "Zamora",
    "Palencia",
    "Avila",
    "Segovia",
    "Soria",
    "La Rioja",
    "Navarra",
    "Gipuzkoa",
    "Alava",
    "Cantabria",
    "Baleares",
    "Huesca",
    "Teruel",
    "Ceuta",
    "Melilla",
]


def _normalizar_provincia(nombre: str) -> str:
    import unicodedata

    s = str(nombre or "").strip().lower()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return s


def _extraer_mapa_partido_por_provincia(df_encuestas: pd.DataFrame | None, partido_ref: str) -> dict[str, float]:
    if df_encuestas is None or df_encuestas.empty:
        return {}
    if "provincia" not in df_encuestas.columns:
        return {}

    cols_partido = ["partido", "partido_siglas", "siglas"]
    col_partido = next((c for c in cols_partido if c in df_encuestas.columns), None)
    col_valor = "pct_est" if "pct_est" in df_encuestas.columns else ("estimacion_pct" if "estimacion_pct" in df_encuestas.columns else None)
    if col_partido is None or col_valor is None:
        return {}

    df = df_encuestas.copy()
    df[col_partido] = df[col_partido].astype(str).str.upper()
    df = df[df[col_partido] == str(partido_ref).upper()]
    if df.empty:
        return {}

    out: dict[str, float] = {}
    for _, row in df.iterrows():
        prov = _normalizar_provincia(row.get("provincia"))
        try:
            out[prov] = float(row.get(col_valor) or 0.0)
        except Exception:
            out[prov] = 0.0
    return out


def _insatisfaccion_desde_macro(df_macro: pd.DataFrame | None, provincia: str) -> float:
    if df_macro is None or df_macro.empty:
        return 0.40
    if "provincia" not in df_macro.columns:
        return 0.40

    cand_cols = [c for c in ["tasa_paro", "valor"] if c in df_macro.columns]
    if not cand_cols:
        return 0.40
    cval = cand_cols[0]

    prov_norm = _normalizar_provincia(provincia)
    df = df_macro.copy()
    df["_prov_norm"] = df["provincia"].astype(str).map(_normalizar_provincia)
    row = df[df["_prov_norm"] == prov_norm].head(1)
    if row.empty:
        return 0.40
    try:
        paro = float(row.iloc[0][cval] or 0.0)
    except Exception:
        return 0.40
    return _clip01(paro / 30.0)


def _distancia_ideologica_partido(partido_ref: str) -> float:
    p = str(partido_ref).upper()
    extremos = {"VOX": 0.85, "CUP": 0.80, "EH BILDU": 0.75}
    centros = {"PSOE": 0.35, "PP": 0.40, "SUMAR": 0.55, "PODEMOS": 0.60, "CS": 0.45}
    return extremos.get(p, centros.get(p, 0.50))


def calcular_voto_blando_provincial(
    partido_ref: str,
    tipo_eleccion: str = "generales",
    df_encuestas: pd.DataFrame | None = None,
    df_macro: pd.DataFrame | None = None,
    df_historico: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Calcula voto blando agregado por provincia.
    Retorna porcentajes en escala 0..100 para facilitar visualización.
    """
    _ = (tipo_eleccion, df_historico)  # reservado para calibración futura
    mapa_pct_partido = _extraer_mapa_partido_por_provincia(df_encuestas, partido_ref)

    rows: list[dict] = []
    for idx, prov in enumerate(_PROVINCIAS_ES):
        prov_norm = _normalizar_provincia(prov)
        pct_partido = float(mapa_pct_partido.get(prov_norm, 15.0))

        # Heurísticas calibradas para mantener score en rango útil.
        volatilidad = _clip01(0.20 + (idx % 7) * 0.06)
        distancia = _distancia_ideologica_partido(partido_ref)
        insatisf = _insatisfaccion_desde_macro(df_macro, prov)
        desempleo = insatisf
        fragmentacion = _clip01(0.35 + min(0.35, pct_partido / 100.0))

        inp = InputsBlandura(
            circunscripcion=prov,
            partido_ref=partido_ref,
            volatilidad_historica=volatilidad,
            distancia_ideologica=distancia,
            insatisfaccion_gobierno=insatisf,
            desempleo_local=desempleo,
            fragmentacion=fragmentacion,
            segmento_ideologia="centro",
            n_electores_est=0,
        )
        r = calcular_score_analitico(inp)
        rows.append(
            {
                "circunscripcion": prov,
                "provincia": prov,
                "segmento_edad": None,
                "segmento_estudios": None,
                "segmento_ideologia": None,
                "pct_voto_blando": round(r.pct_voto_blando * 100, 1),
                "pct_probable_abst": round(r.pct_probable_abst * 100, 1),
                "pct_transferible": round(r.pct_transferible * 100, 1),
                "score_medio_blando": r.score_medio_blando,
                "etiqueta": r.etiqueta,
                "n_electores_est": 0,
                "contribuciones_json": r.contribuciones,
            }
        )
    return pd.DataFrame(rows)


def calcular_voto_blando_segmentos(
    partido_ref: str,
    provincia: str = "nacional",
    df_cis: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Calcula voto blando por segmentos sintéticos (edad/estudios/ideología).
    """
    _ = df_cis
    segmentos = [
        ("edad", "18-24", 0.55, 0.45, 0.60, 0.35, 0.65, 3_200_000),
        ("edad", "25-34", 0.50, 0.40, 0.55, 0.30, 0.60, 4_800_000),
        ("edad", "35-49", 0.35, 0.38, 0.45, 0.20, 0.55, 7_500_000),
        ("edad", "50-64", 0.25, 0.42, 0.40, 0.18, 0.50, 7_200_000),
        ("edad", "65+", 0.15, 0.50, 0.35, 0.10, 0.45, 8_500_000),
        ("estudios", "sin_est", 0.40, 0.55, 0.65, 0.45, 0.45, 3_000_000),
        ("estudios", "primaria", 0.35, 0.50, 0.60, 0.40, 0.48, 6_500_000),
        ("estudios", "secundaria", 0.38, 0.42, 0.50, 0.28, 0.55, 9_000_000),
        ("estudios", "superior", 0.30, 0.35, 0.42, 0.15, 0.62, 8_800_000),
        ("ideologia", "izq", 0.28, 0.20, 0.35, 0.20, 0.60, 9_000_000),
        ("ideologia", "centro_izq", 0.45, 0.25, 0.45, 0.22, 0.58, 7_500_000),
        ("ideologia", "centro", 0.60, 0.35, 0.50, 0.25, 0.55, 5_000_000),
        ("ideologia", "centro_der", 0.42, 0.40, 0.42, 0.22, 0.50, 6_500_000),
        ("ideologia", "der", 0.22, 0.60, 0.35, 0.18, 0.48, 8_500_000),
    ]

    rows: list[dict] = []
    for tipo, valor, vol, dist, ins, des, frag, n_elec in segmentos:
        inp = InputsBlandura(
            circunscripcion=provincia,
            partido_ref=partido_ref,
            volatilidad_historica=vol,
            distancia_ideologica=dist,
            insatisfaccion_gobierno=ins,
            desempleo_local=des,
            fragmentacion=frag,
            segmento_edad=(valor if tipo == "edad" else None),
            segmento_estudios=(valor if tipo == "estudios" else None),
            segmento_ideologia=(valor if tipo == "ideologia" else None),
            n_electores_est=n_elec,
        )
        r = calcular_score_analitico(inp)
        rows.append(
            {
                "segmento": f"{tipo}: {valor}",
                "tipo": tipo,
                "valor": valor,
                "score_medio_blando": r.score_medio_blando,
                "pct_voto_blando": round(r.pct_voto_blando * 100, 1),
                "pct_probable_abst": round(r.pct_probable_abst * 100, 1),
                "pct_transferible": round(r.pct_transferible * 100, 1),
                "etiqueta": r.etiqueta,
                "n_electores_est": int(n_elec),
                "votos_blandos_absolutos": int(n_elec * r.pct_voto_blando),
            }
        )
    return pd.DataFrame(rows)


def calcular_score_voto_blando(
    partido_ref: str,
    tipo_eleccion: str = "generales",
    df_encuestas: pd.DataFrame | None = None,
    df_macro: pd.DataFrame | None = None,
) -> list[dict]:
    """
    Payload API listo para persistir/retornar.
    """
    df = calcular_voto_blando_provincial(
        partido_ref=partido_ref,
        tipo_eleccion=tipo_eleccion,
        df_encuestas=df_encuestas,
        df_macro=df_macro,
    )
    if df.empty:
        return []
    return df.to_dict(orient="records")
