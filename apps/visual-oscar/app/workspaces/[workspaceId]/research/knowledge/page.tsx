"use client";

import { useState } from "react";
import Link from "next/link";
import { researchRepository } from "@/lib/research/research-repository";

export default function KnowledgeBasePage({ params }: { params: { workspaceId: string } }) {
  const items = researchRepository.getKnowledge(params.workspaceId);
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? items.filter(
        i => i.title.toLowerCase().includes(q.toLowerCase()) || i.content.toLowerCase().includes(q.toLowerCase())
      )
    : items;

  return (
    <div>
      <div className="mb-4">
        <Link href={`/workspaces/${params.workspaceId}/research`} className="text-xs text-slate-500 hover:text-slate-300">
          ← Research
        </Link>
        <h1 className="text-lg font-bold text-slate-100 mt-1">Knowledge base</h1>
        <p className="text-xs text-slate-500">{items.length} items indexados</p>
      </div>

      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Buscar en la base de conocimiento…"
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none mb-4"
      />

      <div className="grid grid-cols-2 gap-3">
        {filtered.map(it => (
          <div key={it.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500/40 transition-colors cursor-pointer">
            <p className="text-sm font-semibold text-slate-100 mb-2">{it.title}</p>
            <p className="text-xs text-slate-400 mb-3 line-clamp-3 leading-relaxed">{it.content}</p>
            <div className="flex flex-wrap gap-1">
              {it.tags.map(t => (
                <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 text-sm text-slate-400">Sin resultados.</p>
        )}
      </div>
    </div>
  );
}
