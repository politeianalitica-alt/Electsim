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


# ── Sprint 3 · BDNS + TED + Brain tools ───────────────────────────────

def test_bdns_client_construido():
    """BDNSClient se construye correctamente."""
    from etl.sources.spain.bdns import BDNSClient, get_bdns_client

    c = get_bdns_client()
    assert c is not None
    # Singleton
    c2 = get_bdns_client()
    assert c is c2


def test_ted_client_construido_y_cpv_sectores():
    """TEDClient + mapa CPV_BY_SECTOR para sectores Politeia."""
    from etl.sources.eu.ted import TEDClient, CPV_BY_SECTOR, get_ted_client

    c = get_ted_client()
    assert c is not None
    # Sectores Politeia mapeados a CPV
    for sector in ["energia", "farma", "defensa", "infraestructuras", "telecom"]:
        assert sector in CPV_BY_SECTOR
        assert isinstance(CPV_BY_SECTOR[sector], list)
        assert len(CPV_BY_SECTOR[sector]) >= 1


def test_sprint3_tools_registradas():
    """6 tools Sprint 3 deben estar registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.contratacion_subvenciones_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    assert "bdns_search_convocatorias" in tools
    assert "bdns_search_concesiones" in tools
    assert "ted_search_licitaciones" in tools
    assert "congreso_votaciones" in tools
    assert "congreso_iniciativas" in tools
    assert "senado_actividad" in tools


def test_ted_search_sector_invalido():
    """ted_search_licitaciones con sector inválido devuelve error explicito."""
    from agents.tools import ToolRegistry
    import agents.tools.contratacion_subvenciones_tools

    fn = ToolRegistry.get("ted_search_licitaciones")
    result = fn(sector="sector_inventado", max_items=1)
    assert "error" in result
    assert result["n_items"] == 0
    assert "energia" in result["error"]  # mensaje lista sectores válidos


def test_bdns_to_normalized_items_yields_normalized():
    """to_normalized_items es un generador · devuelve objetos válidos sin romper."""
    from etl.sources.spain.bdns import to_normalized_items

    # Iterar con max=0 · generador puede estar vacío sin romper
    items = list(to_normalized_items(max_items=0))
    assert items == []


# ── Sprint 4 · Compliance + OSINT + legalize-es + Manifesto ───────────

def test_opensanctions_client_construido():
    """OpenSanctionsClient se construye correctamente."""
    from etl.sources.osint.opensanctions_client import OpenSanctionsClient, get_opensanctions_client

    c = get_opensanctions_client()
    assert c is not None
    # Singleton
    assert get_opensanctions_client() is c


def test_opensanctions_search_vacio():
    """Búsqueda vacía devuelve error explicito sin romper."""
    from etl.sources.osint.opensanctions_client import OpenSanctionsClient

    c = OpenSanctionsClient()
    r = c.search("")
    assert r["error"] == "query vacía"
    assert r["results"] == []


def test_party_positions_axes():
    """9 ejes ideológicos del Manifesto Project."""
    from etl.sources.spain.party_positions import IDEOLOGICAL_AXES

    assert "rile" in IDEOLOGICAL_AXES
    assert "welfare" in IDEOLOGICAL_AXES
    assert "eu_pos" in IDEOLOGICAL_AXES
    assert len(IDEOLOGICAL_AXES) == 9


def test_party_distance_sin_bd_devuelve_none():
    """Sin BD configurada, get_party_distance devuelve None."""
    from etl.sources.spain.party_positions import get_party_distance

    assert get_party_distance("psoe", "pp") is None


def test_legalize_es_parser_yaml_frontmatter():
    """Parser de frontmatter YAML funciona en strings simples."""
    from etl.sources.legislative.legalize_es_indexer import parse_law_markdown

    sample = """---
title: "Ley Test"
identifier: "BOE-TEST-001"
rank: "ley"
publication_date: "2026-05-20"
subjects: ["test", "muestra"]
---
# Cuerpo de la ley
Texto del articulado.
"""
    meta, body = parse_law_markdown(sample)
    assert meta["title"] == "Ley Test"
    assert meta["identifier"] == "BOE-TEST-001"
    assert meta["rank"] == "ley"
    assert meta["subjects"] == ["test", "muestra"]
    assert "Cuerpo de la ley" in body


def test_legalize_es_chunk_text():
    """Chunker trocea respetando longitud y overlap."""
    from etl.sources.legislative.legalize_es_indexer import _chunk_text

    # Texto corto → 1 chunk
    chunks = _chunk_text("Texto corto.", chunk_size=2000)
    assert len(chunks) == 1

    # Texto largo → varios chunks con solapamiento
    long_text = "\n\n".join(["Párrafo " + str(i) + ". " * 100 for i in range(20)])
    chunks = _chunk_text(long_text, chunk_size=2000, overlap=200)
    assert len(chunks) > 1


def test_compliance_tools_registradas():
    """5 tools de compliance Sprint 4 registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.compliance_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    assert "compliance_screen" in tools
    assert "opensanctions_search" in tools
    assert "party_position" in tools
    assert "party_distance" in tools
    assert "search_laws_semantic" in tools


def test_party_position_tool_partido_no_existe():
    """party_position con slug inexistente devuelve error explicito."""
    from agents.tools import ToolRegistry
    import agents.tools.compliance_tools

    fn = ToolRegistry.get("party_position")
    result = fn(party_slug="partido_inventado_xyz")
    assert "error" in result
    assert result["party_slug"] == "partido_inventado_xyz"


# ── Sprint 5 · Grafo temporal ─────────────────────────────────────────

def test_entity_repository_tiene_get_graph_at():
    """EntityRepository tiene método get_graph_at (Sprint 5 · S5.1)."""
    from agents.entities.repository import EntityRepository

    assert hasattr(EntityRepository, "get_graph_at")
    assert hasattr(EntityRepository, "get_links_at")
    assert callable(EntityRepository.get_graph_at)


def test_timeline_endpoint_registrado():
    """/api/v1/entities/timeline registrado (Sprint 5 · S5.2)."""
    import os
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app

    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/entities/timeline" in paths
    assert "/api/v1/entities/{entity_id}/links-at" in paths


# ── Sprint 6 · Briefing sectorial ─────────────────────────────────────

def test_sector_briefing_endpoint_registrado():
    """/api/v1/sectores/{id}/briefing registrado (Sprint 6 · S6.2)."""
    import os
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app

    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/sectores/{sector_id}/briefing" in paths


def test_sector_briefing_tools_registradas():
    """sector_briefing y list_sectors registrados en ToolRegistry (Sprint 6 · S6.3)."""
    from agents.tools import ToolRegistry
    import agents.tools.sector_briefing_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    assert "sector_briefing" in tools
    assert "list_sectors" in tools


def test_sector_briefing_tool_sector_invalido():
    """sector_briefing con sector inexistente devuelve error explicito."""
    from agents.tools import ToolRegistry
    import agents.tools.sector_briefing_tools

    fn = ToolRegistry.get("sector_briefing")
    result = fn(sector="sector_inventado_xyz", days_back=1)
    # Esperamos error explicito o respuesta con error en payload
    assert "error" in result or "errors" in result


# ── Sprint 7 · Banca & Seguros ───────────────────────────────────────

def test_cnmv_client_importable():
    """Sprint 7 · S7.1 · CNMVClient importable y construye sin red."""
    from etl.sources.spain.cnmv import CNMVClient, get_cnmv_client
    client = get_cnmv_client()
    assert isinstance(client, CNMVClient)
    items = CNMVClient._parse_rss("<rss><channel></channel></rss>")
    assert items == []


def test_cnmv_parse_rss_basico():
    """CNMV parser extrae items de RSS válido."""
    from etl.sources.spain.cnmv import CNMVClient
    xml = """<?xml version="1.0"?><rss><channel>
        <item>
          <title>BBVA: Hecho relevante test</title>
          <link>https://www.cnmv.es/test/1</link>
          <description>Descripcion del hecho</description>
          <pubDate>Mon, 19 May 2026 12:34:56 GMT</pubDate>
          <guid>cnmv-test-1</guid>
        </item>
    </channel></rss>"""
    items = CNMVClient._parse_rss(xml)
    assert len(items) == 1
    assert items[0]["company"] == "BBVA"
    assert items[0]["id"] == "cnmv-test-1"
    assert items[0]["link"] == "https://www.cnmv.es/test/1"


def test_regulatory_seed_existe_y_es_valido():
    """Sprint 7 · S7.3 · seed JSON existe con obligaciones críticas."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "regulatory" / "obligations_seed.json"
    assert seed.exists(), "seed obligations_seed.json no encontrado"
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    for required in ("dora", "basel_iv", "mica", "ai_act", "nis2", "csrd"):
        assert required in slugs, f"slug '{required}' falta en seed"
    for r in rows:
        assert r.get("slug") and r.get("title") and r.get("sector")
        assert r.get("jurisdiction") in {"ES", "EU", "INT"}
        assert r.get("severity") in {"info", "medium", "high", "critical"}
        assert r.get("status") in {"open", "in_progress", "completed", "deprecated"}


def test_regulatory_service_falla_cerrado_sin_engine():
    """Sin BD las funciones del servicio devuelven valores vacíos sin romper."""
    from etl.sources.regulatory import service
    original = service._get_engine
    service._get_engine = lambda: None
    try:
        assert service.get_obligation("dora") is None
        assert service.list_obligations() == []
        assert service.upcoming_deadlines() == []
        res = service.load_obligations_seed()
        assert res["loaded"] == 0
        assert "error" in res
    finally:
        service._get_engine = original


def test_regulatory_migracion_0067_existe():
    """Migración 0067_regulatory_obligations existe y declara tabla."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0067_regulatory_obligations.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0067_regulatory_obligations"' in src
    assert 'down_revision = "0066_party_positions"' in src
    assert 'create_table' in src and '"regulatory_obligations"' in src


def test_banca_tools_registradas():
    """Sprint 7 · S7.4 · tools banca registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.banca_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    for name in (
        "cnmv_hechos_relevantes",
        "bde_indicador",
        "regulatory_obligation",
        "list_regulatory_obligations",
        "upcoming_compliance_deadlines",
        "dora_compliance_status",
    ):
        assert name in tools, f"tool '{name}' no registrada"


def test_banca_tools_fallan_cerrado_sin_bd():
    """Tools regulatorias sin BD devuelven estructura vacía con error."""
    from agents.tools import ToolRegistry
    import agents.tools.banca_tools  # noqa: F401
    from etl.sources.regulatory import service

    original = service._get_engine
    service._get_engine = lambda: None
    try:
        r1 = ToolRegistry.get("regulatory_obligation")(slug="dora")
        assert "error" in r1
        r2 = ToolRegistry.get("list_regulatory_obligations")(sector="banca")
        assert r2["n_items"] == 0
        r3 = ToolRegistry.get("upcoming_compliance_deadlines")(days_ahead=30)
        assert r3["n_items"] == 0
        r4 = ToolRegistry.get("dora_compliance_status")()
        assert "error" in r4
    finally:
        service._get_engine = original


def test_banca_tool_cnmv_estructura():
    """cnmv_hechos_relevantes devuelve estructura consistente aunque falle red."""
    from agents.tools import ToolRegistry
    import agents.tools.banca_tools  # noqa: F401

    fn = ToolRegistry.get("cnmv_hechos_relevantes")
    result = fn(limit=5)
    assert "n_items" in result
    assert "items" in result
    assert isinstance(result["items"], list)


# ── Sprint 8 · Farma (AEMPS/CIMA + EMA + pharma_signals) ──────────────

def test_aemps_cima_client_importable():
    """Sprint 8 · S8.1 · cliente AEMPS/CIMA importable y construye sin red."""
    from etl.sources.spain.aemps_cima import AEMPSCIMAClient, get_aemps_client
    client = get_aemps_client()
    assert isinstance(client, AEMPSCIMAClient)
    # Notas placeholder devuelve []
    assert client.notas_informativas() == []


def test_ema_client_y_feeds():
    """Sprint 8 · S8.2 · cliente EMA importable + feeds bien declarados."""
    from etl.sources.eu.ema import EMAClient, get_ema_client, _EMA_FEEDS
    client = get_ema_client()
    assert isinstance(client, EMAClient)
    for k in ("news", "shortages", "epar", "referrals"):
        assert k in _EMA_FEEDS
        assert _EMA_FEEDS[k].startswith("https://www.ema.europa.eu/")
    # Parser RSS con XML vacío
    items = EMAClient._parse_rss("<rss><channel></channel></rss>", "news")
    assert items == []


def test_ema_parse_rss_basico():
    """EMA parser extrae items de RSS válido."""
    from etl.sources.eu.ema import EMAClient
    xml = """<?xml version="1.0"?><rss><channel>
        <item>
          <title>Ozempic shortage update</title>
          <link>https://www.ema.europa.eu/en/news/ozempic-1</link>
          <description>Updated info on shortage</description>
          <pubDate>Mon, 19 May 2026 10:00:00 GMT</pubDate>
          <guid>ema-shortages-ozempic-1</guid>
        </item>
    </channel></rss>"""
    items = EMAClient._parse_rss(xml, "shortages")
    assert len(items) == 1
    assert items[0]["id"] == "ema-shortages-ozempic-1"
    assert items[0]["feed"] == "shortages"


def test_pharma_signals_seed_valido():
    """Sprint 8 · S8.3 · seed JSON con señales farma críticas."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "pharma" / "signals_seed.json"
    assert seed.exists(), "signals_seed.json no encontrado"
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    # Señales icónicas del seed
    for required in (
        "shortage_ozempic_es_2025",
        "shortage_amoxicilina_es_2025",
        "shortage_metilfenidato_es_2024",
        "epar_leqembi_2025",
        "recall_ranitidina_es",
    ):
        assert required in slugs, f"slug '{required}' falta en seed"
    for r in rows:
        assert r["slug"] and r["product_name"]
        assert r["source"] in {"aemps", "ema", "fda", "manual"}
        assert r["signal_kind"] in {
            "shortage", "recall", "epar", "referral", "genericization", "pricing"
        }
        assert r["severity"] in {"info", "medium", "high", "critical"}
        assert r["status"] in {"active", "monitoring", "resolved", "archived"}


def test_pharma_service_falla_cerrado_sin_engine():
    """Sin BD el servicio devuelve estructuras vacías sin romper."""
    from etl.sources.pharma import service
    original = service._get_engine
    service._get_engine = lambda: None
    try:
        assert service.get_signal("shortage_ozempic_es_2025") is None
        assert service.list_signals() == []
        assert service.active_signals() == []
        res = service.load_signals_seed()
        assert res["loaded"] == 0
        assert "error" in res
    finally:
        service._get_engine = original


def test_pharma_migracion_0068_existe():
    """Migración 0068_pharma_signals existe y declara tabla."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0068_pharma_signals.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0068_pharma_signals"' in src
    assert 'down_revision = "0067_regulatory_obligations"' in src
    assert 'create_table' in src and '"pharma_signals"' in src


def test_farma_tools_registradas():
    """Sprint 8 · S8.4 · tools farma registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.farma_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    for name in (
        "aemps_cima_buscar",
        "aemps_ficha_medicamento",
        "aemps_problemas_suministro",
        "ema_alertas",
        "pharma_signal",
        "list_pharma_signals",
        "active_pharma_signals",
    ):
        assert name in tools, f"tool '{name}' no registrada"


def test_farma_tools_fallan_cerrado_sin_bd():
    """Tools farma sobre pharma_signals devuelven estructura vacía con error."""
    from agents.tools import ToolRegistry
    import agents.tools.farma_tools  # noqa: F401
    from etl.sources.pharma import service

    original = service._get_engine
    service._get_engine = lambda: None
    try:
        r1 = ToolRegistry.get("pharma_signal")(slug="shortage_ozempic_es_2025")
        assert "error" in r1
        r2 = ToolRegistry.get("list_pharma_signals")(severity="critical")
        assert r2["n_items"] == 0
        r3 = ToolRegistry.get("active_pharma_signals")(severity_min="high")
        assert r3["n_items"] == 0
    finally:
        service._get_engine = original


def test_ema_alertas_tool_feed_invalido():
    """ema_alertas rechaza explicitamente feeds desconocidos."""
    from agents.tools import ToolRegistry
    import agents.tools.farma_tools  # noqa: F401

    fn = ToolRegistry.get("ema_alertas")
    res = fn(feed="feed_inexistente_xyz", limit=5)
    assert res["n_items"] == 0
    assert "error" in res and res["error"]
