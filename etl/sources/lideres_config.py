"""
lideres_config.py
Para cada líder define:
- fuentes: lista ordenada por prioridad (la primera que responda gana)
- cada fuente tiene: tipo (rss|html|json|ical), url, y parser_hint
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class FuenteAgenda:
    tipo: str  # "rss" | "html" | "ical" | "json"
    url: str
    parser_hint: str  # "moncloa_presidente"|"partido_web_generico"|...
    prioridad: int = 0  # 0 = mayor prioridad


@dataclass
class Lider:
    lider_id: str
    nombre: str
    partido: str
    cargo: str
    fuentes: list[FuenteAgenda] = field(default_factory=list)


LIDERES: list[Lider] = [
    Lider(
        lider_id="pedro_sanchez",
        nombre="Pedro Sánchez",
        partido="PSOE",
        cargo="Presidente del Gobierno",
        fuentes=[
            FuenteAgenda("html", "https://www.lamoncloa.gob.es/presidente/actividades/Paginas/index.aspx", "moncloa_presidente", prioridad=0),
            FuenteAgenda("rss", "https://www.lamoncloa.gob.es/presidente/rss/presidente.aspx", "rss_generico", prioridad=1),
        ],
    ),
    Lider(
        lider_id="alberto_nunez_feijoo",
        nombre="Alberto Núñez Feijóo",
        partido="PP",
        cargo="Líder del PP / Jefe de la Oposición",
        fuentes=[
            FuenteAgenda("html", "https://www.pp.es/actualidad/agenda", "pp_web", prioridad=0),
            FuenteAgenda("rss", "https://www.pp.es/rss/noticias.xml", "rss_generico", prioridad=1),
        ],
    ),
    Lider(
        lider_id="santiago_abascal",
        nombre="Santiago Abascal",
        partido="VOX",
        cargo="Presidente de VOX",
        fuentes=[
            FuenteAgenda("html", "https://www.voxespana.es/agenda", "partido_web_generico", prioridad=0),
            FuenteAgenda("rss", "https://www.voxespana.es/feed", "rss_generico", prioridad=1),
        ],
    ),
    Lider(
        lider_id="yolanda_diaz",
        nombre="Yolanda Díaz",
        partido="SUMAR",
        cargo="Vicepresidenta Segunda / Líder de SUMAR",
        fuentes=[
            FuenteAgenda("html", "https://www.mites.gob.es/es/ministerio/agenda/index.htm", "ministerio_agenda", prioridad=0),
            FuenteAgenda("rss", "https://www.mites.gob.es/rss/agenda.xml", "rss_generico", prioridad=1),
        ],
    ),
    Lider(
        lider_id="oriol_junqueras",
        nombre="Oriol Junqueras",
        partido="ERC",
        cargo="Presidente de ERC",
        fuentes=[
            FuenteAgenda("rss", "https://www.esquerra.cat/ca/rss/noticies.xml", "rss_generico", prioridad=0),
            FuenteAgenda("html", "https://www.esquerra.cat/ca/agenda", "partido_web_generico", prioridad=1),
        ],
    ),
    Lider(
        lider_id="carles_puigdemont",
        nombre="Carles Puigdemont",
        partido="JUNTS",
        cargo="Secretario General de Junts",
        fuentes=[
            FuenteAgenda("rss", "https://www.junts.cat/rss/noticies.xml", "rss_generico", prioridad=0),
            FuenteAgenda("html", "https://www.junts.cat/agenda", "partido_web_generico", prioridad=1),
        ],
    ),
    Lider(
        lider_id="arnaldo_otegi",
        nombre="Arnaldo Otegi",
        partido="EH BILDU",
        cargo="Coordinador General de EH Bildu",
        fuentes=[
            FuenteAgenda("rss", "https://www.ehbildu.eus/eu/rss/news.xml", "rss_generico", prioridad=0),
        ],
    ),
    Lider(
        lider_id="andoni_ortuzar",
        nombre="Andoni Ortuzar",
        partido="PNV",
        cargo="Presidente del PNV",
        fuentes=[
            FuenteAgenda("rss", "https://www.eaj-pnv.eus/rss/noticias.xml", "rss_generico", prioridad=0),
        ],
    ),
    Lider(
        lider_id="congreso_plenos",
        nombre="Plenos y Comisiones",
        partido="CONGRESO",
        cargo="Agenda institucional",
        fuentes=[
            FuenteAgenda("json", "https://www.congreso.es/rest/api/initiative?lang=es&pageSize=20", "congreso_api", prioridad=0),
            FuenteAgenda("html", "https://www.congreso.es/agenda", "congreso_agenda_html", prioridad=1),
        ],
    ),
    Lider(
        lider_id="consejo_ministros",
        nombre="Consejo de Ministros",
        partido="GOBIERNO",
        cargo="Órgano colegiado",
        fuentes=[
            FuenteAgenda("rss", "https://www.lamoncloa.gob.es/consejodeministros/rss/consejoministros.aspx", "rss_generico", prioridad=0),
        ],
    ),
]


LIDERES_INDEX: dict[str, Lider] = {l.lider_id: l for l in LIDERES}
