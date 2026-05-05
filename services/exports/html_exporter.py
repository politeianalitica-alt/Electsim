from __future__ import annotations

import html as html_lib
from datetime import datetime
from typing import Any

from services.exports.templates.briefing_template import BRIEFING_HTML_TEMPLATE
from services.exports.templates.comms_plan_template import COMMS_HTML_TEMPLATE
from services.exports.templates.dossier_template import DOSSIER_HTML_TEMPLATE
from services.exports.templates.electoral_snapshot_template import ELECTORAL_HTML_TEMPLATE
from services.exports.templates.risk_report_template import RISK_HTML_TEMPLATE

BG = "#080C14"
CYAN = "#00D4FF"
TEXT = "#E2E8F0"


def _esc(s: Any) -> str:
    return html_lib.escape(str(s))


def _ul(items: list[Any]) -> str:
    if not items:
        return "<p><em>(sin elementos)</em></p>"
    out = ["<ul>"]
    for it in items:
        if isinstance(it, dict):
            t = it.get("title") or it.get("name") or it.get("text") or str(it)
            d = it.get("description") or it.get("detail") or ""
            if d:
                out.append(f"<li><strong>{_esc(t)}</strong> — {_esc(d)}</li>")
            else:
                out.append(f"<li>{_esc(t)}</li>")
        else:
            out.append(f"<li>{_esc(it)}</li>")
    out.append("</ul>")
    return "".join(out)


def _table(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "<p><em>(sin filas)</em></p>"
    cols = list(rows[0].keys())
    out = ["<table><thead><tr>"]
    for c in cols:
        out.append(f"<th>{_esc(c)}</th>")
    out.append("</tr></thead><tbody>")
    for r in rows:
        out.append("<tr>")
        for c in cols:
            out.append(f"<td>{_esc(r.get(c, ''))}</td>")
        out.append("</tr>")
    out.append("</tbody></table>")
    return "".join(out)


def _render(template: str, ctx: dict[str, Any]) -> str:
    out = template
    for k, v in ctx.items():
        out = out.replace("{{" + k + "}}", str(v))
    import re

    out = re.sub(r"\{\{[^}]+\}\}", "<em>(sin datos)</em>", out)
    return out


def _meta_tags(data: dict, branding: dict) -> str:
    tags = [
        '<meta charset="UTF-8">',
        f'<meta name="generator" content="POLITEIA Intelligence">',
        f'<meta name="generated" content="{datetime.utcnow().isoformat()}">',
    ]
    if branding.get("name"):
        tags.append(f'<meta name="brand" content="{_esc(branding["name"])}">')
    if data.get("tenant"):
        tags.append(f'<meta name="tenant" content="{_esc(data["tenant"])}">')
    return "\n".join(tags)


def _briefing_html(data: dict, branding: dict) -> str:
    ctx = {
        "title": _esc(data.get("title", "Briefing matinal")),
        "date": _esc(data.get("date", datetime.utcnow().date().isoformat())),
        "tenant": _esc(data.get("tenant", "—")),
        "summary": f"<p>{_esc(data.get('summary', ''))}</p>",
        "headlines": _ul(data.get("headlines", [])),
        "risks": _ul(data.get("risks", [])),
        "opportunities": _ul(data.get("opportunities", [])),
        "actions": _ul(data.get("actions", [])),
        "sources": _ul(data.get("sources", [])),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(BRIEFING_HTML_TEMPLATE, ctx)


def _dossier_html(data: dict, branding: dict) -> str:
    ctx = {
        "name": _esc(data.get("name", "Actor")),
        "date": _esc(data.get("date", datetime.utcnow().date().isoformat())),
        "tenant": _esc(data.get("tenant", "—")),
        "biography": f"<p>{_esc(data.get('biography', ''))}</p>",
        "trajectory": _ul(data.get("trajectory", [])),
        "positioning": f"<p>{_esc(data.get('positioning', ''))}</p>",
        "network": _ul(data.get("network", [])),
        "messages": _ul(data.get("messages", [])),
        "risks": _ul(data.get("risks", [])),
        "sources": _ul(data.get("sources", [])),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(DOSSIER_HTML_TEMPLATE, ctx)


def _risk_html(data: dict, branding: dict) -> str:
    risks = data.get("risks", [])
    by_sev: dict[str, list[dict]] = {"critical": [], "high": [], "medium": [], "low": []}
    for r in risks:
        sev = (r.get("severity") or "medium").lower()
        if sev not in by_sev:
            sev = "medium"
        by_sev[sev].append(r)
    ctx = {
        "date": _esc(datetime.utcnow().date().isoformat()),
        "tenant": _esc(data.get("tenant", "—")),
        "summary": f"<p>Total: {len(risks)}</p>",
        "critical": _ul(by_sev["critical"]),
        "high": _ul(by_sev["high"]),
        "medium": _ul(by_sev["medium"]),
        "low": _ul(by_sev["low"]),
        "mitigations": _ul([r.get("mitigation", "") for r in risks if r.get("mitigation")]),
        "sources": _ul([r.get("source") for r in risks if r.get("source")]),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(RISK_HTML_TEMPLATE, ctx)


def _comms_html(data: dict, branding: dict) -> str:
    cal = data.get("calendar", [])
    cal_html = _table(cal) if isinstance(cal, list) and cal and isinstance(cal[0], dict) else _ul(cal if isinstance(cal, list) else [cal])
    ctx = {
        "date": _esc(data.get("date", datetime.utcnow().date().isoformat())),
        "tenant": _esc(data.get("tenant", "—")),
        "campaign": _esc(data.get("campaign", "Campaña")),
        "objectives": _ul(data.get("objectives", [])),
        "audiences": _ul(data.get("audiences", [])),
        "key_messages": _ul(data.get("key_messages", [])),
        "channels": _ul(data.get("channels", [])),
        "calendar": cal_html,
        "metrics": _ul(data.get("metrics", [])),
        "approvals": _ul(data.get("approvals", [])),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(COMMS_HTML_TEMPLATE, ctx)


def _electoral_html(data: dict, branding: dict) -> str:
    parties = data.get("parties", [])
    parties_html = _table(parties) if parties and isinstance(parties[0], dict) else _ul(parties)
    ctx = {
        "date": _esc(data.get("date", datetime.utcnow().date().isoformat())),
        "tenant": _esc(data.get("tenant", "—")),
        "constituency": _esc(data.get("constituency", "Nacional")),
        "summary": f"<p>{_esc(data.get('summary', ''))}</p>",
        "parties": parties_html,
        "blocks": _ul(data.get("blocks", [])),
        "coalitions": _ul(data.get("coalitions", [])),
        "transfers": _ul(data.get("transfers", [])),
        "assumptions": _ul(data.get("assumptions", [])),
        "sources": _ul(data.get("sources", [])),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(ELECTORAL_HTML_TEMPLATE, ctx)


def _custom_html(data: dict, branding: dict) -> str:
    title = _esc(data.get("title", "Informe"))
    sections = []
    for k, v in data.items():
        if k == "title":
            continue
        if isinstance(v, list):
            content = _ul(v)
        elif isinstance(v, dict):
            content = "<ul>" + "".join(f"<li><strong>{_esc(kk)}</strong>: {_esc(vv)}</li>" for kk, vv in v.items()) + "</ul>"
        else:
            content = f"<p>{_esc(v)}</p>"
        sections.append(f'<section><h2>{_esc(k.replace("_", " ").title())}</h2>{content}</section>')
    body = "".join(sections) or "<p><em>(sin contenido)</em></p>"
    return f"""<!DOCTYPE html>
<html lang="es"><head>
{_meta_tags(data, branding)}
<title>{title}</title>
<style>
body{{background:{BG};color:{TEXT};font-family:-apple-system,Segoe UI,sans-serif;padding:40px;max-width:900px;margin:auto;}}
h1{{color:{CYAN};border-bottom:2px solid {CYAN};padding-bottom:8px;}}
h2{{color:{CYAN};margin-top:28px;}}
section{{border-left:3px solid {CYAN};padding-left:16px;margin:18px 0;}}
table{{border-collapse:collapse;width:100%;}}
th,td{{border:1px solid #1F2937;padding:6px 10px;text-align:left;}}
th{{background:#0F172A;color:{CYAN};}}
@media print{{body{{background:#fff;color:#000;}}h1,h2{{color:#0B3D91;}}}}
</style></head><body>
<h1>{title}</h1>
{body}
<p><small>Generado: {datetime.utcnow().isoformat(timespec='seconds')}</small></p>
</body></html>"""


_HTML_RENDERERS = {
    "briefing": _briefing_html,
    "dossier": _dossier_html,
    "risk_report": _risk_html,
    "comms_plan": _comms_html,
    "electoral_snapshot": _electoral_html,
}


def export_to_html(data: dict, report_type: str, branding: dict) -> bytes:
    renderer = _HTML_RENDERERS.get(report_type, _custom_html)
    try:
        html_text = renderer(data, branding)
    except Exception as e:  # noqa: BLE001
        html_text = f"<html><body><h1>Error</h1><pre>{_esc(e)}</pre></body></html>"
    # Ensure meta tags present
    if "<head>" in html_text and "<meta name=\"generator\"" not in html_text:
        html_text = html_text.replace("<head>", "<head>\n" + _meta_tags(data, branding))
    return html_text.encode("utf-8")
