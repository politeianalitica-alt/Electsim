"use client";

import { FileText, Calendar, BookOpen, ChevronRight, Vote } from "lucide-react";

const KPIS = [
  { label: "Iniciativas activas", value: 187, color: "text-cyan1" },
  { label: "Aprobadas este mes", value: 23, color: "text-green1" },
  { label: "Tramitación crítica", value: 9, color: "text-red1" },
  { label: "Próximas votaciones", value: 14, color: "text-amber1" }
];

const URGENT = [
  { title: "Ley de Vivienda 2025 (reforma)", type: "Proyecto Ley", submitter: "Gobierno", status: "Comisión", deadline: "12 may", urgency: "high" },
  { title: "Reforma fiscal SICAV/SOCIMI", type: "Proyecto Ley", submitter: "Hacienda", status: "Pleno", deadline: "8 may", urgency: "high" },
  { title: "Ley Memoria Democrática (modificación)", type: "Proposición", submitter: "PSOE-Sumar", status: "Enmiendas", deadline: "15 may", urgency: "medium" },
  { title: "Real Decreto-ley fondos UE 2026", type: "Real Decreto", submitter: "Moncloa", status: "Convalidación", deadline: "6 may", urgency: "high" },
  { title: "Ley audiovisual (RTVE financiación)", type: "Proyecto Ley", submitter: "Cultura", status: "Ponencia", deadline: "20 may", urgency: "medium" },
  { title: "Reforma reglamento Congreso", type: "Proposición", submitter: "Mesa", status: "Debate", deadline: "22 may", urgency: "low" }
];

const CALENDAR = [
  { day: "Lun 6", item: "Pleno: convalidación RDL fondos UE", type: "Pleno" },
  { day: "Mar 7", item: "Comisión Justicia: Ley Amnistía (informes)", type: "Comisión" },
  { day: "Mié 8", item: "Pleno: votación reforma fiscal", type: "Pleno" },
  { day: "Jue 9", item: "Comisión Hacienda: enmiendas vivienda", type: "Comisión" },
  { day: "Vie 10", item: "Diputación Permanente", type: "Pleno" }
];

const BOE = [
  { title: "RD 312/2026 ayudas autónomos digitalización", section: "I. Disposiciones generales" },
  { title: "Orden HAC/450/2026 plazo declaración renta", section: "I. Disposiciones generales" },
  { title: "Resolución BOE Salud Pública vacunación", section: "III. Otras" },
  { title: "Convocatoria becas Ministerio Educación 2026", section: "III. Otras" },
  { title: "Convenio colectivo construcción nacional", section: "III. Otras" }
];

function urgencyBadge(u: string) {
  if (u === "high") return "badge-red";
  if (u === "medium") return "badge-amber";
  return "badge-blue";
}

function typeBadge(t: string) {
  if (t === "Real Decreto") return "badge-red";
  if (t === "Proyecto Ley") return "badge-cyan";
  return "badge-blue";
}

export default function LegislativoPage() {
  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Monitor Legislativo</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Monitor Legislativo</h1>
        <p className="text-text2 text-sm mt-1">Iniciativas en tramitación, calendario parlamentario y publicaciones BOE.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Iniciativas urgentes */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Iniciativas urgentes</h2>
          </div>
          <ul className="space-y-3">
            {URGENT.map((it, i) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug">{it.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className={`badge ${typeBadge(it.type)}`}>{it.type}</span>
                  <span className={`badge ${urgencyBadge(it.urgency)}`}>{it.status}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text2">
                  <span>{it.submitter}</span>
                  <span className="text-amber1">Plazo: {it.deadline}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Calendar */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Calendario semana</h2>
          </div>
          <ul className="space-y-3">
            {CALENDAR.map((c, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg3 transition cursor-pointer">
                <div className="text-xs text-cyan1 font-mono w-12 shrink-0">{c.day}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text1 leading-snug">{c.item}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Vote className="w-3 h-3 text-muted" />
                    <span className="text-[10px] uppercase text-muted tracking-wider">{c.type}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* BOE */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">BOE último día</h2>
          </div>
          <ul className="space-y-3">
            {BOE.map((b, i) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                <div className="text-[10px] uppercase tracking-wider text-muted mb-1">{b.section}</div>
                <div className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug">{b.title}</div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-cyan1">
                  Ver disposición <ChevronRight className="w-3 h-3" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
