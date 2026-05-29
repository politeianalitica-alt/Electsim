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
    "ignacio-sanchez-galan": {
        "perfil": "Ignacio Sánchez Galán (Salamanca, 1950) es presidente ejecutivo de Iberdrola, la mayor eléctrica española y una de las grandes utilities del mundo por capitalización bursátil. Ingeniero, ha pilotado durante más de dos décadas la transformación de la compañía en un gigante global de las energías renovables y las redes de distribución, con fuerte presencia en Reino Unido, Estados Unidos, Brasil y México.",
        "trayectoria": [
            ("Ingeniero y gestor industrial", "Ingeniero técnico industrial por la Universidad Pontificia de Comillas (ICAI), con formación en administración de empresas, hizo carrera directiva en compañías industriales —entre ellas Industria de Turbo Propulsores y la operadora de telefonía Airtel— antes de dar el salto al sector eléctrico.", "1990-01-01"),
            ("Al frente de Iberdrola", "Llegó a Iberdrola como consejero delegado en 2001 y poco después asumió la presidencia ejecutiva. Apostó tempranamente por la energía eólica y por las redes, anticipándose a la transición energética cuando las renovables eran aún una opción minoritaria en el sector.", "2001-05-25"),
            ("Expansión global y renovables", "Bajo su mando, Iberdrola adquirió ScottishPower en Reino Unido, Energy East/Avangrid en Estados Unidos y Neoenergia en Brasil, multiplicando su tamaño y diversificando ingresos en geografías reguladas. La compañía se ha situado entre los líderes mundiales en eólica marina e inversión en redes, alcanzando en distintos momentos la mayor capitalización del IBEX 35.", "2007-04-01"),
        ],
    },
    "marc-murtra": {
        "perfil": "Marc Murtra (1972) es presidente de Telefónica, la mayor operadora de telecomunicaciones española y un activo considerado estratégico por el Estado. Ingeniero industrial y economista, llegó a la presidencia en enero de 2025 tras el refuerzo del peso público en el capital, después de haber presidido la tecnológica de defensa Indra.",
        "trayectoria": [
            ("Formación e inicios", "Ingeniero industrial y economista con formación internacional, desarrolló su carrera entre la consultoría, la empresa industrial y la gestión de participadas, con un interés marcado por la política industrial y tecnológica del país.", "2000-01-01"),
            ("Presidente de Indra", "En 2021 fue nombrado presidente de Indra a propuesta de la SEPI, el holding público que es primer accionista de la tecnológica. Pilotó su giro hacia la defensa y la consolidación del sector en un contexto de aumento del gasto militar europeo.", "2021-01-22"),
            ("Presidente de Telefónica", "En enero de 2025 sustituyó a José María Álvarez-Pallete al frente de Telefónica, después de que la SEPI se convirtiera en uno de los mayores accionistas de la operadora —junto a la saudí STC y CriteriaCaixa—, en una operación que reforzó el control nacional sobre una infraestructura estratégica.", "2025-01-18"),
        ],
    },
    "jose-bogas": {
        "perfil": "José Bogas Gálvez es consejero delegado de Endesa, la mayor eléctrica de España por número de clientes, controlada por la italiana Enel. Ingeniero con casi toda su carrera profesional ligada a la compañía, dirige el día a día del grupo en plena transición desde el carbón hacia las renovables y la electrificación de la demanda.",
        "trayectoria": [
            ("Carrera en Endesa", "Ingeniero, desarrolló su trayectoria en distintas áreas de Endesa —generación, negocio internacional y mercados liberalizados—, lo que le dio un conocimiento profundo del negocio eléctrico antes de acceder a la primera línea ejecutiva.", "1990-01-01"),
            ("Consejero delegado", "Asumió la dirección general/consejería delegada de Endesa en 2014, ya bajo control del grupo italiano Enel, asumiendo la gestión ordinaria de la compañía y su relación con el accionista de referencia.", "2014-10-01"),
            ("Cierre del carbón y renovables", "Ha pilotado el cierre de las centrales de carbón y la apuesta por la generación renovable, las redes de distribución y la comercialización, en un sector marcado por la volatilidad de los precios y la regulación energética europea.", "2019-01-01"),
        ],
    },
    "francisco-reynes": {
        "perfil": "Francisco Reynés (1963) es presidente ejecutivo de Naturgy, la mayor gasista española y una de sus grandes eléctricas, participada por CriteriaCaixa y por fondos internacionales. Ingeniero de Caminos, llegó a la energética tras dirigir el grupo de autopistas Abertis, y ha protagonizado los sucesivos planes estratégicos y movimientos accionariales del grupo.",
        "trayectoria": [
            ("De la banca de inversión a la gestión", "Ingeniero de Caminos con formación en administración de empresas, desarrolló su carrera entre las finanzas corporativas y la gestión de infraestructuras, vinculándose al perímetro empresarial de La Caixa.", "1995-01-01"),
            ("Consejero delegado de Abertis", "Dirigió durante años el grupo de concesiones de autopistas Abertis, expandiéndolo internacionalmente, hasta su venta y troceo entre ACS-Hochtief y la italiana Atlantia.", "2009-01-01"),
            ("Presidente de Naturgy", "En 2018 asumió la presidencia ejecutiva de Naturgy (antes Gas Natural Fenosa), donde ha pilotado planes de eficiencia, la rotación de accionistas —con la entrada del fondo IFM y la OPA fallida y posteriores movimientos— y el reparto entre dividendo e inversión en transición energética.", "2018-02-06"),
        ],
    },
    "rafael-del-pino-calvo-sotelo": {
        "perfil": "Rafael del Pino y Calvo-Sotelo (Madrid, 1958) es presidente de Ferrovial, una de las mayores constructoras y operadoras de infraestructuras del mundo. Ingeniero de Caminos formado también en EE. UU., heredó el liderazgo del grupo fundado por su padre y lo convirtió en una multinacional de concesiones de autopistas y aeropuertos, una de las mayores fortunas de España.",
        "trayectoria": [
            ("Formación e ingreso en la empresa familiar", "Ingeniero de Caminos con un MBA por el MIT, se incorporó a la constructora fundada por su padre, Rafael del Pino y Moreno, donde fue asumiendo responsabilidades crecientes hasta tomar las riendas del grupo.", "1992-01-01"),
            ("Internacionalización de Ferrovial", "Bajo su mando, Ferrovial viró del negocio puramente constructor al de concesionario y operador de infraestructuras, con activos emblemáticos como la autopista 407 ETR en Canadá y el aeropuerto de Heathrow en Londres, y una fuerte implantación en EE. UU.", "2000-01-01"),
            ("Traslado de la sede a Países Bajos", "En 2023 lideró el traslado del domicilio social de Ferrovial a los Países Bajos, con vistas a cotizar también en EE. UU., una decisión que generó un agrio choque político con el Gobierno por su lectura como una fuga fiscal y de prestigio empresarial.", "2023-04-13"),
        ],
    },
    "jose-manuel-entrecanales": {
        "perfil": "José Manuel Entrecanales Domecq (Madrid, 1963) es presidente de Acciona, grupo familiar de infraestructuras, energía y servicios convertido en uno de los grandes referentes mundiales de las renovables. Nieto del fundador, transformó la antigua constructora en una compañía centrada en la sostenibilidad y sacó a bolsa su filial verde, Acciona Energía.",
        "trayectoria": [
            ("De la banca a la empresa familiar", "Tras formarse y pasar por la banca de inversión, se incorporó al grupo familiar (entonces en torno a la constructora Entrecanales y Távora) y lideró su reordenación bajo la marca Acciona.", "1992-01-01"),
            ("Apuesta por las renovables", "Anticipó la apuesta por la energía eólica y la sostenibilidad como eje estratégico, posicionando a Acciona como pionera mundial en renovables y desarrollo de infraestructuras de agua y transporte.", "2004-01-01"),
            ("Salida a bolsa de Acciona Energía", "En 2021 sacó a bolsa Acciona Energía, una de las mayores OPV del año en España, para financiar el crecimiento del negocio verde y poner en valor unos activos renovables que el mercado no reconocía dentro del holding.", "2021-07-01"),
        ],
    },
    "antonio-brufau": {
        "perfil": "Antonio Brufau Niubó (Mont-roig del Camp, Tarragona, 1948) es presidente de Repsol, la mayor petrolera y compañía multienergética española. Economista de formación y procedente del perímetro de La Caixa, ha presidido el grupo durante dos décadas, pilotando su transformación desde la petrolera tradicional hacia un modelo multienergético con objetivo de descarbonización.",
        "trayectoria": [
            ("De Arthur Andersen a La Caixa", "Economista y censor jurado de cuentas, desarrolló su carrera entre la auditoría (Arthur Andersen) y el grupo La Caixa, donde llegó a la dirección general antes de asumir la presidencia de Gas Natural.", "1988-01-01"),
            ("Presidente de Gas Natural", "Dirigió Gas Natural, impulsando su crecimiento en el negocio gasista y eléctrico, lo que le dio el peso y la experiencia para dar el salto a la petrolera de referencia del país.", "1997-01-01"),
            ("Presidente de Repsol", "Preside Repsol desde 2004. Gestionó episodios críticos como la expropiación de YPF por Argentina en 2012 y ha orientado al grupo hacia un modelo multienergético —química, renovables, combustibles renovables y movilidad— con el objetivo declarado de cero emisiones netas en 2050.", "2004-10-19"),
        ],
    },
    "josep-oliu": {
        "perfil": "Josep Oliu Creus (Sabadell, 1949) es presidente de Banco Sabadell, una de las grandes entidades financieras españolas. Economista con doctorado en EE. UU., ha encarnado durante décadas el crecimiento del banco mediante adquisiciones y ha sido figura central en la defensa de su independencia frente a la OPA hostil del BBVA.",
        "trayectoria": [
            ("Economista y vuelta al banco familiar", "Doctor en Economía por la Universidad de Minnesota y profesor universitario, se incorporó al Banco Sabadell —ligado a su familia— donde fue escalando hasta la presidencia.", "1990-01-01"),
            ("Crecimiento por adquisiciones", "Bajo su mando, el Sabadell creció absorbiendo entidades como Banco Herrero, Banco Guipuzcoano y la CAM, y dio el salto internacional con la compra del británico TSB, hasta consolidarse como cuarto banco del país.", "2004-01-01"),
            ("La OPA del BBVA", "Desde 2024 lideró la respuesta del consejo a la OPA hostil lanzada por el BBVA, defendiendo el proyecto en solitario del Sabadell, la venta de TSB y el reparto de dividendos como alternativa de valor para los accionistas frente a la fusión.", "2024-05-09"),
        ],
    },
    "gonzalo-gortazar": {
        "perfil": "Gonzalo Gortázar Rotaeche (1965) es consejero delegado de CaixaBank, el mayor banco por activos en el mercado doméstico español tras su fusión con Bankia. Ingeniero y MBA con experiencia en banca de inversión internacional, dirige la gestión ordinaria del grupo en el que CriteriaCaixa es accionista de referencia.",
        "trayectoria": [
            ("Banca de inversión internacional", "Formado como ingeniero y MBA, trabajó en banca de inversión (Morgan Stanley, Bank of America) antes de incorporarse al perímetro de La Caixa, donde dirigió Criteria y la actividad financiera del grupo.", "1993-01-01"),
            ("Consejero delegado de CaixaBank", "Asumió la consejería delegada de CaixaBank, encargándose de la gestión diaria del banco y de su estrategia comercial, digital y de rentabilidad bajo la presidencia primero de Fainé y luego de Goirigolzarri.", "2014-06-26"),
            ("La fusión con Bankia", "Pilotó en 2021 la integración de Bankia en CaixaBank, la mayor operación bancaria de la historia reciente de España, que situó al grupo como líder doméstico por cuota en crédito, depósitos y seguros.", "2021-03-26"),
        ],
    },
    "onur-genc": {
        "perfil": "Onur Genç es consejero delegado de BBVA, el segundo banco español por tamaño y uno de los mayores de la eurozona, con fuerte presencia en México, Turquía y América del Sur. De origen turco y con formación internacional, dirige la gestión del grupo y ha liderado la ofensiva del banco para hacerse con el Sabadell.",
        "trayectoria": [
            ("De la consultoría a la banca", "Formado en ingeniería y con un MBA por la Carnegie Mellon, trabajó en la consultoría estratégica (McKinsey) antes de incorporarse al sector bancario, donde desarrolló su carrera en mercados emergentes.", "2000-01-01"),
            ("CEO de Garanti", "Dirigió Garanti BBVA, la filial turca del grupo, uno de sus mercados más rentables y a la vez más expuestos a la volatilidad macroeconómica, lo que le dio proyección dentro del banco.", "2017-01-01"),
            ("Consejero delegado de BBVA y la OPA al Sabadell", "Como consejero delegado del grupo desde 2018-2019, junto al presidente Carlos Torres, lideró desde 2024 la OPA sobre el Banco Sabadell, una operación que aspiraba a crear un gigante bancario y que marcó el pulso del sector financiero español.", "2019-01-01"),
        ],
    },
    "antonio-huertas": {
        "perfil": "Antonio Huertas Mejías es presidente de Mapfre, la mayor aseguradora española y un grupo con fuerte implantación en Latinoamérica. Procedente de la propia compañía, dirige el grupo controlado por la Fundación Mapfre y ha impulsado su diversificación geográfica y su discurso sobre longevidad, reaseguro y sostenibilidad.",
        "trayectoria": [
            ("Carrera dentro de Mapfre", "Desarrolló prácticamente toda su trayectoria profesional dentro de Mapfre, pasando por distintas direcciones territoriales y de negocio, lo que le dio un conocimiento detallado de la aseguradora antes de acceder a la presidencia.", "1988-01-01"),
            ("Presidente del grupo", "Asumió la presidencia de Mapfre en 2012, sucediendo a José Manuel Martínez, con el control del grupo en manos de la Fundación Mapfre, su accionista mayoritario.", "2012-03-10"),
            ("Diversificación internacional", "Ha pilotado el peso creciente de Latinoamérica, Estados Unidos y el negocio de reaseguro en la cuenta del grupo, junto a una agenda pública sobre el reto demográfico, el ahorro para la jubilación y la sostenibilidad del seguro.", "2015-01-01"),
        ],
    },
    "beatriz-corredor": {
        "perfil": "Beatriz Corredor Sierra (Madrid, 1968) es presidenta de Redeia (matriz de Red Eléctrica), el operador del sistema eléctrico español, una infraestructura crítica de titularidad mayoritariamente pública a través de la SEPI. Registradora de la propiedad y exministra socialista de Vivienda, dirige la compañía responsable del transporte de electricidad y la operación de la red.",
        "trayectoria": [
            ("Registradora y política", "Registradora de la propiedad de profesión, dio el salto a la política en el PSOE, ocupando un escaño y responsabilidades en el área de vivienda y suelo.", "2004-01-01"),
            ("Ministra de Vivienda", "Fue ministra de Vivienda entre 2008 y 2010 con José Luis Rodríguez Zapatero, en plena crisis del ladrillo, y después secretaria de Estado, gestionando el desplome del sector inmobiliario.", "2008-04-14"),
            ("Presidenta de Redeia", "En 2020 asumió la presidencia de Red Eléctrica/Redeia. Le ha correspondido pilotar la integración de las renovables en el sistema y el operador quedó bajo el foco tras el gran apagón del 28 de abril de 2025, cuyas causas fueron objeto de investigación oficial.", "2020-02-14"),
        ],
    },
    "maurici-lucena": {
        "perfil": "Maurici Lucena Betriu es presidente y consejero delegado de Aena, el primer operador aeroportuario del mundo por número de pasajeros y una compañía cotizada controlada por el Estado a través de Enaire. Economista y exparlamentario socialista catalán, dirige la gestión de la red de aeropuertos españoles y sus planes de inversión y tarifas.",
        "trayectoria": [
            ("Economista y gestión pública", "Economista de formación, combinó la actividad profesional con la gestión pública, incluida la dirección del Centro para el Desarrollo Tecnológico Industrial (CDTI), agencia estatal de innovación.", "2004-01-01"),
            ("Política en Cataluña", "Fue diputado en el Parlament de Cataluña por el PSC, con responsabilidades en política económica, antes de regresar a la gestión de empresas y organismos públicos.", "2010-01-01"),
            ("Presidente de Aena", "Preside Aena desde 2018. Ha gestionado el desplome y la posterior recuperación récord del tráfico aéreo tras la pandemia, el debate sobre la ampliación del aeropuerto de Barcelona-El Prat y el marco regulado de tarifas aeroportuarias (DORA).", "2018-12-04"),
        ],
    },
    "pablo-isla": {
        "perfil": "Pablo Isla Álvarez de Tejera (Madrid, 1964) es uno de los gestores españoles más reconocidos internacionalmente, conocido por su etapa al frente de Inditex (Zara). Abogado del Estado, presidió el gigante textil durante su gran expansión global y digital, y posteriormente se incorporó a consejos de multinacionales como Nestlé.",
        "trayectoria": [
            ("Abogado del Estado y directivo", "Abogado del Estado, ocupó cargos en la administración y dirigió áreas jurídicas y de gestión en empresas como el Banco Popular y la tabacalera Altadis antes de su salto a Inditex.", "1998-01-01"),
            ("Presidente ejecutivo de Inditex", "Tomó el relevo de Amancio Ortega como presidente ejecutivo de Inditex y lideró durante más de una década la expansión internacional del grupo, la integración de tienda física y online y su reconocimiento como uno de los mejores CEO del mundo según rankings internacionales.", "2011-07-19"),
            ("Salida y nuevos consejos", "Dejó la presidencia de Inditex en 2022, dando paso a Marta Ortega, y orientó su actividad hacia los consejos de grandes multinacionales —entre ellas la suiza Nestlé— y la inversión, manteniéndose como referente de la alta gestión española.", "2022-04-01"),
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
