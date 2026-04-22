from __future__ import annotations

import logging

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def _get_deliberaciones_previas(engine: Engine, cluster_id: int, tema: str | None = None, limit: int = 3) -> str:
    """Recupera deliberaciones previas de este cluster para continuidad contextual."""
    try:
        sql = """
            SELECT content
            FROM agent_memory_log
            WHERE cluster_id = :cid
              AND kind = 'deliberation'
              AND content IS NOT NULL
              AND content <> ''
        """
        params: dict[str, object] = {"cid": int(cluster_id), "lim": int(limit)}
        if tema:
            sql += " AND content ILIKE :tema"
            params["tema"] = f"%{str(tema).strip()}%"
        sql += " ORDER BY id DESC LIMIT :lim"
        with engine.connect() as conn:
            hist = pd.read_sql(text(sql), conn, params=params)
        if hist.empty:
            return ""
        partes = ["Patrones de deliberación previos de este segmento:"]
        for _, r in hist.iterrows():
            partes.append(f"- {str(r.get('content') or '')[:180]}")
        return "\n".join(partes)
    except Exception as exc:
        logger.debug("RAG memoria omitida: %s", exc)
        return ""


def construir_extra_context(
    engine: Engine,
    cluster_id: int,
    tema: str | None = None,
    ideo_media: float | None = None,
) -> str:
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
        params: dict[str, object] = {}
        tema_clause = ""
        if tema:
            tema_clause = "AND (COALESCE(tema, '') ILIKE :tema OR COALESCE(titular, '') ILIKE :tema)"
            params["tema"] = f"%{str(tema).strip()}%"
        with engine.connect() as conn:
            news = pd.read_sql(
                text(
                    f"""
                    SELECT titular AS titulo, fuente, fecha_publicacion, tema, sentiment_score
                    FROM noticias_prensa
                    WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '3 days'
                    {tema_clause}
                    ORDER BY fecha_publicacion DESC
                    LIMIT 5
                    """
                ),
                conn,
                params=params,
            )
        if not news.empty:
            partes.append("Noticias relevantes recientes:")
            for _, r in news.iterrows():
                sent = ""
                if pd.notna(r.get("sentiment_score")):
                    try:
                        sent = f" [tono: {float(r['sentiment_score']):+.2f}]"
                    except Exception:
                        sent = ""
                partes.append(f"- {r.get('fuente','?')}: {str(r.get('titulo',''))[:160]}{sent}")
    except Exception as exc:
        logger.debug("RAG noticias omitido: %s", exc)

    try:
        params_rs: dict[str, object] = {}
        tema_clause_rs = ""
        if tema:
            tema_clause_rs = "AND COALESCE(texto, '') ILIKE :tema"
            params_rs["tema"] = f"%{str(tema).strip()}%"
        with engine.connect() as conn:
            posts = pd.read_sql(
                text(
                    f"""
                    SELECT autor_handle, texto, engagement_total, fecha_publicacion
                    FROM posts_redes_sociales
                    WHERE texto IS NOT NULL
                    {tema_clause_rs}
                    ORDER BY engagement_total DESC NULLS LAST, fecha_publicacion DESC NULLS LAST
                    LIMIT 4
                    """
                ),
                conn,
                params=params_rs,
            )
        if not posts.empty:
            partes.append("Conversación en redes:")
            for _, r in posts.iterrows():
                partes.append(f"- @{r.get('autor_handle') or '?'}: {str(r.get('texto',''))[:140]}")
    except Exception as exc:
        logger.debug("RAG redes omitido: %s", exc)

    # Contexto de continuidad del propio perfil.
    hist = _get_deliberaciones_previas(engine, cluster_id, tema=tema)
    if hist:
        partes.append(hist)

    _ = ideo_media  # reservado para afinado posterior por sesgo ideológico de fuentes
    return "\n".join(partes).strip()
