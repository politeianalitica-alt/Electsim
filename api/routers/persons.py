"""
Router /api/persons — fichas enriquecidas de personas/figuras públicas.

Para cada persona devuelve:
- menciones en news_articles + noticias_prensa
- narrativas asociadas (directas e indirectas)
- sentiment promedio + tendencia
- contexto (organizaciones, lugares co-mencionados)

Endpoints:
  GET /api/persons/search?q=Sanchez       — búsqueda
  GET /api/persons/{name}/profile         — ficha enriquecida
  GET /api/persons/top-mentioned          — ranking de menciones 7d
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/persons", tags=["persons"])


def _conn():
    import psycopg
    from config.settings import get_settings
    s = get_settings()
    raw = s.database_url_raw
    dsn = re.sub(r"postgresql\+\w+://", "postgresql://", raw)
    return psycopg.connect(dsn)


@router.get("/top-mentioned")
def top_mentioned(hours_back: int = Query(168, ge=24, le=720), limit: int = Query(20, ge=5, le=50)):
    """Top personas mencionadas extraídas de ai_entities en news_articles."""
    out: list[dict] = []
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, ai_entities, ai_sentiment, ai_relevance, scraped_at, title, source_name
                    FROM news_articles
                    WHERE scraped_at > NOW() - (%s || ' hours')::interval
                      AND ai_entities IS NOT NULL
                """, [str(hours_back)])
                rows = cur.fetchall()

        # Agregar por persona
        agg: dict[str, dict[str, Any]] = {}
        for r in rows:
            ent = r[1] or {}
            personas = (ent.get("personas") if isinstance(ent, dict) else None) or []
            sent = r[2] or "neutro"
            rel = r[3] or 0
            for p in personas:
                # Limpiar — quedarnos con el nombre antes del "(cargo)"
                name = re.sub(r"\s*\([^)]*\)", "", p).strip()
                if len(name) < 4 or len(name) > 60:
                    continue
                if name not in agg:
                    agg[name] = {
                        "name": name,
                        "mentions": 0,
                        "pos": 0, "neg": 0, "neu": 0,
                        "total_relevance": 0,
                        "last_seen": None,
                        "raw_label": p,  # e.g. "Pedro Sánchez (presidente)"
                    }
                a = agg[name]
                a["mentions"] += 1
                a[sent] = a.get(sent, 0) + 1
                a["total_relevance"] += rel
                ts = r[4]
                if ts and (not a["last_seen"] or ts > a["last_seen"]):
                    a["last_seen"] = ts

        ranked = []
        for n, a in agg.items():
            avg_rel = a["total_relevance"] / max(1, a["mentions"])
            sent_pol = a.get("pos", 0) - a.get("neg", 0)
            ranked.append({
                "name":          n,
                "label":         a["raw_label"],
                "mentions":      a["mentions"],
                "pos":           a.get("pos", 0),
                "neg":           a.get("neg", 0),
                "neu":           a.get("neu", 0),
                "sent_polarity": sent_pol,
                "avg_relevance": round(avg_rel, 1),
                "last_seen":     a["last_seen"].isoformat() if a["last_seen"] else None,
            })
        ranked.sort(key=lambda x: -(x["mentions"] * x["avg_relevance"]))
        return {"persons": ranked[:limit], "hours_back": hours_back, "total_unique": len(agg)}
    except Exception as e:
        return {"persons": [], "error": str(e)}


@router.get("/search")
def search_person(q: str = Query(..., min_length=2)):
    """Búsqueda fuzzy de persona en ai_entities."""
    pattern = q.strip().lower()
    out: list[dict] = []
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT entity, COUNT(*) AS n
                    FROM (
                        SELECT unnest(
                            COALESCE(
                                (ai_entities->>'personas')::jsonb,
                                ai_entities->'personas'
                            )::text[]
                        ) AS entity
                        FROM news_articles
                        WHERE ai_entities IS NOT NULL
                          AND ai_entities ? 'personas'
                    ) sub
                    WHERE entity ~* %s
                    GROUP BY entity
                    ORDER BY n DESC
                    LIMIT 20
                """, [pattern])
                # Note: this query may fail because ai_entities is JSONB, not text[]
                # Fallback below if it fails
                try:
                    rows = cur.fetchall()
                    for r in rows:
                        clean = re.sub(r"\s*\([^)]*\)", "", r[0]).strip()
                        out.append({"name": clean, "label": r[0], "mentions": r[1]})
                except Exception:
                    pass

        if not out:
            # Fallback: hacer scan
            with _conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT ai_entities
                        FROM news_articles
                        WHERE ai_entities IS NOT NULL
                          AND ai_entities::text ~* %s
                        LIMIT 100
                    """, [pattern])
                    seen: dict[str, int] = {}
                    for r in cur.fetchall():
                        ent = r[0] or {}
                        if isinstance(ent, dict):
                            for p in (ent.get("personas") or []):
                                if pattern in p.lower():
                                    name = re.sub(r"\s*\([^)]*\)", "", p).strip()
                                    seen[name] = seen.get(name, 0) + 1
                    out = [{"name": n, "label": n, "mentions": c} for n, c in sorted(seen.items(), key=lambda x: -x[1])[:20]]

        return {"results": out, "query": q}
    except Exception as e:
        return {"results": [], "error": str(e)}


@router.get("/{name}/profile")
def person_profile(name: str, hours_back: int = Query(720, ge=24, le=2160)):
    """Ficha enriquecida de una persona: menciones + narrativas + sentiment + co-actores."""
    out: dict[str, Any] = {
        "name": name,
        "mentions": [],
        "narratives_direct": [],
        "narratives_indirect": [],
        "sentiment_timeline": [],
        "co_persons": [],
        "co_orgs": [],
        "stats": {},
    }
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                # Buscar artículos donde aparece
                cur.execute("""
                    SELECT id, title, source_name, scraped_at, ai_summary,
                           ai_sentiment, ai_relevance, ai_topics, ai_entities,
                           ai_spain_impact, url
                    FROM news_articles
                    WHERE scraped_at > NOW() - (%s || ' hours')::interval
                      AND (
                        ai_entities::text ~* %s
                        OR title ~* %s
                      )
                    ORDER BY scraped_at DESC
                    LIMIT 30
                """, [str(hours_back), re.escape(name), re.escape(name)])
                articles = cur.fetchall()

        # Procesar
        topics_direct: dict[str, int] = {}
        topics_indirect: dict[str, int] = {}
        co_persons: dict[str, int] = {}
        co_orgs: dict[str, int] = {}
        sentiments: dict[str, int] = {"positivo": 0, "negativo": 0, "neutro": 0, "mixto": 0}
        timeline: list[dict] = []

        for a in articles:
            (id_, title, source, ts, summary, sent, rel, topics, entities, spain_imp, url) = a

            # Decisión: directa = aparece en title o en personas; indirecta = solo organizaciones donde está vinculado
            ent = entities or {}
            in_personas = False
            if isinstance(ent, dict):
                for p in (ent.get("personas") or []):
                    if name.lower() in p.lower():
                        in_personas = True
                        break
            in_title = name.lower() in (title or "").lower()
            is_direct = in_personas or in_title

            out["mentions"].append({
                "id":         id_,
                "title":      title,
                "source":     source,
                "summary":    (summary or "")[:200],
                "sentiment":  sent,
                "relevance":  rel,
                "spain_impact": spain_imp,
                "is_direct":  is_direct,
                "scraped_at": ts.isoformat() if ts else None,
                "url":        url,
                "topics":     list(topics or [])[:5],
            })

            sentiments[sent or "neutro"] = sentiments.get(sent or "neutro", 0) + 1
            timeline.append({
                "date": ts.date().isoformat() if ts else None,
                "sentiment": sent or "neutro",
                "relevance": rel or 0,
            })

            for t in (topics or []):
                if is_direct:
                    topics_direct[t] = topics_direct.get(t, 0) + 1
                else:
                    topics_indirect[t] = topics_indirect.get(t, 0) + 1

            if isinstance(ent, dict):
                for cp in (ent.get("personas") or []):
                    cp_clean = re.sub(r"\s*\([^)]*\)", "", cp).strip()
                    if cp_clean.lower() != name.lower() and len(cp_clean) > 3:
                        co_persons[cp_clean] = co_persons.get(cp_clean, 0) + 1
                for o in (ent.get("organizaciones") or []):
                    o_clean = re.sub(r"\s*\([^)]*\)", "", o).strip()
                    if o_clean and len(o_clean) > 2:
                        co_orgs[o_clean] = co_orgs.get(o_clean, 0) + 1

        out["narratives_direct"] = [{"topic": k, "cnt": v} for k, v in sorted(topics_direct.items(), key=lambda x: -x[1])[:8]]
        out["narratives_indirect"] = [{"topic": k, "cnt": v} for k, v in sorted(topics_indirect.items(), key=lambda x: -x[1])[:8]]
        out["co_persons"] = [{"name": k, "cnt": v} for k, v in sorted(co_persons.items(), key=lambda x: -x[1])[:10]]
        out["co_orgs"] = [{"name": k, "cnt": v} for k, v in sorted(co_orgs.items(), key=lambda x: -x[1])[:10]]
        out["sentiment_timeline"] = timeline[:30]
        total = sum(sentiments.values()) or 1
        out["stats"] = {
            "total_mentions": total,
            "sentiment_breakdown": sentiments,
            "sentiment_polarity": round((sentiments.get("positivo", 0) - sentiments.get("negativo", 0)) / total, 2),
            "hours_back":     hours_back,
        }
        return out
    except Exception as e:
        out["error"] = str(e)
        return out
