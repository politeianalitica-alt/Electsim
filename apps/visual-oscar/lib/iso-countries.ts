/**
 * ISO 3166-1 alpha-3 países top 100+ relevantes para comercio internacional.
 * Cobertura >99% del PIB y flujos comerciales mundiales. Sin lib externa
 * (i18n-iso-countries pesa 50kB · este JSON cabe en <5kB compactado).
 */
export interface Country {
  iso3: string
  name_es: string
  region: 'europe' | 'asia_pacific' | 'middle_east' | 'north_america' | 'latin_america' | 'africa'
}

export const COUNTRIES: Country[] = [
  {
    "iso3": "ESP",
    "name_es": "España",
    "region": "europe"
  },
  {
    "iso3": "DEU",
    "name_es": "Alemania",
    "region": "europe"
  },
  {
    "iso3": "FRA",
    "name_es": "Francia",
    "region": "europe"
  },
  {
    "iso3": "ITA",
    "name_es": "Italia",
    "region": "europe"
  },
  {
    "iso3": "NLD",
    "name_es": "Países Bajos",
    "region": "europe"
  },
  {
    "iso3": "BEL",
    "name_es": "Bélgica",
    "region": "europe"
  },
  {
    "iso3": "PRT",
    "name_es": "Portugal",
    "region": "europe"
  },
  {
    "iso3": "POL",
    "name_es": "Polonia",
    "region": "europe"
  },
  {
    "iso3": "AUT",
    "name_es": "Austria",
    "region": "europe"
  },
  {
    "iso3": "GRC",
    "name_es": "Grecia",
    "region": "europe"
  },
  {
    "iso3": "IRL",
    "name_es": "Irlanda",
    "region": "europe"
  },
  {
    "iso3": "FIN",
    "name_es": "Finlandia",
    "region": "europe"
  },
  {
    "iso3": "DNK",
    "name_es": "Dinamarca",
    "region": "europe"
  },
  {
    "iso3": "SWE",
    "name_es": "Suecia",
    "region": "europe"
  },
  {
    "iso3": "ROU",
    "name_es": "Rumanía",
    "region": "europe"
  },
  {
    "iso3": "HUN",
    "name_es": "Hungría",
    "region": "europe"
  },
  {
    "iso3": "CZE",
    "name_es": "Chequia",
    "region": "europe"
  },
  {
    "iso3": "SVK",
    "name_es": "Eslovaquia",
    "region": "europe"
  },
  {
    "iso3": "BGR",
    "name_es": "Bulgaria",
    "region": "europe"
  },
  {
    "iso3": "HRV",
    "name_es": "Croacia",
    "region": "europe"
  },
  {
    "iso3": "SVN",
    "name_es": "Eslovenia",
    "region": "europe"
  },
  {
    "iso3": "LTU",
    "name_es": "Lituania",
    "region": "europe"
  },
  {
    "iso3": "LVA",
    "name_es": "Letonia",
    "region": "europe"
  },
  {
    "iso3": "EST",
    "name_es": "Estonia",
    "region": "europe"
  },
  {
    "iso3": "CYP",
    "name_es": "Chipre",
    "region": "europe"
  },
  {
    "iso3": "MLT",
    "name_es": "Malta",
    "region": "europe"
  },
  {
    "iso3": "LUX",
    "name_es": "Luxemburgo",
    "region": "europe"
  },
  {
    "iso3": "GBR",
    "name_es": "Reino Unido",
    "region": "europe"
  },
  {
    "iso3": "CHE",
    "name_es": "Suiza",
    "region": "europe"
  },
  {
    "iso3": "NOR",
    "name_es": "Noruega",
    "region": "europe"
  },
  {
    "iso3": "ISL",
    "name_es": "Islandia",
    "region": "europe"
  },
  {
    "iso3": "UKR",
    "name_es": "Ucrania",
    "region": "europe"
  },
  {
    "iso3": "RUS",
    "name_es": "Rusia",
    "region": "europe"
  },
  {
    "iso3": "BLR",
    "name_es": "Bielorrusia",
    "region": "europe"
  },
  {
    "iso3": "SRB",
    "name_es": "Serbia",
    "region": "europe"
  },
  {
    "iso3": "ALB",
    "name_es": "Albania",
    "region": "europe"
  },
  {
    "iso3": "BIH",
    "name_es": "Bosnia y Herzegovina",
    "region": "europe"
  },
  {
    "iso3": "MKD",
    "name_es": "Macedonia del Norte",
    "region": "europe"
  },
  {
    "iso3": "TUR",
    "name_es": "Turquía",
    "region": "europe"
  },
  {
    "iso3": "CHN",
    "name_es": "China",
    "region": "asia_pacific"
  },
  {
    "iso3": "JPN",
    "name_es": "Japón",
    "region": "asia_pacific"
  },
  {
    "iso3": "KOR",
    "name_es": "Corea del Sur",
    "region": "asia_pacific"
  },
  {
    "iso3": "PRK",
    "name_es": "Corea del Norte",
    "region": "asia_pacific"
  },
  {
    "iso3": "TWN",
    "name_es": "Taiwán",
    "region": "asia_pacific"
  },
  {
    "iso3": "HKG",
    "name_es": "Hong Kong",
    "region": "asia_pacific"
  },
  {
    "iso3": "MAC",
    "name_es": "Macao",
    "region": "asia_pacific"
  },
  {
    "iso3": "SGP",
    "name_es": "Singapur",
    "region": "asia_pacific"
  },
  {
    "iso3": "MYS",
    "name_es": "Malasia",
    "region": "asia_pacific"
  },
  {
    "iso3": "IDN",
    "name_es": "Indonesia",
    "region": "asia_pacific"
  },
  {
    "iso3": "THA",
    "name_es": "Tailandia",
    "region": "asia_pacific"
  },
  {
    "iso3": "VNM",
    "name_es": "Vietnam",
    "region": "asia_pacific"
  },
  {
    "iso3": "PHL",
    "name_es": "Filipinas",
    "region": "asia_pacific"
  },
  {
    "iso3": "IND",
    "name_es": "India",
    "region": "asia_pacific"
  },
  {
    "iso3": "PAK",
    "name_es": "Pakistán",
    "region": "asia_pacific"
  },
  {
    "iso3": "BGD",
    "name_es": "Bangladesh",
    "region": "asia_pacific"
  },
  {
    "iso3": "LKA",
    "name_es": "Sri Lanka",
    "region": "asia_pacific"
  },
  {
    "iso3": "MMR",
    "name_es": "Myanmar",
    "region": "asia_pacific"
  },
  {
    "iso3": "KHM",
    "name_es": "Camboya",
    "region": "asia_pacific"
  },
  {
    "iso3": "AUS",
    "name_es": "Australia",
    "region": "asia_pacific"
  },
  {
    "iso3": "NZL",
    "name_es": "Nueva Zelanda",
    "region": "asia_pacific"
  },
  {
    "iso3": "ARE",
    "name_es": "Emiratos Árabes Unidos",
    "region": "middle_east"
  },
  {
    "iso3": "SAU",
    "name_es": "Arabia Saudita",
    "region": "middle_east"
  },
  {
    "iso3": "QAT",
    "name_es": "Qatar",
    "region": "middle_east"
  },
  {
    "iso3": "KWT",
    "name_es": "Kuwait",
    "region": "middle_east"
  },
  {
    "iso3": "BHR",
    "name_es": "Baréin",
    "region": "middle_east"
  },
  {
    "iso3": "OMN",
    "name_es": "Omán",
    "region": "middle_east"
  },
  {
    "iso3": "IRN",
    "name_es": "Irán",
    "region": "middle_east"
  },
  {
    "iso3": "IRQ",
    "name_es": "Irak",
    "region": "middle_east"
  },
  {
    "iso3": "ISR",
    "name_es": "Israel",
    "region": "middle_east"
  },
  {
    "iso3": "JOR",
    "name_es": "Jordania",
    "region": "middle_east"
  },
  {
    "iso3": "LBN",
    "name_es": "Líbano",
    "region": "middle_east"
  },
  {
    "iso3": "SYR",
    "name_es": "Siria",
    "region": "middle_east"
  },
  {
    "iso3": "YEM",
    "name_es": "Yemen",
    "region": "middle_east"
  },
  {
    "iso3": "EGY",
    "name_es": "Egipto",
    "region": "middle_east"
  },
  {
    "iso3": "USA",
    "name_es": "Estados Unidos",
    "region": "north_america"
  },
  {
    "iso3": "CAN",
    "name_es": "Canadá",
    "region": "north_america"
  },
  {
    "iso3": "MEX",
    "name_es": "México",
    "region": "north_america"
  },
  {
    "iso3": "BRA",
    "name_es": "Brasil",
    "region": "latin_america"
  },
  {
    "iso3": "ARG",
    "name_es": "Argentina",
    "region": "latin_america"
  },
  {
    "iso3": "CHL",
    "name_es": "Chile",
    "region": "latin_america"
  },
  {
    "iso3": "COL",
    "name_es": "Colombia",
    "region": "latin_america"
  },
  {
    "iso3": "PER",
    "name_es": "Perú",
    "region": "latin_america"
  },
  {
    "iso3": "VEN",
    "name_es": "Venezuela",
    "region": "latin_america"
  },
  {
    "iso3": "ECU",
    "name_es": "Ecuador",
    "region": "latin_america"
  },
  {
    "iso3": "URY",
    "name_es": "Uruguay",
    "region": "latin_america"
  },
  {
    "iso3": "PRY",
    "name_es": "Paraguay",
    "region": "latin_america"
  },
  {
    "iso3": "BOL",
    "name_es": "Bolivia",
    "region": "latin_america"
  },
  {
    "iso3": "CUB",
    "name_es": "Cuba",
    "region": "latin_america"
  },
  {
    "iso3": "DOM",
    "name_es": "República Dominicana",
    "region": "latin_america"
  },
  {
    "iso3": "PAN",
    "name_es": "Panamá",
    "region": "latin_america"
  },
  {
    "iso3": "CRI",
    "name_es": "Costa Rica",
    "region": "latin_america"
  },
  {
    "iso3": "GTM",
    "name_es": "Guatemala",
    "region": "latin_america"
  },
  {
    "iso3": "HND",
    "name_es": "Honduras",
    "region": "latin_america"
  },
  {
    "iso3": "SLV",
    "name_es": "El Salvador",
    "region": "latin_america"
  },
  {
    "iso3": "NIC",
    "name_es": "Nicaragua",
    "region": "latin_america"
  },
  {
    "iso3": "PRI",
    "name_es": "Puerto Rico",
    "region": "latin_america"
  },
  {
    "iso3": "JAM",
    "name_es": "Jamaica",
    "region": "latin_america"
  },
  {
    "iso3": "MAR",
    "name_es": "Marruecos",
    "region": "africa"
  },
  {
    "iso3": "DZA",
    "name_es": "Argelia",
    "region": "africa"
  },
  {
    "iso3": "TUN",
    "name_es": "Túnez",
    "region": "africa"
  },
  {
    "iso3": "LBY",
    "name_es": "Libia",
    "region": "africa"
  },
  {
    "iso3": "NGA",
    "name_es": "Nigeria",
    "region": "africa"
  },
  {
    "iso3": "ZAF",
    "name_es": "Sudáfrica",
    "region": "africa"
  },
  {
    "iso3": "KEN",
    "name_es": "Kenia",
    "region": "africa"
  },
  {
    "iso3": "ETH",
    "name_es": "Etiopía",
    "region": "africa"
  },
  {
    "iso3": "GHA",
    "name_es": "Ghana",
    "region": "africa"
  },
  {
    "iso3": "CIV",
    "name_es": "Costa de Marfil",
    "region": "africa"
  },
  {
    "iso3": "SEN",
    "name_es": "Senegal",
    "region": "africa"
  },
  {
    "iso3": "CMR",
    "name_es": "Camerún",
    "region": "africa"
  },
  {
    "iso3": "AGO",
    "name_es": "Angola",
    "region": "africa"
  },
  {
    "iso3": "MOZ",
    "name_es": "Mozambique",
    "region": "africa"
  },
  {
    "iso3": "TZA",
    "name_es": "Tanzania",
    "region": "africa"
  },
  {
    "iso3": "UGA",
    "name_es": "Uganda",
    "region": "africa"
  },
  {
    "iso3": "DJI",
    "name_es": "Yibuti",
    "region": "africa"
  },
  {
    "iso3": "MDG",
    "name_es": "Madagascar",
    "region": "africa"
  },
  {
    "iso3": "MUS",
    "name_es": "Mauricio",
    "region": "africa"
  }
]

export const COUNTRY_BY_ISO3: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.iso3, c]),
)

export function searchCountries(query: string, limit = 12): Country[] {
  if (!query) return COUNTRIES.slice(0, limit)
  const q = query.toLowerCase()
  // Prioriza match ISO3 exacto, luego prefix name_es, luego substring name_es
  const exact = COUNTRIES.filter((c) => c.iso3.toLowerCase() === q)
  const prefixIso = COUNTRIES.filter(
    (c) => c.iso3.toLowerCase().startsWith(q) && c.iso3.toLowerCase() !== q,
  )
  const prefixName = COUNTRIES.filter(
    (c) => c.name_es.toLowerCase().startsWith(q),
  )
  const substring = COUNTRIES.filter(
    (c) =>
      c.name_es.toLowerCase().includes(q) &&
      !c.name_es.toLowerCase().startsWith(q),
  )
  const merged: Country[] = []
  const seen = new Set<string>()
  for (const arr of [exact, prefixIso, prefixName, substring]) {
    for (const c of arr) {
      if (!seen.has(c.iso3)) {
        merged.push(c)
        seen.add(c.iso3)
      }
    }
  }
  return merged.slice(0, limit)
}
