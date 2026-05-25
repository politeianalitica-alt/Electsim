#!/usr/bin/env python3
"""Parser del PDF de diputados de Vox. Mismo formato que Sumar."""
import json
import re
import sys
from pathlib import Path

PDF_TXT = Path("/tmp/dossiers_vox.txt")


def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u",
            "à": "a", "è": "e", "ò": "o", "ï": "i", "ç": "c"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


def main():
    text = PDF_TXT.read_text(encoding="utf-8")
    lines = text.split("\n")

    perfil_lines = [i for i, l in enumerate(lines) if l.strip() == "1. Perfil general ampliado"]
    print(f"Encontradas {len(perfil_lines)} secciones de perfil", file=sys.stderr)

    dossier_starts = []
    for perfil_idx in perfil_lines:
        i = perfil_idx - 1
        while i > 0 and not lines[i].strip():
            i -= 1
        if i <= 0:
            continue
        partido_prov = lines[i].strip()
        i -= 1
        while i > 0 and not lines[i].strip():
            i -= 1
        if i <= 0:
            continue
        nombre_raw = lines[i].strip()
        m = re.match(r"^(?:\d+\.\s+)?(.+)$", nombre_raw)
        if not m:
            continue
        nombre = m.group(1).strip()
        if len(nombre) < 5 or len(nombre.split()) < 2:
            continue
        low = nombre.lower()
        if "patrimonial" in low or "estimacion" in low or "informe" in low or "valorad" in low or "deudas" in low:
            continue
        dossier_starts.append((perfil_idx, nombre, partido_prov))

    print(f"✓ {len(dossier_starts)} dosieres detectados", file=sys.stderr)

    dosieres = []
    for idx, (perfil_idx, nombre, partido_prov) in enumerate(dossier_starts):
        end = dossier_starts[idx + 1][0] - 2 if idx + 1 < len(dossier_starts) else len(lines)
        chunk = lines[perfil_idx:end]

        if " - " in partido_prov:
            partido_label, provincia = partido_prov.rsplit(" - ", 1)
        else:
            partido_label, provincia = partido_prov, ""
        partido = "VOX" if "vox" in partido_label.lower() else partido_label.strip()
        cargo = f"Diputado/a de Vox por {provincia}" if provincia else "Diputado/a Vox"

        perfil = ""
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones politicas persona-persona")
            perfil_lines_text = [l.strip() for l in chunk[1:r_idx] if l.strip()]
            perfil = " ".join(perfil_lines_text)
        except StopIteration:
            pass

        relaciones = []
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones politicas persona-persona")
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            tabla = chunk[r_idx + 1:pat_idx]
            for line in tabla:
                stripped = line.strip()
                if not stripped or stripped.startswith("Persona") or stripped == "Nota":
                    continue
                m = re.match(r"^(.+?)\s{2,}([\+\-]?\d+)$", stripped)
                if m:
                    relaciones.append({
                        "persona": m.group(1).strip(),
                        "tipo": "Relación política",
                        "nota": int(m.group(2)),
                        "explicacion": "Valoración política sin texto adicional en este informe.",
                    })
        except StopIteration:
            pass

        patrimonio = []
        try:
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            pat_lines = chunk[pat_idx + 1:]
            for line in pat_lines:
                stripped = line.strip()
                if not stripped:
                    continue
                if stripped.startswith("Concepto") or stripped == "Cantidad":
                    continue
                if stripped.startswith("Pagina") or stripped.startswith("Informe") or stripped.startswith("Estimacion prudente:") or stripped.startswith("Nota:"):
                    continue
                m = re.match(r"^(.+?)\s{2,}(.+)$", stripped)
                if m:
                    concepto = m.group(1).strip()
                    valor = m.group(2).strip()
                    if concepto and valor:
                        patrimonio.append({"concepto": concepto, "valor": valor})
        except StopIteration:
            pass

        dosieres.append({
            "slug": slugify(nombre),
            "num": 300 + idx,
            "nombre_completo": nombre,
            "cargo_actual": cargo,
            "partido": partido,
            "bio_corta": (perfil[:280] + "...") if len(perfil) > 280 else perfil,
            "perfil_completo": perfil,
            "relaciones": relaciones,
            "patrimonio": patrimonio,
        })

    out = Path("/tmp/dosieres_vox.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} dosieres → {out}", file=sys.stderr)
    print(f"  relaciones: {sum(len(d['relaciones']) for d in dosieres)}", file=sys.stderr)
    print(f"  patrimonio: {sum(len(d['patrimonio']) for d in dosieres)}", file=sys.stderr)


if __name__ == "__main__":
    main()
