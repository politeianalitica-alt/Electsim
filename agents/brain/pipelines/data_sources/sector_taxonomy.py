"""
Taxonomía sectorial unificada · 9 sectores económicos clave en España.

Mapeo central que cruza:
  - CNAE-2009 codes (clasificación nacional)
  - CPV codes (clasificación contratación pública UE)
  - Palabras clave para NLP (BOE, RSS, PLACSP filtering)
  - Risk dominio (mapping a /riesgo subindex)
  - Ministerio responsable
  - Datos visuales (color, icono)

Esta taxonomía es la fuente de verdad para el `sectorial_intel_builder`
que construye el SectorReport unificado consumido por:
  GET /api/v1/sectores/{id}          → SectorReport completo
  GET /api/v1/sectores/{id}/signals  → señales transversales
  GET /api/v1/sectores/index         → vista de todos los sectores

No tiene dependencias externas — solo dicts puros. Importable desde
cualquier capa (servicios, builders, routers, tests).
"""
from __future__ import annotations

from typing import Any


# ─────────────────────────────────────────────────────────────────
# REGISTRO PRINCIPAL DE SECTORES
# ─────────────────────────────────────────────────────────────────

SECTOR_TAXONOMY: dict[str, dict[str, Any]] = {
    "agro": {
        "id": "agro",
        "name": "Agroalimentario y pesca",
        "name_short": "Agro",
        "icon": "Wheat",
        "color_primary": "#16A34A",
        "color_secondary": "#0d4626",
        "cnae": ["A01", "A02", "A03", "C10", "C11", "C12"],
        "cpv": ["03000000", "15000000"],
        "keywords": [
            "agricultura", "ganadería", "ganaderia", "pesca",
            "aceite de oliva", "aceite oliva", "vino", "pac",
            "feaga", "alimentación", "alimentacion", "agroalimentario",
            "rural", "campo", "olivar", "viñedo", "vinedo",
        ],
        "ministry": "Agricultura, Pesca y Alimentación",
        "risk_dominio": "regulatorio",
        "page_route": "/sector-agro",
        "areas_tematicas": ["agroalimentario", "pac", "rural", "exportacion"],
        "regulators": ["MAPA", "AICA", "AESAN", "FEGA", "ENESA", "DG AGRI"],
    },
    "banca": {
        "id": "banca",
        "name": "Banca y servicios financieros",
        "name_short": "Banca",
        "icon": "Landmark",
        "color_primary": "#1F4E8C",
        "color_secondary": "#0d2e58",
        "cnae": ["K64", "K65", "K66"],
        "cpv": ["66000000"],
        "keywords": [
            "banco", "banca", "fintech", "cnmv", "bde",
            "banco de españa", "banco de espana", "fondos de inversión",
            "fondos de inversion", "hipoteca", "crédito", "credito",
            "seguros", "aseguradora", "bce", "euribor",
            "estabilidad financiera", "morosidad", "solvencia",
        ],
        "ministry": "Economía, Comercio y Empresa",
        "risk_dominio": "regulatorio",
        "page_route": "/sector-banca",
        "areas_tematicas": ["financiero", "banca", "regulacion", "fiscal"],
        "regulators": ["Banco de España", "CNMV", "DGSFP", "BCE", "EBA", "EIOPA"],
    },
    "defensa": {
        "id": "defensa",
        "name": "Defensa y seguridad",
        "name_short": "Defensa",
        "icon": "Shield",
        "color_primary": "#1e3a5f",
        "color_secondary": "#2d5986",
        "cnae": ["C30.4", "O84"],
        "cpv": ["35000000"],
        "keywords": [
            "defensa", "otan", "indra", "navantia", "airbus defence",
            "f-35", "f35", "eurofighter", "armada", "ejército",
            "ejercito", "fuerzas armadas", "ciberdefensa",
            "seguridad nacional", "operaciones internacionales",
            "ministerio de defensa", "mde", "isdefe",
        ],
        "ministry": "Defensa",
        "risk_dominio": "geopolitico",
        "page_route": "/sector-defensa",
        "areas_tematicas": ["defensa", "seguridad", "otan", "contratacion_publica"],
        "regulators": ["MDE", "ISDEFE", "DGAM", "INTA", "OTAN", "EDA"],
    },
    "energia": {
        "id": "energia",
        "name": "Energía y transición ecológica",
        "name_short": "Energía",
        "icon": "Zap",
        "color_primary": "#1a4a2e",
        "color_secondary": "#2d7a4a",
        "cnae": ["B05", "B06", "B07", "B08", "B09", "D35"],
        "cpv": ["09000000", "71300000"],
        "keywords": [
            "renovable", "renovables", "hidrógeno", "hidrogeno",
            "iberdrola", "endesa", "repsol", "naturgy", "cnmc",
            "red eléctrica", "red electrica", "ree", "transición ecológica",
            "transicion ecologica", "miteco", "energético", "energetico",
            "electricidad", "gas natural", "fotovoltaica", "eólica", "eolica",
            "perte", "fondos europeos", "co2", "emisiones",
        ],
        "ministry": "Transición Ecológica y Reto Demográfico",
        "risk_dominio": "regulatorio",
        "page_route": "/sector-energia",
        "areas_tematicas": ["energia", "medioambiente", "renovables", "industrial"],
        "regulators": ["MITECO", "CNMC", "IDAE", "REE", "OMIE", "Enagas"],
    },
    "farma": {
        "id": "farma",
        "name": "Farmacéutico y salud",
        "name_short": "Farma",
        "icon": "Pill",
        "color_primary": "#9333EA",
        "color_secondary": "#5e1f99",
        "cnae": ["C21", "Q86"],
        "cpv": ["33000000"],
        "keywords": [
            "farmacéutico", "farmaceutico", "aemps", "ensayo clínico",
            "ensayo clinico", "almirall", "grifols", "rovi",
            "medicamento", "medicamentos", "sanidad", "sns",
            "ministerio de sanidad", "precio referencia", "patente",
            "biotecnología", "biotecnologia", "ema", "vacuna",
            "desabastecimiento", "farmacia", "atc",
        ],
        "ministry": "Sanidad",
        "risk_dominio": "regulatorio",
        "page_route": "/sector-farma",
        "areas_tematicas": ["salud", "farmaceutico", "sanidad", "regulacion"],
        "regulators": ["AEMPS", "Ministerio Sanidad", "EMA", "FARMAINDUSTRIA"],
    },
    "infraestructuras": {
        "id": "infraestructuras",
        "name": "Infraestructuras y transporte",
        "name_short": "Infraestructuras",
        "icon": "Construction",
        "color_primary": "#F97316",
        "color_secondary": "#7c2d12",
        "cnae": ["F41", "F42", "F43", "H49", "H52"],
        "cpv": ["45000000", "60000000", "63100000"],
        "keywords": [
            "acs", "ferrovial", "acciona", "adif", "ave",
            "aena", "concesiones", "obra pública", "obra publica",
            "infraestructura", "infraestructuras", "carretera",
            "autopista", "alta velocidad", "puerto", "aeropuerto",
            "mitma", "ministerio de transportes", "ferrocarril",
            "movilidad", "transporte", "renfe",
        ],
        "ministry": "Transportes y Movilidad Sostenible",
        "risk_dominio": "contractual",
        "page_route": "/sector-infraestructuras",
        "areas_tematicas": ["infraestructuras", "transporte", "movilidad", "obra_publica"],
        "regulators": ["MITMA", "ADIF", "Aena", "Puertos del Estado", "Renfe"],
    },
    "telecom": {
        "id": "telecom",
        "name": "Telecomunicaciones y tecnología",
        "name_short": "Telecom",
        "icon": "Radio",
        "color_primary": "#5B21B6",
        "color_secondary": "#2e1065",
        "cnae": ["J58", "J61", "J62", "J63"],
        "cpv": ["32000000", "64200000", "72000000"],
        "keywords": [
            "telefónica", "telefonica", "vodafone", "orange",
            "másmóvil", "masmovil", "masorange", "5g", "fibra",
            "ai act", "inteligencia artificial", "ciberseguridad",
            "nis2", "datos", "gdpr", "rgpd", "aepd",
            "espectro radioeléctrico", "espectro", "internet",
            "banda ancha", "telecomunicaciones",
        ],
        "ministry": "Transformación Digital y Función Pública",
        "risk_dominio": "regulatorio",
        "page_route": "/sector-telecom",
        "areas_tematicas": ["telecom", "digital", "ciberseguridad", "ia"],
        "regulators": ["CNMC", "AEPD", "SETELECO", "Red.es", "BEREC"],
    },
    "turismo": {
        "id": "turismo",
        "name": "Turismo y hostelería",
        "name_short": "Turismo",
        "icon": "Plane",
        "color_primary": "#0EA5E9",
        "color_secondary": "#075985",
        "cnae": ["I55", "I56", "N79"],
        "cpv": ["55000000", "63500000"],
        "keywords": [
            "turismo", "meliá", "melia", "nh hotel", "iberostar",
            "airbnb", "alojamiento", "hostelería", "hosteleria",
            "viajeros", "pernoctaciones", "turistas", "frontur",
            "turespaña", "turespana", "setur", "ministerio de turismo",
            "agencia de viajes", "vivienda turística", "vivienda turistica",
            "iberia", "ryanair", "vueling",
        ],
        "ministry": "Industria y Turismo",
        "risk_dominio": "narrativo",
        "page_route": "/sector-turismo",
        "areas_tematicas": ["turismo", "hosteleria", "alojamiento", "viajes"],
        "regulators": ["SETUR", "Turespaña", "MINTUR", "INE"],
    },
    "vivienda": {
        "id": "vivienda",
        "name": "Vivienda e inmobiliario",
        "name_short": "Vivienda",
        "icon": "Home",
        "color_primary": "#B45309",
        "color_secondary": "#7c2d12",
        "cnae": ["F41.2", "L68", "F43"],
        "cpv": ["45200000", "70000000"],
        "keywords": [
            "vivienda", "asprima", "sareb", "zona tensionada",
            "vivienda asequible", "vpo", "alquiler", "ley de vivienda",
            "urbanismo", "rehabilitación", "rehabilitacion",
            "mitma", "ministerio de vivienda", "compraventa",
            "hipoteca", "precio vivienda", "ipv", "okupación",
            "okupacion", "habitabilidad",
        ],
        "ministry": "Vivienda y Agenda Urbana",
        "risk_dominio": "politico",
        "page_route": "/sector-vivienda",
        "areas_tematicas": ["vivienda", "alquiler", "urbanismo", "social"],
        "regulators": ["MIVAU", "SAREB", "INE", "BdE"],
    },
}


# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────

def get_sector(sector_id: str) -> dict[str, Any] | None:
    """Devuelve el registro del sector o None si no existe."""
    return SECTOR_TAXONOMY.get(sector_id)


def list_sector_ids() -> list[str]:
    """Lista los IDs canónicos de los 9 sectores."""
    return list(SECTOR_TAXONOMY.keys())


def list_sectors() -> list[dict[str, Any]]:
    """Lista los registros completos de los 9 sectores."""
    return list(SECTOR_TAXONOMY.values())


def sector_keywords(sector_id: str) -> list[str]:
    """Lista de keywords del sector (lowercase, normalizadas)."""
    s = get_sector(sector_id)
    return [k.lower() for k in (s or {}).get("keywords", [])]


def sector_cpv_prefixes(sector_id: str) -> list[str]:
    """Lista de prefijos CPV del sector para filtrar contratos PLACSP/TED."""
    s = get_sector(sector_id)
    return list((s or {}).get("cpv", []))


def match_text_to_sectors(text: str) -> list[str]:
    """Dado un texto, devuelve los sector_id que matchean por keywords.

    Útil para taggear automáticamente noticias / BOE / contratos.
    """
    if not text:
        return []
    t = text.lower()
    matched: list[str] = []
    for sid, meta in SECTOR_TAXONOMY.items():
        for kw in meta.get("keywords", []):
            if kw.lower() in t:
                matched.append(sid)
                break
    return matched
