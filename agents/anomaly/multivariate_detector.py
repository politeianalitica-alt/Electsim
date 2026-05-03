"""
Bloque 6 — MultivariateAnomalyDetector.

Extiende el detector univariado de Bloque 3 con cuatro tipos de senal:

  1. volume_spike           — pico de menciones (z-score, como Bloque 3)
  2. sentiment_trajectory   — pendiente acelerada (regresion lineal sobre 7d)
  3. network_centrality_shift — cambio brusco de PageRank en el grafo causal
  4. coordinated_attack_pattern — sincronizacion temporal entre medios de nicho

Las senales se fusionan via media bayesiana ponderada (Bayes simple:
probabilidad posterior = producto de likelihoods normalizados).

Salida:
  AnomalySignal  dataclass con todos los campos + causal_chain_json
  que se persiste en entity_anomaly_alerts (columna extendida en 0036).
"""
from __future__ import annotations

import json
import logging
import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_BASELINE_DAYS: int = 14          # ventana de baseline (dias 1-14 atras)
_ANALYSIS_DAYS: int = 1           # ventana de analisis (hoy = dia 0)
_Z_THRESHOLD: float = 2.0         # z-score para volume_spike
_STD_FLOOR: float = 0.5           # floor para std (evitar division por cero)
_SLOPE_THRESHOLD: float = 0.15    # pendiente normalizada por senal sentiment_trajectory
_CENTRALITY_DELTA: float = 0.20   # cambio relativo de PageRank para centrality_shift
_COORDINATED_SOURCES_MIN: int = 3 # fuentes distintas en ventana corta para coordinated
_COORDINATED_WINDOW_H: int = 2    # ventana en horas para coordinated_attack
_FUSION_WEIGHTS: dict = {
    "volume_spike":              0.35,
    "sentiment_trajectory":      0.25,
    "network_centrality_shift":  0.25,
    "coordinated_attack_pattern": 0.15,
}


# ---------------------------------------------------------------------------
# Modelo de datos
# ---------------------------------------------------------------------------

@dataclass
class AnomalySignal:
    entity_qid: str
    nombre_oficial: str
    signal_type: str       # volume_spike | sentiment_trajectory |
                           # network_centrality_shift | coordinated_attack_pattern
    severity: float        # 0-1 fusion bayesiana
    z_score: float = 0.0
    value_current: float = 0.0
    value_baseline: float = 0.0
    correlated_entities: list[str] = field(default_factory=list)
    temporal_pattern: str = ""    # descripcion textual del patron
    causal_hypothesis: str = ""   # hipotesis generada
    causal_chain_json: Optional[dict] = None  # {chain: [...], root_cause: qid}
    recommended_action: str = ""
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    alert_id: str = field(default_factory=lambda: f"ALT-{uuid.uuid4().hex[:8].upper()}")


# ---------------------------------------------------------------------------
# MultivariateAnomalyDetector
# ---------------------------------------------------------------------------

class MultivariateAnomalyDetector:
    """
    Detecta anomalias multivariadas para cada entidad canonica.

    Uso tipico:
        detector = MultivariateAnomalyDetector()
        signals = detector.run()
        for s in signals:
            print(s.entity_qid, s.signal_type, s.severity)
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
    # Entry point principal
    # ------------------------------------------------------------------

    def run(
        self,
        min_severity: float = 0.30,
        persist: bool = True,
    ) -> list[AnomalySignal]:
        """
        Ejecuta todos los detectores y fusiona las senales.

        Returns:
            Lista de AnomalySignal con severity >= min_severity.
        """
        if self._conn is None:
            log.warning("MultivariateAnomalyDetector: sin conexion BD")
            return []

        entities = self._load_active_entities()
        log.info("MultivariateAnomalyDetector: evaluando %d entidades", len(entities))

        all_signals: list[AnomalySignal] = []
        for entity in entities:
            signals = self._detect_entity(entity)
            fused = self._fuse_signals(entity, signals)
            if fused is not None and fused.severity >= min_severity:
                all_signals.append(fused)
                if persist:
                    self._persist_signal(fused)

        try:
            self._conn.commit()
        except Exception:
            pass

        all_signals.sort(key=lambda s: s.severity, reverse=True)
        return all_signals

    # ------------------------------------------------------------------
    # Carga de entidades activas
    # ------------------------------------------------------------------

    def _load_active_entities(self) -> list[dict]:
        since = datetime.now(timezone.utc) - timedelta(days=_BASELINE_DAYS + 2)
        try:
            rows = list(self._conn.execute(
                """
                SELECT DISTINCT em.resolved_qid, ec.nombre_oficial
                FROM entity_mentions em
                JOIN entities_canonical ec ON ec.qid = em.resolved_qid
                WHERE em.published_at >= %(since)s
                  AND em.resolved_qid IS NOT NULL
                ORDER BY em.resolved_qid
                """,
                {"since": since},
            ))
            return [{"qid": r[0], "nombre_oficial": r[1] or r[0]} for r in rows]
        except Exception as exc:
            log.warning("MultivariateAnomalyDetector: error cargando entidades: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Detector por entidad
    # ------------------------------------------------------------------

    def _detect_entity(self, entity: dict) -> list[AnomalySignal]:
        signals: list[AnomalySignal] = []
        qid = entity["qid"]
        nombre = entity["nombre_oficial"]

        vol = self._detect_volume_spike(qid, nombre)
        if vol:
            signals.append(vol)

        traj = self._detect_sentiment_trajectory(qid, nombre)
        if traj:
            signals.append(traj)

        centrality = self._detect_centrality_shift(qid, nombre)
        if centrality:
            signals.append(centrality)

        coordinated = self._detect_coordinated_attack(qid, nombre)
        if coordinated:
            signals.append(coordinated)

        return signals

    # ------------------------------------------------------------------
    # Senal 1: volume_spike
    # ------------------------------------------------------------------

    def _detect_volume_spike(self, qid: str, nombre: str) -> Optional[AnomalySignal]:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        baseline_start = today_start - timedelta(days=_BASELINE_DAYS)

        try:
            # Menciones hoy
            row_today = next(iter(self._conn.execute(
                """
                SELECT COUNT(*) FROM entity_mentions
                WHERE resolved_qid = %(qid)s
                  AND published_at >= %(ts)s
                """,
                {"qid": qid, "ts": today_start},
            )), (0,))
            count_today = float(row_today[0])

            # Baseline diario
            rows_base = list(self._conn.execute(
                """
                SELECT DATE(published_at) AS d, COUNT(*) AS n
                FROM entity_mentions
                WHERE resolved_qid = %(qid)s
                  AND published_at >= %(from_t)s
                  AND published_at < %(to_t)s
                GROUP BY d
                """,
                {"qid": qid, "from_t": baseline_start, "to_t": today_start},
            ))
            if not rows_base:
                return None

            daily = [float(r[1]) for r in rows_base]
            mean_b = np.mean(daily)
            std_b = max(float(np.std(daily)), _STD_FLOOR)
            z = (count_today - mean_b) / std_b

            if z < _Z_THRESHOLD:
                return None

            severity = float(np.clip((z - _Z_THRESHOLD) / (10.0 - _Z_THRESHOLD), 0.0, 1.0))
            return AnomalySignal(
                entity_qid=qid,
                nombre_oficial=nombre,
                signal_type="volume_spike",
                severity=severity,
                z_score=round(z, 2),
                value_current=count_today,
                value_baseline=round(mean_b, 1),
                temporal_pattern=f"Menciones hoy: {int(count_today)} vs media {mean_b:.1f}/dia (z={z:.1f})",
                causal_hypothesis=f"Pico de atencion mediatica sobre {nombre} — posible evento exogeno",
                recommended_action="Monitorizar fuentes en tiempo real. Activar alerta si z > 4.",
            )
        except Exception as exc:
            log.debug("volume_spike error %s: %s", qid, exc)
            return None

    # ------------------------------------------------------------------
    # Senal 2: sentiment_trajectory
    # ------------------------------------------------------------------

    def _detect_sentiment_trajectory(self, qid: str, nombre: str) -> Optional[AnomalySignal]:
        since = datetime.now(timezone.utc) - timedelta(days=7)
        try:
            rows = list(self._conn.execute(
                """
                SELECT DATE(em.published_at) AS d,
                       AVG(rm.resolution_score) AS score_proxy
                FROM entity_mentions em
                JOIN raw_mentions rm ON rm.id = em.raw_mention_id
                WHERE em.resolved_qid = %(qid)s
                  AND em.published_at >= %(since)s
                GROUP BY d
                ORDER BY d
                """,
                {"qid": qid, "since": since},
            ))
            if len(rows) < 4:
                return None

            y = np.array([float(r[1]) for r in rows])
            x = np.arange(len(y), dtype=float)

            # Regresion lineal simple
            slope = float(np.polyfit(x, y, 1)[0])
            y_range = float(np.max(y) - np.min(y)) if np.max(y) != np.min(y) else 1.0
            slope_norm = slope / y_range

            if abs(slope_norm) < _SLOPE_THRESHOLD:
                return None

            direction = "negativa" if slope < 0 else "positiva"
            severity = float(np.clip(abs(slope_norm) / 0.5, 0.0, 1.0))

            return AnomalySignal(
                entity_qid=qid,
                nombre_oficial=nombre,
                signal_type="sentiment_trajectory",
                severity=severity,
                z_score=abs(slope_norm),
                value_current=round(float(y[-1]), 3),
                value_baseline=round(float(y[0]), 3),
                temporal_pattern=f"Tendencia {direction} sostenida 7d (pendiente={slope_norm:.3f})",
                causal_hypothesis=f"Deterioro/mejora narrativo de {nombre} en medios de forma continua",
                recommended_action="Analizar cobertura editorializada. Cruzar con agenda oficial.",
            )
        except Exception as exc:
            log.debug("sentiment_trajectory error %s: %s", qid, exc)
            return None

    # ------------------------------------------------------------------
    # Senal 3: network_centrality_shift
    # ------------------------------------------------------------------

    def _detect_centrality_shift(self, qid: str, nombre: str) -> Optional[AnomalySignal]:
        """
        Detecta cambios bruscos en el PageRank de la entidad en el grafo causal.
        Compara el peso promedio de las aristas (proxy de centralidad) entre
        ventana actual y baseline.
        """
        now = datetime.now(timezone.utc)
        cutoff_recent = now - timedelta(days=7)
        cutoff_baseline = now - timedelta(days=_BASELINE_DAYS + 7)
        try:
            # Peso promedio reciente (7d)
            row_r = next(iter(self._conn.execute(
                """
                SELECT AVG(decayed_weight), COUNT(*)
                FROM entity_causal_edges
                WHERE (source_qid = %(qid)s OR target_qid = %(qid)s)
                  AND computed_at >= %(cut)s
                """,
                {"qid": qid, "cut": cutoff_recent},
            )), (None, 0))

            # Peso promedio baseline
            row_b = next(iter(self._conn.execute(
                """
                SELECT AVG(decayed_weight), COUNT(*)
                FROM entity_causal_edges
                WHERE (source_qid = %(qid)s OR target_qid = %(qid)s)
                  AND computed_at >= %(from_c)s
                  AND computed_at < %(to_c)s
                """,
                {"qid": qid, "from_c": cutoff_baseline, "to_c": cutoff_recent},
            )), (None, 0))

            if row_r[0] is None or row_b[0] is None or float(row_b[0]) < 0.01:
                return None

            weight_recent = float(row_r[0])
            weight_base = float(row_b[0])
            delta = (weight_recent - weight_base) / weight_base

            if abs(delta) < _CENTRALITY_DELTA:
                return None

            direction = "aumento" if delta > 0 else "reduccion"
            severity = float(np.clip(abs(delta) / 1.0, 0.0, 1.0))

            # Buscar entidades correladas (mas conectadas)
            corr_rows = list(self._conn.execute(
                """
                SELECT CASE WHEN source_qid = %(qid)s THEN target_qid ELSE source_qid END AS peer
                FROM entity_causal_edges
                WHERE (source_qid = %(qid)s OR target_qid = %(qid)s)
                  AND decayed_weight > 0.3
                ORDER BY decayed_weight DESC
                LIMIT 5
                """,
                {"qid": qid},
            ))
            correlated = [r[0] for r in corr_rows]

            return AnomalySignal(
                entity_qid=qid,
                nombre_oficial=nombre,
                signal_type="network_centrality_shift",
                severity=severity,
                z_score=abs(delta),
                value_current=round(weight_recent, 3),
                value_baseline=round(weight_base, 3),
                correlated_entities=correlated,
                temporal_pattern=f"{direction.capitalize()} de centralidad en grafo: {delta:+.1%}",
                causal_hypothesis=f"{nombre} ha {'ganado' if delta > 0 else 'perdido'} protagonismo relacional en la red de entidades",
                recommended_action="Revisar conexiones activas en grafo. Evaluar efecto arrastre sobre peers.",
            )
        except Exception as exc:
            log.debug("centrality_shift error %s: %s", qid, exc)
            return None

    # ------------------------------------------------------------------
    # Senal 4: coordinated_attack_pattern
    # ------------------------------------------------------------------

    def _detect_coordinated_attack(self, qid: str, nombre: str) -> Optional[AnomalySignal]:
        """
        Detecta patrones de publicacion sincronizada en multiples fuentes
        en una ventana corta (< COORDINATED_WINDOW_H horas).
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=_COORDINATED_WINDOW_H * 6)
        try:
            rows = list(self._conn.execute(
                """
                SELECT
                    DATE_TRUNC('hour', em.published_at) AS hora,
                    COUNT(DISTINCT rm.source_media)     AS n_fuentes,
                    COUNT(*)                            AS n_menciones
                FROM entity_mentions em
                JOIN raw_mentions rm ON rm.id = em.raw_mention_id
                WHERE em.resolved_qid = %(qid)s
                  AND em.published_at >= %(cut)s
                  AND rm.source_media IS NOT NULL
                  AND rm.source_media != ''
                GROUP BY hora
                ORDER BY n_fuentes DESC
                LIMIT 1
                """,
                {"qid": qid, "cut": cutoff},
            ))
            if not rows:
                return None

            hora, n_fuentes, n_menciones = rows[0]
            n_fuentes = int(n_fuentes)
            if n_fuentes < _COORDINATED_SOURCES_MIN:
                return None

            severity = float(np.clip((n_fuentes - _COORDINATED_SOURCES_MIN) / 7.0, 0.1, 1.0))

            return AnomalySignal(
                entity_qid=qid,
                nombre_oficial=nombre,
                signal_type="coordinated_attack_pattern",
                severity=severity,
                z_score=float(n_fuentes),
                value_current=float(n_menciones),
                value_baseline=float(_COORDINATED_SOURCES_MIN),
                temporal_pattern=f"{n_fuentes} fuentes distintas en < {_COORDINATED_WINDOW_H * 6}h sobre {nombre}",
                causal_hypothesis=f"Posible campaña coordinada de medios contra/a favor de {nombre}",
                recommended_action="Verificar si es cascada editorial organica o patron artificial. Activar OSINT.",
            )
        except Exception as exc:
            log.debug("coordinated_attack error %s: %s", qid, exc)
            return None

    # ------------------------------------------------------------------
    # Fusion bayesiana de senales
    # ------------------------------------------------------------------

    def _fuse_signals(
        self,
        entity: dict,
        signals: list[AnomalySignal],
    ) -> Optional[AnomalySignal]:
        """
        Fusiona las senales activas via media ponderada bayesiana.

        Devuelve una unica AnomalySignal fused con severity combinada,
        o None si no hay senales.
        """
        if not signals:
            return None

        # Fusion: suma ponderada de severidades
        total_weight = 0.0
        weighted_severity = 0.0
        for sig in signals:
            w = _FUSION_WEIGHTS.get(sig.signal_type, 0.10)
            weighted_severity += sig.severity * w
            total_weight += w

        if total_weight == 0:
            return None

        fused_severity = min(1.0, weighted_severity / total_weight)

        # Senal dominante (mayor severity individual)
        dominant = max(signals, key=lambda s: s.severity)

        # Construir cadena causal
        causal_chain = [
            {"signal_type": s.signal_type, "severity": round(s.severity, 3)}
            for s in sorted(signals, key=lambda s: s.severity, reverse=True)
        ]
        correlated_all = list({
            qid for s in signals for qid in s.correlated_entities
        })
        causal_chain_json = {
            "chain": causal_chain,
            "root_cause": entity["qid"],
            "n_signals": len(signals),
        }

        return AnomalySignal(
            entity_qid=entity["qid"],
            nombre_oficial=entity["nombre_oficial"],
            signal_type=dominant.signal_type,
            severity=round(fused_severity, 4),
            z_score=dominant.z_score,
            value_current=dominant.value_current,
            value_baseline=dominant.value_baseline,
            correlated_entities=correlated_all,
            temporal_pattern=" | ".join(s.temporal_pattern for s in signals),
            causal_hypothesis=dominant.causal_hypothesis,
            causal_chain_json=causal_chain_json,
            recommended_action=dominant.recommended_action,
        )

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    def _persist_signal(self, signal: AnomalySignal) -> None:
        try:
            self._conn.execute(
                """
                INSERT INTO entity_anomaly_alerts
                  (qid, nombre_oficial, alert_type, signal_type, z_score,
                   value_current, value_baseline, hypothesis,
                   severity, correlated_entities, causal_chain_json,
                   recommended_action, activa, generated_at)
                VALUES
                  (%(qid)s, %(nombre)s, %(atype)s, %(stype)s, %(z)s,
                   %(vcur)s, %(vbase)s, %(hyp)s,
                   %(sev)s, %(corr)s, %(chain)s,
                   %(action)s, TRUE, NOW())
                """,
                {
                    "qid":    signal.entity_qid,
                    "nombre": signal.nombre_oficial,
                    "atype":  signal.signal_type,
                    "stype":  signal.signal_type,
                    "z":      signal.z_score,
                    "vcur":   signal.value_current,
                    "vbase":  signal.value_baseline,
                    "hyp":    signal.causal_hypothesis,
                    "sev":    signal.severity,
                    "corr":   json.dumps(signal.correlated_entities),
                    "chain":  json.dumps(signal.causal_chain_json) if signal.causal_chain_json else None,
                    "action": signal.recommended_action,
                },
            )
        except Exception as exc:
            log.debug("MultivariateAnomalyDetector: error persistiendo senal: %s", exc)
            try:
                self._conn.rollback()
            except Exception:
                pass
