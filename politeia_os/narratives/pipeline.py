"""
Orquestacion Prefect del pipeline de narrativas (Capa 4).

Flow: narrative-detection-flow
Se ejecuta despues de bloque-3-enriquecimiento.

Pasos:
  1. load_articles       — carga articulos procesados de spain_articles + raw_articles
  2. detect              — BERTopic clustering + matching contra narrativas existentes
  3. enrich_new          — frame, emocion, difusion, territorio, ciclo vital (nuevas)
  4. update_existing     — actualiza metricas de narrativas existentes
  5. write_db            — upsert en narratives, narrative_articles, narrative_actors
  6. flag_coordination   — registra coordinaciones detectadas
  7. log_run             — escribe en narrative_run_log
  8. print_summary       — output estandar
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import uuid

import psycopg  # type: ignore

from .models import DiffusionVector, Narrative, NarrativeActor, NarrativeRunLog
from .detector import detect_narratives
from .frame_extractor import extract_frame
from .emotion_classifier import classify_emotion
from .diffusion_analyzer import analyze_diffusion
from .lifecycle_tracker import compute_lifecycle
from .territory_mapper import map_territory

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prefect — import opcional con comprobacion de compatibilidad runtime
# ---------------------------------------------------------------------------
_PREFECT = False


def flow(fn=None, **_kw):  # type: ignore
    """No-op fallback cuando Prefect no esta disponible o no es compatible."""
    return fn if fn else lambda f: f


def task(fn=None, **_kw):  # type: ignore
    """No-op fallback cuando Prefect no esta disponible o no es compatible."""
    return fn if fn else lambda f: f


def get_run_logger():  # type: ignore
    """No-op fallback para el logger de Prefect."""
    return logging.getLogger(__name__)


try:
    from prefect import flow as _pf_flow, task as _pf_task, get_run_logger as _pf_logger  # type: ignore

    # Test de humo completo: comprobar que @task y @flow funcionan con Pydantic v2
    @_pf_task
    def _pf_task_check() -> None:
        pass

    @_pf_flow
    def _pf_flow_check() -> None:
        pass

    del _pf_task_check, _pf_flow_check

    # Todo OK — activar Prefect real
    flow           = _pf_flow    # type: ignore[assignment]
    task           = _pf_task    # type: ignore[assignment]
    get_run_logger = _pf_logger  # type: ignore[assignment]
    _PREFECT = True
    log.debug("Prefect activado para narrative pipeline")

except Exception as _prefect_exc:
    log.debug("Prefect no disponible o incompatible (%s); usando no-ops", _prefect_exc)


# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

_DB_URL          = os.getenv("DATABASE_URL", "")
_LOOKBACK_HOURS  = int(os.getenv("NARRATIVE_LOOKBACK_HOURS", "48"))
_MAX_ARTICLES    = int(os.getenv("NARRATIVE_MAX_ARTICLES",  "2000"))
_BATCH_SIZE      = int(os.getenv("NARRATIVE_BATCH_SIZE",    "500"))


# ---------------------------------------------------------------------------
# Tareas Prefect
# ---------------------------------------------------------------------------

@task(name="load-narrative-articles", retries=2, retry_delay_seconds=30)
def load_articles(conn) -> list[dict]:
    """Carga articulos procesados de spain_articles y raw_articles en la ventana configurada."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=_LOOKBACK_HOURS)
    articles: list[dict] = []

    try:
        with conn.cursor() as cur:
            # spain_articles
            cur.execute(
                """
                SELECT
                    article_id::text,
                    source_name,
                    title,
                    body,
                    published_at,
                    ccaa,
                    provincia,
                    municipio,
                    scope,
                    nicho,
                    language
                FROM spain_articles
                WHERE processed = TRUE
                  AND published_at >= %s
                ORDER BY published_at DESC
                LIMIT %s
                """,
                (cutoff, _MAX_ARTICLES // 2),
            )
            for row in cur.fetchall():
                articles.append({
                    "article_id":  row[0],
                    "source_name": row[1],
                    "title":       row[2] or "",
                    "body":        row[3] or "",
                    "published_at": row[4],
                    "ccaa":        row[5],
                    "provincia":   row[6],
                    "municipio":   row[7],
                    "scope":       row[8],
                    "nicho":       row[9],
                    "language":    row[10],
                    "country":     "Spain",
                })

            # raw_articles (internacionales)
            cur.execute(
                """
                SELECT
                    article_id::text,
                    source_name,
                    title,
                    body,
                    published_at,
                    country,
                    region,
                    language,
                    tier
                FROM raw_articles
                WHERE processed = TRUE
                  AND published_at >= %s
                ORDER BY published_at DESC
                LIMIT %s
                """,
                (cutoff, _MAX_ARTICLES // 2),
            )
            for row in cur.fetchall():
                articles.append({
                    "article_id":  row[0],
                    "source_name": row[1],
                    "title":       row[2] or "",
                    "body":        row[3] or "",
                    "published_at": row[4],
                    "country":     row[5],
                    "region":      row[6],
                    "language":    row[7],
                    "tier":        row[8],
                    "scope":       "nacional",
                })

    except Exception as exc:
        log.error("Error cargando articulos para narrativas: %s", exc)

    log.info("load_articles: %d articulos cargados (lookback=%dh)", len(articles), _LOOKBACK_HOURS)
    return articles


@task(name="enrich-narrative", retries=1)
def enrich_narrative(cluster_payload: dict) -> Narrative:
    """Aplica todos los enriquecedores a un cluster nuevo para construir la Narrative completa."""
    arts          = cluster_payload["cluster_articles"]
    headlines     = cluster_payload["top_headlines"]
    snippets      = cluster_payload["context_snippets"]
    similarities  = cluster_payload["similarities"]
    centroid      = cluster_payload["centroid"]
    primera       = cluster_payload["primera_deteccion"]

    # 1. Frame
    frame_data = extract_frame(headlines, snippets)

    # 2. Emocion
    emocion, intensidad = classify_emotion(headlines)

    # 3. Difusion
    diffusion = analyze_diffusion(arts, similarities, pico_at=None)

    # 4. Ciclo vital
    lifecycle = compute_lifecycle(arts, primera)
    pico_at   = lifecycle.get("pico_menciones_at")

    # Recalcular velocidad con pico real
    if pico_at:
        diffusion = analyze_diffusion(arts, similarities, pico_at=pico_at)

    # 5. Territorio
    territorio = map_territory(arts)

    # 6. Embedding como lista para almacenar en JSONB/VECTOR
    frame_embedding = centroid.tolist() if centroid is not None else None

    narr = Narrative(
        frame_label       = frame_data["frame_label"],
        frame_tipo        = frame_data["frame_tipo"],
        frame_embedding   = frame_embedding,
        frame_favorecido  = frame_data["frame_favorecido"],
        frame_perjudicado = frame_data["frame_perjudicado"],
        frame_terminos    = frame_data["frame_terminos"],
        emocion_dominante = emocion,
        emocion_intensidad = intensidad,
        diffusion         = diffusion,
        posible_coordinacion = diffusion.posible_coordinacion,
        origen_scope      = diffusion.origen_scope,
        patron_difusion   = diffusion.patron_difusion,
        ciclo_vital       = lifecycle["ciclo_vital"],
        primera_deteccion = primera,
        pico_menciones_at = pico_at,
        menciones_acumuladas = lifecycle["menciones_acumuladas"],
        fuentes_unicas    = lifecycle["fuentes_unicas"],
        dias_activa       = lifecycle["dias_activa"],
        serie_temporal    = lifecycle["serie_temporal"],
        es_nacional       = territorio["es_nacional"],
        activa_en_ccaas   = territorio["activa_en_ccaas"],
        activa_en_provincias = territorio["activa_en_provincias"],
        titulares_representativos = headlines[:5],
        article_ids       = [a.get("article_id", "") for a in arts if a.get("article_id")],
        created_at        = datetime.now(timezone.utc),
        updated_at        = datetime.now(timezone.utc),
    )
    return narr


@task(name="update-narrative-metrics", retries=1)
def update_metrics(cluster_payload: dict, conn) -> Optional[Narrative]:
    """Recalcula ciclo vital y difusion de una narrativa existente."""
    narrative_id = cluster_payload.get("narrative_id")
    if not narrative_id:
        return None

    arts         = cluster_payload["cluster_articles"]
    similarities = cluster_payload["similarities"]
    primera      = cluster_payload["primera_deteccion"]

    # Cargar dias_activa y ciclo_actual de BD
    ciclo_actual = "emergente"
    dias_activa  = 0
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT ciclo_vital, dias_activa FROM narratives WHERE narrative_id = %s",
                (narrative_id,),
            )
            row = cur.fetchone()
            if row:
                ciclo_actual = row[0] or "emergente"
                dias_activa  = row[1] or 0
    except Exception as exc:
        log.warning("Error leyendo narrativa %s: %s", narrative_id, exc)

    lifecycle  = compute_lifecycle(arts, primera, ciclo_actual=ciclo_actual, dias_activa=dias_activa)
    diffusion  = analyze_diffusion(arts, similarities, pico_at=lifecycle.get("pico_menciones_at"))
    territorio = map_territory(arts)

    narr = Narrative(
        narrative_id         = str(narrative_id),
        ciclo_vital          = lifecycle["ciclo_vital"],
        pico_menciones_at    = lifecycle["pico_menciones_at"],
        menciones_acumuladas = lifecycle["menciones_acumuladas"],
        fuentes_unicas       = lifecycle["fuentes_unicas"],
        dias_activa          = lifecycle["dias_activa"],
        serie_temporal       = lifecycle["serie_temporal"],
        posible_coordinacion = diffusion.posible_coordinacion,
        patron_difusion      = diffusion.patron_difusion,
        origen_scope         = diffusion.origen_scope,
        es_nacional          = territorio["es_nacional"],
        activa_en_ccaas      = territorio["activa_en_ccaas"],
        activa_en_provincias = territorio["activa_en_provincias"],
        updated_at           = datetime.now(timezone.utc),
        article_ids          = [a.get("article_id", "") for a in arts if a.get("article_id")],
    )
    return narr


@task(name="write-narrative-to-db", retries=2, retry_delay_seconds=15)
def write_narrative(narr: Narrative, conn, is_new: bool = True) -> None:
    """Inserta o actualiza una narrativa en BD junto con sus articulos."""
    try:
        with conn.cursor() as cur:
            emb_json = json.dumps(narr.frame_embedding) if narr.frame_embedding else None

            if is_new:
                cur.execute(
                    """
                    INSERT INTO narratives (
                        narrative_id, frame_label, frame_embedding,
                        emocion_dominante, emocion_intensidad,
                        origen_scope, patron_difusion, posible_coordinacion,
                        ciclo_vital, primera_deteccion, pico_menciones_at,
                        menciones_acumuladas, fuentes_unicas, dias_activa,
                        es_nacional, activa_en_ccaas, activa_en_provincias,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s::vector,
                        %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s
                    )
                    ON CONFLICT (narrative_id) DO NOTHING
                    """,
                    (
                        narr.narrative_id,
                        narr.frame_label,
                        emb_json,
                        narr.emocion_dominante,
                        narr.emocion_intensidad,
                        narr.origen_scope,
                        narr.patron_difusion,
                        narr.posible_coordinacion,
                        narr.ciclo_vital,
                        narr.primera_deteccion,
                        narr.pico_menciones_at,
                        narr.menciones_acumuladas,
                        narr.fuentes_unicas,
                        narr.dias_activa,
                        narr.es_nacional,
                        narr.activa_en_ccaas,
                        narr.activa_en_provincias,
                        narr.created_at or datetime.now(timezone.utc),
                        narr.updated_at or datetime.now(timezone.utc),
                    ),
                )
            else:
                # Actualizar solo campos de metricas
                cur.execute(
                    """
                    UPDATE narratives SET
                        ciclo_vital          = %s,
                        pico_menciones_at    = %s,
                        menciones_acumuladas = %s,
                        fuentes_unicas       = %s,
                        dias_activa          = %s,
                        posible_coordinacion = %s,
                        patron_difusion      = %s,
                        origen_scope         = %s,
                        es_nacional          = %s,
                        activa_en_ccaas      = %s,
                        activa_en_provincias = %s,
                        updated_at           = %s
                    WHERE narrative_id = %s
                    """,
                    (
                        narr.ciclo_vital,
                        narr.pico_menciones_at,
                        narr.menciones_acumuladas,
                        narr.fuentes_unicas,
                        narr.dias_activa,
                        narr.posible_coordinacion,
                        narr.patron_difusion,
                        narr.origen_scope,
                        narr.es_nacional,
                        narr.activa_en_ccaas,
                        narr.activa_en_provincias,
                        narr.updated_at or datetime.now(timezone.utc),
                        narr.narrative_id,
                    ),
                )

            # Insertar articulos del cluster en narrative_articles
            if narr.article_ids:
                # Determinar cual es el articulo de origen (el mas antiguo)
                for j, article_id in enumerate(narr.article_ids):
                    cur.execute(
                        """
                        INSERT INTO narrative_articles
                            (narrative_id, article_id, similarity, is_origin)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            narr.narrative_id,
                            article_id,
                            0.85,   # similitud por defecto si no se calcula per-articulo
                            j == 0, # el primero es el de origen
                        ),
                    )

        conn.commit()
        log.debug("write_narrative: %s %s", "INSERT" if is_new else "UPDATE", narr.narrative_id)

    except Exception as exc:
        log.error("Error escribiendo narrativa %s: %s", narr.narrative_id, exc)
        try:
            conn.rollback()
        except Exception:
            pass


@task(name="write-run-log", retries=1)
def write_run_log(run_log: NarrativeRunLog, conn) -> None:
    """Escribe el registro de ejecucion en narrative_run_log."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO narrative_run_log
                    (run_id, executed_at, articles_processed,
                     narratives_new, narratives_updated, coordinations_flagged)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    run_log.run_id,
                    run_log.executed_at or datetime.now(timezone.utc),
                    run_log.articles_processed,
                    run_log.narratives_new,
                    run_log.narratives_updated,
                    run_log.coordinations_flagged,
                ),
            )
        conn.commit()
    except Exception as exc:
        log.error("Error escribiendo run_log: %s", exc)
        try:
            conn.rollback()
        except Exception:
            pass


def _print_summary(run_log: NarrativeRunLog, narratives: list[Narrative]) -> None:
    """Imprime el resumen de ejecucion en el formato estandar del sistema."""
    plateau   = sum(1 for n in narratives if n.ciclo_vital == "plateau")
    emergente = sum(1 for n in narratives if n.ciclo_vital == "emergente")

    print("\n\033[1m── Narrativas completado ────────────────────────\033[0m")
    print(f"Artículos procesados    : {run_log.articles_processed}")
    print(f"Narrativas nuevas       : {run_log.narratives_new}")
    print(f"Narrativas actualizadas : {run_log.narratives_updated}")
    print(f"Posibles coordinaciones : {run_log.coordinations_flagged}")
    print(f"Narrativas en plateau   : {plateau}")
    print(f"Narrativas emergentes   : {emergente}")
    print("\033[1m─────────────────────────────────────────────────\033[0m\n")


# ---------------------------------------------------------------------------
# Flow principal
# ---------------------------------------------------------------------------

@flow(name="narrative-detection-flow", log_prints=True)
def narrative_detection_flow():
    """
    Flow Prefect de deteccion y actualizacion de narrativas.

    Se ejecuta al finalizar bloque-3-enriquecimiento.
    Retorna el NarrativeRunLog de la ejecucion.
    """
    run_logger = get_run_logger()
    run_log = NarrativeRunLog(executed_at=datetime.now(timezone.utc))
    all_narratives: list[Narrative] = []

    if not _DB_URL:
        run_logger.error("DATABASE_URL no configurada; abortando narrative flow")
        _print_summary(run_log, [])
        return run_log

    try:
        conn = psycopg.connect(_DB_URL)
    except Exception as exc:
        run_logger.error("No se pudo conectar a BD: %s", exc)
        _print_summary(run_log, [])
        return run_log

    try:
        # 1. Cargar articulos
        articles = load_articles(conn)
        run_log.articles_processed = len(articles)

        if not articles:
            run_logger.info("Sin articulos nuevos para procesar")
            _print_summary(run_log, [])
            return run_log

        # 2. Detectar clusters
        nuevos_clusters, actualizados_clusters = detect_narratives(articles, conn)

        # 3. Enriquecer narrativas nuevas
        narrativas_nuevas: list[Narrative] = []
        for cluster in nuevos_clusters:
            try:
                narr = enrich_narrative(cluster)
                narrativas_nuevas.append(narr)
            except Exception as exc:
                run_logger.warning("Error enriqueciendo cluster nuevo: %s", exc)

        # 4. Actualizar narrativas existentes
        narrativas_actualizadas: list[Narrative] = []
        for cluster in actualizados_clusters:
            try:
                narr = update_metrics(cluster, conn)
                if narr:
                    narrativas_actualizadas.append(narr)
            except Exception as exc:
                run_logger.warning("Error actualizando cluster: %s", exc)

        # 5. Escribir en BD
        for narr in narrativas_nuevas:
            write_narrative(narr, conn, is_new=True)

        for narr in narrativas_actualizadas:
            write_narrative(narr, conn, is_new=False)

        # 6. Contabilizar coordinaciones
        run_log.narratives_new       = len(narrativas_nuevas)
        run_log.narratives_updated   = len(narrativas_actualizadas)
        run_log.coordinations_flagged = sum(
            1 for n in (narrativas_nuevas + narrativas_actualizadas)
            if n.posible_coordinacion
        )
        all_narratives = narrativas_nuevas + narrativas_actualizadas

        # 7. Log de ejecucion
        write_run_log(run_log, conn)

    except Exception as exc:
        run_logger.error("Error critico en narrative_detection_flow: %s", exc)
    finally:
        try:
            conn.close()
        except Exception:
            pass

    # 8. Resumen
    _print_summary(run_log, all_narratives)
    return run_log


# ---------------------------------------------------------------------------
# Interfaz publica para Bloque 3 (briefing_generator)
# ---------------------------------------------------------------------------

def get_active_narratives(
    limit: int = 10,
    hours: int = 24,
) -> list[dict]:
    """
    Retorna las narrativas mas activas en las ultimas `hours` horas.

    Uso en briefing_generator.py:
        from politeia_os.narratives.pipeline import get_active_narratives
        narratives = get_active_narratives(limit=3, hours=24)

    Returns:
        Lista de dicts con claves: frame_label, emocion_dominante,
        menciones_acumuladas, ciclo_vital, activa_en_ccaas, es_nacional,
        posible_coordinacion, primera_deteccion.
    """
    if not _DB_URL:
        return []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    results: list[dict] = []
    try:
        with psycopg.connect(_DB_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        narrative_id::text,
                        frame_label,
                        emocion_dominante,
                        emocion_intensidad,
                        menciones_acumuladas,
                        ciclo_vital,
                        activa_en_ccaas,
                        activa_en_provincias,
                        es_nacional,
                        posible_coordinacion,
                        patron_difusion,
                        primera_deteccion,
                        updated_at
                    FROM narratives
                    WHERE updated_at >= %s
                    ORDER BY menciones_acumuladas DESC
                    LIMIT %s
                    """,
                    (cutoff, limit),
                )
                for row in cur.fetchall():
                    results.append({
                        "narrative_id":       row[0],
                        "frame_label":        row[1],
                        "emocion_dominante":  row[2],
                        "emocion_intensidad": row[3],
                        "menciones_acumuladas": row[4],
                        "ciclo_vital":        row[5],
                        "activa_en_ccaas":    row[6] or [],
                        "activa_en_provincias": row[7] or [],
                        "es_nacional":        row[8],
                        "posible_coordinacion": row[9],
                        "patron_difusion":    row[10],
                        "primera_deteccion":  row[11],
                        "updated_at":         row[12],
                    })
    except Exception as exc:
        log.warning("get_active_narratives error: %s", exc)
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    narrative_detection_flow()
