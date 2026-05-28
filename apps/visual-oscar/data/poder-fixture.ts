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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
          }
        ]
      }
    ],
    "created_at": "2026-05-28T19:10:13.009483Z",
    "updated_at": "2026-05-28T19:10:13.009483Z"
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
