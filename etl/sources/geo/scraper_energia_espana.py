"""
Scraper de Dependencia Energética Española — CORES + REE + operadores.

Fuentes:
  - CORES: importaciones crudeo + gas natural por país de origen
    https://www.cores.es/sites/default/files/archivos/icores/i-crudosdiciembre2025.pdf
  - REE: interconexiones internacionales activas
    https://www.ree.es/es/transicion-ecologica/interconexiones
  - Operadores: Naturgy, Repsol, Iberdrola, Enagás, Endesa

Datos de seed: diciembre 2025 / enero 2026.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Seed CORES — Importaciones crudo por país (2025) ──────────────────────────
# Unidades: toneladas métricas (equivalente petróleo) — % del total importado
SEED_CRUDO: list[dict[str, Any]] = [
    {"id": "crudo_NGA", "pais": "Nigeria", "iso3": "NGA", "lat": 9.1, "lon": 8.7,
     "tipo_flujo": "crudo", "volumen_ktep": 8500, "cuota_pct": 14.2,
     "tendencia": "estable", "operadores": ["Repsol", "Cepsa"],
     "riesgo_suministro": 6.5, "alternativa_disponible": True},
    {"id": "crudo_SAU", "pais": "Arabia Saudí", "iso3": "SAU", "lat": 23.9, "lon": 45.1,
     "tipo_flujo": "crudo", "volumen_ktep": 7800, "cuota_pct": 13.0,
     "tendencia": "estable", "operadores": ["Repsol", "Cepsa"],
     "riesgo_suministro": 5.8, "alternativa_disponible": True},
    {"id": "crudo_USA", "pais": "Estados Unidos", "iso3": "USA", "lat": 38.9, "lon": -77.0,
     "tipo_flujo": "crudo_GNL", "volumen_ktep": 7200, "cuota_pct": 12.0,
     "tendencia": "subiendo", "operadores": ["Repsol", "Naturgy"],
     "riesgo_suministro": 3.5, "alternativa_disponible": True},
    {"id": "crudo_IRQ", "pais": "Iraq", "iso3": "IRQ", "lat": 33.2, "lon": 43.7,
     "tipo_flujo": "crudo", "volumen_ktep": 6100, "cuota_pct": 10.2,
     "tendencia": "estable", "operadores": ["Repsol", "Técnicas Reunidas"],
     "riesgo_suministro": 7.0, "alternativa_disponible": True},
    {"id": "crudo_BRA", "pais": "Brasil", "iso3": "BRA", "lat": -15.8, "lon": -47.9,
     "tipo_flujo": "crudo", "volumen_ktep": 5500, "cuota_pct": 9.2,
     "tendencia": "subiendo", "operadores": ["Repsol", "Cepsa"],
     "riesgo_suministro": 4.0, "alternativa_disponible": True},
    {"id": "crudo_KAZ", "pais": "Kazajistán", "iso3": "KAZ", "lat": 48.0, "lon": 68.0,
     "tipo_flujo": "crudo", "volumen_ktep": 4200, "cuota_pct": 7.0,
     "tendencia": "estable", "operadores": ["Repsol"],
     "riesgo_suministro": 5.5, "alternativa_disponible": True},
    {"id": "crudo_GBN", "pais": "Guinea Ecuatorial", "iso3": "GNQ", "lat": 3.7, "lon": 8.8,
     "tipo_flujo": "crudo", "volumen_ktep": 3100, "cuota_pct": 5.2,
     "tendencia": "bajando", "operadores": ["Repsol"],
     "riesgo_suministro": 6.8, "alternativa_disponible": True},
    {"id": "crudo_LBY", "pais": "Libia", "iso3": "LBY", "lat": 27.0, "lon": 17.0,
     "tipo_flujo": "crudo", "volumen_ktep": 2800, "cuota_pct": 4.7,
     "tendencia": "inestable", "operadores": ["Repsol"],
     "riesgo_suministro": 8.5, "alternativa_disponible": False},
    {"id": "crudo_MEX", "pais": "México", "iso3": "MEX", "lat": 23.6, "lon": -102.6,
     "tipo_flujo": "crudo", "volumen_ktep": 2500, "cuota_pct": 4.2,
     "tendencia": "bajando", "operadores": ["Repsol", "Cepsa"],
     "riesgo_suministro": 5.0, "alternativa_disponible": True},
    {"id": "crudo_AZE", "pais": "Azerbaiyán", "iso3": "AZE", "lat": 40.1, "lon": 47.6,
     "tipo_flujo": "crudo", "volumen_ktep": 1800, "cuota_pct": 3.0,
     "tendencia": "subiendo", "operadores": ["Repsol"],
     "riesgo_suministro": 5.5, "alternativa_disponible": True},
]

# ── Seed CORES — Gas natural por país de origen (2025) ───────────────────────
# Mezcla gasoducto + GNL; unidades: GWh
SEED_GAS: list[dict[str, Any]] = [
    {"id": "gas_DZA", "pais": "Argelia", "iso3": "DZA", "lat": 36.7, "lon": 3.1,
     "tipo_flujo": "gas_gasoducto", "volumen_gwh": 98000, "cuota_pct": 28.5,
     "infraestructura": ["Gasoducto Medgaz (10 bcm/año)", "Gasoducto TransMed (vía Italia)"],
     "tendencia": "estable", "operadores": ["Naturgy", "Enagás"],
     "riesgo_suministro": 6.8, "alternativa_disponible": False,
     "comentario": "Dependencia crítica — ruptura tensión Argelia-Marruecos 2021"},
    {"id": "gas_USA", "pais": "Estados Unidos", "iso3": "USA", "lat": 38.9, "lon": -77.0,
     "tipo_flujo": "gas_GNL", "volumen_gwh": 72000, "cuota_pct": 21.0,
     "infraestructura": ["Terminal Barcelona", "Terminal Sagunto", "Terminal Muggianu"],
     "tendencia": "subiendo", "operadores": ["Naturgy", "Repsol", "Endesa"],
     "riesgo_suministro": 3.0, "alternativa_disponible": True,
     "comentario": "GNL spot — diversificación post-guerra Ucrania"},
    {"id": "gas_NGA", "pais": "Nigeria", "iso3": "NGA", "lat": 9.1, "lon": 8.7,
     "tipo_flujo": "gas_GNL", "volumen_gwh": 45000, "cuota_pct": 13.1,
     "infraestructura": ["Gasoducto Nigeria-Marruecos (proyecto)"],
     "tendencia": "estable", "operadores": ["Naturgy", "Endesa"],
     "riesgo_suministro": 6.5, "alternativa_disponible": True},
    {"id": "gas_QAT", "pais": "Qatar", "iso3": "QAT", "lat": 25.3, "lon": 51.5,
     "tipo_flujo": "gas_GNL", "volumen_gwh": 38000, "cuota_pct": 11.1,
     "infraestructura": ["Contratos largo plazo GNL"],
     "tendencia": "estable", "operadores": ["Naturgy", "Repsol"],
     "riesgo_suministro": 4.5, "alternativa_disponible": True},
    {"id": "gas_TTO", "pais": "Trinidad y Tobago", "iso3": "TTO", "lat": 10.7, "lon": -61.5,
     "tipo_flujo": "gas_GNL", "volumen_gwh": 22000, "cuota_pct": 6.4,
     "infraestructura": ["GNL spot Atlántico"],
     "tendencia": "estable", "operadores": ["Naturgy"],
     "riesgo_suministro": 4.0, "alternativa_disponible": True},
    {"id": "gas_NOR", "pais": "Noruega", "iso3": "NOR", "lat": 59.9, "lon": 10.7,
     "tipo_flujo": "gas_GNL", "volumen_gwh": 18000, "cuota_pct": 5.2,
     "infraestructura": ["GNL terminales Barcelona/Muggianu"],
     "tendencia": "subiendo", "operadores": ["Naturgy", "Endesa"],
     "riesgo_suministro": 2.5, "alternativa_disponible": True},
    {"id": "gas_PRT_interc", "pais": "Portugal", "iso3": "PRT", "lat": 38.7, "lon": -9.1,
     "tipo_flujo": "interconexion_bidireccional", "volumen_gwh": 8500, "cuota_pct": 2.5,
     "infraestructura": ["Interconexión Badajoz-Campo Maior", "Tuy-Valença"],
     "tendencia": "estable", "operadores": ["Enagás", "REN"],
     "riesgo_suministro": 1.5, "alternativa_disponible": True},
    {"id": "gas_FRA_interc", "pais": "Francia", "iso3": "FRA", "lat": 43.3, "lon": 1.9,
     "tipo_flujo": "interconexion", "volumen_gwh": 12000, "cuota_pct": 3.5,
     "infraestructura": ["Larrau", "Biriatou", "Loon-Plage (proyecto)"],
     "tendencia": "estable", "operadores": ["Enagás", "GRTgaz"],
     "riesgo_suministro": 2.0, "alternativa_disponible": True},
]

# ── Seed REE — Interconexiones eléctricas ────────────────────────────────────
SEED_INTERCONEXIONES_ELECTRICAS: list[dict[str, Any]] = [
    {"id": "ree_FRA_norte", "pais": "Francia", "iso3": "FRA", "lat": 43.0, "lon": 0.5,
     "tipo_flujo": "electricidad", "capacidad_mw": 2800, "flujo_2025_gwh": 7200,
     "infraestructura": ["Interconexión Travesera", "Biescas", "Vic-Bescanó"],
     "estado": "activa", "operadores": ["REE", "RTE"],
     "tendencia": "estable", "cuota_pct": 4.5,
     "riesgo_suministro": 2.0},
    {"id": "ree_FRA_midi", "pais": "Francia (enlace dc HVDC)", "iso3": "FRA",
     "lat": 43.3, "lon": 3.0,
     "tipo_flujo": "electricidad_hvdc", "capacidad_mw": 2000, "flujo_2025_gwh": 5100,
     "infraestructura": ["Enlace HVDC Golfo de León — en construcción"],
     "estado": "construccion", "operadores": ["REE", "RTE"],
     "tendencia": "subiendo", "cuota_pct": 0.0,
     "riesgo_suministro": 1.5},
    {"id": "ree_MAR_interc", "pais": "Marruecos", "iso3": "MAR", "lat": 35.8, "lon": -5.5,
     "tipo_flujo": "electricidad_bidireccional", "capacidad_mw": 700, "flujo_2025_gwh": 1800,
     "infraestructura": ["Enlace Tarifa-Fardioua", "Cable submarino Estrecho"],
     "estado": "activa", "operadores": ["REE", "ONEE"],
     "tendencia": "bajando", "cuota_pct": 1.1,
     "riesgo_suministro": 5.5},
    {"id": "ree_PRT_interc", "pais": "Portugal", "iso3": "PRT", "lat": 38.7, "lon": -8.0,
     "tipo_flujo": "electricidad_bidireccional", "capacidad_mw": 3000, "flujo_2025_gwh": 8500,
     "infraestructura": ["Múltiples interconexiones terrestres (MIBEL)"],
     "estado": "activa", "operadores": ["REE", "REN"],
     "tendencia": "estable", "cuota_pct": 5.3,
     "riesgo_suministro": 1.5},
]


def get_fuentes_energia(tipo: str = "todas") -> list[dict[str, Any]]:
    """
    tipo: 'crudo' | 'gas' | 'electricidad' | 'todas'
    Retorna datos ordenados por cuota descendente.
    """
    data: list[dict] = []
    if tipo in ("crudo", "todas"):
        data.extend([{**d, "fuente_datos": "CORES dic-2025"} for d in SEED_CRUDO])
    if tipo in ("gas", "todas"):
        data.extend([{**d, "fuente_datos": "CORES dic-2025"} for d in SEED_GAS])
    if tipo in ("electricidad", "todas"):
        data.extend([{**d, "fuente_datos": "REE 2025"} for d in SEED_INTERCONEXIONES_ELECTRICAS])
    data.sort(key=lambda x: -x.get("cuota_pct", 0))
    return data


def get_dependencias_criticas(riesgo_min: float = 6.0) -> list[dict[str, Any]]:
    """Retorna fuentes con riesgo de suministro alto y sin alternativa fácil."""
    todas = get_fuentes_energia()
    return [d for d in todas
            if d.get("riesgo_suministro", 0) >= riesgo_min
            and not d.get("alternativa_disponible", True)]


def to_presencia_format(entry: dict) -> dict:
    """Convierte a formato unificado espana_mundo."""
    tipo = entry.get("tipo_flujo", "energia")
    subcats = {
        "crudo": "importacion_petroleo",
        "crudo_GNL": "importacion_crudo_gnl",
        "gas_gasoducto": "gas_gasoducto",
        "gas_GNL": "gas_gnl",
        "electricidad": "interconexion_electrica",
        "electricidad_hvdc": "interconexion_hvdc",
        "electricidad_bidireccional": "interconexion_bidireccional",
        "interconexion": "interconexion_gas",
        "interconexion_bidireccional": "interconexion_gas",
    }
    valor = entry.get("volumen_ktep") or entry.get("volumen_gwh") or entry.get("capacidad_mw") or 0
    unidad = (
        "ktep" if "ktep" in entry else
        "GWh" if "gwh" in entry else
        "MW" if "mw" in entry else "unidad"
    )
    return {
        "id": entry["id"],
        "pais_nombre": entry["pais"],
        "iso3": entry["iso3"],
        "categoria": "energetica",
        "subcategoria": subcats.get(tipo, "energia"),
        "titulo": f"{entry['pais']} — {tipo.replace('_', ' ')} ({entry.get('cuota_pct', 0):.1f}% mix español)",
        "actor_espanol": " / ".join(entry.get("operadores", ["CORES"])),
        "descripcion": (
            f"Cuota en mix energético español: {entry.get('cuota_pct', 0):.1f}%. "
            f"Volumen: {valor:,.0f} {unidad}. "
            f"Infraestructura: {', '.join(entry.get('infraestructura', [])[:2])}. "
            f"Riesgo suministro: {entry.get('riesgo_suministro', 0):.1f}/10. "
            f"{entry.get('comentario', '')}"
        ).strip(),
        "valor": valor,
        "unidad": unidad,
        "score_relevancia": min(1.0, entry.get("cuota_pct", 0) / 30 + entry.get("riesgo_suministro", 0) / 20),
        "lat": entry["lat"],
        "lon": entry["lon"],
        "riesgo_suministro": entry.get("riesgo_suministro", 0),
        "fuente_url": entry.get("fuente_url", "https://www.cores.es"),
        "updated_at": "2026-01-14T00:00:00Z",
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("=== CRUDO ===")
    for d in SEED_CRUDO[:5]:
        print(f"  {d['pais']:25s} {d['cuota_pct']:5.1f}%  riesgo={d['riesgo_suministro']}")
    print("\n=== GAS ===")
    for d in SEED_GAS[:5]:
        print(f"  {d['pais']:25s} {d['cuota_pct']:5.1f}%  riesgo={d['riesgo_suministro']}")
    print("\n=== DEPENDENCIAS CRITICAS ===")
    for d in get_dependencias_criticas():
        print(f"  {d['pais']:25s} {d['tipo_flujo']} riesgo={d['riesgo_suministro']}")
