"""
Recuperación de contexto para agentes: macro reciente + titulares de redes (RAG ligero).

``cluster_id`` se reserva para filtros futuros (geo, temas); hoy el contexto es nacional.
"""

from __future__ import annotations

import logging
import pandas as pd
from sqlalchemy import text

logger = logging.getLogger(__name__)


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
                ah = r.get("autor_handle") or "?"
                partes.append(f"- @{ah}: {t}")
    except Exception as exc:
        logger.debug("RAG redes no disponible: %s", exc)

    return "\n".join(partes).strip()


def __main__() -> None:
    import os

    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    eng = create_engine(os.environ["DATABASE_URL"])
    print(construir_extra_context(eng, 0))


if __name__ == "__main__":
    __main__()
