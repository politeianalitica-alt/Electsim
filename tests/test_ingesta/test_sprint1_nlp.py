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


# ── Sprint 9 · Tercer Sector (BDNS+EU Funds+EIB+social_orgs) ──────────

def test_bdns_aggregator_importable():
    """Sprint 9 · S9.1 · aggregator BDNS importable + funciones expuestas."""
    from etl.sources.spain.bdns_aggregator import (
        top_beneficiarios, concesiones_por_nif, resumen_por_organo,
    )
    assert callable(top_beneficiarios)
    assert callable(concesiones_por_nif)
    assert callable(resumen_por_organo)


def test_eu_funding_client_importable():
    """Sprint 9 · S9.2 · cliente EU Funding sin red."""
    from etl.sources.eu.eu_funding import EUFundingClient, get_eu_funding_client
    client = get_eu_funding_client()
    assert isinstance(client, EUFundingClient)


def test_eib_client_y_parser():
    """Sprint 9 · S9.3 · cliente EIB importable y parser RSS."""
    from etl.sources.eu.eib import EIBClient, get_eib_client
    client = get_eib_client()
    assert isinstance(client, EIBClient)
    items = EIBClient._parse_rss("<rss><channel></channel></rss>")
    assert items == []

    xml = """<?xml version="1.0"?><rss><channel>
        <item>
          <title>Project A - Spain</title>
          <link>https://www.eib.org/en/projects/all/123</link>
          <description>Renewable energy in Spain</description>
          <pubDate>Mon, 19 May 2026 09:00:00 GMT</pubDate>
          <guid>eib-123</guid>
        </item>
    </channel></rss>"""
    items = EIBClient._parse_rss(xml)
    assert len(items) == 1
    assert items[0]["country_hint"].lower() == "spain"
    filtered = client.filter_by_country(items, "Spain")
    assert len(filtered) == 1


def test_social_orgs_seed_valido():
    """Sprint 9 · S9.4 · seed JSON con ONGs ES principales."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "social" / "orgs_seed.json"
    assert seed.exists(), "orgs_seed.json no encontrado"
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    for required in (
        "caritas_es", "cruz_roja_es", "save_the_children_es", "msf_es",
        "wwf_es", "feaps_plena_inclusion", "fundacion_la_caixa",
    ):
        assert required in slugs, f"slug '{required}' falta en seed"
    for r in rows:
        assert r["slug"] and r["name"]
        assert r["legal_form"] in {
            "ngo", "fundacion", "cooperativa", "asociacion", "empresa_insercion"
        }
        assert r["scope"] in {"local", "regional", "national", "european", "international"}
        assert isinstance(r.get("irpf_07", False), bool)


def test_social_service_falla_cerrado_sin_engine():
    """Sin BD el servicio social devuelve estructuras vacías sin romper."""
    from etl.sources.social import service
    original = service._get_engine
    service._get_engine = lambda: None
    try:
        assert service.get_org("caritas_es") is None
        assert service.get_org_by_nif("R2800013E") is None
        assert service.list_orgs() == []
        res = service.load_orgs_seed()
        assert res["loaded"] == 0
        assert "error" in res
    finally:
        service._get_engine = original


def test_social_migracion_0069_existe():
    """Migración 0069_social_orgs existe y declara tabla."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0069_social_orgs.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0069_social_orgs"' in src
    assert 'down_revision = "0068_pharma_signals"' in src
    assert 'create_table' in src and '"social_orgs"' in src


def test_tercer_sector_tools_registradas():
    """Sprint 9 · S9.5 · tools tercer sector registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.tercer_sector_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    for name in (
        "bdns_top_beneficiarios",
        "bdns_concesiones_beneficiario",
        "bdns_resumen_organo",
        "eu_funds_calls",
        "eib_proyectos",
        "social_org",
        "social_org_by_nif",
        "list_social_orgs",
        "social_org_funding",
    ):
        assert name in tools, f"tool '{name}' no registrada"


def test_social_org_funding_sin_bd():
    """social_org_funding falla cerrado sin BD (no rompe pipeline)."""
    from agents.tools import ToolRegistry
    import agents.tools.tercer_sector_tools  # noqa: F401
    from etl.sources.social import service as svc_social

    original = svc_social._get_engine
    svc_social._get_engine = lambda: None
    try:
        fn = ToolRegistry.get("social_org_funding")
        res = fn(slug="caritas_es")
        assert "error" in res
    finally:
        svc_social._get_engine = original


def test_bdns_aggregator_funciones_sin_red():
    """Aggregator BDNS · sin red devuelve estructuras vacías + error explícito."""
    # Forzar cliente BDNS sin sesión
    from etl.sources.spain import bdns
    client = bdns.get_bdns_client()
    original_session = client._session
    client._session = None
    try:
        from etl.sources.spain.bdns_aggregator import (
            top_beneficiarios, concesiones_por_nif, resumen_por_organo,
        )
        r1 = top_beneficiarios(max_pages=1)
        assert r1["n_concesiones"] == 0
        assert "error" in r1
        r2 = concesiones_por_nif("R2800013E", max_pages=1)
        assert r2["concesiones"] == []
        assert "error" in r2
        r3 = resumen_por_organo("Q2800001A", max_pages=1)
        assert r3["convocatorias"] == []
        assert "error" in r3
    finally:
        client._session = original_session


# ── Sprint 10 · Infraestructuras (TED+PLACE+MITMS+infra_projects) ────

def test_ted_aggregator_importable():
    """Sprint 10 · S10.1 · aggregator TED importable + funciones expuestas."""
    from etl.sources.eu.ted_aggregator import (
        top_adjudicatarios, ranking_por_pais, serie_temporal_cpv,
    )
    assert callable(top_adjudicatarios)
    assert callable(ranking_por_pais)
    assert callable(serie_temporal_cpv)


def test_ted_aggregator_sector_invalido():
    """Sector desconocido → error explícito."""
    from etl.sources.eu.ted_aggregator import top_adjudicatarios
    res = top_adjudicatarios(sector="sector_inexistente_xyz", max_pages=1)
    assert res["n_notices"] == 0
    assert "error" in res and res["error"]


def test_place_client_y_parser():
    """Sprint 10 · S10.2 · PLACE client importable + parser Atom."""
    from etl.sources.spain.place import PLACEClient, get_place_client, INFRA_ORGS
    client = get_place_client()
    assert isinstance(client, PLACEClient)
    # Organismos definidos
    for k in ("adif", "aena", "puertos", "renfe", "enaire"):
        assert k in INFRA_ORGS
    # Parser con Atom vacío
    items = PLACEClient._parse_atom("<feed xmlns='http://www.w3.org/2005/Atom'></feed>")
    assert items == []


def test_place_parse_atom_basico():
    """PLACE parser extrae entries de un feed Atom mínimo."""
    from etl.sources.spain.place import PLACEClient
    xml = """<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
        <entry>
            <id>urn:test:place:1</id>
            <title>Licitación ADIF tramo X</title>
            <summary>Construcción tramo ferroviario</summary>
            <updated>2026-05-10T12:00:00Z</updated>
            <link href="https://contrataciondelestado.es/test/1" rel="alternate"/>
            <dc:publisher>ADIF Alta Velocidad</dc:publisher>
        </entry>
    </feed>"""
    items = PLACEClient._parse_atom(xml)
    assert len(items) == 1
    assert items[0]["id"] == "urn:test:place:1"
    assert "ADIF" in items[0]["organismo"]
    # Filtro por organismo funciona
    filt = PLACEClient().filter_by_organismo(items, "adif")
    assert len(filt) == 1


def test_mitms_client_importable():
    """Sprint 10 · S10.3 · cliente MITMS open data sin red."""
    from etl.sources.spain.mitms_data import MITMSDataClient, get_mitms_client
    client = get_mitms_client()
    assert isinstance(client, MITMSDataClient)


def test_infra_seed_valido():
    """Sprint 10 · S10.4 · seed JSON con proyectos críticos."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "infra" / "projects_seed.json"
    assert seed.exists(), "projects_seed.json no encontrado"
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    for required in (
        "ave_galicia", "y_vasca", "corredor_mediterraneo",
        "ampliacion_barajas_t1", "interconexion_biscay",
    ):
        assert required in slugs, f"slug '{required}' falta en seed"
    for r in rows:
        assert r["slug"] and r["name"] and r["owner_organism"]
        assert r["kind"] in {
            "ferroviario_av", "ferroviario", "aeropuerto", "puerto",
            "carretera", "energia", "agua", "telecom",
        }
        assert r["status"] in {
            "estudio_informativo", "licitado", "en_obras",
            "parado", "completado", "cancelado",
        }


def test_infra_service_falla_cerrado_sin_engine():
    """Sin BD el servicio infra devuelve estructuras vacías."""
    from etl.sources.infra import service
    original = service._get_engine
    service._get_engine = lambda: None
    try:
        assert service.get_project("ave_galicia") is None
        assert service.list_projects() == []
        assert service.delayed_projects() == []
        res = service.load_projects_seed()
        assert res["loaded"] == 0
        assert "error" in res
    finally:
        service._get_engine = original


def test_infra_migracion_0070_existe():
    """Migración 0070_infra_projects existe y declara tabla."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0070_infra_projects.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0070_infra_projects"' in src
    assert 'down_revision = "0069_social_orgs"' in src
    assert 'create_table' in src and '"infra_projects"' in src


def test_infraestructuras_tools_registradas():
    """Sprint 10 · S10.5 · tools infra registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.infraestructuras_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    for name in (
        "ted_top_constructoras",
        "ted_ranking_pais_infra",
        "ted_serie_cpv",
        "place_licitaciones",
        "mitms_datasets",
        "infra_project",
        "list_infra_projects",
        "infra_projects_delayed",
    ):
        assert name in tools, f"tool '{name}' no registrada"


def test_place_licitaciones_organismo_invalido():
    """place_licitaciones con organismo desconocido → error explícito."""
    from agents.tools import ToolRegistry
    import agents.tools.infraestructuras_tools  # noqa: F401

    fn = ToolRegistry.get("place_licitaciones")
    res = fn(organismo="organismo_no_existe", limit=5)
    assert res["n_items"] == 0
    assert "error" in res and res["error"]


def test_infra_tool_proyecto_sin_bd():
    """infra_project sin BD devuelve error consistente."""
    from agents.tools import ToolRegistry
    import agents.tools.infraestructuras_tools  # noqa: F401
    from etl.sources.infra import service as svc_infra

    original = svc_infra._get_engine
    svc_infra._get_engine = lambda: None
    try:
        res = ToolRegistry.get("infra_project")(slug="ave_galicia")
        assert "error" in res
        res2 = ToolRegistry.get("list_infra_projects")(kind="ferroviario_av")
        assert res2["n_items"] == 0
        res3 = ToolRegistry.get("infra_projects_delayed")(min_delay_months=24)
        assert res3["n_items"] == 0
    finally:
        svc_infra._get_engine = original


# ── Sprint 11 · Defensa (NATO+EDA+Defensa.gob+defense_programs) ──────

def test_nato_client_y_parser():
    """Sprint 11 · S11.1 · cliente NATO importable + parser RSS."""
    from etl.sources.defense.nato import NATOClient, get_nato_client
    client = get_nato_client()
    assert isinstance(client, NATOClient)
    items = NATOClient._parse_rss("<rss><channel></channel></rss>")
    assert items == []


def test_nato_parse_y_search():
    """NATO parser + búsqueda case-insensitive."""
    from etl.sources.defense.nato import NATOClient
    xml = """<?xml version="1.0"?><rss><channel>
        <item>
            <title>NATO procurement opportunity Spain</title>
            <link>https://www.nato.int/news/1</link>
            <description>Industrial RFI for Spain</description>
            <pubDate>Mon, 19 May 2026 09:00:00 GMT</pubDate>
            <guid>nato-1</guid>
        </item>
        <item>
            <title>Ukraine update</title>
            <link>https://www.nato.int/news/2</link>
            <description>News from Ukraine</description>
            <pubDate>Mon, 19 May 2026 10:00:00 GMT</pubDate>
            <guid>nato-2</guid>
        </item>
    </channel></rss>"""
    items = NATOClient._parse_rss(xml)
    assert len(items) == 2
    client = NATOClient()
    matches = client.search("spain", items)
    assert len(matches) == 1
    assert matches[0]["id"] == "nato-1"


def test_eda_client_y_catalogo():
    """Sprint 11 · S11.2 · cliente EDA + catálogo estático programas."""
    from etl.sources.defense.eda import EDAClient, get_eda_client
    client = get_eda_client()
    assert isinstance(client, EDAClient)
    progs = client.list_programs()
    slugs = {p["slug"] for p in progs}
    for required in ("pesco_euro_male", "edf_fcas", "edf_eurodrone"):
        assert required in slugs
    assert client.get_program("edf_fcas")["code"] == "FCAS / NGWS"
    assert client.get_program("no_existe_xyz") is None


def test_defensa_gob_client_importable():
    """Sprint 11 · S11.3 · cliente Defensa.gob importable."""
    from etl.sources.defense.defensa_gob import DefensaGobClient, get_defensa_gob_client
    client = get_defensa_gob_client()
    assert isinstance(client, DefensaGobClient)
    # Parser RSS con XML vacío
    assert DefensaGobClient._parse_rss("<rss><channel></channel></rss>", "bod") == []


def test_defense_programs_seed_valido():
    """Sprint 11 · S11.4 · seed JSON con programas críticos."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "defense" / "programs_seed.json"
    assert seed.exists(), "programs_seed.json no encontrado"
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    for required in (
        "f110_navantia", "s80_submarino", "fcas_ngws",
        "eurodrone", "eurofighter_t4", "vcr_dragón",
        "spainsat_ng", "iris2",
    ):
        assert required in slugs, f"slug '{required}' falta en seed"
    for r in rows:
        assert r["slug"] and r["name"] and r["lead_country"]
        assert r["domain"] in {"aire", "tierra", "mar", "espacio", "ciber", "multi"}
        assert r["status"] in {
            "planificacion", "rfp", "firma", "desarrollo", "produccion",
            "entrega", "operacion", "retiro", "cancelado",
        }


def test_defense_service_falla_cerrado_sin_engine():
    """Sin BD el servicio defense_programs devuelve estructuras vacías."""
    from etl.sources.defense import programs_service as svc
    original = svc._get_engine
    svc._get_engine = lambda: None
    try:
        assert svc.get_program("f110_navantia") is None
        assert svc.list_programs() == []
        assert svc.upcoming_milestones() == []
        res = svc.load_programs_seed()
        assert res["loaded"] == 0
        assert "error" in res
    finally:
        svc._get_engine = original


def test_defense_migracion_0071_existe():
    """Migración 0071_defense_programs existe."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0071_defense_programs.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0071_defense_programs"' in src
    assert 'down_revision = "0070_infra_projects"' in src
    assert 'create_table' in src and '"defense_programs"' in src


def test_defensa_tools_registradas():
    """Sprint 11 · S11.5 · tools defensa registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.defensa_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    for name in (
        "nato_news", "eda_news", "eda_list_programs", "eda_program",
        "defensa_gob_feed", "defense_program", "list_defense_programs",
        "defense_upcoming_milestones",
    ):
        assert name in tools, f"tool '{name}' no registrada"


def test_defensa_gob_feed_invalido():
    """defensa_gob_feed rechaza explicitamente feeds desconocidos."""
    from agents.tools import ToolRegistry
    import agents.tools.defensa_tools  # noqa: F401

    fn = ToolRegistry.get("defensa_gob_feed")
    res = fn(feed="feed_inexistente_xyz", limit=5)
    assert res["n_items"] == 0
    assert "error" in res and res["error"]


def test_defense_tools_fallan_cerrado_sin_bd():
    """Tools defense_programs sin BD devuelven error consistente."""
    from agents.tools import ToolRegistry
    import agents.tools.defensa_tools  # noqa: F401
    from etl.sources.defense import programs_service as svc

    original = svc._get_engine
    svc._get_engine = lambda: None
    try:
        res = ToolRegistry.get("defense_program")(slug="f110_navantia")
        assert "error" in res
        res2 = ToolRegistry.get("list_defense_programs")(domain="mar")
        assert res2["n_items"] == 0
        res3 = ToolRegistry.get("defense_upcoming_milestones")(days_ahead=90)
        assert res3["n_items"] == 0
    finally:
        svc._get_engine = original


def test_eda_program_via_tool():
    """eda_program tool · catálogo estático funciona sin BD."""
    from agents.tools import ToolRegistry
    import agents.tools.defensa_tools  # noqa: F401

    res = ToolRegistry.get("eda_program")(slug="edf_fcas")
    assert res["code"] == "FCAS / NGWS"
    res2 = ToolRegistry.get("eda_program")(slug="no_existe")
    assert "error" in res2


# ── Sprint 12 · Telecom (CNMC+BEREC+espectro+operators) ──────────────

def test_cnmc_telecom_client_y_filtro():
    """Sprint 12 · S12.1 · cliente CNMC + filtro keywords telecom."""
    from etl.sources.telecom.cnmc import (
        CNMCTelecomClient, get_cnmc_telecom_client, _TELECOM_KEYWORDS,
    )
    client = get_cnmc_telecom_client()
    assert isinstance(client, CNMCTelecomClient)
    assert "5G" in _TELECOM_KEYWORDS
    # Filtro funciona
    items = [
        {"title": "CNMC sanciona a Movistar", "description": "Telefónica móvil"},
        {"title": "Resolución sector ferroviario", "description": "ADIF"},
    ]
    out = client.filter_telecom(items)
    assert len(out) == 1
    assert "Movistar" in out[0]["title"]


def test_berec_client_parser():
    """Sprint 12 · S12.2 · cliente BEREC importable + parser RSS."""
    from etl.sources.telecom.berec import BERECClient, get_berec_client
    client = get_berec_client()
    assert isinstance(client, BERECClient)
    items = BERECClient._parse_rss("<rss><channel></channel></rss>")
    assert items == []


def test_spectrum_auctions_catalogo():
    """Sprint 12 · S12.3 · catálogo subastas espectro coherente."""
    from etl.sources.telecom.spectrum import (
        SPECTRUM_AUCTIONS, list_spectrum_auctions, get_spectrum_auction,
        operator_spectrum_summary,
    )
    for required in (
        "auction_700mhz_2020", "auction_3_5ghz_2018",
        "auction_26ghz_2022", "auction_900_1800mhz_2024",
    ):
        assert required in SPECTRUM_AUCTIONS
    # Filtros
    completadas = list_spectrum_auctions(status="completada")
    assert len(completadas) >= 4
    previstas = list_spectrum_auctions(status="previsto")
    assert len(previstas) >= 1
    # Detalle por slug
    a = get_spectrum_auction("auction_700mhz_2020")
    assert a["band"].startswith("700")
    assert a["total_revenue_eur"] > 0
    # Sumario por operador
    movistar = operator_spectrum_summary("Movistar")
    assert movistar["n_auctions_participated"] >= 3
    assert movistar["total_paid_eur"] > 0


def test_telecom_operators_seed_valido():
    """Sprint 12 · S12.4 · seed JSON con operadores principales."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "telecom" / "operators_seed.json"
    assert seed.exists()
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    for required in (
        "movistar", "masorange", "vodafone_es_zegona", "digi_es",
        "cellnex", "avatel",
    ):
        assert required in slugs, f"slug '{required}' falta en seed"
    for r in rows:
        assert r["slug"] and r["name"]
        assert r["kind"] in {
            "incumbente", "mvno", "omv", "mayorista", "tower",
            "isp", "satelital", "submarino",
        }


def test_telecom_service_falla_cerrado_sin_engine():
    """Sin BD el servicio telecom_operators devuelve estructuras vacías."""
    from etl.sources.telecom import operators_service as svc
    original = svc._get_engine
    svc._get_engine = lambda: None
    try:
        assert svc.get_operator("movistar") is None
        assert svc.list_operators() == []
        ms = svc.market_share_summary()
        assert ms["top_movil"] == []
        assert "error" in ms
        res = svc.load_operators_seed()
        assert res["loaded"] == 0
        assert "error" in res
    finally:
        svc._get_engine = original


def test_telecom_migracion_0072_existe():
    """Migración 0072_telecom_operators existe."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0072_telecom_operators.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0072_telecom_operators"' in src
    assert 'down_revision = "0071_defense_programs"' in src
    assert 'create_table' in src and '"telecom_operators"' in src


def test_telecom_tools_registradas():
    """Sprint 12 · S12.5 · tools telecom registradas en ToolRegistry."""
    from agents.tools import ToolRegistry
    import agents.tools.telecom_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    for name in (
        "cnmc_telecom_news", "berec_news",
        "spectrum_auctions_list", "spectrum_auction", "operator_spectrum",
        "telecom_operator", "list_telecom_operators", "telecom_market_summary",
    ):
        assert name in tools, f"tool '{name}' no registrada"


def test_spectrum_tool_estatico():
    """spectrum_auction tool · catálogo estático sin BD funciona."""
    from agents.tools import ToolRegistry
    import agents.tools.telecom_tools  # noqa: F401

    res = ToolRegistry.get("spectrum_auction")(slug="auction_700mhz_2020")
    assert "band" in res
    res2 = ToolRegistry.get("spectrum_auction")(slug="no_existe")
    assert "error" in res2


def test_operator_spectrum_tool():
    """operator_spectrum tool · suma espectro adjudicado a un operador."""
    from agents.tools import ToolRegistry
    import agents.tools.telecom_tools  # noqa: F401

    res = ToolRegistry.get("operator_spectrum")(operator_name="Vodafone")
    assert res["n_auctions_participated"] >= 3
    assert res["total_lots_won"] > 0


def test_telecom_tools_sin_bd():
    """telecom_operator / list / market_summary sin BD devuelven error explícito."""
    from agents.tools import ToolRegistry
    import agents.tools.telecom_tools  # noqa: F401
    from etl.sources.telecom import operators_service as svc

    original = svc._get_engine
    svc._get_engine = lambda: None
    try:
        r1 = ToolRegistry.get("telecom_operator")(slug="movistar")
        assert "error" in r1
        r2 = ToolRegistry.get("list_telecom_operators")(kind="incumbente")
        assert r2["n_items"] == 0
        r3 = ToolRegistry.get("telecom_market_summary")()
        assert r3["top_movil"] == []
    finally:
        svc._get_engine = original


# ── Sprint 13 · Inmobiliario (Catastro+Registradores+INE+markets) ────

def test_catastro_client_importable():
    """Sprint 13 · S13.1 · cliente Catastro importable sin red."""
    from etl.sources.housing.catastro import CatastroClient, get_catastro_client
    client = get_catastro_client()
    assert isinstance(client, CatastroClient)


def test_registradores_serie_compraventas():
    """Sprint 13 · S13.2 · serie compraventas registradores."""
    from etl.sources.housing.registradores import (
        serie_compraventas, serie_hipotecas, resumen_ultimo_trimestre,
    )
    res = serie_compraventas()
    assert res["n_periodos"] >= 8
    assert all("total" in d for d in res["data"])
    res_h = serie_hipotecas(start="2025Q1")
    # debería filtrar a partir de 2025Q1
    assert all(d["period"] >= "2025Q1" for d in res_h["data"])
    resumen = resumen_ultimo_trimestre()
    assert "last_period" in resumen
    assert "yoy_pct" in resumen["compraventas"]


def test_ine_vivienda_client_y_series():
    """Sprint 13 · S13.3 · cliente INE + códigos IPV definidos."""
    from etl.sources.housing.ine_vivienda import (
        INEViviendaClient, get_ine_vivienda_client, IPV_SERIES,
    )
    client = get_ine_vivienda_client()
    assert isinstance(client, INEViviendaClient)
    for k in ("general", "usada", "nueva"):
        assert k in IPV_SERIES
        assert IPV_SERIES[k]["code"].startswith("IPV")


def test_housing_seed_valido():
    """Sprint 13 · S13.4 · seed JSON mercados vivienda."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "housing" / "markets_seed.json"
    assert seed.exists()
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    for required in (
        "madrid_centro", "barcelona_eixample", "palma_mallorca",
        "malaga_capital", "san_sebastian", "girona_capital",
    ):
        assert required in slugs, f"slug '{required}' falta en seed"
    for r in rows:
        assert r["slug"] and r["name"] and r["ccaa"]
        assert r["scope"] in {"distrito", "municipio", "comarca", "provincia", "ccaa"}
        assert isinstance(r.get("zona_mercado_tensionado", False), bool)


def test_housing_service_falla_cerrado_sin_engine():
    """Sin BD el servicio housing_markets devuelve estructuras vacías."""
    from etl.sources.housing import markets_service as svc
    original = svc._get_engine
    svc._get_engine = lambda: None
    try:
        assert svc.get_market("madrid_centro") is None
        assert svc.list_markets() == []
        assert svc.tension_alerts() == []
        res = svc.load_markets_seed()
        assert res["loaded"] == 0
        assert "error" in res
    finally:
        svc._get_engine = original


def test_housing_migracion_0073_existe():
    """Migración 0073_housing_markets existe."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0073_housing_markets.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0073_housing_markets"' in src
    assert 'down_revision = "0072_telecom_operators"' in src
    assert 'create_table' in src and '"housing_markets"' in src


def test_inmobiliario_tools_registradas():
    """Sprint 13 · S13.5 · tools inmobiliario registradas."""
    from agents.tools import ToolRegistry
    import agents.tools.inmobiliario_tools  # noqa: F401

    tools = ToolRegistry.list_tools()
    for name in (
        "catastro_consulta_rc", "catastro_consulta_coordenadas",
        "registradores_compraventas", "registradores_hipotecas",
        "registradores_ultimo_resumen", "ine_vivienda_serie",
        "housing_market", "list_housing_markets", "housing_tension_alerts",
    ):
        assert name in tools, f"tool '{name}' no registrada"


def test_registradores_tools_funcionan():
    """Tools registradores trabajan sobre dataset estático (no requieren BD ni red)."""
    from agents.tools import ToolRegistry
    import agents.tools.inmobiliario_tools  # noqa: F401

    r1 = ToolRegistry.get("registradores_compraventas")(start="2025Q1", end="2025Q4")
    assert r1["n_periodos"] == 4
    r2 = ToolRegistry.get("registradores_hipotecas")()
    assert r2["n_periodos"] >= 8
    r3 = ToolRegistry.get("registradores_ultimo_resumen")()
    assert "last_period" in r3


def test_ine_vivienda_serie_invalida():
    """ine_vivienda_serie rechaza explicitamente series desconocidas."""
    from agents.tools import ToolRegistry
    import agents.tools.inmobiliario_tools  # noqa: F401

    fn = ToolRegistry.get("ine_vivienda_serie")
    res = fn(serie="serie_inexistente_xyz", last_n=5)
    assert res["data"] == []
    assert "error" in res and res["error"]


def test_housing_tools_sin_bd():
    """housing_market / list / tension_alerts sin BD devuelven error consistente."""
    from agents.tools import ToolRegistry
    import agents.tools.inmobiliario_tools  # noqa: F401
    from etl.sources.housing import markets_service as svc

    original = svc._get_engine
    svc._get_engine = lambda: None
    try:
        r1 = ToolRegistry.get("housing_market")(slug="madrid_centro")
        assert "error" in r1
        r2 = ToolRegistry.get("list_housing_markets")(zmt_only=True)
        assert r2["n_items"] == 0
        r3 = ToolRegistry.get("housing_tension_alerts")()
        assert r3["n_items"] == 0
    finally:
        svc._get_engine = original


# ── Sprint 14 · Agro + Commodities (Vesper-style) ────────────────────

def test_fega_client_importable():
    """Sprint 14 · S14.1 · cliente FEGA importable + agregador funciona."""
    from etl.sources.agro.fega import FEGAClient, get_fega_client
    client = get_fega_client()
    assert isinstance(client, FEGAClient)
    # Agregador en memoria sin red
    rows = [
        {"BENEFICIARIO": "Soc. Agraria X", "IMPORTE_TOTAL": "12345,67"},
        {"BENEFICIARIO": "Soc. Agraria X", "IMPORTE_TOTAL": "5000"},
        {"BENEFICIARIO": "Coop. Y", "IMPORTE_TOTAL": "9999"},
    ]
    res = client.aggregate_top_beneficiarios(rows, top_n=10)
    assert res["n_rows"] == 3
    assert res["top"][0]["name"] == "Soc. Agraria X"
    assert res["top"][0]["n_pagos"] == 2


def test_eu_cap_client_y_catalogo():
    """Sprint 14 · S14.2 · cliente EU CAP importable + indicadores definidos."""
    from etl.sources.agro.eu_cap import EUCAPClient, get_eu_cap_client, EU_CAP_INDICATORS
    client = get_eu_cap_client()
    assert isinstance(client, EUCAPClient)
    for k in ("agricultural_income", "land_use", "agricultural_prices"):
        assert k in EU_CAP_INDICATORS


def test_mapa_enesa_plan():
    """Sprint 14 · S14.3 · cliente MAPA + Plan ENESA estático funciona."""
    from etl.sources.agro.mapa_enesa import (
        MAPAENESAClient, get_mapa_enesa_client, ENESA_PLAN_2024,
    )
    client = get_mapa_enesa_client()
    assert isinstance(client, MAPAENESAClient)
    plan = client.get_enesa_plan(2024)
    assert plan["year"] == 2024
    assert plan["siniestralidad_global_pct"] > 100
    assert len(plan["lineas_principales"]) >= 5
    assert ENESA_PLAN_2024["presupuesto_subvenciones_eur"] > 0


def test_commodities_catalog_completo():
    """Sprint 14 · S14.4 · catálogo 40+ commodities con categorías válidas."""
    from etl.sources.commodities.catalog import COMMODITIES, CATEGORIES, list_commodities
    assert len(COMMODITIES) >= 35
    for c in COMMODITIES.values():
        assert c["category"] in CATEGORIES
        assert c["slug"] and c["name"]
    # Filtro por categoría
    grains = list_commodities("grains")
    assert all(c["category"] == "grains" for c in grains)
    assert len(grains) >= 5
    # Commodities clave deben estar
    for slug in (
        "wheat_cbot", "corn_cbot", "soybeans_cbot",
        "palm_oil_klu", "olive_oil_es", "milk_smp_eu",
        "sugar_ny", "cocoa_ny", "brent_crude",
        "natgas_ttf", "copper_lme", "gold_comex",
    ):
        assert slug in COMMODITIES, f"slug '{slug}' falta en catálogo"


def test_yahoo_client_importable():
    """YahooFinanceClient importable y construye sin red."""
    from etl.sources.commodities.prices import YahooFinanceClient, get_yahoo_client
    client = get_yahoo_client()
    assert isinstance(client, YahooFinanceClient)


def test_technical_indicators_calculo():
    """Indicadores técnicos: SMA, RSI, MACD en datos sintéticos."""
    from etl.sources.commodities.prices import technical_indicators
    # Serie creciente ⇒ RSI alto
    rising = [float(i) for i in range(1, 60)]
    ind_r = technical_indicators(rising)
    assert ind_r["sma20"] is not None
    assert ind_r["sma50"] is not None
    assert ind_r["rsi14"] is not None
    assert ind_r["rsi14"] > 70  # claramente sobrecomprado
    assert ind_r["macd"] is not None
    # Serie corta ⇒ todos None excepto n_obs
    ind_s = technical_indicators([1.0])
    assert ind_s["sma20"] is None
    assert ind_s["rsi14"] is None


def test_recipe_cost_calculator():
    """Recipe cost calculator · cálculos básicos + sensibilidad."""
    from etl.sources.commodities.recipe import compute_recipe_cost, sensitivity_analysis
    ingredients = [
        {"slug": "wheat_milling_euronext", "name": "Harina", "quantity": 0.6, "unit": "ton"},
        {"slug": "sugar_ny", "name": "Azúcar", "quantity": 0.2, "unit": "ton"},
        {"slug": "palm_oil_klu", "name": "Palma", "quantity": 0.1, "unit": "ton"},
    ]
    prices = {
        "wheat_milling_euronext": 220.0,
        "sugar_ny": 480.0,
        "palm_oil_klu": 950.0,
    }
    res = compute_recipe_cost(ingredients, prices)
    expected = 0.6 * 220 + 0.2 * 480 + 0.1 * 950
    assert abs(res["total_cost"] - expected) < 0.01
    assert len(res["breakdown"]) == 3
    assert all(b["pct_of_total"] is not None for b in res["breakdown"])
    assert res["missing_prices"] == []
    # Sensibilidad · palma debería tener impacto alto por precio unitario
    sens = sensitivity_analysis(ingredients, prices, shock_pct=10)
    assert sens["base_cost"] > 0
    assert len(sens["shocks"]) == 3
    # El primero (más impacto) debería ser palma o azúcar
    top = sens["shocks"][0]
    assert top["slug"] in {"palm_oil_klu", "sugar_ny", "wheat_milling_euronext"}


def test_recipe_cost_missing_price():
    """Si falta precio se reporta en missing_prices sin romper."""
    from etl.sources.commodities.recipe import compute_recipe_cost
    res = compute_recipe_cost(
        [{"slug": "wheat_cbot", "quantity": 1.0, "unit": "ton"}],
        prices={},
    )
    assert "wheat_cbot" in res["missing_prices"]
    assert res["total_cost"] == 0.0
    assert res["breakdown"][0]["line_cost"] is None


def test_commodities_seed_recipes():
    """Sprint 14 · S14.5 · seed JSON recetas con sectores válidos."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "commodities" / "recipes_seed.json"
    assert seed.exists()
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    for required in (
        "pan_blanco_industrial", "galleta_maria_industrial",
        "chocolate_negro_70", "pienso_vacuno",
    ):
        assert required in slugs
    # Cada ingrediente referencia un slug del catálogo
    from etl.sources.commodities.catalog import COMMODITIES
    for r in rows:
        for ing in r["ingredients"]:
            assert ing["slug"] in COMMODITIES, (
                f"receta '{r['slug']}' usa slug desconocido '{ing['slug']}'"
            )


def test_commodities_service_falla_cerrado_sin_engine():
    """Sin BD el servicio commodities devuelve estructuras vacías sin romper."""
    from etl.sources.commodities import service
    original = service._get_engine
    service._get_engine = lambda: None
    try:
        assert service.get_recipe("pan_blanco_industrial") is None
        assert service.list_recipes() == []
        assert service.get_snapshot_series("wheat_cbot") == []
        res = service.load_recipes_seed()
        assert res["loaded"] == 0
        assert "error" in res
        snap = service.snapshot_price("wheat_cbot", 220.0)
        assert snap["snapshot"] is False
    finally:
        service._get_engine = original


def test_migracion_0074_existe():
    """Migración 0074_commodity_recipes existe."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0074_commodity_recipes.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0074_commodity_recipes"' in src
    assert 'down_revision = "0073_housing_markets"' in src
    assert 'create_table' in src
    assert '"commodity_recipes"' in src
    assert '"commodity_price_snapshots"' in src


def test_agro_tools_registradas():
    """Tools agro registradas."""
    from agents.tools import ToolRegistry
    import agents.tools.agro_tools  # noqa: F401
    tools = ToolRegistry.list_tools()
    for name in ("fega_descargar_csv", "eu_cap_indicator", "mapa_news", "enesa_plan"):
        assert name in tools


def test_commodities_tools_registradas():
    """Tools commodities (Vesper-style) registradas."""
    from agents.tools import ToolRegistry
    import agents.tools.commodities_tools  # noqa: F401
    tools = ToolRegistry.list_tools()
    for name in (
        "commodity_catalog", "commodity_metadata",
        "commodity_price", "commodity_snapshot", "commodity_technical",
        "commodity_recipe_cost", "commodity_recipe_sensitivity",
        "commodity_recipe", "list_commodity_recipes",
    ):
        assert name in tools


def test_commodity_catalog_tool_filtro():
    """commodity_catalog filtra por categoría y rechaza categorías inválidas."""
    from agents.tools import ToolRegistry
    import agents.tools.commodities_tools  # noqa: F401
    fn = ToolRegistry.get("commodity_catalog")
    grains = fn(category="grains")
    assert grains["n_items"] >= 5
    assert all(c["category"] == "grains" for c in grains["items"])
    bad = fn(category="categoria_inventada")
    assert bad["n_items"] == 0
    assert "error" in bad and bad["error"]


def test_commodity_recipe_cost_tool_via_ingredients():
    """Tool commodity_recipe_cost calcula vía ingredientes directos."""
    from agents.tools import ToolRegistry
    import agents.tools.commodities_tools  # noqa: F401
    fn = ToolRegistry.get("commodity_recipe_cost")
    res = fn(
        ingredients=[
            {"slug": "wheat_cbot", "quantity": 1.0, "unit": "ton"},
            {"slug": "sugar_ny", "quantity": 0.2, "unit": "ton"},
        ],
        prices={"wheat_cbot": 200.0, "sugar_ny": 450.0},
    )
    assert abs(res["total_cost"] - (200 + 90)) < 0.01
    assert res["n_ingredients"] == 2


def test_eu_cap_tool_fallback():
    """eu_cap_indicator devuelve estructura consistente incluso si red falla."""
    from agents.tools import ToolRegistry
    import agents.tools.agro_tools  # noqa: F401
    fn = ToolRegistry.get("eu_cap_indicator")
    res = fn(indicator="agricultural_income", geo="ES", last_n_years=3)
    # Si no hay red el data vendrá vacío con error string
    assert "data" in res


# ── Sprint 15 · Turismo ──────────────────────────────────────────────

def test_ine_turismo_client_y_catalogo():
    """Sprint 15 · S15.1 · cliente INE turismo + catálogo series."""
    from etl.sources.tourism.ine_turismo import (
        INETurismoClient, get_ine_turismo_client, TURISMO_SERIES,
    )
    client = get_ine_turismo_client()
    assert isinstance(client, INETurismoClient)
    for k in ("llegadas_internacional", "pernoctaciones_hotelero", "gasto_turistico"):
        assert k in TURISMO_SERIES
        assert TURISMO_SERIES[k]["code"]
    # Indicador inválido devuelve error explícito
    res = client.get_indicador("no_existe_xyz", last_n=3)
    assert res["data"] == []
    assert "error" in res and res["error"]


def test_eurostat_tourism_client():
    """Sprint 15 · S15.2 · cliente Eurostat tourism importable."""
    from etl.sources.tourism.eurostat_tourism import (
        EurostatTourismClient, get_eurostat_tourism_client, TOURISM_INDICATORS,
    )
    client = get_eurostat_tourism_client()
    assert isinstance(client, EurostatTourismClient)
    for k in ("noches_total", "llegadas_alojamientos", "capacidad_alojamientos"):
        assert k in TOURISM_INDICATORS


def test_aena_puertos_catalogo():
    """Sprint 15 · S15.3 · catálogo AENA + cruceros consistente."""
    from etl.sources.tourism.aena_puertos import (
        AENA_PAX_2024, CRUISE_PAX_2024,
        list_aena_traffic, get_aena_airport,
        list_cruise_ports, get_cruise_port,
    )
    assert len(AENA_PAX_2024) >= 8
    # Top 3 por orden coherente
    top3 = list_aena_traffic(top_n=3)
    assert top3[0]["slug"] == "madrid_barajas"
    assert top3[1]["slug"] == "barcelona_prat"
    assert top3[2]["slug"] == "palma_mallorca"
    # Cruceros
    ports = list_cruise_ports()
    assert ports[0]["slug"] == "barcelona"
    assert get_aena_airport("madrid_barajas")["rank"] == 1
    assert get_cruise_port("palma")["ccaa"] == "Illes Balears"
    assert get_aena_airport("no_existe") is None


def test_tourism_seed_valido():
    """Sprint 15 · S15.4 · seed JSON destinos turísticos."""
    import json
    from pathlib import Path
    seed = Path(__file__).parent.parent.parent / "data" / "tourism" / "destinations_seed.json"
    assert seed.exists()
    rows = json.loads(seed.read_text(encoding="utf-8"))
    slugs = {r["slug"] for r in rows}
    for required in (
        "barcelona_ciudad", "palma_mallorca", "madrid_capital",
        "ibiza", "tenerife_sur", "san_sebastian", "lanzarote_isla",
    ):
        assert required in slugs, f"slug '{required}' falta"
    for r in rows:
        assert r["slug"] and r["name"] and r["ccaa"]
        assert r["kind"] in {"urbano", "costa", "rural", "cultural", "mixto", "isla"}
        assert r["regulacion_pisos_turisticos"] in {
            "permisivo", "restringido", "moratoria", "prohibido_centro"
        }
        assert r["presion_turistica"] in {"bajo", "medio", "alto", "critico"}


def test_tourism_service_falla_cerrado_sin_engine():
    """Sin BD el servicio devuelve estructuras vacías."""
    from etl.sources.tourism import destinations_service as svc
    original = svc._get_engine
    svc._get_engine = lambda: None
    try:
        assert svc.get_destination("barcelona_ciudad") is None
        assert svc.list_destinations() == []
        assert svc.pressure_alerts() == []
        res = svc.load_destinations_seed()
        assert res["loaded"] == 0
        assert "error" in res
    finally:
        svc._get_engine = original


def test_tourism_migracion_0075_existe():
    """Migración 0075_tourism_destinations existe."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0075_tourism_destinations.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0075_tourism_destinations"' in src
    assert 'down_revision = "0074_commodity_recipes"' in src
    assert 'create_table' in src and '"tourism_destinations"' in src


def test_turismo_tools_registradas():
    """Sprint 15 · S15.5 · tools turismo registradas."""
    from agents.tools import ToolRegistry
    import agents.tools.turismo_tools  # noqa: F401
    tools = ToolRegistry.list_tools()
    for name in (
        "ine_turismo_serie", "eurostat_tourism",
        "aena_top_airports", "aena_airport", "cruise_ports",
        "tourism_destination", "list_tourism_destinations", "tourism_pressure_alerts",
    ):
        assert name in tools, f"tool '{name}' no registrada"


def test_aena_tools_estaticas_funcionan():
    """aena_top_airports + cruise_ports funcionan sin BD ni red."""
    from agents.tools import ToolRegistry
    import agents.tools.turismo_tools  # noqa: F401
    r1 = ToolRegistry.get("aena_top_airports")(top_n=5)
    assert r1["n_items"] == 5
    assert r1["items"][0]["rank"] == 1
    r2 = ToolRegistry.get("cruise_ports")()
    assert r2["n_items"] >= 5
    r3 = ToolRegistry.get("aena_airport")(slug="madrid_barajas")
    assert r3["name"] == "Adolfo Suárez Madrid-Barajas"
    r4 = ToolRegistry.get("aena_airport")(slug="no_existe")
    assert "error" in r4


def test_tourism_tools_sin_bd():
    """tourism_destination + list + pressure_alerts sin BD devuelven error consistente."""
    from agents.tools import ToolRegistry
    import agents.tools.turismo_tools  # noqa: F401
    from etl.sources.tourism import destinations_service as svc

    original = svc._get_engine
    svc._get_engine = lambda: None
    try:
        r1 = ToolRegistry.get("tourism_destination")(slug="barcelona_ciudad")
        assert "error" in r1
        r2 = ToolRegistry.get("list_tourism_destinations")(presion_min="alto")
        assert r2["n_items"] == 0
        r3 = ToolRegistry.get("tourism_pressure_alerts")()
        assert r3["n_items"] == 0
    finally:
        svc._get_engine = original


def test_ine_turismo_tool_indicador_invalido():
    """ine_turismo_serie con indicador inválido devuelve error explícito."""
    from agents.tools import ToolRegistry
    import agents.tools.turismo_tools  # noqa: F401
    fn = ToolRegistry.get("ine_turismo_serie")
    res = fn(indicator="inventado_xyz", last_n=3)
    assert res["data"] == []
    assert "error" in res and res["error"]


# ── Forecast µservice client · cliente HTTP + fallback local ────────

def test_forecast_client_fallback_sin_url(monkeypatch):
    """Sin FORECAST_SERVICE_URL · usa naive_drift local idéntico al stub."""
    monkeypatch.delenv("FORECAST_SERVICE_URL", raising=False)
    from etl.sources.commodities import forecast_client
    closes = [10.0 + i * 0.1 for i in range(60)]
    res = forecast_client.forecast(closes, horizon=14)
    assert res["model"] == "naive_drift"
    assert res["source"] == "local_fallback"
    assert len(res["forecast"]) == 14
    p0 = res["forecast"][0]
    for k in ("date", "value", "lower_80", "upper_80", "lower_95", "upper_95"):
        assert k in p0
    # Bandas 95% más anchas que 80%
    assert (p0["upper_95"] - p0["lower_95"]) >= (p0["upper_80"] - p0["lower_80"])


def test_forecast_client_closes_insuficiente(monkeypatch):
    """closes con < 10 obs · devuelve estructura con warning explícito."""
    monkeypatch.delenv("FORECAST_SERVICE_URL", raising=False)
    from etl.sources.commodities.forecast_client import forecast
    res = forecast([1.0, 2.0, 3.0], horizon=5)
    assert res["model"] == "naive_drift"
    assert res["forecast"] == []
    assert res["warning"]


def test_forecast_client_health_no_configurado(monkeypatch):
    """health() sin FORECAST_SERVICE_URL devuelve status not_configured."""
    monkeypatch.delenv("FORECAST_SERVICE_URL", raising=False)
    from etl.sources.commodities.forecast_client import health, is_service_configured
    assert is_service_configured() is False
    h = health()
    assert h["status"] == "not_configured"
    assert h["configured"] is False


def test_forecast_uservice_archivos_existen():
    """El µservicio tiene la estructura completa: main + Dockerfile + reqs."""
    from pathlib import Path
    root = Path(__file__).parent.parent.parent / "apps" / "forecast-service"
    assert root.exists()
    main_py = root / "main.py"
    assert main_py.exists()
    assert (root / "Dockerfile").exists()
    assert (root / "requirements.txt").exists()
    # Sintaxis válida
    src = main_py.read_text(encoding="utf-8")
    compile(src, str(main_py), "exec")
    assert "@app.post" in src and "/forecast" in src
    assert "@app.get" in src and "/health" in src
    assert "naive_drift" in src and "_prophet_forecast" in src
    assert "_auto_arima_forecast" in src


def test_commodity_forecast_endpoints_registrados():
    """Endpoints /api/v1/commodities/{slug}/forecast + /forecast/health activos."""
    import os
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/commodities/{slug}/forecast" in paths
    assert "/api/v1/commodities/forecast/health" in paths


def test_forecast_client_genera_serie_creciente_drift_positivo():
    """Sanity: serie con drift positivo debe predecir valores crecientes."""
    from etl.sources.commodities.forecast_client import _local_naive_drift
    from datetime import date
    closes = [10.0 + i for i in range(30)]
    res = _local_naive_drift(closes, horizon=10, start=date(2026, 1, 1))
    assert res["forecast"][0]["value"] > closes[-1]
    assert res["forecast"][-1]["value"] > res["forecast"][0]["value"]


# ── Briefing extended · S6 + tracker S7-S15 ──────────────────────────

def test_briefing_extended_endpoint_registrado():
    """Endpoint /api/v1/sectores/{id}/briefing-extended activo."""
    import os
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/sectores/{sector_id}/briefing-extended" in paths


def test_briefing_extended_tool_registrada():
    """Brain tool sector_briefing_extended registrada · original también."""
    from agents.tools import ToolRegistry
    import agents.tools.sector_briefing_tools  # noqa: F401
    tools = ToolRegistry.list_tools()
    assert "sector_briefing_extended" in tools
    assert "sector_briefing" in tools


def test_tracker_functions_mapeo_completo():
    """build_sector_tracker · 9 sectores Politeia + 5 alias mapeados."""
    from agents.brain.pipelines.sector_briefing_extended import TRACKER_FUNCTIONS
    for s in (
        "banca", "farma", "defensa", "vivienda", "telecom",
        "infraestructuras", "turismo", "agroalimentario", "energia",
    ):
        assert s in TRACKER_FUNCTIONS, f"sector '{s}' falta"
    for alias in (
        "salud", "inmobiliario", "telecomunicaciones", "transporte", "agricultura",
    ):
        assert alias in TRACKER_FUNCTIONS, f"alias '{alias}' falta"


def test_tracker_sector_inexistente_no_rompe():
    """Sector desconocido devuelve estructura warning, sin exception."""
    from agents.brain.pipelines.sector_briefing_extended import build_sector_tracker
    res = build_sector_tracker("sector_inexistente_xyz")
    assert res["key"] == "none"
    assert "warning" in res
    assert res["kpis"] == []
    assert res["items"] == []


def test_tracker_falla_cerrado_sin_bd():
    """Tracker S7-S15 sin BD devuelve estructura limpia sin crash."""
    from etl.sources.regulatory import service as svc_reg
    original = svc_reg._get_engine
    svc_reg._get_engine = lambda: None
    try:
        from agents.brain.pipelines.sector_briefing_extended import build_sector_tracker
        res = build_sector_tracker("banca")
        assert res["key"] == "regulatory_obligations"
        assert isinstance(res.get("kpis"), list)
        assert res.get("items") == []
    finally:
        svc_reg._get_engine = original


def test_briefing_extended_estructura_completa():
    """build_briefing_extended devuelve briefing base + tracker + sources."""
    from etl.sources.regulatory import service as svc_reg
    original = svc_reg._get_engine
    svc_reg._get_engine = lambda: None
    try:
        from agents.brain.pipelines.sector_briefing_extended import build_briefing_extended
        res = build_briefing_extended("banca", days_back=7, use_llm=False)
        assert "sources" in res
        assert "tracker" in res
        assert res["briefing_version"] == "extended_v1"
        assert res["tracker"]["key"] == "regulatory_obligations"
        assert "tracker" in res["sources"]
    finally:
        svc_reg._get_engine = original


def test_alerts_migration_0076_existe():
    """Migración 0076_commodity_alerts existe y declara tabla."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0076_commodity_alerts.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'revision = "0076_commodity_alerts"' in src
    assert 'down_revision = "0075_tourism_destinations"' in src
    assert '"commodity_alerts"' in src
    assert '"commodity_alert_events"' in src


def test_alerts_service_falla_cerrado_sin_engine():
    """CRUD sin BD devuelve estructuras vacías sin romper."""
    from etl.sources.commodities import alerts_service
    original = alerts_service._get_engine
    alerts_service._get_engine = lambda: None
    try:
        assert alerts_service.list_alerts() == []
        assert alerts_service.list_alerts(user_id="x") == []
        assert alerts_service.get_alert("x") is None
        assert alerts_service.update_alert("x", active=False) is None
        assert alerts_service.delete_alert("x") is False
        assert alerts_service.list_events() == []
        res = alerts_service.create_alert(
            user_id="x", commodity_slug="wheat_cbot",
            kind="price_above", threshold=10.0, channels=["inapp"],
        )
        assert res.get("error")
    finally:
        alerts_service._get_engine = original


def test_alerts_evaluate_condition_price_above():
    """_evaluate_condition · price_above dispara solo si supera umbral."""
    from etl.sources.commodities.alerts_service import _evaluate_condition
    alert = {"kind": "price_above", "threshold": 100}
    ok, val = _evaluate_condition(alert, last_price=110, change_pct=None)
    assert ok and val == 110
    ok, val = _evaluate_condition(alert, last_price=90, change_pct=None)
    assert not ok and val is None


def test_alerts_evaluate_condition_price_below():
    """price_below dispara si precio cae bajo umbral."""
    from etl.sources.commodities.alerts_service import _evaluate_condition
    alert = {"kind": "price_below", "threshold": 50}
    ok, val = _evaluate_condition(alert, last_price=40, change_pct=None)
    assert ok and val == 40
    ok, val = _evaluate_condition(alert, last_price=60, change_pct=None)
    assert not ok


def test_alerts_evaluate_condition_change_pct():
    """change_pct dispara si la variación supera el umbral (con signo)."""
    from etl.sources.commodities.alerts_service import _evaluate_condition
    # Umbral positivo · dispara con cambios crecientes
    alert = {"kind": "change_pct", "threshold": 5.0}
    ok, _ = _evaluate_condition(alert, last_price=100, change_pct=6.5)
    assert ok
    ok, _ = _evaluate_condition(alert, last_price=100, change_pct=4.0)
    assert not ok
    # Umbral negativo · dispara con caídas
    alert = {"kind": "change_pct", "threshold": -5.0}
    ok, _ = _evaluate_condition(alert, last_price=100, change_pct=-6.0)
    assert ok
    ok, _ = _evaluate_condition(alert, last_price=100, change_pct=-3.0)
    assert not ok


def test_alerts_cooldown_funciona():
    """_in_cooldown · alerta recién disparada está en cooldown."""
    from etl.sources.commodities.alerts_service import _in_cooldown
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    # Recién disparada · cooldown 60min default
    alert = {
        "last_triggered_at": (now - timedelta(minutes=10)).isoformat(),
        "cooldown_minutes": 60,
    }
    assert _in_cooldown(alert) is True
    # Disparada hace 2h · ya fuera de cooldown
    alert["last_triggered_at"] = (now - timedelta(hours=2)).isoformat()
    assert _in_cooldown(alert) is False
    # Nunca disparada
    alert["last_triggered_at"] = None
    assert _in_cooldown(alert) is False


def test_alerts_evaluate_all_sin_alertas():
    """evaluate_all sin alertas activas no peta y devuelve totales 0."""
    from etl.sources.commodities import alerts_service
    original = alerts_service._get_engine
    alerts_service._get_engine = lambda: None
    try:
        res = alerts_service.evaluate_all(dry_run=True)
        assert res["evaluated"] == 0
        assert res["triggered"] == 0
        assert res["events"] == []
    finally:
        alerts_service._get_engine = original


def test_alerts_endpoints_registrados():
    """Endpoints CRUD + evaluate + events activos en main.py."""
    import os
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    for p in (
        "/api/v1/commodities/alerts",
        "/api/v1/commodities/alerts/{alert_id}",
        "/api/v1/commodities/alerts/evaluate",
        "/api/v1/commodities/alerts-events/list",
        "/api/v1/commodities/alerts-events/{event_id}/read",
    ):
        assert p in paths, f"endpoint '{p}' no registrado"


def test_alerts_worker_script_invocable():
    """El worker python -m etl.workers.commodity_alerts_worker es importable."""
    from pathlib import Path
    p = Path(__file__).parent.parent.parent / "etl" / "workers" / "commodity_alerts_worker.py"
    assert p.exists()
    src = p.read_text(encoding="utf-8")
    compile(src, str(p), "exec")
    assert "def main" in src
    assert "--loop" in src and "--dry-run" in src


def test_alerts_notify_email_sin_resend_key(monkeypatch):
    """_send_email sin RESEND_API_KEY devuelve 'skipped'."""
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    from etl.sources.commodities.alerts_service import _send_email
    alert = {
        "user_id": "user@example.com", "commodity_slug": "wheat_cbot",
        "kind": "price_above", "threshold": 100,
    }
    res = _send_email(alert, trigger_value=110)
    assert res == "skipped"


def test_briefing_extended_alias_resuelven_tracker_correcto():
    """Alias resuelven al tracker correcto · todos los servicios sin BD."""
    from agents.brain.pipelines.sector_briefing_extended import build_sector_tracker
    from etl.sources.pharma import service as svc_pharma
    from etl.sources.housing import markets_service as svc_house
    from etl.sources.telecom import operators_service as svc_tel
    from etl.sources.infra import service as svc_infra

    originals: list[tuple] = []
    for mod in (svc_pharma, svc_house, svc_tel, svc_infra):
        originals.append((mod, mod._get_engine))
        mod._get_engine = lambda: None  # type: ignore
    try:
        pairs = [
            ("salud", "pharma_signals"),
            ("inmobiliario", "housing_markets"),
            ("telecomunicaciones", "telecom_operators"),
            ("transporte", "infra_projects"),
            ("agricultura", "agro_indicators"),
        ]
        for alias, expected_key in pairs:
            res = build_sector_tracker(alias)
            assert res["key"] == expected_key, (
                f"alias '{alias}' → debe ser '{expected_key}', got '{res['key']}'"
            )
    finally:
        for mod, original in originals:
            mod._get_engine = original  # type: ignore


# ── Rule engine multi-condición + SSE ────────────────────────────────

def test_rule_engine_validate_basico():
    """validate_rule acepta reglas válidas y rechaza inválidas."""
    from etl.sources.commodities.rule_engine import validate_rule, RuleValidationError
    ok = {
        "logic": "AND",
        "conditions": [
            {"slug": "wheat_cbot", "op": "change_pct_gte", "value": 5},
            {"slug": "corn_cbot", "op": "change_pct_lte", "value": -3},
        ],
    }
    validate_rule(ok)
    import pytest
    with pytest.raises(RuleValidationError):
        validate_rule({"logic": "XOR", "conditions": []})
    with pytest.raises(RuleValidationError):
        validate_rule({"logic": "AND", "conditions": []})
    with pytest.raises(RuleValidationError):
        validate_rule({"logic": "AND", "conditions": [{"slug": "x", "op": "invalid", "value": 1}]})
    with pytest.raises(RuleValidationError):
        validate_rule({"logic": "AND", "conditions": [{"slug": "x", "op": "price_gt", "value": {"foo": "bar"}}]})


def test_rule_engine_evaluate_and():
    """evaluate_rule AND · todas las condiciones deben pasar."""
    from etl.sources.commodities.rule_engine import evaluate_rule
    rule = {
        "logic": "AND",
        "conditions": [
            {"slug": "a", "op": "price_gt", "value": 100},
            {"slug": "b", "op": "change_pct_lte", "value": -3},
        ],
    }
    def resolver(slug):
        return {
            "a": {"last_price": 110},
            "b": {"change_pct": -5},
        }.get(slug)
    res = evaluate_rule(rule, resolver)
    assert res["triggered"] is True
    # Si una falla, AND no dispara
    res2 = evaluate_rule(rule, lambda s: {"a": {"last_price": 90}, "b": {"change_pct": -5}}.get(s))
    assert res2["triggered"] is False


def test_rule_engine_evaluate_or():
    """evaluate_rule OR · basta con una condición que pase."""
    from etl.sources.commodities.rule_engine import evaluate_rule
    rule = {
        "logic": "OR",
        "conditions": [
            {"slug": "a", "op": "price_gt", "value": 100},
            {"slug": "b", "op": "price_gt", "value": 200},
        ],
    }
    res = evaluate_rule(
        rule,
        lambda s: {"a": {"last_price": 50}, "b": {"last_price": 250}}.get(s),
    )
    assert res["triggered"] is True


def test_rule_engine_evaluate_snapshot_ausente():
    """Snapshot None → condición False sin excepción."""
    from etl.sources.commodities.rule_engine import evaluate_rule
    rule = {
        "logic": "AND",
        "conditions": [{"slug": "missing", "op": "price_gt", "value": 100}],
    }
    res = evaluate_rule(rule, lambda s: None)
    assert res["triggered"] is False
    assert res["details"][0]["snapshot_present"] is False


def test_rule_engine_slugs_in_rule():
    """slugs_in_rule devuelve únicos preservando orden."""
    from etl.sources.commodities.rule_engine import slugs_in_rule
    rule = {
        "logic": "OR",
        "conditions": [
            {"slug": "wheat_cbot", "op": "price_gt", "value": 1},
            {"slug": "corn_cbot", "op": "price_lt", "value": 1},
            {"slug": "wheat_cbot", "op": "rsi_gt", "value": 70},
        ],
    }
    assert slugs_in_rule(rule) == ["wheat_cbot", "corn_cbot"]


def test_rule_engine_operadores_completos():
    """6 operadores cubiertos."""
    from etl.sources.commodities.rule_engine import evaluate_rule, VALID_OPERATORS
    assert VALID_OPERATORS == {
        "price_gt", "price_lt",
        "change_pct_gte", "change_pct_lte",
        "rsi_gt", "rsi_lt",
    }
    snap = {"last_price": 100, "change_pct": 5, "rsi_14": 72}
    cases = [
        ("price_gt", 50, True),
        ("price_lt", 50, False),
        ("change_pct_gte", 4, True),
        ("change_pct_lte", 4, False),
        ("rsi_gt", 70, True),
        ("rsi_lt", 70, False),
    ]
    for op, value, expected in cases:
        rule = {"logic": "AND", "conditions": [{"slug": "x", "op": op, "value": value}]}
        res = evaluate_rule(rule, lambda s: snap)
        assert res["triggered"] is expected, f"op={op} value={value} esperaba {expected}"


def test_alerts_create_alert_rule_invalida_no_toca_bd():
    """create_alert con rule_definition mal formada devuelve error sin INSERT."""
    from etl.sources.commodities import alerts_service
    original = alerts_service._get_engine
    alerts_service._get_engine = lambda: object()  # placeholder · validamos antes
    try:
        res = alerts_service.create_alert(
            user_id="user@test.com",
            rule_definition={"logic": "XOR", "conditions": []},
            channels=["inapp"],
        )
        assert res.get("error")
        assert "rule_definition inválida" in res["error"]
    finally:
        alerts_service._get_engine = original


def test_alerts_migration_0077_existe():
    """Migración 0077 añade rule_definition + rule_name."""
    from pathlib import Path
    mig = (
        Path(__file__).parent.parent.parent
        / "db" / "migrations" / "versions" / "0077_commodity_alerts_rule_engine.py"
    )
    assert mig.exists()
    src = mig.read_text(encoding="utf-8")
    assert 'down_revision = "0076_commodity_alerts"' in src
    assert "rule_definition" in src
    assert "rule_name" in src


def test_sse_stream_endpoint_registrado():
    """Endpoint SSE /alerts-events/stream activo en main.py."""
    import os
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/commodities/alerts-events/stream" in paths


def test_sse_proxy_route_exists_frontend():
    """Frontend proxy SSE existe + sintaxis correcta."""
    from pathlib import Path
    p = (
        Path(__file__).parent.parent.parent
        / "apps" / "visual-oscar" / "app" / "api" / "commodities"
        / "alerts-events" / "stream" / "route.ts"
    )
    assert p.exists()
    src = p.read_text(encoding="utf-8")
    assert "EventSource" not in src  # esto es server-side proxy
    assert "force-dynamic" in src
    assert "text/event-stream" in src


# ── Snapshot warmer + cooldown adaptativo + RuleBuilder ──────────────

def test_snapshot_warmer_cache_basico(monkeypatch):
    """warm_snapshots cachea por TTL · resolve_snapshot sirve desde cache."""
    from etl.sources.commodities import snapshot_warmer
    snapshot_warmer.clear_cache()

    # Mockear fetch para evitar red
    calls = {"n": 0}
    def fake_fetch(slug):
        calls["n"] += 1
        return {"slug": slug, "last_price": 100.0, "rsi_14": 50}
    monkeypatch.setattr(snapshot_warmer, "_fetch_snapshot_uncached", fake_fetch)

    # Primera pasada · 2 fetches
    out = snapshot_warmer.warm_snapshots(["a", "b"])
    assert calls["n"] == 2
    assert out["a"]["last_price"] == 100.0

    # Segunda pasada · ningún fetch nuevo (cache fresh)
    out2 = snapshot_warmer.warm_snapshots(["a", "b"])
    assert calls["n"] == 2
    assert out2["a"]["last_price"] == 100.0

    # force=True invalida cache
    snapshot_warmer.warm_snapshots(["a"], force=True)
    assert calls["n"] == 3


def test_snapshot_warmer_resolve_on_demand(monkeypatch):
    """resolve_snapshot fetch si miss, cache si hit."""
    from etl.sources.commodities import snapshot_warmer
    snapshot_warmer.clear_cache()
    calls = {"n": 0}
    monkeypatch.setattr(
        snapshot_warmer, "_fetch_snapshot_uncached",
        lambda s: (calls.__setitem__("n", calls["n"] + 1), {"slug": s, "last_price": 1.0})[1],
    )
    r1 = snapshot_warmer.resolve_snapshot("x")
    r2 = snapshot_warmer.resolve_snapshot("x")
    assert calls["n"] == 1
    assert r1["last_price"] == r2["last_price"] == 1.0


def test_snapshot_warmer_dedup_slugs(monkeypatch):
    """warm_snapshots deduplica slugs duplicados."""
    from etl.sources.commodities import snapshot_warmer
    snapshot_warmer.clear_cache()
    calls = {"n": 0}
    monkeypatch.setattr(
        snapshot_warmer, "_fetch_snapshot_uncached",
        lambda s: (calls.__setitem__("n", calls["n"] + 1), {"slug": s, "last_price": 1.0})[1],
    )
    snapshot_warmer.warm_snapshots(["a", "a", "b", "a", "b"])
    assert calls["n"] == 2  # solo a y b


def test_snapshot_warmer_cache_stats():
    """cache_stats reporta entradas total/fresh/stale."""
    from etl.sources.commodities import snapshot_warmer
    snapshot_warmer.clear_cache()
    stats = snapshot_warmer.cache_stats()
    assert stats["total_entries"] == 0
    assert stats["fresh_entries"] == 0


def test_adaptive_cooldown_bucket_for_sigma():
    """bucket_for_sigma · clasificación correcta de sigma %."""
    from etl.sources.commodities.adaptive_cooldown import bucket_for_sigma
    assert bucket_for_sigma(0.3) == (4.0, "very_low")
    assert bucket_for_sigma(1.0) == (2.0, "low")
    assert bucket_for_sigma(2.0) == (1.0, "medium")
    assert bucket_for_sigma(4.0) == (0.5, "high")
    assert bucket_for_sigma(6.0) == (0.33, "very_high")


def test_adaptive_cooldown_sin_volatilidad(monkeypatch):
    """compute_adaptive_cooldown sin histórico → fell_back=True con base."""
    from etl.sources.commodities import adaptive_cooldown
    adaptive_cooldown.clear_volatility_cache()
    monkeypatch.setattr(adaptive_cooldown, "compute_volatility", lambda s: None)
    res = adaptive_cooldown.compute_adaptive_cooldown("wheat_cbot", base_minutes=60)
    assert res["adjusted_minutes"] == 60
    assert res["fell_back"] is True
    assert res["multiplier"] == 1.0


def test_adaptive_cooldown_ajusta_segun_sigma(monkeypatch):
    """Con sigma alta, cooldown se reduce. Con sigma baja, se alarga."""
    from etl.sources.commodities import adaptive_cooldown
    adaptive_cooldown.clear_volatility_cache()
    # σ baja → cooldown × 4 (= 240min)
    monkeypatch.setattr(adaptive_cooldown, "compute_volatility", lambda s: 0.3)
    r_low = adaptive_cooldown.compute_adaptive_cooldown("x", base_minutes=60)
    assert r_low["adjusted_minutes"] == 240
    assert r_low["bucket"] == "very_low"
    # σ alta → cooldown × 0.5 = 30min
    monkeypatch.setattr(adaptive_cooldown, "compute_volatility", lambda s: 4.0)
    r_hi = adaptive_cooldown.compute_adaptive_cooldown("x", base_minutes=60)
    assert r_hi["adjusted_minutes"] == 30
    assert r_hi["bucket"] == "high"


def test_adaptive_cooldown_multi_slug_usa_mas_volatil(monkeypatch):
    """En regla con varios slugs, usa el de MAYOR sigma (más conservador)."""
    from etl.sources.commodities import adaptive_cooldown
    adaptive_cooldown.clear_volatility_cache()
    sigmas = {"calm": 0.3, "volatile": 6.5}
    monkeypatch.setattr(adaptive_cooldown, "compute_volatility", lambda s: sigmas.get(s))
    res = adaptive_cooldown.compute_adaptive_cooldown(["calm", "volatile"], base_minutes=60)
    assert res["slug_used"] == "volatile"
    assert res["bucket"] == "very_high"


def test_adaptive_cooldown_clamp_min_max(monkeypatch):
    """Resultado siempre dentro de [MIN, MAX]."""
    from etl.sources.commodities import adaptive_cooldown
    adaptive_cooldown.clear_volatility_cache()
    # Base alto + multiplicador bajo → no menos de MIN_COOLDOWN_MIN
    monkeypatch.setattr(adaptive_cooldown, "compute_volatility", lambda s: 8.0)
    r = adaptive_cooldown.compute_adaptive_cooldown("x", base_minutes=10)
    assert r["adjusted_minutes"] >= adaptive_cooldown.MIN_COOLDOWN_MIN
    # Base muy alto + multiplicador 4 → no más de MAX
    monkeypatch.setattr(adaptive_cooldown, "compute_volatility", lambda s: 0.3)
    r2 = adaptive_cooldown.compute_adaptive_cooldown("x", base_minutes=600)
    assert r2["adjusted_minutes"] <= adaptive_cooldown.MAX_COOLDOWN_MIN


def test_in_cooldown_adaptive_disabled_via_metadata():
    """metadata.adaptive_cooldown=False usa base sin ajustar."""
    from etl.sources.commodities.alerts_service import _adaptive_cooldown_for_alert
    alert = {
        "cooldown_minutes": 60,
        "commodity_slug": "wheat_cbot",
        "metadata_payload": {"adaptive_cooldown": False},
    }
    info = _adaptive_cooldown_for_alert(alert)
    assert info["adjusted_minutes"] == 60
    assert info["bucket"] == "disabled"


def test_rule_builder_ui_page_exists():
    """Página RuleBuilder existe y declara los elementos clave."""
    from pathlib import Path
    p = (
        Path(__file__).parent.parent.parent
        / "apps" / "visual-oscar" / "app" / "commodities" / "alerts"
        / "rule-builder" / "page.tsx"
    )
    assert p.exists()
    src = p.read_text(encoding="utf-8")
    assert "rule_definition" in src
    assert "adaptive_cooldown" in src
    # Los 6 operadores soportados
    for op in (
        "price_gt", "price_lt",
        "change_pct_gte", "change_pct_lte",
        "rsi_gt", "rsi_lt",
    ):
        assert op in src
