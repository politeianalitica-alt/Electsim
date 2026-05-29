// AUTO-GENERADO desde data/poder/*.json · ver bin/gen_subfixture.py
// Mapa de poder NO-electo (2 lotes):
//   · figuras_clave.json   · medios, poder judicial (TS/CGPJ, TC, Fiscalía),
//     reguladores (BdE, CNMC), empresarios no-IBEX (Roig, Ortega Mera,
//     Escotet), sindicatos (CCOO, UGT), Casa Real e Iglesia.
//   · figuras_clave_2.json · expresidentes (Aznar, Zapatero, F. González,
//     Rajoy), think tanks (FAES, R.I. Elcano), Pablo Iglesias, Borrell,
//     Calviño/BEI, prensa (Pedro J., Herrera, Cebrián), Tezanos/CIS,
//     Gabilondo, empresarios (Koplowitz, Lao, Mango), RTVE, Von der Leyen.
//   · figuras_clave_3.json · tejido económico-institucional: holding March
//     (Alba), grandes despachos (Garrigues, Cuatrecasas, Uría), El Corte
//     Inglés (Marta Álvarez), Cámara España (Bonet), Torreal (Abelló),
//     Hortensia Herrero (Mercadona/arte) y Tomás Olivo (inmobiliario).
//   · figuras_clave_5.json · grandes fondos accionistas del IBEX (BlackRock,
//     fondo de Noruega), prensa (El Confidencial/Cardero, Prensa Ibérica/Moll,
//     Mediaset/Borja Prado), CEPYME (Cuerva), RAE (Muñoz Machado), cardenal
//     Omella, ElPozo (T. Fuertes), Carlos Slim y Glovo (Oscar Pierre).
//   · figuras_clave_4.json · reguladores y holding público sobre el IBEX
//     (SEPI/Gualda, CNMV/San Basilio, AIReF/Herrero, AEB/Kindelán) y dueños
//     de medios (Planeta+Atresmedia/Creuheras, Amber+PRISA/Oughourlian,
//     Losantos), LaLiga/Tebas, Fundación Alternativas, Funcas, Manuel Jove.
//   · figuras_clave_6.json · BCE (Lagarde), Mutua (Garralda), Damm/Disa
//     (Carceller), Mediapro (Roures), El Mundo (Manso), Vocento/ABC, Consejo
//     de Estado (Valerio), Prosegur (Revoredo), Glencore (Daniel Maté), los
//     Albertos e Instituto de la Empresa Familiar.
// Re-generar: python3 bin/gen_subfixture.py --source poder

import type {
  DossierCompleto,
  DossierResumen,
} from './dosieres-fixture'

export const PODER_FIXTURE: DossierCompleto[] = [
  {
    "id": "pod-0001",
    "slug": "pepa-bueno",
    "nombre_completo": "Josefa \"Pepa\" Bueno Echeverría",
    "alias": "Pepa Bueno",
    "cargo_actual": "Directora de El País",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista extremeña. Directora de El País desde 2021, el primer diario por difusión y referente del centro-izquierda mediático español. Larga trayectoria en la Cadena SER (Hoy por Hoy) y TVE (Los Desayunos).",
    "tags": [
      "medio",
      "periodista",
      "prensa",
      "grupo-prisa"
    ],
    "fuente_principal": "https://elpais.com",
    "apartados": [
      {
        "id": "pod-0001-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0001-ap-00-it-00",
            "apartado_id": "pod-0001-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Josefa «Pepa» Bueno Echeverría (Albuquerque, Badajoz, 1964) es directora de El País, el diario de mayor difusión de España y buque insignia del grupo Prisa, y la primera mujer al frente de su redacción. Periodista de larga y reconocida trayectoria en radio y televisión, dirigió y presentó los informativos de TVE y el magacín matinal de la Cadena SER, 'Hoy por Hoy', antes de asumir la dirección del periódico, de línea editorial socioliberal y proyección internacional en español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0001-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0001-ap-01-it-00",
            "apartado_id": "pod-0001-ap-01",
            "tipo": "evento",
            "titulo": "Radio y televisión",
            "contenido": "Desarrolló su carrera en TVE, donde presentó los telediarios y programas de máxima audiencia, antes de dar el salto a la radio.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0001-ap-01-it-01",
            "apartado_id": "pod-0001-ap-01",
            "tipo": "evento",
            "titulo": "'Hoy por Hoy' en la SER",
            "contenido": "Dirigió y presentó 'Hoy por Hoy', el magacín matinal de la Cadena SER, el de mayor audiencia de la radio española, consolidándose como una de las grandes voces del periodismo.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0001-ap-01-it-02",
            "apartado_id": "pod-0001-ap-01",
            "tipo": "evento",
            "titulo": "Directora de El País",
            "contenido": "En 2021 fue nombrada directora de El País, con el reto de liderar la transición digital y el modelo de suscripciones del diario.",
            "fecha": "2021-11-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0001-ap-01-it-03",
            "apartado_id": "pod-0001-ap-01",
            "tipo": "evento",
            "titulo": "Línea editorial de referencia",
            "contenido": "Dirige un diario de referencia internacional en español, de orientación socioliberal, con peso en la agenda política y en los debates sobre la independencia editorial frente a los vaivenes accionariales de Prisa.",
            "fecha": "2022-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0001-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0001-ap-02-it-00",
            "apartado_id": "pod-0001-ap-02",
            "tipo": "dato",
            "titulo": "Línea editorial",
            "contenido": "El País bajo su dirección mantiene una línea socioliberal de centro-izquierda, crítica con los extremos y defensora del consenso constitucional. Editoriales favorables a la UE y a la gobernanza institucional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro-izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0001-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0001-ap-03-it-00",
            "apartado_id": "pod-0001-ap-03",
            "tipo": "contacto",
            "titulo": "Grupo PRISA / Joseph Oughourlian",
            "contenido": "**Presidente de PRISA, editora de El País** (nota +6/10) — Accionista de control vía Amber Capital; condiciona la estrategia del grupo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "prisa",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0001-ap-03-it-01",
            "apartado_id": "pod-0001-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +3/10) — Relación de fuente institucional; El País ha sido crítico y favorable según el tema.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+3",
              "neutral"
            ],
            "orden": 1
          },
          {
            "id": "pod-0001-ap-03-it-02",
            "apartado_id": "pod-0001-ap-03",
            "tipo": "contacto",
            "titulo": "Ignacio Escolar",
            "contenido": "**Director de eldiario.es** (nota +4/10) — Competidor en el espacio progresista, relación cordial-competitiva.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "escolar",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 2
          },
          {
            "id": "pod-0001-ap-03-it-03",
            "apartado_id": "pod-0001-ap-03",
            "tipo": "contacto",
            "titulo": "Eduardo Inda",
            "contenido": "**Director de OKDiario** (nota -6/10) — Polo mediático opuesto, enfrentamiento editorial recurrente.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "inda",
              "nota--6",
              "tension"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0001-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0001-ap-04-it-00",
            "apartado_id": "pod-0001-ap-04",
            "tipo": "documento",
            "titulo": "El País",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://elpais.com",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0002",
    "slug": "antonio-garcia-ferreras",
    "nombre_completo": "Antonio García Ferreras",
    "alias": "Ferreras",
    "cargo_actual": "Director y presentador de Al Rojo Vivo (La Sexta)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista. Director y presentador de Al Rojo Vivo en La Sexta, el programa de tertulia política más influyente de la sobremesa. Director de la productora La Sexta y figura clave del audiovisual de Atresmedia.",
    "tags": [
      "medio",
      "periodista",
      "television",
      "atresmedia"
    ],
    "fuente_principal": "https://www.lasexta.com",
    "apartados": [
      {
        "id": "pod-0002-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0002-ap-00-it-00",
            "apartado_id": "pod-0002-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Antonio García Ferreras (Madrid, 1966) es director y presentador de 'Al Rojo Vivo' (La Sexta), uno de los programas de debate político más influyentes de la televisión española, y figura clave del grupo Atresmedia. Periodista de origen deportivo y exdirector de informativos, es uno de los comunicadores con más peso en la conversación política, con un perfil próximo a la izquierda según sus críticos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0002-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0002-ap-01-it-00",
            "apartado_id": "pod-0002-ap-01",
            "tipo": "evento",
            "titulo": "Del deporte a la información",
            "contenido": "Desarrolló su carrera en el periodismo, pasando por la radio (Cadena SER) y la dirección de comunicación, antes de dirigir los informativos de la recién nacida La Sexta.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0002-ap-01-it-01",
            "apartado_id": "pod-0002-ap-01",
            "tipo": "evento",
            "titulo": "Director de informativos de La Sexta",
            "contenido": "Fue director de los servicios informativos de La Sexta, dándoles un perfil propio y fundando el sello de programas de debate político que caracterizaría a la cadena.",
            "fecha": "2006-03-27",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0002-ap-01-it-02",
            "apartado_id": "pod-0002-ap-01",
            "tipo": "evento",
            "titulo": "'Al Rojo Vivo'",
            "contenido": "Dirige y presenta 'Al Rojo Vivo', programa diario de debate y análisis político de gran audiencia e influencia, que marca buena parte de la agenda televisiva de la actualidad.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0002-ap-01-it-03",
            "apartado_id": "pod-0002-ap-01",
            "tipo": "evento",
            "titulo": "Influencia y polémica",
            "contenido": "Su programa y su figura son centrales en la conversación política; muy seguido y a la vez muy criticado por la derecha, que le atribuye un sesgo progresista, ha protagonizado diversas polémicas mediáticas.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0002-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0002-ap-02-it-00",
            "apartado_id": "pod-0002-ap-02",
            "tipo": "dato",
            "titulo": "Perfil editorial",
            "contenido": "Considerado afín al espacio progresista. Su programa marca agenda en el debate político de la izquierda y el centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "progresista"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0002-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0002-ap-03-it-00",
            "apartado_id": "pod-0002-ap-03",
            "tipo": "contacto",
            "titulo": "Atresmedia / Planeta",
            "contenido": "**Grupo editor (familia Lara)** (nota +6/10) — Atresmedia es propiedad de Grupo Planeta; condiciona el marco corporativo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "atresmedia",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0002-ap-03-it-01",
            "apartado_id": "pod-0002-ap-03",
            "tipo": "contacto",
            "titulo": "José Manuel Villarejo",
            "contenido": "**Comisario jubilado** (nota -7/10) — Aparece en audios del caso Villarejo conversando sobre maniobras mediáticas; episodio controvertido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "villarejo",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          },
          {
            "id": "pod-0002-ap-03-it-02",
            "apartado_id": "pod-0002-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +4/10) — Interlocución frecuente; plató de referencia para el PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0002-ap-04",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0002-ap-04-it-00",
            "apartado_id": "pod-0002-ap-04",
            "tipo": "evento",
            "titulo": "Audios Villarejo",
            "contenido": "En 2022 se publicaron audios atribuidos a Ferreras y Villarejo (2015) sobre una información falsa relativa a cuentas de Podemos. Ferreras lo enmarcó como conversación periodística rutinaria.",
            "fecha": "2022-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "villarejo"
            ],
            "orden": 0
          },
          {
            "id": "pod-0002-ap-04-it-01",
            "apartado_id": "pod-0002-ap-04",
            "tipo": "controversia",
            "titulo": "Los audios con Villarejo",
            "contenido": "La difusión de audios de conversaciones con el excomisario Villarejo (caso de un bulo sobre una presunta cuenta de Podemos) abrió un debate sobre los límites del periodismo y sus fuentes. Ferreras lo enmarcó como una práctica de contraste; rige la presunción de inocencia sobre cualquier extremo no acreditado judicialmente.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "fuentes",
              "presuncion-inocencia"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0002-ap-05",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0002-ap-05-it-00",
            "apartado_id": "pod-0002-ap-05",
            "tipo": "documento",
            "titulo": "La Sexta",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.lasexta.com/programas/al-rojo-vivo/",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0003",
    "slug": "ignacio-escolar",
    "nombre_completo": "Ignacio Escolar García",
    "alias": "Escolar",
    "cargo_actual": "Fundador y director de elDiario.es",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista. Fundador y director de elDiario.es (2012), referente del periodismo digital progresista en España. Anteriormente director fundador de Público y bloguero pionero (escolar.net).",
    "tags": [
      "medio",
      "periodista",
      "digital",
      "progresista"
    ],
    "fuente_principal": "https://www.eldiario.es",
    "apartados": [
      {
        "id": "pod-0003-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0003-ap-00-it-00",
            "apartado_id": "pod-0003-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Ignacio Escolar García (Burgos, 1975) es fundador y director de elDiario.es, uno de los principales medios digitales españoles, de línea editorial progresista y modelo sostenido en buena parte por sus socios. Periodista pionero de internet, fue director fundador del diario Público antes de crear su propio proyecto, y es además un rostro habitual de las tertulias de televisión y radio y autor de varios libros.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0003-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0003-ap-01-it-00",
            "apartado_id": "pod-0003-ap-01",
            "tipo": "evento",
            "titulo": "Pionero del periodismo digital",
            "contenido": "Hijo del periodista Arsenio Escolar, se dio a conocer como uno de los primeros blogueros políticos de referencia en España, combinando la escritura en internet con la radio y la televisión.",
            "fecha": "2005-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0003-ap-01-it-01",
            "apartado_id": "pod-0003-ap-01",
            "tipo": "evento",
            "titulo": "Director fundador de Público",
            "contenido": "Fue el director fundador del diario Público en 2007, un periódico de izquierdas que rompió moldes en el mercado de la prensa escrita antes de su crisis y reconversión.",
            "fecha": "2007-09-26",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0003-ap-01-it-02",
            "apartado_id": "pod-0003-ap-01",
            "tipo": "evento",
            "titulo": "elDiario.es",
            "contenido": "En 2012 fundó elDiario.es, medio nativo digital sostenido en gran parte por sus socios, que se ha consolidado como referente del periodismo progresista y de investigación, con una posición crítica hacia la derecha y los poderes económicos.",
            "fecha": "2012-09-18",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0003-ap-01-it-03",
            "apartado_id": "pod-0003-ap-01",
            "tipo": "evento",
            "titulo": "Influencia y polémica",
            "contenido": "Su medio y su figura se han convertido en referencia del espacio progresista y en blanco de la derecha mediática; sus investigaciones y editoriales son citados con frecuencia en el debate público y en sede parlamentaria.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0003-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0003-ap-02-it-00",
            "apartado_id": "pod-0003-ap-02",
            "tipo": "dato",
            "titulo": "Línea editorial",
            "contenido": "Progresista, crítico con la derecha y los poderes económicos. Periodismo de investigación sobre corrupción y derechos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "progresista"
            ],
            "orden": 0
          },
          {
            "id": "pod-0003-ap-02-it-01",
            "apartado_id": "pod-0003-ap-02",
            "tipo": "dato",
            "titulo": "Medio progresista de socios",
            "contenido": "Defiende un periodismo de izquierdas, independiente de los grandes grupos, financiado por sus lectores-socios. Crítico con la derecha y el poder económico, mantiene también investigaciones que han afectado a gobiernos de distinto signo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "digital"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0003-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0003-ap-03-it-00",
            "apartado_id": "pod-0003-ap-03",
            "tipo": "contacto",
            "titulo": "Eduardo Inda",
            "contenido": "**Director de OKDiario** (nota -8/10) — Antagonista mediático directo; enfrentamientos públicos constantes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "inda",
              "nota--8",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "pod-0003-ap-03-it-01",
            "apartado_id": "pod-0003-ap-03",
            "tipo": "contacto",
            "titulo": "Pepa Bueno",
            "contenido": "**Directora de El País** (nota +4/10) — Espacio progresista compartido, relación cordial-competitiva.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pepa-bueno",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0003-ap-03-it-02",
            "apartado_id": "pod-0003-ap-03",
            "tipo": "contacto",
            "titulo": "Yolanda Díaz",
            "contenido": "**Líder de Sumar** (nota +5/10) — Cobertura favorable al espacio a la izquierda del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "yolanda-diaz",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0003-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0003-ap-04-it-00",
            "apartado_id": "pod-0003-ap-04",
            "tipo": "documento",
            "titulo": "elDiario.es",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.eldiario.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0004",
    "slug": "eduardo-inda",
    "nombre_completo": "Eduardo Inda Arriaga",
    "alias": "Inda",
    "cargo_actual": "Director de OKDiario",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista. Fundador y director de OKDiario (2015), digital de línea conservadora y anti-sanchista. Tertuliano habitual en programas de televisión. Ex subdirector de El Mundo.",
    "tags": [
      "medio",
      "periodista",
      "digital",
      "conservador"
    ],
    "fuente_principal": "https://okdiario.com",
    "apartados": [
      {
        "id": "pod-0004-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0004-ap-00-it-00",
            "apartado_id": "pod-0004-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Eduardo Inda Arriaga (Pamplona, 1966) es fundador y director de OKDiario, un medio digital de línea derechista y combativa, muy crítico con la izquierda y los nacionalismos. Periodista con pasado en El Mundo y Marca, es además un habitual de las tertulias televisivas, donde mantiene un estilo polémico y de confrontación que ha convertido a su medio en un actor influyente de la derecha mediática española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0004-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0004-ap-01-it-00",
            "apartado_id": "pod-0004-ap-01",
            "tipo": "evento",
            "titulo": "Carrera en prensa",
            "contenido": "Desarrolló su carrera en el periodismo, ocupando puestos de responsabilidad como subdirector de El Mundo y director del diario deportivo Marca.",
            "fecha": "1995-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0004-ap-01-it-01",
            "apartado_id": "pod-0004-ap-01",
            "tipo": "evento",
            "titulo": "Fundación de OKDiario",
            "contenido": "En 2015 fundó OKDiario, medio nativo digital que ha basado su crecimiento en exclusivas de fuerte impacto político, especialmente contra la izquierda y el independentismo, algunas de ellas objeto de polémica y de litigios.",
            "fecha": "2015-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0004-ap-01-it-02",
            "apartado_id": "pod-0004-ap-01",
            "tipo": "evento",
            "titulo": "Tertuliano y polémicas",
            "contenido": "Su presencia constante en las tertulias televisivas y su estilo agresivo lo han convertido en una figura mediática controvertida, admirada por su público y muy cuestionada por sus detractores.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0004-ap-01-it-03",
            "apartado_id": "pod-0004-ap-01",
            "tipo": "evento",
            "titulo": "Choque permanente con la izquierda",
            "contenido": "OKDiario y su director mantienen una confrontación constante con el Gobierno de coalición, con la izquierda alternativa y con el independentismo, en una estrategia de exclusivas de denuncia tan exitosa en audiencia como contestada en los tribunales.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0004-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0004-ap-02-it-00",
            "apartado_id": "pod-0004-ap-02",
            "tipo": "contacto",
            "titulo": "Ignacio Escolar",
            "contenido": "**Director de elDiario.es** (nota -8/10) — Antagonista mediático directo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "escolar",
              "nota--8",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "pod-0004-ap-02-it-01",
            "apartado_id": "pod-0004-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -8/10) — Diana editorial principal de OKDiario.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota--8",
              "conflicto"
            ],
            "orden": 1
          },
          {
            "id": "pod-0004-ap-02-it-02",
            "apartado_id": "pod-0004-ap-02",
            "tipo": "contacto",
            "titulo": "Isabel Díaz Ayuso",
            "contenido": "**Presidenta de Madrid** (nota +6/10) — Cobertura favorable habitual.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ayuso",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0004-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0004-ap-03-it-00",
            "apartado_id": "pod-0004-ap-03",
            "tipo": "documento",
            "titulo": "OKDiario",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://okdiario.com",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0004-ap-04",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0004-ap-04-it-00",
            "apartado_id": "pod-0004-ap-04",
            "tipo": "controversia",
            "titulo": "Informaciones cuestionadas",
            "contenido": "Varias de sus exclusivas han sido posteriormente cuestionadas o desmentidas, y ha protagonizado litigios por algunas de ellas. Rige la presunción de inocencia salvo resolución judicial firme.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "litigios",
              "presuncion-inocencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0004-ap-05",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0004-ap-05-it-00",
            "apartado_id": "pod-0004-ap-05",
            "tipo": "dato",
            "titulo": "Medio digital de derecha combativa",
            "contenido": "OKDiario mantiene una línea abiertamente derechista y de oposición frontal al Gobierno de coalición y al independentismo, con un periodismo de impacto y denuncia que sus críticos acusan en ocasiones de falta de rigor.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "digital"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0005",
    "slug": "francisco-marhuenda",
    "nombre_completo": "Francisco Marhuenda García",
    "alias": "Marhuenda",
    "cargo_actual": "Director de La Razón",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista, abogado y politólogo. Director del diario La Razón desde 2008. Tertuliano omnipresente en televisión. Vinculado históricamente al PP (fue jefe de gabinete de Mariano Rajoy en el Ministerio).",
    "tags": [
      "medio",
      "periodista",
      "prensa",
      "conservador"
    ],
    "fuente_principal": "https://www.larazon.es",
    "apartados": [
      {
        "id": "pod-0005-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0005-ap-00-it-00",
            "apartado_id": "pod-0005-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Francisco Marhuenda García (Barcelona, 1961) es director del diario La Razón, de línea conservadora, y uno de los tertulianos más presentes y vehementes de la televisión española. Profesor universitario y doctor en Historia y en Derecho, fue alto cargo en gobiernos del PP antes de volcarse en el periodismo y la opinión, y es hoy uno de los rostros más reconocibles del debate televisivo en España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0005-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0005-ap-01-it-00",
            "apartado_id": "pod-0005-ap-01",
            "tipo": "evento",
            "titulo": "Académico y cargo político",
            "contenido": "Doctor en Historia y en Derecho y profesor universitario, ocupó cargos en la Administración con el PP, entre ellos jefe de gabinete de ministros en la etapa de José María Aznar.",
            "fecha": "1996-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0005-ap-01-it-01",
            "apartado_id": "pod-0005-ap-01",
            "tipo": "evento",
            "titulo": "Director de La Razón",
            "contenido": "Dirige el diario La Razón, periódico de línea conservadora, desde mediados de los años 2000, con una posición editorial de derechas y un fuerte componente de opinión.",
            "fecha": "2008-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0005-ap-01-it-02",
            "apartado_id": "pod-0005-ap-01",
            "tipo": "evento",
            "titulo": "Tertuliano omnipresente",
            "contenido": "Es uno de los contertulios más habituales y reconocibles de la televisión, con un estilo apasionado y a menudo polémico que lo ha convertido en personaje popular más allá de la prensa escrita.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0005-ap-01-it-03",
            "apartado_id": "pod-0005-ap-01",
            "tipo": "evento",
            "titulo": "Profesor y autor",
            "contenido": "Compagina la dirección del diario y la presencia televisiva con la docencia universitaria y la publicación de libros de historia y ensayo político, un perfil que mezcla el academicismo con el periodismo de opinión.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0005-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0005-ap-02-it-00",
            "apartado_id": "pod-0005-ap-02",
            "tipo": "contacto",
            "titulo": "Partido Popular",
            "contenido": "**Vínculo histórico** (nota +6/10) — Pasado como cargo de confianza de Rajoy; línea editorial afín al PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0005-ap-02-it-01",
            "apartado_id": "pod-0005-ap-02",
            "tipo": "contacto",
            "titulo": "Grupo Planeta",
            "contenido": "**Editor de La Razón** (nota +5/10) — La Razón pertenece a Planeta (familia Lara).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "planeta",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0005-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0005-ap-03-it-00",
            "apartado_id": "pod-0005-ap-03",
            "tipo": "documento",
            "titulo": "La Razón",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.larazon.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0005-ap-04",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0005-ap-04-it-00",
            "apartado_id": "pod-0005-ap-04",
            "tipo": "dato",
            "titulo": "Opinión conservadora",
            "contenido": "Desde La Razón y las tertulias defiende posiciones de derecha y constitucionalistas, con crítica al Gobierno de coalición y a los nacionalismos, aunque con un perfil pragmático en su trato con los distintos poderes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "opinion"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0006",
    "slug": "ana-rosa-quintana",
    "nombre_completo": "Ana Rosa Quintana Hortal",
    "alias": "Ana Rosa",
    "cargo_actual": "Presentadora de Telecinco (Mediaset)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y presentadora. Rostro estrella de Mediaset, presentó El Programa de Ana Rosa (matinal de referencia) y posteriormente TardeAR. Una de las comunicadoras más influyentes y mejor pagadas de la televisión española.",
    "tags": [
      "medio",
      "periodista",
      "television",
      "mediaset"
    ],
    "fuente_principal": "https://www.telecinco.es",
    "apartados": [
      {
        "id": "pod-0006-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0006-ap-00-it-00",
            "apartado_id": "pod-0006-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Ana Rosa Quintana Hortal (Madrid, 1956) es una de las presentadoras más influyentes y populares de la televisión española, rostro estrella de Mediaset (Telecinco). Su magacín matinal, 'El programa de Ana Rosa', ha liderado durante años las mañanas de la televisión, convirtiéndola en una figura con notable peso en la conversación política y social, además de empresaria de producción audiovisual.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0006-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0006-ap-01-it-00",
            "apartado_id": "pod-0006-ap-01",
            "tipo": "evento",
            "titulo": "De la prensa a la televisión",
            "contenido": "Periodista de formación, comenzó en la prensa escrita y en la radio antes de dar el salto a la televisión, donde se consolidó como presentadora de programas de gran audiencia.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0006-ap-01-it-01",
            "apartado_id": "pod-0006-ap-01",
            "tipo": "evento",
            "titulo": "'El programa de Ana Rosa'",
            "contenido": "Desde 2005 dirige y presenta 'El programa de Ana Rosa' en Telecinco, magacín matinal de información y actualidad que ha liderado de forma sostenida las audiencias de la mañana.",
            "fecha": "2005-01-10",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0006-ap-01-it-02",
            "apartado_id": "pod-0006-ap-01",
            "tipo": "evento",
            "titulo": "Empresaria audiovisual",
            "contenido": "Es socia de la productora Unicorn Content, con la que produce sus propios programas y otros espacios para Mediaset, combinando el papel de presentadora con el de empresaria.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0006-ap-01-it-03",
            "apartado_id": "pod-0006-ap-01",
            "tipo": "evento",
            "titulo": "Influencia mediática",
            "contenido": "Su tono y sus comentarios marcan con frecuencia la agenda política y social, lo que la convierte en una de las comunicadoras con mayor influencia y también en objeto de polémica.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0006-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0006-ap-02-it-00",
            "apartado_id": "pod-0006-ap-02",
            "tipo": "dato",
            "titulo": "Perfil editorial",
            "contenido": "Considerada de tendencia conservadora-liberal. Crítica habitual con el Gobierno de Sánchez en sus comentarios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "conservador"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0006-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0006-ap-03-it-00",
            "apartado_id": "pod-0006-ap-03",
            "tipo": "contacto",
            "titulo": "Mediaset España",
            "contenido": "**Grupo audiovisual** (nota +6/10) — Cadena que emite sus programas (MFE/Berlusconi).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mediaset",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0006-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0006-ap-04-it-00",
            "apartado_id": "pod-0006-ap-04",
            "tipo": "documento",
            "titulo": "Telecinco",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.telecinco.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0007",
    "slug": "carlos-alsina",
    "nombre_completo": "Carlos Alsina Ramírez",
    "alias": "Alsina",
    "cargo_actual": "Director y presentador de Más de uno (Onda Cero)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista radiofónico. Dirige y presenta Más de uno en Onda Cero, una de las mañanas de radio más escuchadas. Sus entrevistas matinales (Las entrevistas de Alsina) marcan agenda política.",
    "tags": [
      "medio",
      "periodista",
      "radio",
      "onda-cero"
    ],
    "fuente_principal": "https://www.ondacero.es",
    "apartados": [
      {
        "id": "pod-0007-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0007-ap-00-it-00",
            "apartado_id": "pod-0007-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Carlos Alsina Ramírez (Madrid, 1969) es uno de los periodistas de radio más influyentes de España, director y presentador del programa matinal 'Más de uno' de Onda Cero. Su entrevista diaria y su 'Monólogo' de apertura se han convertido en una referencia de la conversación política, con un estilo incisivo que le ha valido los principales premios del periodismo radiofónico, como el Premio Ondas, y la fama de entrevistador temido por los políticos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0007-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0007-ap-01-it-00",
            "apartado_id": "pod-0007-ap-01",
            "tipo": "evento",
            "titulo": "Carrera en la radio",
            "contenido": "Desarrolló prácticamente toda su carrera en la radio, formándose en Onda Cero y en la COPE, donde fue creciendo como redactor, presentador y director de informativos y programas.",
            "fecha": "1995-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0007-ap-01-it-01",
            "apartado_id": "pod-0007-ap-01",
            "tipo": "evento",
            "titulo": "'Más de uno' en Onda Cero",
            "contenido": "Asumió la dirección y presentación del magacín matinal de Onda Cero, 'Más de uno', consolidándolo como uno de los espacios de referencia de la mañana radiofónica y a sí mismo como entrevistador exigente con los políticos de todos los partidos.",
            "fecha": "2015-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0007-ap-01-it-02",
            "apartado_id": "pod-0007-ap-01",
            "tipo": "evento",
            "titulo": "Referente de la mañana radiofónica",
            "contenido": "Su programa compite en la franja matinal con los grandes magacines de la SER y la COPE, y su entrevista y su monólogo marcan a menudo la agenda política del día, citados y replicados por el resto de medios.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0007-ap-01-it-03",
            "apartado_id": "pod-0007-ap-01",
            "tipo": "evento",
            "titulo": "Premios y reconocimiento",
            "contenido": "Su trabajo le ha valido los principales galardones del periodismo radiofónico español, situándolo entre las voces más respetadas e influyentes del medio y como uno de los comunicadores con mayor credibilidad transversal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0007-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0007-ap-02-it-00",
            "apartado_id": "pod-0007-ap-02",
            "tipo": "contacto",
            "titulo": "Atresmedia Radio",
            "contenido": "**Grupo (Onda Cero / Planeta)** (nota +5/10) — Cadena que emite su programa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "atresmedia",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0007-ap-02-it-01",
            "apartado_id": "pod-0007-ap-02",
            "tipo": "contacto",
            "titulo": "jose-creuheras",
            "contenido": "**Su grupo (Onda Cero / Atresmedia)** (nota +5/10) — Alsina lidera las mañanas de Onda Cero, radio del grupo Planeta/Atresmedia que preside Creuheras.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0007-ap-02-it-02",
            "apartado_id": "pod-0007-ap-02",
            "tipo": "contacto",
            "titulo": "carlos-herrera",
            "contenido": "**Competidor matinal en radio** (nota -2/10) — Alsina (Onda Cero) y Herrera (COPE) compiten por el liderazgo de la radio hablada de la mañana.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0007-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0007-ap-03-it-00",
            "apartado_id": "pod-0007-ap-03",
            "tipo": "documento",
            "titulo": "Onda Cero",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.ondacero.es/programas/mas-de-uno/",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0007-ap-04",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0007-ap-04-it-00",
            "apartado_id": "pod-0007-ap-04",
            "tipo": "dato",
            "titulo": "Periodismo de equilibrio exigente",
            "contenido": "Cultiva un perfil de periodista riguroso y exigente con el poder, sin un alineamiento partidista evidente, lo que le da credibilidad transversal aunque sus entrevistas resulten incómodas tanto para el Gobierno como para la oposición.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "radio"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0008",
    "slug": "vicente-valles",
    "nombre_completo": "Vicente Vallés Lázaro",
    "alias": "Vicente Vallés",
    "cargo_actual": "Presentador de Antena 3 Noticias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista. Presentador y director de Antena 3 Noticias 2 (edición de la noche), el informativo de mayor audiencia. Premio Planeta de no ficción por sus ensayos sobre geopolítica.",
    "tags": [
      "medio",
      "periodista",
      "television",
      "atresmedia"
    ],
    "fuente_principal": "https://www.antena3.com",
    "apartados": [
      {
        "id": "pod-0008-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0008-ap-00-it-00",
            "apartado_id": "pod-0008-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Vicente Vallés Lázaro (Madrid, 1963) es uno de los periodistas más influyentes de la televisión española, director y presentador de la segunda edición de Antena 3 Noticias. Reconocido por sus análisis de política nacional e internacional y por sus entrevistas, ha recibido los principales premios del periodismo y es autor de varios libros de éxito sobre geopolítica y la injerencia rusa en las democracias.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0008-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0008-ap-01-it-00",
            "apartado_id": "pod-0008-ap-01",
            "tipo": "contacto",
            "titulo": "Atresmedia",
            "contenido": "**Grupo audiovisual** (nota +6/10) — Antena 3 pertenece a Atresmedia (Planeta).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "atresmedia",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0008-ap-01-it-01",
            "apartado_id": "pod-0008-ap-01",
            "tipo": "contacto",
            "titulo": "jose-creuheras",
            "contenido": "**Su grupo editor (Atresmedia/Planeta)** (nota +6/10) — Vallés es activo estrella de Atresmedia, presidida por Creuheras; su credibilidad refuerza la marca del grupo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0008-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0008-ap-02-it-00",
            "apartado_id": "pod-0008-ap-02",
            "tipo": "documento",
            "titulo": "Antena 3 Noticias",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.antena3.com/noticias/",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0008-ap-03",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0008-ap-03-it-00",
            "apartado_id": "pod-0008-ap-03",
            "tipo": "dato",
            "titulo": "Rigor y liderazgo de audiencia",
            "contenido": "Conduce el informativo de referencia de Antena 3, líder de audiencia. Su estilo analítico y sus entrevistas marcan agenda; es uno de los rostros con más credibilidad del panorama televisivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "informativos",
              "audiencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0008-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0008-ap-04-it-00",
            "apartado_id": "pod-0008-ap-04",
            "tipo": "evento",
            "titulo": "Carrera en informativos",
            "contenido": "Desarrolló su carrera en los informativos de televisión, pasando por cadenas como Telecinco, CNN+ y Cuatro, donde dirigió y presentó espacios de noticias.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0008-ap-04-it-01",
            "apartado_id": "pod-0008-ap-04",
            "tipo": "evento",
            "titulo": "Antena 3 Noticias",
            "contenido": "Se incorporó a Antena 3, donde dirige y presenta la edición de la noche de los informativos, líderes de audiencia en su franja, consolidándose como una de las caras de referencia de la información en España.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0008-ap-04-it-02",
            "apartado_id": "pod-0008-ap-04",
            "tipo": "evento",
            "titulo": "Reconocimiento y premios",
            "contenido": "Su trabajo le ha valido los grandes galardones del periodismo audiovisual, como el Premio Ondas y la Antena de Oro, por su rigor y su capacidad de análisis.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0008-ap-04-it-03",
            "apartado_id": "pod-0008-ap-04",
            "tipo": "evento",
            "titulo": "Escritor de geopolítica",
            "contenido": "Es autor de ensayos de gran éxito sobre la política internacional, la desinformación y la estrategia rusa, que lo han situado también como analista de referencia más allá de la pantalla.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0009",
    "slug": "isabel-perello",
    "nombre_completo": "Isabel Perelló Doménech",
    "alias": "Isabel Perelló",
    "cargo_actual": "Presidenta del Tribunal Supremo y del CGPJ",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Magistrada. Primera mujer en presidir el Tribunal Supremo y el Consejo General del Poder Judicial, desde septiembre de 2024, tras el desbloqueo del CGPJ pactado entre PSOE y PP.",
    "tags": [
      "judicial",
      "poder-judicial",
      "ts",
      "cgpj"
    ],
    "fuente_principal": "https://www.poderjudicial.es",
    "apartados": [
      {
        "id": "pod-0009-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0009-ap-00-it-00",
            "apartado_id": "pod-0009-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Isabel Perelló Doménech es presidenta del Tribunal Supremo y del Consejo General del Poder Judicial (CGPJ), la primera mujer en presidir el poder judicial español en sus dos siglos de historia. Magistrada de larga trayectoria en la Sala de lo Contencioso-Administrativo del Tribunal Supremo, fue elegida en 2024 como candidata de consenso entre los bloques conservador y progresista para desbloquear la renovación del órgano de gobierno de los jueces, que había permanecido paralizada durante más de cinco años.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0009-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0009-ap-01-it-00",
            "apartado_id": "pod-0009-ap-01",
            "tipo": "evento",
            "titulo": "Carrera judicial",
            "contenido": "Ingresó en la carrera judicial y desarrolló una larga trayectoria como magistrada, llegando al Tribunal Supremo, donde ejerció en la Sala de lo Contencioso-Administrativo.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0009-ap-01-it-01",
            "apartado_id": "pod-0009-ap-01",
            "tipo": "evento",
            "titulo": "Magistrada del Supremo",
            "contenido": "Como magistrada del alto tribunal, participó en relevantes resoluciones del orden contencioso-administrativo, ganándose una reputación de independencia y rigor técnico.",
            "fecha": "2009-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0009-ap-01-it-02",
            "apartado_id": "pod-0009-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta del TS y del CGPJ",
            "contenido": "En 2024 fue elegida presidenta del Tribunal Supremo y del CGPJ, como candidata de consenso entre los vocales propuestos por PSOE y PP, tras años de bloqueo en la renovación del órgano.",
            "fecha": "2024-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0009-ap-01-it-03",
            "apartado_id": "pod-0009-ap-01",
            "tipo": "evento",
            "titulo": "Primera mujer al frente del poder judicial",
            "contenido": "Su elección supuso un hito histórico al ser la primera mujer en presidir el poder judicial español, con el reto de recuperar la normalidad institucional y los nombramientos pendientes en la cúpula judicial.",
            "fecha": "2024-09-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0009-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0009-ap-02-it-00",
            "apartado_id": "pod-0009-ap-02",
            "tipo": "dato",
            "titulo": "Independencia judicial",
            "contenido": "Defensa de la independencia y despolitización del CGPJ. Llamamiento a reformar el sistema de elección de vocales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "independencia-judicial"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0009-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0009-ap-03-it-00",
            "apartado_id": "pod-0009-ap-03",
            "tipo": "contacto",
            "titulo": "Cándido Conde-Pumpido",
            "contenido": "**Presidente del Tribunal Constitucional** (nota +3/10) — Cúpula judicial; relación institucional entre TS y TC.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "conde-pumpido",
              "nota-+3",
              "neutral"
            ],
            "orden": 0
          },
          {
            "id": "pod-0009-ap-03-it-01",
            "apartado_id": "pod-0009-ap-03",
            "tipo": "contacto",
            "titulo": "Félix Bolaños",
            "contenido": "**Ministro de Justicia** (nota 0/10) — Interlocución institucional Gobierno-poder judicial, con tensiones sobre la reforma.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bolanos",
              "nota-0",
              "neutral"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0009-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0009-ap-04-it-00",
            "apartado_id": "pod-0009-ap-04",
            "tipo": "documento",
            "titulo": "Poder Judicial",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.poderjudicial.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0010",
    "slug": "candido-conde-pumpido",
    "nombre_completo": "Cándido Conde-Pumpido Tourón",
    "alias": "Conde-Pumpido",
    "cargo_actual": "Presidente del Tribunal Constitucional",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Magistrado. Presidente del Tribunal Constitucional desde 2023. Ex Fiscal General del Estado (2004-2011, con Zapatero). Asociado al sector progresista de la judicatura.",
    "tags": [
      "judicial",
      "tribunal-constitucional",
      "progresista"
    ],
    "fuente_principal": "https://www.tribunalconstitucional.es",
    "apartados": [
      {
        "id": "pod-0010-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0010-ap-00-it-00",
            "apartado_id": "pod-0010-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Cándido Conde-Pumpido Tourón (Santiago de Compostela, 1949) es presidente del Tribunal Constitucional, el máximo intérprete de la Constitución y árbitro último de los grandes conflictos jurídico-políticos del país. Magistrado de larga trayectoria y exfiscal general del Estado en la etapa de Rodríguez Zapatero, su elección y su gestión al frente del tribunal han sido objeto de fuerte polémica política, con acusaciones de la derecha de un sesgo progresista y de alinear al órgano con los intereses del Gobierno, algo que él rechaza apelando a la autonomía del tribunal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0010-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0010-ap-01-it-00",
            "apartado_id": "pod-0010-ap-01",
            "tipo": "evento",
            "titulo": "Carrera judicial y fiscal",
            "contenido": "Magistrado de dilatada trayectoria, ocupó plaza en el Tribunal Supremo y desarrolló una intensa carrera en la judicatura y el ministerio fiscal.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0010-ap-01-it-01",
            "apartado_id": "pod-0010-ap-01",
            "tipo": "evento",
            "titulo": "Fiscal General del Estado",
            "contenido": "Fue fiscal general del Estado entre 2004 y 2011, durante los gobiernos de José Luis Rodríguez Zapatero, una etapa marcada por causas sensibles y por su perfil reformista.",
            "fecha": "2004-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0010-ap-01-it-02",
            "apartado_id": "pod-0010-ap-01",
            "tipo": "evento",
            "titulo": "Magistrado del Constitucional",
            "contenido": "Fue nombrado magistrado del Tribunal Constitucional, donde se alineó con el bloque considerado progresista en debates jurídicos de gran calado político.",
            "fecha": "2017-03-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0010-ap-01-it-03",
            "apartado_id": "pod-0010-ap-01",
            "tipo": "evento",
            "titulo": "Presidente del TC",
            "contenido": "En 2023 fue elegido presidente del Tribunal Constitucional, al frente de un órgano cuya composición y resoluciones —sobre leyes clave del Gobierno— han alimentado un duro choque entre bloques políticos.",
            "fecha": "2023-01-09",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0010-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0010-ap-02-it-00",
            "apartado_id": "pod-0010-ap-02",
            "tipo": "dato",
            "titulo": "Doctrina",
            "contenido": "Avaló sentencias clave en la legislatura: ley del aborto, eutanasia y aspectos de la ley de amnistía. Criticado por la derecha por el giro progresista del TC.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "doctrina"
            ],
            "orden": 0
          },
          {
            "id": "pod-0010-ap-02-it-01",
            "apartado_id": "pod-0010-ap-02",
            "tipo": "dato",
            "titulo": "Garantismo y defensa de la independencia",
            "contenido": "Reivindica la independencia del Constitucional y un enfoque garantista. Defiende la legitimidad del tribunal para revisar leyes y resolver conflictos entre poderes, en un contexto de fuerte tensión institucional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "constitucional",
              "independencia"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0010-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0010-ap-03-it-00",
            "apartado_id": "pod-0010-ap-03",
            "tipo": "contacto",
            "titulo": "PSOE",
            "contenido": "**Sector progresista** (nota +4/10) — Llegó al TC con apoyo del bloque progresista; criticado por el PP por afinidad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0010-ap-03-it-01",
            "apartado_id": "pod-0010-ap-03",
            "tipo": "contacto",
            "titulo": "Partido Popular",
            "contenido": "**Oposición** (nota -5/10) — El PP cuestiona la imparcialidad del TC bajo su presidencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota--5",
              "tension"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0010-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0010-ap-04-it-00",
            "apartado_id": "pod-0010-ap-04",
            "tipo": "documento",
            "titulo": "Tribunal Constitucional",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.tribunalconstitucional.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0010-ap-05",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0010-ap-05-it-00",
            "apartado_id": "pod-0010-ap-05",
            "tipo": "controversia",
            "titulo": "Acusaciones de parcialidad",
            "contenido": "El PP y la derecha mediática le acusan de parcialidad y de favorecer al Gobierno en asuntos como los avales a leyes polémicas o la tramitación de la amnistía. Él y el sector progresista lo niegan y reivindican la independencia del tribunal. El debate forma parte de la batalla más amplia por el control de los órganos del Estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "polarizacion",
              "presuncion-inocencia"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0011",
    "slug": "alvaro-garcia-ortiz",
    "nombre_completo": "Álvaro García Ortiz",
    "alias": "García Ortiz",
    "cargo_actual": "Fiscal General del Estado",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Fiscal. Fiscal General del Estado desde 2022. Su mandato ha estado marcado por una investigación judicial inédita: el Tribunal Supremo lo procesó por presunta revelación de secretos en el caso de la pareja de Isabel Díaz Ayuso.",
    "tags": [
      "judicial",
      "fiscalia",
      "investigado"
    ],
    "fuente_principal": "https://www.fiscal.es",
    "apartados": [
      {
        "id": "pod-0011-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0011-ap-00-it-00",
            "apartado_id": "pod-0011-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Álvaro García Ortiz (Oviedo, 1967) es el Fiscal General del Estado, máximo responsable del Ministerio Fiscal, cargo que ocupa desde 2022 a propuesta del Gobierno. Fiscal de carrera especializado en medio ambiente y delitos económicos, su mandato ha estado marcado por una intensa controversia política sobre la independencia de la Fiscalía y por una causa abierta en su contra en el Tribunal Supremo por una presunta revelación de secretos, proceso en el que rige plenamente la presunción de inocencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0011-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0011-ap-01-it-00",
            "apartado_id": "pod-0011-ap-01",
            "tipo": "evento",
            "titulo": "Fiscal de carrera",
            "contenido": "Fiscal de profesión, se especializó en medio ambiente, urbanismo y criminalidad económica, y desarrolló responsabilidades en la Fiscalía y en la Secretaría Técnica.",
            "fecha": "1995-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0011-ap-01-it-01",
            "apartado_id": "pod-0011-ap-01",
            "tipo": "evento",
            "titulo": "Ascenso en la Fiscalía",
            "contenido": "Ocupó puestos de relevancia en la estructura de la Fiscalía General, incluida la jefatura de la Secretaría Técnica, ganando peso en la cúpula del ministerio fiscal.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0011-ap-01-it-02",
            "apartado_id": "pod-0011-ap-01",
            "tipo": "evento",
            "titulo": "Fiscal General del Estado",
            "contenido": "Fue nombrado Fiscal General del Estado en 2022, al frente del Ministerio Fiscal, en un contexto de fuerte tensión política sobre la independencia de la institución.",
            "fecha": "2022-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0011-ap-01-it-03",
            "apartado_id": "pod-0011-ap-01",
            "tipo": "evento",
            "titulo": "Causa en el Tribunal Supremo",
            "contenido": "El Tribunal Supremo abrió una causa contra él por una presunta revelación de secretos en relación con un asunto fiscal de gran repercusión política; el proceso sigue su curso y rige plenamente la presunción de inocencia.",
            "fecha": "2024-10-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0011-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0011-ap-02-it-00",
            "apartado_id": "pod-0011-ap-02",
            "tipo": "contacto",
            "titulo": "Gobierno de Sánchez",
            "contenido": "**Quien lo propuso** (nota +4/10) — Su nombramiento fue del Gobierno; la oposición cuestiona su independencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0011-ap-02-it-01",
            "apartado_id": "pod-0011-ap-02",
            "tipo": "contacto",
            "titulo": "Isabel Díaz Ayuso",
            "contenido": "**Presidenta de Madrid** (nota -8/10) — Conflicto directo: la causa contra García Ortiz nace de la filtración sobre la pareja de Ayuso.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ayuso",
              "nota--8",
              "conflicto"
            ],
            "orden": 1
          },
          {
            "id": "pod-0011-ap-02-it-02",
            "apartado_id": "pod-0011-ap-02",
            "tipo": "contacto",
            "titulo": "Miguel Ángel Rodríguez",
            "contenido": "**Jefe de gabinete de Ayuso** (nota -8/10) — Pieza central del enfrentamiento sobre la filtración.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mar",
              "nota--8",
              "conflicto"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0011-ap-03",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0011-ap-03-it-00",
            "apartado_id": "pod-0011-ap-03",
            "tipo": "evento",
            "titulo": "Procesamiento por revelación de secretos",
            "contenido": "El Tribunal Supremo abrió causa y procesó al FGE por la presunta filtración de un correo del abogado de la pareja de Ayuso. Caso inédito: un Fiscal General procesado en ejercicio. Rige la presunción de inocencia.",
            "fecha": "2024-10-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "judicial",
              "presuncion-inocencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0011-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0011-ap-04-it-00",
            "apartado_id": "pod-0011-ap-04",
            "tipo": "documento",
            "titulo": "Fiscalía",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.fiscal.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0011-ap-05",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0011-ap-05-it-00",
            "apartado_id": "pod-0011-ap-05",
            "tipo": "dato",
            "titulo": "Defensa de la legalidad y autonomía",
            "contenido": "Reivindica la actuación de la Fiscalía conforme a la legalidad y su autonomía funcional. La oposición y parte de la carrera le reprochan sintonía con el Gobierno; él lo niega. El episodio ha tensionado como pocos la relación entre Fiscalía, jueces y poder político.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "fiscalia",
              "presuncion-inocencia"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0012",
    "slug": "juan-carlos-peinado",
    "nombre_completo": "Juan Carlos Peinado",
    "alias": "Juez Peinado",
    "cargo_actual": "Magistrado-juez del Juzgado de Instrucción nº 41 de Madrid",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Juez de instrucción de Madrid. Instructor de la causa contra Begoña Gómez, esposa de Pedro Sánchez, por presuntos delitos relacionados con su actividad profesional. Caso de altísima tensión política.",
    "tags": [
      "judicial",
      "juez-instruccion",
      "madrid"
    ],
    "fuente_principal": "https://www.poderjudicial.es",
    "apartados": [
      {
        "id": "pod-0012-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0012-ap-00-it-00",
            "apartado_id": "pod-0012-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Magistrado titular del Juzgado de Instrucción nº 41 de Madrid. Saltó al primer plano por la causa contra Begoña Gómez.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0012-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0012-ap-01-it-00",
            "apartado_id": "pod-0012-ap-01",
            "tipo": "contacto",
            "titulo": "Begoña Gómez",
            "contenido": "**Esposa de Pedro Sánchez** (nota -7/10) — Investigada en la causa que instruye; rige la presunción de inocencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota--7",
              "conflicto",
              "presuncion-inocencia"
            ],
            "orden": 0
          },
          {
            "id": "pod-0012-ap-01-it-01",
            "apartado_id": "pod-0012-ap-01",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -6/10) — Citado como testigo en la causa; el Gobierno critica la instrucción.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota--6",
              "tension"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0012-ap-02",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0012-ap-02-it-00",
            "apartado_id": "pod-0012-ap-02",
            "tipo": "evento",
            "titulo": "Instrucción contra Begoña Gómez",
            "contenido": "La instrucción ha sido objeto de recursos y críticas sobre su alcance. El Gobierno y el PSOE han cuestionado la actuación judicial; la oposición la respalda. Rige la presunción de inocencia para todos los investigados.",
            "fecha": "2024-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "judicial",
              "presuncion-inocencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0012-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0012-ap-03-it-00",
            "apartado_id": "pod-0012-ap-03",
            "tipo": "documento",
            "titulo": "Poder Judicial",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.poderjudicial.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0013",
    "slug": "jose-luis-escriva",
    "nombre_completo": "José Luis Escrivá Belmonte",
    "alias": "Escrivá",
    "cargo_actual": "Gobernador del Banco de España",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Economista. Gobernador del Banco de España desde 2024. Anteriormente ministro de Inclusión, Seguridad Social y Migraciones (2020-2023) y de Transformación Digital (2023-2024), y presidente fundador de la AIReF.",
    "tags": [
      "regulador",
      "banco-de-espana",
      "economia",
      "ex-ministro"
    ],
    "fuente_principal": "https://www.bde.es",
    "apartados": [
      {
        "id": "pod-0013-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0013-ap-00-it-00",
            "apartado_id": "pod-0013-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Luis Escrivá Belmonte (Albacete, 1960) es gobernador del Banco de España desde 2024. Economista y técnico comercial del Estado, ha transitado por la banca privada, los organismos internacionales y el Gobierno, donde fue ministro, hasta llegar a la cúpula del supervisor bancario y al Consejo de Gobierno del BCE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0013-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0013-ap-01-it-00",
            "apartado_id": "pod-0013-ap-01",
            "tipo": "evento",
            "titulo": "Economista de prestigio",
            "contenido": "Técnico comercial y economista del Estado, trabajó en el Banco de España, en el BCE y dirigió el servicio de estudios del BBVA, ganándose una sólida reputación técnica en análisis macroeconómico y fiscal.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0013-ap-01-it-01",
            "apartado_id": "pod-0013-ap-01",
            "tipo": "evento",
            "titulo": "Primer presidente de la AIReF",
            "contenido": "En 2014 fue nombrado primer presidente de la Autoridad Independiente de Responsabilidad Fiscal (AIReF), el organismo que fiscaliza las cuentas públicas. Desde ahí construyó un perfil de tecnócrata riguroso y a veces incómodo para los gobiernos.",
            "fecha": "2014-02-25",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0013-ap-01-it-02",
            "apartado_id": "pod-0013-ap-01",
            "tipo": "evento",
            "titulo": "Ministro de Sánchez",
            "contenido": "En 2020 entró en el Gobierno de coalición como ministro de Inclusión, Seguridad Social y Migraciones. Pilotó la reforma de las pensiones —pactada con Bruselas y los agentes sociales— y el Ingreso Mínimo Vital. En 2023 pasó a la cartera de Transformación Digital.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0013-ap-01-it-03",
            "apartado_id": "pod-0013-ap-01",
            "tipo": "evento",
            "titulo": "Gobernador del Banco de España",
            "contenido": "En septiembre de 2024 fue nombrado gobernador del Banco de España, no sin polémica por su pasado político reciente. Desde el cargo supervisa la solvencia de la banca, asesora sobre estabilidad financiera y vivienda, y vota en el Consejo de Gobierno del BCE la política monetaria del euro.",
            "fecha": "2024-09-09",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0013-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0013-ap-02-it-00",
            "apartado_id": "pod-0013-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +5/10) — Fue su ministro; el Gobierno impulsó su nombramiento como Gobernador.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0013-ap-02-it-01",
            "apartado_id": "pod-0013-ap-02",
            "tipo": "contacto",
            "titulo": "María Jesús Montero",
            "contenido": "**Ministra de Hacienda** (nota +4/10) — Coordinación en política fiscal y de pensiones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "montero",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0013-ap-02-it-02",
            "apartado_id": "pod-0013-ap-02",
            "tipo": "contacto",
            "titulo": "BCE / Christine Lagarde",
            "contenido": "**Banco Central Europeo** (nota +3/10) — El Gobernador del BdE forma parte del Consejo de Gobierno del BCE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bce",
              "nota-+3",
              "neutral"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0013-ap-03",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0013-ap-03-it-00",
            "apartado_id": "pod-0013-ap-03",
            "tipo": "evento",
            "titulo": "Nombramiento polémico",
            "contenido": "Su salto directo de ministro a Gobernador del Banco de España fue criticado por la oposición y parte del sector financiero por el posible riesgo a la independencia del supervisor.",
            "fecha": "2024-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "independencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0013-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0013-ap-04-it-00",
            "apartado_id": "pod-0013-ap-04",
            "tipo": "documento",
            "titulo": "Banco de España",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.bde.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0013-ap-05",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0013-ap-05-it-00",
            "apartado_id": "pod-0013-ap-05",
            "tipo": "dato",
            "titulo": "Tecnócrata de la sostenibilidad fiscal",
            "contenido": "Defiende la sostenibilidad de las pensiones y de las cuentas públicas con un enfoque técnico y de big data. Su nombramiento como gobernador reavivó el debate sobre la independencia del supervisor frente al poder político.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pensiones",
              "supervision"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0014",
    "slug": "cani-fernandez",
    "nombre_completo": "Cani Fernández Vicién",
    "alias": "Cani Fernández",
    "cargo_actual": "Presidenta de la CNMC",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Abogada especialista en competencia. Presidenta de la Comisión Nacional de los Mercados y la Competencia (CNMC) desde 2020. Árbitro clave en concentraciones empresariales como la OPA BBVA-Sabadell.",
    "tags": [
      "regulador",
      "cnmc",
      "competencia"
    ],
    "fuente_principal": "https://www.cnmc.es",
    "apartados": [
      {
        "id": "pod-0014-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0014-ap-00-it-00",
            "apartado_id": "pod-0014-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Cani Fernández Vicién es presidenta de la Comisión Nacional de los Mercados y la Competencia (CNMC), el organismo que vela por la libre competencia y supervisa sectores regulados como la energía, las telecomunicaciones, el transporte o el sector audiovisual. Abogada de prestigio internacional especializada en derecho de la competencia y de la Unión Europea, con una larga trayectoria ante los tribunales españoles y comunitarios, dirige al gran regulador económico español, cuyas decisiones sobre cárteles, concentraciones empresariales y mercados regulados condicionan a las mayores compañías del país.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0014-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0014-ap-01-it-00",
            "apartado_id": "pod-0014-ap-01",
            "tipo": "dato",
            "titulo": "OPA BBVA-Sabadell",
            "contenido": "La CNMC tiene un papel decisivo en la autorización (con o sin condiciones) de la OPA de BBVA sobre Sabadell, una de las operaciones más relevantes del sistema financiero.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bbva-sabadell"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0014-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0014-ap-02-it-00",
            "apartado_id": "pod-0014-ap-02",
            "tipo": "contacto",
            "titulo": "BBVA / Sabadell",
            "contenido": "**OPA bajo su supervisión** (nota 0/10) — La CNMC arbitra la operación; relación de regulador imparcial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota-0",
              "neutral"
            ],
            "orden": 0
          },
          {
            "id": "pod-0014-ap-02-it-01",
            "apartado_id": "pod-0014-ap-02",
            "tipo": "contacto",
            "titulo": "Gobierno (Min. Economía)",
            "contenido": "**Carlos Cuerpo** (nota 0/10) — El Gobierno puede intervenir en fase 3 de una concentración tras la CNMC.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "cuerpo",
              "nota-0",
              "neutral"
            ],
            "orden": 1
          },
          {
            "id": "pod-0014-ap-02-it-02",
            "apartado_id": "pod-0014-ap-02",
            "tipo": "contacto",
            "titulo": "Empresas del IBEX 35",
            "contenido": "**Vigila concentraciones y cárteles** (nota +6/10) — La CNMC autoriza fusiones, sanciona prácticas anticompetitivas y regula energía, telecos y transporte; su criterio condiciona operaciones del IBEX.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0014-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0014-ap-03-it-00",
            "apartado_id": "pod-0014-ap-03",
            "tipo": "documento",
            "titulo": "CNMC",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.cnmc.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0014-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 4,
        "items": [
          {
            "id": "pod-0014-ap-04-it-00",
            "apartado_id": "pod-0014-ap-04",
            "tipo": "evento",
            "titulo": "Abogada de la competencia",
            "contenido": "Abogada especializada en derecho europeo y de la competencia, desarrolló una destacada carrera en la abogacía de los negocios, con experiencia ante los tribunales españoles y comunitarios.",
            "fecha": "1995-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0014-ap-04-it-01",
            "apartado_id": "pod-0014-ap-04",
            "tipo": "evento",
            "titulo": "Presidenta de la CNMC",
            "contenido": "Fue nombrada presidenta de la CNMC en 2020, al frente del organismo que sanciona los cárteles, autoriza concentraciones y supervisa los sectores regulados.",
            "fecha": "2020-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0014-ap-04-it-02",
            "apartado_id": "pod-0014-ap-04",
            "tipo": "evento",
            "titulo": "Defensa de la competencia",
            "contenido": "Bajo su mandato, la CNMC ha actuado contra prácticas anticompetitivas en numerosos sectores y ha analizado grandes operaciones, como concentraciones bancarias y energéticas.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0014-ap-04-it-03",
            "apartado_id": "pod-0014-ap-04",
            "tipo": "evento",
            "titulo": "Regulación de sectores estratégicos",
            "contenido": "Le corresponde arbitrar en mercados clave —energía, telecomunicaciones, transporte— en un contexto de transición energética, concentración empresarial y tensión sobre los precios.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0015",
    "slug": "juan-roig",
    "nombre_completo": "Juan Roig Alfonso",
    "alias": "Juan Roig",
    "cargo_actual": "Presidente de Mercadona",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario valenciano. Presidente de Mercadona, la mayor cadena de supermercados de España (cuota ~26%). Una de las mayores fortunas del país. Propietario del Valencia Basket y promotor del ecosistema emprendedor Marina de Empresas / Lanzadera.",
    "tags": [
      "empresa",
      "empresario",
      "distribucion",
      "no-ibex",
      "valencia"
    ],
    "fuente_principal": "https://www.mercadona.es",
    "apartados": [
      {
        "id": "pod-0015-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0015-ap-00-it-00",
            "apartado_id": "pod-0015-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Juan Roig Alfonso (Valencia, 1949) es presidente de Mercadona, la mayor cadena de distribución alimentaria de España, y una de las primeras fortunas del país. Convirtió un pequeño negocio familiar de ultramarinos en el líder absoluto del supermercado español, con un modelo de gestión —y un discurso del «esfuerzo»— que lo ha hecho referente y a la vez figura controvertida del empresariado. Reinvierte buena parte de su fortuna en el emprendimiento y el deporte, y su mujer, Hortensia Herrero, destaca como gran mecenas del arte.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0015-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0015-ap-01-it-00",
            "apartado_id": "pod-0015-ap-01",
            "tipo": "evento",
            "titulo": "De la tienda familiar a Mercadona",
            "contenido": "Hijo de una familia de tenderos valencianos, transformó el pequeño negocio de ultramarinos en Mercadona, que bajo su dirección se convirtió en líder absoluto de la distribución en España, con más de 1.600 supermercados.",
            "fecha": "1981-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0015-ap-01-it-01",
            "apartado_id": "pod-0015-ap-01",
            "tipo": "evento",
            "titulo": "El «modelo Mercadona»",
            "contenido": "Impuso un modelo de marca propia (Hacendado, Deliplus), «siempre precios bajos», fuerte inversión en logística e integración con proveedores (los «interproveedores»), estudiado y copiado en todo el sector mundial.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0015-ap-01-it-02",
            "apartado_id": "pod-0015-ap-01",
            "tipo": "evento",
            "titulo": "Marina de Empresas y emprendimiento",
            "contenido": "Reinvierte parte de su fortuna en el emprendimiento a través de Marina de Empresas, la aceleradora Lanzadera y la escuela de negocios EDEM, con el objetivo declarado de fomentar la cultura del esfuerzo y la empresa.",
            "fecha": "2013-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0015-ap-01-it-03",
            "apartado_id": "pod-0015-ap-01",
            "tipo": "evento",
            "titulo": "Patrón y mecenas valenciano",
            "contenido": "Es propietario del Valencia Basket y un activo patrón de iniciativas en la Comunidad Valenciana; junto a su esposa, Hortensia Herrero, forma uno de los grandes binomios empresariales y filantrópicos de España.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0015-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0015-ap-02-it-00",
            "apartado_id": "pod-0015-ap-02",
            "tipo": "dato",
            "titulo": "Modelo empresarial",
            "contenido": "Defensa pública del esfuerzo, la productividad y la reinversión. Crítico ocasional con la presión fiscal y reivindicador del 'modelo Mercadona' de calidad-precio.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "modelo-empresarial"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0015-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0015-ap-03-it-00",
            "apartado_id": "pod-0015-ap-03",
            "tipo": "contacto",
            "titulo": "Hortensia Herrero",
            "contenido": "**Esposa y vicepresidenta de Mercadona** (nota +9/10) — Copropietaria; mecenas de arte en Valencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "herrero",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0015-ap-03-it-01",
            "apartado_id": "pod-0015-ap-03",
            "tipo": "contacto",
            "titulo": "Carlos Mazón",
            "contenido": "**President de la Generalitat Valenciana (PP)** (nota +4/10) — Interlocución institucional como mayor empleador valenciano.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mazon",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0015-ap-03-it-02",
            "apartado_id": "pod-0015-ap-03",
            "tipo": "contacto",
            "titulo": "Proveedores 'interproveedores'",
            "contenido": "**Red de proveedores estratégicos** (nota +6/10) — Modelo de interproveedores integrados clave en su cadena.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "proveedores",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0015-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0015-ap-04-it-00",
            "apartado_id": "pod-0015-ap-04",
            "tipo": "documento",
            "titulo": "Mercadona",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.mercadona.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0016",
    "slug": "sandra-ortega-mera",
    "nombre_completo": "Sandra Ortega Mera",
    "alias": "Sandra Ortega",
    "cargo_actual": "Accionista de Inditex · presidenta de Rosp Corunna",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresaria e inversora. Hija de Amancio Ortega y Rosalía Mera (cofundadora de Inditex). Mayor fortuna femenina de España, heredera del ~5% de Inditex y de la cartera de su madre vía Rosp Corunna.",
    "tags": [
      "empresa",
      "inversora",
      "inditex",
      "no-ibex",
      "galicia"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Sandra_Ortega_Mera",
    "apartados": [
      {
        "id": "pod-0016-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0016-ap-00-it-00",
            "apartado_id": "pod-0016-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Sandra Ortega Mera (A Coruña, 1968) es la mujer más rica de España y la principal accionista individual de Inditex después de su padre, Amancio Ortega. Heredó la participación de su madre, Rosalía Mera, cofundadora del grupo Zara, y gestiona su patrimonio e inversiones a través de la sociedad Rosp Corunna, con un perfil personal muy discreto y una intensa actividad filantrópica orientada a la discapacidad y la inclusión social.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0016-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0016-ap-01-it-00",
            "apartado_id": "pod-0016-ap-01",
            "tipo": "contacto",
            "titulo": "Amancio Ortega",
            "contenido": "**Padre, fundador de Inditex** (nota +8/10) — Vínculo familiar; ambos accionistas de Inditex.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "amancio-ortega",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0016-ap-01-it-01",
            "apartado_id": "pod-0016-ap-01",
            "tipo": "contacto",
            "titulo": "Marta Ortega",
            "contenido": "**Hermanastra, presidenta de Inditex** (nota +5/10) — Relación familiar; ambas en la órbita Inditex.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "marta-ortega-perez",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0016-ap-01-it-02",
            "apartado_id": "pod-0016-ap-01",
            "tipo": "contacto",
            "titulo": "Fundación Paideia",
            "contenido": "**Brazo filantrópico (heredado de Rosalía Mera)** (nota +7/10) — Foco en discapacidad e inclusión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "paideia",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0016-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0016-ap-02-it-00",
            "apartado_id": "pod-0016-ap-02",
            "tipo": "documento",
            "titulo": "Rosp Corunna",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Sandra_Ortega_Mera",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0016-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0016-ap-03-it-00",
            "apartado_id": "pod-0016-ap-03",
            "tipo": "evento",
            "titulo": "Hija de los fundadores de Zara",
            "contenido": "Hija de Amancio Ortega y de Rosalía Mera, cofundadores de Zara/Inditex, se formó en el ámbito de la terapia ocupacional y la atención a la discapacidad, lejos del foco empresarial.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0016-ap-03-it-01",
            "apartado_id": "pod-0016-ap-03",
            "tipo": "evento",
            "titulo": "La herencia de Rosalía Mera",
            "contenido": "Tras el fallecimiento de su madre en 2013, heredó su participación en Inditex y su patrimonio, convirtiéndose en la mujer más rica de España y una de las mayores accionistas del grupo textil.",
            "fecha": "2013-08-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0016-ap-03-it-02",
            "apartado_id": "pod-0016-ap-03",
            "tipo": "evento",
            "titulo": "Rosp Corunna",
            "contenido": "Gestiona su patrimonio e inversiones a través de la sociedad Rosp Corunna, diversificando en cotizadas, inmobiliario y otros activos, además de su paquete en Inditex.",
            "fecha": "2014-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0016-ap-03-it-03",
            "apartado_id": "pod-0016-ap-03",
            "tipo": "evento",
            "titulo": "Filantropía social",
            "contenido": "Continúa la labor social iniciada por su madre a través de la fundación familiar, con proyectos centrados en la discapacidad y la inclusión, manteniendo un perfil público muy reservado.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0017",
    "slug": "juan-carlos-escotet",
    "nombre_completo": "Juan Carlos Escotet Rodríguez",
    "alias": "Escotet",
    "cargo_actual": "Presidente de Abanca",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Banquero hispano-venezolano. Presidente de Abanca, banco resultante de la antigua Novagalicia (cajas gallegas). Controla el grupo vía Banesco. Presidente del Deportivo de la Coruña.",
    "tags": [
      "empresa",
      "banca",
      "no-ibex",
      "galicia"
    ],
    "fuente_principal": "https://www.abanca.com",
    "apartados": [
      {
        "id": "pod-0017-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0017-ap-00-it-00",
            "apartado_id": "pod-0017-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Juan Carlos Escotet Rodríguez es presidente de Abanca, el banco gallego surgido de la antigua Novacaixagalicia, y fundador del grupo financiero venezolano Banesco. Banquero de origen venezolano afincado en Galicia, reflotó la entidad gallega tras la crisis de las cajas y la convirtió en un banco rentable y en plena expansión por España y Portugal, figurando entre las mayores fortunas de su país de origen y como uno de los grandes nombres de la banca española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0017-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0017-ap-01-it-00",
            "apartado_id": "pod-0017-ap-01",
            "tipo": "contacto",
            "titulo": "Xunta de Galicia",
            "contenido": "**Gobierno gallego (PP)** (nota +4/10) — Abanca como banco de referencia en Galicia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "xunta",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0017-ap-01-it-01",
            "apartado_id": "pod-0017-ap-01",
            "tipo": "contacto",
            "titulo": "Deportivo de la Coruña",
            "contenido": "**Club que preside / patrocina** (nota +7/10) — Vínculo de proyección social en A Coruña.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "deportivo",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          },
          {
            "id": "pod-0017-ap-01-it-02",
            "apartado_id": "pod-0017-ap-01",
            "tipo": "contacto",
            "titulo": "Tejido financiero gallego",
            "contenido": "**Banca de referencia en Galicia** (nota +6/10) — Abanca es pieza central del poder económico gallego, con creciente peso nacional vía adquisiciones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0017-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0017-ap-02-it-00",
            "apartado_id": "pod-0017-ap-02",
            "tipo": "documento",
            "titulo": "Abanca",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.abanca.com",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0017-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0017-ap-03-it-00",
            "apartado_id": "pod-0017-ap-03",
            "tipo": "evento",
            "titulo": "Banesco en Venezuela",
            "contenido": "Construyó en Venezuela el grupo Banesco, uno de los mayores bancos privados del país, lo que le dio la dimensión financiera necesaria para expandirse internacionalmente.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0017-ap-03-it-01",
            "apartado_id": "pod-0017-ap-03",
            "tipo": "evento",
            "titulo": "Compra de NCG / Abanca",
            "contenido": "Adquirió en 2014 NCG Banco, la entidad gallega nacionalizada heredera de las cajas (Novacaixagalicia), rebautizándola como Abanca y devolviéndola a la rentabilidad.",
            "fecha": "2014-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0017-ap-03-it-02",
            "apartado_id": "pod-0017-ap-03",
            "tipo": "evento",
            "titulo": "Expansión de Abanca",
            "contenido": "Bajo su presidencia, Abanca ha crecido mediante adquisiciones de otras entidades en España y Portugal, consolidándose como banco de referencia en Galicia y como actor relevante del sistema financiero español.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0017-ap-03-it-03",
            "apartado_id": "pod-0017-ap-03",
            "tipo": "evento",
            "titulo": "Banca y fortuna",
            "contenido": "Compagina la presidencia de Abanca con su papel al frente del grupo Banesco, figurando entre las mayores fortunas de origen venezolano y como uno de los banqueros más influyentes del noroeste español.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0018",
    "slug": "unai-sordo",
    "nombre_completo": "Unai Sordo Calvo",
    "alias": "Unai Sordo",
    "cargo_actual": "Secretario general de CCOO",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Sindicalista vasco. Secretario general de Comisiones Obreras (CCOO) desde 2017, el mayor sindicato de España. Interlocutor central del diálogo social con Gobierno y patronal.",
    "tags": [
      "sindicato",
      "ccoo",
      "dialogo-social"
    ],
    "fuente_principal": "https://www.ccoo.es",
    "apartados": [
      {
        "id": "pod-0018-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0018-ap-00-it-00",
            "apartado_id": "pod-0018-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Unai Sordo Calvo (Barakaldo, Bizkaia, 1972) es secretario general de Comisiones Obreras (CCOO), el mayor sindicato de España junto a UGT, desde 2017. Sindicalista de origen vasco y curtido en el metal, es uno de los principales interlocutores sociales del país en la negociación de salarios, pensiones, jornada y reformas laborales con el Gobierno y la patronal, y una de las voces de referencia de la izquierda sindical española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0018-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0018-ap-01-it-00",
            "apartado_id": "pod-0018-ap-01",
            "tipo": "dato",
            "titulo": "Agenda sindical",
            "contenido": "Defensa de la subida del SMI, reducción de jornada, derogación de aspectos de la reforma laboral de 2012 y mejora de pensiones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "agenda-sindical"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0018-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0018-ap-02-it-00",
            "apartado_id": "pod-0018-ap-02",
            "tipo": "contacto",
            "titulo": "Yolanda Díaz",
            "contenido": "**Ministra de Trabajo / líder Sumar** (nota +7/10) — Aliada clave en la reforma laboral y la subida del SMI.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "yolanda-diaz",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0018-ap-02-it-01",
            "apartado_id": "pod-0018-ap-02",
            "tipo": "contacto",
            "titulo": "Pepe Álvarez",
            "contenido": "**Secretario general de UGT** (nota +7/10) — Acción sindical conjunta CCOO-UGT.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pepe-alvarez",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          },
          {
            "id": "pod-0018-ap-02-it-02",
            "apartado_id": "pod-0018-ap-02",
            "tipo": "contacto",
            "titulo": "Antonio Garamendi",
            "contenido": "**Presidente de CEOE** (nota -2/10) — Contraparte en el diálogo social; tensión negociadora pero acuerdos puntuales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "garamendi",
              "nota--2",
              "neutral"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0018-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0018-ap-03-it-00",
            "apartado_id": "pod-0018-ap-03",
            "tipo": "documento",
            "titulo": "CCOO",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.ccoo.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0018-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0018-ap-04-it-00",
            "apartado_id": "pod-0018-ap-04",
            "tipo": "evento",
            "titulo": "Del metal a la cúpula sindical",
            "contenido": "Curtido en la federación industrial y en CCOO del País Vasco, fue escalando en la organización hasta liderar el sindicato en Euskadi.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0018-ap-04-it-01",
            "apartado_id": "pod-0018-ap-04",
            "tipo": "evento",
            "titulo": "Secretario general de CCOO",
            "contenido": "Fue elegido secretario general de CCOO en 2017, sucediendo a Ignacio Fernández Toxo, al frente del mayor sindicato español por representación.",
            "fecha": "2017-06-30",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0018-ap-04-it-02",
            "apartado_id": "pod-0018-ap-04",
            "tipo": "evento",
            "titulo": "Diálogo social",
            "contenido": "Ha sido protagonista del diálogo social en la etapa del Gobierno de coalición, con acuerdos como la reforma laboral de 2021, las sucesivas subidas del salario mínimo y la reforma de las pensiones.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0018-ap-04-it-03",
            "apartado_id": "pod-0018-ap-04",
            "tipo": "evento",
            "titulo": "Sindicalismo de concertación",
            "contenido": "Defiende un modelo de sindicalismo de concertación y acuerdo, combinando la movilización con la negociación, en un contexto en el que la inflación, la vivienda y el reparto de la riqueza marcan el debate.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0019",
    "slug": "pepe-alvarez",
    "nombre_completo": "José María \"Pepe\" Álvarez Suárez",
    "alias": "Pepe Álvarez",
    "cargo_actual": "Secretario general de UGT",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Sindicalista. Secretario general de la Unión General de Trabajadores (UGT) desde 2016. Junto con CCOO, columna del diálogo social y de la concertación con el Gobierno de coalición.",
    "tags": [
      "sindicato",
      "ugt",
      "dialogo-social"
    ],
    "fuente_principal": "https://www.ugt.es",
    "apartados": [
      {
        "id": "pod-0019-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0019-ap-00-it-00",
            "apartado_id": "pod-0019-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José María «Pepe» Álvarez Suárez (Crémenes, León, 1956) es secretario general de la Unión General de Trabajadores (UGT), uno de los dos grandes sindicatos de España, desde 2016. Sindicalista veterano, curtido durante décadas en Cataluña, es junto al líder de CCOO uno de los principales representantes de los trabajadores en el diálogo social y un protagonista habitual de la negociación de salarios, pensiones y derechos laborales con el Gobierno y los empresarios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0019-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0019-ap-01-it-00",
            "apartado_id": "pod-0019-ap-01",
            "tipo": "contacto",
            "titulo": "Unai Sordo",
            "contenido": "**Secretario general de CCOO** (nota +7/10) — Tándem sindical UGT-CCOO.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "unai-sordo",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0019-ap-01-it-01",
            "apartado_id": "pod-0019-ap-01",
            "tipo": "contacto",
            "titulo": "Yolanda Díaz",
            "contenido": "**Ministra de Trabajo** (nota +6/10) — Aliada en la agenda laboral.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "yolanda-diaz",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0019-ap-01-it-02",
            "apartado_id": "pod-0019-ap-01",
            "tipo": "contacto",
            "titulo": "unai-sordo",
            "contenido": "**Aliado sindical (CCOO)** (nota +6/10) — UGT y CCOO actúan en bloque frente a la patronal en el diálogo social, aunque compiten por la afiliación y la representatividad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0019-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0019-ap-02-it-00",
            "apartado_id": "pod-0019-ap-02",
            "tipo": "documento",
            "titulo": "UGT",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.ugt.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0019-ap-03",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0019-ap-03-it-00",
            "apartado_id": "pod-0019-ap-03",
            "tipo": "dato",
            "titulo": "Agenda sindical",
            "contenido": "Defiende la subida del SMI, la reducción de jornada y el blindaje de las pensiones. Firma los grandes acuerdos del diálogo social, aunque tensa la cuerda con la patronal cuando lo cree necesario.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "smi",
              "jornada",
              "pensiones"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0019-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0019-ap-04-it-00",
            "apartado_id": "pod-0019-ap-04",
            "tipo": "evento",
            "titulo": "Sindicalismo en Cataluña",
            "contenido": "Desarrolló su carrera sindical en Cataluña, llegando a dirigir la UGT catalana, con un perfil forjado en la negociación colectiva y la representación de los trabajadores.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0019-ap-04-it-01",
            "apartado_id": "pod-0019-ap-04",
            "tipo": "evento",
            "titulo": "Secretario general de UGT",
            "contenido": "Fue elegido secretario general de UGT en 2016, sucediendo a Cándido Méndez, con el reto de revitalizar el sindicato tras los años de crisis y de causas judiciales heredadas.",
            "fecha": "2016-03-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0019-ap-04-it-02",
            "apartado_id": "pod-0019-ap-04",
            "tipo": "evento",
            "titulo": "Diálogo social y acuerdos",
            "contenido": "Ha participado en los grandes acuerdos del diálogo social del Gobierno de coalición —reforma laboral, salario mínimo, pensiones—, alternando la firma de pactos con la presión y la movilización.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0019-ap-04-it-03",
            "apartado_id": "pod-0019-ap-04",
            "tipo": "evento",
            "titulo": "Voz de los trabajadores",
            "contenido": "Reivindica el reparto de los beneficios empresariales, la reducción de la jornada laboral y la mejora de los salarios como ejes de su acción sindical en un contexto de inflación y debate sobre la vivienda.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0020",
    "slug": "francina-armengol",
    "nombre_completo": "Francesca \"Francina\" Armengol Socías",
    "alias": "Francina Armengol",
    "cargo_actual": "Presidenta del Congreso de los Diputados",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Política del PSOE (PSIB). Presidenta del Congreso de los Diputados desde 2023. Anteriormente presidenta del Gobierno de las Islas Baleares (2015-2023). Tercera autoridad del Estado.",
    "tags": [
      "politico",
      "psoe",
      "congreso",
      "baleares"
    ],
    "fuente_principal": "https://www.congreso.es",
    "apartados": [
      {
        "id": "pod-0020-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0020-ap-00-it-00",
            "apartado_id": "pod-0020-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Francesca «Francina» Armengol Socías (Inca, Mallorca, 1971) es presidenta del Congreso de los Diputados desde 2023, la tercera autoridad del Estado. Farmacéutica de formación y dirigente del PSIB-PSOE, fue presidenta del Govern de las Islas Baleares durante ocho años antes de presidir la Cámara baja en una legislatura especialmente tensa y fragmentada.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0020-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0020-ap-01-it-00",
            "apartado_id": "pod-0020-ap-01",
            "tipo": "evento",
            "titulo": "De la farmacia a la política balear",
            "contenido": "Farmacéutica de profesión, inició su carrera política en el socialismo balear, presidiendo el Consell de Mallorca antes de liderar el PSIB-PSOE.",
            "fecha": "2007-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0020-ap-01-it-01",
            "apartado_id": "pod-0020-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta del Govern balear",
            "contenido": "Fue presidenta del Govern de las Islas Baleares entre 2015 y 2023, gobernando en coalición con la izquierda y los nacionalistas, con políticas sociales y de defensa del catalán y del territorio.",
            "fecha": "2015-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0020-ap-01-it-02",
            "apartado_id": "pod-0020-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta del Congreso",
            "contenido": "Tras las elecciones de 2023 fue elegida presidenta del Congreso de los Diputados con el apoyo de los socios de investidura de Pedro Sánchez, dirigiendo una Cámara muy fragmentada y polarizada y aplicando medidas como el uso de las lenguas cooficiales.",
            "fecha": "2023-08-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0020-ap-01-it-03",
            "apartado_id": "pod-0020-ap-01",
            "tipo": "evento",
            "titulo": "Tercera autoridad del Estado",
            "contenido": "Como presidenta del Congreso ocupa la tercera magistratura del Estado, por detrás del Rey y del presidente del Gobierno, con un papel clave en la ordenación de los debates, la tramitación de las leyes y la representación institucional de la Cámara.",
            "fecha": "2023-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0020-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0020-ap-02-it-00",
            "apartado_id": "pod-0020-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +7/10) — Aliada leal; su elección selló apoyos de investidura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0020-ap-02-it-01",
            "apartado_id": "pod-0020-ap-02",
            "tipo": "contacto",
            "titulo": "Junts / ERC",
            "contenido": "**Socios de investidura** (nota +3/10) — Gestiona la Mesa del Congreso con equilibrios de la mayoría plurinacional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota-+3",
              "neutral"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0020-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0020-ap-03-it-00",
            "apartado_id": "pod-0020-ap-03",
            "tipo": "documento",
            "titulo": "Congreso",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.congreso.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0021",
    "slug": "luis-arguello",
    "nombre_completo": "Luis Javier Argüello García",
    "alias": "Luis Argüello",
    "cargo_actual": "Presidente de la Conferencia Episcopal Española y arzobispo de Valladolid",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Eclesiástico. Arzobispo de Valladolid y presidente de la Conferencia Episcopal Española (CEE) desde 2024. Voz de la Iglesia católica española ante el Estado y la sociedad.",
    "tags": [
      "iglesia",
      "religion",
      "conferencia-episcopal"
    ],
    "fuente_principal": "https://www.conferenciaepiscopal.es",
    "apartados": [
      {
        "id": "pod-0021-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0021-ap-00-it-00",
            "apartado_id": "pod-0021-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Luis Javier Argüello García (Meneses de Campos, Palencia, 1953) es presidente de la Conferencia Episcopal Española y arzobispo de Valladolid. Doctor en Teología y con formación jurídica, ejerció como abogado antes de ordenarse sacerdote, ya entrado en la madurez. Sucedió al cardenal Juan José Omella al frente del episcopado español en 2024, convirtiéndose en la principal voz institucional de la Iglesia católica en España y en su interlocutor de referencia ante el Gobierno, en asuntos que van desde la respuesta a los abusos y la inmigración hasta la enseñanza de la religión, la financiación de la Iglesia o los debates sobre el aborto y la eutanasia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0021-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0021-ap-01-it-00",
            "apartado_id": "pod-0021-ap-01",
            "tipo": "dato",
            "titulo": "Posición pública",
            "contenido": "Voz de la Iglesia en debates sobre familia, educación, inmigración y memoria histórica. Interlocución con el Estado sobre financiación y enseñanza religiosa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "iglesia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0021-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0021-ap-02-it-00",
            "apartado_id": "pod-0021-ap-02",
            "tipo": "contacto",
            "titulo": "Vaticano",
            "contenido": "**Santa Sede** (nota +6/10) — Jerarquía eclesiástica; nombrado en sintonía con Roma.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vaticano",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0021-ap-02-it-01",
            "apartado_id": "pod-0021-ap-02",
            "tipo": "contacto",
            "titulo": "Gobierno de España",
            "contenido": "**Estado** (nota -2/10) — Interlocución institucional con tensiones por laicidad, educación y memoria histórica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota--2",
              "neutral"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0021-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0021-ap-03-it-00",
            "apartado_id": "pod-0021-ap-03",
            "tipo": "documento",
            "titulo": "Conferencia Episcopal",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.conferenciaepiscopal.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0021-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0021-ap-04-it-00",
            "apartado_id": "pod-0021-ap-04",
            "tipo": "evento",
            "titulo": "Del derecho al sacerdocio",
            "contenido": "Ejerció como abogado antes de ingresar en el seminario y ordenarse sacerdote, combinando después el ministerio pastoral con su formación jurídica y teológica.",
            "fecha": "1980-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0021-ap-04-it-01",
            "apartado_id": "pod-0021-ap-04",
            "tipo": "evento",
            "titulo": "Obispo y secretario de la CEE",
            "contenido": "Fue nombrado obispo auxiliar de Valladolid y secretario general y portavoz de la Conferencia Episcopal Española, ejerciendo de voz pública del episcopado.",
            "fecha": "2018-03-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0021-ap-04-it-02",
            "apartado_id": "pod-0021-ap-04",
            "tipo": "evento",
            "titulo": "Arzobispo de Valladolid",
            "contenido": "Fue nombrado arzobispo de Valladolid, consolidando su peso en la jerarquía de la Iglesia española.",
            "fecha": "2022-05-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0021-ap-04-it-03",
            "apartado_id": "pod-0021-ap-04",
            "tipo": "evento",
            "titulo": "Presidente de la Conferencia Episcopal",
            "contenido": "En 2024 fue elegido presidente de la Conferencia Episcopal Española, sucediendo al cardenal Omella, al frente de la institución en asuntos como los abusos, la inmigración, la educación o la relación con el Gobierno.",
            "fecha": "2024-03-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0022",
    "slug": "felipe-vi",
    "nombre_completo": "Felipe VI de Borbón y Grecia",
    "alias": "Felipe VI",
    "cargo_actual": "Rey de España · Jefe del Estado",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Jefe del Estado desde junio de 2014, tras la abdicación de su padre Juan Carlos I. Símbolo de la unidad y permanencia del Estado, con un papel arbitral y moderador del funcionamiento de las instituciones.",
    "tags": [
      "casa-real",
      "monarquia",
      "jefe-estado"
    ],
    "fuente_principal": "https://www.casareal.es",
    "apartados": [
      {
        "id": "pod-0022-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0022-ap-00-it-00",
            "apartado_id": "pod-0022-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Felipe VI (Felipe Juan Pablo Alfonso de Todos los Santos de Borbón y Grecia), nacido en Madrid el 30 de enero de 1968, es el Rey de España y Jefe del Estado desde el 19 de junio de 2014. Encarna la Corona como institución arbitral y moderadora dentro de la monarquía parlamentaria que diseña la Constitución de 1978.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0022-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0022-ap-01-it-00",
            "apartado_id": "pod-0022-ap-01",
            "tipo": "evento",
            "titulo": "Formación e infancia como heredero",
            "contenido": "Hijo de Juan Carlos I y Sofía de Grecia, fue educado desde niño para reinar. Estudió en el Colegio Santa María de los Rosales, cursó un año de bachillerato en Canadá (Lakefield College) y completó la triple formación militar en las academias de tierra (Zaragoza), mar (Marín) y aire (San Javier). Se licenció en Derecho por la Universidad Autónoma de Madrid y obtuvo un máster en Relaciones Internacionales en la Universidad de Georgetown (EE. UU.).",
            "fecha": "1968-01-30",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0022-ap-01-it-01",
            "apartado_id": "pod-0022-ap-01",
            "tipo": "evento",
            "titulo": "Príncipe de Asturias",
            "contenido": "Durante casi cuatro décadas ejerció como Príncipe de Asturias, asumiendo una intensa agenda de representación institucional, presidencia de fundaciones y misiones diplomáticas, especialmente en Iberoamérica. En 2004 contrajo matrimonio con la periodista Letizia Ortiz, con quien tiene dos hijas: la Princesa Leonor (2005), heredera de la Corona, y la Infanta Sofía (2007).",
            "fecha": "2004-05-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0022-ap-01-it-02",
            "apartado_id": "pod-0022-ap-01",
            "tipo": "evento",
            "titulo": "Proclamación y 'monarquía renovada'",
            "contenido": "Tras la abdicación de su padre, fue proclamado rey ante las Cortes el 19 de junio de 2014, en un momento de fuerte desprestigio de la institución por los escándalos de los últimos años del reinado anterior. Desde el primer día planteó una Corona más austera y transparente: redujo el presupuesto y su asignación, publicó las cuentas de la Casa del Rey, aprobó un código de conducta y limitó los regalos y los viajes.",
            "fecha": "2014-06-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0022-ap-01-it-03",
            "apartado_id": "pod-0022-ap-01",
            "tipo": "evento",
            "titulo": "El discurso del 3 de octubre y la crisis catalana",
            "contenido": "El momento más delicado de su reinado llegó con el desafío independentista. El 3 de octubre de 2017, dos días después del referéndum ilegal del 1-O, pronunció un durísimo mensaje televisado en defensa del orden constitucional. La intervención le granjeó el respaldo del constitucionalismo y la animadversión del independentismo y de parte de la izquierda, que le reprocharon no apelar al diálogo.",
            "fecha": "2017-10-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          },
          {
            "id": "pod-0022-ap-01-it-04",
            "apartado_id": "pod-0022-ap-01",
            "tipo": "evento",
            "titulo": "Ruptura con su padre",
            "contenido": "En 2020, ante la acumulación de informaciones sobre los negocios de Juan Carlos I, Felipe VI renunció a la herencia que pudiera corresponderle de su padre y le retiró la asignación pública. El rey emérito se trasladó a Abu Dabi. La maniobra buscó blindar a la Corona reinante frente a los escándalos del anterior titular, en una operación de distanciamiento sin precedentes en la historia reciente.",
            "fecha": "2020-03-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 4
          },
          {
            "id": "pod-0022-ap-01-it-05",
            "apartado_id": "pod-0022-ap-01",
            "tipo": "evento",
            "titulo": "Papel arbitral",
            "contenido": "Como Jefe del Estado ejerce funciones tasadas: sanciona las leyes, convoca elecciones, propone candidato a la investidura tras consultar a los partidos y ejerce la representación exterior del Estado. En un Parlamento cada vez más fragmentado, sus rondas de consultas y la propuesta de candidato han ganado peso político y visibilidad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 5
          }
        ]
      },
      {
        "id": "pod-0022-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0022-ap-02-it-00",
            "apartado_id": "pod-0022-ap-02",
            "tipo": "dato",
            "titulo": "Rol constitucional",
            "contenido": "Arbitra y modera el funcionamiento de las instituciones (art. 56 CE). Neutralidad política; firma y promulga leyes, propone candidato a la investidura, manda simbólicamente las FF.AA.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "constitucional"
            ],
            "orden": 0
          },
          {
            "id": "pod-0022-ap-02-it-01",
            "apartado_id": "pod-0022-ap-02",
            "tipo": "dato",
            "titulo": "Neutralidad y Constitución",
            "contenido": "Su línea es la defensa estricta de la Constitución y la neutralidad partidista. Evita el comentario político y concentra su mensaje en la unidad, la convivencia y la proyección internacional de España. Su legitimidad depende de mantenerse por encima de la refriega partidista en un país profundamente polarizado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "constitucion",
              "neutralidad"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0022-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0022-ap-03-it-00",
            "apartado_id": "pod-0022-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +3/10) — Relación institucional con el jefe del Ejecutivo (despachos, refrendo).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+3",
              "neutral"
            ],
            "orden": 0
          },
          {
            "id": "pod-0022-ap-03-it-01",
            "apartado_id": "pod-0022-ap-03",
            "tipo": "contacto",
            "titulo": "Juan Carlos I",
            "contenido": "**Rey emérito, su padre** (nota -2/10) — Relación marcada por la distancia institucional tras los escándalos del emérito y su salida a Abu Dabi.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "juan-carlos",
              "nota--2",
              "tension"
            ],
            "orden": 1
          },
          {
            "id": "pod-0022-ap-03-it-02",
            "apartado_id": "pod-0022-ap-03",
            "tipo": "contacto",
            "titulo": "Leonor de Borbón",
            "contenido": "**Princesa de Asturias, su hija y heredera** (nota +9/10) — Formación militar y preparación para la sucesión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "leonor",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0022-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0022-ap-04-it-00",
            "apartado_id": "pod-0022-ap-04",
            "tipo": "documento",
            "titulo": "Casa Real",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.casareal.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0022-ap-05",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0022-ap-05-it-00",
            "apartado_id": "pod-0022-ap-05",
            "tipo": "controversia",
            "titulo": "La sombra de Juan Carlos I",
            "contenido": "El principal riesgo reputacional de su reinado son los escándalos de su padre, que arrastran a la institución pese a la separación formal. La izquierda y el independentismo cuestionan abiertamente la monarquía; Felipe VI responde con ejemplaridad y transparencia. La República figura en la agenda de socios del Gobierno, lo que mantiene el debate abierto.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "monarquia",
              "republica"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0023",
    "slug": "letizia-ortiz",
    "nombre_completo": "Letizia Ortiz Rocasolano",
    "alias": "Reina Letizia",
    "cargo_actual": "Reina de España",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista. Reina consorte de España desde 2014. Anteriormente presentadora de informativos en TVE y CNN+. Centra su agenda en salud, educación, cultura, nutrición y enfermedades raras.",
    "tags": [
      "casa-real",
      "monarquia",
      "ex-periodista"
    ],
    "fuente_principal": "https://www.casareal.es",
    "apartados": [
      {
        "id": "pod-0023-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0023-ap-00-it-00",
            "apartado_id": "pod-0023-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Letizia Ortiz Rocasolano (Oviedo, 1972) es la Reina de España, esposa del rey Felipe VI. Antes de su matrimonio fue una periodista de prestigio, presentadora de los informativos de TVE y CNN+, lo que la convirtió en la primera reina consorte de la democracia procedente de una familia no aristocrática y con una carrera profesional propia. Como reina, ejerce una intensa agenda institucional centrada en la educación, la salud, la cultura y las causas sociales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0023-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0023-ap-01-it-00",
            "apartado_id": "pod-0023-ap-01",
            "tipo": "contacto",
            "titulo": "Felipe VI",
            "contenido": "**Rey de España, su esposo** (nota +9/10) — Matrimonio desde 2004.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "felipe-vi",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0023-ap-01-it-01",
            "apartado_id": "pod-0023-ap-01",
            "tipo": "contacto",
            "titulo": "Agenda social",
            "contenido": "**Fundaciones (FAD, FEDER, cáncer, nutrición)** (nota +6/10) — Patronazgos y presidencias de honor.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0023-ap-01-it-02",
            "apartado_id": "pod-0023-ap-01",
            "tipo": "contacto",
            "titulo": "felipe-vi",
            "contenido": "**Su esposo, el Rey** (nota +9/10) — Forma con Felipe VI el núcleo de la Casa Real; comparten la agenda institucional y la estrategia de modernización de la Corona.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0023-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0023-ap-02-it-00",
            "apartado_id": "pod-0023-ap-02",
            "tipo": "documento",
            "titulo": "Casa Real",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.casareal.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0023-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0023-ap-03-it-00",
            "apartado_id": "pod-0023-ap-03",
            "tipo": "evento",
            "titulo": "Periodista de televisión",
            "contenido": "Licenciada en Periodismo y con experiencia en agencias y diarios, se consolidó como presentadora de informativos en CNN+ y, sobre todo, en Televisión Española, donde condujo el Telediario en el horario de máxima audiencia.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0023-ap-03-it-01",
            "apartado_id": "pod-0023-ap-03",
            "tipo": "evento",
            "titulo": "Boda con el Príncipe de Asturias",
            "contenido": "En 2004 contrajo matrimonio con el entonces príncipe Felipe, en una boda de enorme repercusión, convirtiéndose en princesa de Asturias. La pareja tiene dos hijas: Leonor, heredera de la Corona, y Sofía.",
            "fecha": "2004-05-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0023-ap-03-it-02",
            "apartado_id": "pod-0023-ap-03",
            "tipo": "evento",
            "titulo": "Reina de España",
            "contenido": "Tras la proclamación de Felipe VI en 2014, asumió el papel de reina consorte, con una agenda propia centrada en la educación, la formación profesional, la investigación, la salud (nutrición, cáncer, enfermedades raras) y la cultura.",
            "fecha": "2014-06-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0023-ap-03-it-03",
            "apartado_id": "pod-0023-ap-03",
            "tipo": "evento",
            "titulo": "Imagen de una monarquía renovada",
            "contenido": "Su perfil profesional y su estilo han contribuido a la imagen de una monarquía más cercana y moderna, aunque sometida al escrutinio mediático propio de la institución y a las tensiones de la Corona en la España contemporánea.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0024",
    "slug": "juan-carlos-i",
    "nombre_completo": "Juan Carlos I de Borbón",
    "alias": "Rey emérito",
    "cargo_actual": "Rey emérito de España",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Rey de España entre 1975 y 2014, figura clave de la Transición democrática. Abdicó en 2014 en favor de su hijo Felipe VI. Reside en Abu Dabi desde 2020 tras investigaciones sobre su patrimonio en el extranjero, archivadas sin imputación formal.",
    "tags": [
      "casa-real",
      "monarquia",
      "emerito"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Juan_Carlos_I",
    "apartados": [
      {
        "id": "pod-0024-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0024-ap-00-it-00",
            "apartado_id": "pod-0024-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Juan Carlos I de Borbón (Roma, 5 de enero de 1938) fue Rey de España entre 1975 y 2014. Figura central de la Transición a la democracia, su reinado pasó del máximo prestigio —por su papel en el 23-F— al desprestigio de sus últimos años por escándalos económicos y personales que acabaron en su abdicación y posterior traslado al extranjero.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0024-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0024-ap-01-it-00",
            "apartado_id": "pod-0024-ap-01",
            "tipo": "evento",
            "titulo": "Exilio, designación y formación",
            "contenido": "Nieto de Alfonso XIII, nació en el exilio en Roma. Llegó a España en 1948 por un acuerdo entre su padre, Don Juan, y Franco, que se reservó su educación. Se formó en las tres academias militares y en la Universidad de Madrid. En 1969 Franco lo designó sucesor a título de Rey, saltándose la línea dinástica de su padre, lo que generó tensiones en la propia familia.",
            "fecha": "1969-07-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0024-ap-01-it-01",
            "apartado_id": "pod-0024-ap-01",
            "tipo": "evento",
            "titulo": "Rey y motor de la Transición",
            "contenido": "Proclamado rey el 22 de noviembre de 1975, dos días después de la muerte de Franco, sorprendió al desmontar el aparato franquista desde dentro: nombró presidente a Adolfo Suárez, impulsó la Ley para la Reforma Política y respaldó la legalización de los partidos y la Constitución de 1978. Se convirtió en pieza clave del paso pacífico de la dictadura a la democracia.",
            "fecha": "1975-11-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0024-ap-01-it-02",
            "apartado_id": "pod-0024-ap-01",
            "tipo": "evento",
            "titulo": "El 23-F: la cumbre de su prestigio",
            "contenido": "La noche del 23 de febrero de 1981, durante el intento de golpe de Estado, su mensaje televisado en defensa del orden constitucional fue decisivo para abortar la asonada. Aquel episodio consolidó su imagen de garante de la democracia y le dio un capital político y popular que mantuvo durante décadas, dentro y fuera de España.",
            "fecha": "1981-02-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0024-ap-01-it-03",
            "apartado_id": "pod-0024-ap-01",
            "tipo": "evento",
            "titulo": "Reinado y diplomacia económica",
            "contenido": "Durante los años de expansión ejerció una intensa diplomacia al servicio de la internacionalización de la empresa española, especialmente en el mundo árabe y en Latinoamérica. Gozó de enorme popularidad y prestigio internacional, simbolizado en episodios como su célebre '¿Por qué no te callas?' a Hugo Chávez en 2007.",
            "fecha": "2007-11-10",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          },
          {
            "id": "pod-0024-ap-01-it-04",
            "apartado_id": "pod-0024-ap-01",
            "tipo": "evento",
            "titulo": "Declive: Botsuana y los escándalos",
            "contenido": "Su imagen se quebró en abril de 2012 con una cacería de elefantes en Botsuana, conocida mientras España sufría la crisis. A partir de ahí se sucedieron las informaciones sobre comisiones, fundaciones opacas (Zagatka), tarjetas opacas y su relación con Corinna Larsen, además del caso Nóos que afectó a su yerno. El desprestigio precipitó su abdicación el 18 de junio de 2014.",
            "fecha": "2012-04-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 4
          },
          {
            "id": "pod-0024-ap-01-it-05",
            "apartado_id": "pod-0024-ap-01",
            "tipo": "evento",
            "titulo": "Abdicación, exilio y causas",
            "contenido": "Tras abdicar en su hijo, los escándalos no cesaron. En agosto de 2020 se trasladó a Abu Dabi en medio de investigaciones en España y Suiza. Regularizó varias cantidades ante Hacienda. La Fiscalía archivó las causas por prescripción, la inviolabilidad como jefe del Estado y las regularizaciones, sin que llegara a haber juicio. Rige, por tanto, la presunción de inocencia respecto de los hechos no enjuiciados, aunque el daño reputacional fue profundo.",
            "fecha": "2020-08-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 5
          }
        ]
      },
      {
        "id": "pod-0024-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0024-ap-02-it-00",
            "apartado_id": "pod-0024-ap-02",
            "tipo": "contacto",
            "titulo": "Felipe VI",
            "contenido": "**Rey de España, su hijo** (nota -2/10) — La Casa Real tomó distancia institucional tras los escándalos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "felipe-vi",
              "nota--2",
              "tension"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0024-ap-03",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0024-ap-03-it-00",
            "apartado_id": "pod-0024-ap-03",
            "tipo": "evento",
            "titulo": "Investigaciones patrimoniales",
            "contenido": "Investigado en Suiza y España por fortuna en el extranjero y donaciones. Las causas en España fueron archivadas (inviolabilidad como jefe de Estado y regularizaciones fiscales). Sin imputación formal firme.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "patrimonio"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0024-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0024-ap-04-it-00",
            "apartado_id": "pod-0024-ap-04",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Juan_Carlos_I",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0024-ap-05",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0024-ap-05-it-00",
            "apartado_id": "pod-0024-ap-05",
            "tipo": "dato",
            "titulo": "De símbolo de consenso a figura divisiva",
            "contenido": "Pasó de ser un símbolo de unidad y consenso democrático a una figura que divide a la opinión pública. Para sus defensores, su papel en la Transición y el 23-F es indiscutible; para sus críticos, los escándalos finales empañan ese legado y alimentan el debate sobre la monarquía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "transicion",
              "legado"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0025",
    "slug": "begona-gomez",
    "nombre_completo": "Begoña Gómez Fernández",
    "alias": "Begoña Gómez",
    "cargo_actual": "Directora de cátedra (esposa de Pedro Sánchez)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Profesional del ámbito de la dirección de fundaciones y la universidad. Esposa del presidente del Gobierno Pedro Sánchez. Investigada desde 2024 en una causa por presuntos delitos vinculados a su actividad profesional; rige la presunción de inocencia.",
    "tags": [
      "actor",
      "investigada",
      "entorno-gobierno"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Bego%C3%B1a_G%C3%B3mez",
    "apartados": [
      {
        "id": "pod-0025-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0025-ap-00-it-00",
            "apartado_id": "pod-0025-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Begoña Gómez Fernández (Bilbao, 1975) es la esposa del presidente del Gobierno, Pedro Sánchez. Profesional del ámbito de la consultoría, el marketing y la captación de fondos (fundraising) para entidades, dirigió una cátedra extraordinaria en la Universidad Complutense de Madrid centrada en la transformación social. Desde 2024 es objeto de una investigación judicial abierta en Madrid relacionada con su actividad profesional; la causa sigue su curso y rige plenamente la presunción de inocencia, sin que por el momento existan hechos probados en su contra.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0025-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0025-ap-01-it-00",
            "apartado_id": "pod-0025-ap-01",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno, su esposo** (nota +9/10) — Matrimonio; su situación judicial impacta directamente en el Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0025-ap-01-it-01",
            "apartado_id": "pod-0025-ap-01",
            "tipo": "contacto",
            "titulo": "Juez Peinado",
            "contenido": "**Instructor de su causa** (nota -7/10) — Investiga sus actividades; rige la presunción de inocencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "peinado",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0025-ap-02",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0025-ap-02-it-00",
            "apartado_id": "pod-0025-ap-02",
            "tipo": "evento",
            "titulo": "Causa judicial",
            "contenido": "Investigada en una causa abierta en 2024 por presuntos tráfico de influencias y corrupción en torno a su actividad profesional. El Gobierno y el PSOE denuncian 'lawfare'; la oposición exige responsabilidades. Presunción de inocencia.",
            "fecha": "2024-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "judicial",
              "presuncion-inocencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0025-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0025-ap-03-it-00",
            "apartado_id": "pod-0025-ap-03",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Bego%C3%B1a_G%C3%B3mez",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0025-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0025-ap-04-it-00",
            "apartado_id": "pod-0025-ap-04",
            "tipo": "evento",
            "titulo": "Trayectoria profesional",
            "contenido": "Con formación en marketing y dirección, desarrolló su carrera en la consultoría, la captación de fondos para entidades y la responsabilidad social corporativa en distintas organizaciones.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0025-ap-04-it-01",
            "apartado_id": "pod-0025-ap-04",
            "tipo": "evento",
            "titulo": "Cátedra en la Universidad Complutense",
            "contenido": "Dirigió una cátedra extraordinaria de transformación social competitiva en la Universidad Complutense de Madrid, vinculada a la captación de patrocinios empresariales.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0025-ap-04-it-02",
            "apartado_id": "pod-0025-ap-04",
            "tipo": "evento",
            "titulo": "Esposa del presidente del Gobierno",
            "contenido": "Como cónyuge de Pedro Sánchez, ha mantenido un perfil discreto, aunque su actividad profesional y sus relaciones institucionales han sido objeto de creciente atención pública y política.",
            "fecha": "2018-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0025-ap-04-it-03",
            "apartado_id": "pod-0025-ap-04",
            "tipo": "evento",
            "titulo": "Investigación judicial",
            "contenido": "Desde 2024 es investigada en una causa instruida en Madrid por presuntos delitos relacionados con su actividad profesional y la cátedra; la investigación sigue su curso y rige plenamente la presunción de inocencia.",
            "fecha": "2024-04-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0026",
    "slug": "miguel-angel-rodriguez",
    "nombre_completo": "Miguel Ángel Rodríguez",
    "alias": "MAR",
    "cargo_actual": "Jefe de gabinete de Isabel Díaz Ayuso",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Asesor de comunicación. Jefe de gabinete y estratega de comunicación de Isabel Díaz Ayuso en la Comunidad de Madrid. Ex secretario de Estado de Comunicación con Aznar. Figura central en la guerra mediática contra el Gobierno.",
    "tags": [
      "asesor",
      "comunicacion",
      "pp",
      "madrid"
    ],
    "fuente_principal": "https://www.comunidad.madrid",
    "apartados": [
      {
        "id": "pod-0026-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0026-ap-00-it-00",
            "apartado_id": "pod-0026-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Miguel Ángel Rodríguez (Madrid, 1956), conocido como 'MAR', es jefe de gabinete y principal asesor de comunicación de Isabel Díaz Ayuso, presidenta de la Comunidad de Madrid. Veterano del oficio, fue secretario de Estado de Comunicación y portavoz con José María Aznar, y es considerado uno de los estrategas de comunicación política más influyentes y combativos de la derecha española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0026-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0026-ap-01-it-00",
            "apartado_id": "pod-0026-ap-01",
            "tipo": "contacto",
            "titulo": "Isabel Díaz Ayuso",
            "contenido": "**Presidenta de Madrid** (nota +9/10) — Su jefa; estratega de su comunicación y ataque político.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ayuso",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0026-ap-01-it-01",
            "apartado_id": "pod-0026-ap-01",
            "tipo": "contacto",
            "titulo": "Álvaro García Ortiz",
            "contenido": "**Fiscal General** (nota -8/10) — Conflicto directo: pieza clave en el caso de la filtración sobre la pareja de Ayuso.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "garcia-ortiz",
              "nota--8",
              "conflicto"
            ],
            "orden": 1
          },
          {
            "id": "pod-0026-ap-01-it-02",
            "apartado_id": "pod-0026-ap-01",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -8/10) — Diana principal de su estrategia comunicativa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota--8",
              "conflicto"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0026-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0026-ap-02-it-00",
            "apartado_id": "pod-0026-ap-02",
            "tipo": "documento",
            "titulo": "Comunidad de Madrid",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.comunidad.madrid",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0026-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0026-ap-03-it-00",
            "apartado_id": "pod-0026-ap-03",
            "tipo": "evento",
            "titulo": "Portavoz con Aznar",
            "contenido": "Periodista de formación, fue secretario de Estado de Comunicación y portavoz del Gobierno en la primera etapa de José María Aznar, ganándose fama de duro estratega de la comunicación.",
            "fecha": "1996-05-06",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0026-ap-03-it-01",
            "apartado_id": "pod-0026-ap-03",
            "tipo": "evento",
            "titulo": "Consultoría y comunicación",
            "contenido": "Tras dejar la política institucional, desarrolló su actividad en la consultoría de comunicación y los medios, manteniéndose como una voz influyente en la derecha mediática.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0026-ap-03-it-02",
            "apartado_id": "pod-0026-ap-03",
            "tipo": "evento",
            "titulo": "Jefe de gabinete de Ayuso",
            "contenido": "Se incorporó al equipo de Isabel Díaz Ayuso como jefe de gabinete, convirtiéndose en uno de los principales arquitectos de su estrategia política y comunicativa.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0026-ap-03-it-03",
            "apartado_id": "pod-0026-ap-03",
            "tipo": "evento",
            "titulo": "Polémicas de comunicación",
            "contenido": "Su papel ha estado en el foco por episodios de fuerte confrontación política y mediática, en particular en torno al caso de la pareja de Ayuso y la difusión de informaciones, asuntos sobre los que rige la presunción de inocencia.",
            "fecha": "2024-03-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0027",
    "slug": "jose-maria-aznar",
    "nombre_completo": "José María Aznar López",
    "alias": "Aznar",
    "cargo_actual": "Expresidente del Gobierno · presidente de FAES",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidente del Gobierno de España (1996-2004) por el PP. Hoy preside la Fundación FAES, el principal think tank de la derecha española, y mantiene una influencia notable en el ala más conservadora y atlantista del PP.",
    "tags": [
      "ex-politico",
      "expresidente",
      "pp",
      "think-tank",
      "faes"
    ],
    "fuente_principal": "https://fundacionfaes.org",
    "apartados": [
      {
        "id": "pod-0027-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0027-ap-00-it-00",
            "apartado_id": "pod-0027-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José María Aznar López (Madrid, 25 de febrero de 1953) fue presidente del Gobierno entre 1996 y 2004 por el Partido Popular. Inspector de Hacienda de formación, lideró la consolidación del centro-derecha español, el saneamiento económico y la entrada en el euro, y hoy mantiene una influencia notable desde la Fundación FAES.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0027-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0027-ap-01-it-00",
            "apartado_id": "pod-0027-ap-01",
            "tipo": "evento",
            "titulo": "De inspector de Hacienda a Castilla y León",
            "contenido": "Inspector de Hacienda del Estado, dio el salto a la política en Alianza Popular. Fue presidente de la Junta de Castilla y León (1987-1989) antes de asumir el liderazgo nacional del partido refundado como Partido Popular.",
            "fecha": "1987-07-26",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0027-ap-01-it-01",
            "apartado_id": "pod-0027-ap-01",
            "tipo": "evento",
            "titulo": "Líder de la oposición y atentado de ETA",
            "contenido": "Designado sucesor de Manuel Fraga al frente del PP en 1990, modernizó y centró el partido. En 1995 sobrevivió a un atentado de ETA con coche bomba en Madrid, episodio que marcó su trayectoria y su firmeza antiterrorista.",
            "fecha": "1990-09-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0027-ap-01-it-02",
            "apartado_id": "pod-0027-ap-01",
            "tipo": "evento",
            "titulo": "Presidente del Gobierno",
            "contenido": "Ganó las elecciones de 1996 y gobernó primero en minoría con apoyo de los nacionalistas catalanes y vascos. El saneamiento de las cuentas y el crecimiento permitieron a España entrar en el euro. En 2000 revalidó con mayoría absoluta y endureció su perfil.",
            "fecha": "1996-05-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0027-ap-01-it-03",
            "apartado_id": "pod-0027-ap-01",
            "tipo": "evento",
            "titulo": "Giro atlantista y la foto de las Azores",
            "contenido": "En su segundo mandato dio un marcado giro atlantista. Su apoyo a la invasión de Irak en 2003, simbolizado en la cumbre de las Azores junto a Bush y Blair, fue contestado por amplias movilizaciones y dividió al país.",
            "fecha": "2003-03-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          },
          {
            "id": "pod-0027-ap-01-it-04",
            "apartado_id": "pod-0027-ap-01",
            "tipo": "evento",
            "titulo": "El 11-M y la salida del poder",
            "contenido": "Los atentados yihadistas del 11 de marzo de 2004, tres días antes de las elecciones, y la gestión informativa de la autoría marcaron el final de su etapa. El PP, que no se presentaba con Aznar como candidato (cumplió su palabra de no agotar un tercer mandato), perdió frente a Zapatero.",
            "fecha": "2004-03-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 4
          },
          {
            "id": "pod-0027-ap-01-it-05",
            "apartado_id": "pod-0027-ap-01",
            "tipo": "evento",
            "titulo": "FAES y la influencia en la derecha",
            "contenido": "Desde la Fundación FAES se ha convertido en el referente ideológico del ala más conservadora y atlantista del PP. Mantiene una influencia notable y ejerce de voz crítica tanto con el Gobierno de Sánchez como, en ocasiones, con la estrategia de moderación de Feijóo.",
            "fecha": "2004-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 5
          }
        ]
      },
      {
        "id": "pod-0027-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0027-ap-02-it-00",
            "apartado_id": "pod-0027-ap-02",
            "tipo": "dato",
            "titulo": "Línea ideológica",
            "contenido": "Atlantista, liberal en lo económico, firme contra el nacionalismo y el sanchismo. Crítico tanto con Sánchez como, en ocasiones, con la moderación de Feijóo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "atlantismo",
              "liberalismo"
            ],
            "orden": 0
          },
          {
            "id": "pod-0027-ap-02-it-01",
            "apartado_id": "pod-0027-ap-02",
            "tipo": "dato",
            "titulo": "Liberal-conservadurismo atlantista",
            "contenido": "Defiende el liberalismo económico, la firmeza frente al nacionalismo y el terrorismo, y una política exterior alineada con Estados Unidos. Es una de las voces más beligerantes contra el 'sanchismo' y los pactos con el independentismo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "atlantismo",
              "liberalismo"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0027-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0027-ap-03-it-00",
            "apartado_id": "pod-0027-ap-03",
            "tipo": "contacto",
            "titulo": "Partido Popular",
            "contenido": "**Su partido** (nota +6/10) — Sigue siendo referente del ala dura; tensiones con la dirección de Feijóo por la moderación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0027-ap-03-it-01",
            "apartado_id": "pod-0027-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +3/10) — Apoyo crítico: empuja al PP hacia posiciones más duras.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "feijoo",
              "nota-+3",
              "neutral"
            ],
            "orden": 1
          },
          {
            "id": "pod-0027-ap-03-it-02",
            "apartado_id": "pod-0027-ap-03",
            "tipo": "contacto",
            "titulo": "Isabel Díaz Ayuso",
            "contenido": "**Presidenta de Madrid** (nota +6/10) — Afinidad con el ala más combativa que representa Ayuso.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ayuso",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 2
          },
          {
            "id": "pod-0027-ap-03-it-03",
            "apartado_id": "pod-0027-ap-03",
            "tipo": "contacto",
            "titulo": "Mariano Rajoy",
            "contenido": "**Sucesor en el PP** (nota +2/10) — Relación fría tras años de distancia política.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rajoy",
              "nota-+2",
              "neutral"
            ],
            "orden": 3
          },
          {
            "id": "pod-0027-ap-03-it-04",
            "apartado_id": "pod-0027-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -8/10) — Adversario frontal; FAES es usina de crítica al Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota--8",
              "conflicto"
            ],
            "orden": 4
          }
        ]
      },
      {
        "id": "pod-0027-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0027-ap-04-it-00",
            "apartado_id": "pod-0027-ap-04",
            "tipo": "documento",
            "titulo": "FAES",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://fundacionfaes.org",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0028",
    "slug": "jose-luis-rodriguez-zapatero",
    "nombre_completo": "José Luis Rodríguez Zapatero",
    "alias": "Zapatero",
    "cargo_actual": "Expresidente del Gobierno (PSOE)",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Presidente del Gobierno de España (2004-2011) por el PSOE. Impulsó derechos civiles (matrimonio igualitario, ley de dependencia) y afrontó la crisis financiera. Hoy figura influyente del PSOE, mediador internacional (Venezuela) y defensor de la política de Sánchez.",
    "tags": [
      "ex-politico",
      "expresidente",
      "psoe"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Jos%C3%A9_Luis_Rodr%C3%ADguez_Zapatero",
    "apartados": [
      {
        "id": "pod-0028-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0028-ap-00-it-00",
            "apartado_id": "pod-0028-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Luis Rodríguez Zapatero (Valladolid, 4 de agosto de 1960), 'ZP', fue presidente del Gobierno entre 2004 y 2011. Impulsó una de las agendas de derechos civiles más ambiciosas de la democracia y gobernó en la transición del boom económico a la Gran Recesión, que marcó el final de su etapa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0028-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0028-ap-01-it-00",
            "apartado_id": "pod-0028-ap-01",
            "tipo": "evento",
            "titulo": "Ascenso por 'Nueva Vía'",
            "contenido": "Diputado por León desde joven, ganó por sorpresa la secretaría general del PSOE en el año 2000 al frente de la corriente 'Nueva Vía', renovando el partido tras las derrotas frente a Aznar con un discurso de talante dialogante.",
            "fecha": "2000-07-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0028-ap-01-it-01",
            "apartado_id": "pod-0028-ap-01",
            "tipo": "evento",
            "titulo": "Llegada al poder tras el 11-M",
            "contenido": "Ganó las elecciones de marzo de 2004, celebradas tres días después de los atentados del 11-M. Una de sus primeras decisiones fue la retirada de las tropas españolas de Irak, cumpliendo su promesa electoral.",
            "fecha": "2004-04-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0028-ap-01-it-02",
            "apartado_id": "pod-0028-ap-01",
            "tipo": "evento",
            "titulo": "La agenda de derechos",
            "contenido": "Su primera legislatura desplegó una intensa agenda social y de derechos: matrimonio igualitario (2005), ley de dependencia, ley de igualdad y paridad, ley de memoria histórica, ampliación del aborto y negociación —fallida— con ETA. Polarizó el debate público con la Iglesia y la derecha.",
            "fecha": "2005-07-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0028-ap-01-it-03",
            "apartado_id": "pod-0028-ap-01",
            "tipo": "evento",
            "titulo": "De la negación de la crisis al ajuste",
            "contenido": "Reelegido en 2008, su gestión quedó marcada por la crisis financiera global. Tras meses negando su gravedad, la presión de los mercados y de Bruselas le forzó en mayo de 2010 a un giro de ajuste sin precedentes: recorte de salarios públicos, congelación de pensiones y reforma laboral, que rompió con su electorado.",
            "fecha": "2010-05-12",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          },
          {
            "id": "pod-0028-ap-01-it-04",
            "apartado_id": "pod-0028-ap-01",
            "tipo": "evento",
            "titulo": "Salida y mediación internacional",
            "contenido": "No se presentó a la reelección. El PSOE perdió las elecciones de 2011 con Rubalcaba. Desde entonces se ha dedicado a la mediación internacional, especialmente en Venezuela, una labor que le ha valido fuertes críticas por su cercanía al chavismo.",
            "fecha": "2011-11-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 4
          }
        ]
      },
      {
        "id": "pod-0028-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0028-ap-02-it-00",
            "apartado_id": "pod-0028-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +7/10) — Apoyo público y referente de la estrategia de coalición.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0028-ap-02-it-01",
            "apartado_id": "pod-0028-ap-02",
            "tipo": "contacto",
            "titulo": "Felipe González",
            "contenido": "**Expresidente PSOE** (nota -4/10) — Relación fría: González critica el rumbo del PSOE de Sánchez, Zapatero lo respalda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "felipe-gonzalez",
              "nota--4",
              "tension"
            ],
            "orden": 1
          },
          {
            "id": "pod-0028-ap-02-it-02",
            "apartado_id": "pod-0028-ap-02",
            "tipo": "contacto",
            "titulo": "PSOE",
            "contenido": "**Su partido** (nota +6/10) — Figura del ala izquierda; respalda los pactos con la mayoría plurinacional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0028-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0028-ap-03-it-00",
            "apartado_id": "pod-0028-ap-03",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Jos%C3%A9_Luis_Rodr%C3%ADguez_Zapatero",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0028-ap-04",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0028-ap-04-it-00",
            "apartado_id": "pod-0028-ap-04",
            "tipo": "dato",
            "titulo": "Progresismo de derechos y diálogo",
            "contenido": "Su sello es el progresismo en derechos civiles y un talante dialogante, también con los nacionalismos. Sigue siendo una voz influyente en el ala izquierda del PSOE y defensor de la política de distensión territorial del actual Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derechos-civiles",
              "dialogo"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0029",
    "slug": "felipe-gonzalez",
    "nombre_completo": "Felipe González Márquez",
    "alias": "Felipe González",
    "cargo_actual": "Expresidente del Gobierno (PSOE)",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Presidente del Gobierno de España (1982-1996), el más longevo de la democracia. Figura histórica del PSOE que pilotó la entrada en la CEE y la OTAN y la modernización del país. Hoy voz crítica con la deriva del PSOE de Sánchez y sus pactos con el independentismo.",
    "tags": [
      "ex-politico",
      "expresidente",
      "psoe",
      "historico"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Felipe_Gonz%C3%A1lez",
    "apartados": [
      {
        "id": "pod-0029-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0029-ap-00-it-00",
            "apartado_id": "pod-0029-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Felipe González Márquez (Sevilla, 5 de marzo de 1942) es el presidente del Gobierno que más tiempo ha ocupado el cargo en democracia (1982-1996). Abogado laboralista y líder histórico del PSOE, simboliza la modernización de España y su plena integración en Europa, así como las luces y sombras de catorce años de poder socialista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0029-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0029-ap-01-it-00",
            "apartado_id": "pod-0029-ap-01",
            "tipo": "evento",
            "titulo": "Abogado laboralista y 'Isidoro'",
            "contenido": "Formado en Derecho en Sevilla, ejerció como abogado laboralista defendiendo a trabajadores en los últimos años del franquismo. Militó en la clandestinidad bajo el apodo de 'Isidoro' y ascendió rápidamente en un PSOE entonces dividido entre el interior y el exilio.",
            "fecha": "1965-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0029-ap-01-it-01",
            "apartado_id": "pod-0029-ap-01",
            "tipo": "evento",
            "titulo": "La refundación del PSOE",
            "contenido": "En el Congreso de Suresnes (Francia, 1974) fue elegido secretario general con el apoyo de la socialdemocracia europea. Lideró la transformación del partido: en 1979 forzó el abandono del marxismo como seña de identidad, modernizando el PSOE y haciéndolo electoralmente competitivo para gobernar.",
            "fecha": "1974-10-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0029-ap-01-it-02",
            "apartado_id": "pod-0029-ap-01",
            "tipo": "evento",
            "titulo": "La victoria de 1982 y las grandes reformas",
            "contenido": "El 28 de octubre de 1982 el PSOE arrasó con más de diez millones de votos, abriendo una etapa de mayorías absolutas. Su Gobierno acometió la reconversión industrial, la expansión del Estado del bienestar (sanidad y educación universales, pensiones), la modernización de las infraestructuras y la profesionalización de las Fuerzas Armadas.",
            "fecha": "1982-10-28",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0029-ap-01-it-03",
            "apartado_id": "pod-0029-ap-01",
            "tipo": "evento",
            "titulo": "Europa y la OTAN",
            "contenido": "Su gran obra exterior fue el anclaje de España en Occidente: la firma de la adhesión a la Comunidad Económica Europea (1986) y el giro en el referéndum de la OTAN de marzo de 1986, en el que defendió la permanencia que antes había combatido. 1992 —Olimpiadas de Barcelona y Expo de Sevilla— fue el escaparate de la nueva España.",
            "fecha": "1986-03-12",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          },
          {
            "id": "pod-0029-ap-01-it-04",
            "apartado_id": "pod-0029-ap-01",
            "tipo": "evento",
            "titulo": "GAL, corrupción y desgaste",
            "contenido": "Sus últimos años estuvieron marcados por la guerra sucia contra ETA (los GAL), los casos de corrupción (Roldán, Filesa) y el desgaste del poder, el llamado 'felipismo'. Perdió las elecciones de 1996 frente a Aznar tras catorce años de gobierno.",
            "fecha": "1996-03-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 4
          },
          {
            "id": "pod-0029-ap-01-it-05",
            "apartado_id": "pod-0029-ap-01",
            "tipo": "evento",
            "titulo": "Estadista y voz crítica",
            "contenido": "Tras dejar la política activa se convirtió en un estadista de referencia internacional, asesor y consejero de empresas (Gas Natural). En los últimos años ha sido una de las voces más críticas con la deriva del PSOE de Pedro Sánchez, especialmente con los pactos con el independentismo y la ley de amnistía.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 5
          }
        ]
      },
      {
        "id": "pod-0029-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0029-ap-02-it-00",
            "apartado_id": "pod-0029-ap-02",
            "tipo": "dato",
            "titulo": "Crítica a Sánchez",
            "contenido": "Voz pública crítica con la amnistía y los pactos con Junts y EH Bildu. Encarna el 'sector crítico' histórico del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "critico-sanchez"
            ],
            "orden": 0
          },
          {
            "id": "pod-0029-ap-02-it-01",
            "apartado_id": "pod-0029-ap-02",
            "tipo": "dato",
            "titulo": "Socialdemocracia y razón de Estado",
            "contenido": "Representa una socialdemocracia pragmática y europeísta, con fuerte sentido de la 'razón de Estado'. Defiende la moderación, el pacto y la centralidad frente a lo que considera excesos ideológicos, y se ha distanciado abiertamente del actual rumbo de su partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "socialdemocracia",
              "europeismo"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0029-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0029-ap-03-it-00",
            "apartado_id": "pod-0029-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -5/10) — Crítico abierto con la amnistía y la estrategia de coalición.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota--5",
              "tension"
            ],
            "orden": 0
          },
          {
            "id": "pod-0029-ap-03-it-01",
            "apartado_id": "pod-0029-ap-03",
            "tipo": "contacto",
            "titulo": "Zapatero",
            "contenido": "**Expresidente PSOE** (nota -4/10) — Polos opuestos sobre el rumbo del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "zapatero",
              "nota--4",
              "tension"
            ],
            "orden": 1
          },
          {
            "id": "pod-0029-ap-03-it-02",
            "apartado_id": "pod-0029-ap-03",
            "tipo": "contacto",
            "titulo": "Alfonso Guerra",
            "contenido": "**Histórico del PSOE** (nota +5/10) — Compañero de la etapa de gobierno; ambos críticos con el actual PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "guerra",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0029-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0029-ap-04-it-00",
            "apartado_id": "pod-0029-ap-04",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Felipe_Gonz%C3%A1lez",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0030",
    "slug": "mariano-rajoy",
    "nombre_completo": "Mariano Rajoy Brey",
    "alias": "Rajoy",
    "cargo_actual": "Expresidente del Gobierno (PP)",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidente del Gobierno de España (2011-2018) por el PP. Gestionó el rescate financiero, la crisis del procés catalán (artículo 155) y fue desalojado del poder por la primera moción de censura exitosa de la democracia, tras la sentencia del caso Gürtel.",
    "tags": [
      "ex-politico",
      "expresidente",
      "pp"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Mariano_Rajoy",
    "apartados": [
      {
        "id": "pod-0030-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0030-ap-00-it-00",
            "apartado_id": "pod-0030-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Mariano Rajoy Brey (Santiago de Compostela, 27 de marzo de 1955) fue presidente del Gobierno entre 2011 y 2018. Registrador de la propiedad y político de largo recorrido en el PP, gobernó en plena crisis económica y afrontó el mayor desafío territorial de la democracia, antes de ser desalojado por la primera moción de censura exitosa de la historia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0030-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0030-ap-01-it-00",
            "apartado_id": "pod-0030-ap-01",
            "tipo": "evento",
            "titulo": "Registrador y ministro con Aznar",
            "contenido": "Registrador de la propiedad, hizo carrera en el PP de Galicia y desembarcó en Madrid. Fue ministro en varias carteras con Aznar (Administraciones Públicas, Educación, Interior, Presidencia) y vicepresidente, ganándose fama de gestor discreto y resistente.",
            "fecha": "1996-05-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0030-ap-01-it-01",
            "apartado_id": "pod-0030-ap-01",
            "tipo": "evento",
            "titulo": "Sucesor de Aznar y dos derrotas",
            "contenido": "Designado sucesor por Aznar en 2004, perdió las elecciones de 2004 y 2008 frente a Zapatero. Su resistencia interna y la crisis económica le dieron una tercera oportunidad.",
            "fecha": "2004-09-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0030-ap-01-it-02",
            "apartado_id": "pod-0030-ap-01",
            "tipo": "evento",
            "titulo": "Presidente en plena crisis",
            "contenido": "Ganó por mayoría absoluta en 2011. Gobernó aplicando una dura política de austeridad y reformas para evitar el rescate total del país; sí hubo rescate del sistema financiero. La recuperación llegó al final de su mandato, a costa de un fuerte desgaste social.",
            "fecha": "2011-12-21",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0030-ap-01-it-03",
            "apartado_id": "pod-0030-ap-01",
            "tipo": "evento",
            "titulo": "El desafío catalán y el 155",
            "contenido": "Afrontó el 'procés' independentista catalán, que culminó en el referéndum ilegal del 1 de octubre de 2017 y la declaración de independencia. Su Gobierno aplicó por primera vez el artículo 155 de la Constitución, interviniendo la autonomía de Cataluña y convocando elecciones.",
            "fecha": "2017-10-27",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          },
          {
            "id": "pod-0030-ap-01-it-04",
            "apartado_id": "pod-0030-ap-01",
            "tipo": "evento",
            "titulo": "Gürtel y la moción de censura",
            "contenido": "La sentencia del caso Gürtel, que acreditó la existencia de una caja b y una trama de corrupción ligada al PP, precipitó su caída: el 1 de junio de 2018 Pedro Sánchez ganó la primera moción de censura constructiva exitosa de la democracia. Rajoy abandonó la política y volvió a su plaza de registrador.",
            "fecha": "2018-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 4
          }
        ]
      },
      {
        "id": "pod-0030-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0030-ap-02-it-00",
            "apartado_id": "pod-0030-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Feijóo fue su apuesta en Galicia; relación de mentor-discípulo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "feijoo",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0030-ap-02-it-01",
            "apartado_id": "pod-0030-ap-02",
            "tipo": "contacto",
            "titulo": "José María Aznar",
            "contenido": "**Predecesor en el PP** (nota +2/10) — Relación fría; Aznar criticó su gestión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "aznar",
              "nota-+2",
              "neutral"
            ],
            "orden": 1
          },
          {
            "id": "pod-0030-ap-02-it-02",
            "apartado_id": "pod-0030-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Quien le desalojó** (nota -6/10) — La moción de censura de 2018 marca la relación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota--6",
              "tension"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0030-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0030-ap-03-it-00",
            "apartado_id": "pod-0030-ap-03",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Mariano_Rajoy",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0030-ap-04",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0030-ap-04-it-00",
            "apartado_id": "pod-0030-ap-04",
            "tipo": "dato",
            "titulo": "Conservadurismo gestor y resistente",
            "contenido": "Representa un conservadurismo pragmático, gestor y poco ideológico, con una proverbial capacidad de resistencia y de no decisión táctica. Su gestión de la crisis y del desafío territorial sigue siendo objeto de debate dentro y fuera del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gestion",
              "estabilidad"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0031",
    "slug": "pablo-iglesias-turrion",
    "nombre_completo": "Pablo Iglesias Turrión",
    "alias": "Pablo Iglesias",
    "cargo_actual": "Exvicepresidente del Gobierno · fundador de Podemos",
    "partido": "PODEMOS",
    "foto_url": null,
    "bio_corta": "Politólogo. Fundador y exsecretario general de Podemos, exvicepresidente segundo del Gobierno (2020-2021). Tras dejar la política activa dirige el medio Canal Red y mantiene influencia en el espacio a la izquierda del PSOE.",
    "tags": [
      "ex-politico",
      "podemos",
      "medio",
      "izquierda"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Pablo_Iglesias_Turri%C3%B3n",
    "apartados": [
      {
        "id": "pod-0031-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0031-ap-00-it-00",
            "apartado_id": "pod-0031-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Pablo Iglesias Turrión (Madrid, 1978) fue vicepresidente segundo del Gobierno y fundador de Podemos, el partido que sacudió el bipartidismo español en 2014. Profesor de Ciencia Política y tertuliano, capitalizó el malestar del 15-M para irrumpir en la política y forzar el primer Gobierno de coalición de la democracia. Tras dejar la primera línea en 2021, dirige el medio Canal Red y mantiene una influencia notable —y polémica— en el espacio de la izquierda alternativa, en tensión con Sumar.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0031-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0031-ap-01-it-00",
            "apartado_id": "pod-0031-ap-01",
            "tipo": "evento",
            "titulo": "Del 15-M a Podemos",
            "contenido": "Politólogo y rostro de tertulias como 'La Tuerka', capitalizó el malestar del 15-M para fundar Podemos en 2014, que irrumpió con fuerza en las europeas y las generales, rompiendo el bipartidismo PSOE-PP.",
            "fecha": "2014-01-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0031-ap-01-it-01",
            "apartado_id": "pod-0031-ap-01",
            "tipo": "evento",
            "titulo": "El «asalto a los cielos»",
            "contenido": "Lideró el crecimiento meteórico de Podemos, que llegó a disputar a la izquierda la hegemonía del PSOE, con un discurso anti-casta y de regeneración, antes de estabilizarse como tercera o cuarta fuerza.",
            "fecha": "2015-12-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0031-ap-01-it-02",
            "apartado_id": "pod-0031-ap-01",
            "tipo": "evento",
            "titulo": "Vicepresidente del Gobierno",
            "contenido": "Tras el acuerdo con el PSOE, fue vicepresidente segundo y ministro de Derechos Sociales en el primer Gobierno de coalición (2020-2021), antes de dejar la política activa tras presentarse a las elecciones madrileñas.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0031-ap-01-it-03",
            "apartado_id": "pod-0031-ap-01",
            "tipo": "evento",
            "titulo": "Canal Red y la batalla mediática",
            "contenido": "Apartado de los cargos, fundó el medio digital Canal Red y se volcó en la comunicación, manteniendo el pulso con la derecha mediática y marcando distancias críticas con el proyecto de Sumar de Yolanda Díaz.",
            "fecha": "2021-05-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0031-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0031-ap-02-it-00",
            "apartado_id": "pod-0031-ap-02",
            "tipo": "contacto",
            "titulo": "Ione Belarra",
            "contenido": "**Secretaria general de Podemos** (nota +8/10) — Su sucesora y aliada en la línea dura de Podemos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "belarra",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0031-ap-02-it-01",
            "apartado_id": "pod-0031-ap-02",
            "tipo": "contacto",
            "titulo": "Irene Montero",
            "contenido": "**Dirigente de Podemos, su pareja** (nota +9/10) — Vínculo personal y político.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "montero",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 1
          },
          {
            "id": "pod-0031-ap-02-it-02",
            "apartado_id": "pod-0031-ap-02",
            "tipo": "contacto",
            "titulo": "Yolanda Díaz",
            "contenido": "**Líder de Sumar** (nota -6/10) — Ruptura amarga: Podemos se siente desplazado por Sumar.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "yolanda-diaz",
              "nota--6",
              "tension"
            ],
            "orden": 2
          },
          {
            "id": "pod-0031-ap-02-it-03",
            "apartado_id": "pod-0031-ap-02",
            "tipo": "contacto",
            "titulo": "Isabel Díaz Ayuso",
            "contenido": "**Presidenta de Madrid** (nota -8/10) — Su derrota en Madrid 2021 ('o ellos o nosotros') precipitó su salida.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ayuso",
              "nota--8",
              "conflicto"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0031-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0031-ap-03-it-00",
            "apartado_id": "pod-0031-ap-03",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Pablo_Iglesias_Turri%C3%B3n",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0032",
    "slug": "josep-borrell",
    "nombre_completo": "Josep Borrell Fontelles",
    "alias": "Borrell",
    "cargo_actual": "Ex Alto Representante de la UE para Asuntos Exteriores",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político e ingeniero del PSOE/PSC. Alto Representante de la Unión Europea para Asuntos Exteriores y Política de Seguridad (2019-2024), la voz de la diplomacia europea. Ex ministro, ex presidente del Parlamento Europeo y ex presidente del Congreso.",
    "tags": [
      "ex-politico",
      "psoe",
      "union-europea",
      "diplomacia"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Josep_Borrell",
    "apartados": [
      {
        "id": "pod-0032-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0032-ap-00-it-00",
            "apartado_id": "pod-0032-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Josep Borrell Fontelles (La Pobla de Segur, Lérida, 1947) es uno de los grandes estadistas del socialismo español y europeo. Ingeniero aeronáutico y economista, fue ministro con Felipe González, presidente del Parlamento Europeo y, sobre todo, Alto Representante de la UE para Asuntos Exteriores y vicepresidente de la Comisión (2019-2024), el cargo diplomático más alto de Europa, desde el que pilotó la respuesta europea a la guerra de Ucrania y a Oriente Próximo. Catalán y firme defensor del constitucionalismo, ha sido una voz incómoda frente al independentismo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0032-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0032-ap-01-it-00",
            "apartado_id": "pod-0032-ap-01",
            "tipo": "evento",
            "titulo": "Ministro con Felipe González",
            "contenido": "Ingeniero y economista, fue secretario de Estado y ministro de Obras Públicas, Transportes y Medio Ambiente en los gobiernos de Felipe González.",
            "fecha": "1991-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0032-ap-01-it-01",
            "apartado_id": "pod-0032-ap-01",
            "tipo": "evento",
            "titulo": "Primarias del PSOE y Parlamento Europeo",
            "contenido": "Ganó por sorpresa las primarias del PSOE en 1998 frente al aparato del partido, aunque no llegó a ser candidato; años después presidió el Parlamento Europeo (2004-2007), consolidando su perfil europeísta.",
            "fecha": "2004-07-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0032-ap-01-it-02",
            "apartado_id": "pod-0032-ap-01",
            "tipo": "evento",
            "titulo": "Ministro de Exteriores y el procés",
            "contenido": "Volvió a la primera línea como ministro de Exteriores con Pedro Sánchez en 2018, ejerciendo de azote internacional del independentismo catalán durante los años más duros del procés.",
            "fecha": "2018-06-07",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0032-ap-01-it-03",
            "apartado_id": "pod-0032-ap-01",
            "tipo": "evento",
            "titulo": "Alto Representante de la UE",
            "contenido": "Entre 2019 y 2024 fue Alto Representante de la Unión para Asuntos Exteriores y vicepresidente de la Comisión Europea, liderando la diplomacia comunitaria ante la guerra de Ucrania, Oriente Próximo y la relación con China y Estados Unidos.",
            "fecha": "2019-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0032-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0032-ap-02-it-00",
            "apartado_id": "pod-0032-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +6/10) — Lo impulsó como Alto Representante; alineamiento en política exterior.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0032-ap-02-it-01",
            "apartado_id": "pod-0032-ap-02",
            "tipo": "contacto",
            "titulo": "Ursula von der Leyen",
            "contenido": "**Presidenta de la Comisión Europea** (nota +4/10) — Tándem institucional en la Comisión I.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "von-der-leyen",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0032-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0032-ap-03-it-00",
            "apartado_id": "pod-0032-ap-03",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Josep_Borrell",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0033",
    "slug": "nadia-calvino",
    "nombre_completo": "Nadia Calviño Santamaría",
    "alias": "Calviño",
    "cargo_actual": "Presidenta del Banco Europeo de Inversiones (BEI)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Economista y alta funcionaria. Presidenta del Banco Europeo de Inversiones (BEI) desde 2024. Anteriormente vicepresidenta primera del Gobierno y ministra de Economía (2018-2023), arquitecta de la política económica de Sánchez y de la gestión de los fondos europeos.",
    "tags": [
      "ex-politico",
      "economia",
      "union-europea",
      "bei"
    ],
    "fuente_principal": "https://www.eib.org",
    "apartados": [
      {
        "id": "pod-0033-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0033-ap-00-it-00",
            "apartado_id": "pod-0033-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Nadia Calviño (A Coruña, 1968) es presidenta del Banco Europeo de Inversiones (BEI), la mayor institución financiera multilateral del mundo. Economista y alta funcionaria, fue vicepresidenta primera y ministra de Economía del Gobierno de España, donde pilotó la política económica y los fondos europeos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0033-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0033-ap-01-it-00",
            "apartado_id": "pod-0033-ap-01",
            "tipo": "evento",
            "titulo": "De Bruselas al Gobierno",
            "contenido": "Funcionaria de prestigio, fue directora general de Presupuestos de la Comisión Europea antes de incorporarse al Gobierno de Sánchez como ministra de Economía en 2018.",
            "fecha": "2018-06-07",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0033-ap-01-it-01",
            "apartado_id": "pod-0033-ap-01",
            "tipo": "evento",
            "titulo": "Vicepresidenta económica",
            "contenido": "Como vicepresidenta primera, gestionó la respuesta económica a la pandemia y el despliegue de los fondos Next Generation, con un perfil de ortodoxia y credibilidad ante los mercados y Bruselas.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0033-ap-01-it-02",
            "apartado_id": "pod-0033-ap-01",
            "tipo": "evento",
            "titulo": "Presidencia del BEI",
            "contenido": "En 2024 asumió la presidencia del Banco Europeo de Inversiones, primera española al frente de una gran institución financiera multilateral.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0033-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0033-ap-02-it-00",
            "apartado_id": "pod-0033-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +6/10) — Su ministra de Economía estrella; impulsó su candidatura al BEI.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0033-ap-02-it-01",
            "apartado_id": "pod-0033-ap-02",
            "tipo": "contacto",
            "titulo": "Carlos Cuerpo",
            "contenido": "**Ministro de Economía** (nota +5/10) — Su sucesor en la cartera económica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "cuerpo",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0033-ap-02-it-02",
            "apartado_id": "pod-0033-ap-02",
            "tipo": "contacto",
            "titulo": "José Luis Escrivá",
            "contenido": "**Gobernador del Banco de España** (nota +3/10) — Compañeros del área económica del Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "escriva",
              "nota-+3",
              "neutral"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0033-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0033-ap-03-it-00",
            "apartado_id": "pod-0033-ap-03",
            "tipo": "documento",
            "titulo": "BEI",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.eib.org",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0034",
    "slug": "faes",
    "nombre_completo": "Fundación para el Análisis y los Estudios Sociales (FAES)",
    "alias": "FAES",
    "cargo_actual": "Think tank liberal-conservador",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Principal think tank de la derecha española, presidido por José María Aznar. Produce análisis, publicaciones y foros que marcan la agenda intelectual del liberal-conservadurismo y del atlantismo en España.",
    "tags": [
      "think-tank",
      "pp",
      "liberalismo",
      "lobby"
    ],
    "fuente_principal": "https://fundacionfaes.org",
    "apartados": [
      {
        "id": "pod-0034-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0034-ap-00-it-00",
            "apartado_id": "pod-0034-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "FAES, think tank fundado en 1989 y refundado en 2002 bajo Aznar. Sede en Madrid. Vinculada históricamente al PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0034-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0034-ap-01-it-00",
            "apartado_id": "pod-0034-ap-01",
            "tipo": "contacto",
            "titulo": "José María Aznar",
            "contenido": "**Presidente de FAES** (nota +9/10) — Eje y figura de la fundación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "aznar",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0034-ap-01-it-01",
            "apartado_id": "pod-0034-ap-01",
            "tipo": "contacto",
            "titulo": "Partido Popular",
            "contenido": "**Partido afín** (nota +6/10) — Usina ideológica del ala liberal-conservadora.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0034-ap-01-it-02",
            "apartado_id": "pod-0034-ap-01",
            "tipo": "contacto",
            "titulo": "Fundación Rafael del Pino",
            "contenido": "**Think tank liberal afín** (nota +5/10) — Ecosistema liberal compartido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "frdelpino",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0034-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0034-ap-02-it-00",
            "apartado_id": "pod-0034-ap-02",
            "tipo": "documento",
            "titulo": "FAES",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://fundacionfaes.org",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0035",
    "slug": "real-instituto-elcano",
    "nombre_completo": "Real Instituto Elcano",
    "alias": "Instituto Elcano",
    "cargo_actual": "Think tank de estudios internacionales y estratégicos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Principal think tank español de relaciones internacionales y estudios estratégicos. Think tank de referencia para la política exterior, con patronato que reúne a grandes empresas (IBEX), exministros y la Casa Real como presidencia de honor.",
    "tags": [
      "think-tank",
      "geopolitica",
      "relaciones-internacionales"
    ],
    "fuente_principal": "https://www.realinstitutoelcano.org",
    "apartados": [
      {
        "id": "pod-0035-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0035-ap-00-it-00",
            "apartado_id": "pod-0035-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "Fundado en 2001. Think tank independiente de estudios internacionales. Su patronato reúne a grandes empresas españolas y exaltos cargos. Presidencia de honor de la Casa Real.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0035-ap-00-it-01",
            "apartado_id": "pod-0035-ap-00",
            "tipo": "dato",
            "titulo": "Barómetro e informes de referencia",
            "contenido": "Publica el Barómetro del Real Instituto Elcano y análisis de política exterior, defensa y reputación de España, que son lectura obligada en Exteriores, Defensa y las embajadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0035-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0035-ap-01-it-00",
            "apartado_id": "pod-0035-ap-01",
            "tipo": "contacto",
            "titulo": "Grandes empresas IBEX",
            "contenido": "**Patronos corporativos** (nota +6/10) — Santander, Telefónica, Iberdrola y otras financian y orientan el instituto.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ibex35",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0035-ap-01-it-01",
            "apartado_id": "pod-0035-ap-01",
            "tipo": "contacto",
            "titulo": "Ministerio de Exteriores",
            "contenido": "**Interlocución institucional** (nota +5/10) — Referencia para la política exterior española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "exteriores",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "pod-0035-ap-01-it-02",
            "apartado_id": "pod-0035-ap-01",
            "tipo": "contacto",
            "titulo": "Gobierno de España (Exteriores)",
            "contenido": "**Think tank de referencia en política exterior** (nota +5/10) — Sus informes nutren la acción diplomática y de seguridad del Estado; patronato con presencia pública y privada.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0035-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0035-ap-02-it-00",
            "apartado_id": "pod-0035-ap-02",
            "tipo": "documento",
            "titulo": "Real Instituto Elcano",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.realinstitutoelcano.org",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0036",
    "slug": "pedro-jose-ramirez",
    "nombre_completo": "Pedro José Ramírez Codina",
    "alias": "Pedro J. Ramírez",
    "cargo_actual": "Director de El Español",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista. Fundador y director de El Español (2015) y figura legendaria del periodismo español: dirigió Diario 16 y fundó El Mundo, que dirigió 25 años. Estilo combativo y de investigación; marcó hitos como el caso GAL o los GAL.",
    "tags": [
      "medio",
      "periodista",
      "digital",
      "prensa"
    ],
    "fuente_principal": "https://www.elespanol.com",
    "apartados": [
      {
        "id": "pod-0036-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0036-ap-00-it-00",
            "apartado_id": "pod-0036-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Pedro José Ramírez Codina (Logroño, 1952), conocido como 'Pedro J.', es uno de los periodistas más influyentes y polémicos de España, fundador y director de El Español. Antes fue director fundador de El Mundo, que dirigió durante 25 años convirtiéndolo en referencia del periodismo de investigación y en azote de la corrupción, hasta su salida del diario en 2014. Símbolo del periodismo combativo y de las exclusivas de impacto, su figura ha marcado la prensa española de las últimas cuatro décadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0036-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0036-ap-01-it-00",
            "apartado_id": "pod-0036-ap-01",
            "tipo": "evento",
            "titulo": "Director de Diario 16",
            "contenido": "Joven y precoz, dirigió Diario 16, donde impulsó investigaciones de gran repercusión durante los gobiernos socialistas, lo que acabó costándole el puesto.",
            "fecha": "1980-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0036-ap-01-it-01",
            "apartado_id": "pod-0036-ap-01",
            "tipo": "evento",
            "titulo": "Fundador y director de El Mundo",
            "contenido": "En 1989 fundó El Mundo, que dirigió durante 25 años, convirtiéndolo en uno de los grandes diarios del país y en azote de la corrupción, con investigaciones como el caso GAL o los papeles de Bárcenas.",
            "fecha": "1989-10-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0036-ap-01-it-02",
            "apartado_id": "pod-0036-ap-01",
            "tipo": "evento",
            "titulo": "Salida de El Mundo",
            "contenido": "En 2014 abandonó la dirección de El Mundo en medio de tensiones con el grupo editor, cerrando una etapa de un cuarto de siglo al frente del diario.",
            "fecha": "2014-01-31",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0036-ap-01-it-03",
            "apartado_id": "pod-0036-ap-01",
            "tipo": "evento",
            "titulo": "Fundación de El Español",
            "contenido": "En 2015 fundó El Español, un diario nativo digital impulsado mediante crowdfunding, desde el que continúa ejerciendo un periodismo de investigación e influencia y una marcada presencia pública.",
            "fecha": "2015-10-07",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0036-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0036-ap-02-it-00",
            "apartado_id": "pod-0036-ap-02",
            "tipo": "contacto",
            "titulo": "Eduardo Inda",
            "contenido": "**Director de OKDiario** (nota +4/10) — Antiguo subordinado en El Mundo; espacio editorial próximo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "inda",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0036-ap-02-it-01",
            "apartado_id": "pod-0036-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -6/10) — El Español mantiene una línea crítica con el Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota--6",
              "tension"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0036-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0036-ap-03-it-00",
            "apartado_id": "pod-0036-ap-03",
            "tipo": "documento",
            "titulo": "El Español",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.elespanol.com",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0037",
    "slug": "carlos-herrera",
    "nombre_completo": "Carlos Herrera Crusset",
    "alias": "Carlos Herrera",
    "cargo_actual": "Director y presentador de Herrera en COPE",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y comunicador. Dirige y presenta Herrera en COPE, el matinal de radio líder de audiencia. Una de las voces más influyentes del periodismo radiofónico, de tendencia conservadora.",
    "tags": [
      "medio",
      "periodista",
      "radio",
      "cope",
      "conservador"
    ],
    "fuente_principal": "https://www.cope.es",
    "apartados": [
      {
        "id": "pod-0037-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0037-ap-00-it-00",
            "apartado_id": "pod-0037-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Carlos Herrera Crusset (Barcelona, 1957) es uno de los comunicadores de radio más populares e influyentes de España, director y presentador de 'Herrera en COPE', el magacín matinal de la cadena. Periodista de larguísima trayectoria que ha pasado por RNE, la Cadena SER, Onda Cero y TVE, lidera con frecuencia las audiencias de la mañana y es una de las grandes voces del medio, con un perfil próximo a la centroderecha y una notable influencia en la conversación política española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0037-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0037-ap-01-it-00",
            "apartado_id": "pod-0037-ap-01",
            "tipo": "contacto",
            "titulo": "COPE / Conferencia Episcopal",
            "contenido": "**Cadena propiedad de la Iglesia** (nota +6/10) — COPE pertenece a la Conferencia Episcopal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "cope",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0037-ap-01-it-01",
            "apartado_id": "pod-0037-ap-01",
            "tipo": "contacto",
            "titulo": "Carlos Alsina",
            "contenido": "**Onda Cero** (nota -3/10) — Competidor directo por el liderazgo de la mañana radiofónica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "alsina",
              "nota--3",
              "tension"
            ],
            "orden": 1
          },
          {
            "id": "pod-0037-ap-01-it-02",
            "apartado_id": "pod-0037-ap-01",
            "tipo": "contacto",
            "titulo": "luis-arguello",
            "contenido": "**La COPE es de la Iglesia** (nota +4/10) — La cadena pertenece a la Conferencia Episcopal; el peso de Herrera convive con la propiedad eclesial que representa Argüello.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0037-ap-01-it-03",
            "apartado_id": "pod-0037-ap-01",
            "tipo": "contacto",
            "titulo": "carlos-alsina",
            "contenido": "**Duelo matinal de la radio** (nota -2/10) — Herrera (COPE) y Alsina (Onda Cero) se disputan el liderazgo de la radio generalista por la mañana.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0037-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0037-ap-02-it-00",
            "apartado_id": "pod-0037-ap-02",
            "tipo": "documento",
            "titulo": "COPE",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.cope.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0037-ap-03",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0037-ap-03-it-00",
            "apartado_id": "pod-0037-ap-03",
            "tipo": "dato",
            "titulo": "Voz matinal de la derecha",
            "contenido": "Lidera las mañanas de la COPE con una audiencia masiva y una línea crítica con el Gobierno de Sánchez. Su programa es parada obligada para políticos del centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "radio",
              "audiencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0037-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0037-ap-04-it-00",
            "apartado_id": "pod-0037-ap-04",
            "tipo": "evento",
            "titulo": "Larga carrera en radio y TV",
            "contenido": "Desarrolló una extensa carrera en los grandes grupos de comunicación, presentando programas en RNE, la Cadena SER, Onda Cero y Televisión Española.",
            "fecha": "1985-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0037-ap-04-it-01",
            "apartado_id": "pod-0037-ap-04",
            "tipo": "evento",
            "titulo": "Líder de la mañana radiofónica",
            "contenido": "Consolidó su prestigio como presentador de magacines matinales de gran audiencia, alternando entre Onda Cero y la COPE, donde se convirtió en una de las figuras estrella.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0037-ap-04-it-02",
            "apartado_id": "pod-0037-ap-04",
            "tipo": "evento",
            "titulo": "'Herrera en COPE'",
            "contenido": "Dirige y presenta 'Herrera en COPE', uno de los programas más escuchados de la radio española, desde el que ejerce una notable influencia en la conversación política, con un tono crítico hacia los gobiernos de izquierda.",
            "fecha": "2015-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0037-ap-04-it-03",
            "apartado_id": "pod-0037-ap-04",
            "tipo": "evento",
            "titulo": "Premios y popularidad",
            "contenido": "Ha recibido numerosos premios Ondas y Antenas de Oro, y su popularidad trasciende la radio, con presencia en televisión y una marcada personalidad pública.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0038",
    "slug": "jose-felix-tezanos",
    "nombre_completo": "José Félix Tezanos Tortajada",
    "alias": "Tezanos",
    "cargo_actual": "Presidente del CIS",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Sociólogo. Presidente del Centro de Investigaciones Sociológicas (CIS) desde 2018. Figura controvertida por la cercanía de sus encuestas al PSOE y los debates metodológicos sobre el organismo público demoscópico.",
    "tags": [
      "institucional",
      "cis",
      "demoscopia",
      "psoe"
    ],
    "fuente_principal": "https://www.cis.es",
    "apartados": [
      {
        "id": "pod-0038-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0038-ap-00-it-00",
            "apartado_id": "pod-0038-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Félix Tezanos Tortajada (Santander, 1946) es presidente del Centro de Investigaciones Sociológicas (CIS), el instituto demoscópico público, desde 2018. Catedrático de Sociología y veterano militante e ideólogo del PSOE, su gestión del CIS ha sido objeto de una intensa polémica por la metodología y la orientación de sus encuestas, criticadas por la oposición y parte del sector demoscópico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0038-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0038-ap-01-it-00",
            "apartado_id": "pod-0038-ap-01",
            "tipo": "contacto",
            "titulo": "PSOE",
            "contenido": "**Su partido** (nota +6/10) — Militante histórico; sus encuestas suelen favorecer al PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0038-ap-01-it-01",
            "apartado_id": "pod-0038-ap-01",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +5/10) — El CIS bajo su dirección publica estimaciones favorables al Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0038-ap-02",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "pod-0038-ap-02-it-00",
            "apartado_id": "pod-0038-ap-02",
            "tipo": "evento",
            "titulo": "Polémica metodológica",
            "contenido": "Su cocina demoscópica y sus estimaciones, sistemáticamente favorables al PSOE, han sido cuestionadas por la oposición y parte del sector demoscópico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "metodologia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0038-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0038-ap-03-it-00",
            "apartado_id": "pod-0038-ap-03",
            "tipo": "documento",
            "titulo": "CIS",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.cis.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0038-ap-04",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 4,
        "items": [
          {
            "id": "pod-0038-ap-04-it-00",
            "apartado_id": "pod-0038-ap-04",
            "tipo": "dato",
            "titulo": "La 'cocina' del CIS",
            "contenido": "Defiende el modelo de estimación del CIS, que ajusta los datos brutos con un algoritmo. Sus resultados, a menudo más favorables al PSOE que otros sondeos, son objeto de polémica recurrente.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "demoscopia",
              "estimacion"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0038-ap-05",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0038-ap-05-it-00",
            "apartado_id": "pod-0038-ap-05",
            "tipo": "evento",
            "titulo": "Sociólogo y teórico del PSOE",
            "contenido": "Catedrático de Sociología, fue durante décadas uno de los principales ideólogos del PSOE, director de la revista 'Temas para el Debate' y miembro de los órganos de pensamiento del partido.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0038-ap-05-it-01",
            "apartado_id": "pod-0038-ap-05",
            "tipo": "evento",
            "titulo": "Presidente del CIS",
            "contenido": "Fue nombrado presidente del CIS en 2018, al frente del organismo público encargado de medir la opinión y las intenciones de voto de los españoles.",
            "fecha": "2018-06-29",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0038-ap-05-it-02",
            "apartado_id": "pod-0038-ap-05",
            "tipo": "evento",
            "titulo": "La polémica demoscópica",
            "contenido": "Su etapa ha estado marcada por la controversia: cambios metodológicos como el llamado 'cocinado' de los datos y unas estimaciones a menudo favorables al PSOE le han valido fuertes críticas de la oposición.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0038-ap-05-it-03",
            "apartado_id": "pod-0038-ap-05",
            "tipo": "evento",
            "titulo": "Defensa de su gestión",
            "contenido": "Tezanos defiende la solvencia técnica del CIS y atribuye las críticas a la incomodidad política con unos resultados que, sostiene, han acertado en tendencias clave, en un debate recurrente sobre la independencia del instituto.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0039",
    "slug": "angel-gabilondo",
    "nombre_completo": "Ángel Gabilondo Pujol",
    "alias": "Gabilondo",
    "cargo_actual": "Defensor del Pueblo",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Filósofo y político. Defensor del Pueblo desde 2021. Ex ministro de Educación con Zapatero y excandidato del PSOE a la Comunidad de Madrid. Voz institucional de garantía de derechos ante la administración.",
    "tags": [
      "institucional",
      "defensor-pueblo",
      "ex-politico",
      "psoe"
    ],
    "fuente_principal": "https://www.defensordelpueblo.es",
    "apartados": [
      {
        "id": "pod-0039-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0039-ap-00-it-00",
            "apartado_id": "pod-0039-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Ángel Gabilondo Pujol (San Sebastián, 1949) es el Defensor del Pueblo, la alta institución que vela por los derechos de los ciudadanos frente a las administraciones. Catedrático de Filosofía y exrector de la Universidad Autónoma de Madrid, fue ministro de Educación y candidato del PSOE, con un perfil de diálogo y talante moderado reconocido en todo el arco político.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0039-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0039-ap-01-it-00",
            "apartado_id": "pod-0039-ap-01",
            "tipo": "contacto",
            "titulo": "PSOE",
            "contenido": "**Partido de procedencia** (nota +5/10) — Su nombramiento como Defensor fue criticado por la oposición por afinidad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0039-ap-01-it-01",
            "apartado_id": "pod-0039-ap-01",
            "tipo": "contacto",
            "titulo": "Isabel Díaz Ayuso",
            "contenido": "**Presidenta de Madrid** (nota -4/10) — Le derrotó en las elecciones madrileñas de 2021.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ayuso",
              "nota--4",
              "tension"
            ],
            "orden": 1
          },
          {
            "id": "pod-0039-ap-01-it-02",
            "apartado_id": "pod-0039-ap-01",
            "tipo": "contacto",
            "titulo": "Congreso de los Diputados",
            "contenido": "**Elección parlamentaria** (nota -1/10) — Su designación dependió del acuerdo PSOE-PP; debe equilibrar independencia y origen político.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0039-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0039-ap-02-it-00",
            "apartado_id": "pod-0039-ap-02",
            "tipo": "documento",
            "titulo": "Defensor del Pueblo",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.defensordelpueblo.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0039-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0039-ap-03-it-00",
            "apartado_id": "pod-0039-ap-03",
            "tipo": "evento",
            "titulo": "Filósofo y rector",
            "contenido": "Catedrático de Metafísica, desarrolló una larga carrera académica que culminó en el rectorado de la Universidad Autónoma de Madrid y en la presidencia de la conferencia de rectores (CRUE).",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0039-ap-03-it-01",
            "apartado_id": "pod-0039-ap-03",
            "tipo": "evento",
            "titulo": "Ministro de Educación",
            "contenido": "Fue ministro de Educación entre 2009 y 2011, en la etapa de Rodríguez Zapatero, donde buscó —sin éxito— un gran pacto de Estado por la educación, seña de su talante dialogante.",
            "fecha": "2009-04-07",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0039-ap-03-it-02",
            "apartado_id": "pod-0039-ap-03",
            "tipo": "evento",
            "titulo": "Candidato del PSOE en Madrid",
            "contenido": "Fue el candidato socialista a la Comunidad de Madrid en las elecciones de 2015, 2019 y 2021, ejerciendo de jefe de la oposición en la Asamblea madrileña.",
            "fecha": "2015-05-24",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0039-ap-03-it-03",
            "apartado_id": "pod-0039-ap-03",
            "tipo": "evento",
            "titulo": "Defensor del Pueblo",
            "contenido": "En 2021 fue elegido Defensor del Pueblo por las Cortes, al frente de la institución que supervisa a las administraciones y tramita las quejas de los ciudadanos, con informes sobre derechos, inmigración o servicios públicos.",
            "fecha": "2021-11-18",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0040",
    "slug": "juan-luis-cebrian",
    "nombre_completo": "Juan Luis Cebrián Echarri",
    "alias": "Cebrián",
    "cargo_actual": "Periodista · cofundador y expresidente de PRISA",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista. Director fundador de El País (1976) y figura histórica del Grupo PRISA, que presidió durante décadas. Uno de los grandes poderes mediáticos de la democracia, hoy con influencia menguante tras su salida de PRISA.",
    "tags": [
      "medio",
      "periodista",
      "prisa",
      "historico"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Juan_Luis_Cebri%C3%A1n",
    "apartados": [
      {
        "id": "pod-0040-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0040-ap-00-it-00",
            "apartado_id": "pod-0040-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Juan Luis Cebrián Echarri (Madrid, 1944) es un periodista y escritor español, figura histórica de la prensa de la democracia. Fue el primer director de El País, el diario que ayudó a fundar en 1976, y después presidente ejecutivo del grupo Prisa durante décadas. Miembro de la Real Academia Española, encarna el poder mediático del periodismo de la Transición.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0040-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0040-ap-01-it-00",
            "apartado_id": "pod-0040-ap-01",
            "tipo": "contacto",
            "titulo": "Grupo PRISA",
            "contenido": "**Grupo que presidió** (nota +3/10) — Figura histórica; perdió poder tras la reestructuración del grupo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "prisa",
              "nota-+3",
              "neutral"
            ],
            "orden": 0
          },
          {
            "id": "pod-0040-ap-01-it-01",
            "apartado_id": "pod-0040-ap-01",
            "tipo": "contacto",
            "titulo": "pepa-bueno",
            "contenido": "**Heredera en la dirección de El País** (nota +3/10) — La cabecera que él fundó la dirige hoy Pepa Bueno; vínculo simbólico entre la vieja y la nueva PRISA.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0040-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0040-ap-02-it-00",
            "apartado_id": "pod-0040-ap-02",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Juan_Luis_Cebri%C3%A1n",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0040-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0040-ap-03-it-00",
            "apartado_id": "pod-0040-ap-03",
            "tipo": "evento",
            "titulo": "Primer director de El País",
            "contenido": "Periodista formado en la prensa del tardofranquismo, fue el director fundador de El País en 1976, el diario que se convirtió en referencia de la Transición y en el de mayor influencia de la democracia.",
            "fecha": "1976-05-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0040-ap-03-it-01",
            "apartado_id": "pod-0040-ap-03",
            "tipo": "evento",
            "titulo": "Al frente de Prisa",
            "contenido": "Dejó la dirección del periódico para dirigir el grupo Prisa como consejero delegado y después presidente, convirtiéndolo en el mayor grupo de comunicación en español (El País, SER, Santillana).",
            "fecha": "1988-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0040-ap-03-it-02",
            "apartado_id": "pod-0040-ap-03",
            "tipo": "evento",
            "titulo": "Poder e influencia mediática",
            "contenido": "Durante décadas fue uno de los hombres más influyentes de España, en el cruce entre los medios, la política y los negocios, no exento de polémicas por el endeudamiento y las luchas de poder en Prisa.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0040-ap-03-it-03",
            "apartado_id": "pod-0040-ap-03",
            "tipo": "evento",
            "titulo": "Académico y escritor",
            "contenido": "Miembro de la Real Academia Española y autor de novelas y ensayos, ha mantenido un papel de comentarista y figura intelectual, símbolo del periodismo de una época.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0041",
    "slug": "alicia-koplowitz",
    "nombre_completo": "Alicia Koplowitz Romero de Juseu",
    "alias": "Alicia Koplowitz",
    "cargo_actual": "Inversora · marquesa de Bellavista",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Inversora y filántropa. Una de las mayores fortunas femeninas de España, gestiona su patrimonio vía Omega Capital con inversiones en cotizadas, arte e inmobiliario. Ex copropietaria de la constructora FCC.",
    "tags": [
      "empresa",
      "inversora",
      "no-ibex"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Alicia_Koplowitz",
    "apartados": [
      {
        "id": "pod-0041-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0041-ap-00-it-00",
            "apartado_id": "pod-0041-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Alicia Koplowitz Romero de Juseu (Madrid, 1952), marquesa de Bellavista, es una empresaria, inversora y filántropa española, una de las mayores fortunas del país. Tras vender a su hermana Esther su participación en el grupo de construcción familiar (germen de FCC), gestiona su patrimonio a través de la sociedad de inversión Omega Capital, con la que invierte en empresas cotizadas, fondos e inmobiliario. Es además una reconocida coleccionista de arte y mecenas, con una de las pinacotecas privadas más valiosas de España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0041-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0041-ap-01-it-00",
            "apartado_id": "pod-0041-ap-01",
            "tipo": "contacto",
            "titulo": "Omega Capital",
            "contenido": "**Su family office** (nota +9/10) — Vehículo de inversión en cotizadas, hedge funds e inmobiliario.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "omega",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0041-ap-01-it-01",
            "apartado_id": "pod-0041-ap-01",
            "tipo": "contacto",
            "titulo": "Esther Koplowitz",
            "contenido": "**Hermana (FCC)** (nota +2/10) — Repartieron el imperio Koplowitz; relación distante.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota-+2",
              "neutral"
            ],
            "orden": 1
          },
          {
            "id": "pod-0041-ap-01-it-02",
            "apartado_id": "pod-0041-ap-01",
            "tipo": "contacto",
            "titulo": "carlos-slim",
            "contenido": "**Fin de la era Koplowitz en FCC** (nota -2/10) — La familia Koplowitz dejó el control de FCC, que acabó en manos del mexicano Carlos Slim.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0041-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0041-ap-02-it-00",
            "apartado_id": "pod-0041-ap-02",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Alicia_Koplowitz",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0041-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0041-ap-03-it-00",
            "apartado_id": "pod-0041-ap-03",
            "tipo": "evento",
            "titulo": "La herencia Koplowitz y FCC",
            "contenido": "Junto a su hermana Esther, heredó y controló el grupo de construcción y servicios que daría lugar a FCC, una de las mayores constructoras de España.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0041-ap-03-it-01",
            "apartado_id": "pod-0041-ap-03",
            "tipo": "evento",
            "titulo": "Salida de FCC",
            "contenido": "A finales de los años noventa vendió su participación en el grupo a su hermana, materializando una enorme fortuna que decidió gestionar de forma independiente.",
            "fecha": "1998-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0041-ap-03-it-02",
            "apartado_id": "pod-0041-ap-03",
            "tipo": "evento",
            "titulo": "Omega Capital",
            "contenido": "Creó Omega Capital, su sociedad de inversión, con la que ha tomado participaciones en empresas cotizadas, fondos e inmobiliario, consolidándose como una de las grandes inversoras españolas.",
            "fecha": "1999-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0041-ap-03-it-03",
            "apartado_id": "pod-0041-ap-03",
            "tipo": "evento",
            "titulo": "Mecenas y coleccionista",
            "contenido": "Es una reconocida coleccionista de arte y mecenas a través de su fundación, con una de las colecciones privadas más valiosas de España y una intensa actividad filantrópica.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0042",
    "slug": "manuel-lao",
    "nombre_completo": "Manuel Lao Hernández",
    "alias": "Manuel Lao",
    "cargo_actual": "Fundador de Cirsa · inversor",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario. Fundador del grupo de juego Cirsa, que vendió a Blackstone en 2018 por ~2.000 M€. Hoy gestiona su fortuna vía Nortia Capital, con participaciones en cotizadas españolas.",
    "tags": [
      "empresa",
      "inversor",
      "no-ibex",
      "juego"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Manuel_Lao_Hern%C3%A1ndez",
    "apartados": [
      {
        "id": "pod-0042-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0042-ap-00-it-00",
            "apartado_id": "pod-0042-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Manuel Lao Hernández (Granada, 1944) es un empresario español, fundador del grupo de juego y ocio Cirsa y una de las mayores fortunas del país. Construyó desde cero, a partir de las máquinas recreativas, un gigante de los casinos, los bingos y las apuestas con presencia en España y América Latina, que en 2018 vendió al fondo estadounidense Blackstone por una cifra multimillonaria. Reorientó después su patrimonio hacia la inversión a través de su sociedad Nortia, manteniendo un perfil personal extremadamente discreto pese a figurar de forma recurrente entre los hombres más ricos del país.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0042-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0042-ap-01-it-00",
            "apartado_id": "pod-0042-ap-01",
            "tipo": "contacto",
            "titulo": "Nortia Capital",
            "contenido": "**Su family office** (nota +9/10) — Inversiones en cotizadas (Almirall, Logista, etc.).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nortia",
              "nota-+9",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0042-ap-01-it-01",
            "apartado_id": "pod-0042-ap-01",
            "tipo": "contacto",
            "titulo": "Fondos de capital privado",
            "contenido": "**Vendedor a Blackstone** (nota +3/10) — La venta de Cirsa lo conectó con el gran capital privado internacional; hoy gestiona su patrimonio diversificado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0042-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0042-ap-02-it-00",
            "apartado_id": "pod-0042-ap-02",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Manuel_Lao_Hern%C3%A1ndez",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0042-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0042-ap-03-it-00",
            "apartado_id": "pod-0042-ap-03",
            "tipo": "evento",
            "titulo": "Fundación de Cirsa",
            "contenido": "Empezó en el negocio de las máquinas recreativas y construyó Cirsa, que convirtió en uno de los mayores grupos de juego de España (casinos, bingos, salas y apuestas).",
            "fecha": "1980-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0042-ap-03-it-01",
            "apartado_id": "pod-0042-ap-03",
            "tipo": "evento",
            "titulo": "Expansión internacional",
            "contenido": "Expandió Cirsa por Europa y América Latina, diversificando en casinos, salones de juego y apuestas, hasta convertirla en una multinacional del ocio y el juego.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0042-ap-03-it-02",
            "apartado_id": "pod-0042-ap-03",
            "tipo": "evento",
            "titulo": "Venta a Blackstone",
            "contenido": "En 2018 vendió Cirsa al fondo estadounidense Blackstone por una cifra multimillonaria, materializando una de las mayores fortunas familiares de España.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0042-ap-03-it-03",
            "apartado_id": "pod-0042-ap-03",
            "tipo": "evento",
            "titulo": "Inversor a través de Nortia",
            "contenido": "Reorientó su patrimonio hacia la inversión mediante su holding Nortia, con participaciones en empresas cotizadas, inmobiliario y otros activos, manteniendo un perfil reservado.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0043",
    "slug": "familia-andic",
    "nombre_completo": "Familia Andic (Mango)",
    "alias": "Familia Andic",
    "cargo_actual": "Propietaria de Mango",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Familia catalana de origen turco propietaria de Mango, segunda mayor textil española tras Inditex. Tras el fallecimiento del fundador Isak Andic en diciembre de 2024, el control pasa a su hijo Jonathan Andic y al CEO Toni Ruiz.",
    "tags": [
      "empresa",
      "textil",
      "no-ibex",
      "familia",
      "cataluna"
    ],
    "fuente_principal": "https://www.mango.com",
    "apartados": [
      {
        "id": "pod-0043-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0043-ap-00-it-00",
            "apartado_id": "pod-0043-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "Mango, fundada en 1984 por Isak Andic en Barcelona. Segunda textil española. Capital 100% familiar (no cotiza).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0043-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0043-ap-01-it-00",
            "apartado_id": "pod-0043-ap-01",
            "tipo": "evento",
            "titulo": "Fallecimiento del fundador",
            "contenido": "Isak Andic, fundador, falleció en un accidente de montaña en diciembre de 2024. Sucesión hacia su hijo Jonathan.",
            "fecha": "2024-12-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sucesion"
            ],
            "orden": 0
          },
          {
            "id": "pod-0043-ap-01-it-01",
            "apartado_id": "pod-0043-ap-01",
            "tipo": "evento",
            "titulo": "Isak Andic y la sucesión",
            "contenido": "Isak Andic fundó Mango y la convirtió en multinacional de la moda. Tras su fallecimiento en un accidente en diciembre de 2024, la continuidad del grupo recae en la familia y el equipo directivo.",
            "fecha": "2024-12-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0043-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0043-ap-02-it-00",
            "apartado_id": "pod-0043-ap-02",
            "tipo": "contacto",
            "titulo": "Toni Ruiz",
            "contenido": "**CEO de Mango** (nota +7/10) — Gestiona la compañía y la transición tras la muerte del fundador.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "toni-ruiz",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "pod-0043-ap-02-it-01",
            "apartado_id": "pod-0043-ap-02",
            "tipo": "contacto",
            "titulo": "Inditex",
            "contenido": "**Competidor textil** (nota -3/10) — Rival directo en el sector moda español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "inditex",
              "nota--3",
              "tension"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0043-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0043-ap-03-it-00",
            "apartado_id": "pod-0043-ap-03",
            "tipo": "documento",
            "titulo": "Mango",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.mango.com",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0044",
    "slug": "jose-pablo-lopez",
    "nombre_completo": "José Pablo López Sánchez",
    "alias": "José Pablo López",
    "cargo_actual": "Presidente de RTVE",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Gestor audiovisual. Presidente de la Corporación RTVE desde 2024. Dirige la radiotelevisión pública española, cuya independencia y modelo de gobernanza es objeto de permanente disputa política.",
    "tags": [
      "medio",
      "television",
      "rtve",
      "publico"
    ],
    "fuente_principal": "https://www.rtve.es",
    "apartados": [
      {
        "id": "pod-0044-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0044-ap-00-it-00",
            "apartado_id": "pod-0044-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Pablo López Sánchez es presidente de RTVE, la Corporación de Radio y Televisión Española, el principal grupo audiovisual público del país (La 1, La 2, RNE y los servicios digitales). Profesional de la televisión con experiencia en cadenas autonómicas y en la producción de contenidos, accedió a la presidencia de la radiotelevisión estatal en 2024, tras años de provisionalidad, mandatos interinos y bloqueo político en la renovación de su consejo de administración.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0044-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0044-ap-01-it-00",
            "apartado_id": "pod-0044-ap-01",
            "tipo": "contacto",
            "titulo": "Gobierno / Parlamento",
            "contenido": "**Quien elige el consejo de RTVE** (nota +3/10) — La presidencia se decide por mayoría parlamentaria; tensión sobre la independencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota-+3",
              "neutral"
            ],
            "orden": 0
          },
          {
            "id": "pod-0044-ap-01-it-01",
            "apartado_id": "pod-0044-ap-01",
            "tipo": "contacto",
            "titulo": "Congreso de los Diputados",
            "contenido": "**Nombramiento de origen parlamentario** (nota -1/10) — La presidencia de RTVE depende del reparto de fuerzas en el Congreso, lo que tensiona su autonomía frente a los partidos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0044-ap-01-it-02",
            "apartado_id": "pod-0044-ap-01",
            "tipo": "contacto",
            "titulo": "borja-prado",
            "contenido": "**Competidor por la audiencia (Mediaset)** (nota -2/10) — La televisión pública compite por espectadores y publicidad con los grupos privados Mediaset y Atresmedia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0044-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0044-ap-02-it-00",
            "apartado_id": "pod-0044-ap-02",
            "tipo": "documento",
            "titulo": "RTVE",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.rtve.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0044-ap-03",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0044-ap-03-it-00",
            "apartado_id": "pod-0044-ap-03",
            "tipo": "dato",
            "titulo": "Servicio público y audiencias",
            "contenido": "Pilota una RTVE en plena pugna por la audiencia y por su independencia editorial, con la reforma del sistema de elección del consejo y la presión política sobre los informativos como telón de fondo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "servicio-publico",
              "independencia"
            ],
            "orden": 0
          },
          {
            "id": "pod-0044-ap-03-it-01",
            "apartado_id": "pod-0044-ap-03",
            "tipo": "dato",
            "titulo": "Servicio público y politización",
            "contenido": "Defiende un modelo de televisión pública independiente y de servicio, pero su gestión se desenvuelve en un entorno de permanente tensión política sobre el control del ente, la pluralidad informativa y la financiación de la corporación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "rtve"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0044-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0044-ap-04-it-00",
            "apartado_id": "pod-0044-ap-04",
            "tipo": "evento",
            "titulo": "Gestión audiovisual pública",
            "contenido": "Desarrolló su carrera en la televisión, con responsabilidades de dirección en cadenas autonómicas —entre ellas Telemadrid— y en la producción y dirección de contenidos para distintos operadores.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0044-ap-04-it-01",
            "apartado_id": "pod-0044-ap-04",
            "tipo": "evento",
            "titulo": "Director de contenidos de RTVE",
            "contenido": "Se incorporó a RTVE como responsable de contenidos generales, impulsando la programación, la ficción y la estrategia editorial de la corporación pública.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0044-ap-04-it-02",
            "apartado_id": "pod-0044-ap-04",
            "tipo": "evento",
            "titulo": "Presidente de RTVE",
            "contenido": "Fue elegido presidente de RTVE en 2024 por mayoría parlamentaria, asumiendo el reto de reformar la financiación, la audiencia y la gobernanza de la radiotelevisión pública en un contexto de fuerte politización del ente.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0044-ap-04-it-03",
            "apartado_id": "pod-0044-ap-04",
            "tipo": "evento",
            "titulo": "Reforma y audiencias",
            "contenido": "Su mandato afronta la recuperación de audiencias de La 1, el refuerzo de los informativos, la transición digital de la corporación y un modelo de financiación sin publicidad convencional que depende de aportaciones del Estado y de los operadores privados.",
            "fecha": "2024-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0045",
    "slug": "alfonso-guerra",
    "nombre_completo": "Alfonso Guerra González",
    "alias": "Alfonso Guerra",
    "cargo_actual": "Exvicepresidente del Gobierno (PSOE) · histórico",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político histórico del PSOE. Vicepresidente del Gobierno con Felipe González (1982-1991) y artífice de la organización del partido. Hoy voz crítica con la deriva del PSOE de Sánchez, especialmente con la amnistía.",
    "tags": [
      "ex-politico",
      "psoe",
      "historico"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Alfonso_Guerra",
    "apartados": [
      {
        "id": "pod-0045-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0045-ap-00-it-00",
            "apartado_id": "pod-0045-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Alfonso Guerra González (Sevilla, 1940) es uno de los grandes arquitectos del PSOE moderno y de la Transición democrática. Vicepresidente del Gobierno con Felipe González durante casi una década, fue el gran organizador del partido y su número dos, célebre por su afilada oratoria y su control de la maquinaria socialista. Retirado de los cargos pero no de la política, se ha convertido en una de las voces críticas más duras con el rumbo del PSOE de Pedro Sánchez, especialmente con los pactos con el independentismo y la ley de amnistía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0045-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0045-ap-01-it-00",
            "apartado_id": "pod-0045-ap-01",
            "tipo": "contacto",
            "titulo": "Felipe González",
            "contenido": "**Expresidente, su compañero** (nota +6/10) — Tándem histórico del PSOE; ambos críticos con Sánchez.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "felipe-gonzalez",
              "nota-+6",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0045-ap-01-it-01",
            "apartado_id": "pod-0045-ap-01",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -6/10) — Crítico contundente con la amnistía y los pactos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota--6",
              "tension"
            ],
            "orden": 1
          },
          {
            "id": "pod-0045-ap-01-it-02",
            "apartado_id": "pod-0045-ap-01",
            "tipo": "contacto",
            "titulo": "felipe-gonzalez",
            "contenido": "**Su histórico compañero y rival** (nota +2/10) — Vicepresidente con Felipe González, su relación combinó alianza fundacional del PSOE moderno y posterior distanciamiento; hoy ambos critican al PSOE de Sánchez.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0045-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0045-ap-02-it-00",
            "apartado_id": "pod-0045-ap-02",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Alfonso_Guerra",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0045-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0045-ap-03-it-00",
            "apartado_id": "pod-0045-ap-03",
            "tipo": "evento",
            "titulo": "El arquitecto del PSOE",
            "contenido": "Hombre de confianza de Felipe González desde el Congreso de Suresnes (1974), diseñó la maquinaria del partido y su estrategia electoral, convirtiéndose en el número dos del socialismo y en uno de los artífices de la Transición.",
            "fecha": "1974-10-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0045-ap-03-it-01",
            "apartado_id": "pod-0045-ap-03",
            "tipo": "evento",
            "titulo": "Vicepresidente del Gobierno",
            "contenido": "Fue vicepresidente del Gobierno entre 1982 y 1991, pieza clave de la modernización de España y de la mayoría socialista, con un peso decisivo en el partido y en el Ejecutivo.",
            "fecha": "1982-12-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0045-ap-03-it-02",
            "apartado_id": "pod-0045-ap-03",
            "tipo": "evento",
            "titulo": "La salida y el «caso Juan Guerra»",
            "contenido": "El escándalo en torno a su hermano Juan, que usaba un despacho oficial para negocios privados, precipitó su salida del Gobierno en 1991, aunque él no resultó condenado.",
            "fecha": "1991-01-12",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0045-ap-03-it-03",
            "apartado_id": "pod-0045-ap-03",
            "tipo": "evento",
            "titulo": "Voz crítica del veteranismo socialista",
            "contenido": "Retirado de la primera línea, ha presidido fundaciones del partido y se ha erigido en uno de los críticos más severos con los pactos del Gobierno de Sánchez con el independentismo y con la ley de amnistía.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0046",
    "slug": "ursula-von-der-leyen",
    "nombre_completo": "Ursula von der Leyen",
    "alias": "Von der Leyen",
    "cargo_actual": "Presidenta de la Comisión Europea",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Política alemana del PPE. Presidenta de la Comisión Europea desde 2019, reelegida en 2024. Máxima autoridad ejecutiva de la UE; sus decisiones sobre fondos, regulación y geopolítica condicionan directamente a España.",
    "tags": [
      "union-europea",
      "comision-europea",
      "ppe",
      "internacional"
    ],
    "fuente_principal": "https://commission.europa.eu",
    "apartados": [
      {
        "id": "pod-0046-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0046-ap-00-it-00",
            "apartado_id": "pod-0046-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Ursula von der Leyen (Bruselas, 1958) es presidenta de la Comisión Europea, la institución que propone la legislación de la UE y gestiona los fondos comunitarios. Médico de formación y veterana de la política alemana, es una de las figuras más poderosas de Europa y decisiva para España como gran receptora de fondos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0046-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0046-ap-01-it-00",
            "apartado_id": "pod-0046-ap-01",
            "tipo": "contacto",
            "titulo": "Teresa Ribera",
            "contenido": "**Vicepresidenta ejecutiva de la Comisión** (nota +5/10) — Comisaria española clave en su segundo mandato.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ribera",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "pod-0046-ap-01-it-01",
            "apartado_id": "pod-0046-ap-01",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno de España** (nota +3/10) — Interlocución en el Consejo Europeo; alineamientos variables.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+3",
              "neutral"
            ],
            "orden": 1
          },
          {
            "id": "pod-0046-ap-01-it-02",
            "apartado_id": "pod-0046-ap-01",
            "tipo": "contacto",
            "titulo": "josep-borrell",
            "contenido": "**Su Alto Representante de Exteriores** (nota +5/10) — Borrell fue jefe de la diplomacia de la UE y vicepresidente de su primera Comisión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0046-ap-01-it-03",
            "apartado_id": "pod-0046-ap-01",
            "tipo": "contacto",
            "titulo": "Gobierno de España (fondos Next Generation)",
            "contenido": "**Distribuye los fondos europeos** (nota +6/10) — España es de los mayores receptores del plan de recuperación que gestiona su Comisión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0046-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "pod-0046-ap-02-it-00",
            "apartado_id": "pod-0046-ap-02",
            "tipo": "documento",
            "titulo": "Comisión Europea",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://commission.europa.eu",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0046-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0046-ap-03-it-00",
            "apartado_id": "pod-0046-ap-03",
            "tipo": "evento",
            "titulo": "Ministra de Merkel",
            "contenido": "Pediatra y madre de siete hijos, hizo carrera en la CDU alemana y fue ministra durante años en los gobiernos de Angela Merkel (Trabajo, Familia y, finalmente, Defensa).",
            "fecha": "2005-11-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0046-ap-03-it-01",
            "apartado_id": "pod-0046-ap-03",
            "tipo": "evento",
            "titulo": "Presidenta de la Comisión Europea",
            "contenido": "En 2019 fue elegida presidenta de la Comisión Europea, reelegida en 2024. Pilotó el plan de recuperación pos-pandemia (del que España es gran beneficiaria), el Pacto Verde y la respuesta a la guerra de Ucrania.",
            "fecha": "2019-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0047",
    "slug": "corporacion-financiera-alba",
    "nombre_completo": "Corporación Financiera Alba",
    "alias": "Alba",
    "cargo_actual": "Holding inversor de la familia March",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Sociedad de inversión cotizada controlada por la familia March, brazo inversor de uno de los grandes patrimonios históricos de España. Su cartera incluye participaciones significativas en cotizadas del IBEX y del Mercado Continuo, lo que convierte a Alba en un accionista de referencia silencioso en buena parte del tejido empresarial.",
    "tags": [
      "inversion",
      "holding",
      "familia-march",
      "ibex",
      "no-electo"
    ],
    "fuente_principal": "https://www.corporacionalba.es",
    "apartados": [
      {
        "id": "pod-0047-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0047-ap-00-it-00",
            "apartado_id": "pod-0047-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Holding de inversión que rota su cartera entre cotizadas industriales y de servicios. Históricamente ha tenido posiciones de referencia en empresas como Acerinox, CIE Automotive, Ebro Foods, Indra o Naturgy, entre otras.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0047-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0047-ap-01-it-00",
            "apartado_id": "pod-0047-ap-01",
            "tipo": "dato",
            "titulo": "Estilo inversor",
            "contenido": "Inversión paciente, presencia en consejos y horizonte de largo plazo. Voz discreta pero decisiva en operaciones corporativas de sus participadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "largo-plazo",
              "consejos"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0047-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0047-ap-02-it-00",
            "apartado_id": "pod-0047-ap-02",
            "tipo": "contacto",
            "titulo": "familia-march",
            "contenido": "**Accionista de control** (nota +10/10) — Alba es el vehículo cotizado del patrimonio March, junto a Banca March y la Fundación Juan March.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0047-ap-02-it-01",
            "apartado_id": "pod-0047-ap-02",
            "tipo": "contacto",
            "titulo": "Empresas del IBEX 35",
            "contenido": "**Accionista de referencia en varias** (nota +7/10) — Sus paquetes accionariales le dan asiento en consejos y peso en juntas del IBEX y el Continuo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0047-ap-02-it-02",
            "apartado_id": "pod-0047-ap-02",
            "tipo": "contacto",
            "titulo": "naturgy",
            "contenido": "**Participación relevante** (nota +6/10) — Alba ha sido accionista significativo de la gasista, una de sus mayores posiciones cotizadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0047-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0047-ap-03-it-00",
            "apartado_id": "pod-0047-ap-03",
            "tipo": "dato",
            "titulo": "Cartera de participadas",
            "contenido": "Su cartera ha incluido posiciones de referencia en Naturgy, Acerinox, CIE Automotive, Ebro Foods e Indra, entre otras, rotando según el ciclo y las oportunidades.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0048",
    "slug": "familia-march",
    "nombre_completo": "Familia March",
    "alias": "Los March",
    "cargo_actual": "Banca March · Corporación Financiera Alba · Fundación Juan March",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Una de las grandes dinastías financieras de España, originaria de Mallorca. Controla Banca March (banca privada y patrimonial), el holding cotizado Corporación Financiera Alba y la prestigiosa Fundación Juan March. Combina poder financiero, inversor y cultural con un perfil deliberadamente discreto.",
    "tags": [
      "banca",
      "inversion",
      "fundaciones",
      "dinastia",
      "no-electo"
    ],
    "fuente_principal": "https://www.bancamarch.es",
    "apartados": [
      {
        "id": "pod-0048-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0048-ap-00-it-00",
            "apartado_id": "pod-0048-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Dinastía financiera mallorquina cuyo origen se remonta a Juan March Ordinas. Hoy combina banca privada (Banca March), inversión cotizada (Alba) y mecenazgo cultural (Fundación Juan March).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0048-ap-00-it-01",
            "apartado_id": "pod-0048-ap-00",
            "tipo": "dato",
            "titulo": "Fundación Juan March",
            "contenido": "Más allá de la banca y la inversión, la familia sostiene la Fundación Juan March, una de las instituciones culturales y científicas privadas más prestigiosas de España, lo que añade poder reputacional al financiero.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0048-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0048-ap-01-it-00",
            "apartado_id": "pod-0048-ap-01",
            "tipo": "contacto",
            "titulo": "corporacion-financiera-alba",
            "contenido": "**Su holding inversor cotizado** (nota +10/10) — Vehículo a través del cual la familia toma posiciones en el IBEX y el Continuo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0048-ap-01-it-01",
            "apartado_id": "pod-0048-ap-01",
            "tipo": "contacto",
            "titulo": "Banca March",
            "contenido": "**Banco familiar de banca privada** (nota +9/10) — Una de las pocas entidades de capital 100% familiar que quedan en España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0048-ap-01-it-02",
            "apartado_id": "pod-0048-ap-01",
            "tipo": "contacto",
            "titulo": "Mundo cultural y científico",
            "contenido": "**Mecenazgo de primer nivel** (nota +5/10) — La Fundación Juan March proyecta a la familia en el ámbito cultural, musical y de la investigación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0049",
    "slug": "garrigues",
    "nombre_completo": "Garrigues",
    "alias": "Garrigues",
    "cargo_actual": "Mayor despacho de abogados de España",
    "partido": null,
    "foto_url": null,
    "bio_corta": "El bufete de abogados más grande de España y uno de los mayores de Europa continental. Asesor fiscal y mercantil de gran parte del IBEX 35, es también una de las principales puertas giratorias entre la alta función pública, la magistratura y el sector privado.",
    "tags": [
      "despacho",
      "abogados",
      "fiscal",
      "puerta-giratoria",
      "no-electo"
    ],
    "fuente_principal": "https://www.garrigues.com",
    "apartados": [
      {
        "id": "pod-0049-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0049-ap-00-it-00",
            "apartado_id": "pod-0049-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Despacho full-service con presencia internacional, especializado en fiscal, mercantil, laboral y litigios. Asesora operaciones corporativas de las grandes cotizadas españolas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0049-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0049-ap-01-it-00",
            "apartado_id": "pod-0049-ap-01",
            "tipo": "dato",
            "titulo": "Puerta giratoria",
            "contenido": "Es frecuente el fichaje de exaltos cargos de Hacienda, ministerios y organismos reguladores, así como de magistrados que pasan al ejercicio privado. Esa porosidad es fuente recurrente de debate sobre conflictos de interés.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "conflicto-interes",
              "revolving-door"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0049-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0049-ap-02-it-00",
            "apartado_id": "pod-0049-ap-02",
            "tipo": "contacto",
            "titulo": "Empresas del IBEX 35",
            "contenido": "**Asesor jurídico-fiscal de referencia** (nota +7/10) — Interviene en fusiones, OPAs, salidas a bolsa y contenciosos fiscales de las grandes cotizadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0049-ap-02-it-01",
            "apartado_id": "pod-0049-ap-02",
            "tipo": "contacto",
            "titulo": "Alta función pública y magistratura",
            "contenido": "**Destino de la puerta giratoria** (nota +5/10) — Incorpora exinspectores de Hacienda, exaltos cargos y magistrados, lo que refuerza su capacidad de interlocución con la Administración.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0049-ap-02-it-02",
            "apartado_id": "pod-0049-ap-02",
            "tipo": "contacto",
            "titulo": "Ministerio de Hacienda",
            "contenido": "**Interlocución técnica y puerta giratoria** (nota +4/10) — El trasvase de inspectores y altos cargos de Hacienda al despacho facilita su conocimiento y diálogo con la Administración tributaria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0049-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0049-ap-03-it-00",
            "apartado_id": "pod-0049-ap-03",
            "tipo": "dato",
            "titulo": "Asesor fiscal de las grandes fortunas",
            "contenido": "Además del IBEX, asesora a buena parte de las grandes fortunas y family offices del país en planificación fiscal y sucesoria, lo que lo sitúa en el centro de los debates sobre fiscalidad del patrimonio.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0050",
    "slug": "cuatrecasas",
    "nombre_completo": "Cuatrecasas",
    "alias": "Cuatrecasas",
    "cargo_actual": "Gran despacho de abogados",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Uno de los grandes bufetes españoles, con fuerte presencia en derecho mercantil, mercado de capitales y operaciones corporativas. Junto a Garrigues y Uría, forma el núcleo de despachos que asesoran al IBEX y articulan parte de la puerta giratoria con el sector público.",
    "tags": [
      "despacho",
      "abogados",
      "mercantil",
      "no-electo"
    ],
    "fuente_principal": "https://www.cuatrecasas.com",
    "apartados": [
      {
        "id": "pod-0050-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0050-ap-00-it-00",
            "apartado_id": "pod-0050-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Despacho de origen barcelonés con red internacional (Iberia, Latinoamérica). Fuerte en mercado de capitales, M&A y regulatorio.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0050-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0050-ap-01-it-00",
            "apartado_id": "pod-0050-ap-01",
            "tipo": "contacto",
            "titulo": "Empresas del IBEX 35",
            "contenido": "**Asesor en operaciones corporativas** (nota +7/10) — Participa en OPAs, emisiones y reestructuraciones de cotizadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0050-ap-01-it-01",
            "apartado_id": "pod-0050-ap-01",
            "tipo": "contacto",
            "titulo": "garrigues",
            "contenido": "**Competidor del top de despachos** (nota -2/10) — Rivalidad por los grandes mandatos del IBEX, aunque a menudo en lados opuestos de la misma operación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0050-ap-01-it-02",
            "apartado_id": "pod-0050-ap-01",
            "tipo": "contacto",
            "titulo": "uria-menendez",
            "contenido": "**Rivalidad en el top del Derecho de los negocios** (nota -2/10) — Cuatrecasas y Uría se disputan, con Garrigues, los grandes mandatos del IBEX y la banca.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0051",
    "slug": "uria-menendez",
    "nombre_completo": "Uría Menéndez",
    "alias": "Uría",
    "cargo_actual": "Gran despacho de abogados",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Bufete de referencia en derecho mercantil y financiero, históricamente vinculado a las grandes operaciones del sector bancario y energético. Su prestigio académico y su cercanía a la elite jurídica lo sitúan como uno de los despachos más influyentes del país.",
    "tags": [
      "despacho",
      "abogados",
      "financiero",
      "no-electo"
    ],
    "fuente_principal": "https://www.uria.com",
    "apartados": [
      {
        "id": "pod-0051-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0051-ap-00-it-00",
            "apartado_id": "pod-0051-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Despacho con fuerte tradición académica y especialización en banca, mercado de capitales y competencia. Asesor habitual de entidades financieras y energéticas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0051-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0051-ap-01-it-00",
            "apartado_id": "pod-0051-ap-01",
            "tipo": "contacto",
            "titulo": "Empresas del IBEX 35",
            "contenido": "**Asesor jurídico de banca y energía** (nota +7/10) — Interviene en las mayores operaciones financieras y regulatorias del país.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0051-ap-01-it-01",
            "apartado_id": "pod-0051-ap-01",
            "tipo": "contacto",
            "titulo": "Elite jurídica y reguladores",
            "contenido": "**Vínculo con el mundo académico y regulatorio** (nota +5/10) — Sus socios y of counsel incluyen catedráticos y exmagistrados de referencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0051-ap-01-it-02",
            "apartado_id": "pod-0051-ap-01",
            "tipo": "contacto",
            "titulo": "cuatrecasas",
            "contenido": "**Competencia en la cúspide jurídica** (nota -2/10) — Junto a Garrigues, forman el trío de despachos que reparte las grandes operaciones corporativas y financieras.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0052",
    "slug": "marta-alvarez",
    "nombre_completo": "Marta Álvarez Guil",
    "alias": "Marta Álvarez",
    "cargo_actual": "Presidenta de El Corte Inglés",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidenta de El Corte Inglés, el mayor grupo de distribución no alimentaria de España y uno de los principales empleadores del país. Heredera de la familia fundadora, representa el poder del gran comercio tradicional español frente al empuje del e-commerce.",
    "tags": [
      "empresaria",
      "distribucion",
      "el-corte-ingles",
      "no-electo"
    ],
    "fuente_principal": "https://www.elcorteingles.es",
    "apartados": [
      {
        "id": "pod-0052-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0052-ap-00-it-00",
            "apartado_id": "pod-0052-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Marta Álvarez González es presidenta de El Corte Inglés, el mayor grupo de grandes almacenes de España y uno de los mayores empleadores privados del país. Hija de Isidoro Álvarez, histórico presidente de la compañía, representa a la familia fundadora en el control de un grupo centenario que afronta su transformación tras décadas de hegemonía indiscutida en el comercio minorista español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0052-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0052-ap-01-it-00",
            "apartado_id": "pod-0052-ap-01",
            "tipo": "dato",
            "titulo": "Reto estratégico",
            "contenido": "Modernizar un gigante del retail tradicional, monetizar su cartera inmobiliaria y competir con la distribución online manteniendo la marca como referente de servicio.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "retail",
              "transformacion-digital"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0052-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0052-ap-02-it-00",
            "apartado_id": "pod-0052-ap-02",
            "tipo": "contacto",
            "titulo": "El Corte Inglés",
            "contenido": "**Presidenta y accionista** (nota +9/10) — Encarna la continuidad de la familia fundadora al frente del grupo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0052-ap-02-it-01",
            "apartado_id": "pod-0052-ap-02",
            "tipo": "contacto",
            "titulo": "Gran banca y fondos",
            "contenido": "**Socios financieros e inmobiliarios** (nota +5/10) — La reestructuración del grupo la ha acercado a la banca acreedora y a inversores en su cartera inmobiliaria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0052-ap-02-it-02",
            "apartado_id": "pod-0052-ap-02",
            "tipo": "contacto",
            "titulo": "Gran banca acreedora",
            "contenido": "**Socios financieros del grupo** (nota +5/10) — La reestructuración acercó El Corte Inglés a la banca y a inversores en su patrimonio inmobiliario.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0052-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0052-ap-03-it-00",
            "apartado_id": "pod-0052-ap-03",
            "tipo": "evento",
            "titulo": "Formación en la empresa familiar",
            "contenido": "Vinculada desde joven a El Corte Inglés, se formó en distintas áreas del grupo creado por Ramón Areces y consolidado por su tío Isidoro Álvarez, accionista de referencia a través de la fundación y la cartera familiar.",
            "fecha": "1995-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0052-ap-03-it-01",
            "apartado_id": "pod-0052-ap-03",
            "tipo": "evento",
            "titulo": "Pugna por el control",
            "contenido": "Tras el fallecimiento de Isidoro Álvarez en 2014, la familia y los principales ejecutivos protagonizaron una pugna por el control del grupo, de la que Marta Álvarez emergió reforzada al frente del accionariado de referencia.",
            "fecha": "2014-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0052-ap-03-it-02",
            "apartado_id": "pod-0052-ap-03",
            "tipo": "evento",
            "titulo": "Presidenta de El Corte Inglés",
            "contenido": "Asumió la presidencia en 2019, en plena transformación del modelo de grandes almacenes ante el comercio electrónico, con planes de reducción de deuda y de puesta en valor de un enorme patrimonio inmobiliario.",
            "fecha": "2019-09-12",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0052-ap-03-it-03",
            "apartado_id": "pod-0052-ap-03",
            "tipo": "evento",
            "titulo": "Nuevos socios y diversificación",
            "contenido": "Bajo su presidencia, el grupo ha dado entrada a socios e inversores —como el catarí Hamad Al-Thani y la alianza aseguradora con Mutua Madrileña— y ha buscado diversificar y digitalizar el negocio para competir con los gigantes del comercio online.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0053",
    "slug": "jose-luis-bonet",
    "nombre_completo": "José Luis Bonet Ferrer",
    "alias": "Bonet",
    "cargo_actual": "Presidente de honor de Freixenet · expresidente de la Cámara de Comercio de España",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario del cava (Freixenet) y figura histórica de la representación empresarial española como presidente de la Cámara de Comercio de España. Voz de peso en la internacionalización de la empresa y en la marca España.",
    "tags": [
      "empresario",
      "camara-comercio",
      "marca-espana",
      "no-electo"
    ],
    "fuente_principal": "https://www.camara.es",
    "apartados": [
      {
        "id": "pod-0053-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0053-ap-00-it-00",
            "apartado_id": "pod-0053-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Luis Bonet Ferrer (Barcelona, 1941) es presidente de honor de Freixenet, el mayor grupo mundial de cava, y fue presidente de la Cámara de Comercio de España. Doctor en Derecho y en Ciencias Económicas, ha sido una de las grandes figuras del empresariado catalán y español y un firme defensor de la unidad de mercado y de la 'marca España'.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0053-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0053-ap-01-it-00",
            "apartado_id": "pod-0053-ap-01",
            "tipo": "contacto",
            "titulo": "Cámara de Comercio de España",
            "contenido": "**Expresidente de referencia** (nota +7/10) — Interlocutor del Gobierno y las autonomías en política comercial e internacionalización.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0053-ap-01-it-01",
            "apartado_id": "pod-0053-ap-01",
            "tipo": "contacto",
            "titulo": "antonio-garamendi",
            "contenido": "**Par en la representación empresarial** (nota +4/10) — Cámaras y CEOE comparten agenda de competitividad y proyección exterior de la empresa española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0053-ap-01-it-02",
            "apartado_id": "pod-0053-ap-01",
            "tipo": "contacto",
            "titulo": "Cámaras de comercio territoriales",
            "contenido": "**Red cameral** (nota +5/10) — Como expresidente de la Cámara de España articuló la representación del comercio exterior con las cámaras territoriales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0053-ap-02",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0053-ap-02-it-00",
            "apartado_id": "pod-0053-ap-02",
            "tipo": "evento",
            "titulo": "Freixenet, líder mundial del cava",
            "contenido": "Ligado a la familia fundadora, dirigió durante décadas Freixenet, la histórica casa de cava catalana, internacionalizándola hasta convertirla en líder mundial del espumoso, antes de su integración con la alemana Henkell.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0053-ap-02-it-01",
            "apartado_id": "pod-0053-ap-02",
            "tipo": "evento",
            "titulo": "Presidente de la Cámara de España",
            "contenido": "Presidió la Cámara de Comercio de España, ejerciendo de representante institucional del conjunto del empresariado y de defensor del comercio exterior y de la internacionalización de la empresa española.",
            "fecha": "2014-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0053-ap-02-it-02",
            "apartado_id": "pod-0053-ap-02",
            "tipo": "evento",
            "titulo": "Voz del empresariado constitucionalista",
            "contenido": "Referente del empresariado catalán constitucionalista, ha defendido públicamente la unidad de mercado y la permanencia de las empresas en Cataluña, especialmente durante el proceso independentista.",
            "fecha": "2017-10-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0053-ap-02-it-03",
            "apartado_id": "pod-0053-ap-02",
            "tipo": "evento",
            "titulo": "Mecenazgo y legado",
            "contenido": "Más allá de la empresa, ha impulsado iniciativas culturales y educativas y el discurso de la 'marca España', consolidándose como uno de los grandes patriarcas del empresariado español del último medio siglo.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0054",
    "slug": "juan-abello",
    "nombre_completo": "Juan Abelló Gallo",
    "alias": "Abelló",
    "cargo_actual": "Presidente de Torreal",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario e inversor, presidente del grupo de capital riesgo y patrimonial Torreal. Una de las grandes fortunas españolas, con un largo historial de entradas y salidas en cotizadas y operaciones de private equity. Conocido también por su faceta de coleccionista de arte.",
    "tags": [
      "empresario",
      "inversion",
      "capital-riesgo",
      "torreal",
      "no-electo"
    ],
    "fuente_principal": "https://www.torreal.es",
    "apartados": [
      {
        "id": "pod-0054-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0054-ap-00-it-00",
            "apartado_id": "pod-0054-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Juan Abelló Gallo (Madrid, 1941) es un empresario e inversor español, una de las grandes fortunas del país y presidente de la sociedad de capital riesgo Torreal. Farmacéutico de formación y heredero de un grupo farmacéutico que vendió, reorientó su patrimonio hacia la inversión en grandes empresas y es además uno de los más importantes coleccionistas privados de arte de España, con una densa red de relaciones en la élite económica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0054-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0054-ap-01-it-00",
            "apartado_id": "pod-0054-ap-01",
            "tipo": "contacto",
            "titulo": "Torreal",
            "contenido": "**Presidente y accionista** (nota +9/10) — Vehículo de inversión a través del cual entra en el capital de empresas cotizadas y no cotizadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0054-ap-01-it-01",
            "apartado_id": "pod-0054-ap-01",
            "tipo": "contacto",
            "titulo": "Mercado de capitales español",
            "contenido": "**Inversor histórico** (nota +5/10) — Su nombre aparece de forma recurrente en operaciones corporativas y en consejos de administración.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0054-ap-01-it-02",
            "apartado_id": "pod-0054-ap-01",
            "tipo": "contacto",
            "titulo": "Mercado de M&A español",
            "contenido": "**Inversor recurrente** (nota +5/10) — Su nombre aparece de forma habitual en operaciones de capital privado y consejos de cotizadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0054-ap-02",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0054-ap-02-it-00",
            "apartado_id": "pod-0054-ap-02",
            "tipo": "evento",
            "titulo": "Del laboratorio farmacéutico a la inversión",
            "contenido": "Procedente de una familia con intereses en el sector farmacéutico, vendió esos negocios y reorientó su patrimonio hacia la inversión empresarial y financiera.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0054-ap-02-it-01",
            "apartado_id": "pod-0054-ap-02",
            "tipo": "evento",
            "titulo": "Torreal y las participaciones",
            "contenido": "A través de Torreal, ha tomado participaciones en numerosas empresas de distintos sectores, actuando como inversor de referencia y socio capitalista en grandes operaciones del capitalismo español.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0054-ap-02-it-02",
            "apartado_id": "pod-0054-ap-02",
            "tipo": "evento",
            "titulo": "Inversor y coleccionista",
            "contenido": "Compagina su actividad inversora con una de las más importantes colecciones privadas de arte de España, y figura de forma recurrente entre las mayores fortunas del país.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0054-ap-02-it-03",
            "apartado_id": "pod-0054-ap-02",
            "tipo": "evento",
            "titulo": "Gran fortuna discreta",
            "contenido": "Mantiene un perfil discreto pese a su enorme peso económico, con presencia histórica en consejos de administración de grandes empresas y una densa red de relaciones en la élite empresarial y financiera.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0055",
    "slug": "hortensia-herrero",
    "nombre_completo": "Hortensia Herrero Chacón",
    "alias": "Hortensia Herrero",
    "cargo_actual": "Vicepresidenta de Mercadona · presidenta de la Fundación Hortensia Herrero",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Copropietaria y vicepresidenta de Mercadona junto a su marido Juan Roig, y una de las mujeres más ricas de España. A través de su fundación se ha convertido en una de las grandes mecenas del arte contemporáneo, con un centro de arte de referencia en Valencia.",
    "tags": [
      "empresaria",
      "mercadona",
      "mecenazgo",
      "arte",
      "no-electo"
    ],
    "fuente_principal": "https://www.fundacionhortensiaherrero.org",
    "apartados": [
      {
        "id": "pod-0055-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0055-ap-00-it-00",
            "apartado_id": "pod-0055-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Hortensia Herrero Chacón (Valencia, 1950) es vicepresidenta de Mercadona, la mayor cadena de supermercados de España, y una de las mujeres más ricas del país. Copropietaria de la compañía junto a su marido, Juan Roig, ha destacado además como gran mecenas de las artes a través de su fundación y del centro de arte que lleva su nombre en Valencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0055-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0055-ap-01-it-00",
            "apartado_id": "pod-0055-ap-01",
            "tipo": "contacto",
            "titulo": "juan-roig",
            "contenido": "**Su marido y socio en Mercadona** (nota +10/10) — Comparten el control de la mayor cadena de distribución alimentaria de España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0055-ap-01-it-01",
            "apartado_id": "pod-0055-ap-01",
            "tipo": "contacto",
            "titulo": "Mundo cultural valenciano",
            "contenido": "**Gran mecenas del arte** (nota +7/10) — Su fundación es interlocutora de instituciones culturales y administraciones autonómicas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0055-ap-01-it-02",
            "apartado_id": "pod-0055-ap-01",
            "tipo": "contacto",
            "titulo": "Generalitat Valenciana",
            "contenido": "**Interlocución cultural** (nota +4/10) — Su mecenazgo la convierte en socia de las instituciones culturales valencianas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0055-ap-02",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0055-ap-02-it-00",
            "apartado_id": "pod-0055-ap-02",
            "tipo": "evento",
            "titulo": "Cofundadora de la Mercadona moderna",
            "contenido": "Acompañó a su marido, Juan Roig, en la transformación de Mercadona desde una modesta cadena de tiendas valenciana hasta el líder indiscutible de la distribución alimentaria en España, de la que es vicepresidenta y accionista de referencia.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0055-ap-02-it-01",
            "apartado_id": "pod-0055-ap-02",
            "tipo": "evento",
            "titulo": "Mecenas de las artes",
            "contenido": "Creó la Fundación Hortensia Herrero, volcada en la restauración del patrimonio y el apoyo a la cultura, e impulsó el Centro de Arte Hortensia Herrero (CAHH) en Valencia, una de las grandes colecciones privadas de arte contemporáneo abiertas al público.",
            "fecha": "2023-11-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0055-ap-02-it-02",
            "apartado_id": "pod-0055-ap-02",
            "tipo": "evento",
            "titulo": "Una de las grandes fortunas",
            "contenido": "Su participación en Mercadona la sitúa entre las mayores fortunas femeninas de España, con un perfil discreto centrado en la empresa y en una intensa actividad filantrópica y cultural.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0055-ap-02-it-03",
            "apartado_id": "pod-0055-ap-02",
            "tipo": "evento",
            "titulo": "Perfil discreto e influyente",
            "contenido": "Pese a rehuir la exposición pública, su papel en Mercadona y su ambicioso proyecto cultural en Valencia la han convertido en una de las mujeres más influyentes de la economía y el mecenazgo españoles.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0056",
    "slug": "tomas-olivo",
    "nombre_completo": "Tomás Olivo López",
    "alias": "Tomás Olivo",
    "cargo_actual": "Presidente de General de Galerías Comerciales",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario inmobiliario, presidente de General de Galerías Comerciales (centros comerciales) y una de las mayores fortunas de España según los rankings de patrimonio. Perfil extremadamente discreto y patrimonio concentrado en activos inmobiliarios de gran valor.",
    "tags": [
      "empresario",
      "inmobiliario",
      "centros-comerciales",
      "no-electo"
    ],
    "fuente_principal": "https://www.lassalinas.es",
    "apartados": [
      {
        "id": "pod-0056-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0056-ap-00-it-00",
            "apartado_id": "pod-0056-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Tomás Olivo López es un empresario inmobiliario español, presidente y principal accionista de General de Galerías Comerciales (GGC), una socimi dueña de numerosos centros comerciales en España. Hecho a sí mismo y de perfil personal muy reservado, ha construido a partir del comercio y la promoción uno de los mayores patrimonios inmobiliarios del país, lo que lo ha situado de forma recurrente entre las mayores fortunas españolas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0056-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0056-ap-01-it-00",
            "apartado_id": "pod-0056-ap-01",
            "tipo": "contacto",
            "titulo": "General de Galerías Comerciales",
            "contenido": "**Accionista de control** (nota +9/10) — Vehículo de su patrimonio inmobiliario, una de las mayores socimi/inmobiliarias del país por valor de activos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0056-ap-01-it-01",
            "apartado_id": "pod-0056-ap-01",
            "tipo": "contacto",
            "titulo": "Banca acreedora",
            "contenido": "**Financiación de su cartera** (nota +4/10) — Sus desarrollos comerciales lo vinculan a la gran banca como financiadora de proyectos inmobiliarios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0056-ap-02",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0056-ap-02-it-00",
            "apartado_id": "pod-0056-ap-02",
            "tipo": "evento",
            "titulo": "Del comercio al ladrillo",
            "contenido": "Empresario de origen humilde, desarrolló su actividad en el comercio y la promoción inmobiliaria, especialmente en el sur y el levante español, donde levantó y explotó en régimen de alquiler grandes superficies y galerías comerciales.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0056-ap-02-it-01",
            "apartado_id": "pod-0056-ap-02",
            "tipo": "evento",
            "titulo": "General de Galerías Comerciales",
            "contenido": "Construyó y consolidó General de Galerías Comerciales, una cartera de grandes centros y galerías comerciales que le aporta unos ingresos por rentas muy elevados.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0056-ap-02-it-02",
            "apartado_id": "pod-0056-ap-02",
            "tipo": "evento",
            "titulo": "Salida a bolsa como socimi",
            "contenido": "Sacó GGC al mercado bursátil como socimi, lo que dio visibilidad a un patrimonio que lo sitúa entre los hombres más ricos de España, con un perfil personal muy reservado.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0056-ap-02-it-03",
            "apartado_id": "pod-0056-ap-02",
            "tipo": "evento",
            "titulo": "Gran patrimonio inmobiliario",
            "contenido": "Su fortuna, basada en activos inmobiliarios en renta, lo ha situado de forma recurrente en los primeros puestos de los rankings de grandes patrimonios nacionales.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0057",
    "slug": "belen-gualda",
    "nombre_completo": "Belén Gualda González",
    "alias": "Belén Gualda",
    "cargo_actual": "Presidenta de la SEPI",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidenta de la Sociedad Estatal de Participaciones Industriales (SEPI), el holding público que gestiona las participaciones del Estado en empresas estratégicas. Desde la SEPI, el Estado es accionista de referencia en Indra, Redeia, Enagás, Airbus y otras compañías clave, lo que la convierte en una pieza central del capitalismo de Estado español.",
    "tags": [
      "estado",
      "sepi",
      "participaciones-publicas",
      "ibex",
      "no-electo"
    ],
    "fuente_principal": "https://www.sepi.es",
    "apartados": [
      {
        "id": "pod-0057-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0057-ap-00-it-00",
            "apartado_id": "pod-0057-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Belén Gualda González es presidenta de la SEPI (Sociedad Estatal de Participaciones Industriales), el holding empresarial público del Estado español, que gestiona las participaciones en empresas como Indra, Telefónica, Navantia, Correos, Enusa o Hunosa. Funcionaria y gestora pública de larga trayectoria, dirige un instrumento clave de la política industrial y accionarial del Estado, con peso creciente en sectores estratégicos como la defensa y las telecomunicaciones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0057-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0057-ap-01-it-00",
            "apartado_id": "pod-0057-ap-01",
            "tipo": "dato",
            "titulo": "Capitalismo de Estado",
            "contenido": "La SEPI ha reforzado el papel del Estado como accionista estable en sectores estratégicos (defensa, energía, telecomunicaciones), en la lógica de la autonomía estratégica defendida por el Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "autonomia-estrategica",
              "blindaje"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0057-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0057-ap-02-it-00",
            "apartado_id": "pod-0057-ap-02",
            "tipo": "contacto",
            "titulo": "indra",
            "contenido": "**Primer accionista vía SEPI** (nota +9/10) — El Estado controla Indra como pieza del consorcio de defensa nacional; la SEPI ha pilotado los cambios de consejo y la entrada en el capital.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0057-ap-02-it-01",
            "apartado_id": "pod-0057-ap-02",
            "tipo": "contacto",
            "titulo": "telefonica",
            "contenido": "**Accionista de referencia del Estado** (nota +8/10) — La SEPI tomó cerca del 10% de la teleco como ancla de capital nacional frente a la entrada de STC (Arabia Saudí).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0057-ap-02-it-02",
            "apartado_id": "pod-0057-ap-02",
            "tipo": "contacto",
            "titulo": "redeia",
            "contenido": "**Accionista público de control** (nota +8/10) — El Estado mantiene la participación de referencia en el operador del sistema eléctrico por su carácter estratégico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0057-ap-02-it-03",
            "apartado_id": "pod-0057-ap-02",
            "tipo": "contacto",
            "titulo": "enagas",
            "contenido": "**Participación pública de referencia** (nota +7/10) — Como gestor técnico del sistema gasista, Enagás es otra pieza del perímetro estratégico tutelado por la SEPI.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0057-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0057-ap-03-it-00",
            "apartado_id": "pod-0057-ap-03",
            "tipo": "evento",
            "titulo": "Gestión pública",
            "contenido": "Funcionaria con formación técnica y económica, desarrolló su carrera en la gestión de empresas y organismos del sector público estatal.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0057-ap-03-it-01",
            "apartado_id": "pod-0057-ap-03",
            "tipo": "evento",
            "titulo": "Dirección en la SEPI",
            "contenido": "Ocupó responsabilidades de dirección dentro de la SEPI y de sus empresas participadas, conociendo desde dentro el funcionamiento del holding público industrial.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0057-ap-03-it-02",
            "apartado_id": "pod-0057-ap-03",
            "tipo": "evento",
            "titulo": "Presidenta de la SEPI",
            "contenido": "Asumió la presidencia de la SEPI, desde la que el Estado ha reforzado su presencia accionarial en empresas estratégicas como Telefónica e Indra y ha gestionado rescates de compañías afectadas por la pandemia.",
            "fecha": "2022-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0057-ap-03-it-03",
            "apartado_id": "pod-0057-ap-03",
            "tipo": "evento",
            "titulo": "Política industrial del Estado",
            "contenido": "Dirige un instrumento central de la política industrial y de soberanía económica del Gobierno, en un contexto de mayor intervención pública en sectores estratégicos como la defensa, las telecomunicaciones o la energía, y de gestión de las participaciones del Estado en empresas cotizadas y no cotizadas.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0058",
    "slug": "carlos-san-basilio",
    "nombre_completo": "Carlos San Basilio Pardo",
    "alias": "San Basilio",
    "cargo_actual": "Presidente de la CNMV",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidente de la Comisión Nacional del Mercado de Valores (CNMV), el supervisor de los mercados financieros españoles. Vigila a todas las cotizadas del IBEX, autoriza OPAs y emisiones, y persigue el abuso de mercado y el uso de información privilegiada. Procede de la alta función pública del Ministerio de Economía.",
    "tags": [
      "regulador",
      "cnmv",
      "mercados",
      "supervision",
      "no-electo"
    ],
    "fuente_principal": "https://www.cnmv.es",
    "apartados": [
      {
        "id": "pod-0058-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0058-ap-00-it-00",
            "apartado_id": "pod-0058-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Carlos San Basilio Pardo es presidente de la Comisión Nacional del Mercado de Valores (CNMV), el organismo que supervisa los mercados de valores españoles y a sus participantes. Economista y alto funcionario del Estado con una larga trayectoria en la política económica y financiera —pasó, entre otros cargos, por la Secretaría de Estado de Economía—, dirige al regulador bursátil en un periodo marcado por grandes operaciones corporativas como la OPA del BBVA sobre el Banco Sabadell.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0058-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0058-ap-01-it-00",
            "apartado_id": "pod-0058-ap-01",
            "tipo": "dato",
            "titulo": "Supervisión",
            "contenido": "La CNMV arbitra las grandes operaciones corporativas del mercado: OPAs hostiles, fusiones bancarias, salidas a bolsa. Su criterio condiciona los tiempos y las condiciones de operaciones multimillonarias.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "opas",
              "fusiones",
              "transparencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0058-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0058-ap-02-it-00",
            "apartado_id": "pod-0058-ap-02",
            "tipo": "contacto",
            "titulo": "Empresas del IBEX 35",
            "contenido": "**Supervisor de todas las cotizadas** (nota +8/10) — Cada hecho relevante, ampliación o cambio de control pasa por la CNMV; su relación con los consejos es de vigilancia, no de alianza.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0058-ap-02-it-01",
            "apartado_id": "pod-0058-ap-02",
            "tipo": "contacto",
            "titulo": "bbva",
            "contenido": "**Árbitro de la OPA sobre Sabadell** (nota +6/10) — La CNMV ha sido pieza clave en los plazos y la transparencia de la operación bancaria más relevante de la década.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0058-ap-02-it-02",
            "apartado_id": "pod-0058-ap-02",
            "tipo": "contacto",
            "titulo": "jose-luis-escriva",
            "contenido": "**Coordinación con el Banco de España** (nota +5/10) — CNMV y BdE reparten la supervisión financiera; coordinación obligada en estabilidad y solvencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0058-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0058-ap-03-it-00",
            "apartado_id": "pod-0058-ap-03",
            "tipo": "evento",
            "titulo": "Alto funcionario económico",
            "contenido": "Técnico comercial y economista del Estado, desarrolló su carrera en el Ministerio de Economía y en organismos financieros, con responsabilidades en política económica y mercados.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0058-ap-03-it-01",
            "apartado_id": "pod-0058-ap-03",
            "tipo": "evento",
            "titulo": "Secretaría de Estado de Economía",
            "contenido": "Ocupó altos cargos en la Administración económica, incluida la Secretaría de Estado de Economía, participando en la respuesta a la crisis financiera y a la pandemia.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0058-ap-03-it-02",
            "apartado_id": "pod-0058-ap-03",
            "tipo": "evento",
            "titulo": "Presidente de la CNMV",
            "contenido": "Fue nombrado presidente de la CNMV en 2024, al frente del supervisor de los mercados de valores, encargado de velar por la transparencia, la protección del inversor y el correcto funcionamiento de la bolsa.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0058-ap-03-it-03",
            "apartado_id": "pod-0058-ap-03",
            "tipo": "evento",
            "titulo": "Supervisión de grandes operaciones",
            "contenido": "Le corresponde arbitrar episodios sensibles como las opas, las salidas a bolsa y la información de las cotizadas, en un momento de intensa actividad corporativa en el IBEX 35.",
            "fecha": "2024-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0059",
    "slug": "cristina-herrero",
    "nombre_completo": "Cristina Herrero Sánchez",
    "alias": "Cristina Herrero",
    "cargo_actual": "Presidenta de la AIReF",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidenta de la Autoridad Independiente de Responsabilidad Fiscal (AIReF), el organismo que fiscaliza las cuentas públicas y evalúa la sostenibilidad de la deuda, las pensiones y el gasto. Su voz técnica condiciona el debate sobre el déficit y las reglas fiscales, a menudo en tensión con el optimismo del Gobierno.",
    "tags": [
      "regulador",
      "airef",
      "fiscalidad",
      "deficit",
      "no-electo"
    ],
    "fuente_principal": "https://www.airef.es",
    "apartados": [
      {
        "id": "pod-0059-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0059-ap-00-it-00",
            "apartado_id": "pod-0059-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Cristina Herrero Sánchez es presidenta de la AIReF (Autoridad Independiente de Responsabilidad Fiscal), el organismo que vigila el cumplimiento de las reglas fiscales y la sostenibilidad de las cuentas públicas en España. Economista y técnica del Estado especializada en finanzas públicas, dirige una institución clave para la credibilidad de la política presupuestaria española ante el Gobierno, el Parlamento y las instituciones europeas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0059-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0059-ap-01-it-00",
            "apartado_id": "pod-0059-ap-01",
            "tipo": "dato",
            "titulo": "Vigilancia del gasto",
            "contenido": "La AIReF advierte recurrentemente sobre desviaciones de déficit, sostenibilidad de las pensiones y eficiencia del gasto público, lo que genera roces con el Ministerio de Hacienda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sostenibilidad",
              "pensiones",
              "reglas-fiscales"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0059-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0059-ap-02-it-00",
            "apartado_id": "pod-0059-ap-02",
            "tipo": "contacto",
            "titulo": "Ministerio de Hacienda",
            "contenido": "**Fiscalizador incómodo** (nota -2/10) — Sus informes suelen contradecir el cuadro macro del Gobierno; relación institucional pero tensa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0059-ap-02-it-01",
            "apartado_id": "pod-0059-ap-02",
            "tipo": "contacto",
            "titulo": "jose-luis-escriva",
            "contenido": "**Interlocución técnica con el Banco de España** (nota +4/10) — Comparten diagnóstico sobre sostenibilidad de la deuda y necesidad de consolidación fiscal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0059-ap-02-it-02",
            "apartado_id": "pod-0059-ap-02",
            "tipo": "contacto",
            "titulo": "Congreso de los Diputados",
            "contenido": "**Comparecencias y control** (nota +3/10) — Sus informes y comparecencias parlamentarias condicionan el debate sobre déficit, deuda y pensiones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0059-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0059-ap-03-it-00",
            "apartado_id": "pod-0059-ap-03",
            "tipo": "evento",
            "titulo": "Técnica de la Hacienda pública",
            "contenido": "Economista y funcionaria especializada en finanzas públicas, desarrolló su carrera en el análisis presupuestario y la sostenibilidad de las cuentas del Estado.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0059-ap-03-it-01",
            "apartado_id": "pod-0059-ap-03",
            "tipo": "evento",
            "titulo": "En la AIReF",
            "contenido": "Se incorporó a la AIReF desde su creación, ocupando responsabilidades técnicas de dirección en el análisis económico y fiscal del organismo.",
            "fecha": "2014-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0059-ap-03-it-02",
            "apartado_id": "pod-0059-ap-03",
            "tipo": "evento",
            "titulo": "Presidenta de la AIReF",
            "contenido": "Fue nombrada presidenta de la AIReF en 2020, al frente de la autoridad fiscal independiente que evalúa los Presupuestos, las previsiones macroeconómicas y la deuda, con dictámenes que condicionan el debate presupuestario.",
            "fecha": "2020-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0059-ap-03-it-03",
            "apartado_id": "pod-0059-ap-03",
            "tipo": "evento",
            "titulo": "Vigilancia fiscal",
            "contenido": "Bajo su dirección, la AIReF ha ganado peso como árbitro técnico de la política fiscal, en pleno regreso de las reglas fiscales europeas y debate sobre el déficit, la deuda y el gasto público, en diálogo permanente con el Ministerio de Hacienda, las comunidades autónomas y la Comisión Europea.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0060",
    "slug": "alejandra-kindelan",
    "nombre_completo": "Alejandra Kindelán Oteyza",
    "alias": "Kindelán",
    "cargo_actual": "Presidenta de la AEB",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidenta de la Asociación Española de Banca (AEB), la patronal de los grandes bancos. Es la voz unificada del sector bancario ante el Gobierno, el Banco de España y el BCE en debates como el impuesto a la banca, la remuneración del ahorro o la regulación europea. Procede de la cúpula del Banco Santander.",
    "tags": [
      "patronal",
      "banca",
      "aeb",
      "lobby",
      "no-electo"
    ],
    "fuente_principal": "https://www.aebanca.es",
    "apartados": [
      {
        "id": "pod-0060-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0060-ap-00-it-00",
            "apartado_id": "pod-0060-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Alejandra Kindelán Oteyza es presidenta de la AEB (Asociación Española de Banca), la patronal de los bancos privados que operan en España y la primera mujer al frente de la organización. Economista con una larga trayectoria en el Banco Santander, donde dirigió estudios y asuntos públicos, es la voz del gran sector bancario en el debate sobre la fiscalidad, la regulación, la remuneración del ahorro y el papel de la banca en la economía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0060-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0060-ap-01-it-00",
            "apartado_id": "pod-0060-ap-01",
            "tipo": "dato",
            "titulo": "Defensa del sector",
            "contenido": "Lidera la oposición de la banca al impuesto extraordinario sobre el sector y defiende el papel del crédito en la economía frente a la presión política por los beneficios récord.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "impuesto-banca",
              "credito"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0060-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0060-ap-02-it-00",
            "apartado_id": "pod-0060-ap-02",
            "tipo": "contacto",
            "titulo": "banco-santander",
            "contenido": "**Su casa de origen** (nota +7/10) — Procede de la cúpula del Santander, lo que estrecha su vínculo con el primer banco del país.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0060-ap-02-it-01",
            "apartado_id": "pod-0060-ap-02",
            "tipo": "contacto",
            "titulo": "bbva",
            "contenido": "**Asociado de referencia** (nota +6/10) — Representa también los intereses del segundo banco en el debate regulatorio y fiscal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0060-ap-02-it-02",
            "apartado_id": "pod-0060-ap-02",
            "tipo": "contacto",
            "titulo": "caixabank",
            "contenido": "**Asociado de referencia** (nota +6/10) — La AEB unifica la posición de los grandes bancos ante el regulador y el Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0060-ap-02-it-03",
            "apartado_id": "pod-0060-ap-02",
            "tipo": "contacto",
            "titulo": "antonio-garamendi",
            "contenido": "**Coordinación con la CEOE** (nota +5/10) — La patronal bancaria alinea su discurso fiscal y regulatorio con el de la gran patronal empresarial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0060-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0060-ap-03-it-00",
            "apartado_id": "pod-0060-ap-03",
            "tipo": "evento",
            "titulo": "Economista en el Santander",
            "contenido": "Economista de formación internacional, desarrolló buena parte de su carrera en el Banco Santander, donde dirigió áreas de estudios, estrategia y asuntos públicos.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0060-ap-03-it-01",
            "apartado_id": "pod-0060-ap-03",
            "tipo": "evento",
            "titulo": "Presidenta de la AEB",
            "contenido": "Fue nombrada presidenta de la Asociación Española de Banca en 2022, primera mujer al frente de la patronal bancaria, en representación de las grandes entidades del sector.",
            "fecha": "2022-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0060-ap-03-it-02",
            "apartado_id": "pod-0060-ap-03",
            "tipo": "evento",
            "titulo": "Defensa del sector bancario",
            "contenido": "Ejerce de portavoz de la banca en debates sensibles como el impuesto extraordinario a las entidades, la inclusión financiera, la remuneración del ahorro o la regulación europea del sector.",
            "fecha": "2022-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0060-ap-03-it-03",
            "apartado_id": "pod-0060-ap-03",
            "tipo": "evento",
            "titulo": "Regulación y reputación",
            "contenido": "Defiende el papel de la banca en la financiación de la economía y de la transición, en un contexto de elevados beneficios del sector, presión fiscal y debate sobre el acceso a los servicios financieros.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0061",
    "slug": "federico-jimenez-losantos",
    "nombre_completo": "Federico Jiménez Losantos",
    "alias": "Federico",
    "cargo_actual": "Director de «Es la mañana de Federico» (esRadio)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y comunicador, fundador de esRadio y de Libertad Digital junto a un grupo de socios. Una de las voces más influyentes y polémicas de la derecha mediática española, con un programa matinal de gran audiencia y enorme capacidad de fijar agenda en el electorado conservador y liberal.",
    "tags": [
      "medios",
      "radio",
      "tertuliano",
      "derecha-mediatica",
      "no-electo"
    ],
    "fuente_principal": "https://esradio.libertaddigital.com",
    "apartados": [
      {
        "id": "pod-0061-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0061-ap-00-it-00",
            "apartado_id": "pod-0061-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Federico Jiménez Losantos (Orihuela del Tremedal, Teruel, 1951) es periodista, escritor y uno de los comunicadores más influyentes y polémicos de la derecha mediática española. Filólogo de formación, fundador de esRadio y de Libertad Digital, dirige y presenta el programa matinal 'Es la mañana de Federico', desde donde ejerce una crítica frontal a la izquierda, a los nacionalismos periféricos y, con frecuencia, a la propia derecha institucional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0061-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0061-ap-01-it-00",
            "apartado_id": "pod-0061-ap-01",
            "tipo": "dato",
            "titulo": "Línea editorial",
            "contenido": "Antinacionalista, liberal en lo económico y muy crítico con el Gobierno de Sánchez. Mantiene también una relación de amor-odio con la dirección del PP, a la que exige firmeza.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "liberalismo",
              "anti-sanchismo"
            ],
            "orden": 0
          },
          {
            "id": "pod-0061-ap-01-it-01",
            "apartado_id": "pod-0061-ap-01",
            "tipo": "dato",
            "titulo": "Comentarista de la derecha radical-liberal",
            "contenido": "Defiende posiciones liberal-conservadoras, el españolismo frente a los nacionalismos y una crítica feroz a la izquierda; su estilo combativo lo convierte en figura admirada por su público y muy contestada por sus adversarios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "opinion"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0061-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0061-ap-02-it-00",
            "apartado_id": "pod-0061-ap-02",
            "tipo": "contacto",
            "titulo": "eduardo-inda",
            "contenido": "**Afinidad en la derecha mediática** (nota +5/10) — Comparten encuadre editorial anti-sanchista y se citan mutuamente, aunque compiten por la misma audiencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0061-ap-02-it-01",
            "apartado_id": "pod-0061-ap-02",
            "tipo": "contacto",
            "titulo": "Partido Popular",
            "contenido": "**Aliado exigente** (nota +3/10) — Apoya al PP frente a la izquierda pero presiona públicamente a su dirección cuando la considera tibia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0061-ap-02-it-02",
            "apartado_id": "pod-0061-ap-02",
            "tipo": "contacto",
            "titulo": "carlos-herrera",
            "contenido": "**Antecesor y rival en la COPE** (nota -2/10) — Tras su salida acrimoniosa de la COPE (hoy de Herrera), levantó esRadio como competencia directa por el oyente conservador.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0061-ap-03",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0061-ap-03-it-00",
            "apartado_id": "pod-0061-ap-03",
            "tipo": "controversia",
            "titulo": "Estilo y condenas por injurias",
            "contenido": "Su estilo combativo le ha valido a lo largo de su carrera distintos procesos por injurias. Como en todo procedimiento, rige la presunción de inocencia salvo sentencia firme.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "injurias",
              "presuncion-inocencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0061-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 4,
        "items": [
          {
            "id": "pod-0061-ap-04-it-00",
            "apartado_id": "pod-0061-ap-04",
            "tipo": "evento",
            "titulo": "De la izquierda en Cataluña al giro liberal",
            "contenido": "Filólogo y profesor, militó en la izquierda comunista en la Barcelona de los años setenta. En 1981 impulsó el 'Manifiesto de los 2.300' en defensa del castellano en Cataluña y ese mismo año fue secuestrado y tiroteado en una pierna por el grupo independentista Terra Lliure.",
            "fecha": "1981-05-21",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0061-ap-04-it-01",
            "apartado_id": "pod-0061-ap-04",
            "tipo": "evento",
            "titulo": "Articulista y giro ideológico",
            "contenido": "Protagonizó un giro ideológico hacia posiciones liberal-conservadoras y se consolidó como articulista combativo, primero en la prensa y después como una de las grandes voces de la tertulia política.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0061-ap-04-it-02",
            "apartado_id": "pod-0061-ap-04",
            "tipo": "evento",
            "titulo": "La radio como tribuna",
            "contenido": "Se convirtió en una estrella de la radio matinal, primero en la COPE con 'La Mañana', desde donde ejerció una durísima oposición mediática que le granjeó enormes audiencias y sonadas polémicas con políticos y con la propia jerarquía de la cadena.",
            "fecha": "2003-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0061-ap-04-it-03",
            "apartado_id": "pod-0061-ap-04",
            "tipo": "evento",
            "titulo": "esRadio y Libertad Digital",
            "contenido": "Fundó junto a otros socios Libertad Digital y la emisora esRadio, plataformas desde las que mantiene una línea editorial abiertamente conservadora, anti-nacionalista y crítica con el Gobierno, además de publicar numerosos libros de ensayo y memorias.",
            "fecha": "2009-11-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0062",
    "slug": "jose-creuheras",
    "nombre_completo": "José Creuheras Margenat",
    "alias": "Creuheras",
    "cargo_actual": "Presidente de Grupo Planeta y de Atresmedia",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidente del Grupo Planeta, el mayor grupo editorial en español, y de Atresmedia (Antena 3, laSexta, Onda Cero). Concentra un poder mediático de primer orden: televisión, radio, prensa (La Razón) y edición de libros. Perfil discreto pero con enorme influencia sobre el ecosistema informativo del centro-derecha.",
    "tags": [
      "medios",
      "planeta",
      "atresmedia",
      "editorial",
      "no-electo"
    ],
    "fuente_principal": "https://www.planeta.es",
    "apartados": [
      {
        "id": "pod-0062-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0062-ap-00-it-00",
            "apartado_id": "pod-0062-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Creuheras Margenat es presidente del Grupo Planeta —el mayor grupo editorial en lengua española— y de Atresmedia, propietaria de Antena 3, laSexta, Onda Cero y Europa FM. Ligado a la familia fundadora de Planeta, reúne en sus manos un poder doble, editorial y audiovisual, que lo convierte en una de las figuras más influyentes del ecosistema mediático y cultural español e iberoamericano.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0062-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0062-ap-01-it-00",
            "apartado_id": "pod-0062-ap-01",
            "tipo": "dato",
            "titulo": "Poder mediático",
            "contenido": "Controla un conglomerado que abarca televisión generalista, radio, prensa y edición. Esa diversidad le da capacidad de fijar agenda y un peso decisivo en el reparto de la publicidad institucional y privada.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "audiovisual",
              "publicidad",
              "agenda"
            ],
            "orden": 0
          },
          {
            "id": "pod-0062-ap-01-it-01",
            "apartado_id": "pod-0062-ap-01",
            "tipo": "dato",
            "titulo": "Influencia mediática",
            "contenido": "Su grupo combina el mayor catálogo editorial en español con cadenas generalistas de amplia audiencia, lo que lo sitúa como interlocutor de primer orden del poder político y económico, más allá de adscripciones ideológicas explícitas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "editorial"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0062-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0062-ap-02-it-00",
            "apartado_id": "pod-0062-ap-02",
            "tipo": "contacto",
            "titulo": "antonio-garcia-ferreras",
            "contenido": "**Director estrella de su grupo (laSexta)** (nota +7/10) — Ferreras dirige y presenta el buque insignia informativo de Atresmedia; su línea editorial pesa en la imagen del grupo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0062-ap-02-it-01",
            "apartado_id": "pod-0062-ap-02",
            "tipo": "contacto",
            "titulo": "vicente-valles",
            "contenido": "**Presentador de referencia (Antena 3)** (nota +7/10) — Vallés conduce el informativo líder de audiencia del grupo Atresmedia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0062-ap-02-it-02",
            "apartado_id": "pod-0062-ap-02",
            "tipo": "contacto",
            "titulo": "francisco-marhuenda",
            "contenido": "**Director de La Razón, del grupo Planeta** (nota +6/10) — La cabecera conservadora forma parte del perímetro editorial de Planeta.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0062-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0062-ap-03-it-00",
            "apartado_id": "pod-0062-ap-03",
            "tipo": "evento",
            "titulo": "La saga Lara y el Grupo Planeta",
            "contenido": "Vinculado a la familia fundadora de Planeta —el editor José Manuel Lara Hernández creó el grupo en Barcelona en 1949—, se formó en la gestión empresarial y fue asumiendo responsabilidades dentro de un conglomerado que reúne sellos como Planeta, Espasa, Seix Barral, Destino o Booket, además del Premio Planeta, el galardón literario mejor dotado del mundo tras el Nobel.",
            "fecha": "1995-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0062-ap-03-it-01",
            "apartado_id": "pod-0062-ap-03",
            "tipo": "evento",
            "titulo": "Presidente de Planeta y Atresmedia",
            "contenido": "Tras el fallecimiento de José Manuel Lara Bosch en 2015, asumió la presidencia del Grupo Planeta y, con ella, la de Atresmedia, el grupo audiovisual en el que Planeta es accionista de referencia, sumando al negocio editorial dos de las grandes cadenas de televisión y radio del país.",
            "fecha": "2015-02-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0062-ap-03-it-02",
            "apartado_id": "pod-0062-ap-03",
            "tipo": "evento",
            "titulo": "Un conglomerado cultural y educativo",
            "contenido": "Bajo su mando, el grupo abarca edición, la productora DeAPlaneta, formación universitaria privada, el diario La Razón y una amplia presencia en América Latina, además de haber crecido en Francia con la editorial Editis, consolidándose como un gigante cultural transnacional.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0062-ap-03-it-03",
            "apartado_id": "pod-0062-ap-03",
            "tipo": "evento",
            "titulo": "Poder editorial y audiovisual",
            "contenido": "Su posición al frente de Planeta y Atresmedia lo sitúa como interlocutor de primer orden del poder político y económico y como actor central del mercado publicitario y de la opinión pública, más allá de adscripciones ideológicas explícitas.",
            "fecha": "2022-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0063",
    "slug": "joseph-oughourlian",
    "nombre_completo": "Joseph Oughourlian",
    "alias": "Oughourlian",
    "cargo_actual": "Presidente de PRISA · fundador de Amber Capital",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Inversor franco-armenio, fundador del fondo Amber Capital y presidente de PRISA, el grupo editor de El País, la Cadena SER y Santillana. Llegó al control del grupo como accionista activista y hoy preside uno de los mayores conglomerados de medios en español, de influencia decisiva en el espacio progresista.",
    "tags": [
      "medios",
      "prisa",
      "el-pais",
      "fondo",
      "no-electo"
    ],
    "fuente_principal": "https://www.prisa.com",
    "apartados": [
      {
        "id": "pod-0063-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0063-ap-00-it-00",
            "apartado_id": "pod-0063-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Joseph Oughourlian (París, 1972) es presidente de Prisa, el grupo editor de El País, la Cadena SER y el diario deportivo AS, uno de los mayores grupos de medios en lengua española. Financiero franco-armenio y fundador del fondo activista Amber Capital, irrumpió como primer accionista de Prisa y acabó tomando su presidencia tras años de batallas por el control de un grupo considerado estratégico para la conversación pública en español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0063-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0063-ap-01-it-00",
            "apartado_id": "pod-0063-ap-01",
            "tipo": "dato",
            "titulo": "Control de PRISA",
            "contenido": "Su llegada reordenó el accionariado del grupo y su orientación. La propiedad y la línea de El País son objeto recurrente de pugna entre fondos, bancos acreedores y socios con intereses políticos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "accionariado",
              "activismo",
              "linea-editorial"
            ],
            "orden": 0
          },
          {
            "id": "pod-0063-ap-01-it-01",
            "apartado_id": "pod-0063-ap-01",
            "tipo": "dato",
            "titulo": "Línea editorial y disputas de control",
            "contenido": "Su llegada coincidió con tensiones recurrentes sobre la orientación editorial de Prisa y sobre la entrada de nuevos accionistas (financieros e internacionales), en un grupo que es a la vez una empresa endeudada y un actor político de primer nivel.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "prisa"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0063-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0063-ap-02-it-00",
            "apartado_id": "pod-0063-ap-02",
            "tipo": "contacto",
            "titulo": "pepa-bueno",
            "contenido": "**Directora de El País, su principal cabecera** (nota +7/10) — La dirección del diario depende del consejo de PRISA que él preside.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0063-ap-02-it-01",
            "apartado_id": "pod-0063-ap-02",
            "tipo": "contacto",
            "titulo": "juan-luis-cebrian",
            "contenido": "**Predecesor histórico en el poder de PRISA** (nota -3/10) — La era Oughourlian sucede y en parte desplaza a la influencia del fundador-director histórico del grupo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0063-ap-02-it-02",
            "apartado_id": "pod-0063-ap-02",
            "tipo": "contacto",
            "titulo": "Gobierno de España",
            "contenido": "**El control de El País, asunto de Estado** (nota +2/10) — La propiedad y la línea del grupo de El País y la SER son seguidas de cerca por el poder político por su influencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0063-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0063-ap-03-it-00",
            "apartado_id": "pod-0063-ap-03",
            "tipo": "evento",
            "titulo": "Financiero y fundador de Amber Capital",
            "contenido": "Formado en Francia y curtido en la banca de inversión en Estados Unidos, fundó en 2005 el fondo Amber Capital, especializado en tomar posiciones activistas en compañías cotizadas europeas y presionar a sus gestores para crear valor.",
            "fecha": "2005-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0063-ap-03-it-01",
            "apartado_id": "pod-0063-ap-03",
            "tipo": "evento",
            "titulo": "Activismo en grandes grupos",
            "contenido": "Amber protagonizó sonadas batallas accionariales en empresas europeas —entre ellas el grupo francés Lagardère—, ganándose una reputación de inversor combativo dispuesto a enfrentarse a los consejos y a las familias propietarias.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0063-ap-03-it-02",
            "apartado_id": "pod-0063-ap-03",
            "tipo": "evento",
            "titulo": "Primer accionista de Prisa",
            "contenido": "Fue elevando su participación en Prisa hasta convertirse en su primer accionista, en un grupo muy endeudado y con una propiedad fragmentada, en disputa con otros inversores y con la presión recurrente sobre el control del consejo.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0063-ap-03-it-03",
            "apartado_id": "pod-0063-ap-03",
            "tipo": "evento",
            "titulo": "Presidente de Prisa",
            "contenido": "Asumió la presidencia de Prisa a finales de 2021, en medio de batallas por el control y de la presión política sobre la línea editorial de El País y la SER, con la entrada de nuevos accionistas y la pugna recurrente por la orientación del grupo.",
            "fecha": "2021-12-31",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0064",
    "slug": "javier-tebas",
    "nombre_completo": "Javier Tebas Medrano",
    "alias": "Tebas",
    "cargo_actual": "Presidente de LaLiga",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidente de LaLiga, la patronal del fútbol profesional español. Gestiona los derechos televisivos multimillonarios del fútbol, negocia con operadores y plataformas, y mantiene pulsos públicos con clubes, federación y gobierno. El fútbol es un poder económico y mediático de primer orden y Tebas es su gestor más visible.",
    "tags": [
      "deporte",
      "futbol",
      "laliga",
      "derechos-tv",
      "no-electo"
    ],
    "fuente_principal": "https://www.laliga.com",
    "apartados": [
      {
        "id": "pod-0064-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0064-ap-00-it-00",
            "apartado_id": "pod-0064-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Javier Tebas Medrano (San José, Costa Rica, 1962) es presidente de LaLiga, la patronal del fútbol profesional español, desde 2013. Abogado de formación y de origen aragonés, ha convertido la organización en una potencia económica global gracias a la venta centralizada de derechos audiovisuales, al tiempo que mantiene sonoros enfrentamientos con clubes, federaciones y la UEFA.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0064-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0064-ap-01-it-00",
            "apartado_id": "pod-0064-ap-01",
            "tipo": "dato",
            "titulo": "Pulsos de poder",
            "contenido": "Mantiene enfrentamientos públicos recurrentes con la Federación, con grandes clubes y con proyectos como la Superliga. Defiende el control financiero (fair play) frente a los clubes-estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "superliga",
              "fair-play",
              "derechos-tv"
            ],
            "orden": 0
          },
          {
            "id": "pod-0064-ap-01-it-01",
            "apartado_id": "pod-0064-ap-01",
            "tipo": "dato",
            "titulo": "Modelo de negocio del fútbol",
            "contenido": "Defiende un modelo de competición sostenible, con límites de gasto y derechos audiovisuales centralizados, frente a los grandes clubes que reclaman más autonomía. Su gestión divide entre quienes le atribuyen el salto económico de LaLiga y quienes le critican por su estilo y sus enfrentamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "futbol",
              "laliga"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0064-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0064-ap-02-it-00",
            "apartado_id": "pod-0064-ap-02",
            "tipo": "contacto",
            "titulo": "telefonica",
            "contenido": "**Cliente y socio de derechos audiovisuales** (nota +5/10) — Movistar Plus+ y las plataformas pagan miles de millones por el fútbol que LaLiga comercializa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0064-ap-02-it-01",
            "apartado_id": "pod-0064-ap-02",
            "tipo": "contacto",
            "titulo": "Grandes clubes de fútbol",
            "contenido": "**Relación de tensión** (nota -3/10) — Pulsos públicos con Real Madrid y Barça por el reparto de derechos y los proyectos de competición alternativa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0064-ap-02-it-02",
            "apartado_id": "pod-0064-ap-02",
            "tipo": "contacto",
            "titulo": "CVC y fondos del fútbol",
            "contenido": "**Socio financiero de LaLiga** (nota +4/10) — El acuerdo con CVC (LaLiga Impulso) inyectó capital a los clubes a cambio de derechos, operación clave y polémica de su gestión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0064-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0064-ap-03-it-00",
            "apartado_id": "pod-0064-ap-03",
            "tipo": "evento",
            "titulo": "Abogado y dirigente futbolístico",
            "contenido": "Nacido en Costa Rica de padres españoles y criado en Huesca, ejerció como abogado mercantil y se vinculó pronto a la gestión del fútbol, ocupando vicepresidencias en la patronal de clubes antes de presidirla.",
            "fecha": "2002-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0064-ap-03-it-01",
            "apartado_id": "pod-0064-ap-03",
            "tipo": "evento",
            "titulo": "Presidente de LaLiga",
            "contenido": "Accedió a la presidencia de la Liga de Fútbol Profesional en 2013 e impulsó la venta centralizada de los derechos televisivos —antes negociados club a club—, multiplicando los ingresos del fútbol español y ordenando su reparto. Ha sido reelegido en sucesivas ocasiones.",
            "fecha": "2013-04-26",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0064-ap-03-it-02",
            "apartado_id": "pod-0064-ap-03",
            "tipo": "evento",
            "titulo": "Control económico y el acuerdo con CVC",
            "contenido": "Hizo bandera de la lucha contra la piratería y del control económico (límite de gasto) de los clubes, y selló el acuerdo 'LaLiga Impulso' con el fondo CVC, que inyectó miles de millones a cambio de un porcentaje de los ingresos audiovisuales, una operación rechazada por Real Madrid, Barcelona y Athletic.",
            "fecha": "2021-08-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0064-ap-03-it-03",
            "apartado_id": "pod-0064-ap-03",
            "tipo": "evento",
            "titulo": "Choques permanentes",
            "contenido": "Protagoniza enfrentamientos continuos con los grandes clubes, con la Federación Española (RFEF), con la UEFA y con el PSG y el fútbol-Estado, además de oponerse frontalmente al proyecto de la Superliga europea.",
            "fecha": "2021-04-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0065",
    "slug": "fundacion-alternativas",
    "nombre_completo": "Fundación Alternativas",
    "alias": "Alternativas",
    "cargo_actual": "Think tank de la izquierda española",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Laboratorio de ideas de referencia del centro-izquierda español, próximo al entorno socialista. Produce informes sobre democracia, política económica, Europa y cultura que alimentan el debate progresista. Es, en cierto modo, el contrapeso ideológico de FAES en el ecosistema de think tanks.",
    "tags": [
      "think-tank",
      "izquierda",
      "psoe",
      "ideas",
      "no-electo"
    ],
    "fuente_principal": "https://fundacionalternativas.org",
    "apartados": [
      {
        "id": "pod-0065-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0065-ap-00-it-00",
            "apartado_id": "pod-0065-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Fundación dedicada al análisis y la propuesta de políticas públicas desde una óptica progresista. Publica informes anuales sobre el estado de la democracia y la cultura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0065-ap-00-it-01",
            "apartado_id": "pod-0065-ap-00",
            "tipo": "dato",
            "titulo": "Informe sobre la democracia",
            "contenido": "Su 'Informe sobre la Democracia en España' y sus análisis de cultura y política económica son referencia anual del pensamiento progresista y alimentan el debate público de la izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0065-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0065-ap-01-it-00",
            "apartado_id": "pod-0065-ap-01",
            "tipo": "contacto",
            "titulo": "faes",
            "contenido": "**Contrapeso ideológico** (nota -4/10) — Alternativas y FAES ocupan polos opuestos del campo de los think tanks; nutren a sus respectivos espacios políticos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0065-ap-01-it-01",
            "apartado_id": "pod-0065-ap-01",
            "tipo": "contacto",
            "titulo": "PSOE",
            "contenido": "**Afinidad con el espacio socialista** (nota +6/10) — Sin ser orgánica del partido, su producción intelectual sintoniza con la agenda del centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0065-ap-01-it-02",
            "apartado_id": "pod-0065-ap-01",
            "tipo": "contacto",
            "titulo": "jose-luis-rodriguez-zapatero",
            "contenido": "**Sintonía con el socialismo histórico** (nota +4/10) — Su producción intelectual conecta con figuras y gobiernos del PSOE de las últimas décadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0066",
    "slug": "grupo-planeta",
    "nombre_completo": "Grupo Planeta",
    "alias": "Planeta",
    "cargo_actual": "Mayor grupo editorial y de comunicación en español",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Conglomerado de la familia Lara que reúne el mayor grupo editorial en lengua española, la participación de control en Atresmedia (Antena 3, laSexta, Onda Cero), el diario La Razón, universidades y formación. Un poder mediático, cultural y empresarial transversal.",
    "tags": [
      "medios",
      "editorial",
      "atresmedia",
      "familia-lara",
      "no-electo"
    ],
    "fuente_principal": "https://www.planeta.es",
    "apartados": [
      {
        "id": "pod-0066-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0066-ap-00-it-00",
            "apartado_id": "pod-0066-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Grupo familiar con intereses en edición de libros, televisión, radio, prensa y educación superior. Su diversificación lo hace menos dependiente de un único negocio y muy resistente a los ciclos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0066-ap-00-it-01",
            "apartado_id": "pod-0066-ap-00",
            "tipo": "dato",
            "titulo": "Del Premio Planeta a las universidades",
            "contenido": "Además de la edición y el audiovisual, controla un potente negocio de formación y universidades privadas (UNIE, parte de la órbita educativa del grupo) y otorga el Premio Planeta, el más dotado de las letras en español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0066-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0066-ap-01-it-00",
            "apartado_id": "pod-0066-ap-01",
            "tipo": "contacto",
            "titulo": "jose-creuheras",
            "contenido": "**Su presidente** (nota +10/10) — Creuheras encarna la continuidad de la familia Lara al frente del conglomerado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0066-ap-01-it-01",
            "apartado_id": "pod-0066-ap-01",
            "tipo": "contacto",
            "titulo": "francisco-marhuenda",
            "contenido": "**Director de La Razón, cabecera del grupo** (nota +6/10) — El diario conservador es la pata de prensa escrita del conglomerado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0066-ap-01-it-02",
            "apartado_id": "pod-0066-ap-01",
            "tipo": "contacto",
            "titulo": "javier-moll",
            "contenido": "**Competencia entre grandes editores** (nota -2/10) — Planeta y Prensa Ibérica compiten por audiencia, publicidad y peso en el mercado de medios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0067",
    "slug": "manuel-jove",
    "nombre_completo": "Manuel Jove Capellán",
    "alias": "Manuel Jove",
    "cargo_actual": "Presidente de Inveravante",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario gallego, fundador de la promotora Fadesa (que vendió antes de la crisis inmobiliaria) y hoy presidente del holding Inveravante. Una de las grandes fortunas del noroeste peninsular, con inversiones diversificadas en energía, inmobiliario y participaciones financieras.",
    "tags": [
      "empresario",
      "inversion",
      "galicia",
      "inmobiliario",
      "no-electo"
    ],
    "fuente_principal": "https://www.inveravante.com",
    "apartados": [
      {
        "id": "pod-0067-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0067-ap-00-it-00",
            "apartado_id": "pod-0067-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Empresario coruñés que hizo su fortuna en la promoción inmobiliaria con Fadesa y diversificó a través de Inveravante en energía, hoteles y participaciones financieras.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0067-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0067-ap-01-it-00",
            "apartado_id": "pod-0067-ap-01",
            "tipo": "contacto",
            "titulo": "Inveravante",
            "contenido": "**Accionista de control** (nota +9/10) — Holding a través del cual gestiona su patrimonio e inversiones diversificadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0067-ap-01-it-01",
            "apartado_id": "pod-0067-ap-01",
            "tipo": "contacto",
            "titulo": "Tejido empresarial gallego",
            "contenido": "**Gran fortuna regional** (nota +5/10) — Forma parte, con Amancio Ortega y otros, del núcleo de grandes patrimonios de Galicia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0067-ap-02",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0067-ap-02-it-00",
            "apartado_id": "pod-0067-ap-02",
            "tipo": "evento",
            "titulo": "La venta de Fadesa",
            "contenido": "Vendió la promotora Fadesa en el pico del ciclo inmobiliario, poco antes del estallido de la burbuja, una operación que blindó su patrimonio y financió la diversificación de Inveravante.",
            "fecha": "2007-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0068",
    "slug": "funcas",
    "nombre_completo": "Funcas (Fundación de las Cajas de Ahorros)",
    "alias": "Funcas",
    "cargo_actual": "Think tank económico del sector financiero",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Fundación de análisis económico vinculada a la CECA (las antiguas cajas de ahorros). Es una de las fuentes de previsiones macroeconómicas más citadas de España, junto al Banco de España y los servicios de estudios de la gran banca. Su panel de previsiones marca el consenso del mercado.",
    "tags": [
      "think-tank",
      "economia",
      "ceca",
      "previsiones",
      "no-electo"
    ],
    "fuente_principal": "https://www.funcas.es",
    "apartados": [
      {
        "id": "pod-0068-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0068-ap-00-it-00",
            "apartado_id": "pod-0068-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Centro de estudios económicos de la CECA. Publica previsiones de crecimiento, empleo e inflación y análisis sectoriales que orientan el debate económico y la toma de decisiones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0068-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0068-ap-01-it-00",
            "apartado_id": "pod-0068-ap-01",
            "tipo": "contacto",
            "titulo": "alejandra-kindelan",
            "contenido": "**Ecosistema financiero compartido** (nota +4/10) — Funcas (cajas/CECA) y la AEB (bancos) conviven en el debate sobre regulación y coyuntura financiera.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0068-ap-01-it-01",
            "apartado_id": "pod-0068-ap-01",
            "tipo": "contacto",
            "titulo": "jose-luis-escriva",
            "contenido": "**Diálogo con el Banco de España** (nota +5/10) — Sus previsiones se contrastan con las del supervisor en el consenso macroeconómico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0068-ap-01-it-02",
            "apartado_id": "pod-0068-ap-01",
            "tipo": "contacto",
            "titulo": "cristina-herrero",
            "contenido": "**Contraste de previsiones con la AIReF** (nota +4/10) — Sus estimaciones macro dialogan con las de la autoridad fiscal y el Banco de España en el consenso económico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0069",
    "slug": "blackrock",
    "nombre_completo": "BlackRock",
    "alias": "BlackRock",
    "cargo_actual": "Mayor gestora de activos del mundo · primer accionista institucional del IBEX",
    "partido": null,
    "foto_url": null,
    "bio_corta": "La mayor gestora de activos del planeta. A través de sus fondos indexados y activos es el primer o uno de los mayores accionistas institucionales de casi todas las grandes cotizadas del IBEX 35 (Santander, BBVA, Iberdrola, Telefónica, Inditex…). Su voto en juntas y su política de gobernanza condicionan, de forma silenciosa, la estrategia de la élite empresarial española.",
    "tags": [
      "fondo",
      "inversion",
      "gestora",
      "ibex",
      "internacional",
      "no-electo"
    ],
    "fuente_principal": "https://www.blackrock.com",
    "apartados": [
      {
        "id": "pod-0069-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0069-ap-00-it-00",
            "apartado_id": "pod-0069-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "BlackRock es la mayor gestora de activos del mundo, con billones de dólares bajo gestión, y el primer o uno de los mayores accionistas institucionales de casi todas las grandes cotizadas del IBEX 35. Su voto en juntas y su política de gobernanza condicionan, de forma silenciosa, la estrategia de la élite empresarial española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0069-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0069-ap-01-it-00",
            "apartado_id": "pod-0069-ap-01",
            "tipo": "evento",
            "titulo": "El gigante de los fondos índice",
            "contenido": "Fundada en 1988 por Larry Fink, creció hasta convertirse en la mayor gestora del planeta gracias a su plataforma de fondos indexados (iShares), que la convierte en accionista automático de prácticamente toda gran empresa cotizada del mundo.",
            "fecha": "1988-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0069-ap-01-it-01",
            "apartado_id": "pod-0069-ap-01",
            "tipo": "evento",
            "titulo": "Presencia estructural en España",
            "contenido": "Declara participaciones significativas en la mayoría del IBEX 35 (Santander, BBVA, Iberdrola, Telefónica, Inditex…). Sus criterios de gobernanza y sostenibilidad marcan tendencia y su voto es decisivo en operaciones como la OPA del BBVA sobre el Sabadell.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0069-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0069-ap-02-it-00",
            "apartado_id": "pod-0069-ap-02",
            "tipo": "dato",
            "titulo": "Poder silencioso",
            "contenido": "No gestiona empresas, pero su peso accionarial agregado le da una influencia estructural sobre los consejos. Combina exigencia de rentabilidad con políticas de voto en sostenibilidad y gobierno corporativo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobernanza",
              "voto-junta",
              "sostenibilidad"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0069-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0069-ap-03-it-00",
            "apartado_id": "pod-0069-ap-03",
            "tipo": "contacto",
            "titulo": "banco-santander",
            "contenido": "**Accionista institucional de referencia** (nota +7/10) — Figura entre los mayores accionistas del primer banco español; su voto pesa en la reelección del consejo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0069-ap-03-it-01",
            "apartado_id": "pod-0069-ap-03",
            "tipo": "contacto",
            "titulo": "bbva",
            "contenido": "**Gran accionista institucional** (nota +7/10) — Posición relevante; clave en operaciones corporativas como la OPA sobre Sabadell.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0069-ap-03-it-02",
            "apartado_id": "pod-0069-ap-03",
            "tipo": "contacto",
            "titulo": "iberdrola",
            "contenido": "**Accionista de referencia** (nota +7/10) — Uno de los mayores tenedores institucionales de la primera eléctrica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0069-ap-03-it-03",
            "apartado_id": "pod-0069-ap-03",
            "tipo": "contacto",
            "titulo": "telefonica",
            "contenido": "**Accionista institucional** (nota +6/10) — Posición relevante junto a la SEPI y CriteriaCaixa en el capital de la teleco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0070",
    "slug": "norges-bank",
    "nombre_completo": "Norges Bank Investment Management (Fondo soberano de Noruega)",
    "alias": "Fondo de Noruega",
    "cargo_actual": "Mayor fondo soberano del mundo · accionista relevante del IBEX",
    "partido": null,
    "foto_url": null,
    "bio_corta": "El fondo soberano noruego, el mayor del mundo, gestiona el ahorro petrolero del país invirtiéndolo en miles de empresas cotizadas. En España mantiene participaciones declarables en buena parte del IBEX 35. Es conocido por su activismo en sostenibilidad y por excluir de su cartera empresas que vulneran sus criterios éticos.",
    "tags": [
      "fondo",
      "fondo-soberano",
      "inversion",
      "ibex",
      "internacional",
      "no-electo"
    ],
    "fuente_principal": "https://www.nbim.no",
    "apartados": [
      {
        "id": "pod-0070-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0070-ap-00-it-00",
            "apartado_id": "pod-0070-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Vehículo que invierte los ingresos del petróleo noruego en renta variable global. Posee pequeñas pero significativas participaciones en la mayoría de grandes cotizadas, lo que agregado lo convierte en un accionista de peso.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0070-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0070-ap-01-it-00",
            "apartado_id": "pod-0070-ap-01",
            "tipo": "dato",
            "titulo": "Activismo ético",
            "contenido": "Publica su lista de exclusiones por criterios medioambientales, de derechos humanos o de armamento, y vota activamente en las juntas. Su salida del capital de una empresa es una señal reputacional potente.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "esg",
              "exclusiones",
              "voto-junta"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0070-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0070-ap-02-it-00",
            "apartado_id": "pod-0070-ap-02",
            "tipo": "contacto",
            "titulo": "blackrock",
            "contenido": "**Par entre los grandes institucionales** (nota +3/10) — Junto a las grandes gestoras, conforma el bloque de inversores internacionales que marca la gobernanza del IBEX.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0070-ap-02-it-01",
            "apartado_id": "pod-0070-ap-02",
            "tipo": "contacto",
            "titulo": "iberdrola",
            "contenido": "**Accionista internacional relevante** (nota +6/10) — La apuesta renovable de la eléctrica encaja con sus criterios de inversión sostenible.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0070-ap-02-it-02",
            "apartado_id": "pod-0070-ap-02",
            "tipo": "contacto",
            "titulo": "Empresas del IBEX 35",
            "contenido": "**Accionista transversal** (nota +5/10) — Participaciones declarables en gran parte del índice; su criterio ESG influye en las políticas corporativas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0071",
    "slug": "nacho-cardero",
    "nombre_completo": "Nacho Cardero",
    "alias": "Cardero",
    "cargo_actual": "Director de El Confidencial",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de El Confidencial, uno de los diarios nativos digitales más influyentes de España, especializado en información económica, política y de investigación. Su redacción ha destapado numerosos escándalos y marca agenda en los despachos del poder económico y político.",
    "tags": [
      "medios",
      "periodista",
      "digital",
      "investigacion",
      "no-electo"
    ],
    "fuente_principal": "https://www.elconfidencial.com",
    "apartados": [
      {
        "id": "pod-0071-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0071-ap-00-it-00",
            "apartado_id": "pod-0071-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Nacho Cardero es director de El Confidencial, uno de los principales diarios digitales españoles, nacido como nativo digital y especializado en información económica, política y de investigación. Bajo su dirección, el medio —editado por Titania— se ha consolidado entre los más leídos del país y ha publicado algunas de las exclusivas e investigaciones periodísticas de mayor impacto de la última década.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0071-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0071-ap-01-it-00",
            "apartado_id": "pod-0071-ap-01",
            "tipo": "evento",
            "titulo": "Periodista económico",
            "contenido": "Desarrolló su carrera en el periodismo económico y de investigación en distintas redacciones antes de incorporarse a El Confidencial en sus primeros años como diario digital de referencia.",
            "fecha": "2005-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0071-ap-01-it-01",
            "apartado_id": "pod-0071-ap-01",
            "tipo": "evento",
            "titulo": "Director de El Confidencial",
            "contenido": "Asumió la dirección del medio en 2011 y lo consolidó como uno de los digitales más leídos e influyentes de España, con una potente unidad de investigación y datos.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0071-ap-01-it-02",
            "apartado_id": "pod-0071-ap-01",
            "tipo": "evento",
            "titulo": "Grandes investigaciones",
            "contenido": "Bajo su mandato, El Confidencial ha participado en investigaciones internacionales de enorme repercusión —como los Papeles de Panamá, Football Leaks o la lista Falciani— y ha publicado exclusivas sobre corrupción política y financiera.",
            "fecha": "2016-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0071-ap-01-it-03",
            "apartado_id": "pod-0071-ap-01",
            "tipo": "evento",
            "titulo": "Periodismo de investigación de referencia",
            "contenido": "El medio ha recibido reconocimientos del sector y se ha situado como actor central del periodismo de datos en español, lo que ha llevado a Cardero a enfrentarse con frecuencia a poderes políticos y económicos por sus publicaciones.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0071-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0071-ap-02-it-00",
            "apartado_id": "pod-0071-ap-02",
            "tipo": "dato",
            "titulo": "Línea editorial",
            "contenido": "Liberal en lo económico, independiente en lo político, con vocación de fiscalización del poder. Cuida especialmente la información de mercados y grandes fortunas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "independiente",
              "economia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0071-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0071-ap-03-it-00",
            "apartado_id": "pod-0071-ap-03",
            "tipo": "contacto",
            "titulo": "ignacio-escolar",
            "contenido": "**Competidor en el digital nativo** (nota -2/10) — El Confidencial y elDiario.es compiten por la audiencia digital, con líneas editoriales distintas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0071-ap-03-it-01",
            "apartado_id": "pod-0071-ap-03",
            "tipo": "contacto",
            "titulo": "pedro-jose-ramirez",
            "contenido": "**Rival en periodismo de investigación** (nota -2/10) — El Confidencial y El Español pugnan por las grandes exclusivas y el público de centro-derecha digital.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0072",
    "slug": "javier-moll",
    "nombre_completo": "Javier Moll de Miguel",
    "alias": "Javier Moll",
    "cargo_actual": "Presidente de Prensa Ibérica",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidente de Prensa Ibérica, el mayor grupo de prensa regional de España, propietario de decenas de cabeceras locales y del diario El Periódico de Catalunya y de información económica. Su control de la prensa de proximidad le da una influencia enorme en la opinión pública territorial, donde a menudo se decide el voto.",
    "tags": [
      "medios",
      "prensa",
      "regional",
      "editor",
      "no-electo"
    ],
    "fuente_principal": "https://www.prensaiberica.es",
    "apartados": [
      {
        "id": "pod-0072-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0072-ap-00-it-00",
            "apartado_id": "pod-0072-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Javier Moll de Miguel es presidente de Prensa Ibérica, el mayor grupo de prensa regional de España, propietario de cabeceras como El Periódico de Catalunya, Información de Alicante, La Nueva España, Levante-EMV, Faro de Vigo, Diario de Mallorca o el deportivo Sport, entre muchas otras. Empresario de origen canario, ha construido un imperio de diarios locales que le otorga un peso decisivo en la información de proximidad de toda España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0072-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0072-ap-01-it-00",
            "apartado_id": "pod-0072-ap-01",
            "tipo": "evento",
            "titulo": "De Canarias a la prensa regional",
            "contenido": "Procedente del negocio editorial en Canarias —en torno a cabeceras como La Provincia—, empezó a adquirir diarios provinciales por toda España, construyendo un grupo basado en el liderazgo en mercados locales y regionales.",
            "fecha": "1984-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0072-ap-01-it-01",
            "apartado_id": "pod-0072-ap-01",
            "tipo": "evento",
            "titulo": "Consolidación de Prensa Ibérica",
            "contenido": "Convirtió Prensa Ibérica en uno de los mayores grupos de prensa del país por número de cabeceras, con una red de diarios líderes en sus territorios y una gestión familiar junto a su esposa, Arantza Sarasola, vicepresidenta del grupo.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0072-ap-01-it-02",
            "apartado_id": "pod-0072-ap-01",
            "tipo": "evento",
            "titulo": "La compra del Grupo Zeta",
            "contenido": "En 2019 adquirió el Grupo Zeta, sumando El Periódico de Catalunya y el deportivo Sport a su cartera y reforzando su posición como gigante de la prensa española en pleno desplome de la difusión en papel.",
            "fecha": "2019-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0072-ap-01-it-03",
            "apartado_id": "pod-0072-ap-01",
            "tipo": "evento",
            "titulo": "Transición al digital",
            "contenido": "Ha pilotado la transformación digital del grupo —con el lanzamiento de la marca nacional El Periódico de España y la apuesta por las ediciones online de sus cabeceras—, en un sector golpeado por la caída de ingresos publicitarios y de ventas en quiosco.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0072-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0072-ap-02-it-00",
            "apartado_id": "pod-0072-ap-02",
            "tipo": "dato",
            "titulo": "Poder de proximidad",
            "contenido": "El control de la prensa local es una palanca de influencia política y de captación de publicidad institucional autonómica y municipal, terreno clave en las elecciones de proximidad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "prensa-local",
              "publicidad-institucional"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0072-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0072-ap-03-it-00",
            "apartado_id": "pod-0072-ap-03",
            "tipo": "contacto",
            "titulo": "jose-creuheras",
            "contenido": "**Competidor entre grandes editores** (nota -2/10) — Prensa Ibérica y Planeta/Atresmedia compiten por publicidad y audiencia en distintos formatos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0072-ap-03-it-01",
            "apartado_id": "pod-0072-ap-03",
            "tipo": "contacto",
            "titulo": "Administraciones autonómicas y locales",
            "contenido": "**Interlocutor por la publicidad institucional** (nota +4/10) — Su red de cabeceras le da capacidad de negociación con gobiernos regionales y ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0073",
    "slug": "borja-prado",
    "nombre_completo": "Borja Prado Eulate",
    "alias": "Borja Prado",
    "cargo_actual": "Presidente de Mediaset España",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidente de Mediaset España (Telecinco, Cuatro), uno de los dos grandes grupos audiovisuales privados del país. Antes presidió Endesa durante más de una década. Hombre muy conectado con la élite empresarial y financiera madrileña, combina poder mediático y networking corporativo.",
    "tags": [
      "medios",
      "audiovisual",
      "mediaset",
      "empresario",
      "no-electo"
    ],
    "fuente_principal": "https://www.mediaset.es",
    "apartados": [
      {
        "id": "pod-0073-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0073-ap-00-it-00",
            "apartado_id": "pod-0073-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Borja Prado Eulate es presidente de Mediaset España, el grupo audiovisual propietario de Telecinco y Cuatro, integrado en el holding paneuropeo MFE-MediaForEurope de la familia Berlusconi. Banquero de inversión de larga trayectoria y figura muy conectada con el poder económico español, antes presidió la eléctrica Endesa durante una década, lo que lo sitúa en el cruce entre la gran empresa, las finanzas y los medios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0073-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0073-ap-01-it-00",
            "apartado_id": "pod-0073-ap-01",
            "tipo": "evento",
            "titulo": "Banca de inversión",
            "contenido": "Desarrolló su carrera en la banca de inversión y el asesoramiento de grandes operaciones corporativas, pasando por entidades de prestigio y tejiendo una densa red de relaciones en el IBEX y en los consejos de administración.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0073-ap-01-it-01",
            "apartado_id": "pod-0073-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de Endesa",
            "contenido": "Presidió Endesa entre 2009 y 2019, durante los años de control de la eléctrica por la italiana Enel, ejerciendo de puente entre el accionista transalpino y el establishment empresarial y político español.",
            "fecha": "2009-06-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0073-ap-01-it-02",
            "apartado_id": "pod-0073-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de Mediaset España",
            "contenido": "En 2019 asumió la presidencia de Mediaset España (Telecinco, Cuatro), bajo control de la italiana Mediaset, pilotando la cadena en la dura competencia por la audiencia y la publicidad frente a Atresmedia.",
            "fecha": "2019-04-12",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0073-ap-01-it-03",
            "apartado_id": "pod-0073-ap-01",
            "tipo": "evento",
            "titulo": "La integración en MFE",
            "contenido": "Le ha correspondido gestionar la integración de la filial española en el holding paneuropeo MFE-MediaForEurope, el proyecto de la familia Berlusconi para consolidar sus operaciones audiovisuales en Europa, en pleno debate sobre la concentración de medios.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0073-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0073-ap-02-it-00",
            "apartado_id": "pod-0073-ap-02",
            "tipo": "dato",
            "titulo": "Networking de poder",
            "contenido": "Su valor diferencial es la red de contactos en la alta empresa, la banca y la política, que combina con el poder de agenda de la televisión líder en entretenimiento.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "networking",
              "audiovisual"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0073-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0073-ap-03-it-00",
            "apartado_id": "pod-0073-ap-03",
            "tipo": "contacto",
            "titulo": "ana-rosa-quintana",
            "contenido": "**Estrella de su cadena** (nota +7/10) — Ana Rosa es la cara más influyente de Mediaset; su programa fija agenda matinal y vespertina.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0073-ap-03-it-01",
            "apartado_id": "pod-0073-ap-03",
            "tipo": "contacto",
            "titulo": "jose-creuheras",
            "contenido": "**Competidor directo (Atresmedia)** (nota -3/10) — Mediaset y Atresmedia se reparten el duopolio de la televisión privada y la tarta publicitaria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0073-ap-03-it-02",
            "apartado_id": "pod-0073-ap-03",
            "tipo": "contacto",
            "titulo": "jose-pablo-lopez",
            "contenido": "**Competidor por la audiencia (RTVE)** (nota -2/10) — Mediaset compite con la televisión pública y con Atresmedia por espectadores y publicidad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0074",
    "slug": "gerardo-cuerva",
    "nombre_completo": "Gerardo Cuerva Valdivia",
    "alias": "Cuerva",
    "cargo_actual": "Presidente de CEPYME",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidente de CEPYME, la confederación de la pequeña y mediana empresa, integrada en la CEOE. Representa a la inmensa mayoría del tejido productivo y del empleo privado de España, y es voz central en el diálogo social sobre SMI, morosidad, cotizaciones y carga regulatoria sobre las pymes.",
    "tags": [
      "patronal",
      "pymes",
      "cepyme",
      "dialogo-social",
      "no-electo"
    ],
    "fuente_principal": "https://www.cepyme.es",
    "apartados": [
      {
        "id": "pod-0074-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0074-ap-00-it-00",
            "apartado_id": "pod-0074-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Gerardo Cuerva Valdivia es presidente de CEPYME, la confederación que representa a la pequeña y mediana empresa española, y vicepresidente de la CEOE. Empresario granadino al frente de un grupo familiar del sector eléctrico y energético, es una de las voces patronales de referencia en el diálogo social, especialmente en lo que afecta a los costes laborales, la morosidad y la fiscalidad de las pymes y los autónomos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0074-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0074-ap-01-it-00",
            "apartado_id": "pod-0074-ap-01",
            "tipo": "dato",
            "titulo": "Línea",
            "contenido": "Especialmente crítico con las subidas del SMI desligadas de la productividad, la morosidad de las administraciones y la presión regulatoria y de cotizaciones que, advierte, asfixia a las pymes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "smi",
              "morosidad",
              "cotizaciones"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0074-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0074-ap-02-it-00",
            "apartado_id": "pod-0074-ap-02",
            "tipo": "contacto",
            "titulo": "antonio-garamendi",
            "contenido": "**Integrado en la CEOE** (nota +6/10) — CEPYME forma parte de la gran patronal; coordinan posición ante el Gobierno, aunque las pymes tienen agenda propia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0074-ap-02-it-01",
            "apartado_id": "pod-0074-ap-02",
            "tipo": "contacto",
            "titulo": "Gobierno de España",
            "contenido": "**Interlocutor crítico en el diálogo social** (nota -2/10) — Choca con Trabajo y Hacienda por el SMI, las cotizaciones y la carga administrativa sobre la pequeña empresa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0074-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0074-ap-03-it-00",
            "apartado_id": "pod-0074-ap-03",
            "tipo": "evento",
            "titulo": "Empresario familiar",
            "contenido": "Dirige el Grupo Cuerva, empresa familiar granadina del ámbito de las instalaciones eléctricas y la energía, desde donde dio el salto a la representación de los intereses empresariales.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0074-ap-03-it-01",
            "apartado_id": "pod-0074-ap-03",
            "tipo": "evento",
            "titulo": "Dirigente patronal territorial",
            "contenido": "Se implicó en la representación empresarial desde el ámbito provincial y autonómico, presidiendo organizaciones de su entorno antes de dar el salto a la cúpula confederal.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0074-ap-03-it-02",
            "apartado_id": "pod-0074-ap-03",
            "tipo": "evento",
            "titulo": "Presidente de CEPYME",
            "contenido": "Accedió a la presidencia de CEPYME en 2017, reelegido posteriormente, asumiendo la defensa de los intereses de las pequeñas y medianas empresas, que constituyen el grueso del tejido productivo y del empleo en España.",
            "fecha": "2017-11-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0074-ap-03-it-03",
            "apartado_id": "pod-0074-ap-03",
            "tipo": "evento",
            "titulo": "Voz de las pymes en el diálogo social",
            "contenido": "Participa en la negociación de la reforma laboral, el salario mínimo, las cotizaciones y la lucha contra la morosidad, reclamando que el coste de las nuevas regulaciones no recaiga de forma desproporcionada sobre las empresas más pequeñas.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0075",
    "slug": "santiago-munoz-machado",
    "nombre_completo": "Santiago Muñoz Machado",
    "alias": "Muñoz Machado",
    "cargo_actual": "Director de la Real Academia Española (RAE)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de la Real Academia Española y catedrático de Derecho Administrativo de enorme prestigio. Combina la máxima autoridad sobre la lengua con un peso intelectual y jurídico notable. La RAE, además, dirige la asociación de academias del español, lo que proyecta su influencia a toda Hispanoamérica.",
    "tags": [
      "institucional",
      "rae",
      "cultura",
      "juridico",
      "academia",
      "no-electo"
    ],
    "fuente_principal": "https://www.rae.es",
    "apartados": [
      {
        "id": "pod-0075-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0075-ap-00-it-00",
            "apartado_id": "pod-0075-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Santiago Muñoz Machado (Pozoblanco, Córdoba, 1949) es director de la Real Academia Española (RAE) y una de las máximas autoridades del derecho público en España. Catedrático de Derecho Administrativo, jurista de enorme prestigio y autor de una vastísima obra ensayística e histórica, dirige también la Asociación de Academias de la Lengua Española, que agrupa a las academias del español de todo el mundo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0075-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0075-ap-01-it-00",
            "apartado_id": "pod-0075-ap-01",
            "tipo": "dato",
            "titulo": "Lengua y poder",
            "contenido": "Defiende el valor económico y diplomático del español como activo estratégico de España. Su criterio sobre el lenguaje inclusivo o el uso institucional de la lengua tiene eco político.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "lengua",
              "soft-power",
              "diplomacia-cultural"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0075-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0075-ap-02-it-00",
            "apartado_id": "pod-0075-ap-02",
            "tipo": "contacto",
            "titulo": "Instituto Cervantes y mundo cultural",
            "contenido": "**Eje de la diplomacia cultural** (nota +6/10) — RAE, Cervantes y las academias americanas forman la red del poder blando del español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0075-ap-02-it-01",
            "apartado_id": "pod-0075-ap-02",
            "tipo": "contacto",
            "titulo": "Élite jurídica y académica",
            "contenido": "**Referente del Derecho Administrativo** (nota +5/10) — Su autoridad académica le da peso en debates jurídicos e institucionales del Estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0075-ap-02-it-02",
            "apartado_id": "pod-0075-ap-02",
            "tipo": "contacto",
            "titulo": "candido-conde-pumpido",
            "contenido": "**Par en la élite jurídica** (nota +3/10) — Su prestigio como administrativista lo vincula al mundo de los grandes juristas y de la justicia constitucional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0075-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0075-ap-03-it-00",
            "apartado_id": "pod-0075-ap-03",
            "tipo": "evento",
            "titulo": "Catedrático y jurista",
            "contenido": "Catedrático de Derecho Administrativo en varias universidades, se convirtió en una de las grandes referencias del derecho público español, con obra extensa sobre el Estado autonómico, la Constitución, la regulación económica y la historia del derecho.",
            "fecha": "1980-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0075-ap-03-it-01",
            "apartado_id": "pod-0075-ap-03",
            "tipo": "evento",
            "titulo": "Ensayista y académico",
            "contenido": "Miembro de tres reales academias —la Española, la de Ciencias Morales y Políticas y la de Jurisprudencia—, compaginó la cátedra con una intensa producción que le valió, entre otros, el Premio Nacional de Historia y el Premio Nacional de Ensayo.",
            "fecha": "2013-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0075-ap-03-it-02",
            "apartado_id": "pod-0075-ap-03",
            "tipo": "evento",
            "titulo": "Director de la RAE",
            "contenido": "Fue elegido director de la Real Academia Española en 2018 y reelegido posteriormente, impulsando la sostenibilidad económica de la institución, su proyección digital y los grandes proyectos lexicográficos en línea.",
            "fecha": "2018-12-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0075-ap-03-it-03",
            "apartado_id": "pod-0075-ap-03",
            "tipo": "evento",
            "titulo": "Panhispanismo lingüístico",
            "contenido": "Desde la dirección de la RAE y de la asociación de academias defiende la unidad y el valor del español como lengua global de cientos de millones de hablantes, así como la cooperación con las academias americanas.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0076",
    "slug": "juan-jose-omella",
    "nombre_completo": "Juan José Omella Omella",
    "alias": "Cardenal Omella",
    "cargo_actual": "Cardenal arzobispo de Barcelona · expresidente de la Conferencia Episcopal",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Cardenal arzobispo de Barcelona y expresidente de la Conferencia Episcopal Española. Hombre de confianza del Papa Francisco en España, de perfil pastoral y social, ha pilotado la respuesta de la Iglesia española a asuntos delicados como los abusos y la financiación. Una de las máximas autoridades morales del catolicismo español.",
    "tags": [
      "iglesia",
      "religion",
      "cardenal",
      "no-electo"
    ],
    "fuente_principal": "https://www.conferenciaepiscopal.es",
    "apartados": [
      {
        "id": "pod-0076-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0076-ap-00-it-00",
            "apartado_id": "pod-0076-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Juan José Omella Omella (Cretas, Teruel, 1946) es cardenal arzobispo de Barcelona y una de las grandes figuras de la Iglesia católica en España. Creado cardenal por el papa Francisco, presidió la Conferencia Episcopal Española entre 2020 y 2024 y forma parte del Dicasterio para los Obispos del Vaticano, encarnando una línea pastoral próxima al magisterio social del pontífice argentino.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0076-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0076-ap-01-it-00",
            "apartado_id": "pod-0076-ap-01",
            "tipo": "dato",
            "titulo": "Línea pastoral",
            "contenido": "De sensibilidad social y diálogo, más cercano al perfil de Francisco que al ala conservadora. Ha gestionado la relación con el Gobierno en asuntos como abusos, inmatriculaciones y financiación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "doctrina-social",
              "dialogo"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0076-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0076-ap-02-it-00",
            "apartado_id": "pod-0076-ap-02",
            "tipo": "contacto",
            "titulo": "luis-arguello",
            "contenido": "**Sucesor al frente de la Conferencia Episcopal** (nota +5/10) — Omella presidió la CEE; Argüello continúa la representación institucional de los obispos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0076-ap-02-it-01",
            "apartado_id": "pod-0076-ap-02",
            "tipo": "contacto",
            "titulo": "Vaticano (Papa Francisco)",
            "contenido": "**Hombre de confianza pontificia** (nota +7/10) — Su cercanía a Roma refuerza su autoridad dentro de la Iglesia española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0076-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0076-ap-03-it-00",
            "apartado_id": "pod-0076-ap-03",
            "tipo": "evento",
            "titulo": "Sacerdote y misionero",
            "contenido": "Ordenado sacerdote en 1970, ejerció el ministerio en parroquias de la diócesis de Zaragoza y como misionero en África (Zaire), forjando un perfil pastoral cercano a los más desfavorecidos.",
            "fecha": "1970-09-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0076-ap-03-it-01",
            "apartado_id": "pod-0076-ap-03",
            "tipo": "evento",
            "titulo": "Obispo y arzobispo de Barcelona",
            "contenido": "Fue obispo de Barbastro-Monzón y de Calahorra y La Calzada-Logroño antes de ser nombrado arzobispo de Barcelona en 2015 por el papa Francisco, que lo creó cardenal en 2017.",
            "fecha": "2015-11-06",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0076-ap-03-it-02",
            "apartado_id": "pod-0076-ap-03",
            "tipo": "evento",
            "titulo": "Presidente de la Conferencia Episcopal",
            "contenido": "Presidió la Conferencia Episcopal Española entre 2020 y 2024, en años marcados por la pandemia, el debate sobre los abusos en la Iglesia y la tensa relación con un Gobierno de coalición de izquierdas, manteniendo un tono de diálogo institucional.",
            "fecha": "2020-03-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0076-ap-03-it-03",
            "apartado_id": "pod-0076-ap-03",
            "tipo": "evento",
            "titulo": "Peso en el Vaticano",
            "contenido": "Como miembro del Dicasterio para los Obispos, el organismo que asesora al Papa en el nombramiento de obispos en todo el mundo, es una de las voces españolas con mayor influencia en la Curia romana.",
            "fecha": "2017-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0077",
    "slug": "tomas-fuertes",
    "nombre_completo": "Tomás Fuertes Fernández",
    "alias": "Tomás Fuertes",
    "cargo_actual": "Presidente del Grupo Fuertes (ElPozo)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario murciano, fundador y presidente del Grupo Fuertes, propietario de ElPozo Alimentación, uno de los mayores grupos cárnicos y agroalimentarios de España. Una de las grandes fortunas y patriarcas empresariales del sureste, con diversificación en inmobiliario, energía y banca.",
    "tags": [
      "empresario",
      "alimentacion",
      "carnico",
      "agro",
      "no-electo"
    ],
    "fuente_principal": "https://www.grupofuertes.com",
    "apartados": [
      {
        "id": "pod-0077-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0077-ap-00-it-00",
            "apartado_id": "pod-0077-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Tomás Fuertes Fernández (Alhama de Murcia, 1933) es el fundador y presidente del Grupo Fuertes, el conglomerado agroalimentario murciano dueño de ElPozo Alimentación, uno de los mayores grupos cárnicos y de alimentación de España. Empresario hecho a sí mismo, construyó desde una pequeña carnicería familiar un imperio industrial que da empleo a miles de personas y es una de las grandes fortunas del país.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0077-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0077-ap-01-it-00",
            "apartado_id": "pod-0077-ap-01",
            "tipo": "dato",
            "titulo": "Peso agroalimentario",
            "contenido": "El sector cárnico es un pilar exportador de la economía española y objeto de debate por su impacto ambiental y laboral; Fuertes es uno de sus rostros más visibles.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "exportacion",
              "agroindustria"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0077-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0077-ap-02-it-00",
            "apartado_id": "pod-0077-ap-02",
            "tipo": "contacto",
            "titulo": "Distribución y gran consumo",
            "contenido": "**Proveedor del gran retail** (nota +5/10) — ElPozo es proveedor de referencia de las grandes cadenas de distribución, Mercadona incluida.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0077-ap-02-it-01",
            "apartado_id": "pod-0077-ap-02",
            "tipo": "contacto",
            "titulo": "Tejido empresarial murciano",
            "contenido": "**Patriarca económico regional** (nota +6/10) — Referente del empresariado del sureste, con influencia en su tejido económico e institucional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0077-ap-02-it-02",
            "apartado_id": "pod-0077-ap-02",
            "tipo": "contacto",
            "titulo": "instituto-empresa-familiar",
            "contenido": "**Gran empresa familiar** (nota +5/10) — El Grupo Fuertes es arquetipo de la multinacional familiar que defiende el Instituto de la Empresa Familiar ante el fisco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "pod-0077-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0077-ap-03-it-00",
            "apartado_id": "pod-0077-ap-03",
            "tipo": "evento",
            "titulo": "De la carnicería familiar a ElPozo",
            "contenido": "Procedente de una familia de tratantes de ganado y carniceros, transformó el negocio familiar en una industria cárnica moderna, fundando en los años cincuenta lo que se convertiría en ElPozo Alimentación.",
            "fecha": "1954-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0077-ap-03-it-01",
            "apartado_id": "pod-0077-ap-03",
            "tipo": "evento",
            "titulo": "Diversificación del Grupo Fuertes",
            "contenido": "Amplió el grupo más allá de la carne, con presencia en alimentación, distribución, inmobiliario, energía y otros sectores, manteniendo el carácter familiar y la sede en la Región de Murcia.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0077-ap-03-it-02",
            "apartado_id": "pod-0077-ap-03",
            "tipo": "evento",
            "titulo": "Uno de los grandes de la alimentación",
            "contenido": "El Grupo Fuertes se consolidó como uno de los mayores grupos agroalimentarios españoles, con ElPozo como marca de gran consumo de referencia, pese a las polémicas periódicas sobre la ganadería intensiva.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0077-ap-03-it-03",
            "apartado_id": "pod-0077-ap-03",
            "tipo": "evento",
            "titulo": "Legado familiar",
            "contenido": "Con más de nueve décadas de vida, mantiene la presidencia del grupo y ha articulado su sucesión en el seno de la familia, preservando el control murciano de uno de los mayores grupos privados de alimentación del país.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0078",
    "slug": "carlos-slim",
    "nombre_completo": "Carlos Slim Helú",
    "alias": "Carlos Slim",
    "cargo_actual": "Magnate mexicano · gran accionista en España (FCC, Realia)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Magnate mexicano de las telecomunicaciones (América Móvil) y una de las mayores fortunas del mundo. En España es accionista de control de FCC (construcción y servicios) y de la inmobiliaria Realia, además de haber tenido posiciones en otras cotizadas. Su entrada marcó la internacionalización del capital de grandes empresas españolas.",
    "tags": [
      "empresario",
      "inversion",
      "construccion",
      "inmobiliario",
      "internacional",
      "no-electo"
    ],
    "fuente_principal": "https://www.fcc.es",
    "apartados": [
      {
        "id": "pod-0078-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0078-ap-00-it-00",
            "apartado_id": "pod-0078-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Carlos Slim Helú (Ciudad de México, 1940) es un magnate mexicano de origen libanés, una de las mayores fortunas del mundo y el inversor extranjero con mayor peso en la empresa española. Construyó un colosal conglomerado en torno a las telecomunicaciones (América Móvil) que durante años lo situó como el hombre más rico del planeta. En España es accionista de control de la constructora FCC y de la inmobiliaria Realia, además de haber mantenido participaciones en otras grandes cotizadas, lo que lo convierte en una pieza relevante del capitalismo español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0078-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0078-ap-01-it-00",
            "apartado_id": "pod-0078-ap-01",
            "tipo": "evento",
            "titulo": "El imperio América Móvil",
            "contenido": "Inversor con olfato para las empresas en dificultades, construyó un conglomerado en torno a la mexicana Telmex y América Móvil, el mayor operador de telecomunicaciones de Latinoamérica, que lo situó durante años como el hombre más rico del mundo.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0078-ap-01-it-01",
            "apartado_id": "pod-0078-ap-01",
            "tipo": "evento",
            "titulo": "Diversificación global",
            "contenido": "Su grupo Carso diversificó en construcción, minería, banca, comercio e infraestructuras, con inversiones en medios (llegó a ser primer accionista de The New York Times) y en empresas de medio mundo.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0078-ap-01-it-02",
            "apartado_id": "pod-0078-ap-01",
            "tipo": "evento",
            "titulo": "Desembarco en España",
            "contenido": "Tras la crisis financiera, aprovechó los precios deprimidos para tomar el control de FCC (construcción y servicios urbanos) y de Realia, desplazando a la familia Koplowitz, y entró en otras cotizadas españolas.",
            "fecha": "2014-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0078-ap-01-it-03",
            "apartado_id": "pod-0078-ap-01",
            "tipo": "evento",
            "titulo": "Inversor de referencia",
            "contenido": "Mantiene una posición de inversor extranjero de primer orden en España a través de FCC y Realia, con intereses en infraestructuras, agua, residuos e inmobiliario, atento a nuevas oportunidades en el mercado español.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0078-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0078-ap-02-it-00",
            "apartado_id": "pod-0078-ap-02",
            "tipo": "contacto",
            "titulo": "FCC y Realia",
            "contenido": "**Accionista de control** (nota +9/10) — Domina la construcción, los servicios urbanos y el negocio inmobiliario de ambas cotizadas españolas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0078-ap-02-it-01",
            "apartado_id": "pod-0078-ap-02",
            "tipo": "contacto",
            "titulo": "alicia-koplowitz",
            "contenido": "**Relevo en el accionariado de FCC** (nota -2/10) — Slim sucedió a la familia Koplowitz en el control de FCC, cierre de una etapa histórica del grupo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0078-ap-02-it-02",
            "apartado_id": "pod-0078-ap-02",
            "tipo": "contacto",
            "titulo": "telefonica",
            "contenido": "**Rival histórico en Latinoamérica** (nota -3/10) — Su América Móvil y Telefónica han competido ferozmente por el mercado latinoamericano de telecomunicaciones durante décadas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0079",
    "slug": "oscar-pierre",
    "nombre_completo": "Oscar Pierre",
    "alias": "Oscar Pierre",
    "cargo_actual": "Fundador y CEO de Glovo",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Cofundador y consejero delegado de Glovo, la plataforma de reparto a domicilio nacida en Barcelona y hoy integrada en el grupo alemán Delivery Hero. Símbolo de la nueva economía digital española, está en el centro del debate sobre los derechos de los riders y la 'ley rider' impulsada por el Ministerio de Trabajo.",
    "tags": [
      "empresario",
      "tecnologia",
      "startup",
      "gig-economy",
      "no-electo"
    ],
    "fuente_principal": "https://about.glovoapp.com",
    "apartados": [
      {
        "id": "pod-0079-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0079-ap-00-it-00",
            "apartado_id": "pod-0079-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Oscar Pierre Prats (Barcelona, 1992) es cofundador y consejero delegado de Glovo, la plataforma de reparto a domicilio nacida en Barcelona y convertida en una de las grandes 'apps' de delivery del sur de Europa, África y América Latina. Uno de los emprendedores tecnológicos españoles de mayor proyección, ha protagonizado además el intenso debate sobre el modelo laboral de los repartidores ('riders') y la economía de plataformas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0079-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0079-ap-01-it-00",
            "apartado_id": "pod-0079-ap-01",
            "tipo": "dato",
            "titulo": "Economía de plataformas",
            "contenido": "Defiende el modelo de autónomos para los repartidores frente a la presión regulatoria por considerarlos asalariados. El choque con la 'ley rider' define su relación con el poder político.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "riders",
              "autonomos",
              "plataformas"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0079-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0079-ap-02-it-00",
            "apartado_id": "pod-0079-ap-02",
            "tipo": "contacto",
            "titulo": "Ministerio de Trabajo",
            "contenido": "**Pulso por la ley rider** (nota -4/10) — La regulación que obliga a laboralizar a los repartidores enfrenta a Glovo con Trabajo; sanciones e inspecciones de por medio.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0079-ap-02-it-01",
            "apartado_id": "pod-0079-ap-02",
            "tipo": "contacto",
            "titulo": "Ecosistema startup español",
            "contenido": "**Referente del emprendimiento** (nota +6/10) — Glovo es uno de los pocos 'unicornios' españoles; modelo y escuela de talento para la nueva economía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0079-ap-03",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0079-ap-03-it-00",
            "apartado_id": "pod-0079-ap-03",
            "tipo": "controversia",
            "titulo": "Conflicto laboral por los riders",
            "contenido": "Glovo ha acumulado inspecciones, sanciones y litigios por el encaje laboral de sus repartidores. Los procedimientos siguen su curso y, salvo resolución firme, rige la presunción de inocencia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ley-rider",
              "litigios",
              "presuncion-inocencia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0079-ap-04",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0079-ap-04-it-00",
            "apartado_id": "pod-0079-ap-04",
            "tipo": "evento",
            "titulo": "Fundación de Glovo",
            "contenido": "Ingeniero aeronáutico de formación, cofundó Glovo en 2015 como una aplicación de recados y reparto inmediato, que creció rápidamente hasta convertirse en un referente del comercio rápido (quick commerce).",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0079-ap-04-it-01",
            "apartado_id": "pod-0079-ap-04",
            "tipo": "evento",
            "titulo": "Crecimiento y compra por Delivery Hero",
            "contenido": "Lideró la expansión internacional de Glovo y su financiación con grandes rondas de inversión, hasta que el gigante alemán Delivery Hero tomó el control de la compañía, que mantuvo su sede y marca en Barcelona.",
            "fecha": "2022-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0079-ap-04-it-02",
            "apartado_id": "pod-0079-ap-04",
            "tipo": "evento",
            "titulo": "La batalla de los 'riders'",
            "contenido": "Glovo ha estado en el centro del debate sobre la 'ley rider' y la laboralidad de los repartidores, con sanciones e inspecciones de Trabajo y resoluciones judiciales que cuestionaron su modelo de autónomos.",
            "fecha": "2021-08-12",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0079-ap-04-it-03",
            "apartado_id": "pod-0079-ap-04",
            "tipo": "evento",
            "titulo": "Emprendimiento tecnológico",
            "contenido": "Es uno de los rostros del ecosistema emprendedor y tecnológico español, símbolo tanto del éxito de las startups nacionales como de las tensiones regulatorias y laborales de la economía de plataformas.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0080",
    "slug": "christine-lagarde",
    "nombre_completo": "Christine Lagarde",
    "alias": "Lagarde",
    "cargo_actual": "Presidenta del Banco Central Europeo (BCE)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidenta del Banco Central Europeo, la institución que fija la política monetaria del euro. Sus decisiones sobre los tipos de interés condicionan directamente las hipotecas de los españoles, los márgenes de la banca y el coste de la deuda pública del Estado. Aunque no es española, su poder sobre la economía de España es de primer orden.",
    "tags": [
      "institucional",
      "bce",
      "regulador",
      "internacional",
      "no-electo"
    ],
    "fuente_principal": "https://www.ecb.europa.eu",
    "apartados": [
      {
        "id": "pod-0080-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0080-ap-00-it-00",
            "apartado_id": "pod-0080-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Christine Lagarde (París, 1 de enero de 1956) es presidenta del Banco Central Europeo desde 2019. Abogada de formación, ha sido ministra de Economía de Francia y directora gerente del FMI. Aunque no es española, sus decisiones sobre los tipos de interés del euro condicionan directamente las hipotecas, la banca y la deuda de España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0080-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0080-ap-01-it-00",
            "apartado_id": "pod-0080-ap-01",
            "tipo": "evento",
            "titulo": "De la abogacía a la política francesa",
            "contenido": "Abogada especializada en derecho mercantil y laboral, presidió el bufete internacional Baker McKenzie en Chicago antes de regresar a Francia para la política. Fue ministra de Comercio y, desde 2007, ministra de Economía, la primera mujer en ese cargo en un país del G7.",
            "fecha": "2007-06-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0080-ap-01-it-01",
            "apartado_id": "pod-0080-ap-01",
            "tipo": "evento",
            "titulo": "Directora gerente del FMI",
            "contenido": "En 2011 asumió la dirección del Fondo Monetario Internacional, donde gestionó las réplicas de la crisis de deuda europea —Grecia incluida— y consolidó su perfil de gran gestora de la economía global.",
            "fecha": "2011-07-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0080-ap-01-it-02",
            "apartado_id": "pod-0080-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta del BCE",
            "contenido": "En noviembre de 2019 se convirtió en la primera mujer al frente del Banco Central Europeo. Afrontó la pandemia con un programa masivo de compra de deuda (PEPP) que protegió a países como España, y después el repunte de inflación tras la guerra de Ucrania.",
            "fecha": "2019-11-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0080-ap-01-it-03",
            "apartado_id": "pod-0080-ap-01",
            "tipo": "evento",
            "titulo": "La era de las subidas de tipos",
            "contenido": "Entre 2022 y 2023 lideró el ciclo de subidas de tipos más rápido de la historia del euro para domar la inflación. La medida encareció las hipotecas y el crédito de millones de españoles, pero disparó los beneficios de la banca; en paralelo, su 'escudo antifragmentación' protegió la deuda del sur frente a la especulación.",
            "fecha": "2022-07-21",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0080-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0080-ap-02-it-00",
            "apartado_id": "pod-0080-ap-02",
            "tipo": "dato",
            "titulo": "Guardiana del euro",
            "contenido": "Equilibra el control de la inflación con la estabilidad financiera y la prima de riesgo de los países del sur. Su escudo antifragmentación protege la deuda española de ataques especulativos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "inflacion",
              "prima-de-riesgo",
              "estabilidad"
            ],
            "orden": 0
          },
          {
            "id": "pod-0080-ap-02-it-01",
            "apartado_id": "pod-0080-ap-02",
            "tipo": "dato",
            "titulo": "Estabilidad de precios y del euro",
            "contenido": "Su mandato es la estabilidad de precios, pero equilibra el control de la inflación con la cohesión del euro y la estabilidad financiera. Sus decisiones tienen un impacto directo y cotidiano sobre la economía de las familias y las empresas españolas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "inflacion",
              "tipos",
              "euro"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0080-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0080-ap-03-it-00",
            "apartado_id": "pod-0080-ap-03",
            "tipo": "contacto",
            "titulo": "jose-luis-escriva",
            "contenido": "**Miembro de su consejo de gobierno** (nota +6/10) — Como gobernador del Banco de España, Escrivá vota en el BCE; canal directo de España en la política monetaria del euro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0080-ap-03-it-01",
            "apartado_id": "pod-0080-ap-03",
            "tipo": "contacto",
            "titulo": "banco-santander",
            "contenido": "**Sujeto a su política monetaria y supervisión** (nota +5/10) — Los tipos del BCE y la supervisión única marcan los márgenes y la solvencia del primer banco español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0080-ap-03-it-02",
            "apartado_id": "pod-0080-ap-03",
            "tipo": "contacto",
            "titulo": "Tesoro Público de España",
            "contenido": "**Compra de deuda y prima de riesgo** (nota +6/10) — Las decisiones del BCE sobre compras de bonos condicionan el coste de financiación del Estado español.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0081",
    "slug": "ignacio-garralda",
    "nombre_completo": "Ignacio Garralda Ruiz de Velasco",
    "alias": "Garralda",
    "cargo_actual": "Presidente de Mutua Madrileña",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidente del Grupo Mutua Madrileña, una de las mayores aseguradoras de España y un inversor institucional de peso. Mutua es accionista de referencia de El Corte Inglés y socio en distintos negocios financieros. Garralda, con pasado en la banca de inversión, es una figura muy influyente en el establishment económico madrileño.",
    "tags": [
      "empresario",
      "seguros",
      "inversion",
      "mutua",
      "no-electo"
    ],
    "fuente_principal": "https://www.mutua.es",
    "apartados": [
      {
        "id": "pod-0081-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0081-ap-00-it-00",
            "apartado_id": "pod-0081-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Ignacio Garralda Ruiz de Velasco es presidente y consejero delegado del Grupo Mutua Madrileña, una de las mayores aseguradoras de España y un relevante inversor institucional, con participaciones en empresas como BME o el negocio asegurador de El Corte Inglés. Procedente de la banca de negocios, dirige una mutua sin accionistas que reparte sus beneficios entre los mutualistas y es una voz influyente del sector financiero.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0081-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0081-ap-01-it-00",
            "apartado_id": "pod-0081-ap-01",
            "tipo": "dato",
            "titulo": "Asegurador-inversor",
            "contenido": "Combina el negocio asegurador con una cartera de participaciones financieras e inmobiliarias que le da entrada en los consejos de grandes empresas y proyectos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "seguros",
              "cartera"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0081-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0081-ap-02-it-00",
            "apartado_id": "pod-0081-ap-02",
            "tipo": "contacto",
            "titulo": "marta-alvarez",
            "contenido": "**Socio accionista de El Corte Inglés** (nota +7/10) — Mutua Madrileña entró en el capital de El Corte Inglés y en su negocio de seguros, alianza clave para ambos grupos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0081-ap-02-it-01",
            "apartado_id": "pod-0081-ap-02",
            "tipo": "contacto",
            "titulo": "Gran banca española",
            "contenido": "**Socio en bancaseguros y coinversión** (nota +5/10) — Mutua participa en alianzas de seguros y coinversión con la gran banca.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0081-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0081-ap-03-it-00",
            "apartado_id": "pod-0081-ap-03",
            "tipo": "evento",
            "titulo": "Banca de negocios y mercados",
            "contenido": "Desarrolló su carrera en la banca de inversión y los mercados de valores, vinculado durante años a entidades financieras y al mercado bursátil español.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0081-ap-03-it-01",
            "apartado_id": "pod-0081-ap-03",
            "tipo": "evento",
            "titulo": "Presidente de Mutua Madrileña",
            "contenido": "Asumió la presidencia de Mutua Madrileña, aseguradora de carácter mutual (sin accionistas, propiedad de sus asegurados), líder en el seguro del automóvil y en plena diversificación.",
            "fecha": "2008-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0081-ap-03-it-02",
            "apartado_id": "pod-0081-ap-03",
            "tipo": "evento",
            "titulo": "Inversor institucional y diversificación",
            "contenido": "Bajo su mando, Mutua diversificó hacia salud, vida y gestión de activos, y tomó participaciones estratégicas —como la mitad del negocio de seguros de El Corte Inglés o gestoras de fondos—, ganando peso como inversor institucional español.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0081-ap-03-it-03",
            "apartado_id": "pod-0081-ap-03",
            "tipo": "evento",
            "titulo": "Voz del seguro y la empresa",
            "contenido": "Es una voz influyente del sector asegurador y financiero y participa en patronales y foros empresariales, defendiendo el ahorro privado y el papel del seguro ante retos como la longevidad o los riesgos climáticos.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0082",
    "slug": "demetrio-carceller",
    "nombre_completo": "Demetrio Carceller Arce",
    "alias": "Carceller",
    "cargo_actual": "Presidente de Damm · accionista de Sacyr y Disa",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario que preside la cervecera Damm (Estrella Damm) y controla el grupo energético canario Disa, además de ser accionista de referencia y consejero de la constructora Sacyr. Heredero de una saga empresarial, combina cerveza, energía y construcción en uno de los conglomerados familiares más potentes y discretos del país.",
    "tags": [
      "empresario",
      "alimentacion",
      "energia",
      "construccion",
      "no-electo"
    ],
    "fuente_principal": "https://www.damm.com",
    "apartados": [
      {
        "id": "pod-0082-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0082-ap-00-it-00",
            "apartado_id": "pod-0082-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Demetrio Carceller Arce es presidente del Grupo Damm, la cervecera catalana dueña de Estrella Damm, y figura central del grupo energético Disa (distribución de combustibles), entre otros negocios familiares. Heredero de una de las grandes sagas empresariales españolas, controla un conglomerado que abarca cerveza, energía, alimentación y participaciones industriales, y mantiene un perfil público discreto pese a su enorme peso económico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0082-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0082-ap-01-it-00",
            "apartado_id": "pod-0082-ap-01",
            "tipo": "dato",
            "titulo": "Conglomerado diversificado",
            "contenido": "Su poder reside en la diversificación: consumo, energía e infraestructuras. La participación en Sacyr lo conecta con la obra pública y las concesiones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "diversificacion",
              "concesiones"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0082-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0082-ap-02-it-00",
            "apartado_id": "pod-0082-ap-02",
            "tipo": "contacto",
            "titulo": "Sacyr",
            "contenido": "**Accionista de referencia y consejero** (nota +7/10) — Su peso en la constructora lo vincula a las grandes concesiones de infraestructuras y a la obra pública.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0082-ap-02-it-01",
            "apartado_id": "pod-0082-ap-02",
            "tipo": "contacto",
            "titulo": "Sector energético",
            "contenido": "**Distribución de combustibles (Disa)** (nota +6/10) — Disa es operador dominante en Canarias y actor relevante del mercado de carburantes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0082-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0082-ap-03-it-00",
            "apartado_id": "pod-0082-ap-03",
            "tipo": "evento",
            "titulo": "La saga Carceller",
            "contenido": "Heredero de una influyente familia empresarial, se incorporó a la gestión de los negocios familiares, articulados en torno a la cervecera Damm y al grupo de distribución de combustibles Disa.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0082-ap-03-it-01",
            "apartado_id": "pod-0082-ap-03",
            "tipo": "evento",
            "titulo": "Presidente de Damm",
            "contenido": "Preside el Grupo Damm, al que ha expandido más allá de la cerveza Estrella Damm hacia el agua, la alimentación, la logística y la distribución, consolidándolo como uno de los grandes grupos de gran consumo de España.",
            "fecha": "2004-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0082-ap-03-it-02",
            "apartado_id": "pod-0082-ap-03",
            "tipo": "evento",
            "titulo": "Energía e inversiones",
            "contenido": "A través de Disa y otras sociedades, la familia mantiene un peso relevante en el sector energético (estaciones de servicio, combustibles) y participaciones en cotizadas, lo que sitúa a Carceller entre los empresarios más poderosos del país.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0082-ap-03-it-03",
            "apartado_id": "pod-0082-ap-03",
            "tipo": "evento",
            "titulo": "Discreción y poder",
            "contenido": "Pese a su bajo perfil mediático, su presencia en consejos de administración de empresas cotizadas y una de las mayores fortunas familiares de España lo convierten en un actor de primer orden, repartido entre cerveza, energía e inversiones.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0083",
    "slug": "jaume-roures",
    "nombre_completo": "Jaume Roures Llop",
    "alias": "Roures",
    "cargo_actual": "Fundador de Mediapro",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Fundador del Grupo Mediapro, gigante de la producción audiovisual y de los derechos del fútbol. Productor de cine y televisión de marcado perfil progresista, ha sido pieza clave en la guerra de los derechos televisivos del fútbol y un actor de influencia en el espacio mediático de la izquierda.",
    "tags": [
      "medios",
      "audiovisual",
      "produccion",
      "futbol",
      "no-electo"
    ],
    "fuente_principal": "https://www.mediapro.tv",
    "apartados": [
      {
        "id": "pod-0083-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0083-ap-00-it-00",
            "apartado_id": "pod-0083-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Jaume Roures Llop (Barcelona, 1950) es uno de los grandes productores audiovisuales de España, cofundador de Mediapro (grupo Imagina). De pasado militante en la izquierda trotskista, construyó un imperio de producción de cine, televisión y, sobre todo, derechos deportivos, con proyección internacional y una estrecha relación con causas progresistas y con el soberanismo catalán.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0083-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0083-ap-01-it-00",
            "apartado_id": "pod-0083-ap-01",
            "tipo": "evento",
            "titulo": "Militancia y entrada en los medios",
            "contenido": "Con un pasado en la izquierda revolucionaria (Liga Comunista Revolucionaria), entró en el sector audiovisual y de la comunicación, vinculándose a proyectos televisivos y deportivos en Cataluña y en el conjunto de España.",
            "fecha": "1980-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0083-ap-01-it-01",
            "apartado_id": "pod-0083-ap-01",
            "tipo": "evento",
            "titulo": "Fundación de Mediapro",
            "contenido": "Cofundó en 1994 Mediapro, que creció hasta convertirse en uno de los mayores grupos audiovisuales europeos, con un papel central en la producción y comercialización de los derechos del fútbol.",
            "fecha": "1994-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0083-ap-01-it-02",
            "apartado_id": "pod-0083-ap-01",
            "tipo": "evento",
            "titulo": "La guerra del fútbol y el cine",
            "contenido": "Mediapro/Imagina lideró durante años la pugna por los derechos televisivos del fútbol en España y produjo cine de proyección internacional, incluidas películas de Woody Allen como 'Vicky Cristina Barcelona' y 'Midnight in Paris'.",
            "fecha": "2008-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0083-ap-01-it-03",
            "apartado_id": "pod-0083-ap-01",
            "tipo": "evento",
            "titulo": "Expansión global y compromiso político",
            "contenido": "El grupo se expandió internacionalmente con producción y derechos deportivos en numerosos países, mientras Roures mantenía un perfil público comprometido con causas de izquierda y, en distintos momentos, con el proceso soberanista catalán.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0083-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0083-ap-02-it-00",
            "apartado_id": "pod-0083-ap-02",
            "tipo": "contacto",
            "titulo": "javier-tebas",
            "contenido": "**Pulso histórico por los derechos del fútbol** (nota -4/10) — Mediapro y LaLiga han chocado en la comercialización y producción de los derechos audiovisuales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0083-ap-02-it-01",
            "apartado_id": "pod-0083-ap-02",
            "tipo": "contacto",
            "titulo": "Espacio mediático de izquierdas",
            "contenido": "**Productor afín al progresismo** (nota +4/10) — Su perfil ideológico lo sitúa como actor del ecosistema audiovisual cercano a la izquierda y al soberanismo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0084",
    "slug": "joaquin-manso",
    "nombre_completo": "Joaquín Manso",
    "alias": "Manso",
    "cargo_actual": "Director de El Mundo",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de El Mundo, el segundo diario de información general de España y buque insignia de Unidad Editorial (grupo del italiano RCS). Periodismo de centro-derecha con fuerte tradición de investigación; su línea fija agenda en el electorado conservador y en los tribunales mediáticos.",
    "tags": [
      "medios",
      "periodista",
      "prensa",
      "no-electo"
    ],
    "fuente_principal": "https://www.elmundo.es",
    "apartados": [
      {
        "id": "pod-0084-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0084-ap-00-it-00",
            "apartado_id": "pod-0084-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Joaquín Manso es director de El Mundo, uno de los grandes diarios de referencia de España, de línea editorial liberal-conservadora. Periodista de la casa, asumió la dirección del periódico en 2020, dando continuidad a la tradición de periodismo de investigación e influencia política del diario fundado y dirigido durante décadas por Pedro J. Ramírez. Llegó al cargo desde la propia redacción, donde se había foguéado en la información política y de tribunales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0084-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0084-ap-01-it-00",
            "apartado_id": "pod-0084-ap-01",
            "tipo": "dato",
            "titulo": "Investigación y agenda",
            "contenido": "Mantiene la tradición de investigación del diario, con foco en corrupción y casos judiciales. Su cobertura condiciona el relato político del bloque de la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "investigacion",
              "agenda"
            ],
            "orden": 0
          },
          {
            "id": "pod-0084-ap-01-it-01",
            "apartado_id": "pod-0084-ap-01",
            "tipo": "dato",
            "titulo": "Diario de centro-derecha",
            "contenido": "El Mundo, bajo su dirección, ejerce una vigilancia crítica del Gobierno de coalición, con especial atención a los casos de corrupción, la regeneración institucional y la política territorial, desde una óptica liberal-conservadora.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "medios",
              "prensa"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0084-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0084-ap-02-it-00",
            "apartado_id": "pod-0084-ap-02",
            "tipo": "contacto",
            "titulo": "pedro-jose-ramirez",
            "contenido": "**Fundador histórico del diario que dirige** (nota +2/10) — Pedro J. Ramírez fundó y dirigió El Mundo durante décadas antes de crear El Español; herencia editorial compartida.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0084-ap-02-it-01",
            "apartado_id": "pod-0084-ap-02",
            "tipo": "contacto",
            "titulo": "francisco-marhuenda",
            "contenido": "**Par en la prensa de centro-derecha** (nota +3/10) — El Mundo y La Razón comparten espacio editorial, compitiendo por el lector conservador.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0084-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0084-ap-03-it-00",
            "apartado_id": "pod-0084-ap-03",
            "tipo": "evento",
            "titulo": "Periodista de El Mundo",
            "contenido": "Desarrolló su carrera en El Mundo, pasando por distintas secciones y responsabilidades, con un perfil ligado a la información política y de tribunales.",
            "fecha": "2005-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0084-ap-03-it-01",
            "apartado_id": "pod-0084-ap-03",
            "tipo": "evento",
            "titulo": "Director del diario",
            "contenido": "Fue nombrado director de El Mundo en 2020, al frente de una redacción con fuerte peso en la información política, judicial y económica y una línea editorial crítica con los gobiernos de izquierda.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0084-ap-03-it-02",
            "apartado_id": "pod-0084-ap-03",
            "tipo": "evento",
            "titulo": "Línea editorial e influencia",
            "contenido": "Bajo su dirección, El Mundo mantiene su perfil de diario de investigación e influencia, con exclusivas de impacto político y una posición editorial de centro-derecha en el debate público español.",
            "fecha": "2022-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0084-ap-03-it-03",
            "apartado_id": "pod-0084-ap-03",
            "tipo": "evento",
            "titulo": "Investigación y tribunales",
            "contenido": "Ha apostado por reforzar el periodismo de investigación y la cobertura de los grandes casos judiciales y políticos, un terreno en el que El Mundo ha marcado históricamente la agenda informativa del país.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0085",
    "slug": "vocento",
    "nombre_completo": "Vocento",
    "alias": "Vocento",
    "cargo_actual": "Grupo editor de ABC y la prensa regional conservadora",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Grupo de comunicación controlado por familias del País Vasco y de tradición conservadora (entre ellas los Ybarra), editor de ABC y de una potente red de diarios regionales (El Correo, El Diario Vasco, Las Provincias, Ideal…). Es uno de los pilares de la prensa de centro-derecha y un actor de peso en la opinión publicada.",
    "tags": [
      "medios",
      "prensa",
      "abc",
      "conservador",
      "no-electo"
    ],
    "fuente_principal": "https://www.vocento.com",
    "apartados": [
      {
        "id": "pod-0085-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0085-ap-00-it-00",
            "apartado_id": "pod-0085-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Grupo editor de ABC y de una amplia red de cabeceras regionales líderes en sus mercados. Su accionariado, de raíz familiar vasca, lo vincula a la burguesía conservadora histórica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0085-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0085-ap-01-it-00",
            "apartado_id": "pod-0085-ap-01",
            "tipo": "contacto",
            "titulo": "javier-moll",
            "contenido": "**Competidor en la prensa regional** (nota -2/10) — Vocento y Prensa Ibérica se disputan el liderazgo de la prensa de proximidad en distintos territorios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0085-ap-01-it-01",
            "apartado_id": "pod-0085-ap-01",
            "tipo": "contacto",
            "titulo": "francisco-marhuenda",
            "contenido": "**Mismo espacio editorial conservador** (nota +3/10) — ABC, La Razón y El Mundo conforman el núcleo de la prensa de derecha que marca agenda al PP y a Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0086",
    "slug": "magdalena-valerio",
    "nombre_completo": "Magdalena Valerio Cordero",
    "alias": "Magdalena Valerio",
    "cargo_actual": "Presidenta del Consejo de Estado",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidenta del Consejo de Estado, el supremo órgano consultivo del Gobierno, cuyos dictámenes preceden a las grandes decisiones normativas del Estado. Exministra de Trabajo del PSOE, su designación al frente del Consejo fue polémica por su perfil político en un órgano de naturaleza jurídica.",
    "tags": [
      "institucional",
      "consejo-de-estado",
      "consultivo",
      "no-electo"
    ],
    "fuente_principal": "https://www.consejo-estado.es",
    "apartados": [
      {
        "id": "pod-0086-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0086-ap-00-it-00",
            "apartado_id": "pod-0086-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Magdalena Valerio Cordero (Granada, 1959) es presidenta del Consejo de Estado, el supremo órgano consultivo del Gobierno, y la primera mujer en ocupar el cargo. Jurista y veterana dirigente socialista, fue ministra de Trabajo, Migraciones y Seguridad Social al inicio de la etapa de Pedro Sánchez y diputada durante varias legislaturas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0086-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0086-ap-01-it-00",
            "apartado_id": "pod-0086-ap-01",
            "tipo": "contacto",
            "titulo": "Gobierno de España",
            "contenido": "**Órgano consultivo del Ejecutivo** (nota +4/10) — Sus dictámenes, no vinculantes pero de gran peso, preceden a reales decretos y grandes reformas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0086-ap-01-it-01",
            "apartado_id": "pod-0086-ap-01",
            "tipo": "contacto",
            "titulo": "PSOE",
            "contenido": "**Origen político socialista** (nota +5/10) — Exministra del PSOE; su nombramiento alimentó el debate sobre la politización de los órganos del Estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0086-ap-02",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0086-ap-02-it-00",
            "apartado_id": "pod-0086-ap-02",
            "tipo": "evento",
            "titulo": "Jurista y política socialista",
            "contenido": "Licenciada en Derecho y funcionaria, desarrolló una larga carrera en el PSOE de Castilla-La Mancha, con responsabilidades en el Gobierno regional y como diputada en el Congreso.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0086-ap-02-it-01",
            "apartado_id": "pod-0086-ap-02",
            "tipo": "evento",
            "titulo": "Ministra de Trabajo",
            "contenido": "Fue ministra de Trabajo, Migraciones y Seguridad Social entre 2018 y 2020, en el primer Gobierno de Pedro Sánchez, gestionando la subida del salario mínimo y el inicio de la reversión de la reforma laboral.",
            "fecha": "2018-06-07",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0086-ap-02-it-02",
            "apartado_id": "pod-0086-ap-02",
            "tipo": "evento",
            "titulo": "Presidenta del Consejo de Estado",
            "contenido": "En 2023 fue nombrada presidenta del Consejo de Estado, convirtiéndose en la primera mujer al frente del máximo órgano consultivo del Estado, encargado de dictaminar sobre la legalidad de normas y grandes decisiones públicas.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0086-ap-02-it-03",
            "apartado_id": "pod-0086-ap-02",
            "tipo": "evento",
            "titulo": "Órgano consultivo supremo",
            "contenido": "Al frente del Consejo de Estado dirige el organismo que emite dictámenes preceptivos sobre normas, reclamaciones y grandes decisiones del Estado, una función técnica y de garantía jurídica alejada del primer plano político.",
            "fecha": "2023-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0087",
    "slug": "helena-revoredo",
    "nombre_completo": "Helena Revoredo Delvecchio",
    "alias": "Revoredo",
    "cargo_actual": "Presidenta de Prosegur",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidenta y accionista de control de Prosegur, multinacional española de la seguridad privada y la logística de valores presente en toda Iberoamérica. Una de las mujeres más ricas de España, controla a través de su grupo la vigilancia, el transporte de fondos y la ciberseguridad de empresas y bancos.",
    "tags": [
      "empresaria",
      "seguridad",
      "prosegur",
      "no-electo"
    ],
    "fuente_principal": "https://www.prosegur.com",
    "apartados": [
      {
        "id": "pod-0087-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0087-ap-00-it-00",
            "apartado_id": "pod-0087-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Helena Revoredo Delvecchio (Buenos Aires, 1947) es presidenta de Prosegur, la mayor empresa española de seguridad privada y una multinacional del sector con fuerte presencia en Europa y América Latina. Tomó las riendas del grupo tras el fallecimiento de su marido y fundador, Herberto Gut, y lo consolidó como líder del sector en el mundo de habla hispana, convirtiéndose en una de las grandes empresarias del país.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0087-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0087-ap-01-it-00",
            "apartado_id": "pod-0087-ap-01",
            "tipo": "dato",
            "titulo": "Infraestructura crítica privada",
            "contenido": "El transporte de fondos, la vigilancia y la ciberseguridad de Prosegur la convierten en proveedora de un servicio sensible para bancos, empresas e instituciones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "seguridad",
              "logistica-valores"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0087-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0087-ap-02-it-00",
            "apartado_id": "pod-0087-ap-02",
            "tipo": "contacto",
            "titulo": "Gran banca española",
            "contenido": "**Proveedora de logística de efectivo** (nota +5/10) — Prosegur gestiona el transporte y la custodia de valores de buena parte del sistema bancario.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0087-ap-03",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0087-ap-03-it-00",
            "apartado_id": "pod-0087-ap-03",
            "tipo": "evento",
            "titulo": "Al frente de Prosegur",
            "contenido": "Asumió la presidencia de Prosegur en 1997, tras la muerte de su esposo y fundador de la compañía, Herberto Gut, haciéndose cargo de un grupo de seguridad en plena expansión.",
            "fecha": "1997-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0087-ap-03-it-01",
            "apartado_id": "pod-0087-ap-03",
            "tipo": "evento",
            "titulo": "Expansión internacional",
            "contenido": "Bajo su presidencia, Prosegur creció con fuerza en América Latina y Europa, diversificando en vigilancia, transporte de fondos (Prosegur Cash) y alarmas, hasta convertirse en una multinacional cotizada.",
            "fecha": "2004-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0087-ap-03-it-02",
            "apartado_id": "pod-0087-ap-03",
            "tipo": "evento",
            "titulo": "Una de las grandes fortunas",
            "contenido": "Es una de las mujeres más ricas de España a través de su participación de control en Prosegur, figura habitual de los rankings de grandes patrimonios y con actividad también filantrópica.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0087-ap-03-it-03",
            "apartado_id": "pod-0087-ap-03",
            "tipo": "evento",
            "titulo": "Gobierno corporativo y sucesión",
            "contenido": "Ha combinado la presidencia con la articulación del relevo generacional en la familia y con un papel activo en foros empresariales, manteniendo el control familiar sobre Prosegur y sus filiales cotizadas.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0088",
    "slug": "daniel-mate",
    "nombre_completo": "Daniel Maté Badenes",
    "alias": "Daniel Maté",
    "cargo_actual": "Cofundador y gran accionista de Glencore",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Empresario español, uno de los mayores accionistas individuales de Glencore, el gigante mundial de las materias primas y la minería. Considerado de forma recurrente el hombre más rico de España, mantiene un perfil de extrema discreción y reside parte del tiempo fuera del país. Su fortuna procede del comercio global de commodities.",
    "tags": [
      "empresario",
      "materias-primas",
      "mineria",
      "internacional",
      "no-electo"
    ],
    "fuente_principal": "https://www.glencore.com",
    "apartados": [
      {
        "id": "pod-0088-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0088-ap-00-it-00",
            "apartado_id": "pod-0088-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Daniel Maté Badenes es un empresario español, uno de los cofundadores y grandes accionistas de Glencore, el gigante mundial del comercio de materias primas y la minería. De perfil extraordinariamente discreto y casi desconocido para el gran público, su participación en la multinacional suiza —de las mayores en manos individuales— lo ha convertido en una de las primeras fortunas de España según los rankings internacionales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0088-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0088-ap-01-it-00",
            "apartado_id": "pod-0088-ap-01",
            "tipo": "contacto",
            "titulo": "Mercado global de materias primas",
            "contenido": "**Gran accionista de Glencore** (nota +8/10) — Su fortuna depende del comercio mundial de metales, energía y agroalimentación a través del gigante suizo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0088-ap-02",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0088-ap-02-it-00",
            "apartado_id": "pod-0088-ap-02",
            "tipo": "evento",
            "titulo": "El comercio de materias primas",
            "contenido": "Desarrolló su carrera en el negocio del trading de materias primas, llegando a ser uno de los socios de referencia de Glencore, la mayor comercializadora de commodities del mundo.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0088-ap-02-it-01",
            "apartado_id": "pod-0088-ap-02",
            "tipo": "evento",
            "titulo": "Socio de Glencore",
            "contenido": "Como uno de los grandes accionistas individuales de Glencore desde su salida a bolsa en 2011, acumuló una fortuna multimillonaria ligada a la evolución de los precios de las materias primas y la minería.",
            "fecha": "2011-05-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0088-ap-02-it-02",
            "apartado_id": "pod-0088-ap-02",
            "tipo": "evento",
            "titulo": "Fortuna discreta",
            "contenido": "Pese a figurar entre los españoles más ricos según los rankings internacionales, mantiene un perfil público casi inexistente, alejado de la vida empresarial y mediática española.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0088-ap-02-it-03",
            "apartado_id": "pod-0088-ap-02",
            "tipo": "evento",
            "titulo": "Filantropía",
            "contenido": "Ha canalizado parte de su patrimonio hacia iniciativas filantrópicas, manteniendo en todo caso una notable reserva sobre su actividad y su vida personal.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0089",
    "slug": "alberto-alcocer",
    "nombre_completo": "Alberto Alcocer y Alberto Cortina («los Albertos»)",
    "alias": "Los Albertos",
    "cargo_actual": "Financieros históricos · accionistas de Ence y otros activos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Primos y socios financieros (Alberto Alcocer y Alberto Cortina), protagonistas del capitalismo español desde los años 80. Tras su paso por banca, construcción (la antigua FCC) y energía, mantienen posiciones de referencia en cotizadas como Ence (celulosa/energía) a través de Alcor. Iconos de una época del poder económico madrileño.",
    "tags": [
      "empresario",
      "inversion",
      "financieros",
      "no-electo"
    ],
    "fuente_principal": "https://www.ence.es",
    "apartados": [
      {
        "id": "pod-0089-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0089-ap-00-it-00",
            "apartado_id": "pod-0089-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Alberto Alcocer Torra es un financiero y empresario español que, junto a su primo Alberto Cortina, formó el célebre tándem inversor conocido como «los Albertos», una de las parejas más influyentes y mediáticas del capitalismo español de las últimas décadas. Han controlado o participado en empresas de construcción, banca, energía e inmobiliario, gestionando a través de sociedades familiares un notable patrimonio que los sitúa entre las grandes fortunas del país.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0089-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0089-ap-01-it-00",
            "apartado_id": "pod-0089-ap-01",
            "tipo": "contacto",
            "titulo": "Ence",
            "contenido": "**Accionistas de referencia** (nota +7/10) — Controlan la mayor empresa española de celulosa y energía con biomasa a través de Alcor.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0089-ap-01-it-01",
            "apartado_id": "pod-0089-ap-01",
            "tipo": "contacto",
            "titulo": "Establishment financiero madrileño",
            "contenido": "**Veteranos del capitalismo de los 80-90** (nota +5/10) — Su trayectoria los conecta con la historia de la banca y la construcción españolas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "pod-0089-ap-02",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0089-ap-02-it-00",
            "apartado_id": "pod-0089-ap-02",
            "tipo": "evento",
            "titulo": "El tándem 'los Albertos'",
            "contenido": "Junto a su primo Alberto Cortina, casados con dos hermanas de la familia Koplowitz, dirigió grandes grupos empresariales y financieros, convirtiéndose en protagonistas de la vida económica y social española.",
            "fecha": "1980-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0089-ap-02-it-01",
            "apartado_id": "pod-0089-ap-02",
            "tipo": "evento",
            "titulo": "Construcción y energía",
            "contenido": "A lo largo de los años, su grupo tuvo presencia en la construcción, la banca y la energía, en una intensa actividad inversora que los situó en el centro del poder económico.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0089-ap-02-it-02",
            "apartado_id": "pod-0089-ap-02",
            "tipo": "evento",
            "titulo": "Participaciones e inversiones",
            "contenido": "Mantienen participaciones e intereses en distintas compañías cotizadas y activos, gestionando su patrimonio a través de sociedades de inversión familiares.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0089-ap-02-it-03",
            "apartado_id": "pod-0089-ap-02",
            "tipo": "evento",
            "titulo": "Perfil social y patrimonial",
            "contenido": "Más allá de los negocios, 'los Albertos' han sido figuras habituales de la crónica social y empresarial española, con un patrimonio que los sitúa entre las grandes fortunas del país.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0090",
    "slug": "instituto-empresa-familiar",
    "nombre_completo": "Instituto de la Empresa Familiar",
    "alias": "IEF",
    "cargo_actual": "Lobby de las grandes empresas y fortunas familiares",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Asociación que agrupa a las mayores empresas familiares de España (de Inditex y Mercadona a Mango, El Pozo o Puig), responsables de buena parte del PIB y el empleo privado. Es uno de los lobbies más influyentes del país en materia fiscal —especialmente en el impuesto de patrimonio y sucesiones— y de política económica.",
    "tags": [
      "patronal",
      "lobby",
      "empresa-familiar",
      "fiscalidad",
      "no-electo"
    ],
    "fuente_principal": "https://www.iefamiliar.com",
    "apartados": [
      {
        "id": "pod-0090-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0090-ap-00-it-00",
            "apartado_id": "pod-0090-ap-00",
            "tipo": "dato",
            "titulo": "Qué es",
            "contenido": "Reúne a las grandes empresas familiares españolas y a sus asociaciones territoriales. Defiende un marco fiscal favorable a la continuidad de las empresas familiares y a la inversión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0090-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0090-ap-01-it-00",
            "apartado_id": "pod-0090-ap-01",
            "tipo": "dato",
            "titulo": "Batalla fiscal",
            "contenido": "Es el gran lobby contra el impuesto de patrimonio y de grandes fortunas, y a favor de bonificaciones en sucesiones, argumentando que protegen el empleo y la inversión familiar.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "patrimonio",
              "sucesiones",
              "fiscalidad"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0090-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0090-ap-02-it-00",
            "apartado_id": "pod-0090-ap-02",
            "tipo": "contacto",
            "titulo": "juan-roig",
            "contenido": "**Gran empresa familiar asociada (Mercadona)** (nota +6/10) — Roig representa el arquetipo de la empresa familiar que el IEF defiende ante el fisco y el Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0090-ap-02-it-01",
            "apartado_id": "pod-0090-ap-02",
            "tipo": "contacto",
            "titulo": "familia-andic",
            "contenido": "**Empresa familiar asociada (Mango)** (nota +6/10) — Mango es ejemplo del tejido de multinacionales familiares que agrupa el instituto.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0090-ap-02-it-02",
            "apartado_id": "pod-0090-ap-02",
            "tipo": "contacto",
            "titulo": "antonio-garamendi",
            "contenido": "**Coordinación con la CEOE** (nota +5/10) — El IEF alinea su agenda fiscal y económica con la gran patronal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0091",
    "slug": "jorge-azcon",
    "nombre_completo": "Jorge Azcón Navarro",
    "alias": "Jorge Azcón",
    "cargo_actual": "Presidente de Aragón",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidente de Aragón (PP) desde 2023 y exalcalde de Zaragoza; gobierna en coalición con Vox.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "aragon"
    ],
    "fuente_principal": "https://www.aragon.es",
    "apartados": [
      {
        "id": "pod-0091-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0091-ap-00-it-00",
            "apartado_id": "pod-0091-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Jorge Azcón Navarro (Zaragoza, 1973) es presidente de Aragón desde 2023 y líder del PP aragonés. Abogado y exalcalde de Zaragoza, alcanzó la presidencia autonómica tras las elecciones de 2023 gobernando en coalición con Vox, una alianza que después atravesó tensiones. Representa el ala de gestión del Partido Popular en el valle del Ebro. Llegó a la política autonómica desde la alcaldía de la capital y debe equilibrar la gestión con las exigencias de su socio Vox en una comunidad clave por el agua, la logística y la energía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0091-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0091-ap-01-it-00",
            "apartado_id": "pod-0091-ap-01",
            "tipo": "evento",
            "titulo": "Concejal y abogado",
            "contenido": "Abogado de formación, desarrolló su carrera en el PP de Zaragoza, ocupando concejalías y responsabilidades en el partido a nivel municipal y autonómico.",
            "fecha": "2003-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0091-ap-01-it-01",
            "apartado_id": "pod-0091-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Zaragoza",
            "contenido": "En 2019 fue elegido alcalde de Zaragoza, arrebatando la capital aragonesa a la izquierda, con una gestión de perfil moderado centrada en la ciudad.",
            "fecha": "2019-06-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0091-ap-01-it-02",
            "apartado_id": "pod-0091-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de Aragón",
            "contenido": "Tras las elecciones autonómicas de 2023 fue investido presidente de Aragón gracias a un pacto de coalición con Vox, uno de los gobiernos PP-Vox surgidos de aquellos comicios.",
            "fecha": "2023-08-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0091-ap-01-it-03",
            "apartado_id": "pod-0091-ap-01",
            "tipo": "evento",
            "titulo": "Gestión y tensiones con Vox",
            "contenido": "Su mandato ha combinado la gestión autonómica (agua, agricultura, despoblación) con las tensiones derivadas de la coalición con Vox, que en distintos territorios rompió con el PP.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0091-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0091-ap-02-it-00",
            "apartado_id": "pod-0091-ap-02",
            "tipo": "dato",
            "titulo": "Aragonesismo y agua",
            "contenido": "Defiende los intereses de Aragón en agua, infraestructuras y lucha contra la despoblación, con un perfil de gestión dentro de la órbita moderada del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "aragon"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0091-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0091-ap-03-it-00",
            "apartado_id": "pod-0091-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0091-ap-03-it-01",
            "apartado_id": "pod-0091-ap-03",
            "tipo": "contacto",
            "titulo": "Santiago Abascal",
            "contenido": "**Líder de Vox** (nota -3/10) — Socio de gobierno en Aragón, en una relación tensa marcada por las rupturas de coaliciones PP-Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "nota--3",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0092",
    "slug": "adrian-barbon",
    "nombre_completo": "Adrián Barbón Rodríguez",
    "alias": "Adrián Barbón",
    "cargo_actual": "Presidente del Principado de Asturias",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Presidente del Principado de Asturias (PSOE) desde 2019; perfil obrero de la cuenca minera, leal a la dirección federal.",
    "tags": [
      "politico",
      "psoe",
      "presidente-autonomico",
      "asturias"
    ],
    "fuente_principal": "https://www.asturias.es",
    "apartados": [
      {
        "id": "pod-0092-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0092-ap-00-it-00",
            "apartado_id": "pod-0092-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Adrián Barbón Rodríguez (Laviana, 1978) es presidente del Principado de Asturias desde 2019 y líder de la FSA-PSOE. Procedente de la cuenca minera, encarna un socialismo asturiano de raíz obrera y se ha consolidado como uno de los barones del PSOE, leal a la dirección federal de Pedro Sánchez. Es conocido por su cercanía y por gobernar habitualmente en minoría o en coalición con la izquierda. Hombre de partido y de fuerte arraigo en la cuenca minera, ha hecho de la defensa de la sanidad pública, la industria y las infraestructuras de Asturias sus prioridades, con un estilo cercano y una activa presencia pública.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0092-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0092-ap-01-it-00",
            "apartado_id": "pod-0092-ap-01",
            "tipo": "evento",
            "titulo": "De la cuenca minera a la política",
            "contenido": "Nacido en la cuenca del Nalón, militó desde joven en las Juventudes Socialistas y fue alcalde de su localidad, Laviana, forjando un perfil de político de proximidad.",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0092-ap-01-it-01",
            "apartado_id": "pod-0092-ap-01",
            "tipo": "evento",
            "titulo": "Líder de la FSA-PSOE",
            "contenido": "En 2017 ganó las primarias de la Federación Socialista Asturiana, renovando el liderazgo del PSOE asturiano.",
            "fecha": "2017-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0092-ap-01-it-02",
            "apartado_id": "pod-0092-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de Asturias",
            "contenido": "Encabezó la candidatura socialista en 2019 y fue investido presidente del Principado, en una comunidad con retos de despoblación, industria y transición energética de las comarcas mineras.",
            "fecha": "2019-07-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0092-ap-01-it-03",
            "apartado_id": "pod-0092-ap-01",
            "tipo": "evento",
            "titulo": "Reelección y agenda industrial",
            "contenido": "Revalidó el cargo en 2023, centrando su gestión en la defensa de la industria asturiana (acero, energía), la transición justa y la sanidad pública.",
            "fecha": "2023-07-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0092-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0092-ap-02-it-00",
            "apartado_id": "pod-0092-ap-02",
            "tipo": "dato",
            "titulo": "Socialismo industrial y lealtad federal",
            "contenido": "Defiende la industria y la transición justa de las comarcas mineras y mantiene una lealtad clara a la dirección federal de Pedro Sánchez, dentro del ala más clásica del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "asturias"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0092-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0092-ap-03-it-00",
            "apartado_id": "pod-0092-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Barón leal a la dirección federal del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0093",
    "slug": "marga-prohens",
    "nombre_completo": "Margalida Prohens Rigo",
    "alias": "Marga Prohens",
    "cargo_actual": "Presidenta del Govern de las Islas Baleares",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidenta del Govern de las Islas Baleares (PP) desde 2023; gobierna en solitario con apoyo de Vox.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "baleares"
    ],
    "fuente_principal": "https://www.caib.es",
    "apartados": [
      {
        "id": "pod-0093-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0093-ap-00-it-00",
            "apartado_id": "pod-0093-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Margalida «Marga» Prohens Rigo (Campos, Mallorca, 1982) es presidenta del Govern de las Islas Baleares desde 2023 y líder del PP balear. Joven dirigente, recuperó el Govern para el centroderecha tras la etapa de Francina Armengol, gobernando en solitario con el apoyo parlamentario de Vox. Representa el relevo generacional del Partido Popular en las islas. Una de las presidentas autonómicas más jóvenes, afronta los grandes desafíos del archipiélago —la presión turística, la emergencia de vivienda y la gestión del agua— y reivindica un trato fiscal acorde con el hecho insular para unas islas que reciben millones de visitantes al año.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0093-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0093-ap-01-it-00",
            "apartado_id": "pod-0093-ap-01",
            "tipo": "evento",
            "titulo": "De Nuevas Generaciones al Parlament",
            "contenido": "Filóloga de formación, hizo carrera en el PP balear desde Nuevas Generaciones, llegando a portavoz parlamentaria y a diputada en el Congreso.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0093-ap-01-it-01",
            "apartado_id": "pod-0093-ap-01",
            "tipo": "evento",
            "titulo": "Liderazgo del PP balear",
            "contenido": "Asumió el liderazgo del PP de Baleares, reconstruyendo el partido tras los años de gobiernos de izquierdas de Francina Armengol.",
            "fecha": "2021-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0093-ap-01-it-02",
            "apartado_id": "pod-0093-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta del Govern",
            "contenido": "Ganó las elecciones de 2023 y fue investida presidenta del Govern balear, gobernando en solitario el PP con el apoyo externo de Vox.",
            "fecha": "2023-07-10",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0093-ap-01-it-03",
            "apartado_id": "pod-0093-ap-01",
            "tipo": "evento",
            "titulo": "Turismo y vivienda",
            "contenido": "Su gestión afronta los grandes retos de las islas: la masificación turística, el acceso a la vivienda, el agua y el equilibrio entre desarrollo y sostenibilidad.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0093-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0093-ap-02-it-00",
            "apartado_id": "pod-0093-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha insular",
            "contenido": "Defiende un modelo económico ligado al turismo, con medidas sobre vivienda y saturación, y reivindica la financiación y el hecho insular ante el Estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "baleares"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0093-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0093-ap-03-it-00",
            "apartado_id": "pod-0093-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineada con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0093-ap-03-it-01",
            "apartado_id": "pod-0093-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -5/10) — Confrontación por financiación, vivienda e inmigración.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--5",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0094",
    "slug": "fernando-clavijo",
    "nombre_completo": "Fernando Clavijo Batlle",
    "alias": "Fernando Clavijo",
    "cargo_actual": "Presidente de Canarias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presidente de Canarias (Coalición Canaria) desde 2023, ya lo fue 2015-2019; gobierna con el PP.",
    "tags": [
      "politico",
      "coalicion-canaria",
      "presidente-autonomico",
      "canarias"
    ],
    "fuente_principal": "https://www.gobiernodecanarias.org",
    "apartados": [
      {
        "id": "pod-0094-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0094-ap-00-it-00",
            "apartado_id": "pod-0094-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Fernando Clavijo Batlle (San Cristóbal de La Laguna, 1971) es presidente de Canarias desde 2023 y líder de Coalición Canaria (CC). Ya había presidido el archipiélago entre 2015 y 2019. Nacionalista canario de perfil pragmático, gobierna en coalición con el PP y ejerce de bisagra capaz de pactar con los grandes partidos estatales en defensa de los intereses insulares. Economista y exalcalde de La Laguna, conoce bien el doble juego de la política canaria: pacta con el PP en las islas y, a la vez, negocia con el Gobierno central de Sánchez asuntos como la inmigración, el REF y la financiación del archipiélago.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0094-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0094-ap-01-it-00",
            "apartado_id": "pod-0094-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de La Laguna",
            "contenido": "Economista, fue alcalde de San Cristóbal de La Laguna, una de las principales ciudades de Tenerife, antes de dar el salto a la política autonómica.",
            "fecha": "2008-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0094-ap-01-it-01",
            "apartado_id": "pod-0094-ap-01",
            "tipo": "evento",
            "titulo": "Primera presidencia de Canarias",
            "contenido": "Presidió el Gobierno de Canarias entre 2015 y 2019 al frente de Coalición Canaria, en una etapa de pactos cambiantes.",
            "fecha": "2015-07-09",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0094-ap-01-it-02",
            "apartado_id": "pod-0094-ap-01",
            "tipo": "evento",
            "titulo": "Senador y líder de CC",
            "contenido": "Tras perder la presidencia fue senador y consolidó su liderazgo en Coalición Canaria, manteniendo el peso del nacionalismo canario.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0094-ap-01-it-03",
            "apartado_id": "pod-0094-ap-01",
            "tipo": "evento",
            "titulo": "Regreso a la presidencia",
            "contenido": "Volvió a la presidencia de Canarias en 2023 en coalición con el PP, con la inmigración (la crisis de los cayucos y los menores no acompañados) y la financiación como grandes asuntos de su mandato.",
            "fecha": "2023-07-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0094-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0094-ap-02-it-00",
            "apartado_id": "pod-0094-ap-02",
            "tipo": "dato",
            "titulo": "Nacionalismo canario pragmático",
            "contenido": "Defiende los intereses del archipiélago (REF, insularidad, inmigración) negociando con quien gobierne en Madrid, en una posición de bisagra entre los grandes bloques.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "coalicion-canaria",
              "canarias"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0094-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0094-ap-03-it-00",
            "apartado_id": "pod-0094-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +3/10) — Relación pragmática: pactos puntuales en Madrid (p. ej. en inmigración y financiación) pese a gobernar con el PP en Canarias.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+3",
              "pragmatico"
            ],
            "orden": 0
          },
          {
            "id": "pod-0094-ap-03-it-01",
            "apartado_id": "pod-0094-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +5/10) — Socio de gobierno del PP en el archipiélago canario.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+5",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0095",
    "slug": "maria-jose-saenz-de-buruaga",
    "nombre_completo": "María José Sáenz de Buruaga Gómez",
    "alias": "María José Sáenz de Buruaga",
    "cargo_actual": "Presidenta de Cantabria",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidenta de Cantabria (PP) desde 2023; puso fin a la larga etapa de Revilla (PRC).",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "cantabria"
    ],
    "fuente_principal": "https://www.cantabria.es",
    "apartados": [
      {
        "id": "pod-0095-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0095-ap-00-it-00",
            "apartado_id": "pod-0095-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "María José Sáenz de Buruaga Gómez (Santander, 1971) es presidenta de Cantabria desde 2023 y líder del PP cántabro. Puso fin a la larga etapa de Miguel Ángel Revilla (PRC) al frente de la comunidad, logrando una mayoría que permitió al PP gobernar en solitario. Representa el regreso del centroderecha al poder en Cantabria. Jurista y veterana dirigente del PP cántabro, gobierna una comunidad pequeña pero estratégica del Cantábrico, donde ha hecho de la sanidad, la reactivación industrial y la reclamación de infraestructuras ferroviarias y de comunicaciones al Estado los ejes de su mandato.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0095-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0095-ap-01-it-00",
            "apartado_id": "pod-0095-ap-01",
            "tipo": "evento",
            "titulo": "Jurista y política",
            "contenido": "Licenciada en Derecho, desarrolló su carrera en el PP de Cantabria, ocupando consejerías en anteriores gobiernos autonómicos y la portavocía parlamentaria.",
            "fecha": "2003-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0095-ap-01-it-01",
            "apartado_id": "pod-0095-ap-01",
            "tipo": "evento",
            "titulo": "Líder de la oposición",
            "contenido": "Asumió el liderazgo del PP cántabro y ejerció de jefa de la oposición frente a los gobiernos de Miguel Ángel Revilla.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0095-ap-01-it-02",
            "apartado_id": "pod-0095-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta de Cantabria",
            "contenido": "Ganó las elecciones de 2023, desbancando al PRC de Revilla, y fue investida presidenta de Cantabria gobernando en solitario el PP.",
            "fecha": "2023-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0095-ap-01-it-03",
            "apartado_id": "pod-0095-ap-01",
            "tipo": "evento",
            "titulo": "Gestión autonómica",
            "contenido": "Su mandato se centra en la sanidad, las infraestructuras (el tren, las comunicaciones) y el desarrollo industrial de una comunidad pequeña pero estratégica del norte.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0095-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0095-ap-02-it-00",
            "apartado_id": "pod-0095-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha y reivindicación de inversiones",
            "contenido": "Defiende una gestión de centroderecha y reclama inversiones e infraestructuras del Estado (especialmente ferroviarias) para Cantabria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "cantabria"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0095-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0095-ap-03-it-00",
            "apartado_id": "pod-0095-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineada con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0095-ap-03-it-01",
            "apartado_id": "pod-0095-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -5/10) — Confrontación por las inversiones e infraestructuras pendientes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--5",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0096",
    "slug": "emiliano-garcia-page",
    "nombre_completo": "Emiliano García-Page Sánchez",
    "alias": "Emiliano García-Page",
    "cargo_actual": "Presidente de Castilla-La Mancha",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Presidente de Castilla-La Mancha (PSOE) desde 2015, con mayoría absoluta; el barón socialista más crítico con Sánchez.",
    "tags": [
      "politico",
      "psoe",
      "presidente-autonomico",
      "castilla-la-mancha"
    ],
    "fuente_principal": "https://www.castillalamancha.es",
    "apartados": [
      {
        "id": "pod-0096-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0096-ap-00-it-00",
            "apartado_id": "pod-0096-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Emiliano García-Page Sánchez (Toledo, 1968) es presidente de Castilla-La Mancha desde 2015 y uno de los barones más influyentes y críticos del PSOE. Reelegido en 2023 con mayoría absoluta, encarna el ala socialista más díscola con Pedro Sánchez: rechaza abiertamente los pactos con el independentismo y la amnistía, lo que lo convierte en una voz interna incómoda para Moncloa. Con tres mandatos a sus espaldas y una sólida implantación territorial, defiende un perfil moderado y «de Estado» y reivindica el agua, la financiación y el peso de la España interior frente a la del litoral.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0096-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0096-ap-01-it-00",
            "apartado_id": "pod-0096-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Toledo",
            "contenido": "Abogado y veterano dirigente socialista, fue alcalde de Toledo durante una década, ciudad de la que es figura emblemática.",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0096-ap-01-it-01",
            "apartado_id": "pod-0096-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de Castilla-La Mancha",
            "contenido": "Recuperó la Junta de Comunidades para el PSOE en 2015, desbancando a María Dolores de Cospedal (PP), y gobernó primero en pactos con Podemos.",
            "fecha": "2015-07-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0096-ap-01-it-02",
            "apartado_id": "pod-0096-ap-01",
            "tipo": "evento",
            "titulo": "Mayoría absoluta",
            "contenido": "En 2019 y, sobre todo, en 2023, revalidó el cargo con mayoría absoluta, consolidando un fuerte liderazgo personal en la región a contracorriente de la tendencia general.",
            "fecha": "2023-06-30",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0096-ap-01-it-03",
            "apartado_id": "pod-0096-ap-01",
            "tipo": "evento",
            "titulo": "El barón crítico",
            "contenido": "Se ha erigido en la principal voz crítica interna del PSOE contra los pactos de Sánchez con ERC, Junts y EH Bildu y contra la ley de amnistía, marcando distancias públicas con la dirección federal.",
            "fecha": "2023-11-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0096-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0096-ap-02-it-00",
            "apartado_id": "pod-0096-ap-02",
            "tipo": "dato",
            "titulo": "Socialismo crítico con Sánchez",
            "contenido": "Defiende un PSOE «constitucionalista», contrario a la amnistía y a la dependencia del independentismo; reivindica el agua y los intereses de Castilla-La Mancha frente a otros territorios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "castilla-la-mancha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0096-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0096-ap-03-it-00",
            "apartado_id": "pod-0096-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota -4/10) — Lealtad orgánica pero enfrentamiento público y permanente por los pactos con el independentismo y la amnistía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota--4",
              "tension-interna"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0097",
    "slug": "alfonso-fernandez-manueco",
    "nombre_completo": "Alfonso Fernández Mañueco",
    "alias": "Alfonso Fernández Mañueco",
    "cargo_actual": "Presidente de la Junta de Castilla y León",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidente de Castilla y León (PP) desde 2019; formó el primer gobierno PP-Vox de España, roto en 2024.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "castilla-y-leon"
    ],
    "fuente_principal": "https://www.jcyl.es",
    "apartados": [
      {
        "id": "pod-0097-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0097-ap-00-it-00",
            "apartado_id": "pod-0097-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Alfonso Fernández Mañueco (Salamanca, 1965) es presidente de la Junta de Castilla y León desde 2019 y líder del PP regional. Abogado y exalcalde de Salamanca, en 2022 adelantó elecciones y formó el primer gobierno autonómico de coalición entre el PP y Vox en España, que se rompió en 2024, pasando a gobernar en minoría. Político veterano y de perfil discreto, gobierna la comunidad más extensa de España, marcada por la dispersión y el envejecimiento; ha hecho de la sanidad rural, la agricultura, la ganadería y la lucha contra la despoblación los ejes de su gestión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0097-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0097-ap-01-it-00",
            "apartado_id": "pod-0097-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Salamanca",
            "contenido": "Abogado, desarrolló una larga carrera en el PP de Castilla y León, siendo alcalde de Salamanca y ocupando consejerías en la Junta.",
            "fecha": "2011-06-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0097-ap-01-it-01",
            "apartado_id": "pod-0097-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de la Junta",
            "contenido": "Tras las elecciones de 2019 fue investido presidente de Castilla y León en coalición con Ciudadanos.",
            "fecha": "2019-07-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0097-ap-01-it-02",
            "apartado_id": "pod-0097-ap-01",
            "tipo": "evento",
            "titulo": "El primer gobierno PP-Vox",
            "contenido": "En 2022 adelantó las elecciones y, tras ganarlas, formó el primer ejecutivo autonómico de coalición PP-Vox de España, un experimento muy observado a nivel nacional.",
            "fecha": "2022-04-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0097-ap-01-it-03",
            "apartado_id": "pod-0097-ap-01",
            "tipo": "evento",
            "titulo": "Ruptura y minoría",
            "contenido": "En 2024, la salida de Vox del Gobierno —en el marco de la crisis nacional de las coaliciones— lo dejó gobernando en minoría, centrado en la despoblación, la sanidad rural y la agricultura.",
            "fecha": "2024-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0097-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0097-ap-02-it-00",
            "apartado_id": "pod-0097-ap-02",
            "tipo": "dato",
            "titulo": "Gestión del medio rural",
            "contenido": "Defiende los intereses del mundo rural y agrario, la lucha contra la despoblación de la «España vaciada» y una gestión de centroderecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "castilla-y-leon"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0097-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0097-ap-03-it-00",
            "apartado_id": "pod-0097-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0097-ap-03-it-01",
            "apartado_id": "pod-0097-ap-03",
            "tipo": "contacto",
            "titulo": "Santiago Abascal",
            "contenido": "**Líder de Vox** (nota -3/10) — Exsocio de coalición; la ruptura de 2024 enfrió la relación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "nota--3",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0098",
    "slug": "salvador-illa",
    "nombre_completo": "Salvador Illa Roca",
    "alias": "Salvador Illa",
    "cargo_actual": "Presidente de la Generalitat de Cataluña",
    "partido": "PSC",
    "foto_url": null,
    "bio_corta": "Presidente de la Generalitat de Cataluña (PSC) desde agosto de 2024; exministro de Sanidad de la pandemia.",
    "tags": [
      "politico",
      "psc",
      "presidente-autonomico",
      "cataluna"
    ],
    "fuente_principal": "https://www.gencat.cat",
    "apartados": [
      {
        "id": "pod-0098-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0098-ap-00-it-00",
            "apartado_id": "pod-0098-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Salvador Illa Roca (La Roca del Vallès, 1966) es presidente de la Generalitat de Cataluña desde agosto de 2024 y líder del PSC. Exministro de Sanidad durante la pandemia, ganó las elecciones catalanas de 2024 y puso fin a más de una década de presidentes independentistas, abriendo una etapa de «normalización» tras el procés, con el apoyo parlamentario de ERC y los comunes. De perfil sereno y negociador, ha apostado por la estabilidad, la gestión y la reconciliación tras una década de conflicto, reivindicando inversiones, una financiación singular y la recuperación del peso económico e institucional de Cataluña.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0098-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0098-ap-01-it-00",
            "apartado_id": "pod-0098-ap-01",
            "tipo": "evento",
            "titulo": "Del municipalismo al PSC",
            "contenido": "Filósofo de formación, desarrolló una larga carrera en el PSC desde el municipalismo (fue alcalde de La Roca del Vallès) y la gestión orgánica del partido.",
            "fecha": "1995-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0098-ap-01-it-01",
            "apartado_id": "pod-0098-ap-01",
            "tipo": "evento",
            "titulo": "Ministro de Sanidad",
            "contenido": "Fue ministro de Sanidad del Gobierno de Pedro Sánchez durante la pandemia de COVID-19 (2020-2021), el rostro institucional de la gestión de la crisis sanitaria.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0098-ap-01-it-02",
            "apartado_id": "pod-0098-ap-01",
            "tipo": "evento",
            "titulo": "Líder de la oposición catalana",
            "contenido": "Tras ganar en escaños las elecciones de 2021 sin poder gobernar, lideró la oposición en el Parlament y reconstruyó el PSC como alternativa al bloque independentista.",
            "fecha": "2021-02-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0098-ap-01-it-03",
            "apartado_id": "pod-0098-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de la Generalitat",
            "contenido": "Ganó las elecciones de 2024 y fue investido presidente en agosto, el primer socialista al frente de la Generalitat desde Montilla, con un discurso de reencuentro y de gestión tras los años del procés.",
            "fecha": "2024-08-10",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0098-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0098-ap-02-it-00",
            "apartado_id": "pod-0098-ap-02",
            "tipo": "dato",
            "titulo": "Normalización y catalanismo no soberanista",
            "contenido": "Defiende un catalanismo no independentista, la reconciliación tras el procés y la financiación singular de Cataluña, en estrecha relación con el Gobierno de Sánchez.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psc",
              "cataluna"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0098-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0098-ap-03-it-00",
            "apartado_id": "pod-0098-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota +8/10) — Aliado estratégico clave; su investidura y la del propio Sánchez se sostienen en la misma arquitectura de pactos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+8",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0099",
    "slug": "maria-guardiola",
    "nombre_completo": "María Guardiola Martín",
    "alias": "María Guardiola",
    "cargo_actual": "Presidenta de la Junta de Extremadura",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidenta de la Junta de Extremadura (PP) desde 2023; reinvestida en abril de 2026 con Vox tras las anticipadas de diciembre de 2025.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "extremadura"
    ],
    "fuente_principal": "https://www.juntaex.es",
    "apartados": [
      {
        "id": "pod-0099-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0099-ap-00-it-00",
            "apartado_id": "pod-0099-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "María Guardiola Martín (Cáceres, 1980) es presidenta de la Junta de Extremadura y líder del PP extremeño. Llegó al poder en 2023 desalojando al PSOE de Guillermo Fernández Vara y, tras un primer mandato en minoría, convocó elecciones anticipadas en diciembre de 2025, que ganó, siendo reinvestida en abril de 2026 en coalición con Vox. Representa el cambio político en una región históricamente socialista. De carácter directo, protagonizó en 2023 un sonado pulso público sobre si pactar o no con Vox, antes de acabar gobernando con su apoyo; ha hecho del agua, la agricultura, las infraestructuras y la convergencia económica de Extremadura sus prioridades.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0099-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0099-ap-01-it-00",
            "apartado_id": "pod-0099-ap-01",
            "tipo": "evento",
            "titulo": "Irrupción en el PP extremeño",
            "contenido": "Procedente del ámbito de la gestión, irrumpió en la política autonómica liderando el PP de Extremadura y dándole un perfil renovado.",
            "fecha": "2021-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0099-ap-01-it-01",
            "apartado_id": "pod-0099-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta por el cambio",
            "contenido": "En las elecciones de 2023 logró desbancar al PSOE tras décadas de hegemonía socialista, accediendo a la presidencia de la Junta de Extremadura.",
            "fecha": "2023-07-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0099-ap-01-it-02",
            "apartado_id": "pod-0099-ap-01",
            "tipo": "evento",
            "titulo": "Elecciones anticipadas de 2025",
            "contenido": "Ante la dificultad para aprobar los presupuestos, convocó elecciones anticipadas el 21 de diciembre de 2025, en las que el PP mejoró sus resultados (29 escaños).",
            "fecha": "2025-12-21",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0099-ap-01-it-03",
            "apartado_id": "pod-0099-ap-01",
            "tipo": "evento",
            "titulo": "Reinvestidura con Vox",
            "contenido": "Fue reinvestida presidenta en abril de 2026 gracias a un acuerdo de gobierno con Vox, consolidando el giro al centroderecha de Extremadura.",
            "fecha": "2026-04-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0099-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0099-ap-02-it-00",
            "apartado_id": "pod-0099-ap-02",
            "tipo": "dato",
            "titulo": "Cambio y desarrollo de Extremadura",
            "contenido": "Defiende el desarrollo económico, la agricultura, el agua y las infraestructuras de Extremadura —una de las regiones de menor renta— desde una óptica de centroderecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "extremadura"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0099-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0099-ap-03-it-00",
            "apartado_id": "pod-0099-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineada con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0099-ap-03-it-01",
            "apartado_id": "pod-0099-ap-03",
            "tipo": "contacto",
            "titulo": "Santiago Abascal",
            "contenido": "**Líder de Vox** (nota +4/10) — Socio de gobierno tras la reinvestidura de 2026.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "nota-+4",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0100",
    "slug": "alfonso-rueda",
    "nombre_completo": "Alfonso Rueda Valenzuela",
    "alias": "Alfonso Rueda",
    "cargo_actual": "Presidente de la Xunta de Galicia",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidente de la Xunta de Galicia (PP) desde 2022; revalidó la mayoría absoluta en 2024. Sucesor de Feijóo.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "galicia"
    ],
    "fuente_principal": "https://www.xunta.gal",
    "apartados": [
      {
        "id": "pod-0100-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0100-ap-00-it-00",
            "apartado_id": "pod-0100-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Alfonso Rueda Valenzuela (Pontevedra, 1968) es presidente de la Xunta de Galicia desde 2022 y líder del PPdeG. Sucedió a Alberto Núñez Feijóo cuando este dio el salto a la política nacional, y en febrero de 2024 revalidó la mayoría absoluta del PP en Galicia, demostrando la solidez del feudo gallego del partido. Representa la continuidad del «feijoísmo» en clave de gestión. De perfil discreto y gestor, ha sabido mantener la hegemonía absoluta del PP en su feudo histórico, defendiendo la industria gallega (automoción, naval, textil), el sector primario (pesca, lácteo) y el autogobierno de la comunidad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0100-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0100-ap-01-it-00",
            "apartado_id": "pod-0100-ap-01",
            "tipo": "evento",
            "titulo": "La carrera en la Xunta",
            "contenido": "Abogado y funcionario, desarrolló su carrera en el PP gallego ocupando consejerías clave y la vicepresidencia de la Xunta durante los gobiernos de Feijóo.",
            "fecha": "2009-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0100-ap-01-it-01",
            "apartado_id": "pod-0100-ap-01",
            "tipo": "evento",
            "titulo": "Mano derecha de Feijóo",
            "contenido": "Como vicepresidente y secretario general del PPdeG, fue el hombre de confianza de Alberto Núñez Feijóo en la gestión del Gobierno gallego.",
            "fecha": "2012-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0100-ap-01-it-02",
            "apartado_id": "pod-0100-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de la Xunta",
            "contenido": "En 2022 sucedió a Feijóo al frente de la Xunta cuando este asumió el liderazgo nacional del PP, garantizando la continuidad del proyecto.",
            "fecha": "2022-05-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0100-ap-01-it-03",
            "apartado_id": "pod-0100-ap-01",
            "tipo": "evento",
            "titulo": "Mayoría absoluta propia",
            "contenido": "En febrero de 2024 revalidó la mayoría absoluta del PP en Galicia con perfil propio, confirmando a la comunidad como el gran bastión histórico del partido.",
            "fecha": "2024-02-18",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0100-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0100-ap-02-it-00",
            "apartado_id": "pod-0100-ap-02",
            "tipo": "dato",
            "titulo": "Galleguismo de gestión",
            "contenido": "Defiende el autogobierno gallego, la industria (automoción, naval, energía), el sector primario y una gestión de centroderecha continuista respecto a la etapa de Feijóo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "galicia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0100-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0100-ap-03-it-00",
            "apartado_id": "pod-0100-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +9/10) — Mentor político directo: Rueda fue su número dos y su sucesor en la Xunta.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+9",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0100-ap-03-it-01",
            "apartado_id": "pod-0100-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -5/10) — Confrontación por inversiones, industria y financiación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--5",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0101",
    "slug": "gonzalo-capellan",
    "nombre_completo": "Gonzalo Capellán de Miguel",
    "alias": "Gonzalo Capellán",
    "cargo_actual": "Presidente de La Rioja",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidente de La Rioja (PP) desde 2023; catedrático de Historia. Gobierna con apoyo de Vox.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "la-rioja"
    ],
    "fuente_principal": "https://www.larioja.org",
    "apartados": [
      {
        "id": "pod-0101-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0101-ap-00-it-00",
            "apartado_id": "pod-0101-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Gonzalo Capellán de Miguel es presidente de La Rioja desde 2023 y líder del PP riojano. Historiador y catedrático universitario, recuperó el Gobierno de la pequeña comunidad para el centroderecha tras la etapa socialista de Concha Andreu, gobernando con el apoyo de Vox. Representa un perfil técnico y académico al frente de la autonomía. Catedrático de Historia Contemporánea, aporta un bagaje intelectual poco habitual entre los presidentes autonómicos; gobierna una de las comunidades menos pobladas de España y centra su gestión en el vino de Rioja, la agricultura, la sanidad y la reclamación de infraestructuras y financiación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0101-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0101-ap-01-it-00",
            "apartado_id": "pod-0101-ap-01",
            "tipo": "evento",
            "titulo": "Académico e historiador",
            "contenido": "Catedrático de Historia Contemporánea, combinó la carrera universitaria con la gestión cultural y educativa antes de dar el salto a la primera línea política.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0101-ap-01-it-01",
            "apartado_id": "pod-0101-ap-01",
            "tipo": "evento",
            "titulo": "Alto cargo y gestión",
            "contenido": "Ocupó responsabilidades en el ámbito de la educación y la cultura, vinculándose al proyecto del PP en distintas administraciones.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0101-ap-01-it-02",
            "apartado_id": "pod-0101-ap-01",
            "tipo": "evento",
            "titulo": "Candidato del PP riojano",
            "contenido": "Lideró la candidatura del PP de La Rioja en 2023 frente al Gobierno socialista de Concha Andreu.",
            "fecha": "2023-05-28",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0101-ap-01-it-03",
            "apartado_id": "pod-0101-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de La Rioja",
            "contenido": "Fue investido presidente de La Rioja en 2023, con el apoyo de Vox, centrando su gestión en el vino, la agricultura, la sanidad y las infraestructuras de la comunidad.",
            "fecha": "2023-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0101-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0101-ap-02-it-00",
            "apartado_id": "pod-0101-ap-02",
            "tipo": "dato",
            "titulo": "Gestión de una comunidad pequeña",
            "contenido": "Defiende los intereses de La Rioja (vino, agua, financiación) y una gestión de centroderecha en una de las comunidades menos pobladas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "la-rioja"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0101-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0101-ap-03-it-00",
            "apartado_id": "pod-0101-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0101-ap-03-it-01",
            "apartado_id": "pod-0101-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -5/10) — Confrontación por financiación e inversiones.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--5",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0102",
    "slug": "isabel-diaz-ayuso",
    "nombre_completo": "Isabel Díaz Ayuso",
    "alias": "Isabel Díaz Ayuso",
    "cargo_actual": "Presidenta de la Comunidad de Madrid",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidenta de la Comunidad de Madrid (PP) desde 2019; la dirigente más mediática del PP, en confrontación frontal con Sánchez.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "madrid"
    ],
    "fuente_principal": "https://www.comunidad.madrid",
    "apartados": [
      {
        "id": "pod-0102-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0102-ap-00-it-00",
            "apartado_id": "pod-0102-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Isabel Díaz Ayuso (Madrid, 1978) es presidenta de la Comunidad de Madrid desde 2019 y la dirigente más influyente y mediática del PP tras Feijóo. Reelegida en 2021 y 2023 con resultados arrolladores (rozando la mayoría absoluta), encarna un liberalismo de confrontación frontal con el Gobierno de Sánchez. Su figura, de enorme proyección nacional, genera tanto fervor en su electorado como rechazo en la izquierda. Convertida en la gran estrella mediática del PP, ha hecho de Madrid un laboratorio de bajadas de impuestos y de su discurso de «libertad» una marca política con eco nacional, en permanente choque con el Gobierno y con peso propio dentro de su partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0102-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0102-ap-01-it-00",
            "apartado_id": "pod-0102-ap-01",
            "tipo": "evento",
            "titulo": "De la comunicación al partido",
            "contenido": "Periodista de formación, desarrolló su carrera en la comunicación del PP de Madrid, con un perfil discreto hasta su salto a la primera línea.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0102-ap-01-it-01",
            "apartado_id": "pod-0102-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta sorpresa",
            "contenido": "En 2019 fue la candidata del PP en Madrid y, pese a un resultado ajustado, logró la presidencia con el apoyo de Ciudadanos y Vox, iniciando un giro liberal.",
            "fecha": "2019-08-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0102-ap-01-it-02",
            "apartado_id": "pod-0102-ap-01",
            "tipo": "evento",
            "titulo": "El fenómeno electoral",
            "contenido": "Su gestión de la pandemia, marcada por la defensa de la hostelería y el lema «libertad», la catapultó: en 2021 arrasó y en 2023 rozó la mayoría absoluta, convirtiéndose en un fenómeno electoral.",
            "fecha": "2021-05-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0102-ap-01-it-03",
            "apartado_id": "pod-0102-ap-01",
            "tipo": "evento",
            "titulo": "Pulso permanente con Moncloa",
            "contenido": "Ha hecho de la confrontación con el Gobierno de Pedro Sánchez su seña de identidad —fiscalidad, sanidad, vivienda, inmigración—, con un peso e influencia que trascienden Madrid y tensionan a veces a la propia dirección del PP.",
            "fecha": "2023-05-28",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0102-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0102-ap-02-it-00",
            "apartado_id": "pod-0102-ap-02",
            "tipo": "dato",
            "titulo": "Liberalismo de confrontación",
            "contenido": "Defiende bajadas de impuestos, la sanidad y educación concertadas y un discurso de «libertad» frente al intervencionismo; la confrontación con Sánchez y el «sanchismo» es el eje de su proyección nacional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "madrid"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0102-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0102-ap-03-it-00",
            "apartado_id": "pod-0102-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -9/10) — Adversaria política frontal; la confrontación con el «sanchismo» es el centro de su estrategia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--9",
              "confrontacion"
            ],
            "orden": 0
          },
          {
            "id": "pod-0102-ap-03-it-01",
            "apartado_id": "pod-0102-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +3/10) — Relación compleja: misma sigla pero con tensiones de liderazgo, peso y estrategia dentro del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+3",
              "tension-interna"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0103",
    "slug": "fernando-lopez-miras",
    "nombre_completo": "Fernando López Miras",
    "alias": "Fernando López Miras",
    "cargo_actual": "Presidente de la Región de Murcia",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidente de la Región de Murcia (PP) desde 2017; bandera del trasvase Tajo-Segura. Gobierna con Vox.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "murcia"
    ],
    "fuente_principal": "https://www.carm.es",
    "apartados": [
      {
        "id": "pod-0103-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0103-ap-00-it-00",
            "apartado_id": "pod-0103-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Fernando López Miras (Lorca, 1983) es presidente de la Región de Murcia desde 2017 y líder del PP murciano. Uno de los presidentes autonómicos más jóvenes, ha resistido sucesivas convulsiones políticas (mociones de censura, pactos) y revalidó el cargo en 2023, gobernando con Vox. Representa un bastión del centroderecha en el sureste peninsular. Pese a su juventud, es ya uno de los presidentes autonómicos con más años en el cargo; ha hecho de la defensa del trasvase Tajo-Segura, la agricultura de regadío y los intereses hídricos de Murcia el centro de su acción política, en choque permanente con la política del agua del Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0103-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0103-ap-01-it-00",
            "apartado_id": "pod-0103-ap-01",
            "tipo": "evento",
            "titulo": "Ascenso rápido en el PP",
            "contenido": "Licenciado en Derecho, tuvo un ascenso meteórico en el PP de Murcia, llegando a la presidencia regional muy joven, en 2017, tras la salida de su predecesor.",
            "fecha": "2017-04-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0103-ap-01-it-01",
            "apartado_id": "pod-0103-ap-01",
            "tipo": "evento",
            "titulo": "Resistir las crisis",
            "contenido": "Sorteó intentos de moción de censura y la inestabilidad de los pactos durante la legislatura, manteniéndose al frente de la Comunidad.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0103-ap-01-it-02",
            "apartado_id": "pod-0103-ap-01",
            "tipo": "evento",
            "titulo": "Revalidación en 2023",
            "contenido": "Ganó las elecciones de 2023 y fue investido con el apoyo de Vox, con quien formó gobierno de coalición en la Región.",
            "fecha": "2023-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0103-ap-01-it-03",
            "apartado_id": "pod-0103-ap-01",
            "tipo": "evento",
            "titulo": "Agua y agricultura",
            "contenido": "Su gestión gira en torno a la defensa del trasvase Tajo-Segura y los intereses agrícolas e hídricos de Murcia, en permanente conflicto con el Gobierno central por la política del agua.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0103-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0103-ap-02-it-00",
            "apartado_id": "pod-0103-ap-02",
            "tipo": "dato",
            "titulo": "Defensa del agua y el trasvase",
            "contenido": "Hace de la defensa del trasvase Tajo-Segura y de la agricultura del sureste su bandera, en confrontación directa con el Gobierno de Sánchez por la política hídrica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "murcia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0103-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0103-ap-03-it-00",
            "apartado_id": "pod-0103-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0103-ap-03-it-01",
            "apartado_id": "pod-0103-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -6/10) — Conflicto frontal por el trasvase Tajo-Segura y la política del agua.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--6",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0104",
    "slug": "maria-chivite",
    "nombre_completo": "María Chivite Navascués",
    "alias": "María Chivite",
    "cargo_actual": "Presidenta de la Comunidad Foral de Navarra",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Presidenta de Navarra (PSN-PSOE) desde 2019; gobierna con apoyos de la izquierda y de EH Bildu.",
    "tags": [
      "politico",
      "psoe",
      "presidente-autonomico",
      "navarra"
    ],
    "fuente_principal": "https://www.navarra.es",
    "apartados": [
      {
        "id": "pod-0104-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0104-ap-00-it-00",
            "apartado_id": "pod-0104-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "María Chivite Navascués (Cintruénigo, 1978) es presidenta de la Comunidad Foral de Navarra desde 2019 y líder del PSN-PSOE. Gobierna una comunidad de gran complejidad política, con apoyos de la izquierda y la abstención o el respaldo del nacionalismo vasco (EH Bildu), lo que ha sido objeto de fuerte controversia con la derecha. Es una barona leal a la dirección federal del PSOE. Primera mujer al frente de Navarra, gobierna una comunidad foral de gran complejidad, donde defiende el régimen y el Convenio Económico propios, una agenda social y unos pactos plurales que la derecha le reprocha con dureza por incluir los apoyos de EH Bildu.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0104-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0104-ap-01-it-00",
            "apartado_id": "pod-0104-ap-01",
            "tipo": "evento",
            "titulo": "Carrera en el socialismo navarro",
            "contenido": "Trabajadora social de formación, desarrolló su carrera en el PSN siendo parlamentaria foral y senadora, hasta liderar el socialismo navarro.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0104-ap-01-it-01",
            "apartado_id": "pod-0104-ap-01",
            "tipo": "evento",
            "titulo": "Primera presidenta de Navarra",
            "contenido": "En 2019 fue investida presidenta de Navarra, la primera mujer en el cargo, con el apoyo de la izquierda y la abstención de EH Bildu, en un pacto muy contestado por la derecha.",
            "fecha": "2019-08-06",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0104-ap-01-it-02",
            "apartado_id": "pod-0104-ap-01",
            "tipo": "evento",
            "titulo": "Reelección en 2023",
            "contenido": "Revalidó la presidencia en 2023, de nuevo con una mayoría plural de izquierdas y nacionalista, consolidando el giro político de la comunidad foral.",
            "fecha": "2023-08-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0104-ap-01-it-03",
            "apartado_id": "pod-0104-ap-01",
            "tipo": "evento",
            "titulo": "Gestión foral",
            "contenido": "Defiende el régimen foral, el Convenio Económico y el autogobierno de Navarra, con una agenda social y de servicios públicos.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0104-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0104-ap-02-it-00",
            "apartado_id": "pod-0104-ap-02",
            "tipo": "dato",
            "titulo": "Socialismo foral y pactos plurales",
            "contenido": "Defiende el autogobierno foral y una agenda social, sostenida en pactos con la izquierda y los apoyos del nacionalismo vasco, lo que la enfrenta a la derecha navarra.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "navarra"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0104-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0104-ap-03-it-00",
            "apartado_id": "pod-0104-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Barona leal a la dirección federal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0105",
    "slug": "imanol-pradales",
    "nombre_completo": "Imanol Pradales Gil",
    "alias": "Imanol Pradales",
    "cargo_actual": "Lehendakari (presidente del Gobierno Vasco)",
    "partido": "PNV",
    "foto_url": null,
    "bio_corta": "Lehendakari (PNV) desde 2024; relevó a Urkullu y gobierna en coalición con el PSE-EE.",
    "tags": [
      "politico",
      "pnv",
      "presidente-autonomico",
      "pais-vasco"
    ],
    "fuente_principal": "https://www.euskadi.eus",
    "apartados": [
      {
        "id": "pod-0105-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0105-ap-00-it-00",
            "apartado_id": "pod-0105-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Imanol Pradales Gil (Santurtzi, 1975) es lehendakari —presidente del Gobierno Vasco— desde 2024 y dirigente del PNV. Sociólogo y exdiputado foral de Bizkaia, relevó a Iñigo Urkullu tras las elecciones vascas de 2024, manteniendo al PNV en la lehendakaritza en coalición con el PSE-EE, en un contexto de fuerte competencia con EH Bildu por la hegemonía nacionalista. Sociólogo y gestor foral, encarna el relevo generacional del PNV tras la larga etapa de Urkullu; defiende la actualización del autogobierno y un nuevo estatus para Euskadi, mientras compite voto a voto con EH Bildu por liderar el nacionalismo vasco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0105-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0105-ap-01-it-00",
            "apartado_id": "pod-0105-ap-01",
            "tipo": "evento",
            "titulo": "Sociólogo y gestor foral",
            "contenido": "Doctor en Sociología y profesor universitario, desarrolló su carrera en la Diputación Foral de Bizkaia, donde fue diputado de áreas como infraestructuras y desarrollo económico.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0105-ap-01-it-01",
            "apartado_id": "pod-0105-ap-01",
            "tipo": "evento",
            "titulo": "Relevo generacional del PNV",
            "contenido": "Fue designado candidato del PNV a lehendakari en sustitución de la larga etapa de Iñigo Urkullu, encarnando el relevo generacional del partido.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0105-ap-01-it-02",
            "apartado_id": "pod-0105-ap-01",
            "tipo": "evento",
            "titulo": "Lehendakari",
            "contenido": "Tras las elecciones vascas de abril de 2024, fue investido lehendakari, manteniendo la coalición de gobierno entre el PNV y los socialistas del PSE-EE.",
            "fecha": "2024-06-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0105-ap-01-it-03",
            "apartado_id": "pod-0105-ap-01",
            "tipo": "evento",
            "titulo": "Pugna con EH Bildu",
            "contenido": "Su mandato se desarrolla en una competencia muy estrecha con EH Bildu, que igualó al PNV en escaños, en torno al autogobierno, el estatus y la gestión de los servicios públicos vascos.",
            "fecha": "2024-06-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0105-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0105-ap-02-it-00",
            "apartado_id": "pod-0105-ap-02",
            "tipo": "dato",
            "titulo": "Nacionalismo vasco de gestión",
            "contenido": "Defiende el autogobierno y la actualización del estatus de Euskadi y una gestión moderada, en pugna por la hegemonía nacionalista con EH Bildu y en relación pragmática con el Gobierno de Sánchez, al que el PNV apoya en Madrid.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "pais-vasco"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0105-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0105-ap-03-it-00",
            "apartado_id": "pod-0105-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +6/10) — El PNV es socio de investidura y apoyo parlamentario del Gobierno en Madrid.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0106",
    "slug": "juan-francisco-perez-llorca",
    "nombre_completo": "Juan Francisco Pérez Llorca",
    "alias": "Pérez Llorca",
    "cargo_actual": "Presidente de la Generalitat Valenciana",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Presidente de la Generalitat Valenciana (PP) desde diciembre de 2025; sucedió a Mazón tras su dimisión por la DANA.",
    "tags": [
      "politico",
      "pp",
      "presidente-autonomico",
      "comunidad-valenciana"
    ],
    "fuente_principal": "https://www.gva.es",
    "apartados": [
      {
        "id": "pod-0106-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0106-ap-00-it-00",
            "apartado_id": "pod-0106-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Juan Francisco Pérez Llorca (Finestrat, Alicante) es presidente de la Generalitat Valenciana desde diciembre de 2025 y dirigente del PP en la comunidad. Hasta entonces síndic (portavoz) del grupo popular en Les Corts y exalcalde de Finestrat, fue elegido para suceder a Carlos Mazón, que dimitió por su gestión de la catastrófica DANA de 2024. Fue investido con el apoyo de Vox. Político de la provincia de Alicante y negociador del grupo popular, llegó a la presidencia en circunstancias excepcionales con la misión de pilotar la reconstrucción de las comarcas arrasadas por las inundaciones y devolver la estabilidad política a la Comunitat.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0106-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0106-ap-01-it-00",
            "apartado_id": "pod-0106-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Finestrat",
            "contenido": "Desarrolló su carrera política en el PP de la provincia de Alicante, siendo alcalde de Finestrat y cargo orgánico del partido en la Comunidad Valenciana.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0106-ap-01-it-01",
            "apartado_id": "pod-0106-ap-01",
            "tipo": "evento",
            "titulo": "Síndic del PP en Les Corts",
            "contenido": "Como portavoz parlamentario del PP en Les Corts Valencianes, se convirtió en una pieza clave de la gestión política del grupo y de las relaciones con Vox.",
            "fecha": "2023-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0106-ap-01-it-02",
            "apartado_id": "pod-0106-ap-01",
            "tipo": "evento",
            "titulo": "La sucesión de Mazón",
            "contenido": "Tras la dimisión de Carlos Mazón en noviembre de 2025 —un año después de la DANA que causó más de dos centenares de muertos y por cuya gestión fue duramente cuestionado—, el PP lo eligió como candidato a la Generalitat.",
            "fecha": "2025-11-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0106-ap-01-it-03",
            "apartado_id": "pod-0106-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de la Generalitat",
            "contenido": "Fue investido president de la Generalitat Valenciana en diciembre de 2025 con el apoyo de Vox, con el reto de gestionar la reconstrucción tras la DANA y recomponer la situación política de la Comunidad.",
            "fecha": "2025-12-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0106-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0106-ap-02-it-00",
            "apartado_id": "pod-0106-ap-02",
            "tipo": "dato",
            "titulo": "Reconstrucción tras la DANA",
            "contenido": "Su prioridad declarada es la reconstrucción de las zonas devastadas por la DANA y la recuperación de la estabilidad política, desde una gestión de centroderecha apoyada en Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "comunidad-valenciana"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0106-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0106-ap-03-it-00",
            "apartado_id": "pod-0106-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional, que pilotó la sucesión de Mazón.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0106-ap-03-it-01",
            "apartado_id": "pod-0106-ap-03",
            "tipo": "contacto",
            "titulo": "Santiago Abascal",
            "contenido": "**Líder de Vox** (nota +4/10) — Su investidura dependió del apoyo de Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "nota-+4",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0107",
    "slug": "jose-luis-martinez-almeida",
    "nombre_completo": "José Luis Martínez-Almeida Navasqüés",
    "alias": "José Luis Martínez-Almeida",
    "cargo_actual": "Alcalde de Madrid",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcalde de Madrid (PP) desde 2019, con mayoría absoluta desde 2023, y portavoz nacional del Partido Popular.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "madrid"
    ],
    "fuente_principal": "https://www.madrid.es",
    "apartados": [
      {
        "id": "pod-0107-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0107-ap-00-it-00",
            "apartado_id": "pod-0107-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Luis Martínez-Almeida Navasqüés (Madrid, 1975) es alcalde de Madrid desde 2019 y portavoz nacional del Partido Popular. Abogado del Estado, llegó a la alcaldía de la capital en 2019 con el apoyo de Ciudadanos y Vox y en 2023 revalidó el cargo con mayoría absoluta. De estilo afable e irónico, combina la gestión del mayor ayuntamiento de España con un papel destacado como una de las voces nacionales del PP y como estrecho aliado de Isabel Díaz Ayuso en Madrid, lo que le da un peso político que trasciende lo municipal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0107-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0107-ap-01-it-00",
            "apartado_id": "pod-0107-ap-01",
            "tipo": "evento",
            "titulo": "Abogado del Estado y concejal",
            "contenido": "Abogado del Estado de profesión, entró en política en el PP de Madrid como concejal y portavoz del grupo municipal, ganando peso en la oposición al gobierno de Manuela Carmena.",
            "fecha": "2015-06-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0107-ap-01-it-01",
            "apartado_id": "pod-0107-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Madrid",
            "contenido": "En 2019 fue investido alcalde de Madrid pese a no ganar las elecciones, gracias a un pacto con Ciudadanos y Vox que desalojó a la izquierda del consistorio.",
            "fecha": "2019-06-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0107-ap-01-it-02",
            "apartado_id": "pod-0107-ap-01",
            "tipo": "evento",
            "titulo": "Mayoría absoluta",
            "contenido": "En 2023 arrasó en las urnas y revalidó la alcaldía con mayoría absoluta, consolidando su liderazgo en la capital.",
            "fecha": "2023-05-28",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0107-ap-01-it-03",
            "apartado_id": "pod-0107-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz nacional del PP",
            "contenido": "Compagina la alcaldía con la portavocía nacional del Partido Popular, lo que lo convierte en una de las caras más visibles del partido a nivel estatal.",
            "fecha": "2022-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0107-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0107-ap-02-it-00",
            "apartado_id": "pod-0107-ap-02",
            "tipo": "dato",
            "titulo": "Gestión municipal y voz del PP",
            "contenido": "Defiende una gestión liberal-conservadora de la ciudad (limpieza, movilidad, grandes eventos) y ejerce de portavoz nacional del PP, con un tono combativo pero de registro amable hacia el Gobierno de Sánchez.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "madrid"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0107-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0107-ap-03-it-00",
            "apartado_id": "pod-0107-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +8/10) — Portavoz nacional del partido y hombre de máxima confianza de la dirección.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+8",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0107-ap-03-it-01",
            "apartado_id": "pod-0107-ap-03",
            "tipo": "contacto",
            "titulo": "Isabel Díaz Ayuso",
            "contenido": "**Presidenta de la Comunidad de Madrid** (nota +6/10) — Tándem institucional en Madrid (Ayuntamiento y Comunidad), con sintonía política.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0108",
    "slug": "jaume-collboni",
    "nombre_completo": "Jaume Collboni Cuadrado",
    "alias": "Jaume Collboni",
    "cargo_actual": "Alcalde de Barcelona",
    "partido": "PSC",
    "foto_url": null,
    "bio_corta": "Alcalde de Barcelona (PSC) desde 2023; puso fin a la etapa de Ada Colau frenando al independentista Trias.",
    "tags": [
      "politico",
      "psc",
      "alcalde",
      "cataluna"
    ],
    "fuente_principal": "https://www.barcelona.cat",
    "apartados": [
      {
        "id": "pod-0108-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0108-ap-00-it-00",
            "apartado_id": "pod-0108-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Jaume Collboni Cuadrado (Barcelona, 1969) es alcalde de Barcelona desde 2023 y dirigente del PSC. Puso fin a la etapa de los comunes de Ada Colau al ser investido alcalde pese a quedar tercero, gracias a una insólita confluencia de votos del PSC, el PP y los comunes que frenó al independentista Xavier Trias (Junts). Representa el regreso del socialismo a la alcaldía de la capital catalana, con una agenda centrada en la seguridad, la vivienda, la regulación del turismo y la reactivación económica de la ciudad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0108-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0108-ap-01-it-00",
            "apartado_id": "pod-0108-ap-01",
            "tipo": "evento",
            "titulo": "Carrera en el PSC",
            "contenido": "Desarrolló su carrera en el PSC y en las Juventudes Socialistas, llegando a diputado en el Parlament y primer secretario del PSC de Barcelona.",
            "fecha": "2003-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0108-ap-01-it-01",
            "apartado_id": "pod-0108-ap-01",
            "tipo": "evento",
            "titulo": "Teniente de alcalde con Colau",
            "contenido": "Fue primer teniente de alcalde y responsable de economía en el gobierno municipal de Ada Colau, en una etapa de coalición entre comunes y socialistas.",
            "fecha": "2019-06-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0108-ap-01-it-02",
            "apartado_id": "pod-0108-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Barcelona",
            "contenido": "En 2023, pese a quedar tercero en votos, fue investido alcalde con el apoyo de PP y comunes para evitar la alcaldía del independentista Xavier Trias.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0108-ap-01-it-03",
            "apartado_id": "pod-0108-ap-01",
            "tipo": "evento",
            "titulo": "Agenda de gestión",
            "contenido": "Su mandato se centra en la seguridad, el acceso a la vivienda, la regulación del turismo masivo y la proyección económica e internacional de Barcelona.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0108-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0108-ap-02-it-00",
            "apartado_id": "pod-0108-ap-02",
            "tipo": "dato",
            "titulo": "Socialismo municipal catalán",
            "contenido": "Defiende un catalanismo no independentista y una gestión centrada en seguridad, vivienda y turismo, en sintonía con el Gobierno de Sánchez y la Generalitat de Illa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psc",
              "cataluna"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0108-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0108-ap-03-it-00",
            "apartado_id": "pod-0108-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Alineado con la dirección federal del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0108-ap-03-it-01",
            "apartado_id": "pod-0108-ap-03",
            "tipo": "contacto",
            "titulo": "Salvador Illa",
            "contenido": "**Presidente de la Generalitat de Cataluña** (nota +6/10) — Mismo partido (PSC) y estrecha cooperación institucional ciudad-Generalitat.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psc",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0109",
    "slug": "maria-jose-catala",
    "nombre_completo": "María José Catalá Verdet",
    "alias": "María José Catalá",
    "cargo_actual": "Alcaldesa de Valencia",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcaldesa de Valencia (PP) desde 2023; puso fin a los 8 años de Compromís de Joan Ribó. Gobierna con Vox.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "comunidad-valenciana"
    ],
    "fuente_principal": "https://www.valencia.es",
    "apartados": [
      {
        "id": "pod-0109-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0109-ap-00-it-00",
            "apartado_id": "pod-0109-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "María José Catalá Verdet (Torrent, Valencia, 1981) es alcaldesa de Valencia desde 2023 y una de las dirigentes emergentes del PP. Exconsejera de Educación de la Generalitat Valenciana y portavoz popular, ganó las elecciones municipales de 2023 poniendo fin a los ocho años de gobierno de Compromís de Joan Ribó. Gobierna la tercera ciudad de España con el apoyo de Vox y ha ganado proyección autonómica tras la crisis de la DANA y el relevo en la Generalitat, situándose como una de las figuras de referencia del PP valenciano.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0109-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0109-ap-01-it-00",
            "apartado_id": "pod-0109-ap-01",
            "tipo": "evento",
            "titulo": "Joven dirigente del PP valenciano",
            "contenido": "Doctora en Derecho, tuvo un ascenso rápido en el PP valenciano, siendo alcaldesa de Torrent y consejera de Educación de la Generalitat a muy temprana edad.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0109-ap-01-it-01",
            "apartado_id": "pod-0109-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz y oposición",
            "contenido": "Tras la pérdida del poder del PP en la Comunidad Valenciana, ejerció de portavoz municipal en Valencia, liderando la oposición a Joan Ribó (Compromís).",
            "fecha": "2019-06-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0109-ap-01-it-02",
            "apartado_id": "pod-0109-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldesa de Valencia",
            "contenido": "Ganó las elecciones de 2023 y fue investida alcaldesa de Valencia con el apoyo de Vox, recuperando la capital para el centroderecha tras ocho años de Compromís.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0109-ap-01-it-03",
            "apartado_id": "pod-0109-ap-01",
            "tipo": "evento",
            "titulo": "Proyección autonómica",
            "contenido": "Su peso creció con la crisis posterior a la DANA y la dimisión de Mazón, consolidándose como una de las dirigentes con mayor proyección del PP en la Comunidad Valenciana.",
            "fecha": "2025-11-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0109-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0109-ap-02-it-00",
            "apartado_id": "pod-0109-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha en Valencia",
            "contenido": "Defiende una gestión de centroderecha (fiscalidad, grandes proyectos, Fallas y turismo) y se ha consolidado como una de las dirigentes con mayor proyección del PP valenciano.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "comunidad-valenciana"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0109-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0109-ap-03-it-00",
            "apartado_id": "pod-0109-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineada con la dirección nacional, que valora su proyección.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0109-ap-03-it-01",
            "apartado_id": "pod-0109-ap-03",
            "tipo": "contacto",
            "titulo": "Juan Francisco Pérez Llorca",
            "contenido": "**Presidente de la Generalitat Valenciana** (nota +5/10) — Coordinación PP entre ciudad y Generalitat tras el relevo de Mazón.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+5",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0110",
    "slug": "jose-luis-sanz",
    "nombre_completo": "José Luis Sanz Ruiz",
    "alias": "José Luis Sanz",
    "cargo_actual": "Alcalde de Sevilla",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcalde de Sevilla (PP) desde 2023; arrebató la capital andaluza al PSOE.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "andalucia"
    ],
    "fuente_principal": "https://www.sevilla.org",
    "apartados": [
      {
        "id": "pod-0110-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0110-ap-00-it-00",
            "apartado_id": "pod-0110-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Luis Sanz Ruiz es alcalde de Sevilla desde 2023, dirigente del PP. Exalcalde de Tomares y senador, ganó las elecciones de 2023 arrebatando la capital andaluza al PSOE de Antonio Muñoz. Gobierna la cuarta ciudad de España con una agenda centrada en las grandes infraestructuras (la ampliación del metro, los accesos), el turismo, la Semana Santa y los grandes eventos, en una ciudad históricamente disputada entre el PSOE y el PP y de enorme peso simbólico en Andalucía. Su victoria en una de las ciudades más pobladas del país reforzó el avance del PP en la Andalucía urbana tras la conquista de la Junta por Moreno Bonilla.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0110-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0110-ap-01-it-00",
            "apartado_id": "pod-0110-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Tomares",
            "contenido": "Desarrolló su carrera en el PP de Sevilla y fue durante años alcalde de Tomares, uno de los municipios de mayor renta del área metropolitana sevillana.",
            "fecha": "2003-06-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0110-ap-01-it-01",
            "apartado_id": "pod-0110-ap-01",
            "tipo": "evento",
            "titulo": "Senador y portavoz",
            "contenido": "Fue senador y portavoz del PP, ganando proyección antes de centrarse en la conquista de la alcaldía de la capital.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0110-ap-01-it-02",
            "apartado_id": "pod-0110-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Sevilla",
            "contenido": "Ganó las elecciones municipales de 2023 y fue investido alcalde de Sevilla, desbancando al PSOE de la capital andaluza.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0110-ap-01-it-03",
            "apartado_id": "pod-0110-ap-01",
            "tipo": "evento",
            "titulo": "Gestión de la capital",
            "contenido": "Su mandato se centra en el transporte (la ampliación del metro), el turismo, la cultura y las grandes infraestructuras de una de las ciudades más visitadas de España.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0110-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0110-ap-02-it-00",
            "apartado_id": "pod-0110-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha andaluz",
            "contenido": "Defiende una gestión de centroderecha y reclama inversiones del Estado en infraestructuras (metro, cercanías), en sintonía con la Junta de Moreno Bonilla.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "andalucia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0110-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0110-ap-03-it-00",
            "apartado_id": "pod-0110-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0110-ap-03-it-01",
            "apartado_id": "pod-0110-ap-03",
            "tipo": "contacto",
            "titulo": "Juan Manuel Moreno Bonilla",
            "contenido": "**Presidente de la Junta de Andalucía** (nota +6/10) — Coordinación PP entre la capital y la Junta.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0111",
    "slug": "natalia-chueca",
    "nombre_completo": "Natalia Chueca Muñoz",
    "alias": "Natalia Chueca",
    "cargo_actual": "Alcaldesa de Zaragoza",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcaldesa de Zaragoza (PP) desde 2023; sucedió a Azcón al frente de la ciudad.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "aragon"
    ],
    "fuente_principal": "https://www.zaragoza.es",
    "apartados": [
      {
        "id": "pod-0111-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0111-ap-00-it-00",
            "apartado_id": "pod-0111-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Natalia Chueca Muñoz (Zaragoza, 1976) es alcaldesa de Zaragoza desde 2023, dirigente del PP. Procedente del sector privado y del equipo de Jorge Azcón, a quien sucedió cuando este dio el salto a la presidencia de Aragón, ganó las elecciones de 2023 y mantuvo la quinta ciudad de España en manos del centroderecha. Gobierna con un perfil de gestión centrado en la digitalización, la movilidad sostenible, la vivienda y los grandes proyectos urbanos de la capital aragonesa. Es una de las pocas mujeres al frente de una gran capital y representa el perfil de gestora procedente del mundo de la empresa que el PP ha impulsado en los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0111-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0111-ap-01-it-00",
            "apartado_id": "pod-0111-ap-01",
            "tipo": "evento",
            "titulo": "Del sector privado a la política",
            "contenido": "Con experiencia en la empresa privada y la consultoría, entró en la política municipal de la mano de Jorge Azcón, ocupando concejalías en el Ayuntamiento de Zaragoza.",
            "fecha": "2019-06-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0111-ap-01-it-01",
            "apartado_id": "pod-0111-ap-01",
            "tipo": "evento",
            "titulo": "Concejala de área",
            "contenido": "Como concejala en el gobierno de Azcón, gestionó áreas de servicios públicos, medio ambiente y movilidad de la ciudad.",
            "fecha": "2019-06-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0111-ap-01-it-02",
            "apartado_id": "pod-0111-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldesa de Zaragoza",
            "contenido": "Cuando Azcón asumió la presidencia de Aragón en 2023, ella encabezó la candidatura y fue investida alcaldesa, manteniendo la capital para el PP.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0111-ap-01-it-03",
            "apartado_id": "pod-0111-ap-01",
            "tipo": "evento",
            "titulo": "Gestión urbana",
            "contenido": "Su mandato se centra en la digitalización, la movilidad sostenible, la vivienda y los grandes proyectos urbanísticos de la quinta ciudad de España.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0111-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0111-ap-02-it-00",
            "apartado_id": "pod-0111-ap-02",
            "tipo": "dato",
            "titulo": "Gestión de centroderecha",
            "contenido": "Defiende una gestión municipal de centroderecha centrada en servicios, movilidad e inversión, en estrecha coordinación con el Gobierno de Aragón de Jorge Azcón.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "aragon"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0111-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0111-ap-03-it-00",
            "apartado_id": "pod-0111-ap-03",
            "tipo": "contacto",
            "titulo": "Jorge Azcón",
            "contenido": "**Presidente de Aragón** (nota +7/10) — Mentor político: Chueca fue su concejala y su sucesora en la alcaldía de Zaragoza.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0111-ap-03-it-01",
            "apartado_id": "pod-0111-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Alineada con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0112",
    "slug": "francisco-de-la-torre",
    "nombre_completo": "Francisco de la Torre Prados",
    "alias": "Francisco de la Torre",
    "cargo_actual": "Alcalde de Málaga",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcalde de Málaga (PP) desde 2000; uno de los regidores más veteranos de España.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "andalucia"
    ],
    "fuente_principal": "https://www.malaga.eu",
    "apartados": [
      {
        "id": "pod-0112-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0112-ap-00-it-00",
            "apartado_id": "pod-0112-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Francisco de la Torre Prados (Málaga, 1942) es alcalde de Málaga desde 2000, uno de los regidores más veteranos y longevos de España. Economista y técnico del Estado, ha gobernado la ciudad durante más de dos décadas, transformándola en un polo cultural (los museos), tecnológico y turístico de primer orden. Su longevidad, su perfil moderado y transversal y sus sucesivas reelecciones lo han convertido en una figura singular dentro del PP y en una marca personal ligada al auge de Málaga. Con más de ochenta años, sigue siendo una rareza en la política española por su longevidad y por su independencia respecto a los vaivenes internos del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0112-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0112-ap-01-it-00",
            "apartado_id": "pod-0112-ap-01",
            "tipo": "evento",
            "titulo": "Décadas en la política malagueña",
            "contenido": "Con una larguísima trayectoria que se remonta a la etapa preautonómica, ocupó cargos en la Diputación y la administración antes de centrarse en la ciudad de Málaga.",
            "fecha": "1995-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0112-ap-01-it-01",
            "apartado_id": "pod-0112-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Málaga",
            "contenido": "Accedió a la alcaldía de Málaga en 2000 y desde entonces ha revalidado el cargo en sucesivas elecciones, con y sin mayoría absoluta.",
            "fecha": "2000-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0112-ap-01-it-02",
            "apartado_id": "pod-0112-ap-01",
            "tipo": "evento",
            "titulo": "La transformación de Málaga",
            "contenido": "Bajo su mandato, Málaga vivió una profunda transformación urbana y económica, con la apuesta por los museos (Picasso, Pompidou, Thyssen), la tecnología y el turismo.",
            "fecha": "2010-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0112-ap-01-it-03",
            "apartado_id": "pod-0112-ap-01",
            "tipo": "evento",
            "titulo": "Decano de los grandes alcaldes",
            "contenido": "Su permanencia de más de dos décadas lo ha convertido en uno de los alcaldes más veteranos del país, con un perfil personalista y moderado.",
            "fecha": "2023-05-28",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0112-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0112-ap-02-it-00",
            "apartado_id": "pod-0112-ap-02",
            "tipo": "dato",
            "titulo": "Málaga como marca",
            "contenido": "Defiende el modelo de Málaga como ciudad de cultura, tecnología y turismo, con un perfil moderado y transversal que trasciende la disciplina estricta de partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "andalucia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0112-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0112-ap-03-it-00",
            "apartado_id": "pod-0112-ap-03",
            "tipo": "contacto",
            "titulo": "Juan Manuel Moreno Bonilla",
            "contenido": "**Presidente de la Junta de Andalucía** (nota +6/10) — Coordinación PP entre la ciudad y la Junta.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0112-ap-03-it-01",
            "apartado_id": "pod-0112-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Veterano del partido, con perfil propio y autonomía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0113",
    "slug": "jose-ballesta",
    "nombre_completo": "José Antonio Ballesta Germán",
    "alias": "José Ballesta",
    "cargo_actual": "Alcalde de Murcia",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcalde de Murcia (PP); lo fue 2015-2021 (cesado por moción de censura) y recuperó la alcaldía en 2023.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "murcia"
    ],
    "fuente_principal": "https://www.murcia.es",
    "apartados": [
      {
        "id": "pod-0113-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0113-ap-00-it-00",
            "apartado_id": "pod-0113-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José Antonio Ballesta Germán es alcalde de Murcia, dirigente del PP. Catedrático universitario y exrector, fue alcalde de la ciudad entre 2015 y 2021 —cuando una moción de censura lo desalojó— y recuperó la alcaldía tras las elecciones de 2023. Gobierna la séptima ciudad de España, con una agenda centrada en la huerta, el soterramiento del ferrocarril, el agua y la modernización urbana, en coordinación con el Gobierno regional de Fernando López Miras. Profesor universitario y gestor antes que político de partido, afronta el reto de modernizar la séptima ciudad de España y de cerrar heridas tras la inestabilidad institucional del mandato anterior.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0113-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0113-ap-01-it-00",
            "apartado_id": "pod-0113-ap-01",
            "tipo": "evento",
            "titulo": "Catedrático y gestor",
            "contenido": "Catedrático universitario y exrector de la Universidad de Murcia, dio el salto a la política municipal de la mano del PP.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0113-ap-01-it-01",
            "apartado_id": "pod-0113-ap-01",
            "tipo": "evento",
            "titulo": "Primer mandato y moción de censura",
            "contenido": "Fue alcalde de Murcia desde 2015 hasta 2021, cuando una moción de censura de PSOE y Ciudadanos le arrebató la alcaldía.",
            "fecha": "2015-06-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0113-ap-01-it-02",
            "apartado_id": "pod-0113-ap-01",
            "tipo": "evento",
            "titulo": "Regreso a la alcaldía",
            "contenido": "Tras las elecciones de 2023 recuperó la alcaldía de Murcia para el PP, volviendo al cargo que había perdido dos años antes.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0113-ap-01-it-03",
            "apartado_id": "pod-0113-ap-01",
            "tipo": "evento",
            "titulo": "Gestión de la ciudad",
            "contenido": "Su mandato se centra en el soterramiento del ferrocarril, la huerta, el agua y la modernización de una de las grandes ciudades del sureste.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0113-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0113-ap-02-it-00",
            "apartado_id": "pod-0113-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha murciano",
            "contenido": "Defiende los intereses de Murcia (agua, huerta, infraestructuras) en coordinación con el Gobierno regional de López Miras.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "murcia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0113-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0113-ap-03-it-00",
            "apartado_id": "pod-0113-ap-03",
            "tipo": "contacto",
            "titulo": "Fernando López Miras",
            "contenido": "**Presidente de la Región de Murcia** (nota +6/10) — Coordinación PP entre la capital y la Comunidad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0113-ap-03-it-01",
            "apartado_id": "pod-0113-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0114",
    "slug": "jaime-martinez",
    "nombre_completo": "Jaime Martínez Llabrés",
    "alias": "Jaime Martínez",
    "cargo_actual": "Alcalde de Palma",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcalde de Palma (PP) desde 2023; exconsejero de Turismo del Govern balear.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "baleares"
    ],
    "fuente_principal": "https://www.palma.cat",
    "apartados": [
      {
        "id": "pod-0114-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0114-ap-00-it-00",
            "apartado_id": "pod-0114-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Jaime Martínez Llabrés es alcalde de Palma desde 2023, dirigente del PP balear. Exconsejero de Turismo del Govern, ganó las elecciones municipales de 2023 y recuperó la capital balear para el centroderecha. Gobierna la mayor ciudad de las islas, marcada por la fuerte presión turística, el difícil acceso a la vivienda y la movilidad, en sintonía con el Govern de Marga Prohens y con un perfil de gestión ligado al sector turístico, motor económico del archipiélago. Gobierna una ciudad tensionada entre su éxito turístico y los problemas de vivienda y saturación que ese mismo éxito genera, en una de las comunidades con mayor presión inmobiliaria de España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0114-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0114-ap-01-it-00",
            "apartado_id": "pod-0114-ap-01",
            "tipo": "evento",
            "titulo": "Empresa y turismo",
            "contenido": "Con experiencia en el sector empresarial y turístico, desarrolló su carrera política en el PP de Baleares, llegando a consejero de Turismo del Govern.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0114-ap-01-it-01",
            "apartado_id": "pod-0114-ap-01",
            "tipo": "evento",
            "titulo": "Consejero autonómico",
            "contenido": "Ocupó responsabilidades de gobierno en la Comunidad Autónoma, especialmente en el área de turismo, motor económico de las islas.",
            "fecha": "2011-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0114-ap-01-it-02",
            "apartado_id": "pod-0114-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Palma",
            "contenido": "Ganó las elecciones de 2023 y fue investido alcalde de Palma, recuperando la capital balear para el PP.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0114-ap-01-it-03",
            "apartado_id": "pod-0114-ap-01",
            "tipo": "evento",
            "titulo": "Turismo y vivienda",
            "contenido": "Su mandato afronta la masificación turística, la emergencia habitacional y la movilidad de una ciudad mediterránea de gran atractivo.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0114-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0114-ap-02-it-00",
            "apartado_id": "pod-0114-ap-02",
            "tipo": "dato",
            "titulo": "Gestión turística insular",
            "contenido": "Defiende un modelo turístico ordenado y medidas sobre vivienda y movilidad, en coordinación con el Govern de Marga Prohens.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "baleares"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0114-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0114-ap-03-it-00",
            "apartado_id": "pod-0114-ap-03",
            "tipo": "contacto",
            "titulo": "Marga Prohens",
            "contenido": "**Presidenta del Govern de las Islas Baleares** (nota +6/10) — Coordinación PP entre la capital y el Govern.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0114-ap-03-it-01",
            "apartado_id": "pod-0114-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0115",
    "slug": "carolina-darias",
    "nombre_completo": "Carolina Darias San Sebastián",
    "alias": "Carolina Darias",
    "cargo_actual": "Alcaldesa de Las Palmas de Gran Canaria",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Alcaldesa de Las Palmas de Gran Canaria (PSOE) desde 2023; exministra de Sanidad de Sánchez.",
    "tags": [
      "politico",
      "psoe",
      "alcalde",
      "canarias"
    ],
    "fuente_principal": "https://www.laspalmasgc.es",
    "apartados": [
      {
        "id": "pod-0115-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0115-ap-00-it-00",
            "apartado_id": "pod-0115-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Carolina Darias San Sebastián (Las Palmas de Gran Canaria, 1965) es alcaldesa de Las Palmas de Gran Canaria desde 2023 y dirigente del PSOE canario. Antes fue ministra de Política Territorial y de Sanidad en el Gobierno de Pedro Sánchez, donde gestionó parte de la pandemia de COVID-19. Jurista y veterana política, regresó a su ciudad natal para liderar la alcaldía de la capital grancanaria, con una agenda de vivienda, turismo, movilidad y servicios sociales. Su salto de ministra a alcaldesa ilustra el peso que el PSOE concede al poder municipal y la convierte en una de las socialistas de mayor perfil institucional en Canarias.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0115-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0115-ap-01-it-00",
            "apartado_id": "pod-0115-ap-01",
            "tipo": "evento",
            "titulo": "Política canaria y estatal",
            "contenido": "Jurista de formación, desarrolló su carrera en la política canaria (fue consejera y parlamentaria) antes de dar el salto al Gobierno central.",
            "fecha": "2007-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0115-ap-01-it-01",
            "apartado_id": "pod-0115-ap-01",
            "tipo": "evento",
            "titulo": "Ministra de Sánchez",
            "contenido": "Fue ministra de Política Territorial y Función Pública y después ministra de Sanidad en el Gobierno de Pedro Sánchez, gestionando parte de la pandemia.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0115-ap-01-it-02",
            "apartado_id": "pod-0115-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldesa de Las Palmas",
            "contenido": "En 2023 encabezó la candidatura socialista y fue investida alcaldesa de Las Palmas de Gran Canaria, regresando a la política municipal de su ciudad.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0115-ap-01-it-03",
            "apartado_id": "pod-0115-ap-01",
            "tipo": "evento",
            "titulo": "Gestión de la capital",
            "contenido": "Su mandato se centra en el turismo, la vivienda, la movilidad y los servicios sociales de una de las mayores ciudades canarias.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0115-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0115-ap-02-it-00",
            "apartado_id": "pod-0115-ap-02",
            "tipo": "dato",
            "titulo": "Socialismo municipal canario",
            "contenido": "Defiende una agenda social y de servicios públicos, leal a la dirección federal del PSOE, en una comunidad gobernada por Coalición Canaria y el PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "canarias"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0115-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0115-ap-03-it-00",
            "apartado_id": "pod-0115-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Exministra de su Gobierno, leal a la dirección federal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0116",
    "slug": "juan-mari-aburto",
    "nombre_completo": "Juan María Aburto Rike",
    "alias": "Juan Mari Aburto",
    "cargo_actual": "Alcalde de Bilbao",
    "partido": "PNV",
    "foto_url": null,
    "bio_corta": "Alcalde de Bilbao (PNV) desde 2015; sucesor de Azkuna, gobierna con el PSE-EE.",
    "tags": [
      "politico",
      "pnv",
      "alcalde",
      "pais-vasco"
    ],
    "fuente_principal": "https://www.bilbao.eus",
    "apartados": [
      {
        "id": "pod-0116-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0116-ap-00-it-00",
            "apartado_id": "pod-0116-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Juan María Aburto Rike (Bilbao, 1961) es alcalde de Bilbao desde 2015, dirigente del PNV. Procedente del ámbito social y de la Diputación Foral de Bizkaia, ha consolidado el dominio jeltzale en la capital vizcaína, gobernando habitualmente en coalición con el PSE-EE. Representa la continuidad del nacionalismo moderado del PNV en la gestión de la mayor ciudad del País Vasco, con la cultura, la transformación urbana postindustrial y los servicios como ejes de su mandato. Bajo su gestión, Bilbao ha seguido proyectándose internacionalmente como modelo de regeneración urbana —el llamado «efecto Guggenheim»—, referencia mundial de transformación de ciudades industriales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0116-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0116-ap-01-it-00",
            "apartado_id": "pod-0116-ap-01",
            "tipo": "evento",
            "titulo": "Del ámbito social a la Diputación",
            "contenido": "Vinculado al mundo asociativo y social, desarrolló su carrera en el PNV y en la Diputación Foral de Bizkaia, donde fue diputado de Empleo y Políticas Sociales.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0116-ap-01-it-01",
            "apartado_id": "pod-0116-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Bilbao",
            "contenido": "Sucedió a Iñaki Azkuna al frente de la alcaldía de Bilbao en 2015, dando continuidad al proyecto de transformación de la ciudad.",
            "fecha": "2015-06-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0116-ap-01-it-02",
            "apartado_id": "pod-0116-ap-01",
            "tipo": "evento",
            "titulo": "Reelecciones",
            "contenido": "Ha revalidado la alcaldía en sucesivas elecciones, manteniendo el liderazgo del PNV en la capital vizcaína en coalición con los socialistas.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0116-ap-01-it-03",
            "apartado_id": "pod-0116-ap-01",
            "tipo": "evento",
            "titulo": "Bilbao postindustrial",
            "contenido": "Su gestión profundiza en la transformación de Bilbao como ciudad de servicios, cultura y turismo tras su reconversión industrial, con el Guggenheim como símbolo.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0116-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0116-ap-02-it-00",
            "apartado_id": "pod-0116-ap-02",
            "tipo": "dato",
            "titulo": "Nacionalismo moderado de gestión",
            "contenido": "Defiende un PNV de gestión y transformación urbana, en coalición con el PSE-EE, dentro de la estrategia del partido en las instituciones vascas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "pais-vasco"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0116-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0116-ap-03-it-00",
            "apartado_id": "pod-0116-ap-03",
            "tipo": "contacto",
            "titulo": "Imanol Pradales",
            "contenido": "**Lehendakari (Gobierno Vasco)** (nota +7/10) — Mismo partido (PNV); coordinación entre la capital y el Gobierno vasco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0117",
    "slug": "jesus-julio-carnero",
    "nombre_completo": "Jesús Julio Carnero García",
    "alias": "Jesús Julio Carnero",
    "cargo_actual": "Alcalde de Valladolid",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcalde de Valladolid (PP) desde 2023; desbancó al socialista Óscar Puente. Gobierna con Vox.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "castilla-y-leon"
    ],
    "fuente_principal": "https://www.valladolid.es",
    "apartados": [
      {
        "id": "pod-0117-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0117-ap-00-it-00",
            "apartado_id": "pod-0117-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Jesús Julio Carnero García es alcalde de Valladolid desde 2023, dirigente del PP de Castilla y León. Abogado y veterano cargo autonómico —fue consejero de la Junta y presidente de la Diputación de Valladolid—, ganó la alcaldía en 2023 arrebatándola al socialista Óscar Puente, que poco después se incorporó al Gobierno de Sánchez como ministro de Transportes. Gobierna la capital vallisoletana con el apoyo de Vox y una agenda industrial, de movilidad y de vivienda. Su llegada a la alcaldía estuvo ligada al ascenso de Óscar Puente a la primera línea estatal, y dirige una ciudad clave para la automoción española en plena transformación del sector hacia el vehículo eléctrico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0117-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0117-ap-01-it-00",
            "apartado_id": "pod-0117-ap-01",
            "tipo": "evento",
            "titulo": "Cargo autonómico y provincial",
            "contenido": "Abogado, desarrolló una larga carrera en el PP de Castilla y León, siendo presidente de la Diputación de Valladolid y consejero de la Junta.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0117-ap-01-it-01",
            "apartado_id": "pod-0117-ap-01",
            "tipo": "evento",
            "titulo": "Consejero de la Junta",
            "contenido": "Ocupó consejerías en el Gobierno autonómico de Castilla y León, ganando experiencia de gestión.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0117-ap-01-it-02",
            "apartado_id": "pod-0117-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Valladolid",
            "contenido": "En 2023 ganó la alcaldía de Valladolid, desbancando al socialista Óscar Puente, con el apoyo de Vox.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0117-ap-01-it-03",
            "apartado_id": "pod-0117-ap-01",
            "tipo": "evento",
            "titulo": "Gestión de la capital",
            "contenido": "Su mandato se centra en la industria (automoción), la movilidad, la vivienda y los servicios de la principal ciudad de Castilla y León.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0117-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0117-ap-02-it-00",
            "apartado_id": "pod-0117-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha castellanoleonés",
            "contenido": "Defiende una gestión de centroderecha y la reivindicación industrial de Valladolid, en coordinación con la Junta de Mañueco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "castilla-y-leon"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0117-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0117-ap-03-it-00",
            "apartado_id": "pod-0117-ap-03",
            "tipo": "contacto",
            "titulo": "Alfonso Fernández Mañueco",
            "contenido": "**Presidente de la Junta de Castilla y León** (nota +6/10) — Coordinación PP entre la capital y la Junta.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0117-ap-03-it-01",
            "apartado_id": "pod-0117-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0118",
    "slug": "abel-caballero",
    "nombre_completo": "Abel Caballero Álvarez",
    "alias": "Abel Caballero",
    "cargo_actual": "Alcalde de Vigo",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Alcalde de Vigo (PSOE) desde 2007 con mayorías absolutas crecientes; presidente de la FEMP. Exministro con Felipe González.",
    "tags": [
      "politico",
      "psoe",
      "alcalde",
      "galicia"
    ],
    "fuente_principal": "https://www.vigo.org",
    "apartados": [
      {
        "id": "pod-0118-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0118-ap-00-it-00",
            "apartado_id": "pod-0118-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Abel Caballero Álvarez (Ponteareas, Pontevedra, 1946) es alcalde de Vigo desde 2007 y presidente de la Federación Española de Municipios y Provincias (FEMP). Catedrático de Economía y exministro de Transportes con Felipe González, es uno de los alcaldes más veteranos, populares y mediáticos de España, conocido por sus arrolladoras mayorías absolutas y por la espectacular iluminación navideña que ha convertido a Vigo en un fenómeno turístico nacional. Su figura, omnipresente en los medios y en las redes, encarna un modelo de alcalde-marca que combina la gestión local con una enorme proyección mediática personal poco habitual en el municipalismo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0118-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0118-ap-01-it-00",
            "apartado_id": "pod-0118-ap-01",
            "tipo": "evento",
            "titulo": "Ministro con Felipe González",
            "contenido": "Catedrático de Economía, fue diputado y ministro de Transportes, Turismo y Comunicaciones en el Gobierno de Felipe González en los años ochenta.",
            "fecha": "1985-07-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0118-ap-01-it-01",
            "apartado_id": "pod-0118-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Vigo",
            "contenido": "Regresó a la política municipal y en 2007 fue elegido alcalde de Vigo, cargo en el que se ha consolidado con sucesivas mayorías absolutas cada vez más amplias.",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0118-ap-01-it-02",
            "apartado_id": "pod-0118-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de la FEMP",
            "contenido": "Preside la Federación Española de Municipios y Provincias, convirtiéndose en la voz institucional del municipalismo español ante el Estado.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0118-ap-01-it-03",
            "apartado_id": "pod-0118-ap-01",
            "tipo": "evento",
            "titulo": "El fenómeno de las luces",
            "contenido": "Ha dado a Vigo enorme proyección mediática con su apuesta por la Navidad y la iluminación, además de grandes proyectos urbanos, con un estilo personalista y desenfadado.",
            "fecha": "2016-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0118-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0118-ap-02-it-00",
            "apartado_id": "pod-0118-ap-02",
            "tipo": "dato",
            "titulo": "Socialismo municipal y municipalismo",
            "contenido": "Defiende los intereses de Vigo y del municipalismo español (financiación local), con un fuerte liderazgo personal y lealtad a la dirección federal del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "galicia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0118-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0118-ap-03-it-00",
            "apartado_id": "pod-0118-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota +7/10) — Barón municipal leal a la dirección federal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0119",
    "slug": "carmen-moriyon",
    "nombre_completo": "Carmen Moriyón Entrialgo",
    "alias": "Carmen Moriyón",
    "cargo_actual": "Alcaldesa de Gijón",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Alcaldesa de Gijón (Foro Asturias); lo fue 2011-2019 y volvió en 2023 con apoyo del PP.",
    "tags": [
      "politico",
      "foro",
      "alcalde",
      "asturias"
    ],
    "fuente_principal": "https://www.gijon.es",
    "apartados": [
      {
        "id": "pod-0119-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0119-ap-00-it-00",
            "apartado_id": "pod-0119-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Carmen Moriyón Entrialgo (Gijón, 1967) es alcaldesa de Gijón, dirigente de Foro Asturias, el partido regionalista fundado por Francisco Álvarez-Cascos. Médica de profesión, ya fue alcaldesa de la ciudad entre 2011 y 2019 y recuperó la alcaldía en 2023 gobernando con el apoyo del PP. Representa el regionalismo asturiano de centroderecha en la mayor ciudad del Principado, con la industria, el puerto de El Musel y los servicios como prioridades de su gestión. Su perfil de médica y su marca regionalista le permiten un discurso transversal, alejado de la confrontación de bloques, en la mayor ciudad de Asturias.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0119-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0119-ap-01-it-00",
            "apartado_id": "pod-0119-ap-01",
            "tipo": "evento",
            "titulo": "Médica y política regionalista",
            "contenido": "Médica de profesión, dio el salto a la política de la mano de Foro Asturias, el partido fundado por Francisco Álvarez-Cascos.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0119-ap-01-it-01",
            "apartado_id": "pod-0119-ap-01",
            "tipo": "evento",
            "titulo": "Primera etapa como alcaldesa",
            "contenido": "Fue alcaldesa de Gijón entre 2011 y 2019, al frente de Foro, en una etapa de coaliciones y pactos en el Ayuntamiento.",
            "fecha": "2011-06-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0119-ap-01-it-02",
            "apartado_id": "pod-0119-ap-01",
            "tipo": "evento",
            "titulo": "Regreso a la alcaldía",
            "contenido": "Tras unos años fuera del cargo, recuperó la alcaldía de Gijón en 2023 con el apoyo del PP, manteniendo viva la marca de Foro Asturias.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0119-ap-01-it-03",
            "apartado_id": "pod-0119-ap-01",
            "tipo": "evento",
            "titulo": "Gestión de la ciudad",
            "contenido": "Su mandato se centra en la industria, el puerto de El Musel, la movilidad y los servicios de la mayor ciudad de Asturias.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0119-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0119-ap-02-it-00",
            "apartado_id": "pod-0119-ap-02",
            "tipo": "dato",
            "titulo": "Regionalismo asturiano de centroderecha",
            "contenido": "Defiende los intereses de Gijón y Asturias desde un regionalismo de centroderecha, en colaboración con el PP frente al PSOE de Barbón.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "foro",
              "asturias"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0119-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0119-ap-03-it-00",
            "apartado_id": "pod-0119-ap-03",
            "tipo": "contacto",
            "titulo": "Adrián Barbón",
            "contenido": "**Presidente del Principado de Asturias** (nota -3/10) — Rivalidad institucional: gobierno municipal de centroderecha frente al Principado socialista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota--3",
              "tension"
            ],
            "orden": 0
          },
          {
            "id": "pod-0119-ap-03-it-01",
            "apartado_id": "pod-0119-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +4/10) — El PP es su socio de gobierno municipal en Gijón.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+4",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0120",
    "slug": "ines-rey",
    "nombre_completo": "Inés Rey García",
    "alias": "Inés Rey",
    "cargo_actual": "Alcaldesa de A Coruña",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Alcaldesa de A Coruña (PSOE) desde 2019, reelegida en 2023.",
    "tags": [
      "politico",
      "psoe",
      "alcalde",
      "galicia"
    ],
    "fuente_principal": "https://www.coruna.gal",
    "apartados": [
      {
        "id": "pod-0120-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0120-ap-00-it-00",
            "apartado_id": "pod-0120-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Inés Rey García (A Coruña, 1979) es alcaldesa de A Coruña desde 2019, dirigente del PSdeG-PSOE. Abogada, recuperó la alcaldía coruñesa para el socialismo y la revalidó en 2023, consolidando el dominio de la izquierda en la ciudad herculina. Gobierna una de las principales urbes gallegas, con una agenda de vivienda, regeneración urbana (la fachada marítima), movilidad y servicios, en contraposición a la Xunta del PP de Alfonso Rueda. Representa el perfil de alcaldesa joven que el PSOE ha promovido en las grandes ciudades, y gobierna una urbe atlántica de fuerte peso económico y portuario, en permanente competencia institucional con una Xunta de signo contrario.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0120-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0120-ap-01-it-00",
            "apartado_id": "pod-0120-ap-01",
            "tipo": "evento",
            "titulo": "Abogada y socialista coruñesa",
            "contenido": "Abogada de formación, desarrolló su carrera en el PSdeG, ganando peso en la política municipal de A Coruña.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0120-ap-01-it-01",
            "apartado_id": "pod-0120-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldesa de A Coruña",
            "contenido": "En 2019 fue investida alcaldesa de A Coruña, recuperando el bastón de mando para el PSOE.",
            "fecha": "2019-06-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0120-ap-01-it-02",
            "apartado_id": "pod-0120-ap-01",
            "tipo": "evento",
            "titulo": "Reelección en 2023",
            "contenido": "Revalidó la alcaldía en 2023, consolidando su liderazgo en la ciudad frente a la Xunta del PP.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0120-ap-01-it-03",
            "apartado_id": "pod-0120-ap-01",
            "tipo": "evento",
            "titulo": "Regeneración urbana",
            "contenido": "Su mandato se centra en la vivienda, la regeneración de la fachada marítima, la movilidad y los grandes proyectos urbanos de la ciudad.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0120-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0120-ap-02-it-00",
            "apartado_id": "pod-0120-ap-02",
            "tipo": "dato",
            "titulo": "Socialismo municipal gallego",
            "contenido": "Defiende una agenda social y de regeneración urbana, leal a la dirección federal del PSOE y en contraposición a la Xunta del PP de Rueda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "galicia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0120-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0120-ap-03-it-00",
            "apartado_id": "pod-0120-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota +6/10) — Alcaldesa leal a la dirección federal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0120-ap-03-it-01",
            "apartado_id": "pod-0120-ap-03",
            "tipo": "contacto",
            "titulo": "Alfonso Rueda",
            "contenido": "**Presidente de la Xunta de Galicia** (nota -3/10) — Rivalidad institucional entre la ciudad socialista y la Xunta del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota--3",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0121",
    "slug": "marifran-carazo",
    "nombre_completo": "María Francisca Carazo Villalonga",
    "alias": "Marifrán Carazo",
    "cargo_actual": "Alcaldesa de Granada",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcaldesa de Granada (PP) desde 2023; exconsejera de Fomento de la Junta de Andalucía.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "andalucia"
    ],
    "fuente_principal": "https://www.granada.org",
    "apartados": [
      {
        "id": "pod-0121-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0121-ap-00-it-00",
            "apartado_id": "pod-0121-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "María Francisca «Marifrán» Carazo Villalonga (Granada, 1976) es alcaldesa de Granada desde 2023, dirigente del PP andaluz. Fue consejera de Fomento de la Junta de Andalucía con Juan Manuel Moreno antes de encabezar la candidatura municipal y recuperar la alcaldía de Granada para el PP. Gobierna una ciudad de fuerte peso turístico y universitario —con la Alhambra como emblema mundial—, con la movilidad (el metro, los accesos), el turismo y la vivienda como grandes prioridades. Su trayectoria —de consejera autonómica a alcaldesa— refleja la estrategia del PP de situar perfiles de gestión en las grandes capitales, y afronta el reto de impulsar las eternamente reclamadas infraestructuras ferroviarias de Granada.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0121-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0121-ap-01-it-00",
            "apartado_id": "pod-0121-ap-01",
            "tipo": "evento",
            "titulo": "Carrera en el PP de Granada",
            "contenido": "Desarrolló su carrera en el PP de Granada, ocupando cargos municipales y autonómicos en su provincia.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0121-ap-01-it-01",
            "apartado_id": "pod-0121-ap-01",
            "tipo": "evento",
            "titulo": "Consejera de la Junta",
            "contenido": "Fue consejera de Fomento, Infraestructuras y Ordenación del Territorio de la Junta de Andalucía en el Gobierno de Moreno Bonilla.",
            "fecha": "2019-01-22",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0121-ap-01-it-02",
            "apartado_id": "pod-0121-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldesa de Granada",
            "contenido": "En 2023 encabezó la candidatura del PP y fue investida alcaldesa de Granada, recuperando la ciudad para el centroderecha.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0121-ap-01-it-03",
            "apartado_id": "pod-0121-ap-01",
            "tipo": "evento",
            "titulo": "Gestión de la ciudad",
            "contenido": "Su mandato se centra en el turismo (la Alhambra), la movilidad, la universidad y la vivienda de una de las grandes ciudades de Andalucía.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0121-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0121-ap-02-it-00",
            "apartado_id": "pod-0121-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha andaluz",
            "contenido": "Defiende una gestión de centroderecha y la reivindicación de infraestructuras (AVE, accesos) para Granada, en sintonía con la Junta de Moreno Bonilla.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "andalucia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0121-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0121-ap-03-it-00",
            "apartado_id": "pod-0121-ap-03",
            "tipo": "contacto",
            "titulo": "Juan Manuel Moreno Bonilla",
            "contenido": "**Presidente de la Junta de Andalucía** (nota +7/10) — Mentor político: Carazo fue su consejera de Fomento.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0121-ap-03-it-01",
            "apartado_id": "pod-0121-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Alineada con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0122",
    "slug": "jose-maria-bellido",
    "nombre_completo": "José María Bellido Roche",
    "alias": "José María Bellido",
    "cargo_actual": "Alcalde de Córdoba",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcalde de Córdoba (PP) desde 2019, con mayoría absoluta desde 2023.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "andalucia"
    ],
    "fuente_principal": "https://www.cordoba.es",
    "apartados": [
      {
        "id": "pod-0122-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0122-ap-00-it-00",
            "apartado_id": "pod-0122-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "José María Bellido Roche (Córdoba, 1977) es alcalde de Córdoba desde 2019, dirigente del PP andaluz. Abogado, recuperó la alcaldía cordobesa para el centroderecha y la revalidó en 2023 con mayoría absoluta, consolidando el giro de una ciudad históricamente disputada por la izquierda (incluido el PCE/IU). Gobierna una urbe de enorme patrimonio —con la Mezquita-Catedral como símbolo—, con el turismo, el agua y las infraestructuras como ejes de su mandato. Su mayoría absoluta en 2023 consolidó un giro político notable en una ciudad de fuerte tradición de izquierdas, y afronta los grandes retos de Córdoba: el turismo cultural, el agua, el desempleo y las conexiones ferroviarias y por autovía con el resto de Andalucía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0122-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0122-ap-01-it-00",
            "apartado_id": "pod-0122-ap-01",
            "tipo": "evento",
            "titulo": "Abogado y concejal",
            "contenido": "Abogado de formación, desarrolló su carrera en el PP de Córdoba, ocupando concejalías en el Ayuntamiento.",
            "fecha": "2011-06-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0122-ap-01-it-01",
            "apartado_id": "pod-0122-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Córdoba",
            "contenido": "En 2019 fue investido alcalde de Córdoba, recuperando la ciudad para el centroderecha.",
            "fecha": "2019-06-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0122-ap-01-it-02",
            "apartado_id": "pod-0122-ap-01",
            "tipo": "evento",
            "titulo": "Mayoría absoluta",
            "contenido": "En 2023 revalidó la alcaldía con mayoría absoluta, consolidando su liderazgo en una ciudad de tradición política plural.",
            "fecha": "2023-05-28",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0122-ap-01-it-03",
            "apartado_id": "pod-0122-ap-01",
            "tipo": "evento",
            "titulo": "Patrimonio y turismo",
            "contenido": "Su mandato se centra en el turismo y el patrimonio (la Mezquita-Catedral), el agua, la agricultura del entorno y las infraestructuras.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0122-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0122-ap-02-it-00",
            "apartado_id": "pod-0122-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha andaluz",
            "contenido": "Defiende una gestión de centroderecha centrada en turismo, patrimonio y agua, en coordinación con la Junta de Moreno Bonilla.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "andalucia"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0122-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0122-ap-03-it-00",
            "apartado_id": "pod-0122-ap-03",
            "tipo": "contacto",
            "titulo": "Juan Manuel Moreno Bonilla",
            "contenido": "**Presidente de la Junta de Andalucía** (nota +6/10) — Coordinación PP entre la ciudad y la Junta.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0122-ap-03-it-01",
            "apartado_id": "pod-0122-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0123",
    "slug": "maider-etxebarria",
    "nombre_completo": "Maider Etxebarria García",
    "alias": "Maider Etxebarria",
    "cargo_actual": "Alcaldesa de Vitoria-Gasteiz",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Alcaldesa de Vitoria-Gasteiz (PSE-EE) desde 2023; accedió pese a no ganar, apartando al PNV.",
    "tags": [
      "politico",
      "psoe",
      "alcalde",
      "pais-vasco"
    ],
    "fuente_principal": "https://www.vitoria-gasteiz.org",
    "apartados": [
      {
        "id": "pod-0123-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0123-ap-00-it-00",
            "apartado_id": "pod-0123-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Maider Etxebarria García es alcaldesa de Vitoria-Gasteiz desde 2023, dirigente del PSE-EE (los socialistas vascos). Accedió a la alcaldía de la capital de Euskadi pese a no ganar las elecciones, en un pacto que desplazó al PNV de la alcaldía, lo que tensó la relación entre socialistas y jeltzales pese a compartir el Gobierno vasco. Gobierna la sede de las instituciones de Euskadi, con la vivienda, la movilidad sostenible y los servicios sociales como prioridades.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0123-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0123-ap-01-it-00",
            "apartado_id": "pod-0123-ap-01",
            "tipo": "evento",
            "titulo": "Socialista alavesa",
            "contenido": "Desarrolló su carrera en el PSE-EE en Álava, ocupando responsabilidades orgánicas e institucionales antes de liderar la candidatura municipal.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0123-ap-01-it-01",
            "apartado_id": "pod-0123-ap-01",
            "tipo": "evento",
            "titulo": "Candidata en Vitoria",
            "contenido": "Encabezó la candidatura del PSE-EE en Vitoria-Gasteiz en las elecciones municipales de 2023.",
            "fecha": "2023-05-28",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0123-ap-01-it-02",
            "apartado_id": "pod-0123-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldesa de Vitoria",
            "contenido": "Fue investida alcaldesa de Vitoria-Gasteiz en 2023 pese a no ganar las elecciones, mediante un pacto que apartó al PNV de la alcaldía de la capital vasca.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0123-ap-01-it-03",
            "apartado_id": "pod-0123-ap-01",
            "tipo": "evento",
            "titulo": "Gestión de la capital vasca",
            "contenido": "Su mandato se centra en la vivienda, la movilidad sostenible (Vitoria es referente verde europeo) y los servicios sociales de la sede de las instituciones de Euskadi. Su acceso a la alcaldía sin haber ganado las elecciones, apartando al PNV, ha marcado su mandato y tensa la convivencia entre socialistas y nacionalistas en la capital vasca.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0123-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0123-ap-02-it-00",
            "apartado_id": "pod-0123-ap-02",
            "tipo": "dato",
            "titulo": "Socialismo municipal vasco",
            "contenido": "Defiende una agenda social y de sostenibilidad, en una relación compleja con el PNV pese a compartir el Gobierno vasco a nivel autonómico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "pais-vasco"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0123-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0123-ap-03-it-00",
            "apartado_id": "pod-0123-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Secretario general del PSOE y presidente del Gobierno** (nota +6/10) — Alineada con la dirección federal del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0123-ap-03-it-01",
            "apartado_id": "pod-0123-ap-03",
            "tipo": "contacto",
            "titulo": "Imanol Pradales",
            "contenido": "**Lehendakari (Gobierno Vasco)** (nota -2/10) — Tensión PNV-PSE por la alcaldía de Vitoria pese a la coalición autonómica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "nota--2",
              "tension"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0124",
    "slug": "luis-barcala",
    "nombre_completo": "Luis Barcala Sierra",
    "alias": "Luis Barcala",
    "cargo_actual": "Alcalde de Alicante",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Alcalde de Alicante (PP) desde 2018, reelegido en 2019 y 2023.",
    "tags": [
      "politico",
      "pp",
      "alcalde",
      "comunidad-valenciana"
    ],
    "fuente_principal": "https://www.alicante.es",
    "apartados": [
      {
        "id": "pod-0124-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0124-ap-00-it-00",
            "apartado_id": "pod-0124-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Luis Barcala Sierra (Alicante, 1961) es alcalde de Alicante desde 2018, dirigente del PP. Abogado, accedió a la alcaldía durante el mandato y la revalidó en 2019 y 2023, consolidando el dominio del centroderecha en la segunda ciudad de la Comunidad Valenciana. Gobierna una urbe mediterránea de fuerte peso turístico, con los grandes proyectos urbanos (el puerto, las playas), la movilidad y las infraestructuras como prioridades, en coordinación con la Generalitat del PP. Veterano de la política alicantina, gobierna una ciudad de fuerte crecimiento y atractivo turístico del litoral mediterráneo, con grandes proyectos urbanos pendientes en el frente portuario y las playas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0124-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0124-ap-01-it-00",
            "apartado_id": "pod-0124-ap-01",
            "tipo": "evento",
            "titulo": "Abogado y concejal",
            "contenido": "Abogado de formación, desarrolló su carrera en el PP de Alicante, ocupando concejalías y la portavocía municipal.",
            "fecha": "2011-06-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0124-ap-01-it-01",
            "apartado_id": "pod-0124-ap-01",
            "tipo": "evento",
            "titulo": "Alcalde de Alicante",
            "contenido": "Accedió a la alcaldía de Alicante en 2018 durante el mandato, tras la salida de su predecesor.",
            "fecha": "2018-04-18",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0124-ap-01-it-02",
            "apartado_id": "pod-0124-ap-01",
            "tipo": "evento",
            "titulo": "Reelecciones",
            "contenido": "Revalidó la alcaldía en 2019 y 2023, consolidando el gobierno del PP en la ciudad, con apoyo de Vox en la última etapa.",
            "fecha": "2023-06-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0124-ap-01-it-03",
            "apartado_id": "pod-0124-ap-01",
            "tipo": "evento",
            "titulo": "Gestión de la ciudad",
            "contenido": "Su mandato se centra en el turismo, los grandes proyectos urbanos (el puerto, las playas), la movilidad y las infraestructuras de la ciudad.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0124-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0124-ap-02-it-00",
            "apartado_id": "pod-0124-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha alicantino",
            "contenido": "Defiende una gestión de centroderecha centrada en turismo e infraestructuras, en coordinación con la Generalitat Valenciana del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "comunidad-valenciana"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0124-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0124-ap-03-it-00",
            "apartado_id": "pod-0124-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +6/10) — Alineado con la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0124-ap-03-it-01",
            "apartado_id": "pod-0124-ap-03",
            "tipo": "contacto",
            "titulo": "Juan Francisco Pérez Llorca",
            "contenido": "**Presidente de la Generalitat Valenciana** (nota +5/10) — Coordinación PP entre la ciudad y la Generalitat.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+5",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0125",
    "slug": "santiago-abascal",
    "nombre_completo": "Santiago Abascal Conde",
    "alias": "Santiago Abascal",
    "cargo_actual": "Presidente de Vox",
    "partido": "VOX",
    "foto_url": null,
    "bio_corta": "Presidente y fundador de Vox; líder de la derecha radical española y tercera fuerza del Congreso.",
    "tags": [
      "politico",
      "vox",
      "lider-nacional",
      "vox"
    ],
    "fuente_principal": "https://www.voxespana.es",
    "apartados": [
      {
        "id": "pod-0125-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0125-ap-00-it-00",
            "apartado_id": "pod-0125-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Santiago Abascal Conde (Bilbao, 1976) es el presidente y fundador de Vox, el partido de la derecha radical que ha irrumpido con fuerza en la política española. Procedente de una familia vasca del PP castigada por el terrorismo de ETA, militó durante años en el Partido Popular del País Vasco antes de romper con él y fundar Vox en 2013. Bajo su liderazgo, el partido pasó de la irrelevancia a ser la tercera fuerza del Congreso, con un discurso nacionalista español, antiinmigración, contrario al «globalismo» y a los nacionalismos periféricos, y de defensa de la unidad de España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0125-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0125-ap-01-it-00",
            "apartado_id": "pod-0125-ap-01",
            "tipo": "evento",
            "titulo": "Del PP vasco a la ruptura",
            "contenido": "Criado en una familia del PP del País Vasco amenazada por ETA, fue concejal y cargo del partido en Álava y en la Comunidad de Madrid, hasta romper con el PP por considerarlo tibio.",
            "fecha": "2004-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0125-ap-01-it-01",
            "apartado_id": "pod-0125-ap-01",
            "tipo": "evento",
            "titulo": "Fundación de Vox",
            "contenido": "En 2013 cofundó Vox junto a otros exdirigentes del PP, asumiendo después su liderazgo, en un partido inicialmente marginal que defendía una derecha «sin complejos».",
            "fecha": "2013-12-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0125-ap-01-it-02",
            "apartado_id": "pod-0125-ap-01",
            "tipo": "evento",
            "titulo": "La irrupción electoral",
            "contenido": "Tras el desafío independentista catalán, Vox irrumpió en las instituciones (Andalucía 2018, Congreso 2019), consolidándose como tercera fuerza y entrando en gobiernos autonómicos en coalición con el PP.",
            "fecha": "2019-04-28",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0125-ap-01-it-03",
            "apartado_id": "pod-0125-ap-01",
            "tipo": "evento",
            "titulo": "Líder de la derecha radical",
            "contenido": "Ha situado a Vox en la órbita de la derecha radical europea (Patriots), con un discurso antiinmigración, soberanista y contrario a la agenda climática y de género, en competencia y a la vez dependencia mutua con el PP.",
            "fecha": "2023-07-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0125-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0125-ap-02-it-00",
            "apartado_id": "pod-0125-ap-02",
            "tipo": "dato",
            "titulo": "Derecha radical y unidad de España",
            "contenido": "Defiende la recentralización del Estado, el endurecimiento migratorio, la derogación de leyes «ideológicas» y la unidad de España frente a los nacionalismos, en confrontación frontal con el Gobierno de Sánchez.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "derecha-radical"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0125-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0125-ap-03-it-00",
            "apartado_id": "pod-0125-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -9/10) — Adversario frontal; encarna la oposición más dura al «sanchismo».",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--9",
              "confrontacion"
            ],
            "orden": 0
          },
          {
            "id": "pod-0125-ap-03-it-01",
            "apartado_id": "pod-0125-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota -2/10) — Competencia por el electorado de la derecha y a la vez socio imprescindible en gobiernos autonómicos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota--2",
              "competencia"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0126",
    "slug": "yolanda-diaz",
    "nombre_completo": "Yolanda Díaz Pérez",
    "alias": "Yolanda Díaz",
    "cargo_actual": "Vicepresidenta segunda del Gobierno y líder de Sumar",
    "partido": "SUMAR",
    "foto_url": null,
    "bio_corta": "Vicepresidenta 2ª, ministra de Trabajo y líder de Sumar; sucesora de Pablo Iglesias al frente de la izquierda alternativa.",
    "tags": [
      "politico",
      "sumar",
      "lider-nacional",
      "sumar"
    ],
    "fuente_principal": "https://www.mites.gob.es",
    "apartados": [
      {
        "id": "pod-0126-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0126-ap-00-it-00",
            "apartado_id": "pod-0126-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Yolanda Díaz Pérez (Fene, A Coruña, 1971) es vicepresidenta segunda del Gobierno, ministra de Trabajo y líder de Sumar, la coalición de la izquierda alternativa. Abogada laboralista de familia comunista gallega, fue la sucesora de Pablo Iglesias al frente del espacio a la izquierda del PSOE. Como ministra de Trabajo impulsó la reforma laboral de 2021 y sucesivas subidas del salario mínimo, sus grandes logros, y en 2023 lanzó Sumar como plataforma para aglutinar a la izquierda, aunque el proyecto ha sufrido un fuerte desgaste, malos resultados y la ruptura con Podemos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0126-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0126-ap-01-it-00",
            "apartado_id": "pod-0126-ap-01",
            "tipo": "evento",
            "titulo": "Abogada laboralista y comunista",
            "contenido": "Hija de un histórico sindicalista, ejerció como abogada laboralista y militó en el PCE e Izquierda Unida, siendo diputada en el Parlamento gallego.",
            "fecha": "2005-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0126-ap-01-it-01",
            "apartado_id": "pod-0126-ap-01",
            "tipo": "evento",
            "titulo": "Ministra de Trabajo",
            "contenido": "En 2020 entró en el Gobierno de coalición como ministra de Trabajo, donde negoció con sindicatos y patronal la reforma laboral de 2021 y la subida del salario mínimo.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0126-ap-01-it-02",
            "apartado_id": "pod-0126-ap-01",
            "tipo": "evento",
            "titulo": "Vicepresidenta y sucesión de Iglesias",
            "contenido": "Tras la salida de Pablo Iglesias asumió el liderazgo del espacio y la vicepresidencia, con un perfil más moderado y transversal que su predecesor.",
            "fecha": "2021-03-31",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0126-ap-01-it-03",
            "apartado_id": "pod-0126-ap-01",
            "tipo": "evento",
            "titulo": "El proyecto Sumar",
            "contenido": "En 2023 lanzó la plataforma Sumar, que concurrió a las generales aglutinando a la izquierda, pero el proyecto se ha debilitado por los malos resultados, la ruptura con Podemos y las dudas sobre su continuidad.",
            "fecha": "2023-07-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0126-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0126-ap-02-it-00",
            "apartado_id": "pod-0126-ap-02",
            "tipo": "dato",
            "titulo": "Izquierda transformadora",
            "contenido": "Defiende los derechos laborales, la reducción de la jornada, la subida del SMI y una agenda social y feminista, como socia minoritaria del PSOE en el Gobierno de coalición.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sumar",
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0126-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0126-ap-03-it-00",
            "apartado_id": "pod-0126-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +5/10) — Socia de coalición: colaboración estable pero con tensiones recurrentes por las políticas sociales y los presupuestos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+5",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0126-ap-03-it-01",
            "apartado_id": "pod-0126-ap-03",
            "tipo": "contacto",
            "titulo": "Ione Belarra",
            "contenido": "**Secretaria general de Podemos** (nota -5/10) — Ruptura del espacio: Podemos abandonó Sumar y compite con Díaz por la izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "podemos",
              "nota--5",
              "ruptura"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0127",
    "slug": "ione-belarra",
    "nombre_completo": "Ione Belarra Gorka",
    "alias": "Ione Belarra",
    "cargo_actual": "Secretaria general de Podemos",
    "partido": "PODEMOS",
    "foto_url": null,
    "bio_corta": "Secretaria general de Podemos y exministra de Derechos Sociales; lidera el ala más combativa de la izquierda.",
    "tags": [
      "politico",
      "podemos",
      "lider-nacional",
      "podemos"
    ],
    "fuente_principal": "https://podemos.info",
    "apartados": [
      {
        "id": "pod-0127-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0127-ap-00-it-00",
            "apartado_id": "pod-0127-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Ione Belarra Gorka (Pamplona, 1987) es la secretaria general de Podemos y exministra de Derechos Sociales y Agenda 2030. Psicóloga de formación, es una de las dirigentes de la generación fundadora de Podemos y heredó el liderazgo del partido de manos de Pablo Iglesias. Desde la ruptura con Sumar y la salida del Gobierno, lidera un Podemos reducido pero combativo, situado a la izquierda de Sumar y del PSOE, con un discurso radicalizado en feminismo, vivienda, la causa palestina y la crítica frontal a la OTAN y al aumento del gasto militar. Es una de las dirigentes que mantienen viva la marca Podemos pese a su drástica reducción parlamentaria y a la competencia de Sumar por el mismo espacio.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0127-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0127-ap-01-it-00",
            "apartado_id": "pod-0127-ap-01",
            "tipo": "evento",
            "titulo": "De la universidad a Podemos",
            "contenido": "Psicóloga, se incorporó al núcleo fundador de Podemos, ejerciendo de diputada y secretaria de organización del partido.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0127-ap-01-it-01",
            "apartado_id": "pod-0127-ap-01",
            "tipo": "evento",
            "titulo": "Ministra de Derechos Sociales",
            "contenido": "Fue ministra de Derechos Sociales y Agenda 2030 en el Gobierno de coalición, impulsando la ley de vivienda y políticas sociales.",
            "fecha": "2021-03-31",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0127-ap-01-it-02",
            "apartado_id": "pod-0127-ap-01",
            "tipo": "evento",
            "titulo": "Secretaria general de Podemos",
            "contenido": "Asumió la secretaría general de Podemos tras la marcha de Pablo Iglesias, manteniendo el perfil más combativo del espacio.",
            "fecha": "2021-06-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0127-ap-01-it-03",
            "apartado_id": "pod-0127-ap-01",
            "tipo": "evento",
            "titulo": "Ruptura con Sumar",
            "contenido": "Tras los malos resultados y los choques con Yolanda Díaz, Podemos rompió con Sumar y se situó en la oposición por la izquierda al Gobierno, con un discurso radicalizado.",
            "fecha": "2023-12-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0127-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0127-ap-02-it-00",
            "apartado_id": "pod-0127-ap-02",
            "tipo": "dato",
            "titulo": "Izquierda de ruptura",
            "contenido": "Defiende posiciones de izquierda radical en vivienda, feminismo, antimilitarismo y la causa palestina, situándose a la izquierda del Gobierno y criticando la moderación de Sumar.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "podemos",
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0127-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0127-ap-03-it-00",
            "apartado_id": "pod-0127-ap-03",
            "tipo": "contacto",
            "titulo": "Pablo Iglesias Turrión",
            "contenido": "**Fundador de Podemos** (nota +7/10) — Mentor político y referente del proyecto que ahora lidera.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "podemos",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0127-ap-03-it-01",
            "apartado_id": "pod-0127-ap-03",
            "tipo": "contacto",
            "titulo": "Yolanda Díaz",
            "contenido": "**Vicepresidenta 2ª y líder de Sumar** (nota -5/10) — Ruptura y competencia por el espacio de la izquierda alternativa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sumar",
              "nota--5",
              "ruptura"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0128",
    "slug": "carles-puigdemont",
    "nombre_completo": "Carles Puigdemont i Casamajó",
    "alias": "Carles Puigdemont",
    "cargo_actual": "Líder de Junts per Catalunya",
    "partido": "JUNTS",
    "foto_url": null,
    "bio_corta": "Líder de Junts y expresidente de la Generalitat; encabezó el 1-O de 2017 y dirige el partido desde el extranjero.",
    "tags": [
      "politico",
      "junts",
      "lider-nacional",
      "cataluna"
    ],
    "fuente_principal": "https://www.junts.cat",
    "apartados": [
      {
        "id": "pod-0128-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0128-ap-00-it-00",
            "apartado_id": "pod-0128-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Carles Puigdemont i Casamajó (Amer, Girona, 1962) es el líder de Junts per Catalunya y una de las figuras centrales del independentismo. Periodista y exalcalde de Girona, fue presidente de la Generalitat (2016-2017) y encabezó el referéndum ilegal del 1 de octubre de 2017 y la declaración de independencia, tras lo cual se trasladó a Bélgica para eludir la acción de la justicia española. Desde el extranjero y como eurodiputado ha seguido dirigiendo Junts, cuyos votos resultaron decisivos para la investidura de Pedro Sánchez en 2023 a cambio de la ley de amnistía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0128-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0128-ap-01-it-00",
            "apartado_id": "pod-0128-ap-01",
            "tipo": "evento",
            "titulo": "Periodista y alcalde de Girona",
            "contenido": "Periodista de profesión y militante del nacionalismo catalán (CDC), fue alcalde de Girona antes de dar el salto a la primera línea autonómica.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0128-ap-01-it-01",
            "apartado_id": "pod-0128-ap-01",
            "tipo": "evento",
            "titulo": "Presidente de la Generalitat",
            "contenido": "Fue investido presidente de la Generalitat en 2016 y lideró el proceso soberanista que culminó en el referéndum ilegal del 1-O de 2017 y la declaración de independencia.",
            "fecha": "2016-01-12",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0128-ap-01-it-02",
            "apartado_id": "pod-0128-ap-01",
            "tipo": "evento",
            "titulo": "La salida a Bélgica",
            "contenido": "Tras la aplicación del artículo 155 y la causa judicial por el procés, se trasladó a Bélgica para eludir a la justicia española; fue elegido eurodiputado y su entrega se debatió durante años en la justicia europea.",
            "fecha": "2017-10-30",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0128-ap-01-it-03",
            "apartado_id": "pod-0128-ap-01",
            "tipo": "evento",
            "titulo": "La amnistía y la llave de la investidura",
            "contenido": "Sus diputados resultaron decisivos para la investidura de Sánchez en 2023, a cambio de la ley de amnistía, cuya aplicación a su caso por malversación fue, sin embargo, discutida por el Tribunal Supremo.",
            "fecha": "2023-11-09",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0128-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0128-ap-02-it-00",
            "apartado_id": "pod-0128-ap-02",
            "tipo": "dato",
            "titulo": "Independentismo y negociación dura",
            "contenido": "Defiende la independencia de Cataluña y una confrontación negociadora con el Estado; desde una posición de bisagra, condiciona la estabilidad del Gobierno de Sánchez a cambio de cesiones para Cataluña.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junts",
              "independentismo"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0128-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0128-ap-03-it-00",
            "apartado_id": "pod-0128-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +1/10) — Relación puramente transaccional: apoyo condicionado a la amnistía y a las cesiones, con bloqueos frecuentes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+1",
              "transaccional"
            ],
            "orden": 0
          },
          {
            "id": "pod-0128-ap-03-it-01",
            "apartado_id": "pod-0128-ap-03",
            "tipo": "contacto",
            "titulo": "Míriam Nogueras",
            "contenido": "**Portavoz de Junts en el Congreso** (nota +8/10) — Su negociadora de máxima confianza en Madrid.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junts",
              "nota-+8",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0129",
    "slug": "miriam-nogueras",
    "nombre_completo": "Míriam Nogueras i Camero",
    "alias": "Míriam Nogueras",
    "cargo_actual": "Portavoz de Junts per Catalunya en el Congreso",
    "partido": "JUNTS",
    "foto_url": null,
    "bio_corta": "Portavoz de Junts en el Congreso y negociadora de máxima confianza de Puigdemont; línea dura con el Gobierno.",
    "tags": [
      "politico",
      "junts",
      "lider-nacional",
      "cataluna"
    ],
    "fuente_principal": "https://www.junts.cat",
    "apartados": [
      {
        "id": "pod-0129-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0129-ap-00-it-00",
            "apartado_id": "pod-0129-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Míriam Nogueras i Camero (Barcelona, 1980) es la portavoz de Junts per Catalunya en el Congreso de los Diputados y una de las dirigentes de máxima confianza de Carles Puigdemont. Se ha convertido en la negociadora de Junts en Madrid, marcando una línea dura y exigente en el apoyo —o el bloqueo— a las iniciativas del Gobierno de Sánchez, cuya estabilidad depende en buena medida de los votos de su grupo. Encarna el ala más confrontacional del independentismo en la negociación con el Estado, y su firmeza negociadora la ha convertido en una de las parlamentarias más temidas y citadas de la legislatura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0129-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0129-ap-01-it-00",
            "apartado_id": "pod-0129-ap-01",
            "tipo": "evento",
            "titulo": "Empresa y política",
            "contenido": "Con experiencia en el sector privado, se vinculó a la política de la mano de Convergència y después de Junts, ocupando responsabilidades orgánicas.",
            "fecha": "2017-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0129-ap-01-it-01",
            "apartado_id": "pod-0129-ap-01",
            "tipo": "evento",
            "titulo": "Diputada de Junts",
            "contenido": "Fue diputada de Junts en el Congreso, ganando peso como una de las voces de confianza de Puigdemont en Madrid.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0129-ap-01-it-02",
            "apartado_id": "pod-0129-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz y negociadora",
            "contenido": "Asumió la portavocía de Junts en el Congreso, convirtiéndose en la negociadora del partido con el Gobierno, con una línea dura y exigente.",
            "fecha": "2023-08-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0129-ap-01-it-03",
            "apartado_id": "pod-0129-ap-01",
            "tipo": "evento",
            "titulo": "La llave de la legislatura",
            "contenido": "Los votos de Junts son decisivos para la estabilidad del Gobierno de Sánchez, lo que ha situado a Nogueras en el centro de la negociación, alternando apoyos y bloqueos.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0129-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0129-ap-02-it-00",
            "apartado_id": "pod-0129-ap-02",
            "tipo": "dato",
            "titulo": "Independentismo exigente",
            "contenido": "Defiende los intereses de Junts y de Cataluña con una estrategia de máxima exigencia, condicionando su apoyo al cumplimiento de los acuerdos (amnistía, financiación, traspasos).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junts",
              "independentismo"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0129-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0129-ap-03-it-00",
            "apartado_id": "pod-0129-ap-03",
            "tipo": "contacto",
            "titulo": "Carles Puigdemont",
            "contenido": "**Líder de Junts** (nota +8/10) — Dirigente de su máxima confianza y ejecutora de su estrategia en Madrid.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junts",
              "nota-+8",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0129-ap-03-it-01",
            "apartado_id": "pod-0129-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +1/10) — Apoyo transaccional y exigente; su grupo condiciona la viabilidad de la legislatura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+1",
              "transaccional"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0130",
    "slug": "oriol-junqueras",
    "nombre_completo": "Oriol Junqueras i Vies",
    "alias": "Oriol Junqueras",
    "cargo_actual": "Presidente de Esquerra Republicana de Catalunya (ERC)",
    "partido": "ERC",
    "foto_url": null,
    "bio_corta": "Presidente de ERC; vicepresidente de la Generalitat en el 1-O, condenado e indultado. Línea independentista posibilista.",
    "tags": [
      "politico",
      "erc",
      "lider-nacional",
      "cataluna"
    ],
    "fuente_principal": "https://www.esquerra.cat",
    "apartados": [
      {
        "id": "pod-0130-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0130-ap-00-it-00",
            "apartado_id": "pod-0130-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Oriol Junqueras i Vies (Barcelona, 1969) es el presidente de Esquerra Republicana de Catalunya (ERC) y uno de los principales líderes del independentismo catalán. Historiador y profesor universitario, fue vicepresidente de la Generalitat con Puigdemont y uno de los responsables del referéndum del 1-O de 2017. Condenado por sedición y malversación, cumplió prisión hasta que el Gobierno le concedió el indulto en 2021, y la ley de amnistía de 2024 buscó cerrar su situación judicial. Mantiene a ERC en una estrategia de negociación con el Estado más posibilista que la de Junts.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0130-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0130-ap-01-it-00",
            "apartado_id": "pod-0130-ap-01",
            "tipo": "evento",
            "titulo": "Historiador y republicano",
            "contenido": "Doctor en Historia y profesor universitario, militó en el republicanismo catalán y fue eurodiputado y alcalde de Sant Vicenç dels Horts antes de liderar ERC.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0130-ap-01-it-01",
            "apartado_id": "pod-0130-ap-01",
            "tipo": "evento",
            "titulo": "Vicepresidente de la Generalitat",
            "contenido": "Fue vicepresidente y conseller de Economía de la Generalitat con Puigdemont, y uno de los organizadores del referéndum ilegal del 1-O de 2017.",
            "fecha": "2016-01-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0130-ap-01-it-02",
            "apartado_id": "pod-0130-ap-01",
            "tipo": "evento",
            "titulo": "Prisión e indulto",
            "contenido": "Tras el procés fue juzgado y condenado por sedición y malversación, de lo que cumplió parte en prisión, hasta que en 2021 recibió el indulto del Gobierno de Sánchez.",
            "fecha": "2019-10-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0130-ap-01-it-03",
            "apartado_id": "pod-0130-ap-01",
            "tipo": "evento",
            "titulo": "Liderazgo posibilista de ERC",
            "contenido": "Recuperó el liderazgo de ERC y la situó en una estrategia de negociación con el Estado (apoyo a la investidura de Sánchez, financiación, traspasos), más pragmática que Junts.",
            "fecha": "2024-11-30",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0130-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0130-ap-02-it-00",
            "apartado_id": "pod-0130-ap-02",
            "tipo": "dato",
            "titulo": "Independentismo posibilista",
            "contenido": "Defiende la república catalana por la vía del diálogo y la ampliación del autogobierno, apoyando al Gobierno a cambio de cesiones (indultos, amnistía, financiación singular, traspasos).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc",
              "independentismo"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0130-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0130-ap-03-it-00",
            "apartado_id": "pod-0130-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +4/10) — Socio de investidura: apoyo negociado a cambio de indultos, amnistía y financiación para Cataluña.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+4",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0130-ap-03-it-01",
            "apartado_id": "pod-0130-ap-03",
            "tipo": "contacto",
            "titulo": "Gabriel Rufián",
            "contenido": "**Portavoz de ERC en el Congreso** (nota +7/10) — Principal cara mediática del partido en Madrid.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc",
              "nota-+7",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0131",
    "slug": "gabriel-rufian",
    "nombre_completo": "Gabriel Rufián Romero",
    "alias": "Gabriel Rufián",
    "cargo_actual": "Portavoz de ERC en el Congreso",
    "partido": "ERC",
    "foto_url": null,
    "bio_corta": "Portavoz de ERC en el Congreso; cara mediática del independentismo, estilo combativo y orientado a redes.",
    "tags": [
      "politico",
      "erc",
      "lider-nacional",
      "cataluna"
    ],
    "fuente_principal": "https://www.esquerra.cat",
    "apartados": [
      {
        "id": "pod-0131-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0131-ap-00-it-00",
            "apartado_id": "pod-0131-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Gabriel Rufián Romero (Santa Coloma de Gramenet, 1982) es el portavoz de Esquerra Republicana (ERC) en el Congreso de los Diputados y uno de los políticos más mediáticos del independentismo. De origen andaluz y de barrio metropolitano, irrumpió en 2016 como diputado con un estilo combativo, irónico y orientado a la viralidad en redes y platós. Se ha convertido en la cara de ERC en Madrid, defendiendo el apoyo de los republicanos al Gobierno de Sánchez a cambio de avances para Cataluña y la izquierda, con un discurso que combina el independentismo con lo social. Su programa de entrevistas y su intensa actividad en redes lo han convertido en un fenómeno mediático que trasciende el Congreso.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0131-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0131-ap-01-it-00",
            "apartado_id": "pod-0131-ap-01",
            "tipo": "evento",
            "titulo": "Irrupción mediática",
            "contenido": "Procedente del ámbito de la empresa y el activismo, irrumpió como número dos de ERC en las generales de 2015-2016, con un estilo rupturista y muy mediático.",
            "fecha": "2016-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0131-ap-01-it-01",
            "apartado_id": "pod-0131-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz en el Congreso",
            "contenido": "Se consolidó como portavoz de ERC en el Congreso, protagonista de duelos parlamentarios y entrevistas de gran repercusión.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0131-ap-01-it-02",
            "apartado_id": "pod-0131-ap-01",
            "tipo": "evento",
            "titulo": "Negociador en Madrid",
            "contenido": "Ha pilotado el apoyo de ERC a las investiduras y los presupuestos de Sánchez, negociando indultos, traspasos y financiación para Cataluña.",
            "fecha": "2023-11-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0131-ap-01-it-03",
            "apartado_id": "pod-0131-ap-01",
            "tipo": "evento",
            "titulo": "Cara social del independentismo",
            "contenido": "Combina el discurso independentista con una agenda social de izquierdas, buscando ampliar el electorado de ERC más allá del soberanismo clásico.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0131-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0131-ap-02-it-00",
            "apartado_id": "pod-0131-ap-02",
            "tipo": "dato",
            "titulo": "Independentismo de izquierdas",
            "contenido": "Defiende la república catalana y una agenda social, apoyando al Gobierno de coalición a cambio de cesiones para Cataluña, con un estilo combativo y orientado a los medios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc",
              "independentismo"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0131-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0131-ap-03-it-00",
            "apartado_id": "pod-0131-ap-03",
            "tipo": "contacto",
            "titulo": "Oriol Junqueras",
            "contenido": "**Presidente de ERC** (nota +7/10) — Líder de su partido, del que Rufián es la principal voz parlamentaria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0131-ap-03-it-01",
            "apartado_id": "pod-0131-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +4/10) — Apoyo negociado del grupo de ERC a la investidura y los presupuestos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+4",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0132",
    "slug": "aitor-esteban",
    "nombre_completo": "Aitor Esteban Bravo",
    "alias": "Aitor Esteban",
    "cargo_actual": "Presidente del PNV (EBB)",
    "partido": "PNV",
    "foto_url": null,
    "bio_corta": "Presidente del PNV (EBB) desde 2025; durante casi dos décadas, su influyente portavoz en el Congreso.",
    "tags": [
      "politico",
      "pnv",
      "lider-nacional",
      "pais-vasco"
    ],
    "fuente_principal": "https://www.eaj-pnv.eus",
    "apartados": [
      {
        "id": "pod-0132-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0132-ap-00-it-00",
            "apartado_id": "pod-0132-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Aitor Esteban Bravo (Bilbao, 1962) es el presidente del Euzkadi Buru Batzar (EBB), el máximo órgano del PNV, desde 2025, lo que lo convierte en el principal dirigente del nacionalismo vasco moderado. Abogado, fue durante casi dos décadas el portavoz del PNV en el Congreso de los Diputados, donde se ganó fama de negociador hábil y de orador influyente, clave en numerosas investiduras, presupuestos y en la moción de censura de 2018 contra Rajoy. Sucedió a Andoni Ortuzar al frente del partido, en plena competencia con EH Bildu por la hegemonía en Euskadi.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0132-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0132-ap-01-it-00",
            "apartado_id": "pod-0132-ap-01",
            "tipo": "evento",
            "titulo": "Abogado y cargo foral",
            "contenido": "Abogado de formación, desarrolló su carrera en el PNV, ocupando responsabilidades forales en Bizkaia antes de dar el salto a la política estatal.",
            "fecha": "1999-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0132-ap-01-it-01",
            "apartado_id": "pod-0132-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz del PNV en el Congreso",
            "contenido": "Durante casi dos décadas fue el portavoz del PNV en el Congreso, donde su voto resultó decisivo en investiduras, presupuestos y la moción de censura de 2018 contra Rajoy.",
            "fecha": "2004-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0132-ap-01-it-02",
            "apartado_id": "pod-0132-ap-01",
            "tipo": "evento",
            "titulo": "El negociador clave",
            "contenido": "Se consolidó como uno de los negociadores más influyentes de la Cámara, apoyando con condiciones al PSOE y obteniendo réditos para Euskadi (cupo, transferencias).",
            "fecha": "2018-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0132-ap-01-it-03",
            "apartado_id": "pod-0132-ap-01",
            "tipo": "evento",
            "titulo": "Presidente del PNV",
            "contenido": "En 2025 fue elegido presidente del EBB, sucediendo a Andoni Ortuzar al frente del PNV, con el reto de mantener la hegemonía jeltzale frente al ascenso de EH Bildu.",
            "fecha": "2025-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0132-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0132-ap-02-it-00",
            "apartado_id": "pod-0132-ap-02",
            "tipo": "dato",
            "titulo": "Nacionalismo vasco moderado",
            "contenido": "Defiende el autogobierno y la actualización del estatus de Euskadi por la vía pactista, apoyando al Gobierno de Sánchez a cambio de transferencias y del respeto al concierto vasco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "nacionalismo-vasco"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0132-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0132-ap-03-it-00",
            "apartado_id": "pod-0132-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +6/10) — El PNV es socio de investidura y apoyo parlamentario estable del Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+6",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0132-ap-03-it-01",
            "apartado_id": "pod-0132-ap-03",
            "tipo": "contacto",
            "titulo": "Imanol Pradales",
            "contenido": "**Lehendakari (Gobierno Vasco)** (nota +7/10) — Mismo partido; coordinación entre la dirección del PNV y el Gobierno vasco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "nota-+7",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0133",
    "slug": "arnaldo-otegi",
    "nombre_completo": "Arnaldo Otegi Mondragón",
    "alias": "Arnaldo Otegi",
    "cargo_actual": "Coordinador general de EH Bildu",
    "partido": "BILDU",
    "foto_url": null,
    "bio_corta": "Coordinador general de EH Bildu; artífice del giro de la izquierda abertzale a la vía política tras el fin de ETA.",
    "tags": [
      "politico",
      "bildu",
      "lider-nacional",
      "pais-vasco"
    ],
    "fuente_principal": "https://www.ehbildu.eus",
    "apartados": [
      {
        "id": "pod-0133-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0133-ap-00-it-00",
            "apartado_id": "pod-0133-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Arnaldo Otegi Mondragón (Elgoibar, 1958) es el coordinador general de EH Bildu, la coalición de la izquierda abertzale, y el principal artífice de su estrategia política. Figura histórica del nacionalismo vasco radical y exmiembro de ETA en su juventud (por lo que estuvo en prisión), lideró el proceso que llevó a la izquierda abertzale a renunciar a la violencia e integrarse plenamente en el juego democrático tras el fin de ETA. Bajo su dirección, EH Bildu se ha convertido en primera o segunda fuerza de Euskadi y en socio parlamentario del Gobierno de Sánchez.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0133-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0133-ap-01-it-00",
            "apartado_id": "pod-0133-ap-01",
            "tipo": "evento",
            "titulo": "Pasado en la izquierda abertzale",
            "contenido": "Figura histórica del nacionalismo vasco radical, estuvo vinculado a ETA en su juventud y pasó varios periodos en prisión a lo largo de las décadas siguientes.",
            "fecha": "1987-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0133-ap-01-it-01",
            "apartado_id": "pod-0133-ap-01",
            "tipo": "evento",
            "titulo": "El giro hacia la vía política",
            "contenido": "Fue uno de los principales impulsores del giro estratégico de la izquierda abertzale hacia la vía exclusivamente política, clave en el cese definitivo de la violencia de ETA en 2011.",
            "fecha": "2011-10-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0133-ap-01-it-02",
            "apartado_id": "pod-0133-ap-01",
            "tipo": "evento",
            "titulo": "Líder de EH Bildu",
            "contenido": "Como coordinador general de EH Bildu, ha pilotado el crecimiento electoral de la coalición hasta disputar la hegemonía al PNV en Euskadi y en Navarra.",
            "fecha": "2013-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0133-ap-01-it-03",
            "apartado_id": "pod-0133-ap-01",
            "tipo": "evento",
            "titulo": "Socio del Gobierno",
            "contenido": "EH Bildu se ha convertido en socio parlamentario del Gobierno de Sánchez, apoyando investiduras y presupuestos, lo que genera fuerte controversia con la derecha y las víctimas del terrorismo.",
            "fecha": "2023-11-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0133-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0133-ap-02-it-00",
            "apartado_id": "pod-0133-ap-02",
            "tipo": "dato",
            "titulo": "Izquierda abertzale",
            "contenido": "Defiende la independencia de Euskal Herria y una agenda social de izquierdas por la vía política, apoyando al Gobierno de coalición; su pasado en ETA sigue siendo objeto de fuerte controversia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bildu",
              "izquierda-abertzale"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0133-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0133-ap-03-it-00",
            "apartado_id": "pod-0133-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +5/10) — Socio parlamentario: EH Bildu apoya investiduras y presupuestos, en una relación muy contestada por la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+5",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0133-ap-03-it-01",
            "apartado_id": "pod-0133-ap-03",
            "tipo": "contacto",
            "titulo": "Aitor Esteban",
            "contenido": "**Presidente del PNV** (nota -3/10) — Competencia directa por la hegemonía del nacionalismo vasco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "nota--3",
              "competencia"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0134",
    "slug": "mertxe-aizpurua",
    "nombre_completo": "Mertxe Aizpurua Arzallus",
    "alias": "Mertxe Aizpurua",
    "cargo_actual": "Portavoz de EH Bildu en el Congreso",
    "partido": "BILDU",
    "foto_url": null,
    "bio_corta": "Portavoz de EH Bildu en el Congreso; periodista, exdirectora de Egin y Gara.",
    "tags": [
      "politico",
      "bildu",
      "lider-nacional",
      "pais-vasco"
    ],
    "fuente_principal": "https://www.ehbildu.eus",
    "apartados": [
      {
        "id": "pod-0134-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0134-ap-00-it-00",
            "apartado_id": "pod-0134-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Mertxe Aizpurua Arzallus (Tolosa, 1960) es la portavoz de EH Bildu en el Congreso de los Diputados. Periodista de profesión —fue directora de los diarios Egin y Gara, vinculados a la izquierda abertzale—, es una de las voces más reconocibles de la coalición en Madrid. Como portavoz, ha defendido el apoyo de EH Bildu a las investiduras y presupuestos del Gobierno de Sánchez, así como la agenda social y memorialista de su espacio, en un papel de creciente normalización institucional pese a la controversia que rodea al pasado de la izquierda abertzale. Su trayectoria periodística y su perfil sereno han contribuido a la creciente normalización institucional de EH Bildu en la política española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0134-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0134-ap-01-it-00",
            "apartado_id": "pod-0134-ap-01",
            "tipo": "evento",
            "titulo": "Periodista abertzale",
            "contenido": "Periodista de profesión, dirigió cabeceras vinculadas a la izquierda abertzale como Egin y Gara, con un perfil muy ligado al nacionalismo vasco radical.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0134-ap-01-it-01",
            "apartado_id": "pod-0134-ap-01",
            "tipo": "evento",
            "titulo": "Diputada de EH Bildu",
            "contenido": "Dio el salto a la política institucional como diputada de EH Bildu en el Congreso, integrándose en el grupo de la coalición.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0134-ap-01-it-02",
            "apartado_id": "pod-0134-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz en el Congreso",
            "contenido": "Asumió la portavocía de EH Bildu en el Congreso, convirtiéndose en la cara parlamentaria de la coalición en Madrid.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0134-ap-01-it-03",
            "apartado_id": "pod-0134-ap-01",
            "tipo": "evento",
            "titulo": "Apoyo al Gobierno",
            "contenido": "Ha pilotado el apoyo de EH Bildu a las investiduras y presupuestos de Sánchez, defendiendo una agenda social, memorialista y de autogobierno.",
            "fecha": "2023-11-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0134-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0134-ap-02-it-00",
            "apartado_id": "pod-0134-ap-02",
            "tipo": "dato",
            "titulo": "Izquierda abertzale en Madrid",
            "contenido": "Defiende la agenda social y soberanista de EH Bildu y su apoyo condicionado al Gobierno de coalición, con un papel de normalización institucional de su espacio.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bildu",
              "izquierda-abertzale"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0134-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0134-ap-03-it-00",
            "apartado_id": "pod-0134-ap-03",
            "tipo": "contacto",
            "titulo": "Arnaldo Otegi",
            "contenido": "**Coordinador general de EH Bildu** (nota +7/10) — Líder de su coalición, cuya estrategia ejecuta en el Congreso.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bildu",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0134-ap-03-it-01",
            "apartado_id": "pod-0134-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota +5/10) — Apoyo parlamentario de EH Bildu a investiduras y presupuestos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota-+5",
              "alianza"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0135",
    "slug": "miguel-tellado",
    "nombre_completo": "Miguel Tellado Filgueira",
    "alias": "Miguel Tellado",
    "cargo_actual": "Secretario general del PP y portavoz en el Congreso",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Secretario general del PP y portavoz en el Congreso; mano derecha de Feijóo y azote del Gobierno.",
    "tags": [
      "politico",
      "pp",
      "lider-nacional",
      "pp"
    ],
    "fuente_principal": "https://www.pp.es",
    "apartados": [
      {
        "id": "pod-0135-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0135-ap-00-it-00",
            "apartado_id": "pod-0135-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Miguel Tellado Filgueira (Ferrol, A Coruña, 1976) es el secretario general del Partido Popular y portavoz del grupo popular en el Congreso, lo que lo convierte en uno de los principales dirigentes y en la mano derecha de Alberto Núñez Feijóo en la maquinaria del partido y en la batalla parlamentaria. De perfil duro y combativo, procede del PP gallego, donde se forjó junto a Feijóo, y ejerce de azote del Gobierno de Sánchez en el Congreso, marcando la estrategia de oposición más agresiva del partido. Su ascenso refleja el peso del PP gallego en la dirección de Feijóo y la apuesta del partido por una oposición sin tregua en sede parlamentaria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0135-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0135-ap-01-it-00",
            "apartado_id": "pod-0135-ap-01",
            "tipo": "evento",
            "titulo": "Del PP gallego a Madrid",
            "contenido": "Procedente del PP de Galicia, donde trabajó junto a Feijóo, desarrolló su carrera en la organización y la comunicación del partido.",
            "fecha": "2009-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0135-ap-01-it-01",
            "apartado_id": "pod-0135-ap-01",
            "tipo": "evento",
            "titulo": "Dirigente de organización",
            "contenido": "Ocupó responsabilidades orgánicas en el PP, ganando peso en la estructura interna del partido.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0135-ap-01-it-02",
            "apartado_id": "pod-0135-ap-01",
            "tipo": "evento",
            "titulo": "Secretario general del PP",
            "contenido": "Tras la llegada de Feijóo, fue nombrado secretario general del Partido Popular en el congreso de 2024, asumiendo el control de la maquinaria del partido.",
            "fecha": "2024-07-06",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0135-ap-01-it-03",
            "apartado_id": "pod-0135-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz en el Congreso",
            "contenido": "Como portavoz del grupo popular en el Congreso, lidera la oposición parlamentaria al Gobierno de Sánchez con un estilo especialmente combativo.",
            "fecha": "2023-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0135-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0135-ap-02-it-00",
            "apartado_id": "pod-0135-ap-02",
            "tipo": "dato",
            "titulo": "Oposición dura al Gobierno",
            "contenido": "Pilota la estrategia de confrontación del PP con el Gobierno de Sánchez en el Congreso y la organización del partido, con un perfil duro y disciplinado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "oposicion"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0135-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0135-ap-03-it-00",
            "apartado_id": "pod-0135-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +9/10) — Mano derecha en la organización y la estrategia parlamentaria del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+9",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0135-ap-03-it-01",
            "apartado_id": "pod-0135-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -8/10) — Principal adversario en la batalla parlamentaria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--8",
              "confrontacion"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0136",
    "slug": "cuca-gamarra",
    "nombre_completo": "María de los Reyes «Cuca» Gamarra Ruiz-Clavijo",
    "alias": "Cuca Gamarra",
    "cargo_actual": "Vicesecretaria del PP",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Dirigente del PP, exalcaldesa de Logroño, exportavoz en el Congreso y exsecretaria general del partido.",
    "tags": [
      "politico",
      "pp",
      "lider-nacional",
      "pp"
    ],
    "fuente_principal": "https://www.pp.es",
    "apartados": [
      {
        "id": "pod-0136-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0136-ap-00-it-00",
            "apartado_id": "pod-0136-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "María de los Reyes «Cuca» Gamarra Ruiz-Clavijo (Logroño, 1974) es una dirigente del Partido Popular y una de las figuras de confianza de Alberto Núñez Feijóo. Exalcaldesa de Logroño, fue portavoz del grupo popular en el Congreso y secretaria general del PP en la primera etapa de Feijóo, ejerciendo de cara visible de la oposición al Gobierno de Sánchez. Mantiene un peso relevante en la dirección nacional del partido y en su representación institucional, con un perfil de gestión y moderación. Su trayectoria —de la alcaldía de una capital de provincia a la cúpula del partido— ilustra el modelo de dirigente territorial que Feijóo ha promovido en el PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0136-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0136-ap-01-it-00",
            "apartado_id": "pod-0136-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldesa de Logroño",
            "contenido": "Desarrolló su carrera en el PP de La Rioja, siendo alcaldesa de Logroño, antes de dar el salto a la política nacional.",
            "fecha": "2011-06-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0136-ap-01-it-01",
            "apartado_id": "pod-0136-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz en el Congreso",
            "contenido": "Fue portavoz del grupo parlamentario popular en el Congreso, ejerciendo de cara visible de la oposición al Gobierno de Sánchez.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0136-ap-01-it-02",
            "apartado_id": "pod-0136-ap-01",
            "tipo": "evento",
            "titulo": "Secretaria general del PP",
            "contenido": "Con la llegada de Feijóo, fue secretaria general del PP en su primera etapa, pilotando la reorganización del partido.",
            "fecha": "2022-04-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0136-ap-01-it-03",
            "apartado_id": "pod-0136-ap-01",
            "tipo": "evento",
            "titulo": "Dirección nacional",
            "contenido": "Mantiene su peso en la cúpula del PP como vicesecretaria y figura de confianza de la dirección, con responsabilidades institucionales y orgánicas.",
            "fecha": "2024-07-06",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0136-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0136-ap-02-it-00",
            "apartado_id": "pod-0136-ap-02",
            "tipo": "dato",
            "titulo": "Centroderecha institucional",
            "contenido": "Defiende la estrategia del PP de Feijóo, con un perfil institucional y de gestión dentro de la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "oposicion"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0136-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0136-ap-03-it-00",
            "apartado_id": "pod-0136-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Figura de confianza de la dirección nacional del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0137",
    "slug": "borja-semper",
    "nombre_completo": "Borja Sémper Pascual",
    "alias": "Borja Sémper",
    "cargo_actual": "Portavoz nacional del PP",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Portavoz nacional del PP; ala centrista y moderada del partido de Feijóo, con pasado en el PP vasco.",
    "tags": [
      "politico",
      "pp",
      "lider-nacional",
      "pp"
    ],
    "fuente_principal": "https://www.pp.es",
    "apartados": [
      {
        "id": "pod-0137-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0137-ap-00-it-00",
            "apartado_id": "pod-0137-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Borja Sémper Pascual (San Sebastián, 1976) es el portavoz nacional del Partido Popular y vicesecretario de Cultura del partido. Procedente del PP del País Vasco —donde fue dirigente en años especialmente duros del terrorismo de ETA, que lo amenazó—, encarna el ala más moderada y de centro del PP de Feijóo. Tras unos años fuera de la política, regresó para ejercer de portavoz, con un estilo dialogante y de perfil liberal-centrista que contrasta con el tono más duro de otros dirigentes del partido. Su regreso a la primera línea respondió a la voluntad de Feijóo de dotar al PP de un rostro moderado de cara al electorado de centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0137-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0137-ap-01-it-00",
            "apartado_id": "pod-0137-ap-01",
            "tipo": "evento",
            "titulo": "Dirigente del PP vasco",
            "contenido": "Lideró el PP en Gipuzkoa y fue parlamentario vasco en los años más duros del terrorismo de ETA, que lo amenazó, con un perfil de defensa del constitucionalismo.",
            "fecha": "2004-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0137-ap-01-it-01",
            "apartado_id": "pod-0137-ap-01",
            "tipo": "evento",
            "titulo": "Salida y regreso",
            "contenido": "Tras dejar temporalmente la primera línea política y pasar por el sector privado, regresó al PP de la mano de Alberto Núñez Feijóo.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0137-ap-01-it-02",
            "apartado_id": "pod-0137-ap-01",
            "tipo": "evento",
            "titulo": "Portavoz nacional del PP",
            "contenido": "Fue nombrado portavoz nacional del Partido Popular, ejerciendo de cara comunicativa del partido con un estilo dialogante y moderado.",
            "fecha": "2023-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0137-ap-01-it-03",
            "apartado_id": "pod-0137-ap-01",
            "tipo": "evento",
            "titulo": "Ala centrista del PP",
            "contenido": "Encarna el ala más centrista y liberal del PP de Feijóo, en ocasiones en contraste con el tono más combativo de otros dirigentes.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0137-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0137-ap-02-it-00",
            "apartado_id": "pod-0137-ap-02",
            "tipo": "dato",
            "titulo": "Centrismo y moderación",
            "contenido": "Defiende un PP de centro, dialogante y transversal, con un perfil liberal en lo cultural, dentro de la estrategia de Feijóo de ampliar el electorado del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0137-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0137-ap-03-it-00",
            "apartado_id": "pod-0137-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Portavoz y rostro comunicativo de su proyecto.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0138",
    "slug": "esteban-gonzalez-pons",
    "nombre_completo": "Esteban González Pons",
    "alias": "Esteban González Pons",
    "cargo_actual": "Vicesecretario institucional del PP",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Veterano dirigente del PP; vicesecretario institucional y negociador de la renovación del CGPJ.",
    "tags": [
      "politico",
      "pp",
      "lider-nacional",
      "pp"
    ],
    "fuente_principal": "https://www.pp.es",
    "apartados": [
      {
        "id": "pod-0138-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0138-ap-00-it-00",
            "apartado_id": "pod-0138-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Esteban González Pons (Valencia, 1964) es un veterano dirigente del Partido Popular, vicesecretario institucional del partido y una de sus voces más experimentadas. Abogado y de larga trayectoria, ha sido diputado nacional, eurodiputado y dirigente de máximo nivel desde la época de Mariano Rajoy, con un perfil de orador brillante y negociador. Bajo Feijóo ha pilotado asuntos institucionales clave, como la difícil negociación de la renovación del Consejo General del Poder Judicial con el PSOE, finalmente desbloqueada en 2024 con mediación europea. Considerado uno de los grandes oradores del partido, ha ejercido de puente del PP con las instituciones europeas en las grandes cuestiones de Estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0138-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0138-ap-01-it-00",
            "apartado_id": "pod-0138-ap-01",
            "tipo": "evento",
            "titulo": "Carrera en el PP valenciano y nacional",
            "contenido": "Abogado, desarrolló su carrera en el PP de Valencia y después a nivel nacional, siendo diputado y vicesecretario de comunicación del partido con Rajoy.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0138-ap-01-it-01",
            "apartado_id": "pod-0138-ap-01",
            "tipo": "evento",
            "titulo": "Eurodiputado",
            "contenido": "Fue durante años eurodiputado y dirigente del PP en el Parlamento Europeo, ganando peso en la política comunitaria y en el PPE.",
            "fecha": "2014-07-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0138-ap-01-it-02",
            "apartado_id": "pod-0138-ap-01",
            "tipo": "evento",
            "titulo": "Vicesecretario institucional",
            "contenido": "Con Feijóo, asumió la vicesecretaría institucional del PP, encargándose de las grandes negociaciones de Estado.",
            "fecha": "2022-04-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0138-ap-01-it-03",
            "apartado_id": "pod-0138-ap-01",
            "tipo": "evento",
            "titulo": "La negociación del CGPJ",
            "contenido": "Pilotó por parte del PP la negociación con el PSOE para la renovación del Consejo General del Poder Judicial, desbloqueada en 2024 con mediación de la Comisión Europea.",
            "fecha": "2024-06-25",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0138-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0138-ap-02-it-00",
            "apartado_id": "pod-0138-ap-02",
            "tipo": "dato",
            "titulo": "Institucionalismo del PP",
            "contenido": "Defiende un perfil institucional y de Estado, encargándose de las grandes negociaciones del PP con el Gobierno y de su política europea.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "institucional"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0138-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0138-ap-03-it-00",
            "apartado_id": "pod-0138-ap-03",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Líder del PP** (nota +7/10) — Negociador institucional de máxima confianza de la dirección.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "nota-+7",
              "alianza"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0139",
    "slug": "jorge-buxade",
    "nombre_completo": "Jorge Buxadé Villalba",
    "alias": "Jorge Buxadé",
    "cargo_actual": "Vicepresidente de Acción Política de Vox",
    "partido": "VOX",
    "foto_url": null,
    "bio_corta": "Vicepresidente de Acción Política de Vox y eurodiputado; principal ideólogo y estratega del partido.",
    "tags": [
      "politico",
      "vox",
      "lider-nacional",
      "vox"
    ],
    "fuente_principal": "https://www.voxespana.es",
    "apartados": [
      {
        "id": "pod-0139-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0139-ap-00-it-00",
            "apartado_id": "pod-0139-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Jorge Buxadé Villalba (Barcelona, 1975) es el vicepresidente de Acción Política de Vox y una de las figuras de máxima confianza de Santiago Abascal, además de eurodiputado. Abogado del Estado y de origen catalán, con un pasado político en la extrema derecha, se ha convertido en el principal ideólogo y estratega de Vox, con un discurso especialmente duro en inmigración, soberanía nacional y crítica a la Unión Europea, las autonomías y las agendas climática y de género. Su perfil jurídico y su radicalidad ideológica lo han convertido en el principal arquitecto del discurso y la estrategia de Vox, más allá de su faceta como eurodiputado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0139-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0139-ap-01-it-00",
            "apartado_id": "pod-0139-ap-01",
            "tipo": "evento",
            "titulo": "Abogado del Estado",
            "contenido": "Abogado del Estado de profesión y de origen catalán, con un pasado político en la extrema derecha, desarrolló su carrera jurídica antes de incorporarse a Vox.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0139-ap-01-it-01",
            "apartado_id": "pod-0139-ap-01",
            "tipo": "evento",
            "titulo": "Estratega de Vox",
            "contenido": "Se integró en la dirección de Vox como uno de sus principales ideólogos y estrategas, encargado de la acción política del partido.",
            "fecha": "2019-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0139-ap-01-it-02",
            "apartado_id": "pod-0139-ap-01",
            "tipo": "evento",
            "titulo": "Eurodiputado",
            "contenido": "Fue cabeza de lista de Vox a las elecciones europeas y eurodiputado, vinculando al partido con la derecha radical europea.",
            "fecha": "2019-05-26",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0139-ap-01-it-03",
            "apartado_id": "pod-0139-ap-01",
            "tipo": "evento",
            "titulo": "Línea dura",
            "contenido": "Encarna la línea más dura e ideológica de Vox en inmigración, soberanía y crítica a la UE, las autonomías y las políticas climática y de género.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0139-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0139-ap-02-it-00",
            "apartado_id": "pod-0139-ap-02",
            "tipo": "dato",
            "titulo": "Derecha radical ideológica",
            "contenido": "Defiende la recentralización, el endurecimiento migratorio y la salida de la agenda «globalista», como principal estratega ideológico de Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "derecha-radical"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0139-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0139-ap-03-it-00",
            "apartado_id": "pod-0139-ap-03",
            "tipo": "contacto",
            "titulo": "Santiago Abascal",
            "contenido": "**Presidente de Vox** (nota +8/10) — Hombre de máxima confianza y principal estratega del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "nota-+8",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0139-ap-03-it-01",
            "apartado_id": "pod-0139-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -8/10) — Oposición frontal desde la derecha radical.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--8",
              "confrontacion"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  },
  {
    "id": "pod-0140",
    "slug": "ignacio-garriga",
    "nombre_completo": "Ignacio Garriga Vaz de Concicao",
    "alias": "Ignacio Garriga",
    "cargo_actual": "Secretario general de Vox",
    "partido": "VOX",
    "foto_url": null,
    "bio_corta": "Secretario general de Vox y líder del partido en Cataluña; número dos de Abascal.",
    "tags": [
      "politico",
      "vox",
      "lider-nacional",
      "vox"
    ],
    "fuente_principal": "https://www.voxespana.es",
    "apartados": [
      {
        "id": "pod-0140-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "pod-0140-ap-00-it-00",
            "apartado_id": "pod-0140-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Ignacio Garriga Vaz de Concicao (Barcelona, 1987) es el secretario general de Vox y uno de los principales dirigentes del partido junto a Santiago Abascal. De origen catalán y con ascendencia guineana, odontólogo de profesión, se ha consolidado como número dos de Vox y como su rostro en Cataluña, donde lidera el partido. Ejerce de portavoz y organizador, con un discurso de defensa de la unidad de España y de oposición frontal al independentismo y al Gobierno de coalición. Su perfil joven y de origen catalán y guineano le da a Vox un rostro de relevo generacional, especialmente en Cataluña.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0140-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "pod-0140-ap-01-it-00",
            "apartado_id": "pod-0140-ap-01",
            "tipo": "evento",
            "titulo": "Odontólogo y activismo",
            "contenido": "Odontólogo de profesión, se vinculó al activismo y a la política de la mano de Vox en Cataluña, con un perfil de defensa del constitucionalismo.",
            "fecha": "2018-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0140-ap-01-it-01",
            "apartado_id": "pod-0140-ap-01",
            "tipo": "evento",
            "titulo": "Líder de Vox en Cataluña",
            "contenido": "Encabezó las candidaturas de Vox en Cataluña, dando al partido representación en el Parlament y en el Congreso por Barcelona.",
            "fecha": "2021-02-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0140-ap-01-it-02",
            "apartado_id": "pod-0140-ap-01",
            "tipo": "evento",
            "titulo": "Secretario general de Vox",
            "contenido": "Asumió la secretaría general de Vox, convirtiéndose en el número dos del partido y en uno de sus principales organizadores y portavoces.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "pod-0140-ap-01-it-03",
            "apartado_id": "pod-0140-ap-01",
            "tipo": "evento",
            "titulo": "Rostro de Vox",
            "contenido": "Ejerce de cara visible del partido en debates y campañas, con un discurso de unidad de España y oposición al independentismo y al Gobierno.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          }
        ]
      },
      {
        "id": "pod-0140-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "pod-0140-ap-02-it-00",
            "apartado_id": "pod-0140-ap-02",
            "tipo": "dato",
            "titulo": "Unidad de España y oposición",
            "contenido": "Defiende la unidad de España, el constitucionalismo frente al independentismo y la oposición frontal al Gobierno de coalición, como número dos de Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "derecha-radical"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "pod-0140-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "pod-0140-ap-03-it-00",
            "apartado_id": "pod-0140-ap-03",
            "tipo": "contacto",
            "titulo": "Santiago Abascal",
            "contenido": "**Presidente de Vox** (nota +8/10) — Número dos del partido y hombre de su confianza.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "vox",
              "nota-+8",
              "alianza"
            ],
            "orden": 0
          },
          {
            "id": "pod-0140-ap-03-it-01",
            "apartado_id": "pod-0140-ap-03",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Presidente del Gobierno** (nota -8/10) — Oposición frontal desde la derecha radical.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "gobierno",
              "nota--8",
              "confrontacion"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T15:00:09.215855Z",
    "updated_at": "2026-05-29T15:00:09.215855Z"
  }
]

export const PODER_RESUMEN: DossierResumen[] = PODER_FIXTURE.map(d => ({
  id: d.id,
  slug: d.slug,
  nombre_completo: d.nombre_completo,
  alias: d.alias,
  cargo_actual: d.cargo_actual,
  partido: d.partido,
  foto_url: d.foto_url,
  bio_corta: d.bio_corta,
  tags: d.tags,
  n_apartados: d.apartados.length,
  updated_at: d.updated_at,
}))

export function getPODBySlug(slug: string): DossierCompleto | null {
  return PODER_FIXTURE.find(d => d.slug === slug) ?? null
}
