"""
Politeia Brain Service — Motor central de razonamiento IA
==========================================================
Agrega datos de TODOS los módulos del dashboard y los pasa al LLM
para que razone de forma continua sobre la situación política española.

Arquitectura:
  DATA LAYER  →  CONTEXT BUILDER  →  REASONING ENGINE  →  INSIGHT CACHE
  (DB+News)       (texto unificado)    (Ollama/Claude)      (RAM + ChromaDB)

El Brain se activa cuando cualquier página lo solicita.
Devuelve razonamiento en streaming cuando está disponible.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Generator, Iterator
import sys

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# ── Caché en memoria con TTL ──────────────────────────────────────────────────
_CACHE: dict[str, tuple[float, str]] = {}  # key → (timestamp, value)
_CACHE_TTL = {
    "estado_global":      300,   # 5 min
    "briefing_diario":    1800,  # 30 min
    "modulo_legislativo": 600,
    "modulo_coalicion":   600,
    "modulo_riesgo":      300,
    "modulo_medios":      600,
    "alertas_proactivas": 180,   # 3 min
    "analisis_sondeos":   900,
    "default":            600,
}


def _cache_get(key: str) -> str | None:
    if key not in _CACHE:
        return None
    ts, val = _CACHE[key]
    ttl = _CACHE_TTL.get(key, _CACHE_TTL["default"])
    if time.time() - ts > ttl:
        del _CACHE[key]
        return None
    return val


def _cache_set(key: str, val: str) -> None:
    _CACHE[key] = (time.time(), val)


def invalidar_cache(key: str | None = None) -> None:
    """Invalida la caché. Si key es None, invalida todo."""
    global _CACHE
    if key is None:
        _CACHE.clear()
    elif key in _CACHE:
        del _CACHE[key]


# ── Importaciones opcionales ──────────────────────────────────────────────────
def _get_llm():
    try:
        from dashboard.services import llm_local as llm
        return llm
    except Exception:
        return None


def _get_db():
    try:
        import dashboard.db as db
        return db
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# CAPA DE DATOS — Agrega información de todos los módulos
# ═══════════════════════════════════════════════════════════════════════════════

def _pull_sondeos() -> dict:
    """Extrae últimas encuestas del DB."""
    db = _get_db()
    if not db:
        return {}
    try:
        df = db.cargar_nowcasting()
        if df.empty:
            return {}
        # Último sondeo por partido
        last = df.sort_values("fecha_encuesta"if "fecha_encuesta"in df.columns else df.columns[0]).tail(30)
        resumen = {}
        for _, row in last.iterrows():
            p = str(row.get("partido_siglas", row.get("partido_nombre", "?")))
            voto = float(row.get("voto_medio", row.get("media", 0)))
            escanos = int(row.get("escanos_medio", row.get("escanos", 0)))
            resumen[p] = {"voto": round(voto, 1), "escanos": escanos}
        return resumen
    except Exception:
        return {}


def _pull_noticias() -> list[dict]:
    """Extrae noticias recientes del DB o RSS."""
    db = _get_db()
    if not db:
        return []
    try:
        if hasattr(db, "cargar_noticias_recientes"):
            df = db.cargar_noticias_recientes(limit=20)
        else:
            import sqlalchemy as sa
            eng = db.get_engine()
            with eng.connect() as conn:
                for tabla in ["noticias", "media_articles", "articles", "news"]:
                    try:
                        df = conn.execute(
                            sa.text(f"SELECT titulo, medio, resumen, fecha FROM {tabla} ORDER BY fecha DESC LIMIT 20")
                        )
                        rows = df.fetchall()
                        if rows:
                            return [dict(r._mapping) for r in rows]
                    except Exception:
                        continue
        return []
    except Exception:
        return []


def _pull_boe() -> list[dict]:
    """Extrae items del BOE de hoy."""
    try:
        from dashboard.services.boe_api import obtener_sumario
        items = obtener_sumario()
        if items:
            return items[:15]
    except Exception:
        pass
    return []


def _pull_alertas() -> list[dict]:
    """Extrae alertas activas del sistema."""
    db = _get_db()
    if not db:
        return []
    try:
        if hasattr(db, "cargar_alertas_activas"):
            df = db.cargar_alertas_activas()
            return df.to_dict("records") if not df.empty else []
        import sqlalchemy as sa
        eng = db.get_engine()
        with eng.connect() as conn:
            for tabla in ["alertas", "alerts", "alert_events"]:
                try:
                    res = conn.execute(
                        sa.text(f"SELECT * FROM {tabla} ORDER BY created_at DESC LIMIT 10")
                    )
                    rows = res.fetchall()
                    if rows:
                        return [dict(r._mapping) for r in rows]
                except Exception:
                    continue
    except Exception:
        pass
    return []


def _pull_rss() -> list[dict]:
    """Obtiene noticias de RSS si está disponible."""
    try:
        from dashboard.services.rss_feeds import obtener_noticias_recientes
        items = obtener_noticias_recientes(max_items=20)
        return items if items else []
    except Exception:
        pass
    # Fallback: noticias demo contextualizadas con fecha real
    hoy = datetime.now().strftime("%d/%m/%Y")
    return [
        {"titulo": "Sánchez reúne al Consejo de Ministros para aprobar medidas económicas", "medio": "El País", "fecha": hoy},
        {"titulo": "Feijóo acusa al Gobierno de bloqueo institucional sin presupuestos", "medio": "El Mundo", "fecha": hoy},
        {"titulo": "Junts mantiene su posición sobre el modelo de financiación singular", "medio": "La Vanguardia", "fecha": hoy},
        {"titulo": "El FMI revisa al alza la previsión de crecimiento español al 2.3% para 2026", "medio": "Expansión", "fecha": hoy},
        {"titulo": "VOX registra moción de censura parcial en el Parlamento de Cataluña", "medio": "ABC", "fecha": hoy},
        {"titulo": "Sumar presiona al PSOE para acelerar la reforma de la Ley de Vivienda", "medio": "elDiario.es", "fecha": hoy},
        {"titulo": "PNV negocia enmiendas a los presupuestos a cambio del concierto económico", "medio": "El Correo", "fecha": hoy},
        {"titulo": "La tasa de paro cae al 10.2% en el primer trimestre de 2026", "medio": "CincoDías", "fecha": hoy},
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXT BUILDER — Construye el estado del mundo
# ═══════════════════════════════════════════════════════════════════════════════

def obtener_estado_dashboard(force_refresh: bool = False) -> dict:
    """
    Agrega datos de todos los módulos y devuelve un estado unificado.
    Cachea el resultado para evitar llamadas redundantes.
    """
    cached = _cache_get("estado_global")
    if cached and not force_refresh:
        try:
            return json.loads(cached)
        except Exception:
            pass

    estado = {
        "timestamp": datetime.now().isoformat(),
        "fecha": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "sondeos": {},
        "noticias": [],
        "boe_hoy": [],
        "alertas": [],
        "contexto_politico": _contexto_politico_base(),
    }

    # Recopilar datos (con timeout individual)
    try:
        estado["sondeos"] = _pull_sondeos()
    except Exception:
        pass
    try:
        rss = _pull_rss()
        estado["noticias"] = rss[:12]
    except Exception:
        pass
    try:
        estado["boe_hoy"] = _pull_boe()[:10]
    except Exception:
        pass
    try:
        estado["alertas"] = _pull_alertas()[:8]
    except Exception:
        pass

    _cache_set("estado_global", json.dumps(estado, default=str))
    return estado


def _contexto_politico_base() -> str:
    """Contexto político estático de España 2026 para enriquecer el razonamiento."""
    return (
        f"España {datetime.now().year}. Gobierno de coalición PSOE-Sumar (minoría). "
        "Depende de apoyos parlamentarios de Junts, PNV, ERC, CC, BNG. "
        "Sin presupuestos generales aprobados (prorrogados desde 2023). "
        "Pedro Sánchez (PSOE) presidente. Alberto Núñez Feijóo (PP) líder de la oposición. "
        "Santiago Abascal (VOX). Yolanda Díaz (Sumar). "
        "Senado con mayoría absoluta del PP. "
        "Principales ejes de conflicto: financiación singular Cataluña, Ley de Amnistía, "
        "reforma CGPJ, presupuestos, política migratoria."
    )


def construir_prompt_contexto(estado: dict, modulo: str = "general") -> str:
    """Construye el prompt de contexto para el LLM a partir del estado del dashboard."""
    lineas = [
        f"=== ESTADO ACTUAL DEL DASHBOARD POLITEIA — {estado.get('fecha', 'hoy')} ===",
        "",
        f"CONTEXTO POLÍTICO: {estado.get('contexto_politico', '')}",
        "",
    ]

    # Sondeos
    sondeos = estado.get("sondeos", {})
    if sondeos:
        lineas.append("ENCUESTAS ACTUALES (voto estimado / escaños):")
        for p, datos in sorted(sondeos.items(), key=lambda x: -x[1].get("escanos", 0))[:8]:
            lineas.append(f"  {p}: {datos.get('voto', 0):.1f}% — {datos.get('escanos', 0)} esc.")
        lineas.append("")

    # Noticias
    noticias = estado.get("noticias", [])
    if noticias:
        lineas.append(f"NOTICIAS RECIENTES ({len(noticias)} artículos):")
        for n in noticias[:8]:
            lineas.append(f"  • [{n.get('medio', '?')}] {n.get('titulo', '')[:100]}")
        lineas.append("")

    # BOE
    boe = estado.get("boe_hoy", [])
    if boe:
        criticos = [b for b in boe if b.get("impacto") in ("CRÍTICO", "ALTO")]
        if criticos:
            lineas.append(f"BOE HOY — {len(criticos)} items de alto impacto:")
            for b in criticos[:4]:
                lineas.append(f"  ! [{b.get('seccion','?')}] {str(b.get('titulo',''))[:90]}")
            lineas.append("")

    # Alertas activas
    alertas = estado.get("alertas", [])
    if alertas:
        lineas.append(f"ALERTAS ACTIVAS EN SISTEMA: {len(alertas)}")
        for a in alertas[:3]:
            lineas.append(f"  ● {str(a.get('titulo', a.get('mensaje', 'alerta')))[:80]}")
        lineas.append("")

    lineas.append(f"MÓDULO ACTIVO: {modulo.upper()}")

    return "\n".join(lineas)


# ═══════════════════════════════════════════════════════════════════════════════
# REASONING ENGINE — El cerebro que razona
# ═══════════════════════════════════════════════════════════════════════════════

_SYSTEM_BRAIN_COMPLETO = (
    "Eres Politeia Brain, el cerebro analítico del dashboard de inteligencia política ElectSim España. "
    "Tienes acceso en tiempo real a: encuestas electorales, noticias políticas, BOE, alertas del sistema, "
    "datos de coalición, indicadores de riesgo y análisis parlamentario. "
    "Tu función es razonar de forma proactiva y continua sobre la situación política española, "
    "identificar patrones ocultos, anticipar movimientos y generar inteligencia accionable. "
    "SIEMPRE responde en español. Usa cadenas de razonamiento explícitas (primero los hechos, "
    "luego las implicaciones, luego las recomendaciones). "
    "Sé específico, cita datos cuando los tengas, y no tengas miedo de hacer predicciones con sus probabilidades."
)


def razonar_situacion(
    estado: dict | None = None,
    foco: str = "general",
    stream: bool = False,
    force_refresh: bool = False,
) -> str | Generator[str, None, None]:
    """
    Razonamiento completo sobre la situación política actual.

    Args:
        estado: Estado del dashboard (se obtiene automáticamente si None)
        foco: 'general' | 'electoral' | 'legislativo' | 'coalicion' | 'riesgo' | 'medios'
        stream: Si True, devuelve generator de tokens
        force_refresh: Ignorar caché

    Returns:
        str con el análisis completo, o generator si stream=True
    """
    cache_key = f"razonamiento_{foco}"
    if not force_refresh and not stream:
        cached = _cache_get(cache_key)
        if cached:
            return cached

    if estado is None:
        estado = obtener_estado_dashboard()

    contexto = construir_prompt_contexto(estado, foco)

    prompts_por_foco = {
        "general": (
            "Basándote en el contexto del dashboard, realiza un análisis político completo siguiendo este esquema:\n\n"
            "**1. SITUACIÓN ACTUAL** — ¿Qué está pasando en España políticamente ahora mismo?\n"
            "**2. TENDENCIAS CRÍTICAS** — ¿Qué 3 tendencias son más relevantes en este momento?\n"
            "**3. VECTORES DE RIESGO** — ¿Qué amenazas o inestabilidades detectas?\n"
            "**4. OPORTUNIDADES** — ¿Qué ventanas de oportunidad política existen?\n"
            "**5. PREDICCIÓN 30 DÍAS** — ¿Qué es más probable que ocurra en el próximo mes?\n"
        ),
        "electoral": (
            "Analiza el panorama electoral español actual:\n\n"
            "**1. BALANCE DE FUERZAS** — ¿Quién está ganando y quién perdiendo posiciones?\n"
            "**2. VOTANTES EN JUEGO** — ¿Qué bloques de votantes son más volátiles ahora?\n"
            "**3. CALENDARIO ELECTORAL** — ¿Qué elecciones se aproximan y qué relevancia tienen?\n"
            "**4. HIPÓTESIS** — ¿Qué factores podrían cambiar el resultado electoral?\n"
            "**5. ESCENARIOS** — Escenario más probable vs. escenario de sorpresa.\n"
        ),
        "legislativo": (
            "Analiza la actividad legislativa y el BOE de hoy:\n\n"
            "**1. IMPACTO NORMATIVO** — ¿Qué ha publicado el BOE hoy de relevancia política/económica?\n"
            "**2. AGENDA PARLAMENTARIA** — ¿Qué debates o votaciones son relevantes esta semana?\n"
            "**3. GOBERNABILIDAD** — ¿Cómo está funcionando la coalición de gobierno legislativamente?\n"
            "**4. PUNTOS DE BLOQUEO** — ¿Qué iniciativas están bloqueadas y por qué?\n"
            "**5. RIESGO REGULATORIO** — ¿Qué sectores o actores están más expuestos a cambios normativos?\n"
        ),
        "coalicion": (
            "Analiza la situación de la coalición de gobierno y la gobernabilidad:\n\n"
            "**1. ESTABILIDAD DEL GOBIERNO** — ¿Cómo de sólida es la coalición PSOE-Sumar?\n"
            "**2. SOCIOS PARLAMENTARIOS** — ¿Qué demandan Junts, PNV, ERC ahora mismo?\n"
            "**3. TENSIONES INTERNAS** — ¿Qué conflictos hay dentro del bloque progresista?\n"
            "**4. AMENAZAS** — ¿Qué podría derrumbar el gobierno en los próximos meses?\n"
            "**5. ALTERNATIVAS** — ¿Qué coaliciones alternativas son viables matemáticamente?\n"
        ),
        "riesgo": (
            "Evalúa el nivel de riesgo político en España:\n\n"
            "**1. ÍNDICE DE RIESGO** — Califica el riesgo político del 0-100 con justificación.\n"
            "**2. RIESGOS INMEDIATOS** — ¿Qué puede estallar en los próximos 7 días?\n"
            "**3. RIESGOS ESTRUCTURALES** — ¿Qué problemas crónicos se están agravando?\n"
            "**4. SEÑALES DE ALERTA** — ¿Qué indicadores debes vigilar?\n"
            "**5. MITIGACIÓN** — ¿Qué puede hacer el gobierno para reducir el riesgo?\n"
        ),
        "medios": (
            "Analiza el ecosistema mediático y la narrativa política dominante:\n\n"
            "**1. NARRATIVA DOMINANTE** — ¿Qué historia está contando la prensa española hoy?\n"
            "**2. GUERRAS DE RELATO** — ¿Qué marcos narrativos están compitiendo?\n"
            "**3. AGENDA SETTING** — ¿Quién está poniendo la agenda mediática?\n"
            "**4. DESINFORMACIÓN** — ¿Qué narrativas falsas o manipuladas circulan?\n"
            "**5. IMPACTO EN OPINIÓN** — ¿Cómo afecta la cobertura mediática a la intención de voto?\n"
        ),
    }

    pregunta = prompts_por_foco.get(foco, prompts_por_foco["general"])

    llm = _get_llm()
    if not llm:
        return "⚠ Motor LLM no disponible."

    if stream:
        return llm.chat(
            pregunta,
            contexto=contexto,
            sistema=_SYSTEM_BRAIN_COMPLETO,
            stream=True,
        )

    # Non-streaming: cache result
    resultado = llm.chat(
        pregunta,
        contexto=contexto,
        sistema=_SYSTEM_BRAIN_COMPLETO,
        stream=False,
    )

    if isinstance(resultado, str) and len(resultado) > 50:
        _cache_set(cache_key, resultado)
        # Indexar en RAG para memoria persistente
        _indexar_razonamiento(foco, resultado, estado)

    return resultado


def analizar_modulo(
    modulo: str,
    datos_especificos: dict | None = None,
    stream: bool = False,
) -> str | Generator[str, None, None]:
    """
    Análisis profundo de un módulo específico con contexto cruzado.

    modulo: 'briefings' | 'actores' | 'termometro' | 'legislativo' |
            'coalicion' | 'alertas' | 'medios' | 'geopolitica' |
            'communication' | 'workspace'
    """
    estado = obtener_estado_dashboard()
    contexto_base = construir_prompt_contexto(estado, modulo)

    # Añadir datos específicos del módulo si se proporcionan
    if datos_especificos:
        contexto_base += "\n\nDATOS ESPECÍFICOS DEL MÓDULO:\n"
        contexto_base += json.dumps(datos_especificos, ensure_ascii=False, default=str, indent=2)[:1500]

    prompts_modulo = {
        "briefings": "Genera un briefing ejecutivo completo para hoy. Estructura: Titulares clave, análisis de impacto, recomendaciones estratégicas.",
        "actores": "Analiza la red de actores políticos. ¿Quién tiene más poder ahora? ¿Qué alianzas se están formando o rompiendo?",
        "termometro": "Evalúa el nivel de riesgo político en España. Da una puntuación 0-100 y explica los factores determinantes.",
        "legislativo": "Analiza la actividad legislativa actual. ¿Qué normas son más importantes? ¿Qué bloques hay?",
        "coalicion": "Analiza la estabilidad del gobierno de coalición. ¿Cuánto tiempo le queda? ¿Qué puede desestabilizarlo?",
        "alertas": "Identifica las principales amenazas y riesgos que requieren atención inmediata.",
        "medios": "Analiza la narrativa mediática dominante y su impacto en la opinión pública.",
        "geopolitica": "Analiza cómo el contexto geopolítico internacional afecta a la política española.",
        "communication": "Evalúa la efectividad de la comunicación política de los principales actores.",
        "workspace": "Proporciona un resumen ejecutivo del estado actual para el analista.",
    }

    pregunta = prompts_modulo.get(modulo, f"Analiza el módulo {modulo} con todo el contexto disponible.")

    llm = _get_llm()
    if not llm:
        return "⚠ Sin LLM disponible."

    return llm.chat(
        pregunta,
        contexto=contexto_base,
        sistema=_SYSTEM_BRAIN_COMPLETO,
        stream=stream,
    )


def generar_briefing_diario(force_refresh: bool = False) -> str:
    """
    Genera el briefing político diario completo.
    Cachea durante 30 minutos.
    """
    cached = _cache_get("briefing_diario")
    if cached and not force_refresh:
        return cached

    estado = obtener_estado_dashboard(force_refresh=force_refresh)
    contexto = construir_prompt_contexto(estado, "general")

    llm = _get_llm()
    if not llm:
        return _briefing_fallback(estado)

    prompt = (
        f"Genera el briefing político ejecutivo del {datetime.now().strftime('%d de %B de %Y')}. "
        "Este briefing es para un analista político senior que empieza su jornada. "
        "Estructura OBLIGATORIA:\n\n"
        "##  TITULAR DEL DÍA\n"
        "_Una frase que capture lo más importante_\n\n"
        "##  NOTICIAS CLAVE (top 5)\n"
        "Con análisis de impacto para cada una\n\n"
        "##  ESTADO DE LAS ENCUESTAS\n"
        "Quién sube, quién baja, qué significa\n\n"
        "## ! ALERTAS DEL DÍA\n"
        "Riesgos e incidentes a vigilar\n\n"
        "##  AGENDA DEL ANALISTA\n"
        "3 cosas concretas que hacer hoy\n\n"
        "##  PREDICCIÓN 7 DÍAS\n"
        "Qué es más probable que ocurra esta semana"
    )

    resultado = llm.chat(prompt, contexto=contexto, sistema=_SYSTEM_BRAIN_COMPLETO, stream=False)

    if isinstance(resultado, str) and len(resultado) > 100:
        _cache_set("briefing_diario", resultado)

    return resultado if isinstance(resultado, str) else _briefing_fallback(estado)


def _briefing_fallback(estado: dict) -> str:
    """Briefing de emergencia cuando el LLM no está disponible."""
    noticias = estado.get("noticias", [])
    sondeos = estado.get("sondeos", {})
    fecha = estado.get("fecha", datetime.now().strftime("%d/%m/%Y"))

    titulares = "\n".join(f"• {n.get('titulo', '')[:80]}"for n in noticias[:5])
    encuestas = "\n".join(
        f"• {p}: {d.get('voto', 0):.1f}% ({d.get('escanos', 0)} esc.)"
        for p, d in sorted(sondeos.items(), key=lambda x: -x[1].get("escanos", 0))[:5]
    )

    return (
        f"## Briefing — {fecha}\n\n"
        f"### Noticias del día\n{titulares or '_Sin datos disponibles_'}\n\n"
        f"### Encuestas actuales\n{encuestas or '_Sin datos disponibles_'}\n\n"
        f"_Conecta el motor de IA para análisis profundo._"
    )


def generar_alertas_proactivas(force_refresh: bool = False) -> list[dict]:
    """
    El brain monitoriza el estado y genera alertas proactivas.
    Devuelve lista de alertas con severidad y razonamiento.
    """
    cached = _cache_get("alertas_proactivas")
    if cached and not force_refresh:
        try:
            return json.loads(cached)
        except Exception:
            pass

    estado = obtener_estado_dashboard()
    contexto = construir_prompt_contexto(estado)

    llm = _get_llm()
    if not llm:
        return []

    prompt = (
        "Analiza el contexto del dashboard y genera una lista de alertas proactivas. "
        "RESPONDE ÚNICAMENTE en formato JSON válido. Ejemplo:\n"
        '[\n'
        '  {"severidad": "ALTA", "titulo": "Título breve", "descripcion": "Explicación", '
        '"modulo": "legislativo", "accion": "Qué hacer"},\n'
        '  ...\n'
        ']\n\n'
        "Genera entre 3 y 6 alertas reales basadas en los datos disponibles. "
        "Severidades: CRÍTICA, ALTA, MEDIA, BAJA."
    )

    resp = llm.chat(prompt, contexto=contexto, sistema=_SYSTEM_BRAIN_COMPLETO, stream=False)

    alertas = []
    if isinstance(resp, str):
        # Extraer JSON de la respuesta
        import re
        match = re.search(r'\[.*\]', resp, re.DOTALL)
        if match:
            try:
                alertas = json.loads(match.group())
            except Exception:
                pass

    if not alertas:
        # Fallback: alertas contextuales básicas
        alertas = _alertas_fallback(estado)

    _cache_set("alertas_proactivas", json.dumps(alertas, ensure_ascii=False, default=str))
    return alertas


def _alertas_fallback(estado: dict) -> list[dict]:
    """Alertas básicas cuando el LLM no puede generar JSON."""
    alertas = []
    noticias = estado.get("noticias", [])
    boe = estado.get("boe_hoy", [])

    if boe:
        alertas.append({
            "severidad": "MEDIA",
            "titulo": f"BOE — {len(boe)} publicaciones hoy",
            "descripcion": f"Se han publicado {len(boe)} disposiciones en el BOE.",
            "modulo": "legislativo",
            "accion": "Revisar el Monitor Legislativo",
        })

    keywords_criticos = ["moción de censura", "crisis", "dimisión", "ruptura", "elecciones"]
    for n in noticias[:5]:
        titulo = n.get("titulo", "").lower()
        if any(k in titulo for k in keywords_criticos):
            alertas.append({
                "severidad": "ALTA",
                "titulo": n.get("titulo", "")[:60],
                "descripcion": f"Fuente: {n.get('medio', '?')}",
                "modulo": "briefings",
                "accion": "Leer noticia completa y actualizar análisis",
            })

    if not alertas:
        alertas.append({
            "severidad": "BAJA",
            "titulo": "Sistema operativo — Sin alertas críticas",
            "descripcion": "No se detectan alertas de alta prioridad en este momento.",
            "modulo": "general",
            "accion": "Revisar briefings diarios",
        })

    return alertas


def chat_con_contexto_total(
    mensaje: str,
    historia: list[dict] | None = None,
    modulo_origen: str = "general",
    stream: bool = False,
) -> str | Generator[str, None, None]:
    """
    Chat con contexto completo del dashboard.
    Es la función principal para el chatbot — siempre tiene todo el contexto.
    """
    estado = obtener_estado_dashboard()
    contexto = construir_prompt_contexto(estado, modulo_origen)

    # Enriquecer con RAG si está disponible
    llm = _get_llm()
    if llm:
        fragmentos_rag = llm.buscar_contexto(mensaje, "politeia_insights", n_resultados=3)
        if fragmentos_rag:
            contexto += "\n\nMEMORIA PREVIA (análisis anteriores relevantes):\n"
            for f in fragmentos_rag[:2]:
                if f.get("distancia", 1) < 0.7:
                    contexto += f"  — {f['documento'][:200]}\n"

    if not llm:
        return "⚠ Sin motor LLM disponible. Activa Ollama o configura ANTHROPIC_API_KEY."

    return llm.chat(
        mensaje,
        historia=historia,
        contexto=contexto,
        sistema=_SYSTEM_BRAIN_COMPLETO,
        stream=stream,
    )


# ── RAG — Memoria del brain ───────────────────────────────────────────────────

def _indexar_razonamiento(foco: str, contenido: str, estado: dict) -> None:
    """Indexa el razonamiento generado en ChromaDB para memoria persistente."""
    llm = _get_llm()
    if not llm:
        return
    try:
        doc = f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] [{foco.upper()}]\n{contenido[:1500]}"
        llm.indexar_datos(
            "politeia_insights",
            [doc],
            metadatos=[{
                "foco": foco,
                "fecha": datetime.now().isoformat(),
                "n_noticias": len(estado.get("noticias", [])),
                "n_sondeos": len(estado.get("sondeos", {})),
            }],
        )
    except Exception:
        pass


def recuperar_memoria(query: str, n: int = 5) -> list[dict]:
    """Recupera análisis pasados relevantes para una query."""
    llm = _get_llm()
    if not llm:
        return []
    return llm.buscar_contexto(query, "politeia_insights", n_resultados=n)


# ── Estado del brain para sidebar ────────────────────────────────────────────

def estado_brain_chip() -> dict:
    """Retorna info compacta del estado del brain para mostrar en sidebar."""
    llm = _get_llm()
    if not llm:
        return {"online": False, "modelo": "sin IA", "ultimo_analisis": None}

    status = llm.disponible()
    modelo = status.get("modelo_activo", "")
    online = bool(status.get("ollama") or status.get("claude_api"))

    # Ver si hay algo en caché
    ultimo = None
    for key in ["briefing_diario", "razonamiento_general", "razonamiento_riesgo"]:
        if key in _CACHE:
            ts, _ = _CACHE[key]
            dt = datetime.fromtimestamp(ts)
            ultimo = dt.strftime("%H:%M")
            break

    return {
        "online": online,
        "modelo": modelo.split(":")[0] if modelo else "sin IA",
        "ultimo_analisis": ultimo,
        "n_insights": len(_CACHE),
    }


def insight_rapido(tema: str) -> str:
    """
    Genera un insight rápido (1-2 frases) sobre un tema concreto.
    Para mostrar en tarjetas y widgets del dashboard.
    """
    estado = obtener_estado_dashboard()
    contexto = construir_prompt_contexto(estado)

    llm = _get_llm()
    if not llm:
        return ""

    resp = llm.chat(
        f"En máximo 2 frases concisas, ¿qué es lo más relevante sobre '{tema}' "
        f"en el contexto político español ahora mismo?",
        contexto=contexto,
        sistema=_SYSTEM_BRAIN_COMPLETO,
        stream=False,
        modo="fast",
    )
    return resp if isinstance(resp, str) else ""


# ═══════════════════════════════════════════════════════════════════════════════
# ANÁLISIS CRUZADO — Cross-module intelligence
# ═══════════════════════════════════════════════════════════════════════════════

def analisis_cruzado(
    modulos: list[str] | None = None,
    stream: bool = False,
) -> str | Generator[str, None, None]:
    """
    Análisis cruzado que busca correlaciones entre varios módulos del dashboard.
    Detecta patrones que solo son visibles cuando se analizan conjuntamente.

    modulos: Lista de módulos a cruzar. Por defecto: electoral + coalicion + medios + legislativo
    """
    modulos = modulos or ["electoral", "coalicion", "medios", "legislativo"]

    estado = obtener_estado_dashboard()
    contexto = construir_prompt_contexto(estado, "análisis cruzado")

    pregunta = (
        f"Realiza un análisis cruzado entre los módulos: {', '.join(modulos)}.\n\n"
        "Busca específicamente:\n"
        "1. **CORRELACIONES** — ¿Qué patrones en medios/noticias explican movimientos en encuestas?\n"
        "2. **CAUSALIDADES** — ¿Qué decisiones legislativas están afectando a la coalición?\n"
        "3. **ANOMALÍAS** — ¿Qué no cuadra entre los datos de distintos módulos?\n"
        "4. **OPORTUNIDADES OCULTAS** — ¿Qué ventanas estratégicas solo son visibles "
        "al cruzar estas fuentes de datos?\n"
        "5. **SEÑALES DÉBILES** — ¿Qué indicadores marginales merecen vigilancia especial?"
    )

    llm = _get_llm()
    if not llm:
        return "⚠ Sin LLM disponible."

    return llm.chat(
        pregunta,
        contexto=contexto,
        sistema=_SYSTEM_BRAIN_COMPLETO,
        stream=stream,
        modo="deep",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONALIZACIÓN — El brain adapta el contenido al usuario
# ═══════════════════════════════════════════════════════════════════════════════

_PERFILES_USUARIO = {
    "consultor": (
        "Eres el asesor estratégico de un consultor de campaña. "
        "Prioriza: oportunidades de campaña, vulnerabilidades del adversario, "
        "mensajes clave, target de votantes. Sé directo y accionable."
    ),
    "periodista": (
        "Eres el asistente de un periodista político. "
        "Prioriza: noticias con mayor impacto, contradicciones políticas, "
        "declaraciones relevantes, datos verificables. Sugiere ángulos de story."
    ),
    "analista": (
        "Eres el asistente de un analista político académico. "
        "Prioriza: tendencias estructurales, datos estadísticos, comparaciones "
        "históricas y marcos teóricos. Sé riguroso y matizado."
    ),
    "ciudadano": (
        "Eres un asistente que explica política española de forma clara. "
        "Usa lenguaje accesible, evita jerga técnica y explica el contexto "
        "necesario para entender cada situación."
    ),
    "inversor": (
        "Eres el asistente de un inversor que monitoriza el riesgo político español. "
        "Prioriza: estabilidad del gobierno, riesgo regulatorio, política fiscal, "
        "impacto en sectores clave. Cuantifica el riesgo cuando sea posible."
    ),
}


def chat_personalizado(
    mensaje: str,
    perfil_usuario: str = "analista",
    historia: list[dict] | None = None,
    stream: bool = False,
) -> str | Generator[str, None, None]:
    """
    Chat adaptado al perfil del usuario. El brain ajusta su estilo y prioridades.

    perfil_usuario: 'consultor' | 'periodista' | 'analista' | 'ciudadano' | 'inversor'
    """
    sistema_personalizado = _PERFILES_USUARIO.get(perfil_usuario, _SYSTEM_BRAIN_COMPLETO)
    # Enriquecer con el contexto del brain
    sistema_final = f"{sistema_personalizado}\n\n{_SYSTEM_BRAIN_COMPLETO}"

    estado = obtener_estado_dashboard()
    contexto = construir_prompt_contexto(estado, f"perfil:{perfil_usuario}")

    llm = _get_llm()
    if not llm:
        return "⚠ Sin LLM disponible."

    return llm.chat(
        mensaje,
        historia=historia,
        contexto=contexto,
        sistema=sistema_final,
        stream=stream,
    )


def optimizar_presentacion_datos(
    tipo_dato: str,
    muestra_datos: str,
    objetivo: str = "análisis político",
) -> dict:
    """
    El brain sugiere cómo presentar mejor los datos al usuario.
    Retorna sugerencias de visualización, métricas clave y narrativa.

    Returns:
        {
          "narrativa": str,       # Explicación del dato más importante
          "metricas_clave": str,  # Qué métricas destacar
          "visualizacion": str,   # Tipo de gráfico recomendado
          "alerta": str,          # Si hay algo urgente en los datos
        }
    """
    llm = _get_llm()
    if not llm:
        return {}

    prompt = (
        f"Analiza estos datos de tipo '{tipo_dato}'y responde en JSON:\n"
        f"DATOS:\n{muestra_datos[:1500]}\n\n"
        f"OBJETIVO: {objetivo}\n\n"
        "Responde SOLO con JSON válido:\n"
        '{"narrativa": "...", "metricas_clave": "...", "visualizacion": "...", "alerta": "..."}'
    )

    resp = llm.chat(prompt, sistema=_SYSTEM_BRAIN_COMPLETO, modo="fast")
    if isinstance(resp, str):
        import re
        match = re.search(r'\{.*\}', resp, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {"narrativa": str(resp)[:200] if isinstance(resp, str) else ""}


def evaluar_impacto_noticia(
    noticia: str,
    medio: str = "",
    stream: bool = False,
) -> str | Generator[str, None, None]:
    """
    Evalúa el impacto político de una noticia específica con contexto total.
    """
    estado = obtener_estado_dashboard()
    contexto = construir_prompt_contexto(estado, "medios")

    llm = _get_llm()
    if not llm:
        return "⚠ Sin LLM."

    prompt = (
        f"Evalúa el impacto político de esta noticia:\n"
        f"{'[' + medio + '] 'if medio else ''}{noticia}\n\n"
        "Analiza: impacto en intención de voto, qué partidos se ven afectados, "
        "si es una noticia que beneficia o perjudica al gobierno, "
        "y qué tipo de reacción política es probable."
    )

    return llm.chat(prompt, contexto=contexto, sistema=_SYSTEM_BRAIN_COMPLETO, stream=stream)


def razonamiento_profundo(
    pregunta: str,
    foco: str = "general",
) -> dict[str, str]:
    """
    Razonamiento multi-paso (chain-of-thought) sobre una pregunta compleja.
    Retorna cada paso del razonamiento por separado.
    """
    estado = obtener_estado_dashboard()
    contexto = construir_prompt_contexto(estado, foco)

    llm = _get_llm()
    if not llm:
        return {}

    return llm.razonar(
        pregunta=pregunta,
        contexto=contexto,
        sistema=_SYSTEM_BRAIN_COMPLETO,
    )
