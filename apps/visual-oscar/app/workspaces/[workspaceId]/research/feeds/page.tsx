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
        <Link href={`/workspaces/${params.workspaceId}/research`} className="text-xs text-slate-500 hover:text-slate-300">
          ← Research
        </Link>
        <h1 className="text-lg font-bold text-slate-100 mt-1">Monitor RSS</h1>
        <p className="text-xs text-slate-500">{feeds.filter(f => f.active).length} feeds activos · {items.length} items</p>
      </div>

      <div className="flex gap-1.5 mb-4">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] capitalize transition-colors ${
              cat === c ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {c === "all" ? "Todo" : c}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
        {filtered.map(item => {
          const relColor = item.relevanceScore >= 0.8 ? "text-red-400" : item.relevanceScore >= 0.5 ? "text-amber-400" : "text-slate-500";
          return (
            <div key={item.id} className={`px-4 py-3 hover:bg-slate-800/50 transition-colors ${item.read ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-snug mb-1 line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-2 text-[10px] mb-1">
                    <span className="text-slate-500">
                      {new Date(item.publishedAt).toLocaleDateString("es-ES")}
                    </span>
                    <span className={`font-medium ${relColor}`}>
                      {Math.round(item.relevanceScore * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{item.snippet}</p>
                </div>
                <div className="flex flex-col gap-1 flex-none">
                  <button
                    className={`rounded px-2 py-1 text-[10px] transition-colors ${
                      item.saved ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {item.saved ? "Guardado" : "Guardar"}
                  </button>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-center"
                  >
                    Abrir
                  </a>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">Sin items en esta categoría.</div>
        )}
      </div>
    </div>
  );
}
