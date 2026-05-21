"""Tests P1 · catálogo puertos + vessels seed.

Verifica integridad estructural sin red:
  - 40 puertos, 50 buques mínimos
  - cada puerto/buque cumple schema básico
  - filtros (country, type, region, flag, operator) funcionan
  - SourceKind ampliado contiene los nuevos literals
"""
from __future__ import annotations

import pytest

from etl.sources.ports.catalog import (
    CATEGORIES_PORTS,
    PORT_TYPES,
    PORTS,
    get_port,
    list_ports,
)
from etl.sources.ports.vessels_seed import (
    VESSEL_TYPES,
    VESSELS,
    get_vessel,
    list_vessels,
)


# ─────────────────────────────────────────────────────────────────
# Catálogo puertos
# ─────────────────────────────────────────────────────────────────

def test_port_catalog_has_min_40_entries():
    assert len(PORTS) >= 40


def test_every_port_has_required_fields():
    required = {"slug", "unlocode", "name", "country_iso", "lat", "lon", "type", "region", "timezone"}
    for slug, p in PORTS.items():
        missing = required - set(p.keys())
        assert not missing, f"puerto '{slug}' falta {missing}"
        # slug coincide con clave
        assert p["slug"] == slug
        # tipos válidos
        assert p["type"] in PORT_TYPES, f"{slug} type inválido: {p['type']}"
        assert p["region"] in CATEGORIES_PORTS, f"{slug} region inválida: {p['region']}"
        # lat/lon en rango válido
        assert -90 <= p["lat"] <= 90
        assert -180 <= p["lon"] <= 180
        # ISO-2 dos letras
        assert len(p["country_iso"]) == 2 and p["country_iso"].isupper()
        # UN/LOCODE 5 letras
        assert len(p["unlocode"]) == 5 and p["unlocode"].isupper()


def test_no_duplicate_unlocodes():
    codes = [p["unlocode"] for p in PORTS.values()]
    assert len(codes) == len(set(codes)), "UN/LOCODE duplicado"


def test_list_ports_filter_by_country():
    es_ports = list_ports(country="ES")
    assert len(es_ports) >= 6
    assert all(p["country_iso"] == "ES" for p in es_ports)
    # Algeciras y Valencia están
    slugs = {p["slug"] for p in es_ports}
    assert {"algeciras", "valencia"}.issubset(slugs)


def test_list_ports_filter_by_type():
    containers = list_ports(type_="container")
    assert all(p["type"] == "container" for p in containers)
    assert len(containers) >= 15  # mayoría son container hubs


def test_list_ports_filter_by_region():
    # Canónico: regiones en inglés
    asia = list_ports(region="asia_pacific")
    assert all(p["region"] == "asia_pacific" for p in asia)
    assert {"singapore", "shanghai", "busan"}.issubset({p["slug"] for p in asia})


def test_list_ports_region_alias_legacy():
    # Aliases legacy (`asia_pacifico`, `eu`, `espana`…) deben seguir filtrando OK
    # gracias a `_normalize_region`. Mantiene compat con URLs antiguas.
    es_legacy = list_ports(region="espana")
    es_canonical = list_ports(region="spain")
    assert {p["slug"] for p in es_legacy} == {p["slug"] for p in es_canonical}
    assert len(es_canonical) >= 6
    # case-insensitive
    eu_upper = list_ports(region="EUROPE")
    eu_lower = list_ports(region="europe")
    assert {p["slug"] for p in eu_upper} == {p["slug"] for p in eu_lower}


def test_get_port_known_and_unknown():
    assert get_port("algeciras")["country_iso"] == "ES"
    assert get_port("Algeciras")["slug"] == "algeciras"  # case-insensitive
    assert get_port("nonexistent_xyz") is None


# ─────────────────────────────────────────────────────────────────
# Vessels seed
# ─────────────────────────────────────────────────────────────────

def test_vessels_seed_has_min_50_entries():
    assert len(VESSELS) >= 50


def test_every_vessel_has_required_fields():
    required = {"imo", "mmsi", "name", "flag_iso", "type", "dwt", "operator", "built_year"}
    for key, v in VESSELS.items():
        missing = required - set(v.keys())
        assert not missing, f"vessel '{key}' falta {missing}"
        # IMO formato IMO + 7 dígitos
        assert v["imo"].startswith("IMO") and len(v["imo"]) == 10
        assert v["imo"][3:].isdigit()
        # MMSI 9 dígitos
        assert len(v["mmsi"]) == 9 and v["mmsi"].isdigit()
        # type válido
        assert v["type"] in VESSEL_TYPES, f"{key} type inválido"
        # flag ISO-2
        assert len(v["flag_iso"]) == 2 and v["flag_iso"].isupper()
        # built_year razonable
        assert 1990 <= v["built_year"] <= 2030


def test_no_duplicate_imo():
    imos = [v["imo"] for v in VESSELS.values()]
    assert len(imos) == len(set(imos))


def test_list_vessels_filter_by_type():
    tankers = list_vessels(type_="tanker")
    assert all(v["type"] == "tanker" for v in tankers)
    assert len(tankers) >= 8


def test_list_vessels_filter_by_flag():
    danish = list_vessels(flag="DK")
    assert all(v["flag_iso"] == "DK" for v in danish)


def test_list_vessels_filter_by_operator_substring():
    maersk = list_vessels(operator="Maersk")
    assert len(maersk) >= 2
    assert all("maersk" in v["operator"].lower() for v in maersk)


def test_get_vessel_with_and_without_prefix():
    assert get_vessel("IMO9525338")["name"] == "EVER GIVEN"
    assert get_vessel("9525338")["name"] == "EVER GIVEN"  # sin prefijo
    assert get_vessel("nonexistent") is None


# ─────────────────────────────────────────────────────────────────
# SourceKind ampliado
# ─────────────────────────────────────────────────────────────────

def test_source_kind_includes_ports_literals():
    """Verifica que NormalizedItem acepta los nuevos source kinds."""
    from packages.types.normalized_item import SourceKind  # type: ignore
    import typing
    args = set(typing.get_args(SourceKind))
    expected = {"ais_position", "port_call", "comtrade", "eurostat_comext",
                "freight_rate", "sanctions_maritime"}
    missing = expected - args
    assert not missing, f"SourceKind no incluye: {missing}"
