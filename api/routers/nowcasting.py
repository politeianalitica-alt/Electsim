"""
Nowcasting, coaliciones, macro, KPI, and geopolitics endpoints.
"""
from __future__ import annotations

import os
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import create_engine, text

router = APIRouter(prefix="/api/v1", tags=["nowcasting"])


def _engine():
    dsn = os.getenv("DATABASE_URL", "")
    if not dsn:
        return None
    try:
        return create_engine(dsn, pool_pre_ping=True, connect_args={"connect_timeout": 3})
    except Exception:
        return None


# ─── Nowcasting ──────────────────────────────────────────────────────────────

@router.get("/nowcasting/current")
def nowcasting_current() -> list[dict]:
    """Latest vote estimates per party with CI 95%."""
    engine = _engine()
    if engine:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT
                        p.siglas        AS partido,
                        e.estimacion_pct,
                        e.ic_95_inf,
                        e.ic_95_sup,
                        e.fecha_estimacion,
                        e.n_encuestas,
                        e.modelo
                    FROM estimaciones_voto_agregadas e
                    JOIN partidos p ON p.id = e.partido_id
                    WHERE e.fecha_estimacion = (
                        SELECT MAX(fecha_estimacion) FROM estimaciones_voto_agregadas
                    )
                    ORDER BY e.estimacion_pct DESC NULLS LAST
                """)).fetchall()
                if rows:
                    _colors = {"PP": "#1F77FF", "PSOE": "#E03A3E", "VOX": "#5BC035", "SUMAR": "#D81E5B", "ERC": "#F4B400", "PNV": "#1D8042", "BILDU": "#A4D65E", "JUNTS": "#00C2A8"}
                    result = []
                    for r in rows:
                        d = dict(r._mapping)
                        d["color"] = _colors.get(str(d.get("partido", "")), "#94A3B8")
                        result.append(d)
                    return result
        except Exception:
            pass

    # Demo fallback — latest CIS + aggregated estimates
    return [
        {"partido": "PP",    "color": "#1F77FF", "estimacion_pct": 33.2, "ic_95_inf": 32.1, "ic_95_sup": 34.3, "fecha_estimacion": str(date.today()), "n_encuestas": 8, "modelo": "agregado"},
        {"partido": "PSOE",  "color": "#E03A3E", "estimacion_pct": 28.5, "ic_95_inf": 27.4, "ic_95_sup": 29.6, "fecha_estimacion": str(date.today()), "n_encuestas": 8, "modelo": "agregado"},
        {"partido": "VOX",   "color": "#5BC035", "estimacion_pct": 11.3, "ic_95_inf": 10.4, "ic_95_sup": 12.2, "fecha_estimacion": str(date.today()), "n_encuestas": 8, "modelo": "agregado"},
        {"partido": "Sumar", "color": "#D81E5B", "estimacion_pct": 9.8,  "ic_95_inf": 9.0,  "ic_95_sup": 10.6, "fecha_estimacion": str(date.today()), "n_encuestas": 8, "modelo": "agregado"},
        {"partido": "Junts", "color": "#00C2A8", "estimacion_pct": 3.2,  "ic_95_inf": 2.8,  "ic_95_sup": 3.6,  "fecha_estimacion": str(date.today()), "n_encuestas": 8, "modelo": "agregado"},
        {"partido": "ERC",   "color": "#F4B400", "estimacion_pct": 2.9,  "ic_95_inf": 2.5,  "ic_95_sup": 3.3,  "fecha_estimacion": str(date.today()), "n_encuestas": 8, "modelo": "agregado"},
        {"partido": "PNV",   "color": "#1D8042", "estimacion_pct": 1.8,  "ic_95_inf": 1.5,  "ic_95_sup": 2.1,  "fecha_estimacion": str(date.today()), "n_encuestas": 8, "modelo": "agregado"},
        {"partido": "Bildu", "color": "#A4D65E", "estimacion_pct": 1.6,  "ic_95_inf": 1.3,  "ic_95_sup": 1.9,  "fecha_estimacion": str(date.today()), "n_encuestas": 8, "modelo": "agregado"},
    ]


@router.get("/nowcasting/serie/{partido}")
def nowcasting_serie(
    partido: str,
    dias: int = Query(90, ge=7, le=365)
) -> list[dict]:
    """Time series for one party over last N days."""
    engine = _engine()
    since = date.today() - timedelta(days=dias)
    if engine:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT e.fecha_estimacion, e.estimacion_pct, e.ic_95_inf, e.ic_95_sup
                    FROM estimaciones_voto_agregadas e
                    JOIN partidos p ON p.id = e.partido_id
                    WHERE LOWER(p.siglas) = LOWER(:partido)
                      AND e.fecha_estimacion >= :since
                    ORDER BY e.fecha_estimacion ASC
                """), {"partido": partido, "since": since}).fetchall()
                if rows:
                    return [dict(r._mapping) for r in rows]
        except Exception:
            pass

    # Demo fallback: synthetic time series
    import random
    random.seed(hash(partido) % 1000)
    base_val = {"pp": 33.2, "psoe": 28.5, "vox": 11.3, "sumar": 9.8}.get(partido.lower(), 5.0)
    result = []
    val = base_val - random.uniform(1, 3)
    for d in range(dias, 0, -7):
        val += random.uniform(-0.5, 0.5)
        val = round(max(1, min(60, val)), 2)
        dt = date.today() - timedelta(days=d)
        result.append({
            "fecha_estimacion": str(dt),
            "estimacion_pct": val,
            "ic_95_inf": round(val - 1.2, 2),
            "ic_95_sup": round(val + 1.2, 2),
        })
    return result


@router.get("/nowcasting/casas/cobertura")
def nowcasting_casas() -> list[dict]:
    """Polling house rankings by sample size and track record."""
    engine = _engine()
    if engine:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT
                        casa_encuestadora,
                        COUNT(*) AS n_encuestas,
                        AVG(muestra) AS muestra_media,
                        MAX(fecha_campo_fin) AS ultima_encuesta
                    FROM encuestas_electorales
                    WHERE fecha_campo_fin >= NOW() - INTERVAL '180 days'
                    GROUP BY casa_encuestadora
                    ORDER BY n_encuestas DESC
                    LIMIT 20
                """)).fetchall()
                if rows:
                    return [dict(r._mapping) for r in rows]
        except Exception:
            pass

    return [
        {"casa_encuestadora": "40dB / El País",     "n_encuestas": 12, "muestra_media": 4200, "ultima_encuesta": str(date.today() - timedelta(days=5))},
        {"casa_encuestadora": "IPSOS / Público",    "n_encuestas": 10, "muestra_media": 3800, "ultima_encuesta": str(date.today() - timedelta(days=8))},
        {"casa_encuestadora": "Metroscopia",        "n_encuestas": 8,  "muestra_media": 3200, "ultima_encuesta": str(date.today() - timedelta(days=12))},
        {"casa_encuestadora": "GAD3 / ABC",         "n_encuestas": 11, "muestra_media": 2900, "ultima_encuesta": str(date.today() - timedelta(days=3))},
        {"casa_encuestadora": "Simple Lógica / EP", "n_encuestas": 7,  "muestra_media": 4100, "ultima_encuesta": str(date.today() - timedelta(days=15))},
        {"casa_encuestadora": "Sigma Dos / Mundo",  "n_encuestas": 9,  "muestra_media": 3500, "ultima_encuesta": str(date.today() - timedelta(days=7))},
        {"casa_encuestadora": "DYM / Cope",         "n_encuestas": 6,  "muestra_media": 2800, "ultima_encuesta": str(date.today() - timedelta(days=20))},
    ]


# ─── Coaliciones ─────────────────────────────────────────────────────────────

@router.get("/coaliciones/viables")
def coaliciones_viables() -> dict:
    """Current seat distribution + viable coalition scenarios."""
    engine = _engine()

    # Try to get latest seat projections from MC simulations
    seats_data: list[dict] = []
    if engine:
        try:
            with engine.connect() as conn:
                # Latest MC simulation result
                rows = conn.execute(text("""
                    SELECT s.partido_id, p.nombre_corto AS partido, p.color_hex AS color,
                           s.escanos_mediana AS escanos,
                           s.escanos_p5, s.escanos_p95
                    FROM simulaciones_mc_escanos s
                    JOIN partidos p ON p.id = s.partido_id
                    WHERE s.simulacion_id = (
                        SELECT id FROM escenarios_generados
                        ORDER BY created_at DESC LIMIT 1
                    )
                    ORDER BY s.escanos_mediana DESC NULLS LAST
                """)).fetchall()
                if rows:
                    seats_data = [dict(r._mapping) for r in rows]
        except Exception:
            pass

    if not seats_data:
        seats_data = [
            {"partido": "PP",     "color": "#1F77FF", "escanos": 137, "escanos_p5": 128, "escanos_p95": 146},
            {"partido": "PSOE",   "color": "#E03A3E", "escanos": 121, "escanos_p5": 112, "escanos_p95": 130},
            {"partido": "VOX",    "color": "#5BC035", "escanos": 33,  "escanos_p5": 27,  "escanos_p95": 39},
            {"partido": "Sumar",  "color": "#D81E5B", "escanos": 27,  "escanos_p5": 22,  "escanos_p95": 33},
            {"partido": "Junts",  "color": "#00C2A8", "escanos": 7,   "escanos_p5": 5,   "escanos_p95": 9},
            {"partido": "ERC",    "color": "#F4B400", "escanos": 7,   "escanos_p5": 5,   "escanos_p95": 9},
            {"partido": "Bildu",  "color": "#A4D65E", "escanos": 6,   "escanos_p5": 4,   "escanos_p95": 8},
            {"partido": "PNV",    "color": "#1D8042", "escanos": 5,   "escanos_p5": 4,   "escanos_p95": 6},
            {"partido": "BNG",    "color": "#7AC143", "escanos": 1,   "escanos_p5": 0,   "escanos_p95": 2},
            {"partido": "Otros",  "color": "#94A3B8", "escanos": 6,   "escanos_p5": 4,   "escanos_p95": 8},
        ]

    # Try to get coalition analyses from DB
    coalitions: list[dict] = []
    if engine:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT
                        partidos_coalicion AS members,
                        escanos_totales AS total,
                        distancia_ideologica AS distancia,
                        score_viabilidad AS probability,
                        es_minima
                    FROM analisis_coaliciones
                    ORDER BY score_viabilidad DESC NULLS LAST
                    LIMIT 8
                """)).fetchall()
                if rows:
                    for r in rows:
                        m = r._mapping
                        members = m["members"].split(",") if m["members"] else []
                        coalitions.append({
                            "members": [x.strip() for x in members],
                            "total": m["total"] or 0,
                            "distancia": float(m["distancia"] or 0),
                            "probability": round(float(m["probability"] or 0) * 100) if (m["probability"] or 0) <= 1 else int(m["probability"] or 0),
                            "es_minima": bool(m["es_minima"]),
                            "conflicts": [],
                        })
        except Exception:
            pass

    if not coalitions:
        total_seats = sum(s["escanos"] for s in seats_data)
        majority = (total_seats // 2) + 1
        coalitions = [
            {"members": ["PSOE", "Sumar", "ERC", "Bildu", "PNV", "BNG"], "total": 167, "distancia": 28, "probability": 62, "es_minima": False, "conflicts": ["Memoria democrática", "Financiación"]},
            {"members": ["PP", "VOX"],                                     "total": 170, "distancia": 18, "probability": 71, "es_minima": True,  "conflicts": ["Política UE", "Clima"]},
            {"members": ["PSOE", "Sumar", "Junts", "ERC", "PNV", "Bildu"],"total": 173, "distancia": 38, "probability": 48, "es_minima": False, "conflicts": ["Independencia", "Fiscal"]},
            {"members": ["PP", "VOX", "Junts"],                            "total": 177, "distancia": 52, "probability": 22, "es_minima": False, "conflicts": ["Idioma", "Inmigración"]},
            {"members": ["PP", "PSOE"],                                    "total": 258, "distancia": 45, "probability": 12, "es_minima": True,  "conflicts": ["Coalición improbable"]},
        ]

    total_seats = sum(s["escanos"] for s in seats_data)
    majority = (total_seats // 2) + 1

    # Compute pivotal party: appears in most viable coalitions (prob >= 40)
    viable = [c for c in coalitions if c["probability"] >= 40]
    from collections import Counter
    pivot_counts: Counter = Counter()
    for c in viable:
        for m in c["members"]:
            pivot_counts[m] += 1
    pivotal = pivot_counts.most_common(1)[0][0] if pivot_counts else "Junts"
    pivotal_count = pivot_counts.get(pivotal, 0)

    return {
        "seats": seats_data,
        "total_seats": total_seats,
        "majority": majority,
        "coalitions": coalitions,
        "pivotal_party": pivotal,
        "pivotal_coalition_count": pivotal_count,
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.get("/coaliciones/votos")
def votos_recientes() -> list[dict]:
    """Recent congressional vote patterns by party."""
    engine = _engine()
    if engine:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT
                        v.titulo AS topic,
                        jsonb_object_agg(p.nombre_corto, vp.voto) AS votes,
                        v.fecha_votacion
                    FROM votaciones_parlamentarias v
                    JOIN votos_por_partido vp ON vp.votacion_id = v.id
                    JOIN partidos p ON p.id = vp.partido_id
                    GROUP BY v.id, v.titulo, v.fecha_votacion
                    ORDER BY v.fecha_votacion DESC
                    LIMIT 10
                """)).fetchall()
                if rows:
                    return [dict(r._mapping) for r in rows]
        except Exception:
            pass

    return [
        {"topic": "Reforma fiscal",      "votes": {"PSOE": "S", "PP": "N", "VOX": "N", "Sumar": "S", "Junts": "A", "ERC": "S", "Bildu": "S", "PNV": "A"}},
        {"topic": "Ley Vivienda",         "votes": {"PSOE": "S", "PP": "N", "VOX": "N", "Sumar": "S", "Junts": "N", "ERC": "S", "Bildu": "S", "PNV": "S"}},
        {"topic": "RDL fondos UE",        "votes": {"PSOE": "S", "PP": "A", "VOX": "N", "Sumar": "S", "Junts": "S", "ERC": "S", "Bildu": "S", "PNV": "S"}},
        {"topic": "Memoria Democrática",  "votes": {"PSOE": "S", "PP": "N", "VOX": "N", "Sumar": "S", "Junts": "A", "ERC": "S", "Bildu": "S", "PNV": "S"}},
        {"topic": "Reforma reglamento",   "votes": {"PSOE": "S", "PP": "S", "VOX": "N", "Sumar": "S", "Junts": "A", "ERC": "A", "Bildu": "A", "PNV": "S"}},
        {"topic": "Salario mínimo",       "votes": {"PSOE": "S", "PP": "N", "VOX": "N", "Sumar": "S", "Junts": "A", "ERC": "S", "Bildu": "S", "PNV": "S"}},
        {"topic": "Defensa OTAN",         "votes": {"PSOE": "S", "PP": "S", "VOX": "S", "Sumar": "N", "Junts": "A", "ERC": "N", "Bildu": "N", "PNV": "S"}},
        {"topic": "Ley Amnistía",         "votes": {"PSOE": "S", "PP": "N", "VOX": "N", "Sumar": "S", "Junts": "S", "ERC": "S", "Bildu": "S", "PNV": "A"}},
        {"topic": "Sanidad pública",      "votes": {"PSOE": "S", "PP": "A", "VOX": "N", "Sumar": "S", "Junts": "S", "ERC": "S", "Bildu": "S", "PNV": "S"}},
        {"topic": "Ley audiovisual",      "votes": {"PSOE": "S", "PP": "N", "VOX": "N", "Sumar": "S", "Junts": "A", "ERC": "S", "Bildu": "S", "PNV": "S"}},
    ]


# ─── Macroeconomía ───────────────────────────────────────────────────────────

@router.get("/macro/ultimo")
def macro_ultimo() -> dict:
    """Latest macroeconomic indicators for Spain."""
    engine = _engine()
    if engine:
        try:
            with engine.connect() as conn:
                # Try kpis_operativos or similar table
                row = conn.execute(text("""
                    SELECT fecha, ipc_general, ipc_subyacente, tasa_paro,
                           pib_per_capita, crecimiento_pib,
                           prima_riesgo_bono10, euribor_12m,
                           deficit_publico_pib, deuda_publica_pib,
                           ibex35_cierre, tipo_referencia_bce, fuente
                    FROM indicadores_macroeconomicos
                    ORDER BY fecha DESC LIMIT 1
                """)).fetchone()
                if row:
                    m = row._mapping
                    def _f(v): return float(v) if v is not None else None  # noqa: E731
                    indicators = {
                        "ipc_general":     {"label": "IPC interanual",  "valor": _f(m["ipc_general"]),    "unidad": "%",  "fuente": str(m["fuente"] or "INE"), "fecha": str(m["fecha"])},
                        "ipc_subyacente":  {"label": "IPC subyacente",  "valor": _f(m["ipc_subyacente"]), "unidad": "%",  "fuente": "INE", "fecha": str(m["fecha"])},
                        "tasa_paro":       {"label": "Tasa de paro",    "valor": _f(m["tasa_paro"]),      "unidad": "%",  "fuente": "EPA/INE", "fecha": str(m["fecha"])},
                        "pib_per_capita":  {"label": "PIB per cápita",  "valor": _f(m["pib_per_capita"]), "unidad": "€",  "fuente": "INE", "fecha": str(m["fecha"])},
                        "crecimiento_pib": {"label": "PIB crecimiento", "valor": _f(m["crecimiento_pib"]),"unidad": "%",  "fuente": "INE", "fecha": str(m["fecha"])},
                        "prima_riesgo":    {"label": "Prima de riesgo", "valor": _f(m["prima_riesgo_bono10"]), "unidad": "pb", "fuente": "BdE", "fecha": str(m["fecha"])},
                        "euribor_12m":     {"label": "Euribor 12m",     "valor": _f(m["euribor_12m"]),    "unidad": "%",  "fuente": "BCE", "fecha": str(m["fecha"])},
                        "deficit_pib":     {"label": "Déficit/PIB",     "valor": _f(m["deficit_publico_pib"]), "unidad": "%", "fuente": "AIReF", "fecha": str(m["fecha"])},
                        "deuda_pib":       {"label": "Deuda/PIB",       "valor": _f(m["deuda_publica_pib"]),  "unidad": "%", "fuente": "BdE", "fecha": str(m["fecha"])},
                    }
                    return {"indicadores": indicators, "updated_at": datetime.utcnow().isoformat()}
        except Exception:
            pass

    return {
        "indicadores": {
            "pib_crecimiento": {"label": "PIB crecimiento", "valor": 2.7, "variacion": 0.2, "unidad": "%", "fuente": "INE", "fecha": str(date.today().replace(month=3, day=31))},
            "tasa_paro":       {"label": "Tasa de paro",   "valor": 11.6, "variacion": -0.1, "unidad": "%", "fuente": "EPA/INE", "fecha": str(date.today().replace(month=3, day=31))},
            "ipc":             {"label": "IPC interanual", "valor": 3.1, "variacion": 0.2, "unidad": "%", "fuente": "INE", "fecha": str(date.today().replace(day=1))},
            "deuda_pib":       {"label": "Deuda/PIB",      "valor": 107.4, "variacion": -1.2, "unidad": "%", "fuente": "BdE", "fecha": "2025-12-31"},
            "deficit_pib":     {"label": "Déficit/PIB",    "valor": -3.3, "variacion": 0.3, "unidad": "%", "fuente": "AIReF", "fecha": "2025-12-31"},
            "prima_riesgo":    {"label": "Prima de riesgo","valor": 78, "variacion": 3, "unidad": "pb", "fuente": "Bloomberg", "fecha": str(date.today())},
        },
        "updated_at": datetime.utcnow().isoformat(),
    }


# ─── KPIs operativos (dashboard strip) ───────────────────────────────────────

@router.get("/kpis/pulso-operativo")
def kpis_pulso_operativo() -> list[dict]:
    """Live KPI strip: vote intent leader, polarization, media volatility, sentiment, media volume + sparklines."""
    engine = _engine()
    kpis: list[dict] = []

    if engine:
        try:
            with engine.connect() as conn:
                # Top party vote intent with 7-point sparkline (weekly)
                rows = conn.execute(text("""
                    WITH ranked AS (
                        SELECT
                            p.siglas AS partido,
                            e.estimacion_pct AS valor,
                            e.fecha_estimacion,
                            ROW_NUMBER() OVER (PARTITION BY e.partido_id ORDER BY e.fecha_estimacion DESC) AS rn
                        FROM estimaciones_voto_agregadas e
                        JOIN partidos p ON p.id = e.partido_id
                    )
                    SELECT partido, valor FROM ranked
                    WHERE rn = 1
                    ORDER BY valor DESC NULLS LAST
                    LIMIT 1
                """)).fetchone()

                spark_rows = conn.execute(text("""
                    SELECT e.estimacion_pct
                    FROM estimaciones_voto_agregadas e
                    JOIN (SELECT id FROM partidos ORDER BY (
                        SELECT estimacion_pct FROM estimaciones_voto_agregadas e2
                        WHERE e2.partido_id = id ORDER BY fecha_estimacion DESC LIMIT 1
                    ) DESC NULLS LAST LIMIT 1) top_partido ON top_partido.id = e.partido_id
                    ORDER BY e.fecha_estimacion DESC
                    LIMIT 7
                """)).fetchall()

                if rows:
                    spark = [float(r[0]) for r in reversed(spark_rows)] if spark_rows else []
                    delta = round(float(rows[0]) - spark[0], 2) if len(spark) >= 2 else 0
                    kpis.append({
                        "label": f"Intención voto {rows[1] if len(rows) > 1 else 'líder'}",
                        "value": float(rows[0]),
                        "format": "pct",
                        "delta": delta,
                        "spark": spark,
                    })
        except Exception:
            pass

    if not kpis:
        kpis = [
            {"label": "Intención voto líder", "value": 33.2, "format": "pct",   "delta": 0.4,  "spark": [32.1, 32.4, 32.6, 32.5, 32.8, 33.0, 33.2]},
            {"label": "Polarización",          "value": 0.68, "format": "score", "delta": 0.03, "spark": [0.61, 0.62, 0.63, 0.64, 0.66, 0.67, 0.68]},
            {"label": "Volatilidad mediática", "value": 24.1, "format": "score", "delta": -1.2, "spark": [25.5, 25.0, 24.8, 24.5, 24.3, 24.2, 24.1]},
            {"label": "Sentimiento gobierno",  "value": -0.18,"format": "score", "delta": -0.04,"spark": [-0.12, -0.13, -0.14, -0.15, -0.16, -0.17, -0.18]},
            {"label": "Volumen mediático 24h", "value": 14820,"format": "num",   "delta": 12.3, "spark": [11200, 11800, 12400, 12900, 13500, 14100, 14820]},
            {"label": "Riesgo político",       "value": 67,   "format": "score", "delta": 3,    "spark": [52, 55, 58, 61, 63, 65, 67]},
        ]

        # Try to enrich with real social/media volume
        if engine:
            try:
                with engine.connect() as conn:
                    vol = conn.execute(text("""
                        SELECT COUNT(*) AS total,
                               AVG(score_sentimiento) AS sentimiento_medio
                        FROM social_posts
                        WHERE fecha_publicacion >= NOW() - INTERVAL '24 hours'
                    """)).fetchone()
                    if vol and vol[0]:
                        kpis[4]["value"] = int(vol[0])
                        if vol[1]:
                            kpis[3]["value"] = round(float(vol[1]), 3)
                        # Build spark from last 7 days hourly buckets
                        spark_v = conn.execute(text("""
                            SELECT COUNT(*) FROM social_posts
                            WHERE fecha_publicacion >= NOW() - INTERVAL :days
                            GROUP BY date_trunc('day', fecha_publicacion)
                            ORDER BY 1
                        """), {"days": "7 days"}).fetchall()
                        if spark_v:
                            kpis[4]["spark"] = [int(r[0]) for r in spark_v]
            except Exception:
                pass

    # Enrich risk KPI with live data from informes_riesgo_politico
    if engine and len(kpis) >= 6:
        try:
            with engine.connect() as conn:
                risk_row = conn.execute(text("""
                    SELECT score_global, created_at
                    FROM informes_riesgo_politico
                    ORDER BY created_at DESC LIMIT 1
                """)).fetchone()
                if risk_row and risk_row[0]:
                    spark_r = conn.execute(text("""
                        SELECT score_global FROM informes_riesgo_politico
                        ORDER BY created_at DESC LIMIT 7
                    """)).fetchall()
                    spark_vals = [float(r[0]) for r in reversed(spark_r)]
                    delta = round(spark_vals[-1] - spark_vals[0], 1) if len(spark_vals) >= 2 else 0
                    kpis[5]["value"] = int(risk_row[0])
                    kpis[5]["delta"] = delta
                    kpis[5]["spark"] = spark_vals
        except Exception:
            pass

    return kpis


# ─── Geopolítica ──────────────────────────────────────────────────────────────

@router.get("/geopolitica/eventos")
def geo_eventos(dias: int = Query(7, ge=1, le=90)) -> list[dict]:
    """Recent geopolitical events with Spain impact score."""
    engine = _engine()
    if engine:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT
                        ge.titulo AS description,
                        ge.pais_principal AS country,
                        ge.tipo_evento AS type,
                        ge.impacto_espana AS impact,
                        ge.fecha_evento AS date,
                        ge.severidad
                    FROM geo_events ge
                    WHERE ge.fecha_evento >= NOW() - INTERVAL :dias
                    ORDER BY ge.impacto_espana DESC NULLS LAST, ge.fecha_evento DESC
                    LIMIT 20
                """), {"dias": f"{dias} days"}).fetchall()
                if rows:
                    return [dict(r._mapping) for r in rows]
        except Exception:
            pass

    return [
        {"description": "Ofensiva rusa en Donbass amplía línea de frente 8km", "country": "Ucrania",       "type": "Conflicto",  "impact": 78, "date": str(date.today()), "severidad": "alta"},
        {"description": "Negociación rehenes se rompe; expansión operación terrestre", "country": "Israel-Gaza", "type": "Conflicto",  "impact": 72, "date": str(date.today()), "severidad": "alta"},
        {"description": "Trump anuncia aranceles 25% importaciones UE selectivas",    "country": "EE.UU.",      "type": "Política",   "impact": 81, "date": str(date.today() - timedelta(days=1)), "severidad": "alta"},
        {"description": "Movimientos navales en aguas Sáhara generan tensión bilateral", "country": "Marruecos", "type": "Diplomático", "impact": 64, "date": str(date.today() - timedelta(days=1)), "severidad": "media"},
        {"description": "Maduro acelera elecciones; oposición denuncia inhabilitaciones", "country": "Venezuela", "type": "Crisis",   "impact": 52, "date": str(date.today() - timedelta(days=2)), "severidad": "media"},
        {"description": "Ataque yihadista en Burkina Faso deja 35 víctimas",           "country": "Sahel",       "type": "Conflicto",  "impact": 48, "date": str(date.today() - timedelta(days=2)), "severidad": "media"},
        {"description": "China ejecuta nuevos ejercicios navales en estrecho",         "country": "Taiwán",      "type": "Militar",    "impact": 67, "date": str(date.today() - timedelta(days=3)), "severidad": "media"},
        {"description": "Argentina-Milei firma acuerdo bilateral con EE.UU.",         "country": "Latam",       "type": "Económico",  "impact": 41, "date": str(date.today() - timedelta(days=3)), "severidad": "baja"},
    ]


@router.get("/geopolitica/riesgo-pais")
def geo_riesgo_pais() -> list[dict]:
    """Country risk scores."""
    engine = _engine()
    if engine:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT
                        grc.iso_code AS code,
                        grc.nombre AS name,
                        grc.score_riesgo AS risk,
                        grc.estado_conflicto AS status,
                        grc.updated_at
                    FROM geo_risk_countries grc
                    ORDER BY grc.score_riesgo DESC NULLS LAST
                    LIMIT 24
                """)).fetchall()
                if rows:
                    return [dict(r._mapping) for r in rows]
        except Exception:
            pass

    return [
        {"code": "PS", "name": "Gaza/Palestina", "risk": 95, "status": "war"},
        {"code": "UA", "name": "Ucrania",         "risk": 92, "status": "war"},
        {"code": "RU", "name": "Rusia",           "risk": 88, "status": "war"},
        {"code": "ML", "name": "Sahel (Mali)",    "risk": 84, "status": "war"},
        {"code": "IR", "name": "Irán",            "risk": 76, "status": "tense"},
        {"code": "TW", "name": "Taiwán",          "risk": 71, "status": "tense"},
        {"code": "VE", "name": "Venezuela",       "risk": 68, "status": "tense"},
        {"code": "CN", "name": "China",           "risk": 62, "status": "watch"},
        {"code": "MA", "name": "Marruecos",       "risk": 58, "status": "tense"},
        {"code": "TR", "name": "Turquía",         "risk": 51, "status": "watch"},
        {"code": "US", "name": "EE.UU.",          "risk": 49, "status": "watch"},
        {"code": "MX", "name": "México",          "risk": 44, "status": "watch"},
    ]


@router.get("/geopolitica/presencia-espana")
def geo_presencia_espana() -> list[dict]:
    """Spanish geopolitical presence and interests abroad."""
    engine = _engine()
    if engine:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT territorio, estado, nivel_alerta AS level
                    FROM geo_presencia_espanola
                    ORDER BY nivel_alerta DESC
                """)).fetchall()
                if rows:
                    return [dict(r._mapping) for r in rows]
        except Exception:
            pass

    return [
        {"territory": "Sáhara Occidental",        "status": "Disputa diplomática activa",                "level": "high"},
        {"territory": "Gibraltar",                 "status": "Acuerdo post-Brexit en negociación",        "level": "medium"},
        {"territory": "Ceuta y Melilla",           "status": "Presión migratoria estable",                "level": "medium"},
        {"territory": "Latinoamérica (cumbres)",   "status": "Tensión Venezuela y Argentina-España",      "level": "high"},
        {"territory": "OTAN flanco sur",           "status": "Compromiso 2% PIB defensa pendiente",       "level": "medium"},
        {"territory": "UE Comisión 2026",          "status": "Posicionamiento agenda climática y migratoria", "level": "low"},
    ]


@router.get("/geopolitica/kpis")
def geo_kpis() -> dict:
    """Geopolitics KPI summary."""
    engine = _engine()
    if engine:
        try:
            with engine.connect() as conn:
                row = conn.execute(text("""
                    SELECT
                        COUNT(*) FILTER (WHERE severidad = 'alta' AND fecha_evento >= NOW() - INTERVAL '24 hours') AS eventos_criticos_24h,
                        COUNT(DISTINCT pais_principal) FILTER (WHERE tendencia = 'escalada') AS paises_escalada,
                        COUNT(*) FILTER (WHERE estado_conflicto = 'guerra') AS conflictos_activos,
                        COUNT(*) FILTER (WHERE afecta_espana = TRUE) AS sanctions_espana
                    FROM geo_events ge
                    LEFT JOIN geo_risk_countries grc ON grc.iso_code = ge.iso_code
                    WHERE ge.fecha_evento >= NOW() - INTERVAL '7 days'
                """)).fetchone()
                if row and row[0] is not None:
                    return {
                        "eventos_criticos_24h": int(row[0] or 0),
                        "paises_escalada": int(row[1] or 0),
                        "conflictos_activos": int(row[2] or 0),
                        "sanctions_espana": int(row[3] or 0),
                    }
        except Exception:
            pass

    return {
        "eventos_criticos_24h": 18,
        "paises_escalada": 7,
        "conflictos_activos": 23,
        "sanctions_espana": 12,
    }
