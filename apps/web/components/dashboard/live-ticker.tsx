"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";

const FALLBACK_TICKER = [
  { text: "Cargando datos en tiempo real...", color: "#64748B" },
];

export function LiveTicker() {
  const { data: items = FALLBACK_TICKER } = useQuery({
    queryKey: ["ticker", "live"],
    queryFn: () =>
      endpoints.tickerLive().then(data =>
        data.length > 0 ? data.map((it: any) => ({ text: it.text, color: it.color || "#94A3B8" })) : FALLBACK_TICKER
      ).catch(() => FALLBACK_TICKER),
    refetchInterval: 60 * 1000,
    staleTime: 50 * 1000,
  });

  const doubled = [...items, ...items];

  return (
    <div className="bg-bg2 border-y border-cyan1/20 -mx-6 overflow-hidden">
      <div className="flex animate-ticker py-2 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="px-6 text-sm font-medium" style={{ color: item.color }}>
            {item.text}
            <span className="ml-6 text-muted">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
