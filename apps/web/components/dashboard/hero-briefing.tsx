"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints, type MorningBriefing } from "@/lib/api/endpoints";
import { FileText, ArrowRight, Sparkles, Calendar } from "lucide-react";
import Link from "next/link";

const DEMO_BRIEFING: MorningBriefing = {
  date: new Date().toISOString().split("T")[0],
  generated_at: new Date().toISOString(),
  executive_summary:
    "El PP consolida su liderazgo en intención de voto (+0.4pp esta semana) mientras el PSOE mantiene posiciones tras la última intervención del presidente. La narrativa de vivienda continúa en aceleración (+18% menciones 24h) con una emoción dominante de frustración. La amnistía vuelve al primer plano tras decisiones judiciales que dividen al socio Junts. En lo económico, el IPC subyacente sorprende a la baja, lo que abre margen al gobierno para una intervención en política fiscal antes del cierre del semestre.",
  key_alerts: [
    { title: "Caída PP en sondeos territoriales", level: "high", body: "Tres sondeos consecutivos muestran erosión en mayores de 55 años en Cataluña y País Vasco." },
    { title: "Narrativa vivienda alcanza pico", level: "medium", body: "Crecimiento sostenido +18% sin moderación visible." },
    { title: "Bloqueo Junts en comisión", level: "high", body: "Riesgo de obstrucción legislativa en comisión de Justicia esta semana." }
  ],
  top_stories: [
    { title: "El Tribunal Constitucional admite a trámite el recurso del PP contra la amnistía", source: "El País", relevance: 0.92 },
    { title: "Sumar exige al PSOE acelerar la reforma del IRPF", source: "elDiario.es", relevance: 0.81 },
    { title: "VOX rompe gobierno en una nueva CCAA por desacuerdo en política migratoria", source: "ABC", relevance: 0.78 },
    { title: "El Banco de España revisa al alza la previsión de PIB 2026", source: "Cinco Días", relevance: 0.74 },
    { title: "Investigación judicial al hermano de la ex pareja de un alto cargo de Moncloa", source: "OK Diario", relevance: 0.69 }
  ],
  active_narratives: [
    { frame_label: "Crisis de vivienda asequible", velocity: "up", recommended_action: "Diseñar mensaje de respuesta con propuestas concretas." },
    { frame_label: "Lawfare contra el gobierno", velocity: "up", recommended_action: "Vigilar amplificación y construir contra-frame." },
    { frame_label: "Pactos PP-VOX en CCAA", velocity: "stable", recommended_action: "Monitorizar tensiones internas." }
  ],
  risk_signals: [],
  legislative_updates: [],
  electoral_snapshot: { itpe: 52.3, top_parties: { PP: 33.2, PSOE: 28.5, VOX: 11.3 }, trend: "up" },
  three_questions: [
    "¿Mantendrá el PP el liderazgo si la narrativa de vivienda erosiona su electorado urbano?",
    "¿Activará el PSOE una iniciativa fiscal antes del cierre del semestre?",
    "¿Qué impacto tiene el bloqueo de Junts en la coalición de investidura a 12 meses?"
  ],
  analyst_note: "Semana de inflexión electoral. Vigilar señales de movilización en mayores de 55 años.",
  mode: "demo"
};

export function HeroBriefing() {
  const { data, isLoading } = useQuery({
    queryKey: ["briefing", "morning"],
    queryFn: () => endpoints.morningBriefing("default").catch(() => DEMO_BRIEFING),
    placeholderData: DEMO_BRIEFING
  });

  const briefing = data || DEMO_BRIEFING;
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border1 bg-gradient-to-br from-bg2 via-bg2 to-bg3">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan1/5 via-transparent to-blue1/5 pointer-events-none" />
      <div className="relative p-7">
        <div className="flex items-start justify-between gap-6 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="label-cap">Briefing matinal</span>
              {briefing.mode === "demo" && <span className="badge badge-amber">demo</span>}
              {briefing.mode === "real" && <span className="badge badge-green">live</span>}
            </div>
            <h1 className="text-3xl font-bold text-text1 mb-1">Buenos días, Analista</h1>
            <p className="text-text2 text-sm flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> {today}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/briefings" className="px-3 py-1.5 rounded-md bg-cyan1/10 text-cyan1 border border-cyan1/30 hover:bg-cyan1/20 transition text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Ver briefing completo
            </Link>
          </div>
        </div>

        <p className="text-text1 text-base leading-relaxed mb-6 text-balance">
          {isLoading ? "Generando análisis..." : briefing.executive_summary}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {briefing.three_questions.map((q, i) => (
            <div key={i} className="bg-bg/60 border border-border1 rounded-lg p-4 hover:border-cyan1/30 transition">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan1/15 text-cyan1 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-text1">{q}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-text2">
          <Sparkles className="w-3.5 h-3.5 text-cyan1" />
          <span>{briefing.analyst_note}</span>
          <Link href="/brain" className="ml-auto text-cyan1 hover:underline flex items-center gap-1">
            Profundizar con Brain <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
