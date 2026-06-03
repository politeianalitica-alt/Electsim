'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Newspaper, Search, X, Globe, MapPinned, Radar, Satellite, Moon, Sun, ExternalLink, AlertTriangle, Database, Wifi, Type, Check, Crosshair } from 'lucide-react';
import IntelFeed from '@/components/osiris/IntelFeed';
import SearchBar from '@/components/osiris/SearchBar';
import ScaleBar from '@/components/osiris/ScaleBar';
import ErrorBoundary from '@/components/osiris/ErrorBoundary';
import SharePanel from '@/components/osiris/SharePanel';
import KeyboardShortcuts from '@/components/osiris/KeyboardShortcuts';
import GlobalStatusBar from '@/components/osiris/GlobalStatusBar';
import LegendFooter from '@/components/osiris/LegendFooter';
import LiveAlerts from '@/components/osiris/LiveAlerts';
import { startAisStream } from '@/lib/osiris/aisClient';

const OsirisMap = dynamic(() => import('@/components/osiris/OsirisMap'), { ssr: false });
const LayerPanel = dynamic(() => import('@/components/osiris/LayerPanel'));
const CameraViewer = dynamic(() => import('@/components/osiris/CameraViewer'));
const OsintPanel = dynamic(() => import('@/components/osiris/OsintPanel'));

// Claves de las sub-capas marítimas (barcos y puertos por tipo)
const MARITIME_SHIP_KEYS = ['ship_cargo', 'ship_tanker', 'ship_passenger', 'ship_fishing', 'ship_tug', 'ship_highspeed', 'ship_military', 'ship_other'];
const MARITIME_PORT_KEYS = ['port_container', 'port_energy', 'port_naval', 'port_commercial'];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobile if narrow, OR landscape phone (short height + moderate width)
      setIsMobile(w < 768 || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isMobile;
}

// Botón de control del mapa con menú desplegable de opciones (estilo / modo visual).
// En vez de "ciclar" a ciegas, abre un menú con TODAS las opciones y marca la activa.
type MapMenuOption = { value: string; label: string; icon?: React.ReactNode; color?: string };
function MapControlMenu({
  triggerIcon, tooltip, options, value, onSelect, isOpen, onToggle, onClose,
}: {
  triggerIcon: React.ReactNode;
  tooltip: string;
  options: MapMenuOption[];
  value: string;
  onSelect: (v: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Cierra al pulsar fuera del control (robusto frente a ancestros con transform).
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);
  return (
    <div ref={wrapRef} className="relative pointer-events-auto">
      <button
        onClick={onToggle}
        className={`glass-panel p-2.5 transition-colors group relative ${isOpen ? 'border-[var(--gold-primary)]/60' : 'hover:border-[var(--gold-primary)]/40'}`}
        title={tooltip}
      >
        {triggerIcon}
        {!isOpen && (
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
            {tooltip}
          </span>
        )}
      </button>
      {isOpen && (
        <>
          <div
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[300] glass-panel p-1"
            style={{ minWidth: 150, display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { onSelect(opt.value); onClose(); }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors text-left"
                  style={{
                    background: active ? 'var(--gold-primary)' : 'transparent',
                    color: active ? '#0b0e16' : 'var(--text-primary, #E8E6E0)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="flex items-center justify-center w-4 h-4 flex-shrink-0" style={{ color: active ? '#0b0e16' : (opt.color || 'var(--text-muted)') }}>
                    {opt.icon}
                  </span>
                  <span className="flex-1 text-[11.5px] font-medium tracking-wide">{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
const UptimeClock = () => {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef(Date.now());
  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(`${String(Math.floor(e/3600)).padStart(2,'0')}:${String(Math.floor((e%3600)/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="hidden lg:inline">ACTIVO: <span className="text-[var(--gold-primary)]">{uptime}</span></span>;
};

const ZuluClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(`ZULU ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}Z`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="text-[var(--cyan-primary)] font-bold tabular-nums">{time || 'ZULU --:--:--Z'}</span>;
};

/** Real entity count — no fake throughput metrics */
const ActiveEntityCount = ({ data }: { data: Record<string, unknown[]> }) => {
  const count = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0);
  }, [data]);
  return <span className="text-[var(--alert-green)] font-bold tabular-nums">{count.toLocaleString()}</span>;
};

/** Extracts a watchable YouTube URL from embed/channel URLs */
function getYouTubeWatchUrl(url: string): string {
  if (url.includes('channel=')) return `https://www.youtube.com/channel/${url.split('channel=')[1].split('&')[0]}/live`;
  if (url.includes('/embed/')) return `https://www.youtube.com/watch?v=${url.split('/embed/')[1].split('?')[0]}`;
  return url;
}

export default function Dashboard() {
  const dataRef = useRef<any>({});
  const [dataVersion, setDataVersion] = useState(0);
  const data = dataRef.current;

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState({ zoom: 5.5, latitude: 40.2 });
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const mouseCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [activeCamera, setActiveCamera] = useState<any>(null);
  const [spaceWeather, setSpaceWeather] = useState<any>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showIntel, setShowIntel] = useState(true);
  const [showRecon, setShowRecon] = useState(false); // panel de Reconocimiento (flotante)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'layers'|'markets'|'intel'|'search'|'recon'|null>(null);
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('globe');
  const [mapStyle, setMapStyle] = useState<'dark'|'light'|'satellite'>('dark');
  const [visualMode, setVisualMode] = useState<'none'|'flir'|'nvg'|'crt'>('none');
  const [muteMap, setMuteMap] = useState(false);
  // Qué menú desplegable de control del mapa está abierto (estilo / modo visual)
  const [openMapMenu, setOpenMapMenu] = useState<null | 'style' | 'visual'>(null);
  const [sweepData, setSweepData] = useState<any>(null);
  const [scanTargets, setScanTargets] = useState<any[]>([]);

  const isMobile = useIsMobile();
  const startTime = useRef(Date.now());
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);
  // AIS global (aisstream) — corre en el navegador
  const aisStopRef = useRef<null | (() => void)>(null);
  const aisActiveRef = useRef(false);

  // ── DEFAULT: TODAS las capas apagadas excepto "día/noche" ──
  const [activeLayers, setActiveLayers] = useState({
    flights: false,
    private: false,
    jets: false,
    military: false,
    maritime: false,
    ship_cargo: false,
    ship_tanker: false,
    ship_passenger: false,
    ship_fishing: false,
    ship_tug: false,
    ship_highspeed: false,
    ship_military: false,
    ship_other: false,
    port_container: false,
    port_energy: false,
    port_naval: false,
    port_commercial: false,
    satellites: false,
    balloons: false,
    cctv: false,
    live_news: false,
    news_intel: false,
    earthquakes: false,
    fires: false,
    weather: false,
    radiation: false,
    infrastructure: false,
    power_solar: false,
    power_wind: false,
    power_hydro: false,
    power_nuclear: false,
    power_coal: false,
    power_gas: false,
    power_oil: false,
    power_other: false,
    critical_infra: false,
    submarine_cables: false,
    global_incidents: false,
    traffic_incidents: false,
    war_alerts: false,
    gps_jamming: false,
    geo_rivers: false,
    geo_mountains: false,
    geo_deserts: false,
    geo_features: false,
    gdacs: false,
    hurricanes: false,
    volcanoes: false,
    airports: false,
    launches: false,
    iss: false,
    frontline: false,
    conflict_zones: false,
    war_ukraine: false,
    war_gaza: false,
    war_lebanon: false,
    war_iran: false,
    war_sudan: false,
    war_myanmar: false,
    war_congo: false,
    war_sahel: false,
    war_syria: false,
    trains: false,
    railways: false,
    satnogs: false,
    gibs: false,
    nightlights: false,
    military_bases: false,
    air_quality: false,
    rainfall: false,
    aurora: false,
    tectonics: false,
    sea_state: false,
    pipelines: false,
    powerlines: false,
    datacenters: false,
    oilgas: false,
    minerals: false,
    agriculture: false,
    alliances: false,
    sanctions: false,
    milspend: false,
    regime: false,
    nukes: false,
    disputes: false,
    orgs: false,
    lighthouses: false,
    maritime_routes: false,
    piracy: false,
    day_night: true,
    sdk_stream: false,
  });
  // Marítimo: activar cualquier tipo de barco o puerto debe cargar y mostrar los
  // datos sin necesidad de activar antes el toggle maestro "Todo el tráfico".
  const anyShipActive = MARITIME_SHIP_KEYS.some(k => (activeLayers as any)[k]);
  const anyPortActive = MARITIME_PORT_KEYS.some(k => (activeLayers as any)[k]);
  const maritimeActive = activeLayers.maritime || anyShipActive || anyPortActive;
  const showShips = activeLayers.maritime || anyShipActive;
  const [liveFeedUrl, setLiveFeedUrl] = useState<string | null>(null);
  const [liveFeedName, setLiveFeedName] = useState('');
  const [liveFeedEmbedAllowed, setLiveFeedEmbedAllowed] = useState(true);

  // Splash screen
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(splashTimer);
  }, []);

  // URL state: parse on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const lat = parseFloat(p.get('lat') || '');
    const lon = parseFloat(p.get('lon') || '');
    const zoom = parseFloat(p.get('zoom') || '');
    if (!isNaN(lat) && !isNaN(lon)) {
      setFlyToLocation({ lat, lng: lon, ts: Date.now() });
      if (!isNaN(zoom)) setMapView(v => ({ ...v, zoom }));
    }
    const layers = p.get('layers');
    if (layers) {
      const active = layers.split(',');
      setActiveLayers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { (next as any)[k] = active.includes(k); });
        return next;
      });
    }
  }, []);

  // URL state: update URL on view change (debounced)
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('lat', (mapView.latitude ?? 20).toFixed(4));
      p.set('lon', '0');
      p.set('zoom', mapView.zoom.toFixed(2));
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      p.set('layers', active);
      const url = `${window.location.pathname}?${p.toString()}`;
      window.history.replaceState(null, '', url);
    }, 1500);
  }, [mapView, activeLayers]);

  // Global Stats Fetch
  useEffect(() => {
    fetch('/api/osiris/stats')
      .then(res => res.json())
      .then(d => {
        if (d.stats) setGlobalStats(d.stats);
      })
      .catch(console.error);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'f' && !e.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      if (e.key === 'l') setShowLayers(p => !p);
      if (e.key === 'i') setShowIntel(p => !p);
      if (e.key === 'r') setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
      if (e.key === 'g') setMapProjection(p => p === 'globe' ? 'mercator' : 'globe');
    };
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown', handler);
    document.addEventListener('fullscreenchange', fsHandler);
    return () => { window.removeEventListener('keydown', handler); document.removeEventListener('fullscreenchange', fsHandler); };
  }, []);

  // Mouse coords + reverse geocode (Zero-Render)
  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    mouseCoordsRef.current = coords;
    if (coordsDisplayRef.current) {
      coordsDisplayRef.current.innerText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const d = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (d < 0.5) return; // increased threshold — fewer geocode calls
      }
      const gk = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`; // coarser grid = more cache hits
      if (geocodeCache.current.has(gk)) { setLocationLabel(geocodeCache.current.get(gk)!); lastGeocodedPos.current = coords; return; }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
        if (res.ok) {
          const d = await res.json();
          const a = d.address || {};
          const label = [a.city||a.town||a.village||a.county, a.state||a.region, a.country].filter(Boolean).join(', ') || 'Unknown';
          if (geocodeCache.current.size > 500) { const it = geocodeCache.current.keys(); for (let i=0;i<100;i++) { const k = it.next().value; if(k) geocodeCache.current.delete(k); }}
          geocodeCache.current.set(gk, label);
          setLocationLabel(label);
          lastGeocodedPos.current = coords;
        }
      } catch (e) { console.warn('[Politeia] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 3000); // 3s debounce (was 1.5s)
  }, []);

  // Region dossier (right-click)
  const handleRightClick = useCallback(async (coords: { lat: number; lng: number }) => {
    setDossierLoading(true); setRegionDossier(null);
    try {
      const res = await fetch(`/api/osiris/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) setRegionDossier(await res.json());
    } catch (e) { console.warn('[Politeia] Suppressed error:', e instanceof Error ? e.message : e); } finally { setDossierLoading(false); }
  }, []);

  // Entity click handler (hoisted from JSX to comply with Rules of Hooks — Fixes #113)
  const handleEntityClick = useCallback((entity: any) => {
    if (entity?.type === 'cctv') setActiveCamera(entity);
    if (entity?.type === 'live_news' && entity.url) {
      setLiveFeedUrl(entity.url);
      setLiveFeedName(entity.name);
      setLiveFeedEmbedAllowed(entity.embed_allowed !== false);
    }
  }, []);

  // ── SHARED FETCH UTILITY (Fixes #107 — single definition, not 3 copies) ──
  const fetchEndpoint = useCallback(async (url: string, transform?: (d: any) => any, options?: RequestInit) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        const json = await res.json();
        const d = transform ? transform(json) : json;
        dataRef.current = { ...dataRef.current, ...d };
        setDataVersion(v => v + 1);
        setBackendStatus('connected');
      }
    } catch (e) {
      console.warn('[Politeia] Suppressed error:', e instanceof Error ? e.message : e);
      setBackendStatus('error');
    }
  }, []);

  // ── PROGRESSIVE DATA LOADING (request-optimized) ──
  useEffect(() => {
    // Priority 1: Core feeds (always needed for panels)
    fetchEndpoint('/api/osiris/earthquakes');
    fetchEndpoint('/api/osiris/news');
    const marketTimer = setTimeout(() => fetchEndpoint('/api/osiris/markets', d => ({ markets: d })), 800);

    // Priority 2: Space Weather (needed for MarketsPanel)
    const spaceTimer = setTimeout(async () => {
      try {
        const r = await fetch('/api/osiris/space-weather');
        if (r.ok) setSpaceWeather(await r.json());
      } catch (e) { console.warn('[Politeia] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 5000);

    // Polling — OPTIMIZED intervals to minimize edge requests
    const intervals = [
      setInterval(() => fetchEndpoint('/api/osiris/earthquakes'), 900000),  // 15 min (was 5)
      setInterval(() => fetchEndpoint('/api/osiris/news'), 1800000),        // 30 min (was 10)
      setInterval(() => fetchEndpoint('/api/osiris/markets', d => ({ markets: d })), 900000), // 15 min (was 5)
    ];
    return () => {
      clearTimeout(marketTimer);
      clearTimeout(spaceTimer);
      intervals.forEach(clearInterval);
    };
  }, [fetchEndpoint]);

  // ── LAYER-AWARE DATA LOADING — only fetch when layer is toggled ON ──
  const layerFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {

    // Flights
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      if (!layerFetchedRef.current.has('flights')) {
        fetchEndpoint('/api/osiris/flights');
        layerFetchedRef.current.add('flights');
      }
    }
    // Satellites
    if (activeLayers.satellites && !layerFetchedRef.current.has('satellites')) {
      fetchEndpoint('/api/osiris/satellites');
      layerFetchedRef.current.add('satellites');
    }
    // Fires
    if (activeLayers.fires && !layerFetchedRef.current.has('fires')) {
      fetchEndpoint('/api/osiris/fires');
      layerFetchedRef.current.add('fires');
    }
    // CCTV
    if (activeLayers.cctv && !layerFetchedRef.current.has('cctv')) {
      fetchEndpoint('/api/osiris/cctv?region=all&v=2');
      layerFetchedRef.current.add('cctv');
    }
    // Maritime
    if (maritimeActive && !layerFetchedRef.current.has('maritime')) {
      fetchEndpoint('/api/osiris/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, ...(aisActiveRef.current ? {} : { maritime_ships: d.ships }) }));
      layerFetchedRef.current.add('maritime');
    }
    // Balloons
    if (activeLayers.balloons && !layerFetchedRef.current.has('balloons')) {
      fetchEndpoint('/api/osiris/balloons', d => ({ balloons: d.balloons }));
      layerFetchedRef.current.add('balloons');
    }
    // Radiation
    if (activeLayers.radiation && !layerFetchedRef.current.has('radiation')) {
      fetchEndpoint('/api/osiris/radiation', d => ({ radiation: d.stations }));
      layerFetchedRef.current.add('radiation');
    }
    // Live News
    if (activeLayers.live_news && !layerFetchedRef.current.has('live_news')) {
      fetchEndpoint('/api/osiris/live-news', d => ({ live_feeds: d.feeds }));
      layerFetchedRef.current.add('live_news');
    }
    // Weather
    if (activeLayers.weather && !layerFetchedRef.current.has('weather')) {
      fetchEndpoint('/api/osiris/weather', d => ({ weather_events: d.events }));
      layerFetchedRef.current.add('weather');
    }
    // Infrastructure
    if ((activeLayers.infrastructure || activeLayers.power_solar || activeLayers.power_wind || activeLayers.power_hydro || activeLayers.power_nuclear || activeLayers.power_coal || activeLayers.power_gas || activeLayers.power_oil || activeLayers.power_other || activeLayers.critical_infra || activeLayers.submarine_cables) && !layerFetchedRef.current.has('infrastructure')) {
      fetchEndpoint('/api/osiris/infrastructure', d => ({ infrastructure: d.infrastructure, power_plants: d.power_plants, critical_infra: d.critical_infra, cables: d.cables }));
      layerFetchedRef.current.add('infrastructure');
    }
    // Global Incidents (GDELT)
    if (activeLayers.global_incidents && !layerFetchedRef.current.has('gdelt')) {
      fetchEndpoint('/api/osiris/gdelt', d => ({ gdelt: d.events }));
      layerFetchedRef.current.add('gdelt');
    }
    // Incidencias de tráfico (DGT — DATEX II)
    if (activeLayers.traffic_incidents && !layerFetchedRef.current.has('traffic_incidents')) {
      fetchEndpoint('/api/osiris/traffic-incidents', d => ({ traffic_incidents: d.incidents }));
      layerFetchedRef.current.add('traffic_incidents');
    }
    // Accidentes geográficos (Natural Earth) — ríos, montañas, desiertos…
    if ((activeLayers.geo_rivers || activeLayers.geo_mountains || activeLayers.geo_deserts || activeLayers.geo_features) && !layerFetchedRef.current.has('geo_features')) {
      fetchEndpoint('/api/osiris/geo-features', d => ({ geo_rivers_fc: d.rivers, geo_areas_fc: d.areas, geo_points: d.points }));
      layerFetchedRef.current.add('geo_features');
    }
    // GDACS — alertas de desastres
    if (activeLayers.gdacs && !layerFetchedRef.current.has('gdacs')) {
      fetchEndpoint('/api/osiris/gdacs', d => ({ gdacs: d.events }));
      layerFetchedRef.current.add('gdacs');
    }
    // Ciclones tropicales (NHC)
    if (activeLayers.hurricanes && !layerFetchedRef.current.has('hurricanes')) {
      fetchEndpoint('/api/osiris/hurricanes', d => ({ hurricanes: d.storms }));
      layerFetchedRef.current.add('hurricanes');
    }
    // Volcanes (Smithsonian)
    if (activeLayers.volcanoes && !layerFetchedRef.current.has('volcanoes')) {
      fetchEndpoint('/api/osiris/volcanoes', d => ({ volcanoes: d.volcanoes }));
      layerFetchedRef.current.add('volcanoes');
    }
    // Aeropuertos (OurAirports)
    if (activeLayers.airports && !layerFetchedRef.current.has('airports')) {
      fetchEndpoint('/api/osiris/airports', d => ({ airports: d.airports }));
      layerFetchedRef.current.add('airports');
    }
    // Lanzamientos espaciales (Launch Library)
    if (activeLayers.launches && !layerFetchedRef.current.has('launches')) {
      fetchEndpoint('/api/osiris/launches', d => ({ launches: d.launches }));
      layerFetchedRef.current.add('launches');
    }
    // ISS (posición en directo)
    if (activeLayers.iss && !layerFetchedRef.current.has('iss')) {
      fetchEndpoint('/api/osiris/iss', d => ({ iss: d.iss }));
      layerFetchedRef.current.add('iss');
    }
    // Frente de Ucrania (DeepState)
    if (activeLayers.frontline && !layerFetchedRef.current.has('frontline')) {
      fetchEndpoint('/api/osiris/frontlines', d => ({ frontline_fc: d.frontlines?.map || d.frontlines }));
      layerFetchedRef.current.add('frontline');
    }
    // Trenes (Digitraffic)
    if (activeLayers.trains && !layerFetchedRef.current.has('trains')) {
      fetchEndpoint('/api/osiris/trains', d => ({ trains: d.trains }));
      layerFetchedRef.current.add('trains');
    }
    // Red ferroviaria mundial (estática, una sola carga)
    if (activeLayers.railways && !layerFetchedRef.current.has('railways')) {
      fetchEndpoint('/api/osiris/railways', d => ({ railways_fc: d.railways, railways_hs_fc: d.highspeed, railways_commuter_fc: d.commuter }));
      layerFetchedRef.current.add('railways');
    }
    // Lote Clima y Tierra
    if (activeLayers.rainfall && !layerFetchedRef.current.has('rainfall')) {
      fetchEndpoint('/api/osiris/rainviewer', d => ({ rainviewer: d }));
      layerFetchedRef.current.add('rainfall');
    }
    if (activeLayers.aurora && !layerFetchedRef.current.has('aurora')) {
      fetchEndpoint('/api/osiris/aurora', d => ({ aurora: d.points }));
      layerFetchedRef.current.add('aurora');
    }
    if (activeLayers.tectonics && !layerFetchedRef.current.has('tectonics')) {
      fetchEndpoint('/api/osiris/tectonics', d => ({ tectonics_fc: d.plates }));
      layerFetchedRef.current.add('tectonics');
    }
    if (activeLayers.sea_state && !layerFetchedRef.current.has('sea_state')) {
      fetchEndpoint('/api/osiris/sea-state', d => ({ sea_state: d.points }));
      layerFetchedRef.current.add('sea_state');
    }
    // Lote Energía y Recursos
    if (activeLayers.pipelines && !layerFetchedRef.current.has('pipelines')) {
      fetchEndpoint('/api/osiris/pipelines', d => ({ pipelines_fc: d.pipelines }));
      layerFetchedRef.current.add('pipelines');
    }
    if (activeLayers.powerlines && !layerFetchedRef.current.has('powerlines')) {
      fetchEndpoint('/api/osiris/powerlines', d => ({ powerlines_fc: d.powerlines }));
      layerFetchedRef.current.add('powerlines');
    }
    if (activeLayers.datacenters && !layerFetchedRef.current.has('datacenters')) {
      fetchEndpoint('/api/osiris/datacenters', d => ({ datacenters: d.datacenters }));
      layerFetchedRef.current.add('datacenters');
    }
    if (activeLayers.oilgas && !layerFetchedRef.current.has('oilgas')) {
      fetchEndpoint('/api/osiris/oilgas', d => ({ oilgas: d.fields }));
      layerFetchedRef.current.add('oilgas');
    }
    if (activeLayers.minerals && !layerFetchedRef.current.has('minerals')) {
      fetchEndpoint('/api/osiris/minerals', d => ({ minerals: d.mines }));
      layerFetchedRef.current.add('minerals');
    }
    if (activeLayers.agriculture && !layerFetchedRef.current.has('agriculture')) {
      fetchEndpoint('/api/osiris/agriculture', d => ({ agriculture_fc: d.agriculture }));
      layerFetchedRef.current.add('agriculture');
    }
    // Lote Geopolítica (una sola carga sirve países + disputas + organismos)
    if ((activeLayers.alliances || activeLayers.sanctions || activeLayers.milspend || activeLayers.regime || activeLayers.nukes || activeLayers.disputes || activeLayers.orgs) && !layerFetchedRef.current.has('geopolitics')) {
      fetchEndpoint('/api/osiris/geopolitics', d => ({ geopolitics_fc: d.countries, disputes: d.disputes, orgs: d.orgs }));
      layerFetchedRef.current.add('geopolitics');
    }
    // Lote Espacio y Marítimo
    if (activeLayers.lighthouses && !layerFetchedRef.current.has('lighthouses')) {
      fetchEndpoint('/api/osiris/lighthouses', d => ({ lighthouses: d.lighthouses }));
      layerFetchedRef.current.add('lighthouses');
    }
    if ((activeLayers.maritime_routes || activeLayers.piracy) && !layerFetchedRef.current.has('maritime_routes')) {
      fetchEndpoint('/api/osiris/maritime-routes', d => ({ sea_lanes_fc: d.routes, piracy: d.piracy }));
      layerFetchedRef.current.add('maritime_routes');
    }
    // Estaciones SatNOGS
    if (activeLayers.satnogs && !layerFetchedRef.current.has('satnogs')) {
      fetchEndpoint('/api/osiris/satnogs', d => ({ satnogs: d.stations }));
      layerFetchedRef.current.add('satnogs');
    }
    // Bases militares (Wikidata)
    if (activeLayers.military_bases && !layerFetchedRef.current.has('military_bases')) {
      fetchEndpoint('/api/osiris/military-bases', d => ({ military_bases: d.bases }));
      layerFetchedRef.current.add('military_bases');
    }
    // Calidad del aire (Open-Meteo)
    if (activeLayers.air_quality && !layerFetchedRef.current.has('air_quality')) {
      fetchEndpoint('/api/osiris/air-quality', d => ({ air_quality: d.stations }));
      layerFetchedRef.current.add('air_quality');
    }
    // Sucesos de guerra (una sola carga sirve para todas las guerras; se filtran en el mapa)
    if ((activeLayers.war_ukraine || activeLayers.war_gaza || activeLayers.war_lebanon || activeLayers.war_iran || activeLayers.war_sudan || activeLayers.war_myanmar || activeLayers.war_congo || activeLayers.war_sahel || activeLayers.war_syria) && !layerFetchedRef.current.has('war_events')) {
      fetchEndpoint('/api/osiris/war-events', d => ({ war_events: d.events }));
      layerFetchedRef.current.add('war_events');
    }

  }, [activeLayers]);

  // ── LAYER-AWARE POLLING — only poll data for active layers ──
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      intervals.push(setInterval(() => fetchEndpoint('/api/osiris/flights'), 300000)); // 5 min (was 2 min)
    }

    if (activeLayers.balloons) {
      intervals.push(setInterval(() => fetchEndpoint('/api/osiris/balloons', d => ({ balloons: d.balloons })), 300000)); // 5m
    }
    if (activeLayers.radiation) {
      intervals.push(setInterval(() => fetchEndpoint('/api/osiris/radiation', d => ({ radiation: d.stations })), 300000)); // 5m
    }
    if (maritimeActive) {
      intervals.push(setInterval(() => fetchEndpoint('/api/osiris/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, ...(aisActiveRef.current ? {} : { maritime_ships: d.ships }) })), 30000)); // 30s (AIS global tarda ~9s en recogerse + caché 20s)
    }
    if (activeLayers.iss) {
      intervals.push(setInterval(() => fetchEndpoint('/api/osiris/iss', d => ({ iss: d.iss })), 5000)); // 5s (la ISS va a ~7,6 km/s)
    }
    if (activeLayers.trains) {
      intervals.push(setInterval(() => fetchEndpoint('/api/osiris/trains', d => ({ trains: d.trains })), 20000)); // 20s
    }
    return () => intervals.forEach(clearInterval);
  }, [activeLayers, fetchEndpoint]);

  // ── AIS GLOBAL (aisstream) EN EL NAVEGADOR — cobertura mundial de barcos ──
  // Vercel (datacenter) no recibe el stream; el navegador del usuario sí. Al
  // activar la capa marítima, abrimos el WebSocket y reemplazamos los barcos del
  // servidor (Báltico) por los globales (España, Gibraltar, todo el mundo).
  useEffect(() => {
    if (!showShips) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    (async () => {
      try {
        const r = await fetch('/api/osiris/ais-key');
        if (!r.ok) return;
        const { key, enabled } = await r.json();
        if (!enabled || !key || cancelled) return;
        stop = startAisStream({
          apiKey: key,
          onShips: (ships) => {
            aisActiveRef.current = true;
            dataRef.current = { ...dataRef.current, maritime_ships: ships };
            setDataVersion(v => v + 1);
          },
        });
        aisStopRef.current = stop;
      } catch { /* sin AIS global: quedan los barcos del servidor */ }
    })();
    return () => {
      cancelled = true;
      if (stop) stop();
      aisStopRef.current = null;
      aisActiveRef.current = false;
    };
  }, [showShips]);

  // CCTV: loaded once on layer toggle via layerFetchedRef (no viewport polling)

  // Reactive layer fetch: handled by layerFetchedRef above (no duplicate)

  // ── Politeia SDK — Capa de fusión de inteligencia ──
  // Produces node coordinates for the SDK network mesh visualization.
  // Does NOT duplicate existing layer visuals — SDK layer is LINES ONLY.
  // Cameras are excluded — they have their own dedicated layer.
  useEffect(() => {
    if (!activeLayers.sdk_stream) {
      dataRef.current = { ...dataRef.current, sdk_entities: [] };
      return;
    }

    const sdkEntities: any[] = [];

    // Air domain (nodes only — no visual duplication)
    const allFlights = [
      ...(data.commercial_flights || []),
      ...(data.private_flights || []),
      ...(data.private_jets || []),
      ...(data.military_flights || []),
    ];
    // Sample flights to keep it clean (every Nth)
    const flightStep = Math.max(1, Math.floor(allFlights.length / 60));
    for (let i = 0; i < allFlights.length; i += flightStep) {
      const f = allFlights[i];
      if (!f.lat || !f.lng) continue;
      sdkEntities.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
        properties: { domain: 'AIR', name: f.callsign?.trim() || 'TRACK', source: 'ADS-B / OpenSky' },
      });
    }

    // Sea domain
    const ships = data.maritime_ships || [];
    const shipStep = Math.max(1, Math.floor(ships.length / 60));
    for (let i = 0; i < ships.length; i += shipStep) {
      const s = ships[i];
      if (!s.lat || !s.lng) continue;
      sdkEntities.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { domain: 'SEA', name: s.name || `MMSI-${s.mmsi}`, source: 'AIS Stream' },
      });
    }

    // Events — Earthquakes
    if (data.earthquakes?.length) {
      for (const eq of data.earthquakes) {
        if (!eq.lat || !eq.lng) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] },
          properties: { domain: 'LAND', name: `M${eq.magnitude} ${eq.place || ''}`, source: 'USGS' },
        });
      }
    }

    // GDELT events
    if (data.gdelt?.length) {
      for (const g of data.gdelt) {
        if (!g.lat || !g.lng) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
          properties: { domain: 'INTEL', name: g.name || 'GDELT Event', source: 'GDELT Project' },
        });
      }
    }

    // News intel
    if (data.news?.length) {
      for (const n of data.news) {
        if (!n.coords || n.coords.length < 2) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] },
          properties: { domain: 'INTEL', name: n.title || 'SIGINT', source: n.source || 'RSS Feed' },
        });
      }
    }

    dataRef.current = { ...dataRef.current, sdk_entities: sdkEntities };
  }, [dataVersion, activeLayers.sdk_stream]);

  const totalFlights = useMemo(() => (
    (data.commercial_flights?.length||0)+(data.private_flights?.length||0)+(data.private_jets?.length||0)+(data.military_flights?.length||0)
  ), [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights]);


  return (
    <main className="osiris-root fixed inset-x-0 bottom-0 top-[44px] bg-[var(--bg-void)] overflow-hidden" style={{ position: 'fixed', top: 44, left: 0, right: 0, bottom: 0 }}>

      {/* ── SPLASH ── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, var(--bg-void) 70%)' }}
          >
            {/* ── Scanline CRT overlay ── */}
            <div className="absolute inset-0 pointer-events-none z-[1]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.015) 2px, rgba(212,175,55,0.015) 4px)',
              animation: 'splashScanDrift 8s linear infinite',
            }} />

            {/* ── V4.2 badge — top-left ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute top-6 left-6 z-[2] font-mono text-[10px] tracking-[0.3em] text-[var(--gold-primary)]"
            >
              V4.2
            </motion.div>



            {/* ── Geometric tactical logo ── */}
            <div className="relative w-40 h-40 mb-8 flex items-center justify-center z-[2]">
              {/* Outer ring — slow clockwise */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.6 }, scale: { duration: 0.8, ease: 'easeOut' }, rotate: { duration: 20, repeat: Infinity, ease: 'linear' } }}
                className="absolute inset-0 rounded-full"
                style={{ border: '1px solid rgba(212,175,55,0.2)' }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: 'var(--gold-primary)', boxShadow: '0 0 12px var(--gold-primary), 0 0 24px rgba(212,175,55,0.3)' }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(212,175,55,0.5)', boxShadow: '0 0 6px rgba(212,175,55,0.3)' }} />
              </motion.div>

              {/* Middle ring — faster counter-clockwise */}
              <motion.div
                initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: -360 }}
                transition={{ opacity: { duration: 0.6, delay: 0.15 }, scale: { duration: 0.8, delay: 0.15, ease: 'easeOut' }, rotate: { duration: 12, repeat: Infinity, ease: 'linear' } }}
                className="absolute rounded-full"
                style={{ inset: '18px', border: '1px solid rgba(0,229,255,0.15)' }}
              >
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan-primary)', boxShadow: '0 0 10px var(--cyan-primary), 0 0 20px rgba(0,229,255,0.2)' }} />
                <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(0,229,255,0.4)' }} />
              </motion.div>

              {/* Inner ring — fastest clockwise */}
              <motion.div
                initial={{ opacity: 0, scale: 0.2, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.6, delay: 0.3 }, scale: { duration: 0.8, delay: 0.3, ease: 'easeOut' }, rotate: { duration: 7, repeat: Infinity, ease: 'linear' } }}
                className="absolute rounded-full"
                style={{ inset: '40px', border: '1px solid rgba(212,175,55,0.25)' }}
              >
                <div className="absolute top-0 left-1/4 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold-primary)', boxShadow: '0 0 8px var(--gold-primary)' }} />
              </motion.div>

              {/* Core circle + crosshair */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative w-12 h-12 rounded-full flex items-center justify-center"
                style={{ border: '2px solid var(--gold-primary)', boxShadow: '0 0 20px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.05)' }}
              >
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-5 h-5 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, rgba(212,175,55,0.05) 70%)' }}
                />
                {/* Crosshair lines */}
                <div className="absolute w-[1px] h-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.3), transparent)' }} />
                <div className="absolute w-full h-[1px]" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.3), transparent)' }} />
              </motion.div>

              {/* Faint pulsing radar sweep */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.15, 0], rotate: [0, 360] }}
                transition={{ opacity: { duration: 3, repeat: Infinity }, rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, delay: 0.6 }}
                className="absolute inset-[10px] rounded-full"
                style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.15) 40deg, transparent 80deg)' }}
              />
            </div>

            {/* ── Título Politeia — animación letra a letra ── */}
            <div className="flex items-center gap-[2px] mb-3 z-[2]">
              {'POLITEIA'.split('').map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                  className="text-4xl md:text-5xl font-bold tracking-[0.5em] font-mono"
                  style={{ color: 'var(--text-heading)', textShadow: '0 0 30px rgba(212,175,55,0.2)' }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* ── Subtitle — typewriter reveal ── */}
            <div className="overflow-hidden mb-8 z-[2]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1.2, duration: 0.8, ease: 'easeInOut' }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-[10px] md:text-[11px] font-mono tracking-[0.5em] text-[var(--gold-primary)]" style={{ opacity: 0.8 }}>
                  INTELIGENCIA POLITEIA
                </p>
              </motion.div>
            </div>

            {/* ── Multi-stage progress bar ── */}
            <div className="w-64 md:w-80 z-[2]">
              {/* Thin progress track */}
              <div className="relative w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(212,175,55,0.1)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: ['0%', '25%', '50%', '78%', '100%'] }}
                  transition={{ duration: 2.2, delay: 0.5, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--gold-primary), var(--cyan-primary), var(--gold-primary))', boxShadow: '0 0 12px rgba(212,175,55,0.4)' }}
                />
              </div>

              {/* Status messages — cycling */}
              <div className="mt-3 h-4 flex items-center justify-center">
                {[
                  { text: 'ESTABLISHING SECURE CONNECTION...', delay: 0.5 },
                  { text: 'INITIALIZING FEEDS...', delay: 1.1 },
                  { text: 'CALIBRATING SENSORS...', delay: 1.7 },
                  { text: 'SYSTEM READY', delay: 2.2 },
                ].map((stage, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ delay: stage.delay, duration: 0.6, times: [0, 0.1, 0.7, 1] }}
                    className="absolute text-[9px] font-mono tracking-[0.25em]"
                    style={{ color: i === 3 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}
                  >
                    {stage.text}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* ── Decorative grid lines ── */}
            <div className="absolute inset-0 pointer-events-none z-[0]" style={{ opacity: 0.03 }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} />
            </div>

            {/* ── Corner frame accents ── */}
            {[
              { t: '10px', l: '10px', bw: '2px 0 0 2px' },
              { t: '10px', r: '10px', bw: '2px 2px 0 0' },
              { b: '10px', l: '10px', bw: '0 0 2px 2px' },
              { b: '10px', r: '10px', bw: '0 2px 2px 0' },
            ].map((pos, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="absolute w-8 h-8 z-[2]"
                style={{ top: pos.t, bottom: pos.b, left: pos.l, right: pos.r, borderWidth: pos.bw, borderStyle: 'solid', borderColor: 'var(--gold-primary)' }}
              />
            ))}



            {/* ── Inline keyframe for scanline drift ── */}

          </motion.div>
        )}
      </AnimatePresence>



      {/* ── MAP ── */}
      <ErrorBoundary name="Map">
        <OsirisMap 
          data={data} 
          activeLayers={activeLayers} 
          projection={mapProjection} 
          mapStyle={mapStyle}
          visualMode={visualMode}
          muteLabels={muteMap}
          onEntityClick={handleEntityClick} 
          onMouseCoords={handleMouseCoords} 
          onRightClick={handleRightClick} 
          onViewStateChange={setMapView} 
          flyToLocation={flyToLocation}
          sweepData={sweepData}
          scanTargets={scanTargets}
        />
      </ErrorBoundary>

      {/* ── Pie de página · leyenda de colores de las capas activas (con paginación) ── */}
      {!isMobile && <LegendFooter activeLayers={activeLayers} />}

      {/* Los controles de vista del mapa ahora viven en el panel izquierdo, bajo las capas. */}

      {/* ── RECONOCIMIENTO (desktop): botón flotante + panel a la derecha ── */}
      {!isMobile && (
        <>
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5 }}
            onClick={() => setShowRecon(v => !v)}
            className={`absolute bottom-6 right-5 z-[201] glass-panel p-2.5 pointer-events-auto transition-colors group ${showRecon ? 'border-[var(--gold-primary)]/60' : 'hover:border-[var(--gold-primary)]/40'}`}
            title="Reconocimiento OSINT"
          >
            <Crosshair className={`w-4 h-4 ${showRecon ? 'text-[var(--gold-primary)]' : 'text-[var(--text-muted)]'}`} />
          </motion.button>
          <AnimatePresence>
            {showRecon && (
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="absolute right-5 top-20 bottom-20 w-80 z-[200] flex flex-col pointer-events-auto"
              >
                <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0">
                  <span className="text-[10px] font-mono font-bold tracking-[0.12em] text-[var(--gold-primary)] uppercase">Reconocimiento</span>
                  <button onClick={() => setShowRecon(false)} className="text-[var(--text-muted)] hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto styled-scrollbar pr-1">
                  <OsintPanel onSweepVisualize={setSweepData} onScanGeolocate={(target, data) => {
                    setScanTargets(prev => {
                      const existing = prev.filter(t => t.id !== target);
                      return [{ id: target, timestamp: Date.now(), ...data }, ...existing].slice(0, 10);
                    });
                    setFlyToLocation({ lat: data.lat, lng: data.lng, ts: Date.now() });
                  }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2.5 }} className={`absolute top-3 left-3 md:top-5 md:left-5 z-[200] pointer-events-none flex items-center gap-2 md:gap-3`}>
        <div className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center relative">
          {/* Ambient glow ring — slow rotating */}
          <div className="absolute inset-[-4px] md:inset-[-5px] rounded-full border border-[var(--gold-primary)]/20" style={{ animation: 'osiris-rotate 12s linear infinite' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[var(--gold-primary)] shadow-[0_0_6px_var(--gold-primary)]" />
          </div>
          <div className="absolute inset-[-8px] md:inset-[-10px] rounded-full border border-[var(--gold-primary)]/10" style={{ animation: 'osiris-rotate 20s linear infinite reverse' }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-0.5 h-0.5 rounded-full bg-[var(--gold-primary)]/60" />
          </div>
          <div className="w-5 h-5 md:w-7 md:h-7 rounded-full border-2 border-[var(--gold-primary)] flex items-center justify-center animate-glow-pulse">
            <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-[var(--gold-primary)]/30 border border-[var(--gold-primary)]/60" />
          </div>
          <div className="absolute w-[1px] h-full bg-[var(--gold-primary)]/30" />
          <div className="absolute w-full h-[1px] bg-[var(--gold-primary)]/30" />
        </div>
        {/* Horizontal rule extending from logo */}
        <div className="hidden md:block absolute top-1/2 left-[52px] w-[200px] h-[1px] bg-gradient-to-r from-[var(--gold-primary)]/40 via-[var(--gold-primary)]/15 to-transparent" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-lg font-bold tracking-[0.12em] md:tracking-[0.2em] text-[var(--text-heading)] font-mono">INTELIGENCIA POLITEIA</h1>
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm border border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10 text-[7px] font-mono font-bold tracking-[0.15em] text-[var(--cyan-primary)] uppercase" style={{ lineHeight: '1.4' }}>
              <Globe className="w-2.5 h-2.5" />
              TIEMPO REAL
            </span>
          </div>
          <span className="text-[8px] md:text-[9px] text-[var(--gold-primary)] font-mono tracking-[0.2em] md:tracking-[0.3em] opacity-80">MAPA DE INTELIGENCIA EN TIEMPO REAL</span>
        </div>
      </motion.div>

      {/* ── TOP-RIGHT STATUS (desktop) — C2 DISPLAY ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="status-bar-desktop absolute top-3 right-3 md:top-4 md:right-5 z-[200] pointer-events-none flex items-center gap-1.5 md:gap-3 text-[9px] md:text-[10px] font-mono tracking-widest text-[var(--text-muted)]">

        {/* Zulu Clock */}
        <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-[var(--border-primary)] bg-black/30">
          <ZuluClock />
        </span>

        <span className="hidden lg:inline text-[var(--border-primary)]">│</span>

        <span className="flex items-center gap-1">SIST: <span className={backendStatus === 'connected' ? 'text-[var(--alert-green)]' : 'text-[var(--alert-red)]'}>{backendStatus.toUpperCase()}</span></span>

        {spaceWeather && <span className="hidden lg:inline">SOLAR: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>Kp{spaceWeather.kp_index}</span></span>}

        {/* Active Data Feeds */}
        <span className="hidden lg:inline-flex items-center gap-1">
          <Wifi className="w-3 h-3 text-[var(--cyan-primary)]" />
          <span className="text-[var(--cyan-primary)] font-bold">{Object.values(activeLayers).filter(Boolean).length}</span>
          <span className="text-[var(--text-muted)]/60">FLUJOS</span>
        </span>

        <UptimeClock />
      </motion.div>

      {/* ── LEFT HUD (desktop): Capas (scroll) + selectores de mapa + coordenadas ── */}
      <div className="desktop-panel absolute left-5 top-20 bottom-5 w-80 flex flex-col gap-3 z-[200] pointer-events-none">
        {/* Localizador */}
        <div className="pointer-events-auto flex-shrink-0"><SearchBar onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} /></div>
        {/* Capas — única sección con scroll */}
        {showLayers && (
          <div className="flex-1 min-h-0 overflow-y-auto styled-scrollbar pr-1 pointer-events-auto">
            <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} />
          </div>
        )}
        {/* Selectores de tipo de mapa — debajo de las capas */}
        <div className="glass-panel px-3 py-2 pointer-events-auto flex-shrink-0 flex items-center justify-between gap-2">
          <span className="text-[8.5px] font-mono tracking-[0.12em] text-[var(--text-muted)] uppercase">Vista del mapa</span>
          <div className="flex items-center gap-1.5">
            {/* 3D / 2D */}
            <button onClick={() => setMapProjection(p => p === 'globe' ? 'mercator' : 'globe')}
              className="p-1.5 rounded-md hover:bg-white/5 transition-colors" title={mapProjection === 'globe' ? 'Cambiar a 2D' : 'Cambiar a 3D'}>
              {mapProjection === 'globe'
                ? <MapPinned className="w-4 h-4 text-[var(--gold-primary)]" />
                : <Globe className="w-4 h-4 text-[var(--cyan-primary)]" />}
            </button>
            {/* Estilo */}
            <MapControlMenu
              tooltip={`Estilo: ${mapStyle === 'dark' ? 'OSCURO' : mapStyle === 'light' ? 'CLARO' : 'SATÉLITE'}`}
              triggerIcon={mapStyle === 'dark' ? <Moon className="w-4 h-4 text-[var(--cyan-primary)]" /> : mapStyle === 'light' ? <Sun className="w-4 h-4 text-[#E8A33D]" /> : <Satellite className="w-4 h-4 text-[var(--alert-green)]" />}
              options={[
                { value: 'dark', label: 'Oscuro', icon: <Moon className="w-4 h-4" />, color: 'var(--cyan-primary)' },
                { value: 'light', label: 'Claro', icon: <Sun className="w-4 h-4" />, color: '#E8A33D' },
                { value: 'satellite', label: 'Satélite', icon: <Satellite className="w-4 h-4" />, color: 'var(--alert-green)' },
              ]}
              value={mapStyle} onSelect={(v) => setMapStyle(v as any)}
              isOpen={openMapMenu === 'style'} onToggle={() => setOpenMapMenu(m => m === 'style' ? null : 'style')} onClose={() => setOpenMapMenu(null)}
            />
            {/* Modo visual */}
            <MapControlMenu
              tooltip={`Visual: ${visualMode === 'none' ? 'NORMAL' : visualMode.toUpperCase()}`}
              triggerIcon={<Radar className={`w-4 h-4 ${visualMode === 'none' ? 'text-[var(--text-muted)]' : 'text-[var(--gold-primary)]'}`} />}
              options={[
                { value: 'none', label: 'Normal', icon: <Radar className="w-4 h-4" />, color: 'var(--text-muted)' },
                { value: 'flir', label: 'FLIR · térmico', icon: <Radar className="w-4 h-4" />, color: '#FF6B35' },
                { value: 'nvg', label: 'NVG · nocturno', icon: <Radar className="w-4 h-4" />, color: '#39FF14' },
                { value: 'crt', label: 'CRT · retro', icon: <Radar className="w-4 h-4" />, color: '#FFB300' },
              ]}
              value={visualMode} onSelect={(v) => setVisualMode(v as any)}
              isOpen={openMapMenu === 'visual'} onToggle={() => setOpenMapMenu(m => m === 'visual' ? null : 'visual')} onClose={() => setOpenMapMenu(null)}
            />
            {/* Mapa mudo */}
            <button onClick={() => setMuteMap(m => !m)}
              className="p-1.5 rounded-md hover:bg-white/5 transition-colors" title="Mapa mudo (sin nombres)">
              <Type className={`w-4 h-4 ${muteMap ? 'text-[var(--gold-primary)]' : 'text-[var(--text-muted)]'}`} />
            </button>
          </div>
        </div>
        {/* Coordenadas — debajo de todo */}
        <div className="glass-panel px-3 py-2 pointer-events-auto flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8.5px] font-mono tracking-[0.12em] text-[var(--text-muted)] uppercase">Coordenadas</span>
            <span ref={coordsDisplayRef} className="text-[10px] font-mono font-semibold text-[var(--gold-primary)] tabular-nums">—</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-[9px] font-mono text-[var(--text-secondary)] truncate">{locationLabel || 'Pasa el cursor por el mapa…'}</span>
            <span className="text-[9px] font-mono text-[var(--text-muted)] flex-shrink-0">z{mapView.zoom.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* ── LIVE FEED VIEWER OVERLAY ── */}
      <AnimatePresence>
        {liveFeedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setLiveFeedUrl(null)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="w-[90vw] max-w-[900px] flex flex-col relative rounded-xl overflow-hidden border border-[var(--border-primary)] shadow-2xl bg-black"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF4081] animate-osiris-pulse" />
                  <span className="text-[12px] font-mono font-bold text-white tracking-wider">{liveFeedName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[9px] font-bold">LIVE STREAM</span>
                  {!liveFeedEmbedAllowed && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px]">EXTERNAL ONLY</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={getYouTubeWatchUrl(liveFeedUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border-primary)] hover:bg-[var(--gold-primary)] hover:text-black text-white transition-colors text-[11px] font-mono"
                  >
                    <span>Open in YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button onClick={() => setLiveFeedUrl(null)} className="text-white/70 hover:text-white transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body — iframe or external card */}
              {liveFeedEmbedAllowed ? (
                <div className="w-full aspect-video relative bg-black">
                  <iframe
                    src={liveFeedUrl}
                    className="w-full h-full absolute inset-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-black/95">
                  <div className="text-center px-8">
                    <div className="w-14 h-14 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mx-auto mb-4">
                      <ExternalLink className="w-6 h-6 text-[#39FF14]" />
                    </div>
                    <p className="text-[13px] font-mono font-bold text-white tracking-widest mb-2">EMBED RESTRICTED</p>
                    <p className="text-[11px] font-mono text-white/50 mb-6 max-w-xs">
                      {liveFeedName} does not allow third-party embedding. Click below to open the live stream directly.
                    </p>
                    <a
                      href={getYouTubeWatchUrl(liveFeedUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-[#39FF14]/40 text-[#39FF14] font-mono text-[12px] hover:bg-[#39FF14]/10 transition-colors tracking-wider"
                    >
                      <ExternalLink className="w-4 h-4" />
                      OPEN LIVE STREAM
                    </a>
                  </div>
                </div>
              )}

              {/* Footer — only show for embeddable feeds */}
              {liveFeedEmbedAllowed && (
                <div className="bg-[#111]/90 px-4 py-2.5 border-t border-[var(--border-primary)] flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
                  <span className="text-[11px] font-mono text-white/70 leading-relaxed">
                    If you see &ldquo;Video unavailable&rdquo;, use <strong className="text-[var(--gold-primary)]">Open in YouTube</strong> above.
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE UI ═══ */}
      {isMobile && (
        <>
          {/* Mobile Bottom Navigation */}
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {[
                { id: 'layers' as const, icon: Layers, label: 'CAPAS' },
                { id: 'intel' as const, icon: Newspaper, label: 'INTEL' },
                { id: 'recon' as const, icon: Radar, label: 'RECON' },
                { id: 'search' as const, icon: Search, label: 'BUSCAR' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setMobilePanel(mobilePanel === tab.id ? null : tab.id)}
                  className={`mobile-nav-btn ${mobilePanel === tab.id ? 'active' : ''}`}>
                  <tab.icon className={`w-4 h-4 ${tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}`} />
                  <span className={tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {mobilePanel && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-[52px] left-0 right-0 z-[400] glass-panel rounded-b-none overflow-y-auto styled-scrollbar"
                style={{ maxHeight: 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
              >
                <div className="mobile-drawer-handle" />
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="hud-text text-[9px] text-[var(--text-primary)]">
                      {mobilePanel === 'layers' ? 'CAPAS Y ESTADO' : mobilePanel === 'markets' ? 'MERCADOS E INTEL' : mobilePanel === 'intel' ? 'FLUJO INTEL' : mobilePanel === 'recon' ? 'RECON POLITEIA' : 'BUSCAR'}
                    </span>
                    <button onClick={() => setMobilePanel(null)} className="text-[var(--text-muted)] p-1"><X className="w-4 h-4" /></button>
                  </div>
                  {mobilePanel === 'layers' && (
                    <>
                      <div className="glass-panel-sm p-2 mb-2">
                        <div className="grid grid-cols-5 gap-1 text-center">
                          <div><div className="hud-label" style={{fontSize:'6px'}}>AIR</div><div className="hud-value text-[9px]">{totalFlights.toLocaleString()}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>SAT</div><div className="hud-value text-[9px]">{(data.satellites?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>CAM</div><div className="hud-value text-[9px]">{(data.cameras?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>WX</div><div className="hud-value text-[9px]" style={{color:'var(--accent-weather)'}}>{(data.weather_events?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>NUC</div><div className="hud-value text-[9px]" style={{color:'var(--accent-nuclear)'}}>{(data.infrastructure?.length||0)}</div></div>
                        </div>
                      </div>
                      <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} />
                    </>
                  )}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'search' && (
                    <div className="space-y-2">
                      <SearchBar onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />
                      <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />
                    </div>
                  )}
                  {mobilePanel === 'recon' && (
                    <div className="space-y-2">
                      <OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} onSweepVisualize={setSweepData} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Las coordenadas viven ahora en el panel izquierdo, bajo los selectores. */}

      {/* ── Scale Bar (desktop) ── */}
      <div className="desktop-only absolute bottom-[4.5rem] left-[20rem] z-[201] pointer-events-none">
        <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
      </div>

      {/* ── Region Dossier ── */}
      {(regionDossier || dossierLoading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
          <div className="glass-panel p-5 osiris-glow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono font-bold text-[var(--gold-primary)] tracking-wider">DOSIER DE REGIÓN</h2>
              <button onClick={() => { setRegionDossier(null); setDossierLoading(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
            </div>
            {dossierLoading ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">COMPILANDO INTEL…</span>
              </div>
            ) : regionDossier && (
              <div className="space-y-3">
                <div><div className="hud-label mb-0.5">UBICACIÓN</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.location?.display_name}</div></div>
                {regionDossier.country && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="hud-label mb-0.5">PAÍS</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div></div>
                    <div><div className="hud-label mb-0.5">CAPITAL</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                    <div><div className="hud-label mb-0.5">POBLACIÓN</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                    <div><div className="hud-label mb-0.5">REGIÓN</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                    <div><div className="hud-label mb-0.5">IDIOMAS</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                    <div><div className="hud-label mb-0.5">ÁREA</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
                  </div>
                )}
                {regionDossier.head_of_state && (<div><div className="hud-label mb-0.5">JEFE DE ESTADO</div><div className="text-xs text-[var(--gold-primary)]">{regionDossier.head_of_state.name}</div><div className="text-[8px] text-[var(--text-muted)]">{regionDossier.head_of_state.position}</div></div>)}
                {regionDossier.wikipedia && (<div><div className="hud-label mb-1">INFORME DE INTELIGENCIA</div><div className="flex gap-3">{regionDossier.wikipedia.thumbnail && <img src={regionDossier.wikipedia.thumbnail} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />}<p className="text-[8px] text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p></div></div>)}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Camera Viewer ── */}
      <CameraViewer
        camera={activeCamera}
        onClose={() => setActiveCamera(null)}
        onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })}
      />


      {/* ── OVERLAYS ── */}
      <div className="vignette absolute inset-0 pointer-events-none z-[2]" />
      <div className="crt-scanlines absolute inset-0 pointer-events-none z-[3] opacity-[0.02]" />
      {/* Corner frames — using explicit classes for Tailwind JIT compatibility */}
      {[
        { pos: 'top-0 left-0', vAnchor: 'top-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-b' },
        { pos: 'top-0 right-0', vAnchor: 'top-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-b' },
        { pos: 'bottom-0 left-0', vAnchor: 'bottom-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-t' },
        { pos: 'bottom-0 right-0', vAnchor: 'bottom-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-t' },
      ].map((c, i) => (
        <div key={i} className={`absolute ${c.pos} w-16 h-16 pointer-events-none z-[1]`}>
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-full h-[1px] ${c.hGrad} from-[var(--gold-primary)]/30 to-transparent`} />
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-[1px] h-full ${c.vGrad} from-[var(--gold-primary)]/30 to-transparent`} />
        </div>
      ))}

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcuts />

      {/* ── GLOBAL STATUS TICKER (bottom) ── */}
      <GlobalStatusBar />

      {/* Shortcut hint */}
      <div className="desktop-only absolute bottom-[26px] right-5 z-[200] pointer-events-none text-[6px] font-mono text-[var(--text-muted)]/40 tracking-widest">
        [?] SHORTCUTS · [F] FULLSCREEN · [S] SHARE · [R] RESET VIEW
      </div>


    </main>
  );
}
