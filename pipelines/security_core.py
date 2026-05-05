"""
Security Core Pipeline — Bloque 13.

CLI para operaciones de seguridad:
  --seed-roles         : Crear roles del sistema en DB
  --seed-default-tenant: Crear tenant por defecto
  --create-admin       : Crear usuario administrador
  --check-secrets      : Verificar estado de secretos
  --deployment-checks  : Ejecutar checks de seguridad
  --audit-summary      : Resumen de auditoría
  --source all         : Ejecutar todo

Uso:
  python pipelines/security_core.py --deployment-checks
  python pipelines/security_core.py --seed-roles --seed-default-tenant
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("security_core_pipeline")


def cmd_seed_roles() -> int:
    """Crea los roles del sistema en la base de datos."""
    print("🛡️  Seeding roles del sistema...")
    try:
        from security.rbac import SYSTEM_ROLES
        from db.connection import get_db_connection
        import json as _json

        conn = get_db_connection()
        if conn is None:
            print("⚠️  Sin conexión DB — roles en memoria únicamente")
            print(f"   Roles disponibles: {list(SYSTEM_ROLES.keys())}")
            return 0

        cursor = conn.cursor()
        created = 0
        for role_id, role_data in SYSTEM_ROLES.items():
            try:
                cursor.execute(
                    "INSERT INTO roles (id, nombre, permissions, description, is_system) "
                    "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (
                        role_id,
                        role_data["nombre"],
                        _json.dumps(role_data.get("permissions", [])),
                        role_data.get("description", ""),
                        True,
                    ),
                )
                created += 1
            except Exception as e:
                print(f"   ⚠️ Error creando rol {role_id}: {e}")
        conn.commit()
        print(f"   ✅ {created} roles creados/verificados en DB")
        return 0
    except Exception as exc:
        print(f"   ❌ Error: {exc}")
        return 1


def cmd_seed_default_tenant() -> int:
    """Crea el tenant por defecto."""
    print("🏢  Seeding tenant por defecto...")
    try:
        from security.settings import settings
        from security.tenants import create_tenant, get_tenant

        tenant_id = settings.default_tenant_id
        existing = get_tenant(tenant_id)
        if existing and existing.get("id") == tenant_id:
            print(f"   ℹ️  Tenant '{tenant_id}' ya existe")
            return 0

        tenant = create_tenant(
            nombre=settings.default_tenant_name,
            slug=tenant_id,
            plan="enterprise",
            max_users=999,
            features=["all"],
        )
        if tenant:
            print(f"   ✅ Tenant creado: {tenant['nombre']} (id={tenant['id']})")
        else:
            print("   ⚠️  Tenant creado en memoria (sin DB)")
        return 0
    except Exception as exc:
        print(f"   ❌ Error: {exc}")
        return 1


def cmd_create_admin(email: str | None = None, password: str | None = None) -> int:
    """Crea el usuario administrador inicial."""
    print("👤  Creando usuario administrador...")
    try:
        from security.settings import settings

        admin_email = email or settings.admin_email
        if not admin_email:
            admin_email = input("   Email del admin: ").strip()
        if not admin_email:
            print("   ❌ Email requerido")
            return 1

        if not password:
            import getpass
            password = getpass.getpass("   Contraseña (mínimo 8 chars): ")

        from security.password import hash_password, is_strong_password
        strong, issues = is_strong_password(password)
        if not strong:
            print(f"   ⚠️  Contraseña débil: {', '.join(issues)}")
            confirm = input("   ¿Continuar? (s/N): ").lower()
            if confirm != "s":
                return 1

        password_hash = hash_password(password)

        try:
            import uuid
            from db.connection import get_db_connection
            conn = get_db_connection()
            if conn is None:
                print("   ⚠️  Sin DB — usuario creado solo en memoria")
                return 0

            user_id = f"admin-{uuid.uuid4().hex[:8]}"
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (id, email, nombre, password_hash, tenant_id, "
                "activo, is_superadmin) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash",
                (
                    user_id, admin_email, "Admin",
                    password_hash, settings.default_tenant_id,
                    True, True,
                ),
            )
            # Asignar rol super_admin
            cursor.execute(
                "INSERT INTO user_roles (user_id, role_id, tenant_id) "
                "VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (user_id, "super_admin", settings.default_tenant_id),
            )
            conn.commit()
            print(f"   ✅ Admin creado: {admin_email}")
            return 0
        except Exception as db_exc:
            print(f"   ⚠️  Error DB: {db_exc} — verifica que las tablas existan")
            return 1

    except Exception as exc:
        print(f"   ❌ Error: {exc}")
        return 1


def cmd_check_secrets() -> int:
    """Verifica el estado de todos los secretos."""
    print("🔑  Verificando secretos de configuración...")
    try:
        from security.secrets import check_all_secrets, get_secrets_summary

        secrets = check_all_secrets()
        summary = get_secrets_summary()

        print(f"\n   Estado: {summary['health'].upper()}")
        print(f"   Total: {summary['total']} | Presentes: {summary['present']} | "
              f"Faltantes req.: {summary['missing_required']}")

        if summary["missing_required"] > 0:
            print("\n   ❌ SECRETOS REQUERIDOS FALTANTES:")
            for s in secrets:
                if s.get("required") and s.get("status") != "present":
                    print(f"      • {s['key']} [{s['status']}] — {s.get('hint', '')}")

        if summary["placeholder"] > 0:
            print("\n   ⚠️  CON PLACEHOLDER:")
            for s in secrets:
                if s.get("status") == "placeholder":
                    print(f"      • {s['key']}")

        print()
        return 0 if summary["health"] in ("ok", "warning") else 1

    except Exception as exc:
        print(f"   ❌ Error: {exc}")
        return 1


def cmd_deployment_checks() -> int:
    """Ejecuta los checks de seguridad del despliegue."""
    print("🚀  Ejecutando deployment checks...")
    try:
        from security.deployment_checks import run_all_checks, get_security_score

        checks = run_all_checks()
        score = get_security_score(checks)

        print(f"\n   Score: {score['score']}/100 — {score['health'].upper()}")
        print(f"   Pasados: {score['passed']} | Fallidos: {score['failed']} | "
              f"Críticos: {score['critical_failures']}\n")

        severity_order = ["critical", "high", "medium", "low", "info"]
        for sev in severity_order:
            sev_checks = [c for c in checks if c.get("severity") == sev and not c["passed"]]
            if sev_checks:
                icon = {"critical": "🚨", "high": "❌", "medium": "⚠️", "low": "ℹ️", "info": "•"}.get(sev, "•")
                print(f"   {icon} {sev.upper()}:")
                for c in sev_checks:
                    print(f"      [{c['category']}] {c['name']}: {c['message']}")
                    if c.get("recommendation"):
                        print(f"        → {c['recommendation']}")
        print()
        return 0 if score["critical_failures"] == 0 else 1

    except Exception as exc:
        print(f"   ❌ Error: {exc}")
        return 1


def cmd_audit_summary(days: int = 7) -> int:
    """Muestra el resumen de auditoría."""
    print(f"🕵️  Resumen de auditoría ({days} días)...")
    try:
        from security.audit import get_audit_summary

        summary = get_audit_summary(days=days)
        print(f"\n   Total eventos: {summary['total_events']}")
        print(f"   Denegados: {summary['denied_events']}")
        print(f"   Errores: {summary['error_events']}")
        print(f"   Alto riesgo: {summary['high_risk_events']}")

        if summary.get("event_types"):
            print("\n   Por tipo:")
            for etype, count in sorted(
                summary["event_types"].items(), key=lambda x: -x[1]
            )[:10]:
                print(f"      {etype}: {count}")
        print()
        return 0
    except Exception as exc:
        print(f"   ❌ Error: {exc}")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Security Core Pipeline — ElectSim Bloque 13",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--seed-roles", action="store_true", help="Crear roles del sistema en DB")
    parser.add_argument("--seed-default-tenant", action="store_true", help="Crear tenant por defecto")
    parser.add_argument("--create-admin", action="store_true", help="Crear usuario admin")
    parser.add_argument("--admin-email", type=str, help="Email del admin (para --create-admin)")
    parser.add_argument("--check-secrets", action="store_true", help="Verificar secretos")
    parser.add_argument("--deployment-checks", action="store_true", help="Checks de seguridad")
    parser.add_argument("--audit-summary", action="store_true", help="Resumen de auditoría")
    parser.add_argument("--days", type=int, default=7, help="Días para audit summary (default: 7)")
    parser.add_argument("--source", type=str, help="'all' para ejecutar todo")
    parser.add_argument("--json", action="store_true", help="Salida en JSON")

    args = parser.parse_args()

    run_all = args.source == "all"
    exit_code = 0

    print("\n" + "=" * 60)
    print("  🔒 Security Core Pipeline — ElectSim Bloque 13")
    print("=" * 60 + "\n")

    if run_all or args.seed_roles:
        exit_code |= cmd_seed_roles()

    if run_all or args.seed_default_tenant:
        exit_code |= cmd_seed_default_tenant()

    if run_all or args.create_admin:
        exit_code |= cmd_create_admin(email=args.admin_email)

    if run_all or args.check_secrets:
        exit_code |= cmd_check_secrets()

    if run_all or args.deployment_checks:
        exit_code |= cmd_deployment_checks()

    if run_all or args.audit_summary:
        exit_code |= cmd_audit_summary(days=args.days)

    if not any([
        run_all, args.seed_roles, args.seed_default_tenant,
        args.create_admin, args.check_secrets,
        args.deployment_checks, args.audit_summary,
    ]):
        parser.print_help()
        return 0

    print("=" * 60)
    print(f"  {'✅ Pipeline completado' if exit_code == 0 else '❌ Pipeline con errores'}")
    print("=" * 60 + "\n")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
