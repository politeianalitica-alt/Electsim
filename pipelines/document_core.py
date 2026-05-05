"""
Document Core Pipeline — Bloque 9.

CLI para operaciones del módulo documental:
  --register      Registra un archivo local
  --parse         Parsea y procesa un documento registrado
  --parse-pending Procesa todos los documentos pendientes
  --index         (Re)indexa chunks en RAG
  --search        Búsqueda rápida en el corpus
  --list          Lista documentos registrados
  --export        Exporta un informe borrador

Flags adicionales:
  --source, --source-type, --title, --url
  --query, --limit
  --report-id, --format (markdown|html|docx|pdf)
  --dry-run, --verbose

Uso:
  python pipelines/document_core.py --register path/to/file.pdf --source boe --source-type boe
  python pipelines/document_core.py --parse-pending --verbose
  python pipelines/document_core.py --search "reforma laboral" --limit 5
  python pipelines/document_core.py --export --report-id <id> --format markdown
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def _get_engine() -> Any:
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


# ── Comandos ──────────────────────────────────────────────────────────────────

def cmd_register(args: argparse.Namespace, engine: Any) -> int:
    """Registra un archivo local en el sistema documental."""
    path = args.register
    source = args.source or Path(path).stem
    source_type = args.source_type or "other"
    title = args.title
    url = args.url

    logger.info("Registrando archivo: %s (source=%s, type=%s)", path, source, source_type)

    if args.dry_run:
        print(f"[DRY RUN] Registraría: {path} como {source_type}/{source}")
        return 0

    try:
        from services.documents.document_service import register_document
        result = register_document(
            path=path,
            source=source,
            source_type=source_type,
            title=title,
            source_url=url,
            engine=engine,
        )
        if "error" in result:
            print(f"❌ Error: {result['error']}")
            return 1

        status_icon = "✅" if result.get("created") else "ℹ️"
        print(f"{status_icon} Documento registrado")
        print(f"   ID:     {result['document_id']}")
        print(f"   Estado: {result['parse_status']}")
        print(f"   Hash:   {result.get('file_hash', '—')[:16]}…")
        if not result.get("created"):
            print("   (ya existía — deduplicado por hash)")
        return 0
    except Exception as exc:
        print(f"❌ Excepción: {exc}")
        logger.exception("cmd_register")
        return 1


def cmd_parse(args: argparse.Namespace, engine: Any) -> int:
    """Parsea un documento registrado por su ID."""
    document_id = args.parse_id
    logger.info("Parseando documento: %s", document_id)

    if args.dry_run:
        print(f"[DRY RUN] Parsearía documento: {document_id}")
        return 0

    try:
        from services.documents.document_service import parse_registered_document
        result = parse_registered_document(document_id, engine=engine)
        if "error" in result:
            print(f"❌ Error: {result['error']}")
            return 1

        icon = "✅" if result.get("success") else "⚠️"
        print(f"{icon} Documento procesado: {document_id}")
        print(f"   Chunks:     {result.get('chunks', 0)}")
        print(f"   Tablas:     {result.get('tables', 0)}")
        print(f"   Citas:      {result.get('citations', 0)}")
        if result.get("errors"):
            print(f"   Warnings:   {result['errors']}")
        return 0
    except Exception as exc:
        print(f"❌ Excepción: {exc}")
        logger.exception("cmd_parse")
        return 1


def cmd_parse_pending(args: argparse.Namespace, engine: Any) -> int:
    """Procesa todos los documentos con parse_status='pending'."""
    limit = args.limit or 20
    logger.info("Procesando hasta %d documentos pendientes…", limit)

    if args.dry_run:
        print(f"[DRY RUN] Procesaría documentos pendientes (limit={limit})")
        return 0

    try:
        from etl.sources.documents.document_monitor import DocumentMonitor
        monitor = DocumentMonitor(engine=engine)
        results = monitor.process_pending(limit=limit)

        ok = sum(1 for r in results if r.success)
        failed = len(results) - ok
        total_chunks = sum(len(r.chunks) for r in results)

        print(f"✅ Procesados: {ok} OK, {failed} fallidos")
        print(f"   Total chunks generados: {total_chunks}")

        if args.verbose and failed > 0:
            for r in results:
                if not r.success:
                    print(f"   ❌ {r.document_id}: {r.errors}")
        return 0 if failed == 0 else 1
    except Exception as exc:
        print(f"❌ Excepción: {exc}")
        logger.exception("cmd_parse_pending")
        return 1


def cmd_index(args: argparse.Namespace, engine: Any) -> int:
    """(Re)indexa los chunks de un documento en RAG."""
    document_id = args.index_id
    logger.info("Indexando documento en RAG: %s", document_id)

    if args.dry_run:
        print(f"[DRY RUN] Indexaría chunks de: {document_id}")
        return 0

    try:
        from etl.sources.documents.document_rag import index_document_chunks
        n = index_document_chunks(document_id, engine=engine)
        print(f"✅ Indexados {n} chunks del documento {document_id}")
        return 0
    except Exception as exc:
        print(f"❌ Excepción: {exc}")
        logger.exception("cmd_index")
        return 1


def cmd_search(args: argparse.Namespace, engine: Any) -> int:
    """Busca en el corpus documental."""
    query = args.search_query
    limit = args.limit or 10

    try:
        from services.documents.document_service import search_documents
        df = search_documents(query, limit=limit, engine=engine)
        if df.empty:
            print(f"No se encontraron resultados para: '{query}'")
            return 0

        print(f"\n🔍 Resultados para '{query}' ({len(df)} encontrados):\n")
        for _, row in df.iterrows():
            title = row.get("title") or row.get("document_id", "—")
            source_type = row.get("source_type", "")
            chunk = str(row.get("chunk_text", ""))[:150]
            score = row.get("score")
            score_str = f" [{score:.3f}]" if score else ""
            print(f"  • {title} [{source_type}]{score_str}")
            if chunk:
                print(f"    {chunk}…")
        print()
        return 0
    except Exception as exc:
        print(f"❌ Excepción: {exc}")
        logger.exception("cmd_search")
        return 1


def cmd_list(args: argparse.Namespace, engine: Any) -> int:
    """Lista documentos registrados."""
    limit = args.limit or 20
    source_type = args.source_type

    try:
        from dashboard.services.document_core import cargar_documentos_recientes
        df = cargar_documentos_recientes(limit=limit, source_type=source_type,
                                          engine=engine)
        if df.empty:
            print("No hay documentos registrados.")
            return 0

        print(f"\n📄 Documentos ({len(df)}):\n")
        for _, row in df.iterrows():
            title = (row.get("title") or row.get("source") or "—")[:60]
            st = row.get("source_type", "—")
            status = row.get("parse_status", "—")
            chunks = row.get("chunk_count", 0)
            icon = "✅" if status == "parsed" else ("⏳" if status == "pending" else "❌")
            print(f"  {icon} [{st}] {title}  ({chunks} chunks)")
        print()
        return 0
    except Exception as exc:
        print(f"❌ Excepción: {exc}")
        logger.exception("cmd_list")
        return 1


def cmd_export(args: argparse.Namespace, engine: Any) -> int:
    """Exporta un borrador de informe."""
    report_id = args.report_id
    fmt = args.format or "markdown"

    if not report_id:
        print("❌ Se requiere --report-id")
        return 1

    output_path = args.output or f"data/exports/{report_id}.{fmt}"

    try:
        from services.documents import export_service as ex
        caps = ex.get_export_capabilities()

        if fmt == "markdown":
            content = ex.export_report_markdown(report_id, output_path=output_path,
                                                 engine=engine)
            print(f"✅ Exportado Markdown → {output_path}")
            if args.verbose:
                print(content[:500] + "…")

        elif fmt == "html":
            content = ex.export_report_html(report_id, output_path=output_path,
                                             engine=engine)
            print(f"✅ Exportado HTML → {output_path}")

        elif fmt == "docx":
            if not caps["docx"]:
                print("❌ python-docx no instalado. Usa: pip install python-docx")
                return 1
            content = ex.export_report_docx(report_id, output_path=output_path,
                                             engine=engine)
            if content:
                print(f"✅ Exportado DOCX → {output_path}")
            else:
                print("❌ Error generando DOCX")
                return 1

        elif fmt == "pdf":
            if not caps["pdf"]:
                print("❌ weasyprint no instalado. Usa: pip install weasyprint")
                return 1
            content = ex.export_report_pdf(report_id, output_path=output_path,
                                            engine=engine)
            if content:
                print(f"✅ Exportado PDF → {output_path}")
            else:
                print("❌ Error generando PDF")
                return 1
        else:
            print(f"❌ Formato desconocido: {fmt}. Usa: markdown, html, docx, pdf")
            return 1

        return 0
    except Exception as exc:
        print(f"❌ Excepción: {exc}")
        logger.exception("cmd_export")
        return 1


# ── CLI ───────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="document_core",
        description="Bloque 9 — Document Intelligence Pipeline CLI",
    )

    # Acciones principales (mutuamente excluyentes)
    action = p.add_mutually_exclusive_group(required=True)
    action.add_argument(
        "--register",
        metavar="PATH",
        help="Registra un archivo local.",
    )
    action.add_argument(
        "--parse",
        metavar="DOCUMENT_ID",
        dest="parse_id",
        help="Parsea un documento ya registrado.",
    )
    action.add_argument(
        "--parse-pending",
        action="store_true",
        default=False,
        help="Procesa todos los documentos pendientes.",
    )
    action.add_argument(
        "--index",
        metavar="DOCUMENT_ID",
        dest="index_id",
        help="(Re)indexa chunks en RAG.",
    )
    action.add_argument(
        "--search",
        metavar="QUERY",
        dest="search_query",
        help="Busca en el corpus documental.",
    )
    action.add_argument(
        "--list",
        action="store_true",
        default=False,
        help="Lista documentos registrados.",
    )
    action.add_argument(
        "--export",
        action="store_true",
        default=False,
        help="Exporta un borrador de informe.",
    )

    # Parámetros auxiliares
    p.add_argument("--source", help="Nombre de la fuente (para --register).")
    p.add_argument("--source-type", dest="source_type",
                   help="Tipo de fuente: boe, congreso, media, etc.")
    p.add_argument("--title", help="Título del documento (para --register).")
    p.add_argument("--url", help="URL fuente del documento (para --register).")
    p.add_argument("--limit", type=int, help="Límite de resultados.")
    p.add_argument("--report-id", dest="report_id", help="ID de borrador para --export.")
    p.add_argument(
        "--format",
        choices=["markdown", "html", "docx", "pdf"],
        default="markdown",
        help="Formato de exportación (default: markdown).",
    )
    p.add_argument("--output", help="Ruta de salida para la exportación.")
    p.add_argument("--dry-run", action="store_true", help="No persiste cambios en BD.")
    p.add_argument("--verbose", "-v", action="store_true", help="Salida detallada.")

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG,
                            format="%(levelname)s %(name)s: %(message)s")
    else:
        logging.basicConfig(level=logging.INFO,
                            format="%(levelname)s: %(message)s")

    engine = _get_engine()
    if engine is None and not args.dry_run:
        logger.warning("Sin conexión a BD — operando en modo caché de memoria.")

    if args.register:
        return cmd_register(args, engine)
    elif args.parse_id:
        return cmd_parse(args, engine)
    elif args.parse_pending:
        return cmd_parse_pending(args, engine)
    elif args.index_id:
        return cmd_index(args, engine)
    elif args.search_query:
        return cmd_search(args, engine)
    elif args.list:
        return cmd_list(args, engine)
    elif args.export:
        return cmd_export(args, engine)

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
