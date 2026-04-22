import logging
import os
from abc import ABC, abstractmethod
from pathlib import Path

import pandas as pd
import polars as pl
from dotenv import load_dotenv
from sqlalchemy import create_engine
from validation.schema_checks import validate_dataframe

load_dotenv()

logger = logging.getLogger(__name__)


class BaseExtractor(ABC):
    """Clase base para extractores de datos ElectSim España."""

    RAW_DATA_PATH = Path(os.getenv("RAW_DATA_PATH", "data/raw"))
    PROCESSED_PATH = Path(os.getenv("PROCESSED_DATA_PATH", "data/processed"))

    def __init__(self, source_name: str):
        self.source_name = source_name
        database_url = os.getenv("DATABASE_URL")
        self.engine = create_engine(database_url) if database_url else None
        self.raw_path = self.RAW_DATA_PATH / source_name
        self.processed_path = self.PROCESSED_PATH / source_name
        self.raw_path.mkdir(parents=True, exist_ok=True)
        self.processed_path.mkdir(parents=True, exist_ok=True)

    @abstractmethod
    def extract(self) -> pd.DataFrame:
        """Descarga o lee los datos crudos."""

    @abstractmethod
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Limpia, normaliza y valida los datos."""

    def load(self, df: pd.DataFrame, table_name: str, if_exists: str = "append") -> None:
        """Carga el DataFrame a PostgreSQL."""
        if self.engine is None:
            raise RuntimeError("DATABASE_URL no definida; no se puede cargar a PostgreSQL.")
        df.to_sql(
            table_name,
            self.engine,
            if_exists=if_exists,
            index=False,
            method="multi",
            chunksize=1000,
        )
        logger.info("Cargados %s registros en %s", len(df), table_name)

    def save_parquet(self, df: pd.DataFrame, filename: str) -> None:
        path = self.processed_path / f"{filename}.parquet"
        pl.from_pandas(df).write_parquet(path)
        logger.info("Parquet guardado: %s", path)

    def run(self) -> pd.DataFrame:
        """Pipeline: extract → transform → parquet (sin load salvo que se llame aparte)."""
        logger.info("Iniciando ingesta: %s", self.source_name)
        raw = self.extract()
        clean = self.transform(raw)
        issues = validate_dataframe(clean, schema=self.source_name)
        if issues:
            raise ValueError(f"Schema validation failed ({self.source_name}): {issues}")
        self.save_parquet(clean, self.source_name)
        return clean
