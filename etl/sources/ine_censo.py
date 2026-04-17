"""Ingesta censo/padrón municipal INE — implementar según tabla operativa."""

import pandas as pd

from etl.base_extractor import BaseExtractor


class INECensoExtractor(BaseExtractor):
    def __init__(self):
        super().__init__("ine_censo")

    def extract(self) -> pd.DataFrame:
        return pd.DataFrame()

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        return df
