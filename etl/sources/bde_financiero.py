"""Series temporales Banco de España — CSV desde portal estadístico."""

import pandas as pd

from etl.base_extractor import BaseExtractor


class BdeFinancieroExtractor(BaseExtractor):
    def __init__(self):
        super().__init__("bde_financiero")

    def extract(self) -> pd.DataFrame:
        return pd.DataFrame()

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        return df
