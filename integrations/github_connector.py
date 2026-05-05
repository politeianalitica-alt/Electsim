"""
GitHub Connector — ElectSim.

Monitoriza repositorios, issues y actividad de equipos en GitHub.
Requiere: GITHUB_TOKEN + GITHUB_ORG (opcional).
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, ConfigDict

log = logging.getLogger(__name__)


class GitHubRepo(BaseModel):
    model_config = ConfigDict()

    id: int
    name: str
    full_name: str
    description: str = ""
    stars: int = 0
    open_issues: int = 0
    updated_at: datetime
    topics: list[str] = []
    is_private: bool = False


class GitHubIssue(BaseModel):
    model_config = ConfigDict()

    id: int
    number: int
    title: str
    body: str = ""
    state: str
    labels: list[str] = []
    created_at: datetime
    repo_name: str


def _get_github_client():  # type: ignore[return]
    """Construye el cliente PyGithub. Devuelve None si no está disponible."""
    try:
        from github import Github  # type: ignore
    except ImportError:
        log.debug("PyGithub no instalado; GitHub no disponible")
        return None

    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        log.debug("GITHUB_TOKEN no configurado")
        return None

    try:
        return Github(token)
    except Exception as exc:
        log.warning("Error construyendo cliente GitHub: %s", exc)
        return None


def list_org_repos(
    org: str | None = None,
    max_repos: int = 20,
) -> list[GitHubRepo]:
    """Lista repos de una organización. Usa modo demo si no está configurado."""
    client = _get_github_client()
    if client is None:
        return _demo_repos()

    env_org = os.environ.get("GITHUB_ORG", "").strip()
    target_org = org or env_org
    if not target_org:
        log.debug("GITHUB_ORG no configurado; usando repos personales")
        return _demo_repos()

    try:
        organization = client.get_organization(target_org)
        repos = []
        for repo in organization.get_repos(sort="updated")[:max_repos]:
            repos.append(
                GitHubRepo(
                    id=repo.id,
                    name=repo.name,
                    full_name=repo.full_name,
                    description=repo.description or "",
                    stars=repo.stargazers_count,
                    open_issues=repo.open_issues_count,
                    updated_at=repo.updated_at.replace(tzinfo=timezone.utc)
                    if repo.updated_at.tzinfo is None
                    else repo.updated_at,
                    topics=repo.get_topics(),
                    is_private=repo.private,
                )
            )
        return repos
    except Exception as exc:
        log.warning("Error listando repos de %s: %s", target_org, exc)
        return _demo_repos()


def get_recent_issues(
    org: str | None = None,
    days: int = 7,
) -> list[GitHubIssue]:
    """Issues abiertas recientes de la organización. Usa modo demo si no está configurado."""
    client = _get_github_client()
    if client is None:
        return _demo_issues()

    env_org = os.environ.get("GITHUB_ORG", "").strip()
    target_org = org or env_org
    if not target_org:
        return _demo_issues()

    since = datetime.now(tz=timezone.utc) - timedelta(days=days)
    issues: list[GitHubIssue] = []

    try:
        organization = client.get_organization(target_org)
        for repo in organization.get_repos(sort="updated")[:10]:
            try:
                for issue in repo.get_issues(state="open", since=since):
                    issues.append(
                        GitHubIssue(
                            id=issue.id,
                            number=issue.number,
                            title=issue.title,
                            body=(issue.body or "")[:500],
                            state=issue.state,
                            labels=[lbl.name for lbl in issue.labels],
                            created_at=issue.created_at.replace(tzinfo=timezone.utc)
                            if issue.created_at.tzinfo is None
                            else issue.created_at,
                            repo_name=repo.name,
                        )
                    )
            except Exception:
                continue
        return issues
    except Exception as exc:
        log.warning("Error obteniendo issues recientes: %s", exc)
        return _demo_issues()


def get_repo_activity_summary(repo_full_name: str) -> dict:
    """Resumen de actividad de un repo: commits 7d, PRs abiertos, issues, último push."""
    client = _get_github_client()
    if client is None:
        return _demo_activity_summary(repo_full_name)

    try:
        repo = client.get_repo(repo_full_name)
        since = datetime.now(tz=timezone.utc) - timedelta(days=7)

        commits_7d = 0
        try:
            commits_7d = repo.get_commits(since=since).totalCount
        except Exception:
            pass

        open_prs = 0
        try:
            open_prs = repo.get_pulls(state="open").totalCount
        except Exception:
            pass

        return {
            "repo": repo_full_name,
            "commits_last_7d": commits_7d,
            "open_prs": open_prs,
            "open_issues": repo.open_issues_count,
            "last_push": repo.pushed_at.isoformat() if repo.pushed_at else None,
            "mode": "live",
        }
    except Exception as exc:
        log.warning("Error obteniendo actividad de %s: %s", repo_full_name, exc)
        return _demo_activity_summary(repo_full_name)


def search_issues(
    query: str,
    org: str | None = None,
) -> list[GitHubIssue]:
    """Busca issues en GitHub. Devuelve [] en caso de fallo."""
    client = _get_github_client()
    if client is None:
        return []

    env_org = os.environ.get("GITHUB_ORG", "").strip()
    target_org = org or env_org
    full_query = f"{query} type:issue"
    if target_org:
        full_query += f" org:{target_org}"

    try:
        results = client.search_issues(full_query)
        issues: list[GitHubIssue] = []
        for issue in results[:20]:
            repo_name = issue.repository.name if issue.repository else "unknown"
            issues.append(
                GitHubIssue(
                    id=issue.id,
                    number=issue.number,
                    title=issue.title,
                    body=(issue.body or "")[:500],
                    state=issue.state,
                    labels=[lbl.name for lbl in issue.labels],
                    created_at=issue.created_at.replace(tzinfo=timezone.utc)
                    if issue.created_at.tzinfo is None
                    else issue.created_at,
                    repo_name=repo_name,
                )
            )
        return issues
    except Exception as exc:
        log.warning("Error buscando issues '%s': %s", query, exc)
        return []


def _demo_repos() -> list[GitHubRepo]:
    """Cuatro repos demo relacionados con tecnología política."""
    _now = datetime(2026, 5, 5, 10, 0, 0, tzinfo=timezone.utc)
    return [
        GitHubRepo(
            id=1001,
            name="electsim-engine",
            full_name="politeia/electsim-engine",
            description="Motor de simulación electoral con D'Hondt y nowcasting",
            stars=42,
            open_issues=7,
            updated_at=datetime(2026, 5, 4, 18, 0, 0, tzinfo=timezone.utc),
            topics=["electoral", "simulation", "python"],
            is_private=True,
        ),
        GitHubRepo(
            id=1002,
            name="data-pipelines",
            full_name="politeia/data-pipelines",
            description="Pipelines ETL para fuentes de datos electorales y legislativas",
            stars=18,
            open_issues=3,
            updated_at=datetime(2026, 5, 3, 12, 0, 0, tzinfo=timezone.utc),
            topics=["etl", "airflow", "data-engineering"],
            is_private=True,
        ),
        GitHubRepo(
            id=1003,
            name="dashboard-ui",
            full_name="politeia/dashboard-ui",
            description="Dashboard de inteligencia política en Streamlit y Next.js",
            stars=31,
            open_issues=12,
            updated_at=datetime(2026, 5, 2, 9, 30, 0, tzinfo=timezone.utc),
            topics=["streamlit", "nextjs", "dashboard"],
            is_private=True,
        ),
        GitHubRepo(
            id=1004,
            name="analytics-core",
            full_name="politeia/analytics-core",
            description="Modelos analíticos: NLP, sentimiento, clasificación de actores",
            stars=25,
            open_issues=5,
            updated_at=datetime(2026, 4, 30, 15, 0, 0, tzinfo=timezone.utc),
            topics=["nlp", "analytics", "machine-learning"],
            is_private=True,
        ),
    ]


def _demo_issues() -> list[GitHubIssue]:
    """Issues demo."""
    return [
        GitHubIssue(
            id=2001,
            number=45,
            title="Mejorar precisión del modelo D'Hondt en circunscripciones pequeñas",
            body="El modelo presenta desviaciones > 2% en circunscripciones de menos de 5 escaños.",
            state="open",
            labels=["bug", "electoral"],
            created_at=datetime(2026, 5, 1, 10, 0, 0, tzinfo=timezone.utc),
            repo_name="electsim-engine",
        ),
        GitHubIssue(
            id=2002,
            number=23,
            title="Añadir conector para datos del INE (microdatos CIS)",
            body="Integrar el catálogo de microdatos del CIS como fuente primaria.",
            state="open",
            labels=["enhancement", "data"],
            created_at=datetime(2026, 4, 28, 9, 0, 0, tzinfo=timezone.utc),
            repo_name="data-pipelines",
        ),
    ]


def _demo_activity_summary(repo_full_name: str) -> dict:
    """Resumen de actividad demo."""
    return {
        "repo": repo_full_name,
        "commits_last_7d": 12,
        "open_prs": 3,
        "open_issues": 7,
        "last_push": "2026-05-04T18:00:00+00:00",
        "mode": "demo",
    }


def is_configured() -> bool:
    """True si GITHUB_TOKEN está configurado."""
    return bool(os.environ.get("GITHUB_TOKEN", "").strip())
