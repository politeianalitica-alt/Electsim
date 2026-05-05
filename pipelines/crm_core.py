"""
CRM Core Pipeline — Bloque 15.

CLI para operaciones de CRM: importar, puntuar, detectar seguimientos, exportar.

Uso:
    python pipelines/crm_core.py --score-stakeholders
    python pipelines/crm_core.py --detect-followups
    python pipelines/crm_core.py --recommend-actions
    python pipelines/crm_core.py --import-contacts path/to/file.csv
    python pipelines/crm_core.py --source all
"""
from __future__ import annotations

import argparse
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def cmd_score_stakeholders(tenant_id: str) -> None:
    """Recalcula scores de prioridad para todos los contactos."""
    try:
        from crm.contacts import search_contacts
        from crm.stakeholders import compute_stakeholder_profile

        contacts = search_contacts(tenant_id=tenant_id, limit=9999)
        updated = 0
        for c in contacts:
            try:
                compute_stakeholder_profile("contact", c.contact_id, tenant_id=tenant_id)
                updated += 1
            except Exception as exc:
                logger.debug("Score error %s: %s", c.contact_id, exc)

        logger.info("✅ Scored %d contactos", updated)
    except Exception as exc:
        logger.error("score-stakeholders: %s", exc)
        sys.exit(1)


def cmd_detect_followups(tenant_id: str) -> None:
    """Detecta tareas vencidas y relaciones estancadas."""
    try:
        from crm.tasks import detect_overdue_tasks
        from crm.crm_recommender import detect_stale_relationships

        overdue = detect_overdue_tasks(tenant_id=tenant_id)
        stale = detect_stale_relationships(tenant_id=tenant_id)

        logger.info("⚠️  Tareas vencidas: %d", len(overdue))
        for t in overdue[:10]:
            logger.info("  - %s (due: %s)", t.title, t.due_date)

        logger.info("💤 Relaciones estancadas: %d", len(stale))
        for c in stale[:10]:
            logger.info("  - %s (%s)", getattr(c, "full_name", "—"), getattr(c, "contact_id", "—"))
    except Exception as exc:
        logger.error("detect-followups: %s", exc)
        sys.exit(1)


def cmd_recommend_actions(tenant_id: str) -> None:
    """Genera acciones de outreach para todos los contactos activos."""
    try:
        from crm.crm_recommender import recommend_actions_for_all_contacts

        results = recommend_actions_for_all_contacts(tenant_id=tenant_id)
        total_tasks = sum(r.get("tasks_created", 0) for r in results.values())
        logger.info("✅ Acciones generadas para %d contactos → %d tareas nuevas", len(results), total_tasks)
    except Exception as exc:
        logger.error("recommend-actions: %s", exc)
        sys.exit(1)


def cmd_import_contacts(file_path: str, tenant_id: str) -> None:
    """Importa contactos desde un CSV o Excel."""
    try:
        if file_path.endswith(".csv"):
            from crm.crm_importer import import_contacts_csv
            result = import_contacts_csv(file_path, tenant_id=tenant_id)
        elif file_path.endswith((".xlsx", ".xls")):
            from crm.crm_importer import import_contacts_excel
            result = import_contacts_excel(file_path, tenant_id=tenant_id)
        else:
            logger.error("Formato no soportado: %s (usa .csv o .xlsx)", file_path)
            sys.exit(1)

        logger.info("✅ Importados: %d | Duplicados: %d | Errores: %d",
                    result.get("imported", 0), result.get("duplicates", 0), result.get("errors", 0))
    except Exception as exc:
        logger.error("import-contacts: %s", exc)
        sys.exit(1)


def cmd_import_organizations(file_path: str, tenant_id: str) -> None:
    """Importa organizaciones desde un CSV."""
    try:
        from crm.crm_importer import import_organizations_csv
        result = import_organizations_csv(file_path, tenant_id=tenant_id)
        logger.info("✅ Organizaciones importadas: %d | Errores: %d",
                    result.get("imported", 0), result.get("errors", 0))
    except Exception as exc:
        logger.error("import-organizations: %s", exc)
        sys.exit(1)


def cmd_export_contacts(output: str, tenant_id: str) -> None:
    """Exporta contactos a CSV."""
    try:
        from crm.contacts import search_contacts
        from crm.crm_exporter import export_contacts_csv

        contacts = search_contacts(tenant_id=tenant_id, limit=9999)
        export_contacts_csv(contacts, output)
        logger.info("✅ Exportados %d contactos → %s", len(contacts), output)
    except Exception as exc:
        logger.error("export-contacts: %s", exc)
        sys.exit(1)


def cmd_full_pipeline(tenant_id: str) -> None:
    """Ejecuta el pipeline CRM completo."""
    try:
        from crm.crm_monitor import run_full_crm_pipeline
        result = run_full_crm_pipeline(tenant_id=tenant_id)
        logger.info("✅ Pipeline CRM completo:")
        logger.info("   Contactos: %d | Stakeholders: %d | Tareas: %d | Alertas: %d",
                    result.contacts_loaded, result.stakeholders_scored,
                    result.tasks_created, result.alerts_generated)
    except Exception as exc:
        logger.error("full-pipeline: %s", exc)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="ElectSim CRM Core Pipeline")
    parser.add_argument("--tenant", default="default", help="Tenant ID")
    parser.add_argument("--score-stakeholders", action="store_true", help="Recalcular scores de prioridad")
    parser.add_argument("--detect-followups", action="store_true", help="Detectar tareas vencidas y relaciones estancadas")
    parser.add_argument("--recommend-actions", action="store_true", help="Generar acciones de outreach")
    parser.add_argument("--import-contacts", metavar="FILE", help="Importar contactos desde CSV/Excel")
    parser.add_argument("--import-organizations", metavar="FILE", help="Importar organizaciones desde CSV")
    parser.add_argument("--export-contacts", metavar="OUTPUT", help="Exportar contactos a CSV")
    parser.add_argument("--source", choices=["all"], help="Ejecutar pipeline completo")

    args = parser.parse_args()
    tenant = args.tenant

    if not any([
        args.score_stakeholders, args.detect_followups, args.recommend_actions,
        args.import_contacts, args.import_organizations, args.export_contacts, args.source,
    ]):
        parser.print_help()
        sys.exit(0)

    if args.source == "all" or args.score_stakeholders:
        cmd_score_stakeholders(tenant)

    if args.detect_followups:
        cmd_detect_followups(tenant)

    if args.recommend_actions:
        cmd_recommend_actions(tenant)

    if args.import_contacts:
        cmd_import_contacts(args.import_contacts, tenant)

    if args.import_organizations:
        cmd_import_organizations(args.import_organizations, tenant)

    if args.export_contacts:
        cmd_export_contacts(args.export_contacts, tenant)

    if args.source == "all":
        cmd_full_pipeline(tenant)


if __name__ == "__main__":
    main()
