/**
 * Dataset de 50 relaciones adicionales importadas del CSV
 * `relaciones_politicas_personas_top50.csv` (mayo 2026).
 *
 * Algunos hechos solapan con `relaciones-csv-curadas.ts` (next50) pero
 * con fechas más precisas y descripciones complementarias — el sistema
 * los muestra todos para enriquecer el tooltip.
 *
 * Alias resueltos (CSV → ID del fixture):
 *   - "Juan Manuel Moreno"             → juanma-moreno
 *   - "Junts per Catalunya"            → junts
 *   - "Pedro Sánchez/PSOE"             → pedro-s-nchez
 *   - "Podemos (Ione Belarra)"         → ione-belarra
 *   - "UGT/CCOO"                       → ugt
 *   - "CEOE (Antonio Garamendi)"       → ceoe
 *   - "Gobierno de España (Pedro Sánchez)" → gobierno-de-espa-a
 *
 * Mapping intensidad → val:
 *   - alta       → ±85
 *   - media-alta → ±75
 *   - media      → ±65
 *   - mixta+media→ +20 (rivalidad/cooperación con tensiones)
 */

import type { RelacionExplicita } from "./relaciones-explicitas";

const slug = (n: string) => n
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

// Aliases: nombres del CSV con paréntesis o variantes → ID canónico
const ALIAS: Record<string, string> = {
  'Juan Manuel Moreno':                   'juanma-moreno',
  'Junts per Catalunya':                  'junts',
  'Pedro Sánchez/PSOE':                   'pedro-s-nchez',
  'Podemos (Ione Belarra)':               'ione-belarra',
  'UGT/CCOO':                              'ugt',
  'CEOE (Antonio Garamendi)':              'ceoe',
  'Gobierno de España (Pedro Sánchez)':    'gobierno-de-espa-a',
};

const id = (nombre: string): string => ALIAS[nombre] ?? slug(nombre);

export const RELACIONES_CSV_TOP50: RelacionExplicita[] = [
  { a: id('Pedro Sánchez'), b: id('Pere Aragonès'), val: 20, tipo: 'rivalidad_interna',
    label: 'Mesa de diálogo con Generalitat · Ingreso Mínimo Vital y plurilingüismo (dic 2023)' },
  { a: id('Pedro Sánchez'), b: id('Imanol Pradales'), val: 85, tipo: 'pacto_investidura',
    label: 'Acuerda transferir 7 nuevas competencias a Euskadi · aeropuertos, tráfico (mar 2026)' },
  { a: id('Pedro Sánchez'), b: id('Isabel Díaz Ayuso'), val: -85, tipo: 'oposicion_frontal',
    label: 'Ayuso: 2026 "muy oscuro" · acusa al Gobierno de usar Estado contra Madrid (dic 2025)' },
  { a: id('Pedro Sánchez'), b: id('Juan Manuel Moreno'), val: 15, tipo: 'rivalidad_interna',
    label: 'Comisión Bilateral resuelve 87% litigios · acuerdo en menores migrantes (abr 2025)' },
  { a: id('Pedro Sánchez'), b: id('Alfonso Fernández Mañueco'), val: -85, tipo: 'oposicion_frontal',
    label: 'Conflicto por protocolo antiabortista · Sánchez exige explicaciones (ene 2023)' },
  { a: id('Margarita Robles'), b: id('Ejército del Aire y del Espacio'), val: 85, tipo: 'aliado_partido',
    label: 'Ministra elogia eficacia y humanidad en rescates DANA Valencia (nov 2024)' },
  { a: id('Yolanda Díaz'), b: id('UGT/CCOO'), val: 85, tipo: 'aliado_sindical',
    label: 'Acuerdo SMI +5% (1.134€) con efecto retroactivo · flexibilidad sindical (ene 2024)' },
  { a: id('Yolanda Díaz'), b: id('CEOE (Antonio Garamendi)'), val: -65, tipo: 'critica_publica',
    label: 'CEOE se niega a firmar subida SMI · Gobierno denuncia falta de flexibilidad (ene 2024)' },
  { a: id('Nadia Calviño'), b: id('Yolanda Díaz'), val: -85, tipo: 'oposicion_frontal',
    label: 'Choques por ERTE, ley rider y reforma laboral · Calviño reescribe partes (nov 2023)' },
  { a: id('CEOE (Antonio Garamendi)'), b: id('UGT/CCOO'), val: 85, tipo: 'aliado_sindical',
    label: 'V AENC firmado: +4% (2023), +3% (2024-25) con cláusula IPC (may 2023)' },
  { a: id('AUGC'), b: id('Leonardo Marcos'), val: -85, tipo: 'oposicion_frontal',
    label: 'AUGC celebra dimisión: "falta de diálogo y prepotencia tras gestión desastrosa" (sep 2024)' },
  { a: id('Luis Planas'), b: id('UPA'), val: 85, tipo: 'aliado_sindical',
    label: 'Acuerdo 43 medidas: simplificar PAC, fiscales, sanidad animal · respuesta protestas (abr 2024)' },
  { a: id('Alberto Núñez Feijóo'), b: id('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Feijóo: pacto PSOE-Junts es "capitulación" · amnistía por conveniencia personal (nov 2023)' },
  { a: id('Alberto Núñez Feijóo'), b: id('Isabel Díaz Ayuso'), val: -75, tipo: 'rivalidad_interna',
    label: 'Ayuso presiona a Feijóo para romper negociaciones CGPJ · cede a su presión (2023)' },
  { a: id('Irene Montero'), b: id('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Montero: Sánchez echó a Podemos del Gobierno · "matrimonio de conveniencia" (dic 2023)' },
  { a: id('Irene Montero'), b: id('Yolanda Díaz'), val: -85, tipo: 'oposicion_frontal',
    label: 'Montero: ruptura Podemos-Sumar definitiva · acusa a Díaz por la salida (dic 2023)' },
  { a: id('Emiliano García-Page'), b: id('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Página exige voto de confianza o elecciones · no aplaude en Comité Federal (jul 2025)' },
  { a: id('Juan Roig'), b: id('Pedro Sánchez'), val: -75, tipo: 'critica_publica',
    label: 'Mercadona: pactos de investidura dividen España y perjudican inversiones (nov 2023)' },
  { a: id('Ione Belarra'), b: id('Juan Roig'), val: -85, tipo: 'oposicion_frontal',
    label: 'Belarra: Roig "capo" de oligopolio · propone supermercado público (may 2023)' },
  { a: id('Arnaldo Otegi'), b: id('Pedro Sánchez'), val: 75, tipo: 'pacto_investidura',
    label: 'Otegi celebra foto con Sánchez y Santos Cerdán · "nueva fase política" (oct 2023)' },
  { a: id('Carles Puigdemont'), b: id('Pedro Sánchez'), val: 20, tipo: 'rivalidad_interna',
    label: 'Sánchez defiende amnistía · Puigdemont fugado se vuelve clave para investidura (oct 2023)' },
  { a: id('Javier Tebas'), b: id('Florentino Pérez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Tebas: Florentino "mesiánico, sectario y supremacista" en disputa Superliga (nov 2025)' },
  { a: id('Pere Aragonès'), b: id('Carles Puigdemont'), val: -85, tipo: 'oposicion_frontal',
    label: 'Aragonès: "se rinde quien deja gobierno a mitad legislatura" · electoralismo (mar 2024)' },
  { a: id('Sindicatos policiales'), b: id('Fernando Grande-Marlaska'), val: -85, tipo: 'oposicion_frontal',
    label: 'Conflicto colectivo · Marlaska apela sentencia equiparación Guardia Civil-Policía (feb 2026)' },
  { a: id('Aitor Esteban'), b: id('Pedro Sánchez'), val: -65, tipo: 'critica_publica',
    label: 'PNV urge fin de escándalos o elecciones · año y medio inviable (dic 2025)' },
  { a: id('Pedro Sánchez'), b: id('Junts per Catalunya'), val: 65, tipo: 'pacto_investidura',
    label: 'Sánchez anuncia real decreto con exigencias Junts · dispuesto a reunirse con Puigdemont (2026)' },
  { a: id('Mónica García'), b: id('Isabel Díaz Ayuso'), val: -85, tipo: 'oposicion_frontal',
    label: 'Ministra Sanidad: Madrid "guarida de peores políticas trampistas" · freno al progreso (2024)' },
  { a: id('Ada Colau'), b: id('Jaume Collboni'), val: -85, tipo: 'oposicion_frontal',
    label: 'Colau: Collboni dejó Barcelona "sin futuro" · frenó superillas, sin presupuestos (2024)' },
  { a: id('Alfonso Rueda'), b: id('Isabel Rodríguez'), val: 85, tipo: 'pacto_autonomico',
    label: 'Firma transferencia litoral gallego a Xunta · efectiva 1 julio (abr 2025)' },
  { a: id('Pedro Sánchez'), b: id('Ana Botín'), val: -65, tipo: 'critica_publica',
    label: 'Sánchez ignora petición de Botín para frenar impuesto a la banca · denuncia discriminación (2024)' },
  { a: id('Ignacio Sánchez Galán'), b: id('Gobierno de España'), val: -85, tipo: 'oposicion_frontal',
    label: 'Iberdrola: impuesto energéticas contraviene directivas UE · recurre a tribunales (2022)' },
  { a: id('Josu Jon Imaz'), b: id('Gobierno de España'), val: -75, tipo: 'critica_publica',
    label: 'Repsol pagó 335M por tasa · frena inversiones · desaparecerá en 2025 (may 2024)' },
  { a: id('Gabriel Rufián'), b: id('Junts per Catalunya'), val: -85, tipo: 'oposicion_frontal',
    label: 'Rufián billete 50€ a Junts por decreto alquileres · "pelotón ejecución" (abr 2026)' },
  { a: id('Luis Rubiales'), b: id('Jennifer Hermoso'), val: -85, tipo: 'oposicion_frontal',
    label: 'Beso sin consentimiento en Mundial · suspensión FIFA · negativa a dimitir (ago 2023)' },
  { a: id('Luis Rubiales'), b: id('Gobierno de España (Pedro Sánchez)'), val: -85, tipo: 'oposicion_frontal',
    label: 'Sánchez condena comportamiento Rubiales · disculpas insuficientes · expediente (ago 2023)' },
  { a: id('Gabriel Rufián'), b: id('Santiago Abascal'), val: -85, tipo: 'oposicion_frontal',
    label: 'Rufián: Abascal "más Abderramán II que el Cid" · racismo no debería permitirse (abr 2026)' },
  { a: id('Santiago Abascal'), b: id('Alberto Núñez Feijóo'), val: -85, tipo: 'oposicion_frontal',
    label: 'Vox: PP "veleta azul" · obstaculiza pactos en Extremadura y Aragón (mar 2026)' },
  { a: id('Joan Laporta'), b: id('Javier Tebas'), val: -65, tipo: 'critica_publica',
    label: 'Laporta desmiente a Tebas: Barça cumple sistema 1:1 · LaLiga puso obstáculos (2026)' },
  { a: id('Alberto Núñez Feijóo'), b: id('Carles Puigdemont'), val: -85, tipo: 'oposicion_frontal',
    label: 'Feijóo propone aplicar art. 155 · Puigdemont: PP "traicionero" por bloquear catalán UE (2025)' },
  { a: id('CSIF'), b: id('Gobierno de España'), val: -65, tipo: 'critica_publica',
    label: 'CSIF propone movilizaciones con UGT y CCOO · 1.200M pendientes subida 0,5% (may 2026)' },
  { a: id('Unai Sordo'), b: id('CEOE (Antonio Garamendi)'), val: -65, tipo: 'critica_publica',
    label: 'CCOO protesta reducir jornada 40→37,5h · patronal teme mayores costes (sep 2024)' },
  { a: id('Antonio Garamendi'), b: id('Gobierno de España'), val: -65, tipo: 'critica_publica',
    label: 'CEOE: Gobierno culpa siempre a empresas · corrupción ahuyenta inversores (jul 2025)' },
  { a: id('Isabel Díaz Ayuso'), b: id('Alberto Núñez Feijóo'), val: -85, tipo: 'rivalidad_interna',
    label: 'Ayuso compite por liderar oposición a Sánchez · presume su gobierno como verdadero contrapeso (ene 2026)' },
  { a: id('Yolanda Díaz'), b: id('Podemos (Ione Belarra)'), val: -75, tipo: 'critica_publica',
    label: 'Díaz apela a unidad izquierda · Belarra la ignora por diferencias política militar/vivienda (ene 2026)' },
  { a: id('Ione Belarra'), b: id('Pedro Sánchez/PSOE'), val: -85, tipo: 'oposicion_frontal',
    label: 'Belarra: PSOE "conservador y timorato" por no intervenir oligopolio alimentario (may 2023)' },
  { a: id('Alfonso Rueda'), b: id('Pedro Sánchez'), val: 65, tipo: 'pacto_autonomico',
    label: 'Acercamiento Xunta-Gobierno: transferencia litoral y nuevas competencias a Galicia (abr 2025)' },
  { a: id('Antonio Garamendi'), b: id('Pedro Sánchez'), val: -65, tipo: 'critica_publica',
    label: 'Garamendi: Sánchez responsabiliza siempre a empresas · espanta inversores con corrupción (jul 2025)' },
  { a: id('Unai Sordo'), b: id('Gobierno de España'), val: 20, tipo: 'rivalidad_interna',
    label: 'Sordo apoya reducir jornada pero pide al Gobierno persuadir patronal sin afectar empleo (sep 2024)' },
];
