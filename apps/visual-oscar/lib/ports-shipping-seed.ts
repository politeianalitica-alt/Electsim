/* AUTO-GENERATED · seed navieras + servicios módulo Puertos.
   Sincronizado con etl/sources/ports/seeds/{shipping_lines,carrier_services}_seed.yaml */
export const SHIPPING_LINES_SEED = [
  {
    "slug": "msc",
    "name": "Mediterranean Shipping Company",
    "parent_company": "Aponte Family",
    "country_iso": "CH",
    "lei": "222100Q1Q3PMVD2M9JG9",
    "website": "https://www.msc.com",
    "alliance": "standalone",
    "main_trades": [
      "asia_eu",
      "transpac",
      "transatlantic",
      "intra_eu",
      "me_eu",
      "africa"
    ],
    "fleet_size": 850,
    "fleet_teu": 6300000,
    "sanctions_risk": "monitor",
    "notes": "1º mundial desde 2022 · Aponte family privada · headquartered Geneva.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "maersk",
    "name": "A.P. Moller-Maersk",
    "parent_company": "A.P. Moller Holding",
    "country_iso": "DK",
    "lei": "HUGTL2WLVPYIQVZ8KZ09",
    "website": "https://www.maersk.com",
    "alliance": "gemini",
    "main_trades": [
      "asia_eu",
      "transpac",
      "transatlantic",
      "intra_eu",
      "me_eu"
    ],
    "fleet_size": 715,
    "fleet_teu": 4400000,
    "sanctions_risk": "none",
    "notes": "Gemini Cooperation con Hapag-Lloyd desde 2025 · APMT operates terminales.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "cma_cgm",
    "name": "CMA CGM",
    "parent_company": "Saadé Family",
    "country_iso": "FR",
    "lei": "96950099WHK2NEH3RR47",
    "website": "https://www.cma-cgm.com",
    "alliance": "ocean",
    "main_trades": [
      "asia_eu",
      "transpac",
      "transatlantic",
      "intra_eu",
      "africa",
      "latin_america"
    ],
    "fleet_size": 645,
    "fleet_teu": 4000000,
    "sanctions_risk": "monitor",
    "notes": "3º mundial · Saadé family · controla CEVA Logistics + APL.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "cosco",
    "name": "COSCO Shipping",
    "parent_company": "China COSCO Shipping Corporation Ltd. (state-owned)",
    "country_iso": "CN",
    "lei": "300300DJYEV5ABCDEF98",
    "website": "https://lines.coscoshipping.com",
    "alliance": "ocean",
    "main_trades": [
      "asia_eu",
      "transpac",
      "intra_asia",
      "me_eu"
    ],
    "fleet_size": 510,
    "fleet_teu": 3200000,
    "sanctions_risk": "monitor",
    "notes": "SOE chino · controla Piraeus + minoría Hamburg CTT · OFAC scrutiny.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "hapag_lloyd",
    "name": "Hapag-Lloyd",
    "parent_company": "Kuhne Holding + HGV Hamburg + CSAV",
    "country_iso": "DE",
    "lei": "391200V7VPYIQVZ8KZ16",
    "website": "https://www.hapag-lloyd.com",
    "alliance": "gemini",
    "main_trades": [
      "asia_eu",
      "transpac",
      "transatlantic",
      "latin_america"
    ],
    "fleet_size": 305,
    "fleet_teu": 2150000,
    "sanctions_risk": "none",
    "notes": "5º mundial · Gemini con Maersk desde 2025 · Hamburg HQ.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "evergreen",
    "name": "Evergreen Marine Corporation",
    "parent_company": "Evergreen Group",
    "country_iso": "TW",
    "website": "https://www.evergreen-line.com",
    "alliance": "the_alliance",
    "main_trades": [
      "asia_eu",
      "transpac",
      "intra_asia"
    ],
    "fleet_size": 215,
    "fleet_teu": 1700000,
    "sanctions_risk": "none",
    "notes": "Taiwanese · famosa por Ever Given (Suez 2021).",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "one",
    "name": "Ocean Network Express",
    "parent_company": "NYK + MOL + K Line (JV)",
    "country_iso": "SG",
    "website": "https://www.one-line.com",
    "alliance": "premier",
    "main_trades": [
      "asia_eu",
      "transpac",
      "transatlantic"
    ],
    "fleet_size": 240,
    "fleet_teu": 1900000,
    "sanctions_risk": "none",
    "notes": "JV japonés constituida 2017 · sede Singapore. Magenta hulls.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "hmm",
    "name": "HMM (Hyundai Merchant Marine)",
    "parent_company": "Korea Development Bank (state-owned)",
    "country_iso": "KR",
    "website": "https://www.hmm21.com",
    "alliance": "premier",
    "main_trades": [
      "asia_eu",
      "transpac",
      "intra_asia"
    ],
    "fleet_size": 75,
    "fleet_teu": 820000,
    "sanctions_risk": "none",
    "notes": "Coreana · post-restructuring 2017 · state support.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "yang_ming",
    "name": "Yang Ming Marine Transport",
    "parent_company": "Taiwan state (45 %)",
    "country_iso": "TW",
    "website": "https://www.yangming.com",
    "alliance": "premier",
    "main_trades": [
      "asia_eu",
      "transpac",
      "intra_asia"
    ],
    "fleet_size": 95,
    "fleet_teu": 720000,
    "sanctions_risk": "none",
    "notes": "Estado taiwanés mayoritario · Premier Alliance con ONE+HMM.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "zim",
    "name": "ZIM Integrated Shipping Services",
    "parent_company": "Kenon Holdings",
    "country_iso": "IL",
    "lei": "213800VZG8MZNNJU2I94",
    "website": "https://www.zim.com",
    "alliance": "standalone",
    "main_trades": [
      "transpac",
      "asia_eu",
      "me_eu",
      "transatlantic"
    ],
    "fleet_size": 130,
    "fleet_teu": 690000,
    "sanctions_risk": "none",
    "notes": "Israelí · NYSE listed · estrategia asset-light (chartered fleet).",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "wan_hai",
    "name": "Wan Hai Lines",
    "parent_company": "Wan Hai Group",
    "country_iso": "TW",
    "website": "https://www.wanhai.com",
    "alliance": "standalone",
    "main_trades": [
      "intra_asia",
      "transpac"
    ],
    "fleet_size": 145,
    "fleet_teu": 460000,
    "sanctions_risk": "none",
    "notes": "Especialista intra-Asia · expandiendo transpac post-COVID.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "pil",
    "name": "Pacific International Lines",
    "parent_company": "Heliconia (Temasek) + family Teo",
    "country_iso": "SG",
    "website": "https://www.pilship.com",
    "alliance": "standalone",
    "main_trades": [
      "intra_asia",
      "africa",
      "me_eu"
    ],
    "fleet_size": 95,
    "fleet_teu": 300000,
    "sanctions_risk": "none",
    "notes": "Singapur · capital injection Temasek 2021 post-financial trouble.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "oocl",
    "name": "Orient Overseas Container Line",
    "parent_company": "COSCO Shipping (subsidiary)",
    "country_iso": "HK",
    "website": "https://www.oocl.com",
    "alliance": "ocean",
    "main_trades": [
      "asia_eu",
      "transpac"
    ],
    "fleet_size": 110,
    "fleet_teu": 870000,
    "sanctions_risk": "monitor",
    "notes": "Hong Kong · adquirida por COSCO 2018 · mantiene marca propia.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "x_press_feeders",
    "name": "X-Press Feeders",
    "parent_company": "Sea Consortium Pte",
    "country_iso": "SG",
    "website": "https://www.x-pressfeeders.com",
    "alliance": "standalone",
    "main_trades": [
      "intra_asia",
      "intra_eu"
    ],
    "fleet_size": 100,
    "fleet_teu": 195000,
    "sanctions_risk": "none",
    "notes": "Feeder operator · X-Press Pearl incident Sri Lanka 2021.",
    "source": "curated",
    "data_quality": "seed"
  },
  {
    "slug": "msc_irisl_legacy",
    "name": "IRISL (Islamic Republic of Iran Shipping Lines)",
    "parent_company": "Iranian state",
    "country_iso": "IR",
    "website": null,
    "alliance": "standalone",
    "main_trades": [
      "me_eu",
      "intra_asia"
    ],
    "fleet_size": 90,
    "fleet_teu": 130000,
    "sanctions_risk": "sanctioned",
    "notes": "OFAC SDN listed · transporta cargo iraní crítico para sanctions screening.",
    "source": "curated",
    "data_quality": "seed"
  }
]

export const CARRIER_SERVICES_SEED = [
  {
    "service_code": "msc-silk",
    "service_name": "SILK Service · Asia-North Europe",
    "shipping_line_slug": "msc",
    "alliance": "standalone",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "estimated_transit_days": 28,
    "vessel_class": "ULCV",
    "avg_capacity_teu": 22000,
    "main_chokepoints": [
      "malacca",
      "suez_canal",
      "gibraltar"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "shanghai",
        "order": 1,
        "dwell_days": 2
      },
      {
        "port_slug": "ningbo",
        "order": 2,
        "dwell_days": 1
      },
      {
        "port_slug": "shenzhen",
        "order": 3
      },
      {
        "port_slug": "singapore",
        "order": 4
      },
      {
        "port_slug": "algeciras",
        "order": 5
      },
      {
        "port_slug": "rotterdam",
        "order": 6
      },
      {
        "port_slug": "hamburg",
        "order": 7
      },
      {
        "port_slug": "antwerp",
        "order": 8
      }
    ]
  },
  {
    "service_code": "msc-mustang",
    "service_name": "MUSTANG Service · Med-East Coast USA",
    "shipping_line_slug": "msc",
    "trade_lane": "transatlantic",
    "frequency_days": 7,
    "estimated_transit_days": 18,
    "avg_capacity_teu": 12000,
    "main_chokepoints": [
      "gibraltar"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "gioia_tauro",
        "order": 1
      },
      {
        "port_slug": "valencia",
        "order": 2
      },
      {
        "port_slug": "algeciras",
        "order": 3
      },
      {
        "port_slug": "ny_nj",
        "order": 4
      },
      {
        "port_slug": "savannah",
        "order": 5
      }
    ]
  },
  {
    "service_code": "msc-jade",
    "service_name": "JADE · India-Med-USA",
    "shipping_line_slug": "msc",
    "trade_lane": "me_eu",
    "frequency_days": 14,
    "avg_capacity_teu": 8500,
    "main_chokepoints": [
      "suez_canal",
      "bab_el_mandeb"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "jebel_ali",
        "order": 1
      },
      {
        "port_slug": "jeddah",
        "order": 2
      },
      {
        "port_slug": "gioia_tauro",
        "order": 3
      },
      {
        "port_slug": "valencia",
        "order": 4
      }
    ]
  },
  {
    "service_code": "maersk-ae1",
    "service_name": "AE1 · Shogun · Asia-North Europe",
    "shipping_line_slug": "maersk",
    "alliance": "gemini",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "estimated_transit_days": 30,
    "vessel_class": "ULCV",
    "avg_capacity_teu": 23500,
    "main_chokepoints": [
      "malacca",
      "suez_canal"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "ningbo",
        "order": 1
      },
      {
        "port_slug": "shanghai",
        "order": 2
      },
      {
        "port_slug": "tanjung_pelepas",
        "order": 3
      },
      {
        "port_slug": "tanger_med",
        "order": 4
      },
      {
        "port_slug": "bremerhaven",
        "order": 5
      },
      {
        "port_slug": "rotterdam",
        "order": 6
      },
      {
        "port_slug": "antwerp",
        "order": 7
      }
    ]
  },
  {
    "service_code": "maersk-ae6",
    "service_name": "AE6 · Lion · Far East-Med",
    "shipping_line_slug": "maersk",
    "trade_lane": "asia_med",
    "frequency_days": 7,
    "estimated_transit_days": 24,
    "avg_capacity_teu": 14000,
    "main_chokepoints": [
      "malacca",
      "suez_canal"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "shanghai",
        "order": 1
      },
      {
        "port_slug": "ningbo",
        "order": 2
      },
      {
        "port_slug": "singapore",
        "order": 3
      },
      {
        "port_slug": "salalah",
        "order": 4
      },
      {
        "port_slug": "tanger_med",
        "order": 5
      },
      {
        "port_slug": "barcelona",
        "order": 6
      },
      {
        "port_slug": "valencia",
        "order": 7
      }
    ]
  },
  {
    "service_code": "maersk-tp9",
    "service_name": "TP9 · Transpacific West Coast",
    "shipping_line_slug": "maersk",
    "trade_lane": "transpac",
    "frequency_days": 7,
    "estimated_transit_days": 14,
    "avg_capacity_teu": 14500,
    "main_chokepoints": [],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "ningbo",
        "order": 1
      },
      {
        "port_slug": "shanghai",
        "order": 2
      },
      {
        "port_slug": "busan",
        "order": 3
      },
      {
        "port_slug": "los_angeles",
        "order": 4
      },
      {
        "port_slug": "long_beach",
        "order": 5
      }
    ]
  },
  {
    "service_code": "cma-fal1",
    "service_name": "FAL 1 · French Asia Line North",
    "shipping_line_slug": "cma_cgm",
    "alliance": "ocean",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "estimated_transit_days": 30,
    "vessel_class": "ULCV",
    "avg_capacity_teu": 23000,
    "main_chokepoints": [
      "malacca",
      "suez_canal"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "shanghai",
        "order": 1
      },
      {
        "port_slug": "ningbo",
        "order": 2
      },
      {
        "port_slug": "shenzhen",
        "order": 3
      },
      {
        "port_slug": "tanger_med",
        "order": 4
      },
      {
        "port_slug": "rotterdam",
        "order": 5
      },
      {
        "port_slug": "hamburg",
        "order": 6
      },
      {
        "port_slug": "le_havre",
        "order": 7
      }
    ]
  },
  {
    "service_code": "cma-mex",
    "service_name": "MEX · Med-USA East Coast",
    "shipping_line_slug": "cma_cgm",
    "trade_lane": "transatlantic",
    "frequency_days": 7,
    "avg_capacity_teu": 11000,
    "main_chokepoints": [
      "gibraltar"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "piraeus",
        "order": 1
      },
      {
        "port_slug": "gioia_tauro",
        "order": 2
      },
      {
        "port_slug": "algeciras",
        "order": 3
      },
      {
        "port_slug": "ny_nj",
        "order": 4
      },
      {
        "port_slug": "savannah",
        "order": 5
      }
    ]
  },
  {
    "service_code": "cma-medex",
    "service_name": "MEDEX · Indian-Med",
    "shipping_line_slug": "cma_cgm",
    "trade_lane": "me_eu",
    "frequency_days": 7,
    "avg_capacity_teu": 9000,
    "main_chokepoints": [
      "bab_el_mandeb",
      "suez_canal"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "mundra",
        "order": 1
      },
      {
        "port_slug": "chennai",
        "order": 2
      },
      {
        "port_slug": "jebel_ali",
        "order": 3
      },
      {
        "port_slug": "jeddah",
        "order": 4
      },
      {
        "port_slug": "gioia_tauro",
        "order": 5
      },
      {
        "port_slug": "valencia",
        "order": 6
      }
    ]
  },
  {
    "service_code": "cosco-aeu1",
    "service_name": "AEU1 · Asia-Europe North",
    "shipping_line_slug": "cosco",
    "alliance": "ocean",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "estimated_transit_days": 30,
    "vessel_class": "ULCV",
    "avg_capacity_teu": 21000,
    "main_chokepoints": [
      "malacca",
      "suez_canal"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "shanghai",
        "order": 1
      },
      {
        "port_slug": "ningbo",
        "order": 2
      },
      {
        "port_slug": "shenzhen",
        "order": 3
      },
      {
        "port_slug": "singapore",
        "order": 4
      },
      {
        "port_slug": "piraeus",
        "order": 5
      },
      {
        "port_slug": "rotterdam",
        "order": 6
      },
      {
        "port_slug": "hamburg",
        "order": 7
      }
    ]
  },
  {
    "service_code": "cosco-med",
    "service_name": "AEM · Asia-Europe Med",
    "shipping_line_slug": "cosco",
    "trade_lane": "asia_med",
    "frequency_days": 7,
    "avg_capacity_teu": 18000,
    "main_chokepoints": [
      "malacca",
      "suez_canal"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "shanghai",
        "order": 1
      },
      {
        "port_slug": "ningbo",
        "order": 2
      },
      {
        "port_slug": "tanjung_pelepas",
        "order": 3
      },
      {
        "port_slug": "piraeus",
        "order": 4
      },
      {
        "port_slug": "valencia",
        "order": 5
      },
      {
        "port_slug": "barcelona",
        "order": 6
      }
    ]
  },
  {
    "service_code": "hapag-fe1",
    "service_name": "FE1 · Gemini Far East-Europe",
    "shipping_line_slug": "hapag_lloyd",
    "alliance": "gemini",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "avg_capacity_teu": 23000,
    "main_chokepoints": [
      "malacca",
      "suez_canal"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "ningbo",
        "order": 1
      },
      {
        "port_slug": "shanghai",
        "order": 2
      },
      {
        "port_slug": "tanjung_pelepas",
        "order": 3
      },
      {
        "port_slug": "tanger_med",
        "order": 4
      },
      {
        "port_slug": "rotterdam",
        "order": 5
      },
      {
        "port_slug": "hamburg",
        "order": 6
      }
    ]
  },
  {
    "service_code": "hapag-tap",
    "service_name": "TAP · Transatlantic Premium",
    "shipping_line_slug": "hapag_lloyd",
    "trade_lane": "transatlantic",
    "frequency_days": 7,
    "avg_capacity_teu": 8500,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "hamburg",
        "order": 1
      },
      {
        "port_slug": "rotterdam",
        "order": 2
      },
      {
        "port_slug": "le_havre",
        "order": 3
      },
      {
        "port_slug": "ny_nj",
        "order": 4
      },
      {
        "port_slug": "savannah",
        "order": 5
      },
      {
        "port_slug": "houston",
        "order": 6
      }
    ]
  },
  {
    "service_code": "evergreen-ces",
    "service_name": "CES · Asia-Europe",
    "shipping_line_slug": "evergreen",
    "alliance": "the_alliance",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "avg_capacity_teu": 24000,
    "vessel_class": "ULCV",
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "shanghai",
        "order": 1
      },
      {
        "port_slug": "ningbo",
        "order": 2
      },
      {
        "port_slug": "tanjung_pelepas",
        "order": 3
      },
      {
        "port_slug": "gioia_tauro",
        "order": 4
      },
      {
        "port_slug": "rotterdam",
        "order": 5
      },
      {
        "port_slug": "felixstowe",
        "order": 6
      },
      {
        "port_slug": "hamburg",
        "order": 7
      }
    ]
  },
  {
    "service_code": "evergreen-cps",
    "service_name": "CPS · China-Pacific Service",
    "shipping_line_slug": "evergreen",
    "trade_lane": "transpac",
    "frequency_days": 7,
    "avg_capacity_teu": 13000,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "ningbo",
        "order": 1
      },
      {
        "port_slug": "shanghai",
        "order": 2
      },
      {
        "port_slug": "kaohsiung",
        "order": 3
      },
      {
        "port_slug": "los_angeles",
        "order": 4
      },
      {
        "port_slug": "long_beach",
        "order": 5
      }
    ]
  },
  {
    "service_code": "one-fp1",
    "service_name": "FP1 · Far East-North Europe",
    "shipping_line_slug": "one",
    "alliance": "premier",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "avg_capacity_teu": 14000,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "tokyo",
        "order": 1
      },
      {
        "port_slug": "shanghai",
        "order": 2
      },
      {
        "port_slug": "ningbo",
        "order": 3
      },
      {
        "port_slug": "shenzhen",
        "order": 4
      },
      {
        "port_slug": "singapore",
        "order": 5
      },
      {
        "port_slug": "rotterdam",
        "order": 6
      },
      {
        "port_slug": "hamburg",
        "order": 7
      }
    ]
  },
  {
    "service_code": "one-pn3",
    "service_name": "PN3 · Asia-USWC",
    "shipping_line_slug": "one",
    "trade_lane": "transpac",
    "frequency_days": 7,
    "avg_capacity_teu": 13500,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "tokyo",
        "order": 1
      },
      {
        "port_slug": "busan",
        "order": 2
      },
      {
        "port_slug": "kaohsiung",
        "order": 3
      },
      {
        "port_slug": "los_angeles",
        "order": 4
      },
      {
        "port_slug": "long_beach",
        "order": 5
      }
    ]
  },
  {
    "service_code": "hmm-fe2",
    "service_name": "FE2 · Far East-Europe",
    "shipping_line_slug": "hmm",
    "alliance": "premier",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "avg_capacity_teu": 24000,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "busan",
        "order": 1
      },
      {
        "port_slug": "shanghai",
        "order": 2
      },
      {
        "port_slug": "ningbo",
        "order": 3
      },
      {
        "port_slug": "singapore",
        "order": 4
      },
      {
        "port_slug": "rotterdam",
        "order": 5
      },
      {
        "port_slug": "hamburg",
        "order": 6
      }
    ]
  },
  {
    "service_code": "yang-tpa",
    "service_name": "TPA · Trans-Pacific North",
    "shipping_line_slug": "yang_ming",
    "alliance": "premier",
    "trade_lane": "transpac",
    "frequency_days": 7,
    "avg_capacity_teu": 8200,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "kaohsiung",
        "order": 1
      },
      {
        "port_slug": "shanghai",
        "order": 2
      },
      {
        "port_slug": "ningbo",
        "order": 3
      },
      {
        "port_slug": "los_angeles",
        "order": 4
      },
      {
        "port_slug": "long_beach",
        "order": 5
      }
    ]
  },
  {
    "service_code": "zim-zcp",
    "service_name": "ZCP · ZIM Container Service Pacific",
    "shipping_line_slug": "zim",
    "trade_lane": "transpac",
    "frequency_days": 7,
    "avg_capacity_teu": 10000,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "ningbo",
        "order": 1
      },
      {
        "port_slug": "shanghai",
        "order": 2
      },
      {
        "port_slug": "busan",
        "order": 3
      },
      {
        "port_slug": "los_angeles",
        "order": 4
      }
    ]
  },
  {
    "service_code": "zim-zme",
    "service_name": "ZME · ZIM Med-East",
    "shipping_line_slug": "zim",
    "trade_lane": "me_eu",
    "frequency_days": 14,
    "avg_capacity_teu": 5500,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "jebel_ali",
        "order": 1
      },
      {
        "port_slug": "jeddah",
        "order": 2
      },
      {
        "port_slug": "piraeus",
        "order": 3
      },
      {
        "port_slug": "barcelona",
        "order": 4
      }
    ]
  },
  {
    "service_code": "wanhai-cpx",
    "service_name": "CPX · China-Pacific Express",
    "shipping_line_slug": "wan_hai",
    "trade_lane": "transpac",
    "frequency_days": 7,
    "avg_capacity_teu": 11000,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "shanghai",
        "order": 1
      },
      {
        "port_slug": "ningbo",
        "order": 2
      },
      {
        "port_slug": "kaohsiung",
        "order": 3
      },
      {
        "port_slug": "los_angeles",
        "order": 4
      }
    ]
  },
  {
    "service_code": "oocl-lly",
    "service_name": "LL3 · Asia-Europe",
    "shipping_line_slug": "oocl",
    "alliance": "ocean",
    "trade_lane": "asia_eu",
    "frequency_days": 7,
    "avg_capacity_teu": 21000,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "hong_kong",
        "order": 1
      },
      {
        "port_slug": "shenzhen",
        "order": 2
      },
      {
        "port_slug": "ningbo",
        "order": 3
      },
      {
        "port_slug": "shanghai",
        "order": 4
      },
      {
        "port_slug": "rotterdam",
        "order": 5
      },
      {
        "port_slug": "hamburg",
        "order": 6
      }
    ]
  },
  {
    "service_code": "xpress-med1",
    "service_name": "MED1 · Algeciras Feeder",
    "shipping_line_slug": "x_press_feeders",
    "trade_lane": "intra_eu",
    "frequency_days": 4,
    "avg_capacity_teu": 1100,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "algeciras",
        "order": 1
      },
      {
        "port_slug": "tanger_med",
        "order": 2
      },
      {
        "port_slug": "barcelona",
        "order": 3
      },
      {
        "port_slug": "valencia",
        "order": 4
      }
    ]
  },
  {
    "service_code": "pil-waa",
    "service_name": "WAA · West Africa Asia",
    "shipping_line_slug": "pil",
    "trade_lane": "africa",
    "frequency_days": 10,
    "avg_capacity_teu": 4500,
    "main_chokepoints": [
      "malacca",
      "gibraltar"
    ],
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "singapore",
        "order": 1
      },
      {
        "port_slug": "tanjung_pelepas",
        "order": 2
      },
      {
        "port_slug": "durban",
        "order": 3
      },
      {
        "port_slug": "lagos_apapa",
        "order": 4
      }
    ]
  },
  {
    "service_code": "msc-westafrica",
    "service_name": "NWS · North-West Africa Service",
    "shipping_line_slug": "msc",
    "trade_lane": "africa",
    "frequency_days": 7,
    "avg_capacity_teu": 4000,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "algeciras",
        "order": 1
      },
      {
        "port_slug": "tanger_med",
        "order": 2
      },
      {
        "port_slug": "las_palmas",
        "order": 3
      },
      {
        "port_slug": "lagos_apapa",
        "order": 4
      }
    ]
  },
  {
    "service_code": "cma-ela",
    "service_name": "ELA · Europe-Latin America",
    "shipping_line_slug": "cma_cgm",
    "trade_lane": "latin_america",
    "frequency_days": 7,
    "avg_capacity_teu": 7000,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "rotterdam",
        "order": 1
      },
      {
        "port_slug": "hamburg",
        "order": 2
      },
      {
        "port_slug": "santos",
        "order": 3
      },
      {
        "port_slug": "buenos_aires",
        "order": 4
      },
      {
        "port_slug": "veracruz",
        "order": 5
      }
    ]
  },
  {
    "service_code": "cosco-iax",
    "service_name": "IAX · Intra-Asia Express",
    "shipping_line_slug": "cosco",
    "trade_lane": "intra_asia",
    "frequency_days": 5,
    "avg_capacity_teu": 2800,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "shanghai",
        "order": 1
      },
      {
        "port_slug": "hong_kong",
        "order": 2
      },
      {
        "port_slug": "port_klang",
        "order": 3
      },
      {
        "port_slug": "singapore",
        "order": 4
      },
      {
        "port_slug": "haiphong",
        "order": 5
      }
    ]
  },
  {
    "service_code": "one-jpx",
    "service_name": "JPX · Japan-Pacific Express",
    "shipping_line_slug": "one",
    "trade_lane": "intra_asia",
    "frequency_days": 5,
    "avg_capacity_teu": 4500,
    "source": "curated",
    "data_quality": "seed",
    "port_rotation": [
      {
        "port_slug": "tokyo",
        "order": 1
      },
      {
        "port_slug": "busan",
        "order": 2
      },
      {
        "port_slug": "kaohsiung",
        "order": 3
      },
      {
        "port_slug": "hong_kong",
        "order": 4
      }
    ]
  }
]
