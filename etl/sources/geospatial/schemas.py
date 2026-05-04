"""
Geospatial Schemas — Bloque 7.

Modelos Pydantic para el módulo Territorial & Geospatial Intelligence.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

# ── Constantes ────────────────────────────────────────────────────────────────

TERRITORY_TYPES = Literal[
    "country", "ccaa", "province", "municipality", "district", "census_section"
]

SIGNAL_TYPES = Literal[
    "electoral_swing",
    "economic_stress",
    "media_intensity",
    "legislative_impact",
    "contracting_opportunity",
    "risk_exposure",
    "campaign_priority",
    "turnout_risk",
    "soft_vote_opportunity",
    "demographic_pressure",
]

# ID estables: country → "ES", ccaa → "ccaa:13", prov → "prov:28",
# mun → "mun:28079", sec → "sec:28079-001-001"
ID_PREFIXES = {
    "country":        "",
    "ccaa":           "ccaa:",
    "province":       "prov:",
    "municipality":   "mun:",
    "district":       "dist:",
    "census_section": "sec:",
}


def build_territory_id(territory_type: str, code: str) -> str:
    """Construye un ID estable para un territorio."""
    prefix = ID_PREFIXES.get(territory_type, "")
    if territory_type == "country":
        return code.upper()
    return f"{prefix}{code}"


# ── Territory ─────────────────────────────────────────────────────────────────

class Territory(BaseModel):
    """Unidad territorial con jerarquía y atributos."""

    territory_id: str
    ine_code: str | None = None

    name: str
    normalized_name: str = ""

    territory_type: str  # from TERRITORY_TYPES

    parent_id: str | None = None

    ccaa_code: str | None = None
    province_code: str | None = None
    municipality_code: str | None = None
    district_code: str | None = None
    section_code: str | None = None

    population: int | None = None
    area_km2: float | None = None

    lat: float | None = None
    lon: float | None = None

    active: bool = True
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _normalize(self) -> "Territory":
        if not self.normalized_name:
            import unicodedata
            s = self.name.lower()
            s = unicodedata.normalize("NFD", s)
            s = "".join(c for c in s if unicodedata.category(c) != "Mn")
            self.normalized_name = s.strip()
        return self


# ── TerritoryGeometry ─────────────────────────────────────────────────────────

class TerritoryGeometry(BaseModel):
    """Geometría de un territorio en formato GeoJSON/WKT."""

    territory_id: str
    territory_type: str

    geometry_source: str = "geojson_file"
    geometry_format: Literal["geojson", "wkt", "wkb"] = "geojson"

    geometry: dict[str, Any] | str = Field(default_factory=dict)
    simplified_geometry: dict[str, Any] | str | None = None

    centroid_lat: float | None = None
    centroid_lon: float | None = None

    bbox: list[float] | None = None  # [minx, miny, maxx, maxy]
    resolution: Literal["full", "medium", "low"] = "medium"

    valid_from: date | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── TerritorialSignal ─────────────────────────────────────────────────────────

class TerritorialSignal(BaseModel):
    """Señal territorial que integra datos de múltiples módulos."""

    territory_id: str
    territory_type: str

    signal_type: str  # from SIGNAL_TYPES
    signal_date: date = Field(default_factory=date.today)

    value: float          # 0-100 normalizado
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "LOW"

    source_module: str = "territorial"
    source_object_id: str | None = None

    explanation: str = ""
    confidence: float = 0.5

    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _set_severity(self) -> "TerritorialSignal":
        if self.value >= 80:
            self.severity = "CRITICAL"
        elif self.value >= 60:
            self.severity = "HIGH"
        elif self.value >= 40:
            self.severity = "MEDIUM"
        else:
            self.severity = "LOW"
        return self


# ── TerritoryProfile ──────────────────────────────────────────────────────────

class TerritoryProfile(BaseModel):
    """Perfil agregado de un territorio (snapshot)."""

    territory_id: str
    name: str
    territory_type: str

    population: int | None = None
    income_avg: float | None = None
    unemployment_rate: float | None = None
    age_median: float | None = None

    last_election_winner: str | None = None
    turnout_last: float | None = None
    swing_index: float | None = None

    media_mentions_7d: int = 0
    active_alerts: int = 0

    economic_risk: float | None = None      # 0-100
    electoral_priority: float | None = None  # 0-100
    campaign_priority: float | None = None   # 0-100

    top_issues: list[str] = Field(default_factory=list)
    relevant_actors: list[str] = Field(default_factory=list)

    computed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── TerritorialAdjacency ──────────────────────────────────────────────────────

class TerritorialAdjacency(BaseModel):
    """Relación de adyacencia entre dos territorios."""

    territory_id: str
    neighbor_id: str
    territory_type: str

    border_length_km: float | None = None
    relation_type: str = "touches"

    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── TerritoryResolutionResult ─────────────────────────────────────────────────

class TerritoryResolutionResult(BaseModel):
    """Resultado de resolución de un texto/coordenadas a territorio(s)."""

    query: str
    territory_ids: list[str] = Field(default_factory=list)
    territory_names: list[str] = Field(default_factory=list)
    territory_types: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    method: str = "text_match"   # "text_match", "coords", "ine_code"


# ── Datos estáticos de territorios españoles ──────────────────────────────────

# Provincias españolas: código INE (2 dígitos) → nombre
SPAIN_PROVINCES: dict[str, str] = {
    "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
    "05": "Ávila", "06": "Badajoz", "07": "Islas Baleares", "08": "Barcelona",
    "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
    "13": "Ciudad Real", "14": "Córdoba", "15": "La Coruña", "16": "Cuenca",
    "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Guipúzcoa",
    "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
    "25": "Lérida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
    "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Orense",
    "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
    "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
    "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
    "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
    "48": "Vizcaya", "49": "Zamora", "50": "Zaragoza",
    "51": "Ceuta", "52": "Melilla",
}

# CCAA: código INE (2 dígitos) → nombre
SPAIN_CCAA: dict[str, str] = {
    "01": "Andalucía", "02": "Aragón", "03": "Asturias", "04": "Islas Baleares",
    "05": "Canarias", "06": "Cantabria", "07": "Castilla-La Mancha",
    "08": "Castilla y León", "09": "Cataluña", "10": "Extremadura",
    "11": "Galicia", "12": "La Rioja", "13": "Madrid", "14": "Murcia",
    "15": "Navarra", "16": "País Vasco", "17": "La Rioja",
    "18": "Comunidad Valenciana", "19": "Ceuta", "20": "Melilla",
}

# Provincia → CCAA mapping
PROVINCE_TO_CCAA: dict[str, str] = {
    "01": "16", "20": "16", "48": "16",  # País Vasco
    "33": "03",  # Asturias
    "39": "06",  # Cantabria
    "26": "17",  # La Rioja
    "31": "15",  # Navarra
    "08": "09", "17": "09", "25": "09", "43": "09",  # Cataluña
    "22": "02", "44": "02", "50": "02",  # Aragón
    "07": "04",  # Baleares
    "35": "05", "38": "05",  # Canarias
    "28": "13",  # Madrid
    "05": "08", "09": "08", "24": "08", "34": "08",
    "37": "08", "40": "08", "42": "08", "47": "08", "49": "08",  # Castilla y León
    "02": "07", "13": "07", "16": "07", "19": "07",
    "45": "07",  # Castilla-La Mancha
    "03": "18", "12": "18", "46": "18",  # C. Valenciana
    "30": "14",  # Murcia
    "06": "10", "10": "10",  # Extremadura
    "04": "01", "11": "01", "14": "01", "18": "01",
    "21": "01", "23": "01", "29": "01", "41": "01",  # Andalucía
    "15": "11", "27": "11", "32": "11", "36": "11",  # Galicia
    "51": "19", "52": "20",  # Ceuta/Melilla
}
