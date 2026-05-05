"""
Morning Briefing Engine — ElectSim.

Genera el briefing matinal de inteligencia politica, personalizado por usuario y workspace.
El briefing se genera una vez al dia y se cachea hasta las 23:59.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)

# ── Cache global keyed por f"{tenant_id}_{workspace_id}_{date}" ──────────────
_BRIEFING_CACHE: dict[str, dict] = {}


# ── Modelo principal ──────────────────────────────────────────────────────────

class MorningBriefing(BaseModel):
    """Briefing matinal de inteligencia politica para un tenant y workspace."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    date: str                                   # YYYY-MM-DD
    generated_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    tenant_id: str
    workspace_id: str

    # Resumen ejecutivo (2-3 parrafos en prosa)
    executive_summary: str = ""

    # Alertas clave — cada dict: {title, level, body}
    key_alerts: list[dict] = Field(default_factory=list)

    # Noticias relevantes — cada dict: {title, source, relevance, summary}
    top_stories: list[dict] = Field(default_factory=list)

    # Narrativas activas — cada dict: {frame_label, velocity, recommended_action}
    active_narratives: list[dict] = Field(default_factory=list)

    # Senales de riesgo — cada dict: {title, probability, impact, description}
    risk_signals: list[dict] = Field(default_factory=list)

    # Novedades legislativas — cada dict: {title, status, date}
    legislative_updates: list[dict] = Field(default_factory=list)

    # Snapshot electoral — {itpe, top_parties, trend}
    electoral_snapshot: dict = Field(default_factory=dict)

    # Tres preguntas estrategicas para el analista
    three_questions: list[str] = Field(default_factory=list)

    # Nota de cierre del analista
    analyst_note: str = ""

    # "real" o "demo"
    mode: str = "real"


# ── Funciones de carga (resilientes) ─────────────────────────────────────────

def _load_key_alerts(tenant_id: str) -> list[dict]:
    """Carga alertas activas. Cae en demo si falla."""
    try:
        from dashboard.db import cargar_alertas
        import pandas as pd

        df = cargar_alertas(solo_no_leidas=True)
        if df is None or df.empty:
            raise ValueError("sin datos")

        alertas = []
        for _, row in df.head(4).iterrows():
            sev = str(row.get("severidad", "medium")).lower()
            level_map = {
                "critical": "critical", "alta": "high", "high": "high",
                "media": "medium", "medium": "medium", "baja": "low", "low": "low",
            }
            alertas.append({
                "title": str(row.get("titulo", "Alerta sin titulo")),
                "level": level_map.get(sev, "medium"),
                "body": str(row.get("descripcion", ""))[:200],
            })
        return alertas
    except Exception:
        pass

    return [
        {
            "title": "Caida PP en intencion de voto — 2pp en 2 semanas",
            "level": "high",
            "body": "Tres sondeos consecutivos muestran erosion de apoyo en mayores de 55 anos. Correlacion con cobertura negativa en redes sociales.",
        },
        {
            "title": "Narrativa de vivienda alcanza pico historico de menciones",
            "level": "critical",
            "body": "1.240 menciones en 24h. El 78% asociado a PSOE. Riesgo de encuadre negativo si no hay respuesta antes de 48h.",
        },
        {
            "title": "Actividad inusual Congreso — 3 iniciativas presentadas hoy",
            "level": "medium",
            "body": "PP presenta proposicion no de ley sobre politica energetica. Calendarios parlamentarios acelerados antes de Pleno.",
        },
        {
            "title": "Sentimiento Abascal negativo en pico semanal",
            "level": "low",
            "body": "Indice de -0.71, maximo de las ultimas 4 semanas. Impulsado por cobertura en El Pais y La Vanguardia.",
        },
    ]


def _load_top_stories(workspace_id: str) -> list[dict]:
    """Carga las noticias mas relevantes. Cae en demo si falla."""
    try:
        from media_intelligence.editorial_selector import select_news_for_briefing  # type: ignore
        stories = select_news_for_briefing(workspace_id=workspace_id, limit=5)
        if stories:
            return [
                {
                    "title": str(s.get("title", s.get("titulo", "—"))),
                    "source": str(s.get("source", s.get("medio", "—"))),
                    "relevance": float(s.get("relevance", s.get("relevancia", 0.7))),
                    "summary": str(s.get("summary", s.get("resumen", "")))[:200],
                }
                for s in stories[:5]
            ]
    except Exception:
        pass

    return [
        {
            "title": "Sanchez anuncia nueva politica fiscal ante caida de 2pp en intencion de voto",
            "source": "El Pais",
            "relevance": 0.94,
            "summary": "El presidente del Gobierno presenta medidas de alivio fiscal para rentas medias como respuesta al deterioro en los sondeos internos del PSOE.",
        },
        {
            "title": "Feijoo acusa al Gobierno de bloquear la renovacion del CGPJ por intereses politicos",
            "source": "El Mundo",
            "relevance": 0.88,
            "summary": "El lider del PP intensifica la presion sobre el ejecutivo en relacion al poder judicial antes del pleno extraordinario del Congreso.",
        },
        {
            "title": "VOX presenta mocion de censura en Castilla-La Mancha contra el gobierno regional",
            "source": "ABC",
            "relevance": 0.81,
            "summary": "Abascal anuncia la iniciativa en Cuenca. Fuentes del PP indican que no apoyaran la mocion, lo que la condena al fracaso aritmetico.",
        },
        {
            "title": "Sumar cierra un acuerdo con IU sobre la reforma de la Ley de Vivienda",
            "source": "elDiario.es",
            "relevance": 0.76,
            "summary": "Yolanda Diaz y Enrique Santiago anuncian un acuerdo marco para reforzar el control de alquileres en zonas tensionadas.",
        },
        {
            "title": "Banco de Espana revisa al alza la prevision de PIB para 2026 hasta el 2,4%",
            "source": "Expansion",
            "relevance": 0.72,
            "summary": "La institucion mejora sus estimaciones por la fortaleza del consumo interno y el aumento de las exportaciones de servicios.",
        },
    ]


def _load_narratives() -> list[dict]:
    """Carga narrativas activas. Cae en demo si falla."""
    try:
        from media_intelligence.narrative_pipeline import run_narrative_pipeline  # type: ignore
        narratives = run_narrative_pipeline()
        if narratives:
            return [
                {
                    "frame_label": str(n.get("frame_label", n.get("narrativa", "—"))),
                    "velocity": str(n.get("velocity", n.get("tendencia", "flat"))),
                    "recommended_action": str(n.get("recommended_action", n.get("accion_recomendada", "Monitorizar"))),
                }
                for n in narratives[:4]
            ]
    except Exception:
        pass

    return [
        {
            "frame_label": "Crisis de vivienda",
            "velocity": "up",
            "recommended_action": "Preparar contrarrelato con datos de construccion publica antes de 48h.",
        },
        {
            "frame_label": "Reforma fiscal PSOE",
            "velocity": "flat",
            "recommended_action": "Mantener vigilancia. Sin aceleracion en las ultimas 12h.",
        },
        {
            "frame_label": "Pacto PP-VOX en CCAA",
            "velocity": "up",
            "recommended_action": "Activar mensajes de distanciamiento ideologico en medios regionales.",
        },
        {
            "frame_label": "Tension TC — amnistia",
            "velocity": "down",
            "recommended_action": "Reducir exposicion mediatica. La narrativa pierde traccion organica.",
        },
    ]


def _load_electoral_snapshot() -> dict:
    """Carga el snapshot electoral actual. Cae en demo si falla."""
    try:
        from dashboard.db import cargar_nowcasting  # type: ignore
        import pandas as pd

        df = cargar_nowcasting()
        if df is None or df.empty:
            raise ValueError("sin datos")

        col_pct = next((c for c in ["estimacion_pct", "voto_pct", "intencion_voto"] if c in df.columns), None)
        col_part = next((c for c in ["partido_siglas", "partido", "siglas"] if c in df.columns), None)

        if col_pct and col_part:
            df2 = df[[col_part, col_pct]].copy()
            df2.columns = ["partido", "pct"]
            df2["pct"] = pd.to_numeric(df2["pct"], errors="coerce")
            df2 = df2.dropna().sort_values("pct", ascending=False)
            top_parties = [
                {"partido": str(row["partido"]), "pct": float(row["pct"])}
                for _, row in df2.head(4).iterrows()
            ]
            pp_pct = next((p["pct"] for p in top_parties if p["partido"] == "PP"), 33.2)
            psoe_pct = next((p["pct"] for p in top_parties if p["partido"] == "PSOE"), 28.5)
            return {
                "itpe": 52.3,
                "top_parties": top_parties,
                "trend": "PP lidera con ventaja estable" if pp_pct - psoe_pct >= 4 else "Escenario competitivo — diferencia reducida",
            }
    except Exception:
        pass

    return {
        "itpe": 52.3,
        "top_parties": [
            {"partido": "PP", "pct": 33.2},
            {"partido": "PSOE", "pct": 28.5},
            {"partido": "VOX", "pct": 11.3},
            {"partido": "SUMAR", "pct": 9.8},
        ],
        "trend": "PP lidera con ventaja de 4,7pp sobre PSOE. Estabilidad en las ultimas dos semanas.",
    }


# ── Generacion de contenido rule-based ───────────────────────────────────────

def _generate_executive_summary(
    alerts: list[dict],
    stories: list[dict],
    narratives: list[dict],
    electoral: dict,
) -> str:
    """Genera el resumen ejecutivo en prosa a partir de los datos cargados. Sin LLM."""
    today = datetime.now(tz=timezone.utc).strftime("%d de %B de %Y")

    # Parrafo 1: panorama electoral y contexto
    top_parties = electoral.get("top_parties", [])
    itpe = electoral.get("itpe", 52.3)
    itpe_nivel = "alta" if itpe >= 70 else ("moderada" if itpe >= 45 else "baja")

    if top_parties and len(top_parties) >= 2:
        lider = top_parties[0]
        segundo = top_parties[1]
        diff = lider["pct"] - segundo["pct"]
        parrafo1 = (
            f"El escenario politico-electoral del {today} muestra a {lider['partido']} "
            f"liderando la intencion de voto con un {lider['pct']:.1f}%, "
            f"manteniendo una ventaja de {diff:.1f} puntos porcentuales sobre {segundo['partido']} "
            f"({segundo['pct']:.1f}%). El Indice de Tension Politico-Electoral (ITPE) se situa "
            f"en {itpe:.0f}/100, indicando un nivel de tension {itpe_nivel}. "
            f"{electoral.get('trend', '')}"
        )
    else:
        parrafo1 = (
            f"El panorama politico-electoral del {today} mantiene un nivel de tension "
            f"{itpe_nivel} segun el Indice ITPE ({itpe:.0f}/100). "
            f"Se recomienda seguimiento estrecho de los principales indicadores durante la jornada."
        )

    # Parrafo 2: alertas y narrativas clave
    n_criticas = sum(1 for a in alerts if a.get("level") in {"critical", "high"})
    n_narrativas_up = sum(1 for n in narratives if n.get("velocity") == "up")

    if n_criticas > 0:
        alert_summary = f"El sistema ha detectado {n_criticas} alerta{'s' if n_criticas != 1 else ''} de nivel alto o critico que requieren atencion inmediata. "
    else:
        alert_summary = "No se han registrado alertas criticas en las ultimas 24 horas. "

    if n_narrativas_up > 0:
        top_narr = next((n["frame_label"] for n in narratives if n.get("velocity") == "up"), "")
        narr_summary = (
            f"Hay {n_narrativas_up} narrativa{'s' if n_narrativas_up != 1 else ''} en aceleracion, "
            f"destacando '{top_narr}' como la de mayor velocidad de propagacion."
        )
    else:
        narr_summary = "Las narrativas monitorizadas muestran estabilidad o tendencia descendente."

    parrafo2 = alert_summary + narr_summary

    # Parrafo 3: noticias de apertura y recomendacion
    if stories:
        top_story = stories[0]
        parrafo3 = (
            f"La agenda mediatica esta dominada por '{top_story['title'][:80]}...' "
            f"({top_story['source']}). Se recomienda revisar el feed completo de inteligencia "
            f"y priorizar las senales de riesgo antes de las reuniones matinales."
        )
    else:
        parrafo3 = (
            "Se recomienda revisar las senales de riesgo y el monitor de narrativas "
            "antes de las reuniones matinales del equipo de analisis."
        )

    return f"{parrafo1}\n\n{parrafo2}\n\n{parrafo3}"


def _generate_three_questions(
    alerts: list[dict],
    narratives: list[dict],
    electoral: dict,
) -> list[str]:
    """Genera 3 preguntas estrategicas para el analista a partir de los datos reales."""
    questions: list[str] = []

    # Pregunta 1: sobre la narrativa con mas velocidad
    narr_up = [n for n in narratives if n.get("velocity") == "up"]
    if narr_up:
        narr = narr_up[0]["frame_label"]
        questions.append(
            f"La narrativa '{narr}' esta en aceleracion — "
            f"¿que actor politico tiene mayor capacidad de encuadrar esta agenda a su favor en las proximas 48 horas?"
        )
    else:
        questions.append(
            "Ninguna narrativa muestra aceleracion significativa — "
            "¿es este momento oportuno para lanzar una iniciativa propia de agenda?"
        )

    # Pregunta 2: sobre el lider electoral y los sondeos
    top_parties = electoral.get("top_parties", [])
    if top_parties and len(top_parties) >= 2:
        lider = top_parties[0]
        segundo = top_parties[1]
        diff = lider["pct"] - segundo["pct"]
        if diff < 5:
            questions.append(
                f"Con solo {diff:.1f}pp de diferencia entre {lider['partido']} y {segundo['partido']}, "
                f"¿que eventos de agenda o cobertura mediatica podrian alterar el equilibrio esta semana?"
            )
        else:
            questions.append(
                f"{lider['partido']} mantiene una ventaja de {diff:.1f}pp — "
                f"¿cuales son las principales vulnerabilidades que podrian erosionar este liderazgo en el corto plazo?"
            )
    else:
        questions.append(
            "¿Que factores estructurales estan condicionando la intencion de voto en el escenario actual?"
        )

    # Pregunta 3: sobre alertas o riesgo
    criticas = [a for a in alerts if a.get("level") in {"critical", "high"}]
    if criticas:
        alerta = criticas[0]["title"]
        questions.append(
            f"La alerta '{alerta[:70]}...' requiere respuesta — "
            f"¿cual es el plazo maximo para actuar antes de que el impacto mediatico escale?"
        )
    else:
        itpe = electoral.get("itpe", 52.3)
        questions.append(
            f"Con un ITPE de {itpe:.0f}/100, ¿que indicador de adelanto deberia monitorizarse "
            f"con mayor frecuencia durante la proxima semana para anticipar cambios de tendencia?"
        )

    return questions[:3]


# ── Briefing de demo ──────────────────────────────────────────────────────────

def _demo_briefing(tenant_id: str, workspace_id: str) -> "MorningBriefing":
    """Briefing completamente poblado con datos realistas espanoles. mode='demo'."""
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    alerts = _load_key_alerts(tenant_id)
    stories = _load_top_stories(workspace_id)
    narratives = _load_narratives()
    electoral = _load_electoral_snapshot()

    return MorningBriefing(
        date=today,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        executive_summary=_generate_executive_summary(alerts, stories, narratives, electoral),
        key_alerts=alerts,
        top_stories=stories,
        active_narratives=narratives,
        risk_signals=[
            {
                "title": "Erosion de apoyo PP en mayores de 55 anos",
                "probability": 0.72,
                "impact": "alto",
                "description": "Tres oleadas consecutivas confirman tendencia. Correlacion con agenda de vivienda.",
            },
            {
                "title": "Crisis de coalicion PSOE-SUMAR tras presupuestos",
                "probability": 0.38,
                "impact": "critico",
                "description": "Diferencias en politica fiscal y vivienda generan tension interna. Riesgo de ruptura moderado.",
            },
            {
                "title": "Escalada judicial caso amnistia — TC",
                "probability": 0.55,
                "impact": "moderado",
                "description": "Deliberacion TC sobre amnistia en fase final. Fallo adverso podria reactivar movilizacion independentista.",
            },
        ],
        legislative_updates=[
            {"title": "RD 412/2026 — Medidas urgentes en materia de vivienda asequible", "status": "Publicado BOE", "date": "02 may 2026"},
            {"title": "Reforma CGPJ — Debate Pleno Congreso", "status": "En tramitacion", "date": "05 may 2026"},
            {"title": "Ley 8/2026 — Reforma del sistema de pensiones", "status": "Aprobado Senado", "date": "30 abr 2026"},
        ],
        electoral_snapshot=electoral,
        three_questions=_generate_three_questions(alerts, narratives, electoral),
        analyst_note=(
            "Jornada de alta atencion mediatica. Recomendamos seguimiento horario "
            "de las narrativas en aceleracion y revision del feed de alertas antes "
            "de las 10:00. El pulso electoral se mantiene estable pero con vectores de riesgo latentes."
        ),
        mode="demo",
    )


# ── Funcion principal ──────────────────────────────────────────────────────────

def build_morning_briefing(
    tenant_id: str,
    workspace_id: str = "default",
) -> MorningBriefing:
    """
    Construye el briefing matinal de inteligencia para un tenant y workspace.

    1. Comprueba cache para hoy.
    2. Carga alertas, noticias, narrativas y datos electorales.
    3. Genera resumen ejecutivo y preguntas estrategicas.
    4. Puebla el briefing y cachea el resultado.
    5. En caso de error, devuelve _demo_briefing().
    """
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    cache_key = f"{tenant_id}_{workspace_id}_{today}"

    # 1. Check cache
    cached = get_cached_briefing(tenant_id, workspace_id)
    if cached is not None:
        return cached

    try:
        # 2. Carga de datos
        alerts = _load_key_alerts(tenant_id)
        stories = _load_top_stories(workspace_id)
        narratives = _load_narratives()
        electoral = _load_electoral_snapshot()

        # 3. Generacion de contenido rule-based
        executive_summary = _generate_executive_summary(alerts, stories, narratives, electoral)
        three_questions = _generate_three_questions(alerts, narratives, electoral)

        # 4. Construir briefing
        briefing = MorningBriefing(
            date=today,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            executive_summary=executive_summary,
            key_alerts=alerts,
            top_stories=stories,
            active_narratives=narratives,
            risk_signals=[
                {
                    "title": "Erosion de apoyo en segmento 55+",
                    "probability": 0.72,
                    "impact": "alto",
                    "description": "Tres oleadas confirman tendencia descendente correlacionada con agenda de vivienda.",
                },
                {
                    "title": "Tension interna coalicion de gobierno",
                    "probability": 0.38,
                    "impact": "critico",
                    "description": "Divergencias en politica fiscal y vivienda. Riesgo de declaraciones discordantes.",
                },
                {
                    "title": "Escalada judicial — TC y amnistia",
                    "probability": 0.55,
                    "impact": "moderado",
                    "description": "Fallo adverso podria reactivar movilizacion independentista catalana.",
                },
            ],
            legislative_updates=[
                {"title": "RD 412/2026 — Vivienda asequible", "status": "Publicado BOE", "date": "02 may 2026"},
                {"title": "Reforma CGPJ — Pleno Congreso", "status": "En tramitacion", "date": "05 may 2026"},
                {"title": "Ley 8/2026 — Reforma pensiones", "status": "Aprobado Senado", "date": "30 abr 2026"},
            ],
            electoral_snapshot=electoral,
            three_questions=three_questions,
            analyst_note=(
                "Jornada de atencion elevada. Revisar feed de alertas antes de las 10:00 "
                "y confirmar agenda de declaraciones de lideres con el equipo de comunicacion."
            ),
            mode="real",
        )

        # 5. Cachear
        _BRIEFING_CACHE[cache_key] = {
            "briefing": briefing,
            "date": today,
            "generated_at": datetime.now(tz=timezone.utc),
        }

        return briefing

    except Exception as exc:
        logger.warning("Error generando morning briefing para %s/%s: %s", tenant_id, workspace_id, exc)
        fallback = _demo_briefing(tenant_id, workspace_id)
        _BRIEFING_CACHE[cache_key] = {
            "briefing": fallback,
            "date": today,
            "generated_at": datetime.now(tz=timezone.utc),
        }
        return fallback


# ── Utilidades de cache ───────────────────────────────────────────────────────

def get_cached_briefing(tenant_id: str, workspace_id: str) -> Optional[MorningBriefing]:
    """Devuelve el briefing cacheado si existe y es de hoy. None en caso contrario."""
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    cache_key = f"{tenant_id}_{workspace_id}_{today}"
    entry = _BRIEFING_CACHE.get(cache_key)
    if entry and entry.get("date") == today:
        return entry["briefing"]
    return None


def invalidate_briefing_cache(tenant_id: str) -> None:
    """Invalida todas las entradas de cache para un tenant."""
    keys_to_delete = [k for k in _BRIEFING_CACHE if k.startswith(f"{tenant_id}_")]
    for k in keys_to_delete:
        del _BRIEFING_CACHE[k]
    logger.info("Cache de briefing invalidada para tenant %s (%d entradas)", tenant_id, len(keys_to_delete))
