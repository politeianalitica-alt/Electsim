<<<<<<< HEAD
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
=======
from __future__ import annotations

import json
import re
from typing import Any, Mapping

BASE_AGENT_INSTRUCTIONS = (
    "Eres un votante español sintético. Responde siempre en español, de forma breve y concreta.\n"
    "Si no puedes inferir una postura, responde NS/NC.\n"
    "Formato recomendado:\n"
    "RAZONAMIENTO: <1-3 frases>\n"
    "RESPUESTA: <respuesta final corta>"
)

_IDEO_LABEL: dict[tuple[int, int], str] = {
    (1, 2): "muy de izquierdas",
    (3, 4): "de centroizquierda",
    (5, 6): "de centro",
    (7, 8): "de centroderecha",
    (9, 10): "de derechas",
}


def _ideo_texto(val: float | None) -> str:
    if val is None:
        return "ideología no definida"
    for (lo, hi), label in _IDEO_LABEL.items():
        if lo <= round(val) <= hi:
            return f"{label} ({val:.1f}/10)"
    return f"ideología {val:.1f}/10"


def _distribucion_voto_texto(dist_json: str | Mapping[str, Any] | None) -> str:
    """
    Convierte distribucion_voto_json en texto legible.
    """
    if not dist_json:
        return ""
    try:
        dist = json.loads(dist_json) if isinstance(dist_json, str) else dist_json
        if not isinstance(dist, Mapping):
            return ""
        top = sorted(dist.items(), key=lambda x: -float(x[1]))[:4]
        partes = [f"{p}: {float(v):.0f}%" for p, v in top if float(v) > 1.0]
        if not partes:
            return ""
        return "Distribución de voto histórica del segmento: " + ", ".join(partes) + "."
    except Exception:
        return ""
>>>>>>> 6fda6ff (agentes 1)


def build_system_prompt(perfil: Mapping[str, Any]) -> str:
    """
<<<<<<< HEAD
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
=======
    Construye system prompt ampliado desde perfiles_votante.
    """
    desc = str(perfil.get("descripcion_perfil_llm") or "").strip()
    label = str(perfil.get("label") or "").strip()
    cid = perfil.get("cluster_id")
    ideo = perfil.get("ideologia_media")
    edad = perfil.get("edad_media")
    n_res = perfil.get("n_respondentes")
    peso = perfil.get("peso_demografico_pct")
    ccaa = str(perfil.get("ccaa") or perfil.get("comunidad_autonoma") or "").strip()
    clase = str(perfil.get("clase_social") or "").strip()
    educ = str(perfil.get("nivel_educativo") or "").strip()
    dist = _distribucion_voto_texto(perfil.get("distribucion_voto_json"))

    if desc:
        bloque_desc = f"Descripción del perfil:\n{desc}"
    else:
        partes_desc: list[str] = []
        if label:
            partes_desc.append(f"Perteneces al segmento '{label}'")
        if edad is not None:
            try:
                partes_desc.append(f"tienes {float(edad):.0f} años de media")
            except Exception:
                pass
        if ccaa:
            partes_desc.append(f"resides en {ccaa}")
        if clase:
            partes_desc.append(f"tu clase social es {clase}")
        if educ:
            partes_desc.append(f"nivel educativo: {educ}")

        if partes_desc:
            bloque_desc = "Perfil sintético: " + ", ".join(partes_desc) + "."
        else:
            bloque_desc = (
                "No hay descripción detallada disponible. "
                "Actúa como ciudadano español con posiciones moderadas y pragmáticas."
            )

    bloque_datos: list[str] = []
    if cid is not None:
        bloque_datos.append(f"Cluster: {cid}")
    if ideo is not None:
        try:
            bloque_datos.append(f"Posición ideológica: {_ideo_texto(float(ideo))}")
        except Exception:
            pass
    if edad is not None:
        try:
            bloque_datos.append(f"Edad media del segmento: {float(edad):.0f} años")
        except Exception:
            pass
    if peso is not None:
        try:
            bloque_datos.append(f"Representatividad demográfica: {float(peso):.1f}% del electorado")
        except Exception:
            pass
    if n_res:
        try:
            bloque_datos.append(f"Basado en {int(n_res)} respondentes reales")
        except Exception:
            pass

    secciones = [BASE_AGENT_INSTRUCTIONS, "---", bloque_desc]
    if bloque_datos:
        secciones.append("\n".join(bloque_datos))
    if dist:
        secciones.append(dist)
    return "\n\n".join(secciones)


def parse_chain_of_thought(raw: str) -> dict[str, str]:
    """
    Parsea salida libre del LLM a campos estables.
    """
    txt = str(raw or "").strip()
    if not txt:
        return {"razonamiento": "", "respuesta": "NS/NC"}

    m_res = re.search(r"(?im)^\s*RESPUESTA\s*:\s*(.+)$", txt)
    m_raz = re.search(r"(?is)RAZONAMIENTO\s*:\s*(.*?)\n\s*RESPUESTA\s*:", txt)
    if m_res:
        respuesta = m_res.group(1).strip()
        razonamiento = m_raz.group(1).strip() if m_raz else ""
        return {
            "razonamiento": razonamiento,
            "respuesta": respuesta or "NS/NC",
        }

    return {
        "razonamiento": "",
        "respuesta": txt.splitlines()[-1].strip() if txt else "NS/NC",
    }
>>>>>>> 6fda6ff (agentes 1)
