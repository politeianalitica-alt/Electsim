"""Brain tools sector Infraestructuras · Sprint 10 · S10.5.

> **Sprint 10 · S10.5** (`docs/ROADMAP_GITS_AMIGOS.md §10 Sprint 10 · Infraestructuras`)

Expone al Brain:
  - TED aggregator · top constructoras, ranking países, serie CPV
  - PLACE · licitaciones ADIF/AENA/Puertos
  - MITMS open data · catálogo datasets transporte
  - infra_projects · tracker proyectos críticos

Tools:
  - ted_top_constructoras(country, sector, date_from, date_to)
  - ted_ranking_pais_infra(sector, date_from, date_to)
  - ted_serie_cpv(cpv_code, country, date_from, date_to)
  - place_licitaciones(organismo, limit)
  - mitms_datasets(query, limit)
  - infra_project(slug)
  - list_infra_projects(kind, status, owner, region)
  - infra_projects_delayed(min_delay_months)
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# TED aggregator
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("ted_top_constructoras")
def ted_top_constructoras(
    country: str = "ESP",
    sector: str = "infraestructuras",
    date_from: str | None = None,
    date_to: str | None = None,
    top_n: int = 20,
) -> dict[str, Any]:
    """Ranking constructoras adjudicatarias en TED por importe.

    Args:
      country: ISO alpha-3 (ESP, FRA, DEU, ITA…).
      sector: clave en CPV_BY_SECTOR (default 'infraestructuras').
      date_from / date_to: 'YYYY-MM-DD'.
      top_n: tamaño ranking.
    """
    try:
        from etl.sources.eu.ted_aggregator import top_adjudicatarios
        return top_adjudicatarios(
            country=country,
            sector=sector,
            date_from=date_from,
            date_to=date_to,
            top_n=top_n,
        )
    except Exception as exc:
        return {"n_notices": 0, "valor_total": 0.0, "top": [], "error": str(exc)}


@ToolRegistry.register("ted_ranking_pais_infra")
def ted_ranking_pais_infra(
    sector: str = "infraestructuras",
    date_from: str | None = None,
    date_to: str | None = None,
    top_n: int = 15,
) -> dict[str, Any]:
    """Ranking spend de licitaciones de obra civil por país UE."""
    try:
        from etl.sources.eu.ted_aggregator import ranking_por_pais
        return ranking_por_pais(
            sector=sector,
            date_from=date_from,
            date_to=date_to,
            top_n=top_n,
        )
    except Exception as exc:
        return {"top": [], "error": str(exc)}


@ToolRegistry.register("ted_serie_cpv")
def ted_serie_cpv(
    cpv_code: str,
    country: str = "ESP",
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    """Serie temporal mensual del valor licitado para un CPV.

    CPV comunes infraestructura:
      - '45000000' · Obras de construcción
      - '71000000' · Servicios de arquitectura/ingeniería
      - '45234100' · Obra ferroviaria
      - '45230000' · Carreteras
      - '34920000' · Material rodante
    """
    try:
        from etl.sources.eu.ted_aggregator import serie_temporal_cpv
        return serie_temporal_cpv(
            cpv_code,
            country=country,
            date_from=date_from,
            date_to=date_to,
        )
    except Exception as exc:
        return {"cpv": cpv_code, "series": {}, "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# PLACE
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("place_licitaciones")
def place_licitaciones(
    organismo: str | None = None,
    limit: int = 30,
) -> dict[str, Any]:
    """Últimas licitaciones publicadas en PLACE.

    Args:
      organismo: clave de INFRA_ORGS · 'adif', 'aena', 'puertos', 'renfe',
        'enaire', 'carreteras', 'mitms'. None = todas.
      limit: máximo items.
    """
    try:
        from etl.sources.spain.place import get_place_client, INFRA_ORGS
        if organismo and organismo.lower() not in INFRA_ORGS:
            return {
                "n_items": 0, "items": [],
                "error": f"organismo '{organismo}' no en {list(INFRA_ORGS)}",
            }
        client = get_place_client()
        items = client.fetch_licitaciones()
        if organismo:
            items = client.filter_by_organismo(items, organismo)
        items = items[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {
            "organismo": organismo,
            "n_items": len(items),
            "items": items,
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# MITMS open data
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("mitms_datasets")
def mitms_datasets(query: str | None = None, limit: int = 25) -> dict[str, Any]:
    """Datasets abiertos publicados por MITMS en datos.gob.es."""
    try:
        from etl.sources.spain.mitms_data import get_mitms_client
        client = get_mitms_client()
        return client.list_datasets(query=query, page_size=limit)
    except Exception as exc:
        return {"n_results": 0, "datasets": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# infra_projects · tracker
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("infra_project")
def infra_project(slug: str) -> dict[str, Any]:
    """Detalle de un proyecto de infraestructura.

    Slugs en seed: ave_galicia, y_vasca, corredor_mediterraneo,
    ave_murcia_almeria, ave_madrid_extremadura, ave_cantabria,
    ampliacion_barajas_t1, ampliacion_prat_t2, amp_puerto_valencia_norte,
    algeciras_zona_franca, cierre_m50, interconexion_biscay.
    """
    try:
        from etl.sources.infra import get_project
        row = get_project(slug)
        if row is None:
            return {"error": f"Proyecto '{slug}' no encontrado", "slug": slug}
        for k in ("start_date", "planned_end_date", "original_end_date"):
            v = row.get(k)
            if v is not None and hasattr(v, "isoformat"):
                row[k] = v.isoformat()
        # Sobrecoste calculado
        bi = row.get("budget_initial_eur")
        bc = row.get("budget_current_eur")
        row["sobrecoste_pct"] = (
            round((bc - bi) / bi * 100, 1) if bi and bc and bi > 0 else None
        )
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("list_infra_projects")
def list_infra_projects(
    kind: str | None = None,
    status: str | None = None,
    owner: str | None = None,
    region: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Lista proyectos de infraestructura con filtros.

    Args:
      kind: 'ferroviario_av', 'ferroviario', 'aeropuerto', 'puerto',
            'carretera', 'energia', 'agua', 'telecom'.
      status: 'estudio_informativo', 'licitado', 'en_obras', 'parado',
              'completado', 'cancelado'.
      owner: ILIKE match en owner_organism.
      region: ILIKE match en region.
    """
    try:
        from etl.sources.infra import list_projects
        rows = list_projects(
            kind=kind, status=status, owner=owner, region=region, limit=limit,
        )
        for r in rows:
            v = r.get("planned_end_date")
            if v is not None and hasattr(v, "isoformat"):
                r["planned_end_date"] = v.isoformat()
        return {
            "n_items": len(rows),
            "items": rows,
            "filters": {"kind": kind, "status": status, "owner": owner, "region": region},
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("infra_projects_delayed")
def infra_projects_delayed(min_delay_months: int = 12) -> dict[str, Any]:
    """Proyectos con retraso ≥ N meses (panel alertas)."""
    try:
        from etl.sources.infra import delayed_projects
        rows = delayed_projects(min_delay_months=min_delay_months)
        for r in rows:
            for k in ("planned_end_date", "original_end_date"):
                v = r.get(k)
                if v is not None and hasattr(v, "isoformat"):
                    r[k] = v.isoformat()
        return {
            "min_delay_months": min_delay_months,
            "n_items": len(rows),
            "items": rows,
            "error": None,
        }
    except Exception as exc:
        return {
            "min_delay_months": min_delay_months,
            "n_items": 0, "items": [], "error": str(exc),
        }


__all__ = [
    "ted_top_constructoras",
    "ted_ranking_pais_infra",
    "ted_serie_cpv",
    "place_licitaciones",
    "mitms_datasets",
    "infra_project",
    "list_infra_projects",
    "infra_projects_delayed",
]
