"""
Entity Resolver · desambigua entidades políticas mencionadas en texto.

Resuelve referencias ambiguas como "Sánchez dijo", "el ministro", "el alcalde"
contra el catálogo canónico de actores en la BD. El brain razona por contexto:
quién está siendo mencionado realmente, con qué confianza.

Servicio invisible: el pipeline de ingesta lo llama silenciosamente antes de
persistir cada artículo. El analista nunca ve el resolver, solo ve nombres
canónicos correctamente atribuidos.

Uso típico desde un ETL:

    from agents.brain.pipelines.entity_resolver import EntityResolver
    resolver = EntityResolver(actor_catalog=lista_actores_canonicos)
    resolved = resolver.resolve(
        text="Sánchez convocó hoy reunión de urgencia tras hablar con Feijóo.",
        date="2026-05-18",
        source="europapress",
    )
    # → [
    #   {"surface": "Sánchez", "canonical": "Pedro Sánchez",
    #    "actor_id": "actor_psoe_001", "confidence": 0.95,
    #    "role_at_time": "Presidente del Gobierno"},
    #   {"surface": "Feijóo", "canonical": "Alberto Núñez Feijóo",
    #    "actor_id": "actor_pp_001", "confidence": 0.93,
    #    "role_at_time": "Líder del PP"},
    # ]

Devuelve siempre lista con confianza y traza. Nunca crashea.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class ActorCanonical:
    """Entrada del catálogo canónico de actores."""
    actor_id: str
    name: str                     # nombre canónico ("Pedro Sánchez Pérez-Castejón")
    short_name: str = ""          # alias coloquial ("Pedro Sánchez")
    surname: str = ""             # apellido para coincidencias ambiguas
    role: str = ""                # cargo actual ("Presidente del Gobierno")
    party: str = ""               # PSOE, PP, …
    aliases: list[str] = field(default_factory=list)
    active_from: str | None = None
    active_until: str | None = None


@dataclass
class ResolvedMention:
    surface: str                  # texto literal que apareció
    canonical: str                # nombre canónico (o "" si no resuelve)
    actor_id: str | None          # id en BD (o None)
    confidence: float             # 0..1
    method: str                   # "exact" | "alias" | "brain_context" | "no_match"
    role_at_time: str | None = None
    ambiguity_candidates: list[str] = field(default_factory=list)
    rationale: str = ""


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

_NAME_PATTERN = re.compile(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+(?:de|del|de la|de los|y|i)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\b")
_SURNAME_PATTERN = re.compile(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b")
_GENERIC_TITLES = {
    "presidente", "ministro", "ministra", "consejero", "consejera", "alcalde",
    "alcaldesa", "secretario", "secretaria", "portavoz", "diputado", "diputada",
    "senador", "senadora", "líder", "lideresa", "candidato", "candidata",
}

# Palabras que NO son apellido — sirven para limpiar "Hoy Sánchez" → "Sánchez"
_SENTENCE_LEADERS = {
    "hoy", "ayer", "mañana", "anoche", "esta", "este", "estos", "estas",
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    "según", "por", "tras", "antes", "después", "durante", "mientras",
    "sin", "con", "para", "como", "cuando", "donde",
    "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    "madrid", "barcelona", "valencia", "sevilla", "bilbao",  # ciudades comunes — no son apellidos
}


def _norm(s: str) -> str:
    return (s or "").strip().lower()


def _strip_accents(s: str) -> str:
    """Versión simple sin unicodedata externa (mantiene dependencias mínimas)."""
    mapping = str.maketrans({
        "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n",
        "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ü": "U", "Ñ": "N",
    })
    return s.translate(mapping)


# ─────────────────────────────────────────────────────────────────
# Resolver
# ─────────────────────────────────────────────────────────────────

class EntityResolver:
    """Desambigua actores políticos en texto crudo contra catálogo canónico."""

    def __init__(
        self,
        actor_catalog: list[ActorCanonical] | list[dict[str, Any]],
        *,
        brain: Any = None,
    ) -> None:
        self.catalog: list[ActorCanonical] = []
        for x in actor_catalog or []:
            if isinstance(x, ActorCanonical):
                self.catalog.append(x)
            elif isinstance(x, dict):
                self.catalog.append(ActorCanonical(
                    actor_id=str(x.get("actor_id") or x.get("id") or ""),
                    name=str(x.get("name") or ""),
                    short_name=str(x.get("short_name") or ""),
                    surname=str(x.get("surname") or ""),
                    role=str(x.get("role") or ""),
                    party=str(x.get("party") or ""),
                    aliases=list(x.get("aliases") or []),
                    active_from=x.get("active_from"),
                    active_until=x.get("active_until"),
                ))
        self._brain = brain
        # Índices por nombre/alias/apellido para lookup rápido
        self._by_name: dict[str, ActorCanonical] = {}
        self._by_surname: dict[str, list[ActorCanonical]] = {}
        for a in self.catalog:
            for key in {a.name, a.short_name, *a.aliases}:
                if key:
                    self._by_name[_norm(_strip_accents(key))] = a
            if a.surname:
                self._by_surname.setdefault(_norm(_strip_accents(a.surname)), []).append(a)

    # ─────────────────────────────────────────────────────────────
    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("EntityResolver: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    def _is_active_at(self, actor: ActorCanonical, date_iso: str | None) -> bool:
        """Devuelve si el actor estaba activo en la fecha indicada."""
        if not date_iso:
            return True
        try:
            d = datetime.fromisoformat(date_iso[:10]).date()
        except (ValueError, TypeError):
            return True
        if actor.active_from:
            try:
                if d < datetime.fromisoformat(actor.active_from[:10]).date():
                    return False
            except (ValueError, TypeError):
                pass
        if actor.active_until:
            try:
                if d > datetime.fromisoformat(actor.active_until[:10]).date():
                    return False
            except (ValueError, TypeError):
                pass
        return True

    # ─────────────────────────────────────────────────────────────
    def _quick_match(self, surface: str, date_iso: str | None) -> ResolvedMention | None:
        """Match rápido sin LLM: nombre exacto o alias único."""
        key = _norm(_strip_accents(surface))
        if not key:
            return None
        if key in self._by_name:
            a = self._by_name[key]
            if self._is_active_at(a, date_iso):
                return ResolvedMention(
                    surface=surface,
                    canonical=a.name,
                    actor_id=a.actor_id,
                    confidence=0.99,
                    method="exact",
                    role_at_time=a.role,
                    rationale="match exacto por nombre/alias canónico",
                )
        # Apellido único
        if key in self._by_surname:
            candidatos = [a for a in self._by_surname[key] if self._is_active_at(a, date_iso)]
            if len(candidatos) == 1:
                a = candidatos[0]
                return ResolvedMention(
                    surface=surface,
                    canonical=a.name,
                    actor_id=a.actor_id,
                    confidence=0.85,
                    method="alias",
                    role_at_time=a.role,
                    rationale="apellido único en catálogo activo",
                )
        return None

    # ─────────────────────────────────────────────────────────────
    def _ambiguous_candidates(self, surface: str, date_iso: str | None) -> list[ActorCanonical]:
        """Devuelve lista de candidatos cuando el apellido es ambiguo."""
        key = _norm(_strip_accents(surface))
        return [a for a in self._by_surname.get(key, []) if self._is_active_at(a, date_iso)]

    # ─────────────────────────────────────────────────────────────
    def _brain_disambiguate(
        self,
        surface: str,
        candidates: list[ActorCanonical],
        *,
        context: str,
        date_iso: str | None,
        source: str,
    ) -> ResolvedMention:
        """Cuando varios candidatos comparten apellido, el brain elige por contexto."""
        brain = self._get_brain()
        if brain is None or not candidates:
            return ResolvedMention(
                surface=surface, canonical="", actor_id=None,
                confidence=0.0, method="no_match",
                ambiguity_candidates=[a.name for a in candidates],
                rationale="brain no disponible y catálogo ambiguo",
            )

        prompt_ctx = "\n".join(
            f"- [{c.actor_id}] {c.name} · {c.role} · {c.party}"
            for c in candidates[:6]
        )
        # Reutilizamos extract_political_entities con instrucciones precisas
        try:
            out = brain.extract_political_entities(
                text=(
                    f"Texto: '{context}'\n\n"
                    f"Surface: '{surface}' (mención ambigua).\n"
                    f"Fecha del texto: {date_iso or 'desconocida'}.\n"
                    f"Fuente: {source}.\n\n"
                    f"Candidatos posibles:\n{prompt_ctx}\n\n"
                    f"Identifica QUÉ candidato es y devuelve actors=[{{name, role, party}}] "
                    f"con el name canónico del candidato elegido. confidence en [0,1]. "
                    f"Si no puedes decidir, devuelve actors=[]."
                ),
                context=f"Desambiguación de '{surface}' contra catálogo Politeia.",
            )
        except Exception as exc:
            logger.warning("brain.extract_political_entities falló: %s", exc)
            return ResolvedMention(
                surface=surface, canonical="", actor_id=None,
                confidence=0.0, method="no_match",
                ambiguity_candidates=[a.name for a in candidates],
                rationale=f"brain error: {type(exc).__name__}",
            )

        if not out.get("ok"):
            return ResolvedMention(
                surface=surface, canonical="", actor_id=None,
                confidence=0.0, method="no_match",
                ambiguity_candidates=[a.name for a in candidates],
                rationale=out.get("error") or "brain no resolvió",
            )

        result = out.get("result") or {}
        actors_picked = result.get("actors") if isinstance(result, dict) else None
        if not isinstance(actors_picked, list) or not actors_picked:
            return ResolvedMention(
                surface=surface, canonical="", actor_id=None,
                confidence=float(out.get("confidence") or 0.0),
                method="no_match",
                ambiguity_candidates=[a.name for a in candidates],
                rationale="brain sin decisión clara",
            )

        # Tomamos la primera (la decisión del brain)
        picked = actors_picked[0]
        picked_name = ""
        if isinstance(picked, dict):
            picked_name = str(picked.get("name") or "")
        elif isinstance(picked, str):
            picked_name = picked

        # Buscamos en candidatos por similitud relajada
        picked_norm = _norm(_strip_accents(picked_name))
        chosen = None
        for c in candidates:
            if _norm(_strip_accents(c.name)) == picked_norm or \
               _norm(_strip_accents(c.short_name)) == picked_norm:
                chosen = c
                break

        if chosen is None:
            return ResolvedMention(
                surface=surface, canonical=picked_name, actor_id=None,
                confidence=float(out.get("confidence") or 0.5),
                method="brain_context",
                ambiguity_candidates=[a.name for a in candidates],
                rationale="brain eligió un nombre no del catálogo",
            )

        return ResolvedMention(
            surface=surface,
            canonical=chosen.name,
            actor_id=chosen.actor_id,
            confidence=float(out.get("confidence") or 0.85),
            method="brain_context",
            role_at_time=chosen.role,
            ambiguity_candidates=[a.name for a in candidates if a.actor_id != chosen.actor_id],
            rationale="brain desambiguó por contexto",
        )

    # ─────────────────────────────────────────────────────────────
    def resolve(
        self,
        text: str,
        *,
        date: str | None = None,
        source: str = "",
        max_mentions: int = 40,
    ) -> list[ResolvedMention]:
        """Resuelve todas las menciones de personas en `text`.

        Args:
          text: texto a analizar.
          date: ISO YYYY-MM-DD del documento (para active_at).
          source: nombre del medio (info para el brain).
          max_mentions: tope de superficies analizadas.

        Returns:
          Lista de ResolvedMention.
        """
        if not text or not str(text).strip():
            return []

        # 1) Detectamos superficies candidatas
        surfaces: list[str] = []
        for m in _NAME_PATTERN.finditer(text):
            s = m.group(1).strip()
            # Bug previo: "Hoy Sánchez" se capturaba como compuesto y bloqueaba
            # el match del apellido solo. Limpiamos prefijos sentence-leaders.
            words = s.split()
            while len(words) > 1 and _norm(_strip_accents(words[0])) in _SENTENCE_LEADERS:
                words.pop(0)
            s_clean = " ".join(words)
            if s_clean and s_clean not in surfaces:
                surfaces.append(s_clean)
        # Compute set de surfaces compuestas que YA resuelven contra el catálogo
        # — solo bloqueamos apellidos sueltos si el compuesto resuelve. Si no,
        # le damos chance al apellido individual.
        resolved_compounds: set[str] = set()
        for surf in surfaces:
            if len(surf.split()) > 1 and self._quick_match(surf, date) is not None:
                resolved_compounds.add(surf)
        # Apellidos sueltos
        for m in _SURNAME_PATTERN.finditer(text):
            s = m.group(1).strip()
            if (
                s
                and s.lower() not in _GENERIC_TITLES
                and _norm(_strip_accents(s)) not in _SENTENCE_LEADERS
                and len(s) > 3
                and s not in surfaces
                and not any(s in full for full in resolved_compounds)
            ):
                surfaces.append(s)
        surfaces = surfaces[:max_mentions]

        resolved: list[ResolvedMention] = []
        seen_canonical: set[str] = set()
        for surf in surfaces:
            quick = self._quick_match(surf, date)
            if quick is not None:
                if quick.canonical not in seen_canonical:
                    resolved.append(quick)
                    seen_canonical.add(quick.canonical)
                continue
            # Si es ambiguo, llamamos al brain con contexto
            candidates = self._ambiguous_candidates(surf, date)
            if len(candidates) >= 2:
                mention = self._brain_disambiguate(
                    surf, candidates, context=text[:3000], date_iso=date, source=source,
                )
                if mention.canonical and mention.canonical not in seen_canonical:
                    resolved.append(mention)
                    seen_canonical.add(mention.canonical)
            elif len(candidates) == 1:
                a = candidates[0]
                resolved.append(ResolvedMention(
                    surface=surf, canonical=a.name, actor_id=a.actor_id,
                    confidence=0.80, method="alias", role_at_time=a.role,
                    rationale="único candidato activo con ese apellido",
                ))
                seen_canonical.add(a.name)
            else:
                resolved.append(ResolvedMention(
                    surface=surf, canonical="", actor_id=None,
                    confidence=0.0, method="no_match",
                    rationale="no hay candidato en catálogo",
                ))

        return resolved

    # ─────────────────────────────────────────────────────────────
    def score_political_relevance(
        self,
        text: str,
        *,
        title: str = "",
        source: str = "",
    ) -> dict[str, Any]:
        """Asigna un score 0..1 de relevancia política al texto.

        Usado por la ingesta para no almacenar basura en ChromaDB.
        """
        brain = self._get_brain()
        if brain is None:
            return {"ok": False, "score": 0.5, "reason": "brain no disponible"}
        out = brain.identify_source_relevance(
            source_url="",
            source_title=title,
            source_excerpt=(text or "")[:2500],
            topic_focus="política española",
        )
        if not out.get("ok"):
            return {"ok": False, "score": 0.5, "reason": out.get("error") or "?"}
        r = out.get("result") or {}
        if not isinstance(r, dict):
            return {"ok": True, "score": 0.5, "reason": "respuesta del brain sin estructura"}
        score = float(r.get("score") or 0.5)
        score = max(0.0, min(1.0, score))
        return {
            "ok": True,
            "score": score,
            "relevant": bool(r.get("relevant", score >= 0.5)),
            "category": r.get("category"),
            "rationale": r.get("rationale"),
            "risks": r.get("risks") or [],
            "model": out.get("model"),
            "latency_ms": out.get("latency_ms"),
        }
