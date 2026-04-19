from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class LinkType:
    name: str
    source_type: str
    target_type: str
    via_table: str | None
    source_key: str
    target_key: str


@dataclass(slots=True)
class OntologyType:
    name: str
    table: str
    pk_column: str
    properties: dict[str, str]
    links: dict[str, LinkType]
    actions: list[str]


ONTOLOGY_REGISTRY: dict[str, OntologyType] = {
    "Partido": OntologyType(
        name="Partido",
        table="partidos",
        pk_column="id",
        properties={"siglas": "siglas", "nombre": "nombre_completo", "ideologia": "ideologia"},
        links={},
        actions=["simulate_campaign", "compute_pedersen"],
    ),
    "Municipio": OntologyType(
        name="Municipio",
        table="municipios",
        pk_column="id",
        properties={"nombre": "nombre", "poblacion": "poblacion", "codigo_ine": "codigo_ine"},
        links={
            "provincia": LinkType(
                name="municipio_provincia",
                source_type="Municipio",
                target_type="Provincia",
                via_table=None,
                source_key="provincia_id",
                target_key="id",
            )
        },
        actions=["get_risk_score"],
    ),
    "Provincia": OntologyType(
        name="Provincia",
        table="provincias",
        pk_column="id",
        properties={"nombre": "nombre", "codigo_ine": "codigo_ine"},
        links={},
        actions=[],
    ),
    "PerfilVotante": OntologyType(
        name="PerfilVotante",
        table="perfiles_votante",
        pk_column="id",
        properties={"cluster_id": "cluster_id", "label": "label", "peso_demografico_pct": "peso_demografico_pct"},
        links={},
        actions=["run_voter_agent_turn"],
    ),
    "Eleccion": OntologyType(
        name="Eleccion",
        table="elecciones",
        pk_column="id",
        properties={"tipo": "tipo", "fecha": "fecha", "ambito": "ambito", "es_activa": "es_activa"},
        links={},
        actions=["compute_nowcast"],
    ),
    "ResultadoElectoral": OntologyType(
        name="ResultadoElectoral",
        table="resultados_electorales",
        pk_column="id",
        properties={"votos": "votos", "porcentaje": "porcentaje", "escanos": "escanos"},
        links={},
        actions=[],
    ),
    "IndicadorMacro": OntologyType(
        name="IndicadorMacro",
        table="indicadores_macroeconomicos",
        pk_column="id",
        properties={"indicador": "indicador", "fecha": "fecha", "valor": "valor", "fuente": "fuente"},
        links={},
        actions=["get_macro_indicator"],
    ),
}
