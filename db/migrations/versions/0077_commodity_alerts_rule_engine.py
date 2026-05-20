"""commodity_alerts · rule_definition para multi-condición

Añade columna opcional `rule_definition` JSONB que permite reglas compuestas:
  {
    "logic": "AND" | "OR",
    "conditions": [
      {"slug": "wheat_cbot", "op": "change_pct_gte", "value": 5, "period_days": 7},
      {"slug": "corn_cbot",  "op": "change_pct_lte", "value": -3, "period_days": 7}
    ]
  }

Operadores soportados:
  price_gt, price_lt, change_pct_gte, change_pct_lte, rsi_gt, rsi_lt

Backward compatible:
  - rule_definition NULL → usa kind+threshold legacy (Sprint 7)
  - rule_definition NOT NULL → engine extendido evalúa, ignora kind/threshold

Revision ID: 0077_commodity_alerts_rule_engine
Revises: 0076_commodity_alerts
"""
from alembic import op
import sqlalchemy as sa


revision = "0077_commodity_alerts_rule_engine"
down_revision = "0076_commodity_alerts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "commodity_alerts",
        sa.Column(
            "rule_definition",
            sa.JSON,
            nullable=True,
            comment=(
                "Multi-condición opcional · {logic: AND|OR, conditions: [{slug, op, value, period_days?}]}. "
                "Si presente, ignora kind/threshold legacy."
            ),
        ),
    )
    op.add_column(
        "commodity_alerts",
        sa.Column(
            "rule_name",
            sa.String(length=200),
            nullable=True,
            comment="Nombre legible de la regla compuesta (free-form usuario)",
        ),
    )


def downgrade() -> None:
    op.drop_column("commodity_alerts", "rule_name")
    op.drop_column("commodity_alerts", "rule_definition")
