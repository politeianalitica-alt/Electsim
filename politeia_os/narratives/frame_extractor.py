"""
Extraccion del frame narrativo via Ollama (llama3.1:8b).

Recibe los titulares mas representativos de un cluster y extrae:
  1. frame_label    — nombre canonico del frame (max 5 palabras)
  2. frame_tipo     — diagnostico | pronostico | motivacional | evaluativo
  3. frame_terminos — top 3 terminos lexicos caracteristicos
  4. frame_favorecido / frame_perjudicado — polaridad del frame
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Optional

import httpx

log = logging.getLogger(__name__)

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL    = os.getenv("NARRATIVE_OLLAMA_MODEL", "llama3.1:8b")
_TIMEOUT         = float(os.getenv("OLLAMA_TIMEOUT", "60"))

_FRAME_TIPOS = {"diagnostico", "pronostico", "motivacional", "evaluativo"}

_SYSTEM_PROMPT = """\
Eres un experto en analisis de discurso y encuadres mediaticos (framing).
Cuando analices titulares, identifica el marco interpretativo dominante segun
la taxonomia de Entman: diagnostico (describe el problema), pronostico (propone
soluciones), motivacional (llama a la accion) o evaluativo (valora resultados).
Responde SIEMPRE en JSON valido, sin texto fuera del objeto JSON.
"""

_USER_TEMPLATE = """\
Analiza los siguientes {n} titulares periodisticos que pertenecen al mismo cluster tematico.
Contexto adicional de los articulos mas representativos:
---
{contexto}
---
Titulares del cluster:
{titulares}

Extrae el marco narrativo dominante y devuelve un JSON con exactamente estas claves:
{{
  "frame_label": "<nombre del frame en maximo 5 palabras en espanol>",
  "frame_tipo": "<diagnostico|pronostico|motivacional|evaluativo>",
  "frame_terminos": ["<termino1>", "<termino2>", "<termino3>"],
  "frame_favorecido": "<quien sale beneficiado del frame, en 1-3 palabras>",
  "frame_perjudicado": "<quien sale perjudicado del frame, en 1-3 palabras>"
}}
"""


def _call_ollama(prompt: str, system: str) -> str:
    """Llama a Ollama con el prompt y sistema dados; retorna el texto generado."""
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(
                f"{_OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": _OLLAMA_MODEL,
                    "messages": [
                        {"role": "system",  "content": system},
                        {"role": "user",    "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.2, "num_predict": 300},
                },
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"].strip()
    except httpx.TimeoutException:
        log.warning("Timeout llamando a Ollama en frame_extractor")
        return ""
    except Exception as exc:
        log.warning("Error en frame_extractor Ollama: %s", exc)
        return ""


def _parse_frame_json(raw: str) -> dict:
    """Extrae el objeto JSON del texto generado por Ollama."""
    # Intentar extraer bloque ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if match:
        raw = match.group(1)
    else:
        # Buscar primer { ... } en el texto
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            raw = match.group(0)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        log.warning("frame_extractor: JSON invalido en respuesta Ollama")
        return {}


def _sanitize_frame_tipo(tipo: str) -> str:
    """Normaliza el tipo de frame al vocabulario controlado."""
    tipo_low = (tipo or "").lower().strip()
    for valid in _FRAME_TIPOS:
        if valid in tipo_low:
            return valid
    return "evaluativo"  # fallback


def extract_frame(
    headlines: list[str],
    context_snippets: list[str],
) -> dict:
    """
    Extrae el frame narrativo de un cluster dado sus titulares y snippets de contexto.

    Args:
        headlines:        Lista de titulares representativos (hasta 10).
        context_snippets: Fragmentos de los articulos con mayor peso en el cluster.

    Returns:
        Dict con claves: frame_label, frame_tipo, frame_terminos,
        frame_favorecido, frame_perjudicado.
        Si Ollama falla retorna valores por defecto no vacios.
    """
    if not headlines:
        return {
            "frame_label": "narrativa sin titular",
            "frame_tipo": "evaluativo",
            "frame_terminos": [],
            "frame_favorecido": "",
            "frame_perjudicado": "",
        }

    top_headlines = headlines[:10]
    titulares_str = "\n".join(f"- {h}" for h in top_headlines)
    contexto_str  = "\n\n".join(context_snippets[:3])[:1500]  # limitar tokens

    prompt = _USER_TEMPLATE.format(
        n=len(top_headlines),
        contexto=contexto_str or "(sin contexto adicional)",
        titulares=titulares_str,
    )

    raw = _call_ollama(prompt, _SYSTEM_PROMPT)
    data = _parse_frame_json(raw) if raw else {}

    # Valores de seguridad si el JSON llego incompleto
    frame_label  = str(data.get("frame_label", "")).strip() or _infer_label_from_headlines(top_headlines)
    frame_tipo   = _sanitize_frame_tipo(data.get("frame_tipo", ""))
    terminos_raw = data.get("frame_terminos", [])
    frame_terminos = [str(t).strip() for t in terminos_raw if t][:3]

    return {
        "frame_label":       frame_label,
        "frame_tipo":        frame_tipo,
        "frame_terminos":    frame_terminos,
        "frame_favorecido":  str(data.get("frame_favorecido", "")).strip(),
        "frame_perjudicado": str(data.get("frame_perjudicado", "")).strip(),
    }


def _infer_label_from_headlines(headlines: list[str]) -> str:
    """Genera un label de frame emergencia extrayendo las 3 palabras mas frecuentes."""
    from collections import Counter
    stop = {
        "de", "la", "el", "en", "y", "a", "los", "las", "del", "al",
        "un", "una", "con", "por", "para", "que", "se", "es", "su",
        "lo", "le", "no", "si", "ha", "han", "the", "of", "in", "and",
    }
    words: list[str] = []
    for h in headlines:
        words.extend(
            w.lower().strip(".,;:\"'()[]")
            for w in h.split()
            if len(w) > 3 and w.lower() not in stop
        )
    if not words:
        return "narrativa emergente"
    top = Counter(words).most_common(3)
    return " ".join(w for w, _ in top)
