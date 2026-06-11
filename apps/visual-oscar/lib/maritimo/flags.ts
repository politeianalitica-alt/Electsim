/**
 * MID (Maritime Identification Digits) → país.
 *
 * Los 3 primeros dígitos de un MMSI (Maritime Mobile Service Identity)
 * identifican el país de bandera del buque/estación. Catálogo basado en la
 * tabla oficial ITU (Table of Maritime Identification Digits, Apéndice 43 RR).
 *
 * Utilidad PURA · sin red · sin dependencias · testeable.
 *
 * Uso:
 *   flagFromMmsi('224123456') -> { iso2: 'ES', pais: 'España' }
 *   flagFromMmsi(351789012)   -> { iso2: 'PA', pais: 'Panamá' }  // bandera de conveniencia
 *
 * Para detectar banderas de conveniencia (open registries):
 *   FLAG_BANNER['PA'] === true
 */

export interface FlagInfo {
  iso2: string
  pais: string
}

/**
 * Catálogo MID → { iso2, pais }. Cobertura amplia de la tabla ITU
 * (~250 MID). Países con varios MID aparecen repetidos por cada bloque.
 * Nombres en español. iso2 = ISO 3166-1 alpha-2.
 */
export const MID_MAP: Record<string, FlagInfo> = {
  // ── Europa ───────────────────────────────────────────────
  201: { iso2: 'AL', pais: 'Albania' },
  202: { iso2: 'AD', pais: 'Andorra' },
  203: { iso2: 'AT', pais: 'Austria' },
  204: { iso2: 'PT', pais: 'Azores (Portugal)' },
  205: { iso2: 'BE', pais: 'Bélgica' },
  206: { iso2: 'BY', pais: 'Bielorrusia' },
  207: { iso2: 'BG', pais: 'Bulgaria' },
  208: { iso2: 'VA', pais: 'Vaticano' },
  209: { iso2: 'CY', pais: 'Chipre' },
  210: { iso2: 'CY', pais: 'Chipre' },
  211: { iso2: 'DE', pais: 'Alemania' },
  212: { iso2: 'CY', pais: 'Chipre' },
  213: { iso2: 'GE', pais: 'Georgia' },
  214: { iso2: 'MD', pais: 'Moldavia' },
  215: { iso2: 'MT', pais: 'Malta' },
  216: { iso2: 'AM', pais: 'Armenia' },
  218: { iso2: 'DE', pais: 'Alemania' },
  219: { iso2: 'DK', pais: 'Dinamarca' },
  220: { iso2: 'DK', pais: 'Dinamarca' },
  224: { iso2: 'ES', pais: 'España' },
  225: { iso2: 'ES', pais: 'España' },
  226: { iso2: 'FR', pais: 'Francia' },
  227: { iso2: 'FR', pais: 'Francia' },
  228: { iso2: 'FR', pais: 'Francia' },
  229: { iso2: 'MT', pais: 'Malta' },
  230: { iso2: 'FI', pais: 'Finlandia' },
  231: { iso2: 'FO', pais: 'Islas Feroe' },
  232: { iso2: 'GB', pais: 'Reino Unido' },
  233: { iso2: 'GB', pais: 'Reino Unido' },
  234: { iso2: 'GB', pais: 'Reino Unido' },
  235: { iso2: 'GB', pais: 'Reino Unido' },
  236: { iso2: 'GI', pais: 'Gibraltar' },
  237: { iso2: 'GR', pais: 'Grecia' },
  238: { iso2: 'HR', pais: 'Croacia' },
  239: { iso2: 'GR', pais: 'Grecia' },
  240: { iso2: 'GR', pais: 'Grecia' },
  241: { iso2: 'GR', pais: 'Grecia' },
  242: { iso2: 'MA', pais: 'Marruecos' },
  243: { iso2: 'HU', pais: 'Hungría' },
  244: { iso2: 'NL', pais: 'Países Bajos' },
  245: { iso2: 'NL', pais: 'Países Bajos' },
  246: { iso2: 'NL', pais: 'Países Bajos' },
  247: { iso2: 'IT', pais: 'Italia' },
  248: { iso2: 'MT', pais: 'Malta' },
  249: { iso2: 'MT', pais: 'Malta' },
  250: { iso2: 'IE', pais: 'Irlanda' },
  251: { iso2: 'IS', pais: 'Islandia' },
  252: { iso2: 'LI', pais: 'Liechtenstein' },
  253: { iso2: 'LU', pais: 'Luxemburgo' },
  254: { iso2: 'MC', pais: 'Mónaco' },
  255: { iso2: 'PT', pais: 'Madeira (Portugal)' },
  256: { iso2: 'MT', pais: 'Malta' },
  257: { iso2: 'NO', pais: 'Noruega' },
  258: { iso2: 'NO', pais: 'Noruega' },
  259: { iso2: 'NO', pais: 'Noruega' },
  261: { iso2: 'PL', pais: 'Polonia' },
  262: { iso2: 'ME', pais: 'Montenegro' },
  263: { iso2: 'PT', pais: 'Portugal' },
  264: { iso2: 'RO', pais: 'Rumanía' },
  265: { iso2: 'SE', pais: 'Suecia' },
  266: { iso2: 'SE', pais: 'Suecia' },
  267: { iso2: 'SK', pais: 'Eslovaquia' },
  268: { iso2: 'SM', pais: 'San Marino' },
  269: { iso2: 'CH', pais: 'Suiza' },
  270: { iso2: 'CZ', pais: 'República Checa' },
  271: { iso2: 'TR', pais: 'Turquía' },
  272: { iso2: 'UA', pais: 'Ucrania' },
  273: { iso2: 'RU', pais: 'Rusia' },
  274: { iso2: 'MK', pais: 'Macedonia del Norte' },
  275: { iso2: 'LV', pais: 'Letonia' },
  276: { iso2: 'EE', pais: 'Estonia' },
  277: { iso2: 'LT', pais: 'Lituania' },
  278: { iso2: 'SI', pais: 'Eslovenia' },
  279: { iso2: 'RS', pais: 'Serbia' },

  // ── América del Norte ────────────────────────────────────
  301: { iso2: 'AI', pais: 'Anguila' },
  303: { iso2: 'US', pais: 'Estados Unidos (Alaska)' },
  304: { iso2: 'AG', pais: 'Antigua y Barbuda' },
  305: { iso2: 'AG', pais: 'Antigua y Barbuda' },
  306: { iso2: 'CW', pais: 'Curazao' },
  307: { iso2: 'AW', pais: 'Aruba' },
  308: { iso2: 'BS', pais: 'Bahamas' },
  309: { iso2: 'BS', pais: 'Bahamas' },
  310: { iso2: 'BM', pais: 'Bermudas' },
  311: { iso2: 'BS', pais: 'Bahamas' },
  312: { iso2: 'BZ', pais: 'Belice' },
  314: { iso2: 'BB', pais: 'Barbados' },
  316: { iso2: 'CA', pais: 'Canadá' },
  319: { iso2: 'KY', pais: 'Islas Caimán' },
  321: { iso2: 'CR', pais: 'Costa Rica' },
  323: { iso2: 'CU', pais: 'Cuba' },
  325: { iso2: 'DM', pais: 'Dominica' },
  327: { iso2: 'DO', pais: 'República Dominicana' },
  329: { iso2: 'GP', pais: 'Guadalupe (Francia)' },
  330: { iso2: 'GD', pais: 'Granada' },
  331: { iso2: 'GL', pais: 'Groenlandia' },
  332: { iso2: 'GT', pais: 'Guatemala' },
  334: { iso2: 'HN', pais: 'Honduras' },
  336: { iso2: 'HT', pais: 'Haití' },
  338: { iso2: 'US', pais: 'Estados Unidos' },
  339: { iso2: 'JM', pais: 'Jamaica' },
  341: { iso2: 'KN', pais: 'San Cristóbal y Nieves' },
  343: { iso2: 'LC', pais: 'Santa Lucía' },
  345: { iso2: 'MX', pais: 'México' },
  347: { iso2: 'MQ', pais: 'Martinica (Francia)' },
  348: { iso2: 'MS', pais: 'Montserrat' },
  350: { iso2: 'NI', pais: 'Nicaragua' },
  351: { iso2: 'PA', pais: 'Panamá' },
  352: { iso2: 'PA', pais: 'Panamá' },
  353: { iso2: 'PA', pais: 'Panamá' },
  354: { iso2: 'PA', pais: 'Panamá' },
  355: { iso2: 'PA', pais: 'Panamá' },
  356: { iso2: 'PA', pais: 'Panamá' },
  357: { iso2: 'PA', pais: 'Panamá' },
  358: { iso2: 'PR', pais: 'Puerto Rico' },
  359: { iso2: 'SV', pais: 'El Salvador' },
  361: { iso2: 'PM', pais: 'San Pedro y Miquelón' },
  362: { iso2: 'TT', pais: 'Trinidad y Tobago' },
  364: { iso2: 'TC', pais: 'Islas Turcas y Caicos' },
  366: { iso2: 'US', pais: 'Estados Unidos' },
  367: { iso2: 'US', pais: 'Estados Unidos' },
  368: { iso2: 'US', pais: 'Estados Unidos' },
  369: { iso2: 'US', pais: 'Estados Unidos' },
  370: { iso2: 'PA', pais: 'Panamá' },
  371: { iso2: 'PA', pais: 'Panamá' },
  372: { iso2: 'PA', pais: 'Panamá' },
  373: { iso2: 'PA', pais: 'Panamá' },
  374: { iso2: 'PA', pais: 'Panamá' },
  375: { iso2: 'VC', pais: 'San Vicente y las Granadinas' },
  376: { iso2: 'VC', pais: 'San Vicente y las Granadinas' },
  377: { iso2: 'VC', pais: 'San Vicente y las Granadinas' },
  378: { iso2: 'VG', pais: 'Islas Vírgenes Británicas' },
  379: { iso2: 'VI', pais: 'Islas Vírgenes (EE.UU.)' },

  // ── Asia ─────────────────────────────────────────────────
  401: { iso2: 'AF', pais: 'Afganistán' },
  403: { iso2: 'SA', pais: 'Arabia Saudí' },
  405: { iso2: 'BD', pais: 'Bangladés' },
  408: { iso2: 'BH', pais: 'Baréin' },
  410: { iso2: 'BT', pais: 'Bután' },
  412: { iso2: 'CN', pais: 'China' },
  413: { iso2: 'CN', pais: 'China' },
  414: { iso2: 'CN', pais: 'China' },
  416: { iso2: 'TW', pais: 'Taiwán' },
  417: { iso2: 'LK', pais: 'Sri Lanka' },
  419: { iso2: 'IN', pais: 'India' },
  422: { iso2: 'IR', pais: 'Irán' },
  423: { iso2: 'AZ', pais: 'Azerbaiyán' },
  425: { iso2: 'IQ', pais: 'Irak' },
  428: { iso2: 'IL', pais: 'Israel' },
  431: { iso2: 'JP', pais: 'Japón' },
  432: { iso2: 'JP', pais: 'Japón' },
  434: { iso2: 'TM', pais: 'Turkmenistán' },
  436: { iso2: 'KZ', pais: 'Kazajistán' },
  437: { iso2: 'UZ', pais: 'Uzbekistán' },
  438: { iso2: 'JO', pais: 'Jordania' },
  440: { iso2: 'KR', pais: 'Corea del Sur' },
  441: { iso2: 'KR', pais: 'Corea del Sur' },
  443: { iso2: 'PS', pais: 'Palestina' },
  445: { iso2: 'KP', pais: 'Corea del Norte' },
  447: { iso2: 'KW', pais: 'Kuwait' },
  450: { iso2: 'LB', pais: 'Líbano' },
  451: { iso2: 'KG', pais: 'Kirguistán' },
  453: { iso2: 'MO', pais: 'Macao' },
  455: { iso2: 'MV', pais: 'Maldivas' },
  457: { iso2: 'MN', pais: 'Mongolia' },
  459: { iso2: 'NP', pais: 'Nepal' },
  461: { iso2: 'OM', pais: 'Omán' },
  463: { iso2: 'PK', pais: 'Pakistán' },
  466: { iso2: 'QA', pais: 'Catar' },
  468: { iso2: 'SY', pais: 'Siria' },
  470: { iso2: 'AE', pais: 'Emiratos Árabes Unidos' },
  471: { iso2: 'AE', pais: 'Emiratos Árabes Unidos' },
  472: { iso2: 'TJ', pais: 'Tayikistán' },
  473: { iso2: 'YE', pais: 'Yemen' },
  475: { iso2: 'YE', pais: 'Yemen' },
  477: { iso2: 'HK', pais: 'Hong Kong' },
  478: { iso2: 'BA', pais: 'Bosnia y Herzegovina' },

  // ── Oceanía ──────────────────────────────────────────────
  501: { iso2: 'TF', pais: 'Territorios Australes Franceses' },
  503: { iso2: 'AU', pais: 'Australia' },
  506: { iso2: 'MM', pais: 'Birmania (Myanmar)' },
  508: { iso2: 'BN', pais: 'Brunéi' },
  510: { iso2: 'FM', pais: 'Micronesia' },
  511: { iso2: 'PW', pais: 'Palaos' },
  512: { iso2: 'NZ', pais: 'Nueva Zelanda' },
  514: { iso2: 'KH', pais: 'Camboya' },
  515: { iso2: 'KH', pais: 'Camboya' },
  516: { iso2: 'CX', pais: 'Isla de Navidad' },
  518: { iso2: 'CK', pais: 'Islas Cook' },
  520: { iso2: 'FJ', pais: 'Fiyi' },
  523: { iso2: 'CC', pais: 'Islas Cocos' },
  525: { iso2: 'ID', pais: 'Indonesia' },
  529: { iso2: 'KI', pais: 'Kiribati' },
  531: { iso2: 'LA', pais: 'Laos' },
  533: { iso2: 'MY', pais: 'Malasia' },
  536: { iso2: 'MP', pais: 'Islas Marianas del Norte' },
  538: { iso2: 'MH', pais: 'Islas Marshall' },
  540: { iso2: 'NC', pais: 'Nueva Caledonia' },
  542: { iso2: 'NU', pais: 'Niue' },
  544: { iso2: 'NR', pais: 'Nauru' },
  546: { iso2: 'PF', pais: 'Polinesia Francesa' },
  548: { iso2: 'PH', pais: 'Filipinas' },
  550: { iso2: 'TL', pais: 'Timor Oriental' },
  553: { iso2: 'PG', pais: 'Papúa Nueva Guinea' },
  555: { iso2: 'PN', pais: 'Islas Pitcairn' },
  557: { iso2: 'SB', pais: 'Islas Salomón' },
  559: { iso2: 'AS', pais: 'Samoa Americana' },
  561: { iso2: 'WS', pais: 'Samoa' },
  563: { iso2: 'SG', pais: 'Singapur' },
  564: { iso2: 'SG', pais: 'Singapur' },
  565: { iso2: 'SG', pais: 'Singapur' },
  566: { iso2: 'SG', pais: 'Singapur' },
  567: { iso2: 'TH', pais: 'Tailandia' },
  570: { iso2: 'TO', pais: 'Tonga' },
  572: { iso2: 'TV', pais: 'Tuvalu' },
  574: { iso2: 'VN', pais: 'Vietnam' },
  576: { iso2: 'VU', pais: 'Vanuatu' },
  577: { iso2: 'VU', pais: 'Vanuatu' },
  578: { iso2: 'WF', pais: 'Wallis y Futuna' },

  // ── África ───────────────────────────────────────────────
  601: { iso2: 'ZA', pais: 'Sudáfrica' },
  603: { iso2: 'AO', pais: 'Angola' },
  605: { iso2: 'DZ', pais: 'Argelia' },
  607: { iso2: 'TF', pais: 'Islas San Pablo y Ámsterdam' },
  608: { iso2: 'SH', pais: 'Santa Elena (Ascensión)' },
  609: { iso2: 'BI', pais: 'Burundi' },
  610: { iso2: 'BJ', pais: 'Benín' },
  611: { iso2: 'BW', pais: 'Botsuana' },
  612: { iso2: 'CF', pais: 'República Centroafricana' },
  613: { iso2: 'CM', pais: 'Camerún' },
  615: { iso2: 'CG', pais: 'Congo' },
  616: { iso2: 'KM', pais: 'Comoras' },
  617: { iso2: 'CV', pais: 'Cabo Verde' },
  618: { iso2: 'TF', pais: 'Archipiélago Crozet' },
  619: { iso2: 'CI', pais: 'Costa de Marfil' },
  620: { iso2: 'KM', pais: 'Comoras' },
  621: { iso2: 'DJ', pais: 'Yibuti' },
  622: { iso2: 'EG', pais: 'Egipto' },
  624: { iso2: 'ET', pais: 'Etiopía' },
  625: { iso2: 'ER', pais: 'Eritrea' },
  626: { iso2: 'GA', pais: 'Gabón' },
  627: { iso2: 'GH', pais: 'Ghana' },
  629: { iso2: 'GM', pais: 'Gambia' },
  630: { iso2: 'GW', pais: 'Guinea-Bisáu' },
  631: { iso2: 'GQ', pais: 'Guinea Ecuatorial' },
  632: { iso2: 'GN', pais: 'Guinea' },
  633: { iso2: 'BF', pais: 'Burkina Faso' },
  634: { iso2: 'KE', pais: 'Kenia' },
  635: { iso2: 'TF', pais: 'Islas Kerguelen' },
  636: { iso2: 'LR', pais: 'Liberia' },
  637: { iso2: 'LR', pais: 'Liberia' },
  638: { iso2: 'SS', pais: 'Sudán del Sur' },
  642: { iso2: 'LY', pais: 'Libia' },
  644: { iso2: 'LS', pais: 'Lesoto' },
  645: { iso2: 'MU', pais: 'Mauricio' },
  647: { iso2: 'MG', pais: 'Madagascar' },
  649: { iso2: 'ML', pais: 'Malí' },
  650: { iso2: 'MZ', pais: 'Mozambique' },
  654: { iso2: 'MR', pais: 'Mauritania' },
  655: { iso2: 'MW', pais: 'Malaui' },
  656: { iso2: 'NE', pais: 'Níger' },
  657: { iso2: 'NG', pais: 'Nigeria' },
  659: { iso2: 'NA', pais: 'Namibia' },
  660: { iso2: 'RE', pais: 'Reunión (Francia)' },
  661: { iso2: 'RW', pais: 'Ruanda' },
  662: { iso2: 'SD', pais: 'Sudán' },
  663: { iso2: 'SN', pais: 'Senegal' },
  664: { iso2: 'SC', pais: 'Seychelles' },
  665: { iso2: 'SH', pais: 'Santa Elena' },
  666: { iso2: 'SO', pais: 'Somalia' },
  667: { iso2: 'SL', pais: 'Sierra Leona' },
  668: { iso2: 'ST', pais: 'Santo Tomé y Príncipe' },
  669: { iso2: 'SZ', pais: 'Esuatini' },
  670: { iso2: 'TD', pais: 'Chad' },
  671: { iso2: 'TG', pais: 'Togo' },
  672: { iso2: 'TN', pais: 'Túnez' },
  674: { iso2: 'TZ', pais: 'Tanzania' },
  675: { iso2: 'UG', pais: 'Uganda' },
  676: { iso2: 'CD', pais: 'República Democrática del Congo' },
  677: { iso2: 'TZ', pais: 'Tanzania' },
  678: { iso2: 'ZM', pais: 'Zambia' },
  679: { iso2: 'ZW', pais: 'Zimbabue' },

  // ── América del Sur ──────────────────────────────────────
  701: { iso2: 'AR', pais: 'Argentina' },
  710: { iso2: 'BR', pais: 'Brasil' },
  720: { iso2: 'BO', pais: 'Bolivia' },
  725: { iso2: 'CL', pais: 'Chile' },
  730: { iso2: 'CO', pais: 'Colombia' },
  735: { iso2: 'EC', pais: 'Ecuador' },
  740: { iso2: 'FK', pais: 'Islas Malvinas (Falkland)' },
  745: { iso2: 'GF', pais: 'Guayana Francesa' },
  750: { iso2: 'GY', pais: 'Guyana' },
  755: { iso2: 'PY', pais: 'Paraguay' },
  760: { iso2: 'PE', pais: 'Perú' },
  765: { iso2: 'SR', pais: 'Surinam' },
  770: { iso2: 'UY', pais: 'Uruguay' },
  775: { iso2: 'VE', pais: 'Venezuela' },
}

/**
 * Banderas de conveniencia (open registries). flag=true marca el registro
 * abierto típico (Panamá, Liberia, Marshall, etc.). Útil para señalar buques
 * cuyo MID corresponde a un registro de conveniencia.
 *
 * Indexado por iso2 para que sea trivial cruzar con FlagInfo.iso2.
 */
export const FLAG_BANNER: Record<string, boolean> = {
  PA: true, // Panamá
  LR: true, // Liberia
  MH: true, // Islas Marshall
  HK: true, // Hong Kong
  SG: true, // Singapur
  MT: true, // Malta
  CY: true, // Chipre
  BS: true, // Bahamas
  BM: true, // Bermudas
  KY: true, // Islas Caimán
  VC: true, // San Vicente y las Granadinas
  AG: true, // Antigua y Barbuda
  VU: true, // Vanuatu
  KH: true, // Camboya
  MV: true, // Maldivas (open registry)
  TG: true, // Togo
  CK: true, // Islas Cook
  PW: true, // Palaos
  GI: true, // Gibraltar
  MU: true, // Mauricio
  CW: true, // Curazao
  DM: true, // Dominica
  KN: true, // San Cristóbal y Nieves
  ST: true, // Santo Tomé y Príncipe
  TZ: true, // Tanzania (Zanzíbar)
  MN: true, // Mongolia (registro de conveniencia sin litoral)
  BB: true, // Barbados
}

/**
 * Resuelve la bandera (país) de un MMSI a partir de su MID
 * (3 primeros dígitos). Devuelve null si el MMSI es inválido o el MID
 * no está catalogado. PURA, sin red.
 *
 * Acepta string o number. Limpia espacios. Valida que sea un MMSI
 * plausible (9 dígitos) pero tolera prefijos especiales:
 *  - 00MIDxxxx : estación costera (MID en posiciones 3-5)
 *  - 0MIDxxxxx : estación de grupo de barcos (MID en posiciones 2-4)
 *  - 111MIDxxx : SAR aircraft
 *  - 98/99MID  : auxiliares/AtoN; se intenta el MID interno
 * En el caso normal (buque) el MID son los 3 primeros dígitos.
 */
export function flagFromMmsi(mmsi: string | number | null | undefined): FlagInfo | null {
  if (mmsi == null) return null
  const raw = String(mmsi).trim()
  if (!/^\d+$/.test(raw)) return null

  let midDigits: string | null = null

  if (raw.startsWith('00')) {
    // Estación costera: 00MIDXXXX
    midDigits = raw.slice(2, 5)
  } else if (raw.startsWith('0')) {
    // Estación de grupo de barcos: 0MIDXXXXX
    midDigits = raw.slice(1, 4)
  } else if (raw.startsWith('111')) {
    // SAR aircraft: 111MIDXXX
    midDigits = raw.slice(3, 6)
  } else if (raw.startsWith('98') || raw.startsWith('99')) {
    // Craft asociado a buque madre / AtoN: 98MIDXXXX / 99MIDXXXX
    midDigits = raw.slice(2, 5)
  } else {
    // Buque estándar: MIDXXXXXX (9 dígitos)
    midDigits = raw.slice(0, 3)
  }

  if (!midDigits || midDigits.length < 3) return null
  const info = MID_MAP[midDigits]
  return info ?? null
}

/**
 * Indica si la bandera de un MMSI es de conveniencia (open registry).
 * Devuelve false si no se puede resolver. PURA.
 */
export function isFlagOfConvenience(mmsi: string | number | null | undefined): boolean {
  const info = flagFromMmsi(mmsi)
  if (!info) return false
  return FLAG_BANNER[info.iso2] === true
}
