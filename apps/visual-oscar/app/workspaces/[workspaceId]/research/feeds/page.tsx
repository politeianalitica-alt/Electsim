"use client";

import { useState } from "react";
import Link from "next/link";
import { researchRepository } from "@/lib/research/research-repository";

const CATEGORIES = ["all", "prensa", "legislativo", "europa", "economia"] as const;

export default function FeedsPage({ params }: { params: { workspaceId: string } }) {
  const feeds = researchRepository.getFeeds(params.workspaceId);
  const items = researchRepository.getItems();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("all");

  const filtered = items.filter(i => {
    if (cat === "all") return true;
    const feed = feeds.find(f => f.id === i.feedId);
    return feed?.category === cat;
  });

  return (
 <div>
 <div className="mb-4">
 <Link href={`/workspaces/${params.workspaceId}/research`} className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]">
          ← Research
 </Link>
 <h1 className="text-lg font-bold text-[#1d1d1f] mt-1">Monitor RSS</h1>
 <p className="text-xs text-[#6e6e73]">{feeds.filter(f => f.active).length} feeds activos · {items.length} items</p>
 </div>

 <div className="flex gap-1.5 mb-4">
        {CATEGORIES.map(c => (
 <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] capitalize transition-colors ${
              cat === c ? "bg-[#e8e8ed] text-[#1d1d1f]" : "text-[#6e6e73] hover:text-[#3a3a3d]"
            }`}
          >
            {c === "all" ? "Todo" : c}
 </button>
        ))}
 </div>

 <div className="rounded-xl border border-[#e8e8ed] bg-white divide-y divide-[#e8e8ed]">
        {filtered.map(item => {
          const relColor = item.relevanceScore >= 0.8 ? "text-red-400" : item.relevanceScore >= 0.5 ? "text-amber-400" : "text-[#6e6e73]";
          return (
 <div key={item.id} className={`px-4 py-3 hover:bg-[#f5f5f7]/50 transition-colors ${item.read ? "opacity-60" : ""}`}>
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1 min-w-0">
 <p className="text-sm text-[#1d1d1f] leading-snug mb-1 line-clamp-2">{item.title}</p>
 <div className="flex items-center gap-2 text-[10px] mb-1">
 <span className="text-[#6e6e73]">
                      {new Date(item.publishedAt).toLocaleDateString("es-ES")}
 </span>
 <span className={`font-medium ${relColor}`}>
                      {Math.round(item.relevanceScore * 100)}%
 </span>
 </div>
 <p className="text-[11px] text-[#6e6e73] line-clamp-2">{item.snippet}</p>
 </div>
 <div className="flex flex-col gap-1 flex-none">
 <button
                    className={`rounded px-2 py-1 text-[10px] transition-colors ${
                      item.saved ? "bg-indigo-500/20 text-indigo-400" : "text-[#6e6e73] hover:text-[#3a3a3d] hover:bg-[#f5f5f7]"
                    }`}
                  >
                    {item.saved ? "Guardado" : "Guardar"}
 </button>
 <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded px-2 py-1 text-[10px] text-[#6e6e73] hover:text-[#3a3a3d] hover:bg-[#f5f5f7] transition-colors text-center"
                  >
                    Abrir
 </a>
 </div>
 </div>
 </div>
          );
        })}
        {filtered.length === 0 && (
 <div className="p-8 text-center text-sm text-[#6e6e73]">Sin items en esta categoría.</div>
        )}
 </div>
 </div>
  );
}
