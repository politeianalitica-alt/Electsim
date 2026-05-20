"""Brain tools Tercer Sector · Sprint 9 · S9.5.

> **Sprint 9 · S9.5** (`docs/ROADMAP_GITS_AMIGOS.md §9 Sprint 9 · Tercer Sector`)

Expone al Brain:
  - BDNS deep · agregaciones de subvenciones públicas españolas
  - EU Funding & Tenders Portal · calls Horizon/Erasmus/CERV...
  - EIB · proyectos banca desarrollo
  - social_orgs · catálogo ONGs ES

Tools:
  - bdns_top_beneficiarios(fecha_desde, fecha_hasta, top_n)
  - bdns_concesiones_beneficiario(nif_o_nombre)
  - bdns_resumen_organo(nif_organo)
  - eu_funds_calls(query, programme, limit)
  - eib_proyectos(country, limit)
  - social_org(slug)
  - social_org_by_nif(nif)
  - list_social_orgs(sector, irpf_07_only)
  - social_org_funding(slug)         · cruza social_org × BDNS

Falla cerrado: excepciones → {"error": str, ...vacío}.
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# BDNS · agregaciones
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("bdns_top_beneficiarios")
def bdns_top_beneficiarios(
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    importe_minimo: float | None = None,
    max_pages: int = 3,
    top_n: int = 20,
) -> dict[str, Any]:
    """Top beneficiarios de subvenciones públicas BDNS en ventana temporal.

    Args:
      fecha_desde / fecha_hasta: 'YYYY-MM-DD'.
      importe_minimo: filtra concesiones < umbral.
      max_pages: páginas BDNS a leer (50 items/página).
      top_n: tamaño ranking.
    """
    try:
        from etl.sources.spain.bdns_aggregator import top_beneficiarios
        return top_beneficiarios(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            importe_minimo=importe_minimo,
            max_pages=max_pages,
            top_n=top_n,
        )
    except Exception as exc:
        return {"n_concesiones": 0, "importe_total": 0.0, "top": [], "error": str(exc)}


@ToolRegistry.register("bdns_concesiones_beneficiario")
def bdns_concesiones_beneficiario(
    nif_o_nombre: str,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    max_pages: int = 5,
) -> dict[str, Any]:
    """Histórico de subvenciones BDNS recibidas por un beneficiario.

    Devuelve serie temporal (por año) + listado detallado.
    """
    try:
        from etl.sources.spain.bdns_aggregator import concesiones_por_nif
        return concesiones_por_nif(
            nif_o_nombre,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            max_pages=max_pages,
        )
    except Exception as exc:
        return {"beneficiario": nif_o_nombre, "concesiones": [], "error": str(exc)}


@ToolRegistry.register("bdns_resumen_organo")
def bdns_resumen_organo(
    nif_organo: str,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    max_pages: int = 5,
) -> dict[str, Any]:
    """Resumen de convocatorias publicadas por un organismo (Ministerio, CCAA, etc.)."""
    try:
        from etl.sources.spain.bdns_aggregator import resumen_por_organo
        return resumen_por_organo(
            nif_organo,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            max_pages=max_pages,
        )
    except Exception as exc:
        return {"organo": nif_organo, "convocatorias": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# EU Funding & Tenders
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("eu_funds_calls")
def eu_funds_calls(
    query: str | None = None,
    programme: str | None = None,
    limit: int = 25,
) -> dict[str, Any]:
    """Convocatorias abiertas en el EU Funding & Tenders Portal.

    Args:
      query: texto libre.
      programme: 'HORIZON', 'ERASMUS', 'CERV', 'LIFE', 'CEF', 'DIGITAL'.
      limit: máx resultados.
    """
    try:
        from etl.sources.eu.eu_funding import get_eu_funding_client
        client = get_eu_funding_client()
        return client.search_calls(query=query, programme=programme, page_size=limit)
    except Exception as exc:
        return {"n_results": 0, "calls": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# EIB · banca desarrollo
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("eib_proyectos")
def eib_proyectos(country: str | None = None, limit: int = 25) -> dict[str, Any]:
    """Últimos proyectos publicados por el Banco Europeo de Inversiones.

    Args:
      country: filtra por país (substring match en título/descripción).
      limit: máximo items.
    """
    try:
        from etl.sources.eu.eib import get_eib_client
        client = get_eib_client()
        items = client.fetch_projects()
        if country:
            items = client.filter_by_country(items, country)
        items = items[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {
            "country": country,
            "n_items": len(items),
            "items": items,
            "error": None,
        }
    except Exception as exc:
        return {"country": country, "n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# social_orgs · catálogo
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("social_org")
def social_org(slug: str) -> dict[str, Any]:
    """Detalle de una organización tercer sector por slug.

    Slugs en seed: caritas_es, cruz_roja_es, save_the_children_es, unicef_es,
    msf_es, oxfam_intermon, manos_unidas, accion_contra_hambre, wwf_es,
    greenpeace_es, feaps_plena_inclusion, cocemfe, fundacion_la_caixa,
    fundacion_anesvad, feder_enfermedades_raras.
    """
    try:
        from etl.sources.social import get_org
        row = get_org(slug)
        if row is None:
            return {"error": f"Organización '{slug}' no encontrada", "slug": slug}
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("social_org_by_nif")
def social_org_by_nif(nif: str) -> dict[str, Any]:
    """Búsqueda de organización tercer sector por NIF."""
    try:
        from etl.sources.social import get_org_by_nif
        row = get_org_by_nif(nif)
        if row is None:
            return {"error": f"NIF '{nif}' no encontrado en social_orgs", "nif": nif}
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "nif": nif}


@ToolRegistry.register("list_social_orgs")
def list_social_orgs(
    sector: str | None = None,
    legal_form: str | None = None,
    irpf_07_only: bool = False,
    limit: int = 50,
) -> dict[str, Any]:
    """Lista organizaciones tercer sector con filtros.

    Args:
      sector: 'social', 'medioambiente', 'cooperacion', 'salud', 'educacion'.
      legal_form: 'ngo', 'fundacion', 'cooperativa', 'asociacion', 'empresa_insercion'.
      irpf_07_only: True → solo beneficiarias del 0,7 % IRPF.
      limit: máximo a devolver.
    """
    try:
        from etl.sources.social import list_orgs
        rows = list_orgs(
            sector=sector, legal_form=legal_form,
            irpf_07_only=irpf_07_only, limit=limit,
        )
        return {
            "n_items": len(rows),
            "items": rows,
            "filters": {
                "sector": sector, "legal_form": legal_form,
                "irpf_07_only": irpf_07_only,
            },
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# Cruce social_org × BDNS
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("social_org_funding")
def social_org_funding(
    slug: str,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    max_pages: int = 5,
) -> dict[str, Any]:
    """Historial de financiación pública (BDNS) de una organización tercer sector.

    Cruza social_orgs por slug → obtiene NIF → busca en BDNS sus concesiones.
    Útil para evaluar dependencia de fondos públicos de cada ONG.

    Returns:
      {"slug": str, "name": str, "nif": str, ...resultado BDNS}
    """
    try:
        from etl.sources.social import get_org
        from etl.sources.spain.bdns_aggregator import concesiones_por_nif

        org = get_org(slug)
        if org is None:
            return {"error": f"Org '{slug}' no encontrada", "slug": slug}
        nif = org.get("nif")
        if not nif:
            return {
                "slug": slug, "name": org.get("name"), "nif": None,
                "error": "Organización sin NIF · no se puede cruzar con BDNS",
            }
        bdns = concesiones_por_nif(
            nif,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            max_pages=max_pages,
        )
        return {
            "slug": slug,
            "name": org.get("name"),
            "nif": nif,
            "annual_budget_eur": org.get("annual_budget_eur"),
            "irpf_07": org.get("irpf_07"),
            **bdns,
        }
    except Exception as exc:
        return {"slug": slug, "error": str(exc)}


__all__ = [
    "bdns_top_beneficiarios",
    "bdns_concesiones_beneficiario",
    "bdns_resumen_organo",
    "eu_funds_calls",
    "eib_proyectos",
    "social_org",
    "social_org_by_nif",
    "list_social_orgs",
    "social_org_funding",
]
