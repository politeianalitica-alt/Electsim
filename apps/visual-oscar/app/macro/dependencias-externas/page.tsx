'use client'
/**
 * `/macro/dependencias-externas` · Sprint N6.1 · creada para cerrar 404.
 * Antes la subtab estaba registrada en TAB_IDS y catálogo pero NO existía
 * la UI; al hacer click directo a /macro/dependencias-externas → 404.
 */
import { SubtabLanding } from '@/components/macro/pulso/SubtabLanding'

export default function DependenciasExternasLandingPage() {
  return <SubtabLanding subtabSlug="dependencias-externas" />
}
