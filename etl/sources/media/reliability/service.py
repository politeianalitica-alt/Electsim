"""Servicio media_reliability · MBFC dataset · Sprint 2 · S2.3.

Provee 3 funciones publicas:
  - load_mbfc_csv(path)       · idempotente · carga el dataset MBFC en BD
  - get_reliability(host)      · cache · devuelve bias + factual_reporting
  - enrich_with_reliability(items) · rellena media_bias/media_factuality

Falla cerrado: si la BD no esta disponible (tests sin engine), las funciones
devuelven None / [] sin romper el pipeline.

Coste de lookup:
  - En memoria: O(1) tras primera carga (cache global)
  - BD: 1 SELECT con index unico sobre source
  - Sin host conocido: None (no penaliza, no llena BD)
"""
from __future__ import annotations

import csv
import logging
from functools import lru_cache
from typing import Any, Iterable
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# Acceso al engine global · graceful sin BD (tests)
# ────────────────────────────────────────────────────────────────────

def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.debug("media_reliability.service: no engine · %s", exc)
        return None


# ────────────────────────────────────────────────────────────────────
# Carga del dataset MBFC (idempotente)
# ────────────────────────────────────────────────────────────────────

def load_mbfc_csv(csv_path: str | None = None) -> dict[str, int]:
    """Carga el CSV MBFC en la tabla media_reliability.

    Idempotente: UPSERT por source. Llamar 2 veces no duplica filas.

    Args:
      csv_path: ruta al CSV. None → usa data/media_reliability/mbfc.csv

    Returns:
      {"loaded": int, "errors": int, "skipped": int}
    """
    if csv_path is None:
        from pathlib import Path
        # Path relativo al root del proyecto
        candidates = [
            Path("data/media_reliability/mbfc.csv"),
            Path(__file__).parent.parent.parent.parent.parent / "data" / "media_reliability" / "mbfc.csv",
        ]
        for c in candidates:
            if c.exists():
                csv_path = str(c)
                break
        else:
            return {"loaded": 0, "errors": 0, "skipped": 0, "error": "CSV no encontrado"}

    engine = _get_engine()
    if engine is None:
        return {"loaded": 0, "errors": 0, "skipped": 0, "error": "no engine"}

    from sqlalchemy import text

    loaded = 0
    errors = 0
    skipped = 0

    try:
        with engine.begin() as conn:
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    source = (row.get("source") or "").strip().lower()
                    bias = (row.get("bias") or "").strip().lower()
                    fact = (row.get("factual_reporting") or "").strip().lower()
                    if not source or not bias or not fact:
                        skipped += 1
                        continue
                    try:
                        conn.execute(text("""
                            INSERT INTO media_reliability (source, bias, factual_reporting, dataset)
                            VALUES (:source, :bias, :fact, 'mbfc')
                            ON CONFLICT (source) DO UPDATE SET
                              bias = EXCLUDED.bias,
                              factual_reporting = EXCLUDED.factual_reporting,
                              updated_at = NOW()
                        """), {"source": source, "bias": bias, "fact": fact})
                        loaded += 1
                    except Exception as exc:
                        logger.debug("load_mbfc row error %s · %s", source, exc)
                        errors += 1
    except Exception as exc:
        logger.error("load_mbfc_csv · %s", exc)
        return {"loaded": loaded, "errors": errors + 1, "skipped": skipped, "error": str(exc)}

    logger.info("MBFC cargado: %d filas (%d errores, %d skipped)", loaded, errors, skipped)
    return {"loaded": loaded, "errors": errors, "skipped": skipped}


# ────────────────────────────────────────────────────────────────────
# Helpers de URL → host
# ────────────────────────────────────────────────────────────────────

def extract_host(url: str) -> str:
    """Extrae el host de una URL. Normaliza www. y lowercase.

    Ejemplos:
      'https://www.elpais.com/politica/...'  → 'elpais.com'
      'http://abc.es/'                        → 'abc.es'
      'elpais.com'                            → 'elpais.com'
      ''                                      → ''
    """
    if not url:
        return ""
    url = url.strip().lower()
    # Si no tiene scheme, lo asumimos http para parsear
    if "://" not in url:
        url = "http://" + url
    try:
        host = urlparse(url).hostname or ""
        if host.startswith("www."):
            host = host[4:]
        return host
    except Exception:
        return ""


# ────────────────────────────────────────────────────────────────────
# Lookup
# ────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=4096)
def get_reliability(host_or_url: str) -> dict[str, str] | None:
    """Devuelve {bias, factual_reporting} para un host/URL · None si no existe.

    Cache en memoria · cada host se consulta 1 vez por proceso.

    Returns:
      {"source": "elpais.com", "bias": "left-center", "factual_reporting": "high"}
      None si el host no está en MBFC
    """
    if not host_or_url:
        return None
    host = extract_host(host_or_url)
    if not host:
        return None

    engine = _get_engine()
    if engine is None:
        return None

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text("""
                SELECT source, bias, factual_reporting
                FROM media_reliability
                WHERE source = :host
                LIMIT 1
            """), {"host": host}).first()
            if row is None:
                return None
            return {
                "source": row[0],
                "bias": row[1],
                "factual_reporting": row[2],
            }
    except Exception as exc:
        logger.debug("get_reliability · %s · %s", host, exc)
        return None


# ────────────────────────────────────────────────────────────────────
# Enrichment helper para pipelines
# ────────────────────────────────────────────────────────────────────

def enrich_with_reliability(items: Iterable[Any]) -> list[Any]:
    """Rellena media_bias y media_factuality en EnrichedItem.payload.

    Para cada item:
      1. Extrae host de item.url (o item.payload.url si url=None)
      2. Busca en media_reliability
      3. Si match · añade a item.payload: {media_bias, media_factuality}

    Falla cerrado: si BD no disponible o host no en MBFC, no toca el item.
    """
    items_list = list(items)
    for item in items_list:
        url = ""
        if hasattr(item, "url") and getattr(item, "url"):
            url = str(getattr(item, "url"))
        elif hasattr(item, "payload") and isinstance(getattr(item, "payload"), dict):
            url = str(item.payload.get("url", ""))
        if not url:
            continue

        rel = get_reliability(url)
        if rel is None:
            continue

        # Persistir en payload sin sobreescribir si ya existe
        if hasattr(item, "payload") and isinstance(item.payload, dict):
            item.payload.setdefault("media_bias", rel["bias"])
            item.payload.setdefault("media_factuality", rel["factual_reporting"])
            item.payload.setdefault("media_reliability_source", rel["source"])

        # Trace
        if hasattr(item, "enrichment_trace") and isinstance(item.enrichment_trace, list):
            item.enrichment_trace.append("mbfc")

    return items_list
