"""Big Data Engine — ElectSim. Análisis cruzado de datos políticos, económicos y sociales."""

from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any

import numpy as np
from pydantic import BaseModel, ConfigDict, Field


_SPANISH_STOPWORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "u", "pero",
    "que", "de", "del", "al", "a", "en", "con", "por", "para", "sin", "sobre",
    "es", "son", "ser", "estar", "está", "están", "fue", "fueron", "ha", "han",
    "le", "les", "lo", "se", "su", "sus", "mi", "tu", "nos", "os", "no", "sí",
    "más", "menos", "muy", "este", "esta", "ese", "esa", "aquel", "aquella",
    "como", "cuando", "donde", "porque", "si", "ya", "también", "tan", "todo",
    "todos", "toda", "todas", "ni", "e", "i", "II", "III",
}


class AnalyticsResult(BaseModel):
    """Resultado de una consulta analítica de big data."""

    model_config = ConfigDict(extra="forbid")

    query: str
    executed_at: datetime
    data_sources: list[str]
    record_count: int
    result: dict[str, Any]
    insights: list[str]
    confidence: float = Field(ge=0.0, le=1.0)
    mode: str


class CorrelationFinding(BaseModel):
    """Correlación encontrada entre dos variables."""

    model_config = ConfigDict(extra="forbid")

    variable_a: str
    variable_b: str
    correlation: float
    p_value: float | None
    period_days: int
    interpretation: str
    strength: str


class AnomalyDetection(BaseModel):
    """Anomalía detectada en una serie temporal."""

    model_config = ConfigDict(extra="forbid")

    timestamp: datetime
    variable: str
    value: float
    expected: float
    z_score: float
    severity: str
    description: str


def _classify_strength(r: float) -> str:
    a = abs(r)
    if a > 0.7:
        return "strong"
    if a >= 0.4:
        return "moderate"
    return "weak"


def _interpret_pair(var_a: str, var_b: str, r: float) -> str:
    direction = "positiva" if r > 0 else "negativa"
    strength_es = {"strong": "fuerte", "moderate": "moderada", "weak": "débil"}[
        _classify_strength(r)
    ]
    return (
        f"Correlación {direction} {strength_es} entre {var_a} y {var_b} (r={r:.3f}). "
        f"Cuando {var_a} aumenta, {var_b} tiende a "
        f"{'aumentar' if r > 0 else 'disminuir'}."
    )


def _pearson(x: list[float], y: list[float]) -> tuple[float, float | None]:
    n = min(len(x), len(y))
    if n < 3:
        return 0.0, None
    x_arr = np.asarray(x[:n], dtype=float)
    y_arr = np.asarray(y[:n], dtype=float)
    if np.std(x_arr) == 0 or np.std(y_arr) == 0:
        return 0.0, None
    r = float(np.corrcoef(x_arr, y_arr)[0, 1])
    if math.isnan(r):
        return 0.0, None
    # Aproximación p-value basada en t-student
    try:
        t = r * math.sqrt((n - 2) / max(1e-9, 1 - r * r))
        # Aproximación rápida (no exacta) sin scipy
        p = max(0.0, min(1.0, 2 * (1 - _student_cdf(abs(t), n - 2))))
    except Exception:
        p = None
    return r, p


def _student_cdf(t: float, df: int) -> float:
    """Aproximación de la CDF de Student-t sin scipy."""
    if df <= 0:
        return 0.5
    # Aproximación normal para df grande, ajuste simple
    x = t / math.sqrt(df)
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def compute_correlations(
    variables: dict[str, list[float]], min_correlation: float = 0.3
) -> list[CorrelationFinding]:
    """Calcula correlaciones de Pearson por pares."""

    findings: list[CorrelationFinding] = []
    keys = list(variables.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = keys[i], keys[j]
            r, p = _pearson(variables[a], variables[b])
            if abs(r) < min_correlation:
                continue
            findings.append(
                CorrelationFinding(
                    variable_a=a,
                    variable_b=b,
                    correlation=round(r, 4),
                    p_value=p,
                    period_days=min(len(variables[a]), len(variables[b])),
                    interpretation=_interpret_pair(a, b, r),
                    strength=_classify_strength(r),
                )
            )
    findings.sort(key=lambda f: abs(f.correlation), reverse=True)
    return findings


def detect_anomalies(
    series: list[float],
    dates: list[str] | None = None,
    z_threshold: float = 2.5,
) -> list[AnomalyDetection]:
    """Detecta anomalías por z-score."""

    if not series:
        return []
    arr = np.asarray(series, dtype=float)
    mean = float(np.mean(arr))
    std = float(np.std(arr))
    if std == 0:
        return []
    anomalies: list[AnomalyDetection] = []
    for i, value in enumerate(series):
        z = (value - mean) / std
        if abs(z) <= z_threshold:
            continue
        if abs(z) > 4:
            severity = "critical"
        elif abs(z) > 3:
            severity = "high"
        elif abs(z) > 2.5:
            severity = "medium"
        else:
            severity = "low"
        ts_str = dates[i] if dates and i < len(dates) else None
        try:
            ts = datetime.fromisoformat(ts_str) if ts_str else datetime.utcnow()
        except Exception:
            ts = datetime.utcnow()
        anomalies.append(
            AnomalyDetection(
                timestamp=ts,
                variable="serie",
                value=float(value),
                expected=mean,
                z_score=round(float(z), 3),
                severity=severity,
                description=(
                    f"Valor {value:.2f} se desvía {z:.2f}σ respecto a la media "
                    f"{mean:.2f}."
                ),
            )
        )
    return anomalies


def forecast_series(
    values: list[float], periods_ahead: int = 7, method: str = "linear"
) -> dict[str, Any]:
    """Pronóstico simple."""

    if not values:
        return {
            "forecast": [],
            "lower": [],
            "upper": [],
            "method": method,
            "confidence": 0.0,
        }

    arr = np.asarray(values, dtype=float)
    forecast: list[float]

    if method == "linear":
        x = np.arange(len(arr))
        coeffs = np.polyfit(x, arr, 1)
        future_x = np.arange(len(arr), len(arr) + periods_ahead)
        forecast = (coeffs[0] * future_x + coeffs[1]).tolist()
    elif method == "exponential_smoothing":
        alpha = 0.3
        s = float(arr[0])
        for v in arr[1:]:
            s = alpha * float(v) + (1 - alpha) * s
        forecast = [s for _ in range(periods_ahead)]
    elif method == "naive_seasonal":
        period = 7
        forecast = []
        for i in range(periods_ahead):
            idx = len(arr) - period + (i % period)
            if 0 <= idx < len(arr):
                forecast.append(float(arr[idx]))
            else:
                forecast.append(float(arr[-1]))
    else:
        forecast = [float(arr[-1])] * periods_ahead

    std = float(np.std(arr)) if len(arr) > 1 else 0.0
    lower = [v - 1.96 * std for v in forecast]
    upper = [v + 1.96 * std for v in forecast]
    confidence = max(0.0, min(1.0, 1.0 - (std / (abs(float(np.mean(arr))) + 1e-9))))

    return {
        "forecast": forecast,
        "lower": lower,
        "upper": upper,
        "method": method,
        "confidence": round(confidence, 3),
    }


def _tokenize_es(text: str) -> list[str]:
    tokens = re.findall(r"[a-záéíóúñü]+", text.lower())
    return [t for t in tokens if len(t) > 3 and t not in _SPANISH_STOPWORDS]


def topic_modeling(texts: list[str], n_topics: int = 5) -> list[dict[str, Any]]:
    """Topic modeling con TF-IDF + KMeans, fallback a frecuencia de keywords."""

    if not texts:
        return []

    try:
        from sklearn.cluster import KMeans
        from sklearn.feature_extraction.text import TfidfVectorizer

        vectorizer = TfidfVectorizer(
            max_features=200,
            stop_words=list(_SPANISH_STOPWORDS),
            token_pattern=r"[a-záéíóúñü]{4,}",
            lowercase=True,
        )
        matrix = vectorizer.fit_transform(texts)
        n = max(1, min(n_topics, matrix.shape[0]))
        km = KMeans(n_clusters=n, random_state=42, n_init=10)
        labels = km.fit_predict(matrix)
        feature_names = vectorizer.get_feature_names_out()
        topics: list[dict[str, Any]] = []
        for k in range(n):
            centroid = km.cluster_centers_[k]
            top_idx = centroid.argsort()[::-1][:8]
            top_words = [feature_names[i] for i in top_idx]
            doc_idx = [i for i, lbl in enumerate(labels) if lbl == k]
            samples = [texts[i] for i in doc_idx[:3]]
            topics.append(
                {
                    "id": k,
                    "top_words": top_words,
                    "document_count": len(doc_idx),
                    "sample_documents": samples,
                }
            )
        return topics
    except Exception:
        # Fallback: frecuencia de keywords agrupada por documento
        all_tokens = [_tokenize_es(t) for t in texts]
        global_counter: Counter[str] = Counter()
        for toks in all_tokens:
            global_counter.update(set(toks))
        common = [w for w, _ in global_counter.most_common(n_topics * 6)]
        topics = []
        per_topic = max(1, len(common) // max(1, n_topics))
        for k in range(n_topics):
            words = common[k * per_topic : (k + 1) * per_topic] or common[:per_topic]
            doc_idx = [
                i for i, toks in enumerate(all_tokens) if any(w in toks for w in words)
            ]
            topics.append(
                {
                    "id": k,
                    "top_words": words[:8],
                    "document_count": len(doc_idx),
                    "sample_documents": [texts[i] for i in doc_idx[:3]],
                }
            )
        return topics


def sentiment_aggregation(
    items: list[dict[str, Any]], group_by: str = "actor"
) -> dict[str, Any]:
    """Agrupa scores de sentimiento por un campo."""

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        key = str(item.get(group_by, "desconocido"))
        grouped[key].append(item)

    result: dict[str, Any] = {}
    for key, group in grouped.items():
        scores = [float(it.get("sentiment", 0.0)) for it in group]
        if not scores:
            continue
        avg = float(np.mean(scores))
        std = float(np.std(scores)) if len(scores) > 1 else 0.0
        # tendencia: comparar primera mitad y segunda mitad
        mid = len(scores) // 2
        if mid >= 1:
            first = float(np.mean(scores[:mid]))
            second = float(np.mean(scores[mid:]))
            delta = second - first
            if delta > 0.05:
                trend = "up"
            elif delta < -0.05:
                trend = "down"
            else:
                trend = "flat"
        else:
            trend = "flat"
        quotes = [
            str(it.get("text") or it.get("quote") or "")[:200]
            for it in group
            if it.get("text") or it.get("quote")
        ][:3]
        result[key] = {
            "avg_sentiment": round(avg, 4),
            "std_dev": round(std, 4),
            "count": len(scores),
            "trend": trend,
            "top_quotes": quotes,
        }
    return result


def cross_domain_correlation(
    political: dict[str, list[float]],
    economic: dict[str, list[float]],
    social: dict[str, list[float]],
) -> list[CorrelationFinding]:
    """Correlaciones cruzadas entre dominios político, económico y social."""

    findings: list[CorrelationFinding] = []

    def cross(domain_a: dict, label_a: str, domain_b: dict, label_b: str) -> None:
        for a, va in domain_a.items():
            for b, vb in domain_b.items():
                r, p = _pearson(va, vb)
                if abs(r) < 0.2:
                    continue
                findings.append(
                    CorrelationFinding(
                        variable_a=f"{label_a}:{a}",
                        variable_b=f"{label_b}:{b}",
                        correlation=round(r, 4),
                        p_value=p,
                        period_days=min(len(va), len(vb)),
                        interpretation=_interpret_pair(
                            f"{label_a}:{a}", f"{label_b}:{b}", r
                        ),
                        strength=_classify_strength(r),
                    )
                )

    cross(political, "político", economic, "económico")
    cross(political, "político", social, "social")
    cross(economic, "económico", social, "social")

    findings.sort(key=lambda f: abs(f.correlation), reverse=True)
    return findings[:10]


def compute_polarization_index(party_sentiments: dict[str, float]) -> dict[str, Any]:
    """Índice de polarización (0-1) basado en varianza de sentimientos por partido."""

    if not party_sentiments:
        return {
            "index": 0.0,
            "classification": "low",
            "interpretation": "Sin datos suficientes para calcular polarización.",
        }
    values = np.asarray(list(party_sentiments.values()), dtype=float)
    variance = float(np.var(values))
    # Normalizar: varianza máxima esperada ≈ 1.0 para sentimientos en [-1, 1]
    index = float(min(1.0, variance))

    if index < 0.1:
        classification = "low"
        interp = "Polarización baja: los partidos muestran sentimientos similares."
    elif index < 0.25:
        classification = "medium"
        interp = "Polarización media: divergencia moderada entre partidos."
    elif index < 0.5:
        classification = "high"
        interp = "Polarización alta: marcada divergencia entre los principales actores."
    else:
        classification = "extreme"
        interp = "Polarización extrema: posiciones totalmente enfrentadas."

    return {
        "index": round(index, 4),
        "classification": classification,
        "interpretation": interp,
    }


def compute_volatility_index(values: list[float], window: int = 14) -> float:
    """Coeficiente de variación sobre ventana móvil."""

    if not values or window < 2:
        return 0.0
    arr = np.asarray(values, dtype=float)
    if len(arr) < window:
        window = len(arr)
    cvs: list[float] = []
    for i in range(window, len(arr) + 1):
        chunk = arr[i - window : i]
        mean = float(np.mean(chunk))
        std = float(np.std(chunk))
        if mean != 0:
            cvs.append(std / abs(mean))
    if not cvs:
        return 0.0
    return float(round(np.mean(cvs), 4))


def compute_momentum_score(series: list[float], short: int = 7, long: int = 30) -> float:
    """Momentum: MA corta / MA larga - 1."""

    if not series:
        return 0.0
    arr = np.asarray(series, dtype=float)
    if len(arr) < short:
        return 0.0
    long_eff = min(long, len(arr))
    ma_short = float(np.mean(arr[-short:]))
    ma_long = float(np.mean(arr[-long_eff:]))
    if ma_long == 0:
        return 0.0
    return float(round(ma_short / ma_long - 1, 4))


def _demo_dataset() -> dict[str, list[float]]:
    """Series temporales de demo (90 días)."""

    rng = np.random.default_rng(42)
    n = 90
    t = np.arange(n)
    base_pp = 33 + 0.02 * t + rng.normal(0, 0.6, n)
    base_psoe = 30 - 0.015 * t + rng.normal(0, 0.6, n)
    base_vox = 12 + 0.01 * t + rng.normal(0, 0.5, n)
    ipc = 3.5 + 0.005 * t + rng.normal(0, 0.1, n)
    paro = 12.0 - 0.008 * t + rng.normal(0, 0.15, n)
    sent_gov = -0.1 - 0.002 * t + rng.normal(0, 0.05, n)
    sent_opo = 0.05 + 0.001 * t + rng.normal(0, 0.05, n)
    corruption = 50 + 5 * np.sin(t / 7) + rng.normal(0, 8, n)
    gdp = 1.8 + rng.normal(0, 0.1, n)
    energy = 80 + 0.1 * t + rng.normal(0, 5, n)
    immig = 30 + 10 * np.sin(t / 10) + rng.normal(0, 5, n)
    housing = 100 + 0.3 * t + rng.normal(0, 8, n)

    return {
        "pp_polls": base_pp.tolist(),
        "psoe_polls": base_psoe.tolist(),
        "vox_polls": base_vox.tolist(),
        "ipc": ipc.tolist(),
        "paro_rate": paro.tolist(),
        "twitter_sentiment_government": sent_gov.tolist(),
        "twitter_sentiment_opposition": sent_opo.tolist(),
        "news_volume_corruption": corruption.tolist(),
        "gdp_growth": gdp.tolist(),
        "energy_prices": energy.tolist(),
        "immigration_news_volume": immig.tolist(),
        "housing_complaints": housing.tolist(),
    }
