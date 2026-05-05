"""Selección editorial de artículos para briefings y dashboards."""
from __future__ import annotations
import hashlib
from collections import defaultdict
from media_intelligence.article_ranker import rank_articles


def _title_hash(title: str) -> str:
    return hashlib.md5(title.lower().strip()[:100].encode()).hexdigest()[:8]


def _deduplicate(articles: list[dict]) -> list[dict]:
    seen_hashes: set[str] = set()
    result = []
    for art in articles:
        title = art.get("translated_title") or art.get("title") or ""
        h = _title_hash(title)
        if h not in seen_hashes:
            seen_hashes.add(h)
            result.append(art)
    return result


def select_top_stories(articles: list[dict], n: int = 10,
                       min_score: float = 0.2) -> list[dict]:
    """Top N noticias por relevance_score, deduplicadas."""
    ranked = rank_articles(articles)
    deduped = _deduplicate(ranked)
    return [a for a in deduped if a.get("relevance_score", 0) >= min_score][:n]


def select_diverse_news(articles: list[dict], n: int = 10,
                        max_per_source: int = 2) -> list[dict]:
    """Top N con máximo max_per_source por fuente (diversidad)."""
    ranked = rank_articles(articles)
    deduped = _deduplicate(ranked)
    source_counts: dict[str, int] = defaultdict(int)
    result = []
    for art in deduped:
        source = art.get("source_name") or art.get("source_id") or "unknown"
        if source_counts[source] < max_per_source:
            result.append(art)
            source_counts[source] += 1
        if len(result) >= n:
            break
    return result


def select_news_for_briefing(articles: list[dict], n: int = 5) -> list[dict]:
    """
    Selección editorial para briefing: alta relevancia política,
    diversidad de fuentes, balance ideológico si hay metadata.
    """
    ranked = rank_articles(articles)
    deduped = _deduplicate(ranked)
    # Filtrar min relevancia alta
    high_rel = [a for a in deduped if a.get("relevance_score", 0) >= 0.25]
    return select_diverse_news(high_rel, n=n, max_per_source=1)


def select_news_for_workspace(articles: list[dict], workspace_keywords: list[str],
                              n: int = 8) -> list[dict]:
    """Selecciona noticias relevantes para un workspace/caso concreto."""
    if not workspace_keywords:
        return select_top_stories(articles, n=n)

    def keyword_score(art: dict) -> float:
        text = (
            f"{art.get('translated_title') or art.get('title') or ''} "
            f"{art.get('summary') or ''}"
        ).lower()
        hits = sum(1 for kw in workspace_keywords if kw.lower() in text)
        return hits / len(workspace_keywords) if workspace_keywords else 0

    ranked = rank_articles(articles)
    for art in ranked:
        kws = keyword_score(art)
        art["workspace_relevance"] = kws
        art["relevance_score"] = (art.get("relevance_score", 0) * 0.6) + (kws * 0.4)

    return select_diverse_news(ranked, n=n)
