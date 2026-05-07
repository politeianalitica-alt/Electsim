"""NER local para textos politicos en espanol.

Usa spaCy si esta disponible. Si no lo esta, mantiene una salida util con
reglas ligeras para que scrapers y pipelines no se rompan.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache
from typing import Any

TYPE_MAP = {
    "PER": "Persona",
    "PERSON": "Persona",
    "ORG": "Organizacion",
    "LOC": "Lugar",
    "GPE": "Lugar",
    "MISC": "Misc",
}

KNOWN_ORGS = (
    "Gobierno",
    "Congreso",
    "Senado",
    "Moncloa",
    "Banco de España",
    "INE",
    "CIS",
    "BOE",
    "Comisión Europea",
    "Parlamento Europeo",
)

# Capitalized proper nouns that are NOT person names — prevents regex false positives
EXCLUDED_NAMES: frozenset[str] = frozenset({
    # Parties & coalitions
    "Partido Popular", "Partido Socialista", "Partido Socialista Obrero Español",
    "Sumar", "Podemos", "Ciudadanos", "Vox", "Junts", "Esquerra Republicana",
    "Coalición Canaria", "Bildu", "Herri Batasuna", "PNV", "CiU", "Convergencia",
    "Unidas Podemos", "Alianza Popular", "UCD",
    # Institutions
    "Tribunal Constitucional", "Tribunal Supremo", "Audiencia Nacional",
    "Banco Central Europeo", "Banco España", "Consejo Estado",
    "Consejo General Poder Judicial", "Defensor Pueblo",
    "Agencia Tributaria", "Seguridad Social",
    # CCAA & cities
    "Comunidad Madrid", "País Vasco", "Cataluña", "Andalucía", "Valencia",
    "Galicia", "Aragón", "Castilla León", "Castilla Mancha", "Extremadura",
    "Murcia", "Navarra", "Asturias", "Cantabria", "Rioja", "Baleares",
    "Canarias", "Ceuta", "Melilla",
    "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Bilbao",
    "Málaga", "Palma", "Valladolid", "Alicante",
    # Generic capitalized words
    "España", "Europa", "Unión Europea", "Estados Unidos", "Naciones Unidas",
    "Consejo Ministros", "Gobierno España",
})


@lru_cache(maxsize=1)
def get_nlp() -> Any | None:
    try:
        import spacy  # type: ignore
    except Exception:
        return None

    for model in ("es_core_news_lg", "es_core_news_md", "es_core_news_sm"):
        try:
            return spacy.load(model)
        except OSError:
            continue

    if os.environ.get("ELECTSIM_SPACY_AUTO_DOWNLOAD", "0").strip() == "1":
        try:
            from spacy.cli import download  # type: ignore

            download("es_core_news_lg")
            nlp = spacy.load("es_core_news_lg")
            get_nlp.cache_clear()  # invalidate so next call picks up the model
            return nlp
        except Exception:
            return None
    return None


def extract_entities_spacy(text: str) -> list[dict[str, Any]]:
    text = str(text or "")
    nlp = get_nlp()
    if nlp is None:
        return extract_entities_regex(text)
    doc = nlp(text[:10000])
    entities: list[dict[str, Any]] = []
    for ent in doc.ents:
        name = ent.text.strip()
        if not name:
            continue
        entities.append(
            {
                "name": name,
                "type": TYPE_MAP.get(ent.label_, ent.label_),
                "start": int(ent.start_char),
                "end": int(ent.end_char),
                "confidence": 0.86,
                "method": "spacy",
            }
        )
    return _dedup_entities(entities)


def extract_entities_regex(text: str) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []
    for org in KNOWN_ORGS:
        for match in re.finditer(rf"(?<!\w){re.escape(org)}(?!\w)", text, flags=re.I):
            entities.append(
                {
                    "name": org,
                    "type": "Organizacion",
                    "start": match.start(),
                    "end": match.end(),
                    "confidence": 0.72,
                    "method": "regex",
                }
            )
    for match in re.finditer(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b", text):
        name = match.group(1).strip()
        if len(name) < 5:
            continue
        if name in EXCLUDED_NAMES:
            continue
        entities.append(
            {
                "name": name,
                "type": "Persona",
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.58,
                "method": "regex",
            }
        )
    return _dedup_entities(entities)


def _dedup_entities(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for entity in entities:
        key = (str(entity.get("type")), str(entity.get("name")).lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(entity)
    return out[:80]

