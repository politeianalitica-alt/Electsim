"""
Capa de acceso a datos para el dashboard.
Queries cacheadas con st.cache_data sobre el schema real de ElectSim.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

# Garantiza que el raíz del proyecto esté en el path, sea cual sea el cwd
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import psycopg
from psycopg import sql as psycopg_sql
import streamlit as st
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.engine import Engine
from etl.logger import get_logger
from db.session import get_engine as _shared_get_engine, get_raw_conn

from etl.pipelines.microdatos_pipeline import (
    DEFAULT_MICRODATOS_DIR,
    _ensure_tables as ensure_microdatos_tables,
    ingest_microdatos_folder,
    save_custom_user_profile,
)

load_dotenv(_ROOT / ".env")
logger = get_logger(__name__)

_DB_OP_ERROR = psycopg.OperationalError
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

@st.cache_resource
def get_engine() -> Engine:
    return _shared_get_engine()


def get_conn():
    return get_raw_conn()


def _to_dbapi_named(sql: str) -> str:
    """Convierte parámetros estilo :name a %(name)s para psycopg v3 (pyformat)."""
    return _PARAM_RE.sub(r"%(\1)s", sql)


def _quote_ident(col_name: str, conn: Any | None = None) -> str:
    """
    Quote seguro de identificadores SQL.
    - Usa psycopg.sql.Identifier cuando hay conexión activa.
    - Fallback con escape estricto de comillas.
    """
    if conn is not None:
        try:
            return psycopg_sql.Identifier(col_name).as_string(conn)
        except Exception:
            pass
    return '"' + str(col_name).replace('"', '""') + '"'


def _q(sql: str, params: dict | tuple | list | None = None, conn: Any | None = None) -> pd.DataFrame:
    """Ejecuta una query y devuelve DataFrame; retorna vacío si falla."""
    owns_conn = conn is None
    active_conn = conn
    try:
        active_conn = active_conn or get_conn()
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
        if owns_conn and active_conn is not None and hasattr(active_conn, "rollback"):
            try:
                active_conn.rollback()
            except Exception:
                pass
        if os.getenv("ENV", "prod").lower() in {"dev", "local"}:
            st.warning(str(e))
        return pd.DataFrame()
    finally:
        if owns_conn and active_conn is not None and hasattr(active_conn, "close"):
            try:
                active_conn.close()
            except Exception:
                pass


def _table_exists(table_name: str, conn: Any | None = None) -> bool:
    df = _q(
        "SELECT to_regclass(:table_name) AS reg",
        {"table_name": table_name},
        conn=conn,
    )
    if df.empty:
        return False
    return bool(df.iloc[0].get("reg"))


def _table_columns(table_name: str, conn: Any | None = None) -> set[str]:
    df = _q(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = :table_name
        """,
        {"table_name": table_name},
        conn=conn,
    )
    if df.empty:
        return set()
    return {str(x) for x in df["column_name"].tolist() if x is not None}


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

@st.cache_data(ttl=120)
def cargar_nowcasting() -> pd.DataFrame:
    """
    Última estimación por partido.
    Prioriza modelo bayesiano multi-fuente; si no hay, cae al agregador clásico.
    Devuelve también KPIs de calidad (cobertura, consenso, confianza, n_fuentes).
    """
    df = _q(
        """
        SELECT DISTINCT ON (p.siglas)
            p.siglas              AS partido_siglas,
            p.nombre_completo     AS partido_nombre,
            e.estimacion_pct,
            e.ic_95_inf,
            e.ic_95_sup,
            e.n_encuestas,
            e.n_fuentes_usadas,
            e.cobertura_pct,
            e.consenso_sd,
            e.confianza_modelo,
            e.tipos_fuente_json,
            e.modelo,
            e.run_id,
            e.fecha_estimacion AS fecha_calculo
        FROM estimaciones_voto_agregadas e
        JOIN partidos p ON p.id = e.partido_id
        WHERE e.modelo = 'bayes_multifuente_v1'
        ORDER BY p.siglas, e.fecha_estimacion DESC, e.created_at DESC
        """
    )
    if not df.empty:
        return df
    # Fallback al agregador clásico.
    return _q(
        """
        SELECT DISTINCT ON (p.siglas)
            p.siglas        AS partido_siglas,
            p.nombre_completo AS partido_nombre,
            e.estimacion_pct,
            e.ic_95_inf,
            e.ic_95_sup,
            e.n_encuestas,
            NULL::int  AS n_fuentes_usadas,
            NULL::numeric AS cobertura_pct,
            NULL::numeric AS consenso_sd,
            NULL::numeric AS confianza_modelo,
            NULL::text AS tipos_fuente_json,
            e.modelo,
            NULL::uuid AS run_id,
            e.fecha_estimacion AS fecha_calculo
        FROM estimaciones_voto_agregadas e
        JOIN partidos p ON p.id = e.partido_id
        ORDER BY p.siglas, e.fecha_estimacion DESC
        """
    )


@st.cache_data(ttl=120)
def cargar_nowcasting_calidad() -> pd.DataFrame:
    """KPIs globales del último run (cobertura media, consenso SD, confianza, n fuentes)."""
    return _q(
        """
        SELECT run_id, fecha_estimacion, modelo, n_partidos,
               cobertura_media, consenso_sd_medio, confianza_media,
               n_fuentes_max, created_at
        FROM v_nowcasting_calidad
        LIMIT 1
        """
    )


@st.cache_data(ttl=120)
def cargar_contribuciones_run(run_id: str | None = None, limit: int = 30) -> pd.DataFrame:
    """Trazabilidad: qué fuentes alimentaron el run (ENCUESTA/MICRO/MACRO/PRENSA)."""
    if not run_id:
        runs = _q("SELECT run_id FROM v_nowcasting_calidad LIMIT 1")
        if runs.empty:
            return pd.DataFrame()
        run_id = str(runs.iloc[0]["run_id"])
    return _q(
        """
        SELECT fuente_tipo, fuente_label, peso_efectivo, contribucion_pct, fecha_dato
        FROM estimacion_fuente_peso
        WHERE run_id = :rid
        ORDER BY peso_efectivo DESC
        LIMIT :limit
        """,
        {"rid": run_id, "limit": limit},
    )


@st.cache_data(ttl=300)
def cargar_casas_cobertura() -> pd.DataFrame:
    """Panel de casas encuestadoras con rating y cobertura reciente."""
    return _q(
        """
        SELECT casa_nombre, activa, rating, mae_ewma, n_elecciones_bt,
               ultima_fecha_encuesta, n_encuestas_7d, n_encuestas_30d
        FROM v_casas_cobertura_reciente
        ORDER BY rating DESC NULLS LAST, casa_nombre
        """
    )


@st.cache_data(ttl=300)
def cargar_accuracy_casa(casa_nombre: str) -> pd.DataFrame:
    """Histórico de accuracy de una casa por elección."""
    return _q(
        """
        SELECT e.fecha, e.descripcion, cah.dias_antes, cah.n_encuestas,
               cah.mae_global, cah.rmse_global, cah.bias_medio, cah.bias_por_partido
        FROM casa_accuracy_historica cah
        JOIN casa_encuestadora ce ON ce.id = cah.casa_id
        JOIN elecciones e ON e.id = cah.eleccion_id
        WHERE ce.nombre = :nombre
        ORDER BY e.fecha DESC
        """,
        {"nombre": casa_nombre},
    )


@st.cache_data(ttl=300)
def cargar_fuentes_macro() -> pd.DataFrame:
    """Catálogo de fuentes macro con peso y frecuencia."""
    return _q(
        """
        SELECT codigo, proveedor, dataset, categoria, frecuencia,
               latencia_dias, peso_base, activa
        FROM fuente_macro
        ORDER BY categoria, proveedor, codigo
        """
    )


@st.cache_data(ttl=180)
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
    col_ident = _quote_ident(col_sql)
    sql = (
        "SELECT fecha, {col} AS valor "
        "FROM indicadores_macroeconomicos "
        "WHERE {col} IS NOT NULL "
        "  AND fecha >= CURRENT_DATE - (:days * INTERVAL '1 day') "
        "ORDER BY fecha"
    ).format(col=col_ident)
    return _q(sql, {"days": days}, conn=_conn)


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
    cols = _table_columns("alertas_sistema")
    has_extra = {"fuente", "valor_actual", "valor_anterior", "pagina_relevante"}.issubset(cols)
    select_cols = (
        "tipo, severidad, titulo, descripcion, leida, created_at, "
        "fuente, valor_actual, valor_anterior, pagina_relevante"
        if has_extra
        else "tipo, severidad, titulo, descripcion, leida, created_at"
    )
    return _q(
        f"""
        SELECT {select_cols}
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
    """
    Carga noticias recientes. Intenta tabla article primero (modelo nuevo),
    con fallback a noticias_prensa (modelo legacy).
    """
    lim = int(limite if limite is not None else limit)

    df = _q(
        """
        SELECT source_id AS fuente, title AS titular, url_canonical AS url,
               published_at::date AS fecha_publicacion, categoria,
               partidos_mencionados, sentimiento_score, sentimiento_label,
               temas_json, relevancia_score
        FROM article
        WHERE published_at >= NOW() - (:dias * INTERVAL '1 day')
        ORDER BY relevancia_score DESC NULLS LAST, published_at DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": lim},
        conn=_conn,
    )
    if not df.empty:
        return df

    return _q(
        """
        SELECT fuente, titular, url, fecha_publicacion, categoria,
               partidos_mencionados, sentimiento_score, sentimiento_label,
               temas_json, relevancia_score
        FROM noticias_prensa
        WHERE fecha_publicacion >= CURRENT_DATE - :dias
        ORDER BY relevancia_score DESC NULLS LAST, fecha_publicacion DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": lim},
        conn=_conn,
    )


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
    df = _q("""
        SELECT tema, n_noticias, sentimiento_medio, peso_agenda, tendencia
        FROM agenda_mediatica
        WHERE fecha = CURRENT_DATE
        ORDER BY n_noticias DESC
        LIMIT 25
    """, conn=_conn)
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
        conn=_conn,
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
        conn=_conn,
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
    """
    Carga perfiles para el selector principal y para la unificación legacy.
    Incluye campos nuevos de v2 y mantiene columnas legacy compatibles.
    """
    conn = _conn
    owns_conn = conn is None
    if conn is None:
        conn = get_conn()
    lim = max(1, int(limit))
    try:
        cols = _table_columns("perfiles_votante", conn=conn)
        if not cols:
            return pd.DataFrame()

        nombre_expr = "nombre_perfil" if "nombre_perfil" in cols else "label"
        label_expr = "label" if "label" in cols else nombre_expr
        color_expr = "color" if "color" in cols else "'#666666'::text"
        fuente_expr = "fuente_datos" if "fuente_datos" in cols else "'sintetico'::text"

        return _q(
            f"""
            SELECT
                cluster_id,
                {label_expr} AS label,
                {nombre_expr} AS nombre_perfil,
                {color_expr} AS color,
                COALESCE(peso_demografico_pct, 0.0) AS peso_demografico_pct,
                COALESCE(ideologia_media, 5.0) AS ideologia_media,
                COALESCE(edad_media, 45.0) AS edad_media,
                COALESCE(n_respondentes, 0) AS n_respondentes,
                COALESCE(cohorte_generacional, 'N/D') AS cohorte_generacional,
                COALESCE(satisfaccion_demo_media, 0) AS satisfaccion_demo_media,
                COALESCE(pct_pesimistas_eco, 0) AS pct_pesimistas_eco,
                COALESCE(eco_personal_media, 0) AS eco_personal_media,
                COALESCE(eco_espana_media, 0) AS eco_espana_media,
                COALESCE(eje_redistribucion, 5.0) AS eje_redistribucion,
                COALESCE(eje_inmigracion, 5.0) AS eje_inmigracion,
                COALESCE(eje_territorial, 5.0) AS eje_territorial,
                COALESCE(eje_valores, 5.0) AS eje_valores,
                COALESCE(confianza_partidos_media, 0) AS confianza_partidos_media,
                COALESCE(interes_politica_media, 0) AS interes_politica_media,
                COALESCE(habitat_dominante, 'N/D') AS habitat_dominante,
                COALESCE(clase_social_modal, 'N/D') AS clase_social_modal,
                COALESCE(estudios_modal, 'N/D') AS estudios_modal,
                COALESCE(situacion_laboral_modal, 'N/D') AS situacion_laboral_modal,
                COALESCE(renta_media_anual, 0) AS renta_media_anual,
                COALESCE(pct_alquiler, 0) AS pct_alquiler,
                COALESCE(pct_paro, 0) AS pct_paro,
                distribucion_voto_json,
                descripcion_perfil_llm,
                {fuente_expr} AS fuente_datos,
                fecha_calculo
            FROM perfiles_votante
            ORDER BY peso_demografico_pct DESC NULLS LAST, cluster_id
            LIMIT :limit
            """,
            {"limit": lim},
            conn=conn,
        )
    finally:
        if owns_conn and conn is not None and hasattr(conn, "close"):
            try:
                conn.close()
            except Exception:
                pass


def cargar_voto_perfil(conn, cluster_id: int) -> pd.DataFrame:
    """Distribución de voto (intención + recuerdo) desde tabla satélite."""
    if not _table_exists("perfil_voto", conn=conn):
        return pd.DataFrame()
    return _q(
        """
        SELECT partido, pct_intencion, pct_recuerdo
        FROM perfil_voto
        WHERE cluster_id = :cluster_id
          AND (pct_intencion IS NOT NULL OR pct_recuerdo IS NOT NULL)
        ORDER BY COALESCE(pct_intencion, 0) DESC
        """,
        {"cluster_id": cluster_id},
        conn=conn,
    )


def cargar_problemas_perfil(conn, cluster_id: int) -> pd.DataFrame:
    """Problemas principales ordenados por ranking."""
    if not _table_exists("perfil_problemas", conn=conn):
        return pd.DataFrame()
    return _q(
        """
        SELECT problema, pct, ranking
        FROM perfil_problemas
        WHERE cluster_id = :cluster_id
        ORDER BY ranking ASC
        """,
        {"cluster_id": cluster_id},
        conn=conn,
    )


def cargar_ccaa_perfil(conn, cluster_id: int) -> pd.DataFrame:
    """Distribución geográfica por CCAA de un perfil."""
    if not _table_exists("perfil_ccaa", conn=conn):
        return pd.DataFrame()
    return _q(
        """
        SELECT ccaa, pct
        FROM perfil_ccaa
        WHERE cluster_id = :cluster_id
        ORDER BY pct DESC
        """,
        {"cluster_id": cluster_id},
        conn=conn,
    )


def cargar_ejes_perfil(conn, cluster_id: int) -> pd.DataFrame:
    """Ejes ideológicos agregados del perfil."""
    if not _table_exists("perfil_ejes", conn=conn):
        return pd.DataFrame()
    return _q(
        """
        SELECT eje, media, mediana, sd, pct_izq, pct_centro, pct_der
        FROM perfil_ejes
        WHERE cluster_id = :cluster_id
        ORDER BY eje
        """,
        {"cluster_id": cluster_id},
        conn=conn,
    )


def cargar_perfil_completo(conn, cluster_id: int) -> dict[str, Any]:
    """
    Devuelve todos los datos para renderizar una ficha de perfil.
    Compatible con schema legacy (label) y schema v2 (nombre_perfil/color).
    """
    cols = _table_columns("perfiles_votante", conn=conn)
    if not cols:
        return {
            "perfil": {},
            "problemas": pd.DataFrame(),
            "ccaa": pd.DataFrame(),
            "voto": pd.DataFrame(),
            "ejes": pd.DataFrame(),
            "evolucion": pd.DataFrame(),
        }

    nombre_expr = "nombre_perfil" if "nombre_perfil" in cols else "label"
    color_expr = "color" if "color" in cols else "NULL::text"
    perfil_cols = [
        "cluster_id",
        f"{nombre_expr} AS nombre_perfil",
        f"{color_expr} AS color",
        "ideologia_media" if "ideologia_media" in cols else "NULL::numeric AS ideologia_media",
        "edad_media" if "edad_media" in cols else "NULL::numeric AS edad_media",
        "peso_demografico_pct" if "peso_demografico_pct" in cols else "NULL::numeric AS peso_demografico_pct",
        "n_respondentes" if "n_respondentes" in cols else "NULL::integer AS n_respondentes",
        "cohorte_generacional" if "cohorte_generacional" in cols else "NULL::text AS cohorte_generacional",
        "habitat_dominante" if "habitat_dominante" in cols else "NULL::text AS habitat_dominante",
        "clase_social_modal" if "clase_social_modal" in cols else "NULL::text AS clase_social_modal",
        "estudios_modal" if "estudios_modal" in cols else "NULL::text AS estudios_modal",
        "situacion_laboral_modal" if "situacion_laboral_modal" in cols else "NULL::text AS situacion_laboral_modal",
        "eje_redistribucion" if "eje_redistribucion" in cols else "NULL::numeric AS eje_redistribucion",
        "eje_inmigracion" if "eje_inmigracion" in cols else "NULL::numeric AS eje_inmigracion",
        "eje_territorial" if "eje_territorial" in cols else "NULL::numeric AS eje_territorial",
        "eje_valores" if "eje_valores" in cols else "NULL::numeric AS eje_valores",
        "satisfaccion_demo_media" if "satisfaccion_demo_media" in cols else "NULL::numeric AS satisfaccion_demo_media",
        "confianza_partidos_media" if "confianza_partidos_media" in cols else "NULL::numeric AS confianza_partidos_media",
        "interes_politica_media" if "interes_politica_media" in cols else "NULL::numeric AS interes_politica_media",
        "eco_personal_media" if "eco_personal_media" in cols else "NULL::numeric AS eco_personal_media",
        "eco_espana_media" if "eco_espana_media" in cols else "NULL::numeric AS eco_espana_media",
        "pct_pesimistas_eco" if "pct_pesimistas_eco" in cols else "NULL::numeric AS pct_pesimistas_eco",
        "renta_media_anual" if "renta_media_anual" in cols else "NULL::numeric AS renta_media_anual",
        "pct_alquiler" if "pct_alquiler" in cols else "NULL::numeric AS pct_alquiler",
        "pct_paro" if "pct_paro" in cols else "NULL::numeric AS pct_paro",
        "distribucion_voto_json" if "distribucion_voto_json" in cols else "NULL::text AS distribucion_voto_json",
        "descripcion_perfil_llm" if "descripcion_perfil_llm" in cols else "NULL::text AS descripcion_perfil_llm",
        "tipo_perfil" if "tipo_perfil" in cols else "'predefinido'::text AS tipo_perfil",
        "fuente_datos" if "fuente_datos" in cols else "'sintetico'::text AS fuente_datos",
        "fecha_calculo" if "fecha_calculo" in cols else "NULL::timestamptz AS fecha_calculo",
    ]
    perfil_sql = "SELECT " + ", ".join(perfil_cols) + " FROM perfiles_votante WHERE cluster_id = :cluster_id"
    perfil = _q(perfil_sql, {"cluster_id": cluster_id}, conn=conn)

    problemas = cargar_problemas_perfil(conn, int(cluster_id))
    ccaa = cargar_ccaa_perfil(conn, int(cluster_id))
    voto = cargar_voto_perfil(conn, int(cluster_id))
    if voto.empty and not perfil.empty:
        # Fallback legacy: usar el JSON agregado del perfil cuando no existe la tabla satélite.
        raw = perfil.iloc[0].get("distribucion_voto_json")
        if raw:
            try:
                parsed = json.loads(raw) if isinstance(raw, str) else raw
                if isinstance(parsed, dict):
                    voto = pd.DataFrame(
                        [
                            {"partido": str(k), "pct_intencion": float(v), "pct_recuerdo": None}
                            for k, v in parsed.items()
                            if v is not None
                        ]
                    )
                elif isinstance(parsed, list):
                    rows: list[dict[str, Any]] = []
                    for item in parsed:
                        if not isinstance(item, dict):
                            continue
                        partido = item.get("partido") or item.get("categoria")
                        if not partido:
                            continue
                        rows.append(
                            {
                                "partido": str(partido),
                                "pct_intencion": item.get("pct_intencion", item.get("pct")),
                                "pct_recuerdo": item.get("pct_recuerdo"),
                            }
                        )
                    voto = pd.DataFrame(rows)
                if not voto.empty:
                    voto["pct_intencion"] = pd.to_numeric(voto["pct_intencion"], errors="coerce")
                    if "pct_recuerdo" in voto.columns:
                        voto["pct_recuerdo"] = pd.to_numeric(voto["pct_recuerdo"], errors="coerce")
                    voto = voto.sort_values("pct_intencion", ascending=False).reset_index(drop=True)
            except Exception:
                voto = pd.DataFrame()

    ejes = cargar_ejes_perfil(conn, int(cluster_id))

    evolucion = pd.DataFrame()
    if _table_exists("macro_series_perfil", conn=conn):
        evolucion = _q(
            """
            SELECT periodo, partido, valor
            FROM macro_series_perfil
            WHERE cluster_id = :cluster_id
            ORDER BY periodo
            """,
            {"cluster_id": cluster_id},
            conn=conn,
        )

    return {
        "perfil": perfil.iloc[0].to_dict() if not perfil.empty else {},
        "problemas": problemas,
        "ccaa": ccaa,
        "voto": voto,
        "ejes": ejes,
        "evolucion": evolucion,
    }


def cargar_lista_perfiles(conn, tipo: str | None = None) -> pd.DataFrame:
    """Lista de perfiles para selectores de UI."""
    cols = _table_columns("perfiles_votante", conn=conn)
    if not cols:
        return pd.DataFrame()
    nombre_expr = "nombre_perfil" if "nombre_perfil" in cols else "label"
    color_expr = "color" if "color" in cols else "NULL::text"
    tipo_expr = "tipo_perfil" if "tipo_perfil" in cols else "'predefinido'::text"
    fuente_expr = "fuente_datos" if "fuente_datos" in cols else "'sintetico'::text"
    ideologia_expr = "ideologia_media" if "ideologia_media" in cols else "NULL::numeric"
    peso_expr = "peso_demografico_pct" if "peso_demografico_pct" in cols else "NULL::numeric"
    cohorte_expr = "cohorte_generacional" if "cohorte_generacional" in cols else "NULL::text"
    n_expr = "n_respondentes" if "n_respondentes" in cols else "NULL::integer"
    sql = f"""
        SELECT cluster_id,
               {nombre_expr} AS nombre_perfil,
               {color_expr} AS color,
               {ideologia_expr} AS ideologia_media,
               {peso_expr} AS peso_demografico_pct,
               {cohorte_expr} AS cohorte_generacional,
               {n_expr} AS n_respondentes,
               {tipo_expr} AS tipo_perfil,
               {fuente_expr} AS fuente_datos
        FROM perfiles_votante
    """
    params: dict[str, Any] = {}
    if tipo:
        sql += " WHERE " + ("tipo_perfil = :tipo" if "tipo_perfil" in cols else "1=1")
        if "tipo_perfil" in cols:
            params["tipo"] = tipo
    sql += " ORDER BY peso_demografico_pct DESC NULLS LAST, cluster_id"
    return _q(sql, params if params else None, conn=conn)


def cargar_perfiles_personalizados(conn, usuario: str = "default") -> pd.DataFrame:
    if not _table_exists("perfiles_personalizados", conn=conn):
        return pd.DataFrame()
    return _q(
        """
        SELECT perfil_id, nombre, n_respondentes, pct_poblacion,
               cluster_mas_cercano, similitud_cluster,
               creado_en, actualizado_en
        FROM perfiles_personalizados
        WHERE usuario = :usuario
        ORDER BY actualizado_en DESC
        """,
        {"usuario": usuario},
        conn=conn,
    )


def cargar_perfil_personalizado_detalle(conn, perfil_id: int) -> dict[str, Any]:
    if not _table_exists("perfiles_personalizados", conn=conn):
        return {}
    pv_cols = _table_columns("perfiles_votante", conn=conn)
    nombre_expr = "pv.nombre_perfil" if "nombre_perfil" in pv_cols else "pv.label"
    color_expr = "pv.color" if "color" in pv_cols else "NULL::text"
    row = _q(
        f"""
        SELECT pp.*,
               {nombre_expr} AS nombre_cluster_cercano,
               {color_expr} AS color_cluster
        FROM perfiles_personalizados pp
        LEFT JOIN perfiles_votante pv ON pv.cluster_id = pp.cluster_mas_cercano
        WHERE pp.perfil_id = :perfil_id
        """,
        {"perfil_id": perfil_id},
        conn=conn,
    )
    if row.empty:
        return {}
    r = row.iloc[0].to_dict()
    try:
        r["filtros"] = json.loads(r.get("filtros_json") or "{}")
    except Exception:
        r["filtros"] = {}
    try:
        r["resultado"] = json.loads(r.get("resultado_json") or "{}")
    except Exception:
        r["resultado"] = {}
    return r


def guardar_descripcion_llm_perfil(conn, cluster_id: int, descripcion: str) -> None:
    """Actualiza descripcion LLM de un perfil."""
    cols = _table_columns("perfiles_votante", conn=conn)
    if "descripcion_perfil_llm" not in cols:
        return
    with conn.cursor() as cur:
        if "fecha_calculo" in cols:
            cur.execute(
                """
                UPDATE perfiles_votante
                SET descripcion_perfil_llm = %s, fecha_calculo = NOW()
                WHERE cluster_id = %s
                """,
                (descripcion, cluster_id),
            )
        else:
            cur.execute(
                """
                UPDATE perfiles_votante
                SET descripcion_perfil_llm = %s
                WHERE cluster_id = %s
                """,
                (descripcion, cluster_id),
            )
    conn.commit()


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


def _extract_cluster_id_from_filtros(filtros: dict[str, Any]) -> int | None:
    if not isinstance(filtros, dict):
        return None
    raw = filtros.get("cluster_id")
    if raw is None:
        return None
    if isinstance(raw, (list, tuple, set)):
        raw = next(iter(raw), None)
    try:
        return int(str(raw))
    except Exception:
        return None


def cargar_distribucion_campo_perfil_microdatos(
    filtros_o_conn: Any,
    campo_o_cluster: Any,
    limit: int | str = 12,
    campo: str | None = None,
) -> pd.DataFrame:
    """
    Compatibilidad dual:
    - Legacy: cargar_distribucion_campo_perfil_microdatos(filtros: dict, campo: str, limit=12)
      -> devuelve columnas categoria/peso desde microdatos_encuesta.
    - Nuevo:  cargar_distribucion_campo_perfil_microdatos(conn, cluster_id: int, campo: str)
      -> devuelve la tabla satélite equivalente.
    """
    # API nueva conn+cluster+campo:
    #  - cargar_distribucion_campo_perfil_microdatos(conn, cluster_id, campo="intencion_voto")
    #  - cargar_distribucion_campo_perfil_microdatos(conn, cluster_id, "intencion_voto")
    if not isinstance(filtros_o_conn, dict):
        conn = filtros_o_conn
        try:
            cluster_id = int(campo_o_cluster)
        except Exception:
            return pd.DataFrame()
        campo_resolved = campo or (str(limit) if isinstance(limit, str) else "")
        if not campo_resolved:
            return pd.DataFrame()
        if campo_resolved in {"intencion_voto", "recuerdo_voto"}:
            return cargar_voto_perfil(conn, cluster_id)
        if campo_resolved in {"problema_1", "principal_problema"}:
            return cargar_problemas_perfil(conn, cluster_id)
        if campo_resolved in {"ccaa", "ccaa_residencia"}:
            return cargar_ccaa_perfil(conn, cluster_id)
        if campo_resolved in {"ideologia", "ejes"}:
            return cargar_ejes_perfil(conn, cluster_id)
        return pd.DataFrame()

    filtros = filtros_o_conn
    campo = str(campo_o_cluster)

    # Si llega cluster_id explícito, priorizar tabla satélite (más rápida y robusta).
    cluster_id = _extract_cluster_id_from_filtros(filtros)
    if cluster_id is not None:
        conn = get_conn()
        if campo in {"intencion_voto", "recuerdo_voto"}:
            df = cargar_voto_perfil(conn, cluster_id)
            if df.empty:
                return df
            col = "pct_recuerdo" if campo == "recuerdo_voto" else "pct_intencion"
            return (
                df[["partido", col]]
                .rename(columns={"partido": "categoria", col: "peso"})
                .dropna(subset=["peso"])
                .sort_values("peso", ascending=False)
                .head(int(limit))
                .reset_index(drop=True)
            )
        if campo in {"principal_problema", "problema_1"}:
            df = cargar_problemas_perfil(conn, cluster_id)
            if df.empty:
                return df
            return (
                df[["problema", "pct"]]
                .rename(columns={"problema": "categoria", "pct": "peso"})
                .dropna(subset=["peso"])
                .head(int(limit))
                .reset_index(drop=True)
            )
        if campo in {"ccaa", "ccaa_residencia"}:
            df = cargar_ccaa_perfil(conn, cluster_id)
            if df.empty:
                return df
            return (
                df[["ccaa", "pct"]]
                .rename(columns={"ccaa": "categoria", "pct": "peso"})
                .dropna(subset=["peso"])
                .head(int(limit))
                .reset_index(drop=True)
            )
        if campo in {"ideologia", "ejes"}:
            df = cargar_ejes_perfil(conn, cluster_id)
            if df.empty:
                return df
            return (
                df[["eje", "media"]]
                .rename(columns={"eje": "categoria", "media": "peso"})
                .dropna(subset=["peso"])
                .head(int(limit))
                .reset_index(drop=True)
            )

    # API legacy contra microdatos crudos.
    _ensure_microdatos_schema()
    if campo != "ccaa_residencia" and campo not in _CAMPOS_PERFIL_PERMITIDOS:
        raise ValueError(
            f"Campo '{campo}' no permitido. Valores válidos: {_CAMPOS_PERFIL_PERMITIDOS}"
        )
    where, params = _build_micro_filter_where(filtros, table_alias="me")
    params["limit"] = int(limit)
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
        return _q(sql, params)
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
    return _q(sql, params)


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


def cargar_resumen_perfil_microdatos_robusto(
    filtros: dict[str, Any],
    min_n_fiable: int = 100,
    min_n_warn: int = 30,
    min_n_minimo: int = 10,
) -> dict[str, Any]:
    """
    Genera siempre un perfil, relajando filtros progresivamente si el N es bajo.

    Devuelve:
      - resumen: DataFrame con n, peso_total, edad_media, ideologia_media
      - precision: 'alta' | 'media' | 'baja' | 'minima'
      - n_efectivo: int
      - filtros_activos: dict realmente usados
      - filtros_relajados: list[str] descartados
    """
    _ensure_microdatos_schema()

    orden_relajacion = [
        "religion",
        "situacion_economica_españa",
        "situacion_economica_personal",
        "satisfaccion_democracia",
        "ingresos_hogar",
        "ocupacion",
        "clase_social_subjetiva",
        "principal_problema",
        "tamano_habitat",
        "ccaa_id",
        "identidad_territorial",
        "situacion_laboral",
        "estudios",
        "grupo_edad",
        "sexo",
    ]

    filtros_activos = {
        k: v
        for k, v in (filtros or {}).items()
        if v and str(v).strip().lower() not in {"todos", "all", ""}
    }
    filtros_usados = dict(filtros_activos)
    filtros_relajados: list[str] = []

    def _get_n(filtros_local: dict[str, Any]) -> tuple[int, pd.DataFrame]:
        where, params = _build_micro_filter_where(filtros_local)
        sql = (
            "SELECT COUNT(*) AS n, SUM(COALESCE(peso_muestral,1)) AS peso_total, "
            "AVG(edad) AS edad_media, AVG(escala_ideologica) AS ideologia_media "
            "FROM microdatos_encuesta WHERE __WHERE__"
        ).replace("__WHERE__", where)
        df = _q(sql, params)
        if df.empty:
            return 0, df
        n_val = df.iloc[0].get("n", 0)
        try:
            n_int = int(float(n_val or 0))
        except Exception:
            n_int = 0
        return n_int, df

    n, resumen = _get_n(filtros_usados)

    for campo in orden_relajacion:
        if n >= int(min_n_minimo):
            break
        if campo in filtros_usados:
            filtros_relajados.append(campo)
            del filtros_usados[campo]
            n, resumen = _get_n(filtros_usados)

    if n >= int(min_n_fiable):
        precision = "alta"
    elif n >= int(min_n_warn):
        precision = "media"
    elif n >= int(min_n_minimo):
        precision = "baja"
    else:
        precision = "minima"
        # Si sigue por debajo de mínimo, último recurso: sin filtros.
        n_global, resumen_global = _get_n({})
        if not resumen_global.empty:
            n = n_global
            resumen = resumen_global
            for k in list(filtros_usados.keys()):
                if k not in filtros_relajados:
                    filtros_relajados.append(k)
            filtros_usados = {}

    return {
        "resumen": resumen if isinstance(resumen, pd.DataFrame) else pd.DataFrame(),
        "precision": precision,
        "n_efectivo": int(max(0, n)),
        "filtros_activos": filtros_usados,
        "filtros_relajados": filtros_relajados,
    }


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


def cargar_ccaa_perfil_microdatos(filtros_o_conn: Any, limit: int = 10) -> pd.DataFrame:
    """
    Compatibilidad dual:
    - Legacy: cargar_ccaa_perfil_microdatos(filtros: dict, limit=10) -> categoria/peso
    - Nuevo:  cargar_ccaa_perfil_microdatos(conn, cluster_id) -> ccaa/pct
    """
    if isinstance(filtros_o_conn, dict):
        cluster_id = _extract_cluster_id_from_filtros(filtros_o_conn)
        if cluster_id is not None:
            conn = get_conn()
            df = cargar_ccaa_perfil(conn, cluster_id)
            if df.empty:
                return df
            return (
                df[["ccaa", "pct"]]
                .rename(columns={"ccaa": "categoria", "pct": "peso"})
                .dropna(subset=["peso"])
                .head(int(limit))
                .reset_index(drop=True)
            )
        _ensure_microdatos_schema()
        where, params = _build_micro_filter_where(filtros_o_conn)
        params["limit"] = int(limit)
        sql = (
            "SELECT identidad_territorial AS categoria, SUM(COALESCE(peso_muestral,1)) AS peso "
            "FROM microdatos_encuesta "
            "WHERE __WHERE__ "
            "  AND identidad_territorial IS NOT NULL "
            "GROUP BY identidad_territorial "
            "ORDER BY peso DESC "
            "LIMIT :limit"
        ).replace("__WHERE__", where)
        return _q(sql, params)

    conn = filtros_o_conn
    try:
        cluster_id = int(limit)
    except Exception:
        return pd.DataFrame()
    return cargar_ccaa_perfil(conn, cluster_id)


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


# ── Media infrastructure (QW2 / QW3 / QW4) ───────────────────────────────────

@st.cache_data(ttl=120)
def cargar_source_health() -> pd.DataFrame:
    """Estado de salud de las fuentes de ingesta (últimas 24 h por fuente)."""
    return _q(
        """
        SELECT DISTINCT ON (source_id)
            source_id, source_type, fecha, articles_count,
            errors_count, avg_latency_ms, freshness_lag_s, status, checked_at
        FROM source_health
        WHERE fecha >= CURRENT_DATE - INTERVAL '2 days'
        ORDER BY source_id, checked_at DESC
        """,
    )


@st.cache_data(ttl=120)
def cargar_scraper_incidents(solo_activos: bool = True) -> pd.DataFrame:
    """Incidencias recientes de scrapers, por defecto solo las no resueltas."""
    extra = "AND resolved = FALSE" if solo_activos else ""
    return _q(
        f"""
        SELECT source_id, error_type, severity, first_seen, last_seen,
               occurrence_count, details, resolved
        FROM scraper_incident
        WHERE last_seen >= NOW() - INTERVAL '7 days'
          {extra}
        ORDER BY
            CASE severity WHEN 'critical' THEN 1 WHEN 'major' THEN 2 ELSE 3 END,
            last_seen DESC
        LIMIT 50
        """,
    )


@st.cache_data(ttl=300)
def cargar_fact_checks(dias: int = 30, limit: int = 50) -> pd.DataFrame:
    """
    Devuelve fact-checks reales de la tabla fact_check.
    Devuelve DataFrame vacío si la tabla no existe todavía (migración pendiente).
    """
    return _q(
        """
        SELECT source_id, url, titular, resumen, claim_text,
               verdict, partidos_json, temas_json, published_at
        FROM fact_check
        WHERE published_at >= NOW() - (:dias * INTERVAL '1 day')
        ORDER BY published_at DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": limit},
    )


# ── Institucional (QW-C4) ─────────────────────────────────────────────────────

@st.cache_data(ttl=1800)
def cargar_boe_publicaciones(dias: int = 1, limit: int = 40, solo_alta_media: bool = False) -> pd.DataFrame:
    """
    Carga publicaciones BOE de la tabla boe_publication.
    Fallback: vacío (el caller llama a cargar_boe_hoy_rss() en ese caso).
    """
    extra = "AND relevancia IN ('Alta','Media')" if solo_alta_media else ""
    return _q(
        f"""
        SELECT boe_no, fecha, seccion, departamento, tipo_norma,
               titulo, resumen, url_html, relevancia, relevancia_score
        FROM boe_publication
        WHERE fecha >= CURRENT_DATE - :dias
          {extra}
        ORDER BY relevancia_score DESC, fecha DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": limit},
    )


@st.cache_data(ttl=300)
def cargar_agenda_institucional(
    dias_atras: int = 0,
    dias_adelante: int = 7,
    limit: int = 60,
) -> pd.DataFrame:
    """
    Carga agenda de decisores de la tabla agenda_item (modelo rico).
    Fallback: vacío (el caller usa fetch_all_agendas() en ese caso).
    """
    return _q(
        """
        SELECT main_actor, main_actor_id, party_id, host_institution,
               title, description, location, event_date,
               start_time::text AS time_start,
               event_type, topic, importance_score, certainty_score,
               source_id, source_url
        FROM agenda_item
        WHERE event_date BETWEEN CURRENT_DATE - :dias_atras
                              AND CURRENT_DATE + :dias_adelante
          AND status != 'CANCELLED'
        ORDER BY importance_score DESC, event_date, start_time NULLS LAST
        LIMIT :limit
        """,
        {"dias_atras": dias_atras, "dias_adelante": dias_adelante, "limit": limit},
    )


@st.cache_data(ttl=300)
def cargar_votaciones_pleno(dias: int = 14, limit: int = 30) -> pd.DataFrame:
    """
    Carga votaciones parlamentarias de la tabla parliamentary_vote.
    Fallback: cargar_votaciones() (tabla actividad_congreso legacy) si vacía.
    """
    df = _q(
        """
        SELECT session_date AS fecha, vote_type AS tipo_votacion,
               title AS titulo, result AS resultado,
               votos_favor, votos_contra, abstenciones,
               parties_favor_json, parties_against_json,
               topic AS tema, implications AS implicaciones, url_congreso
        FROM parliamentary_vote
        WHERE session_date >= CURRENT_DATE - :dias
        ORDER BY session_date DESC, votos_favor + votos_contra + abstenciones DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": limit},
    )
    if not df.empty:
        return df
    return cargar_votaciones()


@st.cache_data(ttl=1800)
def cargar_dm_actividad_legislativa(dias: int = 30) -> pd.DataFrame:
    """Actividad legislativa diaria desde data mart dm_legislative_activity_daily."""
    df = _q(
        """
        SELECT fecha, partido_siglas, chamber,
               n_iniciativas, n_votaciones, n_aprobadas, n_rechazadas, n_comisiones
        FROM dm_legislative_activity_daily
        WHERE fecha >= CURRENT_DATE - :dias
        ORDER BY fecha DESC, n_iniciativas DESC
        """,
        {"dias": dias},
    )
    if not df.empty:
        return df
    # Fallback: agrega desde actividad_congreso
    return _q(
        """
        SELECT fecha_publicacion::date AS fecha,
               partido_siglas,
               'congreso' AS chamber,
               COUNT(*) AS n_iniciativas,
               0 AS n_votaciones, 0 AS n_aprobadas, 0 AS n_rechazadas, 0 AS n_comisiones
        FROM actividad_congreso
        WHERE fecha >= CURRENT_DATE - :dias
          AND partido_siglas IS NOT NULL
        GROUP BY 1, 2, 3
        ORDER BY 1 DESC, 5 DESC
        """,
        {"dias": dias},
    )


# ── Catálogos dinámicos UI ────────────────────────────────────────────────────

@st.cache_data(ttl=3600)
def get_partidos_activos() -> list[dict[str, Any]]:
    df = _q(
        """
        SELECT
            siglas AS sigla,
            nombre_completo,
            COALESCE(activo, TRUE) AS activo
        FROM partidos
        WHERE COALESCE(activo, TRUE) = TRUE
        ORDER BY nombre_completo
        """
    )
    if df.empty:
        return []
    return df.to_dict(orient="records")


@st.cache_data(ttl=86400)
def get_elecciones_catalogo() -> list[dict[str, Any]]:
    df = _q(
        """
        SELECT id, tipo::text AS tipo, fecha, ambito
        FROM elecciones
        ORDER BY fecha DESC
        """
    )
    if df.empty:
        return []
    return df.to_dict(orient="records")


@st.cache_data(ttl=86400)
def get_ccaa_catalogo() -> list[str]:
    df = _q(
        """
        SELECT nombre
        FROM comunidades_autonomas
        ORDER BY nombre
        """
    )
    if df.empty:
        return []
    return df["nombre"].dropna().astype(str).tolist()


# =============================================================================
# BLOQUE MONITORIZACION MEDIOS / OPPOSITION / MULTICLIENTE (append-only)
# =============================================================================


def insertar_contenidos_mediaticos(registros: list[dict]) -> int:
    """Inserta contenidos mediaticos con deduplicacion por url."""
    if not registros:
        return 0
    if not _table_exists("contenido_mediatico"):
        return 0
    conn = get_conn()
    sql = """
        INSERT INTO contenido_mediatico
            (fuente, tipo, medio, autor, url, titular, resumen, texto_completo,
             fecha_publicacion, idioma, alcance_est, likes, shares, comentarios,
             sentimiento_score, sentimiento_label, tono, categoria, categorias_json,
             partidos_mencionados, personas_mencionadas, embedding_vector, procesado, cliente_id)
        VALUES
            (%(fuente)s, %(tipo)s, %(medio)s, %(autor)s, %(url)s, %(titular)s, %(resumen)s, %(texto_completo)s,
             %(fecha_publicacion)s, %(idioma)s, %(alcance_est)s, %(likes)s, %(shares)s, %(comentarios)s,
             %(sentimiento_score)s, %(sentimiento_label)s, %(tono)s, %(categoria)s, %(categorias_json)s,
             %(partidos_mencionados)s, %(personas_mencionadas)s, %(embedding_vector)s, %(procesado)s, %(cliente_id)s)
        ON CONFLICT (url) DO NOTHING
    """
    inserted = 0
    try:
        with conn.cursor() as cur:
            cur.executemany(sql, registros)
            inserted = int(cur.rowcount or 0)
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error("insertar_contenidos_mediaticos: %s", e, exc_info=True)
        return 0
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return inserted


@st.cache_data(ttl=300)
def cargar_contenido_mediatico(
    tipo: str | None = None,
    canal: str | None = None,
    categoria: str | None = None,
    partido: str | None = None,
    persona: str | None = None,
    ventana_dias: int = 7,
    limite: int = 500,
    cliente_id: int | None = None,
) -> pd.DataFrame:
    if not _table_exists("contenido_mediatico"):
        return pd.DataFrame()
    conditions = ["fecha_publicacion >= NOW() - (:dias * INTERVAL '1 day')"]
    params: dict[str, Any] = {"dias": int(ventana_dias), "limite": int(limite)}

    if tipo:
        conditions.append("tipo = :tipo")
        params["tipo"] = tipo
    if canal:
        conditions.append("fuente = :canal")
        params["canal"] = canal
    if categoria:
        conditions.append("categoria = :categoria")
        params["categoria"] = categoria
    if partido:
        conditions.append("partidos_mencionados ILIKE :partido")
        params["partido"] = f"%{partido}%"
    if persona:
        conditions.append("personas_mencionadas ILIKE :persona")
        params["persona"] = f"%{persona}%"
    if cliente_id is not None:
        conditions.append("(cliente_id = :cliente_id OR cliente_id IS NULL)")
        params["cliente_id"] = int(cliente_id)

    where = " AND ".join(conditions)
    return _q(
        f"""
        SELECT *
        FROM contenido_mediatico
        WHERE {where}
        ORDER BY fecha_publicacion DESC
        LIMIT :limite
        """,
        params,
    )


@st.cache_data(ttl=120)
def cargar_serie_objeto(
    tipo_objeto: str,
    valor: str,
    canal: str | None = None,
    ventana_dias: int = 30,
    cliente_id: int | None = None,
) -> pd.DataFrame:
    if not _table_exists("contenido_mediatico") or not _table_exists("tags_contenido"):
        return pd.DataFrame(columns=["fecha", "n_menciones", "sent_medio"])
    params: dict[str, Any] = {
        "tipo": tipo_objeto,
        "valor": valor,
        "dias": int(ventana_dias),
    }
    canal_filter = ""
    cliente_filter = ""
    if canal:
        canal_filter = "AND cm.fuente = :canal"
        params["canal"] = canal
    if cliente_id is not None:
        cliente_filter = "AND (cm.cliente_id = :cliente_id OR cm.cliente_id IS NULL)"
        params["cliente_id"] = int(cliente_id)

    return _q(
        f"""
        SELECT DATE_TRUNC('day', cm.fecha_publicacion) AS fecha,
               COUNT(*) AS n_menciones,
               AVG(cm.sentimiento_score) AS sent_medio
        FROM contenido_mediatico cm
        JOIN tags_contenido tc ON tc.contenido_id = cm.id
        WHERE tc.tipo_objeto = :tipo
          AND tc.valor ILIKE :valor
          AND cm.fecha_publicacion >= NOW() - (:dias * INTERVAL '1 day')
          {canal_filter}
          {cliente_filter}
        GROUP BY 1
        ORDER BY 1
        """,
        params,
    )


@st.cache_data(ttl=30)
def cargar_alertas_mediaticas(
    solo_no_leidas: bool = True,
    limite: int = 50,
    cliente_id: int | None = None,
) -> pd.DataFrame:
    if not _table_exists("alertas_mediaticas"):
        return pd.DataFrame()
    conditions: list[str] = []
    params: dict[str, Any] = {"limite": int(limite)}
    if solo_no_leidas:
        conditions.append("leida = false")
    if cliente_id is not None:
        conditions.append("(cliente_id = :cliente_id OR cliente_id IS NULL)")
        params["cliente_id"] = int(cliente_id)
    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    return _q(
        f"""
        SELECT *
        FROM alertas_mediaticas
        {where}
        ORDER BY fecha DESC
        LIMIT :limite
        """,
        params,
    )


def insertar_declaracion(registro: dict) -> int | None:
    if not _table_exists("declaraciones_politicas"):
        return None
    conn = get_conn()
    sql = """
        INSERT INTO declaraciones_politicas
            (persona, partido, fecha, medio, contexto, texto, tema, subtema,
             posicion_x, posicion_y, url, cliente_id)
        VALUES
            (%(persona)s, %(partido)s, %(fecha)s, %(medio)s, %(contexto)s, %(texto)s,
             %(tema)s, %(subtema)s, %(posicion_x)s, %(posicion_y)s, %(url)s, %(cliente_id)s)
        ON CONFLICT (url, texto) DO NOTHING
        RETURNING id
    """
    try:
        with conn.cursor() as cur:
            cur.execute(sql, registro)
            row = cur.fetchone()
        conn.commit()
        return int(row[0]) if row else None
    except Exception as e:
        conn.rollback()
        logger.error("insertar_declaracion: %s", e, exc_info=True)
        return None
    finally:
        try:
            conn.close()
        except Exception:
            pass


@st.cache_data(ttl=120)
def cargar_declaraciones(
    persona: str | None = None,
    partido: str | None = None,
    tema: str | None = None,
    ventana_dias: int = 365,
    limite: int = 500,
    cliente_id: int | None = None,
) -> pd.DataFrame:
    if not _table_exists("declaraciones_politicas"):
        return pd.DataFrame()
    conditions = ["fecha >= NOW() - (:dias * INTERVAL '1 day')"]
    params: dict[str, Any] = {"dias": int(ventana_dias), "limite": int(limite)}

    if persona:
        conditions.append("persona ILIKE :persona")
        params["persona"] = f"%{persona}%"
    if partido:
        conditions.append("partido ILIKE :partido")
        params["partido"] = f"%{partido}%"
    if tema:
        conditions.append("tema = :tema")
        params["tema"] = tema
    if cliente_id is not None:
        conditions.append("(cliente_id = :cliente_id OR cliente_id IS NULL)")
        params["cliente_id"] = int(cliente_id)

    where = " AND ".join(conditions)
    return _q(
        f"""
        SELECT id, persona, partido, fecha, medio, contexto, texto, tema, subtema,
               posicion_x, posicion_y, url
        FROM declaraciones_politicas
        WHERE {where}
        ORDER BY fecha DESC
        LIMIT :limite
        """,
        params,
    )


def insertar_contradiccion(c: Any) -> None:
    if not _table_exists("contradicciones"):
        return
    conn = get_conn()
    sql = """
        INSERT INTO contradicciones
            (decl_a_id, decl_b_id, persona, partido, tema, tipo, confianza,
             descripcion, gravedad, dias_entre, cliente_id)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                (
                    c.decl_a_id,
                    c.decl_b_id,
                    c.persona,
                    c.partido,
                    c.tema,
                    c.tipo,
                    c.confianza,
                    c.descripcion,
                    c.gravedad,
                    c.dias_entre,
                    None,
                ),
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error("insertar_contradiccion: %s", e, exc_info=True)
    finally:
        try:
            conn.close()
        except Exception:
            pass


@st.cache_data(ttl=120)
def cargar_contradicciones(
    persona: str | None = None,
    partido: str | None = None,
    gravedad: str | None = None,
    solo_validadas: bool = False,
    limite: int = 100,
) -> pd.DataFrame:
    if not _table_exists("contradicciones") or not _table_exists("declaraciones_politicas"):
        return pd.DataFrame()
    conditions: list[str] = []
    params: dict[str, Any] = {"limite": int(limite)}

    if persona:
        conditions.append("c.persona ILIKE :persona")
        params["persona"] = f"%{persona}%"
    if partido:
        conditions.append("c.partido ILIKE :partido")
        params["partido"] = f"%{partido}%"
    if gravedad:
        conditions.append("c.gravedad = :gravedad")
        params["gravedad"] = gravedad
    if solo_validadas:
        conditions.append("c.validada = true")

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    return _q(
        f"""
        SELECT c.*, da.texto AS texto_a, da.fecha AS fecha_a,
               db.texto AS texto_b, db.fecha AS fecha_b
        FROM contradicciones c
        LEFT JOIN declaraciones_politicas da ON da.id = c.decl_a_id
        LEFT JOIN declaraciones_politicas db ON db.id = c.decl_b_id
        {where}
        ORDER BY c.confianza DESC NULLS LAST, c.fecha_deteccion DESC
        LIMIT :limite
        """,
        params,
    )


def insertar_argumentario(a: Any, cliente_id: int | None = None) -> int | None:
    if not _table_exists("argumentarios"):
        return None
    conn = get_conn()
    sql = """
        INSERT INTO argumentarios (tipo, tema, adversario, partido_propio, contenido, cliente_id)
        VALUES (%(tipo)s, %(tema)s, %(adversario)s, %(partido_propio)s, %(contenido)s, %(cliente_id)s)
        RETURNING id
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                {
                    "tipo": a.tipo,
                    "tema": a.tema,
                    "adversario": a.adversario,
                    "partido_propio": a.partido_propio,
                    "contenido": a.contenido,
                    "cliente_id": cliente_id,
                },
            )
            row = cur.fetchone()
        conn.commit()
        return int(row[0]) if row else None
    except Exception as e:
        conn.rollback()
        logger.error("insertar_argumentario: %s", e, exc_info=True)
        return None
    finally:
        try:
            conn.close()
        except Exception:
            pass


def cargar_mensajes_campana(
    cliente_id: int | None = None,
    tipo: str | None = None,
    solo_activos: bool = True,
) -> list[dict[str, Any]]:
    if not _table_exists("mensajes_campana"):
        return []
    conn = get_conn()
    filters: list[str] = []
    params: dict[str, Any] = {}

    if solo_activos:
        filters.append("estado = 'activo'")
    if cliente_id is not None:
        filters.append("cliente_id = %(cliente_id)s")
        params["cliente_id"] = int(cliente_id)
    if tipo:
        filters.append("tipo = %(tipo)s")
        params["tipo"] = tipo

    where = "WHERE " + " AND ".join(filters) if filters else ""
    sql = f"""
        SELECT id, titulo, mensaje, tipo, estado, fecha_inicio, fecha_fin, autor, creado_en
        FROM mensajes_campana
        {where}
        ORDER BY creado_en DESC
    """
    try:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())
    except Exception as e:
        logger.warning("cargar_mensajes_campana: %s", e)
        return []
    finally:
        try:
            conn.close()
        except Exception:
            pass


def insertar_mensaje_campana(
    titulo: str,
    mensaje: str,
    tipo: str,
    cliente_id: int | None = None,
    fecha_inicio: Any | None = None,
    fecha_fin: Any | None = None,
    autor: str | None = None,
) -> bool:
    if not _table_exists("mensajes_campana"):
        return False
    conn = get_conn()
    sql = """
        INSERT INTO mensajes_campana
            (cliente_id, titulo, mensaje, tipo, estado, fecha_inicio, fecha_fin, autor)
        VALUES
            (%(cliente_id)s, %(titulo)s, %(mensaje)s, %(tipo)s, 'activo', %(fecha_inicio)s, %(fecha_fin)s, %(autor)s)
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                {
                    "cliente_id": cliente_id,
                    "titulo": titulo,
                    "mensaje": mensaje,
                    "tipo": tipo,
                    "fecha_inicio": fecha_inicio,
                    "fecha_fin": fecha_fin,
                    "autor": autor,
                },
            )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error("insertar_mensaje_campana: %s", e, exc_info=True)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass


@st.cache_data(ttl=120)
def cargar_decisiones_estrategicas(
    cliente_id: int | None = None,
    tipo: str | None = None,
    limite: int = 50,
) -> list[dict[str, Any]]:
    if not _table_exists("decisiones_estrategicas"):
        return []
    conn = get_conn()
    filters: list[str] = []
    params: dict[str, Any] = {"limite": int(limite)}
    if cliente_id is not None:
        filters.append("cliente_id = %(cliente_id)s")
        params["cliente_id"] = int(cliente_id)
    if tipo:
        filters.append("tipo = %(tipo)s")
        params["tipo"] = tipo

    where = "WHERE " + " AND ".join(filters) if filters else ""
    sql = f"""
        SELECT id, fecha, tipo, descripcion, resultado, lecciones, etiquetas, datos_contexto, creado_en
        FROM decisiones_estrategicas
        {where}
        ORDER BY fecha DESC
        LIMIT %(limite)s
    """
    try:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())
    except Exception as e:
        logger.warning("cargar_decisiones_estrategicas: %s", e)
        return []
    finally:
        try:
            conn.close()
        except Exception:
            pass


def insertar_decision_estrategica(
    fecha: Any,
    tipo: str,
    descripcion: str,
    datos_contexto: dict | None = None,
    resultado: str | None = None,
    lecciones: str | None = None,
    etiquetas: list[str] | None = None,
    cliente_id: int | None = None,
) -> bool:
    if not _table_exists("decisiones_estrategicas"):
        return False
    conn = get_conn()
    sql = """
        INSERT INTO decisiones_estrategicas
            (cliente_id, fecha, tipo, descripcion, datos_contexto, resultado, lecciones, etiquetas)
        VALUES
            (%(cliente_id)s, %(fecha)s, %(tipo)s, %(descripcion)s,
             %(datos_contexto)s::jsonb, %(resultado)s, %(lecciones)s, %(etiquetas)s)
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                {
                    "cliente_id": cliente_id,
                    "fecha": fecha,
                    "tipo": tipo,
                    "descripcion": descripcion,
                    "datos_contexto": json.dumps(datos_contexto or {}),
                    "resultado": resultado,
                    "lecciones": lecciones,
                    "etiquetas": etiquetas or [],
                },
            )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error("insertar_decision_estrategica: %s", e, exc_info=True)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass


@st.cache_data(ttl=120)
def buscar_decisiones_similares(
    texto_query: str,
    cliente_id: int | None = None,
    limite: int = 5,
) -> list[dict[str, Any]]:
    if not _table_exists("decisiones_estrategicas"):
        return []
    conn = get_conn()
    params: dict[str, Any] = {"query": texto_query, "limite": int(limite)}
    cliente_filter = ""
    if cliente_id is not None:
        cliente_filter = "AND cliente_id = %(cliente_id)s"
        params["cliente_id"] = int(cliente_id)

    sql = f"""
        SELECT id, fecha, tipo, descripcion, resultado, lecciones,
               ts_rank(
                   to_tsvector('spanish', descripcion || ' ' || COALESCE(lecciones, '')),
                   plainto_tsquery('spanish', %(query)s)
               ) AS rank
        FROM decisiones_estrategicas
        WHERE to_tsvector('spanish', descripcion || ' ' || COALESCE(lecciones, ''))
              @@ plainto_tsquery('spanish', %(query)s)
        {cliente_filter}
        ORDER BY rank DESC
        LIMIT %(limite)s
    """
    try:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())
    except Exception as e:
        logger.warning("buscar_decisiones_similares: %s", e)
        return []
    finally:
        try:
            conn.close()
        except Exception:
            pass

# ── BLOQUE 7: voto blando y transferencia ───────────────────────────────────

@st.cache_data(ttl=180)
def cargar_scores_voto_blando(
    circunscripciones: list[str] | None = None,
    fecha: str | None = None,
    cliente_id: int | None = None,
    segmento_edad: str | None = None,
) -> pd.DataFrame:
    if not _table_exists("voto_blando_territorial"):
        return pd.DataFrame()

    filtros = ["1=1"]
    params: dict[str, Any] = {}
    if cliente_id is not None:
        filtros.append("(cliente_id = :cliente_id OR cliente_id IS NULL)")
        params["cliente_id"] = int(cliente_id)
    if fecha:
        filtros.append("fecha_calculo = :fecha")
        params["fecha"] = fecha
    if segmento_edad:
        filtros.append("segmento_edad = :segmento_edad")
        params["segmento_edad"] = segmento_edad

    where = " AND ".join(filtros)
    df = _q(
        f"""
        SELECT *
        FROM voto_blando_territorial
        WHERE {where}
        ORDER BY fecha_calculo DESC, circunscripcion
        """,
        params,
    )
    if df.empty:
        return df
    if circunscripciones:
        sel = {str(x) for x in circunscripciones}
        df = df[df["circunscripcion"].astype(str).isin(sel)]
    return df.reset_index(drop=True)


@st.cache_data(ttl=180)
def cargar_matriz_transferencia(
    circunscripcion: str = "nacional",
    eleccion_ref: str | None = None,
    cliente_id: int | None = None,
) -> pd.DataFrame:
    if not _table_exists("matriz_transferencia"):
        return pd.DataFrame()

    filtros = ["circunscripcion = :circ"]
    params: dict[str, Any] = {"circ": circunscripcion}
    if cliente_id is not None:
        filtros.append("(cliente_id = :cliente_id OR cliente_id IS NULL)")
        params["cliente_id"] = int(cliente_id)
    if eleccion_ref:
        filtros.append("eleccion_ref = :eleccion_ref")
        params["eleccion_ref"] = eleccion_ref

    return _q(
        f"""
        SELECT *
        FROM matriz_transferencia
        WHERE {' AND '.join(filtros)}
        ORDER BY fecha_calculo DESC
        LIMIT 500
        """,
        params,
    )


def guardar_scores_voto_blando(df: pd.DataFrame) -> int:
    if df.empty or not _table_exists("voto_blando_territorial"):
        return 0

    campos = [
        "cliente_id",
        "circunscripcion",
        "ambito",
        "fecha_calculo",
        "segmento_edad",
        "segmento_estudios",
        "segmento_ideologia",
        "partido_ref",
        "pct_voto_blando",
        "score_medio_blando",
        "pct_probable_abst",
        "pct_transferible",
        "n_electores_est",
        "dist_quintiles",
        "fuente_datos",
        "modelo_version",
    ]
    cols_ok = [c for c in campos if c in df.columns]
    if not cols_ok:
        return 0

    conn = get_conn()
    n = 0
    sql = f"""
        INSERT INTO voto_blando_territorial ({', '.join(cols_ok)})
        VALUES ({', '.join([f'%({c})s' for c in cols_ok])})
        ON CONFLICT ON CONSTRAINT uq_voto_blando_segmento
        DO UPDATE SET
            pct_voto_blando = EXCLUDED.pct_voto_blando,
            score_medio_blando = EXCLUDED.score_medio_blando,
            pct_probable_abst = EXCLUDED.pct_probable_abst,
            pct_transferible = EXCLUDED.pct_transferible,
            dist_quintiles = EXCLUDED.dist_quintiles,
            modelo_version = EXCLUDED.modelo_version
    """
    try:
        with conn.cursor() as cur:
            for _, row in df[cols_ok].iterrows():
                payload = row.to_dict()
                if "dist_quintiles" in payload and isinstance(payload["dist_quintiles"], dict):
                    payload["dist_quintiles"] = json.dumps(payload["dist_quintiles"])
                cur.execute(sql, payload)
                n += 1
        conn.commit()
        return n
    except Exception as e:
        conn.rollback()
        logger.error("guardar_scores_voto_blando: %s", e, exc_info=True)
        return 0
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ── BLOQUE 8: analogías históricas ─────────────────────────────────────────

@st.cache_data(ttl=600)
def cargar_elecciones_historicas(
    pais: str | None = None,
    tipo: str | None = None,
    min_anio: int | None = None,
) -> pd.DataFrame:
    if _table_exists("elecciones_historicas"):
        filtros = ["1=1"]
        params: dict[str, Any] = {}
        if pais:
            filtros.append("pais = :pais")
            params["pais"] = pais
        if tipo:
            filtros.append("tipo = :tipo")
            params["tipo"] = tipo
        if min_anio:
            filtros.append("anio >= :min_anio")
            params["min_anio"] = int(min_anio)

        df = _q(
            f"""
            SELECT * FROM elecciones_historicas
            WHERE {' AND '.join(filtros)}
            ORDER BY pais, anio
            """,
            params,
        )
        if not df.empty:
            return df

    from dashboard.models.analogias_historicas import construir_df_seed

    df_seed = construir_df_seed()
    if pais:
        df_seed = df_seed[df_seed["pais"] == pais]
    if tipo:
        df_seed = df_seed[df_seed["tipo"] == tipo]
    if min_anio:
        df_seed = df_seed[df_seed["anio"] >= int(min_anio)]
    return df_seed.reset_index(drop=True)


@st.cache_data(ttl=180)
def cargar_contexto_actual(cliente_id: int | None = None) -> pd.DataFrame:
    if not _table_exists("contexto_electoral"):
        return pd.DataFrame()

    params: dict[str, Any] = {}
    where = ""
    if cliente_id is not None:
        where = "WHERE cliente_id = :cliente_id"
        params["cliente_id"] = int(cliente_id)

    return _q(
        f"""
        SELECT *
        FROM contexto_electoral
        {where}
        ORDER BY fecha_snapshot DESC
        LIMIT 1
        """,
        params,
    )


def guardar_eleccion_historica(row: dict[str, Any]) -> bool:
    if not _table_exists("elecciones_historicas"):
        return False

    campos = [k for k in row.keys() if k != "id"]
    if not campos:
        return False

    conn = get_conn()
    sql = f"""
        INSERT INTO elecciones_historicas ({', '.join(campos)})
        VALUES ({', '.join([f'%({c})s' for c in campos])})
        ON CONFLICT ON CONSTRAINT uq_eleccion
        DO UPDATE SET {', '.join([f'{c}=EXCLUDED.{c}' for c in campos if c not in {'pais', 'anio', 'mes', 'tipo'}])}
    """
    try:
        with conn.cursor() as cur:
            cur.execute(sql, row)
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error("guardar_eleccion_historica: %s", e, exc_info=True)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass


def seed_elecciones_historicas() -> int:
    if not _table_exists("elecciones_historicas"):
        return 0
    from dashboard.models.analogias_historicas import construir_df_seed

    df = construir_df_seed()
    n = 0
    for _, row in df.iterrows():
        if guardar_eleccion_historica(row.to_dict()):
            n += 1
    return n


# ── BLOQUE 9: observabilidad de datos (ingesta/calidad/SLA) ────────────────

@st.cache_data(ttl=120)
def cargar_frescura_tabla(tabla: str) -> pd.DataFrame:
    """
    Última ejecución de ingesta para una tabla y su SLA configurado.
    Devuelve dataframe vacío si no existe metadato de observabilidad.
    """
    if not _table_exists("etl_ingestas"):
        return pd.DataFrame()

    df_ing = _q(
        """
        SELECT
            pipeline,
            tabla_destino AS tabla,
            estado AS estado_ingesta,
            started_at,
            finished_at,
            registros_nuevos,
            registros_totales,
            error_mensaje
        FROM etl_ingestas
        WHERE tabla_destino = :tabla
        ORDER BY finished_at DESC NULLS LAST, started_at DESC
        LIMIT 1
        """,
        {"tabla": tabla},
    )
    if df_ing.empty:
        return df_ing

    if _table_exists("etl_sla"):
        df_sla = _q(
            """
            SELECT tabla, descripcion, cadencia, max_delay_min, owner, activo
            FROM etl_sla
            WHERE tabla = :tabla
            LIMIT 1
            """,
            {"tabla": tabla},
        )
        if not df_sla.empty:
            df_ing = df_ing.merge(df_sla, on="tabla", how="left")

    if _table_exists("data_quality_checks"):
        df_chk = _q(
            """
            SELECT
                tabla,
                check_name AS ultimo_check,
                status AS status_ultimo_check,
                detalle AS detalle_ultimo_check,
                created_at AS check_at
            FROM data_quality_checks
            WHERE tabla = :tabla
            ORDER BY created_at DESC
            LIMIT 1
            """,
            {"tabla": tabla},
        )
        if not df_chk.empty:
            df_ing = df_ing.merge(df_chk, on="tabla", how="left")

    if "finished_at" in df_ing.columns:
        ts = pd.to_datetime(df_ing["finished_at"], errors="coerce", utc=True)
        delay_min = (pd.Timestamp.now(tz="UTC") - ts).dt.total_seconds() / 60.0
        df_ing["delay_min"] = delay_min.round(1)

    if {"delay_min", "max_delay_min"}.issubset(df_ing.columns):
        ok = (pd.to_numeric(df_ing["delay_min"], errors="coerce")
              <= pd.to_numeric(df_ing["max_delay_min"], errors="coerce"))
        df_ing["sla_ok"] = ok.fillna(False)

    return df_ing


@st.cache_data(ttl=120)
def cargar_data_health(tablas: list[str] | None = None) -> pd.DataFrame:
    """
    Vista de salud de datos por tabla:
    - última ingesta
    - SLA
    - último check de calidad
    - estado agregado (ok/warn/fail)
    """
    if not _table_exists("etl_ingestas"):
        return pd.DataFrame()

    params: dict[str, Any] = {}
    where = ""
    if tablas:
        where = "WHERE tabla_destino = ANY(:tablas)"
        params["tablas"] = tablas

    has_sla = _table_exists("etl_sla")
    has_checks = _table_exists("data_quality_checks")

    with_parts = [
        f"""
        lr AS (
            SELECT DISTINCT ON (tabla_destino)
                tabla_destino AS tabla,
                pipeline,
                estado AS estado_ingesta,
                started_at,
                finished_at,
                registros_nuevos,
                registros_totales,
                error_mensaje
            FROM etl_ingestas
            {where}
            ORDER BY tabla_destino, finished_at DESC NULLS LAST, started_at DESC
        )
        """
    ]
    joins = []
    select_extra = []

    if has_sla:
        joins.append("LEFT JOIN etl_sla sla ON sla.tabla = lr.tabla")
        select_extra.extend(
            [
                "sla.descripcion",
                "sla.cadencia",
                "sla.max_delay_min",
                "sla.owner",
                "sla.activo",
            ]
        )
    else:
        select_extra.extend(
            [
                "NULL::text AS descripcion",
                "NULL::text AS cadencia",
                "NULL::int AS max_delay_min",
                "NULL::text AS owner",
                "NULL::bool AS activo",
            ]
        )

    if has_checks:
        with_parts.append(
            f"""
            lc AS (
                SELECT DISTINCT ON (tabla)
                    tabla,
                    status AS status_ultimo_check,
                    check_name AS ultimo_check,
                    created_at AS check_at
                FROM data_quality_checks
                {"WHERE tabla = ANY(:tablas)" if tablas else ""}
                ORDER BY tabla, created_at DESC
            )
            """
        )
        joins.append("LEFT JOIN lc ON lc.tabla = lr.tabla")
        select_extra.extend(
            [
                "lc.status_ultimo_check",
                "lc.ultimo_check",
                "lc.check_at",
            ]
        )
    else:
        select_extra.extend(
            [
                "NULL::text AS status_ultimo_check",
                "NULL::text AS ultimo_check",
                "NULL::timestamptz AS check_at",
            ]
        )

    sql = f"""
        WITH {','.join(with_parts)}
        SELECT
            lr.*,
            {', '.join(select_extra)}
        FROM lr
        {' '.join(joins)}
        ORDER BY lr.tabla
    """
    df = _q(sql, params)
    if df.empty:
        return df

    ts = pd.to_datetime(df.get("finished_at"), errors="coerce", utc=True)
    df["delay_min"] = ((pd.Timestamp.now(tz="UTC") - ts).dt.total_seconds() / 60.0).round(1)

    max_delay = pd.to_numeric(df.get("max_delay_min"), errors="coerce")
    df["sla_ok"] = (df["delay_min"] <= max_delay).fillna(False)

    def _estado(row: pd.Series) -> str:
        estado_ing = str(row.get("estado_ingesta", "")).lower()
        estado_chk = str(row.get("status_ultimo_check", "")).lower()
        if estado_ing == "error" or estado_chk == "fail":
            return "fail"
        if estado_ing == "warning" or estado_chk == "warn" or not bool(row.get("sla_ok", False)):
            return "warn"
        return "ok"

    df["estado_global"] = df.apply(_estado, axis=1)
    return df


@st.cache_data(ttl=300)
def cargar_checks_calidad(tabla: str | None = None, limite: int = 200) -> pd.DataFrame:
    """Histórico de checks de calidad (últimos N)."""
    if not _table_exists("data_quality_checks"):
        return pd.DataFrame()
    params: dict[str, Any] = {"limite": int(max(limite, 1))}
    where = ""
    if tabla:
        where = "WHERE tabla = :tabla"
        params["tabla"] = tabla
    return _q(
        f"""
        SELECT id, tabla, check_name, status, detalle, metric_value, threshold, created_at
        FROM data_quality_checks
        {where}
        ORDER BY created_at DESC
        LIMIT :limite
        """,
        params,
    )


@st.cache_data(ttl=3600)
def cargar_metadata_perfiles() -> pd.DataFrame:
    """Metadatos de generación de perfiles de microdatos."""
    if not _table_exists("perfiles_metadata"):
        return pd.DataFrame()
    return _q(
        """
        SELECT
            fecha_calculo,
            encuesta_origen,
            version_modelo,
            n_clusters,
            features_json,
            n_entrevistas,
            tasa_respuesta,
            creado_en
        FROM perfiles_metadata
        ORDER BY fecha_calculo DESC, version_modelo DESC
        """
    )


@st.cache_data(ttl=600)
def cargar_metadata_perfil_fecha(fecha: str) -> dict[str, Any]:
    """Metadato más reciente de perfiles para una fecha de cálculo concreta."""
    if not _table_exists("perfiles_metadata"):
        return {}
    df = _q(
        """
        SELECT
            fecha_calculo,
            encuesta_origen,
            version_modelo,
            n_clusters,
            features_json,
            n_entrevistas,
            tasa_respuesta,
            creado_en
        FROM perfiles_metadata
        WHERE fecha_calculo = :fecha
        ORDER BY version_modelo DESC
        LIMIT 1
        """,
        {"fecha": fecha},
    )
    if df.empty:
        return {}
    return df.iloc[0].to_dict()
