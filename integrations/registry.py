"""Registry de integraciones externas."""
from __future__ import annotations

import os
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class IntegrationStatus(str, Enum):
    connected = "connected"
    disconnected = "disconnected"
    error = "error"
    not_configured = "not_configured"


class IntegrationInfo(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    name: str
    description: str
    status: IntegrationStatus
    env_var_required: str
    last_sync: datetime | None = None
    documents_synced: int = 0
    error_message: str = ""


INTEGRATION_REGISTRY: dict[str, IntegrationInfo] = {
    "google_drive": IntegrationInfo(
        id="google_drive",
        name="Google Drive",
        description="Importa documentos, informes y datos de hojas de cálculo desde Google Drive",
        status=IntegrationStatus.not_configured,
        env_var_required="GOOGLE_SERVICE_ACCOUNT_JSON",
    ),
    "github": IntegrationInfo(
        id="github",
        name="GitHub",
        description="Monitoriza repos, issues y pull requests de organizaciones y equipos",
        status=IntegrationStatus.not_configured,
        env_var_required="GITHUB_TOKEN",
    ),
    "slack": IntegrationInfo(
        id="slack",
        name="Slack",
        description="Envía alertas y briefings automáticos a canales de Slack",
        status=IntegrationStatus.not_configured,
        env_var_required="SLACK_BOT_TOKEN",
    ),
    "notion": IntegrationInfo(
        id="notion",
        name="Notion",
        description="Importa bases de datos y páginas de Notion como fuentes de contexto",
        status=IntegrationStatus.not_configured,
        env_var_required="NOTION_TOKEN",
    ),
}


def get_integration_status(integration_id: str) -> IntegrationInfo | None:
    """Devuelve el estado actualizado de la integración comprobando variables de entorno."""
    base = INTEGRATION_REGISTRY.get(integration_id)
    if base is None:
        return None

    env_value = os.environ.get(base.env_var_required, "").strip()
    # Para Slack también aceptamos SLACK_WEBHOOK_URL
    if integration_id == "slack" and not env_value:
        env_value = os.environ.get("SLACK_WEBHOOK_URL", "").strip()

    if env_value:
        status = IntegrationStatus.connected
    else:
        status = IntegrationStatus.not_configured

    return IntegrationInfo(
        id=base.id,
        name=base.name,
        description=base.description,
        status=status,
        env_var_required=base.env_var_required,
        last_sync=base.last_sync,
        documents_synced=base.documents_synced,
        error_message=base.error_message,
    )


def get_all_integration_statuses() -> list[IntegrationInfo]:
    """Devuelve todas las integraciones con estado en vivo."""
    return [
        info
        for integration_id in INTEGRATION_REGISTRY
        if (info := get_integration_status(integration_id)) is not None
    ]


def is_integration_available(integration_id: str) -> bool:
    """True si la variable de entorno está configurada y no está vacía."""
    info = get_integration_status(integration_id)
    if info is None:
        return False
    return info.status == IntegrationStatus.connected
