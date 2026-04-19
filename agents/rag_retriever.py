from __future__ import annotations

import logging

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def construir_extra_context(engine: Engine, cluster_id: int) -> str:
    partes: list[str] = []
    try:
        with engine.connect() as conn:
            macro = pd.read_sql(
                text(
                    """
                    SELECT fecha, ipc_general, crecimiento_pib, tasa_paro
                    FROM indicadores_macroeconomicos
                    ORDER BY fecha DESC
                    LIMIT 1
                    """
                ),
                conn,
            )
        if not macro.empty:
            r = macro.iloc[0]
            bits = []
            if pd.notna(r.get("ipc_general")):
                bits.append(f"IPC {float(r['ipc_general']):.2f}%")
            if pd.notna(r.get("crecimiento_pib")):
                bits.append(f"PIB {float(r['crecimiento_pib']):.2f}%")
            if pd.notna(r.get("tasa_paro")):
                bits.append(f"paro {float(r['tasa_paro']):.2f}%")
            if bits:
                partes.append("Macro reciente: " + ", ".join(bits) + ".")
    except Exception as exc:
        logger.debug("RAG macro omitido: %s", exc)

    try:
        with engine.connect() as conn:
            news = pd.read_sql(
                text(
                    """
                    SELECT titular AS titulo, fuente, fecha_publicacion
                    FROM noticias_prensa
                    WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '3 days'
                    ORDER BY fecha_publicacion DESC
                    LIMIT 4
                    """
                ),
                conn,
            )
        if not news.empty:
            partes.append("Noticias relevantes:")
            for _, r in news.iterrows():
                partes.append(f"- {r.get('fuente','?')}: {str(r.get('titulo',''))[:160]}")
    except Exception as exc:
        logger.debug("RAG noticias omitido: %s", exc)

    try:
        with engine.connect() as conn:
            posts = pd.read_sql(
                text(
                    """
                    SELECT autor_handle, texto
                    FROM posts_redes_sociales
                    WHERE texto IS NOT NULL
                    ORDER BY fecha_publicacion DESC NULLS LAST
                    LIMIT 3
                    """
                ),
                conn,
            )
        if not posts.empty:
            partes.append("Redes sociales:")
            for _, r in posts.iterrows():
                partes.append(f"- @{r.get('autor_handle') or '?'}: {str(r.get('texto',''))[:140]}")
    except Exception as exc:
        logger.debug("RAG redes omitido: %s", exc)

    _ = cluster_id
    return "\n".join(partes).strip()
