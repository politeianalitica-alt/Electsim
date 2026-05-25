#!/usr/bin/env python3
"""Parsea el PDF de dosieres y genera JSON estructurado.

El PDF tiene dos secciones:
   1. ÍNDICE · líneas formato "N. Nombre - Cargo"
   2. DOSIERES · cada uno: "N. Nombre" + línea siguiente con cargo
"""
import json
import re
import sys
from pathlib import Path

PDF_TXT = Path("/tmp/dossiers.txt")


def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


def main():
    text = PDF_TXT.read_text(encoding="utf-8")
    lines = text.split("\n")

    # Estrategia: buscar líneas "1. Perfil general ampliado" — la línea ANTERIOR a esa
    # (saltando líneas vacías) es el cargo, y la anterior a esa es "N. Nombre".
    perfil_idx_lines = [i for i, l in enumerate(lines) if l.strip() == "1. Perfil general ampliado"]
    print(f"Encontradas {len(perfil_idx_lines)} secciones 'Perfil general'", file=sys.stderr)

    dossier_starts = []
    for perfil_line in perfil_idx_lines:
        # Caminar hacia atrás para encontrar cargo + nombre
        i = perfil_line - 1
        # Saltar líneas vacías
        while i > 0 and not lines[i].strip():
            i -= 1
        if i <= 0:
            continue
        cargo = lines[i].strip()
        i -= 1
        while i > 0 and not lines[i].strip():
            i -= 1
        if i <= 0:
            continue
        nombre_line = lines[i].strip()
        m = re.match(r"^(\d+)\.\s+(.+)$", nombre_line)
        if not m:
            print(f"  ⚠ línea {i} no matcha: {nombre_line[:60]}", file=sys.stderr)
            continue
        num = int(m.group(1))
        name = m.group(2).strip()
        dossier_starts.append((perfil_line, num, name, cargo))

    print(f"✓ {len(dossier_starts)} dosieres detectados", file=sys.stderr)

    # Procesar cada dossier
    dosieres = []
    for idx, (perfil_line, num, name, cargo) in enumerate(dossier_starts):
        # Fin del dossier = inicio del siguiente o fin del archivo
        if idx + 1 < len(dossier_starts):
            end = dossier_starts[idx + 1][0] - 2
        else:
            end = len(lines)
        chunk = lines[perfil_line:end]  # desde "1. Perfil general ampliado"

        # Perfil general
        perfil = ""
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones politicas persona-persona")
            perfil_lines = [l.strip() for l in chunk[1:r_idx] if l.strip()]
            perfil = " ".join(perfil_lines)
        except StopIteration:
            pass

        # Relaciones · parsear tabla
        relaciones = []
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones politicas persona-persona")
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            tabla = chunk[r_idx + 1:pat_idx]
            header_idx = next((i for i, l in enumerate(tabla) if "Persona" in l and "Tipo de relacion" in l), None)
            if header_idx is not None:
                tabla_filas = tabla[header_idx + 1:]
                fila_actual = None
                for line in tabla_filas:
                    if not line.strip():
                        continue
                    # Patrón principal: nombre (2+ palabras) + tipo + nota (+/-N) + explicación
                    m = re.match(
                        r"^ ([A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ\.\-\' ]+?)\s{2,}(\S.*?)\s{2,}([\+\-]?\d+)\s{2,}(.+?)$",
                        line
                    )
                    if m:
                        if fila_actual:
                            relaciones.append(fila_actual)
                        fila_actual = {
                            "persona": m.group(1).strip(),
                            "tipo": m.group(2).strip(),
                            "nota": int(m.group(3)),
                            "explicacion": m.group(4).strip(),
                        }
                    elif fila_actual and line.strip():
                        fila_actual["explicacion"] += " " + line.strip()
                if fila_actual:
                    relaciones.append(fila_actual)
        except StopIteration:
            pass

        # Patrimonio
        patrimonio = []
        try:
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            pat_lines = chunk[pat_idx + 1:]
            header_idx = next((i for i, l in enumerate(pat_lines) if "Concepto" in l and "Cantidad" in l), None)
            if header_idx is not None:
                for line in pat_lines[header_idx + 1:]:
                    if not line.strip():
                        continue
                    if line.startswith("Nota:") or line.startswith("En particular") or re.match(r"^\d+\.", line):
                        continue
                    m = re.match(r"^ ([A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ\.\/\,\(\)\- ]+?)\s{2,}(.+)$", line)
                    if m:
                        patrimonio.append({
                            "concepto": m.group(1).strip(),
                            "valor": m.group(2).strip(),
                        })
        except StopIteration:
            pass

        # Partido inferido del cargo + override por nombres conocidos de Sumar
        partido = None
        cargo_lower = cargo.lower()
        name_lower = name.lower()
        if "del pp" in cargo_lower or "popular" in cargo_lower:
            partido = "PP"
        elif "ministr" in cargo_lower or "vicepresident" in cargo_lower or "presidente del gobierno" in cargo_lower or "secretario general del psoe" in cargo_lower:
            partido = "PSOE"
        # Override Sumar
        sumar_keys = ["yolanda diaz", "ernest urtasun", "monica garcia", "pablo bustinduy", "sira abed"]
        for s in sumar_keys:
            if s in name_lower:
                partido = "Sumar"
                break

        dosieres.append({
            "slug": slugify(name),
            "num": num,
            "nombre_completo": name,
            "cargo_actual": cargo,
            "partido": partido,
            "bio_corta": (perfil[:280] + "...") if len(perfil) > 280 else perfil,
            "perfil_completo": perfil,
            "relaciones": relaciones,
            "patrimonio": patrimonio,
        })

    # Output JSON
    out_path = Path("/tmp/dosieres.json")
    out_path.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} dosieres → {out_path}", file=sys.stderr)
    print(f"  relaciones totales: {sum(len(d['relaciones']) for d in dosieres)}", file=sys.stderr)
    print(f"  patrimonio totales: {sum(len(d['patrimonio']) for d in dosieres)}", file=sys.stderr)


if __name__ == "__main__":
    main()
