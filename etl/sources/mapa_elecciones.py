"""Resultados electorales (Ministerio del Interior / Infoelectoral) — DAT/CSV."""

import pandas as pd

from etl.base_extractor import BaseExtractor


class MapaEleccionesExtractor(BaseExtractor):
    def __init__(self):
        super().__init__("mapa_elecciones")

    def extract(self) -> pd.DataFrame:
        return pd.DataFrame()

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        return df
