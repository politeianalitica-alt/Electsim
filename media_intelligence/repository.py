"""Repositorio DB para media_intelligence."""
from __future__ import annotations
import logging
from media_intelligence.schemas import MediaArticle, MediaSourceHealth

log = logging.getLogger(__name__)
_ARTICLES: dict[str, MediaArticle] = {}


def save_article(article: MediaArticle) -> None:
    _ARTICLES[article.article_id] = article
    try:
        from db.session import get_raw_conn
        conn = get_raw_conn()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO media_items
                  (item_id, source_id, title, url, published_at, lang, summary, content_hash, fetched_at, tenant_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (item_id) DO NOTHING
            """, (
                article.article_id,
                article.source_id,
                article.title[:500],
                article.url[:1000],
                article.published_at,
                article.lang,
                article.summary[:2000] if article.summary else None,
                article.content_hash,
                article.fetched_at,
                article.tenant_id,
            ))
            conn.commit()
    except Exception as e:
        log.debug("save_article DB error: %s", e)


def list_articles(
    limit: int = 100,
    lang: str | None = None,
    min_priority: int | None = None,
) -> list[MediaArticle]:
    articles = list(_ARTICLES.values())
    if lang:
        articles = [a for a in articles if a.lang == lang]
    if min_priority is not None:
        articles = [a for a in articles if a.source_priority <= min_priority]
    return sorted(articles, key=lambda a: a.fetched_at, reverse=True)[:limit]


def get_article(article_id: str) -> MediaArticle | None:
    return _ARTICLES.get(article_id)
