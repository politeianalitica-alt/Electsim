"""Orquestación de plantillas + LLM para briefings."""

from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader


def render_template(template_name: str, context: dict) -> str:
    """Renderiza una plantilla Jinja2 de briefings."""
    env = Environment(loader=FileSystemLoader(str(Path(__file__).parent / "templates")))
    tpl = env.get_template(template_name)
    return tpl.render(**context)

