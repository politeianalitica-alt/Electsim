'use client'

/**
 * CommandCenter — vista por defecto del Toolbox.
 *
 * Replica el "Command Center" del workspace: morning brief generado, KPIs
 * operativos (issues, acciones, decisiones, risk), agenda 24h, acciones
 * pendientes y equipo y foco.
 *
 * Los datos provienen del store local de Cuaderno (tareas, briefings) y de
 * mocks operativos coherentes. Conectable a backend cuando esté.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { allTasks, summarizeTasks } from '@/lib/cuaderno/queries'
import { loadAll, type CuadernoNote } from '@/lib/cuaderno/store'
import styles from './Toolbox.module.css'

type Severity = 'critico' | 'alto' | 'medio' | 'bajo'

interface Issue {
  id: string
  title: string
  detail: string
  severity: Severity
  link?: string
}

interface AgendaItem {
  id: string
  time: string
  title: string
  kind: 'reunion' | 'pleno' | 'comparecencia' | 'medios' | 'briefing'
}

interface TeamMember {
  initials: string
  name: string
  focus: string
  status: 'ok' | 'attention' | 'blocked'
}

const ISSUES: Issue[] = [
  { id: 'i1', title: 'Bulos sobre financiación del partido',
    detail: 'Narrativa hostil amplificada en redes con alto alcance y riesgo reputacional.',
    severity: 'critico' },
  { id: 'i2', title: 'Ley de vivienda — riesgo de bloqueo Junts',
    detail: 'Junts condiciona su apoyo a enmiendas sobre competencia autonómica.',
    severity: 'critico' },
]

const AGENDA: AgendaItem[] = []  // 24h vacío por defecto

const TEAM: TeamMember[] = [
  { initials: 'AG', name: 'Ana Gómez',    focus: 'Moción de censura',           status: 'ok' },
  { initials: 'LM', name: 'Luis Martín',  focus: 'Negociación presupuestos',    status: 'attention' },
  { initials: 'CR', name: 'Clara Ruiz',   focus: 'Crisis bulos financiación',   status: 'ok' },
  { initials: 'JO', name: 'Javier Ortega',focus: 'Sondeos territoriales',       status: 'blocked' },
  { initials: 'ML', name: 'Marta León',   focus: 'Plan junio 2026',             status: 'ok' },
]

export default function CommandCenter() {
  const [notes, setNotes] = useState<CuadernoNote[]>([])
  useEffect(() => {
    setNotes(loadAll())
    const refresh = () => setNotes(loadAll())
    window.addEventListener('cuaderno:change', refresh)
    return () => window.removeEventListener('cuaderno:change', refresh)
  }, [])

  const tasks   = useMemo(() => allTasks(), [notes])
  const summary = useMemo(() => summarizeTasks(tasks), [tasks])

  // Briefing del día (computado de mocks + estadísticas del cuaderno)
  const issuesCount    = ISSUES.length
  const actionsToday   = summary.pending + summary.dueToday
  const overdue        = summary.overdue
  const decisionsWeek  = notes.filter(n => n.folder === 'Decisiones').length
  const riskIndex      = Math.min(100, 35 + issuesCount * 10 + overdue * 4)
  const riskLabel      = riskIndex >= 70 ? 'crítico' : riskIndex >= 50 ? 'alto' : riskIndex >= 30 ? 'medio' : 'bajo'

  const pendingTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const prio: Record<string, number> = { critico: 0, alto: 1, medio: 2, bajo: 3, sin: 4 }
    return [...tasks]
      .filter(t => !t.done)
      .sort((a, b) => {
        const aOver = a.dueDate && a.dueDate < today ? 0 : 1
        const bOver = b.dueDate && b.dueDate < today ? 0 : 1
        if (aOver !== bOver) return aOver - bOver
        return (prio[a.priority ?? 'sin']) - (prio[b.priority ?? 'sin'])
      })
      .slice(0, 7)
  }, [tasks])

  const today = new Date()
  const briefingTime = '12:00'
  const briefingTitle = riskIndex >= 70 ? 'CRISIS' : riskIndex >= 50 ? 'ALTA TENSIÓN' : 'OPERATIVO'

  return (
    <div className={styles.cc}>
      <div className={styles.ccGrid}>
        {/* ── Morning Brief ────────────────────────────────── */}
        <section className={styles.briefCard}>
          <header className={styles.briefHead}>
            <div className={styles.briefTitleRow}>
              <span className={styles.briefLabel}>MORNING BRIEF</span>
              <span className={`${styles.briefBadge} ${styles[`badge-${briefingTitle.toLowerCase().replace(' ','-')}`]}`}>
                {briefingTitle}
              </span>
            </div>
            <button className={styles.briefRefresh}>Regenerar</button>
          </header>

          <p className={styles.briefBody}>
            {riskIndex >= 70 ? (
              <>El workspace presenta una situación de <strong>alta tensión operativa</strong>. El issue
              prioritario es «<strong>{ISSUES[0]?.title}</strong>». Hay <strong>{overdue} acciones
              vencidas</strong> que requieren cierre.</>
            ) : (
              <>Workspace en marcha normal. {issuesCount} issue{issuesCount === 1 ? '' : 's'} activo
              {issuesCount === 1 ? '' : 's'} bajo control. {summary.pending} acciones pendientes,
              {decisionsWeek} decisión{decisionsWeek === 1 ? '' : 'es'} esta semana.</>
            )}
          </p>

          <div className={styles.briefAttention}>
            <strong>Puntos de atención</strong>
            <ul>
              <li>{issuesCount} issue{issuesCount === 1 ? '' : 's'} crítico{issuesCount === 1 ? '' : 's'} requieren atención inmediata</li>
              <li>{overdue} accion{overdue === 1 ? '' : 'es'} vencida{overdue === 1 ? '' : 's'} sin cerrar</li>
              <li>3 alertas activas en monitorización</li>
            </ul>
          </div>

          <div className={styles.briefActions}>
            <button className={styles.btnSecondary}>Compartir brief</button>
            <button className={styles.btnPrimary}>Crear agenda del día</button>
          </div>

          <span className={styles.briefStamp}>Generado {briefingTime}</span>
        </section>

        {/* ── KPIs principales ─────────────────────────────── */}
        <section className={styles.kpiBlock}>
          <KpiCard label="Issues críticos" value={issuesCount} accent="#DC2626" />
          <KpiCard label="Acciones hoy"    value={actionsToday} accent="#D97706"
                   sub={overdue > 0 ? `${overdue} vencidas` : 'al día'} />
          <KpiCard label="Decisiones semana" value={decisionsWeek} accent="#2d8a39" />
          <KpiCard label="Risk index"      value={riskIndex} accent={riskIndex >= 70 ? '#DC2626' : '#D97706'}
                   sub={riskLabel} />
        </section>

        {/* ── Agenda 24h ───────────────────────────────────── */}
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Agenda · próximas 24h <span className={styles.panelCount}>{AGENDA.length}</span></h3>
            <Link href="/calendario" className={styles.panelLink}>Ver semana →</Link>
          </header>
          {AGENDA.length === 0 ? (
            <div className={styles.panelEmpty}>Sin eventos en las próximas 24 horas.</div>
          ) : (
            <ul className={styles.agendaList}>
              {AGENDA.map(a => (
                <li key={a.id} className={styles.agendaItem}>
                  <span className={styles.agendaTime}>{a.time}</span>
                  <span className={styles.agendaTitle}>{a.title}</span>
                  <span className={`${styles.agendaKind} ${styles[`kind-${a.kind}`]}`}>{a.kind}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Issues críticos ──────────────────────────────── */}
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Issues críticos <span className={styles.panelCount}>{ISSUES.length}</span></h3>
            <Link href="/alertas" className={styles.panelLink}>Ver todos →</Link>
          </header>
          {ISSUES.map(it => (
            <div key={it.id} className={styles.issueRow}>
              <div className={styles.issueMain}>
                <strong>{it.title}</strong>
                <span className={`${styles.sev} ${styles[`sev-${it.severity}`]}`}>{it.severity}</span>
              </div>
              <p className={styles.issueDetail}>{it.detail}</p>
              <div className={styles.issueActions}>
                <button className={styles.smallBtn}>Crear nota</button>
                <button className={styles.smallBtn}>Asignar acción</button>
                <span className={styles.issueState}>Abierto</span>
              </div>
            </div>
          ))}
        </section>

        {/* ── Acciones pendientes ──────────────────────────── */}
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Acciones pendientes <span className={styles.panelCount}>{pendingTasks.length}</span></h3>
            <Link href="/cuaderno" className={styles.panelLink}>Ver todas →</Link>
          </header>
          {pendingTasks.length === 0 ? (
            <div className={styles.panelEmpty}>Sin acciones pendientes. Crea tareas en tu Cuaderno con <code>- [ ]</code>.</div>
          ) : pendingTasks.map((t, i) => {
            const overdueT = t.dueDate && t.dueDate < today.toISOString().slice(0,10)
            const text = t.text.replace(/\*\*\[[^\]]+\]\*\*/g, '').replace(/`\d{4}-\d{2}-\d{2}`/g, '').replace(/!critico|!alto|!medio|!bajo/gi, '').trim()
            return (
              <div key={`${t.noteId}-${t.lineIdx}-${i}`} className={styles.taskRow}>
                <input type="checkbox" disabled className={styles.taskCheck} />
                <div className={styles.taskMain}>
                  <span className={styles.taskText}>{text}</span>
                  <div className={styles.taskMeta}>
                    {t.priority && <span className={`${styles.taskPill} ${styles[`prio-${t.priority}`]}`}>{t.priority}</span>}
                    {t.dueDate && (
                      <span className={`${styles.taskPill} ${overdueT ? styles.taskOverdue : ''}`}>
                        {overdueT ? 'vencida' : t.dueDate}
                      </span>
                    )}
                    {t.responsible && <span className={styles.taskPill}>{t.responsible}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        {/* ── Equipo y foco ────────────────────────────────── */}
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Equipo y foco <span className={styles.panelCount}>{TEAM.filter(t => t.status === 'ok').length}/{TEAM.length}</span></h3>
            <Link href="/team" className={styles.panelLink}>Ver equipo →</Link>
          </header>
          {TEAM.map(m => (
            <div key={m.initials} className={styles.teamRow}>
              <span className={styles.teamAvatar}>{m.initials}</span>
              <div className={styles.teamMain}>
                <strong>{m.name}</strong>
                <span className={styles.teamFocus}>
                  <span className={`${styles.statusDot} ${styles[`status-${m.status}`]}`} />
                  › {m.focus}
                </span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

function KpiCard({ label, value, accent, sub }: { label: string; value: number; accent: string; sub?: string }) {
  return (
    <div className={styles.kpi} style={{ borderLeftColor: accent }}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue} style={{ color: accent }}>{value}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  )
}
