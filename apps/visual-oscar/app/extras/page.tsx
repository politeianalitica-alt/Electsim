'use client'

/**
 * /extras — Toolbox: el centro de operaciones del analista.
 *
 * Layout: rail izquierdo con categorías de herramientas + área principal
 * con Command Center operativo (Morning Brief, KPIs, Agenda, Acciones,
 * Equipo y foco). Cada herramienta es accesible con un click; algunas
 * abren vista inline, otras hacen deep-link al workspace correspondiente.
 *
 * Categorías:
 *   OPERATIVO    · Command Center · Inbox · Terminal
 *   CONTENIDO    · Docs · Tables · Slides · Reporting
 *   INTELIGENCIA · Canvas · Research · Radar · Simulator · Knowledge
 *   SISTEMA      · Projects · Automations
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { SpaceHero } from '../_components/space/SpaceHero'
import ToolboxShell from './_components/ToolboxShell'
import { isAuthenticated } from '@/lib/auth'

export default function ExtrasPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  return (
    <>
      <AppHeader />
      {/* Hero unificado estilo War Room */}
      <SpaceHero
        icon="TB"
        iconColor="#5B21B6"
        eyebrow="TOOLBOX · CENTRO OPERATIVO DEL ANALISTA"
        title="Toolbox"
        subtitle="Acceso unificado a las herramientas del workspace."
      />
      <ToolboxShell />
    </>
  )
}
