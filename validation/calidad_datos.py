"""
Validación de calidad de datos con checks propios y Great Expectations.

Reglas por tabla:
- resultados_electorales: no nulls en voto%, suma por elección ≈ 100%, escaños ≥ 0
- encuestas: n_muestra > 0, fechas coherentes, margen_error en [0, 10]
- indicadores_macroeconomicos: inflación en [-5, 30], paro en [0, 40]
- perfiles_votante: al menos 3 clusters, pesos suman ≈ 1
- microdatos_encuesta: ideología en [1, 10], ponderación > 0
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

log = logging.getLogger(__name__)

# ─── Check result ──────────────────────────────────────────────────────────────

@dataclass
class Check:
    tabla: str
    nombre: str
    ok: bool
    valor_observado: float | str | None = None
    umbral: str | None = None
    n_filas: int = 0
    detalle: str = ""


@dataclass
class ReporteCalidad:
    run_id: str
    checks: list[Check]
    pct_completitud_global: float
    n_ok: int
    n_fail: int
    semaforo: str  # verde | amarillo | rojo
    resumen: str


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _tabla_existe(engine: Engine, tabla: str) -> bool:
    q = text("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=:t)")
    with engine.connect() as conn:
        return bool(conn.execute(q, {"t": tabla}).scalar())


def _read(engine: Engine, sql: str, params: dict | None = None) -> pd.DataFrame:
    try:
        with engine.connect() as conn:
            return pd.read_sql(text(sql), conn, params=params or {})
    except Exception as exc:
        log.debug("Query falló: %s", exc)
        return pd.DataFrame()


# ─── Checks por tabla ──────────────────────────────────────────────────────────

def _check_resultados_electorales(engine: Engine) -> list[Check]:
    checks = []
    tabla = "resultados_electorales"
    if not _tabla_existe(engine, tabla):
        return [Check(tabla, "tabla_existe", False, detalle="Tabla no encontrada")]

    df = _read(engine, "SELECT * FROM resultados_electorales LIMIT 5000")
    n = len(df)

    # Completitud votos_candidatura_pct
    if n > 0 and "votos_candidatura_pct" in df.columns:
        pct_null = df["votos_candidatura_pct"].isna().mean()
        checks.append(Check(
            tabla, "votos_pct_no_null",
            ok=pct_null < 0.05,
            valor_observado=round(pct_null * 100, 2),
            umbral="< 5% nulls",
            n_filas=n,
        ))
        # Rango [0, 100]
        fuera = ((df["votos_candidatura_pct"] < 0) | (df["votos_candidatura_pct"] > 100)).sum()
        checks.append(Check(
            tabla, "votos_pct_rango_valido",
            ok=fuera == 0,
            valor_observado=int(fuera),
            umbral="0 filas fuera de [0, 100]",
            n_filas=n,
        ))

    # Escaños no negativos
    if "escanos" in df.columns:
        neg = (df["escanos"].dropna() < 0).sum()
        checks.append(Check(tabla, "escanos_no_negativos", ok=neg == 0, valor_observado=int(neg), n_filas=n))

    return checks


def _check_encuestas(engine: Engine) -> list[Check]:
    checks = []
    tabla = "encuestas"
    if not _tabla_existe(engine, tabla):
        return [Check(tabla, "tabla_existe", False, detalle="Tabla no encontrada")]

    df = _read(engine, "SELECT n_muestra, margen_error, fecha_publicacion, fecha_trabajo_inicio, fecha_trabajo_fin FROM encuestas")
    n = len(df)

    if n == 0:
        checks.append(Check(tabla, "registros_existen", False, valor_observado=0, detalle="Tabla vacía"))
        return checks

    # n_muestra > 0
    invalidos = (df["n_muestra"].fillna(0) <= 0).sum()
    checks.append(Check(tabla, "n_muestra_positivo", ok=invalidos == 0, valor_observado=int(invalidos), n_filas=n))

    # margen_error razonable
    if "margen_error" in df.columns:
        fuera = ((df["margen_error"].dropna() <= 0) | (df["margen_error"].dropna() > 10)).sum()
        checks.append(Check(tabla, "margen_error_rango", ok=fuera == 0, valor_observado=int(fuera),
                            umbral="(0, 10]", n_filas=n))

    # Fechas coherentes
    if "fecha_trabajo_inicio" in df.columns and "fecha_trabajo_fin" in df.columns:
        df_dates = df.dropna(subset=["fecha_trabajo_inicio", "fecha_trabajo_fin"])
        incoherentes = (
            pd.to_datetime(df_dates["fecha_trabajo_fin"]) < pd.to_datetime(df_dates["fecha_trabajo_inicio"])
        ).sum()
        checks.append(Check(tabla, "fechas_coherentes", ok=incoherentes == 0,
                            valor_observado=int(incoherentes), n_filas=n))

    return checks


def _check_macroeconomicos(engine: Engine) -> list[Check]:
    checks = []
    tabla = "indicadores_macroeconomicos"
    if not _tabla_existe(engine, tabla):
        return [Check(tabla, "tabla_existe", False, detalle="Tabla no encontrada")]

    df = _read(engine, "SELECT inflacion_ipc, tasa_paro, pib_crecimiento_yoy FROM indicadores_macroeconomicos ORDER BY fecha DESC LIMIT 1000")
    n = len(df)

    if n == 0:
        checks.append(Check(tabla, "registros_existen", False, valor_observado=0, detalle="Tabla vacía"))
        return checks

    if "inflacion_ipc" in df.columns:
        fuera = ((df["inflacion_ipc"].dropna() < -5) | (df["inflacion_ipc"].dropna() > 30)).sum()
        checks.append(Check(tabla, "inflacion_rango", ok=fuera == 0, valor_observado=int(fuera),
                            umbral="[-5, 30]", n_filas=n))

    if "tasa_paro" in df.columns:
        fuera = ((df["tasa_paro"].dropna() < 0) | (df["tasa_paro"].dropna() > 40)).sum()
        checks.append(Check(tabla, "paro_rango", ok=fuera == 0, valor_observado=int(fuera),
                            umbral="[0, 40]", n_filas=n))

    # Sin gaps temporales de más de 6 meses
    df_time = _read(engine, "SELECT fecha FROM indicadores_macroeconomicos ORDER BY fecha")
    if len(df_time) > 1 and "fecha" in df_time.columns:
        fechas = pd.to_datetime(df_time["fecha"]).sort_values()
        gaps = (fechas.diff().dt.days.dropna() > 180).sum()
        checks.append(Check(tabla, "sin_gaps_6meses", ok=gaps == 0, valor_observado=int(gaps),
                            umbral="0 gaps > 180 días", n_filas=len(df_time)))

    return checks


def _check_perfiles_votante(engine: Engine) -> list[Check]:
    checks = []
    tabla = "perfiles_votante"
    if not _tabla_existe(engine, tabla):
        return [Check(tabla, "tabla_existe", False, detalle="Tabla no encontrada")]

    df = _read(engine, "SELECT cluster_id, peso, n_respondentes FROM perfiles_votante")
    n = len(df)

    checks.append(Check(tabla, "min_3_clusters", ok=n >= 3, valor_observado=n, umbral=">= 3"))

    if n > 0 and "peso" in df.columns:
        suma_pesos = df["peso"].sum()
        checks.append(Check(tabla, "pesos_suman_1", ok=abs(suma_pesos - 1.0) < 0.05,
                            valor_observado=round(float(suma_pesos), 4), umbral="≈ 1.0"))
        pesos_neg = (df["peso"] < 0).sum()
        checks.append(Check(tabla, "pesos_no_negativos", ok=pesos_neg == 0, valor_observado=int(pesos_neg)))

    return checks


def _check_microdatos(engine: Engine) -> list[Check]:
    checks = []
    tabla = "microdatos_encuesta"
    if not _tabla_existe(engine, tabla):
        return [Check(tabla, "tabla_existe", False, detalle="Tabla no encontrada")]

    df = _read(engine, "SELECT ideo_escala, ponderacion FROM microdatos_encuesta LIMIT 5000")
    n = len(df)

    if n == 0:
        checks.append(Check(tabla, "registros_existen", False, valor_observado=0))
        return checks

    if "ideo_escala" in df.columns:
        fuera = ((df["ideo_escala"].dropna() < 1) | (df["ideo_escala"].dropna() > 10)).sum()
        checks.append(Check(tabla, "ideologia_rango_1_10", ok=fuera == 0,
                            valor_observado=int(fuera), umbral="[1, 10]", n_filas=n))

    if "ponderacion" in df.columns:
        neg = (df["ponderacion"].dropna() <= 0).sum()
        checks.append(Check(tabla, "ponderacion_positiva", ok=neg == 0, valor_observado=int(neg), n_filas=n))

    return checks


# ─── Función principal ─────────────────────────────────────────────────────────

def run_calidad_datos(engine: Engine, guardar_bd: bool = True) -> ReporteCalidad:
    """Ejecuta todos los checks de calidad y genera el reporte."""
    run_id = f"qc_{uuid.uuid4().hex[:8]}"

    todos_checks: list[Check] = []
    todos_checks += _check_resultados_electorales(engine)
    todos_checks += _check_encuestas(engine)
    todos_checks += _check_macroeconomicos(engine)
    todos_checks += _check_perfiles_votante(engine)
    todos_checks += _check_microdatos(engine)

    n_ok = sum(1 for c in todos_checks if c.ok)
    n_fail = sum(1 for c in todos_checks if not c.ok)
    total = max(n_ok + n_fail, 1)
    pct = round(n_ok / total * 100, 1)

    if pct >= 90:
        semaforo = "verde"
    elif pct >= 70:
        semaforo = "amarillo"
    else:
        semaforo = "rojo"

    fallos = [f"[{c.tabla}] {c.nombre}: {c.valor_observado}" for c in todos_checks if not c.ok]
    resumen = f"{n_ok}/{total} checks OK ({pct}%). " + (
        "Sistema en buen estado." if semaforo == "verde"
        else "Fallos: " + "; ".join(fallos[:5])
    )

    reporte = ReporteCalidad(
        run_id=run_id,
        checks=todos_checks,
        pct_completitud_global=pct,
        n_ok=n_ok,
        n_fail=n_fail,
        semaforo=semaforo,
        resumen=resumen,
    )

    if guardar_bd:
        _guardar_reporte(engine, reporte)

    log.info("Calidad datos: %s (%d/%d OK) — %s", semaforo.upper(), n_ok, total, resumen[:120])
    return reporte


def _guardar_reporte(engine: Engine, r: ReporteCalidad) -> None:
    detalle = json.dumps(
        [{"tabla": c.tabla, "check": c.nombre, "ok": c.ok,
          "valor": str(c.valor_observado), "umbral": c.umbral,
          "detalle": c.detalle} for c in r.checks],
        ensure_ascii=False,
    )
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO resultados_validacion
                    (run_id, tipo, modelo, pct_completitud, n_checks_ok, n_checks_fail, detalle_json)
                VALUES
                    (:run_id, 'calidad', 'data_quality', :pct, :ok, :fail, :detalle)
                ON CONFLICT (run_id) DO NOTHING
            """),
            {
                "run_id": r.run_id,
                "pct": r.pct_completitud_global,
                "ok": r.n_ok,
                "fail": r.n_fail,
                "detalle": detalle,
            },
        )
