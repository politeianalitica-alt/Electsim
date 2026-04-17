"""
Capa de acceso a datos para el dashboard.
Queries cacheadas con st.cache_data sobre el schema real de ElectSim.
"""

from __future__ import annotations

import os
import re
import sys
import time
from pathlib import Path
from typing import Any

# Garantiza que el raíz del proyecto esté en el path, sea cual sea el cwd
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool
from etl.logger import get_logger

try:  # Preferencia: psycopg2 si está disponible.
    import psycopg2  # type: ignore
    from psycopg2 import sql as psycopg2_sql  # type: ignore
    _DB_OP_ERROR = psycopg2.OperationalError
except Exception:  # pragma: no cover - fallback entorno con psycopg v3
    psycopg2 = None  # type: ignore
    psycopg2_sql = None  # type: ignore
    try:
        import psycopg  # type: ignore
        _DB_OP_ERROR = psycopg.OperationalError
    except Exception:  # pragma: no cover
        psycopg = None  # type: ignore
        _DB_OP_ERROR = Exception

from dashboard.ingestion.microdatos_pipeline import (
    DEFAULT_MICRODATOS_DIR,
    _ensure_tables as ensure_microdatos_tables,
    ingest_microdatos_folder,
    save_custom_user_profile,
)

load_dotenv(_ROOT / ".env")
logger = get_logger(__name__)

_conn = None
_PARAM_RE = re.compile(r"(?<!:):([A-Za-z_][A-Za-z0-9_]*)")

_COLUMNAS_MACRO_PERMITIDAS = {
    "ipc_general",
    "crecimiento_pib",
    "prima_riesgo_bono10",
    "euribor_12m",
    "ibex35_cierre",
    "deuda_publica_pib",
    "deficit_publico_pib",
    # Alias de modelo macro alternativo.
    "pib_real",
    "inflacion_ipc",
    "tasa_paro",
    "deuda_pib",
    "balanza_cuenta_corriente",
    "indice_confianza_consumidor",
}

_MACRO_SQL_MAP = {
    "ipc_general": "ipc_general",
    "inflacion_ipc": "ipc_general",
    "crecimiento_pib": "crecimiento_pib",
    "pib_real": "crecimiento_pib",
    "prima_riesgo_bono10": "prima_riesgo_bono10",
    "euribor_12m": "euribor_12m",
    "ibex35_cierre": "ibex35_cierre",
    "deuda_publica_pib": "deuda_publica_pib",
    "deuda_pib": "deuda_publica_pib",
    "deficit_publico_pib": "deficit_publico_pib",
}
_COLUMNAS_MACRO = dict(_MACRO_SQL_MAP)

_CAMPOS_PERFIL_PERMITIDOS = {
    "principal_problema",
    "tamano_habitat",
    "religion",
    "ingresos_hogar",
    "situacion_laboral",
    "situacion_economica_personal",
    "situacion_economica_españa",
    "satisfaccion_democracia",
    "ocupacion",
    # Alias pedidos en prompt
    "edad_agrupada",
    "nivel_estudios",
    "clase_social",
    "comunidad_autonoma",
    "sexo",
}

_CAMPOS_PERFIL_SQL_MAP = {
    "principal_problema": "principal_problema",
    "tamano_habitat": "tamano_habitat",
    "religion": "religion",
    "ingresos_hogar": "ingresos_hogar",
    "situacion_laboral": "situacion_laboral",
    "situacion_economica_personal": "situacion_economica_personal",
    "situacion_economica_españa": "situacion_economica_españa",
    "satisfaccion_democracia": "satisfaccion_democracia",
    "ocupacion": "ocupacion",
    # Alias funcionales del dashboard.
    "edad_agrupada": "grupo_edad",
    "nivel_estudios": "estudios",
    "clase_social": "clase_social_subjetiva",
    "comunidad_autonoma": "ccaa_id",
    "sexo": "sexo",
}
_CAMPOS_PERFIL = dict(_CAMPOS_PERFIL_SQL_MAP)


# ── Conexión ──────────────────────────────────────────────────────────────────

def _connection_closed(conn: Any) -> bool:
    try:
        return bool(getattr(conn, "closed"))
    except Exception:
        return True


def _connect_db(url: str):
    if psycopg2 is not None:
        return psycopg2.connect(url)
    if "psycopg" in globals() and psycopg is not None:  # type: ignore[name-defined]
        return psycopg.connect(url)  # type: ignore[name-defined]
    raise RuntimeError("No hay driver PostgreSQL disponible (psycopg/psycopg2).")

@st.cache_resource
def get_engine() -> Engine:
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
    )
    workers = int(os.environ.get("STREAMLIT_SERVER_WORKERS", "1"))
    if workers > 1:
        return create_engine(url, pool_pre_ping=True, poolclass=NullPool)
    return create_engine(url, pool_pre_ping=True, pool_size=3, max_overflow=5)


def get_conn():
    global _conn
    for intento in range(3):
        try:
            if _conn is None or _connection_closed(_conn):
                _conn = _connect_db(os.environ["DATABASE_URL"])
                _conn.autocommit = False
                logger.info("Conexión a PostgreSQL establecida.")
            with _conn.cursor() as cur:
                cur.execute("SELECT 1")
            return _conn
        except _DB_OP_ERROR as e:
            logger.warning("Intento %s/3 fallido al conectar a BD: %s", intento + 1, e)
            _conn = None
            time.sleep(0.5 * (intento + 1))
    raise RuntimeError("No se puede conectar a PostgreSQL tras 3 intentos.")


def _to_dbapi_named(sql: str) -> str:
    """Convierte parámetros estilo :name a %(name)s para psycopg2."""
    return _PARAM_RE.sub(r"%(\1)s", sql)


def _quote_ident(col_name: str, conn: Any | None = None) -> str:
    """
    Quote seguro de identificadores SQL.
    - Usa psycopg2.sql.Identifier cuando está disponible.
    - Fallback con escape estricto de comillas.
    """
    if psycopg2_sql is not None and conn is not None and hasattr(conn, "cursor"):
        return psycopg2_sql.Identifier(col_name).as_string(conn)
    return '"' + str(col_name).replace('"', '""') + '"'


def _q(sql: str, params: dict | tuple | list | None = None, conn: Any | None = None) -> pd.DataFrame:
    """Ejecuta una query y devuelve DataFrame; retorna vacío si falla."""
    try:
        active_conn = conn or get_conn()
        if hasattr(active_conn, "cursor"):
            query = _to_dbapi_named(sql) if isinstance(params, dict) else sql
            with active_conn.cursor() as cur:
                cur.execute(query, params or None)
                if cur.description is None:
                    return pd.DataFrame()
                cols = [d[0] for d in cur.description]
                rows = cur.fetchall()
            return pd.DataFrame(rows, columns=cols)
        if hasattr(active_conn, "connect"):
            with active_conn.connect() as sa_conn:
                return pd.read_sql(text(sql), sa_conn, params=params or {})
        return pd.read_sql(text(sql), active_conn, params=params or {})
    except Exception as e:
        logger.error("DB query failed: %s", e, exc_info=True)
        if os.getenv("ENV", "prod").lower() in {"dev", "local"}:
            st.warning(str(e))
        return pd.DataFrame()


def _ensure_microdatos_schema() -> None:
    try:
        ensure_microdatos_tables(get_engine())
    except Exception:
        # No romper UI si falla la creación automática.
        pass


# ── Elecciones ────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def cargar_elecciones(tipo: str = "generales") -> pd.DataFrame:
    return _q(
        """
        SELECT id, tipo::text, fecha, descripcion, vuelta
        FROM elecciones
        WHERE tipo = :tipo
        ORDER BY fecha DESC
        """,
        {"tipo": tipo},
    )


@st.cache_data(ttl=300)
def cargar_resultados_electorales(eleccion_id: int) -> pd.DataFrame:
    return _q(
        """
        SELECT
            p.siglas,
            p.nombre_completo AS partido_nombre,
            pr.nombre         AS provincia,
            ca.nombre         AS ccaa,
            re.votos,
            re.porcentaje,
            re.escanos
        FROM resultados_electorales re
        JOIN partidos             p  ON p.id  = re.partido_id
        LEFT JOIN provincias      pr ON pr.id = re.provincia_id
        LEFT JOIN comunidades_autonomas ca ON ca.id = (
            CASE WHEN re.provincia_id IS NULL THEN re.ccaa_id
                 ELSE pr.ccaa_id
            END
        )
        WHERE re.eleccion_id = :eid
        ORDER BY re.porcentaje DESC NULLS LAST
        """,
        {"eid": eleccion_id},
    )


@st.cache_data(ttl=300)
def cargar_resultados_nacionales(eleccion_id: int) -> pd.DataFrame:
    """Agrega resultados por partido a nivel nacional (sin provincia)."""
    return _q(
        """
        SELECT
            p.siglas,
            p.nombre_completo          AS partido_nombre,
            p.ideologia,
            p.eje_izda_dcha,
            SUM(re.votos)              AS votos_totales,
            ROUND(
                SUM(re.votos)::numeric
                / NULLIF(SUM(SUM(re.votos)) OVER (), 0)::numeric
                * 100, 2
            )                          AS pct_medio,
            SUM(re.escanos)            AS escanos_totales
        FROM resultados_electorales re
        JOIN partidos p ON p.id = re.partido_id
        WHERE re.eleccion_id = :eid
          AND re.provincia_id IS NULL
        GROUP BY p.id, p.siglas, p.nombre_completo, p.ideologia, p.eje_izda_dcha
        ORDER BY votos_totales DESC NULLS LAST
        """,
        {"eid": eleccion_id},
    )


# ── Nowcasting ────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def cargar_nowcasting(_conn=None) -> pd.DataFrame:
    """Última estimación por partido (fecha más reciente en BD)."""
    conn = _conn or get_conn()
    return _q(
        """
        SELECT partido_siglas, partido_nombre, estimacion_pct,
               ic_95_inf, ic_95_sup, n_encuestas, fecha_calculo
        FROM (
            SELECT
                p.siglas AS partido_siglas,
                p.nombre_completo AS partido_nombre,
                e.estimacion_pct,
                e.ic_95_inf,
                e.ic_95_sup,
                e.n_encuestas,
                e.fecha_estimacion AS fecha_calculo,
                ROW_NUMBER() OVER (
                    PARTITION BY p.siglas
                    ORDER BY e.fecha_estimacion DESC
                ) AS rn
            FROM estimaciones_voto_agregadas e
            JOIN partidos p ON p.id = e.partido_id
        ) ranked
        WHERE rn = 1
        """,
        conn=conn,
    )


@st.cache_data(ttl=60)
def cargar_serie_nowcasting(partido_siglas: str, dias: int = 180) -> pd.DataFrame:
    if not partido_siglas or not str(partido_siglas).strip():
        return pd.DataFrame()
    return _q(
        """
        SELECT e.fecha_estimacion, e.estimacion_pct, e.ic_95_inf, e.ic_95_sup
        FROM estimaciones_voto_agregadas e
        JOIN partidos p ON p.id = e.partido_id
        WHERE p.siglas = :siglas
          AND e.fecha_estimacion >= CURRENT_DATE - :dias
        ORDER BY e.fecha_estimacion
        """,
        {"siglas": partido_siglas, "dias": dias},
    )


# ── Macroeconomía ─────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def cargar_macro_ultimo() -> pd.DataFrame:
    """Últimos valores disponibles de indicadores clave."""
    return _q(
        """
        SELECT DISTINCT ON (indicador) indicador, valor, fecha FROM (
            SELECT 'IPC General (%)'   AS indicador, ipc_general::numeric            AS valor, fecha FROM indicadores_macroeconomicos WHERE ipc_general IS NOT NULL
            UNION ALL
            SELECT 'Prima Riesgo (pb)',               prima_riesgo_bono10::numeric,           fecha FROM indicadores_macroeconomicos WHERE prima_riesgo_bono10 IS NOT NULL
            UNION ALL
            SELECT 'Crec. PIB (%)',                   crecimiento_pib::numeric,               fecha FROM indicadores_macroeconomicos WHERE crecimiento_pib IS NOT NULL
            UNION ALL
            SELECT 'Euribor 12m (%)',                 euribor_12m::numeric,                   fecha FROM indicadores_macroeconomicos WHERE euribor_12m IS NOT NULL
            UNION ALL
            SELECT 'IBEX 35',                         ibex35_cierre::numeric,                 fecha FROM indicadores_macroeconomicos WHERE ibex35_cierre IS NOT NULL
            UNION ALL
            SELECT 'Deuda Pública (% PIB)',           deuda_publica_pib::numeric,             fecha FROM indicadores_macroeconomicos WHERE deuda_publica_pib IS NOT NULL
        ) t
        ORDER BY indicador, fecha DESC
        """
    )


@st.cache_data(ttl=3600)
def cargar_macro_serie(columna: str = "ipc_general", anios: int = 10, _conn=None) -> pd.DataFrame:
    """Serie temporal de un indicador macroeconómico."""
    if columna not in _COLUMNAS_MACRO_PERMITIDAS:
        raise ValueError(
            f"Columna '{columna}' no permitida. Valores válidos: {_COLUMNAS_MACRO_PERMITIDAS}"
        )
    col_sql = _MACRO_SQL_MAP.get(columna)
    if not col_sql:
        raise ValueError(f"Columna '{columna}' no mapeada a campo SQL válido.")
    days = int(max(1, anios) * 365)
    conn = _conn or get_conn()
    col_ident = _quote_ident(col_sql, conn=conn)
    sql = (
        "SELECT fecha, {col} AS valor "
        "FROM indicadores_macroeconomicos "
        "WHERE {col} IS NOT NULL "
        "  AND fecha >= CURRENT_DATE - (:days * INTERVAL '1 day') "
        "ORDER BY fecha"
    ).format(col=col_ident)
    return _q(sql, {"days": days}, conn=conn)


# ── Perfiles de votante ───────────────────────────────────────────────────────

# ── Simulaciones ─────────────────────────────────────────────────────────────

@st.cache_data(ttl=60)
def cargar_simulaciones_campana(n: int = 10) -> pd.DataFrame:
    return _q(
        """
        SELECT partido_emisor, texto_mensaje, tipo, tema,
               receptividad_media, cambio_intencion_medio,
               n_perfiles, fecha_simulacion
        FROM simulaciones_campana
        ORDER BY fecha_simulacion DESC
        LIMIT :n
        """,
        {"n": n},
    )


@st.cache_data(ttl=60)
def cargar_simulaciones_cis(n: int = 5) -> pd.DataFrame:
    return _q(
        """
        SELECT id, nombre, n_perfiles, uso_rag, fecha_simulacion, preguntas_json
        FROM simulaciones_encuesta
        ORDER BY fecha_simulacion DESC
        LIMIT :n
        """,
        {"n": n},
    )


# ── Coaliciones ───────────────────────────────────────────────────────────────

@st.cache_data(ttl=600)
def cargar_coaliciones(eleccion_id: int | None = None) -> pd.DataFrame:
    return _q(
        """
        SELECT partidos_coalicion AS partidos,
               escanos_totales    AS escanos_total,
               es_minima          AS viable,
               n_partidos,
               distancia_ideologica,
               score_viabilidad   AS probabilidad
        FROM analisis_coaliciones
        WHERE (:eid IS NULL OR eleccion_id = :eid)
        ORDER BY escanos_totales DESC
        LIMIT 30
        """,
        {"eid": eleccion_id},
    )


@st.cache_data(ttl=600)
def cargar_escenarios_morfologicos() -> pd.DataFrame:
    return _q(
        """
        SELECT id, nombre, probabilidad, descripcion_narrativa, estados_json
        FROM escenarios_generados
        ORDER BY probabilidad DESC NULLS LAST
        LIMIT 20
        """
    )


# ── Riesgo ────────────────────────────────────────────────────────────────────

@st.cache_data(ttl=120)
def cargar_indicadores_riesgo() -> pd.DataFrame:
    return _q(
        """
        SELECT fecha_calculo, indice_compuesto, semaforo, dimensiones_json
        FROM informes_riesgo_politico
        ORDER BY fecha_calculo DESC
        LIMIT 20
        """
    )


# ── Validación ────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def cargar_historial_validacion() -> pd.DataFrame:
    return _q(
        """
        SELECT run_id, tipo, modelo, brier_score, rmse_voto, mae_escanos,
               cobertura_95ci, pct_completitud, n_checks_ok, n_checks_fail,
               created_at
        FROM resultados_validacion
        ORDER BY created_at DESC
        LIMIT 50
        """
    )


@st.cache_data(ttl=300)
def cargar_validacion_por_partido(run_id: str) -> pd.DataFrame:
    return _q(
        """
        SELECT partido_siglas, voto_real_pct, voto_pred_pct, error_pct,
               escanos_reales, escanos_pred_mediana, escanos_pred_p5, escanos_pred_p95
        FROM validacion_por_partido
        WHERE run_id = :rid
        ORDER BY ABS(error_pct) DESC NULLS LAST
        """,
        {"rid": run_id},
    )


# ── Tiempo real ───────────────────────────────────────────────────────────────

@st.cache_data(ttl=30)
def cargar_alertas(solo_no_leidas: bool = False, limit: int = 20) -> pd.DataFrame:
    return _q(
        """
        SELECT tipo, severidad, titulo, descripcion, leida, created_at
        FROM alertas_sistema
        WHERE (:solo_no_leidas = false OR leida = false)
        ORDER BY created_at DESC
        LIMIT :limit
        """,
        {"solo_no_leidas": bool(solo_no_leidas), "limit": int(limit)},
    )


@st.cache_data(ttl=30)
def cargar_scraping_log(limit: int = 20) -> pd.DataFrame:
    return _q(
        """
        SELECT fuente, tipo, estado, n_registros_nuevos, n_registros_duplicados,
               duracion_segundos, error_mensaje, created_at
        FROM scraping_log
        ORDER BY created_at DESC
        LIMIT :limit
        """,
        {"limit": int(limit)},
    )


# ── Índices Politeia ──────────────────────────────────────────────────────────

@st.cache_data(ttl=120)
def cargar_indices_politeia() -> pd.DataFrame:
    """Último valor de cada índice Politeia."""
    return _q("""
        SELECT DISTINCT ON (indice_codigo)
            indice_codigo, indice_nombre, valor, semaforo,
            variacion_7d, variacion_30d, componentes_json,
            interpretacion, metodologia, fecha_calculo
        FROM indices_politeia
        ORDER BY indice_codigo, fecha_calculo DESC
    """)


@st.cache_data(ttl=120)
def cargar_serie_indice(codigo: str, dias: int = 90) -> pd.DataFrame:
    """Serie histórica de un índice Politeia."""
    return _q("""
        SELECT fecha_calculo, valor, semaforo, variacion_7d
        FROM indices_politeia
        WHERE indice_codigo = :codigo
          AND fecha_calculo >= CURRENT_DATE - :dias
        ORDER BY fecha_calculo
    """, {"codigo": codigo, "dias": dias})


# ── Prensa y agenda ───────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def cargar_noticias_recientes(dias: int = 7, limit: int = 50, limite: int | None = None, _conn=None) -> pd.DataFrame:
    conn = _conn or get_conn()
    lim = int(limite if limite is not None else limit)
    return _q("""
        SELECT fuente, titular, url, fecha_publicacion, categoria,
               partidos_mencionados, sentimiento_score, sentimiento_label,
               temas_json, relevancia_score
        FROM noticias_prensa
        WHERE fecha_publicacion >= CURRENT_DATE - :dias
        ORDER BY relevancia_score DESC NULLS LAST, fecha_publicacion DESC
        LIMIT :limit
    """, {"dias": dias, "limit": lim}, conn=conn)


@st.cache_data(ttl=60)
def cargar_sentimiento_partido(partido: str, dias: int = 30) -> pd.DataFrame:
    return _q("""
        SELECT fecha, sentimiento_medio, pct_positivo, pct_negativo, pct_neutro, n_noticias
        FROM sentimiento_prensa_diario
        WHERE entidad = :partido
          AND fecha >= CURRENT_DATE - :dias
        ORDER BY fecha
    """, {"partido": partido, "dias": dias})


@st.cache_data(ttl=60)
def cargar_sentimiento_todos_partidos(dias: int = 14) -> pd.DataFrame:
    return _q("""
        SELECT entidad, AVG(sentimiento_medio) AS sent_medio,
               SUM(n_noticias) AS n_total,
               AVG(pct_positivo) AS pct_pos,
               AVG(pct_negativo) AS pct_neg
        FROM sentimiento_prensa_diario
        WHERE fecha >= CURRENT_DATE - :dias
          AND tipo_entidad = 'partido'
        GROUP BY entidad
        ORDER BY sent_medio DESC
    """, {"dias": dias})


@st.cache_data(ttl=60)
def cargar_agenda_hoy(_conn=None) -> pd.DataFrame:
    conn = _conn or get_conn()
    df = _q("""
        SELECT tema, n_noticias, sentimiento_medio, peso_agenda, tendencia
        FROM agenda_mediatica
        WHERE fecha = CURRENT_DATE
        ORDER BY n_noticias DESC
        LIMIT 25
    """, conn=conn)
    if not df.empty:
        return df
    # Fallback robusto:
    # 1) última fecha disponible en noticias_prensa
    # 2) si tampoco hay, agrega ventana de últimos 7 días
    df_last = _q(
        """
        WITH last_day AS (
            SELECT MAX(fecha_publicacion::date) AS d
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '14 days'
        )
        SELECT
            COALESCE(NULLIF(categoria, ''), 'general') AS tema,
            COUNT(*) AS n_noticias,
            AVG(sentimiento_score) AS sentimiento_medio,
            COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0) AS peso_agenda,
            'estable'::text AS tendencia
        FROM noticias_prensa np
        CROSS JOIN last_day
        WHERE np.fecha_publicacion::date = last_day.d
        GROUP BY 1
        ORDER BY n_noticias DESC
        LIMIT 25
        """,
        conn=conn,
    )
    if not df_last.empty:
        return df_last
    return _q(
        """
        SELECT
            COALESCE(NULLIF(categoria, ''), 'general') AS tema,
            COUNT(*) AS n_noticias,
            AVG(sentimiento_score) AS sentimiento_medio,
            COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0) AS peso_agenda,
            'estable'::text AS tendencia
        FROM noticias_prensa
        WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY n_noticias DESC
        LIMIT 25
        """,
        conn=conn,
    )


@st.cache_data(ttl=120)
def cargar_agenda_historica(dias: int = 30, top_temas: int = 10) -> pd.DataFrame:
    df = _q("""
        SELECT fecha, tema, n_noticias, sentimiento_medio
        FROM agenda_mediatica
        WHERE fecha >= CURRENT_DATE - :dias
          AND tema IN (
              SELECT tema FROM agenda_mediatica
              WHERE fecha >= CURRENT_DATE - :dias
              GROUP BY tema
              ORDER BY SUM(n_noticias) DESC
              LIMIT :top
          )
        ORDER BY fecha, n_noticias DESC
    """, {"dias": dias, "top": top_temas})
    if not df.empty:
        return df
    return _q(
        """
        WITH base AS (
            SELECT fecha_publicacion::date AS fecha,
                   COALESCE(NULLIF(categoria, ''), 'general') AS tema,
                   COUNT(*) AS n_noticias,
                   AVG(sentimiento_score) AS sentimiento_medio
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - :dias
            GROUP BY 1, 2
        ),
        tops AS (
            SELECT tema
            FROM base
            GROUP BY tema
            ORDER BY SUM(n_noticias) DESC
            LIMIT :top
        )
        SELECT b.fecha, b.tema, b.n_noticias, b.sentimiento_medio
        FROM base b
        JOIN tops t ON t.tema = b.tema
        ORDER BY b.fecha, b.n_noticias DESC
        """,
        {"dias": dias, "top": top_temas},
    )


def agenda_hoy(conn: Any | None = None) -> pd.DataFrame:
    """Todos los eventos de hoy, ordenados por hora y bloque político."""
    return _q(
        """
        SELECT
            partido, nombre_lider, cargo,
            hora_inicio, titulo_evento, lugar,
            tipo_evento, url_fuente
        FROM agenda_hoy
        ORDER BY
            CASE partido
                WHEN 'GOBIERNO'  THEN 1
                WHEN 'PSOE'      THEN 2
                WHEN 'PP'        THEN 3
                WHEN 'VOX'       THEN 4
                WHEN 'SUMAR'     THEN 5
                WHEN 'CONGRESO'  THEN 6
                ELSE 99
            END,
            hora_inicio ASC NULLS LAST
        """,
        conn=conn,
    )


def agenda_semana(conn: Any | None = None) -> pd.DataFrame:
    return _q("SELECT * FROM agenda_semana", conn=conn)


def agenda_lider(lider_id: str, dias: int = 7, conn: Any | None = None) -> pd.DataFrame:
    return _q(
        """
        SELECT fecha_evento, hora_inicio, titulo_evento,
               lugar, tipo_evento, url_fuente
        FROM agenda_lideres
        WHERE lider_id = :lider_id
          AND fecha_evento IS NOT NULL
          AND fecha_evento BETWEEN CURRENT_DATE AND (CURRENT_DATE + (:dias * INTERVAL '1 day'))
        ORDER BY fecha_evento, hora_inicio NULLS LAST
        """,
        {"lider_id": lider_id, "dias": int(dias)},
        conn=conn,
    )


# ── Componentes: sentimiento / agenda / nowcasting ──────────────────────────

def cargar_sentimiento_serie(conn: Any | None = None) -> pd.DataFrame:
    """Serie diaria de sentimiento medio por partido (últimos 30 días)."""
    return _q(
        """
        SELECT fecha, entidad AS partido, AVG(sentimiento_medio) AS sentimiento
        FROM sentimiento_prensa_diario
        WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
          AND tipo_entidad = 'partido'
          AND entidad IS NOT NULL
        GROUP BY fecha, entidad
        ORDER BY fecha, entidad
        """,
        conn=conn,
    )


def cargar_heatmap_fuente_partido(conn: Any | None = None) -> pd.DataFrame:
    """Sentimiento medio por combinación fuente×partido (últimos 30 días)."""
    return _q(
        """
        WITH news AS (
            SELECT
                COALESCE(NULLIF(TRIM(fuente), ''), 'desconocida') AS fuente_id,
                UNNEST(STRING_TO_ARRAY(COALESCE(partidos_mencionados, ''), ','))::text AS partido,
                COALESCE(sentimiento_score, 0.0) AS sentimiento
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '30 days'
              AND COALESCE(partidos_mencionados, '') <> ''
        )
        SELECT
            fuente_id,
            BTRIM(partido) AS partido,
            ROUND(AVG(sentimiento)::numeric, 3) AS sentimiento,
            COUNT(*) AS n_noticias
        FROM news
        WHERE BTRIM(partido) <> ''
        GROUP BY fuente_id, BTRIM(partido)
        ORDER BY fuente_id, partido
        """,
        conn=conn,
    )


def cargar_alertas_sentimiento(conn: Any | None = None, umbral: float = -0.5) -> pd.DataFrame:
    """Picos negativos de cobertura en últimos 7 días."""
    return _q(
        """
        WITH agg AS (
            SELECT
                fecha_publicacion::date AS fecha,
                COALESCE(NULLIF(TRIM(fuente), ''), 'desconocida') AS fuente_id,
                BTRIM(UNNEST(STRING_TO_ARRAY(COALESCE(partidos_mencionados, ''), ','))) AS partido,
                AVG(COALESCE(sentimiento_score, 0.0)) AS sentimiento_medio,
                COUNT(*) AS n_noticias
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '7 days'
              AND COALESCE(partidos_mencionados, '') <> ''
            GROUP BY 1, 2, 3
        )
        SELECT
            fecha,
            partido,
            fuente_id,
            ROUND(sentimiento_medio::numeric, 3) AS sentimiento,
            n_noticias
        FROM agg
        WHERE partido <> ''
          AND sentimiento_medio <= :umbral
        ORDER BY sentimiento_medio ASC
        LIMIT 20
        """,
        {"umbral": float(umbral)},
        conn=conn,
    )


def cargar_agenda_rango(conn: Any | None, fecha_inicio: str, fecha_fin: str) -> pd.DataFrame:
    """Actos de agenda en rango de fechas, excluyendo fecha nula."""
    return _q(
        """
        SELECT
            al.fecha_evento AS fecha,
            al.hora_inicio AS hora,
            al.nombre_lider AS lider,
            al.partido,
            COALESCE(al.tipo_evento, 'otro') AS tipo_acto,
            COALESCE(al.titulo_evento, al.descripcion, 'Sin descripción') AS descripcion,
            al.lugar,
            COALESCE(al.fuente_id, al.url_fuente) AS fuente
        FROM agenda_lideres al
        WHERE al.fecha_evento BETWEEN :fecha_inicio AND :fecha_fin
          AND al.fecha_evento IS NOT NULL
        ORDER BY al.fecha_evento, al.hora_inicio NULLS LAST, al.partido
        """,
        {"fecha_inicio": fecha_inicio, "fecha_fin": fecha_fin},
        conn=conn,
    )


def cargar_serie_voto(conn: Any | None = None) -> pd.DataFrame:
    """Serie histórica de estimaciones de voto por partido (180 días)."""
    return _q(
        """
        SELECT
            p.siglas AS partido,
            e.fecha_estimacion AS fecha,
            e.estimacion_pct AS voto_estimado,
            NULL::integer AS escanos_estimados
        FROM estimaciones_voto_agregadas e
        JOIN partidos p ON p.id = e.partido_id
        WHERE e.fecha_estimacion >= CURRENT_DATE - INTERVAL '180 days'
        ORDER BY e.fecha_estimacion, p.siglas
        """,
        conn=conn,
    )


def get_todos_politicos(conn: Any | None = None) -> pd.DataFrame:
    return _q(
        """
        SELECT
            politico_id,
            nombre_completo,
            COALESCE(nombre_corto, nombre_completo) AS nombre_corto,
            partido_actual,
            cargo_actual,
            es_ministro,
            es_lider_partido,
            es_diputado,
            foto_url
        FROM politicos
        ORDER BY partido_actual, es_lider_partido DESC, nombre_corto
        """,
        conn=conn,
    )


def get_ficha_politico(conn: Any | None, politico_id: str) -> dict[str, Any]:
    perfil = _q(
        "SELECT * FROM politicos WHERE politico_id = :pid",
        {"pid": politico_id},
        conn=conn,
    )
    trayectoria = _q(
        """
        SELECT cargo, organizacion, tipo_cargo, ambito,
               fecha_inicio, fecha_fin, es_cargo_actual, descripcion
        FROM politicos_trayectoria
        WHERE politico_id = :pid
        ORDER BY fecha_inicio DESC NULLS FIRST
        """,
        {"pid": politico_id},
        conn=conn,
    )
    patrimonio = _q(
        """
        SELECT anio_declaracion, tipo_declaracion, total_activos,
               total_pasivos, ingresos_cargo, url_declaracion
        FROM politicos_patrimonio
        WHERE politico_id = :pid
        ORDER BY anio_declaracion DESC
        """,
        {"pid": politico_id},
        conn=conn,
    )
    noticias = _q(
        """
        SELECT
            n.titular AS titulo,
            n.url,
            n.fecha_publicacion AS fecha_pub,
            n.fuente AS fuente_id,
            n.categoria AS tema,
            n.sentimiento_score AS sentimiento,
            pn.relevancia
        FROM politicos_noticias pn
        JOIN noticias_prensa n ON n.url = pn.noticia_url
        WHERE pn.politico_id = :pid
          AND n.fecha_publicacion >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY pn.relevancia DESC NULLS LAST, n.fecha_publicacion DESC
        LIMIT 20
        """,
        {"pid": politico_id},
        conn=conn,
    )
    votos = _q(
        """
        SELECT fecha_votacion, titulo_votacion,
               resultado_voto, resultado_final, url_votacion
        FROM politicos_votos
        WHERE politico_id = :pid
        ORDER BY fecha_votacion DESC
        LIMIT 10
        """,
        {"pid": politico_id},
        conn=conn,
    )
    return {
        "perfil": perfil.iloc[0].to_dict() if not perfil.empty else {},
        "trayectoria": trayectoria,
        "patrimonio": patrimonio,
        "noticias": noticias,
        "votos": votos,
    }


# ── Congreso ──────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def cargar_stats_legislativas(legislatura: int = 15) -> pd.DataFrame:
    return _q("""
        SELECT partido_siglas, periodo,
               n_proposiciones, n_preguntas_orales, n_preguntas_escritas,
               n_enmiendas, n_interpelaciones, n_mociones
        FROM stats_legislativas
        WHERE legislatura = :leg
        ORDER BY periodo DESC, n_proposiciones DESC
    """, {"leg": legislatura})


@st.cache_data(ttl=300)
def cargar_actividad_reciente_congreso(dias: int = 90, limit: int = 50) -> pd.DataFrame:
    return _q("""
        SELECT partido_siglas, tipo_acto, titulo, fecha, resultado
        FROM actividad_congreso
        WHERE fecha >= CURRENT_DATE - :dias
        ORDER BY fecha DESC
        LIMIT :limit
    """, {"dias": dias, "limit": limit})


@st.cache_data(ttl=300)
def cargar_votaciones() -> pd.DataFrame:
    return _q("""
        SELECT fecha, titulo, tipo_votacion, resultado,
               votos_si, votos_no, abstenciones
        FROM votaciones_parlamentarias
        ORDER BY fecha DESC
        LIMIT 30
    """)


# ── Indicadores sociales ──────────────────────────────────────────────────────

@st.cache_data(ttl=600)
def cargar_indicadores_sociales(indicador: str | None = None) -> pd.DataFrame:
    return _q("""
        SELECT indicador, valor, unidad, fecha, fuente
        FROM indicadores_sociales
        WHERE (:ind IS NULL OR indicador = :ind)
        ORDER BY indicador, fecha DESC
        LIMIT 200
    """, {"ind": indicador})


@st.cache_data(ttl=300)
def cargar_encuestas_tracking_recientes(dias: int = 45, limit: int = 200) -> pd.DataFrame:
    return _q(
        """
        SELECT casa_encuestadora, fecha_publicacion, partido_datos_json, titular, url_fuente
        FROM encuestas_tracking
        WHERE fecha_publicacion >= CURRENT_DATE - :dias
          AND partido_datos_json IS NOT NULL
        ORDER BY fecha_publicacion DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": limit},
    )


@st.cache_data(ttl=300)
def cargar_resultados_provinciales(eleccion_id: int) -> pd.DataFrame:
    """Resultados por provincia con nombre de provincia y partido ganador."""
    return _q(
        """
        SELECT
            pr.id            AS provincia_id,
            pr.nombre        AS provincia,
            ca.nombre        AS ccaa,
            p.siglas,
            re.votos,
            re.porcentaje,
            re.escanos
        FROM resultados_electorales re
        JOIN partidos             p  ON p.id  = re.partido_id
        JOIN provincias           pr ON pr.id = re.provincia_id
        LEFT JOIN comunidades_autonomas ca ON ca.id = COALESCE(re.ccaa_id, pr.ccaa_id)
        WHERE re.eleccion_id = :eid
          AND re.provincia_id IS NOT NULL
        ORDER BY pr.id, re.escanos DESC NULLS LAST
        """,
        {"eid": eleccion_id},
    )


@st.cache_data(ttl=3600)
def cargar_perfiles_votante(_conn=None, limit: int = 30) -> pd.DataFrame:
    conn = _conn or get_conn()
    lim = max(1, int(limit))
    return _q(
        """
        SELECT cluster_id, label, n_respondentes, peso_demografico_pct,
               edad_media, ideologia_media, distribucion_voto_json, descripcion_perfil_llm
        FROM perfiles_votante
        ORDER BY peso_demografico_pct DESC NULLS LAST, cluster_id
        LIMIT :limit
        """,
        {"limit": lim},
        conn=conn,
    )


# ── Microdatos propios ────────────────────────────────────────────────────────

def ejecutar_ingesta_microdatos(source_dir: str = DEFAULT_MICRODATOS_DIR, max_files: int | None = None) -> dict[str, Any]:
    """Lanza la ingesta de microdatos propios y limpia cache de vistas."""
    try:
        _ensure_microdatos_schema()
        result = ingest_microdatos_folder(
            engine=get_engine(),
            source_dir=source_dir,
            max_files=max_files,
            replace_existing_for_survey=True,
        )
        # Invalida cache para refrescar paneles tras la ingesta.
        st.cache_data.clear()
        return result
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@st.cache_data(ttl=120)
def cargar_microdatos_runs(limit: int = 20) -> pd.DataFrame:
    _ensure_microdatos_schema()
    return _q(
        """
        SELECT run_id,
               MAX(created_at) AS fecha_run,
               COUNT(*) AS n_cohortes
        FROM microdatos_cohortes
        GROUP BY run_id
        ORDER BY fecha_run DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )


@st.cache_data(ttl=120)
def cargar_microdatos_resumen(run_id: str | None = None) -> pd.DataFrame:
    _ensure_microdatos_schema()
    if not run_id:
        run_df = cargar_microdatos_runs(limit=1)
        if run_df.empty:
            return pd.DataFrame()
        run_id = str(run_df.iloc[0]["run_id"])
    return _q(
        """
        WITH
          ai_pool AS (
            SELECT COUNT(*)::bigint AS n_pool_ia
            FROM microdatos_ai_pool
            WHERE run_id = :run_id
          ),
          cohortes AS (
            SELECT COUNT(*)::bigint AS n_cohortes
            FROM microdatos_cohortes
            WHERE run_id = :run_id
          ),
          asociaciones AS (
            SELECT COUNT(*)::bigint AS n_asociaciones
            FROM microdatos_asociaciones
            WHERE run_id = :run_id
          ),
          enc_m AS (
            SELECT COUNT(*)::bigint AS n_microdatos_total
            FROM microdatos_encuesta
          ),
          encuestas_m AS (
            SELECT COUNT(*)::bigint AS n_encuestas_micro
            FROM encuestas
            WHERE tipo_encuesta = 'microdatos'
          )
        SELECT
          :run_id AS run_id,
          ai_pool.n_pool_ia,
          cohortes.n_cohortes,
          asociaciones.n_asociaciones,
          enc_m.n_microdatos_total,
          encuestas_m.n_encuestas_micro
        FROM ai_pool, cohortes, asociaciones, enc_m, encuestas_m
        """,
        {"run_id": run_id},
    )


@st.cache_data(ttl=120)
def cargar_microdatos_asociaciones(run_id: str | None = None, limit: int = 50) -> pd.DataFrame:
    _ensure_microdatos_schema()
    if not run_id:
        run_df = cargar_microdatos_runs(limit=1)
        if run_df.empty:
            return pd.DataFrame()
        run_id = str(run_df.iloc[0]["run_id"])
    return _q(
        """
        SELECT predictor, target, n_obs, chi2, cramers_v, n_levels_pred, n_levels_target, encuesta_id, created_at
        FROM microdatos_asociaciones
        WHERE run_id = :run_id
        ORDER BY cramers_v DESC NULLS LAST, chi2 DESC NULLS LAST
        LIMIT :limit
        """,
        {"run_id": run_id, "limit": limit},
    )


@st.cache_data(ttl=120)
def cargar_microdatos_cohortes(run_id: str | None = None, limit: int = 100) -> pd.DataFrame:
    _ensure_microdatos_schema()
    if not run_id:
        run_df = cargar_microdatos_runs(limit=1)
        if run_df.empty:
            return pd.DataFrame()
        run_id = str(run_df.iloc[0]["run_id"])
    return _q(
        """
        SELECT
          encuesta_id, cohorte_key, sexo, grupo_edad, estudios, sitlab, clase_subjetiva, ccaa,
          ideologia_tramo, recuerdo_voto, cercania, n_obs, peso_total, ideologia_media, voto_dist_json
        FROM microdatos_cohortes
        WHERE run_id = :run_id
        ORDER BY peso_total DESC NULLS LAST
        LIMIT :limit
        """,
        {"run_id": run_id, "limit": limit},
    )


@st.cache_data(ttl=120)
def cargar_microdatos_pool_ia(run_id: str | None = None, limit: int = 50) -> pd.DataFrame:
    _ensure_microdatos_schema()
    if not run_id:
        run_df = cargar_microdatos_runs(limit=1)
        if run_df.empty:
            return pd.DataFrame()
        run_id = str(run_df.iloc[0]["run_id"])
    return _q(
        """
        SELECT encuesta_id, respondent_hash, cohorte_key, label_voto, escala_ideologica, peso, prompt_perfil, metadata_json, created_at
        FROM microdatos_ai_pool
        WHERE run_id = :run_id
        ORDER BY peso DESC NULLS LAST, created_at DESC
        LIMIT :limit
        """,
        {"run_id": run_id, "limit": limit},
    )


def guardar_perfil_usuario_custom(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        _ensure_microdatos_schema()
        save_custom_user_profile(get_engine(), payload)
        st.cache_data.clear()
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@st.cache_data(ttl=120)
def cargar_perfiles_usuario_custom(usuario_id: str = "default") -> pd.DataFrame:
    _ensure_microdatos_schema()
    return _q(
        """
        SELECT
          usuario_id, nombre_perfil, sexo, edad, estudios, sitlab, clasesub, ccaa,
          escideol, cercania, recuerdo, p12, p13,
          valor_lider_1, valor_lider_2, valor_lider_3, valor_lider_4, valor_lider_5,
          notes, updated_at
        FROM perfil_usuario_custom
        WHERE usuario_id = :usuario_id
        ORDER BY updated_at DESC
        """,
        {"usuario_id": usuario_id},
    )


def _build_micro_filter_where(filtros: dict[str, Any], table_alias: str = "") -> tuple[str, dict[str, Any]]:
    pref = f"{table_alias}." if table_alias else ""
    mapping = {
        "sexo": f"{pref}sexo",
        "grupo_edad": f"{pref}grupo_edad",
        "estudios": f"{pref}estudios",
        "situacion_laboral": f"{pref}situacion_laboral",
        "ocupacion": f"{pref}ocupacion",
        "clase_social_subjetiva": f"{pref}clase_social_subjetiva",
        "identidad_territorial": f"{pref}identidad_territorial",
        "ccaa_id": f"{pref}ccaa_id::text",
        "tamano_habitat": f"{pref}tamano_habitat",
        "principal_problema": f"{pref}principal_problema",
        "religion": f"{pref}religion",
        "ingresos_hogar": f"{pref}ingresos_hogar",
        "situacion_economica_personal": f"{pref}situacion_economica_personal",
        "situacion_economica_españa": f"{pref}situacion_economica_españa",
        "satisfaccion_democracia": f"{pref}satisfaccion_democracia",
        "recuerdo_voto_anterior": f"{pref}recuerdo_voto_anterior",
        "intencion_voto": f"{pref}intencion_voto",
    }
    params: dict[str, Any] = {}
    clauses: list[str] = []
    for k, col in mapping.items():
        v = filtros.get(k)
        if not v:
            continue
        if isinstance(v, (list, tuple, set)):
            vals = [str(x) for x in v if x is not None and str(x).strip() and str(x).strip().lower() not in {"todos", "all", ""}]
            if not vals:
                continue
            in_params_map: list[str] = []
            for i, val in enumerate(vals):
                pk = f"f_{k}_{i}"
                params[pk] = val
                in_params_map.append(f":{pk}")
            clauses.append(f"{col} IN ({', '.join(in_params_map)})")
            continue
        if str(v).strip().lower() in {"todos", "all", ""}:
            continue
        pk = f"f_{k}"
        clauses.append(f"{col} = :{pk}")
        params[pk] = str(v)
    esc_bin = filtros.get("escideol_bin")
    case_expr = f"""
        (CASE
          WHEN {pref}escala_ideologica IS NULL THEN 'NA'
          WHEN {pref}escala_ideologica <= 2 THEN '1-2'
          WHEN {pref}escala_ideologica <= 4 THEN '3-4'
          WHEN {pref}escala_ideologica <= 6 THEN '5-6'
          WHEN {pref}escala_ideologica <= 8 THEN '7-8'
          ELSE '9-10'
        END)
    """
    if isinstance(esc_bin, (list, tuple, set)):
        esc_vals = [str(x) for x in esc_bin if x is not None and str(x).strip() and str(x).strip().lower() not in {"todos", "all", ""}]
        if esc_vals:
            in_params_esc: list[str] = []
            for i, val in enumerate(esc_vals):
                pk = f"f_escideol_bin_{i}"
                params[pk] = val
                in_params_esc.append(f":{pk}")
            clauses.append(f"{case_expr} IN ({', '.join(in_params_esc)})")
    elif esc_bin and str(esc_bin).strip().lower() not in {"todos", "all", ""}:
        params["f_escideol_bin"] = str(esc_bin)
        clauses.append(f"{case_expr} = :f_escideol_bin")
    where = " AND ".join(clauses) if clauses else "1=1"
    return where, params


@st.cache_data(ttl=120)
def cargar_opciones_perfil_microdatos() -> dict[str, list[str]]:
    _ensure_microdatos_schema()
    out: dict[str, list[str]] = {}
    cols = {
        "sexo": "sexo::text",
        "grupo_edad": "grupo_edad::text",
        "estudios": "estudios::text",
        "situacion_laboral": "situacion_laboral::text",
        "ocupacion": "ocupacion::text",
        "clase_social_subjetiva": "clase_social_subjetiva::text",
        "identidad_territorial": "identidad_territorial::text",
        "ccaa_id": "ccaa_id::text",
        "tamano_habitat": "tamano_habitat::text",
        "principal_problema": "principal_problema::text",
        "religion": "religion::text",
        "ingresos_hogar": "ingresos_hogar::text",
        "situacion_economica_personal": "situacion_economica_personal::text",
        "situacion_economica_españa": "\"situacion_economica_españa\"::text",
        "satisfaccion_democracia": "satisfaccion_democracia::text",
        "recuerdo_voto_anterior": "recuerdo_voto_anterior::text",
        "intencion_voto": "intencion_voto::text",
    }
    select_chunks = ",\n               ".join(
        (
            "ARRAY(SELECT DISTINCT {expr} FROM microdatos_encuesta "
            "WHERE {expr_base} IS NOT NULL AND TRIM({expr}) <> '' ORDER BY 1) AS {col}"
        ).format(
            expr=expr,
            expr_base=expr.replace("::text", ""),
            col=col,
        )
        for col, expr in cols.items()
    )
    sql = """
        SELECT
               {select_chunks}
    """.format(select_chunks=select_chunks)
    df = _q(sql)
    if not df.empty:
        row = df.iloc[0]
        for col in cols:
            arr = row.get(col)
            if isinstance(arr, list):
                out[col] = [str(x) for x in arr if x is not None]
            else:
                out[col] = []
    else:
        for col in cols:
            out[col] = []
    out["escideol_bin"] = ["1-2", "3-4", "5-6", "7-8", "9-10", "NA"]
    return out


@st.cache_data(ttl=120)
def cargar_distribucion_campo_perfil_microdatos(filtros: dict[str, Any], campo: str, limit: int = 12) -> pd.DataFrame:
    _ensure_microdatos_schema()
    if campo != "ccaa_residencia" and campo not in _CAMPOS_PERFIL_PERMITIDOS:
        raise ValueError(
            f"Campo '{campo}' no permitido. Valores válidos: {_CAMPOS_PERFIL_PERMITIDOS}"
        )
    where, params = _build_micro_filter_where(filtros, table_alias="me")
    params["limit"] = limit
    if campo == "ccaa_residencia":
        sql = (
            "SELECT COALESCE(ca.nombre, 'Sin identificar') AS categoria, "
            "       SUM(COALESCE(me.peso_muestral,1)) AS peso "
            "FROM microdatos_encuesta me "
            "LEFT JOIN comunidades_autonomas ca ON ca.id = me.ccaa_id "
            "WHERE __WHERE__ "
            "GROUP BY COALESCE(ca.nombre, 'Sin identificar') "
            "ORDER BY peso DESC "
            "LIMIT :limit"
        ).replace("__WHERE__", where)
        return _q(
            sql,
            params,
        )
    col_raw = _CAMPOS_PERFIL_SQL_MAP.get(campo)
    if not col_raw:
        return pd.DataFrame(columns=["categoria", "peso"])
    col_ident = _quote_ident(col_raw)
    col_sql = f"me.{col_ident}"
    sql = (
        "SELECT __COL__ AS categoria, SUM(COALESCE(me.peso_muestral,1)) AS peso "
        "FROM microdatos_encuesta me "
        "WHERE __WHERE__ "
        "  AND __COL__ IS NOT NULL "
        "  AND TRIM(__COL__::text) <> '' "
        "GROUP BY __COL__ "
        "ORDER BY peso DESC "
        "LIMIT :limit"
    ).replace("__WHERE__", where).replace("__COL__", col_sql)
    return _q(
        sql,
        params,
    )


@st.cache_data(ttl=120)
def cargar_resumen_perfil_microdatos(filtros: dict[str, Any]) -> pd.DataFrame:
    _ensure_microdatos_schema()
    where, params = _build_micro_filter_where(filtros)
    sql = (
        "SELECT "
        "  COUNT(*) AS n, "
        "  SUM(COALESCE(peso_muestral, 1)) AS peso_total, "
        "  AVG(edad) AS edad_media, "
        "  AVG(escala_ideologica) AS ideologia_media "
        "FROM microdatos_encuesta "
        "WHERE __WHERE__"
    ).replace("__WHERE__", where)
    return _q(
        sql,
        params,
    )


@st.cache_data(ttl=120)
def cargar_intencion_perfil_microdatos(filtros: dict[str, Any], limit: int = 12) -> pd.DataFrame:
    _ensure_microdatos_schema()
    where, params = _build_micro_filter_where(filtros)
    params["limit"] = limit
    sql = (
        "SELECT intencion_voto AS categoria, SUM(COALESCE(peso_muestral,1)) AS peso "
        "FROM microdatos_encuesta "
        "WHERE __WHERE__ "
        "  AND intencion_voto IS NOT NULL "
        "GROUP BY intencion_voto "
        "ORDER BY peso DESC "
        "LIMIT :limit"
    ).replace("__WHERE__", where)
    return _q(
        sql,
        params,
    )


@st.cache_data(ttl=120)
def cargar_ccaa_perfil_microdatos(filtros: dict[str, Any], limit: int = 10) -> pd.DataFrame:
    _ensure_microdatos_schema()
    where, params = _build_micro_filter_where(filtros)
    params["limit"] = limit
    sql = (
        "SELECT identidad_territorial AS categoria, SUM(COALESCE(peso_muestral,1)) AS peso "
        "FROM microdatos_encuesta "
        "WHERE __WHERE__ "
        "  AND identidad_territorial IS NOT NULL "
        "GROUP BY identidad_territorial "
        "ORDER BY peso DESC "
        "LIMIT :limit"
    ).replace("__WHERE__", where)
    return _q(
        sql,
        params,
    )


@st.cache_data(ttl=120)
def cargar_recuerdo_perfil_microdatos(filtros: dict[str, Any], limit: int = 10) -> pd.DataFrame:
    _ensure_microdatos_schema()
    where, params = _build_micro_filter_where(filtros)
    params["limit"] = limit
    sql = (
        "SELECT recuerdo_voto_anterior AS categoria, SUM(COALESCE(peso_muestral,1)) AS peso "
        "FROM microdatos_encuesta "
        "WHERE __WHERE__ "
        "  AND recuerdo_voto_anterior IS NOT NULL "
        "GROUP BY recuerdo_voto_anterior "
        "ORDER BY peso DESC "
        "LIMIT :limit"
    ).replace("__WHERE__", where)
    return _q(
        sql,
        params,
    )
