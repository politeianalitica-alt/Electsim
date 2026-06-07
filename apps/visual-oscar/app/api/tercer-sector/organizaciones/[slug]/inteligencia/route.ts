/**
 * /api/tercer-sector/organizaciones/[slug]/inteligencia · Dossier de
 * inteligencia por organización · Sprint TS-Cockpit W1d (route).
 *
 * Dado el slug de una entidad del catálogo, agrega su inteligencia en un solo
 * envelope para la ficha-dossier (vista organizaciones del cockpit):
 *
 *   { org, subvenciones_bdns, oportunidades_relacionadas, actividades_iati,
 *     territorios, documentos, alertas }
 *
 * Reglas de matching beneficiario↔org (de mayor a menor confianza): NIF/CIF,
 * iati_ref, nombre normalizado, inclusión de nombre (helper `matchOrganizacion`
 * en el catálogo). Cada bloque DEGRADA de forma honesta (CLAUDE.md): si una
 * fuente falla o no aplica, devuelve `{ ok:false, error }` / `[]` y marca el
 * motivo en `_meta.bloques`, sin inventar datos ni importes.
 *
 * Notas de la LEY VERCEL HOBBY (spec): este endpoint hace red (BDNS + IATI) →
 * `export const maxDuration = 30` (config existente, NO una nueva).
 *
 * `oportunidades_relacionadas`: el lib/endpoint de oportunidades (W1a) puede no
 * existir todavía. Se intenta cargar de forma perezosa y, si no está, el bloque
 * degrada con `error:'oportunidades_no_disponible'` (sin romper el dossier).
 */
import { NextResponse } from 'next/server'
import {
  ORG_BY_SLUG,
  matchOrganizacion,
  type Organizacion,
} from '@/lib/tercer-sector/organizaciones-catalog'
import { fetchConcesiones, type BdnsConcesion } from '@/lib/tercer-sector/bdns'
import { fetchIatiOrgProfile } from '@/lib/tercer-sector/iati-enriched'
import { CCAA_BY_KEY, sectorLabel } from '@/lib/tercer-sector/shared'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const SOURCE_URL = 'https://www.plataformatercersector.es/'

/** Bloque honesto: estado + (data|error) para `_meta.bloques`. */
interface BlockMeta {
  ok: boolean
  count?: number
  error?: string
  note?: string
}

/** Documento de transparencia derivado del catálogo (no inventado). */
interface DossierDocumento {
  nombre: string
  url: string
  tipo: 'memoria' | 'cuentas' | 'auditoria' | 'transparencia' | 'web'
  fuente: string
}

/** Subvención BDNS atribuida a la org (subset de BdnsConcesion + por qué casó). */
interface DossierSubvencion {
  id: string
  importe_eur: number | null
  convocatoria: string | null
  organo: string | null
  nivel: string | null
  territorio: string | null
  fecha: string | null
  /** Cómo se atribuyó a la org: 'nif' | 'nombre'. */
  match: 'nif' | 'nombre'
}

function nowIso(): string {
  return new Date().toISOString()
}

export async function GET(
  req: Request,
  ctx: { params: { slug: string } | Promise<{ slug: string }> },
) {
  const fetched_at = nowIso()
  // Next 14/15: params puede ser una promesa.
  const params = await Promise.resolve(ctx.params)
  const slug = (params?.slug || '').trim()

  try {
    const org: Organizacion | undefined = ORG_BY_SLUG[slug]
    if (!org) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          error: 'org_no_encontrada',
          fetched_at,
          source_url: SOURCE_URL,
          _meta: { source: 'tercer-sector/org-inteligencia', slug },
        },
        { status: 200 },
      )
    }

    const bloques: Record<string, BlockMeta> = {}
    const alertas: string[] = []

    // ── Identificadores de match de la org ──────────────────────────────────
    const orgNif = (org.nif ?? '').toUpperCase()
    const orgRefs = (org.iati_refs ?? []).map((r) => r.trim()).filter(Boolean)

    // ── 1) Subvenciones BDNS (dinero recibido) ──────────────────────────────
    // Paginamos las concesiones recientes y nos quedamos con las que casan con
    // ESTA org por NIF (alta confianza) o por nombre normalizado (vía matchOrganizacion).
    let subvenciones_bdns: DossierSubvencion[] = []
    let subvenciones_total_eur: number | null = null
    try {
      const conc = await fetchConcesiones({ pages: 5, timeoutMs: 9000 })
      if (conc.ok && conc.data) {
        const mine = conc.data.filter((c: BdnsConcesion) => {
          // Match por NIF exacto del beneficiario.
          if (orgNif && c.beneficiario_nif && c.beneficiario_nif.toUpperCase() === orgNif) {
            return true
          }
          // Match por nombre: solo si matchOrganizacion lo resuelve a ESTA org
          // (evita atribuir a la entidad equivocada).
          const m = matchOrganizacion({
            nif: c.beneficiario_nif,
            nombre: c.beneficiario_nombre,
          })
          return m?.slug === org.slug
        })
        subvenciones_bdns = mine.map((c) => ({
          id: c.id,
          importe_eur: c.importe_eur,
          convocatoria: c.convocatoria,
          organo: c.organo,
          nivel: c.nivel,
          territorio: c.territorio,
          fecha: c.fecha,
          match:
            orgNif && c.beneficiario_nif && c.beneficiario_nif.toUpperCase() === orgNif
              ? 'nif'
              : 'nombre',
        }))
        const withAmount = subvenciones_bdns.filter((s) => s.importe_eur != null)
        subvenciones_total_eur = withAmount.length
          ? withAmount.reduce((s, x) => s + (x.importe_eur ?? 0), 0)
          : null
        bloques.subvenciones_bdns = {
          ok: true,
          count: subvenciones_bdns.length,
          note: conc.partial
            ? 'BDNS parcial (rate-limit/paginación). Muestra de concesiones recientes, no histórico completo.'
            : 'Muestra de concesiones recientes BDNS (no histórico completo).',
        }
        if (subvenciones_bdns.length === 0) {
          bloques.subvenciones_bdns.note =
            'Sin concesiones de esta entidad en la muestra reciente de BDNS (no implica ausencia de financiación histórica).'
        }
      } else {
        bloques.subvenciones_bdns = { ok: false, error: conc.error || 'bdns_sin_datos' }
      }
    } catch (e) {
      bloques.subvenciones_bdns = { ok: false, error: String((e as Error)?.message ?? e) }
    }

    // ── 2) Oportunidades relacionadas (reutiliza el endpoint W1a) ────────────
    // Reutilizamos el route handler GET de /api/tercer-sector/oportunidades
    // (fuente única de scoring/normalización — NO se duplica lógica) llamándolo
    // EN PROCESO con los filtros sector+ccaa de la org. Si el módulo no existe o
    // falla, degrada honestamente. Solo nos quedamos con las mejores oportunidades.
    let oportunidades_relacionadas: unknown[] = []
    try {
      const oportMod = await import('@/app/api/tercer-sector/oportunidades/route').catch(
        () => null,
      )
      const oportGET =
        oportMod && typeof (oportMod as Record<string, unknown>).GET === 'function'
          ? ((oportMod as Record<string, unknown>).GET as (r: Request) => Promise<Response>)
          : null
      if (oportGET) {
        const qp = new URLSearchParams()
        if (org.sector) qp.set('sector', org.sector)
        if (org.ccaa) qp.set('ccaa', org.ccaa)
        qp.set('pageSize', '12') // top de oportunidades para el dossier
        const subReq = new Request(
          `https://internal/api/tercer-sector/oportunidades?${qp.toString()}`,
        )
        const subRes = await oportGET(subReq)
        const subJson = (await subRes.json()) as {
          ok?: boolean
          data?: { oportunidades?: unknown[]; total?: number }
          error?: string
        }
        if (subJson?.ok && Array.isArray(subJson.data?.oportunidades)) {
          oportunidades_relacionadas = subJson.data.oportunidades
          bloques.oportunidades_relacionadas = {
            ok: true,
            count: subJson.data.total ?? oportunidades_relacionadas.length,
            note: `Filtradas por sector="${org.sector}"${org.ccaa ? ` y ccaa="${org.ccaa}"` : ''} (vía /oportunidades).`,
          }
        } else {
          bloques.oportunidades_relacionadas = {
            ok: false,
            error: subJson?.error || 'oportunidades_sin_datos',
          }
        }
      } else {
        bloques.oportunidades_relacionadas = {
          ok: false,
          error: 'oportunidades_no_disponible',
          note: `Módulo de oportunidades no disponible. Use /api/tercer-sector/oportunidades?sector=${encodeURIComponent(org.sector)}${org.ccaa ? `&ccaa=${encodeURIComponent(org.ccaa)}` : ''} cuando esté activo.`,
        }
      }
    } catch (e) {
      bloques.oportunidades_relacionadas = {
        ok: false,
        error: String((e as Error)?.message ?? e),
      }
    }

    // ── 3) Actividades IATI (cooperación) ───────────────────────────────────
    // Solo si la org tiene iati_refs curadas. fetchIatiOrgProfile requiere key:
    // degrada honestamente a {ok:false, error:'no_key'} (IATI no rota sin key).
    let actividades_iati: unknown = null
    if (orgRefs.length === 0) {
      bloques.actividades_iati = {
        ok: false,
        error: 'sin_iati_ref',
        note: 'La entidad no tiene identificador IATI curado (no es publisher de cooperación o no está mapeada).',
      }
    } else {
      try {
        const profile = await fetchIatiOrgProfile(orgRefs[0], { timeoutMs: 9000 })
        if (profile.ok && profile.data) {
          actividades_iati = profile.data
          bloques.actividades_iati = {
            ok: true,
            count: profile.data.total_activities,
            note: `IATI ref ${orgRefs[0]}`,
          }
        } else {
          bloques.actividades_iati = {
            ok: false,
            error: profile.error || 'iati_sin_datos',
            note: `IATI ref ${orgRefs[0]}`,
          }
        }
      } catch (e) {
        bloques.actividades_iati = { ok: false, error: String((e as Error)?.message ?? e) }
      }
    }

    // ── 4) Territorios (de la actividad territorial curada + sede) ───────────
    const ccaaKeys = new Set<string>()
    if (org.ccaa) ccaaKeys.add(org.ccaa)
    for (const k of org.actividad_territorial?.ccaa_presencia ?? []) ccaaKeys.add(k)
    const territorios = {
      sede_ccaa: org.ccaa
        ? { key: org.ccaa, name: CCAA_BY_KEY[org.ccaa]?.name ?? org.ccaa }
        : null,
      ccaa_presencia: Array.from(ccaaKeys).map((k) => ({
        key: k,
        name: CCAA_BY_KEY[k]?.name ?? k,
      })),
      paises_intervencion: org.actividad_territorial?.paises_intervencion ?? [],
      ambito: org.ambito,
    }
    bloques.territorios = {
      ok: true,
      count: territorios.ccaa_presencia.length,
      note:
        (org.actividad_territorial?.ccaa_presencia?.length ?? 0) > 0
          ? 'Presencia territorial curada.'
          : 'Solo sede conocida (sin mapa de presencia curado).',
    }

    // ── 5) Documentos (transparencia · del catálogo, URLs reales) ───────────
    const documentos: DossierDocumento[] = []
    const t = org.transparencia
    if (t?.memoria_url) {
      documentos.push({ nombre: `Memoria${t.ultimo_ejercicio ? ` ${t.ultimo_ejercicio}` : ''}`, url: t.memoria_url, tipo: 'memoria', fuente: org.fuente })
    }
    if (t?.cuentas_url) {
      documentos.push({ nombre: 'Cuentas anuales', url: t.cuentas_url, tipo: 'cuentas', fuente: org.fuente })
    }
    if (t?.auditoria_url) {
      documentos.push({ nombre: 'Informe de auditoría', url: t.auditoria_url, tipo: 'auditoria', fuente: org.fuente })
    }
    if (t?.portal_transparencia_url) {
      documentos.push({ nombre: 'Portal de transparencia', url: t.portal_transparencia_url, tipo: 'transparencia', fuente: org.fuente })
    }
    if (org.website) {
      documentos.push({ nombre: 'Web oficial', url: org.website, tipo: 'web', fuente: 'Web de la entidad' })
    }
    bloques.documentos = {
      ok: documentos.length > 0,
      count: documentos.length,
      note: t ? 'Enlaces de transparencia curados.' : 'Sin enlaces de transparencia curados (solo web si existe).',
    }

    // ── Alertas de analista (derivadas, honestas) ───────────────────────────
    if (org.acreditaciones?.fundacion_lealtad) {
      alertas.push('Entidad acreditada por Fundación Lealtad (transparencia y buenas prácticas).')
    }
    if (org.irpf_07) {
      alertas.push('Adherida al IRPF 0,7% de fines sociales: financiación pública estructural recurrente.')
    }
    if (subvenciones_bdns.length === 0 && bloques.subvenciones_bdns.ok) {
      alertas.push('Sin concesiones BDNS en la muestra reciente: revisar histórico antes de concluir.')
    }
    if (orgRefs.length > 0 && bloques.actividades_iati.ok === false && bloques.actividades_iati.error === 'no_key') {
      alertas.push('Perfil IATI disponible pero requiere clave de API (configurar para activar el bloque de cooperación).')
    }
    if (!t) {
      alertas.push('No hay enlaces de transparencia curados para esta entidad: verificar memoria/cuentas en su web.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          org,
          subvenciones_bdns,
          subvenciones_total_eur,
          oportunidades_relacionadas,
          actividades_iati,
          territorios,
          documentos,
          alertas,
          resumen: {
            sector: org.sector,
            sector_label: sectorLabel(org.sector),
            tiene_iati: orgRefs.length > 0,
            num_subvenciones: subvenciones_bdns.length,
            num_documentos: documentos.length,
          },
        },
        fetched_at,
        source_url: SOURCE_URL,
        _meta: {
          source: 'tercer-sector/org-inteligencia',
          slug,
          match_keys: { nif: orgNif || null, iati_refs: orgRefs },
          bloques,
          note: 'Dossier multi-fuente con degradación honesta por bloque. Subvenciones BDNS = muestra reciente, no histórico. IATI requiere key.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: SOURCE_URL,
        _meta: { source: 'tercer-sector/org-inteligencia', slug },
      },
      { status: 200 },
    )
  }
}
