from __future__ import annotations

from datetime import datetime
from typing import Any

from services.exports.templates.briefing_template import BRIEFING_MD_TEMPLATE
from services.exports.templates.comms_plan_template import COMMS_MD_TEMPLATE
from services.exports.templates.dossier_template import DOSSIER_MD_TEMPLATE
from services.exports.templates.electoral_snapshot_template import ELECTORAL_MD_TEMPLATE
from services.exports.templates.risk_report_template import RISK_MD_TEMPLATE


def _render(template: str, ctx: dict[str, Any]) -> str:
    out = template
    for key, value in ctx.items():
        out = out.replace("{{" + key + "}}", str(value))
    # Eliminar placeholders no resueltos
    import re

    out = re.sub(r"\{\{[^}]+\}\}", "_(sin datos)_", out)
    return out


def _bullets(items: list[Any]) -> str:
    if not items:
        return "_(sin elementos)_"
    lines = []
    for it in items:
        if isinstance(it, dict):
            text = it.get("title") or it.get("name") or it.get("text") or str(it)
            extra = it.get("description") or it.get("detail") or ""
            if extra:
                lines.append(f"- **{text}** — {extra}")
            else:
                lines.append(f"- {text}")
        else:
            lines.append(f"- {it}")
    return "\n".join(lines)


def _table(rows: list[dict[str, Any]], cols: list[str] | None = None) -> str:
    if not rows:
        return "_(sin filas)_"
    cols = cols or list(rows[0].keys())
    head = "| " + " | ".join(cols) + " |"
    sep = "| " + " | ".join(["---"] * len(cols)) + " |"
    body = []
    for r in rows:
        body.append("| " + " | ".join(str(r.get(c, "")) for c in cols) + " |")
    return "\n".join([head, sep, *body])


def _quote(text: str) -> str:
    if not text:
        return ""
    return "\n".join("> " + ln for ln in text.split("\n"))


def _sources_md(sources: list[Any]) -> str:
    if not sources:
        return "_(sin fuentes)_"
    out = []
    for i, s in enumerate(sources, start=1):
        if isinstance(s, dict):
            t = s.get("title") or s.get("name") or "Fuente"
            url = s.get("url", "")
            out.append(f"[^{i}]: {t} {url}".strip())
        else:
            out.append(f"[^{i}]: {s}")
    return "\n".join(out)


def briefing_to_markdown(briefing_data: dict) -> str:
    ctx = {
        "title": briefing_data.get("title", "Briefing matinal"),
        "date": briefing_data.get("date", datetime.utcnow().date().isoformat()),
        "tenant": briefing_data.get("tenant", "—"),
        "summary": briefing_data.get("summary", "_(sin resumen)_"),
        "headlines": _bullets(briefing_data.get("headlines", [])),
        "risks": _bullets(briefing_data.get("risks", [])),
        "opportunities": _bullets(briefing_data.get("opportunities", [])),
        "actions": _bullets(briefing_data.get("actions", [])),
        "sources": _sources_md(briefing_data.get("sources", [])),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(BRIEFING_MD_TEMPLATE, ctx)


def dossier_to_markdown(actor_data: dict) -> str:
    ctx = {
        "name": actor_data.get("name", "Actor sin nombre"),
        "date": actor_data.get("date", datetime.utcnow().date().isoformat()),
        "tenant": actor_data.get("tenant", "—"),
        "biography": actor_data.get("biography", "_(sin biografía)_"),
        "trajectory": _bullets(actor_data.get("trajectory", [])),
        "positioning": actor_data.get("positioning", "_(sin posicionamiento)_"),
        "network": _bullets(actor_data.get("network", [])),
        "messages": _bullets(actor_data.get("messages", [])),
        "risks": _bullets(actor_data.get("risks", [])),
        "sources": _sources_md(actor_data.get("sources", [])),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(DOSSIER_MD_TEMPLATE, ctx)


def risk_report_to_markdown(risks: list[dict]) -> str:
    by_sev: dict[str, list[dict]] = {"critical": [], "high": [], "medium": [], "low": []}
    for r in risks:
        sev = (r.get("severity") or "medium").lower()
        if sev not in by_sev:
            sev = "medium"
        by_sev[sev].append(r)
    ctx = {
        "date": datetime.utcnow().date().isoformat(),
        "tenant": "—",
        "summary": f"Total riesgos: {len(risks)} (críticos={len(by_sev['critical'])}, altos={len(by_sev['high'])}, medios={len(by_sev['medium'])}, bajos={len(by_sev['low'])})",
        "critical": _bullets(by_sev["critical"]),
        "high": _bullets(by_sev["high"]),
        "medium": _bullets(by_sev["medium"]),
        "low": _bullets(by_sev["low"]),
        "mitigations": _bullets(
            [r.get("mitigation", "") for r in risks if r.get("mitigation")]
        ),
        "sources": _sources_md([r.get("source") for r in risks if r.get("source")]),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(RISK_MD_TEMPLATE, ctx)


def comms_plan_to_markdown(plan: dict) -> str:
    ctx = {
        "date": plan.get("date", datetime.utcnow().date().isoformat()),
        "tenant": plan.get("tenant", "—"),
        "campaign": plan.get("campaign", "Campaña sin título"),
        "objectives": _bullets(plan.get("objectives", [])),
        "audiences": _bullets(plan.get("audiences", [])),
        "key_messages": _bullets(plan.get("key_messages", [])),
        "channels": _bullets(plan.get("channels", [])),
        "calendar": _table(plan.get("calendar", [])) if isinstance(plan.get("calendar"), list) else str(plan.get("calendar", "_(sin calendario)_")),
        "metrics": _bullets(plan.get("metrics", [])),
        "approvals": _bullets(plan.get("approvals", [])),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(COMMS_MD_TEMPLATE, ctx)


def electoral_snapshot_to_markdown(snap: dict) -> str:
    parties = snap.get("parties", [])
    ctx = {
        "date": snap.get("date", datetime.utcnow().date().isoformat()),
        "tenant": snap.get("tenant", "—"),
        "constituency": snap.get("constituency", "Nacional"),
        "summary": snap.get("summary", "_(sin resumen)_"),
        "parties": _table(parties) if parties else "_(sin partidos)_",
        "blocks": _bullets(snap.get("blocks", [])),
        "coalitions": _bullets(snap.get("coalitions", [])),
        "transfers": _bullets(snap.get("transfers", [])),
        "assumptions": _bullets(snap.get("assumptions", [])),
        "sources": _sources_md(snap.get("sources", [])),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    return _render(ELECTORAL_MD_TEMPLATE, ctx)


def _custom_to_markdown(data: dict, branding: dict) -> str:
    title = data.get("title", "Informe")
    brand = branding.get("name", "POLITEIA Intelligence")
    lines = [
        f"# {title}",
        "",
        f"**Generado por:** {brand}",
        f"**Fecha:** {datetime.utcnow().date().isoformat()}",
        "",
        "---",
        "",
    ]
    for section, content in data.items():
        if section == "title":
            continue
        lines.append(f"## {section.replace('_', ' ').title()}")
        lines.append("")
        if isinstance(content, list):
            lines.append(_bullets(content))
        elif isinstance(content, dict):
            for k, v in content.items():
                lines.append(f"- **{k}**: {v}")
        else:
            lines.append(str(content))
        lines.append("")
        lines.append("---")
        lines.append("")
    lines.append(f"_Generado: {datetime.utcnow().isoformat(timespec='seconds')}_")
    return "\n".join(lines)


_RENDERERS = {
    "briefing": briefing_to_markdown,
    "dossier": dossier_to_markdown,
    "risk_report": lambda d: risk_report_to_markdown(d.get("risks", [])),
    "comms_plan": comms_plan_to_markdown,
    "electoral_snapshot": electoral_snapshot_to_markdown,
}


def export_to_markdown(data: dict, report_type: str, branding: dict) -> bytes:
    renderer = _RENDERERS.get(report_type)
    if renderer is not None:
        try:
            text = renderer(data)
        except Exception as e:  # noqa: BLE001
            text = f"# Error generando markdown\n\n{e}\n\nDatos crudos:\n\n```\n{data}\n```"
    else:
        text = _custom_to_markdown(data, branding)

    brand_name = branding.get("name", "")
    if brand_name:
        text = f"<!-- branding: {brand_name} -->\n" + text
    return text.encode("utf-8")
