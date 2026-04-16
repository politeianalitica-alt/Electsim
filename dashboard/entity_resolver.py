"""Resolutor de entidades canónicas para partidos/candidatos/fuentes."""
from __future__ import annotations

import logging
import re
from typing import Optional

import pandas as pd
import streamlit as st
from sqlalchemy import text

logger = logging.getLogger(__name__)


def _normalizar(texto: str) -> str:
    """Normalización: trim + upper + colapso de separadores."""
    return re.sub(r"[_\-\s]+", " ", str(texto or "")).strip().upper()


@st.cache_resource
def _cargar_alias_map() -> dict[str, int]:
    """Mapa normalizado -> entidad_id (cacheado por recurso)."""
    try:
        from dashboard.db import _q

        df = _q("SELECT normalizado, entidad_id FROM entidad_aliases")
        if df.empty:
            return {}
        return dict(zip(df["normalizado"].astype(str), df["entidad_id"].astype(int)))
    except Exception:
        return {}


@st.cache_resource
def _cargar_entidades() -> pd.DataFrame:
    """Entidades canónicas indexadas por entidad_id."""
    try:
        from dashboard.db import _q

        df = _q(
            """
            SELECT id AS entidad_id, slug, siglas_display AS siglas,
                   nombre_oficial, color_hex, eje_izda_dcha, ideologia,
                   activo, sucesor_de_id, fusionado_en_id
            FROM entidades_canonicas
            ORDER BY id
            """
        )
        return df.set_index("entidad_id") if not df.empty else pd.DataFrame()
    except Exception:
        return pd.DataFrame()


def resolver(siglas_o_nombre: str) -> Optional[int]:
    """Resuelve string -> entidad_id canónico. Devuelve None si no hay match."""
    norm = _normalizar(siglas_o_nombre)
    if not norm:
        return None

    alias_map = _cargar_alias_map()
    if norm in alias_map:
        return alias_map[norm]

    df_ent = _cargar_entidades()
    if not df_ent.empty and "siglas" in df_ent.columns:
        match = df_ent[df_ent["siglas"].astype(str).str.upper() == norm]
        if not match.empty:
            return int(match.index[0])

    logger.warning("EntityResolver: no match para '%s' (norm='%s')", siglas_o_nombre, norm)
    return None


def resolver_df(df: pd.DataFrame, col_siglas: str = "siglas") -> pd.DataFrame:
    """Añade entidad_id/siglas_canonical/color_hex a un DataFrame."""
    if df.empty or col_siglas not in df.columns:
        return df

    out = df.copy()
    out["entidad_id"] = out[col_siglas].apply(resolver)

    df_ent = _cargar_entidades().reset_index()
    if df_ent.empty:
        out["siglas_canonical"] = out[col_siglas]
        out["color_hex"] = "#94A3B8"
        return out

    out = out.merge(
        df_ent[["entidad_id", "siglas", "color_hex", "eje_izda_dcha"]].rename(
            columns={"siglas": "siglas_canonical"}
        ),
        on="entidad_id",
        how="left",
    )
    out["siglas_canonical"] = out["siglas_canonical"].fillna(out[col_siglas].astype(str))
    out["color_hex"] = out["color_hex"].fillna("#94A3B8")
    return out


def registrar_alias_desconocido(alias: str, fuente: str = "unknown") -> None:
    """Registra alias no resuelto en entidad_aliases_pendientes."""
    norm = _normalizar(alias)
    if not norm:
        return
    try:
        from dashboard.db import get_engine

        engine = get_engine()
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO entidad_aliases_pendientes (alias, normalizado, fuente, created_at, ultima_vez, intentos)
                    VALUES (:alias, :norm, :fuente, NOW(), NOW(), 1)
                    ON CONFLICT (normalizado) DO UPDATE SET
                        intentos = entidad_aliases_pendientes.intentos + 1,
                        ultima_vez = NOW(),
                        fuente = EXCLUDED.fuente
                    """
                ),
                {"alias": alias, "norm": norm, "fuente": fuente},
            )
    except Exception as exc:
        logger.error("No se pudo registrar alias pendiente '%s': %s", alias, exc)


def cadena_sucesion(entidad_id: int) -> list[int]:
    """Devuelve descendencia por sucesor_de_id/fusionado_en_id."""
    df_ent = _cargar_entidades()
    if df_ent.empty:
        return [entidad_id]

    cadena = [entidad_id]
    visitados = {entidad_id}
    cola = [entidad_id]
    while cola:
        eid = cola.pop()
        sucesores = df_ent[
            (df_ent["sucesor_de_id"] == eid) | (df_ent["fusionado_en_id"] == eid)
        ].index.tolist()
        for sid in sucesores:
            if sid not in visitados:
                visitados.add(sid)
                cadena.append(int(sid))
                cola.append(int(sid))
    return cadena


def _invalidar_alias_map() -> None:
    """Invalidación explícita de caché tras nuevas altas de alias."""
    _cargar_alias_map.clear()
    _cargar_entidades.clear()
