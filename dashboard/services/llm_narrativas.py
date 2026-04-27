"""LLM opcional para narrativas de perfil y análisis de campaña (Anthropic Claude).

Fallback determinístico cuando no hay ANTHROPIC_API_KEY. La integración
sigue el mismo patrón que _safe_llm en dashboard/services/opposition.py.

Inspiración:
- _safe_llm() de opposition.py (mismo proyecto)
- AnthropicModel de prefect-main/examples/ai_database_cleanup_with_approval.py
  (patrón: client = anthropic.Anthropic(api_key=...), messages.create())
"""
from __future__ import annotations

import os
from typing import Any

from etl.logger import get_logger

logger = get_logger(__name__)

_MODEL_DEFAULT = "claude-sonnet-4-6"
_SYSTEM_ANALISTA = (
    "Eres analista político senior especializado en comportamiento electoral español. "
    "Escribe en español, tono profesional y directo."
)
_SYSTEM_CONSULTOR = (
    "Eres consultor de campaña electoral. Analiza el impacto estratégico de medidas "
    "con rigor y concisión. Español."
)


def llm_disponible() -> bool:
    """True si ANTHROPIC_API_KEY está configurada en el entorno."""
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


def _llamar(prompt: str, *, max_tokens: int = 800, system: str = _SYSTEM_ANALISTA) -> str:
    """Llama a la API de Anthropic. Retorna '' si no hay credenciales o falla."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return ""
    try:
        import anthropic  # type: ignore

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", _MODEL_DEFAULT),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        bloques = getattr(msg, "content", []) or []
        return str(getattr(bloques[0], "text", "") or "") if bloques else ""
    except Exception as exc:
        logger.warning("LLM no disponible: %s", exc)
        return ""


# ── Narrativa de perfil ────────────────────────────────────────────────────────

def narrativa_perfil(
    nombre: str,
    ideologia: float,
    peso_pct: float,
    preocupaciones: list[str],
    partido_lider: str,
    cohorte: str = "",
) -> str:
    """Narrativa de perfil electoral en lenguaje natural.

    Retorna '' cuando no hay ANTHROPIC_API_KEY (sin coste, sin error).
    """
    preocc = ", ".join(preocupaciones[:5]) if preocupaciones else "no disponibles"
    prompt = (
        f"Perfil electoral: {nombre}\n"
        f"Cohorte generacional: {cohorte or 'sin especificar'}\n"
        f"Ideología media (escala 1-10): {ideologia:.1f}\n"
        f"Peso electoral estimado: {peso_pct:.1f}% del electorado\n"
        f"Partido con mayor intención de voto: {partido_lider}\n"
        f"Principales preocupaciones: {preocc}\n\n"
        "En 3 párrafos concisos, analiza: (1) motivaciones y valores de este perfil, "
        "(2) comportamiento electoral esperado y lealtad de voto, "
        "(3) implicaciones estratégicas para una campaña que quiera captarlo."
    )
    return _llamar(prompt, max_tokens=700)


# ── Impacto de campaña ─────────────────────────────────────────────────────────

def narrativa_impacto_campana(
    tema: str,
    partido_emisor: str,
    impactos: dict[str, float],
    perfiles_afectados: list[str],
) -> str:
    """Narrativa estratégica del impacto de una medida de campaña.

    Retorna '' cuando no hay ANTHROPIC_API_KEY.
    """
    impactos_top = sorted(impactos.items(), key=lambda x: -abs(x[1]))[:6]
    impactos_txt = "; ".join(f"{p}: {v:+.1f}pp" for p, v in impactos_top)
    perfiles_txt = ", ".join(perfiles_afectados[:4]) if perfiles_afectados else "general"
    prompt = (
        f"Medida de campaña: {tema}\n"
        f"Partido promotor: {partido_emisor}\n"
        f"Impacto estimado por partido: {impactos_txt}\n"
        f"Perfiles de votante más afectados: {perfiles_txt}\n\n"
        "Analiza en 4 párrafos: (1) por qué esta medida tiene ese impacto diferencial "
        "en cada partido, (2) qué perfiles son más receptivos y por qué, "
        "(3) riesgos y contrargumentos esperados del rival, "
        "(4) recomendación táctica para el partido promotor."
    )
    return _llamar(prompt, max_tokens=900, system=_SYSTEM_CONSULTOR)


# ── Síntesis de simulación ─────────────────────────────────────────────────────

def sintesis_simulacion(
    partido_objetivo: str,
    perfil_nombre: str,
    temas: list[str],
    resultado: dict[str, Any],
) -> str:
    """Informe ejecutivo de simulación de campaña.

    Retorna '' cuando no hay ANTHROPIC_API_KEY.
    """
    temas_txt = ", ".join(temas[:5]) if temas else "sin especificar"
    resultado_txt = "; ".join(
        f"{k}: {v:+.1f}pp" if isinstance(v, (int, float)) else f"{k}: {v}"
        for k, v in list(resultado.items())[:8]
    )
    prompt = (
        f"Partido objetivo: {partido_objetivo}\n"
        f"Perfil demográfico objetivo: {perfil_nombre}\n"
        f"Temas de campaña simulados: {temas_txt}\n"
        f"Resultados clave de la simulación: {resultado_txt}\n\n"
        "Genera un informe ejecutivo de campaña con:\n"
        "• 5 hallazgos clave en forma de bullets\n"
        "• 1 párrafo de conclusión con recomendación de próximos pasos\n"
        "• 1 alerta de riesgo si la detectas\n"
        "Sé directo y concreto, como un memo de campaña real."
    )
    return _llamar(prompt, max_tokens=650, system=_SYSTEM_CONSULTOR)
