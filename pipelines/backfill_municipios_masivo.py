"""
Backfill masivo de fichas de los 8.132 municipios españoles.

Diseño:
  · Lee el inventario completo (CSV cacheado · Wikidata 1ª vez)
  · Soporta filtros: --provincia, --ccaa, --min-pob, --skip-existentes
  · Checkpoint en data/processed/brain_enrichment/backfill_municipios.checkpoint
    (codigos completados, idempotente · re-runs no duplican trabajo)
  · Rate limit: --rate-rpm (default 50 requests/min Groq)
  · Concurrency: --workers (default 4 hilos)
  · Resume automático: si el checkpoint existe y --resume, salta los hechos
  · Progress: imprime cada 10 fichas · estimación de tiempo restante

Uso típico:

    # TODOS los municipios (toma ~30h, ~2.5GB de tokens, dentro de free tier)
    python -m pipelines.backfill_municipios_masivo --persist --resume

    # Solo una CCAA
    python -m pipelines.backfill_municipios_masivo --ccaa "Murcia" --persist

    # Solo municipios > 10.000 hab (~700)
    python -m pipelines.backfill_municipios_masivo --min-pob 10000 --persist

    # Una provincia
    python -m pipelines.backfill_municipios_masivo --provincia 30 --persist

Para GitHub Actions matrix, usar --shard N/TOTAL para procesar 1/TOTAL del trabajo.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import Any

logger = logging.getLogger("backfill_municipios")

_CKPT_DIR = Path(__file__).resolve().parent.parent / "data" / "processed" / "brain_enrichment"
_CKPT_FILE = _CKPT_DIR / "backfill_municipios.checkpoint"


# ─────────────────────────────────────────────────────────────────
# Checkpoint
# ─────────────────────────────────────────────────────────────────

_CKPT_LOCK = Lock()


def _load_checkpoint() -> set[str]:
    if not _CKPT_FILE.exists():
        return set()
    try:
        with _CKPT_FILE.open("r", encoding="utf-8") as f:
            return set(line.strip() for line in f if line.strip())
    except Exception as exc:
        logger.warning("checkpoint load falló: %s", exc)
        return set()


def _append_checkpoint(cod: str) -> None:
    _CKPT_DIR.mkdir(parents=True, exist_ok=True)
    with _CKPT_LOCK:
        try:
            with _CKPT_FILE.open("a", encoding="utf-8") as f:
                f.write(cod + "\n")
        except Exception as exc:
            logger.warning("checkpoint write falló: %s", exc)


# ─────────────────────────────────────────────────────────────────
# Rate limiter
# ─────────────────────────────────────────────────────────────────

class RateLimiter:
    """Token bucket muy simple para limitar requests por minuto."""

    def __init__(self, rpm: int) -> None:
        self.rpm = int(rpm)
        self.interval = 60.0 / max(1, self.rpm)
        self.lock = Lock()
        self.last = time.time() - self.interval

    def wait(self) -> None:
        with self.lock:
            now = time.time()
            elapsed = now - self.last
            if elapsed < self.interval:
                time.sleep(self.interval - elapsed)
            self.last = time.time()


# ─────────────────────────────────────────────────────────────────
# Worker
# ─────────────────────────────────────────────────────────────────

def _build_one(cod: str, *, persist: bool, limiter: RateLimiter | None) -> dict[str, Any]:
    """Construye una ficha y opcionalmente la persiste."""
    if limiter:
        limiter.wait()
    from agents.brain.pipelines.ficha_territorial_builder import FichaTerritorialBuilder
    from agents.brain.pipelines.persistence_fichas import persist_ficha_territorial
    try:
        b = FichaTerritorialBuilder()
        ficha = b.build_municipio(cod)
        d = ficha.model_dump()
        if persist:
            persist_ficha_territorial(d)
        _append_checkpoint(cod)
        return {
            "cod_ine": cod,
            "ok": ficha.ok if hasattr(ficha, "ok") else True,
            "completeness": ficha.completeness,
            "n_ok": len(ficha.bloques_ok),
            "n_err": len(ficha.bloques_err),
            "nombre": ficha.nombre,
        }
    except Exception as exc:
        logger.exception("build_one %s falló", cod)
        return {"cod_ine": cod, "ok": False, "error": f"{type(exc).__name__}: {exc}"}


# ─────────────────────────────────────────────────────────────────
# Selector de municipios
# ─────────────────────────────────────────────────────────────────

def _select_municipios(args: argparse.Namespace) -> list[dict[str, Any]]:
    from agents.brain.pipelines.data_sources.municipios_inventory import (
        list_all_municipios, list_municipios_provincia,
    )
    todos = list_all_municipios()
    if args.provincia:
        todos = list_municipios_provincia(args.provincia)
    if args.ccaa:
        ccaa_norm = args.ccaa.lower()
        todos = [m for m in todos if ccaa_norm in (m.get("ccaa") or "").lower()]
    if args.min_pob:
        todos = [m for m in todos if (m.get("poblacion") or 0) >= int(args.min_pob)]
    # Sharding (para GitHub Actions matrix)
    if args.shard:
        cur, total = (int(x) for x in args.shard.split("/"))
        todos = [m for i, m in enumerate(todos) if i % total == cur]
    if args.limit:
        todos = todos[: int(args.limit)]
    return todos


# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    parser = argparse.ArgumentParser(
        prog="backfill_municipios_masivo",
        description="Pre-genera fichas de los 8.132 municipios (con resume, rate limit, shard)",
    )
    parser.add_argument("--provincia", help="Código provincial 2 dígitos (ej: 30=Murcia)")
    parser.add_argument("--ccaa", help="Nombre de CCAA (filtra por contains)")
    parser.add_argument("--min-pob", type=int, default=0,
                        help="Población mínima (filtra municipios pequeños)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Tope total tras filtros (0 = sin tope)")
    parser.add_argument("--shard", default="",
                        help="N/TOTAL para procesar 1/TOTAL en GitHub Actions matrix")
    parser.add_argument("--workers", type=int, default=2,
                        help="Hilos concurrentes (cuidado con rate limit Groq)")
    parser.add_argument("--rate-rpm", type=int, default=30,
                        help="Requests por minuto al brain · Groq free 30 rpm/14400 rpd")
    parser.add_argument("--resume", action="store_true",
                        help="Salta los municipios que ya estén en checkpoint")
    parser.add_argument("--persist", action="store_true",
                        help="UPSERT a Postgres si hay DATABASE_URL")
    parser.add_argument("--dry-run", action="store_true",
                        help="Imprime selección y termina (no construye)")
    parser.add_argument("--reset-checkpoint", action="store_true",
                        help="Borra el checkpoint antes de empezar")
    args = parser.parse_args(argv)

    if args.reset_checkpoint and _CKPT_FILE.exists():
        _CKPT_FILE.unlink()
        print(f"checkpoint reseteado: {_CKPT_FILE}")

    seleccion = _select_municipios(args)
    print(f"[selección] {len(seleccion)} municipios")
    if args.dry_run:
        for m in seleccion[:20]:
            print(f"  {m.get('codigo_ine')} · {m.get('nombre')} · "
                  f"{m.get('provincia')} · pob={m.get('poblacion')}")
        if len(seleccion) > 20:
            print(f"  ... y {len(seleccion) - 20} más")
        return 0

    if args.resume:
        hechos = _load_checkpoint()
        antes = len(seleccion)
        seleccion = [m for m in seleccion if m.get("codigo_ine") not in hechos]
        print(f"[resume] {antes - len(seleccion)} ya hechos · pendientes: {len(seleccion)}")

    if not seleccion:
        print("Nada que hacer.")
        return 0

    limiter = RateLimiter(args.rate_rpm)
    t0 = time.time()
    completados = 0
    fallidos = 0
    suma_completeness = 0.0

    print(f"[start] {len(seleccion)} municipios · workers={args.workers} · "
          f"rate={args.rate_rpm}/min · persist={args.persist}")
    print(f"[stats] ETA estimado: ~{len(seleccion) * 60.0 / args.rate_rpm / 60:.1f} minutos")
    print()

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
        futures = {
            ex.submit(_build_one, m["codigo_ine"], persist=args.persist, limiter=limiter): m
            for m in seleccion
        }
        for i, fut in enumerate(as_completed(futures), 1):
            m = futures[fut]
            try:
                res = fut.result()
            except Exception as exc:
                res = {"cod_ine": m.get("codigo_ine"), "ok": False, "error": str(exc)}
            if res.get("ok"):
                completados += 1
                suma_completeness += float(res.get("completeness") or 0.0)
            else:
                fallidos += 1
            if i % 10 == 0 or i == len(seleccion):
                elapsed = time.time() - t0
                rate = i / max(1.0, elapsed) * 60  # por minuto
                eta_min = (len(seleccion) - i) / max(0.1, rate)
                avg_comp = suma_completeness / max(1, completados)
                print(
                    f"  [{i:>5}/{len(seleccion)}] "
                    f"OK={completados} ERR={fallidos} "
                    f"avg_comp={avg_comp:.2f} "
                    f"rate={rate:.1f}/min ETA={eta_min:.1f}min  "
                    f"último={res.get('nombre','?')[:30]}"
                )

    print()
    print(f"[fin] {completados} OK · {fallidos} fallidos · "
          f"avg_completeness={suma_completeness / max(1, completados):.2f}")
    print(f"[fin] tiempo total: {(time.time() - t0) / 60:.1f} minutos")
    print(f"[fin] checkpoint en: {_CKPT_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
