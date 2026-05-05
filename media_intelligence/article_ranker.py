"""Ranking de artículos por relevancia política y editorial."""
from __future__ import annotations
import re
from datetime import datetime, timezone
from media_intelligence.article_quality import score_article_quality

# Términos de relevancia política (España)
_POLITICAL_TERMS = [
    r"\b(gobierno|ministro|ministra|presidente|presidenta|congreso|senado|cortes)\b",
    r"\b(partido|psoe|pp|vox|podemos|sumar|junts|erc|pnv|ciudadanos|cs)\b",
    r"\b(sánchez|feijóo|abascal|yolanda díaz|alberto núñez|presidente del gobierno)\b",
    r"\b(ley|decreto|reforma|presupuesto|votación|moción|investidura|coalición)\b",
    r"\b(elecciones|electoral|campaña|escaño|voto|urnas|jornada electoral)\b",
    r"\b(unión europea|bruselas|comisión europea|parlamento europeo|consejo)\b",
    r"\b(economía|inflación|paro|desempleo|pib|deuda|déficit|banco central)\b",
    r"\b(tribunal|juez|juicio|fiscal|condena|sentencia|corrupción|caso)\b",
    r"\b(manifestación|huelga|protesta|crisis|acuerdo|pacto|negociación)\b",
    r"\b(cataluña|euskadi|galicia|independencia|autonomía|estatuto)\b",
    r"\b(sanidad|educación|vivienda|pensiones|transporte|medio ambiente|energía)\b",
    r"\b(otan|defensa|ejército|seguridad nacional|espionaje|servicios de inteligencia)\b",
    r"\b(inmigración|asilo|refugiados|frontera|ceuta|melilla|patera)\b",
]

# Actores políticos clave
_KEY_ACTORS = [
    "sánchez", "feijóo", "abascal", "yolanda díaz", "junqueras", "puigdemont",
    "pablocasado", "iglesias", "montero", "bolaños", "robles", "marlaska",
    "trump", "macron", "von der leyen", "nato", "merz",
]


def _political_score(text: str) -> float:
    """Score 0-1 de relevancia política por conteo de términos."""
    text_lower = text.lower()
    matches = sum(1 for p in _POLITICAL_TERMS if re.search(p, text_lower, re.I))
    return min(1.0, matches / 5)


def _actor_score(text: str) -> float:
    text_lower = text.lower()
    matches = sum(1 for a in _KEY_ACTORS if a in text_lower)
    return min(1.0, matches / 3)


def _novelty_score(pub_date: str | None) -> float:
    if not pub_date:
        return 0.5
    try:
        from email.utils import parsedate_to_datetime
        parsed = parsedate_to_datetime(pub_date)
        age_hours = (datetime.now(timezone.utc) - parsed).total_seconds() / 3600
        return max(0.0, 1.0 - age_hours / 72)
    except Exception:
        return 0.5


def _source_credibility_score(article: dict) -> float:
    tier_scores = {"A": 1.0, "B": 0.7, "C": 0.4, "unknown": 0.3}
    tier = article.get("credibility_tier", "B")
    base = tier_scores.get(tier, 0.5)
    priority = article.get("source_priority", 3)
    priority_mult = {1: 1.0, 2: 0.85, 3: 0.7, 4: 0.5, 5: 0.3}.get(priority, 0.5)
    return base * priority_mult


def rank_article(article: dict) -> float:
    """
    Calcula score total 0-1.
    Pesos:
      0.20 relevancia política
      0.15 novedad
      0.15 credibilidad/fuente
      0.15 conexión actores
      0.10 intensidad/riesgo
      0.10 impacto territorial
      0.15 political_relevance explícita del artículo
    """
    text = (
        f"{article.get('translated_title') or article.get('title') or ''} "
        f"{article.get('summary') or ''}"
    )

    pol = _political_score(text)
    nov = _novelty_score(article.get("published_at") or article.get("pub_date"))
    cred = _source_credibility_score(article)
    actor = _actor_score(text)

    # Intensidad/riesgo: términos de crisis
    risk_terms = [r"\b(crisis|urgente|emergencia|colapso|quiebra|dimisión|destitución)\b"]
    risk = min(1.0, sum(1 for p in risk_terms if re.search(p, text, re.I)) / 2)

    # Territorial
    terr_terms = [r"\b(españa|madrid|barcelona|cataluña|país vasco|galicia|andalucía)\b"]
    terr = min(1.0, sum(1 for p in terr_terms if re.search(p, text, re.I)) / 3)

    score = (
        0.20 * pol
        + 0.15 * nov
        + 0.15 * cred
        + 0.15 * actor
        + 0.10 * risk
        + 0.10 * terr
        + 0.15 * article.get("political_relevance", 0.5)
    )

    # Penalizaciones de calidad
    qs = score_article_quality(article)
    if qs.is_sports_non_political:
        score *= 0.2
    if qs.is_clickbait:
        score *= 0.4
    if qs.is_entertainment:
        score *= 0.3
    if qs.is_duplicate:
        score *= 0.05
    if qs.is_stale:
        score *= 0.6

    return round(max(0.0, min(1.0, score)), 4)


def rank_articles(articles: list[dict]) -> list[dict]:
    """Ordena artículos por relevance_score descendente."""
    for article in articles:
        article["relevance_score"] = rank_article(article)
    return sorted(articles, key=lambda a: a.get("relevance_score", 0), reverse=True)
