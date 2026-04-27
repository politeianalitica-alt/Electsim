"""
Simulador de impacto de campaña basado en reglas.

Lógica de negocio pura sin dependencias de Streamlit.
Importar desde aquí en lugar de definir estas funciones en 5_Agentes_LLM.py.

Inspirado en el patrón service-layer de candidator y en la separación
domain/presentation del repositorio votainteligente.
"""
from __future__ import annotations

from dashboard.models.voter_profiles import TEMAS_IMPACTO, REACCION_PERFIL
from dashboard.models.timing_model import timing_weight, saturation_decay
from dashboard.models.transfer_vectors import calcular_flujos, flujos_para_sankey


def receptividad_tema_perfil(
    tema: str,
    perfil: dict,
    impactos_raw: dict,
) -> float:
    """Calcula la receptividad de un perfil electoral a un tema de campaña.

    Returns:
        Score 0-10 de receptividad. Determinista dado el mismo (tema, perfil).
    """
    top3 = [str(t[0]).lower() for t in perfil.get("preocupaciones", [])[:3]]
    score = 2.5
    if any(tok and tok in tema.lower() for tok in top3):
        score += 3.5
    perfiles_focus = set(impactos_raw.get("perfiles", []) if isinstance(impactos_raw, dict) else [])
    if perfil.get("etiqueta") in perfiles_focus:
        score += 3.5
    ideo = float(perfil.get("ideo_media", 5.0))
    tema_l = tema.lower()
    if any(k in tema_l for k in ["impuesto", "unidad", "migratoria", "gasto"]):
        mult = 1.0 if ideo >= 5.5 else 0.6
    elif any(k in tema_l for k in ["alquiler", "sanidad", "salario", "verde"]):
        mult = 1.0 if ideo <= 5.5 else 0.6
    else:
        mult = 0.85
    score *= mult
    # Hash determinista para pseudo-variación (misma entrada → mismo resultado)
    noise = ((abs(hash(f"{tema}|{perfil.get('etiqueta','')}")) % 61) / 100.0) - 0.3
    return round(max(0.0, min(10.0, score + noise)), 1)


def narrativa_impacto(
    tema: str,
    partido_emisor: str,
    ganadores: list[str],
    perjudicados: list[str],
    perfiles_beneficiados: list[str],
    impactos_partido: dict[str, float],
    perfiles_unificados: list[dict],
) -> str:
    """Genera texto narrativo del impacto de un tema en los perfiles de votante."""
    focus_parts: list[str] = []
    for g in ganadores[:2]:
        perf_hits = []
        for pf in perfiles_unificados:
            voto = pf.get("intencion_voto", {})
            top = next(iter(sorted(voto.items(), key=lambda x: x[1], reverse=True)), ("", 0.0))
            if top[0] == g:
                prio = pf.get("preocupaciones", [("sin señal", 0)])
                perf_hits.append(
                    f"{pf.get('etiqueta','Perfil')} ({pf.get('ideo_media',5):.1f}/10; {prio[0][0]} {prio[0][1]}%)"
                )
        if perf_hits:
            focus_parts.append(f"{g}: " + ", ".join(perf_hits[:2]))

    pos_total = sum(v for v in impactos_partido.values() if v > 0)
    neg_total = sum(v for v in impactos_partido.values() if v < 0)
    txt = (
        f"El mensaje sobre '{tema}' para {partido_emisor} proyecta un efecto agregado de {pos_total:+.1f}pp "
        f"en ganadores y {neg_total:.1f}pp en perdedores."
    )
    if focus_parts:
        txt += " Segmentos más explicativos: " + " | ".join(focus_parts) + "."
    if perjudicados:
        txt += f" Las mayores pérdidas se concentran en {', '.join(perjudicados[:3])}."
    if perfiles_beneficiados:
        txt += f" Receptividad prioritaria en: {', '.join(perfiles_beneficiados[:3])}."
    return txt


def simular_impacto_tema(
    tema: str,
    partido_emisor: str,
    perfiles_unificados: list[dict],
    impactos_catalogo: dict | None = None,
    semana_campana: int = 3,
    veces_tema_usado: int = 0,
) -> dict:
    """Calcula el impacto completo de un tema de campaña.

    Args:
        semana_campana: semana del ciclo electoral (1-7); ajusta timing_weight
        veces_tema_usado: cuántas veces se ha simulado ya este tema; ajusta saturation_decay

    Returns:
        {
            'impactos_partido': dict[str, float],   # pp ajustados por timing + saturación
            'impactos_brutos': dict[str, float],    # pp del catálogo sin ajustar
            'ganadores': list[str],
            'perjudicados': list[str],
            'perfiles_beneficiados': list[str],
            'receptividades': list[tuple[str, float]],
            'flujos_transferencia': list[Flujo],    # origen→destino con pp absolutos
            'sankey_data': dict,                    # listo para Plotly Sankey
            'narrativa': str,
            'timing_factor': float,
            'saturation_factor': float,
        }
    """
    catalogo = impactos_catalogo or TEMAS_IMPACTO
    impactos_raw = catalogo.get(tema, {})
    impactos_brutos: dict[str, float] = {}

    for partido, data in impactos_raw.items():
        if partido == "perfiles":
            continue
        if isinstance(data, dict):
            impactos_brutos[partido] = float(data.get("pp_impacto", 0.0))
        elif isinstance(data, (int, float)):
            impactos_brutos[partido] = float(data)

    t_factor = timing_weight(semana_campana)
    s_factor = saturation_decay(veces_tema_usado)
    ajuste = t_factor * s_factor

    impactos_partido = {p: round(v * ajuste, 2) for p, v in impactos_brutos.items()}

    ganadores = sorted([p for p, v in impactos_partido.items() if v > 0], key=lambda p: -impactos_partido[p])
    perjudicados = sorted([p for p, v in impactos_partido.items() if v < 0], key=lambda p: impactos_partido[p])

    receptividades: list[tuple[str, float]] = []
    for pf in perfiles_unificados:
        score = receptividad_tema_perfil(tema, pf, impactos_raw.get(partido_emisor, {}))
        receptividades.append((pf.get("etiqueta", "Perfil"), score))
    receptividades.sort(key=lambda x: -x[1])

    perfiles_beneficiados = [etiqueta for etiqueta, _ in receptividades[:3]]

    narrativa = narrativa_impacto(
        tema=tema,
        partido_emisor=partido_emisor,
        ganadores=ganadores,
        perjudicados=perjudicados,
        perfiles_beneficiados=perfiles_beneficiados,
        impactos_partido=impactos_partido,
        perfiles_unificados=perfiles_unificados,
    )

    flujos = calcular_flujos(tema, impactos_partido)
    sankey = flujos_para_sankey(flujos)

    return {
        "impactos_partido": impactos_partido,
        "impactos_brutos": impactos_brutos,
        "ganadores": ganadores,
        "perjudicados": perjudicados,
        "perfiles_beneficiados": perfiles_beneficiados,
        "receptividades": receptividades,
        "flujos_transferencia": flujos,
        "sankey_data": sankey,
        "narrativa": narrativa,
        "timing_factor": t_factor,
        "saturation_factor": s_factor,
    }
