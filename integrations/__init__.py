"""
Integrations — Conectores de datos externos para ElectSim.

Fuentes integradas: Google Drive, GitHub, Slack (webhooks), Notion (read-only).
"""
from integrations.registry import INTEGRATION_REGISTRY, get_integration_status
