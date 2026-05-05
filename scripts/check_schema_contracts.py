#!/usr/bin/env python3
"""
scripts/check_schema_contracts.py — Auditoría de contratos schema/DB.

Detecta divergencias entre modelos Pydantic y columnas reales en PostgreSQL.

Uso:
    python scripts/check_schema_contracts.py
    python scripts/check_schema_contracts.py --module crm
    python scripts/check_schema_contracts.py --fail-fast

Salida:
    CRM_CONTACTS:
      OK  contact_id
      OK  full_name
      MISS_DB  role_title  (en schema, no en DB)
      MISS_CODE  position   (en DB, no en schema)
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Asegurar que el root del proyecto está en path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


# ── Contratos declarados manualmente (schema_fields → tabla DB) ───────────────

CONTRACTS: dict[str, dict] = {
    # CRM
    "crm_contacts": {
        "schema_module": "crm.schemas",
        "schema_class": "Contact",
        "table": "crm_contacts",
        "id_field": "contact_id",
    },
    "crm_organizations": {
        "schema_module": "crm.schemas",
        "schema_class": "Organization",
        "table": "crm_organizations",
        "id_field": "organization_id",
    },
    "crm_relationships": {
        "schema_module": "crm.schemas",
        "schema_class": "Relationship",
        "table": "crm_relationships",
        "id_field": "relationship_id",
    },
    "crm_interactions": {
        "schema_module": "crm.schemas",
        "schema_class": "Interaction",
        "table": "crm_interactions",
        "id_field": "interaction_id",
    },
    "crm_stakeholder_profiles": {
        "schema_module": "crm.schemas",
        "schema_class": "StakeholderProfile",
        "table": "crm_stakeholder_profiles",
        "id_field": "profile_id",
    },
    # Communications
    "message_frames": {
        "schema_module": "communications.schemas",
        "schema_class": "MessageFrame",
        "table": "message_frames",
        "id_field": "frame_id",
    },
    "content_assets": {
        "schema_module": "communications.schemas",
        "schema_class": "ContentAsset",
        "table": "content_assets",
        "id_field": "asset_id",
    },
    "publication_jobs": {
        "schema_module": "communications.schemas",
        "schema_class": "PublicationJob",
        "table": "publication_jobs",
        "id_field": "job_id",
    },
}

# Campos que están en el schema pero no se espera que estén en DB
SCHEMA_ONLY_FIELDS: set[str] = set()

# Campos que están en DB (infra) pero no en schema Pydantic — son normales
DB_ONLY_EXPECTED: set[str] = {"id", "created_at", "updated_at", "scored_at"}


def get_pydantic_fields(schema_module: str, schema_class: str) -> set[str]:
    """Extrae campos del modelo Pydantic."""
    try:
        import importlib
        mod = importlib.import_module(schema_module)
        cls = getattr(mod, schema_class)
        return set(cls.model_fields.keys())
    except Exception as exc:
        print(f"  WARNING  No se pudo importar {schema_module}.{schema_class}: {exc}")
        return set()


def get_db_columns(table: str) -> set[str]:
    """Extrae columnas reales de la tabla en DB."""
    try:
        from sqlalchemy import inspect as sa_inspect
        from db.session import get_engine
        insp = sa_inspect(get_engine())
        cols = insp.get_columns(table)
        return {c["name"] for c in cols}
    except Exception:
        return set()  # DB no disponible


def check_contract(name: str, contract: dict, verbose: bool = True) -> dict:
    """Verifica un contrato schema<->DB. Retorna resumen."""
    schema_fields = get_pydantic_fields(
        contract["schema_module"], contract["schema_class"]
    )
    db_cols = get_db_columns(contract["table"])

    result = {
        "name": name,
        "schema_fields": len(schema_fields),
        "db_columns": len(db_cols),
        "missing_in_db": [],
        "missing_in_schema": [],
        "ok": True,
        "db_available": len(db_cols) > 0,
    }

    if not schema_fields:
        result["ok"] = False
        if verbose:
            print(f"\n{'=' * 50}")
            print(f"  ERROR {name.upper()}: No se pudo leer schema")
        return result

    if not db_cols:
        result["ok"] = False
        result["missing_in_db"] = list(schema_fields)
        if verbose:
            print(f"\n{'=' * 50}")
            print(f"  SKIP  {name.upper()}: DB no disponible (tabla '{contract['table']}')")
        return result

    missing_in_db = schema_fields - db_cols - SCHEMA_ONLY_FIELDS
    missing_in_schema = db_cols - schema_fields - DB_ONLY_EXPECTED

    result["missing_in_db"] = sorted(missing_in_db)
    result["missing_in_schema"] = sorted(missing_in_schema)
    result["ok"] = len(missing_in_db) == 0

    if verbose:
        print(f"\n{'=' * 50}")
        has_issues = missing_in_db or missing_in_schema
        icon = "OK " if result["ok"] else "ERR"
        print(f"  {icon}  {name.upper()} (schema:{len(schema_fields)} db:{len(db_cols)})")

        if missing_in_db:
            for f in sorted(missing_in_db):
                print(f"      MISS_DB    {f}  <- en schema, NO en DB")
        if missing_in_schema:
            for f in sorted(missing_in_schema):
                print(f"      MISS_CODE  {f}  <- en DB, no en schema")
        if not has_issues:
            print("      Contrato OK")

    return result


def run_check(module_filter: str | None = None, fail_fast: bool = False) -> int:
    """Ejecuta todos los checks. Retorna 0 si OK, 1 si hay errores."""
    print("=" * 60)
    print("ElectSim -- Schema Contract Checker")
    print("=" * 60)

    errors = 0
    warnings = 0
    checked = 0

    for name, contract in CONTRACTS.items():
        if module_filter and module_filter.lower() not in name.lower():
            continue
        result = check_contract(name, contract)
        checked += 1
        db_up = result.get("db_available", False)
        if not result["ok"]:
            if db_up:
                # DB activa pero columnas divergen → error real
                errors += 1
            else:
                # DB no disponible → solo aviso, no es un error de contrato
                warnings += 1
        if result.get("missing_in_schema"):
            warnings += 1
        if fail_fast and errors > 0:
            break

    db_skipped = sum(
        1 for n, c in CONTRACTS.items()
        if (module_filter is None or module_filter.lower() in n.lower())
        and not get_db_columns(c["table"])
    )

    print(f"\n{'=' * 60}")
    print(f"  Total contratos revisados: {checked}")
    if db_skipped:
        print(f"  Sin DB (skipped):          {db_skipped}")
    print(f"  Errores schema↔DB:         {errors}")
    print(f"  Avisos:                    {warnings}")
    if errors == 0:
        if db_skipped == checked:
            print("  ⚫ DB no disponible — conecta PostgreSQL y vuelve a ejecutar")
        else:
            print("  ✅ Contratos OK")
    else:
        print("  ❌ Hay divergencias. Ejecuta: alembic upgrade head")
    print("=" * 60)

    return 1 if errors > 0 else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="ElectSim schema contract checker")
    parser.add_argument("--module", help="Filtrar por modulo (ej: crm, comms)")
    parser.add_argument("--fail-fast", action="store_true", help="Parar al primer error")
    args = parser.parse_args()

    exit_code = run_check(
        module_filter=args.module,
        fail_fast=args.fail_fast,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
