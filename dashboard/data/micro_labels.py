"""
Capa de decodificación y etiquetado de microdatos CIS.

Funciones puras sin dependencias de Streamlit. Pueden usarse en ETL, tests y UI.

Inspirado en la separación label-decoder / data-model de pewmethods (Pew Research)
y en el patrón alias-registry de candidator para partidos políticos.
"""
from __future__ import annotations

import json

_NSNC_FIABILIDAD_UMBRAL: float = 85.0


# ── Alias de partidos ──────────────────────────────────────────────────────────

def party_alias(name: str) -> str:
    """Normaliza nombres/códigos CIS de partidos a etiquetas canónicas.

    El diccionario está documentado y testado para evitar la inversión
    histórica PSOE/PP (código 1=PSOE, 2=PP).
    """
    key = (name or "").strip().upper()
    alias = {
        "PARTIDOS LOCALES": "Otros",
        "ERC/EH BILDU": "EH Bildu",
        "UNIDAS PODEMOS": "SUMAR",
        "UP": "SUMAR",
        "PODEMOS": "SUMAR",
        "CS": "Ciudadanos",
        "CIUDADANOS": "Ciudadanos",
        "JXCAT": "Junts",
        "JUNTS PER CATALUNYA": "Junts",
        "NO_DECLARA": "NS/NC",
        "NSNC": "NS/NC",
        "NO CONTESTA": "NS/NC",
        "NO SABE": "NS/NC",
        "N.S.": "NS/NC",
        "N.C.": "NS/NC",
        "BLANCO_NULO": "Blanco/Nulo",
        "OTROS / NO ESPECIFICADO": "Otros",
        "OTROS/NO ESPECIFICADO": "Otros",
        "OTROS O NO ESPECIFICADO": "Otros",
        "VOTO EN BLANCO": "Blanco/Nulo",
        "NULO": "Blanco/Nulo",
        "ABSTENCION": "Abstención",
        "ABSTENCIÓN": "Abstención",
        # Códigos CIS frecuentes (ajustados para evitar inversión PSOE/PP)
        "1": "PSOE",
        "1.0": "PSOE",
        "2": "PP",
        "2.0": "PP",
        "3": "VOX",
        "3.0": "VOX",
        "4": "SUMAR",
        "4.0": "SUMAR",
        "5": "Ciudadanos",
        "5.0": "Ciudadanos",
        "6": "ERC",
        "6.0": "ERC",
        "7": "Junts",
        "7.0": "Junts",
        "8": "PNV",
        "8.0": "PNV",
        "9": "EH Bildu",
        "9.0": "EH Bildu",
        "10": "BNG",
        "10.0": "BNG",
        "8996": "Abstención",
        "8996.0": "Abstención",
        "9998": "NS/NC",
        "9998.0": "NS/NC",
        "9997": "NS/NC",
        "9997.0": "NS/NC",
        "9999": "NS/NC",
        "9999.0": "NS/NC",
    }
    if key in alias:
        return alias[key]
    if key in {"PP", "PSOE", "VOX", "SUMAR", "ERC", "PNV", "JUNTS", "CS", "CIUDADANOS", "BNG"}:
        return key
    if "ABST"in key:
        return "Abstención"
    if "NULO"in key or "BLANCO"in key:
        return "Blanco/Nulo"
    return (name or "Otros").strip() or "Otros"


def ideo_label_color(ideo: float) -> tuple[str, str]:
    """Retorna (etiqueta_ideológica, color_hex) para un valor ideológico 1-10."""
    v = float(ideo or 5.0)
    if v <= 2.8:
        return "Izquierda", "#DC2626"
    if v <= 4.8:
        return "Centro-izquierda", "#EC4899"
    if v <= 5.8:
        return "Centro", "#6B7280"
    if v <= 7.2:
        return "Centro-derecha", "#D97706"
    return "Derecha", "#0066CC"


def edad_rango_from_media(edad_media: float) -> str:
    e = float(edad_media or 45.0)
    if e < 26:
        return "18-30 años"
    if e < 36:
        return "25-40 años"
    if e < 46:
        return "35-50 años"
    if e < 56:
        return "45-60 años"
    return "55+ años"


# ── Distribución de voto ───────────────────────────────────────────────────────

def voto_fallback_por_ideologia(ideo: float) -> dict[str, float]:
    """Distribución de voto estimada por posición ideológica cuando NS/NC domina."""
    if ideo <= 3:
        return {"SUMAR": 35, "PSOE": 30, "Abstención": 20, "Otros": 15}
    if ideo <= 5:
        return {"PSOE": 34, "PP": 28, "SUMAR": 15, "Abstención": 12, "Otros": 11}
    if ideo <= 7:
        return {"PP": 40, "PSOE": 24, "VOX": 18, "Abstención": 8, "Otros": 10}
    return {"PP": 47, "VOX": 26, "PSOE": 10, "Abstención": 7, "Otros": 10}


def safe_vote_dist(raw: object, ideologia: float) -> dict[str, float]:
    """Distribución de voto limpia. Ver `safe_vote_dist_ex` para flags de fiabilidad."""
    return safe_vote_dist_ex(raw, ideologia)[0]


def safe_vote_dist_ex(
    raw: object,
    ideologia: float,
) -> tuple[dict[str, float], bool, str]:
    """Distribución de voto con flag de fiabilidad baja.

    Returns:
        (distribucion, fiabilidad_baja, razon)
        fiabilidad_baja=True cuando NS/NC > _NSNC_FIABILIDAD_UMBRAL (85%)
        o cuando no hay datos declarados suficientes.
    """
    dist: dict[str, float] = {}
    parsed: dict[str, float] = {}

    if isinstance(raw, dict):
        parsed = {str(k): float(v) for k, v in raw.items() if v is not None}
    elif isinstance(raw, str) and raw.strip():
        try:
            tmp = json.loads(raw)
            if isinstance(tmp, dict):
                parsed = {str(k): float(v) for k, v in tmp.items() if v is not None}
        except Exception:
            parsed = {}

    for k, v in parsed.items():
        kk = party_alias(k)
        dist[kk] = dist.get(kk, 0.0) + max(0.0, float(v))

    total = sum(dist.values())
    if total <= 0:
        return voto_fallback_por_ideologia(ideologia), True, "Sin datos declarados de voto."

    normalized = {
        k: round(v * 100.0 / total, 2)
        for k, v in sorted(dist.items(), key=lambda x: x[1], reverse=True)
    }
    nsnc_share = float(normalized.get("NS/NC", 0.0))

    informative = {k: v for k, v in normalized.items() if k not in {"NS/NC", "Blanco/Nulo"}}
    informative_total = sum(informative.values())
    if informative_total >= 25.0 and len(informative) >= 2:
        clean = {
            k: round(v * 100.0 / informative_total, 2)
            for k, v in sorted(informative.items(), key=lambda x: x[1], reverse=True)
        }
        return clean, False, ""

    if len(normalized) == 1 and nsnc_share >= 99.0:
        razon = f"El {nsnc_share:.0f}% del clúster no declara intención de voto."
        return voto_fallback_por_ideologia(ideologia), True, razon

    if nsnc_share >= _NSNC_FIABILIDAD_UMBRAL:
        razon = (
            f"El {nsnc_share:.0f}% del clúster responde NS/NC "
            f"(umbral: {_NSNC_FIABILIDAD_UMBRAL:.0f}%). "
            "Distribución estimada por posición ideológica."
        )
        return voto_fallback_por_ideologia(ideologia), True, razon

    return normalized, False, ""
