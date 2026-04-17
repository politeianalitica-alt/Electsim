"""
Actualización de indicadores macro (INE, REE, BDE) y alertas por shocks. ``python -m etl.realtime.macro_monitor``.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from io import StringIO

import pandas as pd
from sqlalchemy import text

from etl.realtime.base import BaseRealTimeScraper
from models.riesgos.riesgo_politico import detectar_shocks_economicos

logger = logging.getLogger(__name__)

FUENTES_MACRO = {
    "ine_ipc": {
        "url": "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/IPC251449",
        "campo_valor": "Dato",
        "campo_fecha": "Fecha",
        "variable_bd": "ipc_general",
        "periodicidad": "mensual",
        "ttl_cache_horas": 24,
        "fuente_bd": "INE",
    },
    "ine_pib_trimestral": {
        "url": "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/CNTR4T24",
        "campo_valor": "Dato",
        "campo_fecha": "Fecha",
        "variable_bd": "crecimiento_pib",
        "periodicidad": "trimestral",
        "ttl_cache_horas": 168,
        "fuente_bd": "INE",
    },
    "ine_epa_paro": {
        "url": "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/EPA3989",
        "campo_valor": "Dato",
        "campo_fecha": "Fecha",
        "variable_bd": "tasa_paro",
        "periodicidad": "trimestral",
        "ttl_cache_horas": 168,
        "fuente_bd": "INE",
    },
    "ree_precio_luz": {
        "url": "https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real",
        "tipo": "ree_api",
        "variable_bd": "precio_luz_kwh_residencial",
        "periodicidad": "diario",
        "ttl_cache_horas": 1,
        "fuente_bd": "REE",
    },
    "bde_prima_riesgo": {
        "url": "https://www.bde.es/webbde/es/estadis/infoest/si_1_5.csv",
        "tipo": "csv",
        "variable_bd": "prima_riesgo_bono10",
        "periodicidad": "diario",
        "ttl_cache_horas": 4,
        "fuente_bd": "BDE",
    },
}

COLUMNAS_MACRO_UPSERT = frozenset(
    {
        "ipc_general",
        "crecimiento_pib",
        "tasa_paro",
        "prima_riesgo_bono10",
        "precio_luz_kwh_residencial",
    }
)


def _parse_ine_fecha(val) -> pd.Timestamp:
    s = str(val).strip()
    if len(s) == 6 and s.isdigit():
        return pd.Timestamp(year=int(s[:4]), month=int(s[4:6]), day=1)
    if len(s) == 8 and s.isdigit():
        return pd.Timestamp(year=int(s[:4]), month=int(s[4:6]), day=int(s[6:8]))
    return pd.to_datetime(s, errors="coerce")


def fetch_ine_serie(url: str, scraper: BaseRealTimeScraper) -> pd.DataFrame:
    r = scraper.get(url, cache_ttl_horas=6)
    payload = r.json()
    if isinstance(payload, dict) and "Data" in payload:
        rows = payload["Data"]
    elif isinstance(payload, list):
        rows = payload
    else:
        rows = []
    out = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        if str(row.get("Secreto", "")).upper() == "S":
            continue
        fv = row.get("Fecha")
        dv = row.get("Dato")
        if fv is None or dv is None:
            continue
        try:
            v = float(str(dv).replace(",", "."))
        except ValueError:
            continue
        fd = _parse_ine_fecha(fv)
        if pd.isna(fd):
            continue
        out.append({"fecha": fd.normalize(), "valor": v})
    dfp = pd.DataFrame(out)
    if dfp.empty:
        return dfp
    return dfp.drop_duplicates(subset=["fecha"], keep="last")


def fetch_ree_precio(scraper: BaseRealTimeScraper) -> pd.DataFrame:
    end = datetime.utcnow().date()
    start = end - timedelta(days=30)
    base = FUENTES_MACRO["ree_precio_luz"]["url"]
    q = f"{base}?start_date={start.isoformat()}&end_date={end.isoformat()}"
    r = scraper.get(q, cache_ttl_horas=1)
    j = r.json()
    pairs: list[tuple] = []
    for item in j.get("included", []):
        attrs = item.get("attributes") or {}
        for v in attrs.get("values") or []:
            if isinstance(v, dict) and "value" in v and "datetime" in v:
                try:
                    dt = pd.to_datetime(v["datetime"])
                    pairs.append((dt.normalize(), float(v["value"])))
                except (TypeError, ValueError):
                    continue
    if not pairs:
        for item in j.get("data", []):
            if isinstance(item, dict):
                v = item.get("attributes") or item
                if "value" in v and "datetime" in v:
                    try:
                        pairs.append(
                            (pd.to_datetime(v["datetime"]).normalize(), float(v["value"]))
                        )
                    except (TypeError, ValueError):
                        pass
    df = pd.DataFrame(pairs, columns=["fecha", "valor_kwh"])
    if df.empty:
        return df
    return df.groupby("fecha", as_index=False)["valor_kwh"].mean()


def fetch_bde_prima(scraper: BaseRealTimeScraper) -> pd.DataFrame:
    r = scraper.get(
        FUENTES_MACRO["bde_prima_riesgo"]["url"],
        cache_ttl_horas=4,
    )
    raw = r.content.decode("latin-1", errors="replace")
    df = pd.read_csv(StringIO(raw), sep=";", engine="python")
    df.columns = [str(c).strip() for c in df.columns]
    col_fecha = None
    col_spread = None
    for c in df.columns:
        cl = c.lower()
        if "fecha" in cl or "date" in cl:
            col_fecha = c
        if ("espa" in cl and "ale" in cl) or "spread" in cl or "prima" in cl:
            col_spread = c
    if col_fecha is None:
        col_fecha = df.columns[0]
    if col_spread is None:
        num_cols = [c for c in df.columns if c != col_fecha]
        col_spread = num_cols[-1] if num_cols else df.columns[-1]
    out = []
    for _, row in df.iterrows():
        try:
            fd = pd.to_datetime(str(row[col_fecha]), dayfirst=True, errors="coerce")
            if pd.isna(fd):
                continue
            val = row[col_spread]
            if val is None or (isinstance(val, float) and pd.isna(val)):
                continue
            bp = int(float(str(val).replace(",", ".")))
            out.append({"fecha": fd.normalize(), "valor_bp": bp})
        except (TypeError, ValueError):
            continue
    return pd.DataFrame(out)


def upsert_indicador(
    df: pd.DataFrame,
    variable_bd: str,
    periodicidad: str,
    engine,
    url_fuente: str | None = None,
    fuente: str | None = None,
    dry_run: bool = False,
) -> tuple[int, int]:
    if dry_run:
        return 0, 0
    if variable_bd not in COLUMNAS_MACRO_UPSERT:
        raise ValueError(f"Columna no permitida: {variable_bd}")
    col_val = "valor_kwh" if variable_bd == "precio_luz_kwh_residencial" else "valor"
    if col_val == "valor_kwh" and col_val not in df.columns and "valor" in df.columns:
        col_val = "valor"
    if col_val not in df.columns:
        alt = "valor_bp" if "valor_bp" in df.columns else None
        if alt:
            col_val = alt
        else:
            return 0, 0
    nuevos = actualizados = 0
    sel = text(
        f"""
        SELECT {variable_bd} FROM indicadores_macroeconomicos
        WHERE fecha = :fecha AND frecuencia = :freq
        """
    )
    upsert = text(
        f"""
        INSERT INTO indicadores_macroeconomicos (fecha, frecuencia, {variable_bd}, fuente, url_fuente)
        VALUES (:fecha, :freq, :val, :fuente, :urlf)
        ON CONFLICT (fecha, frecuencia) DO UPDATE SET
            {variable_bd} = EXCLUDED.{variable_bd},
            fuente = COALESCE(EXCLUDED.fuente, indicadores_macroeconomicos.fuente),
            url_fuente = COALESCE(EXCLUDED.url_fuente, indicadores_macroeconomicos.url_fuente)
        """
    )
    for _, row in df.iterrows():
        fecha = row["fecha"]
        if hasattr(fecha, "date"):
            fd = fecha.date() if hasattr(fecha, "date") else fecha
        else:
            fd = fecha
        val = row[col_val]
        if variable_bd == "prima_riesgo_bono10":
            val = int(round(float(val)))
        else:
            val = float(val)
        with engine.connect() as conn:
            prev = conn.execute(
                sel, {"fecha": fd, "freq": periodicidad}
            ).scalar()
        if prev is not None and float(prev) == float(val):
            continue
        is_new = prev is None
        with engine.begin() as conn:
            conn.execute(
                upsert,
                {
                    "fecha": fd,
                    "freq": periodicidad,
                    "val": val,
                    "fuente": fuente,
                    "urlf": url_fuente,
                },
            )
        if is_new:
            nuevos += 1
        else:
            actualizados += 1
    return nuevos, actualizados


def verificar_shock_y_alertar(
    variable_bd: str,
    engine,
    scraper: BaseRealTimeScraper,
) -> int:
    shocks = detectar_shocks_economicos(variable_bd, engine, umbral_z=2.0)
    n = 0
    for s in shocks:
        z = abs(float(s["zscore"]))
        if z <= 2:
            continue
        n += 1
        sev = "CRITICAL" if z > 3 else "WARNING"
        scraper.crear_alerta(
            tipo="shock_economico",
            severidad=sev,
            titulo=f"Shock detectado: {variable_bd}",
            descripcion=f"z={s['zscore']}, valor={s['valor']}, dirección {s['direccion']}",
            datos=dict(s),
        )
    return n


class MacroMonitor(BaseRealTimeScraper):
    def run(self) -> dict:
        stats: dict = {}
        if self.is_dry_run():
            for nombre in FUENTES_MACRO:
                stats[nombre] = {"nuevos": 0, "actualizados": 0, "shocks": 0}
            return stats
        for nombre, config in FUENTES_MACRO.items():
            try:
                if config.get("tipo") == "ree_api":
                    df = fetch_ree_precio(self)
                    df = df.rename(columns={"valor_kwh": "valor"})
                elif config.get("tipo") == "csv":
                    df = fetch_bde_prima(self)
                    df = df.rename(columns={"valor_bp": "valor"})
                else:
                    df = fetch_ine_serie(config["url"], self)
                n_nuevos, n_act = upsert_indicador(
                    df,
                    config["variable_bd"],
                    config["periodicidad"],
                    self.engine,
                    url_fuente=config["url"],
                    fuente=config.get("fuente_bd"),
                    dry_run=False,
                )
                n_sh = verificar_shock_y_alertar(
                    config["variable_bd"],
                    self.engine,
                    self,
                )
                stats[nombre] = {
                    "nuevos": n_nuevos,
                    "actualizados": n_act,
                    "shocks": n_sh,
                }
            except Exception as e:
                self.log_resultado(
                    config.get("url", nombre),
                    "error",
                    error=str(e),
                    tipo="macro",
                )
                stats[nombre] = {"error": str(e), "shocks": 0}
        return stats


if __name__ == "__main__":
    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.getenv("DATABASE_URL"))
    monitor = MacroMonitor("macro_monitor", engine)
    stats = monitor.run()
    for fuente, s in stats.items():
        print(f"{fuente}: {s}")
