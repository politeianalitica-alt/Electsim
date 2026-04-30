"""
TenantProvisioningService — Bloque 5 + Bloque 6.

Crea y configura una organizacion completa (org + plan + workspace + miembros
+ modulos + alertas + saved searches) en una sola transaccion atomica.

Conecta con:
  - config.market_loader.load_market_config()    -> valida market_code
  - config.product_loader.load_product_config()  -> carga YAML de producto
  - db.models (Organisation, Plan, Workspace, WorkspaceModule, ...)
  - tabla role (debe estar pre-sembrada por migration 0025)

Uso:
    from db.session import get_session
    from services.tenant_provisioning import TenantProvisioningService

    with get_session() as session:
        svc = TenantProvisioningService(session)
        org = svc.create_organisation_with_product(
            org_name="Consultora Demo",
            org_slug="consultora-demo",
            market_code="spain",
            plan_code="pro",
            admin_auth_subject="auth0|abc123",
            admin_email="admin@demo.com",
            product_code="war_room_electoral_spain",
        )
"""
from __future__ import annotations

import re
import uuid
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from db.models import (
    Organisation,
    OrganisationMember,
    Plan,
    Role,
    Subscription,
    UserAccount,
    Workspace,
    WorkspaceAlertConfig,
    WorkspaceMember,
    WorkspaceModule,
    WorkspaceSavedSearch,
)


# ---------------------------------------------------------------------------
# Excepciones
# ---------------------------------------------------------------------------

class ProvisioningError(Exception):
    """Error durante el aprovisionamiento de un tenant."""


class PlanNotFoundError(ProvisioningError):
    """El plan solicitado no existe en la tabla plan."""


class RoleNotFoundError(ProvisioningError):
    """El rol solicitado no existe en la tabla role."""


class SlugAlreadyExistsError(ProvisioningError):
    """El slug de organizacion ya esta en uso."""


class ProductMarketMismatchError(ProvisioningError):
    """El producto no es compatible con el mercado de la organizacion."""


# ---------------------------------------------------------------------------
# Validacion de slug
# ---------------------------------------------------------------------------

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _validate_slug(slug: str) -> str:
    if not _SLUG_RE.match(slug):
        raise ProvisioningError(
            f"Slug invalido: {slug!r}. Solo minusculas, digitos y guiones."
        )
    return slug


# ---------------------------------------------------------------------------
# Servicio principal
# ---------------------------------------------------------------------------

class TenantProvisioningService:
    """
    Crea y configura organizaciones, workspaces, miembros y modulos.

    Todos los metodos ejecutan dentro de la sesion inyectada.
    El llamador es responsable del commit/rollback (patron Unit of Work).
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # API publica — producto base
    # ------------------------------------------------------------------

    def create_organisation_with_product(
        self,
        *,
        org_name: str,
        org_slug: str,
        market_code: str,
        plan_code: str,
        admin_auth_subject: str,
        admin_email: str,
        admin_full_name: Optional[str] = None,
        product_code: str,
        workspace_name: Optional[str] = None,
        workspace_client_profile: Optional[Dict[str, Any]] = None,
    ) -> Organisation:
        """
        Aprovisiona un tenant completo desde un ProductConfig YAML:
          1. Valida slug, market_code y producto
          2. Crea Organisation + Subscription
          3. Crea o recupera UserAccount del admin
          4. Crea Workspace con perfil del producto
          5. Asigna admin como ORG_ADMIN + ANALYST_SENIOR
          6. Activa modulos, alertas y saved searches del producto

        Returns:
            Organisation recien creada (antes del commit).

        Raises:
            ProvisioningError, SlugAlreadyExistsError, PlanNotFoundError,
            ProductMarketMismatchError.
        """
        from config.product_loader import load_product_config

        _validate_slug(org_slug)
        self._assert_slug_free(org_slug)

        product = load_product_config(product_code)
        market_config = self._load_market(market_code)

        if product.market != market_config.code and product.market != "eu":
            raise ProductMarketMismatchError(
                f"Producto '{product_code}' (market={product.market!r}) "
                f"no compatible con mercado '{market_config.code!r}'"
            )
        if product.is_dlc:
            raise ProvisioningError(
                f"'{product_code}' es un DLC y no puede usarse como producto base. "
                "Usa apply_dlc_to_workspace() en su lugar."
            )

        plan = self._get_plan(plan_code)
        org = self._create_org(org_name, org_slug, market_config.code, plan)
        sub = self._create_subscription(org, plan)
        self._session.add(sub)

        admin = self._get_or_create_user(admin_auth_subject, admin_email, admin_full_name)

        ws_name = workspace_name or (
            product.default_workspace.name if product.default_workspace else product.name
        )
        ws_profile = workspace_client_profile or (
            product.default_workspace.client_profile if product.default_workspace else {}
        )
        ws = self._create_workspace(org, ws_name, ws_profile)

        org_admin_role = self._get_role("ORG_ADMIN")
        ws_role = self._get_role("ANALYST_SENIOR")

        self._session.add(OrganisationMember(
            organisation_id=org.id,
            user_id=admin.id,
            role_id=org_admin_role.id,
        ))
        self._session.add(WorkspaceMember(
            workspace_id=ws.id,
            user_id=admin.id,
            role_id=ws_role.id,
        ))

        self._apply_product_to_workspace(ws, org, product)

        self._session.flush()
        return org

    # ------------------------------------------------------------------
    def create_organisation_with_workspace(
        self,
        *,
        org_name: str,
        org_slug: str,
        market_code: str,
        plan_code: str,
        admin_auth_subject: str,
        admin_email: str,
        admin_full_name: Optional[str] = None,
        product_code: str = "regulatory_radar_spain",
        workspace_name: Optional[str] = None,
        workspace_client_profile: Optional[Dict[str, Any]] = None,
    ) -> Organisation:
        """Alias de create_organisation_with_product para compatibilidad."""
        return self.create_organisation_with_product(
            org_name=org_name,
            org_slug=org_slug,
            market_code=market_code,
            plan_code=plan_code,
            admin_auth_subject=admin_auth_subject,
            admin_email=admin_email,
            admin_full_name=admin_full_name,
            product_code=product_code,
            workspace_name=workspace_name,
            workspace_client_profile=workspace_client_profile,
        )

    # ------------------------------------------------------------------
    # API publica — DLC
    # ------------------------------------------------------------------

    def apply_dlc_to_workspace(
        self,
        *,
        workspace_id: uuid.UUID,
        organisation_id: uuid.UUID,
        market_code: str,
        dlc_code: str,
    ) -> None:
        """
        Aplica un DLC a un workspace existente:
          - Valida que el DLC sea compatible con el mercado de la org
          - Activa modulos, alertas y saved searches adicionales
          - Usa INSERT ... ON CONFLICT DO NOTHING para ser idempotente

        Raises:
            ProvisioningError: si el codigo no es un DLC o hay incompatibilidad.
        """
        from config.product_loader import load_product_config

        dlc = load_product_config(dlc_code)
        if not dlc.is_dlc:
            raise ProvisioningError(
                f"'{dlc_code}' no es un DLC. Solo se pueden aplicar DLCs a workspaces existentes."
            )

        market_config = self._load_market(market_code)
        if dlc.market != market_config.code and dlc.market != "eu":
            raise ProductMarketMismatchError(
                f"DLC '{dlc_code}' (market={dlc.market!r}) no compatible con "
                f"mercado '{market_config.code!r}'"
            )

        ws = MagicWorkspace(id=workspace_id, organisation_id=organisation_id)
        self._apply_product_to_workspace(ws, MagicOrg(id=organisation_id), dlc)
        self._session.flush()

    def add_member_to_workspace(
        self,
        *,
        workspace_id: uuid.UUID,
        auth_subject: str,
        email: str,
        role_code: str,
        full_name: Optional[str] = None,
    ) -> WorkspaceMember:
        """Agrega un usuario existente o nuevo a un workspace."""
        role = self._get_role(role_code)
        user = self._get_or_create_user(auth_subject, email, full_name)
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user.id,
            role_id=role.id,
        )
        self._session.add(member)
        self._session.flush()
        return member

    def deactivate_organisation(self, org_id: uuid.UUID) -> None:
        """Desactiva una organizacion y sus suscripciones activas."""
        org = self._session.get(Organisation, org_id)
        if org is None:
            raise ProvisioningError(f"Organizacion {org_id} no encontrada")
        org.is_active = False
        for sub in org.subscriptions:
            if sub.is_active:
                sub.is_active = False
        self._session.flush()

    def get_active_modules(
        self,
        *,
        workspace_id: uuid.UUID,
        organisation_id: uuid.UUID,
    ) -> list[str]:
        """Devuelve los codigos de modulos activos para un workspace."""
        rows = self._session.execute(
            text("""
                SELECT module_code FROM workspace_module
                WHERE workspace_id = :ws AND organisation_id = :org AND enabled = true
                ORDER BY module_code
            """),
            {"ws": str(workspace_id), "org": str(organisation_id)},
        ).fetchall()
        return [r[0] for r in rows]

    # ------------------------------------------------------------------
    # Metodos privados — logica de provisioning
    # ------------------------------------------------------------------

    def _apply_product_to_workspace(self, ws, org, product) -> None:
        """Activa modulos, alertas y saved searches del producto en el workspace."""
        for module_code in product.modules:
            self._session.add(WorkspaceModule(
                organisation_id=org.id,
                workspace_id=ws.id,
                module_code=module_code,
                enabled=True,
                source_product=product.code,
            ))

        for alert in product.alerts:
            self._session.add(WorkspaceAlertConfig(
                workspace_id=ws.id,
                organisation_id=org.id,
                alert_code=alert.code,
                alert_name=alert.name,
                enabled=alert.enabled,
                level=alert.level,
                channels=alert.channels,
                conditions=alert.conditions.model_dump(),
                source_product=product.code,
            ))

        for search in product.saved_searches:
            self._session.add(WorkspaceSavedSearch(
                workspace_id=ws.id,
                organisation_id=org.id,
                search_code=search.code,
                search_name=search.name,
                search_type=search.type,
                semantic_query=search.semantic_query,
                watchlist_config=search.watchlist_objects,
                source_product=product.code,
            ))

    # ------------------------------------------------------------------
    # Metodos privados — helpers de BD
    # ------------------------------------------------------------------

    def _load_market(self, market_code: str):
        try:
            from config.market_loader import load_market_config
            return load_market_config(market_code)
        except Exception as exc:
            raise ProvisioningError(
                f"Mercado '{market_code}' no disponible: {exc}"
            ) from exc

    def _assert_slug_free(self, slug: str) -> None:
        existing = self._session.execute(
            text("SELECT id FROM organisation WHERE slug = :s LIMIT 1"),
            {"s": slug},
        ).fetchone()
        if existing:
            raise SlugAlreadyExistsError(f"Slug '{slug}' ya esta en uso")

    def _get_plan(self, plan_code: str) -> Plan:
        row = self._session.execute(
            text("SELECT * FROM plan WHERE code = :c LIMIT 1"),
            {"c": plan_code},
        ).mappings().fetchone()
        if row is None:
            raise PlanNotFoundError(f"Plan '{plan_code}' no encontrado")
        obj = self._session.get(Plan, row["id"])
        return obj or self._row_to_plan(row)

    def _row_to_plan(self, row):
        import types as _types
        return _types.SimpleNamespace(**{k: v for k, v in row.items()})

    def _get_role(self, code: str):
        """
        Retorna el rol con el codigo dado.
        Si la sesion tiene el objeto en su identitymap lo devuelve;
        si no, crea un simple namespace con los atributos necesarios
        (solo necesitamos .id para las FK de OrganisationMember y WorkspaceMember).
        """
        import types as _types
        row = self._session.execute(
            text("SELECT * FROM role WHERE code = :c LIMIT 1"),
            {"c": code},
        ).mappings().fetchone()
        if row is None:
            raise RoleNotFoundError(f"Rol '{code}' no encontrado")
        obj = self._session.get(Role, row["id"])
        if obj is not None:
            return obj
        # Proxy ligero para no depender de instrumentacion SQLAlchemy
        return _types.SimpleNamespace(id=row["id"], code=row["code"], name=row["name"])

    def _get_or_create_user(
        self,
        auth_subject: str,
        email: str,
        full_name: Optional[str],
    ) -> UserAccount:
        row = self._session.execute(
            text("SELECT id FROM user_account WHERE auth_subject = :s LIMIT 1"),
            {"s": auth_subject},
        ).fetchone()
        if row:
            obj = self._session.get(UserAccount, row[0])
            if obj:
                return obj
            import types as _types
            return _types.SimpleNamespace(id=row[0], auth_subject=auth_subject, email=email)
        user = UserAccount(
            auth_subject=auth_subject,
            email=email,
            full_name=full_name,
        )
        self._session.add(user)
        return user

    def _create_org(
        self,
        name: str,
        slug: str,
        market_code: str,
        plan,
    ) -> Organisation:
        org = Organisation(
            name=name,
            slug=slug,
            market_code=market_code,
            plan_id=plan.id if hasattr(plan, "id") else None,
        )
        self._session.add(org)
        return org

    def _create_subscription(self, org: Organisation, plan) -> Subscription:
        return Subscription(
            organisation_id=org.id,
            plan_id=plan.id if hasattr(plan, "id") else None,
            is_active=True,
        )

    def _create_workspace(
        self,
        org: Organisation,
        name: str,
        client_profile: Dict[str, Any],
    ) -> Workspace:
        ws = Workspace(
            organisation_id=org.id,
            name=name,
            client_profile=client_profile,
        )
        self._session.add(ws)
        return ws


# ---------------------------------------------------------------------------
# Mini-proxies para apply_dlc_to_workspace (evita cargar el ORM completo)
# ---------------------------------------------------------------------------

class MagicWorkspace:
    """Proxy ligero para pasar workspace_id/org_id a _apply_product_to_workspace."""
    def __init__(self, id: uuid.UUID, organisation_id: uuid.UUID) -> None:
        self.id = id
        self.organisation_id = organisation_id


class MagicOrg:
    """Proxy ligero para pasar organisation_id a _apply_product_to_workspace."""
    def __init__(self, id: uuid.UUID) -> None:
        self.id = id
