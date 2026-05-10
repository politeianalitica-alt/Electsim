'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import SettingsTabs, { SettingsTab } from '../_components/intel/SettingsTabs'
import IntelCard from '../_components/intel/IntelCard'
import IntelBadge from '../_components/intel/IntelBadge'
import IntelEmpty from '../_components/intel/IntelEmpty'
import { isAuthenticated } from '@/lib/auth'
import { useFuentes, useTeam } from '@/hooks/intelligence'
import { intelligenceApi } from '@/lib/api/intelligence'
import { useApi } from '@/lib/useApi'
import type { Fuente, TipoFuente, CredibilidadFuente } from '@/types/intelligence'

const TIPO_FUENTE_OPTS: TipoFuente[] = ['oficial', 'medio', 'osint', 'humint', 'sigint', 'datos_abiertos', 'redes_sociales', 'documento', 'otro']
const CRED_OPTS: CredibilidadFuente[] = ['A', 'B', 'C', 'D', 'E', 'F']

export default function SettingsPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<SettingsTab>('perfil')

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 28px 80px' }}>
        <header style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 6px' }}>Ajustes</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.022em', margin: 0 }}>Configuracion</h1>
        </header>

        <div style={{ marginBottom: 16 }}>
          <SettingsTabs active={tab} onChange={setTab} />
        </div>

        {tab === 'perfil' && <PerfilTab />}
        {tab === 'workspace' && <WorkspaceTab />}
        {tab === 'fuentes' && <FuentesTab />}
        {tab === 'equipo' && <EquipoTab />}
      </main>
    </div>
  )
}

function PerfilTab() {
  return (
    <IntelCard padding="22px 26px">
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Perfil del usuario</h3>
      <Row label="Nombre" value="Analista Politeia" />
      <Row label="Email" value="usuario@politeia.es" />
      <Row label="Rol" value={<IntelBadge color="#1F4E8C">Analista</IntelBadge>} />
      <Row label="Workspace activo" value="Energia Espana" />
      <p style={{ marginTop: 14, fontSize: 11.5, color: '#86868b' }}>El perfil se gestiona desde la administracion central. Contacta con un admin para actualizar tus datos.</p>
    </IntelCard>
  )
}

interface Workspace { id: string; name: string; sector?: string; description?: string }

function WorkspaceTab() {
  const { data } = useApi<{ items?: Workspace[] } | Workspace[]>('/api/workspaces', { refreshInterval: 0 })
  const arr = Array.isArray(data) ? data : (data?.items ?? [])
  const fallback: Workspace[] = [
    { id: 'spain-energy', name: 'Energia Espana', sector: 'Energia', description: 'Vigilancia regulatoria y narrativa sectorial.' },
    { id: 'banking-eu', name: 'Banca UE', sector: 'Banca', description: 'Monitorizacion MiCA, DORA y supervision BCE.' },
  ]
  const items = arr.length > 0 ? arr : fallback
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '')

  return (
    <IntelCard padding="22px 26px">
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Workspaces disponibles</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
        {items.map(w => (
          <button key={w.id} onClick={() => setActiveId(w.id)}
            style={{
              textAlign: 'left', padding: '14px 16px', border: `1px solid ${activeId === w.id ? '#1F4E8C' : '#ECECEF'}`,
              background: '#fff', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</span>
              {activeId === w.id && <IntelBadge color="#1F4E8C" variant="solid" size="xs">Activo</IntelBadge>}
            </div>
            {w.sector && <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>{w.sector}</div>}
            {w.description && <div style={{ fontSize: 11.5, color: '#86868b', lineHeight: 1.4 }}>{w.description}</div>}
          </button>
        ))}
      </div>
    </IntelCard>
  )
}

function FuentesTab() {
  const { data, isLoading, refetch } = useFuentes()
  const items = data?.items ?? []
  const [editing, setEditing] = useState<Partial<Fuente> & { id?: string } | null>(null)

  function startNew() { setEditing({ nombre: '', tipo: 'oficial', credibilidad_default: 'B', activa: true }) }
  function startEdit(f: Fuente) { setEditing({ ...f }) }
  async function save() {
    if (!editing || !editing.nombre || !editing.tipo) return
    try {
      if (editing.id) {
        await intelligenceApi.updateFuente(editing.id, editing)
      } else {
        await intelligenceApi.createFuente({
          nombre: editing.nombre,
          tipo: editing.tipo as TipoFuente,
          url: editing.url,
          credibilidad_default: editing.credibilidad_default as CredibilidadFuente | undefined,
          descripcion: editing.descripcion,
        })
      }
      setEditing(null)
      refetch()
    } catch {}
  }
  async function remove(id: string) {
    if (!confirm('Eliminar fuente?')) return
    try { await intelligenceApi.deleteFuente(id); refetch() } catch {}
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: editing ? '1.5fr 1fr' : '1fr', gap: 16 }}>
      <IntelCard padding="0">
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ECECEF' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Fuentes registradas · {items.length}</h3>
          <button onClick={startNew} style={primaryBtn}>Nueva fuente</button>
        </div>
        {isLoading && <div style={{ padding: 30 }}><IntelEmpty title="Cargando fuentes" /></div>}
        {!isLoading && items.length === 0 && <div style={{ padding: 30 }}><IntelEmpty title="Sin fuentes" description="Anade la primera fuente." /></div>}
        {items.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ECECEF' }}>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Cred.</Th>
                <Th>Activa</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((f, i) => (
                <tr key={f.id} style={{ borderBottom: i < items.length - 1 ? '1px solid #F5F5F7' : 'none' }}>
                  <td style={{ padding: '10px 18px', fontWeight: 600 }}>{f.nombre}</td>
                  <td style={{ padding: '10px 18px', color: '#3a3a3d' }}>{f.tipo}</td>
                  <td style={{ padding: '10px 18px' }}><IntelBadge color="#1F4E8C" size="xs">{f.credibilidad_default ?? '-'}</IntelBadge></td>
                  <td style={{ padding: '10px 18px' }}>{f.activa ? 'Si' : 'No'}</td>
                  <td style={{ padding: '10px 18px', textAlign: 'right' }}>
                    <button onClick={() => startEdit(f)} style={iconBtn}>Editar</button>
                    <button onClick={() => remove(f.id)} style={{ ...iconBtn, color: '#DC2626' }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </IntelCard>

      {editing && (
        <IntelCard padding="22px 24px">
          <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>{editing.id ? 'Editar fuente' : 'Nueva fuente'}</h4>
          <Field label="Nombre" value={editing.nombre ?? ''} onChange={v => setEditing({ ...editing, nombre: v })} />
          <FieldSelect label="Tipo" value={editing.tipo as string ?? 'oficial'} options={TIPO_FUENTE_OPTS} onChange={v => setEditing({ ...editing, tipo: v as TipoFuente })} />
          <Field label="URL" value={editing.url ?? ''} onChange={v => setEditing({ ...editing, url: v })} />
          <FieldSelect label="Credibilidad" value={editing.credibilidad_default as string ?? 'B'} options={CRED_OPTS} onChange={v => setEditing({ ...editing, credibilidad_default: v as CredibilidadFuente })} />
          <Field label="Descripcion" value={editing.descripcion ?? ''} onChange={v => setEditing({ ...editing, descripcion: v })} multiline />
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button onClick={save} style={primaryBtn}>Guardar</button>
            <button onClick={() => setEditing(null)} style={secondaryBtn}>Cancelar</button>
          </div>
        </IntelCard>
      )}
    </div>
  )
}

function EquipoTab() {
  const { data, isLoading } = useTeam()
  const items = data?.items ?? []
  return (
    <IntelCard padding="0">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #ECECEF' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Miembros del equipo · {items.length}</h3>
      </div>
      {isLoading && <div style={{ padding: 30 }}><IntelEmpty title="Cargando" /></div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ECECEF' }}>
            <Th>Nombre</Th>
            <Th>Email</Th>
            <Th>Rol</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={m.id} style={{ borderBottom: i < items.length - 1 ? '1px solid #F5F5F7' : 'none' }}>
              <td style={{ padding: '10px 18px', fontWeight: 600 }}>{m.nombre}</td>
              <td style={{ padding: '10px 18px', color: '#3a3a3d' }}>{m.email}</td>
              <td style={{ padding: '10px 18px' }}><IntelBadge color="#1F4E8C" size="xs">{m.rol}</IntelBadge></td>
              <td style={{ padding: '10px 18px' }}>{m.activo ? 'Activo' : 'Inactivo'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </IntelCard>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', textAlign: 'left' }}>{children}</th>
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F5F7' }}>
      <div style={{ width: 160, fontSize: 11.5, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, color: '#1d1d1f' }}>{value}</div>
    </div>
  )
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const sharedStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #ECECEF', borderRadius: 8,
    fontSize: 12.5, fontFamily: 'inherit', color: '#1d1d1f', background: '#fff',
  }
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ ...sharedStyle, resize: 'vertical' }} />
        : <input value={value} onChange={e => onChange(e.target.value)} style={sharedStyle} />}
    </div>
  )
}

function FieldSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ECECEF', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', color: '#1d1d1f', background: '#fff' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  background: '#1F4E8C', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const secondaryBtn: React.CSSProperties = {
  background: '#F5F5F7', color: '#3a3a3d', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#6e6e73', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: '2px 8px', fontFamily: 'inherit',
}
