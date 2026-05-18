"""
CLI · Backfill silencioso de enriquecimiento IA sobre datos existentes.

No introduce UI nueva: invoca los servicios `agents/brain/pipelines/*` sobre
filas YA persistidas en la BD y guarda el resultado en columnas/tablas
auxiliares. Pensado para ejecutar de noche.

Subcomandos:

    python -m pipelines.brain_enrich_existing news     --limit 200 --since 2026-04-01
    python -m pipelines.brain_enrich_existing decl     --limit 100
    python -m pipelines.brain_enrich_existing polls    --pollster CIS --month 2026-05
    python -m pipelines.brain_enrich_existing terri    --tipo municipio --limit 50
    python -m pipelines.brain_enrich_existing actors   --since 2026-01-01 --limit 500
    python -m pipelines.brain_enrich_existing dossier --tipo actor --subject "Pedro Sánchez"

Cada subcomando:
  · Lee filas crudas de la BD (interface a través de db.session).
  · Llama al pipeline brain correspondiente.
  · Persiste el output en JSON sidecar o en tabla auxiliar.
  · NUNCA modifica las tablas originales — el enriquecimiento es aditivo.

Si la BD no está disponible o las tablas no existen, escribe a `data/processed/brain_enrichment/`
para no bloquear el operador.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger("brain_enrich_existing")

_OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "processed" / "brain_enrichment"


# ─────────────────────────────────────────────────────────────────
# Sinks de persistencia (degradan a JSON si no hay BD)
# ─────────────────────────────────────────────────────────────────

def _ensure_outdir() -> Path:
    _OUT_DIR.mkdir(parents=True, exist_ok=True)
    return _OUT_DIR


def _write_jsonl(filename: str, rows: list[dict[str, Any]]) -> Path:
    out = _ensure_outdir() / filename
    with out.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, default=str) + "\n")
    return out


def _get_engine_or_none():
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.warning("BD no disponible (%s) — los resultados se escriben a JSONL", exc)
        return None


# ─────────────────────────────────────────────────────────────────
# Subcomando: news
# ─────────────────────────────────────────────────────────────────

def cmd_news(args: argparse.Namespace) -> int:
    """Enriquece artículos de prensa de la BD con NewsIntelligencePipeline."""
    from agents.brain.pipelines.news_intelligence import NewsIntelligencePipeline

    engine = _get_engine_or_none()
    rows: list[dict[str, Any]] = []
    if engine is not None:
        try:
            import pandas as pd
            from sqlalchemy import text
            df = pd.read_sql(
                text(
                    "SELECT id, titulo, contenido, url, medio, fecha_pub "
                    "FROM noticias_prensa "
                    "WHERE fecha_pub >= :since "
                    "ORDER BY fecha_pub DESC LIMIT :lim"
                ),
                engine, params={"since": args.since, "lim": int(args.limit)},
            )
            rows = df.to_dict(orient="records")
        except Exception as exc:
            logger.warning("Lectura BD news falló: %s", exc)
    if not rows:
        logger.info("No hay noticias para enriquecer.")
        return 0

    pipe = NewsIntelligencePipeline()
    items = [{
        "text": str(r.get("contenido") or "")[:8000],
        "title": str(r.get("titulo") or ""),
        "url": str(r.get("url") or ""),
        "source": str(r.get("medio") or ""),
        "date_iso": str(r.get("fecha_pub") or "")[:10] if r.get("fecha_pub") else None,
    } for r in rows]
    enriched = pipe.process_batch(items, max_workers=int(args.workers))

    out_rows = [e.to_dict() for e in enriched]
    out_path = _write_jsonl(f"news_enriched_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl", out_rows)
    print(f"[news] {len(out_rows)} artículos enriquecidos → {out_path}")
    stored = sum(1 for e in enriched if e.should_store)
    discarded = len(enriched) - stored
    print(f"       should_store={stored} · descartados={discarded}")
    return 0


# ─────────────────────────────────────────────────────────────────
# Subcomando: decl (declaraciones)
# ─────────────────────────────────────────────────────────────────

def cmd_decl(args: argparse.Namespace) -> int:
    from agents.brain.pipelines.declarations_intelligence import DeclarationsIntelligence

    engine = _get_engine_or_none()
    rows: list[dict[str, Any]] = []
    if engine is not None:
        try:
            import pandas as pd
            from sqlalchemy import text
            df = pd.read_sql(
                text(
                    "SELECT id, actor, declaracion, contexto, tema, fecha "
                    "FROM declaraciones "
                    "ORDER BY fecha DESC LIMIT :lim"
                ),
                engine, params={"lim": int(args.limit)},
            )
            rows = df.to_dict(orient="records")
        except Exception as exc:
            logger.warning("Lectura BD declaraciones falló: %s", exc)
    if not rows:
        logger.info("No hay declaraciones para enriquecer.")
        return 0

    di = DeclarationsIntelligence()
    out_rows: list[dict[str, Any]] = []
    for r in rows:
        enr = di.enrich(
            speaker=str(r.get("actor") or ""),
            quote=str(r.get("declaracion") or ""),
            venue=str(r.get("contexto") or ""),
            date_iso=str(r.get("fecha") or "")[:10] or None,
            topic=str(r.get("tema") or ""),
            speaker_history=[],
        )
        out_rows.append({"_id": r.get("id"), **enr.to_dict()})
    out_path = _write_jsonl(f"decl_enriched_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl", out_rows)
    print(f"[decl] {len(out_rows)} declaraciones enriquecidas → {out_path}")
    contras = sum(1 for r in out_rows if r.get("contradicts_previous"))
    print(f"       contradicciones detectadas: {contras}")
    return 0


# ─────────────────────────────────────────────────────────────────
# Subcomando: terri (territorios)
# ─────────────────────────────────────────────────────────────────

def cmd_terri(args: argparse.Namespace) -> int:
    from agents.brain.pipelines.territorios_enricher import TerritoriosEnricher

    engine = _get_engine_or_none()
    rows: list[dict[str, Any]] = []
    if engine is not None:
        try:
            import pandas as pd
            from sqlalchemy import text
            df = pd.read_sql(
                text(
                    "SELECT nombre, ccaa, provincia, alcalde_actual "
                    "FROM municipios "
                    "WHERE sintesis_politica IS NULL "
                    "ORDER BY poblacion DESC NULLS LAST LIMIT :lim"
                ),
                engine, params={"lim": int(args.limit)},
            )
            rows = df.to_dict(orient="records")
        except Exception as exc:
            logger.warning("Lectura BD municipios falló: %s", exc)
    if not rows:
        # Demo si no hay BD
        rows = [{"nombre": "Madrid", "ccaa": "Madrid", "provincia": "Madrid"}]

    enricher = TerritoriosEnricher()
    out_rows: list[dict[str, Any]] = []
    for r in rows:
        profile = enricher.enrich_municipio(
            nombre=str(r.get("nombre") or ""),
            ccaa=str(r.get("ccaa") or ""),
            provincia=str(r.get("provincia") or ""),
            datos_ine={},
            historico_electoral=[],
            alcalde_actual=str(r.get("alcalde_actual") or ""),
            wikipedia_excerpt="",
        )
        out_rows.append(profile.to_dict())
    out_path = _write_jsonl(f"terri_enriched_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl", out_rows)
    print(f"[terri] {len(out_rows)} fichas territoriales → {out_path}")
    avg_comp = sum(r.get("completeness_score") or 0 for r in out_rows) / max(1, len(out_rows))
    print(f"       completeness_score medio: {avg_comp:.2f}")
    if getattr(args, "persist", False):
        from agents.brain.pipelines.persistence import persist_territory_profile
        total_db = 0
        for r in out_rows:
            s = persist_territory_profile(r)
            if s.get("written_db"):
                total_db += 1
        print(f"[terri:persist] written_db={total_db}/{len(out_rows)}")
    return 0


# ─────────────────────────────────────────────────────────────────
# Subcomando: actors (grafo)
# ─────────────────────────────────────────────────────────────────

def cmd_actors(args: argparse.Namespace) -> int:
    """Extrae edges del grafo de actores desde noticias recientes."""
    from agents.brain.pipelines.actor_graph_extractor import ActorGraphExtractor

    engine = _get_engine_or_none()
    rows: list[dict[str, Any]] = []
    actor_catalog: list[dict[str, Any]] = []
    if engine is not None:
        try:
            import pandas as pd
            from sqlalchemy import text
            # Cargar catálogo
            try:
                df_cat = pd.read_sql(
                    text("SELECT id AS actor_id, nombre AS name, nombre_corto AS short_name, "
                         "apellido AS surname, cargo AS role, partido AS party FROM actores LIMIT 5000"),
                    engine,
                )
                actor_catalog = df_cat.to_dict(orient="records")
            except Exception as exc:
                logger.warning("Catálogo actores no disponible: %s", exc)
            df = pd.read_sql(
                text(
                    "SELECT id, titulo, contenido, medio, fecha_pub "
                    "FROM noticias_prensa "
                    "WHERE fecha_pub >= :since "
                    "ORDER BY fecha_pub DESC LIMIT :lim"
                ),
                engine, params={"since": args.since, "lim": int(args.limit)},
            )
            rows = df.to_dict(orient="records")
        except Exception as exc:
            logger.warning("Lectura BD news falló: %s", exc)

    if not rows:
        logger.info("No hay noticias para extraer grafo.")
        return 0

    extractor = ActorGraphExtractor(actor_catalog=actor_catalog)
    all_edges = []
    for r in rows:
        try:
            edges = extractor.extract_from_news(
                text=str(r.get("contenido") or "")[:5000],
                date_iso=str(r.get("fecha_pub") or "")[:10] or None,
                source=str(r.get("medio") or ""),
            )
            all_edges.extend(edges)
        except Exception as exc:
            logger.warning("Edge extraction falló para row %s: %s", r.get("id"), exc)

    aggregated = extractor.aggregate_edges(all_edges, min_count=2)
    changes = extractor.detect_relation_changes(all_edges)

    out_path1 = _write_jsonl(
        f"actor_edges_raw_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl",
        [e.to_dict() for e in all_edges],
    )
    out_path2 = _write_jsonl(
        f"actor_edges_aggregated_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl",
        [a.__dict__ for a in aggregated],
    )
    out_path3 = _write_jsonl(
        f"actor_relation_changes_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl",
        changes,
    )
    print(f"[actors] edges crudos:    {len(all_edges)} → {out_path1}")
    print(f"[actors] edges agregados: {len(aggregated)} → {out_path2}")
    print(f"[actors] cambios:         {len(changes)} → {out_path3}")
    if getattr(args, "persist", False):
        from agents.brain.pipelines.persistence import persist_graph_edges
        s = persist_graph_edges([e.to_dict() for e in all_edges])
        print(f"[actors:persist] db_rows={s['written_db']} err={s['error']}")
    return 0


# ─────────────────────────────────────────────────────────────────
# Subcomando: dossier
# ─────────────────────────────────────────────────────────────────

def cmd_dossier(args: argparse.Namespace) -> int:
    """Genera un dossier completo (actor / issue / territorio / campaña)."""
    from agents.brain.pipelines.dossier_builder import DossierBuilder
    db = DossierBuilder()

    if args.tipo == "actor":
        out = db.build_actor_dossier(args.subject, depth=args.depth)
    elif args.tipo == "issue":
        out = db.build_issue_dossier(args.subject, depth=args.depth)
    elif args.tipo == "territory":
        out = db.build_territory_dossier(args.subject, depth=args.depth)
    elif args.tipo == "campaign":
        out = db.build_campaign_dossier(
            args.subject, candidato=args.subject,
            partido=args.partido or "", territorio=args.territorio or "España",
            depth=args.depth,
        )
    else:
        logger.error("tipo desconocido: %s", args.tipo)
        return 2
    out_path = _write_jsonl(
        f"dossier_{args.tipo}_{args.subject.replace(' ', '_')}_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl",
        [out.to_dict()],
    )
    print(f"[dossier:{args.tipo}] {args.subject} → {out_path}")
    if not out.ok:
        print(f"  ⚠ error: {out.error}")
        return 1
    print(f"  completeness_score: {out.completeness_score:.2f}")
    print(f"  stages OK: {out.stages_ok}")
    if out.stages_err:
        print(f"  stages err: {list(out.stages_err.keys())}")
    if getattr(args, "persist", False):
        from agents.brain.pipelines.persistence import (
            persist_actor_dossier, persist_issue_dossier, persist_territory_profile,
        )
        d = out.to_dict()
        if args.tipo == "actor":
            s = persist_actor_dossier(d)
        elif args.tipo == "issue":
            s = persist_issue_dossier(d)
        elif args.tipo == "territory":
            # Persistimos como territory_profile (más útil para D2/maps)
            s = persist_territory_profile({
                **d.get("structured_data", {}),
                "nombre": d["subject"], "tipo": "municipio",
                "ccaa": d.get("structured_data", {}).get("ccaa", ""),
                "provincia": "",
                "completeness_score": out.completeness_score,
                "confidence": out.confidence,
                "url_wikipedia": d.get("structured_data", {}).get("url_wikipedia", ""),
            })
        else:
            s = {"written_db": False, "written_jsonl": False, "error": "tipo no persistido"}
        print(f"[dossier:persist] db={s.get('written_db')} jsonl={s.get('written_jsonl')} err={s.get('error')}")
    return 0


# ─────────────────────────────────────────────────────────────────
# Subcomando: discover (actores nuevos)
# ─────────────────────────────────────────────────────────────────

def cmd_discover(args: argparse.Namespace) -> int:
    """Descubre actores políticos no catalogados a partir de noticias."""
    from agents.brain.pipelines.actor_discovery import ActorDiscovery
    from agents.brain.pipelines.persistence import persist_actor_proposals

    engine = _get_engine_or_none()
    rows: list[dict[str, Any]] = []
    catalog: list[dict[str, Any]] = []
    if engine is not None:
        try:
            import pandas as pd
            from sqlalchemy import text
            try:
                df_cat = pd.read_sql(
                    text("SELECT id AS actor_id, nombre AS name, nombre_corto AS short_name, "
                         "apellido AS surname FROM actores LIMIT 5000"),
                    engine,
                )
                catalog = df_cat.to_dict(orient="records")
            except Exception as exc:
                logger.warning("Catálogo actores no disponible: %s", exc)
            df = pd.read_sql(
                text("SELECT contenido, fecha_pub, medio FROM noticias_prensa "
                     "WHERE fecha_pub >= :since ORDER BY fecha_pub DESC LIMIT :lim"),
                engine, params={"since": args.since, "lim": int(args.limit)},
            )
            rows = df.to_dict(orient="records")
        except Exception as exc:
            logger.warning("Lectura BD news falló: %s", exc)
    if not rows:
        logger.info("No hay noticias para discover.")
        return 0

    disc = ActorDiscovery(actor_catalog=catalog)
    proposals = disc.discover_from_news_batch(rows, min_mentions=int(args.min_mentions))
    out_rows = [p.to_dict() for p in proposals]
    out_path = _write_jsonl(
        f"actor_proposals_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl", out_rows,
    )
    print(f"[discover] {len(out_rows)} candidatos → {out_path}")
    political = sum(1 for p in out_rows if p.get("is_political_figure"))
    print(f"           is_political_figure={political}/{len(out_rows)}")
    if args.persist:
        s = persist_actor_proposals(out_rows)
        print(f"[discover:persist] db={s['written_db']} jsonl={s['written_jsonl']} err={s['error']}")
    return 0


# ─────────────────────────────────────────────────────────────────
# CLI principal
# ─────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    parser = argparse.ArgumentParser(
        prog="brain_enrich_existing",
        description="Enriquece datos existentes con GroqBrain (sin UI · servicio invisible).",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # news
    p_news = sub.add_parser("news", help="Enriquecer noticias_prensa")
    p_news.add_argument("--limit", default=200, type=int)
    p_news.add_argument("--since", default=(date.today() - timedelta(days=30)).isoformat())
    p_news.add_argument("--workers", default=4, type=int)
    p_news.set_defaults(func=cmd_news)

    # decl
    p_decl = sub.add_parser("decl", help="Enriquecer declaraciones")
    p_decl.add_argument("--limit", default=100, type=int)
    p_decl.set_defaults(func=cmd_decl)

    # terri
    p_terri = sub.add_parser("terri", help="Generar fichas de municipios incompletos")
    p_terri.add_argument("--limit", default=50, type=int)
    p_terri.add_argument("--persist", action="store_true", help="Persistir a BD si está disponible")
    p_terri.set_defaults(func=cmd_terri)

    # actors
    p_actors = sub.add_parser("actors", help="Extraer grafo de actores desde noticias")
    p_actors.add_argument("--limit", default=500, type=int)
    p_actors.add_argument("--since", default=(date.today() - timedelta(days=30)).isoformat())
    p_actors.add_argument("--persist", action="store_true")
    p_actors.set_defaults(func=cmd_actors)

    # discover
    p_disc = sub.add_parser("discover", help="Descubrir actores nuevos en hemeroteca")
    p_disc.add_argument("--limit", default=500, type=int)
    p_disc.add_argument("--since", default=(date.today() - timedelta(days=30)).isoformat())
    p_disc.add_argument("--min-mentions", default=3, type=int)
    p_disc.add_argument("--persist", action="store_true")
    p_disc.set_defaults(func=cmd_discover)

    # ficha-territorial (nuevo · 12 bloques)
    p_ft = sub.add_parser("ficha-territorio", help="Construir ficha territorial completa")
    p_ft.add_argument("--cod-ine", required=False, help="Código INE 5 dígitos para municipio")
    p_ft.add_argument("--ccaa", required=False, help="Nombre de CCAA")
    p_ft.add_argument("--persist", action="store_true")
    def _cmd_ft(args):
        from agents.brain.pipelines.ficha_territorial_builder import FichaTerritorialBuilder
        from agents.brain.pipelines.persistence_fichas import persist_ficha_territorial
        b = FichaTerritorialBuilder()
        if args.cod_ine:
            ficha = b.build_municipio(args.cod_ine)
        elif args.ccaa:
            ficha = b.build_ccaa(args.ccaa)
        else:
            print("Pasa --cod-ine o --ccaa")
            return 2
        d = ficha.model_dump()
        out = _write_jsonl(f"ficha_territorial_{ficha.id}_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl", [d])
        print(f"[ficha-territorio] {ficha.nombre} ({ficha.tipo}) "
              f"completeness={ficha.completeness:.2f} bloques_ok={len(ficha.bloques_ok)} "
              f"errs={list(ficha.bloques_err.keys())} → {out}")
        if args.persist:
            s = persist_ficha_territorial(d)
            print(f"[ficha-territorio:persist] db={s['written_db']} err={s['error']}")
        return 0
    p_ft.set_defaults(func=_cmd_ft)

    # ficha-politico (nuevo · 12 bloques)
    p_fp = sub.add_parser("ficha-politico", help="Construir ficha de político completa")
    p_fp.add_argument("--qid", required=False, help="QID Wikidata (Q12345)")
    p_fp.add_argument("--nombre", required=False, help="Nombre completo (fallback)")
    p_fp.add_argument("--persist", action="store_true")
    def _cmd_fp(args):
        from agents.brain.pipelines.ficha_politico_builder import FichaPoliticoBuilder
        from agents.brain.pipelines.persistence_fichas import persist_ficha_politico
        b = FichaPoliticoBuilder()
        if args.qid:
            ficha = b.build_by_qid(args.qid)
        elif args.nombre:
            ficha = b.build_by_name(args.nombre)
        else:
            print("Pasa --qid o --nombre")
            return 2
        d = ficha.model_dump()
        out = _write_jsonl(f"ficha_politico_{ficha.id}_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl", [d])
        print(f"[ficha-politico] {ficha.nombre} completeness={ficha.completeness:.2f} "
              f"bloques_ok={len(ficha.bloques_ok)} errs={list(ficha.bloques_err.keys())} → {out}")
        if args.persist:
            s = persist_ficha_politico(d)
            print(f"[ficha-politico:persist] db={s['written_db']} err={s['error']}")
        return 0
    p_fp.set_defaults(func=_cmd_fp)

    # backfill-politicos (batch)
    p_bp = sub.add_parser("backfill-politicos",
                          help="Construir fichas de políticos activos en lote (Wikidata)")
    p_bp.add_argument("--limit", default=20, type=int)
    p_bp.add_argument("--persist", action="store_true")
    def _cmd_bp(args):
        from agents.brain.pipelines.data_sources.wikidata_politicos import list_politicos_activos
        from agents.brain.pipelines.ficha_politico_builder import FichaPoliticoBuilder
        from agents.brain.pipelines.persistence_fichas import persist_ficha_politico
        candidatos = list_politicos_activos(limit=int(args.limit))
        print(f"[backfill-politicos] {len(candidatos)} candidatos")
        b = FichaPoliticoBuilder()
        for i, c in enumerate(candidatos):
            try:
                ficha = b.build_by_qid(c["qid"])
                d = ficha.model_dump()
                print(f"  [{i+1}/{len(candidatos)}] {c['nombre']} ({c['qid']}) "
                      f"completeness={ficha.completeness:.2f}")
                if args.persist:
                    persist_ficha_politico(d)
            except Exception as exc:
                print(f"  [{i+1}/{len(candidatos)}] {c['nombre']} ERROR: {exc}")
        return 0
    p_bp.set_defaults(func=_cmd_bp)

    # dossier
    p_dossier = sub.add_parser("dossier", help="Generar dossier completo")
    p_dossier.add_argument("--tipo", required=True, choices=["actor", "issue", "territory", "campaign"])
    p_dossier.add_argument("--subject", required=True)
    p_dossier.add_argument("--partido", default="")
    p_dossier.add_argument("--territorio", default="")
    p_dossier.add_argument("--depth", default="medium", choices=["short", "medium", "deep"])
    p_dossier.add_argument("--persist", action="store_true")
    p_dossier.set_defaults(func=cmd_dossier)

    args = parser.parse_args(argv)
    return int(args.func(args) or 0)


if __name__ == "__main__":
    sys.exit(main())
