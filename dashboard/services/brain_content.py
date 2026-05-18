"""
Brain Content Service · capa de lectura silenciosa para el contenido
enriquecido generado por los pipelines (`agents/brain/pipelines/*`).

Las páginas (Streamlit y Next.js via API) llaman a estas funciones para
obtener:
  · fichas territoriales completas (brain_territory_profiles)
  · dossieres de actor (brain_actor_dossiers)
  · dossieres de issue (brain_issue_dossiers)
  · edges del grafo de actores (brain_actor_graph_edges)
  · propuestas de actores nuevos (brain_actor_proposals)

Si la BD no tiene la tabla o está vacía, intenta leer el JSONL más reciente
en `data/processed/brain_enrichment/`. Si tampoco, devuelve None — la
página renderiza con los datos crudos existentes (no rompe la UI).

Diseño:
  · Streamlit-friendly: usa @st.cache_data(ttl=...) cuando es importable.
  · Standalone-friendly: cae a un cache LRU si Streamlit no está.
  · Read-only: nunca escribe.

Filosofía: el analista nunca sabe si los datos vienen de BD o JSONL —
ve la página igual, pero con contenido mucho más completo cuando los
pipelines ya han pasado.
"""
from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_OUT_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "processed" / "brain_enrichment"


# ─────────────────────────────────────────────────────────────────
# Decorador de caché compatible Streamlit + standalone
# ─────────────────────────────────────────────────────────────────

def _maybe_cache(ttl: int = 600):
    """Devuelve `st.cache_data(ttl=ttl)` si Streamlit está cargado, sino LRU."""
    try:
        import streamlit as st  # type: ignore
        return st.cache_data(ttl=int(ttl), show_spinner=False)
    except Exception:
        def _decorator(fn):
            return lru_cache(maxsize=256)(fn)
        return _decorator


# ─────────────────────────────────────────────────────────────────
# Engine helper
# ─────────────────────────────────────────────────────────────────

def _get_engine_or_none():
    if not os.environ.get("DATABASE_URL"):
        return None
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.debug("brain_content: engine unavailable (%s)", exc)
        return None


def _last_jsonl(prefix: str) -> Path | None:
    """Devuelve el JSONL más reciente con prefijo dado en el out-dir."""
    if not _OUT_DIR.exists():
        return None
    matches = sorted(_OUT_DIR.glob(f"{prefix}*.jsonl"), reverse=True)
    return matches[0] if matches else None


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except (ValueError, TypeError):
                    continue
    except Exception as exc:
        logger.debug("read_jsonl %s falló: %s", path, exc)
    return rows


# ─────────────────────────────────────────────────────────────────
# TERRITORY PROFILES
# ─────────────────────────────────────────────────────────────────

@_maybe_cache(ttl=600)
def get_territory_profile(nombre: str, ccaa: str = "") -> dict[str, Any] | None:
    """Lee la ficha enriquecida más reciente de un territorio.

    Try order:
      1. BD `brain_territory_profiles` (más nueva por created_at)
      2. JSONL `territory_profiles_*.jsonl` (busca por nombre+ccaa)
      3. None
    """
    if not nombre:
        return None
    key_n = nombre.strip().lower()
    key_c = (ccaa or "").strip().lower()

    # 1) BD
    engine = _get_engine_or_none()
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                q = text("""
                    SELECT content_json FROM brain_territory_profiles
                    WHERE LOWER(nombre) = :n
                      AND (LOWER(COALESCE(ccaa,'')) = :c OR :c = '')
                    ORDER BY created_at DESC LIMIT 1
                """)
                row = conn.execute(q, {"n": key_n, "c": key_c}).fetchone()
                if row and row[0]:
                    try:
                        return json.loads(row[0])
                    except (ValueError, TypeError):
                        pass
        except Exception as exc:
            logger.debug("get_territory_profile BD falló: %s", exc)

    # 2) JSONL fallback
    p = _last_jsonl("territory_profiles_") or _last_jsonl("terri_enriched_")
    if p is not None:
        for row in _read_jsonl(p):
            if (
                str(row.get("nombre", "")).lower() == key_n
                and (key_c == "" or str(row.get("ccaa", "")).lower() == key_c)
            ):
                return row
    return None


@_maybe_cache(ttl=600)
def list_enriched_territories(tipo: str | None = None, limit: int = 500) -> list[dict[str, Any]]:
    """Lista (nombre, ccaa, completeness, tipo) de territorios con ficha enriquecida."""
    engine = _get_engine_or_none()
    rows: list[dict[str, Any]] = []
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                q = text("""
                    SELECT DISTINCT ON (tipo, nombre, ccaa)
                        tipo, nombre, ccaa, completeness, confidence, created_at
                    FROM brain_territory_profiles
                    {where}
                    ORDER BY tipo, nombre, ccaa, created_at DESC
                    LIMIT :lim
                """.format(where="WHERE tipo = :tipo" if tipo else ""))
                params = {"lim": int(limit)}
                if tipo:
                    params["tipo"] = tipo
                for r in conn.execute(q, params).mappings():
                    rows.append(dict(r))
            return rows
        except Exception as exc:
            logger.debug("list_enriched_territories BD falló: %s", exc)

    # JSONL fallback (puede haber duplicados — dedupe por nombre)
    p = _last_jsonl("territory_profiles_") or _last_jsonl("terri_enriched_")
    if p is not None:
        seen: set[tuple[str, str]] = set()
        for r in _read_jsonl(p):
            if tipo and r.get("tipo") != tipo:
                continue
            key = (str(r.get("nombre", "")), str(r.get("ccaa", "")))
            if key in seen:
                continue
            seen.add(key)
            rows.append({
                "tipo": r.get("tipo"),
                "nombre": r.get("nombre"),
                "ccaa": r.get("ccaa"),
                "completeness": r.get("completeness_score"),
                "confidence": r.get("confidence"),
            })
            if len(rows) >= limit:
                break
    return rows


# ─────────────────────────────────────────────────────────────────
# ACTOR DOSSIERS
# ─────────────────────────────────────────────────────────────────

@_maybe_cache(ttl=600)
def get_actor_dossier(actor_name: str, depth: str | None = None) -> dict[str, Any] | None:
    """Lee el dossier más reciente de un actor (any depth o el específico)."""
    if not actor_name:
        return None
    key = actor_name.strip().lower()

    engine = _get_engine_or_none()
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                if depth:
                    q = text("""
                        SELECT content_json FROM brain_actor_dossiers
                        WHERE LOWER(actor_name) = :n AND depth = :d
                        ORDER BY created_at DESC LIMIT 1
                    """)
                    row = conn.execute(q, {"n": key, "d": depth}).fetchone()
                else:
                    q = text("""
                        SELECT content_json FROM brain_actor_dossiers
                        WHERE LOWER(actor_name) = :n
                        ORDER BY created_at DESC LIMIT 1
                    """)
                    row = conn.execute(q, {"n": key}).fetchone()
                if row and row[0]:
                    try:
                        return json.loads(row[0])
                    except (ValueError, TypeError):
                        pass
        except Exception as exc:
            logger.debug("get_actor_dossier BD falló: %s", exc)

    # JSONL fallback
    p = _last_jsonl("actor_dossiers_") or _last_jsonl("dossier_actor_")
    if p is not None:
        for r in _read_jsonl(p):
            if str(r.get("subject", "")).lower() == key:
                if depth and r.get("depth") != depth:
                    continue
                return r
    return None


# ─────────────────────────────────────────────────────────────────
# ISSUE DOSSIERS
# ─────────────────────────────────────────────────────────────────

@_maybe_cache(ttl=600)
def get_issue_dossier(issue_name: str) -> dict[str, Any] | None:
    if not issue_name:
        return None
    key = issue_name.strip().lower()
    engine = _get_engine_or_none()
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                row = conn.execute(
                    text("""
                        SELECT content_json FROM brain_issue_dossiers
                        WHERE LOWER(issue_name) = :n
                        ORDER BY created_at DESC LIMIT 1
                    """),
                    {"n": key},
                ).fetchone()
                if row and row[0]:
                    return json.loads(row[0])
        except Exception as exc:
            logger.debug("get_issue_dossier BD falló: %s", exc)

    p = _last_jsonl("issue_dossiers_") or _last_jsonl("dossier_issue_")
    if p is not None:
        for r in _read_jsonl(p):
            if str(r.get("subject", "")).lower() == key:
                return r
    return None


# ─────────────────────────────────────────────────────────────────
# ACTOR GRAPH EDGES
# ─────────────────────────────────────────────────────────────────

@_maybe_cache(ttl=600)
def get_actor_edges(actor_id: str | None = None, *, min_strength: float = 0.0,
                    limit: int = 500) -> list[dict[str, Any]]:
    """Lista edges del grafo. Si `actor_id` se da, filtra por ego-network."""
    engine = _get_engine_or_none()
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                if actor_id:
                    q = text("""
                        SELECT * FROM brain_actor_graph_edges
                        WHERE (actor_from = :a OR actor_to = :a)
                          AND strength >= :ms
                        ORDER BY date_iso DESC, strength DESC
                        LIMIT :lim
                    """)
                    params = {"a": actor_id, "ms": float(min_strength), "lim": int(limit)}
                else:
                    q = text("""
                        SELECT * FROM brain_actor_graph_edges
                        WHERE strength >= :ms
                        ORDER BY date_iso DESC, strength DESC
                        LIMIT :lim
                    """)
                    params = {"ms": float(min_strength), "lim": int(limit)}
                return [dict(r) for r in conn.execute(q, params).mappings()]
        except Exception as exc:
            logger.debug("get_actor_edges BD falló: %s", exc)

    # JSONL fallback (lee el archivo de edges crudos agregados)
    p = _last_jsonl("actor_edges_aggregated_") or _last_jsonl("actor_edges_raw_")
    if p is None:
        return []
    rows = _read_jsonl(p)
    if actor_id:
        rows = [r for r in rows
                if r.get("actor_from") == actor_id
                or r.get("actor_to") == actor_id
                or r.get("actor_a") == actor_id
                or r.get("actor_b") == actor_id]
    rows = [r for r in rows if float(r.get("strength") or r.get("avg_strength") or 0) >= float(min_strength)]
    return rows[: int(limit)]


# ─────────────────────────────────────────────────────────────────
# ACTOR PROPOSALS (review queue)
# ─────────────────────────────────────────────────────────────────

@_maybe_cache(ttl=300)
def get_actor_proposals(
    *,
    only_unreviewed: bool = True,
    only_political: bool = True,
    min_confidence: float = 0.5,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Devuelve propuestas de actores nuevos para revisión humana."""
    engine = _get_engine_or_none()
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                filters = []
                params: dict[str, Any] = {"mc": float(min_confidence), "lim": int(limit)}
                if only_unreviewed:
                    filters.append("reviewed = FALSE")
                if only_political:
                    filters.append("is_political_figure = TRUE")
                filters.append("confidence >= :mc")
                q = text(f"""
                    SELECT * FROM brain_actor_proposals
                    WHERE {' AND '.join(filters)}
                    ORDER BY mention_count DESC, confidence DESC
                    LIMIT :lim
                """)
                return [dict(r) for r in conn.execute(q, params).mappings()]
        except Exception as exc:
            logger.debug("get_actor_proposals BD falló: %s", exc)

    p = _last_jsonl("actor_proposals_")
    if p is None:
        return []
    rows = _read_jsonl(p)
    if only_political:
        rows = [r for r in rows if r.get("is_political_figure")]
    rows = [r for r in rows if float(r.get("confidence") or 0) >= min_confidence]
    rows.sort(key=lambda r: (r.get("mention_count") or 0, r.get("confidence") or 0), reverse=True)
    return rows[:int(limit)]


# ─────────────────────────────────────────────────────────────────
# Helpers de mezclado para no romper shapes de datos existentes
# ─────────────────────────────────────────────────────────────────

def enrich_actor_dict(actor_dict: dict[str, Any]) -> dict[str, Any]:
    """Toma un actor (con shape existente del dashboard) y lo enriquece
    con datos del dossier si está disponible. Conserva las claves originales
    no vacías; rellena las vacías; añade `_brain_enriched=True` como flag.

    NO añade claves nuevas si rompen el render — solo añade contenido en
    campos vacíos/cortos.
    """
    if not isinstance(actor_dict, dict):
        return actor_dict
    nombre = (actor_dict.get("nombre") or actor_dict.get("name") or "").strip()
    if not nombre:
        return actor_dict
    dossier = get_actor_dossier(nombre)
    if not dossier:
        return actor_dict

    enriched = dict(actor_dict)
    sections = dossier.get("sections") or {}
    sd = dossier.get("structured_data") or {}

    # bio
    if not enriched.get("bio") or len(str(enriched.get("bio") or "")) < 60:
        new_bio = dossier.get("executive_summary") or dossier.get("one_liner") or ""
        if new_bio:
            enriched["bio"] = new_bio[:1500]

    # cargo / rol
    if not enriched.get("cargo") and not enriched.get("rol"):
        if sd.get("role"):
            enriched["cargo"] = sd["role"]

    # partido
    if not enriched.get("partido") and sd.get("party"):
        enriched["partido"] = sd["party"]

    # estilo + fortalezas + debilidades + palancas (en claves "narrative_*"
    # para no chocar con keys legacy)
    if sections.get("estilo_politico"):
        enriched.setdefault("brain_estilo_politico", sections["estilo_politico"])
    if sections.get("momentum"):
        enriched.setdefault("brain_momentum", sections["momentum"])
    if sections.get("fortalezas"):
        enriched.setdefault("brain_fortalezas", sections["fortalezas"])
    if sections.get("debilidades"):
        enriched.setdefault("brain_debilidades", sections["debilidades"])
    if sections.get("predicted_next_move"):
        enriched.setdefault("brain_next_move", sections["predicted_next_move"])
    if dossier.get("risks"):
        enriched.setdefault("brain_risks", dossier["risks"])
    if dossier.get("red_flags"):
        enriched.setdefault("brain_red_flags", dossier["red_flags"])
    if dossier.get("relations"):
        enriched.setdefault("brain_relations", dossier["relations"])
    if dossier.get("citations"):
        enriched.setdefault("brain_citations", dossier["citations"])

    enriched["_brain_enriched"] = True
    enriched["_brain_completeness"] = dossier.get("completeness_score", 0.0)
    enriched["_brain_confidence"] = dossier.get("confidence", 0.0)
    return enriched


def enrich_territory_dict(territory_dict: dict[str, Any]) -> dict[str, Any]:
    """Igual que `enrich_actor_dict` pero para municipios/CCAA."""
    if not isinstance(territory_dict, dict):
        return territory_dict
    nombre = (
        territory_dict.get("nombre")
        or territory_dict.get("name")
        or territory_dict.get("municipio")
        or ""
    ).strip()
    ccaa = (
        territory_dict.get("ccaa")
        or territory_dict.get("comunidad")
        or ""
    ).strip()
    if not nombre:
        return territory_dict
    profile = get_territory_profile(nombre, ccaa)
    if not profile:
        return territory_dict

    enriched = dict(territory_dict)

    # Rellenamos campos vacíos solo
    field_map = [
        ("gentilicio", "gentilicio"),
        ("comarca", "comarca"),
        ("provincia", "provincia"),
        ("alcalde", "alcalde_o_presidente"),
        ("partido_alcalde", "partido_alcalde"),
        ("url_wikipedia", "url_wikipedia"),
        ("image_url", "image_url"),
        ("perfil_voto", "perfil_voto"),
    ]
    for k_existing, k_profile in field_map:
        if not enriched.get(k_existing) and profile.get(k_profile):
            enriched[k_existing] = profile[k_profile]

    # Campos narrativos solo si faltan
    if not enriched.get("sintesis") and profile.get("sintesis_ejecutiva"):
        enriched["sintesis"] = profile["sintesis_ejecutiva"][:600]
    if not enriched.get("perfil_socio") and profile.get("perfil_socioeconomico"):
        enriched["perfil_socio"] = profile["perfil_socioeconomico"]
    if not enriched.get("historia") and profile.get("historia_politica_reciente"):
        enriched["historia"] = profile["historia_politica_reciente"]
    if not enriched.get("dinamica") and profile.get("dinamica_actual"):
        enriched["dinamica"] = profile["dinamica_actual"]

    # Listas brain_* (para que la página las renderice opcionalmente)
    if profile.get("issues_principales"):
        enriched.setdefault("brain_issues", profile["issues_principales"])
    if profile.get("factores_basculantes"):
        enriched.setdefault("brain_factores_basculantes", profile["factores_basculantes"])
    if profile.get("riesgos_locales"):
        enriched.setdefault("brain_riesgos", profile["riesgos_locales"])
    if profile.get("palancas_movilizacion"):
        enriched.setdefault("brain_palancas", profile["palancas_movilizacion"])
    if profile.get("segmentos_voto"):
        enriched.setdefault("brain_segmentos", profile["segmentos_voto"])
    if profile.get("mensajes_que_funcionan"):
        enriched.setdefault("brain_mensajes", profile["mensajes_que_funcionan"])
    if profile.get("territorios_similares"):
        enriched.setdefault("brain_analogos", profile["territorios_similares"])
    if profile.get("es_bisagra") is not None:
        enriched.setdefault("brain_es_bisagra", bool(profile["es_bisagra"]))

    enriched["_brain_enriched"] = True
    enriched["_brain_completeness"] = profile.get("completeness_score", 0.0)
    return enriched


def enrich_actor_list(actors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Batch enrich de una lista de actores."""
    return [enrich_actor_dict(a) for a in (actors or [])]


def enrich_territory_list(territories: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Batch enrich de una lista de territorios."""
    return [enrich_territory_dict(t) for t in (territories or [])]
