"""Ingesta RSS de prensa -> noticias_prensa + agregados de agenda/sentimiento.

Uso:
    python -m etl.sources.rss_noticias
"""
from __future__ import annotations

import json
from datetime import date, datetime
from io import BytesIO
import os
import re
from typing import Any
import unicodedata

import feedparser
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine
from etl.config import validate_env
from etl.logger import get_logger

try:
    from psycopg2.extras import execute_values as _execute_values  # type: ignore
except Exception:  # pragma: no cover
    _execute_values = None


FEEDS: dict[str, str] = {
    "elpais": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    "elmundo": "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
    "abc": "https://www.abc.es/rss/feeds/abc_ultima.xml",
    "eldiario": "https://www.eldiario.es/rss/",
    "lavanguardia": "https://www.lavanguardia.com/rss/home.xml",
    "20minutos": "https://www.20minutos.es/rss/",
    "expansion": "https://e00-expansion.uecdn.es/rss/portada.xml",
    "elpais_politica": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/politica/portada",
    "europapress": "https://www.europapress.es/rss/rss.aspx",
}

PARTIDOS_KEYWORDS = {
    "PSOE": ["psoe", "sanchez", "pedro sanchez", "socialista"],
    "PP": ["pp", "feijoo", "feijóo", "partido popular"],
    "VOX": ["vox", "abascal"],
    "SUMAR": ["sumar", "yolanda diaz", "yolanda díaz"],
    "PODEMOS": ["podemos", "irene montero", "iglesias"],
    "JUNTS": ["junts", "puigdemont"],
    "ERC": ["erc", "esquerra"],
    "PNV": ["pnv"],
    "BILDU": ["bildu", "eh bildu"],
}

TOPIC_KEYWORDS = {
    "economia": ["ipc", "inflación", "euribor", "bce", "paro", "empleo", "salario", "impuesto", "deuda", "pib"],
    "politica": ["congreso", "senado", "gobierno", "oposición", "elecciones", "partido", "presidente", "ministro"],
    "sanidad": ["sanidad", "hospital", "médico", "lista de espera", "atención primaria"],
    "vivienda": ["vivienda", "alquiler", "hipoteca", "desahucio", "okupa"],
    "educacion": ["educación", "colegio", "universidad", "beca", "fp"],
    "energia": ["energía", "luz", "gas", "renovable", "eléctrica"],
    "inmigracion": ["inmigración", "frontera", "migrante", "asilo"],
    "justicia": ["tribunal", "juez", "fiscalía", "sentencia", "amnistía"],
}

POS_WORDS = {"mejora", "sube", "crece", "acuerdo", "éxito", "positivo", "avance", "récord", "gana"}
NEG_WORDS = {"cae", "crisis", "huelga", "conflicto", "escándalo", "corrupción", "negativo", "recorte", "paro"}
PALABRAS_POSITIVAS = {k: 1.0 for k in {"mejora", "sube", "crece", "acuerdo", "éxito", "positivo", "avance", "récord", "gana"}}
PALABRAS_NEGATIVAS = {k: -1.0 for k in {"cae", "crisis", "huelga", "conflicto", "escándalo", "corrupción", "negativo", "recorte", "paro"}}
logger = get_logger(__name__)

# Contexto político por partido (heurístico, sin ML externo).
# Nota: se usan términos normalizados sin tildes.
PARTY_SENTIMENT_CONTEXT: dict[str, dict[str, set[str]]] = {
    "PSOE": {
        "pos": {
            "subida salario minimo", "revalorizacion pensiones", "escudo social",
            "fondos europeos", "acuerdo social", "creacion empleo", "baja paro",
        },
        "neg": {
            "corrupcion", "caso judicial", "escandalo", "mocion de censura",
            "dimision", "rechazo congreso", "derrota parlamentaria", "huelga general",
        },
    },
    "PP": {
        "pos": {
            "bajada impuestos", "gobiernos autonomicos", "mayoria absoluta",
            "victoria electoral", "recuperacion economica", "control deficit",
        },
        "neg": {
            "corrupcion", "caso kitchen", "investigacion judicial",
            "fractura interna", "dimision", "derrota electoral",
        },
    },
    "VOX": {
        "pos": {"endurecer inmigracion", "seguridad fronteras", "unidad nacional", "sube en encuestas"},
        "neg": {"aislamiento parlamentario", "ruptura coalicion", "caida en voto", "cordon sanitario"},
    },
    "SUMAR": {
        "pos": {"subida salario minimo", "derechos laborales", "vivienda publica", "acuerdo progresista"},
        "neg": {"division interna", "caida en encuestas", "ruptura bloque", "desmovilizacion"},
    },
    "PODEMOS": {
        "pos": {"movilizacion social", "agenda feminista", "presion izquierda"},
        "neg": {"escision", "tension interna", "caida electoral", "margen parlamentario bajo"},
    },
    "JUNTS": {
        "pos": {"acuerdo investidura", "agenda catalana", "competencias", "negociacion bilateral"},
        "neg": {"bloqueo negociacion", "choque judicial", "perdida apoyo"},
    },
    "ERC": {
        "pos": {"dialogo territorial", "agenda catalana", "avance autogobierno"},
        "neg": {"retroceso electoral", "bloqueo investidura", "division independentista"},
    },
    "PNV": {
        "pos": {"estabilidad institucional", "agenda vasca", "acuerdo presupuestario"},
        "neg": {"perdida de influencia", "choque territorial", "retroceso electoral"},
    },
    "BILDU": {
        "pos": {"avance electoral", "agenda social", "acuerdo territorial"},
        "neg": {"aislamiento", "veto politico", "bloqueo parlamentario"},
    },
}

GOV_PARTIES = {"PSOE", "SUMAR"}
GOV_EVENTS_POS = {
    "crecimiento pib", "baja paro", "record afiliacion", "aprobacion presupuestos",
    "acuerdo en bruselas", "mejora recaudacion",
}
GOV_EVENTS_NEG = {
    "mocion de censura", "crisis de gobierno", "huelga general", "corrupcion",
    "inflacion alta", "paro al alza", "derrota parlamentaria", "rechazo congreso",
}


def _engine():
    load_dotenv()
    validate_env()
    url = os.environ.get("DATABASE_URL", "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana")
    return create_engine(url, pool_pre_ping=True)


def _clean_html(text_: str) -> str:
    return re.sub(r"<[^>]+>", " ", text_ or "").strip()


def _norm_text(text_: str) -> str:
    t = unicodedata.normalize("NFKD", str(text_ or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _contains_kw(text_norm: str, kw_norm: str) -> bool:
    if not kw_norm:
        return False
    return re.search(rf"\b{re.escape(kw_norm)}\b", text_norm) is not None


def _kw_hits(text_norm: str, kws: set[str] | list[str]) -> int:
    return sum(1 for kw in kws if _contains_kw(text_norm, _norm_text(kw)))


def _sentiment_score(text_: str) -> float:
    """
    Devuelve score de sentimiento en [-1.0, 1.0].
    Normalizado por número de hits semánticos (media aritmética).
    """
    if not text_:
        return 0.0
    palabras = re.findall(r"\b[a-záéíóúüñ]+\b", str(text_).lower())
    hits: list[float] = []
    for palabra in palabras:
        if palabra in PALABRAS_POSITIVAS:
            hits.append(PALABRAS_POSITIVAS[palabra])
        elif palabra in PALABRAS_NEGATIVAS:
            hits.append(PALABRAS_NEGATIVAS[palabra])
    if not hits:
        return 0.0
    score = sum(hits) / len(hits)
    return max(-1.0, min(1.0, score))


def _fetch_feed_safe(url: str, timeout: int = 10) -> "feedparser.FeedParserDict":
    """Descarga un feed RSS con timeout y manejo de errores explícito."""
    try:
        resp = requests.get(
            url,
            timeout=timeout,
            headers={"User-Agent": "PoliteiaAnalitica/1.0 (+https://politeia.es)"},
            allow_redirects=True,
        )
        resp.raise_for_status()
        return feedparser.parse(BytesIO(resp.content))
    except requests.exceptions.Timeout:
        logger.warning("Timeout (%ss) al descargar feed: %s", timeout, url)
    except requests.exceptions.HTTPError as e:
        code = e.response.status_code if e.response is not None else "?"
        logger.warning("HTTP %s en feed: %s", code, url)
    except requests.exceptions.RequestException as e:
        logger.warning("Error de red en feed %s: %s", url, e)
    except Exception as e:
        logger.error("Error inesperado procesando feed %s: %s", url, e, exc_info=True)
    return feedparser.FeedParserDict()


def _sentiment_label(score: float) -> str:
    if score > 0.1:
        return "positivo"
    if score < -0.1:
        return "negativo"
    return "neutro"


def _extract_parties(text_: str) -> list[str]:
    tl = _norm_text(text_)
    out: list[str] = []
    for party, kws in PARTIDOS_KEYWORDS.items():
        if any(_contains_kw(tl, _norm_text(k)) for k in kws):
            out.append(party)
    return sorted(set(out))


def _topic(text_: str) -> str:
    tl = _norm_text(text_)
    for topic, kws in TOPIC_KEYWORDS.items():
        if any(_contains_kw(tl, _norm_text(k)) for k in kws):
            return topic
    return "generalista"


def _relevancia(text_: str, party_hits: int) -> float:
    t = _norm_text(text_)
    score = 0.15

    # Longitud útil del texto.
    score += min(0.20, len(t) / 1600.0)

    # Presencia de actores políticos explícitos.
    score += min(0.25, float(party_hits) * 0.08)

    # Señales de institucionalidad/impacto de política pública.
    hard_news_terms = {
        "congreso", "senado", "presupuestos", "decreto", "ley", "tribunal",
        "bce", "bruselas", "comision europea", "audiencia nacional",
    }
    score += min(0.20, _kw_hits(t, hard_news_terms) * 0.05)

    # Conflictividad / alta saliencia mediática.
    conflict_terms = {
        "mocion de censura", "dimision", "imputado", "escandalo",
        "corrupcion", "huelga", "sentencia", "investigacion",
    }
    score += min(0.20, _kw_hits(t, conflict_terms) * 0.05)

    # Dato cuantitativo (%, €, puntos, etc.) suele correlacionar con pieza analítica.
    if re.search(r"\b\d+[,.]?\d*\s*(%|euros|€|pb|puntos)\b", t):
        score += 0.10

    return round(min(1.0, score), 4)


def _context_windows(text_norm: str, party: str, window: int = 90) -> str:
    kws = PARTIDOS_KEYWORDS.get(party, [])
    fragments: list[str] = []
    for kw in kws:
        m = re.finditer(re.escape(_norm_text(kw)), text_norm)
        for hit in m:
            i0 = max(0, hit.start() - window)
            i1 = min(len(text_norm), hit.end() + window)
            fragments.append(text_norm[i0:i1])
    return " ".join(fragments) if fragments else text_norm


def _sentiment_score_for_party(text: str, party: str) -> float:
    """
    Sentimiento contextual por partido en escala [-1, 1].
    """
    t = _norm_text(text)
    if party not in PARTIDOS_KEYWORDS:
        return _sentiment_score(t)

    # Si no se menciona el partido explícitamente, devolvemos neutro.
    if not any(_contains_kw(t, _norm_text(k)) for k in PARTIDOS_KEYWORDS[party]):
        return 0.0

    local = _context_windows(t, party, window=90)
    party_ctx = PARTY_SENTIMENT_CONTEXT.get(party, {"pos": set(), "neg": set()})

    pos_local = _kw_hits(local, POS_WORDS)
    neg_local = _kw_hits(local, NEG_WORDS)

    pos_party = _kw_hits(local, party_ctx.get("pos", set()))
    neg_party = _kw_hits(local, party_ctx.get("neg", set()))

    gov_pos_hits = _kw_hits(t, GOV_EVENTS_POS)
    gov_neg_hits = _kw_hits(t, GOV_EVENTS_NEG)
    if party in GOV_PARTIES:
        pos_system = gov_pos_hits
        neg_system = gov_neg_hits
    else:
        # Para oposición, algunos eventos negativos del gobierno suelen beneficiar.
        pos_system = gov_neg_hits * 0.7
        neg_system = gov_pos_hits * 0.4

    pos = (1.4 * pos_local) + (1.0 * pos_party) + (0.8 * pos_system)
    neg = (1.4 * neg_local) + (1.0 * neg_party) + (0.8 * neg_system)

    if (pos + neg) == 0:
        return 0.0
    return max(-1.0, min(1.0, float((pos - neg) / (pos + neg))))


def _published_date(entry: Any) -> date:
    st = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if st:
        try:
            return date(st.tm_year, st.tm_mon, st.tm_mday)
        except Exception:
            pass
    return datetime.utcnow().date()


def _fetch_dicts(cur: Any) -> list[dict[str, Any]]:
    cols = [d[0] for d in cur.description] if cur.description else []
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def _execute_values_compat(cur: Any, sql: str, rows: list[tuple], page_size: int = 500) -> None:
    if not rows:
        return
    if _execute_values is not None:
        _execute_values(cur, sql, rows, page_size=page_size)
        return
    placeholders = ", ".join(["%s"] * len(rows[0]))
    sql_execmany = sql.replace("VALUES %s", f"VALUES ({placeholders})")
    cur.executemany(sql_execmany, rows)


def ingest(limit_per_feed: int = 50) -> dict[str, int]:
    eng = _engine()
    inserted = 0
    agenda_rows = 0
    sent_rows = 0
    today = date.today()

    raw_conn = eng.raw_connection()
    try:
        with raw_conn.cursor() as cur:
            news_rows: list[tuple[Any, ...]] = []
            for fuente, url in FEEDS.items():
                feed = _fetch_feed_safe(url, timeout=10)
                if not getattr(feed, "entries", None):
                    logger.warning("Feed vacío o inaccesible: %s", url)
                    continue
                entries = getattr(feed, "entries", [])[:limit_per_feed]
                for entry in entries:
                    title = str(getattr(entry, "title", "")).strip()
                    if not title:
                        continue
                    link = str(getattr(entry, "link", "")).strip()
                    if not link:
                        continue
                    summary = _clean_html(str(getattr(entry, "summary", "")))
                    full_text = f"{title}. {summary}".strip()
                    parties = _extract_parties(full_text)
                    if parties:
                        party_scores = [_sentiment_score_for_party(full_text, p) for p in parties]
                        sscore = float(sum(party_scores) / max(1, len(party_scores)))
                    else:
                        sscore = _sentiment_score(full_text)
                    slabel = _sentiment_label(sscore)
                    cat = _topic(full_text)
                    fpub = _published_date(entry)
                    temas_json = json.dumps([cat], ensure_ascii=False)
                    rel = _relevancia(full_text, len(parties))

                    news_rows.append(
                        (
                            fuente,
                            title[:1000],
                            link[:2000],
                            fpub,
                            cat,
                            ",".join(parties),
                            sscore,
                            slabel,
                            temas_json,
                            rel,
                            summary[:2000],
                        )
                    )

            sql_news = """
                INSERT INTO noticias_prensa (
                  fuente, titular, subtitular, url, fecha_publicacion, categoria,
                  partidos_mencionados, sentimiento_score, sentimiento_label,
                  temas_json, relevancia_score, resumen
                )
                VALUES %s
                ON CONFLICT (url) DO UPDATE SET
                  fuente = EXCLUDED.fuente,
                  titular = EXCLUDED.titular,
                  fecha_publicacion = EXCLUDED.fecha_publicacion,
                  categoria = EXCLUDED.categoria,
                  partidos_mencionados = EXCLUDED.partidos_mencionados,
                  sentimiento_score = EXCLUDED.sentimiento_score,
                  sentimiento_label = EXCLUDED.sentimiento_label,
                  temas_json = EXCLUDED.temas_json,
                  relevancia_score = EXCLUDED.relevancia_score,
                  resumen = EXCLUDED.resumen
            """
            _execute_values_compat(cur, sql_news, news_rows, page_size=500)
            inserted = len(news_rows)

            cur.execute(
                """
                SELECT
                  CURRENT_DATE AS fecha,
                  COALESCE(NULLIF(categoria, ''), 'generalista') AS tema,
                  COUNT(*) AS n_noticias,
                  AVG(COALESCE(sentimiento_score, 0)) AS sentimiento_medio
                FROM noticias_prensa
                WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '1 day'
                GROUP BY 2
                """
            )
            agenda_data = _fetch_dicts(cur)
            total_n = sum(int(r["n_noticias"]) for r in agenda_data) or 1
            agenda_payload = [
                (
                    r["fecha"],
                    r["tema"],
                    int(r["n_noticias"]),
                    float(r["sentimiento_medio"] or 0.0),
                    float(r["n_noticias"]) / float(total_n),
                    r["tema"],
                )
                for r in agenda_data
            ]
            sql_agenda = """
                INSERT INTO agenda_mediatica (
                  fecha, tema, n_noticias, tendencia, partidos_relacionados, sentimiento_medio, peso_agenda, categoria
                )
                VALUES %s
                ON CONFLICT (fecha, tema) DO UPDATE SET
                  n_noticias = EXCLUDED.n_noticias,
                  tendencia = EXCLUDED.tendencia,
                  sentimiento_medio = EXCLUDED.sentimiento_medio,
                  peso_agenda = EXCLUDED.peso_agenda,
                  categoria = EXCLUDED.categoria
            """
            _execute_values_compat(cur, sql_agenda, agenda_payload, page_size=250)
            agenda_rows = len(agenda_payload)

            cur.execute(
                """
                SELECT fuente, COALESCE(categoria,'generalista') AS categoria,
                       COALESCE(titular,'') AS titular, COALESCE(resumen,'') AS resumen
                FROM noticias_prensa
                WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '1 day'
                """
            )
            rows_news = _fetch_dicts(cur)

            by_party_scores: dict[str, list[float]] = {p: [] for p in PARTIDOS_KEYWORDS}
            by_party_sources: dict[str, set[str]] = {p: set() for p in PARTIDOS_KEYWORDS}
            by_party_topics: dict[str, dict[str, int]] = {p: {} for p in PARTIDOS_KEYWORDS}

            for r in rows_news:
                txt = f"{r.get('titular', '')}. {r.get('resumen', '')}".strip()
                if not txt:
                    continue
                parties_hit = _extract_parties(txt)
                if not parties_hit:
                    continue
                source = str(r.get("fuente", "") or "")
                topic = str(r.get("categoria", "generalista") or "generalista")
                for party in parties_hit:
                    s = _sentiment_score_for_party(txt, party)
                    by_party_scores[party].append(float(s))
                    if source:
                        by_party_sources[party].add(source)
                    by_party_topics[party][topic] = by_party_topics[party].get(topic, 0) + 1

            sentiment_payload: list[tuple[Any, ...]] = []
            for party, vals in by_party_scores.items():
                if not vals:
                    continue
                n = len(vals)
                pos = sum(1 for v in vals if v > 0.1)
                neg = sum(1 for v in vals if v < -0.1)
                neu = n - pos - neg
                top_topics = sorted(by_party_topics[party].items(), key=lambda kv: kv[1], reverse=True)[:5]
                sentiment_payload.append(
                    (
                        today,
                        party,
                        n,
                        sum(vals) / max(1, n),
                        round(pos * 100.0 / n, 2),
                        round(neg * 100.0 / n, 2),
                        round(neu * 100.0 / n, 2),
                        json.dumps(sorted(by_party_sources[party])[:10], ensure_ascii=False),
                        json.dumps([t for t, _ in top_topics], ensure_ascii=False),
                    )
                )

            sql_sent = """
                INSERT INTO sentimiento_prensa_diario (
                  fecha, entidad, tipo_entidad, n_noticias, sentimiento_medio, pct_positivo, pct_negativo, pct_neutro, fuentes_json, temas_top_json
                )
                VALUES %s
                ON CONFLICT (fecha, entidad) DO UPDATE SET
                  tipo_entidad = EXCLUDED.tipo_entidad,
                  n_noticias = EXCLUDED.n_noticias,
                  sentimiento_medio = EXCLUDED.sentimiento_medio,
                  pct_positivo = EXCLUDED.pct_positivo,
                  pct_negativo = EXCLUDED.pct_negativo,
                  pct_neutro = EXCLUDED.pct_neutro,
                  fuentes_json = EXCLUDED.fuentes_json,
                  temas_top_json = EXCLUDED.temas_top_json
            """
            sent_rows = len(sentiment_payload)
            sentiment_payload_db = [
                (d, entidad, "partido", n, sm, pp, pn, pneu, fuentes, temas)
                for (d, entidad, n, sm, pp, pn, pneu, fuentes, temas) in sentiment_payload
            ]
            _execute_values_compat(cur, sql_sent, sentiment_payload_db, page_size=200)

        raw_conn.commit()
    except Exception:
        raw_conn.rollback()
        raise
    finally:
        raw_conn.close()

    return {"noticias_upsert": inserted, "agenda_rows": agenda_rows, "sent_partidos_rows": sent_rows}


def main() -> int:
    result = ingest()
    logger.info("Resultado ingesta RSS: %s", result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
