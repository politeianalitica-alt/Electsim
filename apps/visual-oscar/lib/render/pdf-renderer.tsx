/**
 * Renderizador de PDFs server-side usando @react-pdf/renderer.
 *
 * @react-pdf es 10× más ligero que Puppeteer (no requiere Chromium) y suficiente
 * para los entregables del workspace: briefings, informes, presentaciones.
 * Para capturas HTML con CSS exacto (lo que sí requiere Puppeteer), hay
 * un fallback HTML→PDF que retorna el HTML enriquecido.
 */

import React from "react";

type PdfBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "bullet"; text: string }
  | { type: "callout"; text: string; tone?: "info" | "warn" | "danger" }
  | { type: "kv"; pairs: Array<[string, string]> }
  | { type: "divider" }
  | { type: "footer"; text: string };

export interface PdfDocSpec {
  title:       string;
  subtitle?:   string;
  author?:     string;
  workspace?:  string;
  generatedAt?: string;
  blocks:      PdfBlock[];
  meta?:       Record<string, string | number>;
}

/**
 * Renderiza el spec a un Buffer PDF.
 * Hace dynamic import de @react-pdf/renderer para que tampoco falle el build
 * si la dep no está instalada (el wrapper se usa también lado cliente con
 * blob).
 */
export async function renderPdf(spec: PdfDocSpec): Promise<Buffer> {
  const mod: any = await import("@react-pdf/renderer");
  const { Document, Page, Text, View, StyleSheet, Font, pdf } = mod;

  const C = {
    ink: "#1d1d1f",
    ink2: "#3a3a3d",
    ink3: "#6e6e73",
    border: "#d2d2d7",
    bg: "#fbfbfd",
    accent: "#1F4E8C",
    danger: "#c42c2c",
    warn: "#d97706",
    info: "#1F4E8C",
  };

  const S = StyleSheet.create({
    page: {
      paddingTop:    52,
      paddingBottom: 64,
      paddingHorizontal: 56,
      fontFamily: "Helvetica",
      color: C.ink,
      fontSize: 10.5,
      lineHeight: 1.55,
    },
    h1:        { fontSize: 22, fontWeight: 700, marginBottom: 6, color: C.ink, letterSpacing: -0.3 },
    subtitle:  { fontSize: 11, color: C.ink3, marginBottom: 18 },
    meta:      { fontSize: 9,  color: C.ink3, marginBottom: 12 },
    h2:        { fontSize: 14, fontWeight: 700, marginTop: 18, marginBottom: 6, color: C.ink },
    h3:        { fontSize: 12, fontWeight: 700, marginTop: 12, marginBottom: 4, color: C.ink2 },
    p:         { fontSize: 10.5, marginBottom: 6, color: C.ink2 },
    bullet:    { fontSize: 10.5, marginBottom: 3, marginLeft: 12, color: C.ink2 },
    calloutBox:{ padding: 10, borderRadius: 6, marginVertical: 8, borderLeftWidth: 3 },
    divider:   { height: 1, backgroundColor: C.border, marginVertical: 12 },
    kvRow:     { flexDirection: "row", marginBottom: 3 },
    kvKey:     { width: 110, fontSize: 9.5, color: C.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
    kvVal:     { fontSize: 10.5, color: C.ink },
    footer:    { position: "absolute", bottom: 28, left: 56, right: 56, fontSize: 8.5, color: C.ink3, textAlign: "center", borderTopWidth: 1, borderColor: C.border, paddingTop: 8 },
    branding:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
    brandDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent, marginRight: 6 },
    brandText: { fontSize: 9, color: C.ink3, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" },
  });

  function CalloutColor(tone?: "info" | "warn" | "danger") {
    if (tone === "danger") return { borderColor: C.danger, color: C.danger };
    if (tone === "warn")   return { borderColor: C.warn,   color: C.warn };
    return { borderColor: C.info, color: C.info };
  }

  const Doc = React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: S.page },

      // Branding
      React.createElement(View, { style: S.branding },
        React.createElement(View, { style: { flexDirection: "row", alignItems: "center" } },
          React.createElement(View, { style: S.brandDot }),
          React.createElement(Text, { style: S.brandText }, "POLITEIA · WORKSPACE"),
        ),
        React.createElement(Text, { style: S.brandText },
          spec.workspace ? `WS · ${spec.workspace.toUpperCase()}` : ""),
      ),

      // Title
      React.createElement(Text, { style: S.h1 }, spec.title),
      spec.subtitle ? React.createElement(Text, { style: S.subtitle }, spec.subtitle) : null,
      React.createElement(Text, { style: S.meta },
        [
          spec.author ? `Autor: ${spec.author}` : "",
          spec.generatedAt ? `Generado: ${new Date(spec.generatedAt).toLocaleString("es-ES")}` : `Generado: ${new Date().toLocaleString("es-ES")}`,
        ].filter(Boolean).join(" · ")
      ),

      // Meta KV
      spec.meta
        ? React.createElement(View, { style: { marginBottom: 14 } },
            ...Object.entries(spec.meta).map(([k, v], i) =>
              React.createElement(View, { key: `m${i}`, style: S.kvRow },
                React.createElement(Text, { style: S.kvKey }, k.toUpperCase()),
                React.createElement(Text, { style: S.kvVal }, String(v)),
              )
            )
          )
        : null,

      // Blocks
      ...spec.blocks.map((b, i) => {
        switch (b.type) {
          case "h1":      return React.createElement(Text, { key: i, style: S.h1 }, b.text);
          case "h2":      return React.createElement(Text, { key: i, style: S.h2 }, b.text);
          case "h3":      return React.createElement(Text, { key: i, style: S.h3 }, b.text);
          case "p":       return React.createElement(Text, { key: i, style: S.p }, b.text);
          case "bullet":  return React.createElement(Text, { key: i, style: S.bullet }, `•  ${b.text}`);
          case "divider": return React.createElement(View, { key: i, style: S.divider });
          case "kv":      return React.createElement(View, { key: i, style: { marginVertical: 6 } },
                            ...b.pairs.map(([k, v], j) =>
                              React.createElement(View, { key: j, style: S.kvRow },
                                React.createElement(Text, { style: S.kvKey }, k.toUpperCase()),
                                React.createElement(Text, { style: S.kvVal }, v),
                              )
                            )
                          );
          case "callout": {
            const c = CalloutColor(b.tone);
            return React.createElement(View, { key: i, style: { ...S.calloutBox, borderColor: c.borderColor } },
              React.createElement(Text, { style: { fontSize: 10.5, color: c.color } }, b.text),
            );
          }
          case "footer":  return React.createElement(Text, { key: i, style: S.footer }, b.text);
          default:        return null;
        }
      }),

      // Fixed footer
      React.createElement(Text, { style: S.footer, fixed: true },
 `Politeia · Workspace · ${new Date().toLocaleDateString("es-ES")} · documento confidencial`),
    )
  );

  const buffer = await pdf(Doc).toBuffer();
  return buffer as Buffer;
}
