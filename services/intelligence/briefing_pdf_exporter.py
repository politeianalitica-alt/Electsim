"""
Exportador PDF premium para briefings de ElectSim.

Estilo: azul marino y blanco, Times New Roman, consultoría premium.
Intenta reportlab primero, luego weasyprint, retorna None si ninguno disponible.
"""
from __future__ import annotations
import io
import logging
from datetime import datetime, timezone

log = logging.getLogger(__name__)

# Paleta de colores
_AZUL_MARINO = (0x1a, 0x2a, 0x4a)      # #1a2a4a
_AZUL_INST = (0x2e, 0x5e, 0x9e)         # #2e5e9e
_GRIS_CLARO = (0xf4, 0xf6, 0xfa)        # #f4f6fa
_ROJO_ALERTA = (0xc0, 0x30, 0x20)       # #c03020
_AMBAR_WARN = (0xe0, 0x90, 0x10)        # #e09010
_BLANCO = (0xff, 0xff, 0xff)
_NEGRO_TEXTO = (0x1a, 0x1a, 0x1a)


def export_briefing_pdf(briefing: dict, briefing_type: str = "executive") -> bytes | None:
    """
    Genera PDF del briefing. Retorna bytes o None si WeasyPrint/reportlab no disponibles.

    briefing_type: executive|client|campaign|crisis
    """
    try:
        return _export_with_reportlab(briefing, briefing_type)
    except ImportError:
        log.warning("reportlab no instalado. Intenta: pip install reportlab")
    except Exception as e:
        log.error("PDF export error (reportlab): %s", e)

    try:
        return _export_with_weasyprint(briefing, briefing_type)
    except ImportError:
        log.warning("weasyprint no instalado.")
    except Exception as e:
        log.error("PDF export error (weasyprint): %s", e)

    return None


def _export_with_reportlab(briefing: dict, briefing_type: str) -> bytes:
    """Genera PDF con reportlab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
    )

    azul = colors.Color(_AZUL_MARINO[0]/255, _AZUL_MARINO[1]/255, _AZUL_MARINO[2]/255)
    azul_inst = colors.Color(_AZUL_INST[0]/255, _AZUL_INST[1]/255, _AZUL_INST[2]/255)
    gris = colors.Color(_GRIS_CLARO[0]/255, _GRIS_CLARO[1]/255, _GRIS_CLARO[2]/255)
    rojo = colors.Color(_ROJO_ALERTA[0]/255, _ROJO_ALERTA[1]/255, _ROJO_ALERTA[2]/255)

    styles = getSampleStyleSheet()

    def _style(name, **kwargs):
        # Default fontName to Times-Roman unless overridden via kwargs
        kwargs.setdefault("fontName", "Times-Roman")
        return ParagraphStyle(name, **kwargs)

    title_style = _style("BTitle", fontSize=22, textColor=azul, spaceAfter=6, alignment=TA_CENTER, fontName="Times-Bold")
    sub_style = _style("BSub", fontSize=11, textColor=azul_inst, spaceAfter=4, alignment=TA_CENTER)
    h1_style = _style("BH1", fontSize=13, textColor=azul, spaceBefore=12, spaceAfter=4, fontName="Times-Bold")
    body_style = _style("BBody", fontSize=10, textColor=colors.Color(0.1, 0.1, 0.1), spaceAfter=6, leading=14, alignment=TA_JUSTIFY)
    bullet_style = _style("BBullet", fontSize=10, leftIndent=12, spaceAfter=3, leading=13)
    caption_style = _style("BCaption", fontSize=8, textColor=colors.gray, spaceAfter=2)
    alert_style = _style("BAlert", fontSize=10, textColor=rojo, fontName="Times-Bold", spaceAfter=4)

    story = []

    # Portada
    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph("ELECTSIM — POLITEIA", _style("BLogo", fontSize=10, textColor=azul_inst, alignment=TA_CENTER)))
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=azul))
    story.append(Spacer(1, 0.8*cm))
    type_labels = {
        "executive": "BRIEFING EJECUTIVO DIARIO",
        "client": "BRIEFING DE CLIENTE",
        "campaign": "BRIEFING DE CAMPAÑA",
        "crisis": "ALERTA DE CRISIS",
    }
    story.append(Paragraph(type_labels.get(briefing_type, "BRIEFING"), title_style))
    story.append(Paragraph(briefing.get("date", datetime.now().strftime("%d de %B de %Y")), sub_style))
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=azul_inst))
    story.append(Spacer(1, 1*cm))

    # Clasificación
    clasificacion = "USO EXCLUSIVO INTERNO" if briefing_type == "executive" else "CONFIDENCIAL"
    story.append(Paragraph(clasificacion, _style("BClass", fontSize=9, textColor=rojo, alignment=TA_CENTER, fontName="Times-Bold")))
    story.append(Spacer(1, 1*cm))

    # Resumen ejecutivo
    if briefing.get("executive_summary"):
        story.append(Paragraph("1. RESUMEN EJECUTIVO", h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=azul_inst))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(briefing["executive_summary"], body_style))
        story.append(Spacer(1, 0.5*cm))

    # Qué ha cambiado
    if briefing.get("what_changed"):
        story.append(Paragraph("2. QUÉ HA CAMBIADO", h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=azul_inst))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(briefing["what_changed"], body_style))
        story.append(Spacer(1, 0.5*cm))

    # Top noticias
    top_news = briefing.get("top_news", [])
    if top_news:
        story.append(Paragraph("3. NOTICIAS SELECCIONADAS", h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=azul_inst))
        story.append(Spacer(1, 0.3*cm))
        for i, art in enumerate(top_news[:5], 1):
            title = art.get("translated_title") or art.get("title") or ""
            source = art.get("source_name", "")
            score = art.get("relevance_score", "")
            score_str = f" [{score:.2f}]" if isinstance(score, float) else ""
            story.append(Paragraph(f"<b>{i}. {source}</b>{score_str}", bullet_style))
            story.append(Paragraph(title, body_style))
            story.append(Spacer(1, 0.2*cm))
        story.append(Spacer(1, 0.3*cm))

    # Narrativas
    narratives = briefing.get("narratives", [])
    if narratives:
        story.append(Paragraph("4. NARRATIVAS EMERGENTES", h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=azul_inst))
        story.append(Spacer(1, 0.3*cm))
        for n in narratives[:3]:
            if n.get("is_demo"):
                story.append(Paragraph(f"{n.get('frame_label','')}", alert_style))
            else:
                story.append(Paragraph(f"<b>{n.get('frame_label','')}</b> — {n.get('lifecycle','')}", bullet_style))
                if n.get("central_claim"):
                    story.append(Paragraph(f"Claim: {n['central_claim']}", body_style))
            story.append(Spacer(1, 0.2*cm))
        story.append(Spacer(1, 0.3*cm))

    # Señales críticas
    if briefing.get("critical_signals"):
        story.append(Paragraph("5. SEÑALES CRÍTICAS", h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=azul_inst))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(briefing["critical_signals"], body_style))
        story.append(Spacer(1, 0.5*cm))

    # Recomendaciones
    if briefing.get("recommendations"):
        story.append(Paragraph("6. RECOMENDACIONES", h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=azul_inst))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(briefing["recommendations"], body_style))
        story.append(Spacer(1, 0.5*cm))

    # Preguntas estratégicas
    if briefing.get("strategic_questions"):
        story.append(Paragraph("7. PREGUNTAS ESTRATÉGICAS", h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=azul_inst))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(briefing["strategic_questions"], body_style))
        story.append(Spacer(1, 0.5*cm))

    # Pie
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=azul))
    story.append(Spacer(1, 0.3*cm))
    mode_label = "DATOS DEMO" if briefing.get("mode") == "demo" else "Datos verificados"
    footer_text = (
        f"ElectSim / Politeia · {briefing.get('date','')} · {mode_label} · "
        f"Generado: {datetime.now().strftime('%H:%M')} · {clasificacion}"
    )
    story.append(Paragraph(footer_text, caption_style))

    doc.build(story)
    return buf.getvalue()


def _export_with_weasyprint(briefing: dict, briefing_type: str) -> bytes:
    """Genera PDF con WeasyPrint (HTML -> PDF)."""
    from weasyprint import HTML
    html = _build_html(briefing, briefing_type)
    return HTML(string=html).write_pdf()


def _build_html(briefing: dict, briefing_type: str) -> str:
    top_news_html = "".join(
        f"<li><b>{a.get('source_name','')}</b>: {a.get('translated_title') or a.get('title','')}</li>"
        for a in briefing.get("top_news", [])[:5]
    )
    narratives_html = "".join(
        f"<li><b>{n.get('frame_label','')}</b> — {n.get('lifecycle','')}</li>"
        for n in briefing.get("narratives", [])[:3]
    )
    date_str = briefing.get("date", datetime.now().strftime("%d de %B de %Y"))
    type_label = {
        "executive": "BRIEFING EJECUTIVO DIARIO",
        "client": "BRIEFING DE CLIENTE",
        "campaign": "BRIEFING DE CAMPAÑA",
        "crisis": "ALERTA DE CRISIS",
    }.get(briefing_type, "BRIEFING")
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
body {{font-family: "Times New Roman", Times, serif; color: #1a1a1a; margin: 2cm;}}
h1 {{color: #1a2a4a; font-size: 24pt; text-align: center;}}
h2 {{color: #1a2a4a; font-size: 14pt; border-bottom: 1px solid #2e5e9e; padding-bottom: 4px;}}
.subtitle {{color: #2e5e9e; text-align: center; font-size: 12pt;}}
.clasificacion {{color: #c03020; text-align: center; font-weight: bold; font-size: 10pt;}}
p {{font-size: 11pt; line-height: 1.5; text-align: justify;}}
footer {{border-top: 1px solid #1a2a4a; padding-top: 6px; font-size: 8pt; color: #666; margin-top: 2cm;}}
</style></head><body>
<h1>{type_label}</h1>
<p class="subtitle">{date_str}</p>
<p class="clasificacion">USO EXCLUSIVO INTERNO</p>
<h2>1. Resumen Ejecutivo</h2><p>{briefing.get('executive_summary','Sin datos')}</p>
<h2>2. Noticias Seleccionadas</h2><ul>{top_news_html or '<li>Sin datos</li>'}</ul>
<h2>3. Narrativas Emergentes</h2><ul>{narratives_html or '<li>Sin datos</li>'}</ul>
<h2>4. Señales Críticas</h2><p>{briefing.get('critical_signals','Sin señales')}</p>
<h2>5. Recomendaciones</h2><p>{briefing.get('recommendations','Sin recomendaciones')}</p>
<footer>ElectSim / Politeia · {date_str} · Clasificación: INTERNO</footer>
</body></html>"""
