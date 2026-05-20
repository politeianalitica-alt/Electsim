"use client";

import { useCallback, useRef, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";

interface Props {
  workspaceName: string;
  context: string;
}

export function ExecutiveSummaryPanel({ workspaceName, context }: Props) {
  const [text, setText] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (goal = "informe ejecutivo del workspace") => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setText("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceName, context, goal }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        setError(`HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setText(full);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceName, context]);

  const exportTxt = useCallback(() => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumen-ejecutivo-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [text]);

  const exportPdf = useCallback(async () => {
    if (!text) return;
    try {
      const mod: any = await import("@react-pdf/renderer");
      const { Document, Page, Text: PdfText, View, StyleSheet, pdf } = mod;
      const styles = StyleSheet.create({
        page: { padding: 36, fontSize: 11, color: "#222", fontFamily: "Helvetica" },
        h1:   { fontSize: 18, marginBottom: 12, fontWeight: 700 },
        meta: { fontSize: 9, color: "#666", marginBottom: 18 },
        body: { fontSize: 11, lineHeight: 1.5 },
      });
      const Doc = (
 <Document>
 <Page size="A4" style={styles.page}>
 <View>
 <PdfText style={styles.h1}>Resumen ejecutivo · {workspaceName}</PdfText>
 <PdfText style={styles.meta}>Generado {new Date().toLocaleString("es-ES")}</PdfText>
              {text.split("\n").map((line: string, i: number) => (
 <PdfText key={i} style={styles.body}>{line || " "}</PdfText>
              ))}
 </View>
 </Page>
 </Document>
      );
      const blob = await pdf(Doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      exportTxt();
    }
  }, [text, workspaceName, exportTxt]);

  return (
 <div
      style={{
        background: WS.surface,
        border: `1px solid ${WS.border}`,
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <div>
 <div style={{ fontSize: 11, fontWeight: 700, color: WS.ink2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Resumen ejecutivo · PoliteIA
 </div>
 <div style={{ fontSize: 11, color: WS.ink3, marginTop: 4 }}>
            Llama3.2 sobre los KPIs y proyectos del workspace.
 </div>
 </div>
 <div style={{ display: "flex", gap: 8 }}>
 <button onClick={() => generate()} disabled={isLoading} style={primaryBtn}>
            {isLoading ? "Generando…" : "Generar"}
 </button>
 <button onClick={exportPdf} disabled={!text} style={secondaryBtn}>PDF</button>
 <button onClick={exportTxt} disabled={!text} style={secondaryBtn}>TXT</button>
 </div>
 </div>

 <div
        style={{
          flex: 1,
          minHeight: 220,
          maxHeight: 360,
          overflowY: "auto",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: WS.ink,
          background: WS.surface2,
          border: `1px solid ${WS.border}`,
          borderRadius: 10,
          padding: 14,
          whiteSpace: "pre-wrap",
          fontFamily: WS.font,
        }}
      >
        {error && <div style={{ color: WS.danger, fontSize: 12 }}>Error: {error}</div>}
        {!text && !isLoading && !error && (
 <span style={{ color: WS.ink3 }}>
            Pulsa <strong>Generar</strong> para crear el resumen ejecutivo con PoliteIA.
 </span>
        )}
        {text}
        {isLoading && <span style={{ color: WS.accent }}> ▍</span>}
 </div>
 </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "6px 14px", background: WS.accent, border: "none",
  borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: WS.font,
};
const secondaryBtn: React.CSSProperties = {
  padding: "6px 12px", background: WS.surface2, border: `1px solid ${WS.border}`,
  borderRadius: 8, color: WS.ink2, fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: WS.font,
};
