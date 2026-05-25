#!/usr/bin/env python3
"""Parser del PDF 'fichas_influencia_congreso_1_72'.

Estructura:
   N. Nombre Apellidos
   Ambito/circunscripcion: Provincia
   Situacion: X (opcional)
   1. Perfil general ampliado
   <perfil>
   3. Relaciones politicas persona-persona
     N    Persona      Texto descriptivo (sin nota)
     ...
   5. Patrimonio declarado
   <pendiente o cifras>

Las relaciones NO tienen nota. Las guardamos con nota=0 para que aparezcan
en la página de detalle (apartado "Quién está cerca") pero el grafo de
relaciones, que filtra |nota|>=5, las ignora automáticamente.

Para personas que ya están en los PDFs anteriores con notas reales, el
gen_dosieres_fixture deduplica por slug y mantiene la primera carga (las
notas buenas no se sobrescriben).
"""
import json
import re
import sys
from pathlib import Path

PDF_TXT = Path("/tmp/dossiers_influencia.txt")


def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u",
            "à": "a", "è": "e", "ò": "o", "ï": "i", "ç": "c"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


def is_junk(s: str) -> bool:
    if not s:
        return True
    if re.match(r"^Pagina\s+\d+", s) or re.match(r"^Página\s+\d+", s):
        return True
    if s.startswith("Fichas de actores") or s.startswith("Consolidado") or s.startswith("Documento de"):
        return True
    if "estimaciones analiticas" in s.lower():
        return True
    return False


def main():
    text = PDF_TXT.read_text(encoding="utf-8")
    lines = text.split("\n")

    perfil_lines = [i for i, l in enumerate(lines) if l.strip() == "1. Perfil general ampliado"]
    print(f"Encontradas {len(perfil_lines)} secciones de perfil", file=sys.stderr)

    dossier_starts = []
    for perfil_idx in perfil_lines:
        # Caminar hacia atrás: pueden venir 1, 2 o 3 líneas:
        #   - Situacion: Y  (opcional)
        #   - Ambito/circunscripcion: X
        #   - N. Nombre
        provincia = ""
        situacion = ""
        i = perfil_idx - 1
        # Hasta 4 retrocesos saltando vacías/junk
        seen_lines = []
        while i > 0 and len(seen_lines) < 5:
            s = lines[i].strip()
            if s and not is_junk(s):
                seen_lines.append((i, s))
            i -= 1
        if not seen_lines:
            continue

        # Buscar la línea con "N. Nombre" entre las recolectadas
        nombre = None
        nombre_idx = None
        for idx, s in seen_lines:
            m = re.match(r"^(\d+)\.\s+(.+)$", s)
            if m and not s.startswith("1. Perfil"):
                nombre = m.group(2).strip()
                nombre_idx = idx
                break
        if not nombre:
            continue

        # Buscar circunscripción y situación entre el nombre y el perfil
        for idx, s in seen_lines:
            if idx > nombre_idx and idx < perfil_idx:
                m = re.match(r"^Ambito/circunscripci[oó]n:\s*(.+)$", s)
                if m: provincia = m.group(1).strip()
                m = re.match(r"^Situaci[oó]n:\s*(.+)$", s)
                if m: situacion = m.group(1).strip()

        if len(nombre) < 5 or len(nombre.split()) < 2:
            continue
        low = nombre.lower()
        if any(k in low for k in ["informe", "estimacion", "patrimonial", "pagina"]):
            continue
        dossier_starts.append((perfil_idx, nombre, provincia, situacion))

    print(f"✓ {len(dossier_starts)} dosieres detectados", file=sys.stderr)

    dosieres = []
    for idx, (perfil_idx, nombre, provincia, situacion) in enumerate(dossier_starts):
        end = dossier_starts[idx + 1][0] - 5 if idx + 1 < len(dossier_starts) else len(lines)
        chunk = lines[perfil_idx:end]

        cargo_parts = []
        if provincia:
            cargo_parts.append(f"Actor del Congreso · {provincia}")
        else:
            cargo_parts.append("Actor influyente del entorno parlamentario")
        if situacion:
            cargo_parts.append(situacion)
        cargo = " · ".join(cargo_parts)

        # Perfil
        perfil = ""
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip().startswith("3. Relaciones politicas"))
            perfil = " ".join([l.strip() for l in chunk[1:r_idx] if l.strip() and not is_junk(l.strip())])
        except StopIteration:
            pass

        # Relaciones · formato "N    Persona     Texto..."
        relaciones = []
        try:
            r_idx = next(i for i, l in enumerate(chunk) if l.strip().startswith("3. Relaciones politicas"))
            try:
                pat_idx = next(i for i, l in enumerate(chunk) if l.strip().startswith("5. Patrimonio"))
            except StopIteration:
                pat_idx = len(chunk)
            for line in chunk[r_idx + 1:pat_idx]:
                stripped = line.strip()
                if not stripped or is_junk(stripped):
                    continue
                # Patrón: "NN  Persona   Texto"
                m = re.match(r"^(\d+)\s{1,4}([A-ZÁÉÍÓÚÑ][\w\sáéíóúñÁÉÍÓÚÑ\.\-]+?)\s{2,}(.+)$", stripped)
                if m:
                    persona = m.group(2).strip()
                    explicacion = m.group(3).strip()
                    relaciones.append({
                        "persona": persona,
                        "tipo": "Conexión profesional",
                        "nota": 0,    # No hay nota cuantitativa en este informe
                        "explicacion": explicacion,
                    })
        except StopIteration:
            pass

        # Patrimonio (suele ser "Pendiente de desglose completo.")
        patrimonio = []
        try:
            pat_idx = next(i for i, l in enumerate(chunk) if l.strip().startswith("5. Patrimonio"))
            pat_lines = []
            for line in chunk[pat_idx + 1:]:
                s = line.strip()
                if not s or is_junk(s):
                    if pat_lines:
                        break
                    continue
                if s.startswith("Estimacion prudente"):
                    continue
                pat_lines.append(s)
                if len(pat_lines) > 6:
                    break
            if pat_lines:
                contenido = " ".join(pat_lines)
                if "pendiente" not in contenido.lower():
                    patrimonio.append({"concepto": "Patrimonio declarado", "valor": contenido[:300]})
                else:
                    patrimonio.append({"concepto": "Patrimonio declarado", "valor": "Pendiente de desglose individual completo"})
        except StopIteration:
            pass

        # No asumir PP · el informe influencia mezcla actores de varios
        # partidos (PP, Vox, intelectuales, ex-cargos). Si la persona ya
        # existe en otro PDF con partido real, el deduplicador la salta.
        # Para los NUEVOS (no presentes antes), partido queda como null y
        # se inferirá de la trayectoria/perfil.
        partido = None
        # Heurística por keywords del perfil
        low_perfil = perfil.lower()
        if "vox" in low_perfil[:200]:
            partido = "VOX"
        elif "pp " in low_perfil[:200] or "popular" in low_perfil[:200] or "feijoo" in low_perfil[:200]:
            partido = "PP"
        elif "psoe" in low_perfil[:200] or "socialista" in low_perfil[:200]:
            partido = "PSOE"
        elif "sumar" in low_perfil[:200]:
            partido = "Sumar"

        dosieres.append({
            "slug": slugify(nombre),
            "num": 800 + idx,
            "nombre_completo": nombre,
            "cargo_actual": cargo,
            "partido": partido,
            "bio_corta": (perfil[:280] + "...") if len(perfil) > 280 else perfil,
            "perfil_completo": perfil,
            "relaciones": relaciones,
            "patrimonio": patrimonio,
        })

    out = Path("/tmp/dosieres_influencia.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} dosieres → {out}", file=sys.stderr)
    print(f"  relaciones totales: {sum(len(d['relaciones']) for d in dosieres)}", file=sys.stderr)
    print(f"  patrimonio totales: {sum(len(d['patrimonio']) for d in dosieres)}", file=sys.stderr)


if __name__ == "__main__":
    main()
