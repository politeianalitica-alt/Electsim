"""
Ingesta de iniciativas y votaciones del Congreso de los Diputados.
Popula las tablas parliamentary_initiative y parliamentary_vote (migración 0013).

Uso:
    python -m etl.institucional.congreso_iniciativas                  # tipo default
    python -m etl.institucional.congreso_iniciativas --tipos ppl pnl  # tipos concretos
    python -m etl.institucional.congreso_iniciativas --dry
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Optional

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

try:
    import requests
    _REQ_OK = True
except ImportError:
    _REQ_OK = False

from etl.logger import get_logger  # noqa: E402

log = get_logger("congreso_iniciativas")

# ── Config ─────────────────────────────────────────────────────────────────────

CONGRESO_API     = "https://www.congreso.es/opendata/api"
LEGISLATURA      = 15
_HEADERS         = {"User-Agent": "ElectSim/1.0 (research; contact: info@politeria.es)"}
_RATE_LIMIT_S    = 1.0   # segundos entre peticiones para no saturar la API

# Tipos de iniciativa disponibles en la API del Congreso
TIPOS_INICIATIVA = [
    "proposicion-ley",    # PPL — Proposición de Ley
    "proyecto-ley",       # PL  — Proyecto de Ley (gobierno)
    "proposicion-no-ley", # PNL — Proposición No de Ley
    "mocion",             # MOCI
    "interpelacion",      # INTER
    "pregunta-oral",      # PREG
]

TIPO_CODE_MAP: dict[str, str] = {
    "proposicion-ley":    "PPL",
    "proyecto-ley":       "PL",
    "proposicion-no-ley": "PNL",
    "mocion":             "MOCI",
    "interpelacion":      "INTER",
    "pregunta-oral":      "PREG",
    "pregunta-escrita":   "PRESC",
    "enmienda":           "ENMI",
}

GRUPO_PARTIDO: dict[str, str] = {
    "Partido Popular": "PP",
    "Grupo Parlamentario Popular en el Congreso": "PP",
    "Socialista": "PSOE",
    "Grupo Parlamentario Socialista": "PSOE",
    "Vox": "VOX",
    "Grupo Parlamentario VOX": "VOX",
    "Sumar": "SUMAR",
    "Junts": "JUNTS",
    "ERC": "ERC",
    "Esquerra Republicana": "ERC",
    "Bildu": "BILDU",
    "EH Bildu": "BILDU",
    "PNV": "PNV",
    "Euzko Alderdi Jeltzalea-Partido Nacionalista Vasco": "PNV",
    "Coalición Canaria": "CC",
    "BNG": "BNG",
    "Mixto": "OTROS",
}

STATUS_MAP: dict[str, str] = {
    "registrada":    "REGISTERED",
    "admitida":      "ADMITTED",
    "comisión":      "IN_COMMISSION",
    "comision":      "IN_COMMISSION",
    "pleno":         "IN_PLENARY",
    "aprobada":      "APPROVED",
    "rechazada":     "REJECTED",
    "retirada":      "WITHDRAWN",
    "caducada":      "WITHDRAWN",
}

RESULT_MAP: dict[str, str] = {
    "aprobad": "APROBADA",
    "rechazad": "RECHAZADA",
    "retir": "RETIRADA",
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _partido(grupo: str) -> str:
    for k, v in GRUPO_PARTIDO.items():
        if k.lower() in grupo.lower():
            return v
    return "OTROS"


def _parse_date(raw: str | None) -> Optional[str]:
    if not raw:
        return None
    s = str(raw).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s[:19], fmt).date().isoformat()
        except ValueError:
            continue
    return s[:10] if len(s) >= 10 else None


def _content_hash(*parts: str) -> str:
    blob = "|".join(str(p).lower().strip() for p in parts)
    return hashlib.sha256(blob.encode()).hexdigest()


def _map_status(raw: str) -> str:
    r = raw.lower()
    for k, v in STATUS_MAP.items():
        if k in r:
            return v
    return "REGISTERED"


def _map_result(raw: str) -> Optional[str]:
    r = raw.lower()
    for k, v in RESULT_MAP.items():
        if k in r:
            return v
    return None


# ── Fetch ──────────────────────────────────────────────────────────────────────

def fetch_iniciativas(tipo: str, legislatura: int = LEGISLATURA, n: int = 200) -> list[dict]:
    """Llama a la API del Congreso y devuelve lista de iniciativas raw."""
    if not _REQ_OK:
        log.warning("requests no disponible")
        return []
    url = f"{CONGRESO_API}/iniciativas"
    params = {"legislatura": legislatura, "tipo": tipo, "limit": n, "format": "json"}
    try:
        r = requests.get(url, params=params, headers=_HEADERS, timeout=30)
        if r.status_code != 200:
            log.warning("congreso_api status=%d tipo=%s", r.status_code, tipo)
            return []
        data = r.json()
        return data.get("iniciativas", data) if isinstance(data, dict) else data
    except Exception as exc:
        log.warning("congreso_api_error tipo=%s err=%s", tipo, exc)
        return []


def fetch_votaciones(legislatura: int = LEGISLATURA, n: int = 300) -> list[dict]:
    """Llama a la API del Congreso y devuelve lista de votaciones raw."""
    if not _REQ_OK:
        return []
    url = f"{CONGRESO_API}/votaciones"
    params = {"legislatura": legislatura, "limit": n, "format": "json"}
    try:
        r = requests.get(url, params=params, headers=_HEADERS, timeout=30)
        if r.status_code != 200:
            log.warning("congreso_votaciones status=%d", r.status_code)
            return []
        data = r.json()
        return data.get("votaciones", data) if isinstance(data, dict) else data
    except Exception as exc:
        log.warning("congreso_votaciones_error err=%s", exc)
        return []


# ── Upsert ─────────────────────────────────────────────────────────────────────

def upsert_iniciativas(items: list[dict], tipo: str, conn) -> int:
    """Inserta/actualiza iniciativas en parliamentary_initiative."""
    from sqlalchemy import text as sa_text

    sql = sa_text("""
        INSERT INTO parliamentary_initiative
            (chamber, legislatura, initiative_type, title, summary,
             proponent_party, proponent_actor, submitted_at, status,
             last_stage_at, url_congreso, relevancia_score)
        VALUES
            ('congreso', :legislatura, :initiative_type, :title, :summary,
             :proponent_party, :proponent_actor,
             :submitted_at::date,
             :status,
             :last_stage_at::date,
             :url_congreso, :relevancia_score)
        ON CONFLICT (url_congreso) DO UPDATE SET
            status        = EXCLUDED.status,
            last_stage_at = COALESCE(EXCLUDED.last_stage_at, parliamentary_initiative.last_stage_at),
            summary       = COALESCE(EXCLUDED.summary, parliamentary_initiative.summary)
        RETURNING (xmax = 0) AS inserted
    """)

    code = TIPO_CODE_MAP.get(tipo, tipo.upper()[:5])
    inserted = 0
    with conn.begin():
        for item in items:
            grupo   = str(item.get("grupoParlamentario") or item.get("grupo") or "")
            partido = _partido(grupo)
            actor   = str(item.get("autor") or item.get("diputado") or "")[:200]
            titulo  = str(item.get("titulo") or item.get("descripcion") or "")[:500]
            if not titulo:
                continue
            estado_raw = str(item.get("estado") or item.get("situacion") or "registrada")
            status     = _map_status(estado_raw)
            fecha_sub  = _parse_date(item.get("fechaIniciativa") or item.get("fecha"))
            fecha_last = _parse_date(item.get("fechaUltimoTramite") or item.get("fechaEstado"))
            url        = str(item.get("url") or item.get("urlExpediente") or "")[:600] or None

            # Relevancia heurística según tipo
            score = {"PPL": 75, "PL": 85, "PNL": 55, "MOCI": 65, "INTER": 60, "PREG": 40}.get(code, 50)

            try:
                result = conn.execute(sql, {
                    "legislatura":      LEGISLATURA,
                    "initiative_type":  code,
                    "title":            titulo,
                    "summary":          None,
                    "proponent_party":  partido,
                    "proponent_actor":  actor or None,
                    "submitted_at":     fecha_sub or date.today().isoformat(),
                    "status":           status,
                    "last_stage_at":    fecha_last or fecha_sub or date.today().isoformat(),
                    "url_congreso":     url,
                    "relevancia_score": score,
                })
                row = result.fetchone()
                if row and row[0]:
                    inserted += 1
            except Exception as exc:
                log.debug("skip_init err=%s titulo=%s", exc, titulo[:60])
    return inserted


def upsert_votaciones(items: list[dict], conn) -> int:
    """Inserta/actualiza votaciones en parliamentary_vote."""
    from sqlalchemy import text as sa_text

    sql = sa_text("""
        INSERT INTO parliamentary_vote
            (chamber, legislatura, session_date, vote_type, title, result,
             votos_favor, votos_contra, abstenciones,
             parties_favor_json, parties_against_json,
             topic, content_hash)
        VALUES
            ('congreso', :legislatura, :session_date::date, :vote_type, :title, :result,
             :votos_favor, :votos_contra, :abstenciones,
             :parties_favor_json, :parties_against_json,
             :topic, :content_hash)
        ON CONFLICT (content_hash) DO UPDATE SET
            result         = COALESCE(EXCLUDED.result, parliamentary_vote.result),
            votos_favor    = COALESCE(EXCLUDED.votos_favor, parliamentary_vote.votos_favor),
            votos_contra   = COALESCE(EXCLUDED.votos_contra, parliamentary_vote.votos_contra),
            abstenciones   = COALESCE(EXCLUDED.abstenciones, parliamentary_vote.abstenciones)
        RETURNING (xmax = 0) AS inserted
    """)

    inserted = 0
    with conn.begin():
        for item in items:
            titulo = str(item.get("titulo") or item.get("asunto") or "")[:500]
            if not titulo:
                continue
            fecha     = _parse_date(item.get("fecha") or item.get("fechaVotacion"))
            tipo_v    = str(item.get("tipoVotacion") or item.get("tipo") or "PNL")[:20]
            resultado_raw = str(item.get("resultado") or "")
            resultado = _map_result(resultado_raw)
            favor     = int(item.get("votosFavor") or item.get("votos_favor") or 0)
            contra    = int(item.get("votosContra") or item.get("votos_contra") or 0)
            abstn     = int(item.get("abstenciones") or 0)

            # Partidos a favor/contra: la API puede enviarlos en diferentes campos
            try:
                p_favor = json.dumps(item.get("gruposFavor") or [], ensure_ascii=False)
            except Exception:
                p_favor = "[]"
            try:
                p_contra = json.dumps(item.get("gruposContra") or [], ensure_ascii=False)
            except Exception:
                p_contra = "[]"

            chash = _content_hash(titulo, fecha or "", str(favor), str(contra))

            try:
                result = conn.execute(sql, {
                    "legislatura":          LEGISLATURA,
                    "session_date":         fecha or date.today().isoformat(),
                    "vote_type":            tipo_v,
                    "title":                titulo,
                    "result":               resultado,
                    "votos_favor":          favor,
                    "votos_contra":         contra,
                    "abstenciones":         abstn,
                    "parties_favor_json":   p_favor,
                    "parties_against_json": p_contra,
                    "topic":                None,
                    "content_hash":         chash,
                })
                row = result.fetchone()
                if row and row[0]:
                    inserted += 1
            except Exception as exc:
                log.debug("skip_vote err=%s titulo=%s", exc, titulo[:60])
    return inserted


# ── CLI ────────────────────────────────────────────────────────────────────────

def main(tipos: list[str] | None = None, dry: bool = False) -> None:
    tipos_run = tipos or TIPOS_INICIATIVA

    log.info("congreso_iniciativas start tipos=%s dry=%s", tipos_run, dry)

    all_iniciativas: list[tuple[str, list[dict]]] = []
    for tipo in tipos_run:
        items = fetch_iniciativas(tipo)
        log.info("  tipo=%s fetched=%d", tipo, len(items))
        all_iniciativas.append((tipo, items))
        time.sleep(_RATE_LIMIT_S)

    votaciones = fetch_votaciones()
    log.info("votaciones fetched=%d", len(votaciones))

    if dry:
        print("=== INICIATIVAS (muestra) ===")
        for tipo, items in all_iniciativas:
            print(f"  [{tipo}] → {len(items)} items")
            for it in items[:2]:
                print(f"      · {str(it.get('titulo',''))[:70]}")
        print(f"\n=== VOTACIONES: {len(votaciones)} items ===")
        for v in votaciones[:3]:
            print(f"  · {str(v.get('titulo',''))[:70]} | {v.get('resultado','')}")
        return

    try:
        from dashboard.db import get_engine
        engine = get_engine()
        total_init = 0
        total_vote = 0
        with engine.connect() as conn:
            for tipo, items in all_iniciativas:
                n = upsert_iniciativas(items, tipo, conn)
                total_init += n
                log.info("  upserted tipo=%s new=%d", tipo, n)
            total_vote = upsert_votaciones(votaciones, conn)
            log.info("  votaciones_new=%d", total_vote)

        print(f"Congreso iniciativas: {total_init} iniciativas nuevas, {total_vote} votaciones nuevas.")
    except Exception as exc:
        log.error("upsert_failed err=%s", exc)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Congreso iniciativas & votaciones → parliamentary_initiative / parliamentary_vote")
    parser.add_argument("--tipos", nargs="+", default=None, choices=TIPOS_INICIATIVA + list(TIPO_CODE_MAP.keys()),
                        help="Tipos de iniciativa a ingestar (por defecto todos)")
    parser.add_argument("--dry", action="store_true", help="Solo mostrar, no escribir en BD")
    args = parser.parse_args()
    main(tipos=args.tipos, dry=args.dry)
