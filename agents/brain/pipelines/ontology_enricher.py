"""
Ontology Enricher · usa el GroqBrain para poblar y mejorar la ontología.

La ontología (`ontology/`) define tipos canónicos (Actor, Partido,
Institución, Ley, Evento, Lugar, Tema) que el resto del sistema consulta
para razonar de forma coherente. Suele crecer poco porque alta manual = caro.

Este enricher cierra el círculo:
  1. Toma textos crudos (noticias, transcripciones, BOE, declaraciones).
  2. Pide al brain `extract_political_entities` → entidades estructuradas.
  3. Compara con la ontología existente (catálogo de actores / partidos).
  4. Propone:
        · `new_entities` — candidatas a insertarse en la ontología.
        · `alias_suggestions` — sinónimos para entidades existentes.
        · `relations` — relaciones (Actor↔Partido, Ley↔Institución, etc.).
        · `temporal_facts` — datos con fecha (afiliación, cargo, evento).

NUNCA escribe directamente en BD: produce un `EnrichmentProposal` que un
humano (o un job auditado) puede aplicar. Si en el futuro queremos
auto-aplicación, hay un placeholder `auto_apply()`.

Uso:

    from agents.brain.pipelines.ontology_enricher import OntologyEnricher
    enricher = OntologyEnricher(known_actors={"Pedro Sánchez", "Feijóo"},
                                known_parties={"PSOE", "PP", "VOX"})
    proposal = enricher.enrich_text(texto, source="elpais_politica")
    print(proposal.summary())
"""
from __future__ import annotations

import logging
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class EnrichmentProposal:
    """Propuesta de cambios a la ontología derivada de un texto."""

    text_id: str = ""
    source: str = ""

    # Entidades nuevas (candidatas)
    new_actors: list[dict[str, Any]] = field(default_factory=list)
    new_parties: list[dict[str, Any]] = field(default_factory=list)
    new_institutions: list[dict[str, Any]] = field(default_factory=list)
    new_laws: list[dict[str, Any]] = field(default_factory=list)
    new_events: list[dict[str, Any]] = field(default_factory=list)
    new_locations: list[dict[str, Any]] = field(default_factory=list)
    new_topics: list[str] = field(default_factory=list)

    # Alias para entidades existentes
    alias_suggestions: list[dict[str, str]] = field(default_factory=list)

    # Relaciones detectadas (Actor↔Partido, Ley↔Institución, etc.)
    relations: list[dict[str, Any]] = field(default_factory=list)

    # Hechos con fecha (afiliación, cargo, votación, evento)
    temporal_facts: list[dict[str, Any]] = field(default_factory=list)

    # Trazas
    raw_entities: dict[str, Any] | None = None
    error: str | None = None
    ok: bool = False

    def summary(self) -> str:
        return (
            f"[{self.source}] "
            f"+{len(self.new_actors)} actores, "
            f"+{len(self.new_parties)} partidos, "
            f"+{len(self.new_laws)} leyes, "
            f"+{len(self.new_events)} eventos, "
            f"+{len(self.alias_suggestions)} aliases, "
            f"+{len(self.relations)} relaciones, "
            f"+{len(self.temporal_facts)} hechos temporales"
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "text_id": self.text_id,
            "source": self.source,
            "ok": self.ok,
            "error": self.error,
            "counts": {
                "new_actors": len(self.new_actors),
                "new_parties": len(self.new_parties),
                "new_institutions": len(self.new_institutions),
                "new_laws": len(self.new_laws),
                "new_events": len(self.new_events),
                "new_locations": len(self.new_locations),
                "new_topics": len(self.new_topics),
                "alias_suggestions": len(self.alias_suggestions),
                "relations": len(self.relations),
                "temporal_facts": len(self.temporal_facts),
            },
            "new_actors": self.new_actors,
            "new_parties": self.new_parties,
            "new_institutions": self.new_institutions,
            "new_laws": self.new_laws,
            "new_events": self.new_events,
            "new_locations": self.new_locations,
            "new_topics": self.new_topics,
            "alias_suggestions": self.alias_suggestions,
            "relations": self.relations,
            "temporal_facts": self.temporal_facts,
        }


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _norm(text: str) -> str:
    return (text or "").strip().lower()


def _is_known(name: str, known: set[str]) -> bool:
    return _norm(name) in {_norm(k) for k in known}


def _to_dict_name(item: Any, default_key: str = "name") -> dict[str, Any]:
    if isinstance(item, dict):
        return item
    return {default_key: str(item)}


# ─────────────────────────────────────────────────────────────────
# Enricher principal
# ─────────────────────────────────────────────────────────────────

class OntologyEnricher:
    """Pipeline IA → propuesta de ontología.

    No depende del backend de BD para extraer; sólo se le pasa el set de
    entidades conocidas para detectar novedades y alias.
    """

    def __init__(
        self,
        *,
        known_actors: set[str] | None = None,
        known_parties: set[str] | None = None,
        known_institutions: set[str] | None = None,
        known_laws: set[str] | None = None,
        brain: Any = None,
    ) -> None:
        self.known_actors = set(known_actors or [])
        self.known_parties = set(known_parties or [])
        self.known_institutions = set(known_institutions or [])
        self.known_laws = set(known_laws or [])
        self._brain = brain

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("OntologyEnricher: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    def enrich_text(
        self,
        text: str,
        *,
        source: str = "",
        text_id: str = "",
        context: str = "",
    ) -> EnrichmentProposal:
        """Extrae entidades del texto y produce propuesta de cambios."""
        proposal = EnrichmentProposal(text_id=text_id, source=source)
        if not text or not str(text).strip():
            proposal.error = "texto vacío"
            return proposal

        brain = self._get_brain()
        if brain is None:
            proposal.error = "brain no disponible"
            return proposal

        try:
            ent_resp = brain.extract_political_entities(text=text, context=context)
        except Exception as exc:
            proposal.error = f"extract_political_entities: {type(exc).__name__}"
            return proposal

        if not ent_resp.get("ok"):
            proposal.error = ent_resp.get("error") or "extracción falló"
            proposal.raw_entities = ent_resp
            return proposal

        proposal.raw_entities = ent_resp
        result = ent_resp.get("result") or {}
        if not isinstance(result, dict):
            proposal.error = "respuesta sin estructura esperada"
            return proposal

        # ──── Actores nuevos ────────────────────────────────────
        for raw in (result.get("actors") or []):
            if not raw:
                continue
            item = _to_dict_name(raw)
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            if _is_known(name, self.known_actors):
                # Si la versión es ligeramente distinta (ej: "Pedro Sanchez" vs "Pedro Sánchez"), proponer alias
                canonical = next(
                    (k for k in self.known_actors if _norm(k) != _norm(name) and _norm(k) in _norm(name)),
                    None,
                )
                if canonical:
                    proposal.alias_suggestions.append({
                        "type": "Actor", "canonical": canonical, "alias": name,
                    })
                continue
            proposal.new_actors.append({
                "name": name,
                "role": item.get("role") or "",
                "party": item.get("party") or "",
                "evidence_source": source,
            })
            # Relación Actor↔Partido si conocemos el partido
            if item.get("party") and _is_known(item["party"], self.known_parties):
                proposal.relations.append({
                    "type": "actor_in_party",
                    "from": name,
                    "to": item["party"],
                    "evidence_source": source,
                })

        # ──── Partidos ──────────────────────────────────────────
        for raw in (result.get("parties") or []):
            name = str(raw or "").strip()
            if not name:
                continue
            if _is_known(name, self.known_parties):
                continue
            proposal.new_parties.append({"name": name, "evidence_source": source})

        # ──── Instituciones ─────────────────────────────────────
        for raw in (result.get("institutions") or []):
            name = str(raw or "").strip()
            if not name:
                continue
            if _is_known(name, self.known_institutions):
                continue
            proposal.new_institutions.append({"name": name, "evidence_source": source})

        # ──── Leyes ─────────────────────────────────────────────
        for raw in (result.get("laws") or []):
            item = _to_dict_name(raw)
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            if _is_known(name, self.known_laws):
                continue
            proposal.new_laws.append({
                "name": name,
                "type": item.get("type") or "ley",
                "estado": item.get("estado") or "",
                "evidence_source": source,
            })

        # ──── Eventos ───────────────────────────────────────────
        for raw in (result.get("events") or []):
            item = _to_dict_name(raw)
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            event_data = {
                "name": name,
                "date": item.get("date") or "",
                "type": item.get("type") or "",
                "evidence_source": source,
            }
            proposal.new_events.append(event_data)
            if item.get("date"):
                proposal.temporal_facts.append({
                    "fact": "event_occurred",
                    "entity": name,
                    "date": item.get("date"),
                    "type": item.get("type") or "",
                    "evidence_source": source,
                })

        # ──── Lugares ───────────────────────────────────────────
        for raw in (result.get("locations") or []):
            name = str(raw or "").strip()
            if not name:
                continue
            proposal.new_locations.append({"name": name, "evidence_source": source})

        # ──── Topics ────────────────────────────────────────────
        for raw in (result.get("topics") or []):
            t = str(raw or "").strip()
            if t:
                proposal.new_topics.append(t)

        proposal.ok = True
        return proposal

    # ─────────────────────────────────────────────────────────────
    def enrich_batch(
        self,
        items: list[dict[str, Any]],
        *,
        max_workers: int = 4,
    ) -> list[EnrichmentProposal]:
        """Procesa una lista de docs `{text, source?, text_id?, context?}`."""
        from concurrent.futures import ThreadPoolExecutor, as_completed
        results: list[EnrichmentProposal] = []
        with ThreadPoolExecutor(max_workers=max(1, int(max_workers))) as ex:
            futures = [ex.submit(self.enrich_text, **it) for it in items]
            for fut in as_completed(futures):
                try:
                    results.append(fut.result())
                except Exception as exc:
                    logger.exception("enrich_batch worker failed")
                    results.append(EnrichmentProposal(error=f"{type(exc).__name__}: {exc}"))
        return results

    # ─────────────────────────────────────────────────────────────
    def aggregate_proposals(
        self,
        proposals: list[EnrichmentProposal],
        *,
        min_frequency: int = 2,
    ) -> dict[str, Any]:
        """Consolida varias propuestas por frecuencia. Útil para producir
        un único "candidatos a aprobar" tras procesar muchos documentos.
        """
        actors_freq = Counter()
        parties_freq = Counter()
        institutions_freq = Counter()
        laws_freq = Counter()
        events_freq = Counter()
        locations_freq = Counter()
        topics_freq = Counter()
        relations_freq = Counter()
        alias_freq = Counter()

        for p in proposals:
            if not p.ok:
                continue
            for a in p.new_actors:
                actors_freq[a["name"]] += 1
            for q in p.new_parties:
                parties_freq[q["name"]] += 1
            for i in p.new_institutions:
                institutions_freq[i["name"]] += 1
            for l in p.new_laws:
                laws_freq[l["name"]] += 1
            for e in p.new_events:
                events_freq[e["name"]] += 1
            for loc in p.new_locations:
                locations_freq[loc["name"]] += 1
            for t in p.new_topics:
                topics_freq[t] += 1
            for r in p.relations:
                relations_freq[(r["type"], r["from"], r["to"])] += 1
            for a in p.alias_suggestions:
                alias_freq[(a["type"], a["canonical"], a["alias"])] += 1

        def _filter(c: Counter) -> list[dict[str, Any]]:
            return [
                {"name": k, "frequency": v}
                for k, v in c.most_common()
                if v >= int(min_frequency)
            ]

        def _filter_tuple(c: Counter, keys: list[str]) -> list[dict[str, Any]]:
            out: list[dict[str, Any]] = []
            for tup, v in c.most_common():
                if v < int(min_frequency):
                    continue
                d = {keys[i]: tup[i] for i in range(len(keys))}
                d["frequency"] = v
                out.append(d)
            return out

        return {
            "actors": _filter(actors_freq),
            "parties": _filter(parties_freq),
            "institutions": _filter(institutions_freq),
            "laws": _filter(laws_freq),
            "events": _filter(events_freq),
            "locations": _filter(locations_freq),
            "topics": _filter(topics_freq),
            "relations": _filter_tuple(relations_freq, ["type", "from", "to"]),
            "aliases": _filter_tuple(alias_freq, ["type", "canonical", "alias"]),
            "total_proposals": len(proposals),
            "successful_proposals": sum(1 for p in proposals if p.ok),
            "min_frequency": int(min_frequency),
        }

    # ─────────────────────────────────────────────────────────────
    def auto_apply(self, proposal: EnrichmentProposal, *, dry_run: bool = True) -> dict[str, Any]:
        """Placeholder · aplicación automática deshabilitada por defecto.

        Cuando se conecte a `ontology.objects.OntologyStore.create_*` deberá:
          1. Insertar entidades en la tabla correspondiente con tenant_id.
          2. Crear relaciones via OntologyGraphRepository.
          3. Registrar trazas en decision_log.

        Por seguridad, hoy solo simula y devuelve un informe.
        """
        return {
            "dry_run": True,
            "would_create": proposal.to_dict()["counts"],
            "note": "Auto-apply deshabilitado. Implementar conexión a OntologyStore en producción.",
        }
