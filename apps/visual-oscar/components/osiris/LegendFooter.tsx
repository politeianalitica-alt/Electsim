'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Item = { c: string; l: string };
type Legend = { id: string; title: string; active: (a: any) => boolean; items: Item[]; note?: string };

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
  { id: 'agri', title: 'Agricultura · cultivo dominante', active: (a) => a.agriculture, items: [
    { c: '#E8C547', l: 'Trigo' }, { c: '#D4C24A', l: 'Cebada' }, { c: '#C0CA33', l: 'Cereales' }, { c: '#F9A825', l: 'Maíz' }, { c: '#4DB6AC', l: 'Arroz' }, { c: '#9CCC65', l: 'Soja' }, { c: '#FBC02D', l: 'Girasol' }, { c: '#FDD835', l: 'Colza' }, { c: '#FFB300', l: 'Oleaginosas' }, { c: '#FF7043', l: 'Palma' }, { c: '#AED581', l: 'Coco' }, { c: '#CFD8DC', l: 'Algodón' }, { c: '#8BC34A', l: 'Caña de azúcar' }, { c: '#CE93D8', l: 'Remolacha' }, { c: '#6D4C41', l: 'Café' }, { c: '#5D4037', l: 'Cacao' }, { c: '#2E7D32', l: 'Té' }, { c: '#8D6E63', l: 'Tabaco' }, { c: '#FFEE58', l: 'Plátano' }, { c: '#FF8A65', l: 'Frutas tropicales' }, { c: '#AB47BC', l: 'Frutas templadas' }, { c: '#EF5350', l: 'Hortalizas' }, { c: '#A1887F', l: 'Tubérculos' }, { c: '#66BB6A', l: 'Legumbres' }, { c: '#90A4AE', l: 'Otros' } ] },
  { id: 'oilgas', title: 'Petróleo y gas', active: (a) => a.oilgas, items: [
    { c: '#8D6E63', l: 'Petróleo' }, { c: '#42A5F5', l: 'Gas' }, { c: '#AB47BC', l: 'Mixto' } ] },
  { id: 'pipelines', title: 'Oleoductos/gasoductos', active: (a) => a.pipelines, items: [
    { c: '#8D6E63', l: 'Petróleo' }, { c: '#42A5F5', l: 'Gas' } ] },
  { id: 'powerlines', title: 'Líneas eléctricas (kV)', active: (a) => a.powerlines, items: [
    { c: '#FFD600', l: '220–299 kV' }, { c: '#FFA000', l: '300–499 kV' }, { c: '#FF5722', l: '≥500 kV (EHV/UHV)' } ] },
  { id: 'minerals', title: 'Minerales', active: (a) => a.minerals, items: [
    { c: '#FFB300', l: 'Oro' }, { c: '#FF7043', l: 'Cobre' }, { c: '#8D6E63', l: 'Hierro' }, { c: '#37474F', l: 'Carbón' }, { c: '#26C6DA', l: 'Litio' }, { c: '#5C6BC0', l: 'Cobalto' }, { c: '#FFCA28', l: 'Tierras raras' }, { c: '#66BB6A', l: 'Uranio' }, { c: '#A1887F', l: 'Níquel' }, { c: '#B0BEC5', l: 'Plata' }, { c: '#7E57C2', l: 'Manganeso' }, { c: '#90A4AE', l: 'Otros' } ] },
  { id: 'alliances', title: 'Bloques militares', active: (a) => a.alliances, items: [
    { c: '#1565C0', l: 'OTAN' }, { c: '#C62828', l: 'OTSC' }, { c: '#00ACC1', l: 'Aliado EE. UU.' } ] },
  { id: 'milspend', title: 'Gasto militar (mil M$)', active: (a) => a.milspend, items: [
    { c: '#9FA8DA', l: '<3' }, { c: '#5C6BC0', l: '3–10' }, { c: '#3949AB', l: '10–30' }, { c: '#283593', l: '30–100' }, { c: '#FF8F00', l: '100–300' }, { c: '#E65100', l: '>300' } ] },
  { id: 'nukes', title: 'Armas nucleares', active: (a) => a.nukes, items: [ { c: '#D32F2F', l: 'Estado nuclear (nº de ojivas)' } ] },
  { id: 'regime', title: 'Régimen político', active: (a) => a.regime, items: [
    { c: '#2E7D32', l: 'Democracia' }, { c: '#9CCC65', l: 'Democracia imperfecta' }, { c: '#FFA726', l: 'Régimen híbrido' }, { c: '#EF5350', l: 'Autoritario' } ] },
  { id: 'sanctions', title: 'Sanciones', active: (a) => a.sanctions, items: [ { c: '#EF5350', l: 'Bajo sanciones' } ] },
  { id: 'piracy', title: 'Piratería', active: (a) => a.piracy, items: [ { c: '#EF5350', l: 'Riesgo alto' }, { c: '#FFA726', l: 'Riesgo medio' } ] },
  { id: 'sea', title: 'Altura de ola', active: (a) => a.sea_state, items: [
    { c: '#26C6DA', l: '<1 m' }, { c: '#66BB6A', l: '1–2 m' }, { c: '#FFEE58', l: '2–3 m' }, { c: '#FFA726', l: '3–4 m' }, { c: '#EF5350', l: '4–6 m' }, { c: '#AB47BC', l: '>6 m' } ] },
  { id: 'lows', title: 'Borrascas', active: (a) => a.pressure_lows, items: [
    { c: '#EF5350', l: 'B · centro de baja presión' } ] },
  { id: 'highs', title: 'Anticiclones', active: (a) => a.pressure_highs, items: [
    { c: '#42A5F5', l: 'A · centro de alta presión' } ] },
  { id: 'wind', title: 'Viento (km/h)', active: (a) => a.wind_flow, items: [
    { c: '#4FC3F7', l: '<12 flojo' }, { c: '#66BB6A', l: '12–30 moderado' }, { c: '#FFEE58', l: '30–50 fresco' }, { c: '#FFA726', l: '50–62 fuerte' }, { c: '#EF5350', l: '62–89 temporal' }, { c: '#AB47BC', l: '>89 huracanado' } ] },
  { id: 'housing', title: 'Precio vivienda €/m² · ~4.100 · dato real con fuente', note: 'Dato REAL con fuente citada (pincha una ciudad para ver el enlace). España: oficial MITMA/INE + variación INE en vivo. EE.UU.: ~3.000 condados (Redfin). Europa (≥50k hab), América Latina y resto: portales y fuentes oficiales locales (idealista, MeilleursAgents, Land Registry, FIPE, etc.). Las localidades sin dato fiable se han eliminado.', active: (a) => a.housing_prices, items: [
    { c: '#2E7D32', l: '<1.500' }, { c: '#9CCC65', l: '1.500–2.500' }, { c: '#FFEE58', l: '2.500–4.000' }, { c: '#FFA726', l: '4.000–6.000' }, { c: '#FB8C00', l: '6.000–9.000' }, { c: '#F4511E', l: '9.000–13.000' }, { c: '#B71C1C', l: '>13.000' } ] },
  { id: 'aqi', title: 'Calidad del aire', active: (a) => a.air_quality, items: [
    { c: '#66BB6A', l: 'Buena' }, { c: '#FFEE58', l: 'Moderada' }, { c: '#FFA726', l: 'Dañina (sensibles)' }, { c: '#EF5350', l: 'Dañina' }, { c: '#AB47BC', l: 'Muy dañina' }, { c: '#7B1F1F', l: 'Peligrosa' } ] },
  { id: 'war', title: 'Alertas de guerra', active: (a) => a.conflict_zones, items: [
    { c: '#FF1744', l: 'Guerra activa' }, { c: '#FF9500', l: 'Alta' }, { c: '#FFD500', l: 'Tensión' } ] },
  { id: 'front', title: 'Frente de Ucrania', active: (a) => a.frontline, items: [
    { c: '#A52714', l: 'Ocupado' }, { c: '#0F9D58', l: 'Liberado' }, { c: '#FF5252', l: 'Dirección de ataque' }, { c: '#BCAAA4', l: 'Desconocido' } ] },
  { id: 'warevents', title: 'Sucesos por guerra', active: (a) => has(a, ['war_ukraine', 'war_gaza', 'war_lebanon', 'war_iran', 'war_sudan', 'war_myanmar', 'war_congo', 'war_sahel', 'war_syria']), items: [
    { c: '#4FC3F7', l: 'Rusia–Ucrania' }, { c: '#EF5350', l: 'Israel–Gaza' }, { c: '#FF7043', l: 'Israel–Hezbolá' }, { c: '#AB47BC', l: 'Israel–Irán' }, { c: '#FBC02D', l: 'Sudán' }, { c: '#26A69A', l: 'Myanmar' }, { c: '#66BB6A', l: 'RD Congo' }, { c: '#8D6E63', l: 'Sahel' }, { c: '#EC407A', l: 'Siria' } ] },
  // ── Lote A: política e índices ──
  { id: 'election', title: 'Calendario electoral', active: (a) => a.election, items: [
    { c: '#EF5350', l: '2026' }, { c: '#FFA726', l: '2027' }, { c: '#42A5F5', l: '2028' } ] },
  { id: 'blocs', title: 'Bloques económicos', active: (a) => a.econ_blocs, items: [
    { c: '#E53935', l: 'BRICS+' }, { c: '#1565C0', l: 'UE' }, { c: '#5E35B1', l: 'G7' }, { c: '#00897B', l: 'ASEAN' }, { c: '#43A047', l: 'Mercosur' }, { c: '#FB8C00', l: 'OPEP' } ] },
  { id: 'press', title: 'Libertad de prensa', active: (a) => a.press_freedom, items: [
    { c: '#2E7D32', l: 'Buena' }, { c: '#9CCC65', l: 'Satisfactoria' }, { c: '#FFEE58', l: 'Problemática' }, { c: '#FFA726', l: 'Difícil' }, { c: '#EF5350', l: 'Muy grave' } ] },
  { id: 'cpi', title: 'Corrupción (CPI)', active: (a) => a.corruption, items: [
    { c: '#B71C1C', l: '<30' }, { c: '#EF5350', l: '30–44' }, { c: '#FFA726', l: '45–59' }, { c: '#9CCC65', l: '60–74' }, { c: '#2E7D32', l: '≥75' } ] },
  { id: 'hdi', title: 'Desarrollo humano (IDH)', active: (a) => a.hdi, items: [
    { c: '#B71C1C', l: '<0,55' }, { c: '#FFA726', l: '0,55–0,7' }, { c: '#FFEE58', l: '0,7–0,8' }, { c: '#9CCC65', l: '0,8–0,9' }, { c: '#2E7D32', l: '≥0,9' } ] },
  { id: 'gdp', title: 'PIB per cápita (USD)', active: (a) => a.gdp_pc, items: [
    { c: '#311B92', l: '<2k' }, { c: '#5E35B1', l: '2–10k' }, { c: '#7E57C2', l: '10–30k' }, { c: '#26A69A', l: '30–60k' }, { c: '#00E5FF', l: '≥60k' } ] },
  // ── Lote B: industria estratégica ──
  { id: 'refineries', title: 'Refinerías', active: (a) => a.refineries, items: [ { c: '#A1887F', l: 'Refinería (tamaño = capacidad)' } ] },
  { id: 'lng', title: 'Terminales de GNL', active: (a) => a.lng_terminals, items: [ { c: '#FF7043', l: 'Exportación' }, { c: '#42A5F5', l: 'Importación' } ] },
  { id: 'fabs', title: 'Semiconductores', active: (a) => a.fabs, items: [ { c: '#00E5FF', l: 'Fábrica de chips' } ] },
  { id: 'nuclearp', title: 'Centrales nucleares', active: (a) => a.nuclear_plants, items: [ { c: '#FFD600', l: 'Central (tamaño = MW)' } ] },
  { id: 'dams', title: 'Presas hidroeléctricas', active: (a) => a.dams, items: [ { c: '#4FC3F7', l: 'Presa (tamaño = MW)' } ] },
  { id: 'criticalinfra', title: 'Refinerías y presas (red completa)', active: (a) => a.critical_infra, items: [
    { c: '#FF6D00', l: 'Refinería' }, { c: '#2979FF', l: 'Presa' } ] },
  // ── Lote C: conectividad ──
  { id: 'ixps', title: 'Puntos de intercambio (IXP)', active: (a) => a.ixps, items: [ { c: '#AB47BC', l: 'IXP (tamaño = tráfico)' } ] },
  { id: 'landings', title: 'Cables submarinos', active: (a) => a.cable_landings, items: [ { c: '#26C6DA', l: 'Estación de aterrizaje' } ] },
  { id: 'shutdowns', title: 'Apagones de internet', active: (a) => a.net_shutdowns, items: [
    { c: '#EF5350', l: 'Guerra' }, { c: '#AB47BC', l: 'Elecciones' }, { c: '#FF9800', l: 'Protesta' }, { c: '#42A5F5', l: 'Exámenes' } ] },
  { id: 'mobile', title: 'Cobertura móvil · bajada (Ookla)', active: (a) => a.mobile_coverage, items: [
    { c: '#E53935', l: '<10 Mbps' }, { c: '#FB8C00', l: '10–25' }, { c: '#FDD835', l: '25–50' }, { c: '#9CCC65', l: '50–100' }, { c: '#43A047', l: '100–200' }, { c: '#00E5FF', l: '≥200' } ] },
  // ── Lote D: humanitario y medioambiente ──
  { id: 'camps', title: 'Campos de refugiados', active: (a) => a.refugee_camps, items: [ { c: '#FF9800', l: 'Campo (tamaño = población)' } ] },
  { id: 'defor', title: 'Deforestación', active: (a) => a.deforestation, items: [ { c: '#E53935', l: 'Pérdida de cobertura arbórea' } ] },
  { id: 'gdacs', title: 'Alertas de desastres', active: (a) => a.gdacs, items: [
    { c: '#EF5350', l: 'Roja' }, { c: '#FFA726', l: 'Naranja' }, { c: '#66BB6A', l: 'Verde' } ] },
  { id: 'eonet', title: 'Eventos naturales (NASA)', active: (a) => a.eonet, items: [
    { c: '#FF6B00', l: 'Incendios' }, { c: '#E040FB', l: 'Tormentas' }, { c: '#FF7043', l: 'Volcanes' }, { c: '#4FC3F7', l: 'Hielo/icebergs' }, { c: '#2979FF', l: 'Inundaciones' }, { c: '#8D6E63', l: 'Deslizamientos' }, { c: '#FBC02D', l: 'Sequía' } ] },
  { id: 'displacement', title: 'Desplazados (UNHCR, por origen)', active: (a) => a.displacement, items: [
    { c: '#FFD54F', l: '< 0,5 M' }, { c: '#FF9800', l: '0,5–2 M' }, { c: '#EF5350', l: '2–5 M' }, { c: '#B71C1C', l: '> 5 M' } ] },
  { id: 'heat', title: 'Temperatura máx. hoy', active: (a) => a.heat, items: [
    { c: '#2979FF', l: '< 12°' }, { c: '#66BB6A', l: '~22°' }, { c: '#FBC02D', l: '~30°' }, { c: '#FF6B00', l: '~36°' }, { c: '#D32F2F', l: '≥ 42°' } ] },
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
        <span title={cur.note} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--gold-primary)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0, cursor: cur.note ? 'help' : 'default' }}>{cur.title}{cur.note ? ' ⓘ' : ''}</span>
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
