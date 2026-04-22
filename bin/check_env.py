#!/usr/bin/env python3
"""Chequeos rápidos de entorno para ElectSim."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - fallback cuando no está instalada la dependencia
    load_dotenv = None


def _fail(msg: str) -> None:
    print(f"[ERROR] {msg}")
    raise SystemExit(1)


def _warn(msg: str) -> None:
    print(f"[WARN] {msg}")


def _load_env_fallback(path: Path) -> None:
    """Carga .env de forma mínima sin dependencias externas."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        ln = line.strip()
        if not ln or ln.startswith("#") or "=" not in ln:
            continue
        k, v = ln.split("=", 1)
        key = k.strip()
        val = v.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    if load_dotenv is not None:
        load_dotenv(root / ".env")
    else:
        _warn("python-dotenv no instalado; usando parser básico para .env.")
        _load_env_fallback(root / ".env")

    db_url = (os.getenv("DATABASE_URL", "") or "").strip()
    if not db_url:
        _fail("DATABASE_URL no definida. Copia .env.example a .env o exporta DATABASE_URL.")

    parsed = urlparse(db_url.replace("+psycopg", ""))
    host = (parsed.hostname or "").strip().lower()
    db_user = (parsed.username or "").strip()
    db_pwd = (parsed.password or "").strip()
    db_name = (parsed.path or "").lstrip("/")

    print(f"[OK] DATABASE_URL detectada: host={host or 'N/A'} db={db_name or 'N/A'} user={db_user or 'N/A'}")

    env_user = (os.getenv("POSTGRES_USER", "") or "").strip()
    env_pwd = (os.getenv("POSTGRES_PASSWORD", "") or "").strip()
    if host in {"localhost", "127.0.0.1", "::1"}:
        if env_user and db_user and env_user != db_user:
            _fail(f"POSTGRES_USER='{env_user}' no coincide con DATABASE_URL user='{db_user}'.")
        if env_pwd and db_pwd and env_pwd != db_pwd:
            _fail("POSTGRES_PASSWORD no coincide con la contraseña de DATABASE_URL.")
        print("[OK] Credenciales DB locales coherentes.")
    else:
        _warn("DATABASE_URL no apunta a localhost; se omite validación estricta POSTGRES_*.")

    prefect_api = (os.getenv("PREFECT_API_URL", "") or "").strip()
    if not prefect_api:
        _warn("PREFECT_API_URL no definida. Si lanzas Prefect desde host, usa http://localhost:4200/api")
    else:
        print(f"[OK] PREFECT_API_URL={prefect_api}")

    print("[OK] check_env completado.")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:
        _fail(f"check_env falló: {exc}")
