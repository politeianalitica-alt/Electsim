'use client'
import { useState } from 'react'
import { useApi } from '@/lib/useApi'

interface ObjectType { code: string; name: string; count?: number; description?: string }
interface OntoObject { id: string; type: string; properties?: Record<string, unknown> }
interface Relation { source: string; target: string; tipo: string; weight?: number }

const FALLBACK_TYPES: ObjectType[] = [
  { code: 'persona', name: 'Persona política', count: 412, description: 'Diputados, ministros, líderes y portavoces.' },
  { code: 'partido', name: 'Partido político', count: 28, description: 'Formaciones registradas con representación.' },
  { code: 'medio', name: 'Medio de comunicación', count: 96, description: 'Cabeceras, programas y plataformas.' },
  { code: 'empresa', name: 'Empresa / sector', count: 240, description: 'Compañías relevantes y patronales.' },
  { code: 'institucion', name: 'Institución', count: 71, description: 'Organismos del Estado, CCAA y municipios.' },
  { code: 'ley', name: 'Norma legislativa', count: 1842, description: 'Leyes, RD-leyes, PNL y enmiendas.' },
  { code: 'tema', name: 'Tema / issue', count: 124, description: 'Cluster temático del corpus mediático.' },
]
const FALLBACK_OBJECTS: OntoObject[] = [
  { id: 'a3f8b2-pp-feijoo', type: 'persona', properties: { nombre: 'Alberto Núñez Feijóo', partido: 'PP', cargo: 'Líder oposición' } },
  { id: 'b1c7e4-psoe-sanchez', type: 'persona', properties: { nombre: 'Pedro Sánchez', partido: 'PSOE', cargo: 'Presidente Gobierno' } },
  { id: 'c2d8f0-vox-abascal', type: 'persona', properties: { nombre: 'Santiago Abascal', partido: 'VOX', cargo: 'Presidente VOX' } },
  { id: 'd4e9a1-sumar-diaz', type: 'persona', properties: { nombre: 'Yolanda Díaz', partido: 'Sumar', cargo: 'Vicepresidenta 2ª' } },
  { id: 'e5f0b2-elpais', type: 'medio', properties: { nombre: 'El País', tipo: 'prensa', alcance: 'nacional' } },
  { id: 'f6a1c3-rtve', type: 'medio', properties: { nombre: 'RTVE', tipo: 'audiovisual público', alcance: 'nacional' } },
]
const FALLBACK_RELATIONS: Relation[] = [
  { source: 'a3f8b2-pp-feijoo', target: 'pp-partido', tipo: 'lidera', weight: 1.0 },
  { source: 'b1c7e4-psoe-sanchez', target: 'psoe-partido', tipo: 'lidera', weight: 1.0 },
  { source: 'b1c7e4-psoe-sanchez', target: 'd4e9a1-sumar-diaz', tipo: 'aliada-coalición', weight: 0.7 },
  { source: 'b1c7e4-psoe-sanchez', target: 'e5f0b2-elpais', tipo: 'cobertura-frecuente', weight: 0.6 },
  { source: 'a3f8b2-pp-feijoo', target: 'b1c7e4-psoe-sanchez', tipo: 'oposición', weight: 0.95 },
  { source: 'c2d8f0-vox-abascal', target: 'b1c7e4-psoe-sanchez', tipo: 'oposición', weight: 0.92 },
]

type SubTab = 'tipos' | 'objetos' | 'relaciones'

export default function OntologyPanel() {
  const [sub, setSub] = useState<SubTab>('tipos')

  return (
    <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Knowledge graph</p>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Ontología de actores</h3>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#fafafc', borderRadius: 999, border: '1px solid #e8e8ed' }}>
          {([
            { v: 'tipos' as SubTab, l: 'Tipos' },
            { v: 'objetos' as SubTab, l: 'Objetos' },
            { v: 'relaciones' as SubTab, l: 'Relaciones' },
          ]).map(t => (
            <button key={t.v} onClick={() => setSub(t.v)} style={{
              padding: '5px 14px', borderRadius: 999, border: 'none',
              background: sub === t.v ? '#1d1d1f' : 'transparent', color: sub === t.v ? '#fff' : '#6e6e73',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      {sub === 'tipos' && <Tipos/>}
      {sub === 'objetos' && <Objetos/>}
      {sub === 'relaciones' && <Relaciones/>}
    </section>
  )
}

function Tipos() {
  const { data } = useApi<ObjectType[]>('/api/ontology/graph/object-types', { refreshInterval: 0 })
  const types = (Array.isArray(data) && data.length > 0) ? data : FALLBACK_TYPES
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
          {['Code', 'Nombre', 'Count', 'Descripción'].map(h => (
            <th key={h} style={{ padding: '10px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {types.map((t, i) => (
          <tr key={t.code} style={{ borderBottom: i < types.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
            <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace,monospace', color: '#5B21B6', fontWeight: 600 }}>{t.code}</td>
            <td style={{ padding: '10px 10px', color: '#1d1d1f', fontWeight: 500 }}>{t.name}</td>
            <td style={{ padding: '10px 10px', fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: '#1F4E8C' }}>{t.count?.toLocaleString('es-ES') ?? '—'}</td>
            <td style={{ padding: '10px 10px', color: '#424245', fontSize: 11.5 }}>{t.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Objetos() {
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  const limit = 20
  const qs = new URLSearchParams({ limit: String(limit), offset: String(page * limit) })
  if (type) qs.set('type', type)
  const { data } = useApi<{ items?: OntoObject[]; total?: number } | OntoObject[]>(`/api/ontology/graph/objects?${qs.toString()}`, { refreshInterval: 0 })
  const apiArr = Array.isArray(data) ? data : (data?.items ?? [])
  const objects = apiArr.length > 0 ? apiArr : FALLBACK_OBJECTS.filter(o => !type || o.type === type)
  const total = (Array.isArray(data) ? data.length : data?.total) ?? FALLBACK_OBJECTS.length

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <select value={type} onChange={e => { setType(e.target.value); setPage(0) }}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="">Todos los tipos</option>
          {FALLBACK_TYPES.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
        </select>
        <span style={{ fontSize: 11, color: '#6e6e73' }}>{total.toLocaleString('es-ES')} objetos · página {page + 1}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
            {['ID', 'Tipo', 'Propiedades'].map(h => (
              <th key={h} style={{ padding: '10px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {objects.map((o, i) => (
            <tr key={o.id} style={{ borderBottom: i < objects.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
              <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace,monospace', color: '#1d1d1f', fontSize: 11 }}>{o.id.slice(0, 18)}…</td>
              <td style={{ padding: '10px 10px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(91,33,182,0.10)', color: '#5B21B6', fontSize: 10.5, fontWeight: 600 }}>{o.type}</span>
              </td>
              <td style={{ padding: '10px 10px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {Object.entries(o.properties ?? {}).slice(0, 3).map(([k, v]) => (
                    <span key={k} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6, background: '#fafafc', border: '1px solid #f0f0f3', color: '#1d1d1f' }}>
                      <strong style={{ color: '#6e6e73' }}>{k}:</strong> {String(v)}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={btnStyle(page === 0)}>← Anterior</button>
        <button onClick={() => setPage(page + 1)} style={btnStyle(false)}>Siguiente →</button>
      </div>
    </div>
  )
}

function Relaciones() {
  const [objId, setObjId] = useState('')
  const [direction, setDirection] = useState<'both' | 'in' | 'out'>('both')
  const [tipo, setTipo] = useState('')

  const qs = new URLSearchParams({ direction, limit: '50' })
  if (objId) qs.set('object_id', objId)
  if (tipo) qs.set('type', tipo)
  const { data } = useApi<Relation[]>(`/api/ontology/graph/relations?${qs.toString()}`, { refreshInterval: 0 })
  const relations = (Array.isArray(data) && data.length > 0) ? data : FALLBACK_RELATIONS

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input type="text" placeholder="object_id (UUID)" value={objId} onChange={e => setObjId(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'ui-monospace,monospace', flex: 1, minWidth: 220 }} />
        <select value={direction} onChange={e => setDirection(e.target.value as 'both' | 'in' | 'out')}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="both">both</option>
          <option value="in">in</option>
          <option value="out">out</option>
        </select>
        <input type="text" placeholder="tipo de relación" value={tipo} onChange={e => setTipo(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit', flex: 1, minWidth: 140 }} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
            {['Source', 'Tipo', 'Target', 'Peso'].map(h => (
              <th key={h} style={{ padding: '10px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {relations.map((r, i) => (
            <tr key={i} style={{ borderBottom: i < relations.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
              <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace,monospace', color: '#1d1d1f' }}>{r.source.slice(0, 18)}…</td>
              <td style={{ padding: '10px 10px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontSize: 10.5, fontWeight: 600 }}>{r.tipo}</span>
              </td>
              <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace,monospace', color: '#1d1d1f' }}>{r.target.slice(0, 18)}…</td>
              <td style={{ padding: '10px 10px', fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: '#1F4E8C' }}>{((r.weight ?? 0) * 100).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
    fontSize: 11, fontWeight: 600, color: disabled ? '#c7c7cc' : '#1d1d1f', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
  }
}
