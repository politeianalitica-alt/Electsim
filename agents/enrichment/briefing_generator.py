"""
Generador de briefings en markdown para clientes (Bloque 3).

Un briefing puede:
  - Centrarse en una o varias entidades especificas (por QID)
  - Cubrir un periodo: '24h' | '7d'
  - Incluir alertas de anomalias activas

Estructura del briefing:
  # Briefing: <titulo>
  **Periodo**: <periodo> | **Generado**: <timestamp>

  ## Resumen ejecutivo
  <2-3 lineas de resumen>

  ## Entidades clave
  ### <Entidad A>
  <perfil narrativo> | menciones | tono

  ## Relaciones destacadas
  <grafo textual de las relaciones mas relevantes>

  ## Alertas
  <lista de anomalias si las hay>

  ## Contexto ampliado
  <snippets de los articulos mas relevantes>

Temperature 0.35 para equilibrio entre creatividad y precision.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional
import uuid

from .models import AnomalyAlert, ClientBriefing, EntityProfile

log = logging.getLogger(__name__)

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL    = os.getenv("BRIEFING_OLLAMA_MODEL", "politeia-brain:latest")
_OLLAMA_TEMP     = 0.35


# ---------------------------------------------------------------------------
# Plantilla de prompt para Ollama
# ---------------------------------------------------------------------------

def _build_briefing_prompt(
    titulo: str,
    periodo: str,
    profiles: list[EntityProfile],
    alerts: list[AnomalyAlert],
    top_headlines: list[str],
) -> str:
    perfiles_str = ""
    for p in profiles:
        perfiles_str += (
            f"\n### {p.nombre_oficial} ({p.tipo})\n"
            f"- Cargo: {p.cargo_actual or 'N/D'}\n"
            f"- Menciones {periodo}: {p.mention_count_24h if periodo == '24h' else p.mention_count_7d}\n"
            f"- Tono: {p.tone_primary}\n"
            f"- Perfil: {p.perfil_narrativo[:300] if p.perfil_narrativo else 'sin datos'}\n"
            f"- Co-entidades: {', '.join(p.top_co_entities[:3]) or 'ninguna'}\n"
        )

    alertas_str = ""
    for a in alerts:
        alertas_str += (
            f"- {a.nombre_oficial}: {a.alert_type} "
            f"(z={a.z_score:.1f}) — {a.hypothesis[:120]}\n"
        )

    titulares_str = "\n".join(f"  - {h}" for h in top_headlines[:5])

    prompt = f"""\
Eres un analista de inteligencia politica y mediatica de primer nivel.
Genera un briefing ejecutivo en espanol, formato markdown, sobre la situacion
de las siguientes entidades politicas en los medios espanoles durante {periodo}.

TITULO: {titulo}
PERIODO: {periodo}

PERFILES DE ENTIDADES:
{perfiles_str}

ALERTAS ACTIVAS:
{alertas_str or "Ninguna alerta activa."}

TITULARES DESTACADOS:
{titulares_str or "  (sin datos de titulares)"}

El briefing debe tener estas secciones exactas (en markdown):
1. ## Resumen ejecutivo (2-3 oraciones clave)
2. ## Entidades clave (usar los perfiles proporcionados)
3. ## Relaciones y dinamicas (inferir del contexto)
4. ## Alertas (si las hay)
5. ## Recomendaciones de seguimiento

Estilo: directo, analitico, sin emojis, sin opiniones personales.
Longitud total: entre 400 y 700 palabras."""

    return prompt


# ---------------------------------------------------------------------------
# Llamada a Ollama
# ---------------------------------------------------------------------------

def _call_ollama(prompt: str) -> str:
    try:
        import httpx  # type: ignore
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{_OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": _OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": _OLLAMA_TEMP},
                },
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
    except Exception as exc:
        log.warning("Error llamando a Ollama para briefing: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Carga de datos desde BD
# ---------------------------------------------------------------------------

def _load_profiles(qids: list[str], conn) -> list[EntityProfile]:
    """Carga perfiles enriquecidos desde entities_canonical.perfil_json."""
    profiles = []
    try:
        with conn.cursor() as cur:
            for qid in qids:
                cur.execute(
                    """
                    SELECT qid, nombre_oficial, tipo, cargo_actual, perfil_json
                    FROM entities_canonical WHERE qid = %s
                    """,
                    (qid,),
                )
                row = cur.fetchone()
                if not row:
                    continue
                pj = row[4] or {}
                profiles.append(
                    EntityProfile(
                        qid=row[0],
                        nombre_oficial=row[1],
                        tipo=row[2],
                        cargo_actual=row[3],
                        mention_count_24h=pj.get("mention_count_24h", 0),
                        mention_count_7d=pj.get("mention_count_7d", 0),
                        avg_sentiment_24h=pj.get("avg_sentiment_24h", 0.0),
                        avg_sentiment_7d=pj.get("avg_sentiment_7d", 0.0),
                        tone_primary=pj.get("tone_primary", "neutral"),
                        top_keywords=pj.get("top_keywords", []),
                        top_co_entities=pj.get("top_co_entities", []),
                        perfil_narrativo=pj.get("perfil_narrativo", ""),
                    )
                )
    except Exception as exc:
        log.warning("Error cargando perfiles para briefing: %s", exc)
    return profiles


def _load_top_headlines(qids: list[str], periodo: str, conn) -> list[str]:
    """Carga los titulares mas recientes de las entidades dadas."""
    interval = "24 hours" if periodo == "24h" else "7 days"
    headlines = []
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT na.headline
                FROM entity_mentions em
                JOIN news_articles na ON na.url = em.article_url
                WHERE em.qid = ANY(%s)
                  AND em.published_at >= NOW() - INTERVAL %s
                  AND na.headline IS NOT NULL
                ORDER BY em.published_at DESC
                LIMIT 10
                """,
                (qids, interval),
            )
            headlines = [r[0] for r in cur.fetchall()]
    except Exception as exc:
        log.debug("Error cargando titulares: %s", exc)
    return headlines


# ---------------------------------------------------------------------------
# Funcion principal
# ---------------------------------------------------------------------------

def generate_briefing(
    titulo: str,
    entity_qids: list[str],
    periodo: str,
    alerts: list[AnomalyAlert],
    conn,
) -> ClientBriefing:
    """
    Genera un briefing completo en markdown para las entidades dadas.

    Args:
      titulo:       titulo del briefing
      entity_qids:  lista de QIDs de entidades a incluir
      periodo:      '24h' | '7d'
      alerts:       alertas de anomalias ya detectadas
      conn:         conexion psycopg v3

    Returns:
      ClientBriefing con contenido_md y resumen_ejecutivo.
    """
    profiles = _load_profiles(entity_qids, conn)
    headlines = _load_top_headlines(entity_qids, periodo, conn)

    # Filtrar alertas relevantes para estas entidades
    relevant_alerts = [a for a in alerts if a.qid in set(entity_qids)]

    prompt = _build_briefing_prompt(
        titulo=titulo,
        periodo=periodo,
        profiles=profiles,
        alerts=relevant_alerts,
        top_headlines=headlines,
    )

    contenido_md = _call_ollama(prompt)

    if not contenido_md:
        # Briefing minimo sin LLM
        contenido_md = _minimal_briefing(titulo, profiles, relevant_alerts, periodo)

    # Resumen ejecutivo: primera oracion significativa del contenido
    resumen = _extract_executive_summary(contenido_md)

    # Encabezado estandar
    header = (
        f"# {titulo}\n"
        f"**Periodo**: {periodo} | "
        f"**Generado**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC\n\n"
    )
    contenido_final = header + contenido_md

    return ClientBriefing(
        briefing_id=str(uuid.uuid4())[:8],
        titulo=titulo,
        entidades_qids=entity_qids,
        periodo=periodo,
        contenido_md=contenido_final,
        resumen_ejecutivo=resumen,
        alertas_incluidas=[a.qid for a in relevant_alerts],
        generated_at=datetime.now(timezone.utc),
    )


def _minimal_briefing(
    titulo: str,
    profiles: list[EntityProfile],
    alerts: list[AnomalyAlert],
    periodo: str,
) -> str:
    """Genera un briefing minimo sin LLM cuando Ollama no esta disponible."""
    lines = [f"## Resumen ejecutivo\n"]
    if profiles:
        nombres = ", ".join(p.nombre_oficial for p in profiles[:3])
        lines.append(f"Seguimiento de entidades: {nombres} en las ultimas {periodo}.\n")
    else:
        lines.append("Sin datos suficientes para generar resumen.\n")

    lines.append("\n## Entidades clave\n")
    for p in profiles:
        lines.append(
            f"### {p.nombre_oficial}\n"
            f"- Menciones: {p.mention_count_24h} (24h) / {p.mention_count_7d} (7d)\n"
            f"- Tono: {p.tone_primary}\n\n"
        )

    if alerts:
        lines.append("\n## Alertas\n")
        for a in alerts:
            lines.append(f"- **{a.nombre_oficial}**: {a.hypothesis}\n")

    return "".join(lines)


def _extract_executive_summary(md: str) -> str:
    """Extrae el parrafo despues del encabezado de resumen ejecutivo."""
    in_summary = False
    for line in md.split("\n"):
        if "resumen ejecutivo" in line.lower():
            in_summary = True
            continue
        if in_summary and line.strip() and not line.startswith("#"):
            return line.strip()[:300]
    return md[:200].strip()
