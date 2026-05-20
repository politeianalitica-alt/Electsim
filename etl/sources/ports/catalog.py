"""Catálogo Puertos · 40 puertos críticos del comercio mundial.

Selección curada por volumen (TEU/ton anual), criticidad geopolítica y
representatividad regional:
  - 6 España (Algeciras, Valencia, Barcelona, Bilbao, Las Palmas, Cartagena)
  - 8 Europa (Rotterdam, Antwerp, Hamburg, Felixstowe, Le Havre, Genoa, Piraeus, Gioia Tauro)
  - 10 Asia-Pacífico (Singapore, Shanghai, Ningbo, Shenzhen, Busan, Hong Kong,
    Kaohsiung, Tokyo, Port Klang, Tanjung Pelepas)
  - 6 Norteamérica (LA, Long Beach, NY/NJ, Houston, Vancouver, Savannah)
  - 4 Oriente Medio (Jebel Ali, Jeddah, Khor Fakkan, Hamad)
  - 6 chokepoint adjacents (Port Said, Suez North/South, Salalah, Colombo,
    Tanger Med, Panama Cristóbal)

Cada entrada:
  - slug · identificador estable snake_case
  - unlocode · código UN/LOCODE (5 letras: país+puerto)
  - name · nombre comercial
  - country_iso · ISO 3166-1 alpha-2
  - lat, lon · WGS84 centroide del puerto
  - type · 'container' | 'bulk' | 'tanker' | 'multipurpose' | 'cruise'
  - timezone · IANA tz
  - description · 1 línea contexto estratégico

Sin red. Coordenadas y UNLOCODE de UN/LOCODE oficial + World Port Index.
"""
from __future__ import annotations

from typing import Any

PORT_TYPES = ("container", "bulk", "tanker", "multipurpose", "cruise")
CATEGORIES_PORTS = ("europa", "asia_pacifico", "norteamerica", "oriente_medio", "espana")

PORTS: dict[str, dict[str, Any]] = {
    # ── España ────────────────────────────────────────────────────
    "algeciras": {
        "slug": "algeciras", "unlocode": "ESALG",
        "name": "Algeciras (Bahía)", "country_iso": "ES",
        "lat": 36.1408, "lon": -5.4526,
        "type": "container", "timezone": "Europe/Madrid",
        "region": "espana",
        "description": "Hub mediterráneo · 1º España en TEU · transbordo Maersk/MSC.",
    },
    "valencia": {
        "slug": "valencia", "unlocode": "ESVLC",
        "name": "Valencia", "country_iso": "ES",
        "lat": 39.4451, "lon": -0.3140,
        "type": "container", "timezone": "Europe/Madrid",
        "region": "espana",
        "description": "Gateway industrial Levante · 5.4M TEU/año.",
    },
    "barcelona": {
        "slug": "barcelona", "unlocode": "ESBCN",
        "name": "Barcelona", "country_iso": "ES",
        "lat": 41.3429, "lon": 2.1654,
        "type": "container", "timezone": "Europe/Madrid",
        "region": "espana",
        "description": "Pasajeros + carga · cruise homeport del Mediterráneo.",
    },
    "bilbao": {
        "slug": "bilbao", "unlocode": "ESBIO",
        "name": "Bilbao", "country_iso": "ES",
        "lat": 43.3573, "lon": -3.0500,
        "type": "multipurpose", "timezone": "Europe/Madrid",
        "region": "espana",
        "description": "Atlántico norte · químicos + ro-ro + acero.",
    },
    "las_palmas": {
        "slug": "las_palmas", "unlocode": "ESLPA",
        "name": "Las Palmas de Gran Canaria", "country_iso": "ES",
        "lat": 28.1300, "lon": -15.4200,
        "type": "multipurpose", "timezone": "Atlantic/Canary",
        "region": "espana",
        "description": "Hub bunkering Atlántico · pesca + reparación naval.",
    },
    "cartagena_es": {
        "slug": "cartagena_es", "unlocode": "ESCAR",
        "name": "Cartagena (Murcia)", "country_iso": "ES",
        "lat": 37.5950, "lon": -0.9800,
        "type": "tanker", "timezone": "Europe/Madrid",
        "region": "espana",
        "description": "Granel líquido · refinería Repsol Escombreras.",
    },

    # ── Europa ────────────────────────────────────────────────────
    "rotterdam": {
        "slug": "rotterdam", "unlocode": "NLRTM",
        "name": "Rotterdam", "country_iso": "NL",
        "lat": 51.9495, "lon": 4.1430,
        "type": "container", "timezone": "Europe/Amsterdam",
        "region": "europa",
        "description": "Mayor puerto europeo · 15M TEU · gateway NW-Europa.",
    },
    "antwerp": {
        "slug": "antwerp", "unlocode": "BEANR",
        "name": "Antwerp-Bruges", "country_iso": "BE",
        "lat": 51.2700, "lon": 4.3500,
        "type": "container", "timezone": "Europe/Brussels",
        "region": "europa",
        "description": "2º Europa · químicos + autos + breakbulk.",
    },
    "hamburg": {
        "slug": "hamburg", "unlocode": "DEHAM",
        "name": "Hamburg", "country_iso": "DE",
        "lat": 53.5413, "lon": 9.9760,
        "type": "container", "timezone": "Europe/Berlin",
        "region": "europa",
        "description": "Gateway Báltico/Europa Central · 8.3M TEU.",
    },
    "felixstowe": {
        "slug": "felixstowe", "unlocode": "GBFXT",
        "name": "Felixstowe", "country_iso": "GB",
        "lat": 51.9550, "lon": 1.3500,
        "type": "container", "timezone": "Europe/London",
        "region": "europa",
        "description": "1º UK · 4M TEU · Hutchison Ports.",
    },
    "le_havre": {
        "slug": "le_havre", "unlocode": "FRLEH",
        "name": "Le Havre", "country_iso": "FR",
        "lat": 49.4861, "lon": 0.1083,
        "type": "container", "timezone": "Europe/Paris",
        "region": "europa",
        "description": "1º Francia container · gateway París + valle Sena.",
    },
    "genoa": {
        "slug": "genoa", "unlocode": "ITGOA",
        "name": "Genoa", "country_iso": "IT",
        "lat": 44.4056, "lon": 8.9342,
        "type": "container", "timezone": "Europe/Rome",
        "region": "europa",
        "description": "1º Italia · gateway norte industrial.",
    },
    "piraeus": {
        "slug": "piraeus", "unlocode": "GRPIR",
        "name": "Piraeus", "country_iso": "GR",
        "lat": 37.9420, "lon": 23.6470,
        "type": "container", "timezone": "Europe/Athens",
        "region": "europa",
        "description": "Controlado COSCO · pivote Belt&Road en UE.",
    },
    "gioia_tauro": {
        "slug": "gioia_tauro", "unlocode": "ITGIT",
        "name": "Gioia Tauro", "country_iso": "IT",
        "lat": 38.4350, "lon": 15.9000,
        "type": "container", "timezone": "Europe/Rome",
        "region": "europa",
        "description": "Hub transbordo Mediterráneo central.",
    },

    # ── Asia-Pacífico ─────────────────────────────────────────────
    "singapore": {
        "slug": "singapore", "unlocode": "SGSIN",
        "name": "Singapore", "country_iso": "SG",
        "lat": 1.2647, "lon": 103.8200,
        "type": "container", "timezone": "Asia/Singapore",
        "region": "asia_pacifico",
        "description": "Hub transbordo global · 37M TEU · 1º bunkering mundial.",
    },
    "shanghai": {
        "slug": "shanghai", "unlocode": "CNSHA",
        "name": "Shanghai", "country_iso": "CN",
        "lat": 30.6260, "lon": 122.0660,
        "type": "container", "timezone": "Asia/Shanghai",
        "region": "asia_pacifico",
        "description": "1º mundial container · 49M TEU · Yangshan terminal.",
    },
    "ningbo": {
        "slug": "ningbo", "unlocode": "CNNGB",
        "name": "Ningbo-Zhoushan", "country_iso": "CN",
        "lat": 29.8683, "lon": 121.5440,
        "type": "container", "timezone": "Asia/Shanghai",
        "region": "asia_pacifico",
        "description": "3º mundial · gateway delta Yangtze + granel líquido.",
    },
    "shenzhen": {
        "slug": "shenzhen", "unlocode": "CNSZN",
        "name": "Shenzhen", "country_iso": "CN",
        "lat": 22.5660, "lon": 113.9450,
        "type": "container", "timezone": "Asia/Shanghai",
        "region": "asia_pacifico",
        "description": "Yantian/Shekou · gateway electrónica Pearl River.",
    },
    "busan": {
        "slug": "busan", "unlocode": "KRPUS",
        "name": "Busan", "country_iso": "KR",
        "lat": 35.0951, "lon": 129.0756,
        "type": "container", "timezone": "Asia/Seoul",
        "region": "asia_pacifico",
        "description": "Gateway Corea · 23M TEU · transbordo NE-Asia.",
    },
    "hong_kong": {
        "slug": "hong_kong", "unlocode": "HKHKG",
        "name": "Hong Kong", "country_iso": "HK",
        "lat": 22.3193, "lon": 114.1694,
        "type": "container", "timezone": "Asia/Hong_Kong",
        "region": "asia_pacifico",
        "description": "Kwai Tsing · gateway sur China · 14M TEU.",
    },
    "kaohsiung": {
        "slug": "kaohsiung", "unlocode": "TWKHH",
        "name": "Kaohsiung", "country_iso": "TW",
        "lat": 22.6163, "lon": 120.3133,
        "type": "container", "timezone": "Asia/Taipei",
        "region": "asia_pacifico",
        "description": "1º Taiwán · semiconductores TSMC export pivot.",
    },
    "tokyo": {
        "slug": "tokyo", "unlocode": "JPTYO",
        "name": "Tokyo", "country_iso": "JP",
        "lat": 35.6273, "lon": 139.7790,
        "type": "container", "timezone": "Asia/Tokyo",
        "region": "asia_pacifico",
        "description": "Bahía Tokio · multimodal · electrónica/autos.",
    },
    "port_klang": {
        "slug": "port_klang", "unlocode": "MYPKG",
        "name": "Port Klang", "country_iso": "MY",
        "lat": 3.0033, "lon": 101.3920,
        "type": "container", "timezone": "Asia/Kuala_Lumpur",
        "region": "asia_pacifico",
        "description": "Gateway Kuala Lumpur · transbordo Estrecho Malaca.",
    },
    "tanjung_pelepas": {
        "slug": "tanjung_pelepas", "unlocode": "MYTPP",
        "name": "Tanjung Pelepas", "country_iso": "MY",
        "lat": 1.3669, "lon": 103.5500,
        "type": "container", "timezone": "Asia/Kuala_Lumpur",
        "region": "asia_pacifico",
        "description": "Maersk hub competidor de Singapore.",
    },

    # ── Norteamérica ──────────────────────────────────────────────
    "los_angeles": {
        "slug": "los_angeles", "unlocode": "USLAX",
        "name": "Los Angeles", "country_iso": "US",
        "lat": 33.7405, "lon": -118.2760,
        "type": "container", "timezone": "America/Los_Angeles",
        "region": "norteamerica",
        "description": "1º USA · gateway Asia · San Pedro Bay.",
    },
    "long_beach": {
        "slug": "long_beach", "unlocode": "USLGB",
        "name": "Long Beach", "country_iso": "US",
        "lat": 33.7700, "lon": -118.1937,
        "type": "container", "timezone": "America/Los_Angeles",
        "region": "norteamerica",
        "description": "Twin port LA · 8.3M TEU · electric drayage.",
    },
    "ny_nj": {
        "slug": "ny_nj", "unlocode": "USNYC",
        "name": "New York / New Jersey", "country_iso": "US",
        "lat": 40.6643, "lon": -74.0552,
        "type": "container", "timezone": "America/New_York",
        "region": "norteamerica",
        "description": "1º costa Este USA · gateway NE megalópolis.",
    },
    "houston": {
        "slug": "houston", "unlocode": "USHOU",
        "name": "Houston", "country_iso": "US",
        "lat": 29.7339, "lon": -95.2710,
        "type": "tanker", "timezone": "America/Chicago",
        "region": "norteamerica",
        "description": "1º USA en crudo+petroquímica · canal Galveston.",
    },
    "vancouver": {
        "slug": "vancouver", "unlocode": "CAVAN",
        "name": "Vancouver", "country_iso": "CA",
        "lat": 49.2900, "lon": -123.1110,
        "type": "container", "timezone": "America/Vancouver",
        "region": "norteamerica",
        "description": "Gateway Asia-Pacífico Canadá · gas natural + grano.",
    },
    "savannah": {
        "slug": "savannah", "unlocode": "USSAV",
        "name": "Savannah", "country_iso": "US",
        "lat": 32.1300, "lon": -81.1410,
        "type": "container", "timezone": "America/New_York",
        "region": "norteamerica",
        "description": "Garden City terminal · gateway Sureste USA.",
    },

    # ── Oriente Medio ────────────────────────────────────────────
    "jebel_ali": {
        "slug": "jebel_ali", "unlocode": "AEJEA",
        "name": "Jebel Ali (Dubai)", "country_iso": "AE",
        "lat": 25.0080, "lon": 55.0610,
        "type": "container", "timezone": "Asia/Dubai",
        "region": "oriente_medio",
        "description": "1º Oriente Medio · 14M TEU · DP World hub.",
    },
    "jeddah": {
        "slug": "jeddah", "unlocode": "SAJED",
        "name": "Jeddah Islamic Port", "country_iso": "SA",
        "lat": 21.4858, "lon": 39.1825,
        "type": "container", "timezone": "Asia/Riyadh",
        "region": "oriente_medio",
        "description": "Mar Rojo · puerta peregrinación + gateway Saudi.",
    },
    "khor_fakkan": {
        "slug": "khor_fakkan", "unlocode": "AEKHL",
        "name": "Khor Fakkan", "country_iso": "AE",
        "lat": 25.3400, "lon": 56.3500,
        "type": "container", "timezone": "Asia/Dubai",
        "region": "oriente_medio",
        "description": "Fuera Estrecho de Ormuz · transbordo alternativo.",
    },
    "hamad": {
        "slug": "hamad", "unlocode": "QAHMD",
        "name": "Hamad Port (Doha)", "country_iso": "QA",
        "lat": 25.0408, "lon": 51.6033,
        "type": "container", "timezone": "Asia/Qatar",
        "region": "oriente_medio",
        "description": "Hub Qatar · post-bloqueo 2017 · LNG hub adyacente.",
    },

    # ── Chokepoint adjacents ─────────────────────────────────────
    "port_said": {
        "slug": "port_said", "unlocode": "EGPSD",
        "name": "Port Said (East)", "country_iso": "EG",
        "lat": 31.2667, "lon": 32.3000,
        "type": "container", "timezone": "Africa/Cairo",
        "region": "oriente_medio",
        "description": "Entrada norte Canal de Suez · transbordo Maersk.",
    },
    "suez_north": {
        "slug": "suez_north", "unlocode": "EGSEZ",
        "name": "Suez (North entrance)", "country_iso": "EG",
        "lat": 31.2700, "lon": 32.3500,
        "type": "multipurpose", "timezone": "Africa/Cairo",
        "region": "oriente_medio",
        "description": "Acceso norte al canal · monitoreo tráfico crítico.",
    },
    "suez_south": {
        "slug": "suez_south", "unlocode": "EGSUZ",
        "name": "Suez (South / Port Tewfik)", "country_iso": "EG",
        "lat": 29.9670, "lon": 32.5500,
        "type": "multipurpose", "timezone": "Africa/Cairo",
        "region": "oriente_medio",
        "description": "Salida sur del canal hacia Mar Rojo.",
    },
    "salalah": {
        "slug": "salalah", "unlocode": "OMSLL",
        "name": "Salalah", "country_iso": "OM",
        "lat": 16.9333, "lon": 54.0167,
        "type": "container", "timezone": "Asia/Muscat",
        "region": "oriente_medio",
        "description": "Mar Arábigo · transbordo fuera Ormuz · APM Terminals.",
    },
    "colombo": {
        "slug": "colombo", "unlocode": "LKCMB",
        "name": "Colombo", "country_iso": "LK",
        "lat": 6.9510, "lon": 79.8420,
        "type": "container", "timezone": "Asia/Colombo",
        "region": "asia_pacifico",
        "description": "Hub Sur-Asia · transbordo Subcontinente Indio.",
    },
    "tanger_med": {
        "slug": "tanger_med", "unlocode": "MAPTM",
        "name": "Tanger Med", "country_iso": "MA",
        "lat": 35.8853, "lon": -5.5167,
        "type": "container", "timezone": "Africa/Casablanca",
        "region": "europa",
        "description": "Estrecho Gibraltar · 10M TEU · competidor Algeciras.",
    },
    "panama_cristobal": {
        "slug": "panama_cristobal", "unlocode": "PAONX",
        "name": "Cristóbal (Panama)", "country_iso": "PA",
        "lat": 9.3500, "lon": -79.8970,
        "type": "container", "timezone": "America/Panama",
        "region": "norteamerica",
        "description": "Entrada Atlántica Canal Panamá · transbordo.",
    },
}


def list_ports(
    country: str | None = None,
    type_: str | None = None,
    region: str | None = None,
) -> list[dict[str, Any]]:
    """Lista catálogo, opcionalmente filtrado por país (ISO-2), tipo o región."""
    items = list(PORTS.values())
    if country:
        items = [p for p in items if p["country_iso"].upper() == country.upper()]
    if type_:
        items = [p for p in items if p["type"] == type_.lower()]
    if region:
        items = [p for p in items if p["region"] == region.lower()]
    return items


def get_port(slug: str) -> dict[str, Any] | None:
    return PORTS.get(slug.lower())


__all__ = [
    "PORTS",
    "PORT_TYPES",
    "CATEGORIES_PORTS",
    "list_ports",
    "get_port",
]
