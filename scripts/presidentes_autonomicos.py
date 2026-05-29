#!/usr/bin/env python3
"""scripts/presidentes_autonomicos.py

Crea/actualiza los dosieres detallados de los 17 presidentes autonómicos
(las 17 comunidades), al nivel "Quién es" + "Trayectoria" del resto de figuras.

- Los 16 que NO existían se escriben como dosieres completos nuevos en
  data/poder/figuras_clave_7.json (fuente "poder" del gen_subfixture).
- Andalucía (Juan Manuel Moreno Bonilla) YA existe en
  data/diputaciones/complementos.json: se enriquece in situ (esa es la
  entrada que gana en la página de detalle).

Roster verificado (mayo 2026): incluye el relevo de Mazón por Pérez Llorca
en la Comunidad Valenciana (dic. 2025) y la reinvestidura de Guardiola en
Extremadura (abr. 2026, tras las anticipadas del 21-D-2025).

Tono factual; fuentes públicas; presunción de inocencia en causas abiertas.

Uso:  python3 scripts/presidentes_autonomicos.py \
      && python3 bin/gen_subfixture.py --source poder \
      && python3 bin/gen_subfixture.py --source diputaciones
"""
from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT_PODER = REPO / "data" / "poder" / "figuras_clave_7.json"
COMPLEMENTOS = REPO / "data" / "diputaciones" / "complementos.json"

# slug -> datos. partido: tag corto. tray: [(titulo, contenido, fecha)].
# pos: (titulo, contenido, [tags]). redes: [(titulo_resoluble, contenido, [tags])].
PRES: dict[str, dict] = {
    "juan-manuel-moreno-bonilla": {  # ANDALUCÍA · se PARCHEA en complementos.json
        "patch": True,
        "perfil": "Juan Manuel Moreno Bonilla, «Juanma Moreno» (Barcelona, 1970), es presidente de la Junta de Andalucía desde 2019 y líder del PP andaluz. Rompió 37 años de hegemonía socialista en Andalucía y en 2022 revalidó el cargo con una mayoría absoluta histórica para el centroderecha. Representa un perfil moderado y centrista —el llamado «morenismo»— que ha convertido a Andalucía en el gran bastión territorial del Partido Popular. Gobierna la comunidad más poblada de España y su éxito electoral lo ha hecho un activo nacional del partido y un referente de su ala más centrada y de gestión, alejada de la confrontación.",
        "tray": [
            ("Inicios en Málaga", "Criado en Málaga, militó desde joven en Nuevas Generaciones del PP y fue concejal del Ayuntamiento de Málaga, escalando en la estructura provincial del partido.", "2000-01-01"),
            ("Diputado y alto cargo", "Fue diputado en el Congreso y secretario de Estado de Servicios Sociales con Mariano Rajoy, antes de ser designado para liderar y reconstruir el PP en Andalucía.", "2011-01-01"),
            ("La conquista de Andalucía", "Tras las elecciones de 2018, lideró un cambio histórico al desalojar al PSOE de la Junta después de 37 años, gobernando primero en coalición con Ciudadanos y con el apoyo externo de Vox.", "2019-01-16"),
            ("Mayoría absoluta y moderación", "En 2022 logró una mayoría absoluta sin precedentes para el PP en Andalucía, consolidando un perfil centrista y de gestión que lo ha situado entre las figuras de mayor peso del partido a nivel nacional.", "2022-06-19"),
        ],
        "pos": ("Moderación y autonomismo", "Defiende un PP de centro, pragmático y de gestión; reivindica la financiación autonómica y los intereses de Andalucía (agua, infraestructuras) y mantiene una confrontación moderada con el Gobierno de Sánchez, evitando la estridencia.", ["pp", "andalucia"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Barón territorial clave, leal a la dirección nacional aunque con peso y perfil propios.", ["pp", "nota-+7", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -5/10) — Confrontación por la financiación autonómica y el agua, con un tono más institucional que otros barones del PP.", ["gobierno", "nota--5", "tension"]),
        ],
    },
    "jorge-azcon": {
        "comunidad": "Aragón", "cargo": "Presidente de Aragón", "partido": "pp",
        "ctag": "aragon", "fuente": "https://www.aragon.es",
        "nombre": "Jorge Azcón Navarro", "alias": "Jorge Azcón",
        "corta": "Presidente de Aragón (PP) desde 2023 y exalcalde de Zaragoza; gobierna en coalición con Vox.",
        "perfil": "Jorge Azcón Navarro (Zaragoza, 1973) es presidente de Aragón desde 2023 y líder del PP aragonés. Abogado y exalcalde de Zaragoza, alcanzó la presidencia autonómica tras las elecciones de 2023 gobernando en coalición con Vox, una alianza que después atravesó tensiones. Representa el ala de gestión del Partido Popular en el valle del Ebro. Llegó a la política autonómica desde la alcaldía de la capital y debe equilibrar la gestión con las exigencias de su socio Vox en una comunidad clave por el agua, la logística y la energía.",
        "tray": [
            ("Concejal y abogado", "Abogado de formación, desarrolló su carrera en el PP de Zaragoza, ocupando concejalías y responsabilidades en el partido a nivel municipal y autonómico.", "2003-01-01"),
            ("Alcalde de Zaragoza", "En 2019 fue elegido alcalde de Zaragoza, arrebatando la capital aragonesa a la izquierda, con una gestión de perfil moderado centrada en la ciudad.", "2019-06-15"),
            ("Presidente de Aragón", "Tras las elecciones autonómicas de 2023 fue investido presidente de Aragón gracias a un pacto de coalición con Vox, uno de los gobiernos PP-Vox surgidos de aquellos comicios.", "2023-08-11"),
            ("Gestión y tensiones con Vox", "Su mandato ha combinado la gestión autonómica (agua, agricultura, despoblación) con las tensiones derivadas de la coalición con Vox, que en distintos territorios rompió con el PP.", "2024-01-01"),
        ],
        "pos": ("Aragonesismo y agua", "Defiende los intereses de Aragón en agua, infraestructuras y lucha contra la despoblación, con un perfil de gestión dentro de la órbita moderada del PP.", ["pp", "aragon"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
            ("Santiago Abascal", "**Líder de Vox** (nota -3/10) — Socio de gobierno en Aragón, en una relación tensa marcada por las rupturas de coaliciones PP-Vox.", ["vox", "nota--3", "tension"]),
        ],
    },
    "adrian-barbon": {
        "comunidad": "Asturias", "cargo": "Presidente del Principado de Asturias", "partido": "psoe",
        "ctag": "asturias", "fuente": "https://www.asturias.es",
        "nombre": "Adrián Barbón Rodríguez", "alias": "Adrián Barbón",
        "corta": "Presidente del Principado de Asturias (PSOE) desde 2019; perfil obrero de la cuenca minera, leal a la dirección federal.",
        "perfil": "Adrián Barbón Rodríguez (Laviana, 1978) es presidente del Principado de Asturias desde 2019 y líder de la FSA-PSOE. Procedente de la cuenca minera, encarna un socialismo asturiano de raíz obrera y se ha consolidado como uno de los barones del PSOE, leal a la dirección federal de Pedro Sánchez. Es conocido por su cercanía y por gobernar habitualmente en minoría o en coalición con la izquierda. Hombre de partido y de fuerte arraigo en la cuenca minera, ha hecho de la defensa de la sanidad pública, la industria y las infraestructuras de Asturias sus prioridades, con un estilo cercano y una activa presencia pública.",
        "tray": [
            ("De la cuenca minera a la política", "Nacido en la cuenca del Nalón, militó desde joven en las Juventudes Socialistas y fue alcalde de su localidad, Laviana, forjando un perfil de político de proximidad.", "2007-06-16"),
            ("Líder de la FSA-PSOE", "En 2017 ganó las primarias de la Federación Socialista Asturiana, renovando el liderazgo del PSOE asturiano.", "2017-09-01"),
            ("Presidente de Asturias", "Encabezó la candidatura socialista en 2019 y fue investido presidente del Principado, en una comunidad con retos de despoblación, industria y transición energética de las comarcas mineras.", "2019-07-20"),
            ("Reelección y agenda industrial", "Revalidó el cargo en 2023, centrando su gestión en la defensa de la industria asturiana (acero, energía), la transición justa y la sanidad pública.", "2023-07-15"),
        ],
        "pos": ("Socialismo industrial y lealtad federal", "Defiende la industria y la transición justa de las comarcas mineras y mantiene una lealtad clara a la dirección federal de Pedro Sánchez, dentro del ala más clásica del PSOE.", ["psoe", "asturias"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Barón leal a la dirección federal del partido.", ["psoe", "nota-+7", "alianza"]),
        ],
    },
    "marga-prohens": {
        "comunidad": "Islas Baleares", "cargo": "Presidenta del Govern de las Islas Baleares", "partido": "pp",
        "ctag": "baleares", "fuente": "https://www.caib.es",
        "nombre": "Margalida Prohens Rigo", "alias": "Marga Prohens",
        "corta": "Presidenta del Govern de las Islas Baleares (PP) desde 2023; gobierna en solitario con apoyo de Vox.",
        "perfil": "Margalida «Marga» Prohens Rigo (Campos, Mallorca, 1982) es presidenta del Govern de las Islas Baleares desde 2023 y líder del PP balear. Joven dirigente, recuperó el Govern para el centroderecha tras la etapa de Francina Armengol, gobernando en solitario con el apoyo parlamentario de Vox. Representa el relevo generacional del Partido Popular en las islas. Una de las presidentas autonómicas más jóvenes, afronta los grandes desafíos del archipiélago —la presión turística, la emergencia de vivienda y la gestión del agua— y reivindica un trato fiscal acorde con el hecho insular para unas islas que reciben millones de visitantes al año.",
        "tray": [
            ("De Nuevas Generaciones al Parlament", "Filóloga de formación, hizo carrera en el PP balear desde Nuevas Generaciones, llegando a portavoz parlamentaria y a diputada en el Congreso.", "2011-01-01"),
            ("Liderazgo del PP balear", "Asumió el liderazgo del PP de Baleares, reconstruyendo el partido tras los años de gobiernos de izquierdas de Francina Armengol.", "2021-04-01"),
            ("Presidenta del Govern", "Ganó las elecciones de 2023 y fue investida presidenta del Govern balear, gobernando en solitario el PP con el apoyo externo de Vox.", "2023-07-10"),
            ("Turismo y vivienda", "Su gestión afronta los grandes retos de las islas: la masificación turística, el acceso a la vivienda, el agua y el equilibrio entre desarrollo y sostenibilidad.", "2024-01-01"),
        ],
        "pos": ("Centroderecha insular", "Defiende un modelo económico ligado al turismo, con medidas sobre vivienda y saturación, y reivindica la financiación y el hecho insular ante el Estado.", ["pp", "baleares"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineada con la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -5/10) — Confrontación por financiación, vivienda e inmigración.", ["gobierno", "nota--5", "tension"]),
        ],
    },
    "fernando-clavijo": {
        "comunidad": "Canarias", "cargo": "Presidente de Canarias", "partido": "coalicion-canaria",
        "ctag": "canarias", "fuente": "https://www.gobiernodecanarias.org",
        "nombre": "Fernando Clavijo Batlle", "alias": "Fernando Clavijo",
        "corta": "Presidente de Canarias (Coalición Canaria) desde 2023, ya lo fue 2015-2019; gobierna con el PP.",
        "perfil": "Fernando Clavijo Batlle (San Cristóbal de La Laguna, 1971) es presidente de Canarias desde 2023 y líder de Coalición Canaria (CC). Ya había presidido el archipiélago entre 2015 y 2019. Nacionalista canario de perfil pragmático, gobierna en coalición con el PP y ejerce de bisagra capaz de pactar con los grandes partidos estatales en defensa de los intereses insulares. Economista y exalcalde de La Laguna, conoce bien el doble juego de la política canaria: pacta con el PP en las islas y, a la vez, negocia con el Gobierno central de Sánchez asuntos como la inmigración, el REF y la financiación del archipiélago.",
        "tray": [
            ("Alcalde de La Laguna", "Economista, fue alcalde de San Cristóbal de La Laguna, una de las principales ciudades de Tenerife, antes de dar el salto a la política autonómica.", "2008-01-01"),
            ("Primera presidencia de Canarias", "Presidió el Gobierno de Canarias entre 2015 y 2019 al frente de Coalición Canaria, en una etapa de pactos cambiantes.", "2015-07-09"),
            ("Senador y líder de CC", "Tras perder la presidencia fue senador y consolidó su liderazgo en Coalición Canaria, manteniendo el peso del nacionalismo canario.", "2019-01-01"),
            ("Regreso a la presidencia", "Volvió a la presidencia de Canarias en 2023 en coalición con el PP, con la inmigración (la crisis de los cayucos y los menores no acompañados) y la financiación como grandes asuntos de su mandato.", "2023-07-14"),
        ],
        "pos": ("Nacionalismo canario pragmático", "Defiende los intereses del archipiélago (REF, insularidad, inmigración) negociando con quien gobierne en Madrid, en una posición de bisagra entre los grandes bloques.", ["coalicion-canaria", "canarias"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +3/10) — Relación pragmática: pactos puntuales en Madrid (p. ej. en inmigración y financiación) pese a gobernar con el PP en Canarias.", ["gobierno", "nota-+3", "pragmatico"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +5/10) — Socio de gobierno del PP en el archipiélago canario.", ["pp", "nota-+5", "alianza"]),
        ],
    },
    "maria-jose-saenz-de-buruaga": {
        "comunidad": "Cantabria", "cargo": "Presidenta de Cantabria", "partido": "pp",
        "ctag": "cantabria", "fuente": "https://www.cantabria.es",
        "nombre": "María José Sáenz de Buruaga Gómez", "alias": "María José Sáenz de Buruaga",
        "corta": "Presidenta de Cantabria (PP) desde 2023; puso fin a la larga etapa de Revilla (PRC).",
        "perfil": "María José Sáenz de Buruaga Gómez (Santander, 1971) es presidenta de Cantabria desde 2023 y líder del PP cántabro. Puso fin a la larga etapa de Miguel Ángel Revilla (PRC) al frente de la comunidad, logrando una mayoría que permitió al PP gobernar en solitario. Representa el regreso del centroderecha al poder en Cantabria. Jurista y veterana dirigente del PP cántabro, gobierna una comunidad pequeña pero estratégica del Cantábrico, donde ha hecho de la sanidad, la reactivación industrial y la reclamación de infraestructuras ferroviarias y de comunicaciones al Estado los ejes de su mandato.",
        "tray": [
            ("Jurista y política", "Licenciada en Derecho, desarrolló su carrera en el PP de Cantabria, ocupando consejerías en anteriores gobiernos autonómicos y la portavocía parlamentaria.", "2003-01-01"),
            ("Líder de la oposición", "Asumió el liderazgo del PP cántabro y ejerció de jefa de la oposición frente a los gobiernos de Miguel Ángel Revilla.", "2019-01-01"),
            ("Presidenta de Cantabria", "Ganó las elecciones de 2023, desbancando al PRC de Revilla, y fue investida presidenta de Cantabria gobernando en solitario el PP.", "2023-07-01"),
            ("Gestión autonómica", "Su mandato se centra en la sanidad, las infraestructuras (el tren, las comunicaciones) y el desarrollo industrial de una comunidad pequeña pero estratégica del norte.", "2024-01-01"),
        ],
        "pos": ("Centroderecha y reivindicación de inversiones", "Defiende una gestión de centroderecha y reclama inversiones e infraestructuras del Estado (especialmente ferroviarias) para Cantabria.", ["pp", "cantabria"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineada con la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -5/10) — Confrontación por las inversiones e infraestructuras pendientes.", ["gobierno", "nota--5", "tension"]),
        ],
    },
    "emiliano-garcia-page": {
        "comunidad": "Castilla-La Mancha", "cargo": "Presidente de Castilla-La Mancha", "partido": "psoe",
        "ctag": "castilla-la-mancha", "fuente": "https://www.castillalamancha.es",
        "nombre": "Emiliano García-Page Sánchez", "alias": "Emiliano García-Page",
        "corta": "Presidente de Castilla-La Mancha (PSOE) desde 2015, con mayoría absoluta; el barón socialista más crítico con Sánchez.",
        "perfil": "Emiliano García-Page Sánchez (Toledo, 1968) es presidente de Castilla-La Mancha desde 2015 y uno de los barones más influyentes y críticos del PSOE. Reelegido en 2023 con mayoría absoluta, encarna el ala socialista más díscola con Pedro Sánchez: rechaza abiertamente los pactos con el independentismo y la amnistía, lo que lo convierte en una voz interna incómoda para Moncloa. Con tres mandatos a sus espaldas y una sólida implantación territorial, defiende un perfil moderado y «de Estado» y reivindica el agua, la financiación y el peso de la España interior frente a la del litoral.",
        "tray": [
            ("Alcalde de Toledo", "Abogado y veterano dirigente socialista, fue alcalde de Toledo durante una década, ciudad de la que es figura emblemática.", "2007-06-16"),
            ("Presidente de Castilla-La Mancha", "Recuperó la Junta de Comunidades para el PSOE en 2015, desbancando a María Dolores de Cospedal (PP), y gobernó primero en pactos con Podemos.", "2015-07-03"),
            ("Mayoría absoluta", "En 2019 y, sobre todo, en 2023, revalidó el cargo con mayoría absoluta, consolidando un fuerte liderazgo personal en la región a contracorriente de la tendencia general.", "2023-06-30"),
            ("El barón crítico", "Se ha erigido en la principal voz crítica interna del PSOE contra los pactos de Sánchez con ERC, Junts y EH Bildu y contra la ley de amnistía, marcando distancias públicas con la dirección federal.", "2023-11-01"),
        ],
        "pos": ("Socialismo crítico con Sánchez", "Defiende un PSOE «constitucionalista», contrario a la amnistía y a la dependencia del independentismo; reivindica el agua y los intereses de Castilla-La Mancha frente a otros territorios.", ["psoe", "castilla-la-mancha"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota -4/10) — Lealtad orgánica pero enfrentamiento público y permanente por los pactos con el independentismo y la amnistía.", ["psoe", "nota--4", "tension-interna"]),
        ],
    },
    "alfonso-fernandez-manueco": {
        "comunidad": "Castilla y León", "cargo": "Presidente de la Junta de Castilla y León", "partido": "pp",
        "ctag": "castilla-y-leon", "fuente": "https://www.jcyl.es",
        "nombre": "Alfonso Fernández Mañueco", "alias": "Alfonso Fernández Mañueco",
        "corta": "Presidente de Castilla y León (PP) desde 2019; formó el primer gobierno PP-Vox de España, roto en 2024.",
        "perfil": "Alfonso Fernández Mañueco (Salamanca, 1965) es presidente de la Junta de Castilla y León desde 2019 y líder del PP regional. Abogado y exalcalde de Salamanca, en 2022 adelantó elecciones y formó el primer gobierno autonómico de coalición entre el PP y Vox en España, que se rompió en 2024, pasando a gobernar en minoría. Político veterano y de perfil discreto, gobierna la comunidad más extensa de España, marcada por la dispersión y el envejecimiento; ha hecho de la sanidad rural, la agricultura, la ganadería y la lucha contra la despoblación los ejes de su gestión.",
        "tray": [
            ("Alcalde de Salamanca", "Abogado, desarrolló una larga carrera en el PP de Castilla y León, siendo alcalde de Salamanca y ocupando consejerías en la Junta.", "2011-06-11"),
            ("Presidente de la Junta", "Tras las elecciones de 2019 fue investido presidente de Castilla y León en coalición con Ciudadanos.", "2019-07-16"),
            ("El primer gobierno PP-Vox", "En 2022 adelantó las elecciones y, tras ganarlas, formó el primer ejecutivo autonómico de coalición PP-Vox de España, un experimento muy observado a nivel nacional.", "2022-04-19"),
            ("Ruptura y minoría", "En 2024, la salida de Vox del Gobierno —en el marco de la crisis nacional de las coaliciones— lo dejó gobernando en minoría, centrado en la despoblación, la sanidad rural y la agricultura.", "2024-07-01"),
        ],
        "pos": ("Gestión del medio rural", "Defiende los intereses del mundo rural y agrario, la lucha contra la despoblación de la «España vaciada» y una gestión de centroderecha.", ["pp", "castilla-y-leon"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
            ("Santiago Abascal", "**Líder de Vox** (nota -3/10) — Exsocio de coalición; la ruptura de 2024 enfrió la relación.", ["vox", "nota--3", "tension"]),
        ],
    },
    "salvador-illa": {
        "comunidad": "Cataluña", "cargo": "Presidente de la Generalitat de Cataluña", "partido": "psc",
        "ctag": "cataluna", "fuente": "https://www.gencat.cat",
        "nombre": "Salvador Illa Roca", "alias": "Salvador Illa",
        "corta": "Presidente de la Generalitat de Cataluña (PSC) desde agosto de 2024; exministro de Sanidad de la pandemia.",
        "perfil": "Salvador Illa Roca (La Roca del Vallès, 1966) es presidente de la Generalitat de Cataluña desde agosto de 2024 y líder del PSC. Exministro de Sanidad durante la pandemia, ganó las elecciones catalanas de 2024 y puso fin a más de una década de presidentes independentistas, abriendo una etapa de «normalización» tras el procés, con el apoyo parlamentario de ERC y los comunes. De perfil sereno y negociador, ha apostado por la estabilidad, la gestión y la reconciliación tras una década de conflicto, reivindicando inversiones, una financiación singular y la recuperación del peso económico e institucional de Cataluña.",
        "tray": [
            ("Del municipalismo al PSC", "Filósofo de formación, desarrolló una larga carrera en el PSC desde el municipalismo (fue alcalde de La Roca del Vallès) y la gestión orgánica del partido.", "1995-01-01"),
            ("Ministro de Sanidad", "Fue ministro de Sanidad del Gobierno de Pedro Sánchez durante la pandemia de COVID-19 (2020-2021), el rostro institucional de la gestión de la crisis sanitaria.", "2020-01-13"),
            ("Líder de la oposición catalana", "Tras ganar en escaños las elecciones de 2021 sin poder gobernar, lideró la oposición en el Parlament y reconstruyó el PSC como alternativa al bloque independentista.", "2021-02-14"),
            ("Presidente de la Generalitat", "Ganó las elecciones de 2024 y fue investido presidente en agosto, el primer socialista al frente de la Generalitat desde Montilla, con un discurso de reencuentro y de gestión tras los años del procés.", "2024-08-10"),
        ],
        "pos": ("Normalización y catalanismo no soberanista", "Defiende un catalanismo no independentista, la reconciliación tras el procés y la financiación singular de Cataluña, en estrecha relación con el Gobierno de Sánchez.", ["psc", "cataluna"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +8/10) — Aliado estratégico clave; su investidura y la del propio Sánchez se sostienen en la misma arquitectura de pactos.", ["psoe", "nota-+8", "alianza"]),
        ],
    },
    "maria-guardiola": {
        "comunidad": "Extremadura", "cargo": "Presidenta de la Junta de Extremadura", "partido": "pp",
        "ctag": "extremadura", "fuente": "https://www.juntaex.es",
        "nombre": "María Guardiola Martín", "alias": "María Guardiola",
        "corta": "Presidenta de la Junta de Extremadura (PP) desde 2023; reinvestida en abril de 2026 con Vox tras las anticipadas de diciembre de 2025.",
        "perfil": "María Guardiola Martín (Cáceres, 1980) es presidenta de la Junta de Extremadura y líder del PP extremeño. Llegó al poder en 2023 desalojando al PSOE de Guillermo Fernández Vara y, tras un primer mandato en minoría, convocó elecciones anticipadas en diciembre de 2025, que ganó, siendo reinvestida en abril de 2026 en coalición con Vox. Representa el cambio político en una región históricamente socialista. De carácter directo, protagonizó en 2023 un sonado pulso público sobre si pactar o no con Vox, antes de acabar gobernando con su apoyo; ha hecho del agua, la agricultura, las infraestructuras y la convergencia económica de Extremadura sus prioridades.",
        "tray": [
            ("Irrupción en el PP extremeño", "Procedente del ámbito de la gestión, irrumpió en la política autonómica liderando el PP de Extremadura y dándole un perfil renovado.", "2021-01-01"),
            ("Presidenta por el cambio", "En las elecciones de 2023 logró desbancar al PSOE tras décadas de hegemonía socialista, accediendo a la presidencia de la Junta de Extremadura.", "2023-07-14"),
            ("Elecciones anticipadas de 2025", "Ante la dificultad para aprobar los presupuestos, convocó elecciones anticipadas el 21 de diciembre de 2025, en las que el PP mejoró sus resultados (29 escaños).", "2025-12-21"),
            ("Reinvestidura con Vox", "Fue reinvestida presidenta en abril de 2026 gracias a un acuerdo de gobierno con Vox, consolidando el giro al centroderecha de Extremadura.", "2026-04-16"),
        ],
        "pos": ("Cambio y desarrollo de Extremadura", "Defiende el desarrollo económico, la agricultura, el agua y las infraestructuras de Extremadura —una de las regiones de menor renta— desde una óptica de centroderecha.", ["pp", "extremadura"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineada con la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
            ("Santiago Abascal", "**Líder de Vox** (nota +4/10) — Socio de gobierno tras la reinvestidura de 2026.", ["vox", "nota-+4", "alianza"]),
        ],
    },
    "alfonso-rueda": {
        "comunidad": "Galicia", "cargo": "Presidente de la Xunta de Galicia", "partido": "pp",
        "ctag": "galicia", "fuente": "https://www.xunta.gal",
        "nombre": "Alfonso Rueda Valenzuela", "alias": "Alfonso Rueda",
        "corta": "Presidente de la Xunta de Galicia (PP) desde 2022; revalidó la mayoría absoluta en 2024. Sucesor de Feijóo.",
        "perfil": "Alfonso Rueda Valenzuela (Pontevedra, 1968) es presidente de la Xunta de Galicia desde 2022 y líder del PPdeG. Sucedió a Alberto Núñez Feijóo cuando este dio el salto a la política nacional, y en febrero de 2024 revalidó la mayoría absoluta del PP en Galicia, demostrando la solidez del feudo gallego del partido. Representa la continuidad del «feijoísmo» en clave de gestión. De perfil discreto y gestor, ha sabido mantener la hegemonía absoluta del PP en su feudo histórico, defendiendo la industria gallega (automoción, naval, textil), el sector primario (pesca, lácteo) y el autogobierno de la comunidad.",
        "tray": [
            ("La carrera en la Xunta", "Abogado y funcionario, desarrolló su carrera en el PP gallego ocupando consejerías clave y la vicepresidencia de la Xunta durante los gobiernos de Feijóo.", "2009-01-01"),
            ("Mano derecha de Feijóo", "Como vicepresidente y secretario general del PPdeG, fue el hombre de confianza de Alberto Núñez Feijóo en la gestión del Gobierno gallego.", "2012-01-01"),
            ("Presidente de la Xunta", "En 2022 sucedió a Feijóo al frente de la Xunta cuando este asumió el liderazgo nacional del PP, garantizando la continuidad del proyecto.", "2022-05-14"),
            ("Mayoría absoluta propia", "En febrero de 2024 revalidó la mayoría absoluta del PP en Galicia con perfil propio, confirmando a la comunidad como el gran bastión histórico del partido.", "2024-02-18"),
        ],
        "pos": ("Galleguismo de gestión", "Defiende el autogobierno gallego, la industria (automoción, naval, energía), el sector primario y una gestión de centroderecha continuista respecto a la etapa de Feijóo.", ["pp", "galicia"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +9/10) — Mentor político directo: Rueda fue su número dos y su sucesor en la Xunta.", ["pp", "nota-+9", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -5/10) — Confrontación por inversiones, industria y financiación.", ["gobierno", "nota--5", "tension"]),
        ],
    },
    "gonzalo-capellan": {
        "comunidad": "La Rioja", "cargo": "Presidente de La Rioja", "partido": "pp",
        "ctag": "la-rioja", "fuente": "https://www.larioja.org",
        "nombre": "Gonzalo Capellán de Miguel", "alias": "Gonzalo Capellán",
        "corta": "Presidente de La Rioja (PP) desde 2023; catedrático de Historia. Gobierna con apoyo de Vox.",
        "perfil": "Gonzalo Capellán de Miguel es presidente de La Rioja desde 2023 y líder del PP riojano. Historiador y catedrático universitario, recuperó el Gobierno de la pequeña comunidad para el centroderecha tras la etapa socialista de Concha Andreu, gobernando con el apoyo de Vox. Representa un perfil técnico y académico al frente de la autonomía. Catedrático de Historia Contemporánea, aporta un bagaje intelectual poco habitual entre los presidentes autonómicos; gobierna una de las comunidades menos pobladas de España y centra su gestión en el vino de Rioja, la agricultura, la sanidad y la reclamación de infraestructuras y financiación.",
        "tray": [
            ("Académico e historiador", "Catedrático de Historia Contemporánea, combinó la carrera universitaria con la gestión cultural y educativa antes de dar el salto a la primera línea política.", "2000-01-01"),
            ("Alto cargo y gestión", "Ocupó responsabilidades en el ámbito de la educación y la cultura, vinculándose al proyecto del PP en distintas administraciones.", "2011-01-01"),
            ("Candidato del PP riojano", "Lideró la candidatura del PP de La Rioja en 2023 frente al Gobierno socialista de Concha Andreu.", "2023-05-28"),
            ("Presidente de La Rioja", "Fue investido presidente de La Rioja en 2023, con el apoyo de Vox, centrando su gestión en el vino, la agricultura, la sanidad y las infraestructuras de la comunidad.", "2023-07-01"),
        ],
        "pos": ("Gestión de una comunidad pequeña", "Defiende los intereses de La Rioja (vino, agua, financiación) y una gestión de centroderecha en una de las comunidades menos pobladas.", ["pp", "la-rioja"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -5/10) — Confrontación por financiación e inversiones.", ["gobierno", "nota--5", "tension"]),
        ],
    },
    "isabel-diaz-ayuso": {
        "comunidad": "Madrid", "cargo": "Presidenta de la Comunidad de Madrid", "partido": "pp",
        "ctag": "madrid", "fuente": "https://www.comunidad.madrid",
        "nombre": "Isabel Díaz Ayuso", "alias": "Isabel Díaz Ayuso",
        "corta": "Presidenta de la Comunidad de Madrid (PP) desde 2019; la dirigente más mediática del PP, en confrontación frontal con Sánchez.",
        "perfil": "Isabel Díaz Ayuso (Madrid, 1978) es presidenta de la Comunidad de Madrid desde 2019 y la dirigente más influyente y mediática del PP tras Feijóo. Reelegida en 2021 y 2023 con resultados arrolladores (rozando la mayoría absoluta), encarna un liberalismo de confrontación frontal con el Gobierno de Sánchez. Su figura, de enorme proyección nacional, genera tanto fervor en su electorado como rechazo en la izquierda. Convertida en la gran estrella mediática del PP, ha hecho de Madrid un laboratorio de bajadas de impuestos y de su discurso de «libertad» una marca política con eco nacional, en permanente choque con el Gobierno y con peso propio dentro de su partido.",
        "tray": [
            ("De la comunicación al partido", "Periodista de formación, desarrolló su carrera en la comunicación del PP de Madrid, con un perfil discreto hasta su salto a la primera línea.", "2011-01-01"),
            ("Presidenta sorpresa", "En 2019 fue la candidata del PP en Madrid y, pese a un resultado ajustado, logró la presidencia con el apoyo de Ciudadanos y Vox, iniciando un giro liberal.", "2019-08-14"),
            ("El fenómeno electoral", "Su gestión de la pandemia, marcada por la defensa de la hostelería y el lema «libertad», la catapultó: en 2021 arrasó y en 2023 rozó la mayoría absoluta, convirtiéndose en un fenómeno electoral.", "2021-05-04"),
            ("Pulso permanente con Moncloa", "Ha hecho de la confrontación con el Gobierno de Pedro Sánchez su seña de identidad —fiscalidad, sanidad, vivienda, inmigración—, con un peso e influencia que trascienden Madrid y tensionan a veces a la propia dirección del PP.", "2023-05-28"),
        ],
        "pos": ("Liberalismo de confrontación", "Defiende bajadas de impuestos, la sanidad y educación concertadas y un discurso de «libertad» frente al intervencionismo; la confrontación con Sánchez y el «sanchismo» es el eje de su proyección nacional.", ["pp", "madrid"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -9/10) — Adversaria política frontal; la confrontación con el «sanchismo» es el centro de su estrategia.", ["gobierno", "nota--9", "confrontacion"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +3/10) — Relación compleja: misma sigla pero con tensiones de liderazgo, peso y estrategia dentro del partido.", ["pp", "nota-+3", "tension-interna"]),
        ],
    },
    "fernando-lopez-miras": {
        "comunidad": "Región de Murcia", "cargo": "Presidente de la Región de Murcia", "partido": "pp",
        "ctag": "murcia", "fuente": "https://www.carm.es",
        "nombre": "Fernando López Miras", "alias": "Fernando López Miras",
        "corta": "Presidente de la Región de Murcia (PP) desde 2017; bandera del trasvase Tajo-Segura. Gobierna con Vox.",
        "perfil": "Fernando López Miras (Lorca, 1983) es presidente de la Región de Murcia desde 2017 y líder del PP murciano. Uno de los presidentes autonómicos más jóvenes, ha resistido sucesivas convulsiones políticas (mociones de censura, pactos) y revalidó el cargo en 2023, gobernando con Vox. Representa un bastión del centroderecha en el sureste peninsular. Pese a su juventud, es ya uno de los presidentes autonómicos con más años en el cargo; ha hecho de la defensa del trasvase Tajo-Segura, la agricultura de regadío y los intereses hídricos de Murcia el centro de su acción política, en choque permanente con la política del agua del Gobierno.",
        "tray": [
            ("Ascenso rápido en el PP", "Licenciado en Derecho, tuvo un ascenso meteórico en el PP de Murcia, llegando a la presidencia regional muy joven, en 2017, tras la salida de su predecesor.", "2017-04-04"),
            ("Resistir las crisis", "Sorteó intentos de moción de censura y la inestabilidad de los pactos durante la legislatura, manteniéndose al frente de la Comunidad.", "2019-01-01"),
            ("Revalidación en 2023", "Ganó las elecciones de 2023 y fue investido con el apoyo de Vox, con quien formó gobierno de coalición en la Región.", "2023-07-01"),
            ("Agua y agricultura", "Su gestión gira en torno a la defensa del trasvase Tajo-Segura y los intereses agrícolas e hídricos de Murcia, en permanente conflicto con el Gobierno central por la política del agua.", "2024-01-01"),
        ],
        "pos": ("Defensa del agua y el trasvase", "Hace de la defensa del trasvase Tajo-Segura y de la agricultura del sureste su bandera, en confrontación directa con el Gobierno de Sánchez por la política hídrica.", ["pp", "murcia"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota -6/10) — Conflicto frontal por el trasvase Tajo-Segura y la política del agua.", ["gobierno", "nota--6", "tension"]),
        ],
    },
    "maria-chivite": {
        "comunidad": "Navarra", "cargo": "Presidenta de la Comunidad Foral de Navarra", "partido": "psoe",
        "ctag": "navarra", "fuente": "https://www.navarra.es",
        "nombre": "María Chivite Navascués", "alias": "María Chivite",
        "corta": "Presidenta de Navarra (PSN-PSOE) desde 2019; gobierna con apoyos de la izquierda y de EH Bildu.",
        "perfil": "María Chivite Navascués (Cintruénigo, 1978) es presidenta de la Comunidad Foral de Navarra desde 2019 y líder del PSN-PSOE. Gobierna una comunidad de gran complejidad política, con apoyos de la izquierda y la abstención o el respaldo del nacionalismo vasco (EH Bildu), lo que ha sido objeto de fuerte controversia con la derecha. Es una barona leal a la dirección federal del PSOE. Primera mujer al frente de Navarra, gobierna una comunidad foral de gran complejidad, donde defiende el régimen y el Convenio Económico propios, una agenda social y unos pactos plurales que la derecha le reprocha con dureza por incluir los apoyos de EH Bildu.",
        "tray": [
            ("Carrera en el socialismo navarro", "Trabajadora social de formación, desarrolló su carrera en el PSN siendo parlamentaria foral y senadora, hasta liderar el socialismo navarro.", "2011-01-01"),
            ("Primera presidenta de Navarra", "En 2019 fue investida presidenta de Navarra, la primera mujer en el cargo, con el apoyo de la izquierda y la abstención de EH Bildu, en un pacto muy contestado por la derecha.", "2019-08-06"),
            ("Reelección en 2023", "Revalidó la presidencia en 2023, de nuevo con una mayoría plural de izquierdas y nacionalista, consolidando el giro político de la comunidad foral.", "2023-08-17"),
            ("Gestión foral", "Defiende el régimen foral, el Convenio Económico y el autogobierno de Navarra, con una agenda social y de servicios públicos.", "2024-01-01"),
        ],
        "pos": ("Socialismo foral y pactos plurales", "Defiende el autogobierno foral y una agenda social, sostenida en pactos con la izquierda y los apoyos del nacionalismo vasco, lo que la enfrenta a la derecha navarra.", ["psoe", "navarra"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Barona leal a la dirección federal.", ["psoe", "nota-+7", "alianza"]),
        ],
    },
    "imanol-pradales": {
        "comunidad": "País Vasco", "cargo": "Lehendakari (presidente del Gobierno Vasco)", "partido": "pnv",
        "ctag": "pais-vasco", "fuente": "https://www.euskadi.eus",
        "nombre": "Imanol Pradales Gil", "alias": "Imanol Pradales",
        "corta": "Lehendakari (PNV) desde 2024; relevó a Urkullu y gobierna en coalición con el PSE-EE.",
        "perfil": "Imanol Pradales Gil (Santurtzi, 1975) es lehendakari —presidente del Gobierno Vasco— desde 2024 y dirigente del PNV. Sociólogo y exdiputado foral de Bizkaia, relevó a Iñigo Urkullu tras las elecciones vascas de 2024, manteniendo al PNV en la lehendakaritza en coalición con el PSE-EE, en un contexto de fuerte competencia con EH Bildu por la hegemonía nacionalista. Sociólogo y gestor foral, encarna el relevo generacional del PNV tras la larga etapa de Urkullu; defiende la actualización del autogobierno y un nuevo estatus para Euskadi, mientras compite voto a voto con EH Bildu por liderar el nacionalismo vasco.",
        "tray": [
            ("Sociólogo y gestor foral", "Doctor en Sociología y profesor universitario, desarrolló su carrera en la Diputación Foral de Bizkaia, donde fue diputado de áreas como infraestructuras y desarrollo económico.", "2011-01-01"),
            ("Relevo generacional del PNV", "Fue designado candidato del PNV a lehendakari en sustitución de la larga etapa de Iñigo Urkullu, encarnando el relevo generacional del partido.", "2024-01-01"),
            ("Lehendakari", "Tras las elecciones vascas de abril de 2024, fue investido lehendakari, manteniendo la coalición de gobierno entre el PNV y los socialistas del PSE-EE.", "2024-06-22"),
            ("Pugna con EH Bildu", "Su mandato se desarrolla en una competencia muy estrecha con EH Bildu, que igualó al PNV en escaños, en torno al autogobierno, el estatus y la gestión de los servicios públicos vascos.", "2024-06-23"),
        ],
        "pos": ("Nacionalismo vasco de gestión", "Defiende el autogobierno y la actualización del estatus de Euskadi y una gestión moderada, en pugna por la hegemonía nacionalista con EH Bildu y en relación pragmática con el Gobierno de Sánchez, al que el PNV apoya en Madrid.", ["pnv", "pais-vasco"]),
        "redes": [
            ("Pedro Sánchez", "**Presidente del Gobierno** (nota +6/10) — El PNV es socio de investidura y apoyo parlamentario del Gobierno en Madrid.", ["gobierno", "nota-+6", "alianza"]),
        ],
    },
    "juan-francisco-perez-llorca": {
        "comunidad": "Comunidad Valenciana", "cargo": "Presidente de la Generalitat Valenciana", "partido": "pp",
        "ctag": "comunidad-valenciana", "fuente": "https://www.gva.es",
        "nombre": "Juan Francisco Pérez Llorca", "alias": "Pérez Llorca",
        "corta": "Presidente de la Generalitat Valenciana (PP) desde diciembre de 2025; sucedió a Mazón tras su dimisión por la DANA.",
        "perfil": "Juan Francisco Pérez Llorca (Finestrat, Alicante) es presidente de la Generalitat Valenciana desde diciembre de 2025 y dirigente del PP en la comunidad. Hasta entonces síndic (portavoz) del grupo popular en Les Corts y exalcalde de Finestrat, fue elegido para suceder a Carlos Mazón, que dimitió por su gestión de la catastrófica DANA de 2024. Fue investido con el apoyo de Vox. Político de la provincia de Alicante y negociador del grupo popular, llegó a la presidencia en circunstancias excepcionales con la misión de pilotar la reconstrucción de las comarcas arrasadas por las inundaciones y devolver la estabilidad política a la Comunitat.",
        "tray": [
            ("Alcalde de Finestrat", "Desarrolló su carrera política en el PP de la provincia de Alicante, siendo alcalde de Finestrat y cargo orgánico del partido en la Comunidad Valenciana.", "2011-01-01"),
            ("Síndic del PP en Les Corts", "Como portavoz parlamentario del PP en Les Corts Valencianes, se convirtió en una pieza clave de la gestión política del grupo y de las relaciones con Vox.", "2023-07-01"),
            ("La sucesión de Mazón", "Tras la dimisión de Carlos Mazón en noviembre de 2025 —un año después de la DANA que causó más de dos centenares de muertos y por cuya gestión fue duramente cuestionado—, el PP lo eligió como candidato a la Generalitat.", "2025-11-03"),
            ("Presidente de la Generalitat", "Fue investido president de la Generalitat Valenciana en diciembre de 2025 con el apoyo de Vox, con el reto de gestionar la reconstrucción tras la DANA y recomponer la situación política de la Comunidad.", "2025-12-02"),
        ],
        "pos": ("Reconstrucción tras la DANA", "Su prioridad declarada es la reconstrucción de las zonas devastadas por la DANA y la recuperación de la estabilidad política, desde una gestión de centroderecha apoyada en Vox.", ["pp", "comunidad-valenciana"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional, que pilotó la sucesión de Mazón.", ["pp", "nota-+7", "alianza"]),
            ("Santiago Abascal", "**Líder de Vox** (nota +4/10) — Su investidura dependió del apoyo de Vox.", ["vox", "nota-+4", "alianza"]),
        ],
    },
}


def build_apartados(d: dict) -> list:
    aps = [
        {"tipo": "identidad", "orden": 0, "items": [
            {"tipo": "dato", "titulo": "Perfil", "contenido": d["perfil"]}]},
    ]
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
        items = [{"tipo": "contacto", "titulo": t, "contenido": c, "tags": tags}
                 for (t, c, tags) in d["redes"]]
        aps.append({"tipo": "redes", "orden": 3, "items": items})
    return aps


def build_dossier(slug: str, d: dict) -> dict:
    return {
        "slug": slug,
        "tipo": "politico",
        "nombre": d["nombre"],
        "alias": d["alias"],
        "cargo": d["cargo"],
        "bio_corta": d["corta"],
        "fuente_principal": d["fuente"],
        "tags": ["politico", d["partido"], "presidente-autonomico", d["ctag"]],
        "confidence": 0.9,
        "completeness": 0.95,
        "apartados": build_apartados(d),
    }


def patch_andalucia() -> bool:
    d = PRES["juan-manuel-moreno-bonilla"]
    arr = json.load(open(COMPLEMENTOS, encoding="utf-8"))
    target = next((x for x in arr if x.get("slug") == "juan-manuel-moreno-bonilla"), None)
    if not target:
        print("  · aviso: moreno-bonilla no encontrado en complementos.json")
        return False
    aps = target.setdefault("apartados", [])

    def get_or_make(tipo, orden):
        for a in aps:
            if a.get("tipo") == tipo:
                return a
        nuevo = {"tipo": tipo, "orden": orden, "items": []}
        aps.append(nuevo)
        return nuevo

    ident = get_or_make("identidad", 0)
    if ident["items"]:
        ident["items"][0]["contenido"] = d["perfil"]
    else:
        ident["items"].append({"tipo": "dato", "titulo": "Perfil", "contenido": d["perfil"]})
    tray = get_or_make("trayectoria", 1)
    tray["items"] = []
    for tup in d["tray"]:
        item = {"tipo": "evento", "titulo": tup[0], "contenido": tup[1]}
        if len(tup) > 2 and tup[2]:
            item["fecha"] = tup[2]
        tray["items"].append(item)
    # posiciones: añade sin duplicar por título
    if d.get("pos"):
        pos = get_or_make("posiciones", 2)
        t, c, tags = d["pos"]
        if t not in {x.get("titulo") for x in pos["items"]}:
            pos["items"].append({"tipo": "dato", "titulo": t, "contenido": c, "tags": tags})
    target["completeness"] = 0.95
    json.dump(arr, open(COMPLEMENTOS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return True


def main() -> int:
    nuevos = [build_dossier(s, d) for s, d in PRES.items() if not d.get("patch")]
    json.dump(nuevos, open(OUT_PODER, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"  escrito: {OUT_PODER.name} · {len(nuevos)} presidentes autonómicos")
    if patch_andalucia():
        print("  parcheado: complementos.json · Andalucía (Moreno Bonilla)")
    print(f"OK · {len(PRES)} presidentes autonómicos (17 CCAA)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
