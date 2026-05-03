"""
Constructor de ventanas de contexto para menciones de entidades (Bloque 1).

Para cada span de entidad detectado por NER, extrae:
  - La oracion completa que contiene el span.
  - Una ventana de +/- N oraciones adicionales (configurable).
  - El indice de la oracion dentro del documento.
  - Los offsets de caracter en el texto original.

Se utiliza tanto en el extractor (Bloque 1) como en el enricher (Bloque 3)
para generar contexto para el juez Ollama.
"""
from __future__ import annotations

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Parametros por defecto
# ---------------------------------------------------------------------------

_DEFAULT_WINDOW_SENTENCES: int = 1   # oraciones adicionales a cada lado
_DEFAULT_MAX_CONTEXT_CHARS: int = 600  # limite de caracteres para la ventana


# ---------------------------------------------------------------------------
# Segmentador de oraciones ligero (sin dependencia de spaCy)
# ---------------------------------------------------------------------------

# Patron de fin de oracion: . ! ? seguido de espacio + mayuscula o fin de linea
_SENTENCE_BOUNDARY = re.compile(
    r'(?<=[.!?])\s+(?=[A-ZAEIOU\xc1\xc9\xcd\xd3\xda\xd1"\'«])',
    re.UNICODE,
)


def split_sentences(text: str) -> list[str]:
    """
    Divide el texto en oraciones usando un heuristico simple.

    Preferimos usar los Span.sents de spaCy cuando sea posible
    (ver build_context_from_spacy_doc), pero este fallback funciona
    sin dependencias externas.
    """
    if not text:
        return []
    parts = _SENTENCE_BOUNDARY.split(text)
    return [p.strip() for p in parts if p.strip()]


# ---------------------------------------------------------------------------
# Construccion de ventana desde texto plano
# ---------------------------------------------------------------------------

def build_context(
    text: str,
    char_start: int,
    char_end: int,
    window_sentences: int = _DEFAULT_WINDOW_SENTENCES,
    max_chars: int = _DEFAULT_MAX_CONTEXT_CHARS,
) -> tuple[str, int]:
    """
    Construye la ventana de contexto alrededor de [char_start, char_end].

    Args:
      text:             texto completo del articulo
      char_start:       inicio del span de entidad
      char_end:         fin del span de entidad
      window_sentences: numero de oraciones adicionales a cada lado
      max_chars:        longitud maxima de la ventana resultante

    Returns:
      (context_window, sentence_idx)
        context_window — string con el contexto
        sentence_idx   — indice de la oracion que contiene el span
    """
    sentences = split_sentences(text)
    if not sentences:
        return text[char_start:char_end], 0

    # Calcular offsets de cada oracion en el texto original
    offsets: list[tuple[int, int]] = []
    pos = 0
    for sent in sentences:
        idx = text.find(sent, pos)
        if idx == -1:
            idx = pos
        offsets.append((idx, idx + len(sent)))
        pos = idx + len(sent)

    # Encontrar la oracion que contiene el span
    containing_idx = 0
    for i, (s_start, s_end) in enumerate(offsets):
        if s_start <= char_start <= s_end or s_start <= char_end <= s_end:
            containing_idx = i
            break

    # Rango de oraciones a incluir
    i_from = max(0, containing_idx - window_sentences)
    i_to   = min(len(sentences) - 1, containing_idx + window_sentences)

    context_parts = sentences[i_from : i_to + 1]
    context = " ".join(context_parts)

    # Truncar si supera max_chars (mantener centrado en el span)
    if len(context) > max_chars:
        context = context[:max_chars].rsplit(" ", 1)[0] + "..."

    return context, containing_idx


# ---------------------------------------------------------------------------
# Construccion de ventana desde un Doc de spaCy (preferida)
# ---------------------------------------------------------------------------

def build_context_from_spacy_doc(
    doc,           # spacy.tokens.Doc
    span,          # spacy.tokens.Span
    window_sentences: int = _DEFAULT_WINDOW_SENTENCES,
    max_chars: int = _DEFAULT_MAX_CONTEXT_CHARS,
) -> tuple[str, int, int, int]:
    """
    Construye la ventana de contexto usando la segmentacion de spaCy.

    Retorna:
      (context_window, sentence_idx, char_start, char_end)
    """
    sentences = list(doc.sents)
    if not sentences:
        return span.text, 0, span.start_char, span.end_char

    # Indice de la oracion que contiene el span
    containing_idx = 0
    for i, sent in enumerate(sentences):
        if sent.start_char <= span.start_char < sent.end_char:
            containing_idx = i
            break

    i_from = max(0, containing_idx - window_sentences)
    i_to   = min(len(sentences) - 1, containing_idx + window_sentences)

    context_parts = [s.text.strip() for s in sentences[i_from : i_to + 1]]
    context = " ".join(context_parts)

    if len(context) > max_chars:
        context = context[:max_chars].rsplit(" ", 1)[0] + "..."

    return context, containing_idx, span.start_char, span.end_char


# ---------------------------------------------------------------------------
# Extractor de oracion contenedora (util para el juez Ollama)
# ---------------------------------------------------------------------------

def get_containing_sentence(text: str, char_start: int) -> str:
    """
    Devuelve la oracion que contiene char_start.
    Version simplificada sin ventana; util para prompts cortos.
    """
    sentences = split_sentences(text)
    pos = 0
    for sent in sentences:
        idx = text.find(sent, pos)
        if idx == -1:
            idx = pos
        if idx <= char_start <= idx + len(sent):
            return sent
        pos = idx + len(sent)
    return text[max(0, char_start - 100): char_start + 100]
