"""Motor de deduplicación basado en hashes exactos y simhash para casi-duplicados."""

from __future__ import annotations

import hashlib
import re
from typing import List

from pydantic import BaseModel, ConfigDict, Field

from etl.ingestion.normalization import normalize_text


class DedupResult(BaseModel):
    """Resultado de una pasada de deduplicación."""

    model_config = ConfigDict(extra="ignore")

    kept: List[dict] = Field(default_factory=list)
    duplicates: List[dict] = Field(default_factory=list)
    reasons: dict[str, str] = Field(default_factory=dict)


def _normalize_for_hash(text: str) -> str:
    txt = normalize_text(text or "").lower()
    txt = re.sub(r"[^\w\s]", " ", txt, flags=re.UNICODE)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def compute_content_hash(text: str) -> str:
    """MD5 de los primeros 500 caracteres normalizados."""

    norm = _normalize_for_hash(text)[:500]
    return hashlib.md5(norm.encode("utf-8")).hexdigest()


def compute_title_hash(title: str) -> str:
    """MD5 del título normalizado."""

    norm = _normalize_for_hash(title)
    return hashlib.md5(norm.encode("utf-8")).hexdigest()


def _tokenize(text: str) -> List[str]:
    txt = _normalize_for_hash(text)
    if not txt:
        return []
    return [t for t in txt.split() if len(t) > 1]


def compute_simhash(text: str, hash_bits: int = 64) -> int:
    """Simhash a hash_bits a partir de los tokens del texto."""

    tokens = _tokenize(text)
    if not tokens:
        return 0
    vector = [0] * hash_bits
    for tok in tokens:
        h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
        for i in range(hash_bits):
            bit = (h >> i) & 1
            vector[i] += 1 if bit else -1
    fingerprint = 0
    for i in range(hash_bits):
        if vector[i] > 0:
            fingerprint |= 1 << i
    return fingerprint


def hamming_distance(a: int, b: int) -> int:
    """Distancia de Hamming entre dos enteros."""

    return bin(a ^ b).count("1")


def is_near_duplicate(a_simhash: int, b_simhash: int, threshold: int = 5) -> bool:
    """True si la distancia de Hamming es <= threshold."""

    if a_simhash == 0 or b_simhash == 0:
        return False
    return hamming_distance(a_simhash, b_simhash) <= threshold


def _resolve_field(item: dict, by_field: str) -> str:
    for key in (by_field, "title", "content", "text", "body"):
        val = item.get(key)
        if val:
            return str(val)
    return ""


def dedup_items(
    items: List[dict],
    by_field: str = "title",
    threshold: int = 5,
) -> DedupResult:
    """Deduplica una lista de dicts mediante hash exacto + simhash."""

    kept: List[dict] = []
    duplicates: List[dict] = []
    reasons: dict[str, str] = {}
    seen_exact: dict[str, int] = {}
    simhashes: list[int] = []
    keys: list[str] = []

    for item in items:
        text = _resolve_field(item, by_field)
        if not text:
            kept.append(item)
            simhashes.append(0)
            keys.append(item.get("id") or f"idx{len(kept)-1}")
            continue
        exact_key = compute_title_hash(text)
        item_id = str(item.get("id") or item.get("url") or exact_key)
        if exact_key in seen_exact:
            duplicates.append(item)
            reasons[item_id] = f"exact_match:{exact_key[:8]}"
            continue
        sh = compute_simhash(text)
        is_near = False
        for prev_sh, prev_key in zip(simhashes, keys):
            if prev_sh and is_near_duplicate(sh, prev_sh, threshold=threshold):
                duplicates.append(item)
                reasons[item_id] = f"near_duplicate_of:{prev_key}"
                is_near = True
                break
        if is_near:
            continue
        seen_exact[exact_key] = len(kept)
        kept.append(item)
        simhashes.append(sh)
        keys.append(item_id)

    return DedupResult(kept=kept, duplicates=duplicates, reasons=reasons)


def find_duplicates_in_corpus(items: List[dict]) -> list[tuple[int, int]]:
    """Devuelve pares (i, j) de índices considerados duplicados/casi-duplicados."""

    pairs: list[tuple[int, int]] = []
    simhashes: list[int] = []
    titles: list[str] = []
    for it in items:
        text = _resolve_field(it, "title")
        simhashes.append(compute_simhash(text))
        titles.append(compute_title_hash(text))
    n = len(items)
    for i in range(n):
        for j in range(i + 1, n):
            if titles[i] and titles[i] == titles[j]:
                pairs.append((i, j))
                continue
            if is_near_duplicate(simhashes[i], simhashes[j], threshold=5):
                pairs.append((i, j))
    return pairs


__all__ = [
    "DedupResult",
    "compute_content_hash",
    "compute_title_hash",
    "compute_simhash",
    "hamming_distance",
    "is_near_duplicate",
    "dedup_items",
    "find_duplicates_in_corpus",
]
