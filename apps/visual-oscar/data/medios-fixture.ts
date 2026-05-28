// AUTO-GENERADO desde data/medios/medios.json · ver bin/gen_medios.py
// Mapa del poder mediático: periodistas, directores, presentadores y
// tertulianos, con su RELACIÓN CON LOS PODERES DEL ESTADO (Gobierno,
// oposición, judicatura) ± y la razón según cómo encuadran las noticias.
// Las relaciones apuntan a nodos resolubles (Sánchez/Feijóo/Fiscalía) y
// se convierten en aristas del grafo. Caracterización por línea editorial
// pública del medio + rol observable (no juicios privados).
// Re-generar: python3 bin/gen_medios.py && python3 bin/gen_subfixture.py --source medios

import type {
  DossierCompleto,
  DossierResumen,
} from './dosieres-fixture'

export const MEDIOS_FIXTURE: DossierCompleto[] = [
  {
    "id": "med-0001",
    "slug": "antonio-maestre",
    "nombre_completo": "Antonio Maestre",
    "alias": null,
    "cargo_actual": "Columnista y tertuliano · laSexta · elDiario.es",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista y tertuliano de laSexta · elDiario.es. Línea: Izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0001-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0001-ap-00-it-00",
            "apartado_id": "med-0001-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista y tertuliano de laSexta · elDiario.es. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0001-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0001-ap-01-it-00",
            "apartado_id": "med-0001-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo de combate de izquierdas; foco en denunciar a la derecha y la ultraderecha y en el discurso de memoria democrática.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0001-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0001-ap-02-it-00",
            "apartado_id": "med-0001-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +5/10) — Defiende al Ejecutivo de coalición frente a la derecha, aunque le exige por la izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0001-ap-02-it-01",
            "apartado_id": "med-0001-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -8/10) — Encuadra a PP y Vox como una amenaza democrática; tono frontal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0002",
    "slug": "cristina-fallaras",
    "nombre_completo": "Cristina Fallarás",
    "alias": null,
    "cargo_actual": "Escritora y tertuliana · Tertulias · redes",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Escritora y tertuliana de Tertulias · redes. Línea: Izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0002-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0002-ap-00-it-00",
            "apartado_id": "med-0002-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Escritora y tertuliana de Tertulias · redes. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0002-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0002-ap-01-it-00",
            "apartado_id": "med-0002-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Feminismo y memoria; framing de denuncia social y antifascista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0002-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0002-ap-02-it-00",
            "apartado_id": "med-0002-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +5/10) — Afín al bloque progresista; crítica a la derecha mediática.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0002-ap-02-it-01",
            "apartado_id": "med-0002-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -7/10) — Confrontación directa con PP/Vox y la prensa conservadora.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0003",
    "slug": "jesus-marana",
    "nombre_completo": "Jesús Maraña",
    "alias": null,
    "cargo_actual": "Director editorial · InfoLibre",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director editorial de InfoLibre. Línea: Centro-izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0003-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0003-ap-00-it-00",
            "apartado_id": "med-0003-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director editorial de InfoLibre. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0003-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0003-ap-01-it-00",
            "apartado_id": "med-0003-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo de investigación; framing anticorrupción con foco también en el poder económico.",
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
        "id": "med-0003-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0003-ap-02-it-00",
            "apartado_id": "med-0003-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Línea progresista pero con investigaciones que también incomodan al Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0003-ap-02-it-01",
            "apartado_id": "med-0003-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -4/10) — Crítico con la gestión y los casos de corrupción de la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0004",
    "slug": "ana-pardo-de-vera",
    "nombre_completo": "Ana Pardo de Vera",
    "alias": null,
    "cargo_actual": "Periodista y tertuliana · Público · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliana de Público · tertulias. Línea: Izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0004-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0004-ap-00-it-00",
            "apartado_id": "med-0004-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliana de Público · tertulias. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0004-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0004-ap-01-it-00",
            "apartado_id": "med-0004-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Framing de izquierdas, muy beligerante con la derecha mediática y judicial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0004-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0004-ap-02-it-00",
            "apartado_id": "med-0004-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +5/10) — Defensora del bloque de investidura progresista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0004-ap-02-it-01",
            "apartado_id": "med-0004-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -8/10) — Encuadra a la derecha y a parte de la judicatura como bloque reaccionario.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0005",
    "slug": "angels-barcelo",
    "nombre_completo": "Àngels Barceló",
    "alias": null,
    "cargo_actual": "Directora y presentadora · Cadena SER · Hora 25",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Directora y presentadora de Cadena SER · Hora 25. Línea: Centro-izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0005-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0005-ap-00-it-00",
            "apartado_id": "med-0005-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Directora y presentadora de Cadena SER · Hora 25. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0005-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0005-ap-01-it-00",
            "apartado_id": "med-0005-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tono institucional de centro-izquierda; entrevistas incisivas a ambos lados.",
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
        "id": "med-0005-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0005-ap-02-it-00",
            "apartado_id": "med-0005-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Sintonía editorial con la SER, percibida como afín al Gobierno, pero con entrevistas exigentes.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0005-ap-02-it-01",
            "apartado_id": "med-0005-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -2/10) — Crítica pero abierta al diálogo con la oposición.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0006",
    "slug": "inaki-gabilondo",
    "nombre_completo": "Iñaki Gabilondo",
    "alias": null,
    "cargo_actual": "Periodista de referencia · SER (histórico)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de referencia de SER (histórico). Línea: Centro-izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0006-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0006-ap-00-it-00",
            "apartado_id": "med-0006-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de referencia de SER (histórico). Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0006-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0006-ap-01-it-00",
            "apartado_id": "med-0006-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis reposado e institucionalista; defensa del consenso constitucional.",
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
        "id": "med-0006-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0006-ap-02-it-00",
            "apartado_id": "med-0006-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Cercanía de fondo al progresismo, pero crítico con los excesos de cualquier poder.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0006-ap-02-it-01",
            "apartado_id": "med-0006-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -2/10) — Crítico con la deriva dura de la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0007",
    "slug": "jordi-evole",
    "nombre_completo": "Jordi Évole",
    "alias": null,
    "cargo_actual": "Presentador y entrevistador · laSexta · Salvados",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador y entrevistador de laSexta · Salvados. Línea: Izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0007-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0007-ap-00-it-00",
            "apartado_id": "med-0007-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador y entrevistador de laSexta · Salvados. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0007-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0007-ap-01-it-00",
            "apartado_id": "med-0007-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Entrevista incisiva y reportaje social; incómodo para todos, más duro con la derecha y los poderes económicos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0007-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0007-ap-02-it-00",
            "apartado_id": "med-0007-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +1/10) — Crítico con el Gobierno pero su foco social conecta con el espacio progresista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0007-ap-02-it-01",
            "apartado_id": "med-0007-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -3/10) — Cuestiona con dureza a la derecha y la ultraderecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0008",
    "slug": "ana-pastor-periodista",
    "nombre_completo": "Ana Pastor",
    "alias": null,
    "cargo_actual": "Presentadora y verificadora · laSexta · Newtral",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora y verificadora de laSexta · Newtral. Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0008-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0008-ap-00-it-00",
            "apartado_id": "med-0008-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora y verificadora de laSexta · Newtral. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0008-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0008-ap-01-it-00",
            "apartado_id": "med-0008-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo de datos y fact-checking; incisiva con todos los partidos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0008-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0008-ap-02-it-00",
            "apartado_id": "med-0008-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Verificación equidistante; tensa con el Gobierno cuando hay bulos o opacidad.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0008-ap-02-it-01",
            "apartado_id": "med-0008-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -1/10) — Igualmente exigente con la oposición; foco en desmentir desinformación.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0009",
    "slug": "silvia-intxaurrondo",
    "nombre_completo": "Silvia Intxaurrondo",
    "alias": null,
    "cargo_actual": "Presentadora · TVE · La Hora de La 1",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de TVE · La Hora de La 1. Línea: Centro-izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0009-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0009-ap-00-it-00",
            "apartado_id": "med-0009-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de TVE · La Hora de La 1. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0009-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0009-ap-01-it-00",
            "apartado_id": "med-0009-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Entrevista de contraste de datos; viral por corregir cifras a líderes de la oposición.",
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
        "id": "med-0009-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0009-ap-02-it-00",
            "apartado_id": "med-0009-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +4/10) — Percibida como afín a la TVE de la etapa actual; trato más amable al Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0009-ap-02-it-01",
            "apartado_id": "med-0009-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -5/10) — Encuadres y verificaciones que han tensado con el PP y Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0010",
    "slug": "xabier-fortes",
    "nombre_completo": "Xabier Fortes",
    "alias": null,
    "cargo_actual": "Presentador · TVE · La Noche en 24h",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de TVE · La Noche en 24h. Línea: Centro-izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0010-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0010-ap-00-it-00",
            "apartado_id": "med-0010-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de TVE · La Noche en 24h. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0010-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0010-ap-01-it-00",
            "apartado_id": "med-0010-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Debate político con tono crítico hacia la derecha; defensa del servicio público.",
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
        "id": "med-0010-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0010-ap-02-it-00",
            "apartado_id": "med-0010-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +4/10) — Línea editorial afín a la TVE actual.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0010-ap-02-it-01",
            "apartado_id": "med-0010-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -5/10) — Choques recurrentes con tertulianos y dirigentes de la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0011",
    "slug": "javier-ruiz-periodista",
    "nombre_completo": "Javier Ruiz",
    "alias": null,
    "cargo_actual": "Periodista económico y tertuliano · Cadena SER · Cuatro",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista económico y tertuliano de Cadena SER · Cuatro. Línea: Izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0011-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0011-ap-00-it-00",
            "apartado_id": "med-0011-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista económico y tertuliano de Cadena SER · Cuatro. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0011-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0011-ap-01-it-00",
            "apartado_id": "med-0011-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis económico de izquierdas; foco en desigualdad y grandes empresas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0011-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0011-ap-02-it-00",
            "apartado_id": "med-0011-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Sintonía con las políticas sociales del Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0011-ap-02-it-01",
            "apartado_id": "med-0011-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -4/10) — Crítico con la agenda fiscal de la derecha y del poder económico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0012",
    "slug": "inaki-lopez",
    "nombre_completo": "Iñaki López",
    "alias": null,
    "cargo_actual": "Presentador · laSexta · Más Vale Tarde",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de laSexta · Más Vale Tarde. Línea: Izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0012-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0012-ap-00-it-00",
            "apartado_id": "med-0012-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de laSexta · Más Vale Tarde. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0012-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0012-ap-01-it-00",
            "apartado_id": "med-0012-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Magacín político de tarde con tono crítico con la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0012-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0012-ap-02-it-00",
            "apartado_id": "med-0012-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Encuadre afín al espacio progresista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0012-ap-02-it-01",
            "apartado_id": "med-0012-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -4/10) — Tertulia y enfoque adversos a PP/Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0013",
    "slug": "cristina-pardo",
    "nombre_completo": "Cristina Pardo",
    "alias": null,
    "cargo_actual": "Presentadora · laSexta · Más Vale Tarde",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de laSexta · Más Vale Tarde. Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0013-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0013-ap-00-it-00",
            "apartado_id": "med-0013-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de laSexta · Más Vale Tarde. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0013-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0013-ap-01-it-00",
            "apartado_id": "med-0013-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tono irónico y desmitificador; pincha a todos los partidos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0013-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0013-ap-02-it-00",
            "apartado_id": "med-0013-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Ironía transversal sin alineamiento marcado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0014",
    "slug": "ernesto-ekaizer",
    "nombre_completo": "Ernesto Ekaizer",
    "alias": null,
    "cargo_actual": "Periodista de investigación · Investigación · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de investigación de Investigación · tertulias. Línea: Izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0014-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0014-ap-00-it-00",
            "apartado_id": "med-0014-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de investigación de Investigación · tertulias. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0014-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0014-ap-01-it-00",
            "apartado_id": "med-0014-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Investigación financiera y judicial; foco en cloacas del Estado y corrupción de la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "izquierda"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0014-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0014-ap-02-it-00",
            "apartado_id": "med-0014-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Crítico con poderes económicos; su foco recae más en la derecha y el 'deep state'.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          },
          {
            "id": "med-0014-ap-02-it-01",
            "apartado_id": "med-0014-ap-02",
            "tipo": "contacto",
            "titulo": "Álvaro García Ortiz",
            "contenido": "**Poder judicial / Fiscalía** (nota -3/10) — Denuncia el 'lawfare' y la actuación de sectores de la judicatura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0015",
    "slug": "carlos-franganillo",
    "nombre_completo": "Carlos Franganillo",
    "alias": null,
    "cargo_actual": "Presentador de informativos · Telecinco · Informativos (ex-TVE)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de informativos de Telecinco · Informativos (ex-TVE). Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0015-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0015-ap-00-it-00",
            "apartado_id": "med-0015-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de informativos de Telecinco · Informativos (ex-TVE). Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0015-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0015-ap-01-it-00",
            "apartado_id": "med-0015-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Informativo clásico, tono institucional y neutro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0015-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0015-ap-02-it-00",
            "apartado_id": "med-0015-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Cobertura institucional sin alineamiento editorial marcado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0016",
    "slug": "sonsoles-onega",
    "nombre_completo": "Sonsoles Ónega",
    "alias": null,
    "cargo_actual": "Presentadora · Antena 3 · Y ahora Sonsoles",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de Antena 3 · Y ahora Sonsoles. Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0016-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0016-ap-00-it-00",
            "apartado_id": "med-0016-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de Antena 3 · Y ahora Sonsoles. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0016-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0016-ap-01-it-00",
            "apartado_id": "med-0016-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Magacín de tarde de actualidad y sucesos; política tratada de forma generalista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0016-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0016-ap-02-it-00",
            "apartado_id": "med-0016-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Sin línea política marcada; formato magacín.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0017",
    "slug": "susanna-griso",
    "nombre_completo": "Susanna Griso",
    "alias": null,
    "cargo_actual": "Presentadora · Antena 3 · Espejo Público",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de Antena 3 · Espejo Público. Línea: Centro-derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0017-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0017-ap-00-it-00",
            "apartado_id": "med-0017-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de Antena 3 · Espejo Público. Línea: Centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0017-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0017-ap-01-it-00",
            "apartado_id": "med-0017-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Magacín matinal con tertulia plural escorada al centro-derecha; entrevistas exigentes al Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro-derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0017-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0017-ap-02-it-00",
            "apartado_id": "med-0017-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -2/10) — Entrevistas y tertulias frecuentemente críticas con el Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          },
          {
            "id": "med-0017-ap-02-it-01",
            "apartado_id": "med-0017-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota +1/10) — Trato más cómodo con dirigentes del centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0018",
    "slug": "matias-prats",
    "nombre_completo": "Matías Prats",
    "alias": null,
    "cargo_actual": "Presentador de informativos · Antena 3 · Informativos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de informativos de Antena 3 · Informativos. Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0018-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0018-ap-00-it-00",
            "apartado_id": "med-0018-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de informativos de Antena 3 · Informativos. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0018-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0018-ap-01-it-00",
            "apartado_id": "med-0018-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Informativo clásico; neutralidad y humor sobrio.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0018-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0018-ap-02-it-00",
            "apartado_id": "med-0018-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Cobertura institucional neutra.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0019",
    "slug": "helena-resano",
    "nombre_completo": "Helena Resano",
    "alias": null,
    "cargo_actual": "Presentadora de informativos · laSexta · Informativos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de informativos de laSexta · Informativos. Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0019-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0019-ap-00-it-00",
            "apartado_id": "med-0019-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de informativos de laSexta · Informativos. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0019-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0019-ap-01-it-00",
            "apartado_id": "med-0019-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Informativo riguroso; tono neutro pese a la marca laSexta.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0019-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0019-ap-02-it-00",
            "apartado_id": "med-0019-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Cobertura informativa sin alineamiento explícito.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0020",
    "slug": "jordi-juan",
    "nombre_completo": "Jordi Juan",
    "alias": null,
    "cargo_actual": "Director · La Vanguardia",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de La Vanguardia. Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0020-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0020-ap-00-it-00",
            "apartado_id": "med-0020-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de La Vanguardia. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0020-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0020-ap-01-it-00",
            "apartado_id": "med-0020-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Línea catalanista moderada y centrista; defensa del diálogo Cataluña-Estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0020-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0020-ap-02-it-00",
            "apartado_id": "med-0020-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +1/10) — Apoyo editorial a la vía del diálogo y a la agenda de distensión territorial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0021",
    "slug": "albert-saez",
    "nombre_completo": "Albert Sáez",
    "alias": null,
    "cargo_actual": "Director · El Periódico de Catalunya",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de El Periódico de Catalunya. Línea: Centro-izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0021-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0021-ap-00-it-00",
            "apartado_id": "med-0021-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de El Periódico de Catalunya. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0021-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0021-ap-01-it-00",
            "apartado_id": "med-0021-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Centro-izquierda catalán; framing favorable a la desjudicialización del 'procés'.",
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
        "id": "med-0021-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0021-ap-02-it-00",
            "apartado_id": "med-0021-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Apoyo a la política de indultos y distensión del Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0022",
    "slug": "jose-antonio-zarzalejos",
    "nombre_completo": "José Antonio Zarzalejos",
    "alias": null,
    "cargo_actual": "Columnista · El Confidencial (ex-ABC)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista de El Confidencial (ex-ABC). Línea: Centro-derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0022-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0022-ap-00-it-00",
            "apartado_id": "med-0022-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista de El Confidencial (ex-ABC). Línea: Centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0022-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0022-ap-01-it-00",
            "apartado_id": "med-0022-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis conservador-liberal crítico tanto con el sanchismo como con la deriva de la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro-derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0022-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0022-ap-02-it-00",
            "apartado_id": "med-0022-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -3/10) — Crítico con la gestión y los pactos del Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          },
          {
            "id": "med-0022-ap-02-it-01",
            "apartado_id": "med-0022-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -1/10) — También crítico con la estrategia del PP y con Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0023",
    "slug": "ignacio-camacho",
    "nombre_completo": "Ignacio Camacho",
    "alias": null,
    "cargo_actual": "Columnista de referencia · ABC",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista de referencia de ABC. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0023-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0023-ap-00-it-00",
            "apartado_id": "med-0023-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista de referencia de ABC. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0023-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0023-ap-01-it-00",
            "apartado_id": "med-0023-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Prosa conservadora; encuadre del sanchismo como degradación institucional.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0023-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0023-ap-02-it-00",
            "apartado_id": "med-0023-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Columnas sistemáticamente críticas con el Gobierno y sus socios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          },
          {
            "id": "med-0023-ap-02-it-01",
            "apartado_id": "med-0023-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota +3/10) — Más comprensivo con el centro-derecha, al que también exige firmeza.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0024",
    "slug": "arcadi-espada",
    "nombre_completo": "Arcadi Espada",
    "alias": null,
    "cargo_actual": "Columnista · El Mundo",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista de El Mundo. Línea: Derecha liberal.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-liberal"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0024-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0024-ap-00-it-00",
            "apartado_id": "med-0024-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista de El Mundo. Línea: Derecha liberal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0024-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0024-ap-01-it-00",
            "apartado_id": "med-0024-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Antinacionalista radical; encuadre muy duro del sanchismo y del independentismo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-liberal"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0024-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0024-ap-02-it-00",
            "apartado_id": "med-0024-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -7/10) — Crítica frontal a los pactos con el independentismo y a la amnistía.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0025",
    "slug": "carlos-cuesta-periodista",
    "nombre_completo": "Carlos Cuesta",
    "alias": null,
    "cargo_actual": "Periodista y tertuliano · OKDiario · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliano de OKDiario · tertulias. Línea: Derecha dura.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-dura"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0025-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0025-ap-00-it-00",
            "apartado_id": "med-0025-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliano de OKDiario · tertulias. Línea: Derecha dura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0025-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0025-ap-01-it-00",
            "apartado_id": "med-0025-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Framing anti-Gobierno muy agresivo; amplificación de causas judiciales contra el entorno del Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-dura"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0025-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0025-ap-02-it-00",
            "apartado_id": "med-0025-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -9/10) — Encuadre hostil sistemático; difusión de informaciones contra el Gobierno y su entorno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          },
          {
            "id": "med-0025-ap-02-it-01",
            "apartado_id": "med-0025-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota +5/10) — Sintonía con el discurso del PP y Vox.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0026",
    "slug": "isabel-san-sebastian",
    "nombre_completo": "Isabel San Sebastián",
    "alias": null,
    "cargo_actual": "Escritora y tertuliana · ABC · tertulias TVE",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Escritora y tertuliana de ABC · tertulias TVE. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0026-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0026-ap-00-it-00",
            "apartado_id": "med-0026-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Escritora y tertuliana de ABC · tertulias TVE. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0026-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0026-ap-01-it-00",
            "apartado_id": "med-0026-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertuliana conservadora; encuadre del Gobierno como amenaza a la unidad de España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0026-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0026-ap-02-it-00",
            "apartado_id": "med-0026-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -8/10) — Confrontación frontal con el Ejecutivo y sus socios nacionalistas.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0027",
    "slug": "antonio-naranjo",
    "nombre_completo": "Antonio Naranjo",
    "alias": null,
    "cargo_actual": "Periodista y tertuliano · esRadio · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliano de esRadio · tertulias. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0027-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0027-ap-00-it-00",
            "apartado_id": "med-0027-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliano de esRadio · tertulias. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0027-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0027-ap-01-it-00",
            "apartado_id": "med-0027-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertulia de derecha combativa; framing anti-sanchista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0027-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0027-ap-02-it-00",
            "apartado_id": "med-0027-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -8/10) — Discurso hostil al Gobierno en radio y televisión.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0028",
    "slug": "carmen-morodo",
    "nombre_completo": "Carmen Morodo",
    "alias": null,
    "cargo_actual": "Directora adjunta / análisis político · La Razón",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Directora adjunta / análisis político de La Razón. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0028-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0028-ap-00-it-00",
            "apartado_id": "med-0028-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Directora adjunta / análisis político de La Razón. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0028-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0028-ap-01-it-00",
            "apartado_id": "med-0028-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis político conservador alineado con la línea de La Razón.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0028-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0028-ap-02-it-00",
            "apartado_id": "med-0028-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Encuadre crítico con la estrategia del Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          },
          {
            "id": "med-0028-ap-02-it-01",
            "apartado_id": "med-0028-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota +3/10) — Cercanía editorial al PP.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0029",
    "slug": "julian-quiros",
    "nombre_completo": "Julián Quirós",
    "alias": null,
    "cargo_actual": "Director · ABC",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de ABC. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0029-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0029-ap-00-it-00",
            "apartado_id": "med-0029-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de ABC. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0029-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0029-ap-01-it-00",
            "apartado_id": "med-0029-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Línea conservadora y monárquica; defensa de la unidad de España y crítica al sanchismo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0029-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0029-ap-02-it-00",
            "apartado_id": "med-0029-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Editoriales críticos con el Gobierno y los pactos de investidura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          },
          {
            "id": "med-0029-ap-02-it-01",
            "apartado_id": "med-0029-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota +4/10) — Afinidad editorial con el centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0030",
    "slug": "casimiro-garcia-abadillo",
    "nombre_completo": "Casimiro García-Abadillo",
    "alias": null,
    "cargo_actual": "Director · El Independiente (ex-El Mundo)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de El Independiente (ex-El Mundo). Línea: Centro-derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0030-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0030-ap-00-it-00",
            "apartado_id": "med-0030-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de El Independiente (ex-El Mundo). Línea: Centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0030-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0030-ap-01-it-00",
            "apartado_id": "med-0030-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo de centro-derecha con foco en investigación política.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro-derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0030-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0030-ap-02-it-00",
            "apartado_id": "med-0030-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -5/10) — Crítico con la gestión del Ejecutivo; coberturas incómodas para Moncloa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0031",
    "slug": "jesus-cacho",
    "nombre_completo": "Jesús Cacho",
    "alias": null,
    "cargo_actual": "Fundador y columnista · Vozpópuli",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Fundador y columnista de Vozpópuli. Línea: Derecha económica.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-economica"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0031-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0031-ap-00-it-00",
            "apartado_id": "med-0031-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Fundador y columnista de Vozpópuli. Línea: Derecha económica.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0031-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0031-ap-01-it-00",
            "apartado_id": "med-0031-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo económico anti-establishment; encuadre del Gobierno como amenaza a la economía de mercado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-economica"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0031-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0031-ap-02-it-00",
            "apartado_id": "med-0031-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -7/10) — Crítica frontal a la política económica e institucional del Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0032",
    "slug": "alvaro-nieto",
    "nombre_completo": "Álvaro Nieto",
    "alias": null,
    "cargo_actual": "Director · The Objective",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de The Objective. Línea: Derecha liberal.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-liberal"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0032-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0032-ap-00-it-00",
            "apartado_id": "med-0032-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de The Objective. Línea: Derecha liberal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0032-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0032-ap-01-it-00",
            "apartado_id": "med-0032-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Línea liberal-conservadora; framing crítico con el Gobierno y exclusivas que le incomodan.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-liberal"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0032-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0032-ap-02-it-00",
            "apartado_id": "med-0032-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Investigaciones y editoriales adversos al Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0033",
    "slug": "ketty-garat",
    "nombre_completo": "Ketty Garat",
    "alias": null,
    "cargo_actual": "Periodista y tertuliana · The Objective · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliana de The Objective · tertulias. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0033-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0033-ap-00-it-00",
            "apartado_id": "med-0033-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliana de The Objective · tertulias. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0033-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0033-ap-01-it-00",
            "apartado_id": "med-0033-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertuliana de derecha; encuadre anti-sanchista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0033-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0033-ap-02-it-00",
            "apartado_id": "med-0033-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Discurso crítico con el Gobierno en platós.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0034",
    "slug": "luis-herrero",
    "nombre_completo": "Luis Herrero",
    "alias": null,
    "cargo_actual": "Periodista y tertuliano · esRadio · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliano de esRadio · tertulias. Línea: Derecha liberal.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-liberal"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0034-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0034-ap-00-it-00",
            "apartado_id": "med-0034-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliano de esRadio · tertulias. Línea: Derecha liberal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0034-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0034-ap-01-it-00",
            "apartado_id": "med-0034-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Liberal-conservador; análisis crítico con el Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-liberal"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0034-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0034-ap-02-it-00",
            "apartado_id": "med-0034-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Línea editorial de esRadio, hostil al Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0035",
    "slug": "dieter-brandau",
    "nombre_completo": "Dieter Brandau",
    "alias": null,
    "cargo_actual": "Presentador · esRadio",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de esRadio. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0035-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0035-ap-00-it-00",
            "apartado_id": "med-0035-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de esRadio. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0035-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0035-ap-01-it-00",
            "apartado_id": "med-0035-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Radio de derecha liberal; framing anti-Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0035-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0035-ap-02-it-00",
            "apartado_id": "med-0035-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -7/10) — Tono editorial hostil al Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0036",
    "slug": "graciano-palomo",
    "nombre_completo": "Graciano Palomo",
    "alias": null,
    "cargo_actual": "Periodista y tertuliano · Tertulias · El Distrito",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliano de Tertulias · El Distrito. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0036-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0036-ap-00-it-00",
            "apartado_id": "med-0036-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliano de Tertulias · El Distrito. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0036-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0036-ap-01-it-00",
            "apartado_id": "med-0036-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertuliano conservador; encuadre anti-sanchista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0036-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0036-ap-02-it-00",
            "apartado_id": "med-0036-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Discurso crítico con el Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0037",
    "slug": "salvador-sostres",
    "nombre_completo": "Salvador Sostres",
    "alias": null,
    "cargo_actual": "Columnista · ABC",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista de ABC. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0037-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0037-ap-00-it-00",
            "apartado_id": "med-0037-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista de ABC. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0037-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0037-ap-01-it-00",
            "apartado_id": "med-0037-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Columnismo provocador y monárquico; muy crítico con el independentismo y el Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0037-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0037-ap-02-it-00",
            "apartado_id": "med-0037-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -5/10) — Encuadre adverso a los pactos del Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0038",
    "slug": "rosa-belmonte",
    "nombre_completo": "Rosa Belmonte",
    "alias": null,
    "cargo_actual": "Columnista · ABC",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista de ABC. Línea: Derecha.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0038-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0038-ap-00-it-00",
            "apartado_id": "med-0038-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista de ABC. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0038-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0038-ap-01-it-00",
            "apartado_id": "med-0038-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Columna irónica conservadora; crítica desde el humor al Gobierno y la cultura progre.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0038-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0038-ap-02-it-00",
            "apartado_id": "med-0038-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -4/10) — Crítica satírica recurrente al Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0039",
    "slug": "bieito-rubido",
    "nombre_completo": "Bieito Rubido",
    "alias": null,
    "cargo_actual": "Director · El Debate (ex-ABC)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de El Debate (ex-ABC). Línea: Derecha conservadora.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-conservadora"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0039-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0039-ap-00-it-00",
            "apartado_id": "med-0039-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de El Debate (ex-ABC). Línea: Derecha conservadora.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0039-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0039-ap-01-it-00",
            "apartado_id": "med-0039-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Línea conservadora y católica; defensa de la unidad de España.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-conservadora"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0039-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0039-ap-02-it-00",
            "apartado_id": "med-0039-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Editoriales muy críticos con el Gobierno de coalición.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          },
          {
            "id": "med-0039-ap-02-it-01",
            "apartado_id": "med-0039-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota +3/10) — Afinidad con el espacio de la derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 1
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0040",
    "slug": "alfonso-rojo",
    "nombre_completo": "Alfonso Rojo",
    "alias": null,
    "cargo_actual": "Director · Periodista Digital",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de Periodista Digital. Línea: Derecha dura.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-dura"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0040-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0040-ap-00-it-00",
            "apartado_id": "med-0040-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de Periodista Digital. Línea: Derecha dura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0040-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0040-ap-01-it-00",
            "apartado_id": "med-0040-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo de derecha muy beligerante; titulares de ataque al Gobierno.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-dura"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0040-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0040-ap-02-it-00",
            "apartado_id": "med-0040-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -8/10) — Encuadre hostil sistemático al Ejecutivo y sus socios.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0041",
    "slug": "javier-negre",
    "nombre_completo": "Javier Negre",
    "alias": null,
    "cargo_actual": "Director · EDATV",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de EDATV. Línea: Derecha dura.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-dura"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0041-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0041-ap-00-it-00",
            "apartado_id": "med-0041-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de EDATV. Línea: Derecha dura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0041-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0041-ap-01-it-00",
            "apartado_id": "med-0041-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Medio digital ultraderechista; framing de confrontación con el Gobierno y la izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-dura"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0041-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0041-ap-02-it-00",
            "apartado_id": "med-0041-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -9/10) — Línea de oposición frontal y activismo contra el Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0042",
    "slug": "ramon-perez-maura",
    "nombre_completo": "Ramón Pérez-Maura",
    "alias": null,
    "cargo_actual": "Columnista · ABC · El Debate",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista de ABC · El Debate. Línea: Derecha conservadora.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "derecha-conservadora"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0042-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0042-ap-00-it-00",
            "apartado_id": "med-0042-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista de ABC · El Debate. Línea: Derecha conservadora.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0042-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0042-ap-01-it-00",
            "apartado_id": "med-0042-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Conservadurismo atlantista y monárquico; crítica al sanchismo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "derecha-conservadora"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0042-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0042-ap-02-it-00",
            "apartado_id": "med-0042-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Encuadre adverso al Gobierno y sus pactos.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0043",
    "slug": "ruben-amon",
    "nombre_completo": "Rubén Amón",
    "alias": null,
    "cargo_actual": "Columnista y tertuliano · El Confidencial · SER",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista y tertuliano de El Confidencial · SER. Línea: Liberal.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "liberal"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0043-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0043-ap-00-it-00",
            "apartado_id": "med-0043-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista y tertuliano de El Confidencial · SER. Línea: Liberal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0043-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0043-ap-01-it-00",
            "apartado_id": "med-0043-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Liberal heterodoxo; crítico con todos los bloques, antinacionalista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "liberal"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0043-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0043-ap-02-it-00",
            "apartado_id": "med-0043-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -2/10) — Crítico con los pactos del Ejecutivo, sin alineamiento de partido.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0044",
    "slug": "antonio-cano",
    "nombre_completo": "Antonio Caño",
    "alias": null,
    "cargo_actual": "Periodista y columnista · Ex-director de El País",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y columnista de Ex-director de El País. Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0044-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0044-ap-00-it-00",
            "apartado_id": "med-0044-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y columnista de Ex-director de El País. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0044-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0044-ap-01-it-00",
            "apartado_id": "med-0044-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Liberal centrista; crítico con el giro de PRISA y con el sanchismo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0044-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0044-ap-02-it-00",
            "apartado_id": "med-0044-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -3/10) — Crítico con la deriva del Gobierno y de su antiguo periódico.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "negativa"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0045",
    "slug": "fernando-garea",
    "nombre_completo": "Fernando Garea",
    "alias": null,
    "cargo_actual": "Periodista político · Agencias · El Confidencial (ex-EFE)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista político de Agencias · El Confidencial (ex-EFE). Línea: Centro.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0045-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0045-ap-00-it-00",
            "apartado_id": "med-0045-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista político de Agencias · El Confidencial (ex-EFE). Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0045-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0045-ap-01-it-00",
            "apartado_id": "med-0045-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Información política de centro; rigurosa con todos los bloques.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "centro"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0045-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0045-ap-02-it-00",
            "apartado_id": "med-0045-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Cobertura equilibrada; tensiones puntuales por la gestión informativa.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  },
  {
    "id": "med-0046",
    "slug": "mamen-mendizabal",
    "nombre_completo": "Mamen Mendizábal",
    "alias": null,
    "cargo_actual": "Periodista y presentadora · laSexta (histórico)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y presentadora de laSexta (histórico). Línea: Centro-izquierda.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "centro-izquierda"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0046-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0046-ap-00-it-00",
            "apartado_id": "med-0046-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y presentadora de laSexta (histórico). Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0046-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0046-ap-01-it-00",
            "apartado_id": "med-0046-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Entrevista social de centro-izquierda; foco en derechos y desigualdad.",
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
        "id": "med-0046-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0046-ap-02-it-00",
            "apartado_id": "med-0046-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Sensibilidad afín a las políticas sociales del Ejecutivo.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "poderes-estado",
              "positiva"
            ],
            "orden": 0
          }
        ]
      }
    ],
    "created_at": "2026-05-28T23:03:38.648135Z",
    "updated_at": "2026-05-28T23:03:38.648135Z"
  }
]

export const MEDIOS_RESUMEN: DossierResumen[] = MEDIOS_FIXTURE.map(d => ({
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

export function getMEDBySlug(slug: string): DossierCompleto | null {
  return MEDIOS_FIXTURE.find(d => d.slug === slug) ?? null
}
