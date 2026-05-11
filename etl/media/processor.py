"""
Capa 2 — post-ingest processor for `noticias_prensa`.

Reads `titular`/`subtitular`/`fuente`/`fecha_publicacion` (legacy column names)
and writes `titulo_clean`/`resumen_clean`/`slug`/`ccaa`/`idioma`/`spike_score`.

Honest fallbacks: returns 0 if DB unreachable, skips bad rows, logs debug.

Public API:
  - run_processing_pipeline(batch_size=200) -> dict
  - compute_spike_scores(window_hours=6) -> int
  - find_duplicate(...) -> Optional[int]
"""
from __future__ import annotations

import hashlib
import logging
import re
import unicodedata
from datetime import date, datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _engine() -> Any:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.debug("processor._engine: %s", exc)
        return None


# ── TEXT CLEANUP ──────────────────────────────────────────────────────────

_BOILERPLATE_PATTERNS = [
    re.compile(r"\bLeer más\b.*$", re.IGNORECASE | re.MULTILINE),
    re.compile(r"\bVer más\b.*$",  re.IGNORECASE | re.MULTILINE),
    re.compile(r"\bContinúa leyendo\b.*$", re.IGNORECASE | re.MULTILINE),
    re.compile(r"\(EFE\)"),
    re.compile(r"\(Europa Press\)"),
    re.compile(r"\(Redacción\)"),
    re.compile(r"©\s*\d{4}.*$", re.MULTILINE),
]

# Trailing media-name patterns like " | El País" or " — EL MUNDO"
_TRAILING_MEDIA = re.compile(r"\s*[\|\-–—]\s*[A-ZÁÉÍÓÚÜÑ][^|–—]{3,40}$")


def _normalize_unicode(t: str) -> str:
    t = unicodedata.normalize("NFC", t)
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", t)


def _clean_title(raw: str) -> str:
    if not raw:
        return ""
    t = _TRAILING_MEDIA.sub("", raw)
    for pat in _BOILERPLATE_PATTERNS:
        t = pat.sub("", t)
    return _normalize_unicode(t).strip()[:500]


def _clean_summary(raw: str) -> str:
    if not raw:
        return ""
    t = re.sub(r"<[^>]+>", " ", raw)
    for pat in _BOILERPLATE_PATTERNS:
        t = pat.sub("", t)
    t = _normalize_unicode(t)
    return re.sub(r"\s+", " ", t).strip()[:2000]


def _word_count(*texts: str) -> int:
    combined = " ".join(t or "" for t in texts)
    return len(combined.split())


def _slug(titulo: str, fuente_id: str | None, ref_date: date | None) -> str:
    base = re.sub(r"[^a-z0-9\s-]", "", (titulo or "").lower())
    base = re.sub(r"\s+", "-", base)[:60]
    seed = f"{fuente_id or ''}{ref_date.isoformat() if ref_date else ''}"
    suffix = hashlib.md5(seed.encode()).hexdigest()[:6]
    return f"{base}-{suffix}" if base else suffix


# ── LANGUAGE DETECTION ────────────────────────────────────────────────────

_LANG_TOKENS = {
    "ca": {"però", "amb", "aquest", "aquesta", "també", "perquè", "podem", "nosaltres", "que", "vol"},
    "eu": {"eta", "euskal", "herria", "dira", "ditu", "dago", "euskadi", "berria"},
    "gl": {"tamén", "galicia", "galego", "galega", "xunta", "ourense"},
    "fr": {"les", "des", "une", "dans", "pour", "avec", "sur", "par"},
    "de": {"die", "der", "das", "und", "für", "mit", "auf", "deutschen"},
    "en": {"the", "and", "for", "with", "this", "that", "from", "parliament"},
}


def _detect_language(titulo: str, resumen: str, pais: str | None, ccaa: str | None) -> str:
    if pais in ("GB", "US", "IE"):
        return "en"
    if pais == "FR":
        return "fr"
    if pais in ("DE", "AT"):
        return "de"
    combined = ((titulo or "") + " " + (resumen or "")).lower()
    tokens = set(re.findall(r"\b\w+\b", combined))
    if ccaa == "CAT" and len(tokens & _LANG_TOKENS["ca"]) >= 2:
        return "ca"
    if ccaa == "PVA" and len(tokens & _LANG_TOKENS["eu"]) >= 2:
        return "eu"
    if ccaa == "GAL" and len(tokens & _LANG_TOKENS["gl"]) >= 2:
        return "gl"
    scores = {lang: len(tokens & toks) for lang, toks in _LANG_TOKENS.items()}
    best_lang = max(scores, key=scores.get)
    if best_lang in ("en", "fr", "de") and scores[best_lang] >= 3:
        return best_lang
    return "es"


# ── CCAA DETECTION ────────────────────────────────────────────────────────

_CCAA_PATTERNS: dict[str, re.Pattern] = {
    "CAT": re.compile(r"\b(cataluña|catalunya|barcelona|generalitat|puigdemont|illa|aragonès)\b", re.IGNORECASE),
    "MAD": re.compile(r"\b(comunidad de madrid|ayuso|almeida|ifema)\b", re.IGNORECASE),
    "AND": re.compile(r"\b(andalucía|sevilla|málaga|granada|córdoba|junta de andalucía|moreno bonilla)\b", re.IGNORECASE),
    "PVA": re.compile(r"\b(euskadi|país vasco|pais vasco|bilbao|donostia|pnv|eh bildu|pradales|urkullu)\b", re.IGNORECASE),
    "VAL": re.compile(r"\b(comunitat valenciana|comunidad valenciana|valencia|alicante|castellón|mazón|ximo puig)\b", re.IGNORECASE),
    "GAL": re.compile(r"\b(galicia|a coruña|vigo|xunta|rueda|feijóo)\b", re.IGNORECASE),
    "ARA": re.compile(r"\b(aragón|zaragoza|huesca|teruel)\b", re.IGNORECASE),
    "AST": re.compile(r"\b(asturias|oviedo|gijón|principado)\b", re.IGNORECASE),
    "CAN": re.compile(r"\b(canarias|santa cruz|las palmas|tenerife|clavijo)\b", re.IGNORECASE),
    "BAL": re.compile(r"\b(baleares|illes balears|palma|mallorca|menorca|ibiza|prohens)\b", re.IGNORECASE),
    "MUR": re.compile(r"\b(murcia|cartagena|lópez miras)\b", re.IGNORECASE),
    "NAV": re.compile(r"\b(navarra|pamplona|iruña|chivite)\b", re.IGNORECASE),
    "RIO": re.compile(r"\b(la rioja|logroño)\b", re.IGNORECASE),
    "CLM": re.compile(r"\b(castilla.la mancha|toledo|albacete|cuenca|page)\b", re.IGNORECASE),
    "CYL": re.compile(r"\b(castilla y león|valladolid|salamanca|burgos|mañueco)\b", re.IGNORECASE),
    "EXT": re.compile(r"\b(extremadura|badajoz|cáceres|guardiola|vara)\b", re.IGNORECASE),
}


def _detect_ccaa(titulo: str, resumen: str, existing: str | None) -> str | None:
    if existing:
        return existing
    combined = (titulo or "") + " " + (resumen or "")
    for code, pat in _CCAA_PATTERNS.items():
        if pat.search(combined):
            return code
    return None


# ── DEDUP ─────────────────────────────────────────────────────────────────

def _title_fingerprint(titulo: str) -> str:
    s = unicodedata.normalize("NFD", titulo.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    tokens = sorted(t for t in re.findall(r"\b[a-z0-9]{4,}\b", s))
    return " ".join(tokens)


def find_duplicate(
    article_id: int, titulo: str, fecha_pub: date | None, tier: str | None,
    threshold: float = 0.82,
) -> Optional[int]:
    if not titulo or len(titulo) < 20 or fecha_pub is None:
        return None
    fp = _title_fingerprint(titulo)
    if not fp:
        return None
    eng = _engine()
    if eng is None:
        return None
    desde = fecha_pub - timedelta(days=1)
    hasta = fecha_pub + timedelta(days=1)
    from sqlalchemy import text as sa_text
    try:
        with eng.connect() as c:
            rows = c.execute(sa_text("""
                SELECT id, titular FROM noticias_prensa
                WHERE fecha_publicacion BETWEEN :d1 AND :d2
                  AND id <> :id
                  AND duplicado_de IS NULL
                  AND (tier = :tier OR tier IS NULL)
                ORDER BY fecha_publicacion DESC
                LIMIT 60
            """), {"d1": desde, "d2": hasta, "id": article_id,
                   "tier": tier or "nacional"}).fetchall()
    except Exception as exc:
        logger.debug("find_duplicate query: %s", exc)
        return None
    for row in rows:
        cand_fp = _title_fingerprint(row[1] or "")
        if not cand_fp:
            continue
        sim = SequenceMatcher(None, fp, cand_fp).ratio()
        if sim >= threshold:
            return int(row[0])
    return None


# ── MAIN PIPELINE ─────────────────────────────────────────────────────────

def run_processing_pipeline(batch_size: int = 200) -> dict:
    eng = _engine()
    if eng is None:
        return {"processed": 0, "duplicates": 0, "errors": 0, "error": "db_unreachable"}
    from sqlalchemy import text as sa_text

    # Select unprocessed rows — use LEGACY column names
    with eng.connect() as c:
        rows = c.execute(sa_text("""
            SELECT id, titular, subtitular, fuente_id, tier, ideologia,
                   pais, ccaa, fecha_publicacion
            FROM noticias_prensa
            WHERE (procesado IS NULL OR procesado = FALSE)
              AND titular IS NOT NULL
            ORDER BY fecha_publicacion DESC NULLS LAST, id DESC
            LIMIT :n
        """), {"n": batch_size}).fetchall()
    if not rows:
        return {"processed": 0, "duplicates": 0, "errors": 0}

    processed = duplicates = errors = 0
    with eng.begin() as c:
        for row in rows:
            try:
                tit_clean = _clean_title(row[1] or "")
                res_clean = _clean_summary(row[2] or "")
                wc = _word_count(tit_clean, res_clean)
                idioma = _detect_language(tit_clean, res_clean, row[6], row[7])
                ccaa = _detect_ccaa(tit_clean, res_clean, row[7])
                slug_val = _slug(tit_clean, row[3], row[8])

                # Dedup
                if len(tit_clean) > 20:
                    original = find_duplicate(int(row[0]), tit_clean, row[8], row[4])
                    if original and original != row[0]:
                        c.execute(sa_text("""
                            UPDATE noticias_prensa
                            SET duplicado_de = :orig, procesado = TRUE, fecha_procesado = NOW()
                            WHERE id = :id
                        """), {"orig": original, "id": int(row[0])})
                        duplicates += 1
                        continue

                c.execute(sa_text("""
                    UPDATE noticias_prensa SET
                        procesado       = TRUE,
                        titulo_clean    = :tc,
                        resumen_clean   = :rc,
                        word_count      = :wc,
                        idioma          = :idi,
                        ccaa            = :ccaa,
                        slug            = :sl,
                        fecha_procesado = NOW()
                    WHERE id = :id
                """), {
                    "id": int(row[0]),
                    "tc": tit_clean, "rc": res_clean,
                    "wc": wc, "idi": idioma, "ccaa": ccaa, "sl": slug_val,
                })
                processed += 1
            except Exception as exc:
                logger.debug("process row %s: %s", row[0], exc)
                errors += 1
    return {
        "processed": processed,
        "duplicates": duplicates,
        "errors": errors,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── SPIKE DETECTION ───────────────────────────────────────────────────────

def compute_spike_scores(window_hours: int = 6) -> int:
    """
    z-score of recent activity per source vs. 30-day hourly baseline.
    Updates noticias_prensa.spike_score for rows in the last window.
    Returns the number of rows touched.
    """
    eng = _engine()
    if eng is None:
        return 0
    from sqlalchemy import text as sa_text
    try:
        with eng.begin() as c:
            res = c.execute(sa_text(f"""
                WITH reciente AS (
                    SELECT fuente_id, COUNT(*) AS cnt
                    FROM noticias_prensa
                    WHERE fuente_id IS NOT NULL
                      AND fecha_scraping >= NOW() - INTERVAL '{window_hours} hours'
                    GROUP BY fuente_id
                ),
                historico AS (
                    SELECT fuente_id,
                           AVG(cnt_h) AS mu,
                           STDDEV(cnt_h) AS sigma
                    FROM (
                        SELECT fuente_id, DATE_TRUNC('hour', fecha_scraping) AS h,
                               COUNT(*) AS cnt_h
                        FROM noticias_prensa
                        WHERE fuente_id IS NOT NULL
                          AND fecha_scraping >= NOW() - INTERVAL '30 days'
                        GROUP BY fuente_id, h
                    ) hours
                    GROUP BY fuente_id
                )
                UPDATE noticias_prensa np
                SET spike_score = CASE
                    WHEN COALESCE(h.sigma, 0) > 0 THEN (r.cnt - h.mu) / h.sigma
                    ELSE 0
                END
                FROM reciente r, historico h
                WHERE np.fuente_id = r.fuente_id
                  AND np.fuente_id = h.fuente_id
                  AND np.fecha_scraping >= NOW() - INTERVAL '{window_hours} hours'
            """))
            return res.rowcount or 0
    except Exception as exc:
        logger.debug("compute_spike_scores: %s", exc)
        return 0
