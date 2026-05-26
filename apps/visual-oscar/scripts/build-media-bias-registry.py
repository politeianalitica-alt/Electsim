#!/usr/bin/env python3
"""
Sprint G14 FASE 2 · build-media-bias-registry

Genera `apps/visual-oscar/data/media-bias-registry.json` desde el CSV crudo
MBFC (Media Bias/Fact Check) que vive en `gits amigos/`.

Idempotente · re-ejecutable cuando el dataset upstream se actualice.

Uso:
  python3 apps/visual-oscar/scripts/build-media-bias-registry.py

Input:
  gits amigos/Factual-Reporting-and-Political-Bias-Web-Interactions-main/data/mbfc_raw.csv

Output:
  apps/visual-oscar/data/media-bias-registry.json  (~590 KB · 4 435 dominios)

Normalización aplicada:
  - press_freedom: free | mostly_free | partly_free | not_free | oppression | unknown
    (incluye derivación desde rankings "country X/180")
  - bias: left | left_center | center | right_center | right | conspiracy |
          questionable | pro_science | satire | unknown
  - factual_reporting: very_high | high | mostly_factual | mixed | low |
                       very_low | unknown
  - country: lowercase, quitando "(X/180 press freedom)" suffix
"""
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

# ──────────────────── paths ────────────────────

ROOT = Path(__file__).resolve().parents[3]  # apps/visual-oscar/scripts -> repo root
SRC_CANDIDATES = [
    ROOT / "gits amigos" / "Factual-Reporting-and-Political-Bias-Web-Interactions-main" / "data" / "mbfc_raw.csv",
    Path("/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/gits amigos/Factual-Reporting-and-Political-Bias-Web-Interactions-main/data/mbfc_raw.csv"),
]
OUT = Path(__file__).resolve().parent.parent / "data" / "media-bias-registry.json"


def find_src() -> Path:
    for c in SRC_CANDIDATES:
        if c.exists():
            return c
    raise FileNotFoundError(
        "mbfc_raw.csv no encontrado. Probaste: " + " ; ".join(str(c) for c in SRC_CANDIDATES)
    )


# ──────────────────── normalizadores ────────────────────

def normalize_press_freedom(raw: str) -> str:
    if not raw:
        return "unknown"
    s = raw.lower().strip()
    if "total oppression" in s or "oppress" in s:
        return "oppression"
    if "excellent" in s:
        return "free"
    if "mostly free" in s:
        return "mostly_free"
    if "moderate" in s:
        return "partly_free"
    if "limited" in s:
        return "not_free"
    m = re.search(r"(\d{1,3})\s*/\s*180", s)
    if m:
        rank = int(m.group(1))
        if rank <= 30: return "free"
        if rank <= 60: return "mostly_free"
        if rank <= 100: return "partly_free"
        return "not_free"
    return "unknown"


def normalize_bias(raw: str) -> str:
    if not raw:
        return "unknown"
    s = raw.lower().strip()
    mapping = {
        "left": "left", "left bias": "left",
        "left-center": "left_center", "left center": "left_center",
        "center": "center", "least biased": "center", "neutral": "center",
        "right-center": "right_center", "right center": "right_center",
        "right": "right", "right bias": "right",
        "conspiracy-pseudoscience": "conspiracy", "conspiracy": "conspiracy",
        "questionable": "questionable", "questionable source": "questionable",
        "pro-science": "pro_science", "pro science": "pro_science",
        "satire": "satire",
    }
    return mapping.get(s, "unknown")


def normalize_country(raw: str) -> str:
    if not raw:
        return "unknown"
    s = raw.lower().strip()
    s = re.sub(r"\s*\(.*?\)", "", s).strip()
    return s if s else "unknown"


def normalize_factual(raw: str) -> str:
    if not raw:
        return "unknown"
    s = raw.lower().strip()
    if s in {"very high", "high", "mostly factual", "mixed", "low", "very low"}:
        return s.replace(" ", "_")
    return "unknown"


# ──────────────────── build ────────────────────

def main() -> int:
    src = find_src()
    print(f"Input:  {src}")
    print(f"Output: {OUT}")

    registry: dict[str, dict] = {}
    seen: set[str] = set()
    with src.open("r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            domain = (row.get("source") or "").strip().lower()
            if not domain or domain in seen:
                continue
            seen.add(domain)
            country = normalize_country(row.get("country", ""))
            registry[domain] = {
                "d": domain,
                "c": country,
                "b": normalize_bias(row.get("bias", "")),
                "f": normalize_factual(row.get("factual_reporting", "")),
                "p": normalize_press_freedom(row.get("press_freedom", "")),
                "m": (row.get("media_type") or "unknown").lower().strip(),
                "r": (row.get("mbfc_credibility_rating") or "unknown").lower().strip(),
            }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, separators=(",", ":"))

    # Stats
    bias_counts = Counter(v["b"] for v in registry.values())
    pf_counts = Counter(v["p"] for v in registry.values())
    country_counts = Counter(v["c"] for v in registry.values())
    size_kb = OUT.stat().st_size / 1024

    print(f"\n✓ {len(registry)} dominios · {size_kb:.1f} KB")
    print(f"  bias:       {dict(bias_counts.most_common())}")
    print(f"  press_freedom: {dict(pf_counts.most_common())}")
    print(f"  top países: {dict(country_counts.most_common(8))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
