"""
Actor Intelligence Engine
=========================

Adaptado al stack del proyecto (SQLAlchemy session sync + psycopg + Ollama LLM)
en lugar del asyncpg async original.

Responsabilidades:
  - Recompute de scores de relevancia/exposure/sentiment para actores activos
  - Construcción de grafo de relaciones desde co-ocurrencia en news_articles
  - Auto-discovery de figuras públicas a partir de ai_entities.personas
  - Ingestión de menciones (link news_articles → actors)
  - Linkado de narrativas a actores
"""
from __future__ import annotations

import json
import logging
import re
from collections import Counter
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.engine import Connection

log = logging.getLogger(__name__)

# ── Mapas de partidos ─────────────────────────────────────────────────────────
PARTY_COLORS = {
    "PSOE":         "#E03A3E",
    "PP":           "#1F77FF",
    "VOX":          "#5BC035",
    "Sumar":        "#D81E5B",
    "Junts":        "#00C2A8",
    "ERC":          "#F4B400",
    "PNV":          "#1D8042",
    "Bildu":        "#A4D65E",
    "EH Bildu":     "#A4D65E",
    "Podemos":      "#6E2A78",
    "Ciudadanos":   "#FF6B35",
    "Independiente":"#94A3B8",
}

KNOWN_PARTIES = list(PARTY_COLORS.keys())
PARTY_PATTERNS = {p: re.compile(rf"\b{re.escape(p)}\b", re.IGNORECASE) for p in KNOWN_PARTIES}

ROLE_KEYWORDS = [
    "presidente", "presidenta", "ministro", "ministra", "portavoz",
    "secretario", "secretaria", "vicepresidente", "vicepresidenta",
    "consejero", "consejera", "eurodiputado", "diputado", "senador",
    "alcalde", "alcaldesa",
]

# Pattern: nombres de 2-4 palabras con mayúsculas iniciales
NAME_RE = re.compile(
    r"\b([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+(?:de\s+(?:los?\s+|las?\s+)?)?[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){1,3})\b"
)


class ActorEngine:
    """Encapsula toda la lógica de inteligencia de actores.

    Constructor recibe una conexión SQLAlchemy.
    """

    def __init__(self, conn: Connection, llm_client: Any = None):
        self.conn = conn
        self.llm = llm_client

    # ── Scoring ───────────────────────────────────────────────────────────────
    def recompute_actor_scores(self) -> dict:
        """Recalcula scores para todos los actores activos.

        Devuelve {processed: int, errors: int}.
        """
        rows = self.conn.execute(text("SELECT id, name FROM actors WHERE is_active = TRUE")).mappings().all()
        ok, err = 0, 0
        for r in rows:
            try:
                self._score_actor(str(r["id"]), r["name"])
                ok += 1
            except Exception as e:
                log.warning(f"score_actor failed for {r['name']}: {e}")
                err += 1
        try:
            self.conn.commit()
        except Exception:
            pass
        return {"processed": ok, "errors": err}

    def _score_actor(self, actor_id: str, name: str) -> None:
        # Mentions counts
        row = self.conn.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE published_at > NOW() - INTERVAL '24 hours')   AS count_24h,
                COUNT(*) FILTER (WHERE published_at > NOW() - INTERVAL '7 days')      AS count_7d,
                COALESCE(AVG(sentiment), 0)::float    AS avg_sent,
                COALESCE(AVG(relevance), 0.5)::float  AS avg_rel
            FROM actor_mentions WHERE actor_id = :aid
        """), {"aid": actor_id}).mappings().fetchone()

        c24 = int(row["count_24h"] or 0)
        c7 = int(row["count_7d"] or 0)
        s_avg = float(row["avg_sent"] or 0)
        r_avg = float(row["avg_rel"] or 0.5)

        # Exposure
        exposure = min(100.0, (c24 * 3 + c7 * 0.5) * r_avg * 10)
        # Approval
        approval = max(0.0, min(100.0, (s_avg + 1) / 2 * 100))

        # Sentiment trend
        recent = float(self.conn.execute(text("""
            SELECT COALESCE(AVG(sentiment), 0)::float FROM actor_mentions
            WHERE actor_id = :aid AND published_at > NOW() - INTERVAL '3 days'
        """), {"aid": actor_id}).scalar() or 0.0)
        older = float(self.conn.execute(text("""
            SELECT COALESCE(AVG(sentiment), 0)::float FROM actor_mentions
            WHERE actor_id = :aid
              AND published_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '3 days'
        """), {"aid": actor_id}).scalar() or 0.0)
        delta = recent - older
        sentiment = "up" if delta > 0.05 else "down" if delta < -0.05 else "stable"

        relevance_score = min(100.0, exposure * 0.6 + (c7 / 10) * 0.4 * 10)

        self.conn.execute(text("""
            UPDATE actors SET
                exposure          = :exp,
                approval          = :app,
                sentiment         = :sent,
                relevance_score   = :rel,
                mention_count_24h = :c24,
                mention_count_7d  = :c7,
                updated_at        = NOW()
            WHERE id = :aid
        """), {
            "aid": actor_id, "exp": exposure, "app": approval, "sent": sentiment,
            "rel": relevance_score, "c24": c24, "c7": c7,
        })
        self.conn.execute(text("""
            INSERT INTO actor_relevance_history (actor_id, score) VALUES (:aid, :s)
        """), {"aid": actor_id, "s": relevance_score})

    # ── Relation graph from co-occurrence ─────────────────────────────────────
    def rebuild_relations_from_cooccurrence(self, window_days: int = 30) -> dict:
        """Construye actor_relations desde co-ocurrencia en actor_mentions.

        Mismo artículo (por url o title) que menciona ≥2 actores → arista.
        Tipo de relación según sentiment medio (positivo→aliado, negativo→rival, mixto→mediatica).
        """
        actors = self.conn.execute(text("SELECT id, name FROM actors WHERE is_active = TRUE")).mappings().all()
        name_to_id = {a["name"].lower(): str(a["id"]) for a in actors}

        rows = self.conn.execute(text("""
            SELECT title, raw_snippet, sentiment, actor_id
            FROM actor_mentions
            WHERE published_at > NOW() - (:days || ' days')::interval
        """), {"days": str(window_days)}).mappings().all()

        # Bucket por title — mismo title implica mismo artículo aproximadamente
        articles_by_title: dict[str, dict] = {}
        for r in rows:
            t = (r["title"] or "")[:200]
            if not t:
                continue
            slot = articles_by_title.setdefault(t, {"actors": set(), "snippet": r["raw_snippet"] or "", "sentiments": []})
            slot["actors"].add(str(r["actor_id"]))
            if r["sentiment"] is not None:
                slot["sentiments"].append(float(r["sentiment"]))

        # Co-occurrence
        coocc: dict[tuple[str, str], dict] = {}
        for slot in articles_by_title.values():
            ids = sorted(slot["actors"])
            if len(ids) < 2:
                continue
            avg = sum(slot["sentiments"]) / len(slot["sentiments"]) if slot["sentiments"] else 0.0
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    pair = (ids[i], ids[j])
                    rec = coocc.setdefault(pair, {"count": 0, "sent_sum": 0.0})
                    rec["count"] += 1
                    rec["sent_sum"] += avg

        n_inserted = 0
        for (a_id, b_id), data in coocc.items():
            count = data["count"]
            avg_sent = data["sent_sum"] / count if count else 0.0
            weight = min(1.0, count / 20.0)
            rel_type = "aliado" if avg_sent > 0.2 else "rival" if avg_sent < -0.2 else "mediatica"
            try:
                self.conn.execute(text("""
                    INSERT INTO actor_relations (actor_a_id, actor_b_id, relation_type, weight, last_seen_at)
                    VALUES (:a, :b, :t, :w, NOW())
                    ON CONFLICT (actor_a_id, actor_b_id, relation_type)
                    DO UPDATE SET weight = :w, last_seen_at = NOW()
                """), {"a": a_id, "b": b_id, "t": rel_type, "w": weight})
                n_inserted += 1
            except Exception as e:
                log.debug(f"relation upsert error {a_id}/{b_id}: {e}")

        try:
            self.conn.commit()
        except Exception:
            pass
        return {"articles_with_cooccurrence": len(coocc), "relations_upserted": n_inserted}

    # ── Auto-discovery from news_articles ─────────────────────────────────────
    def discover_new_actors_from_news(self, lookback_hours: int = 24, min_mentions: int = 3) -> list[str]:
        """Detecta figuras emergentes en news_articles que no están en actors aún.

        Estrategia (sin dependencia de LLM):
        1. Extraer ai_entities.personas de últimos N hours
        2. Filtrar por mínimo de menciones
        3. Inferir partido por co-mención (ai_entities.organizaciones)
        4. Insertar en actors con auto_created=TRUE
        """
        # Existing actor names
        existing = {r["name"].lower() for r in self.conn.execute(text("SELECT name FROM actors")).mappings()}

        # Pull news_articles personas
        rows = self.conn.execute(text("""
            SELECT ai_entities, ai_sentiment, ai_relevance
            FROM news_articles
            WHERE ai_entities IS NOT NULL
              AND scraped_at > NOW() - (:h || ' hours')::interval
        """), {"h": str(lookback_hours)}).mappings().all()

        candidate_counts: dict[str, dict] = {}
        for r in rows:
            ent = r["ai_entities"] if isinstance(r["ai_entities"], dict) else {}
            personas = ent.get("personas") or []
            orgs = ent.get("organizaciones") or []
            for p in personas:
                # "Nombre Apellido (cargo)"
                m = re.match(r"^\s*(.+?)\s*(?:\(([^)]+)\))?\s*$", p)
                if not m:
                    continue
                name = m.group(1).strip()
                cargo = (m.group(2) or "").strip()
                if not name or len(name) < 4 or len(name) > 70:
                    continue
                if name.lower() in existing:
                    continue
                slot = candidate_counts.setdefault(name, {"count": 0, "cargo": cargo, "orgs": Counter(), "rel_sum": 0.0})
                slot["count"] += 1
                if cargo and not slot["cargo"]:
                    slot["cargo"] = cargo
                slot["rel_sum"] += float(r["ai_relevance"] or 5)
                for o in orgs:
                    o_clean = re.sub(r"\s*\([^)]*\)", "", o).strip()
                    slot["orgs"][o_clean] += 1

        created = []
        for name, slot in candidate_counts.items():
            if slot["count"] < min_mentions:
                continue
            # Inferir partido desde organizaciones más mencionadas
            party = "Independiente"
            for org_name, _ in slot["orgs"].most_common(5):
                for p in KNOWN_PARTIES:
                    if p.lower() in org_name.lower():
                        party = p
                        break
                if party != "Independiente":
                    break
            color = PARTY_COLORS.get(party, "#94A3B8")
            relevance = min(100.0, slot["rel_sum"] / max(1, slot["count"]) * (slot["count"] / 2))
            try:
                rid = self.conn.execute(text("""
                    INSERT INTO actors (name, party, party_color, role, bio, source, auto_created, relevance_score)
                    VALUES (:n, :p, :c, :role, :bio, 'auto_discovered', TRUE, :rel)
                    ON CONFLICT (name) DO NOTHING
                    RETURNING id
                """), {
                    "n": name, "p": party, "c": color,
                    "role": slot["cargo"] or "Figura pública",
                    "bio": f"Detectado automáticamente el {datetime.utcnow().strftime('%d/%m/%Y')} con {slot['count']} menciones.",
                    "rel": round(relevance, 1),
                }).scalar()
                if rid:
                    created.append(str(rid))
                    log.info(f"Auto-discovered actor: {name} ({party})")
            except Exception as e:
                log.warning(f"auto-discover insert error for {name}: {e}")

        try:
            self.conn.commit()
        except Exception:
            pass
        return created

    # ── Mention ingestion ─────────────────────────────────────────────────────
    def ingest_news_articles_mentions(self, lookback_hours: int = 48) -> dict:
        """Por cada actor activo, busca news_articles que lo mencionen y crea actor_mentions.

        Idempotente: UNIQUE (actor_id, title) impide duplicados.
        """
        actors = self.conn.execute(text("SELECT id, name FROM actors WHERE is_active = TRUE")).mappings().all()

        articles = self.conn.execute(text("""
            SELECT id, title, url, source_name, scraped_at, ai_summary, ai_entities,
                   COALESCE(
                     CASE ai_sentiment WHEN 'positivo' THEN 0.6 WHEN 'negativo' THEN -0.6 WHEN 'mixto' THEN 0.0 ELSE 0.0 END,
                     0.0
                   ) AS sentiment_num,
                   COALESCE(ai_relevance::float / 10.0, 0.5) AS relevance_norm
            FROM news_articles
            WHERE scraped_at > NOW() - (:h || ' hours')::interval
        """), {"h": str(lookback_hours)}).mappings().all()

        n_inserted = 0
        for actor in actors:
            name_lc = (actor["name"] or "").lower()
            if not name_lc:
                continue
            for art in articles:
                title_lc = (art["title"] or "").lower()
                summary_lc = (art["ai_summary"] or "").lower()
                # Más rápido: check name in title or summary first
                in_text = name_lc in title_lc or name_lc in summary_lc
                if not in_text:
                    # check ai_entities.personas
                    ent = art["ai_entities"] if isinstance(art["ai_entities"], dict) else {}
                    personas = ent.get("personas") or []
                    in_text = any(name_lc in (p or "").lower() for p in personas)
                if not in_text:
                    continue
                try:
                    self.conn.execute(text("""
                        INSERT INTO actor_mentions
                          (actor_id, title, url, source, published_at, sentiment, relevance, summary, raw_snippet, article_id)
                        VALUES (:aid, :title, :url, :src, :pub, :s, :r, :sum, :snip, :artid)
                        ON CONFLICT (actor_id, title) DO NOTHING
                    """), {
                        "aid":   str(actor["id"]),
                        "title": art["title"],
                        "url":   art["url"],
                        "src":   art["source_name"],
                        "pub":   art["scraped_at"],
                        "s":     float(art["sentiment_num"] or 0.0),
                        "r":     float(art["relevance_norm"] or 0.5),
                        "sum":   (art["ai_summary"] or "")[:500],
                        "snip":  (art["ai_summary"] or "")[:300],
                        "artid": int(art["id"]) if art["id"] is not None else None,
                    })
                    n_inserted += 1
                except Exception as e:
                    log.debug(f"mention insert error {actor['name']}: {e}")

        try:
            self.conn.commit()
        except Exception:
            pass
        return {"articles_scanned": len(articles), "actors_scanned": len(actors), "mentions_inserted": n_inserted}

    # ── Narrative linkage ─────────────────────────────────────────────────────
    def link_narrative_to_actors(self, narrative: dict) -> int:
        """Recibe un cluster de narrativa y crea actor_narratives para los actores que aparecen."""
        text_blob = f"{narrative.get('frame_label','')} {narrative.get('description','')} {narrative.get('central_claim','')}".lower()
        actors = self.conn.execute(text("SELECT id, name FROM actors WHERE is_active = TRUE")).mappings().all()
        n = 0
        for actor in actors:
            if actor["name"].lower() in text_blob:
                try:
                    self.conn.execute(text("""
                        INSERT INTO actor_narratives (actor_id, frame_label, description, lifecycle, velocity, intensity, last_seen_at)
                        VALUES (:aid, :frame, :desc, :life, :vel, :int, NOW())
                        ON CONFLICT (actor_id, frame_label)
                        DO UPDATE SET last_seen_at = NOW(), intensity = :int, velocity = :vel
                    """), {
                        "aid":   str(actor["id"]),
                        "frame": narrative.get("frame_label", "Sin título")[:200],
                        "desc":  (narrative.get("description") or "")[:500],
                        "life":  narrative.get("lifecycle", "emergente"),
                        "vel":   narrative.get("velocity", "estable"),
                        "int":   float(narrative.get("intensity", 0.5)),
                    })
                    n += 1
                except Exception as e:
                    log.debug(f"narrative link error: {e}")
        try:
            self.conn.commit()
        except Exception:
            pass
        return n
