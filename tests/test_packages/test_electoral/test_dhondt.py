"""
Tests para packages/electoral — D'Hondt, nowcasting, simulación.
Paquete puro: sin BD, sin LLM, sin OTel.
"""
from __future__ import annotations

from datetime import date

import pytest

from packages.electoral.src.dhondt import dhondt, dhondt_by_constituency, DHondtResult
from packages.electoral.src.nowcasting import nowcast, aggregate_polls, Poll, NowcastResult
from packages.electoral.src.simulation import seat_simulation, Scenario


# ---------------------------------------------------------------------------
# D'Hondt básico
# ---------------------------------------------------------------------------

class TestDhondt:
    def test_simple_two_party(self):
        """Caso canónico: 3 escaños entre dos partidos."""
        result = dhondt({"A": 100, "B": 50}, seats=3, threshold=0.0)
        assert isinstance(result, DHondtResult)
        assert result.by_party["A"] == 2
        assert result.by_party["B"] == 1
        assert result.total_seats == 3

    def test_four_parties_four_seats(self):
        """Caso clásico español."""
        votes = {"PP": 400, "PSOE": 300, "Vox": 200, "Sumar": 100}
        result = dhondt(votes, seats=4, threshold=0.0)
        assert sum(result.by_party.values()) == 4
        assert result.by_party["PP"] >= result.by_party["Sumar"]

    def test_threshold_excludes_small_parties(self):
        """Partidos por debajo del umbral no participan."""
        votes = {"A": 900, "B": 50, "C": 50}  # B y C < 3%
        result = dhondt(votes, seats=3, threshold=0.03)
        assert "B" not in result.by_party or result.by_party.get("B", 0) == 0
        assert "C" not in result.by_party or result.by_party.get("C", 0) == 0
        assert result.by_party["A"] == 3

    def test_total_seats_allocated(self):
        """Siempre se asignan exactamente `seats` escaños."""
        votes = {"PP": 350, "PSOE": 280, "Vox": 180, "Sumar": 120, "Cs": 70}
        for seats in [1, 5, 10, 50]:
            result = dhondt(votes, seats=seats, threshold=0.0)
            assert sum(result.by_party.values()) == seats

    def test_single_party_gets_all_seats(self):
        votes = {"Solo": 1000}
        result = dhondt(votes, seats=5, threshold=0.0)
        assert result.by_party["Solo"] == 5

    def test_vote_share_sums_to_one(self):
        votes = {"A": 600, "B": 400}
        result = dhondt(votes, seats=10, threshold=0.0)
        total_share = sum(a.vote_share for a in result.allocations)
        assert abs(total_share - 1.0) < 0.001

    def test_zero_seats_raises(self):
        with pytest.raises(ValueError, match="seats debe ser > 0"):
            dhondt({"A": 100}, seats=0)

    def test_empty_votes_raises(self):
        with pytest.raises(ValueError, match="votes no puede estar vacio"):
            dhondt({}, seats=3)

    def test_all_zero_votes_raises(self):
        with pytest.raises(ValueError, match="total de votos"):
            dhondt({"A": 0, "B": 0}, seats=3)

    def test_d_hondt_proportionality(self):
        """Con votos exactamente en ratio 2:1, escaños deben reflejarlo aprox."""
        votes = {"A": 2000, "B": 1000}
        result = dhondt(votes, seats=9, threshold=0.0)
        # A debería tener ~6 escaños, B ~3
        assert result.by_party["A"] == 6
        assert result.by_party["B"] == 3

    def test_constituency_results_independent(self):
        """Cada circunscripción calcula D'Hondt de forma independiente."""
        constituency_votes = {
            "Madrid": {"PP": 400, "PSOE": 300},
            "Barcelona": {"PSC": 500, "ERC": 200},
        }
        constituency_seats = {"Madrid": 4, "Barcelona": 3}
        results = dhondt_by_constituency(constituency_votes, constituency_seats, threshold=0.0)
        assert "Madrid" in results
        assert "Barcelona" in results
        assert sum(results["Madrid"].by_party.values()) == 4
        assert sum(results["Barcelona"].by_party.values()) == 3

    def test_constituency_missing_seats_skipped(self):
        """Circunscripciones sin escaños definidos se omiten."""
        results = dhondt_by_constituency(
            {"Madrid": {"A": 100}},
            {"OtroSitio": 5},
            threshold=0.0,
        )
        assert "Madrid" not in results


# ---------------------------------------------------------------------------
# Nowcasting
# ---------------------------------------------------------------------------

class TestNowcasting:
    def _make_poll(self, pollster="Sigma", days_ago=7, results=None, n=1000):
        from datetime import timedelta
        return Poll(
            pollster=pollster,
            date=date.today() - timedelta(days=days_ago),
            sample_size=n,
            results=results or {"PP": 35.0, "PSOE": 28.0, "Vox": 15.0, "Sumar": 12.0},
        )

    def test_empty_polls_returns_empty(self):
        result = nowcast([])
        assert result.num_polls == 0
        assert result.estimates == {}

    def test_single_poll_matches_exactly(self):
        poll = self._make_poll(results={"PP": 40.0, "PSOE": 30.0})
        result = nowcast([poll])
        assert "PP" in result.estimates
        assert "PSOE" in result.estimates
        assert abs(result.estimates["PP"] - 40.0) < 5.0  # holgura por ponderación

    def test_returns_nowcast_result(self):
        polls = [self._make_poll(), self._make_poll("CIS", days_ago=3)]
        result = nowcast(polls)
        assert isinstance(result, NowcastResult)
        assert result.num_polls == 2

    def test_recent_polls_weighted_more(self):
        """Una encuesta reciente con PP alto debe subir la estimación de PP."""
        old_poll = self._make_poll(results={"PP": 30.0}, days_ago=25)
        new_poll = self._make_poll(results={"PP": 45.0}, days_ago=1)
        result = nowcast([old_poll, new_poll], decay_halflife_days=7)
        # La estimación de PP debe estar más cerca de 45 que de 30
        assert result.estimates["PP"] > 37.5

    def test_uncertainty_positive(self):
        polls = [self._make_poll()]
        result = nowcast(polls)
        for party, unc in result.uncertainty.items():
            assert unc >= 0.0

    def test_aggregate_polls_filters_by_window(self):
        from datetime import timedelta
        old = self._make_poll(days_ago=60)
        recent = self._make_poll(days_ago=10)
        filtered = aggregate_polls([old, recent], days_window=30)
        assert old not in filtered
        assert recent in filtered


# ---------------------------------------------------------------------------
# Simulación de escenarios
# ---------------------------------------------------------------------------

class TestSimulation:
    def test_basic_simulation(self):
        scenarios = [
            Scenario(
                name="Gobierno izquierda",
                votes={"PSOE": 500, "Sumar": 200, "PP": 400, "Vox": 150},
                seats=10,
                threshold=0.0,
            )
        ]
        results = seat_simulation(scenarios)
        assert len(results) == 1
        assert results[0].scenario == "Gobierno izquierda"
        assert results[0].majority_threshold == 6

    def test_majority_detection(self):
        scenarios = [
            Scenario(
                name="Mayoria PP",
                votes={"PP": 800, "PSOE": 200},
                seats=10,
                threshold=0.0,
            )
        ]
        results = seat_simulation(scenarios)
        assert results[0].has_majority["PP"] is True
        assert results[0].has_majority.get("PSOE", False) is False

    def test_multiple_scenarios(self):
        scenarios = [
            Scenario("Opt1", {"A": 600, "B": 400}, seats=5, threshold=0.0),
            Scenario("Opt2", {"A": 400, "B": 600}, seats=5, threshold=0.0),
        ]
        results = seat_simulation(scenarios)
        assert len(results) == 2
        assert results[0].dhondt.by_party["A"] > results[1].dhondt.by_party["A"]

    def test_empty_scenarios(self):
        results = seat_simulation([])
        assert results == []
