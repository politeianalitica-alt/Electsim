"""Modelos ETL de segmentación y agregación.

Este módulo evita imports pesados al cargar el paquete para mantener
compatibilidad en entornos donde psycopg2 no está instalado.
"""

from __future__ import annotations

from typing import Any

__all__ = [
    "chequear_sistema",
    "poblar_todos",
    "run_segmentacion",
    "run_todos_los_perfiles",
]


def chequear_sistema(*args: Any, **kwargs: Any):
    from .diagnostico_microdatos import chequear_sistema as _impl

    return _impl(*args, **kwargs)


def poblar_todos(*args: Any, **kwargs: Any):
    from .poblar_perfiles_sinteticos import poblar_todos as _impl

    return _impl(*args, **kwargs)


def run_segmentacion(*args: Any, **kwargs: Any):
    from .segmentacion_microdatos import run_segmentacion as _impl

    return _impl(*args, **kwargs)


def run_todos_los_perfiles(*args: Any, **kwargs: Any):
    from .segmentacion_microdatos import run_todos_los_perfiles as _impl

    return _impl(*args, **kwargs)
