'use client'
/**
 * <IatiOrgsTable /> · Tercer Sector v3 · Sprint TS5
 *
 * Tabla del DIRECTORIO de ONGD españolas reportantes en IATI (Registry CKAN,
 * KEYLESS — funciona siempre, también en modo degradado). Columnas: nombre,
 * referencia IATI, tipo de organización, nº de datasets. Las curadas se marcan.
 * Clic en una fila con `iati_ref` → drill: filtra las actividades por esa org
 * (el padre llama al Datastore; si no hay key, lo dice honestamente).
 *
 * Buscador local + orden por nº de datasets / nombre. Cero emojis · es-ES.
 */
import { useMemo, useState } from 'react'
import type { IatiOrg } from '@/lib/tercer-sector/iati-types'
import { ACCENT, ACCENT_DARK, CoopEmpty, fmtInt } from './CoopShared'

// Códigos IATI OrganisationType → etiqueta breve (subset frecuente).
const ORG_TYPE: Record<string, string> = {
  '10': 'Gobierno', '11': 'Gobierno local', '15': 'Otro público',
  '21': 'ONG internacional', '22': 'ONG nacional', '23': 'ONG regional',
  '24': 'ONG país socio', '30': 'Pública-privada', '40': 'Multilateral',
  '60': 'Fundación', '70': 'Privada', '71': 'Privada (PYME)',
  '72': 'Privada (grande)', '73': 'Privada (consultora)',
  '80': 'Académica', '90': 'Otra',
}

interface IatiOrgsTableProps {
  orgs: IatiOrg[]
  selectedOrgRef?: string | null
  onSelectOrg?: (ref: string, name: string) => void
  /** Sprint IATI-MAX · abre el drawer de perfil de la ONGD (separado del drill). */
  onOpenProfile?: (ref: string, name: string) => void
}

type SortKey = 'datasets' | 'name'

export function IatiOrgsTable({ orgs, selectedOrgRef, onSelectOrg, onOpenProfile }: IatiOrgsTableProps) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('datasets')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = orgs
    if (needle) {
      list = orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(needle) ||
          (o.iati_ref ?? '').toLowerCase().includes(needle) ||
          o.slug.toLowerCase().includes(needle),
      )
    }
    const sorted = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'es')
      // datasets desc, curadas primero a igualdad
      if (b.dataset_count !== a.dataset_count) return b.dataset_count - a.dataset_count
      if (a.curated_spanish !== b.curated_spanish) return a.curated_spanish ? -1 : 1
      return a.name.localeCompare(b.name, 'es')
    })
    return sorted
  }, [orgs, q, sort])

  if (orgs.length === 0) {
    return <CoopEmpty>No se encontraron ONGD españolas reportantes en el Registry IATI.</CoopEmpty>
  }

  const sel = selectedOrgRef ?? null

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ONGD por nombre o referencia IATI…"
          style={{
            flex: '1 1 240px',
            minWidth: 200,
            padding: '7px 10px',
            fontSize: 12.5,
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['datasets', 'name'] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              style={{
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid ' + (sort === k ? ACCENT : '#E2E8F0'),
                background: sort === k ? '#F0FDF4' : '#fff',
                color: sort === k ? ACCENT_DARK : '#64748B',
                cursor: 'pointer',
              }}
            >
              {k === 'datasets' ? 'Por nº datasets' : 'Por nombre'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid #ECECEF', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1 }}>
              <Th style={{ textAlign: 'left' }}>Organización</Th>
              <Th style={{ textAlign: 'left' }}>Ref. IATI</Th>
              <Th style={{ textAlign: 'left' }}>Tipo</Th>
              <Th style={{ textAlign: 'right' }}>Datasets</Th>
              {onOpenProfile && <Th style={{ textAlign: 'right' }}>Perfil</Th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const drillable = Boolean(o.iati_ref) && Boolean(onSelectOrg)
              const isSel = sel != null && o.iati_ref === sel
              return (
                <tr
                  key={o.slug}
                  onClick={() => { if (drillable && o.iati_ref) onSelectOrg?.(o.iati_ref, o.name) }}
                  style={{
                    borderTop: '1px solid #F1F5F9',
                    cursor: drillable ? 'pointer' : 'default',
                    background: isSel ? '#F0FDF4' : 'transparent',
                  }}
                >
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{o.name}</span>
                      {o.curated_spanish && (
                        <span
                          title="ONGD curada"
                          style={{ fontSize: 9, fontWeight: 800, color: ACCENT_DARK, background: '#DCFCE7', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}
                        >
                          CURADA
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {o.iati_ref ? (
                      <code style={{ fontSize: 10.5, color: '#475569' }}>{o.iati_ref}</code>
                    ) : (
                      <span style={{ fontSize: 10.5, color: '#CBD5E1' }}>sin ref</span>
                    )}
                  </Td>
                  <Td>
                    <span style={{ fontSize: 11.5, color: '#64748B' }}>
                      {o.org_type ? ORG_TYPE[o.org_type] ?? `Tipo ${o.org_type}` : '—'}
                    </span>
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: ACCENT_DARK }}>
                      {fmtInt(o.dataset_count)}
                    </span>
                  </Td>
                  {onOpenProfile && (
                    <Td style={{ textAlign: 'right' }}>
                      {o.iati_ref ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (o.iati_ref) onOpenProfile(o.iati_ref, o.name)
                          }}
                          aria-label={`Abrir perfil de ${o.name}`}
                          style={{
                            background: '#fff',
                            border: '1px solid ' + ACCENT,
                            color: ACCENT_DARK,
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Ver
                        </button>
                      ) : (
                        <span style={{ fontSize: 10, color: '#CBD5E1' }}>—</span>
                      )}
                    </Td>
                  )}
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={onOpenProfile ? 5 : 4} style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                  Sin coincidencias para “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 10.5, color: '#94A3B8', margin: '8px 2px 0' }}>
        {fmtInt(filtered.length)} de {fmtInt(orgs.length)} organizaciones · clic en una fila con referencia IATI para ver sus actividades.
      </p>
    </div>
  )
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      style={{
        padding: '9px 12px',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#64748B',
        borderBottom: '1px solid #E2E8F0',
        ...style,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '9px 12px', ...style }}>{children}</td>
}

export default IatiOrgsTable
