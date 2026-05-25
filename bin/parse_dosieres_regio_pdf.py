#!/usr/bin/env python3
"""Parser del PDF de regionalistas y Grupo Mixto · formato simple.

Diferencias con el primer PDF (Informe_politicos_publicos):
   - Header del dossier: 2 líneas "Nombre" + "Partido - Provincia" (sin numeración)
   - Tabla relaciones: SOLO 2 columnas (Persona | Nota), sin Tipo ni Explicacion
   - Tabla patrimonio: 2 columnas (Concepto | Cantidad)
"""
import json
import re
import sys
from pathlib import Path

PDF_TXT = Path("/tmp/dossiers_regio.txt")


def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u",
            "à": "a", "è": "e", "ò": "o", "ï": "i"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


# Partido en el header → partido canónico para el fixture
PARTIDO_CANON = {
    "BNG": "BNG", "PNV": "PNV", "ERC": "ERC", "Junts": "Junts",
    "EH Bildu": "EH Bildu", "Podemos": "Podemos",
    "Coalicion Canaria": "CC", "UPN": "UPN",
    "Mes-Compromis": "Compromís", "Compromis": "Compromís",
}

def canon_partido(label: str) -> str:
    label = label.strip()
    for k, v in PARTIDO_CANON.items():
        if k in label:
            return v
    return label


def main():
    text = PDF_TXT.read_text(encoding="utf-8")
    lines = text.split("\n")

    perfil_lines = [i for i, l in enumerate(lines) if l.strip() == "1. Perfil general ampliado"]
    print(f"Encontradas {len(perfil_lines)} secciones de perfil", file=sys.stderr)

    dossier_starts = []
    for perfil_idx in perfil_lines:
        # Caminar hacia atrás: cargo (línea con " - ") y luego nombre
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
        # Si esta línea contiene "Estimacion financiera neta" o "Pagina N" o "Grupo Mixto"/"PNV"/etc
        # significa que es resto de la página anterior, no el nombre. Saltarla.
        nombre_candidate = lines[i].strip()
        # Aceptar como nombre si contiene 2+ palabras todas con mayúscula inicial
        if not re.match(r"^[A-ZÁÉÍÓÚÑ][\wáéíóúñà-üñ\-]+( [\w\-áéíóúñà-üñ']+){1,}$", nombre_candidate):
            print(f"  ⚠ línea {i} no parece nombre: {nombre_candidate[:60]}", file=sys.stderr)
            continue
        dossier_starts.append((perfil_idx, nombre_candidate, partido_prov))

    print(f"✓ {len(dossier_starts)} dosieres detectados", file=sys.stderr)

    dosieres = []
    for idx, (perfil_idx, nombre, partido_prov) in enumerate(dossier_starts):
        end = dossier_starts[idx + 1][0] - 2 if idx + 1 < len(dossier_starts) else len(lines)
        chunk = lines[perfil_idx:end]

        # Partir partido y provincia
        partido = canon_partido(partido_prov.split(" - ")[0] if " - " in partido_prov else partido_prov)
        provincia = partido_prov.split(" - ", 1)[1] if " - " in partido_prov else ""

        # Cargo deducido del partido/provincia
        cargo = f"Diputado/a por {provincia} ({partido})" if provincia else f"Diputado/a ({partido})"

        # Perfil general
        perfil = ""
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones politicas persona-persona")
            perfil_lines_text = [l.strip() for l in chunk[1:r_idx] if l.strip()]
            perfil = " ".join(perfil_lines_text)
        except StopIteration:
            pass

        # Relaciones (formato simple: persona | nota)
        relaciones = []
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones politicas persona-persona")
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            tabla = chunk[r_idx + 1:pat_idx]
            for line in tabla:
                stripped = line.strip()
                if not stripped or stripped.startswith("Persona") or stripped == "Nota":
                    continue
                # Patrón: "Nombre persona ... NN" (nota al final, números con +/-)
                m = re.match(r"^(.+?)\s{2,}([\+\-]?\d+)$", stripped)
                if m:
                    nota = int(m.group(2))
                    persona = m.group(1).strip()
                    relaciones.append({
                        "persona": persona,
                        "tipo": "Relación política",
                        "nota": nota,
                        "explicacion": "Valoración política sin texto adicional en este informe.",
                    })
        except StopIteration:
            pass

        # Patrimonio (concepto | cantidad)
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
                if stripped.startswith("Pagina") or stripped.startswith("Informe"):
                    continue
                # Salir si llegamos a otra sección (cualquier header de tabla)
                if stripped.startswith("Nota:") or "valoraciones" in stripped.lower():
                    continue
                m = re.match(r"^(.+?)\s{2,}(.+)$", stripped)
                if m:
                    concepto = m.group(1).strip()
                    valor = m.group(2).strip()
                    # Filtrar entradas obvias que no son patrimonio
                    if concepto and valor:
                        patrimonio.append({"concepto": concepto, "valor": valor})
        except StopIteration:
            pass

        dosieres.append({
            "slug": slugify(nombre),
            "num": 100 + idx,  # numerar como 101, 102, ... para que no choquen con los 1-24 del primer PDF
            "nombre_completo": nombre,
            "cargo_actual": cargo,
            "partido": partido,
            "bio_corta": (perfil[:280] + "...") if len(perfil) > 280 else perfil,
            "perfil_completo": perfil,
            "relaciones": relaciones,
            "patrimonio": patrimonio,
        })

    # Output JSON
    out_path = Path("/tmp/dosieres_regio.json")
    out_path.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} dosieres → {out_path}", file=sys.stderr)
    print(f"  relaciones totales: {sum(len(d['relaciones']) for d in dosieres)}", file=sys.stderr)
    print(f"  patrimonio totales: {sum(len(d['patrimonio']) for d in dosieres)}", file=sys.stderr)


if __name__ == "__main__":
    main()
