#!/usr/bin/env python3
"""scripts/alcaldes.py

Crea dosieres detallados ("Quién es" + "Trayectoria", ~190-230 palabras) de los
alcaldes de las grandes ciudades españolas. Escribe dosieres completos nuevos en
data/poder/figuras_clave_8.json (fuente "poder").

Roster verificado a mayo 2026 (elecciones municipales de mayo 2023; relevos
posteriores comprobados). Tono factual; fuentes públicas. Cada ficha incluye
relaciones (redes) con líderes nacionales y presidentes autonómicos para el grafo.

Uso:  python3 scripts/alcaldes.py && python3 bin/gen_subfixture.py --source poder
"""
from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "poder" / "figuras_clave_8.json"

ALC: dict[str, dict] = {
    "jose-luis-martinez-almeida": {
        "ciudad": "Madrid", "cargo": "Alcalde de Madrid", "partido": "pp",
        "ctag": "madrid", "fuente": "https://www.madrid.es",
        "nombre": "José Luis Martínez-Almeida Navasqüés", "alias": "José Luis Martínez-Almeida",
        "corta": "Alcalde de Madrid (PP) desde 2019, con mayoría absoluta desde 2023, y portavoz nacional del Partido Popular.",
        "perfil": "José Luis Martínez-Almeida Navasqüés (Madrid, 1975) es alcalde de Madrid desde 2019 y portavoz nacional del Partido Popular. Abogado del Estado, llegó a la alcaldía de la capital en 2019 con el apoyo de Ciudadanos y Vox y en 2023 revalidó el cargo con mayoría absoluta. De estilo afable e irónico, combina la gestión del mayor ayuntamiento de España con un papel destacado como una de las voces nacionales del PP y como estrecho aliado de Isabel Díaz Ayuso en Madrid, lo que le da un peso político que trasciende lo municipal.",
        "tray": [
            ("Abogado del Estado y concejal", "Abogado del Estado de profesión, entró en política en el PP de Madrid como concejal y portavoz del grupo municipal, ganando peso en la oposición al gobierno de Manuela Carmena.", "2015-06-13"),
            ("Alcalde de Madrid", "En 2019 fue investido alcalde de Madrid pese a no ganar las elecciones, gracias a un pacto con Ciudadanos y Vox que desalojó a la izquierda del consistorio.", "2019-06-15"),
            ("Mayoría absoluta", "En 2023 arrasó en las urnas y revalidó la alcaldía con mayoría absoluta, consolidando su liderazgo en la capital.", "2023-05-28"),
            ("Portavoz nacional del PP", "Compagina la alcaldía con la portavocía nacional del Partido Popular, lo que lo convierte en una de las caras más visibles del partido a nivel estatal.", "2022-04-01"),
        ],
        "pos": ("Gestión municipal y voz del PP", "Defiende una gestión liberal-conservadora de la ciudad (limpieza, movilidad, grandes eventos) y ejerce de portavoz nacional del PP, con un tono combativo pero de registro amable hacia el Gobierno de Sánchez.", ["pp", "madrid"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +8/10) — Portavoz nacional del partido y hombre de máxima confianza de la dirección.", ["pp", "nota-+8", "alianza"]),
            ("Isabel Díaz Ayuso", "**Presidenta de la Comunidad de Madrid** (nota +6/10) — Tándem institucional en Madrid (Ayuntamiento y Comunidad), con sintonía política.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "jaume-collboni": {
        "ciudad": "Barcelona", "cargo": "Alcalde de Barcelona", "partido": "psc",
        "ctag": "cataluna", "fuente": "https://www.barcelona.cat",
        "nombre": "Jaume Collboni Cuadrado", "alias": "Jaume Collboni",
        "corta": "Alcalde de Barcelona (PSC) desde 2023; puso fin a la etapa de Ada Colau frenando al independentista Trias.",
        "perfil": "Jaume Collboni Cuadrado (Barcelona, 1969) es alcalde de Barcelona desde 2023 y dirigente del PSC. Puso fin a la etapa de los comunes de Ada Colau al ser investido alcalde pese a quedar tercero, gracias a una insólita confluencia de votos del PSC, el PP y los comunes que frenó al independentista Xavier Trias (Junts). Representa el regreso del socialismo a la alcaldía de la capital catalana, con una agenda centrada en la seguridad, la vivienda, la regulación del turismo y la reactivación económica de la ciudad.",
        "tray": [
            ("Carrera en el PSC", "Desarrolló su carrera en el PSC y en las Juventudes Socialistas, llegando a diputado en el Parlament y primer secretario del PSC de Barcelona.", "2003-01-01"),
            ("Teniente de alcalde con Colau", "Fue primer teniente de alcalde y responsable de economía en el gobierno municipal de Ada Colau, en una etapa de coalición entre comunes y socialistas.", "2019-06-15"),
            ("Alcalde de Barcelona", "En 2023, pese a quedar tercero en votos, fue investido alcalde con el apoyo de PP y comunes para evitar la alcaldía del independentista Xavier Trias.", "2023-06-17"),
            ("Agenda de gestión", "Su mandato se centra en la seguridad, el acceso a la vivienda, la regulación del turismo masivo y la proyección económica e internacional de Barcelona.", "2024-01-01"),
        ],
        "pos": ("Socialismo municipal catalán", "Defiende un catalanismo no independentista y una gestión centrada en seguridad, vivienda y turismo, en sintonía con el Gobierno de Sánchez y la Generalitat de Illa.", ["psc", "cataluna"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Alineado con la dirección federal del partido.", ["psoe", "nota-+7", "alianza"]),
            ("Salvador Illa", "**Presidente de la Generalitat de Cataluña** (nota +6/10) — Mismo partido (PSC) y estrecha cooperación institucional ciudad-Generalitat.", ["psc", "nota-+6", "alianza"]),
        ],
    },
    "maria-jose-catala": {
        "ciudad": "Valencia", "cargo": "Alcaldesa de Valencia", "partido": "pp",
        "ctag": "comunidad-valenciana", "fuente": "https://www.valencia.es",
        "nombre": "María José Catalá Verdet", "alias": "María José Catalá",
        "corta": "Alcaldesa de Valencia (PP) desde 2023; puso fin a los 8 años de Compromís de Joan Ribó. Gobierna con Vox.",
        "perfil": "María José Catalá Verdet (Torrent, Valencia, 1981) es alcaldesa de Valencia desde 2023 y una de las dirigentes emergentes del PP. Exconsejera de Educación de la Generalitat Valenciana y portavoz popular, ganó las elecciones municipales de 2023 poniendo fin a los ocho años de gobierno de Compromís de Joan Ribó. Gobierna la tercera ciudad de España con el apoyo de Vox y ha ganado proyección autonómica tras la crisis de la DANA y el relevo en la Generalitat, situándose como una de las figuras de referencia del PP valenciano.",
        "tray": [
            ("Joven dirigente del PP valenciano", "Doctora en Derecho, tuvo un ascenso rápido en el PP valenciano, siendo alcaldesa de Torrent y consejera de Educación de la Generalitat a muy temprana edad.", "2011-01-01"),
            ("Portavoz y oposición", "Tras la pérdida del poder del PP en la Comunidad Valenciana, ejerció de portavoz municipal en Valencia, liderando la oposición a Joan Ribó (Compromís).", "2019-06-15"),
            ("Alcaldesa de Valencia", "Ganó las elecciones de 2023 y fue investida alcaldesa de Valencia con el apoyo de Vox, recuperando la capital para el centroderecha tras ocho años de Compromís.", "2023-06-17"),
            ("Proyección autonómica", "Su peso creció con la crisis posterior a la DANA y la dimisión de Mazón, consolidándose como una de las dirigentes con mayor proyección del PP en la Comunidad Valenciana.", "2025-11-01"),
        ],
        "pos": ("Centroderecha en Valencia", "Defiende una gestión de centroderecha (fiscalidad, grandes proyectos, Fallas y turismo) y se ha consolidado como una de las dirigentes con mayor proyección del PP valenciano.", ["pp", "comunidad-valenciana"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineada con la dirección nacional, que valora su proyección.", ["pp", "nota-+7", "alianza"]),
            ("Juan Francisco Pérez Llorca", "**Presidente de la Generalitat Valenciana** (nota +5/10) — Coordinación PP entre ciudad y Generalitat tras el relevo de Mazón.", ["pp", "nota-+5", "alianza"]),
        ],
    },
    "jose-luis-sanz": {
        "ciudad": "Sevilla", "cargo": "Alcalde de Sevilla", "partido": "pp",
        "ctag": "andalucia", "fuente": "https://www.sevilla.org",
        "nombre": "José Luis Sanz Ruiz", "alias": "José Luis Sanz",
        "corta": "Alcalde de Sevilla (PP) desde 2023; arrebató la capital andaluza al PSOE.",
        "perfil": "José Luis Sanz Ruiz es alcalde de Sevilla desde 2023, dirigente del PP. Exalcalde de Tomares y senador, ganó las elecciones de 2023 arrebatando la capital andaluza al PSOE de Antonio Muñoz. Gobierna la cuarta ciudad de España con una agenda centrada en las grandes infraestructuras (la ampliación del metro, los accesos), el turismo, la Semana Santa y los grandes eventos, en una ciudad históricamente disputada entre el PSOE y el PP y de enorme peso simbólico en Andalucía. Su victoria en una de las ciudades más pobladas del país reforzó el avance del PP en la Andalucía urbana tras la conquista de la Junta por Moreno Bonilla.",
        "tray": [
            ("Alcalde de Tomares", "Desarrolló su carrera en el PP de Sevilla y fue durante años alcalde de Tomares, uno de los municipios de mayor renta del área metropolitana sevillana.", "2003-06-14"),
            ("Senador y portavoz", "Fue senador y portavoz del PP, ganando proyección antes de centrarse en la conquista de la alcaldía de la capital.", "2015-01-01"),
            ("Alcalde de Sevilla", "Ganó las elecciones municipales de 2023 y fue investido alcalde de Sevilla, desbancando al PSOE de la capital andaluza.", "2023-06-17"),
            ("Gestión de la capital", "Su mandato se centra en el transporte (la ampliación del metro), el turismo, la cultura y las grandes infraestructuras de una de las ciudades más visitadas de España.", "2024-01-01"),
        ],
        "pos": ("Centroderecha andaluz", "Defiende una gestión de centroderecha y reclama inversiones del Estado en infraestructuras (metro, cercanías), en sintonía con la Junta de Moreno Bonilla.", ["pp", "andalucia"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+7", "alianza"]),
            ("Juan Manuel Moreno Bonilla", "**Presidente de la Junta de Andalucía** (nota +6/10) — Coordinación PP entre la capital y la Junta.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "natalia-chueca": {
        "ciudad": "Zaragoza", "cargo": "Alcaldesa de Zaragoza", "partido": "pp",
        "ctag": "aragon", "fuente": "https://www.zaragoza.es",
        "nombre": "Natalia Chueca Muñoz", "alias": "Natalia Chueca",
        "corta": "Alcaldesa de Zaragoza (PP) desde 2023; sucedió a Azcón al frente de la ciudad.",
        "perfil": "Natalia Chueca Muñoz (Zaragoza, 1976) es alcaldesa de Zaragoza desde 2023, dirigente del PP. Procedente del sector privado y del equipo de Jorge Azcón, a quien sucedió cuando este dio el salto a la presidencia de Aragón, ganó las elecciones de 2023 y mantuvo la quinta ciudad de España en manos del centroderecha. Gobierna con un perfil de gestión centrado en la digitalización, la movilidad sostenible, la vivienda y los grandes proyectos urbanos de la capital aragonesa. Es una de las pocas mujeres al frente de una gran capital y representa el perfil de gestora procedente del mundo de la empresa que el PP ha impulsado en los ayuntamientos.",
        "tray": [
            ("Del sector privado a la política", "Con experiencia en la empresa privada y la consultoría, entró en la política municipal de la mano de Jorge Azcón, ocupando concejalías en el Ayuntamiento de Zaragoza.", "2019-06-15"),
            ("Concejala de área", "Como concejala en el gobierno de Azcón, gestionó áreas de servicios públicos, medio ambiente y movilidad de la ciudad.", "2019-06-15"),
            ("Alcaldesa de Zaragoza", "Cuando Azcón asumió la presidencia de Aragón en 2023, ella encabezó la candidatura y fue investida alcaldesa, manteniendo la capital para el PP.", "2023-06-17"),
            ("Gestión urbana", "Su mandato se centra en la digitalización, la movilidad sostenible, la vivienda y los grandes proyectos urbanísticos de la quinta ciudad de España.", "2024-01-01"),
        ],
        "pos": ("Gestión de centroderecha", "Defiende una gestión municipal de centroderecha centrada en servicios, movilidad e inversión, en estrecha coordinación con el Gobierno de Aragón de Jorge Azcón.", ["pp", "aragon"]),
        "redes": [
            ("Jorge Azcón", "**Presidente de Aragón** (nota +7/10) — Mentor político: Chueca fue su concejala y su sucesora en la alcaldía de Zaragoza.", ["pp", "nota-+7", "alianza"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +6/10) — Alineada con la dirección nacional del partido.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "francisco-de-la-torre": {
        "ciudad": "Málaga", "cargo": "Alcalde de Málaga", "partido": "pp",
        "ctag": "andalucia", "fuente": "https://www.malaga.eu",
        "nombre": "Francisco de la Torre Prados", "alias": "Francisco de la Torre",
        "corta": "Alcalde de Málaga (PP) desde 2000; uno de los regidores más veteranos de España.",
        "perfil": "Francisco de la Torre Prados (Málaga, 1942) es alcalde de Málaga desde 2000, uno de los regidores más veteranos y longevos de España. Economista y técnico del Estado, ha gobernado la ciudad durante más de dos décadas, transformándola en un polo cultural (los museos), tecnológico y turístico de primer orden. Su longevidad, su perfil moderado y transversal y sus sucesivas reelecciones lo han convertido en una figura singular dentro del PP y en una marca personal ligada al auge de Málaga. Con más de ochenta años, sigue siendo una rareza en la política española por su longevidad y por su independencia respecto a los vaivenes internos del partido.",
        "tray": [
            ("Décadas en la política malagueña", "Con una larguísima trayectoria que se remonta a la etapa preautonómica, ocupó cargos en la Diputación y la administración antes de centrarse en la ciudad de Málaga.", "1995-01-01"),
            ("Alcalde de Málaga", "Accedió a la alcaldía de Málaga en 2000 y desde entonces ha revalidado el cargo en sucesivas elecciones, con y sin mayoría absoluta.", "2000-04-01"),
            ("La transformación de Málaga", "Bajo su mandato, Málaga vivió una profunda transformación urbana y económica, con la apuesta por los museos (Picasso, Pompidou, Thyssen), la tecnología y el turismo.", "2010-01-01"),
            ("Decano de los grandes alcaldes", "Su permanencia de más de dos décadas lo ha convertido en uno de los alcaldes más veteranos del país, con un perfil personalista y moderado.", "2023-05-28"),
        ],
        "pos": ("Málaga como marca", "Defiende el modelo de Málaga como ciudad de cultura, tecnología y turismo, con un perfil moderado y transversal que trasciende la disciplina estricta de partido.", ["pp", "andalucia"]),
        "redes": [
            ("Juan Manuel Moreno Bonilla", "**Presidente de la Junta de Andalucía** (nota +6/10) — Coordinación PP entre la ciudad y la Junta.", ["pp", "nota-+6", "alianza"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +6/10) — Veterano del partido, con perfil propio y autonomía.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "jose-ballesta": {
        "ciudad": "Murcia", "cargo": "Alcalde de Murcia", "partido": "pp",
        "ctag": "murcia", "fuente": "https://www.murcia.es",
        "nombre": "José Antonio Ballesta Germán", "alias": "José Ballesta",
        "corta": "Alcalde de Murcia (PP); lo fue 2015-2021 (cesado por moción de censura) y recuperó la alcaldía en 2023.",
        "perfil": "José Antonio Ballesta Germán es alcalde de Murcia, dirigente del PP. Catedrático universitario y exrector, fue alcalde de la ciudad entre 2015 y 2021 —cuando una moción de censura lo desalojó— y recuperó la alcaldía tras las elecciones de 2023. Gobierna la séptima ciudad de España, con una agenda centrada en la huerta, el soterramiento del ferrocarril, el agua y la modernización urbana, en coordinación con el Gobierno regional de Fernando López Miras. Profesor universitario y gestor antes que político de partido, afronta el reto de modernizar la séptima ciudad de España y de cerrar heridas tras la inestabilidad institucional del mandato anterior.",
        "tray": [
            ("Catedrático y gestor", "Catedrático universitario y exrector de la Universidad de Murcia, dio el salto a la política municipal de la mano del PP.", "2015-01-01"),
            ("Primer mandato y moción de censura", "Fue alcalde de Murcia desde 2015 hasta 2021, cuando una moción de censura de PSOE y Ciudadanos le arrebató la alcaldía.", "2015-06-13"),
            ("Regreso a la alcaldía", "Tras las elecciones de 2023 recuperó la alcaldía de Murcia para el PP, volviendo al cargo que había perdido dos años antes.", "2023-06-17"),
            ("Gestión de la ciudad", "Su mandato se centra en el soterramiento del ferrocarril, la huerta, el agua y la modernización de una de las grandes ciudades del sureste.", "2024-01-01"),
        ],
        "pos": ("Centroderecha murciano", "Defiende los intereses de Murcia (agua, huerta, infraestructuras) en coordinación con el Gobierno regional de López Miras.", ["pp", "murcia"]),
        "redes": [
            ("Fernando López Miras", "**Presidente de la Región de Murcia** (nota +6/10) — Coordinación PP entre la capital y la Comunidad.", ["pp", "nota-+6", "alianza"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "jaime-martinez": {
        "ciudad": "Palma", "cargo": "Alcalde de Palma", "partido": "pp",
        "ctag": "baleares", "fuente": "https://www.palma.cat",
        "nombre": "Jaime Martínez Llabrés", "alias": "Jaime Martínez",
        "corta": "Alcalde de Palma (PP) desde 2023; exconsejero de Turismo del Govern balear.",
        "perfil": "Jaime Martínez Llabrés es alcalde de Palma desde 2023, dirigente del PP balear. Exconsejero de Turismo del Govern, ganó las elecciones municipales de 2023 y recuperó la capital balear para el centroderecha. Gobierna la mayor ciudad de las islas, marcada por la fuerte presión turística, el difícil acceso a la vivienda y la movilidad, en sintonía con el Govern de Marga Prohens y con un perfil de gestión ligado al sector turístico, motor económico del archipiélago. Gobierna una ciudad tensionada entre su éxito turístico y los problemas de vivienda y saturación que ese mismo éxito genera, en una de las comunidades con mayor presión inmobiliaria de España.",
        "tray": [
            ("Empresa y turismo", "Con experiencia en el sector empresarial y turístico, desarrolló su carrera política en el PP de Baleares, llegando a consejero de Turismo del Govern.", "2011-01-01"),
            ("Consejero autonómico", "Ocupó responsabilidades de gobierno en la Comunidad Autónoma, especialmente en el área de turismo, motor económico de las islas.", "2011-06-01"),
            ("Alcalde de Palma", "Ganó las elecciones de 2023 y fue investido alcalde de Palma, recuperando la capital balear para el PP.", "2023-06-17"),
            ("Turismo y vivienda", "Su mandato afronta la masificación turística, la emergencia habitacional y la movilidad de una ciudad mediterránea de gran atractivo.", "2024-01-01"),
        ],
        "pos": ("Gestión turística insular", "Defiende un modelo turístico ordenado y medidas sobre vivienda y movilidad, en coordinación con el Govern de Marga Prohens.", ["pp", "baleares"]),
        "redes": [
            ("Marga Prohens", "**Presidenta del Govern de las Islas Baleares** (nota +6/10) — Coordinación PP entre la capital y el Govern.", ["pp", "nota-+6", "alianza"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "carolina-darias": {
        "ciudad": "Las Palmas de Gran Canaria", "cargo": "Alcaldesa de Las Palmas de Gran Canaria", "partido": "psoe",
        "ctag": "canarias", "fuente": "https://www.laspalmasgc.es",
        "nombre": "Carolina Darias San Sebastián", "alias": "Carolina Darias",
        "corta": "Alcaldesa de Las Palmas de Gran Canaria (PSOE) desde 2023; exministra de Sanidad de Sánchez.",
        "perfil": "Carolina Darias San Sebastián (Las Palmas de Gran Canaria, 1965) es alcaldesa de Las Palmas de Gran Canaria desde 2023 y dirigente del PSOE canario. Antes fue ministra de Política Territorial y de Sanidad en el Gobierno de Pedro Sánchez, donde gestionó parte de la pandemia de COVID-19. Jurista y veterana política, regresó a su ciudad natal para liderar la alcaldía de la capital grancanaria, con una agenda de vivienda, turismo, movilidad y servicios sociales. Su salto de ministra a alcaldesa ilustra el peso que el PSOE concede al poder municipal y la convierte en una de las socialistas de mayor perfil institucional en Canarias.",
        "tray": [
            ("Política canaria y estatal", "Jurista de formación, desarrolló su carrera en la política canaria (fue consejera y parlamentaria) antes de dar el salto al Gobierno central.", "2007-01-01"),
            ("Ministra de Sánchez", "Fue ministra de Política Territorial y Función Pública y después ministra de Sanidad en el Gobierno de Pedro Sánchez, gestionando parte de la pandemia.", "2020-01-13"),
            ("Alcaldesa de Las Palmas", "En 2023 encabezó la candidatura socialista y fue investida alcaldesa de Las Palmas de Gran Canaria, regresando a la política municipal de su ciudad.", "2023-06-17"),
            ("Gestión de la capital", "Su mandato se centra en el turismo, la vivienda, la movilidad y los servicios sociales de una de las mayores ciudades canarias.", "2024-01-01"),
        ],
        "pos": ("Socialismo municipal canario", "Defiende una agenda social y de servicios públicos, leal a la dirección federal del PSOE, en una comunidad gobernada por Coalición Canaria y el PP.", ["psoe", "canarias"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Exministra de su Gobierno, leal a la dirección federal.", ["psoe", "nota-+7", "alianza"]),
        ],
    },
    "juan-mari-aburto": {
        "ciudad": "Bilbao", "cargo": "Alcalde de Bilbao", "partido": "pnv",
        "ctag": "pais-vasco", "fuente": "https://www.bilbao.eus",
        "nombre": "Juan María Aburto Rike", "alias": "Juan Mari Aburto",
        "corta": "Alcalde de Bilbao (PNV) desde 2015; sucesor de Azkuna, gobierna con el PSE-EE.",
        "perfil": "Juan María Aburto Rike (Bilbao, 1961) es alcalde de Bilbao desde 2015, dirigente del PNV. Procedente del ámbito social y de la Diputación Foral de Bizkaia, ha consolidado el dominio jeltzale en la capital vizcaína, gobernando habitualmente en coalición con el PSE-EE. Representa la continuidad del nacionalismo moderado del PNV en la gestión de la mayor ciudad del País Vasco, con la cultura, la transformación urbana postindustrial y los servicios como ejes de su mandato. Bajo su gestión, Bilbao ha seguido proyectándose internacionalmente como modelo de regeneración urbana —el llamado «efecto Guggenheim»—, referencia mundial de transformación de ciudades industriales.",
        "tray": [
            ("Del ámbito social a la Diputación", "Vinculado al mundo asociativo y social, desarrolló su carrera en el PNV y en la Diputación Foral de Bizkaia, donde fue diputado de Empleo y Políticas Sociales.", "2011-01-01"),
            ("Alcalde de Bilbao", "Sucedió a Iñaki Azkuna al frente de la alcaldía de Bilbao en 2015, dando continuidad al proyecto de transformación de la ciudad.", "2015-06-13"),
            ("Reelecciones", "Ha revalidado la alcaldía en sucesivas elecciones, manteniendo el liderazgo del PNV en la capital vizcaína en coalición con los socialistas.", "2023-06-17"),
            ("Bilbao postindustrial", "Su gestión profundiza en la transformación de Bilbao como ciudad de servicios, cultura y turismo tras su reconversión industrial, con el Guggenheim como símbolo.", "2024-01-01"),
        ],
        "pos": ("Nacionalismo moderado de gestión", "Defiende un PNV de gestión y transformación urbana, en coalición con el PSE-EE, dentro de la estrategia del partido en las instituciones vascas.", ["pnv", "pais-vasco"]),
        "redes": [
            ("Imanol Pradales", "**Lehendakari (Gobierno Vasco)** (nota +7/10) — Mismo partido (PNV); coordinación entre la capital y el Gobierno vasco.", ["pnv", "nota-+7", "alianza"]),
        ],
    },
    "jesus-julio-carnero": {
        "ciudad": "Valladolid", "cargo": "Alcalde de Valladolid", "partido": "pp",
        "ctag": "castilla-y-leon", "fuente": "https://www.valladolid.es",
        "nombre": "Jesús Julio Carnero García", "alias": "Jesús Julio Carnero",
        "corta": "Alcalde de Valladolid (PP) desde 2023; desbancó al socialista Óscar Puente. Gobierna con Vox.",
        "perfil": "Jesús Julio Carnero García es alcalde de Valladolid desde 2023, dirigente del PP de Castilla y León. Abogado y veterano cargo autonómico —fue consejero de la Junta y presidente de la Diputación de Valladolid—, ganó la alcaldía en 2023 arrebatándola al socialista Óscar Puente, que poco después se incorporó al Gobierno de Sánchez como ministro de Transportes. Gobierna la capital vallisoletana con el apoyo de Vox y una agenda industrial, de movilidad y de vivienda. Su llegada a la alcaldía estuvo ligada al ascenso de Óscar Puente a la primera línea estatal, y dirige una ciudad clave para la automoción española en plena transformación del sector hacia el vehículo eléctrico.",
        "tray": [
            ("Cargo autonómico y provincial", "Abogado, desarrolló una larga carrera en el PP de Castilla y León, siendo presidente de la Diputación de Valladolid y consejero de la Junta.", "2011-01-01"),
            ("Consejero de la Junta", "Ocupó consejerías en el Gobierno autonómico de Castilla y León, ganando experiencia de gestión.", "2019-01-01"),
            ("Alcalde de Valladolid", "En 2023 ganó la alcaldía de Valladolid, desbancando al socialista Óscar Puente, con el apoyo de Vox.", "2023-06-17"),
            ("Gestión de la capital", "Su mandato se centra en la industria (automoción), la movilidad, la vivienda y los servicios de la principal ciudad de Castilla y León.", "2024-01-01"),
        ],
        "pos": ("Centroderecha castellanoleonés", "Defiende una gestión de centroderecha y la reivindicación industrial de Valladolid, en coordinación con la Junta de Mañueco.", ["pp", "castilla-y-leon"]),
        "redes": [
            ("Alfonso Fernández Mañueco", "**Presidente de la Junta de Castilla y León** (nota +6/10) — Coordinación PP entre la capital y la Junta.", ["pp", "nota-+6", "alianza"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "abel-caballero": {
        "ciudad": "Vigo", "cargo": "Alcalde de Vigo", "partido": "psoe",
        "ctag": "galicia", "fuente": "https://www.vigo.org",
        "nombre": "Abel Caballero Álvarez", "alias": "Abel Caballero",
        "corta": "Alcalde de Vigo (PSOE) desde 2007 con mayorías absolutas crecientes; presidente de la FEMP. Exministro con Felipe González.",
        "perfil": "Abel Caballero Álvarez (Ponteareas, Pontevedra, 1946) es alcalde de Vigo desde 2007 y presidente de la Federación Española de Municipios y Provincias (FEMP). Catedrático de Economía y exministro de Transportes con Felipe González, es uno de los alcaldes más veteranos, populares y mediáticos de España, conocido por sus arrolladoras mayorías absolutas y por la espectacular iluminación navideña que ha convertido a Vigo en un fenómeno turístico nacional. Su figura, omnipresente en los medios y en las redes, encarna un modelo de alcalde-marca que combina la gestión local con una enorme proyección mediática personal poco habitual en el municipalismo.",
        "tray": [
            ("Ministro con Felipe González", "Catedrático de Economía, fue diputado y ministro de Transportes, Turismo y Comunicaciones en el Gobierno de Felipe González en los años ochenta.", "1985-07-05"),
            ("Alcalde de Vigo", "Regresó a la política municipal y en 2007 fue elegido alcalde de Vigo, cargo en el que se ha consolidado con sucesivas mayorías absolutas cada vez más amplias.", "2007-06-16"),
            ("Presidente de la FEMP", "Preside la Federación Española de Municipios y Provincias, convirtiéndose en la voz institucional del municipalismo español ante el Estado.", "2019-01-01"),
            ("El fenómeno de las luces", "Ha dado a Vigo enorme proyección mediática con su apuesta por la Navidad y la iluminación, además de grandes proyectos urbanos, con un estilo personalista y desenfadado.", "2016-01-01"),
        ],
        "pos": ("Socialismo municipal y municipalismo", "Defiende los intereses de Vigo y del municipalismo español (financiación local), con un fuerte liderazgo personal y lealtad a la dirección federal del PSOE.", ["psoe", "galicia"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Barón municipal leal a la dirección federal.", ["psoe", "nota-+7", "alianza"]),
        ],
    },
    "carmen-moriyon": {
        "ciudad": "Gijón", "cargo": "Alcaldesa de Gijón", "partido": "foro",
        "ctag": "asturias", "fuente": "https://www.gijon.es",
        "nombre": "Carmen Moriyón Entrialgo", "alias": "Carmen Moriyón",
        "corta": "Alcaldesa de Gijón (Foro Asturias); lo fue 2011-2019 y volvió en 2023 con apoyo del PP.",
        "perfil": "Carmen Moriyón Entrialgo (Gijón, 1967) es alcaldesa de Gijón, dirigente de Foro Asturias, el partido regionalista fundado por Francisco Álvarez-Cascos. Médica de profesión, ya fue alcaldesa de la ciudad entre 2011 y 2019 y recuperó la alcaldía en 2023 gobernando con el apoyo del PP. Representa el regionalismo asturiano de centroderecha en la mayor ciudad del Principado, con la industria, el puerto de El Musel y los servicios como prioridades de su gestión. Su perfil de médica y su marca regionalista le permiten un discurso transversal, alejado de la confrontación de bloques, en la mayor ciudad de Asturias.",
        "tray": [
            ("Médica y política regionalista", "Médica de profesión, dio el salto a la política de la mano de Foro Asturias, el partido fundado por Francisco Álvarez-Cascos.", "2011-01-01"),
            ("Primera etapa como alcaldesa", "Fue alcaldesa de Gijón entre 2011 y 2019, al frente de Foro, en una etapa de coaliciones y pactos en el Ayuntamiento.", "2011-06-11"),
            ("Regreso a la alcaldía", "Tras unos años fuera del cargo, recuperó la alcaldía de Gijón en 2023 con el apoyo del PP, manteniendo viva la marca de Foro Asturias.", "2023-06-17"),
            ("Gestión de la ciudad", "Su mandato se centra en la industria, el puerto de El Musel, la movilidad y los servicios de la mayor ciudad de Asturias.", "2024-01-01"),
        ],
        "pos": ("Regionalismo asturiano de centroderecha", "Defiende los intereses de Gijón y Asturias desde un regionalismo de centroderecha, en colaboración con el PP frente al PSOE de Barbón.", ["foro", "asturias"]),
        "redes": [
            ("Adrián Barbón", "**Presidente del Principado de Asturias** (nota -3/10) — Rivalidad institucional: gobierno municipal de centroderecha frente al Principado socialista.", ["psoe", "nota--3", "tension"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +4/10) — El PP es su socio de gobierno municipal en Gijón.", ["pp", "nota-+4", "alianza"]),
        ],
    },
    "ines-rey": {
        "ciudad": "A Coruña", "cargo": "Alcaldesa de A Coruña", "partido": "psoe",
        "ctag": "galicia", "fuente": "https://www.coruna.gal",
        "nombre": "Inés Rey García", "alias": "Inés Rey",
        "corta": "Alcaldesa de A Coruña (PSOE) desde 2019, reelegida en 2023.",
        "perfil": "Inés Rey García (A Coruña, 1979) es alcaldesa de A Coruña desde 2019, dirigente del PSdeG-PSOE. Abogada, recuperó la alcaldía coruñesa para el socialismo y la revalidó en 2023, consolidando el dominio de la izquierda en la ciudad herculina. Gobierna una de las principales urbes gallegas, con una agenda de vivienda, regeneración urbana (la fachada marítima), movilidad y servicios, en contraposición a la Xunta del PP de Alfonso Rueda. Representa el perfil de alcaldesa joven que el PSOE ha promovido en las grandes ciudades, y gobierna una urbe atlántica de fuerte peso económico y portuario, en permanente competencia institucional con una Xunta de signo contrario.",
        "tray": [
            ("Abogada y socialista coruñesa", "Abogada de formación, desarrolló su carrera en el PSdeG, ganando peso en la política municipal de A Coruña.", "2015-01-01"),
            ("Alcaldesa de A Coruña", "En 2019 fue investida alcaldesa de A Coruña, recuperando el bastón de mando para el PSOE.", "2019-06-15"),
            ("Reelección en 2023", "Revalidó la alcaldía en 2023, consolidando su liderazgo en la ciudad frente a la Xunta del PP.", "2023-06-17"),
            ("Regeneración urbana", "Su mandato se centra en la vivienda, la regeneración de la fachada marítima, la movilidad y los grandes proyectos urbanos de la ciudad.", "2024-01-01"),
        ],
        "pos": ("Socialismo municipal gallego", "Defiende una agenda social y de regeneración urbana, leal a la dirección federal del PSOE y en contraposición a la Xunta del PP de Rueda.", ["psoe", "galicia"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +6/10) — Alcaldesa leal a la dirección federal.", ["psoe", "nota-+6", "alianza"]),
            ("Alfonso Rueda", "**Presidente de la Xunta de Galicia** (nota -3/10) — Rivalidad institucional entre la ciudad socialista y la Xunta del PP.", ["pp", "nota--3", "tension"]),
        ],
    },
    "marifran-carazo": {
        "ciudad": "Granada", "cargo": "Alcaldesa de Granada", "partido": "pp",
        "ctag": "andalucia", "fuente": "https://www.granada.org",
        "nombre": "María Francisca Carazo Villalonga", "alias": "Marifrán Carazo",
        "corta": "Alcaldesa de Granada (PP) desde 2023; exconsejera de Fomento de la Junta de Andalucía.",
        "perfil": "María Francisca «Marifrán» Carazo Villalonga (Granada, 1976) es alcaldesa de Granada desde 2023, dirigente del PP andaluz. Fue consejera de Fomento de la Junta de Andalucía con Juan Manuel Moreno antes de encabezar la candidatura municipal y recuperar la alcaldía de Granada para el PP. Gobierna una ciudad de fuerte peso turístico y universitario —con la Alhambra como emblema mundial—, con la movilidad (el metro, los accesos), el turismo y la vivienda como grandes prioridades. Su trayectoria —de consejera autonómica a alcaldesa— refleja la estrategia del PP de situar perfiles de gestión en las grandes capitales, y afronta el reto de impulsar las eternamente reclamadas infraestructuras ferroviarias de Granada.",
        "tray": [
            ("Carrera en el PP de Granada", "Desarrolló su carrera en el PP de Granada, ocupando cargos municipales y autonómicos en su provincia.", "2011-01-01"),
            ("Consejera de la Junta", "Fue consejera de Fomento, Infraestructuras y Ordenación del Territorio de la Junta de Andalucía en el Gobierno de Moreno Bonilla.", "2019-01-22"),
            ("Alcaldesa de Granada", "En 2023 encabezó la candidatura del PP y fue investida alcaldesa de Granada, recuperando la ciudad para el centroderecha.", "2023-06-17"),
            ("Gestión de la ciudad", "Su mandato se centra en el turismo (la Alhambra), la movilidad, la universidad y la vivienda de una de las grandes ciudades de Andalucía.", "2024-01-01"),
        ],
        "pos": ("Centroderecha andaluz", "Defiende una gestión de centroderecha y la reivindicación de infraestructuras (AVE, accesos) para Granada, en sintonía con la Junta de Moreno Bonilla.", ["pp", "andalucia"]),
        "redes": [
            ("Juan Manuel Moreno Bonilla", "**Presidente de la Junta de Andalucía** (nota +7/10) — Mentor político: Carazo fue su consejera de Fomento.", ["pp", "nota-+7", "alianza"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +6/10) — Alineada con la dirección nacional del partido.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "jose-maria-bellido": {
        "ciudad": "Córdoba", "cargo": "Alcalde de Córdoba", "partido": "pp",
        "ctag": "andalucia", "fuente": "https://www.cordoba.es",
        "nombre": "José María Bellido Roche", "alias": "José María Bellido",
        "corta": "Alcalde de Córdoba (PP) desde 2019, con mayoría absoluta desde 2023.",
        "perfil": "José María Bellido Roche (Córdoba, 1977) es alcalde de Córdoba desde 2019, dirigente del PP andaluz. Abogado, recuperó la alcaldía cordobesa para el centroderecha y la revalidó en 2023 con mayoría absoluta, consolidando el giro de una ciudad históricamente disputada por la izquierda (incluido el PCE/IU). Gobierna una urbe de enorme patrimonio —con la Mezquita-Catedral como símbolo—, con el turismo, el agua y las infraestructuras como ejes de su mandato. Su mayoría absoluta en 2023 consolidó un giro político notable en una ciudad de fuerte tradición de izquierdas, y afronta los grandes retos de Córdoba: el turismo cultural, el agua, el desempleo y las conexiones ferroviarias y por autovía con el resto de Andalucía.",
        "tray": [
            ("Abogado y concejal", "Abogado de formación, desarrolló su carrera en el PP de Córdoba, ocupando concejalías en el Ayuntamiento.", "2011-06-11"),
            ("Alcalde de Córdoba", "En 2019 fue investido alcalde de Córdoba, recuperando la ciudad para el centroderecha.", "2019-06-15"),
            ("Mayoría absoluta", "En 2023 revalidó la alcaldía con mayoría absoluta, consolidando su liderazgo en una ciudad de tradición política plural.", "2023-05-28"),
            ("Patrimonio y turismo", "Su mandato se centra en el turismo y el patrimonio (la Mezquita-Catedral), el agua, la agricultura del entorno y las infraestructuras.", "2024-01-01"),
        ],
        "pos": ("Centroderecha andaluz", "Defiende una gestión de centroderecha centrada en turismo, patrimonio y agua, en coordinación con la Junta de Moreno Bonilla.", ["pp", "andalucia"]),
        "redes": [
            ("Juan Manuel Moreno Bonilla", "**Presidente de la Junta de Andalucía** (nota +6/10) — Coordinación PP entre la ciudad y la Junta.", ["pp", "nota-+6", "alianza"]),
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+6", "alianza"]),
        ],
    },
    "maider-etxebarria": {
        "ciudad": "Vitoria-Gasteiz", "cargo": "Alcaldesa de Vitoria-Gasteiz", "partido": "psoe",
        "ctag": "pais-vasco", "fuente": "https://www.vitoria-gasteiz.org",
        "nombre": "Maider Etxebarria García", "alias": "Maider Etxebarria",
        "corta": "Alcaldesa de Vitoria-Gasteiz (PSE-EE) desde 2023; accedió pese a no ganar, apartando al PNV.",
        "perfil": "Maider Etxebarria García es alcaldesa de Vitoria-Gasteiz desde 2023, dirigente del PSE-EE (los socialistas vascos). Accedió a la alcaldía de la capital de Euskadi pese a no ganar las elecciones, en un pacto que desplazó al PNV de la alcaldía, lo que tensó la relación entre socialistas y jeltzales pese a compartir el Gobierno vasco. Gobierna la sede de las instituciones de Euskadi, con la vivienda, la movilidad sostenible y los servicios sociales como prioridades.",
        "tray": [
            ("Socialista alavesa", "Desarrolló su carrera en el PSE-EE en Álava, ocupando responsabilidades orgánicas e institucionales antes de liderar la candidatura municipal.", "2011-01-01"),
            ("Candidata en Vitoria", "Encabezó la candidatura del PSE-EE en Vitoria-Gasteiz en las elecciones municipales de 2023.", "2023-05-28"),
            ("Alcaldesa de Vitoria", "Fue investida alcaldesa de Vitoria-Gasteiz en 2023 pese a no ganar las elecciones, mediante un pacto que apartó al PNV de la alcaldía de la capital vasca.", "2023-06-17"),
            ("Gestión de la capital vasca", "Su mandato se centra en la vivienda, la movilidad sostenible (Vitoria es referente verde europeo) y los servicios sociales de la sede de las instituciones de Euskadi. Su acceso a la alcaldía sin haber ganado las elecciones, apartando al PNV, ha marcado su mandato y tensa la convivencia entre socialistas y nacionalistas en la capital vasca.", "2024-01-01"),
        ],
        "pos": ("Socialismo municipal vasco", "Defiende una agenda social y de sostenibilidad, en una relación compleja con el PNV pese a compartir el Gobierno vasco a nivel autonómico.", ["psoe", "pais-vasco"]),
        "redes": [
            ("Pedro Sánchez", "**Secretario general del PSOE y presidente del Gobierno** (nota +6/10) — Alineada con la dirección federal del partido.", ["psoe", "nota-+6", "alianza"]),
            ("Imanol Pradales", "**Lehendakari (Gobierno Vasco)** (nota -2/10) — Tensión PNV-PSE por la alcaldía de Vitoria pese a la coalición autonómica.", ["pnv", "nota--2", "tension"]),
        ],
    },
    "luis-barcala": {
        "ciudad": "Alicante", "cargo": "Alcalde de Alicante", "partido": "pp",
        "ctag": "comunidad-valenciana", "fuente": "https://www.alicante.es",
        "nombre": "Luis Barcala Sierra", "alias": "Luis Barcala",
        "corta": "Alcalde de Alicante (PP) desde 2018, reelegido en 2019 y 2023.",
        "perfil": "Luis Barcala Sierra (Alicante, 1961) es alcalde de Alicante desde 2018, dirigente del PP. Abogado, accedió a la alcaldía durante el mandato y la revalidó en 2019 y 2023, consolidando el dominio del centroderecha en la segunda ciudad de la Comunidad Valenciana. Gobierna una urbe mediterránea de fuerte peso turístico, con los grandes proyectos urbanos (el puerto, las playas), la movilidad y las infraestructuras como prioridades, en coordinación con la Generalitat del PP. Veterano de la política alicantina, gobierna una ciudad de fuerte crecimiento y atractivo turístico del litoral mediterráneo, con grandes proyectos urbanos pendientes en el frente portuario y las playas.",
        "tray": [
            ("Abogado y concejal", "Abogado de formación, desarrolló su carrera en el PP de Alicante, ocupando concejalías y la portavocía municipal.", "2011-06-11"),
            ("Alcalde de Alicante", "Accedió a la alcaldía de Alicante en 2018 durante el mandato, tras la salida de su predecesor.", "2018-04-18"),
            ("Reelecciones", "Revalidó la alcaldía en 2019 y 2023, consolidando el gobierno del PP en la ciudad, con apoyo de Vox en la última etapa.", "2023-06-17"),
            ("Gestión de la ciudad", "Su mandato se centra en el turismo, los grandes proyectos urbanos (el puerto, las playas), la movilidad y las infraestructuras de la ciudad.", "2024-01-01"),
        ],
        "pos": ("Centroderecha alicantino", "Defiende una gestión de centroderecha centrada en turismo e infraestructuras, en coordinación con la Generalitat Valenciana del PP.", ["pp", "comunidad-valenciana"]),
        "redes": [
            ("Alberto Núñez Feijóo", "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.", ["pp", "nota-+6", "alianza"]),
            ("Juan Francisco Pérez Llorca", "**Presidente de la Generalitat Valenciana** (nota +5/10) — Coordinación PP entre la ciudad y la Generalitat.", ["pp", "nota-+5", "alianza"]),
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
        "slug": slug,
        "tipo": "politico",
        "nombre": d["nombre"],
        "alias": d["alias"],
        "cargo": d["cargo"],
        "bio_corta": d["corta"],
        "fuente_principal": d["fuente"],
        "tags": ["politico", d["partido"], "alcalde", d["ctag"]],
        "confidence": 0.9,
        "completeness": 0.95,
        "apartados": build_apartados(d),
    }


def main() -> int:
    arr = [build_dossier(s, d) for s, d in ALC.items()]
    json.dump(arr, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"  escrito: {OUT.name} · {len(arr)} alcaldes")
    print(f"OK · {len(ALC)} alcaldes de grandes ciudades")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
