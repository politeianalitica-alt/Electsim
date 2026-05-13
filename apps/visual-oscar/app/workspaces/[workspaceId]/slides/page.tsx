"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { buildExecutiveContext } from "@/lib/workspace/analytics-builder";
import { SlideRenderer } from "@/components/slides/slide-renderer";
import { useHotkeys } from "@/lib/terminal/use-hotkeys";
import type { Deck } from "@/types/slides";

const STORAGE_KEY = (ws: string) => `politeia:slides:deck:${ws}`;

export default function SlidesPage({ params }: { params: { workspaceId: string } }) {
  const workspace = workspaceRepository.getWorkspaceById(params.workspaceId);
  const workspaceName = workspace?.name ?? "Politeia";

  const [brief, setBrief]       = useState("Análisis político ejecutivo · oportunidades y riesgos · próximas 2 semanas");
  const [deck, setDeck]         = useState<Deck | null>(null);
  const [isGenerating, setBusy] = useState(false);
  const [presentIdx, setPresentIdx] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY(params.workspaceId));
      if (raw) setDeck(JSON.parse(raw) as Deck);
    } catch { /* ignore */ }
  }, [params.workspaceId]);

  const context = useMemo(
    () =>
      buildExecutiveContext({
        issues:        workspaceRepository.getIssues(params.workspaceId),
        actions:       workspaceRepository.getActions(params.workspaceId),
        alerts:        workspaceRepository.getAlerts(params.workspaceId),
        decisions:     workspaceRepository.getDecisions(params.workspaceId),
        documents:     workspaceRepository.getDocuments(params.workspaceId),
        research:      workspaceRepository.getResearchThreads(params.workspaceId),
        projects:      workspaceRepository.getProjects(params.workspaceId),
        opportunities: workspaceRepository.getOpportunities(params.workspaceId),
      }),
    [params.workspaceId]
  );

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: params.workspaceId, workspaceName, brief, context }),
        signal: ctrl.signal,
      });
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const data: Deck = await res.json();
      setDeck(data);
      try { window.localStorage.setItem(STORAGE_KEY(params.workspaceId), JSON.stringify(data)); } catch { /* ignore */ }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [brief, context, params.workspaceId, workspaceName]);

  const exportPdf = useCallback(async () => {
    if (!deck) return;
    const spec = {
      title:    deck.title,
      subtitle: deck.subtitle,
      author:   deck.client,
      workspace: params.workspaceId,
      generatedAt: deck.generatedAt,
      blocks: deck.slides.flatMap((s, i) => {
        const out: any[] = [];
        if (s.title)    out.push({ type: i === 0 ? "h1" : "h2", text: s.title });
        if (s.subtitle) out.push({ type: "p", text: s.subtitle });
        if (s.bullets)  for (const b of s.bullets) out.push({ type: "bullet", text: b });
        if (s.rightBullets) for (const b of s.rightBullets) out.push({ type: "bullet", text: b });
        if (s.kpis)     out.push({ type: "kv", pairs: s.kpis.map(k => [k.label, k.hint ? `${k.value} (${k.hint})` : k.value]) });
        if (s.quote)    out.push({ type: "callout", text: `«${s.quote}»${s.author ? ` — ${s.author}` : ""}`, tone: "info" });
        out.push({ type: "divider" });
        return out;
      }),
    };
    const res = await fetch("/api/render/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(spec),
    });
    if (!res.ok) { alert("Error al renderizar PDF"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(deck.title || "deck").toLowerCase().replace(/\s+/g, "-")}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }, [deck, params.workspaceId]);

  // ── Modo presentación ────────────────────────────────────────────
  useHotkeys([
    { combo: "arrowright", handler: () => setPresentIdx(i => (i === null || !deck) ? i : Math.min(i + 1, deck.slides.length - 1)) },
    { combo: "arrowleft",  handler: () => setPresentIdx(i => (i === null) ? i : Math.max(i - 1, 0)) },
    { combo: "esc",        handler: () => setPresentIdx(null) },
  ]);

  return (
    <div>
      <WorkspaceViewHeader
        view="slides"
        title="Politeia Slides"
        description={`Presentaciones generadas por Ollama · ${deck?.source === "ollama" ? "live" : "mock"}`}
        badge={deck ? `${deck.slides.length} slides` : ""}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={generate}
              disabled={isGenerating}
              style={{
                padding: "7px 14px", background: WS.accent, border: "none",
                borderRadius: 9, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                fontFamily: WS.font,
              }}
            >
              {isGenerating ? "Generando…" : "Generar deck"}
            </button>
            {deck && (
              <>
                <button
                  onClick={() => setPresentIdx(0)}
                  style={{
                    padding: "7px 14px", background: WS.surface, border: `1px solid ${WS.border}`,
                    borderRadius: 9, color: WS.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    fontFamily: WS.font,
                  }}
                >
                  Presentar
                </button>
                <button
                  onClick={exportPdf}
                  style={{
                    padding: "7px 14px", background: WS.surface, border: `1px solid ${WS.border}`,
                    borderRadius: 9, color: WS.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    fontFamily: WS.font,
                  }}
                >
                  Exportar PDF
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Brief input */}
      <div style={{
        background: WS.surface, border: `1px solid ${WS.border}`,
        borderRadius: 12, padding: 14, marginBottom: 14,
        display: "flex", gap: 12, alignItems: "center",
      }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: WS.ink3, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Encargo
        </span>
        <input
          value={brief}
          onChange={e => setBrief(e.target.value)}
          placeholder="Ej: presentación 10 slides análisis electoral CCAA para cliente Energía"
          style={{
            flex: 1, padding: "8px 12px", border: `1px solid ${WS.border}`,
            borderRadius: 9, fontSize: 13, background: WS.bg, color: WS.ink, fontFamily: WS.font,
            outline: "none",
          }}
        />
      </div>

      {error && (
        <div style={{ background: WS.dangerSub, color: WS.danger, padding: 12, borderRadius: 10, fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!deck && !isGenerating && (
        <div style={{ padding: 32, textAlign: "center", color: WS.ink3, fontSize: 13 }}>
          Escribe el encargo arriba y pulsa «Generar deck».
        </div>
      )}

      {/* Grid de slides */}
      {deck && (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 14, marginBottom: 18,
          }}>
            {deck.slides.map((s, i) => (
              <div key={s.id} onClick={() => setPresentIdx(i)} style={{ cursor: "zoom-in" }}>
                <SlideRenderer slide={s} index={i} total={deck.slides.length} mode="card" />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: WS.ink3, marginBottom: 24 }}>
            Generado {new Date(deck.generatedAt).toLocaleString("es-ES")} · fuente: {deck.source}
          </div>
        </>
      )}

      {/* Modo presentación */}
      {presentIdx !== null && deck && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "#0d0d0f",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: "min(94vw, 1500px)", aspectRatio: "16/9", maxHeight: "92vh" }}>
            <SlideRenderer
              slide={deck.slides[presentIdx]}
              index={presentIdx}
              total={deck.slides.length}
              mode="present"
            />
          </div>
          <div style={{
            position: "absolute", top: 18, right: 22, display: "flex", gap: 10,
          }}>
            <button
              onClick={() => setPresentIdx(null)}
              style={{
                padding: "6px 12px", background: "rgba(255,255,255,0.92)", border: "none",
                borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: WS.ink, cursor: "pointer",
                fontFamily: WS.font,
              }}
            >
              Salir (esc)
            </button>
          </div>
          <div style={{
            position: "absolute", bottom: 22, left: 0, right: 0, textAlign: "center",
            color: "#ffffff80", fontSize: 11.5, fontFamily: WS.font, letterSpacing: "0.08em",
          }}>
            ← → para navegar · ESC para salir
          </div>
        </div>
      )}
    </div>
  );
}
