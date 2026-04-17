"""Prefect: solo dominio electoral."""

from prefect import flow

from pipelines.ingest_all import ingest_electoral as _ingest_electoral


@flow(name="ElectSim España: ingesta electoral")
def ingest_electoral_flow() -> None:
    _ingest_electoral()


if __name__ == "__main__":
    ingest_electoral_flow()
