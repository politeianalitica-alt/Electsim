"""CRM Importer — Bloque 15. Importación de contactos y organizaciones desde CSV/Excel."""
from __future__ import annotations
import logging
from pathlib import Path
from typing import Any
from crm.schemas import Contact, Organization
logger = logging.getLogger(__name__)

CONTACT_FIELD_MAP = {
    "nombre": "full_name", "name": "full_name", "full_name": "full_name",
    "email": "email", "correo": "email",
    "telefono": "phone", "phone": "phone",
    "tipo": "contact_type", "type": "contact_type",
    "cargo": "role_title", "role": "role_title", "puesto": "role_title",
    "organizacion": "organization_id", "org": "organization_id",
    "territorio": "territory_id", "territory": "territory_id",
    "sector": "sectors", "sectores": "sectors",
    "tema": "topics", "temas": "topics",
    "url": "public_profile_url", "perfil": "public_profile_url",
    "pais": "country", "country": "country",
}

ORG_FIELD_MAP = {
    "nombre": "name", "name": "name",
    "tipo": "organization_type", "type": "organization_type",
    "web": "website", "website": "website",
    "sector": "sectors", "sectores": "sectors",
    "pais": "country", "country": "country",
    "territorio": "territory_id",
}

def import_contacts_csv(path: str, tenant_id: str, source: str = "import") -> dict:
    """Import contacts from a CSV file."""
    if not tenant_id:
        return {"error": "tenant_id is required"}
    try:
        import pandas as pd
        df = pd.read_csv(path)
        return _import_contacts_df(df, tenant_id, source)
    except Exception as exc:
        logger.error("import_contacts_csv error: %s", exc)
        return {"error": str(exc), "imported": 0}

def import_contacts_excel(path: str, tenant_id: str, source: str = "import") -> dict:
    """Import contacts from an Excel file."""
    if not tenant_id:
        return {"error": "tenant_id is required"}
    try:
        import pandas as pd
        df = pd.read_excel(path)
        return _import_contacts_df(df, tenant_id, source)
    except Exception as exc:
        logger.error("import_contacts_excel error: %s", exc)
        return {"error": str(exc), "imported": 0}

def import_organizations_csv(path: str, tenant_id: str, source: str = "import") -> dict:
    """Import organizations from CSV."""
    if not tenant_id:
        return {"error": "tenant_id is required"}
    try:
        import pandas as pd
        df = pd.read_csv(path)
        return _import_orgs_df(df, tenant_id, source)
    except Exception as exc:
        logger.error("import_organizations_csv error: %s", exc)
        return {"error": str(exc), "imported": 0}

def normalize_contact_row(row: dict, tenant_id: str = "default", source: str = "import") -> Contact | None:
    """Normalizes a raw row dict to a Contact."""
    normalized: dict[str, Any] = {"tenant_id": tenant_id, "source": source}
    for raw_key, value in row.items():
        mapped = CONTACT_FIELD_MAP.get(raw_key.lower().strip())
        if mapped and value and str(value).strip():
            if mapped in ("sectors", "topics"):
                normalized[mapped] = [v.strip() for v in str(value).split(",") if v.strip()]
            else:
                normalized[mapped] = str(value).strip()
    if not normalized.get("full_name"):
        return None
    try:
        return Contact(**normalized)
    except Exception as exc:
        logger.debug("normalize_contact_row error: %s | row: %s", exc, row)
        return None

def deduplicate_contacts(contacts: list[Contact]) -> dict:
    """Deduplicates a list of contacts by email and profile URL."""
    from crm.contacts import deduplicate_contact_candidates
    return deduplicate_contact_candidates(contacts)

def _import_contacts_df(df: Any, tenant_id: str, source: str) -> dict:
    from crm.contacts import create_contact, deduplicate_contact_candidates
    contacts = []
    errors = []
    for _, row in df.iterrows():
        contact = normalize_contact_row(row.to_dict(), tenant_id, source)
        if contact:
            contacts.append(contact)
        else:
            errors.append(str(row.get("nombre") or row.get("name") or "unknown"))
    dedup = deduplicate_contact_candidates(contacts)
    imported = 0
    for c in dedup["unique"]:
        create_contact(c)
        imported += 1
    return {
        "imported": imported,
        "duplicates_skipped": len(dedup["duplicates"]),
        "errors": len(errors),
        "total_rows": len(df),
    }

def _import_orgs_df(df: Any, tenant_id: str, source: str) -> dict:
    from crm.organizations import create_organization
    imported = 0
    errors = []
    for _, row in df.iterrows():
        try:
            d = {ORG_FIELD_MAP.get(k.lower().strip(), k): v for k, v in row.to_dict().items() if v and str(v).strip()}
            d["tenant_id"] = tenant_id
            d["source"] = source
            if "name" not in d: continue
            if "sectors" in d and isinstance(d["sectors"], str):
                d["sectors"] = [s.strip() for s in d["sectors"].split(",")]
            org = Organization(**{k: v for k, v in d.items() if k in Organization.model_fields})
            create_organization(org)
            imported += 1
        except Exception as exc:
            errors.append(str(exc))
    return {"imported": imported, "errors": len(errors), "total_rows": len(df)}
