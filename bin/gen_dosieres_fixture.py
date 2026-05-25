#!/usr/bin/env python3
"""Genera apps/visual-oscar/data/dosieres-fixture.ts a partir de /tmp/dosieres.json.

Mapeo de campos del PDF → BD:
  perfil_completo  → apartado tipo='identidad', item único con contenido=perfil
  relaciones[]     → apartado tipo='redes', items tipo='contacto' con título=persona,
                     contenido=tipo + explicación, tags=[nota_signo]
  patrimonio[]     → apartado tipo='evidencia', items tipo='documento' con
                     título=concepto, contenido=valor
"""
import json
import re
from datetime import datetime
from pathlib import Path

DATA = json.loads(Path("/tmp/dosieres.json").read_text(encoding="utf-8"))
OUT = Path("/Users/oscargarciaretuerta/Electsim/apps/visual-oscar/data/dosieres-fixture.ts")

PARTIDO_OVERRIDES = {
    "alberto-nunez-feijoo": "PP",
}

# Tag por signo de la nota
def nota_tag(n: int) -> str:
    if n >= 7:
        return "alianza-fuerte"
    if n >= 3:
        return "afin"
    if n >= -2:
        return "neutral"
    if n >= -6:
        return "tension"
    return "enfrentamiento"


def ts_string(s):
    """Escapa para template literal TS · backticks + ${} + backslashes."""
    if s is None:
        return ""
    return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def gen():
    lines = []
    lines.append("// AUTO-GENERADO desde Informe_politicos_publicos.pdf · 25 may 2026")
    lines.append("// Fuente: PDF con 24 dosieres (Gobierno de España + Feijóo)")
    lines.append("// Re-generar: python3 /tmp/parse_dosieres.py && python3 /tmp/gen_fixture.py")
    lines.append("//")
    lines.append("// Estructura → mismo shape que /api/dosieres (api/routers/dosieres.py):")
    lines.append("//   dossier · apartados[] · items[]")
    lines.append("// Apartados generados: identidad (perfil), redes (relaciones), evidencia (patrimonio)")
    lines.append("")
    lines.append("export type TipoApartado = 'identidad' | 'trayectoria' | 'posiciones' | 'redes' | 'declaraciones' | 'controversias' | 'evidencia'")
    lines.append("export type TipoItem = 'dato' | 'declaracion' | 'evento' | 'contacto' | 'documento'")
    lines.append("")
    lines.append("export interface DossierItem {")
    lines.append("  id: string")
    lines.append("  apartado_id: string")
    lines.append("  tipo: TipoItem")
    lines.append("  titulo: string | null")
    lines.append("  contenido: string")
    lines.append("  fecha: string | null")
    lines.append("  fuente_url: string | null")
    lines.append("  fuente_titulo: string | null")
    lines.append("  tags: string[]")
    lines.append("  orden: number")
    lines.append("}")
    lines.append("")
    lines.append("export interface DossierApartado {")
    lines.append("  id: string")
    lines.append("  tipo: TipoApartado")
    lines.append("  titulo: string | null")
    lines.append("  resumen: string | null")
    lines.append("  orden: number")
    lines.append("  items: DossierItem[]")
    lines.append("}")
    lines.append("")
    lines.append("export interface DossierCompleto {")
    lines.append("  id: string")
    lines.append("  slug: string")
    lines.append("  nombre_completo: string")
    lines.append("  alias: string | null")
    lines.append("  cargo_actual: string | null")
    lines.append("  partido: string | null")
    lines.append("  foto_url: string | null")
    lines.append("  bio_corta: string | null")
    lines.append("  tags: string[]")
    lines.append("  fuente_principal: string | null")
    lines.append("  apartados: DossierApartado[]")
    lines.append("  created_at: string")
    lines.append("  updated_at: string")
    lines.append("}")
    lines.append("")
    lines.append("export interface DossierResumen {")
    lines.append("  id: string")
    lines.append("  slug: string")
    lines.append("  nombre_completo: string")
    lines.append("  alias: string | null")
    lines.append("  cargo_actual: string | null")
    lines.append("  partido: string | null")
    lines.append("  foto_url: string | null")
    lines.append("  bio_corta: string | null")
    lines.append("  tags: string[]")
    lines.append("  n_apartados: number")
    lines.append("  updated_at: string")
    lines.append("}")
    lines.append("")

    now = datetime.utcnow().isoformat() + "Z"
    lines.append("const NOW = " + repr(now).replace("'", "\""))
    lines.append("")
    lines.append("export const DOSIERES_FIXTURE: DossierCompleto[] = [")

    for idx, d in enumerate(DATA):
        slug = d["slug"]
        partido = PARTIDO_OVERRIDES.get(slug, d.get("partido"))
        nombre = ts_string(d["nombre_completo"])
        cargo = ts_string(d["cargo_actual"])
        bio = ts_string(d["bio_corta"])
        perfil_full = ts_string(d["perfil_completo"])

        lines.append("  {")
        lines.append(f"    id: 'fxt-{idx+1:02d}',")
        lines.append(f"    slug: {json.dumps(slug, ensure_ascii=False)},")
        lines.append(f"    nombre_completo: `{nombre}`,")
        lines.append(f"    alias: null,")
        lines.append(f"    cargo_actual: `{cargo}`,")
        lines.append(f"    partido: {json.dumps(partido)},")
        lines.append(f"    foto_url: null,")
        lines.append(f"    bio_corta: `{bio}`,")
        lines.append(f"    tags: [],")
        lines.append(f"    fuente_principal: 'Informe Politicos Publicos · mayo 2026',")
        lines.append(f"    apartados: [")

        # Apartado 1: IDENTIDAD (perfil general)
        if perfil_full:
            lines.append(f"      {{")
            lines.append(f"        id: 'fxt-{idx+1:02d}-ap-iden',")
            lines.append(f"        tipo: 'identidad',")
            lines.append(f"        titulo: null,")
            lines.append(f"        resumen: null,")
            lines.append(f"        orden: 0,")
            lines.append(f"        items: [")
            lines.append(f"          {{")
            lines.append(f"            id: 'fxt-{idx+1:02d}-iden-1',")
            lines.append(f"            apartado_id: 'fxt-{idx+1:02d}-ap-iden',")
            lines.append(f"            tipo: 'dato',")
            lines.append(f"            titulo: 'Perfil general',")
            lines.append(f"            contenido: `{perfil_full}`,")
            lines.append(f"            fecha: null,")
            lines.append(f"            fuente_url: null,")
            lines.append(f"            fuente_titulo: null,")
            lines.append(f"            tags: [],")
            lines.append(f"            orden: 0,")
            lines.append(f"          }},")
            lines.append(f"        ],")
            lines.append(f"      }},")

        # Apartado 2: REDES (relaciones)
        if d["relaciones"]:
            lines.append(f"      {{")
            lines.append(f"        id: 'fxt-{idx+1:02d}-ap-redes',")
            lines.append(f"        tipo: 'redes',")
            lines.append(f"        titulo: 'Relaciones políticas',")
            lines.append(f"        resumen: 'Valoración analítica de relaciones persona-persona (escala +10 a -10). Las puntuaciones son lecturas razonadas, no datos oficiales.',")
            lines.append(f"        orden: 1,")
            lines.append(f"        items: [")
            for ridx, r in enumerate(d["relaciones"]):
                persona = ts_string(r["persona"])
                tipo_rel = ts_string(r["tipo"])
                expl = ts_string(r["explicacion"])
                nota = r["nota"]
                tag = nota_tag(nota)
                contenido = f"**{tipo_rel}** (nota {nota:+d}/10) — {expl}"
                lines.append(f"          {{")
                lines.append(f"            id: 'fxt-{idx+1:02d}-redes-{ridx+1}',")
                lines.append(f"            apartado_id: 'fxt-{idx+1:02d}-ap-redes',")
                lines.append(f"            tipo: 'contacto',")
                lines.append(f"            titulo: `{persona}`,")
                lines.append(f"            contenido: `{ts_string(contenido)}`,")
                lines.append(f"            fecha: null,")
                lines.append(f"            fuente_url: null,")
                lines.append(f"            fuente_titulo: null,")
                lines.append(f"            tags: [{json.dumps(tag)}, {json.dumps(f'nota-{nota:+d}')}],")
                lines.append(f"            orden: {ridx},")
                lines.append(f"          }},")
            lines.append(f"        ],")
            lines.append(f"      }},")

        # Apartado 3: EVIDENCIA (patrimonio)
        if d["patrimonio"]:
            lines.append(f"      {{")
            lines.append(f"        id: 'fxt-{idx+1:02d}-ap-evid',")
            lines.append(f"        tipo: 'evidencia',")
            lines.append(f"        titulo: 'Patrimonio declarado',")
            lines.append(f"        resumen: 'Cifras procedentes de declaraciones públicas. Patrimonio declarado localizable, no riqueza total de mercado. Los inmuebles pueden no estar a precio de mercado actual.',")
            lines.append(f"        orden: 2,")
            lines.append(f"        items: [")
            for pidx, p in enumerate(d["patrimonio"]):
                concepto = ts_string(p["concepto"])
                valor = ts_string(p["valor"])
                lines.append(f"          {{")
                lines.append(f"            id: 'fxt-{idx+1:02d}-evid-{pidx+1}',")
                lines.append(f"            apartado_id: 'fxt-{idx+1:02d}-ap-evid',")
                lines.append(f"            tipo: 'documento',")
                lines.append(f"            titulo: `{concepto}`,")
                lines.append(f"            contenido: `{valor}`,")
                lines.append(f"            fecha: null,")
                lines.append(f"            fuente_url: null,")
                lines.append(f"            fuente_titulo: 'Declaración pública de bienes',")
                lines.append(f"            tags: ['patrimonio'],")
                lines.append(f"            orden: {pidx},")
                lines.append(f"          }},")
            lines.append(f"        ],")
            lines.append(f"      }},")

        lines.append(f"    ],")
        lines.append(f"    created_at: NOW,")
        lines.append(f"    updated_at: NOW,")
        lines.append("  },")

    lines.append("]")
    lines.append("")
    lines.append("/** Resumen para la lista (sin apartados/items). */")
    lines.append("export const DOSIERES_RESUMEN: DossierResumen[] = DOSIERES_FIXTURE.map(d => ({")
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
    lines.append("export function getDossierBySlug(slug: string): DossierCompleto | null {")
    lines.append("  return DOSIERES_FIXTURE.find(d => d.slug === slug) ?? null")
    lines.append("}")
    lines.append("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"✓ Generado {OUT} ({len(lines)} líneas)")


if __name__ == "__main__":
    gen()
