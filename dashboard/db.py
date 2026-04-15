"""
Capa de acceso a datos para el dashboard.
Queries cacheadas con st.cache_data sobre el schema real de ElectSim.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Garantiza que el raíz del proyecto esté en el path, sea cual sea el cwd
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

load_dotenv(_ROOT / ".env")


# ── Conexión ──────────────────────────────────────────────────────────────────

@st.cache_resource
def get_engine() -> Engine:
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
    )
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=10)


def _q(sql: str, params: dict | None = None) -> pd.DataFrame:
    """Ejecuta una query y devuelve DataFrame; retorna vacío si falla."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            return pd.read_sql(text(sql), conn, params=params or {})
    except Exception as e:
        st.warning(f"Error de BD: {e}")
        return pd.DataFrame()


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
        LEFT JOIN comunidades_autonomas ca ON ca.id = COALESCE(re.ccaa_id, pr.ccaa_id)
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
            MAX(re.porcentaje)         AS pct_medio,
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

@st.cache_data(ttl=60)
def cargar_nowcasting() -> pd.DataFrame:
    """Última estimación por partido (fecha más reciente en BD)."""
    return _q(
        """
        SELECT DISTINCT ON (p.siglas)
            p.siglas        AS partido_siglas,
            p.nombre_completo AS partido_nombre,
            e.estimacion_pct,
            e.ic_95_inf,
            e.ic_95_sup,
            e.n_encuestas,
            e.fecha_estimacion AS fecha_calculo
        FROM estimaciones_voto_agregadas e
        JOIN partidos p ON p.id = e.partido_id
        ORDER BY p.siglas, e.fecha_estimacion DESC
        """
    )


@st.cache_data(ttl=60)
def cargar_serie_nowcasting(partido_siglas: str, dias: int = 180) -> pd.DataFrame:
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
        SELECT indicador, valor, fecha FROM (
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


@st.cache_data(ttl=300)
def cargar_macro_serie(columna: str, anios: int = 10) -> pd.DataFrame:
    """Serie temporal de un indicador macroeconómico."""
    columnas_validas = {
        "ipc_general", "crecimiento_pib",
        "prima_riesgo_bono10", "euribor_12m", "ibex35_cierre",
        "deuda_publica_pib", "deficit_publico_pib",
    }
    if columna not in columnas_validas:
        return pd.DataFrame()
    return _q(
        f"""
        SELECT fecha, {columna} AS valor
        FROM indicadores_macroeconomicos
        WHERE {columna} IS NOT NULL
          AND fecha >= CURRENT_DATE - INTERVAL '{anios * 365} days'
        ORDER BY fecha
        """
    )


# ── Perfiles de votante ───────────────────────────────────────────────────────

@st.cache_data(ttl=600)
def cargar_perfiles_votante() -> pd.DataFrame:
    return _q(
        """
        SELECT cluster_id,
               label                AS etiqueta,
               n_respondentes,
               peso_demografico_pct AS peso,
               ideologia_media      AS ideo_media,
               edad_media,
               descripcion_perfil_llm AS descripcion_llm,
               distribucion_voto_json
        FROM perfiles_votante
        ORDER BY peso_demografico_pct DESC NULLS LAST
        """
    )


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
    cond = "WHERE eleccion_id = :eid" if eleccion_id else ""
    return _q(
        f"""
        SELECT partidos_coalicion AS partidos,
               escanos_totales    AS escanos_total,
               es_minima          AS viable,
               n_partidos,
               distancia_ideologica,
               score_viabilidad   AS probabilidad
        FROM analisis_coaliciones
        {cond}
        ORDER BY escanos_totales DESC
        LIMIT 30
        """,
        {"eid": eleccion_id} if eleccion_id else {},
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
    cond = "AND leida = false" if solo_no_leidas else ""
    return _q(
        f"""
        SELECT tipo, severidad, titulo, descripcion, leida, created_at
        FROM alertas_sistema
        WHERE 1=1 {cond}
        ORDER BY created_at DESC
        LIMIT {limit}
        """
    )


@st.cache_data(ttl=30)
def cargar_scraping_log(limit: int = 20) -> pd.DataFrame:
    return _q(
        f"""
        SELECT fuente, tipo, estado, n_registros_nuevos, n_registros_duplicados,
               duracion_segundos, error_mensaje, created_at
        FROM scraping_log
        ORDER BY created_at DESC
        LIMIT {limit}
        """
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

@st.cache_data(ttl=60)
def cargar_noticias_recientes(dias: int = 7, limit: int = 50) -> pd.DataFrame:
    return _q("""
        SELECT fuente, titular, url, fecha_publicacion, categoria,
               partidos_mencionados, sentimiento_score, sentimiento_label,
               temas_json, relevancia_score
        FROM noticias_prensa
        WHERE fecha_publicacion >= CURRENT_DATE - :dias
        ORDER BY relevancia_score DESC NULLS LAST, fecha_publicacion DESC
        LIMIT :limit
    """, {"dias": dias, "limit": limit})


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
def cargar_agenda_hoy() -> pd.DataFrame:
    df = _q("""
        SELECT tema, n_noticias, sentimiento_medio, peso_agenda, tendencia
        FROM agenda_mediatica
        WHERE fecha = CURRENT_DATE
        ORDER BY n_noticias DESC
        LIMIT 25
    """)
    if not df.empty:
        return df
    return _q(
        """
        SELECT
            COALESCE(NULLIF(categoria, ''), 'general') AS tema,
            COUNT(*) AS n_noticias,
            AVG(sentimiento_score) AS sentimiento_medio,
            COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0) AS peso_agenda,
            'estable'::text AS tendencia
        FROM noticias_prensa
        WHERE fecha_publicacion = CURRENT_DATE
        GROUP BY 1
        ORDER BY n_noticias DESC
        LIMIT 25
        """
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
    cond = "AND indicador = :ind" if indicador else ""
    return _q(f"""
        SELECT indicador, valor, unidad, fecha, fuente
        FROM indicadores_sociales
        WHERE 1=1 {cond}
        ORDER BY indicador, fecha DESC
        LIMIT 200
    """, {"ind": indicador} if indicador else {})


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


@st.cache_data(ttl=120)
def cargar_perfiles_votante(limit: int = 30) -> pd.DataFrame:
    return _q(
        """
        SELECT cluster_id, label, n_respondentes, peso_demografico_pct,
               edad_media, ideologia_media, distribucion_voto_json, descripcion_perfil_llm
        FROM perfiles_votante
        ORDER BY peso_demografico_pct DESC NULLS LAST, cluster_id
        LIMIT :limit
        """,
        {"limit": limit},
    )
