"""
Tests para capas 2, 3, 5, 6, 7, 8 y 9 del motor de analisis.
Todos usan OllamaEngine mockeado.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from agents.analysis.extractor import ExtractionResult, IntelSignal, NamedEntities
from agents.analysis.ollama_engine import OllamaEngine
from agents.analysis.strategic_analyzer import (
    StrategicAnalyzer,
    StrategicAssessment,
    RiskItem,
    ActorTrend,
    Opportunity,
)


def make_engine(json_return=None, text_return="Analisis completado."):
    engine = MagicMock(spec=OllamaEngine)
    engine.extract_json = AsyncMock(return_value=json_return or {})
    engine.generate = AsyncMock(return_value=text_return)
    engine.model_for_role = MagicMock(return_value="gemma3:12b")
    engine.market_id = "ES"
    engine.sector_ids = ["PARTY"]
    return engine


# ---------------------------------------------------------------------------
# StrategicAssessment
# ---------------------------------------------------------------------------

class TestStrategicAssessment:
    def _make_assessment(self, risks=None) -> StrategicAssessment:
        return StrategicAssessment(
            actor="Pedro Sanchez",
            risks=risks or [],
            trend=ActorTrend(direction="estable"),
        )

    def test_top_risks_sorted_by_severity(self):
        risks = [
            RiskItem("reputacional", "desc1", "bajo"),
            RiskItem("judicial", "desc2", "critico"),
            RiskItem("electoral", "desc3", "alto"),
        ]
        assessment = self._make_assessment(risks)
        top = assessment.top_risks(2)
        assert top[0].severity == "critico"
        assert top[1].severity == "alto"

    def test_has_critical_risk_true(self):
        risks = [RiskItem("judicial", "imputacion", "critico")]
        assessment = self._make_assessment(risks)
        assert assessment.has_critical_risk() is True

    def test_has_critical_risk_false(self):
        risks = [RiskItem("reputacional", "polemica", "medio")]
        assessment = self._make_assessment(risks)
        assert assessment.has_critical_risk() is False

    def test_top_risks_empty(self):
        assessment = self._make_assessment()
        assert assessment.top_risks(3) == []


# ---------------------------------------------------------------------------
# StrategicAnalyzer
# ---------------------------------------------------------------------------

class TestStrategicAnalyzer:
    @pytest.mark.asyncio
    async def test_analyze_returns_assessment(self):
        engine = make_engine(
            json_return={
                "posicion": "En declive",
                "tendencia": {"direccion": "descendente", "drivers": ["escandalo"], "confianza": 0.7},
                "riesgos": [],
                "oportunidades": [],
            },
            text_return="Resumen ejecutivo del actor.",
        )
        analyzer = StrategicAnalyzer(engine)
        result = await analyzer.analyze(actor="Pedro Sanchez")

        assert result.actor == "Pedro Sanchez"
        assert isinstance(result.executive_summary, str)

    @pytest.mark.asyncio
    async def test_analyze_with_signals(self):
        signals = [
            IntelSignal("declaracion", "alta", actors=["Pedro Sanchez"], summary="Anuncio fiscal")
        ]
        engine = make_engine()
        analyzer = StrategicAnalyzer(engine)
        result = await analyzer.analyze(actor="Pedro Sanchez", signals=signals)

        assert result.context_signals == 1

    @pytest.mark.asyncio
    async def test_analyze_parses_risks(self):
        engine = make_engine(json_return={
            "riesgos": [
                {
                    "categoria": "judicial",
                    "descripcion": "Investigacion abierta",
                    "severidad": "critico",
                    "probabilidad": 0.7,
                    "mitigacion": "No aplica",
                }
            ]
        })
        analyzer = StrategicAnalyzer(engine)
        result = await analyzer.analyze(actor="Test Actor")
        assert len(result.risks) == 1
        assert result.risks[0].severity == "critico"

    @pytest.mark.asyncio
    async def test_analyze_parses_opportunities(self):
        engine = make_engine(json_return={
            "oportunidades": [
                {
                    "tipo": "alianza",
                    "descripcion": "Alianza con Ciudadanos",
                    "actores": ["Ciudadanos"],
                    "ventana": "corto",
                }
            ]
        })
        analyzer = StrategicAnalyzer(engine)
        result = await analyzer.analyze(actor="PP")
        assert len(result.opportunities) == 1
        assert result.opportunities[0].type_ == "alianza"

    def test_format_signals_empty(self):
        assert "Sin señales" in StrategicAnalyzer._format_signals([])

    def test_format_signals_with_data(self):
        signals = [IntelSignal("declaracion", "alta", summary="Prueba", actors=["Sanchez"])]
        text = StrategicAnalyzer._format_signals(signals)
        assert "ALTA" in text
        assert "Prueba" in text


# ---------------------------------------------------------------------------
# SynthesisEngine
# ---------------------------------------------------------------------------

class TestSynthesisEngine:
    @pytest.mark.asyncio
    async def test_morning_briefing_no_assessments(self):
        from agents.analysis.synthesis_engine import SynthesisEngine
        engine = make_engine(text_return="Briefing de prueba.")
        synth = SynthesisEngine(engine)
        briefing = await synth.morning_briefing()
        assert "morning_briefing" == briefing.briefing_type
        assert isinstance(briefing.title, str)

    @pytest.mark.asyncio
    async def test_morning_briefing_with_assessment(self):
        from agents.analysis.synthesis_engine import SynthesisEngine
        assessment = StrategicAssessment(
            actor="Feijoo",
            executive_summary="Actor estable",
            risks=[RiskItem("reputacional", "polemica", "medio")],
            trend=ActorTrend(direction="ascendente"),
        )
        engine = make_engine(text_return="Seccion generada.")
        synth = SynthesisEngine(engine)
        briefing = await synth.morning_briefing(assessments=[assessment])
        assert "Feijoo" in briefing.actors_covered

    @pytest.mark.asyncio
    async def test_generate_alert_no_signals(self):
        from agents.analysis.synthesis_engine import SynthesisEngine
        engine = make_engine()
        synth = SynthesisEngine(engine)
        alert = await synth.generate_alert(signals=[])
        assert alert is None

    @pytest.mark.asyncio
    async def test_generate_alert_with_high_urgency(self):
        from agents.analysis.synthesis_engine import SynthesisEngine
        engine = make_engine(json_return={
            "nivel": "ALTO",
            "titulo": "Alerta test",
            "cuerpo": "Descripcion de la alerta",
            "actores": ["Sanchez"],
            "etiquetas": ["crisis"],
            "requiere_accion": True,
        })
        signals = [IntelSignal("crisis", "alta", summary="Crisis de gobierno")]
        synth = SynthesisEngine(engine)
        alert = await synth.generate_alert(signals=signals, actor="Pedro Sanchez")
        assert alert is not None
        assert alert.level == "ALTO"
        assert alert.requires_action is True

    @pytest.mark.asyncio
    async def test_rag_query_with_context(self):
        from agents.analysis.synthesis_engine import SynthesisEngine
        engine = make_engine(text_return="Respuesta basada en el contexto.")
        synth = SynthesisEngine(engine)
        result = await synth.rag_query(
            question="Cual es la situacion de Sanchez?",
            context_docs=["Sanchez anuncio ayer medidas fiscales..."],
        )
        assert result.question == "Cual es la situacion de Sanchez?"
        assert result.sources_used == 1
        assert result.confidence > 0.5

    @pytest.mark.asyncio
    async def test_rag_query_empty_question(self):
        from agents.analysis.synthesis_engine import SynthesisEngine
        engine = make_engine()
        synth = SynthesisEngine(engine)
        result = await synth.rag_query(question="", context_docs=[])
        assert result.confidence == 0.0


# ---------------------------------------------------------------------------
# IntelligenceClassifier
# ---------------------------------------------------------------------------

class TestIntelligenceClassifier:
    @pytest.mark.asyncio
    async def test_classify_returns_classified_signal(self):
        from agents.analysis.layer5_classifier import IntelligenceClassifier
        engine = make_engine(json_return={
            "tipo": "electoral",
            "subtipo": "sondeo",
            "horizonte_impacto": "corto_plazo",
            "audiencias": ["partido"],
            "relevancia_actores": {"Sanchez": 0.8},
            "confianza": 0.75,
        })
        clf = IntelligenceClassifier(engine, actors=["Sanchez"])
        signal = IntelSignal("declaracion", "media", summary="Nuevo sondeo")
        result = await clf.classify(signal)

        assert result.intel_type == "electoral"
        assert result.relevance_scores.get("Sanchez") == 0.8
        assert result.classification_confidence == 0.75

    @pytest.mark.asyncio
    async def test_classify_invalid_type_defaults_to_mediatica(self):
        from agents.analysis.layer5_classifier import IntelligenceClassifier
        engine = make_engine(json_return={
            "tipo": "tipo_inventado",
            "subtipo": "",
            "horizonte_impacto": "corto_plazo",
        })
        clf = IntelligenceClassifier(engine)
        signal = IntelSignal("declaracion", "baja", summary="Test")
        result = await clf.classify(signal)
        assert result.intel_type == "mediatica"

    @pytest.mark.asyncio
    async def test_classify_batch_processes_all(self):
        from agents.analysis.layer5_classifier import IntelligenceClassifier
        engine = make_engine(json_return={"tipo": "legislativa"})
        clf = IntelligenceClassifier(engine)
        signals = [
            IntelSignal("declaracion", "alta", summary=f"Señal {i}")
            for i in range(5)
        ]
        batch = await clf.classify_batch(signals)
        assert len(batch.signals) == 5


# ---------------------------------------------------------------------------
# ITPE Engine
# ---------------------------------------------------------------------------

class TestITPEEngine:
    def test_compute_basic(self):
        from agents.analysis.itpe_engine import ITPEEngine
        engine = ITPEEngine(market_id="ES")
        snapshot = engine.compute(
            economic_data={"tasa_paro": 12.0, "ipc_general": 3.5},
            political_data={"fragmentacion": 0.6},
        )
        assert 0 <= snapshot.itpe_score <= 100
        assert snapshot.market_id == "ES"
        assert snapshot.itpe_level in ("bajo", "medio", "alto", "critico")

    def test_compute_high_stress(self):
        from agents.analysis.itpe_engine import ITPEEngine
        engine = ITPEEngine()
        snapshot = engine.compute(
            economic_data={"tasa_paro": 25.0, "ipc_general": 8.0, "deuda_pib": 130.0},
            political_data={"fragmentacion": 0.9, "mocion_censura": True},
            geopolitical_data={"conflictos_adyacentes": 2},
            institutional_data={"investigaciones_judiciales_gobierno": 5, "crisis_gobierno": True},
        )
        assert snapshot.itpe_score >= 50
        assert snapshot.itpe_level in ("alto", "critico")

    def test_compute_low_stress(self):
        from agents.analysis.itpe_engine import ITPEEngine
        engine = ITPEEngine()
        snapshot = engine.compute(
            economic_data={"tasa_paro": 5.0, "ipc_general": 1.5, "deuda_pib": 50.0},
            political_data={"fragmentacion": 0.2},
        )
        assert snapshot.itpe_score < 50

    def test_level_for_score(self):
        from agents.analysis.itpe_engine import ITPESnapshot
        assert ITPESnapshot.level_for_score(10) == "bajo"
        assert ITPESnapshot.level_for_score(35) == "medio"
        assert ITPESnapshot.level_for_score(60) == "alto"
        assert ITPESnapshot.level_for_score(80) == "critico"

    def test_snapshot_to_dict(self):
        from agents.analysis.itpe_engine import ITPEEngine
        engine = ITPEEngine()
        snapshot = engine.compute()
        d = snapshot.to_dict()
        assert "itpe_score" in d
        assert "market_id" in d
        assert "dimensions" in d

    def test_compute_empty_data(self):
        from agents.analysis.itpe_engine import ITPEEngine
        engine = ITPEEngine()
        snapshot = engine.compute()  # sin datos
        assert 0 <= snapshot.itpe_score <= 100

    def test_dimensions_count(self):
        from agents.analysis.itpe_engine import ITPEEngine
        engine = ITPEEngine()
        snapshot = engine.compute()
        assert len(snapshot.dimensions) == 5


# ---------------------------------------------------------------------------
# Risk Integrator
# ---------------------------------------------------------------------------

class TestRiskIntegrator:
    def test_inject_itpe_basic(self):
        from agents.analysis.itpe_engine import ITPEEngine, ITPESnapshot
        from agents.analysis.risk_integrator import inject_itpe_into_risk_index

        itpe_engine = ITPEEngine()
        itpe = itpe_engine.compute(
            economic_data={"tasa_paro": 12.0, "ipc_general": 4.0}
        )
        result = inject_itpe_into_risk_index(itpe=itpe, market_id="ES")

        assert 0 <= result.total_score <= 100
        assert result.level in ("bajo", "medio", "alto", "critico")
        assert result.market_id == "ES"

    def test_inject_without_itpe(self):
        from agents.analysis.risk_integrator import inject_itpe_into_risk_index
        result = inject_itpe_into_risk_index(itpe=None)
        assert result.total_score > 0  # usa score neutral 50

    def test_inject_with_critical_alerts(self):
        from agents.analysis.risk_integrator import inject_itpe_into_risk_index
        from agents.analysis.synthesis_engine import IntelAlert
        alerts = [
            IntelAlert(
                alert_id="1", level="CRITICO",
                title="Crisis", body="Descripcion",
            )
        ]
        result = inject_itpe_into_risk_index(alerts=alerts)
        assert result.alert_contribution > 0

    def test_to_dict(self):
        from agents.analysis.risk_integrator import inject_itpe_into_risk_index
        result = inject_itpe_into_risk_index()
        d = result.to_dict()
        assert "total_score" in d
        assert "components" in d


# ---------------------------------------------------------------------------
# Layer9 Products
# ---------------------------------------------------------------------------

class TestIntelligenceProductFactory:
    def _make_output(self):
        from agents.analysis.layer8_orchestrator import OrchestratorOutput
        from agents.analysis.synthesis_engine import DailyBriefing

        assessment = StrategicAssessment(
            actor="Sanchez",
            executive_summary="Resumen ejecutivo",
            risks=[RiskItem("judicial", "investigacion", "critico")],
            trend=ActorTrend(direction="descendente"),
        )

        briefing = DailyBriefing(
            briefing_type="morning_briefing",
            title="Briefing Test",
            executive_summary="Resumen del dia",
            sections=[{"title": "Politica", "body": "Texto"}],
            actors_covered=["Sanchez"],
        )

        output = OrchestratorOutput()
        output.assessments = [assessment]
        output.briefing = briefing
        return output

    def test_create_morning_brief(self):
        from agents.analysis.layer9_products import IntelligenceProductFactory
        factory = IntelligenceProductFactory(market_id="ES")
        output = self._make_output()
        products = factory.create_all(output, products=["MORNING_BRIEF"])
        assert len(products) == 1
        assert products[0].product_type == "MORNING_BRIEF"

    def test_create_war_room(self):
        from agents.analysis.layer9_products import IntelligenceProductFactory
        factory = IntelligenceProductFactory()
        output = self._make_output()
        products = factory.create_all(output, products=["WAR_ROOM"])
        assert len(products) == 1
        assert "Sanchez" in products[0].content

    def test_create_risk_report_with_risks(self):
        from agents.analysis.layer9_products import IntelligenceProductFactory
        factory = IntelligenceProductFactory()
        output = self._make_output()
        products = factory.create_all(output, products=["RISK_REPORT"])
        assert len(products) == 1
        assert "CRITICO" in products[0].content

    def test_product_to_dict(self):
        from agents.analysis.layer9_products import IntelligenceProductFactory
        factory = IntelligenceProductFactory()
        output = self._make_output()
        products = factory.create_all(output, products=["MORNING_BRIEF"])
        d = products[0].to_dict()
        assert "product_type" in d
        assert "content" in d
        assert "generated_at" in d

    def test_morning_brief_requires_briefing(self):
        from agents.analysis.layer8_orchestrator import OrchestratorOutput
        from agents.analysis.layer9_products import IntelligenceProductFactory
        factory = IntelligenceProductFactory()
        output = OrchestratorOutput()  # sin briefing
        products = factory.create_all(output, products=["MORNING_BRIEF"])
        assert len(products) == 0
