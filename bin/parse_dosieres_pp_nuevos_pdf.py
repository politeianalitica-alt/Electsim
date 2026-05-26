#!/usr/bin/env python3
"""Parser del PDF de nuevos diputados del PP (correctores).

Formato:
   N. Nombre Apellidos
   Circunscripción: Provincia      Situación: Sustituto de X
   1. Perfil general ampliado
   <perfil>
   3. Relaciones políticas persona-persona
    Persona     Nota   Explicación sintética
    Alberto Núñez Feijóo                  +7       Relación positiva por partido...
    ...
   5. Patrimonio declarado
    Concepto              Estado
    Retribuciones         Pendiente de desglose individual completo
    ...
"""
import json
import re
import sys
from pathlib import Path

PDF_TXT = Path("/tmp/dossiers_pp_nuevos.txt")


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

    def is_junk(s: str) -> bool:
        if not s:
            return True
        if s.startswith("Informe PP") or s.startswith("Página"):
            return True
        if re.match(r"^Página\s+\d+", s) or re.match(r"^Pagina\s+\d+", s):
            return True
        return False

    dossier_starts = []
    for perfil_idx in perfil_lines:
        i = perfil_idx - 1
        while i > 0 and (not lines[i].strip() or is_junk(lines[i].strip())):
            i -= 1
        if i <= 0:
            continue
        # Esta línea debe tener "Circunscripción: ..."
        circ_line = lines[i].strip()
        provincia = ""
        situacion = ""
        m = re.match(r"^Circunscripci[oó]n:\s*(.+?)(?:\s{2,}Situaci[oó]n:\s*(.+))?$", circ_line)
        if m:
            provincia = m.group(1).strip()
            situacion = (m.group(2) or "").strip()
        else:
            # Si no matchea, intentar otra línea hacia atrás
            i -= 1
            while i > 0 and (not lines[i].strip() or is_junk(lines[i].strip())):
                i -= 1
            if i <= 0:
                continue
            circ_line = lines[i].strip()
            m = re.match(r"^Circunscripci[oó]n:\s*(.+?)(?:\s{2,}Situaci[oó]n:\s*(.+))?$", circ_line)
            if m:
                provincia = m.group(1).strip()
                situacion = (m.group(2) or "").strip()
        i -= 1
        while i > 0 and (not lines[i].strip() or is_junk(lines[i].strip())):
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
        if "informe" in low or "estimacion" in low or "estimación" in low or "patrimon" in low or "valorad" in low:
            continue
        dossier_starts.append((perfil_idx, nombre, provincia, situacion))

    print(f"✓ {len(dossier_starts)} dosieres detectados", file=sys.stderr)

    dosieres = []
    for idx, (perfil_idx, nombre, provincia, situacion) in enumerate(dossier_starts):
        end = dossier_starts[idx + 1][0] - 2 if idx + 1 < len(dossier_starts) else len(lines)
        chunk = lines[perfil_idx:end]

        cargo_parts = [f"Diputado/a del PP por {provincia}" if provincia else "Diputado/a PP"]
        if situacion:
            cargo_parts.append(situacion)
        cargo = " · ".join(cargo_parts)

        # Perfil general
        perfil = ""
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones políticas persona-persona" or l.strip() == "3. Relaciones politicas persona-persona")
            perfil = " ".join([l.strip() for l in chunk[1:r_idx] if l.strip()])
        except StopIteration:
            pass

        # Relaciones (3 columnas: persona, nota, explicación)
        relaciones = []
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones políticas persona-persona" or l.strip() == "3. Relaciones politicas persona-persona")
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            for line in chunk[r_idx + 1:pat_idx]:
                stripped = line.strip()
                if not stripped or stripped.startswith("Persona") or stripped.startswith("Nota") or stripped.startswith("Explicación"):
                    continue
                # Patrón: persona   +N/-N   explicación
                m = re.match(r"^(.+?)\s{2,}([\+\-]\d+)\s{2,}(.+)$", stripped)
                if m:
                    relaciones.append({
                        "persona": m.group(1).strip(),
                        "tipo": "Relación política",
                        "nota": int(m.group(2)),
                        "explicacion": m.group(3).strip(),
                    })
                elif re.match(r"^(.+?)\s{2,}([\+\-]\d+)$", stripped):
                    m2 = re.match(r"^(.+?)\s{2,}([\+\-]\d+)$", stripped)
                    relaciones.append({
                        "persona": m2.group(1).strip(),
                        "tipo": "Relación política",
                        "nota": int(m2.group(2)),
                        "explicacion": "",
                    })
        except StopIteration:
            pass

        # Patrimonio (2 columnas: concepto, estado)
        patrimonio = []
        try:
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            for line in chunk[pat_idx + 1:]:
                stripped = line.strip()
                if not stripped:
                    continue
                if stripped.startswith("Concepto") or stripped == "Estado":
                    continue
                if stripped.startswith("Estimación") or stripped.startswith("Estimacion") or is_junk(stripped):
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
            "num": 700 + idx,
            "nombre_completo": nombre,
            "cargo_actual": cargo,
            "partido": "PP",
            "bio_corta": (perfil[:280] + "...") if len(perfil) > 280 else perfil,
            "perfil_completo": perfil,
            "relaciones": relaciones,
            "patrimonio": patrimonio,
        })

    out = Path("/tmp/dosieres_pp_nuevos.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} dosieres → {out}", file=sys.stderr)
    print(f"  relaciones: {sum(len(d['relaciones']) for d in dosieres)}", file=sys.stderr)
    print(f"  patrimonio: {sum(len(d['patrimonio']) for d in dosieres)}", file=sys.stderr)


if __name__ == "__main__":
    main()
