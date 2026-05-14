import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const res = await fetch(`${BACKEND}/api/estudio/notification?${url.searchParams}`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockNotifications())
  }
}

function getMockNotifications() {
  const mins = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
  return [
    { id: 'n1', type: 'alert_triggered',  title: 'Alerta crítica disparada',     body: 'Caída de intención de voto PP > 3% detectada en los últimos 7 días', severity: 'critical', read: false, actionUrl: '/estudio/alertas', createdAt: mins(8) },
    { id: 'n2', type: 'pipeline_success', title: 'Pipeline completado',          body: 'Pipeline "CIS — Barómetro Mayo 2026" procesó 12.450 registros correctamente', severity: 'info', read: false, actionUrl: '/estudio/pipeline', createdAt: mins(25) },
    { id: 'n3', type: 'alert_triggered',  title: 'Nuevo contrato IBEX detectado',body: 'Telefónica: contrato adjudicado por 18.5M€ con Ministerio de Defensa', severity: 'warning', read: false, actionUrl: '/estudio/dashboard/dash-2', createdAt: mins(47) },
    { id: 'n4', type: 'dashboard_shared', title: 'Dashboard compartido contigo', body: '"Monitor Electoral 2024" ha sido compartido por carlos@politeia.es con rol Editor', severity: 'info', read: true, actionUrl: '/estudio/dashboard/dash-1', createdAt: mins(180) },
    { id: 'n5', type: 'dataset_updated',  title: 'Dataset actualizado',          body: 'CIS Barómetro — 3.200 nuevos registros disponibles', severity: 'info', read: true, actionUrl: '/estudio/dataset', createdAt: mins(360) },
    { id: 'n6', type: 'pipeline_failed',  title: 'Pipeline fallido',             body: 'Pipeline "BOE — Contratos AAPP" falló en la fase de normalización. Revisar logs.', severity: 'critical', read: true, actionUrl: '/estudio/pipeline', createdAt: mins(720) },
    { id: 'n7', type: 'alert_resolved',   title: 'Alerta resuelta',              body: 'La anomalía en abstención electoral ha vuelto a niveles normales', severity: 'info', read: true, actionUrl: '/estudio/alertas', createdAt: mins(1440) },
  ]
}
