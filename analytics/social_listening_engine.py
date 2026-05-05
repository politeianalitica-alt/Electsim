"""Motor de social listening multi-plataforma para ElectSim España.

Provee modelos Pydantic v2 y funciones de análisis para menciones sociales:
sentiment, alcance, influencia, share of voice y detección de amplificación
coordinada.
"""

from __future__ import annotations

import hashlib
import random
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SocialMention(BaseModel):
    """Mención individual en una plataforma social."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: str
    platform: str
    author: str
    content: str
    reach_estimate: int = 0
    engagement: int = 0
    sentiment: float = 0.0
    entities: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    language: str = "es"
    timestamp: datetime
    url: str = ""
    is_verified_account: bool = False
    is_political_actor: bool = False


class InfluenceScore(BaseModel):
    """Puntuación de influencia agregada para un actor."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    actor: str
    platform: str
    follower_count: int = 0
    engagement_rate: float = 0.0
    avg_sentiment_about: float = 0.0
    reach_estimate: int = 0
    influence_index: float = 0.0
    trending: bool = False


# ── Helpers ─────────────────────────────────────────────────────────────────


def _normalize(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-záéíóúñü0-9 ]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _shingle_signature(text: str, k: int = 4) -> set[str]:
    tokens = _normalize(text).split()
    if len(tokens) < k:
        return {" ".join(tokens)} if tokens else set()
    return {" ".join(tokens[i : i + k]) for i in range(len(tokens) - k + 1)}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


# ── Análisis ────────────────────────────────────────────────────────────────


def compute_engagement_rate(mentions: list[SocialMention], actor: str) -> float:
    """Calcula la tasa media de engagement por reach del actor."""
    try:
        own = [m for m in mentions if m.author == actor]
        if not own:
            return 0.0
        total_reach = sum(max(m.reach_estimate, 1) for m in own)
        total_eng = sum(m.engagement for m in own)
        if total_reach <= 0:
            return 0.0
        return round(total_eng / total_reach, 4)
    except Exception:
        return 0.0


def compute_share_of_voice(
    mentions: list[SocialMention], entities: list[str]
) -> dict[str, float]:
    """Devuelve % de menciones por entidad sobre el total con menciones a la lista."""
    try:
        if not mentions or not entities:
            return {e: 0.0 for e in entities}
        counts: dict[str, int] = {e: 0 for e in entities}
        total = 0
        for m in mentions:
            ents = {e.lower() for e in (m.entities or [])}
            text_low = (m.content or "").lower()
            matched = False
            for e in entities:
                if e.lower() in ents or e.lower() in text_low:
                    counts[e] += 1
                    matched = True
            if matched:
                total += 1
        if total <= 0:
            return {e: 0.0 for e in entities}
        return {e: round(100.0 * counts[e] / total, 2) for e in entities}
    except Exception:
        return {e: 0.0 for e in entities}


def compute_sentiment_per_entity(
    mentions: list[SocialMention],
) -> dict[str, dict[str, float]]:
    """Sentiment medio + % positivos/negativos + count por entidad."""
    try:
        bucket: dict[str, list[float]] = defaultdict(list)
        for m in mentions:
            for e in m.entities or []:
                bucket[e].append(float(m.sentiment))
        result: dict[str, dict[str, float]] = {}
        for ent, vals in bucket.items():
            n = len(vals)
            avg = sum(vals) / n if n else 0.0
            pos = sum(1 for v in vals if v > 0.15) / n if n else 0.0
            neg = sum(1 for v in vals if v < -0.15) / n if n else 0.0
            result[ent] = {
                "avg": round(avg, 3),
                "positive_pct": round(100.0 * pos, 2),
                "negative_pct": round(100.0 * neg, 2),
                "count": float(n),
            }
        return result
    except Exception:
        return {}


def compute_topic_trends(
    mentions: list[SocialMention], hours: int = 24
) -> list[dict]:
    """Tópicos en tendencia comparando ventana actual vs ventana previa."""
    try:
        if not mentions:
            return []
        now = max((m.timestamp for m in mentions), default=datetime.utcnow())
        cutoff_now = now - timedelta(hours=hours)
        cutoff_prev = now - timedelta(hours=hours * 2)
        cur: Counter[str] = Counter()
        prev: Counter[str] = Counter()
        for m in mentions:
            if m.timestamp >= cutoff_now:
                cur.update(m.topics or [])
            elif m.timestamp >= cutoff_prev:
                prev.update(m.topics or [])
        trends: list[dict] = []
        for topic, count in cur.most_common():
            prev_count = prev.get(topic, 0)
            base = max(prev_count, 1)
            growth = 100.0 * (count - prev_count) / base
            trends.append(
                {
                    "topic": topic,
                    "count_24h": int(count),
                    "count_prev": int(prev_count),
                    "growth_pct": round(growth, 2),
                }
            )
        trends.sort(key=lambda x: (x["growth_pct"], x["count_24h"]), reverse=True)
        return trends
    except Exception:
        return []


def detect_coordinated_amplification(
    mentions: list[SocialMention], min_cluster_size: int = 5
) -> list[dict]:
    """Detecta clusters de mensajes muy similares publicados en ventana corta."""
    try:
        if not mentions or len(mentions) < min_cluster_size:
            return []
        sigs = [(m, _shingle_signature(m.content)) for m in mentions]
        used: set[int] = set()
        clusters: list[dict] = []
        for i, (m_i, sig_i) in enumerate(sigs):
            if i in used or not sig_i:
                continue
            members = [i]
            for j in range(i + 1, len(sigs)):
                if j in used:
                    continue
                m_j, sig_j = sigs[j]
                if not sig_j:
                    continue
                if _jaccard(sig_i, sig_j) < 0.55:
                    continue
                delta = abs((m_j.timestamp - m_i.timestamp).total_seconds())
                if delta > 3600:
                    continue
                members.append(j)
            if len(members) >= min_cluster_size:
                authors = sorted({sigs[k][0].author for k in members})
                if len(authors) < 3:
                    continue
                used.update(members)
                cluster_mentions = [sigs[k][0] for k in members]
                tmin = min(x.timestamp for x in cluster_mentions)
                tmax = max(x.timestamp for x in cluster_mentions)
                clusters.append(
                    {
                        "cluster_id": hashlib.md5(
                            (m_i.id + str(len(members))).encode()
                        ).hexdigest()[:10],
                        "size": len(members),
                        "unique_authors": len(authors),
                        "sample_text": m_i.content[:200],
                        "window_seconds": int((tmax - tmin).total_seconds()),
                        "platforms": sorted(
                            {x.platform for x in cluster_mentions}
                        ),
                        "authors": authors[:20],
                        "evidence_ids": [x.id for x in cluster_mentions[:10]],
                    }
                )
        clusters.sort(key=lambda c: c["size"], reverse=True)
        return clusters
    except Exception:
        return []


def compute_influence_index(
    actor: str,
    mentions: list[SocialMention],
    all_mentions: list[SocialMention],
) -> InfluenceScore:
    """Calcula un índice de influencia 0-100 para el actor."""
    try:
        own = [m for m in mentions if m.author == actor]
        about = [
            m for m in all_mentions if actor.lower() in {e.lower() for e in m.entities}
        ]
        platform = own[0].platform if own else (about[0].platform if about else "twitter")
        follower_count = max((m.reach_estimate for m in own), default=0)
        eng_rate = compute_engagement_rate(mentions, actor)
        avg_sent = (
            sum(m.sentiment for m in about) / len(about) if about else 0.0
        )
        reach = sum(m.reach_estimate for m in own)
        # Índice compuesto: mezcla reach (log), engagement, recurrencia
        import math

        reach_score = min(40.0, math.log10(max(reach, 1)) * 8.0)
        eng_score = min(30.0, eng_rate * 1500.0)
        mention_score = min(20.0, len(about) * 1.5)
        verified_bonus = 10.0 if (own and own[0].is_verified_account) else 0.0
        influence = round(
            min(100.0, reach_score + eng_score + mention_score + verified_bonus), 2
        )
        trending = len(about) >= 5 and avg_sent > -0.2
        return InfluenceScore(
            actor=actor,
            platform=platform,
            follower_count=follower_count,
            engagement_rate=eng_rate,
            avg_sentiment_about=round(avg_sent, 3),
            reach_estimate=reach,
            influence_index=influence,
            trending=trending,
        )
    except Exception:
        return InfluenceScore(actor=actor, platform="twitter")


# ── Demo data ───────────────────────────────────────────────────────────────


_DEMO_AUTHORS = [
    "@psoe", "@populares", "@vox_es", "@sumar", "@podemos_es",
    "@junts_x_cat", "@erc", "@eajpnv", "@ehbildu", "@cupnacional",
    "@ana_periodista", "@carlos_analista", "@maria_activist", "@juan_ciudadano",
    "@laura_economista", "@pedro_politologo", "@elena_periodista", "@diego_lawyer",
]
_DEMO_TOPICS = [
    "presupuestos", "vivienda", "inmigracion", "ucrania", "energia",
    "amnistia", "educacion", "sanidad", "ia_regulacion", "pensiones",
]
_DEMO_ENTITIES = [
    "Pedro Sánchez", "Núñez Feijóo", "Santiago Abascal", "Yolanda Díaz",
    "PSOE", "PP", "VOX", "Sumar", "ERC", "Junts",
]
_DEMO_PLATFORMS = ["twitter", "facebook", "instagram", "tiktok", "news"]
_DEMO_TEXTS = [
    "El gobierno avanza en la reforma de los presupuestos generales",
    "La oposición rechaza la nueva propuesta sobre vivienda",
    "Cumbre europea sobre energía y la posición de España",
    "Polémica por las declaraciones sobre inmigración",
    "Nueva ley de educación entra en debate parlamentario",
    "Manifestaciones por el coste de la vida en Madrid",
    "Pacto autonómico bloquea iniciativa legislativa",
    "Análisis del impacto económico del último decreto",
]


def _demo_mentions(n: int = 50, hours: int = 24) -> list[SocialMention]:
    """Genera menciones realistas para desarrollo y tests."""
    rng = random.Random(42)
    now = datetime.utcnow()
    mentions: list[SocialMention] = []
    for i in range(n):
        author = rng.choice(_DEMO_AUTHORS)
        platform = rng.choice(_DEMO_PLATFORMS)
        text = rng.choice(_DEMO_TEXTS)
        ents = rng.sample(_DEMO_ENTITIES, k=rng.randint(1, 3))
        topics = rng.sample(_DEMO_TOPICS, k=rng.randint(1, 2))
        ts = now - timedelta(minutes=rng.randint(0, hours * 60))
        sentiment = round(rng.uniform(-0.9, 0.9), 2)
        is_political = author in {
            "@psoe", "@populares", "@vox_es", "@sumar", "@podemos_es",
            "@junts_x_cat", "@erc", "@eajpnv", "@ehbildu", "@cupnacional",
        }
        is_verified = is_political or rng.random() < 0.2
        reach = (
            rng.randint(50_000, 800_000) if is_political else rng.randint(200, 25_000)
        )
        engagement = int(reach * rng.uniform(0.005, 0.05))
        mentions.append(
            SocialMention(
                id=f"m_{i:05d}",
                platform=platform,
                author=author,
                content=text + f" #{rng.choice(_DEMO_TOPICS)}",
                reach_estimate=reach,
                engagement=engagement,
                sentiment=sentiment,
                entities=ents,
                topics=topics,
                language="es",
                timestamp=ts,
                url=f"https://example.com/{platform}/{i}",
                is_verified_account=is_verified,
                is_political_actor=is_political,
            )
        )
    return mentions


__all__ = [
    "SocialMention",
    "InfluenceScore",
    "compute_engagement_rate",
    "compute_share_of_voice",
    "compute_sentiment_per_entity",
    "compute_topic_trends",
    "detect_coordinated_amplification",
    "compute_influence_index",
    "_demo_mentions",
]
