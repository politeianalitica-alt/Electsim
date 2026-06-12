'use client';

import { memo, useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Activity, Globe, Radio, Eye,
  Shield, Sun, AlertTriangle, Camera, Flame, Target,
  CloudLightning, Radiation, Tv, Anchor, Ship, Newspaper,
  ChevronDown, ChevronUp, Network, Construction, Zap, Building2, Cable,
  Mountain, Waves, Droplets, Wind, Rocket, AlertOctagon,
  Train, TrainTrack, Swords, Image, Moon, CloudRain, Sparkles, Fuel, Server, Gem, Sprout, Ban, Landmark, Route, Skull, Navigation, Coins, Vote,
  Search, Power, X,
} from 'lucide-react';

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  mineralFilter?: string;
  setMineralFilter?: (v: string) => void;
}

// Tipos de mineral seleccionables (el valor = campo `m` del dato OSM).
const MINERAL_TYPES: { v: string; l: string }[] = [
  { v: 'todos', l: 'Todos los minerales' },
  { v: 'litio', l: 'Litio' }, { v: 'cobalto', l: 'Cobalto' }, { v: 'wolframio', l: 'Wolframio' },
  { v: 'grafito', l: 'Grafito' }, { v: 'uranio', l: 'Uranio' }, { v: 'fosfato', l: 'Fosfato' },
  { v: 'potasa', l: 'Potasa' },
  { v: 'oro', l: 'Oro' }, { v: 'cobre', l: 'Cobre' }, { v: 'hierro', l: 'Hierro' },
  { v: 'plata', l: 'Plata' }, { v: 'plomo', l: 'Plomo' }, { v: 'zinc', l: 'Zinc' },
  { v: 'estaño', l: 'Estaño' }, { v: 'níquel', l: 'Níquel' }, { v: 'bauxita', l: 'Bauxita' },
  { v: 'mercury', l: 'Mercurio' }, { v: 'diamante', l: 'Diamante' },
  { v: 'carbón', l: 'Carbón' }, { v: 'oil', l: 'Petróleo' }, { v: 'sal', l: 'Sal' },
  { v: 'caliza', l: 'Caliza' }, { v: 'áridos', l: 'Áridos' }, { v: 'mármol', l: 'Mármol' },
  { v: 'granito', l: 'Granito' },
];

// ── Paleta Politeia (alineada con tokens.css + AppHeader) ──
const POL = {
  font: '-apple-system, "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", system-ui, sans-serif',
  panelBg: 'rgba(255,255,255,0.92)',
  surfaceRaised: '#f5f5f7',
  hairline: '#d2d2d7',
  hairlineSoft: '#e8e8ed',
  ink: '#1d1d1f',
  ink3: '#515154',
  ink4: '#6e6e73',
  ink5: '#aeaeb2',
  accent: '#1F4E8C',
  accentText: '#1F4E8C',
  accentSubtle: 'rgba(31,78,140,0.08)',
  accentBorder: 'rgba(31,78,140,0.22)',
};

// Normaliza texto para búsqueda: minúsculas + sin acentos.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const norm = (s: string) => s.normalize('NFD').replace(DIACRITICS, '').toLowerCase();

function Toggle({ on }: { on: boolean }) {
  return (
    <div style={{
      width: 30, height: 18, borderRadius: 999, flexShrink: 0,
      background: on ? POL.accent : POL.hairline,
      transition: 'background .2s ease', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 14 : 2,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .2s ease',
      }} />
    </div>
  );
}

// ── Taxonomía reordenada (9 grupos coherentes) ──
// Orden por dominio mental del analista: primero lo que se mueve en directo
// (aire, mar, tierra), luego el marco geopolítico y el conflicto, después las
// instalaciones fijas (energía, infraestructura crítica/digital), la naturaleza
// y, al final, la capa meta (vigilancia/medios) y la base del mapa.
// IMPORTANTE: las 104 claves (key) no cambian — solo su agrupación — para no
// romper ningún handler de OsirisMap ni los presets de sector-map-layers.
const LAYER_GROUPS = [
  // ═══════════════ 1 · AIRE Y AVIACIÓN ═══════════════
  {
    label: 'AIRE Y AVIACIÓN',
    icon: Plane,
    color: '#00E5FF',
    layers: [
      { key: 'flights', label: 'Comercial', icon: Plane, color: '#00E5FF', dataKey: 'commercial_flights', sectionLabel: 'AVIACIÓN EN VIVO' },
      { key: 'private', label: 'Privada', icon: Plane, color: '#00E676', dataKey: 'private_flights' },
      { key: 'jets', label: 'Jets privados', icon: Plane, color: '#FF69B4', dataKey: 'private_jets' },
      { key: 'military', label: 'Militar', icon: Shield, color: '#FF3D3D', dataKey: 'military_flights' },
      { key: 'airports', label: 'Aeropuertos del mundo', icon: Plane, color: '#42A5F5', dataKey: 'airports', sectionLabel: 'INFRAESTRUCTURA AÉREA' },
      { key: 'satellites', label: 'Satélites', icon: Satellite, color: '#D4AF37', dataKey: 'satellites', sectionLabel: 'ESPACIO' },
      { key: 'iss', label: 'ISS (en directo)', icon: Satellite, color: '#FFFFFF', dataKey: '' },
      { key: 'launches', label: 'Lanzamientos espaciales', icon: Rocket, color: '#FFD54F', dataKey: 'launches' },
      { key: 'satnogs', label: 'Estaciones terrestres (SatNOGS)', icon: Radio, color: '#AB47BC', dataKey: 'satnogs' },
    ],
  },
  // ═══════════════ 2 · MARÍTIMO ═══════════════
  {
    label: 'MARÍTIMO',
    icon: Ship,
    color: '#00BCD4',
    layers: [
      { key: 'maritime', label: 'Todo el tráfico marítimo', icon: Ship, color: '#00BCD4', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints', sectionLabel: 'TRÁFICO' },
      { key: 'ship_cargo', label: 'Carga', icon: Ship, color: '#00BCD4', dataKey: '', sectionLabel: 'BARCOS POR TIPO' },
      { key: 'ship_tanker', label: 'Petroleros / tanque', icon: Ship, color: '#FF9500', dataKey: '' },
      { key: 'ship_passenger', label: 'Pasaje / ferry', icon: Ship, color: '#B388FF', dataKey: '' },
      { key: 'ship_fishing', label: 'Pesca', icon: Ship, color: '#4DB6AC', dataKey: '' },
      { key: 'ship_tug', label: 'Remolcadores', icon: Ship, color: '#A1887F', dataKey: '' },
      { key: 'ship_highspeed', label: 'Alta velocidad', icon: Ship, color: '#FF4081', dataKey: '' },
      { key: 'ship_military', label: 'Militar', icon: Shield, color: '#FF1744', dataKey: '' },
      { key: 'ship_other', label: 'Otros · vela, servicio', icon: Ship, color: '#90A4AE', dataKey: '' },
      { key: 'port_container', label: 'Contenedores', icon: Anchor, color: '#00BCD4', dataKey: '', sectionLabel: 'PUERTOS POR TIPO' },
      { key: 'port_energy', label: 'Energéticos crudo/gas', icon: Anchor, color: '#FF9500', dataKey: '' },
      { key: 'port_naval', label: 'Bases navales', icon: Anchor, color: '#FF3D3D', dataKey: '' },
      { key: 'port_commercial', label: 'Comerciales', icon: Anchor, color: '#26A69A', dataKey: '' },
      { key: 'maritime_routes', label: 'Rutas comerciales marítimas', icon: Route, color: '#26C6DA', dataKey: '', sectionLabel: 'RUTAS Y RIESGO' },
      { key: 'piracy', label: 'Piratería (zonas de riesgo)', icon: Skull, color: '#EF5350', dataKey: '' },
      { key: 'lighthouses', label: 'Faros', icon: Navigation, color: '#FFEE58', dataKey: 'lighthouses' },
    ],
  },
  // ═══════════════ 3 · TIERRA Y TRANSPORTE ═══════════════
  {
    label: 'TIERRA Y TRANSPORTE',
    icon: Train,
    color: '#FFC23C',
    layers: [
      { key: 'trains', label: 'Trenes en directo (FI·IE·US)', icon: Train, color: '#FFCA28', dataKey: 'trains', sectionLabel: 'FERROVIARIO' },
      { key: 'railways', label: 'Líneas ferroviarias (por tipo)', icon: TrainTrack, color: '#FFC23C', dataKey: '' },
      { key: 'traffic_incidents', label: 'Incidencias de tráfico', icon: Construction, color: '#FFB300', dataKey: 'traffic_incidents', sectionLabel: 'CARRETERA' },
    ],
  },
  // ═══════════════ 4 · GEOPOLÍTICA E ÍNDICES ═══════════════
  {
    label: 'GEOPOLÍTICA E ÍNDICES',
    icon: Globe,
    color: '#1565C0',
    layers: [
      { key: 'alliances', label: 'Bloques militares (OTAN/OTSC)', icon: Shield, color: '#1565C0', dataKey: '', sectionLabel: 'BLOQUES Y PODER' },
      { key: 'econ_blocs', label: 'Bloques económicos', icon: Globe, color: '#1565C0', dataKey: '' },
      { key: 'milspend', label: 'Gasto militar', icon: Coins, color: '#E65100', dataKey: '' },
      { key: 'nukes', label: 'Armas nucleares', icon: Radiation, color: '#D32F2F', dataKey: '' },
      { key: 'orgs', label: 'Organismos internacionales', icon: Landmark, color: '#448AFF', dataKey: '' },
      { key: 'regime', label: 'Régimen político', icon: Vote, color: '#2E7D32', dataKey: '', sectionLabel: 'ESTADO DEL PAÍS' },
      { key: 'sanctions', label: 'Países sancionados', icon: Ban, color: '#EF5350', dataKey: '' },
      { key: 'disputes', label: 'Disputas territoriales', icon: Swords, color: '#FF1744', dataKey: '' },
      { key: 'election', label: 'Calendario electoral (2026-28)', icon: Vote, color: '#EF5350', dataKey: '' },
      { key: 'press_freedom', label: 'Libertad de prensa (RSF)', icon: Newspaper, color: '#9CCC65', dataKey: '', sectionLabel: 'ÍNDICES' },
      { key: 'corruption', label: 'Corrupción (CPI)', icon: Landmark, color: '#FFA726', dataKey: '' },
      { key: 'hdi', label: 'Desarrollo humano (IDH)', icon: Activity, color: '#2E7D32', dataKey: '' },
      { key: 'gdp_pc', label: 'PIB per cápita', icon: Coins, color: '#26A69A', dataKey: '' },
    ],
  },
  // ═══════════════ 5 · CONFLICTO Y SEGURIDAD ═══════════════
  {
    label: 'CONFLICTO Y SEGURIDAD',
    icon: Swords,
    color: '#FF1744',
    layers: [
      { key: 'conflict_zones', label: 'Alertas de guerra (zonas)', icon: AlertTriangle, color: '#FF1744', dataKey: '', sectionLabel: 'ALERTAS Y FRENTES' },
      { key: 'frontline', label: 'Frente de Ucrania (DeepState)', icon: Swords, color: '#FF1744', dataKey: '' },
      { key: 'global_incidents', label: 'Incidentes globales', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'gdelt' },
      { key: 'gps_jamming', label: 'Interferencia GPS', icon: Radio, color: '#FF4444', dataKey: 'gps_jamming' },
      { key: 'military_bases', label: 'Bases militares', icon: Shield, color: '#EF5350', dataKey: 'military_bases', sectionLabel: 'DEFENSA' },
      { key: 'war_ukraine', label: 'Rusia–Ucrania', icon: Target, color: '#4FC3F7', dataKey: '', sectionLabel: 'SUCESOS POR GUERRA' },
      { key: 'war_gaza', label: 'Israel–Gaza', icon: Target, color: '#EF5350', dataKey: '' },
      { key: 'war_lebanon', label: 'Israel–Hezbolá (Líbano)', icon: Target, color: '#FF7043', dataKey: '' },
      { key: 'war_iran', label: 'Israel–Irán', icon: Target, color: '#AB47BC', dataKey: '' },
      { key: 'war_sudan', label: 'Sudán (SAF–RSF)', icon: Target, color: '#FBC02D', dataKey: '' },
      { key: 'war_myanmar', label: 'Myanmar', icon: Target, color: '#26A69A', dataKey: '' },
      { key: 'war_congo', label: 'RD Congo (M23)', icon: Target, color: '#66BB6A', dataKey: '' },
      { key: 'war_sahel', label: 'Sahel (JNIM/EIGS)', icon: Target, color: '#8D6E63', dataKey: '' },
      { key: 'war_syria', label: 'Siria (post-Ásad)', icon: Target, color: '#EC407A', dataKey: '' },
    ],
  },
  // ═══════════════ 6 · ENERGÍA ═══════════════
  {
    label: 'ENERGÍA',
    icon: Zap,
    color: '#FFD600',
    layers: [
      { key: 'power_solar', label: 'Solar', icon: Zap, color: '#FFD600', dataKey: '', sectionLabel: 'GENERACIÓN (POR FUENTE)' },
      { key: 'power_wind', label: 'Eólica', icon: Zap, color: '#4FC3F7', dataKey: '' },
      { key: 'power_hydro', label: 'Hidroeléctrica', icon: Zap, color: '#2979FF', dataKey: '' },
      { key: 'power_nuclear', label: 'Nuclear', icon: Zap, color: '#FF1744', dataKey: '' },
      { key: 'power_coal', label: 'Carbón', icon: Zap, color: '#90A4AE', dataKey: '' },
      { key: 'power_gas', label: 'Gas natural', icon: Zap, color: '#FF9100', dataKey: '' },
      { key: 'power_oil', label: 'Petróleo', icon: Zap, color: '#A1887F', dataKey: '' },
      { key: 'power_other', label: 'Otras (biomasa, geotérmica…)', icon: Zap, color: '#BDBDBD', dataKey: '' },
      { key: 'powerlines', label: 'Líneas eléctricas (alta tensión)', icon: Zap, color: '#FFD600', dataKey: '', sectionLabel: 'REDES DE TRANSPORTE' },
      { key: 'pipelines', label: 'Oleoductos y gasoductos', icon: Fuel, color: '#42A5F5', dataKey: '' },
      { key: 'oilgas', label: 'Campos de petróleo y gas', icon: Fuel, color: '#8D6E63', dataKey: 'oilgas', sectionLabel: 'RECURSOS' },
      { key: 'refineries', label: 'Refinerías de petróleo', icon: Fuel, color: '#A1887F', dataKey: '' },
      { key: 'lng_terminals', label: 'Terminales de GNL', icon: Flame, color: '#42A5F5', dataKey: '' },
      { key: 'minerals', label: 'Minerales críticos', icon: Gem, color: '#26C6DA', dataKey: 'minerals' },
      { key: 'nuclear_plants', label: 'Centrales nucleares', icon: Radiation, color: '#FFD600', dataKey: '', sectionLabel: 'NUCLEAR E HIDRÁULICA' },
      { key: 'dams', label: 'Presas hidroeléctricas (>1 GW)', icon: Waves, color: '#4FC3F7', dataKey: '' },
      { key: 'infrastructure', label: 'Instalaciones nucleares (red)', icon: Radiation, color: '#76FF03', dataKey: 'infrastructure' },
    ],
  },
  // ═══════════════ 7 · INFRAESTRUCTURA CRÍTICA Y DIGITAL ═══════════════
  {
    label: 'INFRAESTRUCTURA CRÍTICA Y DIGITAL',
    icon: Building2,
    color: '#00E5FF',
    layers: [
      { key: 'critical_infra', label: 'Refinerías y presas (red completa)', icon: Fuel, color: '#FF6D00', dataKey: '', sectionLabel: 'INFRAESTRUCTURA CRÍTICA' },
      { key: 'datacenters', label: 'Centros de datos', icon: Server, color: '#00E5FF', dataKey: 'datacenters' },
      { key: 'fabs', label: 'Fábricas de semiconductores', icon: Server, color: '#00E5FF', dataKey: '' },
      { key: 'submarine_cables', label: 'Cables submarinos', icon: Cable, color: '#00BCD4', dataKey: 'cables', sectionLabel: 'CONECTIVIDAD DIGITAL' },
      { key: 'cable_landings', label: 'Aterrizajes de cable submarino', icon: Cable, color: '#26C6DA', dataKey: '' },
      { key: 'ixps', label: 'Puntos de intercambio (IXP)', icon: Network, color: '#AB47BC', dataKey: '' },
      { key: 'mobile_coverage', label: 'Cobertura móvil (Ookla)', icon: Radio, color: '#43A047', dataKey: '' },
      { key: 'net_shutdowns', label: 'Apagones de internet', icon: Zap, color: '#EF5350', dataKey: '' },
    ],
  },
  // ═══════════════ 8 · NATURALEZA Y RIESGOS ═══════════════
  {
    label: 'NATURALEZA Y RIESGOS',
    icon: CloudRain,
    color: '#29B6F6',
    layers: [
      { key: 'earthquakes', label: 'Terremotos (24h)', icon: Activity, color: '#FF9500', dataKey: 'earthquakes', sectionLabel: 'RIESGOS NATURALES' },
      { key: 'volcanoes', label: 'Volcanes', icon: Flame, color: '#FF7043', dataKey: 'volcanoes' },
      { key: 'fires', label: 'Incendios activos', icon: Flame, color: '#FF6B00', dataKey: 'fires' },
      { key: 'gdacs', label: 'Alertas de desastres (GDACS)', icon: AlertOctagon, color: '#EF5350', dataKey: 'gdacs' },
      { key: 'eonet', label: 'Eventos naturales (NASA EONET)', icon: Activity, color: '#FFD54F', dataKey: 'eonet' },
      { key: 'hurricanes', label: 'Ciclones tropicales', icon: Wind, color: '#26C6DA', dataKey: 'hurricanes' },
      { key: 'weather', label: 'Clima severo', icon: CloudLightning, color: '#E040FB', dataKey: 'weather_events' },
      // ── Meteorología sinóptica (Open-Meteo) · borrascas, anticiclones y vientos ──
      { key: 'pressure_lows', label: 'Borrascas (bajas presiones)', icon: CloudRain, color: '#EF5350', dataKey: 'pressure_centers', sectionLabel: 'METEOROLOGÍA' },
      { key: 'pressure_highs', label: 'Anticiclones (altas presiones)', icon: Sun, color: '#42A5F5', dataKey: 'pressure_centers' },
      { key: 'wind_flow', label: 'Vientos (dirección y fuerza)', icon: Navigation, color: '#26C6DA', dataKey: 'wind_vectors' },
      { key: 'rainfall', label: 'Radar de lluvia (tiempo real)', icon: CloudRain, color: '#29B6F6', dataKey: '', sectionLabel: 'CLIMA Y MAR' },
      { key: 'air_quality', label: 'Calidad del aire (AQI)', icon: Droplets, color: '#66BB6A', dataKey: 'air_quality' },
      { key: 'heat', label: 'Temperatura / calor extremo', icon: Sun, color: '#FF6B00', dataKey: 'heat' },
      { key: 'aurora', label: 'Auroras (boreal/austral)', icon: Sparkles, color: '#76FF03', dataKey: 'aurora' },
      { key: 'sea_state', label: 'Estado del mar (olas)', icon: Waves, color: '#26C6DA', dataKey: 'sea_state' },
      { key: 'tectonics', label: 'Placas tectónicas', icon: Mountain, color: '#FF7043', dataKey: '' },
      { key: 'geo_rivers', label: 'Ríos', icon: Waves, color: '#29B6F6', dataKey: '', sectionLabel: 'RELIEVE Y GEOGRAFÍA' },
      { key: 'geo_mountains', label: 'Montañas y cordilleras', icon: Mountain, color: '#8D6E63', dataKey: '' },
      { key: 'geo_deserts', label: 'Desiertos', icon: Sun, color: '#E0A82E', dataKey: '' },
      { key: 'geo_features', label: 'Otros (mesetas, cuencas, deltas…)', icon: Droplets, color: '#26A69A', dataKey: '' },
      { key: 'agriculture', label: 'Agricultura (cultivos)', icon: Sprout, color: '#9CCC65', dataKey: '' },
      { key: 'refugee_camps', label: 'Campos de refugiados (ACNUR)', icon: AlertOctagon, color: '#FF9800', dataKey: '', sectionLabel: 'HUMANITARIO Y AMBIENTAL' },
      { key: 'displacement', label: 'Refugiados y desplazados (UNHCR)', icon: AlertOctagon, color: '#FF6D00', dataKey: 'displacement' },
      { key: 'deforestation', label: 'Deforestación (pérdida forestal)', icon: Sprout, color: '#E53935', dataKey: '' },
    ],
  },
  // ═══════════════ 9 · VIGILANCIA, MEDIOS Y BASE ═══════════════
  {
    label: 'VIGILANCIA, MEDIOS Y BASE',
    icon: Camera,
    color: '#39FF14',
    layers: [
      { key: 'cctv', label: 'Cámaras CCTV', icon: Camera, color: '#39FF14', dataKey: 'cameras', sectionLabel: 'FUENTES OSINT' },
      { key: 'live_news', label: 'Noticias en directo', icon: Tv, color: '#FF4081', dataKey: 'live_feeds' },
      { key: 'sdk_stream', label: 'Flujo de inteligencia', icon: Network, color: '#1565C0', dataKey: 'sdk_entities' },
      { key: 'day_night', label: 'Ciclo día / noche', icon: Sun, color: '#448AFF', dataKey: '', sectionLabel: 'BASE DEL MAPA' },
      { key: 'gibs', label: 'Imagen satélite (NASA MODIS)', icon: Image, color: '#66BB6A', dataKey: '' },
      { key: 'nightlights', label: 'Luces nocturnas (VIIRS)', icon: Moon, color: '#FFD54F', dataKey: '' },
    ],
  },
];

// Flat list for backward compat
const ALL_LAYERS = LAYER_GROUPS.flatMap(g => g.layers);

function LayerPanel({ data, activeLayers, setActiveLayers, mineralFilter = 'todos', setMineralFilter }: LayerPanelProps) {
  // Al abrir la página todos los grupos arrancan RECOGIDOS (colapsados).
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    LAYER_GROUPS.forEach(g => { initial[g.label] = false; });
    return initial;
  });
  // Buscador de capas (filtra por etiqueta normalizada sin acentos).
  const [query, setQuery] = useState('');
  const q = norm(query.trim());

  const toggle = (key: string) => setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));
  const getCount = (dk: string): number | null => {
    if (!dk) return null;
    let total = 0;
    let found = false;
    for (const k of dk.split(',')) {
      if (data[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };
  // Conteo en vivo por tipo de barco (ship_cargo → categoría 'cargo')
  const shipCount = (key: string): number | null => {
    const ships = data?.maritime_ships;
    if (!Array.isArray(ships)) return null;
    const cat = key.slice(5); // quita "ship_"
    return ships.reduce((n: number, s: any) => n + ((s?.type || 'other') === cat ? 1 : 0), 0);
  };
  // Conteo por sub-capa de accidentes geográficos (puntos + áreas sombreadas)
  const GEO_PT_CATS: Record<string, string[]> = {
    geo_mountains: ['peak'],
    geo_deserts: [],
    geo_features: ['waterfall', 'feature'],
  };
  const GEO_AREA_CATS: Record<string, string[]> = {
    geo_mountains: ['range'],
    geo_deserts: ['desert'],
    geo_features: ['upland', 'lowland', 'wetland', 'land', 'tundra'],
  };
  const geoCount = (key: string): number | null => {
    if (key === 'geo_rivers') return data?.geo_rivers_fc?.features?.length ?? null;
    const ptCats = GEO_PT_CATS[key];
    const areaCats = GEO_AREA_CATS[key];
    if (!ptCats && !areaCats) return null;
    const pts = data?.geo_points;
    const areas = data?.geo_areas_fc?.features;
    let n = 0;
    if (Array.isArray(pts) && ptCats?.length) n += pts.reduce((a: number, p: any) => a + (ptCats.includes(p?.cat) ? 1 : 0), 0);
    if (Array.isArray(areas) && areaCats?.length) n += areas.reduce((a: number, f: any) => a + (areaCats.includes(f?.properties?.cat) ? 1 : 0), 0);
    return n;
  };
  // Conteo por tipo de puerto (port_container → 'container', etc.)
  const PORT_CAT: Record<string, string> = { port_container: 'container', port_energy: 'energy', port_naval: 'naval', port_commercial: 'port' };
  const portCount = (key: string): number | null => {
    const ports = data?.maritime_ports;
    if (!Array.isArray(ports)) return null;
    const cat = PORT_CAT[key];
    return ports.reduce((n: number, p: any) => n + (p?.type === cat ? 1 : 0), 0);
  };
  const countFor = (layer: { key: string; dataKey: string }): number | null =>
    layer.key.startsWith('ship_') ? shipCount(layer.key)
      : layer.key.startsWith('port_') ? portCount(layer.key)
      : layer.key.startsWith('geo_') ? geoCount(layer.key)
      : layer.key === 'railways' ? (data?.railways_fc?.features?.length ?? null)
      : layer.key === 'powerlines' ? (data?.powerlines_fc?.features?.length ?? null)
      : layer.key === 'pipelines' ? (data?.pipelines_fc?.features?.length ?? null)
      : getCount(layer.dataKey);
  const totalEntities = ALL_LAYERS.reduce((s: number, l: any) => s + (getCount(l.dataKey) || 0), 0);
  const activeCount = ALL_LAYERS.reduce((n, l) => n + (activeLayers[l.key] ? 1 : 0), 0);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  const anyExpanded = LAYER_GROUPS.some(g => expandedGroups[g.label]);
  const setAllGroups = (val: boolean) => setExpandedGroups(() => {
    const next: Record<string, boolean> = {};
    LAYER_GROUPS.forEach(g => { next[g.label] = val; });
    return next;
  });

  // Apaga todas las capas de datos de golpe.
  const clearAllLayers = () => setActiveLayers((prev: any) => {
    const next = { ...prev };
    ALL_LAYERS.forEach(l => { next[l.key] = false; });
    return next;
  });

  const toggleAllInGroup = (group: { layers: { key: string }[] }) => {
    const allActive = group.layers.every(l => activeLayers[l.key]);
    setActiveLayers((prev: any) => {
      const next = { ...prev };
      group.layers.forEach(l => { next[l.key] = !allActive; });
      return next;
    });
  };

  const pill = (text: string, tone: 'accent' | 'muted'): React.CSSProperties => ({
    fontSize: 9, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.6,
    padding: '1px 7px', borderRadius: 999, fontVariantNumeric: 'tabular-nums',
    color: tone === 'accent' ? POL.accentText : POL.ink4,
    background: tone === 'accent' ? POL.accentSubtle : POL.surfaceRaised,
  });

  // Grupos a renderizar: si hay búsqueda, filtra capas por etiqueta y deja
  // solo los grupos con coincidencias (y los expande automáticamente).
  const groupsToRender = q
    ? LAYER_GROUPS
        .map(g => ({ ...g, layers: g.layers.filter(l => norm(l.label).includes(q) || norm(g.label).includes(q)) }))
        .filter(g => g.layers.length > 0)
    : LAYER_GROUPS;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
      className="pointer-events-auto"
      style={{
        width: '100%', padding: 12, fontFamily: POL.font,
        background: POL.panelBg,
        backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        border: `1px solid ${POL.hairline}`, borderRadius: 16,
        boxShadow: '0 8px 30px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.08)',
        color: POL.ink,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Eye style={{ width: 14, height: 14, color: POL.accent }} strokeWidth={1.8} />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: POL.ink }}>CAPAS DE DATOS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={pill(`${activeCount}/${ALL_LAYERS.length}`, 'accent')}>{activeCount}/{ALL_LAYERS.length}</span>
          <span style={pill(`${totalEntities} ENT`, 'muted')}>{totalEntities.toLocaleString()}</span>
          {activeCount > 0 && (
            <button
              onClick={clearAllLayers}
              title="Apagar todas las capas"
              aria-label="Apagar todas las capas activas"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3,
                borderRadius: 6, background: 'none', border: `1px solid ${POL.hairline}`, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = POL.surfaceRaised)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Power style={{ width: 13, height: 13, color: POL.ink4 }} strokeWidth={2} />
            </button>
          )}
          <button
            onClick={() => setAllGroups(!anyExpanded)}
            title={anyExpanded ? 'Recoger todo' : 'Desplegar todo'}
            aria-label={anyExpanded ? 'Recoger todos los grupos' : 'Desplegar todos los grupos'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3,
              borderRadius: 6, background: 'none', border: `1px solid ${POL.hairline}`, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = POL.surfaceRaised)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {anyExpanded
              ? <ChevronUp style={{ width: 13, height: 13, color: POL.ink4 }} strokeWidth={2} />
              : <ChevronDown style={{ width: 13, height: 13, color: POL.ink4 }} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Buscador de capas */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: POL.ink5, pointerEvents: 'none' }} strokeWidth={2} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar capa…  (p. ej. nuclear, cables, IDH)"
          aria-label="Buscar capa por nombre"
          style={{
            width: '100%', boxSizing: 'border-box', fontFamily: POL.font, fontSize: 12,
            padding: '7px 28px 7px 28px', borderRadius: 9, outline: 'none',
            background: POL.surfaceRaised, color: POL.ink, border: `1px solid ${POL.hairlineSoft}`,
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', padding: 2, border: 0, background: 'none', cursor: 'pointer' }}
          >
            <X style={{ width: 13, height: 13, color: POL.ink4 }} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {groupsToRender.length === 0 && (
          <div style={{ padding: '14px 6px', fontSize: 11.5, color: POL.ink4, textAlign: 'center' }}>
            Sin capas que coincidan con «{query}».
          </div>
        )}
        {groupsToRender.map((group) => {
          const isExpanded = q ? true : expandedGroups[group.label];
          const groupActiveCount = group.layers.filter(l => activeLayers[l.key]).length;
          const allActive = groupActiveCount === group.layers.length;
          const GroupIcon = group.icon;

          return (
            <div key={group.label}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  disabled={!!q}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px',
                    borderRadius: 8, background: 'none', border: 0, cursor: q ? 'default' : 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!q) e.currentTarget.style.background = POL.surfaceRaised; }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <GroupIcon style={{ width: 13, height: 13, color: group.color, flexShrink: 0 }} strokeWidth={2} />
                  <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: POL.ink4, textTransform: 'uppercase' }}>{group.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: groupActiveCount > 0 ? POL.accentText : POL.ink5 }}>
                    {groupActiveCount}/{group.layers.length}
                  </span>
                  {!q && (isExpanded
                    ? <ChevronUp style={{ width: 13, height: 13, color: POL.ink5 }} strokeWidth={2} />
                    : <ChevronDown style={{ width: 13, height: 13, color: POL.ink5 }} strokeWidth={2} />)}
                </button>
                <button
                  onClick={() => toggleAllInGroup(group)}
                  title={allActive ? 'Desactivar todo' : 'Activar todo'}
                  aria-label={allActive ? `Desactivar grupo ${group.label}` : `Activar grupo ${group.label}`}
                  style={{ padding: 3, borderRadius: 6, background: 'none', border: 0, cursor: 'pointer', display: 'flex' }}
                >
                  <Toggle on={allActive} />
                </button>
              </div>

              {/* Layer items */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}
                  >
                    <div style={{ marginLeft: 8, paddingLeft: 8, borderLeft: `1px solid ${POL.hairlineSoft}`, display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 2, paddingBottom: 2 }}>
                      {group.layers.map((layer) => {
                        const Icon = layer.icon;
                        const isActive = activeLayers[layer.key];
                        const count = countFor(layer);
                        // Oculta los rótulos de sub-sección durante la búsqueda
                        // (la lista filtrada es corta y los rótulos quedarían huérfanos).
                        const sectionLabel = q ? undefined : (layer as any).sectionLabel as string | undefined;
                        return (
                          <Fragment key={layer.key}>
                          {sectionLabel && (
                            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', color: POL.ink5, textTransform: 'uppercase', padding: '6px 4px 2px' }}>
                              {sectionLabel}
                            </div>
                          )}
                          <button
                            onClick={() => toggle(layer.key)}
                            aria-pressed={!!isActive}
                            aria-label={layer.label}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px',
                              borderRadius: 9, cursor: 'pointer', transition: 'background .15s ease',
                              background: isActive ? POL.accentSubtle : 'transparent',
                              border: isActive ? `1px solid ${POL.accentBorder}` : '1px solid transparent',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = POL.surfaceRaised; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: layer.color,
                              opacity: isActive ? 1 : 0.35, boxShadow: isActive ? `0 0 5px ${layer.color}88` : 'none',
                            }} />
                            <Icon style={{ width: 13, height: 13, flexShrink: 0, color: isActive ? layer.color : POL.ink5 }} strokeWidth={2} />
                            <span style={{ flex: 1, textAlign: 'left', fontSize: 11.5, fontWeight: isActive ? 600 : 500, color: isActive ? POL.ink : POL.ink4 }}>
                              {layer.label}
                            </span>
                            {count !== null && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isActive ? POL.accentText : POL.ink5 }}>
                                {count.toLocaleString()}
                              </span>
                            )}
                            <Toggle on={!!isActive} />
                          </button>
                          {layer.key === 'minerals' && isActive && setMineralFilter && (
                            <select
                              value={mineralFilter}
                              onChange={e => setMineralFilter(e.target.value)}
                              title="Filtrar por tipo de mineral"
                              style={{
                                margin: '1px 4px 4px 30px', width: 'calc(100% - 34px)', fontSize: 11,
                                padding: '5px 8px', borderRadius: 7, background: POL.surfaceRaised,
                                color: POL.ink, border: `1px solid ${POL.hairlineSoft}`, cursor: 'pointer', outline: 'none',
                              }}
                            >
                              {MINERAL_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                            </select>
                          )}
                          </Fragment>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default memo(LayerPanel);
