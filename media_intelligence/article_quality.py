"""Evaluador de calidad de artículos."""
from __future__ import annotations
import re
from datetime import datetime, timezone
from media_intelligence.schemas import ArticleQualityScore

# Patrones de clickbait
_CLICKBAIT_PATTERNS = [
    r"no te lo crees", r"te dejará sin palabras", r"lo que nadie te cuenta",
    r"esto es lo que realmente", r"sorprenderá", r"increíble", r"shocking",
    r"you won't believe", r"mind.?blowing", r"what they don't want you",
    r"\d+ cosas que", r"\d+ razones por", r"\d+ ways to", r"\d+ things",
    r"haz click", r"descúbrelo aquí", r"click here", r"must see",
]

# Términos de deporte NO político
_SPORTS_TERMS = [
    r"\b(gol|goles|futbol|fútbol|balompié|primera división|segunda división)\b",
    r"\b(liga española|la liga|champions league|copa del rey|supercopa)\b",
    r"\b(real madrid|barcelona|atletico|atlético|sevilla|valencia|bilbao)\b",
    r"\b(partido|marcador|temporada deportiva|fichaje|entrenador|delantero|portero)\b",
    r"\b(nba|nfl|formula 1|f1|motogp|ciclismo|tenis|golf|rugby|baloncesto)\b",
    r"\b(gana|pierde|empata|derrota|victoria|campeón deportivo)\b",
]

# Indicadores políticos (si están presentes, el deporte puede ser político)
_POLITICAL_SPORTS_OVERRIDE = [
    r"(política|gobierno|ministro|presidente|estado|corrupc|investig|fiscal|juicio|blanqueo)",
    r"(independen|separatis|cataluña|euzkadi|galicia|autonomía en el deporte)",
    r"(fifa|uefa corrupción|manipulación|amaño|dopaje|escándalo institucional)",
]


def score_article_quality(article: dict) -> ArticleQualityScore:
    """Puntúa la calidad de un artículo. Score 0-1 donde 1 es máxima calidad."""
    title = article.get("title") or article.get("translated_title") or ""
    summary = article.get("summary") or article.get("translated_summary") or ""
    text = f"{title} {summary}".lower()
    pub_date = article.get("published_at") or article.get("pub_date")

    flags: list[str] = []
    score = 1.0

    # Título vacío
    if not title.strip():
        flags.append("empty_title")
        score -= 0.5

    # Clickbait
    is_clickbait = any(re.search(p, text, re.I) for p in _CLICKBAIT_PATTERNS)
    if is_clickbait:
        flags.append("clickbait")
        score -= 0.3

    # Deporte no político
    is_sports = any(re.search(p, text, re.I) for p in _SPORTS_TERMS)
    is_political_sports = any(re.search(p, text, re.I) for p in _POLITICAL_SPORTS_OVERRIDE)
    is_sports_non_political = is_sports and not is_political_sports
    if is_sports_non_political:
        flags.append("sports_non_political")
        score -= 0.4

    # Entretenimiento
    entertain_terms = [
        r"\b(celebrity|famoso|actriz|actor|cantante|modelo)\b.*\b(vida|novio|novia|boda|divorcio|foto)\b"
    ]
    is_entertainment = any(re.search(p, text, re.I) for p in entertain_terms)
    if is_entertainment:
        flags.append("entertainment")
        score -= 0.2

    # Baja densidad informativa
    word_count = len(text.split())
    is_low_density = word_count < 8
    if is_low_density:
        flags.append("low_density")
        score -= 0.2

    # Antigüedad (más de 7 días → penaliza)
    is_stale = False
    if pub_date:
        try:
            if isinstance(pub_date, str):
                from email.utils import parsedate_to_datetime
                try:
                    parsed = parsedate_to_datetime(pub_date)
                    age_days = (datetime.now(timezone.utc) - parsed).days
                    if age_days > 7:
                        is_stale = True
                        flags.append("stale")
                        score -= min(0.3, age_days * 0.03)
                except Exception:
                    pass
        except Exception:
            pass

    # Fuente baja prioridad
    is_low_priority = article.get("source_priority", 3) >= 5
    if is_low_priority:
        flags.append("low_priority_source")
        score -= 0.1

    return ArticleQualityScore(
        article_id=article.get("article_id") or article.get("id") or "",
        total_score=max(0.0, min(1.0, score)),
        is_duplicate=article.get("is_duplicate", False),
        is_clickbait=is_clickbait,
        is_sports_non_political=is_sports_non_political,
        is_entertainment=is_entertainment,
        is_stale=is_stale,
        is_low_density=is_low_density,
        is_empty_title=not title.strip(),
        is_low_priority_source=is_low_priority,
        flags=flags,
    )


def filter_low_quality(articles: list[dict], min_score: float = 0.4) -> list[dict]:
    """Filtra artículos por encima del umbral de calidad."""
    result = []
    for article in articles:
        qs = score_article_quality(article)
        if qs.total_score >= min_score:
            article["quality_score"] = qs.total_score
            article["quality_flags"] = qs.flags
            result.append(article)
    return result
