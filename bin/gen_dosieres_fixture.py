#!/usr/bin/env python3
"""Genera apps/visual-oscar/data/dosieres-fixture.ts combinando TODOS los JSON
parseados (/tmp/dosieres*.json).

Detecta duplicados por slug — si una persona aparece en dos PDFs, gana el
primero (más relevante / con más detalle).

Mapeo de campos del PDF → BD:
  perfil_completo  → apartado tipo='identidad', item único con contenido=perfil
  relaciones[]     → apartado tipo='redes', items tipo='contacto' con título=persona,
                     contenido=tipo + nota + explicación, tags=[nivel, nota-N]
  patrimonio[]     → apartado tipo='evidencia', items tipo='documento' con
                     título=concepto, contenido=valor
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT = REPO_ROOT / "apps" / "visual-oscar" / "data" / "dosieres-fixture.ts"

# JSONs a combinar (en orden de prioridad · primero gana en caso de duplicado).
# Cada input es (path, allow_homonyms):
#   - True : si hay slug duplicado, se renombra con sufijo de partido
#            (caso clásico: María Isabel Prieto Serrano que existe PSOE y PP,
#             son personas distintas).
#   - False: si hay slug duplicado, se descarta silenciosamente
#            (caso típico: PDFs consolidados que repiten personas ya cargadas).
INPUTS = [
    (Path("/tmp/dosieres.json"),           True),  # Gobierno + Feijóo (24)
    (Path("/tmp/dosieres_regio.json"),     True),  # Regionalistas + Grupo Mixto (33)
    (Path("/tmp/dosieres_sumar.json"),     True),  # Diputados Sumar (20)
    (Path("/tmp/dosieres_vox.json"),       True),  # Diputados Vox (33)
    (Path("/tmp/dosieres_psoe.json"),      True),  # Diputados PSOE (118)
    (Path("/tmp/dosieres_pp.json"),        True),  # Diputados PP (135)
    (Path("/tmp/dosieres_pp_nuevos.json"), True),  # Nuevos PP correctores (37)
    # El PDF "influencia" es un consolidado y REPITE actores ya cargados.
    # No tratar como homónimos · solo guardar los NUEVOS (no presentes antes).
    (Path("/tmp/dosieres_influencia.json"), False),
    # Senadores XV (292 de la lista oficial del Senado · datos básicos).
    # Si comparte slug con un diputado/ministro del mismo nombre el parser
    # ya añade '-senado' al slug. allow_homonyms True por seguridad.
    (Path("/tmp/dosieres_senado.json"), True),
    # Asamblea de Madrid XIII Legislatura (187 personas que han sido diputado/a
    # incluyendo sustituciones · CSV oficial open-data de la Asamblea).
    # El parser añade '-madrid' al slug en caso de colisión.
    (Path("/tmp/dosieres_madrid.json"), True),
    # Parlament de Catalunya XV Legislatura (135 diputats · scraping de las
    # 8 páginas oficiales de grup parlamentari). El parser añade '-parlament'
    # al slug en caso de colisión.
    (Path("/tmp/dosieres_catalunya.json"), True),
    # 13 parlamentos autonómicos restantes en una sola pasada:
    # Asturias, Canarias, País Vasco, Murcia, La Rioja, Cantabria,
    # Castilla y León (parcial), Extremadura (parcial), Aragón, Baleares,
    # Ceuta (parcial). Galicia y Navarra pendientes por bloqueo WAF.
    # Castilla-La Mancha, Valencia y Melilla pendientes por contenido dinámico.
    (Path("/tmp/dosieres_ccaa.json"), True),
]

PARTIDO_OVERRIDES = {
    "alberto-nunez-feijoo": "PP",
}


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
    """Escapa para template literal TS."""
    if s is None:
        return ""
    return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def load_all():
    """Carga todos los JSONs y combina · respetando allow_homonyms por input."""
    seen_slugs = set()
    combined = []
    for inp, allow_homonyms in INPUTS:
        if not inp.exists():
            print(f"⚠ skip {inp} (no existe)", file=sys.stderr)
            continue
        data = json.loads(inp.read_text(encoding="utf-8"))
        added = 0
        renamed = 0
        skipped = 0
        for d in data:
            slug = d["slug"]
            if slug in seen_slugs:
                if not allow_homonyms:
                    # PDF consolidado · descartar silenciosamente
                    skipped += 1
                    continue
                # Homónimo real · renombrar con sufijo de partido
                partido = (d.get("partido") or "x").lower().replace(" ", "-")
                new_slug = f"{slug}-{partido}"
                attempt = 1
                while new_slug in seen_slugs:
                    attempt += 1
                    new_slug = f"{slug}-{partido}-{attempt}"
                print(f"  ◆ homónimo: {slug} → {new_slug} ({d['nombre_completo']})", file=sys.stderr)
                d["slug"] = new_slug
                slug = new_slug
                renamed += 1
            seen_slugs.add(slug)
            combined.append(d)
            added += 1
        msg = f"✓ {inp.name}: {added} añadidos"
        if renamed:
            msg += f" ({renamed} homónimos renombrados)"
        if skipped:
            msg += f" ({skipped} duplicados descartados)"
        print(msg, file=sys.stderr)
    return combined


def gen():
    DATA = load_all()
    print(f"\nTotal combinado: {len(DATA)} dosieres", file=sys.stderr)

    lines = []
    lines.append("// AUTO-GENERADO desde PDFs de dosieres · ver bin/gen_dosieres_fixture.py")
    lines.append("// Fuentes:")
    lines.append("//   · Informe_politicos_publicos.pdf · Gobierno de España + Feijóo (24)")
    lines.append("//   · Informe_regionalistas_grupo_mixto.pdf · PNV/ERC/Junts/EH Bildu/Mixto (33)")
    lines.append("// Re-generar: pdftotext -layout <pdf> /tmp/X.txt → python3 bin/parse_*.py → python3 bin/gen_dosieres_fixture.py")
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

    now = datetime.now(timezone.utc).isoformat()
    lines.append('const NOW = ' + json.dumps(now))
    lines.append("")
    lines.append("export const DOSIERES_FIXTURE: DossierCompleto[] = [")

    for idx, d in enumerate(DATA):
        slug = d["slug"]
        partido = PARTIDO_OVERRIDES.get(slug, d.get("partido"))
        nombre = ts_string(d["nombre_completo"])
        cargo = ts_string(d.get("cargo_actual") or "")
        bio = ts_string(d.get("bio_corta") or "")
        perfil_full = ts_string(d.get("perfil_completo") or "")

        lines.append("  {")
        lines.append(f"    id: 'fxt-{idx+1:03d}',")
        lines.append(f"    slug: {json.dumps(slug, ensure_ascii=False)},")
        lines.append(f"    nombre_completo: `{nombre}`,")
        lines.append(f"    alias: null,")
        lines.append(f"    cargo_actual: `{cargo}`,")
        lines.append(f"    partido: {json.dumps(partido)},")
        lines.append(f"    foto_url: null,")
        lines.append(f"    bio_corta: `{bio}`,")
        lines.append(f"    tags: [],")
        lines.append(f"    fuente_principal: 'Informes públicos de mayo 2026',")
        lines.append(f"    apartados: [")

        # 1. IDENTIDAD
        if perfil_full:
            lines.append(f"      {{")
            lines.append(f"        id: 'fxt-{idx+1:03d}-ap-iden',")
            lines.append(f"        tipo: 'identidad',")
            lines.append(f"        titulo: null,")
            lines.append(f"        resumen: null,")
            lines.append(f"        orden: 0,")
            lines.append(f"        items: [")
            lines.append(f"          {{")
            lines.append(f"            id: 'fxt-{idx+1:03d}-iden-1',")
            lines.append(f"            apartado_id: 'fxt-{idx+1:03d}-ap-iden',")
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

        # 2. REDES
        if d.get("relaciones"):
            lines.append(f"      {{")
            lines.append(f"        id: 'fxt-{idx+1:03d}-ap-redes',")
            lines.append(f"        tipo: 'redes',")
            lines.append(f"        titulo: 'Relaciones políticas',")
            lines.append(f"        resumen: 'Valoración analítica de relaciones persona-persona (escala +10 a -10). Las puntuaciones son lecturas razonadas, no datos oficiales.',")
            lines.append(f"        orden: 1,")
            lines.append(f"        items: [")
            for ridx, r in enumerate(d["relaciones"]):
                persona = ts_string(r["persona"])
                tipo_rel = ts_string(r.get("tipo") or "Relación política")
                expl = ts_string(r.get("explicacion") or "")
                nota = r["nota"]
                tag = nota_tag(nota)
                contenido = f"**{tipo_rel}** (nota {nota:+d}/10)"
                if expl:
                    contenido += f" — {expl}"
                lines.append(f"          {{")
                lines.append(f"            id: 'fxt-{idx+1:03d}-redes-{ridx+1}',")
                lines.append(f"            apartado_id: 'fxt-{idx+1:03d}-ap-redes',")
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

        # 3. EVIDENCIA
        if d.get("patrimonio"):
            lines.append(f"      {{")
            lines.append(f"        id: 'fxt-{idx+1:03d}-ap-evid',")
            lines.append(f"        tipo: 'evidencia',")
            lines.append(f"        titulo: 'Patrimonio declarado',")
            lines.append(f"        resumen: 'Cifras procedentes de declaraciones públicas. Patrimonio declarado localizable, no riqueza total de mercado. Los inmuebles pueden no estar a precio de mercado actual.',")
            lines.append(f"        orden: 2,")
            lines.append(f"        items: [")
            for pidx, p in enumerate(d["patrimonio"]):
                concepto = ts_string(p["concepto"])
                valor = ts_string(p["valor"])
                lines.append(f"          {{")
                lines.append(f"            id: 'fxt-{idx+1:03d}-evid-{pidx+1}',")
                lines.append(f"            apartado_id: 'fxt-{idx+1:03d}-ap-evid',")
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
    print(f"\n✓ Generado {OUT} ({len(lines)} líneas)", file=sys.stderr)


if __name__ == "__main__":
    gen()
