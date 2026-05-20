"""
TypedAgent adapter · envuelve `pydantic-ai` Agent sobre brain tools.

Sprint 5 · S5.5

Por qué pydantic-ai:
  - Validación I/O tipada (cero JSON malformado del LLM)
  - Routing automático tool-call → función Python
  - Reintentos y tracing built-in
  - Backend-agnóstico (OpenAI / Anthropic / Groq via OpenAI-compat)

Por qué un adapter en vez de usar pydantic-ai directo:
  - Las brain tools ya existen en `agents/tools/*` con su lógica de
    dominio · queremos reutilizarlas, no reescribirlas
  - Necesitamos que la app arranque aunque pydantic-ai no esté instalado
    (entornos minimal · CI sin extras)
  - Centralizamos la elección de modelo y el system prompt
"""
from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass, field
from typing import Any, Callable

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Catálogo de brain tools que el adapter sabe enchufar
# ─────────────────────────────────────────────────────────────────
# Mapa: tool_name → (module_path, attr_name). Permite añadir tools
# nuevas sin tocar el adapter (sólo extender el diccionario).
KNOWN_TOOLS: dict[str, tuple[str, str]] = {
    # Electoral
    "get_current_nowcast": ("agents.tools.electoral_tools", "get_current_nowcast"),
    "get_recent_polls": ("agents.tools.electoral_tools", "get_recent_polls"),
    # Economía / banca
    "cnmv_hechos_relevantes": ("agents.tools.banca_tools", "cnmv_hechos_relevantes"),
    "bde_indicador": ("agents.tools.banca_tools", "bde_indicador"),
    "dora_compliance_status": ("agents.tools.banca_tools", "dora_compliance_status"),
    # Geopolítica
    "get_country_risk_profile": (
        "agents.tools.geopolitics_tools", "get_country_risk_profile",
    ),
    "get_geopolitical_events": (
        "agents.tools.geopolitics_tools", "get_geopolitical_events",
    ),
    # Compliance
    "compliance_screen": ("agents.tools.compliance_tools", "compliance_screen"),
    "opensanctions_search": (
        "agents.tools.compliance_tools", "opensanctions_search",
    ),
    # Sector briefing (S6.3)
    "sector_briefing": ("agents.tools.sector_briefing_tools", "sector_briefing"),
    "sector_briefing_extended": (
        "agents.tools.sector_briefing_tools", "sector_briefing_extended",
    ),
    "list_sectors": ("agents.tools.sector_briefing_tools", "list_sectors"),
}


class TypedAgentUnavailable(RuntimeError):
    """`pydantic_ai` no está disponible o no se pudo construir el agente."""


@dataclass
class TypedAgentResult:
    """Resultado serializable de una ejecución de TypedAgent."""

    ok: bool
    output: Any = None
    error: str | None = None
    trace: list[dict[str, Any]] = field(default_factory=list)
    model: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "output": self.output,
            "error": self.error,
            "trace": list(self.trace),
            "model": self.model,
        }


# ─────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────

def _import_pydantic_ai() -> Any:
    """Importa pydantic_ai · lanza TypedAgentUnavailable si falla."""
    try:
        return importlib.import_module("pydantic_ai")
    except ImportError as exc:
        raise TypedAgentUnavailable(
            "pydantic-ai no está instalado · pip install 'pydantic-ai>=0.0.20' "
            "(ya está en requirements.txt)."
        ) from exc


def _resolve_tool(tool_name: str) -> Callable[..., Any]:
    """Resuelve una tool del catálogo · lanza ValueError si no existe."""
    if tool_name not in KNOWN_TOOLS:
        raise ValueError(
            f"Tool '{tool_name}' no está en el catálogo · añádela a KNOWN_TOOLS "
            f"en agents/typed/adapter.py. Conocidas: {sorted(KNOWN_TOOLS)}"
        )
    module_path, attr = KNOWN_TOOLS[tool_name]
    try:
        mod = importlib.import_module(module_path)
    except ImportError as exc:
        raise TypedAgentUnavailable(
            f"Módulo '{module_path}' no importable para tool '{tool_name}': {exc}"
        ) from exc
    fn = getattr(mod, attr, None)
    if fn is None or not callable(fn):
        raise TypedAgentUnavailable(
            f"'{module_path}.{attr}' no existe o no es callable"
        )
    return fn


# ─────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────

def is_available() -> bool:
    """¿Está pydantic-ai disponible? (sin levantar excepciones)."""
    try:
        importlib.import_module("pydantic_ai")
        return True
    except ImportError:
        return False


def list_known_tools() -> list[str]:
    """Lista de tool_names que el adapter puede enchufar."""
    return sorted(KNOWN_TOOLS.keys())


class _TypedAgentHandle:
    """Handle ligero · oculta pydantic-ai detrás de una interfaz estable."""

    def __init__(
        self,
        agent: Any,
        name: str,
        model: str,
        tool_names: list[str],
    ):
        self._agent = agent
        self.name = name
        self.model = model
        self.tool_names = tool_names

    def run_sync(self, user_prompt: str) -> TypedAgentResult:
        """Ejecuta el agente síncronamente · devuelve TypedAgentResult."""
        try:
            run_result = self._agent.run_sync(user_prompt)
        except Exception as exc:
            logger.warning(
                "TypedAgent[%s] error en run_sync: %s", self.name, exc, exc_info=True
            )
            return TypedAgentResult(
                ok=False,
                error=f"{type(exc).__name__}: {exc}",
                model=self.model,
            )

        # pydantic-ai expone `data` o `output` según versión · cubrimos ambos
        output: Any = (
            getattr(run_result, "output", None)
            if hasattr(run_result, "output")
            else getattr(run_result, "data", None)
        )

        trace: list[dict[str, Any]] = []
        messages = getattr(run_result, "all_messages", None)
        if callable(messages):
            try:
                for msg in messages():
                    trace.append({"kind": type(msg).__name__, "repr": str(msg)[:280]})
            except Exception:  # pragma: no cover · best-effort tracing
                pass

        return TypedAgentResult(
            ok=True,
            output=output,
            trace=trace,
            model=self.model,
        )


def build_typed_agent(
    name: str,
    system_prompt: str,
    tools: list[str],
    model: str | None = None,
) -> _TypedAgentHandle:
    """
    Construye un agente pydantic-ai con las tools indicadas.

    Args:
        name: identificador legible (logs).
        system_prompt: instrucción de sistema.
        tools: lista de tool_names del catálogo KNOWN_TOOLS.
        model: identificador de modelo (ej. "groq:llama-3.3-70b-versatile",
            "openai:gpt-4o-mini"). Si None, usa "groq:llama-3.3-70b-versatile"
            por defecto (alineado con el stack actual de Politeia).

    Returns:
        _TypedAgentHandle · llamar `.run_sync(prompt)` para ejecutar.

    Raises:
        TypedAgentUnavailable: si pydantic-ai no está instalado o una tool
            no se puede resolver.
        ValueError: si una tool no está en KNOWN_TOOLS.
    """
    pai = _import_pydantic_ai()
    Agent = getattr(pai, "Agent", None)
    if Agent is None:
        raise TypedAgentUnavailable(
            "pydantic_ai.Agent no existe · ¿versión incompatible? "
            "Esperado: pydantic-ai>=0.0.20"
        )

    # Resolver todas las tools antes de construir el agente · fail-fast
    resolved: list[tuple[str, Callable[..., Any]]] = [
        (t, _resolve_tool(t)) for t in tools
    ]

    chosen_model = model or "groq:llama-3.3-70b-versatile"

    try:
        agent = Agent(
            chosen_model,
            system_prompt=system_prompt,
        )
    except Exception as exc:
        raise TypedAgentUnavailable(
            f"No se pudo instanciar pydantic_ai.Agent('{chosen_model}'): {exc}"
        ) from exc

    # Registrar tools · pydantic-ai usa `@agent.tool_plain` para funciones
    # sin contexto (las nuestras lo son · son closures puros sobre servicios)
    register = getattr(agent, "tool_plain", None) or getattr(agent, "tool", None)
    if register is None:
        raise TypedAgentUnavailable(
            "Ni `tool_plain` ni `tool` disponibles en Agent · API incompatible"
        )

    for tool_name, fn in resolved:
        try:
            register(fn)
        except Exception as exc:
            raise TypedAgentUnavailable(
                f"Error registrando tool '{tool_name}': {exc}"
            ) from exc

    logger.info(
        "TypedAgent[%s] listo · model=%s · tools=%s",
        name, chosen_model, [t for t, _ in resolved],
    )

    return _TypedAgentHandle(
        agent=agent,
        name=name,
        model=chosen_model,
        tool_names=[t for t, _ in resolved],
    )
