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
            "contenido": "Nacida en Albuquerque (Badajoz), 1964. Periodista. Una de las voces más influyentes del periodismo español, con peso en la conversación política diaria.",
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
            "titulo": "TVE · Los Desayunos",
            "contenido": "Dirigió y presentó Los Desayunos de TVE (entrevista política matinal) hasta 2009.",
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
            "titulo": "Cadena SER",
            "contenido": "Codirigió Hoy por Hoy y dirigió Hora 25. Voz central de la SER durante una década.",
            "fecha": "2010-09-01",
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
            "contenido": "Asume la dirección de El País en 2021, sustituyendo a Soledad Gallego-Díaz.",
            "fecha": "2021-12-01",
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Madrid, 1966. Periodista. Una de las figuras más influyentes de la televisión política española por la audiencia y agenda de Al Rojo Vivo.",
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
            "titulo": "Cadena SER / CNN+",
            "contenido": "Director de informativos de la SER y luego de CNN+.",
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
            "titulo": "La Sexta",
            "contenido": "Pieza clave del proyecto La Sexta desde 2006; Al Rojo Vivo desde 2011.",
            "fecha": "2011-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Burgos, 1975. Periodista digital pionero. Hijo del también periodista Arsenio Escolar.",
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
            "titulo": "Público",
            "contenido": "Director fundador del diario Público (2007-2009).",
            "fecha": "2007-09-26",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0003-ap-01-it-01",
            "apartado_id": "pod-0003-ap-01",
            "tipo": "evento",
            "titulo": "elDiario.es",
            "contenido": "Funda elDiario.es en 2012, modelo de socios/suscriptores. Referente del periodismo de izquierda.",
            "fecha": "2012-09-18",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Pamplona, 1966. Periodista. Línea editorial conservadora y muy combativa con el Gobierno de Sánchez.",
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
            "titulo": "El Mundo",
            "contenido": "Subdirector de El Mundo en la etapa de Pedro J. Ramírez.",
            "fecha": "2006-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0004-ap-01-it-01",
            "apartado_id": "pod-0004-ap-01",
            "tipo": "evento",
            "titulo": "OKDiario",
            "contenido": "Funda OKDiario en 2015.",
            "fecha": "2015-09-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Barcelona, 1961. Doctor en Derecho e Historia. Profesor universitario. Línea conservadora pero con interlocución transversal.",
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
            "titulo": "Gabinete de Rajoy",
            "contenido": "Jefe de gabinete de Mariano Rajoy en el Ministerio de Administraciones Públicas (1996-1999).",
            "fecha": "1996-05-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 0
          },
          {
            "id": "pod-0005-ap-01-it-01",
            "apartado_id": "pod-0005-ap-01",
            "tipo": "evento",
            "titulo": "Director de La Razón",
            "contenido": "Dirige La Razón desde 2008.",
            "fecha": "2008-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacida en Madrid, 1956. Periodista y empresaria audiovisual (productora Unicorn Content).",
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
            "titulo": "El Programa de Ana Rosa",
            "contenido": "Matinal de Telecinco desde 2005, líder de audiencia durante casi dos décadas.",
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
            "titulo": "TardeAR",
            "contenido": "Salto a la franja de tarde con TardeAR (2023).",
            "fecha": "2023-09-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Madrid, 1969. Periodista de radio. Considerado riguroso y de difícil clasificación ideológica.",
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
            "titulo": "Más de uno",
            "contenido": "Dirige el matinal de Onda Cero desde 2015.",
            "fecha": "2015-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Madrid, 1963. Periodista. Casado con la también periodista Ángeles Blanco (Mediaset).",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Magistrada del Tribunal Supremo (Sala de lo Contencioso-Administrativo). Hito histórico: primera mujer al frente del poder judicial español.",
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
            "titulo": "Elección consensuada",
            "contenido": "Elegida en septiembre 2024 por el nuevo CGPJ, renovado tras 5 años de bloqueo, mediante acuerdo PSOE-PP mediado por la Comisión Europea.",
            "fecha": "2024-09-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Santiago de Compostela, 1949. Magistrado de larga carrera. Referente del sector progresista judicial.",
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
            "titulo": "Fiscal General",
            "contenido": "Fiscal General del Estado entre 2004 y 2011 (Gobierno de Zapatero).",
            "fecha": "2004-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0010-ap-01-it-01",
            "apartado_id": "pod-0010-ap-01",
            "tipo": "evento",
            "titulo": "Presidente del TC",
            "contenido": "Elegido presidente del Tribunal Constitucional en enero 2023 con la mayoría progresista del tribunal.",
            "fecha": "2023-01-10",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Fiscal de carrera. Especializado en medio ambiente. Designado FGE en 2022, sustituyendo a Dolores Delgado.",
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
            "titulo": "Fiscal General",
            "contenido": "Nombrado FGE en septiembre 2022 a propuesta del Gobierno.",
            "fecha": "2022-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Albacete, 1960. Economista. Carrera técnica en BBVA, BCE y AIReF antes de su etapa política y como Gobernador.",
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
            "titulo": "AIReF",
            "contenido": "Presidente fundador de la Autoridad Independiente de Responsabilidad Fiscal (2014-2020).",
            "fecha": "2014-02-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0013-ap-01-it-01",
            "apartado_id": "pod-0013-ap-01",
            "tipo": "evento",
            "titulo": "Ministro",
            "contenido": "Ministro de Inclusión y Seguridad Social (reforma de pensiones) 2020-2023 y de Transformación Digital 2023-2024.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0013-ap-01-it-02",
            "apartado_id": "pod-0013-ap-01",
            "tipo": "evento",
            "titulo": "Gobernador del Banco de España",
            "contenido": "Nombrado Gobernador del Banco de España en 2024; polémico por su pasado político inmediato.",
            "fecha": "2024-09-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Abogada del Estado en excedencia y especialista en derecho de la competencia (ex socia de Cuatrecasas). Presidenta de la CNMC desde 2020.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Valencia, 1949. Hijo de uno de los fundadores de Mercadona. Convirtió la empresa familiar en líder de la distribución española. Mercadona NO cotiza (capital familiar).",
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
            "titulo": "Liderazgo de Mercadona",
            "contenido": "Asume el control en 1981 y despliega el modelo 'Siempre Precios Bajos'. Hoy >1.600 tiendas y ~100.000 trabajadores.",
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
            "titulo": "Marina de Empresas",
            "contenido": "Funda en Valencia el ecosistema emprendedor Lanzadera + EDEM + Angels.",
            "fecha": "2013-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacida en A Coruña, 1968. Heredó la fortuna de su madre Rosalía Mera (fallecida en 2013). Gestiona Rosp Corunna, vehículo con participaciones en sanidad, tecnología e inmobiliario.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Venezuela, 1959, de origen gallego. Fundador del grupo Banesco. Compró Novagalicia en 2014 y la convirtió en Abanca.",
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
            "tipo": "dato",
            "titulo": "De Venezuela a Galicia",
            "contenido": "Banquero de origen venezolano (Banesco), compró la antigua Novagalicia/Banco Etcheverría en la reestructuración de las cajas gallegas y la transformó en Abanca, hoy uno de los grandes bancos regionales con vocación expansiva.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Barakaldo (Bizkaia), 1972. Sindicalista de carrera. Secretario general de CCOO desde 2017.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en León, 1956, criado en Cataluña. Sindicalista histórico. Secretario general de UGT desde 2016.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacida en Inca (Mallorca), 1971. Farmacéutica de formación. Tercera autoridad del Estado como presidenta del Congreso.",
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
            "titulo": "Presidenta de Baleares",
            "contenido": "Presidenta del Govern balear entre 2015 y 2023 (pacto progresista).",
            "fecha": "2015-07-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0020-ap-01-it-01",
            "apartado_id": "pod-0020-ap-01",
            "tipo": "evento",
            "titulo": "Presidenta del Congreso",
            "contenido": "Elegida presidenta del Congreso en agosto 2023, parte del acuerdo de investidura de Sánchez.",
            "fecha": "2023-08-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Meneses de Campos (Palencia), 1953. Abogado antes que sacerdote. Arzobispo de Valladolid. Presidente de la CEE desde marzo 2024.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Madrid, 1968. Rey de España desde el 19 de junio de 2014. Casado con la reina Letizia. Sus hijas: Leonor (Princesa de Asturias) y Sofía.",
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
            "titulo": "Proclamación",
            "contenido": "Proclamado rey el 19 junio 2014 tras la abdicación de Juan Carlos I.",
            "fecha": "2014-06-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0022-ap-01-it-01",
            "apartado_id": "pod-0022-ap-01",
            "tipo": "evento",
            "titulo": "Discurso del 3 de octubre de 2017",
            "contenido": "Intervención sobre la crisis del procés catalán, momento clave de su reinado.",
            "fecha": "2017-10-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Roma, 1938. Rey de España 1975-2014. Designado sucesor por Franco, pilotó la Transición a la democracia y el fracaso del golpe del 23-F (1981).",
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
            "titulo": "Transición y 23-F",
            "contenido": "Impulsó la democratización tras 1975 y frenó el golpe de Estado del 23 de febrero de 1981.",
            "fecha": "1981-02-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0024-ap-01-it-01",
            "apartado_id": "pod-0024-ap-01",
            "tipo": "evento",
            "titulo": "Abdicación",
            "contenido": "Abdica en favor de Felipe VI en junio 2014.",
            "fecha": "2014-06-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "pod-0024-ap-01-it-02",
            "apartado_id": "pod-0024-ap-01",
            "tipo": "evento",
            "titulo": "Salida a Abu Dabi",
            "contenido": "Se traslada a Emiratos Árabes en agosto 2020 en medio de investigaciones patrimoniales.",
            "fecha": "2020-08-03",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Esposa de Pedro Sánchez. Trayectoria en dirección de fundaciones, marketing y en una cátedra extraordinaria en la Universidad Complutense.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en 1956. Veterano estratega de comunicación del PP. Secretario de Estado de Comunicación con José María Aznar (1996-1998). Hoy mano derecha mediática de Ayuso.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Madrid, 1953. Inspector de Hacienda. Presidente del Gobierno entre 1996 y 2004 (dos legislaturas, la segunda con mayoría absoluta).",
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
            "titulo": "Presidente del Gobierno",
            "contenido": "Gobierna 1996-2004. Entrada en el euro, crecimiento económico, apoyo a la guerra de Irak (Foto de las Azores, 2003).",
            "fecha": "1996-05-05",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0027-ap-01-it-01",
            "apartado_id": "pod-0027-ap-01",
            "tipo": "evento",
            "titulo": "FAES",
            "contenido": "Tras dejar la política activa, preside FAES, think tank de referencia del liberal-conservadurismo español.",
            "fecha": "2004-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Valladolid, 1960, criado en León. Presidente del Gobierno 2004-2011. Referente del ala social del PSOE.",
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
            "titulo": "Gobierno",
            "contenido": "2004-2011: matrimonio igualitario, ley de dependencia, retirada de Irak, y gestión de la crisis financiera (recortes de 2010).",
            "fecha": "2004-04-17",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0028-ap-01-it-01",
            "apartado_id": "pod-0028-ap-01",
            "tipo": "evento",
            "titulo": "Mediación en Venezuela",
            "contenido": "Mediador internacional en Venezuela, papel controvertido por su cercanía al chavismo.",
            "fecha": "2015-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "venezuela"
            ],
            "orden": 1
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Sevilla, 1942. Abogado laboralista. Secretario general del PSOE (1974-1997) y presidente del Gobierno durante 14 años (1982-1996).",
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
            "titulo": "Gobierno",
            "contenido": "1982-1996: entrada en la CEE (1986), referéndum OTAN, modernización de infraestructuras (AVE, autovías). Etapa final marcada por los casos GAL y Filesa.",
            "fecha": "1982-12-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Santiago de Compostela, 1955. Registrador de la propiedad. Presidente del Gobierno 2011-2018.",
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
            "titulo": "Gobierno",
            "contenido": "2011-2018: ajuste fiscal, rescate bancario, recuperación económica, aplicación del 155 en Cataluña (2017).",
            "fecha": "2011-12-21",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0030-ap-01-it-01",
            "apartado_id": "pod-0030-ap-01",
            "tipo": "evento",
            "titulo": "Moción de censura",
            "contenido": "Desalojado del poder por la moción de censura de Pedro Sánchez en junio 2018, tras la sentencia de Gürtel.",
            "fecha": "2018-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mocion-censura"
            ],
            "orden": 1
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Madrid, 1978. Profesor de Ciencia Política. Fundó Podemos en 2014 tras el 15-M. Hoy comunicador (Canal Red) y referente ideológico.",
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
            "titulo": "Fundación de Podemos",
            "contenido": "Funda Podemos en 2014; irrupción en el Congreso en 2015-2016.",
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
            "titulo": "Vicepresidente",
            "contenido": "Vicepresidente segundo del Gobierno de coalición 2020-2021. Dejó el cargo tras las elecciones de Madrid de 2021.",
            "fecha": "2020-01-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Pobla de Segur (Lleida), 1947. Ingeniero aeronáutico y economista. Larga carrera nacional y europea en el PSOE.",
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
            "titulo": "Alto Representante UE",
            "contenido": "Jefe de la diplomacia europea 2019-2024 (Comisión Von der Leyen I): guerra de Ucrania, Oriente Medio, relación con China.",
            "fecha": "2019-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0032-ap-01-it-01",
            "apartado_id": "pod-0032-ap-01",
            "tipo": "evento",
            "titulo": "Ministro de Exteriores",
            "contenido": "Ministro de Asuntos Exteriores con Pedro Sánchez (2018-2019) antes de saltar a la UE.",
            "fecha": "2018-06-07",
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacida en A Coruña, 1968. Economista y abogada. Alta funcionaria de la Comisión Europea antes de su etapa ministerial. Perfil técnico-independiente.",
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
            "titulo": "Vicepresidenta económica",
            "contenido": "Ministra de Economía y vicepresidenta del Gobierno 2018-2023; gestión de la pandemia y los fondos Next Generation.",
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
            "titulo": "Presidenta del BEI",
            "contenido": "Asume la presidencia del Banco Europeo de Inversiones en 2024.",
            "fecha": "2024-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Logroño, 1952. Periodista. Una de las figuras más influyentes y longevas del periodismo español.",
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
            "titulo": "Diario 16 y El Mundo",
            "contenido": "Director de Diario 16 (caso GAL) y fundador-director de El Mundo (1989-2014).",
            "fecha": "1989-10-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0036-ap-01-it-01",
            "apartado_id": "pod-0036-ap-01",
            "tipo": "evento",
            "titulo": "El Español",
            "contenido": "Funda El Español en 2015 tras su salida de El Mundo.",
            "fecha": "2015-10-07",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Barcelona, 1957. Comunicador veterano. Herrera en COPE lidera la audiencia matinal radiofónica en España.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Santander, 1946. Catedrático de Sociología. Histórico militante del PSOE. Preside el CIS desde 2018.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en San Sebastián, 1949. Catedrático de Filosofía y ex rector de la UAM. Ministro de Educación (2009-2011) y candidato del PSOE en Madrid.",
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
            "tipo": "dato",
            "titulo": "De ministro a Defensor del Pueblo",
            "contenido": "Exministro de Educación y excandidato del PSOE a la Comunidad de Madrid, fue elegido Defensor del Pueblo con apoyo parlamentario, cargo desde el que supervisa a las administraciones y tramita el polémico informe sobre los abusos en la Iglesia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Madrid, 1944. Director fundador de El País (1976-1988) y luego consejero delegado y presidente de PRISA.",
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
            "titulo": "Fundador de El País",
            "contenido": "Primer director de El País (1976) y después consejero delegado y presidente de PRISA durante décadas. Figura central del poder mediático de la Transición y de la construcción del grupo de comunicación más influyente de la izquierda.",
            "fecha": "1976-05-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacida en Madrid, 1952. Inversora vía Omega Capital. Coleccionista de arte de prestigio internacional.",
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
            "tipo": "dato",
            "titulo": "Omega Capital y el arte",
            "contenido": "Tras separar su patrimonio del de su hermana Esther y salir de FCC, gestiona su fortuna a través del family office Omega Capital, con inversiones diversificadas, y es una de las grandes coleccionistas y mecenas de arte de España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Almería, 1944. Fundó Cirsa (juego y apuestas). Tras venderla a Blackstone, invierte vía Nortia Capital.",
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
            "titulo": "La venta de Cirsa",
            "contenido": "Fundó y desarrolló Cirsa hasta convertirla en un gigante europeo del juego, que vendió al fondo Blackstone, operación que cristalizó una de las mayores fortunas del país. Reinvierte a través de su family office Nortia.",
            "fecha": "2018-05-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Gestor con trayectoria en RTVE y en Telemadrid. Presidente de RTVE tras la renovación del consaejo de administración en 2024.",
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacido en Sevilla, 1940. Arquitecto del PSOE moderno junto a Felipe González. Vicepresidente del Gobierno 1982-1991.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Nacida en Bruselas, 1958. Médico y política alemana (CDU/PPE). Presidenta de la Comisión Europea desde 2019.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Presidenta de El Corte Inglés y miembro de la familia accionista de referencia. Lidera el grupo en su transición digital y la reordenación de su deuda y activos inmobiliarios.",
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
            "tipo": "dato",
            "titulo": "Reordenación de El Corte Inglés",
            "contenido": "Asumió la presidencia tras años de pugnas familiares y societarias. Ha pilotado la reducción de deuda, la entrada de socios (catarí, banca) y la monetización de la enorme cartera inmobiliaria del grupo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Empresario vinculado a Freixenet y a la promoción del comercio exterior. Presidió la Cámara de Comercio de España y el Foro de Marcas Renombradas.",
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
            "tipo": "dato",
            "titulo": "Freixenet y la marca España",
            "contenido": "Patriarca de Freixenet (hoy en la órbita de la alemana Henkell) y promotor del Foro de Marcas Renombradas, ha sido uno de los grandes embajadores de la internacionalización de la empresa española.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Inversor de larga trayectoria, presidente de Torreal. Ha participado en operaciones en sectores tan diversos como la sanidad, la alimentación, la energía y los servicios.",
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
            "tipo": "dato",
            "titulo": "Del laboratorio a Torreal",
            "contenido": "Hizo su primera gran fortuna en el sector farmacéutico y la multiplicó con la sociedad de inversión Torreal, presente en sanidad, energía, alimentación y servicios. Reconocido coleccionista de arte.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Vicepresidenta y copropietaria de Mercadona. Su fundación impulsa la restauración de patrimonio y el coleccionismo de arte contemporáneo en Valencia.",
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
            "titulo": "Centro de Arte Hortensia Herrero",
            "contenido": "Abrió en Valencia uno de los grandes centros privados de arte contemporáneo de España, rehabilitando un palacio histórico. Su fundación es hoy referente del mecenazgo cultural.",
            "fecha": "2023-11-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Empresario inmobiliario afincado en el sureste español. Su grupo desarrolla y explota grandes centros comerciales. Figura recurrente en lo más alto de las listas de grandes fortunas españolas.",
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
            "tipo": "dato",
            "titulo": "De Murcia al podio de las fortunas",
            "contenido": "Construyó desde el sureste un imperio de grandes centros comerciales (La Salinas, Nueva Condomina). El valor de su cartera inmobiliaria lo sitúa de forma recurrente entre las mayores fortunas de España, con un perfil de máxima discreción pública.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Ingeniera y alta funcionaria con larga trayectoria en la propia SEPI. Preside el holding industrial del Estado, que reúne participaciones de control e influencia en empresas estratégicas y media docena de cotizadas.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Alto funcionario del Estado con experiencia en la Secretaría General del Tesoro y la política financiera. Preside el supervisor bursátil, organismo independiente clave del sistema financiero.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Técnica de Hacienda de larga trayectoria en la AIReF, de la que fue directora antes de presidirla. Voz de referencia en la evaluación independiente de la política fiscal española.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Economista con larga carrera en el Banco Santander, donde dirigió estudios y relaciones institucionales. Preside la AEB, patronal que agrupa a los grandes bancos que operan en España.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Comunicador veterano, fundador de esRadio y Libertad Digital. Su programa matinal es referencia de la derecha liberal-conservadora y un termómetro del ánimo de ese electorado.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Heredero de la familia Lara al frente del Grupo Planeta. Preside también Atresmedia, primer grupo audiovisual privado por audiencia e ingresos publicitarios junto a Mediaset.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Gestor de fondos fundador de Amber Capital. Tomó el control de PRISA tras una larga batalla accionarial y preside el grupo de El País, la SER y Santillana.",
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
            "titulo": "La batalla por PRISA",
            "contenido": "Desde Amber Capital protagonizó una larga guerra accionarial por el control de PRISA, desplazando a la vieja guardia y a otros socios como Vivendi/Telefónica, hasta hacerse con la presidencia del grupo.",
            "fecha": "2021-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Abogado y dirigente deportivo. Preside LaLiga, donde ha profesionalizado la venta centralizada de derechos audiovisuales y la lucha contra la piratería y el déficit de los clubes.",
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
            "tipo": "dato",
            "titulo": "Guerra a la piratería y la Superliga",
            "contenido": "Ha hecho de la lucha contra la piratería audiovisual y de la oposición frontal a la Superliga sus grandes batallas, defendiendo el modelo de venta centralizada de derechos y el control económico de los clubes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Gestora estadounidense fundada por Larry Fink, con billones de dólares bajo gestión. Su plataforma de fondos indexados (iShares) la convierte en accionista automático de prácticamente toda gran empresa cotizada del mundo, España incluida.",
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
            "tipo": "dato",
            "titulo": "Presencia en España",
            "contenido": "Declara participaciones significativas en la mayoría del IBEX 35 y vota en sus juntas generales. Sus criterios de gobernanza, sostenibilidad y remuneración de consejeros marcan tendencia en el resto de inversores.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "pod-0069-ap-01-it-01",
            "apartado_id": "pod-0069-ap-01",
            "tipo": "evento",
            "titulo": "Operaciones bancarias",
            "contenido": "Como accionista relevante de varios bancos, su posición es seguida de cerca en operaciones como la OPA de BBVA sobre Sabadell, donde el voto de los grandes institucionales es decisivo.",
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Periodista económico al frente de El Confidencial, medio de referencia en periodismo de datos e investigación, con fuerte penetración entre directivos, inversores y clase política.",
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
            "tipo": "dato",
            "titulo": "Periodismo de investigación",
            "contenido": "Bajo su dirección el diario ha publicado investigaciones de gran impacto sobre corrupción, finanzas y poder empresarial, consolidándose como uno de los digitales más leídos del país.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Empresario canario de la comunicación, fundador y presidente de Prensa Ibérica. Su grupo agrupa decenas de diarios regionales y locales que dominan la información de proximidad en buena parte del territorio.",
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
            "titulo": "Compra de El Periódico",
            "contenido": "Prensa Ibérica adquirió el Grupo Zeta, sumando El Periódico de Catalunya y Sport a su cartera, reforzando su peso en el mercado catalán y deportivo.",
            "fecha": "2019-06-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
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
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Directivo con un largo recorrido en la banca de inversión y la gran empresa. Presidió Endesa y hoy preside Mediaset España, primer grupo audiovisual privado junto a Atresmedia.",
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
            "titulo": "De Endesa a Mediaset",
            "contenido": "Tras más de una década al frente de Endesa, dio el salto a la presidencia de Mediaset España, en plena reordenación del grupo bajo el paraguas del italiano MFE (Berlusconi).",
            "fecha": "2021-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Empresario granadino, preside CEPYME, la patronal de las pymes que forma parte de la estructura de la CEOE. Defiende los intereses del pequeño y mediano empresario en la negociación con el Gobierno y los sindicatos.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Jurista y académico, catedrático de Derecho Administrativo. Dirige la RAE y la Asociación de Academias de la Lengua Española (ASALE), lo que le otorga autoridad sobre el idioma en todo el mundo hispano.",
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Cardenal arzobispo de Barcelona, nombrado por el Papa Francisco, de quien es considerado hombre de confianza en España. Presidió la Conferencia Episcopal en una etapa marcada por la crisis de los abusos.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Empresario hecho a sí mismo, construyó desde Murcia uno de los mayores grupos cárnicos de Europa (ElPozo) y diversificó hacia inmobiliario, energía y participaciones financieras.",
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Inversor mexicano de origen libanés, dueño de América Móvil. Tras la crisis tomó el control de FCC y Realia en España, convirtiéndose en uno de los mayores propietarios extranjeros de empresas españolas.",
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
            "titulo": "Control de FCC",
            "contenido": "Entró en el capital de FCC en plena reestructuración de la deuda del grupo, desplazando progresivamente a la familia Koplowitz como accionista de referencia.",
            "fecha": "2014-12-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
            "contenido": "Ingeniero aeronáutico catalán, cofundó Glovo y la convirtió en una de las mayores plataformas de reparto del sur de Europa, hoy controlada por Delivery Hero. Referente del emprendimiento tecnológico español.",
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
      }
    ],
    "created_at": "2026-05-28T19:56:41.794754Z",
    "updated_at": "2026-05-28T19:56:41.794754Z"
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
