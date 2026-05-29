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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0047",
    "slug": "lucia-mendez",
    "nombre_completo": "Lucía Méndez",
    "alias": null,
    "cargo_actual": "Columnista política · El Mundo",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista política de El Mundo. Línea: Centro.",
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
        "id": "med-0047-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0047-ap-00-it-00",
            "apartado_id": "med-0047-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista política de El Mundo. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0047-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0047-ap-01-it-00",
            "apartado_id": "med-0047-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis político de fondo; crítica con todos los partidos, sin alineamiento de bloque.",
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
        "id": "med-0047-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0047-ap-02-it-00",
            "apartado_id": "med-0047-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -1/10) — Crítica con la comunicación y los pactos del Ejecutivo, pero no militante.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0048",
    "slug": "esther-palomera",
    "nombre_completo": "Esther Palomera",
    "alias": null,
    "cargo_actual": "Columnista y tertuliana · elDiario.es · laSexta",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista y tertuliana de elDiario.es · laSexta. Línea: Centro-izquierda.",
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
        "id": "med-0048-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0048-ap-00-it-00",
            "apartado_id": "med-0048-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista y tertuliana de elDiario.es · laSexta. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0048-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0048-ap-01-it-00",
            "apartado_id": "med-0048-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis de centro-izquierda; foco en regeneración y crítica a la derecha.",
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
        "id": "med-0048-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0048-ap-02-it-00",
            "apartado_id": "med-0048-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Defensa del bloque progresista, con exigencia.",
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
            "id": "med-0048-ap-02-it-01",
            "apartado_id": "med-0048-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -4/10) — Crítica con la estrategia del PP y Vox.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0049",
    "slug": "montserrat-dominguez",
    "nombre_completo": "Montserrat Domínguez",
    "alias": null,
    "cargo_actual": "Periodista · Cadena SER (ex-HuffPost)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de Cadena SER (ex-HuffPost). Línea: Centro-izquierda.",
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
        "id": "med-0049-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0049-ap-00-it-00",
            "apartado_id": "med-0049-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de Cadena SER (ex-HuffPost). Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0049-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0049-ap-01-it-00",
            "apartado_id": "med-0049-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo de centro-izquierda; agenda social y de derechos.",
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
        "id": "med-0049-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0049-ap-02-it-00",
            "apartado_id": "med-0049-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Sintonía con la agenda progresista.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0050",
    "slug": "aimar-bretos",
    "nombre_completo": "Aimar Bretos",
    "alias": null,
    "cargo_actual": "Presentador · Cadena SER · Hora 25",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de Cadena SER · Hora 25. Línea: Centro-izquierda.",
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
        "id": "med-0050-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0050-ap-00-it-00",
            "apartado_id": "med-0050-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de Cadena SER · Hora 25. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0050-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0050-ap-01-it-00",
            "apartado_id": "med-0050-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Informativo nocturno de la SER; entrevistas incisivas a ambos lados.",
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
        "id": "med-0050-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0050-ap-02-it-00",
            "apartado_id": "med-0050-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Línea editorial de la SER, percibida afín, con entrevistas exigentes.",
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
            "id": "med-0050-ap-02-it-01",
            "apartado_id": "med-0050-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -2/10) — Crítico pero abierto a la oposición.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0051",
    "slug": "carles-francino",
    "nombre_completo": "Carles Francino",
    "alias": null,
    "cargo_actual": "Presentador · Cadena SER · La Ventana",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de Cadena SER · La Ventana. Línea: Centro-izquierda.",
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
        "id": "med-0051-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0051-ap-00-it-00",
            "apartado_id": "med-0051-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de Cadena SER · La Ventana. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0051-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0051-ap-01-it-00",
            "apartado_id": "med-0051-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Magacín de tarde reposado; sensibilidad progresista.",
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
        "id": "med-0051-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0051-ap-02-it-00",
            "apartado_id": "med-0051-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Tono afín al espacio de centro-izquierda.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0052",
    "slug": "gonzalo-miro",
    "nombre_completo": "Gonzalo Miró",
    "alias": null,
    "cargo_actual": "Tertuliano · Tertulias TV",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Tertuliano de Tertulias TV. Línea: Izquierda.",
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
        "id": "med-0052-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0052-ap-00-it-00",
            "apartado_id": "med-0052-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Tertuliano de Tertulias TV. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0052-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0052-ap-01-it-00",
            "apartado_id": "med-0052-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertuliano de izquierdas; defensa del Gobierno frente a la derecha.",
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
        "id": "med-0052-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0052-ap-02-it-00",
            "apartado_id": "med-0052-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Defensor del Ejecutivo en los platós.",
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
            "id": "med-0052-ap-02-it-01",
            "apartado_id": "med-0052-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -5/10) — Confrontación con tertulianos de derecha.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0053",
    "slug": "bob-pop",
    "nombre_completo": "Bob Pop (Roberto Enríquez)",
    "alias": null,
    "cargo_actual": "Escritor y comentarista · laSexta · cultura",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Escritor y comentarista de laSexta · cultura. Línea: Izquierda.",
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
        "id": "med-0053-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0053-ap-00-it-00",
            "apartado_id": "med-0053-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Escritor y comentarista de laSexta · cultura. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0053-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0053-ap-01-it-00",
            "apartado_id": "med-0053-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Mirada cultural de izquierdas, crítica con la derecha y la ultraderecha.",
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
        "id": "med-0053-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0053-ap-02-it-00",
            "apartado_id": "med-0053-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Afín al espacio progresista.",
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
            "id": "med-0053-ap-02-it-01",
            "apartado_id": "med-0053-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -5/10) — Sátira y crítica a la derecha.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0054",
    "slug": "fernando-berlin",
    "nombre_completo": "Fernando Berlín",
    "alias": null,
    "cargo_actual": "Director · Radiocable",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de Radiocable. Línea: Izquierda.",
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
        "id": "med-0054-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0054-ap-00-it-00",
            "apartado_id": "med-0054-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de Radiocable. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0054-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0054-ap-01-it-00",
            "apartado_id": "med-0054-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Radio digital de izquierdas; framing antiderecha.",
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
        "id": "med-0054-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0054-ap-02-it-00",
            "apartado_id": "med-0054-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +4/10) — Apoyo claro al bloque progresista.",
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
            "id": "med-0054-ap-02-it-01",
            "apartado_id": "med-0054-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -6/10) — Crítica frontal a PP y Vox.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0055",
    "slug": "javier-gallego",
    "nombre_completo": "Javier Gallego",
    "alias": null,
    "cargo_actual": "Director y presentador · Carne Cruda",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director y presentador de Carne Cruda. Línea: Izquierda.",
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
        "id": "med-0055-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0055-ap-00-it-00",
            "apartado_id": "med-0055-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director y presentador de Carne Cruda. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0055-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0055-ap-01-it-00",
            "apartado_id": "med-0055-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo independiente de izquierdas; foco en derechos sociales y crítica al poder económico.",
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
        "id": "med-0055-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0055-ap-02-it-00",
            "apartado_id": "med-0055-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Próximo al espacio progresista, exigente por la izquierda.",
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
            "id": "med-0055-ap-02-it-01",
            "apartado_id": "med-0055-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota -6/10) — Crítica a la derecha y la ultraderecha.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0056",
    "slug": "nativel-preciado",
    "nombre_completo": "Nativel Preciado",
    "alias": null,
    "cargo_actual": "Escritora y periodista · Tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Escritora y periodista de Tertulias. Línea: Izquierda.",
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
        "id": "med-0056-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0056-ap-00-it-00",
            "apartado_id": "med-0056-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Escritora y periodista de Tertulias. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0056-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0056-ap-01-it-00",
            "apartado_id": "med-0056-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Veterana de izquierdas; defensa de la memoria democrática.",
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
        "id": "med-0056-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0056-ap-02-it-00",
            "apartado_id": "med-0056-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Afín al espacio progresista.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0057",
    "slug": "monica-carrillo",
    "nombre_completo": "Mónica Carrillo",
    "alias": null,
    "cargo_actual": "Presentadora · Antena 3 · Informativos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de Antena 3 · Informativos. Línea: Centro.",
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
        "id": "med-0057-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0057-ap-00-it-00",
            "apartado_id": "med-0057-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de Antena 3 · Informativos. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0057-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0057-ap-01-it-00",
            "apartado_id": "med-0057-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Informativo clásico; tono neutro.",
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
        "id": "med-0057-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0057-ap-02-it-00",
            "apartado_id": "med-0057-ap-02",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0058",
    "slug": "sandra-golpe",
    "nombre_completo": "Sandra Golpe",
    "alias": null,
    "cargo_actual": "Presentadora · Antena 3 · Antena 3 Noticias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de Antena 3 · Antena 3 Noticias. Línea: Centro.",
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
        "id": "med-0058-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0058-ap-00-it-00",
            "apartado_id": "med-0058-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de Antena 3 · Antena 3 Noticias. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0058-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0058-ap-01-it-00",
            "apartado_id": "med-0058-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Informativo de máxima audiencia; tono neutral.",
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
        "id": "med-0058-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0058-ap-02-it-00",
            "apartado_id": "med-0058-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Cobertura institucional sin alineamiento marcado.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0059",
    "slug": "jose-ribagorda",
    "nombre_completo": "José Ribagorda",
    "alias": null,
    "cargo_actual": "Presentador · Telecinco · Informativos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de Telecinco · Informativos. Línea: Centro.",
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
        "id": "med-0059-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0059-ap-00-it-00",
            "apartado_id": "med-0059-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de Telecinco · Informativos. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0059-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0059-ap-01-it-00",
            "apartado_id": "med-0059-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Informativo de fin de semana; tono sobrio.",
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
        "id": "med-0059-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0059-ap-02-it-00",
            "apartado_id": "med-0059-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Cobertura neutra.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0060",
    "slug": "manu-marlasca",
    "nombre_completo": "Manu Marlasca",
    "alias": null,
    "cargo_actual": "Periodista de investigación · laSexta · sucesos",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de investigación de laSexta · sucesos. Línea: Centro.",
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
        "id": "med-0060-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0060-ap-00-it-00",
            "apartado_id": "med-0060-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de investigación de laSexta · sucesos. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0060-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0060-ap-01-it-00",
            "apartado_id": "med-0060-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Especialista en sucesos y tribunales; enfoque factual.",
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
        "id": "med-0060-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0060-ap-02-it-00",
            "apartado_id": "med-0060-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Cobertura judicial y de sucesos sin sesgo político marcado.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0061",
    "slug": "ana-terradillos",
    "nombre_completo": "Ana Terradillos",
    "alias": null,
    "cargo_actual": "Presentadora y tertuliana · Telecinco · COPE",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora y tertuliana de Telecinco · COPE. Línea: Centro-derecha.",
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
        "id": "med-0061-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0061-ap-00-it-00",
            "apartado_id": "med-0061-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora y tertuliana de Telecinco · COPE. Línea: Centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0061-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0061-ap-01-it-00",
            "apartado_id": "med-0061-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Entrevista y tertulia escorada al centro-derecha; exigente con el Gobierno.",
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
        "id": "med-0061-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0061-ap-02-it-00",
            "apartado_id": "med-0061-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -3/10) — Coberturas y entrevistas críticas con el Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0062",
    "slug": "pilar-garcia-muniz",
    "nombre_completo": "Pilar García Muñiz",
    "alias": null,
    "cargo_actual": "Presentadora · COPE (ex-TVE)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de COPE (ex-TVE). Línea: Centro-derecha.",
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
        "id": "med-0062-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0062-ap-00-it-00",
            "apartado_id": "med-0062-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de COPE (ex-TVE). Línea: Centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0062-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0062-ap-01-it-00",
            "apartado_id": "med-0062-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Mañanas de COPE; tono conservador moderado.",
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
        "id": "med-0062-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0062-ap-02-it-00",
            "apartado_id": "med-0062-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -3/10) — Línea editorial de COPE, crítica con el Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0063",
    "slug": "juan-pablo-colmenarejo",
    "nombre_completo": "Juan Pablo Colmenarejo",
    "alias": null,
    "cargo_actual": "Presentador · Onda Madrid · COPE",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de Onda Madrid · COPE. Línea: Derecha.",
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
        "id": "med-0063-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0063-ap-00-it-00",
            "apartado_id": "med-0063-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de Onda Madrid · COPE. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0063-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0063-ap-01-it-00",
            "apartado_id": "med-0063-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Radio conservadora; framing crítico con el Gobierno.",
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
        "id": "med-0063-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0063-ap-02-it-00",
            "apartado_id": "med-0063-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Tono editorial adverso al Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0064",
    "slug": "emilia-landaluce",
    "nombre_completo": "Emilia Landaluce",
    "alias": null,
    "cargo_actual": "Columnista · El Mundo",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista de El Mundo. Línea: Derecha.",
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
        "id": "med-0064-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0064-ap-00-it-00",
            "apartado_id": "med-0064-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista de El Mundo. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0064-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0064-ap-01-it-00",
            "apartado_id": "med-0064-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Columnismo conservador; crítica al sanchismo.",
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
        "id": "med-0064-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0064-ap-02-it-00",
            "apartado_id": "med-0064-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Columnas adversas al Gobierno.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0065",
    "slug": "isabel-duran-periodista",
    "nombre_completo": "Isabel Durán",
    "alias": null,
    "cargo_actual": "Periodista y tertuliana · TVE · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliana de TVE · tertulias. Línea: Derecha.",
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
        "id": "med-0065-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0065-ap-00-it-00",
            "apartado_id": "med-0065-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliana de TVE · tertulias. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0065-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0065-ap-01-it-00",
            "apartado_id": "med-0065-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertuliana conservadora; encuadre anti-sanchista.",
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
        "id": "med-0065-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0065-ap-02-it-00",
            "apartado_id": "med-0065-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -7/10) — Discurso hostil al Ejecutivo en platós.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0066",
    "slug": "antonio-jimenez-trece",
    "nombre_completo": "Antonio Jiménez",
    "alias": null,
    "cargo_actual": "Director y presentador · TRECE · El Cascabel",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director y presentador de TRECE · El Cascabel. Línea: Derecha.",
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
        "id": "med-0066-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0066-ap-00-it-00",
            "apartado_id": "med-0066-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director y presentador de TRECE · El Cascabel. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0066-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0066-ap-01-it-00",
            "apartado_id": "med-0066-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertulia de la cadena de la Iglesia; framing conservador anti-Gobierno.",
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
        "id": "med-0066-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0066-ap-02-it-00",
            "apartado_id": "med-0066-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -7/10) — Línea editorial de TRECE, crítica con el Ejecutivo.",
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
            "id": "med-0066-ap-02-it-01",
            "apartado_id": "med-0066-ap-02",
            "tipo": "contacto",
            "titulo": "Alberto Núñez Feijóo",
            "contenido": "**Oposición (PP)** (nota +4/10) — Sintonía con el centro-derecha.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0067",
    "slug": "alfonso-merlos",
    "nombre_completo": "Alfonso Merlos",
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
        "id": "med-0067-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0067-ap-00-it-00",
            "apartado_id": "med-0067-ap-00",
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
        "id": "med-0067-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0067-ap-01-it-00",
            "apartado_id": "med-0067-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertuliano de derecha combativa; framing anti-Gobierno.",
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
        "id": "med-0067-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0067-ap-02-it-00",
            "apartado_id": "med-0067-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -7/10) — Discurso hostil al Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0068",
    "slug": "cake-minuesa",
    "nombre_completo": "Cake Minuesa",
    "alias": null,
    "cargo_actual": "Comunicador · Digital · redes",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Comunicador de Digital · redes. Línea: Derecha dura.",
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
        "id": "med-0068-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0068-ap-00-it-00",
            "apartado_id": "med-0068-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Comunicador de Digital · redes. Línea: Derecha dura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0068-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0068-ap-01-it-00",
            "apartado_id": "med-0068-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Activista-comunicador de derecha radical; vídeos de confrontación con el Gobierno y la izquierda.",
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
        "id": "med-0068-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0068-ap-02-it-00",
            "apartado_id": "med-0068-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -9/10) — Activismo de oposición frontal al Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0069",
    "slug": "javier-garcia-isac",
    "nombre_completo": "Javier García Isac",
    "alias": null,
    "cargo_actual": "Director · Radio Ya · Decisión Radio",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director de Radio Ya · Decisión Radio. Línea: Derecha dura.",
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
        "id": "med-0069-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0069-ap-00-it-00",
            "apartado_id": "med-0069-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director de Radio Ya · Decisión Radio. Línea: Derecha dura.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0069-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0069-ap-01-it-00",
            "apartado_id": "med-0069-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Radio de derecha radical; framing de confrontación total con el Gobierno.",
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
        "id": "med-0069-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0069-ap-02-it-00",
            "apartado_id": "med-0069-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -9/10) — Línea de oposición frontal y constante al Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0070",
    "slug": "ana-samboal",
    "nombre_completo": "Ana Samboal",
    "alias": null,
    "cargo_actual": "Presentadora · El Toro TV",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentadora de El Toro TV. Línea: Derecha.",
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
        "id": "med-0070-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0070-ap-00-it-00",
            "apartado_id": "med-0070-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentadora de El Toro TV. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0070-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0070-ap-01-it-00",
            "apartado_id": "med-0070-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Entrevista y análisis de derecha; crítica al sanchismo.",
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
        "id": "med-0070-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0070-ap-02-it-00",
            "apartado_id": "med-0070-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -7/10) — Encuadre adverso al Gobierno.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0071",
    "slug": "federico-quevedo",
    "nombre_completo": "Federico Quevedo",
    "alias": null,
    "cargo_actual": "Periodista y tertuliano · El Debate · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliano de El Debate · tertulias. Línea: Derecha.",
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
        "id": "med-0071-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0071-ap-00-it-00",
            "apartado_id": "med-0071-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliano de El Debate · tertulias. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0071-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0071-ap-01-it-00",
            "apartado_id": "med-0071-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Tertuliano conservador; framing anti-Gobierno.",
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
        "id": "med-0071-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0071-ap-02-it-00",
            "apartado_id": "med-0071-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Discurso crítico con el Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0072",
    "slug": "pablo-planas",
    "nombre_completo": "Pablo Planas",
    "alias": null,
    "cargo_actual": "Periodista · Libertad Digital",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de Libertad Digital. Línea: Derecha.",
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
        "id": "med-0072-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0072-ap-00-it-00",
            "apartado_id": "med-0072-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de Libertad Digital. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0072-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0072-ap-01-it-00",
            "apartado_id": "med-0072-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo liberal-conservador anti-sanchista.",
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
        "id": "med-0072-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0072-ap-02-it-00",
            "apartado_id": "med-0072-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Línea editorial de Libertad Digital, hostil al Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0073",
    "slug": "daniel-lacalle",
    "nombre_completo": "Daniel Lacalle",
    "alias": null,
    "cargo_actual": "Economista y comentarista · Economía · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Economista y comentarista de Economía · tertulias. Línea: Derecha liberal.",
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
        "id": "med-0073-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0073-ap-00-it-00",
            "apartado_id": "med-0073-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Economista y comentarista de Economía · tertulias. Línea: Derecha liberal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0073-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0073-ap-01-it-00",
            "apartado_id": "med-0073-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Economista liberal; crítica frontal a la política económica y fiscal del Gobierno.",
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
        "id": "med-0073-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0073-ap-02-it-00",
            "apartado_id": "med-0073-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -7/10) — Encuadre muy crítico con el intervencionismo, los impuestos y el gasto del Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0074",
    "slug": "juan-ramon-rallo",
    "nombre_completo": "Juan Ramón Rallo",
    "alias": null,
    "cargo_actual": "Economista y divulgador · Economía · YouTube",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Economista y divulgador de Economía · YouTube. Línea: Derecha liberal.",
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
        "id": "med-0074-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0074-ap-00-it-00",
            "apartado_id": "med-0074-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Economista y divulgador de Economía · YouTube. Línea: Derecha liberal.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0074-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0074-ap-01-it-00",
            "apartado_id": "med-0074-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Economista libertario; crítica a la intervención del Estado y al gasto público.",
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
        "id": "med-0074-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0074-ap-02-it-00",
            "apartado_id": "med-0074-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -6/10) — Crítica sistemática a la política económica del Gobierno desde el liberalismo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0075",
    "slug": "gonzalo-bernardos",
    "nombre_completo": "Gonzalo Bernardos",
    "alias": null,
    "cargo_actual": "Economista y tertuliano · Economía · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Economista y tertuliano de Economía · tertulias. Línea: Centro-izquierda.",
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
        "id": "med-0075-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0075-ap-00-it-00",
            "apartado_id": "med-0075-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Economista y tertuliano de Economía · tertulias. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0075-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0075-ap-01-it-00",
            "apartado_id": "med-0075-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Economista mediático; defensa de buena parte de la política económica del Gobierno.",
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
        "id": "med-0075-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0075-ap-02-it-00",
            "apartado_id": "med-0075-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +4/10) — Valoración favorable de la gestión económica del Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0076",
    "slug": "jose-carlos-diez",
    "nombre_completo": "José Carlos Díez",
    "alias": null,
    "cargo_actual": "Economista · Economía · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Economista de Economía · tertulias. Línea: Centro-izquierda.",
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
        "id": "med-0076-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0076-ap-00-it-00",
            "apartado_id": "med-0076-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Economista de Economía · tertulias. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0076-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0076-ap-01-it-00",
            "apartado_id": "med-0076-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Economista de sensibilidad socialdemócrata.",
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
        "id": "med-0076-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0076-ap-02-it-00",
            "apartado_id": "med-0076-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +3/10) — Sintonía con la orientación económica del Gobierno.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0077",
    "slug": "jordi-baste",
    "nombre_completo": "Jordi Basté",
    "alias": null,
    "cargo_actual": "Director y presentador · RAC1 · El Món a RAC1",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Director y presentador de RAC1 · El Món a RAC1. Línea: catalanista.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "catalanista"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0077-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0077-ap-00-it-00",
            "apartado_id": "med-0077-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Director y presentador de RAC1 · El Món a RAC1. Línea: catalanista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0077-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0077-ap-01-it-00",
            "apartado_id": "med-0077-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Radio catalana líder; catalanismo moderado, crítico con la judicialización del 'procés'.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "catalanista"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0077-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0077-ap-02-it-00",
            "apartado_id": "med-0077-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +1/10) — Favorable a la vía del diálogo y la desjudicialización.",
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
            "id": "med-0077-ap-02-it-01",
            "apartado_id": "med-0077-ap-02",
            "tipo": "contacto",
            "titulo": "Álvaro García Ortiz",
            "contenido": "**Poder judicial / Fiscalía** (nota -3/10) — Crítico con la actuación judicial sobre el independentismo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0078",
    "slug": "josep-cuni",
    "nombre_completo": "Josep Cuní",
    "alias": null,
    "cargo_actual": "Periodista · SER Catalunya (histórico)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de SER Catalunya (histórico). Línea: catalanista.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "catalanista"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0078-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0078-ap-00-it-00",
            "apartado_id": "med-0078-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de SER Catalunya (histórico). Línea: catalanista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0078-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0078-ap-01-it-00",
            "apartado_id": "med-0078-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Catalanismo de centro; defensa del diálogo Cataluña-Estado.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "catalanista"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0078-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0078-ap-02-it-00",
            "apartado_id": "med-0078-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +1/10) — Favorable a la distensión territorial.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0079",
    "slug": "monica-terribas",
    "nombre_completo": "Mònica Terribas",
    "alias": null,
    "cargo_actual": "Periodista · TV3 · SER (histórico)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de TV3 · SER (histórico). Línea: soberanista.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "soberanista"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0079-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0079-ap-00-it-00",
            "apartado_id": "med-0079-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de TV3 · SER (histórico). Línea: soberanista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0079-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0079-ap-01-it-00",
            "apartado_id": "med-0079-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Periodismo soberanista catalán; crítica con el Estado en el conflicto territorial.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "soberanista"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0079-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0079-ap-02-it-00",
            "apartado_id": "med-0079-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -1/10) — Crítica con el Estado en lo territorial, pese a valorar la distensión.",
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
            "id": "med-0079-ap-02-it-01",
            "apartado_id": "med-0079-ap-02",
            "tipo": "contacto",
            "titulo": "Álvaro García Ortiz",
            "contenido": "**Poder judicial / Fiscalía** (nota -4/10) — Denuncia de la judicialización del independentismo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0080",
    "slug": "vicent-sanchis",
    "nombre_completo": "Vicent Sanchis",
    "alias": null,
    "cargo_actual": "Periodista · TV3 (ex-director)",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de TV3 (ex-director). Línea: soberanista.",
    "tags": [
      "medios",
      "periodista",
      "mediatico",
      "poder-mediatico",
      "soberanista"
    ],
    "fuente_principal": null,
    "apartados": [
      {
        "id": "med-0080-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0080-ap-00-it-00",
            "apartado_id": "med-0080-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de TV3 (ex-director). Línea: soberanista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0080-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0080-ap-01-it-00",
            "apartado_id": "med-0080-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Director histórico de TV3; línea soberanista.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [
              "soberanista"
            ],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0080-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0080-ap-02-it-00",
            "apartado_id": "med-0080-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -2/10) — Crítico con el Estado en el marco del 'procés'.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0081",
    "slug": "gloria-lomana",
    "nombre_completo": "Gloria Lomana",
    "alias": null,
    "cargo_actual": "Periodista · Ex-Antena 3 · análisis",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de Ex-Antena 3 · análisis. Línea: Centro-derecha.",
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
        "id": "med-0081-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0081-ap-00-it-00",
            "apartado_id": "med-0081-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de Ex-Antena 3 · análisis. Línea: Centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0081-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0081-ap-01-it-00",
            "apartado_id": "med-0081-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis de centro-derecha; foco en liderazgo y comunicación política.",
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
        "id": "med-0081-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0081-ap-02-it-00",
            "apartado_id": "med-0081-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -2/10) — Mirada crítica con la comunicación del Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0082",
    "slug": "javier-chicote",
    "nombre_completo": "Javier Chicote",
    "alias": null,
    "cargo_actual": "Periodista de investigación · ABC · investigación",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista de investigación de ABC · investigación. Línea: Centro-derecha.",
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
        "id": "med-0082-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0082-ap-00-it-00",
            "apartado_id": "med-0082-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista de investigación de ABC · investigación. Línea: Centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0082-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0082-ap-01-it-00",
            "apartado_id": "med-0082-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Investigación sobre corrupción y poder; coberturas incómodas para el Gobierno.",
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
        "id": "med-0082-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0082-ap-02-it-00",
            "apartado_id": "med-0082-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -3/10) — Investigaciones que han tensado con Moncloa.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0083",
    "slug": "miguel-angel-mellado",
    "nombre_completo": "Miguel Ángel Mellado",
    "alias": null,
    "cargo_actual": "Adjunto a la dirección · El Mundo",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Adjunto a la dirección de El Mundo. Línea: Centro-derecha.",
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
        "id": "med-0083-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0083-ap-00-it-00",
            "apartado_id": "med-0083-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Adjunto a la dirección de El Mundo. Línea: Centro-derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0083-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0083-ap-01-it-00",
            "apartado_id": "med-0083-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis de centro-derecha alineado con la línea de El Mundo.",
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
        "id": "med-0083-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0083-ap-02-it-00",
            "apartado_id": "med-0083-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -4/10) — Crítico con la gestión del Ejecutivo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0084",
    "slug": "victor-de-la-serna",
    "nombre_completo": "Víctor de la Serna",
    "alias": null,
    "cargo_actual": "Columnista · El Mundo",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista de El Mundo. Línea: Derecha.",
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
        "id": "med-0084-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0084-ap-00-it-00",
            "apartado_id": "med-0084-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista de El Mundo. Línea: Derecha.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0084-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0084-ap-01-it-00",
            "apartado_id": "med-0084-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Columnista conservador veterano; crítico con el sanchismo.",
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
        "id": "med-0084-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0084-ap-02-it-00",
            "apartado_id": "med-0084-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -5/10) — Columnas adversas al Gobierno.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0085",
    "slug": "maximo-pradera",
    "nombre_completo": "Máximo Pradera",
    "alias": null,
    "cargo_actual": "Comunicador · Cultura · tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Comunicador de Cultura · tertulias. Línea: Izquierda.",
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
        "id": "med-0085-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0085-ap-00-it-00",
            "apartado_id": "med-0085-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Comunicador de Cultura · tertulias. Línea: Izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0085-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0085-ap-01-it-00",
            "apartado_id": "med-0085-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Mirada cultural de izquierdas, irónica con la derecha.",
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
        "id": "med-0085-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0085-ap-02-it-00",
            "apartado_id": "med-0085-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Afín al espacio progresista.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0086",
    "slug": "rosa-villacastin",
    "nombre_completo": "Rosa Villacastín",
    "alias": null,
    "cargo_actual": "Periodista y tertuliana · Tertulias",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista y tertuliana de Tertulias. Línea: Centro-izquierda.",
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
        "id": "med-0086-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0086-ap-00-it-00",
            "apartado_id": "med-0086-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista y tertuliana de Tertulias. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0086-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0086-ap-01-it-00",
            "apartado_id": "med-0086-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Veterana de prensa del corazón y tertulia política de sensibilidad progresista.",
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
        "id": "med-0086-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0086-ap-02-it-00",
            "apartado_id": "med-0086-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Tono afín al espacio de centro-izquierda.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0087",
    "slug": "antonio-casado",
    "nombre_completo": "Antonio Casado",
    "alias": null,
    "cargo_actual": "Columnista político · El Confidencial",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Columnista político de El Confidencial. Línea: Centro.",
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
        "id": "med-0087-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0087-ap-00-it-00",
            "apartado_id": "med-0087-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Columnista político de El Confidencial. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0087-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0087-ap-01-it-00",
            "apartado_id": "med-0087-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Análisis político de centro; crónica parlamentaria equilibrada.",
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
        "id": "med-0087-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0087-ap-02-it-00",
            "apartado_id": "med-0087-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota -1/10) — Crítico moderado con la gestión, sin alineamiento de bloque.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0088",
    "slug": "fernando-jauregui",
    "nombre_completo": "Fernando Jáuregui",
    "alias": null,
    "cargo_actual": "Periodista veterano · Tertulias · Diariocrítico",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista veterano de Tertulias · Diariocrítico. Línea: Centro.",
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
        "id": "med-0088-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0088-ap-00-it-00",
            "apartado_id": "med-0088-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista veterano de Tertulias · Diariocrítico. Línea: Centro.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0088-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0088-ap-01-it-00",
            "apartado_id": "med-0088-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Veterano de la Transición; análisis de centro institucionalista.",
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
        "id": "med-0088-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0088-ap-02-it-00",
            "apartado_id": "med-0088-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +0/10) — Mirada institucional, crítica con los extremos de ambos bloques.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0089",
    "slug": "alfredo-menendez",
    "nombre_completo": "Alfredo Menéndez",
    "alias": null,
    "cargo_actual": "Presentador · Cadena SER · Hoy por Hoy fin de semana",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Presentador de Cadena SER · Hoy por Hoy fin de semana. Línea: Centro-izquierda.",
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
        "id": "med-0089-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0089-ap-00-it-00",
            "apartado_id": "med-0089-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Presentador de Cadena SER · Hoy por Hoy fin de semana. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0089-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0089-ap-01-it-00",
            "apartado_id": "med-0089-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Magacín de fin de semana de la SER; sensibilidad progresista.",
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
        "id": "med-0089-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0089-ap-02-it-00",
            "apartado_id": "med-0089-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +2/10) — Tono afín al espacio de centro-izquierda.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
  },
  {
    "id": "med-0090",
    "slug": "pilar-velasco",
    "nombre_completo": "Pilar Velasco",
    "alias": null,
    "cargo_actual": "Periodista política · Cadena SER",
    "partido": null,
    "foto_url": null,
    "bio_corta": "Periodista política de Cadena SER. Línea: Centro-izquierda.",
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
        "id": "med-0090-ap-00",
        "tipo": "identidad",
        "titulo": null,
        "resumen": null,
        "orden": 0,
        "items": [
          {
            "id": "med-0090-ap-00-it-00",
            "apartado_id": "med-0090-ap-00",
            "tipo": "dato",
            "titulo": "Perfil",
            "contenido": "Periodista política de Cadena SER. Línea: Centro-izquierda.",
            "fecha": null,
            "fuente_url": null,
            "fuente_titulo": null,
            "tags": [],
            "orden": 0
          }
        ]
      },
      {
        "id": "med-0090-ap-01",
        "tipo": "posiciones",
        "titulo": null,
        "resumen": null,
        "orden": 1,
        "items": [
          {
            "id": "med-0090-ap-01-it-00",
            "apartado_id": "med-0090-ap-01",
            "tipo": "dato",
            "titulo": "Encuadre informativo (cómo presenta las noticias)",
            "contenido": "Información política de la SER; crónica de Moncloa y partidos.",
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
        "id": "med-0090-ap-02",
        "tipo": "redes",
        "titulo": null,
        "resumen": null,
        "orden": 2,
        "items": [
          {
            "id": "med-0090-ap-02-it-00",
            "apartado_id": "med-0090-ap-02",
            "tipo": "contacto",
            "titulo": "Pedro Sánchez",
            "contenido": "**Gobierno** (nota +1/10) — Cobertura desde la SER, percibida como afín, con tono informativo.",
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
    "created_at": "2026-05-28T23:20:07.574303Z",
    "updated_at": "2026-05-28T23:20:07.574303Z"
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
