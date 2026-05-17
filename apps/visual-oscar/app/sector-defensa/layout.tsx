import AppHeader from '../_components/AppHeader'
import { DefenseTabNav } from './_components/DefenseTabNav'

export default function SectorDefensaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <DefenseTabNav />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '0 28px 80px' }}>
        {children}
      </main>
    </div>
  )
}
