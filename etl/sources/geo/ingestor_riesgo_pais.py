"""
Ingestor Dinámico de Riesgo País — Politeia D8 Geopolítica
===========================================================
Combina 3 fuentes públicas + geocodificación para generar
la tabla `paises_riesgo` que alimenta los mapas del dashboard.

Fuentes:
  1. ACLED API    → score conflicto armado (fatalities / eventos)
  2. World Bank API → gobernanza, fragilidad, inflación
  3. GDELT GEO    → tono mediático / menciones de conflicto
  4. Geopy (Nominatim) → lat/lon dinámico por nombre de país

Output:
  dashboard/data/paises_riesgo.json  (cacheado, TTL 6h)
  PostgreSQL tabla paises_riesgo     (si DB disponible)

Uso:
  python -m etl.sources.geo.ingestor_riesgo_pais
  o desde pipeline_geopolitica.py como tarea_riesgo_paises()
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[3]
_DATA_DIR = _ROOT / "dashboard" / "data"
_DATA_DIR.mkdir(parents=True, exist_ok=True)
_STORE_FILE = _DATA_DIR / "paises_riesgo.json"
_COORD_CACHE = _DATA_DIR / "coord_cache.json"

# TTL del cache en segundos (6 horas)
_TTL_SECONDS = 6 * 3600

# ── Catálogo de países de interés para España ─────────────────────────────────
# iso2: código ISO 3166-1 alpha-2 (para World Bank)
# iso3: código ISO 3166-1 alpha-3 (para ACLED)
# interes_espana: peso estratégico fijo (ajustable manualmente)
# tipo_interes: dimensiones del interés español
PAISES_INTERES: list[dict] = [
    # ── Vecindad inmediata ────────────────────────────────────────────────────
    {"nombre": "Marruecos",        "iso2": "MA", "iso3": "MAR", "flag": "🇲🇦",
     "interes_espana": 0.95, "tipo_interes": ["migracion", "energia", "comercio", "diplomatica"],
     "empresas_espanolas": ["OHL", "Iberdrola", "Mapfre", "Renfe"]},
    {"nombre": "Algeria",          "iso2": "DZ", "iso3": "DZA", "flag": "🇩🇿",
     "interes_espana": 0.92, "tipo_interes": ["energia", "migracion", "diplomatica"],
     "empresas_espanolas": ["Naturgy", "Repsol"]},
    {"nombre": "Francia",          "iso2": "FR", "iso3": "FRA", "flag": "🇫🇷",
     "interes_espana": 0.88, "tipo_interes": ["comercio", "diplomatica", "diaspora"],
     "empresas_espanolas": ["Inditex", "Santander", "Telefónica"]},
    {"nombre": "Portugal",         "iso2": "PT", "iso3": "PRT", "flag": "🇵🇹",
     "interes_espana": 0.82, "tipo_interes": ["comercio", "energia", "diplomatica"],
     "empresas_espanolas": ["EDP España", "Inditex"]},

    # ── Teatro europeo / OTAN ─────────────────────────────────────────────────
    {"nombre": "Ucrania",          "iso2": "UA", "iso3": "UKR", "flag": "🇺🇦",
     "interes_espana": 0.82, "tipo_interes": ["energia", "diplomatica", "defensa"],
     "empresas_espanolas": ["Iberdrola", "Repsol"]},
    {"nombre": "Rusia",            "iso2": "RU", "iso3": "RUS", "flag": "🇷🇺",
     "interes_espana": 0.75, "tipo_interes": ["energia", "ciberseguridad", "diplomatica"],
     "empresas_espanolas": []},
    {"nombre": "Moldavia",         "iso2": "MD", "iso3": "MDA", "flag": "🇲🇩",
     "interes_espana": 0.42, "tipo_interes": ["diplomatica", "defensa"],
     "empresas_espanolas": []},
    {"nombre": "Serbia",           "iso2": "RS", "iso3": "SRB", "flag": "🇷🇸",
     "interes_espana": 0.45, "tipo_interes": ["diplomatica"],
     "empresas_espanolas": []},
    {"nombre": "Kosovo",           "iso2": "XK", "iso3": "XKX", "flag": "🇽🇰",
     "interes_espana": 0.55, "tipo_interes": ["diplomatica"],
     "empresas_espanolas": []},

    # ── Mediterráneo / Oriente Medio ─────────────────────────────────────────
    {"nombre": "Israel",           "iso2": "IL", "iso3": "ISR", "flag": "🇮🇱",
     "interes_espana": 0.72, "tipo_interes": ["diplomatica", "comercio"],
     "empresas_espanolas": []},
    {"nombre": "Palestina (Gaza)", "iso2": "PS", "iso3": "PSE", "flag": "🇵🇸",
     "interes_espana": 0.78, "tipo_interes": ["diplomatica", "humanitario"],
     "empresas_espanolas": []},
    {"nombre": "Libia",            "iso2": "LY", "iso3": "LBY", "flag": "🇱🇾",
     "interes_espana": 0.80, "tipo_interes": ["energia", "migracion", "seguridad"],
     "empresas_espanolas": ["Repsol"]},
    {"nombre": "Turquía",          "iso2": "TR", "iso3": "TUR", "flag": "🇹🇷",
     "interes_espana": 0.70, "tipo_interes": ["comercio", "diplomatica", "defensa"],
     "empresas_espanolas": ["Inditex", "Acciona"]},
    {"nombre": "Irak",             "iso2": "IQ", "iso3": "IRQ", "flag": "🇮🇶",
     "interes_espana": 0.60, "tipo_interes": ["energia", "defensa"],
     "empresas_espanolas": ["Repsol"]},
    {"nombre": "Iran",             "iso2": "IR", "iso3": "IRN", "flag": "🇮🇷",
     "interes_espana": 0.65, "tipo_interes": ["energia", "diplomatica"],
     "empresas_espanolas": []},
    {"nombre": "Sahara Occidental", "iso2": "EH", "iso3": "ESH", "flag": "🟫",
     "interes_espana": 0.90, "tipo_interes": ["diplomatica", "historico"],
     "empresas_espanolas": []},
    {"nombre": "Túnez",            "iso2": "TN", "iso3": "TUN", "flag": "🇹🇳",
     "interes_espana": 0.70, "tipo_interes": ["migracion", "comercio"],
     "empresas_espanolas": []},
    {"nombre": "Egipto",           "iso2": "EG", "iso3": "EGY", "flag": "🇪🇬",
     "interes_espana": 0.60, "tipo_interes": ["energia", "comercio"],
     "empresas_espanolas": ["Acciona", "OHL"]},
    {"nombre": "Arabia Saudí",     "iso2": "SA", "iso3": "SAU", "flag": "🇸🇦",
     "interes_espana": 0.65, "tipo_interes": ["energia", "comercio", "defensa"],
     "empresas_espanolas": ["Indra", "Navantia", "Airbus España"]},

    # ── África Subsahariana / Sahel ───────────────────────────────────────────
    {"nombre": "Mali",             "iso2": "ML", "iso3": "MLI", "flag": "🇲🇱",
     "interes_espana": 0.75, "tipo_interes": ["defensa", "migracion", "seguridad"],
     "empresas_espanolas": []},
    {"nombre": "Níger",            "iso2": "NE", "iso3": "NER", "flag": "🇳🇪",
     "interes_espana": 0.68, "tipo_interes": ["defensa", "migracion"],
     "empresas_espanolas": []},
    {"nombre": "Burkina Faso",     "iso2": "BF", "iso3": "BFA", "flag": "🇧🇫",
     "interes_espana": 0.55, "tipo_interes": ["defensa", "migracion"],
     "empresas_espanolas": []},
    {"nombre": "Nigeria",          "iso2": "NG", "iso3": "NGA", "flag": "🇳🇬",
     "interes_espana": 0.60, "tipo_interes": ["energia", "migracion"],
     "empresas_espanolas": ["Repsol", "Endesa"]},
    {"nombre": "Etiopía",          "iso2": "ET", "iso3": "ETH", "flag": "🇪🇹",
     "interes_espana": 0.40, "tipo_interes": ["humanitario"],
     "empresas_espanolas": []},
    {"nombre": "Sudán",            "iso2": "SD", "iso3": "SDN", "flag": "🇸🇩",
     "interes_espana": 0.50, "tipo_interes": ["humanitario", "seguridad"],
     "empresas_espanolas": []},

    # ── Latinoamérica ─────────────────────────────────────────────────────────
    {"nombre": "Venezuela",        "iso2": "VE", "iso3": "VEN", "flag": "🇻🇪",
     "interes_espana": 0.85, "tipo_interes": ["diaspora", "diplomatica", "energia"],
     "empresas_espanolas": ["Repsol", "BBVA", "Santander"]},
    {"nombre": "México",           "iso2": "MX", "iso3": "MEX", "flag": "🇲🇽",
     "interes_espana": 0.88, "tipo_interes": ["empresarial", "diaspora", "diplomatica"],
     "empresas_espanolas": ["BBVA", "Telefónica", "ACS", "Acciona"]},
    {"nombre": "Colombia",         "iso2": "CO", "iso3": "COL", "flag": "🇨🇴",
     "interes_espana": 0.72, "tipo_interes": ["empresarial", "diaspora"],
     "empresas_espanolas": ["BBVA", "Telefónica"]},
    {"nombre": "Cuba",             "iso2": "CU", "iso3": "CUB", "flag": "🇨🇺",
     "interes_espana": 0.75, "tipo_interes": ["diplomatica", "diaspora"],
     "empresas_espanolas": ["Meliá Hotels", "Iberia"]},
    {"nombre": "Argentina",        "iso2": "AR", "iso3": "ARG", "flag": "🇦🇷",
     "interes_espana": 0.80, "tipo_interes": ["diaspora", "empresarial"],
     "empresas_espanolas": ["Santander", "Repsol", "Telefónica"]},
    {"nombre": "Brasil",           "iso2": "BR", "iso3": "BRA", "flag": "🇧🇷",
     "interes_espana": 0.78, "tipo_interes": ["empresarial", "comercio"],
     "empresas_espanolas": ["Iberdrola", "Santander", "Inditex"]},

    # ── Asia / Indo-Pacífico ──────────────────────────────────────────────────
    {"nombre": "China",            "iso2": "CN", "iso3": "CHN", "flag": "🇨🇳",
     "interes_espana": 0.72, "tipo_interes": ["comercio", "tecnología"],
     "empresas_espanolas": ["Inditex", "Ferrovial"]},
    {"nombre": "Taiwán",           "iso2": "TW", "iso3": "TWN", "flag": "🇹🇼",
     "interes_espana": 0.55, "tipo_interes": ["comercio", "tecnología"],
     "empresas_espanolas": []},
    {"nombre": "Corea del Norte",  "iso2": "KP", "iso3": "PRK", "flag": "🇰🇵",
     "interes_espana": 0.35, "tipo_interes": ["seguridad"],
     "empresas_espanolas": []},
    {"nombre": "Afganistán",       "iso2": "AF", "iso3": "AFG", "flag": "🇦🇫",
     "interes_espana": 0.45, "tipo_interes": ["humanitario", "defensa"],
     "empresas_espanolas": []},
]

# ── Pesos para el score compuesto ─────────────────────────────────────────────
_W_ACLED     = 0.40   # conflicto físico — peso máximo
_W_WB        = 0.30   # fragilidad institucional
_W_GDELT     = 0.20   # tono mediático / menciones
_W_INTERES   = 0.10   # ajuste por interés estratégico España


# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 1 — GEOCODIFICACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

def _load_coord_cache() -> dict:
    try:
        if _COORD_CACHE.exists():
            return json.loads(_COORD_CACHE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_coord_cache(cache: dict) -> None:
    _COORD_CACHE.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# Coordenadas hardcoded para casos problemáticos (Kosovo, Sahara Occidental, etc.)
_COORD_OVERRIDE: dict[str, tuple[float, float]] = {
    "Kosovo":            (42.60, 20.90),
    "Sahara Occidental": (24.21, -12.88),
    "Palestina (Gaza)":  (31.35, 34.30),
    "Taiwan":            (23.70, 121.00),
    "Taiwán":            (23.70, 121.00),
    "Corea del Norte":   (40.34, 127.51),
}


def get_coordenadas(nombre_pais: str) -> tuple[float, float]:
    """
    Obtiene lat/lon para un país. Prioridad:
      1. Override manual (países problemáticos)
      2. Cache local en disco
      3. Geocodificación via Nominatim (con rate-limit 1 req/s)
    """
    if nombre_pais in _COORD_OVERRIDE:
        return _COORD_OVERRIDE[nombre_pais]

    cache = _load_coord_cache()
    if nombre_pais in cache:
        return tuple(cache[nombre_pais])  # type: ignore

    try:
        from geopy.geocoders import Nominatim
        from geopy.exc import GeocoderTimedOut
        geolocator = Nominatim(user_agent="politeia_geo_v2", timeout=5)
        time.sleep(1.1)  # Nominatim rate limit: 1 req/s
        loc = geolocator.geocode(nombre_pais, language="en", exactly_one=True)
        if loc:
            coords = (round(loc.latitude, 4), round(loc.longitude, 4))
            cache[nombre_pais] = list(coords)
            _save_coord_cache(cache)
            logger.debug("Geocoded %s → %s", nombre_pais, coords)
            return coords
    except Exception as exc:
        logger.warning("Geocoding failed for %s: %s", nombre_pais, exc)

    # Fallback: coordenadas (0,0) — visible en mapa como aviso
    return (0.0, 0.0)


# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 2 — ACLED API
# ═══════════════════════════════════════════════════════════════════════════════

_ACLED_BASE = "https://api.acleddata.com/acled/read"


def _get_acled_score(iso3: str, api_key: str, email: str, days: int = 90) -> float:
    """
    Score 0-10 de conflicto para un país basado en:
      - Número de eventos en últimos N días
      - Total de fatalities
    Normalizado logarítmicamente para que no explote con países de guerra activa.
    """
    import math
    try:
        import httpx
        desde = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        params = {
            "key": api_key,
            "email": email,
            "iso3": iso3,
            "event_date": desde,
            "event_date_where": "BETWEEN",
            "event_date_to": datetime.now().strftime("%Y-%m-%d"),
            "fields": "country|fatalities|event_type",
            "limit": 2000,
        }
        resp = httpx.get(_ACLED_BASE, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        events = data.get("data", [])
        if not events:
            return 0.0
        n_events = len(events)
        fatalities = sum(int(e.get("fatalities", 0)) for e in events)
        # Score logarítmico: 0 eventos→0, 100 eventos→4.6, 1000 eventos→6.9, 10000→9.2
        score_ev = min(10.0, math.log(n_events + 1, 2))
        score_fat = min(10.0, math.log(fatalities + 1, 2))
        return round((score_ev * 0.5 + score_fat * 0.5), 2)
    except Exception as exc:
        logger.debug("ACLED error %s: %s", iso3, exc)
        return -1.0  # -1 indica sin datos (no confundir con 0 = paz)


# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 3 — WORLD BANK API
# ═══════════════════════════════════════════════════════════════════════════════

_WB_BASE = "https://api.worldbank.org/v2"

# Indicadores usados + dirección del riesgo
# ("código", peso, inversión: True = mayor valor → más riesgo)
_WB_INDICATORS: list[tuple[str, float, bool]] = [
    ("PV.EST",   0.40, True),   # Political Stability / No Violence [-2.5, 2.5]
    ("GE.EST",   0.25, True),   # Government Effectiveness [-2.5, 2.5]
    ("RL.EST",   0.20, True),   # Rule of Law [-2.5, 2.5]
    ("CC.EST",   0.15, True),   # Control of Corruption [-2.5, 2.5]
]


def _get_wb_score(iso2: str) -> float:
    """
    Score 0-10 de fragilidad institucional via World Bank Governance Indicators.
    Valor más alto = más frágil = más riesgo.
    """
    try:
        import httpx
        scores: list[float] = []
        weights: list[float] = []
        for code, weight, invert in _WB_INDICATORS:
            url = f"{_WB_BASE}/country/{iso2}/indicator/{code}"
            params = {"format": "json", "mrv": 1, "per_page": 1}
            try:
                resp = httpx.get(url, params=params, timeout=10)
                resp.raise_for_status()
                payload = resp.json()
                if len(payload) >= 2 and payload[1]:
                    val = payload[1][0].get("value")
                    if val is not None:
                        # Normalizar [-2.5, 2.5] → [0, 10]
                        # Si invert=True: mayor gobernanza → menor riesgo
                        normalized = (float(val) + 2.5) / 5.0 * 10.0
                        risk_val = (10.0 - normalized) if invert else normalized
                        scores.append(risk_val)
                        weights.append(weight)
            except Exception:
                continue
            time.sleep(0.3)  # Cortés con WB API

        if not scores:
            return -1.0
        # Media ponderada
        total_w = sum(weights)
        return round(sum(s * w for s, w in zip(scores, weights)) / total_w, 2)
    except Exception as exc:
        logger.debug("WorldBank error %s: %s", iso2, exc)
        return -1.0


# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 4 — GDELT GEO TONE
# ═══════════════════════════════════════════════════════════════════════════════

_GDELT_DOC2_BASE = "https://api.gdeltproject.org/api/v2/doc/doc"


def _get_gdelt_tone(nombre_pais: str, days: int = 7) -> float:
    """
    Score 0-10 de negatividad mediática para un país en últimos N días.
    Usa GDELT Doc 2.0 API (gratuita, sin key).
    Tono GDELT: -100 (muy negativo) a +100 (muy positivo)
    Normalizamos a 0-10 donde 10 = máximo negativo (= más riesgo).
    """
    try:
        import httpx
        from_dt = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d%H%M%S")
        params = {
            "query": f"{nombre_pais} conflict war crisis violence",
            "mode": "ArtList",
            "format": "json",
            "maxrecords": 50,
            "startdatetime": from_dt,
        }
        resp = httpx.get(_GDELT_DOC2_BASE, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        articles = data.get("articles", [])
        if not articles:
            return -1.0
        tones = [float(a.get("tone", 0)) for a in articles if a.get("tone") is not None]
        if not tones:
            return -1.0
        avg_tone = sum(tones) / len(tones)
        # Convertir tono [-100, 0] a riesgo [0, 10]
        # Tono -50 → riesgo ~7.5, tono 0 → riesgo 5, tono +10 → riesgo ~4.5
        risk = max(0.0, min(10.0, (avg_tone * -0.1) + 5.0))
        return round(risk, 2)
    except Exception as exc:
        logger.debug("GDELT tone error %s: %s", nombre_pais, exc)
        return -1.0


# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 5 — SCORE COMPUESTO Y TENDENCIA
# ═══════════════════════════════════════════════════════════════════════════════

def _calcular_score_compuesto(
    acled: float,
    wb: float,
    gdelt: float,
    interes: float,
) -> float:
    """
    Score total 0-10 ponderado.
    Los valores -1 indican 'sin datos' → se excluyen del promedio ponderado.
    """
    scores, weights = [], []
    if acled >= 0:
        scores.append(acled);  weights.append(_W_ACLED)
    if wb >= 0:
        scores.append(wb);     weights.append(_W_WB)
    if gdelt >= 0:
        scores.append(gdelt);  weights.append(_W_GDELT)

    if not scores:
        # Sin ninguna fuente: usar interés como proxy de vigilancia mínima
        return round(interes * 5.0, 2)

    total_w = sum(weights)
    base = sum(s * w for s, w in zip(scores, weights)) / total_w
    # Ajuste por interés: países de alto interés para España reciben +0.5
    ajuste = interes * 0.5 * _W_INTERES / (_W_INTERES or 0.01)
    return round(min(10.0, base + ajuste), 2)


def _calcular_tendencia(
    nombre: str,
    score_actual: float,
    store_anterior: list[dict],
) -> str:
    """
    Compara score actual con el último registrado en el store.
    Retorna 'subiendo' | 'bajando' | 'estable'.
    """
    anterior = next((p for p in store_anterior if p.get("nombre") == nombre), None)
    if not anterior:
        return "estable"
    score_prev = float(anterior.get("score_total", score_actual))
    delta = score_actual - score_prev
    if delta > 0.4:
        return "subiendo"
    if delta < -0.4:
        return "bajando"
    return "estable"


# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 6 — PIPELINE PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

def load_store() -> list[dict]:
    """Carga el JSON store actual de riesgo país."""
    try:
        if _STORE_FILE.exists():
            return json.loads(_STORE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def _store_is_fresh() -> bool:
    """Comprueba si el store tiene menos de TTL segundos."""
    try:
        if _STORE_FILE.exists():
            mtime = _STORE_FILE.stat().st_mtime
            return (time.time() - mtime) < _TTL_SECONDS
    except Exception:
        pass
    return False


def save_store(paises: list[dict]) -> None:
    """Persiste el store JSON."""
    _STORE_FILE.write_text(
        json.dumps(paises, ensure_ascii=False, default=str, indent=2),
        encoding="utf-8"
    )


def run_ingestor(
    acled_key: str | None = None,
    acled_email: str | None = None,
    force_refresh: bool = False,
    max_paises: int | None = None,
    verbose: bool = False,
    persist: bool = True,
) -> list[dict]:
    """
    Pipeline principal de ingestión de riesgo país.

    Args:
        acled_key:     API key de ACLED (opcional; sin ella se omite ACLED)
        acled_email:   Email registrado en ACLED (requerido junto a key)
        force_refresh: Ignorar TTL y forzar actualización
        max_paises:    Limitar a N países (útil para tests)
        verbose:       Log detallado
        persist:        Compatibilidad con llamadas antiguas. El store JSON se
                        persiste siempre; si es False solo evita escritura DB
                        futura.

    Returns:
        Lista de dicts `pais_riesgo` lista para el dashboard.
    """
    if not force_refresh and _store_is_fresh():
        logger.info("Store fresco (< %dh) — usando caché", _TTL_SECONDS // 3600)
        return load_store()

    store_anterior = load_store()
    paises_objetivo = PAISES_INTERES[:max_paises] if max_paises else PAISES_INTERES
    resultado: list[dict] = []

    logger.info("Iniciando ingestión para %d países...", len(paises_objetivo))

    for pais in paises_objetivo:
        nombre = pais["nombre"]
        iso2   = pais["iso2"]
        iso3   = pais["iso3"]
        interes = float(pais["interes_espana"])

        if verbose:
            logger.info("  Procesando: %s", nombre)

        # 1. Coordenadas
        lat, lon = get_coordenadas(nombre)

        # 2. Score ACLED
        acled_score = -1.0
        if acled_key and acled_email:
            acled_score = _get_acled_score(iso3, acled_key, acled_email)

        # 3. Score World Bank
        wb_score = _get_wb_score(iso2)

        # 4. Score GDELT
        gdelt_score = _get_gdelt_tone(nombre)

        # 5. Score compuesto
        score_total = _calcular_score_compuesto(acled_score, wb_score, gdelt_score, interes)

        # 6. Tendencia
        tendencia = _calcular_tendencia(nombre, score_total, store_anterior)

        pais_registro: dict[str, Any] = {
            "nombre":             nombre,
            "pais":               iso3,
            "iso2":               iso2,
            "flag_emoji":         pais.get("flag", ""),
            "lat_capital":        lat,
            "lon_capital":        lon,
            "interes_espana":     interes,
            "tipo_interes":       pais.get("tipo_interes", []),
            "empresas_espanolas": pais.get("empresas_espanolas", []),
            # Scores por fuente (para debug y transparencia)
            "score_acled":        acled_score if acled_score >= 0 else None,
            "score_wb":           wb_score if wb_score >= 0 else None,
            "score_gdelt":        gdelt_score if gdelt_score >= 0 else None,
            # Score final
            "score_total":        score_total,
            "riesgo_tendencia":   tendencia,
            # Metadatos
            "updated_at":         datetime.now(timezone.utc).isoformat(),
            "fuentes_activas":    (
                (["acled"] if acled_score >= 0 else []) +
                (["worldbank"] if wb_score >= 0 else []) +
                (["gdelt"] if gdelt_score >= 0 else [])
            ),
        }
        resultado.append(pais_registro)
        logger.debug(
            "  %s → score=%.1f (ACLED=%.1f, WB=%.1f, GDELT=%.1f) [%s]",
            nombre, score_total, acled_score, wb_score, gdelt_score, tendencia
        )

    # Ordenar por score_total desc
    resultado.sort(key=lambda p: -p["score_total"])
    save_store(resultado)
    logger.info("Ingestión completada: %d países guardados", len(resultado))
    return resultado


# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 7 — ACCESO RÁPIDO PARA GEO_HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def get_paises_riesgo(
    interes_min: float = 0.0,
    limit: int = 50,
    force_refresh: bool = False,
) -> list[dict]:
    """
    Punto de entrada para geo_helpers.py — devuelve países filtrados del store.
    Si el store está vacío o expirado, intenta refrescar (solo WorldBank + GDELT,
    ya que ACLED requiere key externa).
    """
    # Intentar refrescar si el store está vacío o expirado
    if not _store_is_fresh() or force_refresh:
        try:
            import os
            acled_key   = os.environ.get("ACLED_API_KEY")
            acled_email = os.environ.get("ACLED_EMAIL")
            run_ingestor(
                acled_key=acled_key,
                acled_email=acled_email,
                force_refresh=force_refresh,
            )
        except Exception as exc:
            logger.warning("Auto-refresh falló: %s", exc)

    store = load_store()
    if not store:
        return []

    filtered = [
        p for p in store
        if float(p.get("interes_espana", 0)) >= interes_min
    ]
    return filtered[:limit]


def get_cached_risks(max_age_minutes: int = 360) -> list[dict[str, Any]]:
    """
    Compatibilidad con geo_helpers.py. Devuelve el store JSON si está fresco.
    La versión actual del ingestor usa `dashboard/data/paises_riesgo.json` como
    cache operativo; si está caducado, deja que el caller aplique su fallback.
    """
    max_age_seconds = max_age_minutes * 60
    try:
        if not _STORE_FILE.exists():
            return []
        if (time.time() - _STORE_FILE.stat().st_mtime) > max_age_seconds:
            return []
        return load_store()
    except Exception as exc:
        logger.debug("get_cached_risks error: %s", exc)
        return []


def get_presencia_espanola_base() -> list[dict]:
    """
    Genera tabla de presencia española a partir del catálogo PAISES_INTERES.
    Enriquece con coordenadas dinámicas.
    Solo actúa como base estática — para datos reales usar scraper_presencia.py
    """
    resultado = []
    for pais in PAISES_INTERES:
        for tipo in pais.get("tipo_interes", []):
            empresas = pais.get("empresas_espanolas", [])
            if not empresas and tipo not in ["diplomatica", "humanitario", "historico", "defensa"]:
                continue
            lat, lon = get_coordenadas(pais["nombre"])
            resultado.append({
                "pais":            pais["nombre"],
                "iso3":            pais["iso3"],
                "lat":             lat,
                "lon":             lon,
                "tipo_presencia":  tipo,
                "descripcion":     f"Interés {tipo} — {', '.join(empresas[:2]) if empresas else 'sin empresas registradas'}",
                "actor_espanol":   ", ".join(empresas[:2]) if empresas else "Gobierno / MAEC",
                "relevancia":      pais["interes_espana"],
            })
    return resultado


# ═══════════════════════════════════════════════════════════════════════════════
# CLI — python -m etl.sources.geo.ingestor_riesgo_pais
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse
    import os

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )

    parser = argparse.ArgumentParser(description="Ingestor de Riesgo País")
    parser.add_argument("--force",    action="store_true",  help="Ignorar TTL y refrescar")
    parser.add_argument("--verbose",  action="store_true",  help="Log detallado")
    parser.add_argument("--max",      type=int, default=None, help="Máx países a procesar")
    parser.add_argument("--no-acled", action="store_true",  help="Omitir ACLED aunque haya key")
    args = parser.parse_args()

    acled_key   = None if args.no_acled else os.environ.get("ACLED_API_KEY")
    acled_email = None if args.no_acled else os.environ.get("ACLED_EMAIL")

    if acled_key:
        print(f"[ACLED] Usando key para {acled_email}")
    else:
        print("[ACLED] Sin key — se usarán solo WorldBank + GDELT")

    paises = run_ingestor(
        acled_key=acled_key,
        acled_email=acled_email,
        force_refresh=args.force,
        max_paises=args.max,
        verbose=args.verbose,
    )

    print(f"\n{'País':<22} {'Score':>6}  {'Tendencia':<12} {'Fuentes'}")
    print("-" * 60)
    for p in paises[:20]:
        fuentes = ", ".join(p.get("fuentes_activas", []))
        print(f"{p['nombre']:<22} {p['score_total']:>6.1f}  {p['riesgo_tendencia']:<12} {fuentes}")
    print(f"\nTotal: {len(paises)} países — guardado en {_STORE_FILE}")
