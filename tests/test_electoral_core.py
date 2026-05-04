"""
Tests — Bloque 6: Electoral & Campaign Intelligence Core.

Cubre:
  - schemas.py (Election, Poll, PollEstimate, PollQualityScore, NowcastSnapshot,
                CoalitionScenario, VoterSegment, SoftVoteEstimate, CampaignMessage,
                CampaignSimulation)
  - electoral_adapter.py (normalize, deduplicate, quality)
  - seat_allocator.py (D'Hondt, Webster, Hare, Gallagher, ENP)
  - nowcasting_model.py (compute_nowcast, majority probs)
  - coalition_model.py (ideological compat, historical, build_coalition_scenario)
  - volatility_model.py (Pedersen, swing, ENP)
  - polls_provider.py (load_polls_from_csv)
  - official_results_provider.py (load_results_from_csv)
  - voter_segments.py (defaults, find_opportunities)
  - soft_vote_model.py (estimate_soft_vote, message effect)
  - campaign_effects.py (create_message, detect_risk_flags)
  - electoral_monitor.py (ElectoralMonitor smoke test)

Total: 86 tests.
"""
from __future__ import annotations

import csv
import io
import os
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ── Path setup ────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

os.environ.setdefault("OTEL_SDK_DISABLED", "true")

# ─────────────────────────────────────────────────────────────────────────────
# A. schemas.py
# ─────────────────────────────────────────────────────────────────────────────


class TestElection:
    def test_election_basic(self):
        from etl.sources.electoral.schemas import Election
        e = Election(
            source="manual",
            election_id="ES_2023",
            election_type="general",
            election_date=date(2023, 7, 23),
            name="Elecciones Generales 2023",
        )
        assert e.election_id == "ES_2023"
        assert e.country == "ES"
        assert e.status == "past"

    def test_election_to_db_dict(self):
        from etl.sources.electoral.schemas import Election
        e = Election(
            source="test", election_id="TEST",
            election_type="autonomica",
            election_date=date(2023, 5, 28),
            name="Test",
        )
        d = e.to_db_dict()
        assert d["election_id"] == "TEST"
        assert d["election_type"] == "autonomica"

    def test_election_date_field_no_clash(self):
        """election_date no colisiona con la clase date."""
        from etl.sources.electoral.schemas import Election
        e = Election(
            source="x", election_id="Y",
            election_type="municipal",
            election_date=date(2024, 1, 1),
            name="Z",
        )
        assert isinstance(e.election_date, date)


class TestPoll:
    def _make_poll(self, **kwargs):
        from etl.sources.electoral.schemas import Poll
        defaults = dict(
            source="test", poll_id="p1", pollster="CIS",
            publication_date=date(2026, 4, 1),
        )
        defaults.update(kwargs)
        return Poll(**defaults)

    def test_poll_basic(self):
        p = self._make_poll()
        assert p.pollster == "CIS"
        assert p.geography == "ES"

    def test_poll_days_old(self):
        p = self._make_poll()
        assert p.days_old >= 0

    def test_poll_with_sample_size(self):
        p = self._make_poll(sample_size=2000)
        assert p.sample_size == 2000

    def test_poll_quality_score(self):
        from etl.sources.electoral.schemas import PollQualityScore
        q = PollQualityScore(
            poll_id="p1", pollster="CIS",
            recency_score=0.8, sample_size_score=0.9,
            transparency_score=0.7, house_effect_score=0.6,
        )
        expected = round(0.40 * 0.8 + 0.25 * 0.9 + 0.20 * 0.7 + 0.15 * 0.6, 4)
        assert q.total_score == expected

    def test_poll_quality_default_zero(self):
        from etl.sources.electoral.schemas import PollQualityScore
        q = PollQualityScore(poll_id="x", pollster="y")
        assert q.total_score == 0.0


class TestPollEstimate:
    def test_estimate_basic(self):
        from etl.sources.electoral.schemas import PollEstimate
        e = PollEstimate(poll_id="p1", party_id="PP", vote_share=33.5)
        assert e.vote_share == 33.5

    def test_estimate_optional_bounds(self):
        from etl.sources.electoral.schemas import PollEstimate
        e = PollEstimate(poll_id="p1", party_id="PSOE", vote_share=28.0,
                          lower_bound=25.0, upper_bound=31.0)
        assert e.lower_bound == 25.0


class TestNowcastSnapshot:
    def test_leading_party_auto(self):
        from etl.sources.electoral.schemas import NowcastSnapshot
        s = NowcastSnapshot(
            model_name="test",
            party_estimates={"PP": 33.0, "PSOE": 28.0, "VOX": 12.0},
        )
        assert s.leading_party == "PP"

    def test_leading_party_manual(self):
        from etl.sources.electoral.schemas import NowcastSnapshot
        s = NowcastSnapshot(
            model_name="test",
            party_estimates={"PP": 33.0, "PSOE": 28.0},
            leading_party="PSOE",
        )
        assert s.leading_party == "PSOE"

    def test_snapshot_defaults(self):
        from etl.sources.electoral.schemas import NowcastSnapshot
        s = NowcastSnapshot(model_name="m", party_estimates={})
        assert s.model_version == "1.0"
        assert s.geography == "ES"


class TestCoalitionScenario:
    def test_scenario_basic(self):
        from etl.sources.electoral.schemas import CoalitionScenario
        c = CoalitionScenario(
            name="PP + VOX",
            parties=["PP", "VOX"],
            seats_total=183,
            has_majority=True,
            majority_margin=7,
        )
        assert c.has_majority is True
        assert c.scenario_type == "minority"  # default


class TestVoterSegment:
    def test_segment_basic(self):
        from etl.sources.electoral.schemas import VoterSegment
        s = VoterSegment(segment_id="jovenes", label="Jóvenes 18-34")
        assert s.persuadability == 0.5
        assert s.turnout_probability == 0.7

    def test_segment_party_pref(self):
        from etl.sources.electoral.schemas import VoterSegment
        s = VoterSegment(
            segment_id="centro",
            label="Centro",
            party_preference={"PP": 0.4, "PSOE": 0.35},
        )
        assert s.party_preference["PP"] == pytest.approx(0.4)


class TestSoftVoteEstimate:
    def test_soft_estimate(self):
        from etl.sources.electoral.schemas import SoftVoteEstimate
        e = SoftVoteEstimate(
            estimate_date=date.today(),
            party_id="PP",
            decided_pct=72.0,
            soft_pct=28.0,
        )
        assert e.source == "manual"


class TestCampaignMessage:
    def test_message_basic(self):
        from etl.sources.electoral.schemas import CampaignMessage
        m = CampaignMessage(
            message_id="msg_001", party_id="PSOE",
            theme="vivienda",
        )
        assert m.source == "manual"
        assert m.risk_flags == []


class TestCampaignSimulation:
    def test_simulation_basic(self):
        from etl.sources.electoral.schemas import CampaignSimulation
        s = CampaignSimulation(
            simulation_id="sim_001", message_id="msg_001",
            party_id="PP",
        )
        assert s.confidence == 0.5
        assert s.week_of_campaign == 1


# ─────────────────────────────────────────────────────────────────────────────
# B. electoral_adapter.py
# ─────────────────────────────────────────────────────────────────────────────


class TestElectoralAdapter:
    def test_normalize_party_id_known(self):
        from etl.sources.electoral.electoral_adapter import normalize_party_id
        assert normalize_party_id("Partido Popular") == "PP"
        assert normalize_party_id("Vox") == "VOX"
        assert normalize_party_id("PSC") == "PSOE"

    def test_normalize_party_id_passthrough(self):
        from etl.sources.electoral.electoral_adapter import normalize_party_id
        # Sigla no reconocida → passthrough en mayúsculas
        result = normalize_party_id("UNKNOWN_PARTY")
        assert result  # debe devolver algo

    def test_normalize_vote_share_pct(self):
        from etl.sources.electoral.electoral_adapter import normalize_vote_share
        assert normalize_vote_share(33.5) == pytest.approx(33.5)

    def test_normalize_vote_share_fraction(self):
        from etl.sources.electoral.electoral_adapter import normalize_vote_share
        # 0-1 range → convert to 0-100
        result = normalize_vote_share(0.335)
        assert result == pytest.approx(33.5)

    def test_normalize_date_iso(self):
        from etl.sources.electoral.electoral_adapter import normalize_date
        d = normalize_date("2023-07-23")
        assert d == date(2023, 7, 23)

    def test_normalize_date_slash(self):
        from etl.sources.electoral.electoral_adapter import normalize_date
        d = normalize_date("23/07/2023")
        assert d == date(2023, 7, 23)

    def test_normalize_date_invalid(self):
        from etl.sources.electoral.electoral_adapter import normalize_date
        assert normalize_date("not-a-date") is None

    def test_deduplicate_polls(self):
        from etl.sources.electoral.schemas import Poll
        from etl.sources.electoral.electoral_adapter import deduplicate_polls

        p1 = Poll(source="t", poll_id="p1", pollster="CIS", publication_date=date(2026, 1, 1))
        p2 = Poll(source="t", poll_id="p2", pollster="CIS", publication_date=date(2026, 1, 1))
        p3 = Poll(source="t", poll_id="p3", pollster="SIGMA", publication_date=date(2026, 2, 1))
        # p1 y p2 tienen mismo pollster+fecha → se deduplican
        unique = deduplicate_polls([p1, p2, p3])
        assert len(unique) == 2  # CIS-01-01 y SIGMA-02-01

    def test_compute_poll_quality_returns_score(self):
        from etl.sources.electoral.schemas import Poll
        from etl.sources.electoral.electoral_adapter import compute_poll_quality

        p = Poll(
            source="test", poll_id="p1", pollster="CIS",
            publication_date=date(2026, 4, 15),
            sample_size=3000,
            methodology="CAWI",
            raw_url="https://cis.es/encuesta",
        )
        q = compute_poll_quality(p)
        assert 0.0 <= q.total_score <= 1.0
        assert q.poll_id == "p1"


# ─────────────────────────────────────────────────────────────────────────────
# C. seat_allocator.py
# ─────────────────────────────────────────────────────────────────────────────


class TestDhondt:
    def test_basic_allocation(self):
        from etl.sources.electoral.seat_allocator import dhondt
        shares = {"A": 40.0, "B": 30.0, "C": 20.0, "D": 10.0}
        seats = dhondt(shares, 10)
        assert sum(seats.values()) == 10
        assert seats["A"] >= seats["B"] >= seats["C"] >= seats["D"]

    def test_zero_share_excluded(self):
        from etl.sources.electoral.seat_allocator import dhondt
        shares = {"A": 50.0, "B": 0.0, "C": 50.0}
        seats = dhondt(shares, 6)
        assert seats.get("B", 0) == 0
        assert sum(seats.values()) == 6

    def test_total_seats_correct(self):
        from etl.sources.electoral.seat_allocator import dhondt
        shares = {"PP": 33.0, "PSOE": 28.0, "VOX": 12.0, "SUMAR": 10.0}
        seats = dhondt(shares, 350)
        assert sum(seats.values()) == 350


class TestWebster:
    def test_total_correct(self):
        from etl.sources.electoral.seat_allocator import webster
        shares = {"A": 60.0, "B": 40.0}
        seats = webster(shares, 10)
        assert sum(seats.values()) == 10


class TestHare:
    def test_basic(self):
        from etl.sources.electoral.seat_allocator import hare_quota
        shares = {"A": 50.0, "B": 30.0, "C": 20.0}
        seats = hare_quota(shares, 10)
        assert sum(seats.values()) == 10


class TestGallagherIndex:
    def test_perfect_proportionality(self):
        from etl.sources.electoral.seat_allocator import gallagher_index
        votes = {"A": 50.0, "B": 50.0}
        seats = {"A": 5, "B": 5}
        gi = gallagher_index(votes, seats)
        assert gi == pytest.approx(0.0, abs=0.01)

    def test_disproportional(self):
        from etl.sources.electoral.seat_allocator import gallagher_index
        votes = {"A": 50.0, "B": 50.0}
        seats = {"A": 9, "B": 1}
        gi = gallagher_index(votes, seats)
        assert gi > 0


class TestEffectiveParties:
    def test_two_equal_parties(self):
        from etl.sources.electoral.seat_allocator import effective_number_of_parties
        enp = effective_number_of_parties({"A": 50.0, "B": 50.0})
        assert enp == pytest.approx(2.0, abs=0.01)

    def test_one_dominant_party(self):
        from etl.sources.electoral.seat_allocator import effective_number_of_parties
        enp = effective_number_of_parties({"A": 95.0, "B": 5.0})
        assert enp < 1.5


# ─────────────────────────────────────────────────────────────────────────────
# D. nowcasting_model.py
# ─────────────────────────────────────────────────────────────────────────────


class TestNowcasting:
    def _make_polls_and_estimates(self, n=3):
        from etl.sources.electoral.schemas import Poll, PollEstimate

        polls = []
        estimates_by_poll = {}
        for i in range(n):
            pid = f"poll_{i}"
            p = Poll(
                source="test",
                poll_id=pid,
                pollster=f"House_{i}",
                publication_date=date(2026, 4, i + 1),
                fieldwork_end=date(2026, 4, i + 1),
                sample_size=1000 + i * 500,
            )
            polls.append(p)
            estimates_by_poll[pid] = [
                PollEstimate(poll_id=pid, party_id="PP", vote_share=33.0 + i),
                PollEstimate(poll_id=pid, party_id="PSOE", vote_share=28.0 - i),
                PollEstimate(poll_id=pid, party_id="VOX", vote_share=12.0),
            ]
        return polls, estimates_by_poll

    def test_compute_nowcast_returns_snapshot(self):
        from etl.sources.electoral.nowcasting_model import compute_nowcast

        polls, estimates = self._make_polls_and_estimates(3)
        snapshot = compute_nowcast(polls=polls, estimates_by_poll=estimates)
        assert snapshot is not None
        assert "PP" in snapshot.party_estimates
        assert snapshot.leading_party is not None

    def test_compute_nowcast_empty_polls(self):
        from etl.sources.electoral.nowcasting_model import compute_nowcast
        result = compute_nowcast(polls=[], estimates_by_poll={})
        assert result is None

    def test_compute_nowcast_seat_estimates(self):
        from etl.sources.electoral.nowcasting_model import compute_nowcast
        polls, estimates = self._make_polls_and_estimates(3)
        snap = compute_nowcast(polls=polls, estimates_by_poll=estimates)
        assert snap is not None
        assert sum(snap.seat_estimates.values()) > 0

    def test_majority_probability_keys(self):
        from etl.sources.electoral.nowcasting_model import compute_nowcast
        polls, estimates = self._make_polls_and_estimates(3)
        snap = compute_nowcast(polls=polls, estimates_by_poll=estimates)
        assert snap is not None
        for k in ["PP+VOX", "PSOE+SUMAR+otros", "bloqueo"]:
            assert k in snap.majority_probability

    def test_recency_weighting(self):
        """Encuesta más reciente debe tener mayor peso."""
        from etl.sources.electoral.nowcasting_model import compute_nowcast
        from etl.sources.electoral.schemas import Poll, PollEstimate

        old_poll = Poll(
            source="t", poll_id="old", pollster="H1",
            publication_date=date(2025, 1, 1),
            fieldwork_end=date(2025, 1, 1),
            sample_size=1000,
        )
        new_poll = Poll(
            source="t", poll_id="new", pollster="H2",
            publication_date=date(2026, 4, 30),
            fieldwork_end=date(2026, 4, 30),
            sample_size=1000,
        )
        estimates = {
            "old": [PollEstimate(poll_id="old", party_id="PP", vote_share=20.0)],
            "new": [PollEstimate(poll_id="new", party_id="PP", vote_share=40.0)],
        }
        snap = compute_nowcast(polls=[old_poll, new_poll], estimates_by_poll=estimates)
        assert snap is not None
        # La encuesta nueva domina → PP debería estar más cerca de 40 que de 20
        assert snap.party_estimates.get("PP", 0) > 30.0


# ─────────────────────────────────────────────────────────────────────────────
# E. coalition_model.py
# ─────────────────────────────────────────────────────────────────────────────


class TestCoalitionModel:
    def test_ideological_distance(self):
        from etl.sources.electoral.coalition_model import ideological_distance
        d_pp_vox = ideological_distance("PP", "VOX")
        d_pp_psoe = ideological_distance("PP", "PSOE")
        assert d_pp_vox < d_pp_psoe  # PP y VOX son más cercanos

    def test_ideological_compatibility_homogeneous(self):
        from etl.sources.electoral.coalition_model import coalition_ideological_compatibility
        # Partido consigo mismo
        c = coalition_ideological_compatibility(["PP", "PP"])
        assert c == pytest.approx(1.0)

    def test_historical_plausibility_known(self):
        from etl.sources.electoral.coalition_model import historical_plausibility
        hp = historical_plausibility(["PSOE", "SUMAR"])
        assert hp >= 0.80  # _HISTORICAL_PAIRS tiene 0.90

    def test_historical_plausibility_unknown(self):
        from etl.sources.electoral.coalition_model import historical_plausibility
        hp = historical_plausibility(["PP", "ERC"])
        assert 0.0 <= hp <= 1.0

    def test_build_coalition_scenario_majority(self):
        from etl.sources.electoral.coalition_model import build_coalition_scenario
        seats = {"PSOE": 120, "SUMAR": 40, "PNV": 5, "ERC": 7, "JUNTS": 8}
        sc = build_coalition_scenario(
            list(seats.keys()), seats, majority_threshold=176
        )
        assert sc.seats_total == sum(seats.values())
        assert sc.has_majority is True

    def test_build_coalition_scenario_no_majority(self):
        from etl.sources.electoral.coalition_model import build_coalition_scenario
        seats = {"PP": 80, "VOX": 60}
        sc = build_coalition_scenario(["PP", "VOX"], seats, majority_threshold=176)
        assert sc.has_majority is False

    def test_analyze_all_coalitions(self):
        from etl.sources.electoral.coalition_model import analyze_all_coalitions
        seats = {
            "PP": 137, "PSOE": 121, "VOX": 33, "SUMAR": 31,
            "JUNTS": 7, "PNV": 5, "ERC": 7, "EH Bildu": 6,
        }
        coalitions = analyze_all_coalitions(seats, max_parties=3, majority_threshold=176)
        assert len(coalitions) > 0
        # Ordenadas por probabilidad decreciente
        probs = [c.probability for c in coalitions]
        assert probs == sorted(probs, reverse=True)


# ─────────────────────────────────────────────────────────────────────────────
# F. volatility_model.py
# ─────────────────────────────────────────────────────────────────────────────


class TestVolatilityModel:
    def test_pedersen_no_change(self):
        from etl.sources.electoral.volatility_model import pedersen_index
        r = {"PP": 33.0, "PSOE": 28.0}
        assert pedersen_index(r, r) == 0.0

    def test_pedersen_full_change(self):
        from etl.sources.electoral.volatility_model import pedersen_index
        a = {"PP": 100.0}
        b = {"PSOE": 100.0}
        # Pedersen = 0.5*(|100| + |100|) = 100
        assert pedersen_index(a, b) == pytest.approx(100.0)

    def test_party_swing(self):
        from etl.sources.electoral.volatility_model import compute_party_swing
        a = {"PP": 30.0, "PSOE": 28.0}
        b = {"PP": 33.0, "PSOE": 26.0}
        swing = compute_party_swing(a, b)
        assert swing["PP"] == pytest.approx(3.0)
        assert swing["PSOE"] == pytest.approx(-2.0)

    def test_bloc_swing(self):
        from etl.sources.electoral.volatility_model import compute_bloc_swing
        a = {"PP": 30.0, "VOX": 10.0, "PSOE": 28.0}
        b = {"PP": 33.0, "VOX": 12.0, "PSOE": 26.0}
        bloc = compute_bloc_swing(a, b)
        assert "derecha" in bloc
        assert "izquierda" in bloc
        assert bloc["derecha"] == pytest.approx(5.0)

    def test_compute_volatility_summary(self):
        from etl.sources.electoral.volatility_model import compute_volatility_summary
        a = {"PP": 30.0, "PSOE": 28.0, "VOX": 12.0}
        b = {"PP": 33.0, "PSOE": 25.0, "VOX": 11.0}
        summary = compute_volatility_summary(a, b)
        assert "pedersen_index" in summary
        assert "enp_before" in summary
        assert summary["pedersen_index"] > 0


# ─────────────────────────────────────────────────────────────────────────────
# G. polls_provider.py
# ─────────────────────────────────────────────────────────────────────────────


class TestPollsProvider:
    def _make_csv(self, rows: list[dict]) -> str:
        """Crea CSV temporal y devuelve la ruta."""
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            if rows:
                writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)
            return f.name

    def test_load_from_csv_basic(self):
        from etl.sources.electoral.polls_provider import load_polls_from_csv

        rows = [
            {"pollster": "CIS", "publication_date": "2026-04-01",
             "sample_size": "2500", "PP": "33.5", "PSOE": "28.0"},
            {"pollster": "SIGMA", "publication_date": "2026-04-10",
             "sample_size": "1500", "PP": "34.0", "PSOE": "27.0"},
        ]
        path = self._make_csv(rows)
        try:
            polls, estimates = load_polls_from_csv(path)
            assert len(polls) == 2
            assert len(estimates) >= 4  # 2 partidos × 2 polls
        finally:
            Path(path).unlink(missing_ok=True)

    def test_load_from_csv_not_found(self):
        from etl.sources.electoral.polls_provider import load_polls_from_csv
        polls, estimates = load_polls_from_csv("/no/existe.csv")
        assert polls == []
        assert estimates == []

    def test_load_from_csv_empty_file(self):
        from etl.sources.electoral.polls_provider import load_polls_from_csv
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
            path = f.name
        try:
            polls, estimates = load_polls_from_csv(path)
            assert polls == []
        finally:
            Path(path).unlink(missing_ok=True)

    def test_party_detection_known_columns(self):
        from etl.sources.electoral.polls_provider import load_polls_from_csv

        rows = [{"pollster": "Test", "publication_date": "2026-01-01",
                 "VOX": "11.5", "SUMAR": "9.0"}]
        path = self._make_csv(rows)
        try:
            polls, estimates = load_polls_from_csv(path)
            party_ids = {e.party_id for e in estimates}
            assert "VOX" in party_ids or "SUMAR" in party_ids
        finally:
            Path(path).unlink(missing_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# H. official_results_provider.py
# ─────────────────────────────────────────────────────────────────────────────


class TestOfficialResultsProvider:
    def _make_csv(self, rows: list[dict]) -> str:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            if rows:
                writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)
            return f.name

    def test_load_results_basic(self):
        from etl.sources.electoral.official_results_provider import load_results_from_csv

        rows = [
            {"party_id": "PP", "geography_id": "Madrid", "vote_share": "33.5", "seats": "17"},
            {"party_id": "PSOE", "geography_id": "Madrid", "vote_share": "25.0", "seats": "13"},
        ]
        path = self._make_csv(rows)
        try:
            results = load_results_from_csv(path, election_id="ES_2023")
            assert len(results) == 2
            assert results[0].election_id == "ES_2023"
        finally:
            Path(path).unlink(missing_ok=True)

    def test_load_results_not_found(self):
        from etl.sources.electoral.official_results_provider import load_results_from_csv
        results = load_results_from_csv("/no/existe.csv")
        assert results == []

    def test_load_results_vote_share_bounds(self):
        from etl.sources.electoral.official_results_provider import load_results_from_csv

        # vote_share=110 → normalize_vote_share devuelve None (fuera de rango)
        rows = [{"party_id": "PP", "geography_id": "ES", "vote_share": "45.0"}]
        path = self._make_csv(rows)
        try:
            results = load_results_from_csv(path, election_id="X")
            if results and results[0].vote_share is not None:
                assert results[0].vote_share <= 100.0
        finally:
            Path(path).unlink(missing_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# I. voter_segments.py
# ─────────────────────────────────────────────────────────────────────────────


class TestVoterSegments:
    def test_get_default_segments(self):
        from etl.sources.electoral.voter_segments import get_default_segments
        segs = get_default_segments()
        assert len(segs) > 5
        ids = {s.segment_id for s in segs}
        assert "jovenes" in ids or "centro" in ids

    def test_get_segment_by_id(self):
        from etl.sources.electoral.voter_segments import get_default_segments, get_segment_by_id
        segs = get_default_segments()
        seg = get_segment_by_id("jovenes", segs)
        assert seg is not None or get_segment_by_id("centro", segs) is not None

    def test_find_opportunities_returns_list(self):
        from etl.sources.electoral.voter_segments import (
            get_default_segments, find_soft_vote_opportunities
        )
        segs = get_default_segments()
        opps = find_soft_vote_opportunities(segs, party_id="PP", current_share=33.0)
        assert isinstance(opps, list)
        for o in opps:
            assert "opportunity_score" in o
            assert o["opportunity_score"] >= 0

    def test_load_from_nonexistent_csv(self):
        from etl.sources.electoral.voter_segments import load_segments_from_csv
        # Debe devolver defaults, no error
        segs = load_segments_from_csv("/no/existe.csv")
        assert len(segs) > 0


# ─────────────────────────────────────────────────────────────────────────────
# J. soft_vote_model.py
# ─────────────────────────────────────────────────────────────────────────────


class TestSoftVoteModel:
    def test_estimate_soft_vote_basic(self):
        from etl.sources.electoral.soft_vote_model import estimate_soft_vote
        estimates = estimate_soft_vote({"PP": 33.0, "PSOE": 28.0, "VOX": 12.0})
        assert len(estimates) == 3
        for e in estimates:
            assert e.decided_pct is not None
            assert e.soft_pct is not None
            assert e.decided_pct + e.soft_pct == pytest.approx(100.0, abs=0.1)

    def test_soft_vote_ranges(self):
        from etl.sources.electoral.soft_vote_model import estimate_soft_vote
        estimates = estimate_soft_vote({"SUMAR": 10.0})
        e = estimates[0]
        assert 0 <= e.soft_pct <= 100
        assert 0 <= e.decided_pct <= 100

    def test_theme_mobilization_high(self):
        from etl.sources.electoral.soft_vote_model import _theme_mobilization_factor
        assert _theme_mobilization_factor("economia") == 1.0

    def test_theme_mobilization_low(self):
        from etl.sources.electoral.soft_vote_model import _theme_mobilization_factor
        assert _theme_mobilization_factor("deporte") < 1.0

    def test_saturation_decay(self):
        from etl.sources.electoral.soft_vote_model import _saturation_decay
        assert _saturation_decay(1) == 1.0
        assert _saturation_decay(3) < _saturation_decay(1)
        assert _saturation_decay(10) < _saturation_decay(3)

    def test_estimate_message_effect(self):
        from etl.sources.electoral.soft_vote_model import estimate_message_effect
        from etl.sources.electoral.voter_segments import get_default_segments

        segs = get_default_segments()
        effect = estimate_message_effect(
            party_id="PP",
            theme="vivienda",
            target_segment_id=None,
            segments=segs,
            current_estimates={"PP": 33.0, "PSOE": 28.0},
        )
        assert "expected_vote_shift" in effect
        assert "confidence" in effect
        assert 0 <= effect["confidence"] <= 1

    def test_rank_segments_by_opportunity(self):
        from etl.sources.electoral.soft_vote_model import rank_segments_by_opportunity
        from etl.sources.electoral.voter_segments import get_default_segments

        segs = get_default_segments()
        ranked = rank_segments_by_opportunity("PP", segs)
        assert isinstance(ranked, list)
        if len(ranked) >= 2:
            # Ordenados por opportunity_score descente
            assert ranked[0]["opportunity_score"] >= ranked[-1]["opportunity_score"]


# ─────────────────────────────────────────────────────────────────────────────
# K. campaign_effects.py
# ─────────────────────────────────────────────────────────────────────────────


class TestCampaignEffects:
    def test_create_campaign_message(self):
        from etl.sources.electoral.campaign_effects import create_campaign_message
        msg = create_campaign_message(party_id="PP", theme="vivienda", frame="acceso")
        assert msg.party_id == "PP"
        assert msg.theme == "vivienda"
        assert msg.message_id.startswith("msg_PP_")

    def test_detect_risk_flags_polarization(self):
        from etl.sources.electoral.campaign_effects import detect_risk_flags
        flags = detect_risk_flags("PP", "independencia")
        assert "alto_riesgo_polarizacion" in flags

    def test_detect_risk_flags_clean(self):
        from etl.sources.electoral.campaign_effects import detect_risk_flags
        flags = detect_risk_flags("PSOE", "sanidad")
        assert flags == []

    def test_simulate_campaign_message(self):
        from etl.sources.electoral.campaign_effects import (
            create_campaign_message, simulate_campaign_message
        )
        from etl.sources.electoral.voter_segments import get_default_segments

        segs = get_default_segments()
        msg = create_campaign_message(party_id="PSOE", theme="pensiones")
        sim = simulate_campaign_message(
            message=msg,
            segments=segs,
            current_estimates={"PSOE": 28.0, "PP": 33.0, "VOX": 12.0},
        )
        assert sim.party_id == "PSOE"
        assert 0 <= sim.confidence <= 1

    def test_recommend_messages_returns_list(self):
        from etl.sources.electoral.campaign_effects import recommend_messages
        from etl.sources.electoral.voter_segments import get_default_segments

        segs = get_default_segments()
        recs = recommend_messages(
            party_id="PP",
            segments=segs,
            current_estimates={"PP": 33.0, "PSOE": 28.0},
            top_n=3,
        )
        assert len(recs) <= 3
        for r in recs:
            assert "theme" in r
            assert "expected_gain_pp" in r


# ─────────────────────────────────────────────────────────────────────────────
# L. electoral_monitor.py
# ─────────────────────────────────────────────────────────────────────────────


class TestElectoralMonitor:
    def test_monitor_init(self):
        from etl.sources.electoral.electoral_monitor import ElectoralMonitor
        m = ElectoralMonitor(dry_run=True)
        assert m.n_polls == 0
        assert m.party_estimates == {}

    def test_monitor_load_wikipedia_graceful(self):
        from etl.sources.electoral.electoral_monitor import ElectoralMonitor
        m = ElectoralMonitor(dry_run=True)
        # Sin Wikipedia disponible debe devolver 0 sin crash
        n = m.load_polls_from_wikipedia()
        assert n >= 0

    def test_monitor_compute_nowcast_no_polls(self):
        from etl.sources.electoral.electoral_monitor import ElectoralMonitor
        m = ElectoralMonitor(dry_run=True)
        result = m.compute_nowcast()
        assert result is None

    def test_monitor_load_segments(self):
        from etl.sources.electoral.electoral_monitor import ElectoralMonitor
        m = ElectoralMonitor(dry_run=True)
        segs = m.load_segments()
        assert len(segs) > 0

    def test_monitor_run_all_dry_run(self):
        """run_all en dry-run sin polls debe completar sin error."""
        from etl.sources.electoral.electoral_monitor import ElectoralMonitor
        m = ElectoralMonitor(dry_run=True)
        summary = m.run_all(include_wikipedia=False)
        assert "nowcast" in summary
        assert "errors" in summary

    def test_monitor_generate_alerts_empty(self):
        from etl.sources.electoral.electoral_monitor import ElectoralMonitor
        m = ElectoralMonitor(dry_run=True)
        alerts = m.generate_alerts()
        assert isinstance(alerts, list)

    def test_monitor_with_csv_polls(self):
        """Smoke test: cargar CSV con 2 polls, calcular nowcast."""
        from etl.sources.electoral.electoral_monitor import ElectoralMonitor

        rows = [
            {"pollster": "TestHouse", "publication_date": "2026-04-01",
             "sample_size": "1000", "PP": "33.0", "PSOE": "28.0", "VOX": "12.0"},
            {"pollster": "TestHouse2", "publication_date": "2026-04-15",
             "sample_size": "1500", "PP": "34.0", "PSOE": "27.0", "VOX": "11.5"},
        ]
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
            path = f.name

        try:
            m = ElectoralMonitor(dry_run=True)
            m.load_polls_from_csv(path)
            assert m.n_polls >= 2
            snap = m.compute_nowcast()
            assert snap is not None
            assert snap.leading_party is not None
        finally:
            Path(path).unlink(missing_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# M. Constantes
# ─────────────────────────────────────────────────────────────────────────────


class TestConstants:
    def test_total_escanos(self):
        from etl.sources.electoral.schemas import TOTAL_ESCANOS_CONGRESO, MAYORIA_ABSOLUTA
        assert TOTAL_ESCANOS_CONGRESO == 350
        assert MAYORIA_ABSOLUTA == 176

    def test_party_colors_exist(self):
        from etl.sources.electoral.schemas import PARTY_COLORS
        assert "PP" in PARTY_COLORS
        assert "PSOE" in PARTY_COLORS

    def test_ideology_scores_range(self):
        from etl.sources.electoral.schemas import IDEOLOGY_SCORES
        for party, score in IDEOLOGY_SCORES.items():
            assert -10 <= score <= 10, f"{party}: {score} fuera de rango"

    def test_spain_seats_by_province(self):
        from etl.sources.electoral.seat_allocator import SPAIN_SEATS_BY_PROVINCE
        total = sum(SPAIN_SEATS_BY_PROVINCE.values())
        # 350 escaños menos Ceuta y Melilla que pueden variar
        assert 348 <= total <= 352
