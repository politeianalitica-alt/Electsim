'use client'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import IntelHero from '../_components/intel/IntelHero'
import IntelCard from '../_components/intel/IntelCard'
import IntelBadge from '../_components/intel/IntelBadge'
import IntelEmpty from '../_components/intel/IntelEmpty'
import { isAuthenticated } from '@/lib/auth'
import { useTeam } from '@/hooks/intelligence'
import type { TeamMember, TeamRol } from '@/types/intelligence'

const ROL_COLOR: Record<TeamRol, string> = {
  admin: '#DC2626', analista: '#1F4E8C', editor: '#5B21B6', lector: '#6e6e73',
}
const ROL_LABEL: Record<TeamRol, string> = {
  admin: 'Admin', analista: 'Analista', editor: 'Editor', lector: 'Lector',
}

function Initial({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: `${color}20`, color, fontSize: 12, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', letterSpacing: '0.02em',
    }}>{initials}</div>
  )
}

export default function TeamPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, isLoading } = useTeam()
  const items = data?.items ?? []
  const counts = useMemo(() => ({
    total: items.length,
    activos: items.filter(m => m.activo).length,
    admins: items.filter(m => m.rol === 'admin').length,
    analistas: items.filter(m => m.rol === 'analista').length,
  }), [items])

  const activos = items.filter(m => m.activo)
  const inactivos = items.filter(m => !m.activo)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 28px 80px' }}>
        <IntelHero
          eyebrow="EQUIPO · MIEMBROS DEL WORKSPACE"
          title={`${counts.total} miembros · ${counts.activos} activos`}
          subtitle="Administracion del equipo, roles y ultimo acceso. Los administradores pueden invitar y gestionar permisos."
          kpis={[
            { label: 'Activos', value: counts.activos, accent: '#86EFAC' },
            { label: 'Admins', value: counts.admins, accent: '#FCA5A5' },
            { label: 'Analistas', value: counts.analistas, accent: '#7DD3FC' },
            { label: 'Total', value: counts.total, accent: '#C4B5FD' },
          ]}
        />

        {isLoading && <IntelEmpty title="Cargando equipo" />}

        {activos.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <SectionHeader label="Miembros activos" count={activos.length} />
            <MemberTable members={activos} />
          </section>
        )}
        {inactivos.length > 0 && (
          <section>
            <SectionHeader label="Inactivos" count={inactivos.length} />
            <MemberTable members={inactivos} dimmed />
          </section>
        )}
      </main>
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#6e6e73', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: '#ECECEF' }} />
      <IntelBadge color="#1F4E8C" variant="soft" size="xs">{count}</IntelBadge>
    </div>
  )
}

function MemberTable({ members, dimmed }: { members: TeamMember[]; dimmed?: boolean }) {
  return (
    <IntelCard padding="0">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, opacity: dimmed ? 0.7 : 1 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ECECEF', textAlign: 'left' }}>
            <Th>Miembro</Th>
            <Th>Email</Th>
            <Th>Rol</Th>
            <Th>Ultimo acceso</Th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? '1px solid #F5F5F7' : 'none' }}>
              <td style={{ padding: '12px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Initial name={m.nombre} color={ROL_COLOR[m.rol]} />
                  <span style={{ fontWeight: 600 }}>{m.nombre}</span>
                </div>
              </td>
              <td style={{ padding: '12px 18px', color: '#3a3a3d', fontSize: 12.5 }}>{m.email}</td>
              <td style={{ padding: '12px 18px' }}>
                <IntelBadge color={ROL_COLOR[m.rol]} size="xs">{ROL_LABEL[m.rol]}</IntelBadge>
              </td>
              <td style={{ padding: '12px 18px', color: '#6e6e73', fontSize: 12 }}>
                {m.ultimo_acceso ? new Date(m.ultimo_acceso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </IntelCard>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em' }}>{children}</th>
}
