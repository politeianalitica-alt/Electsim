"""Orquestación Prefect: orden de ingesta respetando dependencias FK."""

import os

from prefect import flow, task


@task(name="ingest_geografia")
def ingest_geografia() -> None:
    """Provincias y municipios desde API INE (WSTempus); actualiza CCAA/provincias/municipios."""
    from etl.sources.ine_geografia import INEGeografiaExtractor

    INEGeografiaExtractor().run()


@task(name="ingest_partidos")
def ingest_partidos() -> None:
    """Ampliar catálogo partidos y relaciones históricas."""
    return None


@task(name="ingest_electoral")
def ingest_electoral() -> None:
    """Resultados Congreso desde ZIP MIR del Interior (04PROV*.DAT).

    Defina ``ELECTSIM_CONGRESO=año:mes`` (p. ej. ``2023:7``, ``2019:4``, ``2019:11``).
    Sin variable, la tarea no descarga nada (idempotente en CI).
    """
    from etl.sources.interior_resultados import InteriorResultadosExtractor

    spec = os.getenv("ELECTSIM_CONGRESO", "").strip()
    if not spec:
        return
    partes = spec.replace(",", ":").split(":")
    if len(partes) != 2:
        raise ValueError("ELECTSIM_CONGRESO debe ser año:mes, p. ej. 2023:7")
    año, mes = int(partes[0]), int(partes[1])
    InteriorResultadosExtractor(año=año, mes=mes).run()


@task(name="ingest_cis_barometros")
def ingest_cis_barometros() -> None:
    """Barómetros CIS desde ficheros .sav en data/raw/cis/."""
    return None


@task(name="ingest_ine_demografia")
def ingest_ine_demografia() -> None:
    """Padrón, EPA provincial, atlas renta."""
    return None


@task(name="ingest_macroeconomia")
def ingest_macroeconomia() -> None:
    """BdE, contabilidad nacional, Eurostat."""
    return None


@task(name="ingest_sectores")
def ingest_sectores() -> None:
    """Energía, inmobiliario, agro, turismo, puertos, etc."""
    return None


@task(name="ingest_redes_sociales")
def ingest_redes_sociales() -> None:
    """Posts y métricas (fase avanzada / APIs)."""
    return None


@flow(name="ElectSim España: ingesta completa")
def ingest_all(año_inicio: int = 2000, año_fin: int = 2026) -> None:
    """Orden: geografía → partidos → electoral → encuestas → demografía → macro → sectores → redes."""
    del año_inicio, año_fin
    ingest_geografia()
    ingest_partidos()
    ingest_electoral()
    ingest_cis_barometros()
    ingest_ine_demografia()
    ingest_macroeconomia()
    ingest_sectores()
    ingest_redes_sociales()


if __name__ == "__main__":
    ingest_all()
