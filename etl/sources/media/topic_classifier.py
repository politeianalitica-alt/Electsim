"""
Clasificador temático de artículos de medios (reglas basadas en keywords).

15 temas predefinidos, compatible con el campo `topics` de MediaItem.
Retorna como máximo 4 temas por artículo.
"""
from __future__ import annotations

import re

# ── Taxonomía de temas ────────────────────────────────────────────────────────

_TOPICS: dict[str, list[str]] = {
    "economía": [
        "pib", "inflación", "ipc", "paro", "desempleo", "empleo", "trabajo",
        "salario", "sueldo", "pensión", "pensiones", "presupuesto", "deuda",
        "déficit", "superávit", "bolsa", "mercado", "bce", "euro", "tipo",
        "interés", "banco", "financiero", "finanza", "fiscal", "impuesto",
        "irpf", "iva", "hacienda", "erte", "liquidez", "capital", "inversión",
        "startup", "emprendedor", "pyme", "empresa", "beneficio", "facturación",
    ],
    "política": [
        "gobierno", "congreso", "senado", "partido", "diputado", "senador",
        "elección", "elecciones", "voto", "votación", "moción", "censura",
        "coalición", "coalición", "legislatura", "reforma", "ley", "decreto",
        "oposición", "mayoría", "minoría", "investidura", "presidente",
        "ministre", "ministro", "ministra", "secretario", "subsecretario",
        "constitución", "constitucional", "tribunal", "justicia", "democracia",
    ],
    "cataluña": [
        "cataluña", "català", "catalán", "generalitat", "puigdemont",
        "independencia", "independentismo", "1-o", "procés", "proceso",
        "junts", "erc", "cdc", "pdcat", "cup", "barcelona", "parlament",
        "amnistía", "amnistia", "autodeterminación",
    ],
    "internacionales": [
        "europa", "unión europea", "ue", "bruselas", "otan", "nato",
        "eeuu", "estados unidos", "china", "rusia", "ucrania", "israel",
        "palestina", "oriente", "medio", "guerra", "conflicto", "crisis",
        "diplomático", "embajada", "cumbre", "g7", "g20", "onu", "fmi",
    ],
    "sanidad": [
        "sanidad", "salud", "hospital", "médico", "enfermero", "enfermera",
        "vacuna", "pandemia", "covid", "virus", "enfermedad", "paciente",
        "snc", "sistema nacional de salud", "farmacia", "fármaco",
        "investigación clínica", "oncología", "cáncer", "alzheimer",
    ],
    "educación": [
        "educación", "escuela", "colegio", "instituto", "universidad",
        "alumno", "estudiante", "profesor", "docente", "aula", "título",
        "bachiller", "selectividad", "lomloe", "lomce", "beca", "erasmus",
        "formación profesional", "fp", "oposición", "oposiciones",
    ],
    "vivienda": [
        "vivienda", "alquiler", "hipoteca", "inmobiliario", "piso", "casa",
        "compraventa", "precio vivienda", "desahucio", "okupación", "suelo",
        "promotor", "constructor", "obra nueva", "alquiler turístico", "airbnb",
        "ley de vivienda", "vpo", "vivienda protegida",
    ],
    "energía": [
        "energía", "electricidad", "luz", "gas", "petróleo", "gasoil",
        "renovable", "solar", "eólica", "nuclear", "co2", "emisiones",
        "cambio climático", "transición energética", "hidroeléctrica",
        "endesa", "iberdrola", "repsol", "tarifa", "factura energética",
    ],
    "tecnología": [
        "tecnología", "inteligencia artificial", "ia", "digitalización",
        "startup", "innovación", "ciberseguridad", "hackeo", "datos",
        "privacidad", "google", "apple", "microsoft", "amazon", "facebook",
        "meta", "twitter", "x", "red social", "algoritmo", "robot",
        "blockchain", "criptomoneda", "bitcoin", "ethereum",
    ],
    "justicia": [
        "tribunal", "juicio", "sentencia", "condena", "absolución", "fiscal",
        "juez", "magistrado", "letrado", "abogado", "acusado", "detenido",
        "juzgado", "supremo", "constitucional", "audiencia nacional",
        "tsj", "cgpj", "poder judicial", "pena", "prisión", "cárcel",
    ],
    "terrorismo": [
        "terrorismo", "terrorista", "yihadismo", "eta", "atentado",
        "célula", "radicalización", "isis", "daesh", "al qaeda",
        "ataque terrorista", "bomba", "explosivo", "cnp", "guardia civil",
    ],
    "defensa": [
        "defensa", "ejército", "militar", "armada", "fuerzas armadas",
        "otan", "misión", "despliegue", "soldado", "oficial", "ministro defensa",
        "armamento", "arma", "presupuesto defensa", "industria defensa",
        "seguridad nacional", "inteligencia", "cni", "espionaje",
    ],
    "medioambiente": [
        "medioambiente", "clima", "contaminación", "reciclaje", "plástico",
        "sostenible", "sostenibilidad", "biodiversidad", "especie protegida",
        "deforestación", "incendio forestal", "sequía", "inundación",
        "cop", "acuerdo París", "greenpeace", "ecologista",
    ],
    "cultura": [
        "cine", "película", "teatro", "ópera", "música", "concierto",
        "arte", "exposición", "museo", "libro", "literatura", "premio",
        "goya", "gala", "festival", "patrimonio", "cultura", "cultural",
        "entretenimiento", "espectáculo", "serie", "televisión",
    ],
    "deportes": [
        "fútbol", "baloncesto", "tenis", "ciclismo", "atletas", "deporte",
        "liga", "copa del rey", "champions", "real madrid", "barcelona",
        "atlético", "selección", "mundial", "eurocopa", "olimpiadas",
        "jjoo", "motorismo", "formula 1", "motogp", "golf",
    ],
}

_MAX_TOPICS = 4


def classify_topics(
    text: str,
    max_topics: int = _MAX_TOPICS,
) -> list[str]:
    """
    Clasifica un texto en hasta `max_topics` temas.

    Args:
        text: texto a clasificar (título + resumen recomendado).
        max_topics: número máximo de temas.

    Returns:
        list[str] — temas detectados, ordenados por relevancia (más menciones primero).
    """
    if not text:
        return []

    text_lower = text.lower()
    scores: dict[str, int] = {}

    for tema, keywords in _TOPICS.items():
        count = 0
        for kw in keywords:
            # Búsqueda por palabra completa cuando la keyword es una sola palabra
            if " " in kw:
                if kw in text_lower:
                    count += 2  # frases multi-palabra puntúan más
            else:
                if re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
                    count += 1
        if count > 0:
            scores[tema] = count

    # Ordenar por puntuación descendente y limitar
    sorted_topics = sorted(scores, key=lambda t: scores[t], reverse=True)
    return sorted_topics[:max_topics]
