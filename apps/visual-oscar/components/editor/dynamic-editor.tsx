"use client";

import dynamic from "next/dynamic";

// Editor cargado dinámicamente sin SSR para evitar errores de hidratación
// cuando se migre al BlockNote completo (que toca window/document en mount).
export const PoliteiBlockEditor = dynamic(
  () => import("./politeia-block-editor").then(m => m.PoliteiBlockEditor),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

function EditorSkeleton() {
  return (
    <div className="min-h-[600px] space-y-3 animate-pulse">
      <div className="h-10 w-2/3 rounded bg-slate-800" />
      <div className="h-4 w-full rounded bg-slate-800" />
      <div className="h-4 w-5/6 rounded bg-slate-800" />
      <div className="h-4 w-4/6 rounded bg-slate-800" />
    </div>
  );
}
