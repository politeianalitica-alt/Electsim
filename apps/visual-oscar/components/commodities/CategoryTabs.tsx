'use client'

import { CATEGORIES } from '@/lib/commodities-utils'
import type { CommodityCategory } from '@/types/commodities'

interface Props {
  active: CommodityCategory | 'all'
  onChange: (c: CommodityCategory | 'all') => void
}

export function CategoryTabs({ active, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: 8,
      }}
    >
      <TabButton label="Todas" isActive={active === 'all'} onClick={() => onChange('all')} />
      {CATEGORIES.map((c) => (
        <TabButton
          key={c.value}
          label={c.label}
          isActive={active === c.value}
          onClick={() => onChange(c.value)}
        />
      ))}
    </div>
  )
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid',
        borderColor: isActive ? '#111827' : '#e5e7eb',
        background: isActive ? '#111827' : '#fff',
        color: isActive ? '#fff' : '#374151',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
