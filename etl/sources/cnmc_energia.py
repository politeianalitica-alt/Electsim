"""Datos reguladores CNMC (energía, telecom) — a definir por dataset."""

import pandas as pd

from etl.base_extractor import BaseExtractor


class CNMCEnergiaExtractor(BaseExtractor):
    def __init__(self):
        super().__init__("cnmc_energia")

    def extract(self) -> pd.DataFrame:
        return pd.DataFrame()

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        return df
