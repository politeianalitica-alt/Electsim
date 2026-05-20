"""commodity_alerts + commodity_alert_events

Cron worker · pasa Vesper-FE Sprint 7 alertas de localStorage a backend
persistente con evaluación cron + notificaciones in-app + email opt-in.

Tablas:
  - commodity_alerts · alertas configuradas por usuario · 1 fila por alerta
  - commodity_alert_events · histórico de disparos · 1 fila por evento

Revision ID: 0076_commodity_alerts
Revises: 0075_tourism_destinations
"""
from alembic import op
import sqlalchemy as sa


revision = "0076_commodity_alerts"
down_revision = "0075_tourism_destinations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "commodity_alerts",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=120),
            nullable=False,
            comment="Identificador usuario (email/uuid) · opcional anon para shared",
        ),
        sa.Column(
            "commodity_slug",
            sa.String(length=80),
            nullable=False,
            comment="Slug del commodity (de catálogo S14)",
        ),
        sa.Column(
            "kind",
            sa.String(length=24),
            nullable=False,
            comment="'price_above' | 'price_below' | 'change_pct'",
        ),
        sa.Column(
            "threshold",
            sa.Numeric(18, 6),
            nullable=False,
            comment="Umbral · precio absoluto o % según kind",
        ),
        sa.Column(
            "period_days",
            sa.Integer,
            nullable=True,
            comment="Ventana para 'change_pct'. Null si price_above/below",
        ),
        sa.Column(
            "channels",
            sa.JSON,
            nullable=False,
            comment="Array ['inapp', 'email', 'push']",
        ),
        sa.Column(
            "active",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "last_triggered_at",
            sa.TIMESTAMP(timezone=True),
            nullable=True,
            comment="Último disparo · null si nunca",
        ),
        sa.Column(
            "last_evaluated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=True,
            comment="Última evaluación del cron · null si nunca",
        ),
        sa.Column(
            "cooldown_minutes",
            sa.Integer,
            nullable=False,
            server_default="60",
            comment="Min entre disparos consecutivos de la MISMA alerta",
        ),
        sa.Column(
            "metadata_payload",
            sa.JSON,
            nullable=True,
            comment="Notas/labels del usuario (free-form)",
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_commodity_alerts_user", "commodity_alerts", ["user_id"])
    op.create_index("ix_commodity_alerts_slug", "commodity_alerts", ["commodity_slug"])
    op.create_index("ix_commodity_alerts_active", "commodity_alerts", ["active"])

    op.create_table(
        "commodity_alert_events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "alert_id",
            sa.String(length=64),
            sa.ForeignKey("commodity_alerts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(length=120), nullable=False),
        sa.Column("commodity_slug", sa.String(length=80), nullable=False),
        sa.Column(
            "kind",
            sa.String(length=24),
            nullable=False,
            comment="Misma taxonomía que commodity_alerts.kind",
        ),
        sa.Column(
            "trigger_value",
            sa.Numeric(18, 6),
            nullable=False,
            comment="Valor observado que disparó la alerta (precio o variación)",
        ),
        sa.Column(
            "threshold",
            sa.Numeric(18, 6),
            nullable=False,
            comment="Umbral configurado al momento del disparo",
        ),
        sa.Column(
            "channels_notified",
            sa.JSON,
            nullable=False,
            comment="Subset de channels que se enviaron OK",
        ),
        sa.Column(
            "delivery_log",
            sa.JSON,
            nullable=True,
            comment="Detalle por canal {channel: status|error_msg}",
        ),
        sa.Column(
            "in_app_read",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
            comment="Marcado leído por el usuario en la UI in-app",
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_alert_events_alert", "commodity_alert_events", ["alert_id"])
    op.create_index("ix_alert_events_user", "commodity_alert_events", ["user_id"])
    op.create_index("ix_alert_events_created", "commodity_alert_events", ["created_at"])
    op.create_index(
        "ix_alert_events_unread",
        "commodity_alert_events",
        ["user_id", "in_app_read"],
    )


def downgrade() -> None:
    op.drop_index("ix_alert_events_unread", table_name="commodity_alert_events")
    op.drop_index("ix_alert_events_created", table_name="commodity_alert_events")
    op.drop_index("ix_alert_events_user", table_name="commodity_alert_events")
    op.drop_index("ix_alert_events_alert", table_name="commodity_alert_events")
    op.drop_table("commodity_alert_events")
    op.drop_index("ix_commodity_alerts_active", table_name="commodity_alerts")
    op.drop_index("ix_commodity_alerts_slug", table_name="commodity_alerts")
    op.drop_index("ix_commodity_alerts_user", table_name="commodity_alerts")
    op.drop_table("commodity_alerts")
