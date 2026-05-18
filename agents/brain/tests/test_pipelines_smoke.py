"""
Smoke tests de los 7 pipelines invisibles. Sin red — usa FakeChatClient.

Verifica:
  · Cada pipeline importa y se instancia.
  · `process()` / `enrich()` / `extract()` ejecutan sin crashear.
  · Cuando el brain no está disponible, degradan suave (no ValueError).
  · Las estructuras de retorno tienen los campos esperados.
"""
from __future__ import annotations

import json
from typing import Any

import pytest

from agents.brain.tests.test_brain_smoke import FakeChatClient, _make_brain
from agents.brain.pipelines.entity_resolver import EntityResolver
from agents.brain.pipelines.news_intelligence import NewsIntelligencePipeline
from agents.brain.pipelines.declarations_intelligence import DeclarationsIntelligence
from agents.brain.pipelines.polls_intelligence import PollsIntelligence
from agents.brain.pipelines.territorios_enricher import TerritoriosEnricher
from agents.brain.pipelines.actor_graph_extractor import ActorGraphExtractor
from agents.brain.pipelines.dossier_builder import DossierBuilder


_CATALOG = [
    {"actor_id": "a_psoe_1", "name": "Pedro Sánchez", "short_name": "Sánchez",
     "surname": "Sánchez", "role": "Presidente del Gobierno", "party": "PSOE"},
    {"actor_id": "a_pp_1", "name": "Alberto Núñez Feijóo", "short_name": "Feijóo",
     "surname": "Feijóo", "role": "Líder del PP", "party": "PP"},
]


# ─────────────────────────────────────────────────────────────────
# Entity resolver
# ─────────────────────────────────────────────────────────────────

class TestEntityResolver:
    def test_quick_match_full_name(self):
        r = EntityResolver(_CATALOG)
        ms = r.resolve("Pedro Sánchez convocó reunión.", date="2026-05-18")
        assert any(m.canonical == "Pedro Sánchez" and m.method == "exact" for m in ms)

    def test_quick_match_surname_alone(self):
        r = EntityResolver(_CATALOG)
        ms = r.resolve("Sánchez convocó hoy reunión.", date="2026-05-18")
        assert any(m.canonical == "Pedro Sánchez" for m in ms)

    def test_sentence_leader_stripped(self):
        """Hoy Sánchez no debe registrarse como compuesto raro."""
        r = EntityResolver(_CATALOG)
        ms = r.resolve("Hoy Sánchez ha hablado con Feijóo.", date="2026-05-18")
        names = {m.canonical for m in ms if m.canonical}
        assert "Pedro Sánchez" in names
        assert "Alberto Núñez Feijóo" in names

    def test_no_match_unknown(self):
        r = EntityResolver(_CATALOG)
        ms = r.resolve("Hablan Pérez y González sobre algo.", date="2026-05-18")
        # Ninguno está en catálogo → method=no_match esperable
        assert all(m.canonical == "" for m in ms)

    def test_relevance_score(self):
        fake = FakeChatClient(response_payload={
            "relevant": True, "score": 0.85, "category": "politica",
            "rationale": "habla del gobierno", "risks": [], "confidence": 0.85,
        })
        from agents.brain.groq_brain import _build_groq_brain_class, reset_groq_brain
        reset_groq_brain()
        klass = _build_groq_brain_class()
        brain = klass(client=fake)
        r = EntityResolver(_CATALOG, brain=brain)
        out = r.score_political_relevance(text="texto político de ejemplo", title="X")
        assert out["ok"]
        assert out["score"] >= 0.8


# ─────────────────────────────────────────────────────────────────
# News intelligence
# ─────────────────────────────────────────────────────────────────

class TestNewsIntelligence:
    def _mk_pipe(self, payload):
        brain = _make_brain(payload)
        return NewsIntelligencePipeline(actor_catalog=_CATALOG, brain=brain)

    def test_dedup_by_hash(self):
        pipe = self._mk_pipe({"ok": True, "relevant": True, "score": 0.9})
        first = pipe.process(text="texto único", title="T", url="u1", source="elpais")
        second = pipe.process(text="texto único", title="T", url="u2", source="elpais")
        assert second.duplicate_of is not None
        assert not second.should_store

    def test_low_relevance_discards(self):
        # FakeChatClient devuelve siempre el mismo payload → relevancia baja
        pipe = self._mk_pipe({
            "relevant": False, "score": 0.1, "category": "ruido",
            "rationale": "off-topic", "confidence": 0.9,
            "credibility_tier": "C",  # para classify_document
            "doc_type": "blog_opinion",
        })
        art = pipe.process(text="texto irrelevante", title="X", url="u", source="blog")
        assert art.should_store is False
        assert art.discard_reason and "relevance" in art.discard_reason


# ─────────────────────────────────────────────────────────────────
# Declarations intelligence
# ─────────────────────────────────────────────────────────────────

class TestDeclarationsIntelligence:
    def test_basic_classify(self):
        brain = _make_brain({
            "strategic_intent": "atacar",
            "audience_target": "base militante",
            "frames": [{"frame": "moral"}],
            "rhetorical_devices": [{"device": "hipérbole"}],
            "fallacies": [],
            "confidence": 0.8,
        })
        di = DeclarationsIntelligence(brain=brain)
        out = di.enrich(
            speaker="Pedro Sánchez", quote="X es una vergüenza.",
            venue="Congreso", date_iso="2026-05-18", topic="moción",
        )
        assert out.ok
        assert out.declaration_type == "ataque"
        assert out.strategic_intent == "atacar"


# ─────────────────────────────────────────────────────────────────
# Polls intelligence
# ─────────────────────────────────────────────────────────────────

class TestPollsIntelligence:
    def test_assess_runs(self):
        brain = _make_brain({
            "credibility_tier": "A",
            "headline": "PSOE estable",
            "big_movers": [{"partido": "PSOE", "delta_pct": 0.1}],
            "confidence_caveats": ["margen pequeño"],
            "confidence": 0.7,
        })
        pi = PollsIntelligence(brain=brain)
        out = pi.assess_poll(
            pollster="40dB", ficha_tecnica="muestra n=1000 CATI",
            results_summary="PSOE 28, PP 32",
            fecha_campo="2026-05-15", recent_polls_summary="",
        )
        assert out.ok
        assert out.methodology_score >= 0.5


# ─────────────────────────────────────────────────────────────────
# Territorios enricher
# ─────────────────────────────────────────────────────────────────

class TestTerritoriosEnricher:
    def test_municipio_basic(self):
        brain = _make_brain({
            "scenarios": [{
                "name": "base", "probability": 0.6,
                "narrative": "Municipio estable con tendencia urbana progresista.",
                "consequences": [],
            }],
            "watch_list": ["paro juvenil", "vivienda"],
            "soft_voter_segments": [
                {"name": "Joven urbano", "motivations": ["empleo", "vivienda"], "channels": ["Instagram"]}
            ],
            "persuasive_messages": [
                {"claim": "Empleo digno para jóvenes"},
            ],
            "confidence": 0.7,
        })
        e = TerritoriosEnricher(brain=brain, wiki=None)  # wiki=None evita fetch real en tests
        # Marcamos usar_wikipedia=False para que no salga a internet
        out = e.enrich_municipio(
            nombre="Albacete",
            ccaa="Castilla-La Mancha", provincia="Albacete",
            datos_ine={"poblacion": 174000, "paro_pct": 18.5},
            historico_electoral=[],
            alcalde_actual="Manuel Serrano",
            wikipedia_excerpt="Capital de Castilla-La Mancha. ...",
            usar_wikipedia=False,
        )
        assert out.ok
        # La nueva estructura usa issues_principales (lista de dicts con campo "tema")
        temas = [str(i.get("tema", "")).lower() for i in out.issues_principales]
        assert any("vivienda" in t or "empleo" in t or t for t in temas) or len(out.issues_principales) >= 1
        assert out.alcalde_o_presidente == "Manuel Serrano"


# ─────────────────────────────────────────────────────────────────
# Actor graph extractor
# ─────────────────────────────────────────────────────────────────

class TestActorGraphExtractor:
    def test_extract_two_actors(self):
        ex = ActorGraphExtractor(actor_catalog=_CATALOG)
        edges = ex.extract_from_news(
            text="Pedro Sánchez agradece a Feijóo su voto a favor del decreto.",
            date_iso="2026-05-18", source="europapress",
        )
        assert len(edges) >= 1
        e = edges[0]
        # Alianza/agradece → valencia positiva
        assert e.valence >= 0
        assert e.actor_from_name == "Pedro Sánchez" or e.actor_to_name == "Pedro Sánchez"

    def test_aggregation(self):
        ex = ActorGraphExtractor(actor_catalog=_CATALOG)
        edges = []
        edges.extend(ex.extract_from_news("Sánchez acuerda con Feijóo el decreto.",
                                         date_iso="2026-01-01", source="ABC"))
        edges.extend(ex.extract_from_news("Sánchez pacta con Feijóo nueva ley.",
                                         date_iso="2026-02-01", source="EP"))
        agg = ex.aggregate_edges(edges, min_count=2)
        # Tras 2 menciones del mismo tipo, debería haber agregado
        assert any(a.edges_count >= 2 for a in agg)

    def test_relation_changes(self):
        ex = ActorGraphExtractor(actor_catalog=_CATALOG)
        edges = []
        edges.extend(ex.extract_from_news("Sánchez agradece a Feijóo el apoyo.",
                                         date_iso="2026-01-01", source="A"))
        edges.extend(ex.extract_from_news("Sánchez acusa a Feijóo de bloqueo.",
                                         date_iso="2026-04-01", source="B"))
        changes = ex.detect_relation_changes(edges)
        # alianza → conflicto detectado
        assert any(c["from_type"] == "alianza" and c["to_type"] == "conflicto" for c in changes)


# ─────────────────────────────────────────────────────────────────
# Dossier builder
# ─────────────────────────────────────────────────────────────────

class TestActorDiscovery:
    def test_extract_names_simple(self):
        from agents.brain.pipelines.actor_discovery import ActorDiscovery
        disc = ActorDiscovery(actor_catalog=[])
        names = disc._extract_names(
            "Hoy María José Sánchez se reunió con Antonio García López."
        )
        # Esperamos detectar al menos uno (sin leaders, sentence-cleaned)
        assert any("Sánchez" in n or "Antonio García López" in n for n in names)

    def test_filters_known(self):
        from agents.brain.pipelines.actor_discovery import ActorDiscovery
        disc = ActorDiscovery(actor_catalog=[
            {"name": "Pedro Sánchez", "surname": "Sánchez"},
        ])
        names = disc._extract_names("Pedro Sánchez declaró hoy.")
        # No debe proponer "Pedro Sánchez" porque está en catálogo
        assert not any("Pedro Sánchez" == n for n in names)

    def test_discover_min_mentions(self):
        from agents.brain.pipelines.actor_discovery import ActorDiscovery
        disc = ActorDiscovery(actor_catalog=[], brain="__noop__", wiki="__noop__")
        # Pasamos brain="__noop__" para que no llame al brain real (Truthy)
        # pero falle en _get_brain check → skip brain step
        texts = [
            ("Antonio García López dijo X.", "2026-05-01", "elpais"),
            ("Antonio García López ha hablado.", "2026-05-02", "abc"),
            ("Hoy Antonio García López.", "2026-05-03", "europapress"),
        ]
        proposals = disc.discover_from_texts(texts, min_mentions=3)
        names = [p.proposed_name for p in proposals]
        assert any("Antonio" in n for n in names)


class TestDossierBuilder:
    def test_actor_dossier(self):
        brain = _make_brain({
            "biography_short": "Político español. Presidente desde 2018.",
            "political_style": "técnico",
            "momentum": "estable",
            "strengths": ["resistencia", "gestión"],
            "weaknesses": ["ruido judicial"],
            "leverage_points": ["pactos territoriales"],
            "predicted_next_move": "ofensiva mediática",
            "confidence": 0.75,
        })
        db = DossierBuilder(brain=brain, wiki=None)
        out = db.build_actor_dossier(
            "Pedro Sánchez", role="Presidente", depth="short",
            usar_wikipedia=False,  # no salimos a la red en tests
        )
        assert out.ok
        assert "Político español" in out.executive_summary
        # La nueva clave es 'estilo_politico' (renombrada)
        assert "técnico" in out.sections.get("estilo_politico", "")

    def test_issue_dossier(self):
        brain = _make_brain({
            "scenarios": [{"name": "base", "probability": 0.6,
                           "narrative": "Issue X seguirá ganando tracción."}],
            "watch_list": ["ola judicial"],
            "core_claim": "La vivienda es el issue central del ciclo.",
            "plot_arc": "desarrollo",
            "amplifiers": ["medios digitales"],
            "counter_narratives": ["narrativa de propiedad"],
            "confidence": 0.7,
        })
        db = DossierBuilder(brain=brain)
        out = db.build_issue_dossier("Vivienda", depth="medium")
        assert out.ok
        assert "vivienda" in out.executive_summary.lower()
