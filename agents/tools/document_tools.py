"""
Document Tools — Bloque 9.

Herramientas del Brain para el módulo documental:
  search_documents, search_document_chunks, get_document_summary,
  get_document_tables, get_document_citations,
  create_draft_report, add_evidence_to_report.

Registradas en DOCUMENT_TOOLS para integración con
el sistema de herramientas del agente (llm_tools_registry.py).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _get_engine() -> Any:
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


# ── Tool functions ────────────────────────────────────────────────────────────

def _search_documents(params: dict) -> str:
    """Busca documentos por consulta textual."""
    query = params.get("query", "").strip()
    limit = int(params.get("limit", 10))

    if not query:
        return "Error: se requiere el parámetro 'query'."

    try:
        from services.documents.document_service import search_documents
        df = search_documents(query, limit=limit, engine=_get_engine())
        if df.empty:
            return f"No se encontraron documentos para: '{query}'."

        lines = [f"**Resultados para '{query}'** ({len(df)} encontrados):\n"]
        for _, row in df.iterrows():
            title = row.get("title") or row.get("document_id", "—")
            source_type = row.get("source_type", "")
            chunk_text = str(row.get("chunk_text", ""))[:200]
            score = row.get("score")
            score_str = f" (score: {score:.3f})" if score else ""
            lines.append(f"- **{title}** [{source_type}]{score_str}")
            if chunk_text:
                lines.append(f"  > {chunk_text}...")
        return "\n".join(lines)
    except Exception as exc:
        logger.debug("_search_documents: %s", exc)
        return f"Error buscando documentos: {exc}"


def _search_document_chunks(params: dict) -> str:
    """Busca chunks relevantes por consulta; devuelve citas."""
    query = params.get("query", "").strip()
    k = int(params.get("k", 5))
    source_type = params.get("source_type")

    if not query:
        return "Error: se requiere el parámetro 'query'."

    try:
        from etl.sources.documents.document_rag import search_document_chunks
        filters = {"source_type": source_type} if source_type else None
        results = search_document_chunks(query, filters=filters, k=k,
                                         engine=_get_engine())
        if not results:
            return f"No se encontraron fragmentos para: '{query}'."

        lines = [f"**Fragmentos relevantes para '{query}'** ({len(results)}):\n"]
        for r in results:
            title = r.title or r.document_id or "—"
            section = f" § {r.section_title}" if r.section_title else ""
            page = f" p. {r.page_number}" if r.page_number else ""
            text = (r.chunk_text or "")[:300]
            lines.append(f"**{title}**{section}{page}")
            lines.append(f"> {text}..." if text else "")
            lines.append("")
        return "\n".join(lines)
    except Exception as exc:
        logger.debug("_search_document_chunks: %s", exc)
        return f"Error buscando fragmentos: {exc}"


def _get_document_summary(params: dict) -> str:
    """Devuelve resumen y metadatos de un documento."""
    document_id = params.get("document_id", "").strip()
    if not document_id:
        return "Error: se requiere 'document_id'."

    try:
        from services.documents.document_service import get_document
        doc = get_document(document_id, engine=_get_engine())
        if not doc:
            return f"Documento no encontrado: {document_id}"

        lines = [
            f"**{doc.get('title') or doc.get('source', document_id)}**",
            f"- ID: `{document_id}`",
            f"- Tipo: {doc.get('source_type', '—')}",
            f"- Fuente: {doc.get('source', '—')}",
            f"- Estado de parseo: {doc.get('parse_status', '—')}",
            f"- Idioma: {doc.get('language', '—')}",
        ]
        if doc.get("page_count"):
            lines.append(f"- Páginas: {doc['page_count']}")
        if doc.get("word_count"):
            lines.append(f"- Palabras: {doc['word_count']:,}")
        if doc.get("chunk_count") is not None:
            lines.append(f"- Chunks indexados: {doc['chunk_count']}")
        if doc.get("table_count") is not None:
            lines.append(f"- Tablas extraídas: {doc['table_count']}")
        if doc.get("source_url"):
            lines.append(f"- URL: {doc['source_url']}")
        return "\n".join(lines)
    except Exception as exc:
        logger.debug("_get_document_summary: %s", exc)
        return f"Error recuperando documento: {exc}"


def _get_document_tables(params: dict) -> str:
    """Lista las tablas extraídas de un documento."""
    document_id = params.get("document_id", "").strip()
    if not document_id:
        return "Error: se requiere 'document_id'."

    try:
        from sqlalchemy import text as sa_text
        import pandas as pd
        eng = _get_engine()
        if eng is None:
            return "No hay conexión a base de datos para recuperar tablas."

        df = pd.read_sql(sa_text("""
            SELECT table_id, table_title, sheet_name, page_number,
                   row_count, col_count, headers, confidence_score
            FROM extracted_tables
            WHERE document_id = :doc_id
            ORDER BY page_number, table_id
        """), eng, params={"doc_id": document_id})

        if df.empty:
            return f"No se encontraron tablas para el documento `{document_id}`."

        lines = [f"**Tablas extraídas de `{document_id}`** ({len(df)}):\n"]
        for _, row in df.iterrows():
            title = row.get("table_title") or row.get("table_id", "—")
            sheet = f" [{row['sheet_name']}]" if row.get("sheet_name") else ""
            page = f" p. {row['page_number']}" if row.get("page_number") else ""
            dims = f" ({row.get('row_count', '?')}×{row.get('col_count', '?')})"
            lines.append(f"- **{title}**{sheet}{page}{dims}")
        return "\n".join(lines)
    except Exception as exc:
        logger.debug("_get_document_tables: %s", exc)
        return f"Error recuperando tablas: {exc}"


def _get_document_citations(params: dict) -> str:
    """Devuelve las citas/evidencias de un documento."""
    document_id = params.get("document_id", "").strip()
    limit = int(params.get("limit", 10))

    if not document_id:
        return "Error: se requiere 'document_id'."

    try:
        from services.documents.document_service import get_document_evidence
        df = get_document_evidence(document_id, engine=_get_engine())
        if df.empty:
            return f"No hay evidencias registradas para `{document_id}`."

        df = df.head(limit)
        lines = [f"**Evidencias de `{document_id}`** ({len(df)} de {limit} máx.):\n"]
        for _, row in df.iterrows():
            label = row.get("source_label") or row.get("citation_id", "—")
            section = f" § {row['section_title']}" if row.get("section_title") else ""
            page = f" p. {row['page_number']}" if row.get("page_number") else ""
            quote = str(row.get("quote", ""))[:200]
            lines.append(f"**{label}**{section}{page}")
            if quote:
                lines.append(f'> [{quote[:80]}...]')
            lines.append("")
        return "\n".join(lines)
    except Exception as exc:
        logger.debug("_get_document_citations: %s", exc)
        return f"Error recuperando citas: {exc}"


def _create_draft_report(params: dict) -> str:
    """Crea un nuevo borrador de informe."""
    title = params.get("title", "").strip()
    report_type = params.get("report_type", "custom")
    client_id = params.get("client_id")
    created_by = params.get("created_by", "brain")

    if not title:
        return "Error: se requiere el parámetro 'title'."

    try:
        from services.documents.draft_service import create_draft_report
        report = create_draft_report(
            title=title,
            report_type=report_type,
            client_id=client_id,
            created_by=created_by,
            engine=_get_engine(),
        )
        return (
            f"✅ Borrador creado: **{report.title}**\n"
            f"- ID: `{report.report_id}`\n"
            f"- Tipo: {report.report_type}\n"
            f"- Estado: {report.status}\n"
            f"Usa `add_evidence_to_report` para añadir secciones y evidencias."
        )
    except Exception as exc:
        logger.debug("_create_draft_report: %s", exc)
        return f"Error creando borrador: {exc}"


def _add_evidence_to_report(params: dict) -> str:
    """Añade una sección con evidencia a un borrador de informe."""
    report_id = params.get("report_id", "").strip()
    section_title = params.get("section_title", "").strip()
    body = params.get("body", "").strip()
    evidence_ids = params.get("evidence_ids", [])

    if not report_id:
        return "Error: se requiere 'report_id'."
    if not section_title:
        return "Error: se requiere 'section_title'."
    if not body:
        return "Error: se requiere 'body' con el contenido de la sección."

    try:
        from services.documents.draft_service import add_section, get_report
        add_section(
            report_id=report_id,
            title=section_title,
            body_markdown=body,
            evidence_ids=evidence_ids,
            engine=_get_engine(),
        )
        report = get_report(report_id, engine=_get_engine())
        n_sections = len(report.sections) if report else "?"
        return (
            f"✅ Sección añadida al borrador `{report_id}`.\n"
            f"- Sección: **{section_title}**\n"
            f"- Total secciones: {n_sections}\n"
            + (f"- Evidencias vinculadas: {len(evidence_ids)}" if evidence_ids else "")
        )
    except Exception as exc:
        logger.debug("_add_evidence_to_report: %s", exc)
        return f"Error añadiendo sección: {exc}"


# ── Registry ──────────────────────────────────────────────────────────────────

DOCUMENT_TOOLS = [
    {
        "name": "search_documents",
        "description": (
            "Busca documentos en el corpus documental de ElectSim "
            "(BOE, BOCG, informes, PDFs, Excel, manifestos, etc.) "
            "usando búsqueda semántica o full-text."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Consulta de búsqueda en lenguaje natural.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Número máximo de resultados (default: 10).",
                    "default": 10,
                },
            },
            "required": ["query"],
        },
        "function": _search_documents,
    },
    {
        "name": "search_document_chunks",
        "description": (
            "Busca fragmentos específicos (chunks) en documentos del corpus. "
            "Devuelve citas con referencia de página, sección y texto original. "
            "Ideal para encontrar párrafos concretos de leyes, informes o manifestos."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Consulta de búsqueda.",
                },
                "k": {
                    "type": "integer",
                    "description": "Número de fragmentos a devolver (default: 5).",
                    "default": 5,
                },
                "source_type": {
                    "type": "string",
                    "description": (
                        "Filtrar por tipo de fuente: boe, congreso, senado, "
                        "eurlex, media, tender, manifesto, economic_report, other."
                    ),
                },
            },
            "required": ["query"],
        },
        "function": _search_document_chunks,
    },
    {
        "name": "get_document_summary",
        "description": (
            "Obtiene los metadatos y estadísticas de un documento concreto: "
            "tipo, fuente, número de páginas, palabras, chunks indexados, tablas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "ID único del documento (formato UUID).",
                },
            },
            "required": ["document_id"],
        },
        "function": _get_document_summary,
    },
    {
        "name": "get_document_tables",
        "description": (
            "Lista las tablas de datos extraídas de un documento: "
            "título, hoja (Excel), página, dimensiones y confianza de extracción."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "ID único del documento.",
                },
            },
            "required": ["document_id"],
        },
        "function": _get_document_tables,
    },
    {
        "name": "get_document_citations",
        "description": (
            "Devuelve las citas y evidencias registradas de un documento, "
            "incluyendo referencia exacta (página, sección) y extracto del texto original."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "ID único del documento.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Máximo de citas a devolver (default: 10).",
                    "default": 10,
                },
            },
            "required": ["document_id"],
        },
        "function": _get_document_citations,
    },
    {
        "name": "create_draft_report",
        "description": (
            "Crea un nuevo borrador de informe en el Draft Studio. "
            "Tipos disponibles: daily_briefing, client_report, legislative_note, "
            "media_analysis, risk_profile, electoral_report, custom."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Título del informe.",
                },
                "report_type": {
                    "type": "string",
                    "description": "Tipo de informe.",
                    "enum": [
                        "daily_briefing", "client_report", "legislative_note",
                        "media_analysis", "risk_profile", "electoral_report", "custom",
                    ],
                    "default": "custom",
                },
                "client_id": {
                    "type": "string",
                    "description": "ID del cliente (opcional).",
                },
            },
            "required": ["title"],
        },
        "function": _create_draft_report,
    },
    {
        "name": "add_evidence_to_report",
        "description": (
            "Añade una sección con contenido y evidencias documentales "
            "a un borrador de informe existente."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "report_id": {
                    "type": "string",
                    "description": "ID del borrador de informe.",
                },
                "section_title": {
                    "type": "string",
                    "description": "Título de la nueva sección.",
                },
                "body": {
                    "type": "string",
                    "description": "Contenido en Markdown de la sección.",
                },
                "evidence_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "IDs de citas/evidencias a vincular (opcional).",
                    "default": [],
                },
            },
            "required": ["report_id", "section_title", "body"],
        },
        "function": _add_evidence_to_report,
    },
]
