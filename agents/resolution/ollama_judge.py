"""
Arbitro Ollama para resolucion de entidades de baja confianza (Bloque 2).

Se invoca cuando el embedding encuentra candidatos pero ninguno supera
el umbral de auto-resolucion (0.88). El modelo recibe:
  - La superficie de la mencion
  - La ventana de contexto
  - Los candidatos (QID + nombre + score de embedding)

Y debe devolver un JSON estructurado con la decision.

Temperatura 0 para maxima determinismo.
Usa el mismo cliente Ollama que el resto del sistema.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

from .models import Candidate, ResolutionMethod

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL    = os.getenv("ER_OLLAMA_MODEL", "politeia-brain:latest")
_TIMEOUT_SECONDS = 30

# Umbral minimo para que Ollama acepte su propia decision
_OLLAMA_MIN_ACCEPT_SCORE = 0.65


# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

_PROMPT_TEMPLATE = """\
Eres un sistema de resolucion de identidades politicas. Tu tarea es decidir
a que entidad canonical corresponde la siguiente mencion en un texto periodistico espanol.

MENCION: "{surface}"
CONTEXTO: "{context}"

CANDIDATOS (ordenados por similitud):
{candidates_block}

Reglas de decision:
1. Selecciona el candidato correcto solo si estas seguro (confianza > 0.70).
2. Si ninguno encaja con el contexto, responde con qid: null.
3. Basa la decision en el contexto, no solo en el nombre.
4. Considera el cargo y partido del candidato si estan disponibles.

Responde SOLO con JSON valido, sin explicaciones adicionales:
{{"qid": "<QID o null>", "confianza": <float 0-1>, "razon": "<una frase breve>"}}
"""


def _build_candidates_block(candidates: list[Candidate]) -> str:
    lines = []
    for i, c in enumerate(candidates, 1):
        lines.append(
            f"  {i}. QID={c.qid} | {c.nombre_oficial} [{c.tipo}] | score_embedding={c.score:.3f}"
        )
    return "\n".join(lines) if lines else "  (sin candidatos)"


# ---------------------------------------------------------------------------
# Cliente Ollama
# ---------------------------------------------------------------------------

def _ollama_generate(prompt: str) -> Optional[str]:
    """Llama a Ollama con el prompt dado y devuelve la respuesta cruda."""
    try:
        import httpx  # type: ignore
    except ImportError:
        try:
            import urllib.request, urllib.error
            import json as _json
            payload = json.dumps({"model": _OLLAMA_MODEL, "prompt": prompt, "stream": False}).encode()
            req = urllib.request.Request(
                f"{_OLLAMA_BASE_URL}/api/generate",
                data=payload,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=_TIMEOUT_SECONDS) as resp:
                data = _json.loads(resp.read())
                return data.get("response", "")
        except Exception as exc:
            log.warning("Error Ollama (urllib): %s", exc)
            return None

    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
            resp = client.post(
                f"{_OLLAMA_BASE_URL}/api/generate",
                json={"model": _OLLAMA_MODEL, "prompt": prompt, "stream": False,
                      "options": {"temperature": 0}},
            )
            resp.raise_for_status()
            return resp.json().get("response", "")
    except Exception as exc:
        log.warning("Error Ollama (httpx): %s", exc)
        return None


# ---------------------------------------------------------------------------
# Funcion principal de arbitraje
# ---------------------------------------------------------------------------

def judge(
    surface_text: str,
    surface_norm: str,
    context_window: str,
    candidates: list[Candidate],
) -> tuple[Optional[str], float, str, Optional[str]]:
    """
    Llama al arbitro Ollama y devuelve la decision.

    Returns:
      (resolved_qid, confidence_score, method_str, raw_response)
        resolved_qid     — QID elegido o None
        confidence_score — confianza reportada por Ollama [0, 1]
        method_str       — 'ollama' o 'review'
        raw_response     — texto crudo de Ollama para logging
    """
    if not candidates:
        return None, 0.0, ResolutionMethod.REVIEW, None

    prompt = _PROMPT_TEMPLATE.format(
        surface=surface_text[:120],
        context=context_window[:400],
        candidates_block=_build_candidates_block(candidates[:5]),
    )

    raw_response = _ollama_generate(prompt)
    if raw_response is None:
        log.warning("Ollama no respondio para '%s'", surface_text[:50])
        return None, 0.0, ResolutionMethod.REVIEW, None

    # Parsear JSON de la respuesta
    decision = _parse_response(raw_response)
    if decision is None:
        log.warning("Ollama respuesta no parseable: %s", raw_response[:200])
        return None, 0.0, ResolutionMethod.REVIEW, raw_response

    chosen_qid   = decision.get("qid")
    confianza    = float(decision.get("confianza", 0.0))

    # Validar que el QID elegido este entre los candidatos
    candidate_qids = {c.qid for c in candidates}
    if chosen_qid and chosen_qid not in candidate_qids:
        log.warning(
            "Ollama eligio QID %s que no esta en candidatos para '%s'",
            chosen_qid, surface_text[:50],
        )
        chosen_qid = None

    if chosen_qid is None or confianza < _OLLAMA_MIN_ACCEPT_SCORE:
        return None, confianza, ResolutionMethod.REVIEW, raw_response

    return chosen_qid, confianza, ResolutionMethod.OLLAMA, raw_response


def _parse_response(text: str) -> Optional[dict]:
    """Extrae el primer objeto JSON valido del texto de respuesta."""
    text = text.strip()
    # Buscar bloque JSON
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start == -1 or end == 0:
        return None
    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError:
        return None
