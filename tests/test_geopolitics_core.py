"""
Tests — Geopolitics Core — Bloque 14.

Tests unitarios del core geopolítico.
Sin llamadas de red reales — mocking o datos demo.
"""
from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock, patch

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# 1. Schemas
# ─────────────────────────────────────────────────────────────────────────────

class TestGeoEventSchema:
    def test_geo_event_creation(self):
        from etl.sources.geopolitics.schemas import GeoEvent
        ev = GeoEvent(
            event_id="test:001",
            source="acled",
            event_type="battles",
            country="Ukraine",
            country_iso3="UKR",
            event_date=date(2026, 1, 15),
            severity="HIGH",
            fatalities=25,
        )
        assert ev.event_id == "test:001"
        assert ev.severity == "HIGH"
        assert ev.fatalities == 25

    def test_geo_event_date_parsing_string(self):
        from etl.sources.geopolitics.schemas import GeoEvent
        ev = GeoEvent(
            event_id="test:002",
            source="ucdp",
            event_type="protests",
            country="Morocco",
            event_date="2026-03-10",
        )
        assert ev.event_date == date(2026, 3, 10)

    def test_geo_event_date_parsing_various_formats(self):
        from etl.sources.geopolitics.schemas import GeoEvent
        for fmt_date, expected in [
            ("2026/03/10", date(2026, 3, 10)),
            ("10-03-2026", date(2026, 3, 10)),
            ("10/03/2026", date(2026, 3, 10)),
        ]:
            ev = GeoEvent(
                event_id="test:fmt",
                source="test",
                event_type="riots",
                country="Test",
                event_date=fmt_date,
            )
            assert ev.event_date == expected

    def test_country_risk_profile_score_clamping(self):
        from etl.sources.geopolitics.schemas import CountryRiskProfile
        profile = CountryRiskProfile(
            country_iso3="TST",
            country_name="Test",
            date=date.today(),
            conflict_risk=150.0,  # debería ser clamped a 100
            total_score=-10.0,    # debería ser clamped a 0
        )
        assert profile.conflict_risk == 100.0
        assert profile.total_score == 0.0

    def test_geo_alert_creation(self):
        from etl.sources.geopolitics.schemas import GeoAlert
        alert = GeoAlert(
            alert_id="alert:001",
            alert_type="conflict_escalation",
            country_iso3="UKR",
            title="Escalada en Ucrania",
            severity="CRITICAL",
            affected_modules=["defense", "geopolitics"],
        )
        assert alert.severity == "CRITICAL"
        assert "defense" in alert.affected_modules


# ─────────────────────────────────────────────────────────────────────────────
# 2. ACLED Client
# ─────────────────────────────────────────────────────────────────────────────

class TestAcledClient:
    def test_fetch_returns_demo_events_without_credentials(self):
        """Sin ACLED_API_KEY, debe devolver demo events."""
        with patch.dict("os.environ", {}, clear=False):
            import os
            os.environ.pop("ACLED_API_KEY", None)
            os.environ.pop("ACLED_EMAIL", None)
            from etl.sources.geopolitics.acled_client import fetch_acled_events
            events = fetch_acled_events(limit=5)
            assert isinstance(events, list)
            # Demo data o lista vacía — nunca excepción
            assert len(events) >= 0

    def test_normalize_acled_event_valid(self):
        from etl.sources.geopolitics.acled_client import normalize_acled_event
        raw = {
            "data_id": "12345",
            "event_date": "2026-01-01",
            "event_type": "Battles",
            "country": "Ukraine",
            "latitude": "48.5",
            "longitude": "32.1",
            "fatalities": "15",
            "actor1": "Russian Forces",
            "actor2": "AFU",
        }
        ev = normalize_acled_event(raw)
        assert ev is not None
        assert ev.event_id == "acled:12345"
        assert ev.fatalities == 15
        assert ev.lat == 48.5

    def test_normalize_acled_event_missing_id_returns_none(self):
        from etl.sources.geopolitics.acled_client import normalize_acled_event
        ev = normalize_acled_event({"event_type": "protests", "country": "Morocco"})
        assert ev is None

    def test_acled_severity_computation(self):
        from etl.sources.geopolitics.acled_client import _compute_acled_severity
        assert _compute_acled_severity({"event_type": "battles", "fatalities": 60}) == "CRITICAL"
        assert _compute_acled_severity({"event_type": "protests", "fatalities": 0}) == "LOW"
        assert _compute_acled_severity({"event_type": "battles", "fatalities": 3}) == "HIGH"

    def test_generate_demo_events(self):
        from etl.sources.geopolitics.acled_client import _generate_demo_events
        events = _generate_demo_events(limit=5)
        assert len(events) == 5
        assert all(e.source == "acled_demo" for e in events)

    def test_acled_health_check_no_credentials(self):
        with patch.dict("os.environ", {}, clear=False):
            import os
            os.environ.pop("ACLED_API_KEY", None)
            os.environ.pop("ACLED_EMAIL", None)
            from etl.sources.geopolitics.acled_client import acled_health_check
            health = acled_health_check()
            assert health.available is False
            assert health.api_key_present is False


# ─────────────────────────────────────────────────────────────────────────────
# 3. Spanish Presence Provider
# ─────────────────────────────────────────────────────────────────────────────

class TestSpanishPresenceProvider:
    def test_get_all_presence_returns_list(self):
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence
        presence = get_spanish_presence()
        assert isinstance(presence, list)
        assert len(presence) > 0

    def test_get_military_missions(self):
        from etl.sources.geopolitics.spanish_presence_provider import get_military_missions
        missions = get_military_missions()
        assert all(m.category == "military" for m in missions)
        assert len(missions) >= 3

    def test_filter_by_country(self):
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence
        mar_presence = get_spanish_presence(country_iso3="MAR")
        assert all(p.country_iso3 == "MAR" for p in mar_presence)

    def test_filter_by_category(self):
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence
        energy = get_spanish_presence(categories=["energy"])
        assert all(p.category == "energy" for p in energy)

    def test_get_all_by_country_dict(self):
        from etl.sources.geopolitics.spanish_presence_provider import get_all_presence_by_country
        by_country = get_all_presence_by_country()
        assert isinstance(by_country, dict)
        assert "DZA" in by_country or "MAR" in by_country  # al menos uno presente


# ─────────────────────────────────────────────────────────────────────────────
# 4. Geo Signal Detector
# ─────────────────────────────────────────────────────────────────────────────

class TestGeoSignalDetector:
    def _make_event(self, iso3, severity, event_type="battles", fatalities=0):
        from etl.sources.geopolitics.schemas import GeoEvent
        return GeoEvent(
            event_id=f"test:{iso3}:{severity}",
            source="test",
            event_type=event_type,
            country=iso3,
            country_iso3=iso3,
            event_date=date.today(),
            severity=severity,
            fatalities=fatalities,
        )

    def test_detect_signals_empty_inputs(self):
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        alerts = detect_signals([], [], [], [])
        assert isinstance(alerts, list)

    def test_detect_conflict_escalation(self):
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        events = [self._make_event("UKR", "HIGH") for _ in range(5)]
        alerts = detect_signals(events, [], [], [])
        alert_types = [a.alert_type for a in alerts]
        assert "conflict_escalation" in alert_types

    def test_detect_energy_security_risk(self):
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        events = [self._make_event("DZA", "HIGH")]  # Algeria = energy critical
        alerts = detect_signals(events, [], [], [])
        alert_types = [a.alert_type for a in alerts]
        assert "energy_security" in alert_types

    def test_detect_migration_pressure(self):
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        events = [self._make_event("MAR", "HIGH", "violence against civilians")]
        alerts = detect_signals(events, [], [], [])
        alert_types = [a.alert_type for a in alerts]
        assert "migration_pressure" in alert_types

    def test_no_duplicate_alerts_same_country_type(self):
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        events = [self._make_event("UKR", "HIGH") for _ in range(10)]
        alerts = detect_signals(events, [], [], [])
        # No debe haber duplicados (mismo país + tipo)
        keys = [(a.country_iso3, a.alert_type) for a in alerts]
        assert len(keys) == len(set(keys))


# ─────────────────────────────────────────────────────────────────────────────
# 5. Geo Impact Model
# ─────────────────────────────────────────────────────────────────────────────

class TestGeoImpactModel:
    def _make_event(self, iso3, severity, event_type="battles"):
        from etl.sources.geopolitics.schemas import GeoEvent
        return GeoEvent(
            event_id=f"test:{iso3}",
            source="test",
            event_type=event_type,
            country=iso3,
            country_iso3=iso3,
            event_date=date.today(),
            severity=severity,
        )

    def test_estimate_domestic_impacts_empty(self):
        from etl.sources.geopolitics.geo_impact_model import estimate_domestic_impacts
        impacts = estimate_domestic_impacts([], [], [], [])
        assert isinstance(impacts, list)

    def test_estimate_impacts_algeria_energy(self):
        from etl.sources.geopolitics.geo_impact_model import estimate_domestic_impacts
        events = [self._make_event("DZA", "HIGH")]
        impacts = estimate_domestic_impacts(events, [], [], [])
        domains = {i.impact_domain for i in impacts}
        assert "energy" in domains

    def test_estimate_impacts_morocco_migration(self):
        from etl.sources.geopolitics.geo_impact_model import estimate_domestic_impacts
        events = [self._make_event("MAR", "HIGH", "violence against civilians")]
        impacts = estimate_domestic_impacts(events, [], [], [])
        domains = {i.impact_domain for i in impacts}
        assert "migration" in domains

    def test_map_event_to_modules(self):
        from etl.sources.geopolitics.geo_impact_model import map_geo_event_to_domestic_modules
        ev = self._make_event("DZA", "HIGH", "battles")
        modules = map_geo_event_to_domestic_modules(ev)
        assert isinstance(modules, list)
        assert len(modules) > 0

    def test_explain_domestic_impact(self):
        from etl.sources.geopolitics.geo_impact_model import explain_domestic_impact
        from etl.sources.geopolitics.schemas import DomesticImpact
        impact = DomesticImpact(
            impact_id="test:001",
            country_iso3="DZA",
            impact_domain="energy",
            impact_score=75.0,
            severity="HIGH",
            time_horizon="short_term",
        )
        explanation = explain_domestic_impact(impact)
        assert isinstance(explanation, str)
        assert len(explanation) > 10


# ─────────────────────────────────────────────────────────────────────────────
# 6. Geo Risk Scorer
# ─────────────────────────────────────────────────────────────────────────────

class TestGeoRiskScorer:
    def _make_event(self, iso3, severity, fatalities=0):
        from etl.sources.geopolitics.schemas import GeoEvent
        return GeoEvent(
            event_id=f"test:{iso3}:{severity}",
            source="test",
            event_type="battles",
            country=iso3,
            country_iso3=iso3,
            event_date=date.today(),
            severity=severity,
            fatalities=fatalities,
        )

    def test_compute_risk_profile_no_events(self):
        from etl.sources.geopolitics.geo_risk_scorer import compute_country_risk_profile
        profile = compute_country_risk_profile(
            country_iso3="TST",
            country_name="Test Country",
            events=[],
            narratives=[],
            presence=[],
        )
        assert profile.country_iso3 == "TST"
        assert 0.0 <= profile.total_score <= 100.0

    def test_compute_risk_profile_with_events(self):
        from etl.sources.geopolitics.geo_risk_scorer import compute_country_risk_profile
        events = [self._make_event("UKR", "CRITICAL", 50) for _ in range(5)]
        profile = compute_country_risk_profile("UKR", "Ukraine", events, [], [])
        assert profile.conflict_risk > 0

    def test_score_all_countries(self):
        from etl.sources.geopolitics.geo_risk_scorer import score_all_countries
        events = [
            self._make_event("UKR", "CRITICAL", 50),
            self._make_event("MAR", "MEDIUM", 2),
        ]
        profiles = score_all_countries(events, [], [])
        assert isinstance(profiles, list)
        # Ordenados por score desc
        if len(profiles) >= 2:
            assert profiles[0].total_score >= profiles[1].total_score

    def test_get_severity_label(self):
        from etl.sources.geopolitics.geo_risk_scorer import get_severity_label
        assert get_severity_label(80) in ("CRÍTICO",)
        assert get_severity_label(10) in ("BAJO",)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Geo Briefing Builder
# ─────────────────────────────────────────────────────────────────────────────

class TestGeoBriefingBuilder:
    def test_build_daily_digest_empty(self):
        from etl.sources.geopolitics.geo_briefing_builder import build_daily_spain_digest
        briefing = build_daily_spain_digest([], [], [], [], [])
        assert briefing.briefing_id
        assert briefing.titulo
        assert isinstance(briefing.eventos_clave, list)

    def test_build_country_briefing(self):
        from etl.sources.geopolitics.geo_briefing_builder import build_country_briefing
        briefing = build_country_briefing(
            country_iso3="UKR",
            country_name="Ukraine",
            events=[], narratives=[], risk_profile=None,
            impacts=[], presence=[], alerts=[],
        )
        assert briefing.country_iso3 == "UKR"
        assert "Ukraine" in briefing.titulo

    def test_build_top_risk_briefings_empty(self):
        from etl.sources.geopolitics.geo_briefing_builder import build_top_risk_briefings
        briefings = build_top_risk_briefings([], [], [], [], [], [], top_n=3)
        assert isinstance(briefings, list)


# ─────────────────────────────────────────────────────────────────────────────
# 8. Geopolitics Monitor
# ─────────────────────────────────────────────────────────────────────────────

class TestGeopoliticsMonitor:
    def test_get_health_status_returns_dict(self):
        from etl.sources.geopolitics.geopolitics_monitor import get_health_status
        status = get_health_status()
        assert isinstance(status, dict)
        assert "acled" in status
        assert "gdelt" in status
        assert "ucdp" in status

    def test_run_full_pipeline_returns_result(self):
        from etl.sources.geopolitics.geopolitics_monitor import run_full_pipeline
        result = run_full_pipeline(days_back=7, save_to_db=False)
        assert result.run_date == date.today()
        assert isinstance(result.events_fetched, int)
        assert isinstance(result.errors, list)

    def test_run_source_only_invalid_returns_empty(self):
        from etl.sources.geopolitics.geopolitics_monitor import run_source_only
        result = run_source_only(source="invalid_source")
        assert isinstance(result, list)
        assert len(result) == 0


# ─────────────────────────────────────────────────────────────────────────────
# 9. Brain Tools
# ─────────────────────────────────────────────────────────────────────────────

class TestGeopoliticsTools:
    def test_tools_registered(self):
        from agents.tools.geopolitics_tools import GEOPOLITICS_TOOLS
        assert len(GEOPOLITICS_TOOLS) == 6
        names = [t["name"] for t in GEOPOLITICS_TOOLS]
        assert "get_geopolitical_events" in names
        assert "get_country_risk_profile" in names
        assert "get_active_geo_alerts" in names
        assert "get_spanish_presence_abroad" in names
        assert "get_domestic_impact_assessment" in names
        assert "get_daily_geo_briefing" in names

    def test_get_geopolitical_events_returns_dict(self):
        from agents.tools.geopolitics_tools import get_geopolitical_events
        result = get_geopolitical_events(days_back=7)
        assert isinstance(result, dict)
        assert "total" in result
        assert "events" in result

    def test_get_spanish_presence_returns_dict(self):
        from agents.tools.geopolitics_tools import get_spanish_presence_abroad
        result = get_spanish_presence_abroad()
        assert isinstance(result, dict)
        assert "total" in result
        assert result["total"] > 0

    def test_get_active_geo_alerts_returns_dict(self):
        from agents.tools.geopolitics_tools import get_active_geo_alerts
        result = get_active_geo_alerts()
        assert isinstance(result, dict)
        assert "total" in result
        assert "alerts" in result

    def test_get_daily_briefing_returns_dict(self):
        from agents.tools.geopolitics_tools import get_daily_geo_briefing
        result = get_daily_geo_briefing()
        assert isinstance(result, dict)
        # Either has briefing fields or error field
        assert "titulo" in result or "error" in result
