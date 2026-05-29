#!/usr/bin/env python3
"""scripts/biografias_extensas.py

Da profundidad a las biografías de las figuras NO-ELECTAS más importantes:
reemplaza el apartado 'trayectoria' por una narrativa cronológica extensa
(varias secciones) y añade 'posiciones' y 'controversias' detalladas. La
página de detalle renderiza identidad/trayectoria como prosa limpia.

Tono: factual, neutral y con presunción de inocencia en causas no juzgadas.
Idempotente: re-ejecutar deja el mismo resultado.

Uso:  python3 scripts/biografias_extensas.py
"""
from __future__ import annotations

import glob
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FILES = sorted(glob.glob(str(REPO / "data" / "poder" / "figuras_clave*.json")))

# slug -> {perfil?, trayectoria:[(titulo,contenido,fecha?)], posiciones:[(t,c,tags?)], controversias:[...] }
BIOS: dict[str, dict] = {
    "felipe-vi": {
        "perfil": "Felipe VI (Felipe Juan Pablo Alfonso de Todos los Santos de Borbón y Grecia), nacido en Madrid el 30 de enero de 1968, es el Rey de España y Jefe del Estado desde el 19 de junio de 2014. Encarna la Corona como institución arbitral y moderadora dentro de la monarquía parlamentaria que diseña la Constitución de 1978.",
        "trayectoria": [
            ("Formación e infancia como heredero", "Hijo de Juan Carlos I y Sofía de Grecia, fue educado desde niño para reinar. Estudió en el Colegio Santa María de los Rosales, cursó un año de bachillerato en Canadá (Lakefield College) y completó la triple formación militar en las academias de tierra (Zaragoza), mar (Marín) y aire (San Javier). Se licenció en Derecho por la Universidad Autónoma de Madrid y obtuvo un máster en Relaciones Internacionales en la Universidad de Georgetown (EE. UU.).", "1968-01-30"),
            ("Príncipe de Asturias", "Durante casi cuatro décadas ejerció como Príncipe de Asturias, asumiendo una intensa agenda de representación institucional, presidencia de fundaciones y misiones diplomáticas, especialmente en Iberoamérica. En 2004 contrajo matrimonio con la periodista Letizia Ortiz, con quien tiene dos hijas: la Princesa Leonor (2005), heredera de la Corona, y la Infanta Sofía (2007).", "2004-05-22"),
            ("Proclamación y 'monarquía renovada'", "Tras la abdicación de su padre, fue proclamado rey ante las Cortes el 19 de junio de 2014, en un momento de fuerte desprestigio de la institución por los escándalos de los últimos años del reinado anterior. Desde el primer día planteó una Corona más austera y transparente: redujo el presupuesto y su asignación, publicó las cuentas de la Casa del Rey, aprobó un código de conducta y limitó los regalos y los viajes.", "2014-06-19"),
            ("El discurso del 3 de octubre y la crisis catalana", "El momento más delicado de su reinado llegó con el desafío independentista. El 3 de octubre de 2017, dos días después del referéndum ilegal del 1-O, pronunció un durísimo mensaje televisado en defensa del orden constitucional. La intervención le granjeó el respaldo del constitucionalismo y la animadversión del independentismo y de parte de la izquierda, que le reprocharon no apelar al diálogo.", "2017-10-03"),
            ("Ruptura con su padre", "En 2020, ante la acumulación de informaciones sobre los negocios de Juan Carlos I, Felipe VI renunció a la herencia que pudiera corresponderle de su padre y le retiró la asignación pública. El rey emérito se trasladó a Abu Dabi. La maniobra buscó blindar a la Corona reinante frente a los escándalos del anterior titular, en una operación de distanciamiento sin precedentes en la historia reciente.", "2020-03-15"),
            ("Papel arbitral", "Como Jefe del Estado ejerce funciones tasadas: sanciona las leyes, convoca elecciones, propone candidato a la investidura tras consultar a los partidos y ejerce la representación exterior del Estado. En un Parlamento cada vez más fragmentado, sus rondas de consultas y la propuesta de candidato han ganado peso político y visibilidad."),
        ],
        "posiciones": [
            ("Neutralidad y Constitución", "Su línea es la defensa estricta de la Constitución y la neutralidad partidista. Evita el comentario político y concentra su mensaje en la unidad, la convivencia y la proyección internacional de España. Su legitimidad depende de mantenerse por encima de la refriega partidista en un país profundamente polarizado.", ["constitucion", "neutralidad"]),
        ],
        "controversias": [
            ("La sombra de Juan Carlos I", "El principal riesgo reputacional de su reinado son los escándalos de su padre, que arrastran a la institución pese a la separación formal. La izquierda y el independentismo cuestionan abiertamente la monarquía; Felipe VI responde con ejemplaridad y transparencia. La República figura en la agenda de socios del Gobierno, lo que mantiene el debate abierto.", ["monarquia", "republica"]),
        ],
    },
    "juan-carlos-i": {
        "perfil": "Juan Carlos I de Borbón (Roma, 5 de enero de 1938) fue Rey de España entre 1975 y 2014. Figura central de la Transición a la democracia, su reinado pasó del máximo prestigio —por su papel en el 23-F— al desprestigio de sus últimos años por escándalos económicos y personales que acabaron en su abdicación y posterior traslado al extranjero.",
        "trayectoria": [
            ("Exilio, designación y formación", "Nieto de Alfonso XIII, nació en el exilio en Roma. Llegó a España en 1948 por un acuerdo entre su padre, Don Juan, y Franco, que se reservó su educación. Se formó en las tres academias militares y en la Universidad de Madrid. En 1969 Franco lo designó sucesor a título de Rey, saltándose la línea dinástica de su padre, lo que generó tensiones en la propia familia.", "1969-07-22"),
            ("Rey y motor de la Transición", "Proclamado rey el 22 de noviembre de 1975, dos días después de la muerte de Franco, sorprendió al desmontar el aparato franquista desde dentro: nombró presidente a Adolfo Suárez, impulsó la Ley para la Reforma Política y respaldó la legalización de los partidos y la Constitución de 1978. Se convirtió en pieza clave del paso pacífico de la dictadura a la democracia.", "1975-11-22"),
            ("El 23-F: la cumbre de su prestigio", "La noche del 23 de febrero de 1981, durante el intento de golpe de Estado, su mensaje televisado en defensa del orden constitucional fue decisivo para abortar la asonada. Aquel episodio consolidó su imagen de garante de la democracia y le dio un capital político y popular que mantuvo durante décadas, dentro y fuera de España.", "1981-02-23"),
            ("Reinado y diplomacia económica", "Durante los años de expansión ejerció una intensa diplomacia al servicio de la internacionalización de la empresa española, especialmente en el mundo árabe y en Latinoamérica. Gozó de enorme popularidad y prestigio internacional, simbolizado en episodios como su célebre '¿Por qué no te callas?' a Hugo Chávez en 2007.", "2007-11-10"),
            ("Declive: Botsuana y los escándalos", "Su imagen se quebró en abril de 2012 con una cacería de elefantes en Botsuana, conocida mientras España sufría la crisis. A partir de ahí se sucedieron las informaciones sobre comisiones, fundaciones opacas (Zagatka), tarjetas opacas y su relación con Corinna Larsen, además del caso Nóos que afectó a su yerno. El desprestigio precipitó su abdicación el 18 de junio de 2014.", "2012-04-13"),
            ("Abdicación, exilio y causas", "Tras abdicar en su hijo, los escándalos no cesaron. En agosto de 2020 se trasladó a Abu Dabi en medio de investigaciones en España y Suiza. Regularizó varias cantidades ante Hacienda. La Fiscalía archivó las causas por prescripción, la inviolabilidad como jefe del Estado y las regularizaciones, sin que llegara a haber juicio. Rige, por tanto, la presunción de inocencia respecto de los hechos no enjuiciados, aunque el daño reputacional fue profundo.", "2020-08-03"),
        ],
        "posiciones": [
            ("De símbolo de consenso a figura divisiva", "Pasó de ser un símbolo de unidad y consenso democrático a una figura que divide a la opinión pública. Para sus defensores, su papel en la Transición y el 23-F es indiscutible; para sus críticos, los escándalos finales empañan ese legado y alimentan el debate sobre la monarquía.", ["transicion", "legado"]),
        ],
    },
    "felipe-gonzalez": {
        "perfil": "Felipe González Márquez (Sevilla, 5 de marzo de 1942) es el presidente del Gobierno que más tiempo ha ocupado el cargo en democracia (1982-1996). Abogado laboralista y líder histórico del PSOE, simboliza la modernización de España y su plena integración en Europa, así como las luces y sombras de catorce años de poder socialista.",
        "trayectoria": [
            ("Abogado laboralista y 'Isidoro'", "Formado en Derecho en Sevilla, ejerció como abogado laboralista defendiendo a trabajadores en los últimos años del franquismo. Militó en la clandestinidad bajo el apodo de 'Isidoro' y ascendió rápidamente en un PSOE entonces dividido entre el interior y el exilio.", "1965-01-01"),
            ("La refundación del PSOE", "En el Congreso de Suresnes (Francia, 1974) fue elegido secretario general con el apoyo de la socialdemocracia europea. Lideró la transformación del partido: en 1979 forzó el abandono del marxismo como seña de identidad, modernizando el PSOE y haciéndolo electoralmente competitivo para gobernar.", "1974-10-13"),
            ("La victoria de 1982 y las grandes reformas", "El 28 de octubre de 1982 el PSOE arrasó con más de diez millones de votos, abriendo una etapa de mayorías absolutas. Su Gobierno acometió la reconversión industrial, la expansión del Estado del bienestar (sanidad y educación universales, pensiones), la modernización de las infraestructuras y la profesionalización de las Fuerzas Armadas.", "1982-10-28"),
            ("Europa y la OTAN", "Su gran obra exterior fue el anclaje de España en Occidente: la firma de la adhesión a la Comunidad Económica Europea (1986) y el giro en el referéndum de la OTAN de marzo de 1986, en el que defendió la permanencia que antes había combatido. 1992 —Olimpiadas de Barcelona y Expo de Sevilla— fue el escaparate de la nueva España.", "1986-03-12"),
            ("GAL, corrupción y desgaste", "Sus últimos años estuvieron marcados por la guerra sucia contra ETA (los GAL), los casos de corrupción (Roldán, Filesa) y el desgaste del poder, el llamado 'felipismo'. Perdió las elecciones de 1996 frente a Aznar tras catorce años de gobierno.", "1996-03-03"),
            ("Estadista y voz crítica", "Tras dejar la política activa se convirtió en un estadista de referencia internacional, asesor y consejero de empresas (Gas Natural). En los últimos años ha sido una de las voces más críticas con la deriva del PSOE de Pedro Sánchez, especialmente con los pactos con el independentismo y la ley de amnistía.", "2023-01-01"),
        ],
        "posiciones": [
            ("Socialdemocracia y razón de Estado", "Representa una socialdemocracia pragmática y europeísta, con fuerte sentido de la 'razón de Estado'. Defiende la moderación, el pacto y la centralidad frente a lo que considera excesos ideológicos, y se ha distanciado abiertamente del actual rumbo de su partido.", ["socialdemocracia", "europeismo"]),
        ],
    },
    "jose-maria-aznar": {
        "perfil": "José María Aznar López (Madrid, 25 de febrero de 1953) fue presidente del Gobierno entre 1996 y 2004 por el Partido Popular. Inspector de Hacienda de formación, lideró la consolidación del centro-derecha español, el saneamiento económico y la entrada en el euro, y hoy mantiene una influencia notable desde la Fundación FAES.",
        "trayectoria": [
            ("De inspector de Hacienda a Castilla y León", "Inspector de Hacienda del Estado, dio el salto a la política en Alianza Popular. Fue presidente de la Junta de Castilla y León (1987-1989) antes de asumir el liderazgo nacional del partido refundado como Partido Popular.", "1987-07-26"),
            ("Líder de la oposición y atentado de ETA", "Designado sucesor de Manuel Fraga al frente del PP en 1990, modernizó y centró el partido. En 1995 sobrevivió a un atentado de ETA con coche bomba en Madrid, episodio que marcó su trayectoria y su firmeza antiterrorista.", "1990-09-04"),
            ("Presidente del Gobierno", "Ganó las elecciones de 1996 y gobernó primero en minoría con apoyo de los nacionalistas catalanes y vascos. El saneamiento de las cuentas y el crecimiento permitieron a España entrar en el euro. En 2000 revalidó con mayoría absoluta y endureció su perfil.", "1996-05-05"),
            ("Giro atlantista y la foto de las Azores", "En su segundo mandato dio un marcado giro atlantista. Su apoyo a la invasión de Irak en 2003, simbolizado en la cumbre de las Azores junto a Bush y Blair, fue contestado por amplias movilizaciones y dividió al país.", "2003-03-16"),
            ("El 11-M y la salida del poder", "Los atentados yihadistas del 11 de marzo de 2004, tres días antes de las elecciones, y la gestión informativa de la autoría marcaron el final de su etapa. El PP, que no se presentaba con Aznar como candidato (cumplió su palabra de no agotar un tercer mandato), perdió frente a Zapatero.", "2004-03-11"),
            ("FAES y la influencia en la derecha", "Desde la Fundación FAES se ha convertido en el referente ideológico del ala más conservadora y atlantista del PP. Mantiene una influencia notable y ejerce de voz crítica tanto con el Gobierno de Sánchez como, en ocasiones, con la estrategia de moderación de Feijóo.", "2004-04-01"),
        ],
        "posiciones": [
            ("Liberal-conservadurismo atlantista", "Defiende el liberalismo económico, la firmeza frente al nacionalismo y el terrorismo, y una política exterior alineada con Estados Unidos. Es una de las voces más beligerantes contra el 'sanchismo' y los pactos con el independentismo.", ["atlantismo", "liberalismo"]),
        ],
    },
    "jose-luis-rodriguez-zapatero": {
        "perfil": "José Luis Rodríguez Zapatero (Valladolid, 4 de agosto de 1960), 'ZP', fue presidente del Gobierno entre 2004 y 2011. Impulsó una de las agendas de derechos civiles más ambiciosas de la democracia y gobernó en la transición del boom económico a la Gran Recesión, que marcó el final de su etapa.",
        "trayectoria": [
            ("Ascenso por 'Nueva Vía'", "Diputado por León desde joven, ganó por sorpresa la secretaría general del PSOE en el año 2000 al frente de la corriente 'Nueva Vía', renovando el partido tras las derrotas frente a Aznar con un discurso de talante dialogante.", "2000-07-22"),
            ("Llegada al poder tras el 11-M", "Ganó las elecciones de marzo de 2004, celebradas tres días después de los atentados del 11-M. Una de sus primeras decisiones fue la retirada de las tropas españolas de Irak, cumpliendo su promesa electoral.", "2004-04-17"),
            ("La agenda de derechos", "Su primera legislatura desplegó una intensa agenda social y de derechos: matrimonio igualitario (2005), ley de dependencia, ley de igualdad y paridad, ley de memoria histórica, ampliación del aborto y negociación —fallida— con ETA. Polarizó el debate público con la Iglesia y la derecha.", "2005-07-03"),
            ("De la negación de la crisis al ajuste", "Reelegido en 2008, su gestión quedó marcada por la crisis financiera global. Tras meses negando su gravedad, la presión de los mercados y de Bruselas le forzó en mayo de 2010 a un giro de ajuste sin precedentes: recorte de salarios públicos, congelación de pensiones y reforma laboral, que rompió con su electorado.", "2010-05-12"),
            ("Salida y mediación internacional", "No se presentó a la reelección. El PSOE perdió las elecciones de 2011 con Rubalcaba. Desde entonces se ha dedicado a la mediación internacional, especialmente en Venezuela, una labor que le ha valido fuertes críticas por su cercanía al chavismo.", "2011-11-20"),
        ],
        "posiciones": [
            ("Progresismo de derechos y diálogo", "Su sello es el progresismo en derechos civiles y un talante dialogante, también con los nacionalismos. Sigue siendo una voz influyente en el ala izquierda del PSOE y defensor de la política de distensión territorial del actual Gobierno.", ["derechos-civiles", "dialogo"]),
        ],
    },
    "mariano-rajoy": {
        "perfil": "Mariano Rajoy Brey (Santiago de Compostela, 27 de marzo de 1955) fue presidente del Gobierno entre 2011 y 2018. Registrador de la propiedad y político de largo recorrido en el PP, gobernó en plena crisis económica y afrontó el mayor desafío territorial de la democracia, antes de ser desalojado por la primera moción de censura exitosa de la historia.",
        "trayectoria": [
            ("Registrador y ministro con Aznar", "Registrador de la propiedad, hizo carrera en el PP de Galicia y desembarcó en Madrid. Fue ministro en varias carteras con Aznar (Administraciones Públicas, Educación, Interior, Presidencia) y vicepresidente, ganándose fama de gestor discreto y resistente.", "1996-05-05"),
            ("Sucesor de Aznar y dos derrotas", "Designado sucesor por Aznar en 2004, perdió las elecciones de 2004 y 2008 frente a Zapatero. Su resistencia interna y la crisis económica le dieron una tercera oportunidad.", "2004-09-02"),
            ("Presidente en plena crisis", "Ganó por mayoría absoluta en 2011. Gobernó aplicando una dura política de austeridad y reformas para evitar el rescate total del país; sí hubo rescate del sistema financiero. La recuperación llegó al final de su mandato, a costa de un fuerte desgaste social.", "2011-12-21"),
            ("El desafío catalán y el 155", "Afrontó el 'procés' independentista catalán, que culminó en el referéndum ilegal del 1 de octubre de 2017 y la declaración de independencia. Su Gobierno aplicó por primera vez el artículo 155 de la Constitución, interviniendo la autonomía de Cataluña y convocando elecciones.", "2017-10-27"),
            ("Gürtel y la moción de censura", "La sentencia del caso Gürtel, que acreditó la existencia de una caja b y una trama de corrupción ligada al PP, precipitó su caída: el 1 de junio de 2018 Pedro Sánchez ganó la primera moción de censura constructiva exitosa de la democracia. Rajoy abandonó la política y volvió a su plaza de registrador.", "2018-06-01"),
        ],
        "posiciones": [
            ("Conservadurismo gestor y resistente", "Representa un conservadurismo pragmático, gestor y poco ideológico, con una proverbial capacidad de resistencia y de no decisión táctica. Su gestión de la crisis y del desafío territorial sigue siendo objeto de debate dentro y fuera del PP.", ["gestion", "estabilidad"]),
        ],
    },
    "jose-luis-escriva": {
        "perfil": "José Luis Escrivá Belmonte (Albacete, 1960) es gobernador del Banco de España desde 2024. Economista y técnico comercial del Estado, ha transitado por la banca privada, los organismos internacionales y el Gobierno, donde fue ministro, hasta llegar a la cúpula del supervisor bancario y al Consejo de Gobierno del BCE.",
        "trayectoria": [
            ("Economista de prestigio", "Técnico comercial y economista del Estado, trabajó en el Banco de España, en el BCE y dirigió el servicio de estudios del BBVA, ganándose una sólida reputación técnica en análisis macroeconómico y fiscal.", "1990-01-01"),
            ("Primer presidente de la AIReF", "En 2014 fue nombrado primer presidente de la Autoridad Independiente de Responsabilidad Fiscal (AIReF), el organismo que fiscaliza las cuentas públicas. Desde ahí construyó un perfil de tecnócrata riguroso y a veces incómodo para los gobiernos.", "2014-02-25"),
            ("Ministro de Sánchez", "En 2020 entró en el Gobierno de coalición como ministro de Inclusión, Seguridad Social y Migraciones. Pilotó la reforma de las pensiones —pactada con Bruselas y los agentes sociales— y el Ingreso Mínimo Vital. En 2023 pasó a la cartera de Transformación Digital.", "2020-01-13"),
            ("Gobernador del Banco de España", "En septiembre de 2024 fue nombrado gobernador del Banco de España, no sin polémica por su pasado político reciente. Desde el cargo supervisa la solvencia de la banca, asesora sobre estabilidad financiera y vivienda, y vota en el Consejo de Gobierno del BCE la política monetaria del euro.", "2024-09-09"),
        ],
        "posiciones": [
            ("Tecnócrata de la sostenibilidad fiscal", "Defiende la sostenibilidad de las pensiones y de las cuentas públicas con un enfoque técnico y de big data. Su nombramiento como gobernador reavivó el debate sobre la independencia del supervisor frente al poder político.", ["pensiones", "supervision"]),
        ],
    },
    "candido-conde-pumpido": {
        "perfil": "Cándido Conde-Pumpido Tourón (Santiago de Compostela, 1949) es presidente del Tribunal Constitucional desde 2023. Magistrado de larga carrera y exfiscal general del Estado, es una de las figuras más influyentes —y discutidas— del poder judicial español.",
        "trayectoria": [
            ("Carrera judicial y fiscal", "Magistrado de profesión, desarrolló una extensa carrera en la judicatura y la Fiscalía, con paso por el Tribunal Supremo. Se le identifica con el sector progresista de la judicatura.", "1975-01-01"),
            ("Fiscal General con Zapatero", "Fue fiscal general del Estado durante los gobiernos de Rodríguez Zapatero (2004-2011), una etapa marcada por causas de gran calado político y por las tensiones habituales entre Fiscalía, Gobierno y oposición.", "2004-04-24"),
            ("Magistrado y presidente del TC", "Llegó al Tribunal Constitucional en 2017 y, tras la renovación que dio mayoría al bloque progresista, fue elegido presidente del tribunal en enero de 2023. Desde la presidencia ha pilotado sentencias de gran trascendencia política.", "2023-01-10"),
        ],
        "posiciones": [
            ("Garantismo y defensa de la independencia", "Reivindica la independencia del Constitucional y un enfoque garantista. Defiende la legitimidad del tribunal para revisar leyes y resolver conflictos entre poderes, en un contexto de fuerte tensión institucional.", ["constitucional", "independencia"]),
        ],
        "controversias": [
            ("Acusaciones de parcialidad", "El PP y la derecha mediática le acusan de parcialidad y de favorecer al Gobierno en asuntos como los avales a leyes polémicas o la tramitación de la amnistía. Él y el sector progresista lo niegan y reivindican la independencia del tribunal. El debate forma parte de la batalla más amplia por el control de los órganos del Estado.", ["polarizacion", "presuncion-inocencia"]),
        ],
    },
    "alvaro-garcia-ortiz": {
        "perfil": "Álvaro García Ortiz (Valdediós, Asturias, 1967) es fiscal general del Estado desde 2022. Fiscal de carrera especializado en medio ambiente, su mandato ha estado marcado por una tensión inédita con parte de la carrera fiscal, el poder judicial y la oposición.",
        "trayectoria": [
            ("Fiscal especialista en medio ambiente", "Fiscal de carrera, se especializó en delitos contra el medio ambiente y la ordenación del territorio, llegando a ser fiscal de Sala de Medio Ambiente, antes de ascender en la cúpula del ministerio público.", "2000-01-01"),
            ("Fiscal General del Estado", "Fue nombrado fiscal general en 2022 a propuesta del Gobierno y renovado en 2024. Su designación, como la de sus predecesores, reavivó el debate sobre la autonomía de la Fiscalía respecto del Ejecutivo que la propone.", "2022-07-27"),
            ("Una causa sin precedentes", "García Ortiz está siendo investigado por el Tribunal Supremo por una presunta revelación de secretos en relación con la difusión de información sobre un caso fiscal. Es la primera vez que un fiscal general en activo se ve en esa situación. La causa sigue su curso y rige la presunción de inocencia mientras no haya sentencia firme.", "2024-10-30"),
        ],
        "posiciones": [
            ("Defensa de la legalidad y autonomía", "Reivindica la actuación de la Fiscalía conforme a la legalidad y su autonomía funcional. La oposición y parte de la carrera le reprochan sintonía con el Gobierno; él lo niega. El episodio ha tensionado como pocos la relación entre Fiscalía, jueces y poder político.", ["fiscalia", "presuncion-inocencia"]),
        ],
    },
    "christine-lagarde": {
        "perfil": "Christine Lagarde (París, 1 de enero de 1956) es presidenta del Banco Central Europeo desde 2019. Abogada de formación, ha sido ministra de Economía de Francia y directora gerente del FMI. Aunque no es española, sus decisiones sobre los tipos de interés del euro condicionan directamente las hipotecas, la banca y la deuda de España.",
        "trayectoria": [
            ("De la abogacía a la política francesa", "Abogada especializada en derecho mercantil y laboral, presidió el bufete internacional Baker McKenzie en Chicago antes de regresar a Francia para la política. Fue ministra de Comercio y, desde 2007, ministra de Economía, la primera mujer en ese cargo en un país del G7.", "2007-06-19"),
            ("Directora gerente del FMI", "En 2011 asumió la dirección del Fondo Monetario Internacional, donde gestionó las réplicas de la crisis de deuda europea —Grecia incluida— y consolidó su perfil de gran gestora de la economía global.", "2011-07-05"),
            ("Presidenta del BCE", "En noviembre de 2019 se convirtió en la primera mujer al frente del Banco Central Europeo. Afrontó la pandemia con un programa masivo de compra de deuda (PEPP) que protegió a países como España, y después el repunte de inflación tras la guerra de Ucrania.", "2019-11-01"),
            ("La era de las subidas de tipos", "Entre 2022 y 2023 lideró el ciclo de subidas de tipos más rápido de la historia del euro para domar la inflación. La medida encareció las hipotecas y el crédito de millones de españoles, pero disparó los beneficios de la banca; en paralelo, su 'escudo antifragmentación' protegió la deuda del sur frente a la especulación.", "2022-07-21"),
        ],
        "posiciones": [
            ("Estabilidad de precios y del euro", "Su mandato es la estabilidad de precios, pero equilibra el control de la inflación con la cohesión del euro y la estabilidad financiera. Sus decisiones tienen un impacto directo y cotidiano sobre la economía de las familias y las empresas españolas.", ["inflacion", "tipos", "euro"]),
        ],
    },

    # ── 2º lote · medios y poder no-electo a nivel Sánchez ──────────────────
    "antonio-garcia-ferreras": {
        "perfil": "Antonio García Ferreras (Lupiana, Guadalajara, 1966) es director y presentador de 'Al Rojo Vivo' (laSexta) y uno de los periodistas más influyentes y polémicos de la televisión española. Desde su programa fija buena parte de la agenda política diaria del espacio progresista.",
        "trayectoria": [
            ("Del deporte a la dirección de informativos", "Empezó en radio y prensa deportiva y dirigió los informativos de la Cadena SER y de Telemadrid. Su salto a la dirección de la recién nacida laSexta (2006) lo situó en el centro del nuevo audiovisual privado.", "2006-03-27"),
            ("'Al Rojo Vivo' y la maquinaria de tertulia", "Desde 2011 dirige y presenta 'Al Rojo Vivo', el magacín de actualidad de laSexta que ha popularizado el formato de tertulia política intensiva. Su capacidad para marcar agenda y elegir contertulios lo convierte en un actor de poder, no solo en un periodista.", "2011-01-10"),
            ("Vínculo con Atresmedia y el espacio progresista", "Como rostro estrella del grupo Atresmedia (Planeta), su línea editorial, crítica con la derecha, pesa en la imagen del grupo y en la conversación pública de la izquierda.", ""),
        ],
        "controversias": [
            ("Los audios con Villarejo", "La difusión de audios de conversaciones con el excomisario Villarejo (caso de un bulo sobre una presunta cuenta de Podemos) abrió un debate sobre los límites del periodismo y sus fuentes. Ferreras lo enmarcó como una práctica de contraste; rige la presunción de inocencia sobre cualquier extremo no acreditado judicialmente.", ["fuentes", "presuncion-inocencia"]),
        ],
    },
    "ana-rosa-quintana": {
        "perfil": "Ana Rosa Quintana (Madrid, 1956) es la presentadora más influyente de Mediaset España y una de las grandes figuras de la televisión. Su magacín matinal lidera la franja desde hace dos décadas y condiciona la agenda mediática del centro-derecha.",
        "trayectoria": [
            ("De la prensa del corazón a la mañana", "Formada en periodismo, saltó a la fama en programas de corazón y sucesos. En 2005 estrenó 'El Programa de Ana Rosa' en Telecinco, que se convirtió en el magacín matinal de referencia.", "2005-01-10"),
            ("Productora propia y poder de mercado", "A través de su productora (Unicorn Content) controla la producción de sus propios formatos y de otros de la cadena, lo que le da un poder inusual sobre la parrilla de Mediaset.", ""),
            ("Vespertina y peso editorial", "Tras una etapa en las tardes, su criterio y su tono marcan la línea de buena parte del entretenimiento informativo de Mediaset, con un encuadre crítico hacia el Gobierno.", "2023-09-01"),
        ],
    },
    "pedro-jose-ramirez": {
        "perfil": "Pedro J. Ramírez (Logroño, 1952) es director de El Español y una leyenda del periodismo de investigación español. Fundador de El Mundo, ha protagonizado las grandes batallas mediáticas de la democracia, con un estilo combativo y una relación tensa con el poder de turno.",
        "trayectoria": [
            ("Diario 16 y los GAL", "Dirigió Diario 16 con apenas 28 años; desde allí destapó la trama de los GAL, la guerra sucia contra ETA, que marcó el final de la era socialista.", "1980-01-01"),
            ("Fundación y dirección de El Mundo", "En 1989 fundó El Mundo, que convirtió en el segundo diario de España y en una máquina de investigación (Roldán, Filesa, Gürtel, Bárcenas). Dirigió el periódico durante 25 años.", "1989-10-23"),
            ("El Español", "Tras su salida de El Mundo en 2014, fundó en 2015 el digital El Español mediante crowdfunding, consolidándolo como uno de los nativos digitales líderes y de referencia del centro-derecha.", "2015-10-07"),
        ],
    },
    "carlos-herrera": {
        "perfil": "Carlos Herrera (Almería, 1957) es el comunicador estrella de la COPE y líder de audiencia de la radio de la mañana. Su programa es parada obligada de la actualidad política y un altavoz del centro-derecha, con una influencia notable en el debate público.",
        "trayectoria": [
            ("De RNE a Onda Cero", "Locutor de larga trayectoria, pasó por Radio Nacional y Onda Cero, donde consolidó las mañanas con uno de los magacines de mayor audiencia de la radio española.", "1990-01-01"),
            ("'Herrera en COPE'", "En 2015 fichó por la COPE, la cadena de la Conferencia Episcopal, donde dirige y presenta el programa matinal líder, con entrevistas a primeras figuras políticas y una línea crítica con el Gobierno de Sánchez.", "2015-09-01"),
        ],
    },
    "pepa-bueno": {
        "perfil": "Pepa Bueno (Badajoz, 1964) es directora de El País, el diario de referencia de la izquierda española y buque insignia del grupo PRISA. Periodista de larga trayectoria en televisión y radio, dirige la redacción más influyente del país en un momento de pugna por la propiedad del grupo.",
        "trayectoria": [
            ("Televisión: el Telediario", "Se hizo conocida presentando los informativos de TVE, incluido el Telediario, durante años, con un estilo riguroso e institucional.", "2004-09-01"),
            ("Radio: Hoy por Hoy", "Dirigió y presentó 'Hoy por Hoy', el magacín matinal de la Cadena SER, referencia informativa de la radio, antes de dar el salto a la prensa escrita.", "2012-09-03"),
            ("Dirección de El País", "En 2023 asumió la dirección de El País, primera mujer al frente del diario, en plena reordenación accionarial del grupo PRISA (Amber Capital, bancos, socios con intereses políticos).", "2023-04-19"),
        ],
    },
    "vicente-valles": {
        "perfil": "Vicente Vallés (Madrid, 1963) es director y presentador de 'Antena 3 Noticias 2', el informativo de máxima audiencia de la televisión española. Con un estilo analítico y entrevistas incisivas, es uno de los periodistas con mayor credibilidad del panorama.",
        "trayectoria": [
            ("De CNN+ a Telecinco", "Trabajó en CNN+ y dirigió informativos en Telecinco y Cuatro antes de recalar en Atresmedia, donde se consolidó como referente de la información política.", "2000-01-01"),
            ("Antena 3 Noticias y los editoriales", "Desde 2017 dirige y presenta el informativo de la noche de Antena 3, líder de audiencia, célebre por sus editoriales de cierre. Es además autor de varios ensayos de éxito sobre geopolítica y desinformación.", "2017-09-04"),
        ],
    },
    "ignacio-escolar": {
        "perfil": "Ignacio Escolar (Burgos, 1975) es fundador y director de elDiario.es, uno de los digitales más influyentes de la izquierda española, pionero del modelo de financiación por socios. Periodista de investigación, su medio ha destapado casos de gran impacto político.",
        "trayectoria": [
            ("Público y el blescolar.net", "Fue primer director del diario Público (2007) y uno de los blogueros políticos pioneros en España, con gran influencia en la conversación digital de la izquierda.", "2007-09-26"),
            ("Fundación de elDiario.es", "En 2012 fundó elDiario.es sobre un modelo mixto de publicidad y socios pagadores que lo blindó frente a presiones. Lo ha convertido en referente del periodismo de investigación progresista.", "2012-09-18"),
        ],
    },
    "eduardo-inda": {
        "perfil": "Eduardo Inda (Pamplona, 1966) es fundador y director de OKDiario, uno de los digitales más combativos contra el Gobierno de coalición. Tertuliano omnipresente en televisión, encarna el periodismo de trinchera del bloque de la derecha.",
        "trayectoria": [
            ("El Mundo y Marca", "Hizo carrera en El Mundo, donde fue subdirector, y dirigió el diario deportivo Marca, antes de emprender su propio proyecto digital.", "2000-01-01"),
            ("Fundación de OKDiario", "En 2015 fundó OKDiario, con una línea editorial muy agresiva con el Gobierno y su entorno y una intensa actividad en tertulias. Su periodismo de investigación ha sido objeto de polémicas y desmentidos.", "2015-09-15"),
        ],
        "controversias": [
            ("Informaciones cuestionadas", "Varias de sus exclusivas han sido posteriormente cuestionadas o desmentidas, y ha protagonizado litigios por algunas de ellas. Rige la presunción de inocencia salvo resolución judicial firme.", ["litigios", "presuncion-inocencia"]),
        ],
    },
    "juan-roig": {
        "perfil": "Juan Roig (Valencia, 1949) es presidente de Mercadona, la mayor cadena de distribución alimentaria de España, y una de las primeras fortunas del país. Su modelo de gestión y su discurso del 'esfuerzo' lo han convertido en un referente —y a la vez en una figura controvertida— del empresariado español.",
        "trayectoria": [
            ("De la tienda familiar a Mercadona", "Transformó el pequeño negocio de ultramarinos de su familia en Mercadona, que bajo su dirección se convirtió en líder absoluto de la distribución en España con miles de supermercados.", "1981-01-01"),
            ("El modelo Mercadona", "Impuso un modelo de marca propia (Hacendado, Deliplus), 'siempre precios bajos' e integración con proveedores ('interproveedores'), copiado y estudiado en todo el sector.", ""),
            ("Marina de Empresas y mecenazgo", "Reinvierte parte de su fortuna en el emprendimiento (Marina de Empresas, Lanzadera, EDEM) y en el deporte (Valencia Basket). Su mujer, Hortensia Herrero, destaca como mecenas del arte.", ""),
        ],
    },
    "luis-arguello": {
        "perfil": "Luis Argüello (Meneses de Campos, Palencia, 1953) es arzobispo de Valladolid y presidente de la Conferencia Episcopal Española desde 2024, la máxima autoridad de la Iglesia católica en España. Canonista de formación, representa a los obispos ante el Estado y la sociedad.",
        "trayectoria": [
            ("Sacerdote y obispo", "Ordenado sacerdote y luego obispo auxiliar de Valladolid, combinó la labor pastoral con la formación en Derecho Canónico, especializándose en las relaciones Iglesia-Estado.", "2016-01-01"),
            ("Secretario y portavoz de la CEE", "Fue secretario general y portavoz de la Conferencia Episcopal, voz visible de los obispos en debates como la eutanasia, el aborto o la educación.", "2018-03-01"),
            ("Presidente de la Conferencia Episcopal", "En 2024 fue elegido presidente de la CEE, asumiendo la interlocución con el Gobierno en asuntos sensibles como los abusos, las inmatriculaciones y la financiación.", "2024-03-06"),
        ],
    },
    "unai-sordo": {
        "perfil": "Unai Sordo (Barakaldo, 1972) es secretario general de Comisiones Obreras (CCOO), el mayor sindicato de España, desde 2017. Es uno de los dos vértices sindicales del diálogo social y un actor central en la negociación de salarios, pensiones y reforma laboral.",
        "trayectoria": [
            ("Del metal vasco a la cúpula", "Trabajador del sector industrial vasco, ascendió en la estructura de CCOO de Euskadi hasta dirigir el sindicato en el País Vasco.", "2009-01-01"),
            ("Secretario general de CCOO", "En 2017 fue elegido secretario general confederal. Ha pilotado la firma de la reforma laboral de 2021, las subidas del SMI y el acuerdo de pensiones, en coordinación con UGT.", "2017-06-30"),
        ],
    },
    "pepe-alvarez": {
        "perfil": "Pepe Álvarez (Degaña, Asturias, 1956) es secretario general de la Unión General de Trabajadores (UGT) desde 2016. Junto a CCOO, lidera el bloque sindical en el diálogo social y la negociación colectiva de ámbito estatal.",
        "trayectoria": [
            ("De UGT Catalunya a Madrid", "Dirigió UGT de Cataluña durante casi dos décadas, donde se forjó como negociador, antes de dar el salto a la secretaría general confederal.", "1990-01-01"),
            ("Secretario general de UGT", "Desde 2016 dirige la UGT. Ha firmado los grandes acuerdos del diálogo social de la etapa (reforma laboral, SMI, pensiones) y defiende la reducción de jornada y el blindaje del poder adquisitivo.", "2016-03-11"),
        ],
    },
    "sandra-ortega-mera": {
        "perfil": "Sandra Ortega Mera (A Coruña, 1968) es la mujer más rica de España y una de las grandes fortunas del país. Hija del fundador de Inditex, Amancio Ortega, y de Rosalía Mera, heredó la participación de su madre y gestiona su patrimonio e iniciativas filantrópicas con un perfil discreto.",
        "trayectoria": [
            ("Heredera de Rosalía Mera", "Tras el fallecimiento de su madre, cofundadora de Inditex, en 2013, heredó su participación accionarial, convirtiéndose en una de las mayores accionistas del grupo textil.", "2013-08-15"),
            ("Rosp Corunna y filantropía", "Gestiona su fortuna a través de la sociedad Rosp Corunna y dedica una parte relevante a la filantropía, especialmente a la discapacidad (Fundación Pa de Mel) y la salud, siguiendo la estela de su madre.", ""),
        ],
    },
    "juan-carlos-escotet": {
        "perfil": "Juan Carlos Escotet (Caracas, 1959) es presidente de Abanca, el gran banco gallego, y fundador del grupo financiero venezolano Banesco. Banquero de origen venezolano afincado en Galicia, es una de las figuras de mayor poder económico del noroeste peninsular.",
        "trayectoria": [
            ("Banesco en Venezuela", "Construyó en Venezuela uno de los mayores grupos bancarios privados del país (Banesco), antes de expandirse internacionalmente ante la crisis venezolana.", "1992-01-01"),
            ("Compra de Novagalicia y nacimiento de Abanca", "En 2013 adquirió la antigua Novagalicia Banco (rescatada con dinero público) y la refundó como Abanca, que ha crecido con sucesivas compras hasta convertirse en un banco de relevancia nacional.", "2014-06-25"),
        ],
    },
    "begona-gomez": {
        "perfil": "Begoña Gómez (Bilbao, 1975) es directora de cátedra en la Universidad Complutense y esposa del presidente del Gobierno, Pedro Sánchez. Su actividad profesional ha pasado a un primer plano público al verse investigada en un procedimiento judicial.",
        "trayectoria": [
            ("Trayectoria profesional", "Consultora y directiva en el ámbito de la captación de fondos y la responsabilidad social, dirigió un máster y una cátedra extraordinaria sobre transformación social competitiva en la Universidad Complutense.", "2020-01-01"),
            ("Procedimiento judicial abierto", "Desde 2024 está siendo investigada por un juzgado de Madrid en una causa sobre presuntos tráfico de influencias y otros delitos en torno a su actividad. La causa sigue su curso y rige plenamente la presunción de inocencia mientras no haya sentencia firme.", "2024-04-23"),
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
    slug_file = {d["slug"]: f for f, lst in data_by_file.items() for d in lst}

    touched, n_secciones = set(), 0
    for slug, bio in BIOS.items():
        f = slug_file.get(slug)
        if not f:
            print(f"  · aviso: no encontrado {slug}")
            continue
        d = next(x for x in data_by_file[f] if x["slug"] == slug)

        if bio.get("perfil"):
            ident = get_or_make(d, "identidad", 0)
            if ident["items"]:
                ident["items"][0]["contenido"] = bio["perfil"]
            else:
                ident["items"].append({"tipo": "dato", "titulo": "Perfil", "contenido": bio["perfil"]})

        # trayectoria: REEMPLAZA por la narrativa extensa
        tray = get_or_make(d, "trayectoria", 1)
        tray["items"] = []
        for tup in bio.get("trayectoria", []):
            titulo, contenido = tup[0], tup[1]
            item = {"tipo": "evento", "titulo": titulo, "contenido": contenido}
            if len(tup) > 2 and tup[2]:
                item["fecha"] = tup[2]
            tray["items"].append(item)
            n_secciones += 1

        # posiciones / controversias: añade sin duplicar por título
        for tipo_ap in ("posiciones", "controversias"):
            extra = bio.get(tipo_ap)
            if not extra:
                continue
            ap = get_or_make(d, tipo_ap, 2 if tipo_ap == "posiciones" else 5)
            existentes = {x.get("titulo") for x in ap["items"]}
            for tup in extra:
                titulo, contenido = tup[0], tup[1]
                if titulo in existentes:
                    continue
                item = {"tipo": "controversia" if tipo_ap == "controversias" else "dato",
                        "titulo": titulo, "contenido": contenido}
                if len(tup) > 2 and tup[2]:
                    item["tags"] = tup[2]
                ap["items"].append(item)

        d["completeness"] = 0.95
        touched.add(f)

    for f in sorted(touched):
        json.dump(data_by_file[f], open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"  escrito: {Path(f).name}")
    print(f"OK · {len(BIOS)} biografías extensas · {n_secciones} secciones de trayectoria")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
