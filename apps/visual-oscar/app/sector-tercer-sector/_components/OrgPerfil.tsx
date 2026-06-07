'use client'
/**
 * <OrgPerfil /> · Dossier · Sección 1 · Perfil institucional.
 *
 * Identidad y datos económicos de la entidad (del catálogo curado servido por
 * /inteligencia): tipo, sector, NIF/CIF, ingresos, empleados, IRPF 0,7%, web,
 * ámbito, registros oficiales y acreditaciones (si las hay). Cita fuente+fecha.
 * Honesto con nulos: importes no publicados → «n/d».
 */
import {
  ACCENT_DARK,
  ambitoLabel,
  ccaaLabel,
  fmtEur,
  fmtEurFull,
  fmtNum,
  FuenteBadge,
  sectorLabel,
  tipoLabel,
} from './OrgShared'
import { DossierKpi, DossierPill, DossierSection, type DossierOrg } from './OrgDossierShared'

function DatoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        padding: '7px 0',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <span style={{ fontSize: 11.5, color: '#64748b' }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#1d1d1f',
          textAlign: 'right',
          fontFamily: mono ? 'var(--font-display)' : 'inherit',
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}

const ACRED_LABEL: Record<string, string> = {
  fundacion_lealtad: 'Fundación Lealtad',
  coordinadora_ongd: 'Coordinadora ONGD',
  plataforma_tercer_sector: 'Plataforma Tercer Sector',
  cepes: 'CEPES',
}

const REGISTRO_LABEL: Record<string, string> = {
  aecid_ongd: 'Registro ONGD (AECID)',
  registro_nacional_asociaciones: 'Registro Nacional de Asociaciones',
  registro_fundaciones: 'Registro de Fundaciones',
  eu_transparency_register: 'EU Transparency Register',
}

export function OrgPerfil({ org }: { org: DossierOrg }) {
  const acred = Object.entries(org.acreditaciones ?? {})
    .filter(([, v]) => v)
    .map(([k]) => ACRED_LABEL[k] ?? k)

  const registros = Object.entries(org.registro_ids ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => ({ label: REGISTRO_LABEL[k] ?? k, value: String(v) }))

  return (
    <DossierSection glyph="◉" title="Perfil institucional" note="Último ejercicio público disponible · cifras como orden de magnitud">
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <DossierKpi label="Ingresos anuales" value={fmtEur(org.ingresos_eur)} accent />
        <DossierKpi label="Empleo directo" value={fmtNum(org.empleados)} />
      </div>

      <DatoRow label="Tipo de entidad" value={tipoLabel(org.tipo)} />
      <DatoRow label="Sector de actividad" value={sectorLabel(org.sector)} />
      <DatoRow label="NIF / CIF" value={org.nif || <span style={{ color: '#cbd5e1' }}>no verificado</span>} mono />
      <DatoRow label="CCAA de la sede" value={org.ccaa ? ccaaLabel(org.ccaa) : '—'} />
      <DatoRow label="Ámbito" value={ambitoLabel(org.ambito)} />
      <DatoRow
        label="IRPF 0,7% Fines Sociales"
        value={
          org.irpf_07 ? (
            <DossierPill tone="accent">Adherida</DossierPill>
          ) : (
            <span style={{ color: '#94a3b8' }}>No consta</span>
          )
        }
      />
      <DatoRow label="Ingresos (exacto)" value={fmtEurFull(org.ingresos_eur)} mono />

      {acred.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: 6,
            }}
          >
            Acreditaciones y pertenencias
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {acred.map((a) => (
              <DossierPill key={a} tone="accent" title="Sello / membresía declarada">
                ✓ {a}
              </DossierPill>
            ))}
          </div>
        </div>
      )}

      {registros.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: 6,
            }}
          >
            Registros oficiales
          </div>
          {registros.map((r) => (
            <DatoRow key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginTop: 14,
          flexWrap: 'wrap',
        }}
      >
        <FuenteBadge fuente={org.fuente} fecha={org.fecha_ref} />
        {org.website && (
          <a
            href={org.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: ACCENT_DARK,
              textDecoration: 'none',
              border: '1px solid rgba(22,163,74,0.4)',
              borderRadius: 8,
              padding: '5px 11px',
            }}
          >
            Web oficial ⟶
          </a>
        )}
      </div>
    </DossierSection>
  )
}

export default OrgPerfil
