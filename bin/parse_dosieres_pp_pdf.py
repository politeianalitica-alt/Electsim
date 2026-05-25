#!/usr/bin/env python3
"""Parser del PDF de diputados PP.

Similar a PSOE (relaciones y patrimonio en prosa con ';') pero con:
   - Línea de circunscripción con tags HTML: "<b>Territorio / referencia:</b> Provincia"
   - Línea "Resumen patrimonial" extra antes del prosa de patrimonio
   - Tildes y diacríticos en el texto
"""
import json
import re
import sys
from pathlib import Path

PDF_TXT = Path("/tmp/dossiers_pp.txt")


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
    """'Feijóo +9; Pedro Sánchez -9; PSOE nacional -8' → lista estructurada."""
    relaciones = []
    items = [x.strip() for x in prosa.split(";") if x.strip()]
    for it in items:
        m = re.match(r"^(.+?)\s*([+\-]\d+)(?:\s|$)", it)
        if m:
            persona = m.group(1).strip()
            nota = int(m.group(2))
            resto = it[m.end():].strip().lstrip(",").strip()
            relaciones.append({
                "persona": persona,
                "tipo": "Relación política",
                "nota": nota,
                "explicacion": resto if resto else "Valoración política sin texto adicional.",
            })
        elif it:
            # Línea como "Bloque gallego +." sin número claro o "Bloque opositor"
            # Intentar extraer un descriptivo sin nota
            persona = re.sub(r"\s*[+\-][\d\.]*\s*$", "", it).strip()
            if persona and len(persona) > 2:
                relaciones.append({
                    "persona": persona,
                    "tipo": "Relación política",
                    "nota": 0,
                    "explicacion": "Valoración descriptiva sin nota cuantitativa.",
                })
    return relaciones


def parse_patrimonio(prosa: str) -> list:
    """'Financiero 23.000 €; deudas 102.193 €; neto aprox. -79.193 €.' → lista."""
    if not prosa or prosa.lower().startswith("pendiente") or "sin desglose" in prosa.lower():
        return []
    items = [x.strip().rstrip(".") for x in prosa.split(";") if x.strip()]
    patrimonio = []
    for it in items:
        m = re.match(r"^(.+?)\s+([+\-]?[\d\.,]+\s*€.*|[+\-]?[\d\.,]+\s*EUR.*|\d.+)$", it)
        if m:
            concepto = m.group(1).strip().rstrip(":")
            valor = m.group(2).strip()
            if concepto and valor:
                patrimonio.append({"concepto": concepto, "valor": valor})
        elif it:
            patrimonio.append({"concepto": "Detalle", "valor": it})
    return patrimonio


def main():
    text = PDF_TXT.read_text(encoding="utf-8")
    lines = text.split("\n")

    perfil_lines = [i for i, l in enumerate(lines) if l.strip() == "1. Perfil general ampliado"]
    print(f"Encontradas {len(perfil_lines)} secciones de perfil", file=sys.stderr)

    def is_junk_line(s: str) -> bool:
        if not s:
            return True
        if s.startswith("Informe consolidado") or s.startswith("Informe diputados"):
            return True
        if re.match(r"^Página\s+\d+", s) or re.match(r"^Pagina\s+\d+", s):
            return True
        return False

    dossier_starts = []
    for perfil_idx in perfil_lines:
        i = perfil_idx - 1
        while i > 0 and (not lines[i].strip() or is_junk_line(lines[i].strip())):
            i -= 1
        if i <= 0:
            continue
        terr_line = lines[i].strip()
        provincia = ""
        # Limpiar tags HTML
        terr_clean = re.sub(r"<[^>]+>", "", terr_line).strip()
        m = re.match(r"^Territorio\s*/\s*referencia:\s*(.+)$", terr_clean)
        if m:
            provincia = m.group(1).strip()
        i -= 1
        while i > 0 and (not lines[i].strip() or is_junk_line(lines[i].strip())):
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
        if "informe" in low or "estimacion" in low or "patrimonial" in low or "ambito" in low or "metodolog" in low or "valorad" in low:
            continue
        dossier_starts.append((perfil_idx, nombre, provincia))

    print(f"✓ {len(dossier_starts)} dosieres detectados", file=sys.stderr)

    dosieres = []
    for idx, (perfil_idx, nombre, provincia) in enumerate(dossier_starts):
        end = dossier_starts[idx + 1][0] - 2 if idx + 1 < len(dossier_starts) else len(lines)
        chunk = lines[perfil_idx:end]

        cargo = f"Diputado/a del PP por {provincia}" if provincia else "Diputado/a PP"

        # Perfil general
        perfil = ""
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones políticas persona-persona" or l.strip() == "3. Relaciones politicas persona-persona")
            perfil = " ".join([l.strip() for l in chunk[1:r_idx] if l.strip()])
        except StopIteration:
            pass

        # Relaciones
        relaciones = []
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip() == "3. Relaciones políticas persona-persona" or l.strip() == "3. Relaciones politicas persona-persona")
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            rel_prosa = " ".join([l.strip() for l in chunk[r_idx + 1:pat_idx] if l.strip()])
            relaciones = parse_relaciones(rel_prosa)
        except StopIteration:
            pass

        # Patrimonio · saltar línea "Resumen patrimonial" si existe
        patrimonio = []
        try:
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip() == "5. Patrimonio declarado")
            pat_lines = []
            for l in chunk[pat_idx + 1:]:
                s = l.strip()
                if not s:
                    if pat_lines:
                        break
                    continue
                if s == "Resumen patrimonial" or s.startswith("Resumen patrimonial"):
                    continue
                if is_junk_line(s) or s.startswith("Nº") or s.startswith("Nombre") or "Territorio" in s:
                    break
                pat_lines.append(s)
            patrimonio_prosa = " ".join(pat_lines)
            patrimonio = parse_patrimonio(patrimonio_prosa)
        except StopIteration:
            pass

        dosieres.append({
            "slug": slugify(nombre),
            "num": 500 + idx,
            "nombre_completo": nombre,
            "cargo_actual": cargo,
            "partido": "PP",
            "bio_corta": (perfil[:280] + "...") if len(perfil) > 280 else perfil,
            "perfil_completo": perfil,
            "relaciones": relaciones,
            "patrimonio": patrimonio,
        })

    out = Path("/tmp/dosieres_pp.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} dosieres → {out}", file=sys.stderr)
    print(f"  relaciones: {sum(len(d['relaciones']) for d in dosieres)}", file=sys.stderr)
    print(f"  patrimonio: {sum(len(d['patrimonio']) for d in dosieres)}", file=sys.stderr)


if __name__ == "__main__":
    main()
