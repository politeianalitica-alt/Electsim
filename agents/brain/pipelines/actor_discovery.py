"""
Actor Discovery · descubre actores políticos que aparecen en noticias pero
no están en el catálogo. Para cada candidato:

  1. Verifica que aparece consistentemente (≥ N noticias).
  2. Busca su página en Wikipedia ES.
  3. Si Wikipedia confirma que es figura pública política, propone añadirlo
     al catálogo con perfil inicial (nombre, partido, cargo, biografía corta).
  4. Genera un `ActorProposal` que un humano puede revisar y aprobar.

NO escribe al catálogo. Devuelve propuestas.

Uso típico (job nocturno tras ingesta de noticias):

    disc = ActorDiscovery(actor_catalog=existentes)
    proposals = disc.discover_from_texts(
        texts=[(art["contenido"], art["fecha_pub"], art["medio"]) for art in noticias],
        min_mentions=3,
    )
    for p in proposals:
        if p.wiki_found and p.confidence >= 0.7:
            review_queue.append(p)
"""
from __future__ import annotations

import logging
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class ActorProposal:
    """Propuesta de actor nuevo para revisión humana."""
    surface_canonical: str          # nombre tal cual aparece en hemeroteca
    proposed_actor_id: str = ""     # slug auto-generado (a_apellido_n)
    proposed_name: str = ""
    proposed_short_name: str = ""
    proposed_surname: str = ""

    # Evidencia de prensa
    mention_count: int = 0
    mention_sources: list[str] = field(default_factory=list)
    mention_dates: list[str] = field(default_factory=list)
    sample_contexts: list[str] = field(default_factory=list)

    # Confirmación Wikipedia
    wiki_found: bool = False
    wiki_url: str = ""
    wiki_summary: str = ""
    wiki_birth_date: str = ""
    wiki_birth_place: str = ""
    wiki_party: str = ""
    wiki_office: str = ""

    # Decisión brain
    is_political_figure: bool = False
    suggested_role: str = ""
    suggested_party: str = ""
    confidence: float = 0.0
    rationale: str = ""

    # Trazas
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# Pattern para nombres compuestos (2-4 palabras capitalizadas)
_FULL_NAME_RE = re.compile(
    r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+(?:de|del|de la|de los|y|i|von|van)\s+)?(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b"
)

_SENTENCE_LEADERS = {
    "hoy", "ayer", "mañana", "anoche", "esta", "este", "el", "la", "los", "las",
    "según", "por", "tras", "antes", "después",
    "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre",
}


def _norm_lower(s: str) -> str:
    return (s or "").strip().lower()


def _slug(name: str) -> str:
    """Genera un actor_id provisional."""
    import unicodedata
    base = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-zA-Z0-9 ]", "", base).strip().lower().replace(" ", "_")
    return f"a_{base}"[:50]


# ─────────────────────────────────────────────────────────────────
# Discovery
# ─────────────────────────────────────────────────────────────────

class ActorDiscovery:
    """Descubre actores nuevos a partir de noticias + Wikipedia + brain."""

    def __init__(
        self,
        *,
        actor_catalog: list[Any] | None = None,
        brain: Any = None,
        wiki: Any = None,
    ) -> None:
        from agents.brain.pipelines.entity_resolver import ActorCanonical
        self.known_names: set[str] = set()
        for x in actor_catalog or []:
            if isinstance(x, ActorCanonical):
                for k in {x.name, x.short_name, x.surname, *x.aliases}:
                    if k:
                        self.known_names.add(_norm_lower(k))
            elif isinstance(x, dict):
                for k in {x.get("name"), x.get("short_name"),
                          x.get("surname"), *(x.get("aliases") or [])}:
                    if k:
                        self.known_names.add(_norm_lower(k))
        self._brain = brain
        self._wiki = wiki

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("ActorDiscovery: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    def _get_wiki(self):
        if self._wiki is not None:
            return self._wiki
        try:
            from agents.brain.pipelines.wikipedia_fetcher import get_wikipedia_fetcher
            self._wiki = get_wikipedia_fetcher()
        except Exception as exc:
            logger.warning("ActorDiscovery: wiki no disponible (%s)", exc)
            self._wiki = None
        return self._wiki

    # ─────────────────────────────────────────────────────────────
    def _extract_names(self, text: str) -> list[str]:
        """Extrae candidatos a nombres compuestos limpiando sentence leaders."""
        if not text:
            return []
        out: set[str] = set()
        for m in _FULL_NAME_RE.finditer(text):
            s = m.group(1).strip()
            words = s.split()
            # Quitar palabra inicial si es leader
            while len(words) > 1 and _norm_lower(words[0]) in _SENTENCE_LEADERS:
                words.pop(0)
            cleaned = " ".join(words)
            if len(cleaned.split()) >= 2 and _norm_lower(cleaned) not in self.known_names:
                out.add(cleaned)
        return list(out)

    # ─────────────────────────────────────────────────────────────
    def discover_from_texts(
        self,
        texts: list[tuple[str, str, str]],   # (texto, fecha_iso, fuente)
        *,
        min_mentions: int = 3,
        max_candidates: int = 20,
    ) -> list[ActorProposal]:
        """Procesa lote de textos y produce propuestas.

        Pasos:
          1. Extracción y recuento de nombres no conocidos.
          2. Selección de TOP candidatos por frecuencia.
          3. Verificación en Wikipedia ES.
          4. Razonamiento del brain para decidir si es figura política.
        """
        counter: Counter = Counter()
        contexts: dict[str, list[str]] = defaultdict(list)
        sources: dict[str, set[str]] = defaultdict(set)
        dates: dict[str, set[str]] = defaultdict(set)

        for text, date_iso, source in texts:
            names = self._extract_names(text)
            for n in names:
                counter[n] += 1
                # Contexto: 240 chars alrededor de la primera aparición
                idx = text.find(n)
                if idx >= 0:
                    contexts[n].append(text[max(0, idx-100):idx+140])
                if source:
                    sources[n].add(source)
                if date_iso:
                    dates[n].add(date_iso[:10])

        # Filtrar
        candidates = [
            (name, count) for name, count in counter.most_common(max_candidates * 3)
            if count >= int(min_mentions)
        ][:max_candidates]

        proposals: list[ActorProposal] = []
        for name, count in candidates:
            p = ActorProposal(
                surface_canonical=name,
                mention_count=count,
                mention_sources=sorted(sources[name])[:8],
                mention_dates=sorted(dates[name])[-5:],
                sample_contexts=contexts[name][:3],
            )
            words = name.split()
            p.proposed_name = name
            p.proposed_short_name = words[-1] if len(words) > 1 else name
            p.proposed_surname = words[-1]
            p.proposed_actor_id = _slug(name)

            # Wikipedia
            wiki = self._get_wiki()
            if wiki is not None:
                try:
                    bundle = wiki.fetch_actor(name)
                    if bundle.get("found"):
                        p.wiki_found = True
                        p.wiki_url = bundle.get("url", "")
                        p.wiki_summary = bundle.get("summary", "")[:1200]
                        p.wiki_birth_date = bundle.get("birth_date", "")
                        p.wiki_birth_place = bundle.get("birth_place", "")
                        p.wiki_party = bundle.get("party", "")
                        p.wiki_office = bundle.get("office", "")
                except Exception as exc:
                    p.error = f"wiki: {type(exc).__name__}"

            # Brain decision
            brain = self._get_brain()
            if brain is not None:
                try:
                    facts = [
                        f"Nombre: {name}",
                        f"Menciones recientes: {count}",
                        f"Fuentes: {', '.join(sorted(sources[name])[:5])}",
                    ]
                    if p.wiki_summary:
                        facts.append(f"Wikipedia: {p.wiki_summary[:600]}")
                    if p.wiki_party:
                        facts.append(f"Partido (wiki): {p.wiki_party}")
                    if p.wiki_office:
                        facts.append(f"Cargo (wiki): {p.wiki_office}")
                    if p.sample_contexts:
                        facts.append(f"Contexto: {p.sample_contexts[0][:400]}")

                    out = brain.build_actor_profile(
                        actor_name=name,
                        role=p.wiki_office or "",
                        known_facts=facts,
                        recent_statements=[],
                    )
                    if out.get("ok") and isinstance(out.get("result"), dict):
                        r = out["result"]
                        # Decidimos si es figura política: tener un rol identificable
                        bio = str(r.get("biography_short") or "").lower()
                        is_political = any(
                            kw in bio for kw in (
                                "político", "ministro", "presidente", "diputado",
                                "alcalde", "secretario", "portavoz", "líder", "candidato",
                                "consejero", "senador", "exsecretari",
                            )
                        ) or bool(p.wiki_party) or bool(p.wiki_office)
                        p.is_political_figure = is_political
                        p.suggested_role = p.wiki_office or str(r.get("political_style") or "")
                        p.suggested_party = p.wiki_party
                        p.confidence = float(r.get("confidence") or 0.0)
                        p.rationale = str(r.get("biography_short") or "")[:400]
                except Exception as exc:
                    p.error = f"brain: {type(exc).__name__}"

            proposals.append(p)
        return proposals

    # ─────────────────────────────────────────────────────────────
    def discover_from_news_batch(
        self,
        news: list[dict[str, Any]],
        *,
        min_mentions: int = 3,
    ) -> list[ActorProposal]:
        """Atajo: acepta lista de dicts con contenido/fecha_pub/medio."""
        texts = [
            (str(n.get("contenido") or n.get("text") or ""),
             str(n.get("fecha_pub") or n.get("date") or "")[:10],
             str(n.get("medio") or n.get("source") or ""))
            for n in news
        ]
        return self.discover_from_texts(texts, min_mentions=min_mentions)
