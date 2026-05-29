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
            "contenido": "Pepa Bueno (Badajoz, 1964) es directora de El País, el diario de referencia de la izquierda española y buque insignia del grupo PRISA. Periodista de larga trayectoria en televisión y radio, dirige la redacción más influyente del país en un momento de pugna por la propiedad del grupo.",
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
            "titulo": "Televisión: el Telediario",
            "contenido": "Se hizo conocida presentando los informativos de TVE, incluido el Telediario, durante años, con un estilo riguroso e institucional.",
            "fecha": "2004-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0001-ap-01-it-01",
            "apartado_id": "pod-0001-ap-01",
            "tipo": "evento",
            "titulo": "Radio: Hoy por Hoy",
            "contenido": "Dirigió y presentó 'Hoy por Hoy', el magacín matinal de la Cadena SER, referencia informativa de la radio, antes de dar el salto a la prensa escrita.",
            "fecha": "2012-09-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0001-ap-01-it-02",
            "apartado_id": "pod-0001-ap-01",
            "tipo": "evento",
            "titulo": "Dirección de El País",
            "contenido": "En 2023 asumió la dirección de El País, primera mujer al frente del diario, en plena reordenación accionarial del grupo PRISA (Amber Capital, bancos, socios con intereses políticos).",
            "fecha": "2023-04-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Antonio García Ferreras (Lupiana, Guadalajara, 1966) es director y presentador de 'Al Rojo Vivo' (laSexta) y uno de los periodistas más influyentes y polémicos de la televisión española. Desde su programa fija buena parte de la agenda política diaria del espacio progresista.",
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
            "titulo": "Del deporte a la dirección de informativos",
            "contenido": "Empezó en radio y prensa deportiva y dirigió los informativos de la Cadena SER y de Telemadrid. Su salto a la dirección de la recién nacida laSexta (2006) lo situó en el centro del nuevo audiovisual privado.",
            "fecha": "2006-03-27",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0002-ap-01-it-01",
            "apartado_id": "pod-0002-ap-01",
            "tipo": "evento",
            "titulo": "'Al Rojo Vivo' y la maquinaria de tertulia",
            "contenido": "Desde 2011 dirige y presenta 'Al Rojo Vivo', el magacín de actualidad de laSexta que ha popularizado el formato de tertulia política intensiva. Su capacidad para marcar agenda y elegir contertulios lo convierte en un actor de poder, no solo en un periodista.",
            "fecha": "2011-01-10",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0002-ap-01-it-02",
            "apartado_id": "pod-0002-ap-01",
            "tipo": "evento",
            "titulo": "Vínculo con Atresmedia y el espacio progresista",
            "contenido": "Como rostro estrella del grupo Atresmedia (Planeta), su línea editorial, crítica con la derecha, pesa en la imagen del grupo y en la conversación pública de la izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Ana Rosa Quintana (Madrid, 1956) es la presentadora más influyente de Mediaset España y una de las grandes figuras de la televisión. Su magacín matinal lidera la franja desde hace dos décadas y condiciona la agenda mediática del centro-derecha.",
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
            "titulo": "De la prensa del corazón a la mañana",
            "contenido": "Formada en periodismo, saltó a la fama en programas de corazón y sucesos. En 2005 estrenó 'El Programa de Ana Rosa' en Telecinco, que se convirtió en el magacín matinal de referencia.",
            "fecha": "2005-01-10",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0006-ap-01-it-01",
            "apartado_id": "pod-0006-ap-01",
            "tipo": "evento",
            "titulo": "Productora propia y poder de mercado",
            "contenido": "A través de su productora (Unicorn Content) controla la producción de sus propios formatos y de otros de la cadena, lo que le da un poder inusual sobre la parrilla de Mediaset.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0006-ap-01-it-02",
            "apartado_id": "pod-0006-ap-01",
            "tipo": "evento",
            "titulo": "Vespertina y peso editorial",
            "contenido": "Tras una etapa en las tardes, su criterio y su tono marcan la línea de buena parte del entretenimiento informativo de Mediaset, con un encuadre crítico hacia el Gobierno.",
            "fecha": "2023-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Vicente Vallés (Madrid, 1963) es director y presentador de 'Antena 3 Noticias 2', el informativo de máxima audiencia de la televisión española. Con un estilo analítico y entrevistas incisivas, es uno de los periodistas con mayor credibilidad del panorama.",
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
            "titulo": "De CNN+ a Telecinco",
            "contenido": "Trabajó en CNN+ y dirigió informativos en Telecinco y Cuatro antes de recalar en Atresmedia, donde se consolidó como referente de la información política.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0008-ap-04-it-01",
            "apartado_id": "pod-0008-ap-04",
            "tipo": "evento",
            "titulo": "Antena 3 Noticias y los editoriales",
            "contenido": "Desde 2017 dirige y presenta el informativo de la noche de Antena 3, líder de audiencia, célebre por sus editoriales de cierre. Es además autor de varios ensayos de éxito sobre geopolítica y desinformación.",
            "fecha": "2017-09-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Isabel Perelló (Valencia, 1958) es presidenta del Tribunal Supremo y del Consejo General del Poder Judicial (CGPJ), la primera mujer en ocupar la cúspide del poder judicial español. Magistrada de prestigio, accedió al cargo en 2024 tras el desbloqueo de la renovación del CGPJ.",
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
            "titulo": "Carrera en la magistratura",
            "contenido": "Magistrada de larga trayectoria, llegó a la Sala de lo Contencioso-Administrativo del Tribunal Supremo, donde se ganó la reputación de jurista rigurosa e independiente.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0009-ap-01-it-01",
            "apartado_id": "pod-0009-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta del TS y del CGPJ",
            "contenido": "En 2024, tras cinco años de bloqueo político en la renovación del CGPJ, fue elegida por consenso presidenta del Tribunal Supremo y del Consejo, con el reto de despolitizar el órgano de gobierno de los jueces.",
            "fecha": "2024-09-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Cándido Conde-Pumpido Tourón (Santiago de Compostela, 1949) es presidente del Tribunal Constitucional desde 2023. Magistrado de larga carrera y exfiscal general del Estado, es una de las figuras más influyentes —y discutidas— del poder judicial español.",
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
            "contenido": "Magistrado de profesión, desarrolló una extensa carrera en la judicatura y la Fiscalía, con paso por el Tribunal Supremo. Se le identifica con el sector progresista de la judicatura.",
            "fecha": "1975-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0010-ap-01-it-01",
            "apartado_id": "pod-0010-ap-01",
            "tipo": "evento",
            "titulo": "Fiscal General con Zapatero",
            "contenido": "Fue fiscal general del Estado durante los gobiernos de Rodríguez Zapatero (2004-2011), una etapa marcada por causas de gran calado político y por las tensiones habituales entre Fiscalía, Gobierno y oposición.",
            "fecha": "2004-04-24",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0010-ap-01-it-02",
            "apartado_id": "pod-0010-ap-01",
            "tipo": "evento",
            "titulo": "Magistrado y presidente del TC",
            "contenido": "Llegó al Tribunal Constitucional en 2017 y, tras la renovación que dio mayoría al bloque progresista, fue elegido presidente del tribunal en enero de 2023. Desde la presidencia ha pilotado sentencias de gran trascendencia política.",
            "fecha": "2023-01-10",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Álvaro García Ortiz (Valdediós, Asturias, 1967) es fiscal general del Estado desde 2022. Fiscal de carrera especializado en medio ambiente, su mandato ha estado marcado por una tensión inédita con parte de la carrera fiscal, el poder judicial y la oposición.",
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
            "titulo": "Fiscal especialista en medio ambiente",
            "contenido": "Fiscal de carrera, se especializó en delitos contra el medio ambiente y la ordenación del territorio, llegando a ser fiscal de Sala de Medio Ambiente, antes de ascender en la cúpula del ministerio público.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0011-ap-01-it-01",
            "apartado_id": "pod-0011-ap-01",
            "tipo": "evento",
            "titulo": "Fiscal General del Estado",
            "contenido": "Fue nombrado fiscal general en 2022 a propuesta del Gobierno y renovado en 2024. Su designación, como la de sus predecesores, reavivó el debate sobre la autonomía de la Fiscalía respecto del Ejecutivo que la propone.",
            "fecha": "2022-07-27",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0011-ap-01-it-02",
            "apartado_id": "pod-0011-ap-01",
            "tipo": "evento",
            "titulo": "Una causa sin precedentes",
            "contenido": "García Ortiz está siendo investigado por el Tribunal Supremo por una presunta revelación de secretos en relación con la difusión de información sobre un caso fiscal. Es la primera vez que un fiscal general en activo se ve en esa situación. La causa sigue su curso y rige la presunción de inocencia mientras no haya sentencia firme.",
            "fecha": "2024-10-30",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Cani Fernández (1968) es presidenta de la Comisión Nacional de los Mercados y la Competencia (CNMC), el superregulador que vigila la competencia y los sectores de energía, telecomunicaciones y transporte. Abogada especialista en competencia, su criterio condiciona fusiones y precios en toda la economía.",
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
            "titulo": "Especialista en competencia",
            "contenido": "Abogada del Estado y socia de competencia en Cuatrecasas, fue letrada en el Tribunal de Justicia de la Unión Europea, donde se forjó como una de las grandes expertas en derecho de la competencia.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0014-ap-04-it-01",
            "apartado_id": "pod-0014-ap-04",
            "tipo": "evento",
            "titulo": "Presidencia de la CNMC",
            "contenido": "Desde 2020 preside la CNMC, organismo que autoriza concentraciones, sanciona cárteles y regula la energía y las telecos. Sus decisiones afectan directamente a las grandes cotizadas y a la factura de los consumidores.",
            "fecha": "2020-09-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Juan Roig (Valencia, 1949) es presidente de Mercadona, la mayor cadena de distribución alimentaria de España, y una de las primeras fortunas del país. Su modelo de gestión y su discurso del 'esfuerzo' lo han convertido en un referente —y a la vez en una figura controvertida— del empresariado español.",
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
            "contenido": "Transformó el pequeño negocio de ultramarinos de su familia en Mercadona, que bajo su dirección se convirtió en líder absoluto de la distribución en España con miles de supermercados.",
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
            "titulo": "El modelo Mercadona",
            "contenido": "Impuso un modelo de marca propia (Hacendado, Deliplus), 'siempre precios bajos' e integración con proveedores ('interproveedores'), copiado y estudiado en todo el sector.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0015-ap-01-it-02",
            "apartado_id": "pod-0015-ap-01",
            "tipo": "evento",
            "titulo": "Marina de Empresas y mecenazgo",
            "contenido": "Reinvierte parte de su fortuna en el emprendimiento (Marina de Empresas, Lanzadera, EDEM) y en el deporte (Valencia Basket). Su mujer, Hortensia Herrero, destaca como mecenas del arte.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Sandra Ortega Mera (A Coruña, 1968) es la mujer más rica de España y una de las grandes fortunas del país. Hija del fundador de Inditex, Amancio Ortega, y de Rosalía Mera, heredó la participación de su madre y gestiona su patrimonio e iniciativas filantrópicas con un perfil discreto.",
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
            "titulo": "Heredera de Rosalía Mera",
            "contenido": "Tras el fallecimiento de su madre, cofundadora de Inditex, en 2013, heredó su participación accionarial, convirtiéndose en una de las mayores accionistas del grupo textil.",
            "fecha": "2013-08-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0016-ap-03-it-01",
            "apartado_id": "pod-0016-ap-03",
            "tipo": "evento",
            "titulo": "Rosp Corunna y filantropía",
            "contenido": "Gestiona su fortuna a través de la sociedad Rosp Corunna y dedica una parte relevante a la filantropía, especialmente a la discapacidad (Fundación Pa de Mel) y la salud, siguiendo la estela de su madre.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Luis Argüello (Meneses de Campos, Palencia, 1953) es arzobispo de Valladolid y presidente de la Conferencia Episcopal Española desde 2024, la máxima autoridad de la Iglesia católica en España. Canonista de formación, representa a los obispos ante el Estado y la sociedad.",
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
            "titulo": "Sacerdote y obispo",
            "contenido": "Ordenado sacerdote y luego obispo auxiliar de Valladolid, combinó la labor pastoral con la formación en Derecho Canónico, especializándose en las relaciones Iglesia-Estado.",
            "fecha": "2016-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0021-ap-04-it-01",
            "apartado_id": "pod-0021-ap-04",
            "tipo": "evento",
            "titulo": "Secretario y portavoz de la CEE",
            "contenido": "Fue secretario general y portavoz de la Conferencia Episcopal, voz visible de los obispos en debates como la eutanasia, el aborto o la educación.",
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
            "titulo": "Presidente de la Conferencia Episcopal",
            "contenido": "En 2024 fue elegido presidente de la CEE, asumiendo la interlocución con el Gobierno en asuntos sensibles como los abusos, las inmatriculaciones y la financiación.",
            "fecha": "2024-03-06",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Nacida en Oviedo, 1972. Periodista de profesión, primera reina consorte de origen no aristocrático y con carrera profesional propia.",
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
            "tipo": "dato",
            "titulo": "De periodista a Reina",
            "contenido": "Antes de casarse con Felipe en 2004 fue periodista en agencias, CNN+ y presentadora del Telediario de TVE. Es la primera reina consorte de origen plebeyo y con carrera profesional propia, lo que marca su perfil público.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Begoña Gómez (Bilbao, 1975) es directora de cátedra en la Universidad Complutense y esposa del presidente del Gobierno, Pedro Sánchez. Su actividad profesional ha pasado a un primer plano público al verse investigada en un procedimiento judicial.",
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
            "contenido": "Consultora y directiva en el ámbito de la captación de fondos y la responsabilidad social, dirigió un máster y una cátedra extraordinaria sobre transformación social competitiva en la Universidad Complutense.",
            "fecha": "2020-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0025-ap-04-it-01",
            "apartado_id": "pod-0025-ap-04",
            "tipo": "evento",
            "titulo": "Procedimiento judicial abierto",
            "contenido": "Desde 2024 está siendo investigada por un juzgado de Madrid en una causa sobre presuntos tráfico de influencias y otros delitos en torno a su actividad. La causa sigue su curso y rige plenamente la presunción de inocencia mientras no haya sentencia firme.",
            "fecha": "2024-04-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Miguel Ángel Rodríguez (Madrid, 1956), 'MAR', es jefe de gabinete de la presidenta de la Comunidad de Madrid, Isabel Díaz Ayuso, y uno de los estrategas de comunicación más influyentes y polémicos de la derecha española. Exsecretario de Estado con Aznar, es el cerebro comunicativo del 'efecto Ayuso'.",
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
            "titulo": "Secretario de Estado con Aznar",
            "contenido": "Periodista de profesión, fue secretario de Estado de Comunicación en el primer Gobierno de Aznar, donde se forjó como uno de los grandes spin doctors de la derecha.",
            "fecha": "1996-05-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0026-ap-03-it-01",
            "apartado_id": "pod-0026-ap-03",
            "tipo": "evento",
            "titulo": "El cerebro de Ayuso",
            "contenido": "Como jefe de gabinete de Díaz Ayuso, diseña su estrategia de confrontación con el Gobierno central y su comunicación, en el centro de polémicas como la del correo sobre el novio de la presidenta.",
            "fecha": "2019-08-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Pablo Iglesias Turrión (Madrid, 1978) fue vicepresidente segundo del Gobierno y fundador de Podemos, el partido que sacudió el bipartidismo en 2014. Profesor de Ciencia Política, hoy dirige el medio Canal Red y mantiene una influencia notable en el espacio de la izquierda alternativa.",
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
            "contenido": "Politólogo y tertuliano (La Tuerka), capitalizó el malestar del 15-M para fundar Podemos en 2014, que irrumpió con fuerza en las europeas y luego en las generales, rompiendo el bipartidismo.",
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
            "titulo": "Vicepresidente del Gobierno",
            "contenido": "Tras el acuerdo con el PSOE, fue vicepresidente segundo y ministro de Derechos Sociales en el primer Gobierno de coalición (2020-2021), antes de dejar la política activa tras las elecciones madrileñas.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0031-ap-01-it-02",
            "apartado_id": "pod-0031-ap-01",
            "tipo": "evento",
            "titulo": "Canal Red y la batalla mediática",
            "contenido": "Apartado de la primera línea, fundó Canal Red y se volcó en la comunicación, manteniendo el pulso con la derecha mediática y con el espacio de Sumar.",
            "fecha": "2021-05-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Josep Borrell (La Pobla de Segur, Lérida, 1947) es uno de los grandes estadistas del socialismo español y europeo. Ingeniero y economista, fue ministro, presidente del Parlamento Europeo y Alto Representante de la UE para Asuntos Exteriores, el cargo diplomático más alto de Europa.",
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
            "titulo": "Ministro y presidente del Parlamento Europeo",
            "contenido": "Ministro de Obras Públicas con Felipe González, ganó las primarias del PSOE en 1998 y presidió el Parlamento Europeo (2004-2007), consolidando su perfil europeísta.",
            "fecha": "2004-07-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0032-ap-01-it-01",
            "apartado_id": "pod-0032-ap-01",
            "tipo": "evento",
            "titulo": "Ministro de Exteriores y Alto Representante",
            "contenido": "Volvió a la primera línea como ministro de Exteriores con Sánchez (2018) y, desde 2019, fue Alto Representante de la UE y vicepresidente de la Comisión, pilotando la respuesta europea a la guerra de Ucrania y a Oriente Próximo.",
            "fecha": "2019-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Pedro J. Ramírez (Logroño, 1952) es director de El Español y una leyenda del periodismo de investigación español. Fundador de El Mundo, ha protagonizado las grandes batallas mediáticas de la democracia, con un estilo combativo y una relación tensa con el poder de turno.",
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
            "titulo": "Diario 16 y los GAL",
            "contenido": "Dirigió Diario 16 con apenas 28 años; desde allí destapó la trama de los GAL, la guerra sucia contra ETA, que marcó el final de la era socialista.",
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
            "titulo": "Fundación y dirección de El Mundo",
            "contenido": "En 1989 fundó El Mundo, que convirtió en el segundo diario de España y en una máquina de investigación (Roldán, Filesa, Gürtel, Bárcenas). Dirigió el periódico durante 25 años.",
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
            "titulo": "El Español",
            "contenido": "Tras su salida de El Mundo en 2014, fundó en 2015 el digital El Español mediante crowdfunding, consolidándolo como uno de los nativos digitales líderes y de referencia del centro-derecha.",
            "fecha": "2015-10-07",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Carlos Herrera (Almería, 1957) es el comunicador estrella de la COPE y líder de audiencia de la radio de la mañana. Su programa es parada obligada de la actualidad política y un altavoz del centro-derecha, con una influencia notable en el debate público.",
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
            "titulo": "De RNE a Onda Cero",
            "contenido": "Locutor de larga trayectoria, pasó por Radio Nacional y Onda Cero, donde consolidó las mañanas con uno de los magacines de mayor audiencia de la radio española.",
            "fecha": "1990-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0037-ap-04-it-01",
            "apartado_id": "pod-0037-ap-04",
            "tipo": "evento",
            "titulo": "'Herrera en COPE'",
            "contenido": "En 2015 fichó por la COPE, la cadena de la Conferencia Episcopal, donde dirige y presenta el programa matinal líder, con entrevistas a primeras figuras políticas y una línea crítica con el Gobierno de Sánchez.",
            "fecha": "2015-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "José Félix Tezanos (Santander, 1946) es presidente del Centro de Investigaciones Sociológicas (CIS), el principal instituto demoscópico público de España. Catedrático de Sociología y teórico histórico del PSOE, sus encuestas y su metodología son objeto de polémica recurrente.",
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
            "titulo": "Sociólogo y dirigente socialista",
            "contenido": "Catedrático de Sociología en la UNED y figura intelectual del PSOE durante décadas, dirigió la revista 'Temas para el Debate' y teorizó sobre la socialdemocracia.",
            "fecha": "1980-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0038-ap-05-it-01",
            "apartado_id": "pod-0038-ap-05",
            "tipo": "evento",
            "titulo": "Presidencia del CIS",
            "contenido": "Nombrado presidente del CIS en 2018, defendió un modelo de estimación ('cocina') que ajusta los datos brutos. Sus sondeos, a menudo más favorables al PSOE que otros, han alimentado el debate sobre la independencia del organismo.",
            "fecha": "2018-06-29",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Ángel Gabilondo (San Sebastián, 1949) es Defensor del Pueblo, la alta institución que supervisa a las administraciones y defiende los derechos de los ciudadanos. Catedrático de Filosofía y exministro de Educación, llegó al cargo tras una larga carrera académica y política.",
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
            "titulo": "Universidad y Ministerio",
            "contenido": "Catedrático de Filosofía y rector de la Universidad Autónoma de Madrid, fue ministro de Educación en el último Gobierno de Zapatero (2009-2011).",
            "fecha": "2009-04-07",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0039-ap-03-it-01",
            "apartado_id": "pod-0039-ap-03",
            "tipo": "evento",
            "titulo": "Política y Defensor del Pueblo",
            "contenido": "Fue candidato del PSOE a la Comunidad de Madrid en varias elecciones. En 2021 fue elegido Defensor del Pueblo con apoyo parlamentario, cargo desde el que tramitó el polémico informe sobre los abusos en la Iglesia.",
            "fecha": "2021-11-18",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Juan Luis Cebrián (Madrid, 1944) es una figura histórica del periodismo y el poder mediático español. Primer director de El País y después consejero delegado y presidente de PRISA, construyó y dirigió durante décadas el mayor grupo de comunicación de la izquierda.",
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
            "titulo": "Fundador y director de El País",
            "contenido": "Fue el primer director de El País (1976), el diario que se convirtió en referencia de la Transición y del progresismo. Académico de la RAE, marcó la línea editorial del periódico durante años.",
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
            "titulo": "La era PRISA",
            "contenido": "Como consejero delegado y luego presidente de PRISA, lideró la expansión del grupo (Cadena SER, Canal+, Santillana) y su salida a bolsa, antes de las guerras accionariales que acabaron desplazándolo.",
            "fecha": "1988-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Alicia Koplowitz (Madrid, 1952), marquesa de Bellavista, es una de las grandes fortunas e inversoras de España. Tras su etapa en la constructora FCC, gestiona su patrimonio a través del family office Omega Capital y es una de las mayores coleccionistas y mecenas de arte del país.",
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
            "titulo": "La era FCC",
            "contenido": "Junto a su hermana Esther, heredó y dirigió el grupo Construcciones y Contratas (FCC), uno de los gigantes de la obra pública española, del que se desligó tras repartir el patrimonio familiar.",
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
            "titulo": "Omega Capital y el arte",
            "contenido": "Desde Omega Capital invierte en cotizadas, inmobiliario y capital riesgo con un perfil discreto. Su colección de arte y su fundación la sitúan entre los grandes mecenas culturales.",
            "fecha": "2000-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Manuel Lao Hernández (Granada, 1944) es uno de los grandes empresarios y fortunas de España, fundador del gigante del juego Cirsa. Tras vender la compañía, gestiona su patrimonio diversificado a través del family office Nortia, con un perfil de extrema discreción.",
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
            "titulo": "De las máquinas a Cirsa",
            "contenido": "Construyó desde Cataluña, partiendo del negocio de máquinas recreativas, uno de los mayores grupos de juego y ocio de Europa (Cirsa), con presencia en casinos, salones y apuestas en España y Latinoamérica.",
            "fecha": "1978-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0042-ap-03-it-01",
            "apartado_id": "pod-0042-ap-03",
            "tipo": "evento",
            "titulo": "Venta a Blackstone y Nortia",
            "contenido": "En 2018 vendió Cirsa al fondo Blackstone, cristalizando una de las mayores fortunas del país, que hoy reinvierte a través de su holding Nortia en cotizadas, inmobiliario y energía.",
            "fecha": "2018-05-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Alfonso Guerra (Sevilla, 1940) es uno de los grandes arquitectos del PSOE moderno y de la Transición. Vicepresidente del Gobierno con Felipe González durante casi una década, fue el gran organizador del partido y hoy es una de las voces críticas más duras con el rumbo del PSOE de Sánchez.",
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
            "contenido": "Hombre de confianza de Felipe González desde Suresnes, diseñó la maquinaria del partido y su estrategia electoral, convirtiéndose en el número dos del socialismo.",
            "fecha": "1974-01-01",
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
            "contenido": "Fue vicepresidente del Gobierno (1982-1991), pieza clave de la modernización de España, hasta que el caso de su hermano Juan precipitó su salida del Ejecutivo.",
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
            "titulo": "Voz crítica",
            "contenido": "Retirado de la primera línea, preside la Fundación Pablo Iglesias y se ha convertido en uno de los críticos más severos con los pactos del Gobierno con el independentismo y la amnistía.",
            "fecha": "2023-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Carlos San Basilio (Madrid, 1968) es presidente de la Comisión Nacional del Mercado de Valores (CNMV), el supervisor de los mercados financieros españoles. Alto funcionario del Estado, vigila a todas las cotizadas del IBEX, autoriza las grandes operaciones y persigue el abuso de mercado.",
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
            "titulo": "Alta función pública del Tesoro",
            "contenido": "Técnico comercial y economista del Estado, desarrolló su carrera en la Secretaría General del Tesoro y la política financiera del Ministerio de Economía, donde fue secretario general.",
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
            "titulo": "Presidencia de la CNMV",
            "contenido": "Accedió a la presidencia del supervisor bursátil, desde donde arbitra OPAs, fusiones bancarias y salidas a bolsa, con la OPA del BBVA sobre el Sabadell como gran asunto de su mandato.",
            "fecha": "2024-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
            "contenido": "Carlos Slim Helú (Ciudad de México, 1940) es un magnate mexicano de las telecomunicaciones y una de las mayores fortunas del mundo. En España es accionista de control de la constructora FCC y de la inmobiliaria Realia, lo que lo convierte en uno de los mayores propietarios extranjeros de empresas españolas.",
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
            "contenido": "Inversor de origen libanés, construyó un conglomerado en torno a América Móvil, el mayor operador de telecomunicaciones de Latinoamérica, que lo situó durante años como el hombre más rico del mundo.",
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
            "titulo": "Desembarco en España",
            "contenido": "Tras la crisis financiera, tomó el control de FCC (construcción y servicios urbanos) y de Realia, desplazando a la familia Koplowitz, y mantuvo posiciones en otras cotizadas españolas.",
            "fecha": "2014-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
    "created_at": "2026-05-29T10:59:52.164699Z",
    "updated_at": "2026-05-29T10:59:52.164699Z"
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
