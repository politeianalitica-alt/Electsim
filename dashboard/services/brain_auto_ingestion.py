"""
Brain Auto Ingestion Service — Motor de ingesta automática continua
===================================================================
Worker de fondo que mantiene el brain de Ollama actualizado en tiempo real
sin intervención humana. Ingiere noticias, BOE, sondeos y datos institucionales,
los procesa con Ollama y los indexa en ChromaDB para enriquecer el RAG.

Ciclos de ingesta configurables:
  • RSS / noticias     → cada 10 min  (configurable vía ENV)
  • BOE                → cada 30 min
  • Sondeos electorales → cada 60 min
  • Agenda institucional → cada 60 min
  • Alertas proactivas  → cada 5 min
  • Análisis cross-módulo → cada 4 h
  • Briefing diario     → cada 24 h

Arquitectura:
  [RSS|BOE|DB] → [Parser] → [Ollama Brain] → [ChromaDB RAG]
                                 ↓
                          [Alertas proactivas]
                          [Insights indexados]
                          [Cache invalidación]
"""
from __future__ import annotations

import threading
import time
import json
import hashlib
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable
import sys

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# ── Intervalos por tipo de dato (segundos) — configurables por ENV ─────────────
_INTERVALS: dict[str, int] = {
    "rss":            int(os.environ.get("BRAIN_INTERVAL_RSS", "600")),      # 10 min
    "boe":            int(os.environ.get("BRAIN_INTERVAL_BOE", "1800")),     # 30 min
    "sondeos":        int(os.environ.get("BRAIN_INTERVAL_SONDEOS", "3600")), # 1 h
    "agenda":         int(os.environ.get("BRAIN_INTERVAL_AGENDA", "3600")),  # 1 h
    "alertas":        int(os.environ.get("BRAIN_INTERVAL_ALERTAS", "300")),  # 5 min
    "analisis_global":int(os.environ.get("BRAIN_INTERVAL_GLOBAL", "14400")), # 4 h
    "briefing":       int(os.environ.get("BRAIN_INTERVAL_BRIEFING", "86400")),# 24 h
}

# ── Estado global del worker ──────────────────────────────────────────────────
_WORKER_RUNNING: bool = False
_WORKER_THREAD: threading.Thread | None = None
_LAST_INGESTION: dict[str, float] = {}
_INGESTION_ERRORS: dict[str, str] = {}
_INGESTION_LOG: list[dict] = []
_MAX_LOG = 150
_INGESTION_STATS: dict[str, int] = {k: 0 for k in _INTERVALS}
_TOTAL_DOCS_INDEXED: int = 0

# ── Callbacks para notificaciones en tiempo real ──────────────────────────────
_LISTENERS: list[Callable[[dict], None]] = []


def suscribir(callback: Callable[[dict], None]) -> None:
    """Suscribe un callback que se llama con cada ingesta completada."""
    _LISTENERS.append(callback)


def desuscribir(callback: Callable[[dict], None]) -> None:
    if callback in _LISTENERS:
        _LISTENERS.remove(callback)


def _notificar(evento: dict) -> None:
    for fn in _LISTENERS:
        try:
            fn(evento)
        except Exception:
            pass


# ── Helpers de log y timing ───────────────────────────────────────────────────

def _log(tipo: str, n_docs: int, ms: float, error: str = "") -> None:
    global _INGESTION_LOG, _TOTAL_DOCS_INDEXED
    entry = {
        "tipo": tipo,
        "timestamp": datetime.now().isoformat(),
        "n_docs": n_docs,
        "ms": round(ms, 1),
        "ok": not bool(error),
        "error": error[:200] if error else "",
    }
    _INGESTION_LOG.append(entry)
    if len(_INGESTION_LOG) > _MAX_LOG:
        _INGESTION_LOG = _INGESTION_LOG[-_MAX_LOG:]
    if not error:
        _INGESTION_STATS[tipo] = _INGESTION_STATS.get(tipo, 0) + n_docs
        _TOTAL_DOCS_INDEXED += n_docs
    _notificar(entry)


def _debe_actualizar(tipo: str) -> bool:
    intervalo = _INTERVALS.get(tipo, 600)
    return time.time() - _LAST_INGESTION.get(tipo, 0) > intervalo


def _marcar(tipo: str) -> None:
    _LAST_INGESTION[tipo] = time.time()
    _INGESTION_ERRORS.pop(tipo, None)


# ═══════════════════════════════════════════════════════════════════════════════
# INGESTAS INDIVIDUALES
# ═══════════════════════════════════════════════════════════════════════════════

def _ingestar_rss() -> int:
    """Ingesta noticias RSS, las indexa y genera análisis Ollama."""
    t0 = time.time()
    try:
        from dashboard.services.rss_feeds import obtener_noticias_recientes
        from dashboard.services.llm_local import indexar_datos, chat

        noticias = obtener_noticias_recientes(max_items=40)
        if not noticias:
            _log("rss", 0, (time.time() - t0) * 1000)
            return 0

        docs, metas = [], []
        for n in noticias:
            titulo = n.get("titulo", "")
            medio = n.get("medio", "")
            fecha = n.get("fecha", datetime.now().strftime("%d/%m/%Y"))
            resumen = n.get("resumen", "")
            doc = f"[{fecha}] [{medio.upper()}] {titulo}\n{resumen[:300]}"
            docs.append(doc)
            metas.append({
                "tipo": "noticia",
                "medio": str(medio),
                "fecha": str(fecha),
                "indexed_at": datetime.now().isoformat(),
            })

        indexar_datos("noticias", docs, metas)

        # Ollama analiza los titulares más importantes
        if len(noticias) >= 3:
            titulares = "\n".join(
                f"• [{n.get('medio', '?')}] {n.get('titulo', '')}"
                for n in noticias[:12]
            )
            analisis = chat(
                f"Resume en 3 bullets concisos los temas políticos más importantes:\n{titulares}",
                sistema=(
                    "Eres Politeia Brain. Analiza noticias políticas españolas. "
                    "Sé conciso, cita datos específicos, responde en español."
                ),
            )
            if analisis and len(analisis) > 20:
                indexar_datos(
                    "politeia_insights",
                    [f"[RSS {datetime.now().strftime('%Y-%m-%d %H:%M')}]\n{analisis}"],
                    [{"tipo": "rss_summary", "n_noticias": len(noticias), "fecha": datetime.now().isoformat()}],
                )

        n = len(docs)
        _log("rss", n, (time.time() - t0) * 1000)
        return n
    except Exception as exc:
        _log("rss", 0, (time.time() - t0) * 1000, str(exc))
        _INGESTION_ERRORS["rss"] = str(exc)
        return 0


def _ingestar_boe() -> int:
    """Ingesta BOE, analiza impacto político con Ollama."""
    t0 = time.time()
    try:
        from dashboard.services.boe_api import obtener_sumario
        from dashboard.services.llm_local import indexar_datos, chat

        items = obtener_sumario()
        if not items:
            _log("boe", 0, (time.time() - t0) * 1000)
            return 0

        docs, metas = [], []
        for item in items[:25]:
            titulo = str(item.get("titulo", ""))
            seccion = str(item.get("seccion", ""))
            impacto = str(item.get("impacto", "BAJO"))
            doc = f"[BOE {datetime.now().strftime('%d/%m/%Y')}] [{seccion}] {titulo}"
            docs.append(doc)
            metas.append({
                "tipo": "boe",
                "seccion": seccion,
                "impacto": impacto,
                "fecha": datetime.now().isoformat(),
            })

        indexar_datos("boe", docs, metas)

        # Análisis Ollama de items críticos
        criticos = [i for i in items if i.get("impacto") in ("CRÍTICO", "ALTO")]
        if criticos:
            texto = "\n".join(
                f"• [{i.get('seccion', '?')}] {str(i.get('titulo', ''))[:120]}"
                for i in criticos[:6]
            )
            analisis = chat(
                f"Analiza el impacto político y económico de estas publicaciones del BOE:\n{texto}",
                sistema=(
                    "Eres un analista de política pública española. "
                    "Sé específico sobre qué sectores, partidos o ciudadanos se ven afectados."
                ),
            )
            if analisis and len(analisis) > 20:
                indexar_datos(
                    "politeia_insights",
                    [f"[BOE ANÁLISIS {datetime.now().strftime('%Y-%m-%d')}]\n{analisis}"],
                    [{"tipo": "boe_analysis", "n_criticos": len(criticos), "fecha": datetime.now().isoformat()}],
                )

        n = len(docs)
        _log("boe", n, (time.time() - t0) * 1000)
        return n
    except Exception as exc:
        _log("boe", 0, (time.time() - t0) * 1000, str(exc))
        _INGESTION_ERRORS["boe"] = str(exc)
        return 0


def _ingestar_sondeos() -> int:
    """Ingesta sondeos electorales y detecta tendencias con Ollama."""
    t0 = time.time()
    try:
        import dashboard.db as db
        from dashboard.services.llm_local import indexar_datos, chat

        df = db.cargar_nowcasting()
        if df is None or df.empty:
            _log("sondeos", 0, (time.time() - t0) * 1000)
            return 0

        docs, metas, resumen = [], [], {}
        col_fecha = next(
            (c for c in ["fecha_encuesta", "fecha", "date"] if c in df.columns),
            df.columns[0],
        )

        for _, row in df.sort_values(col_fecha).tail(60).iterrows():
            p = str(row.get("partido_siglas", row.get("partido_nombre", "?")))
            voto = float(row.get("voto_medio", row.get("media", 0)))
            esc = int(row.get("escanos_medio", row.get("escanos", 0)))
            fecha_str = str(row.get(col_fecha, datetime.now().date()))
            doc = f"[SONDEO {fecha_str}] {p}: {voto:.1f}% estimado — {esc} escaños proyectados"
            docs.append(doc)
            metas.append({"tipo": "sondeo", "partido": p, "fecha": fecha_str, "voto": voto})
            resumen[p] = {"voto": voto, "escanos": esc}

        indexar_datos("sondeos", docs, metas)

        # Ollama detecta tendencias electorales
        if resumen:
            tabla = "\n".join(
                f"  {p}: {d['voto']:.1f}% — {d['escanos']} esc."
                for p, d in sorted(resumen.items(), key=lambda x: -x[1]["escanos"])[:8]
            )
            analisis = chat(
                f"Analiza estas estimaciones electorales y detecta tendencias relevantes:\n{tabla}",
                sistema=(
                    "Eres un analista electoral español experto en demoscopia. "
                    "Detecta quién sube, quién baja, qué bloques se forman y qué significa "
                    "para la gobernabilidad."
                ),
            )
            if analisis and len(analisis) > 20:
                indexar_datos(
                    "politeia_insights",
                    [f"[ANÁLISIS ELECTORAL {datetime.now().strftime('%Y-%m-%d %H:%M')}]\n{analisis}"],
                    [{"tipo": "electoral_analysis", "n_partidos": len(resumen), "fecha": datetime.now().isoformat()}],
                )

        n = len(docs)
        _log("sondeos", n, (time.time() - t0) * 1000)
        return n
    except Exception as exc:
        _log("sondeos", 0, (time.time() - t0) * 1000, str(exc))
        _INGESTION_ERRORS["sondeos"] = str(exc)
        return 0


def _ingestar_agenda() -> int:
    """Ingesta agenda institucional y actividad parlamentaria."""
    t0 = time.time()
    try:
        from dashboard.services.llm_local import indexar_datos, chat
        docs, metas = [], []

        # Agenda de Moncloa
        try:
            from dashboard.services.agenda_service import obtener_agenda_hoy
            agenda = obtener_agenda_hoy()
            for item in (agenda or [])[:15]:
                doc = f"[AGENDA {datetime.now().strftime('%d/%m/%Y')}] {str(item)[:200]}"
                docs.append(doc)
                metas.append({"tipo": "agenda", "fecha": datetime.now().isoformat()})
        except Exception:
            pass

        # Actividad legislativa reciente
        try:
            from dashboard.services.legislative_service import obtener_iniciativas_recientes
            iniciativas = obtener_iniciativas_recientes(limit=10)
            for ini in (iniciativas or []):
                titulo = str(ini.get("titulo", ini.get("title", ""))[:200])
                tipo_ini = str(ini.get("tipo", ini.get("type", "iniciativa")))
                doc = f"[CONGRESO {datetime.now().strftime('%d/%m/%Y')}] [{tipo_ini}] {titulo}"
                docs.append(doc)
                metas.append({"tipo": "legislativo", "tipo_ini": tipo_ini, "fecha": datetime.now().isoformat()})
        except Exception:
            pass

        if docs:
            indexar_datos("agenda", docs, metas)
            n = len(docs)
            _log("agenda", n, (time.time() - t0) * 1000)
            return n

        _log("agenda", 0, (time.time() - t0) * 1000)
        return 0
    except Exception as exc:
        _log("agenda", 0, (time.time() - t0) * 1000, str(exc))
        _INGESTION_ERRORS["agenda"] = str(exc)
        return 0


def _ingestar_alertas() -> int:
    """Genera alertas proactivas con Ollama basado en el estado actual."""
    t0 = time.time()
    try:
        from dashboard.services import brain_service as brain
        alertas = brain.generar_alertas_proactivas(force_refresh=True)
        n = len(alertas) if alertas else 0
        _log("alertas", n, (time.time() - t0) * 1000)
        return n
    except Exception as exc:
        _log("alertas", 0, (time.time() - t0) * 1000, str(exc))
        _INGESTION_ERRORS["alertas"] = str(exc)
        return 0


def _analisis_global() -> int:
    """Análisis cruzado de todos los módulos con razonamiento profundo de Ollama."""
    t0 = time.time()
    try:
        from dashboard.services import brain_service as brain
        from dashboard.services.llm_local import indexar_datos, chat

        estado = brain.obtener_estado_dashboard(force_refresh=True)
        contexto = brain.construir_prompt_contexto(estado, "análisis global automático")

        # Razonamiento profundo multi-paso
        analisis_pasos = []

        # Paso 1: Situación actual
        p1 = chat(
            "¿Cuál es el estado político actual más relevante basándote en los datos? (2-3 frases)",
            contexto=contexto,
            sistema=brain._SYSTEM_BRAIN_COMPLETO,
        )
        if p1:
            analisis_pasos.append(f"**SITUACIÓN ACTUAL**: {p1}")

        # Paso 2: Riesgos inmediatos
        p2 = chat(
            "¿Qué riesgos políticos son más urgentes en este momento? (1-2 frases)",
            contexto=contexto,
            sistema=brain._SYSTEM_BRAIN_COMPLETO,
        )
        if p2:
            analisis_pasos.append(f"**RIESGOS URGENTES**: {p2}")

        # Paso 3: Predicción
        p3 = chat(
            "¿Qué es lo más probable que ocurra en los próximos 7-30 días? (1-2 frases)",
            contexto=contexto,
            sistema=brain._SYSTEM_BRAIN_COMPLETO,
        )
        if p3:
            analisis_pasos.append(f"**PREDICCIÓN**: {p3}")

        if analisis_pasos:
            doc_completo = (
                f"[ANÁLISIS GLOBAL AUTOMÁTICO — {datetime.now().strftime('%Y-%m-%d %H:%M')}]\n"
                + "\n\n".join(analisis_pasos)
            )
            indexar_datos(
                "politeia_insights",
                [doc_completo],
                [{"tipo": "global_auto", "pasos": len(analisis_pasos), "fecha": datetime.now().isoformat()}],
            )
            # Invalidar caché del brain para que las páginas lean datos frescos
            brain.invalidar_cache("estado_global")
            brain.invalidar_cache("briefing_diario")

            _log("analisis_global", len(analisis_pasos), (time.time() - t0) * 1000)
            return len(analisis_pasos)

        _log("analisis_global", 0, (time.time() - t0) * 1000)
        return 0
    except Exception as exc:
        _log("analisis_global", 0, (time.time() - t0) * 1000, str(exc))
        _INGESTION_ERRORS["analisis_global"] = str(exc)
        return 0


def _generar_briefing_auto() -> int:
    """Genera el briefing diario automáticamente."""
    t0 = time.time()
    try:
        from dashboard.services import brain_service as brain
        briefing = brain.generar_briefing_diario(force_refresh=True)
        if briefing and len(briefing) > 100:
            from dashboard.services.llm_local import indexar_datos
            indexar_datos(
                "politeia_insights",
                [f"[BRIEFING DIARIO {datetime.now().strftime('%Y-%m-%d')}]\n{briefing[:2000]}"],
                [{"tipo": "briefing_diario", "fecha": datetime.now().isoformat()}],
            )
            _log("briefing", 1, (time.time() - t0) * 1000)
            return 1
        _log("briefing", 0, (time.time() - t0) * 1000)
        return 0
    except Exception as exc:
        _log("briefing", 0, (time.time() - t0) * 1000, str(exc))
        _INGESTION_ERRORS["briefing"] = str(exc)
        return 0


# ═══════════════════════════════════════════════════════════════════════════════
# WORKER DE FONDO
# ═══════════════════════════════════════════════════════════════════════════════

_TAREAS = [
    ("rss", _ingestar_rss),
    ("boe", _ingestar_boe),
    ("sondeos", _ingestar_sondeos),
    ("agenda", _ingestar_agenda),
    ("alertas", _ingestar_alertas),
    ("analisis_global", _analisis_global),
    ("briefing", _generar_briefing_auto),
]


def _worker_loop() -> None:
    """Loop principal del worker. Respeta TTLs y ejecuta en orden de prioridad."""
    global _WORKER_RUNNING

    while _WORKER_RUNNING:
        for tipo, fn in _TAREAS:
            if not _WORKER_RUNNING:
                break
            if _debe_actualizar(tipo):
                try:
                    fn()
                    _marcar(tipo)
                except Exception:
                    pass

        # Check cada 30 segundos
        for _ in range(30):
            if not _WORKER_RUNNING:
                break
            time.sleep(1)


def iniciar_worker() -> bool:
    """
    Inicia el worker de ingesta automática en un thread daemon.
    Retorna True si se inició, False si ya estaba corriendo.
    """
    global _WORKER_RUNNING, _WORKER_THREAD

    if _WORKER_RUNNING and _WORKER_THREAD and _WORKER_THREAD.is_alive():
        return False

    _WORKER_RUNNING = True
    _WORKER_THREAD = threading.Thread(
        target=_worker_loop,
        daemon=True,
        name="politeia-brain-ingestion",
    )
    _WORKER_THREAD.start()
    return True


def detener_worker() -> None:
    """Detiene el worker de ingesta."""
    global _WORKER_RUNNING
    _WORKER_RUNNING = False


def estado_worker() -> dict:
    """Retorna el estado completo del worker para visualización en UI."""
    ahora = time.time()
    proximas = {}
    for tipo in _INTERVALS:
        restante = max(0, int(_INTERVALS[tipo] - (ahora - _LAST_INGESTION.get(tipo, 0))))
        proximas[tipo] = restante

    return {
        "running": _WORKER_RUNNING and bool(_WORKER_THREAD and _WORKER_THREAD.is_alive()),
        "thread_name": _WORKER_THREAD.name if _WORKER_THREAD else None,
        "log": list(reversed(_INGESTION_LOG[-30:])),
        "stats": _INGESTION_STATS.copy(),
        "total_indexado": _TOTAL_DOCS_INDEXED,
        "errores": _INGESTION_ERRORS.copy(),
        "proximas_ingestas_seg": proximas,
        "ultima_ingesta": {
            tipo: datetime.fromtimestamp(ts).strftime("%H:%M:%S")
            if ts > 0 else "nunca"
            for tipo, ts in _LAST_INGESTION.items()
        },
        "intervalos_min": {k: v // 60 for k, v in _INTERVALS.items()},
    }


def ejecutar_ingesta_manual(tipo: str) -> int:
    """
    Fuerza una ingesta inmediata de un tipo específico.
    Retorna el número de documentos procesados.
    """
    # Invalidar timestamp para forzar actualización
    _LAST_INGESTION.pop(tipo, None)

    mapa = {fn_tipo: fn for fn_tipo, fn in _TAREAS}
    fn = mapa.get(tipo)
    if fn:
        n = fn()
        _marcar(tipo)
        return n
    return 0


def ejecutar_ingesta_completa() -> dict[str, int]:
    """Ejecuta todos los tipos de ingesta inmediatamente."""
    resultados = {}
    for tipo, fn in _TAREAS:
        _LAST_INGESTION.pop(tipo, None)
        try:
            resultados[tipo] = fn()
            _marcar(tipo)
        except Exception as exc:
            resultados[tipo] = 0
            _INGESTION_ERRORS[tipo] = str(exc)
    return resultados


def get_log_reciente(n: int = 20) -> list[dict]:
    """Retorna los últimos N eventos de ingesta."""
    return list(reversed(_INGESTION_LOG[-n:]))


def get_total_indexado() -> int:
    """Número total de documentos indexados desde el inicio."""
    return _TOTAL_DOCS_INDEXED
