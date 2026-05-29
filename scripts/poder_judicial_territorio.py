#!/usr/bin/env python3
"""scripts/poder_judicial_territorio.py

Dosieres detallados (~190-230 palabras) de la cúpula judicial y de expresidentes
autonómicos / cargos territoriales de peso. Los nuevos van a
data/poder/figuras_clave_10.json (fuente "poder"). Teresa Ribera, que ya existe
en data/ibex35/conexos.json, se enriquece in situ.

Tono factual; fuentes públicas; presunción de inocencia en causas. Roster mayo 2026.

Uso:  python3 scripts/poder_judicial_territorio.py \
      && python3 bin/gen_subfixture.py --source poder \
      && python3 bin/gen_subfixture.py --source ibex35
"""
from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "poder" / "figuras_clave_10.json"
CONEXOS = REPO / "data" / "ibex35" / "conexos.json"

FIG: dict[str, dict] = {
    "manuel-marchena": {
        "cargo": "Magistrado del Tribunal Supremo", "partido": "judicatura", "ctag": "judicatura",
        "fuente": "https://www.poderjudicial.es", "nombre": "Manuel Marchena Gómez", "alias": "Manuel Marchena",
        "corta": "Magistrado del Tribunal Supremo; presidió el tribunal del juicio del procés (2019).",
        "perfil": "Manuel Marchena Gómez (Las Palmas de Gran Canaria, 1959) es magistrado del Tribunal Supremo y uno de los jueces más influyentes y conocidos de España. Presidente de la Sala de lo Penal del Supremo, presidió el tribunal que juzgó a los líderes del procés en 2019, dictando las condenas por sedición y malversación. Su nombre saltó a la primera plana en 2018 por un mensaje del senador del PP Ignacio Cosidó que presumía de «controlar la Sala Segunda desde detrás», lo que le llevó a renunciar a presidir el Consejo General del Poder Judicial. Encarna el peso —y la politización— de la cúpula judicial.",
        "tray": [
            ("Fiscal y magistrado", "Procedente de la carrera fiscal y judicial, ascendió hasta el Tribunal Supremo, donde se especializó en lo penal y llegó a presidir su Sala Segunda (de lo Penal).", "2007-01-01"),
            ("El frustrado salto al CGPJ", "En 2018 fue el candidato pactado por PP y PSOE para presidir el Tribunal Supremo y el CGPJ, pero renunció tras filtrarse el mensaje del PP que presumía de «controlar» la Sala Penal, en un sonado escándalo institucional.", "2018-11-19"),
            ("El juicio del procés", "Presidió el tribunal del Supremo que juzgó a los líderes del procés independentista, dictando en 2019 las condenas por sedición y malversación, en uno de los juicios más mediáticos de la democracia.", "2019-10-14"),
            ("Referente de la Sala Penal", "Sigue siendo una figura de referencia de la cúpula judicial, en un periodo de fuerte tensión entre poderes y de debate sobre la independencia y la renovación de los órganos judiciales.", "2023-01-01"),
        ],
        "pos": ("Cúpula judicial y tensión política", "Encarna el peso de la alta judicatura en los grandes conflictos políticos del país; visto por unos como garante de la ley y por otros como exponente de la politización de la Sala Penal.", ["judicatura", "tribunal-supremo"]),
        "redes": [("Carles Puigdemont", "**Líder de Junts** (nota -6/10) — Presidió el tribunal del Supremo que juzgó el procés, causa de la que Puigdemont huyó al extranjero.", ["judicatura", "nota--6", "procesal"])],
    },
    "pablo-llarena": {
        "cargo": "Magistrado instructor del Tribunal Supremo", "partido": "judicatura", "ctag": "judicatura",
        "fuente": "https://www.poderjudicial.es", "nombre": "Pablo Llarena Conde", "alias": "Pablo Llarena",
        "corta": "Magistrado del Tribunal Supremo; instructor de la causa del procés y de las euroórdenes contra Puigdemont.",
        "perfil": "Pablo Llarena Conde (San Sebastián, 1962) es magistrado del Tribunal Supremo, conocido por ser el instructor de la causa del procés independentista catalán. Como juez instructor, dictó las euroórdenes y órdenes de detención contra Carles Puigdemont y los dirigentes huidos al extranjero, protagonizando un largo pulso con la justicia belga y alemana sobre su entrega. Es una de las figuras centrales —y más controvertidas— de la respuesta judicial al desafío independentista, y la aplicación de la ley de amnistía al delito de malversación lo ha vuelto a situar en el foco del conflicto entre justicia y política.",
        "tray": [
            ("Carrera judicial", "Juez de carrera, desarrolló su trayectoria en distintos órganos hasta llegar al Tribunal Supremo, donde fue además vocal del Consejo General del Poder Judicial.", "2000-01-01"),
            ("Instructor del procés", "Asumió la instrucción de la causa del procés en el Tribunal Supremo, procesando a los líderes independentistas por rebelión, sedición y malversación.", "2017-11-01"),
            ("La batalla de las euroórdenes", "Dictó las órdenes de detención y entrega contra Puigdemont y los huidos, en un largo y accidentado pulso con los tribunales belgas y alemanes que evidenció las dificultades de la cooperación judicial europea.", "2018-03-23"),
            ("La amnistía y la malversación", "Tras la ley de amnistía de 2024, mantuvo una interpretación restrictiva sobre su aplicación al delito de malversación de Puigdemont y otros, prolongando la batalla jurídica.", "2024-07-01"),
        ],
        "pos": ("Respuesta judicial al procés", "Encarna la respuesta judicial firme al desafío independentista; visto como garante de la ley por unos y como obstáculo a la «desjudicialización» por otros.", ["judicatura", "tribunal-supremo"]),
        "redes": [("Carles Puigdemont", "**Líder de Junts** (nota -7/10) — Instruye su causa y dictó las euroórdenes; choque jurídico permanente, agravado por la amnistía.", ["judicatura", "nota--7", "procesal"])],
    },
    "carlos-lesmes": {
        "cargo": "Expresidente del Tribunal Supremo y del CGPJ", "partido": "judicatura", "ctag": "judicatura",
        "fuente": "https://www.poderjudicial.es", "nombre": "Carlos Lesmes Serrano", "alias": "Carlos Lesmes",
        "corta": "Presidió el Tribunal Supremo y el CGPJ (2013-2022); dimitió denunciando el bloqueo en la renovación del órgano.",
        "perfil": "Carlos Lesmes Serrano (Madrid, 1958) fue presidente del Tribunal Supremo y del Consejo General del Poder Judicial entre 2013 y 2022, la máxima autoridad del poder judicial durante casi una década. Magistrado de carrera y exalto cargo del Ministerio de Justicia con gobiernos del PP, dimitió en 2022 en un gesto sin precedentes para denunciar el bloqueo en la renovación del CGPJ, que llevaba más de tres años caducado por la falta de acuerdo entre el PSOE y el PP. Su marcha simbolizó la crisis del gobierno de los jueces.",
        "tray": [
            ("Magistrado y alto cargo", "Magistrado de lo contencioso-administrativo, fue director general de Relaciones con la Administración de Justicia con gobiernos del PP antes de regresar a la carrera y llegar al Tribunal Supremo.", "1996-01-01"),
            ("Presidente del TS y del CGPJ", "En 2013 fue elegido presidente del Tribunal Supremo y del Consejo General del Poder Judicial, al frente del poder judicial en una etapa de fuerte tensión política.", "2013-12-09"),
            ("El bloqueo del CGPJ", "Su mandato quedó marcado por el bloqueo en la renovación del CGPJ desde 2018, con el órgano caducado durante años por la falta de acuerdo entre los grandes partidos.", "2018-12-04"),
            ("La dimisión", "En octubre de 2022 dimitió en un gesto sin precedentes, denunciando la dejación de los políticos y la situación insostenible del órgano caducado, lo que aceleró —dos años después— el desbloqueo de la renovación.", "2022-10-09"),
        ],
        "pos": ("Independencia y crisis del CGPJ", "Defendió la independencia judicial y denunció la instrumentalización política del gobierno de los jueces; su dimisión es un símbolo de la crisis institucional del poder judicial.", ["judicatura", "cgpj"]),
    },
    "juan-carlos-campo": {
        "cargo": "Magistrado del Tribunal Constitucional", "partido": "judicatura", "ctag": "judicatura",
        "fuente": "https://www.tribunalconstitucional.es", "nombre": "Juan Carlos Campo Moreno", "alias": "Juan Carlos Campo",
        "corta": "Magistrado del Tribunal Constitucional y exministro de Justicia de Sánchez.",
        "perfil": "Juan Carlos Campo Moreno (Osuna, Sevilla, 1961) es magistrado del Tribunal Constitucional desde 2023 y exministro de Justicia. Juez de carrera con larga trayectoria, fue secretario de Estado y vocal del CGPJ, y ejerció de ministro de Justicia en el Gobierno de Pedro Sánchez (2020-2021), donde pilotó reformas legales y la preparación de los indultos a los líderes del procés. Su salto del Ejecutivo al Tribunal Constitucional, a propuesta del Gobierno, fue criticado por la oposición como ejemplo de la politización del órgano de garantías, un debate recurrente en la justicia española.",
        "tray": [
            ("Juez y alto cargo", "Juez de carrera, ocupó responsabilidades en el CGPJ y como secretario de Estado de Justicia, combinando la judicatura con la gestión.", "2009-01-01"),
            ("Ministro de Justicia", "Fue ministro de Justicia en el Gobierno de Pedro Sánchez entre 2020 y 2021, pilotando reformas legales y la preparación de los indultos a los líderes del procés.", "2020-01-13"),
            ("Magistrado del Constitucional", "En 2023 fue nombrado magistrado del Tribunal Constitucional a propuesta del Gobierno, en la renovación que dio mayoría al bloque progresista.", "2023-01-09"),
            ("Debate sobre la politización", "Su salto del Ejecutivo al TC fue criticado por la oposición como muestra de la politización del órgano, en un debate recurrente sobre la independencia de la justicia.", "2023-01-09"),
        ],
        "pos": ("Garantías y politización del TC", "Como magistrado del Constitucional participa en resoluciones de gran calado político; su trayectoria alimenta el debate sobre la frontera entre política y justicia.", ["judicatura", "tribunal-constitucional"]),
    },
    "maria-luisa-balaguer": {
        "cargo": "Magistrada del Tribunal Constitucional", "partido": "judicatura", "ctag": "judicatura",
        "fuente": "https://www.tribunalconstitucional.es", "nombre": "María Luisa Balaguer Callejón", "alias": "María Luisa Balaguer",
        "corta": "Magistrada del Tribunal Constitucional; catedrática y voz del sector progresista en derechos fundamentales.",
        "perfil": "María Luisa Balaguer Callejón (Granada, 1953) es magistrada del Tribunal Constitucional, una de las juristas de referencia del bloque progresista del órgano. Catedrática de Derecho Constitucional, llegó al Tribunal Constitucional en 2017 a propuesta del Senado, y es conocida por sus posiciones avanzadas en materia de derechos fundamentales, igualdad y feminismo, reflejadas en ponencias y votos particulares en asuntos como el aborto o la violencia de género. Encarna el perfil académico y garantista dentro de un tribunal cuya composición es objeto de permanente disputa política entre los bloques. Su voz figura entre las que han marcado la jurisprudencia reciente del tribunal en materia de derechos, en un periodo de máxima exposición pública del órgano de garantías.",
        "tray": [
            ("Catedrática de Derecho Constitucional", "Catedrática de Derecho Constitucional, desarrolló una larga carrera académica especializada en derechos fundamentales, igualdad y comunicación audiovisual.", "1990-01-01"),
            ("Magistrada del Tribunal Constitucional", "En 2017 fue elegida magistrada del Tribunal Constitucional a propuesta del Senado, integrándose en el sector progresista del órgano.", "2017-03-01"),
            ("Derechos y feminismo", "Es conocida por sus posiciones avanzadas en derechos fundamentales, igualdad de género y feminismo, reflejadas en ponencias y votos particulares.", "2020-01-01"),
            ("Perfil garantista", "Encarna el perfil académico y garantista del tribunal, en un órgano cuya composición y resoluciones son objeto de permanente disputa entre los bloques políticos.", "2023-01-01"),
        ],
        "pos": ("Garantismo y derechos fundamentales", "Defiende una interpretación avanzada de los derechos fundamentales y la igualdad, en el sector progresista del Tribunal Constitucional.", ["judicatura", "tribunal-constitucional"]),
    },
    "artur-mas": {
        "cargo": "Expresidente de la Generalitat de Cataluña", "partido": "junts", "ctag": "cataluna",
        "fuente": "https://es.wikipedia.org/wiki/Artur_Mas", "nombre": "Artur Mas i Gavarró", "alias": "Artur Mas",
        "corta": "Expresidente de la Generalitat (2010-2016); del pujolismo al giro soberanista y la consulta del 9-N.",
        "perfil": "Artur Mas i Gavarró (Barcelona, 1956) es expresidente de la Generalitat de Cataluña (2010-2016) y figura clave en el giro del nacionalismo catalán hacia el independentismo. Economista y delfín de Jordi Pujol al frente de Convergència (CiU), gobernó Cataluña durante los años de la crisis y de la eclosión soberanista, impulsando la consulta del 9 de noviembre de 2014, por la que fue inhabilitado. Su apuesta por el «derecho a decidir» transformó CiU y abrió el camino al procés, antes de ceder el liderazgo a Puigdemont y refundar el espacio posconvergente en el PDeCAT.",
        "tray": [
            ("Delfín de Pujol", "Economista, se formó en la Generalitat y en Convergència bajo el liderazgo de Jordi Pujol, de quien fue considerado sucesor natural.", "2003-01-01"),
            ("Presidente de la Generalitat", "Tras ganar las elecciones de 2010, presidió la Generalitat al frente de CiU, gobernando en plena crisis económica con duros recortes.", "2010-12-23"),
            ("El giro soberanista y el 9-N", "Ante el auge independentista y el rechazo del Estado a un nuevo pacto fiscal, viró hacia el «derecho a decidir» e impulsó la consulta del 9-N de 2014, por la que fue inhabilitado.", "2014-11-09"),
            ("Relevo y PDeCAT", "Cedió la presidencia a Carles Puigdemont en 2016 y lideró la refundación del espacio posconvergente en el PDeCAT, manteniendo un papel de referencia en el independentismo moderado.", "2016-01-10"),
        ],
        "pos": ("Independentismo posconvergente", "Defiende la independencia de Cataluña desde el espacio liberal y posconvergente; su giro soberanista marcó el inicio del procés.", ["independentismo", "cataluna"]),
        "redes": [("Carles Puigdemont", "**Líder de Junts** (nota +4/10) — Su sucesor en la Generalitat y en el liderazgo del espacio posconvergente.", ["junts", "nota-+4", "alianza"])],
    },
    "quim-torra": {
        "cargo": "Expresidente de la Generalitat de Cataluña", "partido": "junts", "ctag": "cataluna",
        "fuente": "https://es.wikipedia.org/wiki/Quim_Torra", "nombre": "Joaquim «Quim» Torra i Pla", "alias": "Quim Torra",
        "corta": "Expresidente de la Generalitat (2018-2020); designado por Puigdemont, inhabilitado por desobediencia.",
        "perfil": "Joaquim «Quim» Torra i Pla (Blanes, Girona, 1962) es expresidente de la Generalitat de Cataluña (2018-2020). Abogado y editor de perfil marcadamente ideológico, fue elegido por Carles Puigdemont desde el extranjero como su sustituto, en plena tensión tras el 1-O. Su mandato, marcado por la confrontación con el Estado, terminó cuando el Tribunal Supremo lo inhabilitó por desobediencia, por negarse a retirar lazos amarillos y una pancarta de los edificios públicos en periodo electoral. Tras ello se apartó de la primera línea política y de las direcciones de los partidos independentistas.",
        "tray": [
            ("Editor y activista", "Abogado de formación, desarrolló su carrera en el mundo editorial y el activismo cultural independentista, con un perfil ideológico muy marcado.", "2015-01-01"),
            ("Presidente «designado» por Puigdemont", "Diputado poco conocido, fue designado por Puigdemont desde el extranjero como candidato a la presidencia de la Generalitat, siendo investido en 2018.", "2018-05-14"),
            ("Confrontación con el Estado", "Su mandato estuvo marcado por la confrontación con el Gobierno central y por la defensa de los presos del procés, con un discurso de máxima tensión.", "2019-01-01"),
            ("Inhabilitación", "El Tribunal Supremo lo inhabilitó en 2020 por desobedecer a la Junta Electoral al no retirar símbolos independentistas de edificios públicos en campaña, lo que puso fin a su presidencia.", "2020-09-28"),
        ],
        "pos": ("Independentismo de confrontación", "Defendió un independentismo de máxima confrontación con el Estado; tras su inhabilitación se distanció de las direcciones de Junts y ERC.", ["independentismo", "cataluna"]),
        "redes": [("Carles Puigdemont", "**Líder de Junts** (nota +4/10) — Lo designó como su sucesor en la Generalitat desde el extranjero.", ["junts", "nota-+4", "alianza"])],
    },
    "pere-aragones": {
        "cargo": "Expresidente de la Generalitat de Cataluña", "partido": "erc", "ctag": "cataluna",
        "fuente": "https://es.wikipedia.org/wiki/Pere_Aragon%C3%A8s", "nombre": "Pere Aragonès i Garcia", "alias": "Pere Aragonès",
        "corta": "Expresidente de la Generalitat (2021-2024) por ERC; apostó por el diálogo y la desjudicialización.",
        "perfil": "Pere Aragonès i Garcia (Pineda de Mar, Barcelona, 1982) es expresidente de la Generalitat de Cataluña (2021-2024) y dirigente de ERC. Economista, fue el primer presidente de ERC al frente de la Generalitat en la etapa reciente, apostando por la vía del diálogo y la «desjudicialización» del conflicto (indultos, mesa de diálogo, reforma de la sedición, amnistía) frente a la confrontación. Tras el mal resultado de ERC en las elecciones de 2024, que dieron la presidencia al socialista Salvador Illa, dejó la primera línea política. Su etapa estuvo marcada por la pandemia, la gestión de la sequía y la negociación con el Estado de los traspasos y de una financiación singular para Cataluña.",
        "tray": [
            ("Economista republicano", "Economista, militó desde joven en ERC y en las juventudes republicanas, ocupando responsabilidades parlamentarias y de gobierno.", "2015-01-01"),
            ("Vicepresidente con Torra", "Fue vicepresidente y conseller de Economía en el Gobierno de Quim Torra, ganando peso como hombre fuerte de ERC en la Generalitat.", "2018-06-02"),
            ("Presidente de la Generalitat", "En 2021 fue investido presidente de la Generalitat, el primero de ERC en la etapa reciente, apostando por el diálogo con el Estado y la desjudicialización del conflicto.", "2021-05-21"),
            ("Salida tras las elecciones de 2024", "Tras el retroceso de ERC en las elecciones de 2024 y la llegada de Salvador Illa a la presidencia, se apartó de la primera línea política.", "2024-08-10"),
        ],
        "pos": ("Independentismo dialogante", "Defendió la vía del diálogo y la desjudicialización (indultos, amnistía) frente a la confrontación, en sintonía con la estrategia posibilista de ERC.", ["erc", "independentismo"]),
        "redes": [
            ("Oriol Junqueras", "**Presidente de ERC** (nota +6/10) — Líder de su partido, con el que después mantuvo tensiones internas.", ["erc", "nota-+6", "alianza"]),
            ("Salvador Illa", "**Presidente de la Generalitat de Cataluña** (nota -3/10) — Le sucedió al frente de la Generalitat tras ganar las elecciones de 2024.", ["psc", "nota--3", "competencia"]),
        ],
    },
    "inigo-urkullu": {
        "cargo": "Expresidente del Gobierno Vasco (lehendakari)", "partido": "pnv", "ctag": "pais-vasco",
        "fuente": "https://es.wikipedia.org/wiki/I%C3%B1igo_Urkullu", "nombre": "Iñigo Urkullu Renteria", "alias": "Iñigo Urkullu",
        "corta": "Lehendakari entre 2012 y 2024 (PNV); nacionalismo moderado y gestor, predecesor de Pradales.",
        "perfil": "Iñigo Urkullu Renteria (Alonsotegi, Bizkaia, 1961) fue presidente del Gobierno Vasco (lehendakari) entre 2012 y 2024, una de las etapas más largas y estables al frente de Euskadi. Dirigente histórico del PNV —presidió el partido (EBB) antes de ser lehendakari—, encarnó un nacionalismo moderado, gestor y pactista, que mantuvo la hegemonía jeltzale durante más de una década en coalición con el PSE-EE. Ejerció además un discreto pero relevante papel mediador en momentos de tensión territorial, como el procés. Cedió el testigo a Imanol Pradales en 2024.",
        "tray": [
            ("Dirigente del PNV", "Maestro de formación, hizo carrera en el PNV hasta presidir su máximo órgano, el Euzkadi Buru Batzar (EBB), liderando el partido.", "2008-01-01"),
            ("Lehendakari", "En 2012 fue investido lehendakari, iniciando una larga etapa de gobierno del PNV en coalición habitual con los socialistas del PSE-EE.", "2012-12-13"),
            ("Gestión y mediación", "Su mandato se caracterizó por la estabilidad, la gestión y un perfil moderado, además de un discreto papel mediador en momentos de tensión territorial como el procés catalán.", "2017-10-01"),
            ("Relevo en 2024", "Tras más de una década, no se presentó a la reelección en 2024 y cedió el liderazgo y la lehendakaritza a Imanol Pradales, en el relevo generacional del PNV.", "2024-06-22"),
        ],
        "pos": ("Nacionalismo vasco moderado", "Defendió un nacionalismo vasco moderado, gestor y pactista, manteniendo la hegemonía del PNV y una relación pragmática con los gobiernos centrales.", ["pnv", "pais-vasco"]),
        "redes": [("Imanol Pradales", "**Lehendakari (Gobierno Vasco)** (nota +7/10) — Su sucesor al frente del PNV en el Gobierno vasco.", ["pnv", "nota-+7", "alianza"])],
    },
    "ximo-puig": {
        "cargo": "Expresidente de la Generalitat Valenciana", "partido": "psoe", "ctag": "comunidad-valenciana",
        "fuente": "https://es.wikipedia.org/wiki/Ximo_Puig", "nombre": "Ximo Puig i Ferrer", "alias": "Ximo Puig",
        "corta": "Expresidente de la Generalitat Valenciana (2015-2023) por el PSPV; lideró el «Botànic». Embajador ante la OCDE.",
        "perfil": "Ximo Puig i Ferrer (Morella, Castellón, 1959) es expresidente de la Generalitat Valenciana (2015-2023) y dirigente histórico del PSPV-PSOE. Periodista y exalcalde de Morella, lideró el llamado «Botànic», el gobierno de coalición de izquierdas (PSOE, Compromís y Podemos) que desalojó al PP del poder valenciano tras décadas de hegemonía conservadora. Barón socialista de peso, tras perder la Generalitat en 2023 ante Carlos Mazón fue nombrado embajador de España ante la OCDE, dejando la primera línea de la política autonómica. Su gestión, marcada por la reconstrucción del autogobierno tras años de casos de corrupción del PP y por la reivindicación de una financiación más justa, lo consolidó como uno de los barones de mayor peso del PSOE.",
        "tray": [
            ("Periodista y alcalde de Morella", "Periodista de profesión, fue alcalde de Morella y presidente de la Diputación de Castellón, forjando un perfil de político de territorio.", "2007-01-01"),
            ("Líder del PSPV", "Asumió el liderazgo del socialismo valenciano y lo reconstruyó como alternativa al PP tras los años de gobiernos conservadores y de casos de corrupción.", "2012-01-01"),
            ("El «Botànic»", "En 2015 fue investido presidente de la Generalitat Valenciana al frente del «Botànic», la coalición de izquierdas que desbancó al PP, revalidando el cargo en 2019.", "2015-06-27"),
            ("Embajador ante la OCDE", "Tras perder la Generalitat en 2023 frente a Carlos Mazón, fue nombrado embajador de España ante la OCDE, apartándose de la primera línea política.", "2024-01-01"),
        ],
        "pos": ("Socialismo valenciano de coalición", "Defendió un modelo de coalición de izquierdas y el valencianismo dentro del PSOE, con reivindicaciones de financiación y agua para la Comunidad.", ["psoe", "comunidad-valenciana"]),
        "redes": [("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +5/10) — Barón socialista leal, recompensado con la embajada ante la OCDE.", ["psoe", "nota-+5", "alianza"])],
    },
    "miguel-angel-revilla": {
        "cargo": "Expresidente de Cantabria y líder del PRC", "partido": "prc", "ctag": "cantabria",
        "fuente": "https://es.wikipedia.org/wiki/Miguel_%C3%81ngel_Revilla", "nombre": "Miguel Ángel Revilla Roiz", "alias": "Miguel Ángel Revilla",
        "corta": "Líder histórico del PRC y expresidente de Cantabria; fenómeno televisivo de enorme popularidad.",
        "perfil": "Miguel Ángel Revilla Roiz (Polaciones, Cantabria, 1943) es un veterano político cántabro, fundador y líder histórico del Partido Regionalista de Cantabria (PRC) y expresidente de Cantabria. Economista y profesor, presidió la comunidad en dos etapas (2003-2011 y 2015-2023), marcando la política cántabra durante décadas con un regionalismo de centro y pactista. Más allá de la gestión, se convirtió en un fenómeno televisivo nacional por su verbo popular, espontáneo y campechano en las tertulias. Perdió la presidencia en 2023 ante el PP de María José Sáenz de Buruaga, aunque mantiene una intensa proyección mediática.",
        "tray": [
            ("Fundador del PRC", "Economista y profesor, fundó y lideró durante décadas el Partido Regionalista de Cantabria, una formación de ámbito autonómico y carácter pactista.", "1978-01-01"),
            ("Presidente de Cantabria", "Presidió Cantabria en dos etapas (2003-2011 y 2015-2023), gobernando habitualmente en coalición con el PSOE y marcando la política regional.", "2003-07-01"),
            ("Fenómeno televisivo", "Su estilo popular, espontáneo y campechano lo convirtió en un personaje televisivo de enorme popularidad nacional, presente en innumerables tertulias y programas.", "2015-01-01"),
            ("Fin de etapa", "Perdió la presidencia de Cantabria en 2023 ante el PP de María José Sáenz de Buruaga, cerrando una larguísima etapa al frente de la comunidad.", "2023-07-01"),
        ],
        "pos": ("Regionalismo cántabro pactista", "Defiende los intereses de Cantabria desde un regionalismo de centro y pactista, con un estilo personal directo y enorme popularidad mediática.", ["prc", "cantabria"]),
        "redes": [("María José Sáenz de Buruaga", "**Presidenta de Cantabria** (nota -3/10) — Le arrebató la presidencia de la comunidad en 2023.", ["pp", "nota--3", "competencia"])],
    },
    "ada-colau": {
        "cargo": "Exalcaldesa de Barcelona", "partido": "comunes", "ctag": "cataluna",
        "fuente": "https://es.wikipedia.org/wiki/Ada_Colau", "nombre": "Ada Colau Ballano", "alias": "Ada Colau",
        "corta": "Exalcaldesa de Barcelona (2015-2023); del activismo de la PAH al municipalismo de los comunes.",
        "perfil": "Ada Colau Ballano (Barcelona, 1974) es exalcaldesa de Barcelona (2015-2023) y referente del activismo y la izquierda alternativa. Surgida del movimiento social como portavoz de la Plataforma de Afectados por la Hipoteca (PAH) durante la crisis de los desahucios, dio el salto a la política con Barcelona en Comú y se convirtió en la primera mujer alcaldesa de Barcelona, en la estela del 15-M y los «ayuntamientos del cambio». Gobernó dos mandatos con una agenda de vivienda, regulación turística y movilidad, antes de perder la alcaldía en 2023 frente al socialista Jaume Collboni.",
        "tray": [
            ("Activista de la PAH", "Se dio a conocer como portavoz de la Plataforma de Afectados por la Hipoteca (PAH), liderando la lucha contra los desahucios durante la crisis económica.", "2009-01-01"),
            ("Alcaldesa de Barcelona", "En 2015, al frente de Barcelona en Comú, se convirtió en la primera mujer alcaldesa de Barcelona, símbolo de los «ayuntamientos del cambio» surgidos del 15-M.", "2015-06-13"),
            ("Dos mandatos municipalistas", "Gobernó dos mandatos (revalidó en 2019 con el apoyo del PSC) con una agenda de vivienda, regulación del turismo, movilidad sostenible y derechos sociales, no exenta de polémica.", "2019-06-15"),
            ("Fin de etapa", "Perdió la alcaldía en 2023 frente al socialista Jaume Collboni, manteniéndose como una de las voces de referencia del espacio de los comunes y la izquierda alternativa.", "2023-06-17"),
        ],
        "pos": ("Municipalismo de izquierda alternativa", "Defiende un municipalismo transformador centrado en la vivienda, el decrecimiento turístico y los derechos sociales, en el espacio de los comunes.", ["comunes", "cataluna"]),
        "redes": [("Jaume Collboni", "**Alcalde de Barcelona** (nota -3/10) — Le arrebató la alcaldía en 2023 con apoyo de PP y comunes.", ["psc", "nota--3", "competencia"])],
    },
    "jose-bono": {
        "cargo": "Expresidente del Congreso y exministro de Defensa", "partido": "psoe", "ctag": "castilla-la-mancha",
        "fuente": "https://es.wikipedia.org/wiki/Jos%C3%A9_Bono", "nombre": "José Bono Martínez", "alias": "José Bono",
        "corta": "Histórico barón del PSOE; expresidente de Castilla-La Mancha, exministro de Defensa y expresidente del Congreso.",
        "perfil": "José Bono Martínez (Salobre, Albacete, 1950) es un veterano dirigente histórico del PSOE, expresidente de Castilla-La Mancha, exministro de Defensa y expresidente del Congreso de los Diputados. Abogado, fue uno de los grandes barones territoriales del socialismo, presidiendo Castilla-La Mancha durante más de dos décadas (1983-2004). Después fue ministro de Defensa con Rodríguez Zapatero y presidente del Congreso. De perfil moderado, católico y monárquico, sigue siendo una voz pública del socialismo más clásico, con frecuentes intervenciones y memorias de gran repercusión.",
        "tray": [
            ("Barón de Castilla-La Mancha", "Abogado, presidió la Junta de Comunidades de Castilla-La Mancha desde 1983 durante más de dos décadas, como uno de los grandes barones territoriales del PSOE.", "1983-05-01"),
            ("Ministro de Defensa", "Fue ministro de Defensa en el primer Gobierno de José Luis Rodríguez Zapatero (2004-2006), gestionando la retirada de las tropas de Irak y la modernización de las Fuerzas Armadas.", "2004-04-18"),
            ("Presidente del Congreso", "Entre 2008 y 2011 presidió el Congreso de los Diputados, la tercera autoridad del Estado, con un perfil institucional y moderado.", "2008-04-01"),
            ("Voz del socialismo clásico", "Retirado de los cargos, mantiene una intensa actividad pública como voz del socialismo más clásico, moderado y monárquico, con memorias y declaraciones de gran repercusión.", "2015-01-01"),
        ],
        "pos": ("Socialismo clásico y moderado", "Defiende un socialismo moderado, constitucionalista y monárquico, con frecuentes críticas matizadas al rumbo del partido en cuestiones territoriales.", ["psoe", "historico"]),
        "redes": [("Felipe González", "**Expresidente del Gobierno** (nota +6/10) — Comparte la sensibilidad del socialismo histórico y clásico.", ["psoe", "nota-+6", "alianza"])],
    },
    "alberto-garzon": {
        "cargo": "Exministro de Consumo y excoordinador de IU", "partido": "izquierda-unida", "ctag": "izquierda",
        "fuente": "https://es.wikipedia.org/wiki/Alberto_Garz%C3%B3n", "nombre": "Alberto Garzón Espinosa", "alias": "Alberto Garzón",
        "corta": "Excoordinador federal de IU y exministro de Consumo; economista de la generación del 15-M.",
        "perfil": "Alberto Garzón Espinosa (Logroño, 1985) es un economista y político, excoordinador federal de Izquierda Unida y exministro de Consumo. De la generación surgida en la crisis y el 15-M, fue uno de los rostros jóvenes de la izquierda, diputado por IU integrado en las confluencias de Unidas Podemos. Como ministro de Consumo (2020-2023) impulsó la regulación de la publicidad del juego y de los alimentos, y protagonizó polémicas como la de las macrogranjas o el consumo de carne. Tras dejar la política activa, se ha orientado a la divulgación económica.",
        "tray": [
            ("Economista del 15-M", "Economista, se dio a conocer como diputado de IU muy joven, en la estela del 15-M, con un perfil de divulgación de la economía crítica.", "2011-11-20"),
            ("Coordinador de IU", "Asumió la coordinación federal de Izquierda Unida, integrando a la formación en las confluencias de Unidos/Unidas Podemos.", "2016-06-12"),
            ("Ministro de Consumo", "Fue ministro de Consumo en el Gobierno de coalición (2020-2023), impulsando la regulación del juego y la publicidad alimentaria, con polémicas como la de las macrogranjas.", "2020-01-13"),
            ("Divulgación económica", "Tras no repetir en las listas de 2023, dejó la primera línea política y se orientó a la divulgación y el análisis económico.", "2023-08-17"),
        ],
        "pos": ("Izquierda y economía crítica", "Defiende posiciones de izquierda transformadora y de crítica al modelo económico, con un perfil de divulgador más que de aparato.", ["izquierda-unida", "izquierda"]),
        "redes": [("Pablo Iglesias Turrión", "**Fundador de Podemos** (nota +5/10) — Compañero de espacio en las confluencias de Unidas Podemos.", ["izquierda", "nota-+5", "alianza"])],
    },
    "teresa-ribera": {
        "patch": True, "file": CONEXOS,
        "perfil": "Teresa Ribera Rodríguez (Madrid, 1969) es vicepresidenta ejecutiva de la Comisión Europea para una Transición Limpia, Justa y Competitiva y responsable de Competencia, uno de los cargos más poderosos de la UE. Jurista y alta funcionaria especializada en medio ambiente, fue vicepresidenta del Gobierno de España y ministra para la Transición Ecológica con Pedro Sánchez, donde pilotó la política climática y energética del país. En 2024 dio el salto a Bruselas como número dos de Ursula von der Leyen, con enorme poder sobre la competencia, las ayudas de Estado y la agenda verde europea.",
        "tray": [
            ("Alta funcionaria del clima", "Jurista y técnica de la Administración, se especializó en cambio climático, dirigiendo la oficina española de cambio climático y un think tank internacional (IDDRI) en París.", "2008-01-01"),
            ("Ministra de Transición Ecológica", "En 2018 entró en el Gobierno de Pedro Sánchez como ministra para la Transición Ecológica y, después, vicepresidenta, pilotando la política energética, climática y de despoblación.", "2018-06-07"),
            ("La gestión energética", "Lideró la respuesta española a la crisis energética y los precios de la electricidad, la «excepción ibérica» y la planificación del cierre de las nucleares y el carbón, con una apuesta ambiciosa por las renovables.", "2021-01-01"),
            ("Vicepresidenta de la Comisión Europea", "En 2024 fue nombrada vicepresidenta ejecutiva de la Comisión Europea para la Transición Limpia y responsable de Competencia, uno de los cargos comunitarios de mayor poder, con la regulación de las grandes empresas en sus manos.", "2024-12-01"),
        ],
        "pos": ("Agenda verde y competencia europea", "Defiende una transición ecológica ambiciosa y, desde Bruselas, una política de competencia que combine el cumplimiento de las reglas con la autonomía estratégica europea.", ["transicion-ecologica", "ue"]),
    },
}


def build_apartados(d: dict) -> list:
    aps = [{"tipo": "identidad", "orden": 0, "items": [
        {"tipo": "dato", "titulo": "Perfil", "contenido": d["perfil"]}]}]
    tray_items = []
    for tup in d["tray"]:
        item = {"tipo": "evento", "titulo": tup[0], "contenido": tup[1]}
        if len(tup) > 2 and tup[2]:
            item["fecha"] = tup[2]
        tray_items.append(item)
    aps.append({"tipo": "trayectoria", "orden": 1, "items": tray_items})
    if d.get("pos"):
        t, c, tags = d["pos"]
        aps.append({"tipo": "posiciones", "orden": 2, "items": [
            {"tipo": "dato", "titulo": t, "contenido": c, "tags": tags}]})
    if d.get("redes"):
        aps.append({"tipo": "redes", "orden": 3, "items": [
            {"tipo": "contacto", "titulo": t, "contenido": c, "tags": tags}
            for (t, c, tags) in d["redes"]]})
    return aps


def build_dossier(slug: str, d: dict) -> dict:
    return {
        "slug": slug, "tipo": "politico", "nombre": d["nombre"], "alias": d["alias"],
        "cargo": d["cargo"], "bio_corta": d["corta"], "fuente_principal": d["fuente"],
        "tags": ["politico", d["partido"], d["ctag"]],
        "confidence": 0.9, "completeness": 0.95, "apartados": build_apartados(d),
    }


def patch_entry(slug: str, d: dict) -> bool:
    arr = json.load(open(d["file"], encoding="utf-8"))
    target = next((x for x in arr if x.get("slug") == slug), None)
    if not target:
        print(f"  · aviso: {slug} no encontrado en {d['file'].name}")
        return False
    aps = target.setdefault("apartados", [])

    def gom(tipo, orden):
        for a in aps:
            if a.get("tipo") == tipo:
                return a
        nuevo = {"tipo": tipo, "orden": orden, "items": []}
        aps.append(nuevo)
        return nuevo

    ident = gom("identidad", 0)
    if ident["items"]:
        ident["items"][0]["contenido"] = d["perfil"]
    else:
        ident["items"].append({"tipo": "dato", "titulo": "Perfil", "contenido": d["perfil"]})
    tray = gom("trayectoria", 1)
    tray["items"] = []
    for tup in d["tray"]:
        item = {"tipo": "evento", "titulo": tup[0], "contenido": tup[1]}
        if len(tup) > 2 and tup[2]:
            item["fecha"] = tup[2]
        tray["items"].append(item)
    if d.get("pos"):
        pos = gom("posiciones", 2)
        t, c, tags = d["pos"]
        if t not in {x.get("titulo") for x in pos["items"]}:
            pos["items"].append({"tipo": "dato", "titulo": t, "contenido": c, "tags": tags})
    target["completeness"] = 0.95
    json.dump(arr, open(d["file"], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return True


def main() -> int:
    nuevos = [build_dossier(s, d) for s, d in FIG.items() if not d.get("patch")]
    json.dump(nuevos, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"  escrito: {OUT.name} · {len(nuevos)} figuras (judicatura + territorio)")
    for s, d in FIG.items():
        if d.get("patch") and patch_entry(s, d):
            print(f"  parcheado: {d['file'].name} · {s}")
    print(f"OK · {len(FIG)} figuras")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
