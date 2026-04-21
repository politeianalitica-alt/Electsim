from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from etl.sources.interior_resultados import CONGRESO_FECHAS


_DEFAULT_SOURCES = (
    "ine_geografia",
    "interior_resultados",
    "wikipedia_polls",
    "cis_monitor",
    "prensa_encuestas",
)


def _split_csv(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if not value:
        return default
    items = tuple(part.strip() for part in value.split(",") if part.strip())
    return items or default


def _parse_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return float(raw)


def _parse_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "y", "on"}


def _sorted_elections_desc() -> tuple[tuple[int, int], ...]:
    return tuple(sorted(CONGRESO_FECHAS.keys(), reverse=True))


def _parse_elections(value: str | None, default: tuple[tuple[int, int], ...]) -> tuple[tuple[int, int], ...]:
    if not value:
        return default
    parsed: list[tuple[int, int]] = []
    for chunk in value.split(","):
        item = chunk.strip()
        if not item:
            continue
        year_s, sep, month_s = item.partition(":")
        if not sep:
            raise ValueError(
                f"Formato inválido para elección '{item}'. Use YYYY:MM, por ejemplo 2023:7."
            )
        parsed.append((int(year_s), int(month_s)))
    return tuple(parsed) or default


@dataclass(frozen=True)
class ElectoralIngestionConfig:
    pipeline_name: str
    raw_root: Path
    timezone: str
    enabled_sources: tuple[str, ...]
    daily_elections: tuple[tuple[int, int], ...]
    full_elections: tuple[tuple[int, int], ...]
    volume_drop_warn_pct: float
    results_change_warn_pct: float
    daily_cron: str
    skip_nowcasting: bool
    triggered_by: str


def load_config() -> ElectoralIngestionConfig:
    default_elections = _sorted_elections_desc()
    default_daily = default_elections[:1] or default_elections
    raw_root = Path(os.getenv("RAW_DATA_PATH", "data/raw")) / "electoral_dashboard"
    raw_root.mkdir(parents=True, exist_ok=True)
    return ElectoralIngestionConfig(
        pipeline_name=os.getenv("ELECTSIM_ELECTORAL_PIPELINE_NAME", "dashboard_electoral"),
        raw_root=raw_root,
        timezone=os.getenv("ELECTSIM_ELECTORAL_TIMEZONE", "Europe/Madrid"),
        enabled_sources=_split_csv(
            os.getenv("ELECTSIM_ELECTORAL_ENABLED_SOURCES"),
            _DEFAULT_SOURCES,
        ),
        daily_elections=_parse_elections(
            os.getenv("ELECTSIM_ELECTORAL_ELECTIONS_DAILY"),
            default_daily,
        ),
        full_elections=_parse_elections(
            os.getenv("ELECTSIM_ELECTORAL_ELECTIONS_FULL"),
            default_elections,
        ),
        volume_drop_warn_pct=_parse_float("ELECTSIM_ELECTORAL_VOLUME_DROP_WARN_PCT", 0.35),
        results_change_warn_pct=_parse_float("ELECTSIM_ELECTORAL_RESULTS_CHANGE_WARN_PCT", 0.02),
        daily_cron=os.getenv("ELECTSIM_ELECTORAL_DAILY_CRON", "10 6 * * *"),
        skip_nowcasting=_parse_bool("ELECTSIM_ELECTORAL_SKIP_NOWCASTING", default=False),
        triggered_by=os.getenv("ELECTSIM_ELECTORAL_TRIGGERED_BY", "manual"),
    )
