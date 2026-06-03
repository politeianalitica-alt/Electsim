'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Activity, Globe, Radio, Eye,
  Shield, Sun, AlertTriangle, Camera, Flame, Target,
  CloudLightning, Radiation, Tv, Anchor, Ship, Newspaper,
  ChevronDown, ChevronUp, Network, Construction, Zap, Building2, Cable,
  Mountain, Waves, Droplets, Wind, Rocket, AlertOctagon,
  Train, TrainTrack, Swords, Image, Moon,
} from 'lucide-react';

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
}

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

// Orden lógico por dominio: primero lo que se mueve en directo (aéreo, marítimo,
// espacio), luego instalaciones fijas (energía, infraestructura), después
// eventos y seguridad (conflicto, tráfico, vigilancia), naturaleza (riesgos,
// geografía) y, al final, capas meta y de fondo (SDK, visualización del mapa).
const LAYER_GROUPS = [
  // ───────────────── EN MOVIMIENTO / EN DIRECTO ─────────────────
  {
    label: 'AVIACIÓN',
    icon: Plane,
    color: '#00E5FF',
    layers: [
      { key: 'flights', label: 'Comercial', icon: Plane, color: '#00E5FF', dataKey: 'commercial_flights' },
      { key: 'private', label: 'Privada', icon: Plane, color: '#00E676', dataKey: 'private_flights' },
      { key: 'jets', label: 'Jets privados', icon: Plane, color: '#FF69B4', dataKey: 'private_jets' },
      { key: 'military', label: 'Militar', icon: Shield, color: '#FF3D3D', dataKey: 'military_flights' },
      { key: 'airports', label: 'Aeropuertos del mundo', icon: Plane, color: '#42A5F5', dataKey: 'airports' },
    ],
  },
  {
    label: 'MARÍTIMO',
    icon: Ship,
    color: '#00BCD4',
    layers: [
      { key: 'maritime', label: 'Marítimo / Naval (todo)', icon: Ship, color: '#00BCD4', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
    ],
  },
  {
    label: 'BARCOS (por tipo)',
    icon: Ship,
    color: '#00BCD4',
    layers: [
      { key: 'ship_cargo', label: 'Carga', icon: Ship, color: '#00BCD4', dataKey: '' },
      { key: 'ship_tanker', label: 'Petroleros / tanque', icon: Ship, color: '#FF9500', dataKey: '' },
      { key: 'ship_passenger', label: 'Pasaje / ferry', icon: Ship, color: '#B388FF', dataKey: '' },
      { key: 'ship_fishing', label: 'Pesca', icon: Ship, color: '#4DB6AC', dataKey: '' },
      { key: 'ship_tug', label: 'Remolcadores', icon: Ship, color: '#A1887F', dataKey: '' },
      { key: 'ship_highspeed', label: 'Alta velocidad', icon: Ship, color: '#FF4081', dataKey: '' },
      { key: 'ship_military', label: 'Militar', icon: Shield, color: '#FF1744', dataKey: '' },
      { key: 'ship_other', label: 'Otros (vela, servicio…)', icon: Ship, color: '#90A4AE', dataKey: '' },
    ],
  },
  {
    label: 'PUERTOS (por tipo)',
    icon: Anchor,
    color: '#00BCD4',
    layers: [
      { key: 'port_container', label: 'Contenedores', icon: Anchor, color: '#00BCD4', dataKey: '' },
      { key: 'port_energy', label: 'Energéticos (crudo/gas)', icon: Anchor, color: '#FF9500', dataKey: '' },
      { key: 'port_naval', label: 'Bases navales', icon: Anchor, color: '#FF3D3D', dataKey: '' },
      { key: 'port_commercial', label: 'Comerciales (resto)', icon: Anchor, color: '#26A69A', dataKey: '' },
    ],
  },
  {
    label: 'ESPACIO',
    icon: Satellite,
    color: '#D4AF37',
    layers: [
      { key: 'satellites', label: 'Satélites', icon: Satellite, color: '#D4AF37', dataKey: 'satellites' },
      { key: 'iss', label: 'ISS (en directo)', icon: Satellite, color: '#FFFFFF', dataKey: '' },
      { key: 'launches', label: 'Lanzamientos espaciales', icon: Rocket, color: '#FFD54F', dataKey: 'launches' },
      { key: 'satnogs', label: 'Estaciones terrestres (SatNOGS)', icon: Radio, color: '#AB47BC', dataKey: 'satnogs' },
    ],
  },
  // ───────────────── INSTALACIONES FIJAS ─────────────────
  {
    label: 'ENERGÍA (por fuente)',
    icon: Zap,
    color: '#FFD600',
    layers: [
      { key: 'power_solar', label: 'Solar', icon: Zap, color: '#FFD600', dataKey: '' },
      { key: 'power_wind', label: 'Eólica', icon: Zap, color: '#4FC3F7', dataKey: '' },
      { key: 'power_hydro', label: 'Hidroeléctrica', icon: Zap, color: '#2979FF', dataKey: '' },
      { key: 'power_nuclear', label: 'Nuclear', icon: Zap, color: '#FF1744', dataKey: '' },
      { key: 'power_coal', label: 'Carbón', icon: Zap, color: '#90A4AE', dataKey: '' },
      { key: 'power_gas', label: 'Gas natural', icon: Zap, color: '#FF9100', dataKey: '' },
      { key: 'power_oil', label: 'Petróleo', icon: Zap, color: '#A1887F', dataKey: '' },
      { key: 'power_other', label: 'Otras (biomasa, geotérmica…)', icon: Zap, color: '#BDBDBD', dataKey: '' },
    ],
  },
  {
    label: 'INFRAESTRUCTURA',
    icon: Building2,
    color: '#00E5FF',
    layers: [
      { key: 'infrastructure', label: 'Instalaciones nucleares', icon: Radiation, color: '#76FF03', dataKey: 'infrastructure' },
      { key: 'critical_infra', label: 'Refinerías · presas · críticas', icon: Building2, color: '#00E5FF', dataKey: 'critical_infra' },
      { key: 'military_bases', label: 'Bases militares', icon: Shield, color: '#EF5350', dataKey: 'military_bases' },
      { key: 'submarine_cables', label: 'Cables submarinos', icon: Cable, color: '#00BCD4', dataKey: 'cables' },
    ],
  },
  // ───────────────── EVENTOS Y SEGURIDAD ─────────────────
  {
    label: 'CONFLICTO Y SEGURIDAD',
    icon: Swords,
    color: '#FF1744',
    layers: [
      { key: 'conflict_zones', label: 'Alertas de guerra (zonas)', icon: AlertTriangle, color: '#FF1744', dataKey: '' },
      { key: 'frontline', label: 'Frente de Ucrania (DeepState)', icon: Swords, color: '#FF1744', dataKey: '' },
      { key: 'global_incidents', label: 'Incidentes globales', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'gdelt' },
      { key: 'gps_jamming', label: 'Interferencia GPS', icon: Radio, color: '#FF4444', dataKey: 'gps_jamming' },
    ],
  },
  {
    label: 'TRÁFICO Y TRANSPORTE',
    icon: Train,
    color: '#FFB300',
    layers: [
      { key: 'traffic_incidents', label: 'Incidencias de tráfico', icon: Construction, color: '#FFB300', dataKey: 'traffic_incidents' },
      { key: 'trains', label: 'Trenes en directo (FI·IE·US)', icon: Train, color: '#FFCA28', dataKey: 'trains' },
      { key: 'railways', label: 'Líneas ferroviarias (por tipo)', icon: TrainTrack, color: '#FFC23C', dataKey: '' },
    ],
  },
  {
    label: 'VIGILANCIA Y MEDIOS',
    icon: Camera,
    color: '#39FF14',
    layers: [
      { key: 'cctv', label: 'Cámaras CCTV', icon: Camera, color: '#39FF14', dataKey: 'cameras' },
      { key: 'live_news', label: 'Noticias en directo', icon: Tv, color: '#FF4081', dataKey: 'live_feeds' },
    ],
  },
  // ───────────────── NATURALEZA ─────────────────
  {
    label: 'RIESGOS NATURALES',
    icon: Activity,
    color: '#FF9500',
    layers: [
      { key: 'earthquakes', label: 'Terremotos (24h)', icon: Activity, color: '#FF9500', dataKey: 'earthquakes' },
      { key: 'fires', label: 'Incendios activos', icon: Flame, color: '#FF6B00', dataKey: 'fires' },
      { key: 'weather', label: 'Clima severo', icon: CloudLightning, color: '#E040FB', dataKey: 'weather_events' },
      { key: 'gdacs', label: 'Alertas de desastres (GDACS)', icon: AlertOctagon, color: '#EF5350', dataKey: 'gdacs' },
      { key: 'hurricanes', label: 'Ciclones tropicales', icon: Wind, color: '#26C6DA', dataKey: 'hurricanes' },
      { key: 'volcanoes', label: 'Volcanes', icon: Flame, color: '#FF7043', dataKey: 'volcanoes' },
      { key: 'air_quality', label: 'Calidad del aire (AQI)', icon: Droplets, color: '#66BB6A', dataKey: 'air_quality' },
    ],
  },
  {
    label: 'ACCIDENTES GEOGRÁFICOS',
    icon: Mountain,
    color: '#26A69A',
    layers: [
      { key: 'geo_rivers', label: 'Ríos', icon: Waves, color: '#29B6F6', dataKey: '' },
      { key: 'geo_mountains', label: 'Montañas y cordilleras', icon: Mountain, color: '#8D6E63', dataKey: '' },
      { key: 'geo_deserts', label: 'Desiertos', icon: Sun, color: '#E0A82E', dataKey: '' },
      { key: 'geo_features', label: 'Otros (mesetas, cuencas, deltas…)', icon: Droplets, color: '#26A69A', dataKey: '' },
    ],
  },
  // ───────────────── META Y FONDO DEL MAPA ─────────────────
  {
    label: 'INTELIGENCIA SDK',
    icon: Network,
    color: '#1565C0',
    layers: [
      { key: 'sdk_stream', label: 'Flujo de inteligencia', icon: Network, color: '#1565C0', dataKey: 'sdk_entities' },
    ],
  },
  {
    label: 'VISUALIZACIÓN',
    icon: Sun,
    color: '#448AFF',
    layers: [
      { key: 'day_night', label: 'Ciclo día / noche', icon: Sun, color: '#448AFF', dataKey: '' },
      { key: 'gibs', label: 'Imagen satélite (NASA MODIS)', icon: Image, color: '#66BB6A', dataKey: '' },
      { key: 'nightlights', label: 'Luces nocturnas (VIIRS)', icon: Moon, color: '#FFD54F', dataKey: '' },
    ],
  },
];

// Flat list for backward compat
const ALL_LAYERS = LAYER_GROUPS.flatMap(g => g.layers);

function LayerPanel({ data, activeLayers, setActiveLayers }: LayerPanelProps) {
  // Al abrir la página todos los grupos arrancan RECOGIDOS (colapsados).
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    LAYER_GROUPS.forEach(g => { initial[g.label] = false; });
    return initial;
  });

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
      : getCount(layer.dataKey);
  const totalEntities = ALL_LAYERS.reduce((s: number, l: any) => s + (getCount(l.dataKey) || 0), 0);
  const activeCount = Object.values(activeLayers).filter(Boolean).length;

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  const anyExpanded = LAYER_GROUPS.some(g => expandedGroups[g.label]);
  const setAllGroups = (val: boolean) => setExpandedGroups(() => {
    const next: Record<string, boolean> = {};
    LAYER_GROUPS.forEach(g => { next[g.label] = val; });
    return next;
  });

  const toggleAllInGroup = (group: typeof LAYER_GROUPS[0]) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
      className="pointer-events-auto"
      style={{
        width: 264, padding: 12, fontFamily: POL.font,
        background: POL.panelBg,
        backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        border: `1px solid ${POL.hairline}`, borderRadius: 16,
        boxShadow: '0 8px 30px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.08)',
        color: POL.ink,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Eye style={{ width: 14, height: 14, color: POL.accent }} strokeWidth={1.8} />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: POL.ink }}>CAPAS DE DATOS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={pill(`${activeCount}/${ALL_LAYERS.length}`, 'accent')}>{activeCount}/{ALL_LAYERS.length}</span>
          <span style={pill(`${totalEntities} ENT`, 'muted')}>{totalEntities.toLocaleString()}</span>
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

      {/* Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {LAYER_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.label];
          const groupActiveCount = group.layers.filter(l => activeLayers[l.key]).length;
          const allActive = groupActiveCount === group.layers.length;
          const GroupIcon = group.icon;

          return (
            <div key={group.label}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px',
                    borderRadius: 8, background: 'none', border: 0, cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = POL.surfaceRaised)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <GroupIcon style={{ width: 13, height: 13, color: group.color, flexShrink: 0 }} strokeWidth={2} />
                  <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: POL.ink4, textTransform: 'uppercase' }}>{group.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: groupActiveCount > 0 ? POL.accentText : POL.ink5 }}>
                    {groupActiveCount}/{group.layers.length}
                  </span>
                  {isExpanded
                    ? <ChevronUp style={{ width: 13, height: 13, color: POL.ink5 }} strokeWidth={2} />
                    : <ChevronDown style={{ width: 13, height: 13, color: POL.ink5 }} strokeWidth={2} />}
                </button>
                <button
                  onClick={() => toggleAllInGroup(group)}
                  title={allActive ? 'Desactivar todo' : 'Activar todo'}
                  style={{ padding: 3, borderRadius: 6, background: 'none', border: 0, cursor: 'pointer', display: 'flex' }}
                >
                  <Toggle on={allActive} />
                </button>
              </div>

              {/* Layer items */}
              <AnimatePresence>
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
                        return (
                          <button
                            key={layer.key}
                            onClick={() => toggle(layer.key)}
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
