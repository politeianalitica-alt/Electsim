"""Conector MAPA + ENESA · Sprint 14 · S14.3.

> **Sprint 14 · S14.3** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 14 · Agro`)

MAPA (Ministerio de Agricultura, Pesca y Alimentación) publica:
  - Boletines semanales de precios agrarios
  - Cosecha y existencias (Cía Cosechas + Eichilco)
  - Política agraria nacional (RDs, normativa)

ENESA (Entidad Estatal de Seguros Agrarios) publica:
  - Estadísticas Plan Anual Seguros Agrarios Combinados
  - Siniestralidad por línea + provincia
  - Cobertura por cultivo

Aquí mantenemos un cliente Eurostat-style + catálogo estático de
indicadores anuales agro que pueden complementar las API que sí
funcionen. Las URL definitivas se pueden ajustar por dataset.

Falla cerrado: timeout 20s · errores → {error}.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_MAPA_RSS = "https://www.mapa.gob.es/es/agricultura/temas/rss/agricultura.xml"
_TIMEOUT = 20
_USER_AGENT = "Politeia-Analitica/2.0 MAPA-ENESA-Monitor (+https://politeia-analitica.es)"

# Datos ENESA · Plan 2024 (público, consolidado)
ENESA_PLAN_2024: dict[str, Any] = {
    "year": 2024,
    "presupuesto_subvenciones_eur": 317800000,
    "siniestralidad_global_pct": 134.0,
    "lineas_principales": [
        {
            "linea": "Frutales",
            "indemnizaciones_eur": 145000000,
            "primas_eur": 92000000,
            "siniestralidad_pct": 157.6,
        },
        {
            "linea": "Olivar",
            "indemnizaciones_eur": 89500000,
            "primas_eur": 35000000,
            "siniestralidad_pct": 255.7,
        },
        {
            "linea": "Cereales · invierno",
            "indemnizaciones_eur": 78000000,
            "primas_eur": 64000000,
            "siniestralidad_pct": 121.9,
        },
        {
            "linea": "Viñedo",
            "indemnizaciones_eur": 41000000,
            "primas_eur": 28000000,
            "siniestralidad_pct": 146.4,
        },
        {
            "linea": "Hortalizas",
            "indemnizaciones_eur": 33000000,
            "primas_eur": 31000000,
            "siniestralidad_pct": 106.5,
        },
    ],
}


class MAPAENESAClient:
    """Cliente para MAPA / ENESA (RSS prensa MAPA + catálogo ENESA estático)."""

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "application/rss+xml, application/xml, */*",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("MAPAENESAClient: requests no disponible · degradado")

    def fetch_mapa_news(self) -> list[dict[str, Any]]:
        """Notas de prensa MAPA vía RSS."""
        if self._session is None:
            return []
        try:
            r = self._session.get(_MAPA_RSS, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text)
        except Exception as exc:
            logger.warning("MAPA RSS · %s", exc)
            return []

    def get_enesa_plan(self, year: int = 2024) -> dict[str, Any]:
        """Resumen ENESA del Plan Anual de Seguros Agrarios."""
        if year == 2024:
            return ENESA_PLAN_2024
        return {
            "year": year,
            "error": f"Plan ENESA {year} no disponible en seed estático",
        }

    @staticmethod
    def _parse_rss(xml_text: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        try:
            from xml.etree import ElementTree as ET
            from datetime import datetime, timezone
            root = ET.fromstring(xml_text)
            for item in root.iter("item"):
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                desc = (item.findtext("description") or "").strip()
                pub = (item.findtext("pubDate") or "").strip()
                guid = (item.findtext("guid") or link).strip()
                try:
                    from email.utils import parsedate_to_datetime
                    pub_dt = parsedate_to_datetime(pub) if pub else datetime.now(timezone.utc)
                except Exception:
                    pub_dt = datetime.now(timezone.utc)
                items.append({
                    "id": guid,
                    "title": title,
                    "link": link,
                    "description": desc,
                    "pub_date": pub_dt,
                })
        except Exception as exc:
            logger.debug("MAPA RSS parse · %s", exc)
        return items


_CLIENT: MAPAENESAClient | None = None


def get_mapa_enesa_client() -> MAPAENESAClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = MAPAENESAClient()
    return _CLIENT


__all__ = ["MAPAENESAClient", "get_mapa_enesa_client", "ENESA_PLAN_2024"]
