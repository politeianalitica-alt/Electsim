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
        <Link href={`/workspaces/${params.workspaceId}/research`} className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]">
          ← Research
        </Link>
        <h1 className="text-lg font-bold text-[#1d1d1f] mt-1">Knowledge base</h1>
        <p className="text-xs text-[#6e6e73]">{items.length} items indexados</p>
      </div>

      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Buscar en la base de conocimiento…"
        className="w-full rounded-lg border border-[#e8e8ed] bg-[#f5f5f7] px-3 py-2 text-sm text-[#1d1d1f] placeholder-[#aeaeb2] focus:border-[#b0b0b8] focus:outline-none mb-4"
      />

      <div className="grid grid-cols-2 gap-3">
        {filtered.map(it => (
          <div key={it.id} className="rounded-xl border border-[#e8e8ed] bg-white p-4 hover:border-indigo-500/40 transition-colors cursor-pointer">
            <p className="text-sm font-semibold text-[#1d1d1f] mb-2">{it.title}</p>
            <p className="text-xs text-[#6e6e73] mb-3 line-clamp-3 leading-relaxed">{it.content}</p>
            <div className="flex flex-wrap gap-1">
              {it.tags.map(t => (
                <span key={t} className="rounded bg-[#f5f5f7] px-1.5 py-0.5 text-[10px] text-[#6e6e73]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 text-sm text-[#6e6e73]">Sin resultados.</p>
        )}
      </div>
    </div>
  );
}
