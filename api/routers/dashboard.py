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

    # ── 10. News-as-object aggregations: alimentan otros paneles ──────────────
    out["news_intel"] = _news_aggregations(db)

    # Mezclar alerts_from_news en out["alerts"] (al principio, son críticas frescas)
    news_alerts = out["news_intel"].get("alerts_from_news") or []
    if news_alerts:
        out["alerts"] = news_alerts + (out.get("alerts") or [])
        out["alerts"] = out["alerts"][:10]  # cap at 10 total

    # Boost del riesgo si hay muchas noticias críticas (suma 0-15 al score)
    try:
        crit = out["news_intel"].get("critical_count", 0)
        high = out["news_intel"].get("high_impact_count", 0)
        risk_boost = min(15, crit * 4 + high * 1.5)
        if "risk" in out and out["risk"].get("score") is not None and risk_boost > 0:
            base = float(out["risk"]["score"])
            out["risk"]["score_base"] = base
            out["risk"]["score_news_boost"] = round(risk_boost, 1)
            # No exceder 100
            out["risk"]["score"] = min(100.0, base + risk_boost)
    except Exception:
        pass

    # ── 11. Market data (BdE / mercado) — sustituye los demos macro ──────────
    market_data = _market_data()
    if market_data:
        # Markets primero (live ●), luego macro existente sin duplicar labels
        live_labels = {m["label"].lower() for m in market_data}
        existing_macro = [m for m in (out.get("macro") or []) if m.get("label", "").lower() not in live_labels]
        out["macro"] = market_data + existing_macro[:4]

    return out


def _news_aggregations(db) -> dict[str, Any]:
    """Aggregations sobre news_articles que se inyectan en otros paneles.

    - by_party: {PP: {mentions, sentiment_avg, last_24h, last_7d}}
    - alerts_from_news: artículos con impacto alto/critico → alertas extras
    - region_sentiment: por CCAA si la fuente es regional
    - critical_count: nº de noticias críticas en 24h (alimenta riesgo)
    - top_topics: top temas detectados (narrativas)
    """
    out: dict[str, Any] = {
        "by_party": {},
        "critical_count": 0,
        "high_impact_count": 0,
        "total_24h": 0,
        "alerts_from_news": [],
        "top_topics": [],
        "trending_entities": [],
    }
    try:
        # Volumen total 24h
        row = db.execute(text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE ai_spain_impact = 'critico') AS critical,
                COUNT(*) FILTER (WHERE ai_spain_impact IN ('alto','critico')) AS high_impact,
                ROUND(AVG(ai_relevance)::numeric, 1) AS avg_relevance
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '24 hours'
        """)).mappings().fetchone()
        if row:
            out["total_24h"] = int(row["total"] or 0)
            out["critical_count"] = int(row["critical"] or 0)
            out["high_impact_count"] = int(row["high_impact"] or 0)
            out["avg_relevance"] = float(row["avg_relevance"]) if row["avg_relevance"] is not None else 0.0
    except Exception as e:
        out["_err_total"] = str(e)

    try:
        # Mentions por partido + sentiment medio (busca siglas en title o ai_entities)
        parties_to_track = ["PP", "PSOE", "VOX", "Sumar", "Junts", "ERC", "PNV", "Podemos"]
        for siglas in parties_to_track:
            row = db.execute(text("""
                SELECT
                    COUNT(*) AS mentions,
                    COUNT(*) FILTER (WHERE ai_sentiment = 'positivo') AS pos,
                    COUNT(*) FILTER (WHERE ai_sentiment = 'negativo') AS neg,
                    COUNT(*) FILTER (WHERE ai_sentiment = 'neutro') AS neu,
                    COUNT(*) FILTER (WHERE scraped_at > NOW() - INTERVAL '24 hours') AS last_24h
                FROM news_articles
                WHERE scraped_at > NOW() - INTERVAL '7 days'
                  AND (
                    title ILIKE :pat
                    OR ai_summary ILIKE :pat
                    OR ai_entities::text ILIKE :pat
                  )
            """), {"pat": f"%{siglas}%"}).mappings().fetchone()
            mentions = int(row["mentions"] or 0) if row else 0
            if mentions > 0 and row:
                pos = int(row["pos"] or 0)
                neg = int(row["neg"] or 0)
                neu = int(row["neu"] or 0)
                total_classified = pos + neg + neu
                sent_score = ((pos - neg) / total_classified) if total_classified > 0 else 0.0
                out["by_party"][siglas] = {
                    "mentions":     mentions,
                    "pos":          pos,
                    "neg":          neg,
                    "neu":          neu,
                    "sent_score":   round(sent_score, 2),
                    "last_24h":     int(row["last_24h"] or 0),
                }
    except Exception as e:
        out["_err_party"] = str(e)

    try:
        # Alertas derivadas de noticias críticas (no solapar con alertas_sistema)
        rows = db.execute(text("""
            SELECT id, title, source_name, ai_spain_impact, ai_relevance,
                   ai_summary, ai_urgency, ai_category, scraped_at
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '48 hours'
              AND (ai_spain_impact IN ('alto','critico') OR ai_relevance >= 8)
              AND (ai_urgency IN ('inmediata','24h') OR ai_relevance >= 8)
            ORDER BY
              CASE ai_spain_impact WHEN 'critico' THEN 0 WHEN 'alto' THEN 1 ELSE 2 END,
              ai_relevance DESC,
              scraped_at DESC
            LIMIT 5
        """)).mappings().all()
        alerts_news = []
        for r in rows:
            level = "critical" if r["ai_spain_impact"] == "critico" else \
                    "high"     if r["ai_spain_impact"] == "alto"    else \
                    "medium"
            alerts_news.append({
                "id":          f"news-{r['id']}",
                "type":        "warning" if level in ("critical", "high") else "info",
                "text":        r["title"],
                "tipo":        r["ai_category"],
                "severidad":   level.upper(),
                "source":      r["source_name"],
                "summary":     r["ai_summary"],
                "urgency":     r["ai_urgency"],
                "created_at":  r["scraped_at"].isoformat() if r["scraped_at"] else None,
                "from_news":   True,
            })
        out["alerts_from_news"] = alerts_news
    except Exception as e:
        out["_err_alerts"] = str(e)

    try:
        # Top topics + entities trending
        rows = db.execute(text("""
            SELECT unnest(ai_topics) AS topic, COUNT(*) AS cnt
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '48 hours'
              AND ai_topics IS NOT NULL
            GROUP BY topic
            ORDER BY cnt DESC
            LIMIT 12
        """)).mappings().all()
        out["top_topics"] = [{"topic": r["topic"], "cnt": int(r["cnt"])} for r in rows]
    except Exception as e:
        out["_err_topics"] = str(e)

    return out


# Cache simple en memoria para no hacer 6 requests por cada hit del dashboard
_MARKET_CACHE: dict[str, Any] = {"ts": 0.0, "data": []}
_MARKET_TTL_SEC = 300  # 5 minutos


def _market_data() -> list[dict]:
    """Datos de mercado en vivo desde stooq.com (CSV gratuito, sin auth).

    URL pattern: https://stooq.com/q/l/?s=^ibex&f=sd2t2ohlcv&h&e=csv
    Headers: s,d,t,o,h,l,c,v → columnas: symbol, date, time, open, high, low, close, volume

    Si stooq no responde, devolvemos lista vacía y los demos del macro toman el
    relevo. 5 min de caché en memoria para evitar saturar la API.
    """
    import time
    import httpx

    # Cache hit (no servir cache antiguo de 0 elementos)
    if (time.time() - _MARKET_CACHE["ts"]) < _MARKET_TTL_SEC and _MARKET_CACHE.get("data"):
        return _MARKET_CACHE["data"]
    # Reset si previously empty
    if not _MARKET_CACHE.get("data"):
        _MARKET_CACHE["ts"] = 0.0

    targets = [
        # stooq_symbol, label, format, good_dir, group, prev_url (cierre día anterior)
        ("^ibex",     "IBEX 35",       "{:,.0f}",   "up",   "es"),
        ("eurusd",    "EUR / USD",     "{:.4f}",    "up",   "fx"),
        ("eurgbp",    "EUR / GBP",     "{:.4f}",    "up",   "fx"),
        ("cb.f",      "Brent crude",   "${:.2f}",   "down", "energy"),  # crude brent futures
        ("gc.f",      "Oro spot",      "${:,.0f}",  "up",   "safehaven"),
        ("^stoxx50",  "Euro Stoxx 50", "{:,.0f}",   "up",   "eu"),
        ("^dax",      "DAX",           "{:,.0f}",   "up",   "eu"),
        ("^cac",      "CAC 40",        "{:,.0f}",   "up",   "eu"),
    ]
    out = []
    try:
        # stooq usa "+" como separador para batch (literal en la URL).
        # httpx codifica "+" como "%2B" si pasamos params, así que construimos
        # la URL manualmente. Solo escapamos el "^" del símbolo (caret).
        symbols = "+".join(s.replace("^", "%5E") for s, _, _, _, _ in targets)
        url = f"https://stooq.com/q/l/?s={symbols}&f=sd2t2ohlcvp&h&e=csv"
        headers = {"User-Agent": "Mozilla/5.0 (compatible; politeia/1.0)"}
        with httpx.Client(timeout=5.0, headers=headers) as cli:
            r = cli.get(url)
            if not r.is_success:
                return []
            text_csv = r.text.strip()

        # Parse CSV manually
        lines = text_csv.split("\n")
        if len(lines) < 2:
            return []
        header = [h.strip().lower() for h in lines[0].split(",")]
        def _idx(name: str, default: int) -> int:
            return header.index(name) if name in header else default
        sym_idx    = _idx("symbol", 0)
        close_idx  = _idx("close", 6)
        open_idx   = _idx("open", 3)
        prev_idx   = _idx("prev", 8)

        data_by_sym: dict[str, dict[str, float]] = {}
        for line in lines[1:]:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 7:
                continue
            try:
                sym = parts[sym_idx].lower()
                if parts[close_idx] in ("N/D", ""):
                    continue
                close = float(parts[close_idx])
                open_ = float(parts[open_idx]) if parts[open_idx] not in ("N/D", "") else close
                prev = float(parts[prev_idx]) if prev_idx < len(parts) and parts[prev_idx] not in ("N/D", "") else open_
                data_by_sym[sym] = {"close": close, "open": open_, "prev": prev}
            except (ValueError, IndexError):
                continue

        for symbol, label, fmt, good, group in targets:
            q = data_by_sym.get(symbol.lower())
            if not q or q["close"] == 0:
                continue
            price = q["close"]
            ref = q.get("prev") or q.get("open") or price
            change_pct = ((price - ref) / ref * 100) if ref > 0 else 0.0
            try:
                value_str = fmt.format(price)
            except Exception:
                value_str = str(price)
            out.append({
                "label":  label,
                "value":  value_str,
                "delta":  f"{change_pct:+.2f}%",
                "dir":    "up" if change_pct >= 0 else "down",
                "good":   group,
                "data":   _fake_sparkline(price, change_pct),
                "live":   True,
                "source": "stooq.com",
            })
    except Exception:
        return _MARKET_CACHE.get("data") or []  # fallback al último good

    if out:
        _MARKET_CACHE["ts"] = time.time()
        _MARKET_CACHE["data"] = out
    return out


def _fake_sparkline(current: float, change_pct: float) -> list[float]:
    """Genera 10 puntos de sparkline coherentes con el cambio diario.
    Cuando dispongamos de histórico real (BdE/Yahoo /chart), se sustituye.
    """
    import math
    base = current / (1 + change_pct / 100) if change_pct != 0 else current * 0.99
    # 10 puntos interpolados con ruido determinista
    pts = []
    for i in range(10):
        t = i / 9
        # Linea + ruido senoidal pequeño
        v = base + (current - base) * t + (math.sin(i * 1.3) * abs(current - base) * 0.15)
        pts.append(round(v, 4))
    return pts


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
