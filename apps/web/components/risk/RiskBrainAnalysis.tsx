"use client";

import { useState } from "react";
import { Brain, Send, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import type { RiskAnalysisResponse } from "@/lib/types/risk_rich";

const SUGGESTED_QUESTIONS = [
  "¿Cuál es el mayor riesgo político en los próximos 30 días?",
  "¿Cómo afecta la tensión de coalición al riesgo legislativo?",
  "¿Qué señales de alerta temprana son más preocupantes ahora?",
];

export function RiskBrainAnalysis({ globalScore }: { globalScore: number }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<RiskAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await endpoints.riskAnalyze({ question });
      setResult(res);
    } catch {
      setResult({
        question,
        answer: "Error al conectar con Brain. Inténtalo de nuevo.",
        global_score: globalScore,
        key_risks: [],
        recommendations: [],
        model_used: "error",
        mode: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Brain Analysis — Riesgo</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-[10px] px-2 py-1 rounded border border-border1 text-text2 hover:border-cyan1/40 hover:text-cyan1 transition"
          >
            {q.slice(0, 45)}…
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Pregunta sobre el entorno de riesgo…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          className="flex-1 bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !question.trim()}
          className="px-4 py-2 rounded bg-cyan1 text-bg1 text-sm font-bold hover:bg-cyan1/80 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {result && (
        <div className="p-4 rounded-lg border border-cyan1/20 bg-cyan1/5">
          <p className="text-xs text-muted mb-2">{result.model_used} · Score: {result.global_score}/100</p>
          <p className="text-sm text-text1 leading-relaxed mb-3">{result.answer}</p>
          {result.key_risks.length > 0 && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Riesgos clave</p>
              <ul className="space-y-1">
                {result.key_risks.map((r, i) => (
                  <li key={i} className="text-xs text-text2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red1 shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
