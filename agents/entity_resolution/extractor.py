"""
Extractor de menciones de entidades (Bloque 1).

Usa spaCy es_core_news_lg + EntityRuler con patrones politicos espanoles.
Si spaCy no esta disponible, cae a un extractor de reglas ligero que usa
el propio alias index como fuente de verdad.

Salida: lista de RawMention por articulo, con:
  - surface_text / surface_norm
  - ner_label
  - context_window / char_start / char_end / sentence_idx
  - resolved_qid (si match directo en aliases.yaml)
"""
from __future__ import annotations

import re
from functools import lru_cache
from typing import Any, Optional

from .models import Article, ExtractionResult, RawMention
from .normalizer import lookup_qid_with_score, normalize
from .context_builder import build_context_from_spacy_doc, build_context

# ---------------------------------------------------------------------------
# Patrones para EntityRuler (politica espanola)
# Formato: {"label": "PER"|"ORG", "pattern": [...]}
# Los patrones de texto se normalizan internamente por spaCy
# ---------------------------------------------------------------------------

_ENTITY_RULER_PATTERNS: list[dict] = [
    # Personas — forma "apellido" sola (alta precision, bajo recall)
    {"label": "PER", "pattern": [{"LOWER": "sanchez"}, {"LOWER": "perez-castejon", "OP": "?"}]},
    {"label": "PER", "pattern": [{"LOWER": "pedro"}, {"LOWER": "sanchez"}]},
    {"label": "PER", "pattern": [{"LOWER": "feijoo"}]},
    {"label": "PER", "pattern": [{"LOWER": "nunez"}, {"LOWER": "feijoo"}]},
    {"label": "PER", "pattern": [{"LOWER": "alberto"}, {"LOWER": "nunez"}, {"LOWER": "feijoo"}]},
    {"label": "PER", "pattern": [{"LOWER": "abascal"}]},
    {"label": "PER", "pattern": [{"LOWER": "santiago"}, {"LOWER": "abascal"}]},
    {"label": "PER", "pattern": [{"LOWER": "yolanda"}, {"LOWER": "diaz"}]},
    {"label": "PER", "pattern": [{"LOWER": "puigdemont"}]},
    {"label": "PER", "pattern": [{"LOWER": "ayuso"}]},
    {"label": "PER", "pattern": [{"LOWER": "isabel"}, {"LOWER": "diaz"}, {"LOWER": "ayuso"}]},
    {"label": "PER", "pattern": [{"LOWER": "ribera"}]},
    {"label": "PER", "pattern": [{"LOWER": "teresa"}, {"LOWER": "ribera"}]},
    {"label": "PER", "pattern": [{"LOWER": "montero"}]},
    {"label": "PER", "pattern": [{"LOWER": "robles"}]},
    {"label": "PER", "pattern": [{"LOWER": "belarra"}]},
    {"label": "PER", "pattern": [{"LOWER": "ione"}, {"LOWER": "belarra"}]},
    {"label": "PER", "pattern": [{"LOWER": "salvador"}, {"LOWER": "illa"}]},
    {"label": "PER", "pattern": [{"LOWER": "junqueras"}]},
    {"label": "PER", "pattern": [{"LOWER": "albares"}]},
    {"label": "PER", "pattern": [{"LOWER": "trump"}]},
    {"label": "PER", "pattern": [{"LOWER": "macron"}]},
    {"label": "PER", "pattern": [{"LOWER": "von"}, {"LOWER": "der"}, {"LOWER": "leyen"}]},
    {"label": "PER", "pattern": [{"LOWER": "elon"}, {"LOWER": "musk"}]},

    # Expresiones referenciales de persona
    {"label": "PER", "pattern": [{"LOWER": "el"}, {"LOWER": "presidente"}]},
    {"label": "PER", "pattern": [{"LOWER": "la"}, {"LOWER": "presidenta"}]},
    {"label": "PER", "pattern": [{"LOWER": "el"}, {"LOWER": "lider"}, {"LOWER": "del"}, {"LOWER": "pp"}]},
    {"label": "PER", "pattern": [{"LOWER": "el"}, {"LOWER": "lider"}, {"LOWER": "de"}, {"LOWER": "vox"}]},
    {"label": "PER", "pattern": [{"LOWER": "la"}, {"LOWER": "vicepresidenta"}]},
    {"label": "PER", "pattern": [{"LOWER": "el"}, {"LOWER": "vicepresidente"}]},
    {"label": "PER", "pattern": [{"LOWER": "el"}, {"LOWER": "ministro"}, {"LOWER": "de"}, {"LOWER": "exteriores"}]},
    {"label": "PER", "pattern": [{"LOWER": "la"}, {"LOWER": "ministra"}, {"LOWER": "de"}, {"LOWER": "hacienda"}]},
    {"label": "PER", "pattern": [{"LOWER": "la"}, {"LOWER": "ministra"}, {"LOWER": "de"}, {"LOWER": "defensa"}]},
    {"label": "PER", "pattern": [{"LOWER": "el"}, {"LOWER": "jefe"}, {"LOWER": "del"}, {"LOWER": "ejecutivo"}]},
    {"label": "PER", "pattern": [{"LOWER": "el"}, {"LOWER": "lider"}, {"LOWER": "de"}, {"LOWER": "la"}, {"LOWER": "oposicion"}]},

    # Partidos
    {"label": "ORG", "pattern": [{"LOWER": "psoe"}]},
    {"label": "ORG", "pattern": [{"LOWER": "partido"}, {"LOWER": "socialista"}]},
    {"label": "ORG", "pattern": [{"LOWER": "partido"}, {"LOWER": "popular"}]},
    {"label": "ORG", "pattern": [{"LOWER": "vox"}]},
    {"label": "ORG", "pattern": [{"LOWER": "sumar"}]},
    {"label": "ORG", "pattern": [{"LOWER": "podemos"}]},
    {"label": "ORG", "pattern": [{"LOWER": "erc"}]},
    {"label": "ORG", "pattern": [{"LOWER": "esquerra"}, {"LOWER": "republicana"}]},
    {"label": "ORG", "pattern": [{"LOWER": "pnv"}]},
    {"label": "ORG", "pattern": [{"LOWER": "bildu"}]},
    {"label": "ORG", "pattern": [{"LOWER": "junts"}]},
    {"label": "ORG", "pattern": [{"LOWER": "ciudadanos"}]},

    # Instituciones
    {"label": "ORG", "pattern": [{"LOWER": "congreso"}, {"LOWER": "de"}, {"LOWER": "los"}, {"LOWER": "diputados"}]},
    {"label": "ORG", "pattern": [{"LOWER": "el"}, {"LOWER": "congreso"}]},
    {"label": "ORG", "pattern": [{"LOWER": "el"}, {"LOWER": "senado"}]},
    {"label": "ORG", "pattern": [{"LOWER": "la"}, {"LOWER": "moncloa"}]},
    {"label": "ORG", "pattern": [{"LOWER": "tribunal"}, {"LOWER": "constitucional"}]},
    {"label": "ORG", "pattern": [{"LOWER": "tribunal"}, {"LOWER": "supremo"}]},
    {"label": "ORG", "pattern": [{"LOWER": "cgpj"}]},
    {"label": "ORG", "pattern": [{"LOWER": "union"}, {"LOWER": "europea"}]},
    {"label": "ORG", "pattern": [{"LOWER": "comision"}, {"LOWER": "europea"}]},
    {"label": "ORG", "pattern": [{"LOWER": "banco"}, {"LOWER": "de"}, {"LOWER": "espana"}]},
    {"label": "ORG", "pattern": [{"LOWER": "bce"}]},
    {"label": "ORG", "pattern": [{"LOWER": "banco"}, {"LOWER": "central"}, {"LOWER": "europeo"}]},
]

# Etiquetas NER que nos interesan (descartamos MISC para personas/orgs)
_RELEVANT_LABELS = {"PER", "PERSON", "ORG", "LOC", "GPE"}

# Longitud minima de superficie para evitar siglas de un caracter
_MIN_SURFACE_LEN = 2

# Longitud minima para superficies que NO estan en aliases.yaml
_MIN_SURFACE_WITHOUT_ALIAS = 4


# ---------------------------------------------------------------------------
# Carga del modelo spaCy (singleton)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_nlp() -> Optional[Any]:
    """
    Carga es_core_news_lg + EntityRuler.
    Fallback a modelos mas pequenos si el grande no esta instalado.
    """
    try:
        import spacy  # type: ignore
    except ImportError:
        return None

    nlp = None
    for model_name in ("es_core_news_lg", "es_core_news_md", "es_core_news_sm"):
        try:
            nlp = spacy.load(model_name, disable=["parser"])  # parser lento, usamos sents
            break
        except OSError:
            continue

    if nlp is None:
        return None

    # Asegurar que tenemos sentencizer o senter
    if "senter" not in nlp.pipe_names and "sentencizer" not in nlp.pipe_names:
        if "senter" in nlp.disabled:
            nlp.enable_pipe("senter")
        else:
            nlp.add_pipe("sentencizer")

    # Anadir EntityRuler antes del ner para que los patrones politicos
    # tengan prioridad sobre el modelo estadistico
    if "entity_ruler" not in nlp.pipe_names:
        ruler = nlp.add_pipe("entity_ruler", before="ner")
        ruler.add_patterns(_ENTITY_RULER_PATTERNS)

    return nlp


# ---------------------------------------------------------------------------
# Extractor principal
# ---------------------------------------------------------------------------

def extract_mentions(article: Article) -> ExtractionResult:
    """
    Extrae todas las menciones de entidades de un articulo.

    Proceso:
      1. Concatena headline + text para mayor cobertura.
      2. Pasa el texto por el pipeline spaCy (NER + EntityRuler).
      3. Por cada span relevante:
         a. Normaliza la superficie (T1-T8).
         b. Busca QID en aliases.yaml (lookup inmediato).
         c. Construye ventana de contexto.
         d. Emite RawMention.
      4. Si spaCy no esta disponible, cae al extractor de reglas.
    """
    full_text = _build_full_text(article)
    nlp = _load_nlp()

    if nlp is not None:
        return _extract_with_spacy(article, full_text, nlp)
    else:
        return _extract_with_rules(article, full_text)


def _build_full_text(article: Article) -> str:
    """Combina headline y body con separador de oracion."""
    parts = []
    if article.headline:
        parts.append(article.headline.strip())
    if article.text:
        parts.append(article.text.strip())
    return " ".join(parts)


def _extract_with_spacy(
    article: Article,
    full_text: str,
    nlp: Any,
) -> ExtractionResult:
    """Extraccion usando el pipeline spaCy completo."""
    mentions: list[RawMention] = []
    seen_spans: set[tuple[int, int]] = set()  # evitar duplicados por superposicion

    try:
        doc = nlp(full_text[:100_000])  # limite de seguridad: 100k chars
    except Exception as exc:
        return ExtractionResult(article=article, error=str(exc))

    for ent in doc.ents:
        label = ent.label_
        if label not in _RELEVANT_LABELS:
            continue
        if len(ent.text.strip()) < _MIN_SURFACE_LEN:
            continue
        span_key = (ent.start_char, ent.end_char)
        if span_key in seen_spans:
            continue
        seen_spans.add(span_key)

        surface_text = ent.text.strip()
        surface_norm = normalize(surface_text, label)

        if len(surface_norm) < _MIN_SURFACE_LEN:
            continue

        # Lookup inmediato en aliases.yaml
        resolved_qid, resolution_score = lookup_qid_with_score(
            surface_norm, context=ent.sent.text if ent.sent else "", ner_label=label
        )

        # Si no esta en alias y es muy corto, descartar para reducir ruido
        if resolved_qid is None and len(surface_norm) < _MIN_SURFACE_WITHOUT_ALIAS:
            continue

        # Ventana de contexto via spaCy
        context_window, sentence_idx, cs, ce = build_context_from_spacy_doc(doc, ent)

        mention = RawMention(
            article_url=article.url,
            surface_text=surface_text,
            surface_norm=surface_norm,
            ner_label=_normalize_label(label),
            context_window=context_window,
            char_start=cs,
            char_end=ce,
            sentence_idx=sentence_idx,
            source_media=article.source_media,
            published_at=article.published_at,
            article_id=article.article_id,
            resolved_qid=resolved_qid,
            resolution_method="yaml" if resolved_qid else None,
            resolution_score=resolution_score,
        )
        mentions.append(mention)

    return ExtractionResult(article=article, mentions=mentions)


def _extract_with_rules(article: Article, full_text: str) -> ExtractionResult:
    """
    Extraccion de emergencia sin spaCy.
    Recorre el indice de aliases y busca menciones literales en el texto.
    Baja precision pero garantiza operacion sin dependencias externas.
    """
    from .normalizer import _load_alias_index, _normalize_for_lookup

    mentions: list[RawMention] = []
    alias_index = _load_alias_index()

    # Ordenamos alias por longitud desc para priorizar matches mas largos
    sorted_aliases = sorted(alias_index.keys(), key=len, reverse=True)

    used_positions: set[tuple[int, int]] = set()

    for alias_norm in sorted_aliases:
        qid, _ = alias_index[alias_norm]
        # Buscar el alias original (sin normalizar) en el texto
        # Buscamos la version normalizada directamente en el texto normalizado
        text_norm = _normalize_for_lookup(full_text)
        for m in re.finditer(re.escape(alias_norm), text_norm):
            start, end = m.start(), m.end()
            # Evitar superposicion con matches ya registrados
            overlap = any(s <= start < e or s < end <= e for (s, e) in used_positions)
            if overlap:
                continue
            used_positions.add((start, end))

            surface_text = full_text[start:end]
            surface_norm = alias_norm

            context_window, sentence_idx = build_context(full_text, start, end)

            mention = RawMention(
                article_url=article.url,
                surface_text=surface_text,
                surface_norm=surface_norm,
                ner_label="PER",  # conservador sin NER real
                context_window=context_window,
                char_start=start,
                char_end=end,
                sentence_idx=sentence_idx,
                source_media=article.source_media,
                published_at=article.published_at,
                article_id=article.article_id,
                resolved_qid=qid,
                resolution_method="yaml",
                resolution_score=1.0,
            )
            mentions.append(mention)

    return ExtractionResult(article=article, mentions=mentions)


def _normalize_label(spacy_label: str) -> str:
    """Mapea etiquetas spaCy a nuestro vocabulario controlado."""
    _MAP = {
        "PER":    "PER",
        "PERSON": "PER",
        "ORG":    "ORG",
        "LOC":    "LOC",
        "GPE":    "LOC",
        "MISC":   "MISC",
    }
    return _MAP.get(spacy_label, "MISC")
