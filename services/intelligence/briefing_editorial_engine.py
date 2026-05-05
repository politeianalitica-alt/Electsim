"""
Motor editorial de briefings para ElectSim.

Selecciona noticias por relevancia, integra narrativas, riesgos y workspace.
Genera briefings ejecutivos, de cliente, de campaña y de crisis.
"""
from __future__ import annotations
import json
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)

# Cache de disponibilidad de Ollama: TTL 60s para evitar ~3s de timeout por llamada
_OLLAMA_CACHE: dict[str, object] = {"available": None, "ts": 0.0}
_OLLAMA_CACHE_TTL = 60.0


def _is_ollama_available() -> bool:
    """Comprueba si Ollama está disponible. Resultado cacheado 60s."""
    now = time.monotonic()
    if _OLLAMA_CACHE["available"] is not None and (now - float(_OLLAMA_CACHE["ts"])) < _OLLAMA_CACHE_TTL:
        return bool(_OLLAMA_CACHE["available"])
    try:
        from agents.brain.llm_router import is_ollama_available
        result = is_ollama_available()
    except Exception:
        result = False
    _OLLAMA_CACHE["available"] = result
    _OLLAMA_CACHE["ts"] = now
    return result


def build_briefing_context(tenant_id: str = "default",
                            workspace_id: str | None = None) -> dict:
    """
    Recopila contexto completo para briefing desde todas las fuentes.
    Retorna dict con:
    - top_news: list[dict] — noticias seleccionadas por score
    - narratives: list[dict] — narrativas activas reales
    - risks: list[dict] — alertas y riesgos críticos
    - actors: list[dict] — actores relevantes a monitorizar
    - legislative: list[dict] — agenda legislativa
    - workspace_context: dict — contexto del workspace si aplica
    - mode: "real"|"fallback"|"demo"
    - errors: list[str]
    """
    ctx: dict[str, Any] = {
        "top_news": [], "narratives": [], "risks": [], "actors": [],
        "legislative": [], "workspace_context": {}, "mode": "real", "errors": [],
    }

    # Noticias seleccionadas editorialmente
    try:
        from media_intelligence.editorial_selector import select_news_for_briefing
        from dashboard.services.data_aggregator import RSSAggregator
        agg = RSSAggregator()
        all_news = agg.fetch_latest_news(max_items=200) if hasattr(agg, 'fetch_latest_news') else []
        if not all_news:
            all_news = _fallback_news()
            ctx["mode"] = "fallback"
        ctx["top_news"] = select_news_for_briefing(all_news, n=7)
    except Exception as e:
        ctx["errors"].append(f"news: {e}")
        ctx["top_news"] = _fallback_news()[:5]
        ctx["mode"] = "fallback"

    # Narrativas reales
    try:
        from media_intelligence.narrative_pipeline import get_cached_narratives, run_narrative_pipeline
        narratives = get_cached_narratives()
        if not narratives:
            narratives = run_narrative_pipeline(ctx["top_news"])
        ctx["narratives"] = [n for n in narratives if not n.get("is_demo")][:5]
        if not ctx["narratives"]:
            ctx["narratives"] = narratives[:3]  # incluir demo si no hay reales
    except Exception as e:
        ctx["errors"].append(f"narratives: {e}")

    # Alertas y riesgos
    try:
        from dashboard.services.media_core import cargar_alertas_criticas
        ctx["risks"] = cargar_alertas_criticas(tenant_id=tenant_id, limit=5)
    except Exception as e:
        ctx["errors"].append(f"risks: {e}")

    # Agenda legislativa
    try:
        from dashboard.services.boe_service import cargar_agenda_legislativa
        ctx["legislative"] = cargar_agenda_legislativa(limit=5)
    except Exception as e:
        ctx["errors"].append(f"legislative: {e}")

    # Workspace si aplica
    if workspace_id:
        try:
            from dashboard.services.workspace_intelligence_core import cargar_workspace_overview
            ctx["workspace_context"] = cargar_workspace_overview(workspace_id, tenant_id)
        except Exception as e:
            ctx["errors"].append(f"workspace: {e}")

    return ctx


def select_briefing_news(articles: list[dict], n: int = 5) -> list[dict]:
    """Selección editorial de noticias para briefing."""
    try:
        from media_intelligence.editorial_selector import select_news_for_briefing
        return select_news_for_briefing(articles, n=n)
    except Exception:
        return articles[:n]


def generate_executive_briefing(ctx: dict, tenant_id: str = "default") -> dict:
    """
    Genera briefing ejecutivo diario.
    Retorna dict con secciones estructuradas.
    """
    top_news = ctx.get("top_news", [])
    narratives = ctx.get("narratives", [])
    risks = ctx.get("risks", [])

    news_text = "\n".join(
        f"- [{a.get('source_name','')}] {a.get('translated_title') or a.get('title','')}"
        for a in top_news[:5]
    )
    narrative_text = "\n".join(
        f"- {n.get('frame_label','')} ({n.get('lifecycle','')}, {n.get('article_count',0)} artículos)"
        for n in narratives[:3]
    )
    risk_text = "\n".join(
        f"- {r.get('title','') or r.get('descripcion','')}" for r in risks[:3]
    ) or "Sin alertas críticas"

    date_str = datetime.now(timezone.utc).strftime("%d de %B de %Y")

    prompt = f"""Eres un analista político senior. Genera un briefing ejecutivo conciso en español para {date_str}.

NOTICIAS SELECCIONADAS:
{news_text or 'Sin datos de noticias'}

NARRATIVAS ACTIVAS:
{narrative_text or 'Sin narrativas detectadas'}

ALERTAS:
{risk_text}

Estructura el briefing con:
1. RESUMEN EJECUTIVO (2-3 frases)
2. QUÉ HA CAMBIADO (vs ayer)
3. SEÑALES CRÍTICAS (máx 3)
4. IMPLICACIONES Y RECOMENDACIONES (máx 3)
5. PREGUNTAS ESTRATÉGICAS (máx 2)

Sé conciso, directo y útil para un decisor político. Máximo 400 palabras total."""

    briefing_text = ""
    model = "demo"

    try:
        from agents.brain.llm_router import route
        if _is_ollama_available():
            result = route("briefing", prompt)
            briefing_text = result.get("result") or ""
            if isinstance(briefing_text, dict):
                briefing_text = json.dumps(briefing_text, ensure_ascii=False)
            model = result.get("model", "ollama")
        else:
            briefing_text = _demo_briefing_text(top_news, narratives, risks, date_str)
            model = "demo"
    except Exception as e:
        log.warning("LLM briefing generation failed: %s", e)
        briefing_text = _demo_briefing_text(top_news, narratives, risks, date_str)
        model = "demo"

    return {
        "title": f"Briefing Ejecutivo — {date_str}",
        "date": date_str,
        "executive_summary": _extract_section(briefing_text, "RESUMEN EJECUTIVO"),
        "what_changed": _extract_section(briefing_text, "QUÉ HA CAMBIADO"),
        "critical_signals": _extract_section(briefing_text, "SEÑALES CRÍTICAS"),
        "recommendations": _extract_section(briefing_text, "IMPLICACIONES Y RECOMENDACIONES"),
        "strategic_questions": _extract_section(briefing_text, "PREGUNTAS ESTRATÉGICAS"),
        "raw_text": briefing_text,
        "top_news": top_news,
        "narratives": narratives,
        "risks": risks,
        "model": model,
        "mode": ctx.get("mode", "real"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tenant_id": tenant_id,
    }


def _extract_section(text: str, section: str) -> str:
    """Extrae sección de texto con número o sin número."""
    pattern = rf"(?:\d+\.\s*)?{re.escape(section)}\s*[:\n](.+?)(?=\n\d+\.|$)"
    m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _demo_briefing_text(news: list, narratives: list, risks: list, date: str) -> str:
    headlines = "; ".join(
        a.get("translated_title") or a.get("title") or ""
        for a in news[:3]
    ) or "Sin noticias disponibles"
    return f"""MODO DEMO — conecta fuentes de medios para activar el briefing real.

1. RESUMEN EJECUTIVO
{date}. Las principales noticias del día incluyen: {headlines}. Se recomienda conectar PostgreSQL y activar los scrapers de medios.

2. QUÉ HA CAMBIADO
Sin comparativa disponible en modo demo.

3. SEÑALES CRÍTICAS
- Activa las fuentes RSS para obtener señales reales
- Conecta la base de datos para persistir alertas
- Configura Ollama para análisis automático

4. IMPLICACIONES Y RECOMENDACIONES
- Ejecutar: python pipelines/comms_core.py --source all
- Verificar: python scripts/check_schema_contracts.py

5. PREGUNTAS ESTRATÉGICAS
- ¿Cuáles son las narrativas dominantes hoy?
- ¿Qué actores están ganando relevancia?"""


def _fallback_news() -> list[dict]:
    return [{"title": "Sin datos de noticias disponibles", "source_name": "demo",
              "url": "", "source_priority": 5}]


def validate_briefing_quality(briefing: dict) -> dict:
    """Valida calidad del briefing antes de presentarlo."""
    issues = []
    if not briefing.get("executive_summary"):
        issues.append("missing_executive_summary")
    if not briefing.get("top_news"):
        issues.append("no_news")
    if briefing.get("mode") == "demo":
        issues.append("demo_mode")
    return {
        "valid": len([i for i in issues if i != "demo_mode"]) == 0,
        "issues": issues,
        "quality_score": max(0.0, 1.0 - len(issues) * 0.2),
    }
