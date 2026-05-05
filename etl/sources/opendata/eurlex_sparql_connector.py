"""
EUR-Lex SPARQL Connector — Bloque 10.

Consultas SPARQL al endpoint de EUR-Lex / Publications Office.
No reemplaza legislative/eurlex_client.py.

opendata/eurlex_sparql_connector = consultas SPARQL / descubrimiento
legislative/eurlex_client        = ingesta de normas concretas
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import InstitutionalAPIEndpoint, OpenDatasetResource

logger = logging.getLogger(__name__)

PORTAL_ID = "eurlex"
SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql"
CELLAR_ENDPOINT = "https://publications.europa.eu/resource/cellar"

# Queries SPARQL predefinidas
_COMMON_QUERIES: dict[str, str] = {
    "recent_regulations": """
        PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        SELECT DISTINCT ?work ?title ?date WHERE {
            ?work a cdm:regulation .
            ?work cdm:work_date_document ?date .
            OPTIONAL { ?work cdm:work_title_display ?title . }
            FILTER(?date >= "2024-01-01"^^xsd:date)
        }
        ORDER BY DESC(?date) LIMIT 50
    """,
    "recent_directives": """
        PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
        SELECT DISTINCT ?work ?title ?date WHERE {
            ?work a cdm:directive .
            ?work cdm:work_date_document ?date .
            OPTIONAL { ?work cdm:work_title_display ?title . }
            FILTER(?date >= "2024-01-01"^^xsd:date)
        }
        ORDER BY DESC(?date) LIMIT 50
    """,
    "search_by_keyword": """
        PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
        SELECT DISTINCT ?work ?title ?type WHERE {
            ?work cdm:work_title_display ?title .
            ?work a ?type .
            FILTER(CONTAINS(LCASE(STR(?title)), LCASE("{keyword}")))
        }
        LIMIT 50
    """,
}


def list_common_queries() -> list[InstitutionalAPIEndpoint]:
    """Lista los endpoints SPARQL comunes de EUR-Lex."""
    return [
        InstitutionalAPIEndpoint(
            source_id=PORTAL_ID,
            name=f"EUR-Lex SPARQL — {name}",
            url_template=SPARQL_ENDPOINT,
            protocol="sparql",
            description=f"Query: {name}",
            applicable_modules=["legislative", "documents"],
            parameters_schema={"query": {"type": "string", "description": "SPARQL query"}},
        )
        for name in _COMMON_QUERIES
    ]


def run_sparql_query(
    query: str,
    limit: int = 100,
    timeout: int = 20,
) -> list[dict]:
    """
    Ejecuta una query SPARQL en el endpoint de EUR-Lex.

    Returns:
        Lista de diccionarios con los resultados. Vacía si falla.
    """
    try:
        import requests
        resp = requests.get(
            SPARQL_ENDPOINT,
            params={"query": query, "format": "json"},
            timeout=timeout,
            headers={"Accept": "application/sparql-results+json"},
        )
        resp.raise_for_status()
        data = resp.json()
        bindings = data.get("results", {}).get("bindings", [])
        return [
            {k: v.get("value") for k, v in row.items()}
            for row in bindings[:limit]
        ]
    except Exception as exc:
        logger.debug("run_sparql_query: %s", exc)
        return []


def search_eu_legal_documents(
    query: str,
    limit: int = 50,
    timeout: int = 20,
) -> list[OpenDatasetResource]:
    """
    Busca documentos jurídicos de la UE por texto.

    Returns:
        Lista de recursos (documentos EUR-Lex).
    """
    sparql_query = _COMMON_QUERIES["search_by_keyword"].replace("{keyword}", query)
    results = run_sparql_query(sparql_query, limit=limit, timeout=timeout)

    resources = []
    for row in results:
        work = row.get("work") or ""
        title = row.get("title") or work
        doc_type = str(row.get("type") or "").split("/")[-1]

        resources.append(OpenDatasetResource(
            resource_id=f"{PORTAL_ID}:{__import__('hashlib').md5(work.encode()).hexdigest()[:12]}",
            dataset_id=f"{PORTAL_ID}:legal_corpus",
            title=title[:300] if title else None,
            url=work,
            download_url=work,
            format="HTML",
            is_document=True,
            is_machine_readable=False,
            raw_payload={"work": work, "type": doc_type},
        ))

    return resources


def get_predefined_query(query_name: str) -> str | None:
    """Devuelve una query SPARQL predefinida por nombre."""
    return _COMMON_QUERIES.get(query_name)
