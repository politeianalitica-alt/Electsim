#!/usr/bin/env python3
"""scripts/enrich_poder_existentes.py

Enriquece (in-place) las figuras de poder más pobres de data/poder/figuras_clave*.json
añadiendo items biográficos y conexiones (redes) CURADAS — hechos reales, notas al
estilo Feijóo. Idempotente: no duplica un item/red si ya existe ese título.

Uso:  python3 scripts/enrich_poder_existentes.py
"""
from __future__ import annotations

import glob
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FILES = sorted(glob.glob(str(REPO / "data" / "poder" / "figuras_clave*.json")))

# slug -> {"items": [{"ap": <tipo_apartado>, "tipo","titulo","contenido","tags"?}],
#          "redes": [{"titulo","contenido"}]}
ENRICH: dict[str, dict] = {
    "tomas-olivo": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "De Murcia al podio de las fortunas",
             "contenido": "Construyó desde el sureste un imperio de grandes centros comerciales (La Salinas, Nueva Condomina). El valor de su cartera inmobiliaria lo sitúa de forma recurrente entre las mayores fortunas de España, con un perfil de máxima discreción pública."},
        ],
        "redes": [
            {"titulo": "Banca acreedora", "contenido": "**Financiación de su cartera** (nota +4/10) — Sus desarrollos comerciales lo vinculan a la gran banca como financiadora de proyectos inmobiliarios."},
        ],
    },
    "jose-pablo-lopez": {
        "items": [
            {"ap": "posiciones", "tipo": "dato", "titulo": "Servicio público y audiencias",
             "contenido": "Pilota una RTVE en plena pugna por la audiencia y por su independencia editorial, con la reforma del sistema de elección del consejo y la presión política sobre los informativos como telón de fondo.",
             "tags": ["servicio-publico", "independencia"]},
        ],
        "redes": [
            {"titulo": "Congreso de los Diputados", "contenido": "**Nombramiento de origen parlamentario** (nota -1/10) — La presidencia de RTVE depende del reparto de fuerzas en el Congreso, lo que tensiona su autonomía frente a los partidos."},
            {"titulo": "borja-prado", "contenido": "**Competidor por la audiencia (Mediaset)** (nota -2/10) — La televisión pública compite por espectadores y publicidad con los grupos privados Mediaset y Atresmedia."},
        ],
    },
    "juan-luis-cebrian": {
        "items": [
            {"ap": "trayectoria", "tipo": "evento", "titulo": "Fundador de El País",
             "contenido": "Primer director de El País (1976) y después consejero delegado y presidente de PRISA durante décadas. Figura central del poder mediático de la Transición y de la construcción del grupo de comunicación más influyente de la izquierda.",
             "fecha": "1976-05-04"},
        ],
        "redes": [
            {"titulo": "pepa-bueno", "contenido": "**Heredera en la dirección de El País** (nota +3/10) — La cabecera que él fundó la dirige hoy Pepa Bueno; vínculo simbólico entre la vieja y la nueva PRISA."},
        ],
    },
    "manuel-lao": {
        "items": [
            {"ap": "trayectoria", "tipo": "evento", "titulo": "La venta de Cirsa",
             "contenido": "Fundó y desarrolló Cirsa hasta convertirla en un gigante europeo del juego, que vendió al fondo Blackstone, operación que cristalizó una de las mayores fortunas del país. Reinvierte a través de su family office Nortia.",
             "fecha": "2018-05-01"},
        ],
        "redes": [
            {"titulo": "Fondos de capital privado", "contenido": "**Vendedor a Blackstone** (nota +3/10) — La venta de Cirsa lo conectó con el gran capital privado internacional; hoy gestiona su patrimonio diversificado."},
        ],
    },
    "vicente-valles": {
        "items": [
            {"ap": "posiciones", "tipo": "dato", "titulo": "Rigor y liderazgo de audiencia",
             "contenido": "Conduce el informativo de referencia de Antena 3, líder de audiencia. Su estilo analítico y sus entrevistas marcan agenda; es uno de los rostros con más credibilidad del panorama televisivo.",
             "tags": ["informativos", "audiencia"]},
        ],
        "redes": [
            {"titulo": "jose-creuheras", "contenido": "**Su grupo editor (Atresmedia/Planeta)** (nota +6/10) — Vallés es activo estrella de Atresmedia, presidida por Creuheras; su credibilidad refuerza la marca del grupo."},
        ],
    },
    "carlos-alsina": {
        "redes": [
            {"titulo": "jose-creuheras", "contenido": "**Su grupo (Onda Cero / Atresmedia)** (nota +5/10) — Alsina lidera las mañanas de Onda Cero, radio del grupo Planeta/Atresmedia que preside Creuheras."},
            {"titulo": "carlos-herrera", "contenido": "**Competidor matinal en radio** (nota -2/10) — Alsina (Onda Cero) y Herrera (COPE) compiten por el liderazgo de la radio hablada de la mañana."},
        ],
    },
    "carlos-herrera": {
        "items": [
            {"ap": "posiciones", "tipo": "dato", "titulo": "Voz matinal de la derecha",
             "contenido": "Lidera las mañanas de la COPE con una audiencia masiva y una línea crítica con el Gobierno de Sánchez. Su programa es parada obligada para políticos del centro-derecha.",
             "tags": ["radio", "audiencia"]},
        ],
        "redes": [
            {"titulo": "luis-arguello", "contenido": "**La COPE es de la Iglesia** (nota +4/10) — La cadena pertenece a la Conferencia Episcopal; el peso de Herrera convive con la propiedad eclesial que representa Argüello."},
            {"titulo": "carlos-alsina", "contenido": "**Duelo matinal de la radio** (nota -2/10) — Herrera (COPE) y Alsina (Onda Cero) se disputan el liderazgo de la radio generalista por la mañana."},
        ],
    },
    "angel-gabilondo": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "De ministro a Defensor del Pueblo",
             "contenido": "Exministro de Educación y excandidato del PSOE a la Comunidad de Madrid, fue elegido Defensor del Pueblo con apoyo parlamentario, cargo desde el que supervisa a las administraciones y tramita el polémico informe sobre los abusos en la Iglesia."},
        ],
        "redes": [
            {"titulo": "Congreso de los Diputados", "contenido": "**Elección parlamentaria** (nota -1/10) — Su designación dependió del acuerdo PSOE-PP; debe equilibrar independencia y origen político."},
        ],
    },
    "juan-carlos-escotet": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "De Venezuela a Galicia",
             "contenido": "Banquero de origen venezolano (Banesco), compró la antigua Novagalicia/Banco Etcheverría en la reestructuración de las cajas gallegas y la transformó en Abanca, hoy uno de los grandes bancos regionales con vocación expansiva."},
        ],
        "redes": [
            {"titulo": "Tejido financiero gallego", "contenido": "**Banca de referencia en Galicia** (nota +6/10) — Abanca es pieza central del poder económico gallego, con creciente peso nacional vía adquisiciones."},
        ],
    },
    "alicia-koplowitz": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "Omega Capital y el arte",
             "contenido": "Tras separar su patrimonio del de su hermana Esther y salir de FCC, gestiona su fortuna a través del family office Omega Capital, con inversiones diversificadas, y es una de las grandes coleccionistas y mecenas de arte de España."},
        ],
        "redes": [
            {"titulo": "carlos-slim", "contenido": "**Fin de la era Koplowitz en FCC** (nota -2/10) — La familia Koplowitz dejó el control de FCC, que acabó en manos del mexicano Carlos Slim."},
        ],
    },
    "marta-alvarez": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "Reordenación de El Corte Inglés",
             "contenido": "Asumió la presidencia tras años de pugnas familiares y societarias. Ha pilotado la reducción de deuda, la entrada de socios (catarí, banca) y la monetización de la enorme cartera inmobiliaria del grupo."},
        ],
        "redes": [
            {"titulo": "Gran banca acreedora", "contenido": "**Socios financieros del grupo** (nota +5/10) — La reestructuración acercó El Corte Inglés a la banca y a inversores en su patrimonio inmobiliario."},
        ],
    },
    "hortensia-herrero": {
        "items": [
            {"ap": "trayectoria", "tipo": "evento", "titulo": "Centro de Arte Hortensia Herrero",
             "contenido": "Abrió en Valencia uno de los grandes centros privados de arte contemporáneo de España, rehabilitando un palacio histórico. Su fundación es hoy referente del mecenazgo cultural.",
             "fecha": "2023-11-01"},
        ],
        "redes": [
            {"titulo": "Generalitat Valenciana", "contenido": "**Interlocución cultural** (nota +4/10) — Su mecenazgo la convierte en socia de las instituciones culturales valencianas."},
        ],
    },
    "jose-luis-bonet": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "Freixenet y la marca España",
             "contenido": "Patriarca de Freixenet (hoy en la órbita de la alemana Henkell) y promotor del Foro de Marcas Renombradas, ha sido uno de los grandes embajadores de la internacionalización de la empresa española."},
        ],
        "redes": [
            {"titulo": "Cámaras de comercio territoriales", "contenido": "**Red cameral** (nota +5/10) — Como expresidente de la Cámara de España articuló la representación del comercio exterior con las cámaras territoriales."},
        ],
    },
    "juan-abello": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "Del laboratorio a Torreal",
             "contenido": "Hizo su primera gran fortuna en el sector farmacéutico y la multiplicó con la sociedad de inversión Torreal, presente en sanidad, energía, alimentación y servicios. Reconocido coleccionista de arte."},
        ],
        "redes": [
            {"titulo": "Mercado de M&A español", "contenido": "**Inversor recurrente** (nota +5/10) — Su nombre aparece de forma habitual en operaciones de capital privado y consejos de cotizadas."},
        ],
    },
    "manuel-jove": {
        "items": [
            {"ap": "trayectoria", "tipo": "evento", "titulo": "La venta de Fadesa",
             "contenido": "Vendió la promotora Fadesa en el pico del ciclo inmobiliario, poco antes del estallido de la burbuja, una operación que blindó su patrimonio y financió la diversificación de Inveravante.",
             "fecha": "2007-01-01"},
        ],
        "redes": [
            {"titulo": "Tejido empresarial gallego", "contenido": "**Gran fortuna coruñesa** (nota +5/10) — Junto a Amancio Ortega y otros, forma parte del núcleo de grandes patrimonios de Galicia."},
        ],
    },
    "joseph-oughourlian": {
        "items": [
            {"ap": "trayectoria", "tipo": "evento", "titulo": "La batalla por PRISA",
             "contenido": "Desde Amber Capital protagonizó una larga guerra accionarial por el control de PRISA, desplazando a la vieja guardia y a otros socios como Vivendi/Telefónica, hasta hacerse con la presidencia del grupo.",
             "fecha": "2021-12-01"},
        ],
        "redes": [
            {"titulo": "Gobierno de España", "contenido": "**El control de El País, asunto de Estado** (nota +2/10) — La propiedad y la línea del grupo de El País y la SER son seguidas de cerca por el poder político por su influencia."},
        ],
    },
    "cristina-herrero": {
        "redes": [
            {"titulo": "Congreso de los Diputados", "contenido": "**Comparecencias y control** (nota +3/10) — Sus informes y comparecencias parlamentarias condicionan el debate sobre déficit, deuda y pensiones."},
        ],
    },
    "garrigues": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "Asesor fiscal de las grandes fortunas",
             "contenido": "Además del IBEX, asesora a buena parte de las grandes fortunas y family offices del país en planificación fiscal y sucesoria, lo que lo sitúa en el centro de los debates sobre fiscalidad del patrimonio."},
        ],
        "redes": [
            {"titulo": "Ministerio de Hacienda", "contenido": "**Interlocución técnica y puerta giratoria** (nota +4/10) — El trasvase de inspectores y altos cargos de Hacienda al despacho facilita su conocimiento y diálogo con la Administración tributaria."},
        ],
    },
    "javier-tebas": {
        "items": [
            {"ap": "trayectoria", "tipo": "dato", "titulo": "Guerra a la piratería y la Superliga",
             "contenido": "Ha hecho de la lucha contra la piratería audiovisual y de la oposición frontal a la Superliga sus grandes batallas, defendiendo el modelo de venta centralizada de derechos y el control económico de los clubes."},
        ],
        "redes": [
            {"titulo": "CVC y fondos del fútbol", "contenido": "**Socio financiero de LaLiga** (nota +4/10) — El acuerdo con CVC (LaLiga Impulso) inyectó capital a los clubes a cambio de derechos, operación clave y polémica de su gestión."},
        ],
    },
    "familia-march": {
        "items": [
            {"ap": "identidad", "tipo": "dato", "titulo": "Fundación Juan March",
             "contenido": "Más allá de la banca y la inversión, la familia sostiene la Fundación Juan March, una de las instituciones culturales y científicas privadas más prestigiosas de España, lo que añade poder reputacional al financiero."},
        ],
        "redes": [
            {"titulo": "Mundo cultural y científico", "contenido": "**Mecenazgo de primer nivel** (nota +5/10) — La Fundación Juan March proyecta a la familia en el ámbito cultural, musical y de la investigación."},
        ],
    },
    "funcas": {
        "redes": [
            {"titulo": "cristina-herrero", "contenido": "**Contraste de previsiones con la AIReF** (nota +4/10) — Sus estimaciones macro dialogan con las de la autoridad fiscal y el Banco de España en el consenso económico."},
        ],
    },
    "fundacion-alternativas": {
        "items": [
            {"ap": "identidad", "tipo": "dato", "titulo": "Informe sobre la democracia",
             "contenido": "Su 'Informe sobre la Democracia en España' y sus análisis de cultura y política económica son referencia anual del pensamiento progresista y alimentan el debate público de la izquierda."},
        ],
        "redes": [
            {"titulo": "jose-luis-rodriguez-zapatero", "contenido": "**Sintonía con el socialismo histórico** (nota +4/10) — Su producción intelectual conecta con figuras y gobiernos del PSOE de las últimas décadas."},
        ],
    },
    "grupo-planeta": {
        "items": [
            {"ap": "identidad", "tipo": "dato", "titulo": "Del Premio Planeta a las universidades",
             "contenido": "Además de la edición y el audiovisual, controla un potente negocio de formación y universidades privadas (UNIE, parte de la órbita educativa del grupo) y otorga el Premio Planeta, el más dotado de las letras en español."},
        ],
        "redes": [
            {"titulo": "javier-moll", "contenido": "**Competencia entre grandes editores** (nota -2/10) — Planeta y Prensa Ibérica compiten por audiencia, publicidad y peso en el mercado de medios."},
        ],
    },
    "cuatrecasas": {
        "redes": [
            {"titulo": "uria-menendez", "contenido": "**Rivalidad en el top del Derecho de los negocios** (nota -2/10) — Cuatrecasas y Uría se disputan, con Garrigues, los grandes mandatos del IBEX y la banca."},
        ],
    },
    "uria-menendez": {
        "redes": [
            {"titulo": "cuatrecasas", "contenido": "**Competencia en la cúspide jurídica** (nota -2/10) — Junto a Garrigues, forman el trío de despachos que reparte las grandes operaciones corporativas y financieras."},
        ],
    },
    "alfonso-guerra": {
        "redes": [
            {"titulo": "felipe-gonzalez", "contenido": "**Su histórico compañero y rival** (nota +2/10) — Vicepresidente con Felipe González, su relación combinó alianza fundacional del PSOE moderno y posterior distanciamiento; hoy ambos critican al PSOE de Sánchez."},
        ],
    },
}


def get_or_make_apartado(d: dict, tipo: str) -> dict:
    aps = d.setdefault("apartados", [])
    for a in aps:
        if a.get("tipo") == tipo:
            return a
    nuevo = {"tipo": tipo, "orden": len(aps), "items": []}
    aps.append(nuevo)
    return nuevo


def main() -> int:
    by_slug_file: dict[str, str] = {}
    data_by_file: dict[str, list] = {}
    for f in FILES:
        data_by_file[f] = json.load(open(f, encoding="utf-8"))
        for d in data_by_file[f]:
            by_slug_file[d["slug"]] = f

    touched_files: set[str] = set()
    n_items = n_redes = n_figs = 0
    for slug, enr in ENRICH.items():
        f = by_slug_file.get(slug)
        if not f:
            print(f"  · aviso: slug no encontrado: {slug}")
            continue
        d = next(x for x in data_by_file[f] if x["slug"] == slug)
        changed = False
        for it in enr.get("items", []):
            ap = get_or_make_apartado(d, it["ap"])
            titulos = {x.get("titulo") for x in ap["items"]}
            if it["titulo"] in titulos:
                continue
            new_item = {"tipo": it.get("tipo", "dato"), "titulo": it["titulo"], "contenido": it["contenido"]}
            if it.get("tags"):
                new_item["tags"] = it["tags"]
            if it.get("fecha"):
                new_item["fecha"] = it["fecha"]
            ap["items"].append(new_item)
            n_items += 1
            changed = True
        if enr.get("redes"):
            ap = get_or_make_apartado(d, "redes")
            titulos = {x.get("titulo") for x in ap["items"]}
            for r in enr["redes"]:
                if r["titulo"] in titulos:
                    continue
                ap["items"].append({"tipo": "contacto", "titulo": r["titulo"], "contenido": r["contenido"]})
                n_redes += 1
                changed = True
        if changed:
            cur = d.get("completeness") or 0.6
            d["completeness"] = round(min(0.9, cur + 0.08), 2)
            touched_files.add(f)
            n_figs += 1

    for f in sorted(touched_files):
        json.dump(data_by_file[f], open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"  escrito: {Path(f).name}")

    print(f"OK · {n_figs} figuras enriquecidas · +{n_items} items · +{n_redes} conexiones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
