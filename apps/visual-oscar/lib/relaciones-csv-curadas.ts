/**
 * Dataset de 50 relaciones adicionales entre actores políticos españoles
 * importadas desde el CSV curado `relaciones_politicas_personas_next50.csv`
 * (mayo 2026).
 *
 * Cada relación tiene fuente periodística verificable (enlace) y fecha.
 * Se concatena al array RELACIONES_EXPLICITAS principal en
 * `lib/relaciones-explicitas.ts` para enriquecer el grafo de actores.
 *
 * Mapeo CSV → shape interno:
 *  - Tipo_relacion + Intensidad → (val, tipo)
 *    · Positiva + Alta  →  +85, aliado_partido
 *    · Positiva + Media →  +65, aliado_partido
 *    · Negativa + Alta  →  -85, oposicion_frontal
 *    · Negativa + Media →  -65, critica_publica
 *    · Mixta + Alta     →  +25, rivalidad_interna
 *    · Mixta + Media    →  +15, rivalidad_interna
 *  - Persona1/Persona2 → slug ID (mismo algoritmo que actores.ts)
 *  - Descripcion + Fecha → label (truncado a ~120 chars para el tooltip)
 *
 * IDs que no existan en el dataset de actores se filtrarán automáticamente
 * en `filtrarRelaciones()` (no rompen el grafo).
 */

import type { RelacionExplicita } from "./relaciones-explicitas";

// Helper · mismo algoritmo EXACTO que buildActor() de data/actores-fixture.ts
// y la función id() de lib/relaciones-explicitas.ts. NO normaliza tildes
// (las tildes se convierten en '-'). Así "Pedro Sánchez" → "pedro-s-nchez".
const slug = (n: string) => n
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

// ─── 50 relaciones curadas (CSV next50) ────────────────────────────────

export const RELACIONES_CSV_CURADAS: RelacionExplicita[] = [
  { a: slug('Cuca Gamarra'), b: slug('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'PP acusa al presidente de usar política internacional para desviar de corrupción (abr 2024)' },
  { a: slug('María Pastor'), b: slug('Isabel Díaz Ayuso'), val: -65, tipo: 'critica_publica',
    label: 'Más Madrid critica viaje a México: "no tiene perfil institucional" (abr 2024)' },
  { a: slug('Mar Espinar'), b: slug('Isabel Díaz Ayuso'), val: -65, tipo: 'critica_publica',
    label: 'PSOE-M: "Ayuso no se preocupa por Madrid, tendrá que dar explicaciones" (abr 2024)' },
  { a: slug('Óscar Puente'), b: slug('Alberto Núñez Feijóo'), val: -85, tipo: 'oposicion_frontal',
    label: 'Ministro Transportes llama "imbécil" al líder del PP en redes (ene 2024)' },
  { a: slug('Ester Muñoz'), b: slug('Óscar Puente'), val: -65, tipo: 'critica_publica',
    label: 'Portavoz PP acusa al ministro de pertenecer al partido más radical (ene 2024)' },
  { a: slug('Margarita Robles'), b: slug('Isabel Díaz Ayuso'), val: -65, tipo: 'critica_publica',
    label: 'Ministra Defensa: Ayuso se equivocó al reunirse con Milei (abr 2024)' },
  { a: slug('Juan Lobato'), b: slug('Isabel Díaz Ayuso'), val: -65, tipo: 'critica_publica',
    label: 'PSOE-M reprocha condecoración a Milei: "España ofrece sanidad universal" (may 2024)' },
  { a: slug('Isabel Díaz Ayuso'), b: slug('Javier Milei'), val: 85, tipo: 'aliado_partido',
    label: 'Ayuso defiende visita: "honor recibir a jefe de Estado legítimo" (may 2024)' },
  { a: slug('Javier Milei'), b: slug('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Milei llama "corrupta" a esposa de Sánchez · España retira embajador (may 2024)' },
  { a: slug('José María Aznar'), b: slug('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Aznar califica el gobierno de "ineptocracia corrupta" (feb 2024)' },
  { a: slug('José María Aznar'), b: slug('Santiago Abascal'), val: -65, tipo: 'critica_publica',
    label: 'Aznar: "No me gustan los populismos de derecha ni de izquierda" (oct 2024)' },
  { a: slug('Juanma Moreno'), b: slug('Pedro Sánchez'), val: -65, tipo: 'critica_publica',
    label: 'Moreno reprocha falta de firmeza contra el narcotráfico (mar 2024)' },
  { a: slug('Juanma Moreno'), b: slug('Fernando Grande-Marlaska'), val: -65, tipo: 'critica_publica',
    label: 'Reproche por no asistir a funerales de guardias civiles en Andalucía (mar 2024)' },
  { a: slug('Ione Belarra'), b: slug('Juan Roig'), val: -65, tipo: 'critica_publica',
    label: 'Belarra acusa a Roig de "capo" de oligopolio del 25% del mercado (may 2023)' },
  { a: slug('Alberto Núñez Feijóo'), b: slug('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Feijóo: con el pacto PSOE-Junts "España pierde, se fortalece el independentismo" (nov 2023)' },
  { a: slug('Alberto Núñez Feijóo'), b: slug('Isabel Díaz Ayuso'), val: 15, tipo: 'rivalidad_interna',
    label: 'Ayuso marca agenda PP antes que Feijóo: regularización, amnistía (abr 2024)' },
  { a: slug('Santiago Abascal'), b: slug('Alberto Núñez Feijóo'), val: -85, tipo: 'oposicion_frontal',
    label: 'Vox: PP "veleta azul" incapaz de romper con Sánchez · "guerra sucia" (mar 2026)' },
  { a: slug('Alberto Núñez Feijóo'), b: slug('Carles Puigdemont'), val: -85, tipo: 'oposicion_frontal',
    label: 'Feijóo propone aplicar art. 155 si Puigdemont vuelve · "humillación" (jul 2025)' },
  { a: slug('Pedro Sánchez'), b: slug('Ione Belarra'), val: -85, tipo: 'oposicion_frontal',
    label: 'Belarra: Sánchez expulsó a Podemos del Gobierno y rompió unidad izquierda (nov 2023)' },
  { a: slug('Nadia Calviño'), b: slug('Yolanda Díaz'), val: -85, tipo: 'oposicion_frontal',
    label: 'Choques repetidos por reforma laboral, SMI y subsidios desempleo (nov 2023)' },
  { a: slug('Emiliano García-Page'), b: slug('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Página pide voto de confianza o nuevas elecciones · no aplaude en Comité Federal (jul 2025)' },
  { a: slug('Juan Roig'), b: slug('Pedro Sánchez'), val: -65, tipo: 'critica_publica',
    label: 'Presidente Mercadona: "los pactos de investidura dividen a los españoles" (nov 2023)' },
  { a: slug('Pedro Sánchez'), b: slug('Carles Puigdemont'), val: 25, tipo: 'rivalidad_interna',
    label: 'Sánchez defiende amnistía pese a descartarla antes · clave para investidura (oct 2023)' },
  { a: slug('Aitor Esteban'), b: slug('Pedro Sánchez'), val: -65, tipo: 'critica_publica',
    label: 'PNV: "fin de la hemorragia de escándalos o convocar elecciones" (dic 2025)' },
  { a: slug('Santiago Abascal'), b: slug('Gabriel Rufián'), val: -85, tipo: 'oposicion_frontal',
    label: 'Rufián: Abascal "se parece más a Abderramán II que al Cid" (abr 2026)' },
  { a: slug('Gabriel Rufián'), b: slug('Junts'), val: -85, tipo: 'oposicion_frontal',
    label: 'Rufián agita billete de 50€ a Junts por voto alquileres · "pelotón ejecución" (abr 2026)' },
  { a: slug('Pere Aragonès'), b: slug('Carles Puigdemont'), val: -65, tipo: 'critica_publica',
    label: 'Aragonès: "se rinden quienes abandonan a mitad de legislatura" (mar 2024)' },
  { a: slug('Javier Tebas'), b: slug('Florentino Pérez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Tebas vs Florentino por Superliga: "tono mesiánico, sectario y supremacista" (nov 2025)' },
  { a: slug('Isabel Díaz Ayuso'), b: slug('Pedro Sánchez'), val: -85, tipo: 'oposicion_frontal',
    label: 'Ayuso será "contrapeso de Sánchez" · vaticina 2026 muy oscuro (dic 2025)' },
  { a: slug('Mónica García'), b: slug('Isabel Díaz Ayuso'), val: -85, tipo: 'oposicion_frontal',
    label: 'Ministra Sanidad: Madrid "guarida de las peores políticas trumpistas" (abr 2024)' },
  { a: slug('Ada Colau'), b: slug('Jaume Collboni'), val: -65, tipo: 'critica_publica',
    label: 'Colau: Collboni dejó Barcelona "sin modelo de futuro" tras frenar superilla (sep 2024)' },
  { a: slug('CSIF'), b: slug('Gobierno de España'), val: -65, tipo: 'critica_publica',
    label: 'CSIF propone movilizaciones · 1.200M deuda por subida 0,5% impagada (may 2026)' },
  { a: slug('Unai Sordo'), b: slug('Gobierno de España'), val: -65, tipo: 'critica_publica',
    label: 'CCOO exige reducir jornada de 40 a 37,5h sin rebaja salarial (sep 2024)' },
  { a: slug('Ignacio Sánchez Galán'), b: slug('Gobierno de España'), val: -65, tipo: 'critica_publica',
    label: 'Iberdrola recurrirá impuesto a energéticas en tribunales (nov 2022)' },
  { a: slug('Josu Jon Imaz'), b: slug('Gobierno de España'), val: -65, tipo: 'critica_publica',
    label: 'Repsol pagó 335M por tasa energéticas · augura desaparición en 2025 (feb 2025)' },
  { a: slug('Antonio Garamendi'), b: slug('Gobierno de España'), val: -65, tipo: 'critica_publica',
    label: 'CEOE critica que el Gobierno culpe a las empresas · inestabilidad ahuyenta inversión (jul 2025)' },
  { a: slug('Ana Botín'), b: slug('Pedro Sánchez'), val: -65, tipo: 'critica_publica',
    label: 'Botín pidió a Sánchez frenar impuesto a la banca · denuncia discriminación (dic 2024)' },
  { a: slug('Javier Milei'), b: slug('Josep Borrell'), val: -65, tipo: 'critica_publica',
    label: 'Borrell: ataques a familiares "no tienen cabida en nuestra cultura" (may 2024)' },
  { a: slug('Luis Rubiales'), b: slug('Jennifer Hermoso'), val: -85, tipo: 'oposicion_frontal',
    label: 'Beso sin consentimiento en Mundial · negativa a dimitir · suspensión FIFA (ago 2023)' },
  { a: slug('Sindicatos policiales'), b: slug('Fernando Grande-Marlaska'), val: -85, tipo: 'oposicion_frontal',
    label: 'Sindicatos amenazan con paralizar Consejo de Policía por equiparación salarial (sep 2024)' },
  { a: slug('Arnaldo Otegi'), b: slug('Pedro Sánchez'), val: 65, tipo: 'aliado_partido',
    label: 'Otegi: foto con Sánchez es "normalización y nueva etapa política" (oct 2023)' },
  { a: slug('Santiago Abascal'), b: slug('Alfonso Fernández Mañueco'), val: -65, tipo: 'critica_publica',
    label: 'Abascal: "del género tonto" demonizar a Vox y luego pedir sus votos (mar 2026)' },
  { a: slug('Nadia Calviño'), b: slug('Pedro Sánchez'), val: -65, tipo: 'critica_publica',
    label: 'Tensiones internas por reforma laboral · Calviño reescribió partes (nov 2023)' },
  { a: slug('Unai Sordo'), b: slug('CEOE'), val: -65, tipo: 'critica_publica',
    label: 'CCOO presiona por reducir jornada · patronal teme aumento costes (sep 2024)' },
  { a: slug('Pedro Sánchez'), b: slug('Unai Sordo'), val: 65, tipo: 'aliado_partido',
    label: 'Acuerdo reforma pensiones · sube bases máximas + cuota solidaridad (mar 2023)' },
  { a: slug('Pedro Sánchez'), b: slug('Yolanda Díaz'), val: 65, tipo: 'aliado_partido',
    label: 'Sánchez evita criticar a Díaz por Junts · dirige reproches a Feijóo y Abascal (may 2026)' },
  { a: slug('Pedro Sánchez'), b: slug('Santiago Abascal'), val: -65, tipo: 'critica_publica',
    label: 'Sánchez acusa a Feijóo y Abascal de apoyar guerra EEUU-Israel (mar 2026)' },
  { a: slug('Luis Rubiales'), b: slug('Gobierno de España'), val: -85, tipo: 'oposicion_frontal',
    label: 'Negativa a dimitir tras beso · Gobierno exige responsabilidades (ago 2023)' },
  { a: slug('CEOE'), b: slug('UGT'), val: 65, tipo: 'aliado_partido',
    label: 'V AENC: subida salarial 4% (2023) y 3% (2024-25) · cláusula revisión IPC (may 2023)' },
  { a: slug('AUGC'), b: slug('Leonardo Marcos'), val: -85, tipo: 'oposicion_frontal',
    label: 'AUGC celebra dimisión: "falta de diálogo, prepotencia y mala gestión" (sep 2024)' },
];
