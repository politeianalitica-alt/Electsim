"""Ingesta RSS de prensa -> noticias_prensa + agregados de agenda/sentimiento.

Uso:
    python -m etl.sources.rss_noticias
"""
from __future__ import annotations

from datetime import date, datetime
import os
import re
from typing import Any

import feedparser
from dotenv import load_dotenv
from sqlalchemy import create_engine, text


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


def _engine():
    load_dotenv()
    url = os.environ.get("DATABASE_URL", "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana")
    return create_engine(url, pool_pre_ping=True)


def _clean_html(text_: str) -> str:
    return re.sub(r"<[^>]+>", " ", text_ or "").strip()


def _sentiment_score(text_: str) -> float:
    t = (text_ or "").lower()
    pos = sum(1 for w in POS_WORDS if w in t)
    neg = sum(1 for w in NEG_WORDS if w in t)
    if pos + neg == 0:
        return 0.0
    return max(-1.0, min(1.0, (pos - neg) / max(1, (pos + neg))))


def _sentiment_label(score: float) -> str:
    if score > 0.1:
        return "positivo"
    if score < -0.1:
        return "negativo"
    return "neutro"


def _extract_parties(text_: str) -> list[str]:
    tl = (text_ or "").lower()
    out: list[str] = []
    for party, kws in PARTIDOS_KEYWORDS.items():
        if any(k in tl for k in kws):
            out.append(party)
    return sorted(set(out))


def _topic(text_: str) -> str:
    tl = (text_ or "").lower()
    for topic, kws in TOPIC_KEYWORDS.items():
        if any(k in tl for k in kws):
            return topic
    return "generalista"


def _relevancia(text_: str, party_hits: int) -> float:
    base = 0.25 + min(0.25, len(text_) / 600.0)
    p = min(0.35, party_hits * 0.12)
    return round(min(1.0, base + p), 4)


def _published_date(entry: Any) -> date:
    st = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if st:
        try:
            return date(st.tm_year, st.tm_mon, st.tm_mday)
        except Exception:
            pass
    return datetime.utcnow().date()


def ingest(limit_per_feed: int = 50) -> dict[str, int]:
    eng = _engine()
    inserted = 0
    agenda_rows = 0
    sent_rows = 0

    with eng.begin() as conn:
        for fuente, url in FEEDS.items():
            feed = feedparser.parse(url)
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
                sscore = _sentiment_score(full_text)
                slabel = _sentiment_label(sscore)
                cat = _topic(full_text)
                fpub = _published_date(entry)
                temas_json = f'["{cat}"]'
                rel = _relevancia(full_text, len(parties))

                conn.execute(
                    text(
                        """
                        INSERT INTO noticias_prensa (
                          fuente, titular, subtitular, url, fecha_publicacion, categoria,
                          partidos_mencionados, sentimiento_score, sentimiento_label,
                          temas_json, relevancia_score, resumen
                        )
                        VALUES (
                          :fuente, :titular, NULL, :url, :fecha_publicacion, :categoria,
                          :partidos_mencionados, :sentimiento_score, :sentimiento_label,
                          :temas_json, :relevancia_score, :resumen
                        )
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
                    ),
                    {
                        "fuente": fuente,
                        "titular": title[:1000],
                        "url": link[:2000],
                        "fecha_publicacion": fpub,
                        "categoria": cat,
                        "partidos_mencionados": ",".join(parties),
                        "sentimiento_score": sscore,
                        "sentimiento_label": slabel,
                        "temas_json": temas_json,
                        "relevancia_score": rel,
                        "resumen": summary[:2000],
                    },
                )
                inserted += 1

        # Recalcular agregados de hoy para agenda_mediatica
        agenda_data = conn.execute(
            text(
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
        ).mappings().all()

        total_n = sum(int(r["n_noticias"]) for r in agenda_data) or 1
        for r in agenda_data:
            conn.execute(
                text(
                    """
                    INSERT INTO agenda_mediatica (
                      fecha, tema, n_noticias, tendencia, partidos_relacionados, sentimiento_medio, peso_agenda, categoria
                    ) VALUES (
                      :fecha, :tema, :n_noticias, 'estable', NULL, :sentimiento_medio, :peso_agenda, :categoria
                    )
                    ON CONFLICT (fecha, tema) DO UPDATE SET
                      n_noticias = EXCLUDED.n_noticias,
                      tendencia = EXCLUDED.tendencia,
                      sentimiento_medio = EXCLUDED.sentimiento_medio,
                      peso_agenda = EXCLUDED.peso_agenda,
                      categoria = EXCLUDED.categoria
                    """
                ),
                {
                    "fecha": r["fecha"],
                    "tema": r["tema"],
                    "n_noticias": int(r["n_noticias"]),
                    "sentimiento_medio": float(r["sentimiento_medio"] or 0.0),
                    "peso_agenda": float(r["n_noticias"]) / float(total_n),
                    "categoria": r["tema"],
                },
            )
            agenda_rows += 1

        # Recalcular sentimiento diario por partido (hoy)
        for party in PARTIDOS_KEYWORDS:
            pat = "|".join(PARTIDOS_KEYWORDS[party])
            rows = conn.execute(
                text(
                    """
                    SELECT sentimiento_score
                    FROM noticias_prensa
                    WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '1 day'
                      AND lower(coalesce(titular,'') || ' ' || coalesce(resumen,'')) ~ :regex
                    """
                ),
                {"regex": pat},
            ).fetchall()
            if not rows:
                continue
            vals = [float(r[0] or 0.0) for r in rows]
            n = len(vals)
            pos = sum(1 for v in vals if v > 0.1)
            neg = sum(1 for v in vals if v < -0.1)
            neu = n - pos - neg
            conn.execute(
                text(
                    """
                    INSERT INTO sentimiento_prensa_diario (
                      fecha, entidad, tipo_entidad, n_noticias, sentimiento_medio, pct_positivo, pct_negativo, pct_neutro, fuentes_json, temas_top_json
                    ) VALUES (
                      CURRENT_DATE, :entidad, 'partido', :n_noticias, :sent_medio, :pct_pos, :pct_neg, :pct_neu, NULL, NULL
                    )
                    ON CONFLICT (fecha, entidad) DO UPDATE SET
                      tipo_entidad = EXCLUDED.tipo_entidad,
                      n_noticias = EXCLUDED.n_noticias,
                      sentimiento_medio = EXCLUDED.sentimiento_medio,
                      pct_positivo = EXCLUDED.pct_positivo,
                      pct_negativo = EXCLUDED.pct_negativo,
                      pct_neutro = EXCLUDED.pct_neutro
                    """
                ),
                {
                    "entidad": party,
                    "n_noticias": n,
                    "sent_medio": sum(vals) / max(1, n),
                    "pct_pos": round(pos * 100.0 / n, 2),
                    "pct_neg": round(neg * 100.0 / n, 2),
                    "pct_neu": round(neu * 100.0 / n, 2),
                },
            )
            sent_rows += 1

    return {"noticias_upsert": inserted, "agenda_rows": agenda_rows, "sent_partidos_rows": sent_rows}


def main() -> int:
    result = ingest()
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

