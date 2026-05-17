'use client'

/**
 * TerminalView — consola operativa del analista.
 *
 * No es un shell de Unix: es una interfaz textual de comandos rápidos
 * para navegar y operar Politeia sin levantar la mano del teclado.
 *
 * Comandos:
 *   open <ruta>                  · ir a ruta
 *   nota <título>                · crear nota nueva
 *   diario                       · abrir bitácora de hoy
 *   tarea <texto> @[fecha]       · añadir tarea al diario
 *   actor <nombre>               · ficha actor (plantilla)
 *   analisis <pregunta>          · análisis (plantilla)
 *   buscar <texto>               · buscar en notas
 *   ?                            · ayuda
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNote, createFromTemplate, getOrCreateDailyNote, updateNote, loadAll } from '@/lib/cuaderno/store'
import styles from './Toolbox.module.css'

interface LogLine {
  kind: 'cmd' | 'ok' | 'err' | 'info'
  text: string
}

const HELP = [
  '─ comandos disponibles ──────────────────────────────',
  'open <ruta>            ir a /ruta (ej: open /dashboard)',
  'nota <título>          crear nota nueva',
  'diario                 abrir bitácora de hoy',
  'tarea <texto> @<fecha> añadir tarea al diario (fecha opcional)',
  'actor <nombre>         crear ficha de actor (plantilla)',
  'analisis <pregunta>    crear análisis (plantilla)',
  'reunion <título>       crear acta de reunión (plantilla)',
  'decision <título>      crear log de decisión (plantilla)',
  'buscar <texto>         buscar en todas las notas',
  'clear                  limpiar terminal',
  '?                      esta ayuda',
].join('\n')

export default function TerminalView() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<LogLine[]>([
    { kind: 'info', text: 'Politeia · terminal del analista · escribe ? para ayuda' },
  ])
  const [hist, setHist] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  useEffect(() => { inputRef.current?.focus() }, [])

  function push(kind: LogLine['kind'], text: string) {
    setHistory(h => [...h, { kind, text }])
  }

  function exec(raw: string) {
    const cmd = raw.trim()
    if (!cmd) return
    push('cmd', `$ ${cmd}`)
    setHist(h => [cmd, ...h].slice(0, 50))
    setHistIdx(-1)

    const [op, ...rest] = cmd.split(/\s+/)
    const arg = rest.join(' ').trim()

    try {
      switch (op.toLowerCase()) {
        case '?':
        case 'help':
        case 'ayuda':
          push('info', HELP)
          break

        case 'clear':
        case 'cls':
          setHistory([])
          break

        case 'open':
          if (!arg) return push('err', 'uso: open /ruta')
          router.push(arg.startsWith('/') ? arg : `/${arg}`)
          push('ok', `→ navegando a ${arg}`)
          break

        case 'nota':
          if (!arg) return push('err', 'uso: nota <título>')
          createNote({ title: arg, folder: 'Notas', content: `# ${arg}\n\n` })
          push('ok', `✓ nota creada: "${arg}"`)
          break

        case 'diario':
          getOrCreateDailyNote()
          router.push('/cuaderno')
          push('ok', '✓ abriendo bitácora del día')
          break

        case 'tarea': {
          if (!arg) return push('err', 'uso: tarea <texto> @YYYY-MM-DD')
          const dueMatch = arg.match(/@(\d{4}-\d{2}-\d{2})/)
          const due = dueMatch ? ` \`${dueMatch[1]}\`` : ''
          const text = arg.replace(/@\d{4}-\d{2}-\d{2}/, '').trim()
          const daily = getOrCreateDailyNote()
          if (!daily) return push('err', 'no se pudo crear bitácora')
          const line = `- [ ] ${text}${due}\n`
          updateNote(daily.id, { content: daily.content + line })
          push('ok', `✓ tarea añadida al diario${due ? ` (vence ${dueMatch![1]})` : ''}`)
          break
        }

        case 'actor': {
          if (!arg) return push('err', 'uso: actor <nombre>')
          const n = createFromTemplate('actor', arg)
          if (n) push('ok', `✓ ficha de actor "${arg}" creada en Actores/`)
          break
        }

        case 'analisis':
        case 'análisis': {
          if (!arg) return push('err', 'uso: analisis <pregunta>')
          const n = createFromTemplate('analisis', arg)
          if (n) push('ok', `✓ análisis "${arg}" creado en Análisis/`)
          break
        }

        case 'reunion':
        case 'reunión': {
          const n = createFromTemplate('reunion', arg)
          if (n) push('ok', '✓ acta de reunión creada en Reuniones/')
          break
        }

        case 'decision':
        case 'decisión': {
          if (!arg) return push('err', 'uso: decision <título>')
          const n = createFromTemplate('decision', arg)
          if (n) push('ok', `✓ decisión "${arg}" registrada en Decisiones/`)
          break
        }

        case 'buscar':
        case 'search':
        case 'find': {
          if (!arg) return push('err', 'uso: buscar <texto>')
          const lo = arg.toLowerCase()
          const hits = loadAll().filter(n =>
            n.title.toLowerCase().includes(lo) ||
            n.content.toLowerCase().includes(lo)
          ).slice(0, 10)
          if (hits.length === 0) push('info', '(sin resultados)')
          else push('info', hits.map(h => `· ${h.title}  ${h.folder}/`).join('\n'))
          break
        }

        case 'ls': {
          const all = loadAll()
          const folders = Array.from(new Set(all.map(n => n.folder))).sort()
          push('info', folders.map(f => `${f}/  (${all.filter(n => n.folder === f).length})`).join('\n'))
          break
        }

        default:
          push('err', `comando no reconocido: ${op} — escribe ? para ayuda`)
      }
    } catch (e: any) {
      push('err', `error: ${e?.message ?? String(e)}`)
    }
  }

  return (
    <div className={styles.terminal}>
      <div className={styles.termHead}>
        <span>● terminal</span>
        <span className={styles.termHint}>tab autocompleta · ↑↓ historial · ? ayuda</span>
      </div>
      <div className={styles.termScroll}>
        {history.map((l, i) => (
          <pre key={i} className={`${styles.termLine} ${styles[`term-${l.kind}`]}`}>{l.text}</pre>
        ))}
        <div ref={endRef} />
      </div>
      <form className={styles.termInputRow} onSubmit={e => { e.preventDefault(); exec(input); setInput('') }}>
        <span className={styles.termPrompt}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              const next = Math.min(histIdx + 1, hist.length - 1)
              setHistIdx(next)
              if (hist[next]) setInput(hist[next])
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              const next = Math.max(histIdx - 1, -1)
              setHistIdx(next)
              setInput(next === -1 ? '' : hist[next])
            }
          }}
          placeholder="escribe un comando…"
          className={styles.termInput}
          spellCheck={false}
          autoCorrect="off"
          autoComplete="off"
        />
      </form>
    </div>
  )
}
