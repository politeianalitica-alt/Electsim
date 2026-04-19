"""
Lógica de dominio para el módulo Prensa & Agenda.
Separa análisis y heurísticas de la capa de presentación Streamlit.
"""
from __future__ import annotations

import re
from collections import Counter

import pandas as pd

# ── Constantes de dominio ─────────────────────────────────────────────────────

PARTIDOS_KEYWORDS: dict[str, list[str]] = {
    "PSOE":    ["psoe", "sanchez", "pedro sanchez", "socialista"],
    "PP":      ["pp", "feijoo", "feijóo", "partido popular"],
    "VOX":     ["vox", "abascal"],
    "SUMAR":   ["sumar", "yolanda diaz", "yolanda díaz"],
    "PODEMOS": ["podemos", "irene montero", "pablo iglesias"],
    "JUNTS":   ["junts", "puigdemont"],
    "ERC":     ["erc", "esquerra"],
}

NEWTRAL_FACTCHECK_FEEDS: list[str] = [
    "https://www.newtral.es/tag/fact-check/feed/",
    "https://www.newtral.es/tag/verificacion/feed/",
]

VEREDICTO_KEYWORDS: dict[str, list[str]] = {
    "FALSO":    ["falso", "bulo", "fake", "desinform"],
    "ENGAÑOSO": ["engañoso", "enganoso", "fuera de contexto", "manipulad"],
}

_STOP_NARRATIVAS = {
    "para", "desde", "sobre", "entre", "tras", "ante", "esta", "este", "estos", "estas",
    "como", "pero", "porque", "donde", "cuando", "tambien", "segun", "sobre", "gobierno",
    "partido", "partidos", "espana", "españa", "dice", "hace", "hoy", "ayer", "toda", "todas",
    "todos", "cada", "solo", "sido", "será", "seran", "puede", "pueden", "tiene", "tienen",
}


# ── Funciones de análisis ─────────────────────────────────────────────────────

def extraer_partidos(texto: str) -> list[str]:
    """Detecta partidos mencionados en un texto usando keywords."""
    txt = texto.lower()
    partidos = [siglas for siglas, kws in PARTIDOS_KEYWORDS.items() if any(kw in txt for kw in kws)]
    return partidos or ["SIN CLASIFICAR"]


def inferir_veredicto(texto: str) -> str:
    """Infiere el tipo de veredicto a partir del texto de un titular/resumen."""
    t = texto.lower()
    for veredicto, kws in VEREDICTO_KEYWORDS.items():
        if any(k in t for k in kws):
            return veredicto
    return "SIN VERIFICAR"


def theme_party_impact(df_noticias: pd.DataFrame, tema: str) -> pd.DataFrame:
    """
    Para un tema dado, devuelve sentimiento medio y volumen por partido.
    Filtra por columna 'categoria' == tema.
    """
    if df_noticias.empty:
        return pd.DataFrame(columns=["partido", "n", "sent_medio"])

    dfx = df_noticias.copy()
    dfx["categoria"] = dfx.get("categoria", "").fillna("").astype(str)
    dfx = dfx[dfx["categoria"].str.lower() == str(tema).lower()]
    if dfx.empty:
        return pd.DataFrame(columns=["partido", "n", "sent_medio"])

    rows: list[dict] = []
    for _, r in dfx.iterrows():
        partidos_raw = str(r.get("partidos_mencionados") or "")
        parties = [p.strip() for p in partidos_raw.split(",") if p.strip()]
        if not parties:
            continue
        sent = float(pd.to_numeric(r.get("sentimiento_score"), errors="coerce") or 0.0)
        for p in parties:
            rows.append({"partido": p, "sent": sent})

    if not rows:
        return pd.DataFrame(columns=["partido", "n", "sent_medio"])

    return (
        pd.DataFrame(rows)
        .groupby("partido", as_index=False)
        .agg(n=("sent", "count"), sent_medio=("sent", "mean"))
        .sort_values(["n", "sent_medio"], ascending=[False, False])
        .head(10)
    )


def theme_narratives(df_noticias: pd.DataFrame, tema: str, topn: int = 6) -> list[str]:
    """
    Extrae las palabras clave más frecuentes de titulares/resúmenes para un tema.
    Usa tokenización simple + stopwords mínimas.
    """
    if df_noticias.empty:
        return []

    dfx = df_noticias.copy()
    dfx["categoria"] = dfx.get("categoria", "").fillna("").astype(str)
    dfx = dfx[dfx["categoria"].str.lower() == str(tema).lower()]
    if dfx.empty:
        return []

    text_blob = " ".join(
        f"{str(r.get('titular') or '')} {str(r.get('resumen') or '')}"
        for _, r in dfx.head(300).iterrows()
    ).lower()

    tokens = re.findall(r"[a-záéíóúñ]{4,}", text_blob)
    freq = Counter(t for t in tokens if t not in _STOP_NARRATIVAS)
    return [w for w, _ in freq.most_common(topn)]


def bulos_desde_noticias(df_noticias: pd.DataFrame, limit: int = 20) -> list[dict]:
    """
    Detección preliminar de bulos a partir de noticias ingestadas.
    Busca keywords de desinformación en titulares. Requiere validación manual.
    """
    if df_noticias.empty:
        return []

    out: list[dict] = []
    for _, row in df_noticias.head(300).iterrows():
        titular = str(row.get("titular", "")).strip()
        if not titular:
            continue
        if not any(k in titular.lower() for k in ["bulo", "falso", "desinform", "engaños", "manipul"]):
            continue
        partidos = [p.strip() for p in str(row.get("partidos_mencionados", "")).split(",") if p.strip()]
        out.append({
            "fecha": str(row.get("fecha_publicacion", ""))[:16] or "reciente",
            "titular_bulo": titular[:300],
            "veredicto": "SIN VERIFICAR",
            "partidos_implicados": partidos or ["SIN CLASIFICAR"],
            "fuente_origen": str(row.get("fuente", "prensa")).strip(),
            "explicacion": "Detección preliminar desde prensa monitorizada. Requiere validación de fact-check.",
            "impacto": "Pendiente",
            "fuente_verificacion": "Pendiente",
            "url": str(row.get("url", "")).strip(),
        })
        if len(out) >= limit:
            break

    dedup = {it["titular_bulo"]: it for it in out}
    return list(dedup.values())[:limit]
