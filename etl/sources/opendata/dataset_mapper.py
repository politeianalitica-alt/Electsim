"""
Dataset Mapper — Bloque 10.

Infiere módulos ElectSim, sectores y genera planes de ingesta recomendados
para un OpenDataset. Sin llamadas a red ni DB.
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import DatasetIngestionPlan, OpenDataset

logger = logging.getLogger(__name__)

# ── Reglas keyword → módulos ──────────────────────────────────────────────────

_MODULE_RULES: list[tuple[list[str], str]] = [
    # Electoral
    (["elecciones", "electoral", "votos", "escanos", "circunscripcion",
      "partido politico", "candidatos", "censo electoral"], "electoral"),
    # Legislative
    (["ley", "decreto", "boe", "legislacion", "normativa", "reglamento",
      "disposicion", "boletin oficial", "orden ministerial", "senado", "congreso",
      "iniciativa legislativa", "proposicion", "enmienda"], "legislative"),
    # Economy
    (["pib", "gdp", "paro", "empleo", "iva", "irpf", "presupuesto",
      "deuda", "deficit", "inflacion", "ipc", "exportaciones", "importaciones",
      "balanza", "banco", "credito", "tipos de interes", "estadistica economica",
      "contabilidad nacional"], "economy"),
    # Contracting
    (["licitacion", "adjudicacion", "contrato", "contratacion publica",
      "concurso", "cpv", "suministro", "place", "contratos menores",
      "expediente", "oferta economica"], "contracting"),
    # Geospatial
    (["sig", "gis", "shapefile", "geojson", "coordenadas", "cartografia",
      "mapa", "catastro", "topografia", "parcelario", "geometria"], "geospatial"),
    # Media
    (["medios", "prensa", "periodico", "television", "radio", "noticias",
      "periodismo", "brechas mediaticas"], "media"),
    # Risk
    (["riesgo", "fraude", "corrupcion", "alerta", "amenaza", "vulnerabilidad",
      "ciberataque", "seguridad nacional"], "risk"),
    # Regulatory
    (["regulacion", "cnmc", "cnmv", "bde", "banco de espana", "competencia",
      "mercado", "regulador", "supervision"], "regulatory"),
    # Actors
    (["actores", "organizaciones", "partidos", "asociaciones", "lobbies",
      "grupos de presion", "financiacion de partidos"], "actors"),
    # Documents
    (["documentos", "informes", "memorias", "actas", "registros",
      "archivos", "publicaciones"], "documents"),
    # Intelligence / OSINT
    (["osint", "inteligencia", "geopolitica", "conflicto", "seguridad",
      "defensa", "diplomatico"], "intelligence"),
]

# ── Reglas keyword → sectores ─────────────────────────────────────────────────

_SECTOR_RULES: list[tuple[list[str], str]] = [
    (["sanidad", "salud", "hospital", "farmacia", "medico", "vacuna",
      "mortalidad", "natalidad"], "sanidad"),
    (["educacion", "escuela", "universidad", "alumnos", "titulados",
      "abandono escolar"], "educacion"),
    (["transporte", "tráfico", "accidentes", "carretera", "ferroviario",
      "aeropuerto", "metro", "autobus"], "transporte"),
    (["medio ambiente", "co2", "emisiones", "biodiversidad", "agua",
      "residuos", "energia renovable", "clima"], "medio_ambiente"),
    (["vivienda", "alquiler", "hipoteca", "catastro", "urbanismo",
      "construccion"], "vivienda"),
    (["turismo", "hotelero", "viajeros", "pernoctaciones"], "turismo"),
    (["agricultura", "ganaderia", "pesca", "alimentacion", "campo"], "agricultura"),
    (["industria", "manufactura", "produccion industrial", "empresa"], "industria"),
    (["finanzas", "banca", "seguros", "bolsa", "inversion", "fondos"], "finanzas"),
    (["justicia", "tribunales", "delitos", "penas", "criminalidad"], "justicia"),
    (["demografia", "poblacion", "padron", "censo", "nacimientos",
      "defunciones", "migracion"], "demografia"),
]

# ── Estrategias de transformación por módulo ──────────────────────────────────

_MODULE_TRANSFORM_STRATEGY: dict[str, str] = {
    "electoral": "tabular",
    "legislative": "document",
    "economy": "tabular",
    "contracting": "tabular",
    "geospatial": "geospatial",
    "media": "document",
    "risk": "tabular",
    "regulatory": "document",
    "actors": "api_adapter",
    "documents": "document",
    "intelligence": "document",
    "other": "raw_only",
}

# ── Portales de alta prioridad ────────────────────────────────────────────────

_HIGH_PRIORITY_PORTALS = frozenset([
    "datos_gob_es", "ine", "boe", "congreso", "senado",
    "eurostat", "eurlex", "bde", "cnmv", "cnmc", "place",
])


def infer_applicable_modules(dataset: OpenDataset) -> list[str]:
    """
    Infiere los módulos ElectSim aplicables para un dataset.

    Combina themes, keywords, title y description en una cadena
    y aplica reglas keyword.

    Returns:
        Lista de módulos (sin duplicados, ordenados).
    """
    combined = _build_combined_text(dataset)
    found = set()

    for keywords, module in _MODULE_RULES:
        if any(kw in combined for kw in keywords):
            found.add(module)

    # Incorporar módulos del portal si están disponibles
    for m in (dataset.applicable_modules or []):
        found.add(m)

    return sorted(found)


def infer_applicable_sectors(dataset: OpenDataset) -> list[str]:
    """
    Infiere sectores aplicables para un dataset.

    Returns:
        Lista de sectores (sin duplicados, ordenados).
    """
    combined = _build_combined_text(dataset)
    found = set()

    for keywords, sector in _SECTOR_RULES:
        if any(kw in combined for kw in keywords):
            found.add(sector)

    for s in (dataset.applicable_sectors or []):
        found.add(s)

    return sorted(found)


def recommend_ingestion_plan(
    dataset: OpenDataset,
    force_modules: list[str] | None = None,
) -> DatasetIngestionPlan:
    """
    Genera un plan de ingesta recomendado para un dataset.

    El plan siempre empieza como 'candidate' (requiere revisión humana).

    Args:
        dataset: Dataset a evaluar.
        force_modules: Módulos a forzar si se conocen previamente.

    Returns:
        DatasetIngestionPlan con review_status='candidate'.
    """
    modules = force_modules or infer_applicable_modules(dataset)
    sectors = infer_applicable_sectors(dataset)

    # Módulo principal para determinar dominio
    primary_module = modules[0] if modules else "other"
    target_domain = _module_to_domain(primary_module)
    transform_strategy = _MODULE_TRANSFORM_STRATEGY.get(primary_module, "structured_table")

    # Prioridad
    priority = _compute_priority(dataset, modules)

    # Justificación
    justification = _build_justification(dataset, modules, sectors)

    return DatasetIngestionPlan(
        dataset_id=dataset.dataset_id,
        target_domain=target_domain,
        transform_strategy=transform_strategy,
        review_status="candidate",
        notes=justification,
        metadata={
            "portal_id": dataset.portal_id or "unknown",
            "applicable_modules": modules,
            "applicable_sectors": sectors,
            "priority": priority,
            "suggested_by": "dataset_mapper",
        },
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_combined_text(dataset: OpenDataset) -> str:
    """Concatena todos los campos de texto del dataset en minúsculas."""
    parts = [
        dataset.title or "",
        dataset.description or "",
        " ".join(dataset.themes or []),
        " ".join(dataset.keywords or []),
        " ".join(dataset.applicable_modules or []),
        " ".join(dataset.applicable_sectors or []),
    ]
    return " ".join(parts).lower()


def _module_to_domain(module: str) -> str:
    """Mapea módulo a dominio de ingesta."""
    _MAP = {
        "electoral": "electoral",
        "legislative": "legislative",
        "economy": "economy",
        "contracting": "contracting",
        "geospatial": "geospatial",
        "media": "media",
        "risk": "regulatory",
        "regulatory": "regulatory",
        "actors": "other",
        "documents": "documents",
        "intelligence": "other",
    }
    return _MAP.get(module, "other")


def _compute_priority(dataset: OpenDataset, modules: list[str]) -> int:
    """Calcula prioridad de 1 (alta) a 5 (baja)."""
    score = 3  # Default medio

    # Portal de alta prioridad
    if dataset.portal_id in _HIGH_PRIORITY_PORTALS:
        score -= 1

    # Módulos estratégicos
    if any(m in ("electoral", "legislative", "contracting") for m in modules):
        score -= 1

    # Calidad del dataset
    if dataset.quality_score and dataset.quality_score >= 0.8:
        score -= 1

    # Sin licencia o restringida
    if not dataset.license_id and not dataset.license_title:
        score += 1

    return max(1, min(5, score))


def _build_justification(
    dataset: OpenDataset,
    modules: list[str],
    sectors: list[str],
) -> str:
    """Construye texto de justificación del plan."""
    parts = []
    if modules:
        parts.append(f"Modulos inferidos: {', '.join(modules[:3])}")
    if sectors:
        parts.append(f"Sectores: {', '.join(sectors[:3])}")
    if dataset.update_frequency:
        parts.append(f"Actualización: {dataset.update_frequency}")
    if dataset.portal_id in _HIGH_PRIORITY_PORTALS:
        parts.append("Portal de alta prioridad")
    return ". ".join(parts) or "Plan generado automáticamente."
