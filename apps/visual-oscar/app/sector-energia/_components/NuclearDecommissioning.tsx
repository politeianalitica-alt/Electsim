'use client'
/**
 * <NuclearDecommissioning /> · Energía v3 · Sprint E5 (Nuclear profundo)
 *
 * Coste de desmantelamiento del parque nuclear español + gestión de residuos
 * (fondo ENRESA). Cifras PÚBLICAS curadas del 7.º Plan General de Residuos
 * Radiactivos (PGRR, aprobado por el Consejo de Ministros en dic. 2023) y de
 * Enresa. Se muestran con fuente y fecha de referencia visibles (CLAUDE.md:
 * lo curado se mantiene PERO citado, sin inventar). NO se fija ninguna cifra
 * sin respaldo público.
 *
 * Estas constantes son datos curados (no en vivo): no existe API pública de
 * Enresa para el saldo del fondo en tiempo real. Cada tarjeta indica su fuente.
 *
 * Componente cliente puro (sin fetch). Cero emojis · Unicode geométrico (◉ ⬡).
 */
import { REACTORES_ES } from '@/lib/energia/catalog'
import { summarizeFleet } from '@/lib/energia/nuclear-calc'

const NUCLEAR = '#7c3aed'

// ── Cifras curadas (7.º PGRR · Enresa) ───────────────────────────────────────
// Fuente: 7.º Plan General de Residuos Radiactivos (PGRR), aprobado por el
// Consejo de Ministros el 27 dic. 2023 (MITECO/Enresa). El PGRR estima el coste
// total del programa de gestión de residuos y desmantelamiento del parque hasta
// el cierre del ciclo (incluye desmantelamiento de centrales, gestión de
// combustible gastado, 7 almacenes temporales descentralizados —ATD— y el
// Almacén Geológico Profundo —AGP—). Cifras de orden de magnitud, expresadas en
// euros corrientes del plan; el desglose exacto evoluciona con cada revisión.
const PGRR = {
  // Coste total estimado del 7.º PGRR (gestión de residuos + desmantelamiento).
  coste_total_meur: 20200, // ~20.200 M€ (estimación 7.º PGRR, dic. 2023)
  // Parte específicamente asignada al desmantelamiento de las centrales.
  desmantelamiento_meur: 5700, // ~5.700 M€ (orden de magnitud, 7.º PGRR)
  // Horizonte temporal del plan.
  horizonte: 'hasta ~2100 (cierre del ciclo, AGP incluido)',
  // Tasa Enresa que financia el fondo (a cargo de las titulares, vía recibo).
  tasa_eur_mwh: 7.98, // €/MWh nuclear (tasa Enresa vigente; revisada al alza en 2024)
  fecha_ref: 'diciembre 2023',
  fuente: '7.º Plan General de Residuos Radiactivos (PGRR) · Consejo de Ministros · MITECO / Enresa',
  fuente_url: 'https://www.enresa.es/',
}

function fmtMeur(meur: number): string {
  if (meur >= 1000) return `${(meur / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mil M€`
  return `${meur.toLocaleString('es-ES')} M€`
}

export default function NuclearDecommissioning() {
  const summary = summarizeFleet(REACTORES_ES)
  // Coste de desmantelamiento por GW instalado (orientativo).
  const costePorGw = summary.potencia_operativa_mw > 0
    ? PGRR.desmantelamiento_meur / (summary.potencia_operativa_mw / 1000)
    : null

  return (
    <div>
      {/* Cifras principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
        <BigStat
          label="Coste total 7.º PGRR"
          value={fmtMeur(PGRR.coste_total_meur)}
          sub="residuos + desmantelamiento"
        />
        <BigStat
          label="Desmantelamiento centrales"
          value={fmtMeur(PGRR.desmantelamiento_meur)}
          sub="parte específica del plan"
        />
        <BigStat
          label="Tasa Enresa"
          value={`${PGRR.tasa_eur_mwh.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €/MWh`}
          sub="financia el fondo · a cargo de titulares"
        />
        <BigStat
          label="Coste desmant. por GW"
          value={costePorGw != null ? `${(costePorGw / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} mil M€` : '—'}
          sub={`sobre ${(summary.potencia_operativa_mw / 1000).toFixed(1)} GW operativos`}
        />
      </div>

      {/* Cómo funciona el fondo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <InfoCard
          titular="Fondo finalista gestionado por Enresa"
          detalle="El desmantelamiento y la gestión de residuos se financian con un fondo finalista que nutre la tasa Enresa, repercutida a las titulares (Iberdrola, Endesa, Naturgy, EDP) por la energía nuclear generada. El principio es 'quien contamina, paga': el coste no recae sobre el Estado."
        />
        <InfoCard
          titular="Horizonte muy largo"
          detalle={`El plan cubre ${PGRR.horizonte}. Incluye el desmantelamiento de las centrales tras su cierre (2027-2035), 7 Almacenes Temporales Descentralizados (ATD) en cada emplazamiento para el combustible gastado y, a largo plazo, un Almacén Geológico Profundo (AGP).`}
        />
      </div>

      {/* Fuente */}
      <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 10.5, color: '#5B21B6', lineHeight: 1.5 }}>
          <strong>Datos curados</strong> · {PGRR.fuente}. Referencia: {PGRR.fecha_ref}. Cifras de orden de magnitud
          en euros del plan; no hay API pública para el saldo del fondo en tiempo real, evolucionan con cada revisión.
        </div>
        <a
          href={PGRR.fuente_url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10.5, fontWeight: 700, color: NUCLEAR, whiteSpace: 'nowrap', textDecoration: 'none' }}
        >
          Enresa ⟶
        </a>
      </div>
    </div>
  )
}

function BigStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: NUCLEAR, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 3, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  )
}

function InfoCard({ titular, detalle }: { titular: string; detalle: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, padding: '11px 13px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: NUCLEAR, marginBottom: 4 }}>{titular}</div>
      <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.5 }}>{detalle}</div>
    </div>
  )
}
