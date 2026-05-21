"use client";

import dynamic from "next/dynamic";

export const InvestigationCanvasView = dynamic(
  () =>
    import("./investigation-canvas-inner").then(m => ({
      default: m.InvestigationCanvasInner,
    })),
  {
    ssr: false,
    loading: () => (
 <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Cargando canvas…
 </div>
    ),
  }
);
