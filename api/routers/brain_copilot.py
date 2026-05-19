"""Router /api/v1/brain/copilot · brain copiloto context-aware (Pilar 3).

POST /api/v1/brain/copilot
  body: { investigation_id?, prompt, action?, pinned_entity_ids?, context? }
  resp: { answer, tool_trace, sources, suggested_actions, latency_ms, model }

Acciones predefinidas (action):

  · resumen_caso        · síntesis del estado actual usando pinned entities
                          → tool: analyze_narrative sobre las entidades pinneadas
  · hipotesis_ach       · genera 3-5 hipótesis competing inicializadas para ACH
                          → tool: forecast_political_scenario
  · sources_evidencia   · sugiere URLs/fuentes a buscar
                          → tool: discover_new_sources
  · generar_briefing    · borrador de SITREP con el caso
                          → tool: compose_briefing (content mixin)
  · perfil_actor        · build_actor_profile sobre el primer actor pinneado
                          → tool: build_actor_profile
  · coalicion           · viabilidad de coalición entre partidos pinneados
                          → tool: analyze_coalition_viability
  · free_query (default)· Q&A libre con contexto del caso
                          → tool: political_query (orchestrator)

Cada llamada persiste un analyst_event (verb=brain_query) en la investigación
si `investigation_id` está presente, con el `tool_trace` en el payload.

Diseño:
  · Wraps el singleton GroqBrain · stub si el brain no está disponible
    (sin Groq API key) sin romper la UI.
  · Hidrata el contexto con las entidades pinneadas (display_name + tags +
    payload pre-resumido).
  · Devuelve `suggested_actions` para mostrar como botones secundarios.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/brain", tags=["brain-copilot"])


# ─────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────

CopilotAction = Literal[
    "resumen_caso",
    "hipotesis_ach",
    "sources_evidencia",
    "generar_briefing",
    "perfil_actor",
    "coalicion",
    "free_query",
]


class CopilotRequest(BaseModel):
    """Petición al copiloto."""
    prompt: str = Field(min_length=1, max_length=4000)
    action: CopilotAction = "free_query"
    investigation_id: int | None = None
    pinned_entity_ids: list[int] = Field(default_factory=list)
    context_notes: str = ""  # opcional · contexto adicional libre del usuario


class ToolTraceEntry(BaseModel):
    tool: str
    input_summary: str
    ok: bool
    latency_ms: int
    error: str | None = None


class SuggestedAction(BaseModel):
    action: CopilotAction
    label: str
    rationale: str


class CopilotResponse(BaseModel):
    answer: str
    structured: dict[str, Any] = Field(default_factory=dict)
    tool_trace: list[ToolTraceEntry] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    suggested_actions: list[SuggestedAction] = Field(default_factory=list)
    latency_ms: int
    model: str = ""
    ok: bool = True
    error: str | None = None


# ─────────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────────

@router.post("/copilot", response_model=CopilotResponse)
def copilot(
    body: CopilotRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> CopilotResponse:
    """Orquesta tools del brain con el contexto de la investigación activa."""
    started = time.time()
    user = (x_user_id or "demo").strip() or "demo"

    # 1) Hidratar contexto · entidades pinneadas + investigación
    pinned_summary = _build_pinned_summary(body.pinned_entity_ids)
    investigation_summary = _build_investigation_summary(body.investigation_id, user)

    # 2) Ejecutar la acción
    try:
        result = _dispatch_action(
            action=body.action,
            prompt=body.prompt,
            pinned_summary=pinned_summary,
            investigation_summary=investigation_summary,
            context_notes=body.context_notes,
            pinned_entity_ids=body.pinned_entity_ids,
        )
    except Exception as exc:
        logger.exception("copilot dispatch falló")
        latency = int((time.time() - started) * 1000)
        return CopilotResponse(
            answer=f"No pude completar la acción «{body.action}» — {type(exc).__name__}",
            tool_trace=[],
            sources=[],
            suggested_actions=_default_suggestions(body.action),
            latency_ms=latency,
            ok=False,
            error=str(exc)[:300],
        )

    # 3) Persistir analyst_event (no bloquea si falla)
    if body.investigation_id:
        try:
            from agents.entities.investigations import get_investigation_repository
            get_investigation_repository().record_event(
                investigation_id=body.investigation_id,
                actor_id=user,
                verb="brain_query",
                target_kind="investigation",
                target_id=body.investigation_id,
                payload={
                    "action": body.action,
                    "prompt": body.prompt[:500],
                    "tools": [t.tool for t in result.tool_trace],
                    "ok": result.ok,
                },
            )
        except Exception as exc:
            logger.debug("audit copilot event falló: %s", exc)

    result.latency_ms = int((time.time() - started) * 1000)
    return result


# ─────────────────────────────────────────────────────────────────
# Helpers · hidratar contexto
# ─────────────────────────────────────────────────────────────────

def _build_pinned_summary(entity_ids: list[int]) -> str:
    """Resumen compacto de las entidades pinneadas para incluir en el prompt."""
    if not entity_ids:
        return "(sin entidades fijadas)"
    try:
        from agents.entities import get_entity_repository
        repo = get_entity_repository()
        lines: list[str] = []
        for eid in entity_ids[:20]:
            try:
                ent = repo.get(eid)
                if ent:
                    lines.append(f"- {ent.kind}/{ent.slug} · {ent.display_name} · tags: {', '.join(ent.tags[:5])}")
            except Exception:
                continue
        return "\n".join(lines) if lines else "(entidades no resueltas en BD)"
    except Exception:
        return f"(ids fijados: {entity_ids[:20]})"


def _build_investigation_summary(inv_id: int | None, user_id: str) -> str:
    """Resumen del estado de la investigación · título + counts."""
    if not inv_id:
        return ""
    try:
        from agents.entities.investigations import get_investigation_repository
        repo = get_investigation_repository()
        inv = repo.get(inv_id)
        if not inv:
            return ""
        if inv.owner_id != user_id and user_id not in (inv.collaborators or []):
            return ""
        # Contamos artifacts y events
        events = repo.recent_events(inv_id, limit=10)
        return (
            f"INVESTIGACIÓN ACTIVA: «{inv.title}»\n"
            f"Estado: {inv.status} · Actualizada: {inv.updated_at.isoformat()}\n"
            f"Descripción: {inv.description[:200] or '(sin descripción)'}\n"
            f"Últimas acciones del analista: {len(events)} eventos recientes."
        )
    except Exception as exc:
        logger.debug("investigation_summary falló: %s", exc)
        return ""


# ─────────────────────────────────────────────────────────────────
# Dispatch · cada acción mapea a una o varias tools del brain
# ─────────────────────────────────────────────────────────────────

def _dispatch_action(
    *,
    action: CopilotAction,
    prompt: str,
    pinned_summary: str,
    investigation_summary: str,
    context_notes: str,
    pinned_entity_ids: list[int],
) -> CopilotResponse:
    brain = _get_brain()
    if brain is None:
        return CopilotResponse(
            answer=(
                "El brain Groq no está disponible (sin OPENAI_API_KEY/GROQ_API_KEY en este entorno).\n\n"
                "Configura la variable en Vercel + Railway para activar el copiloto. "
                "Mientras tanto, el resto del workspace funciona sin IA."
            ),
            tool_trace=[],
            sources=[],
            suggested_actions=_default_suggestions(action),
            latency_ms=0,
            ok=False,
            error="brain_unavailable",
        )

    base_context = "\n\n".join(filter(None, [
        investigation_summary,
        f"ENTIDADES FIJADAS:\n{pinned_summary}",
        f"NOTAS DEL ANALISTA:\n{context_notes}" if context_notes else "",
    ]))

    trace: list[ToolTraceEntry] = []
    sources: list[str] = []
    structured: dict[str, Any] = {}
    answer = ""

    if action == "resumen_caso":
        answer, st, src, model = _action_resumen_caso(brain, base_context, prompt, pinned_summary, trace)
        structured = st; sources = src
    elif action == "hipotesis_ach":
        answer, st, src, model = _action_hipotesis_ach(brain, base_context, prompt, trace)
        structured = st; sources = src
    elif action == "sources_evidencia":
        answer, st, src, model = _action_sources(brain, base_context, prompt, trace)
        structured = st; sources = src
    elif action == "generar_briefing":
        answer, st, src, model = _action_briefing(brain, base_context, prompt, trace)
        structured = st; sources = src
    elif action == "perfil_actor":
        answer, st, src, model = _action_perfil_actor(brain, base_context, prompt, pinned_entity_ids, trace)
        structured = st; sources = src
    elif action == "coalicion":
        answer, st, src, model = _action_coalicion(brain, base_context, prompt, pinned_entity_ids, trace)
        structured = st; sources = src
    else:  # free_query
        answer, st, src, model = _action_free_query(brain, base_context, prompt, trace)
        structured = st; sources = src

    return CopilotResponse(
        answer=answer or "(el brain no devolvió respuesta · revisa el tool trace)",
        structured=structured,
        tool_trace=trace,
        sources=sources,
        suggested_actions=_suggestions_from_action(action),
        latency_ms=0,  # se rellena en el caller
        model=model,
        ok=any(t.ok for t in trace) if trace else False,
    )


def _get_brain():
    try:
        from agents.brain.groq_client import is_groq_available
        if not is_groq_available():
            # Sin API key · evitamos cargar el singleton (que dispararía tools sin red)
            return None
        from agents.brain import get_groq_brain
        brain = get_groq_brain()
        # Detectamos el stub del circuit breaker · su clase es _GroqBrainBuildErrorStub
        if brain.__class__.__name__ == "_GroqBrainBuildErrorStub":
            return None
        return brain
    except Exception as exc:
        logger.debug("brain unavailable: %s", exc)
        return None


def _safe_call(trace: list[ToolTraceEntry], tool_name: str, input_summary: str, fn):
    """Ejecuta una tool del brain, captura excepción, registra trace."""
    t0 = time.time()
    try:
        result = fn() or {}
    except Exception as exc:
        trace.append(ToolTraceEntry(
            tool=tool_name, input_summary=input_summary[:200],
            ok=False, latency_ms=int((time.time() - t0) * 1000),
            error=f"{type(exc).__name__}: {str(exc)[:150]}",
        ))
        return {}
    ok = bool(result.get("ok"))
    trace.append(ToolTraceEntry(
        tool=tool_name, input_summary=input_summary[:200],
        ok=ok, latency_ms=int(result.get("latency_ms", (time.time() - t0) * 1000)),
        error=result.get("error"),
    ))
    return result


# ─────────────────────────────────────────────────────────────────
# Acciones específicas · cada una compone una respuesta para el panel
# ─────────────────────────────────────────────────────────────────

def _action_resumen_caso(brain, ctx, prompt, pinned_summary, trace):
    pieces = [pinned_summary, prompt] if prompt else [pinned_summary]
    res = _safe_call(trace, "analyze_narrative", f"piezas={len(pieces)}", lambda: brain.analyze_narrative(
        pieces=pieces, topic="caso de investigación", time_window="actual",
    ))
    raw = res.get("result") if isinstance(res, dict) else None
    if isinstance(raw, dict):
        answer = (
            f"### Resumen del caso\n\n"
            f"**Narrativa dominante**: {raw.get('narrative_name', 'sin detectar')}\n\n"
            f"**Argumento central**: {raw.get('core_claim', '—')}\n\n"
            f"**Vectores de ataque identificados**: {', '.join(raw.get('attack_vectors', []) or [])[:300]}\n\n"
            f"**Contra-narrativas**: {', '.join(raw.get('counter_narratives', []) or [])[:300]}"
        )
        return answer, raw, raw.get("sources", []) or [], res.get("model", "")
    return f"(no hubo respuesta · {res.get('error', '')[:200]})", {}, [], res.get("model", "")


def _action_hipotesis_ach(brain, ctx, prompt, trace):
    res = _safe_call(trace, "forecast_political_scenario", "topic=caso", lambda: brain.forecast_political_scenario(
        topic=prompt or "evolución del caso de investigación",
        current_situation=ctx,
        time_horizon="3-6 meses",
    ))
    raw = res.get("result") if isinstance(res, dict) else None
    if isinstance(raw, dict):
        scenarios = raw.get("scenarios", []) or []
        bullets = "\n".join(
            f"- **{s.get('name', '?')}** ({int((s.get('probability', 0) or 0) * 100)}%)  · {s.get('triggers', [''])[0] if s.get('triggers') else ''}"
            for s in scenarios[:5]
        )
        answer = (
            f"### Hipótesis competing para ACH\n\n"
            f"Genera escenarios competing alternativos. Cada uno con probabilidad inicial "
            f"(razonamiento LLM · no estadístico · revisa con datos antes de operativizar):\n\n"
            f"{bullets}\n\n"
            f"⚠️ Las probabilidades son interpretación generativa. Contrasta con encuestas y modelos paramétricos."
        )
        return answer, raw, [], res.get("model", "")
    return f"(no hubo respuesta · {res.get('error', '')[:200]})", {}, [], res.get("model", "")


def _action_sources(brain, ctx, prompt, trace):
    res = _safe_call(trace, "discover_new_sources", f"topic={prompt[:80]}", lambda: brain.discover_new_sources(
        topic=prompt or "tema del caso",
        existing_sources=[],
        region_focus="España",
        validate_urls=True,
    ))
    raw = res.get("result") if isinstance(res, dict) else None
    if isinstance(raw, dict):
        cands = raw.get("candidates", []) or []
        dropped = raw.get("dropped_invalid", []) or []
        bullets = "\n".join(
            f"- [{c.get('name', c.get('url', '?'))}]({c.get('url', '')}) · tier {c.get('tier', '?')} · {c.get('why', '')[:120]}"
            for c in cands[:8]
        )
        answer = (
            f"### Fuentes propuestas (validadas)\n\n"
            f"{bullets or '(sin candidatos válidos · revisa el tool trace)'}\n\n"
            + (f"\n_({len(dropped)} URLs descartadas por validación HTTP)_" if dropped else "")
        )
        return answer, raw, [c.get("url", "") for c in cands[:8] if c.get("url")], res.get("model", "")
    return f"(no hubo respuesta · {res.get('error', '')[:200]})", {}, [], res.get("model", "")


def _action_briefing(brain, ctx, prompt, trace):
    # Reutilizamos forecast_interpret_simulation como pseudo-composer si content mixin no expone briefing directo
    res = _safe_call(trace, "interpret_simulation_results",
        "borrador briefing SITREP",
        lambda: brain.interpret_simulation_results(
            simulation_type="briefing_sitrep",
            inputs_summary=ctx,
            results_payload={"prompt": prompt or "Genera un SITREP del estado actual del caso"},
            audience="analista político senior",
        ),
    )
    raw = res.get("result") if isinstance(res, dict) else None
    if isinstance(raw, dict):
        answer = (
            f"### Borrador de SITREP\n\n"
            f"**Headline**: {raw.get('executive_takeaway', '—')}\n\n"
            f"**Drivers clave**:\n" +
            "\n".join(f"- {d}" for d in (raw.get('key_drivers', []) or [])[:5]) + "\n\n"
            f"**Sorpresas**:\n" +
            "\n".join(f"- {d}" for d in (raw.get('surprises', []) or [])[:5]) + "\n\n"
            f"**Acciones recomendadas**:\n" +
            "\n".join(f"- {d}" for d in (raw.get('recommended_actions', []) or [])[:5])
        )
        return answer, raw, [], res.get("model", "")
    return f"(briefing no generado · {res.get('error', '')[:200]})", {}, [], res.get("model", "")


def _action_perfil_actor(brain, ctx, prompt, pinned_entity_ids, trace):
    # Resolver el primer pinned actor
    first_actor = _first_actor_name(pinned_entity_ids)
    if not first_actor:
        return ("Para perfil de actor, fija al menos una entidad de tipo persona "
                "(actor_person) a la investigación."), {}, [], ""
    res = _safe_call(trace, "build_actor_profile", f"actor={first_actor}", lambda: brain.build_actor_profile(
        actor_name=first_actor,
        role="",
        known_facts=ctx[:1500],
        recent_statements=[],
    ))
    raw = res.get("result") if isinstance(res, dict) else None
    if isinstance(raw, dict):
        dq = raw.get("data_quality", {})
        answer = (
            f"### Perfil 360º · {first_actor}\n\n"
            f"**Biografía**: {(raw.get('biography') or '—')[:400]}\n\n"
            f"**Estilo político**: {(raw.get('political_style') or '—')[:300]}\n\n"
            f"**Fortalezas**: {', '.join(raw.get('strengths', []) or [])[:300]}\n\n"
            f"**Debilidades**: {', '.join(raw.get('weaknesses', []) or [])[:300]}\n\n"
            f"_Calidad del análisis: {'verificado' if dq.get('has_verified_facts') else 'principalmente inferencia LLM · aporta known_facts'}_"
        )
        return answer, raw, [], res.get("model", "")
    return f"(perfil no generado · {res.get('error', '')[:200]})", {}, [], res.get("model", "")


def _action_coalicion(brain, ctx, prompt, pinned_entity_ids, trace):
    # Necesitamos partidos pinneados
    parties = _pinned_party_slugs(pinned_entity_ids)
    if len(parties) < 2:
        return ("Para evaluar coalición, fija al menos 2 entidades de tipo party "
                "(PSOE, Sumar, Junts...) a la investigación."), {}, [], ""
    # Seats from a curated default · usuario puede sobreescribir
    default_seats = {"psoe": 121, "pp": 137, "vox": 33, "sumar": 31, "junts": 7,
                     "erc": 7, "bildu": 6, "pnv": 5, "bng": 1, "cc": 1, "upn": 1}
    seats = {p: default_seats.get(p, 0) for p in parties}
    res = _safe_call(trace, "analyze_coalition_viability",
        f"coalition={parties}",
        lambda: brain.analyze_coalition_viability(
            proposed_coalition=parties, seats_by_party=seats,
            context=ctx, chamber="congreso",
        ),
    )
    raw = res.get("result") if isinstance(res, dict) else None
    if isinstance(raw, dict):
        arith = raw.get("arithmetic_check", {})
        answer = (
            f"### Viabilidad de coalición · {', '.join(parties)}\n\n"
            f"**Aritmética**: {arith.get('coalition_seats', 0)}/{arith.get('majority_threshold', 176)} escaños · "
            f"{'alcanza' if arith.get('reaches_majority') else 'NO alcanza'} mayoría absoluta\n\n"
            f"**Viable**: {raw.get('viable', '—')}\n"
            f"**Distancia ideológica**: {raw.get('ideological_distance', '—')}\n"
            f"**Tensiones internas**: {raw.get('internal_tensions', '—')}\n"
            f"**Durabilidad estimada**: {raw.get('durability_months', '—')} meses"
        )
        return answer, raw, [], res.get("model", "")
    return f"(no se pudo evaluar · {res.get('error', '')[:200]})", {}, [], res.get("model", "")


def _action_free_query(brain, ctx, prompt, trace):
    # Usamos el orchestrator si está disponible · si no, analyze_narrative como Q&A barato
    if hasattr(brain, "political_query"):
        res = _safe_call(trace, "political_query", prompt[:200], lambda: brain.political_query(
            prompt, context=ctx,
        ))
    else:
        res = _safe_call(trace, "analyze_narrative", prompt[:200], lambda: brain.analyze_narrative(
            pieces=[ctx, prompt], topic="consulta del analista", time_window="actual",
        ))
    raw = res.get("result") if isinstance(res, dict) else None
    if isinstance(raw, dict):
        # Diferentes tools tienen diferentes campos · intentamos el más útil
        answer = (
            raw.get("answer")
            or raw.get("response")
            or raw.get("narrative_name")
            or raw.get("core_claim")
            or str(raw)[:1200]
        )
        return str(answer)[:4000], raw, raw.get("sources", []) or [], res.get("model", "")
    return f"(el brain no respondió · {res.get('error', '')[:200]})", {}, [], res.get("model", "")


# ─────────────────────────────────────────────────────────────────
# Resolución de entidades pinneadas
# ─────────────────────────────────────────────────────────────────

def _first_actor_name(entity_ids: list[int]) -> str | None:
    try:
        from agents.entities import get_entity_repository
        repo = get_entity_repository()
        for eid in entity_ids:
            ent = repo.get(eid)
            if ent and ent.kind == "actor_person":
                return ent.display_name
    except Exception:
        pass
    return None


def _pinned_party_slugs(entity_ids: list[int]) -> list[str]:
    try:
        from agents.entities import get_entity_repository
        repo = get_entity_repository()
        slugs: list[str] = []
        for eid in entity_ids:
            ent = repo.get(eid)
            if ent and ent.kind == "party":
                slugs.append(ent.slug)
        return slugs
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────
# Suggested actions (botones que aparecen tras la respuesta)
# ─────────────────────────────────────────────────────────────────

_SUGGESTIONS: dict[CopilotAction, list[SuggestedAction]] = {
    "resumen_caso": [
        SuggestedAction(action="hipotesis_ach", label="Genera hipótesis ACH",
                        rationale="Convierte el resumen en escenarios competing."),
        SuggestedAction(action="sources_evidencia", label="Sugiere fuentes",
                        rationale="Encuentra URLs / documentos para reforzar."),
    ],
    "hipotesis_ach": [
        SuggestedAction(action="sources_evidencia", label="Sugiere fuentes",
                        rationale="Validemos cada hipótesis con evidencia externa."),
        SuggestedAction(action="generar_briefing", label="Borrador SITREP",
                        rationale="Compila el análisis en un producto entregable."),
    ],
    "sources_evidencia": [
        SuggestedAction(action="resumen_caso", label="Resumen del caso",
                        rationale="Reconstruye la narrativa con nuevas fuentes."),
    ],
    "generar_briefing": [
        SuggestedAction(action="hipotesis_ach", label="Refinar hipótesis",
                        rationale="Antes de entregar, asegura el rigor ACH."),
    ],
    "perfil_actor": [
        SuggestedAction(action="coalicion", label="Evaluar coaliciones",
                        rationale="Si hay partidos pinneados, mide viabilidad."),
        SuggestedAction(action="resumen_caso", label="Resumen del caso",
                        rationale="Conecta el perfil con la narrativa del caso."),
    ],
    "coalicion": [
        SuggestedAction(action="hipotesis_ach", label="Genera hipótesis ACH",
                        rationale="Construye escenarios alrededor de la coalición."),
    ],
    "free_query": [
        SuggestedAction(action="resumen_caso", label="Resumen del caso",
                        rationale="Síntesis basada en pinned entities."),
        SuggestedAction(action="sources_evidencia", label="Sugiere fuentes",
                        rationale="Encuentra documentos relacionados."),
    ],
}


def _suggestions_from_action(action: CopilotAction) -> list[SuggestedAction]:
    return list(_SUGGESTIONS.get(action, _SUGGESTIONS["free_query"]))


def _default_suggestions(action: CopilotAction) -> list[SuggestedAction]:
    return _suggestions_from_action(action)
