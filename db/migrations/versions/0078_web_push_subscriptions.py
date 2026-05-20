"""push_subscriptions · Web Push API (VAPID)

Sustituye el placeholder `out[ch] = "skipped"` del canal `push` en
`alerts_service.notify_event` por entrega real Web Push (RFC 8030 + VAPID
RFC 8292).

Una fila por endpoint suscrito · un usuario puede tener N navegadores/dispositivos.

UNIQUE (endpoint) · si el navegador re-suscribe con el mismo endpoint, se
hace upsert (sin duplicar).

Cuando el navegador desuscribe (410 Gone del push service) marcamos
`active=False` con `last_error` y dejamos de enviar a ese endpoint.

Revision ID: 0078_web_push_subscriptions
Revises: 0077_commodity_alerts_rule_engine
"""
from alembic import op
import sqlalchemy as sa


revision = "0078_web_push_subscriptions"
down_revision = "0077_commodity_alerts_rule_engine"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.String(length=120),
            nullable=False,
            comment="Identificador usuario (email/uuid)",
        ),
        sa.Column(
            "endpoint",
            sa.Text,
            nullable=False,
            comment="URL endpoint del push service (FCM/Mozilla/Apple)",
        ),
        sa.Column(
            "p256dh",
            sa.String(length=200),
            nullable=False,
            comment="Clave pública ECDH P-256 del cliente (base64url)",
        ),
        sa.Column(
            "auth",
            sa.String(length=64),
            nullable=False,
            comment="Auth secret del cliente (base64url, 16 bytes)",
        ),
        sa.Column(
            "user_agent",
            sa.String(length=400),
            nullable=True,
            comment="UA del navegador al suscribirse · para debug",
        ),
        sa.Column(
            "active",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "last_error",
            sa.Text,
            nullable=True,
            comment="Último error del push service (410, 413, etc.)",
        ),
        sa.Column(
            "last_sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_push_subscriptions_user",
        "push_subscriptions",
        ["user_id", "active"],
    )
    op.create_unique_constraint(
        "uq_push_subscriptions_endpoint",
        "push_subscriptions",
        ["endpoint"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_push_subscriptions_endpoint", "push_subscriptions", type_="unique"
    )
    op.drop_index("ix_push_subscriptions_user", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
