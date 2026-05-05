"""
Entity Extractor — Bloque 9.

Extracción de entidades y temas de chunks documentales por reglas.
Enriquece DocumentChunk con topics, entities y sectors.

Orden de preferencia:
  1. Servicios de Bloques 1/2/4/7 si existen
  2. Extracción por reglas (actores, partidos, sectores, territorios)
"""
from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from etl.sources.documents.schemas import DocumentChunk

logger = logging.getLogger(__name__)

# ── Diccionarios de referencia ─────────────────────────────────────────────────

_PARTIES = {
    "PP", "PSOE", "VOX", "SUMAR", "CS", "ERC", "JUNTS", "PNV", "BILDU",
    "Partido Popular", "Partido Socialista", "Vox", "Ciudadanos",
    "Podemos", "IU", "CiU", "Convergencia", "Cataluña en Comú",
}

_INSTITUTIONS = {
    "Congreso de los Diputados", "Senado", "Gobierno", "Tribunal Constitucional",
    "Tribunal Supremo", "Banco de España", "CNMC", "AEPD", "BOE", "BOCG",
    "Ministerio", "Consejo de Ministros", "Defensor del Pueblo",
    "AIReF", "INE", "Consejo General del Poder Judicial", "CGPJ",
    "Comisión Europea", "Parlamento Europeo", "BCE",
}

_SECTORS = {
    "energía": ["energía", "energia", "renovable", "solar", "eólico", "hidrógeno",
                "electricidad", "gas natural", "REE", "iberdrola", "endesa", "repsol"],
    "contratación pública": ["licitación", "contratación pública", "pliego", "adjudicación",
                              "concurso público", "obra pública", "LCSP"],
    "educación": ["educación", "universidad", "FP", "LOMLOE", "escuela", "formación profesional"],
    "sanidad": ["sanidad", "salud", "SNS", "medicamento", "farmacia", "AEMPS", "hospital"],
    "economía": ["PIB", "inflación", "desempleo", "paro", "deuda pública", "IPC", "ERTE",
                  "ERE", "SMI", "reforma laboral", "pensiones"],
    "fiscal": ["IRPF", "IVA", "impuesto", "tributario", "AEAT", "hacienda", "fiscal"],
    "vivienda": ["vivienda", "alquiler", "hipoteca", "precio del suelo", "VPO", "VPT"],
    "tecnología": ["IA", "inteligencia artificial", "digitalización", "startup", "dato",
                    "ciberseguridad", "RGPD"],
    "justicia": ["juicio", "sentencia", "código penal", "tribunal", "magistrado", "juez"],
    "seguridad": ["policía", "guardia civil", "CNI", "terrorismo", "orden público"],
    "exterior": ["NATO", "OTAN", "UE", "tratado", "embajada", "cooperación"],
    "medio ambiente": ["cambio climático", "emisiones", "CO2", "biodiversidad", "MITECO",
                        "agua", "residuos"],
}

_TOPICS = {
    "normativa": ["ley", "decreto", "reglamento", "orden ministerial", "resolución",
                   "BOE", "BOCG", "artículo", "disposición"],
    "económico": ["presupuesto", "gasto público", "inversión", "financiación", "fondo"],
    "electoral": ["elecciones", "voto", "candidato", "escaños", "circunscripción", "CIS"],
    "geopolítico": ["guerra", "conflicto", "sanciones", "migración", "acuerdo",
                     "Ucrania", "Oriente Medio"],
    "institucional": ["reforma", "competencias", "descentralización", "autonómica"],
    "social": ["desigualdad", "pobreza", "LGTBI", "género", "discriminación"],
}

_TERRITORIES_ES = {
    "Andalucía", "Aragón", "Asturias", "Islas Baleares", "Canarias",
    "Cantabria", "Castilla y León", "Castilla-La Mancha", "Cataluña",
    "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia", "Navarra",
    "País Vasco", "Valencia", "Euskadi", "Catalunya",
    "Ceuta", "Melilla",
}


def extract_entities_from_chunk(chunk: "DocumentChunk") -> "DocumentChunk":
    """
    Enriquece un DocumentChunk con entities, topics y sectors.
    Devuelve el chunk actualizado.
    """
    text = chunk.text or ""
    if not text.strip():
        return chunk

    entities = _extract_entities(text)
    topics = _extract_topics(text)
    sectors = _extract_sectors(text)

    return chunk.model_copy(update={
        "entities": entities,
        "topics": topics,
        "sectors": sectors,
    })


def extract_entities_from_chunks(chunks: list) -> list:
    """Enriquece una lista de DocumentChunk con entidades y temas."""
    return [extract_entities_from_chunk(c) for c in chunks]


def _extract_entities(text: str) -> list[str]:
    """Extrae entidades nombradas por reglas."""
    found = set()

    # Partidos
    for party in _PARTIES:
        if re.search(r"\b" + re.escape(party) + r"\b", text, re.IGNORECASE):
            found.add(party)

    # Instituciones
    for inst in _INSTITUTIONS:
        if inst.lower() in text.lower():
            found.add(inst)

    # Territorios
    for terr in _TERRITORIES_ES:
        if re.search(r"\b" + re.escape(terr) + r"\b", text, re.IGNORECASE):
            found.add(terr)

    # Personas (patrones: Nombre Apellido con mayúscula)
    persons = re.findall(
        r"\b([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+ (?:de |del |la |el )?[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)\b",
        text
    )
    for person in persons[:5]:  # Máximo 5 personas por chunk
        # Filtrar falsos positivos comunes
        if person not in {"La Ley", "El Gobierno", "La Comisión", "Los Artículos"}:
            found.add(person)

    return sorted(found)[:20]


def _extract_topics(text: str) -> list[str]:
    """Extrae temas del texto."""
    found = []
    text_lower = text.lower()
    for topic, keywords in _TOPICS.items():
        if any(kw.lower() in text_lower for kw in keywords):
            found.append(topic)
    return found


def _extract_sectors(text: str) -> list[str]:
    """Extrae sectores económicos y políticos del texto."""
    found = []
    text_lower = text.lower()
    for sector, keywords in _SECTORS.items():
        if any(kw.lower() in text_lower for kw in keywords):
            found.append(sector)
    return found
