"""Simulador de debate y generador de argumentarios."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass


@dataclass
class SimulacionDebate:
    tema: str
    partido_propio: str
    adversario: str
    preguntas_prob: list[str]
    respuestas_sug: list[str]
    contra_replicas: list[str]
    puntos_presion: list[str]
    lineas_rojas: list[str]
    raw_llm: str


@dataclass
class Argumentario:
    tipo: str
    tema: str
    partido_propio: str
    adversario: str | None
    contenido: str
    bullets: list[str]


def _llamar_claude(prompt: str, max_tokens: int = 2000) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return (
            '{"preguntas_probables":["[MOCK] Pregunta clave"],'
            '"respuestas_sugeridas":["[MOCK] Respuesta sugerida"],'
            '"contra_replicas":["[MOCK] Contra-replica"],'
            '"puntos_de_presion":["[MOCK] Configura ANTHROPIC_API_KEY"],'
            '"lineas_rojas":["[MOCK] No improvisar"]}'
        )

    try:
        import anthropic
    except Exception:
        return "[MOCK] Instalar dependencia anthropic o configurar entorno."

    client = anthropic.Anthropic(api_key=api_key)
    model = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-1")
    msg = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    blocks = getattr(msg, "content", [])
    if not blocks:
        return ""
    first = blocks[0]
    return str(getattr(first, "text", ""))


def simular_debate(
    partido_propio: str,
    adversario: str,
    tema: str,
    formato: str = "debate televisivo",
    declaraciones_adversario: list[str] | None = None,
    contradicciones: list[str] | None = None,
    datos_encuestas: str = "Sin datos",
) -> SimulacionDebate:
    decl = "\n".join(f"- {x}" for x in (declaraciones_adversario or [])[:5]) or "Sin declaraciones"
    contra = "\n".join(f"- {x}" for x in (contradicciones or [])[:5]) or "Sin contradicciones"
    prompt = f"""
Eres estratega politico senior.
Partido propio: {partido_propio}
Adversario: {adversario}
Tema: {tema}
Formato: {formato}
Encuestas: {datos_encuestas}
Declaraciones adversario:\n{decl}
Contradicciones:\n{contra}

Devuelve JSON con claves exactas:
- preguntas_probables
- respuestas_sugeridas
- contra_replicas
- puntos_de_presion
- lineas_rojas
"""
    raw = _llamar_claude(prompt, max_tokens=2500)
    data: dict = {}
    try:
        m = re.search(r"\{[\s\S]*\}", raw)
        data = json.loads(m.group(0) if m else raw)
    except Exception:
        data = {}

    return SimulacionDebate(
        tema=tema,
        partido_propio=partido_propio,
        adversario=adversario,
        preguntas_prob=list(data.get("preguntas_probables", [])),
        respuestas_sug=list(data.get("respuestas_sugeridas", [])),
        contra_replicas=list(data.get("contra_replicas", [])),
        puntos_presion=list(data.get("puntos_de_presion", [])),
        lineas_rojas=list(data.get("lineas_rojas", [])),
        raw_llm=raw,
    )


def generar_argumentario(
    partido_propio: str,
    tema: str,
    tipo_doc: str = "argumentario",
    adversario: str | None = None,
    declaraciones_propias: list[str] | None = None,
    contexto_datos: str = "",
) -> Argumentario:
    decl = "\n".join(f"- {x}" for x in (declaraciones_propias or [])[:5]) or "Sin declaraciones"
    prompt = f"""
Genera un {tipo_doc} en espanol.
Partido: {partido_propio}
Tema: {tema}
Adversario: {adversario or 'N/A'}
Contexto: {contexto_datos or 'N/A'}
Declaraciones propias:\n{decl}

Estilo: directo, util para campana.
"""
    text = _llamar_claude(prompt, max_tokens=2200)
    bullets = re.findall(r"^[-*]\s+(.+)", text, re.MULTILINE)
    return Argumentario(
        tipo=tipo_doc,
        tema=tema,
        partido_propio=partido_propio,
        adversario=adversario,
        contenido=text,
        bullets=bullets[:10],
    )
