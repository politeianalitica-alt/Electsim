'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Activity, Globe, Radio, Eye,
  Shield, Sun, AlertTriangle, Camera, Flame, Target,
  CloudLightning, Radiation, Tv, Anchor, Ship, Newspaper,
  ChevronDown, ChevronUp, Network, Construction, Zap, Building2, Cable,
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

const LAYER_GROUPS = [
  {
    label: 'INTELIGENCIA SDK',
    icon: Network,
    color: '#1565C0',
    layers: [
      { key: 'sdk_stream', label: 'Flujo de inteligencia', icon: Network, color: '#1565C0', dataKey: 'sdk_entities' },
    ],
  },
  {
    label: 'AVIACIÓN',
    icon: Plane,
    color: '#00E5FF',
    layers: [
      { key: 'flights', label: 'Comercial', icon: Plane, color: '#00E5FF', dataKey: 'commercial_flights' },
      { key: 'private', label: 'Privada', icon: Plane, color: '#00E676', dataKey: 'private_flights' },
      { key: 'jets', label: 'Jets privados', icon: Plane, color: '#FF69B4', dataKey: 'private_jets' },
      { key: 'military', label: 'Militar', icon: Shield, color: '#FF3D3D', dataKey: 'military_flights' },
    ],
  },
  {
    label: 'MARÍTIMO Y ESPACIO',
    icon: Ship,
    color: '#00BCD4',
    layers: [
      { key: 'maritime', label: 'Marítimo / Naval', icon: Ship, color: '#00BCD4', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
      { key: 'satellites', label: 'Satélites', icon: Satellite, color: '#D4AF37', dataKey: 'satellites' },
    ],
  },
  {
    label: 'VIGILANCIA',
    icon: Camera,
    color: '#39FF14',
    layers: [
      { key: 'cctv', label: 'Cámaras CCTV', icon: Camera, color: '#39FF14', dataKey: 'cameras' },
      { key: 'live_news', label: 'Noticias en directo', icon: Tv, color: '#FF4081', dataKey: 'live_feeds' },
    ],
  },
  {
    label: 'RIESGOS NATURALES',
    icon: Activity,
    color: '#FF9500',
    layers: [
      { key: 'earthquakes', label: 'Terremotos (24h)', icon: Activity, color: '#FF9500', dataKey: 'earthquakes' },
      { key: 'fires', label: 'Incendios activos', icon: Flame, color: '#FF6B00', dataKey: 'fires' },
      { key: 'weather', label: 'Clima severo', icon: CloudLightning, color: '#E040FB', dataKey: 'weather_events' },
    ],
  },
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
    label: 'AMENAZAS E INFRAESTRUCTURA',
    icon: AlertTriangle,
    color: '#FF3D3D',
    layers: [
      { key: 'infrastructure', label: 'Instalaciones nucleares', icon: Radiation, color: '#76FF03', dataKey: 'infrastructure' },
      { key: 'critical_infra', label: 'Aeropuertos · refinerías · presas', icon: Building2, color: '#00E5FF', dataKey: 'critical_infra' },
      { key: 'submarine_cables', label: 'Cables submarinos', icon: Cable, color: '#00BCD4', dataKey: 'cables' },
      { key: 'global_incidents', label: 'Incidentes globales', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'gdelt' },
      { key: 'traffic_incidents', label: 'Incidencias de tráfico', icon: Construction, color: '#FFB300', dataKey: 'traffic_incidents' },
      { key: 'gps_jamming', label: 'Interferencia GPS', icon: Radio, color: '#FF4444', dataKey: 'gps_jamming' },
    ],
  },
  {
    label: 'VISUALIZACIÓN',
    icon: Sun,
    color: '#448AFF',
    layers: [
      { key: 'day_night', label: 'Ciclo día / noche', icon: Sun, color: '#448AFF', dataKey: '' },
    ],
  },
];

// Flat list for backward compat
const ALL_LAYERS = LAYER_GROUPS.flatMap(g => g.layers);

function LayerPanel({ data, activeLayers, setActiveLayers }: LayerPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    LAYER_GROUPS.forEach(g => { initial[g.label] = true; });
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
  const totalEntities = ALL_LAYERS.reduce((s: number, l: any) => s + (getCount(l.dataKey) || 0), 0);
  const activeCount = Object.values(activeLayers).filter(Boolean).length;

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

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
                        const count = getCount(layer.dataKey);
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
