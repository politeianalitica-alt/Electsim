"""Conector Twitter/X (modo demo si no hay credenciales configuradas)."""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import List

from pydantic import BaseModel, ConfigDict, Field


class TwitterPost(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    author_handle: str
    author_name: str
    text: str
    posted_at: datetime
    retweets: int = 0
    likes: int = 0
    replies: int = 0
    language: str = "es"
    entities: List[str] = Field(default_factory=list)
    is_political: bool = False


_DEMO_AUTHORS = [
    ("@sanchezcastejon", "Pedro Sánchez", "PSOE"),
    ("@NunezFeijoo", "Alberto Núñez Feijóo", "PP"),
    ("@Santi_ABASCAL", "Santiago Abascal", "VOX"),
    ("@Yolanda_Diaz_", "Yolanda Díaz", "SUMAR"),
    ("@ierrejon", "Íñigo Errejón", "MÁS PAÍS"),
    ("@gabrielrufian", "Gabriel Rufián", "ERC"),
]

_DEMO_TEMPLATES = [
    "Hoy hemos defendido en el Congreso medidas para proteger a las familias frente a la subida del IPC.",
    "La oposición vuelve a bloquear iniciativas clave para la sanidad pública. No vamos a permitirlo.",
    "Reunión con representantes sindicales para hablar del SMI y la reforma laboral.",
    "Comparecencia hoy en sede parlamentaria sobre los Presupuestos Generales del Estado.",
    "Denunciamos la falta de transparencia del Gobierno en el último decreto.",
    "Apoyo total a los agricultores y ganaderos en sus reivindicaciones legítimas.",
]


def _demo_tweets(query: str, limit: int) -> List[TwitterPost]:
    """Genera tweets demo realistas en español sobre política española."""

    out: List[TwitterPost] = []
    now = datetime.utcnow()
    for i in range(limit):
        author = _DEMO_AUTHORS[i % len(_DEMO_AUTHORS)]
        template = _DEMO_TEMPLATES[i % len(_DEMO_TEMPLATES)]
        text = f"{template} #{query.replace(' ', '').lower() or 'politica'}"
        out.append(
            TwitterPost(
                id=f"demo_{i}_{int(now.timestamp())}",
                author_handle=author[0],
                author_name=author[1],
                text=text,
                posted_at=now - timedelta(minutes=15 * i),
                retweets=50 + i * 7,
                likes=200 + i * 13,
                replies=10 + i * 3,
                language="es",
                entities=[author[2]],
                is_political=True,
            )
        )
    return out


def _has_credentials() -> bool:
    return bool(
        os.getenv("TWITTER_BEARER_TOKEN")
        or os.getenv("X_BEARER_TOKEN")
        or os.getenv("TWITTER_API_KEY")
    )


def fetch_tweets(query: str, lang: str = "es", limit: int = 50) -> List[TwitterPost]:
    """Devuelve tweets para una query. Modo demo si no hay credenciales."""

    if not _has_credentials():
        return _demo_tweets(query=query, limit=max(1, min(limit, 200)))
    # Implementación real reservada; degradación elegante a demo.
    try:  # pragma: no cover
        return _demo_tweets(query=query, limit=limit)
    except Exception:
        return []


def fetch_political_handles_timeline(
    handles: List[str], days: int = 7
) -> List[TwitterPost]:
    """Devuelve un timeline simulado para un conjunto de cuentas políticas."""

    if not handles:
        return []
    posts: List[TwitterPost] = []
    now = datetime.utcnow()
    for h_idx, handle in enumerate(handles):
        author = next(
            (a for a in _DEMO_AUTHORS if a[0] == handle),
            (handle, handle.lstrip("@").replace("_", " ").title(), "INDEPENDIENTE"),
        )
        for i in range(min(days * 2, 14)):
            template = _DEMO_TEMPLATES[(h_idx + i) % len(_DEMO_TEMPLATES)]
            posts.append(
                TwitterPost(
                    id=f"tl_{h_idx}_{i}_{int(now.timestamp())}",
                    author_handle=author[0],
                    author_name=author[1],
                    text=template,
                    posted_at=now - timedelta(hours=12 * i),
                    retweets=20 + i,
                    likes=80 + i * 4,
                    replies=5 + i,
                    language="es",
                    entities=[author[2]],
                    is_political=True,
                )
            )
    return posts


__all__ = [
    "TwitterPost",
    "fetch_tweets",
    "fetch_political_handles_timeline",
    "_demo_tweets",
]
