#!/usr/bin/env python3
"""bin/fetch_wikidata_enrich.py

Enriquece dossieres con DATOS PÚBLICOS VERIFICABLES de Wikidata (licencia CC0,
dominio público) — sin inventar nada. Por cada persona de un dossier:

  1. Busca su entidad en Wikidata y la DESAMBIGUA de forma estricta (match de
     etiqueta + es humano + político/español). Si no hay certeza, la SALTA.
  2. Extrae datos estructurados citables: partido (P102), cargos públicos con
     fechas (P39 + P580/P582) y predecesor/sucesor en el cargo (P1365/P1366 →
     conexiones reales), nacimiento (P569/P19), formación (P69), ocupación
     (P106) y el enlace a su artículo de Wikipedia (es).
  3. Resuelve todos los Q-id referenciados a etiquetas en español.

Cache en bin/enrich_wikidata_<source>.json (clave = norm_key(nombre)). RESUMIBLE:
re-ejecutar solo procesa lo que falte (o --refresh). Amable con la API (maxlag,
respeta Retry-After) y NUNCA marca skip por un error de red (lo deja reintentable).

NO escribe en los dossieres (eso lo hace bin/patch_wikidata_enrich.py). NO copia
texto de Wikipedia (solo el enlace) para respetar copyright; Wikidata es CC0.

Uso:
  python3 bin/fetch_wikidata_enrich.py --source senado
  python3 bin/fetch_wikidata_enrich.py --source congreso --limit 50
"""
from __future__ import annotations

import argparse
import glob
import json
import re
import ssl
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
API = "https://www.wikidata.org/w/api.php"
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
UA = "ElectSim-research/1.0 (political dossiers; research; contact oscar)"

SOURCES = {
    "senado": [REPO / "data" / "senado" / "senadores.json"],
    "congreso": [REPO / "data" / "congreso" / "diputados.json"],
    "poder": sorted(glob.glob(str(REPO / "data" / "poder" / "figuras_clave*.json"))),
    "ibex35": sorted(glob.glob(str(REPO / "data" / "ibex35" / "*.json"))),
    "diputaciones": sorted(glob.glob(str(REPO / "data" / "diputaciones" / "*.json"))),
}

DESC_HINTS = ("politic", "senator", "senador", "deput", "diputad", "alcalde", "mayor",
              "minister", "ministr", "president", "councillor", "concejal", "jurist",
              "magistrad", "fiscal", "prosecutor", "judge", "juez", "economist",
              "businesspeople", "businessman", "businesswoman", "executive", "ejecutiv",
              "abogad", "lawyer", "spanish", "español", "españa", "spain")
P_BIRTH, P_BIRTHPLACE, P_PARTY = "P569", "P19", "P102"
P_POSITION, P_EDU, P_OCC, P_CITIZEN, P_INSTANCE = "P39", "P69", "P106", "P27", "P31"
Q_HUMAN, Q_SPAIN = "Q5", "Q29"


class APIError(Exception):
    pass


def nk(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def _get(params: dict) -> dict:
    params = {**params, "format": "json", "maxlag": "5"}
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            data = json.loads(urllib.request.urlopen(req, timeout=45, context=CTX).read().decode("utf-8"))
            if isinstance(data, dict) and data.get("error", {}).get("code") == "maxlag":
                time.sleep(5)
                continue
            return data
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After", "0") or 0) or (5 * (attempt + 1))
                time.sleep(min(wait, 30))
                continue
            if e.code >= 500:
                time.sleep(3 * (attempt + 1))
                continue
            raise APIError(f"HTTP {e.code}") from e
        except Exception:  # noqa: BLE001 — red intermitente
            time.sleep(2 * (attempt + 1))
    raise APIError("max reintentos")


def search(name: str) -> list[dict]:
    return _get({"action": "wbsearchentities", "search": name, "language": "es",
                 "uselang": "es", "type": "item", "limit": 7}).get("search", [])


def get_entities(ids: list[str]) -> dict:
    out = {}
    for i in range(0, len(ids), 45):
        r = _get({"action": "wbgetentities", "ids": "|".join(ids[i:i + 45]),
                  "props": "claims|labels|sitelinks", "languages": "es"})
        out.update(r.get("entities", {}))
        time.sleep(0.2)
    return out


def _vals(ent: dict, prop: str) -> list:
    out = []
    for c in ent.get("claims", {}).get(prop, []):
        dv = c.get("mainsnak", {}).get("datavalue", {})
        v = dv.get("value")
        if isinstance(v, dict) and "id" in v:
            out.append(v["id"])
        elif v is not None:
            out.append(v)
    return out


def _year(timeval) -> str | None:
    if isinstance(timeval, dict):
        m = re.match(r"[+-](\d{4})", timeval.get("time", ""))
        return m.group(1) if m and m.group(1) != "0000" else None
    return None


def _positions(ent: dict) -> list[dict]:
    res = []
    for c in ent.get("claims", {}).get(P_POSITION, []):
        ms = c.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        qid = ms.get("id") if isinstance(ms, dict) else None
        if not qid:
            continue
        q = c.get("qualifiers", {})

        def qtime(p):
            arr = q.get(p, [])
            return _year(arr[0].get("datavalue", {}).get("value")) if arr else None

        def qref(p):
            arr = q.get(p, [])
            if arr:
                v = arr[0].get("datavalue", {}).get("value", {})
                return v.get("id") if isinstance(v, dict) else None
            return None

        res.append({"cargo": qid, "desde": qtime("P580"), "hasta": qtime("P582"),
                    "reemplaza": qref("P1365"), "reemplazado_por": qref("P1366")})
    return res


def disambiguate(name: str) -> dict | None:
    """Match estricto: filtra por la propia búsqueda y confirma con 1 entidad."""
    target = nk(name)
    cands = search(name)
    if not cands:
        return None
    scored = []
    for c in cands:
        nlabel = nk(c.get("label", "") or "")
        desc = (c.get("description") or "").lower()
        name_ok = nlabel == target or (len(target) > 8 and (target in nlabel or nlabel in target))
        if not name_ok:
            continue
        s = (3 if nlabel == target else 0) + (1 if any(h in desc for h in DESC_HINTS) else 0)
        scored.append((s, c))
    if not scored:
        return None
    scored.sort(key=lambda x: x[0], reverse=True)
    for _, c in scored[:2]:
        ent = get_entities([c["id"]]).get(c["id"], {})
        if Q_HUMAN not in _vals(ent, P_INSTANCE):
            continue
        spanish = Q_SPAIN in _vals(ent, P_CITIZEN)
        has_pos = bool(_vals(ent, P_POSITION))
        desc_ok = any(h in (c.get("description") or "").lower() for h in DESC_HINTS)
        if spanish or has_pos or desc_ok:
            return {"qid": c["id"], "ent": ent}
    return None


def build_record(name: str, qid: str, ent: dict) -> dict:
    party = _vals(ent, P_PARTY)
    occ = _vals(ent, P_OCC)
    edu = _vals(ent, P_EDU)
    bplace = _vals(ent, P_BIRTHPLACE)
    positions = _positions(ent)
    birth = None
    for c in ent.get("claims", {}).get(P_BIRTH, []):
        birth = _year(c.get("mainsnak", {}).get("datavalue", {}).get("value"))
        break
    eswiki = (ent.get("sitelinks", {}).get("eswiki", {}) or {}).get("title")
    return {
        "nombre": name, "qid": qid,
        "wikidata_url": f"https://www.wikidata.org/wiki/{qid}",
        "wikipedia_url": (f"https://es.wikipedia.org/wiki/{urllib.parse.quote(eswiki.replace(' ', '_'))}"
                          if eswiki else None),
        "nacimiento": birth,
        "lugar_nacimiento_q": bplace[0] if bplace else None,
        "partido_q": party, "ocupacion_q": occ, "formacion_q": edu, "cargos": positions,
    }


def _all_refs(cache: dict) -> set:
    refs = set()
    for k, rec in cache.items():
        if k.startswith("_") or rec.get("_skip"):
            continue
        refs |= set(rec.get("partido_q", []) + rec.get("ocupacion_q", []) + rec.get("formacion_q", []))
        if rec.get("lugar_nacimiento_q"):
            refs.add(rec["lugar_nacimiento_q"])
        for pos in rec.get("cargos", []):
            for kk in ("cargo", "reemplaza", "reemplazado_por"):
                if pos.get(kk):
                    refs.add(pos[kk])
    return refs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=list(SOURCES), required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--refresh", action="store_true")
    args = ap.parse_args()

    cache_path = REPO / "bin" / f"enrich_wikidata_{args.source}.json"
    cache = json.loads(cache_path.read_text("utf-8")) if cache_path.exists() and not args.refresh else {}

    persons: dict[str, str] = {}
    for f in SOURCES[args.source]:
        try:
            arr = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(arr, list):
            for d in arr:
                if isinstance(d, dict) and d.get("nombre"):
                    persons.setdefault(nk(d["nombre"]), d["nombre"])

    todo = [(k, v) for k, v in persons.items() if k not in cache]
    if args.limit:
        todo = todo[:args.limit]
    print(f"· {args.source}: {len(persons)} personas · cacheadas {len(cache)} · a procesar {len(todo)}")

    def save():
        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

    errs = 0
    for n, (key, name) in enumerate(todo, 1):
        try:
            hit = disambiguate(name)
            errs = 0
        except APIError as e:
            errs += 1
            print(f"  ! API {name}: {e} (reintentable)", file=sys.stderr)
            if errs >= 8:
                print("  ! demasiados errores; guardo y paro (re-ejecuta para continuar)")
                break
            time.sleep(5)
            continue
        cache[key] = build_record(name, hit["qid"], hit["ent"]) if hit else {"_skip": True, "nombre": name}
        if n % 20 == 0:
            save()
            print(f"  · {n}/{len(todo)}")
        time.sleep(0.7)
    save()

    # etiquetas (es) de todos los Q-id referenciados
    labels = cache.get("_labels", {})
    missing = [q for q in _all_refs(cache) if q not in labels]
    if missing:
        print(f"· resolviendo {len(missing)} etiquetas")
        try:
            for q, ent in get_entities(missing).items():
                lab = (ent.get("labels", {}).get("es", {}) or {}).get("value")
                if lab:
                    labels[q] = lab
        except APIError as e:
            print(f"  ! labels: {e} (re-ejecuta para completar)")
    cache["_labels"] = labels
    save()

    matched = sum(1 for k, v in cache.items() if not k.startswith("_") and not v.get("_skip"))
    skipped = sum(1 for k, v in cache.items() if not k.startswith("_") and v.get("_skip"))
    print(f"OK · {cache_path.relative_to(REPO)} · matched {matched} · skip {skipped} · labels {len(labels)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
