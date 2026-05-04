"""
Maigret Adapter — Bloque 4.

Integración CONTROLADA con Maigret para búsqueda de candidatos de identidad social.

PRINCIPIOS ÉTICOS (NO negociables):
  - Solo se ejecuta bajo demanda explícita (nunca automático).
  - Solo sobre actores públicos con handle conocido.
  - Todos los resultados son CANDIDATOS NO VERIFICADOS.
  - verified=False siempre por defecto.
  - Se añade risk_note "requires_human_verification" obligatoriamente.
  - No almacenar perfiles personales de ciudadanos privados.
  - No afirmar que una cuenta pertenece a un actor sin revisión humana.
  - No usar resultados como evidencia fuerte en informes.

Maigret: https://github.com/soxoj/maigret
  Busca usernames en más de 3.000 sitios (500 por defecto).
  No distribuimos Maigret con ElectSim. Debe instalarse por separado.
"""
from __future__ import annotations

import logging
from typing import Any

from .schemas import SocialIdentityCandidate

logger = logging.getLogger(__name__)

# Nota de advertencia añadida a todos los candidatos
_VERIFICATION_NOTE = (
    "CANDIDATO NO VERIFICADO. Requiere revisión humana antes de uso en informes. "
    "No confirma que este perfil pertenezca al actor."
)

# Plataformas conocidas con normalización de URLs
_PLATFORM_URL_TEMPLATES: dict[str, str] = {
    "twitter": "https://twitter.com/{handle}",
    "x": "https://x.com/{handle}",
    "linkedin": "https://linkedin.com/in/{handle}",
    "github": "https://github.com/{handle}",
    "instagram": "https://instagram.com/{handle}",
    "facebook": "https://facebook.com/{handle}",
    "telegram": "https://t.me/{handle}",
    "youtube": "https://youtube.com/@{handle}",
    "tiktok": "https://tiktok.com/@{handle}",
    "medium": "https://medium.com/@{handle}",
    "reddit": "https://reddit.com/u/{handle}",
}


def _is_maigret_available() -> bool:
    """Comprueba si Maigret está disponible en el entorno."""
    try:
        import maigret  # noqa: F401
        return True
    except ImportError:
        return False


def run_username_candidate_search(
    username: str,
    actor_id: str | None = None,
    entity_id: str | None = None,
    max_sites: int = 100,
    tags: list[str] | None = None,
    timeout: int = 120,
) -> list[SocialIdentityCandidate]:
    """
    Busca candidatos de identidad social para un username dado.

    IMPORTANTE: Solo para actores públicos. Todos los resultados son CANDIDATOS.
    Requieren revisión humana antes de cualquier uso.

    Args:
        username: Handle/username a buscar (sin @).
        actor_id: ID del actor en el dashboard D2 (opcional).
        entity_id: ID de RiskEntity (opcional).
        max_sites: Máximo de sitios a comprobar (default 100, max recomendado 500).
        tags: Filtrar por categoría de sitios (["social", "news", "tech"]).
        timeout: Timeout en segundos por request.

    Returns:
        Lista de SocialIdentityCandidate con verified=False siempre.
    """
    if not username or not username.strip():
        logger.warning("maigret_adapter: username vacío, cancelando búsqueda")
        return []

    username = username.strip().lstrip("@")

    logger.info(
        "maigret_adapter: buscando candidatos para username='%s' en max %d sitios",
        username, max_sites,
    )

    if _is_maigret_available():
        return _run_maigret_search(username, actor_id, entity_id, max_sites, tags, timeout)
    else:
        logger.info("Maigret no disponible. Usando búsqueda básica de plataformas conocidas.")
        return _run_basic_candidate_search(username, actor_id, entity_id)


def _run_maigret_search(
    username: str,
    actor_id: str | None,
    entity_id: str | None,
    max_sites: int,
    tags: list[str] | None,
    timeout: int,
) -> list[SocialIdentityCandidate]:
    """Búsqueda real usando la librería Maigret."""
    candidates: list[SocialIdentityCandidate] = []
    try:
        import asyncio
        import maigret
        from maigret import MaigretDatabase

        # Crear una instancia de la DB de Maigret
        db = MaigretDatabase()
        await_results: dict[str, Any] = {}

        # Ejecutar la búsqueda de forma síncrona
        loop = asyncio.new_event_loop()
        try:
            results = loop.run_until_complete(
                maigret.search(
                    username=username,
                    site_dict=db.sites,
                    timeout=timeout,
                    max_connections=10,
                    tags=tags,
                )
            )
        finally:
            loop.close()

        for site_name, result in (results or {}).items():
            if result.get("status") != "claimed":
                continue

            url = result.get("url", "")
            platform = site_name.lower().replace(" ", "_")
            confidence = _estimate_confidence(result)

            candidates.append(SocialIdentityCandidate(
                actor_id=actor_id,
                entity_id=entity_id,
                platform=platform,
                handle=username,
                profile_url=url,
                discovery_method="maigret_candidate",
                confidence=confidence,
                verified=False,
                risk_notes=[_VERIFICATION_NOTE],
                raw_payload={
                    "site": site_name,
                    "status": result.get("status"),
                    "url": url,
                    "response_time": result.get("response_time"),
                },
            ))

    except Exception as exc:
        logger.error("maigret_adapter: error en búsqueda Maigret: %s", exc)

    logger.info("maigret_adapter: %d candidatos encontrados para '%s'", len(candidates), username)
    return candidates[:max_sites]


def _run_basic_candidate_search(
    username: str,
    actor_id: str | None,
    entity_id: str | None,
) -> list[SocialIdentityCandidate]:
    """
    Búsqueda básica en plataformas conocidas sin Maigret.
    Solo genera candidatos para las plataformas más relevantes.
    Todos tienen confidence muy bajo (requieren verificación manual).
    """
    candidates: list[SocialIdentityCandidate] = []
    for platform, url_template in _PLATFORM_URL_TEMPLATES.items():
        url = url_template.format(handle=username)
        candidates.append(SocialIdentityCandidate(
            actor_id=actor_id,
            entity_id=entity_id,
            platform=platform,
            handle=username,
            profile_url=url,
            discovery_method="maigret_candidate",
            confidence=0.10,  # Muy bajo — solo es una URL candidata, sin verificar existencia
            verified=False,
            risk_notes=[
                _VERIFICATION_NOTE,
                "Candidato generado sin verificación de existencia (Maigret no disponible).",
            ],
            raw_payload={"method": "basic_candidate", "platform": platform},
        ))
    return candidates


def _estimate_confidence(maigret_result: dict[str, Any]) -> float:
    """
    Estima la confianza de un resultado Maigret.
    Máximo 0.60 — nunca asumimos identidad confirmada.
    """
    base = 0.30
    # Si tiene información adicional (bio, followers…)
    if maigret_result.get("ids"):
        base += 0.15
    if maigret_result.get("status") == "claimed":
        base += 0.10
    # Cap en 0.60 — requiere verificación humana
    return min(base, 0.60)


def build_identity_review_summary(candidates: list[SocialIdentityCandidate]) -> str:
    """
    Genera un resumen Markdown de los candidatos para revisión manual en D2.
    """
    if not candidates:
        return "_Sin candidatos de identidad social._"

    lines = [
        f"### Identidades candidatas — {len(candidates)} resultado(s)",
        "",
        "> ⚠ **Todos estos perfiles son CANDIDATOS NO VERIFICADOS.**",
        "> Requieren revisión humana antes de cualquier uso en informes.",
        "",
    ]
    for c in sorted(candidates, key=lambda x: x.confidence, reverse=True)[:20]:
        lines.append(
            f"- **{c.platform}** `@{c.handle}` — conf. {c.confidence:.0%} — "
            f"[{c.profile_url}]({c.profile_url})"
        )

    return "\n".join(lines)
