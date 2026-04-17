"""Prefect: sectores (energía, agro, turismo, industria, etc.)."""

from prefect import flow

from pipelines.ingest_all import ingest_sectores


@flow(name="ElectSim España: ingesta sectorial")
def ingest_sectorial_flow() -> None:
    ingest_sectores()


if __name__ == "__main__":
    ingest_sectorial_flow()
