"""Indexador del corpus legalize-es a ChromaDB (Sprint 4 · S4.4).

> **Sprint 4 · S4.4** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 4`)

legalize-es (https://github.com/legalize-it/es) es un corpus open de 12 249
leyes españolas en Markdown con YAML frontmatter estructurado, versionado en
Git (cada reforma legislativa es un commit, permite diff legislativo real).

Este módulo:
  1. Parsea los .md uno a uno
  2. Extrae YAML frontmatter (title, identifier, rank, fecha, etc.)
  3. Indexa en ChromaDB con metadata y texto para búsqueda semántica
  4. Permite el query `search_laws(query)` desde el Brain

Path del corpus: `gits amigos/legalize-es-main/`
Estructura por jurisdicción: `es-cm/`, `es-an/`, `es-ce/`, `es/`...

Activación (opt-in · indexar 12K leyes lleva ~1-3 horas la primera vez):
  python -m etl.sources.legislative.legalize_es_indexer --max-docs 100  # smoke
  python -m etl.sources.legislative.legalize_es_indexer                 # full

Sin ChromaDB instalado o sin corpus disponible, falla cerrado.
"""
from __future__ import annotations

import logging
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterator

logger = logging.getLogger(__name__)


# Path por defecto al corpus legalize-es
_DEFAULT_CORPUS_PATH = Path(
    os.environ.get(
        "LEGALIZE_ES_CORPUS_PATH",
        "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/gits amigos/legalize-es-main",
    )
)

# Nombre de la colección en ChromaDB
_COLLECTION_NAME = "legalize_es_laws"


# ────────────────────────────────────────────────────────────────────
# Parser YAML frontmatter + body
# ────────────────────────────────────────────────────────────────────

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def parse_law_markdown(content: str) -> tuple[dict[str, Any], str]:
    """Parsea YAML frontmatter + body de un .md de legalize-es.

    Returns:
      (metadata_dict, body_text)
      Si no hay frontmatter válido, metadata={} y body=content.
    """
    if not content or not content.startswith("---"):
        return {}, content

    m = _FRONTMATTER_RE.match(content)
    if not m:
        return {}, content

    yaml_block, body = m.group(1), m.group(2)

    metadata: dict[str, Any] = {}
    # Parser YAML simple sin dep externa para metadata plana
    for line in yaml_block.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        # Quitar comillas
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        # Lista simple [a, b, c]
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            items = [s.strip().strip('"').strip("'") for s in inner.split(",") if s.strip()]
            metadata[key] = items
            continue
        metadata[key] = value

    return metadata, body.strip()


def iter_law_files(
    corpus_path: str | Path | None = None,
    *,
    jurisdiction: str | None = None,
    max_docs: int | None = None,
) -> Iterator[Path]:
    """Itera los .md del corpus, filtrado opcional por jurisdicción.

    Args:
      corpus_path: ruta al corpus, default _DEFAULT_CORPUS_PATH
      jurisdiction: 'es', 'es-cm', 'es-an', ... · None=todas
      max_docs: limite (None=todos)
    """
    base = Path(corpus_path) if corpus_path else _DEFAULT_CORPUS_PATH
    if not base.exists():
        logger.warning("legalize_es: corpus path no existe · %s", base)
        return

    if jurisdiction:
        pattern = f"{jurisdiction}/*.md"
    else:
        pattern = "*/*.md"

    count = 0
    for md_path in base.glob(pattern):
        if max_docs is not None and count >= max_docs:
            break
        yield md_path
        count += 1


# ────────────────────────────────────────────────────────────────────
# ChromaDB integration · graceful sin chroma
# ────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_chroma_collection() -> Any | None:
    """Devuelve la colección ChromaDB · None si no instalada."""
    try:
        import chromadb  # type: ignore
    except ImportError:
        logger.debug("legalize_es_indexer: chromadb no instalado")
        return None

    try:
        # Usa el path por defecto · si Politeia tiene config propia, ajustar
        client = chromadb.PersistentClient(path=os.environ.get("CHROMA_DB_PATH", "./.chroma_db"))
        collection = client.get_or_create_collection(name=_COLLECTION_NAME)
        return collection
    except Exception as exc:
        logger.warning("legalize_es_indexer: error inicializando ChromaDB · %s", exc)
        return None


def index_legalize_es(
    corpus_path: str | Path | None = None,
    *,
    jurisdiction: str | None = None,
    max_docs: int | None = None,
    chunk_size: int = 2000,
    chunk_overlap: int = 200,
) -> dict[str, int]:
    """Indexa el corpus legalize-es en ChromaDB.

    Idempotente: si una ley ya está indexada (mismo id), no la reindexa.
    Costoso: ~12K leyes * ~3 chunks/ley = ~36K vectores. Para producción
    correr en worker dedicado, no en pipeline online.

    Args:
      corpus_path: path al corpus
      jurisdiction: filtro 'es', 'es-cm'...
      max_docs: limite (None=todos)
      chunk_size: caracteres por chunk (default 2000)
      chunk_overlap: solapamiento entre chunks (200)

    Returns:
      {"indexed": int, "skipped": int, "errors": int}
    """
    collection = _get_chroma_collection()
    if collection is None:
        return {"indexed": 0, "skipped": 0, "errors": 0, "error": "ChromaDB no disponible"}

    indexed = 0
    skipped = 0
    errors = 0

    for md_path in iter_law_files(corpus_path, jurisdiction=jurisdiction, max_docs=max_docs):
        try:
            content = md_path.read_text(encoding="utf-8")
            metadata, body = parse_law_markdown(content)

            identifier = metadata.get("identifier") or md_path.stem
            if not identifier:
                skipped += 1
                continue

            # Filtrar metadata · ChromaDB solo acepta str/int/float/bool
            clean_meta: dict[str, Any] = {}
            for k, v in metadata.items():
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                elif isinstance(v, list) and v:
                    clean_meta[k] = ", ".join(str(x) for x in v[:5])
            clean_meta["jurisdiction"] = clean_meta.get("jurisdiction") or md_path.parent.name
            clean_meta["file_path"] = str(md_path.relative_to(md_path.parent.parent))

            # Chunking simple por longitud · respeta saltos de párrafo
            chunks = _chunk_text(body, chunk_size=chunk_size, overlap=chunk_overlap)
            if not chunks:
                skipped += 1
                continue

            ids = [f"{identifier}__chunk{i}" for i in range(len(chunks))]
            metas = [{**clean_meta, "chunk_index": i, "n_chunks": len(chunks)} for i in range(len(chunks))]

            collection.upsert(
                ids=ids,
                documents=chunks,
                metadatas=metas,
            )
            indexed += 1

        except Exception as exc:
            logger.debug("index_legalize_es %s · %s", md_path.name, exc)
            errors += 1

    logger.info("legalize_es indexed: %d leyes (%d skipped, %d errors)", indexed, skipped, errors)
    return {"indexed": indexed, "skipped": skipped, "errors": errors}


def _chunk_text(text: str, *, chunk_size: int = 2000, overlap: int = 200) -> list[str]:
    """Trocea texto en chunks de longitud ~chunk_size con solapamiento."""
    if not text:
        return []
    text = text.strip()
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        # Intentar cortar en salto de parrafo cercano
        if end < len(text):
            paragraph_end = text.rfind("\n\n", start, end)
            if paragraph_end > start + chunk_size // 2:
                end = paragraph_end
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = end - overlap
    return [c for c in chunks if c]


# ────────────────────────────────────────────────────────────────────
# Búsqueda semántica
# ────────────────────────────────────────────────────────────────────

def search_laws(
    query: str,
    *,
    n_results: int = 5,
    jurisdiction: str | None = None,
    rank: str | None = None,
) -> list[dict[str, Any]]:
    """Búsqueda semántica de leyes en el corpus indexado.

    Args:
      query: texto libre (ej. 'derecho de huelga', 'protección de datos')
      n_results: max resultados
      jurisdiction: filtro 'es', 'es-cm', etc.
      rank: filtro tipo de norma · 'ley', 'rdley', 'rdleg', 'decreto'...

    Returns:
      Lista de dicts con {identifier, title, jurisdiction, rank, snippet, score, url}.
    """
    collection = _get_chroma_collection()
    if collection is None or not query:
        return []

    # Filtros · ChromaDB usa $eq
    where: dict[str, Any] | None = None
    if jurisdiction or rank:
        clauses: list[dict[str, Any]] = []
        if jurisdiction:
            clauses.append({"jurisdiction": {"$eq": jurisdiction}})
        if rank:
            clauses.append({"rank": {"$eq": rank}})
        where = {"$and": clauses} if len(clauses) > 1 else clauses[0]

    try:
        results = collection.query(
            query_texts=[query],
            n_results=max(1, min(n_results, 50)),
            where=where,
        )
    except Exception as exc:
        logger.warning("search_laws · %s", exc)
        return []

    out: list[dict[str, Any]] = []
    docs_list = (results.get("documents") or [[]])[0]
    metas_list = (results.get("metadatas") or [[]])[0]
    dists_list = (results.get("distances") or [[]])[0]

    seen_ids: set[str] = set()
    for doc, meta, dist in zip(docs_list, metas_list, dists_list):
        identifier = meta.get("identifier") or ""
        if identifier in seen_ids:
            continue  # dedupar chunks de la misma ley
        seen_ids.add(identifier)
        out.append({
            "identifier": identifier,
            "title": meta.get("title") or identifier,
            "jurisdiction": meta.get("jurisdiction") or "",
            "rank": meta.get("rank") or "",
            "publication_date": meta.get("publication_date") or "",
            "url": meta.get("source") or meta.get("url_eli") or "",
            "snippet": (doc or "")[:600],
            "score": round(1.0 - float(dist), 4) if dist is not None else None,
        })

    return out


__all__ = [
    "parse_law_markdown",
    "iter_law_files",
    "index_legalize_es",
    "search_laws",
]


# ────────────────────────────────────────────────────────────────────
# CLI · uso opt-in para indexar el corpus
# ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Indexa corpus legalize-es en ChromaDB")
    parser.add_argument("--corpus-path", help="Path al corpus")
    parser.add_argument("--jurisdiction", help="Filtro 'es', 'es-cm'...")
    parser.add_argument("--max-docs", type=int, help="Limite de docs a indexar (None=todos)")
    parser.add_argument("--query", help="Test query tras indexar")
    args = parser.parse_args()

    print(f"Indexando legalize-es (max={args.max_docs}, juris={args.jurisdiction})...")
    result = index_legalize_es(
        corpus_path=args.corpus_path,
        jurisdiction=args.jurisdiction,
        max_docs=args.max_docs,
    )
    print(f"Result: {result}")

    if args.query:
        print(f"\nBuscando: '{args.query}'")
        for r in search_laws(args.query, n_results=3):
            print(f"  · [{r['identifier']}] {r['title'][:80]}")
            print(f"    score={r['score']} jurisdiction={r['jurisdiction']}")
            print(f"    {r['snippet'][:200]}...")
            print()
