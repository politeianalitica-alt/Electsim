"""
Spanish Presence Provider — Bloque 14.

Consolidates military, energy, business, diplomatic and diaspora
presence for Spain in key countries.

Falls back gracefully when legacy scrapers are unavailable.
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.geopolitics.schemas import SpanishPresence

logger = logging.getLogger(__name__)

# Static seed data — used when no scraper is available
# Format: (presence_id, country_iso3, country_name, category, actor_name, description, value, unit, relevance)
_STATIC_PRESENCE: list[tuple] = [
    # Military missions
    ("mil_lbv_001", "LBY", "Libya", "military", "Operación Sophia/IRINI", "Participación naval EU IRINI en Mediterráneo", None, None, 0.85),
    ("mil_mli_001", "MLI", "Mali", "military", "EUTM Mali", "Misión UE entrenamiento FFAA malienses (suspendida 2023)", None, None, 0.72),
    ("mil_irq_001", "IRQ", "Iraq", "military", "Inherent Resolve", "Asesoramiento coalición anti-ISIS", None, None, 0.65),
    ("mil_lbn_001", "LBN", "Lebanon", "military", "UNIFIL", "Fuerza ONU Sur Líbano ~600 efectivos", 600.0, "efectivos", 0.80),
    ("mil_afg_001", "AFG", "Afghanistan", "military", "OTAN RSM (histórico)", "Misión histórica OTAN — retirada 2021", None, None, 0.50),
    # Energy
    ("ene_dza_001", "DZA", "Algeria", "energy", "Medgaz", "Gasoducto Argelia–España 8 Gm³/año", 8.0, "Gm³/año", 0.95),
    ("ene_dza_002", "DZA", "Algeria", "energy", "Sonatrach-Naturgy", "Contratos GNL largo plazo con Naturgy", None, None, 0.90),
    ("ene_nga_001", "NGA", "Nigeria", "energy", "Repsol Nigeria", "Participación en bloques OML offhsore", None, None, 0.70),
    ("ene_ago_001", "AGO", "Angola", "energy", "Repsol Angola", "Bloques offshore Angolan Basin", None, None, 0.65),
    ("ene_sau_001", "SAU", "Saudi Arabia", "energy", "Aramco–Repsol", "Suministro crudo Arabia Saudí", None, None, 0.60),
    ("ene_ven_001", "VEN", "Venezuela", "energy", "Repsol Venezuela", "Bloques petrolíferos (operación reducida)", None, None, 0.70),
    # Business
    ("biz_bra_001", "BRA", "Brazil", "business", "Santander Brasil", "Banco Santander mayor banco privado Brasil", None, None, 0.75),
    ("biz_mex_001", "MEX", "Mexico", "business", "Grupo empresarial español", "Santander, Telefónica, Iberdrola, ACS", None, None, 0.78),
    ("biz_arg_001", "ARG", "Argentina", "business", "Grupo empresarial español", "Telefónica, YPF (participación histórica)", None, None, 0.65),
    ("biz_col_001", "COL", "Colombia", "business", "ISA-Enel Colombia", "Infraestructura eléctrica", None, None, 0.68),
    ("biz_tur_001", "TUR", "Turkey", "business", "Inditex-Zara Turquía", "Gran red comercial Inditex", None, None, 0.60),
    ("biz_mar_001", "MAR", "Morocco", "business", "OCP–Fertiberia", "Acuerdo fosfatos para fertilizantes", None, None, 0.85),
    # Diplomatic
    ("dip_mar_001", "MAR", "Morocco", "diplomatic", "Embajada Madrid-Rabat", "Relación bilateral clave, acuerdo pesca UE", None, None, 0.92),
    ("dip_alg_001", "DZA", "Algeria", "diplomatic", "Embajada Argel", "Relación tensa tras reconocimiento Sahara 2022", None, None, 0.90),
    ("dip_pse_001", "PSE", "Palestine", "diplomatic", "Reconocimiento Estado", "España reconoció Estado Palestino mayo 2024", None, None, 0.75),
    ("dip_cub_001", "CUB", "Cuba", "diplomatic", "Embajada La Habana", "Relaciones históricas, posición UE", None, None, 0.60),
    # Diaspora
    ("dia_arg_001", "ARG", "Argentina", "diaspora", "Comunidad española Argentina", "~500k españoles registrados", 500000.0, "personas", 0.70),
    ("dia_bra_001", "BRA", "Brazil", "diaspora", "Comunidad española Brasil", "~300k españoles registrados", 300000.0, "personas", 0.65),
    ("dia_mex_001", "MEX", "Mexico", "diaspora", "Comunidad española México", "~200k españoles registrados", 200000.0, "personas", 0.65),
    ("dia_ven_001", "VEN", "Venezuela", "diaspora", "Comunidad española Venezuela", "~150k — éxodo reciente", 150000.0, "personas", 0.75),
    ("dia_mar_001", "MAR", "Morocco", "diplomatic", "Comunidad española Marruecos", "~40k españoles en Marruecos", 40000.0, "personas", 0.80),
]


def get_spanish_presence(
    country_iso3: str | None = None,
    categories: list[str] | None = None,
) -> list[SpanishPresence]:
    """
    Devuelve presencia española en países extranjeros.

    Intenta scrapers legados; si fallan, usa datos estáticos.

    Args:
        country_iso3: Filtrar por país ISO3. None = todos.
        categories: Filtrar por categoría. None = todas.
    """
    presence = _try_legacy_scrapers(country_iso3, categories)
    if presence:
        return presence
    return _static_presence(country_iso3, categories)


def get_military_missions() -> list[SpanishPresence]:
    """Devuelve misiones militares españolas en el exterior."""
    return get_spanish_presence(categories=["military"])


def get_energy_exposure() -> list[SpanishPresence]:
    """Devuelve exposición energética española exterior."""
    return get_spanish_presence(categories=["energy"])


def get_business_exposure() -> list[SpanishPresence]:
    """Devuelve exposición empresarial española exterior."""
    return get_spanish_presence(categories=["business"])


def get_diplomatic_network() -> list[SpanishPresence]:
    """Devuelve red diplomática española."""
    return get_spanish_presence(categories=["diplomatic"])


def get_diaspora() -> list[SpanishPresence]:
    """Devuelve datos de diáspora española."""
    return get_spanish_presence(categories=["diaspora"])


def get_all_presence_by_country() -> dict[str, list[SpanishPresence]]:
    """Agrupa toda la presencia española por código ISO3."""
    all_p = get_spanish_presence()
    result: dict[str, list[SpanishPresence]] = {}
    for p in all_p:
        result.setdefault(p.country_iso3, []).append(p)
    return result


# ── Privadas ────────────────────────────────────────────────────────────────

def _try_legacy_scrapers(
    country_iso3: str | None, categories: list[str] | None
) -> list[SpanishPresence]:
    """Intenta scrapers legados de etl/sources/geo/."""
    results: list[SpanishPresence] = []

    if not categories or "military" in categories:
        results.extend(_try_defense_missions(country_iso3))
    if not categories or "energy" in categories:
        results.extend(_try_energy_exposure(country_iso3))
    if not categories or "diplomatic" in categories:
        results.extend(_try_diplomatic(country_iso3))
    if not categories or "diaspora" in categories:
        results.extend(_try_diaspora(country_iso3))

    return results


def _try_defense_missions(country_iso3: str | None) -> list[SpanishPresence]:
    try:
        from etl.sources.geo.scraper_misiones_emad import MisionesEMADScraper
        scraper = MisionesEMADScraper()
        df = scraper.fetch()
        if df is None or df.empty:
            return []
        items = []
        for _, row in df.iterrows():
            d = row.to_dict()
            iso3 = d.get("iso3") or d.get("country_iso3", "")
            if country_iso3 and iso3 != country_iso3:
                continue
            items.append(SpanishPresence(
                presence_id=f"mil:{d.get('id', len(items))}",
                country_iso3=iso3,
                country_name=d.get("country", ""),
                category="military",
                actor_name=d.get("mision") or d.get("mission"),
                description=d.get("description", ""),
                value=d.get("efectivos") or d.get("troops"),
                unit="efectivos",
                source="emad",
                relevance_score=0.80,
                raw_payload=d,
            ))
        return items
    except Exception as exc:
        logger.debug("EMAD scraper no disponible: %s", exc)
        return []


def _try_energy_exposure(country_iso3: str | None) -> list[SpanishPresence]:
    try:
        from etl.sources.geo.scraper_energia_espana import EnergiaEspanaScraper
        scraper = EnergiaEspanaScraper()
        df = scraper.fetch()
        if df is None or df.empty:
            return []
        items = []
        for _, row in df.iterrows():
            d = row.to_dict()
            iso3 = d.get("iso3") or d.get("country_iso3", "")
            if country_iso3 and iso3 != country_iso3:
                continue
            items.append(SpanishPresence(
                presence_id=f"ene:{d.get('id', len(items))}",
                country_iso3=iso3,
                country_name=d.get("country", ""),
                category="energy",
                actor_name=d.get("actor") or d.get("company"),
                description=d.get("description", ""),
                value=d.get("value"),
                unit=d.get("unit"),
                source="energia_espana",
                relevance_score=0.75,
                raw_payload=d,
            ))
        return items
    except Exception as exc:
        logger.debug("EnergiaEspana scraper no disponible: %s", exc)
        return []


def _try_diplomatic(country_iso3: str | None) -> list[SpanishPresence]:
    try:
        from etl.sources.geo.scraper_red_diplomatica import RedDiplomaticaScraper
        scraper = RedDiplomaticaScraper()
        df = scraper.fetch()
        if df is None or df.empty:
            return []
        items = []
        for _, row in df.iterrows():
            d = row.to_dict()
            iso3 = d.get("iso3") or d.get("country_iso3", "")
            if country_iso3 and iso3 != country_iso3:
                continue
            items.append(SpanishPresence(
                presence_id=f"dip:{d.get('id', len(items))}",
                country_iso3=iso3,
                country_name=d.get("country", ""),
                category="diplomatic",
                actor_name=d.get("embajada") or d.get("mission"),
                description=d.get("description", ""),
                source="red_diplomatica",
                relevance_score=0.70,
                raw_payload=d,
            ))
        return items
    except Exception as exc:
        logger.debug("RedDiplomatica scraper no disponible: %s", exc)
        return []


def _try_diaspora(country_iso3: str | None) -> list[SpanishPresence]:
    try:
        from etl.sources.geo.scraper_diaspora_pere import DiasporaScraper
        scraper = DiasporaScraper()
        df = scraper.fetch()
        if df is None or df.empty:
            return []
        items = []
        for _, row in df.iterrows():
            d = row.to_dict()
            iso3 = d.get("iso3") or d.get("country_iso3", "")
            if country_iso3 and iso3 != country_iso3:
                continue
            items.append(SpanishPresence(
                presence_id=f"dia:{d.get('id', len(items))}",
                country_iso3=iso3,
                country_name=d.get("country", ""),
                category="diaspora",
                description=d.get("description", ""),
                value=d.get("population") or d.get("personas"),
                unit="personas",
                source="diaspora_pere",
                relevance_score=0.65,
                raw_payload=d,
            ))
        return items
    except Exception as exc:
        logger.debug("Diaspora scraper no disponible: %s", exc)
        return []


def _static_presence(
    country_iso3: str | None, categories: list[str] | None
) -> list[SpanishPresence]:
    """Devuelve datos estáticos filtrados."""
    items = []
    for row in _STATIC_PRESENCE:
        pid, iso3, name, cat, actor, desc, val, unit, rel = row
        if country_iso3 and iso3 != country_iso3:
            continue
        if categories and cat not in categories:
            continue
        items.append(SpanishPresence(
            presence_id=pid,
            country_iso3=iso3,
            country_name=name,
            category=cat,
            actor_name=actor,
            description=desc,
            value=val,
            unit=unit,
            source="static_seed",
            relevance_score=rel,
        ))
    return items
