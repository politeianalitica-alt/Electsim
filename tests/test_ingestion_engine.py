"""Tests para la capa enhanced ingestion."""

from __future__ import annotations

from datetime import datetime

import pytest

from etl.ingestion import (  # noqa: F401  (asegura import del package)
    dedup_engine,
    enrichment,
    normalization,
    orchestrator,
)
from etl.ingestion.connectors import (
    bde_connector,
    cis_connector,
    eurostat_connector,
    ine_connector,
    parliamentary_connector,
    twitter_connector,
)
from etl.ingestion.dedup_engine import (
    DedupResult,
    compute_simhash,
    dedup_items,
    find_duplicates_in_corpus,
    hamming_distance,
    is_near_duplicate,
)
from etl.ingestion.enrichment import (
    compute_political_relevance,
    enrich_article,
    enrich_batch,
    extract_quotes,
)
from etl.ingestion.normalization import (
    extract_canonical_id,
    normalize_actor_name,
    normalize_date_string,
    normalize_party_name,
    normalize_text,
    normalize_url,
)
from etl.ingestion.orchestrator import (
    IngestionRun,
    get_recent_ingestion_runs,
    run_full_ingestion,
)


# -------- normalization --------

def test_normalize_text_strips_html_and_whitespace():
    out = normalize_text("<p>Hola   <b>mundo</b>\n\n</p>")
    assert out == "Hola mundo"


def test_normalize_text_handles_invisible_chars():
    raw = "Hola​ mundo­"
    assert normalize_text(raw) == "Hola mundo"


def test_normalize_text_empty():
    assert normalize_text("") == ""
    assert normalize_text(None) == ""  # type: ignore[arg-type]


def test_normalize_text_nfkc():
    raw = "ﬁnal"  # ligature fi
    out = normalize_text(raw)
    assert "fi" in out


def test_normalize_party_name_psoe():
    assert normalize_party_name("Partido Socialista Obrero Español") == "PSOE"
    assert normalize_party_name("psoe") == "PSOE"


def test_normalize_party_name_pp():
    assert normalize_party_name("Partido Popular") == "PP"


def test_normalize_party_name_vox():
    assert normalize_party_name("vox") == "VOX"


def test_normalize_party_name_unknown():
    out = normalize_party_name("Mi Partido Local")
    assert isinstance(out, str) and len(out) > 0


def test_normalize_actor_name_strips_titles():
    assert normalize_actor_name("Sr. Pedro Sánchez") == "Pedro Sánchez"
    assert normalize_actor_name("Excmo. Alberto Núñez Feijóo") in {
        "Alberto Núñez",
        "Alberto Núñez Feijóo",
    }


def test_normalize_actor_name_compound_surname():
    out = normalize_actor_name("Pedro Sánchez Pérez-Castejón")
    assert out == "Pedro Sánchez"


def test_normalize_url_removes_utm():
    url = "https://EXAMPLE.com/Path/?utm_source=x&utm_medium=y&id=123"
    out = normalize_url(url)
    assert "utm_source" not in out
    assert "id=123" in out
    assert "example.com" in out


def test_normalize_url_adds_protocol_and_https():
    out = normalize_url("Example.com/path")
    assert out.startswith("https://example.com")


def test_normalize_url_empty():
    assert normalize_url("") == ""


def test_normalize_date_iso():
    assert normalize_date_string("2026-05-05") == "2026-05-05"


def test_normalize_date_spanish_long():
    assert normalize_date_string("5 de mayo de 2026") == "2026-05-05"


def test_normalize_date_slashes():
    assert normalize_date_string("05/05/2026") == "2026-05-05"


def test_normalize_date_invalid():
    assert normalize_date_string("no es fecha") is None


def test_extract_canonical_id_unknown_source():
    out = extract_canonical_id(
        "https://example.com/articulo-largo-12345.html", "desconocido"
    )
    assert out is None or isinstance(out, str)


def test_extract_canonical_id_elpais():
    cid = extract_canonical_id(
        "https://elpais.com/politica/2026-05-05/un-titular-importante.html",
        "elpais",
    )
    assert cid is not None and "2026-05-05" in cid


# -------- dedup_engine --------

def test_simhash_same_text_equal():
    a = compute_simhash("El gobierno anuncia nuevas medidas económicas hoy")
    b = compute_simhash("El gobierno anuncia nuevas medidas económicas hoy")
    assert a == b
    assert a != 0


def test_simhash_different_texts_distance():
    a = compute_simhash("El gobierno anuncia nuevas medidas económicas hoy")
    b = compute_simhash("Manifestación masiva en Barcelona contra los recortes")
    assert hamming_distance(a, b) > 5


def test_hamming_distance_zero():
    assert hamming_distance(123, 123) == 0


def test_is_near_duplicate_true():
    a = compute_simhash("El Congreso aprueba la nueva ley sanitaria con amplio apoyo")
    b = compute_simhash("El Congreso aprueba la nueva ley sanitaria con apoyo amplio")
    assert is_near_duplicate(a, b, threshold=10)


def test_dedup_items_exact_duplicate():
    items = [
        {"id": "a", "title": "Sánchez comparece en el Congreso"},
        {"id": "b", "title": "Sánchez comparece en el Congreso"},
        {"id": "c", "title": "Feijóo presenta su programa económico"},
    ]
    res = dedup_items(items)
    assert isinstance(res, DedupResult)
    assert len(res.kept) == 2
    assert len(res.duplicates) == 1


def test_dedup_items_near_duplicates():
    items = [
        {"id": "1", "title": "El gobierno aprueba nuevas medidas económicas hoy mismo"},
        {"id": "2", "title": "El gobierno aprueba hoy nuevas medidas económicas"},
        {"id": "3", "title": "Manifestación pacífica en las calles de Madrid"},
    ]
    res = dedup_items(items, threshold=10)
    assert len(res.kept) >= 2
    assert len(res.kept) + len(res.duplicates) == 3


def test_find_duplicates_in_corpus():
    items = [
        {"title": "Texto A único largo"},
        {"title": "Texto B distinto totalmente otro"},
        {"title": "Texto A único largo"},
    ]
    pairs = find_duplicates_in_corpus(items)
    assert (0, 2) in pairs


# -------- connectors --------

def test_twitter_fetch_returns_data():
    tweets = twitter_connector.fetch_tweets("psoe", limit=5)
    assert len(tweets) == 5
    assert all(t.language == "es" for t in tweets)
    assert all(t.is_political for t in tweets)


def test_twitter_handles_timeline():
    posts = twitter_connector.fetch_political_handles_timeline(
        ["@sanchezcastejon", "@NunezFeijoo"], days=2
    )
    assert len(posts) > 0


def test_parliamentary_active_initiatives():
    items = parliamentary_connector.fetch_active_initiatives(limit=10)
    assert len(items) == 10
    assert all(i.type in {"proposicion_ley", "iniciativa", "pregunta"} for i in items)


def test_parliamentary_voting_records():
    votes = parliamentary_connector.fetch_voting_records()
    assert len(votes) > 0
    assert "results_by_party" in votes[0]


def test_parliamentary_committee_calendar():
    cal = parliamentary_connector.fetch_committee_calendar()
    assert len(cal) > 0
    assert "committee" in cal[0]


def test_ine_indicators():
    indicators = ine_connector.fetch_indicators()
    assert len(indicators) > 0
    codes = {i.code for i in indicators}
    assert "IPC" in codes
    assert "paro_rate" in codes


def test_ine_demographic_snapshot():
    snap = ine_connector.fetch_demographic_snapshot()
    assert "population_total" in snap
    assert "by_ccaa" in snap


def test_eurostat_indicators():
    out = eurostat_connector.fetch_eu_indicators("ES")
    assert len(out) > 0
    assert all("indicator" in row for row in out)


def test_eurostat_country_comparisons():
    cmp = eurostat_connector.fetch_country_comparisons(
        "gdp_growth_eu", ["ES", "DE", "FR"]
    )
    assert "values" in cmp
    assert "ES" in cmp["values"]


def test_bde_macro_snapshot():
    snap = bde_connector.fetch_macroeconomic_snapshot()
    assert "interest_rates" in snap
    assert "ibex_35" in snap


def test_bde_yield_curve():
    curve = bde_connector.fetch_yield_curve()
    assert "10Y" in curve


def test_bde_credit_aggregates():
    cred = bde_connector.fetch_credit_aggregates()
    assert "credito_hogares" in cred


def test_cis_latest_barometer():
    bar = cis_connector.fetch_latest_barometer()
    assert "vote_intention" in bar
    assert "PSOE" in bar["vote_intention"]


def test_cis_historical_intention():
    hist = cis_connector.fetch_historical_intention("PSOE", months=6)
    assert len(hist) == 6


def test_cis_top_concerns_evolution():
    evo = cis_connector.fetch_top_concerns_evolution()
    assert len(evo) > 0


# -------- enrichment --------

def test_enrich_article_adds_fields():
    article = {
        "title": "Pedro Sánchez comparece en el Congreso sobre la inflación",
        "content": "El presidente del Gobierno Pedro Sánchez ha defendido las medidas del PSOE frente al PP. El IPC sube un 3,2%.",
    }
    out = enrich_article(article)
    assert "cleaned_text" in out
    assert "sentiment_score" in out
    assert "entities" in out
    assert "topics" in out
    assert "is_political" in out
    assert "quality_score" in out
    assert "has_quantitative_claim" in out
    assert out["is_political"] is True
    assert out["has_quantitative_claim"] is True
    assert "PSOE" in out["entities"] or "Pedro Sánchez" in out["entities"]


def test_enrich_batch_handles_errors():
    out = enrich_batch([{"title": "uno"}, {"title": "dos"}])
    assert len(out) == 2


def test_extract_quotes_basic():
    text = 'El líder afirmó: «Vamos a defender la sanidad pública», según Pedro Sánchez.'
    quotes = extract_quotes(text)
    assert len(quotes) >= 1
    assert "sanidad" in quotes[0]["quote"].lower()


def test_political_relevance_score():
    score = compute_political_relevance(
        "El Gobierno y el Congreso debaten una nueva ley con el PSOE y el PP."
    )
    assert 0.0 < score <= 1.0


# -------- orchestrator --------

def test_run_full_ingestion_completes():
    run = run_full_ingestion("tenant_test")
    assert isinstance(run, IngestionRun)
    assert run.completed_at is not None
    assert run.articles_fetched > 0
    assert run.articles_kept >= 0
    assert run.run_id.startswith("run_")
    assert isinstance(run.started_at, datetime)


def test_orchestrator_logs_runs():
    initial = len(get_recent_ingestion_runs("tenant_test"))
    run_full_ingestion("tenant_test", sources=["ine", "bde"])
    after = get_recent_ingestion_runs("tenant_test")
    assert len(after) >= initial
    assert after[0].sources_run  # último al frente


def test_run_full_ingestion_subset_sources():
    run = run_full_ingestion("tenant_test", sources=["cis"])
    assert run.sources_run == ["cis"]
    assert run.articles_fetched >= 1


if __name__ == "__main__":  # pragma: no cover
    pytest.main([__file__, "-v"])
