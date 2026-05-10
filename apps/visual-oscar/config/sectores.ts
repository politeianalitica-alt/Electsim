// config/sectores.ts
export interface SectorMeta {
  id: string;
  nombre: string;
  nombre_corto: string;
  descripcion: string;
  icono: string;
  color_primario: string;
  color_secundario: string;
  areas_tematicas: string[];
  fuentes_datos: SectorFuente[];
  activo: boolean;
}

export interface SectorFuente {
  id: string;
  nombre: string;
  tipo: 'eurostat' | 'ine' | 'banco_espana' | 'cnmc' | 'cnmv' | 'miteco' | 'ministerio' | 'propio';
  endpoint_variable?: string;
  revalidate_s: number;
}

export const SECTORES: SectorMeta[] = [
  {
    id: 'defensa',
    nombre: 'Defensa y Seguridad',
    nombre_corto: 'Defensa',
    descripcion: 'Industria de defensa, contratación pública militar, política OTAN y gasto en seguridad nacional.',
    icono: 'Shield',
    color_primario: '#1e3a5f',
    color_secundario: '#2d5986',
    areas_tematicas: ['defensa', 'seguridad', 'otan', 'contratacion_publica'],
    fuentes_datos: [
      { id: 'minisdef-presupuesto', nombre: 'MDEF · Presupuesto', tipo: 'ministerio', revalidate_s: 86400 },
      { id: 'nato-gdp', nombre: 'NATO GDP%', tipo: 'propio', revalidate_s: 86400 },
    ],
    activo: true,
  },
  {
    id: 'banca',
    nombre: 'Sector Financiero y Banca',
    nombre_corto: 'Banca',
    descripcion: 'Sistema bancario español, regulación prudencial, tipos de interés y estabilidad financiera.',
    icono: 'Landmark',
    color_primario: '#1a3d5c',
    color_secundario: '#1d5c8a',
    areas_tematicas: ['financiero', 'banca', 'regulacion', 'fiscal'],
    fuentes_datos: [
      { id: 'bde-tipos', nombre: 'Banco de España · Tipos', tipo: 'banco_espana', revalidate_s: 3600 },
      { id: 'bde-morosidad', nombre: 'Banco de España · Morosidad', tipo: 'banco_espana', revalidate_s: 86400 },
    ],
    activo: true,
  },
  {
    id: 'energia',
    nombre: 'Energía y Transición Ecológica',
    nombre_corto: 'Energía',
    descripcion: 'Mix energético, precios de la electricidad, renovables, mercado del gas y política climática.',
    icono: 'Zap',
    color_primario: '#1a4a2e',
    color_secundario: '#2d7a4a',
    areas_tematicas: ['energia', 'medioambiente', 'renovables', 'industrial'],
    fuentes_datos: [
      { id: 'ree-demanda', nombre: 'REE · Demanda eléctrica', tipo: 'propio', revalidate_s: 3600 },
      { id: 'omie-precio', nombre: 'OMIE · Precio pool', tipo: 'propio', revalidate_s: 3600 },
      { id: 'miteco-co2', nombre: 'MITECO · Emisiones CO2', tipo: 'miteco', revalidate_s: 86400 },
    ],
    activo: true,
  },
  {
    id: 'agro',
    nombre: 'Agroalimentario',
    nombre_corto: 'Agro',
    descripcion: 'Producción agrícola y ganadera, exportaciones agroalimentarias, PAC y política rural.',
    icono: 'Wheat',
    color_primario: '#3d3000',
    color_secundario: '#7a5c00',
    areas_tematicas: ['agroalimentario', 'pac', 'rural', 'exportacion'],
    fuentes_datos: [
      { id: 'mapa-ipc-alimentos', nombre: 'MAPA · IPC Alimentos', tipo: 'ministerio', revalidate_s: 86400 },
    ],
    activo: true,
  },
  {
    id: 'farma',
    nombre: 'Farmacéutico y Salud',
    nombre_corto: 'Farma',
    descripcion: 'Industria farmacéutica, gasto sanitario, política de medicamentos y regulación del SNS.',
    icono: 'Pill',
    color_primario: '#1a3a4a',
    color_secundario: '#2d6a8a',
    areas_tematicas: ['salud', 'farmaceutico', 'sanidad', 'regulacion'],
    fuentes_datos: [
      { id: 'mscbs-gasto', nombre: 'Ministerio Sanidad · Gasto', tipo: 'ministerio', revalidate_s: 86400 },
    ],
    activo: true,
  },
  {
    id: 'telecom',
    nombre: 'Telecomunicaciones y Digital',
    nombre_corto: 'Telecom',
    descripcion: 'Infraestructura de red, espectro radioeléctrico, regulación CNMC y economía digital.',
    icono: 'Radio',
    color_primario: '#1a1a4a',
    color_secundario: '#2d2d8a',
    areas_tematicas: ['digital', 'telecom', 'regulacion', 'ia'],
    fuentes_datos: [
      { id: 'cnmc-cuotas', nombre: 'CNMC · Cuotas mercado', tipo: 'cnmc', revalidate_s: 86400 },
    ],
    activo: true,
  },
  {
    id: 'infraestructuras',
    nombre: 'Infraestructuras y Transporte',
    nombre_corto: 'Infraestructuras',
    descripcion: 'Inversión pública en infraestructuras, red ferroviaria, puertos, aeropuertos y licitaciones MITMA.',
    icono: 'Construction',
    color_primario: '#3a2800',
    color_secundario: '#7a5000',
    areas_tematicas: ['infraestructura', 'transporte', 'contratacion_publica', 'fondos_europeos'],
    fuentes_datos: [
      { id: 'mitma-licitaciones', nombre: 'MITMA · Licitaciones', tipo: 'ministerio', revalidate_s: 3600 },
    ],
    activo: true,
  },
  {
    id: 'turismo',
    nombre: 'Turismo',
    nombre_corto: 'Turismo',
    descripcion: 'Llegada de turistas, gasto turístico, estacionalidad, empleo y política turística.',
    icono: 'Plane',
    color_primario: '#1a3a2a',
    color_secundario: '#2d6a4a',
    areas_tematicas: ['turismo', 'laboral', 'exportacion'],
    fuentes_datos: [
      { id: 'ine-frontur', nombre: 'INE · FRONTUR', tipo: 'ine', revalidate_s: 86400 },
      { id: 'ine-egatur', nombre: 'INE · EGATUR', tipo: 'ine', revalidate_s: 86400 },
    ],
    activo: true,
  },
  {
    id: 'vivienda',
    nombre: 'Vivienda y Urbanismo',
    nombre_corto: 'Vivienda',
    descripcion: 'Mercado inmobiliario, precios, alquiler, política de vivienda y regulación urbanística.',
    icono: 'Home',
    color_primario: '#3a1a00',
    color_secundario: '#7a3400',
    areas_tematicas: ['vivienda', 'urbanismo', 'social', 'fiscal'],
    fuentes_datos: [
      { id: 'mitma-indice-precios', nombre: 'MITMA · Índice precios vivienda', tipo: 'ministerio', revalidate_s: 86400 },
      { id: 'bde-hipotecas', nombre: 'Banco de España · Hipotecas', tipo: 'banco_espana', revalidate_s: 86400 },
    ],
    activo: true,
  },
];

export function getSectorMeta(id: string): SectorMeta | undefined {
  return SECTORES.find(s => s.id === id);
}

export function getSectorIds(): string[] {
  return SECTORES.filter(s => s.activo).map(s => s.id);
}
