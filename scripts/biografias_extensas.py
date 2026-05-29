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
        "perfil": "Juan Roig Alfonso (Valencia, 1949) es presidente de Mercadona, la mayor cadena de distribución alimentaria de España, y una de las primeras fortunas del país. Convirtió un pequeño negocio familiar de ultramarinos en el líder absoluto del supermercado español, con un modelo de gestión —y un discurso del «esfuerzo»— que lo ha hecho referente y a la vez figura controvertida del empresariado. Reinvierte buena parte de su fortuna en el emprendimiento y el deporte, y su mujer, Hortensia Herrero, destaca como gran mecenas del arte.",
        "trayectoria": [
            ("De la tienda familiar a Mercadona", "Hijo de una familia de tenderos valencianos, transformó el pequeño negocio de ultramarinos en Mercadona, que bajo su dirección se convirtió en líder absoluto de la distribución en España, con más de 1.600 supermercados.", "1981-01-01"),
            ("El «modelo Mercadona»", "Impuso un modelo de marca propia (Hacendado, Deliplus), «siempre precios bajos», fuerte inversión en logística e integración con proveedores (los «interproveedores»), estudiado y copiado en todo el sector mundial.", "2000-01-01"),
            ("Marina de Empresas y emprendimiento", "Reinvierte parte de su fortuna en el emprendimiento a través de Marina de Empresas, la aceleradora Lanzadera y la escuela de negocios EDEM, con el objetivo declarado de fomentar la cultura del esfuerzo y la empresa.", "2013-01-01"),
            ("Patrón y mecenas valenciano", "Es propietario del Valencia Basket y un activo patrón de iniciativas en la Comunidad Valenciana; junto a su esposa, Hortensia Herrero, forma uno de los grandes binomios empresariales y filantrópicos de España.", "2018-01-01"),
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

    # ── 3er lote · más poder a nivel Sánchez ────────────────────────────────
    "pablo-iglesias-turrion": {
        "perfil": "Pablo Iglesias Turrión (Madrid, 1978) fue vicepresidente segundo del Gobierno y fundador de Podemos, el partido que sacudió el bipartidismo español en 2014. Profesor de Ciencia Política y tertuliano, capitalizó el malestar del 15-M para irrumpir en la política y forzar el primer Gobierno de coalición de la democracia. Tras dejar la primera línea en 2021, dirige el medio Canal Red y mantiene una influencia notable —y polémica— en el espacio de la izquierda alternativa, en tensión con Sumar.",
        "trayectoria": [
            ("Del 15-M a Podemos", "Politólogo y rostro de tertulias como 'La Tuerka', capitalizó el malestar del 15-M para fundar Podemos en 2014, que irrumpió con fuerza en las europeas y las generales, rompiendo el bipartidismo PSOE-PP.", "2014-01-16"),
            ("El «asalto a los cielos»", "Lideró el crecimiento meteórico de Podemos, que llegó a disputar a la izquierda la hegemonía del PSOE, con un discurso anti-casta y de regeneración, antes de estabilizarse como tercera o cuarta fuerza.", "2015-12-20"),
            ("Vicepresidente del Gobierno", "Tras el acuerdo con el PSOE, fue vicepresidente segundo y ministro de Derechos Sociales en el primer Gobierno de coalición (2020-2021), antes de dejar la política activa tras presentarse a las elecciones madrileñas.", "2020-01-13"),
            ("Canal Red y la batalla mediática", "Apartado de los cargos, fundó el medio digital Canal Red y se volcó en la comunicación, manteniendo el pulso con la derecha mediática y marcando distancias críticas con el proyecto de Sumar de Yolanda Díaz.", "2021-05-04"),
        ],
    },
    "josep-borrell": {
        "perfil": "Josep Borrell Fontelles (La Pobla de Segur, Lérida, 1947) es uno de los grandes estadistas del socialismo español y europeo. Ingeniero aeronáutico y economista, fue ministro con Felipe González, presidente del Parlamento Europeo y, sobre todo, Alto Representante de la UE para Asuntos Exteriores y vicepresidente de la Comisión (2019-2024), el cargo diplomático más alto de Europa, desde el que pilotó la respuesta europea a la guerra de Ucrania y a Oriente Próximo. Catalán y firme defensor del constitucionalismo, ha sido una voz incómoda frente al independentismo.",
        "trayectoria": [
            ("Ministro con Felipe González", "Ingeniero y economista, fue secretario de Estado y ministro de Obras Públicas, Transportes y Medio Ambiente en los gobiernos de Felipe González.", "1991-01-01"),
            ("Primarias del PSOE y Parlamento Europeo", "Ganó por sorpresa las primarias del PSOE en 1998 frente al aparato del partido, aunque no llegó a ser candidato; años después presidió el Parlamento Europeo (2004-2007), consolidando su perfil europeísta.", "2004-07-20"),
            ("Ministro de Exteriores y el procés", "Volvió a la primera línea como ministro de Exteriores con Pedro Sánchez en 2018, ejerciendo de azote internacional del independentismo catalán durante los años más duros del procés.", "2018-06-07"),
            ("Alto Representante de la UE", "Entre 2019 y 2024 fue Alto Representante de la Unión para Asuntos Exteriores y vicepresidente de la Comisión Europea, liderando la diplomacia comunitaria ante la guerra de Ucrania, Oriente Próximo y la relación con China y Estados Unidos.", "2019-12-01"),
        ],
    },
    "nadia-calvino": {
        "perfil": "Nadia Calviño (A Coruña, 1968) es presidenta del Banco Europeo de Inversiones (BEI), la mayor institución financiera multilateral del mundo. Economista y alta funcionaria, fue vicepresidenta primera y ministra de Economía del Gobierno de España, donde pilotó la política económica y los fondos europeos.",
        "trayectoria": [
            ("De Bruselas al Gobierno", "Funcionaria de prestigio, fue directora general de Presupuestos de la Comisión Europea antes de incorporarse al Gobierno de Sánchez como ministra de Economía en 2018.", "2018-06-07"),
            ("Vicepresidenta económica", "Como vicepresidenta primera, gestionó la respuesta económica a la pandemia y el despliegue de los fondos Next Generation, con un perfil de ortodoxia y credibilidad ante los mercados y Bruselas.", "2020-01-13"),
            ("Presidencia del BEI", "En 2024 asumió la presidencia del Banco Europeo de Inversiones, primera española al frente de una gran institución financiera multilateral.", "2024-01-01"),
        ],
    },
    "juan-luis-cebrian": {
        "perfil": "Juan Luis Cebrián (Madrid, 1944) es una figura histórica del periodismo y el poder mediático español. Primer director de El País y después consejero delegado y presidente de PRISA, construyó y dirigió durante décadas el mayor grupo de comunicación de la izquierda.",
        "trayectoria": [
            ("Fundador y director de El País", "Fue el primer director de El País (1976), el diario que se convirtió en referencia de la Transición y del progresismo. Académico de la RAE, marcó la línea editorial del periódico durante años.", "1976-05-04"),
            ("La era PRISA", "Como consejero delegado y luego presidente de PRISA, lideró la expansión del grupo (Cadena SER, Canal+, Santillana) y su salida a bolsa, antes de las guerras accionariales que acabaron desplazándolo.", "1988-01-01"),
        ],
    },
    "alicia-koplowitz": {
        "perfil": "Alicia Koplowitz (Madrid, 1952), marquesa de Bellavista, es una de las grandes fortunas e inversoras de España. Tras su etapa en la constructora FCC, gestiona su patrimonio a través del family office Omega Capital y es una de las mayores coleccionistas y mecenas de arte del país.",
        "trayectoria": [
            ("La era FCC", "Junto a su hermana Esther, heredó y dirigió el grupo Construcciones y Contratas (FCC), uno de los gigantes de la obra pública española, del que se desligó tras repartir el patrimonio familiar.", "1990-01-01"),
            ("Omega Capital y el arte", "Desde Omega Capital invierte en cotizadas, inmobiliario y capital riesgo con un perfil discreto. Su colección de arte y su fundación la sitúan entre los grandes mecenas culturales.", "2000-01-01"),
        ],
    },
    "manuel-lao": {
        "perfil": "Manuel Lao Hernández (Granada, 1944) es uno de los grandes empresarios y fortunas de España, fundador del gigante del juego Cirsa. Tras vender la compañía, gestiona su patrimonio diversificado a través del family office Nortia, con un perfil de extrema discreción.",
        "trayectoria": [
            ("De las máquinas a Cirsa", "Construyó desde Cataluña, partiendo del negocio de máquinas recreativas, uno de los mayores grupos de juego y ocio de Europa (Cirsa), con presencia en casinos, salones y apuestas en España y Latinoamérica.", "1978-01-01"),
            ("Venta a Blackstone y Nortia", "En 2018 vendió Cirsa al fondo Blackstone, cristalizando una de las mayores fortunas del país, que hoy reinvierte a través de su holding Nortia en cotizadas, inmobiliario y energía.", "2018-05-01"),
        ],
    },
    "carlos-san-basilio": {
        "perfil": "Carlos San Basilio (Madrid, 1968) es presidente de la Comisión Nacional del Mercado de Valores (CNMV), el supervisor de los mercados financieros españoles. Alto funcionario del Estado, vigila a todas las cotizadas del IBEX, autoriza las grandes operaciones y persigue el abuso de mercado.",
        "trayectoria": [
            ("Alta función pública del Tesoro", "Técnico comercial y economista del Estado, desarrolló su carrera en la Secretaría General del Tesoro y la política financiera del Ministerio de Economía, donde fue secretario general.", "2000-01-01"),
            ("Presidencia de la CNMV", "Accedió a la presidencia del supervisor bursátil, desde donde arbitra OPAs, fusiones bancarias y salidas a bolsa, con la OPA del BBVA sobre el Sabadell como gran asunto de su mandato.", "2024-12-01"),
        ],
    },
    "cani-fernandez": {
        "perfil": "Cani Fernández (1968) es presidenta de la Comisión Nacional de los Mercados y la Competencia (CNMC), el superregulador que vigila la competencia y los sectores de energía, telecomunicaciones y transporte. Abogada especialista en competencia, su criterio condiciona fusiones y precios en toda la economía.",
        "trayectoria": [
            ("Especialista en competencia", "Abogada del Estado y socia de competencia en Cuatrecasas, fue letrada en el Tribunal de Justicia de la Unión Europea, donde se forjó como una de las grandes expertas en derecho de la competencia.", "2000-01-01"),
            ("Presidencia de la CNMC", "Desde 2020 preside la CNMC, organismo que autoriza concentraciones, sanciona cárteles y regula la energía y las telecos. Sus decisiones afectan directamente a las grandes cotizadas y a la factura de los consumidores.", "2020-09-15"),
        ],
    },
    "isabel-perello": {
        "perfil": "Isabel Perelló (Valencia, 1958) es presidenta del Tribunal Supremo y del Consejo General del Poder Judicial (CGPJ), la primera mujer en ocupar la cúspide del poder judicial español. Magistrada de prestigio, accedió al cargo en 2024 tras el desbloqueo de la renovación del CGPJ.",
        "trayectoria": [
            ("Carrera en la magistratura", "Magistrada de larga trayectoria, llegó a la Sala de lo Contencioso-Administrativo del Tribunal Supremo, donde se ganó la reputación de jurista rigurosa e independiente.", "2000-01-01"),
            ("Presidenta del TS y del CGPJ", "En 2024, tras cinco años de bloqueo político en la renovación del CGPJ, fue elegida por consenso presidenta del Tribunal Supremo y del Consejo, con el reto de despolitizar el órgano de gobierno de los jueces.", "2024-09-05"),
        ],
    },
    "jose-felix-tezanos": {
        "perfil": "José Félix Tezanos (Santander, 1946) es presidente del Centro de Investigaciones Sociológicas (CIS), el principal instituto demoscópico público de España. Catedrático de Sociología y teórico histórico del PSOE, sus encuestas y su metodología son objeto de polémica recurrente.",
        "trayectoria": [
            ("Sociólogo y dirigente socialista", "Catedrático de Sociología en la UNED y figura intelectual del PSOE durante décadas, dirigió la revista 'Temas para el Debate' y teorizó sobre la socialdemocracia.", "1980-01-01"),
            ("Presidencia del CIS", "Nombrado presidente del CIS en 2018, defendió un modelo de estimación ('cocina') que ajusta los datos brutos. Sus sondeos, a menudo más favorables al PSOE que otros, han alimentado el debate sobre la independencia del organismo.", "2018-06-29"),
        ],
    },
    "angel-gabilondo": {
        "perfil": "Ángel Gabilondo (San Sebastián, 1949) es Defensor del Pueblo, la alta institución que supervisa a las administraciones y defiende los derechos de los ciudadanos. Catedrático de Filosofía y exministro de Educación, llegó al cargo tras una larga carrera académica y política.",
        "trayectoria": [
            ("Universidad y Ministerio", "Catedrático de Filosofía y rector de la Universidad Autónoma de Madrid, fue ministro de Educación en el último Gobierno de Zapatero (2009-2011).", "2009-04-07"),
            ("Política y Defensor del Pueblo", "Fue candidato del PSOE a la Comunidad de Madrid en varias elecciones. En 2021 fue elegido Defensor del Pueblo con apoyo parlamentario, cargo desde el que tramitó el polémico informe sobre los abusos en la Iglesia.", "2021-11-18"),
        ],
    },
    "alfonso-guerra": {
        "perfil": "Alfonso Guerra González (Sevilla, 1940) es uno de los grandes arquitectos del PSOE moderno y de la Transición democrática. Vicepresidente del Gobierno con Felipe González durante casi una década, fue el gran organizador del partido y su número dos, célebre por su afilada oratoria y su control de la maquinaria socialista. Retirado de los cargos pero no de la política, se ha convertido en una de las voces críticas más duras con el rumbo del PSOE de Pedro Sánchez, especialmente con los pactos con el independentismo y la ley de amnistía.",
        "trayectoria": [
            ("El arquitecto del PSOE", "Hombre de confianza de Felipe González desde el Congreso de Suresnes (1974), diseñó la maquinaria del partido y su estrategia electoral, convirtiéndose en el número dos del socialismo y en uno de los artífices de la Transición.", "1974-10-13"),
            ("Vicepresidente del Gobierno", "Fue vicepresidente del Gobierno entre 1982 y 1991, pieza clave de la modernización de España y de la mayoría socialista, con un peso decisivo en el partido y en el Ejecutivo.", "1982-12-03"),
            ("La salida y el «caso Juan Guerra»", "El escándalo en torno a su hermano Juan, que usaba un despacho oficial para negocios privados, precipitó su salida del Gobierno en 1991, aunque él no resultó condenado.", "1991-01-12"),
            ("Voz crítica del veteranismo socialista", "Retirado de la primera línea, ha presidido fundaciones del partido y se ha erigido en uno de los críticos más severos con los pactos del Gobierno de Sánchez con el independentismo y con la ley de amnistía.", "2023-01-01"),
        ],
    },
    "ursula-von-der-leyen": {
        "perfil": "Ursula von der Leyen (Bruselas, 1958) es presidenta de la Comisión Europea, la institución que propone la legislación de la UE y gestiona los fondos comunitarios. Médico de formación y veterana de la política alemana, es una de las figuras más poderosas de Europa y decisiva para España como gran receptora de fondos.",
        "trayectoria": [
            ("Ministra de Merkel", "Pediatra y madre de siete hijos, hizo carrera en la CDU alemana y fue ministra durante años en los gobiernos de Angela Merkel (Trabajo, Familia y, finalmente, Defensa).", "2005-11-22"),
            ("Presidenta de la Comisión Europea", "En 2019 fue elegida presidenta de la Comisión Europea, reelegida en 2024. Pilotó el plan de recuperación pos-pandemia (del que España es gran beneficiaria), el Pacto Verde y la respuesta a la guerra de Ucrania.", "2019-12-01"),
        ],
    },
    "miguel-angel-rodriguez": {
        "perfil": "Miguel Ángel Rodríguez (Madrid, 1956), 'MAR', es jefe de gabinete de la presidenta de la Comunidad de Madrid, Isabel Díaz Ayuso, y uno de los estrategas de comunicación más influyentes y polémicos de la derecha española. Exsecretario de Estado con Aznar, es el cerebro comunicativo del 'efecto Ayuso'.",
        "trayectoria": [
            ("Secretario de Estado con Aznar", "Periodista de profesión, fue secretario de Estado de Comunicación en el primer Gobierno de Aznar, donde se forjó como uno de los grandes spin doctors de la derecha.", "1996-05-05"),
            ("El cerebro de Ayuso", "Como jefe de gabinete de Díaz Ayuso, diseña su estrategia de confrontación con el Gobierno central y su comunicación, en el centro de polémicas como la del correo sobre el novio de la presidenta.", "2019-08-01"),
        ],
    },
    "blackrock": {
        "perfil": "BlackRock es la mayor gestora de activos del mundo, con billones de dólares bajo gestión, y el primer o uno de los mayores accionistas institucionales de casi todas las grandes cotizadas del IBEX 35. Su voto en juntas y su política de gobernanza condicionan, de forma silenciosa, la estrategia de la élite empresarial española.",
        "trayectoria": [
            ("El gigante de los fondos índice", "Fundada en 1988 por Larry Fink, creció hasta convertirse en la mayor gestora del planeta gracias a su plataforma de fondos indexados (iShares), que la convierte en accionista automático de prácticamente toda gran empresa cotizada del mundo.", "1988-01-01"),
            ("Presencia estructural en España", "Declara participaciones significativas en la mayoría del IBEX 35 (Santander, BBVA, Iberdrola, Telefónica, Inditex…). Sus criterios de gobernanza y sostenibilidad marcan tendencia y su voto es decisivo en operaciones como la OPA del BBVA sobre el Sabadell.", ""),
        ],
    },
    "carlos-slim": {
        "perfil": "Carlos Slim Helú (Ciudad de México, 1940) es un magnate mexicano de origen libanés, una de las mayores fortunas del mundo y el inversor extranjero con mayor peso en la empresa española. Construyó un colosal conglomerado en torno a las telecomunicaciones (América Móvil) que durante años lo situó como el hombre más rico del planeta. En España es accionista de control de la constructora FCC y de la inmobiliaria Realia, además de haber mantenido participaciones en otras grandes cotizadas, lo que lo convierte en una pieza relevante del capitalismo español.",
        "trayectoria": [
            ("El imperio América Móvil", "Inversor con olfato para las empresas en dificultades, construyó un conglomerado en torno a la mexicana Telmex y América Móvil, el mayor operador de telecomunicaciones de Latinoamérica, que lo situó durante años como el hombre más rico del mundo.", "1990-01-01"),
            ("Diversificación global", "Su grupo Carso diversificó en construcción, minería, banca, comercio e infraestructuras, con inversiones en medios (llegó a ser primer accionista de The New York Times) y en empresas de medio mundo.", "2000-01-01"),
            ("Desembarco en España", "Tras la crisis financiera, aprovechó los precios deprimidos para tomar el control de FCC (construcción y servicios urbanos) y de Realia, desplazando a la familia Koplowitz, y entró en otras cotizadas españolas.", "2014-12-01"),
            ("Inversor de referencia", "Mantiene una posición de inversor extranjero de primer orden en España a través de FCC y Realia, con intereses en infraestructuras, agua, residuos e inmobiliario, atento a nuevas oportunidades en el mercado español.", "2020-01-01"),
        ],
    },
    "jose-creuheras": {
        "perfil": "José Creuheras Margenat es presidente del Grupo Planeta —el mayor grupo editorial en lengua española— y de Atresmedia, propietaria de Antena 3, laSexta, Onda Cero y Europa FM. Ligado a la familia fundadora de Planeta, reúne en sus manos un poder doble, editorial y audiovisual, que lo convierte en una de las figuras más influyentes del ecosistema mediático y cultural español e iberoamericano.",
        "trayectoria": [
            ("La saga Lara y el Grupo Planeta", "Vinculado a la familia fundadora de Planeta —el editor José Manuel Lara Hernández creó el grupo en Barcelona en 1949—, se formó en la gestión empresarial y fue asumiendo responsabilidades dentro de un conglomerado que reúne sellos como Planeta, Espasa, Seix Barral, Destino o Booket, además del Premio Planeta, el galardón literario mejor dotado del mundo tras el Nobel.", "1995-01-01"),
            ("Presidente de Planeta y Atresmedia", "Tras el fallecimiento de José Manuel Lara Bosch en 2015, asumió la presidencia del Grupo Planeta y, con ella, la de Atresmedia, el grupo audiovisual en el que Planeta es accionista de referencia, sumando al negocio editorial dos de las grandes cadenas de televisión y radio del país.", "2015-02-01"),
            ("Un conglomerado cultural y educativo", "Bajo su mando, el grupo abarca edición, la productora DeAPlaneta, formación universitaria privada, el diario La Razón y una amplia presencia en América Latina, además de haber crecido en Francia con la editorial Editis, consolidándose como un gigante cultural transnacional.", "2019-01-01"),
            ("Poder editorial y audiovisual", "Su posición al frente de Planeta y Atresmedia lo sitúa como interlocutor de primer orden del poder político y económico y como actor central del mercado publicitario y de la opinión pública, más allá de adscripciones ideológicas explícitas.", "2022-01-01"),
        ],
        "posiciones": [
            ("Influencia mediática", "Su grupo combina el mayor catálogo editorial en español con cadenas generalistas de amplia audiencia, lo que lo sitúa como interlocutor de primer orden del poder político y económico, más allá de adscripciones ideológicas explícitas.", ["medios", "editorial"]),
        ],
    },
    "joseph-oughourlian": {
        "perfil": "Joseph Oughourlian (París, 1972) es presidente de Prisa, el grupo editor de El País, la Cadena SER y el diario deportivo AS, uno de los mayores grupos de medios en lengua española. Financiero franco-armenio y fundador del fondo activista Amber Capital, irrumpió como primer accionista de Prisa y acabó tomando su presidencia tras años de batallas por el control de un grupo considerado estratégico para la conversación pública en español.",
        "trayectoria": [
            ("Financiero y fundador de Amber Capital", "Formado en Francia y curtido en la banca de inversión en Estados Unidos, fundó en 2005 el fondo Amber Capital, especializado en tomar posiciones activistas en compañías cotizadas europeas y presionar a sus gestores para crear valor.", "2005-01-01"),
            ("Activismo en grandes grupos", "Amber protagonizó sonadas batallas accionariales en empresas europeas —entre ellas el grupo francés Lagardère—, ganándose una reputación de inversor combativo dispuesto a enfrentarse a los consejos y a las familias propietarias.", "2010-01-01"),
            ("Primer accionista de Prisa", "Fue elevando su participación en Prisa hasta convertirse en su primer accionista, en un grupo muy endeudado y con una propiedad fragmentada, en disputa con otros inversores y con la presión recurrente sobre el control del consejo.", "2015-01-01"),
            ("Presidente de Prisa", "Asumió la presidencia de Prisa a finales de 2021, en medio de batallas por el control y de la presión política sobre la línea editorial de El País y la SER, con la entrada de nuevos accionistas y la pugna recurrente por la orientación del grupo.", "2021-12-31"),
        ],
        "posiciones": [
            ("Línea editorial y disputas de control", "Su llegada coincidió con tensiones recurrentes sobre la orientación editorial de Prisa y sobre la entrada de nuevos accionistas (financieros e internacionales), en un grupo que es a la vez una empresa endeudada y un actor político de primer nivel.", ["medios", "prisa"]),
        ],
    },
    "javier-tebas": {
        "perfil": "Javier Tebas Medrano (San José, Costa Rica, 1962) es presidente de LaLiga, la patronal del fútbol profesional español, desde 2013. Abogado de formación y de origen aragonés, ha convertido la organización en una potencia económica global gracias a la venta centralizada de derechos audiovisuales, al tiempo que mantiene sonoros enfrentamientos con clubes, federaciones y la UEFA.",
        "trayectoria": [
            ("Abogado y dirigente futbolístico", "Nacido en Costa Rica de padres españoles y criado en Huesca, ejerció como abogado mercantil y se vinculó pronto a la gestión del fútbol, ocupando vicepresidencias en la patronal de clubes antes de presidirla.", "2002-01-01"),
            ("Presidente de LaLiga", "Accedió a la presidencia de la Liga de Fútbol Profesional en 2013 e impulsó la venta centralizada de los derechos televisivos —antes negociados club a club—, multiplicando los ingresos del fútbol español y ordenando su reparto. Ha sido reelegido en sucesivas ocasiones.", "2013-04-26"),
            ("Control económico y el acuerdo con CVC", "Hizo bandera de la lucha contra la piratería y del control económico (límite de gasto) de los clubes, y selló el acuerdo 'LaLiga Impulso' con el fondo CVC, que inyectó miles de millones a cambio de un porcentaje de los ingresos audiovisuales, una operación rechazada por Real Madrid, Barcelona y Athletic.", "2021-08-04"),
            ("Choques permanentes", "Protagoniza enfrentamientos continuos con los grandes clubes, con la Federación Española (RFEF), con la UEFA y con el PSG y el fútbol-Estado, además de oponerse frontalmente al proyecto de la Superliga europea.", "2021-04-19"),
        ],
        "posiciones": [
            ("Modelo de negocio del fútbol", "Defiende un modelo de competición sostenible, con límites de gasto y derechos audiovisuales centralizados, frente a los grandes clubes que reclaman más autonomía. Su gestión divide entre quienes le atribuyen el salto económico de LaLiga y quienes le critican por su estilo y sus enfrentamientos.", ["futbol", "laliga"]),
        ],
    },
    "nacho-cardero": {
        "perfil": "Nacho Cardero es director de El Confidencial, uno de los principales diarios digitales españoles, nacido como nativo digital y especializado en información económica, política y de investigación. Bajo su dirección, el medio —editado por Titania— se ha consolidado entre los más leídos del país y ha publicado algunas de las exclusivas e investigaciones periodísticas de mayor impacto de la última década.",
        "trayectoria": [
            ("Periodista económico", "Desarrolló su carrera en el periodismo económico y de investigación en distintas redacciones antes de incorporarse a El Confidencial en sus primeros años como diario digital de referencia.", "2005-01-01"),
            ("Director de El Confidencial", "Asumió la dirección del medio en 2011 y lo consolidó como uno de los digitales más leídos e influyentes de España, con una potente unidad de investigación y datos.", "2011-01-01"),
            ("Grandes investigaciones", "Bajo su mandato, El Confidencial ha participado en investigaciones internacionales de enorme repercusión —como los Papeles de Panamá, Football Leaks o la lista Falciani— y ha publicado exclusivas sobre corrupción política y financiera.", "2016-01-01"),
            ("Periodismo de investigación de referencia", "El medio ha recibido reconocimientos del sector y se ha situado como actor central del periodismo de datos en español, lo que ha llevado a Cardero a enfrentarse con frecuencia a poderes políticos y económicos por sus publicaciones.", "2020-01-01"),
        ],
    },
    "javier-moll": {
        "perfil": "Javier Moll de Miguel es presidente de Prensa Ibérica, el mayor grupo de prensa regional de España, propietario de cabeceras como El Periódico de Catalunya, Información de Alicante, La Nueva España, Levante-EMV, Faro de Vigo, Diario de Mallorca o el deportivo Sport, entre muchas otras. Empresario de origen canario, ha construido un imperio de diarios locales que le otorga un peso decisivo en la información de proximidad de toda España.",
        "trayectoria": [
            ("De Canarias a la prensa regional", "Procedente del negocio editorial en Canarias —en torno a cabeceras como La Provincia—, empezó a adquirir diarios provinciales por toda España, construyendo un grupo basado en el liderazgo en mercados locales y regionales.", "1984-01-01"),
            ("Consolidación de Prensa Ibérica", "Convirtió Prensa Ibérica en uno de los mayores grupos de prensa del país por número de cabeceras, con una red de diarios líderes en sus territorios y una gestión familiar junto a su esposa, Arantza Sarasola, vicepresidenta del grupo.", "2000-01-01"),
            ("La compra del Grupo Zeta", "En 2019 adquirió el Grupo Zeta, sumando El Periódico de Catalunya y el deportivo Sport a su cartera y reforzando su posición como gigante de la prensa española en pleno desplome de la difusión en papel.", "2019-04-01"),
            ("Transición al digital", "Ha pilotado la transformación digital del grupo —con el lanzamiento de la marca nacional El Periódico de España y la apuesta por las ediciones online de sus cabeceras—, en un sector golpeado por la caída de ingresos publicitarios y de ventas en quiosco.", "2021-01-01"),
        ],
    },
    "borja-prado": {
        "perfil": "Borja Prado Eulate es presidente de Mediaset España, el grupo audiovisual propietario de Telecinco y Cuatro, integrado en el holding paneuropeo MFE-MediaForEurope de la familia Berlusconi. Banquero de inversión de larga trayectoria y figura muy conectada con el poder económico español, antes presidió la eléctrica Endesa durante una década, lo que lo sitúa en el cruce entre la gran empresa, las finanzas y los medios.",
        "trayectoria": [
            ("Banca de inversión", "Desarrolló su carrera en la banca de inversión y el asesoramiento de grandes operaciones corporativas, pasando por entidades de prestigio y tejiendo una densa red de relaciones en el IBEX y en los consejos de administración.", "1990-01-01"),
            ("Presidente de Endesa", "Presidió Endesa entre 2009 y 2019, durante los años de control de la eléctrica por la italiana Enel, ejerciendo de puente entre el accionista transalpino y el establishment empresarial y político español.", "2009-06-20"),
            ("Presidente de Mediaset España", "En 2019 asumió la presidencia de Mediaset España (Telecinco, Cuatro), bajo control de la italiana Mediaset, pilotando la cadena en la dura competencia por la audiencia y la publicidad frente a Atresmedia.", "2019-04-12"),
            ("La integración en MFE", "Le ha correspondido gestionar la integración de la filial española en el holding paneuropeo MFE-MediaForEurope, el proyecto de la familia Berlusconi para consolidar sus operaciones audiovisuales en Europa, en pleno debate sobre la concentración de medios.", "2021-01-01"),
        ],
    },
    "gerardo-cuerva": {
        "perfil": "Gerardo Cuerva Valdivia es presidente de CEPYME, la confederación que representa a la pequeña y mediana empresa española, y vicepresidente de la CEOE. Empresario granadino al frente de un grupo familiar del sector eléctrico y energético, es una de las voces patronales de referencia en el diálogo social, especialmente en lo que afecta a los costes laborales, la morosidad y la fiscalidad de las pymes y los autónomos.",
        "trayectoria": [
            ("Empresario familiar", "Dirige el Grupo Cuerva, empresa familiar granadina del ámbito de las instalaciones eléctricas y la energía, desde donde dio el salto a la representación de los intereses empresariales.", "2000-01-01"),
            ("Dirigente patronal territorial", "Se implicó en la representación empresarial desde el ámbito provincial y autonómico, presidiendo organizaciones de su entorno antes de dar el salto a la cúpula confederal.", "2010-01-01"),
            ("Presidente de CEPYME", "Accedió a la presidencia de CEPYME en 2017, reelegido posteriormente, asumiendo la defensa de los intereses de las pequeñas y medianas empresas, que constituyen el grueso del tejido productivo y del empleo en España.", "2017-11-22"),
            ("Voz de las pymes en el diálogo social", "Participa en la negociación de la reforma laboral, el salario mínimo, las cotizaciones y la lucha contra la morosidad, reclamando que el coste de las nuevas regulaciones no recaiga de forma desproporcionada sobre las empresas más pequeñas.", "2021-01-01"),
        ],
    },
    "santiago-munoz-machado": {
        "perfil": "Santiago Muñoz Machado (Pozoblanco, Córdoba, 1949) es director de la Real Academia Española (RAE) y una de las máximas autoridades del derecho público en España. Catedrático de Derecho Administrativo, jurista de enorme prestigio y autor de una vastísima obra ensayística e histórica, dirige también la Asociación de Academias de la Lengua Española, que agrupa a las academias del español de todo el mundo.",
        "trayectoria": [
            ("Catedrático y jurista", "Catedrático de Derecho Administrativo en varias universidades, se convirtió en una de las grandes referencias del derecho público español, con obra extensa sobre el Estado autonómico, la Constitución, la regulación económica y la historia del derecho.", "1980-01-01"),
            ("Ensayista y académico", "Miembro de tres reales academias —la Española, la de Ciencias Morales y Políticas y la de Jurisprudencia—, compaginó la cátedra con una intensa producción que le valió, entre otros, el Premio Nacional de Historia y el Premio Nacional de Ensayo.", "2013-01-01"),
            ("Director de la RAE", "Fue elegido director de la Real Academia Española en 2018 y reelegido posteriormente, impulsando la sostenibilidad económica de la institución, su proyección digital y los grandes proyectos lexicográficos en línea.", "2018-12-13"),
            ("Panhispanismo lingüístico", "Desde la dirección de la RAE y de la asociación de academias defiende la unidad y el valor del español como lengua global de cientos de millones de hablantes, así como la cooperación con las academias americanas.", "2020-01-01"),
        ],
    },
    "juan-jose-omella": {
        "perfil": "Juan José Omella Omella (Cretas, Teruel, 1946) es cardenal arzobispo de Barcelona y una de las grandes figuras de la Iglesia católica en España. Creado cardenal por el papa Francisco, presidió la Conferencia Episcopal Española entre 2020 y 2024 y forma parte del Dicasterio para los Obispos del Vaticano, encarnando una línea pastoral próxima al magisterio social del pontífice argentino.",
        "trayectoria": [
            ("Sacerdote y misionero", "Ordenado sacerdote en 1970, ejerció el ministerio en parroquias de la diócesis de Zaragoza y como misionero en África (Zaire), forjando un perfil pastoral cercano a los más desfavorecidos.", "1970-09-20"),
            ("Obispo y arzobispo de Barcelona", "Fue obispo de Barbastro-Monzón y de Calahorra y La Calzada-Logroño antes de ser nombrado arzobispo de Barcelona en 2015 por el papa Francisco, que lo creó cardenal en 2017.", "2015-11-06"),
            ("Presidente de la Conferencia Episcopal", "Presidió la Conferencia Episcopal Española entre 2020 y 2024, en años marcados por la pandemia, el debate sobre los abusos en la Iglesia y la tensa relación con un Gobierno de coalición de izquierdas, manteniendo un tono de diálogo institucional.", "2020-03-03"),
            ("Peso en el Vaticano", "Como miembro del Dicasterio para los Obispos, el organismo que asesora al Papa en el nombramiento de obispos en todo el mundo, es una de las voces españolas con mayor influencia en la Curia romana.", "2017-01-01"),
        ],
    },
    "marta-alvarez": {
        "perfil": "Marta Álvarez González es presidenta de El Corte Inglés, el mayor grupo de grandes almacenes de España y uno de los mayores empleadores privados del país. Hija de Isidoro Álvarez, histórico presidente de la compañía, representa a la familia fundadora en el control de un grupo centenario que afronta su transformación tras décadas de hegemonía indiscutida en el comercio minorista español.",
        "trayectoria": [
            ("Formación en la empresa familiar", "Vinculada desde joven a El Corte Inglés, se formó en distintas áreas del grupo creado por Ramón Areces y consolidado por su tío Isidoro Álvarez, accionista de referencia a través de la fundación y la cartera familiar.", "1995-01-01"),
            ("Pugna por el control", "Tras el fallecimiento de Isidoro Álvarez en 2014, la familia y los principales ejecutivos protagonizaron una pugna por el control del grupo, de la que Marta Álvarez emergió reforzada al frente del accionariado de referencia.", "2014-09-01"),
            ("Presidenta de El Corte Inglés", "Asumió la presidencia en 2019, en plena transformación del modelo de grandes almacenes ante el comercio electrónico, con planes de reducción de deuda y de puesta en valor de un enorme patrimonio inmobiliario.", "2019-09-12"),
            ("Nuevos socios y diversificación", "Bajo su presidencia, el grupo ha dado entrada a socios e inversores —como el catarí Hamad Al-Thani y la alianza aseguradora con Mutua Madrileña— y ha buscado diversificar y digitalizar el negocio para competir con los gigantes del comercio online.", "2021-01-01"),
        ],
    },
    "federico-jimenez-losantos": {
        "perfil": "Federico Jiménez Losantos (Orihuela del Tremedal, Teruel, 1951) es periodista, escritor y uno de los comunicadores más influyentes y polémicos de la derecha mediática española. Filólogo de formación, fundador de esRadio y de Libertad Digital, dirige y presenta el programa matinal 'Es la mañana de Federico', desde donde ejerce una crítica frontal a la izquierda, a los nacionalismos periféricos y, con frecuencia, a la propia derecha institucional.",
        "trayectoria": [
            ("De la izquierda en Cataluña al giro liberal", "Filólogo y profesor, militó en la izquierda comunista en la Barcelona de los años setenta. En 1981 impulsó el 'Manifiesto de los 2.300' en defensa del castellano en Cataluña y ese mismo año fue secuestrado y tiroteado en una pierna por el grupo independentista Terra Lliure.", "1981-05-21"),
            ("Articulista y giro ideológico", "Protagonizó un giro ideológico hacia posiciones liberal-conservadoras y se consolidó como articulista combativo, primero en la prensa y después como una de las grandes voces de la tertulia política.", "1990-01-01"),
            ("La radio como tribuna", "Se convirtió en una estrella de la radio matinal, primero en la COPE con 'La Mañana', desde donde ejerció una durísima oposición mediática que le granjeó enormes audiencias y sonadas polémicas con políticos y con la propia jerarquía de la cadena.", "2003-01-01"),
            ("esRadio y Libertad Digital", "Fundó junto a otros socios Libertad Digital y la emisora esRadio, plataformas desde las que mantiene una línea editorial abiertamente conservadora, anti-nacionalista y crítica con el Gobierno, además de publicar numerosos libros de ensayo y memorias.", "2009-11-01"),
        ],
        "posiciones": [
            ("Comentarista de la derecha radical-liberal", "Defiende posiciones liberal-conservadoras, el españolismo frente a los nacionalismos y una crítica feroz a la izquierda; su estilo combativo lo convierte en figura admirada por su público y muy contestada por sus adversarios.", ["medios", "opinion"]),
        ],
    },
    "jaume-roures": {
        "perfil": "Jaume Roures Llop (Barcelona, 1950) es uno de los grandes productores audiovisuales de España, cofundador de Mediapro (grupo Imagina). De pasado militante en la izquierda trotskista, construyó un imperio de producción de cine, televisión y, sobre todo, derechos deportivos, con proyección internacional y una estrecha relación con causas progresistas y con el soberanismo catalán.",
        "trayectoria": [
            ("Militancia y entrada en los medios", "Con un pasado en la izquierda revolucionaria (Liga Comunista Revolucionaria), entró en el sector audiovisual y de la comunicación, vinculándose a proyectos televisivos y deportivos en Cataluña y en el conjunto de España.", "1980-01-01"),
            ("Fundación de Mediapro", "Cofundó en 1994 Mediapro, que creció hasta convertirse en uno de los mayores grupos audiovisuales europeos, con un papel central en la producción y comercialización de los derechos del fútbol.", "1994-01-01"),
            ("La guerra del fútbol y el cine", "Mediapro/Imagina lideró durante años la pugna por los derechos televisivos del fútbol en España y produjo cine de proyección internacional, incluidas películas de Woody Allen como 'Vicky Cristina Barcelona' y 'Midnight in Paris'.", "2008-01-01"),
            ("Expansión global y compromiso político", "El grupo se expandió internacionalmente con producción y derechos deportivos en numerosos países, mientras Roures mantenía un perfil público comprometido con causas de izquierda y, en distintos momentos, con el proceso soberanista catalán.", "2015-01-01"),
        ],
    },
    "jose-pablo-lopez": {
        "perfil": "José Pablo López Sánchez es presidente de RTVE, la Corporación de Radio y Televisión Española, el principal grupo audiovisual público del país (La 1, La 2, RNE y los servicios digitales). Profesional de la televisión con experiencia en cadenas autonómicas y en la producción de contenidos, accedió a la presidencia de la radiotelevisión estatal en 2024, tras años de provisionalidad, mandatos interinos y bloqueo político en la renovación de su consejo de administración.",
        "trayectoria": [
            ("Gestión audiovisual pública", "Desarrolló su carrera en la televisión, con responsabilidades de dirección en cadenas autonómicas —entre ellas Telemadrid— y en la producción y dirección de contenidos para distintos operadores.", "2010-01-01"),
            ("Director de contenidos de RTVE", "Se incorporó a RTVE como responsable de contenidos generales, impulsando la programación, la ficción y la estrategia editorial de la corporación pública.", "2021-01-01"),
            ("Presidente de RTVE", "Fue elegido presidente de RTVE en 2024 por mayoría parlamentaria, asumiendo el reto de reformar la financiación, la audiencia y la gobernanza de la radiotelevisión pública en un contexto de fuerte politización del ente.", "2024-01-01"),
            ("Reforma y audiencias", "Su mandato afronta la recuperación de audiencias de La 1, el refuerzo de los informativos, la transición digital de la corporación y un modelo de financiación sin publicidad convencional que depende de aportaciones del Estado y de los operadores privados.", "2024-06-01"),
        ],
        "posiciones": [
            ("Servicio público y politización", "Defiende un modelo de televisión pública independiente y de servicio, pero su gestión se desenvuelve en un entorno de permanente tensión política sobre el control del ente, la pluralidad informativa y la financiación de la corporación.", ["medios", "rtve"]),
        ],
    },
    "carlos-alsina": {
        "perfil": "Carlos Alsina Ramírez (Madrid, 1969) es uno de los periodistas de radio más influyentes de España, director y presentador del programa matinal 'Más de uno' de Onda Cero. Su entrevista diaria y su 'Monólogo' de apertura se han convertido en una referencia de la conversación política, con un estilo incisivo que le ha valido los principales premios del periodismo radiofónico, como el Premio Ondas, y la fama de entrevistador temido por los políticos.",
        "trayectoria": [
            ("Carrera en la radio", "Desarrolló prácticamente toda su carrera en la radio, formándose en Onda Cero y en la COPE, donde fue creciendo como redactor, presentador y director de informativos y programas.", "1995-01-01"),
            ("'Más de uno' en Onda Cero", "Asumió la dirección y presentación del magacín matinal de Onda Cero, 'Más de uno', consolidándolo como uno de los espacios de referencia de la mañana radiofónica y a sí mismo como entrevistador exigente con los políticos de todos los partidos.", "2015-09-01"),
            ("Referente de la mañana radiofónica", "Su programa compite en la franja matinal con los grandes magacines de la SER y la COPE, y su entrevista y su monólogo marcan a menudo la agenda política del día, citados y replicados por el resto de medios.", "2020-01-01"),
            ("Premios y reconocimiento", "Su trabajo le ha valido los principales galardones del periodismo radiofónico español, situándolo entre las voces más respetadas e influyentes del medio y como uno de los comunicadores con mayor credibilidad transversal.", ""),
        ],
        "posiciones": [
            ("Periodismo de equilibrio exigente", "Cultiva un perfil de periodista riguroso y exigente con el poder, sin un alineamiento partidista evidente, lo que le da credibilidad transversal aunque sus entrevistas resulten incómodas tanto para el Gobierno como para la oposición.", ["medios", "radio"]),
        ],
    },
    "joaquin-manso": {
        "perfil": "Joaquín Manso es director de El Mundo, uno de los grandes diarios de referencia de España, de línea editorial liberal-conservadora. Periodista de la casa, asumió la dirección del periódico en 2020, dando continuidad a la tradición de periodismo de investigación e influencia política del diario fundado y dirigido durante décadas por Pedro J. Ramírez. Llegó al cargo desde la propia redacción, donde se había foguéado en la información política y de tribunales.",
        "trayectoria": [
            ("Periodista de El Mundo", "Desarrolló su carrera en El Mundo, pasando por distintas secciones y responsabilidades, con un perfil ligado a la información política y de tribunales.", "2005-01-01"),
            ("Director del diario", "Fue nombrado director de El Mundo en 2020, al frente de una redacción con fuerte peso en la información política, judicial y económica y una línea editorial crítica con los gobiernos de izquierda.", "2020-01-01"),
            ("Línea editorial e influencia", "Bajo su dirección, El Mundo mantiene su perfil de diario de investigación e influencia, con exclusivas de impacto político y una posición editorial de centro-derecha en el debate público español.", "2022-01-01"),
            ("Investigación y tribunales", "Ha apostado por reforzar el periodismo de investigación y la cobertura de los grandes casos judiciales y políticos, un terreno en el que El Mundo ha marcado históricamente la agenda informativa del país.", "2023-01-01"),
        ],
        "posiciones": [
            ("Diario de centro-derecha", "El Mundo, bajo su dirección, ejerce una vigilancia crítica del Gobierno de coalición, con especial atención a los casos de corrupción, la regeneración institucional y la política territorial, desde una óptica liberal-conservadora.", ["medios", "prensa"]),
        ],
    },
    "ignacio-escolar": {
        "perfil": "Ignacio Escolar García (Burgos, 1975) es fundador y director de elDiario.es, uno de los principales medios digitales españoles, de línea editorial progresista y modelo sostenido en buena parte por sus socios. Periodista pionero de internet, fue director fundador del diario Público antes de crear su propio proyecto, y es además un rostro habitual de las tertulias de televisión y radio y autor de varios libros.",
        "trayectoria": [
            ("Pionero del periodismo digital", "Hijo del periodista Arsenio Escolar, se dio a conocer como uno de los primeros blogueros políticos de referencia en España, combinando la escritura en internet con la radio y la televisión.", "2005-01-01"),
            ("Director fundador de Público", "Fue el director fundador del diario Público en 2007, un periódico de izquierdas que rompió moldes en el mercado de la prensa escrita antes de su crisis y reconversión.", "2007-09-26"),
            ("elDiario.es", "En 2012 fundó elDiario.es, medio nativo digital sostenido en gran parte por sus socios, que se ha consolidado como referente del periodismo progresista y de investigación, con una posición crítica hacia la derecha y los poderes económicos.", "2012-09-18"),
            ("Influencia y polémica", "Su medio y su figura se han convertido en referencia del espacio progresista y en blanco de la derecha mediática; sus investigaciones y editoriales son citados con frecuencia en el debate público y en sede parlamentaria.", "2020-01-01"),
        ],
        "posiciones": [
            ("Medio progresista de socios", "Defiende un periodismo de izquierdas, independiente de los grandes grupos, financiado por sus lectores-socios. Crítico con la derecha y el poder económico, mantiene también investigaciones que han afectado a gobiernos de distinto signo.", ["medios", "digital"]),
        ],
    },
    "eduardo-inda": {
        "perfil": "Eduardo Inda Arriaga (Pamplona, 1966) es fundador y director de OKDiario, un medio digital de línea derechista y combativa, muy crítico con la izquierda y los nacionalismos. Periodista con pasado en El Mundo y Marca, es además un habitual de las tertulias televisivas, donde mantiene un estilo polémico y de confrontación que ha convertido a su medio en un actor influyente de la derecha mediática española.",
        "trayectoria": [
            ("Carrera en prensa", "Desarrolló su carrera en el periodismo, ocupando puestos de responsabilidad como subdirector de El Mundo y director del diario deportivo Marca.", "1995-01-01"),
            ("Fundación de OKDiario", "En 2015 fundó OKDiario, medio nativo digital que ha basado su crecimiento en exclusivas de fuerte impacto político, especialmente contra la izquierda y el independentismo, algunas de ellas objeto de polémica y de litigios.", "2015-09-01"),
            ("Tertuliano y polémicas", "Su presencia constante en las tertulias televisivas y su estilo agresivo lo han convertido en una figura mediática controvertida, admirada por su público y muy cuestionada por sus detractores.", "2018-01-01"),
            ("Choque permanente con la izquierda", "OKDiario y su director mantienen una confrontación constante con el Gobierno de coalición, con la izquierda alternativa y con el independentismo, en una estrategia de exclusivas de denuncia tan exitosa en audiencia como contestada en los tribunales.", "2020-01-01"),
        ],
        "posiciones": [
            ("Medio digital de derecha combativa", "OKDiario mantiene una línea abiertamente derechista y de oposición frontal al Gobierno de coalición y al independentismo, con un periodismo de impacto y denuncia que sus críticos acusan en ocasiones de falta de rigor.", ["medios", "digital"]),
        ],
    },
    "francisco-marhuenda": {
        "perfil": "Francisco Marhuenda García (Barcelona, 1961) es director del diario La Razón, de línea conservadora, y uno de los tertulianos más presentes y vehementes de la televisión española. Profesor universitario y doctor en Historia y en Derecho, fue alto cargo en gobiernos del PP antes de volcarse en el periodismo y la opinión, y es hoy uno de los rostros más reconocibles del debate televisivo en España.",
        "trayectoria": [
            ("Académico y cargo político", "Doctor en Historia y en Derecho y profesor universitario, ocupó cargos en la Administración con el PP, entre ellos jefe de gabinete de ministros en la etapa de José María Aznar.", "1996-01-01"),
            ("Director de La Razón", "Dirige el diario La Razón, periódico de línea conservadora, desde mediados de los años 2000, con una posición editorial de derechas y un fuerte componente de opinión.", "2008-01-01"),
            ("Tertuliano omnipresente", "Es uno de los contertulios más habituales y reconocibles de la televisión, con un estilo apasionado y a menudo polémico que lo ha convertido en personaje popular más allá de la prensa escrita.", "2015-01-01"),
            ("Profesor y autor", "Compagina la dirección del diario y la presencia televisiva con la docencia universitaria y la publicación de libros de historia y ensayo político, un perfil que mezcla el academicismo con el periodismo de opinión.", "2010-01-01"),
        ],
        "posiciones": [
            ("Opinión conservadora", "Desde La Razón y las tertulias defiende posiciones de derecha y constitucionalistas, con crítica al Gobierno de coalición y a los nacionalismos, aunque con un perfil pragmático en su trato con los distintos poderes.", ["medios", "opinion"]),
        ],
    },
    "tomas-fuertes": {
        "perfil": "Tomás Fuertes Fernández (Alhama de Murcia, 1933) es el fundador y presidente del Grupo Fuertes, el conglomerado agroalimentario murciano dueño de ElPozo Alimentación, uno de los mayores grupos cárnicos y de alimentación de España. Empresario hecho a sí mismo, construyó desde una pequeña carnicería familiar un imperio industrial que da empleo a miles de personas y es una de las grandes fortunas del país.",
        "trayectoria": [
            ("De la carnicería familiar a ElPozo", "Procedente de una familia de tratantes de ganado y carniceros, transformó el negocio familiar en una industria cárnica moderna, fundando en los años cincuenta lo que se convertiría en ElPozo Alimentación.", "1954-01-01"),
            ("Diversificación del Grupo Fuertes", "Amplió el grupo más allá de la carne, con presencia en alimentación, distribución, inmobiliario, energía y otros sectores, manteniendo el carácter familiar y la sede en la Región de Murcia.", "1990-01-01"),
            ("Uno de los grandes de la alimentación", "El Grupo Fuertes se consolidó como uno de los mayores grupos agroalimentarios españoles, con ElPozo como marca de gran consumo de referencia, pese a las polémicas periódicas sobre la ganadería intensiva.", "2010-01-01"),
            ("Legado familiar", "Con más de nueve décadas de vida, mantiene la presidencia del grupo y ha articulado su sucesión en el seno de la familia, preservando el control murciano de uno de los mayores grupos privados de alimentación del país.", "2015-01-01"),
        ],
    },
    "helena-revoredo": {
        "perfil": "Helena Revoredo Delvecchio (Buenos Aires, 1947) es presidenta de Prosegur, la mayor empresa española de seguridad privada y una multinacional del sector con fuerte presencia en Europa y América Latina. Tomó las riendas del grupo tras el fallecimiento de su marido y fundador, Herberto Gut, y lo consolidó como líder del sector en el mundo de habla hispana, convirtiéndose en una de las grandes empresarias del país.",
        "trayectoria": [
            ("Al frente de Prosegur", "Asumió la presidencia de Prosegur en 1997, tras la muerte de su esposo y fundador de la compañía, Herberto Gut, haciéndose cargo de un grupo de seguridad en plena expansión.", "1997-01-01"),
            ("Expansión internacional", "Bajo su presidencia, Prosegur creció con fuerza en América Latina y Europa, diversificando en vigilancia, transporte de fondos (Prosegur Cash) y alarmas, hasta convertirse en una multinacional cotizada.", "2004-01-01"),
            ("Una de las grandes fortunas", "Es una de las mujeres más ricas de España a través de su participación de control en Prosegur, figura habitual de los rankings de grandes patrimonios y con actividad también filantrópica.", "2015-01-01"),
            ("Gobierno corporativo y sucesión", "Ha combinado la presidencia con la articulación del relevo generacional en la familia y con un papel activo en foros empresariales, manteniendo el control familiar sobre Prosegur y sus filiales cotizadas.", "2018-01-01"),
        ],
    },
    "ignacio-garralda": {
        "perfil": "Ignacio Garralda Ruiz de Velasco es presidente y consejero delegado del Grupo Mutua Madrileña, una de las mayores aseguradoras de España y un relevante inversor institucional, con participaciones en empresas como BME o el negocio asegurador de El Corte Inglés. Procedente de la banca de negocios, dirige una mutua sin accionistas que reparte sus beneficios entre los mutualistas y es una voz influyente del sector financiero.",
        "trayectoria": [
            ("Banca de negocios y mercados", "Desarrolló su carrera en la banca de inversión y los mercados de valores, vinculado durante años a entidades financieras y al mercado bursátil español.", "1990-01-01"),
            ("Presidente de Mutua Madrileña", "Asumió la presidencia de Mutua Madrileña, aseguradora de carácter mutual (sin accionistas, propiedad de sus asegurados), líder en el seguro del automóvil y en plena diversificación.", "2008-01-01"),
            ("Inversor institucional y diversificación", "Bajo su mando, Mutua diversificó hacia salud, vida y gestión de activos, y tomó participaciones estratégicas —como la mitad del negocio de seguros de El Corte Inglés o gestoras de fondos—, ganando peso como inversor institucional español.", "2018-01-01"),
            ("Voz del seguro y la empresa", "Es una voz influyente del sector asegurador y financiero y participa en patronales y foros empresariales, defendiendo el ahorro privado y el papel del seguro ante retos como la longevidad o los riesgos climáticos.", "2020-01-01"),
        ],
    },
    "demetrio-carceller": {
        "perfil": "Demetrio Carceller Arce es presidente del Grupo Damm, la cervecera catalana dueña de Estrella Damm, y figura central del grupo energético Disa (distribución de combustibles), entre otros negocios familiares. Heredero de una de las grandes sagas empresariales españolas, controla un conglomerado que abarca cerveza, energía, alimentación y participaciones industriales, y mantiene un perfil público discreto pese a su enorme peso económico.",
        "trayectoria": [
            ("La saga Carceller", "Heredero de una influyente familia empresarial, se incorporó a la gestión de los negocios familiares, articulados en torno a la cervecera Damm y al grupo de distribución de combustibles Disa.", "1990-01-01"),
            ("Presidente de Damm", "Preside el Grupo Damm, al que ha expandido más allá de la cerveza Estrella Damm hacia el agua, la alimentación, la logística y la distribución, consolidándolo como uno de los grandes grupos de gran consumo de España.", "2004-01-01"),
            ("Energía e inversiones", "A través de Disa y otras sociedades, la familia mantiene un peso relevante en el sector energético (estaciones de servicio, combustibles) y participaciones en cotizadas, lo que sitúa a Carceller entre los empresarios más poderosos del país.", "2015-01-01"),
            ("Discreción y poder", "Pese a su bajo perfil mediático, su presencia en consejos de administración de empresas cotizadas y una de las mayores fortunas familiares de España lo convierten en un actor de primer orden, repartido entre cerveza, energía e inversiones.", "2020-01-01"),
        ],
    },
    "jose-luis-bonet": {
        "perfil": "José Luis Bonet Ferrer (Barcelona, 1941) es presidente de honor de Freixenet, el mayor grupo mundial de cava, y fue presidente de la Cámara de Comercio de España. Doctor en Derecho y en Ciencias Económicas, ha sido una de las grandes figuras del empresariado catalán y español y un firme defensor de la unidad de mercado y de la 'marca España'.",
        "trayectoria": [
            ("Freixenet, líder mundial del cava", "Ligado a la familia fundadora, dirigió durante décadas Freixenet, la histórica casa de cava catalana, internacionalizándola hasta convertirla en líder mundial del espumoso, antes de su integración con la alemana Henkell.", "1990-01-01"),
            ("Presidente de la Cámara de España", "Presidió la Cámara de Comercio de España, ejerciendo de representante institucional del conjunto del empresariado y de defensor del comercio exterior y de la internacionalización de la empresa española.", "2014-01-01"),
            ("Voz del empresariado constitucionalista", "Referente del empresariado catalán constitucionalista, ha defendido públicamente la unidad de mercado y la permanencia de las empresas en Cataluña, especialmente durante el proceso independentista.", "2017-10-01"),
            ("Mecenazgo y legado", "Más allá de la empresa, ha impulsado iniciativas culturales y educativas y el discurso de la 'marca España', consolidándose como uno de los grandes patriarcas del empresariado español del último medio siglo.", "2018-01-01"),
        ],
    },
    "hortensia-herrero": {
        "perfil": "Hortensia Herrero Chacón (Valencia, 1950) es vicepresidenta de Mercadona, la mayor cadena de supermercados de España, y una de las mujeres más ricas del país. Copropietaria de la compañía junto a su marido, Juan Roig, ha destacado además como gran mecenas de las artes a través de su fundación y del centro de arte que lleva su nombre en Valencia.",
        "trayectoria": [
            ("Cofundadora de la Mercadona moderna", "Acompañó a su marido, Juan Roig, en la transformación de Mercadona desde una modesta cadena de tiendas valenciana hasta el líder indiscutible de la distribución alimentaria en España, de la que es vicepresidenta y accionista de referencia.", "1990-01-01"),
            ("Mecenas de las artes", "Creó la Fundación Hortensia Herrero, volcada en la restauración del patrimonio y el apoyo a la cultura, e impulsó el Centro de Arte Hortensia Herrero (CAHH) en Valencia, una de las grandes colecciones privadas de arte contemporáneo abiertas al público.", "2023-11-01"),
            ("Una de las grandes fortunas", "Su participación en Mercadona la sitúa entre las mayores fortunas femeninas de España, con un perfil discreto centrado en la empresa y en una intensa actividad filantrópica y cultural.", "2023-01-01"),
            ("Perfil discreto e influyente", "Pese a rehuir la exposición pública, su papel en Mercadona y su ambicioso proyecto cultural en Valencia la han convertido en una de las mujeres más influyentes de la economía y el mecenazgo españoles.", "2024-01-01"),
        ],
    },
    "francina-armengol": {
        "perfil": "Francesca «Francina» Armengol Socías (Inca, Mallorca, 1971) es presidenta del Congreso de los Diputados desde 2023, la tercera autoridad del Estado. Farmacéutica de formación y dirigente del PSIB-PSOE, fue presidenta del Govern de las Islas Baleares durante ocho años antes de presidir la Cámara baja en una legislatura especialmente tensa y fragmentada.",
        "trayectoria": [
            ("De la farmacia a la política balear", "Farmacéutica de profesión, inició su carrera política en el socialismo balear, presidiendo el Consell de Mallorca antes de liderar el PSIB-PSOE.", "2007-01-01"),
            ("Presidenta del Govern balear", "Fue presidenta del Govern de las Islas Baleares entre 2015 y 2023, gobernando en coalición con la izquierda y los nacionalistas, con políticas sociales y de defensa del catalán y del territorio.", "2015-07-01"),
            ("Presidenta del Congreso", "Tras las elecciones de 2023 fue elegida presidenta del Congreso de los Diputados con el apoyo de los socios de investidura de Pedro Sánchez, dirigiendo una Cámara muy fragmentada y polarizada y aplicando medidas como el uso de las lenguas cooficiales.", "2023-08-17"),
            ("Tercera autoridad del Estado", "Como presidenta del Congreso ocupa la tercera magistratura del Estado, por detrás del Rey y del presidente del Gobierno, con un papel clave en la ordenación de los debates, la tramitación de las leyes y la representación institucional de la Cámara.", "2023-09-01"),
        ],
    },
    "magdalena-valerio": {
        "perfil": "Magdalena Valerio Cordero (Granada, 1959) es presidenta del Consejo de Estado, el supremo órgano consultivo del Gobierno, y la primera mujer en ocupar el cargo. Jurista y veterana dirigente socialista, fue ministra de Trabajo, Migraciones y Seguridad Social al inicio de la etapa de Pedro Sánchez y diputada durante varias legislaturas.",
        "trayectoria": [
            ("Jurista y política socialista", "Licenciada en Derecho y funcionaria, desarrolló una larga carrera en el PSOE de Castilla-La Mancha, con responsabilidades en el Gobierno regional y como diputada en el Congreso.", "2000-01-01"),
            ("Ministra de Trabajo", "Fue ministra de Trabajo, Migraciones y Seguridad Social entre 2018 y 2020, en el primer Gobierno de Pedro Sánchez, gestionando la subida del salario mínimo y el inicio de la reversión de la reforma laboral.", "2018-06-07"),
            ("Presidenta del Consejo de Estado", "En 2023 fue nombrada presidenta del Consejo de Estado, convirtiéndose en la primera mujer al frente del máximo órgano consultivo del Estado, encargado de dictaminar sobre la legalidad de normas y grandes decisiones públicas.", "2023-01-01"),
            ("Órgano consultivo supremo", "Al frente del Consejo de Estado dirige el organismo que emite dictámenes preceptivos sobre normas, reclamaciones y grandes decisiones del Estado, una función técnica y de garantía jurídica alejada del primer plano político.", "2023-06-01"),
        ],
    },
    "juan-carlos-escotet": {
        "perfil": "Juan Carlos Escotet Rodríguez es presidente de Abanca, el banco gallego surgido de la antigua Novacaixagalicia, y fundador del grupo financiero venezolano Banesco. Banquero de origen venezolano afincado en Galicia, reflotó la entidad gallega tras la crisis de las cajas y la convirtió en un banco rentable y en plena expansión por España y Portugal, figurando entre las mayores fortunas de su país de origen y como uno de los grandes nombres de la banca española.",
        "trayectoria": [
            ("Banesco en Venezuela", "Construyó en Venezuela el grupo Banesco, uno de los mayores bancos privados del país, lo que le dio la dimensión financiera necesaria para expandirse internacionalmente.", "1990-01-01"),
            ("Compra de NCG / Abanca", "Adquirió en 2014 NCG Banco, la entidad gallega nacionalizada heredera de las cajas (Novacaixagalicia), rebautizándola como Abanca y devolviéndola a la rentabilidad.", "2014-06-01"),
            ("Expansión de Abanca", "Bajo su presidencia, Abanca ha crecido mediante adquisiciones de otras entidades en España y Portugal, consolidándose como banco de referencia en Galicia y como actor relevante del sistema financiero español.", "2018-01-01"),
            ("Banca y fortuna", "Compagina la presidencia de Abanca con su papel al frente del grupo Banesco, figurando entre las mayores fortunas de origen venezolano y como uno de los banqueros más influyentes del noroeste español.", "2020-01-01"),
        ],
    },
    "unai-sordo": {
        "perfil": "Unai Sordo Calvo (Barakaldo, Bizkaia, 1972) es secretario general de Comisiones Obreras (CCOO), el mayor sindicato de España junto a UGT, desde 2017. Sindicalista de origen vasco y curtido en el metal, es uno de los principales interlocutores sociales del país en la negociación de salarios, pensiones, jornada y reformas laborales con el Gobierno y la patronal, y una de las voces de referencia de la izquierda sindical española.",
        "trayectoria": [
            ("Del metal a la cúpula sindical", "Curtido en la federación industrial y en CCOO del País Vasco, fue escalando en la organización hasta liderar el sindicato en Euskadi.", "2000-01-01"),
            ("Secretario general de CCOO", "Fue elegido secretario general de CCOO en 2017, sucediendo a Ignacio Fernández Toxo, al frente del mayor sindicato español por representación.", "2017-06-30"),
            ("Diálogo social", "Ha sido protagonista del diálogo social en la etapa del Gobierno de coalición, con acuerdos como la reforma laboral de 2021, las sucesivas subidas del salario mínimo y la reforma de las pensiones.", "2021-01-01"),
            ("Sindicalismo de concertación", "Defiende un modelo de sindicalismo de concertación y acuerdo, combinando la movilización con la negociación, en un contexto en el que la inflación, la vivienda y el reparto de la riqueza marcan el debate.", "2023-01-01"),
        ],
    },
    "pepe-alvarez": {
        "perfil": "José María «Pepe» Álvarez Suárez (Crémenes, León, 1956) es secretario general de la Unión General de Trabajadores (UGT), uno de los dos grandes sindicatos de España, desde 2016. Sindicalista veterano, curtido durante décadas en Cataluña, es junto al líder de CCOO uno de los principales representantes de los trabajadores en el diálogo social y un protagonista habitual de la negociación de salarios, pensiones y derechos laborales con el Gobierno y los empresarios.",
        "trayectoria": [
            ("Sindicalismo en Cataluña", "Desarrolló su carrera sindical en Cataluña, llegando a dirigir la UGT catalana, con un perfil forjado en la negociación colectiva y la representación de los trabajadores.", "1990-01-01"),
            ("Secretario general de UGT", "Fue elegido secretario general de UGT en 2016, sucediendo a Cándido Méndez, con el reto de revitalizar el sindicato tras los años de crisis y de causas judiciales heredadas.", "2016-03-11"),
            ("Diálogo social y acuerdos", "Ha participado en los grandes acuerdos del diálogo social del Gobierno de coalición —reforma laboral, salario mínimo, pensiones—, alternando la firma de pactos con la presión y la movilización.", "2021-01-01"),
            ("Voz de los trabajadores", "Reivindica el reparto de los beneficios empresariales, la reducción de la jornada laboral y la mejora de los salarios como ejes de su acción sindical en un contexto de inflación y debate sobre la vivienda.", "2023-01-01"),
        ],
    },
    "oscar-pierre": {
        "perfil": "Oscar Pierre Prats (Barcelona, 1992) es cofundador y consejero delegado de Glovo, la plataforma de reparto a domicilio nacida en Barcelona y convertida en una de las grandes 'apps' de delivery del sur de Europa, África y América Latina. Uno de los emprendedores tecnológicos españoles de mayor proyección, ha protagonizado además el intenso debate sobre el modelo laboral de los repartidores ('riders') y la economía de plataformas.",
        "trayectoria": [
            ("Fundación de Glovo", "Ingeniero aeronáutico de formación, cofundó Glovo en 2015 como una aplicación de recados y reparto inmediato, que creció rápidamente hasta convertirse en un referente del comercio rápido (quick commerce).", "2015-01-01"),
            ("Crecimiento y compra por Delivery Hero", "Lideró la expansión internacional de Glovo y su financiación con grandes rondas de inversión, hasta que el gigante alemán Delivery Hero tomó el control de la compañía, que mantuvo su sede y marca en Barcelona.", "2022-01-01"),
            ("La batalla de los 'riders'", "Glovo ha estado en el centro del debate sobre la 'ley rider' y la laboralidad de los repartidores, con sanciones e inspecciones de Trabajo y resoluciones judiciales que cuestionaron su modelo de autónomos.", "2021-08-12"),
            ("Emprendimiento tecnológico", "Es uno de los rostros del ecosistema emprendedor y tecnológico español, símbolo tanto del éxito de las startups nacionales como de las tensiones regulatorias y laborales de la economía de plataformas.", "2023-01-01"),
        ],
    },
    "belen-gualda": {
        "perfil": "Belén Gualda González es presidenta de la SEPI (Sociedad Estatal de Participaciones Industriales), el holding empresarial público del Estado español, que gestiona las participaciones en empresas como Indra, Telefónica, Navantia, Correos, Enusa o Hunosa. Funcionaria y gestora pública de larga trayectoria, dirige un instrumento clave de la política industrial y accionarial del Estado, con peso creciente en sectores estratégicos como la defensa y las telecomunicaciones.",
        "trayectoria": [
            ("Gestión pública", "Funcionaria con formación técnica y económica, desarrolló su carrera en la gestión de empresas y organismos del sector público estatal.", "2000-01-01"),
            ("Dirección en la SEPI", "Ocupó responsabilidades de dirección dentro de la SEPI y de sus empresas participadas, conociendo desde dentro el funcionamiento del holding público industrial.", "2018-01-01"),
            ("Presidenta de la SEPI", "Asumió la presidencia de la SEPI, desde la que el Estado ha reforzado su presencia accionarial en empresas estratégicas como Telefónica e Indra y ha gestionado rescates de compañías afectadas por la pandemia.", "2022-01-01"),
            ("Política industrial del Estado", "Dirige un instrumento central de la política industrial y de soberanía económica del Gobierno, en un contexto de mayor intervención pública en sectores estratégicos como la defensa, las telecomunicaciones o la energía, y de gestión de las participaciones del Estado en empresas cotizadas y no cotizadas.", "2023-01-01"),
        ],
    },
    "juan-abello": {
        "perfil": "Juan Abelló Gallo (Madrid, 1941) es un empresario e inversor español, una de las grandes fortunas del país y presidente de la sociedad de capital riesgo Torreal. Farmacéutico de formación y heredero de un grupo farmacéutico que vendió, reorientó su patrimonio hacia la inversión en grandes empresas y es además uno de los más importantes coleccionistas privados de arte de España, con una densa red de relaciones en la élite económica.",
        "trayectoria": [
            ("Del laboratorio farmacéutico a la inversión", "Procedente de una familia con intereses en el sector farmacéutico, vendió esos negocios y reorientó su patrimonio hacia la inversión empresarial y financiera.", "1990-01-01"),
            ("Torreal y las participaciones", "A través de Torreal, ha tomado participaciones en numerosas empresas de distintos sectores, actuando como inversor de referencia y socio capitalista en grandes operaciones del capitalismo español.", "2000-01-01"),
            ("Inversor y coleccionista", "Compagina su actividad inversora con una de las más importantes colecciones privadas de arte de España, y figura de forma recurrente entre las mayores fortunas del país.", "2010-01-01"),
            ("Gran fortuna discreta", "Mantiene un perfil discreto pese a su enorme peso económico, con presencia histórica en consejos de administración de grandes empresas y una densa red de relaciones en la élite empresarial y financiera.", "2020-01-01"),
        ],
    },
    "tomas-olivo": {
        "perfil": "Tomás Olivo López es un empresario inmobiliario español, presidente y principal accionista de General de Galerías Comerciales (GGC), una socimi dueña de numerosos centros comerciales en España. Hecho a sí mismo y de perfil personal muy reservado, ha construido a partir del comercio y la promoción uno de los mayores patrimonios inmobiliarios del país, lo que lo ha situado de forma recurrente entre las mayores fortunas españolas.",
        "trayectoria": [
            ("Del comercio al ladrillo", "Empresario de origen humilde, desarrolló su actividad en el comercio y la promoción inmobiliaria, especialmente en el sur y el levante español, donde levantó y explotó en régimen de alquiler grandes superficies y galerías comerciales.", "1990-01-01"),
            ("General de Galerías Comerciales", "Construyó y consolidó General de Galerías Comerciales, una cartera de grandes centros y galerías comerciales que le aporta unos ingresos por rentas muy elevados.", "2000-01-01"),
            ("Salida a bolsa como socimi", "Sacó GGC al mercado bursátil como socimi, lo que dio visibilidad a un patrimonio que lo sitúa entre los hombres más ricos de España, con un perfil personal muy reservado.", "2018-01-01"),
            ("Gran patrimonio inmobiliario", "Su fortuna, basada en activos inmobiliarios en renta, lo ha situado de forma recurrente en los primeros puestos de los rankings de grandes patrimonios nacionales.", "2020-01-01"),
        ],
    },
    "daniel-mate": {
        "perfil": "Daniel Maté Badenes es un empresario español, uno de los cofundadores y grandes accionistas de Glencore, el gigante mundial del comercio de materias primas y la minería. De perfil extraordinariamente discreto y casi desconocido para el gran público, su participación en la multinacional suiza —de las mayores en manos individuales— lo ha convertido en una de las primeras fortunas de España según los rankings internacionales.",
        "trayectoria": [
            ("El comercio de materias primas", "Desarrolló su carrera en el negocio del trading de materias primas, llegando a ser uno de los socios de referencia de Glencore, la mayor comercializadora de commodities del mundo.", "1990-01-01"),
            ("Socio de Glencore", "Como uno de los grandes accionistas individuales de Glencore desde su salida a bolsa en 2011, acumuló una fortuna multimillonaria ligada a la evolución de los precios de las materias primas y la minería.", "2011-05-19"),
            ("Fortuna discreta", "Pese a figurar entre los españoles más ricos según los rankings internacionales, mantiene un perfil público casi inexistente, alejado de la vida empresarial y mediática española.", "2015-01-01"),
            ("Filantropía", "Ha canalizado parte de su patrimonio hacia iniciativas filantrópicas, manteniendo en todo caso una notable reserva sobre su actividad y su vida personal.", "2020-01-01"),
        ],
    },
    "alberto-alcocer": {
        "perfil": "Alberto Alcocer Torra es un financiero y empresario español que, junto a su primo Alberto Cortina, formó el célebre tándem inversor conocido como «los Albertos», una de las parejas más influyentes y mediáticas del capitalismo español de las últimas décadas. Han controlado o participado en empresas de construcción, banca, energía e inmobiliario, gestionando a través de sociedades familiares un notable patrimonio que los sitúa entre las grandes fortunas del país.",
        "trayectoria": [
            ("El tándem 'los Albertos'", "Junto a su primo Alberto Cortina, casados con dos hermanas de la familia Koplowitz, dirigió grandes grupos empresariales y financieros, convirtiéndose en protagonistas de la vida económica y social española.", "1980-01-01"),
            ("Construcción y energía", "A lo largo de los años, su grupo tuvo presencia en la construcción, la banca y la energía, en una intensa actividad inversora que los situó en el centro del poder económico.", "1990-01-01"),
            ("Participaciones e inversiones", "Mantienen participaciones e intereses en distintas compañías cotizadas y activos, gestionando su patrimonio a través de sociedades de inversión familiares.", "2000-01-01"),
            ("Perfil social y patrimonial", "Más allá de los negocios, 'los Albertos' han sido figuras habituales de la crónica social y empresarial española, con un patrimonio que los sitúa entre las grandes fortunas del país.", "2010-01-01"),
        ],
    },
    "cristina-herrero": {
        "perfil": "Cristina Herrero Sánchez es presidenta de la AIReF (Autoridad Independiente de Responsabilidad Fiscal), el organismo que vigila el cumplimiento de las reglas fiscales y la sostenibilidad de las cuentas públicas en España. Economista y técnica del Estado especializada en finanzas públicas, dirige una institución clave para la credibilidad de la política presupuestaria española ante el Gobierno, el Parlamento y las instituciones europeas.",
        "trayectoria": [
            ("Técnica de la Hacienda pública", "Economista y funcionaria especializada en finanzas públicas, desarrolló su carrera en el análisis presupuestario y la sostenibilidad de las cuentas del Estado.", "2000-01-01"),
            ("En la AIReF", "Se incorporó a la AIReF desde su creación, ocupando responsabilidades técnicas de dirección en el análisis económico y fiscal del organismo.", "2014-01-01"),
            ("Presidenta de la AIReF", "Fue nombrada presidenta de la AIReF en 2020, al frente de la autoridad fiscal independiente que evalúa los Presupuestos, las previsiones macroeconómicas y la deuda, con dictámenes que condicionan el debate presupuestario.", "2020-09-01"),
            ("Vigilancia fiscal", "Bajo su dirección, la AIReF ha ganado peso como árbitro técnico de la política fiscal, en pleno regreso de las reglas fiscales europeas y debate sobre el déficit, la deuda y el gasto público, en diálogo permanente con el Ministerio de Hacienda, las comunidades autónomas y la Comisión Europea.", "2023-01-01"),
        ],
    },
    "alejandra-kindelan": {
        "perfil": "Alejandra Kindelán Oteyza es presidenta de la AEB (Asociación Española de Banca), la patronal de los bancos privados que operan en España y la primera mujer al frente de la organización. Economista con una larga trayectoria en el Banco Santander, donde dirigió estudios y asuntos públicos, es la voz del gran sector bancario en el debate sobre la fiscalidad, la regulación, la remuneración del ahorro y el papel de la banca en la economía.",
        "trayectoria": [
            ("Economista en el Santander", "Economista de formación internacional, desarrolló buena parte de su carrera en el Banco Santander, donde dirigió áreas de estudios, estrategia y asuntos públicos.", "2000-01-01"),
            ("Presidenta de la AEB", "Fue nombrada presidenta de la Asociación Española de Banca en 2022, primera mujer al frente de la patronal bancaria, en representación de las grandes entidades del sector.", "2022-01-01"),
            ("Defensa del sector bancario", "Ejerce de portavoz de la banca en debates sensibles como el impuesto extraordinario a las entidades, la inclusión financiera, la remuneración del ahorro o la regulación europea del sector.", "2022-06-01"),
            ("Regulación y reputación", "Defiende el papel de la banca en la financiación de la economía y de la transición, en un contexto de elevados beneficios del sector, presión fiscal y debate sobre el acceso a los servicios financieros.", "2023-01-01"),
        ],
    },
    "letizia-ortiz": {
        "perfil": "Letizia Ortiz Rocasolano (Oviedo, 1972) es la Reina de España, esposa del rey Felipe VI. Antes de su matrimonio fue una periodista de prestigio, presentadora de los informativos de TVE y CNN+, lo que la convirtió en la primera reina consorte de la democracia procedente de una familia no aristocrática y con una carrera profesional propia. Como reina, ejerce una intensa agenda institucional centrada en la educación, la salud, la cultura y las causas sociales.",
        "trayectoria": [
            ("Periodista de televisión", "Licenciada en Periodismo y con experiencia en agencias y diarios, se consolidó como presentadora de informativos en CNN+ y, sobre todo, en Televisión Española, donde condujo el Telediario en el horario de máxima audiencia.", "2000-01-01"),
            ("Boda con el Príncipe de Asturias", "En 2004 contrajo matrimonio con el entonces príncipe Felipe, en una boda de enorme repercusión, convirtiéndose en princesa de Asturias. La pareja tiene dos hijas: Leonor, heredera de la Corona, y Sofía.", "2004-05-22"),
            ("Reina de España", "Tras la proclamación de Felipe VI en 2014, asumió el papel de reina consorte, con una agenda propia centrada en la educación, la formación profesional, la investigación, la salud (nutrición, cáncer, enfermedades raras) y la cultura.", "2014-06-19"),
            ("Imagen de una monarquía renovada", "Su perfil profesional y su estilo han contribuido a la imagen de una monarquía más cercana y moderna, aunque sometida al escrutinio mediático propio de la institución y a las tensiones de la Corona en la España contemporánea.", "2018-01-01"),
        ],
    },
    "vicente-valles": {
        "perfil": "Vicente Vallés Lázaro (Madrid, 1963) es uno de los periodistas más influyentes de la televisión española, director y presentador de la segunda edición de Antena 3 Noticias. Reconocido por sus análisis de política nacional e internacional y por sus entrevistas, ha recibido los principales premios del periodismo y es autor de varios libros de éxito sobre geopolítica y la injerencia rusa en las democracias.",
        "trayectoria": [
            ("Carrera en informativos", "Desarrolló su carrera en los informativos de televisión, pasando por cadenas como Telecinco, CNN+ y Cuatro, donde dirigió y presentó espacios de noticias.", "1990-01-01"),
            ("Antena 3 Noticias", "Se incorporó a Antena 3, donde dirige y presenta la edición de la noche de los informativos, líderes de audiencia en su franja, consolidándose como una de las caras de referencia de la información en España.", "2015-01-01"),
            ("Reconocimiento y premios", "Su trabajo le ha valido los grandes galardones del periodismo audiovisual, como el Premio Ondas y la Antena de Oro, por su rigor y su capacidad de análisis.", "2018-01-01"),
            ("Escritor de geopolítica", "Es autor de ensayos de gran éxito sobre la política internacional, la desinformación y la estrategia rusa, que lo han situado también como analista de referencia más allá de la pantalla.", "2020-01-01"),
        ],
    },
    "angel-gabilondo": {
        "perfil": "Ángel Gabilondo Pujol (San Sebastián, 1949) es el Defensor del Pueblo, la alta institución que vela por los derechos de los ciudadanos frente a las administraciones. Catedrático de Filosofía y exrector de la Universidad Autónoma de Madrid, fue ministro de Educación y candidato del PSOE, con un perfil de diálogo y talante moderado reconocido en todo el arco político.",
        "trayectoria": [
            ("Filósofo y rector", "Catedrático de Metafísica, desarrolló una larga carrera académica que culminó en el rectorado de la Universidad Autónoma de Madrid y en la presidencia de la conferencia de rectores (CRUE).", "1990-01-01"),
            ("Ministro de Educación", "Fue ministro de Educación entre 2009 y 2011, en la etapa de Rodríguez Zapatero, donde buscó —sin éxito— un gran pacto de Estado por la educación, seña de su talante dialogante.", "2009-04-07"),
            ("Candidato del PSOE en Madrid", "Fue el candidato socialista a la Comunidad de Madrid en las elecciones de 2015, 2019 y 2021, ejerciendo de jefe de la oposición en la Asamblea madrileña.", "2015-05-24"),
            ("Defensor del Pueblo", "En 2021 fue elegido Defensor del Pueblo por las Cortes, al frente de la institución que supervisa a las administraciones y tramita las quejas de los ciudadanos, con informes sobre derechos, inmigración o servicios públicos.", "2021-11-18"),
        ],
    },
    "jose-felix-tezanos": {
        "perfil": "José Félix Tezanos Tortajada (Santander, 1946) es presidente del Centro de Investigaciones Sociológicas (CIS), el instituto demoscópico público, desde 2018. Catedrático de Sociología y veterano militante e ideólogo del PSOE, su gestión del CIS ha sido objeto de una intensa polémica por la metodología y la orientación de sus encuestas, criticadas por la oposición y parte del sector demoscópico.",
        "trayectoria": [
            ("Sociólogo y teórico del PSOE", "Catedrático de Sociología, fue durante décadas uno de los principales ideólogos del PSOE, director de la revista 'Temas para el Debate' y miembro de los órganos de pensamiento del partido.", "1990-01-01"),
            ("Presidente del CIS", "Fue nombrado presidente del CIS en 2018, al frente del organismo público encargado de medir la opinión y las intenciones de voto de los españoles.", "2018-06-29"),
            ("La polémica demoscópica", "Su etapa ha estado marcada por la controversia: cambios metodológicos como el llamado 'cocinado' de los datos y unas estimaciones a menudo favorables al PSOE le han valido fuertes críticas de la oposición.", "2019-01-01"),
            ("Defensa de su gestión", "Tezanos defiende la solvencia técnica del CIS y atribuye las críticas a la incomodidad política con unos resultados que, sostiene, han acertado en tendencias clave, en un debate recurrente sobre la independencia del instituto.", "2023-01-01"),
        ],
    },
    "carlos-san-basilio": {
        "perfil": "Carlos San Basilio Pardo es presidente de la Comisión Nacional del Mercado de Valores (CNMV), el organismo que supervisa los mercados de valores españoles y a sus participantes. Economista y alto funcionario del Estado con una larga trayectoria en la política económica y financiera —pasó, entre otros cargos, por la Secretaría de Estado de Economía—, dirige al regulador bursátil en un periodo marcado por grandes operaciones corporativas como la OPA del BBVA sobre el Banco Sabadell.",
        "trayectoria": [
            ("Alto funcionario económico", "Técnico comercial y economista del Estado, desarrolló su carrera en el Ministerio de Economía y en organismos financieros, con responsabilidades en política económica y mercados.", "2000-01-01"),
            ("Secretaría de Estado de Economía", "Ocupó altos cargos en la Administración económica, incluida la Secretaría de Estado de Economía, participando en la respuesta a la crisis financiera y a la pandemia.", "2018-01-01"),
            ("Presidente de la CNMV", "Fue nombrado presidente de la CNMV en 2024, al frente del supervisor de los mercados de valores, encargado de velar por la transparencia, la protección del inversor y el correcto funcionamiento de la bolsa.", "2024-01-01"),
            ("Supervisión de grandes operaciones", "Le corresponde arbitrar episodios sensibles como las opas, las salidas a bolsa y la información de las cotizadas, en un momento de intensa actividad corporativa en el IBEX 35.", "2024-06-01"),
        ],
    },
    "manuel-lao": {
        "perfil": "Manuel Lao Hernández (Granada, 1944) es un empresario español, fundador del grupo de juego y ocio Cirsa y una de las mayores fortunas del país. Construyó desde cero, a partir de las máquinas recreativas, un gigante de los casinos, los bingos y las apuestas con presencia en España y América Latina, que en 2018 vendió al fondo estadounidense Blackstone por una cifra multimillonaria. Reorientó después su patrimonio hacia la inversión a través de su sociedad Nortia, manteniendo un perfil personal extremadamente discreto pese a figurar de forma recurrente entre los hombres más ricos del país.",
        "trayectoria": [
            ("Fundación de Cirsa", "Empezó en el negocio de las máquinas recreativas y construyó Cirsa, que convirtió en uno de los mayores grupos de juego de España (casinos, bingos, salas y apuestas).", "1980-01-01"),
            ("Expansión internacional", "Expandió Cirsa por Europa y América Latina, diversificando en casinos, salones de juego y apuestas, hasta convertirla en una multinacional del ocio y el juego.", "2000-01-01"),
            ("Venta a Blackstone", "En 2018 vendió Cirsa al fondo estadounidense Blackstone por una cifra multimillonaria, materializando una de las mayores fortunas familiares de España.", "2018-01-01"),
            ("Inversor a través de Nortia", "Reorientó su patrimonio hacia la inversión mediante su holding Nortia, con participaciones en empresas cotizadas, inmobiliario y otros activos, manteniendo un perfil reservado.", "2020-01-01"),
        ],
    },
    "isabel-perello": {
        "perfil": "Isabel Perelló Doménech es presidenta del Tribunal Supremo y del Consejo General del Poder Judicial (CGPJ), la primera mujer en presidir el poder judicial español en sus dos siglos de historia. Magistrada de larga trayectoria en la Sala de lo Contencioso-Administrativo del Tribunal Supremo, fue elegida en 2024 como candidata de consenso entre los bloques conservador y progresista para desbloquear la renovación del órgano de gobierno de los jueces, que había permanecido paralizada durante más de cinco años.",
        "trayectoria": [
            ("Carrera judicial", "Ingresó en la carrera judicial y desarrolló una larga trayectoria como magistrada, llegando al Tribunal Supremo, donde ejerció en la Sala de lo Contencioso-Administrativo.", "1990-01-01"),
            ("Magistrada del Supremo", "Como magistrada del alto tribunal, participó en relevantes resoluciones del orden contencioso-administrativo, ganándose una reputación de independencia y rigor técnico.", "2009-01-01"),
            ("Presidenta del TS y del CGPJ", "En 2024 fue elegida presidenta del Tribunal Supremo y del CGPJ, como candidata de consenso entre los vocales propuestos por PSOE y PP, tras años de bloqueo en la renovación del órgano.", "2024-09-01"),
            ("Primera mujer al frente del poder judicial", "Su elección supuso un hito histórico al ser la primera mujer en presidir el poder judicial español, con el reto de recuperar la normalidad institucional y los nombramientos pendientes en la cúpula judicial.", "2024-09-02"),
        ],
    },
    "carlos-herrera": {
        "perfil": "Carlos Herrera Crusset (Barcelona, 1957) es uno de los comunicadores de radio más populares e influyentes de España, director y presentador de 'Herrera en COPE', el magacín matinal de la cadena. Periodista de larguísima trayectoria que ha pasado por RNE, la Cadena SER, Onda Cero y TVE, lidera con frecuencia las audiencias de la mañana y es una de las grandes voces del medio, con un perfil próximo a la centroderecha y una notable influencia en la conversación política española.",
        "trayectoria": [
            ("Larga carrera en radio y TV", "Desarrolló una extensa carrera en los grandes grupos de comunicación, presentando programas en RNE, la Cadena SER, Onda Cero y Televisión Española.", "1985-01-01"),
            ("Líder de la mañana radiofónica", "Consolidó su prestigio como presentador de magacines matinales de gran audiencia, alternando entre Onda Cero y la COPE, donde se convirtió en una de las figuras estrella.", "2000-01-01"),
            ("'Herrera en COPE'", "Dirige y presenta 'Herrera en COPE', uno de los programas más escuchados de la radio española, desde el que ejerce una notable influencia en la conversación política, con un tono crítico hacia los gobiernos de izquierda.", "2015-09-01"),
            ("Premios y popularidad", "Ha recibido numerosos premios Ondas y Antenas de Oro, y su popularidad trasciende la radio, con presencia en televisión y una marcada personalidad pública.", "2018-01-01"),
        ],
    },
    "juan-luis-cebrian": {
        "perfil": "Juan Luis Cebrián Echarri (Madrid, 1944) es un periodista y escritor español, figura histórica de la prensa de la democracia. Fue el primer director de El País, el diario que ayudó a fundar en 1976, y después presidente ejecutivo del grupo Prisa durante décadas. Miembro de la Real Academia Española, encarna el poder mediático del periodismo de la Transición.",
        "trayectoria": [
            ("Primer director de El País", "Periodista formado en la prensa del tardofranquismo, fue el director fundador de El País en 1976, el diario que se convirtió en referencia de la Transición y en el de mayor influencia de la democracia.", "1976-05-04"),
            ("Al frente de Prisa", "Dejó la dirección del periódico para dirigir el grupo Prisa como consejero delegado y después presidente, convirtiéndolo en el mayor grupo de comunicación en español (El País, SER, Santillana).", "1988-01-01"),
            ("Poder e influencia mediática", "Durante décadas fue uno de los hombres más influyentes de España, en el cruce entre los medios, la política y los negocios, no exento de polémicas por el endeudamiento y las luchas de poder en Prisa.", "2000-01-01"),
            ("Académico y escritor", "Miembro de la Real Academia Española y autor de novelas y ensayos, ha mantenido un papel de comentarista y figura intelectual, símbolo del periodismo de una época.", "2018-01-01"),
        ],
    },
    "alicia-koplowitz": {
        "perfil": "Alicia Koplowitz Romero de Juseu (Madrid, 1952), marquesa de Bellavista, es una empresaria, inversora y filántropa española, una de las mayores fortunas del país. Tras vender a su hermana Esther su participación en el grupo de construcción familiar (germen de FCC), gestiona su patrimonio a través de la sociedad de inversión Omega Capital, con la que invierte en empresas cotizadas, fondos e inmobiliario. Es además una reconocida coleccionista de arte y mecenas, con una de las pinacotecas privadas más valiosas de España.",
        "trayectoria": [
            ("La herencia Koplowitz y FCC", "Junto a su hermana Esther, heredó y controló el grupo de construcción y servicios que daría lugar a FCC, una de las mayores constructoras de España.", "1990-01-01"),
            ("Salida de FCC", "A finales de los años noventa vendió su participación en el grupo a su hermana, materializando una enorme fortuna que decidió gestionar de forma independiente.", "1998-01-01"),
            ("Omega Capital", "Creó Omega Capital, su sociedad de inversión, con la que ha tomado participaciones en empresas cotizadas, fondos e inmobiliario, consolidándose como una de las grandes inversoras españolas.", "1999-01-01"),
            ("Mecenas y coleccionista", "Es una reconocida coleccionista de arte y mecenas a través de su fundación, con una de las colecciones privadas más valiosas de España y una intensa actividad filantrópica.", "2010-01-01"),
        ],
    },
    "sandra-ortega-mera": {
        "perfil": "Sandra Ortega Mera (A Coruña, 1968) es la mujer más rica de España y la principal accionista individual de Inditex después de su padre, Amancio Ortega. Heredó la participación de su madre, Rosalía Mera, cofundadora del grupo Zara, y gestiona su patrimonio e inversiones a través de la sociedad Rosp Corunna, con un perfil personal muy discreto y una intensa actividad filantrópica orientada a la discapacidad y la inclusión social.",
        "trayectoria": [
            ("Hija de los fundadores de Zara", "Hija de Amancio Ortega y de Rosalía Mera, cofundadores de Zara/Inditex, se formó en el ámbito de la terapia ocupacional y la atención a la discapacidad, lejos del foco empresarial.", "1990-01-01"),
            ("La herencia de Rosalía Mera", "Tras el fallecimiento de su madre en 2013, heredó su participación en Inditex y su patrimonio, convirtiéndose en la mujer más rica de España y una de las mayores accionistas del grupo textil.", "2013-08-15"),
            ("Rosp Corunna", "Gestiona su patrimonio e inversiones a través de la sociedad Rosp Corunna, diversificando en cotizadas, inmobiliario y otros activos, además de su paquete en Inditex.", "2014-01-01"),
            ("Filantropía social", "Continúa la labor social iniciada por su madre a través de la fundación familiar, con proyectos centrados en la discapacidad y la inclusión, manteniendo un perfil público muy reservado.", "2015-01-01"),
        ],
    },
    "begona-gomez": {
        "perfil": "Begoña Gómez Fernández (Bilbao, 1975) es la esposa del presidente del Gobierno, Pedro Sánchez. Profesional del ámbito de la consultoría, el marketing y la captación de fondos (fundraising) para entidades, dirigió una cátedra extraordinaria en la Universidad Complutense de Madrid centrada en la transformación social. Desde 2024 es objeto de una investigación judicial abierta en Madrid relacionada con su actividad profesional; la causa sigue su curso y rige plenamente la presunción de inocencia, sin que por el momento existan hechos probados en su contra.",
        "trayectoria": [
            ("Trayectoria profesional", "Con formación en marketing y dirección, desarrolló su carrera en la consultoría, la captación de fondos para entidades y la responsabilidad social corporativa en distintas organizaciones.", "2000-01-01"),
            ("Cátedra en la Universidad Complutense", "Dirigió una cátedra extraordinaria de transformación social competitiva en la Universidad Complutense de Madrid, vinculada a la captación de patrocinios empresariales.", "2020-01-01"),
            ("Esposa del presidente del Gobierno", "Como cónyuge de Pedro Sánchez, ha mantenido un perfil discreto, aunque su actividad profesional y sus relaciones institucionales han sido objeto de creciente atención pública y política.", "2018-06-01"),
            ("Investigación judicial", "Desde 2024 es investigada en una causa instruida en Madrid por presuntos delitos relacionados con su actividad profesional y la cátedra; la investigación sigue su curso y rige plenamente la presunción de inocencia.", "2024-04-23"),
        ],
    },
    "miguel-angel-rodriguez": {
        "perfil": "Miguel Ángel Rodríguez (Madrid, 1956), conocido como 'MAR', es jefe de gabinete y principal asesor de comunicación de Isabel Díaz Ayuso, presidenta de la Comunidad de Madrid. Veterano del oficio, fue secretario de Estado de Comunicación y portavoz con José María Aznar, y es considerado uno de los estrategas de comunicación política más influyentes y combativos de la derecha española.",
        "trayectoria": [
            ("Portavoz con Aznar", "Periodista de formación, fue secretario de Estado de Comunicación y portavoz del Gobierno en la primera etapa de José María Aznar, ganándose fama de duro estratega de la comunicación.", "1996-05-06"),
            ("Consultoría y comunicación", "Tras dejar la política institucional, desarrolló su actividad en la consultoría de comunicación y los medios, manteniéndose como una voz influyente en la derecha mediática.", "2000-01-01"),
            ("Jefe de gabinete de Ayuso", "Se incorporó al equipo de Isabel Díaz Ayuso como jefe de gabinete, convirtiéndose en uno de los principales arquitectos de su estrategia política y comunicativa.", "2019-01-01"),
            ("Polémicas de comunicación", "Su papel ha estado en el foco por episodios de fuerte confrontación política y mediática, en particular en torno al caso de la pareja de Ayuso y la difusión de informaciones, asuntos sobre los que rige la presunción de inocencia.", "2024-03-01"),
        ],
    },
    "cani-fernandez": {
        "perfil": "Cani Fernández Vicién es presidenta de la Comisión Nacional de los Mercados y la Competencia (CNMC), el organismo que vela por la libre competencia y supervisa sectores regulados como la energía, las telecomunicaciones, el transporte o el sector audiovisual. Abogada de prestigio internacional especializada en derecho de la competencia y de la Unión Europea, con una larga trayectoria ante los tribunales españoles y comunitarios, dirige al gran regulador económico español, cuyas decisiones sobre cárteles, concentraciones empresariales y mercados regulados condicionan a las mayores compañías del país.",
        "trayectoria": [
            ("Abogada de la competencia", "Abogada especializada en derecho europeo y de la competencia, desarrolló una destacada carrera en la abogacía de los negocios, con experiencia ante los tribunales españoles y comunitarios.", "1995-01-01"),
            ("Presidenta de la CNMC", "Fue nombrada presidenta de la CNMC en 2020, al frente del organismo que sanciona los cárteles, autoriza concentraciones y supervisa los sectores regulados.", "2020-09-01"),
            ("Defensa de la competencia", "Bajo su mandato, la CNMC ha actuado contra prácticas anticompetitivas en numerosos sectores y ha analizado grandes operaciones, como concentraciones bancarias y energéticas.", "2021-01-01"),
            ("Regulación de sectores estratégicos", "Le corresponde arbitrar en mercados clave —energía, telecomunicaciones, transporte— en un contexto de transición energética, concentración empresarial y tensión sobre los precios.", "2023-01-01"),
        ],
    },
    "luis-arguello": {
        "perfil": "Luis Javier Argüello García (Meneses de Campos, Palencia, 1953) es presidente de la Conferencia Episcopal Española y arzobispo de Valladolid. Doctor en Teología y con formación jurídica, ejerció como abogado antes de ordenarse sacerdote, ya entrado en la madurez. Sucedió al cardenal Juan José Omella al frente del episcopado español en 2024, convirtiéndose en la principal voz institucional de la Iglesia católica en España y en su interlocutor de referencia ante el Gobierno, en asuntos que van desde la respuesta a los abusos y la inmigración hasta la enseñanza de la religión, la financiación de la Iglesia o los debates sobre el aborto y la eutanasia.",
        "trayectoria": [
            ("Del derecho al sacerdocio", "Ejerció como abogado antes de ingresar en el seminario y ordenarse sacerdote, combinando después el ministerio pastoral con su formación jurídica y teológica.", "1980-01-01"),
            ("Obispo y secretario de la CEE", "Fue nombrado obispo auxiliar de Valladolid y secretario general y portavoz de la Conferencia Episcopal Española, ejerciendo de voz pública del episcopado.", "2018-03-01"),
            ("Arzobispo de Valladolid", "Fue nombrado arzobispo de Valladolid, consolidando su peso en la jerarquía de la Iglesia española.", "2022-05-01"),
            ("Presidente de la Conferencia Episcopal", "En 2024 fue elegido presidente de la Conferencia Episcopal Española, sucediendo al cardenal Omella, al frente de la institución en asuntos como los abusos, la inmigración, la educación o la relación con el Gobierno.", "2024-03-01"),
        ],
    },
    "pepa-bueno": {
        "perfil": "Josefa «Pepa» Bueno Echeverría (Albuquerque, Badajoz, 1964) es directora de El País, el diario de mayor difusión de España y buque insignia del grupo Prisa, y la primera mujer al frente de su redacción. Periodista de larga y reconocida trayectoria en radio y televisión, dirigió y presentó los informativos de TVE y el magacín matinal de la Cadena SER, 'Hoy por Hoy', antes de asumir la dirección del periódico, de línea editorial socioliberal y proyección internacional en español.",
        "trayectoria": [
            ("Radio y televisión", "Desarrolló su carrera en TVE, donde presentó los telediarios y programas de máxima audiencia, antes de dar el salto a la radio.", "1990-01-01"),
            ("'Hoy por Hoy' en la SER", "Dirigió y presentó 'Hoy por Hoy', el magacín matinal de la Cadena SER, el de mayor audiencia de la radio española, consolidándose como una de las grandes voces del periodismo.", "2015-01-01"),
            ("Directora de El País", "En 2021 fue nombrada directora de El País, con el reto de liderar la transición digital y el modelo de suscripciones del diario.", "2021-11-01"),
            ("Línea editorial de referencia", "Dirige un diario de referencia internacional en español, de orientación socioliberal, con peso en la agenda política y en los debates sobre la independencia editorial frente a los vaivenes accionariales de Prisa.", "2022-01-01"),
        ],
    },
    "candido-conde-pumpido": {
        "perfil": "Cándido Conde-Pumpido Tourón (Santiago de Compostela, 1949) es presidente del Tribunal Constitucional, el máximo intérprete de la Constitución y árbitro último de los grandes conflictos jurídico-políticos del país. Magistrado de larga trayectoria y exfiscal general del Estado en la etapa de Rodríguez Zapatero, su elección y su gestión al frente del tribunal han sido objeto de fuerte polémica política, con acusaciones de la derecha de un sesgo progresista y de alinear al órgano con los intereses del Gobierno, algo que él rechaza apelando a la autonomía del tribunal.",
        "trayectoria": [
            ("Carrera judicial y fiscal", "Magistrado de dilatada trayectoria, ocupó plaza en el Tribunal Supremo y desarrolló una intensa carrera en la judicatura y el ministerio fiscal.", "1990-01-01"),
            ("Fiscal General del Estado", "Fue fiscal general del Estado entre 2004 y 2011, durante los gobiernos de José Luis Rodríguez Zapatero, una etapa marcada por causas sensibles y por su perfil reformista.", "2004-04-01"),
            ("Magistrado del Constitucional", "Fue nombrado magistrado del Tribunal Constitucional, donde se alineó con el bloque considerado progresista en debates jurídicos de gran calado político.", "2017-03-01"),
            ("Presidente del TC", "En 2023 fue elegido presidente del Tribunal Constitucional, al frente de un órgano cuya composición y resoluciones —sobre leyes clave del Gobierno— han alimentado un duro choque entre bloques políticos.", "2023-01-09"),
        ],
    },
    "pedro-jose-ramirez": {
        "perfil": "Pedro José Ramírez Codina (Logroño, 1952), conocido como 'Pedro J.', es uno de los periodistas más influyentes y polémicos de España, fundador y director de El Español. Antes fue director fundador de El Mundo, que dirigió durante 25 años convirtiéndolo en referencia del periodismo de investigación y en azote de la corrupción, hasta su salida del diario en 2014. Símbolo del periodismo combativo y de las exclusivas de impacto, su figura ha marcado la prensa española de las últimas cuatro décadas.",
        "trayectoria": [
            ("Director de Diario 16", "Joven y precoz, dirigió Diario 16, donde impulsó investigaciones de gran repercusión durante los gobiernos socialistas, lo que acabó costándole el puesto.", "1980-01-01"),
            ("Fundador y director de El Mundo", "En 1989 fundó El Mundo, que dirigió durante 25 años, convirtiéndolo en uno de los grandes diarios del país y en azote de la corrupción, con investigaciones como el caso GAL o los papeles de Bárcenas.", "1989-10-23"),
            ("Salida de El Mundo", "En 2014 abandonó la dirección de El Mundo en medio de tensiones con el grupo editor, cerrando una etapa de un cuarto de siglo al frente del diario.", "2014-01-31"),
            ("Fundación de El Español", "En 2015 fundó El Español, un diario nativo digital impulsado mediante crowdfunding, desde el que continúa ejerciendo un periodismo de investigación e influencia y una marcada presencia pública.", "2015-10-07"),
        ],
    },
    "ana-rosa-quintana": {
        "perfil": "Ana Rosa Quintana Hortal (Madrid, 1956) es una de las presentadoras más influyentes y populares de la televisión española, rostro estrella de Mediaset (Telecinco). Su magacín matinal, 'El programa de Ana Rosa', ha liderado durante años las mañanas de la televisión, convirtiéndola en una figura con notable peso en la conversación política y social, además de empresaria de producción audiovisual.",
        "trayectoria": [
            ("De la prensa a la televisión", "Periodista de formación, comenzó en la prensa escrita y en la radio antes de dar el salto a la televisión, donde se consolidó como presentadora de programas de gran audiencia.", "1990-01-01"),
            ("'El programa de Ana Rosa'", "Desde 2005 dirige y presenta 'El programa de Ana Rosa' en Telecinco, magacín matinal de información y actualidad que ha liderado de forma sostenida las audiencias de la mañana.", "2005-01-10"),
            ("Empresaria audiovisual", "Es socia de la productora Unicorn Content, con la que produce sus propios programas y otros espacios para Mediaset, combinando el papel de presentadora con el de empresaria.", "2018-01-01"),
            ("Influencia mediática", "Su tono y sus comentarios marcan con frecuencia la agenda política y social, lo que la convierte en una de las comunicadoras con mayor influencia y también en objeto de polémica.", "2020-01-01"),
        ],
    },
    "antonio-garcia-ferreras": {
        "perfil": "Antonio García Ferreras (Madrid, 1966) es director y presentador de 'Al Rojo Vivo' (La Sexta), uno de los programas de debate político más influyentes de la televisión española, y figura clave del grupo Atresmedia. Periodista de origen deportivo y exdirector de informativos, es uno de los comunicadores con más peso en la conversación política, con un perfil próximo a la izquierda según sus críticos.",
        "trayectoria": [
            ("Del deporte a la información", "Desarrolló su carrera en el periodismo, pasando por la radio (Cadena SER) y la dirección de comunicación, antes de dirigir los informativos de la recién nacida La Sexta.", "2000-01-01"),
            ("Director de informativos de La Sexta", "Fue director de los servicios informativos de La Sexta, dándoles un perfil propio y fundando el sello de programas de debate político que caracterizaría a la cadena.", "2006-03-27"),
            ("'Al Rojo Vivo'", "Dirige y presenta 'Al Rojo Vivo', programa diario de debate y análisis político de gran audiencia e influencia, que marca buena parte de la agenda televisiva de la actualidad.", "2011-01-01"),
            ("Influencia y polémica", "Su programa y su figura son centrales en la conversación política; muy seguido y a la vez muy criticado por la derecha, que le atribuye un sesgo progresista, ha protagonizado diversas polémicas mediáticas.", "2020-01-01"),
        ],
    },
    "alvaro-garcia-ortiz": {
        "perfil": "Álvaro García Ortiz (Oviedo, 1967) es el Fiscal General del Estado, máximo responsable del Ministerio Fiscal, cargo que ocupa desde 2022 a propuesta del Gobierno. Fiscal de carrera especializado en medio ambiente y delitos económicos, su mandato ha estado marcado por una intensa controversia política sobre la independencia de la Fiscalía y por una causa abierta en su contra en el Tribunal Supremo por una presunta revelación de secretos, proceso en el que rige plenamente la presunción de inocencia.",
        "trayectoria": [
            ("Fiscal de carrera", "Fiscal de profesión, se especializó en medio ambiente, urbanismo y criminalidad económica, y desarrolló responsabilidades en la Fiscalía y en la Secretaría Técnica.", "1995-01-01"),
            ("Ascenso en la Fiscalía", "Ocupó puestos de relevancia en la estructura de la Fiscalía General, incluida la jefatura de la Secretaría Técnica, ganando peso en la cúpula del ministerio fiscal.", "2020-01-01"),
            ("Fiscal General del Estado", "Fue nombrado Fiscal General del Estado en 2022, al frente del Ministerio Fiscal, en un contexto de fuerte tensión política sobre la independencia de la institución.", "2022-09-01"),
            ("Causa en el Tribunal Supremo", "El Tribunal Supremo abrió una causa contra él por una presunta revelación de secretos en relación con un asunto fiscal de gran repercusión política; el proceso sigue su curso y rige plenamente la presunción de inocencia.", "2024-10-01"),
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
