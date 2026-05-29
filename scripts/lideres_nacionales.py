#!/usr/bin/env python3
"""scripts/lideres_nacionales.py

Dosieres detallados ("Quién es" + "Trayectoria", ~190-230 palabras) de los líderes
nacionales de partido y portavoces parlamentarios que faltaban. Los nuevos van a
data/poder/figuras_clave_9.json (fuente "poder"). Feijóo, que ya existe en
congreso/diputados.json, se enriquece in situ.

Tono factual; fuentes públicas; presunción de inocencia en causas. Roster mayo 2026.

Uso:  python3 scripts/lideres_nacionales.py \
      && python3 bin/gen_subfixture.py --source poder \
      && python3 bin/gen_subfixture.py --source congreso
"""
from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "poder" / "figuras_clave_9.json"
DIPUTADOS = REPO / "data" / "congreso" / "diputados.json"

LID: dict[str, dict] = {
    "santiago-abascal": {
        "cargo": "Presidente de Vox", "partido": "vox", "ctag": "vox", "fuente": "https://www.voxespana.es",
        "nombre": "Santiago Abascal Conde", "alias": "Santiago Abascal",
        "corta": "Presidente y fundador de Vox; líder de la derecha radical española y tercera fuerza del Congreso.",
        "perfil": "Santiago Abascal Conde (Bilbao, 1976) es el presidente y fundador de Vox, el partido de la derecha radical que ha irrumpido con fuerza en la política española. Procedente de una familia vasca del PP castigada por el terrorismo de ETA, militó durante años en el Partido Popular del País Vasco antes de romper con él y fundar Vox en 2013. Bajo su liderazgo, el partido pasó de la irrelevancia a ser la tercera fuerza del Congreso, con un discurso nacionalista español, antiinmigración, contrario al «globalismo» y a los nacionalismos periféricos, y de defensa de la unidad de España.",
        "tray": [
            ("Del PP vasco a la ruptura", "Criado en una familia del PP del País Vasco amenazada por ETA, fue concejal y cargo del partido en Álava y en la Comunidad de Madrid, hasta romper con el PP por considerarlo tibio.", "2004-01-01"),
            ("Fundación de Vox", "En 2013 cofundó Vox junto a otros exdirigentes del PP, asumiendo después su liderazgo, en un partido inicialmente marginal que defendía una derecha «sin complejos».", "2013-12-17"),
            ("La irrupción electoral", "Tras el desafío independentista catalán, Vox irrumpió en las instituciones (Andalucía 2018, Congreso 2019), consolidándose como tercera fuerza y entrando en gobiernos autonómicos en coalición con el PP.", "2019-04-28"),
            ("Líder de la derecha radical", "Ha situado a Vox en la órbita de la derecha radical europea (Patriots), con un discurso antiinmigración, soberanista y contrario a la agenda climática y de género, en competencia y a la vez dependencia mutua con el PP.", "2023-07-23"),
        ],
        "pos": ("Derecha radical y unidad de España", "Defiende la recentralización del Estado, el endurecimiento migratorio, la derogación de leyes «ideológicas» y la unidad de España frente a los nacionalismos, en confrontación frontal con el Gobierno de Sánchez.", ["vox", "derecha-radical"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -9/10) — Adversario frontal; encarna la oposición más dura al «sanchismo».", ["gobierno", "nota--9", "confrontacion"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota -2/10) — Competencia por el electorado de la derecha y a la vez socio imprescindible en gobiernos autonómicos.", ["pp", "nota--2", "competencia"]),
        ],
    },
    "yolanda-diaz": {
        "cargo": "Vicepresidenta segunda del Gobierno y líder de Sumar", "partido": "sumar", "ctag": "sumar", "fuente": "https://www.mites.gob.es",
        "nombre": "Yolanda Díaz Pérez", "alias": "Yolanda Díaz",
        "corta": "Vicepresidenta 2ª, ministra de Trabajo y líder de Sumar; sucesora de Pablo Iglesias al frente de la izquierda alternativa.",
        "perfil": "Yolanda Díaz Pérez (Fene, A Coruña, 1971) es vicepresidenta segunda del Gobierno, ministra de Trabajo y líder de Sumar, la coalición de la izquierda alternativa. Abogada laboralista de familia comunista gallega, fue la sucesora de Pablo Iglesias al frente del espacio a la izquierda del PSOE. Como ministra de Trabajo impulsó la reforma laboral de 2021 y sucesivas subidas del salario mínimo, sus grandes logros, y en 2023 lanzó Sumar como plataforma para aglutinar a la izquierda, aunque el proyecto ha sufrido un fuerte desgaste, malos resultados y la ruptura con Podemos.",
        "tray": [
            ("Abogada laboralista y comunista", "Hija de un histórico sindicalista, ejerció como abogada laboralista y militó en el PCE e Izquierda Unida, siendo diputada en el Parlamento gallego.", "2005-01-01"),
            ("Ministra de Trabajo", "En 2020 entró en el Gobierno de coalición como ministra de Trabajo, donde negoció con sindicatos y patronal la reforma laboral de 2021 y la subida del salario mínimo.", "2020-01-13"),
            ("Vicepresidenta y sucesión de Iglesias", "Tras la salida de Pablo Iglesias asumió el liderazgo del espacio y la vicepresidencia, con un perfil más moderado y transversal que su predecesor.", "2021-03-31"),
            ("El proyecto Sumar", "En 2023 lanzó la plataforma Sumar, que concurrió a las generales aglutinando a la izquierda, pero el proyecto se ha debilitado por los malos resultados, la ruptura con Podemos y las dudas sobre su continuidad.", "2023-07-23"),
        ],
        "pos": ("Izquierda transformadora", "Defiende los derechos laborales, la reducción de la jornada, la subida del SMI y una agenda social y feminista, como socia minoritaria del PSOE en el Gobierno de coalición.", ["sumar", "izquierda"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +5/10) — Socia de coalición: colaboración estable pero con tensiones recurrentes por las políticas sociales y los presupuestos.", ["gobierno", "nota-+5", "alianza"]),
            ("Ione Belarra", "**Secretaria general de Podemos** (nota -5/10) — Ruptura del espacio: Podemos abandonó Sumar y compite con Díaz por la izquierda.", ["podemos", "nota--5", "ruptura"]),
        ],
    },
    "ione-belarra": {
        "cargo": "Secretaria general de Podemos", "partido": "podemos", "ctag": "podemos", "fuente": "https://podemos.info",
        "nombre": "Ione Belarra Gorka", "alias": "Ione Belarra",
        "corta": "Secretaria general de Podemos y exministra de Derechos Sociales; lidera el ala más combativa de la izquierda.",
        "perfil": "Ione Belarra Gorka (Pamplona, 1987) es la secretaria general de Podemos y exministra de Derechos Sociales y Agenda 2030. Psicóloga de formación, es una de las dirigentes de la generación fundadora de Podemos y heredó el liderazgo del partido de manos de Pablo Iglesias. Desde la ruptura con Sumar y la salida del Gobierno, lidera un Podemos reducido pero combativo, situado a la izquierda de Sumar y del PSOE, con un discurso radicalizado en feminismo, vivienda, la causa palestina y la crítica frontal a la OTAN y al aumento del gasto militar. Es una de las dirigentes que mantienen viva la marca Podemos pese a su drástica reducción parlamentaria y a la competencia de Sumar por el mismo espacio.",
        "tray": [
            ("De la universidad a Podemos", "Psicóloga, se incorporó al núcleo fundador de Podemos, ejerciendo de diputada y secretaria de organización del partido.", "2015-01-01"),
            ("Ministra de Derechos Sociales", "Fue ministra de Derechos Sociales y Agenda 2030 en el Gobierno de coalición, impulsando la ley de vivienda y políticas sociales.", "2021-03-31"),
            ("Secretaria general de Podemos", "Asumió la secretaría general de Podemos tras la marcha de Pablo Iglesias, manteniendo el perfil más combativo del espacio.", "2021-06-13"),
            ("Ruptura con Sumar", "Tras los malos resultados y los choques con Yolanda Díaz, Podemos rompió con Sumar y se situó en la oposición por la izquierda al Gobierno, con un discurso radicalizado.", "2023-12-05"),
        ],
        "pos": ("Izquierda de ruptura", "Defiende posiciones de izquierda radical en vivienda, feminismo, antimilitarismo y la causa palestina, situándose a la izquierda del Gobierno y criticando la moderación de Sumar.", ["podemos", "izquierda"]),
        "redes": [
            ("Pablo Iglesias Turrión", "**Fundador de Podemos** (nota +7/10) — Mentor político y referente del proyecto que ahora lidera.", ["podemos", "nota-+7", "alianza"]),
            ("Yolanda Díaz", "**Vicepresidenta 2ª y líder de Sumar** (nota -5/10) — Ruptura y competencia por el espacio de la izquierda alternativa.", ["sumar", "nota--5", "ruptura"]),
        ],
    },
    "carles-puigdemont": {
        "cargo": "Líder de Junts per Catalunya", "partido": "junts", "ctag": "cataluna", "fuente": "https://www.junts.cat",
        "nombre": "Carles Puigdemont i Casamajó", "alias": "Carles Puigdemont",
        "corta": "Líder de Junts y expresidente de la Generalitat; encabezó el 1-O de 2017 y dirige el partido desde el extranjero.",
        "perfil": "Carles Puigdemont i Casamajó (Amer, Girona, 1962) es el líder de Junts per Catalunya y una de las figuras centrales del independentismo. Periodista y exalcalde de Girona, fue presidente de la Generalitat (2016-2017) y encabezó el referéndum ilegal del 1 de octubre de 2017 y la declaración de independencia, tras lo cual se trasladó a Bélgica para eludir la acción de la justicia española. Desde el extranjero y como eurodiputado ha seguido dirigiendo Junts, cuyos votos resultaron decisivos para la investidura de Pedro Sánchez en 2023 a cambio de la ley de amnistía.",
        "tray": [
            ("Periodista y alcalde de Girona", "Periodista de profesión y militante del nacionalismo catalán (CDC), fue alcalde de Girona antes de dar el salto a la primera línea autonómica.", "2011-01-01"),
            ("Presidente de la Generalitat", "Fue investido presidente de la Generalitat en 2016 y lideró el proceso soberanista que culminó en el referéndum ilegal del 1-O de 2017 y la declaración de independencia.", "2016-01-12"),
            ("La salida a Bélgica", "Tras la aplicación del artículo 155 y la causa judicial por el procés, se trasladó a Bélgica para eludir a la justicia española; fue elegido eurodiputado y su entrega se debatió durante años en la justicia europea.", "2017-10-30"),
            ("La amnistía y la llave de la investidura", "Sus diputados resultaron decisivos para la investidura de Sánchez en 2023, a cambio de la ley de amnistía, cuya aplicación a su caso por malversación fue, sin embargo, discutida por el Tribunal Supremo.", "2023-11-09"),
        ],
        "pos": ("Independentismo y negociación dura", "Defiende la independencia de Cataluña y una confrontación negociadora con el Estado; desde una posición de bisagra, condiciona la estabilidad del Gobierno de Sánchez a cambio de cesiones para Cataluña.", ["junts", "independentismo"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +1/10) — Relación puramente transaccional: apoyo condicionado a la amnistía y a las cesiones, con bloqueos frecuentes.", ["gobierno", "nota-+1", "transaccional"]),
            ("Míriam Nogueras", "**Portavoz de Junts en el Congreso** (nota +8/10) — Su negociadora de máxima confianza en Madrid.", ["junts", "nota-+8", "alianza"]),
        ],
    },
    "miriam-nogueras": {
        "cargo": "Portavoz de Junts per Catalunya en el Congreso", "partido": "junts", "ctag": "cataluna", "fuente": "https://www.junts.cat",
        "nombre": "Míriam Nogueras i Camero", "alias": "Míriam Nogueras",
        "corta": "Portavoz de Junts en el Congreso y negociadora de máxima confianza de Puigdemont; línea dura con el Gobierno.",
        "perfil": "Míriam Nogueras i Camero (Barcelona, 1980) es la portavoz de Junts per Catalunya en el Congreso de los Diputados y una de las dirigentes de máxima confianza de Carles Puigdemont. Se ha convertido en la negociadora de Junts en Madrid, marcando una línea dura y exigente en el apoyo —o el bloqueo— a las iniciativas del Gobierno de Sánchez, cuya estabilidad depende en buena medida de los votos de su grupo. Encarna el ala más confrontacional del independentismo en la negociación con el Estado, y su firmeza negociadora la ha convertido en una de las parlamentarias más temidas y citadas de la legislatura.",
        "tray": [
            ("Empresa y política", "Con experiencia en el sector privado, se vinculó a la política de la mano de Convergència y después de Junts, ocupando responsabilidades orgánicas.", "2017-01-01"),
            ("Diputada de Junts", "Fue diputada de Junts en el Congreso, ganando peso como una de las voces de confianza de Puigdemont en Madrid.", "2019-01-01"),
            ("Portavoz y negociadora", "Asumió la portavocía de Junts en el Congreso, convirtiéndose en la negociadora del partido con el Gobierno, con una línea dura y exigente.", "2023-08-17"),
            ("La llave de la legislatura", "Los votos de Junts son decisivos para la estabilidad del Gobierno de Sánchez, lo que ha situado a Nogueras en el centro de la negociación, alternando apoyos y bloqueos.", "2024-01-01"),
        ],
        "pos": ("Independentismo exigente", "Defiende los intereses de Junts y de Cataluña con una estrategia de máxima exigencia, condicionando su apoyo al cumplimiento de los acuerdos (amnistía, financiación, traspasos).", ["junts", "independentismo"]),
        "redes": [
            ("Carles Puigdemont", "**Líder de Junts** (nota +8/10) — Dirigente de su máxima confianza y ejecutora de su estrategia en Madrid.", ["junts", "nota-+8", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +1/10) — Apoyo transaccional y exigente; su grupo condiciona la viabilidad de la legislatura.", ["gobierno", "nota-+1", "transaccional"]),
        ],
    },
    "oriol-junqueras": {
        "cargo": "Presidente de Esquerra Republicana de Catalunya (ERC)", "partido": "erc", "ctag": "cataluna", "fuente": "https://www.esquerra.cat",
        "nombre": "Oriol Junqueras i Vies", "alias": "Oriol Junqueras",
        "corta": "Presidente de ERC; vicepresidente de la Generalitat en el 1-O, condenado e indultado. Línea independentista posibilista.",
        "perfil": "Oriol Junqueras i Vies (Barcelona, 1969) es el presidente de Esquerra Republicana de Catalunya (ERC) y uno de los principales líderes del independentismo catalán. Historiador y profesor universitario, fue vicepresidente de la Generalitat con Puigdemont y uno de los responsables del referéndum del 1-O de 2017. Condenado por sedición y malversación, cumplió prisión hasta que el Gobierno le concedió el indulto en 2021, y la ley de amnistía de 2024 buscó cerrar su situación judicial. Mantiene a ERC en una estrategia de negociación con el Estado más posibilista que la de Junts.",
        "tray": [
            ("Historiador y republicano", "Doctor en Historia y profesor universitario, militó en el republicanismo catalán y fue eurodiputado y alcalde de Sant Vicenç dels Horts antes de liderar ERC.", "2011-01-01"),
            ("Vicepresidente de la Generalitat", "Fue vicepresidente y conseller de Economía de la Generalitat con Puigdemont, y uno de los organizadores del referéndum ilegal del 1-O de 2017.", "2016-01-14"),
            ("Prisión e indulto", "Tras el procés fue juzgado y condenado por sedición y malversación, de lo que cumplió parte en prisión, hasta que en 2021 recibió el indulto del Gobierno de Sánchez.", "2019-10-14"),
            ("Liderazgo posibilista de ERC", "Recuperó el liderazgo de ERC y la situó en una estrategia de negociación con el Estado (apoyo a la investidura de Sánchez, financiación, traspasos), más pragmática que Junts.", "2024-11-30"),
        ],
        "pos": ("Independentismo posibilista", "Defiende la república catalana por la vía del diálogo y la ampliación del autogobierno, apoyando al Gobierno a cambio de cesiones (indultos, amnistía, financiación singular, traspasos).", ["erc", "independentismo"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +4/10) — Socio de investidura: apoyo negociado a cambio de indultos, amnistía y financiación para Cataluña.", ["gobierno", "nota-+4", "alianza"]),
            ("Gabriel Rufián", "**Portavoz de ERC en el Congreso** (nota +7/10) — Principal cara mediática del partido en Madrid.", ["erc", "nota-+7", "alianza"]),
        ],
    },
    "gabriel-rufian": {
        "cargo": "Portavoz de ERC en el Congreso", "partido": "erc", "ctag": "cataluna", "fuente": "https://www.esquerra.cat",
        "nombre": "Gabriel Rufián Romero", "alias": "Gabriel Rufián",
        "corta": "Portavoz de ERC en el Congreso; cara mediática del independentismo, estilo combativo y orientado a redes.",
        "perfil": "Gabriel Rufián Romero (Santa Coloma de Gramenet, 1982) es el portavoz de Esquerra Republicana (ERC) en el Congreso de los Diputados y uno de los políticos más mediáticos del independentismo. De origen andaluz y de barrio metropolitano, irrumpió en 2016 como diputado con un estilo combativo, irónico y orientado a la viralidad en redes y platós. Se ha convertido en la cara de ERC en Madrid, defendiendo el apoyo de los republicanos al Gobierno de Sánchez a cambio de avances para Cataluña y la izquierda, con un discurso que combina el independentismo con lo social. Su programa de entrevistas y su intensa actividad en redes lo han convertido en un fenómeno mediático que trasciende el Congreso.",
        "tray": [
            ("Irrupción mediática", "Procedente del ámbito de la empresa y el activismo, irrumpió como número dos de ERC en las generales de 2015-2016, con un estilo rupturista y muy mediático.", "2016-01-13"),
            ("Portavoz en el Congreso", "Se consolidó como portavoz de ERC en el Congreso, protagonista de duelos parlamentarios y entrevistas de gran repercusión.", "2019-01-01"),
            ("Negociador en Madrid", "Ha pilotado el apoyo de ERC a las investiduras y los presupuestos de Sánchez, negociando indultos, traspasos y financiación para Cataluña.", "2023-11-16"),
            ("Cara social del independentismo", "Combina el discurso independentista con una agenda social de izquierdas, buscando ampliar el electorado de ERC más allá del soberanismo clásico.", "2024-01-01"),
        ],
        "pos": ("Independentismo de izquierdas", "Defiende la república catalana y una agenda social, apoyando al Gobierno de coalición a cambio de cesiones para Cataluña, con un estilo combativo y orientado a los medios.", ["erc", "independentismo"]),
        "redes": [
            ("Oriol Junqueras", "**Presidente de ERC** (nota +7/10) — Líder de su partido, del que Rufián es la principal voz parlamentaria.", ["erc", "nota-+7", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +4/10) — Apoyo negociado del grupo de ERC a la investidura y los presupuestos.", ["gobierno", "nota-+4", "alianza"]),
        ],
    },
    "aitor-esteban": {
        "cargo": "Presidente del PNV (EBB)", "partido": "pnv", "ctag": "pais-vasco", "fuente": "https://www.eaj-pnv.eus",
        "nombre": "Aitor Esteban Bravo", "alias": "Aitor Esteban",
        "corta": "Presidente del PNV (EBB) desde 2025; durante casi dos décadas, su influyente portavoz en el Congreso.",
        "perfil": "Aitor Esteban Bravo (Bilbao, 1962) es el presidente del Euzkadi Buru Batzar (EBB), el máximo órgano del PNV, desde 2025, lo que lo convierte en el principal dirigente del nacionalismo vasco moderado. Abogado, fue durante casi dos décadas el portavoz del PNV en el Congreso de los Diputados, donde se ganó fama de negociador hábil y de orador influyente, clave en numerosas investiduras, presupuestos y en la moción de censura de 2018 contra Rajoy. Sucedió a Andoni Ortuzar al frente del partido, en plena competencia con EH Bildu por la hegemonía en Euskadi.",
        "tray": [
            ("Abogado y cargo foral", "Abogado de formación, desarrolló su carrera en el PNV, ocupando responsabilidades forales en Bizkaia antes de dar el salto a la política estatal.", "1999-01-01"),
            ("Portavoz del PNV en el Congreso", "Durante casi dos décadas fue el portavoz del PNV en el Congreso, donde su voto resultó decisivo en investiduras, presupuestos y la moción de censura de 2018 contra Rajoy.", "2004-01-01"),
            ("El negociador clave", "Se consolidó como uno de los negociadores más influyentes de la Cámara, apoyando con condiciones al PSOE y obteniendo réditos para Euskadi (cupo, transferencias).", "2018-06-01"),
            ("Presidente del PNV", "En 2025 fue elegido presidente del EBB, sucediendo a Andoni Ortuzar al frente del PNV, con el reto de mantener la hegemonía jeltzale frente al ascenso de EH Bildu.", "2025-01-01"),
        ],
        "pos": ("Nacionalismo vasco moderado", "Defiende el autogobierno y la actualización del estatus de Euskadi por la vía pactista, apoyando al Gobierno de Sánchez a cambio de transferencias y del respeto al concierto vasco.", ["pnv", "nacionalismo-vasco"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +6/10) — El PNV es socio de investidura y apoyo parlamentario estable del Gobierno.", ["gobierno", "nota-+6", "alianza"]),
            ("Imanol Pradales", "**Lehendakari (Gobierno Vasco)** (nota +7/10) — Mismo partido; coordinación entre la dirección del PNV y el Gobierno vasco.", ["pnv", "nota-+7", "alianza"]),
        ],
    },
    "arnaldo-otegi": {
        "cargo": "Coordinador general de EH Bildu", "partido": "bildu", "ctag": "pais-vasco", "fuente": "https://www.ehbildu.eus",
        "nombre": "Arnaldo Otegi Mondragón", "alias": "Arnaldo Otegi",
        "corta": "Coordinador general de EH Bildu; artífice del giro de la izquierda abertzale a la vía política tras el fin de ETA.",
        "perfil": "Arnaldo Otegi Mondragón (Elgoibar, 1958) es el coordinador general de EH Bildu, la coalición de la izquierda abertzale, y el principal artífice de su estrategia política. Figura histórica del nacionalismo vasco radical y exmiembro de ETA en su juventud (por lo que estuvo en prisión), lideró el proceso que llevó a la izquierda abertzale a renunciar a la violencia e integrarse plenamente en el juego democrático tras el fin de ETA. Bajo su dirección, EH Bildu se ha convertido en primera o segunda fuerza de Euskadi y en socio parlamentario del Gobierno de Sánchez.",
        "tray": [
            ("Pasado en la izquierda abertzale", "Figura histórica del nacionalismo vasco radical, estuvo vinculado a ETA en su juventud y pasó varios periodos en prisión a lo largo de las décadas siguientes.", "1987-01-01"),
            ("El giro hacia la vía política", "Fue uno de los principales impulsores del giro estratégico de la izquierda abertzale hacia la vía exclusivamente política, clave en el cese definitivo de la violencia de ETA en 2011.", "2011-10-20"),
            ("Líder de EH Bildu", "Como coordinador general de EH Bildu, ha pilotado el crecimiento electoral de la coalición hasta disputar la hegemonía al PNV en Euskadi y en Navarra.", "2013-01-01"),
            ("Socio del Gobierno", "EH Bildu se ha convertido en socio parlamentario del Gobierno de Sánchez, apoyando investiduras y presupuestos, lo que genera fuerte controversia con la derecha y las víctimas del terrorismo.", "2023-11-16"),
        ],
        "pos": ("Izquierda abertzale", "Defiende la independencia de Euskal Herria y una agenda social de izquierdas por la vía política, apoyando al Gobierno de coalición; su pasado en ETA sigue siendo objeto de fuerte controversia.", ["bildu", "izquierda-abertzale"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +5/10) — Socio parlamentario: EH Bildu apoya investiduras y presupuestos, en una relación muy contestada por la derecha.", ["gobierno", "nota-+5", "alianza"]),
            ("Aitor Esteban", "**Presidente del PNV** (nota -3/10) — Competencia directa por la hegemonía del nacionalismo vasco.", ["pnv", "nota--3", "competencia"]),
        ],
    },
    "mertxe-aizpurua": {
        "cargo": "Portavoz de EH Bildu en el Congreso", "partido": "bildu", "ctag": "pais-vasco", "fuente": "https://www.ehbildu.eus",
        "nombre": "Mertxe Aizpurua Arzallus", "alias": "Mertxe Aizpurua",
        "corta": "Portavoz de EH Bildu en el Congreso; periodista, exdirectora de Egin y Gara.",
        "perfil": "Mertxe Aizpurua Arzallus (Tolosa, 1960) es la portavoz de EH Bildu en el Congreso de los Diputados. Periodista de profesión —fue directora de los diarios Egin y Gara, vinculados a la izquierda abertzale—, es una de las voces más reconocibles de la coalición en Madrid. Como portavoz, ha defendido el apoyo de EH Bildu a las investiduras y presupuestos del Gobierno de Sánchez, así como la agenda social y memorialista de su espacio, en un papel de creciente normalización institucional pese a la controversia que rodea al pasado de la izquierda abertzale. Su trayectoria periodística y su perfil sereno han contribuido a la creciente normalización institucional de EH Bildu en la política española.",
        "tray": [
            ("Periodista abertzale", "Periodista de profesión, dirigió cabeceras vinculadas a la izquierda abertzale como Egin y Gara, con un perfil muy ligado al nacionalismo vasco radical.", "1990-01-01"),
            ("Diputada de EH Bildu", "Dio el salto a la política institucional como diputada de EH Bildu en el Congreso, integrándose en el grupo de la coalición.", "2019-01-01"),
            ("Portavoz en el Congreso", "Asumió la portavocía de EH Bildu en el Congreso, convirtiéndose en la cara parlamentaria de la coalición en Madrid.", "2020-01-01"),
            ("Apoyo al Gobierno", "Ha pilotado el apoyo de EH Bildu a las investiduras y presupuestos de Sánchez, defendiendo una agenda social, memorialista y de autogobierno.", "2023-11-16"),
        ],
        "pos": ("Izquierda abertzale en Madrid", "Defiende la agenda social y soberanista de EH Bildu y su apoyo condicionado al Gobierno de coalición, con un papel de normalización institucional de su espacio.", ["bildu", "izquierda-abertzale"]),
        "redes": [
            ("Arnaldo Otegi", "**Coordinador general de EH Bildu** (nota +7/10) — Líder de su coalición, cuya estrategia ejecuta en el Congreso.", ["bildu", "nota-+7", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +5/10) — Apoyo parlamentario de EH Bildu a investiduras y presupuestos.", ["gobierno", "nota-+5", "alianza"]),
        ],
    },
    "alberto-nunez-feijoo": {
        "patch": True, "file": DIPUTADOS,
        "perfil": "Alberto Núñez Feijóo (Ourense, 1961) es el presidente del Partido Popular y líder de la oposición desde 2022. Funcionario y gestor sanitario de formación, presidió la Xunta de Galicia durante 13 años con cuatro mayorías absolutas consecutivas, un récord que lo convirtió en el barón territorial más sólido del PP. Tras la crisis del liderazgo de Pablo Casado, asumió la presidencia nacional del partido con el objetivo de llegar a la Moncloa; ganó las elecciones de 2023 en escaños pero no logró la investidura, quedándose como líder de la oposición frente a Pedro Sánchez.",
        "tray": [
            ("Funcionario y gestor", "Funcionario de carrera, ocupó altos cargos en la sanidad gallega y estatal (Insalud, Correos) antes de liderar el PP de Galicia.", "1996-01-01"),
            ("Presidente de la Xunta", "Presidió la Xunta de Galicia desde 2009, encadenando cuatro mayorías absolutas, con un perfil de gestor moderado y eficaz que lo convirtió en referencia del partido.", "2009-04-01"),
            ("Salto a la dirección nacional", "Tras la crisis interna que se llevó por delante a Pablo Casado, fue elegido presidente nacional del PP en 2022, con el mandato de recuperar el poder.", "2022-04-02"),
            ("Líder de la oposición", "Ganó las elecciones generales de julio de 2023 en escaños, pero no consiguió los apoyos para la investidura, quedándose como líder de la oposición frente al Gobierno de coalición de Sánchez.", "2023-07-23"),
        ],
        "pos": ("Centroderecha moderado", "Defiende un PP de centroderecha, de gestión y moderación, aunque presionado por la competencia de Vox; hace de la regeneración institucional, la economía y la crítica a los pactos de Sánchez con el independentismo sus ejes.", ["pp", "oposicion"]),
    },
    "miguel-tellado": {
        "cargo": "Secretario general del PP y portavoz en el Congreso", "partido": "pp", "ctag": "pp", "fuente": "https://www.pp.es",
        "nombre": "Miguel Tellado Filgueira", "alias": "Miguel Tellado",
        "corta": "Secretario general del PP y portavoz en el Congreso; mano derecha de Feijóo y azote del Gobierno.",
        "perfil": "Miguel Tellado Filgueira (Ferrol, A Coruña, 1976) es el secretario general del Partido Popular y portavoz del grupo popular en el Congreso, lo que lo convierte en uno de los principales dirigentes y en la mano derecha de Alberto Núñez Feijóo en la maquinaria del partido y en la batalla parlamentaria. De perfil duro y combativo, procede del PP gallego, donde se forjó junto a Feijóo, y ejerce de azote del Gobierno de Sánchez en el Congreso, marcando la estrategia de oposición más agresiva del partido. Su ascenso refleja el peso del PP gallego en la dirección de Feijóo y la apuesta del partido por una oposición sin tregua en sede parlamentaria.",
        "tray": [
            ("Del PP gallego a Madrid", "Procedente del PP de Galicia, donde trabajó junto a Feijóo, desarrolló su carrera en la organización y la comunicación del partido.", "2009-01-01"),
            ("Dirigente de organización", "Ocupó responsabilidades orgánicas en el PP, ganando peso en la estructura interna del partido.", "2018-01-01"),
            ("Secretario general del PP", "Tras la llegada de Feijóo, fue nombrado secretario general del Partido Popular en el congreso de 2024, asumiendo el control de la maquinaria del partido.", "2024-07-06"),
            ("Portavoz en el Congreso", "Como portavoz del grupo popular en el Congreso, lidera la oposición parlamentaria al Gobierno de Sánchez con un estilo especialmente combativo.", "2023-12-01"),
        ],
        "pos": ("Oposición dura al Gobierno", "Pilota la estrategia de confrontación del PP con el Gobierno de Sánchez en el Congreso y la organización del partido, con un perfil duro y disciplinado.", ["pp", "oposicion"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +9/10) — Mano derecha en la organización y la estrategia parlamentaria del partido.", ["pp", "nota-+9", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -8/10) — Principal adversario en la batalla parlamentaria.", ["gobierno", "nota--8", "confrontacion"]),
        ],
    },
    "cuca-gamarra": {
        "cargo": "Vicesecretaria del PP", "partido": "pp", "ctag": "pp", "fuente": "https://www.pp.es",
        "nombre": "María de los Reyes «Cuca» Gamarra Ruiz-Clavijo", "alias": "Cuca Gamarra",
        "corta": "Dirigente del PP, exalcaldesa de Logroño, exportavoz en el Congreso y exsecretaria general del partido.",
        "perfil": "María de los Reyes «Cuca» Gamarra Ruiz-Clavijo (Logroño, 1974) es una dirigente del Partido Popular y una de las figuras de confianza de Alberto Núñez Feijóo. Exalcaldesa de Logroño, fue portavoz del grupo popular en el Congreso y secretaria general del PP en la primera etapa de Feijóo, ejerciendo de cara visible de la oposición al Gobierno de Sánchez. Mantiene un peso relevante en la dirección nacional del partido y en su representación institucional, con un perfil de gestión y moderación. Su trayectoria —de la alcaldía de una capital de provincia a la cúpula del partido— ilustra el modelo de dirigente territorial que Feijóo ha promovido en el PP.",
        "tray": [
            ("Alcaldesa de Logroño", "Desarrolló su carrera en el PP de La Rioja, siendo alcaldesa de Logroño, antes de dar el salto a la política nacional.", "2011-06-11"),
            ("Portavoz en el Congreso", "Fue portavoz del grupo parlamentario popular en el Congreso, ejerciendo de cara visible de la oposición al Gobierno de Sánchez.", "2020-01-01"),
            ("Secretaria general del PP", "Con la llegada de Feijóo, fue secretaria general del PP en su primera etapa, pilotando la reorganización del partido.", "2022-04-02"),
            ("Dirección nacional", "Mantiene su peso en la cúpula del PP como vicesecretaria y figura de confianza de la dirección, con responsabilidades institucionales y orgánicas.", "2024-07-06"),
        ],
        "pos": ("Centroderecha institucional", "Defiende la estrategia del PP de Feijóo, con un perfil institucional y de gestión dentro de la dirección nacional del partido.", ["pp", "oposicion"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Figura de confianza de la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
        ],
    },
    "borja-semper": {
        "cargo": "Portavoz nacional del PP", "partido": "pp", "ctag": "pp", "fuente": "https://www.pp.es",
        "nombre": "Borja Sémper Pascual", "alias": "Borja Sémper",
        "corta": "Portavoz nacional del PP; ala centrista y moderada del partido de Feijóo, con pasado en el PP vasco.",
        "perfil": "Borja Sémper Pascual (San Sebastián, 1976) es el portavoz nacional del Partido Popular y vicesecretario de Cultura del partido. Procedente del PP del País Vasco —donde fue dirigente en años especialmente duros del terrorismo de ETA, que lo amenazó—, encarna el ala más moderada y de centro del PP de Feijóo. Tras unos años fuera de la política, regresó para ejercer de portavoz, con un estilo dialogante y de perfil liberal-centrista que contrasta con el tono más duro de otros dirigentes del partido. Su regreso a la primera línea respondió a la voluntad de Feijóo de dotar al PP de un rostro moderado de cara al electorado de centro.",
        "tray": [
            ("Dirigente del PP vasco", "Lideró el PP en Gipuzkoa y fue parlamentario vasco en los años más duros del terrorismo de ETA, que lo amenazó, con un perfil de defensa del constitucionalismo.", "2004-01-01"),
            ("Salida y regreso", "Tras dejar temporalmente la primera línea política y pasar por el sector privado, regresó al PP de la mano de Alberto Núñez Feijóo.", "2018-01-01"),
            ("Portavoz nacional del PP", "Fue nombrado portavoz nacional del Partido Popular, ejerciendo de cara comunicativa del partido con un estilo dialogante y moderado.", "2023-07-01"),
            ("Ala centrista del PP", "Encarna el ala más centrista y liberal del PP de Feijóo, en ocasiones en contraste con el tono más combativo de otros dirigentes.", "2024-01-01"),
        ],
        "pos": ("Centrismo y moderación", "Defiende un PP de centro, dialogante y transversal, con un perfil liberal en lo cultural, dentro de la estrategia de Feijóo de ampliar el electorado del partido.", ["pp", "centro"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Portavoz y rostro comunicativo de su proyecto.", ["pp", "nota-+7", "alianza"]),
        ],
    },
    "esteban-gonzalez-pons": {
        "cargo": "Vicesecretario institucional del PP", "partido": "pp", "ctag": "pp", "fuente": "https://www.pp.es",
        "nombre": "Esteban González Pons", "alias": "Esteban González Pons",
        "corta": "Veterano dirigente del PP; vicesecretario institucional y negociador de la renovación del CGPJ.",
        "perfil": "Esteban González Pons (Valencia, 1964) es un veterano dirigente del Partido Popular, vicesecretario institucional del partido y una de sus voces más experimentadas. Abogado y de larga trayectoria, ha sido diputado nacional, eurodiputado y dirigente de máximo nivel desde la época de Mariano Rajoy, con un perfil de orador brillante y negociador. Bajo Feijóo ha pilotado asuntos institucionales clave, como la difícil negociación de la renovación del Consejo General del Poder Judicial con el PSOE, finalmente desbloqueada en 2024 con mediación europea. Considerado uno de los grandes oradores del partido, ha ejercido de puente del PP con las instituciones europeas en las grandes cuestiones de Estado.",
        "tray": [
            ("Carrera en el PP valenciano y nacional", "Abogado, desarrolló su carrera en el PP de Valencia y después a nivel nacional, siendo diputado y vicesecretario de comunicación del partido con Rajoy.", "2000-01-01"),
            ("Eurodiputado", "Fue durante años eurodiputado y dirigente del PP en el Parlamento Europeo, ganando peso en la política comunitaria y en el PPE.", "2014-07-01"),
            ("Vicesecretario institucional", "Con Feijóo, asumió la vicesecretaría institucional del PP, encargándose de las grandes negociaciones de Estado.", "2022-04-02"),
            ("La negociación del CGPJ", "Pilotó por parte del PP la negociación con el PSOE para la renovación del Consejo General del Poder Judicial, desbloqueada en 2024 con mediación de la Comisión Europea.", "2024-06-25"),
        ],
        "pos": ("Institucionalismo del PP", "Defiende un perfil institucional y de Estado, encargándose de las grandes negociaciones del PP con el Gobierno y de su política europea.", ["pp", "institucional"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Negociador institucional de máxima confianza de la dirección.", ["pp", "nota-+7", "alianza"]),
        ],
    },
    "jorge-buxade": {
        "cargo": "Vicepresidente de Acción Política de Vox", "partido": "vox", "ctag": "vox", "fuente": "https://www.voxespana.es",
        "nombre": "Jorge Buxadé Villalba", "alias": "Jorge Buxadé",
        "corta": "Vicepresidente de Acción Política de Vox y eurodiputado; principal ideólogo y estratega del partido.",
        "perfil": "Jorge Buxadé Villalba (Barcelona, 1975) es el vicepresidente de Acción Política de Vox y una de las figuras de máxima confianza de Santiago Abascal, además de eurodiputado. Abogado del Estado y de origen catalán, con un pasado político en la extrema derecha, se ha convertido en el principal ideólogo y estratega de Vox, con un discurso especialmente duro en inmigración, soberanía nacional y crítica a la Unión Europea, las autonomías y las agendas climática y de género. Su perfil jurídico y su radicalidad ideológica lo han convertido en el principal arquitecto del discurso y la estrategia de Vox, más allá de su faceta como eurodiputado.",
        "tray": [
            ("Abogado del Estado", "Abogado del Estado de profesión y de origen catalán, con un pasado político en la extrema derecha, desarrolló su carrera jurídica antes de incorporarse a Vox.", "2000-01-01"),
            ("Estratega de Vox", "Se integró en la dirección de Vox como uno de sus principales ideólogos y estrategas, encargado de la acción política del partido.", "2019-01-01"),
            ("Eurodiputado", "Fue cabeza de lista de Vox a las elecciones europeas y eurodiputado, vinculando al partido con la derecha radical europea.", "2019-05-26"),
            ("Línea dura", "Encarna la línea más dura e ideológica de Vox en inmigración, soberanía y crítica a la UE, las autonomías y las políticas climática y de género.", "2023-01-01"),
        ],
        "pos": ("Derecha radical ideológica", "Defiende la recentralización, el endurecimiento migratorio y la salida de la agenda «globalista», como principal estratega ideológico de Vox.", ["vox", "derecha-radical"]),
        "redes": [
            ("Santiago Abascal", "**Presidente de Vox** (nota +8/10) — Hombre de máxima confianza y principal estratega del partido.", ["vox", "nota-+8", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -8/10) — Oposición frontal desde la derecha radical.", ["gobierno", "nota--8", "confrontacion"]),
        ],
    },
    "ignacio-garriga": {
        "cargo": "Secretario general de Vox", "partido": "vox", "ctag": "vox", "fuente": "https://www.voxespana.es",
        "nombre": "Ignacio Garriga Vaz de Concicao", "alias": "Ignacio Garriga",
        "corta": "Secretario general de Vox y líder del partido en Cataluña; número dos de Abascal.",
        "perfil": "Ignacio Garriga Vaz de Concicao (Barcelona, 1987) es el secretario general de Vox y uno de los principales dirigentes del partido junto a Santiago Abascal. De origen catalán y con ascendencia guineana, odontólogo de profesión, se ha consolidado como número dos de Vox y como su rostro en Cataluña, donde lidera el partido. Ejerce de portavoz y organizador, con un discurso de defensa de la unidad de España y de oposición frontal al independentismo y al Gobierno de coalición. Su perfil joven y de origen catalán y guineano le da a Vox un rostro de relevo generacional, especialmente en Cataluña.",
        "tray": [
            ("Odontólogo y activismo", "Odontólogo de profesión, se vinculó al activismo y a la política de la mano de Vox en Cataluña, con un perfil de defensa del constitucionalismo.", "2018-01-01"),
            ("Líder de Vox en Cataluña", "Encabezó las candidaturas de Vox en Cataluña, dando al partido representación en el Parlament y en el Congreso por Barcelona.", "2021-02-14"),
            ("Secretario general de Vox", "Asumió la secretaría general de Vox, convirtiéndose en el número dos del partido y en uno de sus principales organizadores y portavoces.", "2020-01-01"),
            ("Rostro de Vox", "Ejerce de cara visible del partido en debates y campañas, con un discurso de unidad de España y oposición al independentismo y al Gobierno.", "2023-01-01"),
        ],
        "pos": ("Unidad de España y oposición", "Defiende la unidad de España, el constitucionalismo frente al independentismo y la oposición frontal al Gobierno de coalición, como número dos de Vox.", ["vox", "derecha-radical"]),
        "redes": [
            ("Santiago Abascal", "**Presidente de Vox** (nota +8/10) — Número dos del partido y hombre de su confianza.", ["vox", "nota-+8", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -8/10) — Oposición frontal desde la derecha radical.", ["gobierno", "nota--8", "confrontacion"]),
        ],
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
        "tags": ["politico", d["partido"], "lider-nacional", d["ctag"]],
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
    nuevos = [build_dossier(s, d) for s, d in LID.items() if not d.get("patch")]
    json.dump(nuevos, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"  escrito: {OUT.name} · {len(nuevos)} líderes nacionales")
    for s, d in LID.items():
        if d.get("patch") and patch_entry(s, d):
            print(f"  parcheado: {d['file'].name} · {s}")
    print(f"OK · {len(LID)} líderes nacionales")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
