"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { FileText, Download, Volume2, Square, Plus, Calendar, Archive } from "lucide-react";
import Link from "next/link";

const INTEL_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";

interface BriefingArchiveItem {
  id?: string;
  date?: string;
  title?: string;
  type?: string;
  workspace?: string;
}

async function downloadBriefingPDF(id: string): Promise<boolean> {
  try {
    const r = await fetch(`${INTEL_BASE}/api/briefings/${id}/pdf`);
    if (!r.ok) return false;
    const data: { url?: string; bytes_b64?: string } = await r.json();
    if (data.bytes_b64) {
      const bytes = Uint8Array.from(atob(data.bytes_b64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `briefing-${id}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
    if (data.url) { window.open(data.url, "_blank"); return true; }
  } catch { /* ignore */ }
  return false;
}

export default function BriefingsPage() {
  const { data: briefing } = useQuery({
    queryKey: ["briefing", "morning"],
    queryFn: () => endpoints.morningBriefing("default"),
    staleTime: 60 * 60_000,
  });

  const { data: briefingsList = [] } = useQuery<BriefingArchiveItem[]>({
    queryKey: ["briefings", "list"],
    queryFn: () => fetch(`${INTEL_BASE}/api/briefings`).then(r => r.json()).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeArchiveId, setActiveArchiveId] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    await downloadBriefingPDF(id);
    setDownloadingId(null);
  };

  // ── Web Speech API · TTS sin servidor ─────────────────────────────────────
  const [speaking, setSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const onVoicesChanged = () => setVoicesReady(true);
    window.speechSynthesis.onvoiceschanged = onVoicesChanged;
    if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true);
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speakSummary = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Tu navegador no soporta síntesis de voz.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    u.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.find(v => v.lang.startsWith("es") && v.name.includes("Google"))
                 || voices.find(v => v.lang.startsWith("es"))
                 || voices[0];
    if (spanish) u.voice = spanish;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const fullSummary = (b: typeof briefing) => {
    if (!b) return "";
    const alerts = (b.key_alerts ?? []).slice(0, 3).map(a => a.title).join(". ");
    const stories = (b.top_stories ?? []).slice(0, 3).map(s => s.title).join(". ");
    return `${b.executive_summary}. Señales críticas: ${alerts}. Top stories: ${stories}. ${b.analyst_note ?? ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Inteligencia editorial</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Briefings</h1>
          <p className="text-text2 text-sm mt-1">Generación, archivo y exportación de briefings premium con evidencia.</p>
        </div>
        <button className="px-4 py-2 rounded-md bg-cyan1 text-bg font-semibold flex items-center gap-2 hover:bg-cyan2 transition">
          <Plus className="w-4 h-4" /> Crear briefing
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 premium-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="label-cap">Briefing matinal</span>
              <h2 className="text-xl font-bold text-text1 mt-1">Análisis ejecutivo del día</h2>
              <p className="text-text2 text-xs flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString("es-ES", { dateStyle: "full" })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload("today")}
                disabled={downloadingId === "today"}
                className="px-3 py-1.5 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> {downloadingId === "today" ? "Generando…" : "PDF"}
              </button>
              <button
                onClick={() => speakSummary(briefing?.executive_summary ?? "")}
                disabled={!voicesReady || !briefing?.executive_summary}
                className={`px-3 py-1.5 rounded-md border text-xs flex items-center gap-1.5 transition ${
                  speaking ? "bg-cyan1 text-bg border-cyan1" : "bg-bg3 border-border1 hover:border-cyan1/40"
                } disabled:opacity-50`}
              >
                {speaking ? <Square className="w-3.5 h-3.5"/> : <Volume2 className="w-3.5 h-3.5"/>}
                {speaking ? "Detener" : "Audio"}
              </button>
            </div>
          </div>

          <h3 className="text-sm font-bold text-cyan1 mb-2 uppercase tracking-wider">Resumen ejecutivo</h3>
          <p className="text-text1 leading-relaxed mb-6">{briefing?.executive_summary || "Cargando análisis..."}</p>

          <h3 className="text-sm font-bold text-cyan1 mb-2 uppercase tracking-wider">Señales críticas</h3>
          <ul className="space-y-2 mb-6">
            {(briefing?.key_alerts || []).map((alert, i) => (
              <li key={i} className="flex gap-3 p-3 rounded-lg bg-bg/50 border border-border1">
                <span className={`w-1 rounded-full ${alert.level === "high" ? "bg-red1" : "bg-amber1"}`} />
                <div>
                  <div className="text-sm text-text1 font-medium">{alert.title}</div>
                  <div className="text-xs text-text2 mt-1">{alert.body}</div>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="text-sm font-bold text-cyan1 mb-2 uppercase tracking-wider">Top noticias seleccionadas</h3>
          <ul className="space-y-2 mb-6">
            {(briefing?.top_stories || []).map((s, i) => (
              <li key={i} className="text-sm">
                <span className="text-muted text-xs">[{s.source}]</span>{" "}
                <span className="text-text1">{s.title}</span>
              </li>
            ))}
          </ul>

          <h3 className="text-sm font-bold text-cyan1 mb-2 uppercase tracking-wider">Tres preguntas estratégicas</h3>
          <ol className="space-y-2 list-decimal list-inside text-text1">
            {(briefing?.three_questions || []).map((q, i) => (
              <li key={i} className="text-sm">{q}</li>
            ))}
          </ol>
        </section>

        <aside className="space-y-4">
          <div className="premium-card">
            <h3 className="text-sm font-bold text-text1 mb-3">Tipos de briefing</h3>
            <ul className="space-y-1">
              {["Diario", "Cliente", "Campaña", "Crisis", "Geopolítico", "Legislativo"].map(t => (
                <li key={t}>
                  <button className="w-full text-left px-3 py-2 rounded-md text-sm text-text2 hover:text-cyan1 hover:bg-bg3 transition flex items-center justify-between group">
                    <span>{t}</span>
                    <FileText className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="premium-card">
            <h3 className="text-sm font-bold text-text1 mb-3">Historial reciente</h3>
            <ul className="space-y-2">
              {[
                { d: "5 may", t: "Briefing matinal — España" },
                { d: "4 may", t: "Briefing matinal — España" },
                { d: "3 may", t: "Briefing crisis — DANA Valencia" },
                { d: "2 may", t: "Briefing cliente — Sector banca" }
              ].map((b, i) => (
                <li key={i} className="text-xs">
                  <button className="w-full text-left p-2 rounded hover:bg-bg3 transition">
                    <div className="text-muted">{b.d}</div>
                    <div className="text-text1">{b.t}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="premium-card border-cyan1/30">
            <h3 className="text-sm font-bold text-cyan1 mb-2">Audio summary completo</h3>
            <p className="text-xs text-text2 mb-3">Síntesis vocal local (Web Speech API) — incluye resumen, señales críticas y top stories.</p>
            <button
              onClick={() => speakSummary(fullSummary(briefing))}
              disabled={!voicesReady || !briefing}
              className={`w-full px-3 py-2 rounded-md text-sm transition flex items-center justify-center gap-2 ${
                speaking
                  ? "bg-cyan1 text-bg border border-cyan1 hover:bg-cyan2"
                  : "bg-cyan1/10 border border-cyan1/30 text-cyan1 hover:bg-cyan1/20"
              } disabled:opacity-50`}
            >
              {speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {speaking ? "Detener reproducción" : "Generar audio"}
            </button>
            {!voicesReady && <p className="text-[10px] text-muted mt-2 text-center">Cargando voces del sistema...</p>}
          </div>
        </aside>
      </div>

      {/* Archive — last 7 days */}
      <section className="premium-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 flex items-center gap-2">
            <Archive className="w-4 h-4 text-cyan1"/>
            Archivo · últimos 7 días
          </h2>
          <span className="text-xs text-text2">{briefingsList.length} disponibles</span>
        </div>
        {briefingsList.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">Sin briefings archivados.</p>
        ) : (
          <div className="space-y-1.5">
            {briefingsList.map(b => {
              const id = b.id ?? "";
              const isActive = activeArchiveId === id;
              const dateLabel = b.date
                ? new Date(b.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
                : "—";
              return (
                <div
                  key={id}
                  onClick={() => setActiveArchiveId(id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                    isActive
                      ? "bg-cyan1/10 border border-cyan1/20 text-cyan1"
                      : "bg-bg/50 border border-border1 hover:border-cyan1/30"
                  }`}
                >
                  <Calendar className="w-4 h-4 text-cyan1 shrink-0"/>
                  <span className="text-xs font-mono w-16 shrink-0">{dateLabel}</span>
                  <span className="flex-1 text-sm text-text1 truncate">{b.title ?? "Briefing matinal"}</span>
                  {b.type && <span className="badge badge-cyan shrink-0">{b.type}</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); if (id) handleDownload(id); }}
                    disabled={!id || downloadingId === id}
                    className="px-2.5 py-1 text-xs rounded border border-border1 text-text2 hover:border-cyan1 hover:text-cyan1 disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
                  >
                    <Download className="w-3 h-3"/>
                    {downloadingId === id ? "…" : "PDF"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
