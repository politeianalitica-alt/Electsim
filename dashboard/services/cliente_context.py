"""Contexto de cliente activo para modo multi-tenant en Streamlit."""

from __future__ import annotations

import logging
import os

import psycopg
import streamlit as st

from dashboard.db import get_conn

logger = logging.getLogger(__name__)


_DEFAULT_CLIENTE_ID: int | None = int(os.getenv("ELECTSIM_DEFAULT_CLIENTE_ID", "1"))


def listar_clientes() -> list[dict]:
    try:
        conn = get_conn()
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                "SELECT id, nombre, tipo, ambito FROM clientes WHERE activo = TRUE ORDER BY nombre"
            )
            return list(cur.fetchall())
    except Exception as exc:
        logger.warning("No se pudo listar clientes: %s", exc)
        return []


def get_cliente_activo() -> int | None:
    return st.session_state.get("cliente_id_activo", _DEFAULT_CLIENTE_ID)


def set_cliente_activo(cliente_id: int | None) -> None:
    st.session_state["cliente_id_activo"] = cliente_id


def selector_cliente_sidebar() -> None:
    if os.getenv("ELECTSIM_FEATURE_MULTICLIENTE", "1") != "1":
        return

    clientes = listar_clientes()
    if not clientes:
        return

    names = ["- Todos -"] + [str(c.get("nombre", "Cliente")) for c in clientes]
    id_by_name = {str(c.get("nombre", "Cliente")): c.get("id") for c in clientes}

    current = get_cliente_activo()
    current_name = "- Todos -"
    for c in clientes:
        if c.get("id") == current:
            current_name = str(c.get("nombre", "- Todos -"))
            break

    selected = st.sidebar.selectbox(
        "Cliente activo",
        names,
        index=names.index(current_name) if current_name in names else 0,
    )
    new_id = id_by_name.get(selected)
    if selected == "- Todos -":
        new_id = None

    if new_id != current:
        set_cliente_activo(new_id)
        st.rerun()
