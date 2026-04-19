"""
Servicio BOE — lógica de dominio para el módulo BOE / Normativa.
Separa clasificación, scoring y normalización de la capa de presentación.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ── Taxonomía de relevancia ───────────────────────────────────────────────────

_RELEVANCIA_ALTA: list[str] = [
    "ley orgánica", "ley organica", "ley de presupuestos", "real decreto-ley", "real decreto ley",
    "real decreto legislativo", "reforma constitucional", "decreto-ley",
]
_RELEVANCIA_MEDIA_KWORDS: list[str] = [
    "real decreto", "orden ministerial", "resolución", "convocatoria", "licitación", "subvención",
    "plan estatal", "programa", "reglamento", "estatuto",
]
_TIPO_ALTA_KWORDS: list[str] = [
    "presupuesto", "amnistía", "amnistia", "vivienda", "sanidad", "pensión", "pension",
    "empleo", "defensa", "seguridad nacional", "reforma fiscal", "iva",
]

_SECCIONES = {
    "I":   "I — Disposiciones generales",
    "II":  "II — Autoridades y personal",
    "III": "III — Otras disposiciones",
    "IV":  "IV — Administración de Justicia",
    "V":   "V — Anuncios",
}

_TIPO_MAP: dict[str, str] = {
    "real decreto-ley":        "Real Decreto-ley",
    "real decreto ley":        "Real Decreto-ley",
    "real decreto legislativo":"Real Decreto Legislativo",
    "real decreto":            "Real Decreto",
    "ley orgánica":            "Ley Orgánica",
    "ley organica":            "Ley Orgánica",
    "ley":                     "Ley",
    "orden ministerial":       "Orden Ministerial",
    "orden":                   "Orden",
    "resolución":              "Resolución",
    "resolucion":              "Resolución",
    "anuncio":                 "Anuncio",
    "licitación":              "Licitación",
    "licitacion":              "Licitación",
    "acuerdo":                 "Acuerdo",
    "corrección":              "Corrección de errores",
}

_DEPARTAMENTOS = [
    "Presidencia del Gobierno", "Ministerio de Hacienda", "Ministerio de Defensa",
    "Ministerio de Justicia", "Ministerio del Interior", "Ministerio de Asuntos Exteriores",
    "Ministerio de Trabajo", "Ministerio de Sanidad", "Ministerio de Educación",
    "Ministerio de Vivienda", "Ministerio de Transporte", "Ministerio de Agricultura",
    "Ministerio de Industria", "Ministerio para la Transformación Digital",
    "Ministerio de Derechos Sociales", "Ministerio de Igualdad", "Ministerio de Cultura",
    "Ministerio de Ciencia", "Ministerio de Economía", "Casa Real", "Tribunal Constitucional",
    "Consejo General del Poder Judicial", "Tribunal Supremo", "Congreso de los Diputados",
    "Senado", "Banco de España",
]


# ── Dataclass de salida ───────────────────────────────────────────────────────

@dataclass
class BoeItem:
    titulo: str
    resumen: str
    seccion: str
    tipo: str
    organismo: str
    numero: str
    relevancia_politica: str
    url: str = ""
    fecha: str = ""
    source: str = "real"  # "real" | "synthetic"


# ── Funciones de clasificación ────────────────────────────────────────────────

def score_relevance(titulo: str, tipo: str = "") -> str:
    """Devuelve 'Alta', 'Media' o 'Baja' según el contenido del título."""
    t = titulo.lower()
    tp = tipo.lower()

    # Alta si es una ley/decreto-ley importante
    if any(k in tp for k in ["ley orgánica", "ley organica", "real decreto-ley", "real decreto ley"]):
        return "Alta"
    if any(k in t for k in _RELEVANCIA_ALTA + _TIPO_ALTA_KWORDS):
        return "Alta"

    # Media si es un real decreto, orden o convocatoria con fondos relevantes
    if any(k in t for k in _RELEVANCIA_MEDIA_KWORDS) or any(k in tp for k in _RELEVANCIA_MEDIA_KWORDS):
        return "Media"

    return "Baja"


def infer_tipo(titulo: str) -> str:
    """Infiere el tipo normativo a partir del título."""
    t = titulo.lower()
    for key, label in _TIPO_MAP.items():
        if key in t:
            return label
    return "Disposición"


def infer_organismo(titulo: str, summary: str = "") -> str:
    """Intenta identificar el organismo emisor desde el título o resumen."""
    text = f"{titulo} {summary}".lower()
    for dep in _DEPARTAMENTOS:
        if dep.lower() in text:
            return dep
    # Búsqueda por nombre corto de ministerio
    m = re.search(r"ministerio\s+de\s+([\wáéíóúñÁÉÍÓÚÑ\s]+?)(?:\s+para\s+|\s+del\s+|\.|,|$)", text)
    if m:
        return f"Ministerio de {m.group(1).strip().title()}"
    return "BOE"


def infer_seccion(titulo: str) -> str:
    """Infiere la sección del BOE desde el tipo/título."""
    t = titulo.lower()
    if any(k in t for k in ["ley", "decreto", "orden ministerial", "reglamento"]):
        return _SECCIONES["I"]
    if any(k in t for k in ["nombramiento", "cese", "personal", "funcionario"]):
        return _SECCIONES["II"]
    if any(k in t for k in ["resolución", "resolucion", "convocatoria", "subvención"]):
        return _SECCIONES["III"]
    if any(k in t for k in ["sentencia", "tribunal", "juzgado"]):
        return _SECCIONES["IV"]
    if any(k in t for k in ["licitación", "licitacion", "anuncio", "contrato"]):
        return _SECCIONES["V"]
    return _SECCIONES["I"]


def normalize_boe_item(raw: dict, source: str = "real") -> BoeItem:
    """Convierte un dict raw (desde RSS o BD) a BoeItem normalizado."""
    titulo = str(raw.get("titulo") or raw.get("title") or "").strip()[:500]
    resumen = str(raw.get("resumen") or raw.get("summary") or "Publicación oficial en el BOE.").strip()[:600]
    tipo = raw.get("tipo") or infer_tipo(titulo)
    organismo = raw.get("organismo") or infer_organismo(titulo, resumen)
    seccion = raw.get("seccion") or infer_seccion(titulo)
    relevancia = raw.get("relevancia_politica") or score_relevance(titulo, tipo)
    numero = str(raw.get("numero") or raw.get("id_boe") or "BOE")

    return BoeItem(
        titulo=titulo,
        resumen=resumen,
        seccion=seccion,
        tipo=tipo,
        organismo=organismo,
        numero=numero,
        relevancia_politica=relevancia,
        url=str(raw.get("url") or raw.get("url_html") or ""),
        fecha=str(raw.get("fecha") or "")[:10],
        source=source,
    )


def items_to_dicts(items: list[BoeItem]) -> list[dict]:
    """Convierte lista de BoeItem a lista de dicts para la UI."""
    return [
        {
            "titulo": it.titulo,
            "resumen": it.resumen,
            "seccion": it.seccion,
            "tipo": it.tipo,
            "organismo": it.organismo,
            "numero": it.numero,
            "relevancia_politica": it.relevancia_politica,
            "url": it.url,
            "fecha": it.fecha,
            "source": it.source,
        }
        for it in items
    ]
