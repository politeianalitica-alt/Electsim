"""
Consolidador de Presencia Española en el Mundo.

Unifica los 5 scrapers en un único store JSON/DB con esquema común:
  espana_mundo.json  y tabla `espana_mundo`

Esquema unificado por observacion:
  id, pais_nombre, iso3, categoria, subcategoria, titulo,
  actor_espanol, descripcion, valor, unidad, score_relevancia,
  lat, lon, fuente_url, updated_at

  + campos opcionales por categoría:
    [militar]    efectivos, teatro, marco, estado
    [energetica] tipo_flujo, riesgo_suministro, cuota_pct
    [empresarial] stock_mill_eur, riesgo_inversor
    [diplomatica] nivel_alerta, unidades_diplomaticas
    [diaspora]   residentes, variacion_anual, presion_consular

Entry point: consolidar() → escribe espana_mundo.json + opcionalmente DB
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[3]
_DATA = _ROOT / "dashboard" / "data"
_OUTPUT_FILE = _DATA / "espana_mundo.json"


# ── Conversores por fuente ─────────────────────────────────────────────────────

def _militar_to_presencia(m: dict) -> dict:
    return {
        "id": m["id"],
        "pais_nombre": m["pais"],
        "iso3": m["iso3"],
        "categoria": "militar",
        "subcategoria": m.get("tipo_activo", "unidad_terrestre"),
        "titulo": m["mision"],
        "actor_espanol": m.get("rama", "EMAD"),
        "descripcion": (
            f"{m.get('efectivos', '?')} efectivos. "
            f"Marco: {m.get('marco', '?')}. "
            f"Mandato: {m.get('mandato', '')}. "
            f"Teatro: {m.get('teatro', '')}. "
            f"Estado: {m.get('estado', 'activa')}."
        ),
        "valor": float(m.get("efectivos", 0)),
        "unidad": "efectivos",
        "score_relevancia": float(m.get("criticidad_espana", 0.7)),
        "lat": float(m["lat"]),
        "lon": float(m["lon"]),
        "fuente_url": m.get("fuente_url", "https://www.defensa.gob.es"),
        "updated_at": m.get("updated_at", "2026-01-14T00:00:00Z"),
        # Extra militar
        "teatro": m.get("teatro", ""),
        "marco": m.get("marco", ""),
        "estado_mision": m.get("estado", "activa"),
    }


def _diaspora_to_presencia(d: dict) -> dict:
    from etl.sources.geo.scraper_diaspora_pere import to_presencia_format
    base = to_presencia_format(d)
    base["variacion_anual"] = d.get("variacion_anual", 0)
    base["presion_consular"] = d.get("presion_consular", "media")
    return base


def _energia_to_presencia(e: dict) -> dict:
    from etl.sources.geo.scraper_energia_espana import to_presencia_format
    base = to_presencia_format(e)
    base["tipo_flujo"] = e.get("tipo_flujo", "energia")
    base["riesgo_suministro"] = e.get("riesgo_suministro", 0)
    base["cuota_pct"] = e.get("cuota_pct", 0)
    return base


def _diplomatica_to_presencia(d: dict) -> dict:
    from etl.sources.geo.scraper_red_diplomatica import to_presencia_format
    base = to_presencia_format(d)
    base["nivel_alerta"] = d.get("nivel_alerta", "verde")
    return base


def _empresarial_to_presencia(e: dict) -> dict:
    from etl.sources.geo.scraper_empresas_exterior import to_presencia_format
    base = to_presencia_format(e)
    base["riesgo_inversor"] = e.get("riesgo_inversor", 3.0)
    base["stock_mill_eur"] = e.get("stock_mill_eur", 0)
    return base


# ── Consolidador principal ─────────────────────────────────────────────────────

def consolidar(
    persist_json: bool = True,
    persist_db: bool = False,
) -> list[dict[str, Any]]:
    """
    Carga los 5 scrapers, convierte al formato unificado y escribe espana_mundo.json.

    Returns: lista plana de todas las observaciones.
    """
    all_items: list[dict[str, Any]] = []

    # 1. Militar
    try:
        from etl.sources.geo.scraper_misiones_emad import get_misiones_activas
        misiones = get_misiones_activas(solo_activas=True)
        all_items.extend(_militar_to_presencia(m) for m in misiones)
        logger.info("Militar: %d misiones", len(misiones))
    except Exception as exc:
        logger.error("Scraper misiones EMAD: %s", exc)

    # 2. Diáspora
    try:
        from etl.sources.geo.scraper_diaspora_pere import get_diaspora_by_country
        diaspora = get_diaspora_by_country(min_residentes=5000)
        all_items.extend(_diaspora_to_presencia(d) for d in diaspora)
        logger.info("Diaspora: %d paises", len(diaspora))
    except Exception as exc:
        logger.error("Scraper diaspora PERE: %s", exc)

    # 3. Energía
    try:
        from etl.sources.geo.scraper_energia_espana import get_fuentes_energia
        energia = get_fuentes_energia()
        all_items.extend(_energia_to_presencia(e) for e in energia)
        logger.info("Energia: %d fuentes", len(energia))
    except Exception as exc:
        logger.error("Scraper energia: %s", exc)

    # 4. Diplomática
    try:
        from etl.sources.geo.scraper_red_diplomatica import get_red_diplomatica
        diplomatica = get_red_diplomatica()
        all_items.extend(_diplomatica_to_presencia(d) for d in diplomatica)
        logger.info("Diplomatica: %d paises", len(diplomatica))
    except Exception as exc:
        logger.error("Scraper red diplomatica: %s", exc)

    # 5. Empresarial
    try:
        from etl.sources.geo.scraper_empresas_exterior import get_inversiones_por_pais
        empresas = get_inversiones_por_pais()
        all_items.extend(_empresarial_to_presencia(e) for e in empresas)
        logger.info("Empresarial: %d paises", len(empresas))
    except Exception as exc:
        logger.error("Scraper empresas exterior: %s", exc)

    logger.info("Total observaciones consolidadas: %d", len(all_items))

    if persist_json:
        _DATA.mkdir(parents=True, exist_ok=True)
        payload = {
            "updated_at": datetime.now(tz=timezone.utc).isoformat(),
            "total": len(all_items),
            "items": all_items,
        }
        with open(_OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
        logger.info("Escrito: %s", _OUTPUT_FILE)

    if persist_db:
        _upsert_db(all_items)

    return all_items


def _upsert_db(items: list[dict]) -> int:
    try:
        import psycopg2
        from psycopg2.extras import execute_values
        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            return 0
        with psycopg2.connect(db_url) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS espana_mundo (
                        id              VARCHAR(80) PRIMARY KEY,
                        pais_nombre     TEXT,
                        iso3            CHAR(3),
                        categoria       VARCHAR(30),
                        subcategoria    VARCHAR(80),
                        titulo          TEXT,
                        actor_espanol   TEXT,
                        descripcion     TEXT,
                        valor           NUMERIC(18,2),
                        unidad          VARCHAR(30),
                        score_relevancia NUMERIC(4,2),
                        lat             NUMERIC(8,4),
                        lon             NUMERIC(8,4),
                        fuente_url      TEXT,
                        updated_at      TIMESTAMPTZ,
                        extra_json      JSONB
                    )
                """)
                # Extra campos en JSONB
                rows = []
                _CORE_FIELDS = {
                    "id", "pais_nombre", "iso3", "categoria", "subcategoria",
                    "titulo", "actor_espanol", "descripcion", "valor", "unidad",
                    "score_relevancia", "lat", "lon", "fuente_url", "updated_at",
                }
                for it in items:
                    extra = {k: v for k, v in it.items() if k not in _CORE_FIELDS}
                    rows.append((
                        it.get("id", ""), it.get("pais_nombre", ""),
                        it.get("iso3", ""), it.get("categoria", ""),
                        it.get("subcategoria", ""), it.get("titulo", ""),
                        it.get("actor_espanol", ""), it.get("descripcion", ""),
                        it.get("valor", 0), it.get("unidad", ""),
                        it.get("score_relevancia", 0),
                        it.get("lat", 0), it.get("lon", 0),
                        it.get("fuente_url", ""),
                        it.get("updated_at", datetime.now(tz=timezone.utc).isoformat()),
                        json.dumps(extra, default=str),
                    ))
                execute_values(cur, """
                    INSERT INTO espana_mundo
                        (id, pais_nombre, iso3, categoria, subcategoria, titulo,
                         actor_espanol, descripcion, valor, unidad, score_relevancia,
                         lat, lon, fuente_url, updated_at, extra_json)
                    VALUES %s
                    ON CONFLICT (id) DO UPDATE SET
                        valor            = EXCLUDED.valor,
                        descripcion      = EXCLUDED.descripcion,
                        score_relevancia = EXCLUDED.score_relevancia,
                        updated_at       = EXCLUDED.updated_at,
                        extra_json       = EXCLUDED.extra_json
                """, rows)
                conn.commit()
                return len(rows)
    except Exception as exc:
        logger.error("DB upsert espana_mundo: %s", exc)
        return 0


# ── Lectura del store consolidado ──────────────────────────────────────────────

def load_presencia(
    categoria: str | None = None,
    score_min: float = 0.0,
    max_age_hours: int = 168,
) -> list[dict[str, Any]]:
    """
    Lee espana_mundo.json si existe y es fresco (< max_age_hours).
    Filtra por categoría y score mínimo.
    Falls back to consolidar() si el store es inexistente o obsoleto.
    """
    if _OUTPUT_FILE.exists():
        try:
            age_h = (datetime.now().timestamp() - _OUTPUT_FILE.stat().st_mtime) / 3600
            if age_h <= max_age_hours:
                with open(_OUTPUT_FILE, encoding="utf-8") as f:
                    payload = json.load(f)
                items = payload.get("items", [])
                if categoria:
                    items = [i for i in items if i.get("categoria") == categoria]
                if score_min > 0:
                    items = [i for i in items if i.get("score_relevancia", 0) >= score_min]
                return items
        except Exception as exc:
            logger.warning("load_presencia: error leyendo store: %s", exc)

    # Regenerar
    logger.info("Store ausente/obsoleto — ejecutando consolidar()")
    items = consolidar(persist_json=True)
    if categoria:
        items = [i for i in items if i.get("categoria") == categoria]
    return items


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
    items = consolidar(persist_json=True, persist_db=False)
    cats = {}
    for it in items:
        cats[it["categoria"]] = cats.get(it["categoria"], 0) + 1
    print(f"\nTotal: {len(items)} observaciones")
    for cat, n in sorted(cats.items()):
        print(f"  {cat:15s}: {n:3d}")
    print(f"\nStore: {_OUTPUT_FILE}")
