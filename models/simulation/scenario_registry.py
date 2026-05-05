"""
Scenario Registry — Bloque 11.

Gestión de escenarios, supuestos e intervenciones.
Caché en memoria + persistencia opcional en DB.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from models.simulation.schemas import (
    Intervention,
    Scenario,
    ScenarioAssumption,
)

logger = logging.getLogger(__name__)

# Caché en memoria
_SCENARIO_CACHE: dict[str, Scenario] = {}
_ASSUMPTION_CACHE: dict[str, list[ScenarioAssumption]] = {}  # scenario_id → list
_INTERVENTION_CACHE: dict[str, list[Intervention]] = {}  # scenario_id → list


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Creación ───────────────────────────────────────────────────────────────────

def create_scenario(
    name: str,
    domain: str = "mixed",
    description: str | None = None,
    assumptions: dict[str, Any] | None = None,
    interventions: list[dict[str, Any]] | None = None,
    created_by: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    engine: Any | None = None,
) -> Scenario:
    """
    Crea un nuevo escenario y lo persiste en caché (y opcionalmente en DB).

    Args:
        name: Nombre del escenario.
        domain: Dominio (electoral, campaign, economy, …).
        description: Descripción libre.
        assumptions: Supuestos iniciales (dict por variable).
        interventions: Lista de intervenciones iniciales.
        created_by: Identificador del autor.
        tags: Etiquetas.
        metadata: Metadatos libres.
        engine: SQLAlchemy engine opcional.

    Returns:
        Scenario creado.
    """
    scenario = Scenario(
        name=name,
        domain=domain,  # type: ignore[arg-type]
        description=description,
        assumptions=assumptions or {},
        interventions=interventions or [],
        created_by=created_by,
        tags=tags or [],
        metadata=metadata or {},
    )

    _SCENARIO_CACHE[scenario.scenario_id] = scenario
    _ASSUMPTION_CACHE.setdefault(scenario.scenario_id, [])
    _INTERVENTION_CACHE.setdefault(scenario.scenario_id, [])

    if engine is not None:
        try:
            _persist_scenario(scenario, engine)
        except Exception as exc:
            logger.warning("No se pudo persistir escenario %s: %s", scenario.scenario_id, exc)

    logger.info("Escenario creado: %s (%s)", scenario.scenario_id, name)
    return scenario


def add_assumption(
    scenario_id: str,
    variable_name: str,
    scenario_value: float | str | bool | None = None,
    baseline_value: float | str | bool | None = None,
    variable_label: str | None = None,
    distribution: dict[str, Any] | None = None,
    unit: str | None = None,
    source: str | None = None,
    confidence: float = 0.5,
    rationale: str | None = None,
    engine: Any | None = None,
) -> ScenarioAssumption | None:
    """
    Añade un supuesto a un escenario existente.

    Returns:
        ScenarioAssumption creado, o None si el escenario no existe.
    """
    if scenario_id not in _SCENARIO_CACHE:
        logger.warning("Escenario no encontrado: %s", scenario_id)
        return None

    assumption = ScenarioAssumption(
        scenario_id=scenario_id,
        variable_name=variable_name,
        variable_label=variable_label,
        baseline_value=baseline_value,
        scenario_value=scenario_value,
        distribution=distribution,
        unit=unit,
        source=source,
        confidence=confidence,
        rationale=rationale,
    )

    _ASSUMPTION_CACHE.setdefault(scenario_id, []).append(assumption)

    # Sincronizar con Scenario.assumptions dict
    scenario = _SCENARIO_CACHE[scenario_id]
    scenario.assumptions[variable_name] = {
        "baseline": baseline_value,
        "scenario": scenario_value,
        "confidence": confidence,
    }
    scenario.updated_at = _now()

    if engine is not None:
        try:
            _persist_assumption(assumption, engine)
        except Exception as exc:
            logger.warning("No se pudo persistir supuesto: %s", exc)

    return assumption


def add_intervention(
    scenario_id: str,
    intervention_type: str = "economic_shock",
    target_object_type: str | None = None,
    target_object_id: str | None = None,
    parameters: dict[str, Any] | None = None,
    expected_direction: str = "unknown",
    confidence: float = 0.5,
    notes: str | None = None,
    engine: Any | None = None,
) -> Intervention | None:
    """
    Añade una intervención a un escenario existente.

    Returns:
        Intervention creada, o None si el escenario no existe.
    """
    if scenario_id not in _SCENARIO_CACHE:
        logger.warning("Escenario no encontrado: %s", scenario_id)
        return None

    intervention = Intervention(
        scenario_id=scenario_id,
        intervention_type=intervention_type,  # type: ignore[arg-type]
        target_object_type=target_object_type,
        target_object_id=target_object_id,
        parameters=parameters or {},
        expected_direction=expected_direction,  # type: ignore[arg-type]
        confidence=confidence,
        notes=notes,
    )

    _INTERVENTION_CACHE.setdefault(scenario_id, []).append(intervention)

    scenario = _SCENARIO_CACHE[scenario_id]
    scenario.interventions.append({
        "type": intervention_type,
        "parameters": parameters or {},
        "direction": expected_direction,
    })
    scenario.updated_at = _now()

    if engine is not None:
        try:
            _persist_intervention(intervention, engine)
        except Exception as exc:
            logger.warning("No se pudo persistir intervención: %s", exc)

    return intervention


# ── Consultas ──────────────────────────────────────────────────────────────────

def get_scenario(scenario_id: str, engine: Any | None = None) -> Scenario | None:
    """Recupera un escenario por ID (caché primero, luego DB)."""
    if scenario_id in _SCENARIO_CACHE:
        return _SCENARIO_CACHE[scenario_id]

    if engine is not None:
        try:
            return _load_scenario_from_db(scenario_id, engine)
        except Exception as exc:
            logger.warning("No se pudo cargar escenario desde DB: %s", exc)

    return None


def list_scenarios(
    domain: str | None = None,
    status: str | None = None,
    created_by: str | None = None,
    engine: Any | None = None,
) -> list[Scenario]:
    """
    Lista escenarios con filtros opcionales.

    Args:
        domain: Filtrar por dominio.
        status: Filtrar por estado.
        created_by: Filtrar por autor.
        engine: SQLAlchemy engine opcional para cargar desde DB.

    Returns:
        Lista de escenarios.
    """
    scenarios = list(_SCENARIO_CACHE.values())

    # Intentar enriquecer desde DB
    if engine is not None and not scenarios:
        try:
            scenarios = _load_all_scenarios_from_db(engine)
        except Exception as exc:
            logger.warning("No se pudieron cargar escenarios desde DB: %s", exc)

    # Filtros
    if domain:
        scenarios = [s for s in scenarios if s.domain == domain]
    if status:
        scenarios = [s for s in scenarios if s.status == status]
    if created_by:
        scenarios = [s for s in scenarios if s.created_by == created_by]

    return sorted(scenarios, key=lambda s: s.created_at, reverse=True)


def get_scenario_assumptions(scenario_id: str) -> list[ScenarioAssumption]:
    """Devuelve los supuestos de un escenario."""
    return _ASSUMPTION_CACHE.get(scenario_id, [])


def get_scenario_interventions(scenario_id: str) -> list[Intervention]:
    """Devuelve las intervenciones de un escenario."""
    return _INTERVENTION_CACHE.get(scenario_id, [])


# ── Actualización de estado ────────────────────────────────────────────────────

def update_scenario_status(
    scenario_id: str,
    status: str,
    engine: Any | None = None,
) -> Scenario | None:
    """
    Actualiza el estado de un escenario.

    Args:
        scenario_id: ID del escenario.
        status: Nuevo estado (draft/ready/running/completed/archived).
        engine: SQLAlchemy engine opcional.

    Returns:
        Scenario actualizado, o None si no existe.
    """
    scenario = get_scenario(scenario_id, engine)
    if scenario is None:
        logger.warning("Escenario no encontrado para actualizar estado: %s", scenario_id)
        return None

    scenario.status = status  # type: ignore[assignment]
    scenario.updated_at = _now()
    _SCENARIO_CACHE[scenario_id] = scenario

    if engine is not None:
        try:
            with engine.begin() as conn:
                conn.execute(
                    __import__("sqlalchemy").text(
                        "UPDATE simulation_scenarios SET status = :status, updated_at = :updated_at "
                        "WHERE scenario_id = :scenario_id"
                    ),
                    {"status": status, "updated_at": scenario.updated_at, "scenario_id": scenario_id},
                )
        except Exception as exc:
            logger.warning("No se pudo actualizar estado en DB: %s", exc)

    return scenario


def clone_scenario(scenario_id: str, new_name: str | None = None) -> Scenario | None:
    """
    Clona un escenario existente con un nuevo ID.

    Returns:
        Nuevo Scenario, o None si el original no existe.
    """
    original = get_scenario(scenario_id)
    if original is None:
        return None

    import copy
    data = original.model_dump()
    data.pop("scenario_id")
    data["name"] = new_name or f"{original.name} (copia)"
    data["status"] = "draft"

    cloned = Scenario(**data)
    _SCENARIO_CACHE[cloned.scenario_id] = cloned

    # Clonar supuestos e intervenciones
    original_assumptions = get_scenario_assumptions(scenario_id)
    new_assumptions = []
    for a in original_assumptions:
        a_data = a.model_dump()
        a_data.pop("assumption_id")
        a_data["scenario_id"] = cloned.scenario_id
        new_assumptions.append(ScenarioAssumption(**a_data))
    _ASSUMPTION_CACHE[cloned.scenario_id] = new_assumptions

    original_interventions = get_scenario_interventions(scenario_id)
    new_interventions = []
    for i in original_interventions:
        i_data = i.model_dump()
        i_data.pop("intervention_id")
        i_data["scenario_id"] = cloned.scenario_id
        new_interventions.append(Intervention(**i_data))
    _INTERVENTION_CACHE[cloned.scenario_id] = new_interventions

    logger.info("Escenario clonado: %s → %s", scenario_id, cloned.scenario_id)
    return cloned


def clear_cache() -> None:
    """Limpia la caché en memoria (útil para tests)."""
    _SCENARIO_CACHE.clear()
    _ASSUMPTION_CACHE.clear()
    _INTERVENTION_CACHE.clear()


# ── Persistencia (privada) ─────────────────────────────────────────────────────

def _persist_scenario(scenario: Scenario, engine: Any) -> None:
    import json
    import sqlalchemy as sa

    with engine.begin() as conn:
        conn.execute(
            sa.text("""
                INSERT INTO simulation_scenarios
                    (scenario_id, name, description, domain, status,
                     baseline_object_type, baseline_object_id,
                     assumptions, interventions, created_by, tags,
                     metadata, created_at, updated_at)
                VALUES
                    (:scenario_id, :name, :description, :domain, :status,
                     :baseline_object_type, :baseline_object_id,
                     :assumptions, :interventions, :created_by, :tags,
                     :metadata, :created_at, :updated_at)
                ON CONFLICT (scenario_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at
            """),
            {
                "scenario_id": scenario.scenario_id,
                "name": scenario.name,
                "description": scenario.description,
                "domain": scenario.domain,
                "status": scenario.status,
                "baseline_object_type": scenario.baseline_object_type,
                "baseline_object_id": scenario.baseline_object_id,
                "assumptions": json.dumps(scenario.assumptions),
                "interventions": json.dumps(scenario.interventions),
                "created_by": scenario.created_by,
                "tags": json.dumps(scenario.tags),
                "metadata": json.dumps(scenario.metadata),
                "created_at": scenario.created_at,
                "updated_at": scenario.updated_at,
            },
        )


def _persist_assumption(assumption: ScenarioAssumption, engine: Any) -> None:
    import json
    import sqlalchemy as sa

    with engine.begin() as conn:
        conn.execute(
            sa.text("""
                INSERT INTO simulation_assumptions
                    (assumption_id, scenario_id, variable_name, variable_label,
                     baseline_value, scenario_value, confidence, rationale,
                     unit, source, created_at)
                VALUES
                    (:assumption_id, :scenario_id, :variable_name, :variable_label,
                     :baseline_value, :scenario_value, :confidence, :rationale,
                     :unit, :source, :created_at)
                ON CONFLICT (assumption_id) DO NOTHING
            """),
            {
                "assumption_id": assumption.assumption_id,
                "scenario_id": assumption.scenario_id,
                "variable_name": assumption.variable_name,
                "variable_label": assumption.variable_label,
                "baseline_value": str(assumption.baseline_value) if assumption.baseline_value is not None else None,
                "scenario_value": str(assumption.scenario_value) if assumption.scenario_value is not None else None,
                "confidence": assumption.confidence,
                "rationale": assumption.rationale,
                "unit": assumption.unit,
                "source": assumption.source,
                "created_at": assumption.created_at,
            },
        )


def _persist_intervention(intervention: Intervention, engine: Any) -> None:
    import json
    import sqlalchemy as sa

    with engine.begin() as conn:
        conn.execute(
            sa.text("""
                INSERT INTO simulation_interventions
                    (intervention_id, scenario_id, intervention_type,
                     target_object_type, target_object_id,
                     parameters, expected_direction, confidence, notes, created_at)
                VALUES
                    (:intervention_id, :scenario_id, :intervention_type,
                     :target_object_type, :target_object_id,
                     :parameters, :expected_direction, :confidence, :notes, :created_at)
                ON CONFLICT (intervention_id) DO NOTHING
            """),
            {
                "intervention_id": intervention.intervention_id,
                "scenario_id": intervention.scenario_id,
                "intervention_type": intervention.intervention_type,
                "target_object_type": intervention.target_object_type,
                "target_object_id": intervention.target_object_id,
                "parameters": json.dumps(intervention.parameters),
                "expected_direction": intervention.expected_direction,
                "confidence": intervention.confidence,
                "notes": intervention.notes,
                "created_at": intervention.created_at,
            },
        )


def _load_scenario_from_db(scenario_id: str, engine: Any) -> Scenario | None:
    import json
    import sqlalchemy as sa

    with engine.connect() as conn:
        row = conn.execute(
            sa.text("SELECT * FROM simulation_scenarios WHERE scenario_id = :id"),
            {"id": scenario_id},
        ).fetchone()

    if row is None:
        return None

    d = dict(row._mapping)
    d["assumptions"] = json.loads(d.get("assumptions") or "{}")
    d["interventions"] = json.loads(d.get("interventions") or "[]")
    d["tags"] = json.loads(d.get("tags") or "[]")
    d["metadata"] = json.loads(d.get("metadata") or "{}")
    scenario = Scenario(**d)
    _SCENARIO_CACHE[scenario.scenario_id] = scenario
    return scenario


def _load_all_scenarios_from_db(engine: Any) -> list[Scenario]:
    import json
    import sqlalchemy as sa

    with engine.connect() as conn:
        rows = conn.execute(
            sa.text("SELECT * FROM simulation_scenarios ORDER BY created_at DESC LIMIT 200")
        ).fetchall()

    result = []
    for row in rows:
        try:
            d = dict(row._mapping)
            d["assumptions"] = json.loads(d.get("assumptions") or "{}")
            d["interventions"] = json.loads(d.get("interventions") or "[]")
            d["tags"] = json.loads(d.get("tags") or "[]")
            d["metadata"] = json.loads(d.get("metadata") or "{}")
            s = Scenario(**d)
            _SCENARIO_CACHE[s.scenario_id] = s
            result.append(s)
        except Exception as exc:
            logger.warning("Error cargando escenario desde DB: %s", exc)

    return result
