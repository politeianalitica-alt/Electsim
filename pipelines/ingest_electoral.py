"""Ingesta electoral simplificada (sin dependencia de Prefect)."""

from pipelines.ingest_all import ingest_electoral as _ingest_electoral


def ingest_electoral_flow() -> None:
    _ingest_electoral()


if __name__ == "__main__":
    ingest_electoral_flow()
