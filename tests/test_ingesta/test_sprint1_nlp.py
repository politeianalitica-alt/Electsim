"""Sprint 1 · S1.5 · tests de integracion NLP español + parsing.

Verifica:
  - EnrichedItem acepta los campos nuevos (sentiment, emotion, hate, irony, keywords)
  - get_topic_label devuelve etiquetas humanas para seed topics
  - pdf_to_markdown falla cerrado si no hay URL valida
  - markitdown_parser falla cerrado si paquete no instalado
  - analyze_full devuelve estructura correcta aunque pysentimiento no este

Estos tests funcionan SIN pysentimiento/markitdown/docling instalados.
El pipeline graceful-degrades correctamente.
"""
from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from packages.types import EnrichedItem
from agents.topics import enrich_with_topics, get_topic_label, extract_keywords_yake


# ── EnrichedItem con campos nuevos ─────────────────────────────────

def test_enriched_item_acepta_emotion_hate_irony():
    """Pydantic v2 extra='forbid' permite los nuevos campos opcionales."""
    item = EnrichedItem(
        source="rss",
        item_id="art-200",
        title="Sanchez aprueba plan vivienda",
        published_at=datetime.utcnow(),
        sentiment={
            "label": "positivo",
            "positivo": 0.78,
            "negativo": 0.12,
            "neutral": 0.10,
            "score": 0.66,
            "backend": "pysentimiento",
        },
        emotion={"label": "joy", "probas": {"joy": 0.6, "others": 0.4}, "backend": "pysentimiento"},
        hate={"label": "not_hateful", "probas": {"hateful": 0.05}, "backend": "pysentimiento"},
        irony={"label": "not_ironic", "probas": {"not_ironic": 0.9, "ironic": 0.1}, "backend": "pysentimiento"},
        keywords=["plan vivienda", "Sanchez", "acceso"],
    )
    assert item.emotion["label"] == "joy"
    assert item.hate["probas"]["hateful"] == 0.05
    assert "plan vivienda" in item.keywords


def test_enriched_item_emotion_opcional():
    """emotion/hate/irony son opcionales · valores default {} OK."""
    item = EnrichedItem(
        source="rss",
        item_id="art-201",
        title="Test",
        published_at=datetime.utcnow(),
    )
    assert item.emotion == {}
    assert item.hate == {}
    assert item.irony == {}
    assert item.keywords == []


def test_enriched_item_extra_forbidden_aun_funciona():
    """Tras añadir campos, extra='forbid' sigue rechazando campos no contemplados."""
    with pytest.raises(ValidationError):
        EnrichedItem(
            source="rss",
            item_id="x",
            title="t",
            published_at=datetime.utcnow(),
            campo_inventado_xyz="x",  # ← debe fallar
        )


# ── Topic labels ────────────────────────────────────────────────────

def test_get_topic_label_seed_topics():
    """Los 10 seed topics ES tienen etiquetas humanas predefinidas."""
    assert get_topic_label(0) == "Economia y presupuestos"
    assert get_topic_label(1) == "Politica interior"
    assert get_topic_label(7) == "Corrupcion y justicia"
    assert get_topic_label(-1) == ""


def test_get_topic_label_topic_desconocido_no_rompe():
    """Si el topic_id es desconocido y no hay agent, devuelve string vacio."""
    label = get_topic_label(99999)
    assert isinstance(label, str)


# ── YAKE keywords ────────────────────────────────────────────────────

def test_extract_keywords_yake_texto_politico():
    """YAKE debe extraer keywords razonables sobre texto politico ES."""
    text = (
        "El presidente del gobierno Pedro Sanchez ha anunciado un plan "
        "economico para mejorar el sistema sanitario nacional con una "
        "inversion de mil millones de euros en hospitales publicos."
    )
    keywords = extract_keywords_yake(text)
    assert len(keywords) > 0
    # Esperamos que aparezca alguna keyword relevante
    joined = " ".join(keywords).lower()
    assert any(w in joined for w in ["sanchez", "plan", "economico", "sanitario"])


def test_extract_keywords_texto_corto_devuelve_vacio():
    """Textos <50 chars → lista vacia (YAKE necesita contexto)."""
    assert extract_keywords_yake("") == []
    assert extract_keywords_yake("hola") == []


# ── enrich_with_topics · graceful sin modelo entrenado ─────────────

def test_enrich_with_topics_sin_modelo_no_rompe():
    """Si BERTopic no tiene modelo · topic_id=-1, label='', keywords igualmente."""
    item = EnrichedItem(
        source="rss",
        item_id="art-300",
        title="El gobierno aprueba reforma fiscal",
        body="El presidente del gobierno ha anunciado hoy una reforma fiscal "
             "ambiciosa que aumentara el IRPF de las rentas altas y reducira "
             "el impuesto de sociedades para PYMES en sectores estrategicos.",
        published_at=datetime.utcnow(),
    )
    enriched = enrich_with_topics([item])
    assert len(enriched) == 1
    e = enriched[0]
    # topic_id puede ser -1 (sin modelo) o un int valido (si esta entrenado)
    assert isinstance(e.topic_id, int) or e.topic_id is None
    assert isinstance(e.topic_label, str)
    # Keywords con YAKE deberian aparecer (texto >50 chars)
    assert len(e.keywords) > 0


def test_enrich_with_topics_lista_vacia():
    """Lista vacia · devuelve lista vacia · no rompe."""
    assert enrich_with_topics([]) == []


# ── analyze_full (sentiment_pipeline) graceful sin pysentimiento ──

def test_analyze_full_estructura_correcta():
    """analyze_full devuelve estructura {sentiment, emotion, hate, irony} siempre."""
    from agents.sentiment_pipeline import analyze_full

    result = analyze_full("El gobierno aprueba una reforma economica importante.")
    assert "sentiment" in result
    assert "emotion" in result
    assert "hate" in result
    assert "irony" in result
    # sentiment siempre tiene backend (incluso lexicon)
    assert "backend" in result["sentiment"]


def test_analyze_full_texto_vacio():
    """Texto vacio · todos los campos a vacio."""
    from agents.sentiment_pipeline import analyze_full

    result = analyze_full("")
    assert result["sentiment"]["label"] in {"neutral", "neutro"}
    assert result["emotion"] == {}
    assert result["hate"] == {}
    assert result["irony"] == {}


# ── pdf_to_text · falla cerrado ─────────────────────────────────────

def test_pdf_to_markdown_url_invalida():
    """URL invalida · devuelve string vacio sin romper."""
    from etl.sources.documents.pdf_to_text import pdf_to_markdown

    assert pdf_to_markdown("") == ""
    assert pdf_to_markdown("   ") == ""
    assert pdf_to_markdown("not a url at all") == ""


def test_pdf_bytes_to_markdown_vacios():
    """Bytes vacios · devuelve string vacio."""
    from etl.sources.documents.pdf_to_text import pdf_bytes_to_markdown

    assert pdf_bytes_to_markdown(b"") == ""


# ── markitdown · graceful si no instalado ──────────────────────────

def test_markitdown_no_instalado_no_rompe():
    """Sin markitdown · parse_file devuelve unavailable=True · no excepcion."""
    from etl.sources.documents.markitdown_parser import parse_file

    result = parse_file("/etc/hostname")  # archivo cualquiera
    assert isinstance(result, dict)
    # Sin markitdown · 'ok' es False con error explicito o unavailable=True
    if not result.get("ok"):
        assert result.get("unavailable") or "no instalado" in (result.get("error") or "").lower()


# ── Sprint 2 · S2 tests ───────────────────────────────────────────────

def test_iptc_topics_definidos():
    """17 top-level IPTC topics deben estar definidos."""
    from agents.topics.iptc_classifier import IPTC_TOP_LEVEL_TOPICS

    assert len(IPTC_TOP_LEVEL_TOPICS) == 17
    assert "politics" in IPTC_TOP_LEVEL_TOPICS
    assert "economy, business and finance" in IPTC_TOP_LEVEL_TOPICS


def test_iptc_classify_texto_vacio():
    """classify_iptc con texto vacio devuelve []."""
    from agents.topics.iptc_classifier import classify_iptc

    assert classify_iptc("") == []
    assert classify_iptc("   ") == []


def test_boe_tools_registradas():
    """4 BOE tools deben estar registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.boe_live_tools  # noqa: F401 · trigger registro

    tools = ToolRegistry.list_tools()
    assert "boe_sumario" in tools
    assert "boe_search_consolidated" in tools
    assert "boe_get_norma" in tools
    assert "boe_novedades_ultimos_dias" in tools


def test_boe_search_query_vacia():
    """boe_search_consolidated con query vacia · devuelve error explicito."""
    from agents.tools import ToolRegistry
    import agents.tools.boe_live_tools  # noqa: F401

    fn = ToolRegistry.get("boe_search_consolidated")
    result = fn(query="")
    assert result.get("error") == "query vacía"
    assert result.get("items") == []


def test_media_reliability_extract_host():
    """extract_host normaliza URLs comunes."""
    from etl.sources.media.reliability import extract_host

    assert extract_host("https://www.elpais.com/politica/2026") == "elpais.com"
    assert extract_host("http://abc.es") == "abc.es"
    assert extract_host("elpais.com") == "elpais.com"
    assert extract_host("") == ""
    assert extract_host("not a url") == "not a url"  # urlparse permisivo


def test_media_reliability_sin_bd_devuelve_none():
    """Sin BD configurada, get_reliability devuelve None (no rompe)."""
    from etl.sources.media.reliability import get_reliability

    # En tests no hay engine, debe devolver None
    result = get_reliability("test-host-nonexistente.com")
    assert result is None


def test_fundus_es_publishers_constantes():
    """ES_PUBLISHERS tiene los 6 medios principales españoles."""
    from etl.sources.media.fundus_client import ES_PUBLISHERS

    assert "ElPais" in ES_PUBLISHERS
    assert "ElMundo" in ES_PUBLISHERS
    assert "ABC" in ES_PUBLISHERS
    assert "LaVanguardia" in ES_PUBLISHERS
    assert "ElDiario" in ES_PUBLISHERS
    assert "Publico" in ES_PUBLISHERS
    assert len(ES_PUBLISHERS) == 6


def test_fundus_list_publishers_estructura():
    """list_es_publishers devuelve siempre lista de dicts con keys correctas."""
    from etl.sources.media.fundus_client import list_es_publishers

    pubs = list_es_publishers()
    assert isinstance(pubs, list)
    assert len(pubs) == 6  # 6 publishers ES
    for p in pubs:
        assert "name" in p
        assert "host" in p
        assert "available" in p
        assert isinstance(p["name"], str)
