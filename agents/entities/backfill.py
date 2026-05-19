"""Backfill idempotente · vuelca catálogos curados a la tabla entities.

Fuentes que se importan a la ontología unificada:

  parties_catalog (apps/visual-oscar/lib/parties/catalog.ts → JSON)
  ccaa_catalog    (apps/visual-oscar/lib/territorial/ccaa-catalog.ts → JSON)
  figures         (lib/figures/catalog-extended.ts → JSON)
  municipios      (data/static/municipios_canon.csv si existe)
  sectors         (agents/brain/pipelines/data_sources/sector_taxonomy.SECTOR_TAXONOMY)

Construye además links básicos derivados:
  - president_of (actor_person → territory/government)
  - member_of    (actor_person → party)
  - regulates    (institution → sector)
  - located_in   (entity → territory)

Idempotente · se puede ejecutar N veces sin duplicar (upsert por kind+slug).

CLI:
  python -m agents.entities.backfill --dry-run   (sin escribir BD)
  python -m agents.entities.backfill              (escribe)
"""
from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Loaders desde TS catalogs (parsing pragmático sin Node)
# ─────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_parties_from_python() -> list[dict[str, Any]]:
    """Catálogo de partidos · reutilizamos la versión JSON o reconstruimos
    desde el TS si fuera necesario.

    Para evitar dependencia de Node aquí, mantenemos un mirror corto con
    los 15 partidos canónicos del sistema. Si esta lista queda obsoleta,
    el frontend sigue siendo la fuente principal; este backfill solo
    semilla la ontología.
    """
    return [
        {"slug": "psoe",      "siglas": "PSOE",  "nombre": "Partido Socialista Obrero Español", "color": "#E1322D", "familia": "Socialdemocracia",     "fundacion": 1879, "ambito": "Estatal",  "wikipedia_qid": "Q47750"},
        {"slug": "pp",        "siglas": "PP",    "nombre": "Partido Popular",                    "color": "#1F4E8C", "familia": "Conservador",          "fundacion": 1989, "ambito": "Estatal",  "wikipedia_qid": "Q12270"},
        {"slug": "vox",       "siglas": "VOX",   "nombre": "VOX",                                "color": "#5BA02E", "familia": "Derecha radical",      "fundacion": 2013, "ambito": "Estatal",  "wikipedia_qid": "Q12895813"},
        {"slug": "sumar",     "siglas": "Sumar", "nombre": "Sumar",                              "color": "#D43F8D", "familia": "Izquierda alternativa","fundacion": 2023, "ambito": "Estatal",  "wikipedia_qid": "Q117317793"},
        {"slug": "junts",     "siglas": "Junts", "nombre": "Junts per Catalunya",                "color": "#1FA89B", "familia": "Independentista",      "fundacion": 2018, "ambito": "Catalán",  "wikipedia_qid": "Q56541036"},
        {"slug": "erc",       "siglas": "ERC",   "nombre": "Esquerra Republicana de Catalunya",  "color": "#E8A030", "familia": "Independentista",      "fundacion": 1931, "ambito": "Catalán",  "wikipedia_qid": "Q188707"},
        {"slug": "bildu",     "siglas": "EH Bildu","nombre": "EH Bildu",                          "color": "#3F7A3A", "familia": "Independentista",      "fundacion": 2012, "ambito": "Vasco",    "wikipedia_qid": "Q3603162"},
        {"slug": "pnv",       "siglas": "PNV",   "nombre": "Partido Nacionalista Vasco",         "color": "#7DB94B", "familia": "Nacionalista",         "fundacion": 1895, "ambito": "Vasco",    "wikipedia_qid": "Q56055"},
        {"slug": "bng",       "siglas": "BNG",   "nombre": "Bloque Nacionalista Galego",         "color": "#5BA0E0", "familia": "Nacionalista",         "fundacion": 1982, "ambito": "Gallego",  "wikipedia_qid": "Q827124"},
        {"slug": "cc",        "siglas": "CC",    "nombre": "Coalición Canaria",                  "color": "#F5A623", "familia": "Regionalista",         "fundacion": 1993, "ambito": "Canario",  "wikipedia_qid": "Q1112389"},
        {"slug": "upn",       "siglas": "UPN",   "nombre": "Unión del Pueblo Navarro",           "color": "#005A87", "familia": "Regionalista",         "fundacion": 1979, "ambito": "Navarro",  "wikipedia_qid": "Q1431706"},
        {"slug": "psc",       "siglas": "PSC",   "nombre": "Partit dels Socialistes de Catalunya","color": "#E1322D","familia": "Socialdemocracia",     "fundacion": 1978, "ambito": "Catalán",  "wikipedia_qid": "Q1115587"},
        {"slug": "compromis", "siglas": "Compromís", "nombre": "Coalició Compromís",             "color": "#FFB000", "familia": "Regionalista",         "fundacion": 2010, "ambito": "Valenciano","wikipedia_qid": "Q1133248"},
        {"slug": "mas-madrid","siglas": "Más Madrid","nombre": "Más Madrid",                     "color": "#16A085", "familia": "Izquierda alternativa","fundacion": 2018, "ambito": "Madrileño","wikipedia_qid": "Q57028145"},
        {"slug": "cup",       "siglas": "CUP",   "nombre": "Candidatura d'Unitat Popular",       "color": "#FFCC00", "familia": "Independentista",      "fundacion": 1986, "ambito": "Catalán",  "wikipedia_qid": "Q1027849"},
    ]


def _load_ccaa() -> list[dict[str, Any]]:
    """17 CCAA + 2 ciudades autónomas."""
    return [
        {"slug":"andalucia",      "nombre":"Andalucía",                       "code":"01", "capital":"Sevilla",            "color":"#005C2E", "fundacion":1981, "presidente":"Juanma Moreno","partido_slug":"pp"},
        {"slug":"aragon",         "nombre":"Aragón",                          "code":"02", "capital":"Zaragoza",           "color":"#FFCC00", "fundacion":1982, "presidente":"Jorge Azcón","partido_slug":"pp"},
        {"slug":"asturias",       "nombre":"Principado de Asturias",           "code":"03", "capital":"Oviedo",             "color":"#0080C0", "fundacion":1981, "presidente":"Adrián Barbón","partido_slug":"psoe"},
        {"slug":"baleares",       "nombre":"Illes Balears",                   "code":"04", "capital":"Palma",              "color":"#762435", "fundacion":1983, "presidente":"Marga Prohens","partido_slug":"pp"},
        {"slug":"canarias",       "nombre":"Canarias",                        "code":"05", "capital":"Las Palmas / S. Cruz","color":"#FFCC33","fundacion":1982, "presidente":"Fernando Clavijo","partido_slug":"cc"},
        {"slug":"cantabria",      "nombre":"Cantabria",                        "code":"06", "capital":"Santander",          "color":"#C8102E", "fundacion":1981, "presidente":"María José Sáenz de Buruaga","partido_slug":"pp"},
        {"slug":"castilla-leon",  "nombre":"Castilla y León",                 "code":"07", "capital":"Valladolid",         "color":"#C00000", "fundacion":1983, "presidente":"Alfonso Fernández Mañueco","partido_slug":"pp"},
        {"slug":"castilla-mancha","nombre":"Castilla-La Mancha",              "code":"08", "capital":"Toledo",             "color":"#7D8AC4", "fundacion":1982, "presidente":"Emiliano García-Page","partido_slug":"psoe"},
        {"slug":"cataluna",       "nombre":"Cataluña",                        "code":"09", "capital":"Barcelona",          "color":"#FFCC00", "fundacion":1979, "presidente":"Salvador Illa","partido_slug":"psc"},
        {"slug":"valenciana",     "nombre":"Comunidad Valenciana",            "code":"10", "capital":"València",           "color":"#FFAA00", "fundacion":1982, "presidente":"Juanfran Pérez Llorca","partido_slug":"pp"},
        {"slug":"extremadura",    "nombre":"Extremadura",                     "code":"11", "capital":"Mérida",             "color":"#016A2C", "fundacion":1983, "presidente":"María Guardiola","partido_slug":"pp"},
        {"slug":"galicia",        "nombre":"Galicia",                         "code":"12", "capital":"Santiago de Compostela","color":"#0072BC","fundacion":1981, "presidente":"Alfonso Rueda","partido_slug":"pp"},
        {"slug":"madrid",         "nombre":"Comunidad de Madrid",             "code":"13", "capital":"Madrid",             "color":"#C00000", "fundacion":1983, "presidente":"Isabel Díaz Ayuso","partido_slug":"pp"},
        {"slug":"murcia",         "nombre":"Región de Murcia",                 "code":"14", "capital":"Murcia",             "color":"#C00000", "fundacion":1982, "presidente":"Fernando López Miras","partido_slug":"pp"},
        {"slug":"navarra",        "nombre":"Comunidad Foral de Navarra",       "code":"15", "capital":"Pamplona",           "color":"#C00000", "fundacion":1982, "presidente":"María Chivite","partido_slug":"psoe"},
        {"slug":"pais-vasco",     "nombre":"País Vasco",                       "code":"16", "capital":"Vitoria-Gasteiz",    "color":"#009934", "fundacion":1979, "presidente":"Imanol Pradales","partido_slug":"pnv"},
        {"slug":"rioja",          "nombre":"La Rioja",                         "code":"17", "capital":"Logroño",            "color":"#7FBC56", "fundacion":1982, "presidente":"Gonzalo Capellán","partido_slug":"pp"},
        {"slug":"ceuta",          "nombre":"Ciudad Autónoma de Ceuta",         "code":"18", "capital":"Ceuta",              "color":"#C00000", "fundacion":1995, "presidente":"Juan Jesús Vivas","partido_slug":"pp"},
        {"slug":"melilla",        "nombre":"Ciudad Autónoma de Melilla",       "code":"19", "capital":"Melilla",            "color":"#0066B3", "fundacion":1995, "presidente":"Juan José Imbroda","partido_slug":"pp"},
    ]


def _load_sectors() -> list[dict[str, Any]]:
    """Sectores económicos (de sector_taxonomy.py)."""
    try:
        from agents.brain.pipelines.data_sources.sector_taxonomy import SECTOR_TAXONOMY
        return [
            {
                "slug": sid,
                "nombre": meta["name"],
                "nombre_corto": meta["name_short"],
                "color": meta["color_primary"],
                "ministerio": meta["ministry"],
                "risk_dominio": meta["risk_dominio"],
                "regulators": meta.get("regulators", []),
            }
            for sid, meta in SECTOR_TAXONOMY.items()
        ]
    except Exception as exc:
        logger.warning("backfill sectors: %s", exc)
        return []


# ─────────────────────────────────────────────────────────────────
# Backfill propiamente dicho
# ─────────────────────────────────────────────────────────────────

def backfill(*, dry_run: bool = False) -> dict[str, int]:
    """Vuelca los catálogos a la tabla entities + entity_links.

    Returns:
        counts = {parties, ccaa, sectors, regulators, links_president, links_member, links_regulates}
    """
    from agents.entities import EntityRepository, EntityCreate
    from agents.entities.schemas import EntityLinkCreate

    if dry_run:
        # Modo simulación · usamos un repo en memoria mock
        class _MockRepo:
            def __init__(self): self._next = 1; self._by_slug: dict[tuple[str, str], Any] = {}
            def upsert(self, data):
                from agents.entities.schemas import Entity
                now = datetime.now(timezone.utc)
                existing = self._by_slug.get((data.kind, data.slug))
                if existing:
                    return existing
                e = Entity(
                    id=self._next, kind=data.kind, slug=data.slug, qid=data.qid,
                    display_name=data.display_name, aliases=data.aliases or [],
                    payload=data.payload or {}, tags=data.tags or [],
                    confidence=data.confidence, source=data.source,
                    valid_from=data.valid_from, valid_to=data.valid_to,
                    created_at=now, updated_at=now,
                )
                self._next += 1
                self._by_slug[(data.kind, data.slug)] = e
                return e
            def add_link(self, link):
                from agents.entities.schemas import EntityLink
                return EntityLink(id=1, **link.model_dump(), created_at=datetime.now(timezone.utc))
            def get_by_kind_slug(self, kind, slug):
                return self._by_slug.get((kind, slug))
        repo = _MockRepo()
    else:
        repo = EntityRepository()

    counts = {
        "parties": 0, "ccaa": 0, "sectors": 0, "regulators": 0,
        "links_president": 0, "links_member": 0, "links_regulates": 0,
    }

    # 1) Partidos
    for p in _load_parties_from_python():
        ent = repo.upsert(EntityCreate(
            kind="party",
            slug=p["slug"],
            qid=p.get("wikipedia_qid"),
            display_name=p["nombre"],
            aliases=[p["siglas"]],
            payload={
                "siglas": p["siglas"],
                "color": p["color"],
                "familia": p["familia"],
                "fundacion": p["fundacion"],
                "ambito": p["ambito"],
            },
            tags=["party", p["familia"].lower().replace(" ", "_"), p["ambito"].lower()],
            source="curated:parties_catalog",
        ))
        counts["parties"] += 1

    # 2) CCAA + presidentes + links
    for c in _load_ccaa():
        ccaa_ent = repo.upsert(EntityCreate(
            kind="territory",
            slug=c["slug"],
            display_name=c["nombre"],
            aliases=[c["capital"]],
            payload={
                "code_ine": c["code"],
                "capital": c["capital"],
                "color": c["color"],
                "fundacion": c["fundacion"],
                "tipo": "ccaa",
            },
            tags=["territory", "ccaa"],
            source="curated:ccaa_catalog",
        ))
        counts["ccaa"] += 1

        # Presidente · actor_person
        pres_name = c["presidente"]
        from agents.entities.resolver import slugify
        pres_ent = repo.upsert(EntityCreate(
            kind="actor_person",
            slug=slugify(pres_name),
            display_name=pres_name,
            payload={
                "rol_actual": f"Presidente/a de {c['nombre']}",
                "partido_slug": c["partido_slug"],
            },
            tags=["politico", "presidente_ccaa", f"ccaa:{c['slug']}"],
            source="curated:ccaa_catalog",
        ))

        # Link president_of: actor → territory
        repo.add_link(EntityLinkCreate(
            src_id=pres_ent.id,
            dst_id=ccaa_ent.id,
            link_kind="president_of",
            confidence=1.0,
            payload={"role": "presidente_ccaa"},
        ))
        counts["links_president"] += 1

        # Link member_of: presidente → partido
        party_ent = repo.get_by_kind_slug("party", c["partido_slug"])
        if party_ent:
            repo.add_link(EntityLinkCreate(
                src_id=pres_ent.id, dst_id=party_ent.id,
                link_kind="member_of", confidence=1.0,
            ))
            counts["links_member"] += 1

    # 3) Sectores + reguladores
    for s in _load_sectors():
        sec_ent = repo.upsert(EntityCreate(
            kind="sector",
            slug=s["slug"],
            display_name=s["nombre"],
            aliases=[s["nombre_corto"]],
            payload={
                "color": s["color"],
                "ministerio": s["ministerio"],
                "risk_dominio": s["risk_dominio"],
            },
            tags=["sector", f"risk:{s['risk_dominio']}"],
            source="curated:sector_taxonomy",
        ))
        counts["sectors"] += 1

        for reg in s.get("regulators", []):
            from agents.entities.resolver import slugify
            reg_ent = repo.upsert(EntityCreate(
                kind="institution",
                slug=slugify(reg),
                display_name=reg,
                payload={"role": "regulador"},
                tags=["institution", "regulador", f"sector:{s['slug']}"],
                source="curated:sector_taxonomy",
            ))
            counts["regulators"] += 1
            repo.add_link(EntityLinkCreate(
                src_id=reg_ent.id, dst_id=sec_ent.id,
                link_kind="regulates", confidence=0.9,
            ))
            counts["links_regulates"] += 1

    if dry_run:
        logger.info("[DRY-RUN] backfill counts: %s", counts)
    else:
        logger.info("backfill counts: %s", counts)
    return counts


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill entities desde catálogos curados")
    parser.add_argument("--dry-run", action="store_true", help="Simula sin escribir BD")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    counts = backfill(dry_run=args.dry_run)
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
