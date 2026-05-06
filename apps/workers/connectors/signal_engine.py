"""
Block 2 — Motor de señales políticas.

Reglas de detección que transforman datos crudos del sistema
en señales de inteligencia priorizadas (signal_politeia).

Reglas implementadas:
  R01 — Narrativa de alto riesgo reciente
  R02 — Coordinación inorgánica detectada
  R03 — Legislación de alta urgencia sin leer
  R04 — Toxicidad social elevada en hashtag político
  R05 — Erosión de actor clave en medios
  R06 — Actividad parlamentaria inusual (votaciones críticas)
  R07 — Silencio mediático anómalo de actor relevante
  R08 — Pico de engagement negativo en plataforma
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from observability.logging import get_logger

log = get_logger(__name__)


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────
async def _emit_signal(
    db: AsyncSession,
    *,
    tipo: str,
    urgencia: int,
    titulo: str,
    resumen: str,
    personas: list[str] | None = None,
    orgs: list[str] | None = None,
    modulo: str = "signal_engine",
    url: str = "",
) -> str | None:
    """Inserta una señal nueva si no existe una idéntica activa reciente (24h)."""
    try:
        ex = await db.execute(text("""
            SELECT id FROM signal_politeia
            WHERE titulo = :titulo
              AND tipo = :tipo
              AND activa = true
              AND created_at >= NOW() - INTERVAL '24 hours'
            LIMIT 1
        """), {"titulo": titulo, "tipo": tipo})
        if ex.scalar():
            return None  # ya existe

        r = await db.execute(text("""
            INSERT INTO signal_politeia
                (tipo, urgencia, titulo, resumen, personas, orgs,
                 modulo_origen, url_fuente)
            VALUES
                (:tipo, :urgencia, :titulo, :resumen, :personas, :orgs,
                 :modulo, :url)
            RETURNING id::text
        """), {
            "tipo":     tipo,
            "urgencia": urgencia,
            "titulo":   titulo,
            "resumen":  resumen,
            "personas": personas or [],
            "orgs":     orgs or [],
            "modulo":   modulo,
            "url":      url,
        })
        await db.commit()
        sid = r.scalar()
        log.info(f"[Signal] [{urgencia}★] {titulo}")
        return sid
    except Exception as e:
        await db.rollback()
        log.error(f"Error emitiendo señal '{titulo}': {e}")
        return None


# ──────────────────────────────────────────────────────────────────────
# Reglas individuales
# ──────────────────────────────────────────────────────────────────────
async def rule_r01_narrativa_alto_riesgo(db: AsyncSession) -> int:
    """R01: Narrativas con riesgo >= 7 en las últimas 6h."""
    r = await db.execute(text("""
        SELECT id, titulo, riesgo_narrativo, tipo, n_posts
        FROM narrativa
        WHERE riesgo_narrativo >= 7
          AND fecha_deteccion >= NOW() - INTERVAL '6 hours'
        ORDER BY riesgo_narrativo DESC
        LIMIT 5
    """))
    rows = r.mappings().fetchall()
    count = 0
    for row in rows:
        sid = await _emit_signal(
            db,
            tipo="narrativa_riesgo",
            urgencia=min(int(row["riesgo_narrativo"] / 2), 5),
            titulo=f"Narrativa de riesgo: {row['titulo'][:80]}",
            resumen=(
                f"Narrativa tipo '{row['tipo']}' con riesgo {row['riesgo_narrativo']:.1f}/10 "
                f"y {row['n_posts']} posts detectada en las últimas 6 horas."
            ),
            modulo="narrativa_engine",
        )
        if sid:
            count += 1
    return count


async def rule_r02_coordinacion(db: AsyncSession) -> int:
    """R02: Coordinación inorgánica detectada en posts recientes."""
    r = await db.execute(text("""
        SELECT n.titulo, p.score_coordinacion, p.señales_coordinacion
        FROM propagacion_narrativa p
        JOIN narrativa n ON n.id = p.narrativa_id
        WHERE p.score_coordinacion >= 0.35
          AND p.calculado_en >= NOW() - INTERVAL '12 hours'
        ORDER BY p.score_coordinacion DESC
        LIMIT 3
    """))
    rows = r.mappings().fetchall()
    count = 0
    for row in rows:
        señales = row["señales_coordinacion"] or []
        n_señales = len(señales) if isinstance(señales, list) else 0
        sid = await _emit_signal(
            db,
            tipo="coordinacion_inorganica",
            urgencia=4 if row["score_coordinacion"] >= 0.6 else 3,
            titulo=f"Coordinación detectada en: {row['titulo'][:70]}",
            resumen=(
                f"Score coordinación: {row['score_coordinacion']:.2f}. "
                f"{n_señales} señales de comportamiento inorgánico identificadas."
            ),
            modulo="narrative_engine",
        )
        if sid:
            count += 1
    return count


async def rule_r03_legislacion_urgente(db: AsyncSession) -> int:
    """R03: Legislación con urgencia >= 8 publicada en últimas 48h."""
    r = await db.execute(text("""
        SELECT titulo_corto, score_urgencia_cliente, tipo, estado, fuente
        FROM legislation
        WHERE score_urgencia_cliente >= 8
          AND fecha_publicacion >= NOW() - INTERVAL '48 hours'
        ORDER BY score_urgencia_cliente DESC
        LIMIT 5
    """))
    rows = r.mappings().fetchall()
    count = 0
    for row in rows:
        sid = await _emit_signal(
            db,
            tipo="legislacion_urgente",
            urgencia=min(int(row["score_urgencia_cliente"] / 2), 5),
            titulo=f"Norma urgente [{row['tipo']}]: {(row['titulo_corto'] or '')[:70]}",
            resumen=(
                f"Publicada en {row['fuente']} con urgencia {row['score_urgencia_cliente']:.1f}/10. "
                f"Estado: {row['estado']}."
            ),
            modulo="legislation_monitor",
        )
        if sid:
            count += 1
    return count


async def rule_r04_toxicidad_hashtag(db: AsyncSession) -> int:
    """R04: Hashtags con toxicidad media >= 0.6 en últimas 4h."""
    r = await db.execute(text("""
        SELECT
            jsonb_array_elements_text(hashtags) AS hashtag,
            AVG(toxicidad) AS tox_media,
            COUNT(*) AS n_posts
        FROM social_post
        WHERE ingerido_en >= NOW() - INTERVAL '4 hours'
          AND toxicidad >= 0.4
        GROUP BY hashtag
        HAVING AVG(toxicidad) >= 0.6 AND COUNT(*) >= 5
        ORDER BY tox_media DESC
        LIMIT 5
    """))
    rows = r.mappings().fetchall()
    count = 0
    for row in rows:
        sid = await _emit_signal(
            db,
            tipo="toxicidad_elevada",
            urgencia=3 if row["tox_media"] < 0.8 else 4,
            titulo=f"Toxicidad elevada en #{row['hashtag']}",
            resumen=(
                f"{row['n_posts']} posts con toxicidad media {row['tox_media']:.2f} "
                f"en el hashtag #{row['hashtag']} en las últimas 4 horas."
            ),
            modulo="social_listening",
        )
        if sid:
            count += 1
    return count


async def rule_r05_erosion_actor(db: AsyncSession) -> int:
    """R05: Actor relevante con sentimiento < -0.5 en las últimas 24h."""
    r = await db.execute(text("""
        SELECT pp.nombre_completo, pp.id::text, pp.partido, pp.cargo_actual,
               AVG(sp.sentiment) AS sentiment_medio,
               COUNT(*) AS menciones
        FROM persona_publica pp
        JOIN social_post sp ON sp.texto_norm ILIKE '%' || pp.nombre_norm || '%'
        WHERE sp.ingerido_en >= NOW() - INTERVAL '24 hours'
          AND pp.score_influencia >= 5
        GROUP BY pp.id, pp.nombre_completo, pp.partido, pp.cargo_actual
        HAVING AVG(sp.sentiment) <= -0.5 AND COUNT(*) >= 10
        ORDER BY sentiment_medio ASC
        LIMIT 3
    """))
    rows = r.mappings().fetchall()
    count = 0
    for row in rows:
        sid = await _emit_signal(
            db,
            tipo="erosion_actor",
            urgencia=3,
            titulo=f"Erosión mediática: {row['nombre_completo']}",
            resumen=(
                f"{row['menciones']} menciones con sentimiento medio {row['sentiment_medio']:.2f} "
                f"para {row['nombre_completo']} ({row['cargo_actual'] or row['partido']}) en 24h."
            ),
            personas=[row["id"]],
            modulo="actor_monitor",
        )
        if sid:
            count += 1
    return count


async def rule_r06_votacion_critica(db: AsyncSession) -> int:
    """R06: Votaciones parlamentarias en los próximos 3 días con alta urgencia."""
    r = await db.execute(text("""
        SELECT titulo_corto, estado, score_urgencia_cliente,
               fecha_pleno, grupos_contra
        FROM legislation
        WHERE estado IN ('pleno', 'comision')
          AND score_urgencia_cliente >= 7
          AND fecha_pleno BETWEEN CURRENT_DATE AND CURRENT_DATE + 3
        ORDER BY score_urgencia_cliente DESC
        LIMIT 5
    """))
    rows = r.mappings().fetchall()
    count = 0
    for row in rows:
        grupos_contra = row["grupos_contra"]
        if isinstance(grupos_contra, list) and len(grupos_contra) > 0:
            oposicion = ", ".join(grupos_contra[:3])
        else:
            oposicion = "Grupos en contra por confirmar"

        sid = await _emit_signal(
            db,
            tipo="votacion_parlamentaria",
            urgencia=4,
            titulo=f"Votación crítica: {(row['titulo_corto'] or '')[:65]}",
            resumen=(
                f"Pleno el {row['fecha_pleno']}. "
                f"Urgencia {row['score_urgencia_cliente']:.1f}/10. "
                f"Oposición: {oposicion}."
            ),
            modulo="legislation_monitor",
        )
        if sid:
            count += 1
    return count


async def rule_r07_silencio_anomalo(db: AsyncSession) -> int:
    """R07: Actor de alta influencia sin menciones en últimas 48h (silencio anómalo)."""
    r = await db.execute(text("""
        SELECT pp.id::text, pp.nombre_completo, pp.cargo_actual, pp.score_influencia,
               pp.ultima_mencion_media
        FROM persona_publica pp
        WHERE pp.score_influencia >= 15
          AND (
            pp.ultima_mencion_media IS NULL
            OR pp.ultima_mencion_media < NOW() - INTERVAL '48 hours'
          )
          AND pp.activo = true
        ORDER BY pp.score_influencia DESC
        LIMIT 3
    """))
    rows = r.mappings().fetchall()
    count = 0
    for row in rows:
        sid = await _emit_signal(
            db,
            tipo="silencio_mediatico",
            urgencia=2,
            titulo=f"Silencio mediático: {row['nombre_completo']}",
            resumen=(
                f"{row['nombre_completo']} ({row['cargo_actual'] or ''}) "
                f"con score influencia {row['score_influencia']:.0f} "
                f"sin menciones registradas en las últimas 48 horas."
            ),
            personas=[row["id"]],
            modulo="actor_monitor",
        )
        if sid:
            count += 1
    return count


async def rule_r08_spike_negativo(db: AsyncSession) -> int:
    """R08: Spike de engagement negativo en plataforma en últimas 2h."""
    r = await db.execute(text("""
        SELECT platform,
               COUNT(*) AS n_posts,
               AVG(sentiment) AS sent_medio,
               SUM(n_views + n_shares) AS alcance
        FROM social_post
        WHERE ingerido_en >= NOW() - INTERVAL '2 hours'
          AND sentiment < -0.3
        GROUP BY platform
        HAVING COUNT(*) >= 20
          AND AVG(sentiment) < -0.4
        ORDER BY alcance DESC
        LIMIT 3
    """))
    rows = r.mappings().fetchall()
    count = 0
    for row in rows:
        sid = await _emit_signal(
            db,
            tipo="spike_negativo",
            urgencia=3,
            titulo=f"Spike negativo en {row['platform'].upper()}",
            resumen=(
                f"{row['n_posts']} posts con sentimiento medio {row['sent_medio']:.2f} "
                f"y alcance {row['alcance']:,} en las últimas 2 horas en {row['platform']}."
            ),
            modulo="social_listening",
        )
        if sid:
            count += 1
    return count


# ──────────────────────────────────────────────────────────────────────
# Runner principal
# ──────────────────────────────────────────────────────────────────────
RULES = [
    ("R01", rule_r01_narrativa_alto_riesgo),
    ("R02", rule_r02_coordinacion),
    ("R03", rule_r03_legislacion_urgente),
    ("R04", rule_r04_toxicidad_hashtag),
    ("R05", rule_r05_erosion_actor),
    ("R06", rule_r06_votacion_critica),
    ("R07", rule_r07_silencio_anomalo),
    ("R08", rule_r08_spike_negativo),
]


async def run_signal_engine(db: AsyncSession) -> dict[str, Any]:
    """Ejecuta todas las reglas y retorna estadísticas."""
    stats: dict[str, int] = {}
    total = 0

    for rule_id, rule_fn in RULES:
        try:
            n = await rule_fn(db)
            stats[rule_id] = n
            total += n
        except Exception as e:
            log.error(f"[SignalEngine] Error en {rule_id}: {e}")
            stats[rule_id] = 0

    log.info(f"[SignalEngine] {total} señales emitidas: {stats}")
    return {"total": total, "por_regla": stats}
