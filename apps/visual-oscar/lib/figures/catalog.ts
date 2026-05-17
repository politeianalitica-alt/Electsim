/**
 * Catálogo expandido de figuras públicas españolas.
 *
 * Combina:
 *   - Catálogo político existente (lib/actores.ts) → ~300 políticos
 *   - Diputados del Congreso (Open Data dinámico) → 350 actuales
 *   - CEOs y consejeros IBEX35 (vía taxonomy + ampliación)
 *   - Dueños y directores de medios (vía data/medios.json)
 *   - Periodistas estrella enumerados
 *   - Lobbies y consultoras españolas reconocidas
 *   - Fondos de inversión activos en España
 *   - Líderes sindicales y patronales
 *   - Jueces, fiscales y figuras institucionales
 *
 * El catálogo se sirve dinámicamente desde múltiples fuentes y se
 * combina via getAllFigures().
 */

import type { Figure, FigureCategory } from './types'
import { IBEX_COMPANIES } from '@/lib/news-taxonomy'

// ─── EMPRESARIOS · CEOs y figuras corporativas clave ───────────────────────

const EMPRESARIOS: Omit<Figure, 'color'>[] = [
  // Banca
  { id: 'emp-botin', nombre: 'Ana Patricia Botín', category: 'empresario', cargo: 'Presidenta', organizacion: 'Banco Santander', afiliacion: 'Santander',
    ejeX: 30, ejeY: 20, influencia: 92, twitter: 'AnaBotin', wikipedia: 'https://es.wikipedia.org/wiki/Ana_Patricia_Bot%C3%ADn', tags: ['banca','finanzas','ibex'], exposicion: 88 },
  { id: 'emp-torres-vila', nombre: 'Carlos Torres Vila', category: 'empresario', cargo: 'Presidente', organizacion: 'BBVA', afiliacion: 'BBVA',
    ejeX: 28, ejeY: 18, influencia: 86, tags: ['banca','finanzas','ibex'], exposicion: 75 },
  { id: 'emp-goirigolzarri', nombre: 'José Ignacio Goirigolzarri', category: 'empresario', cargo: 'Presidente', organizacion: 'CaixaBank', afiliacion: 'CaixaBank',
    ejeX: 22, ejeY: 25, influencia: 82, tags: ['banca','finanzas','ibex'], exposicion: 70 },
  { id: 'emp-gual-sole', nombre: 'Gonzalo Gortázar', category: 'empresario', cargo: 'CEO', organizacion: 'CaixaBank', afiliacion: 'CaixaBank',
    ejeX: 22, ejeY: 22, influencia: 75, tags: ['banca','finanzas','ibex'], exposicion: 55 },
  { id: 'emp-gonzalez-bueno', nombre: 'César González-Bueno', category: 'empresario', cargo: 'CEO', organizacion: 'Banco Sabadell', afiliacion: 'Sabadell',
    ejeX: 25, ejeY: 15, influencia: 72, tags: ['banca','finanzas','ibex'], exposicion: 58 },
  { id: 'emp-dolz', nombre: 'María Dolores Dancausa', category: 'empresario', cargo: 'CEO', organizacion: 'Bankinter', afiliacion: 'Bankinter',
    ejeX: 25, ejeY: 18, influencia: 70, tags: ['banca','finanzas','ibex'], exposicion: 60 },

  // Energía
  { id: 'emp-galan', nombre: 'Ignacio Sánchez Galán', category: 'empresario', cargo: 'Presidente', organizacion: 'Iberdrola', afiliacion: 'Iberdrola',
    ejeX: 25, ejeY: 22, influencia: 95, twitter: 'IgnacioGalan', tags: ['energia','renovables','ibex'], exposicion: 90 },
  { id: 'emp-bogas', nombre: 'José Bogas', category: 'empresario', cargo: 'CEO', organizacion: 'Endesa', afiliacion: 'Endesa',
    ejeX: 28, ejeY: 15, influencia: 80, tags: ['energia','electricidad','ibex'], exposicion: 65 },
  { id: 'emp-imaz', nombre: 'Josu Jon Imaz', category: 'empresario', cargo: 'CEO', organizacion: 'Repsol', afiliacion: 'Repsol',
    ejeX: 28, ejeY: 20, influencia: 88, tags: ['energia','petroleo','ibex'], exposicion: 78 },
  { id: 'emp-reynes', nombre: 'Francisco Reynés', category: 'empresario', cargo: 'Presidente', organizacion: 'Naturgy', afiliacion: 'Naturgy',
    ejeX: 25, ejeY: 18, influencia: 78, tags: ['energia','gas','ibex'], exposicion: 65 },
  { id: 'emp-corredor', nombre: 'Beatriz Corredor', category: 'empresario', cargo: 'Presidenta', organizacion: 'Redeia', afiliacion: 'Redeia',
    ejeX: -15, ejeY: 30, influencia: 75, tags: ['energia','red electrica'], exposicion: 70 },

  // Telecom
  { id: 'emp-marc-murtra', nombre: 'Marc Murtra', category: 'empresario', cargo: 'Presidente', organizacion: 'Telefónica', afiliacion: 'Telefónica',
    ejeX: 5, ejeY: 25, influencia: 92, tags: ['telecom','tecnologia','ibex'], exposicion: 85 },
  { id: 'emp-pallete', nombre: 'José María Álvarez-Pallete', category: 'empresario', cargo: 'Ex-Presidente', organizacion: 'Telefónica', afiliacion: 'Telefónica',
    ejeX: 25, ejeY: 22, influencia: 78, tags: ['telecom','tecnologia'], exposicion: 60 },
  { id: 'emp-bertolin', nombre: 'Tobias Martínez', category: 'empresario', cargo: 'CEO', organizacion: 'Cellnex', afiliacion: 'Cellnex',
    ejeX: 25, ejeY: 18, influencia: 70, tags: ['telecom','infraestructura','ibex'], exposicion: 50 },

  // Construcción e infraestructuras
  { id: 'emp-amancio', nombre: 'Amancio Ortega', category: 'empresario', cargo: 'Fundador', organizacion: 'Inditex', afiliacion: 'Inditex',
    ejeX: 22, ejeY: 18, influencia: 100, wikipedia: 'https://es.wikipedia.org/wiki/Amancio_Ortega', tags: ['moda','retail','ibex','patrimonio'], exposicion: 95 },
  { id: 'emp-marta-ortega', nombre: 'Marta Ortega', category: 'empresario', cargo: 'Presidenta', organizacion: 'Inditex', afiliacion: 'Inditex',
    ejeX: 18, ejeY: 18, influencia: 88, tags: ['moda','retail','ibex'], exposicion: 78 },
  { id: 'emp-garcia-maceiras', nombre: 'Óscar García Maceiras', category: 'empresario', cargo: 'CEO', organizacion: 'Inditex', afiliacion: 'Inditex',
    ejeX: 20, ejeY: 20, influencia: 72, tags: ['moda','retail','ibex'], exposicion: 50 },
  { id: 'emp-rafael-villaseca', nombre: 'Rafael Villaseca', category: 'empresario', cargo: 'Ex-CEO', organizacion: 'Naturgy', afiliacion: 'Naturgy',
    ejeX: 28, ejeY: 18, influencia: 60, tags: ['energia'], exposicion: 40 },
  { id: 'emp-pablo-isla', nombre: 'Pablo Isla', category: 'empresario', cargo: 'Ex-Presidente', organizacion: 'Inditex', afiliacion: 'Inditex',
    ejeX: 22, ejeY: 22, influencia: 85, tags: ['retail','consejos'], exposicion: 70 },
  { id: 'emp-elguero', nombre: 'Marcelino Fernández Verdes', category: 'empresario', cargo: 'CEO', organizacion: 'ACS', afiliacion: 'ACS',
    ejeX: 28, ejeY: 18, influencia: 80, tags: ['construccion','ibex'], exposicion: 60 },
  { id: 'emp-florentino', nombre: 'Florentino Pérez', category: 'empresario', cargo: 'Presidente', organizacion: 'ACS', afiliacion: 'ACS',
    ejeX: 32, ejeY: 25, influencia: 95, wikipedia: 'https://es.wikipedia.org/wiki/Florentino_P%C3%A9rez', tags: ['construccion','futbol','ibex'], exposicion: 95 },
  { id: 'emp-villar-mir', nombre: 'Juan-Miguel Villar Mir', category: 'empresario', cargo: 'Ex-Presidente', organizacion: 'OHLA', afiliacion: 'Villar Mir',
    ejeX: 35, ejeY: 25, influencia: 70, tags: ['construccion'], exposicion: 50 },
  { id: 'emp-rafael-del-pino', nombre: 'Rafael del Pino', category: 'empresario', cargo: 'Presidente', organizacion: 'Ferrovial', afiliacion: 'Ferrovial',
    ejeX: 38, ejeY: 22, influencia: 90, tags: ['construccion','infraestructura','ibex'], exposicion: 80 },
  { id: 'emp-juan-bejar', nombre: 'Juan Béjar', category: 'empresario', cargo: 'Consejero', organizacion: 'Ferrovial', afiliacion: 'Ferrovial',
    ejeX: 30, ejeY: 25, influencia: 60, tags: ['construccion'], exposicion: 35 },

  // Distribución / Alimentación
  { id: 'emp-juan-roig', nombre: 'Juan Roig', category: 'empresario', cargo: 'Presidente', organizacion: 'Mercadona', afiliacion: 'Mercadona',
    ejeX: 30, ejeY: 15, influencia: 95, wikipedia: 'https://es.wikipedia.org/wiki/Juan_Roig', tags: ['distribucion','retail','familia'], exposicion: 88 },
  { id: 'emp-juncadella', nombre: 'Rafael Juncadella', category: 'empresario', cargo: 'CEO', organizacion: 'Mercadona', afiliacion: 'Mercadona',
    ejeX: 28, ejeY: 15, influencia: 65, tags: ['distribucion'], exposicion: 40 },

  // Hostelería / Hoteles
  { id: 'emp-escarrer', nombre: 'Gabriel Escarrer Jaume', category: 'empresario', cargo: 'CEO', organizacion: 'Meliá Hotels', afiliacion: 'Meliá',
    ejeX: 28, ejeY: 15, influencia: 78, tags: ['turismo','hoteles','ibex'], exposicion: 65 },
  { id: 'emp-zaplana', nombre: 'Carlos Zaplana', category: 'empresario', cargo: 'CEO', organizacion: 'NH Hoteles', afiliacion: 'NH',
    ejeX: 25, ejeY: 18, influencia: 60, tags: ['turismo','hoteles'], exposicion: 40 },

  // Tecnología / Digital
  { id: 'emp-fernando-abril', nombre: 'Fernando Abril-Martorell', category: 'empresario', cargo: 'Presidente', organizacion: 'Indra', afiliacion: 'Indra',
    ejeX: 22, ejeY: 25, influencia: 75, tags: ['tecnologia','defensa','ibex'], exposicion: 55 },
  { id: 'emp-marc-vidal', nombre: 'Marc Vidal', category: 'empresario', cargo: 'Analista', organizacion: 'Independiente', afiliacion: null,
    ejeX: 15, ejeY: 10, influencia: 65, twitter: 'marcvidal', tags: ['tecnologia','digital'], exposicion: 70 },

  // Familia Polanco / PRISA
  { id: 'emp-cebrian', nombre: 'Juan Luis Cebrián', category: 'empresario', cargo: 'Ex-Presidente', organizacion: 'PRISA', afiliacion: 'PRISA',
    ejeX: -25, ejeY: 12, influencia: 78, wikipedia: 'https://es.wikipedia.org/wiki/Juan_Luis_Cebri%C3%A1n', tags: ['medios','prisa'], exposicion: 70 },
  { id: 'emp-polanco', nombre: 'Isabel Polanco', category: 'empresario', cargo: 'Consejera', organizacion: 'PRISA', afiliacion: 'PRISA',
    ejeX: -15, ejeY: 15, influencia: 65, tags: ['medios','prisa'], exposicion: 35 },

  // Otros patrimonios/fundadores
  { id: 'emp-koplowitz', nombre: 'Esther Koplowitz', category: 'empresario', cargo: 'Vicepresidenta', organizacion: 'FCC', afiliacion: 'FCC',
    ejeX: 30, ejeY: 15, influencia: 72, tags: ['construccion','servicios'], exposicion: 55 },
  { id: 'emp-slim-helu', nombre: 'Carlos Slim (España)', category: 'empresario', cargo: 'Inversor', organizacion: 'FCC / Realia', afiliacion: 'Inbursa',
    ejeX: 28, ejeY: 18, influencia: 70, tags: ['inversion','construccion','telecom'], exposicion: 60 },
  { id: 'emp-juan-aben', nombre: 'Juan Abelló', category: 'empresario', cargo: 'Inversor', organizacion: 'Torreal', afiliacion: null,
    ejeX: 32, ejeY: 18, influencia: 65, tags: ['inversion','consejos'], exposicion: 45 },
]

// ─── MEDIOS · Dueños, directores, presentadores ─────────────────────────────

const MEDIATICOS: Omit<Figure, 'color'>[] = [
  { id: 'med-pedrojramirez', nombre: 'Pedro J. Ramírez', category: 'mediatico', cargo: 'Director / Fundador', organizacion: 'El Español', afiliacion: 'El Español',
    ejeX: 35, ejeY: 20, influencia: 90, twitter: 'pedroj_ramirez', wikipedia: 'https://es.wikipedia.org/wiki/Pedro_J._Ram%C3%ADrez', tags: ['medios','prensa','periodismo'], exposicion: 92 },
  { id: 'med-sanchez-dragon', nombre: 'Carlos Cuesta', category: 'mediatico', cargo: 'Periodista', organizacion: 'OK Diario', afiliacion: 'OK Diario',
    ejeX: 65, ejeY: 35, influencia: 65, tags: ['medios','prensa','derechas'], exposicion: 60 },
  { id: 'med-eduardo-inda', nombre: 'Eduardo Inda', category: 'mediatico', cargo: 'Director', organizacion: 'OK Diario', afiliacion: 'OK Diario',
    ejeX: 70, ejeY: 30, influencia: 85, twitter: 'eduardoinda', tags: ['medios','prensa','derechas'], exposicion: 88 },
  { id: 'med-evole', nombre: 'Jordi Évole', category: 'mediatico', cargo: 'Periodista', organizacion: 'La Sexta', afiliacion: 'Atresmedia',
    ejeX: -45, ejeY: -10, influencia: 88, twitter: 'jordievole', wikipedia: 'https://es.wikipedia.org/wiki/Jordi_%C3%89vole', tags: ['medios','tv','documentales'], exposicion: 90 },
  { id: 'med-iglesias-iker', nombre: 'Iker Jiménez', category: 'mediatico', cargo: 'Presentador', organizacion: 'Cuatro / Mediaset', afiliacion: 'Mediaset',
    ejeX: 15, ejeY: 10, influencia: 80, twitter: 'navedelmisterio', tags: ['medios','tv'], exposicion: 85 },
  { id: 'med-ana-rosa', nombre: 'Ana Rosa Quintana', category: 'mediatico', cargo: 'Presentadora', organizacion: 'Telecinco', afiliacion: 'Mediaset',
    ejeX: 30, ejeY: 15, influencia: 92, wikipedia: 'https://es.wikipedia.org/wiki/Ana_Rosa_Quintana', tags: ['medios','tv'], exposicion: 95 },
  { id: 'med-monica-carrillo', nombre: 'Mónica Carrillo', category: 'periodista', cargo: 'Presentadora', organizacion: 'Antena 3', afiliacion: 'Atresmedia',
    ejeX: 0, ejeY: 10, influencia: 70, twitter: 'monicacarrillo', tags: ['medios','tv'], exposicion: 78 },
  { id: 'med-javier-ruiz', nombre: 'Javier Ruiz', category: 'periodista', cargo: 'Periodista económico', organizacion: 'Cadena SER', afiliacion: 'PRISA',
    ejeX: -30, ejeY: 5, influencia: 70, twitter: 'JavierRuiz', tags: ['medios','radio','economia'], exposicion: 75 },
  { id: 'med-cintora', nombre: 'Jesús Cintora', category: 'periodista', cargo: 'Presentador', organizacion: 'TVE', afiliacion: 'RTVE',
    ejeX: -35, ejeY: 5, influencia: 68, twitter: 'cintora', tags: ['medios','tv'], exposicion: 72 },
  { id: 'med-fer-onega', nombre: 'Fernando Ónega', category: 'periodista', cargo: 'Columnista', organizacion: 'Onda Cero / La Vanguardia', afiliacion: 'Atresmedia',
    ejeX: 5, ejeY: 15, influencia: 65, wikipedia: 'https://es.wikipedia.org/wiki/Fernando_%C3%93nega', tags: ['medios','radio'], exposicion: 60 },
  { id: 'med-roca', nombre: 'Carlos Herrera', category: 'periodista', cargo: 'Locutor estrella', organizacion: 'COPE', afiliacion: 'COPE',
    ejeX: 45, ejeY: 25, influencia: 92, twitter: 'CarlosHerreraOf', wikipedia: 'https://es.wikipedia.org/wiki/Carlos_Herrera_Crusset', tags: ['medios','radio'], exposicion: 95 },
  { id: 'med-alsina', nombre: 'Carlos Alsina', category: 'periodista', cargo: 'Director Más de Uno', organizacion: 'Onda Cero', afiliacion: 'Atresmedia',
    ejeX: 25, ejeY: 18, influencia: 90, twitter: 'CarlosAlsina', tags: ['medios','radio'], exposicion: 92 },
  { id: 'med-llamas', nombre: 'Ángel Expósito', category: 'periodista', cargo: 'Director', organizacion: 'COPE', afiliacion: 'COPE',
    ejeX: 30, ejeY: 22, influencia: 78, twitter: 'angelexposito', tags: ['medios','radio'], exposicion: 80 },
  { id: 'med-pepa-bueno', nombre: 'Pepa Bueno', category: 'periodista', cargo: 'Directora', organizacion: 'El País', afiliacion: 'PRISA',
    ejeX: -20, ejeY: 10, influencia: 88, wikipedia: 'https://es.wikipedia.org/wiki/Pepa_Bueno', tags: ['medios','prensa'], exposicion: 80 },
  { id: 'med-cebrian', nombre: 'Juan Cruz Ruiz', category: 'periodista', cargo: 'Columnista', organizacion: 'El País', afiliacion: 'PRISA',
    ejeX: -15, ejeY: 15, influencia: 65, tags: ['medios','prensa'], exposicion: 50 },
  { id: 'med-ferreras', nombre: 'Antonio García Ferreras', category: 'periodista', cargo: 'Director Al Rojo Vivo', organizacion: 'La Sexta', afiliacion: 'Atresmedia',
    ejeX: -25, ejeY: 10, influencia: 92, twitter: 'AGarciaFerreras', wikipedia: 'https://es.wikipedia.org/wiki/Antonio_Garc%C3%ADa_Ferreras', tags: ['medios','tv'], exposicion: 95 },
  { id: 'med-rosa-villacastin', nombre: 'Rosa Villacastín', category: 'periodista', cargo: 'Columnista', organizacion: 'Varios', afiliacion: null,
    ejeX: 10, ejeY: 10, influencia: 55, tags: ['medios','prensa'], exposicion: 50 },
  { id: 'med-rajoy-pillado', nombre: 'Rosa María Pillado', category: 'periodista', cargo: 'Columnista', organizacion: 'El Mundo', afiliacion: 'Unidad Editorial',
    ejeX: 35, ejeY: 20, influencia: 60, tags: ['medios','prensa'], exposicion: 45 },
  { id: 'med-marhuenda', nombre: 'Francisco Marhuenda', category: 'periodista', cargo: 'Director', organizacion: 'La Razón', afiliacion: 'Planeta',
    ejeX: 55, ejeY: 30, influencia: 80, twitter: 'fmarhuenda', tags: ['medios','prensa'], exposicion: 85 },
  { id: 'med-rubido', nombre: 'Bieito Rubido', category: 'periodista', cargo: 'Director', organizacion: 'The Objective', afiliacion: 'The Objective',
    ejeX: 40, ejeY: 25, influencia: 70, twitter: 'BieitoRubido', tags: ['medios','prensa'], exposicion: 65 },
  { id: 'med-julia-otero', nombre: 'Julia Otero', category: 'periodista', cargo: 'Directora', organizacion: 'Onda Cero', afiliacion: 'Atresmedia',
    ejeX: -15, ejeY: 5, influencia: 85, twitter: 'JuliaOtero', wikipedia: 'https://es.wikipedia.org/wiki/Julia_Otero', tags: ['medios','radio'], exposicion: 85 },
  { id: 'med-piqueras', nombre: 'Pedro Piqueras', category: 'periodista', cargo: 'Ex-Presentador Informativos', organizacion: 'Telecinco', afiliacion: 'Mediaset',
    ejeX: 5, ejeY: 15, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Pedro_Piqueras', tags: ['medios','tv'], exposicion: 78 },
  { id: 'med-vaca', nombre: 'Susanna Griso', category: 'periodista', cargo: 'Presentadora', organizacion: 'Antena 3', afiliacion: 'Atresmedia',
    ejeX: 10, ejeY: 10, influencia: 78, twitter: 'susannagriso', wikipedia: 'https://es.wikipedia.org/wiki/Susanna_Griso', tags: ['medios','tv'], exposicion: 85 },
  { id: 'med-resa-mateo', nombre: 'Vicente Vallés', category: 'periodista', cargo: 'Presentador Informativos', organizacion: 'Antena 3', afiliacion: 'Atresmedia',
    ejeX: 20, ejeY: 15, influencia: 82, twitter: 'vicentevalles', tags: ['medios','tv'], exposicion: 88 },
  { id: 'med-mateo', nombre: 'Matías Prats', category: 'periodista', cargo: 'Presentador', organizacion: 'Antena 3', afiliacion: 'Atresmedia',
    ejeX: 10, ejeY: 10, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Mat%C3%ADas_Prats_C%C3%A1nepa', tags: ['medios','tv'], exposicion: 80 },
  { id: 'med-ines-arrimadas-pp', nombre: 'Mariola Cubells', category: 'periodista', cargo: 'Crítica TV', organizacion: 'eldiario.es', afiliacion: 'eldiario.es',
    ejeX: -30, ejeY: 0, influencia: 55, twitter: 'mariolacubells', tags: ['medios','tv'], exposicion: 45 },
  { id: 'med-i-rejon', nombre: 'Ignacio Escolar', category: 'periodista', cargo: 'Director', organizacion: 'eldiario.es', afiliacion: 'eldiario.es',
    ejeX: -45, ejeY: 0, influencia: 88, twitter: 'iescolar', wikipedia: 'https://es.wikipedia.org/wiki/Ignacio_Escolar', tags: ['medios','digital','izquierdas'], exposicion: 90 },
  { id: 'med-juan-luis-sanchez', nombre: 'Juan Luis Sánchez', category: 'periodista', cargo: 'Subdirector', organizacion: 'eldiario.es', afiliacion: 'eldiario.es',
    ejeX: -40, ejeY: -5, influencia: 65, twitter: 'juanlusanchez', tags: ['medios','digital'], exposicion: 60 },
  { id: 'med-anto-cano', nombre: 'Antonio Caño', category: 'periodista', cargo: 'Ex-Director', organizacion: 'El País', afiliacion: 'PRISA',
    ejeX: -20, ejeY: 18, influencia: 60, tags: ['medios','prensa'], exposicion: 50 },
  { id: 'med-anson', nombre: 'Luis María Anson', category: 'periodista', cargo: 'Director Honorario', organizacion: 'El Imparcial', afiliacion: null,
    ejeX: 45, ejeY: 35, influencia: 65, wikipedia: 'https://es.wikipedia.org/wiki/Luis_Mar%C3%ADa_Anson', tags: ['medios','prensa'], exposicion: 55 },
  { id: 'med-jordi-amat', nombre: 'Jordi Amat', category: 'periodista', cargo: 'Columnista', organizacion: 'La Vanguardia', afiliacion: 'Godó',
    ejeX: -10, ejeY: -45, influencia: 60, twitter: 'amatjordi', tags: ['medios','prensa','catalunya'], exposicion: 50 },
  { id: 'med-roger-jimenez', nombre: 'Vicente Sanz', category: 'periodista', cargo: 'Director', organizacion: 'La Razón', afiliacion: 'Planeta',
    ejeX: 50, ejeY: 28, influencia: 60, tags: ['medios','prensa'], exposicion: 45 },

  // Dueños / grupos
  { id: 'med-grupo-godo', nombre: 'Javier Godó', category: 'mediatico', cargo: 'Conde de Godó', organizacion: 'Grupo Godó (La Vanguardia)', afiliacion: 'Godó',
    ejeX: 5, ejeY: -30, influencia: 78, tags: ['medios','dueño','catalunya'], exposicion: 60 },
  { id: 'med-grupo-vocento', nombre: 'Ignacio Ybarra', category: 'mediatico', cargo: 'Presidente', organizacion: 'Vocento (ABC)', afiliacion: 'Vocento',
    ejeX: 38, ejeY: 25, influencia: 75, tags: ['medios','dueño'], exposicion: 55 },
  { id: 'med-lara-bosch', nombre: 'José Creuheras', category: 'mediatico', cargo: 'Presidente', organizacion: 'Grupo Planeta', afiliacion: 'Planeta',
    ejeX: 30, ejeY: 25, influencia: 82, tags: ['medios','editorial','dueño'], exposicion: 65 },
  { id: 'med-roures', nombre: 'Jaume Roures', category: 'mediatico', cargo: 'Fundador', organizacion: 'Mediapro', afiliacion: 'Mediapro',
    ejeX: -50, ejeY: -25, influencia: 80, wikipedia: 'https://es.wikipedia.org/wiki/Jaume_Roures', tags: ['medios','dueño','futbol'], exposicion: 75 },
  { id: 'med-prisa-cebrian', nombre: 'Joseph Oughourlian', category: 'mediatico', cargo: 'Presidente', organizacion: 'PRISA', afiliacion: 'PRISA',
    ejeX: -10, ejeY: 25, influencia: 82, tags: ['medios','dueño','inversor'], exposicion: 60 },
]

// ─── LOBBIES y CONSULTORAS ──────────────────────────────────────────────────

const LOBBIES_CONSULTORAS: Omit<Figure, 'color'>[] = [
  // Patronales
  { id: 'pat-garamendi', nombre: 'Antonio Garamendi', category: 'patronal', cargo: 'Presidente', organizacion: 'CEOE', afiliacion: 'CEOE',
    ejeX: 35, ejeY: 25, influencia: 90, twitter: 'AntonioGaramendi', wikipedia: 'https://es.wikipedia.org/wiki/Antonio_Garamendi', tags: ['patronal','empresas'], exposicion: 88 },
  { id: 'pat-fernandez-roca', nombre: 'Gerardo Cuerva', category: 'patronal', cargo: 'Presidente', organizacion: 'CEPYME', afiliacion: 'CEPYME',
    ejeX: 30, ejeY: 22, influencia: 75, tags: ['patronal','pymes'], exposicion: 65 },
  { id: 'pat-amor', nombre: 'Lorenzo Amor', category: 'patronal', cargo: 'Presidente', organizacion: 'ATA (Autónomos)', afiliacion: 'ATA',
    ejeX: 25, ejeY: 18, influencia: 70, twitter: 'LorenzoAmor', tags: ['patronal','autonomos'], exposicion: 75 },
  // Sindicatos
  { id: 'sin-sordo', nombre: 'Unai Sordo', category: 'sindical', cargo: 'Secretario General', organizacion: 'CCOO', afiliacion: 'CCOO',
    ejeX: -55, ejeY: 5, influencia: 82, twitter: 'unaisordo', wikipedia: 'https://es.wikipedia.org/wiki/Unai_Sordo', tags: ['sindicato','trabajadores'], exposicion: 80 },
  { id: 'sin-alvarez-pepe', nombre: 'Pepe Álvarez', category: 'sindical', cargo: 'Secretario General', organizacion: 'UGT', afiliacion: 'UGT',
    ejeX: -52, ejeY: 8, influencia: 80, twitter: 'PepeAlvarez_UGT', wikipedia: 'https://es.wikipedia.org/wiki/Pepe_%C3%81lvarez_Su%C3%A1rez', tags: ['sindicato','trabajadores'], exposicion: 78 },
  // Lobbies sectoriales (representantes)
  { id: 'lob-farmaindustria', nombre: 'Juan Yermo', category: 'lobbista', cargo: 'Director General', organizacion: 'Farmaindustria', afiliacion: 'Farmaindustria',
    ejeX: 25, ejeY: 22, influencia: 70, tags: ['lobby','farma','sanidad'], exposicion: 50 },
  { id: 'lob-aedaf', nombre: 'Stella Raventós', category: 'lobbista', cargo: 'Presidenta', organizacion: 'AEDAF', afiliacion: 'AEDAF',
    ejeX: 28, ejeY: 25, influencia: 55, tags: ['lobby','fiscalidad'], exposicion: 35 },
  { id: 'lob-aelec', nombre: 'Marina Serrano', category: 'lobbista', cargo: 'Presidenta', organizacion: 'AELĒC (eléctricas)', afiliacion: 'AELĒC',
    ejeX: 25, ejeY: 22, influencia: 72, tags: ['lobby','energia','electricas'], exposicion: 55 },
  { id: 'lob-asaja', nombre: 'Pedro Barato', category: 'lobbista', cargo: 'Presidente', organizacion: 'ASAJA', afiliacion: 'ASAJA',
    ejeX: 35, ejeY: 18, influencia: 75, tags: ['lobby','agricultura'], exposicion: 70 },
  { id: 'lob-coag', nombre: 'Andoni García', category: 'lobbista', cargo: 'Coordinador', organizacion: 'COAG', afiliacion: 'COAG',
    ejeX: -10, ejeY: -5, influencia: 70, tags: ['lobby','agricultura','agraria'], exposicion: 60 },
  { id: 'lob-upa', nombre: 'Lorenzo Ramos', category: 'lobbista', cargo: 'Secretario General', organizacion: 'UPA', afiliacion: 'UPA',
    ejeX: -25, ejeY: 5, influencia: 68, tags: ['lobby','agricultura','pequeños'], exposicion: 55 },
  { id: 'lob-amestic', nombre: 'Pedro Mier', category: 'lobbista', cargo: 'Presidente', organizacion: 'AMETIC (digital)', afiliacion: 'AMETIC',
    ejeX: 22, ejeY: 18, influencia: 65, tags: ['lobby','digital','tecnologia'], exposicion: 45 },
  { id: 'lob-adigital', nombre: 'José Luis Zimmermann', category: 'lobbista', cargo: 'Director General', organizacion: 'Adigital', afiliacion: 'Adigital',
    ejeX: 18, ejeY: 15, influencia: 60, tags: ['lobby','digital','ecommerce'], exposicion: 40 },
  { id: 'lob-femp-vivienda', nombre: 'Daniel Cuevas', category: 'lobbista', cargo: 'Director General', organizacion: 'APCEspaña (promotores)', afiliacion: 'APCEspaña',
    ejeX: 30, ejeY: 20, influencia: 65, tags: ['lobby','vivienda','construccion'], exposicion: 45 },

  // Consultoras
  { id: 'con-llorente-cuenca', nombre: 'José Antonio Llorente', category: 'consultor', cargo: 'Fundador', organizacion: 'LLYC (Llorente y Cuenca)', afiliacion: 'LLYC',
    ejeX: 15, ejeY: 18, influencia: 85, wikipedia: 'https://es.wikipedia.org/wiki/Llorente_y_Cuenca', tags: ['consultoria','comunicacion','asuntos publicos'], exposicion: 70 },
  { id: 'con-mas-yebra', nombre: 'Antonio Más-Yebra', category: 'consultor', cargo: 'Socio', organizacion: 'McKinsey España', afiliacion: 'McKinsey',
    ejeX: 22, ejeY: 22, influencia: 75, tags: ['consultoria','estrategia'], exposicion: 40 },
  { id: 'con-deloitte', nombre: 'Fernando Ruiz', category: 'consultor', cargo: 'Presidente', organizacion: 'Deloitte España', afiliacion: 'Deloitte',
    ejeX: 20, ejeY: 25, influencia: 75, tags: ['consultoria','auditoria'], exposicion: 50 },
  { id: 'con-pwc', nombre: 'Gonzalo Sánchez', category: 'consultor', cargo: 'Presidente', organizacion: 'PwC España', afiliacion: 'PwC',
    ejeX: 22, ejeY: 25, influencia: 75, tags: ['consultoria','auditoria'], exposicion: 50 },
  { id: 'con-kpmg', nombre: 'Hilario Albarracín', category: 'consultor', cargo: 'Presidente', organizacion: 'KPMG España', afiliacion: 'KPMG',
    ejeX: 22, ejeY: 25, influencia: 75, tags: ['consultoria','auditoria'], exposicion: 50 },
  { id: 'con-ey', nombre: 'Federico Linares', category: 'consultor', cargo: 'Presidente', organizacion: 'EY España', afiliacion: 'EY',
    ejeX: 22, ejeY: 25, influencia: 75, tags: ['consultoria','auditoria'], exposicion: 50 },
  { id: 'con-cuatrecasas', nombre: 'Rafael Fontana', category: 'consultor', cargo: 'Presidente', organizacion: 'Cuatrecasas', afiliacion: 'Cuatrecasas',
    ejeX: 25, ejeY: 22, influencia: 72, tags: ['consultoria','despacho','abogados'], exposicion: 45 },
  { id: 'con-uria-menendez', nombre: 'Salvador Sánchez-Terán', category: 'consultor', cargo: 'Socio Director', organizacion: 'Uría Menéndez', afiliacion: 'Uría Menéndez',
    ejeX: 25, ejeY: 22, influencia: 72, tags: ['consultoria','despacho','abogados'], exposicion: 45 },
  { id: 'con-garrigues', nombre: 'Fernando Vives', category: 'consultor', cargo: 'Presidente', organizacion: 'Garrigues', afiliacion: 'Garrigues',
    ejeX: 25, ejeY: 22, influencia: 78, tags: ['consultoria','despacho','abogados'], exposicion: 50 },
]

// ─── FONDOS DE INVERSIÓN ────────────────────────────────────────────────────

const FONDOS: Omit<Figure, 'color'>[] = [
  { id: 'fondo-blackrock-es', nombre: 'Aitor Jauregui', category: 'fondo', cargo: 'Country Head', organizacion: 'BlackRock España', afiliacion: 'BlackRock',
    ejeX: 28, ejeY: 28, influencia: 88, tags: ['fondo','inversion','blackrock'], exposicion: 70 },
  { id: 'fondo-cvc-es', nombre: 'Javier de Jaime', category: 'fondo', cargo: 'Managing Partner', organizacion: 'CVC Capital Partners España', afiliacion: 'CVC',
    ejeX: 30, ejeY: 25, influencia: 85, tags: ['fondo','private equity'], exposicion: 60 },
  { id: 'fondo-kkr', nombre: 'Alejo Vidal-Quadras', category: 'fondo', cargo: 'Senior Director', organizacion: 'KKR España', afiliacion: 'KKR',
    ejeX: 32, ejeY: 28, influencia: 78, tags: ['fondo','private equity'], exposicion: 50 },
  { id: 'fondo-apollo', nombre: 'David Sánchez', category: 'fondo', cargo: 'Managing Director', organizacion: 'Apollo Global Management', afiliacion: 'Apollo',
    ejeX: 35, ejeY: 28, influencia: 70, tags: ['fondo','private equity','distress'], exposicion: 35 },
  { id: 'fondo-magnum', nombre: 'Miguel Forteza', category: 'fondo', cargo: 'Socio', organizacion: 'Magnum Capital', afiliacion: 'Magnum',
    ejeX: 28, ejeY: 22, influencia: 72, tags: ['fondo','private equity','español'], exposicion: 45 },
  { id: 'fondo-portobello', nombre: 'Juan Luis Ramírez', category: 'fondo', cargo: 'Socio Fundador', organizacion: 'Portobello Capital', afiliacion: 'Portobello',
    ejeX: 28, ejeY: 22, influencia: 75, tags: ['fondo','private equity','español'], exposicion: 50 },
  { id: 'fondo-altamar', nombre: 'José Luis Molina', category: 'fondo', cargo: 'CEO', organizacion: 'Altamar Capital Partners', afiliacion: 'Altamar',
    ejeX: 25, ejeY: 22, influencia: 78, tags: ['fondo','wealth','familia'], exposicion: 55 },
  { id: 'fondo-mutua-mad', nombre: 'Ignacio Garralda', category: 'fondo', cargo: 'Presidente', organizacion: 'Mutua Madrileña', afiliacion: 'Mutua',
    ejeX: 25, ejeY: 25, influencia: 85, tags: ['fondo','seguros','inversion'], exposicion: 65 },
  { id: 'fondo-mapfre', nombre: 'Antonio Huertas', category: 'fondo', cargo: 'Presidente', organizacion: 'MAPFRE', afiliacion: 'MAPFRE',
    ejeX: 25, ejeY: 25, influencia: 80, tags: ['fondo','seguros','ibex'], exposicion: 60 },
]

// ─── INSTITUCIONALES ───────────────────────────────────────────────────────

const INSTITUCIONALES: Omit<Figure, 'color'>[] = [
  { id: 'inst-rey-felipe', nombre: 'Felipe VI', category: 'institucional', cargo: 'Rey', organizacion: 'Casa Real', afiliacion: 'Casa Real',
    ejeX: 5, ejeY: 60, influencia: 100, wikipedia: 'https://es.wikipedia.org/wiki/Felipe_VI', tags: ['rey','monarquia','jefatura'], exposicion: 95 },
  { id: 'inst-reina-letizia', nombre: 'Letizia Ortiz', category: 'institucional', cargo: 'Reina', organizacion: 'Casa Real', afiliacion: 'Casa Real',
    ejeX: 5, ejeY: 55, influencia: 90, wikipedia: 'https://es.wikipedia.org/wiki/Letizia_Ortiz_Rocasolano', tags: ['reina','monarquia'], exposicion: 95 },
  { id: 'inst-conde-pumpido', nombre: 'Cándido Conde-Pumpido', category: 'judicial', cargo: 'Presidente', organizacion: 'Tribunal Constitucional', afiliacion: 'TC',
    ejeX: -30, ejeY: 30, influencia: 90, wikipedia: 'https://es.wikipedia.org/wiki/C%C3%A1ndido_Conde-Pumpido', tags: ['tc','justicia','constitucional'], exposicion: 85 },
  { id: 'inst-isabel-perello', nombre: 'Isabel Perelló', category: 'judicial', cargo: 'Presidenta', organizacion: 'CGPJ / TS', afiliacion: 'CGPJ',
    ejeX: 0, ejeY: 40, influencia: 88, tags: ['cgpj','justicia','supremo'], exposicion: 75 },
  { id: 'inst-garcia-ortiz', nombre: 'Álvaro García Ortiz', category: 'judicial', cargo: 'Fiscal General', organizacion: 'Fiscalía General del Estado', afiliacion: 'Fiscalía',
    ejeX: -25, ejeY: 35, influencia: 85, wikipedia: 'https://es.wikipedia.org/wiki/%C3%81lvaro_Garc%C3%ADa_Ortiz', tags: ['fiscalia','justicia'], exposicion: 88 },
  { id: 'inst-hernandez-bde', nombre: 'José Luis Escrivá', category: 'institucional', cargo: 'Gobernador', organizacion: 'Banco de España', afiliacion: 'BdE',
    ejeX: -10, ejeY: 30, influencia: 90, wikipedia: 'https://es.wikipedia.org/wiki/Jos%C3%A9_Luis_Escriv%C3%A1', tags: ['bde','banca central','economia'], exposicion: 80 },
  { id: 'inst-juliana-deh', nombre: 'Carlos San Basilio', category: 'institucional', cargo: 'Presidente', organizacion: 'CNMV', afiliacion: 'CNMV',
    ejeX: -5, ejeY: 30, influencia: 75, tags: ['cnmv','mercados','regulador'], exposicion: 60 },
  { id: 'inst-cnmc-marin', nombre: 'Cani Fernández', category: 'institucional', cargo: 'Presidenta', organizacion: 'CNMC', afiliacion: 'CNMC',
    ejeX: -5, ejeY: 30, influencia: 80, tags: ['cnmc','competencia','regulador'], exposicion: 70 },
  { id: 'inst-airef-cristina', nombre: 'Cristina Herrero', category: 'institucional', cargo: 'Presidenta', organizacion: 'AIReF', afiliacion: 'AIReF',
    ejeX: -5, ejeY: 35, influencia: 78, tags: ['airef','responsabilidad fiscal','economia'], exposicion: 60 },
  { id: 'inst-aepd', nombre: 'Mar España', category: 'institucional', cargo: 'Directora', organizacion: 'AEPD', afiliacion: 'AEPD',
    ejeX: -10, ejeY: 25, influencia: 70, tags: ['aepd','proteccion datos','privacidad'], exposicion: 60 },
  { id: 'inst-defpueblo', nombre: 'Ángel Gabilondo', category: 'institucional', cargo: 'Defensor del Pueblo', organizacion: 'Defensor del Pueblo', afiliacion: 'PSOE-Indep',
    ejeX: -30, ejeY: 25, influencia: 78, wikipedia: 'https://es.wikipedia.org/wiki/%C3%81ngel_Gabilondo', tags: ['defensor','derechos'], exposicion: 70 },
]

// ─── ACADÉMICOS y THINK TANKS ──────────────────────────────────────────────

const ACADEMICOS: Omit<Figure, 'color'>[] = [
  { id: 'aca-elcano', nombre: 'Charles Powell', category: 'academico', cargo: 'Director', organizacion: 'Real Instituto Elcano', afiliacion: 'Elcano',
    ejeX: 15, ejeY: 28, influencia: 78, twitter: 'charlespowell', tags: ['think tank','internacional'], exposicion: 50 },
  { id: 'aca-cidob', nombre: 'Pol Morillas', category: 'academico', cargo: 'Director', organizacion: 'CIDOB', afiliacion: 'CIDOB',
    ejeX: -10, ejeY: -25, influencia: 70, twitter: 'polmorillas', tags: ['think tank','internacional','barcelona'], exposicion: 45 },
  { id: 'aca-fad', nombre: 'Beatriz Martín Padura', category: 'academico', cargo: 'Directora', organizacion: 'FAD Juventud', afiliacion: 'FAD',
    ejeX: -15, ejeY: 5, influencia: 65, tags: ['fundacion','juventud'], exposicion: 35 },
  { id: 'aca-cis', nombre: 'José Félix Tezanos', category: 'academico', cargo: 'Presidente', organizacion: 'CIS', afiliacion: 'CIS',
    ejeX: -35, ejeY: 20, influencia: 78, wikipedia: 'https://es.wikipedia.org/wiki/Jos%C3%A9_F%C3%A9lix_Tezanos', tags: ['cis','sondeos','sociologia'], exposicion: 75 },
  { id: 'aca-fedea', nombre: 'Ángel de la Fuente', category: 'academico', cargo: 'Director', organizacion: 'FEDEA', afiliacion: 'FEDEA',
    ejeX: 15, ejeY: 22, influencia: 75, tags: ['think tank','economia'], exposicion: 50 },
  { id: 'aca-funcas', nombre: 'Carlos Ocaña', category: 'academico', cargo: 'Director General', organizacion: 'Funcas', afiliacion: 'Funcas',
    ejeX: 10, ejeY: 20, influencia: 72, tags: ['think tank','economia','cajas'], exposicion: 45 },
  { id: 'aca-iese', nombre: 'Franz Heukamp', category: 'academico', cargo: 'Decano', organizacion: 'IESE Business School', afiliacion: 'IESE',
    ejeX: 22, ejeY: 22, influencia: 70, tags: ['academia','escuela negocios'], exposicion: 40 },
]

// ─── Colores y construcción final ──────────────────────────────────────────

const CATEGORY_COLOR: Record<FigureCategory, string> = {
  politico:       '#1F4E8C',
  institucional:  '#7C3AED',
  empresario:     '#0E7490',
  mediatico:      '#525258',
  periodista:     '#0F766E',
  lobbista:       '#7C3AED',
  consultor:      '#0891B2',
  fondo:          '#5B21B6',
  academico:      '#0D9488',
  judicial:       '#9333EA',
  sindical:       '#A02525',
  patronal:       '#0E7490',
}

function withColor(fig: Omit<Figure, 'color'>): Figure {
  return { ...fig, color: CATEGORY_COLOR[fig.category] }
}

/**
 * Devuelve el catálogo expandido completo.
 * Combina las 7 nuevas categorías (~150 figuras) con el catálogo político
 * existente (~300) cuando se quiera unificar.
 */
export function getExpandedCatalog(): Figure[] {
  const expanded = [
    ...EMPRESARIOS, ...MEDIATICOS, ...LOBBIES_CONSULTORAS,
    ...FONDOS, ...INSTITUCIONALES, ...ACADEMICOS,
  ].map(withColor)
  return expanded
}

/**
 * Catálogo con CEOs adicionales generados desde IBEX_COMPANIES taxonomy
 * para sectores donde no tenemos figura individual aún.
 */
export function getIbexCeosCatalog(): Figure[] {
  return IBEX_COMPANIES
    .filter(c => !['SAN', 'BBVA', 'CABK', 'SAB', 'BKT', 'IBE', 'ELE', 'REP', 'NTGY', 'RED', 'TEF', 'ITX', 'ACS', 'MEL', 'IDR', 'CLNX'].includes(c.ticker))
    .map((c, i) => withColor({
      id: `emp-ibex-${c.ticker.toLowerCase()}`,
      nombre: `Dirección ${c.label}`,
      category: 'empresario',
      cargo: 'Liderazgo ejecutivo',
      organizacion: c.label,
      afiliacion: c.label,
      ejeX: 25, ejeY: 20,
      influencia: 60 - Math.floor(i / 3),
      tags: [c.sector.toLowerCase(), 'ibex'],
      exposicion: 50,
    }))
}
