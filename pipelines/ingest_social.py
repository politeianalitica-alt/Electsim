"""Ingesta social simplificada (sin dependencia de Prefect)."""

from pipelines.ingest_all import ingest_cis_barometros, ingest_ine_demografia, ingest_redes_sociales


def ingest_social_flow() -> None:
    ingest_ine_demografia()
    ingest_cis_barometros()
    ingest_redes_sociales()


if __name__ == "__main__":
    ingest_social_flow()
