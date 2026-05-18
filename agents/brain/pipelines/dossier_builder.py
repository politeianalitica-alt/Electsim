"""
Dossier Builder · genera dossieres completos de actores, issues, territorios
y campañas combinando datos estructurados (BD) + IA narrativa (Groq).

Un dossier es un documento estructurado listo para:
  · `D1_Briefings.py` (Streamlit) y `/briefing` (Next.js)
  · Exportación PDF/DOCX desde `dashboard/services/document_core.py`
  · Inserción en ChromaDB como memoria institucional

Tipos:
  · ActorDossier      — perfil 360, votaciones, controversias, vulnerabilidades
  · IssueDossier      — evolución, posiciones partidos, cronología, perspectiva
  · TerritoryDossier  — historia, economía, política local, dinámica electoral
  · CampaignDossier   — análisis de campaña (en curso o retrospectivo)

Cada dossier admite 3 profundidades:
  · "short"   → 1 página · jefatura política
  · "medium"  → 5 páginas · consultor
  · "deep"    → 10 páginas · analista
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
class Dossier:
    """Documento estructurado con secciones narrativas razonadas."""

    type: str               # actor | issue | territory | campaign
    subject: str            # nombre del actor / issue / territorio / campaña
    depth: str = "medium"   # short | medium | deep
    date_generated: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    # Cabecera
    executive_summary: str = ""
    key_facts: list[str] = field(default_factory=list)

    # Secciones (todas opcionales — depende del tipo)
    sections: dict[str, str] = field(default_factory=dict)

    # Datos estructurados embebidos
    structured_data: dict[str, Any] = field(default_factory=dict)

    # Recomendaciones
    today_actions: list[str] = field(default_factory=list)
    watch_next: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    opportunities: list[str] = field(default_factory=list)

    # Citaciones
    sources_used: list[dict[str, Any]] = field(default_factory=list)

    # Trazas
    ok: bool = False
    error: str | None = None
    confidence: float = 0.0
    tokens_used: int = 0
    latency_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────────────────────────
# Builder
# ─────────────────────────────────────────────────────────────────

class DossierBuilder:
    """Compone dossieres completos a partir de datos crudos + brain."""

    def __init__(self, *, brain: Any = None) -> None:
        self._brain = brain

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

    # ─────────────────────────────────────────────────────────────
    def build_actor_dossier(
        self,
        actor_name: str,
        *,
        role: str = "",
        biography: str = "",
        declarations_recent: list[str] | None = None,
        votes_recent: list[dict[str, Any]] | None = None,
        controversies: list[str] | None = None,
        depth: str = "medium",
    ) -> Dossier:
        """Dossier de actor político: perfil 360 + investigación competitiva."""
        d = Dossier(type="actor", subject=actor_name, depth=depth)
        d.structured_data = {
            "role": role,
            "votes_recent": votes_recent or [],
            "controversies": controversies or [],
            "declarations_recent": declarations_recent or [],
        }
        brain = self._get_brain()
        if brain is None:
            d.error = "brain no disponible"
            return d

        # 1) Perfil 360
        try:
            prof = brain.build_actor_profile(
                actor_name=actor_name, role=role,
                known_facts=biography or [],
                recent_statements=declarations_recent or [],
            )
        except Exception as exc:
            d.error = f"build_actor_profile: {type(exc).__name__}"
            return d
        if prof.get("ok") and isinstance(prof.get("result"), dict):
            r = prof["result"]
            d.executive_summary = str(r.get("biography_short") or "")
            d.sections["politico_style"] = str(r.get("political_style") or "")
            d.sections["momentum"] = str(r.get("momentum") or "")
            d.sections["strengths"] = "\n".join(map(str, r.get("strengths") or []))
            d.sections["weaknesses"] = "\n".join(map(str, r.get("weaknesses") or []))
            d.sections["leverage_points"] = "\n".join(map(str, r.get("leverage_points") or []))
            d.sections["predicted_next_move"] = str(r.get("predicted_next_move") or "")
            d.key_facts.extend(map(str, r.get("strengths") or []))
            d.confidence = max(d.confidence, float(r.get("confidence") or 0.0))
            d.tokens_used += int(prof.get("tokens_used") or 0)
            d.latency_ms += int(prof.get("latency_ms") or 0)

        # 2) Investigación competitiva si depth >= medium
        if depth in {"medium", "deep"}:
            try:
                opp = brain.opposition_research(
                    target_actor=actor_name,
                    client_position="análisis interno · sin posicionamiento partidista",
                    recent_actions=(declarations_recent or [])[:5],
                    time_window="últimos 6 meses",
                )
            except Exception as exc:
                opp = {"ok": False, "error": str(exc)}
            if opp.get("ok") and isinstance(opp.get("result"), dict):
                r = opp["result"]
                vuls = r.get("vulnerabilities") or []
                if isinstance(vuls, list):
                    d.risks = [
                        (v.get("detail") if isinstance(v, dict) else str(v))
                        for v in vuls[:6] if v
                    ]
                d.sections["attack_vectors"] = "\n".join(
                    (av.get("vector") if isinstance(av, dict) else str(av))
                    for av in (r.get("attack_vectors") or [])[:6]
                )
                d.sections["predicted_responses"] = "\n".join(
                    (pr.get("likely_response") if isinstance(pr, dict) else str(pr))
                    for pr in (r.get("predicted_responses") or [])[:5]
                )
                d.tokens_used += int(opp.get("tokens_used") or 0)
                d.latency_ms += int(opp.get("latency_ms") or 0)

        # 3) Validación con declaraciones — si profundo
        if depth == "deep" and controversies:
            d.sections["controversies"] = "\n".join(controversies[:10])

        d.ok = True
        return d

    # ─────────────────────────────────────────────────────────────
    def build_issue_dossier(
        self,
        issue_name: str,
        *,
        descripcion: str = "",
        cronologia: list[dict[str, Any]] | None = None,
        posiciones_partidos: dict[str, str] | None = None,
        estado_actual: str = "",
        depth: str = "medium",
    ) -> Dossier:
        """Dossier de un issue político (vivienda, amnistía, energía…)."""
        d = Dossier(type="issue", subject=issue_name, depth=depth)
        d.structured_data = {
            "cronologia": cronologia or [],
            "posiciones_partidos": posiciones_partidos or {},
            "estado_actual": estado_actual,
        }
        brain = self._get_brain()
        if brain is None:
            d.error = "brain no disponible"
            return d

        situacion = (
            f"Issue: {issue_name}\n"
            f"Descripción: {descripcion}\n"
            f"Estado actual: {estado_actual}\n"
            f"Posiciones partidos: {posiciones_partidos or {}}\n"
            f"Cronología: {cronologia or []}"
        )[:7000]

        # 1) Escenarios prospectivos
        try:
            sc = brain.forecast_political_scenario(
                topic=issue_name, current_situation=situacion,
                time_horizon="6-12 meses", constraints=[],
            )
        except Exception as exc:
            sc = {"ok": False, "error": str(exc)}
        if sc.get("ok") and isinstance(sc.get("result"), dict):
            r = sc["result"]
            scenarios = r.get("scenarios") or []
            d.sections["scenarios"] = "\n\n".join(
                f"{(s.get('name') or '').upper()} (p={s.get('probability', 0):.2f}): {s.get('narrative', '')}"
                for s in scenarios[:4] if isinstance(s, dict)
            )
            d.watch_next = [str(w) for w in (r.get("watch_list") or [])][:8]
            d.tokens_used += int(sc.get("tokens_used") or 0)
            d.latency_ms += int(sc.get("latency_ms") or 0)

        # 2) Análisis de narrativa
        try:
            nr = brain.analyze_narrative(
                pieces=[descripcion, estado_actual] + [
                    str((c.get("titular") if isinstance(c, dict) else c))
                    for c in (cronologia or [])[:8] if c
                ],
                topic=issue_name,
                time_window="últimos 12 meses",
            )
        except Exception as exc:
            nr = {"ok": False, "error": str(exc)}
        if nr.get("ok") and isinstance(nr.get("result"), dict):
            r = nr["result"]
            d.executive_summary = str(r.get("core_claim") or "")
            d.sections["narrative_arc"] = str(r.get("plot_arc") or "")
            d.sections["amplifiers"] = "\n".join(map(str, r.get("amplifiers") or []))
            d.sections["counter_narratives"] = "\n".join(map(str, r.get("counter_narratives") or []))
            d.tokens_used += int(nr.get("tokens_used") or 0)
            d.latency_ms += int(nr.get("latency_ms") or 0)

        d.ok = True
        return d

    # ─────────────────────────────────────────────────────────────
    def build_territory_dossier(
        self,
        territory_name: str,
        *,
        ccaa: str = "",
        datos_socioeco: dict[str, Any] | None = None,
        historico_electoral: list[dict[str, Any]] | None = None,
        lideres_actuales: list[dict[str, str]] | None = None,
        wikipedia_excerpt: str = "",
        depth: str = "medium",
    ) -> Dossier:
        """Dossier de territorio (municipio/provincia/CCAA)."""
        from agents.brain.pipelines.territorios_enricher import TerritoriosEnricher
        enricher = TerritoriosEnricher(brain=self._brain)
        profile = enricher.enrich_municipio(
            nombre=territory_name, ccaa=ccaa, provincia="",
            datos_ine=datos_socioeco, historico_electoral=historico_electoral,
            alcalde_actual=(lideres_actuales[0].get("nombre") if lideres_actuales else ""),
            wikipedia_excerpt=wikipedia_excerpt,
        )
        d = Dossier(type="territory", subject=territory_name, depth=depth)
        if not profile.ok:
            d.error = profile.error
            return d
        d.executive_summary = profile.sintesis_politica
        d.sections["perfil_socioeconomico"] = profile.perfil_socioeconomico
        d.sections["historia_politica"] = profile.historia_politica
        d.sections["dinamica_actual"] = profile.dinamica_actual
        d.sections["perfil_voto"] = profile.perfil_voto
        d.key_facts = profile.issues_locales_principales
        d.today_actions = profile.palancas_movilizacion
        d.watch_next = profile.factores_basculantes
        d.structured_data = {
            "es_bisagra": profile.es_municipio_bisagra,
            "alcalde": profile.alcalde_actual,
            "tipos_campana_efectivos": profile.tipos_campana_efectivos,
        }
        d.tokens_used += profile.tokens_used
        d.latency_ms += profile.latency_ms
        d.confidence = profile.confidence
        d.ok = True
        return d

    # ─────────────────────────────────────────────────────────────
    def build_campaign_dossier(
        self,
        campaign_name: str,
        *,
        candidato: str,
        partido: str,
        territorio: str,
        kpis: dict[str, Any] | None = None,
        eventos_recientes: list[str] | None = None,
        depth: str = "medium",
    ) -> Dossier:
        """Dossier de campaña electoral (en curso o retrospectivo)."""
        d = Dossier(type="campaign", subject=campaign_name, depth=depth)
        d.structured_data = {
            "candidato": candidato, "partido": partido,
            "territorio": territorio, "kpis": kpis or {},
        }
        brain = self._get_brain()
        if brain is None:
            d.error = "brain no disponible"
            return d

        # 1) War room summary
        try:
            wr = brain.generate_war_room_summary(
                situation=f"Campaña {campaign_name} · candidato {candidato} ({partido}) · territorio {territorio}",
                signals=[f"{k}={v}" for k, v in (kpis or {}).items()][:10],
                adversary_moves=[],
                client_assets=[],
                time_pressure="ciclo de campaña",
            )
        except Exception as exc:
            wr = {"ok": False, "error": str(exc)}
        if wr.get("ok"):
            d.sections["war_room"] = str(wr.get("result") or "")
            d.tokens_used += int(wr.get("tokens_used") or 0)
            d.latency_ms += int(wr.get("latency_ms") or 0)

        # 2) Voto blando del partido en ese territorio
        try:
            sv = brain.analyze_soft_vote(
                party=partido, territory=territorio,
                polls_summary=str(kpis or {}),
                segments_data={},
            )
        except Exception as exc:
            sv = {"ok": False, "error": str(exc)}
        if sv.get("ok") and isinstance(sv.get("result"), dict):
            r = sv["result"]
            d.opportunities = [
                (s.get("name") if isinstance(s, dict) else str(s))
                for s in (r.get("soft_voter_segments") or [])[:5]
            ]
            d.today_actions = [
                (m.get("claim") if isinstance(m, dict) else str(m))
                for m in (r.get("persuasive_messages") or [])[:5]
            ]
            d.tokens_used += int(sv.get("tokens_used") or 0)
            d.latency_ms += int(sv.get("latency_ms") or 0)

        d.ok = True
        return d
