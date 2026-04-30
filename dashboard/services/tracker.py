"""Servicio de tracker: objetos de seguimiento, series y alertas."""

from __future__ import annotations

from collections import Counter
from datetime import date, timedelta
import re
from typing import Any

import pandas as pd

from db.session import get_raw_conn
from etl.logger import get_logger

logger = get_logger(__name__)

_STOPWORDS_ES = {
    "de", "la", "el", "y", "en", "a", "los", "las", "un", "una", "con", "por", "para",
    "del", "al", "se", "que", "su", "sus", "como", "más", "mas", "es", "ha", "han",
    "tras", "sobre", "desde", "entre", "sin", "ante", "hoy", "ayer", "mañana", "ser",
    "esta", "este", "estos", "estas", "esa", "ese", "eso", "pero", "también",
}

_TOKEN_RE = re.compile(r"[a-záéíóúñü][a-záéíóúñü\\-]{2,}", flags=re.IGNORECASE)


def _table_exists(table_name: str) -> bool:
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass(%s)", (table_name,))
            row = cur.fetchone()
        return bool(row and row[0])
    except Exception:
        return False
    finally:
        conn.close()


def _q(sql: str, params: tuple | list | dict | None = None) -> pd.DataFrame:
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            if cur.description is None:
                return pd.DataFrame()
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
        return pd.DataFrame(rows, columns=cols)
    except Exception as exc:
        logger.error("tracker._q: %s", exc)
        return pd.DataFrame()
    finally:
        conn.close()


def listar_objetos(
    cliente_id: int | None,
    tipo: str | None = None,
    solo_activos: bool = True,
) -> pd.DataFrame:
    if not _table_exists("objetos_seguimiento"):
        return pd.DataFrame()

    clauses: list[str] = []
    params: list[Any] = []

    if cliente_id is None:
        clauses.append("cliente_id IS NULL")
    else:
        clauses.append("(cliente_id = %s OR cliente_id IS NULL)")
        params.append(int(cliente_id))

    if tipo:
        clauses.append("tipo = %s")
        params.append(tipo)

    if solo_activos:
        clauses.append("activo = TRUE")

    where = "WHERE " + "AND ".join(clauses) if clauses else ""

    return _q(
        f"""
        SELECT id, cliente_id, tipo, valor, activo, config_alertas, creado
        FROM objetos_seguimiento
        {where}
        ORDER BY tipo, valor
        """,
        tuple(params),
    )


def crear_objeto(
    cliente_id: int | None,
    tipo: str,
    valor: str,
    config_alertas: dict | None = None,
) -> int:
    if not _table_exists("objetos_seguimiento"):
        raise RuntimeError("Tabla objetos_seguimiento no existe. Ejecuta migraciones.")

    import json

    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO objetos_seguimiento
                    (cliente_id, tipo, valor, activo, config_alertas)
                VALUES (%s, %s, %s, TRUE, %s::jsonb)
                ON CONFLICT (tipo, valor, cliente_id) DO UPDATE
                    SET activo = TRUE,
                        config_alertas = EXCLUDED.config_alertas
                RETURNING id
                """,
                (
                    int(cliente_id) if cliente_id is not None else None,
                    str(tipo).strip(),
                    str(valor).strip(),
                    json.dumps(config_alertas or {}),
                ),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
        return int(new_id)
    finally:
        conn.close()


def eliminar_objeto(objeto_id: int) -> None:
    if not _table_exists("objetos_seguimiento"):
        return
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE objetos_seguimiento SET activo = FALSE WHERE id = %s",
                (int(objeto_id),),
            )
        conn.commit()
    finally:
        conn.close()


def cargar_serie_objeto(
    objeto_id: int,
    dias: int = 30,
    canales: list[str] | None = None,
) -> pd.DataFrame:
    fecha_desde = date.today() - timedelta(days=int(dias))

    if _table_exists("serie_temporal_objeto"):
        params: list[Any] = [int(objeto_id), fecha_desde]
        canal_filter = ""
        if canales:
            canal_filter = "AND canal = ANY(%s)"
            params.append(canales)
        return _q(
            f"""
            SELECT fecha, canal, n_menciones, sentiment_medio,
                   alcance_total, tono_ataque, tono_defensa, tono_propuesta
            FROM serie_temporal_objeto
            WHERE objeto_id = %s
              AND fecha >= %s
              {canal_filter}
            ORDER BY fecha ASC, canal ASC
            """,
            tuple(params),
        )

    # Fallback si no existe la tabla agregada.
    return _q(
        """
        SELECT
            DATE_TRUNC('day', cm.fecha_publicacion)::date AS fecha,
            CASE
                WHEN cm.tipo IN ('rss', 'prensa') THEN 'prensa'
                WHEN cm.tipo IN ('x', 'twitter', 'youtube', 'rrss') THEN 'rrss'
                WHEN cm.tipo IN ('boe', 'bocg', 'legislacion') THEN 'legislacion'
                WHEN cm.tipo IN ('agenda') THEN 'agenda'
                ELSE cm.tipo
            END AS canal,
            COUNT(*) AS n_menciones,
            AVG(cm.sentimiento_score) AS sentiment_medio,
            SUM(COALESCE(cm.alcance_est, 0)) AS alcance_total,
            SUM(CASE WHEN COALESCE(cm.tono, '') = 'ataque'THEN 1 ELSE 0 END) AS tono_ataque,
            SUM(CASE WHEN COALESCE(cm.tono, '') = 'defensa'THEN 1 ELSE 0 END) AS tono_defensa,
            SUM(CASE WHEN COALESCE(cm.tono, '') = 'propuesta'THEN 1 ELSE 0 END) AS tono_propuesta
        FROM tags_contenido tc
        JOIN contenido_mediatico cm ON cm.id = tc.contenido_id
        WHERE tc.objeto_id = %s
          AND cm.fecha_publicacion::date >= %s
        GROUP BY 1, 2
        ORDER BY 1 ASC, 2 ASC
        """,
        (int(objeto_id), fecha_desde),
    )


def cargar_top_contenido(
    objeto_id: int,
    dias: int = 7,
    limite: int = 20,
) -> pd.DataFrame:
    fecha_desde = date.today() - timedelta(days=int(dias))

    return _q(
        """
        WITH obj AS (
            SELECT id, tipo, valor
            FROM objetos_seguimiento
            WHERE id = %s
        )
        SELECT
            COALESCE(cm.titular, cm.resumen, LEFT(cm.texto_completo, 120)) AS titulo,
            cm.medio,
            cm.url,
            cm.fecha_publicacion AS fecha_pub,
            cm.sentimiento_score AS sentiment,
            cm.tono,
            cm.alcance_est,
            tc.valor AS valor_tag
        FROM contenido_mediatico cm
        JOIN tags_contenido tc ON tc.contenido_id = cm.id
        JOIN obj o ON (
            tc.objeto_id = o.id
            OR (
                tc.tipo_objeto = o.tipo
                AND LOWER(tc.valor) = LOWER(o.valor)
            )
        )
        WHERE cm.fecha_publicacion::date >= %s
        ORDER BY COALESCE(cm.alcance_est, 0) DESC, cm.fecha_publicacion DESC
        LIMIT %s
        """,
        (int(objeto_id), fecha_desde, int(limite)),
    )


def cargar_share_of_voice(
    cliente_id: int | None,
    tipo: str = "partido",
    dias: int = 30,
    canal: str | None = None,
) -> pd.DataFrame:
    fecha_desde = date.today() - timedelta(days=int(dias))

    if _table_exists("serie_temporal_objeto"):
        params: list[Any] = [tipo, fecha_desde]
        cliente_filter = ""
        canal_filter = ""
        if cliente_id is not None:
            cliente_filter = "AND (os.cliente_id = %s OR os.cliente_id IS NULL)"
            params.append(int(cliente_id))
        else:
            cliente_filter = "AND os.cliente_id IS NULL"

        if canal:
            canal_filter = "AND sto.canal = %s"
            params.append(canal)

        return _q(
            f"""
            WITH tot AS (
                SELECT
                    os.valor,
                    SUM(sto.n_menciones) AS total_menciones,
                    AVG(sto.sentiment_medio) AS sentiment_medio
                FROM objetos_seguimiento os
                JOIN serie_temporal_objeto sto ON sto.objeto_id = os.id
                WHERE os.tipo = %s
                  AND os.activo = TRUE
                  AND sto.fecha >= %s
                  {cliente_filter}
                  {canal_filter}
                GROUP BY os.valor
            ),
            agg AS (
                SELECT SUM(total_menciones) AS gran_total
                FROM tot
            )
            SELECT
                t.valor,
                t.total_menciones,
                CASE
                    WHEN a.gran_total IS NULL OR a.gran_total = 0 THEN 0
                    ELSE ROUND(100.0 * t.total_menciones / a.gran_total, 2)
                END AS share_pct,
                t.sentiment_medio
            FROM tot t
            CROSS JOIN agg a
            ORDER BY t.total_menciones DESC
            """,
            tuple(params),
        )

    params2: list[Any] = [tipo, fecha_desde]
    cliente_filter2 = ""
    if cliente_id is not None:
        cliente_filter2 = "AND (os.cliente_id = %s OR os.cliente_id IS NULL)"
        params2.append(int(cliente_id))
    else:
        cliente_filter2 = "AND os.cliente_id IS NULL"

    return _q(
        f"""
        WITH base AS (
            SELECT
                os.valor,
                COUNT(*) AS total_menciones,
                AVG(cm.sentimiento_score) AS sentiment_medio
            FROM objetos_seguimiento os
            JOIN tags_contenido tc ON tc.tipo_objeto = os.tipo AND LOWER(tc.valor) = LOWER(os.valor)
            JOIN contenido_mediatico cm ON cm.id = tc.contenido_id
            WHERE os.tipo = %s
              AND cm.fecha_publicacion::date >= %s
              {cliente_filter2}
            GROUP BY os.valor
        ),
        agg AS (
            SELECT SUM(total_menciones) AS gran_total FROM base
        )
        SELECT
            b.valor,
            b.total_menciones,
            CASE
                WHEN a.gran_total IS NULL OR a.gran_total = 0 THEN 0
                ELSE ROUND(100.0 * b.total_menciones / a.gran_total, 2)
            END AS share_pct,
            b.sentiment_medio
        FROM base b
        CROSS JOIN agg a
        ORDER BY b.total_menciones DESC
        """,
        tuple(params2),
    )


def cargar_alertas_pendientes(cliente_id: int | None, limite: int = 50) -> pd.DataFrame:
    if not _table_exists("alertas_tracker"):
        return pd.DataFrame()

    params: list[Any] = [int(limite)]
    cliente_filter = ""
    if cliente_id is not None:
        cliente_filter = "AND (os.cliente_id = %s OR os.cliente_id IS NULL)"
        params.insert(0, int(cliente_id))
    else:
        cliente_filter = "AND os.cliente_id IS NULL"

    sql = f"""
        SELECT
            at.id,
            at.tipo_alerta,
            at.descripcion,
            at.valor_detectado,
            at.umbral,
            at.canal,
            at.fecha_alerta,
            os.valor AS objeto_valor,
            os.tipo AS objeto_tipo
        FROM alertas_tracker at
        JOIN objetos_seguimiento os ON os.id = at.objeto_id
        WHERE at.leida = FALSE
          {cliente_filter}
        ORDER BY at.fecha_alerta DESC
        LIMIT %s
    """

    return _q(sql, tuple(params))


def marcar_alerta_leida(alerta_id: int) -> None:
    if not _table_exists("alertas_tracker"):
        return
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE alertas_tracker SET leida = TRUE WHERE id = %s",
                (int(alerta_id),),
            )
        conn.commit()
    finally:
        conn.close()


def sugerir_objetos(
    cliente_id: int | None,
    dias: int = 14,
    limite: int = 20,
    min_freq: int = 3,
) -> list[str]:
    """Sugiere objetos de seguimiento con frecuencia alta en contenido reciente.

    Estrategia:
    - toma titulares/resúmenes recientes,
    - extrae tokens de longitud >=3,
    - filtra stopwords y términos ya seguidos.
    """
    if not _table_exists("contenido_mediatico"):
        return []

    fecha_desde = date.today() - timedelta(days=int(dias))
    df = _q(
        """
        SELECT
            COALESCE(titular, '') AS titular,
            COALESCE(resumen, '') AS resumen
        FROM contenido_mediatico
        WHERE fecha_publicacion::date >= %s
        ORDER BY fecha_publicacion DESC
        LIMIT 1200
        """,
        (fecha_desde,),
    )
    if df.empty:
        return []

    existentes = set()
    df_obj = listar_objetos(cliente_id=cliente_id, solo_activos=True)
    if not df_obj.empty and "valor"in df_obj.columns:
        existentes = {str(v).strip().lower() for v in df_obj["valor"].dropna().tolist()}

    bag: Counter[str] = Counter()
    for _, row in df.iterrows():
        text = f"{row.get('titular', '')} {row.get('resumen', '')}".lower()
        for tok in _TOKEN_RE.findall(text):
            tok = tok.strip("- ").lower()
            if len(tok) < 3:
                continue
            if tok in _STOPWORDS_ES:
                continue
            if tok.isdigit():
                continue
            bag[tok] += 1

    sugeridas: list[str] = []
    for token, freq in bag.most_common(200):
        if freq < int(min_freq):
            break
        if token in existentes:
            continue
        sugeridas.append(token)
        if len(sugeridas) >= int(limite):
            break
    return sugeridas
