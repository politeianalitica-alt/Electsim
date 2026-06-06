'use client'
/**
 * <TiposTurismoView /> · Turismo v3 · TurismoShell (stub T1)
 *
 * Tipos de turismo. Es el corazón del overhaul (objetivo del propietario: TODOS
 * los tipos con detalle). La Ola 2 (Sprint T7) la llenará con sol&playa, urbano,
 * cultural, rural/naturaleza, MICE/negocios, cruceros, salud/wellness, deportivo
 * (esquí/golf), gastronómico, religioso (Camino), idiomático y shopping — cada
 * uno con sus datos, indicadores y contexto. Cruceros se ENLAZA a /puertos.
 *
 * Hasta entonces: andamio sobrio (no se simulan datos · CLAUDE.md). Cero emojis.
 */
import { TurismoSectionStub } from './shared/TurismoSectionStub'

export function TiposTurismoView() {
  return (
    <TurismoSectionStub
      glyph="◫"
      eyebrow="TURISMO · TIPOS DE TURISMO"
      title="Tipos de turismo"
      desc="Sol y playa, urbano, cultural, rural y naturaleza, MICE y negocios, cruceros, salud y wellness, deportivo (esquí, golf), gastronómico, religioso (Camino), idiomático y shopping, cada uno con sus indicadores y contexto."
      sprint="T7"
      fuentes={['INE FAMILITUR', 'Eurostat', 'Turespaña', 'Puertos del Estado']}
    />
  )
}

export default TiposTurismoView
