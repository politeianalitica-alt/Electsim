"""
Electoral Core Pipeline — Bloque 6.

CLI para ejecutar el ciclo completo del módulo electoral.

Uso:
  python -m pipelines.electoral_core --source all --nowcast --coalitions
  python -m pipelines.electoral_core --source polls --polls-csv data/polls.csv
  python -m pipelines.electoral_core --seats --volatility --dry-run

Opciones:
  --source {results,polls,wikipedia,all}  Fuente de datos a cargar.
  --polls-csv PATH        CSV de encuestas a cargar.
  --results-csv PATH      CSV de resultados electorales a cargar.
  --nowcast               Calcular nowcasting.
  --seats                 Proyectar distribución de escaños.
  --coalitions            Analizar coaliciones.
  --volatility            Calcular indicadores de volatilidad.
  --campaign-simulations  Simular mensajes de campaña (top temas).
  --segments-csv PATH     CSV de segmentos de votante.
  --geography GEO         Código geográfico (default: ES).
  --half-life N           Semivida de recencia en días (default: 21).
  --max-coalition-parties N  Máximo de partidos en coalición (default: 5).
  --dry-run               No persistir datos en BD.
  --verbose               Log DEBUG.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

logger = logging.getLogger("electoral_core")


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Electoral Core Pipeline — Bloque 6",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Fuente
    p.add_argument(
        "--source",
        choices=["results", "polls", "wikipedia", "all"],
        default="polls",
        help="Fuente de datos a cargar (default: polls).",
    )
    p.add_argument("--polls-csv", metavar="PATH", help="Ruta a CSV de encuestas.")
    p.add_argument("--results-csv", metavar="PATH", help="Ruta a CSV de resultados electorales.")
    p.add_argument("--segments-csv", metavar="PATH", help="Ruta a CSV de segmentos de votante.")

    # Acciones
    p.add_argument("--nowcast", action="store_true", help="Calcular nowcasting.")
    p.add_argument("--seats", action="store_true", help="Proyectar distribución de escaños.")
    p.add_argument("--coalitions", action="store_true", help="Analizar coaliciones.")
    p.add_argument("--volatility", action="store_true", help="Calcular volatilidad.")
    p.add_argument(
        "--campaign-simulations",
        action="store_true",
        help="Ejecutar simulaciones de campaña para top partidos y temas.",
    )
    p.add_argument(
        "--run-all",
        action="store_true",
        help="Ejecutar todo el ciclo electoral.",
    )

    # Parámetros
    p.add_argument("--geography", default="ES", help="Código geográfico (default: ES).")
    p.add_argument(
        "--half-life", type=int, default=21,
        help="Semivida de recencia para nowcasting en días (default: 21).",
    )
    p.add_argument(
        "--max-coalition-parties", type=int, default=5,
        help="Máximo de partidos en una coalición (default: 5).",
    )
    p.add_argument("--dry-run", action="store_true", help="No persistir datos en BD.")
    p.add_argument("--verbose", action="store_true", help="Log DEBUG.")

    return p


def _run(args: argparse.Namespace) -> int:
    """Ejecuta el pipeline. Devuelve código de salida (0=OK)."""
    from etl.sources.electoral.electoral_monitor import ElectoralMonitor

    # Engine
    engine = None
    if not args.dry_run:
        try:
            from db.connection import get_engine
            engine = get_engine()
        except Exception as exc:
            logger.warning("No se pudo conectar a BD — modo dry-run: %s", exc)

    monitor = ElectoralMonitor(
        engine=engine,
        geography=args.geography,
        half_life_days=args.half_life,
        max_coalition_parties=args.max_coalition_parties,
        dry_run=args.dry_run,
    )

    # ── Carga de resultados ───────────────────────────────────────────────────
    if args.source in ("results", "all") and args.results_csv:
        logger.info("Cargando resultados desde %s", args.results_csv)
        from etl.sources.electoral.official_results_provider import load_results_from_csv
        results = load_results_from_csv(args.results_csv, geography=args.geography)
        logger.info("  → %d resultados cargados", len(results))

        if not args.dry_run and engine and results:
            from etl.sources.electoral.electoral_adapter import upsert_election_results
            n = upsert_election_results(results, engine)
            logger.info("  → %d resultados persistidos", n)

    # ── Carga de encuestas ────────────────────────────────────────────────────
    if args.source in ("polls", "all"):
        if args.polls_csv:
            n = monitor.load_polls_from_csv(args.polls_csv)
            logger.info("Polls desde CSV: %d", n)

        if args.source == "all" or not args.polls_csv:
            n = monitor.load_polls_from_wikipedia()
            logger.info("Polls desde Wikipedia: %d", n)

    if args.source == "wikipedia":
        n = monitor.load_polls_from_wikipedia()
        logger.info("Polls desde Wikipedia: %d", n)

    # ── Segmentos ─────────────────────────────────────────────────────────────
    monitor.load_segments(args.segments_csv)
    if not args.dry_run and engine:
        monitor.persist_segments()

    # ── Nowcasting ────────────────────────────────────────────────────────────
    if args.nowcast or args.run_all:
        logger.info("Calculando nowcasting...")
        snapshot = monitor.compute_nowcast()
        if snapshot:
            logger.info(
                "Nowcasting: %s lidera con %.1f%%",
                snapshot.leading_party,
                snapshot.party_estimates.get(snapshot.leading_party, 0),
            )
            snapshot_id = monitor.persist_nowcast()
            logger.info("  → Snapshot ID: %s", snapshot_id)

            # Mostrar estimaciones
            print("\n📊 Nowcasting Electoral")
            print("-" * 40)
            for party, share in sorted(
                snapshot.party_estimates.items(), key=lambda x: x[1], reverse=True
            )[:10]:
                seats = snapshot.seat_estimates.get(party, 0)
                print(f"  {party:15s}  {share:5.1f}%   {seats:3d} escaños")
            print()
        else:
            logger.warning("No hay suficientes polls para calcular nowcasting.")

    # ── Escaños ───────────────────────────────────────────────────────────────
    if args.seats and not (args.nowcast or args.run_all):
        # Sin nowcast previo, calcular solo escaños desde BD
        from dashboard.services.electoral_core import cargar_escanos_actuales
        seats = cargar_escanos_actuales(args.geography)
        if seats:
            print("\n🏛️  Proyección de Escaños (Congreso)")
            print("-" * 40)
            for party, n in sorted(seats.items(), key=lambda x: x[1], reverse=True):
                print(f"  {party:15s}  {n:3d}")
            print()

    # ── Coaliciones ───────────────────────────────────────────────────────────
    if args.coalitions or args.run_all:
        logger.info("Analizando coaliciones...")
        coalitions = monitor.analyze_coalitions()
        if coalitions:
            monitor.persist_coalitions()
            print("\n🤝 Top Coaliciones")
            print("-" * 50)
            for c in coalitions[:8]:
                maj = "✅" if c.has_majority else "❌"
                print(
                    f"  {maj} {c.name:30s}  {c.seats_total}esc  "
                    f"{c.probability:.0%}  {c.scenario_type}"
                )
            print()

    # ── Volatilidad ───────────────────────────────────────────────────────────
    if args.volatility or args.run_all:
        from dashboard.services.electoral_core import cargar_volatilidad
        vol = cargar_volatilidad(geography=args.geography)
        if vol.get("hay_datos"):
            print("\n📈 Volatilidad Electoral")
            print("-" * 40)
            print(f"  Índice de Pedersen:     {vol.get('pedersen_index', 0):.2f}")
            print(f"  ENP antes:              {vol.get('enp_before', 0):.2f}")
            print(f"  ENP después:            {vol.get('enp_after', 0):.2f}")
            mv = vol.get("most_volatile_party")
            if mv:
                print(f"  Partido más volátil:    {mv} ({vol.get('max_swing', 0):+.2f}pp)")
            print()

    # ── Simulaciones de campaña ───────────────────────────────────────────────
    if args.campaign_simulations or args.run_all:
        from dashboard.services.campaign_core import (
            recomendar_mensajes,
            simular_mensaje_campana,
        )
        top_parties = ["PP", "PSOE"]
        print("\n🎯 Simulaciones de Campaña (top partidos)")
        print("-" * 50)
        for party in top_parties:
            recs = recomendar_mensajes(party, args.geography, top_n=3)
            if recs:
                print(f"\n  {party}:")
                for r in recs:
                    print(
                        f"    [{r['theme']:15s}]  +{r['expected_gain_pp']:.4f}pp  "
                        f"conf={r['confidence']:.0%}"
                    )

    # ── Voto blando ───────────────────────────────────────────────────────────
    if args.run_all:
        soft = monitor.estimate_soft_vote()
        monitor.persist_soft_vote()
        logger.info("Voto blando: %d estimaciones", len(soft))

    # ── Alertas ───────────────────────────────────────────────────────────────
    if monitor.n_polls > 0 or args.run_all:
        alerts = monitor.generate_alerts()
        if alerts:
            print("\n🚨 Alertas Electorales")
            print("-" * 50)
            for alert in alerts[:5]:
                icon = "🔴" if alert.severity == "CRITICAL" else ("🟡" if alert.severity == "WARNING" else "🔵")
                print(f"  {icon} [{alert.alert_type}] {alert.title}")
            print()

    logger.info("Pipeline electoral completado.")
    return 0


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    sys.exit(_run(args))


if __name__ == "__main__":
    main()
