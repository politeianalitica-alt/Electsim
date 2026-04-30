"""
Pipeline Geopolítica — Orquestador ETL para el módulo Geo.
Usa APScheduler para ejecución periódica automática.

Tareas programadas:
  - OSINT scraping: cada 2 horas
  - ACLED refresh: cada día a las 03:00
  - Briefing diario: cada día a las 07:00
  - ChromaDB indexing: cada 6 horas
  - Cálculo riesgo_pais: cada 12 horas

Uso:
  # Ejecutar manualmente una sola vez
  python -m etl.pipelines.pipeline_geopolitica --run-now

  # Arrancar el scheduler en background
  python -m etl.pipelines.pipeline_geopolitica --scheduler
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]
_BRIEFING_PATH = _ROOT / "dashboard" / "data" / "briefing_geo_latest.json"
_BRIEFING_PATH.parent.mkdir(parents=True, exist_ok=True)


# ── Tareas individuales ───────────────────────────────────────────────────────

def tarea_osint() -> dict[str, Any]:
    """
    Scraping OSINT: RSS feeds + GDELT.
    Guarda en dashboard/data/osint_geo.json.
    Enriquece con Ollama los items nuevos (procesado_llm=False, urgencia>=2).
    Evalúa alertas con el SignalEngine.
    """
    logger.info("[GEO] Iniciando tarea OSINT...")
    resultado: dict[str, Any] = {
        "inicio": datetime.now(timezone.utc).isoformat(),
        "osint_nuevos": 0,
        "gdelt_nuevos": 0,
        "enriquecidos": 0,
        "alertas_nuevas": 0,
        "errores": [],
    }

    # ── OSINT RSS feeds ───────────────────────────────────────────────────────
    try:
        from etl.sources.geo.scraper_osint_advanced import run_scraping
        stats_rss = run_scraping(max_fuentes=50)
        resultado["osint_nuevos"] = stats_rss.get("nuevos", 0)
        logger.info("[GEO] OSINT RSS: %d nuevos items", resultado["osint_nuevos"])
    except Exception as exc:
        logger.error("[GEO] OSINT RSS error: %s", exc)
        resultado["errores"].append(f"osint_rss: {exc}")

    # ── GDELT ─────────────────────────────────────────────────────────────────
    try:
        from etl.sources.geo.scraper_gdelt import run_gdelt
        from etl.sources.geo.scraper_osint_advanced import load_store, save_store

        gdelt_items = run_gdelt(max_queries=6)
        if gdelt_items:
            store = load_store()
            ids_existentes = {i.get("id") for i in store}
            nuevos_gdelt = [i for i in gdelt_items if i.get("id") not in ids_existentes]
            store.extend(nuevos_gdelt)
            save_store(store)
            resultado["gdelt_nuevos"] = len(nuevos_gdelt)
            logger.info("[GEO] GDELT: %d nuevos items", len(nuevos_gdelt))
    except Exception as exc:
        logger.error("[GEO] GDELT error: %s", exc)
        resultado["errores"].append(f"gdelt: {exc}")

    # ── Enriquecimiento Ollama ─────────────────────────────────────────────────
    try:
        from etl.sources.geo.scraper_osint_advanced import load_store, save_store
        from agents.geo.enricher_ollama import enriquecer_item, analizar_impacto

        store = load_store()
        pendientes = [
            i for i in store
            if not i.get("procesado_llm", False) and int(i.get("urgencia", 1)) >= 2
        ][:20]  # Máx 20 por ciclo para no saturar Ollama

        enriquecidos = 0
        for item in pendientes:
            try:
                item_enriq = enriquecer_item(item)
                # Actualizar en el store
                for idx, s in enumerate(store):
                    if s.get("id") == item_enriq.get("id"):
                        store[idx] = item_enriq
                        break
                enriquecidos += 1
            except Exception as e:
                logger.debug("[GEO] Enriquecimiento error item %s: %s", item.get("id"), e)

        if enriquecidos:
            save_store(store)
        resultado["enriquecidos"] = enriquecidos
        logger.info("[GEO] Enriquecidos con Ollama: %d items", enriquecidos)
    except Exception as exc:
        logger.error("[GEO] Ollama enrichment error: %s", exc)
        resultado["errores"].append(f"ollama: {exc}")

    # ── Signal Engine (alertas) ────────────────────────────────────────────────
    try:
        from etl.sources.geo.scraper_osint_advanced import get_items_recent
        from agents.geo.signal_engine_geo import procesar_nuevos_eventos

        items_recientes = get_items_recent(horas=3, urgencia_min=2, relevancia_min=0.4)
        nuevas_alertas = procesar_nuevos_eventos(items_osint=items_recientes)
        resultado["alertas_nuevas"] = len(nuevas_alertas)
        logger.info("[GEO] Alertas generadas: %d", len(nuevas_alertas))
    except Exception as exc:
        logger.error("[GEO] Signal engine error: %s", exc)
        resultado["errores"].append(f"signal_engine: {exc}")

    resultado["fin"] = datetime.now(timezone.utc).isoformat()
    return resultado


def tarea_acled() -> dict[str, Any]:
    """
    Descarga y procesa eventos ACLED de los últimos 7 días.
    Calcula alertas desde eventos ACLED.
    """
    logger.info("[GEO] Iniciando tarea ACLED...")
    resultado: dict[str, Any] = {
        "inicio": datetime.now(timezone.utc).isoformat(),
        "eventos": 0,
        "alertas": 0,
        "errores": [],
    }

    try:
        from etl.sources.geo.scraper_acled import ACLEDScraper
        from agents.geo.signal_engine_geo import procesar_nuevos_eventos

        scraper = ACLEDScraper()
        df = scraper.run(days_back=7)

        if not df.empty:
            eventos = df.to_dict("records")
            resultado["eventos"] = len(eventos)
            logger.info("[GEO] ACLED: %d eventos descargados", len(eventos))

            # Evaluar alertas desde eventos ACLED
            nuevas_alertas = procesar_nuevos_eventos(eventos_acled=eventos)
            resultado["alertas"] = len(nuevas_alertas)
        else:
            logger.info("[GEO] ACLED: sin eventos (modo demo o error API)")

    except Exception as exc:
        logger.error("[GEO] ACLED tarea error: %s", exc)
        resultado["errores"].append(str(exc))

    resultado["fin"] = datetime.now(timezone.utc).isoformat()
    return resultado


def tarea_briefing() -> dict[str, Any]:
    """
    Genera el briefing geopolítico diario con Ollama.
    Guarda en dashboard/data/briefing_geo_latest.json.
    """
    import json

    logger.info("[GEO] Generando briefing diario...")
    resultado: dict[str, Any] = {
        "inicio": datetime.now(timezone.utc).isoformat(),
        "generado": False,
        "errores": [],
    }

    try:
        from etl.sources.geo.scraper_osint_advanced import get_items_recent
        from agents.geo.signal_engine_geo import get_engine
        from agents.geo.enricher_ollama import generar_briefing_diario

        # Top 15 items por relevancia (últimas 24h)
        items = get_items_recent(horas=24, urgencia_min=1, relevancia_min=0.4, limit=15)
        # Ordenar por relevancia desc
        items_sorted = sorted(items, key=lambda x: float(x.get("relevancia_espana", 0)), reverse=True)

        # Alertas activas
        engine = get_engine()
        alertas = engine.get_alertas_activas(limite=5, solo_no_leidas=True)

        # Generar briefing con Ollama
        texto_briefing = generar_briefing_diario(items_sorted, alertas)

        if texto_briefing:
            briefing_data = {
                "fecha": datetime.now(timezone.utc).isoformat(),
                "texto": texto_briefing,
                "items_analizados": len(items_sorted),
                "alertas_incluidas": len(alertas),
            }
            with open(_BRIEFING_PATH, "w", encoding="utf-8") as f:
                json.dump(briefing_data, f, ensure_ascii=False, indent=2)

            resultado["generado"] = True
            logger.info("[GEO] Briefing diario generado correctamente")
        else:
            logger.warning("[GEO] Briefing generado vacío — Ollama no disponible?")

    except Exception as exc:
        logger.error("[GEO] Briefing error: %s", exc)
        resultado["errores"].append(str(exc))

    resultado["fin"] = datetime.now(timezone.utc).isoformat()
    return resultado


def tarea_indexar_chromadb() -> dict[str, Any]:
    """
    Indexa items OSINT en ChromaDB para búsqueda semántica.
    Solo indexa los más recientes (últimas 6h) y con procesado_llm=True.
    """
    logger.info("[GEO] Indexando OSINT en ChromaDB...")
    resultado: dict[str, Any] = {
        "inicio": datetime.now(timezone.utc).isoformat(),
        "indexados": 0,
        "errores": [],
    }

    try:
        from etl.sources.geo.scraper_osint_advanced import get_items_recent
        from agents.geo.enricher_ollama import indexar_osint_en_chromadb

        items = get_items_recent(horas=6, urgencia_min=1, relevancia_min=0.3, limit=100)
        items_con_llm = [i for i in items if i.get("procesado_llm", False)]

        if items_con_llm:
            n = indexar_osint_en_chromadb(items_con_llm)
            resultado["indexados"] = n
            logger.info("[GEO] ChromaDB: %d items indexados", n)

    except Exception as exc:
        logger.warning("[GEO] ChromaDB index error: %s", exc)
        resultado["errores"].append(str(exc))

    resultado["fin"] = datetime.now(timezone.utc).isoformat()
    return resultado


def tarea_calcular_riesgo_pais() -> dict[str, Any]:
    """
    Recalcula los scores de riesgo por país basándose en eventos ACLED recientes.
    Actualiza riesgo_pais en DB (si disponible) o en un JSON store.
    """
    import json

    logger.info("[GEO] Calculando scores riesgo_pais...")
    resultado: dict[str, Any] = {
        "inicio": datetime.now(timezone.utc).isoformat(),
        "paises_actualizados": 0,
        "errores": [],
    }

    try:
        from etl.sources.geo.scraper_acled import ACLEDScraper

        scraper = ACLEDScraper()
        eventos = scraper.get_eventos_recientes(days=30)

        if not eventos:
            logger.info("[GEO] Sin eventos ACLED para calcular riesgo")
            resultado["fin"] = datetime.now(timezone.utc).isoformat()
            return resultado

        # Agrupar por país
        from collections import defaultdict
        por_pais: dict[str, list[dict]] = defaultdict(list)
        for ev in eventos:
            iso3 = ev.get("pais", "")
            if iso3:
                por_pais[iso3].append(ev)

        # Calcular score ACLED por país
        scores_actualizados = {}
        for iso3, evs in por_pais.items():
            total_fatalities = sum(int(e.get("fatalities", 0)) for e in evs)
            n_eventos = len(evs)
            relevancia_max = max(float(e.get("relevancia_es", 0)) for e in evs)
            # Score combinado: normalizado entre 0 y 10
            score_acled = min(10.0, (
                (total_fatalities / 50) * 3.0 +  # hasta 3 pts por muertes
                (n_eventos / 10) * 2.0 +          # hasta 2 pts por frecuencia
                relevancia_max * 5.0               # hasta 5 pts por relevancia
            ))
            scores_actualizados[iso3] = round(score_acled, 2)

        # Persistir en riesgo_pais (DB o JSON)
        _persistir_scores_riesgo(scores_actualizados)
        resultado["paises_actualizados"] = len(scores_actualizados)
        logger.info("[GEO] Riesgo actualizado para %d países", len(scores_actualizados))

    except Exception as exc:
        logger.error("[GEO] Riesgo_pais error: %s", exc)
        resultado["errores"].append(str(exc))

    resultado["fin"] = datetime.now(timezone.utc).isoformat()
    return resultado


def _persistir_scores_riesgo(scores: dict[str, float]) -> None:
    """Persiste scores de riesgo en DB o JSON fallback."""
    # Intentar PostgreSQL
    try:
        from etl.base_extractor import BaseExtractor
        extractor = BaseExtractor.__new__(BaseExtractor)
        extractor._init_engine()
        if extractor.engine:
            import sqlalchemy as sa
            with extractor.engine.begin() as conn:
                for iso3, score in scores.items():
                    conn.execute(
                        sa.text(
                            "UPDATE riesgo_pais SET score_acled = :score, "
                            "ultima_actualizacion = NOW() WHERE pais = :pais"
                        ),
                        {"score": score, "pais": iso3},
                    )
            return
    except Exception:
        pass

    # Fallback: JSON
    import json
    riesgo_path = _ROOT / "dashboard" / "data" / "riesgo_pais_scores.json"
    data = {}
    if riesgo_path.exists():
        try:
            with open(riesgo_path) as f:
                data = json.load(f)
        except Exception:
            pass
    data.update(scores)
    data["_updated"] = datetime.now(timezone.utc).isoformat()
    with open(riesgo_path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Función run-now (ejecución inmediata) ─────────────────────────────────────

def run_all(verbose: bool = True) -> dict[str, Any]:
    """Ejecuta todas las tareas en secuencia (para pruebas o ejecución manual)."""
    resultados: dict[str, Any] = {}

    if verbose:
        print("🌍 POLITEIA GEO — Iniciando pipeline geopolítico")
        print(f"   {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
        print()

    tareas = [
        ("acled", tarea_acled),
        ("osint", tarea_osint),
        ("chromadb", tarea_indexar_chromadb),
        ("briefing", tarea_briefing),
        ("riesgo", tarea_calcular_riesgo_pais),
    ]

    for nombre, tarea_fn in tareas:
        if verbose:
            print(f"  ▶ {nombre.upper()}...")
        try:
            r = tarea_fn()
            resultados[nombre] = r
            if verbose:
                errores = r.get("errores", [])
                estado = "✓" if not errores else f"⚠ ({len(errores)} errores)"
                print(f"    {estado} completado")
        except Exception as exc:
            resultados[nombre] = {"error": str(exc)}
            if verbose:
                print(f"    ✗ ERROR: {exc}")

    if verbose:
        print()
        print("✅ Pipeline geopolítico completado")

    return resultados


# ── Scheduler APScheduler ─────────────────────────────────────────────────────

def start_scheduler() -> None:
    """
    Arranca el scheduler APScheduler con las tareas programadas.
    Bloqueante — usar en un hilo separado o proceso dedicado.
    """
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger
    except ImportError:
        logger.error("APScheduler no instalado. pip install apscheduler")
        return

    scheduler = BlockingScheduler(timezone="Europe/Madrid")

    # OSINT RSS + GDELT + enriquecimiento: cada 2 horas
    scheduler.add_job(
        tarea_osint,
        trigger=IntervalTrigger(hours=2),
        id="osint",
        name="OSINT Scraping",
        misfire_grace_time=300,
    )

    # ACLED: cada día a las 03:00
    scheduler.add_job(
        tarea_acled,
        trigger=CronTrigger(hour=3, minute=0),
        id="acled",
        name="ACLED Refresh",
        misfire_grace_time=600,
    )

    # Briefing diario: a las 07:00
    scheduler.add_job(
        tarea_briefing,
        trigger=CronTrigger(hour=7, minute=0),
        id="briefing",
        name="Briefing Diario",
        misfire_grace_time=600,
    )

    # ChromaDB indexing: cada 6 horas
    scheduler.add_job(
        tarea_indexar_chromadb,
        trigger=IntervalTrigger(hours=6),
        id="chromadb",
        name="ChromaDB Indexing",
        misfire_grace_time=300,
    )

    # Cálculo riesgo_pais: cada 12 horas
    scheduler.add_job(
        tarea_calcular_riesgo_pais,
        trigger=IntervalTrigger(hours=12),
        id="riesgo",
        name="Riesgo País",
        misfire_grace_time=600,
    )

    logger.info("GEO Scheduler iniciado. Tareas: osint/2h, acled/03:00, briefing/07:00")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("GEO Scheduler detenido")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )

    if "--scheduler" in sys.argv:
        print("Arrancando GEO Scheduler...")
        start_scheduler()
    elif "--osint" in sys.argv:
        r = tarea_osint()
        print(r)
    elif "--acled" in sys.argv:
        r = tarea_acled()
        print(r)
    elif "--briefing" in sys.argv:
        r = tarea_briefing()
        print(r)
    else:
        # Por defecto: run-now
        run_all(verbose=True)
