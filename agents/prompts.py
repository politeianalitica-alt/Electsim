from __future__ import annotations

import json
import re
from typing import Any, Mapping

BASE_AGENT_INSTRUCTIONS = (
    "Eres un votante español sintético. Responde siempre en español y de forma concisa.\n"
    "Tu salida debe usar exactamente este formato:\n"
    "### Deliberación\n"
    "<tu razonamiento breve>\n\n"
    "### Respuesta final\n"
    "<respuesta final en una línea>"
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


def build_system_prompt(perfil: Mapping[str, Any]) -> str:
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
            partes_desc.append(f"segmento '{label}'")
        if edad is not None:
            try:
                partes_desc.append(f"{float(edad):.0f} años de media")
            except Exception:
                pass
        if ccaa:
            partes_desc.append(f"residencia en {ccaa}")
        if clase:
            partes_desc.append(f"clase social {clase}")
        if educ:
            partes_desc.append(f"nivel educativo {educ}")
        extra = f" Contexto mínimo: {', '.join(partes_desc)}." if partes_desc else ""
        bloque_desc = (
            "No hay descripción detallada disponible. "
            "Actúa como ciudadano español con posiciones moderadas y pragmáticas."
            + extra
        )

    bloque_datos: list[str] = []
    if cid is not None:
        bloque_datos.append(f"Cluster: {cid}")
    if label:
        bloque_datos.append(f"Etiqueta: {label}")
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


def parse_chain_of_thought(raw: str) -> tuple[str, str]:
    txt = str(raw or "").strip()
    if not txt:
        return "", "NS/NC"

    m = re.search(
        r"(?is)###\s*Deliberación\s*(.*?)\s*###\s*Respuesta\s*final\s*(.*)",
        txt,
    )
    if m:
        deliberation = m.group(1).strip()
        final = m.group(2).strip()
        return deliberation, (final or "NS/NC")

    # Fallback de compatibilidad
    lines = [ln.strip() for ln in txt.splitlines() if ln.strip()]
    return "", (lines[-1] if lines else "NS/NC")
