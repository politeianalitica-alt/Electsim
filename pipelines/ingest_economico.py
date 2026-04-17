"""Prefect: macroeconomía, finanzas públicas y BdE."""

from prefect import flow

from pipelines.ingest_all import ingest_macroeconomia


@flow(name="ElectSim España: ingesta económica")
def ingest_economico_flow() -> None:
    ingest_macroeconomia()


if __name__ == "__main__":
    ingest_economico_flow()
