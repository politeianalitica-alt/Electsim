from __future__ import annotations

import json

from agents.local_intelligence import LocalKnowledgeStore, load_scraper_records


def test_load_and_ingest_scraper_jsonl(tmp_path):
    scraper_file = tmp_path / "scraper.jsonl"
    rows = [
        {
            "fuente": "medio-demo",
            "titular": "El CIS publica una encuesta con subida del PSOE y caída del PP",
            "texto": "La encuesta estima PSOE 32,5%, PP 30,1% y VOX 12,0%. La vivienda y el paro dominan la campaña.",
            "url": "https://example.test/encuesta",
            "fecha_publicacion": "2026-04-28",
        },
        {
            "source": "macro-demo",
            "title": "El IPC baja al 2,4% mientras el paro se mantiene en el 11,2%",
            "text": "El Gobierno vincula el dato de inflación con energía y alimentos. El PIB crece un 1,8%.",
            "url": "https://example.test/macro",
            "published_at": "2026-04-28",
        },
    ]
    scraper_file.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in rows), encoding="utf-8")

    records = load_scraper_records(scraper_file)
    assert len(records) == 2
    assert records[0].source == "medio-demo"

    store = LocalKnowledgeStore(tmp_path / "store")
    result = store.ingest_records(records)

    assert result.records_seen == 2
    assert result.documents_added == 2
    assert result.facts_added > 0
    assert result.ontology_nodes > 0
    assert "electoral" in result.domains
    assert (tmp_path / "store" / "documents.jsonl").exists()
    assert (tmp_path / "store" / "ontology.json").exists()


def test_local_search_and_chat_without_llm(tmp_path):
    store = LocalKnowledgeStore(tmp_path / "store")
    result = store.ingest_records(
        load_scraper_records(
            _write_jsonl(
                tmp_path,
                [
                    {
                        "title": "El Congreso vota una ley de vivienda",
                        "text": "PSOE, Sumar y ERC pactan límites al alquiler. PP y VOX critican el impacto económico.",
                        "source": "congreso-demo",
                    },
                    {
                        "title": "La inflación alimentaria presiona a los hogares",
                        "text": "El IPC de alimentos sube 4,1% y afecta a jóvenes, familias y pensionistas.",
                        "source": "economia-demo",
                    },
                ],
            )
        )
    )
    assert result.documents_added == 2

    hits = store.search("vivienda alquiler PSOE ERC", k=5)
    assert hits
    assert hits[0]["domain"] in {"politica", "social", "economia"}

    answer = store.chat("¿Qué sabemos sobre vivienda y alquiler?", use_llm=False)
    assert not answer.used_llm
    assert answer.citations
    assert "Síntesis local" in answer.answer

    summary = store.ontology_summary()
    assert summary["documents"] == 2
    assert summary["nodes"] >= 4


def _write_jsonl(tmp_path, rows):
    path = tmp_path / "input.jsonl"
    path.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in rows), encoding="utf-8")
    return path
