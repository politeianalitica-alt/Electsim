"""
Analisis del patron de difusion de narrativas y deteccion de coordinacion.

Determina:
  - origen_scope: nivel geografico donde aparecio primero la narrativa
  - patron_difusion: bottom_up | top_down | coordinado | organico
  - posible_coordinacion: si >= 3 medios del mismo nicho publican en < 6h
  - medios_amplificadores: lista ordenada por tiempo de adopcion
  - velocidad_difusion: horas entre primera aparicion y pico
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from .models import DiffusionVector

log = logging.getLogger(__name__)

# Jerarquia de scopes para clasificar patron bottom_up / top_down
_SCOPE_ORDER = {
    "local":      0,
    "comarcal":   1,
    "provincial": 2,
    "regional":   3,
    "nacional":   4,
}

# Ventana para deteccion de coordinacion (horas)
_COORDINACION_WINDOW_H = 6.0
# Minimo de medios del mismo nicho en ventana para flag
_COORDINACION_MIN_MEDIOS = 3
# Umbral de similitud coseno para considerar articulos "iguales" (coordinacion)
_COORD_SIM_THRESHOLD = 0.80


def _hours_between(dt_a: datetime, dt_b: datetime) -> float:
    """Calcula horas absolutas entre dos datetimes."""
    if dt_a.tzinfo is None:
        dt_a = dt_a.replace(tzinfo=timezone.utc)
    if dt_b.tzinfo is None:
        dt_b = dt_b.replace(tzinfo=timezone.utc)
    return abs((dt_b - dt_a).total_seconds()) / 3600.0


def _scope_from_article(article: dict) -> str:
    """Extrae el scope del articulo; retorna 'nacional' si no hay datos."""
    scope = (article.get("scope") or "").lower().strip()
    if scope in _SCOPE_ORDER:
        return scope
    # Inferir desde fuente si no hay scope explicito
    country = (article.get("country") or "").lower()
    if country and country != "spain" and country != "españa":
        return "nacional"
    return "nacional"


def _nicho_from_article(article: dict) -> str:
    """Retorna el nicho ideologico del articulo; 'desconocido' si no esta."""
    return (article.get("nicho") or article.get("tier") or "desconocido").lower().strip()


def _detect_coordination(
    articles: list[dict],
    similarities: list[float],
) -> bool:
    """
    Detecta coordinacion: >= 3 medios del mismo nicho con similitud >= 0.80
    publicando en una ventana de 6 horas.

    Args:
        articles:     Lista de articulos del cluster con campos published_at,
                      source_name, nicho/tier.
        similarities: Scores de similitud de cada articulo con el centroide
                      del cluster (alineados con articles).

    Returns:
        True si se detecta posible coordinacion.
    """
    # Filtrar articulos con alta similitud al centroide
    high_sim = [
        art for art, sim in zip(articles, similarities)
        if sim >= _COORD_SIM_THRESHOLD and art.get("published_at")
    ]
    if len(high_sim) < _COORDINACION_MIN_MEDIOS:
        return False

    # Ordenar por published_at
    try:
        high_sim_sorted = sorted(
            high_sim,
            key=lambda a: a["published_at"] if isinstance(a["published_at"], datetime)
                           else datetime.fromisoformat(str(a["published_at"])),
        )
    except Exception as exc:
        log.debug("Error ordenando articulos por fecha: %s", exc)
        return False

    # Ventana deslizante de 6 horas
    for i, art_i in enumerate(high_sim_sorted):
        try:
            t_i = art_i["published_at"]
            if not isinstance(t_i, datetime):
                t_i = datetime.fromisoformat(str(t_i))
        except Exception:
            continue

        nicho_counts: defaultdict[str, set] = defaultdict(set)
        nicho_counts[_nicho_from_article(art_i)].add(art_i.get("source_name", ""))

        for art_j in high_sim_sorted[i + 1:]:
            try:
                t_j = art_j["published_at"]
                if not isinstance(t_j, datetime):
                    t_j = datetime.fromisoformat(str(t_j))
            except Exception:
                continue

            if _hours_between(t_i, t_j) > _COORDINACION_WINDOW_H:
                break

            nicho_j = _nicho_from_article(art_j)
            nicho_counts[nicho_j].add(art_j.get("source_name", ""))

        # Si algun nicho tiene >= 3 medios distintos en la ventana
        for nicho, fuentes in nicho_counts.items():
            if len(fuentes) >= _COORDINACION_MIN_MEDIOS:
                log.info(
                    "Posible coordinacion detectada: nicho='%s', %d medios en %.1fh",
                    nicho, len(fuentes), _COORDINACION_WINDOW_H,
                )
                return True

    return False


def _infer_scope_origin(articles: list[dict]) -> str:
    """Determina el scope del articulo mas antiguo del cluster."""
    if not articles:
        return "nacional"

    articles_with_date = [
        a for a in articles if a.get("published_at")
    ]
    if not articles_with_date:
        return "nacional"

    try:
        oldest = min(
            articles_with_date,
            key=lambda a: a["published_at"] if isinstance(a["published_at"], datetime)
                           else datetime.fromisoformat(str(a["published_at"])),
        )
    except Exception:
        return "nacional"

    return _scope_from_article(oldest)


def _infer_patron(articles: list[dict]) -> str:
    """
    Clasifica el patron de difusion comparando scopes ordenados en el tiempo.

    - Si nacio en local/comarcal/provincial y llego a nacional → bottom_up
    - Si nacio en nacional y bajo a regional/local → top_down
    - Si aparecio simultaneamente en >= 3 scopes distintos en la primera hora → coordinado
    - En otro caso → organico
    """
    articles_dated = [a for a in articles if a.get("published_at")]
    if len(articles_dated) < 2:
        return "organico"

    try:
        articles_dated = sorted(
            articles_dated,
            key=lambda a: a["published_at"] if isinstance(a["published_at"], datetime)
                           else datetime.fromisoformat(str(a["published_at"])),
        )
    except Exception:
        return "organico"

    # Scopes de la primera hora
    t0 = articles_dated[0]["published_at"]
    if not isinstance(t0, datetime):
        try:
            t0 = datetime.fromisoformat(str(t0))
        except Exception:
            return "organico"

    first_hour_scopes: set[str] = set()
    for art in articles_dated:
        try:
            t = art["published_at"]
            if not isinstance(t, datetime):
                t = datetime.fromisoformat(str(t))
            if _hours_between(t0, t) <= 1.0:
                first_hour_scopes.add(_scope_from_article(art))
        except Exception:
            continue

    if len(first_hour_scopes) >= 3:
        return "coordinado"

    scope_origin  = _SCOPE_ORDER.get(_scope_from_article(articles_dated[0]),  4)
    scope_last    = _SCOPE_ORDER.get(_scope_from_article(articles_dated[-1]),  4)

    if scope_origin <= 2 and scope_last >= 3:
        return "bottom_up"
    if scope_origin >= 3 and scope_last <= 2:
        return "top_down"
    return "organico"


def _build_amplifiers(articles: list[dict]) -> list[str]:
    """Retorna fuentes unicas ordenadas por primera aparicion en el cluster."""
    seen: set[str] = set()
    result: list[str] = []
    articles_dated = sorted(
        [a for a in articles if a.get("published_at") and a.get("source_name")],
        key=lambda a: a["published_at"] if isinstance(a["published_at"], datetime)
                       else datetime.fromisoformat(str(a["published_at"])),
    )
    for art in articles_dated:
        src = art["source_name"]
        if src not in seen:
            seen.add(src)
            result.append(src)
    return result


def analyze_diffusion(
    articles: list[dict],
    similarities: list[float],
    pico_at: Optional[datetime] = None,
) -> DiffusionVector:
    """
    Analiza el patron de difusion de un cluster de articulos.

    Args:
        articles:    Lista de articulos del cluster (dicts con published_at,
                     source_name, scope, nicho/tier).
        similarities: Score de similitud de cada articulo con el centroide.
        pico_at:     Timestamp del pico de menciones (para calcular velocidad).

    Returns:
        DiffusionVector con todos los campos calculados.
    """
    if not articles:
        return DiffusionVector(
            origen_scope="nacional",
            velocidad_difusion=0.0,
            patron_difusion="organico",
        )

    origen_scope = _infer_scope_origin(articles)
    patron       = _infer_patron(articles)
    coordinacion = _detect_coordination(articles, similarities or [0.5] * len(articles))
    amplifiers   = _build_amplifiers(articles)

    # Velocidad: horas entre primera publicacion y pico
    velocidad = 0.0
    articles_dated = [a for a in articles if a.get("published_at")]
    if articles_dated and pico_at:
        try:
            t0 = min(
                articles_dated,
                key=lambda a: a["published_at"] if isinstance(a["published_at"], datetime)
                               else datetime.fromisoformat(str(a["published_at"])),
            )["published_at"]
            if not isinstance(t0, datetime):
                t0 = datetime.fromisoformat(str(t0))
            velocidad = _hours_between(t0, pico_at)
        except Exception as exc:
            log.debug("Error calculando velocidad de difusion: %s", exc)

    # Nicho de origen (del articulo mas antiguo)
    nicho_origen: Optional[str] = None
    if articles_dated:
        try:
            oldest = min(
                articles_dated,
                key=lambda a: a["published_at"] if isinstance(a["published_at"], datetime)
                               else datetime.fromisoformat(str(a["published_at"])),
            )
            n = _nicho_from_article(oldest)
            if n != "desconocido":
                nicho_origen = n
        except Exception:
            pass

    dv = DiffusionVector(
        origen_scope=origen_scope,
        velocidad_difusion=round(velocidad, 2),
        patron_difusion=patron,
        medios_amplificadores=amplifiers,
        nicho_origen=nicho_origen,
        posible_coordinacion=coordinacion,
        ventana_coordinacion_h=_COORDINACION_WINDOW_H,
    )
    dv.validate()
    return dv
