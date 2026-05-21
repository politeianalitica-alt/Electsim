"use client";

import dynamic from "next/dynamic";

export const ActorRelationshipMap = dynamic(
  () =>
    import("./actor-relationship-map-inner").then(m => ({
      default: m.ActorRelationshipMapInner,
    })),
  {
    ssr: false,
    loading: () => (
 <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Cargando mapa…
 </div>
    ),
  }
);
