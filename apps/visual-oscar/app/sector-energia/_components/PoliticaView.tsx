'use client'
/**
 * <PoliticaView /> · Sprint Energía · EN4
 *
 * Pestaña "Política energética" del módulo /sector-energia. Compone, en orden:
 *
 *   1) <PoliticaOperacionEntsoe /> — transparencia operativa EN VIVO (ENTSO-E:
 *      outages, capacidad instalada, embalses). Lo primero porque es el dato más
 *      "vivo" y de mayor valor de inteligencia.
 *   2) <PoliticaRegulacion /> — regulación viva (BOE energía, EUR-Lex, CNMC).
 *   3) <PoliticaEstrategia /> — PNIEC 2030, programas/PERTE, subastas REER.
 *   4) <PoliticaMercado /> — mercado regulado e impuestos (PVPC, peajes, IEE,
 *      IVPEE, bono social).
 *   5) <NoticiasEnergia tipo="politica" /> — noticias de política/regulación.
 *   6) <SectorIntelPanel sector="energia" compact /> — inteligencia sectorial.
 *
 * La data de política (regulación + estrategia + mercado) se descarga UNA vez
 * aquí (de /api/energia/politica) y se inyecta por prop a los tres bloques
 * curados, evitando 3 fetches redundantes. La operación ENTSO-E y las noticias
 * se auto-fetchean (fuentes distintas). Degradación honesta en cada bloque
 * (CLAUDE.md). Cero emojis · Unicode (◉ ◆ ◇). ACCENT verde energía '#16A34A'.
 */
import { useEffect, useState } from 'react'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { PoliticaOperacionEntsoe } from './PoliticaOperacionEntsoe'
import { PoliticaRegulacion } from './PoliticaRegulacion'
import { PoliticaEstrategia } from './PoliticaEstrategia'
import { PoliticaMercado } from './PoliticaMercado'
import NoticiasEnergia from './NoticiasEnergia'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#0F7A38'

// Forma mínima de la data de política consumida por los bloques curados.
interface PoliticaData {
  ok: boolean
  regulacion: {
    boe: { ok: boolean; live: boolean; items: unknown[]; n: number; error?: string; source_url?: string }
    eurlex: { ok: boolean; live: boolean; items: unknown[]; n: number; error?: string; source_url?: string }
    cnmc: { ok: boolean; live: boolean; items: unknown[]; n: number; error?: string; source_url?: string }
  }
  estrategia: { pniec: unknown[]; programas: unknown[]; subastas: unknown[] }
  mercado: { pvpc: unknown[]; peajes: unknown[]; impuestos: unknown[]; bono_social: unknown[] }
  fuentes_error: string[]
  fetched_at: string
}
interface PoliticaEnvelope {
  ok: boolean
  data: PoliticaData | null
  error: string | null
  fetched_at: string
  source_url: string
}

export function PoliticaView() {
  // undefined = aún cargando; null = fallo de fuente; objeto = datos. Se guarda
  // como `unknown` para castear sin fricción a la forma que espera cada bloque
  // curado (cada uno declara su propio PoliticaData estructuralmente equivalente).
  const [politica, setPolitica] = useState<unknown>(undefined)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/energia/politica', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<PoliticaEnvelope>) : null))
      .then((j) => {
        if (cancelled) return
        setPolitica(j?.data ?? null)
        setUpdatedAt(new Date())
      })
      .catch(() => {
        if (cancelled) return
        setPolitica(null)
        setUpdatedAt(new Date())
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Mientras el fetch está en vuelo (undefined), los bloques curados muestran su
  // propio loading; una vez resuelto pasamos PoliticaData | null como prop.
  // Cada bloque declara su propio PoliticaData (estructuralmente equivalente);
  // casteamos por componente con React.ComponentProps para evitar el choque de
  // identidad nominal entre módulos sin recurrir a `any`.
  type RegData = React.ComponentProps<typeof PoliticaRegulacion>['data']
  type EstData = React.ComponentProps<typeof PoliticaEstrategia>['data']
  type MerData = React.ComponentProps<typeof PoliticaMercado>['data']

  return (
    <>
      {/* ───── Cabecera de sección ───── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
          borderRadius: 18,
          padding: '28px 36px',
          marginBottom: 18,
          color: '#fff',
        }}
      >
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.82, textTransform: 'uppercase', margin: '0 0 8px' }}>
          SECTORIAL · ENERGÍA Y SUMINISTROS · POLÍTICA
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
          Política energética <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.78 }}>España y Unión Europea</em>
        </h1>
        <p style={{ fontSize: 13, opacity: 0.86, margin: 0, lineHeight: 1.55, maxWidth: 880 }}>
          Marco regulatorio y estratégico del sistema energético: transparencia operativa en vivo
          (indisponibilidades, capacidad instalada y reserva hidráulica vía ENTSO-E), normativa nueva
          del BOE, legislación clave de la UE y resoluciones de la CNMC, los objetivos del PNIEC 2030 y
          los programas (REPowerEU, PERTE), y el mercado regulado e impuestos (PVPC, peajes, IEE,
          impuesto de generación y bono social).
        </p>
        {updatedAt && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.72 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A7F3C4', boxShadow: '0 0 8px #A7F3C4' }} />
            Última actualización · {updatedAt.toLocaleTimeString('es-ES')}
          </div>
        )}
      </section>

      {/* 1) Transparencia operativa en vivo (ENTSO-E) */}
      <PoliticaOperacionEntsoe zone="ES" />

      {/* 2) Regulación viva (BOE · EUR-Lex · CNMC) */}
      <PoliticaRegulacion data={politica as RegData} />

      {/* 3) Estrategia (PNIEC · programas/PERTE · subastas REER) */}
      <PoliticaEstrategia data={politica as EstData} />

      {/* 4) Mercado regulado e impuestos */}
      <PoliticaMercado data={politica as MerData} />

      {/* 5) Noticias de política y regulación energética */}
      <NoticiasEnergia tipo="politica" />

      {/* 6) Inteligencia operativa sectorial */}
      <SectorIntelPanel sector="energia" compact />
    </>
  )
}

export default PoliticaView
