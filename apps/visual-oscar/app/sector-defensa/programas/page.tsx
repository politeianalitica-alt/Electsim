'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { ProgramCard } from './_components/ProgramCard'
import { ProgramGantt } from './_components/ProgramGantt'
import { ProgramDetail } from './_components/ProgramDetail'
import { CapabilityMatrix } from './_components/CapabilityMatrix'
import { SupplyChainGraph } from './_components/SupplyChainGraph'

interface Programa {
  id: string; nombre: string; nombre_corto: string; descripcion: string
  estado: string; tipo: string; paises: string[]
  inicio: number; fin_previsto: number
  coste_total_M?: number; coste_espana_M?: number
  fase_actual: string; progreso_pct: number
  fases: Array<{ id: string; nombre: string; inicio: number; fin: number; estado: string; descripcion?: string; coste_M?: number }>
  hitos: Array<{ id: string; nombre: string; fecha: string; estado: 'alcanzado' | 'pendiente' | 'retrasado'; descripcion?: string }>
  empresas: Array<{ nombre: string; pais: string; rol: string; participacion_pct?: number; segmento: string }>
  fuente_url?: string; organismo_gestor?: string; bandera_emoji: string
}

interface ProgramasResp {
  items: Programa[]
  resumen: { total: number; por_estado: Record<string,number>; coste_total_M: number; coste_espana_M: number }
}

type Subtab = 'programas' | 'gantt' | 'supplychain' | 'matriz'

const TIPO_FILTROS = ['todos', 'aeronautico', 'naval', 'industrial']

export default function ProgramasPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [data, setData]           = useState<ProgramasResp | null>(null)
  const [selected, setSelected]   = useState<Programa | null>(null)
  const [loading, setLoading]     = useState(true)
  const [subtab, setSubtab]       = useState<Subtab>('programas')
  const [tipoFiltro, setTipoFiltro] = useState('todos')

  useEffect(() => {
    fetch('/api/sectores/defensa/programas')
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => { setData(d); setLoading(false) })
  }, [])

  const programas = data?.items ?? []
  const filtrados = tipoFiltro === 'todos' ? programas : programas.filter(p => p.tipo === tipoFiltro)

  return (
    <div style={{ paddingTop: 24 }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
            DEFENSA · PROGRAMAS DE ADQUISICIÓN
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
            Grandes programas
          </h1>
        </div>

        {/* Filtro tipo */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TIPO_FILTROS.map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)}
              style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                borderColor: tipoFiltro === t ? '#1d1d1f' : '#DDDDE3',
                background: tipoFiltro === t ? '#1d1d1f' : '#fff',
                color: tipoFiltro === t ? '#fff' : '#6e6e73',
                textTransform: 'capitalize',
              }}
            >{t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI STRIP */}
      {data?.resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Programas',        value: String(data.resumen.total),                                             color: '#1d1d1f' },
            { label: 'Coste total',      value: `${(data.resumen.coste_total_M/1000).toFixed(0)}b €`,                   color: '#1F4E8C' },
            { label: 'Coste España',     value: `${(data.resumen.coste_espana_M/1000).toFixed(0)}b €`,                  color: '#DC2626' },
            { label: 'Activos',          value: String(data.resumen.por_estado['activo'] ?? 0),                         color: '#16A34A' },
            { label: 'En riesgo',        value: String(data.resumen.por_estado['en_riesgo'] ?? 0),                      color: '#D97706' },
          ].map(k => (
            <div key={k.label} style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TABS */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ECECEF', marginBottom: 16 }}>
        {([
          { id: 'programas',   label: 'Fichas de programa' },
          { id: 'gantt',       label: 'Gantt interactivo' },
          { id: 'supplychain', label: 'Red de suministro' },
          { id: 'matriz',      label: 'Matriz capacidades' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setSubtab(t.id)}
            style={{
              padding: '9px 18px', fontSize: 12.5, fontWeight: subtab === t.id ? 600 : 400,
              color: subtab === t.id ? '#1d1d1f' : '#6e6e73',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${subtab === t.id ? '#1d1d1f' : 'transparent'}`,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
            }}
          >{t.label}
          </button>
        ))}
      </div>

      {/* FICHAS TAB */}
      {subtab === 'programas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading && <div style={{ textAlign: 'center', padding: 32, color: '#86868b', fontSize: 13 }}>Cargando programas…</div>}
            {filtrados.map(p => (
              <ProgramCard
                key={p.id}
                programa={p}
                selected={selected?.id === p.id}
                onClick={() => setSelected(selected?.id === p.id ? null : p)}
              />
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, minHeight: 400, overflow: 'hidden', position: 'sticky', top: 80, alignSelf: 'start', maxHeight: '80vh' }}>
            <ProgramDetail programa={selected} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}

      {/* GANTT TAB */}
      {subtab === 'gantt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtrados.map(p => (
            <Panel
              key={p.id}
              title={`${p.bandera_emoji} ${p.nombre_corto}`}
              subtitle={`${p.fase_actual} · Progreso ${p.progreso_pct}%`}
            >
              <ProgramGantt
                nombre={p.nombre}
                fases={p.fases}
                inicio={p.inicio}
                fin_previsto={p.fin_previsto}
              />
            </Panel>
          ))}
        </div>
      )}

      {/* SUPPLY CHAIN TAB */}
      {subtab === 'supplychain' && (
        <Panel
          title="Red industrial de suministro · empresas ↔ programas"
          subtitle={`${filtrados.length} programas · grafo de relaciones contractuales · agrupado por país`}
          sourceLabel="OCCAR + DGAM + datos públicos"
        >
          <SupplyChainGraph programas={filtrados}/>
        </Panel>
      )}

      {/* MATRIZ TAB */}
      {subtab === 'matriz' && (
        <Panel
          title="Matriz de capacidades tecnológicas · OTAN"
          subtitle="España vs principales aliados · 12 capacidades industriales · Autoevaluación basada en datos OCCAR + DGAM + IISS"
        >
          <CapabilityMatrix />
        </Panel>
      )}
    </div>
  )
}
