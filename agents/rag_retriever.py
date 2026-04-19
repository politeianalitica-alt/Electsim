<<<<<<< HEAD
"""
Recuperación de contexto para agentes: macro reciente + titulares de redes (RAG ligero).

``cluster_id`` se reserva para filtros futuros (geo, temas); hoy el contexto es nacional.
"""

from __future__ import annotations

import logging
import pandas as pd
from sqlalchemy import text
=======
from __future__ import annotations

import json
import logging
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine
>>>>>>> 6fda6ff (agentes 1)

logger = logging.getLogger(__name__)


<<<<<<< HEAD
def construir_extra_context(engine, cluster_id: int) -> str:
    """
    Ensambla un texto breve con últimos indicadores macro y posts recientes.

    Parameters
    ----------
    engine :
        Motor SQLAlchemy.
    cluster_id :
        Identificador de perfil (reservado para personalización territorial).
    """
    _ = cluster_id  # reservado: filtrar por CCAA / temas en evolución
    partes: list[str] = []

    sql_macro = text(
        """
        SELECT fecha, frecuencia, ipc_general, crecimiento_pib, deficit_publico_pib
=======
def _table_exists(engine: Engine, table_name: str) -> bool:
    sql = text("SELECT to_regclass(:tname) IS NOT NULL")
    with engine.connect() as conn:
        value = conn.execute(sql, {"tname": f"public.{table_name}"}).scalar()
    return bool(value)


def _column_exists(engine: Engine, table_name: str, column_name: str) -> bool:
    sql = text(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = :t
          AND column_name = :c
        LIMIT 1
        """
    )
    with engine.connect() as conn:
        return conn.execute(sql, {"t": table_name, "c": column_name}).first() is not None


def _sent_label(s: float) -> str:
    if s > 0.1:
        return "positivo"
    if s < -0.1:
        return "negativo"
    return "neutro"


def construir_extra_context(engine: Engine, cluster_id: int) -> str:
    """
    Ensambla contexto RAG personalizado por cluster:
      1. Último indicador macro relevante
      2. Noticias recientes (72h), priorizando temas del cluster
      3. Posts sociales más polarizados
    """
    partes: list[str] = []

    # 1) Macro
    sql_macro = text(
        """
        SELECT fecha, ipc_general, crecimiento_pib, deficit_publico_pib, tasa_paro
>>>>>>> 6fda6ff (agentes 1)
        FROM indicadores_macroeconomicos
        ORDER BY fecha DESC NULLS LAST
        LIMIT 1
        """
    )
    try:
        with engine.connect() as conn:
            df_m = pd.read_sql(sql_macro, conn)
        if not df_m.empty:
            row = df_m.iloc[0]
<<<<<<< HEAD
            bit = (
                f"Indicadores recientes (fecha {row.get('fecha')}): "
                f"IPC ~{row.get('ipc_general')}, "
                f"crecimiento PIB ~{row.get('crecimiento_pib')} %, "
                f"déficit/PIB ~{row.get('deficit_publico_pib')} %."
            )
            partes.append(bit)
    except Exception as exc:
        logger.debug("RAG macro no disponible: %s", exc)

    sql_posts = text(
        """
        SELECT autor_handle, texto, fecha_publicacion, sentimiento
        FROM posts_redes_sociales
        WHERE texto IS NOT NULL AND length(trim(texto)) > 10
        ORDER BY fecha_publicacion DESC NULLS LAST
        LIMIT 5
        """
    )
    try:
        with engine.connect() as conn:
            df_p = pd.read_sql(sql_posts, conn)
        if not df_p.empty:
            partes.append("Titulares / posts recientes (red social):")
            for _, r in df_p.iterrows():
                t = str(r.get("texto", ""))[:200].replace("\n", " ")
=======
            bits: list[str] = []
            if pd.notna(row.get("ipc_general")):
                bits.append(f"IPC {float(row['ipc_general']):.2f}%")
            if pd.notna(row.get("crecimiento_pib")):
                bits.append(f"PIB {float(row['crecimiento_pib']):.2f}%")
            if pd.notna(row.get("tasa_paro")):
                bits.append(f"paro {float(row['tasa_paro']):.2f}%")
            if pd.notna(row.get("deficit_publico_pib")):
                bits.append(f"déficit {float(row['deficit_publico_pib']):.2f}% PIB")
            if bits:
                partes.append(
                    f"Indicadores macroeconómicos (fecha {row.get('fecha')}): "
                    + ", ".join(bits)
                    + "."
                )
    except Exception as exc:
        logger.debug("RAG macro no disponible: %s", exc)

    # 2) Temas relevantes del cluster
    temas_cluster: list[str] = []
    try:
        cols = []
        if _column_exists(engine, "perfiles_votante", "temas_relevantes_json"):
            cols.append("temas_relevantes_json")
        if _column_exists(engine, "perfiles_votante", "distribucion_voto_json"):
            cols.append("distribucion_voto_json")
        if cols:
            sql_pf = text(
                f"SELECT {', '.join(cols)} FROM perfiles_votante WHERE cluster_id = :cid LIMIT 1"
            )
            with engine.connect() as conn:
                df_pf = pd.read_sql(sql_pf, conn, params={"cid": int(cluster_id)})
            if not df_pf.empty:
                tr = df_pf.iloc[0].get("temas_relevantes_json") if "temas_relevantes_json" in df_pf.columns else None
                if tr:
                    parsed = json.loads(tr) if isinstance(tr, str) else tr
                    if isinstance(parsed, list):
                        temas_cluster = [str(t) for t in parsed[:4] if str(t).strip()]
    except Exception as exc:
        logger.debug("RAG perfil temas no disponible: %s", exc)

    # 2b) Noticias recientes
    try:
        if _table_exists(engine, "noticias_raw"):
            sql_noticias = text(
                """
                SELECT titulo,
                       COALESCE(fuente_id, fuente, 'desconocida') AS fuente_id,
                       COALESCE(sentimiento, sentimiento_score, 0) AS sentimiento,
                       COALESCE(fecha_pub, fecha_publicacion) AS fecha_pub,
                       COALESCE(tema, categoria, '') AS tema
                FROM noticias_raw
                WHERE COALESCE(fecha_pub, fecha_publicacion) >= NOW() - INTERVAL '72 hours'
                  AND titulo IS NOT NULL
                ORDER BY ABS(COALESCE(sentimiento, sentimiento_score, 0)) DESC,
                         COALESCE(fecha_pub, fecha_publicacion) DESC
                LIMIT 40
                """
            )
        else:
            sql_noticias = text(
                """
                SELECT titular AS titulo,
                       COALESCE(fuente, 'desconocida') AS fuente_id,
                       COALESCE(sentimiento_score, 0) AS sentimiento,
                       fecha_publicacion AS fecha_pub,
                       COALESCE(categoria, '') AS tema
                FROM noticias_prensa
                WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '3 days'
                  AND titular IS NOT NULL
                ORDER BY ABS(COALESCE(sentimiento_score, 0)) DESC,
                         fecha_publicacion DESC
                LIMIT 40
                """
            )

        with engine.connect() as conn:
            df_n = pd.read_sql(sql_noticias, conn)

        if not df_n.empty:
            if temas_cluster:
                temas_set = {t.lower().strip() for t in temas_cluster}
                df_n["_prio"] = df_n["tema"].astype(str).str.lower().str.strip().apply(
                    lambda t: 0 if t in temas_set else 1
                )
                df_n = df_n.sort_values(by=["_prio", "fecha_pub"], ascending=[True, False])
            df_n = df_n.head(6)
            partes.append("Noticias recientes (últimas 72h):")
            for _, r in df_n.iterrows():
                s = float(r.get("sentimiento") or 0.0)
                sent_str = f" [{_sent_label(s)}]"
                partes.append(f"- {r.get('fuente_id', '?')}: {str(r.get('titulo', ''))[:180]}{sent_str}")
    except Exception as exc:
        logger.debug("RAG noticias no disponible: %s", exc)

    # 3) Redes sociales
    try:
        if _column_exists(engine, "posts_redes_sociales", "sentimiento_score"):
            sent_col = "COALESCE(sentimiento_score, 0)"
        else:
            sent_col = "0"
        sql_posts = text(
            f"""
            SELECT autor_handle, texto, {sent_col} AS sentimiento
            FROM posts_redes_sociales
            WHERE texto IS NOT NULL AND length(trim(texto)) > 10
            ORDER BY ABS({sent_col}) DESC, fecha_publicacion DESC NULLS LAST
            LIMIT 4
            """
        )
        with engine.connect() as conn:
            df_p = pd.read_sql(sql_posts, conn)
        if not df_p.empty:
            partes.append("Posts destacados en redes sociales:")
            for _, r in df_p.iterrows():
                t = str(r.get("texto", ""))[:160].replace("\n", " ")
>>>>>>> 6fda6ff (agentes 1)
                ah = r.get("autor_handle") or "?"
                partes.append(f"- @{ah}: {t}")
    except Exception as exc:
        logger.debug("RAG redes no disponible: %s", exc)

    return "\n".join(partes).strip()


<<<<<<< HEAD
def __main__() -> None:
    import os

    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    eng = create_engine(os.environ["DATABASE_URL"])
    print(construir_extra_context(eng, 0))


if __name__ == "__main__":
    __main__()
=======
if __name__ == "__main__":  # pragma: no cover
    import os
    from sqlalchemy import create_engine

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL no definida")
    eng = create_engine(db_url, pool_pre_ping=True)
    print(construir_extra_context(eng, cluster_id=1))
>>>>>>> 6fda6ff (agentes 1)
