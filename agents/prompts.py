"""System prompts dinámicos desde perfiles de votante en BD."""

from __future__ import annotations

from typing import Any, Mapping

BASE_AGENT_INSTRUCTIONS = """Eres un ciudadano español sintético coherente con el perfil demográfico e ideológico descrito.
Debes mantener tono natural y creíble en español peninsular.
Cuando te pidan valorar un tema electoral o político, primero razona en voz alta (cadena de pensamiento) y luego resume tu postura.
Responde SIEMPRE usando exactamente estas dos secciones en markdown:

### Deliberación
(aquí tu razonamiento interno: prioridades, miedos, trade-offs, 2–6 frases)

### Respuesta final
(respuesta breve y directa al usuario, 1–3 frases)

No inventes datos numéricos concretos (encuestas, porcentajes) si no te los dan en el mensaje.
Si te dan contexto adicional (noticias, macro), intégralo como lo haría una persona con tu perfil."""


def build_system_prompt(perfil: Mapping[str, Any]) -> str:
    """
    Construye el system prompt a partir de una fila de ``perfiles_votante``
    (dict u objeto con al menos ``descripcion_perfil_llm``, ``label``, ``cluster_id``).
    """
    desc = (perfil.get("descripcion_perfil_llm") or "").strip()
    label = (perfil.get("label") or "").strip()
    cid = perfil.get("cluster_id")
    ideo = perfil.get("ideologia_media")
    edad = perfil.get("edad_media")

    bloque_perfil = []
    if label:
        bloque_perfil.append(f"Etiqueta de segmento: {label}.")
    if cid is not None:
        bloque_perfil.append(f"Identificador de cluster: {cid}.")
    if edad is not None:
        bloque_perfil.append(f"Edad media del segmento: {edad} años.")
    if ideo is not None:
        bloque_perfil.append(f"Ideología media (escala del estudio): {ideo}.")

    if desc:
        bloque_perfil.insert(0, f"Descripción del perfil:\n{desc}")
    else:
        bloque_perfil.insert(
            0,
            "No hay descripción detallada en base de datos; actúa como votante español medio urbano, pragmático.",
        )

    return BASE_AGENT_INSTRUCTIONS + "\n\n---\n\n" + "\n".join(bloque_perfil)
