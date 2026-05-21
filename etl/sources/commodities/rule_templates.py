"""Templates de reglas para alertas commodities multi-condición.

Galería de "recetas" predefinidas que el usuario aplica con 1 click en
/commodities/alerts/rule-builder. Cada template produce un `rule_definition`
listo para enviar a POST /api/v1/commodities/alerts.

Convenciones:
  - `slot_keys` · slugs configurables por el usuario (ej. {"primary": "wheat_cbot"})
  - `build(slots, params)` · construye rule_definition completo
  - `params` opcionales con defaults sensatos (umbrales típicos)

Templates incluidos:
  contango_basic      · futuro cercano > lejano + umbral · 2 slugs
  rsi_extremes        · RSI sobrecomprado O sobrevendido · 1 slug
  correlation_break   · par correlacionado divergiendo · 2 slugs
  weekly_volatility   · variación absoluta semanal > X% · 1 slug
  pair_spread         · spread entre dos commodities supera umbral · 2 slugs

Diseño · falla cerrado:
  - Si faltan slots requeridos → ValueError con mensaje claro
  - Si params fuera de rango → ValueError
  - El rule_definition resultante pasa por `validate_rule()` antes de devolverse
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass(frozen=True)
class SlotSpec:
    """Spec de un slug que el usuario debe rellenar."""

    key: str
    label: str
    hint: str = ""
    # Filtro opcional · categorías sugeridas para el selector
    suggested_categories: tuple[str, ...] = ()


@dataclass(frozen=True)
class ParamSpec:
    """Spec de un parámetro numérico ajustable."""

    key: str
    label: str
    default: float
    min: float
    max: float
    step: float = 1.0
    unit: str = ""


@dataclass(frozen=True)
class RuleTemplate:
    """Template aplicable · genera rule_definition completo."""

    id: str
    name: str
    description: str
    slots: tuple[SlotSpec, ...] = field(default_factory=tuple)
    params: tuple[ParamSpec, ...] = field(default_factory=tuple)
    # Closure que construye el rule_definition final
    builder: Callable[[dict[str, str], dict[str, float]], dict[str, Any]] = field(
        default=lambda s, p: {}
    )
    suggested_period_days: int = 7
    rationale: str = ""

    def to_meta(self) -> dict[str, Any]:
        """Vista serializable · sin el builder · para la galería frontend."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "rationale": self.rationale,
            "suggested_period_days": self.suggested_period_days,
            "slots": [
                {
                    "key": s.key,
                    "label": s.label,
                    "hint": s.hint,
                    "suggested_categories": list(s.suggested_categories),
                }
                for s in self.slots
            ],
            "params": [
                {
                    "key": p.key,
                    "label": p.label,
                    "default": p.default,
                    "min": p.min,
                    "max": p.max,
                    "step": p.step,
                    "unit": p.unit,
                }
                for p in self.params
            ],
        }

    def build(
        self,
        slots: dict[str, str],
        params: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """Construye el rule_definition · valida slots y params."""
        params = params or {}
        # Validar slots requeridos
        for s in self.slots:
            if not slots.get(s.key):
                raise ValueError(f"slot '{s.key}' ({s.label}) es obligatorio")
        # Validar params dentro de rango (los faltantes usan default)
        merged: dict[str, float] = {}
        for p in self.params:
            v = params.get(p.key, p.default)
            try:
                v = float(v)
            except (TypeError, ValueError):
                raise ValueError(f"param '{p.key}' debe ser numérico, recibido {v!r}")
            if not (p.min <= v <= p.max):
                raise ValueError(
                    f"param '{p.key}'={v} fuera de rango [{p.min}, {p.max}]"
                )
            merged[p.key] = v
        rd = self.builder(slots, merged)
        # Sanity check final con el validator del rule_engine
        from etl.sources.commodities.rule_engine import validate_rule
        validate_rule(rd)
        return rd


# ─────────────────────────────────────────────────────────────────
# Builders concretos
# ─────────────────────────────────────────────────────────────────

def _b_contango(slots: dict[str, str], p: dict[str, float]) -> dict[str, Any]:
    """Front-month > back-month por margen `spread_pct`.

    Aproximación: como el catálogo no expone curvas de futuros, el template
    pide dos slugs (típicamente front y back month del mismo commodity, ej.
    `crude_brent` actual vs un slug 3M, si existe en el catálogo) y dispara
    si el "front" se aprecia mientras el "back" no.
    """
    period = int(p.get("period_days", 7))
    margin = float(p["margin_pct"])
    return {
        "logic": "AND",
        "conditions": [
            {
                "slug": slots["front"],
                "op": "change_pct_gte",
                "value": margin,
                "period_days": period,
            },
            {
                "slug": slots["back"],
                "op": "change_pct_lte",
                "value": margin * 0.3,  # back debe quedarse atrás
                "period_days": period,
            },
        ],
    }


def _b_rsi_extremes(slots: dict[str, str], p: dict[str, float]) -> dict[str, Any]:
    """RSI(14) sobrecomprado (>upper) O sobrevendido (<lower)."""
    return {
        "logic": "OR",
        "conditions": [
            {"slug": slots["primary"], "op": "rsi_gt", "value": float(p["upper"])},
            {"slug": slots["primary"], "op": "rsi_lt", "value": float(p["lower"])},
        ],
    }


def _b_correlation_break(slots: dict[str, str], p: dict[str, float]) -> dict[str, Any]:
    """Par históricamente correlacionado diverge · uno sube N%, el otro cae M%."""
    period = int(p.get("period_days", 7))
    up_pct = float(p["up_pct"])
    down_pct = float(p["down_pct"])
    return {
        "logic": "AND",
        "conditions": [
            {
                "slug": slots["leader"],
                "op": "change_pct_gte",
                "value": up_pct,
                "period_days": period,
            },
            {
                "slug": slots["follower"],
                "op": "change_pct_lte",
                "value": -abs(down_pct),
                "period_days": period,
            },
        ],
    }


def _b_weekly_volatility(slots: dict[str, str], p: dict[str, float]) -> dict[str, Any]:
    """Variación absoluta semanal supera X% · subida o bajada."""
    threshold = float(p["threshold_pct"])
    period = int(p.get("period_days", 7))
    return {
        "logic": "OR",
        "conditions": [
            {
                "slug": slots["primary"],
                "op": "change_pct_gte",
                "value": threshold,
                "period_days": period,
            },
            {
                "slug": slots["primary"],
                "op": "change_pct_lte",
                "value": -threshold,
                "period_days": period,
            },
        ],
    }


def _b_port_congestion_spike(slots: dict[str, str], p: dict[str, float]) -> dict[str, Any]:
    """Congestión portuaria supera umbral · usa el slug `port:<slug>` cuyo
    snapshot resolver expone congestion_pct como `last_price`.
    """
    threshold = float(p["threshold_pct"])
    period = int(p.get("period_days", 7))
    return {
        "logic": "AND",
        "conditions": [
            {
                "slug": slots["port"],  # ej. "port:algeciras"
                "op": "price_gt",
                "value": threshold,
                "period_days": period,
            },
        ],
    }


def _b_vessel_sanctions_hit(slots: dict[str, str], p: dict[str, float]) -> dict[str, Any]:
    """Risk score sanciones de un buque supera umbral · slug `vessel_risk:<imo>`.

    El resolver mapea risk_score (0-100) a `last_price`. 60 = MEDIUM, 80 = HIGH.
    """
    threshold = float(p["threshold"])
    period = int(p.get("period_days", 1))
    return {
        "logic": "AND",
        "conditions": [
            {
                "slug": slots["vessel"],
                "op": "price_gt",
                "value": threshold,
                "period_days": period,
            },
        ],
    }


def _b_freight_rate_extreme(slots: dict[str, str], p: dict[str, float]) -> dict[str, Any]:
    """Índice de flete (BDI/FBX/...) se mueve ≥ X% absoluto en ventana.

    Reutiliza change_pct_gte/lte con OR para capturar ambas direcciones.
    Pensado para slugs de fletes: baltic_dry, fbx, baltic_capesize, etc.
    """
    threshold = float(p["threshold_pct"])
    period = int(p.get("period_days", 14))
    return {
        "logic": "OR",
        "conditions": [
            {
                "slug": slots["freight_index"],
                "op": "change_pct_gte",
                "value": threshold,
                "period_days": period,
            },
            {
                "slug": slots["freight_index"],
                "op": "change_pct_lte",
                "value": -threshold,
                "period_days": period,
            },
        ],
    }


def _b_pair_spread(slots: dict[str, str], p: dict[str, float]) -> dict[str, Any]:
    """Spread entre dos commodities · A sube ≥X% mientras B cae ≥Y% (ratio extremo)."""
    period = int(p.get("period_days", 7))
    return {
        "logic": "AND",
        "conditions": [
            {
                "slug": slots["a"],
                "op": "change_pct_gte",
                "value": float(p["a_up_pct"]),
                "period_days": period,
            },
            {
                "slug": slots["b"],
                "op": "change_pct_lte",
                "value": -float(p["b_down_pct"]),
                "period_days": period,
            },
        ],
    }


# ─────────────────────────────────────────────────────────────────
# Registro de templates
# ─────────────────────────────────────────────────────────────────

TEMPLATES: dict[str, RuleTemplate] = {
    "contango_basic": RuleTemplate(
        id="contango_basic",
        name="Contango básico (front sube, back se queda)",
        description=(
            "Dispara cuando el contrato cercano sube más que el lejano · "
            "señal típica de mercado en contango por exceso de demanda spot."
        ),
        rationale=(
            "Cuando el front-month se aprecia mientras el back-month no lo "
            "sigue, el spread (carry) se amplía. Útil para detectar tensiones "
            "spot en grains, energy o softs."
        ),
        slots=(
            SlotSpec(
                key="front",
                label="Contrato cercano",
                hint="Slug del front-month (ej. wheat_cbot)",
                suggested_categories=("grains", "energy", "softs"),
            ),
            SlotSpec(
                key="back",
                label="Contrato lejano",
                hint="Slug del back-month equivalente",
                suggested_categories=("grains", "energy", "softs"),
            ),
        ),
        params=(
            ParamSpec("margin_pct", "Margen mínimo front (%)", 3.0, 0.5, 30.0, 0.5, "%"),
            ParamSpec("period_days", "Ventana (días)", 7, 2, 60, 1, "d"),
        ),
        builder=_b_contango,
        suggested_period_days=7,
    ),

    "rsi_extremes": RuleTemplate(
        id="rsi_extremes",
        name="RSI extremos (sobrecompra / sobreventa)",
        description=(
            "Dispara si RSI(14) supera el umbral superior O cae bajo el inferior · "
            "señal técnica clásica de reversión inminente."
        ),
        rationale=(
            "Valores >70 indican sobrecompra (posible techo); <30 sobreventa "
            "(posible suelo). Útil para alertas técnicas de timing en cualquier commodity."
        ),
        slots=(
            SlotSpec(
                key="primary",
                label="Commodity",
                hint="Slug del activo a monitorizar",
            ),
        ),
        params=(
            ParamSpec("upper", "RSI sobrecompra (>)", 70.0, 55.0, 90.0, 1.0, ""),
            ParamSpec("lower", "RSI sobreventa (<)", 30.0, 10.0, 45.0, 1.0, ""),
        ),
        builder=_b_rsi_extremes,
        suggested_period_days=14,
    ),

    "correlation_break": RuleTemplate(
        id="correlation_break",
        name="Correlación rota (par diverge)",
        description=(
            "Par históricamente correlacionado diverge · uno sube N%, el otro "
            "cae M% en la misma ventana. Señal de evento idiosincrático."
        ),
        rationale=(
            "Ejemplos: wheat_cbot vs corn_cbot (granos correlacionados), "
            "crude_brent vs crude_wti (referencias petroleras), milk_smp_eu vs "
            "butter_eu. Cuando rompen la correlación habitual hay un driver "
            "específico que merece análisis."
        ),
        slots=(
            SlotSpec(key="leader", label="Activo que sube", hint="Slug que sube"),
            SlotSpec(key="follower", label="Activo que cae", hint="Slug que cae"),
        ),
        params=(
            ParamSpec("up_pct", "Subida mínima leader (%)", 4.0, 1.0, 30.0, 0.5, "%"),
            ParamSpec("down_pct", "Caída mínima follower (%)", 3.0, 1.0, 30.0, 0.5, "%"),
            ParamSpec("period_days", "Ventana (días)", 7, 2, 60, 1, "d"),
        ),
        builder=_b_correlation_break,
        suggested_period_days=7,
    ),

    "weekly_volatility": RuleTemplate(
        id="weekly_volatility",
        name="Volatilidad semanal alta",
        description=(
            "Dispara cuando la variación absoluta supera un umbral · "
            "captura tanto subidas como bajadas significativas."
        ),
        rationale=(
            "Alerta agnóstica de dirección · útil para riesgos de cobertura "
            "donde lo que importa es el movimiento, no el signo."
        ),
        slots=(
            SlotSpec(key="primary", label="Commodity", hint="Slug del activo"),
        ),
        params=(
            ParamSpec("threshold_pct", "Umbral abs. (%)", 5.0, 1.0, 50.0, 0.5, "%"),
            ParamSpec("period_days", "Ventana (días)", 7, 2, 60, 1, "d"),
        ),
        builder=_b_weekly_volatility,
        suggested_period_days=7,
    ),

    "port_congestion_spike": RuleTemplate(
        id="port_congestion_spike",
        name="Congestión portuaria · spike (puertos)",
        description=(
            "Dispara cuando la congestión de un puerto crítico supera un "
            "umbral. Útil para anticipar atrascos en cadenas suministro."
        ),
        rationale=(
            "Algeciras, Valencia, Rotterdam, Singapore… cuando la congestión "
            "supera ~40-50% se traduce en demoras de fletes y costes adicionales."
        ),
        slots=(
            SlotSpec(
                key="port",
                label="Puerto",
                hint="Slug del puerto · ej. port:algeciras",
                suggested_categories=("ports",),
            ),
        ),
        params=(
            ParamSpec("threshold_pct", "Congestión mínima (%)", 45.0, 10.0, 95.0, 1.0, "%"),
            ParamSpec("period_days", "Ventana (días)", 7, 1, 30, 1, "d"),
        ),
        builder=_b_port_congestion_spike,
        suggested_period_days=7,
    ),

    "vessel_sanctions_hit": RuleTemplate(
        id="vessel_sanctions_hit",
        name="Buque · sanctions hit (OFAC/UE/UN)",
        description=(
            "Alerta si el risk_score de sanciones de un buque supera el umbral. "
            "60+ = MEDIUM (revisión manual), 80+ = HIGH (parar operación)."
        ),
        rationale=(
            "Compliance marítimo · cruzar IMO+nombre+operador contra OpenSanctions, "
            "OFAC y EU. Alerta proactiva antes de aceptar carga o atracar."
        ),
        slots=(
            SlotSpec(
                key="vessel",
                label="Buque (slug risk)",
                hint="Slug vessel_risk:<IMO> · ej. vessel_risk:IMO9525338",
                suggested_categories=("ports",),
            ),
        ),
        params=(
            ParamSpec("threshold", "Risk score mínimo", 60.0, 30.0, 100.0, 5.0, ""),
            ParamSpec("period_days", "Ventana (días)", 1, 1, 30, 1, "d"),
        ),
        builder=_b_vessel_sanctions_hit,
        suggested_period_days=1,
    ),

    "freight_rate_extreme": RuleTemplate(
        id="freight_rate_extreme",
        name="Flete extremo · movimiento absoluto",
        description=(
            "Dispara si un índice de flete (BDI, FBX, BCI, BDTI…) se mueve "
            "≥ X% en ambas direcciones durante la ventana. Captura volatilidad."
        ),
        rationale=(
            "El BDI puede moverse ±20% en pocas semanas (China demanda hierro, "
            "tensiones en Ormuz, etc.). FBX refleja costes container. "
            "Movimientos extremos son señal para coberturas o renegociaciones."
        ),
        slots=(
            SlotSpec(
                key="freight_index",
                label="Índice de flete",
                hint="Slug · baltic_dry, fbx, baltic_capesize, baltic_dirty_tanker…",
                suggested_categories=("ports",),
            ),
        ),
        params=(
            ParamSpec("threshold_pct", "Movimiento absoluto (%)", 15.0, 3.0, 60.0, 1.0, "%"),
            ParamSpec("period_days", "Ventana (días)", 14, 3, 60, 1, "d"),
        ),
        builder=_b_freight_rate_extreme,
        suggested_period_days=14,
    ),

    "pair_spread": RuleTemplate(
        id="pair_spread",
        name="Spread entre par (A sube, B cae)",
        description=(
            "A sube ≥X% mientras B cae ≥Y% en la misma ventana · "
            "captura inversiones de spread entre commodities relacionados."
        ),
        rationale=(
            "Equivalente al 'correlation_break' pero diseñado para spreads "
            "comerciales (ej. crush margin = soybeans vs aceite vs harina)."
        ),
        slots=(
            SlotSpec(key="a", label="Activo A (sube)", hint="Slug que sube"),
            SlotSpec(key="b", label="Activo B (cae)", hint="Slug que cae"),
        ),
        params=(
            ParamSpec("a_up_pct", "A: subida ≥ (%)", 3.0, 0.5, 30.0, 0.5, "%"),
            ParamSpec("b_down_pct", "B: caída ≥ (%)", 3.0, 0.5, 30.0, 0.5, "%"),
            ParamSpec("period_days", "Ventana (días)", 7, 2, 60, 1, "d"),
        ),
        builder=_b_pair_spread,
        suggested_period_days=7,
    ),
}


# ─────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────

def list_templates() -> list[dict[str, Any]]:
    """Devuelve la galería completa para el frontend."""
    return [t.to_meta() for t in TEMPLATES.values()]


def get_template(template_id: str) -> RuleTemplate | None:
    return TEMPLATES.get(template_id)


def apply_template(
    template_id: str,
    slots: dict[str, str],
    params: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Devuelve `{ok, rule_definition, suggested_name}` o `{error}`.

    Pensado para que el frontend llame este endpoint y obtenga un
    `rule_definition` listo para POST /alerts.
    """
    tmpl = get_template(template_id)
    if tmpl is None:
        return {"error": f"template '{template_id}' no existe", "ok": False}
    try:
        rd = tmpl.build(slots, params)
    except ValueError as exc:
        return {"error": str(exc), "ok": False}
    suggested_name = _suggest_name(tmpl, slots)
    return {
        "ok": True,
        "template_id": tmpl.id,
        "rule_definition": rd,
        "rule_name": suggested_name,
    }


def _suggest_name(tmpl: RuleTemplate, slots: dict[str, str]) -> str:
    """Genera un nombre legible para la regla aplicada."""
    parts = [tmpl.name]
    used_slots = [slots.get(s.key, "?") for s in tmpl.slots]
    if used_slots:
        parts.append(" / ".join(used_slots))
    return " · ".join(parts)


__all__ = [
    "RuleTemplate",
    "SlotSpec",
    "ParamSpec",
    "TEMPLATES",
    "list_templates",
    "get_template",
    "apply_template",
]
