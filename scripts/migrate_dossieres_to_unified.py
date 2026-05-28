"""scripts/migrate_dossieres_to_unified.py

Carga datos desde las 4 fuentes existentes de dossieres hacia la nueva
tabla `dosieres_unificado` creada por la migración 0082.

Fases del refactor:

  EXPAND   →  crear tabla nueva (migración 0082_dosieres_unificado.py)   ✅
            →  cargar datos                       ← este script
  MIGRATE  →  refactorizar endpoints              (sesión siguiente)
  CONTRACT →  drop tablas viejas + fixture        (cuando todo apunta a
                                                  la tabla nueva)

Fuentes que se cargan (en orden de menor → mayor autoridad, para que
las más curadas "ganen" en caso de conflicto sobre (tenant, tipo, slug)):

  1. brain_actor_dossiers       → tipo='actor'
  2. brain_issue_dossiers       → tipo='issue'
  3. brain_fichas_territoriales → tipo='territorio'
  4. brain_fichas_politicos     → tipo='politico'
  5. fixture TS (vía JSON)      → tipo='politico'
  6. dosieres + dossier_apartados + dossier_items → tipo='politico'

Política de conflicto (ON CONFLICT (tenant_id, tipo, slug) DO UPDATE):
  - `contenido` se sobrescribe (la última fuente cargada gana).
  - Los campos de metadata (nombre, partido, cargo…) solo se actualizan
    si el valor entrante NO es NULL (preservamos la metadata más rica).
  - `origen` registra la última fuente que tocó la fila → útil para
    auditoría y para diseñar la fase MIGRATE.

Uso:
    # Necesario una vez (regenera /tmp/dosieres-fixture.json):
    node scripts/extract_dosieres_fixture.cjs

    # Carga todo (default):
    python scripts/migrate_dossieres_to_unified.py

    # Solo una fuente:
    python scripts/migrate_dossieres_to_unified.py --source brain
    python scripts/migrate_dossieres_to_unified.py --source dosieres
    python scripts/migrate_dossieres_to_unified.py --source fixture

    # Sin escribir, solo contar:
    python scripts/migrate_dossieres_to_unified.py --dry-run

    # Tenant distinto del default:
    python scripts/migrate_dossieres_to_unified.py --tenant acme

Variables de entorno:
    DATABASE_URL              postgresql://user:pass@host:port/db   (requerido)
    DOSIERES_FIXTURE_JSON     ruta al JSON volcado del fixture
                              (default /tmp/dosieres-fixture.json)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import unicodedata
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

# ─── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("migrate_dossieres")

# ─── Constantes ───────────────────────────────────────────────────────
DEFAULT_FIXTURE_JSON = "/tmp/dosieres-fixture.json"  # noqa: S108  # ruta convenida con extract_dosieres_fixture.cjs
REPO_ROOT = Path(__file__).resolve().parent.parent
IBEX35_EMPRESAS_JSON = REPO_ROOT / "data" / "ibex35" / "empresas.json"
IBEX35_DIRECTIVOS_JSON = REPO_ROOT / "data" / "ibex35" / "directivos.json"
IBEX35_CONEXOS_JSON = REPO_ROOT / "data" / "ibex35" / "conexos.json"
DIPUTACIONES_INSTITUCIONES_JSON = REPO_ROOT / "data" / "diputaciones" / "instituciones.json"
DIPUTACIONES_PRESIDENTES_JSON = REPO_ROOT / "data" / "diputaciones" / "presidentes.json"
DIPUTACIONES_COMPLEMENTOS_JSON = REPO_ROOT / "data" / "diputaciones" / "complementos.json"

VALID_SOURCES = ("all", "brain", "dosieres", "fixture", "ibex35", "diputaciones")

# Tipos soportados por la columna `tipo` (debe coincidir con el CHECK
# constraint definido en la migración 0082).
TIPO_POLITICO = "politico"
TIPO_TERRITORIO = "territorio"
TIPO_ACTOR = "actor"
TIPO_ISSUE = "issue"


# ─── Helpers ──────────────────────────────────────────────────────────
def slugify(value: str) -> str:
    """Slug determinista compatible con los slugs ya usados en `dosieres`.

    `Pedro Sánchez Pérez-Castejón` → `pedro-sanchez-perez-castejon`
    """
    if not value:
        return ""
    norm = unicodedata.normalize("NFKD", value)
    ascii_ = norm.encode("ascii", "ignore").decode("ascii").lower()
    ascii_ = re.sub(r"[^a-z0-9]+", "-", ascii_).strip("-")
    return ascii_[:200]


def safe_json_loads(raw: Any) -> dict[str, Any]:
    """Parsea content_json de las tablas brain_*. Acepta None / dict /
    string JSON. Devuelve siempre un dict (vacío si no se puede)."""
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else {"value": data}
        except json.JSONDecodeError:
            log.warning("content_json no parseable, se ignora")
            return {}
    return {}


def get_engine() -> Engine:
    url = os.environ.get("DATABASE_URL")
    if not url:
        log.error("Falta DATABASE_URL en el entorno")
        sys.exit(2)
    return create_engine(url, future=True)


# ─── Modelo común "DossierUnificado" ──────────────────────────────────
def make_row(
    *,
    slug: str,
    tipo: str,
    nombre: str,
    contenido: dict[str, Any],
    origen: str,
    tenant_id: str,
    alias: str | None = None,
    cargo: str | None = None,
    partido: str | None = None,
    ccaa: str | None = None,
    provincia: str | None = None,
    qid: str | None = None,
    foto_url: str | None = None,
    bio_corta: str | None = None,
    tags: list[str] | None = None,
    completeness: float | None = None,
    confidence: float | None = None,
    score_influencia: float | None = None,
    fuente_principal: str | None = None,
) -> dict[str, Any]:
    return {
        "slug": slug,
        "tipo": tipo,
        "nombre": nombre,
        "alias": alias,
        "cargo": cargo,
        "partido": partido,
        "ccaa": ccaa,
        "provincia": provincia,
        "qid": qid,
        "foto_url": foto_url,
        "bio_corta": bio_corta,
        "contenido": json.dumps(contenido or {}),
        "tags": json.dumps(tags or []),
        "completeness": completeness,
        "confidence": confidence,
        "score_influencia": score_influencia,
        "fuente_principal": fuente_principal,
        "origen": origen,
        "tenant_id": tenant_id,
    }


# UPSERT con preservación de metadata no-nula (COALESCE).
UPSERT_SQL = text(
    """
    INSERT INTO dosieres_unificado (
        slug, tipo, nombre, alias, cargo, partido, ccaa, provincia,
        qid, foto_url, bio_corta, contenido, tags,
        completeness, confidence, score_influencia,
        fuente_principal, origen, tenant_id
    )
    VALUES (
        :slug, :tipo, :nombre, :alias, :cargo, :partido, :ccaa, :provincia,
        :qid, :foto_url, :bio_corta, CAST(:contenido AS JSONB),
        CAST(:tags AS JSONB),
        :completeness, :confidence, :score_influencia,
        :fuente_principal, :origen, :tenant_id
    )
    ON CONFLICT (tenant_id, tipo, slug) DO UPDATE SET
        nombre           = COALESCE(EXCLUDED.nombre, dosieres_unificado.nombre),
        alias            = COALESCE(EXCLUDED.alias, dosieres_unificado.alias),
        cargo            = COALESCE(EXCLUDED.cargo, dosieres_unificado.cargo),
        partido          = COALESCE(EXCLUDED.partido, dosieres_unificado.partido),
        ccaa             = COALESCE(EXCLUDED.ccaa, dosieres_unificado.ccaa),
        provincia        = COALESCE(EXCLUDED.provincia, dosieres_unificado.provincia),
        qid              = COALESCE(EXCLUDED.qid, dosieres_unificado.qid),
        foto_url         = COALESCE(EXCLUDED.foto_url, dosieres_unificado.foto_url),
        bio_corta        = COALESCE(EXCLUDED.bio_corta, dosieres_unificado.bio_corta),
        contenido        = EXCLUDED.contenido,
        tags             = CASE
                              WHEN jsonb_array_length(EXCLUDED.tags) > 0
                                 THEN EXCLUDED.tags
                              ELSE dosieres_unificado.tags
                           END,
        completeness     = COALESCE(EXCLUDED.completeness, dosieres_unificado.completeness),
        confidence       = COALESCE(EXCLUDED.confidence, dosieres_unificado.confidence),
        score_influencia = COALESCE(EXCLUDED.score_influencia, dosieres_unificado.score_influencia),
        fuente_principal = COALESCE(EXCLUDED.fuente_principal, dosieres_unificado.fuente_principal),
        origen           = EXCLUDED.origen,
        updated_at       = NOW()
    RETURNING (xmax = 0) AS inserted
    """
)


def upsert_many(
    conn: Connection,
    rows: Iterable[dict[str, Any]],
    *,
    dry_run: bool,
) -> tuple[int, int]:
    """Devuelve (insertados, actualizados)."""
    n_ins = n_upd = 0
    for row in rows:
        if not row["slug"] or not row["nombre"]:
            log.debug("skip row sin slug/nombre: %r", row.get("origen"))
            continue
        if dry_run:
            n_ins += 1  # contamos como "tocados"
            continue
        result = conn.execute(UPSERT_SQL, row).first()
        if result and result.inserted:
            n_ins += 1
        else:
            n_upd += 1
    return n_ins, n_upd


# ─── Loaders por fuente ───────────────────────────────────────────────
def load_brain_actor_dossiers(conn: Connection, tenant_id: str) -> Iterable[dict[str, Any]]:
    rows = conn.execute(
        text(
            "SELECT actor_name, depth, content_json, confidence, completeness "
            "FROM brain_actor_dossiers WHERE actor_name IS NOT NULL"
        )
    ).all()
    log.info("brain_actor_dossiers → %d filas", len(rows))
    for r in rows:
        bloques = safe_json_loads(r.content_json)
        slug = slugify(r.actor_name)
        if not slug:
            continue
        yield make_row(
            slug=slug,
            tipo=TIPO_ACTOR,
            nombre=r.actor_name,
            contenido={
                "apartados": [],
                "bloques_brain": bloques,
                "raw_extra": {"depth": r.depth},
            },
            origen="brain_actor_dossiers",
            tenant_id=tenant_id,
            completeness=r.completeness,
            confidence=r.confidence,
        )


def load_brain_issue_dossiers(conn: Connection, tenant_id: str) -> Iterable[dict[str, Any]]:
    rows = conn.execute(
        text(
            "SELECT issue_name, depth, content_json, confidence, completeness "
            "FROM brain_issue_dossiers WHERE issue_name IS NOT NULL"
        )
    ).all()
    log.info("brain_issue_dossiers → %d filas", len(rows))
    for r in rows:
        bloques = safe_json_loads(r.content_json)
        slug = slugify(r.issue_name)
        if not slug:
            continue
        yield make_row(
            slug=slug,
            tipo=TIPO_ISSUE,
            nombre=r.issue_name,
            contenido={
                "apartados": [],
                "bloques_brain": bloques,
                "raw_extra": {"depth": r.depth},
            },
            origen="brain_issue_dossiers",
            tenant_id=tenant_id,
            completeness=r.completeness,
            confidence=r.confidence,
        )


def load_brain_fichas_territoriales(conn: Connection, tenant_id: str) -> Iterable[dict[str, Any]]:
    rows = conn.execute(
        text(
            "SELECT id, tipo, nombre, ccaa, content_json, completeness, "
            "       n_bloques_ok "
            "FROM brain_fichas_territoriales WHERE nombre IS NOT NULL"
        )
    ).all()
    log.info("brain_fichas_territoriales → %d filas", len(rows))
    for r in rows:
        bloques = safe_json_loads(r.content_json)
        slug = slugify(f"{r.nombre}-{r.ccaa or ''}".strip("-"))
        if not slug:
            continue
        yield make_row(
            slug=slug,
            tipo=TIPO_TERRITORIO,
            nombre=r.nombre,
            ccaa=r.ccaa,
            contenido={
                "apartados": [],
                "bloques_brain": bloques,
                "raw_extra": {
                    "subtipo": r.tipo,
                    "n_bloques_ok": r.n_bloques_ok,
                    "brain_id": r.id,
                },
            },
            origen="brain_fichas_territoriales",
            tenant_id=tenant_id,
            completeness=r.completeness,
        )


def load_brain_fichas_politicos(conn: Connection, tenant_id: str) -> Iterable[dict[str, Any]]:
    rows = conn.execute(
        text(
            "SELECT id, qid, nombre, partido, cargo_actual, content_json, "
            "       completeness, score_influencia, n_bloques_ok "
            "FROM brain_fichas_politicos WHERE nombre IS NOT NULL"
        )
    ).all()
    log.info("brain_fichas_politicos → %d filas", len(rows))
    for r in rows:
        bloques = safe_json_loads(r.content_json)
        slug = slugify(r.nombre)
        if not slug:
            continue
        yield make_row(
            slug=slug,
            tipo=TIPO_POLITICO,
            nombre=r.nombre,
            partido=r.partido,
            cargo=r.cargo_actual,
            qid=r.qid,
            contenido={
                "apartados": [],
                "bloques_brain": bloques,
                "raw_extra": {
                    "n_bloques_ok": r.n_bloques_ok,
                    "brain_id": r.id,
                },
            },
            origen="brain_fichas_politicos",
            tenant_id=tenant_id,
            completeness=r.completeness,
            score_influencia=r.score_influencia,
        )


def _apartados_from_normalized(
    apartados_rows: list[Any], items_rows: list[Any]
) -> list[dict[str, Any]]:
    """Reconstruye la estructura `apartados[] · items[]` desde el join
    de dossier_apartados + dossier_items."""
    items_por_apartado: dict[str, list[dict[str, Any]]] = {}
    for it in items_rows:
        items_por_apartado.setdefault(str(it.apartado_id), []).append(
            {
                "tipo": it.tipo,
                "titulo": it.titulo,
                "contenido": it.contenido,
                "fecha": it.fecha.isoformat() if it.fecha else None,
                "fuente_url": it.fuente_url,
                "fuente_titulo": it.fuente_titulo,
                "tags": it.tags or [],
                "orden": it.orden,
            }
        )

    out = []
    for ap in apartados_rows:
        items = items_por_apartado.get(str(ap.id), [])
        items.sort(key=lambda i: i["orden"])
        out.append(
            {
                "tipo": ap.tipo,
                "titulo": ap.titulo,
                "resumen": ap.resumen,
                "orden": ap.orden,
                "items": items,
            }
        )
    out.sort(key=lambda a: a["orden"])
    return out


def load_dosieres_normalized(conn: Connection, tenant_id: str) -> Iterable[dict[str, Any]]:
    """Carga desde dosieres + dossier_apartados + dossier_items."""
    dosieres = conn.execute(
        text(
            "SELECT id, slug, nombre_completo, alias, cargo_actual, partido, "
            "       foto_url, bio_corta, tags, fuente_principal "
            "FROM dosieres"
        )
    ).all()
    log.info("dosieres (normalizado) → %d filas", len(dosieres))
    if not dosieres:
        return

    ids = [str(d.id) for d in dosieres]
    apartados = conn.execute(
        text(
            "SELECT id, dossier_id, tipo, titulo, resumen, orden "
            "FROM dossier_apartados WHERE dossier_id = ANY(:ids)"
        ),
        {"ids": ids},
    ).all()
    items = conn.execute(
        text(
            "SELECT id, apartado_id, tipo, titulo, contenido, fecha, "
            "       fuente_url, fuente_titulo, tags, orden "
            "FROM dossier_items WHERE apartado_id IN "
            "(SELECT id FROM dossier_apartados WHERE dossier_id = ANY(:ids))"
        ),
        {"ids": ids},
    ).all()

    aps_por_dossier: dict[str, list[Any]] = {}
    for ap in apartados:
        aps_por_dossier.setdefault(str(ap.dossier_id), []).append(ap)

    for d in dosieres:
        aps = aps_por_dossier.get(str(d.id), [])
        tags = d.tags if isinstance(d.tags, list) else []
        yield make_row(
            slug=d.slug,
            tipo=TIPO_POLITICO,
            nombre=d.nombre_completo,
            alias=d.alias,
            cargo=d.cargo_actual,
            partido=d.partido,
            foto_url=d.foto_url,
            bio_corta=d.bio_corta,
            contenido={
                "apartados": _apartados_from_normalized(aps, items),
                "bloques_brain": {},
                "raw_extra": {},
            },
            origen="dosieres",
            tenant_id=tenant_id,
            tags=tags,
            fuente_principal=d.fuente_principal,
        )


def _load_dossier_json(
    path: Path,
    tenant_id: str,
    *,
    default_tipo: str,
    origen: str,
) -> Iterable[dict[str, Any]]:
    """Loader genérico de dossieres desde JSON (array de DossierCompleto).

    Cada entrada acepta dos shapes compatibles:

      - Shape "fixture TS"  (lo que vuelca extract_dosieres_fixture.cjs):
          nombre_completo, cargo_actual, foto_url, …, apartados[]

      - Shape "ibex35"  (más flexible, soporta tipo override):
          nombre, cargo, alias, …, tipo (opcional), tags[], apartados[]

    El loader se queda con el primer campo que encuentra y rellena lo demás
    con valores razonables. `default_tipo` y `origen` los pasa el caller.
    """
    if not path.exists():
        log.warning("JSON no encontrado en %s · se omite", path)
        return

    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    log.info("%s → %d filas", path.name, len(data))

    for d in data:
        # ── Slug + nombre (compatibilidad con ambos shapes) ───────────
        nombre = d.get("nombre") or d.get("nombre_completo") or ""
        slug = d.get("slug") or slugify(nombre)
        if not slug or not nombre:
            continue

        # ── Apartados (shape común) ───────────────────────────────────
        apartados = []
        for ap in d.get("apartados") or []:
            items = [
                {
                    "tipo": it.get("tipo", "dato"),
                    "titulo": it.get("titulo"),
                    "contenido": it.get("contenido", ""),
                    "fecha": it.get("fecha"),
                    "fuente_url": it.get("fuente_url"),
                    "fuente_titulo": it.get("fuente_titulo"),
                    "tags": it.get("tags") or [],
                    "orden": it.get("orden", 0),
                }
                for it in ap.get("items") or []
            ]
            apartados.append(
                {
                    "tipo": ap.get("tipo"),
                    "titulo": ap.get("titulo"),
                    "resumen": ap.get("resumen"),
                    "orden": ap.get("orden", 0),
                    "items": items,
                }
            )

        yield make_row(
            slug=slug,
            tipo=d.get("tipo") or default_tipo,
            nombre=nombre,
            alias=d.get("alias"),
            cargo=d.get("cargo") or d.get("cargo_actual"),
            partido=d.get("partido"),
            ccaa=d.get("ccaa"),
            provincia=d.get("provincia"),
            qid=d.get("qid"),
            foto_url=d.get("foto_url"),
            bio_corta=d.get("bio_corta"),
            contenido={
                "apartados": apartados,
                "bloques_brain": d.get("bloques_brain") or {},
                "raw_extra": d.get("raw_extra") or {},
            },
            origen=origen,
            tenant_id=tenant_id,
            tags=d.get("tags") or [],
            completeness=d.get("completeness"),
            confidence=d.get("confidence"),
            score_influencia=d.get("score_influencia"),
            fuente_principal=d.get("fuente_principal"),
        )


def load_fixture_json(path: Path, tenant_id: str) -> Iterable[dict[str, Any]]:
    """Wrapper retrocompatible: fixture TS hardcoded → tipo=politico."""
    return _load_dossier_json(path, tenant_id, default_tipo=TIPO_POLITICO, origen="fixture_ts")


def load_ibex35_empresas(path: Path, tenant_id: str) -> Iterable[dict[str, Any]]:
    """Empresas del IBEX 35 → tipo=actor con tag 'ibex35' + 'empresa'."""
    return _load_dossier_json(
        path,
        tenant_id,
        default_tipo=TIPO_ACTOR,
        origen="ibex35_empresas",
    )


def load_ibex35_directivos(path: Path, tenant_id: str) -> Iterable[dict[str, Any]]:
    """CEOs, presidentes, consejeros de IBEX 35 → tipo=actor con tag 'directivo'."""
    return _load_dossier_json(
        path,
        tenant_id,
        default_tipo=TIPO_ACTOR,
        origen="ibex35_directivos",
    )


def load_ibex35_conexos(path: Path, tenant_id: str) -> Iterable[dict[str, Any]]:
    """Nodos del grafo IBEX 35 que NO son ni empresas ni directivos:
    holdings patrimoniales (Pontegadea, Criteria, Cartival, Alba…),
    familias controladoras (Botín, Del Pino, Entrecanales…),
    organizaciones (SEPI, CEOE, AEB, AELEC, CNMV, Casa Real, fundaciones),
    partidos (PSOE, PSC, PP, PNV), casos judiciales (Villarejo, Picasso,
    Tarjetas Black), filiales relevantes (TSB, ScottishPower, Hochtief…)
    y entidades extranjeras (Enel, Imperial Brands, QIA, STC, Gotham…).

    Cada entrada lleva su `tipo` explícito en el JSON (actor/politico/issue).
    """
    return _load_dossier_json(
        path,
        tenant_id,
        default_tipo=TIPO_ACTOR,
        origen="ibex35_conexos",
    )


def load_diputaciones_instituciones(path: Path, tenant_id: str) -> Iterable[dict[str, Any]]:
    """38 Diputaciones Provinciales + 3 Diputaciones Forales (Álava,
    Bizkaia, Gipuzkoa). Dossieres a nivel institucional (composición,
    competencias, sede, alianzas políticas, vínculos con Junta/Xunta).
    """
    return _load_dossier_json(
        path,
        tenant_id,
        default_tipo=TIPO_ACTOR,
        origen="diputaciones_instituciones",
    )


def load_diputaciones_presidentes(path: Path, tenant_id: str) -> Iterable[dict[str, Any]]:
    """Los 41 presidentes (38 Diputaciones + 3 Diputados Generales forales).
    Cada uno con tipo=politico y partido en metadata.
    """
    return _load_dossier_json(
        path,
        tenant_id,
        default_tipo=TIPO_POLITICO,
        origen="diputaciones_presidentes",
    )


def load_diputaciones_complementos(path: Path, tenant_id: str) -> Iterable[dict[str, Any]]:
    """Actores complementarios referenciados por las aristas del grafo
    de Diputaciones: partidos (ERC, Junts, PSdeG), políticos puente
    (Moreno Bonilla, Manuel Baltar) y otras figuras necesarias para
    cerrar el grafo. Cada uno declara su `tipo` en el JSON.
    """
    return _load_dossier_json(
        path,
        tenant_id,
        default_tipo=TIPO_ACTOR,
        origen="diputaciones_complementos",
    )


# ─── Orquestación ─────────────────────────────────────────────────────
# LOAD_ORDER · (etiqueta, grupo, función loader, kind)
#
# kind:
#   "conn"     → loader(conn, tenant_id)              · lee de la BD
#   "fixture"  → loader(fixture_path, tenant_id)      · ruta fija --fixture-json
#   "ibex35e"  → loader(IBEX35_EMPRESAS_JSON, tid)    · ruta data/ibex35/empresas.json
#   "ibex35d"  → loader(IBEX35_DIRECTIVOS_JSON, tid)  · ruta data/ibex35/directivos.json
#
# Orden: menos → más autoritativo. La última fuente cargada gana sobre
# `contenido`; la metadata se preserva con COALESCE (ver UPSERT_SQL).
LOAD_ORDER = [
    ("brain_actor_dossiers", "brain", load_brain_actor_dossiers, "conn"),
    ("brain_issue_dossiers", "brain", load_brain_issue_dossiers, "conn"),
    (
        "brain_fichas_territoriales",
        "brain",
        load_brain_fichas_territoriales,
        "conn",
    ),
    ("brain_fichas_politicos", "brain", load_brain_fichas_politicos, "conn"),
    ("ibex35_empresas", "ibex35", load_ibex35_empresas, "ibex35e"),
    ("ibex35_directivos", "ibex35", load_ibex35_directivos, "ibex35d"),
    ("ibex35_conexos", "ibex35", load_ibex35_conexos, "ibex35c"),
    ("diputaciones_instituciones", "diputaciones", load_diputaciones_instituciones, "dipinst"),
    ("diputaciones_presidentes", "diputaciones", load_diputaciones_presidentes, "dippres"),
    ("diputaciones_complementos", "diputaciones", load_diputaciones_complementos, "dipcomp"),
    ("fixture_ts", "fixture", load_fixture_json, "fixture"),
    ("dosieres", "dosieres", load_dosieres_normalized, "conn"),
]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Carga dossieres desde fuentes existentes a dosieres_unificado"
    )
    parser.add_argument(
        "--source",
        choices=VALID_SOURCES,
        default="all",
        help="Qué fuente cargar (default: all)",
    )
    parser.add_argument(
        "--tenant",
        default="default",
        help="tenant_id para las filas insertadas (default: 'default')",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="No escribe a la BD, solo cuenta",
    )
    parser.add_argument(
        "--fixture-json",
        default=os.environ.get("DOSIERES_FIXTURE_JSON", DEFAULT_FIXTURE_JSON),
        help=f"Ruta al JSON del fixture (default: {DEFAULT_FIXTURE_JSON})",
    )
    args = parser.parse_args()

    log.info("=" * 70)
    log.info(
        "migrate_dossieres_to_unified · source=%s · tenant=%s · dry_run=%s",
        args.source,
        args.tenant,
        args.dry_run,
    )
    log.info("=" * 70)

    engine = get_engine()

    fixture_path = Path(args.fixture_json)
    total_ins = total_upd = 0

    with engine.begin() as conn:
        # Establecemos el tenant_id en la sesión para que RLS lo permita
        # (la tabla tiene RLS habilitada).
        conn.execute(
            text("SELECT set_config('app.tenant_id', :tid, false)"),
            {"tid": args.tenant},
        )

        for label, group, loader, kind in LOAD_ORDER:
            if args.source != "all" and args.source != group:
                continue

            log.info("→ %s", label)
            try:
                if kind == "conn":
                    rows = loader(conn, args.tenant)
                elif kind == "fixture":
                    rows = loader(fixture_path, args.tenant)
                elif kind == "ibex35e":
                    rows = loader(IBEX35_EMPRESAS_JSON, args.tenant)
                elif kind == "ibex35d":
                    rows = loader(IBEX35_DIRECTIVOS_JSON, args.tenant)
                elif kind == "ibex35c":
                    rows = loader(IBEX35_CONEXOS_JSON, args.tenant)
                elif kind == "dipinst":
                    rows = loader(DIPUTACIONES_INSTITUCIONES_JSON, args.tenant)
                elif kind == "dippres":
                    rows = loader(DIPUTACIONES_PRESIDENTES_JSON, args.tenant)
                elif kind == "dipcomp":
                    rows = loader(DIPUTACIONES_COMPLEMENTOS_JSON, args.tenant)
                else:
                    raise ValueError(f"kind desconocido: {kind!r}")
                n_ins, n_upd = upsert_many(conn, rows, dry_run=args.dry_run)
                log.info(
                    "  ✓ %s: %d insertados, %d actualizados",
                    label,
                    n_ins,
                    n_upd,
                )
                total_ins += n_ins
                total_upd += n_upd
            except Exception as exc:
                log.exception("  ✗ %s falló: %s", label, exc)
                if not args.dry_run:
                    raise

        if args.dry_run:
            log.info("DRY-RUN · no se ha escrito nada")
            # Forzamos rollback explícito por claridad
            conn.rollback()

    log.info("=" * 70)
    log.info("TOTAL · %d insertados, %d actualizados", total_ins, total_upd)
    log.info("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
