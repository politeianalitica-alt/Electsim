from __future__ import annotations

import io
from datetime import datetime
from typing import Any

from services.exports.markdown_exporter import export_to_markdown

NAVY = (0x0B / 255, 0x3D / 255, 0x91 / 255)
CYAN = (0x00 / 255, 0xD4 / 255, 0xFF / 255)
DARK_BG = (0x08 / 255, 0x0C / 255, 0x14 / 255)


def _try_reportlab() -> Any | None:
    try:
        import reportlab  # noqa: F401

        return reportlab
    except Exception:  # noqa: BLE001
        return None


def _try_weasyprint() -> Any | None:
    try:
        import weasyprint  # noqa: F401

        return weasyprint
    except Exception:  # noqa: BLE001
        return None


def is_pdf_available() -> bool:
    return _try_reportlab() is not None or _try_weasyprint() is not None


def _flatten_sections(data: dict) -> list[tuple[str, str]]:
    """Devuelve lista de (titulo, contenido_texto)."""
    sections: list[tuple[str, str]] = []
    for k, v in data.items():
        if k in {"title", "tenant", "date"}:
            continue
        title = str(k).replace("_", " ").title()
        if isinstance(v, list):
            lines = []
            for it in v:
                if isinstance(it, dict):
                    t = it.get("title") or it.get("name") or it.get("text") or ""
                    d = it.get("description") or it.get("detail") or ""
                    lines.append(f"- {t}{(' — ' + d) if d else ''}")
                else:
                    lines.append(f"- {it}")
            content = "\n".join(lines) if lines else "(sin elementos)"
        elif isinstance(v, dict):
            content = "\n".join(f"- {kk}: {vv}" for kk, vv in v.items())
        else:
            content = str(v)
        sections.append((title, content))
    return sections


def _reportlab_pdf(data: dict, report_type: str, branding: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
    )

    buf = io.BytesIO()
    brand_name = branding.get("name", "POLITEIA Intelligence")
    title = data.get("title") or f"Informe — {report_type}"
    tenant = data.get("tenant", "—")
    today = data.get("date", datetime.utcnow().date().isoformat())

    navy_color = colors.Color(*NAVY)
    cyan_color = colors.Color(*CYAN)

    def _on_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(navy_color)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(2 * cm, A4[1] - 1.2 * cm, brand_name)
        canvas.setFillColor(colors.grey)
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.2 * cm, f"Tenant: {tenant}")
        canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f"Página {doc.page}")
        canvas.drawString(2 * cm, 1 * cm, today)
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2 * cm,
        title=title,
        author=brand_name,
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1c", parent=styles["Heading1"], textColor=navy_color, fontSize=22, leading=26)
    h2 = ParagraphStyle("h2c", parent=styles["Heading2"], textColor=cyan_color, fontSize=14, leading=18)
    body = ParagraphStyle("bodyc", parent=styles["BodyText"], fontSize=10, leading=14)
    small = ParagraphStyle("small", parent=styles["BodyText"], fontSize=8, textColor=colors.grey)

    story: list[Any] = []
    # Cover
    story.append(Spacer(1, 4 * cm))
    story.append(Paragraph(title, h1))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(f"Tipo de informe: {report_type}", body))
    story.append(Paragraph(f"Tenant: {tenant}", body))
    story.append(Paragraph(f"Fecha: {today}", body))
    story.append(Spacer(1, 1 * cm))
    if branding.get("subtitle"):
        story.append(Paragraph(branding["subtitle"], body))
    story.append(Spacer(1, 6 * cm))
    story.append(Paragraph(f"Generado por {brand_name}", small))
    story.append(PageBreak())

    sections = _flatten_sections(data)

    # TOC if more than 3 sections
    if len(sections) > 3:
        story.append(Paragraph("Índice", h2))
        for i, (t, _) in enumerate(sections, start=1):
            story.append(Paragraph(f"{i}. {t}", body))
        story.append(PageBreak())

    for t, content in sections:
        story.append(Paragraph(t, h2))
        story.append(Spacer(1, 0.2 * cm))
        for line in content.split("\n"):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 0.15 * cm))
                continue
            # Escape XML reserved
            safe = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(safe, body))
        story.append(Spacer(1, 0.4 * cm))

    if data.get("watermark"):
        story.append(Paragraph(f"<i>{data['watermark']}</i>", small))

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    return buf.getvalue()


def _weasyprint_pdf(data: dict, report_type: str, branding: dict) -> bytes:
    import weasyprint  # type: ignore[import-not-found]

    from services.exports.html_exporter import export_to_html

    html_bytes = export_to_html(data, report_type, branding)
    return weasyprint.HTML(string=html_bytes.decode("utf-8")).write_pdf()


def export_to_pdf(data: dict, report_type: str, branding: dict) -> bytes:
    """Returns PDF bytes. Tries reportlab, then weasyprint, then markdown fallback."""
    rl = _try_reportlab()
    if rl is not None:
        try:
            out = _reportlab_pdf(data, report_type, branding)
            return out
        except Exception as e:  # noqa: BLE001
            err = e
    else:
        err = None

    wp = _try_weasyprint()
    if wp is not None:
        try:
            return _weasyprint_pdf(data, report_type, branding)
        except Exception:  # noqa: BLE001
            pass

    # Fallback: return markdown bytes with note
    md = export_to_markdown(data, report_type, branding)
    note = (
        b"<!-- PDF backends no disponibles. Devolviendo Markdown. -->\n"
        b"<!-- Causa: " + (str(err).encode("utf-8") if err else b"sin backend") + b" -->\n"
    )
    return note + md
