'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { saveToInbox } from '@/lib/workspace/map-inbox';

interface OsirisMapProps {
  data: any;
  activeLayers: Record<string, boolean>;
  onEntityClick?: (entity: any) => void;
  onMouseCoords?: (coords: { lat: number; lng: number }) => void;
  onRightClick?: (coords: { lat: number; lng: number }) => void;
  onViewStateChange?: (vs: { zoom: number; latitude: number }) => void;
  flyToLocation?: { lat: number; lng: number; ts: number } | null;
  projection?: 'mercator' | 'globe';
  mapStyle?: string;
  visualMode?: string;
  muteLabels?: boolean;
  sweepData?: any;
  scanTargets?: any[];
}

function computeSolarTerminator(): [number, number][] {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = declination * Math.PI / 180;
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLng = (12 - utcHours) * 15;
  const points: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    const lngRad = (lng - subsolarLng) * Math.PI / 180;
    const lat = Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180 / Math.PI;
    points.push([lng, lat]);
  }
  const darkSide = declination >= 0 ? -90 : 90;
  points.push([180, darkSide]);
  points.push([-180, darkSide]);
  points.push(points[0]);
  return points;
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

function OsirisMap({ data, activeLayers, onEntityClick, onMouseCoords, onRightClick, onViewStateChange, flyToLocation, projection = 'globe', mapStyle = 'dark', visualMode = 'none', muteLabels = false, sweepData, scanTargets = [] }: OsirisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const basemapLabelsRef = useRef<string[]>([]);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const prevStyleRef = useRef(mapStyle);

  // Create aircraft icon on canvas (for WebGL symbol layer)
  const createIcon = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2, cy = size / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.4);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.15);
    ctx.lineTo(cx, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.15);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.1);
    ctx.closePath();
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  const createDot = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-3.70, 40.20], zoom: 5.5, minZoom: 1.5, maxZoom: 18,
      attributionControl: false,
      maxPitch: 85,
    });

    map.on('load', () => {
      mapRef.current = map;
      if (typeof window !== 'undefined') (window as any).__osirisMap = map; // hook de depuración
      // Etiquetas del basemap vectorial (ciudades, países, mares) en español,
      // con respaldo al nombre latino y al local si no hay traducción.
      try {
        for (const layer of map.getStyle().layers) {
          if (layer.type === 'symbol' && (layer.layout as any)?.['text-field']) {
            basemapLabelsRef.current.push(layer.id); // para el "mapa mudo"
            map.setLayoutProperty(layer.id, 'text-field',
              ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']] as any);
          }
        }
      } catch (e) { console.warn('[Politeia] labels es:', e); }
      // Create icons
      createIcon(map, 'plane-cyan', '#00E5FF', 24);
      createIcon(map, 'plane-green', '#00E676', 24);
      createIcon(map, 'plane-pink', '#FF69B4', 24);
      createIcon(map, 'plane-red', '#FF3D3D', 24);
      createIcon(map, 'plane-grey', '#555555', 24);
      createDot(map, 'dot-gold', '#D4AF37', 8);
      createDot(map, 'dot-red', '#FF3D3D', 10);
      createDot(map, 'dot-orange', '#FF9500', 10);
      createDot(map, 'dot-green', '#00E676', 10);
      createDot(map, 'dot-fire', '#FF6B00', 10);
      createDot(map, 'dot-cctv', '#39FF14', 10);

      // Sources
      const sources = ['flights','military','jets','private-fl','satellites','earthquakes','gdelt','traffic-incidents','gps-jamming','day-night','cctv','fires','weather','infrastructure','power-plants','critical-infra','submarine-cables','maritime','maritime-choke','maritime-ships','live-news','sigint-news','conflict-zones', 'war-alerts-targets', 'war-alerts-lines', 'balloons', 'radiation', 'ip-sweep-devices', 'ip-sweep-pulse', 'ip-sweep-connections', 'scan-targets', 'sdk-entities', 'sdk-links', 'geo-rivers', 'geo-areas', 'geo-points', 'gdacs', 'hurricanes', 'volcanoes', 'airports', 'launches', 'iss', 'frontline', 'trains', 'railways', 'railways-hs', 'railways-commuter', 'satnogs', 'military-bases', 'air-quality', 'aurora', 'tectonics', 'sea-state', 'pipelines', 'powerlines', 'datacenters', 'oilgas', 'minerals', 'agriculture', 'countries', 'disputes', 'orgs', 'lighthouses', 'sea-lanes', 'piracy', 'war-events',
        'refineries', 'lng-terminals', 'fabs', 'nuclear-plants', 'dams', 'ixps', 'cable-landings', 'net-shutdowns', 'refugee-camps', 'mobile-coverage'];
      sources.forEach(s => map.addSource(s, { type: 'geojson', data: EMPTY_FC }));

      // ── Capas raster (imágenes de satélite) ── NASA GIBS
      const _d = new Date(Date.now() - 36 * 3600 * 1000); // ~ayer (GIBS publica con retraso)
      const gibsDate = `${_d.getUTCFullYear()}-${String(_d.getUTCMonth()+1).padStart(2,'0')}-${String(_d.getUTCDate()).padStart(2,'0')}`;
      try {
        map.addSource('gibs', { type: 'raster', tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`], tileSize: 256, attribution: 'NASA GIBS' });
        map.addLayer({ id: 'gibs-layer', type: 'raster', source: 'gibs', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.85 } });
        map.addSource('nightlights', { type: 'raster', tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'], tileSize: 256, attribution: 'NASA Black Marble' });
        map.addLayer({ id: 'nightlights-layer', type: 'raster', source: 'nightlights', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.9 } });
        // Deforestación: pérdida de cobertura arbórea (Hansen/UMD Global Forest Change, en rojo)
        map.addSource('deforestation', { type: 'raster', tiles: ['https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.12/loss_alpha/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 12, attribution: 'Hansen/UMD/Google Global Forest Change' });
        map.addLayer({ id: 'deforestation-layer', type: 'raster', source: 'deforestation', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.85 } });
      } catch { /* noop */ }

      // ── Ruta del vuelo seleccionado (al clicar un avión) ──
      // line-gradient exige lineMetrics:true en la fuente.
      map.addSource('flight-route', { type: 'geojson', lineMetrics: true, data: EMPTY_FC } as any);
      map.addSource('flight-route-pts', { type: 'geojson', data: EMPTY_FC });
      // Casing oscuro debajo, para que la línea resalte sobre cualquier fondo/puntos.
      map.addLayer({ id: 'flight-route-casing', type: 'line', source: 'flight-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': ['interpolate',['linear'],['zoom'], 2,4, 6,6, 10,8.5],
          'line-color': '#05070f', 'line-opacity': 0.55, 'line-blur': 1.2,
        }});
      // Color por feature: tramo recorrido (vívido) vs tramo restante (apagado).
      map.addLayer({ id: 'flight-route-line', type: 'line', source: 'flight-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': ['interpolate',['linear'],['zoom'], 2,2, 6,3.2, 10,4.5],
          'line-blur': 0.3,
          'line-color': ['coalesce', ['get','color'], '#00E5FF'],
        }});
      map.addLayer({ id: 'flight-route-dest', type: 'circle', source: 'flight-route-pts',
        filter: ['==',['get','kind'],'dest'],
        paint: { 'circle-radius': 5, 'circle-color': 'rgba(255,255,255,0.25)', 'circle-stroke-width': 1.5, 'circle-stroke-color': 'rgba(255,255,255,0.55)' }});
      map.addLayer({ id: 'flight-route-origin', type: 'circle', source: 'flight-route-pts',
        filter: ['==',['get','kind'],'origin'],
        paint: { 'circle-radius': 6, 'circle-color': '#00E5FF', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }});
      map.addLayer({ id: 'flight-route-label', type: 'symbol', source: 'flight-route-pts', minzoom: 3,
        layout: { 'text-field': ['get','label'], 'text-size': 10, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-allow-overlap': false },
        paint: { 'text-color': '#E8E6E0', 'text-halo-color': '#000', 'text-halo-width': 1.2 }});

      // ── Accidentes geográficos (ríos, áreas sombreadas, picos puntuales) ──
      // 1) Áreas sombreadas (polígonos): cordilleras, desiertos y otros relieves.
      //    Se dibujan PRIMERO para que queden por debajo de ríos y puntos.
      const geoRangeFilter: any = ['==', ['get','cat'], 'range'];
      const geoDesertAreaFilter: any = ['==', ['get','cat'], 'desert'];
      const geoOtherAreaFilter: any = ['in', ['get','cat'], ['literal', ['upland','lowland','wetland','land','tundra']]];
      // Cordilleras — marrón
      map.addLayer({ id: 'geo-range-fill', type: 'fill', source: 'geo-areas', filter: geoRangeFilter, paint: {
        'fill-color': '#8D6E63', 'fill-opacity': 0.20,
      }});
      map.addLayer({ id: 'geo-range-outline', type: 'line', source: 'geo-areas', filter: geoRangeFilter, paint: {
        'line-color': '#6D4C41', 'line-opacity': 0.55, 'line-width': ['interpolate',['linear'],['zoom'], 2,0.6, 6,1.4],
      }});
      // Desiertos — arena
      map.addLayer({ id: 'geo-desert-fill', type: 'fill', source: 'geo-areas', filter: geoDesertAreaFilter, paint: {
        'fill-color': '#E0A82E', 'fill-opacity': 0.22,
      }});
      map.addLayer({ id: 'geo-desert-outline', type: 'line', source: 'geo-areas', filter: geoDesertAreaFilter, paint: {
        'line-color': '#B5851E', 'line-opacity': 0.5, 'line-width': ['interpolate',['linear'],['zoom'], 2,0.6, 6,1.4],
      }});
      // Otros relieves (mesetas, cuencas, llanuras, humedales, tundra) — turquesa
      map.addLayer({ id: 'geo-other-fill', type: 'fill', source: 'geo-areas', filter: geoOtherAreaFilter, paint: {
        'fill-color': '#26A69A', 'fill-opacity': 0.16,
      }});
      map.addLayer({ id: 'geo-other-outline', type: 'line', source: 'geo-areas', filter: geoOtherAreaFilter, paint: {
        'line-color': '#00796B', 'line-opacity': 0.5, 'line-width': ['interpolate',['linear'],['zoom'], 2,0.5, 6,1.2],
      }});
      // Etiquetas de las áreas (en el centroide del polígono)
      map.addLayer({ id: 'geo-range-label', type: 'symbol', source: 'geo-areas', filter: geoRangeFilter, minzoom: 2, layout: {
        'text-field': ['get','name'], 'text-size': ['interpolate',['linear'],['zoom'], 2,9, 6,13], 'text-font': ['Open Sans Italic'], 'text-letter-spacing': 0.04, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#D7CCC8', 'text-halo-color': '#2A1A12', 'text-halo-width': 1.2 }});
      map.addLayer({ id: 'geo-desert-label', type: 'symbol', source: 'geo-areas', filter: geoDesertAreaFilter, minzoom: 2, layout: {
        'text-field': ['get','name'], 'text-size': ['interpolate',['linear'],['zoom'], 2,10, 6,14], 'text-font': ['Open Sans Italic'], 'text-letter-spacing': 0.06, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#F0C765', 'text-halo-color': '#3A2A0A', 'text-halo-width': 1.2 }});
      map.addLayer({ id: 'geo-other-label', type: 'symbol', source: 'geo-areas', filter: geoOtherAreaFilter, minzoom: 3, layout: {
        'text-field': ['get','name'], 'text-size': ['interpolate',['linear'],['zoom'], 3,9, 6,12], 'text-font': ['Open Sans Italic'], 'text-allow-overlap': false,
      }, paint: { 'text-color': '#80CBC4', 'text-halo-color': '#06201D', 'text-halo-width': 1.2 }});

      // 2) Ríos (líneas)
      map.addLayer({ id: 'geo-rivers-line', type: 'line', source: 'geo-rivers', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': '#29B6F6', 'line-opacity': 0.55,
        'line-width': ['interpolate',['linear'],['zoom'], 2,0.5, 5,1.2, 9,2.4],
      }});
      map.addLayer({ id: 'geo-rivers-label', type: 'symbol', source: 'geo-rivers', minzoom: 5, layout: {
        'symbol-placement': 'line', 'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Italic'], 'text-letter-spacing': 0.05,
      }, paint: { 'text-color': '#4FC3F7', 'text-halo-color': '#001018', 'text-halo-width': 1.2 }});
      // 3) Puntos individuales: picos (con geo_mountains) y cascadas/otros puntuales (con geo_features)
      const geoPeakFilter: any = ['==', ['get','cat'], 'peak'];
      const geoOtherFilter: any = ['in', ['get','cat'], ['literal', ['waterfall','feature']]];
      map.addLayer({ id: 'geo-mountains', type: 'circle', source: 'geo-points', filter: geoPeakFilter, paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,2.2, 6,4, 10,6],
        'circle-color': '#A1887F', 'circle-opacity': 0.85, 'circle-stroke-width': 1, 'circle-stroke-color': '#3E2723',
      }});
      map.addLayer({ id: 'geo-mountains-label', type: 'symbol', source: 'geo-points', filter: geoPeakFilter, minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#D7CCC8', 'text-halo-color': '#000', 'text-halo-width': 1.1 }});
      map.addLayer({ id: 'geo-features', type: 'circle', source: 'geo-points', filter: geoOtherFilter, paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,2.4, 6,4, 10,6],
        'circle-color': '#26A69A', 'circle-opacity': 0.8, 'circle-stroke-width': 1, 'circle-stroke-color': '#10403B',
      }});
      map.addLayer({ id: 'geo-features-label', type: 'symbol', source: 'geo-points', filter: geoOtherFilter, minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#80CBC4', 'text-halo-color': '#000', 'text-halo-width': 1.1 }});

      // ── Red ferroviaria mundial — separada por tipo de servicio ──
      // 1) Regular / convencional (Natural Earth) — ámbar brillante, debajo
      map.addLayer({ id: 'railways-line', type: 'line', source: 'railways',
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-color': '#FFC23C',
          'line-opacity': ['interpolate',['linear'],['zoom'], 2,0.6, 5,0.8, 9,0.95],
          'line-width': ['interpolate',['linear'],['zoom'], 2,0.5, 6,1.3, 10,2.2],
        }});
      // 2) Cercanías / suburbano (OSM) — verde, encima de la regular
      map.addLayer({ id: 'railways-commuter-line', type: 'line', source: 'railways-commuter',
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-color': '#34C759',
          'line-opacity': ['interpolate',['linear'],['zoom'], 2,0.5, 6,0.75, 10,0.9],
          'line-width': ['interpolate',['linear'],['zoom'], 2,0.6, 6,1.4, 10,2.4],
        }});
      // 3) Alta velocidad (OSM) — rojo, la más destacada, encima del todo
      map.addLayer({ id: 'railways-hs-line', type: 'line', source: 'railways-hs',
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-color': '#FF3B30',
          'line-opacity': ['interpolate',['linear'],['zoom'], 2,0.7, 6,0.9, 10,1],
          'line-width': ['interpolate',['linear'],['zoom'], 2,0.8, 6,1.8, 10,3],
        }});

      // ── Geopolítica: bloques militares y sanciones (coloreado de países) ──
      const allianceColor: any = ['match', ['get','alliance'], 'OTAN','#1565C0', 'OTSC','#C62828', 'Aliado EE.UU.','#00ACC1', 'rgba(0,0,0,0)'];
      map.addLayer({ id: 'alliances-fill', type: 'fill', source: 'countries',
        layout: { visibility: 'none' }, paint: { 'fill-color': allianceColor, 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'alliances-outline', type: 'line', source: 'countries', filter: ['!=', ['get','alliance'], ''],
        layout: { visibility: 'none' }, paint: { 'line-color': allianceColor, 'line-opacity': 0.7, 'line-width': 0.8 } });
      map.addLayer({ id: 'sanctions-fill', type: 'fill', source: 'countries', filter: ['==', ['get','sanctioned'], 1],
        layout: { visibility: 'none' }, paint: { 'fill-color': '#EF5350', 'fill-opacity': 0.35 } });
      // Gasto militar (coropleta por tramos, miles de millones USD)
      const spendColor: any = ['step', ['to-number', ['coalesce', ['get','spend'], -1]], 'rgba(0,0,0,0)', 0, '#9FA8DA', 3, '#5C6BC0', 10, '#3949AB', 30, '#283593', 100, '#FF8F00', 300, '#E65100'];
      map.addLayer({ id: 'milspend-fill', type: 'fill', source: 'countries', layout: { visibility: 'none' }, paint: { 'fill-color': spendColor, 'fill-opacity': 0.45 } });
      // Régimen político (coropleta por categoría)
      const regimeColor: any = ['match', ['get','regime'], 'democracia', '#2E7D32', 'imperfecta', '#9CCC65', 'hibrido', '#FFA726', 'autoritario', '#EF5350', 'rgba(0,0,0,0)'];
      map.addLayer({ id: 'regime-fill', type: 'fill', source: 'countries', layout: { visibility: 'none' }, paint: { 'fill-color': regimeColor, 'fill-opacity': 0.4 } });
      // Armas nucleares (estados nucleares + nº de ojivas en el centroide)
      map.addLayer({ id: 'nukes-fill', type: 'fill', source: 'countries', filter: ['>', ['to-number', ['coalesce', ['get','nukes'], 0]], 0], layout: { visibility: 'none' }, paint: { 'fill-color': '#D32F2F', 'fill-opacity': 0.4 } });
      map.addLayer({ id: 'nukes-label', type: 'symbol', source: 'countries', filter: ['>', ['to-number', ['coalesce', ['get','nukes'], 0]], 0], layout: {
        'text-field': ['concat', '☢ ', ['to-string', ['get','nukes']]], 'text-size': ['interpolate',['linear'],['zoom'], 1,10, 4,14], 'text-font': ['Open Sans Bold'], 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFCDD2', 'text-halo-color': '#3a0000', 'text-halo-width': 1.5 } });

      // ── Política e índices (coropletas sobre países) ──
      // Calendario electoral (próxima elección nacional, color por año)
      const electionColor: any = ['match', ['get','election_year'], 2026,'#EF5350', 2027,'#FFA726', 2028,'#42A5F5', 'rgba(0,0,0,0)'];
      map.addLayer({ id: 'election-fill', type: 'fill', source: 'countries', layout: { visibility: 'none' }, paint: { 'fill-color': electionColor, 'fill-opacity': 0.5 } });
      // Libertad de prensa (RSF, 1=buena … 5=muy grave)
      const pressColor: any = ['match', ['get','press'], 1,'#2E7D32', 2,'#9CCC65', 3,'#FFEE58', 4,'#FFA726', 5,'#EF5350', 'rgba(0,0,0,0)'];
      map.addLayer({ id: 'press-fill', type: 'fill', source: 'countries', layout: { visibility: 'none' }, paint: { 'fill-color': pressColor, 'fill-opacity': 0.45 } });
      // Corrupción (CPI 0-100, mayor = menos corrupto)
      const cpiColor: any = ['step', ['to-number', ['coalesce', ['get','cpi'], -1]], 'rgba(0,0,0,0)', 0,'#B71C1C', 30,'#EF5350', 45,'#FFA726', 60,'#9CCC65', 75,'#2E7D32'];
      map.addLayer({ id: 'cpi-fill', type: 'fill', source: 'countries', layout: { visibility: 'none' }, paint: { 'fill-color': cpiColor, 'fill-opacity': 0.45 } });
      // Índice de Desarrollo Humano
      const hdiColor: any = ['step', ['to-number', ['coalesce', ['get','hdi'], -1]], 'rgba(0,0,0,0)', 0,'#B71C1C', 0.55,'#FFA726', 0.7,'#FFEE58', 0.8,'#9CCC65', 0.9,'#2E7D32'];
      map.addLayer({ id: 'hdi-fill', type: 'fill', source: 'countries', layout: { visibility: 'none' }, paint: { 'fill-color': hdiColor, 'fill-opacity': 0.45 } });
      // PIB per cápita (USD)
      const gdpColor: any = ['step', ['to-number', ['coalesce', ['get','gdppc'], -1]], 'rgba(0,0,0,0)', 0,'#311B92', 2000,'#5E35B1', 10000,'#7E57C2', 30000,'#26A69A', 60000,'#00E5FF'];
      map.addLayer({ id: 'gdp-fill', type: 'fill', source: 'countries', layout: { visibility: 'none' }, paint: { 'fill-color': gdpColor, 'fill-opacity': 0.45 } });
      // Bloques económicos (color por bloque primario)
      const blocColor: any = ['match', ['get','bloc'], 'BRICS','#E53935', 'UE','#1565C0', 'G7','#5E35B1', 'ASEAN','#00897B', 'Mercosur','#43A047', 'OPEP','#FB8C00', 'rgba(0,0,0,0)'];
      map.addLayer({ id: 'blocs-fill', type: 'fill', source: 'countries', layout: { visibility: 'none' }, paint: { 'fill-color': blocColor, 'fill-opacity': 0.45 } });

      // ── Agricultura: regiones de cultivo (áreas sombreadas por cultivo) ──
      map.addLayer({ id: 'agriculture-fill', type: 'fill', source: 'agriculture',
        layout: { visibility: 'none' }, paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#9CCC65'], 'fill-opacity': 0.3,
        }});
      map.addLayer({ id: 'agriculture-outline', type: 'line', source: 'agriculture',
        layout: { visibility: 'none' }, paint: {
          'line-color': ['coalesce', ['get', 'color'], '#9CCC65'], 'line-opacity': 0.6,
          'line-width': ['interpolate',['linear'],['zoom'], 2,0.5, 6,1.2],
        }});
      map.addLayer({ id: 'agriculture-label', type: 'symbol', source: 'agriculture', minzoom: 3,
        layout: { 'text-field': ['get', 'crop'], 'text-size': ['interpolate',['linear'],['zoom'], 3,9, 6,12], 'text-font': ['Open Sans Bold'], 'text-transform': 'uppercase', 'text-letter-spacing': 0.05, 'text-allow-overlap': false },
        paint: { 'text-color': ['coalesce', ['get', 'color'], '#9CCC65'], 'text-halo-color': '#06140a', 'text-halo-width': 1.4 }});

      // ── Cobertura/rendimiento móvil (Ookla, teselas z9 coloreadas por velocidad) ──
      map.addLayer({ id: 'mobile-coverage-fill', type: 'fill', source: 'mobile-coverage',
        layout: { visibility: 'none' }, paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#FDD835'], 'fill-opacity': 0.55,
        }});

      // ── Placas tectónicas (líneas de borde de placa) ──
      map.addLayer({ id: 'tectonics-line', type: 'line', source: 'tectonics',
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-color': '#FF7043', 'line-dasharray': [2, 1.5],
          'line-opacity': ['interpolate',['linear'],['zoom'], 1,0.6, 5,0.85],
          'line-width': ['interpolate',['linear'],['zoom'], 1,0.8, 5,1.6, 9,2.6],
        }});

      // ── Estado del mar (altura de ola) — puntos oceánicos por color ──
      map.addLayer({ id: 'sea-state-dots', type: 'circle', source: 'sea-state',
        layout: { visibility: 'none' }, paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 4,4, 8,7, 11,10],
          'circle-color': ['coalesce', ['get','color'], '#26C6DA'],
          'circle-opacity': 0.65, 'circle-blur': 0.3,
          'circle-stroke-width': 0.6, 'circle-stroke-color': 'rgba(255,255,255,0.35)',
        }});

      // ── Auroras (probabilidad OVATION) — mancha verde en latitudes altas ──
      map.addLayer({ id: 'aurora-heat', type: 'heatmap', source: 'aurora',
        layout: { visibility: 'none' }, paint: {
          'heatmap-weight': ['interpolate',['linear'],['get','p'], 8,0.1, 100,1],
          'heatmap-intensity': ['interpolate',['linear'],['zoom'], 1,0.6, 5,1.4],
          'heatmap-radius': ['interpolate',['linear'],['zoom'], 1,8, 4,22, 7,40],
          'heatmap-opacity': 0.7,
          'heatmap-color': ['interpolate',['linear'],['heatmap-density'],
            0,'rgba(0,0,0,0)', 0.2,'rgba(0,120,60,0.4)', 0.5,'rgba(0,230,118,0.7)', 0.8,'rgba(118,255,3,0.85)', 1,'rgba(204,255,144,0.95)'],
        }});

      // ── Lote Energía y Recursos ──
      // Red eléctrica de alta tensión (OSM) — líneas amarillas
      map.addLayer({ id: 'powerlines-line', type: 'line', source: 'powerlines',
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-color': '#FFD600',
          'line-opacity': ['interpolate',['linear'],['zoom'], 2,0.4, 6,0.7, 10,0.9],
          'line-width': ['interpolate',['linear'],['zoom'], 2,0.4, 6,1, 10,1.8],
        }});
      // Oleoductos / gasoductos (OSM) — color por sustancia
      map.addLayer({ id: 'pipelines-line', type: 'line', source: 'pipelines',
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-color': ['match', ['get','k'], 'gas','#42A5F5', /* oil */ '#8D6E63'],
          'line-opacity': ['interpolate',['linear'],['zoom'], 2,0.5, 6,0.8, 10,0.95],
          'line-width': ['interpolate',['linear'],['zoom'], 2,0.5, 6,1.2, 10,2.2],
          'line-dasharray': [4, 2],
        }});
      // Centros de datos (OSM) — puntos cian
      map.addLayer({ id: 'datacenters-dots', type: 'circle', source: 'datacenters',
        layout: { visibility: 'none' }, paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'], 2,2.2, 6,4, 10,6],
          'circle-color': '#00E5FF', 'circle-opacity': 0.85, 'circle-stroke-width': 1, 'circle-stroke-color': '#003844',
        }});
      // Campos de petróleo y gas (curado) — color por tipo
      map.addLayer({ id: 'oilgas-dots', type: 'circle', source: 'oilgas',
        layout: { visibility: 'none' }, paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'], 1,3.5, 5,6, 9,9],
          'circle-color': ['coalesce', ['get','color'], '#8D6E63'], 'circle-opacity': 0.85,
          'circle-stroke-width': 1.2, 'circle-stroke-color': 'rgba(0,0,0,0.4)',
        }});
      map.addLayer({ id: 'oilgas-label', type: 'symbol', source: 'oilgas', minzoom: 4, filter: ['==', ['get','major'], 1], layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#D7CCC8', 'text-halo-color': '#000', 'text-halo-width': 1 }});
      // Minerales críticos (curado) — color por materia prima
      map.addLayer({ id: 'minerals-dots', type: 'circle', source: 'minerals',
        layout: { visibility: 'none' }, paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'], 1,3.5, 5,6, 9,9],
          'circle-color': ['coalesce', ['get','color'], '#26A69A'], 'circle-opacity': 0.85,
          'circle-stroke-width': 1.2, 'circle-stroke-color': 'rgba(0,0,0,0.4)',
        }});
      map.addLayer({ id: 'minerals-label', type: 'symbol', source: 'minerals', minzoom: 4, filter: ['==', ['get','major'], 1], layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#B2DFDB', 'text-halo-color': '#000', 'text-halo-width': 1 }});
      // Disputas territoriales — rombos rojos
      map.addLayer({ id: 'disputes-dots', type: 'circle', source: 'disputes',
        layout: { visibility: 'none' }, paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,7, 9,10],
          'circle-color': '#FF1744', 'circle-opacity': 0.75, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff',
        }});
      map.addLayer({ id: 'disputes-label', type: 'symbol', source: 'disputes', minzoom: 3, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Bold'], 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF8A80', 'text-halo-color': '#000', 'text-halo-width': 1.3 }});
      // Organismos internacionales — puntos azules
      map.addLayer({ id: 'orgs-dots', type: 'circle', source: 'orgs',
        layout: { visibility: 'none' }, paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5.5, 9,8],
          'circle-color': '#448AFF', 'circle-opacity': 0.85, 'circle-stroke-width': 1.2, 'circle-stroke-color': '#0D1B3E',
        }});
      map.addLayer({ id: 'orgs-label', type: 'symbol', source: 'orgs', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#82B1FF', 'text-halo-color': '#000', 'text-halo-width': 1.1 }});

      // ── Lote Espacio y Marítimo ──
      // Rutas comerciales marítimas — líneas cian discontinuas
      map.addLayer({ id: 'sea-lanes-line', type: 'line', source: 'sea-lanes',
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: { 'line-color': '#26C6DA', 'line-opacity': 0.6, 'line-dasharray': [3, 2],
          'line-width': ['interpolate',['linear'],['zoom'], 2,1, 6,2, 10,3] }});
      // Faros — puntos amarillos
      map.addLayer({ id: 'lighthouses-dots', type: 'circle', source: 'lighthouses',
        layout: { visibility: 'none' }, paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'], 3,1.8, 7,3.5, 11,5.5],
          'circle-color': '#FFEE58', 'circle-opacity': 0.85, 'circle-stroke-width': 0.8, 'circle-stroke-color': '#5D4E00',
        }});
      // Piratería — zonas de riesgo (glow + punto)
      map.addLayer({ id: 'piracy-glow', type: 'circle', source: 'piracy', layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,14, 6,30], 'circle-color': ['coalesce',['get','color'],'#EF5350'], 'circle-opacity': 0.16, 'circle-blur': 0.8 }});
      map.addLayer({ id: 'piracy-dots', type: 'circle', source: 'piracy', layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,5, 6,9], 'circle-color': ['coalesce',['get','color'],'#EF5350'], 'circle-opacity': 0.8, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' }});
      map.addLayer({ id: 'piracy-label', type: 'symbol', source: 'piracy', minzoom: 2, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Bold'], 'text-offset': [0,1.3], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFAB91', 'text-halo-color': '#000', 'text-halo-width': 1.3 }});

      // ── GDACS (alertas de desastres) — color por nivel de alerta ──
      const gdacsColor: any = ['match', ['get','alert'], 'Red','#EF5350', 'Orange','#FFA726', /* Green */ '#66BB6A'];
      map.addLayer({ id: 'gdacs-glow', type: 'circle', source: 'gdacs', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,8, 6,16], 'circle-color': gdacsColor, 'circle-opacity': 0.18, 'circle-blur': 0.7,
      }});
      map.addLayer({ id: 'gdacs-dots', type: 'circle', source: 'gdacs', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,3.5, 6,6], 'circle-color': gdacsColor, 'circle-opacity': 0.9, 'circle-stroke-width': 1, 'circle-stroke-color': '#000',
      }});
      map.addLayer({ id: 'gdacs-label', type: 'symbol', source: 'gdacs', minzoom: 3, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#E8E6E0', 'text-halo-color': '#000', 'text-halo-width': 1.2 }});

      // ── Ciclones tropicales (NHC) ──
      map.addLayer({ id: 'hurricane-glow', type: 'circle', source: 'hurricanes', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,14, 6,40], 'circle-color': '#26C6DA', 'circle-opacity': 0.16, 'circle-blur': 0.8,
      }});
      map.addLayer({ id: 'hurricane-dots', type: 'circle', source: 'hurricanes', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,5, 6,9], 'circle-color': '#26C6DA', 'circle-opacity': 0.95, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff',
      }});
      map.addLayer({ id: 'hurricane-label', type: 'symbol', source: 'hurricanes', minzoom: 2, layout: {
        'text-field': ['get','name'], 'text-size': 11, 'text-font': ['Open Sans Bold'], 'text-offset': [0,1.3], 'text-anchor': 'top',
      }, paint: { 'text-color': '#26C6DA', 'text-halo-color': '#000', 'text-halo-width': 1.3 }});

      // ── Volcanes ──
      map.addLayer({ id: 'volcanoes-dots', type: 'circle', source: 'volcanoes', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,2.4, 6,4.5, 10,7], 'circle-color': '#FF7043', 'circle-opacity': 0.9, 'circle-stroke-width': 1, 'circle-stroke-color': '#4E0F00',
      }});
      map.addLayer({ id: 'volcanoes-label', type: 'symbol', source: 'volcanoes', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFAB91', 'text-halo-color': '#000', 'text-halo-width': 1.1 }});

      // ── Aeropuertos (grandes más brillantes que medianos) ──
      map.addLayer({ id: 'airports-dots', type: 'circle', source: 'airports', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 3, ['case',['==',['get','type'],'large'],3,1.6], 7, ['case',['==',['get','type'],'large'],5,3], 11,7],
        'circle-color': ['case',['==',['get','type'],'large'],'#42A5F5','#5C8AB0'], 'circle-opacity': 0.85, 'circle-stroke-width': 0.6, 'circle-stroke-color': '#0A2030',
      }});
      map.addLayer({ id: 'airports-label', type: 'symbol', source: 'airports', minzoom: 6, layout: {
        'text-field': ['get','iata'], 'text-size': 10, 'text-font': ['Open Sans Bold'], 'text-offset': [0,1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#90CAF9', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // ── Lanzamientos espaciales ──
      map.addLayer({ id: 'launches-dots', type: 'circle', source: 'launches', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,4, 6,7], 'circle-color': '#FFD54F', 'circle-opacity': 0.95, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#000',
      }});
      map.addLayer({ id: 'launches-label', type: 'symbol', source: 'launches', minzoom: 3, layout: {
        'text-field': ['get','location'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFE082', 'text-halo-color': '#000', 'text-halo-width': 1.1 }});

      // ── ISS (punto único) ──
      map.addLayer({ id: 'iss-glow', type: 'circle', source: 'iss', paint: {
        'circle-radius': 16, 'circle-color': '#FFFFFF', 'circle-opacity': 0.15, 'circle-blur': 0.8,
      }});
      map.addLayer({ id: 'iss-dot', type: 'circle', source: 'iss', paint: {
        'circle-radius': 6, 'circle-color': '#FFFFFF', 'circle-opacity': 1, 'circle-stroke-width': 2, 'circle-stroke-color': '#00E5FF',
      }});
      map.addLayer({ id: 'iss-label', type: 'symbol', source: 'iss', layout: {
        'text-field': 'ISS', 'text-size': 11, 'text-font': ['Open Sans Bold'], 'text-offset': [0,1.3], 'text-anchor': 'top', 'text-allow-overlap': true,
      }, paint: { 'text-color': '#fff', 'text-halo-color': '#00E5FF', 'text-halo-width': 1.2 }});

      // ── Frente de Ucrania (DeepState) — territorio ocupado/contestado ──
      map.addLayer({ id: 'frontline-fill', type: 'fill', source: 'frontline', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['coalesce', ['get', 'color'], '#FF1744'], 'fill-opacity': 0.32 } });
      map.addLayer({ id: 'frontline-line', type: 'line', source: 'frontline', paint: { 'line-color': ['coalesce', ['get', 'color'], '#FF1744'], 'line-width': 1.4, 'line-opacity': 0.85 } });

      // ── Trenes en directo (FI / IE / US) — color por país ──
      const trainColor: any = ['match', ['get','country'], 'FI','#4FC3F7', 'IE','#66BB6A', 'US','#FF7043', /* otros */ '#FFCA28'];
      map.addLayer({ id: 'trains-dots', type: 'circle', source: 'trains', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 4,2.2, 8,4, 12,6], 'circle-color': trainColor, 'circle-opacity': 0.9, 'circle-stroke-width': 1, 'circle-stroke-color': '#1a1208',
      }});
      map.addLayer({ id: 'trains-label', type: 'symbol', source: 'trains', minzoom: 7, layout: {
        'text-field': ['concat', '#', ['to-string', ['get','number']]], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFE082', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // ── Estaciones SatNOGS ──
      map.addLayer({ id: 'satnogs-dots', type: 'circle', source: 'satnogs', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,2.2, 6,4, 10,6], 'circle-color': '#AB47BC', 'circle-opacity': 0.85, 'circle-stroke-width': 1, 'circle-stroke-color': '#2A0A33',
      }});
      map.addLayer({ id: 'satnogs-label', type: 'symbol', source: 'satnogs', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#CE93D8', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // ── Bases militares ──
      map.addLayer({ id: 'milbase-dots', type: 'circle', source: 'military-bases', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 3,1.8, 7,3.5, 11,6], 'circle-color': '#EF5350', 'circle-opacity': 0.8, 'circle-stroke-width': 0.6, 'circle-stroke-color': '#3A0000',
      }});
      map.addLayer({ id: 'milbase-label', type: 'symbol', source: 'military-bases', minzoom: 7, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#EF9A9A', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // ── Calidad del aire (color por nivel AQI) ──
      map.addLayer({ id: 'aq-glow', type: 'circle', source: 'air-quality', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,10, 6,22], 'circle-color': ['get','color'], 'circle-opacity': 0.16, 'circle-blur': 0.7,
      }});
      map.addLayer({ id: 'aq-dots', type: 'circle', source: 'air-quality', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,4, 6,7], 'circle-color': ['get','color'], 'circle-opacity': 0.95, 'circle-stroke-width': 1, 'circle-stroke-color': '#000',
      }});
      map.addLayer({ id: 'aq-label', type: 'symbol', source: 'air-quality', minzoom: 3, layout: {
        'text-field': ['concat', ['get','name'], ' ', ['to-string', ['get','aqi']]], 'text-size': 9, 'text-font': ['Open Sans Bold'], 'text-offset': [0,1.1], 'text-anchor': 'top', 'text-allow-overlap': false,
      }, paint: { 'text-color': '#E8E6E0', 'text-halo-color': '#000', 'text-halo-width': 1.2 }});

      // Warning icon generator (parameterized — eliminates 3x copy-paste)
      const createWarningIcon = (id: string, color: string) => {
        const s = 20;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(s/2, 1);
        ctx.lineTo(s - 1, s - 1);
        ctx.lineTo(1, s - 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', s/2, s - 4);
        map.addImage(id, { width: s, height: s, data: new Uint8Array(ctx.getImageData(0, 0, s, s).data) });
      };
      createWarningIcon('warn-icon', '#FF1744');
      createWarningIcon('warn-orange', '#FF9500');
      createWarningIcon('warn-yellow', '#FFD500');

      map.addLayer({ id: 'conflict-icons', type: 'symbol', source: 'conflict-zones', layout: {
        'icon-image': ['match', ['get','severity'], 'war','warn-icon', 'high','warn-orange', 'warn-yellow'],
        'icon-size': ['interpolate',['linear'],['zoom'], 1,0.6, 4,0.8, 8,1],
        'icon-allow-overlap': true,
        'text-field': ['get','label'],
        'text-size': ['interpolate',['linear'],['zoom'], 1,7, 4,9, 8,11],
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.4],
        'text-allow-overlap': false,
      }, paint: {
        'text-color': ['match', ['get','severity'], 'war','#FF1744', 'high','#FF9500', '#FFD500'],
        'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9,
      }});

      // ── Sucesos de guerra (georreferenciados, color por guerra) ──
      map.addLayer({ id: 'war-events-glow', type: 'circle', source: 'war-events', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 4,9, 8,16],
        'circle-color': ['coalesce',['get','color'],'#FF1744'],
        'circle-opacity': 0.18, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'war-events-dots', type: 'circle', source: 'war-events', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 4,5, 8,8],
        'circle-color': ['coalesce',['get','color'],'#FF1744'],
        'circle-stroke-color': '#0C0E1A', 'circle-stroke-width': 1.5,
        'circle-opacity': 0.95,
      }});
      map.addLayer({ id: 'war-events-label', type: 'symbol', source: 'war-events', minzoom: 4, layout: {
        'text-field': ['get','title'],
        'text-size': ['interpolate',['linear'],['zoom'], 4,8.5, 7,11, 10,13],
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.3], 'text-anchor': 'top',
        'text-allow-overlap': false, 'text-optional': true, 'text-max-width': 9,
      }, paint: {
        'text-color': ['coalesce',['get','color'],'#FF1744'],
        'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.95,
      }});

      // ── Industria estratégica + infraestructura digital + humanitario (puntos) ──
      // Helper: capa de puntos (círculo) + etiqueta, oculta por defecto
      const addPointLayer = (id: string, src: string, color: any, radius: any, labelMinZoom = 4) => {
        map.addLayer({ id: `${id}-dots`, type: 'circle', source: src, layout: { visibility: 'none' }, paint: {
          'circle-radius': radius, 'circle-color': color,
          'circle-stroke-color': '#0C0E1A', 'circle-stroke-width': 1.2, 'circle-opacity': 0.9,
        }});
        map.addLayer({ id: `${id}-label`, type: 'symbol', source: src, minzoom: labelMinZoom, layout: { visibility: 'none',
          'text-field': ['get','name'], 'text-size': ['interpolate',['linear'],['zoom'], 4,8.5, 8,11],
          'text-font': ['Open Sans Bold'], 'text-offset': [0, 1.2], 'text-anchor': 'top',
          'text-allow-overlap': false, 'text-optional': true, 'text-max-width': 9,
        }, paint: { 'text-color': color, 'text-halo-color': '#000', 'text-halo-width': 1.4, 'text-opacity': 0.92 } });
      };
      const zr = (a: number, b: number) => ['interpolate',['linear'],['zoom'], 2,a, 8,b] as any;
      addPointLayer('refineries', 'refineries', '#A1887F', ['interpolate',['linear'],['to-number',['coalesce',['get','capacity_kbd'],200]], 100,3, 700,8, 1400,13]);
      addPointLayer('lng', 'lng-terminals', ['match',['get','kind'],'exportación','#FF7043','importación','#42A5F5','#90CAF9'], zr(4,7));
      addPointLayer('fabs', 'fabs', '#00E5FF', zr(4,7));
      addPointLayer('nuclear-plants', 'nuclear-plants', '#FFD600', ['interpolate',['linear'],['to-number',['coalesce',['get','mw'],2000]], 1500,4, 5000,8, 8000,12]);
      addPointLayer('dams', 'dams', '#4FC3F7', ['interpolate',['linear'],['to-number',['coalesce',['get','mw'],2000]], 2000,4, 8000,8, 22000,13]);
      addPointLayer('ixps', 'ixps', '#AB47BC', ['interpolate',['linear'],['to-number',['coalesce',['get','peak_tbps'],1]], 0.5,3.5, 8,8, 25,13]);
      addPointLayer('cable-landings', 'cable-landings', '#26C6DA', zr(3.5,6.5));
      addPointLayer('net-shutdowns', 'net-shutdowns', ['match',['get','cause'],'guerra','#EF5350','elecciones','#AB47BC','protesta','#FF9800','exámenes','#42A5F5','#90A4AE'], zr(4,7.5));
      addPointLayer('refugee-camps', 'refugee-camps', '#FF9800', ['interpolate',['linear'],['to-number',['coalesce',['get','population'],20000]], 10000,4, 200000,10, 1000000,16]);

      // Day/Night
      map.addLayer({ id: 'day-night-fill', type: 'fill', source: 'day-night', paint: { 'fill-color': '#000022', 'fill-opacity': 0.35 }});

      // Earthquakes
      map.addLayer({ id: 'eq-circles', type: 'circle', source: 'earthquakes', paint: {
        'circle-radius': ['interpolate',['linear'],['get','magnitude'], 2.5,4, 5,12, 7,24],
        'circle-color': ['interpolate',['linear'],['get','magnitude'], 2.5,'#FFD700', 4,'#FF9500', 6,'#FF1744'],
        'circle-opacity': 0.6, 'circle-blur': 0.3, 'circle-stroke-width': 1, 'circle-stroke-color': '#FFD700', 'circle-stroke-opacity': 0.3,
      }});
      map.addLayer({ id: 'eq-label', type: 'symbol', source: 'earthquakes', filter: ['>=',['get','magnitude'],4.5], layout: {
        'text-field': ['concat','M',['to-string',['get','magnitude']]], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1.5],
      }, paint: { 'text-color': '#FFD700', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Fires
      map.addLayer({ id: 'fires-heat', type: 'circle', source: 'fires', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,8],
        'circle-color': '#FF6B00', 'circle-opacity': 0.5, 'circle-blur': 0.5,
      }});

      // CCTV — outer glow ring
      map.addLayer({ id: 'cctv-glow', type: 'circle', source: 'cctv', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14, 14,20],
        'circle-color': '#39FF14', 'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      // CCTV — main dot
      map.addLayer({ id: 'cctv-dots', type: 'circle', source: 'cctv', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8, 14,12],
        'circle-color': '#39FF14', 'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#39FF14', 'circle-stroke-opacity': 0.5,
      }});
      // CCTV — labels at zoom 10+
      map.addLayer({ id: 'cctv-label', type: 'symbol', source: 'cctv', minzoom: 10, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#39FF14', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // GDELT
      map.addLayer({ id: 'gdelt-dots', type: 'circle', source: 'gdelt', paint: {
        'circle-radius': 4, 'circle-color': '#FF3D3D', 'circle-opacity': 0.5, 'circle-stroke-width': 1, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.3,
      }});

      // Incidencias de tráfico DGT (color por tipo)
      map.addLayer({ id: 'traffic-dots', type: 'circle', source: 'traffic-incidents', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 10, 6],
        'circle-color': ['match', ['get', 'kind'],
          'Accidente', '#E53935',
          'Retención', '#FB8C00',
          'Obstrucción', '#FB8C00',
          '#FFB300'],
        'circle-opacity': 0.85, 'circle-stroke-width': 1, 'circle-stroke-color': '#1d1d1f', 'circle-stroke-opacity': 0.35,
      }});

      // GPS Jamming
      map.addLayer({ id: 'jam-fill', type: 'circle', source: 'gps-jamming', paint: { 'circle-radius': 30, 'circle-color': '#FF0000', 'circle-opacity': 0.15, 'circle-blur': 1 }});
      map.addLayer({ id: 'jam-label', type: 'symbol', source: 'gps-jamming', layout: {
        'text-field': ['concat','GPS JAM ',['to-string',['get','severity']],'%'], 'text-size': 10, 'text-font': ['Open Sans Bold'], 'text-allow-overlap': true,
      }, paint: { 'text-color': '#FF4444', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Weather Events (NASA EONET — storms, volcanoes)
      map.addLayer({ id: 'weather-glow', type: 'circle', source: 'weather', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,20, 10,30],
        'circle-color': '#E040FB', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'weather-dots', type: 'circle', source: 'weather', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14],
        'circle-color': ['match', ['get','icon'], 'cyclone','#E040FB', 'volcano','#FF1744', '#E040FB'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#E040FB', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'weather-label', type: 'symbol', source: 'weather', layout: {
        'text-field': ['get','title'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#E040FB', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Nuclear Infrastructure
      map.addLayer({ id: 'infra-glow', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'],
        'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'infra-dots', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': ['case', 
          ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500',
          ['==', ['get','status'], 'Active Conflict Zone'], '#FF1744', 
          ['==', ['get','status'], 'Destroyed / Decommissioning'], '#757575', 
          '#76FF03'
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'infra-label', type: 'symbol', source: 'infrastructure', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'], 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Centrales eléctricas (color por fuente de energía)
      map.addLayer({ id: 'power-plants-dots', type: 'circle', source: 'power-plants', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 2,1.8, 6,4, 11,8],
        'circle-color': ['match', ['get','fuel'],
          'Solar','#FFD600', 'Wind','#4FC3F7', 'Hydro','#2979FF', 'Nuclear','#FF1744',
          'Coal','#455A64', 'Gas','#FF9100', 'Oil','#8D6E63', 'Biomass','#8BC34A',
          'Geothermal','#E91E63', 'Waste','#9E9E9E', 'Storage','#00E5FF', 'Cogeneration','#FFAB40',
          '#BDBDBD'],
        'circle-opacity': 0.85, 'circle-stroke-width': 0.4, 'circle-stroke-color': '#000', 'circle-stroke-opacity': 0.3,
      }});

      // Cables submarinos (líneas)
      map.addLayer({ id: 'cables-lines', type: 'line', source: 'submarine-cables', paint: {
        'line-color': ['coalesce', ['get', 'color'], '#00BCD4'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1.5], 'line-opacity': 0.5,
      }});
      // Infraestructura crítica (aeropuertos, refinerías, presas) — color por tipo
      map.addLayer({ id: 'critical-infra-dots', type: 'circle', source: 'critical-infra', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2, 6, 4, 11, 7],
        'circle-color': ['match', ['get', 'type'], 'airport', '#00E5FF', 'refinery', '#FF6D00', 'dam', '#2979FF', '#BDBDBD'],
        'circle-opacity': 0.85, 'circle-stroke-width': 0.4, 'circle-stroke-color': '#000', 'circle-stroke-opacity': 0.3,
      }});

      // Satellites
      map.addLayer({ id: 'sat-glow', type: 'circle', source: 'satellites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,6], 'circle-color': ['get','color'], 'circle-opacity': 0.3, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sat-dots', type: 'circle', source: 'satellites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,1.5, 5,3], 'circle-color': ['get','color'], 'circle-opacity': 1.0,
      }});

      // Maritime — ports & naval bases
      map.addLayer({ id: 'maritime-glow', type: 'circle', source: 'maritime', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'],
        'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'maritime-dots', type: 'circle', source: 'maritime', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,9],
        'circle-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'],
        'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'maritime-label', type: 'symbol', source: 'maritime', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#00BCD4', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Maritime chokepoints — pulsing warning diamonds
      map.addLayer({ id: 'choke-glow', type: 'circle', source: 'maritime-choke', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,18, 10,28],
        'circle-color': '#FF9500', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'choke-dots', type: 'circle', source: 'maritime-choke', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,7, 10,12],
        'circle-color': ['match', ['get','risk'], 'CRITICAL','#FF1744', 'HIGH','#FF9500', 'ELEVATED','#FFD700', '#00E676'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF9500', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'choke-label', type: 'symbol', source: 'maritime-choke', minzoom: 3, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF9500', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.9 }});

      // Live News — broadcast dots
      map.addLayer({ id: 'news-glow', type: 'circle', source: 'live-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#FF4081', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'news-dots', type: 'circle', source: 'live-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': '#FF4081', 'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF4081', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'news-label', type: 'symbol', source: 'live-news', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF4081', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // SIGINT RSS news - gold markers
      map.addLayer({ id: 'sigint-news-glow', type: 'circle', source: 'sigint-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,10, 10,18],
        'circle-color': '#D4AF37', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sigint-news-dots', type: 'circle', source: 'sigint-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#D4AF37', 'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFF8DC', 'circle-stroke-opacity': 0.6,
      }});
      map.addLayer({ id: 'sigint-news-label', type: 'symbol', source: 'sigint-news', minzoom: 5, layout: {
        'text-field': ['get','source'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.6], 'text-max-width': 10, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#D4AF37', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.85 }});

      // ══ IP SWEEP — Neighborhood device visualization ══
      map.addLayer({ id: 'sweep-connections', type: 'line', source: 'ip-sweep-connections', paint: {
        'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.3, 'line-dasharray': [2, 4],
      }});
      map.addLayer({ id: 'sweep-pulse-ring', type: 'circle', source: 'ip-sweep-pulse', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,40, 12,80, 16,160],
        'circle-color': 'transparent', 'circle-opacity': 0.6,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'sweep-device-glow', type: 'circle', source: 'ip-sweep-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,8, 12,16, 16,30],
        'circle-color': ['get', 'color'], 'circle-opacity': 0.15, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sweep-device-dots', type: 'circle', source: 'ip-sweep-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,3, 12,6, 16,10],
        'circle-color': ['get', 'color'], 'circle-opacity': 0.95,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-opacity': 0.6,
      }});
      map.addLayer({ id: 'sweep-device-labels', type: 'symbol', source: 'ip-sweep-devices', minzoom: 13, layout: {
        'text-field': ['concat', ['get', 'device_type'], '\n', ['get', 'ip']],
        'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2.2], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: {
        'text-color': ['get', 'color'], 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9,
      }});

      // ══ SCAN TARGETS — Geolocated individual scans ══
      map.addLayer({ id: 'scan-targets-glow', type: 'circle', source: 'scan-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,25, 10,40],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.2, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'scan-targets-dots', type: 'circle', source: 'scan-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,12],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.95,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-opacity': 0.8,
      }});
      map.addLayer({ id: 'scan-targets-label', type: 'symbol', source: 'scan-targets', layout: {
        'text-field': ['get', 'id'], 'text-size': 11, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF3D3D', 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9 }});

      // Flight layers (WebGL symbol — GPU rendered, handles 50K+ smooth)
      const flightLayers = [
        { id: 'fl-commercial', src: 'flights', icon: 'plane-cyan' },
        { id: 'fl-private', src: 'private-fl', icon: 'plane-green' },
        { id: 'fl-jets', src: 'jets', icon: 'plane-pink' },
        { id: 'fl-military', src: 'military', icon: 'plane-red' },
      ];
      flightLayers.forEach(l => {
        map.addLayer({ id: l.id, type: 'symbol', source: l.src, layout: {
          'icon-image': l.icon, 'icon-size': ['interpolate',['linear'],['zoom'], 1,0.4, 5,0.7, 10,1],
          'icon-rotate': ['get','heading'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
        }, paint: { 'icon-opacity': 0.85 }});
      });

      // Balloons (moving entities)
      map.addLayer({ id: 'balloon-dots', type: 'circle', source: 'balloons', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,7],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'balloon-label', type: 'symbol', source: 'balloons', minzoom: 4, layout: {
        'text-field': ['get','callsign'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.2], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Radiation (glow based on reading level)
      map.addLayer({ id: 'rad-glow', type: 'circle', source: 'radiation', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,20, 10,40],
        'circle-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'],
        'circle-opacity': 0.15, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'rad-dots', type: 'circle', source: 'radiation', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,8],
        'circle-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'rad-label', type: 'symbol', source: 'radiation', minzoom: 5, layout: {
        'text-field': ['concat', ['to-string', ['get','reading']], ' nSv/h'], 'text-size': 9, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.5], 'text-allow-overlap': false,
      }, paint: { 'text-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // ══ Politeia SDK — Lattice Intelligence Mesh ══
      
      // -- GLOW LAYERS --
      map.addLayer({ id: 'sdk-sea-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'SEA'], paint: {
        'line-color': '#4FC3F7',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 3, 5, 6, 10, 10],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.15, 5, 0.25, 10, 0.35],
        'line-blur': 4,
      }});
      map.addLayer({ id: 'sdk-air-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#B3E5FC',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 2, 5, 4, 10, 8],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.1, 5, 0.15, 10, 0.2],
        'line-blur': 3,
      }});
      map.addLayer({ id: 'sdk-intel-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#81D4FA',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 2, 5, 4, 10, 6],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.08, 5, 0.12, 10, 0.18],
        'line-blur': 2,
      }});

      // -- CORE LINES --
      // Maritime routes — solid, brightest
      map.addLayer({ id: 'sdk-sea', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'SEA'], paint: {
        'line-color': '#4FC3F7',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.6, 5, 1.2, 10, 2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.4, 5, 0.6, 10, 0.9],
      }});
      // Air corridors — dashed, medium
      map.addLayer({ id: 'sdk-air', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#B3E5FC',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.4, 5, 0.9, 10, 1.6],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.25, 5, 0.4, 10, 0.6],
        'line-dasharray': [6, 3],
      }});
      // Naval/Intel — dotted, subtle
      map.addLayer({ id: 'sdk-intel', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#81D4FA',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.3, 5, 0.7, 10, 1.2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.2, 5, 0.35, 10, 0.5],
        'line-dasharray': [2, 4],
      }});

      // Maritime Ships — estilo MarineTraffic: flechas direccionales por tipo
      const SHIP_TYPE_COLORS: Record<string,string> = { cargo:'#00BCD4', tanker:'#FF9500', passenger:'#B388FF', fishing:'#4DB6AC', tug:'#A1887F', highspeed:'#FF4081', military:'#FF1744', other:'#90A4AE' };
      const shipColorExpr: any = ['match', ['get','type'],
        'cargo','#00BCD4', 'tanker','#FF9500', 'passenger','#B388FF', 'fishing','#4DB6AC',
        'tug','#A1887F', 'highspeed','#FF4081', 'military','#FF1744', /* other */ '#90A4AE'];
      // Genera un icono de flecha (apuntando al norte) por cada tipo; icon-rotate la orienta al rumbo.
      const makeShipArrow = (color: string) => {
        const s = 24; const cv = document.createElement('canvas'); cv.width = s; cv.height = s;
        const ctx = cv.getContext('2d')!;
        ctx.translate(s/2, s/2);
        ctx.beginPath();
        ctx.moveTo(0, -9); ctx.lineTo(6, 8); ctx.lineTo(0, 4); ctx.lineTo(-6, 8); ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
        return ctx.getImageData(0, 0, s, s);
      };
      for (const [t, col] of Object.entries(SHIP_TYPE_COLORS)) {
        const id = 'ship-arrow-' + t;
        try { if (!map.hasImage(id)) map.addImage(id, makeShipArrow(col), { pixelRatio: 2 }); } catch { /* noop */ }
      }
      const shipArrowImg: any = ['match', ['get','type'],
        'cargo','ship-arrow-cargo', 'tanker','ship-arrow-tanker', 'passenger','ship-arrow-passenger',
        'fishing','ship-arrow-fishing', 'tug','ship-arrow-tug', 'highspeed','ship-arrow-highspeed',
        'military','ship-arrow-military', /* other */ 'ship-arrow-other'];
      // Barcos en movimiento → flecha orientada al rumbo
      map.addLayer({ id: 'ship-arrows', type: 'symbol', source: 'maritime-ships',
        filter: ['>', ['get','speed'], 0.5],
        layout: {
          'icon-image': shipArrowImg,
          'icon-rotate': ['coalesce', ['get','heading'], 0],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true, 'icon-ignore-placement': true,
          'icon-size': ['interpolate',['linear'],['zoom'], 2,0.6, 6,0.95, 11,1.35, 14,1.7],
        }});
      // Barcos parados (fondeados / amarrados) → punto
      map.addLayer({ id: 'ship-dots', type: 'circle', source: 'maritime-ships',
        filter: ['<=', ['get','speed'], 0.5],
        paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'], 1,2.4, 5,4.5, 10,7],
          'circle-color': shipColorExpr,
          'circle-opacity': 0.85,
          'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.5)',
        }});
      map.addLayer({ id: 'ship-label', type: 'symbol', source: 'maritime-ships', minzoom: 8, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.3], 'text-allow-overlap': false,
      }, paint: { 'text-color': shipColorExpr, 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Sube la ruta de vuelo por encima del resto (si no, queda tapada por puntos/barcos/CCTV).
      ['flight-route-casing','flight-route-line','flight-route-dest','flight-route-origin','flight-route-label'].forEach(id => {
        try { map.moveLayer(id); } catch { /* noop */ }
      });

      setMapReady(true);
    });

    // Events
    let lastMove = 0;
    map.on('mousemove', e => {
      const now = Date.now();
      if (now - lastMove > 100) {
        lastMove = now;
        onMouseCoords?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });
    map.on('contextmenu', e => { e.preventDefault(); onRightClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    map.on('moveend', () => { const c = map.getCenter(); onViewStateChange?.({ zoom: map.getZoom(), latitude: c.lat }); });

    // ── POPUP HELPER ──
    const popup = (coords: any, html: string) => {
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '420px', offset: 14 }).setLngLat(coords).setHTML(html).addTo(map);
      // Al cerrar el popup, borra la ruta de vuelo (si la había).
      popupRef.current.on('close', () => {
        try { (map.getSource('flight-route') as any)?.setData(EMPTY_FC); (map.getSource('flight-route-pts') as any)?.setData(EMPTY_FC); } catch { /* noop */ }
      });
    };
    const pStyle = `background:rgba(12,14,26,0.95);backdrop-filter:blur(16px);border-radius:10px;padding:16px;font-family:'JetBrains Mono',monospace;`;
    const linkStyle = `display:inline-block;margin-top:8px;padding:5px 12px;font-size:10px;letter-spacing:0.12em;text-decoration:none;border-radius:5px;font-family:'JetBrains Mono',monospace;`;

    // ── "Guardar en workspace" desde cualquier popup ──
    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const wsBtn = (title: string, kind: string, source: string, lat?: number, lng?: number) =>
      `<button class="ws-save-btn" data-t="${esc(title)}" data-k="${esc(kind)}" data-s="${esc(source)}" data-lat="${lat ?? ''}" data-lng="${lng ?? ''}" style="${linkStyle}width:100%;text-align:center;margin-top:9px;cursor:pointer;color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);font-weight:700;">★ Guardar en workspace</button>`;
    map.getContainer().addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement)?.closest?.('.ws-save-btn') as HTMLElement | null;
      if (!btn || btn.hasAttribute('data-done')) return;
      try {
        saveToInbox({
          title: btn.getAttribute('data-t') || '—',
          kind: btn.getAttribute('data-k') || 'entidad',
          source: btn.getAttribute('data-s') || 'Mapa OSINT',
          lat: btn.getAttribute('data-lat') ? Number(btn.getAttribute('data-lat')) : undefined,
          lng: btn.getAttribute('data-lng') ? Number(btn.getAttribute('data-lng')) : undefined,
        });
        btn.setAttribute('data-done', '1');
        btn.textContent = '✓ Guardado en workspace';
        btn.style.color = '#34C759';
        btn.style.borderColor = 'rgba(52,199,89,0.5)';
      } catch { /* noop */ }
    });

    // ── Ruta de vuelo: helpers de círculo máximo + dibujado ──
    const _toRad = (d: number) => d * Math.PI / 180;
    const _toDeg = (r: number) => r * 180 / Math.PI;
    const gcDist = (a: number[], b: number[]) => { // distancia angular (rad)
      const la1 = _toRad(a[1]), la2 = _toRad(b[1]), dLa = _toRad(b[1]-a[1]), dLo = _toRad(b[0]-a[0]);
      const h = Math.sin(dLa/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLo/2)**2;
      return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    };
    const gcLine = (a: number[], b: number[], n: number): number[][] => { // [lng,lat]
      const la1 = _toRad(a[1]), lo1 = _toRad(a[0]), la2 = _toRad(b[1]), lo2 = _toRad(b[0]);
      const d = gcDist(a, b);
      if (d < 1e-9) return [a, b];
      const out: number[][] = [];
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const A = Math.sin((1-f)*d) / Math.sin(d), B = Math.sin(f*d) / Math.sin(d);
        const x = A*Math.cos(la1)*Math.cos(lo1) + B*Math.cos(la2)*Math.cos(lo2);
        const y = A*Math.cos(la1)*Math.sin(lo1) + B*Math.cos(la2)*Math.sin(lo2);
        const z = A*Math.sin(la1) + B*Math.sin(la2);
        out.push([_toDeg(Math.atan2(y, x)), _toDeg(Math.atan2(z, Math.sqrt(x*x + y*y)))]);
      }
      return out;
    };
    // [vívido, apagado] en HEX — line-color data-driven NO acepta rgba() de propiedades, sí hex.
    const FLIGHT_ROUTE_HEX: Record<string,[string,string]> = { commercial:['#00E5FF','#0B5E6B'], private:['#00E676','#0A5E32'], jet:['#FF69B4','#6B2C4B'], military:['#FF1744','#6B0A1C'] };
    const clearFlightRoute = () => {
      try { (map.getSource('flight-route') as any)?.setData(EMPTY_FC); (map.getSource('flight-route-pts') as any)?.setData(EMPTY_FC); } catch { /* noop */ }
    };
    let routeReq = 0;
    // Actualiza el bloque de ruta dentro del popup del avión abierto.
    const updateRoutePopup = (html: string) => {
      try {
        const el = popupRef.current?.getElement?.();
        const slot = el?.querySelector('.pol-route') as HTMLElement | null;
        if (slot) slot.innerHTML = html;
      } catch { /* noop */ }
    };
    const apLabel = (a: any) => `${a.code ? a.code + ' · ' : ''}${a.city || a.name || ''}`.trim();
    const drawFlightRoute = async (callsign: string, plane: number[], category: string) => {
      clearFlightRoute();
      const cs = (callsign || '').trim();
      if (!cs) { updateRoutePopup('<span style="color:#9aa;">Sin indicativo</span>'); return; }
      const reqId = ++routeReq;
      let data: any = null;
      try {
        const r = await fetch(`/api/osiris/flight-route?callsign=${encodeURIComponent(cs)}`);
        if (r.ok) data = await r.json();
      } catch { /* noop */ }
      if (reqId !== routeReq) return;          // otro avión clicado mientras tanto
      if (!data || !data.origin) {             // ruta no pública / sin origen → no dibuja
        updateRoutePopup('<span style="color:#5C5A54;">RUTA</span> &nbsp;<span style="color:#9aa;">No pública (vuelo privado / militar)</span>');
        return;
      }
      const [vivid, faded] = FLIGHT_ROUTE_HEX[category] || FLIGHT_ROUTE_HEX.commercial; // de dónde salió (vívido) → a dónde va (apagado)
      const o = [data.origin.lng, data.origin.lat];
      const pts: any[] = [{ type: 'Feature', geometry: { type: 'Point', coordinates: o }, properties: { kind: 'origin', label: data.origin.code || data.origin.city || data.origin.name || 'Origen' } }];
      const lineFeats: any[] = [
        // Tramo recorrido: origen → posición actual del avión (color VIVO)
        { type: 'Feature', properties: { color: vivid }, geometry: { type: 'LineString', coordinates: gcLine(o, plane, 56) } },
      ];
      if (data.destination) {
        const de = [data.destination.lng, data.destination.lat];
        // Tramo restante: avión → destino (color APAGADO)
        lineFeats.push({ type: 'Feature', properties: { color: faded }, geometry: { type: 'LineString', coordinates: gcLine(plane, de, 56) } });
        pts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: de }, properties: { kind: 'dest', label: data.destination.code || data.destination.city || data.destination.name || 'Destino' } });
      }
      try {
        (map.getSource('flight-route') as any)?.setData({ type: 'FeatureCollection', features: lineFeats });
        (map.getSource('flight-route-pts') as any)?.setData({ type: 'FeatureCollection', features: pts });
      } catch { /* noop */ }
      // Texto en el popup: ORIGEN ✈ DESTINO
      updateRoutePopup(data.destination
        ? `<span style="color:#5C5A54;">RUTA</span><br/><span style="color:${vivid};font-weight:700;">${apLabel(data.origin)}</span> &nbsp;<span style="color:#5C5A54;">✈</span>&nbsp; <span style="color:#90A4AE;">${apLabel(data.destination)}</span>`
        : `<span style="color:#5C5A54;">ORIGEN</span><br/><span style="color:${vivid};font-weight:700;">${apLabel(data.origin)}</span>`);
    };

    // ── Flights (with FlightAware + ADS-B Exchange links) ──
    const FLIGHT_LAYER_CATEGORY: Record<string,string> = { 'fl-commercial':'commercial', 'fl-private':'private', 'fl-jets':'jet', 'fl-military':'military' };
    ['fl-commercial','fl-private','fl-jets','fl-military'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as any;
        const coords = (e.features[0].geometry as any).coordinates;
        const cs = (p.callsign||'').trim();
        drawFlightRoute(cs, [coords[0], coords[1]], FLIGHT_LAYER_CATEGORY[layer] || 'commercial');
        popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="color:#D4AF37;font-size:16px;font-weight:700;letter-spacing:0.1em;">${cs}</span>
            <span style="color:#5C5A54;font-size:10px;">${p.icao24||''}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;">
            <div><span style="color:#5C5A54;font-size:9px;">MODELO</span><br/><span style="color:#E8E6E0;">${p.model||'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">ALTITUD</span><br/><span style="color:#00E5FF;">${p.alt?Math.round(p.alt)+'m':'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">VELOCIDAD</span><br/><span style="color:#E8E6E0;">${p.speed_knots||'—'}kt</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">RUMBO</span><br/><span style="color:#E8E6E0;">${Math.round(p.heading||0)}°</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">MATRÍCULA</span><br/><span style="color:#E8E6E0;">${p.registration||'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">POSICIÓN</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)},${coords[0].toFixed(2)}</span></div>
          </div>
          <div class="pol-route" style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:10px;color:#aaa;">◴ Buscando ruta…</div>
          <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
            <a href="https://www.flightaware.com/live/flight/${cs}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">FLIGHTAWARE</a>
            <a href="https://globe.adsbexchange.com/?icao=${p.icao24||''}" target="_blank" style="${linkStyle}color:#00E5FF;border:1px solid rgba(0,229,255,0.4);background:rgba(0,229,255,0.1);">ADS-B</a>
            <a href="https://www.radarbox.com/data/flights/${cs}" target="_blank" style="${linkStyle}color:#FF69B4;border:1px solid rgba(255,105,180,0.4);background:rgba(255,105,180,0.1);">RADARBOX</a>
          </div>
        </div>`);
        onEntityClick?.(p);
      });
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── CCTV (opens CameraViewer panel) ──
    map.on('click', 'cctv-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      // Emit the camera data so the CameraViewer opens
      onEntityClick?.({
        type: 'cctv',
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        source: p.source,
        feed_url: p.feed_url,
        stream_url: p.stream_url,
        stream_type: p.stream_type,
        external_url: p.external_url,
        lat: coords[1],
        lng: coords[0],
      });
      // Also fly to the camera
      map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 13), duration: 1000 });
    });

    // ── Earthquakes (with USGS link) ──
    map.on('click', 'eq-circles', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,149,0,0.3);">
        <div style="color:#FF9500;font-size:14px;font-weight:700;margin-bottom:4px;">TERREMOTO M${p.magnitude}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${p.place||'Ubicación desconocida'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">PROFUNDIDAD</span><br/><span style="color:#E8E6E0;">${p.depth||'—'}km</span></div>
          <div><span style="color:#5C5A54;">COORDENADAS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}, ${coords[0].toFixed(3)}</span></div>
        </div>
        <a href="${p.source === 'NIGGG-BAS' ? 'https://ndc.niggg.bas.bg/' : `https://earthquake.usgs.gov/earthquakes/eventpage/${p.id||''}`}" target="_blank" style="${linkStyle}color:#FF9500;border:1px solid rgba(255,149,0,0.4);background:rgba(255,149,0,0.1);">${p.source === 'NIGGG-BAS' ? 'NIGGG-BAS' : 'DETALLE USGS'}</a>
      </div>`);
    });

    // ── Satellites (SatNOGS powered) ──
    map.on('click', 'sat-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
        <div style="color:#D4AF37;font-size:12px;font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">MISIÓN</span><br/><span style="color:${p.color||'#aaa'};">${p.mission||'Desconocida'}</span></div>
          <div><span style="color:#5C5A54;">ALTITUD</span><br/><span style="color:#00E5FF;">${p.alt ? p.alt+' km' : '—'}</span></div>
          <div><span style="color:#5C5A54;">POSICIÓN</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</span></div>
        </div>
        ${p.noradId ? `<a href="https://db.satnogs.org/satellite/${p.noradId}/" target="_blank" style="display:block;text-align:center;padding:4px;margin-top:6px;font-size:8px;font-family:monospace;letter-spacing:0.1em;text-decoration:none;color:#00E5FF;border:1px solid rgba(0,229,255,0.4);background:rgba(0,229,255,0.1);border-radius:2px;cursor:pointer;">FUENTE: SATNOGS</a>` : ''}
      </div>`);
    });

    // ── Fires (with NASA FIRMS link) ──
    map.on('click', 'fires-heat', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,107,0,0.3);">
        <div style="color:#FF6B00;font-size:12px;font-weight:700;margin-bottom:6px;">INCENDIO ACTIVO DETECTADO</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">BRILLO</span><br/><span style="color:#FF6B00;">${p.brightness||'—'}K</span></div>
          <div><span style="color:#5C5A54;">COORDENADAS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;l:noaa20-viirs,viirs,modis_a,modis_t;@${coords[0]},${coords[1]},10z" target="_blank" style="${linkStyle}color:#FF6B00;border:1px solid rgba(255,107,0,0.4);background:rgba(255,107,0,0.1);">MAPA NASA FIRMS</a>
      </div>`);
    });

    // ── GDELT Conflicts (with source article) ──
    map.on('click', 'gdelt-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.3);">
        <div style="color:#FF3D3D;font-size:12px;font-weight:700;margin-bottom:6px;">EVENTO DE CONFLICTO</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.name||'Incidente sin clasificar'}</div>
        <div style="display:flex;gap:6px;">
          ${p.url ? `<a href="${p.url}" target="_blank" style="${linkStyle}color:#FF3D3D;border:1px solid rgba(255,61,61,0.4);background:rgba(255,61,61,0.1);">FUENTE</a>` : ''}
          <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},12z" target="_blank" style="${linkStyle}color:#448AFF;border:1px solid rgba(68,138,255,0.4);background:rgba(68,138,255,0.1);">MAPA</a>
        </div>
      </div>`);
    });

    // ── Incidencias de tráfico DGT ──
    map.on('click', 'traffic-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const kindColor = p.kind === 'Accidente' ? '#E53935' : (p.kind === 'Retención' || p.kind === 'Obstrucción') ? '#FB8C00' : '#FFB300';
      popup(coords, `<div style="${pStyle}border:1px solid ${kindColor}55;">
        <div style="color:${kindColor};font-size:12px;font-weight:700;margin-bottom:4px;">${(p.kind||'Incidencia').toUpperCase()}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.road ? `Vía ${p.road}` : 'Carretera estatal'} · DGT España</div>
        <div style="display:flex;gap:6px;">
          <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},14z" target="_blank" style="${linkStyle}color:#448AFF;border:1px solid rgba(68,138,255,0.4);background:rgba(68,138,255,0.1);">MAPA</a>
          <a href="https://infocar.dgt.es/etraffic/" target="_blank" style="${linkStyle}color:${kindColor};border:1px solid ${kindColor}66;background:${kindColor}1a;">PORTAL DGT</a>
        </div>
      </div>`);
    });

    // ── Global Event / Conflict Markers ──
    const SEV_ES: Record<string, string> = { war: 'Guerra activa', high: 'Alta', elevated: 'Tensión' };
    map.on('click', 'conflict-icons', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.severity === 'war' ? '#FF1744' : p.severity === 'high' ? '#FF9500' : '#FFD500';
      const q = encodeURIComponent((p.label || 'conflicto') + ' conflicto');
      const links: string[] = [];
      if (p.live) links.push(`<a href="${p.live}" target="_blank" style="${linkStyle}color:${color};border:1px solid ${color}66;background:${color}1a;">● Mapa en directo (Liveuamap)</a>`);
      links.push(`<a href="https://news.google.com/search?q=${q}&hl=es" target="_blank" style="${linkStyle}color:#E8E6E0;border:1px solid #ffffff22;">Noticias ↗</a>`);
      links.push(`<a href="https://reliefweb.int/updates?search=${encodeURIComponent(p.label || '')}" target="_blank" style="${linkStyle}color:#E8E6E0;border:1px solid #ffffff22;">ReliefWeb · ONU ↗</a>`);
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;min-width:226px;">
        <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:5px;">${p.label || 'EVENTO DE ALERTA'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.5;">${p.description || 'Zona de conflicto activa.'}</div>
        <div style="display:flex;flex-direction:column;gap:3px;font-size:9px;margin-bottom:9px;">
          ${p.actors ? `<div><span style="color:#5C5A54;">ACTORES · </span><span style="color:#E8E6E0;">${p.actors}</span></div>` : ''}
          ${p.since ? `<div><span style="color:#5C5A54;">DESDE · </span><span style="color:#E8E6E0;">${p.since}</span></div>` : ''}
          <div><span style="color:#5C5A54;">INTENSIDAD · </span><span style="color:${color};font-weight:600;">${SEV_ES[p.severity] || p.severity}</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">${links.join('')}</div>
      </div>`);
    });

    // ── Sucesos de guerra — popup por suceso georreferenciado ──
    const WAR_LABELS: Record<string, string> = {
      ucrania: 'Rusia–Ucrania', gaza: 'Israel–Gaza', libano: 'Israel–Hezbolá', iran: 'Israel–Irán',
      sudan: 'Sudán (SAF–RSF)', myanmar: 'Myanmar', congo: 'RD Congo (M23)', sahel: 'Sahel', siria: 'Siria',
    };
    map.on('click', 'war-events-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.color || '#FF1744';
      const q = encodeURIComponent((p.title || '') + ' ' + (p.place || ''));
      const links: string[] = [];
      if (p.source) links.push(`<a href="${p.source}" target="_blank" style="${linkStyle}color:${color};border:1px solid ${color}66;background:${color}1a;">Fuente ↗</a>`);
      links.push(`<a href="https://news.google.com/search?q=${q}&hl=es" target="_blank" style="${linkStyle}color:#E8E6E0;border:1px solid #ffffff22;">Noticias ↗</a>`);
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;min-width:236px;max-width:300px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="display:inline-block;padding:2px 7px;border-radius:4px;background:${color}22;color:${color};font-size:8.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${WAR_LABELS[p.war] || p.war}</span>
          <span style="color:#8A8880;font-size:9px;">${p.date || ''}</span>
        </div>
        <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:5px;line-height:1.25;">${p.title || 'Suceso'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.5;">${p.desc || ''}</div>
        <div style="display:flex;flex-direction:column;gap:3px;font-size:9px;margin-bottom:9px;">
          ${p.place ? `<div><span style="color:#5C5A54;">LUGAR · </span><span style="color:#E8E6E0;">${p.place}</span></div>` : ''}
          ${p.type ? `<div><span style="color:#5C5A54;">TIPO · </span><span style="color:${color};font-weight:600;text-transform:capitalize;">${p.type}</span></div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">${links.join('')}</div>
      </div>`);
    });

    // ── Frente de Ucrania (DeepState) — popup por zona, color = estado ──
    map.on('click', 'frontline-fill', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const color = (p.color as string) || '#FF1744';
      popup(e.lngLat, `<div style="${pStyle}border:1px solid ${color}66;min-width:200px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:9px;height:9px;border-radius:2px;background:${color};flex-shrink:0;"></span>
          <span style="color:${color};font-size:12px;font-weight:700;">${p.status || 'Zona de conflicto'}</span>
        </div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">
          <div>Frente de Ucrania · DeepState</div>
          ${p.dt ? `<div>Actualizado: <span style="color:#E8E6E0;">${p.dt}</span></div>` : ''}
        </div>
        <a href="https://deepstatemap.live" target="_blank" style="${linkStyle}margin-top:7px;color:${color};border:1px solid ${color}66;background:${color}1a;">Abrir DeepState ↗</a>
      </div>`);
    });

    // ── Placas tectónicas ──
    map.on('click', 'tectonics-line', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      popup(e.lngLat, `<div style="${pStyle}border:1px solid #FF704355;min-width:160px;">
        <div style="color:#FF7043;font-size:12px;font-weight:700;margin-bottom:3px;">Borde de placa</div>
        <div style="font-size:9.5px;color:#aaa;">${p.name ? 'Límite ' + p.name : 'Placa tectónica'}</div>
      </div>`);
    });
    // ── Estado del mar ──
    map.on('click', 'sea-state-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const color = (p.color as string) || '#26C6DA';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}66;min-width:160px;">
        <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:3px;">Altura de ola</div>
        <div style="font-size:11px;color:#E8E6E0;">${Number(p.h).toFixed(1)} m</div>
        <div style="font-size:9px;color:#5C5A54;margin-top:3px;">Estado del mar · Open-Meteo</div>
      </div>`);
    });
    // ── Campos de petróleo y gas ──
    const OG_TYPE: Record<string, string> = { oil: 'Petróleo', gas: 'Gas natural', both: 'Petróleo y gas' };
    map.on('click', 'oilgas-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const color = (p.color as string) || '#8D6E63';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}66;min-width:170px;">
        <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:2px;">${p.name}</div>
        <div style="display:inline-block;font-size:9px;font-weight:700;color:${color};background:${color}1a;border:1px solid ${color}55;border-radius:4px;padding:1px 6px;margin-bottom:5px;">${OG_TYPE[p.type as string] || 'Hidrocarburos'}</div>
        <div style="font-size:9.5px;color:#aaa;">${p.country || ''}</div>
      </div>`);
    });
    // ── Minerales críticos ──
    map.on('click', 'minerals-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const color = (p.color as string) || '#26A69A';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}66;min-width:170px;">
        <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:2px;">${p.name}</div>
        <div style="display:inline-block;font-size:9px;font-weight:700;color:${color};background:${color}1a;border:1px solid ${color}55;border-radius:4px;padding:1px 6px;margin-bottom:5px;text-transform:capitalize;">${p.m || 'Mineral'}</div>
        <div style="font-size:9.5px;color:#aaa;">${p.country || ''}</div>
      </div>`);
    });
    // ── Centros de datos ──
    map.on('click', 'datacenters-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #00E5FF55;min-width:160px;">
        <div style="color:#00E5FF;font-size:12px;font-weight:700;margin-bottom:2px;">${p.name || 'Centro de datos'}</div>
        <div style="font-size:9.5px;color:#aaa;">Centro de datos</div>
      </div>`);
    });
    // ── Agricultura (regiones de cultivo) ──
    map.on('click', 'agriculture-fill', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const color = (p.color as string) || '#9CCC65';
      popup(e.lngLat, `<div style="${pStyle}border:1px solid ${color}66;min-width:190px;">
        <div style="display:inline-block;font-size:9px;font-weight:700;color:${color};background:${color}1a;border:1px solid ${color}55;border-radius:4px;padding:1px 7px;margin-bottom:5px;">${p.crop || 'Cultivo'}</div>
        <div style="color:#E8E6E0;font-size:12px;font-weight:600;">${p.name || ''}</div>
        ${p.admin ? `<div style="font-size:9.5px;color:#aaa;">${p.admin}</div>` : ''}
        <div style="font-size:9px;color:#5C5A54;margin-top:3px;">Cultivo dominante · MapSPAM</div>
      </div>`);
    });
    // ── Disputas territoriales ──
    map.on('click', 'disputes-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #FF174455;min-width:180px;">
        <div style="color:#FF1744;font-size:13px;font-weight:700;margin-bottom:3px;">${p.name}</div>
        <div style="font-size:10px;color:#E8E6E0;">${p.parties || ''}</div>
        <div style="font-size:9px;color:#5C5A54;margin-top:3px;">Territorio en disputa</div>
      </div>`);
    });
    // ── Organismos internacionales ──
    map.on('click', 'orgs-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #448AFF55;min-width:160px;">
        <div style="color:#448AFF;font-size:12px;font-weight:700;margin-bottom:2px;">${p.name}</div>
        <div style="font-size:9.5px;color:#aaa;">${p.city || ''}</div>
      </div>`);
    });
    // ── Países (bloques militares / sanciones) ──
    const REGIME_ES: Record<string, string> = { democracia: 'Democracia', imperfecta: 'Democracia imperfecta', hibrido: 'Régimen híbrido', autoritario: 'Autoritario' };
    const onCountryClick = (e: any) => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const rows: string[] = [];
      if (p.alliance) rows.push(`<div><span style="color:#5C5A54;">Bloque · </span><span style="color:#82B1FF;">${p.alliance}</span></div>`);
      if (p.regime) rows.push(`<div><span style="color:#5C5A54;">Régimen · </span><span style="color:#E8E6E0;">${REGIME_ES[p.regime as string] || p.regime}</span></div>`);
      if (p.spend != null) rows.push(`<div><span style="color:#5C5A54;">Gasto militar · </span><span style="color:#FFB74D;">${p.spend} mil M$</span></div>`);
      if (p.troops != null) rows.push(`<div><span style="color:#5C5A54;">Tropas activas · </span><span style="color:#E8E6E0;">${Number(p.troops).toLocaleString('es')} mil</span></div>`);
      if (p.nukes != null) rows.push(`<div><span style="color:#5C5A54;">Ojivas nucleares · </span><span style="color:#FF8A80;">${p.nukes}</span></div>`);
      const PRESS_ES: any = { 1: 'Buena', 2: 'Satisfactoria', 3: 'Problemática', 4: 'Difícil', 5: 'Muy grave' };
      if (p.blocs) rows.push(`<div><span style="color:#5C5A54;">Bloques · </span><span style="color:#90CAF9;">${p.blocs}</span></div>`);
      if (p.election_year) rows.push(`<div><span style="color:#5C5A54;">Próximas elecciones · </span><span style="color:#FFD54F;">${p.election_type || ''} ${p.election_year}</span></div>`);
      if (p.press != null) rows.push(`<div><span style="color:#5C5A54;">Libertad de prensa · </span><span style="color:#E8E6E0;">${PRESS_ES[p.press] || p.press}</span></div>`);
      if (p.cpi != null) rows.push(`<div><span style="color:#5C5A54;">Corrupción (CPI) · </span><span style="color:#E8E6E0;">${p.cpi}/100</span></div>`);
      if (p.hdi != null) rows.push(`<div><span style="color:#5C5A54;">IDH · </span><span style="color:#E8E6E0;">${p.hdi}</span></div>`);
      if (p.gdppc != null) rows.push(`<div><span style="color:#5C5A54;">PIB per cápita · </span><span style="color:#A5D6A7;">${Number(p.gdppc).toLocaleString('es')} $</span></div>`);
      const sanc = Number(p.sanctioned) === 1 ? `<div style="margin-top:5px;padding-top:5px;border-top:1px solid #ffffff14;"><span style="color:#EF5350;font-weight:700;">Bajo sanciones</span>${p.sanc ? `<div style="color:#bbb;font-size:9px;margin-top:2px;line-height:1.5;">${p.sanc}</div>` : ''}</div>` : '';
      popup(e.lngLat, `<div style="${pStyle}border:1px solid #44557788;min-width:200px;max-width:300px;">
        <div style="color:#E8E6E0;font-size:13px;font-weight:700;margin-bottom:4px;">${p.name}</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">${rows.join('') || 'Sin datos'}</div>
        ${sanc}
        ${wsBtn(p.name || 'País', 'país', 'Geopolítica', e.lngLat?.lat, e.lngLat?.lng)}
      </div>`);
    };
    ['alliances-fill', 'sanctions-fill', 'milspend-fill', 'regime-fill', 'nukes-fill', 'election-fill', 'press-fill', 'cpi-fill', 'hdi-fill', 'gdp-fill', 'blocs-fill'].forEach((l) => map.on('click', l, onCountryClick));

    // ── Popups de capas de puntos (industria / infraestructura digital / humanitario) ──
    const PT_COLORS: Record<string, string> = { 'refineries-dots':'#A1887F', 'lng-dots':'#42A5F5', 'fabs-dots':'#00E5FF', 'nuclear-plants-dots':'#FFD600', 'dams-dots':'#4FC3F7', 'ixps-dots':'#AB47BC', 'cable-landings-dots':'#26C6DA', 'net-shutdowns-dots':'#EF5350', 'refugee-camps-dots':'#FF9800' };
    const onPointClick = (color: string) => (e: any) => {
      const f = e.features?.[0]; if (!f) return;
      const p = f.properties; const coords = f.geometry.coordinates;
      const rows: string[] = [];
      const add = (label: string, val: any, c?: string) => { if (val != null && val !== '') rows.push(`<div><span style="color:#5C5A54;">${label} · </span><span style="color:${c || '#E8E6E0'};">${val}</span></div>`); };
      add('País', p.country);
      if (p.city && p.city !== p.country) add('Ciudad', p.city);
      if (p.capacity_kbd != null) add('Capacidad', Number(p.capacity_kbd).toLocaleString('es') + ' kb/d', '#FFB74D');
      if (p.mw != null) add('Potencia', Number(p.mw).toLocaleString('es') + ' MW', '#4FC3F7');
      if (p.reactors != null) add('Reactores', p.reactors, '#FFD600');
      if (p.company) add('Empresa', p.company, '#80DEEA');
      if (p.node) add('Nodo', p.node);
      if (p.kind) add('Tipo', p.kind, '#FF8A65');
      if (p.peak_tbps != null) add('Tráfico pico', p.peak_tbps + ' Tbps', '#CE93D8');
      if (p.population != null) add('Población', Number(p.population).toLocaleString('es'), '#FFB74D');
      if (p.origin) add('Origen', p.origin);
      if (p.date) add('Fecha', p.date);
      if (p.cause) add('Causa', p.cause, '#FF8A80');
      popup(coords, `<div style="${pStyle}border:1px solid ${color}55;min-width:200px;max-width:300px;">
        <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:5px;">${p.name || '—'}</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">${rows.join('') || 'Sin datos'}</div>
        ${wsBtn(p.name || 'Entidad', 'instalación', p.country || 'Mapa OSINT', coords?.[1], coords?.[0])}
      </div>`);
    };
    Object.entries(PT_COLORS).forEach(([layer, color]) => map.on('click', layer, onPointClick(color)));

    // ── Popup de cobertura/rendimiento móvil (Ookla) ──
    map.on('click', 'mobile-coverage-fill', e => {
      const f = e.features?.[0]; if (!f) return;
      const p = f.properties as any; const color = p.color || '#FDD835';
      popup(e.lngLat, `<div style="${pStyle}border:1px solid ${color}55;min-width:200px;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:5px;">Rendimiento móvil (Ookla)</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.8;">
          <div><span style="color:#5C5A54;">Bajada · </span><span style="color:#E8E6E0;font-weight:700;">${p.dl} Mbps</span></div>
          <div><span style="color:#5C5A54;">Subida · </span><span style="color:#E8E6E0;">${p.ul} Mbps</span></div>
          <div><span style="color:#5C5A54;">Latencia · </span><span style="color:#E8E6E0;">${p.lat} ms</span></div>
          <div><span style="color:#5C5A54;">Muestras · </span><span style="color:#E8E6E0;">${Number(p.tests).toLocaleString('es')}</span></div>
        </div>
        <div style="font-size:8px;color:#5C5A54;margin-top:6px;">Tesela ~78 km · Speedtest by Ookla · Q1 2026</div>
      </div>`);
    });
    // ── Piratería ──
    map.on('click', 'piracy-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const color = (p.color as string) || '#EF5350';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}66;min-width:170px;">
        <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:3px;">${p.name}</div>
        <div style="font-size:9.5px;color:#aaa;">Riesgo de piratería: <span style="color:${color};text-transform:capitalize;">${p.risk || '—'}</span></div>
      </div>`);
    });
    // ── Faros ──
    map.on('click', 'lighthouses-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #FFEE5855;min-width:150px;">
        <div style="color:#FFEE58;font-size:12px;font-weight:700;margin-bottom:2px;">${p.name || 'Faro'}</div>
        <div style="font-size:9.5px;color:#aaa;">Faro / ayuda a la navegación</div>
      </div>`);
    });
    // ── Rutas marítimas ──
    map.on('click', 'sea-lanes-line', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      popup(e.lngLat, `<div style="${pStyle}border:1px solid #26C6DA55;min-width:160px;">
        <div style="color:#26C6DA;font-size:12px;font-weight:700;">${p.name || 'Ruta marítima'}</div>
        <div style="font-size:9px;color:#5C5A54;margin-top:2px;">Corredor comercial marítimo</div>
      </div>`);
    });


    // ── Politeia SDK link click ──
    const SDK_SOURCE_URLS: Record<string, string> = {
      'AIS Maritime': 'https://www.marinetraffic.com',
      'AIS Stream': 'https://aisstream.io',
      'AIS → Lattice': 'https://aisstream.io',
      'ADS-B / OpenSky': 'https://opensky-network.org',
      'ADS-B → Lattice': 'https://opensky-network.org',
      'Naval Intelligence': 'https://www.odni.gov',
    };
    ['sdk-sea','sdk-sea-glow','sdk-air','sdk-air-glow','sdk-intel','sdk-intel-glow'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as any;
        const coords = e.lngLat;
        const srcUrl = p.url || SDK_SOURCE_URLS[p.source] || 'https://politeia-politeianalitica-alts-projects.vercel.app';
        const domainLabel = p.domain === 'SEA' ? 'MARÍTIMO' : p.domain === 'AIR' ? '✈ CORREDOR AÉREO' : 'INTEL NAVAL';
        const domainColor = p.domain === 'SEA' ? '#4FC3F7' : p.domain === 'AIR' ? '#B3E5FC' : '#81D4FA';
        const linkStyle = 'text-decoration:none;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:0.05em;';
        popup([coords.lng, coords.lat], `<div style="${pStyle}border:1px solid ${domainColor}40;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${domainColor};box-shadow:0 0 8px ${domainColor};"></div>
            <span style="color:${domainColor};font-size:11px;font-weight:700;letter-spacing:0.1em;">${domainLabel}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;">
            <div><span style="color:#5C5A54;">ORIGEN</span><br/><span style="color:#E8E6E0;">${p.fromName || 'Origen'}</span></div>
            <div><span style="color:#5C5A54;">DESTINO</span><br/><span style="color:#E8E6E0;">${p.toName || 'Destino'}</span></div>
            <div><span style="color:#5C5A54;">DOMINIO</span><br/><span style="color:${domainColor};">${p.domain}</span></div>
            <div><span style="color:#5C5A54;">FUENTE</span><br/><a href="${srcUrl}" target="_blank" style="color:${domainColor};text-decoration:underline;cursor:pointer;">${p.source || 'Politeia'}</a></div>
          </div>
          <a href="${srcUrl}" target="_blank" style="${linkStyle}color:${domainColor};border:1px solid ${domainColor}40;background:${domainColor}18;display:inline-block;margin-top:4px;">ABRIR FUENTE ↗</a>
        </div>`);
      });
    });

    // ── Generic hover for clickables ──
    ['refineries-dots','lng-dots','fabs-dots','nuclear-plants-dots','dams-dots','ixps-dots','cable-landings-dots','net-shutdowns-dots','refugee-camps-dots','mobile-coverage-fill','conflict-icons','war-events-dots','frontline-fill','tectonics-line','sea-state-dots','oilgas-dots','minerals-dots','datacenters-dots','pipelines-line','agriculture-fill','disputes-dots','orgs-dots','piracy-dots','lighthouses-dots','sea-lanes-line','cctv-dots','eq-circles','sat-dots','fires-heat','gdelt-dots','traffic-dots','weather-dots','infra-dots','power-plants-dots','critical-infra-dots','maritime-dots','choke-dots','news-dots','sigint-news-dots','balloon-dots','rad-dots','ship-dots','ship-arrows','geo-mountains','geo-features','geo-range-fill','geo-desert-fill','geo-other-fill','gdacs-dots','hurricane-dots','volcanoes-dots','airports-dots','launches-dots','iss-dot','trains-dots','satnogs-dots','milbase-dots','aq-dots','sweep-device-dots','scan-targets-dots','sdk-sea','sdk-sea-glow','sdk-air','sdk-air-glow','sdk-intel','sdk-intel-glow'].forEach(layer => {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── Scan Targets click ──
    map.on('click', 'scan-targets-dots', (e: any) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = e.features[0].geometry.coordinates.slice();
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.5);">
        <div style="color:#FF3D3D;font-size:12px;font-weight:700;margin-bottom:6px;">OBJETIVO: ${p.id}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${p.city || 'Desconocido'}, ${p.country || 'Desconocido'} — ${p.isp || 'ISP desconocido'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#00E5FF;">${(p.type || 'DESCONOCIDO').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDENADAS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
      </div>`);
    });

    // ── SCM Suppliers ──
    map.on('click', 'scm-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.risk_level === 'CRITICAL' ? '#FF1744' : p.risk_level === 'HIGH' ? '#FF9500' : '#00BCD4';
      const activeThreats = p.active_threats ? JSON.parse(p.active_threats) : [];
      
      let threatsHtml = '';
      if (activeThreats.length > 0) {
        threatsHtml = `<div style="margin-top:8px;padding-top:6px;border-top:1px solid ${color}40;color:${color};font-size:9px;font-weight:bold;">
          AMENAZAS ACTIVAS:<br/>${activeThreats.map((t: string) => `${t}`).join('<br/>')}
        </div>`;
      }

      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:4px;">${p.name}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.category} | ${p.city}, ${p.country}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;font-size:11px;">
          <div><span style="color:#5C5A54;font-size:9px;">NIVEL DE RIESGO SCM</span><br/><span style="color:${color};font-weight:bold;">${p.risk_level}</span></div>
        </div>
        ${threatsHtml}
      </div>`);
    });

    // ── IP Sweep device click ──
    map.on('click', 'sweep-device-dots', (e: any) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = e.features[0].geometry.coordinates.slice();
      const ports = JSON.parse(p.ports || '[]');
      const vulns = JSON.parse(p.vulns || '[]');
      const hostnames = JSON.parse(p.hostnames || '[]');
      const riskColors: Record<string, string> = { CRITICAL: '#FF3D3D', HIGH: '#FF6B00', MEDIUM: '#FFD700', LOW: '#76FF03', INFO: '#5C5A54' };
      popup(coords, `<div style="font-family:monospace;font-size:11px;color:#E8E6E0;">
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px;color:${p.color};">${p.device_type}</div>
        <div style="font-size:12px;margin-bottom:8px;color:#fff;">${p.ip}</div>
        ${hostnames.length > 0 ? `<div style="font-size:9px;color:#8A8880;margin-bottom:6px;">${hostnames.join(', ')}</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">PUERTOS</span><br/><span style="color:#E8E6E0;">${ports.length}</span></div>
          <div><span style="color:#5C5A54;">RIESGO</span><br/><span style="color:${riskColors[p.risk_level] || '#666'};">${p.risk_level}</span></div>
        </div>
        <div style="font-size:9px;color:#8A8880;margin-bottom:6px;">Abiertos: ${ports.slice(0, 12).join(', ')}${ports.length > 12 ? ' ...' : ''}</div>
        ${vulns.length > 0 ? `<div style="font-size:9px;color:#FF3D3D;margin-bottom:6px;">CVEs: ${vulns.slice(0, 5).join(', ')}${vulns.length > 5 ? ` +${vulns.length - 5} más` : ''}</div>` : ''}
      </div>`);
    });

    // ── Balloons / Sondes ──
    map.on('click', 'balloon-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid ${p.color}40;">
        <div style="color:${p.color};font-size:12px;font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">${p.callsign}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.type.toUpperCase()} / ESTADO: ${p.status.toUpperCase()}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">ALTITUD</span><br/><span style="color:#E8E6E0;">${p.altitude} m</span></div>
          <div><span style="color:#5C5A54;">VELOCIDAD</span><br/><span style="color:#E8E6E0;">${Math.round(p.speed)} km/h</span></div>
          <div><span style="color:#5C5A54;">VEL. VERTICAL</span><br/><span style="color:${p.verticalRate > 0 ? '#00E676' : '#FF3D3D'};">${p.verticalRate.toFixed(1)} m/s</span></div>
          <div><span style="color:#5C5A54;">TEMP</span><br/><span style="color:#E8E6E0;">${p.temperature}°C</span></div>
        </div>
      </div>`);
    });

    // ── Radiation ──
    map.on('click', 'rad-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.status === 'DANGER' ? '#FF1744' : p.status === 'WARNING' ? '#FF9500' : '#AB47BC';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:4px;">${p.name}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.city}, ${p.country}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;font-size:11px;">
          <div><span style="color:#5C5A54;font-size:9px;">LECTURA</span><br/><span style="color:${color};font-weight:bold;">${p.reading} nSv/h</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">ESTADO</span><br/><span style="color:${color};">${p.status}</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">RED</span><br/><span style="color:#E8E6E0;">${p.network}</span></div>
        </div>
      </div>`);
    });

    // ── Maritime Ships ──
    const SHIP_COLORS: Record<string, string> = { cargo:'#00BCD4', tanker:'#FF9500', passenger:'#B388FF', fishing:'#4DB6AC', tug:'#A1887F', highspeed:'#FF4081', military:'#FF1744', other:'#90A4AE' };
    const SHIP_LABELS: Record<string, string> = { cargo:'Carga', tanker:'Petrolero / tanque', passenger:'Pasaje / ferry', fishing:'Pesca', tug:'Remolcador', highspeed:'Alta velocidad', military:'Militar', other:'Otro / servicio' };
    const onShipClick = (e: any) => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = SHIP_COLORS[p.type] || '#90A4AE';
      const courseTxt = (p.course !== undefined && p.course !== null && p.course !== '') ? `${Math.round(Number(p.course))}°` : (p.heading != null ? `${Math.round(Number(p.heading))}°` : '—');
      const statusTxt = p.moored === true || p.moored === 'true' ? 'Atracado / fondeado' : 'En navegación';
      const statusCol = (p.moored === true || p.moored === 'true') ? '#FFB300' : '#00E676';
      const dims = (p.length || p.beam) ? `${p.length ? p.length + ' m' : '?'} × ${p.beam ? p.beam + ' m' : '?'}` : null;
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;min-width:214px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="color:${color};font-size:12px;font-weight:700;letter-spacing:0.04em;">${p.name}</span>
          ${p.flag ? `<span style="color:#aaa;font-size:9px;font-weight:600;border:1px solid #ffffff22;border-radius:3px;padding:0 4px;">${p.flag}</span>` : ''}
        </div>
        <div style="display:inline-block;font-size:9px;font-weight:700;color:${color};background:${color}1a;border:1px solid ${color}55;border-radius:4px;padding:1px 6px;margin-bottom:6px;">${SHIP_LABELS[p.type] || 'Buque'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 8px;font-size:9px;">
          <div><span style="color:#5C5A54;">ESTADO</span><br/><span style="color:${statusCol};font-weight:600;">${statusTxt}</span></div>
          <div><span style="color:#5C5A54;">VELOCIDAD</span><br/><span style="color:#E8E6E0;">${Number(p.speed || 0).toFixed(1)} nudos</span></div>
          <div><span style="color:#5C5A54;">RUMBO</span><br/><span style="color:#E8E6E0;">${courseTxt}</span></div>
          <div><span style="color:#5C5A54;">DESTINO</span><br/><span style="color:#E8E6E0;">${p.destination || 'Desconocido'}</span></div>
          ${dims ? `<div><span style="color:#5C5A54;">ESLORA × MANGA</span><br/><span style="color:#E8E6E0;">${dims}</span></div>` : ''}
          ${p.draught ? `<div><span style="color:#5C5A54;">CALADO</span><br/><span style="color:#E8E6E0;">${p.draught} m</span></div>` : ''}
          ${p.imo ? `<div><span style="color:#5C5A54;">IMO</span><br/><span style="color:#E8E6E0;">${p.imo}</span></div>` : ''}
          ${p.callsign ? `<div><span style="color:#5C5A54;">INDICATIVO</span><br/><span style="color:#E8E6E0;">${p.callsign}</span></div>` : ''}
          ${p.mmsi ? `<div><span style="color:#5C5A54;">MMSI</span><br/><span style="color:#E8E6E0;">${p.mmsi}</span></div>` : ''}
        </div>
        ${p.mmsi ? `<a href="https://www.marinetraffic.com/en/ais/details/ships/mmsi:${p.mmsi}" target="_blank" style="${linkStyle}margin-top:7px;color:${color};border:1px solid ${color}66;background:${color}1a;">FICHA MARINETRAFFIC</a>` : ''}
      </div>`);
    };
    map.on('click', 'ship-dots', onShipClick);
    map.on('click', 'ship-arrows', onShipClick);

    // ── Accidentes geográficos ──
    const GEO_CAT_LABEL: Record<string, string> = { peak:'Pico / montaña', range:'Cordillera', desert:'Desierto', upland:'Meseta / altiplano', lowland:'Cuenca / llanura', wetland:'Humedal / delta', land:'Área geográfica', tundra:'Tundra', basin:'Cuenca', plateau:'Meseta', plain:'Llanura', delta:'Delta', valley:'Valle', waterfall:'Cascada', feature:'Accidente geográfico' };
    const GEO_CAT_COLOR: Record<string, string> = { peak:'#A1887F', range:'#8D6E63', desert:'#E0A82E', waterfall:'#29B6F6', upland:'#26A69A', lowland:'#26A69A', wetland:'#4DB6AC', land:'#26A69A', tundra:'#90A4AE' };
    // Cuerpo común del popup (lng,lat ya resuelto)
    const geoPopupAt = (p: any, lng: number, lat: number) => {
      const color = GEO_CAT_COLOR[p.cat] || '#26A69A';
      const elev = (p.elev !== undefined && p.elev !== null && p.elev !== '') ? Number(p.elev) : null;
      popup([lng, lat], `<div style="${pStyle}border:1px solid ${color}55;min-width:180px;">
        <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:3px;">${p.name || 'Accidente geográfico'}</div>
        <div style="display:inline-block;font-size:9px;font-weight:700;color:${color};background:${color}1a;border:1px solid ${color}55;border-radius:4px;padding:1px 6px;margin-bottom:6px;">${GEO_CAT_LABEL[p.cat] || 'Accidente geográfico'}</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">
          ${elev ? `<div>Altitud: <span style="color:#E8E6E0;font-weight:600;">${elev.toLocaleString('es')} m</span></div>` : ''}
          <div>Coordenadas: <span style="color:#E8E6E0;">${lat.toFixed(2)}°, ${lng.toFixed(2)}°</span></div>
        </div>
        <a href="https://www.google.com/maps/@${lat},${lng},9z/data=!3m1!1e3" target="_blank" style="${linkStyle}margin-top:7px;color:${color};border:1px solid ${color}66;background:${color}1a;">VISTA SATÉLITE</a>
      </div>`);
    };
    // Puntos: coordenada = geometría del punto
    const onGeoClick = (e: any) => {
      if (!e.features?.length) return;
      const coords = (e.features[0].geometry as any).coordinates;
      geoPopupAt(e.features[0].properties, coords[0], coords[1]);
    };
    // Áreas (polígonos): coordenada = punto donde se clicó
    const onGeoAreaClick = (e: any) => {
      if (!e.features?.length) return;
      geoPopupAt(e.features[0].properties, e.lngLat.lng, e.lngLat.lat);
    };
    ['geo-mountains','geo-features'].forEach(l => map.on('click', l, onGeoClick));
    ['geo-range-fill','geo-desert-fill','geo-other-fill'].forEach(l => map.on('click', l, onGeoAreaClick));

    // ── GDACS (alertas de desastres) ──
    map.on('click', 'gdacs-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const col = p.alert === 'Red' ? '#EF5350' : p.alert === 'Orange' ? '#FFA726' : '#66BB6A';
      popup(coords, `<div style="${pStyle}border:1px solid ${col}55;min-width:200px;">
        <div style="color:${col};font-size:13px;font-weight:700;margin-bottom:3px;">${p.type_es || 'Alerta'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:6px;">${p.name || ''}</div>
        <div style="display:inline-block;font-size:9px;font-weight:700;color:${col};background:${col}1a;border:1px solid ${col}55;border-radius:4px;padding:1px 6px;margin-bottom:6px;">ALERTA ${String(p.alert).toUpperCase()}</div>
        ${p.description ? `<div style="font-size:9.5px;color:#aaa;line-height:1.6;">${p.description}</div>` : ''}
        ${p.country ? `<div style="font-size:9px;color:#5C5A54;margin-top:4px;">${p.country}</div>` : ''}
        ${p.url ? `<a href="${p.url}" target="_blank" style="${linkStyle}margin-top:7px;color:${col};border:1px solid ${col}66;background:${col}1a;">GDACS</a>` : ''}
      </div>`);
    });

    // ── Ciclones tropicales ──
    map.on('click', 'hurricane-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #26C6DA55;min-width:200px;">
        <div style="color:#26C6DA;font-size:14px;font-weight:700;margin-bottom:4px;">${p.name || 'Ciclón'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:9px;">
          <div><span style="color:#5C5A54;">CATEGORÍA</span><br/><span style="color:#26C6DA;font-weight:600;">${p.class_es || '—'}</span></div>
          <div><span style="color:#5C5A54;">VIENTO</span><br/><span style="color:#E8E6E0;">${p.wind_kt ? p.wind_kt + ' kt' : '—'}</span></div>
          <div><span style="color:#5C5A54;">PRESIÓN</span><br/><span style="color:#E8E6E0;">${p.pressure_mb ? p.pressure_mb + ' mb' : '—'}</span></div>
          <div><span style="color:#5C5A54;">MOVIMIENTO</span><br/><span style="color:#E8E6E0;">${p.movement || '—'}</span></div>
        </div>
      </div>`);
    });

    // ── Volcanes ──
    map.on('click', 'volcanoes-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #FF704355;min-width:190px;">
        <div style="color:#FF7043;font-size:13px;font-weight:700;margin-bottom:3px;">${p.name || 'Volcán'}</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">
          ${p.vtype ? `<div>Tipo: <span style="color:#E8E6E0;">${p.vtype}</span></div>` : ''}
          ${p.elev ? `<div>Elevación: <span style="color:#E8E6E0;">${Number(p.elev).toLocaleString('es')} m</span></div>` : ''}
          ${p.country ? `<div>País: <span style="color:#E8E6E0;">${p.country}</span></div>` : ''}
          ${p.last ? `<div>Última erupción: <span style="color:#FFAB91;">${p.last}</span></div>` : ''}
        </div>
        <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},11z/data=!3m1!1e3" target="_blank" style="${linkStyle}margin-top:7px;color:#FF7043;border:1px solid #FF704366;background:#FF70431a;">VISTA SATÉLITE</a>
      </div>`);
    });

    // ── Aeropuertos ──
    map.on('click', 'airports-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #42A5F555;min-width:190px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="color:#42A5F5;font-size:12px;font-weight:700;">${p.name || 'Aeropuerto'}</span>
          ${p.iata ? `<span style="color:#90CAF9;font-size:11px;font-weight:700;border:1px solid #42A5F555;border-radius:3px;padding:0 5px;">${p.iata}</span>` : ''}
        </div>
        <div style="font-size:9.5px;color:#aaa;">${p.city ? p.city + ', ' : ''}${p.country || ''} · ${p.atype === 'large' ? 'Aeropuerto grande' : 'Aeropuerto mediano'}</div>
        ${p.iata ? `<a href="https://www.flightradar24.com/airport/${String(p.iata).toLowerCase()}" target="_blank" style="${linkStyle}margin-top:7px;color:#42A5F5;border:1px solid #42A5F566;background:#42A5F51a;">FLIGHTRADAR24</a>` : ''}
      </div>`);
    });

    // ── Lanzamientos espaciales ──
    map.on('click', 'launches-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      let when = p.net || '';
      try { if (p.net) when = new Date(p.net).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }); } catch { /* noop */ }
      popup(coords, `<div style="${pStyle}border:1px solid #FFD54F55;min-width:200px;">
        <div style="color:#FFD54F;font-size:12px;font-weight:700;margin-bottom:4px;">${p.name || 'Lanzamiento'}</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">
          <div>Fecha: <span style="color:#E8E6E0;">${when}</span></div>
          ${p.provider ? `<div>Operador: <span style="color:#E8E6E0;">${p.provider}</span></div>` : ''}
          ${p.pad ? `<div>Plataforma: <span style="color:#E8E6E0;">${p.pad}</span></div>` : ''}
          ${p.location ? `<div>Lugar: <span style="color:#E8E6E0;">${p.location}</span></div>` : ''}
          ${p.status ? `<div>Estado: <span style="color:#FFE082;">${p.status}</span></div>` : ''}
        </div>
      </div>`);
    });

    // ── ISS ──
    map.on('click', 'iss-dot', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #00E5FF55;min-width:180px;">
        <div style="color:#fff;font-size:13px;font-weight:700;margin-bottom:4px;">Estación Espacial Internacional</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">
          <div>Posición: <span style="color:#E8E6E0;">${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</span></div>
          ${p.altitude_km ? `<div>Altitud: <span style="color:#E8E6E0;">${p.altitude_km} km</span></div>` : ''}
          ${p.velocity_kmh ? `<div>Velocidad: <span style="color:#00E5FF;">${Number(p.velocity_kmh).toLocaleString('es')} km/h</span></div>` : ''}
        </div>
      </div>`);
    });

    // ── Trenes ──
    const TRAIN_COUNTRY: Record<string, { name: string; color: string; src: string }> = {
      FI: { name: 'Finlandia', color: '#4FC3F7', src: 'Fintraffic Digitraffic' },
      IE: { name: 'Irlanda', color: '#66BB6A', src: 'Irish Rail Realtime' },
      US: { name: 'EE. UU.', color: '#FF7043', src: 'Amtrak · amtraker' },
    };
    map.on('click', 'trains-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const cc = TRAIN_COUNTRY[p.country as string] || { name: '—', color: '#FFCA28', src: 'Tren en directo' };
      popup(coords, `<div style="${pStyle}border:1px solid ${cc.color}55;min-width:180px;">
        <div style="color:${cc.color};font-size:13px;font-weight:700;margin-bottom:2px;">Tren #${p.number}</div>
        <div style="display:inline-block;font-size:9px;font-weight:700;color:${cc.color};background:${cc.color}1a;border:1px solid ${cc.color}55;border-radius:4px;padding:1px 6px;margin-bottom:6px;">${cc.name}</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">
          ${p.route ? `<div>Línea: <span style="color:#E8E6E0;">${p.route}</span></div>` : ''}
          <div>Velocidad: <span style="color:#E8E6E0;">${p.speed != null && p.speed !== '' ? Number(p.speed) + ' km/h' : '—'}</span></div>
          <div>Posición: <span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
          <div style="color:#5C5A54;margin-top:3px;">${cc.src}</div>
        </div>
      </div>`);
    });

    // ── Estaciones SatNOGS ──
    map.on('click', 'satnogs-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid #AB47BC55;min-width:180px;">
        <div style="color:#CE93D8;font-size:13px;font-weight:700;margin-bottom:4px;">${p.name || 'Estación SatNOGS'}</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">
          ${p.status ? `<div>Estado: <span style="color:#E8E6E0;">${p.status}</span></div>` : ''}
          ${p.bands ? `<div>Bandas: <span style="color:#E8E6E0;">${p.bands}</span></div>` : ''}
          ${p.altitude != null ? `<div>Altitud: <span style="color:#E8E6E0;">${p.altitude} m</span></div>` : ''}
        </div>
        <a href="https://network.satnogs.org/stations/${p.id || ''}/" target="_blank" style="${linkStyle}margin-top:7px;color:#AB47BC;border:1px solid #AB47BC66;background:#AB47BC1a;">SATNOGS</a>
      </div>`);
    });

    // ── Bases militares ──
    const MILBASE_TYPE: Record<string, string> = { base: 'Base militar', naval_base: 'Base naval', airfield: 'Aeródromo militar', barracks: 'Cuartel', training_area: 'Campo de entrenamiento', depot: 'Depósito militar', bunker: 'Búnker', zone: 'Recinto militar', wikidata: 'Instalación militar' };
    map.on('click', 'milbase-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const tipo = MILBASE_TYPE[p.t as string] || 'Instalación militar';
      popup(coords, `<div style="${pStyle}border:1px solid #EF535055;min-width:180px;">
        <div style="color:#EF5350;font-size:12px;font-weight:700;margin-bottom:3px;">${p.name || 'Instalación militar'}</div>
        <div style="font-size:9.5px;color:#aaa;">${tipo} · ${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</div>
        <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},15z/data=!3m1!1e3" target="_blank" style="${linkStyle}margin-top:7px;color:#EF5350;border:1px solid #EF535066;background:#EF53501a;">VISTA SATÉLITE</a>
      </div>`);
    });

    // ── Calidad del aire ──
    map.on('click', 'aq-dots', e => {
      const p = e.features?.[0]?.properties; if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const col = p.color || '#66BB6A';
      popup(coords, `<div style="${pStyle}border:1px solid ${col}55;min-width:180px;">
        <div style="color:${col};font-size:13px;font-weight:700;margin-bottom:4px;">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:9px;">
          <div><span style="color:#5C5A54;">AQI (US)</span><br/><span style="color:${col};font-weight:700;font-size:14px;">${p.aqi}</span></div>
          <div><span style="color:#5C5A54;">NIVEL</span><br/><span style="color:${col};font-weight:600;">${p.level}</span></div>
          ${p.pm25 != null ? `<div><span style="color:#5C5A54;">PM2.5</span><br/><span style="color:#E8E6E0;">${p.pm25} µg/m³</span></div>` : ''}
        </div>
      </div>`);
    });

    // ── Weather Events (NASA EONET) ──
    map.on('click', 'weather-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const iconEmoji = p.icon === 'cyclone' ? '' : p.icon === 'volcano' ? '' : '';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(224,64,251,0.3);">
        <div style="color:#E040FB;font-size:14px;font-weight:700;margin-bottom:6px;">${iconEmoji} ${p.type || 'Evento Meteorológico'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.title || 'Evento desconocido'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">GRAVEDAD</span><br/><span style="color:${p.severity === 'high' ? '#FF1744' : '#FFD700'};">${(p.severity||'baja').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDENADAS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <div style="display:flex;gap:6px;">
          ${p.source ? `<a href="${p.source}" target="_blank" style="${linkStyle}color:#E040FB;border:1px solid rgba(224,64,251,0.4);background:rgba(224,64,251,0.1);">FUENTE</a>` : ''}
          <a href="https://eonet.gsfc.nasa.gov/api/v3/events/${p.id || ''}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">NASA EONET</a>
        </div>
      </div>`);
    });

    // ── Nuclear Infrastructure ──
    map.on('click', 'infra-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const statusColor = p.status.includes('SEISMIC RISK') ? '#FF9500' : p.status === 'Active Conflict Zone' ? '#FF1744' : p.status === 'Operational' ? '#76FF03' : '#757575';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(118,255,3,0.3);">
        <div style="color:#76FF03;font-size:14px;font-weight:700;margin-bottom:4px;">${p.name || 'Instalación Nuclear'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">ESTADO</span><br/><span style="color:${statusColor};">${p.status || '—'}</span></div>
          <div><span style="color:#5C5A54;">CIUDAD</span><br/><span style="color:#E8E6E0;">${p.city || '—'}, ${p.country || ''}</span></div>
          <div><span style="color:#5C5A54;">REACTORES</span><br/><span style="color:#76FF03;">${p.reactors || '—'}</span></div>
          <div><span style="color:#5C5A54;">CAPACIDAD</span><br/><span style="color:#E8E6E0;">${p.capacityMW ? p.capacityMW.toLocaleString() + ' MW' : '—'}</span></div>
          <div><span style="color:#5C5A54;">OPERADOR</span><br/><span style="color:#E8E6E0;">${p.owner || '—'}</span></div>
          <div><span style="color:#5C5A54;">COORDENADAS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},14z/data=!3m1!1e3" target="_blank" style="${linkStyle}color:#76FF03;border:1px solid rgba(118,255,3,0.4);background:rgba(118,255,3,0.1);">VISTA SATÉLITE</a>
      </div>`);
    });

    // ── Centrales eléctricas (por fuente) ──
    map.on('click', 'power-plants-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const fuelColors: Record<string, string> = { Solar:'#FFD600', Wind:'#4FC3F7', Hydro:'#2979FF', Nuclear:'#FF1744', Coal:'#455A64', Gas:'#FF9100', Oil:'#8D6E63', Biomass:'#8BC34A', Geothermal:'#E91E63', Waste:'#9E9E9E', Storage:'#00E5FF' };
      const fc = fuelColors[p.fuel] || '#BDBDBD';
      const fuelES: Record<string, string> = { Solar:'Solar', Wind:'Eólica', Hydro:'Hidroeléctrica', Nuclear:'Nuclear', Coal:'Carbón', Gas:'Gas natural', Oil:'Petróleo', Biomass:'Biomasa', Geothermal:'Geotérmica', Waste:'Residuos', Storage:'Almacenamiento', Cogeneration:'Cogeneración', 'Wave and Tidal':'Mareomotriz' };
      popup(coords, `<div style="${pStyle}border:1px solid ${fc}55;">
        <div style="color:${fc};font-size:13px;font-weight:700;margin-bottom:4px;">${p.name || 'Central eléctrica'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.6;">
          <span style="color:#5C5A54;">FUENTE:</span> <span style="color:${fc};font-weight:600;">${fuelES[p.fuel] || p.fuel || '—'}</span><br/>
          <span style="color:#5C5A54;">CAPACIDAD:</span> ${p.mw ? Number(p.mw).toLocaleString() + ' MW' : '—'}<br/>
          <span style="color:#5C5A54;">PAÍS:</span> ${p.country || '—'}
        </div>
        <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},14z/data=!3m1!1e3" target="_blank" style="${linkStyle}color:${fc};border:1px solid ${fc}66;background:${fc}1a;">VISTA SATÉLITE</a>
      </div>`);
    });

    // ── Infraestructura crítica (aeropuertos / refinerías / presas) ──
    map.on('click', 'critical-infra-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const tc = p.type === 'airport' ? '#00E5FF' : p.type === 'refinery' ? '#FF6D00' : p.type === 'dam' ? '#2979FF' : '#BDBDBD';
      const tES = p.type === 'airport' ? 'Aeropuerto' : p.type === 'refinery' ? 'Refinería' : p.type === 'dam' ? 'Presa' : 'Infraestructura';
      popup(coords, `<div style="${pStyle}border:1px solid ${tc}55;">
        <div style="color:${tc};font-size:13px;font-weight:700;margin-bottom:4px;">${p.name || tES}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;">${tES}${p.country ? ' · ' + p.country : ''}</div>
        <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},14z/data=!3m1!1e3" target="_blank" style="${linkStyle}color:${tc};border:1px solid ${tc}66;background:${tc}1a;">VISTA SATÉLITE</a>
      </div>`);
    });

    // ── Maritime Ports & Naval Bases ──
    map.on('click', 'maritime-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const typeColor = p.type === 'naval' ? '#FF3D3D' : p.type === 'energy' ? '#FF9500' : p.type === 'container' ? '#00BCD4' : '#26A69A';
      const typeLabel = p.type === 'naval' ? 'BASE NAVAL' : p.type === 'energy' ? 'TERMINAL ENERGÉTICA' : p.type === 'container' ? 'PUERTO DE CONTENEDORES' : 'PUERTO COMERCIAL';
      const volLabel = p.type === 'energy' ? 'Volumen (crudo)' : p.type === 'container' ? 'Volumen de carga' : 'Volumen';
      const congCol = p.congestion === 'SEVERA' ? '#FF1744' : p.congestion === 'CONGESTIONADO' ? '#FF9500' : '#00E676';

      // Sección "en vivo" (solo puertos principales con cálculo de congestión)
      const liveHtml = p.congestion ? `
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:8px;letter-spacing:0.1em;color:#5C5A54;margin-bottom:4px;">EN VIVO (AIS)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
            <div><span style="color:#5C5A54;font-size:9px;">CONGESTIÓN</span><br/><span style="color:${congCol};font-weight:bold;font-size:10px;">${p.congestion}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">ESPERA EST.</span><br/><span style="color:#E8E6E0;font-weight:bold;font-size:10px;">${p.dwell_time || '—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">BUQUES CERCA</span><br/><span style="color:#E8E6E0;font-weight:bold;font-size:10px;">${p.live_nearby ?? 0}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">EN ESPERA</span><br/><span style="color:#E8E6E0;font-weight:bold;font-size:10px;">${p.live_waiting ?? 0}</span></div>
          </div>
        </div>` : '';

      popup(coords, `<div style="${pStyle}border:1px solid ${typeColor}40;min-width:210px;">
        <div style="color:${typeColor};font-weight:bold;font-size:12px;margin-bottom:3px;">${p.name}</div>
        <div style="color:#999;font-size:9px;margin-bottom:7px;">${typeLabel} · ${p.country || '—'}</div>
        <div style="font-size:9.5px;color:#aaa;line-height:1.7;">
          ${p.volume ? `<div>${volLabel}: <span style="color:${typeColor};font-weight:bold;">${p.volume}</span></div>` : ''}
          ${p.rank ? `<div>Ranking mundial: <span style="color:${typeColor};font-weight:bold;">#${p.rank}</span></div>` : ''}
          ${p.fleet ? `<div>Flota: <span style="color:${typeColor};font-weight:bold;">${p.fleet}</span></div>` : ''}
          <div>Coordenadas: <span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        ${liveHtml}
        <a href="https://www.marinetraffic.com/en/ais/home/centerx:${coords[0].toFixed(2)}/centery:${coords[1].toFixed(2)}/zoom:11" target="_blank" style="${linkStyle}margin-top:8px;color:${typeColor};border:1px solid ${typeColor}66;background:${typeColor}1a;">TRÁFICO EN VIVO</a>
      </div>`);
    });

    // ── Maritime Chokepoints ──
    map.on('click', 'choke-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const riskCol = p.risk === 'CRITICAL' ? '#FF1744' : p.risk === 'HIGH' ? '#FF9500' : p.risk === 'ELEVATED' ? '#FFD700' : '#00E676';
      popup(coords, `<div style="${pStyle}border:1px solid ${riskCol}40;">
        <div style="color:#FF9500;font-weight:bold;font-size:11px;margin-bottom:4px;">${p.name}</div>
        <div style="font-size:9px;color:#aaa;">Tráfico: <span style="color:#fff;">${p.traffic}</span></div>
        <div style="font-size:9px;color:#aaa;">Riesgo: <span style="color:${riskCol};font-weight:bold;">${p.risk}</span></div>
      </div>`);
    });

    // ── Live News (opens feed viewer) ──
    map.on('click', 'news-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      onEntityClick?.({
        type: 'live_news',
        name: p.name,
        city: p.city,
        country: p.country,
        url: p.url,
        category: p.category,
        embed_allowed: p.embed_allowed !== false && p.embed_allowed !== 'false',
      });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Day/Night
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const update = () => {
      const src = map.getSource('day-night') as any;
      if (!src) return;
      if (!activeLayers.day_night) { src.setData(EMPTY_FC); return; }
      src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [computeSolarTerminator()] }, properties: {} }] });
    };
    update();
    const iv = setInterval(update, 300000); // 5 min (was 1 min — shadow barely moves)
    return () => clearInterval(iv);
  }, [mapReady, activeLayers.day_night]);

  // Helper to set GeoJSON
  const setGeo = useCallback((source: string, features: any[]) => {
    const src = mapRef.current?.getSource(source) as any;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, []);

  const setVis = useCallback((ids: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    ids.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
  }, []);

  // Flight data → GeoJSON (GPU rendered)
  useEffect(() => {
    if (!mapReady) return;
    const toFeatures = (arr: any[]) => (arr || []).map((f: any) => ({
      type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
      properties: { callsign: f.callsign, heading: f.heading || 0, alt: f.alt, model: f.model, speed_knots: f.speed_knots, registration: f.registration, icao24: f.icao24 },
    }));
    setGeo('flights', activeLayers.flights ? toFeatures(data.commercial_flights) : []);
    setGeo('private-fl', activeLayers.private ? toFeatures(data.private_flights) : []);
    setGeo('jets', activeLayers.jets ? toFeatures(data.private_jets) : []);
    setGeo('military', activeLayers.military ? toFeatures(data.military_flights) : []);
  }, [mapReady, data.commercial_flights, data.private_flights, data.private_jets, data.military_flights, activeLayers.flights, activeLayers.private, activeLayers.jets, activeLayers.military]);

  // ── DECOUPLED LAYER RENDERERS (Performance Optimized) ──

  useEffect(() => {
    if (!mapReady) return;
    setGeo('earthquakes', activeLayers.earthquakes && data.earthquakes ? data.earthquakes.map((eq: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] }, properties: { magnitude: eq.magnitude, place: eq.place } })) : []);
  }, [mapReady, data.earthquakes, activeLayers.earthquakes, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('satellites', activeLayers.satellites && data.satellites ? data.satellites.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, color: s.color, mission: s.mission, alt: s.alt, noradId: s.noradId } })) : []);
  }, [mapReady, data.satellites, activeLayers.satellites, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('gdelt', activeLayers.global_incidents && data.gdelt ? data.gdelt.map((e: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lng, e.lat] }, properties: { name: e.name } })) : []);
  }, [mapReady, data.gdelt, activeLayers.global_incidents, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('traffic-incidents', activeLayers.traffic_incidents && data.traffic_incidents ? data.traffic_incidents.map((t: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [t.lng, t.lat] }, properties: { kind: t.kind, road: t.road } })) : []);
  }, [mapReady, data.traffic_incidents, activeLayers.traffic_incidents, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('gps-jamming', activeLayers.gps_jamming && data.gps_jamming ? data.gps_jamming.map((z: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [z.lng, z.lat] }, properties: { severity: z.severity } })) : []);
  }, [mapReady, data.gps_jamming, activeLayers.gps_jamming, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('cctv', activeLayers.cctv && data.cameras ? data.cameras.map((c: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { id: c.id, name: c.name, city: c.city, country: c.country, source: c.source, feed_url: c.feed_url, stream_url: c.stream_url, stream_type: c.stream_type, external_url: c.external_url } })) : []);
  }, [mapReady, data.cameras, activeLayers.cctv, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('fires', activeLayers.fires && data.fires ? data.fires.map((f: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { brightness: f.brightness } })) : []);
  }, [mapReady, data.fires, activeLayers.fires, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('weather', activeLayers.weather && data.weather_events ? data.weather_events.map((w: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [w.lng, w.lat] }, properties: { title: w.title, type: w.type, icon: w.icon, severity: w.severity, source: w.source, id: w.id } })) : []);
  }, [mapReady, data.weather_events, activeLayers.weather, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('infrastructure', activeLayers.infrastructure && data.infrastructure ? data.infrastructure.map((i: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [i.lng, i.lat] }, properties: { name: i.name, city: i.city, country: i.country, status: i.status, reactors: i.reactors, capacityMW: i.capacityMW, owner: i.owner } })) : []);
  }, [mapReady, data.infrastructure, activeLayers.infrastructure, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const fuels = new Set<string>();
    if (activeLayers.power_solar) fuels.add('Solar');
    if (activeLayers.power_wind) fuels.add('Wind');
    if (activeLayers.power_hydro) fuels.add('Hydro');
    if (activeLayers.power_nuclear) fuels.add('Nuclear');
    if (activeLayers.power_coal) fuels.add('Coal');
    if (activeLayers.power_gas) fuels.add('Gas');
    if (activeLayers.power_oil) fuels.add('Oil');
    if (activeLayers.power_other) ['Biomass','Geothermal','Waste','Storage','Cogeneration','Petcoke','Wave and Tidal','Other'].forEach(f => fuels.add(f));
    const pp = fuels.size && data.power_plants ? data.power_plants.filter((p: any) => fuels.has(p.fuel)) : [];
    setGeo('power-plants', pp.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { name: p.name, country: p.country, fuel: p.fuel, mw: p.mw } })));
  }, [mapReady, data.power_plants, activeLayers.power_solar, activeLayers.power_wind, activeLayers.power_hydro, activeLayers.power_nuclear, activeLayers.power_coal, activeLayers.power_gas, activeLayers.power_oil, activeLayers.power_other, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('critical-infra', activeLayers.critical_infra && data.critical_infra ? data.critical_infra.map((i: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [i.lng, i.lat] }, properties: { name: i.name, type: i.type, country: i.country } })) : []);
  }, [mapReady, data.critical_infra, activeLayers.critical_infra, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('submarine-cables', activeLayers.submarine_cables && data.cables ? (data.cables.features || []) : []);
  }, [mapReady, data.cables, activeLayers.submarine_cables, setGeo]);

  // ── Lote Clima y Tierra: auroras, placas tectónicas, estado del mar ──
  useEffect(() => {
    if (!mapReady) return;
    setGeo('tectonics', activeLayers.tectonics && data.tectonics_fc?.features ? data.tectonics_fc.features : []);
    setGeo('aurora', activeLayers.aurora && Array.isArray(data.aurora)
      ? data.aurora.map((a: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lng, a.lat] }, properties: { p: a.p } }))
      : []);
    setGeo('sea-state', activeLayers.sea_state && Array.isArray(data.sea_state)
      ? data.sea_state.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { h: s.h, color: s.color } }))
      : []);
    // Lote Energía y Recursos
    setGeo('pipelines', activeLayers.pipelines && data.pipelines_fc?.features ? data.pipelines_fc.features : []);
    setGeo('powerlines', activeLayers.powerlines && data.powerlines_fc?.features ? data.powerlines_fc.features : []);
    setGeo('datacenters', activeLayers.datacenters && Array.isArray(data.datacenters)
      ? data.datacenters.map((d: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [d.lng, d.lat] }, properties: { name: d.name } })) : []);
    setGeo('oilgas', activeLayers.oilgas && Array.isArray(data.oilgas)
      ? data.oilgas.map((f: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { name: f.name, type: f.type, color: f.color, country: f.country, major: f.major || 0 } })) : []);
    setGeo('minerals', activeLayers.minerals && Array.isArray(data.minerals)
      ? data.minerals.map((m: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [m.lng, m.lat] }, properties: { name: m.name, m: m.m, color: m.color, country: m.country, major: m.major || 0 } })) : []);
    setGeo('agriculture', activeLayers.agriculture && data.agriculture_fc?.features ? data.agriculture_fc.features : []);
    // Lote Geopolítica
    setGeo('countries', (activeLayers.alliances || activeLayers.sanctions || activeLayers.milspend || activeLayers.regime || activeLayers.nukes || activeLayers.election || activeLayers.press_freedom || activeLayers.corruption || activeLayers.hdi || activeLayers.gdp_pc || activeLayers.econ_blocs) && data.geopolitics_fc?.features ? data.geopolitics_fc.features : []);
    setGeo('disputes', activeLayers.disputes && Array.isArray(data.disputes)
      ? data.disputes.map((d: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [d.lng, d.lat] }, properties: { name: d.name, parties: d.parties } })) : []);
    setGeo('orgs', activeLayers.orgs && Array.isArray(data.orgs)
      ? data.orgs.map((o: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [o.lng, o.lat] }, properties: { name: o.name, city: o.city } })) : []);
    // Lote Espacio y Marítimo
    setGeo('sea-lanes', activeLayers.maritime_routes && data.sea_lanes_fc?.features ? data.sea_lanes_fc.features : []);
    setGeo('lighthouses', activeLayers.lighthouses && Array.isArray(data.lighthouses)
      ? data.lighthouses.map((l: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [l.lng, l.lat] }, properties: { name: l.name } })) : []);
    setGeo('piracy', activeLayers.piracy && Array.isArray(data.piracy)
      ? data.piracy.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { name: p.name, risk: p.risk, color: p.color } })) : []);
  }, [mapReady, data.tectonics_fc, data.aurora, data.sea_state, data.pipelines_fc, data.powerlines_fc, data.datacenters, data.oilgas, data.minerals, data.agriculture_fc, data.geopolitics_fc, data.disputes, data.orgs, data.sea_lanes_fc, data.lighthouses, data.piracy, activeLayers.tectonics, activeLayers.aurora, activeLayers.sea_state, activeLayers.pipelines, activeLayers.powerlines, activeLayers.datacenters, activeLayers.oilgas, activeLayers.minerals, activeLayers.agriculture, activeLayers.alliances, activeLayers.sanctions, activeLayers.milspend, activeLayers.regime, activeLayers.nukes, activeLayers.election, activeLayers.press_freedom, activeLayers.corruption, activeLayers.hdi, activeLayers.gdp_pc, activeLayers.econ_blocs, activeLayers.disputes, activeLayers.orgs, activeLayers.maritime_routes, activeLayers.lighthouses, activeLayers.piracy, setGeo]);

  // ── Radar de lluvia (RainViewer) — capa raster dinámica ──
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const rv = data.rainviewer;
    const want = activeLayers.rainfall && rv?.host && rv?.path;
    try {
      if (want) {
        const url = `${rv.host}${rv.path}/256/{z}/{x}/{y}/2/1_1.png`;
        const existing = (map.getSource('rainviewer') as any);
        if (existing && (map as any).__rvPath !== rv.path) {
          // El frame cambió: recreamos la fuente con los tiles nuevos
          if (map.getLayer('rainviewer-layer')) map.removeLayer('rainviewer-layer');
          map.removeSource('rainviewer');
        }
        if (!map.getSource('rainviewer')) {
          map.addSource('rainviewer', { type: 'raster', tiles: [url], tileSize: 256, attribution: 'RainViewer' } as any);
          (map as any).__rvPath = rv.path;
          map.addLayer({ id: 'rainviewer-layer', type: 'raster', source: 'rainviewer', paint: { 'raster-opacity': 0.6 } });
        } else if (map.getLayer('rainviewer-layer')) {
          map.setLayoutProperty('rainviewer-layer', 'visibility', 'visible');
        }
      } else if (map.getLayer('rainviewer-layer')) {
        map.setLayoutProperty('rainviewer-layer', 'visibility', 'none');
      }
    } catch { /* noop */ }
  }, [mapReady, data.rainviewer, activeLayers.rainfall]);

  useEffect(() => {
    if (!mapReady) return;
    // Filtro por tipo de puerto: si no hay ninguno activo, se muestran todos.
    const portTypeMap: Record<string, string> = { container: 'port_container', energy: 'port_energy', naval: 'port_naval', port: 'port_commercial' };
    const activePortTypes = Object.keys(portTypeMap).filter(t => activeLayers[portTypeMap[t]]);
    const portFilter: Set<string> | null = activePortTypes.length ? new Set(activePortTypes) : null;
    const showPorts = activeLayers.maritime || activePortTypes.length > 0;
    setGeo('maritime', showPorts && data.maritime_ports
      ? data.maritime_ports.filter((p: any) => !portFilter || portFilter.has(p.type)).map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { name: p.name, country: p.country, type: p.type, volume: p.volume, fleet: p.fleet, rank: p.rank, congestion: p.congestion, dwell_time: p.dwell_time, live_nearby: p.live_nearby, live_waiting: p.live_waiting } }))
      : []);
    setGeo('maritime-choke', activeLayers.maritime && data.maritime_chokepoints ? data.maritime_chokepoints.map((c: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { name: c.name, traffic: c.traffic, risk: c.risk } })) : []);
    // Filtro por tipo de buque: si no hay ningún tipo activo, se muestran todos.
    const shipTypeKeys = ['cargo','tanker','passenger','fishing','tug','highspeed','military','other'];
    const activeShipTypes = shipTypeKeys.filter(k => activeLayers['ship_' + k]);
    const shipFilter: Set<string> | null = activeShipTypes.length ? new Set(activeShipTypes) : null;
    const showShips = activeLayers.maritime || activeShipTypes.length > 0;
    setGeo('maritime-ships', showShips && data.maritime_ships
      ? data.maritime_ships
          .filter((s: any) => !shipFilter || shipFilter.has(s.type || 'other'))
          .map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name || s.mmsi?.toString(), type: s.type || 'other', speed: s.speed, heading: s.heading, course: s.course, destination: s.destination, draught: s.draught, flag: s.flag, mmsi: s.mmsi, callsign: s.callsign, imo: s.imo, length: s.length, beam: s.beam, moored: !!s.moored } }))
      : []);
  }, [mapReady, data.maritime_ports, data.maritime_chokepoints, data.maritime_ships, activeLayers.maritime, activeLayers.ship_cargo, activeLayers.ship_tanker, activeLayers.ship_passenger, activeLayers.ship_fishing, activeLayers.ship_tug, activeLayers.ship_highspeed, activeLayers.ship_military, activeLayers.ship_other, activeLayers.port_container, activeLayers.port_energy, activeLayers.port_naval, activeLayers.port_commercial, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('balloons', activeLayers.balloons && data.balloons ? data.balloons.map((b: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] }, properties: { callsign: b.callsign, type: b.type, status: b.status, altitude: b.altitude, speed: b.speed, verticalRate: b.verticalRate, temperature: b.temperature, color: b.color } })) : []);
  }, [mapReady, data.balloons, activeLayers.balloons, setGeo]);

  // ── Accidentes geográficos ──
  useEffect(() => {
    if (!mapReady) return;
    // Puntos individuales: picos (geo_mountains) + cascadas/otros puntuales (geo_features)
    const anyPoints = activeLayers.geo_mountains || activeLayers.geo_features;
    // Áreas sombreadas: cordilleras (geo_mountains) + desiertos (geo_deserts) + otros relieves (geo_features)
    const anyAreas = activeLayers.geo_mountains || activeLayers.geo_deserts || activeLayers.geo_features;
    setGeo('geo-rivers', activeLayers.geo_rivers && data.geo_rivers_fc?.features ? data.geo_rivers_fc.features : []);
    setGeo('geo-areas', anyAreas && data.geo_areas_fc?.features ? data.geo_areas_fc.features : []);
    setGeo('geo-points', anyPoints && Array.isArray(data.geo_points)
      ? data.geo_points.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { name: p.name, cat: p.cat, elev: p.elev ?? null } }))
      : []);
  }, [mapReady, data.geo_rivers_fc, data.geo_areas_fc, data.geo_points, activeLayers.geo_rivers, activeLayers.geo_mountains, activeLayers.geo_deserts, activeLayers.geo_features, setGeo]);

  // ── GDACS / huracanes / volcanes / aeropuertos / lanzamientos / ISS ──
  useEffect(() => {
    if (!mapReady) return;
    setGeo('gdacs', activeLayers.gdacs && Array.isArray(data.gdacs) ? data.gdacs.map((e: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lng, e.lat] }, properties: { name: e.name, type_es: e.type_es, alert: e.alert, description: e.description, country: e.country, date: e.date, url: e.url } })) : []);
    setGeo('hurricanes', activeLayers.hurricanes && Array.isArray(data.hurricanes) ? data.hurricanes.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, class_es: s.class_es, wind_kt: s.wind_kt, pressure_mb: s.pressure_mb, movement: s.movement } })) : []);
    setGeo('volcanoes', activeLayers.volcanoes && Array.isArray(data.volcanoes) ? data.volcanoes.map((v: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [v.lng, v.lat] }, properties: { name: v.name, vtype: v.type, elev: v.elev, country: v.country, last: v.last } })) : []);
    setGeo('airports', activeLayers.airports && Array.isArray(data.airports) ? data.airports.map((a: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lng, a.lat] }, properties: { name: a.name, iata: a.iata, atype: a.type, country: a.country, city: a.city } })) : []);
    setGeo('launches', activeLayers.launches && Array.isArray(data.launches) ? data.launches.map((l: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [l.lng, l.lat] }, properties: { name: l.name, net: l.net, status: l.status, pad: l.pad, location: l.location, provider: l.provider } })) : []);
    setGeo('iss', activeLayers.iss && data.iss && Number.isFinite(data.iss.lat) ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [data.iss.lng, data.iss.lat] }, properties: { altitude_km: data.iss.altitude_km, velocity_kmh: data.iss.velocity_kmh } }] : []);
    // Frente de Ucrania: la fuente es un FeatureCollection completo (polígonos + líneas)
    const fcFeats = activeLayers.frontline && data.frontline_fc?.features ? data.frontline_fc.features : [];
    setGeo('frontline', fcFeats);
    setGeo('trains', activeLayers.trains && Array.isArray(data.trains) ? data.trains.map((t: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [t.lng, t.lat] }, properties: { number: t.number, speed: t.speed, country: t.country, route: t.route || '' } })) : []);
    setGeo('railways', activeLayers.railways && data.railways_fc?.features ? data.railways_fc.features : []);
    setGeo('railways-hs', activeLayers.railways && data.railways_hs_fc?.features ? data.railways_hs_fc.features : []);
    setGeo('railways-commuter', activeLayers.railways && data.railways_commuter_fc?.features ? data.railways_commuter_fc.features : []);
    setGeo('satnogs', activeLayers.satnogs && Array.isArray(data.satnogs) ? data.satnogs.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, status: s.status, bands: s.bands, altitude: s.altitude } })) : []);
    setGeo('military-bases', activeLayers.military_bases && Array.isArray(data.military_bases) ? data.military_bases.map((b: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] }, properties: { name: b.name, t: b.t || '' } })) : []);
    setGeo('air-quality', activeLayers.air_quality && Array.isArray(data.air_quality) ? data.air_quality.map((a: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lng, a.lat] }, properties: { name: a.name, aqi: a.aqi, pm25: a.pm25, level: a.level, color: a.color } })) : []);
  }, [mapReady, data.gdacs, data.hurricanes, data.volcanoes, data.airports, data.launches, data.iss, data.frontline_fc, data.trains, data.railways_fc, data.railways_hs_fc, data.railways_commuter_fc, data.satnogs, data.military_bases, data.air_quality, activeLayers.gdacs, activeLayers.hurricanes, activeLayers.volcanoes, activeLayers.airports, activeLayers.launches, activeLayers.iss, activeLayers.frontline, activeLayers.trains, activeLayers.railways, activeLayers.satnogs, activeLayers.military_bases, activeLayers.air_quality, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('radiation', activeLayers.radiation && data.radiation ? data.radiation.map((r: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: { name: r.name, city: r.city, country: r.country, reading: r.reading, status: r.status, network: r.network } })) : []);
  }, [mapReady, data.radiation, activeLayers.radiation, setGeo]);

  // ══ Politeia SDK — Lattice Sensor Mesh ══
  // Multi-waypoint routes tracing real-world shipping lanes, air corridors, and intel lines
  useEffect(() => {
    if (!mapReady) return;
    setGeo('sdk-entities', []);

    if (!activeLayers.sdk_stream) {
      setGeo('sdk-links', []);
      return;
    }

    // Spline curve generator for ultra-smooth paths
    const splineCurve = (points: [number,number][], segments = 15): [number,number][] => {
      if (points.length < 2) return points;
      const res: [number,number][] = [];
      const p = [...points];
      p.unshift(p[0]); // Duplicate first
      p.push(p[p.length-1]); // Duplicate last
      for (let i = 1; i < p.length - 2; i++) {
        for (let t = 0; t <= 1; t += 1/segments) {
          const t2 = t*t, t3 = t2*t;
          const x = 0.5 * ((2*p[i][0]) + (-p[i-1][0] + p[i+1][0])*t + (2*p[i-1][0] - 5*p[i][0] + 4*p[i+1][0] - p[i+2][0])*t2 + (-p[i-1][0] + 3*p[i][0] - 3*p[i+1][0] + p[i+2][0])*t3);
          const y = 0.5 * ((2*p[i][1]) + (-p[i-1][1] + p[i+1][1])*t + (2*p[i-1][1] - 5*p[i][1] + 4*p[i+1][1] - p[i+2][1])*t2 + (-p[i-1][1] + 3*p[i][1] - 3*p[i+1][1] + p[i+2][1])*t3);
          res.push([x,y]);
        }
      }
      return res;
    };

    // Route builder — applies spline smoothing
    const route = (waypoints: [number,number][], props: any) => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: splineCurve(waypoints) },
      properties: props,
    });

    const links: any[] = [];

    // ── MARITIME: Real shipping lane waypoints (strictly over water) ──

    links.push(route([
      [121.47,31.23], [122.5,30.5], [120.0,26.0], [119.0,24.0], [116.0,21.0], [111.0,15.0], [109.0,10.0], [105.0,4.0], [103.84,1.26]
    ], { fromName:'Shanghai', toName:'Singapore', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [103.84,1.26], [103.0,1.8], [100.0,4.0], [96.0,6.0], [88.0,6.0], [80.0,5.5], [70.0,8.0], [60.0,12.0], [52.0,14.0], [45.0,12.0], [43.33,12.58]
    ], { fromName:'Singapore', toName:'Bab el-Mandeb', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [43.33,12.58], [41.0,17.0], [38.0,21.0], [35.0,25.0], [32.34,30.43]
    ], { fromName:'Bab el-Mandeb', toName:'Suez Canal', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [32.34,30.43], [32.3,31.3], [31.5,31.8], [26.0,34.0], [18.0,35.0], [15.0,36.0], [11.0,37.5], [6.0,38.0], [0.0,36.5], [-5.35,36.0]
    ], { fromName:'Suez Canal', toName:'Gibraltar', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [-5.35,36.0], [-9.0,36.0], [-10.0,38.0], [-10.0,43.0], [-8.0,45.0], [-5.5,48.5], [-2.0,49.5], [1.5,51.0], [3.5,51.5], [4.50,51.90]
    ], { fromName:'Gibraltar', toName:'Rotterdam', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [121.47,31.23], [123.0,30.5], [130.0,30.0], [140.0,34.0], [150.0,40.0], [165.0,43.0], [180.0,44.0], [200.0,43.0], [220.0,38.0], [235.0,34.0], [241.73,33.74]
    ], { fromName:'Shanghai', toName:'Los Angeles', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [103.84,1.26], [105.0,4.0], [109.0,10.0], [111.0,15.0], [116.0,21.0], [119.0,24.0], [120.0,26.0], [124.0,30.0], [127.0,32.0], [129.04,35.10]
    ], { fromName:'Singapore', toName:'Busan', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [4.50,51.90], [3.5,51.5], [1.5,51.0], [-2.0,49.5], [-5.5,48.5], [-8.0,45.0], [-10.0,43.0], [-10.0,38.0], [-18.0,25.0], [-25.0,15.0], [-20.0,0.0], [-10.0,-20.0], [5.0,-32.0], [18.47,-34.36]
    ], { fromName:'Rotterdam', toName:'Cape of Good Hope', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [18.47,-34.36], [22.0,-35.0], [30.0,-33.0], [40.0,-20.0], [45.0,-10.0], [52.0,5.0], [56.0,14.0], [59.0,22.0], [56.25,26.57]
    ], { fromName:'Cape of Good Hope', toName:'Strait of Hormuz', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [-79.68,9.08], [-79.0,11.0], [-75.0,15.0], [-72.0,20.0], [-65.0,30.0], [-50.0,42.0], [-30.0,48.0], [-10.0,49.0], [-5.5,48.5], [-2.0,49.5], [1.5,51.0], [4.50,51.90]
    ], { fromName:'Panama', toName:'Rotterdam', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [-118.27,33.74], [-118.0,32.0], [-115.0,26.0], [-105.0,18.0], [-95.0,13.0], [-85.0,8.0], [-80.0,7.5], [-79.68,9.08]
    ], { fromName:'Los Angeles', toName:'Panama', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [-46.31,-23.95], [-44.0,-25.0], [-30.0,-28.0], [-15.0,-30.0], [0.0,-32.0], [10.0,-33.0], [18.47,-34.36]
    ], { fromName:'Santos', toName:'Cape of Good Hope', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [55.06,25.01], [54.5,25.5], [53.0,25.8], [51.0,26.0], [50.16,26.64]
    ], { fromName:'Dubai', toName:'Ras Tanura', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [79.84,6.94], [80.0,5.5], [88.0,6.0], [96.0,6.0], [100.0,4.0], [103.0,1.8], [103.84,1.26]
    ], { fromName:'Colombo', toName:'Singapore', domain:'SEA', source:'AIS Maritime' }));

    // ── AIR CORRIDORS: High altitude splined curves ──

    links.push(route([
      [-73.78,40.64], [-65.0,44.0], [-50.0,50.0], [-35.0,53.0], [-20.0,53.5], [-10.0,52.5], [-0.46,51.47]
    ], { fromName:'JFK New York', toName:'London Heathrow', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [-0.46,51.47], [8.0,48.0], [18.0,44.0], [28.81,41.27], [35.0,37.0], [42.0,32.0], [50.0,28.0], [55.36,25.25]
    ], { fromName:'London', toName:'Dubai', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [55.36,25.25], [65.0,20.0], [75.0,15.0], [85.0,10.0], [95.0,5.0], [103.99,1.36], [110.0,8.0], [118.0,16.0], [125.0,25.0], [132.0,30.0], [139.79,35.61]
    ], { fromName:'Dubai', toName:'Tokyo', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [139.79,35.61], [148.0,38.0], [158.0,41.0], [170.0,43.0], [180.0,44.0], [195.0,43.0], [210.0,41.0], [225.0,38.0], [235.0,36.0], [241.59,33.94]
    ], { fromName:'Tokyo', toName:'LAX', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [-118.41,33.94], [-110.0,35.0], [-100.0,37.0], [-90.0,39.0], [-80.0,40.0], [-73.78,40.64]
    ], { fromName:'LAX', toName:'JFK', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [28.81,41.27], [40.0,42.0], [52.0,42.5], [65.0,43.0], [78.0,43.0], [90.0,42.5], [103.0,41.5], [116.60,40.08]
    ], { fromName:'Istanbul', toName:'Beijing', domain:'AIR', source:'ADS-B / OpenSky' }));

    // ── NAVAL/INTEL: Fleet deployment corridors (smooth curves) ──

    links.push(route([
      [-76.33,36.95], [-68.0,38.0], [-55.0,42.0], [-40.0,46.0], [-25.0,49.0], [-10.0,50.5], [-1.11,50.80]
    ], { fromName:'Norfolk NAS', toName:'Portsmouth (Royal Navy)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [-76.33,36.95], [-65.0,37.0], [-45.0,36.5], [-25.0,36.0], [-10.0,36.0], [-5.35,36.0], [2.0,37.0], [10.0,38.0], [20.0,37.0], [28.0,36.0], [35.89,34.89]
    ], { fromName:'Norfolk NAS', toName:'Tartus (Russian Base)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [-117.15,32.69], [-130.0,29.0], [-145.0,25.0], [-157.97,21.35], [-170.0,25.0], [-180.0,29.0], [-192.0,31.0], [-205.0,33.0], [-215.0,34.0], [-220.33,35.28]
    ], { fromName:'San Diego NB', toName:'Yokosuka (7th Fleet)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [139.67,35.28], [130.0,30.0], [120.0,22.0], [110.0,12.0], [104.01,1.33], [95.0,5.0], [85.0,10.0], [78.0,15.0], [72.84,18.93]
    ], { fromName:'Yokosuka', toName:'Mumbai (Indian Navy)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [33.42,69.07], [35.0,65.0], [30.0,58.0], [28.0,52.0], [30.0,46.0], [33.0,42.0], [30.0,38.0], [35.89,34.89]
    ], { fromName:'Severomorsk (Northern Fleet)', toName:'Tartus', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [110.39,21.20], [112.0,24.0], [115.0,28.0], [118.0,32.0], [120.43,36.09]
    ], { fromName:'Zhanjiang (PLA Southern Theater)', toName:'Qingdao (PLA Northern Theater)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [5.93,43.12], [8.0,41.0], [12.0,39.0], [18.0,37.5], [25.0,36.0], [30.0,35.0], [35.89,34.89]
    ], { fromName:'Toulon (Marine Nationale)', toName:'Tartus', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [72.84,18.93], [68.0,21.0], [63.0,23.5], [58.0,25.0], [56.25,26.57]
    ], { fromName:'Mumbai (Western Naval Command)', toName:'Strait of Hormuz', domain:'INTEL', source:'Naval Intelligence', url:'https://www.indiannavy.nic.in/content/western-naval-command' }));

    // ── ADDITIONAL HIGH-FIDELITY ROUTES ──

    // Maritime: US West Coast → Hawaii → Guam → Taiwan
    links.push(route([
      [-122.42,37.77], [-130.0,34.0], [-140.0,29.0], [-150.0,24.0], [-157.86,21.31]
    ], { fromName:'San Francisco', toName:'Honolulu', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-140/centery:29/zoom:4' }));
    
    links.push(route([
      [-157.86,21.31], [-170.0,18.0], [-180.0,16.5], [-200.0,14.0], [-215.25,13.44]
    ], { fromName:'Honolulu', toName:'Guam', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-170/centery:18/zoom:4' }));
    
    links.push(route([
      [144.75,13.44], [135.0,18.0], [125.0,23.0], [121.5,25.04]
    ], { fromName:'Guam', toName:'Taipei', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:135/centery:18/zoom:5' }));

    // Maritime: US East Coast → Gulf of Mexico
    links.push(route([
      [-76.3,36.8], [-75.0,34.0], [-79.0,30.0], [-80.0,26.0], [-82.0,24.0], [-86.0,25.0], [-90.0,27.0], [-94.8,29.3]
    ], { fromName:'Norfolk', toName:'Galveston', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-85/centery:26/zoom:5' }));

    // Maritime: Europe → West Africa
    links.push(route([
      [-9.14,38.72], [-12.0,34.0], [-15.0,28.0], [-17.0,22.0], [-17.53,14.71]
    ], { fromName:'Lisbon', toName:'Dakar', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-15/centery:25/zoom:4' }));
    
    links.push(route([
      [-17.53,14.71], [-15.0,9.0], [-10.0,5.0], [-5.0,4.0], [0.0,4.5], [3.4,6.4]
    ], { fromName:'Dakar', toName:'Lagos', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-5/centery:4/zoom:5' }));

    // Maritime: Australia → Japan
    links.push(route([
      [151.2,-33.8], [153.0,-25.0], [155.0,-15.0], [154.0,-5.0], [150.0,5.0], [145.0,15.0], [140.0,25.0], [139.7,35.6]
    ], { fromName:'Sydney', toName:'Tokyo', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:145/centery:0/zoom:3' }));

    // Maritime: Australia → Singapore
    links.push(route([
      [115.8,-31.9], [113.0,-25.0], [110.0,-15.0], [107.0,-5.0], [105.0,0.0], [103.8,1.2]
    ], { fromName:'Perth', toName:'Singapore', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:110/centery:-15/zoom:4' }));

    // Air: Trans-polar NY to Beijing
    links.push(route([
      [-73.78,40.64], [-75.0,55.0], [-78.0,70.0], [-80.0,85.0], [110.0,80.0], [115.0,60.0], [116.60,40.08]
    ], { fromName:'JFK', toName:'Beijing', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/65.0,-75.0/4' }));

    // Air: South America to Europe
    links.push(route([
      [-46.63,-23.55], [-40.0,-15.0], [-35.0,-5.0], [-30.0,5.0], [-20.0,15.0], [-15.0,25.0], [-10.0,35.0], [-0.46,51.47]
    ], { fromName:'Sao Paulo', toName:'London', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/15.0,-20.0/4' }));

    // Air: Middle East to Australia
    links.push(route([
      [55.36,25.25], [65.0,15.0], [75.0,5.0], [85.0,-5.0], [100.0,-15.0], [115.0,-25.0], [130.0,-30.0], [151.2,-33.8]
    ], { fromName:'Dubai', toName:'Sydney', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/-5.0,90.0/4' }));

    // Intel: Trans-Atlantic Subsea Data Cable (TAT-14 equivalent)
    links.push(route([
      [-74.01,40.12], [-65.0,42.0], [-50.0,46.0], [-35.0,48.0], [-20.0,49.0], [-5.0,50.0], [4.5,52.0]
    ], { fromName:'New Jersey Landing', toName:'Europe Landing', domain:'INTEL', source:'Global Subsea Cable Network', url:'https://www.submarinecablemap.com/' }));

    // Intel: Trans-Pacific Subsea Data Cable (FASTER equivalent)
    links.push(route([
      [-124.0,43.0], [-135.0,45.0], [-150.0,47.0], [-165.0,48.0], [-185.0,47.0], [-205.0,42.0], [-220.0,35.0]
    ], { fromName:'Oregon Landing', toName:'Japan Landing', domain:'INTEL', source:'Global Subsea Cable Network', url:'https://www.submarinecablemap.com/' }));

    // Intel: Mediterranean Subsea Cable (SEA-ME-WE)
    links.push(route([
      [5.3,43.3], [10.0,38.0], [18.0,35.0], [25.0,33.0], [31.2,31.2]
    ], { fromName:'Marseille', toName:'Alexandria', domain:'INTEL', source:'Global Subsea Cable Network', url:'https://www.submarinecablemap.com/' }));

    // Maritime: Suez to Mumbai (Arabian Sea)
    links.push(route([
      [32.34,30.43], [35.0,25.0], [38.0,21.0], [41.0,17.0], [43.33,12.58], [45.0,12.0], [52.0,14.0], [60.0,15.0], [68.0,17.0], [72.84,18.93]
    ], { fromName:'Suez Canal', toName:'Mumbai', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:60/centery:15/zoom:5' }));

    // Maritime: Cape of Good Hope to Australia (Southern Ocean)
    links.push(route([
      [18.47,-34.36], [40.0,-40.0], [60.0,-42.0], [80.0,-43.0], [100.0,-40.0], [115.8,-31.9]
    ], { fromName:'Cape of Good Hope', toName:'Perth', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:70/centery:-40/zoom:3' }));

    // Maritime: Panama Canal to Valparaiso (South America West Coast)
    links.push(route([
      [-79.68,9.08], [-80.0,2.0], [-81.5,-5.0], [-78.0,-15.0], [-74.0,-25.0], [-71.6,-33.0]
    ], { fromName:'Panama Canal', toName:'Valparaiso', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-78/centery:-15/zoom:4' }));

    // Air: London to Singapore
    links.push(route([
      [-0.46,51.47], [15.0,48.0], [35.0,42.0], [55.0,35.0], [70.0,25.0], [85.0,15.0], [95.0,8.0], [103.8,1.2]
    ], { fromName:'London', toName:'Singapore', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/55.0,35.0/4' }));

    // Air: New York to Buenos Aires
    links.push(route([
      [-73.78,40.64], [-70.0,20.0], [-65.0,0.0], [-55.0,-15.0], [-58.4,-34.6]
    ], { fromName:'JFK New York', toName:'Buenos Aires', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/-65.0,0.0/4' }));

    // Air: Tokyo to Sydney
    links.push(route([
      [139.7,35.6], [142.0,20.0], [145.0,0.0], [148.0,-15.0], [151.2,-33.8]
    ], { fromName:'Tokyo', toName:'Sydney', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/145.0,0.0/4' }));

    // Intel: Arctic Patrol Route (Northern Fleet)
    links.push(route([
      [33.42,69.07], [20.0,72.0], [0.0,75.0], [-20.0,72.0], [-30.0,65.0]
    ], { fromName:'Severomorsk', toName:'Greenland Sea', domain:'INTEL', source:'Naval Intelligence', url:'https://www.odni.gov' }));

    // Intel: South China Sea Carrier Patrol
    links.push(route([
      [127.6,26.2], [123.0,24.0], [118.0,20.0], [114.0,15.0], [112.0,10.0]
    ], { fromName:'Okinawa', toName:'South China Sea', domain:'INTEL', source:'Naval Intelligence', url:'https://www.odni.gov' }));

    setGeo('sdk-links', links);
  }, [mapReady, activeLayers.sdk_stream, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('live-news', activeLayers.live_news && data.live_feeds ? data.live_feeds.map((f: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { name: f.name, city: f.city, country: f.country, url: f.url, category: f.category, embed_allowed: f.embed_allowed !== false } })) : []);
  }, [mapReady, data.live_feeds, activeLayers.live_news, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const items = data.news || [];
    setGeo('sigint-news', activeLayers.news_intel && items.length > 0
      ? items.filter((n: any) => n.coords?.length === 2).map((n: any) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] },
          properties: { title: n.title, source: n.source, risk_score: n.risk_score, link: n.link }
        }))
      : []);
  }, [mapReady, data.news, activeLayers.news_intel, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    // ── CONFLICT ZONES — center-point warning markers ──
    const CONFLICT_ZONES = [
      { label: 'Ucrania', severity: 'war', lat: 48.5, lng: 31.2, description: 'Guerra Rusia-Ucrania; frente activo y ataques en profundidad.', actors: 'Rusia · Ucrania', since: 'feb 2022', live: 'https://liveuamap.com' },
      { label: 'Gaza', severity: 'war', lat: 31.45, lng: 34.4, description: 'Conflicto Israel-Hamás; operaciones militares y crisis humanitaria.', actors: 'Israel · Hamás', since: 'oct 2023', live: 'https://israelpalestine.liveuamap.com' },
      { label: 'Líbano (frontera sur)', severity: 'high', lat: 33.2, lng: 35.4, description: 'Tensión Israel-Hezbolá en la Línea Azul; intercambios de fuego.', actors: 'Israel · Hezbolá', since: '2023', live: 'https://israelpalestine.liveuamap.com' },
      { label: 'Sudán', severity: 'war', lat: 15.0, lng: 30.0, description: 'Guerra civil entre el Ejército (SAF) y las RSF.', actors: 'SAF · RSF', since: 'abr 2023', live: 'https://sudan.liveuamap.com' },
      { label: 'Myanmar', severity: 'war', lat: 21.0, lng: 96.0, description: 'Guerra civil tras el golpe de 2021; junta vs. resistencia y EAOs.', actors: 'Junta · PDF / EAOs', since: '2021' },
      { label: 'RD Congo (este)', severity: 'war', lat: -1.5, lng: 28.8, description: 'Ofensiva del M23 y violencia armada en Kivu del Norte.', actors: 'RDC · M23 / Ruanda', since: '2022' },
      { label: 'Yemen', severity: 'high', lat: 15.5, lng: 44.2, description: 'Guerra civil; hutíes vs. gobierno y ataques en el mar Rojo.', actors: 'Gobierno · hutíes', since: '2014', live: 'https://yemen.liveuamap.com' },
      { label: 'Siria', severity: 'high', lat: 35.0, lng: 38.5, description: 'Conflicto prolongado; reconfiguración de poder y zonas en disputa.', actors: 'Múltiples facciones', since: '2011', live: 'https://syria.liveuamap.com' },
      { label: 'Sahel', severity: 'high', lat: 15.5, lng: 1.0, description: 'Insurgencia yihadista en Malí, Burkina Faso y Níger.', actors: 'Estados · JNIM / EIGS', since: '2012' },
      { label: 'Somalia', severity: 'high', lat: 4.5, lng: 45.5, description: 'Insurgencia de Al-Shabab y operaciones del gobierno.', actors: 'Gobierno · Al-Shabab', since: '2006' },
      { label: 'Mar Rojo', severity: 'high', lat: 16.0, lng: 40.0, description: 'Ataques hutíes a buques; ruta marítima amenazada.', actors: 'Hutíes · coalición naval', since: '2023', live: 'https://yemen.liveuamap.com' },
      { label: 'Haití', severity: 'high', lat: 18.6, lng: -72.3, description: 'Colapso de seguridad; control de bandas en Puerto Príncipe.', actors: 'Estado · bandas (G9)', since: '2024' },
      { label: 'Etiopía (Amhara)', severity: 'high', lat: 11.6, lng: 37.4, description: 'Enfrentamientos entre el ejército y milicias Fano.', actors: 'Ejército · milicias Fano', since: '2023' },
      { label: 'Sáhara Occidental', severity: 'elevated', lat: 24.5, lng: -13.0, description: 'Reanudación de hostilidades Marruecos-Polisario.', actors: 'Marruecos · Polisario', since: '2020' },
      { label: 'Cachemira', severity: 'elevated', lat: 34.0, lng: 76.0, description: 'Disputa India-Pakistán; Línea de Control militarizada.', actors: 'India · Pakistán', since: '1947' },
      { label: 'Cáucaso (Nagorno)', severity: 'elevated', lat: 39.8, lng: 46.7, description: 'Tensión Armenia-Azerbaiyán tras la ofensiva de 2023.', actors: 'Armenia · Azerbaiyán', since: '2020' },
      { label: 'Estrecho de Taiwán', severity: 'elevated', lat: 24.0, lng: 119.5, description: 'Tensión China-Taiwán; incursiones aéreas y navales.', actors: 'China · Taiwán', since: 'tensión' },
      { label: 'Mar de China Meridional', severity: 'elevated', lat: 14.0, lng: 115.0, description: 'Disputas territoriales; incidentes China-Filipinas.', actors: 'China · Filipinas / vecinos', since: 'disputa' },
      { label: 'Península de Corea (DMZ)', severity: 'elevated', lat: 38.3, lng: 127.0, description: 'Tensión entre las dos Coreas en el paralelo 38.', actors: 'Corea del Norte · Corea del Sur', since: '1953' },
    ];
    const conflictFeatures = CONFLICT_ZONES.map(z => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
      properties: { label: z.label, severity: z.severity, description: z.description, actors: z.actors, since: z.since, live: (z as any).live || '' },
    }));
    setGeo('conflict-zones', conflictFeatures);
  }, [mapReady, setGeo]);

  // ── Sucesos de guerra → filtrados por las guerras activas (separar por guerra) ──
  useEffect(() => {
    if (!mapReady) return;
    const WAR_KEYS: Record<string, string> = {
      war_ukraine: 'ucrania', war_gaza: 'gaza', war_lebanon: 'libano', war_iran: 'iran',
      war_sudan: 'sudan', war_myanmar: 'myanmar', war_congo: 'congo', war_sahel: 'sahel', war_syria: 'siria',
    };
    const activeWars = new Set(
      Object.entries(WAR_KEYS).filter(([k]) => (activeLayers as any)[k]).map(([, v]) => v)
    );
    const evts = ((data.war_events as any[]) || []).filter((e) => activeWars.has(e.war));
    setGeo('war-events', evts.map((e) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [e.lng, e.lat] },
      properties: { ...e },
    })));
  }, [mapReady, data.war_events, activeLayers.war_ukraine, activeLayers.war_gaza, activeLayers.war_lebanon, activeLayers.war_iran, activeLayers.war_sudan, activeLayers.war_myanmar, activeLayers.war_congo, activeLayers.war_sahel, activeLayers.war_syria, setGeo]);

  // ── Capas de puntos: industria, infraestructura digital, humanitario ──
  useEffect(() => {
    if (!mapReady) return;
    const toFeat = (arr: any[]) => (arr || []).map((o) => ({
      type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [o.lng, o.lat] }, properties: { ...o },
    }));
    setGeo('refineries', activeLayers.refineries ? toFeat(data.industry_refineries) : []);
    setGeo('lng-terminals', activeLayers.lng_terminals ? toFeat(data.industry_lng) : []);
    setGeo('fabs', activeLayers.fabs ? toFeat(data.industry_fabs) : []);
    setGeo('nuclear-plants', activeLayers.nuclear_plants ? toFeat(data.industry_nuclear) : []);
    setGeo('dams', activeLayers.dams ? toFeat(data.industry_dams) : []);
    setGeo('ixps', activeLayers.ixps ? toFeat(data.infra_ixps) : []);
    setGeo('cable-landings', activeLayers.cable_landings ? toFeat(data.infra_landings) : []);
    setGeo('net-shutdowns', activeLayers.net_shutdowns ? toFeat(data.infra_shutdowns) : []);
    setGeo('refugee-camps', activeLayers.refugee_camps ? toFeat(data.refugee_camps) : []);
    setGeo('mobile-coverage', activeLayers.mobile_coverage && data.mobile_coverage?.features ? data.mobile_coverage.features : []);
  }, [mapReady, setGeo, data.industry_refineries, data.industry_lng, data.industry_fabs, data.industry_nuclear, data.industry_dams, data.infra_ixps, data.infra_landings, data.infra_shutdowns, data.refugee_camps, data.mobile_coverage, activeLayers.refineries, activeLayers.lng_terminals, activeLayers.fabs, activeLayers.nuclear_plants, activeLayers.dams, activeLayers.ixps, activeLayers.cable_landings, activeLayers.net_shutdowns, activeLayers.refugee_camps, activeLayers.mobile_coverage]);


  // Visibility
  useEffect(() => {
    if (!mapReady) return;
    setVis(['eq-circles','eq-label'], activeLayers.earthquakes);
    setVis(['sat-dots'], activeLayers.satellites);
    setVis(['gdelt-dots'], activeLayers.global_incidents);
    setVis(['traffic-dots'], activeLayers.traffic_incidents);
    setVis(['jam-fill','jam-label'], activeLayers.gps_jamming);
    setVis(['day-night-fill'], activeLayers.day_night);
    setVis(['geo-rivers-line','geo-rivers-label'], activeLayers.geo_rivers);
    // Cordilleras: picos puntuales + área sombreada de la cordillera
    setVis(['geo-mountains','geo-mountains-label','geo-range-fill','geo-range-outline','geo-range-label'], activeLayers.geo_mountains);
    // Desiertos: solo áreas sombreadas
    setVis(['geo-desert-fill','geo-desert-outline','geo-desert-label'], activeLayers.geo_deserts);
    // Otros relieves: áreas sombreadas + cascadas/otros puntuales
    setVis(['geo-features','geo-features-label','geo-other-fill','geo-other-outline','geo-other-label'], activeLayers.geo_features);
    setVis(['gdacs-glow','gdacs-dots','gdacs-label'], activeLayers.gdacs);
    setVis(['hurricane-glow','hurricane-dots','hurricane-label'], activeLayers.hurricanes);
    setVis(['volcanoes-dots','volcanoes-label'], activeLayers.volcanoes);
    setVis(['airports-dots','airports-label'], activeLayers.airports);
    setVis(['launches-dots','launches-label'], activeLayers.launches);
    setVis(['iss-glow','iss-dot','iss-label'], activeLayers.iss);
    setVis(['frontline-fill','frontline-line'], activeLayers.frontline);
    setVis(['trains-dots','trains-label'], activeLayers.trains);
    setVis(['railways-line', 'railways-commuter-line', 'railways-hs-line'], activeLayers.railways);
    setVis(['tectonics-line'], activeLayers.tectonics);
    setVis(['sea-state-dots'], activeLayers.sea_state);
    setVis(['aurora-heat'], activeLayers.aurora);
    setVis(['pipelines-line'], activeLayers.pipelines);
    setVis(['powerlines-line'], activeLayers.powerlines);
    setVis(['datacenters-dots'], activeLayers.datacenters);
    setVis(['oilgas-dots','oilgas-label'], activeLayers.oilgas);
    setVis(['minerals-dots','minerals-label'], activeLayers.minerals);
    setVis(['agriculture-fill','agriculture-outline','agriculture-label'], activeLayers.agriculture);
    setVis(['alliances-fill','alliances-outline'], activeLayers.alliances);
    setVis(['sanctions-fill'], activeLayers.sanctions);
    setVis(['milspend-fill'], activeLayers.milspend);
    setVis(['regime-fill'], activeLayers.regime);
    setVis(['nukes-fill','nukes-label'], activeLayers.nukes);
    setVis(['disputes-dots','disputes-label'], activeLayers.disputes);
    setVis(['orgs-dots','orgs-label'], activeLayers.orgs);
    setVis(['sea-lanes-line'], activeLayers.maritime_routes);
    setVis(['lighthouses-dots'], activeLayers.lighthouses);
    setVis(['piracy-glow','piracy-dots','piracy-label'], activeLayers.piracy);
    setVis(['satnogs-dots','satnogs-label'], activeLayers.satnogs);
    setVis(['milbase-dots','milbase-label'], activeLayers.military_bases);
    setVis(['aq-glow','aq-dots','aq-label'], activeLayers.air_quality);
    setVis(['gibs-layer'], activeLayers.gibs);
    setVis(['nightlights-layer'], activeLayers.nightlights);
    setVis(['fl-commercial'], activeLayers.flights);
    setVis(['fl-private'], activeLayers.private);
    setVis(['fl-jets'], activeLayers.jets);
    setVis(['fl-military'], activeLayers.military);
    setVis(['cctv-glow','cctv-dots','cctv-label'], activeLayers.cctv);
    setVis(['fires-heat'], activeLayers.fires);
    setVis(['weather-glow','weather-dots','weather-label'], activeLayers.weather);
    setVis(['infra-glow','infra-dots','infra-label'], activeLayers.infrastructure);
    setVis(['power-plants-dots'], activeLayers.power_solar || activeLayers.power_wind || activeLayers.power_hydro || activeLayers.power_nuclear || activeLayers.power_coal || activeLayers.power_gas || activeLayers.power_oil || activeLayers.power_other);
    setVis(['critical-infra-dots'], activeLayers.critical_infra);
    setVis(['cables-lines'], activeLayers.submarine_cables);
    const mShowPorts = activeLayers.maritime || activeLayers.port_container || activeLayers.port_energy || activeLayers.port_naval || activeLayers.port_commercial;
    const mShowShips = activeLayers.maritime || activeLayers.ship_cargo || activeLayers.ship_tanker || activeLayers.ship_passenger || activeLayers.ship_fishing || activeLayers.ship_tug || activeLayers.ship_highspeed || activeLayers.ship_military || activeLayers.ship_other;
    setVis(['maritime-glow','maritime-dots','maritime-label'], mShowPorts);
    setVis(['choke-glow','choke-dots','choke-label'], activeLayers.maritime);
    setVis(['ship-dots','ship-arrows','ship-label'], mShowShips);
    setVis(['news-glow','news-dots','news-label'], activeLayers.live_news);
    setVis(['sigint-news-glow','sigint-news-dots','sigint-news-label'], activeLayers.news_intel);
    setVis(['conflict-icons'], !!activeLayers.conflict_zones);
    const anyWar = activeLayers.war_ukraine || activeLayers.war_gaza || activeLayers.war_lebanon || activeLayers.war_iran || activeLayers.war_sudan || activeLayers.war_myanmar || activeLayers.war_congo || activeLayers.war_sahel || activeLayers.war_syria;
    setVis(['war-events-glow','war-events-dots','war-events-label'], !!anyWar);
    // Política e índices (coropletas)
    setVis(['election-fill'], activeLayers.election);
    setVis(['press-fill'], activeLayers.press_freedom);
    setVis(['cpi-fill'], activeLayers.corruption);
    setVis(['hdi-fill'], activeLayers.hdi);
    setVis(['gdp-fill'], activeLayers.gdp_pc);
    setVis(['blocs-fill'], activeLayers.econ_blocs);
    // Industria / infraestructura digital / humanitario (puntos)
    setVis(['refineries-dots','refineries-label'], activeLayers.refineries);
    setVis(['lng-dots','lng-label'], activeLayers.lng_terminals);
    setVis(['fabs-dots','fabs-label'], activeLayers.fabs);
    setVis(['nuclear-plants-dots','nuclear-plants-label'], activeLayers.nuclear_plants);
    setVis(['dams-dots','dams-label'], activeLayers.dams);
    setVis(['ixps-dots','ixps-label'], activeLayers.ixps);
    setVis(['cable-landings-dots','cable-landings-label'], activeLayers.cable_landings);
    setVis(['net-shutdowns-dots','net-shutdowns-label'], activeLayers.net_shutdowns);
    setVis(['refugee-camps-dots','refugee-camps-label'], activeLayers.refugee_camps);
    setVis(['deforestation-layer'], activeLayers.deforestation);
    setVis(['mobile-coverage-fill'], activeLayers.mobile_coverage);

    setVis(['balloon-dots','balloon-label'], activeLayers.balloons);
    setVis(['rad-glow','rad-dots','rad-label'], activeLayers.radiation);
    setVis(['sdk-sea','sdk-air','sdk-intel'], activeLayers.sdk_stream !== false);
    // Sweep layers always visible when data is present (controlled by useEffect)
    setVis(['sweep-connections','sweep-pulse-ring','sweep-device-glow','sweep-device-dots','sweep-device-labels'], true);
  }, [mapReady, activeLayers, setVis]);

  // IP Sweep visualization
  useEffect(() => {
    if (!mapReady) return;
    if (!sweepData?.devices?.length) {
      setGeo('ip-sweep-devices', []);
      setGeo('ip-sweep-pulse', []);
      setGeo('ip-sweep-connections', []);
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    const { center, devices } = sweepData;
    const centerCoord: [number, number] = [center.lng, center.lat];

    // Switch to globe and fly to the sweep location
    try {
      (map as any).setProjection({ type: 'globe' });
      map.setSky({ 'sky-color': '#0A0A0F', 'sky-horizon-blend': 0.02, 'horizon-color': '#0A0A0F', 'horizon-fog-blend': 0.02 });
    } catch { /* projection may not be supported */ }

    map.flyTo({ center: centerCoord, zoom: 14, pitch: 50, bearing: -20, duration: 3000, essential: true });

    // Set center pulse
    setGeo('ip-sweep-pulse', [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: centerCoord },
      properties: { ip: sweepData.target_ip },
    }]);

    // Build device features spread in a circle around center
    const allDeviceFeatures = devices.map((d: any, i: number) => {
      const angle = (i / devices.length) * Math.PI * 2;
      const radius = 0.001 + ((i % 7 + 1) * 0.0004);
      const dLng = centerCoord[0] + Math.cos(angle) * radius * (1 / Math.cos(center.lat * Math.PI / 180));
      const dLat = centerCoord[1] + Math.sin(angle) * radius;
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [dLng, dLat] },
        properties: {
          ip: d.ip, device_type: d.device_type, device_icon: d.device_icon,
          color: d.device_color, risk_level: d.risk_level,
          ports: JSON.stringify(d.ports), hostnames: JSON.stringify(d.hostnames),
          vulns: JSON.stringify(d.vulns), cpes: JSON.stringify(d.cpes), tags: JSON.stringify(d.tags),
        },
      };
    });

    // Connection lines from center to each device
    const connectionFeatures = allDeviceFeatures.map((f: any) => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: [centerCoord, f.geometry.coordinates] },
      properties: { color: f.properties.color },
    }));

    // Stagger the appearance after 3s flyTo completes
    const timer = setTimeout(() => {
      setGeo('ip-sweep-connections', connectionFeatures);
      const batchSize = 5;
      const batches = Math.ceil(allDeviceFeatures.length / batchSize);
      for (let b = 0; b < batches; b++) {
        setTimeout(() => {
          setGeo('ip-sweep-devices', allDeviceFeatures.slice(0, (b + 1) * batchSize));
        }, b * 100);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [mapReady, sweepData, setGeo]);

  // Scan Targets visualization
  useEffect(() => {
    if (!mapReady || !mapRef.current || !scanTargets) return;
    const map = mapRef.current;
    
    const features = scanTargets.map(t => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [t.lng, t.lat] },
      properties: { ...t }
    }));
    
    const src = map.getSource('scan-targets') as maplibregl.GeoJSONSource;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, [scanTargets, mapReady]);

  // Fly-to
  useEffect(() => {
    if (!mapReady || !mapRef.current || !flyToLocation) return;
    mapRef.current.flyTo({ center: [flyToLocation.lng, flyToLocation.lat], zoom: 8, duration: 2000 });
  }, [mapReady, flyToLocation]);

  // Dynamic projection switching (lightweight — no terrain DEM)
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    try {
      (map as any).setProjection({ type: projection });
      if (projection === 'globe') {
        map.easeTo({ pitch: 20, duration: 1200 });
        try {
          (map as any).setSky({
            'sky-color': '#04040A',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#0a0a1a',
            'horizon-fog-blend': 0.3,
            'fog-color': '#04040A',
            'fog-ground-blend': 0.9,
          });
        } catch (e) { console.warn('[Politeia] Suppressed error:', e instanceof Error ? e.message : e); }
      } else {
        map.easeTo({ pitch: 0, duration: 800 });
      }
    } catch (e) {
      console.warn('Projection switch failed:', e);
    }
  }, [mapReady, projection]);

  // Estilo del mapa: oscuro (base dark-matter) / claro (raster positron) / satélite
  // (raster ArcGIS). Claro y satélite son rásters superpuestos al base, por debajo
  // de las capas de datos (beforeId 'day-night-fill'), para no perder los marcadores.
  // ── Modos visuales (FLIR / NVG / CRT) — filtro CSS sobre el lienzo del mapa ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const FILTERS: Record<string, string> = {
      none: '',
      flir: 'grayscale(1) contrast(1.6) sepia(1) hue-rotate(-25deg) saturate(7) brightness(1.05)',
      nvg: 'grayscale(1) brightness(1.25) sepia(1) hue-rotate(55deg) saturate(4.5)',
      crt: 'contrast(1.12) brightness(1.06) saturate(1.35)',
    };
    el.style.filter = FILTERS[visualMode] || '';
  }, [visualMode]);

  // ── Mapa mudo: oculta/muestra las etiquetas (nombres) del basemap ──
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    basemapLabelsRef.current.forEach(id => {
      try { map.setLayoutProperty(id, 'visibility', muteLabels ? 'none' : 'visible'); } catch { /* noop */ }
    });
  }, [muteLabels, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (mapStyle === prevStyleRef.current) return;
    prevStyleRef.current = mapStyle;
    const map = mapRef.current;
    const OVERLAYS: Record<string, { id: string; source: string; url: string; opacity: number }> = {
      satellite: { id: 'satellite-layer', source: 'satellite-tiles', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', opacity: 0.85 },
      light: { id: 'light-basemap-layer', source: 'light-basemap-tiles', url: 'https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', opacity: 1 },
    };

    try {
      const layers = map.getStyle().layers;
      const firstSymbol = layers.find((l: any) => l.type === 'symbol')?.id;
      // Ocultar todos los overlays de estilo
      for (const k of Object.keys(OVERLAYS)) {
        if (map.getLayer(OVERLAYS[k].id)) map.setLayoutProperty(OVERLAYS[k].id, 'visibility', 'none');
      }
      const cfg = OVERLAYS[mapStyle as keyof typeof OVERLAYS];
      if (cfg) {
        if (!map.getSource(cfg.source)) {
          map.addSource(cfg.source, { type: 'raster', tiles: [cfg.url], tileSize: 256, maxzoom: 18 });
          // claro: por DEBAJO de las etiquetas (que se ven en español); satélite: bajo los datos
          map.addLayer({ id: cfg.id, type: 'raster', source: cfg.source, paint: { 'raster-opacity': cfg.opacity } },
            cfg.id === 'light-basemap-layer' ? firstSymbol : 'day-night-fill');
        } else {
          map.setLayoutProperty(cfg.id, 'visibility', 'visible');
        }
      }
      // Etiquetas del basemap: oscuras sobre el mapa claro, claras en oscuro/satélite
      const darkText = mapStyle === 'light';
      for (const layer of layers) {
        if (layer.type === 'symbol' && (layer.layout as any)?.['text-field']) {
          try {
            map.setPaintProperty(layer.id, 'text-color', darkText ? '#33373d' : '#c9ccd1');
            map.setPaintProperty(layer.id, 'text-halo-color', darkText ? 'rgba(255,255,255,0.92)' : 'rgba(2,4,10,0.65)');
            map.setPaintProperty(layer.id, 'text-halo-width', 1.1);
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Style switch failed:', e);
    }
  }, [mapReady, mapStyle]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {visualMode === 'crt' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 5,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 2px, transparent 3px)',
        }} />
      )}
    </>
  );
}

export default memo(OsirisMap);
