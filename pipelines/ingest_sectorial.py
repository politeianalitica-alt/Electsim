"""Ingesta sectorial simplificada (sin dependencia de Prefect)."""

from pipelines.ingest_all import ingest_sectores


def ingest_sectorial_flow() -> None:
    ingest_sectores()


if __name__ == "__main__":
    ingest_sectorial_flow()
