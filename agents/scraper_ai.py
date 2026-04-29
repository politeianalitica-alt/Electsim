"""Enriquecimiento IA comun para scrapers y pipelines."""

from __future__ import annotations

import json
import os
from typing import Any, Iterable


def ai_enrichment_enabled() -> bool:
    return os.environ.get("ELECTSIM_AI_ENRICH_SCRAPERS", "1").strip().lower() not in {"0", "false", "no", "off"}


def record_text(record: dict[str, Any]) -> str:
    fields = (
        "titular",
        "title",
        "titulo",
        "resumen",
        "summary",
        "description",
        "texto_completo",
        "texto",
        "text",
        "body_text",
        "body",
        "content",
    )
    return " ".join(str(record.get(field) or "").strip() for field in fields if record.get(field)).strip()


def enrich_article(record: dict[str, Any]) -> dict[str, Any]:
    out = dict(record)
    if not ai_enrichment_enabled():
        return out
    text = record_text(out)
    if not text:
        return out

    try:
        from agents.ner_pipeline import extract_entities_spacy

        entities = extract_entities_spacy(text[:5000])
    except Exception:
        entities = []
    try:
        from agents.sentiment_pipeline import analyze_sentiment

        sentiment = analyze_sentiment(text[:1200])
    except Exception:
        sentiment = {}

    if entities:
        out["ai_entities"] = entities
        persons = sorted({e["name"] for e in entities if e.get("type") == "Persona"})
        orgs = sorted({e["name"] for e in entities if e.get("type") == "Organizacion"})
        places = sorted({e["name"] for e in entities if e.get("type") == "Lugar"})
        out["ai_persons"] = persons
        out["ai_orgs"] = orgs
        out["ai_places"] = places
        if persons and not out.get("personas_mencionadas"):
            out["personas_mencionadas"] = ", ".join(persons[:20])
        current_tags = out.get("tags") or []
        tags = [tag for tag in current_tags if isinstance(tag, dict)] if isinstance(current_tags, list) else []
        tags.extend({"tipo_objeto": "persona", "valor": p, "confianza": 0.86} for p in persons[:20])
        tags.extend({"tipo_objeto": "organizacion", "valor": o, "confianza": 0.86} for o in orgs[:20])
        out["tags"] = _dedup_tags(tags)

    if sentiment:
        out["ai_sentiment"] = sentiment
        if out.get("sentimiento_score") is None:
            out["sentimiento_score"] = sentiment.get("score")
        if not out.get("sentimiento_label"):
            out["sentimiento_label"] = sentiment.get("label")
        if not out.get("tono"):
            out["tono"] = sentiment.get("label")
    out["procesado"] = True
    return out


def post_process_with_ai(records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return [enrich_article(record) for record in records]


def sync_records_to_local_ai(records: Iterable[dict[str, Any]], *, default_source: str = "scraper") -> dict[str, Any]:
    rows = list(records)
    if not rows:
        return {"records": 0, "documents_added": 0}
    from agents.local_intelligence import ScraperRecord, get_local_store

    converted: list[ScraperRecord] = []
    for row in rows:
        text = record_text(row)
        title = str(row.get("title") or row.get("titular") or row.get("titulo") or "")[:500]
        if not text and not title:
            continue
        converted.append(
            ScraperRecord(
                source=str(row.get("source") or row.get("fuente") or row.get("medio") or default_source),
                title=title,
                text=text or title,
                url=str(row.get("url") or ""),
                published_at=str(row.get("published_at") or row.get("fecha_publicacion") or "") or None,
                raw=row,
            )
        )
    result = get_local_store().ingest_records(converted)
    return {"records": len(rows), "documents_added": result.documents_added, "store_path": result.store_path}


def _dedup_tags(tags: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for tag in tags:
        key = (str(tag.get("tipo_objeto") or ""), str(tag.get("valor") or "").lower())
        if not key[0] or not key[1] or key in seen:
            continue
        seen.add(key)
        out.append(tag)
    return out[:80]


def json_compact(value: Any, *, limit: int = 4000) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)[:limit]
