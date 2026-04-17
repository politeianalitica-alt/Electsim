"""
Avance de escrutinio (Ministerio del Interior). ``python -m etl.realtime.interior_noche_electoral``.

Esquema JSON esperado del feed (ejemplo):

.. code-block:: json

    {
      "eleccion_id": 1,
      "timestamp": "2024-07-01T22:00:00+00:00",
      "pct_escrutado": 35.5,
      "votos_escrutados": 12345678,
      "resultados_parciales": {
        "PP": {"votos": 100000, "pct": 33.1},
        "PSOE": {"votos": 95000, "pct": 31.0}
      }
    }
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any

import pandas as pd
from sqlalchemy import text

from etl.realtime.base import BaseRealTimeScraper

logger = logging.getLogger(__name__)

URL_FEED_DESARROLLO = "https://resultados.eleccionesgenerales23.es/"
URL_FEED_PRODUCCION = "https://resultados2.mpr.gob.es/"


@dataclass
class AvanceEscrutinio:
    eleccion_id: int
    timestamp: datetime
    pct_escrutado: float
    votos_escrutados: int
    resultados_parciales: dict[str, dict[str, Any]]


def detectar_eleccion_activa(engine) -> dict | None:
    today = date.today()
    ayer = today - timedelta(days=1)
    q = text(
        """
        SELECT id, fecha, descripcion, COALESCE(url_feed_interior, '') AS url_feed
        FROM elecciones
        WHERE fecha IN (:t1, :t2) OR es_activa = true
        ORDER BY es_activa DESC, fecha DESC
        LIMIT 1
        """
    )
    with engine.connect() as conn:
        row = conn.execute(q, {"t1": today, "t2": ayer}).mappings().fetchone()
    if not row:
        return None
    return dict(row)


def fetch_avance_interior(
    url_feed: str,
    scraper: BaseRealTimeScraper,
) -> AvanceEscrutinio | None:
    try:
        r = scraper.get(url_feed, cache_ttl_horas=0, timeout=60)
    except Exception as exc:
        logger.warning("Interior feed: %s", exc)
        scraper.log_resultado(url_feed, "error", error=str(exc), tipo="electoral")
        return None
    try:
        payload = r.json()
    except Exception:
        scraper.log_resultado(url_feed, "error", error="JSON inválido", tipo="electoral")
        return None
    if not isinstance(payload, dict):
        return None
    try:
        eid = int(payload["eleccion_id"])
        ts_raw = payload.get("timestamp") or payload.get("hora")
        if isinstance(ts_raw, str):
            ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
        else:
            ts = datetime.now(timezone.utc)
        pct = float(payload["pct_escrutado"])
        votos = int(payload.get("votos_escrutados") or 0)
        part = payload.get("resultados_parciales") or payload.get("partidos") or {}
        if not isinstance(part, dict):
            return None
        norm: dict[str, dict[str, Any]] = {}
        for k, v in part.items():
            if isinstance(v, dict):
                norm[str(k)] = {
                    "votos": int(v.get("votos", 0)),
                    "pct": float(v.get("pct", 0)),
                }
            else:
                continue
        return AvanceEscrutinio(eid, ts, pct, votos, norm)
    except (KeyError, TypeError, ValueError) as exc:
        logger.debug("parse feed: %s", exc)
        scraper.log_resultado(url_feed, "error", error=str(exc), tipo="electoral")
        return None


def upsert_avance(avance: AvanceEscrutinio, engine) -> None:
    pid_sql = text("SELECT id FROM partidos WHERE siglas = :s LIMIT 1")
    upd = text(
        """
        UPDATE resultados_electorales
        SET votos = :votos,
            porcentaje = :pct,
            pct_escrutado = :pe,
            timestamp_parcial = :ts
        WHERE eleccion_id = :eid AND partido_id = :pid AND provincia_id IS NULL
        """
    )
    ins = text(
        """
        INSERT INTO resultados_electorales (
            eleccion_id, partido_id, provincia_id, votos, porcentaje, pct_escrutado, timestamp_parcial
        ) VALUES (:eid, :pid, NULL, :votos, :pct, :pe, :ts)
        """
    )
    with engine.begin() as conn:
        for siglas, datos in avance.resultados_parciales.items():
            pid = conn.execute(pid_sql, {"s": siglas}).scalar()
            if pid is None:
                continue
            res = conn.execute(
                upd,
                {
                    "votos": datos["votos"],
                    "pct": datos["pct"],
                    "pe": avance.pct_escrutado,
                    "ts": avance.timestamp,
                    "eid": avance.eleccion_id,
                    "pid": pid,
                },
            )
            if res.rowcount == 0:
                conn.execute(
                    ins,
                    {
                        "eid": avance.eleccion_id,
                        "pid": pid,
                        "votos": datos["votos"],
                        "pct": datos["pct"],
                        "pe": avance.pct_escrutado,
                        "ts": avance.timestamp,
                    },
                )
        conn.execute(
            text(
                "UPDATE elecciones SET pct_escrutado_maximo = :p WHERE id = :eid"
            ),
            {"p": avance.pct_escrutado, "eid": avance.eleccion_id},
        )


def calcular_proyeccion_final(avance: AvanceEscrutinio, engine) -> dict[str, float]:
    if avance.pct_escrutado < 30:
        return {}
    partidos = list(avance.resultados_parciales.keys())
    pct = {p: float(avance.resultados_parciales[p]["pct"]) for p in partidos}
    tot = sum(pct.values()) or 1.0
    nat = {p: pct[p] / tot * 100.0 for p in partidos}
    from models.estrategicos.coaliciones import ley_dhondt
    from models.escenarios.monte_carlo_escanos import (
        escanos_por_provincia_desde_bd,
        factor_provincial_historico,
    )

    if avance.pct_escrutado >= 60:
        prov = escanos_por_provincia_desde_bd(engine)
        fac = factor_provincial_historico(engine)
        if fac.empty or not prov:
            return {p: float(ley_dhondt(nat, 350).get(p, 0)) for p in nat}
        escanos_sim = {p: 0 for p in nat}
        validos = {p: v for p, v in nat.items() if v >= 3.0}
        for pr, n_esc in prov.items():
            votos_prov: dict[str, float] = {}
            for p, vn in validos.items():
                facc = 1.0
                if p in fac.index and pr in fac.columns:
                    facc = float(fac.loc[p, pr])
                elif p in fac.index:
                    rowm = fac.loc[p].mean()
                    facc = float(rowm) if pd.notna(rowm) else 1.0
                votos_prov[p] = vn * facc
            dh = ley_dhondt(votos_prov, n_esc)
            for p, e in dh.items():
                escanos_sim[p] = escanos_sim.get(p, 0) + int(e)
        return {p: float(escanos_sim.get(p, 0)) for p in nat}
    dh = ley_dhondt(nat, 350)
    return {p: float(dh.get(p, 0)) for p in nat}


class NocheElectoralMonitor(BaseRealTimeScraper):
    INTERVALO_SEGUNDOS = 300

    def run(self, n_ciclos: int = 1) -> dict:
        if self.is_dry_run():
            return {"ciclos": 0, "mensaje": "dry_run"}
        ele = detectar_eleccion_activa(self.engine)
        if not ele:
            return {"ciclos": 0, "mensaje": "sin_eleccion_activa"}
        url = (ele.get("url_feed") or "").strip() or URL_FEED_PRODUCCION
        ultimo_pct = 0.0
        for i in range(n_ciclos):
            av = fetch_avance_interior(url, self)
            if av is None:
                time.sleep(min(self.INTERVALO_SEGUNDOS, 5))
                continue
            upsert_avance(av, self.engine)
            salto = int(av.pct_escrutado // 10) - int(ultimo_pct // 10)
            if salto > 0:
                proj = calcular_proyeccion_final(av, self.engine)
                txt = ", ".join(f"{k} {v:.0f}e" for k, v in list(proj.items())[:6])
                self.crear_alerta(
                    tipo="cambio_tendencia",
                    severidad="INFO",
                    titulo=f"{av.pct_escrutado:.0f}% escrutado (avance)",
                    descripcion=txt[:400],
                    datos={"pct": av.pct_escrutado, "proyeccion": proj},
                )
            ultimo_pct = av.pct_escrutado
            if av.pct_escrutado >= 99:
                break
            time.sleep(self.INTERVALO_SEGUNDOS)
        return {"ciclos": n_ciclos, "ultimo_pct": ultimo_pct}


if __name__ == "__main__":
    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    scraper = NocheElectoralMonitor("interior_noche", engine)
    if scraper.is_dry_run():
        print("DRY_RUN: no se consulta el Interior.")
        raise SystemExit(0)
    el = detectar_eleccion_activa(engine)
    if not el:
        print("No hay elección activa hoy/ayer.")
        raise SystemExit(0)
    while True:
        stats = scraper.run(n_ciclos=1)
        if stats.get("ultimo_pct", 0) >= 99:
            print("Escrutinio casi completo.")
            break
        time.sleep(NocheElectoralMonitor.INTERVALO_SEGUNDOS)
