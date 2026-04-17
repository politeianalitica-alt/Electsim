"""SQLite en memoria con el mínimo DDL para tests de tiempo real."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, text


def _init_sqlite(conn) -> None:
    stmts = [
        """
        CREATE TABLE fuentes_encuesta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL
        )
        """,
        """
        CREATE TABLE encuestas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fuente_id INTEGER,
            numero_estudio TEXT,
            titulo TEXT NOT NULL,
            tipo_encuesta TEXT,
            fecha_publicacion TEXT,
            n_entrevistas INTEGER,
            disponible_microdatos INTEGER DEFAULT 0
        )
        """,
        """
        CREATE TABLE partidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            siglas TEXT NOT NULL UNIQUE
        )
        """,
        """
        CREATE TABLE elecciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            fecha TEXT NOT NULL,
            descripcion TEXT,
            es_activa INTEGER DEFAULT 0,
            url_feed_interior TEXT,
            pct_escrutado_maximo REAL DEFAULT 0
        )
        """,
        """
        CREATE TABLE resultados_electorales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            eleccion_id INTEGER,
            partido_id INTEGER,
            provincia_id INTEGER,
            votos INTEGER DEFAULT 0,
            porcentaje REAL,
            pct_escrutado REAL,
            timestamp_parcial TEXT,
            UNIQUE(eleccion_id, partido_id, provincia_id)
        )
        """,
        """
        CREATE TABLE indicadores_macroeconomicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL,
            frecuencia TEXT,
            ipc_general REAL,
            crecimiento_pib REAL,
            tasa_paro REAL,
            prima_riesgo_bono10 INTEGER,
            precio_luz_kwh_residencial REAL,
            fuente TEXT,
            es_preliminar INTEGER DEFAULT 0,
            url_fuente TEXT,
            UNIQUE(fecha, frecuencia)
        )
        """,
        """
        CREATE TABLE encuestas_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url_fuente TEXT NOT NULL UNIQUE,
            titular TEXT,
            casa_encuestadora TEXT,
            fecha_publicacion TEXT,
            fecha_campo_inicio TEXT,
            fecha_campo_fin TEXT,
            n_entrevistas INTEGER,
            partido_datos_json TEXT,
            confianza_parseo REAL,
            procesada INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE alertas_sistema (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT,
            severidad TEXT,
            titulo TEXT,
            descripcion TEXT,
            datos_json TEXT,
            leida INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE scraping_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fuente TEXT NOT NULL,
            tipo TEXT,
            url TEXT,
            estado TEXT,
            n_registros_nuevos INTEGER DEFAULT 0,
            n_registros_duplicados INTEGER DEFAULT 0,
            error_mensaje TEXT,
            duracion_segundos REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE preguntas_encuesta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            encuesta_id INTEGER,
            texto_pregunta TEXT NOT NULL,
            categoria_tematica TEXT
        )
        """,
        """
        CREATE TABLE resultados_agregados_encuesta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            encuesta_id INTEGER,
            pregunta_id INTEGER,
            categoria TEXT,
            porcentaje REAL,
            frecuencia_abs INTEGER
        )
        """,
    ]
    for s in stmts:
        conn.execute(text(s))


@pytest.fixture
def sqlite_engine():
    eng = create_engine("sqlite:///:memory:")
    with eng.begin() as conn:
        _init_sqlite(conn)
    yield eng
