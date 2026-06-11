"use client";

/**
 * Error boundary del segmento /workspaces/[workspaceId]/*.
 *
 * Al vivir DENTRO del layout del workspace, un fallo en una vista conserva
 * el chrome (AppHeader, sidebar, topbar) en lugar de hacer bubble hasta el
 * app/error.tsx raíz y perder todo el contexto.
 */

import { useEffect } from "react";
import { WS } from "@/lib/workspace/workspace-utils";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log al cliente para diagnóstico; sin telemetría todavía.
    console.error("[workspace] vista rota:", error);
  }, [error]);

  return (
 <div style={{
      fontFamily: WS.font, maxWidth: 560, margin: "60px auto", textAlign: "center",
      padding: 28, background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 14,
    }}>
 <div style={{
        width: 40, height: 40, borderRadius: 12, margin: "0 auto 12px",
        background: WS.dangerSub, color: WS.danger,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 700,
      }}>
        !
 </div>
 <h2 style={{ fontFamily: WS.fontDisplay, fontSize: 18, fontWeight: 600, color: WS.ink, margin: "0 0 6px" }}>
        Esta vista ha fallado
 </h2>
 <p style={{ fontSize: 13, color: WS.ink3, margin: "0 0 16px", lineHeight: 1.5 }}>
        El resto del workspace sigue disponible desde el sidebar.
        {error.digest && <span style={{ display: "block", marginTop: 4, fontSize: 11 }}>Ref: {error.digest}</span>}
 </p>
 <button
        onClick={reset}
        style={{
          padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 9,
          border: "none", background: WS.accent, color: "#fff", cursor: "pointer", fontFamily: WS.font,
        }}
      >
        Reintentar
 </button>
 </div>
  );
}
