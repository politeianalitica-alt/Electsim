"""Stub de ingesta social (Twitter/X API v2)."""

from __future__ import annotations

import logging

import pandas as pd

from dashboard.config import settings

logger = logging.getLogger(__name__)


def fetch_social_stub() -> pd.DataFrame:
    """Devuelve stub vacío cuando no hay credenciales."""
    if not settings.twitter_bearer_token:
        logger.info("TWITTER_BEARER_TOKEN no configurado, devolviendo stub.")
        return pd.DataFrame(columns=["text", "created_at", "source"])
    return pd.DataFrame(columns=["text", "created_at", "source"])

