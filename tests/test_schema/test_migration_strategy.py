from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DB_MANUAL_SQL = {
    "0008_nuevas_tablas.sql",
    "0009_tablas_faltantes.sql",
    "0010_microdatos_pipeline.sql",
    "0011_agenda_lideres.sql",
    "0011_multifuente_aggregacion.sql",
    "0012_media_infrastructure.sql",
    "0013_institucional_core.sql",
}
ARCHIVED_SQL = {
    "003_agenda_lideres.sql",
    "004_fichas_politicos.sql",
    "005_agents_checkpoint_index.sql",
    "005_perfiles_v2.sql",
}


def test_manual_sql_directories_are_frozen():
    db_sql = {path.name for path in (REPO_ROOT / "db/migrations").glob("*.sql")}
    archived_sql = {path.name for path in (REPO_ROOT / "sql/migrations").glob("*.sql")}

    assert db_sql == DB_MANUAL_SQL
    assert archived_sql == ARCHIVED_SQL


def test_runtime_code_does_not_reference_archived_sql_migrations():
    runtime_roots = ["api", "dashboard", "etl", "models", "pipelines"]
    offenders: list[str] = []

    for root in runtime_roots:
        for path in (REPO_ROOT / root).rglob("*.py"):
            if "sql/migrations/" in path.read_text(encoding="utf-8"):
                offenders.append(str(path.relative_to(REPO_ROOT)))

    assert offenders == []
