from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import pandas as pd
import polars as pl
from sqlalchemy import create_engine


class DataFrameEngine(ABC):
    @abstractmethod
    def read_table(self, table: str):
        raise NotImplementedError

    @abstractmethod
    def write_table(self, df, table: str, mode: str = "append") -> None:
        raise NotImplementedError


class PandasEngine(DataFrameEngine):
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)

    def read_table(self, table: str) -> pd.DataFrame:
        return pd.read_sql(f"SELECT * FROM {table}", self.engine)

    def write_table(self, df: pd.DataFrame, table: str, mode: str = "append") -> None:
        if_exists = "append" if mode == "append" else "replace"
        df.to_sql(table, self.engine, if_exists=if_exists, index=False)


class PolarsEngine(DataFrameEngine):
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(database_url)

    def read_table(self, table: str) -> pl.DataFrame:
        pdf = pd.read_sql(f"SELECT * FROM {table}", self.engine)
        return pl.from_pandas(pdf)

    def write_table(self, df: pl.DataFrame | Any, table: str, mode: str = "append") -> None:
        if isinstance(df, pl.DataFrame):
            pdf = df.to_pandas()
        else:
            pdf = pd.DataFrame(df)
        if_exists = "append" if mode == "append" else "replace"
        pdf.to_sql(table, self.engine, if_exists=if_exists, index=False)
