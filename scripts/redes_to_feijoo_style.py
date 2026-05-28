"""scripts/redes_to_feijoo_style.py

Reformatea el apartado `redes` de cada dossier seed (IBEX 35 + Diputaciones)
al estilo "Feijóo": cada contacto recibe una nota analítica +N/-N (0-10)
y se reescribe como `**Cargo** (nota ±N/10) — Justificación`, con tags
`["nota-±N", "alianza-fuerte" | "alianza-debil" | "neutral" | "conflicto"]`.

La nota se infiere heurísticamente a partir de palabras clave en el
contenido original del item. Si no se puede valorar (palabras clave
ambiguas o ausentes), el item queda con la relación sin nota — al estilo
"Apellidos · Cargo — Vínculo institucional sin valoración."

Uso:
    .venv/bin/python scripts/redes_to_feijoo_style.py --dry-run
    .venv/bin/python scripts/redes_to_feijoo_style.py            # write
    .venv/bin/python scripts/redes_to_feijoo_style.py --only ibex35

Salidas: sobrescribe in-place los JSON de:
    data/ibex35/{empresas,directivos,conexos}.json
    data/diputaciones/{instituciones,presidentes,complementos}.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parent.parent
SEED_FILES = {
    "ibex35": [
        REPO / "data" / "ibex35" / "empresas.json",
        REPO / "data" / "ibex35" / "directivos.json",
        REPO / "data" / "ibex35" / "conexos.json",
    ],
    "diputaciones": [
        REPO / "data" / "diputaciones" / "instituciones.json",
        REPO / "data" / "diputaciones" / "presidentes.json",
        REPO / "data" / "diputaciones" / "complementos.json",
    ],
}


# ─── Tabla de heurísticas: palabras clave → nota orientativa ──────────
# La nota va de -10 a +10. La heurística agrupa por valencia
# (positivo/negativo/neutro) y magnitud (fuerte/débil/medio).
POSITIVE_KW = {
    # +9/+10: alianza máxima, liderazgo, control
    +9: ["mano derecha", "imprescindible", "máxima confianza", "alter ego"],
    +8: [
        "preside",
        "presidente",
        "diputado general",
        "controla",
        "accionista de control",
        "matriz",
        "fundador",
        "tándem",
        "tandem",
        "patrona",
        "patron",
        "jefe de gabinete",
    ],
    +7: [
        "consejero",
        "lider del partido",
        "aliado",
        "alianza estratégica",
        "alianza estrategica",
        "socio principal",
        "socio estratégico",
        "socio estrategico",
        "coordina",
        "lideró",
        "lidera",
        "fundo",
        "cofundador",
        "cofundadora",
    ],
    +6: [
        "miembro",
        "vocal",
        "ceo",
        "director general",
        "vicepresidente",
        "vicepresidenta",
        "interlocución cordial",
        "interlocucion cordial",
        "buena interlocución",
        "buena interlocucion",
        "patrocinador",
        "patrocinadora",
        "cordial",
    ],
    +5: [
        "vinculación",
        "vinculacion",
        "relación cordial",
        "relacion cordial",
        "aliada",
        "patrocinio",
        "socio",
        "matrimonio",
        "casada",
        "casado",
        "esposa",
        "esposo",
        "padre",
        "madre",
        "hijo",
        "hija",
        "hermano",
        "hermana",
        "familia",
    ],
    +4: [
        "interlocutor",
        "interlocución",
        "interlocucion",
        "coordina",
        "coordinación",
        "coordinacion",
        "pacto",
        "acuerdo",
        "colaboración",
        "colaboracion",
    ],
    +3: [
        "miembro destacado",
        "participa",
        "patrocina",
        "convenio",
    ],
}

NEGATIVE_KW = {
    -9: ["enemistad", "ruptura total", "guerra personal"],
    -8: [
        "conflicto",
        "guerra societaria",
        "batalla societaria",
        "judicializa",
        "procesado",
        "imputado",
        "demandado",
        "espionaje",
        "víctima de espionaje",
        "victima de espionaje",
        "espía",
        "espia",
        "tensión política",
        "tension politica",
        "denuncia",
    ],
    -7: [
        "oposición",
        "oposicion",
        "tensión",
        "tension",
        "choque",
        "crítica",
        "critica",
        "rival",
        "adversario",
        "litiga",
        "demanda",
        "investigado",
        "controversia",
        "polémica",
        "polemica",
    ],
    -6: [
        "discrepancia",
        "discrepa",
        "se distancia",
        "ruptura",
        "destitución",
        "destitucion",
        "cesado",
        "destituido",
        "saliente",
    ],
    -5: [
        "ex-",
        "antiguo",
        "predecesor",
        "predecesora",
        "expresidente",
        "exministro",
    ],
}

NEUTRAL_KW = [
    "regulación",
    "regulacion",
    "regulador",
    "tutela",
    "supervisión",
    "supervision",
    "interlocución regulatoria",
    "interlocucion regulatoria",
]


def detect_score(text: str) -> int | None:
    """Devuelve la nota más representativa para el texto, o None si no se
    puede valorar con confianza."""
    if not text:
        return None
    t = text.lower()

    # 1. Buscar palabras clave negativas primero (suelen ser señales más
    # fuertes que las positivas en textos descriptivos).
    for score, words in sorted(NEGATIVE_KW.items(), key=lambda x: x[0]):
        for w in words:
            if w in t:
                return score

    # 2. Después positivas, empezando por las más fuertes.
    for score, words in sorted(POSITIVE_KW.items(), key=lambda x: -x[0]):
        for w in words:
            if w in t:
                return score

    # 3. Neutras: relación regulatoria/institucional, sin valencia clara.
    for w in NEUTRAL_KW:
        if w in t:
            return 0

    # 4. Sin señal clara → no valoramos.
    return None


def tag_for(score: int | None) -> list[str]:
    if score is None:
        return ["sin-valorar"]
    sign = "+" if score >= 0 else "-"
    tag_nota = f"nota-{sign}{abs(score)}"
    if score >= 7:
        return [tag_nota, "alianza-fuerte"]
    if score >= 4:
        return [tag_nota, "alianza-debil"]
    if score >= 0:
        return [tag_nota, "neutral"]
    if score >= -6:
        return [tag_nota, "tension"]
    return [tag_nota, "conflicto"]


# Detecta si el item ya está al estilo Feijóo (tiene `(nota +N/10)`).
RX_ALREADY_FEIJOO = re.compile(r"\(nota\s*[+-]\d+/10\)")


def rewrite_item(item: dict[str, Any]) -> bool:
    """Reescribe un item del apartado redes al estilo Feijóo.
    Devuelve True si fue modificado."""
    contenido_original = item.get("contenido") or ""
    if RX_ALREADY_FEIJOO.search(contenido_original):
        return False  # ya tiene formato Feijóo

    titulo = (item.get("titulo") or "").strip()
    if not titulo:
        return False

    score = detect_score(f"{titulo} {contenido_original}")

    # Extraer el "rol" / primer fragmento del contenido (antes del primer
    # punto) como cargo destacado en negrita. Si no hay punto, usar todo.
    primera_frase = contenido_original.split(".")[0].strip()
    resto = contenido_original[len(primera_frase) + 1 :].strip()

    if score is None:
        # Sin valoración: simplemente "Vínculo · contexto"
        nuevo_contenido = f"**{primera_frase or 'Vínculo'}**"
        if resto:
            nuevo_contenido += f" — {resto}"
    else:
        sign = "+" if score >= 0 else "-"
        nuevo_contenido = f"**{primera_frase or 'Relación'}** (nota {sign}{abs(score)}/10)"
        if resto:
            nuevo_contenido += f" — {resto}"

    item["contenido"] = nuevo_contenido

    # Fusionar tags existentes con los nuevos sin duplicar.
    existing = list(item.get("tags") or [])
    nuevos = [t for t in tag_for(score) if t not in existing]
    item["tags"] = existing + nuevos
    return True


def process_file(path: Path, *, dry_run: bool) -> tuple[int, int, int]:
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    n_items = 0
    n_changed = 0
    n_unvalued = 0

    for d in data:
        for ap in d.get("apartados") or []:
            if ap.get("tipo") != "redes":
                continue
            for item in ap.get("items") or []:
                n_items += 1
                changed = rewrite_item(item)
                if changed:
                    n_changed += 1
                if "sin-valorar" in (item.get("tags") or []):
                    n_unvalued += 1

    if not dry_run and n_changed:
        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)

    return n_items, n_changed, n_unvalued


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", choices=[*list(SEED_FILES.keys()), "all"], default="all")
    args = parser.parse_args()

    sets = [args.only] if args.only != "all" else list(SEED_FILES.keys())

    grand_items = 0
    grand_changed = 0
    grand_unvalued = 0
    mode = "DRY-RUN" if args.dry_run else "WRITE"
    print(f"=== Reformat redes → estilo Feijóo · {mode} ===")
    for s in sets:
        for path in SEED_FILES[s]:
            if not path.exists():
                print(f"  [skip] {path} no existe")
                continue
            n, c, u = process_file(path, dry_run=args.dry_run)
            valored = c - u
            label = f"{s}/{path.stem}"
            print(
                f"  {label:32s}  items={n:4d}  reformat={c:4d}  "
                f"valorados={valored:4d}  sin-valorar={u:4d}"
            )
            grand_items += n
            grand_changed += c
            grand_unvalued += u

    print()
    print(
        f"TOTAL · items={grand_items}  reformat={grand_changed}  "
        f"sin-valorar={grand_unvalued}  "
        f"({100 * (grand_changed - grand_unvalued) / max(grand_changed, 1):.0f}% valorados)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
