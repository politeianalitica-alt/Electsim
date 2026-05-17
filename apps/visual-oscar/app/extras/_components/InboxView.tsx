'use client'

/**
 * InboxView — bandeja unificada del analista.
 *
 * Cola que mezcla alertas del sistema, menciones en notas, tareas asignadas
 * y peticiones. Inspirada en Things / Linear Inbox: lo importante arriba,
 * resto archivable en un click.
 */

import { useEffect, useMemo, useState } from 'react'
import { allTasks } from '@/lib/cuaderno/queries'
import { loadAll, type CuadernoNote } from '@/lib/cuaderno/store'
import styles from './Toolbox.module.css'

type Kind = 'alerta' | 'tarea' | 'mencion' | 'peticion' | 'sistema'

interface InboxItem {
  id: string
  kind: Kind
  title: string
  detail?: string
  source: string
  when: string             // texto humano: 'hace 2h'
  severity?: 'critico' | 'alto' | 'medio' | 'bajo'
  href?: string
}

const SYSTEM_ITEMS: InboxItem[] = [
  { id: 's1', kind: 'alerta', title: 'PP supera 33% en encuesta Sigma Dos',
    source: 'Termómetro · Electoral', when: 'hace 1h', severity: 'alto',
    detail: 'Tendencia consistente en últimas 3 oleadas.' },
  { id: 's2', kind: 'sistema', title: 'Briefing matinal listo',
    source: 'Briefing · 12:00', when: 'hace 2h',
    detail: 'BOE digerido, agenda parlamentaria sincronizada.', href: '/briefing' },
  { id: 's3', kind: 'alerta', title: 'Tensión parlamentaria 42/100 en el Termómetro',
    source: 'Termómetro · Riesgo', when: 'hace 4h', severity: 'medio' },
  { id: 's4', kind: 'peticion', title: 'Cliente pide nota sobre Ley de Vivienda',
    source: 'Cliente · email', when: 'ayer', severity: 'alto',
    detail: 'Espera primera versión antes del viernes.' },
]

export default function InboxView() {
  const [notes, setNotes] = useState<CuadernoNote[]>([])
  const [filter, setFilter] = useState<'todos' | Kind>('todos')
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    setNotes(loadAll())
    const refresh = () => setNotes(loadAll())
    window.addEventListener('cuaderno:change', refresh)
    return () => window.removeEventListener('cuaderno:change', refresh)
  }, [])

  // Mezclamos tareas del cuaderno como "tarea"
  const items: InboxItem[] = useMemo(() => {
    const tasks = allTasks()
      .filter(t => !t.done)
      .slice(0, 12)
      .map<InboxItem>((t, i) => ({
        id: `t-${t.noteId}-${t.lineIdx}-${i}`,
        kind: 'tarea',
        title: t.text.replace(/\*\*\[[^\]]+\]\*\*/g, '').replace(/`\d{4}-\d{2}-\d{2}`/g, '').replace(/!critico|!alto|!medio|!bajo/gi, '').trim(),
        source: `Cuaderno · ${t.noteTitle}`,
        when: t.dueDate ? `vence ${t.dueDate}` : 'sin fecha',
        severity: t.priority,
        href: '/cuaderno',
      }))
    return [...SYSTEM_ITEMS, ...tasks]
  }, [notes])

  const visible = useMemo(() => {
    const list = filter === 'todos' ? items : items.filter(i => i.kind === filter)
    return list.filter(i => !done.has(i.id))
  }, [items, filter, done])

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: 0, alerta: 0, tarea: 0, mencion: 0, peticion: 0, sistema: 0 }
    items.forEach(i => { if (!done.has(i.id)) { c.todos++; c[i.kind]++ } })
    return c
  }, [items, done])

  return (
    <div className={styles.inboxWrap}>
      <header className={styles.inboxHead}>
        <h2>Inbox <span className={styles.panelCount}>{counts.todos}</span></h2>
        <p className={styles.inboxSub}>
          Una cola, una decisión por ítem. Marca leído lo que ya no requiere acción.
        </p>
        <div className={styles.inboxFilters}>
          {(['todos','alerta','tarea','peticion','sistema'] as const).map(k => (
            <button
              key={k}
              className={`${styles.chip} ${filter === k ? styles.chipActive : ''}`}
              onClick={() => setFilter(k)}
            >
              {k} <span className={styles.chipNum}>{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </header>

      <div className={styles.inboxBody}>
        {visible.length === 0 && (
          <div className={styles.inboxEmpty}>
            <h3>Inbox limpia</h3>
            <p>No hay nada que requiera tu atención. Buen momento para pensar.</p>
          </div>
        )}
        {visible.map(it => (
          <article key={it.id} className={styles.inboxItem}>
            <span className={`${styles.kindDot} ${styles[`kind-${it.kind}`]}`} />
            <div className={styles.itemMain}>
              <div className={styles.itemTitleRow}>
                <strong>{it.title}</strong>
                {it.severity && <span className={`${styles.sev} ${styles[`sev-${it.severity}`]}`}>{it.severity}</span>}
              </div>
              {it.detail && <p className={styles.itemDetail}>{it.detail}</p>}
              <div className={styles.itemMeta}>
                <span>{it.source}</span>
                <span>·</span>
                <span>{it.when}</span>
              </div>
            </div>
            <div className={styles.itemActions}>
              {it.href && <a href={it.href} className={styles.smallBtn}>Abrir</a>}
              <button className={styles.smallBtn} onClick={() => setDone(d => new Set(d).add(it.id))}>Archivar</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
