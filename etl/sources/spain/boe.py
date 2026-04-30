"""
Conector BOE (Boletin Oficial del Estado) para el pipeline event-driven.

API publica: https://www.boe.es/datosabiertos/api/boe/sumario/{YYYYMMDD}
Documentacion: https://www.boe.es/datosabiertos/api/boe/

No requiere autenticacion. Rate limit: ~30 req/min.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, AsyncIterator, Optional

from etl.sources.base_connector import DataSourceConnector, NormalizedItem, RawItem

logger = logging.getLogger(__name__)

BOE_API_DEFAULT = "https://www.boe.es/datosabiertos/api/boe"
SECTIONS_DEFAULT = ["I", "II", "III"]   # Disposiciones generales, etc.


class BOEConnector(DataSourceConnector):
    """
    Conector para el BOE via API JSON de datos abiertos.

    Params disponibles (en IngestionSourceConfig.params):
        api_base_url:  URL base de la API (default: https://www.boe.es/datosabiertos/api/boe)
        sections:      Lista de secciones a ingestar (default: ["I", "II", "III"])
        days_back:     Cuantos dias atras fetchear si no se indica `since` (default: 1)
    """

    def __init__(self, source_id: str, params: dict[str, Any]) -> None:
        super().__init__(source_id, params)
        self._api_base = params.get("api_base_url", BOE_API_DEFAULT).rstrip("/")
        self._sections = params.get("sections", SECTIONS_DEFAULT)
        self._days_back = int(params.get("days_back", 1))

    async def fetch_items(self, since: Optional[datetime] = None) -> AsyncIterator[RawItem]:
        """
        Obtiene sumarios del BOE para el rango de fechas indicado.
        Itera seccion por seccion de cada dia y yields items individuales.
        """
        import httpx

        end_date = datetime.now(timezone.utc).date()
        if since:
            start_date = since.date()
        else:
            start_date = end_date - timedelta(days=self._days_back)

        current = start_date
        async with httpx.AsyncClient(timeout=30.0) as client:
            while current <= end_date:
                date_str = current.strftime("%Y%m%d")
                url = f"{self._api_base}/sumario/{date_str}"
                try:
                    resp = await client.get(url, headers={"Accept": "application/json"})
                    if resp.status_code == 404:
                        # No hay BOE ese dia (fin de semana, festivo)
                        current += timedelta(days=1)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    async for item in self._parse_sumario(data, date_str):
                        yield item
                except Exception as exc:
                    logger.warning("BOE fetch error [%s]: %s", date_str, exc)
                current += timedelta(days=1)

    async def _parse_sumario(self, data: dict, date_str: str) -> AsyncIterator[RawItem]:
        """Parsea el JSON del sumario y yields cada disposicion como RawItem."""
        sumario = data.get("data", {}).get("sumario", {})
        diario = sumario.get("diario", {})

        # El sumario puede tener estructura diferente segun la fecha
        # Intentamos tanto diario.seccion (lista) como diario (dict con secciones)
        secciones_data = diario if isinstance(diario, list) else [diario]

        for seccion_block in secciones_data:
            if not isinstance(seccion_block, dict):
                continue
            seccion_list = seccion_block.get("seccion", [])
            if isinstance(seccion_list, dict):
                seccion_list = [seccion_list]

            for seccion in seccion_list:
                sec_num = str(seccion.get("@num", "")).upper()
                if self._sections and sec_num not in self._sections:
                    continue

                departamentos = seccion.get("departamento", [])
                if isinstance(departamentos, dict):
                    departamentos = [departamentos]

                for depto in departamentos:
                    epigrafs = depto.get("epigrafe", [])
                    if isinstance(epigrafs, dict):
                        epigrafs = [epigrafs]

                    for epig in epigrafs:
                        items_raw = epig.get("item", [])
                        if isinstance(items_raw, dict):
                            items_raw = [items_raw]

                        for item in items_raw:
                            if not isinstance(item, dict):
                                continue
                            boe_id = item.get("identificador", "")
                            if not boe_id:
                                continue
                            yield RawItem({
                                "id": boe_id,
                                "title": item.get("titulo", ""),
                                "url": f"https://www.boe.es/diario_boe/txt.php?id={boe_id}",
                                "url_pdf": f"https://www.boe.es/boe/dias/{date_str[:4]}/{date_str[4:6]}/{date_str[6:]}/pdfs/{boe_id}.pdf",
                                "section": sec_num,
                                "department": depto.get("nombre", ""),
                                "epigraph": epig.get("nombre", ""),
                                "date": date_str,
                                "market_code": self.params.get("_market_code", ""),
                                "source_type": "legislation_boe",
                            })

    async def normalize(self, item: RawItem) -> NormalizedItem:
        date_str = item.get("date", "")
        pub_at = None
        if date_str and len(date_str) == 8:
            try:
                pub_at = datetime(
                    int(date_str[:4]), int(date_str[4:6]), int(date_str[6:]),
                    tzinfo=timezone.utc
                ).isoformat()
            except ValueError:
                pass

        return NormalizedItem({
            "source_id": self.source_id,
            "source_type": "legislation_boe",
            "external_id": item.get("id", ""),
            "title": item.get("title", ""),
            "content": "",   # El texto completo requiere llamada adicional al XML
            "url": item.get("url", ""),
            "published_at": pub_at,
            "metadata": {
                "section": item.get("section"),
                "department": item.get("department"),
                "epigraph": item.get("epigraph"),
                "url_pdf": item.get("url_pdf"),
                "market_code": item.get("market_code"),
            },
        })

    async def healthcheck(self) -> bool:
        import httpx
        try:
            today = datetime.now(timezone.utc).strftime("%Y%m%d")
            resp = await (httpx.AsyncClient(timeout=10.0)).get(
                f"{self._api_base}/sumario/{today}",
                headers={"Accept": "application/json"},
            )
            return resp.status_code in (200, 404)  # 404 valido (dia sin BOE)
        except Exception:
            return False
