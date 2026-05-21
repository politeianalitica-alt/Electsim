"use client";

import dynamic from "next/dynamic";

export const BarBlock = dynamic(
  () => import("./dashboard-charts").then(m => m.BarBlock),
  { ssr: false, loading: () => <ChartSkeleton title="Cargando gráfico" /> }
);

export const PieBlock = dynamic(
  () => import("./dashboard-charts").then(m => m.PieBlock),
  { ssr: false, loading: () => <ChartSkeleton title="Cargando gráfico" /> }
);

export const ActivityArea = dynamic(
  () => import("./dashboard-charts").then(m => m.ActivityArea),
  { ssr: false, loading: () => <ChartSkeleton title="Cargando actividad" /> }
);

function ChartSkeleton({ title }: { title: string }) {
  return (
 <div
      style={{
        background: "#111117",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 14,
        minHeight: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#5a5a6e",
        fontSize: 11,
      }}
    >
      {title}…
 </div>
  );
}
