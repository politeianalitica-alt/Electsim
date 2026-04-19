"""
diagnostico_microdatos.py
Chequeo del estado de microdatos y perfiles para dashboard/agents.
"""

from __future__ import annotations

import json
import os
from typing import Any

import psycopg2

from etl.logger import get_logger

logger = get_logger(__name__)


def _scalar(conn: Any, sql: str, default: Any = None) -> Any:
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            row = cur.fetchone()
            return row[0] if row else default
    except Exception as exc:
        conn.rollback()
        return f"ERROR: {exc}"


def _normalize_pg_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgresql+psycopg://"):
        return "postgresql://" + url[len("postgresql+psycopg://") :]
    if url.startswith("postgresql+psycopg2://"):
        return "postgresql://" + url[len("postgresql+psycopg2://") :]
    return url


def chequear_sistema(conn: Any) -> dict[str, Any]:
    resultados: dict[str, Any] = {}

    checks: dict[str, str] = {
        "microdatos_encuesta_existe": """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'microdatos_encuesta'
            )
        """,
        "microdatos_encuesta_filas": """
            SELECT COUNT(*) FROM microdatos_encuesta
        """,
        "microdatos_tiene_peso": """
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'microdatos_encuesta' AND column_name = 'PESO'
            ) OR EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'microdatos_encuesta' AND column_name = 'peso'
            ) OR EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'microdatos_encuesta' AND column_name = 'peso_muestral'
            )
        """,
        "perfiles_votante_existe": """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'perfiles_votante'
            )
        """,
        "perfiles_con_voto_json": """
            SELECT COUNT(*) FROM perfiles_votante
            WHERE distribucion_voto_json IS NOT NULL
              AND distribucion_voto_json::text != '[]'
              AND distribucion_voto_json::text != 'null'
              AND distribucion_voto_json::text != '{}'
        """,
        "perfil_voto_filas": """
            SELECT COUNT(*) FROM perfil_voto
        """,
        "perfil_problemas_filas": """
            SELECT COUNT(*) FROM perfil_problemas
        """,
        "perfil_ccaa_filas": """
            SELECT COUNT(*) FROM perfil_ccaa
        """,
        "perfil_ejes_filas": """
            SELECT COUNT(*) FROM perfil_ejes
        """,
    }

    for nombre, sql in checks.items():
        resultados[nombre] = _scalar(conn, sql, default=0)

    recomendaciones: list[str] = []
    if not resultados.get("microdatos_encuesta_existe"):
        recomendaciones.append(
            "CRITICO: tabla microdatos_encuesta no existe. Ejecutar ingesta de barometro CIS."
        )
    elif int(resultados.get("microdatos_encuesta_filas") or 0) == 0:
        recomendaciones.append(
            "CRITICO: microdatos_encuesta existe pero esta vacia. Cargar datos CIS."
        )

    if int(resultados.get("perfiles_con_voto_json") or 0) == 0:
        recomendaciones.append(
            "IMPORTANTE: perfiles_votante sin datos de voto. Ejecutar segmentacion_microdatos.py o poblar_perfiles_sinteticos.py."
        )

    if int(resultados.get("perfil_voto_filas") or 0) == 0:
        recomendaciones.append(
            "IMPORTANTE: tabla perfil_voto vacia. Ejecutar upsert de tablas satelite."
        )

    resultados["recomendaciones"] = recomendaciones
    resultados["estado_general"] = "OK" if not recomendaciones else "REQUIERE_ACCION"
    return resultados


if __name__ == "__main__":
    db_url = _normalize_pg_url(os.environ.get("DATABASE_URL", ""))
    if not db_url:
        raise RuntimeError("DATABASE_URL no definida")

    conn = psycopg2.connect(db_url)
    try:
        resultado = chequear_sistema(conn)
        print(json.dumps(resultado, indent=2, ensure_ascii=False, default=str))
    finally:
        conn.close()
