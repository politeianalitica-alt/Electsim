"""Integraciones — ElectSim España."""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    section_header, sidebar_nav,
)

st.set_page_config(page_title="Integraciones — ElectSim", layout="wide")
sidebar_nav()

# ── Importaciones de integraciones con degradado gracioso ───────────────────

try:
    from integrations.registry import (
        get_all_integration_statuses,
        get_integration_status,
        is_integration_available,
        IntegrationStatus,
    )
    _REGISTRY_OK = True
except Exception:
    _REGISTRY_OK = False

try:
    from integrations.google_drive_connector import (
        list_drive_files,
        is_configured as drive_configured,
    )
    _DRIVE_OK = True
except Exception:
    _DRIVE_OK = False

try:
    from integrations.github_connector import (
        list_org_repos,
        get_recent_issues,
        is_configured as github_configured,
    )
    _GITHUB_OK = True
except Exception:
    _GITHUB_OK = False

try:
    from integrations.slack_connector import (
        send_simple_message,
        is_configured as slack_configured,
    )
    _SLACK_OK = True
except Exception:
    _SLACK_OK = False

# ── CSS ────────────────────────────────────────────────────────────────────────

st.markdown(
    f"""
    <style>
    .integration-card {{
        background: {BG2};
        border: 1px solid {BORDER};
        border-radius: 12px;
        padding: 1.2rem 1.4rem;
        margin-bottom: 1rem;
    }}
    .integration-card h3 {{
        color: {TEXT};
        font-size: 1rem;
        font-weight: 700;
        margin: 0 0 .3rem 0;
    }}
    .integration-card p {{
        color: {TEXT2};
        font-size: .83rem;
        margin: 0 0 .7rem 0;
    }}
    .badge-connected {{
        background: {GREEN}22;
        color: {GREEN};
        border: 1px solid {GREEN}55;
        border-radius: 6px;
        padding: .15rem .55rem;
        font-size: .75rem;
        font-weight: 700;
    }}
    .badge-disconnected {{
        background: {AMBER}22;
        color: {AMBER};
        border: 1px solid {AMBER}55;
        border-radius: 6px;
        padding: .15rem .55rem;
        font-size: .75rem;
        font-weight: 700;
    }}
    .badge-error {{
        background: {RED}22;
        color: {RED};
        border: 1px solid {RED}55;
        border-radius: 6px;
        padding: .15rem .55rem;
        font-size: .75rem;
        font-weight: 700;
    }}
    .badge-not-configured {{
        background: {MUTED}22;
        color: {MUTED};
        border: 1px solid {MUTED}55;
        border-radius: 6px;
        padding: .15rem .55rem;
        font-size: .75rem;
        font-weight: 700;
    }}
    .badge-demo {{
        background: {PURPLE}22;
        color: {PURPLE};
        border: 1px solid {PURPLE}55;
        border-radius: 6px;
        padding: .15rem .55rem;
        font-size: .75rem;
        font-weight: 700;
    }}
    .env-code {{
        background: {BG3};
        border: 1px solid {BORDER};
        border-radius: 6px;
        padding: .4rem .8rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: .78rem;
        color: {CYAN};
        margin-top: .4rem;
    }}
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Cabecera ──────────────────────────────────────────────────────────────────

st.markdown(
    f"<h1 style='color:{TEXT};font-size:1.6rem;font-weight:800;margin-bottom:.2rem'>"
    "Centro de Integraciones</h1>",
    unsafe_allow_html=True,
)
st.markdown(
    f"<p style='color:{TEXT2};font-size:.9rem;margin-bottom:1.5rem'>"
    "Conecta fuentes de datos externas y herramientas de trabajo</p>",
    unsafe_allow_html=True,
)

# ── Verificacion del registry ─────────────────────────────────────────────────

if not _REGISTRY_OK:
    st.error("No se pudo cargar el registro de integraciones. Revisa la instalacion del paquete.")
    st.stop()

# ── Obtener estados ────────────────────────────────────────────────────────────

all_statuses = get_all_integration_statuses()
any_configured = any(
    s.status == IntegrationStatus.connected for s in all_statuses
)

# ── Cuadricula de tarjetas (2 columnas) ────────────────────────────────────────

section_header("Estado de las integraciones", color=CYAN)

_STATUS_LABEL: dict[str, str] = {
    "connected": "Conectado",
    "disconnected": "Desconectado",
    "error": "Error",
    "not_configured": "No configurado",
}

_STATUS_CLASS: dict[str, str] = {
    "connected": "badge-connected",
    "disconnected": "badge-disconnected",
    "error": "badge-error",
    "not_configured": "badge-not-configured",
}

cols = st.columns(2)
for idx, info in enumerate(all_statuses):
    col = cols[idx % 2]
    with col:
        status_val = info.status if isinstance(info.status, str) else info.status.value
        label = _STATUS_LABEL.get(status_val, status_val)
        css_class = _STATUS_CLASS.get(status_val, "badge-not-configured")

        last_sync_html = ""
        if info.last_sync:
            last_sync_html = (
                f"<p style='color:{TEXT2};font-size:.8rem;margin:.3rem 0 0 0'>"
                f"Ultima sincronizacion: {info.last_sync.strftime('%Y-%m-%d %H:%M')}"
                f" &nbsp;|&nbsp; Documentos: {info.documents_synced}</p>"
            )

        env_html = ""
        if status_val == "not_configured":
            env_html = (
                f"<div class='env-code'>"
                f"export {info.env_var_required}=&lt;tu-credencial&gt;"
                f"</div>"
            )

        st.markdown(
            f"""
            <div class='integration-card'>
                <div style='display:flex;align-items:center;gap:.7rem;margin-bottom:.4rem'>
                    <h3 style='margin:0'>{info.name}</h3>
                    <span class='{css_class}'>{label}</span>
                    {"<span class='badge-demo'>DEMO</span>" if not any_configured else ""}
                </div>
                <p>{info.description}</p>
                {last_sync_html}
                {env_html}
            </div>
            """,
            unsafe_allow_html=True,
        )

        if st.button("Probar conexion", key=f"test_{info.id}"):
            updated = get_integration_status(info.id)
            if updated and updated.status == IntegrationStatus.connected:
                st.success(f"{info.name}: conexion verificada correctamente.")
            else:
                st.warning(
                    f"{info.name}: no configurado. Establece la variable "
                    f"`{info.env_var_required}` en tu entorno."
                )

# ── Seccion Google Drive ───────────────────────────────────────────────────────

st.markdown("---")
section_header("Google Drive", color=BLUE)

drive_avail = _DRIVE_OK and is_integration_available("google_drive")
if not drive_avail:
    st.info(
        "Google Drive no esta configurado. "
        "Establece `GOOGLE_SERVICE_ACCOUNT_JSON` para activar esta seccion. "
        "Se muestran datos de demostración."
    )

with st.container():
    folder_id = st.text_input(
        "ID de carpeta de Drive (opcional)",
        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
        key="drive_folder_id",
    )
    if st.button("Sincronizar documentos", key="drive_sync"):
        if not _DRIVE_OK:
            st.error("Modulo google_drive_connector no disponible.")
        else:
            with st.spinner("Sincronizando..."):
                docs = list_drive_files(folder_id=folder_id or None, max_files=50)
            if docs:
                mode_badge = "DEMO" if not drive_avail else "LIVE"
                st.success(f"Encontrados {len(docs)} archivos ({mode_badge})")
                import pandas as pd
                df = pd.DataFrame([
                    {
                        "Nombre": d.name,
                        "Tipo": d.mime_type.split(".")[-1] if "." in d.mime_type else d.mime_type,
                        "Tamano (KB)": round(d.size_bytes / 1024, 1),
                        "Modificado": d.modified_at.strftime("%Y-%m-%d"),
                        "Enlace": d.web_view_link,
                    }
                    for d in docs
                ])
                st.dataframe(df, use_container_width=True)
            else:
                st.info("No se encontraron archivos.")

# ── Seccion GitHub ─────────────────────────────────────────────────────────────

st.markdown("---")
section_header("GitHub", color=PURPLE)

github_avail = _GITHUB_OK and is_integration_available("github")
if not github_avail:
    st.info(
        "GitHub no esta configurado. "
        "Establece `GITHUB_TOKEN` para activar esta seccion. "
        "Se muestran datos de demostración."
    )

with st.container():
    org_name = st.text_input(
        "Organizacion de GitHub",
        placeholder="mi-organizacion",
        key="github_org",
    )
    if st.button("Ver repositorios", key="github_repos"):
        if not _GITHUB_OK:
            st.error("Modulo github_connector no disponible.")
        else:
            with st.spinner("Cargando repos..."):
                repos = list_org_repos(org=org_name or None, max_repos=20)
            if repos:
                mode_badge = "DEMO" if not github_avail else "LIVE"
                st.success(f"Encontrados {len(repos)} repositorios ({mode_badge})")
                import pandas as pd
                df = pd.DataFrame([
                    {
                        "Nombre": r.name,
                        "Descripcion": r.description[:60] + "..." if len(r.description) > 60 else r.description,
                        "Estrellas": r.stars,
                        "Issues abiertas": r.open_issues,
                        "Actualizado": r.updated_at.strftime("%Y-%m-%d"),
                        "Privado": "Si" if r.is_private else "No",
                    }
                    for r in repos
                ])
                st.dataframe(df, use_container_width=True)
            else:
                st.info("No se encontraron repositorios.")

    if st.button("Ver issues recientes (7 dias)", key="github_issues"):
        if not _GITHUB_OK:
            st.error("Modulo github_connector no disponible.")
        else:
            with st.spinner("Cargando issues..."):
                issues = get_recent_issues(org=org_name or None, days=7)
            if issues:
                import pandas as pd
                df = pd.DataFrame([
                    {
                        "Repo": i.repo_name,
                        "#": i.number,
                        "Titulo": i.title[:70],
                        "Estado": i.state,
                        "Etiquetas": ", ".join(i.labels),
                        "Creada": i.created_at.strftime("%Y-%m-%d"),
                    }
                    for i in issues
                ])
                st.dataframe(df, use_container_width=True)
            else:
                st.info("No hay issues recientes.")

# ── Ayuda de configuracion ────────────────────────────────────────────────────

st.markdown("---")
with st.expander("Guia de configuracion de integraciones"):
    st.markdown(
        f"""
### Como configurar las integraciones

Añade las siguientes variables a tu archivo `.env` local o a las secrets de tu
plataforma de despliegue. **Nunca incluyas credenciales reales en el repositorio.**

#### Google Drive (cuenta de servicio)
```bash
# Opcion A: ruta a un fichero JSON de cuenta de servicio
GOOGLE_SERVICE_ACCOUNT_JSON=/ruta/al/service_account.json

# Opcion B: contenido JSON en linea (escapado)
GOOGLE_SERVICE_ACCOUNT_JSON='{{\"type\":\"service_account\",...}}'

# Opcional: carpeta raiz para sincronizacion
GOOGLE_DRIVE_FOLDER_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

#### GitHub
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_ORG=nombre-de-tu-organizacion   # opcional
```

#### Slack
```bash
# Opcion A: Bot Token (preferida)
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx

# Opcion B: Webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXXXX/XXXXXXX/xxxxxxxxxxxxxxxxxxxxxxxx
```

#### Notion
```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
        """
    )
