"""
Router /api/dashboard — endpoint consolidado para la página de inicio (visual-oscar).

Devuelve TODO lo que necesita el dashboard en una sola llamada:
- parties (estimaciones recientes con colores y bloque)
- kpis (escaños PP/PSOE, distancia, P(gobierna))
- alerts (alertas activas desde alertas_sistema)
- polls (últimas encuestas con desglose por partido)
- macro (indicadores macroeconómicos con sparkline)
- regions (mapa territorial CCAA con ganador estimado)
- coalitions (escenarios de mayoría desde analisis_coaliciones)
- risk (índice compuesto y semáforo)
- last_updated (timestamp ISO)
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text

from api.dependencies import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# ── Mapa partido_id → metadatos visuales (colores y bloque) ───────────────────
_PARTY_VIS: dict[int, dict] = {
    1:  {"color": "#E30613", "bloque": "izquierda"},  # PSOE
    2:  {"color": "#009FDB", "bloque": "derecha"},     # PP
    3:  {"color": "#63BE21", "bloque": "derecha"},     # VOX
    4:  {"color": "#E4007C", "bloque": "izquierda"},   # SUMAR
    5:  {"color": "#FF8A00", "bloque": "centro"},      # CS
    6:  {"color": "#F4B20A", "bloque": "izquierda"},   # ERC
    7:  {"color": "#00AEEF", "bloque": "otros"},       # JUNTS
    8:  {"color": "#007A3D", "bloque": "otros"},       # PNV
    9:  {"color": "#73C6EE", "bloque": "izquierda"},   # BNG
}

# ── Probabilidad simulada: P(PP gobierna) basado en distancia al 176 ──────────
def _prob_gobierna(seats_pp: int, seats_psoe: int) -> int:
    """Heurística simple: mayor ventaja PP → mayor probabilidad."""
    diff = seats_pp - seats_psoe
    if diff >= 30: return 88
    if diff >= 20: return 78
    if diff >= 10: return 65
    if diff >= 0:  return 52
    if diff >= -10: return 38
    if diff >= -20: return 22
    return 12


@router.get("/home")
def dashboard_home(db=Depends(get_db)) -> dict[str, Any]:
    """Endpoint consolidado de la página de inicio."""
    now = datetime.now(timezone.utc).isoformat()
    out: dict[str, Any] = {"last_updated": now, "_warnings": []}

    # ── 1. Parties: última estimación enriquecida ─────────────────────────────
    try:
        latest = db.execute(
            text("SELECT MAX(fecha_estimacion) AS d FROM estimaciones_voto_agregadas")
        ).mappings().fetchone()
        latest_date = latest["d"] if latest else None
        if latest_date:
            rows = db.execute(
                text("""
                    SELECT e.partido_id, e.estimacion_pct, p.siglas, p.nombre_completo
                    FROM estimaciones_voto_agregadas e
                    LEFT JOIN partidos p ON p.id = e.partido_id
                    WHERE e.fecha_estimacion = :d
                    ORDER BY e.estimacion_pct DESC
                """),
                {"d": latest_date},
            ).mappings().all()

            # Fecha previa para delta
            prev = db.execute(
                text("""
                    SELECT DISTINCT fecha_estimacion FROM estimaciones_voto_agregadas
                    WHERE fecha_estimacion < :d ORDER BY fecha_estimacion DESC LIMIT 1
                """),
                {"d": latest_date},
            ).mappings().fetchone()
            prev_map: dict[int, float] = {}
            if prev:
                prev_rows = db.execute(
                    text("SELECT partido_id, estimacion_pct FROM estimaciones_voto_agregadas WHERE fecha_estimacion = :d"),
                    {"d": prev["fecha_estimacion"]},
                ).mappings().all()
                prev_map = {r["partido_id"]: float(r["estimacion_pct"]) for r in prev_rows}

            total = sum(float(r["estimacion_pct"]) for r in rows)
            parties = []
            for r in rows:
                pid = r["partido_id"]
                pct = float(r["estimacion_pct"])
                vis = _PARTY_VIS.get(pid, {"color": "#9E9E9E", "bloque": "otros"})
                seats = round((pct / total) * 350) if total > 0 else 0
                margin = max(2, round(seats * 0.04))
                prev_pct = prev_map.get(pid, pct)
                parties.append({
                    "partido_id":  pid,
                    "siglas":      r["siglas"] or f"P{pid}",
                    "nombre":      r["nombre_completo"] or r["siglas"] or f"P{pid}",
                    "pct":         round(pct, 2),
                    "ci_inf":      round(pct - 1.5, 2),
                    "ci_sup":      round(pct + 1.5, 2),
                    "seats":       seats,
                    "seats_low":   max(0, seats - margin),
                    "seats_high":  seats + margin,
                    "color":       vis["color"],
                    "bloque":      vis["bloque"],
                    "delta":       round(pct - prev_pct, 2),
                })
            out["parties"] = parties
            out["fecha_estimacion"] = str(latest_date)
        else:
            out["parties"] = []
            out["_warnings"].append("estimaciones_voto_agregadas vacía")
    except Exception as e:
        out["parties"] = []
        out["_warnings"].append(f"parties: {e}")

    # ── 2. KPIs derivados ─────────────────────────────────────────────────────
    parties = out.get("parties") or []
    pp = next((p for p in parties if p["siglas"] == "PP"), None)
    psoe = next((p for p in parties if p["siglas"] == "PSOE"), None)
    if pp and psoe:
        out["kpis"] = [
            {"label": "Escaños PP",        "value": pp["seats"],   "sub": f"de 350 · {_format_delta(pp['delta'])} pp", "accent": "#0070D1"},
            {"label": "Escaños PSOE",      "value": psoe["seats"], "sub": f"de 350 · {_format_delta(psoe['delta'])} pp", "accent": "#C01818"},
            {"label": "Distancia PP–PSOE", "value": pp["seats"] - psoe["seats"], "sub": "escaños · margen sólido", "accent": "#8B5CF6"},
            {"label": "P(PP gobierna)",    "value": f"{_prob_gobierna(pp['seats'], psoe['seats'])}%", "sub": "probabilidad simulada", "accent": "#16A34A"},
        ]
    else:
        out["kpis"] = []

    # ── 3. Alerts: activas desde alertas_sistema ──────────────────────────────
    try:
        rows = db.execute(
            text("""
                SELECT id, tipo, severidad, titulo, descripcion, created_at
                FROM alertas_sistema
                ORDER BY created_at DESC
                LIMIT 8
            """)
        ).mappings().all()
        alerts = []
        for r in rows:
            sev = (r["severidad"] or "INFO").upper()
            severity_map = {"CRITICAL": "warning", "HIGH": "warning", "MEDIUM": "info", "LOW": "ok", "INFO": "info"}
            alerts.append({
                "id":       str(r["id"]),
                "type":     severity_map.get(sev, "info"),
                "text":     r["titulo"] or r["descripcion"] or "(sin título)",
                "tipo":     r["tipo"],
                "severidad": sev,
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            })
        out["alerts"] = alerts
    except Exception as e:
        out["alerts"] = []
        out["_warnings"].append(f"alerts: {e}")

    # ── 4. Polls: últimas encuestas ───────────────────────────────────────────
    try:
        rows = db.execute(
            text("""
                SELECT e.id, e.titulo, e.fecha_publicacion, fe.nombre AS pollster
                FROM encuestas e
                LEFT JOIN fuentes_encuesta fe ON e.fuente_id = fe.id
                WHERE e.fecha_publicacion IS NOT NULL
                ORDER BY e.fecha_publicacion DESC
                LIMIT 8
            """)
        ).mappings().all()
        polls = []
        for r in rows:
            polls.append({
                "id":        str(r["id"]),
                "pollster":  r["pollster"] or "Desconocido",
                "title":     r["titulo"],
                "date":      str(r["fecha_publicacion"]),
            })
        out["polls"] = polls
    except Exception as e:
        out["polls"] = []
        out["_warnings"].append(f"polls: {e}")

    # ── 5. Macro: últimos indicadores con histórico para sparkline ────────────
    try:
        rows = db.execute(
            text("""
                SELECT fecha, ipc_general, ipc_subyacente,
                       crecimiento_pib, deficit_publico_pib, deuda_publica_pib
                FROM indicadores_macroeconomicos
                WHERE ipc_general IS NOT NULL
                ORDER BY fecha DESC LIMIT 12
            """)
        ).mappings().all()

        if rows:
            latest_row = rows[0]
            ipc_history = [float(r["ipc_general"]) for r in reversed(rows) if r["ipc_general"] is not None]
            pib_history = [float(r["crecimiento_pib"]) for r in reversed(rows) if r["crecimiento_pib"] is not None]
            deficit_history = [float(r["deficit_publico_pib"]) for r in reversed(rows) if r["deficit_publico_pib"] is not None]

            macro = []
            if latest_row["ipc_general"] is not None:
                ipc = float(latest_row["ipc_general"])
                prev_ipc = ipc_history[-2] if len(ipc_history) >= 2 else ipc
                macro.append({
                    "label": "IPC general",
                    "value": f"{ipc:.1f}%",
                    "delta": f"{(ipc - prev_ipc):+.1f} pp",
                    "dir":   "up" if ipc > prev_ipc else "down",
                    "good":  "down",
                    "data":  ipc_history[-12:] or [ipc],
                })
            if pib_history:
                pib = pib_history[-1]
                prev_pib = pib_history[-2] if len(pib_history) >= 2 else pib
                macro.append({
                    "label": "Crecimiento PIB",
                    "value": f"{pib:+.1f}%",
                    "delta": f"{(pib - prev_pib):+.1f} pp",
                    "dir":   "up" if pib > prev_pib else "down",
                    "good":  "up",
                    "data":  pib_history[-12:],
                })
            if deficit_history:
                df = deficit_history[-1]
                prev_df = deficit_history[-2] if len(deficit_history) >= 2 else df
                macro.append({
                    "label": "Déficit / PIB",
                    "value": f"{df:.1f}%",
                    "delta": f"{(df - prev_df):+.2f} pp",
                    "dir":   "up" if df > prev_df else "down",
                    "good":  "down",
                    "data":  deficit_history[-12:],
                })
            # Indicadores adicionales (constantes pero realistas — Banco de España)
            macro += _macro_market_demos()
            out["macro"] = macro[:10]
        else:
            out["macro"] = _macro_market_demos()
    except Exception as e:
        out["macro"] = _macro_market_demos()
        out["_warnings"].append(f"macro: {e}")

    # ── 6. Regions: ganador estimado por CCAA ─────────────────────────────────
    out["regions"] = _regions_from_estimation(parties)

    # ── 7. Coalitions: escenarios de mayoría ──────────────────────────────────
    try:
        rows = db.execute(
            text("""
                SELECT id, partidos_coalicion, escanos_totales, n_partidos,
                       score_viabilidad, es_minima
                FROM analisis_coaliciones
                ORDER BY score_viabilidad DESC NULLS LAST
                LIMIT 6
            """)
        ).mappings().all()
        coalitions = []
        for r in rows:
            partidos_str = (r["partidos_coalicion"] or "").replace("Gobierno ", "")
            coalitions.append({
                "id":      f"coal-{r['id']}",
                "name":    partidos_str,
                "seats":   int(r["escanos_totales"] or 0),
                "viable":  int(r["escanos_totales"] or 0) >= 176,
                "viability": float(r["score_viabilidad"] or 0),
                "n_partidos": int(r["n_partidos"] or 0),
                "es_minima": bool(r["es_minima"]),
            })
        out["coalitions"] = coalitions
    except Exception as e:
        out["coalitions"] = []
        out["_warnings"].append(f"coalitions: {e}")

    # ── 8. Risk: índice compuesto político ────────────────────────────────────
    try:
        row = db.execute(
            text("""
                SELECT indice_compuesto, semaforo, fecha_calculo, dimensiones_json
                FROM informes_riesgo_politico
                ORDER BY fecha_calculo DESC LIMIT 1
            """)
        ).mappings().fetchone()
        if row:
            dims = []
            try:
                dims_raw = json.loads(row["dimensiones_json"]) if row["dimensiones_json"] else {}
                if isinstance(dims_raw, dict):
                    dims = [{"label": k, "value": v} for k, v in dims_raw.items()][:6]
            except Exception:
                pass
            out["risk"] = {
                "score":    float(row["indice_compuesto"]) if row["indice_compuesto"] is not None else 50.0,
                "semaforo": row["semaforo"] or "amarillo",
                "fecha":    row["fecha_calculo"].isoformat() if row["fecha_calculo"] else None,
                "dimensiones": dims,
            }
        else:
            out["risk"] = {"score": 38.0, "semaforo": "amarillo", "fecha": None, "dimensiones": []}
    except Exception as e:
        out["risk"] = {"score": 38.0, "semaforo": "amarillo", "fecha": None, "dimensiones": []}
        out["_warnings"].append(f"risk: {e}")

    # ── 9. News pulse: últimas noticias destacadas ────────────────────────────
    try:
        rows = db.execute(
            text("""
                SELECT id, titular AS title, fuente AS source, sentimiento_score,
                       relevancia_score, fecha_publicacion, partidos_mencionados
                FROM noticias_prensa
                WHERE relevancia_score IS NOT NULL
                ORDER BY relevancia_score DESC, fecha_publicacion DESC NULLS LAST
                LIMIT 6
            """)
        ).mappings().all()
        news = []
        for r in rows:
            news.append({
                "id":         str(r["id"]),
                "title":      r["title"],
                "source":     r["source"],
                "sentiment":  float(r["sentimiento_score"]) if r["sentimiento_score"] is not None else 0.0,
                "relevance":  float(r["relevancia_score"]) if r["relevancia_score"] is not None else 0.0,
                "date":       r["fecha_publicacion"].isoformat() if r["fecha_publicacion"] else None,
                "parties":    r["partidos_mencionados"] or "",
            })
        out["news_pulse"] = news
    except Exception as e:
        out["news_pulse"] = []
        out["_warnings"].append(f"news_pulse: {e}")

    return out


# ── Helpers ───────────────────────────────────────────────────────────────────
def _format_delta(d: float) -> str:
    sign = "+" if d >= 0 else ""
    return f"{sign}{d:.1f}"


def _macro_market_demos() -> list[dict]:
    """Indicadores de mercado complementarios (Banco de España demo).
    En el futuro estos vendrán de un scraper a tipos.bde.es / IBEX.
    """
    return [
        {"label": "IBEX 35",         "value": "11.240", "delta": "+1.2%",  "dir": "up",   "good": "up",
         "data": [10900, 11050, 10980, 11100, 11080, 11150, 11200, 11180, 11220, 11240]},
        {"label": "Bono 10Y",        "value": "3.24%",  "delta": "+0.04",  "dir": "up",   "good": "down",
         "data": [3.18, 3.20, 3.19, 3.22, 3.21, 3.23, 3.20, 3.22, 3.24, 3.24]},
        {"label": "Prima de riesgo", "value": "102 pb", "delta": "+3 pb",  "dir": "up",   "good": "down",
         "data": [94, 96, 95, 97, 98, 99, 98, 100, 101, 102]},
        {"label": "Euríbor",         "value": "2.84%",  "delta": "-0.06",  "dir": "down", "good": "down",
         "data": [2.95, 2.92, 2.90, 2.88, 2.87, 2.86, 2.86, 2.85, 2.84, 2.84]},
        {"label": "EUR / USD",       "value": "1.084",  "delta": "+0.6%",  "dir": "up",   "good": "up",
         "data": [1.072, 1.075, 1.073, 1.078, 1.080, 1.082, 1.083, 1.084]},
        {"label": "Brent",           "value": "$84.20", "delta": "-1.1%",  "dir": "down", "good": "down",
         "data": [86.5, 86.0, 85.8, 85.4, 85.1, 84.9, 84.7, 84.4, 84.2]},
        {"label": "Paro EPA",        "value": "11.4%",  "delta": "-0.3 pp","dir": "down", "good": "down",
         "data": [12.0, 11.9, 11.8, 11.7, 11.6, 11.5, 11.5, 11.4, 11.4]},
    ]


def _regions_from_estimation(parties: list[dict]) -> list[dict]:
    """Estima ganador por CCAA usando bias regional sobre la estimación nacional.
    Los biases vienen de la histórica electoral 2019-2023.
    """
    pp = next((p for p in parties if p["siglas"] == "PP"), {"pct": 32.0})
    psoe = next((p for p in parties if p["siglas"] == "PSOE"), {"pct": 27.0})

    # Bias regional: pct PP - pct PSOE local vs nacional (positivo → PP fuerte)
    REGION_BIAS = {
        "Andalucía":          -3,
        "Aragón":             +2,
        "Asturias":           -8,
        "Baleares":           +1,
        "Canarias":           -5,
        "Cantabria":          +6,
        "Castilla y León":    +12,
        "Castilla-La Mancha": +3,
        "Cataluña":           -10,
        "C. Valenciana":      -1,
        "Extremadura":         0,
        "Galicia":            +8,
        "La Rioja":           +9,
        "Madrid":             +14,
        "Murcia":             +12,
        "Navarra":            -2,
        "País Vasco":         -15,
    }

    nat_pp = pp.get("pct", 32.0)
    nat_psoe = psoe.get("pct", 27.0)
    nat_diff = nat_pp - nat_psoe

    out = []
    for region, bias in REGION_BIAS.items():
        local_diff = nat_diff + bias
        if local_diff >= 4:
            lean = "pp"
        elif local_diff <= -4:
            lean = "psoe"
        else:
            lean = "mixed"
        out.append({
            "name":   region,
            "lean":   lean,
            "diff":   round(local_diff, 1),
            "pp_pct": round(nat_pp + bias / 2, 1),
            "psoe_pct": round(nat_psoe - bias / 2, 1),
        })
    return out
