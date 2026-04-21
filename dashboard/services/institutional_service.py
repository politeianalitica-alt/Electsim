"""Servicios de preparación para la página institucional."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
import streamlit as st

from dashboard.services.agenda_service import AgendaEvent, normalize_agenda_event
from dashboard.services.boe_service import items_to_dicts, normalize_boe_item
from etl.sources.agendas_dinamicas import fetch_all_agendas


@dataclass(frozen=True)
class AgendaPreparedData:
    events: list[AgendaEvent]
    is_real: bool
    source_label: str


@dataclass(frozen=True)
class BoePreparedData:
    items: list[dict[str, str]]
    is_real: bool
    source_label: str


def _txt(value: object) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    return str(value).strip()


def _date_label(value: object) -> str:
    txt = _txt(value)
    if not txt:
        return ""
    parsed = pd.to_datetime(txt, errors="coerce")
    if pd.notna(parsed):
        if parsed.hour or parsed.minute:
            return parsed.strftime("%Y-%m-%d %H:%M")
        return parsed.strftime("%Y-%m-%d")
    return txt[:16]


def normalize_live_agenda_rows(
    rows: list[dict] | None,
    limit: int | None = None,
) -> list[dict[str, str]]:
    """Normaliza eventos live para alinearlos con el esquema del dashboard."""
    cleaned: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()

    for raw in rows or []:
        if not isinstance(raw, dict):
            continue
        titulo = _txt(raw.get("titulo") or raw.get("title") or raw.get("name"))
        if not titulo:
            continue
        fuente = _txt(raw.get("fuente") or raw.get("institution") or raw.get("source")) or "Fuente oficial"
        fecha = _date_label(raw.get("fecha") or raw.get("fecha_publicacion") or raw.get("date"))
        key = (titulo.lower(), fuente.lower(), fecha)
        if key in seen:
            continue
        seen.add(key)
        resumen = _txt(raw.get("resumen") or raw.get("cita") or raw.get("description") or raw.get("summary"))
        enlace = _txt(raw.get("enlace") or raw.get("url") or raw.get("link"))
        cleaned.append(
            {
                "titulo": titulo,
                "actor": _txt(raw.get("actor") or raw.get("main_actor") or fuente),
                "fuente": fuente,
                "fecha": fecha,
                "tipo": _txt(raw.get("tipo") or raw.get("event_type")),
                "lugar": _txt(raw.get("lugar") or raw.get("location")),
                "cita": resumen,
                "resumen": resumen or "Comunicación oficial agenda/actividad institucional.",
                "enlace": enlace,
                "url": enlace,
            }
        )

    return cleaned[:limit] if limit is not None else cleaned


@st.cache_data(ttl=3600)
def boe_rss_fallback(limit: int = 20) -> list[dict[str, str]]:
    """Lee BOE desde RSS cuando la persistencia aún no está poblada."""
    import feedparser
    import re

    feeds = ["https://www.boe.es/rss/boe.php", "https://www.boe.es/rss/diario_boe.xml"]
    seen: dict[str, dict[str, str]] = {}
    for url in feeds:
        try:
            feed = feedparser.parse(url)
            for entry in getattr(feed, "entries", [])[:limit]:
                titulo = re.sub(r"<[^>]+>", " ", str(getattr(entry, "title", ""))).strip()
                if not titulo or titulo in seen:
                    continue
                resumen = re.sub(r"<[^>]+>", " ", str(getattr(entry, "summary", ""))).strip()
                item = normalize_boe_item(
                    {"titulo": titulo, "resumen": resumen, "url": getattr(entry, "link", "")},
                    source="rss_live",
                )
                seen[titulo] = {
                    "seccion": item.seccion,
                    "organismo": item.organismo,
                    "tipo": item.tipo,
                    "numero": item.numero,
                    "titulo": item.titulo,
                    "resumen": item.resumen,
                    "relevancia_politica": item.relevancia_politica,
                    "url": item.url,
                    "source": "rss_live",
                }
        except Exception:
            continue

    result = list(seen.values())
    result.sort(
        key=lambda item: {"Alta": 2, "Media": 1, "Baja": 0}.get(item["relevancia_politica"], 0),
        reverse=True,
    )
    return result[:limit]


@st.cache_data(ttl=3600)
def load_live_agenda_rows(limit: int = 80, max_items_per_source: int = 25) -> list[dict[str, str]]:
    """Carga agenda live desde las fuentes dinámicas con normalización común."""
    return normalize_live_agenda_rows(
        fetch_all_agendas(max_items_per_source=max_items_per_source),
        limit=limit,
    )


@st.cache_data(ttl=3600)
def load_live_comunicados(limit: int = 25) -> pd.DataFrame:
    """Carga comunicados live normalizados y deduplicados."""
    df = pd.DataFrame(load_live_agenda_rows(limit=limit, max_items_per_source=max(6, limit // 4)))
    if df.empty:
        return df
    for col in ["titulo", "fuente", "fecha", "resumen", "cita", "url"]:
        if col not in df.columns:
            df[col] = ""
    df["resumen"] = df["resumen"].replace("", "Comunicación oficial agenda/actividad institucional.")
    return df.drop_duplicates(subset=["titulo", "fuente", "fecha"]).head(limit)


def prepare_boe_data(df_boe: pd.DataFrame) -> BoePreparedData:
    """Adapta datos BOE persistidos o live al formato que consume la vista."""
    if df_boe.empty:
        return BoePreparedData(
            items=boe_rss_fallback(limit=20),
            is_real=False,
            source_label="RSS boe.es en vivo (sin persistencia)",
        )

    items = items_to_dicts(
        [
            normalize_boe_item(
                {
                    "titulo": row.get("titulo"),
                    "resumen": row.get("resumen"),
                    "seccion": row.get("seccion"),
                    "tipo": row.get("tipo_norma"),
                    "organismo": row.get("departamento"),
                    "numero": row.get("boe_no") or "BOE",
                    "relevancia_politica": row.get("relevancia"),
                    "url": row.get("url_html"),
                    "fecha": row.get("fecha"),
                },
                source="db",
            )
            for row in df_boe.to_dict("records")
        ]
    )
    return BoePreparedData(items=items, is_real=True, source_label="Tabla boe_publication")


def prepare_agenda_data(df_agenda_rica: pd.DataFrame) -> AgendaPreparedData:
    """Prepara eventos de agenda desde BD rica o fallback live."""
    if not df_agenda_rica.empty:
        raw_events = df_agenda_rica.to_dict("records")
        events = [
            normalize_agenda_event(
                {
                    "titulo": _txt(row.get("title")),
                    "actor": _txt(row.get("main_actor")),
                    "fuente": _txt(row.get("host_institution")),
                    "fecha": _date_label(row.get("event_date")),
                    "hora": _txt(row.get("time_start"))[:5],
                    "tipo": _txt(row.get("event_type")),
                    "lugar": _txt(row.get("location")),
                    "cita": _txt(row.get("description")),
                    "enlace": _txt(row.get("source_url")),
                }
            )
            for row in raw_events
            if _txt(row.get("title"))
        ]
        return AgendaPreparedData(events=events, is_real=True, source_label="Tabla agenda_item")

    live_rows = load_live_agenda_rows(limit=80, max_items_per_source=25)
    return AgendaPreparedData(
        events=[normalize_agenda_event(row) for row in live_rows if _txt(row.get("titulo"))],
        is_real=False,
        source_label="RSS/HTML en vivo",
    )


def build_quality_inputs(
    boe_df: pd.DataFrame,
    agenda_df: pd.DataFrame,
    votes_df: pd.DataFrame,
) -> dict[str, pd.DataFrame]:
    """Devuelve únicamente las fuentes con datos para validación de calidad."""
    quality_inputs: dict[str, pd.DataFrame] = {}
    if not boe_df.empty:
        quality_inputs["boe"] = boe_df
    if not agenda_df.empty:
        quality_inputs["agenda"] = agenda_df
    if not votes_df.empty:
        quality_inputs["votes"] = votes_df
    return quality_inputs
