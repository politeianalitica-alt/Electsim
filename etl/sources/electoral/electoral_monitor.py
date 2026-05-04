"""
Electoral Monitor — Bloque 6.

Orquestador ETL del módulo electoral:
  - Carga encuestas (CSV / Wikipedia)
  - Calcula nowcasting
  - Asigna escaños
  - Analiza coaliciones
  - Estima voto blando
  - Persiste en BD
  - Lanza alertas

Patrón análogo a EconomyMonitor (Bloque 5).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


class ElectoralMonitor:
    """
    Monitor electoral. Puede ejecutarse completo (run_all) o por fases.

    Parámetros:
        engine: SQLAlchemy engine (puede ser None → modo dry-run).
        geography: Código geográfico (ej. "ES").
        half_life_days: Semivida de recencia para nowcasting.
        total_seats: Total de escaños.
        majority_threshold: Umbral de mayoría.
        max_coalition_parties: Máximo de partidos en una coalición.
        dry_run: Si True, no persiste datos.
    """

    def __init__(
        self,
        engine: Any = None,
        geography: str = "ES",
        half_life_days: int = 21,
        total_seats: int = 350,
        majority_threshold: int = 176,
        max_coalition_parties: int = 5,
        dry_run: bool = False,
    ) -> None:
        self.engine = engine
        self.geography = geography
        self.half_life_days = half_life_days
        self.total_seats = total_seats
        self.majority_threshold = majority_threshold
        self.max_coalition_parties = max_coalition_parties
        self.dry_run = dry_run

        # Estado
        self._polls: list = []
        self._estimates_by_poll: dict[str, list] = {}
        self._quality_by_poll: dict[str, float] = {}
        self._snapshot = None
        self._coalitions: list = []
        self._soft_estimates: list = []
        self._segments: list = []

    # ── Carga de encuestas ────────────────────────────────────────────────────

    def load_polls_from_csv(self, path: str, source: str = "manual") -> int:
        """Carga encuestas desde CSV y las acumula."""
        from etl.sources.electoral.polls_provider import load_polls_from_csv
        polls, estimates = load_polls_from_csv(path, source=source, geography=self.geography)
        self._ingest_polls(polls, estimates)
        return len(polls)

    def load_polls_from_wikipedia(self) -> int:
        """Carga encuestas desde Wikipedia."""
        from etl.sources.electoral.polls_provider import load_polls_from_wikipedia
        polls, estimates = load_polls_from_wikipedia(geography=self.geography)
        self._ingest_polls(polls, estimates)
        return len(polls)

    def _ingest_polls(self, polls: list, estimates: list) -> None:
        """Acumula polls y organiza estimaciones por poll_id."""
        from etl.sources.electoral.electoral_adapter import (
            deduplicate_polls,
            compute_poll_quality,
        )

        # Deduplicar y acumular
        all_polls = self._polls + polls
        unique_polls = deduplicate_polls(all_polls)
        self._polls = unique_polls

        # Organizar estimaciones
        for est in estimates:
            if est.poll_id not in self._estimates_by_poll:
                self._estimates_by_poll[est.poll_id] = []
            self._estimates_by_poll[est.poll_id].append(est)

        # Calcular calidad de polls nuevos
        for poll in polls:
            if poll.poll_id not in self._quality_by_poll:
                q = compute_poll_quality(poll)
                self._quality_by_poll[poll.poll_id] = q.total_score

        logger.info(
            "electoral_monitor: %d polls acumulados (%d con estimaciones)",
            len(self._polls),
            len(self._estimates_by_poll),
        )

    # ── Nowcasting ────────────────────────────────────────────────────────────

    def compute_nowcast(self, model_name: str = "weighted_average_v1") -> Any | None:
        """Calcula el nowcasting con los polls cargados."""
        from etl.sources.electoral.nowcasting_model import compute_nowcast

        if not self._polls:
            logger.warning("electoral_monitor: no hay polls — nowcasting no calculado")
            return None

        snapshot = compute_nowcast(
            polls=self._polls,
            estimates_by_poll=self._estimates_by_poll,
            quality_by_poll=self._quality_by_poll,
            half_life_days=self.half_life_days,
            total_seats=self.total_seats,
            majority_threshold=self.majority_threshold,
            model_name=model_name,
            geography=self.geography,
        )
        self._snapshot = snapshot
        return snapshot

    def persist_nowcast(self) -> int | None:
        """Persiste el snapshot de nowcasting en BD."""
        if self._snapshot is None or self.dry_run:
            return None
        from etl.sources.electoral.nowcasting_model import save_nowcast_snapshot
        return save_nowcast_snapshot(self._snapshot, self.engine)

    # ── Coaliciones ───────────────────────────────────────────────────────────

    def analyze_coalitions(self, snapshot_id: int | None = None) -> list:
        """Analiza coaliciones con los escaños del snapshot actual."""
        from etl.sources.electoral.coalition_model import analyze_all_coalitions

        if self._snapshot is None:
            logger.warning("electoral_monitor: sin snapshot — coaliciones no calculadas")
            return []

        seats = self._snapshot.seat_estimates
        if not seats:
            return []

        self._coalitions = analyze_all_coalitions(
            seats=seats,
            majority_threshold=self.majority_threshold,
            max_parties=self.max_coalition_parties,
            snapshot_id=snapshot_id,
        )
        logger.info("electoral_monitor: %d coaliciones analizadas", len(self._coalitions))
        return self._coalitions

    def persist_coalitions(self, snapshot_id: int | None = None) -> int:
        """Persiste coaliciones en BD."""
        if self.dry_run or not self._coalitions:
            return 0
        from etl.sources.electoral.coalition_model import save_coalition_scenarios
        return save_coalition_scenarios(self._coalitions, self.engine)

    # ── Voto blando ───────────────────────────────────────────────────────────

    def estimate_soft_vote(self) -> list:
        """Estima el voto blando con las estimaciones del snapshot."""
        from etl.sources.electoral.soft_vote_model import estimate_soft_vote

        if self._snapshot is None:
            return []

        self._soft_estimates = estimate_soft_vote(
            party_estimates=self._snapshot.party_estimates,
            geography=self.geography,
        )
        return self._soft_estimates

    def persist_soft_vote(self) -> int:
        """Persiste estimaciones de voto blando en BD."""
        if self.dry_run or not self._soft_estimates:
            return 0
        from etl.sources.electoral.soft_vote_model import save_soft_vote_estimates
        return save_soft_vote_estimates(self._soft_estimates, self.engine)

    # ── Segmentos de votante ──────────────────────────────────────────────────

    def load_segments(self, path: str | None = None) -> list:
        """Carga segmentos de votante. Sin path usa los defaults."""
        if path:
            from etl.sources.electoral.voter_segments import load_segments_from_csv
            self._segments = load_segments_from_csv(path)
        else:
            from etl.sources.electoral.voter_segments import get_default_segments
            self._segments = get_default_segments()
        return self._segments

    def persist_segments(self) -> int:
        """Persiste segmentos en BD."""
        if self.dry_run or not self._segments:
            return 0
        from etl.sources.electoral.voter_segments import save_segments
        return save_segments(self._segments, self.engine)

    # ── Alertas ───────────────────────────────────────────────────────────────

    def generate_alerts(
        self,
        previous_snapshot=None,
        swing_threshold: float = 2.0,
    ) -> list:
        """
        Genera alertas electorales comparando el snapshot actual con el anterior.

        Returns:
            Lista de ElectoralAlert.
        """
        from etl.sources.electoral.schemas import ElectoralAlert

        if self._snapshot is None:
            return []

        alerts = []

        # Alerta: partido líder
        if self._snapshot.leading_party:
            alerts.append(ElectoralAlert(
                alert_type="electoral_poll_shift",
                severity="INFO",
                title=f"Partido líder: {self._snapshot.leading_party}",
                description=(
                    f"{self._snapshot.leading_party} lidera con "
                    f"{self._snapshot.party_estimates.get(self._snapshot.leading_party, 0):.1f}%"
                ),
                datos={
                    "leading_party": self._snapshot.leading_party,
                    "party_estimates": self._snapshot.party_estimates,
                },
            ))

        # Alerta: mayoría
        for bloc, prob in self._snapshot.majority_probability.items():
            if prob > 0.65:
                alerts.append(ElectoralAlert(
                    alert_type="electoral_majority_change",
                    severity="WARNING" if prob > 0.80 else "INFO",
                    title=f"Alta probabilidad de mayoría: {bloc} ({prob:.0%})",
                    description=f"El bloque {bloc} tiene {prob:.0%} de probabilidad de mayoría.",
                    datos={"bloc": bloc, "probability": prob},
                ))

        # Alertas de swing vs snapshot anterior
        if previous_snapshot:
            for party, cur_share in self._snapshot.party_estimates.items():
                prev_share = previous_snapshot.party_estimates.get(party, 0.0)
                swing = cur_share - prev_share
                if abs(swing) >= swing_threshold:
                    alerts.append(ElectoralAlert(
                        alert_type="electoral_poll_shift",
                        severity="WARNING" if abs(swing) >= 4.0 else "INFO",
                        title=f"Swing de {swing:+.1f}pp para {party}",
                        description=(
                            f"{party}: {prev_share:.1f}% → {cur_share:.1f}% "
                            f"({swing:+.1f}pp)"
                        ),
                        datos={
                            "party": party,
                            "prev_share": prev_share,
                            "cur_share": cur_share,
                            "swing": swing,
                        },
                    ))

        # Alerta: tipping point (coalición ajustada)
        for coalition in self._coalitions:
            if coalition.has_majority and abs(coalition.majority_margin) <= 5:
                alerts.append(ElectoralAlert(
                    alert_type="electoral_seat_tipping_point",
                    severity="WARNING",
                    title=f"Mayoría ajustada: {coalition.name} ({coalition.seats_total} escaños)",
                    description=coalition.explanation,
                    datos={
                        "coalition": coalition.name,
                        "seats_total": coalition.seats_total,
                        "majority_margin": coalition.majority_margin,
                    },
                ))

        return alerts

    # ── Ejecución completa ────────────────────────────────────────────────────

    def run_all(
        self,
        polls_csv: str | None = None,
        include_wikipedia: bool = True,
        segments_csv: str | None = None,
    ) -> dict[str, Any]:
        """
        Ejecuta el ciclo completo del monitor electoral.

        Args:
            polls_csv: Ruta a CSV de encuestas (opcional).
            include_wikipedia: Si True, incluye encuestas de Wikipedia.
            segments_csv: Ruta a CSV de segmentos (opcional).

        Returns:
            Dict con resumen de la ejecución.
        """
        start_ts = datetime.now(timezone.utc)
        summary: dict[str, Any] = {
            "polls_loaded": 0,
            "nowcast": False,
            "snapshot_id": None,
            "coalitions": 0,
            "soft_estimates": 0,
            "segments": 0,
            "alerts": [],
            "errors": [],
        }

        try:
            # 1. Cargar encuestas
            if polls_csv:
                n = self.load_polls_from_csv(polls_csv)
                summary["polls_loaded"] += n

            if include_wikipedia:
                n = self.load_polls_from_wikipedia()
                summary["polls_loaded"] += n

            # 2. Nowcasting
            snapshot = self.compute_nowcast()
            if snapshot:
                summary["nowcast"] = True
                snapshot_id = self.persist_nowcast()
                summary["snapshot_id"] = snapshot_id
            else:
                logger.warning("electoral_monitor.run_all: no se pudo calcular nowcast")
                return summary

            # 3. Coaliciones
            coalitions = self.analyze_coalitions(snapshot_id=summary["snapshot_id"])
            self.persist_coalitions(snapshot_id=summary["snapshot_id"])
            summary["coalitions"] = len(coalitions)

            # 4. Voto blando
            soft = self.estimate_soft_vote()
            self.persist_soft_vote()
            summary["soft_estimates"] = len(soft)

            # 5. Segmentos
            segs = self.load_segments(segments_csv)
            self.persist_segments()
            summary["segments"] = len(segs)

            # 6. Alertas
            alerts = self.generate_alerts()
            summary["alerts"] = [a.title for a in alerts]

        except Exception as exc:
            logger.error("electoral_monitor.run_all: %s", exc)
            summary["errors"].append(str(exc))

        summary["elapsed_s"] = round(
            (datetime.now(timezone.utc) - start_ts).total_seconds(), 2
        )
        logger.info(
            "electoral_monitor.run_all: %d polls, nowcast=%s, %d coaliciones, %ds",
            summary["polls_loaded"],
            summary["nowcast"],
            summary["coalitions"],
            summary["elapsed_s"],
        )
        return summary

    # ── Propiedades de conveniencia ───────────────────────────────────────────

    @property
    def party_estimates(self) -> dict[str, float]:
        return self._snapshot.party_estimates if self._snapshot else {}

    @property
    def seat_estimates(self) -> dict[str, int]:
        return self._snapshot.seat_estimates if self._snapshot else {}

    @property
    def top_coalitions(self) -> list:
        return self._coalitions[:5]

    @property
    def n_polls(self) -> int:
        return len(self._polls)
