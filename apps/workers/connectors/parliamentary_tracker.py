"""
Block 4 — Tracker de trazabilidad parlamentaria.

Sigue el ciclo de vida completo de cada iniciativa legislativa:
presentación → comisión → pleno → aprobación/rechazo → publicación BOE.
Scraping de congreso.es + senado.es + análisis de votaciones con LLM.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, timezone
from typing import Any

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from observability.logging import get_logger

log = get_logger(__name__)

CONGRESO_BASE   = "https://www.congreso.es"
SENADO_BASE     = "https://www.senado.es"
CONGRESO_OPENDATA = f"{CONGRESO_BASE}/opendata/votaciones"
OLLAMA_BASE     = "http://localhost:11434"
OLLAMA_MODEL    = "llama3.2:3b"

# ──────────────────────────────────────────────────────────────────────
# Prompt de votaciones
# ──────────────────────────────────────────────────────────────────────
VOTACIONES_PROMPT = """\
Analiza este extracto de votación parlamentaria española:
{texto}

Extrae en JSON:
{{
  "votos_favor": 0,
  "votos_contra": 0,
  "votos_abstencion": 0,
  "grupos_favor": ["PSOE", "Sumar"],
  "grupos_contra": ["PP", "Vox"],
  "grupos_abstencion": ["PNV"],
  "aprobada": false,
  "mayoria_tipo": "simple"
}}
"""


async def _extract_vote_data(texto: str) -> dict[str, Any]:
    """Extrae datos de votación con LLM."""
    try:
        async with httpx.AsyncClient(timeout=30, base_url=OLLAMA_BASE) as c:
            r = await c.post("/api/generate", json={
                "model":  OLLAMA_MODEL,
                "prompt": VOTACIONES_PROMPT.format(texto=texto[:1500]),
                "format": "json",
                "stream": False,
            })
            return json.loads(r.json().get("response", "{}"))
    except Exception as e:
        log.warning(f"Error extrayendo votos: {e}")
        return {}


# ──────────────────────────────────────────────────────────────────────
# Actualización de estados
# ──────────────────────────────────────────────────────────────────────
async def update_legislation_state(
    leg_id: int,
    nuevo_estado: str,
    fecha: date,
    descripcion: str,
    db: AsyncSession,
    votos: dict | None = None,
) -> bool:
    """
    Actualiza el estado de tramitación de una norma
    y registra el cambio en el historial.
    """
    try:
        r = await db.execute(
            text("SELECT estado FROM legislation WHERE id = :id"),
            {"id": leg_id},
        )
        row = r.fetchone()
        estado_anterior = row[0] if row else None

        # Registrar en historial
        await db.execute(text("""
            INSERT INTO legislation_estado_historia
                (legislation_id, estado_anterior, estado_nuevo,
                 fecha, descripcion, votos_favor, votos_contra,
                 grupos_favor, grupos_contra)
            VALUES
                (:lid, :est_ant, :est_nue,
                 :fecha, :desc,
                 :vf, :vc, :gf::jsonb, :gc::jsonb)
        """), {
            "lid":     leg_id,
            "est_ant": estado_anterior,
            "est_nue": nuevo_estado,
            "fecha":   fecha,
            "desc":    descripcion,
            "vf":      (votos or {}).get("votos_favor"),
            "vc":      (votos or {}).get("votos_contra"),
            "gf":      json.dumps((votos or {}).get("grupos_favor", [])),
            "gc":      json.dumps((votos or {}).get("grupos_contra", [])),
        })

        # Actualizar tabla principal
        base_params = {"estado": nuevo_estado, "id": leg_id}
        if nuevo_estado == "comision":
            await db.execute(
                text("UPDATE legislation SET estado=:estado, fecha_comision=:f, actualizado_en=NOW() WHERE id=:id"),
                {**base_params, "f": fecha},
            )
        elif nuevo_estado in ("pleno", "aprobado"):
            await db.execute(
                text("UPDATE legislation SET estado=:estado, fecha_pleno=:f, actualizado_en=NOW() WHERE id=:id"),
                {**base_params, "f": fecha},
            )
            if votos:
                await db.execute(text("""
                    UPDATE legislation SET
                        votos_favor      = :vf,
                        votos_contra     = :vc,
                        votos_abstencion = :va,
                        grupos_favor     = :gf::jsonb,
                        grupos_contra    = :gc::jsonb
                    WHERE id = :id
                """), {
                    "vf": votos.get("votos_favor"),
                    "vc": votos.get("votos_contra"),
                    "va": votos.get("votos_abstencion"),
                    "gf": json.dumps(votos.get("grupos_favor", [])),
                    "gc": json.dumps(votos.get("grupos_contra", [])),
                    "id": leg_id,
                })
        else:
            await db.execute(
                text("UPDATE legislation SET estado=:estado, actualizado_en=NOW() WHERE id=:id"),
                base_params,
            )

        await db.commit()
        log.info(f"Legislación {leg_id}: {estado_anterior} → {nuevo_estado} ({fecha})")
        return True

    except Exception as e:
        await db.rollback()
        log.error(f"Error actualizando estado legislación {leg_id}: {e}")
        return False


# ──────────────────────────────────────────────────────────────────────
# Scraping de votaciones del Congreso
# ──────────────────────────────────────────────────────────────────────
async def scrape_congreso_votaciones(
    fecha_desde: date,
    fecha_hasta: date,
    db: AsyncSession,
) -> dict:
    """
    Descarga votaciones del Congreso vía OpenData y actualiza la BD.
    """
    stats = {"votaciones_encontradas": 0, "normas_actualizadas": 0}
    url = (
        f"{CONGRESO_OPENDATA}"
        f"?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}&format=json"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(url)
            if r.status_code != 200:
                log.warning(f"Congreso opendata status {r.status_code}")
                return stats

            data = r.json()
            votaciones = data if isinstance(data, list) else data.get("votaciones", [])
            stats["votaciones_encontradas"] = len(votaciones)

            for vot in votaciones:
                titulo_norm = vot.get("asunto", "").lower()
                if not titulo_norm:
                    continue

                r2 = await db.execute(text("""
                    SELECT id FROM legislation
                    WHERE LOWER(titulo) SIMILAR TO :patron
                       OR numero_expediente = :exp
                    LIMIT 1
                """), {
                    "patron": f"%{titulo_norm[:50]}%",
                    "exp":    vot.get("expediente", ""),
                })
                row = r2.fetchone()
                if row:
                    votos = {
                        "votos_favor":      int(vot.get("si", 0)),
                        "votos_contra":     int(vot.get("no", 0)),
                        "votos_abstencion": int(vot.get("abstenciones", 0)),
                        "grupos_favor":     vot.get("grupos_si", []),
                        "grupos_contra":    vot.get("grupos_no", []),
                    }
                    nuevo_estado = "aprobado" if vot.get("aprobada") else "pleno"
                    await update_legislation_state(
                        leg_id=row[0],
                        nuevo_estado=nuevo_estado,
                        fecha=date.fromisoformat(vot.get("fecha", str(date.today()))),
                        descripcion=f"Votación en pleno: {vot.get('asunto', '')}",
                        db=db,
                        votos=votos,
                    )
                    stats["normas_actualizadas"] += 1

    except Exception as e:
        log.error(f"Error scraping votaciones: {e}")

    return stats


# ──────────────────────────────────────────────────────────────────────
# Scraping de iniciativas en tramitación
# ──────────────────────────────────────────────────────────────────────
async def scrape_congreso_iniciativas(db: AsyncSession) -> dict:
    """
    Extrae iniciativas legislativas en tramitación de congreso.es.
    """
    stats = {"encontradas": 0, "nuevas": 0}
    url = f"{CONGRESO_BASE}/busqueda-de-iniciativas"

    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(url, params={"_type": "json", "estado": "en_tramite", "rows": 50})
            if r.status_code != 200:
                return stats

            # Intentar parsear JSON
            try:
                data = r.json()
                iniciativas = data.get("items", [])
            except Exception:
                # Fallback HTML scraping
                iniciativas = _parse_congreso_html(r.text)

            stats["encontradas"] = len(iniciativas)

            for ini in iniciativas:
                titulo = ini.get("titulo") or ini.get("asunto", "")
                if not titulo:
                    continue

                ex = await db.execute(
                    text("SELECT id FROM legislation WHERE titulo = :t OR numero_expediente = :e"),
                    {"t": titulo, "e": ini.get("numero_expediente", "")},
                )
                if ex.scalar():
                    continue

                await db.execute(text("""
                    INSERT INTO legislation (
                        tipo, titulo, titulo_corto, numero_expediente,
                        fuente, estado, fecha_presentacion
                    ) VALUES (
                        'proposicion_ley', :titulo, :titulo_corto, :exp,
                        'CONGRESO', 'en_tramite', :fecha
                    ) ON CONFLICT DO NOTHING
                """), {
                    "titulo":       titulo,
                    "titulo_corto": titulo[:120],
                    "exp":          ini.get("numero_expediente", ""),
                    "fecha":        ini.get("fecha_presentacion") or date.today().isoformat(),
                })
                stats["nuevas"] += 1

            await db.commit()

    except Exception as e:
        log.error(f"Error scraping iniciativas: {e}")

    return stats


def _parse_congreso_html(html: str) -> list[dict]:
    """Extrae iniciativas de la tabla HTML del Congreso."""
    out: list[dict] = []
    try:
        soup = BeautifulSoup(html, "html.parser")
        for row in soup.select("table.tabla tr")[1:20]:
            cols = row.find_all("td")
            if len(cols) >= 3:
                out.append({
                    "numero_expediente": cols[0].get_text(strip=True),
                    "titulo":            cols[1].get_text(strip=True),
                    "fecha_presentacion": cols[2].get_text(strip=True),
                })
    except Exception:
        pass
    return out


# ──────────────────────────────────────────────────────────────────────
# Query: normas en tramitación
# ──────────────────────────────────────────────────────────────────────
async def fetch_normas_en_tramite(db: AsyncSession) -> list[dict]:
    """Devuelve normas actualmente en tramitación parlamentaria."""
    r = await db.execute(text("""
        SELECT id, titulo_corto, tipo, estado, fuente,
               fecha_presentacion, fecha_comision, fecha_pleno,
               score_urgencia_cliente, sectores_afectados
        FROM legislation
        WHERE estado NOT IN ('publicado', 'rechazado', 'retirado', 'derogado')
        ORDER BY score_urgencia_cliente DESC, fecha_presentacion DESC
        LIMIT 100
    """))
    return [dict(row) for row in r.mappings()]
