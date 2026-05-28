// AUTO-GENERADO desde data/diputaciones/*.json · ver bin/gen_subfixture.py
// Fuentes:
//   · instituciones.json  · 38 Diputaciones Provinciales + 3 Forales
//   · presidentes.json    · 41 presidentes (38 + 3 Diputados Generales)
//   · complementos.json   · 5 actores puente (Moreno Bonilla, Baltar, ERC, Junts, PSdeG)
// Re-generar: python3 bin/gen_subfixture.py --source diputaciones

import type {
  DossierCompleto,
  DossierResumen,
} from './dosieres-fixture'

export const DIPUTACIONES_FIXTURE: DossierCompleto[] = [
  {
    "id": "dip-0001",
    "slug": "diputacion-almeria",
    "nombre_completo": "Diputación Provincial de Almería",
    "alias": "Diputación de Almería",
    "cargo_actual": "Diputación Provincial · 102 municipios de Almería",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución de gobierno provincial de Almería. 27 diputados elegidos indirectamente por los concejales de los partidos en los municipios. Sede en el Palacio Provincial (Almería).",
    "tags": [
      "diputacion-provincial",
      "ccaa:andalucia",
      "provincia:almeria"
    ],
    "fuente_principal": "https://www.dipalme.org",
    "apartados": [
      {
        "id": "dip-0001-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0001-ap-00-it-00",
            "apartado_id": "dip-0001-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "Diputación Provincial de Almería. 27 diputados provinciales. 102 municipios bajo su área. Sede: Palacio Provincial, plaza Marín.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0001-ap-00-it-01",
            "apartado_id": "dip-0001-ap-00",
            "tipo": "dato",
            "titulo": "Presidente actual",
            "contenido": "Javier Aureliano García Molina (PP). Constituida en julio 2023 tras las municipales del 28-M.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "javier-aureliano-garcia"
            ],
            "orden": 1
          },
          {
            "id": "dip-0001-ap-00-it-02",
            "apartado_id": "dip-0001-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0001-ap-00-it-03",
            "apartado_id": "dip-0001-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0001-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0001-ap-01-it-00",
            "apartado_id": "dip-0001-ap-01",
            "tipo": "evento",
            "titulo": "Mayoría PP",
            "contenido": "PP recuperó la presidencia tras las municipales 2019 y consolidada en 2023. Antes de 2019 estuvo en manos del PSOE.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0001-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0001-ap-02-it-00",
            "apartado_id": "dip-0001-ap-02",
            "tipo": "dato",
            "titulo": "Competencias",
            "contenido": "Asistencia a municipios <20.000 hab., carreteras provinciales, deportes, cultura, planes provinciales.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0001-ap-02-it-01",
            "apartado_id": "dip-0001-ap-02",
            "tipo": "dato",
            "titulo": "Plan provincial",
            "contenido": "Foco en agua (sequía endémica almeriense) y agricultura intensiva (Poniente almeriense).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "agua",
              "agricultura"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0001-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0001-ap-03-it-00",
            "apartado_id": "dip-0001-ap-03",
            "tipo": "contacto",
            "titulo": "Composición",
            "contenido": "**Mayoría PP** — Resto: PSOE, Vox, IU/Por Almería.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "composicion",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0001-ap-03-it-01",
            "apartado_id": "dip-0001-ap-03",
            "tipo": "contacto",
            "titulo": "Junta de Andalucía",
            "contenido": "**Coordinación con Junta de Andalucía (Moreno Bonilla, PP)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junta-andalucia",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          },
          {
            "id": "dip-0001-ap-03-it-02",
            "apartado_id": "dip-0001-ap-03",
            "tipo": "contacto",
            "titulo": "FAMP",
            "contenido": "**Federación Andaluza de Municipios y Provincias**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "famp",
              "sin-valorar"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0001-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0001-ap-04-it-00",
            "apartado_id": "dip-0001-ap-04",
            "tipo": "documento",
            "titulo": "Diputación de Almería",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipalme.org",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0002",
    "slug": "diputacion-cadiz",
    "nombre_completo": "Diputación Provincial de Cádiz",
    "alias": "Diputación de Cádiz",
    "cargo_actual": "Diputación Provincial · 45 municipios gaditanos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución de gobierno provincial de Cádiz. 31 diputados provinciales. Sede en Cádiz. Presidida por Almudena Martínez del Junco (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:andalucia",
      "provincia:cadiz"
    ],
    "fuente_principal": "https://www.dipucadiz.es",
    "apartados": [
      {
        "id": "dip-0002-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0002-ap-00-it-00",
            "apartado_id": "dip-0002-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "31 diputados. 45 municipios. Sede Palacio Provincial (Cádiz).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0002-ap-00-it-01",
            "apartado_id": "dip-0002-ap-00",
            "tipo": "dato",
            "titulo": "Presidenta",
            "contenido": "Almudena Martínez del Junco (PP). Antes Irene García (PSOE 2015-2023).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "almudena-martinez"
            ],
            "orden": 1
          },
          {
            "id": "dip-0002-ap-00-it-02",
            "apartado_id": "dip-0002-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0002-ap-00-it-03",
            "apartado_id": "dip-0002-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0002-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0002-ap-01-it-00",
            "apartado_id": "dip-0002-ap-01",
            "tipo": "evento",
            "titulo": "Alternancia 2023",
            "contenido": "PP gana la presidencia en 2023 tras 8 años de PSOE. Refleja la ola PP-Vox en Andalucía.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0002-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0002-ap-02-it-00",
            "apartado_id": "dip-0002-ap-02",
            "tipo": "dato",
            "titulo": "Competencias clave",
            "contenido": "Áreas con peso: turismo (Cádiz capital, Costa Luz), gestión agua, carreteras, política social.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0002-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0002-ap-03-it-00",
            "apartado_id": "dip-0002-ap-03",
            "tipo": "contacto",
            "titulo": "Junta de Andalucía",
            "contenido": "**Coordinación con Moreno Bonilla (PP)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junta-andalucia",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0002-ap-03-it-01",
            "apartado_id": "dip-0002-ap-03",
            "tipo": "contacto",
            "titulo": "Bahía de Algeciras",
            "contenido": "**Vínculos con Autoridad Portuaria Bahía Algeciras y CCAA por gigafactoría Stellantis y polo logístico**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "algeciras",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0002-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0002-ap-04-it-00",
            "apartado_id": "dip-0002-ap-04",
            "tipo": "documento",
            "titulo": "Diputación de Cádiz",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipucadiz.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0003",
    "slug": "diputacion-cordoba",
    "nombre_completo": "Diputación Provincial de Córdoba",
    "alias": "Diputación de Córdoba",
    "cargo_actual": "Diputación Provincial · 75 municipios cordobeses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución de gobierno provincial de Córdoba. 27 diputados. Presidida por Salvador Fuentes (PP) tras alternancia 2023.",
    "tags": [
      "diputacion-provincial",
      "ccaa:andalucia",
      "provincia:cordoba"
    ],
    "fuente_principal": "https://www.dipucordoba.es",
    "apartados": [
      {
        "id": "dip-0003-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0003-ap-00-it-00",
            "apartado_id": "dip-0003-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 75 municipios. Sede Palacio de la Merced.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0003-ap-00-it-01",
            "apartado_id": "dip-0003-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Salvador Fuentes Lopera (PP). Sustituyó a Antonio Ruiz (PSOE) en julio 2023.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0003-ap-00-it-02",
            "apartado_id": "dip-0003-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0003-ap-00-it-03",
            "apartado_id": "dip-0003-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0003-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0003-ap-01-it-00",
            "apartado_id": "dip-0003-ap-01",
            "tipo": "evento",
            "titulo": "Cambio 2023",
            "contenido": "PP retoma la diputación tras 8 años de PSOE.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0003-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0003-ap-02-it-00",
            "apartado_id": "dip-0003-ap-02",
            "tipo": "contacto",
            "titulo": "Junta de Andalucía",
            "contenido": "**Coordinación con Moreno Bonilla** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junta-andalucia",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0003-ap-02-it-01",
            "apartado_id": "dip-0003-ap-02",
            "tipo": "contacto",
            "titulo": "Diputación e Inditex",
            "contenido": "**Convenios con grandes empleadores y patronal Confecórdoba** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "empresa",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0003-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0003-ap-03-it-00",
            "apartado_id": "dip-0003-ap-03",
            "tipo": "documento",
            "titulo": "Diputación de Córdoba",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipucordoba.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0004",
    "slug": "diputacion-granada",
    "nombre_completo": "Diputación Provincial de Granada",
    "alias": "Diputación de Granada",
    "cargo_actual": "Diputación Provincial · 174 municipios granadinos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Granada. 27 diputados. Mayor número de municipios de Andalucía. Presidida por Francisco Rodríguez (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:andalucia",
      "provincia:granada"
    ],
    "fuente_principal": "https://www.dipgra.es",
    "apartados": [
      {
        "id": "dip-0004-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0004-ap-00-it-00",
            "apartado_id": "dip-0004-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados provinciales. 174 municipios (mayor de Andalucía). Sede Palacio Provincial Granada.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0004-ap-00-it-01",
            "apartado_id": "dip-0004-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Francisco Rodríguez Fernández (PP).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "dip-0004-ap-00-it-02",
            "apartado_id": "dip-0004-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0004-ap-00-it-03",
            "apartado_id": "dip-0004-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0004-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0004-ap-01-it-00",
            "apartado_id": "dip-0004-ap-01",
            "tipo": "contacto",
            "titulo": "Junta de Andalucía",
            "contenido": "**Coordinación con Moreno Bonilla** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junta-andalucia",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0004-ap-01-it-01",
            "apartado_id": "dip-0004-ap-01",
            "tipo": "contacto",
            "titulo": "Universidad de Granada",
            "contenido": "**Convenios institucionales con UGR** (nota +3/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ugr",
              "nota-+3",
              "neutral"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0004-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0004-ap-02-it-00",
            "apartado_id": "dip-0004-ap-02",
            "tipo": "documento",
            "titulo": "Diputación de Granada",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipgra.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0005",
    "slug": "diputacion-huelva",
    "nombre_completo": "Diputación Provincial de Huelva",
    "alias": "Diputación de Huelva",
    "cargo_actual": "Diputación Provincial · 80 municipios onubenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Huelva. 25 diputados. Presidencia en alternancia tras 2023.",
    "tags": [
      "diputacion-provincial",
      "ccaa:andalucia",
      "provincia:huelva"
    ],
    "fuente_principal": "https://www.diphuelva.es",
    "apartados": [
      {
        "id": "dip-0005-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0005-ap-00-it-00",
            "apartado_id": "dip-0005-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 80 municipios. Sede Huelva capital.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0005-ap-00-it-01",
            "apartado_id": "dip-0005-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "David Toscano (PP) tras alternancia 2023. Anterior: María Eugenia Limón (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0005-ap-00-it-02",
            "apartado_id": "dip-0005-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0005-ap-00-it-03",
            "apartado_id": "dip-0005-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0005-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0005-ap-01-it-00",
            "apartado_id": "dip-0005-ap-01",
            "tipo": "contacto",
            "titulo": "Junta de Andalucía",
            "contenido": "**Coordinación con Moreno Bonilla** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junta-andalucia",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0005-ap-01-it-01",
            "apartado_id": "dip-0005-ap-01",
            "tipo": "contacto",
            "titulo": "Sector pesquero y fresa",
            "contenido": "**Vínculos con cooperativas de la fresa y pesca de Huelva**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sector",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0005-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0005-ap-02-it-00",
            "apartado_id": "dip-0005-ap-02",
            "tipo": "documento",
            "titulo": "Diputación de Huelva",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diphuelva.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0006",
    "slug": "diputacion-jaen",
    "nombre_completo": "Diputación Provincial de Jaén",
    "alias": "Diputación de Jaén",
    "cargo_actual": "Diputación Provincial · 97 municipios giennenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Jaén. 27 diputados. Una de las pocas diputaciones andaluzas mantenida por PSOE en 2023. Presidente: Francisco Reyes (PSOE).",
    "tags": [
      "diputacion-provincial",
      "ccaa:andalucia",
      "provincia:jaen"
    ],
    "fuente_principal": "https://www.dipujaen.es",
    "apartados": [
      {
        "id": "dip-0006-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0006-ap-00-it-00",
            "apartado_id": "dip-0006-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 97 municipios. Sede Jaén capital.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0006-ap-00-it-01",
            "apartado_id": "dip-0006-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Francisco Reyes Martínez (PSOE). Presidente desde 2015, renovado 2019 y 2023.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "francisco-reyes"
            ],
            "orden": 1
          },
          {
            "id": "dip-0006-ap-00-it-02",
            "apartado_id": "dip-0006-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0006-ap-00-it-03",
            "apartado_id": "dip-0006-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0006-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0006-ap-01-it-00",
            "apartado_id": "dip-0006-ap-01",
            "tipo": "evento",
            "titulo": "Resistencia PSOE",
            "contenido": "Jaén y Sevilla resistieron la ola PP 2023 en Andalucía. Reyes referente PSOE provincial.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0006-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0006-ap-02-it-00",
            "apartado_id": "dip-0006-ap-02",
            "tipo": "dato",
            "titulo": "Olivar / Aceite",
            "contenido": "Lobby permanente del olivar y aceite de oliva. Jaén capital mundial del aceite.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "olivar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0006-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0006-ap-03-it-00",
            "apartado_id": "dip-0006-ap-03",
            "tipo": "contacto",
            "titulo": "PSOE Andalucía",
            "contenido": "**Vínculo con la federación regional del PSOE-A**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-a",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0006-ap-03-it-01",
            "apartado_id": "dip-0006-ap-03",
            "tipo": "contacto",
            "titulo": "Junta de Andalucía (oposición)",
            "contenido": "**Coordinación de oposición con la Junta del PP** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0006-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0006-ap-04-it-00",
            "apartado_id": "dip-0006-ap-04",
            "tipo": "documento",
            "titulo": "Diputación de Jaén",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipujaen.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0007",
    "slug": "diputacion-malaga",
    "nombre_completo": "Diputación Provincial de Málaga",
    "alias": "Diputación de Málaga",
    "cargo_actual": "Diputación Provincial · 103 municipios malagueños",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Málaga. 31 diputados. Presidida por Francisco Salado (PP) desde 2019, renovada 2023.",
    "tags": [
      "diputacion-provincial",
      "ccaa:andalucia",
      "provincia:malaga"
    ],
    "fuente_principal": "https://www.malaga.es",
    "apartados": [
      {
        "id": "dip-0007-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0007-ap-00-it-00",
            "apartado_id": "dip-0007-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "31 diputados. 103 municipios. Sede Centro Cívico (Málaga).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0007-ap-00-it-01",
            "apartado_id": "dip-0007-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Francisco Salado Escaño (PP). Antes alcalde de Rincón de la Victoria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "salado"
            ],
            "orden": 1
          },
          {
            "id": "dip-0007-ap-00-it-02",
            "apartado_id": "dip-0007-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0007-ap-00-it-03",
            "apartado_id": "dip-0007-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0007-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0007-ap-01-it-00",
            "apartado_id": "dip-0007-ap-01",
            "tipo": "dato",
            "titulo": "Turismo y tecnología",
            "contenido": "Eje turístico Costa del Sol + polo tecnológico (PTA Andalucía, Málaga Tech).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "turismo",
              "tech"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0007-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0007-ap-02-it-00",
            "apartado_id": "dip-0007-ap-02",
            "tipo": "contacto",
            "titulo": "Junta de Andalucía",
            "contenido": "**Coordinación con Moreno Bonilla, alineamiento PP** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junta-andalucia",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0007-ap-02-it-01",
            "apartado_id": "dip-0007-ap-02",
            "tipo": "contacto",
            "titulo": "Ayuntamiento Málaga (De la Torre PP)",
            "contenido": "**Coordinación con Francisco de la Torre (alcalde Málaga capital)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "delatorre",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0007-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0007-ap-03-it-00",
            "apartado_id": "dip-0007-ap-03",
            "tipo": "documento",
            "titulo": "Diputación de Málaga",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.malaga.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0008",
    "slug": "diputacion-sevilla",
    "nombre_completo": "Diputación Provincial de Sevilla",
    "alias": "Diputación de Sevilla",
    "cargo_actual": "Diputación Provincial · 105 municipios sevillanos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Sevilla. 31 diputados. Presidida por Javier Fernández (PSOE) tras 2023, resistiendo la ola PP.",
    "tags": [
      "diputacion-provincial",
      "ccaa:andalucia",
      "provincia:sevilla"
    ],
    "fuente_principal": "https://www.dipusevilla.es",
    "apartados": [
      {
        "id": "dip-0008-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0008-ap-00-it-00",
            "apartado_id": "dip-0008-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "31 diputados. 105 municipios. Sede Casa de la Provincia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0008-ap-00-it-01",
            "apartado_id": "dip-0008-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Javier Fernández de los Ríos Torres (PSOE). Anterior: Fernando Rodríguez Villalobos (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "javier-fernandez"
            ],
            "orden": 1
          },
          {
            "id": "dip-0008-ap-00-it-02",
            "apartado_id": "dip-0008-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0008-ap-00-it-03",
            "apartado_id": "dip-0008-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0008-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0008-ap-01-it-00",
            "apartado_id": "dip-0008-ap-01",
            "tipo": "evento",
            "titulo": "PSOE retiene Sevilla",
            "contenido": "",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0008-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0008-ap-02-it-00",
            "apartado_id": "dip-0008-ap-02",
            "tipo": "contacto",
            "titulo": "PSOE Sevilla",
            "contenido": "**Vínculo histórico fuerte** — Sevilla bastión PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-sevilla",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0008-ap-02-it-01",
            "apartado_id": "dip-0008-ap-02",
            "tipo": "contacto",
            "titulo": "Ayuntamiento Sevilla (Sanz PP)",
            "contenido": "**Coordinación complicada con José Luis Sanz (PP, alcalde Sevilla capital)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanz",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0008-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0008-ap-03-it-00",
            "apartado_id": "dip-0008-ap-03",
            "tipo": "documento",
            "titulo": "Diputación de Sevilla",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipusevilla.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0009",
    "slug": "diputacion-huesca",
    "nombre_completo": "Diputación Provincial de Huesca",
    "alias": "Diputación de Huesca",
    "cargo_actual": "Diputación Provincial · 202 municipios oscenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Huesca. 25 diputados. Mayor número de municipios pequeños de Aragón. Presidida por Isaac Claver (PP) tras 2023.",
    "tags": [
      "diputacion-provincial",
      "ccaa:aragon",
      "provincia:huesca"
    ],
    "fuente_principal": "https://www.dphuesca.es",
    "apartados": [
      {
        "id": "dip-0009-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0009-ap-00-it-00",
            "apartado_id": "dip-0009-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 202 municipios (la mayoría pequeños del Pirineo y Somontano).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0009-ap-00-it-01",
            "apartado_id": "dip-0009-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Isaac Claver Ortigosa (PP). Antes Miguel Gracia (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0009-ap-00-it-02",
            "apartado_id": "dip-0009-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0009-ap-00-it-03",
            "apartado_id": "dip-0009-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0009-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0009-ap-01-it-00",
            "apartado_id": "dip-0009-ap-01",
            "tipo": "contacto",
            "titulo": "Gobierno Aragón",
            "contenido": "**Coordinación con Jorge Azcón (PP, presidente de Aragón)** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "azcon",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0009-ap-01-it-01",
            "apartado_id": "dip-0009-ap-01",
            "tipo": "contacto",
            "titulo": "Pirineos / despoblación",
            "contenido": "**Foco en despoblación rural pirenaica**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "despoblacion",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0009-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0009-ap-02-it-00",
            "apartado_id": "dip-0009-ap-02",
            "tipo": "documento",
            "titulo": "DPHuesca",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dphuesca.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0010",
    "slug": "diputacion-teruel",
    "nombre_completo": "Diputación Provincial de Teruel",
    "alias": "Diputación de Teruel",
    "cargo_actual": "Diputación Provincial · 236 municipios turolenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Teruel. 25 diputados. Provincia paradigma de despoblación. Presidida por Joaquín Juste (PP) tras 2023.",
    "tags": [
      "diputacion-provincial",
      "ccaa:aragon",
      "provincia:teruel"
    ],
    "fuente_principal": "https://www.dpteruel.es",
    "apartados": [
      {
        "id": "dip-0010-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0010-ap-00-it-00",
            "apartado_id": "dip-0010-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 236 municipios. Provincia menos poblada de España continental.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0010-ap-00-it-01",
            "apartado_id": "dip-0010-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Joaquín Juste Sanz (PP). Antes Manuel Rando (PSOE 2019-2023).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0010-ap-00-it-02",
            "apartado_id": "dip-0010-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0010-ap-00-it-03",
            "apartado_id": "dip-0010-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0010-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0010-ap-01-it-00",
            "apartado_id": "dip-0010-ap-01",
            "tipo": "dato",
            "titulo": "Teruel Existe",
            "contenido": "Contexto político marcado por Teruel Existe (España Vaciada). Diputación frente al partido provincial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "teruel-existe"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0010-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0010-ap-02-it-00",
            "apartado_id": "dip-0010-ap-02",
            "tipo": "contacto",
            "titulo": "Teruel Existe",
            "contenido": "**Tomás Guitarte y la plataforma** (nota -7/10) — Tensión en el Congreso por compromisos con Teruel.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "teruel-existe",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0010-ap-02-it-01",
            "apartado_id": "dip-0010-ap-02",
            "tipo": "contacto",
            "titulo": "Gobierno Aragón",
            "contenido": "**Coordinación con Azcón** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "azcon",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0010-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0010-ap-03-it-00",
            "apartado_id": "dip-0010-ap-03",
            "tipo": "documento",
            "titulo": "DPTeruel",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dpteruel.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0011",
    "slug": "diputacion-zaragoza",
    "nombre_completo": "Diputación Provincial de Zaragoza",
    "alias": "Diputación de Zaragoza",
    "cargo_actual": "Diputación Provincial · 293 municipios zaragozanos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Zaragoza. 27 diputados. Mayor presupuesto de las tres aragonesas. Presidida por Juan Antonio Sánchez Quero (PSOE).",
    "tags": [
      "diputacion-provincial",
      "ccaa:aragon",
      "provincia:zaragoza"
    ],
    "fuente_principal": "https://www.dpz.es",
    "apartados": [
      {
        "id": "dip-0011-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0011-ap-00-it-00",
            "apartado_id": "dip-0011-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 293 municipios. Sede Palacio Provincial Zaragoza.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0011-ap-00-it-01",
            "apartado_id": "dip-0011-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Juan Antonio Sánchez Quero (PSOE). Presidente desde 2015, renovado 2019 y 2023 con apoyos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "sanchez-quero"
            ],
            "orden": 1
          },
          {
            "id": "dip-0011-ap-00-it-02",
            "apartado_id": "dip-0011-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0011-ap-00-it-03",
            "apartado_id": "dip-0011-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0011-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0011-ap-01-it-00",
            "apartado_id": "dip-0011-ap-01",
            "tipo": "evento",
            "titulo": "PSOE retiene Zaragoza",
            "contenido": "Una de las pocas diputaciones aragonesas mantenidas PSOE en 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0011-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0011-ap-02-it-00",
            "apartado_id": "dip-0011-ap-02",
            "tipo": "contacto",
            "titulo": "Gobierno Aragón (oposición)",
            "contenido": "**Coordinación con la oposición PSOE en Aragón** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0011-ap-02-it-01",
            "apartado_id": "dip-0011-ap-02",
            "tipo": "contacto",
            "titulo": "Ayuntamiento Zaragoza (Chueca PP)",
            "contenido": "**Coordinación con Natalia Chueca (PP)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "chueca",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0011-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0011-ap-03-it-00",
            "apartado_id": "dip-0011-ap-03",
            "tipo": "documento",
            "titulo": "DPZ",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dpz.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0012",
    "slug": "diputacion-avila",
    "nombre_completo": "Diputación Provincial de Ávila",
    "alias": "Diputación de Ávila",
    "cargo_actual": "Diputación Provincial · 247 municipios abulenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Ávila. 25 diputados. Hegemonía PP histórica. Presidida por Carlos García González (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:avila"
    ],
    "fuente_principal": "https://www.diputacionavila.es",
    "apartados": [
      {
        "id": "dip-0012-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0012-ap-00-it-00",
            "apartado_id": "dip-0012-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 247 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0012-ap-00-it-01",
            "apartado_id": "dip-0012-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Carlos García González (PP).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0012-ap-00-it-02",
            "apartado_id": "dip-0012-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0012-ap-00-it-03",
            "apartado_id": "dip-0012-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0012-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0012-ap-01-it-00",
            "apartado_id": "dip-0012-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CyL",
            "contenido": "**Coordinación con Mañueco (PP)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0012-ap-01-it-01",
            "apartado_id": "dip-0012-ap-01",
            "tipo": "contacto",
            "titulo": "Por Ávila",
            "contenido": "**Partido provincial regionalista presente en la institución**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "por-avila",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0012-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0012-ap-02-it-00",
            "apartado_id": "dip-0012-ap-02",
            "tipo": "documento",
            "titulo": "Diputación de Ávila",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputacionavila.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0013",
    "slug": "diputacion-burgos",
    "nombre_completo": "Diputación Provincial de Burgos",
    "alias": "Diputación de Burgos",
    "cargo_actual": "Diputación Provincial · 371 municipios burgaleses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Burgos. 25 diputados. Mayor número de municipios en CyL. Presidida por Borja Suárez (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:burgos"
    ],
    "fuente_principal": "https://www.diputaciondeburgos.es",
    "apartados": [
      {
        "id": "dip-0013-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0013-ap-00-it-00",
            "apartado_id": "dip-0013-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 371 municipios. Sede Palacio Provincial Burgos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0013-ap-00-it-01",
            "apartado_id": "dip-0013-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Borja Suárez (PP). Antes Ángel Ibáñez Hernando (PP) que pasó al Gobierno autonómico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0013-ap-00-it-02",
            "apartado_id": "dip-0013-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0013-ap-00-it-03",
            "apartado_id": "dip-0013-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0013-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0013-ap-01-it-00",
            "apartado_id": "dip-0013-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CyL",
            "contenido": "**Coordinación con Mañueco** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0013-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0013-ap-02-it-00",
            "apartado_id": "dip-0013-ap-02",
            "tipo": "documento",
            "titulo": "Diputación de Burgos",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciondeburgos.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0014",
    "slug": "diputacion-leon",
    "nombre_completo": "Diputación Provincial de León",
    "alias": "Diputación de León",
    "cargo_actual": "Diputación Provincial · 210 municipios leoneses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de León. 25 diputados. Provincia con fuerte leonesismo (UPL). Presidencia PSOE: Eduardo Morán o Gerardo Álvarez Courel.",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:leon"
    ],
    "fuente_principal": "https://www.dipuleon.es",
    "apartados": [
      {
        "id": "dip-0014-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0014-ap-00-it-00",
            "apartado_id": "dip-0014-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 210 municipios. Sede Palacio de los Guzmanes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0014-ap-00-it-01",
            "apartado_id": "dip-0014-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Eduardo Morán (PSOE), pacto con UPL. Anterior: Gerardo Álvarez Courel (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "upl"
            ],
            "orden": 1
          },
          {
            "id": "dip-0014-ap-00-it-02",
            "apartado_id": "dip-0014-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0014-ap-00-it-03",
            "apartado_id": "dip-0014-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0014-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0014-ap-01-it-00",
            "apartado_id": "dip-0014-ap-01",
            "tipo": "contacto",
            "titulo": "UPL (Unión del Pueblo Leonés)",
            "contenido": "**Partido regionalista que pesa en la institución**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "upl",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0014-ap-01-it-01",
            "apartado_id": "dip-0014-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CyL (oposición)",
            "contenido": "**Oposición a la Junta del PP-Vox** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0014-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0014-ap-02-it-00",
            "apartado_id": "dip-0014-ap-02",
            "tipo": "documento",
            "titulo": "DipuLeón",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipuleon.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0015",
    "slug": "diputacion-palencia",
    "nombre_completo": "Diputación Provincial de Palencia",
    "alias": "Diputación de Palencia",
    "cargo_actual": "Diputación Provincial · 191 municipios palentinos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Palencia. 25 diputados. Presidida por Ángeles Armisén (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:palencia"
    ],
    "fuente_principal": "https://www.diputaciondepalencia.es",
    "apartados": [
      {
        "id": "dip-0015-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0015-ap-00-it-00",
            "apartado_id": "dip-0015-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 191 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0015-ap-00-it-01",
            "apartado_id": "dip-0015-ap-00",
            "tipo": "dato",
            "titulo": "Presidenta",
            "contenido": "Ángeles Armisén Pedrejón (PP). Presidenta desde 2015.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0015-ap-00-it-02",
            "apartado_id": "dip-0015-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0015-ap-00-it-03",
            "apartado_id": "dip-0015-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0015-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0015-ap-01-it-00",
            "apartado_id": "dip-0015-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CyL",
            "contenido": "**Coordinación con Mañueco** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0015-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0015-ap-02-it-00",
            "apartado_id": "dip-0015-ap-02",
            "tipo": "documento",
            "titulo": "DipuPalencia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciondepalencia.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0016",
    "slug": "diputacion-salamanca",
    "nombre_completo": "Diputación Provincial de Salamanca",
    "alias": "Diputación de Salamanca",
    "cargo_actual": "Diputación Provincial · 362 municipios salmantinos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Salamanca. 25 diputados. Presidida por Javier Iglesias (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:salamanca"
    ],
    "fuente_principal": "https://www.lasalina.es",
    "apartados": [
      {
        "id": "dip-0016-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0016-ap-00-it-00",
            "apartado_id": "dip-0016-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 362 municipios. Sede Palacio Salina (La Salina).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0016-ap-00-it-01",
            "apartado_id": "dip-0016-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Javier Iglesias García (PP).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0016-ap-00-it-02",
            "apartado_id": "dip-0016-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0016-ap-00-it-03",
            "apartado_id": "dip-0016-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0016-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0016-ap-01-it-00",
            "apartado_id": "dip-0016-ap-01",
            "tipo": "contacto",
            "titulo": "USAL",
            "contenido": "**Convenios con Universidad de Salamanca (USAL)** (nota +3/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "usal",
              "nota-+3",
              "neutral"
            ],
            "orden": 0
          },
          {
            "id": "dip-0016-ap-01-it-01",
            "apartado_id": "dip-0016-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CyL",
            "contenido": "**Coordinación con Mañueco** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0016-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0016-ap-02-it-00",
            "apartado_id": "dip-0016-ap-02",
            "tipo": "documento",
            "titulo": "DipuSalamanca",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.lasalina.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0017",
    "slug": "diputacion-segovia",
    "nombre_completo": "Diputación Provincial de Segovia",
    "alias": "Diputación de Segovia",
    "cargo_actual": "Diputación Provincial · 208 municipios segovianos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Segovia. 25 diputados. Presidida por Miguel Ángel de Vicente (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:segovia"
    ],
    "fuente_principal": "https://www.dipsegovia.es",
    "apartados": [
      {
        "id": "dip-0017-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0017-ap-00-it-00",
            "apartado_id": "dip-0017-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 208 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0017-ap-00-it-01",
            "apartado_id": "dip-0017-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Miguel Ángel de Vicente Martín (PP).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0017-ap-00-it-02",
            "apartado_id": "dip-0017-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0017-ap-00-it-03",
            "apartado_id": "dip-0017-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0017-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0017-ap-01-it-00",
            "apartado_id": "dip-0017-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CyL",
            "contenido": "**Coordinación con Mañueco** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0017-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0017-ap-02-it-00",
            "apartado_id": "dip-0017-ap-02",
            "tipo": "documento",
            "titulo": "DipuSegovia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipsegovia.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0018",
    "slug": "diputacion-soria",
    "nombre_completo": "Diputación Provincial de Soria",
    "alias": "Diputación de Soria",
    "cargo_actual": "Diputación Provincial · 183 municipios sorianos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Soria. 25 diputados. Provincia menos poblada CyL. Presencia significativa Soria ¡Ya! (España Vaciada).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:soria"
    ],
    "fuente_principal": "https://www.dipsoria.es",
    "apartados": [
      {
        "id": "dip-0018-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0018-ap-00-it-00",
            "apartado_id": "dip-0018-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 183 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0018-ap-00-it-01",
            "apartado_id": "dip-0018-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Benito Serrano Mata (PP).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0018-ap-00-it-02",
            "apartado_id": "dip-0018-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0018-ap-00-it-03",
            "apartado_id": "dip-0018-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0018-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0018-ap-01-it-00",
            "apartado_id": "dip-0018-ap-01",
            "tipo": "dato",
            "titulo": "España Vaciada",
            "contenido": "Soria ¡Ya! (parte de la España Vaciada) presencia clave.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "espana-vaciada"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0018-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0018-ap-02-it-00",
            "apartado_id": "dip-0018-ap-02",
            "tipo": "contacto",
            "titulo": "Soria ¡Ya! / España Vaciada",
            "contenido": "**Coordinación / oposición con la plataforma** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "soria-ya",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0018-ap-02-it-01",
            "apartado_id": "dip-0018-ap-02",
            "tipo": "contacto",
            "titulo": "Junta CyL",
            "contenido": "**Coordinación con Mañueco** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0018-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0018-ap-03-it-00",
            "apartado_id": "dip-0018-ap-03",
            "tipo": "documento",
            "titulo": "DipuSoria",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipsoria.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0019",
    "slug": "diputacion-valladolid",
    "nombre_completo": "Diputación Provincial de Valladolid",
    "alias": "Diputación de Valladolid",
    "cargo_actual": "Diputación Provincial · 225 municipios vallisoletanos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Valladolid. 27 diputados. Presidida por Conrado Íscar (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:valladolid"
    ],
    "fuente_principal": "https://www.diputaciondevalladolid.es",
    "apartados": [
      {
        "id": "dip-0019-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0019-ap-00-it-00",
            "apartado_id": "dip-0019-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 225 municipios. Capital política Junta CyL.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0019-ap-00-it-01",
            "apartado_id": "dip-0019-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Conrado Íscar Ordóñez (PP).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0019-ap-00-it-02",
            "apartado_id": "dip-0019-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0019-ap-00-it-03",
            "apartado_id": "dip-0019-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0019-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0019-ap-01-it-00",
            "apartado_id": "dip-0019-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CyL",
            "contenido": "**Coordinación directa con Mañueco (Valladolid capital política)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0019-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0019-ap-02-it-00",
            "apartado_id": "dip-0019-ap-02",
            "tipo": "documento",
            "titulo": "DipuValladolid",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciondevalladolid.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0020",
    "slug": "diputacion-zamora",
    "nombre_completo": "Diputación Provincial de Zamora",
    "alias": "Diputación de Zamora",
    "cargo_actual": "Diputación Provincial · 248 municipios zamoranos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Zamora. 25 diputados. Provincia con fuerte despoblación. Presidida por Javier Faúndez (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cyl",
      "provincia:zamora"
    ],
    "fuente_principal": "https://www.diputaciondezamora.es",
    "apartados": [
      {
        "id": "dip-0020-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0020-ap-00-it-00",
            "apartado_id": "dip-0020-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 248 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0020-ap-00-it-01",
            "apartado_id": "dip-0020-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Javier Faúndez Domínguez (PP). Antes Francisco Requejo (Por Ávila/Zamora, regionalista).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0020-ap-00-it-02",
            "apartado_id": "dip-0020-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0020-ap-00-it-03",
            "apartado_id": "dip-0020-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0020-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0020-ap-01-it-00",
            "apartado_id": "dip-0020-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CyL",
            "contenido": "**Coordinación con Mañueco** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0020-ap-01-it-01",
            "apartado_id": "dip-0020-ap-01",
            "tipo": "contacto",
            "titulo": "Zamora ¡Ya! / España Vaciada",
            "contenido": "**Plataforma regionalista presente**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "espana-vaciada",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0020-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0020-ap-02-it-00",
            "apartado_id": "dip-0020-ap-02",
            "tipo": "documento",
            "titulo": "DipuZamora",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciondezamora.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0021",
    "slug": "diputacion-albacete",
    "nombre_completo": "Diputación Provincial de Albacete",
    "alias": "Diputación de Albacete",
    "cargo_actual": "Diputación Provincial · 87 municipios albaceteños",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Albacete. 25 diputados. Presidida por Santi Cabañero (PSOE), apoyo del PSOE-CLM (Page).",
    "tags": [
      "diputacion-provincial",
      "ccaa:clm",
      "provincia:albacete"
    ],
    "fuente_principal": "https://www.dipualba.es",
    "apartados": [
      {
        "id": "dip-0021-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0021-ap-00-it-00",
            "apartado_id": "dip-0021-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 87 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0021-ap-00-it-01",
            "apartado_id": "dip-0021-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Santi Cabañero Masip (PSOE). Presidente desde 2019, renovado 2023.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "cabanero"
            ],
            "orden": 1
          },
          {
            "id": "dip-0021-ap-00-it-02",
            "apartado_id": "dip-0021-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0021-ap-00-it-03",
            "apartado_id": "dip-0021-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0021-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0021-ap-01-it-00",
            "apartado_id": "dip-0021-ap-01",
            "tipo": "contacto",
            "titulo": "Emiliano García-Page",
            "contenido": "**Aliado del presidente CLM (PSOE)** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "page",
              "psoe",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0021-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0021-ap-02-it-00",
            "apartado_id": "dip-0021-ap-02",
            "tipo": "documento",
            "titulo": "DipuAlba",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipualba.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0022",
    "slug": "diputacion-ciudad-real",
    "nombre_completo": "Diputación Provincial de Ciudad Real",
    "alias": "Diputación de Ciudad Real",
    "cargo_actual": "Diputación Provincial · 102 municipios manchegos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Ciudad Real. 27 diputados. Cambio a PP en 2023.",
    "tags": [
      "diputacion-provincial",
      "ccaa:clm",
      "provincia:ciudad-real"
    ],
    "fuente_principal": "https://www.dipucr.es",
    "apartados": [
      {
        "id": "dip-0022-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0022-ap-00-it-00",
            "apartado_id": "dip-0022-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 102 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0022-ap-00-it-01",
            "apartado_id": "dip-0022-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Miguel Ángel Valverde Menchero (PP). Anterior: José Manuel Caballero (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0022-ap-00-it-02",
            "apartado_id": "dip-0022-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0022-ap-00-it-03",
            "apartado_id": "dip-0022-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0022-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0022-ap-01-it-00",
            "apartado_id": "dip-0022-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CLM (Page)",
            "contenido": "**Oposición con la Junta del PSOE** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "page",
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0022-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0022-ap-02-it-00",
            "apartado_id": "dip-0022-ap-02",
            "tipo": "documento",
            "titulo": "DipuCR",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipucr.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0023",
    "slug": "diputacion-cuenca",
    "nombre_completo": "Diputación Provincial de Cuenca",
    "alias": "Diputación de Cuenca",
    "cargo_actual": "Diputación Provincial · 238 municipios conquenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Cuenca. 25 diputados. Provincia con fuerte despoblación. Presidida por Álvaro Martínez Chana (PSOE).",
    "tags": [
      "diputacion-provincial",
      "ccaa:clm",
      "provincia:cuenca"
    ],
    "fuente_principal": "https://www.dipucuenca.es",
    "apartados": [
      {
        "id": "dip-0023-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0023-ap-00-it-00",
            "apartado_id": "dip-0023-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 238 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0023-ap-00-it-01",
            "apartado_id": "dip-0023-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Álvaro Martínez Chana (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe"
            ],
            "orden": 1
          },
          {
            "id": "dip-0023-ap-00-it-02",
            "apartado_id": "dip-0023-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0023-ap-00-it-03",
            "apartado_id": "dip-0023-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0023-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0023-ap-01-it-00",
            "apartado_id": "dip-0023-ap-01",
            "tipo": "contacto",
            "titulo": "Page / PSOE-CLM",
            "contenido": "**Aliado del presidente regional** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "page",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0023-ap-01-it-01",
            "apartado_id": "dip-0023-ap-01",
            "tipo": "contacto",
            "titulo": "Cuenca Ahora / España Vaciada",
            "contenido": "**Plataforma España Vaciada relevante en la provincia**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "espana-vaciada",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0023-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0023-ap-02-it-00",
            "apartado_id": "dip-0023-ap-02",
            "tipo": "documento",
            "titulo": "DipuCuenca",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipucuenca.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0024",
    "slug": "diputacion-guadalajara",
    "nombre_completo": "Diputación Provincial de Guadalajara",
    "alias": "Diputación de Guadalajara",
    "cargo_actual": "Diputación Provincial · 288 municipios alcarreños",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Guadalajara. 25 diputados. Presidida por José Luis Vega (PSOE).",
    "tags": [
      "diputacion-provincial",
      "ccaa:clm",
      "provincia:guadalajara"
    ],
    "fuente_principal": "https://www.dguadalajara.es",
    "apartados": [
      {
        "id": "dip-0024-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0024-ap-00-it-00",
            "apartado_id": "dip-0024-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 288 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0024-ap-00-it-01",
            "apartado_id": "dip-0024-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "José Luis Vega Pérez (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe"
            ],
            "orden": 1
          },
          {
            "id": "dip-0024-ap-00-it-02",
            "apartado_id": "dip-0024-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0024-ap-00-it-03",
            "apartado_id": "dip-0024-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0024-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0024-ap-01-it-00",
            "apartado_id": "dip-0024-ap-01",
            "tipo": "contacto",
            "titulo": "Page / PSOE-CLM",
            "contenido": "**Aliado del presidente regional** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "page",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0024-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0024-ap-02-it-00",
            "apartado_id": "dip-0024-ap-02",
            "tipo": "documento",
            "titulo": "DipuGuada",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dguadalajara.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0025",
    "slug": "diputacion-toledo",
    "nombre_completo": "Diputación Provincial de Toledo",
    "alias": "Diputación de Toledo",
    "cargo_actual": "Diputación Provincial · 204 municipios toledanos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Toledo. 25 diputados. Alternancia a PP en 2023. Presidenta: Concepción Cedillo (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:clm",
      "provincia:toledo"
    ],
    "fuente_principal": "https://www.diputoledo.es",
    "apartados": [
      {
        "id": "dip-0025-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0025-ap-00-it-00",
            "apartado_id": "dip-0025-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 204 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0025-ap-00-it-01",
            "apartado_id": "dip-0025-ap-00",
            "tipo": "dato",
            "titulo": "Presidenta",
            "contenido": "Concepción Cedillo Valverde (PP). Anterior: Álvaro Gutiérrez Prieto (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0025-ap-00-it-02",
            "apartado_id": "dip-0025-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0025-ap-00-it-03",
            "apartado_id": "dip-0025-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0025-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0025-ap-01-it-00",
            "apartado_id": "dip-0025-ap-01",
            "tipo": "contacto",
            "titulo": "Junta CLM (Page) - oposición",
            "contenido": "**PP en provincia, PSOE en Junta** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "page",
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0025-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0025-ap-02-it-00",
            "apartado_id": "dip-0025-ap-02",
            "tipo": "documento",
            "titulo": "DipuToledo",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputoledo.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0026",
    "slug": "diputacio-barcelona",
    "nombre_completo": "Diputació de Barcelona",
    "alias": "Diputació de Barcelona",
    "cargo_actual": "Diputació Provincial · 311 municipis barcelonins",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputació de Barcelona. 51 diputados, el mayor de España. Sede Edifici del Rellotge (Barcelona). Presidida por Lluïsa Moret (PSC), en alianza con ERC.",
    "tags": [
      "diputacion-provincial",
      "ccaa:cataluna",
      "provincia:barcelona"
    ],
    "fuente_principal": "https://www.diba.cat",
    "apartados": [
      {
        "id": "dip-0026-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0026-ap-00-it-00",
            "apartado_id": "dip-0026-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "51 diputados (la mayor de España). 311 municipios. Presupuesto ~1.300 M€.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0026-ap-00-it-01",
            "apartado_id": "dip-0026-ap-00",
            "tipo": "dato",
            "titulo": "Presidenta",
            "contenido": "Lluïsa Moret i Sabidó (PSC), alcaldesa de Sant Boi de Llobregat. Anterior: Lluís Soler / Núria Marín.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psc",
              "moret"
            ],
            "orden": 1
          },
          {
            "id": "dip-0026-ap-00-it-02",
            "apartado_id": "dip-0026-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0026-ap-00-it-03",
            "apartado_id": "dip-0026-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0026-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0026-ap-01-it-00",
            "apartado_id": "dip-0026-ap-01",
            "tipo": "evento",
            "titulo": "Alianza PSC-ERC",
            "contenido": "Pacto PSC con ERC tras municipales 2023. PSC presidencia.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0026-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0026-ap-02-it-00",
            "apartado_id": "dip-0026-ap-02",
            "tipo": "dato",
            "titulo": "Modelo Diba",
            "contenido": "Diputación con mayor capacidad económica y servicios técnicos a municipios; modelo de referencia europeo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "modelo-diba"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0026-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0026-ap-03-it-00",
            "apartado_id": "dip-0026-ap-03",
            "tipo": "contacto",
            "titulo": "Generalitat (Illa PSC)",
            "contenido": "**Coordinación con Generalitat (Salvador Illa, PSC) desde agosto 2024** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "generalitat",
              "illa",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0026-ap-03-it-01",
            "apartado_id": "dip-0026-ap-03",
            "tipo": "contacto",
            "titulo": "Ajuntament Barcelona (Collboni PSC)",
            "contenido": "**Coordinación con Jaume Collboni (PSC, alcalde Barcelona)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "collboni",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          },
          {
            "id": "dip-0026-ap-03-it-02",
            "apartado_id": "dip-0026-ap-03",
            "tipo": "contacto",
            "titulo": "ERC",
            "contenido": "**Socio principal en la diputación** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0026-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0026-ap-04-it-00",
            "apartado_id": "dip-0026-ap-04",
            "tipo": "documento",
            "titulo": "Diba",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diba.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0027",
    "slug": "diputacio-girona",
    "nombre_completo": "Diputació de Girona",
    "alias": "Diputació de Girona",
    "cargo_actual": "Diputació Provincial · 221 municipis gironins",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputació de Girona. 27 diputados. Bastión histórico de Junts (antes CiU). Presidida por Miquel Noguer (Junts).",
    "tags": [
      "diputacion-provincial",
      "ccaa:cataluna",
      "provincia:girona"
    ],
    "fuente_principal": "https://www.ddgi.cat",
    "apartados": [
      {
        "id": "dip-0027-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0027-ap-00-it-00",
            "apartado_id": "dip-0027-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 221 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0027-ap-00-it-01",
            "apartado_id": "dip-0027-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Miquel Noguer Planas (Junts). Alcalde de Banyoles. Presidente desde 2019.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junts",
              "noguer"
            ],
            "orden": 1
          },
          {
            "id": "dip-0027-ap-00-it-02",
            "apartado_id": "dip-0027-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0027-ap-00-it-03",
            "apartado_id": "dip-0027-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0027-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0027-ap-01-it-00",
            "apartado_id": "dip-0027-ap-01",
            "tipo": "contacto",
            "titulo": "Junts",
            "contenido": "**Bastión histórico de Junts/CDC en Cataluña**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junts",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0027-ap-01-it-01",
            "apartado_id": "dip-0027-ap-01",
            "tipo": "contacto",
            "titulo": "Generalitat (Illa)",
            "contenido": "**Coordinación con Illa, aunque oposición política** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "illa",
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0027-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0027-ap-02-it-00",
            "apartado_id": "dip-0027-ap-02",
            "tipo": "documento",
            "titulo": "DDGI",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.ddgi.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0028",
    "slug": "diputacio-lleida",
    "nombre_completo": "Diputació de Lleida",
    "alias": "Diputació de Lleida",
    "cargo_actual": "Diputació Provincial · 231 municipis lleidatans",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputació de Lleida. 25 diputados. Mayoría regionalista/ERC históricamente. Presidida por Joan Talarn (ERC) o sucesor.",
    "tags": [
      "diputacion-provincial",
      "ccaa:cataluna",
      "provincia:lleida"
    ],
    "fuente_principal": "https://www.diputaciolleida.cat",
    "apartados": [
      {
        "id": "dip-0028-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0028-ap-00-it-00",
            "apartado_id": "dip-0028-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 231 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0028-ap-00-it-01",
            "apartado_id": "dip-0028-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Joan Talarn Gilabert (ERC). Compromiso con la institución provincial leridana.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc"
            ],
            "orden": 1
          },
          {
            "id": "dip-0028-ap-00-it-02",
            "apartado_id": "dip-0028-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0028-ap-00-it-03",
            "apartado_id": "dip-0028-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0028-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0028-ap-01-it-00",
            "apartado_id": "dip-0028-ap-01",
            "tipo": "contacto",
            "titulo": "Generalitat / ERC",
            "contenido": "**Vinculación histórica con la izquierda independentista** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0028-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0028-ap-02-it-00",
            "apartado_id": "dip-0028-ap-02",
            "tipo": "documento",
            "titulo": "DipuLleida",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciolleida.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0029",
    "slug": "diputacio-tarragona",
    "nombre_completo": "Diputació de Tarragona",
    "alias": "Diputació de Tarragona",
    "cargo_actual": "Diputació Provincial · 184 municipis tarragonins",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputació de Tarragona. 27 diputados. Presidida por Noemí Llauradó (ERC) en pacto con el PSC.",
    "tags": [
      "diputacion-provincial",
      "ccaa:cataluna",
      "provincia:tarragona"
    ],
    "fuente_principal": "https://www.dipta.cat",
    "apartados": [
      {
        "id": "dip-0029-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0029-ap-00-it-00",
            "apartado_id": "dip-0029-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 184 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0029-ap-00-it-01",
            "apartado_id": "dip-0029-ap-00",
            "tipo": "dato",
            "titulo": "Presidenta",
            "contenido": "Noemí Llauradó Sans (ERC). Anterior: Pere Granados (PSC) y Josep Poblet (CiU/PDeCAT).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc"
            ],
            "orden": 1
          },
          {
            "id": "dip-0029-ap-00-it-02",
            "apartado_id": "dip-0029-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0029-ap-00-it-03",
            "apartado_id": "dip-0029-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0029-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0029-ap-01-it-00",
            "apartado_id": "dip-0029-ap-01",
            "tipo": "contacto",
            "titulo": "PSC (socio)",
            "contenido": "**Pacto de gobierno PSC-ERC** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psc",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "dip-0029-ap-01-it-01",
            "apartado_id": "dip-0029-ap-01",
            "tipo": "contacto",
            "titulo": "Tarragona Petroquímica",
            "contenido": "**Coordinación con el clúster petroquímico de Tarragona** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "industria",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0029-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0029-ap-02-it-00",
            "apartado_id": "dip-0029-ap-02",
            "tipo": "documento",
            "titulo": "Dipta",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipta.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0030",
    "slug": "diputacio-alacant",
    "nombre_completo": "Diputació d'Alacant",
    "alias": "Diputación de Alicante",
    "cargo_actual": "Diputación Provincial · 141 municipios alicantinos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputación de Alicante. 31 diputados. Presidida por Toni Pérez (PP), también alcalde de Benidorm.",
    "tags": [
      "diputacion-provincial",
      "ccaa:c-valenciana",
      "provincia:alicante"
    ],
    "fuente_principal": "https://www.diputacionalicante.es",
    "apartados": [
      {
        "id": "dip-0030-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0030-ap-00-it-00",
            "apartado_id": "dip-0030-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "31 diputados. 141 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0030-ap-00-it-01",
            "apartado_id": "dip-0030-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Toni Pérez (PP), también alcalde de Benidorm. Doble cargo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp",
              "benidorm"
            ],
            "orden": 1
          },
          {
            "id": "dip-0030-ap-00-it-02",
            "apartado_id": "dip-0030-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0030-ap-00-it-03",
            "apartado_id": "dip-0030-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0030-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0030-ap-01-it-00",
            "apartado_id": "dip-0030-ap-01",
            "tipo": "contacto",
            "titulo": "Generalitat Valenciana (Mazón PP)",
            "contenido": "**Coordinación con Carlos Mazón (PP), president valenciano** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mazon",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0030-ap-01-it-01",
            "apartado_id": "dip-0030-ap-01",
            "tipo": "contacto",
            "titulo": "Turismo Benidorm/Costa Blanca",
            "contenido": "**Doble cargo crea agenda turística reforzada**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "turismo",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0030-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0030-ap-02-it-00",
            "apartado_id": "dip-0030-ap-02",
            "tipo": "documento",
            "titulo": "DipuAlicante",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputacionalicante.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0031",
    "slug": "diputacio-castello",
    "nombre_completo": "Diputació de Castelló",
    "alias": "Diputación de Castellón",
    "cargo_actual": "Diputación Provincial · 135 municipios castellonenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputación de Castellón. 27 diputados. Presidida por Marta Barrachina (PP) tras alternancia 2023.",
    "tags": [
      "diputacion-provincial",
      "ccaa:c-valenciana",
      "provincia:castellon"
    ],
    "fuente_principal": "https://www.dipcas.es",
    "apartados": [
      {
        "id": "dip-0031-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0031-ap-00-it-00",
            "apartado_id": "dip-0031-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 135 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0031-ap-00-it-01",
            "apartado_id": "dip-0031-ap-00",
            "tipo": "dato",
            "titulo": "Presidenta",
            "contenido": "Marta Barrachina Mateu (PP).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0031-ap-00-it-02",
            "apartado_id": "dip-0031-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0031-ap-00-it-03",
            "apartado_id": "dip-0031-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0031-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0031-ap-01-it-00",
            "apartado_id": "dip-0031-ap-01",
            "tipo": "contacto",
            "titulo": "Generalitat Valenciana (Mazón)",
            "contenido": "**Coordinación con Mazón** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mazon",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0031-ap-01-it-01",
            "apartado_id": "dip-0031-ap-01",
            "tipo": "contacto",
            "titulo": "Sector cerámico Castellón",
            "contenido": "**Castellón es polo mundial de cerámica (Vila-real, Onda, Castelló)**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ceramica",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0031-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0031-ap-02-it-00",
            "apartado_id": "dip-0031-ap-02",
            "tipo": "documento",
            "titulo": "DipCas",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipcas.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0032",
    "slug": "diputacio-valencia",
    "nombre_completo": "Diputació de València",
    "alias": "Diputación de Valencia",
    "cargo_actual": "Diputación Provincial · 266 municipios valencianos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputación de Valencia. 31 diputados. Alternancia a PP en 2023. Presidente: Vicent Mompó (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:c-valenciana",
      "provincia:valencia"
    ],
    "fuente_principal": "https://www.dival.es",
    "apartados": [
      {
        "id": "dip-0032-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0032-ap-00-it-00",
            "apartado_id": "dip-0032-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "31 diputados. 266 municipios. Sede Palau de la Generalitat (Valencia, ahora del Govern Mazón).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0032-ap-00-it-01",
            "apartado_id": "dip-0032-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Vicent Mompó Aledo (PP). Antes Toni Gaspar (PSPV).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0032-ap-00-it-02",
            "apartado_id": "dip-0032-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0032-ap-00-it-03",
            "apartado_id": "dip-0032-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0032-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0032-ap-01-it-00",
            "apartado_id": "dip-0032-ap-01",
            "tipo": "evento",
            "titulo": "DANA Valencia 2024",
            "contenido": "DANA octubre 2024 afectó gravemente municipios valencianos. Diputación involucrada en reconstrucción.",
            "fecha": "2024-10-29",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "dana"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0032-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0032-ap-02-it-00",
            "apartado_id": "dip-0032-ap-02",
            "tipo": "contacto",
            "titulo": "Generalitat Valenciana (Mazón)",
            "contenido": "**Coordinación con Carlos Mazón** (nota +7/10) — Crisis post-DANA en 2024-25.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mazon",
              "dana",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0032-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0032-ap-03-it-00",
            "apartado_id": "dip-0032-ap-03",
            "tipo": "documento",
            "titulo": "Dival",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dival.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0033",
    "slug": "diputacion-badajoz",
    "nombre_completo": "Diputación Provincial de Badajoz",
    "alias": "Diputación de Badajoz",
    "cargo_actual": "Diputación Provincial · 165 municipios pacenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Badajoz. 27 diputados. Presidida por Miguel Ángel Gallardo (PSOE), una de las figuras PSOE-Extremadura.",
    "tags": [
      "diputacion-provincial",
      "ccaa:extremadura",
      "provincia:badajoz"
    ],
    "fuente_principal": "https://www.dip-badajoz.es",
    "apartados": [
      {
        "id": "dip-0033-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0033-ap-00-it-00",
            "apartado_id": "dip-0033-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 diputados. 165 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0033-ap-00-it-01",
            "apartado_id": "dip-0033-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Miguel Ángel Gallardo Miranda (PSOE). Aspirante en pasado a la Junta Extremadura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe",
              "gallardo"
            ],
            "orden": 1
          },
          {
            "id": "dip-0033-ap-00-it-02",
            "apartado_id": "dip-0033-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0033-ap-00-it-03",
            "apartado_id": "dip-0033-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0033-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0033-ap-01-it-00",
            "apartado_id": "dip-0033-ap-01",
            "tipo": "contacto",
            "titulo": "Junta Extremadura (Guardiola PP)",
            "contenido": "**Oposición con la Junta del PP-Vox** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "guardiola",
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0033-ap-01-it-01",
            "apartado_id": "dip-0033-ap-01",
            "tipo": "contacto",
            "titulo": "PSOE-Extremadura",
            "contenido": "**Figura de peso interno del partido regional**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-ex",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0033-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0033-ap-02-it-00",
            "apartado_id": "dip-0033-ap-02",
            "tipo": "documento",
            "titulo": "Diputación Badajoz",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dip-badajoz.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0034",
    "slug": "diputacion-caceres",
    "nombre_completo": "Diputación Provincial de Cáceres",
    "alias": "Diputación de Cáceres",
    "cargo_actual": "Diputación Provincial · 223 municipios cacereños",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Institución provincial de Cáceres. 25 diputados. Presidente Carlos Carlos Rodríguez (PSOE).",
    "tags": [
      "diputacion-provincial",
      "ccaa:extremadura",
      "provincia:caceres"
    ],
    "fuente_principal": "https://www.dip-caceres.es",
    "apartados": [
      {
        "id": "dip-0034-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0034-ap-00-it-00",
            "apartado_id": "dip-0034-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 diputados. 223 municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0034-ap-00-it-01",
            "apartado_id": "dip-0034-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Carlos Carlos Rodríguez (PSOE).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe"
            ],
            "orden": 1
          },
          {
            "id": "dip-0034-ap-00-it-02",
            "apartado_id": "dip-0034-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0034-ap-00-it-03",
            "apartado_id": "dip-0034-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0034-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0034-ap-01-it-00",
            "apartado_id": "dip-0034-ap-01",
            "tipo": "contacto",
            "titulo": "Junta Extremadura - oposición",
            "contenido": "**PSOE en oposición provincial al Gobierno regional PP-Vox** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0034-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0034-ap-02-it-00",
            "apartado_id": "dip-0034-ap-02",
            "tipo": "documento",
            "titulo": "Diputación Cáceres",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dip-caceres.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0035",
    "slug": "deputacion-coruna",
    "nombre_completo": "Deputación da Coruña",
    "alias": "Diputación de A Coruña",
    "cargo_actual": "Deputación Provincial · 93 concellos coruñeses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Deputación da Coruña. 31 deputados. Presidida por Valentín González Formoso (PSdeG), excepción al dominio PP en Galicia.",
    "tags": [
      "diputacion-provincial",
      "ccaa:galicia",
      "provincia:coruna"
    ],
    "fuente_principal": "https://www.dacoruna.gal",
    "apartados": [
      {
        "id": "dip-0035-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0035-ap-00-it-00",
            "apartado_id": "dip-0035-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "31 deputados. 93 concellos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0035-ap-00-it-01",
            "apartado_id": "dip-0035-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Valentín González Formoso (PSdeG). Aspirante interno a liderazgo PSdeG.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psdeg",
              "formoso"
            ],
            "orden": 1
          },
          {
            "id": "dip-0035-ap-00-it-02",
            "apartado_id": "dip-0035-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0035-ap-00-it-03",
            "apartado_id": "dip-0035-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0035-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0035-ap-01-it-00",
            "apartado_id": "dip-0035-ap-01",
            "tipo": "contacto",
            "titulo": "Xunta (Rueda PPdeG)",
            "contenido": "**Oposición con la Xunta del PP** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rueda",
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0035-ap-01-it-01",
            "apartado_id": "dip-0035-ap-01",
            "tipo": "contacto",
            "titulo": "BNG",
            "contenido": "**Posibilidad de pactos con BNG** (nota +4/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bng",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0035-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0035-ap-02-it-00",
            "apartado_id": "dip-0035-ap-02",
            "tipo": "documento",
            "titulo": "Deputación Coruña",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dacoruna.gal",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0036",
    "slug": "deputacion-lugo",
    "nombre_completo": "Deputación de Lugo",
    "alias": "Diputación de Lugo",
    "cargo_actual": "Deputación Provincial · 67 concellos lucenses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Deputación de Lugo. 25 deputados. Presidida por José Tomé Roca (PSdeG) en alianza con BNG.",
    "tags": [
      "diputacion-provincial",
      "ccaa:galicia",
      "provincia:lugo"
    ],
    "fuente_principal": "https://www.deputacionlugo.gal",
    "apartados": [
      {
        "id": "dip-0036-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0036-ap-00-it-00",
            "apartado_id": "dip-0036-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 deputados. 67 concellos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0036-ap-00-it-01",
            "apartado_id": "dip-0036-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "José Tomé Roca (PSdeG), alcalde de Monforte de Lemos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psdeg",
              "tome"
            ],
            "orden": 1
          },
          {
            "id": "dip-0036-ap-00-it-02",
            "apartado_id": "dip-0036-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0036-ap-00-it-03",
            "apartado_id": "dip-0036-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0036-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0036-ap-01-it-00",
            "apartado_id": "dip-0036-ap-01",
            "tipo": "contacto",
            "titulo": "BNG",
            "contenido": "**Pacto local con BNG** (nota +4/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bng",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "dip-0036-ap-01-it-01",
            "apartado_id": "dip-0036-ap-01",
            "tipo": "contacto",
            "titulo": "Xunta (Rueda) - oposición",
            "contenido": "**Oposición a la Xunta PP** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0036-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0036-ap-02-it-00",
            "apartado_id": "dip-0036-ap-02",
            "tipo": "documento",
            "titulo": "Deputación Lugo",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.deputacionlugo.gal",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0037",
    "slug": "deputacion-ourense",
    "nombre_completo": "Deputación de Ourense",
    "alias": "Diputación de Ourense",
    "cargo_actual": "Deputación Provincial · 92 concellos ourensanos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Deputación de Ourense. 25 deputados. Larga era Manuel Baltar (PP) hasta 2023. Relevo a Luis Menor (PP) tras tensiones internas.",
    "tags": [
      "diputacion-provincial",
      "ccaa:galicia",
      "provincia:ourense"
    ],
    "fuente_principal": "https://www.depourense.es",
    "apartados": [
      {
        "id": "dip-0037-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0037-ap-00-it-00",
            "apartado_id": "dip-0037-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "25 deputados. 92 concellos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0037-ap-00-it-01",
            "apartado_id": "dip-0037-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Luis Menor Pérez (PP). Sustituye a Manuel Baltar (PP), que presidió 12 años.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0037-ap-00-it-02",
            "apartado_id": "dip-0037-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0037-ap-00-it-03",
            "apartado_id": "dip-0037-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0037-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0037-ap-01-it-00",
            "apartado_id": "dip-0037-ap-01",
            "tipo": "evento",
            "titulo": "Salida Baltar",
            "contenido": "Manuel Baltar Blanco salió en 2023 tras tensiones internas con el PP gallego (Rueda) y polémicas mediáticas.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "baltar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0037-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0037-ap-02-it-00",
            "apartado_id": "dip-0037-ap-02",
            "tipo": "contacto",
            "titulo": "PP Galicia (Rueda)",
            "contenido": "**Alineamiento con la Xunta tras el conflicto Baltar** (nota -8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rueda",
              "nota--8",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0037-ap-02-it-01",
            "apartado_id": "dip-0037-ap-02",
            "tipo": "contacto",
            "titulo": "Manuel Baltar (ex)",
            "contenido": "**Figura controvertida del PPdeG**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "baltar",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0037-ap-03",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "dip-0037-ap-03-it-00",
            "apartado_id": "dip-0037-ap-03",
            "tipo": "evento",
            "titulo": "Era Baltar - polémicas",
            "contenido": "Período Baltar marcado por polémicas mediáticas y conflicto interno en PPdeG.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "baltar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0037-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0037-ap-04-it-00",
            "apartado_id": "dip-0037-ap-04",
            "tipo": "documento",
            "titulo": "Deputación Ourense",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.depourense.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0038",
    "slug": "deputacion-pontevedra",
    "nombre_completo": "Deputación de Pontevedra",
    "alias": "Diputación de Pontevedra",
    "cargo_actual": "Deputación Provincial · 61 concellos pontevedreses",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Deputación de Pontevedra. 27 deputados. Alternancia a PP en 2023. Presidente: Luis López Diéguez (PP).",
    "tags": [
      "diputacion-provincial",
      "ccaa:galicia",
      "provincia:pontevedra"
    ],
    "fuente_principal": "https://www.depo.gal",
    "apartados": [
      {
        "id": "dip-0038-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0038-ap-00-it-00",
            "apartado_id": "dip-0038-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "27 deputados. 61 concellos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0038-ap-00-it-01",
            "apartado_id": "dip-0038-ap-00",
            "tipo": "dato",
            "titulo": "Presidente",
            "contenido": "Luis López Diéguez (PP). Anterior: Carmela Silva (PSdeG 2015-2023).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp"
            ],
            "orden": 1
          },
          {
            "id": "dip-0038-ap-00-it-02",
            "apartado_id": "dip-0038-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0038-ap-00-it-03",
            "apartado_id": "dip-0038-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0038-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0038-ap-01-it-00",
            "apartado_id": "dip-0038-ap-01",
            "tipo": "contacto",
            "titulo": "PP Galicia (Rueda)",
            "contenido": "**Alineamiento Xunta**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rueda",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0038-ap-01-it-01",
            "apartado_id": "dip-0038-ap-01",
            "tipo": "contacto",
            "titulo": "Vigo - Caballero (PSOE alcalde)",
            "contenido": "**Vigo (Abel Caballero PSOE) en tensión con la diputación PP** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "caballero",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0038-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0038-ap-02-it-00",
            "apartado_id": "dip-0038-ap-02",
            "tipo": "documento",
            "titulo": "Deputación Pontevedra",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.depo.gal",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0039",
    "slug": "diputacion-foral-alava",
    "nombre_completo": "Diputación Foral de Álava / Arabako Foru Aldundia",
    "alias": "Diputación Foral de Álava",
    "cargo_actual": "Diputación Foral · Territorio Histórico de Álava",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputación Foral de Álava. Institución única (no es Diputación Provincial común). Régimen foral con Concierto Económico. Diputado General: Ramiro González Vicente (PNV).",
    "tags": [
      "diputacion-foral",
      "ccaa:euskadi",
      "provincia:alava",
      "regimen-foral"
    ],
    "fuente_principal": "https://www.araba.eus",
    "apartados": [
      {
        "id": "dip-0039-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0039-ap-00-it-00",
            "apartado_id": "dip-0039-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "Diputación Foral de Álava, Territorio Histórico de Álava. Junta General de Álava elige al Diputado General. Régimen del Concierto Económico vasco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0039-ap-00-it-01",
            "apartado_id": "dip-0039-ap-00",
            "tipo": "dato",
            "titulo": "Diputado General",
            "contenido": "Ramiro González Vicente (PNV). Reelegido 2023.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "gonzalez"
            ],
            "orden": 1
          },
          {
            "id": "dip-0039-ap-00-it-02",
            "apartado_id": "dip-0039-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0039-ap-00-it-03",
            "apartado_id": "dip-0039-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0039-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0039-ap-01-it-00",
            "apartado_id": "dip-0039-ap-01",
            "tipo": "dato",
            "titulo": "Concierto Económico",
            "contenido": "Competencia tributaria propia (impuestos directos). Cuota al Estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "concierto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0039-ap-01-it-01",
            "apartado_id": "dip-0039-ap-01",
            "tipo": "dato",
            "titulo": "Industrial / Mercedes Vitoria",
            "contenido": "Polo industrial automoción (Mercedes Vitoria, Michelin).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "industria"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0039-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0039-ap-02-it-00",
            "apartado_id": "dip-0039-ap-02",
            "tipo": "contacto",
            "titulo": "Gobierno Vasco (Pradales PNV)",
            "contenido": "**Coordinación con Lehendakari Pradales** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pradales",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0039-ap-02-it-01",
            "apartado_id": "dip-0039-ap-02",
            "tipo": "contacto",
            "titulo": "Pleno PNV-PSE",
            "contenido": "**Pacto de gobierno PNV-PSE en Álava** (nota +4/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv-pse",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0039-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0039-ap-03-it-00",
            "apartado_id": "dip-0039-ap-03",
            "tipo": "documento",
            "titulo": "Araba",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.araba.eus",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0040",
    "slug": "diputacion-foral-bizkaia",
    "nombre_completo": "Diputación Foral de Bizkaia / Bizkaiko Foru Aldundia",
    "alias": "Diputación Foral de Bizkaia",
    "cargo_actual": "Diputación Foral · Territorio Histórico de Bizkaia",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputación Foral de Bizkaia. La de mayor presupuesto vasco. Concierto Económico vasco. Diputada General: Elixabete Etxanobe (PNV).",
    "tags": [
      "diputacion-foral",
      "ccaa:euskadi",
      "provincia:bizkaia",
      "regimen-foral"
    ],
    "fuente_principal": "https://www.bizkaia.eus",
    "apartados": [
      {
        "id": "dip-0040-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0040-ap-00-it-00",
            "apartado_id": "dip-0040-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "Diputación Foral de Bizkaia. Junta General de Bizkaia elige al Diputado General. Mayor presupuesto vasco.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0040-ap-00-it-01",
            "apartado_id": "dip-0040-ap-00",
            "tipo": "dato",
            "titulo": "Diputada General",
            "contenido": "Elixabete Etxanobe Landajuela (PNV). Sustituyó a Unai Rementeria tras 2023.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "etxanobe"
            ],
            "orden": 1
          },
          {
            "id": "dip-0040-ap-00-it-02",
            "apartado_id": "dip-0040-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0040-ap-00-it-03",
            "apartado_id": "dip-0040-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0040-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0040-ap-01-it-00",
            "apartado_id": "dip-0040-ap-01",
            "tipo": "evento",
            "titulo": "Relevo Rementeria → Etxanobe",
            "contenido": "Etxanobe sucede a Rementeria (PNV) tras municipales 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0040-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0040-ap-02-it-00",
            "apartado_id": "dip-0040-ap-02",
            "tipo": "dato",
            "titulo": "Polo industrial Bilbao",
            "contenido": "Eje Bilbao, Mercabilbao, Petronor (Repsol), polo siderúrgico tradicional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "industria"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0040-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0040-ap-03-it-00",
            "apartado_id": "dip-0040-ap-03",
            "tipo": "contacto",
            "titulo": "Gobierno Vasco (Pradales)",
            "contenido": "**Pradales (PNV) anteriormente diputado foral de Movilidad e Infraestructuras de Bizkaia (con Rementeria)**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pradales",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0040-ap-03-it-01",
            "apartado_id": "dip-0040-ap-03",
            "tipo": "contacto",
            "titulo": "Pacto PNV-PSE",
            "contenido": "**Mismo modelo que Lehendakaritza** (nota +4/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv-pse",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0040-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0040-ap-04-it-00",
            "apartado_id": "dip-0040-ap-04",
            "tipo": "documento",
            "titulo": "Bizkaia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.bizkaia.eus",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0041",
    "slug": "diputacion-foral-gipuzkoa",
    "nombre_completo": "Diputación Foral de Gipuzkoa / Gipuzkoako Foru Aldundia",
    "alias": "Diputación Foral de Gipuzkoa",
    "cargo_actual": "Diputación Foral · Territorio Histórico de Gipuzkoa",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Diputación Foral de Gipuzkoa. Concierto Económico vasco. Diputada General: Eider Mendoza (PNV) tras la era Markel Olano.",
    "tags": [
      "diputacion-foral",
      "ccaa:euskadi",
      "provincia:gipuzkoa",
      "regimen-foral"
    ],
    "fuente_principal": "https://www.gipuzkoa.eus",
    "apartados": [
      {
        "id": "dip-0041-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0041-ap-00-it-00",
            "apartado_id": "dip-0041-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "Diputación Foral de Gipuzkoa. Junta General de Gipuzkoa elige al Diputado General. Régimen del Concierto.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0041-ap-00-it-01",
            "apartado_id": "dip-0041-ap-00",
            "tipo": "dato",
            "titulo": "Diputada General",
            "contenido": "Eider Mendoza Larrañaga (PNV). Sucede a Markel Olano (PNV) tras 2023.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pnv",
              "mendoza"
            ],
            "orden": 1
          },
          {
            "id": "dip-0041-ap-00-it-02",
            "apartado_id": "dip-0041-ap-00",
            "tipo": "dato",
            "titulo": "Competencias institucionales",
            "contenido": "Las Diputaciones Provinciales tienen competencias en: (1) coordinación y prestación de servicios municipales en municipios <20.000 hab. (asistencia técnica, jurídica, informática y económica), (2) red provincial de carreteras (mantenimiento, refuerzo, nuevas obras), (3) protección civil y emergencias, (4) cooperación al desarrollo de los municipios mediante Planes Provinciales plurianuales, (5) gestión cultural, deportiva y turística supramunicipal, (6) recaudación tributaria delegada de los ayuntamientos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "competencias-institucionales"
            ],
            "orden": 2
          },
          {
            "id": "dip-0041-ap-00-it-03",
            "apartado_id": "dip-0041-ap-00",
            "tipo": "dato",
            "titulo": "Encaje político-territorial",
            "contenido": "Los diputados provinciales no son elegidos directamente: los partidos del Pleno designan a sus diputados entre los concejales electos en los municipios de la provincia. La presidencia se elige por mayoría del Pleno y por convención recae en el partido con mayor representación municipal. El presupuesto anual oscila entre 80 M€ (provincias pequeñas) y más de 1.000 M€ (Barcelona). Las diputaciones son una pieza clave del clientelismo político local por su capacidad de redistribuir fondos a los municipios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "encaje-institucional"
            ],
            "orden": 3
          }
        ]
      },
      {
        "id": "dip-0041-ap-01",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0041-ap-01-it-00",
            "apartado_id": "dip-0041-ap-01",
            "tipo": "contacto",
            "titulo": "Gobierno Vasco (Pradales)",
            "contenido": "**Coordinación con Lehendakari** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pradales",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0041-ap-01-it-01",
            "apartado_id": "dip-0041-ap-01",
            "tipo": "contacto",
            "titulo": "EH Bildu (oposición)",
            "contenido": "**EH Bildu es fuerza principal de oposición en Gipuzkoa (territorio históricamente más abertzale)** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bildu",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0041-ap-02",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0041-ap-02-it-00",
            "apartado_id": "dip-0041-ap-02",
            "tipo": "documento",
            "titulo": "Gipuzkoa",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.gipuzkoa.eus",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0042",
    "slug": "javier-aureliano-garcia-molina",
    "nombre_completo": "Javier Aureliano García Molina",
    "alias": "Javier A. García",
    "cargo_actual": "Presidente de la Diputación Provincial de Almería",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Almería desde 2019, renovado en 2023. Anteriormente alcalde de Roquetas de Mar (2003-2007) y diputado autonómico.",
    "tags": [
      "politico",
      "pp",
      "diputacion-almeria"
    ],
    "fuente_principal": "https://www.dipalme.org",
    "apartados": [
      {
        "id": "dip-0042-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0042-ap-00-it-00",
            "apartado_id": "dip-0042-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Nacido en Almería. Militante PP. Trayectoria local-provincial-autonómica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0042-ap-00-it-01",
            "apartado_id": "dip-0042-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0042-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0042-ap-01-it-00",
            "apartado_id": "dip-0042-ap-01",
            "tipo": "evento",
            "titulo": "Roquetas de Mar",
            "contenido": "Concejal y luego alcalde de Roquetas de Mar.",
            "fecha": "2003-06-14",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0042-ap-01-it-01",
            "apartado_id": "dip-0042-ap-01",
            "tipo": "evento",
            "titulo": "Diputado autonómico",
            "contenido": "Parlamento andaluz por Almería en la era Susana Díaz / Moreno Bonilla.",
            "fecha": "2008-04-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "dip-0042-ap-01-it-02",
            "apartado_id": "dip-0042-ap-01",
            "tipo": "evento",
            "titulo": "Presidente Diputación",
            "contenido": "Sustituye a Gabriel Amat (PP) en 2019.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0042-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0042-ap-02-it-00",
            "apartado_id": "dip-0042-ap-02",
            "tipo": "contacto",
            "titulo": "PP Andalucía / Moreno",
            "contenido": "**Vínculo con la federación andaluza de PP-A**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp-a",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0042-ap-02-it-01",
            "apartado_id": "dip-0042-ap-02",
            "tipo": "contacto",
            "titulo": "FAMP",
            "contenido": "**Participación en Federación Andaluza de Municipios y Provincias** (nota +3/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "famp",
              "nota-+3",
              "neutral"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0042-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0042-ap-03-it-00",
            "apartado_id": "dip-0042-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Almería",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipalme.org",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0043",
    "slug": "almudena-martinez-del-junco",
    "nombre_completo": "Almudena Martínez del Junco",
    "alias": "Almudena Martínez",
    "cargo_actual": "Presidenta de la Diputación Provincial de Cádiz",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Política del PP. Presidenta de la Diputación de Cádiz desde julio 2023, sustituyendo a Irene García (PSOE). Anteriormente alcaldesa de Conil de la Frontera (2011-2015) y diputada provincial.",
    "tags": [
      "politico",
      "pp",
      "diputacion-cadiz"
    ],
    "fuente_principal": "https://www.dipucadiz.es",
    "apartados": [
      {
        "id": "dip-0043-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0043-ap-00-it-00",
            "apartado_id": "dip-0043-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Política gaditana del PP. Carrera local-provincial en la provincia.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0043-ap-00-it-01",
            "apartado_id": "dip-0043-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0043-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0043-ap-01-it-00",
            "apartado_id": "dip-0043-ap-01",
            "tipo": "evento",
            "titulo": "Conil de la Frontera",
            "contenido": "Alcaldesa entre 2011 y 2015.",
            "fecha": "2011-06-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0043-ap-01-it-01",
            "apartado_id": "dip-0043-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidenta desde julio 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0043-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0043-ap-02-it-00",
            "apartado_id": "dip-0043-ap-02",
            "tipo": "contacto",
            "titulo": "PP-A / Moreno",
            "contenido": "**Alineamiento con Juanma Moreno**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp-a",
              "moreno",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0043-ap-02-it-01",
            "apartado_id": "dip-0043-ap-02",
            "tipo": "contacto",
            "titulo": "Bahía de Cádiz",
            "contenido": "**Coordinación con el área metropolitana de Cádiz** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bahia-cadiz",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0043-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0043-ap-03-it-00",
            "apartado_id": "dip-0043-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Cádiz",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipucadiz.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0044",
    "slug": "salvador-fuentes-lopera",
    "nombre_completo": "Salvador Fuentes Lopera",
    "alias": "Salvador Fuentes",
    "cargo_actual": "Presidente de la Diputación Provincial de Córdoba",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Córdoba desde julio 2023. Diputado autonómico y figura del PP cordobés.",
    "tags": [
      "politico",
      "pp",
      "diputacion-cordoba"
    ],
    "fuente_principal": "https://www.dipucordoba.es",
    "apartados": [
      {
        "id": "dip-0044-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0044-ap-00-it-00",
            "apartado_id": "dip-0044-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político cordobés del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0044-ap-00-it-01",
            "apartado_id": "dip-0044-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0044-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0044-ap-01-it-00",
            "apartado_id": "dip-0044-ap-01",
            "tipo": "evento",
            "titulo": "Diputado autonómico",
            "contenido": "Parlamento andaluz por Córdoba.",
            "fecha": "2018-12-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0044-ap-01-it-01",
            "apartado_id": "dip-0044-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente desde julio 2023, sustituyendo a Antonio Ruiz (PSOE).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0044-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0044-ap-02-it-00",
            "apartado_id": "dip-0044-ap-02",
            "tipo": "contacto",
            "titulo": "PP-A",
            "contenido": "**Vinculación regional** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp-a",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0044-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0044-ap-03-it-00",
            "apartado_id": "dip-0044-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Córdoba",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipucordoba.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0045",
    "slug": "francisco-rodriguez-fernandez-granada",
    "nombre_completo": "Francisco Rodríguez Fernández",
    "alias": "Francisco Rodríguez",
    "cargo_actual": "Presidente de la Diputación Provincial de Granada",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Granada desde julio 2023. Trayectoria municipal en la provincia.",
    "tags": [
      "politico",
      "pp",
      "diputacion-granada"
    ],
    "fuente_principal": "https://www.dipgra.es",
    "apartados": [
      {
        "id": "dip-0045-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0045-ap-00-it-00",
            "apartado_id": "dip-0045-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político granadino del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0045-ap-00-it-01",
            "apartado_id": "dip-0045-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0045-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0045-ap-01-it-00",
            "apartado_id": "dip-0045-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente desde julio 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0045-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0045-ap-02-it-00",
            "apartado_id": "dip-0045-ap-02",
            "tipo": "contacto",
            "titulo": "PP-A / Moreno",
            "contenido": "**Alineamiento Junta Andalucía**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp-a",
              "sin-valorar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0045-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0045-ap-03-it-00",
            "apartado_id": "dip-0045-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Granada",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipgra.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0046",
    "slug": "david-toscano-contreras",
    "nombre_completo": "David Toscano Contreras",
    "alias": "David Toscano",
    "cargo_actual": "Presidente de la Diputación Provincial de Huelva",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Huelva tras la alternancia 2023.",
    "tags": [
      "politico",
      "pp",
      "diputacion-huelva"
    ],
    "fuente_principal": "https://www.diphuelva.es",
    "apartados": [
      {
        "id": "dip-0046-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0046-ap-00-it-00",
            "apartado_id": "dip-0046-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político onubense del PP. Cargo presidencial reciente.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0046-ap-00-it-01",
            "apartado_id": "dip-0046-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0046-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0046-ap-01-it-00",
            "apartado_id": "dip-0046-ap-01",
            "tipo": "evento",
            "titulo": "Diputación Huelva",
            "contenido": "Presidente tras alternancia 2023, sustituyendo a María Eugenia Limón (PSOE).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0046-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0046-ap-02-it-00",
            "apartado_id": "dip-0046-ap-02",
            "tipo": "contacto",
            "titulo": "PP-A",
            "contenido": "**Vínculo con la federación regional PP-A**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp-a",
              "sin-valorar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0046-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0046-ap-03-it-00",
            "apartado_id": "dip-0046-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Huelva",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diphuelva.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0047",
    "slug": "francisco-reyes-martinez",
    "nombre_completo": "Francisco Reyes Martínez",
    "alias": "Francisco Reyes",
    "cargo_actual": "Presidente de la Diputación Provincial de Jaén",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de Jaén desde 2015, renovado en 2019 y 2023. Figura central del PSOE en la provincia.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-jaen"
    ],
    "fuente_principal": "https://www.dipujaen.es",
    "apartados": [
      {
        "id": "dip-0047-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0047-ap-00-it-00",
            "apartado_id": "dip-0047-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político giennense del PSOE. Años al frente de la Diputación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0047-ap-00-it-01",
            "apartado_id": "dip-0047-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0047-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0047-ap-01-it-00",
            "apartado_id": "dip-0047-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldía Villatorres",
            "contenido": "Alcalde de Villatorres y otros cargos locales.",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0047-ap-01-it-01",
            "apartado_id": "dip-0047-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2015",
            "contenido": "Presidente desde 2015.",
            "fecha": "2015-07-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "dip-0047-ap-01-it-02",
            "apartado_id": "dip-0047-ap-01",
            "tipo": "evento",
            "titulo": "Renovaciones",
            "contenido": "Renovado en 2019 y 2023, Jaén bastión PSOE.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0047-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0047-ap-02-it-00",
            "apartado_id": "dip-0047-ap-02",
            "tipo": "dato",
            "titulo": "Olivar / Aceite",
            "contenido": "Defensor activo del olivar de Jaén y de las indicaciones geográficas protegidas (DOP Jaén).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "olivar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0047-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0047-ap-03-it-00",
            "apartado_id": "dip-0047-ap-03",
            "tipo": "contacto",
            "titulo": "PSOE Andalucía",
            "contenido": "**Voz importante del PSOE-A en la provincia**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-a",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0047-ap-03-it-01",
            "apartado_id": "dip-0047-ap-03",
            "tipo": "contacto",
            "titulo": "FAMP",
            "contenido": "**Federación andaluza**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "famp",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0047-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0047-ap-04-it-00",
            "apartado_id": "dip-0047-ap-04",
            "tipo": "documento",
            "titulo": "Diputación Jaén",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipujaen.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0048",
    "slug": "francisco-salado-escano",
    "nombre_completo": "Francisco Salado Escaño",
    "alias": "Francisco Salado",
    "cargo_actual": "Presidente de la Diputación Provincial de Málaga",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Málaga desde 2019, renovado en 2023. Anteriormente alcalde de Rincón de la Victoria.",
    "tags": [
      "politico",
      "pp",
      "diputacion-malaga"
    ],
    "fuente_principal": "https://www.malaga.es",
    "apartados": [
      {
        "id": "dip-0048-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0048-ap-00-it-00",
            "apartado_id": "dip-0048-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político malagueño del PP. Trayectoria local-provincial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0048-ap-00-it-01",
            "apartado_id": "dip-0048-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0048-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0048-ap-01-it-00",
            "apartado_id": "dip-0048-ap-01",
            "tipo": "evento",
            "titulo": "Rincón de la Victoria",
            "contenido": "Alcalde durante la década 2007-2019.",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0048-ap-01-it-01",
            "apartado_id": "dip-0048-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente desde 2019.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0048-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0048-ap-02-it-00",
            "apartado_id": "dip-0048-ap-02",
            "tipo": "contacto",
            "titulo": "De la Torre (alcalde Málaga)",
            "contenido": "**Coordinación con Francisco de la Torre (PP), alcalde de Málaga capital** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "delatorre",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0048-ap-02-it-01",
            "apartado_id": "dip-0048-ap-02",
            "tipo": "contacto",
            "titulo": "PP-A / Moreno",
            "contenido": "**Alineamiento con la Junta de Andalucía**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp-a",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0048-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0048-ap-03-it-00",
            "apartado_id": "dip-0048-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Málaga",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.malaga.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0049",
    "slug": "javier-fernandez-de-los-rios",
    "nombre_completo": "Javier Fernández de los Ríos Torres",
    "alias": "Javier Fernández",
    "cargo_actual": "Presidente de la Diputación Provincial de Sevilla",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de Sevilla desde julio 2023. Sucede a Fernando Rodríguez Villalobos (PSOE) tras 12 años.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-sevilla"
    ],
    "fuente_principal": "https://www.dipusevilla.es",
    "apartados": [
      {
        "id": "dip-0049-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0049-ap-00-it-00",
            "apartado_id": "dip-0049-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político sevillano del PSOE, trayectoria provincial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0049-ap-00-it-01",
            "apartado_id": "dip-0049-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0049-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0049-ap-01-it-00",
            "apartado_id": "dip-0049-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Presidente desde julio 2023, manteniendo la institución en manos del PSOE.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0049-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0049-ap-02-it-00",
            "apartado_id": "dip-0049-ap-02",
            "tipo": "contacto",
            "titulo": "PSOE Sevilla",
            "contenido": "**Federación provincial** — Sevilla bastión PSOE histórico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-sevilla",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0049-ap-02-it-01",
            "apartado_id": "dip-0049-ap-02",
            "tipo": "contacto",
            "titulo": "Ayuntamiento Sevilla (Sanz PP)",
            "contenido": "**Coordinación complicada con José Luis Sanz (PP, alcalde Sevilla)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanz",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0049-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0049-ap-03-it-00",
            "apartado_id": "dip-0049-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Sevilla",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipusevilla.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0050",
    "slug": "isaac-claver-ortigosa",
    "nombre_completo": "Isaac Claver Ortigosa",
    "alias": "Isaac Claver",
    "cargo_actual": "Presidente de la Diputación Provincial de Huesca",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Huesca desde julio 2023. Anteriormente alcalde de Monzón.",
    "tags": [
      "politico",
      "pp",
      "diputacion-huesca"
    ],
    "fuente_principal": "https://www.dphuesca.es",
    "apartados": [
      {
        "id": "dip-0050-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0050-ap-00-it-00",
            "apartado_id": "dip-0050-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político oscense del PP, trayectoria municipal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0050-ap-00-it-01",
            "apartado_id": "dip-0050-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0050-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0050-ap-01-it-00",
            "apartado_id": "dip-0050-ap-01",
            "tipo": "evento",
            "titulo": "Monzón",
            "contenido": "Alcalde de Monzón antes de la presidencia.",
            "fecha": "2015-06-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0050-ap-01-it-01",
            "apartado_id": "dip-0050-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Presidente desde julio 2023, sustituyendo a Miguel Gracia (PSOE).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0050-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0050-ap-02-it-00",
            "apartado_id": "dip-0050-ap-02",
            "tipo": "contacto",
            "titulo": "PP Aragón / Azcón",
            "contenido": "**Coordinación con Jorge Azcón (PP, presidente aragonés)** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "azcon",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0050-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0050-ap-03-it-00",
            "apartado_id": "dip-0050-ap-03",
            "tipo": "documento",
            "titulo": "DPHuesca",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dphuesca.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0051",
    "slug": "joaquin-juste-sanz",
    "nombre_completo": "Joaquín Juste Sanz",
    "alias": "Joaquín Juste",
    "cargo_actual": "Presidente de la Diputación Provincial de Teruel",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Teruel desde 2023. Anteriormente alcalde de Híjar y diputado nacional por Teruel.",
    "tags": [
      "politico",
      "pp",
      "diputacion-teruel"
    ],
    "fuente_principal": "https://www.dpteruel.es",
    "apartados": [
      {
        "id": "dip-0051-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0051-ap-00-it-00",
            "apartado_id": "dip-0051-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político turolense del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0051-ap-00-it-01",
            "apartado_id": "dip-0051-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0051-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0051-ap-01-it-00",
            "apartado_id": "dip-0051-ap-01",
            "tipo": "evento",
            "titulo": "Diputado nacional",
            "contenido": "Diputado del Congreso por Teruel (PP) varias legislaturas.",
            "fecha": "2015-12-20",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0051-ap-01-it-01",
            "apartado_id": "dip-0051-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Presidente desde julio 2023, sustituyendo a Manuel Rando (PSOE).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0051-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0051-ap-02-it-00",
            "apartado_id": "dip-0051-ap-02",
            "tipo": "contacto",
            "titulo": "Teruel Existe",
            "contenido": "**Tensión con Teruel Existe (España Vaciada) como fuerza política provincial** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "teruel-existe",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0051-ap-02-it-01",
            "apartado_id": "dip-0051-ap-02",
            "tipo": "contacto",
            "titulo": "PP Aragón / Azcón",
            "contenido": "**Vinculación regional** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "azcon",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0051-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0051-ap-03-it-00",
            "apartado_id": "dip-0051-ap-03",
            "tipo": "documento",
            "titulo": "DPTeruel",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dpteruel.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0052",
    "slug": "juan-antonio-sanchez-quero",
    "nombre_completo": "Juan Antonio Sánchez Quero",
    "alias": "Sánchez Quero",
    "cargo_actual": "Presidente de la Diputación Provincial de Zaragoza",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de Zaragoza desde 2015, renovado 2019 y 2023. Anteriormente alcalde de Alfamén y diputado provincial.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-zaragoza"
    ],
    "fuente_principal": "https://www.dpz.es",
    "apartados": [
      {
        "id": "dip-0052-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0052-ap-00-it-00",
            "apartado_id": "dip-0052-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político zaragozano del PSOE. Trayectoria municipal-provincial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0052-ap-00-it-01",
            "apartado_id": "dip-0052-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0052-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0052-ap-01-it-00",
            "apartado_id": "dip-0052-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldía Alfamén",
            "contenido": "Alcalde de Alfamén.",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0052-ap-01-it-01",
            "apartado_id": "dip-0052-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente desde 2015.",
            "fecha": "2015-07-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "dip-0052-ap-01-it-02",
            "apartado_id": "dip-0052-ap-01",
            "tipo": "evento",
            "titulo": "Renovaciones",
            "contenido": "Renovado en 2019 y 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0052-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0052-ap-02-it-00",
            "apartado_id": "dip-0052-ap-02",
            "tipo": "contacto",
            "titulo": "PSOE Aragón",
            "contenido": "**Voz del PSOE-A en oposición a Azcón** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-a",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0052-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0052-ap-03-it-00",
            "apartado_id": "dip-0052-ap-03",
            "tipo": "documento",
            "titulo": "DPZ",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dpz.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0053",
    "slug": "carlos-garcia-gonzalez-avila",
    "nombre_completo": "Carlos García González",
    "alias": "Carlos García",
    "cargo_actual": "Presidente de la Diputación Provincial de Ávila",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Ávila. Trayectoria provincial.",
    "tags": [
      "politico",
      "pp",
      "diputacion-avila"
    ],
    "fuente_principal": "https://www.diputacionavila.es",
    "apartados": [
      {
        "id": "dip-0053-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0053-ap-00-it-00",
            "apartado_id": "dip-0053-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político abulense del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0053-ap-00-it-01",
            "apartado_id": "dip-0053-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0053-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0053-ap-01-it-00",
            "apartado_id": "dip-0053-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0053-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0053-ap-02-it-00",
            "apartado_id": "dip-0053-ap-02",
            "tipo": "contacto",
            "titulo": "PP CyL / Mañueco",
            "contenido": "**Coordinación con Junta CyL** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0053-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0053-ap-03-it-00",
            "apartado_id": "dip-0053-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Ávila",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputacionavila.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0054",
    "slug": "borja-suarez-pedrosa",
    "nombre_completo": "Borja Suárez Pedrosa",
    "alias": "Borja Suárez",
    "cargo_actual": "Presidente de la Diputación Provincial de Burgos",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Burgos desde 2023.",
    "tags": [
      "politico",
      "pp",
      "diputacion-burgos"
    ],
    "fuente_principal": "https://www.diputaciondeburgos.es",
    "apartados": [
      {
        "id": "dip-0054-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0054-ap-00-it-00",
            "apartado_id": "dip-0054-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político burgalés del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0054-ap-00-it-01",
            "apartado_id": "dip-0054-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0054-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0054-ap-01-it-00",
            "apartado_id": "dip-0054-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Sustituye a Ángel Ibáñez Hernando que pasó al Gobierno autonómico.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0054-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0054-ap-02-it-00",
            "apartado_id": "dip-0054-ap-02",
            "tipo": "contacto",
            "titulo": "Ángel Ibáñez (predecesor)",
            "contenido": "**Predecesor, hoy en Junta CyL** (nota -5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ibanez",
              "nota--5",
              "tension"
            ],
            "orden": 0
          },
          {
            "id": "dip-0054-ap-02-it-01",
            "apartado_id": "dip-0054-ap-02",
            "tipo": "contacto",
            "titulo": "PP CyL / Mañueco",
            "contenido": "**Coordinación regional** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0054-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0054-ap-03-it-00",
            "apartado_id": "dip-0054-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Burgos",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciondeburgos.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0055",
    "slug": "eduardo-moran-pacios",
    "nombre_completo": "Eduardo Morán Pacios",
    "alias": "Eduardo Morán",
    "cargo_actual": "Presidente de la Diputación Provincial de León",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de León desde 2023, en pacto con UPL.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-leon"
    ],
    "fuente_principal": "https://www.dipuleon.es",
    "apartados": [
      {
        "id": "dip-0055-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0055-ap-00-it-00",
            "apartado_id": "dip-0055-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político leonés del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0055-ap-00-it-01",
            "apartado_id": "dip-0055-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0055-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0055-ap-01-it-00",
            "apartado_id": "dip-0055-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Presidente con apoyo de UPL.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0055-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0055-ap-02-it-00",
            "apartado_id": "dip-0055-ap-02",
            "tipo": "contacto",
            "titulo": "UPL (socio)",
            "contenido": "**Pacto con regionalismo leonés** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "upl",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "dip-0055-ap-02-it-01",
            "apartado_id": "dip-0055-ap-02",
            "tipo": "contacto",
            "titulo": "PSOE CyL",
            "contenido": "**Oposición Junta del PP-Vox** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-cyl",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0055-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0055-ap-03-it-00",
            "apartado_id": "dip-0055-ap-03",
            "tipo": "documento",
            "titulo": "Diputación León",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipuleon.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0056",
    "slug": "angeles-armisen-pedrejon",
    "nombre_completo": "Ángeles Armisén Pedrejón",
    "alias": "Ángeles Armisén",
    "cargo_actual": "Presidenta de la Diputación Provincial de Palencia",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Política del PP. Presidenta de la Diputación de Palencia desde 2015, renovada 2019 y 2023.",
    "tags": [
      "politico",
      "pp",
      "diputacion-palencia"
    ],
    "fuente_principal": "https://www.diputaciondepalencia.es",
    "apartados": [
      {
        "id": "dip-0056-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0056-ap-00-it-00",
            "apartado_id": "dip-0056-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Política palentina del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0056-ap-00-it-01",
            "apartado_id": "dip-0056-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0056-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0056-ap-01-it-00",
            "apartado_id": "dip-0056-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2015",
            "contenido": "Presidenta desde 2015.",
            "fecha": "2015-07-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0056-ap-01-it-01",
            "apartado_id": "dip-0056-ap-01",
            "tipo": "evento",
            "titulo": "Renovaciones 2019/2023",
            "contenido": "Renovada en 2019 y 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0056-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0056-ap-02-it-00",
            "apartado_id": "dip-0056-ap-02",
            "tipo": "contacto",
            "titulo": "PP CyL / Mañueco",
            "contenido": "**Coordinación regional** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0056-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0056-ap-03-it-00",
            "apartado_id": "dip-0056-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Palencia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciondepalencia.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0057",
    "slug": "javier-iglesias-garcia-salamanca",
    "nombre_completo": "Javier Iglesias García",
    "alias": "Javier Iglesias",
    "cargo_actual": "Presidente de la Diputación Provincial de Salamanca",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Salamanca, trayectoria larga en la institución.",
    "tags": [
      "politico",
      "pp",
      "diputacion-salamanca"
    ],
    "fuente_principal": "https://www.lasalina.es",
    "apartados": [
      {
        "id": "dip-0057-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0057-ap-00-it-00",
            "apartado_id": "dip-0057-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político salmantino del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0057-ap-00-it-01",
            "apartado_id": "dip-0057-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0057-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0057-ap-01-it-00",
            "apartado_id": "dip-0057-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente desde 2015.",
            "fecha": "2015-07-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0057-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0057-ap-02-it-00",
            "apartado_id": "dip-0057-ap-02",
            "tipo": "contacto",
            "titulo": "PP CyL / Mañueco",
            "contenido": "**Coordinación regional** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0057-ap-02-it-01",
            "apartado_id": "dip-0057-ap-02",
            "tipo": "contacto",
            "titulo": "USAL",
            "contenido": "**Convenios con la Universidad de Salamanca** (nota +3/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "usal",
              "nota-+3",
              "neutral"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0057-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0057-ap-03-it-00",
            "apartado_id": "dip-0057-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Salamanca",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.lasalina.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0058",
    "slug": "miguel-angel-de-vicente-martin",
    "nombre_completo": "Miguel Ángel de Vicente Martín",
    "alias": "De Vicente",
    "cargo_actual": "Presidente de la Diputación Provincial de Segovia",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Segovia.",
    "tags": [
      "politico",
      "pp",
      "diputacion-segovia"
    ],
    "fuente_principal": "https://www.dipsegovia.es",
    "apartados": [
      {
        "id": "dip-0058-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0058-ap-00-it-00",
            "apartado_id": "dip-0058-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político segoviano del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0058-ap-00-it-01",
            "apartado_id": "dip-0058-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0058-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0058-ap-01-it-00",
            "apartado_id": "dip-0058-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0058-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0058-ap-02-it-00",
            "apartado_id": "dip-0058-ap-02",
            "tipo": "contacto",
            "titulo": "PP CyL / Mañueco",
            "contenido": "**Coordinación regional** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0058-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0058-ap-03-it-00",
            "apartado_id": "dip-0058-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Segovia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipsegovia.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0059",
    "slug": "benito-serrano-mata",
    "nombre_completo": "Benito Serrano Mata",
    "alias": "Benito Serrano",
    "cargo_actual": "Presidente de la Diputación Provincial de Soria",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Soria.",
    "tags": [
      "politico",
      "pp",
      "diputacion-soria"
    ],
    "fuente_principal": "https://www.dipsoria.es",
    "apartados": [
      {
        "id": "dip-0059-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0059-ap-00-it-00",
            "apartado_id": "dip-0059-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político soriano del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0059-ap-00-it-01",
            "apartado_id": "dip-0059-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0059-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0059-ap-01-it-00",
            "apartado_id": "dip-0059-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0059-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0059-ap-02-it-00",
            "apartado_id": "dip-0059-ap-02",
            "tipo": "contacto",
            "titulo": "Soria ¡Ya!",
            "contenido": "**Plataforma España Vaciada en la provincia**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "soria-ya",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0059-ap-02-it-01",
            "apartado_id": "dip-0059-ap-02",
            "tipo": "contacto",
            "titulo": "PP CyL / Mañueco",
            "contenido": "**Coordinación regional** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0059-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0059-ap-03-it-00",
            "apartado_id": "dip-0059-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Soria",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipsoria.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0060",
    "slug": "conrado-iscar-ordonez",
    "nombre_completo": "Conrado Íscar Ordóñez",
    "alias": "Conrado Íscar",
    "cargo_actual": "Presidente de la Diputación Provincial de Valladolid",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Valladolid.",
    "tags": [
      "politico",
      "pp",
      "diputacion-valladolid"
    ],
    "fuente_principal": "https://www.diputaciondevalladolid.es",
    "apartados": [
      {
        "id": "dip-0060-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0060-ap-00-it-00",
            "apartado_id": "dip-0060-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político vallisoletano del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0060-ap-00-it-01",
            "apartado_id": "dip-0060-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0060-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0060-ap-01-it-00",
            "apartado_id": "dip-0060-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente desde 2019.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0060-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0060-ap-02-it-00",
            "apartado_id": "dip-0060-ap-02",
            "tipo": "contacto",
            "titulo": "PP CyL / Mañueco",
            "contenido": "**Vínculo directo con Valladolid como capital política**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "sin-valorar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0060-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0060-ap-03-it-00",
            "apartado_id": "dip-0060-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Valladolid",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciondevalladolid.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0061",
    "slug": "javier-faundez-dominguez",
    "nombre_completo": "Javier Faúndez Domínguez",
    "alias": "Javier Faúndez",
    "cargo_actual": "Presidente de la Diputación Provincial de Zamora",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Zamora.",
    "tags": [
      "politico",
      "pp",
      "diputacion-zamora"
    ],
    "fuente_principal": "https://www.diputaciondezamora.es",
    "apartados": [
      {
        "id": "dip-0061-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0061-ap-00-it-00",
            "apartado_id": "dip-0061-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político zamorano del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0061-ap-00-it-01",
            "apartado_id": "dip-0061-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0061-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0061-ap-01-it-00",
            "apartado_id": "dip-0061-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0061-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0061-ap-02-it-00",
            "apartado_id": "dip-0061-ap-02",
            "tipo": "contacto",
            "titulo": "PP CyL / Mañueco",
            "contenido": "**Coordinación regional** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "manueco",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0061-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0061-ap-03-it-00",
            "apartado_id": "dip-0061-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Zamora",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciondezamora.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0062",
    "slug": "santi-cabanero-masip",
    "nombre_completo": "Santiago Cabañero Masip",
    "alias": "Santi Cabañero",
    "cargo_actual": "Presidente de la Diputación Provincial de Albacete",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de Albacete desde 2019. Aliado de Emiliano García-Page.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-albacete"
    ],
    "fuente_principal": "https://www.dipualba.es",
    "apartados": [
      {
        "id": "dip-0062-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0062-ap-00-it-00",
            "apartado_id": "dip-0062-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político albaceteño del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0062-ap-00-it-01",
            "apartado_id": "dip-0062-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0062-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0062-ap-01-it-00",
            "apartado_id": "dip-0062-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2019",
            "contenido": "Presidente desde 2019, renovado 2023.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0062-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0062-ap-02-it-00",
            "apartado_id": "dip-0062-ap-02",
            "tipo": "contacto",
            "titulo": "Emiliano García-Page",
            "contenido": "**Aliado del presidente CLM** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "page",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0062-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0062-ap-03-it-00",
            "apartado_id": "dip-0062-ap-03",
            "tipo": "documento",
            "titulo": "DipuAlba",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipualba.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0063",
    "slug": "miguel-angel-valverde-menchero",
    "nombre_completo": "Miguel Ángel Valverde Menchero",
    "alias": "Valverde",
    "cargo_actual": "Presidente de la Diputación Provincial de Ciudad Real",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Ciudad Real tras alternancia 2023.",
    "tags": [
      "politico",
      "pp",
      "diputacion-ciudad-real"
    ],
    "fuente_principal": "https://www.dipucr.es",
    "apartados": [
      {
        "id": "dip-0063-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0063-ap-00-it-00",
            "apartado_id": "dip-0063-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político manchego del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0063-ap-00-it-01",
            "apartado_id": "dip-0063-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0063-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0063-ap-01-it-00",
            "apartado_id": "dip-0063-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Sustituye a José Manuel Caballero (PSOE).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0063-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0063-ap-02-it-00",
            "apartado_id": "dip-0063-ap-02",
            "tipo": "contacto",
            "titulo": "PP CLM",
            "contenido": "**Vinculación regional** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp-clm",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0063-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0063-ap-03-it-00",
            "apartado_id": "dip-0063-ap-03",
            "tipo": "documento",
            "titulo": "DipuCR",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipucr.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0064",
    "slug": "alvaro-martinez-chana",
    "nombre_completo": "Álvaro Martínez Chana",
    "alias": "Martínez Chana",
    "cargo_actual": "Presidente de la Diputación Provincial de Cuenca",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de Cuenca. Aliado de Emiliano García-Page.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-cuenca"
    ],
    "fuente_principal": "https://www.dipucuenca.es",
    "apartados": [
      {
        "id": "dip-0064-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0064-ap-00-it-00",
            "apartado_id": "dip-0064-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político conquense del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0064-ap-00-it-01",
            "apartado_id": "dip-0064-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0064-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0064-ap-01-it-00",
            "apartado_id": "dip-0064-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2019",
            "contenido": "Presidente desde 2019.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0064-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0064-ap-02-it-00",
            "apartado_id": "dip-0064-ap-02",
            "tipo": "contacto",
            "titulo": "García-Page",
            "contenido": "**Aliado regional** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "page",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0064-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0064-ap-03-it-00",
            "apartado_id": "dip-0064-ap-03",
            "tipo": "documento",
            "titulo": "DipuCuenca",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipucuenca.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0065",
    "slug": "jose-luis-vega-perez",
    "nombre_completo": "José Luis Vega Pérez",
    "alias": "José Luis Vega",
    "cargo_actual": "Presidente de la Diputación Provincial de Guadalajara",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de Guadalajara.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-guadalajara"
    ],
    "fuente_principal": "https://www.dguadalajara.es",
    "apartados": [
      {
        "id": "dip-0065-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0065-ap-00-it-00",
            "apartado_id": "dip-0065-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político alcarreño del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0065-ap-00-it-01",
            "apartado_id": "dip-0065-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0065-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0065-ap-01-it-00",
            "apartado_id": "dip-0065-ap-01",
            "tipo": "evento",
            "titulo": "Diputación",
            "contenido": "Presidente.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0065-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0065-ap-02-it-00",
            "apartado_id": "dip-0065-ap-02",
            "tipo": "contacto",
            "titulo": "García-Page",
            "contenido": "**Aliado regional** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "page",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0065-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0065-ap-03-it-00",
            "apartado_id": "dip-0065-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Guadalajara",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dguadalajara.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0066",
    "slug": "concepcion-cedillo-valverde",
    "nombre_completo": "Concepción Cedillo Valverde",
    "alias": "Concepción Cedillo",
    "cargo_actual": "Presidenta de la Diputación Provincial de Toledo",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Política del PP. Presidenta de la Diputación de Toledo tras alternancia 2023.",
    "tags": [
      "politico",
      "pp",
      "diputacion-toledo"
    ],
    "fuente_principal": "https://www.diputoledo.es",
    "apartados": [
      {
        "id": "dip-0066-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0066-ap-00-it-00",
            "apartado_id": "dip-0066-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Política toledana del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0066-ap-00-it-01",
            "apartado_id": "dip-0066-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0066-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0066-ap-01-it-00",
            "apartado_id": "dip-0066-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Sustituye a Álvaro Gutiérrez (PSOE).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0066-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0066-ap-02-it-00",
            "apartado_id": "dip-0066-ap-02",
            "tipo": "contacto",
            "titulo": "PP CLM",
            "contenido": "**Vinculación regional** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pp-clm",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0066-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0066-ap-03-it-00",
            "apartado_id": "dip-0066-ap-03",
            "tipo": "documento",
            "titulo": "DipuToledo",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputoledo.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0067",
    "slug": "lluisa-moret-sabido",
    "nombre_completo": "Lluïsa Moret i Sabidó",
    "alias": "Lluïsa Moret",
    "cargo_actual": "Presidenta de la Diputació de Barcelona",
    "partido": "PSC",
    "foto_url": null,
    "bio_corta": "Política del PSC. Presidenta de la Diputació de Barcelona desde 2023. Alcaldesa de Sant Boi de Llobregat.",
    "tags": [
      "politico",
      "psc",
      "diputacion-barcelona",
      "cataluna"
    ],
    "fuente_principal": "https://www.diba.cat",
    "apartados": [
      {
        "id": "dip-0067-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0067-ap-00-it-00",
            "apartado_id": "dip-0067-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Política catalana del PSC. Alcaldesa de Sant Boi de Llobregat.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0067-ap-00-it-01",
            "apartado_id": "dip-0067-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0067-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0067-ap-01-it-00",
            "apartado_id": "dip-0067-ap-01",
            "tipo": "evento",
            "titulo": "Sant Boi de Llobregat",
            "contenido": "Alcaldesa desde 2014.",
            "fecha": "2014-04-02",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0067-ap-01-it-01",
            "apartado_id": "dip-0067-ap-01",
            "tipo": "evento",
            "titulo": "Diba 2023",
            "contenido": "Presidenta de la Diputación de Barcelona desde julio 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0067-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0067-ap-02-it-00",
            "apartado_id": "dip-0067-ap-02",
            "tipo": "contacto",
            "titulo": "Salvador Illa",
            "contenido": "**Coordinación con president Generalitat (PSC)** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "illa",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0067-ap-02-it-01",
            "apartado_id": "dip-0067-ap-02",
            "tipo": "contacto",
            "titulo": "ERC",
            "contenido": "**Socio en la diputación** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "dip-0067-ap-02-it-02",
            "apartado_id": "dip-0067-ap-02",
            "tipo": "contacto",
            "titulo": "Jaume Collboni",
            "contenido": "**Coordinación con alcalde de Barcelona (PSC)** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "collboni",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0067-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0067-ap-03-it-00",
            "apartado_id": "dip-0067-ap-03",
            "tipo": "documento",
            "titulo": "Diba",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diba.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0068",
    "slug": "miquel-noguer-planas",
    "nombre_completo": "Miquel Noguer i Planas",
    "alias": "Miquel Noguer",
    "cargo_actual": "President de la Diputació de Girona",
    "partido": "JUNTS",
    "foto_url": null,
    "bio_corta": "Político de Junts. President de la Diputació de Girona desde 2019. Alcalde de Banyoles.",
    "tags": [
      "politico",
      "junts",
      "diputacion-girona",
      "cataluna"
    ],
    "fuente_principal": "https://www.ddgi.cat",
    "apartados": [
      {
        "id": "dip-0068-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0068-ap-00-it-00",
            "apartado_id": "dip-0068-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político catalán de Junts (antes CDC/CiU). Alcalde de Banyoles.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0068-ap-00-it-01",
            "apartado_id": "dip-0068-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0068-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0068-ap-01-it-00",
            "apartado_id": "dip-0068-ap-01",
            "tipo": "evento",
            "titulo": "Banyoles",
            "contenido": "Alcalde de Banyoles desde 2007.",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0068-ap-01-it-01",
            "apartado_id": "dip-0068-ap-01",
            "tipo": "evento",
            "titulo": "Diputació 2019",
            "contenido": "President desde 2019, renovado 2023.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0068-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0068-ap-02-it-00",
            "apartado_id": "dip-0068-ap-02",
            "tipo": "contacto",
            "titulo": "Junts",
            "contenido": "**Bastión histórico de Junts en Girona**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junts",
              "sin-valorar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0068-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0068-ap-03-it-00",
            "apartado_id": "dip-0068-ap-03",
            "tipo": "documento",
            "titulo": "DDGI",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.ddgi.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0069",
    "slug": "joan-talarn-gilabert",
    "nombre_completo": "Joan Talarn i Gilabert",
    "alias": "Joan Talarn",
    "cargo_actual": "President de la Diputació de Lleida",
    "partido": "ERC",
    "foto_url": null,
    "bio_corta": "Político de ERC. President de la Diputació de Lleida.",
    "tags": [
      "politico",
      "erc",
      "diputacion-lleida",
      "cataluna"
    ],
    "fuente_principal": "https://www.diputaciolleida.cat",
    "apartados": [
      {
        "id": "dip-0069-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0069-ap-00-it-00",
            "apartado_id": "dip-0069-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político leridano de ERC.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0069-ap-00-it-01",
            "apartado_id": "dip-0069-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0069-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0069-ap-01-it-00",
            "apartado_id": "dip-0069-ap-01",
            "tipo": "evento",
            "titulo": "Diputació 2019",
            "contenido": "President desde 2019.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0069-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0069-ap-02-it-00",
            "apartado_id": "dip-0069-ap-02",
            "tipo": "contacto",
            "titulo": "ERC",
            "contenido": "**Federación leridana de ERC**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "erc",
              "sin-valorar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0069-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0069-ap-03-it-00",
            "apartado_id": "dip-0069-ap-03",
            "tipo": "documento",
            "titulo": "DipuLleida",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputaciolleida.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0070",
    "slug": "noemi-llaurado-sans",
    "nombre_completo": "Noemí Llauradó i Sans",
    "alias": "Noemí Llauradó",
    "cargo_actual": "Presidenta de la Diputació de Tarragona",
    "partido": "ERC",
    "foto_url": null,
    "bio_corta": "Política de ERC. Presidenta de la Diputació de Tarragona en pacto con PSC.",
    "tags": [
      "politico",
      "erc",
      "diputacion-tarragona",
      "cataluna"
    ],
    "fuente_principal": "https://www.dipta.cat",
    "apartados": [
      {
        "id": "dip-0070-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0070-ap-00-it-00",
            "apartado_id": "dip-0070-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Política catalana de ERC.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0070-ap-00-it-01",
            "apartado_id": "dip-0070-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0070-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0070-ap-01-it-00",
            "apartado_id": "dip-0070-ap-01",
            "tipo": "evento",
            "titulo": "Diputació",
            "contenido": "Presidenta en pacto PSC-ERC.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0070-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0070-ap-02-it-00",
            "apartado_id": "dip-0070-ap-02",
            "tipo": "contacto",
            "titulo": "PSC",
            "contenido": "**Pacto de gobierno** (nota +4/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psc",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0070-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0070-ap-03-it-00",
            "apartado_id": "dip-0070-ap-03",
            "tipo": "documento",
            "titulo": "Dipta",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipta.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0071",
    "slug": "toni-perez-perez-alicante",
    "nombre_completo": "Antonio Pérez Pérez",
    "alias": "Toni Pérez",
    "cargo_actual": "Presidente de la Diputación de Alicante y alcalde de Benidorm",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Doble cargo: presidente de la Diputación de Alicante y alcalde de Benidorm. Voz importante del sector turístico de la Costa Blanca.",
    "tags": [
      "politico",
      "pp",
      "diputacion-alicante",
      "alcalde-benidorm",
      "c-valenciana"
    ],
    "fuente_principal": "https://www.diputacionalicante.es",
    "apartados": [
      {
        "id": "dip-0071-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0071-ap-00-it-00",
            "apartado_id": "dip-0071-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político alicantino del PP. Foco turístico (Benidorm, Costa Blanca).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0071-ap-00-it-01",
            "apartado_id": "dip-0071-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0071-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0071-ap-01-it-00",
            "apartado_id": "dip-0071-ap-01",
            "tipo": "evento",
            "titulo": "Alcaldía Benidorm",
            "contenido": "Alcalde de Benidorm desde 2015.",
            "fecha": "2015-06-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0071-ap-01-it-01",
            "apartado_id": "dip-0071-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Presidente Diputación Alicante desde 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0071-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0071-ap-02-it-00",
            "apartado_id": "dip-0071-ap-02",
            "tipo": "dato",
            "titulo": "Turismo",
            "contenido": "Defensor del modelo Benidorm como hub turístico residencial. Crítica con la 'tasa turística' valenciana.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "turismo",
              "benidorm"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0071-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0071-ap-03-it-00",
            "apartado_id": "dip-0071-ap-03",
            "tipo": "contacto",
            "titulo": "Mazón",
            "contenido": "**Coordinación con president valenciano (PP)** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mazon",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0071-ap-03-it-01",
            "apartado_id": "dip-0071-ap-03",
            "tipo": "contacto",
            "titulo": "HOSBEC",
            "contenido": "**Patronal hotelera Benidorm-Costa Blanca** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "hosbec",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0071-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0071-ap-04-it-00",
            "apartado_id": "dip-0071-ap-04",
            "tipo": "documento",
            "titulo": "Diputación Alicante",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.diputacionalicante.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0072",
    "slug": "marta-barrachina-mateu",
    "nombre_completo": "Marta Barrachina Mateu",
    "alias": "Marta Barrachina",
    "cargo_actual": "Presidenta de la Diputación de Castellón",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Política del PP. Presidenta de la Diputación de Castellón desde 2023.",
    "tags": [
      "politico",
      "pp",
      "diputacion-castellon",
      "c-valenciana"
    ],
    "fuente_principal": "https://www.dipcas.es",
    "apartados": [
      {
        "id": "dip-0072-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0072-ap-00-it-00",
            "apartado_id": "dip-0072-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Política castellonense del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0072-ap-00-it-01",
            "apartado_id": "dip-0072-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0072-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0072-ap-01-it-00",
            "apartado_id": "dip-0072-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2023",
            "contenido": "Presidenta desde julio 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0072-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0072-ap-02-it-00",
            "apartado_id": "dip-0072-ap-02",
            "tipo": "contacto",
            "titulo": "Mazón",
            "contenido": "**Coordinación con la Generalitat Valenciana** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mazon",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0072-ap-02-it-01",
            "apartado_id": "dip-0072-ap-02",
            "tipo": "contacto",
            "titulo": "Sector cerámico",
            "contenido": "**Castellón es polo mundial de cerámica**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "ceramica",
              "sin-valorar"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0072-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0072-ap-03-it-00",
            "apartado_id": "dip-0072-ap-03",
            "tipo": "documento",
            "titulo": "DipCas",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dipcas.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0073",
    "slug": "vicent-mompo-aledo",
    "nombre_completo": "Vicent Mompó Aledo",
    "alias": "Vicent Mompó",
    "cargo_actual": "Presidente de la Diputació de València",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Diputación de Valencia tras alternancia 2023. Anteriormente alcalde de Gavarda.",
    "tags": [
      "politico",
      "pp",
      "diputacion-valencia",
      "c-valenciana"
    ],
    "fuente_principal": "https://www.dival.es",
    "apartados": [
      {
        "id": "dip-0073-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0073-ap-00-it-00",
            "apartado_id": "dip-0073-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político valenciano del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0073-ap-00-it-01",
            "apartado_id": "dip-0073-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0073-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0073-ap-01-it-00",
            "apartado_id": "dip-0073-ap-01",
            "tipo": "evento",
            "titulo": "Gavarda",
            "contenido": "Alcalde de Gavarda antes de la presidencia.",
            "fecha": "2011-06-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0073-ap-01-it-01",
            "apartado_id": "dip-0073-ap-01",
            "tipo": "evento",
            "titulo": "Diputació 2023",
            "contenido": "Presidente desde julio 2023. Sustituye a Toni Gaspar (PSPV).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0073-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0073-ap-02-it-00",
            "apartado_id": "dip-0073-ap-02",
            "tipo": "dato",
            "titulo": "DANA Valencia 2024",
            "contenido": "Crisis institucional tras la DANA de octubre 2024 que afectó municipios valencianos.",
            "fecha": "2024-10-29",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "dana"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0073-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0073-ap-03-it-00",
            "apartado_id": "dip-0073-ap-03",
            "tipo": "contacto",
            "titulo": "Mazón",
            "contenido": "**Coordinación crítica post-DANA** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mazon",
              "dana",
              "nota--7",
              "conflicto"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0073-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0073-ap-04-it-00",
            "apartado_id": "dip-0073-ap-04",
            "tipo": "documento",
            "titulo": "Dival",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dival.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0074",
    "slug": "miguel-angel-gallardo-miranda",
    "nombre_completo": "Miguel Ángel Gallardo Miranda",
    "alias": "Miguel Ángel Gallardo",
    "cargo_actual": "Presidente de la Diputación de Badajoz",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de Badajoz. Figura interna del PSOE-Extremadura, ha aspirado al liderazgo regional.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-badajoz",
      "extremadura"
    ],
    "fuente_principal": "https://www.dip-badajoz.es",
    "apartados": [
      {
        "id": "dip-0074-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0074-ap-00-it-00",
            "apartado_id": "dip-0074-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político pacense del PSOE. Carrera larga en la diputación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0074-ap-00-it-01",
            "apartado_id": "dip-0074-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0074-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0074-ap-01-it-00",
            "apartado_id": "dip-0074-ap-01",
            "tipo": "evento",
            "titulo": "Villanueva de la Serena",
            "contenido": "Alcalde de Villanueva de la Serena (PSOE).",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0074-ap-01-it-01",
            "apartado_id": "dip-0074-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2015",
            "contenido": "Presidente desde 2015.",
            "fecha": "2015-07-15",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "dip-0074-ap-01-it-02",
            "apartado_id": "dip-0074-ap-01",
            "tipo": "evento",
            "titulo": "Renovaciones 2019/2023",
            "contenido": "Renovado en 2019 y 2023, consolidando bastión PSOE.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0074-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0074-ap-02-it-00",
            "apartado_id": "dip-0074-ap-02",
            "tipo": "dato",
            "titulo": "Aspirante liderazgo PSOE-Ex",
            "contenido": "Aspirante en pasado a liderar el PSOE-Extremadura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "liderazgo-psoe"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0074-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0074-ap-03-it-00",
            "apartado_id": "dip-0074-ap-03",
            "tipo": "contacto",
            "titulo": "PSOE Extremadura",
            "contenido": "**Figura de peso interno**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-ex",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0074-ap-03-it-01",
            "apartado_id": "dip-0074-ap-03",
            "tipo": "contacto",
            "titulo": "Junta Extremadura (Guardiola PP)",
            "contenido": "**Oposición a la Junta del PP-Vox** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "guardiola",
              "oposicion",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0074-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0074-ap-04-it-00",
            "apartado_id": "dip-0074-ap-04",
            "tipo": "documento",
            "titulo": "Diputación Badajoz",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dip-badajoz.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0075",
    "slug": "carlos-carlos-rodriguez",
    "nombre_completo": "Carlos Carlos Rodríguez",
    "alias": "Carlos Carlos",
    "cargo_actual": "Presidente de la Diputación de Cáceres",
    "partido": "PSOE",
    "foto_url": null,
    "bio_corta": "Político del PSOE. Presidente de la Diputación de Cáceres.",
    "tags": [
      "politico",
      "psoe",
      "diputacion-caceres",
      "extremadura"
    ],
    "fuente_principal": "https://www.dip-caceres.es",
    "apartados": [
      {
        "id": "dip-0075-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0075-ap-00-it-00",
            "apartado_id": "dip-0075-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político cacereño del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0075-ap-00-it-01",
            "apartado_id": "dip-0075-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0075-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0075-ap-01-it-00",
            "apartado_id": "dip-0075-ap-01",
            "tipo": "evento",
            "titulo": "Diputación 2019",
            "contenido": "Presidente desde 2019.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0075-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0075-ap-02-it-00",
            "apartado_id": "dip-0075-ap-02",
            "tipo": "contacto",
            "titulo": "PSOE Extremadura",
            "contenido": "**Federación regional**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psoe-ex",
              "sin-valorar"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0075-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0075-ap-03-it-00",
            "apartado_id": "dip-0075-ap-03",
            "tipo": "documento",
            "titulo": "Diputación Cáceres",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dip-caceres.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0076",
    "slug": "valentin-gonzalez-formoso",
    "nombre_completo": "Valentín González Formoso",
    "alias": "Valentín González Formoso",
    "cargo_actual": "Presidente de la Deputación da Coruña",
    "partido": "PSDEG",
    "foto_url": null,
    "bio_corta": "Político del PSdeG. Presidente de la Deputación da Coruña. Aspirante interno al liderazgo PSdeG.",
    "tags": [
      "politico",
      "psdeg",
      "diputacion-coruna",
      "galicia"
    ],
    "fuente_principal": "https://www.dacoruna.gal",
    "apartados": [
      {
        "id": "dip-0076-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0076-ap-00-it-00",
            "apartado_id": "dip-0076-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político gallego del PSdeG. Alcalde de As Pontes histórico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0076-ap-00-it-01",
            "apartado_id": "dip-0076-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0076-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0076-ap-01-it-00",
            "apartado_id": "dip-0076-ap-01",
            "tipo": "evento",
            "titulo": "As Pontes",
            "contenido": "Alcalde de As Pontes de García Rodríguez durante años.",
            "fecha": "2011-06-11",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0076-ap-01-it-01",
            "apartado_id": "dip-0076-ap-01",
            "tipo": "evento",
            "titulo": "Deputación 2019",
            "contenido": "Presidente desde 2019.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0076-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0076-ap-02-it-00",
            "apartado_id": "dip-0076-ap-02",
            "tipo": "dato",
            "titulo": "Transición justa - As Pontes",
            "contenido": "Voz pública sobre la transición justa del carbón en As Pontes (Endesa).",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "transicion-justa",
              "endesa"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0076-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0076-ap-03-it-00",
            "apartado_id": "dip-0076-ap-03",
            "tipo": "contacto",
            "titulo": "PSdeG",
            "contenido": "**Aspirante interno al liderazgo regional del PSdeG** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "psdeg",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0076-ap-03-it-01",
            "apartado_id": "dip-0076-ap-03",
            "tipo": "contacto",
            "titulo": "Xunta (Rueda) - oposición",
            "contenido": "**Oposición Xunta PP** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rueda",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0076-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0076-ap-04-it-00",
            "apartado_id": "dip-0076-ap-04",
            "tipo": "documento",
            "titulo": "Deputación Coruña",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.dacoruna.gal",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0077",
    "slug": "jose-tome-roca",
    "nombre_completo": "José Tomé Roca",
    "alias": "José Tomé",
    "cargo_actual": "Presidente de la Deputación de Lugo",
    "partido": "PSDEG",
    "foto_url": null,
    "bio_corta": "Político del PSdeG. Presidente de la Deputación de Lugo. Alcalde de Monforte de Lemos.",
    "tags": [
      "politico",
      "psdeg",
      "diputacion-lugo",
      "galicia"
    ],
    "fuente_principal": "https://www.deputacionlugo.gal",
    "apartados": [
      {
        "id": "dip-0077-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0077-ap-00-it-00",
            "apartado_id": "dip-0077-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político lucense del PSdeG. Alcalde de Monforte de Lemos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0077-ap-00-it-01",
            "apartado_id": "dip-0077-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0077-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0077-ap-01-it-00",
            "apartado_id": "dip-0077-ap-01",
            "tipo": "evento",
            "titulo": "Monforte de Lemos",
            "contenido": "Alcalde de Monforte.",
            "fecha": "2015-06-13",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0077-ap-01-it-01",
            "apartado_id": "dip-0077-ap-01",
            "tipo": "evento",
            "titulo": "Deputación 2019",
            "contenido": "Presidente desde 2019.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0077-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0077-ap-02-it-00",
            "apartado_id": "dip-0077-ap-02",
            "tipo": "contacto",
            "titulo": "BNG",
            "contenido": "**Pacto local con BNG** (nota +4/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bng",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0077-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0077-ap-03-it-00",
            "apartado_id": "dip-0077-ap-03",
            "tipo": "documento",
            "titulo": "Deputación Lugo",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.deputacionlugo.gal",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0078",
    "slug": "luis-menor-perez",
    "nombre_completo": "Luis Menor Pérez",
    "alias": "Luis Menor",
    "cargo_actual": "Presidente de la Deputación de Ourense",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Deputación de Ourense desde 2023. Sustituye a Manuel Baltar tras la era controvertida.",
    "tags": [
      "politico",
      "pp",
      "diputacion-ourense",
      "galicia"
    ],
    "fuente_principal": "https://www.depourense.es",
    "apartados": [
      {
        "id": "dip-0078-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0078-ap-00-it-00",
            "apartado_id": "dip-0078-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político ourensano del PP. Cargo presidencial reciente.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0078-ap-00-it-01",
            "apartado_id": "dip-0078-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0078-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0078-ap-01-it-00",
            "apartado_id": "dip-0078-ap-01",
            "tipo": "evento",
            "titulo": "Deputación 2023",
            "contenido": "Presidente desde julio 2023, sustituyendo a Manuel Baltar (PP).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0078-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0078-ap-02-it-00",
            "apartado_id": "dip-0078-ap-02",
            "tipo": "contacto",
            "titulo": "PP Galicia / Rueda",
            "contenido": "**Alineamiento con la Xunta tras la era Baltar**",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rueda",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0078-ap-02-it-01",
            "apartado_id": "dip-0078-ap-02",
            "tipo": "contacto",
            "titulo": "Manuel Baltar (ex)",
            "contenido": "**Predecesor controvertido** (nota -5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "baltar",
              "nota--5",
              "tension"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0078-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0078-ap-03-it-00",
            "apartado_id": "dip-0078-ap-03",
            "tipo": "documento",
            "titulo": "Deputación Ourense",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.depourense.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0079",
    "slug": "luis-lopez-dieguez",
    "nombre_completo": "Luis López Diéguez",
    "alias": "Luis López",
    "cargo_actual": "Presidente de la Deputación de Pontevedra",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Deputación de Pontevedra tras alternancia 2023.",
    "tags": [
      "politico",
      "pp",
      "diputacion-pontevedra",
      "galicia"
    ],
    "fuente_principal": "https://www.depo.gal",
    "apartados": [
      {
        "id": "dip-0079-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0079-ap-00-it-00",
            "apartado_id": "dip-0079-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político pontevedrés del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0079-ap-00-it-01",
            "apartado_id": "dip-0079-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0079-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0079-ap-01-it-00",
            "apartado_id": "dip-0079-ap-01",
            "tipo": "evento",
            "titulo": "Deputación 2023",
            "contenido": "Presidente desde julio 2023. Anterior: Carmela Silva (PSdeG).",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0079-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0079-ap-02-it-00",
            "apartado_id": "dip-0079-ap-02",
            "tipo": "contacto",
            "titulo": "Xunta / Rueda",
            "contenido": "**Coordinación con Xunta PP** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rueda",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0079-ap-02-it-01",
            "apartado_id": "dip-0079-ap-02",
            "tipo": "contacto",
            "titulo": "Vigo / Abel Caballero (PSOE)",
            "contenido": "**Tensión con el alcalde de Vigo (PSOE)** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "caballero",
              "vigo",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0079-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0079-ap-03-it-00",
            "apartado_id": "dip-0079-ap-03",
            "tipo": "documento",
            "titulo": "Deputación Pontevedra",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.depo.gal",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0080",
    "slug": "ramiro-gonzalez-vicente",
    "nombre_completo": "Ramiro González Vicente",
    "alias": "Ramiro González",
    "cargo_actual": "Diputado General de Álava",
    "partido": "PNV",
    "foto_url": null,
    "bio_corta": "Político del PNV. Diputado General de Álava (presidente de la Diputación Foral) desde 2015, reelegido en 2023. Régimen del Concierto Económico.",
    "tags": [
      "politico",
      "pnv",
      "diputacion-foral-alava",
      "euskadi",
      "regimen-foral"
    ],
    "fuente_principal": "https://www.araba.eus",
    "apartados": [
      {
        "id": "dip-0080-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0080-ap-00-it-00",
            "apartado_id": "dip-0080-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político alavés del PNV. Régimen foral con Concierto Económico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0080-ap-00-it-01",
            "apartado_id": "dip-0080-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0080-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0080-ap-01-it-00",
            "apartado_id": "dip-0080-ap-01",
            "tipo": "evento",
            "titulo": "Juntas Generales",
            "contenido": "Juntero histórico del PNV en Álava.",
            "fecha": "2007-06-16",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0080-ap-01-it-01",
            "apartado_id": "dip-0080-ap-01",
            "tipo": "evento",
            "titulo": "Diputado General 2015",
            "contenido": "Diputado General desde 2015, reelegido 2019 y 2023.",
            "fecha": "2015-06-29",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0080-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0080-ap-02-it-00",
            "apartado_id": "dip-0080-ap-02",
            "tipo": "dato",
            "titulo": "Concierto Económico",
            "contenido": "Defensa del Concierto. Negociación de cupo con Madrid.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "concierto"
            ],
            "orden": 0
          },
          {
            "id": "dip-0080-ap-02-it-01",
            "apartado_id": "dip-0080-ap-02",
            "tipo": "dato",
            "titulo": "Automoción Mercedes",
            "contenido": "Vínculo industrial con la planta de Mercedes-Benz Vitoria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mercedes"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0080-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0080-ap-03-it-00",
            "apartado_id": "dip-0080-ap-03",
            "tipo": "contacto",
            "titulo": "PNV / Pradales",
            "contenido": "**Coordinación con el Lehendakari** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pradales",
              "pnv",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0080-ap-03-it-01",
            "apartado_id": "dip-0080-ap-03",
            "tipo": "contacto",
            "titulo": "PSE (socio)",
            "contenido": "**Pacto PNV-PSE en Álava** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pse",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0080-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0080-ap-04-it-00",
            "apartado_id": "dip-0080-ap-04",
            "tipo": "documento",
            "titulo": "Araba",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.araba.eus",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0081",
    "slug": "elixabete-etxanobe-landajuela",
    "nombre_completo": "Elixabete Etxanobe Landajuela",
    "alias": "Etxanobe",
    "cargo_actual": "Diputada General de Bizkaia",
    "partido": "PNV",
    "foto_url": null,
    "bio_corta": "Política del PNV. Diputada General de Bizkaia desde 2023, sucediendo a Unai Rementeria. Trayectoria en la Diputación Foral.",
    "tags": [
      "politico",
      "pnv",
      "diputacion-foral-bizkaia",
      "euskadi",
      "regimen-foral"
    ],
    "fuente_principal": "https://www.bizkaia.eus",
    "apartados": [
      {
        "id": "dip-0081-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0081-ap-00-it-00",
            "apartado_id": "dip-0081-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Política vizcaína del PNV. Trayectoria foral.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0081-ap-00-it-01",
            "apartado_id": "dip-0081-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0081-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0081-ap-01-it-00",
            "apartado_id": "dip-0081-ap-01",
            "tipo": "evento",
            "titulo": "Diputación Foral - cargos previos",
            "contenido": "Diputada foral de Hacienda y Finanzas (era Rementeria).",
            "fecha": "2015-06-29",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0081-ap-01-it-01",
            "apartado_id": "dip-0081-ap-01",
            "tipo": "evento",
            "titulo": "Diputada General 2023",
            "contenido": "Diputada General desde julio 2023, sucediendo a Unai Rementeria.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0081-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0081-ap-02-it-00",
            "apartado_id": "dip-0081-ap-02",
            "tipo": "dato",
            "titulo": "Concierto Económico",
            "contenido": "Defensa activa del Concierto y la fiscalidad propia vizcaína.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "concierto"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0081-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0081-ap-03-it-00",
            "apartado_id": "dip-0081-ap-03",
            "tipo": "contacto",
            "titulo": "Imanol Pradales",
            "contenido": "**Lehendakari** — Pradales fue diputado foral en Bizkaia con Rementeria.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pradales",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0081-ap-03-it-01",
            "apartado_id": "dip-0081-ap-03",
            "tipo": "contacto",
            "titulo": "Unai Rementeria (predecesor)",
            "contenido": "**Predecesor en la Diputación** (nota -5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rementeria",
              "nota--5",
              "tension"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0081-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0081-ap-04-it-00",
            "apartado_id": "dip-0081-ap-04",
            "tipo": "documento",
            "titulo": "Bizkaia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.bizkaia.eus",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0082",
    "slug": "eider-mendoza-larranaga",
    "nombre_completo": "Eider Mendoza Larrañaga",
    "alias": "Eider Mendoza",
    "cargo_actual": "Diputada General de Gipuzkoa",
    "partido": "PNV",
    "foto_url": null,
    "bio_corta": "Política del PNV. Diputada General de Gipuzkoa desde 2023, sucediendo a Markel Olano.",
    "tags": [
      "politico",
      "pnv",
      "diputacion-foral-gipuzkoa",
      "euskadi",
      "regimen-foral"
    ],
    "fuente_principal": "https://www.gipuzkoa.eus",
    "apartados": [
      {
        "id": "dip-0082-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0082-ap-00-it-00",
            "apartado_id": "dip-0082-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Política guipuzcoana del PNV.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0082-ap-00-it-01",
            "apartado_id": "dip-0082-ap-00",
            "tipo": "dato",
            "titulo": "Poderes del presidente provincial",
            "contenido": "El presidente de la diputación dirige el gobierno provincial, preside el Pleno y la Junta de Gobierno, propone los vicepresidentes y nombra a los diputados delegados con áreas de gestión. Gestiona discrecionalmente los Planes Provinciales de Cooperación, una de las herramientas más codiciadas del clientelismo local. En las provincias gobernadas por su mismo partido, suele ser el principal operador territorial del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-presidente"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0082-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0082-ap-01-it-00",
            "apartado_id": "dip-0082-ap-01",
            "tipo": "evento",
            "titulo": "Diputación cargos previos",
            "contenido": "Cargos previos en la Diputación Foral con Markel Olano.",
            "fecha": "2015-06-29",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0082-ap-01-it-01",
            "apartado_id": "dip-0082-ap-01",
            "tipo": "evento",
            "titulo": "Diputada General 2023",
            "contenido": "Diputada General desde julio 2023.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0082-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0082-ap-02-it-00",
            "apartado_id": "dip-0082-ap-02",
            "tipo": "contacto",
            "titulo": "PNV / Pradales",
            "contenido": "**Coordinación con Lehendakari** (nota +7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "pradales",
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0082-ap-02-it-01",
            "apartado_id": "dip-0082-ap-02",
            "tipo": "contacto",
            "titulo": "EH Bildu - oposición",
            "contenido": "**EH Bildu fuerza principal de oposición en Gipuzkoa** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bildu",
              "nota--7",
              "conflicto"
            ],
            "orden": 1
          },
          {
            "id": "dip-0082-ap-02-it-02",
            "apartado_id": "dip-0082-ap-02",
            "tipo": "contacto",
            "titulo": "Markel Olano (predecesor)",
            "contenido": "**Predecesor PNV** (nota -5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "olano",
              "nota--5",
              "tension"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0082-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0082-ap-03-it-00",
            "apartado_id": "dip-0082-ap-03",
            "tipo": "documento",
            "titulo": "Gipuzkoa",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.gipuzkoa.eus",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0083",
    "slug": "juan-manuel-moreno-bonilla",
    "nombre_completo": "Juan Manuel Moreno Bonilla",
    "alias": "Juanma Moreno",
    "cargo_actual": "Presidente de la Junta de Andalucía",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Junta de Andalucía desde enero 2019 (primer presidente no PSOE en 36 años). Reelegido en 2022 con mayoría absoluta. Anteriormente Secretario de Estado de Servicios Sociales (Rajoy) y delegado del Gobierno en Madrid.",
    "tags": [
      "politico",
      "pp",
      "presidente-junta",
      "andalucia"
    ],
    "fuente_principal": "https://www.juntadeandalucia.es",
    "apartados": [
      {
        "id": "dip-0083-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0083-ap-00-it-00",
            "apartado_id": "dip-0083-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Nacido en Barcelona, 1970, criado en Málaga. Licenciado en Protocolo. Trayectoria PP-Andalucía completa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0083-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0083-ap-01-it-00",
            "apartado_id": "dip-0083-ap-01",
            "tipo": "evento",
            "titulo": "Diputado Congreso",
            "contenido": "Diputado del Congreso por Málaga (PP) 2000-2014.",
            "fecha": "2000-03-12",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0083-ap-01-it-01",
            "apartado_id": "dip-0083-ap-01",
            "tipo": "evento",
            "titulo": "Secretario Estado Rajoy",
            "contenido": "Secretario de Estado de Servicios Sociales con Rajoy 2014-2015.",
            "fecha": "2014-12-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "dip-0083-ap-01-it-02",
            "apartado_id": "dip-0083-ap-01",
            "tipo": "evento",
            "titulo": "Presidente PP-A",
            "contenido": "Presidente del PP-A desde 2014, encadenó liderazgo regional.",
            "fecha": "2014-03-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          },
          {
            "id": "dip-0083-ap-01-it-03",
            "apartado_id": "dip-0083-ap-01",
            "tipo": "evento",
            "titulo": "Presidente Junta 2019",
            "contenido": "Presidente Junta de Andalucía enero 2019 tras pacto con Cs y apoyo Vox.",
            "fecha": "2019-01-18",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 3
          },
          {
            "id": "dip-0083-ap-01-it-04",
            "apartado_id": "dip-0083-ap-01",
            "tipo": "evento",
            "titulo": "Mayoría absoluta 2022",
            "contenido": "Reelegido con mayoría absoluta sin necesidad de pactos en junio 2022.",
            "fecha": "2022-06-19",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 4
          }
        ]
      },
      {
        "id": "dip-0083-ap-02",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "dip-0083-ap-02-it-00",
            "apartado_id": "dip-0083-ap-02",
            "tipo": "dato",
            "titulo": "Centrismo Andaluz",
            "contenido": "Posición 'moreno-ismo': PP centrista, distancia con Vox, foco gestor. Referente interno del PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0083-ap-03",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0083-ap-03-it-00",
            "apartado_id": "dip-0083-ap-03",
            "tipo": "contacto",
            "titulo": "PP nacional / Feijóo",
            "contenido": "**Pulso interno por liderazgo PP** (nota +7/10) — Referente alternativo dentro del partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota-+7",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0083-ap-03-it-01",
            "apartado_id": "dip-0083-ap-03",
            "tipo": "contacto",
            "titulo": "Vox - distancia",
            "contenido": "**Sin pactos con Vox en 2022 tras mayoría absoluta** (nota +4/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0083-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0083-ap-04-it-00",
            "apartado_id": "dip-0083-ap-04",
            "tipo": "documento",
            "titulo": "Junta Andalucía",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.juntadeandalucia.es",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0084",
    "slug": "manuel-baltar",
    "nombre_completo": "Manuel Baltar Blanco",
    "alias": "Manuel Baltar",
    "cargo_actual": "Ex presidente de la Deputación de Ourense",
    "partido": "PP",
    "foto_url": null,
    "bio_corta": "Político del PP. Presidente de la Deputación de Ourense 2012-2023. Saga familiar (su padre José Luis Baltar también presidió). Salida 2023 tras tensiones internas con el PP gallego (Rueda).",
    "tags": [
      "politico",
      "pp",
      "ex-presidente-diputacion",
      "ourense"
    ],
    "fuente_principal": "https://es.wikipedia.org/wiki/Manuel_Baltar",
    "apartados": [
      {
        "id": "dip-0084-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0084-ap-00-it-00",
            "apartado_id": "dip-0084-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Político ourensano del PP. Saga familiar: hijo de José Luis Baltar Pumar, ex presidente Deputación 1990-2012.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0084-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0084-ap-01-it-00",
            "apartado_id": "dip-0084-ap-01",
            "tipo": "evento",
            "titulo": "Sucesión paterna",
            "contenido": "Sucede a su padre José Luis Baltar Pumar en 2012.",
            "fecha": "2012-07-23",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0084-ap-01-it-01",
            "apartado_id": "dip-0084-ap-01",
            "tipo": "evento",
            "titulo": "Era Baltar (12 años)",
            "contenido": "Reelegido 2015 y 2019. Marcado por polémicas mediáticas y conflicto interno PPdeG.",
            "fecha": "2019-07-04",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          },
          {
            "id": "dip-0084-ap-01-it-02",
            "apartado_id": "dip-0084-ap-01",
            "tipo": "evento",
            "titulo": "Salida 2023",
            "contenido": "Apartado del PPdeG tras tensiones con Alfonso Rueda. Luis Menor le sustituye.",
            "fecha": "2023-07-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0084-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0084-ap-02-it-00",
            "apartado_id": "dip-0084-ap-02",
            "tipo": "contacto",
            "titulo": "Saga Baltar",
            "contenido": "**Su padre presidió la Deputación 22 años (1990-2012)** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "saga",
              "baltar",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 0
          },
          {
            "id": "dip-0084-ap-02-it-01",
            "apartado_id": "dip-0084-ap-02",
            "tipo": "contacto",
            "titulo": "PPdeG (Rueda)",
            "contenido": "**Conflicto interno con la dirección PP-Galicia** (nota -8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "rueda",
              "conflicto",
              "nota--8"
            ],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0084-ap-03",
        "tipo": "controversias",
        "titulo": null,
        "resumen": null,
        "orden": 5,
        "items": [
          {
            "id": "dip-0084-ap-03-it-00",
            "apartado_id": "dip-0084-ap-03",
            "tipo": "evento",
            "titulo": "Polémicas mediáticas",
            "contenido": "Período Baltar marcado por declaraciones polémicas y exposición mediática elevada.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "mediatico"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0084-ap-04",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0084-ap-04-it-00",
            "apartado_id": "dip-0084-ap-04",
            "tipo": "documento",
            "titulo": "Wikipedia",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://es.wikipedia.org/wiki/Manuel_Baltar",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0085",
    "slug": "erc",
    "nombre_completo": "Esquerra Republicana de Catalunya",
    "alias": "ERC",
    "cargo_actual": "Partido político · izquierda independentista catalana",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Partido catalán de izquierda independentista. Fundado en 1931. Presidente: Oriol Junqueras. Apoyo parlamentario a Pedro Sánchez en el Congreso. Presidente Diputació de Lleida y Tarragona; pacto en Diba.",
    "tags": [
      "partido",
      "cataluna",
      "izquierda",
      "independentismo"
    ],
    "fuente_principal": "https://www.esquerra.cat",
    "apartados": [
      {
        "id": "dip-0085-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0085-ap-00-it-00",
            "apartado_id": "dip-0085-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "Esquerra Republicana de Catalunya (ERC), fundado en 1931 por Macià y Companys.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0085-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0085-ap-01-it-00",
            "apartado_id": "dip-0085-ap-01",
            "tipo": "evento",
            "titulo": "Procés 2017",
            "contenido": "Junqueras y Romeva encarcelados tras DUI 2017. Indultos 2021.",
            "fecha": "2017-10-27",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0085-ap-01-it-01",
            "apartado_id": "dip-0085-ap-01",
            "tipo": "evento",
            "titulo": "Apoyo parlamentario Sánchez",
            "contenido": "Apoyo a investidura Sánchez 2019, 2020, 2023.",
            "fecha": "2019-01-08",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0085-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0085-ap-02-it-00",
            "apartado_id": "dip-0085-ap-02",
            "tipo": "contacto",
            "titulo": "Oriol Junqueras",
            "contenido": "**Presidente del partido** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "junqueras",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0085-ap-02-it-01",
            "apartado_id": "dip-0085-ap-02",
            "tipo": "contacto",
            "titulo": "Pere Aragonès",
            "contenido": "**Ex president de la Generalitat (2021-2024)** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "aragones",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 1
          },
          {
            "id": "dip-0085-ap-02-it-02",
            "apartado_id": "dip-0085-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez / PSOE",
            "contenido": "**Socio parlamentario crítico** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0085-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0085-ap-03-it-00",
            "apartado_id": "dip-0085-ap-03",
            "tipo": "documento",
            "titulo": "ERC",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.esquerra.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0086",
    "slug": "junts",
    "nombre_completo": "Junts per Catalunya",
    "alias": "Junts",
    "cargo_actual": "Partido político · derecha independentista catalana",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Partido catalán de centro-derecha independentista. Heredero de Convergència (CDC/CiU). Líder: Carles Puigdemont (en Waterloo, Bélgica). Presidente de la Diputació de Girona.",
    "tags": [
      "partido",
      "cataluna",
      "independentismo",
      "centro-derecha"
    ],
    "fuente_principal": "https://www.junts.cat",
    "apartados": [
      {
        "id": "dip-0086-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0086-ap-00-it-00",
            "apartado_id": "dip-0086-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "Junts per Catalunya, refundado 2020 separándose del PDeCAT. Continuidad histórica con CDC/CiU.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0086-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0086-ap-01-it-00",
            "apartado_id": "dip-0086-ap-01",
            "tipo": "evento",
            "titulo": "Procés - Puigdemont",
            "contenido": "Carles Puigdemont president 2016-2017. Tras DUI 2017 huye a Bruselas.",
            "fecha": "2017-10-30",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          },
          {
            "id": "dip-0086-ap-01-it-01",
            "apartado_id": "dip-0086-ap-01",
            "tipo": "evento",
            "titulo": "Amnistía 2024",
            "contenido": "Apoya investidura Sánchez 2023 a cambio de amnistía (aprobada 2024).",
            "fecha": "2024-05-30",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 1
          }
        ]
      },
      {
        "id": "dip-0086-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0086-ap-02-it-00",
            "apartado_id": "dip-0086-ap-02",
            "tipo": "contacto",
            "titulo": "Carles Puigdemont",
            "contenido": "**Líder histórico** — Domicilio en Waterloo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "puigdemont",
              "sin-valorar"
            ],
            "orden": 0
          },
          {
            "id": "dip-0086-ap-02-it-01",
            "apartado_id": "dip-0086-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez - amnistía",
            "contenido": "**Socio negociador clave 2023-2024** (nota +5/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "sanchez",
              "amnistia",
              "nota-+5",
              "alianza-debil"
            ],
            "orden": 1
          },
          {
            "id": "dip-0086-ap-02-it-02",
            "apartado_id": "dip-0086-ap-02",
            "tipo": "contacto",
            "titulo": "Generalitat (oposición)",
            "contenido": "**Oposición a Illa (PSC) tras 2024** (nota -7/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "illa",
              "nota--7",
              "conflicto"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0086-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0086-ap-03-it-00",
            "apartado_id": "dip-0086-ap-03",
            "tipo": "documento",
            "titulo": "Junts",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.junts.cat",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  },
  {
    "id": "dip-0087",
    "slug": "psdeg",
    "nombre_completo": "Partido dos Socialistas de Galicia",
    "alias": "PSdeG-PSOE",
    "cargo_actual": "Partido político · federación gallega del PSOE",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Federación gallega del PSOE. Histórica oposición al PPdeG en la Xunta. Secretario general: José Ramón Gómez Besteiro. Preside la Deputación da Coruña y la Deputación de Lugo.",
    "tags": [
      "partido",
      "galicia",
      "psoe-familia"
    ],
    "fuente_principal": "https://www.psdeg-psoe.com",
    "apartados": [
      {
        "id": "dip-0087-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "dip-0087-ap-00-it-00",
            "apartado_id": "dip-0087-ap-00",
            "tipo": "dato",
            "titulo": "Datos básicos",
            "contenido": "PSdeG-PSOE, federación gallega del PSOE.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0087-ap-01",
        "tipo": "trayectoria",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "dip-0087-ap-01-it-00",
            "apartado_id": "dip-0087-ap-01",
            "tipo": "evento",
            "titulo": "Sucesión líderes",
            "contenido": "Pachi Vázquez, Caballero, Gonzalo Caballero, Valentín González Formoso, Besteiro.",
            "fecha": "2009-01-01",
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "dip-0087-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 3,
        "items": [
          {
            "id": "dip-0087-ap-02-it-00",
            "apartado_id": "dip-0087-ap-02",
            "tipo": "contacto",
            "titulo": "Valentín González Formoso",
            "contenido": "**Presidente Deputación A Coruña** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "formoso",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 0
          },
          {
            "id": "dip-0087-ap-02-it-01",
            "apartado_id": "dip-0087-ap-02",
            "tipo": "contacto",
            "titulo": "José Tomé Roca",
            "contenido": "**Presidente Deputación Lugo** (nota +8/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "tome",
              "nota-+8",
              "alianza-fuerte"
            ],
            "orden": 1
          },
          {
            "id": "dip-0087-ap-02-it-02",
            "apartado_id": "dip-0087-ap-02",
            "tipo": "contacto",
            "titulo": "BNG - alianzas",
            "contenido": "**Pactos puntuales locales con BNG** (nota +4/10)",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "bng",
              "nota-+4",
              "alianza-debil"
            ],
            "orden": 2
          }
        ]
      },
      {
        "id": "dip-0087-ap-03",
        "tipo": "evidencia",
        "titulo": null,
        "resumen": null,
        "orden": 6,
        "items": [
          {
            "id": "dip-0087-ap-03-it-00",
            "apartado_id": "dip-0087-ap-03",
            "tipo": "documento",
            "titulo": "PSdeG",
            "contenido": "",
            "fecha": null,
            "fuente_url": "https://www.psdeg-psoe.com",
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T14:30:45.487448Z",
    "updated_at": "2026-05-28T14:30:45.487448Z"
  }
]

export const DIPUTACIONES_RESUMEN: DossierResumen[] = DIPUTACIONES_FIXTURE.map(d => ({
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

export function getDIPBySlug(slug: string): DossierCompleto | null {
  return DIPUTACIONES_FIXTURE.find(d => d.slug === slug) ?? null
}
