"""
Scraper Inversión Española en el Exterior — ICEX/DataInvex + IBEX empresas.

Fuentes:
  - ICEX/DataInvex: stock de inversión española por país destino
    https://www.icex.es/es/estadisticas
  - Nota Gobierno: destinos principales inversión española 2026
    https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/economia/2026/300326-economia-datos-inversiones.aspx
  - Memorias anuales IBEX-35: Santander, BBVA, Telefónica, Iberdrola, Repsol,
    IAG, Inditex, ACS, Ferrovial, Mapfre, OHL, Indra, Navantia, Amadeus

Datos de seed: stock estimado inversión española en el exterior (2025, mill. EUR).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Seed stock de inversión española por país ──────────────────────────────────
# stock_mill_eur: inversión directa española en el exterior (posición inversora, mill. EUR)
# sectores: sectores económicos con mayor exposición
SEED_EMPRESAS: list[dict[str, Any]] = [
    # USA — mayor destino absoluto
    {"id": "emp_USA", "pais": "Estados Unidos", "iso3": "USA", "lat": 38.9, "lon": -77.0,
     "stock_mill_eur": 95000, "cuota_pct": 18.5,
     "sectores": ["banca", "telecomunicaciones", "energia", "infraestructuras"],
     "empresas": ["Santander (SHUSA)", "Ferrovial (JFK/407 ETR)", "Iberdrola (Avangrid)",
                  "ACS (Turner/Dragados)", "Telefónica Tech", "BBVA (stake Citi)"],
     "tendencia": "subiendo", "riesgo_inversor": 2.5, "score_relevancia": 0.95},
    # Reino Unido
    {"id": "emp_GBR", "pais": "Reino Unido", "iso3": "GBR", "lat": 51.5, "lon": -0.1,
     "stock_mill_eur": 72000, "cuota_pct": 14.0,
     "sectores": ["banca", "energia", "infraestructuras", "retail"],
     "empresas": ["Santander UK", "Iberdrola (ScottishPower)", "Ferrovial (Heathrow 25%)",
                  "IAG/British Airways", "Inditex"],
     "tendencia": "estable", "riesgo_inversor": 3.5, "score_relevancia": 0.92},
    # México
    {"id": "emp_MEX", "pais": "México", "iso3": "MEX", "lat": 19.4, "lon": -99.1,
     "stock_mill_eur": 68000, "cuota_pct": 13.2,
     "sectores": ["banca", "telecomunicaciones", "energia", "industria"],
     "empresas": ["BBVA México (mayor filial)", "Santander México", "Telefónica México",
                  "Iberdrola México", "OHL México", "Repsol", "Endesa"],
     "tendencia": "estable", "riesgo_inversor": 4.5, "score_relevancia": 0.90},
    # Brasil
    {"id": "emp_BRA", "pais": "Brasil", "iso3": "BRA", "lat": -15.8, "lon": -47.9,
     "stock_mill_eur": 61000, "cuota_pct": 11.9,
     "sectores": ["banca", "energia", "telecomunicaciones", "infraestructuras"],
     "empresas": ["Santander Brasil (~25% beneficio grupo)", "Telefónica Vivo",
                  "Iberdrola Brasil", "Naturgy Brasil", "ISS"],
     "tendencia": "subiendo", "riesgo_inversor": 4.0, "score_relevancia": 0.88},
    # Argentina
    {"id": "emp_ARG", "pais": "Argentina", "iso3": "ARG", "lat": -34.6, "lon": -58.4,
     "stock_mill_eur": 24000, "cuota_pct": 4.7,
     "sectores": ["banca", "telecomunicaciones", "energia", "agroalimentario"],
     "empresas": ["Santander Argentina", "Telefónica Argentina", "Repsol YPF (histórico)",
                  "Mapfre", "BBVA Argentina"],
     "tendencia": "inestable", "riesgo_inversor": 7.5, "score_relevancia": 0.80},
    # Colombia
    {"id": "emp_COL", "pais": "Colombia", "iso3": "COL", "lat": 4.7, "lon": -74.1,
     "stock_mill_eur": 18000, "cuota_pct": 3.5,
     "sectores": ["banca", "telecomunicaciones", "infraestructuras"],
     "empresas": ["Bancolombia (participación)", "Telefónica Colombia", "ISS"],
     "tendencia": "subiendo", "riesgo_inversor": 5.0, "score_relevancia": 0.72},
    # Chile
    {"id": "emp_CHL", "pais": "Chile", "iso3": "CHL", "lat": -33.5, "lon": -70.6,
     "stock_mill_eur": 16000, "cuota_pct": 3.1,
     "sectores": ["energia", "banca", "telecomunicaciones", "retail"],
     "empresas": ["Iberdrola Chile", "BBVA Chile", "Telefónica Chile (Movistar)",
                  "IAG/Latam airlines"],
     "tendencia": "estable", "riesgo_inversor": 3.5, "score_relevancia": 0.72},
    # Alemania
    {"id": "emp_DEU", "pais": "Alemania", "iso3": "DEU", "lat": 52.5, "lon": 13.4,
     "stock_mill_eur": 14000, "cuota_pct": 2.7,
     "sectores": ["infraestructuras", "energia", "industria"],
     "empresas": ["ACS/Hochtief (filial cotizada)", "Ferrovial", "Iberdrola"],
     "tendencia": "estable", "riesgo_inversor": 2.0, "score_relevancia": 0.75},
    # Portugal
    {"id": "emp_PRT", "pais": "Portugal", "iso3": "PRT", "lat": 38.7, "lon": -9.1,
     "stock_mill_eur": 12000, "cuota_pct": 2.3,
     "sectores": ["banca", "telecomunicaciones", "energia", "retail"],
     "empresas": ["Santander Totta", "Telefónica/NOS (participación)", "Inditex",
                  "EDP (participación Iberdrola)"],
     "tendencia": "estable", "riesgo_inversor": 2.5, "score_relevancia": 0.82},
    # Perú
    {"id": "emp_PER", "pais": "Perú", "iso3": "PER", "lat": -12.0, "lon": -77.0,
     "stock_mill_eur": 11000, "cuota_pct": 2.1,
     "sectores": ["banca", "mineria", "energia"],
     "empresas": ["BBVA Perú", "Santander Perú", "Repsol (refinería La Pampilla)"],
     "tendencia": "subiendo", "riesgo_inversor": 4.5, "score_relevancia": 0.68},
    # Marruecos
    {"id": "emp_MAR", "pais": "Marruecos", "iso3": "MAR", "lat": 33.9, "lon": -6.9,
     "stock_mill_eur": 9500, "cuota_pct": 1.8,
     "sectores": ["banca", "telecomunicaciones", "infraestructuras", "energia"],
     "empresas": ["BMCE/CIH (participación Santander)", "Iberdrola (renovables)",
                  "OHL", "Mapfre Marruecos", "Indra"],
     "tendencia": "subiendo", "riesgo_inversor": 4.0, "score_relevancia": 0.80},
    # Australia
    {"id": "emp_AUS", "pais": "Australia", "iso3": "AUS", "lat": -35.3, "lon": 149.1,
     "stock_mill_eur": 8500, "cuota_pct": 1.7,
     "sectores": ["infraestructuras", "energia"],
     "empresas": ["Ferrovial (WestConnex, Sydney)", "Iberdrola Australia"],
     "tendencia": "subiendo", "riesgo_inversor": 2.0, "score_relevancia": 0.68},
    # Italia
    {"id": "emp_ITA", "pais": "Italia", "iso3": "ITA", "lat": 41.9, "lon": 12.5,
     "stock_mill_eur": 7200, "cuota_pct": 1.4,
     "sectores": ["banca", "energia", "retail"],
     "empresas": ["Santander Consumer Italy", "Inditex", "Iberdrola"],
     "tendencia": "estable", "riesgo_inversor": 3.0, "score_relevancia": 0.65},
    # Turquía
    {"id": "emp_TUR", "pais": "Turquía", "iso3": "TUR", "lat": 38.9, "lon": 35.2,
     "stock_mill_eur": 6000, "cuota_pct": 1.2,
     "sectores": ["retail", "energia", "infraestructuras"],
     "empresas": ["Inditex", "Mapfre", "Santander Consumer"],
     "tendencia": "inestable", "riesgo_inversor": 6.5, "score_relevancia": 0.62},
    # India
    {"id": "emp_IND", "pais": "India", "iso3": "IND", "lat": 28.6, "lon": 77.2,
     "stock_mill_eur": 5500, "cuota_pct": 1.1,
     "sectores": ["telecomunicaciones", "energia"],
     "empresas": ["Telefónica (stake Reliance Jio)", "Iberdrola renewables"],
     "tendencia": "subiendo", "riesgo_inversor": 4.0, "score_relevancia": 0.65},
    # Venezuela
    {"id": "emp_VEN", "pais": "Venezuela", "iso3": "VEN", "lat": 10.5, "lon": -66.9,
     "stock_mill_eur": 4200, "cuota_pct": 0.8,
     "sectores": ["telecomunicaciones", "banca"],
     "empresas": ["Telefónica Venezuela (Movistar)", "BBVA Provincial (expropiado parcial)"],
     "tendencia": "bajando", "riesgo_inversor": 9.5, "score_relevancia": 0.78,
     "comentario": "Riesgo máximo — régimen Maduro, expropiaciones previas"},
    # Arabia Saudí
    {"id": "emp_SAU", "pais": "Arabia Saudí", "iso3": "SAU", "lat": 23.9, "lon": 45.1,
     "stock_mill_eur": 3800, "cuota_pct": 0.7,
     "sectores": ["infraestructuras", "ingenieria", "defensa"],
     "empresas": ["OHL", "Técnicas Reunidas", "Indra", "Navantia"],
     "tendencia": "subiendo", "riesgo_inversor": 4.5, "score_relevancia": 0.72},
    # Canadá
    {"id": "emp_CAN", "pais": "Canadá", "iso3": "CAN", "lat": 45.4, "lon": -75.7,
     "stock_mill_eur": 3500, "cuota_pct": 0.7,
     "sectores": ["infraestructuras", "energia"],
     "empresas": ["Ferrovial (407 ETR autopista Toronto)", "ACS"],
     "tendencia": "subiendo", "riesgo_inversor": 2.0, "score_relevancia": 0.60},
]


def get_inversiones_por_pais(
    min_stock: float = 0,
    sort_by: str = "stock_mill_eur",
) -> list[dict[str, Any]]:
    """
    sort_by: 'stock_mill_eur' | 'score_relevancia' | 'riesgo_inversor'
    """
    data = [d for d in SEED_EMPRESAS if d.get("stock_mill_eur", 0) >= min_stock]
    reverse = sort_by != "riesgo_inversor"  # riesgo ordena ascendente
    data.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
    return data


def get_paises_riesgo_alto(riesgo_min: float = 7.0) -> list[dict[str, Any]]:
    """Países con alta exposición empresarial española Y alto riesgo inversor."""
    return [
        d for d in SEED_EMPRESAS
        if d.get("riesgo_inversor", 0) >= riesgo_min
        and d.get("stock_mill_eur", 0) > 5000
    ]


def to_presencia_format(entry: dict) -> dict:
    """Convierte a formato unificado espana_mundo."""
    return {
        "id": entry["id"],
        "pais_nombre": entry["pais"],
        "iso3": entry["iso3"],
        "categoria": "empresarial",
        "subcategoria": "inversion_directa",
        "titulo": f"{entry['pais']} — {entry['stock_mill_eur']:,.0f} M EUR inversión española",
        "actor_espanol": " / ".join(entry.get("empresas", [])[:3]),
        "descripcion": (
            f"Stock inversión directa española: {entry['stock_mill_eur']:,.0f} M EUR "
            f"({entry.get('cuota_pct', 0):.1f}% del total exterior). "
            f"Sectores: {', '.join(entry.get('sectores', []))}. "
            f"Empresas: {', '.join(entry.get('empresas', [])[:4])}. "
            f"Tendencia: {entry.get('tendencia', 'estable')}. "
            f"{entry.get('comentario', '')}"
        ).strip(),
        "valor": entry["stock_mill_eur"],
        "unidad": "millones_EUR",
        "score_relevancia": entry.get("score_relevancia", 0.6),
        "lat": entry["lat"],
        "lon": entry["lon"],
        "riesgo_inversor": entry.get("riesgo_inversor", 3.0),
        "fuente_url": "https://www.icex.es/es/estadisticas",
        "updated_at": "2026-01-14T00:00:00Z",
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    total_stock = sum(d["stock_mill_eur"] for d in SEED_EMPRESAS)
    print(f"Stock total inversión española exterior: {total_stock:,.0f} M EUR")
    print(f"Paises registrados: {len(SEED_EMPRESAS)}")
    print("\nTop 8 destinos:")
    for d in get_inversiones_por_pais()[:8]:
        print(f"  {d['pais']:25s} {d['stock_mill_eur']:8,.0f} M EUR  riesgo={d['riesgo_inversor']:.1f}")
    print("\nPaises de riesgo alto con exposicion relevante:")
    for d in get_paises_riesgo_alto():
        print(f"  {d['pais']:25s} riesgo={d['riesgo_inversor']:.1f}  {d.get('comentario','')[:60]}")
