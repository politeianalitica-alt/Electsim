"""NLP ligero para contenido mediatico."""

from __future__ import annotations

import json
from typing import Any

from dashboard.media_logic import extraer_partidos
from dashboard.nlp.ner import extraer_entidades
from dashboard.nlp.topic_model import clasificar_topicos

PERSONAS_CONOCIDAS: dict[str, str] = {
    "sanchez": "Pedro Sanchez",
    "feijoo": "Alberto Nunez Feijoo",
    "abascal": "Santiago Abascal",
    "yolanda diaz": "Yolanda Diaz",
    "puigdemont": "Carles Puigdemont",
    "ayuso": "Isabel Diaz Ayuso",
    "illa": "Salvador Illa",
}

_TEMA_KEYWORDS: dict[str, list[str]] = {
    "economia": ["inflacion", "paro", "pib", "deuda", "impuesto", "salario"],
    "vivienda": ["vivienda", "alquiler", "hipoteca", "inmobiliaria", "piso"],
    "seguridad": ["crimen", "delito", "terrorismo", "policia", "violencia"],
    "inmigracion": ["inmigracion", "migrante", "mena", "frontera", "patera"],
    "sanidad": ["sanidad", "hospital", "medico", "farmacia"],
    "educacion": ["educacion", "escuela", "universidad", "profesor"],
    "medioambiente": ["clima", "cambio climatico", "sequia", "renovable"],
    "corrupcion": ["corrupcion", "trama", "malversacion", "cohecho"],
}

_TONO_KEYWORDS: dict[str, list[str]] = {
    "ataque": ["critica", "acusa", "denuncia", "ataca", "escandalo"],
    "defensa": ["defiende", "responde", "niega", "rechaza", "desmiente"],
    "propuesta": ["propone", "anuncia", "presenta", "plantea", "aprueba"],
}


def detectar_personas(texto: str) -> list[str]:
    txt = texto.lower()
    out: list[str] = []
    for kw, name in PERSONAS_CONOCIDAS.items():
        if kw in txt and name not in out:
            out.append(name)
    return out


def detectar_categoria(texto: str) -> str:
    txt = texto.lower()
    best = "general"
    score = 0
    for tema, kws in _TEMA_KEYWORDS.items():
        s = sum(1 for kw in kws if kw in txt)
        if s > score:
            best = tema
            score = s
    return best


def detectar_tono(texto: str) -> str:
    txt = texto.lower()
    for tono, kws in _TONO_KEYWORDS.items():
        if any(kw in txt for kw in kws):
            return tono
    return "neutral"


def sentimiento_simple(texto: str) -> tuple[float, str]:
    txt = texto.lower()
    pos = ["acuerdo", "avance", "mejora", "positivo", "exito", "recuperacion"]
    neg = ["crisis", "fracaso", "escandalo", "corrupcion", "caida", "problema"]
    n_pos = sum(1 for k in pos if k in txt)
    n_neg = sum(1 for k in neg if k in txt)
    tot = n_pos + n_neg
    if tot == 0:
        return 0.0, "neutro"
    score = (n_pos - n_neg) / tot
    if score > 0.1:
        return round(score, 3), "positivo"
    if score < -0.1:
        return round(score, 3), "negativo"
    return round(score, 3), "neutro"


def enriquecer(registro: dict[str, Any]) -> dict[str, Any]:
    out = dict(registro)
    txt = " ".join(
        str(out.get(k, "") or "").strip()
        for k in ("titular", "title", "resumen", "description", "texto_completo", "texto", "summary")
    ).strip()
    if not txt:
        return out

    # Base lexical features
    partidos = [p for p in extraer_partidos(txt) if p != "SIN CLASIFICAR"]
    personas = detectar_personas(txt)
    out["partidos_mencionados"] = ",".join(partidos) if partidos else None
    out["personas_mencionadas"] = ",".join(personas) if personas else None
    out["categoria"] = detectar_categoria(txt) or out.get("categoria")
    out["tono"] = detectar_tono(txt)
    score, label = sentimiento_simple(txt)
    out["sentimiento_score"] = score if out.get("sentimiento_score") is None else out.get("sentimiento_score")
    out["sentimiento_label"] = label if out.get("sentimiento_label") is None else out.get("sentimiento_label")

    # Topics y categorías en JSON para el dashboard
    topics = clasificar_topicos(txt)
    out["topics"] = topics
    out["categorias_json"] = topics

    # Entidades enriquecidas (tags_contenido)
    tags = extraer_entidades(txt)
    if partidos:
        tags.extend({"tipo_objeto": "partido", "valor": p, "confianza": 0.95} for p in partidos)
    if personas:
        tags.extend({"tipo_objeto": "persona", "valor": p, "confianza": 0.9} for p in personas)
    # Dedup tags
    seen: set[tuple[str, str]] = set()
    dedup_tags: list[dict[str, Any]] = []
    for tag in tags:
        tipo = str(tag.get("tipo_objeto", "")).strip()
        valor = str(tag.get("valor", "")).strip()
        if not tipo or not valor:
            continue
        key = (tipo, valor.lower())
        if key in seen:
            continue
        seen.add(key)
        dedup_tags.append(
            {
                "tipo_objeto": tipo,
                "valor": valor,
                "confianza": float(tag.get("confianza", 1.0) or 1.0),
            }
        )
    out["tags"] = dedup_tags

    # Compatibilidad de campos para inserción
    if out.get("topics") is not None and not isinstance(out.get("topics"), str):
        try:
            # si algún consumidor espera string JSON
            out["topics_json"] = json.dumps(out["topics"], ensure_ascii=False)
        except Exception:
            pass

    out["procesado"] = True
    try:
        from agents.scraper_ai import enrich_article

        out = enrich_article(out)
    except Exception:
        pass
    return out
