import os

import pandas as pd
import requests

from etl.base_extractor import BaseExtractor


class REEEsiosExtractor(BaseExtractor):
    """Indicadores agregados desde la API ESIOS (requiere ESIOS_API_TOKEN)."""

    BASE_URL = "https://api.esios.ree.es"
    INDICADORES = {
        "demanda_real": 1293,
        "precio_pool_final": 600,
        "generacion_eolica": 551,
        "generacion_solar_fv": 10034,
        "generacion_nuclear": 517,
        "generacion_hidro": 553,
        "co2_intensidad": 10351,
    }

    def __init__(self, fecha_inicio: str, fecha_fin: str):
        super().__init__("ree_esios")
        self.fecha_inicio = fecha_inicio
        self.fecha_fin = fecha_fin
        token = os.getenv("ESIOS_API_TOKEN")
        self.headers = {
            "Authorization": f"Token token={token}",
            "Accept": "application/json; application/vnd.esios-api-v2+json",
        }

    def extract(self) -> pd.DataFrame:
        if not os.getenv("ESIOS_API_TOKEN"):
            raise RuntimeError("Defina ESIOS_API_TOKEN para consultar ESIOS.")
        dfs = []
        for nombre, indicador_id in self.INDICADORES.items():
            url = (
                f"{self.BASE_URL}/indicators/{indicador_id}"
                f"?start_date={self.fecha_inicio}"
                f"&end_date={self.fecha_fin}"
                f"&time_trunc=hour"
            )
            r = requests.get(url, headers=self.headers, timeout=120)
            r.raise_for_status()
            payload = r.json()
            values = payload.get("indicator", {}).get("values", [])
            if not values:
                continue
            df_ind = pd.DataFrame(values)[["datetime", "value"]]
            df_ind["indicador"] = nombre
            dfs.append(df_ind)
        if not dfs:
            return pd.DataFrame(columns=["datetime", "value", "indicador"])
        return pd.concat(dfs, ignore_index=True)

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        df = df.copy()
        df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
        wide = df.pivot(index="datetime", columns="indicador", values="value").reset_index()
        wide = wide.rename(columns={"datetime": "fecha"})
        wide["frecuencia"] = "horaria"
        return wide
