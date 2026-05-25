#!/usr/bin/env python3
"""Parser del PDF de diputados PSOE.

Diferencias con los anteriores: relaciones y patrimonio están en PROSA
separadas por punto y coma, no en tablas. Ej:
   3. Relaciones politicas persona-persona
   Pedro Sanchez +8; Patxi Lopez +6; Montse Minguez +8; Tellado -8; Abascal -10
   5. Patrimonio declarado
   Retribuciones 537,40 EUR; patrimonio financiero 165.240,78 EUR; ...

Header de cada dossier:
   N. Nombre Apellido(s)
   Circunscripcion / ambito: Provincia
   1. Perfil general ampliado
   ...
"""
import json
import re
import sys
from pathlib import Path

PDF_TXT = Path("/tmp/dossiers_psoe.txt")


def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u",
            "à": "a", "è": "e", "ò": "o", "ï": "i", "ç": "c"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


def parse_relaciones(prosa: str) -> list:
    """Pedro Sanchez +8; Patxi Lopez +6; ... → lista estructurada."""
    relaciones = []
    # Split por ;
    items = [x.strip() for x in prosa.split(";") if x.strip()]
    for it in items:
        # Patrón: "Nombre Apellidos [+-]N" o "Nombre: descripción [+-]N"
        # Buscar la última secuencia número (positivo o negativo) al final
        m = re.match(r"^(.+?)\s*([+\-]\d+)(?:\s|$)", it)
        if not m:
            # Patrón alternativo: "Persona: descripción +/-N"
            m = re.match(r"^(.+?[:.])\s*(.+?)\s*([+\-]\d+)\s*$", it)
            if m:
                persona = m.group(1).rstrip(":.").strip()
                explicacion = m.group(2).strip()
                nota = int(m.group(3))
                relaciones.append({
                    "persona": persona,
                    "tipo": "Relación política",
                    "nota": nota,
                    "explicacion": explicacion,
                })
                continue
            # Sin patrón claro, lo metemos como nota 0 con la persona = todo
            # Solo si parece nombre (letras y espacios)
            if re.match(r"^[A-Z][a-záéíóúñA-ZÁÉÍÓÚÑ\s\./]+$", it):
                relaciones.append({
                    "persona": it.strip(),
                    "tipo": "Relación política",
                    "nota": 0,
                    "explicacion": "Sin nota cuantitativa en el informe.",
                })
            continue
        persona = m.group(1).strip()
        nota = int(m.group(2))
        # Si queda texto después del +N, es explicación
        resto = it[m.end():].strip().lstrip(",").strip()
        relaciones.append({
            "persona": persona,
            "tipo": "Relación política",
            "nota": nota,
            "explicacion": resto if resto else "Valoración política sin texto adicional.",
        })
    return relaciones


def parse_patrimonio(prosa: str) -> list:
    """Retribuciones 537,40 EUR; patrimonio financiero 165.240,78 EUR; ... → lista."""
    if not prosa or prosa.lower().startswith("pendiente") or "no localizada" in prosa.lower() or "no consta" in prosa.lower():
        return []
    items = [x.strip() for x in prosa.split(";") if x.strip()]
    patrimonio = []
    for it in items:
        # Patrón: "concepto valor"
        # El valor empieza por dígito (incluyendo negativo) y termina con EUR o un número
        m = re.match(r"^(.+?)\s+([+\-]?[\d\.,]+\s*EUR.*|\d.+)$", it)
        if m:
            concepto = m.group(1).strip().rstrip(":")
            valor = m.group(2).strip()
            if concepto and valor:
                patrimonio.append({"concepto": concepto, "valor": valor})
        elif it:
            # Sin patrón claro, todo como valor con concepto genérico
            patrimonio.append({"concepto": "Detalle", "valor": it})
    return patrimonio


def main():
    text = PDF_TXT.read_text(encoding="utf-8")
    lines = text.split("\n")

    perfil_lines = [i for i, l in enumerate(lines) if l.strip() == "1. Perfil general ampliado"]
    print(f"Encontradas {len(perfil_lines)} secciones de perfil", file=sys.stderr)

    dossier_starts = []
    for perfil_idx in perfil_lines:
        # Caminar atrás: linea con "Circunscripcion / ambito: ..." + linea nombre
        i = perfil_idx - 1
        while i > 0 and not lines[i].strip():
            i -= 1
        if i <= 0:
            continue
        circ_line = lines[i].strip()
        # Extraer provincia
        provincia = ""
        m = re.match(r"^Circunscripcion\s*/\s*ambito:\s*(.+)$", circ_line)
        if m:
            provincia = m.group(1).strip()
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
        if "informe" in low or "estimacion" in low or "patrimonial" in low or "valorad" in low or "ambito" in low:
            continue
        dossier_starts.append((perfil_idx, nombre, provincia))

    print(f"✓ {len(dossier_starts)} dosieres detectados", file=sys.stderr)

    dosieres = []
    for idx, (perfil_idx, nombre, provincia) in enumerate(dossier_starts):
        end = dossier_starts[idx + 1][0] - 2 if idx + 1 < len(dossier_starts) else len(lines)
        chunk = lines[perfil_idx:end]

        cargo = f"Diputado/a del PSOE por {provincia}" if provincia else "Diputado/a PSOE"

        # Perfil: entre "1. Perfil general ampliado" y "3. Relaciones politicas"
        perfil = ""
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones politicas persona-persona")
            perfil = " ".join([l.strip() for l in chunk[1:r_idx] if l.strip()])
        except StopIteration:
            pass

        # Relaciones: líneas entre "3. Relaciones..." y "5. Patrimonio"
        relaciones = []
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones politicas persona-persona")
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            relaciones_prosa = " ".join([l.strip() for l in chunk[r_idx + 1:pat_idx] if l.strip()])
            relaciones = parse_relaciones(relaciones_prosa)
        except StopIteration:
            pass

        # Patrimonio: líneas tras "5. Patrimonio declarado" hasta header/página/siguiente dossier
        patrimonio = []
        try:
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            pat_lines = []
            for l in chunk[pat_idx + 1:]:
                s = l.strip()
                if not s:
                    if pat_lines:  # primera línea vacía después de patrimonio → fin
                        break
                    continue
                if s.startswith("Informe diputados") or s.startswith("Pagina") or s.startswith("#") or "Circunscripcion" in s:
                    break
                pat_lines.append(s)
            patrimonio_prosa = " ".join(pat_lines)
            patrimonio = parse_patrimonio(patrimonio_prosa)
        except StopIteration:
            pass

        dosieres.append({
            "slug": slugify(nombre),
            "num": 400 + idx,
            "nombre_completo": nombre,
            "cargo_actual": cargo,
            "partido": "PSOE",
            "bio_corta": (perfil[:280] + "...") if len(perfil) > 280 else perfil,
            "perfil_completo": perfil,
            "relaciones": relaciones,
            "patrimonio": patrimonio,
        })

    out = Path("/tmp/dosieres_psoe.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} dosieres → {out}", file=sys.stderr)
    print(f"  relaciones: {sum(len(d['relaciones']) for d in dosieres)}", file=sys.stderr)
    print(f"  patrimonio: {sum(len(d['patrimonio']) for d in dosieres)}", file=sys.stderr)


if __name__ == "__main__":
    main()
