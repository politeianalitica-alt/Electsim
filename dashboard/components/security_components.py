"""
Security Components — Bloque 13.

Componentes de dominio para seguridad, RBAC, auditoría y deployment.
Integran con dashboard.ui.tokens para el design system consistente.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED, BLUE,
)
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_user_card ───────────────────────────────────────────────────────────

def render_user_card(
    user: dict[str, Any],
    show_roles: bool = True,
    show_actions: bool = False,
) -> None:
    """
    Tarjeta de usuario con roles y estado.

    Args:
        user: Dict de usuario.
        show_roles: Mostrar badges de roles.
        show_actions: Mostrar botones de acción.
    """
    email = user.get("email", "—")
    nombre = user.get("nombre", user.get("name", ""))
    activo = user.get("activo", True)
    is_superadmin = user.get("is_superadmin", False)
    roles = user.get("roles", [])
    tenant_id = user.get("tenant_id", "")
    last_login = user.get("last_login", "")

    status_color = GREEN if activo else RED
    status_label = "Activo" if activo else "Inactivo"
    superadmin_badge = (
        f"<span style='background:#7c3aed;color:#ede9fe;font-size:10px;"
        f"padding:1px 6px;border-radius:3px;margin-left:6px;'>⭐ Super Admin</span>"
        if is_superadmin else ""
    )

    roles_html = ""
    if show_roles and roles:
        role_chips = " ".join(
            f"<span style='background:{BG3};color:{CYAN};font-size:9px;"
            f"padding:1px 5px;border-radius:3px;'>{r}</span>"
            for r in roles[:5]
        )
        roles_html = f"<div style='margin-top:4px;'>{role_chips}</div>"

    meta_parts = []
    if tenant_id:
        meta_parts.append(f"🏢 {tenant_id}")
    if last_login:
        meta_html_login = str(last_login)[:10]
        meta_parts.append(f"🕐 {meta_html_login}")
    meta_html = " &nbsp;|&nbsp; ".join(
        f"<span style='color:{MUTED};font-size:10px;'>{p}</span>" for p in meta_parts
    )

    display_name = nombre if nombre else email

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {status_color};border-radius:6px;padding:10px 12px;margin:3px 0;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:center;'>"
        f"    <div>"
        f"      <span style='color:{TEXT};font-size:13px;font-weight:700;'>👤 {display_name}</span>"
        f"      {superadmin_badge}"
        f"    </div>"
        f"    <span style='color:{status_color};font-size:10px;font-weight:600;'>{status_label}</span>"
        f"  </div>"
        f"  <div style='color:{MUTED};font-size:11px;'>{email}</div>"
        f"  {roles_html}"
        f"  <div style='margin-top:4px;'>{meta_html}</div>"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_tenant_card ─────────────────────────────────────────────────────────

def render_tenant_card(
    tenant: dict[str, Any],
    show_features: bool = True,
) -> None:
    """
    Tarjeta de tenant/cliente.

    Args:
        tenant: Dict de tenant.
        show_features: Mostrar features activadas.
    """
    nombre = tenant.get("nombre", "—")
    slug = tenant.get("slug", "")
    plan = tenant.get("plan", "starter")
    activo = tenant.get("activo", True)
    max_users = tenant.get("max_users", 0)
    features = tenant.get("features", [])

    plan_colors = {
        "starter": MUTED,
        "professional": BLUE,
        "enterprise": CYAN,
    }
    plan_color = plan_colors.get(plan.lower(), MUTED)
    status_color = GREEN if activo else RED

    features_html = ""
    if show_features and features:
        f_list = features if isinstance(features, list) else []
        chips = " ".join(
            f"<span style='background:{BG3};color:{MUTED};font-size:9px;"
            f"padding:1px 4px;border-radius:3px;'>{f}</span>"
            for f in f_list[:6]
        )
        features_html = f"<div style='margin-top:4px;'>{chips}</div>"

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {plan_color};border-radius:6px;padding:10px 12px;margin:3px 0;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:center;'>"
        f"    <div>"
        f"      <span style='color:{TEXT};font-size:13px;font-weight:700;'>🏢 {nombre}</span>"
        f"      <span style='color:{MUTED};font-size:10px;margin-left:6px;'>/{slug}</span>"
        f"    </div>"
        f"    <div style='text-align:right;'>"
        f"      <span style='color:{plan_color};font-size:11px;font-weight:600;'>{plan.upper()}</span><br>"
        f"      <span style='color:{status_color};font-size:10px;'>"
        f"{'Activo' if activo else 'Inactivo'}</span>"
        f"    </div>"
        f"  </div>"
        f"  <div style='color:{MUTED};font-size:10px;margin-top:2px;'>👥 Máx. {max_users} usuarios</div>"
        f"  {features_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_role_matrix ─────────────────────────────────────────────────────────

def render_role_matrix(
    roles: list[dict[str, Any]],
    title: str = "Matriz de roles y permisos",
) -> None:
    """
    Tabla/matriz de roles con sus permisos principales.

    Args:
        roles: Lista de roles con {id, nombre, permissions, description}.
        title: Título.
    """
    if not roles:
        no_data_state("Roles", "No hay roles definidos.")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🛡️ {title}</p>",
        unsafe_allow_html=True,
    )

    for role in roles:
        role_id = role.get("id", "—")
        nombre = role.get("nombre", role_id)
        description = role.get("description", "")
        is_system = role.get("is_system", False)
        n_permissions = role.get("n_permissions", len(role.get("permissions", [])))

        system_badge = (
            f"<span style='background:{BG3};color:{MUTED};font-size:9px;"
            f"padding:1px 4px;border-radius:3px;'>sistema</span>"
            if is_system else ""
        )

        with st.expander(f"🛡️ {nombre} ({n_permissions} permisos)"):
            if description:
                st.caption(description)

            perms = role.get("permissions", [])
            if perms:
                # Agrupar por dominio
                domain_perms: dict[str, list[str]] = {}
                for perm in perms:
                    parts = perm.split(":")
                    domain = parts[0] if len(parts) >= 2 else "other"
                    domain_perms.setdefault(domain, []).append(perm)

                cols = st.columns(min(len(domain_perms), 4))
                for col, (domain, domain_perm_list) in zip(cols, domain_perms.items()):
                    with col:
                        st.markdown(
                            f"<p style='color:{MUTED};font-size:10px;"
                            f"font-weight:600;margin:0;text-transform:uppercase;'>{domain}</p>",
                            unsafe_allow_html=True,
                        )
                        for p in domain_perm_list:
                            action = p.split(":")[-1] if ":" in p else p
                            st.markdown(
                                f"<div style='color:{GREEN};font-size:10px;'>✓ {action}</div>",
                                unsafe_allow_html=True,
                            )


# ── render_audit_event_card ────────────────────────────────────────────────────

def render_audit_event_card(
    event: dict[str, Any],
    compact: bool = False,
) -> None:
    """
    Tarjeta de evento de auditoría.

    Args:
        event: Dict de AuditEvent.
        compact: Si True, versión compacta (una línea).
    """
    event_type = event.get("event_type", "—")
    user_id = event.get("user_id", "anónimo")
    result = event.get("result", "ok")
    action = event.get("action", "")
    risk_score = event.get("risk_score", 0)
    created_at = str(event.get("created_at", ""))[:19]

    result_colors = {
        "ok": GREEN,
        "denied": AMBER,
        "error": RED,
    }
    result_color = result_colors.get(result, MUTED)
    result_icon = {"ok": "✅", "denied": "🚫", "error": "❌"}.get(result, "•")

    risk_color = RED if risk_score >= 50 else AMBER if risk_score >= 20 else MUTED

    if compact:
        st.markdown(
            f"<div style='display:flex;justify-content:space-between;padding:3px 0;"
            f"border-bottom:1px solid {BORDER};'>"
            f"  <span style='color:{TEXT2};font-size:11px;'>"
            f"    {result_icon} <code style='font-size:10px;'>{event_type}</code> "
            f"    <span style='color:{MUTED};'>{user_id[:20]}</span>"
            f"  </span>"
            f"  <span style='color:{risk_color};font-size:10px;'>R:{risk_score}</span>"
            f"  <span style='color:{MUTED};font-size:10px;'>{created_at}</span>"
            f"</div>",
            unsafe_allow_html=True,
        )
        return

    details = event.get("details", {})
    resource_type = event.get("resource_type", "")
    resource_id = event.get("resource_id", "")

    resource_html = ""
    if resource_type or resource_id:
        resource_html = (
            f"<span style='color:{MUTED};font-size:10px;'>"
            f"📎 {resource_type}/{resource_id}</span>"
        )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {result_color};border-radius:4px;padding:8px 10px;margin:3px 0;'>"
        f"  <div style='display:flex;justify-content:space-between;'>"
        f"    <div>"
        f"      <span style='color:{result_color};font-size:13px;'>{result_icon}</span>"
        f"      <code style='color:{TEXT};font-size:11px;'>{event_type}</code>"
        f"      <span style='color:{MUTED};font-size:10px;margin-left:6px;'>👤 {user_id[:30]}</span>"
        f"    </div>"
        f"    <div style='text-align:right;'>"
        f"      <span style='color:{risk_color};font-size:10px;'>risk:{risk_score}</span>"
        f"      <span style='color:{MUTED};font-size:10px;margin-left:6px;'>{created_at}</span>"
        f"    </div>"
        f"  </div>"
        f"  <div style='margin-top:2px;'>"
        f"    <span style='color:{TEXT2};font-size:11px;'>{action}</span>"
        f"    {resource_html}"
        f"  </div>"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_secret_status_panel ─────────────────────────────────────────────────

def render_secret_status_panel(
    secrets: list[dict[str, Any]],
    title: str = "Estado de secretos",
) -> None:
    """
    Panel de estado de secretos de configuración.

    NUNCA muestra valores reales.

    Args:
        secrets: Lista de SecretReference dicts.
        title: Título.
    """
    if not secrets:
        no_data_state("Secretos", "No hay secretos registrados.")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🔑 {title}</p>",
        unsafe_allow_html=True,
    )

    # Resumen
    n_present = sum(1 for s in secrets if s.get("status") == "present")
    n_missing = sum(1 for s in secrets if s.get("status") == "missing")
    n_placeholder = sum(1 for s in secrets if s.get("status") == "placeholder")
    n_invalid = sum(1 for s in secrets if s.get("status") == "invalid")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("✅ Presentes", n_present)
    with col2:
        st.metric("❌ Faltantes", n_missing, delta=f"-{n_missing}" if n_missing else None)
    with col3:
        st.metric("⚠️ Placeholder", n_placeholder)
    with col4:
        st.metric("🚫 Inválidos", n_invalid)

    st.divider()

    for secret in secrets:
        key = secret.get("key", "—")
        status = secret.get("status", "missing")
        required = secret.get("required", False)
        descripcion = secret.get("descripcion", "")
        hint = secret.get("hint", "")
        category = secret.get("category", "")

        status_icons = {
            "present": "✅",
            "missing": "❌",
            "placeholder": "⚠️",
            "invalid": "🚫",
        }
        status_colors = {
            "present": GREEN,
            "missing": RED,
            "placeholder": AMBER,
            "invalid": RED,
        }
        icon = status_icons.get(status, "❓")
        color = status_colors.get(status, MUTED)
        req_badge = (
            f"<span style='color:{RED};font-size:9px;'>requerido</span>"
            if required else ""
        )
        hint_html = (
            f"<span style='color:{MUTED};font-size:10px;'>💡 {hint}</span>"
            if hint and status != "present" else ""
        )

        st.markdown(
            f"<div style='display:flex;justify-content:space-between;align-items:center;"
            f"padding:5px 0;border-bottom:1px solid {BORDER};'>"
            f"  <div>"
            f"    <span style='color:{color};font-size:13px;'>{icon}</span>"
            f"    <code style='color:{TEXT};font-size:11px;'>{key}</code>"
            f"    <span style='color:{MUTED};font-size:10px;margin-left:6px;'>[{category}]</span>"
            f"    {req_badge}"
            f"  </div>"
            f"  <div style='text-align:right;'>"
            f"    <span style='color:{color};font-size:11px;font-weight:600;'>{status}</span><br>"
            f"    {hint_html}"
            f"  </div>"
            f"</div>",
            unsafe_allow_html=True,
        )


# ── render_deployment_check_panel ──────────────────────────────────────────────

def render_deployment_check_panel(
    checks: list[dict[str, Any]],
    title: str = "Checks de despliegue",
) -> None:
    """
    Panel de verificaciones de seguridad del despliegue.

    Args:
        checks: Lista de SecurityCheckResult dicts.
        title: Título.
    """
    if not checks:
        no_data_state("Deployment checks")
        return

    # Score
    from security.deployment_checks import get_security_score
    score = get_security_score(checks)

    score_val = score.get("score", 0)
    health = score.get("health", "unknown")
    score_color = GREEN if score_val >= 75 else AMBER if score_val >= 50 else RED

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-radius:8px;padding:14px;margin-bottom:12px;'>"
        f"  <p style='color:{MUTED};font-size:11px;text-transform:uppercase;margin:0;'>{title}</p>"
        f"  <div style='display:flex;align-items:baseline;gap:8px;'>"
        f"    <span style='color:{score_color};font-size:36px;font-weight:800;'>{score_val}</span>"
        f"    <span style='color:{MUTED};font-size:14px;'>/100 — {health}</span>"
        f"  </div>"
        f"  <div style='height:6px;background:{BORDER};border-radius:3px;margin:6px 0;'>"
        f"    <div style='width:{score_val}%;height:100%;background:{score_color};border-radius:3px;'></div>"
        f"  </div>"
        f"  <div style='display:flex;gap:16px;'>"
        f"    <span style='color:{GREEN};font-size:11px;'>✅ {score.get('passed', 0)} OK</span>"
        f"    <span style='color:{RED};font-size:11px;'>❌ {score.get('failed', 0)} fallos</span>"
        f"    <span style='color:{RED};font-size:11px;font-weight:700;'>"
        f"      🚨 {score.get('critical_failures', 0)} críticos</span>"
        f"  </div>"
        f"</div>",
        unsafe_allow_html=True,
    )

    severity_colors = {
        "critical": RED, "high": "#f97316", "medium": AMBER, "low": BLUE, "info": MUTED,
    }

    for check in checks:
        passed = check.get("passed", True)
        name = check.get("name", "—")
        message = check.get("message", "")
        severity = check.get("severity", "info")
        recommendation = check.get("recommendation", "")
        category = check.get("category", "")

        icon = "✅" if passed else "❌"
        sev_color = severity_colors.get(severity, MUTED) if not passed else GREEN
        rec_html = (
            f"<div style='color:{AMBER};font-size:10px;margin-top:2px;'>💡 {recommendation}</div>"
            if recommendation and not passed else ""
        )

        st.markdown(
            f"<div style='border-left:3px solid {sev_color};padding:4px 8px;margin:2px 0;'>"
            f"  <div style='display:flex;justify-content:space-between;'>"
            f"    <span style='color:{TEXT};font-size:12px;'>{icon} {name}</span>"
            f"    <span style='color:{MUTED};font-size:10px;'>[{category}] {severity}</span>"
            f"  </div>"
            f"  <div style='color:{TEXT2};font-size:11px;'>{message}</div>"
            f"  {rec_html}"
            f"</div>",
            unsafe_allow_html=True,
        )


# ── render_data_classification_badge ──────────────────────────────────────────

def render_data_classification_badge(
    level: str,
    inline: bool = False,
) -> str | None:
    """
    Badge de clasificación de datos.

    Args:
        level: Nivel de clasificación.
        inline: Si True, devuelve HTML str.

    Returns:
        HTML str si inline=True, None si renderiza.
    """
    from security.data_classification import get_level_info
    try:
        from security.schemas import DataClassificationLevel
        level_enum = DataClassificationLevel(level)
        info = get_level_info(level_enum)
    except ValueError:
        info = {"label": level, "color": MUTED, "icon": "❓"}

    color = info.get("color", MUTED)
    label = info.get("label", level)
    icon = info.get("icon", "🔖")

    html = (
        f"<span style='background:{color}22;color:{color};border:1px solid {color}55;"
        f"font-size:10px;padding:1px 6px;border-radius:3px;'>{icon} {label}</span>"
    )

    if inline:
        return html

    st.markdown(html, unsafe_allow_html=True)
    return None


# ── render_export_job_panel ────────────────────────────────────────────────────

def render_export_job_panel(
    jobs: list[dict[str, Any]],
    title: str = "Export jobs",
    show_approve_button: bool = False,
) -> None:
    """
    Panel de export jobs.

    Args:
        jobs: Lista de ExportJob dicts.
        title: Título.
        show_approve_button: Si True, muestra botón Aprobar para jobs pendientes.
    """
    if not jobs:
        no_data_state("Export jobs", "No hay exportaciones registradas.")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"📤 {title} ({len(jobs)})</p>",
        unsafe_allow_html=True,
    )

    status_colors = {
        "pending": AMBER,
        "approved": GREEN,
        "rejected": RED,
        "completed": BLUE,
        "cancelled": MUTED,
    }

    for job in jobs:
        job_id = job.get("id", "—")[:8]
        module_id = job.get("module_id", "—")
        export_type = job.get("export_type", "—")
        filename = job.get("filename", "—")
        status = job.get("status", "pending")
        record_count = job.get("record_count")
        created_at = str(job.get("created_at", ""))[:16]
        user_id = job.get("user_id", "—")

        status_color = status_colors.get(status, MUTED)
        count_html = f" · {record_count:,} registros" if record_count else ""

        st.markdown(
            f"<div style='background:{BG2};border:1px solid {BORDER};"
            f"border-left:3px solid {status_color};border-radius:4px;padding:8px 10px;margin:3px 0;'>"
            f"  <div style='display:flex;justify-content:space-between;'>"
            f"    <div>"
            f"      <code style='color:{TEXT};font-size:11px;'>{filename[:50]}</code>"
            f"    </div>"
            f"    <span style='color:{status_color};font-size:11px;font-weight:600;'>{status}</span>"
            f"  </div>"
            f"  <div style='color:{MUTED};font-size:10px;margin-top:2px;'>"
            f"    📦 {module_id} · {export_type}{count_html} · "
            f"👤 {user_id[:20]} · 🕐 {created_at}"
            f"  </div>"
            f"</div>",
            unsafe_allow_html=True,
        )

        if show_approve_button and status == "pending":
            col1, col2 = st.columns([1, 4])
            with col1:
                if st.button(f"✅ Aprobar", key=f"approve_{job_id}"):
                    try:
                        from security.export_controls import approve_export_job
                        from security.sessions import get_session_user
                        approver = get_session_user() or {}
                        if approve_export_job(job.get("id", ""), approver.get("id", "unknown")):
                            st.success("Job aprobado")
                            st.rerun()
                    except Exception as exc:
                        st.error(f"Error: {exc}")
