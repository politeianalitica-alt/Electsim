"""
UI State Core — Bloque 12.

Persistencia de estado de UI: vistas guardadas, widgets personalizados,
layouts de workspace y registro de exportaciones visuales.
Degrada silenciosamente si la DB no está disponible.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# ── Caché en memoria (fallback sin DB) ─────────────────────────────────────────

_VIEWS_CACHE: dict[str, dict[str, Any]] = {}
_WIDGETS_CACHE: dict[str, list[dict[str, Any]]] = {}
_LAYOUTS_CACHE: dict[str, dict[str, Any]] = {}
_EXPORTS_CACHE: list[dict[str, Any]] = []


# ── Helpers de DB ──────────────────────────────────────────────────────────────

def _get_db():
    """Obtiene conexión a DB. Retorna None si no disponible."""
    try:
        from db.database import SessionLocal
        return SessionLocal()
    except Exception:
        return None


def _run_query(sql: str, params: dict | None = None) -> list[dict]:
    """Ejecuta query SQL con fallback silencioso."""
    db = _get_db()
    if db is None:
        return []
    try:
        from sqlalchemy import text
        result = db.execute(text(sql), params or {})
        rows = result.fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception as exc:
        logger.debug("DB query error: %s", exc)
        return []
    finally:
        try:
            db.close()
        except Exception:
            pass


def _run_write(sql: str, params: dict | None = None) -> bool:
    """Ejecuta INSERT/UPDATE/DELETE con fallback silencioso."""
    db = _get_db()
    if db is None:
        return False
    try:
        from sqlalchemy import text
        db.execute(text(sql), params or {})
        db.commit()
        return True
    except Exception as exc:
        logger.debug("DB write error: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass
        return False
    finally:
        try:
            db.close()
        except Exception:
            pass


# ── Vistas guardadas ───────────────────────────────────────────────────────────

def guardar_vista(
    nombre: str,
    modulo_id: str,
    filtros: dict[str, Any],
    layout_config: dict[str, Any] | None = None,
    user_id: str | None = None,
    tenant_id: str | None = None,
) -> str | None:
    """
    Guarda una vista del dashboard (filtros + layout).

    Args:
        nombre: Nombre de la vista.
        modulo_id: ID del módulo (D1, N1, etc.).
        filtros: Dict de filtros activos.
        layout_config: Configuración de layout (tabs, columnas...).
        user_id: ID del usuario.
        tenant_id: ID del tenant.

    Returns:
        ID de la vista guardada, o None si falla.
    """
    import uuid
    vista_id = str(uuid.uuid4())
    ts = datetime.utcnow().isoformat()

    view_data = {
        "id": vista_id,
        "nombre": nombre,
        "modulo_id": modulo_id,
        "filtros": filtros,
        "layout_config": layout_config or {},
        "user_id": user_id,
        "tenant_id": tenant_id,
        "created_at": ts,
    }

    # Persistir en DB
    ok = _run_write(
        """INSERT INTO saved_views
           (id, nombre, modulo_id, filtros, layout_config, user_id, tenant_id, created_at)
           VALUES (:id, :nombre, :modulo_id, :filtros, :layout_config,
                   :user_id, :tenant_id, :created_at)""",
        {
            "id": vista_id,
            "nombre": nombre,
            "modulo_id": modulo_id,
            "filtros": json.dumps(filtros, default=str),
            "layout_config": json.dumps(layout_config or {}, default=str),
            "user_id": user_id,
            "tenant_id": tenant_id,
            "created_at": ts,
        },
    )

    # Cache en memoria siempre
    _VIEWS_CACHE[vista_id] = view_data
    return vista_id


def cargar_vistas(
    modulo_id: str | None = None,
    user_id: str | None = None,
    tenant_id: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Carga las vistas guardadas.

    Returns:
        Lista de vistas con {id, nombre, modulo_id, filtros, created_at}.
    """
    params: dict[str, Any] = {"limit": limit}
    conditions = []

    if modulo_id:
        conditions.append("modulo_id = :modulo_id")
        params["modulo_id"] = modulo_id
    if user_id:
        conditions.append("user_id = :user_id")
        params["user_id"] = user_id
    if tenant_id:
        conditions.append("tenant_id = :tenant_id")
        params["tenant_id"] = tenant_id

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = f"SELECT * FROM saved_views {where_clause} ORDER BY created_at DESC LIMIT :limit"

    rows = _run_query(sql, params)
    if rows:
        return rows

    # Fallback: cache en memoria
    result = list(_VIEWS_CACHE.values())
    if modulo_id:
        result = [v for v in result if v.get("modulo_id") == modulo_id]
    if user_id:
        result = [v for v in result if v.get("user_id") == user_id]
    return sorted(result, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]


def cargar_vista(vista_id: str) -> dict[str, Any] | None:
    """Carga una vista concreta por ID."""
    rows = _run_query("SELECT * FROM saved_views WHERE id = :id", {"id": vista_id})
    if rows:
        row = rows[0]
        # Deserializar JSON
        for field in ("filtros", "layout_config"):
            if isinstance(row.get(field), str):
                try:
                    row[field] = json.loads(row[field])
                except Exception:
                    pass
        return row

    return _VIEWS_CACHE.get(vista_id)


# ── Workspace Layouts ──────────────────────────────────────────────────────────

def guardar_workspace_layout(
    workspace_id: str,
    layout: dict[str, Any],
    user_id: str | None = None,
) -> bool:
    """
    Guarda el layout de un workspace.

    Args:
        workspace_id: ID del workspace.
        layout: Dict de configuración de layout.
        user_id: ID del usuario.

    Returns:
        True si se guardó correctamente.
    """
    ts = datetime.utcnow().isoformat()

    ok = _run_write(
        """INSERT INTO workspace_layouts (workspace_id, user_id, layout, updated_at)
           VALUES (:workspace_id, :user_id, :layout, :updated_at)
           ON CONFLICT (workspace_id, user_id)
           DO UPDATE SET layout = :layout, updated_at = :updated_at""",
        {
            "workspace_id": workspace_id,
            "user_id": user_id,
            "layout": json.dumps(layout, default=str),
            "updated_at": ts,
        },
    )

    cache_key = f"{workspace_id}:{user_id}"
    _LAYOUTS_CACHE[cache_key] = {"workspace_id": workspace_id, "layout": layout, "updated_at": ts}
    return ok


def cargar_workspace_layouts(
    workspace_id: str,
    user_id: str | None = None,
) -> dict[str, Any] | None:
    """
    Carga el layout de un workspace.

    Returns:
        Dict de configuración de layout, o None.
    """
    params: dict[str, Any] = {"workspace_id": workspace_id}
    conditions = ["workspace_id = :workspace_id"]

    if user_id:
        conditions.append("user_id = :user_id")
        params["user_id"] = user_id

    sql = f"SELECT * FROM workspace_layouts WHERE {' AND '.join(conditions)} LIMIT 1"
    rows = _run_query(sql, params)

    if rows:
        row = rows[0]
        if isinstance(row.get("layout"), str):
            try:
                row["layout"] = json.loads(row["layout"])
            except Exception:
                pass
        return row.get("layout")

    cache_key = f"{workspace_id}:{user_id}"
    cached = _LAYOUTS_CACHE.get(cache_key)
    return cached.get("layout") if cached else None


# ── Dashboard Widgets ──────────────────────────────────────────────────────────

def registrar_widget(
    modulo_id: str,
    widget_id: str,
    widget_type: str,
    config: dict[str, Any],
    user_id: str | None = None,
) -> bool:
    """
    Registra configuración de un widget personalizado.

    Args:
        modulo_id: ID del módulo.
        widget_id: ID del widget (único por módulo).
        widget_type: Tipo de widget (chart/table/kpi/map...).
        config: Configuración del widget.
        user_id: ID del usuario.

    Returns:
        True si se registró correctamente.
    """
    ts = datetime.utcnow().isoformat()
    widget_data = {
        "modulo_id": modulo_id,
        "widget_id": widget_id,
        "widget_type": widget_type,
        "config": config,
        "user_id": user_id,
        "updated_at": ts,
    }

    ok = _run_write(
        """INSERT INTO dashboard_widgets (modulo_id, widget_id, widget_type, config, user_id, updated_at)
           VALUES (:modulo_id, :widget_id, :widget_type, :config, :user_id, :updated_at)
           ON CONFLICT (modulo_id, widget_id, user_id)
           DO UPDATE SET config = :config, widget_type = :widget_type, updated_at = :updated_at""",
        {
            "modulo_id": modulo_id,
            "widget_id": widget_id,
            "widget_type": widget_type,
            "config": json.dumps(config, default=str),
            "user_id": user_id,
            "updated_at": ts,
        },
    )

    cache_key = modulo_id
    _WIDGETS_CACHE.setdefault(cache_key, [])
    # Actualizar o añadir
    existing = [i for i, w in enumerate(_WIDGETS_CACHE[cache_key]) if w.get("widget_id") == widget_id]
    if existing:
        _WIDGETS_CACHE[cache_key][existing[0]] = widget_data
    else:
        _WIDGETS_CACHE[cache_key].append(widget_data)

    return ok


def cargar_widgets_modulo(
    modulo_id: str,
    user_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Carga los widgets registrados para un módulo.

    Returns:
        Lista de widgets con {widget_id, widget_type, config}.
    """
    params: dict[str, Any] = {"modulo_id": modulo_id}
    conditions = ["modulo_id = :modulo_id"]

    if user_id:
        conditions.append("(user_id = :user_id OR user_id IS NULL)")
        params["user_id"] = user_id

    sql = f"SELECT * FROM dashboard_widgets WHERE {' AND '.join(conditions)}"
    rows = _run_query(sql, params)

    if rows:
        for row in rows:
            if isinstance(row.get("config"), str):
                try:
                    row["config"] = json.loads(row["config"])
                except Exception:
                    pass
        return rows

    return _WIDGETS_CACHE.get(modulo_id, [])


# ── Exportaciones visuales ─────────────────────────────────────────────────────

def registrar_visual_export(
    module_id: str,
    export_type: str,
    filename: str,
    record_count: int | None = None,
    user_id: str | None = None,
    tenant_id: str | None = None,
) -> bool:
    """
    Registra una exportación visual en el historial.

    Args:
        module_id: ID del módulo.
        export_type: Tipo (csv/json/png/md/pdf).
        filename: Nombre del archivo.
        record_count: Número de registros exportados.
        user_id: ID del usuario.
        tenant_id: ID del tenant.

    Returns:
        True si se registró correctamente.
    """
    import uuid
    export_id = str(uuid.uuid4())
    ts = datetime.utcnow().isoformat()

    export_data = {
        "id": export_id,
        "module_id": module_id,
        "export_type": export_type,
        "filename": filename,
        "record_count": record_count,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "created_at": ts,
    }

    ok = _run_write(
        """INSERT INTO visual_exports
           (id, module_id, export_type, filename, record_count, user_id, tenant_id, created_at)
           VALUES (:id, :module_id, :export_type, :filename, :record_count,
                   :user_id, :tenant_id, :created_at)""",
        {
            "id": export_id,
            "module_id": module_id,
            "export_type": export_type,
            "filename": filename,
            "record_count": record_count,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "created_at": ts,
        },
    )

    _EXPORTS_CACHE.append(export_data)
    # Mantener máximo 200 en cache
    if len(_EXPORTS_CACHE) > 200:
        _EXPORTS_CACHE.pop(0)

    return ok


def cargar_exportaciones(
    module_id: str | None = None,
    user_id: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Carga el historial de exportaciones.

    Returns:
        Lista de exportaciones ordenadas por fecha desc.
    """
    params: dict[str, Any] = {"limit": limit}
    conditions = []

    if module_id:
        conditions.append("module_id = :module_id")
        params["module_id"] = module_id
    if user_id:
        conditions.append("user_id = :user_id")
        params["user_id"] = user_id

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = f"SELECT * FROM visual_exports {where_clause} ORDER BY created_at DESC LIMIT :limit"

    rows = _run_query(sql, params)
    if rows:
        return rows

    result = list(_EXPORTS_CACHE)
    if module_id:
        result = [e for e in result if e.get("module_id") == module_id]
    if user_id:
        result = [e for e in result if e.get("user_id") == user_id]
    return sorted(result, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]
