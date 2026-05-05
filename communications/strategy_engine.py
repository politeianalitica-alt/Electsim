"""
Motor de estrategia de comunicación política para ElectSim.

Genera: marcos, mensajes, contranarrativas, Q&A hostil, red-team, canal recomendado.
Sin imports de Streamlit. Graceful degradation en todo. Modo demo cuando Ollama no disponible.
"""
from __future__ import annotations
import json
import logging
import time
from datetime import datetime, timezone

log = logging.getLogger(__name__)

# Cache de disponibilidad de Ollama: TTL 60s para evitar ~3s de timeout por test
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


def _route(task_type: str, prompt: str, context: dict | None = None) -> dict:
    """Llama al router LLM. Retorna dict vacío en caso de error."""
    try:
        from agents.brain.llm_router import route
        return route(task_type, prompt, context)  # type: ignore[arg-type]
    except Exception as e:
        log.warning("llm_router failed: %s", e)
        return {"result": None, "model": "unavailable", "ok": False}


def _parse_json_result(result: dict) -> dict | list:
    """Extrae y parsea el resultado JSON del router."""
    raw = result.get("result") or {}
    if isinstance(raw, (dict, list)):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            pass
    return {}


def analyze_issue_for_comms(issue: str, context: dict | None = None) -> dict:
    """
    Análisis de un issue para estrategia de comunicación.

    Retorna dict con diagnóstico completo incluyendo frame rival/propio,
    mensajes, contranarrativas, Q&A hostil y canal recomendado.
    """
    ctx = context or {}

    if not _is_ollama_available():
        return {**_demo_comms_strategy(issue), "issue": issue, "mode": "demo",
                "generated_at": datetime.now(timezone.utc).isoformat()}

    prompt = f"""Eres un estratega de comunicación política senior. Analiza este issue y genera una estrategia de comunicación estructurada en JSON.

ISSUE: {issue}
CONTEXTO: {str(ctx)[:300]}

Genera un JSON con exactamente estas claves:
{{
  "rival_frame": "El encuadre que usa la oposición/críticos",
  "own_frame": "El encuadre propio defensivo/proactivo",
  "central_message": "El mensaje central en 1 frase",
  "three_arguments": ["arg1", "arg2", "arg3"],
  "evidence_needed": ["evidencia1", "evidencia2"],
  "risks": ["riesgo1", "riesgo2"],
  "hostile_questions": ["pregunta1", "pregunta2", "pregunta3"],
  "answers": ["respuesta1", "respuesta2", "respuesta3"],
  "counter_narrative": "Contranarrativa sugerida",
  "recommended_channel": "linkedin|twitter|press_release|email|speech|internal",
  "timing": "inmediato|24h|semana|no_urgente",
  "do_not_say": ["evitar1", "evitar2"],
  "success_metric": "Métrica de éxito"
}}"""

    result = _route("comms_strategy", prompt, ctx)
    data = _parse_json_result(result)
    if not isinstance(data, dict):
        data = {}

    return {
        "issue": issue,
        "rival_frame": data.get("rival_frame", ""),
        "own_frame": data.get("own_frame", ""),
        "central_message": data.get("central_message", ""),
        "three_arguments": data.get("three_arguments", []),
        "evidence_needed": data.get("evidence_needed", []),
        "risks": data.get("risks", []),
        "hostile_questions": data.get("hostile_questions", []),
        "answers": data.get("answers", []),
        "counter_narrative": data.get("counter_narrative", ""),
        "recommended_channel": data.get("recommended_channel", "internal"),
        "timing": data.get("timing", "no_urgente"),
        "do_not_say": data.get("do_not_say", []),
        "success_metric": data.get("success_metric", ""),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "real",
    }


def build_message_triangle(issue: str, audience: str = "general") -> dict:
    """Construye el triángulo de mensajes (mensaje central + 3 argumentos + evidencias)."""
    if not _is_ollama_available():
        return {
            "central_message": f"[DEMO] Mensaje sobre: {issue[:50]}",
            "argument_1": "Argumento basado en datos",
            "argument_2": "Argumento basado en valores",
            "argument_3": "Argumento basado en consecuencias",
            "audience": audience,
            "issue": issue,
            "mode": "demo",
        }

    prompt = f"""Genera un triángulo de mensajes en JSON para el issue: {issue}
Audiencia: {audience}

{{
  "central_message": "Un frase clara y memorable",
  "argument_1": "Primer argumento (datos/hechos)",
  "argument_2": "Segundo argumento (valores/principios)",
  "argument_3": "Tercer argumento (consecuencias/futuro)",
  "tone": "combativo|moderado|conciliador|técnico|emocional"
}}"""

    result = _route("comms_strategy", prompt)
    data = _parse_json_result(result)
    if not isinstance(data, dict):
        data = {}
    # Ensure required key is always present
    data.setdefault("central_message", data.get("central_message") or f"[Mensaje sobre: {issue[:40]}]")
    return {**data, "issue": issue, "audience": audience, "mode": "real"}


def generate_counter_narratives(narrative_frame: str, own_position: str = "") -> list[dict]:
    """Genera contranarrativas para un frame rival."""
    if not _is_ollama_available():
        return [{
            "counter": f"[DEMO] Contranarrativa para: {narrative_frame[:50]}",
            "approach": "reframing",
            "mode": "demo",
        }]

    prompt = f"""Para el frame narrativo rival: "{narrative_frame}"
Posición propia: "{own_position}"

Genera 3 contranarrativas en JSON array:
[
  {{"counter": "...", "approach": "reframing|evidence|reductio|redirect", "channel": "...", "risk": "alto|medio|bajo"}},
  ...
]"""
    result = _route("comms_strategy", prompt)
    data = _parse_json_result(result)
    if isinstance(data, dict):
        data = [data]
    if isinstance(data, list):
        return data
    return [{"counter": str(data), "approach": "generic", "mode": "real"}]


def generate_hostile_qna(issue: str, n_questions: int = 5) -> list[dict]:
    """Genera Q&A hostil: preguntas de periodista agresivo + respuestas."""
    if not _is_ollama_available():
        return [{
            "question": f"[DEMO] ¿No es usted responsable del problema de {issue[:30]}?",
            "answer": "[DEMO] Respuesta modelo pendiente de activar Ollama",
            "hostility": "alta",
            "mode": "demo",
        }]

    prompt = f"""Simula {n_questions} preguntas hostiles de periodista sobre: {issue}
Y genera las respuestas modelo. JSON array:
[
  {{"question": "...", "answer": "...", "hostility": "alta|media|baja", "trap": "..."}},
  ...
]"""
    result = _route("qna", prompt)
    data = _parse_json_result(result)
    if isinstance(data, list):
        return data
    return []


def red_team_message(message: str, asset_type: str = "press_note") -> dict:
    """Analiza debilidades de un mensaje desde perspectiva adversarial."""
    # Guardrails siempre se ejecutan independientemente de Ollama
    flags: list = []
    try:
        from communications.comms_guardrails import run_full_guardrail_check
        from communications.schemas import ContentAsset
        asset = ContentAsset(
            asset_type=asset_type,
            title="Red team check",
            body=message,
            body_markdown=message,
            tenant_id="default",
        )
        guardrail_result = run_full_guardrail_check(asset)
        flags = guardrail_result.flags if hasattr(guardrail_result, "flags") else []
    except Exception as e:
        log.warning("guardrails check failed: %s", e)

    if not _is_ollama_available():
        return {
            "message": message[:100],
            "weaknesses": ["[DEMO] Activar Ollama para análisis adversarial"],
            "attack_vectors": [],
            "risk_level": "unknown",
            "suggested_improvements": [],
            "do_not_say": [],
            "guardrail_flags": flags,
            "mode": "demo",
        }

    prompt = f"""Analiza este mensaje político como adversario experto. ¿Dónde es vulnerable?

MENSAJE: {message[:500]}

JSON:
{{
  "weaknesses": ["debilidad1", "debilidad2"],
  "attack_vectors": ["vector1", "vector2"],
  "risk_level": "alto|medio|bajo",
  "suggested_improvements": ["mejora1", "mejora2"],
  "do_not_say": ["evitar esto"]
}}"""

    result = _route("red_team", prompt)
    data = _parse_json_result(result)
    if not isinstance(data, dict):
        data = {}

    return {
        "message": message[:100],
        **data,
        "guardrail_flags": flags,
        "mode": "real",
    }


def recommend_channel_mix(issue: str, urgency: str = "normal",
                           audience: list[str] | None = None) -> list[dict]:
    """Recomienda mezcla de canales para el issue."""
    urgency_map = {
        "crisis": [
            {"channel": "press_note", "priority": 1, "reason": "Comunicado urgente"},
            {"channel": "twitter_x", "priority": 2, "reason": "Alcance inmediato"},
            {"channel": "email", "priority": 3, "reason": "Stakeholders clave"},
        ],
        "alta": [
            {"channel": "linkedin", "priority": 1, "reason": "Audiencia profesional"},
            {"channel": "newsletter", "priority": 2, "reason": "Base propia"},
            {"channel": "press_note", "priority": 3, "reason": "Medios tradicionales"},
        ],
        "normal": [
            {"channel": "linkedin", "priority": 1, "reason": "Engagement profesional"},
            {"channel": "newsletter", "priority": 2, "reason": "Nurturing base"},
            {"channel": "internal", "priority": 3, "reason": "Alineación interna"},
        ],
        "baja": [
            {"channel": "internal", "priority": 1, "reason": "Solo interno por ahora"},
            {"channel": "newsletter", "priority": 2, "reason": "Educación de base"},
        ],
    }
    return urgency_map.get(urgency, urgency_map["normal"])


def _demo_comms_strategy(issue: str) -> dict:
    return {
        "rival_frame": f"[DEMO] El gobierno ha fallado en {issue[:30]}",
        "own_frame": f"[DEMO] Estamos avanzando en {issue[:30]} con medidas concretas",
        "central_message": "[DEMO] Activa Ollama para estrategia real",
        "three_arguments": ["[DEMO] Arg 1", "[DEMO] Arg 2", "[DEMO] Arg 3"],
        "evidence_needed": ["Datos verificables", "Estudios de impacto"],
        "risks": ["Ataque oposición", "Cobertura negativa"],
        "hostile_questions": ["¿No es demasiado tarde?", "¿Quién paga?"],
        "answers": ["[DEMO] Respuesta 1", "[DEMO] Respuesta 2"],
        "counter_narrative": "[DEMO] Contranarrativa: conecta Ollama",
        "recommended_channel": "internal",
        "timing": "no_urgente",
        "do_not_say": ["Expresiones polarizadoras"],
        "success_metric": "Reducción de cobertura negativa en 50%",
    }
