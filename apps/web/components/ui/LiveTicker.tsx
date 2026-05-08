"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface TickerItem {
  text: string;
  category: string;
  color: string;
  priority: number;
  timestamp: string;
}

const FALLBACK: TickerItem[] = [
  { text: "Sistema operativo — sin incidencias críticas", category: "alert", color: "#10B981", priority: 5, timestamp: new Date().toISOString() },
  { text: "PP 33.2% | PSOE 28.5% | VOX 11.3%", category: "electoral", color: "#00D4FF", priority: 4, timestamp: new Date().toISOString() },
  { text: "Congreso — 8 iniciativas esta semana", category: "legislative", color: "#3B82F6", priority: 2, timestamp: new Date().toISOString() },
];

export function LiveTicker() {
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const { data: items = FALLBACK } = useQuery({
    queryKey: ["system", "ticker"],
    queryFn: async () => {
      const r = await fetch(`${process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? ""}/api/system/ticker`);
      if (!r.ok) throw new Error("ticker fail");
      return (await r.json()) as TickerItem[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    placeholderData: FALLBACK,
  });

  // Duplicate items for seamless loop
  const loop = items.length > 0 ? [...items, ...items] : [];

  return (
    <div className="w-full bg-bg2 border-y border-border1 py-2 overflow-hidden flex items-center gap-3">
      {/* "EN VIVO" label */}
      <div className="flex-shrink-0 flex items-center gap-1.5 pl-4 pr-3 border-r border-border1">
        <span className="w-1.5 h-1.5 rounded-full bg-red1 animate-pulse"/>
        <span className="text-[9px] font-bold text-red1 uppercase tracking-wider">En vivo</span>
      </div>

      {/* Scrolling track */}
      <div
        className="flex-1 overflow-hidden relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          className="flex"
          style={{
            animation: paused ? "none" : "ticker-scroll 80s linear infinite",
            width: "max-content",
          }}
        >
          {loop.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 border-r border-border1/40 whitespace-nowrap"
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-text1">{item.text}</span>
              <span className="text-[9px] uppercase tracking-wider text-muted ml-1">
                {item.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
