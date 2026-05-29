#!/usr/bin/env python3
"""bin/gen_subfixture.py

Genera fixtures TypeScript (data/{slug}-fixture.ts) a partir de los JSONs
del seed IBEX 35 y Diputaciones Provinciales, en el mismo shape que
`apps/visual-oscar/data/dosieres-fixture.ts` (DossierCompleto[]).

Esto permite que las páginas Next.js los importen como Server Components
sin necesidad de tocar la BD ni desplegar la fase MIGRATE.

Uso:
    python3 bin/gen_subfixture.py --source ibex35
    python3 bin/gen_subfixture.py --source diputaciones
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VISUAL = REPO / "apps" / "visual-oscar" / "data"

SOURCES = {
    "ibex35": {
        "files": [
            REPO / "data" / "ibex35" / "empresas.json",
            REPO / "data" / "ibex35" / "directivos.json",
            REPO / "data" / "ibex35" / "conexos.json",
        ],
        "out": VISUAL / "ibex35-fixture.ts",
        "fixture_name": "IBEX35_FIXTURE",
        "resumen_name": "IBEX35_RESUMEN",
        "id_prefix": "ibx",
        "header": (
            "// AUTO-GENERADO desde data/ibex35/*.json · ver bin/gen_subfixture.py\n"
            "// Fuentes:\n"
            "//   · empresas.json       · 35 empresas del IBEX 35\n"
            "//   · directivos.json     · 46 CEOs / Presidentes / figuras puente\n"
            "//   · conexos.json        · 64 entidades del grafo (familias, fundaciones, fondos…)\n"
            "// Re-generar: python3 bin/gen_subfixture.py --source ibex35\n"
        ),
    },
    "diputaciones": {
        "files": [
            REPO / "data" / "diputaciones" / "instituciones.json",
            REPO / "data" / "diputaciones" / "presidentes.json",
            REPO / "data" / "diputaciones" / "complementos.json",
        ],
        "out": VISUAL / "diputaciones-fixture.ts",
        "fixture_name": "DIPUTACIONES_FIXTURE",
        "resumen_name": "DIPUTACIONES_RESUMEN",
        "id_prefix": "dip",
        "header": (
            "// AUTO-GENERADO desde data/diputaciones/*.json · ver bin/gen_subfixture.py\n"
            "// Fuentes:\n"
            "//   · instituciones.json  · 38 Diputaciones Provinciales + 3 Forales\n"
            "//   · presidentes.json    · 41 presidentes (38 + 3 Diputados Generales)\n"
            "//   · complementos.json   · 5 actores puente (Moreno Bonilla, Baltar, ERC, Junts, PSdeG)\n"
            "// Re-generar: python3 bin/gen_subfixture.py --source diputaciones\n"
        ),
    },
    "congreso": {
        "files": [
            REPO / "data" / "congreso" / "diputados.json",
        ],
        "out": VISUAL / "congreso-fixture.ts",
        "fixture_name": "CONGRESO_FIXTURE",
        "resumen_name": "CONGRESO_RESUMEN",
        "id_prefix": "cong",
        "header": (
            "// AUTO-GENERADO desde data/congreso/diputados.json · ver bin/gen_congreso.py\n"
            "// Los ~350 diputados EN ACTIVO del Congreso (XV Legislatura) con datos\n"
            "// OFICIALES y abiertos del Congreso: biografía de la ficha oficial,\n"
            "// circunscripción, grupo, fechas y declaración de intereses económicos\n"
            "// (actividades, fundaciones, donaciones) con su fecha de registro.\n"
            "// La declaración de bienes y rentas se referencia con fecha + enlace oficial\n"
            "// (los importes los publica el Congreso en el BOCG · no se inventan cifras).\n"
            "// Re-generar: python3 bin/gen_congreso.py && python3 bin/gen_subfixture.py --source congreso\n"
        ),
    },
    "medios": {
        "files": [
            REPO / "data" / "medios" / "medios.json",
        ],
        "out": VISUAL / "medios-fixture.ts",
        "fixture_name": "MEDIOS_FIXTURE",
        "resumen_name": "MEDIOS_RESUMEN",
        "id_prefix": "med",
        "header": (
            "// AUTO-GENERADO desde data/medios/medios.json · ver bin/gen_medios.py\n"
            "// Mapa del poder mediático: periodistas, directores, presentadores y\n"
            "// tertulianos, con su RELACIÓN CON LOS PODERES DEL ESTADO (Gobierno,\n"
            "// oposición, judicatura) ± y la razón según cómo encuadran las noticias.\n"
            "// Las relaciones apuntan a nodos resolubles (Sánchez/Feijóo/Fiscalía) y\n"
            "// se convierten en aristas del grafo. Caracterización por línea editorial\n"
            "// pública del medio + rol observable (no juicios privados).\n"
            "// Re-generar: python3 bin/gen_medios.py && python3 bin/gen_subfixture.py --source medios\n"
        ),
    },
    "senado": {
        "files": [
            REPO / "data" / "senado" / "senadores.json",
        ],
        "out": VISUAL / "senado-fixture.ts",
        "fixture_name": "SENADO_FIXTURE",
        "resumen_name": "SENADO_RESUMEN",
        "id_prefix": "sen",
        "header": (
            "// AUTO-GENERADO desde data/senado/senadores.json · ver bin/gen_senado.py\n"
            "// Los ~292 senadores de la XV Legislatura con datos OFICIALES del Senado\n"
            "// (opendata): grupo parlamentario, circunscripción y tipo (electo/designado).\n"
            "// El Senado NO abre biografía ni intereses como dato; se enlaza la ficha\n"
            "// oficial (biografía) y la declaración de bienes/actividades (sin inventar).\n"
            "// Re-generar: python3 bin/gen_senado.py && python3 bin/gen_subfixture.py --source senado\n"
        ),
    },
    "poder": {
        "files": [
            REPO / "data" / "poder" / "figuras_clave.json",
            REPO / "data" / "poder" / "figuras_clave_2.json",
            REPO / "data" / "poder" / "figuras_clave_3.json",
            REPO / "data" / "poder" / "figuras_clave_4.json",
            REPO / "data" / "poder" / "figuras_clave_5.json",
            REPO / "data" / "poder" / "figuras_clave_6.json",
            REPO / "data" / "poder" / "figuras_clave_7.json",
            REPO / "data" / "poder" / "figuras_clave_8.json",
        ],
        "out": VISUAL / "poder-fixture.ts",
        "fixture_name": "PODER_FIXTURE",
        "resumen_name": "PODER_RESUMEN",
        "id_prefix": "pod",
        "header": (
            "// AUTO-GENERADO desde data/poder/*.json · ver bin/gen_subfixture.py\n"
            "// Mapa de poder NO-electo (2 lotes):\n"
            "//   · figuras_clave.json   · medios, poder judicial (TS/CGPJ, TC, Fiscalía),\n"
            "//     reguladores (BdE, CNMC), empresarios no-IBEX (Roig, Ortega Mera,\n"
            "//     Escotet), sindicatos (CCOO, UGT), Casa Real e Iglesia.\n"
            "//   · figuras_clave_2.json · expresidentes (Aznar, Zapatero, F. González,\n"
            "//     Rajoy), think tanks (FAES, R.I. Elcano), Pablo Iglesias, Borrell,\n"
            "//     Calviño/BEI, prensa (Pedro J., Herrera, Cebrián), Tezanos/CIS,\n"
            "//     Gabilondo, empresarios (Koplowitz, Lao, Mango), RTVE, Von der Leyen.\n"
            "//   · figuras_clave_3.json · tejido económico-institucional: holding March\n"
            "//     (Alba), grandes despachos (Garrigues, Cuatrecasas, Uría), El Corte\n"
            "//     Inglés (Marta Álvarez), Cámara España (Bonet), Torreal (Abelló),\n"
            "//     Hortensia Herrero (Mercadona/arte) y Tomás Olivo (inmobiliario).\n"
            "//   · figuras_clave_5.json · grandes fondos accionistas del IBEX (BlackRock,\n"
            "//     fondo de Noruega), prensa (El Confidencial/Cardero, Prensa Ibérica/Moll,\n"
            "//     Mediaset/Borja Prado), CEPYME (Cuerva), RAE (Muñoz Machado), cardenal\n"
            "//     Omella, ElPozo (T. Fuertes), Carlos Slim y Glovo (Oscar Pierre).\n"
            "//   · figuras_clave_4.json · reguladores y holding público sobre el IBEX\n"
            "//     (SEPI/Gualda, CNMV/San Basilio, AIReF/Herrero, AEB/Kindelán) y dueños\n"
            "//     de medios (Planeta+Atresmedia/Creuheras, Amber+PRISA/Oughourlian,\n"
            "//     Losantos), LaLiga/Tebas, Fundación Alternativas, Funcas, Manuel Jove.\n"
            "//   · figuras_clave_6.json · BCE (Lagarde), Mutua (Garralda), Damm/Disa\n"
            "//     (Carceller), Mediapro (Roures), El Mundo (Manso), Vocento/ABC, Consejo\n"
            "//     de Estado (Valerio), Prosegur (Revoredo), Glencore (Daniel Maté), los\n"
            "//     Albertos e Instituto de la Empresa Familiar.\n"
            "// Re-generar: python3 bin/gen_subfixture.py --source poder\n"
        ),
    },
}


def detect_partido(tags: list[str]) -> str | None:
    """Extrae el partido del array de tags si está identificable."""
    siglas = {
        "pp",
        "psoe",
        "psc",
        "psdeg",
        "pnv",
        "junts",
        "erc",
        "vox",
        "sumar",
        "bng",
        "bildu",
        "cup",
        "upn",
        "cs",
        "podemos",
        "pdecat",
    }
    for t in tags or []:
        if t.lower() in siglas:
            return t.upper()
    return None


def to_dossier_completo(d: dict, prefix: str, idx: int, now_iso: str) -> dict:
    """Mapea una entrada del seed JSON al shape DossierCompleto del fixture TS."""
    base_id = f"{prefix}-{idx:04d}"
    apartados_out = []
    for ap_i, ap in enumerate(d.get("apartados") or []):
        ap_id = f"{base_id}-ap-{ap_i:02d}"
        items_out = []
        for it_i, it in enumerate(ap.get("items") or []):
            items_out.append(
                {
                    "id": f"{ap_id}-it-{it_i:02d}",
                    "apartado_id": ap_id,
                    "tipo": it.get("tipo") or "dato",
                    "titulo": it.get("titulo"),
                    "contenido": it.get("contenido") or "",
                    "fecha": it.get("fecha"),
                    "fuente_url": it.get("fuente_url"),
                    "fuente_titulo": it.get("fuente_titulo"),
                    "tags": it.get("tags") or [],
                    "orden": it.get("orden", it_i),
                }
            )
        apartados_out.append(
            {
                "id": ap_id,
                "tipo": ap.get("tipo"),
                "titulo": ap.get("titulo"),
                "resumen": ap.get("resumen"),
                "orden": ap.get("orden", ap_i),
                "items": items_out,
            }
        )

    return {
        "id": base_id,
        "slug": d["slug"],
        "nombre_completo": d.get("nombre") or d.get("nombre_completo") or d["slug"],
        "alias": d.get("alias"),
        "cargo_actual": d.get("cargo") or d.get("cargo_actual"),
        "partido": detect_partido(d.get("tags") or []),
        "foto_url": d.get("foto_url"),
        "bio_corta": d.get("bio_corta"),
        "tags": d.get("tags") or [],
        "fuente_principal": d.get("fuente_principal"),
        "apartados": apartados_out,
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def serialize_ts(value, indent: int = 0) -> str:
    """Serializa Python → TS literal. JSON-compatible es JS válido excepto
    `null` que JS también acepta. Usamos json.dumps con indentación."""
    return json.dumps(value, ensure_ascii=False, indent=indent)


def emit_ts(source: str) -> Path:
    cfg = SOURCES[source]
    now_iso = datetime.utcnow().isoformat() + "Z"

    all_entries = []
    for f in cfg["files"]:
        with f.open("r", encoding="utf-8") as fh:
            for d in json.load(fh):
                all_entries.append(d)

    # Dedupe por slug (último gana)
    by_slug = {}
    for d in all_entries:
        by_slug[d["slug"]] = d
    all_entries = list(by_slug.values())

    dossieres = [
        to_dossier_completo(d, cfg["id_prefix"], i + 1, now_iso) for i, d in enumerate(all_entries)
    ]

    lines = []
    lines.append(cfg["header"].rstrip("\n"))
    lines.append("")
    lines.append("import type {")
    lines.append("  DossierCompleto,")
    lines.append("  DossierResumen,")
    lines.append("} from './dosieres-fixture'")
    lines.append("")
    lines.append(
        f"export const {cfg['fixture_name']}: DossierCompleto[] = "
        + serialize_ts(dossieres, indent=2)
    )
    lines.append("")
    lines.append(
        f"export const {cfg['resumen_name']}: DossierResumen[] = "
        f"{cfg['fixture_name']}.map(d => ({{"
    )
    lines.append("  id: d.id,")
    lines.append("  slug: d.slug,")
    lines.append("  nombre_completo: d.nombre_completo,")
    lines.append("  alias: d.alias,")
    lines.append("  cargo_actual: d.cargo_actual,")
    lines.append("  partido: d.partido,")
    lines.append("  foto_url: d.foto_url,")
    lines.append("  bio_corta: d.bio_corta,")
    lines.append("  tags: d.tags,")
    lines.append("  n_apartados: d.apartados.length,")
    lines.append("  updated_at: d.updated_at,")
    lines.append("}))")
    lines.append("")
    lines.append(
        f"export function get{cfg['id_prefix'].upper()}BySlug"
        f"(slug: string): DossierCompleto | null {{"
    )
    lines.append(f"  return {cfg['fixture_name']}.find(d => d.slug === slug) ?? null")
    lines.append("}")
    lines.append("")

    out = cfg["out"]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"OK · {len(dossieres)} entradas escritas en {out.relative_to(REPO)}")
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=[*list(SOURCES.keys()), "all"], default="all")
    args = parser.parse_args()
    sources = list(SOURCES.keys()) if args.source == "all" else [args.source]
    for s in sources:
        emit_ts(s)
    return 0


if __name__ == "__main__":
    sys.exit(main())
