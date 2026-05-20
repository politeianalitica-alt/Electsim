"""Conector FEGA · Sprint 14 · S14.1.

> **Sprint 14 · S14.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 14 · Agro`)

FEGA (Fondo Español de Garantía Agraria) publica anualmente la lista de
beneficiarios de la PAC y otros fondos europeos agrícolas. Es la mayor
masa de datos abiertos del sector agroalimentario español (~700.000
beneficiarios/año).

Portal datos abiertos:
  https://www.fega.gob.es/es/datos-abiertos

Endpoint principal (CSV anual, no JSON):
  https://www.fega.gob.es/.../FONDOS_EUROPEOS_AGRICOLAS_<año>.csv

Aquí ofrecemos un cliente que descarga el CSV anual y un parser básico
+ agregaciones útiles (top beneficiarios, totales por provincia, por
medida PAC).

Falla cerrado: timeout 30s · errores → []. No requiere API key.
"""
from __future__ import annotations

import csv
import io
import logging
from collections import defaultdict
from typing import Any

logger = logging.getLogger(__name__)

_TIMEOUT = 30
_USER_AGENT = "Politeia-Analitica/2.0 FEGA-Monitor (+https://politeia-analitica.es)"


class FEGAClient:
    """Cliente HTTP para descargas de datos abiertos FEGA."""

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "text/csv, */*",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("FEGAClient: requests no disponible · degradado")

    def fetch_csv(self, url: str) -> list[dict[str, str]]:
        """Descarga y parsea un CSV FEGA.

        Returns:
          Lista de dicts (cada fila) o [] si error.
        """
        if self._session is None:
            return []
        try:
            r = self._session.get(url, timeout=_TIMEOUT)
            r.raise_for_status()
            text = r.text
        except Exception as exc:
            logger.warning("FEGA fetch %s · %s", url, exc)
            return []
        try:
            reader = csv.DictReader(io.StringIO(text), delimiter=";")
            return [row for row in reader]
        except Exception as exc:
            logger.debug("FEGA CSV parse · %s", exc)
            return []

    def aggregate_top_beneficiarios(
        self,
        rows: list[dict[str, str]],
        *,
        amount_field: str = "IMPORTE_TOTAL",
        name_field: str = "BENEFICIARIO",
        top_n: int = 50,
    ) -> dict[str, Any]:
        """Agrega beneficiarios por nombre y devuelve ranking de importes.

        Args:
          rows: filas devueltas por fetch_csv.
          amount_field: nombre columna importe (ajustable por dataset año).
          name_field: nombre columna beneficiario.
          top_n: tamaño ranking.

        Returns:
          {"n_rows": int, "top": [{name, total, n_pagos}]}
        """
        agg: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"name": "", "total": 0.0, "n_pagos": 0}
        )
        for row in rows:
            name = (row.get(name_field) or "").strip()
            if not name:
                continue
            try:
                amt = float((row.get(amount_field) or "0").replace(",", "."))
            except Exception:
                amt = 0.0
            r = agg[name]
            r["name"] = name
            r["total"] += amt
            r["n_pagos"] += 1

        top = sorted(agg.values(), key=lambda x: x["total"], reverse=True)[:top_n]
        return {
            "n_rows": len(rows),
            "n_beneficiarios": len(agg),
            "top": [{**v, "total": round(v["total"], 2)} for v in top],
        }


_CLIENT: FEGAClient | None = None


def get_fega_client() -> FEGAClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = FEGAClient()
    return _CLIENT


__all__ = ["FEGAClient", "get_fega_client"]
