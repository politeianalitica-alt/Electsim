"""Rule engine para alertas multi-condición.

Permite expresar condiciones compuestas tipo "X sube ≥5% Y al mismo tiempo
Y cae ≤-3% en 7 días":

  {
    "logic": "AND",  # AND | OR
    "conditions": [
      {"slug": "wheat_cbot", "op": "change_pct_gte", "value": 5, "period_days": 7},
      {"slug": "corn_cbot",  "op": "change_pct_lte", "value": -3, "period_days": 7}
    ]
  }

Operadores soportados:
  · price_gt        · último precio > value
  · price_lt        · último precio < value
  · change_pct_gte  · variación % observada >= value
  · change_pct_lte  · variación % observada <= value
  · rsi_gt          · RSI(14) > value (sobrecomprado típico value=70)
  · rsi_lt          · RSI(14) < value (sobrevendido típico value=30)

Diseño: el evaluador recibe un `snapshot_resolver` callable que toma un slug
y devuelve {last_price, change_pct, rsi_14}. Esto permite cachear snapshots
una vez por slug aunque aparezcan en N reglas distintas.

Falla cerrado: si un slug no se puede resolver, la condición se evalúa como
False y se anota en el detalle de la evaluación.
"""
from __future__ import annotations

import logging
from typing import Any, Callable, Literal

logger = logging.getLogger(__name__)


Logic = Literal["AND", "OR"]
Operator = Literal[
    "price_gt", "price_lt",
    "change_pct_gte", "change_pct_lte",
    "rsi_gt", "rsi_lt",
]

VALID_OPERATORS = {
    "price_gt", "price_lt",
    "change_pct_gte", "change_pct_lte",
    "rsi_gt", "rsi_lt",
}

# Snapshot esperado del resolver. Operadores ignoran campos que no necesitan.
# {last_price: float, change_pct: float, rsi_14: float, name?: str}
SnapshotResolver = Callable[[str], dict[str, Any] | None]


# ────────────────────────────────────────────────────────────────────
# Validación del schema
# ────────────────────────────────────────────────────────────────────

class RuleValidationError(ValueError):
    pass


def validate_rule(rule: dict[str, Any]) -> None:
    """Lanza RuleValidationError si la regla no es válida.

    Reglas válidas:
      - logic ∈ {AND, OR}
      - conditions · lista no vacía con max 8 condiciones
      - cada condition: {slug:str, op: Operator, value: number, period_days?: int}
    """
    if not isinstance(rule, dict):
        raise RuleValidationError("rule debe ser dict")
    logic = rule.get("logic", "AND")
    if logic not in ("AND", "OR"):
        raise RuleValidationError(f"logic debe ser AND|OR, recibido '{logic}'")
    conditions = rule.get("conditions")
    if not isinstance(conditions, list) or not conditions:
        raise RuleValidationError("conditions debe ser lista no vacía")
    if len(conditions) > 8:
        raise RuleValidationError("máximo 8 condiciones por regla")
    for i, cond in enumerate(conditions):
        if not isinstance(cond, dict):
            raise RuleValidationError(f"condition[{i}] debe ser dict")
        if not cond.get("slug") or not isinstance(cond["slug"], str):
            raise RuleValidationError(f"condition[{i}].slug requerido (str)")
        op_name = cond.get("op")
        if op_name not in VALID_OPERATORS:
            raise RuleValidationError(
                f"condition[{i}].op '{op_name}' no válido · usa {sorted(VALID_OPERATORS)}"
            )
        try:
            float(cond.get("value"))
        except (TypeError, ValueError) as exc:
            raise RuleValidationError(f"condition[{i}].value debe ser numérico") from exc


# ────────────────────────────────────────────────────────────────────
# Evaluador
# ────────────────────────────────────────────────────────────────────

def _eval_condition(
    cond: dict[str, Any],
    snapshot: dict[str, Any] | None,
) -> tuple[bool, float | None]:
    """Devuelve (passed, observed_value)."""
    if snapshot is None:
        return False, None
    op_name = cond["op"]
    target = float(cond["value"])
    try:
        if op_name == "price_gt":
            v = snapshot.get("last_price")
            return (v is not None and v > target, v)
        if op_name == "price_lt":
            v = snapshot.get("last_price")
            return (v is not None and v < target, v)
        if op_name == "change_pct_gte":
            v = snapshot.get("change_pct")
            return (v is not None and v >= target, v)
        if op_name == "change_pct_lte":
            v = snapshot.get("change_pct")
            return (v is not None and v <= target, v)
        if op_name == "rsi_gt":
            v = snapshot.get("rsi_14")
            return (v is not None and v > target, v)
        if op_name == "rsi_lt":
            v = snapshot.get("rsi_14")
            return (v is not None and v < target, v)
    except Exception as exc:
        logger.debug("eval condition · %s · %s", op_name, exc)
    return False, None


def evaluate_rule(
    rule: dict[str, Any],
    snapshot_resolver: SnapshotResolver,
) -> dict[str, Any]:
    """Evalúa una regla compuesta.

    Returns:
      {
        "triggered": bool,
        "logic": "AND"|"OR",
        "details": [
          {slug, op, target, observed, passed, snapshot_present}, ...
        ],
        "trigger_value": float | None  # primer observed que dispara (resumen)
      }
    """
    try:
        validate_rule(rule)
    except RuleValidationError as exc:
        return {
            "triggered": False,
            "logic": rule.get("logic", "?"),
            "details": [],
            "trigger_value": None,
            "error": str(exc),
        }

    logic = rule.get("logic", "AND")
    details: list[dict[str, Any]] = []

    # Cache snapshots por slug · una llamada por commodity, no por condition
    snapshot_cache: dict[str, dict[str, Any] | None] = {}

    def _snap(slug: str) -> dict[str, Any] | None:
        if slug not in snapshot_cache:
            try:
                snapshot_cache[slug] = snapshot_resolver(slug)
            except Exception as exc:
                logger.debug("resolver %s · %s", slug, exc)
                snapshot_cache[slug] = None
        return snapshot_cache[slug]

    for cond in rule["conditions"]:
        slug = cond["slug"]
        snap = _snap(slug)
        passed, observed = _eval_condition(cond, snap)
        details.append({
            "slug": slug,
            "op": cond["op"],
            "target": float(cond["value"]),
            "observed": observed,
            "passed": passed,
            "snapshot_present": snap is not None,
        })

    passed_flags = [d["passed"] for d in details]
    if logic == "AND":
        triggered = all(passed_flags) if passed_flags else False
    else:  # OR
        triggered = any(passed_flags)

    # Trigger value para el evento · primer observed que pasó
    trigger_value: float | None = None
    if triggered:
        for d in details:
            if d["passed"] and d["observed"] is not None:
                trigger_value = float(d["observed"])
                break

    return {
        "triggered": triggered,
        "logic": logic,
        "details": details,
        "trigger_value": trigger_value,
        "error": None,
    }


# ────────────────────────────────────────────────────────────────────
# Recolección de slugs · útil para warming del cache de snapshots
# ────────────────────────────────────────────────────────────────────

def slugs_in_rule(rule: dict[str, Any]) -> list[str]:
    """Devuelve los slugs únicos que aparecen en la regla."""
    if not isinstance(rule, dict):
        return []
    conds = rule.get("conditions") or []
    seen = []
    for c in conds:
        s = (c or {}).get("slug")
        if s and s not in seen:
            seen.append(s)
    return seen


__all__ = [
    "Logic", "Operator", "VALID_OPERATORS", "SnapshotResolver",
    "RuleValidationError", "validate_rule",
    "evaluate_rule", "slugs_in_rule",
]
