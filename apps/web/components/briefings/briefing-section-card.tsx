"use client";

import { useState } from "react";
import { ModeBadge } from "@/components/status/mode-badge";
import type { BriefingSection } from "@/lib/types/briefings";

interface Props {
  section: BriefingSection;
}

export function BriefingSectionCard({ section }: Props) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">{section.title}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {section.mode !== "real" && <ModeBadge mode={section.mode} />}
          {section.target_route && (
            <a
              href={section.target_route}
              className="text-[10px] text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5"
            >
              Abrir modulo
            </a>
          )}
        </div>
      </div>

      {section.body && (
        <p className="text-sm text-zinc-400 leading-relaxed">{section.body}</p>
      )}

      {section.bullets.length > 0 && (
        <ul className="space-y-1.5">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="text-zinc-600 flex-shrink-0 mt-0.5">›</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {section.recommended_action && (
        <div className="rounded bg-blue-500/10 border border-blue-500/20 px-3 py-2">
          <p className="text-xs text-blue-300">
            <span className="font-semibold">Accion: </span>
            {section.recommended_action}
          </p>
        </div>
      )}

      {section.evidence.length > 0 && (
        <div>
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline"
          >
            {showEvidence ? "Ocultar" : "Ver"} {section.evidence.length} evidencia{section.evidence.length !== 1 ? "s" : ""}
          </button>
          {showEvidence && (
            <ul className="mt-2 space-y-2">
              {section.evidence.map((ev) => (
                <li key={ev.id} className="text-xs text-zinc-400 border-l-2 border-zinc-700 pl-2">
                  <span className="text-zinc-300 font-medium">{ev.title}</span>
                  {ev.source_name && <span className="text-zinc-600"> ({ev.source_name})</span>}
                  {ev.url ? (
                    <a href={ev.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:underline">
                      enlace
                    </a>
                  ) : (
                    <span className="ml-1 text-zinc-700">sin URL</span>
                  )}
                  {ev.excerpt && (
                    <p className="mt-1 text-zinc-600 italic">{ev.excerpt.slice(0, 150)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
