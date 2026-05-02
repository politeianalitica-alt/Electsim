"""
Loader de prompts versionados para ElectSim.

Uso:
    from packages.prompts import load_prompt, render_prompt

    template = load_prompt("intelligence.morning_briefing")
    text = render_prompt(template, date="2026-05-01", org_context="Consultora Demo", ...)
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

_PROMPTS_DIR = Path(__file__).parent / "src"

# Cache de prompts cargados
_cache: Dict[str, "PromptTemplate"] = {}


@dataclass
class PromptTemplate:
    id: str
    version: str
    model: str
    task_type: str
    inputs: list
    output_schema: Dict[str, Any]
    template: str   # contenido Markdown sin el bloque YAML


class PromptNotFoundError(Exception):
    """El prompt solicitado no existe en el catalogo."""


def load_prompt(prompt_id: str, use_cache: bool = True) -> PromptTemplate:
    """
    Carga un prompt por su ID (ej: "intelligence.morning_briefing").

    El ID mapea a: src/<categoria>/<nombre>.md
    Ej: "intelligence.morning_briefing" -> src/intelligence/morning_briefing.md

    Args:
        prompt_id:  ID del prompt en formato "<categoria>.<nombre>".
        use_cache:  Si True, usa cache en memoria.

    Returns:
        PromptTemplate con metadata y template Jinja2.

    Raises:
        PromptNotFoundError: si el prompt no existe.
    """
    if use_cache and prompt_id in _cache:
        return _cache[prompt_id]

    parts = prompt_id.split(".", 1)
    if len(parts) != 2:
        raise PromptNotFoundError(
            f"ID de prompt invalido: {prompt_id!r}. Formato esperado: '<categoria>.<nombre>'"
        )

    category, name = parts
    path = _PROMPTS_DIR / category / f"{name}.md"

    if not path.exists():
        raise PromptNotFoundError(
            f"Prompt no encontrado: {prompt_id!r} (buscado en {path})"
        )

    raw = path.read_text(encoding="utf-8")
    template = _parse_prompt(prompt_id, raw)

    if use_cache:
        _cache[prompt_id] = template

    return template


def render_prompt(template: PromptTemplate, **kwargs: Any) -> str:
    """
    Renderiza un prompt con los valores dados.

    Usa Jinja2 si disponible, fallback a str.format_map para templates simples.

    Args:
        template: PromptTemplate cargado con load_prompt.
        **kwargs: Variables para la plantilla.

    Returns:
        Texto del prompt con variables sustituidas.
    """
    try:
        from jinja2 import Environment, Undefined

        class _KeepUndefined(Undefined):
            """Variable no definida: mantiene {{ var }} en lugar de lanzar error."""
            def __str__(self) -> str:
                return f"{{{{ {self._undefined_name} }}}}"
            def __iter__(self):
                return iter([])
            def __len__(self) -> int:
                return 0

        env = Environment(undefined=_KeepUndefined)
        jinja_template = env.from_string(template.template)
        return jinja_template.render(**kwargs)
    except ImportError:
        # Fallback: sustitucion simple {{ var }}
        result = template.template
        for key, value in kwargs.items():
            result = result.replace(f"{{{{ {key} }}}}", str(value))
        return result


def list_prompts(category: Optional[str] = None) -> list[str]:
    """Lista todos los prompts disponibles, opcionalmente filtrados por categoria."""
    results = []
    for md_file in _PROMPTS_DIR.rglob("*.md"):
        rel = md_file.relative_to(_PROMPTS_DIR)
        parts = list(rel.parts)
        if len(parts) == 2:
            cat, name = parts[0], parts[1].removesuffix(".md")
            prompt_id = f"{cat}.{name}"
            if category is None or cat == category:
                results.append(prompt_id)
    return sorted(results)


def invalidate_cache() -> None:
    """Invalida el cache de prompts (util en tests)."""
    _cache.clear()


# ---------------------------------------------------------------------------
# Parsing interno
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def _parse_prompt(prompt_id: str, raw: str) -> PromptTemplate:
    """Extrae frontmatter YAML y template del archivo Markdown."""
    import yaml  # noqa: PLC0415

    match = _FRONTMATTER_RE.match(raw)
    if not match:
        raise ValueError(f"Prompt {prompt_id!r} no tiene frontmatter YAML valido")

    meta = yaml.safe_load(match.group(1))
    template_text = raw[match.end():].strip()

    return PromptTemplate(
        id=meta.get("id", prompt_id),
        version=str(meta.get("version", "1.0")),
        model=meta.get("model", "electsim-analysis"),
        task_type=meta.get("task_type", "analysis"),
        inputs=meta.get("inputs", []),
        output_schema=meta.get("output_schema", {}),
        template=template_text,
    )
