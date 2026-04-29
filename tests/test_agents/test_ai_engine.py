from __future__ import annotations

from agents.ai_engine import AIEngine
from agents.ner_pipeline import extract_entities_spacy
from agents.sentiment_pipeline import analyze_sentiment


def test_ai_engine_hash_chroma_roundtrip(tmp_path):
    engine = AIEngine(
        chroma_dir=tmp_path / "chroma",
        collection_name="test_docs_hash",
        embedding_backend="hash",
    )
    inserted = engine.upsert_documents(
        [
            {
                "id": "doc-1",
                "title": "Encuesta electoral",
                "summary": "El PSOE y el PP compiten por el voto urbano mientras sube la vivienda.",
                "text": "La vivienda y el paro aparecen como preocupaciones principales.",
                "source": "test",
                "domain": "electoral",
                "topics": ["vivienda", "empleo"],
            }
        ]
    )
    assert inserted == 1
    hits = engine.semantic_search("voto vivienda empleo", k=3)
    assert hits
    assert hits[0]["id"] == "doc-1"


def test_sentiment_and_ner_fallbacks_are_operational():
    sentiment = analyze_sentiment("El Gobierno anuncia un avance, pero la oposición denuncia una crisis.")
    assert {"positivo", "negativo", "neutral"} <= set(sentiment)

    entities = extract_entities_spacy("Pedro Sanchez se reúne con el Gobierno en Madrid.")
    assert any(e["type"] in {"Persona", "Organizacion", "Lugar"} for e in entities)

