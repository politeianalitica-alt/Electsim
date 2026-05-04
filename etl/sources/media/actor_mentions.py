"""
Extractor de menciones de actores políticos en artículos de medios.

Basado en el extractor de data_aggregator.py, refactorizado como clase reutilizable.
Soporta actores, partidos e instituciones con alias.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from .schemas import MediaActorMention

logger = logging.getLogger(__name__)

# ── Diccionario de actores con aliases ───────────────────────────────────────

# Estructura: nombre_canónico → {"aliases": [...], "tipo": "politico|partido|institucion"}
_ACTORS: dict[str, dict[str, Any]] = {
    # Actores políticos principales
    "Pedro Sánchez": {
        "aliases": ["sánchez", "pedro sánchez", "el presidente", "presidente sánchez"],
        "tipo": "politico",
    },
    "Alberto Núñez Feijóo": {
        "aliases": ["feijóo", "feijoo", "núñez feijóo", "líder del pp"],
        "tipo": "politico",
    },
    "Santiago Abascal": {
        "aliases": ["abascal", "santiago abascal", "líder de vox"],
        "tipo": "politico",
    },
    "Yolanda Díaz": {
        "aliases": ["yolanda díaz", "ministra de trabajo", "líder de sumar"],
        "tipo": "politico",
    },
    "Teresa Ribera": {
        "aliases": ["ribera", "teresa ribera", "vicepresidenta ribera"],
        "tipo": "politico",
    },
    "María Jesús Montero": {
        "aliases": ["montero", "ministra de hacienda", "maría jesús montero"],
        "tipo": "politico",
    },
    "Carles Puigdemont": {
        "aliases": ["puigdemont", "carles puigdemont", "expresident"],
        "tipo": "politico",
    },
    "Oriol Junqueras": {
        "aliases": ["junqueras", "oriol junqueras"],
        "tipo": "politico",
    },
    "Pere Aragonès": {
        "aliases": ["aragonès", "aragonés", "president aragonès"],
        "tipo": "politico",
    },
    "Isabel Díaz Ayuso": {
        "aliases": ["ayuso", "díaz ayuso", "presidenta ayuso", "presidenta de madrid"],
        "tipo": "politico",
    },
    "Alfonso Rueda": {
        "aliases": ["rueda", "alfonso rueda", "presidente de galicia"],
        "tipo": "politico",
    },
    "Ione Belarra": {
        "aliases": ["belarra", "ione belarra", "podemos"],
        "tipo": "politico",
    },
    # Partidos
    "PSOE": {
        "aliases": ["psoe", "partido socialista", "socialistas", "socialista"],
        "tipo": "partido",
    },
    "PP": {
        "aliases": ["pp", "partido popular", "populares", "popular"],
        "tipo": "partido",
    },
    "Vox": {
        "aliases": ["vox"],
        "tipo": "partido",
    },
    "Sumar": {
        "aliases": ["sumar"],
        "tipo": "partido",
    },
    "Podemos": {
        "aliases": ["podemos", "partido podemos"],
        "tipo": "partido",
    },
    "ERC": {
        "aliases": ["erc", "esquerra republicana", "esquerra"],
        "tipo": "partido",
    },
    "Junts": {
        "aliases": ["junts", "junts per catalunya"],
        "tipo": "partido",
    },
    "PNV": {
        "aliases": ["pnv", "partido nacionalista vasco", "eaj-pnv"],
        "tipo": "partido",
    },
    "Bildu": {
        "aliases": ["bildu", "eh bildu", "euskal herria bildu"],
        "tipo": "partido",
    },
    "Ciudadanos": {
        "aliases": ["ciudadanos", "cs", "partido ciudadanos"],
        "tipo": "partido",
    },
    # Instituciones
    "Congreso de los Diputados": {
        "aliases": ["congreso", "congreso de los diputados", "parlamento", "hemiciclo", "cámara baja"],
        "tipo": "institucion",
    },
    "Senado": {
        "aliases": ["senado", "cámara alta"],
        "tipo": "institucion",
    },
    "Gobierno de España": {
        "aliases": ["gobierno", "el gobierno", "consejo de ministros", "ejecutivo", "moncloa"],
        "tipo": "institucion",
    },
    "Tribunal Constitucional": {
        "aliases": ["tribunal constitucional", "tc", "el constitucional"],
        "tipo": "institucion",
    },
    "Tribunal Supremo": {
        "aliases": ["tribunal supremo", "supremo", "sala de lo penal"],
        "tipo": "institucion",
    },
    "Banco de España": {
        "aliases": ["banco de españa", "banco central", "gobernador del banco de españa"],
        "tipo": "institucion",
    },
    "Unión Europea": {
        "aliases": ["unión europea", "ue", "bruselas", "comisión europea", "parlamento europeo"],
        "tipo": "institucion",
    },
    "OTAN": {
        "aliases": ["otan", "nato", "alianza atlántica"],
        "tipo": "institucion",
    },
}


# ── Pre-compilar patrones ─────────────────────────────────────────────────────

def _compile_patterns(actors: dict[str, dict[str, Any]]) -> list[tuple[str, str, str, list[str]]]:
    """
    Compila (nombre_canónico, tipo, [aliases]) en tuplas con regex pre-compilado.
    Devuelve: (canonical, tipo, pattern_str, aliases)
    """
    compiled = []
    for canonical, meta in actors.items():
        aliases = meta.get("aliases", [canonical.lower()])
        tipo = meta.get("tipo", "politico")
        # Ordenar por longitud desc para que los alias largos ganen
        sorted_aliases = sorted(aliases, key=len, reverse=True)
        pattern = "|".join(re.escape(a) for a in sorted_aliases)
        compiled.append((canonical, tipo, pattern, sorted_aliases))
    return compiled


_COMPILED_ACTORS = _compile_patterns(_ACTORS)


# ── ActorMentionExtractor ─────────────────────────────────────────────────────

class ActorMentionExtractor:
    """
    Extrae menciones de actores políticos de un texto.

    Uso::

        extractor = ActorMentionExtractor()
        mentions = extractor.extract("Pedro Sánchez y el PP negociaron ...")
    """

    def __init__(self, actors: dict[str, dict[str, Any]] | None = None) -> None:
        if actors is not None:
            self._compiled = _compile_patterns(actors)
        else:
            self._compiled = _COMPILED_ACTORS

    def extract(
        self,
        text: str,
        content_hash: str = "",
        confidence_threshold: float = 0.5,
    ) -> list[MediaActorMention]:
        """
        Extrae menciones de actores en el texto.

        Args:
            text: texto (título + resumen + texto completo).
            content_hash: hash del artículo (para la FK).
            confidence_threshold: umbral mínimo de confianza.

        Returns:
            list[MediaActorMention] — una entrada por actor mencionado.
        """
        if not text:
            return []

        text_lower = text.lower()
        mentions: list[MediaActorMention] = []

        for canonical, tipo, pattern, aliases in self._compiled:
            try:
                matches = re.findall(pattern, text_lower)
            except re.error:
                continue

            if not matches:
                continue

            count = len(matches)
            matched = list(set(matches))
            # Confianza proporcional al número de menciones (cap 1.0)
            confidence = min(0.5 + count * 0.1, 1.0)

            if confidence < confidence_threshold:
                continue

            mentions.append(MediaActorMention(
                content_hash=content_hash,
                actor_name=canonical,
                actor_type=tipo,
                mention_count=count,
                confidence=round(confidence, 2),
                matched_aliases=matched,
            ))

        return mentions

    def extract_names(self, text: str) -> list[str]:
        """Devuelve solo los nombres canónicos de actores mencionados."""
        return [m.actor_name for m in self.extract(text)]

    def extract_parties(self, text: str) -> list[str]:
        """Devuelve nombres canónicos de partidos mencionados."""
        return [
            m.actor_name for m in self.extract(text)
            if m.actor_type == "partido"
        ]

    def extract_institutions(self, text: str) -> list[str]:
        """Devuelve nombres canónicos de instituciones mencionadas."""
        return [
            m.actor_name for m in self.extract(text)
            if m.actor_type == "institucion"
        ]


# Instancia global para uso simple
_default_extractor = ActorMentionExtractor()


def extract_actor_mentions(
    text: str,
    content_hash: str = "",
) -> list[MediaActorMention]:
    """Shortcut: extrae menciones con el extractor por defecto."""
    return _default_extractor.extract(text, content_hash)
