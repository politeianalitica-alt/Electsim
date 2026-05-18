"""
Dossier Builder · genera dossieres RICOS y AUDITABLES de actores, issues,
territorios y campañas. Combina varias tools del brain + Wikipedia + datos
estructurados de BD para producir documentos editorialmente válidos.

Versión mejorada: cada dossier tiene 12-20 secciones (no 4-5 como la
versión anterior). Las secciones incluyen citaciones a fuentes (Wikipedia,
hemeroteca, BD electoral, BOE) cuando están disponibles. Todo es JSON
serializable y listo para:
  · D1_Briefings.py (Streamlit) y `/briefing` (Next.js)
  · Export PDF/DOCX via `dashboard/services/document_core.py`
  · Inserción en ChromaDB como memoria institucional

Tipos:
  · ActorDossier      — biografía, trayectoria, posiciones, controversias,
                         vulnerabilidades, relaciones, estilo retórico,
                         predicción next move, dossier comparativo
  · IssueDossier      — qué es, cronología, posiciones partidos, escenarios,
                         narrativa hegemónica, contra-narrativas, indicadores
  · TerritoryDossier  — usa TerritoriosEnricher como base + lecturas extra
  · CampaignDossier   — DAFO + war room + segmentos + canal + comparativa

Profundidades: "short" (1 pág) · "medium" (5 pág) · "deep" (10+ pág).
"""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class Citation:
    tipo: str            # wikipedia | hemeroteca | boe | db | brain_inference
    titulo: str = ""
    url: str = ""
    fecha: str = ""
    autor: str = ""


@dataclass
class Dossier:
    """Documento estructurado con secciones razonadas y citaciones."""

    type: str               # actor | issue | territory | campaign
    subject: str
    depth: str = "medium"   # short | medium | deep
    date_generated: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    # Cabecera
    executive_summary: str = ""
    one_liner: str = ""                          # frase única
    key_facts: list[str] = field(default_factory=list)
    headline_quote: str = ""                     # frase representativa con autor

    # Secciones (libres por tipo)
    sections: dict[str, str] = field(default_factory=dict)

    # Estructurados embebidos (para vista rápida)
    structured_data: dict[str, Any] = field(default_factory=dict)
    timeline: list[dict[str, Any]] = field(default_factory=list)
    relations: list[dict[str, Any]] = field(default_factory=list)
    scenarios: list[dict[str, Any]] = field(default_factory=list)

    # Recomendaciones operativas
    today_actions: list[str] = field(default_factory=list)
    watch_next: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    opportunities: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)
    talking_points: list[str] = field(default_factory=list)

    # Citaciones
    citations: list[Citation] = field(default_factory=list)

    # Trazas
    ok: bool = False
    error: str | None = None
    confidence: float = 0.0
    completeness_score: float = 0.0
    stages_ok: list[str] = field(default_factory=list)
    stages_err: dict[str, str] = field(default_factory=dict)
    tokens_used: int = 0
    latency_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["citations"] = [asdict(c) for c in self.citations]
        return d

    def add_citation(self, **kw) -> None:
        self.citations.append(Citation(**{k: v for k, v in kw.items() if k in Citation.__annotations__}))


# ─────────────────────────────────────────────────────────────────
# Builder
# ─────────────────────────────────────────────────────────────────

class DossierBuilder:
    """Compone dossieres ricos a partir de datos crudos + brain + Wikipedia."""

    def __init__(self, *, brain: Any = None, wiki: Any = None) -> None:
        self._brain = brain
        self._wiki = wiki

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("DossierBuilder: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    def _get_wiki(self):
        if self._wiki is not None:
            return self._wiki
        try:
            from agents.brain.pipelines.wikipedia_fetcher import get_wikipedia_fetcher
            self._wiki = get_wikipedia_fetcher()
        except Exception as exc:
            logger.warning("DossierBuilder: wiki no disponible (%s)", exc)
            self._wiki = None
        return self._wiki

    def _run_stage(self, d: Dossier, name: str, fn) -> None:
        try:
            fn()
            d.stages_ok.append(name)
        except Exception as exc:
            logger.exception("dossier stage %s falló", name)
            d.stages_err[name] = f"{type(exc).__name__}: {str(exc)[:200]}"

    # ════════════════════════════════════════════════════════════════
    # ACTOR DOSSIER
    # ════════════════════════════════════════════════════════════════

    def build_actor_dossier(
        self,
        actor_name: str,
        *,
        role: str = "",
        party: str = "",
        biography: str = "",
        declarations_recent: list[str] | None = None,
        votes_recent: list[dict[str, Any]] | None = None,
        controversies: list[str] | None = None,
        relations_from_graph: list[dict[str, Any]] | None = None,
        depth: str = "medium",
        usar_wikipedia: bool = True,
    ) -> Dossier:
        d = Dossier(type="actor", subject=actor_name, depth=depth)
        d.structured_data = {
            "role": role, "party": party,
            "votes_recent": votes_recent or [],
            "controversies": controversies or [],
            "declarations_recent": declarations_recent or [],
            "relations_from_graph": relations_from_graph or [],
        }
        brain = self._get_brain()
        if brain is None:
            d.error = "brain no disponible"
            return d

        # ── Stage 1 · Wikipedia bundle ────────────────────────────
        wiki_bundle: dict[str, Any] = {}
        if usar_wikipedia:
            def _stage_wiki():
                nonlocal wiki_bundle
                wiki = self._get_wiki()
                if wiki is None:
                    raise RuntimeError("wiki no disponible")
                wiki_bundle = wiki.fetch_actor(actor_name)
                if not wiki_bundle.get("found"):
                    raise RuntimeError("actor no encontrado en wikipedia")
                d.add_citation(
                    tipo="wikipedia",
                    titulo=wiki_bundle.get("name", actor_name),
                    url=wiki_bundle.get("url", ""),
                    fecha=datetime.utcnow().date().isoformat(),
                )
            self._run_stage(d, "wikipedia", _stage_wiki)

        wiki_summary = wiki_bundle.get("summary", "")
        wiki_extract = wiki_bundle.get("extract", "")
        wiki_infobox = wiki_bundle.get("infobox", {})

        known_facts: list[str] = []
        if biography:
            known_facts.append(biography)
        if wiki_summary:
            known_facts.append(f"[Wikipedia] {wiki_summary[:1500]}")
        if wiki_infobox:
            for k in ("fecha de nacimiento", "lugar de nacimiento", "partido", "cargo",
                      "alma_máter", "ocupación", "cónyuge", "hijos"):
                if wiki_infobox.get(k):
                    known_facts.append(f"{k.title()}: {wiki_infobox[k]}")

        # ── Stage 2 · Perfil 360 (build_actor_profile) ────────────
        def _stage_profile():
            out = brain.build_actor_profile(
                actor_name=actor_name,
                role=role or wiki_bundle.get("office", ""),
                known_facts=known_facts,
                recent_statements=(declarations_recent or [])[:8],
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "build_actor_profile falló")
            r = out.get("result") or {}
            if isinstance(r, dict):
                d.executive_summary = str(r.get("biography_short") or wiki_summary[:500])
                d.sections["estilo_politico"] = str(r.get("political_style") or "")
                d.sections["momentum"] = str(r.get("momentum") or "")
                d.sections["fortalezas"] = self._list_to_md(r.get("strengths"))
                d.sections["debilidades"] = self._list_to_md(r.get("weaknesses"))
                d.sections["palancas"] = self._list_to_md(r.get("leverage_points"))
                d.sections["audiencias_clave"] = self._list_to_md(r.get("core_audiences"))
                d.sections["canales_preferidos"] = self._list_to_md(r.get("preferred_channels"))
                d.sections["predicted_next_move"] = str(r.get("predicted_next_move") or "")
                # key_facts compuestos
                d.key_facts = (
                    [str(r.get("political_style", "Estilo no determinado"))]
                    + [f"Momentum: {r.get('momentum', '?')}"]
                    + [f"Fortaleza: {x}" for x in (r.get("strengths") or [])[:3]]
                )
                # Ejes ideológicos
                axis = r.get("ideological_axis") or {}
                if isinstance(axis, dict):
                    d.structured_data["ideological_axis"] = axis
                # Relaciones clave (las añade al grafo si vienen)
                rel = r.get("key_relations") or []
                if isinstance(rel, list):
                    d.relations.extend([
                        {"name": x.get("name"), "relation": x.get("relation")}
                        for x in rel if isinstance(x, dict)
                    ])
                d.confidence = max(d.confidence, float(r.get("confidence") or 0.0))
            d.tokens_used += int(out.get("tokens_used") or 0)
            d.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(d, "profile", _stage_profile)

        # ── Stage 3 · Investigación competitiva (opposition) ──────
        if depth in {"medium", "deep"}:
            def _stage_opposition():
                out = brain.opposition_research(
                    target_actor=actor_name,
                    client_position=f"Análisis interno · Politeia · perfil 360 de {actor_name}",
                    recent_actions=(declarations_recent or [])[:5] + [str(c) for c in (controversies or [])[:3]],
                    time_window="últimos 12 meses",
                )
                if not out.get("ok"):
                    raise RuntimeError(out.get("error") or "opposition falló")
                r = out.get("result") or {}
                if isinstance(r, dict):
                    vuls = r.get("vulnerabilities") or []
                    if isinstance(vuls, list):
                        d.risks = [
                            (v.get("detail") if isinstance(v, dict) else str(v))
                            for v in vuls[:7] if v
                        ]
                    d.sections["vectores_ataque"] = "\n".join(
                        f"- {(av.get('vector') if isinstance(av, dict) else str(av))}"
                        for av in (r.get("attack_vectors") or [])[:8]
                    )
                    d.sections["respuestas_esperadas"] = "\n".join(
                        f"- ante '{(pr.get('trigger') if isinstance(pr, dict) else '?')}': "
                        f"{(pr.get('likely_response') if isinstance(pr, dict) else str(pr))}"
                        for pr in (r.get("predicted_responses") or [])[:6]
                    )
                    d.sections["neutralizadores"] = "\n".join(
                        f"- {(n.get('argument') if isinstance(n, dict) else str(n))}"
                        for n in (r.get("neutralizers") or [])[:6]
                    )
                    d.red_flags = [str(x) for x in (r.get("off_limits") or [])][:6]
                d.tokens_used += int(out.get("tokens_used") or 0)
                d.latency_ms += int(out.get("latency_ms") or 0)
            self._run_stage(d, "opposition_research", _stage_opposition)

        # ── Stage 4 · Postura legislativa sobre temas calientes ──
        if depth == "deep":
            def _stage_legislative():
                # Tema agregado del último año
                out = brain.analyze_legislative_position(
                    actor_or_party=actor_name,
                    law_or_topic="Agregado de iniciativas y votaciones recientes",
                    historical_votes=self._compact_votes(votes_recent or []),
                    public_statements=(declarations_recent or [])[:8],
                )
                if not out.get("ok"):
                    raise RuntimeError(out.get("error") or "legislative falló")
                r = out.get("result") or {}
                if isinstance(r, dict):
                    d.sections["postura_oficial"] = str(r.get("official_position") or "")
                    d.sections["postura_real"] = str(r.get("real_position") or "")
                    d.sections["disenso_interno"] = str(r.get("internal_dissent") or "")
                    d.sections["palancas_negociacion"] = "\n".join(
                        f"- de {x.get('de','?')} a {x.get('a','?')}: {x.get('leverage','?')}"
                        for x in (r.get("negotiation_levers") or [])[:5] if isinstance(x, dict)
                    )
                    d.sections["comunicacion_esperada"] = str(r.get("expected_communication") or "")
                d.tokens_used += int(out.get("tokens_used") or 0)
                d.latency_ms += int(out.get("latency_ms") or 0)
            self._run_stage(d, "legislative", _stage_legislative)

        # ── Stage 5 · One-liner + headline quote + timeline ───────
        d.one_liner = wiki_summary.split(".")[0][:180] if wiki_summary else ""
        if declarations_recent:
            d.headline_quote = str(declarations_recent[0])[:300]
        # Timeline desde controversias + votos
        timeline: list[dict[str, Any]] = []
        for c in (controversies or [])[:8]:
            timeline.append({"tipo": "controversia", "descripcion": str(c)})
        for v in (votes_recent or [])[:8]:
            if isinstance(v, dict):
                timeline.append({
                    "tipo": "voto",
                    "ley": v.get("ley") or v.get("topic"),
                    "voto": v.get("voto") or v.get("vote"),
                    "fecha": v.get("fecha") or v.get("date"),
                })
        d.timeline = timeline[:15]

        # Si tenemos relaciones del grafo, las añadimos
        if relations_from_graph:
            d.relations.extend([
                {
                    "name": r.get("actor_to_name") or r.get("name"),
                    "type": r.get("relation_type") or r.get("type"),
                    "valence": r.get("valence") or r.get("avg_valence"),
                    "strength": r.get("strength") or r.get("avg_strength"),
                }
                for r in relations_from_graph[:12]
                if isinstance(r, dict)
            ])

        d.completeness_score = self._completeness(d)
        # OK con stage `profile` exitoso (las demás son opcionales según depth)
        d.ok = "profile" in d.stages_ok or bool(d.executive_summary)
        return d

    # ════════════════════════════════════════════════════════════════
    # ISSUE DOSSIER
    # ════════════════════════════════════════════════════════════════

    def build_issue_dossier(
        self,
        issue_name: str,
        *,
        descripcion: str = "",
        cronologia: list[dict[str, Any]] | None = None,
        posiciones_partidos: dict[str, str] | None = None,
        estado_actual: str = "",
        evidencias_recientes: list[str] | None = None,
        depth: str = "medium",
    ) -> Dossier:
        d = Dossier(type="issue", subject=issue_name, depth=depth)
        d.structured_data = {
            "cronologia": cronologia or [],
            "posiciones_partidos": posiciones_partidos or {},
            "estado_actual": estado_actual,
            "evidencias_recientes": evidencias_recientes or [],
        }
        brain = self._get_brain()
        if brain is None:
            d.error = "brain no disponible"
            return d

        situacion = (
            f"Issue: {issue_name}\n"
            f"Descripción: {descripcion}\n"
            f"Estado actual: {estado_actual}\n"
            f"Posiciones partidos:\n" + "\n".join(
                f"- {p}: {pos}" for p, pos in (posiciones_partidos or {}).items()
            ) + "\n\n"
            f"Cronología:\n" + "\n".join(
                f"- {c.get('fecha','?')}: {c.get('titular','') or c.get('descripcion','')}"
                for c in (cronologia or [])[:12] if isinstance(c, dict)
            )
        )[:7500]

        # ── Stage 1 · Escenarios prospectivos ────────────────────
        def _stage_scenarios():
            out = brain.forecast_political_scenario(
                topic=issue_name, current_situation=situacion,
                time_horizon="6-12 meses", constraints=[],
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "scenarios falló")
            r = out.get("result") or {}
            if isinstance(r, dict):
                scs = r.get("scenarios") or []
                if isinstance(scs, list):
                    d.scenarios = [s for s in scs if isinstance(s, dict)][:4]
                    d.sections["escenarios"] = "\n\n".join(
                        f"### {(s.get('name') or '').upper()} (p={s.get('probability', 0):.2f})\n"
                        f"{s.get('narrative', '')}\n"
                        f"Triggers: {', '.join(map(str, s.get('triggers') or []))}\n"
                        f"Ganadores: {', '.join(map(str, s.get('winners') or []))}\n"
                        f"Perdedores: {', '.join(map(str, s.get('losers') or []))}"
                        for s in (d.scenarios or [])
                    )
                d.watch_next = [str(w) for w in (r.get("watch_list") or [])][:8]
                d.confidence = max(d.confidence, float(r.get("confidence") or 0.0))
            d.tokens_used += int(out.get("tokens_used") or 0)
            d.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(d, "scenarios", _stage_scenarios)

        # ── Stage 2 · Análisis de narrativa ──────────────────────
        def _stage_narrative():
            pieces = [descripcion, estado_actual] + [
                (c.get("titular") if isinstance(c, dict) else str(c))
                for c in (cronologia or [])[:12] if c
            ] + (evidencias_recientes or [])[:10]
            out = brain.analyze_narrative(
                pieces=pieces, topic=issue_name, time_window="últimos 12 meses",
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "narrative falló")
            r = out.get("result") or {}
            if isinstance(r, dict):
                d.executive_summary = str(r.get("core_claim") or descripcion or "")[:600]
                d.one_liner = str(r.get("narrative_name") or "")[:180]
                d.sections["narrativa_central"] = str(r.get("core_claim") or "")
                d.sections["arco_narrativo"] = str(r.get("plot_arc") or "")
                d.sections["argumentos_soporte"] = self._list_to_md(r.get("supporting_arguments"))
                d.sections["amplificadores"] = self._list_to_md(r.get("amplifiers"))
                d.sections["contra_narrativas"] = self._list_to_md(r.get("counter_narratives"))
                d.sections["vectores_ataque"] = self._list_to_md(r.get("attack_vectors"))
                # Características → talking points
                d.talking_points = [
                    str(x) for x in (r.get("supporting_arguments") or [])
                ][:6]
            d.tokens_used += int(out.get("tokens_used") or 0)
            d.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(d, "narrative", _stage_narrative)

        # ── Stage 3 · Postura de cada partido (deep) ─────────────
        if depth == "deep" and posiciones_partidos:
            def _stage_party_positions():
                bullets = []
                for party, position in (posiciones_partidos or {}).items():
                    out = brain.analyze_legislative_position(
                        actor_or_party=party,
                        law_or_topic=issue_name,
                        historical_votes="",
                        public_statements=[position] if position else [],
                    )
                    if out.get("ok") and isinstance(out.get("result"), dict):
                        rr = out["result"]
                        bullets.append(
                            f"### {party}\n"
                            f"- **Voto previsto**: {rr.get('predicted_vote', '?')} "
                            f"(certeza {rr.get('certainty', 0):.2f})\n"
                            f"- **Postura oficial**: {rr.get('official_position', '?')}\n"
                            f"- **Postura real**: {rr.get('real_position', '?')}\n"
                            f"- **Drivers**: {', '.join(map(str, rr.get('drivers') or []))}"
                        )
                        d.tokens_used += int(out.get("tokens_used") or 0)
                if bullets:
                    d.sections["posiciones_partidos_analizadas"] = "\n\n".join(bullets)
            self._run_stage(d, "party_positions", _stage_party_positions)

        # Timeline desde cronologia
        d.timeline = [
            {"fecha": c.get("fecha"), "titular": c.get("titular") or c.get("descripcion")}
            for c in (cronologia or [])[:15] if isinstance(c, dict)
        ]

        d.completeness_score = self._completeness(d)
        d.ok = len(d.stages_ok) >= 1
        return d

    # ════════════════════════════════════════════════════════════════
    # TERRITORY DOSSIER · usa TerritoriosEnricher como base
    # ════════════════════════════════════════════════════════════════

    def build_territory_dossier(
        self,
        territory_name: str,
        *,
        ccaa: str = "",
        provincia: str = "",
        datos_socioeco: dict[str, Any] | None = None,
        historico_electoral: list[dict[str, Any]] | None = None,
        lideres_actuales: list[dict[str, str]] | None = None,
        depth: str = "medium",
        usar_wikipedia: bool = True,
    ) -> Dossier:
        from agents.brain.pipelines.territorios_enricher import TerritoriosEnricher
        enricher = TerritoriosEnricher(brain=self._brain, wiki=self._wiki)
        prof = enricher.enrich_municipio(
            nombre=territory_name, ccaa=ccaa, provincia=provincia,
            datos_ine=datos_socioeco, historico_electoral=historico_electoral,
            alcalde_actual=(lideres_actuales[0].get("nombre") if lideres_actuales else ""),
            usar_wikipedia=usar_wikipedia,
        )
        d = Dossier(type="territory", subject=territory_name, depth=depth)
        if not prof.ok:
            d.error = prof.error
            return d

        d.executive_summary = prof.sintesis_ejecutiva
        d.one_liner = prof.sintesis_ejecutiva.split(".")[0] if prof.sintesis_ejecutiva else ""
        d.sections["perfil_socioeconomico"] = prof.perfil_socioeconomico
        d.sections["historia_politica"] = prof.historia_politica_reciente
        d.sections["contexto_cultural"] = prof.contexto_cultural
        d.sections["dinamica_actual"] = prof.dinamica_actual
        d.sections["perfil_voto"] = prof.perfil_voto
        d.sections["alcalde_o_presidente"] = (
            f"{prof.alcalde_o_presidente}"
            f"{' (' + prof.partido_alcalde + ')' if prof.partido_alcalde else ''}"
        )
        d.sections["analogias"] = (
            f"Similar a: {', '.join(prof.territorios_similares)}\n\n{prof.razon_analogia}"
            if prof.territorios_similares else ""
        )
        d.sections["geografia"] = (
            f"Población: {prof.poblacion or '—'} · "
            f"Superficie: {prof.superficie or '—'} · "
            f"Altitud: {prof.altitud or '—'} · "
            f"Comarca: {prof.comarca or '—'} · "
            f"Gentilicio: {prof.gentilicio or '—'}"
        )

        d.key_facts = [
            f"Tipo: {prof.tipo}",
            f"Población: {prof.poblacion or '—'}",
            f"Perfil de voto: {prof.perfil_voto or '—'}",
            f"Bisagra: {'sí' if prof.es_bisagra else 'no'}",
        ] + [f"Issue: {i.get('tema', '')}" for i in prof.issues_principales[:3]]
        d.today_actions = prof.palancas_movilizacion
        d.watch_next = prof.factores_basculantes
        d.risks = prof.riesgos_locales
        d.opportunities = prof.mensajes_que_funcionan
        d.talking_points = prof.mensajes_que_funcionan[:6]

        d.structured_data = {
            "es_bisagra": prof.es_bisagra,
            "perfil_voto": prof.perfil_voto,
            "segmentos_voto": prof.segmentos_voto,
            "tipos_campana_efectivos": prof.tipos_campana_efectivos,
            "canales_preferidos": prof.canales_preferidos,
            "url_wikipedia": prof.url_wikipedia,
            "image_url": prof.image_url,
            "completeness_score": prof.completeness_score,
        }
        # Histórico → timeline
        d.timeline = [
            {"fecha": h.get("fecha"), "ganador": h.get("ganador"),
             "porcentaje": h.get("porcentaje"), "tipo_eleccion": h.get("tipo_eleccion")}
            for h in prof.historico_ganadores
        ]
        # Citaciones
        for f in prof.fuentes_usadas:
            d.add_citation(tipo=f.get("tipo", ""), titulo=f.get("titulo", ""),
                           url=f.get("url", ""),
                           fecha=datetime.utcnow().date().isoformat())
        d.confidence = prof.confidence
        d.completeness_score = prof.completeness_score
        d.tokens_used = prof.tokens_used
        d.latency_ms = prof.latency_ms
        d.stages_ok = list(prof.stages_ok)
        d.stages_err = dict(prof.stages_err)
        d.ok = True
        return d

    # ════════════════════════════════════════════════════════════════
    # CAMPAIGN DOSSIER
    # ════════════════════════════════════════════════════════════════

    def build_campaign_dossier(
        self,
        campaign_name: str,
        *,
        candidato: str,
        partido: str,
        territorio: str,
        kpis: dict[str, Any] | None = None,
        eventos_recientes: list[str] | None = None,
        oposicion_principal: str = "",
        depth: str = "medium",
    ) -> Dossier:
        d = Dossier(type="campaign", subject=campaign_name, depth=depth)
        d.structured_data = {
            "candidato": candidato, "partido": partido,
            "territorio": territorio, "kpis": kpis or {},
        }
        brain = self._get_brain()
        if brain is None:
            d.error = "brain no disponible"
            return d

        # ── Stage 1 · War room summary (markdown extenso) ─────────
        def _stage_war_room():
            out = brain.generate_war_room_summary(
                situation=(
                    f"Campaña: {campaign_name}\nCandidato: {candidato} ({partido})\n"
                    f"Territorio: {territorio}\nOposición principal: {oposicion_principal or '—'}"
                ),
                signals=[f"{k}={v}" for k, v in (kpis or {}).items()][:12] +
                        (eventos_recientes or [])[:6],
                adversary_moves=[oposicion_principal] if oposicion_principal else [],
                client_assets=[partido, "equipo war room"],
                time_pressure="ciclo de campaña",
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "war_room falló")
            d.sections["war_room_summary"] = str(out.get("result") or "")[:6000]
            d.tokens_used += int(out.get("tokens_used") or 0)
            d.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(d, "war_room", _stage_war_room)

        # ── Stage 2 · Voto blando + segmentos + palancas ─────────
        def _stage_soft_vote():
            out = brain.analyze_soft_vote(
                party=partido, territory=territorio,
                polls_summary=str(kpis or {}),
                segments_data={"eventos": eventos_recientes or []},
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "soft_vote falló")
            r = out.get("result") or {}
            if isinstance(r, dict):
                d.opportunities = [
                    (s.get("name") if isinstance(s, dict) else str(s))
                    for s in (r.get("soft_voter_segments") or [])[:6]
                ]
                d.today_actions = [
                    (m.get("claim") if isinstance(m, dict) else str(m))
                    for m in (r.get("persuasive_messages") or [])[:6]
                ]
                d.talking_points = d.today_actions[:5]
            d.tokens_used += int(out.get("tokens_used") or 0)
            d.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(d, "soft_vote", _stage_soft_vote)

        # ── Stage 3 · Opposition research (deep) ─────────────────
        if depth == "deep" and oposicion_principal:
            def _stage_opp():
                out = brain.opposition_research(
                    target_actor=oposicion_principal,
                    client_position=f"Campaña {campaign_name} · {candidato} ({partido})",
                    recent_actions=(eventos_recientes or [])[:6],
                    time_window="últimos 6 meses",
                )
                if not out.get("ok"):
                    raise RuntimeError(out.get("error") or "opposition falló")
                r = out.get("result") or {}
                if isinstance(r, dict):
                    d.risks = [
                        (v.get("detail") if isinstance(v, dict) else str(v))
                        for v in (r.get("vulnerabilities") or [])[:6] if v
                    ]
                    d.sections["vectores_ataque"] = self._list_to_md([
                        (a.get("vector") if isinstance(a, dict) else str(a))
                        for a in (r.get("attack_vectors") or [])[:8] if a
                    ])
                d.tokens_used += int(out.get("tokens_used") or 0)
                d.latency_ms += int(out.get("latency_ms") or 0)
            self._run_stage(d, "opposition", _stage_opp)

        d.executive_summary = (
            f"Campaña {campaign_name}. {candidato} ({partido}) en {territorio}. "
            f"Stages OK: {len(d.stages_ok)}/{len(d.stages_ok) + len(d.stages_err)}"
        )
        d.completeness_score = self._completeness(d)
        d.ok = len(d.stages_ok) >= 1
        return d

    # ════════════════════════════════════════════════════════════════
    # HELPERS
    # ════════════════════════════════════════════════════════════════

    @staticmethod
    def _list_to_md(items: Any) -> str:
        if not isinstance(items, list) or not items:
            return ""
        return "\n".join(f"- {x}" for x in items[:12])

    @staticmethod
    def _compact_votes(votes: list[dict[str, Any]]) -> str:
        if not votes:
            return ""
        return "; ".join(
            f"{v.get('fecha','?')}:{v.get('ley','?')}:{v.get('voto','?')}"
            for v in votes[:10] if isinstance(v, dict)
        )

    @staticmethod
    def _completeness(d: Dossier) -> float:
        """Score 0..1 según secciones rellenas."""
        filled = sum(1 for s in d.sections.values() if str(s).strip())
        filled += 1 if d.executive_summary else 0
        filled += 1 if d.one_liner else 0
        filled += 1 if d.key_facts else 0
        filled += 1 if d.today_actions else 0
        filled += 1 if d.watch_next else 0
        filled += 1 if d.risks else 0
        filled += 1 if d.opportunities else 0
        filled += 1 if d.timeline else 0
        filled += 1 if d.scenarios else 0
        filled += 1 if d.relations else 0
        return min(1.0, filled / 16.0)
