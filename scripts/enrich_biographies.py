"""scripts/enrich_biographies.py

Enriquece las biografías de los seeds IBEX 35 + Diputaciones añadiendo
items con datos institucionales/contextuales en los apartados `identidad`
y `trayectoria` cuando estén escuetos.

Estrategia:
- Para cada Diputación Provincial: añade un item explicando sus
  competencias institucionales (transferencias, carreteras, planes
  provinciales, etc.).
- Para cada Presidente de Diputación: añade un item con poderes
  institucionales y un item con contexto político-territorial.
- Para cada empresa IBEX 35: añade un item de gobierno corporativo y un
  item de relevancia macroeconómica.
- Para cada directivo: añade un item de perfil ejecutivo si el bio_corta
  es muy corto.

Idempotente: usa títulos únicos para evitar duplicar items en
ejecuciones sucesivas.

Uso:
    .venv/bin/python3 scripts/enrich_biographies.py --dry-run
    .venv/bin/python3 scripts/enrich_biographies.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SEEDS = {
    "ibex35": [
        REPO / "data" / "ibex35" / "empresas.json",
        REPO / "data" / "ibex35" / "directivos.json",
    ],
    "diputaciones": [
        REPO / "data" / "diputaciones" / "instituciones.json",
        REPO / "data" / "diputaciones" / "presidentes.json",
    ],
}


# ─── Bloques canónicos por tipo de dossier ─────────────────────────────
# Cada bloque se inserta en `identidad` o `trayectoria` si el dossier
# tiene perfil corto. El título se usa como clave de deduplicación.

COMPETENCIAS_DIPUTACION = {
    "tipo": "dato",
    "titulo": "Competencias institucionales",
    "contenido": (
        "Las Diputaciones Provinciales tienen competencias en: "
        "(1) coordinación y prestación de servicios municipales en "
        "municipios <20.000 hab. (asistencia técnica, jurídica, "
        "informática y económica), (2) red provincial de carreteras "
        "(mantenimiento, refuerzo, nuevas obras), (3) protección civil "
        "y emergencias, (4) cooperación al desarrollo de los "
        "municipios mediante Planes Provinciales plurianuales, "
        "(5) gestión cultural, deportiva y turística supramunicipal, "
        "(6) recaudación tributaria delegada de los ayuntamientos."
    ),
    "tags": ["competencias-institucionales"],
}

PRESUPUESTO_DIPUTACION = {
    "tipo": "dato",
    "titulo": "Encaje político-territorial",
    "contenido": (
        "Los diputados provinciales no son elegidos directamente: "
        "los partidos del Pleno designan a sus diputados entre los "
        "concejales electos en los municipios de la provincia. La "
        "presidencia se elige por mayoría del Pleno y por convención "
        "recae en el partido con mayor representación municipal. El "
        "presupuesto anual oscila entre 80 M€ (provincias pequeñas) y "
        "más de 1.000 M€ (Barcelona). Las diputaciones son una pieza "
        "clave del clientelismo político local por su capacidad de "
        "redistribuir fondos a los municipios."
    ),
    "tags": ["encaje-institucional"],
}

PERFIL_PRESIDENTE_DIPUTACION = {
    "tipo": "dato",
    "titulo": "Poderes del presidente provincial",
    "contenido": (
        "El presidente de la diputación dirige el gobierno provincial, "
        "preside el Pleno y la Junta de Gobierno, propone los "
        "vicepresidentes y nombra a los diputados delegados con áreas "
        "de gestión. Gestiona discrecionalmente los Planes Provinciales "
        "de Cooperación, una de las herramientas más codiciadas del "
        "clientelismo local. En las provincias gobernadas por su "
        "mismo partido, suele ser el principal "
        "operador territorial del partido."
    ),
    "tags": ["poderes-presidente"],
}

GOB_CORP_EMPRESA_IBEX = {
    "tipo": "dato",
    "titulo": "Gobierno corporativo",
    "contenido": (
        "Como cotizada en el IBEX 35, está sujeta a la Ley de "
        "Sociedades de Capital, el Código de Buen Gobierno de la CNMV "
        "y los requisitos de transparencia del MiFID II. Reporta "
        "trimestralmente a CNMV; su informe anual de gobierno "
        "corporativo (IAGC) detalla composición del consejo, "
        "categorías de consejeros, remuneraciones y operaciones "
        "vinculadas. El consejo de administración aprueba la "
        "estrategia, el plan de inversiones y los nombramientos "
        "ejecutivos."
    ),
    "tags": ["gobierno-corporativo"],
}

PERFIL_DIRECTIVO_IBEX = {
    "tipo": "dato",
    "titulo": "Perfil ejecutivo",
    "contenido": (
        "Como alto directivo de una cotizada del IBEX 35, su retribución "
        "es pública (incluida en el Informe Anual sobre Remuneraciones "
        "de los Consejeros) y sus operaciones sobre acciones de la "
        "compañía son notificables a la CNMV. Participa en la "
        "definición de la estrategia corporativa, supervisa la operativa "
        "y representa a la compañía ante reguladores, inversores "
        "institucionales y patronales sectoriales."
    ),
    "tags": ["perfil-ejecutivo"],
}

# ─── Items adicionales: trayectoria histórica + posiciones ─────────────

HITO_DIPUTACION = {
    "tipo": "evento",
    "titulo": "Origen y marco legal",
    "contenido": (
        "Las diputaciones provinciales tienen su origen en la "
        "Constitución de Cádiz de 1812 y se consolidan tras la Ley "
        "Provincial de 1845. El marco actual lo fija la Ley 7/1985 "
        "Reguladora de las Bases del Régimen Local (LBRL), modificada "
        "por la Ley 27/2013 de Racionalización y Sostenibilidad de la "
        "Administración Local (LRSAL). En las CCAA uniprovinciales "
        "(Madrid, Asturias, Cantabria, Murcia, Navarra, La Rioja) la "
        "diputación está integrada en la propia comunidad autónoma. "
        "En País Vasco operan las Diputaciones Forales (Álava, Bizkaia, "
        "Gipuzkoa) con régimen propio del Concierto Económico."
    ),
    "tags": ["historia-institucional"],
    "fecha": "1812-03-19",
}

POSICION_DIPUTACION = {
    "tipo": "dato",
    "titulo": "Debate sobre el modelo provincial",
    "contenido": (
        "Las diputaciones provinciales son objeto de debate político "
        "recurrente: desde Podemos, Sumar y partes de ERC y Junts se "
        "ha defendido su supresión como nivel administrativo redundante "
        "que generaría ahorros. Desde PP, PSOE y partidos territoriales "
        "se defienden como prestadoras de servicios irrenunciables a "
        "los municipios pequeños y como motor del desarrollo rural. La "
        "Ley 27/2013 (LRSAL) reforzó sus competencias para municipios "
        "<20.000 hab. y limitó su capacidad de gasto."
    ),
    "tags": ["debate-supresion", "modelo-territorial"],
}

POSICION_PRESIDENTE_PP = {
    "tipo": "dato",
    "titulo": "Posicionamiento típico del partido (PP)",
    "contenido": (
        "Los presidentes de diputación del PP suelen defender el modelo "
        "provincial actual, las bajadas fiscales locales, la libertad "
        "de gestión presupuestaria y la cooperación con las CCAA del "
        "mismo signo. En contextos PP-Vox, gestionan los pactos en "
        "ayuntamientos clave de la provincia. Críticos habituales con "
        "el Gobierno central PSOE-Sumar y con la financiación municipal "
        "del modelo de bilateralidad catalán."
    ),
    "tags": ["posicion-pp"],
}

POSICION_PRESIDENTE_PSOE = {
    "tipo": "dato",
    "titulo": "Posicionamiento típico del partido (PSOE)",
    "contenido": (
        "Los presidentes de diputación del PSOE suelen alinearse con "
        "la agenda del Gobierno central (transición ecológica, "
        "vivienda, derechos sociales) y reforzar la cooperación con "
        "ayuntamientos PSOE de la provincia. Apoyan los Planes "
        "Provinciales como herramienta redistributiva hacia municipios "
        "pequeños y suelen ser críticos con la Junta autonómica cuando "
        "ésta es del PP. Defensores de la solidaridad interterritorial."
    ),
    "tags": ["posicion-psoe"],
}

HITO_EMPRESA_IBEX = {
    "tipo": "evento",
    "titulo": "Pertenencia al IBEX 35",
    "contenido": (
        "Cotiza en el IBEX 35, el índice bursátil de referencia de la "
        "Bolsa de Madrid (BME). El IBEX 35 lo componen las 35 mayores "
        "empresas españolas por capitalización ajustada al free float, "
        "revisadas semestralmente por el Comité Asesor Técnico (CAT) "
        "de BME (marzo y septiembre). La permanencia en el índice "
        "implica obligaciones reforzadas de reporting, atrae a fondos "
        "indexados (BlackRock iShares MSCI Spain, etc.) y condiciona "
        "el coste de capital de la compañía."
    ),
    "tags": ["pertenencia-ibex35"],
}

POSICION_EMPRESA_IBEX = {
    "tipo": "dato",
    "titulo": "Marco fiscal y regulatorio",
    "contenido": (
        "Como gran corporación española, está sujeta al impuesto de "
        "sociedades estándar (25%), al gravamen extraordinario "
        "temporal aprobado en 2022 si pertenece a banca o energía, "
        "y a las directivas europeas de su sector (Banca: CRR3/CRD6 y "
        "MiFID II; Energía: paquete Fit-for-55; Telecos: European "
        "Electronic Communications Code; etc.). Reporta CSRD/ESRS "
        "(sostenibilidad) desde 2024 y aplica la Pillar Two (impuesto "
        "mínimo global del 15%) desde 2024."
    ),
    "tags": ["marco-fiscal", "regulacion-sectorial"],
}

POSICION_DIRECTIVO_IBEX = {
    "tipo": "dato",
    "titulo": "Marco de gobernanza ejecutiva",
    "contenido": (
        "La retribución de los consejeros ejecutivos se vota "
        "anualmente en la Junta de Accionistas (informe vinculante "
        "cada tres años, consultivo los otros años). Los principios "
        "del Código de Buen Gobierno de la CNMV exigen separación "
        "entre Presidente y CEO (o consejero coordinador independiente "
        "si coinciden), comisiones de Auditoría y de Nombramientos / "
        "Retribuciones con mayoría de independientes, y rotación del "
        "auditor cada 10 años. Las decisiones estratégicas pasan por "
        "el Consejo, con voto del directivo si es consejero ejecutivo."
    ),
    "tags": ["gobernanza-ejecutiva"],
}


def detectar_partido_presidente(d: dict) -> str | None:
    """Heurística: si el dossier de presidente menciona PP/PSOE en cargo
    o tags, devuelve el partido para escoger la posición canónica."""
    blob = (d.get("cargo") or "") + " " + " ".join(d.get("tags") or [])
    blob = blob.lower()
    if "pp" in blob.split() or "popular" in blob:
        return "PP"
    if (
        "psoe" in blob.split()
        or "psc" in blob.split()
        or "psdeg" in blob.split()
        or "psoe-a" in blob
    ):
        return "PSOE"
    # También partido directo si está expuesto
    return d.get("partido")


def find_apartado(d: dict, tipo: str) -> dict | None:
    for a in d.get("apartados") or []:
        if a.get("tipo") == tipo:
            return a
    return None


def add_item_if_missing(d: dict, apartado_tipo: str, item: dict) -> bool:
    """Añade un item a un apartado si no existe ya uno con el mismo
    título. Crea el apartado si no existe."""
    ap = find_apartado(d, apartado_tipo)
    if not ap:
        ap = {
            "tipo": apartado_tipo,
            "titulo": None,
            "resumen": None,
            "orden": {"identidad": 0, "trayectoria": 1}.get(apartado_tipo, 9),
            "items": [],
        }
        d["apartados"].append(ap)
        d["apartados"].sort(key=lambda a: a.get("orden", 9))

    existing_titles = {it.get("titulo") for it in ap["items"]}
    if item["titulo"] in existing_titles:
        return False
    ap["items"].append(item)
    return True


def enrich_diputacion(d: dict) -> int:
    """Enriquece un dossier de tipo institución diputación."""
    n = 0
    n += add_item_if_missing(d, "identidad", COMPETENCIAS_DIPUTACION)
    n += add_item_if_missing(d, "identidad", PRESUPUESTO_DIPUTACION)
    n += add_item_if_missing(d, "trayectoria", HITO_DIPUTACION)
    n += add_item_if_missing(d, "posiciones", POSICION_DIPUTACION)
    return n


def enrich_presidente_diputacion(d: dict) -> int:
    n = 0
    n += add_item_if_missing(d, "identidad", PERFIL_PRESIDENTE_DIPUTACION)
    # Postura típica según el partido del presidente
    pdo = detectar_partido_presidente(d)
    if pdo == "PP":
        n += add_item_if_missing(d, "posiciones", POSICION_PRESIDENTE_PP)
    elif pdo == "PSOE":
        n += add_item_if_missing(d, "posiciones", POSICION_PRESIDENTE_PSOE)
    return n


def enrich_empresa_ibex(d: dict) -> int:
    n = 0
    n += add_item_if_missing(d, "identidad", GOB_CORP_EMPRESA_IBEX)
    n += add_item_if_missing(d, "trayectoria", HITO_EMPRESA_IBEX)
    n += add_item_if_missing(d, "posiciones", POSICION_EMPRESA_IBEX)
    return n


def enrich_directivo_ibex(d: dict) -> int:
    n = 0
    # Solo si el dossier tiene <=2 items de identidad (es corto)
    ap_id = find_apartado(d, "identidad")
    if not ap_id or len(ap_id["items"]) < 3:
        n += add_item_if_missing(d, "identidad", PERFIL_DIRECTIVO_IBEX)
    # Las posiciones canónicas se añaden a todos
    n += add_item_if_missing(d, "posiciones", POSICION_DIRECTIVO_IBEX)
    return n


def process_file(path: Path, kind: str, *, dry_run: bool) -> tuple[int, int]:
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    n_dossier = 0
    n_added = 0
    for d in data:
        added = 0
        if kind == "ibex35-empresa":
            added = enrich_empresa_ibex(d)
        elif kind == "ibex35-directivo":
            added = enrich_directivo_ibex(d)
        elif kind == "dip-institucion":
            added = enrich_diputacion(d)
        elif kind == "dip-presidente":
            added = enrich_presidente_diputacion(d)
        if added:
            n_dossier += 1
            n_added += added

    if not dry_run and n_added:
        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    return n_dossier, n_added


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    mode = "DRY-RUN" if args.dry_run else "WRITE"
    print(f"=== Enriquecer biografías de seeds · {mode} ===")

    targets = [
        (REPO / "data" / "ibex35" / "empresas.json", "ibex35-empresa"),
        (REPO / "data" / "ibex35" / "directivos.json", "ibex35-directivo"),
        (REPO / "data" / "diputaciones" / "instituciones.json", "dip-institucion"),
        (REPO / "data" / "diputaciones" / "presidentes.json", "dip-presidente"),
    ]

    g_dos = 0
    g_items = 0
    for path, kind in targets:
        if not path.exists():
            print(f"  [skip] {path.name} no existe")
            continue
        nd, ni = process_file(path, kind, dry_run=args.dry_run)
        label = f"{path.parent.name}/{path.stem}"
        print(f"  {label:35s} kind={kind:18s} dossieres={nd:3d} items+={ni}")
        g_dos += nd
        g_items += ni

    print()
    print(f"TOTAL · dossieres enriquecidos: {g_dos}  items añadidos: {g_items}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
