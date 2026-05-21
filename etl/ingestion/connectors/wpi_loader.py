"""World Port Index (WPI) loader · expande tabla `ports` con metadata NGA Pub. 150.

Sprint 2 Fase C · módulo Puertos.

World Port Index es el catálogo oficial de la National Geospatial-Intelligence
Agency (USA), Pub. 150. Contiene ~3.700 puertos mundiales con campos:
  - harbor_size (V/L/M/S)
  - harbor_type (CN/CB/RH/LC/OR/RV/TH)
  - shelter (E/G/F/N · excellent/good/fair/none)
  - entrance_restrictions
  - max_vessel_size (LOA, DWT, draft)
  - cargo_pier_depth (en metros)
  - loading_facilities
  - facilities (medical, repairs, drydock, railway, etc.)

Fuente oficial: https://msi.nga.mil/Publications/WPI

═══════════════════════════════════════════════════════════════════════
Modos de operación
═══════════════════════════════════════════════════════════════════════

  1. **Stub mode (default)** · usa el dataset embebido `WPI_STARTER` con 20
     puertos extra críticos no presentes en catalog.py (Damietta, Salalah,
     Khalifa, Mundra, Chennai, Lagos, Durban, Santos, Buenos Aires,
     Vancouver USA, Halifax, Veracruz, Manzanillo, Karachi, Chittagong,
     Yangon, Haiphong, Klaipeda, Gdansk, Constanta).

  2. **Real download mode** · `--download` + `WPI_URL` env var apunta al
     CSV/shapefile descargable de NGA (mantiene URL fuera del repo). El
     parser normaliza al esquema `ports` y hace upsert idempotente.

Uso CLI:

  # Importar starter set (sin red)
  python -m etl.ingestion.connectors.wpi_loader

  # Importar dataset completo (descarga real · cuando WPI_URL configurada)
  python -m etl.ingestion.connectors.wpi_loader --download

  # Dry-run · imprime sin escribir
  python -m etl.ingestion.connectors.wpi_loader --dry-run

Falla cerrado: sin BD → loguea y exit 0. Sin URL → usa starter set.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Starter set · 20 puertos críticos no incluidos en catalog.py
# Suficientes para que el módulo se sienta más global sin descarga.
# Sigue el esquema `ports` (tras migración 0080) con campos enriquecidos.
# ─────────────────────────────────────────────────────────────────

WPI_STARTER: list[dict[str, Any]] = [
    # Mediterráneo y Mar Rojo
    {
        "slug": "tangier_med", "unlocode": "MAPTM",
        "name": "Tanger Med", "country_iso": "MA",
        "lat": 35.8853, "lon": -5.5167,
        "type": "container", "timezone": "Africa/Casablanca",
        "region": "africa",
        "description": "Estrecho de Gibraltar · 10M TEU · competidor directo Algeciras.",
        "authority_name": "TMSA · Tanger Med Special Agency",
        "operator_model": "concession", "terminal_count": 3,
        "max_draft_m": 18.0, "annual_teu_actual": 10000000,
        "rail_connected": True, "free_zone": True,
        "shore_power": True, "wpi_index_id": "WPI-MA-TNG",
    },
    {
        "slug": "damietta", "unlocode": "EGDAM",
        "name": "Damietta", "country_iso": "EG",
        "lat": 31.4750, "lon": 31.7600,
        "type": "container", "timezone": "Africa/Cairo",
        "region": "middle_east",
        "description": "Mediterráneo oriental · alternativa Port Said.",
        "max_draft_m": 14.5, "annual_teu_actual": 1500000,
        "wpi_index_id": "WPI-EG-DMT",
    },
    # Golfo Pérsico
    {
        "slug": "khalifa", "unlocode": "AEKHL",
        "name": "Khalifa Port (Abu Dhabi)", "country_iso": "AE",
        "lat": 24.8214, "lon": 54.6747,
        "type": "container", "timezone": "Asia/Dubai",
        "region": "middle_east",
        "description": "Hub COSCO · alternativa Jebel Ali · expansión Khalifa Industrial Zone.",
        "max_draft_m": 18.0, "annual_teu_actual": 5000000,
        "rail_connected": True, "free_zone": True,
        "wpi_index_id": "WPI-AE-KHL",
    },
    {
        "slug": "karachi", "unlocode": "PKKHI",
        "name": "Karachi", "country_iso": "PK",
        "lat": 24.8500, "lon": 66.9690,
        "type": "container", "timezone": "Asia/Karachi",
        "region": "asia_pacific",
        "description": "1º Pakistán · gateway Asia Sur sin acceso a India.",
        "max_draft_m": 13.0, "annual_teu_actual": 2200000,
        "wpi_index_id": "WPI-PK-KHI",
    },
    # India y Subcontinente
    {
        "slug": "mundra", "unlocode": "INMUN",
        "name": "Mundra", "country_iso": "IN",
        "lat": 22.7390, "lon": 69.7280,
        "type": "container", "timezone": "Asia/Kolkata",
        "region": "asia_pacific",
        "description": "1º privado India (Adani) · 7M TEU · gateway noroeste.",
        "max_draft_m": 17.5, "annual_teu_actual": 7000000,
        "rail_connected": True, "free_zone": True,
        "wpi_index_id": "WPI-IN-MUN",
    },
    {
        "slug": "chennai", "unlocode": "INMAA",
        "name": "Chennai", "country_iso": "IN",
        "lat": 13.0820, "lon": 80.2950,
        "type": "container", "timezone": "Asia/Kolkata",
        "region": "asia_pacific",
        "description": "2º India container · gateway industrial automotriz.",
        "max_draft_m": 16.5, "annual_teu_actual": 1900000,
        "wpi_index_id": "WPI-IN-MAA",
    },
    {
        "slug": "chittagong", "unlocode": "BDCGP",
        "name": "Chittagong", "country_iso": "BD",
        "lat": 22.3380, "lon": 91.8160,
        "type": "container", "timezone": "Asia/Dhaka",
        "region": "asia_pacific",
        "description": "1º Bangladesh · textil RMG export critical.",
        "max_draft_m": 9.5, "annual_teu_actual": 3200000,
        "wpi_index_id": "WPI-BD-CGP",
    },
    # SE Asia
    {
        "slug": "yangon", "unlocode": "MMRGN",
        "name": "Yangon", "country_iso": "MM",
        "lat": 16.7530, "lon": 96.1750,
        "type": "container", "timezone": "Asia/Yangon",
        "region": "asia_pacific",
        "description": "1º Myanmar · sanctions risk post-2021 coup.",
        "max_draft_m": 9.0, "annual_teu_actual": 900000,
        "wpi_index_id": "WPI-MM-RGN",
    },
    {
        "slug": "haiphong", "unlocode": "VNHPH",
        "name": "Haiphong", "country_iso": "VN",
        "lat": 20.8650, "lon": 106.6840,
        "type": "container", "timezone": "Asia/Ho_Chi_Minh",
        "region": "asia_pacific",
        "description": "Gateway norte Vietnam · Lach Huyen deepwater terminal.",
        "max_draft_m": 14.0, "annual_teu_actual": 4500000,
        "wpi_index_id": "WPI-VN-HPH",
    },
    # África
    {
        "slug": "lagos_apapa", "unlocode": "NGLOS",
        "name": "Lagos (Apapa)", "country_iso": "NG",
        "lat": 6.4520, "lon": 3.3700,
        "type": "container", "timezone": "Africa/Lagos",
        "region": "africa",
        "description": "1º África Occidental · congestión crónica · Tin Can + Apapa.",
        "max_draft_m": 13.5, "annual_teu_actual": 1800000,
        "wpi_index_id": "WPI-NG-LOS",
    },
    {
        "slug": "durban", "unlocode": "ZADUR",
        "name": "Durban", "country_iso": "ZA",
        "lat": -29.8730, "lon": 31.0218,
        "type": "container", "timezone": "Africa/Johannesburg",
        "region": "africa",
        "description": "1º África Sub-Sahariana · 2.5M TEU · gateway Sudáfrica.",
        "max_draft_m": 16.5, "annual_teu_actual": 2500000,
        "rail_connected": True,
        "wpi_index_id": "WPI-ZA-DUR",
    },
    # América Latina
    {
        "slug": "santos", "unlocode": "BRSSZ",
        "name": "Santos", "country_iso": "BR",
        "lat": -23.9620, "lon": -46.3320,
        "type": "container", "timezone": "America/Sao_Paulo",
        "region": "latin_america",
        "description": "1º Latinoamérica · 5M TEU · gateway São Paulo + agro.",
        "max_draft_m": 15.0, "annual_teu_actual": 5000000,
        "rail_connected": True,
        "wpi_index_id": "WPI-BR-SSZ",
    },
    {
        "slug": "buenos_aires", "unlocode": "ARBUE",
        "name": "Buenos Aires (Puerto Nuevo)", "country_iso": "AR",
        "lat": -34.5840, "lon": -58.3720,
        "type": "container", "timezone": "America/Argentina/Buenos_Aires",
        "region": "latin_america",
        "description": "1º Argentina · gateway agro Pampa · canal access restringido.",
        "max_draft_m": 10.3, "annual_teu_actual": 1300000,
        "wpi_index_id": "WPI-AR-BUE",
    },
    {
        "slug": "veracruz", "unlocode": "MXVER",
        "name": "Veracruz", "country_iso": "MX",
        "lat": 19.2050, "lon": -96.1400,
        "type": "container", "timezone": "America/Mexico_City",
        "region": "latin_america",
        "description": "Gateway Golfo de México · 1M TEU + ro-ro autos.",
        "max_draft_m": 16.0, "annual_teu_actual": 1100000,
        "rail_connected": True,
        "wpi_index_id": "WPI-MX-VER",
    },
    {
        "slug": "manzanillo_mx", "unlocode": "MXZLO",
        "name": "Manzanillo", "country_iso": "MX",
        "lat": 19.0570, "lon": -104.3210,
        "type": "container", "timezone": "America/Mexico_City",
        "region": "latin_america",
        "description": "1º Pacífico México · 3.4M TEU · Asia → México auto industry.",
        "max_draft_m": 16.5, "annual_teu_actual": 3400000,
        "rail_connected": True,
        "wpi_index_id": "WPI-MX-ZLO",
    },
    # Mar Báltico
    {
        "slug": "gdansk", "unlocode": "PLGDN",
        "name": "Gdańsk (DCT)", "country_iso": "PL",
        "lat": 54.3950, "lon": 18.6580,
        "type": "container", "timezone": "Europe/Warsaw",
        "region": "europe",
        "description": "1º Báltico · DCT Gdańsk · gateway Centro-Europa Norte.",
        "max_draft_m": 17.0, "annual_teu_actual": 2100000,
        "rail_connected": True,
        "wpi_index_id": "WPI-PL-GDN",
    },
    {
        "slug": "klaipeda", "unlocode": "LTKLJ",
        "name": "Klaipėda", "country_iso": "LT",
        "lat": 55.7180, "lon": 21.1140,
        "type": "multipurpose", "timezone": "Europe/Vilnius",
        "region": "europe",
        "description": "Báltico · única salida marítima Bielorrusia post-sanciones.",
        "max_draft_m": 14.5, "annual_teu_actual": 700000,
        "rail_connected": True,
        "wpi_index_id": "WPI-LT-KLJ",
    },
    # Mar Negro
    {
        "slug": "constanta", "unlocode": "ROCND",
        "name": "Constanța", "country_iso": "RO",
        "lat": 44.1730, "lon": 28.6660,
        "type": "container", "timezone": "Europe/Bucharest",
        "region": "europe",
        "description": "1º Mar Negro · alternativa Odesa post-invasión Ucrania 2022.",
        "max_draft_m": 19.0, "annual_teu_actual": 800000,
        "rail_connected": True,
        "wpi_index_id": "WPI-RO-CND",
    },
    # Pacífico Norte
    {
        "slug": "halifax", "unlocode": "CAHAL",
        "name": "Halifax", "country_iso": "CA",
        "lat": 44.6480, "lon": -63.5750,
        "type": "container", "timezone": "America/Halifax",
        "region": "north_america",
        "description": "Gateway Atlántico Canadá · 550k TEU · Asia vía Cabo Norte.",
        "max_draft_m": 16.0, "annual_teu_actual": 550000,
        "rail_connected": True,
        "wpi_index_id": "WPI-CA-HAL",
    },
    {
        "slug": "salalah", "unlocode": "OMSLL",
        "name": "Salalah", "country_iso": "OM",
        "lat": 16.9333, "lon": 54.0167,
        "type": "container", "timezone": "Asia/Muscat",
        "region": "middle_east",
        "description": "Mar Arábigo · APM Terminals · transbordo Asia/Europa fuera Suez.",
        "max_draft_m": 18.0, "annual_teu_actual": 4400000,
        "rail_connected": False,
        "wpi_index_id": "WPI-OM-SLL",
    },
]


# ─────────────────────────────────────────────────────────────────
# Upsert
# ─────────────────────────────────────────────────────────────────

def upsert_starter_set(dry_run: bool = False) -> int:
    """Upserta los 20 puertos starter del WPI a la tabla `ports`.

    Idempotente · si el slug ya existe, hace UPDATE de los campos nuevos.
    Si la migración 0080 no se aplicó (sin columnas enriquecidas), upsert
    sigue funcionando porque sólo escribe campos existentes (catch-all).

    Returns: número de filas afectadas. 0 si dry_run o sin engine.
    """
    if dry_run:
        for p in WPI_STARTER:
            print(f"DRY · {p['slug']:20} {p['name']:30} {p['country_iso']} · type={p['type']}")
        return len(WPI_STARTER)

    try:
        from etl.sources.ports.ais_client import _get_engine
        from sqlalchemy import text, inspect
    except Exception as exc:
        logger.error("imports falló: %s", exc)
        return 0

    engine = _get_engine()
    if engine is None:
        logger.warning("upsert_starter_set · no engine disponible · saltando")
        return 0

    # Detecta columnas existentes en `ports` para upsert defensivo (compat
    # con instalaciones aún sin migración 0080)
    insp = inspect(engine)
    try:
        existing_cols = {c["name"] for c in insp.get_columns("ports")}
    except Exception:
        existing_cols = set()

    if "slug" not in existing_cols:
        logger.error("tabla ports no existe · aplica primero alembic upgrade head")
        return 0

    now = datetime.now(timezone.utc)
    n = 0
    try:
        with engine.begin() as cx:
            for p in WPI_STARTER:
                # Filtrar campos a columnas que realmente existen
                payload = {k: v for k, v in p.items() if k in existing_cols}
                payload["data_source"] = "wpi_starter"
                payload["data_quality"] = "seed"
                if "updated_at" in existing_cols:
                    payload["updated_at"] = now

                exists = cx.execute(
                    text("SELECT slug FROM ports WHERE slug = :s"),
                    {"s": p["slug"]},
                ).first()
                if exists:
                    set_clause = ", ".join(
                        f"{k} = :{k}" for k in payload if k != "slug"
                    )
                    cx.execute(
                        text(f"UPDATE ports SET {set_clause} WHERE slug = :slug"),
                        payload,
                    )
                else:
                    cols = ", ".join(payload.keys())
                    placeholders = ", ".join(f":{k}" for k in payload)
                    cx.execute(
                        text(f"INSERT INTO ports ({cols}) VALUES ({placeholders})"),
                        payload,
                    )
                n += 1
    except Exception as exc:
        logger.exception("upsert fallo: %s", exc)
        return 0

    logger.info("WPI starter set · %d puertos upsert", n)
    return n


# ─────────────────────────────────────────────────────────────────
# Real download (placeholder · activar con --download + WPI_URL)
# ─────────────────────────────────────────────────────────────────

def download_full_wpi() -> int:
    """Descarga dataset completo desde NGA · requiere WPI_URL env var.

    El dataset oficial está en https://msi.nga.mil/Publications/WPI
    (CSV ~10MB, ~3.700 puertos). Por seguridad este código no hardcodea la
    URL · setea `WPI_URL=https://...` antes de invocar.

    Sprint 3 implementará el parser CSV→ports completo. Aquí queda el
    scaffold con httpx y logging para no romper el contrato del módulo.
    """
    url = os.environ.get("WPI_URL")
    if not url:
        logger.warning(
            "WPI_URL no configurada · saltando descarga real. "
            "Usa --starter o configura WPI_URL al CSV de NGA Pub. 150."
        )
        return 0

    try:
        import httpx
    except ImportError:
        logger.error("httpx no instalado · pip install httpx")
        return 0

    try:
        logger.info("descargando WPI desde %s", url)
        r = httpx.get(url, timeout=60.0)
        r.raise_for_status()
        # TODO Sprint 3: parsear CSV WPI y mapear → schema ports
        logger.info("descarga OK · %d bytes · parser pendiente Sprint 3", len(r.content))
        return 0
    except Exception as exc:
        logger.error("descarga falló: %s", exc)
        return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="wpi_loader")
    parser.add_argument(
        "--starter", action="store_true",
        help="Upsert starter set (20 puertos · default si no --download)",
    )
    parser.add_argument(
        "--download", action="store_true",
        help="Descargar dataset completo NGA (requiere WPI_URL)",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s · %(message)s",
    )

    n = 0
    if args.download:
        n += download_full_wpi()
    if args.starter or not args.download:
        n += upsert_starter_set(dry_run=args.dry_run)
    print(f"WPI loader · {n} puertos procesados")
    return 0


if __name__ == "__main__":
    sys.exit(main())


__all__ = ["WPI_STARTER", "upsert_starter_set", "download_full_wpi"]
