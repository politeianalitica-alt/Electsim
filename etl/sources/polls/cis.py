"""
Conector CIS (Centro de Investigaciones Sociologicas) para el pipeline event-driven.

Fuente: https://www.cis.es/estudios-y-encuestas/estudios/listado-de-estudios/
El CIS no tiene API publica formal; scrapiamos la pagina de estudios publicados.

Params disponibles:
    base_url:        URL base del CIS (default: https://www.cis.es)
    study_types:     Tipos de estudio a ingestar (default: ["barometro"])
    max_studies:     Maximo de estudios a ingestar (default: 5)
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Optional

from etl.sources.base_connector import DataSourceConnector, NormalizedItem, RawItem

logger = logging.getLogger(__name__)

CIS_BASE = "https://www.cis.es"
CIS_LISTADO = "/estudios-y-encuestas/estudios/listado-de-estudios/"


class CISPollsConnector(DataSourceConnector):
    """
    Conector para encuestas CIS.
    Extrae metadatos de estudios publicados (no los microdatos completos).
    """

    def __init__(self, source_id: str, params: dict[str, Any]) -> None:
        super().__init__(source_id, params)
        self._base_url = params.get("base_url", CIS_BASE).rstrip("/")
        self._max_studies = int(params.get("max_studies", 5))

    async def fetch_items(self, since: Optional[datetime] = None) -> AsyncIterator[RawItem]:
        """Extrae metadatos de estudios recientes del CIS."""
        import httpx

        url = f"{self._base_url}{CIS_LISTADO}"
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                resp = await client.get(url, headers={
                    "User-Agent": "ElectSim/1.0 (+https://politeria.ai)",
                    "Accept-Language": "es-ES,es;q=0.9",
                })
                resp.raise_for_status()
                html = resp.text

            studies = self._parse_studies_html(html)
            count = 0
            for study in studies:
                if count >= self._max_studies:
                    break
                pub_dt = study.get("published_at")
                if since and pub_dt and pub_dt < since:
                    continue
                yield RawItem({**study, "market_code": self.params.get("_market_code", "")})
                count += 1

        except Exception as exc:
            logger.warning("CIS fetch error: %s", exc)

    def _parse_studies_html(self, html: str) -> list[dict]:
        """
        Extrae estudios de la pagina de listado del CIS.
        El CIS usa un HTML simple; buscamos enlaces a estudios con su numero.
        """
        results = []
        # Patron: enlace con numero de estudio 4 digitos
        pattern = re.compile(
            r'href="([^"]*estudio[^"]*)"[^>]*>\s*([^<]*(?:Bar[oó]metro|Estudio)[^<]*)</a>',
            re.IGNORECASE,
        )
        for m in pattern.finditer(html):
            href = m.group(1)
            title = m.group(2).strip()
            if not title:
                continue
            full_url = href if href.startswith("http") else f"{self._base_url}{href}"
            # Extrae numero de estudio de la URL o titulo
            num_match = re.search(r'(\d{4,5})', href + title)
            study_num = num_match.group(1) if num_match else ""

            results.append({
                "id": study_num or title[:50],
                "title": title,
                "url": full_url,
                "content": "",
                "published_at": None,  # Requiere scraping de la pagina individual
                "source_type": "polls_cis",
                "study_number": study_num,
            })

        return results[:20]

    async def normalize(self, item: RawItem) -> NormalizedItem:
        return NormalizedItem({
            "source_id": self.source_id,
            "source_type": "polls_cis",
            "external_id": item.get("id", ""),
            "title": item.get("title", ""),
            "content": item.get("content", ""),
            "url": item.get("url", ""),
            "published_at": item.get("published_at"),
            "metadata": {
                "study_number": item.get("study_number"),
                "market_code": item.get("market_code"),
            },
        })

    async def healthcheck(self) -> bool:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.head(
                    f"{self._base_url}{CIS_LISTADO}",
                    headers={"User-Agent": "ElectSim/1.0"},
                )
                return resp.status_code < 400
        except Exception:
            return False
