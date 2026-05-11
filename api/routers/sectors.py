"""
Router /api/sectors — datos sectoriales (10 sectores económicos).

Cubre las 10 páginas huérfanas del frontend visual-oscar:
  /sector-agro, /sector-banca, /sector-defensa, /sector-energia,
  /sector-farma, /sector-infraestructuras, /sector-telecom,
  /sector-turismo, /sector-vivienda, /sector

Endpoints:
  GET /api/sectors                       → catálogo de sectores
  GET /api/sectors/{sector_id}/kpis      → KPIs del sector (PIB, empleo, exportaciones)
  GET /api/sectors/{sector_id}/risk      → riesgo sectorial agregado
  GET /api/sectors/{sector_id}/news      → noticias del sector (últimos 7 días)
  GET /api/sectors/{sector_id}/regulation → normativa relevante (BOE + UE)
  GET /api/sectors/{sector_id}/overview  → dashboard consolidado
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sectors", tags=["sectors"])


# Catálogo de sectores con CNAE de referencia y palabras-clave para búsqueda
SECTORS_CATALOG: dict[str, dict[str, Any]] = {
    "agro": {
        "id": "agro",
        "name": "Agroalimentario y pesca",
        "cnae": ["A01", "A03", "C10", "C11", "C12"],
        "keywords": ["agricultura", "ganadería", "pesca", "aceite de oliva", "vino", "PAC", "FEAGA"],
        "ministry": "Agricultura, Pesca y Alimentación",
        "color": "#16A34A",
        "icon": "🌾",
        "page_route": "/sector-agro",
    },
    "banca": {
        "id": "banca",
        "name": "Banca y servicios financieros",
        "cnae": ["K64", "K65", "K66"],
        "keywords": ["banco", "banca", "fintech", "CNMV", "BdE", "fondos de inversión"],
        "ministry": "Economía, Comercio y Empresa",
        "color": "#1F4E8C",
        "icon": "🏦",
        "page_route": "/sector-banca",
    },
    "defensa": {
        "id": "defensa",
        "name": "Defensa y seguridad",
        "cnae": ["C30.4", "O84"],
        "keywords": ["defensa", "OTAN", "Indra", "Navantia", "Airbus Defence", "Programa F-35", "Eurofighter"],
        "ministry": "Defensa",
        "color": "#525258",
        "icon": "🛡️",
        "page_route": "/sector-defensa",
    },
    "energia": {
        "id": "energia",
        "name": "Energía y transición ecológica",
        "cnae": ["B05", "B06", "B07", "B08", "B09", "D35"],
        "keywords": ["renovables", "hidrógeno verde", "Iberdrola", "Endesa", "Repsol", "CNMC", "Red Eléctrica"],
        "ministry": "Transición Ecológica y Reto Demográfico",
        "color": "#F97316",
        "icon": "⚡",
        "page_route": "/sector-energia",
    },
    "farma": {
        "id": "farma",
        "name": "Farmacéutico y salud",
        "cnae": ["C21", "Q86"],
        "keywords": ["farmacéutico", "AEMPS", "ensayo clínico", "Almirall", "Grifols", "Rovi"],
        "ministry": "Sanidad",
        "color": "#9333EA",
        "icon": "💊",
        "page_route": "/sector-farma",
    },
    "infraestructuras": {
        "id": "infraestructuras",
        "name": "Infraestructuras y transporte",
        "cnae": ["F41", "F42", "F43", "H49", "H52"],
        "keywords": ["ACS", "Ferrovial", "Acciona", "Adif", "AVE", "Aena", "concesiones"],
        "ministry": "Transportes y Movilidad Sostenible",
        "color": "#0E7490",
        "icon": "🛣️",
        "page_route": "/sector-infraestructuras",
    },
    "telecom": {
        "id": "telecom",
        "name": "Telecomunicaciones y tecnología",
        "cnae": ["J58", "J61", "J62", "J63"],
        "keywords": ["Telefónica", "Vodafone", "Orange", "MásMóvil", "5G", "fibra", "AI Act"],
        "ministry": "Transformación Digital y Función Pública",
        "color": "#5B21B6",
        "icon": "📡",
        "page_route": "/sector-telecom",
    },
    "turismo": {
        "id": "turismo",
        "name": "Turismo y hostelería",
        "cnae": ["I55", "I56", "N79"],
        "keywords": ["turismo", "Meliá", "NH", "Iberostar", "Airbnb", "fondos PRTR turismo"],
        "ministry": "Industria y Turismo",
        "color": "#EAB308",
        "icon": "🏖️",
        "page_route": "/sector-turismo",
    },
    "vivienda": {
        "id": "vivienda",
        "name": "Vivienda e inmobiliario",
        "cnae": ["F41.2", "L68", "F43"],
        "keywords": ["vivienda", "ASPRIMA", "Sareb", "zona tensionada", "vivienda asequible", "VPO"],
        "ministry": "Vivienda y Agenda Urbana",
        "color": "#B45309",
        "icon": "🏘️",
        "page_route": "/sector-vivienda",
    },
}


def _safe_call(fn, *args, **kwargs):
    try:
        result = fn(*args, **kwargs)
        if hasattr(result, "to_dict"):
            return result.to_dict(orient="records")
        return result
    except Exception as e:
        logger.warning("sectors._safe_call(%s) failed: %s", fn.__name__, e)
        return None


@router.get("")
def list_sectors():
    """Catálogo completo de los 10 sectores."""
    return {"items": list(SECTORS_CATALOG.values()), "total": len(SECTORS_CATALOG)}


@router.get("/{sector_id}/info")
def sector_info(sector_id: str):
    """Información estática del sector (CNAE, ministerio, keywords)."""
    if sector_id not in SECTORS_CATALOG:
        raise HTTPException(404, "sector_not_found")
    return SECTORS_CATALOG[sector_id]


@router.get("/{sector_id}/kpis")
def sector_kpis(sector_id: str):
    """KPIs económicos del sector: PIB, empleo, índice, exportaciones."""
    if sector_id not in SECTORS_CATALOG:
        raise HTTPException(404, "sector_not_found")
    sector = SECTORS_CATALOG[sector_id]

    try:
        from dashboard.services.economy_core import cargar_sectorial_risk
        risk_data = _safe_call(cargar_sectorial_risk)
        if risk_data is None:
            risk_data = []
        # Filtrar por sector (related_sectors puede contener el sector_id o el name)
        match_names = {sector_id, sector["name"]}
        sector_rows = [
            r for r in risk_data
            if isinstance(r, dict) and (r.get("sector") in match_names or r.get("sector_id") == sector_id)
        ]
        return {
            "sector": sector,
            "kpis": sector_rows,
            "n_signals": sum(int(r.get("n_señales", 0) or 0) for r in sector_rows),
            "avg_confidence": (
                sum(float(r.get("avg_confidence", 0) or 0) for r in sector_rows) / len(sector_rows)
                if sector_rows else None
            ),
        }
    except ImportError:
        return {"sector": sector, "kpis": [], "warning": "economy_core_not_importable"}


@router.get("/{sector_id}/risk")
def sector_risk(sector_id: str):
    """Riesgo sectorial agregado (count señales, severidad media)."""
    if sector_id not in SECTORS_CATALOG:
        raise HTTPException(404, "sector_not_found")
    sector = SECTORS_CATALOG[sector_id]
    try:
        from dashboard.services.economy_core import cargar_sectorial_risk
        rows = _safe_call(cargar_sectorial_risk) or []
        match = {sector_id, sector["name"]}
        sector_rows = [
            r for r in rows
            if isinstance(r, dict) and (r.get("sector") in match)
        ]
        return {
            "sector_id": sector_id,
            "items": sector_rows,
            "score": (
                sum(float(r.get("max_severity", 0) or 0) for r in sector_rows) / len(sector_rows) * 20
                if sector_rows else None
            ),
        }
    except ImportError:
        return {"sector_id": sector_id, "items": [], "warning": "economy_core_not_importable"}


@router.get("/{sector_id}/news")
def sector_news(sector_id: str, days: int = Query(7, le=90), limit: int = Query(20, le=200)):
    """Noticias relevantes para el sector (últimos N días). Filtra por keywords."""
    if sector_id not in SECTORS_CATALOG:
        raise HTTPException(404, "sector_not_found")
    sector = SECTORS_CATALOG[sector_id]
    keywords = [k.lower() for k in sector["keywords"]]

    try:
        from etl.sources.rss_noticias import buscar_noticias_recientes
        all_news = _safe_call(buscar_noticias_recientes, days=days, limit=200) or []
        matched = []
        for item in all_news:
            if not isinstance(item, dict):
                continue
            text = " ".join(str(item.get(k, "")) for k in ("title", "summary", "tags")).lower()
            if any(kw in text for kw in keywords):
                matched.append(item)
            if len(matched) >= limit:
                break
        return {"sector_id": sector_id, "items": matched, "total": len(matched), "days": days}
    except ImportError:
        return {"sector_id": sector_id, "items": [], "warning": "rss_noticias_not_importable"}


@router.get("/{sector_id}/regulation")
def sector_regulation(sector_id: str, days: int = Query(30, le=180)):
    """Normativa BOE relevante para el sector."""
    if sector_id not in SECTORS_CATALOG:
        raise HTTPException(404, "sector_not_found")
    sector = SECTORS_CATALOG[sector_id]
    keywords = [k.lower() for k in sector["keywords"]]

    try:
        from dashboard.services.legislative_core import cargar_boe_reciente
        rows = _safe_call(cargar_boe_reciente, days=days, limit=200) or []
        matched = []
        for item in rows:
            if not isinstance(item, dict):
                continue
            text = " ".join(str(item.get(k, "")) for k in ("titulo", "resumen", "tipo")).lower()
            if any(kw in text for kw in keywords):
                matched.append(item)
        return {"sector_id": sector_id, "items": matched, "total": len(matched), "days": days}
    except ImportError:
        return {"sector_id": sector_id, "items": [], "warning": "legislative_core_not_importable"}


@router.get("/{sector_id}/overview")
def sector_overview(sector_id: str):
    """Dashboard consolidado del sector — agrega kpis, risk, news, regulation."""
    if sector_id not in SECTORS_CATALOG:
        raise HTTPException(404, "sector_not_found")
    return {
        "sector": SECTORS_CATALOG[sector_id],
        "kpis": sector_kpis(sector_id).get("kpis", []),
        "risk": sector_risk(sector_id),
        "news": sector_news(sector_id, days=7, limit=10).get("items", []),
        "regulation": sector_regulation(sector_id, days=30).get("items", []),
    }
