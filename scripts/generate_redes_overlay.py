"""scripts/generate_redes_overlay.py

Genera un overlay JSON con relaciones políticas estructurales para los
políticos del fixture (`apps/visual-oscar/data/dosieres-fixture.ts`) que
NO tienen apartado `redes`.

Estrategia · "estilo Feijóo" sobre relaciones canónicas por partido:

  Para cada dossier sin apartado `redes`, genera un set de items con:
    - líderes orgánicos del mismo partido  (+8 / +7 / +6 según rol)
    - cuadros parlamentarios destacados    (+6 / +5)
    - presidentes autonómicos del partido  (+5 / +6)
    - rivales naturales del otro bloque    (-6 / -7 / -8)

Los líderes/rivales se hardcodean por partido. Cada referencia se
verifica contra el set de slugs reales del fixture; si no existe, el
item se emite con `slug=null` y solo el texto.

Si el dossier YA es uno de los líderes (p.ej. Sánchez), se evitan
auto-referencias.

Salida: `apps/visual-oscar/data/redes-overlay.json`
  Shape: { "<slug>": [{ "titulo", "contenido", "tags", "slug_ref" }, ...] }

Uso:
    .venv/bin/python3 scripts/generate_redes_overlay.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE_TS = REPO / "apps" / "visual-oscar" / "data" / "dosieres-fixture.ts"
OUT_JSON = REPO / "apps" / "visual-oscar" / "data" / "redes-overlay.json"


# ─── Tabla canónica de líderes y rivales por partido ──────────────────
# Cada entrada: (slug, cargo_etiqueta, nota, justificación_breve).
# Las notas son lecturas analíticas estructurales — un diputado del PP
# tiene a Feijóo +8 por defecto, salvo que el script lo evite por ser
# el propio Feijóo.
LEADERS: dict[str, list[tuple[str, str, int, str]]] = {
    "PSOE": [
        (
            "pedro-sanchez-perez-castejon",
            "Presidente del Gobierno y secretario general del PSOE",
            +8,
            "Liderazgo orgánico y referente nacional del partido.",
        ),
        (
            "maria-jesus-montero-cuadrado",
            "Vicepresidenta primera y ministra de Hacienda",
            +7,
            "Núcleo financiero del Gobierno y vicesecretaria general.",
        ),
        (
            "felix-bolanos-garcia",
            "Ministro de la Presidencia, Justicia y Relaciones con las Cortes",
            +7,
            "Pieza clave de la coordinación gubernamental.",
        ),
        (
            "margarita-robles-fernandez",
            "Ministra de Defensa",
            +6,
            "Voz de moderación institucional dentro del Consejo de Ministros.",
        ),
        (
            "oscar-puente-santiago",
            "Ministro de Transportes y Movilidad Sostenible",
            +6,
            "Portavocía agresiva del PSOE en redes y oposición.",
        ),
        (
            "pilar-alegria-continente",
            "Ministra de Educación, Formación Profesional y Deportes",
            +6,
            "Portavoz del Gobierno y rostro mediático del PSOE.",
        ),
    ],
    "PP": [
        (
            "alberto-nunez-feijoo",
            "Presidente del PP y líder de la oposición",
            +8,
            "Liderazgo nacional del partido y referente orgánico.",
        ),
        (
            "miguel-tellado-filgueira",
            "Secretario general del PP",
            +7,
            "Voz dura del partido y mano derecha de Feijóo.",
        ),
        (
            "cuca-gamarra-ruiz-clavijo",
            "Vicesecretaria de organización del PP",
            +7,
            "Pieza clave en dirección parlamentaria y orgánica.",
        ),
        (
            "isabel-diaz-ayuso",
            "Presidenta de la Comunidad de Madrid",
            +7,
            "Activo territorial central, ala más combativa del PP.",
        ),
        (
            "juanma-moreno-bonilla",
            "Presidente de la Junta de Andalucía",
            +7,
            "Modelo de centrismo territorial PP.",
        ),
        (
            "alfonso-rueda-valenzuela",
            "Presidente de la Xunta de Galicia",
            +6,
            "Sucesor político de Feijóo en Galicia.",
        ),
    ],
    "VOX": [
        (
            "santiago-abascal-conde",
            "Presidente de Vox",
            +8,
            "Liderazgo orgánico indiscutido del partido.",
        ),
        (
            "jose-antonio-fuster-pellicer",
            "Vicepresidente de Acción Política de Vox",
            +6,
            "Cargo de dirección nacional de Vox.",
        ),
    ],
    "Sumar": [
        (
            "yolanda-diaz-perez",
            "Vicepresidenta segunda del Gobierno y líder de Sumar",
            +8,
            "Liderazgo de la plataforma Sumar y cara visible en el Consejo.",
        ),
        (
            "monica-garcia-gomez",
            "Ministra de Sanidad",
            +7,
            "Pieza ministerial clave de Sumar en el Gobierno.",
        ),
        (
            "ernest-urtasun-domenech",
            "Ministro de Cultura",
            +6,
            "Cuota ministerial de Comunes / Sumar.",
        ),
        (
            "sira-rego-gonzalez",
            "Ministra de Juventud e Infancia",
            +6,
            "Cuadro de IU dentro de Sumar.",
        ),
    ],
    "PNV": [
        (
            "imanol-pradales-gil",
            "Lehendakari del Gobierno Vasco",
            +8,
            "Máximo cargo institucional del PNV.",
        ),
        (
            "andoni-ortuzar-arruabarrena",
            "Presidente del EBB del PNV",
            +7,
            "Liderazgo orgánico del partido.",
        ),
        (
            "aitor-esteban-bravo",
            "Portavoz del PNV en el Congreso",
            +7,
            "Cara visible parlamentaria del PNV durante años.",
        ),
    ],
    "ERC": [
        (
            "oriol-junqueras-vies",
            "Presidente de ERC",
            +8,
            "Liderazgo histórico del partido tras el indulto.",
        ),
        (
            "gabriel-rufian-romero",
            "Portavoz de ERC en el Congreso",
            +7,
            "Cara mediática del partido.",
        ),
        ("marta-vilalta-torres", "Secretaria general de ERC", +6, "Liderazgo orgánico interno."),
    ],
    "Junts": [
        (
            "carles-puigdemont-casamajo",
            "Presidente de Junts en el exilio",
            +8,
            "Liderazgo simbólico del partido.",
        ),
        (
            "jordi-turull-negre",
            "Secretario general de Junts",
            +7,
            "Coordinación orgánica del partido.",
        ),
        (
            "miriam-nogueras-camero",
            "Portavoz de Junts en el Congreso",
            +7,
            "Cara parlamentaria de Junts.",
        ),
    ],
    "EH Bildu": [
        (
            "arnaldo-otegi-mondragon",
            "Coordinador general de EH Bildu",
            +8,
            "Liderazgo histórico de la izquierda abertzale.",
        ),
        (
            "mertxe-aizpurua-arzallus",
            "Portavoz de EH Bildu en el Congreso",
            +7,
            "Cara parlamentaria del partido.",
        ),
        (
            "pello-otxandiano-aldalur",
            "Candidato a Lehendakari de EH Bildu",
            +6,
            "Liderazgo institucional en Euskadi.",
        ),
    ],
    "BNG": [
        (
            "ana-pontón-mondelo",
            "Portavoz nacional del BNG",
            +8,
            "Liderazgo del partido y candidata en Galicia.",
        ),
        (
            "nestor-rego-candamil",
            "Diputado del BNG en el Congreso",
            +7,
            "Cara parlamentaria del BNG.",
        ),
    ],
    "CC": [
        (
            "fernando-clavijo-batlle",
            "Presidente del Gobierno de Canarias",
            +8,
            "Liderazgo institucional del partido.",
        ),
        (
            "ana-oramas-gonzalez-moro",
            "Histórica diputada de CC en el Congreso",
            +6,
            "Referente parlamentaria de CC.",
        ),
    ],
    "Podemos": [
        (
            "ione-belarra-urteaga",
            "Secretaria general de Podemos",
            +8,
            "Liderazgo orgánico del partido tras la ruptura con Sumar.",
        ),
        (
            "irene-montero-gil",
            "Diputada y exministra de Igualdad",
            +7,
            "Referente ideológica del partido.",
        ),
    ],
    "Más Madrid": [
        (
            "monica-garcia-gomez",
            "Líder histórica de Más Madrid (hoy ministra)",
            +7,
            "Figura fundacional del partido.",
        ),
        (
            "manuela-bergerot-uncal",
            "Portavoz de Más Madrid en la Asamblea",
            +6,
            "Liderazgo regional post-García.",
        ),
        (
            "rita-maestre-fernandez",
            "Concejala y portavoz de Más Madrid en el Ayuntamiento de Madrid",
            +6,
            "Cara visible del partido a nivel municipal.",
        ),
    ],
    "UPN": [
        (
            "javier-esparza-abaurrea",
            "Presidente de UPN",
            +8,
            "Liderazgo orgánico del regionalismo navarro de centro-derecha.",
        ),
        (
            "cristina-ibarrola-guillen",
            "Alcaldesa de Pamplona",
            +7,
            "Máximo cargo institucional del partido.",
        ),
    ],
    "Compromís": [
        (
            "joan-baldovi-roda",
            "Síndic de Compromís en les Corts Valencianes",
            +8,
            "Liderazgo institucional del partido y portavoz parlamentario.",
        ),
        (
            "agueda-mico-mico",
            "Coordinadora general de Compromís",
            +7,
            "Liderazgo orgánico interno.",
        ),
        (
            "monica-oltra-jarque",
            "Ex vicepresidenta de la Generalitat Valenciana",
            +5,
            "Referente histórica del partido (cargo previo).",
        ),
    ],
    "IU": [
        (
            "antonio-maillo-canada",
            "Coordinador federal de IU",
            +8,
            "Liderazgo orgánico de Izquierda Unida.",
        ),
        (
            "sira-rego-gonzalez",
            "Ministra de Juventud e Infancia (cuota IU en Sumar)",
            +7,
            "Cuadro ministerial de IU dentro del Gobierno.",
        ),
        (
            "yolanda-diaz-perez",
            "Líder de Sumar",
            +5,
            "Coalición de la cual IU forma parte; relación de socio.",
        ),
    ],
    "PRC": [
        (
            "miguel-angel-revilla-roiz",
            "Líder histórico del PRC",
            +8,
            "Figura fundacional y referente del regionalismo cántabro.",
        ),
        (
            "pablo-zuloaga-martinez",
            "Cargo orgánico relevante del regionalismo cántabro",
            +6,
            "Cuadro regional del partido.",
        ),
    ],
    "UPL": [
        (
            "luis-mariano-santos-reyero",
            "Líder de la UPL en las Cortes de Castilla y León",
            +8,
            "Liderazgo institucional del leonesismo.",
        ),
    ],
}

# Rivales por partido — bloque opositor canónico.
RIVALS: dict[str, list[tuple[str, str, int, str]]] = {
    "PSOE": [
        (
            "alberto-nunez-feijoo",
            "Líder del PP y de la oposición",
            -7,
            "Adversario político principal del PSOE en el Congreso.",
        ),
        (
            "santiago-abascal-conde",
            "Líder de Vox",
            -8,
            "Bloque ideológico de la derecha radical, frontalmente opuesto.",
        ),
        (
            "isabel-diaz-ayuso",
            "Presidenta de la Comunidad de Madrid",
            -7,
            "Adversaria territorial habitual del PSOE.",
        ),
    ],
    "PP": [
        (
            "pedro-sanchez-perez-castejon",
            "Presidente del Gobierno y secretario general del PSOE",
            -7,
            "Adversario político principal en el Congreso.",
        ),
        (
            "maria-jesus-montero-cuadrado",
            "Vicepresidenta primera y ministra de Hacienda",
            -6,
            "Voz fiscal del PSOE, rival habitual del PP.",
        ),
        (
            "yolanda-diaz-perez",
            "Vicepresidenta segunda y líder de Sumar",
            -6,
            "Socia de coalición de Sánchez, adversaria del PP.",
        ),
    ],
    "VOX": [
        (
            "pedro-sanchez-perez-castejon",
            "Presidente del Gobierno",
            -8,
            "Enemigo político central de Vox.",
        ),
        ("yolanda-diaz-perez", "Líder de Sumar", -8, "Polo opuesto ideológico."),
        (
            "salvador-illa-roca",
            "President de la Generalitat (PSC)",
            -7,
            "Bloque progresista-catalanista, rival ideológico.",
        ),
        (
            "alberto-nunez-feijoo",
            "Líder del PP",
            -4,
            "Rival relativo: a veces aliado en gobiernos autonómicos, a veces competidor por el voto de derecha.",
        ),
    ],
    "Sumar": [
        ("alberto-nunez-feijoo", "Líder del PP", -7, "Adversario ideológico y político."),
        (
            "santiago-abascal-conde",
            "Líder de Vox",
            -8,
            "Polo opuesto absoluto, enfrentamiento estructural.",
        ),
        (
            "isabel-diaz-ayuso",
            "Presidenta de la Comunidad de Madrid",
            -7,
            "Adversaria personal y política.",
        ),
    ],
    "Podemos": [
        (
            "yolanda-diaz-perez",
            "Líder de Sumar",
            -6,
            "Ruptura interna de la izquierda alternativa.",
        ),
        ("alberto-nunez-feijoo", "Líder del PP", -7, "Adversario ideológico."),
        ("santiago-abascal-conde", "Líder de Vox", -8, "Polo opuesto absoluto."),
    ],
    "PNV": [
        (
            "arnaldo-otegi-mondragon",
            "Coordinador general de EH Bildu",
            -2,
            "Competidor histórico en Euskadi, hoy con cierta normalización institucional.",
        ),
        ("santiago-abascal-conde", "Líder de Vox", -8, "Polo opuesto al autogobierno vasco."),
    ],
    "ERC": [
        (
            "carles-puigdemont-casamajo",
            "Líder de Junts",
            -5,
            "Competidor histórico en el independentismo catalán.",
        ),
        ("alberto-nunez-feijoo", "Líder del PP", -7, "Adversario nacionalista español."),
        ("santiago-abascal-conde", "Líder de Vox", -8, "Polo opuesto absoluto al independentismo."),
    ],
    "Junts": [
        (
            "oriol-junqueras-vies",
            "Presidente de ERC",
            -5,
            "Competidor histórico en el independentismo catalán.",
        ),
        (
            "salvador-illa-roca",
            "President de la Generalitat (PSC)",
            -6,
            "Adversario en el gobierno catalán.",
        ),
        ("santiago-abascal-conde", "Líder de Vox", -8, "Polo opuesto absoluto."),
    ],
    "EH Bildu": [
        (
            "imanol-pradales-gil",
            "Lehendakari del PNV",
            -4,
            "Competidor por el voto soberanista vasco.",
        ),
        ("alberto-nunez-feijoo", "Líder del PP", -7, "Adversario nacionalista español."),
        ("santiago-abascal-conde", "Líder de Vox", -8, "Polo opuesto absoluto."),
    ],
    "BNG": [
        (
            "alfonso-rueda-valenzuela",
            "Presidente de la Xunta (PP)",
            -6,
            "Adversario directo en el gobierno gallego.",
        ),
        ("alberto-nunez-feijoo", "Líder del PP", -7, "Adversario nacionalista español."),
    ],
    "CC": [
        (
            "alberto-nunez-feijoo",
            "Líder del PP",
            -3,
            "Rival relativo: socio puntual de pactos pero competidor en Canarias.",
        ),
        (
            "pedro-sanchez-perez-castejon",
            "Presidente del Gobierno",
            -3,
            "Negocia pactos pero compite por voto canario.",
        ),
    ],
    "Más Madrid": [
        (
            "isabel-diaz-ayuso",
            "Presidenta de la Comunidad de Madrid",
            -8,
            "Adversaria política directa en la Asamblea de Madrid.",
        ),
        ("alberto-nunez-feijoo", "Líder del PP", -7, "Bloque opuesto."),
    ],
    "UPN": [
        (
            "pedro-sanchez-perez-castejon",
            "Presidente del Gobierno (PSOE)",
            -6,
            "Adversario en la oposición navarra; UPN rechaza los pactos PSN con EH Bildu.",
        ),
        (
            "arnaldo-otegi-mondragon",
            "Coordinador general de EH Bildu",
            -8,
            "Polo opuesto a la concepción regionalista española de Navarra.",
        ),
        (
            "santiago-cervera-soto",
            "Diputado del PSN en el Parlamento de Navarra",
            -6,
            "Rival institucional en la Comunidad Foral.",
        ),
    ],
    "Compromís": [
        (
            "carlos-mazon-guixot",
            "President de la Generalitat Valenciana (PP)",
            -8,
            "Adversario directo en las Corts Valencianes, especialmente tras la DANA de octubre 2024.",
        ),
        (
            "santiago-abascal-conde",
            "Líder de Vox",
            -8,
            "Polo ideológico opuesto en la política valenciana.",
        ),
        ("alberto-nunez-feijoo", "Líder del PP", -6, "Bloque opuesto al ecosocialismo valenciano."),
    ],
    "IU": [
        ("alberto-nunez-feijoo", "Líder del PP", -7, "Adversario ideológico habitual."),
        ("santiago-abascal-conde", "Líder de Vox", -8, "Polo opuesto absoluto."),
        (
            "isabel-diaz-ayuso",
            "Presidenta de la Comunidad de Madrid",
            -7,
            "Adversaria personalizada de la izquierda alternativa.",
        ),
    ],
    "PRC": [
        (
            "alberto-nunez-feijoo",
            "Líder del PP",
            -5,
            "Adversario habitual del PRC en el centro-derecha cántabro.",
        ),
        (
            "santiago-abascal-conde",
            "Líder de Vox",
            -7,
            "Polo opuesto al regionalismo centrista cántabro.",
        ),
        (
            "maria-jose-saenz-de-buruaga",
            "Presidenta de Cantabria (PP)",
            -7,
            "Adversaria directa que sustituyó al PRC en la presidencia regional en 2023.",
        ),
    ],
    "UPL": [
        (
            "alfonso-fernandez-manueco",
            "Presidente de la Junta de Castilla y León (PP)",
            -6,
            "Adversario habitual del leonesismo en CyL.",
        ),
        (
            "alberto-nunez-feijoo",
            "Líder del PP",
            -5,
            "Bloque del que la UPL se aleja por defender la creación de una CCAA leonesa.",
        ),
        (
            "santiago-abascal-conde",
            "Líder de Vox",
            -7,
            "Vox como adversario ideológico y bloqueo institucional de la autonomía leonesa.",
        ),
    ],
}

# Familias de partidos que comparten líderes (PSOE-A, PSC, PSDEG…
# todos heredan los líderes federales del PSOE). Incluye TODAS las
# variantes que aparecen en el fixture con sufijos territoriales.
PARTY_ALIASES: dict[str, str] = {
    # ─── Variantes federales / regionales del PSOE ────────────────
    "PSOE-A": "PSOE",
    "PSC": "PSOE",
    "PSC-CP": "PSOE",
    "PSC-UNITS-CP": "PSOE",
    "PSDEG": "PSOE",
    "PSDEG-PSOE": "PSOE",
    "PSdeG-PSOE": "PSOE",
    "PSE-EE": "PSOE",
    "PSE-EE-PSOE": "PSOE",
    "PSE-EE (PSOE)": "PSOE",
    "PSN": "PSOE",
    "PSN-PSOE": "PSOE",
    "FSA-PSOE": "PSOE",
    # ─── Vox / Sumar mayúsculas ───────────────────────────────────
    "SUMAR": "Sumar",
    "Vox": "VOX",
    # ─── BNG variantes ────────────────────────────────────────────
    "B.N.G.": "BNG",
    # ─── Más Madrid variantes (incluye literal con escape Unicode) ─
    "Más Madrid": "Más Madrid",
    "M\\u00e1s Madrid": "Más Madrid",
    "MM-VQ": "Más Madrid",
    # ─── Compromís variantes ──────────────────────────────────────
    "Compromís": "Compromís",
    "Comprom\\u00eds": "Compromís",
    # ─── ERC variantes con coalición ──────────────────────────────
    "ERC - AM": "ERC",
    # ─── Junts variantes ──────────────────────────────────────────
    "Junts X CAT - C": "Junts",
    "JUNTS X CAT - C": "Junts",
    # ─── EH Bildu variantes ───────────────────────────────────────
    "EH BILDU": "EH Bildu",
    # ─── PNV variantes ────────────────────────────────────────────
    "EAJ-PNV": "PNV",
    # ─── UPN ──────────────────────────────────────────────────────
    "UNION DEL PUEBLO NAVARRO": "UPN",
    # ─── Coalición Canaria variantes ──────────────────────────────
    "CCA": "CC",
    "CC-PNC": "CC",
    "CCa-PNC-NC": "CC",
    "Coalición Canaria": "CC",
    # ─── IU variantes ─────────────────────────────────────────────
    "I.U.": "IU",
    "Izquierda Unida": "IU",
    # ─── PRC ──────────────────────────────────────────────────────
    "PRC": "PRC",
    # ─── UPL ──────────────────────────────────────────────────────
    "UPL": "UPL",
}


def parse_fixture(src: str) -> list[dict]:
    """Devuelve [{slug, nombre, cargo, partido, has_redes}] por dossier."""
    out = []
    pattern = re.compile(
        r'slug:\s*"([^"]+)",\s*\n'
        r"\s*nombre_completo:\s*`([^`]+)`,\s*\n"
        r"[^}]*?"
        r"cargo_actual:\s*`([^`]*)`,\s*\n"
        r"[^}]*?"
        r'partido:\s*(?:"([^"]+)"|null)',
        re.DOTALL,
    )
    for m in pattern.finditer(src):
        slug, nombre, cargo, partido = m.groups()
        # Decodificar escapes Unicode (á → á) en nombre, cargo Y partido
        nombre = nombre.encode("utf-8").decode("unicode_escape", errors="ignore")
        cargo = (cargo or "").encode("utf-8").decode("unicode_escape", errors="ignore")
        if partido:
            partido = partido.encode("utf-8").decode("unicode_escape", errors="ignore")
        # Detectar si tiene apartado redes: busca en el chunk hasta el
        # siguiente dossier top-level. Los IDs top-level matchean
        # `id: 'fxt-NNN',` (sólo dígitos tras fxt-) — los nested son
        # `fxt-NNN-ap-…` con más guiones.
        pos = m.end()
        m_next = re.search(r"id:\s*'fxt-\d+',", src[pos + 10 :])
        if m_next:
            chunk = src[pos : pos + 10 + m_next.start()]
        else:
            chunk = src[pos:]
        has_redes = "tipo: 'redes'" in chunk
        out.append(
            {
                "slug": slug,
                "nombre": nombre,
                "cargo": cargo,
                "partido": partido,
                "has_redes": has_redes,
            }
        )
    return out


def canonical_partido(p: str | None) -> str | None:
    if not p:
        return None
    return PARTY_ALIASES.get(p, p)


def tag_for(score: int) -> list[str]:
    sign = "+" if score >= 0 else "-"
    tag_nota = f"nota-{sign}{abs(score)}"
    if score >= 7:
        return [tag_nota, "alianza-fuerte"]
    if score >= 4:
        return [tag_nota, "alianza-debil"]
    if score >= 0:
        return [tag_nota, "neutral"]
    if score >= -6:
        return [tag_nota, "tension"]
    return [tag_nota, "conflicto"]


def make_item(
    slug_ref: str | None,
    nombre_ref: str,
    cargo_ref: str,
    nota: int,
    justif: str,
    exists_in_fixture: bool,
) -> dict:
    """Genera un item con formato `**Cargo** (nota +N/10) — Justificación`.
    Si el slug_ref existe en el fixture, lo incluye para futuro link;
    si no, lo deja a null (el frontend lo mostrará como texto plano)."""
    sign = "+" if nota >= 0 else "-"
    contenido = f"**{cargo_ref}** (nota {sign}{abs(nota)}/10) — {justif}"
    return {
        "titulo": nombre_ref,
        "contenido": contenido,
        "tags": tag_for(nota),
        "slug_ref": slug_ref if exists_in_fixture else None,
    }


def build_overlay(dossieres: list[dict]) -> dict:
    """Emite overlay COMPACTO: items canónicos por partido (~10 cada uno)
    + mapping slug→partido para dossieres a los que aplica.

    Shape:
      {
        "version": 1,
        "by_party": { "PSOE": [items…], "PP": [items…], … },
        "generic":  [items…]   # para dossieres sin partido
        "apply_to": { "<slug>": "<partido>" | "_generic" },
      }

    El cliente resuelve cada slug a su lista de items vía:
       items = overlay.by_party[overlay.apply_to[slug]] || overlay.generic

    Eso evita duplicar contenido idéntico para cada uno de los 2.000+
    dossieres del mismo partido.
    """
    all_slugs = {d["slug"] for d in dossieres}

    # 1) Construir los templates por partido (líderes + rivales)
    by_party: dict[str, list[dict]] = {}
    for partido, leaders in LEADERS.items():
        items = []
        for slug_ref, cargo, nota, just in leaders:
            nombre_ref = next(
                (x["nombre"] for x in dossieres if x["slug"] == slug_ref),
                slug_ref.replace("-", " ").title(),
            )
            items.append(make_item(slug_ref, nombre_ref, cargo, nota, just, slug_ref in all_slugs))
        for slug_ref, cargo, nota, just in RIVALS.get(partido, []):
            nombre_ref = next(
                (x["nombre"] for x in dossieres if x["slug"] == slug_ref),
                slug_ref.replace("-", " ").title(),
            )
            items.append(make_item(slug_ref, nombre_ref, cargo, nota, just, slug_ref in all_slugs))
        by_party[partido] = items

    # 2) Template genérico para los dossieres sin partido
    generic = [
        make_item(
            "pedro-sanchez-perez-castejon",
            "Pedro Sánchez Pérez-Castejón",
            "Presidente del Gobierno de España",
            0,
            "Referente institucional del Estado, sin alineamiento de partido del dossier.",
            "pedro-sanchez-perez-castejon" in all_slugs,
        )
    ]

    # 3) Construir el apply_to: para cada dossier sin apartado redes,
    #    si tiene partido conocido → apunta a su partido.
    #    Si no, apunta a "_generic" (sin partido).
    #    Auto-referencias se evitan en cliente filtrando items con
    #    slug_ref == el propio slug del dossier.
    apply_to: dict[str, str] = {}
    n_with_redes = 0
    n_no_partido = 0
    n_with_party = 0
    n_unknown_party = 0
    for d in dossieres:
        if d["has_redes"]:
            n_with_redes += 1
            continue
        cp = canonical_partido(d["partido"])
        if not cp:
            apply_to[d["slug"]] = "_generic"
            n_no_partido += 1
            continue
        if cp not in by_party:
            # Partido minoritario / agrupación local sin tabla
            # canónica de líderes. Fallback al genérico para que al
            # menos tenga una relación institucional (Sánchez +0)
            # en vez de quedar sin apartado redes.
            apply_to[d["slug"]] = "_generic"
            n_unknown_party += 1
            continue
        apply_to[d["slug"]] = cp
        n_with_party += 1

    overlay = {
        "version": 1,
        "generated_for": len(apply_to),
        "by_party": by_party,
        "generic": generic,
        "apply_to": apply_to,
    }

    print(f"Total dossieres en fixture:         {len(dossieres)}")
    print(f"  con apartado redes existente:     {n_with_redes}")
    print(f"  con partido conocido + overlay:   {n_with_party}")
    print(f"  sin partido (overlay genérico):   {n_no_partido}")
    print(f"  partido no mapeado (skip):        {n_unknown_party}")
    total_items = sum(len(v) for v in by_party.values()) + len(generic)
    print(
        f"Items canónicos por partido:        {total_items} ({len(by_party)} partidos + 1 genérico)"
    )
    return overlay


def main() -> int:
    with FIXTURE_TS.open("r", encoding="utf-8") as fh:
        src = fh.read()
    print(f"Fixture leído ({len(src)/1024:.0f} KB)")

    dossieres = parse_fixture(src)
    print(f"Dossieres parseados: {len(dossieres)}")

    overlay = build_overlay(dossieres)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUT_JSON.open("w", encoding="utf-8") as fh:
        json.dump(overlay, fh, ensure_ascii=False, indent=2)
    print(
        f"Overlay escrito en {OUT_JSON.relative_to(REPO)} "
        f"({OUT_JSON.stat().st_size / 1024:.0f} KB)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
