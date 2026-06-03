'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Item = { c: string; l: string };
type Legend = { id: string; title: string; active: (a: any) => boolean; items: Item[] };

const has = (a: any, keys: string[]) => keys.some((k) => a[k]);

// Leyendas por capa/concepto: qué significa cada color.
const LEGENDS: Legend[] = [
  { id: 'ships', title: 'Barcos por tipo', active: (a) => has(a, ['ship_cargo', 'ship_tanker', 'ship_passenger', 'ship_fishing', 'ship_tug', 'ship_highspeed', 'ship_military', 'ship_other']), items: [
    { c: '#00BCD4', l: 'Carga' }, { c: '#FF9500', l: 'Petroleros' }, { c: '#B388FF', l: 'Pasaje/ferry' }, { c: '#4DB6AC', l: 'Pesca' }, { c: '#A1887F', l: 'Remolcadores' }, { c: '#FF4081', l: 'Alta velocidad' }, { c: '#FF1744', l: 'Militar' }, { c: '#90A4AE', l: 'Otros' } ] },
  { id: 'ports', title: 'Puertos por tipo', active: (a) => has(a, ['port_container', 'port_energy', 'port_naval', 'port_commercial']), items: [
    { c: '#00BCD4', l: 'Contenedores' }, { c: '#FF9500', l: 'Energéticos' }, { c: '#FF3D3D', l: 'Bases navales' }, { c: '#26A69A', l: 'Comerciales' } ] },
  { id: 'rail', title: 'Líneas ferroviarias', active: (a) => a.railways, items: [
    { c: '#FF3B30', l: 'Alta velocidad' }, { c: '#34C759', l: 'Cercanías' }, { c: '#FFC23C', l: 'Regular' } ] },
  { id: 'trains', title: 'Trenes en directo', active: (a) => a.trains, items: [
    { c: '#4FC3F7', l: 'Finlandia' }, { c: '#66BB6A', l: 'Irlanda' }, { c: '#FF7043', l: 'EE. UU.' } ] },
  { id: 'geo', title: 'Accidentes geográficos', active: (a) => has(a, ['geo_mountains', 'geo_deserts', 'geo_features', 'geo_rivers']), items: [
    { c: '#8D6E63', l: 'Cordilleras' }, { c: '#E0A82E', l: 'Desiertos' }, { c: '#26A69A', l: 'Otros relieves' }, { c: '#29B6F6', l: 'Ríos' } ] },
  { id: 'agri', title: 'Agricultura (cultivos)', active: (a) => a.agriculture, items: [
    { c: '#E8C547', l: 'Trigo/cereal' }, { c: '#F9A825', l: 'Maíz' }, { c: '#4DB6AC', l: 'Arroz' }, { c: '#9CCC65', l: 'Soja' }, { c: '#6D4C41', l: 'Café' }, { c: '#AED581', l: 'Caña' }, { c: '#CFD8DC', l: 'Algodón' }, { c: '#FF7043', l: 'Palma' }, { c: '#AB47BC', l: 'Vid' }, { c: '#827717', l: 'Olivo' }, { c: '#5D4037', l: 'Cacao' }, { c: '#2E7D32', l: 'Té' }, { c: '#FBC02D', l: 'Girasol' }, { c: '#FFA726', l: 'Cítricos' }, { c: '#66BB6A', l: 'Caucho' }, { c: '#FFEE58', l: 'Plátano' }, { c: '#EF5350', l: 'Frutas/hortalizas' } ] },
  { id: 'oilgas', title: 'Petróleo y gas', active: (a) => a.oilgas, items: [
    { c: '#8D6E63', l: 'Petróleo' }, { c: '#42A5F5', l: 'Gas' }, { c: '#AB47BC', l: 'Mixto' } ] },
  { id: 'pipelines', title: 'Oleoductos/gasoductos', active: (a) => a.pipelines, items: [
    { c: '#8D6E63', l: 'Petróleo' }, { c: '#42A5F5', l: 'Gas' } ] },
  { id: 'minerals', title: 'Minerales', active: (a) => a.minerals, items: [
    { c: '#FFB300', l: 'Oro' }, { c: '#FF7043', l: 'Cobre' }, { c: '#8D6E63', l: 'Hierro' }, { c: '#37474F', l: 'Carbón' }, { c: '#26C6DA', l: 'Litio' }, { c: '#5C6BC0', l: 'Cobalto' }, { c: '#FFCA28', l: 'Tierras raras' }, { c: '#66BB6A', l: 'Uranio' }, { c: '#A1887F', l: 'Níquel' }, { c: '#B0BEC5', l: 'Plata' }, { c: '#7E57C2', l: 'Manganeso' }, { c: '#90A4AE', l: 'Otros' } ] },
  { id: 'alliances', title: 'Bloques militares', active: (a) => a.alliances, items: [
    { c: '#1565C0', l: 'OTAN' }, { c: '#C62828', l: 'OTSC' }, { c: '#00ACC1', l: 'Aliado EE. UU.' } ] },
  { id: 'sanctions', title: 'Sanciones', active: (a) => a.sanctions, items: [ { c: '#EF5350', l: 'Bajo sanciones' } ] },
  { id: 'piracy', title: 'Piratería', active: (a) => a.piracy, items: [ { c: '#EF5350', l: 'Riesgo alto' }, { c: '#FFA726', l: 'Riesgo medio' } ] },
  { id: 'sea', title: 'Altura de ola', active: (a) => a.sea_state, items: [
    { c: '#26C6DA', l: '<1 m' }, { c: '#66BB6A', l: '1–2 m' }, { c: '#FFEE58', l: '2–3 m' }, { c: '#FFA726', l: '3–4 m' }, { c: '#EF5350', l: '4–6 m' }, { c: '#AB47BC', l: '>6 m' } ] },
  { id: 'aqi', title: 'Calidad del aire', active: (a) => a.air_quality, items: [
    { c: '#66BB6A', l: 'Buena' }, { c: '#FFEE58', l: 'Moderada' }, { c: '#FFA726', l: 'Dañina (sensibles)' }, { c: '#EF5350', l: 'Dañina' }, { c: '#AB47BC', l: 'Muy dañina' }, { c: '#7B1F1F', l: 'Peligrosa' } ] },
  { id: 'war', title: 'Alertas de guerra', active: (a) => a.conflict_zones, items: [
    { c: '#FF1744', l: 'Guerra activa' }, { c: '#FF9500', l: 'Alta' }, { c: '#FFD500', l: 'Tensión' } ] },
  { id: 'front', title: 'Frente de Ucrania', active: (a) => a.frontline, items: [
    { c: '#A52714', l: 'Ocupado' }, { c: '#0F9D58', l: 'Liberado' }, { c: '#FF5252', l: 'Dirección de ataque' }, { c: '#BCAAA4', l: 'Desconocido' } ] },
  { id: 'gdacs', title: 'Alertas de desastres', active: (a) => a.gdacs, items: [
    { c: '#EF5350', l: 'Roja' }, { c: '#FFA726', l: 'Naranja' }, { c: '#66BB6A', l: 'Verde' } ] },
  { id: 'energy', title: 'Energía por fuente', active: (a) => has(a, ['power_solar', 'power_wind', 'power_hydro', 'power_nuclear', 'power_coal', 'power_gas', 'power_oil', 'power_other']), items: [
    { c: '#FFD600', l: 'Solar' }, { c: '#4FC3F7', l: 'Eólica' }, { c: '#2979FF', l: 'Hidro' }, { c: '#FF1744', l: 'Nuclear' }, { c: '#90A4AE', l: 'Carbón' }, { c: '#FF9100', l: 'Gas' }, { c: '#A1887F', l: 'Petróleo' }, { c: '#BDBDBD', l: 'Otras' } ] },
];

export default function LegendFooter({ activeLayers }: { activeLayers: any }) {
  const active = LEGENDS.filter((l) => l.active(activeLayers));
  const [idx, setIdx] = useState(0);
  // Mantener el índice dentro de rango cuando cambian las capas activas.
  useEffect(() => { if (idx >= active.length) setIdx(0); }, [active.length, idx]);

  if (active.length === 0) return null;
  const cur = active[Math.min(idx, active.length - 1)];
  const multi = active.length > 1;
  const go = (d: number) => setIdx((i) => (i + d + active.length) % active.length);

  return (
    <div className="desktop-only" style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200, pointerEvents: 'auto', maxWidth: '72vw' }}>
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
        {multi && (
          <button onClick={() => go(-1)} title="Anterior" style={{ display: 'flex', padding: 2, borderRadius: 6, background: 'none', border: 0, cursor: 'pointer' }}>
            <ChevronLeft style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
          </button>
        )}
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--gold-primary)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>{cur.title}</span>
        <div style={{ width: 1, height: 14, background: 'var(--border-primary)', flexShrink: 0 }} />
        <div className="styled-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 1 }}>
          {cur.items.map((it) => (
            <span key={it.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: it.c, flexShrink: 0, boxShadow: `0 0 4px ${it.c}66` }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary, #C8C6C0)' }}>{it.l}</span>
            </span>
          ))}
        </div>
        {multi && (
          <>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', flexShrink: 0 }}>{idx + 1}/{active.length}</span>
            <button onClick={() => go(1)} title="Siguiente" style={{ display: 'flex', padding: 2, borderRadius: 6, background: 'none', border: 0, cursor: 'pointer' }}>
              <ChevronRight style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
