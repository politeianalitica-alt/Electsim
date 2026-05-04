"""
Economy Core Pipeline CLI — Bloque 5.

Punto de entrada principal para el pipeline de Inteligencia Económica.

Uso:
    python -m pipelines.economy_core --source all
    python -m pipelines.economy_core --provider ine
    python -m pipelines.economy_core --provider eurostat --geography EU27_2020
    python -m pipelines.economy_core --signals
    python -m pipelines.economy_core --forecast ipc --horizon 12
    python -m pipelines.economy_core --itpe
    python -m pipelines.economy_core --budget PATH/presupuesto.csv --budget-year 2024
    python -m pipelines.economy_core --backtest paro_epa --model arima
    python -m pipelines.economy_core --source all --dry-run

Comandos:
  --source {ine,bde,eurostat,worldbank,all}  Fetch indicadores de proveedor(es)
  --signals                                   Detectar señales económico-políticas
  --forecast INDICATOR_ID                     Generar forecast para un indicador
  --itpe                                      Calcular ITPE Económico
  --budget FILE                               Importar partidas presupuestarias desde CSV
  --backtest INDICATOR_ID                     Backtesta modelos de forecast

Opciones comunes:
  --geography GEO          Código geográfico (default: ES)
  --horizon N              Períodos de forecast (default: 6)
  --model MODEL            Modelo de forecast: naive|moving_avg|ols_trend|arima|auto
  --budget-year YEAR       Año presupuestario
  --dry-run                Sin persistencia en BD
  --verbose                Logging detallado
"""
from __future__ import annotations

import argparse
import logging
import sys
from typing import Any

logger = logging.getLogger(__name__)


# ── Comandos ──────────────────────────────────────────────────────────────────


def cmd_fetch_provider(
    provider_name: str,
    geography: str = "ES",
    dry_run: bool = False,
) -> dict[str, int]:
    """Fetch indicadores de uno o todos los proveedores."""
    stats: dict[str, int] = {
        "indicators_fetched": 0,
        "indicators_upserted": 0,
        "series_upserted": 0,
        "errors": 0,
    }

    try:
        from etl.sources.economy.provider_registry import get_registry
        registry = get_registry()

        if provider_name == "all":
            indicators = registry.fetch_all_core_indicators()
        else:
            p = registry.get(provider_name)
            if p is None:
                logger.error("Proveedor '%s' no encontrado. Disponibles: %s",
                             provider_name, registry.list_providers())
                stats["errors"] += 1
                return stats
            result = p.fetch_core_indicators()
            indicators = result.indicators if result.success else []
            if not result.success:
                logger.warning("Proveedor '%s' error: %s", provider_name, result.error)
                stats["errors"] += 1

        stats["indicators_fetched"] = len(indicators)
        logger.info("Obtenidos %d indicadores de '%s'.", len(indicators), provider_name)

        if not dry_run and indicators:
            try:
                from etl.sources.economy.economic_adapter import (
                    validate_indicators, upsert_indicators,
                    indicators_to_series, upsert_series,
                )
                from db.database import get_engine
                engine = get_engine()

                valid, errors = validate_indicators(indicators)
                stats["errors"] += len(errors)
                if errors:
                    logger.warning("%d indicadores inválidos descartados.", len(errors))

                ind_stats = upsert_indicators(valid, engine)
                stats["indicators_upserted"] = ind_stats.get("n_inserted", 0)

                series = indicators_to_series(valid)
                ser_stats = upsert_series(series, engine)
                stats["series_upserted"] = ser_stats.get("n_upserted", 0)
            except Exception as exc:
                logger.error("Error persistiendo indicadores: %s", exc)
                stats["errors"] += 1

    except Exception as exc:
        logger.error("cmd_fetch_provider error: %s", exc)
        stats["errors"] += 1

    return stats


def cmd_detect_signals(
    geography: str = "ES",
    dry_run: bool = False,
) -> dict[str, int]:
    """Detecta señales económico-políticas a partir de indicadores recientes."""
    stats = {"signals_detected": 0, "signals_upserted": 0, "alerts_created": 0, "errors": 0}

    try:
        from dashboard.services.economy_core import cargar_indicadores_macro_recientes
        df = cargar_indicadores_macro_recientes(geography=geography, limit=500)
        if df.empty:
            logger.info("No hay indicadores disponibles para detección de señales.")
            return stats

        # Reconstruir MacroIndicator desde DataFrame
        from etl.sources.economy.schemas import MacroIndicator
        indicators = []
        for _, row in df.iterrows():
            try:
                ind = MacroIndicator(
                    source="db",
                    provider=str(row.get("provider", "unknown")),
                    indicator_id=str(row["indicator_id"]),
                    name=str(row.get("name", row["indicator_id"])),
                    geography=str(row.get("geography", geography)),
                    frequency=str(row.get("frequency", "monthly")),
                    date=row["date"],
                    value=float(row["value"]),
                    unit=str(row.get("unit", "")) if row.get("unit") else None,
                    category=str(row.get("category", "")) if row.get("category") else None,
                )
                indicators.append(ind)
            except Exception as exc:
                logger.debug("Error creando MacroIndicator: %s", exc)

        from etl.sources.economy.economic_signal_detector import detect_signals
        signals = detect_signals(indicators)
        stats["signals_detected"] = len(signals)
        logger.info("Detectadas %d señales económicas.", len(signals))

        if not dry_run and signals:
            from db.database import get_engine
            from etl.sources.economy.economic_signal_detector import (
                upsert_signals, create_signal_alerts,
            )
            engine = get_engine()
            n_sig = upsert_signals(signals, engine)
            stats["signals_upserted"] = n_sig
            n_alerts = create_signal_alerts(signals, engine)
            stats["alerts_created"] = n_alerts

    except Exception as exc:
        logger.error("cmd_detect_signals error: %s", exc)
        stats["errors"] += 1

    return stats


def cmd_forecast(
    indicator_id: str,
    geography: str = "ES",
    horizon: int = 6,
    model: str = "auto",
    dry_run: bool = False,
) -> list[dict[str, Any]]:
    """Genera y (opcionalmente) persiste un forecast para un indicador."""
    try:
        from dashboard.services.economy_core import compute_and_store_forecasts
        if dry_run:
            # Solo genera, no persiste
            from dashboard.services.economy_core import cargar_series_macro
            from etl.sources.economy.schemas import MacroIndicator
            from etl.sources.economy.economic_forecaster import forecast_indicator

            df = cargar_series_macro(indicator_id, geography=geography, limit=60)
            if df.empty:
                logger.info("No hay serie para %s.", indicator_id)
                return []

            indicators = []
            for _, row in df.iterrows():
                try:
                    ind = MacroIndicator(
                        source="db", provider=str(row.get("provider", "unknown")),
                        indicator_id=indicator_id, name=indicator_id,
                        geography=geography, frequency="monthly",
                        date=row["date"], value=float(row["value"]),
                    )
                    indicators.append(ind)
                except Exception:
                    continue

            forecasts = forecast_indicator(indicators, horizon=horizon, model=model)
            return [f.model_dump() for f in forecasts]
        else:
            return compute_and_store_forecasts(
                indicator_id, geography=geography, horizon=horizon, model=model
            )
    except Exception as exc:
        logger.error("cmd_forecast error: %s", exc)
        return []


def cmd_compute_itpe(geography: str = "ES") -> dict[str, Any]:
    """Calcula e imprime el ITPE Económico."""
    try:
        from dashboard.services.economy_core import cargar_itpe_economico
        return cargar_itpe_economico(geography=geography)
    except Exception as exc:
        logger.error("cmd_compute_itpe error: %s", exc)
        return {"hay_datos": False, "error": str(exc)}


def cmd_import_budget(
    file_path: str,
    budget_year: int,
    administration: str = "central",
    source: str = "manual",
    dry_run: bool = False,
) -> dict[str, int]:
    """Importa partidas presupuestarias desde un CSV."""
    stats = {"items_loaded": 0, "items_upserted": 0, "errors": 0}

    try:
        from etl.sources.economy.budget_provider import load_budget_from_csv
        items = load_budget_from_csv(
            path=file_path,
            budget_year=budget_year,
            administration=administration,
            source=source,
        )
        stats["items_loaded"] = len(items)
        logger.info("Cargadas %d partidas desde %s.", len(items), file_path)

        if not dry_run and items:
            from db.database import get_engine
            import json
            from sqlalchemy import text as sa_text
            engine = get_engine()

            n_ok = 0
            with engine.begin() as conn:
                for item in items:
                    try:
                        d = item.model_dump()
                        conn.execute(sa_text("""
                            INSERT INTO budget_items (
                                source, budget_year, administration, programme_code,
                                programme_name, chapter, ministry, geography, sector,
                                initial_credit, final_credit, executed_amount, execution_rate,
                                raw_payload
                            ) VALUES (
                                :source, :budget_year, :administration, :programme_code,
                                :programme_name, :chapter, :ministry, :geography, :sector,
                                :initial_credit, :final_credit, :executed_amount, :execution_rate,
                                :raw_payload::jsonb
                            )
                        """), {
                            "source": d.get("source"),
                            "budget_year": d.get("budget_year"),
                            "administration": d.get("administration"),
                            "programme_code": d.get("programme_code"),
                            "programme_name": d.get("programme_name"),
                            "chapter": d.get("chapter"),
                            "ministry": d.get("ministry"),
                            "geography": d.get("geography"),
                            "sector": d.get("sector"),
                            "initial_credit": d.get("initial_credit"),
                            "final_credit": d.get("final_credit"),
                            "executed_amount": d.get("executed_amount"),
                            "execution_rate": d.get("execution_rate"),
                            "raw_payload": json.dumps(d.get("raw_payload", {})),
                        })
                        n_ok += 1
                    except Exception as exc:
                        logger.debug("Error insertando partida: %s", exc)
                        stats["errors"] += 1
            stats["items_upserted"] = n_ok

    except Exception as exc:
        logger.error("cmd_import_budget error: %s", exc)
        stats["errors"] += 1

    return stats


def cmd_backtest(
    indicator_id: str,
    geography: str = "ES",
    model: str = "naive",
    test_size: int = 4,
) -> dict[str, Any]:
    """Backtesta modelos de forecast en datos históricos."""
    try:
        from dashboard.services.economy_core import cargar_series_macro
        from etl.sources.economy.schemas import MacroIndicator
        from etl.sources.economy.economic_forecaster import backtest_indicator

        df = cargar_series_macro(indicator_id, geography=geography, limit=60)
        if df.empty or len(df) < test_size + 2:
            logger.info("Serie insuficiente para backtest de %s.", indicator_id)
            return {"error": "Serie insuficiente", "indicator_id": indicator_id}

        indicators = []
        for _, row in df.iterrows():
            try:
                ind = MacroIndicator(
                    source="db", provider=str(row.get("provider", "unknown")),
                    indicator_id=indicator_id, name=indicator_id,
                    geography=geography, frequency="monthly",
                    date=row["date"], value=float(row["value"]),
                )
                indicators.append(ind)
            except Exception:
                continue

        result = backtest_indicator(indicators, test_size=test_size, model=model)
        return {"indicator_id": indicator_id, "geography": geography, **result}

    except Exception as exc:
        logger.error("cmd_backtest error: %s", exc)
        return {"error": str(exc)}


def cmd_health_check() -> dict[str, Any]:
    """Comprueba el estado de los proveedores registrados."""
    try:
        from etl.sources.economy.provider_registry import get_registry
        registry = get_registry()
        health = registry.health()
        return health
    except Exception as exc:
        logger.error("cmd_health_check error: %s", exc)
        return {"error": str(exc)}


# ── CLI ───────────────────────────────────────────────────────────────────────


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="economy_core",
        description="Pipeline de Inteligencia Económica — ElectSim Bloque 5",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # Grupo mutuamente exclusivo de acciones
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument(
        "--source",
        choices=["ine", "bde", "eurostat", "worldbank", "tradingeconomics", "all"],
        metavar="PROVIDER",
        help="Fetch indicadores del proveedor especificado. 'all' = todos los activos.",
    )
    action.add_argument(
        "--signals",
        action="store_true",
        help="Detectar señales económico-políticas a partir de indicadores en BD.",
    )
    action.add_argument(
        "--forecast",
        metavar="INDICATOR_ID",
        help="Generar forecast para un indicador (ej: ipc, paro_epa, pib_yoy).",
    )
    action.add_argument(
        "--itpe",
        action="store_true",
        help="Calcular e imprimir el ITPE Económico.",
    )
    action.add_argument(
        "--budget",
        metavar="FILE",
        help="Importar partidas presupuestarias desde un CSV.",
    )
    action.add_argument(
        "--backtest",
        metavar="INDICATOR_ID",
        help="Backtesta el modelo de forecast para un indicador.",
    )
    action.add_argument(
        "--health",
        action="store_true",
        help="Comprobar el estado de los proveedores registrados.",
    )
    action.add_argument(
        "--run-all",
        action="store_true",
        help="Ejecutar pipeline completo: fetch + signals + itpe.",
    )

    # Opciones comunes
    parser.add_argument("--geography", default="ES", help="Código geográfico (default: ES)")
    parser.add_argument("--horizon", type=int, default=6, help="Períodos de forecast (default: 6)")
    parser.add_argument(
        "--model",
        default="auto",
        choices=["naive", "moving_avg", "ols_trend", "arima", "auto"],
        help="Modelo de forecast (default: auto)",
    )
    parser.add_argument("--budget-year", type=int, help="Año presupuestario")
    parser.add_argument("--administration", default="central", help="Administración (default: central)")
    parser.add_argument("--source-name", default="manual", help="Nombre de la fuente (default: manual)")
    parser.add_argument("--test-size", type=int, default=4, help="Observaciones para backtest (default: 4)")
    parser.add_argument("--dry-run", action="store_true", help="Sin persistencia en BD")
    parser.add_argument("--verbose", action="store_true", help="Logging detallado")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    # Configurar logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )

    if args.source:
        logger.info("=== Fetch indicadores: %s ===", args.source)
        stats = cmd_fetch_provider(
            provider_name=args.source,
            geography=args.geography,
            dry_run=args.dry_run,
        )
        print(f"\nResultado fetch '{args.source}':")
        for k, v in stats.items():
            print(f"  {k}: {v}")
        return 0 if stats.get("errors", 0) == 0 else 1

    elif args.signals:
        logger.info("=== Detección de señales económicas ===")
        stats = cmd_detect_signals(geography=args.geography, dry_run=args.dry_run)
        print(f"\nResultado señales:")
        for k, v in stats.items():
            print(f"  {k}: {v}")
        return 0 if stats.get("errors", 0) == 0 else 1

    elif args.forecast:
        logger.info("=== Forecast: %s (horizon=%d, model=%s) ===", args.forecast, args.horizon, args.model)
        forecasts = cmd_forecast(
            indicator_id=args.forecast,
            geography=args.geography,
            horizon=args.horizon,
            model=args.model,
            dry_run=args.dry_run,
        )
        if forecasts:
            print(f"\nForecast para '{args.forecast}' ({args.geography}):")
            for fc in forecasts:
                print(
                    f"  {fc.get('target_date')} | "
                    f"yhat={fc.get('yhat'):.3f} "
                    f"[{fc.get('yhat_lower'):.3f}, {fc.get('yhat_upper'):.3f}] "
                    f"({fc.get('model_name', '')})"
                )
        else:
            print(f"No se generaron forecasts para '{args.forecast}'.")
        return 0

    elif args.itpe:
        logger.info("=== ITPE Económico (%s) ===", args.geography)
        itpe = cmd_compute_itpe(geography=args.geography)
        if itpe.get("hay_datos"):
            print(f"\nITPE Económico — {args.geography}")
            print(f"  Score total:  {itpe.get('total_score'):.1f}/100 ({itpe.get('level')})")
            print(f"  Inflación:    {itpe.get('inflation_risk'):.1f}pt")
            print(f"  Paro:         {itpe.get('unemployment_risk'):.1f}pt")
            print(f"  Crecimiento:  {itpe.get('growth_risk'):.1f}pt")
            print(f"  Fiscal:       {itpe.get('fiscal_risk'):.1f}pt")
            print(f"  Vivienda:     {itpe.get('housing_risk'):.1f}pt")
            print(f"  Energía:      {itpe.get('energy_risk'):.1f}pt")
            print(f"  Mercados:     {itpe.get('market_risk'):.1f}pt")
            print(f"  Confianza:    {itpe.get('confidence_risk'):.1f}pt")
            print(f"\n  {itpe.get('explanation')}")
        else:
            print("No hay datos económicos disponibles para calcular el ITPE.")
        return 0

    elif args.budget:
        year = args.budget_year or __import__("datetime").date.today().year
        logger.info("=== Importar presupuesto: %s (año=%d) ===", args.budget, year)
        stats = cmd_import_budget(
            file_path=args.budget,
            budget_year=year,
            administration=args.administration,
            source=args.source_name,
            dry_run=args.dry_run,
        )
        print(f"\nResultado importación presupuesto:")
        for k, v in stats.items():
            print(f"  {k}: {v}")
        return 0 if stats.get("errors", 0) == 0 else 1

    elif args.backtest:
        logger.info("=== Backtest: %s (model=%s) ===", args.backtest, args.model)
        result = cmd_backtest(
            indicator_id=args.backtest,
            geography=args.geography,
            model=args.model,
            test_size=args.test_size,
        )
        print(f"\nBacktest '{args.backtest}' — {result.get('model', args.model)}:")
        if "error" in result:
            print(f"  Error: {result['error']}")
            return 1
        print(f"  MAE:   {result.get('mae', 0):.4f}")
        print(f"  RMSE:  {result.get('rmse', 0):.4f}")
        print(f"  MAPE:  {result.get('mape', 0):.2f}%")
        return 0

    elif args.health:
        logger.info("=== Estado de proveedores ===")
        health = cmd_health_check()
        print("\nEstado de proveedores económicos:")
        if isinstance(health, dict):
            for name, status in health.items():
                if isinstance(status, dict):
                    print(f"  {name}: {status.get('status', '?')} — {status.get('message', '')}")
                else:
                    print(f"  {name}: {status}")
        return 0

    elif args.run_all:
        logger.info("=== Pipeline completo ===")
        total_errors = 0

        logger.info("--- 1/3 Fetch de todos los proveedores ---")
        stats = cmd_fetch_provider("all", geography=args.geography, dry_run=args.dry_run)
        print(f"Fetch: {stats}")
        total_errors += stats.get("errors", 0)

        logger.info("--- 2/3 Detección de señales ---")
        sig_stats = cmd_detect_signals(geography=args.geography, dry_run=args.dry_run)
        print(f"Señales: {sig_stats}")
        total_errors += sig_stats.get("errors", 0)

        logger.info("--- 3/3 ITPE ---")
        itpe = cmd_compute_itpe(geography=args.geography)
        if itpe.get("hay_datos"):
            print(f"ITPE: {itpe.get('total_score'):.1f}/100 ({itpe.get('level')})")
        else:
            print("ITPE: sin datos")

        return 0 if total_errors == 0 else 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
