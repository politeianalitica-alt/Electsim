'use client'
/**
 * Scoring de exposición regulatoria · empresas españolas de defensa.
 *
 * Evalúa cada empresa contra 5 dimensiones de riesgo:
 *   - ITAR (USA): exposición a tecnología americana controlada
 *   - EAR (USA): exposición a items de doble uso americanos
 *   - EU 2021/821: control UE de doble uso
 *   - Sanciones: riesgo proveedores/clientes en listas
 *   - Exportación: dependencia de mercados sensibles
 *
 * Cada dimensión 0-100, score global ponderado. Heurística basada en
 * perfil sectorial conocido públicamente (no datos confidenciales).
 */

import { EMPRESAS_DEFENSA } from '@/lib/sources/worldbank'

interface ExposicionEmpresa {
  nombre: string
  segmento: string
  itar: number
  ear: number
  euDoble: number
  sanciones: number
  exportacion: number
  scoreGlobal: number
  banda: 'baja' | 'media' | 'alta' | 'crítica'
  riesgosClave: string[]
}

const PERFIL_RIESGO: Record<string, { itar: number; ear: number; euDoble: number; sanciones: number; exportacion: number; notas: string[] }> = {
  // Aeronáutica + defensa multi-dominio
  'Airbus Defence & Space España': {
    itar: 70, ear: 75, euDoble: 85, sanciones: 60, exportacion: 80,
    notas: ['Tecnología A400M/Eurofighter incorpora componentes USA', 'Exportador a Oriente Medio y Asia'],
  },
  // Naval militar — alta dependencia ITAR (sistemas combate, sonares)
  'Navantia': {
    itar: 75, ear: 70, euDoble: 80, sanciones: 55, exportacion: 75,
    notas: ['Sistema combate AEGIS bajo ITAR', 'Exportación submarinos/fragatas — Australia, India, Arabia Saudí'],
  },
  // Electrónica/T&D — exposición máxima por TICs sensibles
  'Indra': {
    itar: 80, ear: 85, euDoble: 90, sanciones: 65, exportacion: 70,
    notas: ['Radares y sistemas mando-control con tecnología dual-use', 'Componentes electrónicos USA'],
  },
  // Vehículos blindados
  'GDELS-Santa Bárbara Sistemas': {
    itar: 65, ear: 60, euDoble: 75, sanciones: 50, exportacion: 70,
    notas: ['Cadena de blindaje incluye proveedores USA', 'Filial General Dynamics — alineamiento doctrina USA'],
  },
  // Subsistemas / electrónica embarcada
  'Tecnobit-Grupo Oesía': {
    itar: 60, ear: 65, euDoble: 75, sanciones: 45, exportacion: 60,
    notas: ['Visores y sistemas optrónicos para Eurofighter, F-35'],
  },
  // Munición / propulsantes
  'Expal Systems': {
    itar: 50, ear: 55, euDoble: 65, sanciones: 60, exportacion: 80,
    notas: ['Exportador municiones — mercados sensibles MENA', 'Reg. EU armas convencionales'],
  },
  // Telco / ciberdefensa
  'Telefónica Tech': {
    itar: 55, ear: 70, euDoble: 80, sanciones: 40, exportacion: 50,
    notas: ['Ciberdefensa institucional — sin exportación masiva', 'EAR estándar TICs'],
  },
  // Defensa estratégica turbo gas
  'ITP Aero': {
    itar: 70, ear: 75, euDoble: 75, sanciones: 45, exportacion: 65,
    notas: ['Motores Eurofighter/A400M — componentes USA', 'EJ200 con licencias USA'],
  },
  // ENA — astilleros
  'Sener Aeroespacial': {
    itar: 55, ear: 60, euDoble: 70, sanciones: 40, exportacion: 55,
    notas: ['Espacio + UAVs — competencias propias mayoritarias'],
  },
  // INDRA tecnologías ATM
  'Aertec Solutions': {
    itar: 45, ear: 50, euDoble: 60, sanciones: 30, exportacion: 50,
    notas: ['Ingeniería aeronáutica — bajo riesgo directo ITAR'],
  },
  // Astilleros
  'Escribano M&E': {
    itar: 60, ear: 55, euDoble: 65, sanciones: 40, exportacion: 60,
    notas: ['Sistemas remotos de armas — Reg. EU armas'],
  },
}

function evaluarEmpresa(nombre: string, segmento: string): ExposicionEmpresa {
  const perfil = PERFIL_RIESGO[nombre]
  const itar = perfil?.itar ?? estimarPorSegmento(segmento, 'itar')
  const ear = perfil?.ear ?? estimarPorSegmento(segmento, 'ear')
  const euDoble = perfil?.euDoble ?? estimarPorSegmento(segmento, 'euDoble')
  const sanciones = perfil?.sanciones ?? 40
  const exportacion = perfil?.exportacion ?? 50
  // Ponderación: ITAR + EAR 50% (USA es la jurisdicción más restrictiva); EU 25%; sanciones 15%; export 10%
  const scoreGlobal = Math.round(itar * 0.3 + ear * 0.2 + euDoble * 0.25 + sanciones * 0.15 + exportacion * 0.10)
  const banda: ExposicionEmpresa['banda'] =
    scoreGlobal >= 80 ? 'crítica' :
    scoreGlobal >= 65 ? 'alta' :
    scoreGlobal >= 50 ? 'media' :
                        'baja'
  const riesgosClave: string[] = perfil?.notas ?? []
  if (itar >= 70 && !riesgosClave.some(n => n.includes('ITAR'))) riesgosClave.unshift('Exposición ITAR alta')
  if (sanciones >= 60 && !riesgosClave.some(n => n.toLowerCase().includes('san'))) riesgosClave.push('Riesgo proveedores en listas de sanciones')
  return { nombre, segmento, itar, ear, euDoble, sanciones, exportacion, scoreGlobal, banda, riesgosClave: riesgosClave.slice(0, 3) }
}

function estimarPorSegmento(segmento: string, dim: 'itar' | 'ear' | 'euDoble'): number {
  const s = segmento.toLowerCase()
  if (/electr[oó]nic|ciber|tic/.test(s)) return dim === 'ear' ? 75 : dim === 'euDoble' ? 80 : 70
  if (/aero|aeron[aá]ut|aviaci/.test(s)) return dim === 'itar' ? 70 : 65
  if (/naval|astill/.test(s)) return 65
  if (/blindaj|veh[íi]cul/.test(s)) return 60
  if (/munici/.test(s)) return 55
  return 50
}

export function ExposureScoringCard() {
  const empresas = EMPRESAS_DEFENSA.map(e => evaluarEmpresa(e.nombre, e.segmento))
  empresas.sort((a, b) => b.scoreGlobal - a.scoreGlobal)

  const dist: Record<ExposicionEmpresa['banda'], number> = { 'crítica': 0, 'alta': 0, 'media': 0, 'baja': 0 }
  for (const e of empresas) dist[e.banda]++

  const scoreMedio = Math.round(empresas.reduce((s, e) => s + e.scoreGlobal, 0) / empresas.length)
  const bandaColor: Record<ExposicionEmpresa['banda'], string> = {
    'crítica': '#7F1D1D', 'alta': '#DC2626', 'media': '#F97316', 'baja': '#16A34A',
  }

  return (
    <div>
      {/* HEADER KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 14 }}>
        <KPI label="EMPRESAS EVALUADAS" value={String(empresas.length)} color="#1d1d1f"/>
        <KPI label="SCORE MEDIO" value={`${scoreMedio}/100`} color={bandaColor[scoreMedio >= 80 ? 'crítica' : scoreMedio >= 65 ? 'alta' : scoreMedio >= 50 ? 'media' : 'baja']}/>
        <KPI label="CRÍTICA" value={String(dist['crítica'])} color="#7F1D1D"/>
        <KPI label="ALTA" value={String(dist['alta'])} color="#DC2626"/>
        <KPI label="MEDIA" value={String(dist['media'])} color="#F97316"/>
        <KPI label="BAJA" value={String(dist['baja'])} color="#16A34A"/>
      </div>

      {/* TABLA */}
      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.6fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.4fr', gap: 6, padding: '8px 12px', background: '#FAFAFA', borderBottom: '1px solid #ECECEF', fontSize: 9, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>Empresa</span>
          <span>Segmento</span>
          <span style={{ textAlign: 'center' }}>Banda</span>
          <span style={{ textAlign: 'center' }} title="USA · International Traffic in Arms Regulations">ITAR</span>
          <span style={{ textAlign: 'center' }} title="USA · Export Administration Regulations">EAR</span>
          <span style={{ textAlign: 'center' }} title="EU · Reglamento 2021/821 doble uso">EU 2021</span>
          <span style={{ textAlign: 'center' }} title="Riesgo proveedores en listas">Sanc</span>
          <span style={{ textAlign: 'center' }} title="Exposición a mercados sensibles">Export</span>
          <span style={{ textAlign: 'center' }}>Score</span>
        </div>
        {empresas.map((e, i) => (
          <div key={e.nombre} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.6fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.4fr', gap: 6, padding: '9px 12px', borderBottom: i < empresas.length - 1 ? '1px solid #F5F5F7' : 'none', alignItems: 'center', fontSize: 11 }}>
            <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{e.nombre}</span>
            <span style={{ color: '#3a3a3d', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.segmento}</span>
            <span style={{ textAlign: 'center' }}>
              <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: `${bandaColor[e.banda]}20`, color: bandaColor[e.banda], textTransform: 'uppercase', letterSpacing: '0.04em' }}>{e.banda}</span>
            </span>
            <DimCell value={e.itar}/>
            <DimCell value={e.ear}/>
            <DimCell value={e.euDoble}/>
            <DimCell value={e.sanciones}/>
            <DimCell value={e.exportacion}/>
            <span style={{ textAlign: 'center', fontWeight: 700, color: bandaColor[e.banda], fontFamily: 'var(--font-display)', fontSize: 14 }}>{e.scoreGlobal}</span>
          </div>
        ))}
      </div>

      {/* DETALLE EMPRESAS TOP RIESGO */}
      <div style={{ marginTop: 14 }}>
        <p style={{ margin: '0 0 8px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          DETALLE · TOP 4 EMPRESAS DE MAYOR EXPOSICIÓN
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          {empresas.slice(0, 4).map(e => (
            <div key={e.nombre} style={{ padding: 10, background: '#FAFAFA', borderRadius: 8, borderLeft: `3px solid ${bandaColor[e.banda]}`, border: '1px solid #ECECEF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{e.nombre}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: bandaColor[e.banda], fontFamily: 'var(--font-display)' }}>{e.scoreGlobal}</span>
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 14, fontSize: 10.5, color: '#3a3a3d', lineHeight: 1.4 }}>
                {e.riesgosClave.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
        Metodología: Score = ITAR (30%) + EAR (20%) + EU 2021/821 (25%) + Sanciones (15%) + Exportación a mercados sensibles (10%).
        Las puntuaciones son orientativas y se basan en perfil sectorial público de cada compañía.
        No constituyen asesoramiento jurídico ni de compliance.
      </p>
    </div>
  )
}

function DimCell({ value }: { value: number }) {
  const color = value >= 80 ? '#7F1D1D' : value >= 65 ? '#DC2626' : value >= 50 ? '#F97316' : '#16A34A'
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 999, background: `${color}15`, color, fontSize: 10, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 8 }}>
      <p style={{ margin: 0, fontSize: 8.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  )
}
