"""
Actor Graph Extractor · construye el grafo de relaciones políticas a partir
de noticias, declaraciones y biografías. Servicio invisible: alimenta
`D2_Actores.py` con edges tipados, fechados y con evidencia.

Cada noticia que menciona dos actores se convierte en candidato a edge.
El brain decide tipo, valencia, fuerza y dirección de la relación. La
agregación temporal permite detectar:
  · Cuándo una alianza se convierte en tensión.
  · Cuándo una tensión se convierte en pacto.
  · Redes implícitas (mismos socios → afinidad probable).

Salida estructurada lista para insertar en `ontology_graph` (tabla edges).

Uso típico (job batch tras ingesta de noticias):

    extractor = ActorGraphExtractor(actor_catalog=catalogo)
    edges = extractor.extract_from_news(
        text="Sánchez agradece a Junts su apoyo a la senda de estabilidad.",
        date_iso="2026-05-18", source="europapress",
    )
    # → [{from: actor_psoe_001, to: actor_junts_001, type: "alianza_tactica",
    #     valence: 0.7, strength: 0.6, date: "2026-05-18", evidence: "Sánchez agradece..."}]
"""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class GraphEdge:
    """Edge candidato del grafo de actores."""

    actor_from: str         # actor_id
    actor_to: str           # actor_id
    actor_from_name: str = ""
    actor_to_name: str = ""

    relation_type: str = ""  # alianza | conflicto | subordinacion | competencia | mentor | familiar | etc.
    valence: float = 0.0     # -1..1 (-1 hostilidad, +1 alianza)
    strength: float = 0.5    # 0..1 intensidad
    directionality: str = "bidirectional"  # bidirectional | from_to | to_from

    date_iso: str = ""
    evidence_text: str = ""
    source: str = ""
    confidence: float = 0.0

    def edge_key(self) -> tuple[str, str, str]:
        """Clave canónica (ordenada para bidireccionales)."""
        if self.directionality == "bidirectional":
            a, b = sorted([self.actor_from, self.actor_to])
            return (a, b, self.relation_type)
        return (self.actor_from, self.actor_to, self.relation_type)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class GraphAggregation:
    """Agregación temporal de edges del mismo tipo entre dos actores."""

    actor_a: str
    actor_b: str
    relation_type: str
    edges_count: int = 0
    avg_valence: float = 0.0
    avg_strength: float = 0.0
    first_seen: str = ""
    last_seen: str = ""
    evidence_excerpts: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────
# Extractor
# ─────────────────────────────────────────────────────────────────

# Heurísticas de tipo de relación según verbos
_RELATION_PATTERNS = {
    "alianza":      ["pacta", "acuerda", "alía", "apoya", "respalda", "respaldó", "rescata", "agradece", "firma"],
    "conflicto":    ["acusa", "denuncia", "ataca", "critica", "veta", "rompe", "exige", "amenaza", "rechaza"],
    "competencia":  ["compite", "supera", "rebasa", "adelanta", "desbanca"],
    "mentor":       ["forma", "promovió", "designó", "nombró"],
    "subordinacion":["destituye", "nombra", "cesa", "sustituye"],
}


def _detect_relation_heuristic(text: str) -> tuple[str | None, float]:
    """Heurística rápida: tipo + valencia desde verbos. Es solo prior."""
    t = (text or "").lower()
    best_type = None
    best_count = 0
    for rel_type, verbs in _RELATION_PATTERNS.items():
        count = sum(1 for v in verbs if v in t)
        if count > best_count:
            best_count = count
            best_type = rel_type
    valence = 0.0
    if best_type == "alianza":
        valence = 0.6
    elif best_type == "conflicto":
        valence = -0.6
    elif best_type == "subordinacion":
        valence = -0.2
    elif best_type == "competencia":
        valence = -0.3
    elif best_type == "mentor":
        valence = 0.4
    return best_type, valence


class ActorGraphExtractor:
    """Convierte noticias en edges tipados del grafo de actores."""

    def __init__(
        self,
        *,
        actor_catalog: list[Any] | None = None,
        brain: Any = None,
    ) -> None:
        from agents.brain.pipelines.entity_resolver import EntityResolver
        self._resolver = EntityResolver(actor_catalog or [], brain=brain)
        self._brain = brain

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("ActorGraphExtractor: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    def extract_from_news(
        self,
        text: str,
        *,
        date_iso: str | None = None,
        source: str = "",
    ) -> list[GraphEdge]:
        """Extrae edges candidatos de UNA noticia."""
        if not text or not str(text).strip():
            return []

        mentions = self._resolver.resolve(text=text, date=date_iso, source=source)
        actors_in_text = [m for m in mentions if m.canonical and m.actor_id]
        # Necesitamos al menos 2 actores distintos en el texto
        if len(actors_in_text) < 2:
            return []

        # Heurística rápida sobre todo el texto (prior)
        heur_type, heur_valence = _detect_relation_heuristic(text)

        edges: list[GraphEdge] = []
        # Para cada par único, generamos un candidato; el brain refina si está disponible
        seen_pairs: set[tuple[str, str]] = set()
        for i, a in enumerate(actors_in_text):
            for b in actors_in_text[i + 1:]:
                key = tuple(sorted([str(a.actor_id), str(b.actor_id)]))
                if key in seen_pairs or a.actor_id == b.actor_id:
                    continue
                seen_pairs.add(key)
                edge = GraphEdge(
                    actor_from=str(a.actor_id),
                    actor_to=str(b.actor_id),
                    actor_from_name=a.canonical,
                    actor_to_name=b.canonical,
                    relation_type=heur_type or "menciona_junto",
                    valence=heur_valence,
                    strength=0.4 if heur_type is None else 0.6,
                    directionality="bidirectional",
                    date_iso=date_iso or "",
                    evidence_text=text[:240],
                    source=source,
                    confidence=0.4 if heur_type is None else 0.6,
                )
                edges.append(edge)

        # Si hay brain y la heurística no es concluyente, refinamos los TOP-N
        brain = self._get_brain()
        if brain is not None and edges:
            # Solo refinamos los 2 primeros para limitar tokens
            for edge in edges[:2]:
                self._refine_edge_with_brain(edge, text=text, brain=brain)
        return edges

    # ─────────────────────────────────────────────────────────────
    def _refine_edge_with_brain(
        self,
        edge: GraphEdge,
        *,
        text: str,
        brain: Any,
    ) -> None:
        """Pide al brain que confirme tipo + valencia + dirección del edge."""
        try:
            out = brain.analyze_legislative_position(
                actor_or_party=edge.actor_from_name,
                law_or_topic=f"Relación con {edge.actor_to_name}",
                historical_votes="",
                public_statements=[text[:1500]],
            )
        except Exception as exc:
            logger.warning("brain refinement edge falló: %s", exc)
            return
        if not out.get("ok"):
            return
        r = out.get("result")
        if not isinstance(r, dict):
            return
        # Extraemos pistas:
        ic = r.get("internal_dissent") or {}
        if isinstance(ic, dict) and ic.get("existe"):
            # Si hay disenso, indica que la relación tiene matiz; bajamos strength
            edge.strength = max(0.2, edge.strength - 0.1)
        levers = r.get("negotiation_levers") or []
        if isinstance(levers, list) and levers:
            # Hay palancas de negociación → indica alianza condicional
            if edge.valence > 0:
                edge.relation_type = "alianza_tactica"
                edge.confidence = min(1.0, edge.confidence + 0.15)
        # Si el predicted_vote es contundente, tipificamos relación
        pv = str(r.get("predicted_vote") or "")
        if pv == "a_favor" and edge.valence > 0:
            edge.relation_type = "alianza"
            edge.confidence = min(1.0, edge.confidence + 0.2)
        elif pv == "en_contra":
            edge.relation_type = "conflicto"
            edge.valence = -0.6
            edge.confidence = min(1.0, edge.confidence + 0.2)

    # ─────────────────────────────────────────────────────────────
    def aggregate_edges(
        self,
        edges: list[GraphEdge],
        *,
        min_count: int = 2,
    ) -> list[GraphAggregation]:
        """Consolida edges del mismo par + tipo en uno agregado temporal."""
        buckets: dict[tuple, list[GraphEdge]] = defaultdict(list)
        for e in edges:
            buckets[e.edge_key()].append(e)
        out: list[GraphAggregation] = []
        for key, group in buckets.items():
            if len(group) < int(min_count):
                continue
            a, b, rel = key
            valences = [g.valence for g in group]
            strengths = [g.strength for g in group]
            dates = sorted([g.date_iso for g in group if g.date_iso])
            agg = GraphAggregation(
                actor_a=a, actor_b=b, relation_type=rel,
                edges_count=len(group),
                avg_valence=sum(valences) / max(1, len(valences)),
                avg_strength=sum(strengths) / max(1, len(strengths)),
                first_seen=(dates[0] if dates else ""),
                last_seen=(dates[-1] if dates else ""),
                evidence_excerpts=[g.evidence_text for g in group[:5]],
                sources=list({g.source for g in group if g.source})[:8],
            )
            out.append(agg)
        # Orden: por última aparición desc
        out.sort(key=lambda x: x.last_seen, reverse=True)
        return out

    # ─────────────────────────────────────────────────────────────
    def detect_relation_changes(
        self,
        edges: list[GraphEdge],
    ) -> list[dict[str, Any]]:
        """Detecta cambios temporales en relaciones (alianza→conflicto y viceversa).

        Devuelve lista de eventos `{pair, from_type, to_type, date_change}`.
        """
        # Agrupamos por pair (no por tipo) y ordenamos por fecha
        timelines: dict[tuple[str, str], list[GraphEdge]] = defaultdict(list)
        for e in edges:
            a, b = sorted([e.actor_from, e.actor_to])
            timelines[(a, b)].append(e)

        changes: list[dict[str, Any]] = []
        for pair, group in timelines.items():
            group_sorted = sorted(group, key=lambda x: x.date_iso or "")
            prev_type = None
            for e in group_sorted:
                if prev_type and e.relation_type != prev_type:
                    # Cambio detectado solo si los tipos son antagónicos
                    if {prev_type, e.relation_type} <= {"alianza", "alianza_tactica", "conflicto"}:
                        changes.append({
                            "actor_a": pair[0],
                            "actor_b": pair[1],
                            "from_type": prev_type,
                            "to_type": e.relation_type,
                            "date_change": e.date_iso,
                            "evidence": e.evidence_text[:200],
                            "source": e.source,
                        })
                prev_type = e.relation_type
        return changes
