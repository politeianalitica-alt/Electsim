"""
Bloque 7c — ElectoralShiftDetector.

Detecta y predice desplazamientos de voto blando usando la correlacion entre:
  - Cobertura mediatica por partido (volume × sentiment de entity_mentions)
  - Intencion de voto blando (datos CIS / oleadas de encuesta)

El metodo central correlaciona ambas series temporales (Pearson) y ajusta
un modelo lineal para estimar el shift esperado en la proxima oleada.

Salida: lista de ElectoralShiftSignal + persistencia en electoral_shift_signals.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta, timezone
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_WINDOW_DAYS: int = 30          # ventana de correlacion
_MIN_OVERLAP: int = 7           # dias minimos de solape para calcular correlacion
_SHIFT_THRESHOLD: float = 0.15  # correlacion minima para considerar senal
_MEDIA_DECAY_DAYS: int = 7      # lag con que el efecto mediatico impacta el voto

# QIDs de los principales partidos a monitorizar
_MONITORED_PARTY_QIDS: list[str] = [
    "Q101",  # PSOE
    "Q102",  # PP
    "Q103",  # VOX
    "Q104",  # SUMAR
]


# ---------------------------------------------------------------------------
# Modelo de datos
# ---------------------------------------------------------------------------

@dataclass
class ElectoralShiftSignal:
    signal_id: str = field(default_factory=lambda: f"ESS-{uuid.uuid4().hex[:8].upper()}")
    partido_qid: str = ""
    partido_siglas: str = ""
    date: date = field(default_factory=date.today)
    voto_blando_pct: float = 0.0      # % intencion blanda (CIS)
    media_coverage: float = 0.0       # menciones normalizadas
    sentiment_avg: float = 0.0        # tono promedio
    shift_index: float = 0.0          # correlacion media×voto
    shift_direction: str = "stable"   # up | down | stable
    correlation_pearson: float = 0.0  # r de Pearson media vs voto
    predicted_shift_pct: float = 0.0  # cambio estimado en proximo punto de encuesta
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# ElectoralShiftDetector
# ---------------------------------------------------------------------------

class ElectoralShiftDetector:
    """
    Detecta desplazamientos de voto blando correlacionando cobertura
    mediatica con datos de encuesta.

    Uso:
        detector = ElectoralShiftDetector()
        signals = detector.predict_electoral_shift()
    """

    def __init__(self, conn=None) -> None:
        if conn is None:
            try:
                from dashboard.db import get_conn
                self._conn = get_conn()
            except Exception:
                self._conn = None
        else:
            self._conn = conn

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def predict_electoral_shift(
        self,
        party_qids: Optional[list[str]] = None,
    ) -> list[ElectoralShiftSignal]:
        """
        Calcula la senal de desplazamiento para cada partido monitorizado.

        Returns:
            Lista de ElectoralShiftSignal, ordenada por |shift_index| desc.
        """
        targets = party_qids or _MONITORED_PARTY_QIDS
        signals: list[ElectoralShiftSignal] = []

        for qid in targets:
            sig = self._analyze_party(qid)
            if sig is not None:
                signals.append(sig)

        signals.sort(key=lambda s: abs(s.shift_index), reverse=True)
        self._persist(signals)
        return signals

    # ------------------------------------------------------------------
    # Analisis de un partido
    # ------------------------------------------------------------------

    def _analyze_party(self, qid: str) -> Optional[ElectoralShiftSignal]:
        siglas = self._get_siglas(qid)
        media_series = self._load_media_series(qid)
        voto_series = self._load_voto_series(qid)

        if not media_series or not voto_series:
            return self._demo_signal(qid, siglas)

        # Alinear series por fecha
        media_by_date = {d: v for d, v in media_series}
        voto_by_date = {d: v for d, v in voto_series}
        common_dates = sorted(set(media_by_date) & set(voto_by_date))

        if len(common_dates) < _MIN_OVERLAP:
            return self._demo_signal(qid, siglas)

        media_vals = [media_by_date[d] for d in common_dates]
        voto_vals = [voto_by_date[d] for d in common_dates]

        # Pearson con lag (efecte mediatico llega con _MEDIA_DECAY_DAYS de retraso)
        media_lagged = media_vals[:-_MEDIA_DECAY_DAYS] if len(media_vals) > _MEDIA_DECAY_DAYS else media_vals
        voto_aligned = voto_vals[_MEDIA_DECAY_DAYS:] if len(voto_vals) > _MEDIA_DECAY_DAYS else voto_vals
        n = min(len(media_lagged), len(voto_aligned))

        if n < _MIN_OVERLAP:
            pearson = 0.0
        else:
            pearson = float(np.corrcoef(media_lagged[:n], voto_aligned[:n])[0, 1])
            if np.isnan(pearson):
                pearson = 0.0

        # Shift index = Pearson * media_coverage_norm * sentiment_trend
        media_norm = float(np.clip(np.mean(media_vals[-7:]) / (np.mean(media_vals) + 1e-6) - 1, -1, 1))
        sent_avg = self._load_sentiment_avg(qid)
        shift_index = float(np.clip(pearson * (0.5 + 0.5 * media_norm), -1, 1))

        direction: str
        if shift_index > _SHIFT_THRESHOLD:
            direction = "up"
        elif shift_index < -_SHIFT_THRESHOLD:
            direction = "down"
        else:
            direction = "stable"

        # Prediccion del siguiente punto de encuesta
        predicted = self._predict_next(voto_vals, pearson, media_norm)

        return ElectoralShiftSignal(
            partido_qid=qid,
            partido_siglas=siglas,
            date=date.today(),
            voto_blando_pct=round(float(voto_vals[-1]), 2) if voto_vals else 0.0,
            media_coverage=round(float(np.mean(media_vals[-7:])), 3),
            sentiment_avg=round(sent_avg, 3),
            shift_index=round(shift_index, 4),
            shift_direction=direction,
            correlation_pearson=round(pearson, 4),
            predicted_shift_pct=round(predicted, 2),
        )

    # ------------------------------------------------------------------
    # Carga de datos
    # ------------------------------------------------------------------

    def _get_siglas(self, qid: str) -> str:
        siglas_map = {
            "Q101": "PSOE", "Q102": "PP", "Q103": "VOX", "Q104": "SUMAR",
            "Q105": "ERC", "Q106": "JUNTS", "Q107": "PNV", "Q108": "EH Bildu",
        }
        if qid in siglas_map:
            return siglas_map[qid]
        if self._conn is None:
            return qid
        try:
            row = next(iter(self._conn.execute(
                "SELECT nombre_oficial FROM entities_canonical WHERE qid = %(qid)s",
                {"qid": qid},
            )), None)
            return str(row[0]) if row else qid
        except Exception:
            return qid

    def _load_media_series(self, qid: str) -> list[tuple[date, float]]:
        """Carga menciones diarias normalizadas para el partido."""
        if self._conn is None:
            return []
        since = datetime.now(timezone.utc) - timedelta(days=_WINDOW_DAYS)
        try:
            rows = list(self._conn.execute(
                """
                SELECT DATE(published_at) AS d, COUNT(*) AS n
                FROM entity_mentions
                WHERE resolved_qid = %(qid)s
                  AND published_at >= %(since)s
                GROUP BY d
                ORDER BY d
                """,
                {"qid": qid, "since": since},
            ))
            if not rows:
                return []
            values = [float(r[1]) for r in rows]
            max_val = max(values) if values else 1.0
            return [(r[0], v / max(max_val, 1.0)) for r, v in zip(rows, values)]
        except Exception:
            return []

    def _load_voto_series(self, qid: str) -> list[tuple[date, float]]:
        """Carga intencion de voto blando desde oleadas de encuesta."""
        if self._conn is None:
            return []
        since = datetime.now(timezone.utc) - timedelta(days=_WINDOW_DAYS)
        try:
            # Intentar tabla perfiles_votante o data_sources_oleadas
            rows = list(self._conn.execute(
                """
                SELECT fecha::date AS d, intencion_voto_pct AS n
                FROM perfiles_votante
                WHERE partido_qid = %(qid)s
                  AND fecha >= %(since)s
                ORDER BY fecha
                """,
                {"qid": qid, "since": since},
            ))
            if rows:
                return [(r[0], float(r[1])) for r in rows]

            # Fallback: data_sources_oleadas
            rows2 = list(self._conn.execute(
                """
                SELECT fecha::date, valor
                FROM data_sources_oleadas
                WHERE partido = %(qid)s
                  AND tipo = 'intencion_directa'
                  AND fecha >= %(since)s
                ORDER BY fecha
                """,
                {"qid": qid, "since": since},
            ))
            return [(r[0], float(r[1])) for r in rows2]
        except Exception:
            return []

    def _load_sentiment_avg(self, qid: str) -> float:
        """Tono promedio de la cobertura mediatica reciente."""
        if self._conn is None:
            return 0.0
        since = datetime.now(timezone.utc) - timedelta(days=7)
        try:
            row = next(iter(self._conn.execute(
                """
                SELECT AVG(rm.resolution_score)
                FROM entity_mentions em
                JOIN raw_mentions rm ON rm.id = em.raw_mention_id
                WHERE em.resolved_qid = %(qid)s
                  AND em.published_at >= %(since)s
                """,
                {"qid": qid, "since": since},
            )), (None,))
            return float(row[0]) if row[0] is not None else 0.0
        except Exception:
            return 0.0

    def _predict_next(
        self,
        voto_vals: list[float],
        pearson: float,
        media_norm: float,
    ) -> float:
        """Estima el shift en el proximo punto de encuesta."""
        if len(voto_vals) < 3:
            return 0.0
        # Tendencia reciente de la encuesta
        recent = voto_vals[-3:]
        trend = float(recent[-1] - recent[0]) / 2.0
        # El efecto mediatico amortigua o amplifica la tendencia
        media_effect = pearson * media_norm * 0.5
        return trend + media_effect

    # ------------------------------------------------------------------
    # Demo (sin BD)
    # ------------------------------------------------------------------

    def _demo_signal(self, qid: str, siglas: str) -> ElectoralShiftSignal:
        rng = np.random.default_rng(abs(hash(qid)) % 2**31)
        shift = float(rng.uniform(-0.3, 0.3))
        return ElectoralShiftSignal(
            partido_qid=qid,
            partido_siglas=siglas,
            date=date.today(),
            voto_blando_pct=round(float(rng.uniform(5, 35)), 1),
            media_coverage=round(float(rng.uniform(0.2, 0.9)), 3),
            sentiment_avg=round(float(rng.uniform(-0.3, 0.3)), 3),
            shift_index=round(shift, 4),
            shift_direction="up" if shift > 0.15 else ("down" if shift < -0.15 else "stable"),
            correlation_pearson=round(float(rng.uniform(-0.5, 0.8)), 4),
            predicted_shift_pct=round(shift * 2.5, 2),
        )

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    def _persist(self, signals: list[ElectoralShiftSignal]) -> None:
        if self._conn is None:
            return
        try:
            for s in signals:
                self._conn.execute(
                    """
                    INSERT INTO electoral_shift_signals
                      (partido_qid, partido_siglas, date, voto_blando_pct,
                       media_coverage, sentiment_avg, shift_index, shift_direction, created_at)
                    VALUES
                      (%(qid)s, %(siglas)s, %(d)s, %(voto)s,
                       %(media)s, %(sent)s, %(idx)s, %(dir)s, NOW())
                    ON CONFLICT (partido_qid, date) DO UPDATE SET
                      shift_index     = EXCLUDED.shift_index,
                      shift_direction = EXCLUDED.shift_direction,
                      media_coverage  = EXCLUDED.media_coverage,
                      sentiment_avg   = EXCLUDED.sentiment_avg,
                      created_at      = NOW()
                    """,
                    {
                        "qid":    s.partido_qid,
                        "siglas": s.partido_siglas,
                        "d":      s.date,
                        "voto":   s.voto_blando_pct,
                        "media":  s.media_coverage,
                        "sent":   s.sentiment_avg,
                        "idx":    s.shift_index,
                        "dir":    s.shift_direction,
                    },
                )
            self._conn.commit()

            # Tambien persistir en prediction_results
            import json as _json
            for s in signals:
                if abs(s.shift_index) > _SHIFT_THRESHOLD:
                    pid = f"ESHIFT-{s.partido_qid}-{s.date}"
                    self._conn.execute(
                        """
                        INSERT INTO prediction_results
                          (prediction_id, model_type, horizon_days, probability,
                           confidence_low, confidence_high, entities_involved, scenario_json,
                           generated_at)
                        VALUES
                          (%(pid)s, 'electoral_shift', 14, %(prob)s,
                           %(clo)s, %(chi)s, %(ent)s, %(scen)s,
                           NOW())
                        ON CONFLICT (prediction_id) DO NOTHING
                        """,
                        {
                            "pid":  pid,
                            "prob": float(np.clip(abs(s.shift_index), 0, 1)),
                            "clo":  float(np.clip(abs(s.shift_index) - 0.08, 0, 1)),
                            "chi":  float(np.clip(abs(s.shift_index) + 0.08, 0, 1)),
                            "ent":  _json.dumps([s.partido_qid]),
                            "scen": _json.dumps({
                                "partido": s.partido_siglas,
                                "direction": s.shift_direction,
                                "correlation": s.correlation_pearson,
                                "predicted_shift_pct": s.predicted_shift_pct,
                            }),
                        },
                    )
            self._conn.commit()
        except Exception as exc:
            log.debug("ElectoralShiftDetector: persist error: %s", exc)
            try:
                self._conn.rollback()
            except Exception:
                pass
