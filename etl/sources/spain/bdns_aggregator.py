"""BDNS aggregator · capa analítica · Sprint 9 · S9.1.

> **Sprint 9 · S9.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 9 · Tercer Sector`)

El cliente BDNS (Sprint 3 · S3.1) ofrece búsquedas planas. Esta capa
añade agregaciones útiles para el Tercer Sector y compliance:

  - top_beneficiarios(fecha_desde) · ranking por importe total recibido
  - concesiones_por_nif(nif) · histórico completo de un beneficiario
  - resumen_por_organo(nif_organo) · subvenciones convocadas por un ministerio/CCAA
  - serie_temporal(beneficiario) · evolución importes año a año

Todo en memoria a partir de páginas BDNS (sin BD propia). Si el cliente
HTTP no está disponible, devuelve `{"error": ..., "items": []}` sin romper.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)


def _parse_fecha(value: Any) -> date | None:
    """Acepta date, datetime o 'YYYY-MM-DD' / 'DD/MM/YYYY'."""
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    s = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s[: len(fmt) - (2 if "%" in fmt else 0) or len(s)], fmt).date()
        except Exception:
            continue
    return None


def _importe(raw: dict[str, Any]) -> float:
    for k in ("importe", "importeConcedido", "importeTotal", "importe_concedido"):
        v = raw.get(k)
        if v is None:
            continue
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return 0.0


def _beneficiario(raw: dict[str, Any]) -> dict[str, str]:
    nif = (
        raw.get("nifBeneficiario")
        or raw.get("beneficiarioNif")
        or raw.get("nif")
        or ""
    )
    nombre = (
        raw.get("razonSocial")
        or raw.get("nombreBeneficiario")
        or raw.get("beneficiario")
        or ""
    )
    return {"nif": str(nif).strip(), "nombre": str(nombre).strip()}


# ────────────────────────────────────────────────────────────────────
# Top beneficiarios
# ────────────────────────────────────────────────────────────────────

def top_beneficiarios(
    *,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    importe_minimo: float | None = None,
    max_pages: int = 5,
    top_n: int = 20,
) -> dict[str, Any]:
    """Ranking de beneficiarios BDNS por importe total recibido.

    Args:
      fecha_desde / fecha_hasta: ventana de resoluciones.
      importe_minimo: filtra concesiones pequeñas para velocidad.
      max_pages: páginas BDNS a leer (50 items/página).
      top_n: tamaño del ranking devuelto.

    Returns:
      {
        "n_concesiones": int,
        "importe_total": float,
        "top": [{nif, nombre, total, n_concesiones}],
        "error": str | None
      }
    """
    try:
        from etl.sources.spain.bdns import get_bdns_client
    except Exception as exc:
        return {
            "n_concesiones": 0, "importe_total": 0.0, "top": [],
            "error": f"BDNS client no disponible: {exc}",
        }

    client = get_bdns_client()
    if getattr(client, "_session", None) is None:
        return {
            "n_concesiones": 0, "importe_total": 0.0, "top": [],
            "error": "BDNS · requests no disponible",
        }

    aggregator: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"nif": "", "nombre": "", "total": 0.0, "n_concesiones": 0}
    )
    n_total = 0
    importe_total = 0.0

    for page in range(max_pages):
        rows = client.search_concesiones(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            importe_desde=importe_minimo,
            page=page,
            page_size=50,
        )
        if not rows:
            break
        for raw in rows:
            ben = _beneficiario(raw)
            key = ben["nif"] or ben["nombre"] or "?"
            imp = _importe(raw)
            agg = aggregator[key]
            agg["nif"] = ben["nif"] or agg["nif"]
            agg["nombre"] = ben["nombre"] or agg["nombre"]
            agg["total"] += imp
            agg["n_concesiones"] += 1
            n_total += 1
            importe_total += imp

    top = sorted(aggregator.values(), key=lambda x: x["total"], reverse=True)[:top_n]
    return {
        "n_concesiones": n_total,
        "importe_total": round(importe_total, 2),
        "top": [{**r, "total": round(r["total"], 2)} for r in top],
        "error": None,
    }


# ────────────────────────────────────────────────────────────────────
# Concesiones por beneficiario
# ────────────────────────────────────────────────────────────────────

def concesiones_por_nif(
    nif_o_nombre: str,
    *,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    max_pages: int = 5,
) -> dict[str, Any]:
    """Histórico de concesiones de un beneficiario.

    BDNS hace `contains` sobre razón social — se puede pasar NIF o
    nombre parcial.

    Returns:
      {
        "beneficiario": str,
        "n_concesiones": int,
        "importe_total": float,
        "concesiones": [{fecha, importe, organo, descripcion, ...}],
        "por_anio": {2023: 12345, ...},
      }
    """
    try:
        from etl.sources.spain.bdns import get_bdns_client
    except Exception as exc:
        return {"beneficiario": nif_o_nombre, "concesiones": [], "error": str(exc)}

    client = get_bdns_client()
    if getattr(client, "_session", None) is None:
        return {
            "beneficiario": nif_o_nombre, "concesiones": [],
            "n_concesiones": 0, "importe_total": 0.0, "por_anio": {},
            "error": "BDNS · requests no disponible",
        }

    concesiones: list[dict[str, Any]] = []
    importe_total = 0.0
    por_anio: dict[int, float] = defaultdict(float)

    for page in range(max_pages):
        rows = client.search_concesiones(
            beneficiario=nif_o_nombre,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            page=page,
            page_size=50,
        )
        if not rows:
            break
        for raw in rows:
            imp = _importe(raw)
            fecha_raw = (
                raw.get("fechaConcesion")
                or raw.get("fechaResolucion")
                or raw.get("fecha")
            )
            fecha = _parse_fecha(fecha_raw)
            anio = fecha.year if fecha else 0
            ben = _beneficiario(raw)
            concesiones.append({
                "fecha": fecha.isoformat() if fecha else None,
                "nif": ben["nif"],
                "nombre": ben["nombre"],
                "importe": imp,
                "organo": raw.get("organo") or raw.get("organoConvocante"),
                "descripcion": (
                    raw.get("descripcion") or raw.get("titulo") or ""
                )[:300],
                "convocatoria": raw.get("numeroConvocatoria") or raw.get("numConv"),
            })
            importe_total += imp
            if anio:
                por_anio[anio] += imp

    return {
        "beneficiario": nif_o_nombre,
        "n_concesiones": len(concesiones),
        "importe_total": round(importe_total, 2),
        "concesiones": concesiones,
        "por_anio": {k: round(v, 2) for k, v in sorted(por_anio.items())},
        "error": None,
    }


# ────────────────────────────────────────────────────────────────────
# Resumen por órgano convocante
# ────────────────────────────────────────────────────────────────────

def resumen_por_organo(
    nif_organo: str,
    *,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    max_pages: int = 5,
) -> dict[str, Any]:
    """Resumen de convocatorias de un organismo (Ministerio, CCAA…)."""
    try:
        from etl.sources.spain.bdns import get_bdns_client
    except Exception as exc:
        return {"organo": nif_organo, "convocatorias": [], "error": str(exc)}

    client = get_bdns_client()
    if getattr(client, "_session", None) is None:
        return {
            "organo": nif_organo, "n_convocatorias": 0, "importe_total": 0.0,
            "convocatorias": [], "error": "BDNS · requests no disponible",
        }

    convocatorias: list[dict[str, Any]] = []
    importe_total = 0.0
    for page in range(max_pages):
        rows = client.search_convocatorias(
            organo=nif_organo,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            page=page,
            page_size=50,
        )
        if not rows:
            break
        for raw in rows:
            imp = _importe(raw)
            convocatorias.append({
                "num_conv": raw.get("numeroConvocatoria") or raw.get("numConv"),
                "titulo": (raw.get("descripcion") or raw.get("titulo") or "")[:200],
                "fecha": str(raw.get("fechaPublicacion") or raw.get("fecha") or "")[:10] or None,
                "importe": imp,
                "estado": raw.get("estado"),
            })
            importe_total += imp

    return {
        "organo": nif_organo,
        "n_convocatorias": len(convocatorias),
        "importe_total": round(importe_total, 2),
        "convocatorias": convocatorias,
        "error": None,
    }


__all__ = [
    "top_beneficiarios",
    "concesiones_por_nif",
    "resumen_por_organo",
]
