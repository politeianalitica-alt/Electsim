#!/usr/bin/env python3
"""bin/rebuild_dossiers.py

Orquesta la regeneración SEGURA de los dossiers que se construyen desde datos
en vivo (Congreso y Senado). El problema que resuelve: gen_congreso.py y
gen_senado.py regeneran el JSON DESDE CERO con el opendata, y por sí solos
descartan la capa de parches manuales (biografías extensas, cifras curadas).
Este orquestador re-aplica SIEMPRE esa capa y regenera el fixture TS, en el
orden correcto, para que volver a tirar del opendata nunca pierda trabajo.

Los generadores base abortan si el JSON ya existe y no se pasa --force; aquí
pasamos --force a propósito y encadenamos los parches a continuación.

Uso:
  python3 bin/rebuild_dossiers.py --source congreso
  python3 bin/rebuild_dossiers.py --source senado
  python3 bin/rebuild_dossiers.py --source all
  python3 bin/rebuild_dossiers.py --source congreso --dry-run   # solo imprime
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# Orden EXACTO por fuente: generador base (--force) -> parches manuales -> fixture.
STEPS: dict[str, list[list[str]]] = {
    "congreso": [
        ["python3", "bin/gen_congreso.py", "--force"],        # base desde opendata (hornea decls)
        ["python3", "scripts/lideres_nacionales.py"],         # re-aplica bios manuales (p.ej. Feijóo)
        ["python3", "bin/patch_decl_links_congreso.py"],      # decls (idempotente, por si acaso)
        ["python3", "bin/patch_wikidata_enrich.py", "--source", "congreso"],  # trayectoria/cargos (Wikidata)
        ["python3", "bin/gen_subfixture.py", "--source", "congreso"],
    ],
    "senado": [
        ["python3", "bin/decl_links_senado.py"],              # refresca cache de declaraciones + parchea
        ["python3", "bin/gen_senado.py", "--force"],          # regenera base horneando la cache fresca
        ["python3", "bin/patch_wikidata_enrich.py", "--source", "senado"],    # trayectoria/cargos (Wikidata)
        ["python3", "bin/gen_subfixture.py", "--source", "senado"],
    ],
}


def run(cmd: list[str], dry: bool) -> int:
    print("  $ " + " ".join(cmd))
    if dry:
        return 0
    return subprocess.run(cmd, cwd=REPO).returncode


def main(argv: list[str]) -> int:
    dry = "--dry-run" in argv
    source = None
    if "--source" in argv:
        i = argv.index("--source")
        if i + 1 < len(argv):
            source = argv[i + 1]
    if source not in (*STEPS, "all"):
        print("uso: python3 bin/rebuild_dossiers.py --source {congreso|senado|all} [--dry-run]")
        return 2
    sources = list(STEPS) if source == "all" else [source]
    for s in sources:
        print(f"== rebuild · {s} ==")
        for cmd in STEPS[s]:
            rc = run(cmd, dry)
            if rc != 0:
                print(f"  ✗ falló (rc={rc}): {' '.join(cmd)}")
                return rc
    print("OK · rebuild completado" + (" (dry-run)" if dry else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
