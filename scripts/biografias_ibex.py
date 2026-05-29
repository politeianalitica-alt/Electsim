#!/usr/bin/env python3
"""scripts/biografias_ibex.py

Igual que biografias_extensas.py pero para los titanes del IBEX (data/ibex35/
*.json): reemplaza 'trayectoria' por una narrativa extensa y enriquece
'identidad'/'posiciones' para llevar su "Quién es" + "Trayectoria" al nivel de
Pedro Sánchez. Tono factual; presunción de inocencia en causas en curso.

Uso:  python3 scripts/biografias_ibex.py && python3 bin/gen_subfixture.py --source ibex35
"""
from __future__ import annotations

import glob
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FILES = sorted(glob.glob(str(REPO / "data" / "ibex35" / "*.json")))

BIOS: dict[str, dict] = {
    "isidre-faine": {
        "perfil": "Isidre Fainé Casas (Manresa, Barcelona, 1942) es presidente de la Fundación bancaria «la Caixa» y de su holding CriteriaCaixa, el mayor inversor institucional de capital español. Desde ahí controla la participación de referencia en CaixaBank y paquetes decisivos en Naturgy y Telefónica. Es uno de los hombres con más poder económico discreto del país.",
        "trayectoria": [
            ("De la banca a la cúpula de La Caixa", "Doctor en Economía, hizo carrera en la banca catalana hasta llegar a la dirección general y la presidencia de La Caixa, la mayor caja de ahorros de España, a la que pilotó durante la expansión previa a la crisis.", "2007-06-01"),
            ("La transformación en CaixaBank", "Lideró la reconversión de la caja en el grupo bancario CaixaBank y, tras la reforma de las cajas, en la estructura Fundación «la Caixa» → CriteriaCaixa → participadas, que blinda el control catalán sobre un imperio financiero e industrial.", "2014-06-01"),
            ("El mayor inversor institucional español", "Como presidente de CriteriaCaixa gestiona una cartera multimillonaria con participaciones de control o influencia en CaixaBank, Naturgy y Telefónica, además de inmobiliario y deuda, lo que le da peso decisivo en los consejos del IBEX.", ""),
        ],
    },
    "antonio-garamendi": {
        "perfil": "Antonio Garamendi Lecanda (Getxo, Bizkaia, 1958) es presidente de la CEOE, la gran patronal española, y por tanto el principal interlocutor empresarial del Gobierno y de los sindicatos en el diálogo social. Su voz representa a las grandes corporaciones del IBEX y a miles de pymes en la negociación de salarios, reforma laboral y pensiones.",
        "trayectoria": [
            ("Empresario y dirigente patronal", "Empresario vasco con intereses en distintos sectores, escaló en la representación empresarial: presidió la patronal de autónomos (ATA) y CEPYME antes de dar el salto a la cúpula de la confederación.", "2014-01-01"),
            ("Presidente de la CEOE", "Preside la CEOE desde 2018, reelegido para un nuevo mandato. Pilota la posición empresarial en la subida del SMI, la reforma laboral y las pensiones, alternando la firma de acuerdos con el descuelgue cuando lo cree necesario.", "2018-11-22"),
            ("El interlocutor del capital", "Su valor es la representación unificada del gran empresariado ante la Moncloa, los sindicatos y Bruselas, en una relación pragmática pero tensa con el Gobierno de coalición por la fiscalidad y la regulación.", ""),
        ],
    },
    "florentino-perez": {
        "perfil": "Florentino Pérez (Madrid, 1947) es presidente de ACS, el mayor grupo constructor del mundo por ingresos, y presidente del Real Madrid. Ingeniero de Caminos, combina un poder económico de primer orden con el liderazgo del club de fútbol más influyente del planeta, lo que lo convierte en una figura de poder doble, empresarial y mediático.",
        "trayectoria": [
            ("De la política a la construcción", "Ingeniero de Caminos, pasó por la administración y la política (UCD) antes de volcarse en la empresa, tomando el control de una constructora que, mediante fusiones (OCP, Dragados), convirtió en ACS.", "1997-01-01"),
            ("ACS, gigante global", "Bajo su mando, ACS se expandió internacionalmente (Hochtief, Cimic) hasta liderar la construcción mundial de infraestructuras y concesiones, con fuerte presencia en EE. UU. y Australia.", "2000-01-01"),
            ("El Real Madrid y la Superliga", "Presidente del Real Madrid en dos etapas (desde 2009 de forma continuada), ha hecho del club una potencia deportiva y económica y ha liderado el proyecto de la Superliga europea, en pulso con la UEFA y LaLiga.", "2009-06-01"),
        ],
    },
    "ana-botin": {
        "perfil": "Ana Botín (Santander, 1960) es presidenta ejecutiva del Banco Santander, el mayor banco de España y uno de los mayores de la eurozona. Cuarta generación de la saga Botín al frente de la entidad, es una de las banqueras más poderosas del mundo y una voz de referencia del capitalismo español en los foros globales.",
        "trayectoria": [
            ("De JP Morgan a Banesto", "Formada en Harvard y curtida en JP Morgan, se incorporó al Santander y dirigió Banesto, donde se foguéo como gestora antes de dar el salto internacional.", "2002-01-01"),
            ("Santander UK y el salto a la presidencia", "Dirigió con éxito la filial británica del banco (Santander UK) y, tras el fallecimiento de su padre Emilio Botín en 2014, asumió la presidencia ejecutiva del grupo.", "2014-09-10"),
            ("Liderazgo global", "Ha pilotado la digitalización del banco, su expansión en América y Europa y su presencia en los grandes foros (Davos, banca europea), erigiéndose en portavoz informal del sector financiero español.", ""),
        ],
    },
    "amancio-ortega": {
        "perfil": "Amancio Ortega (Busdongo, León, 1936) es el fundador de Inditex (Zara) y el hombre más rico de España, una de las mayores fortunas del mundo. Creador del modelo de «moda rápida», construyó desde Galicia un imperio textil global y hoy diversifica su patrimonio en una de las mayores carteras inmobiliarias del planeta a través de Pontegadea.",
        "trayectoria": [
            ("De dependiente a Zara", "Hijo de un ferroviario, empezó como dependiente y repartidor en A Coruña. En 1975 abrió la primera tienda Zara, sobre la que construyó un nuevo modelo de producción y distribución textil de respuesta rápida.", "1975-01-01"),
            ("Inditex, imperio global", "Agrupó sus marcas (Zara, Massimo Dutti, Pull&Bear, Bershka…) en Inditex, que sacó a bolsa en 2001 y convirtió en el mayor grupo textil del mundo, con miles de tiendas en todo el planeta.", "2001-05-23"),
            ("Pontegadea y el ladrillo", "Retirado de la gestión (que dejó en manos de Pablo Isla y luego de su hija Marta Ortega), invierte los dividendos de Inditex a través de Pontegadea en inmuebles emblemáticos (oficinas, logística, energía) en las grandes capitales del mundo.", "2011-01-01"),
        ],
    },
}


def get_or_make(d: dict, tipo: str, orden_hint: int) -> dict:
    aps = d.setdefault("apartados", [])
    for a in aps:
        if a.get("tipo") == tipo:
            return a
    nuevo = {"tipo": tipo, "orden": orden_hint, "items": []}
    aps.append(nuevo)
    return nuevo


def main() -> int:
    data_by_file = {f: json.load(open(f, encoding="utf-8")) for f in FILES}
    slug_file = {}
    for f, lst in data_by_file.items():
        for d in lst:
            if isinstance(d, dict) and "slug" in d:
                slug_file[d["slug"]] = f

    touched, n = set(), 0
    for slug, bio in BIOS.items():
        f = slug_file.get(slug)
        if not f:
            print(f"  · aviso: no encontrado {slug}")
            continue
        d = next(x for x in data_by_file[f] if x.get("slug") == slug)
        if bio.get("perfil"):
            ident = get_or_make(d, "identidad", 0)
            if ident["items"]:
                ident["items"][0]["contenido"] = bio["perfil"]
            else:
                ident["items"].append({"tipo": "dato", "titulo": "Perfil", "contenido": bio["perfil"]})
        tray = get_or_make(d, "trayectoria", 1)
        tray["items"] = []
        for tup in bio.get("trayectoria", []):
            item = {"tipo": "evento", "titulo": tup[0], "contenido": tup[1]}
            if len(tup) > 2 and tup[2]:
                item["fecha"] = tup[2]
            tray["items"].append(item)
            n += 1
        d["completeness"] = 0.95
        touched.add(f)

    for f in sorted(touched):
        json.dump(data_by_file[f], open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"  escrito: {Path(f).name}")
    print(f"OK · {len([s for s in BIOS if slug_file.get(s)])} biografías IBEX · {n} secciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
