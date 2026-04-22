"""Ingesta económica simplificada (sin dependencia de Prefect)."""

from pipelines.ingest_all import ingest_macroeconomia


def ingest_economico_flow() -> None:
    ingest_macroeconomia()


if __name__ == "__main__":
    ingest_economico_flow()
