import type { LegislativeItemDetail as ItemDetail } from "@/lib/types/legislative";
import { X, ExternalLink, Globe, Flag } from "lucide-react";
import { LegislativeSectorImpact } from "./LegislativeSectorImpact";
import { LegislativeActorPosition } from "./LegislativeActorPosition";
import { LegislativeTimeline } from "./LegislativeTimeline";

interface Props {
  item: ItemDetail | null;
  onClose: () => void;
}

export function LegislativeItemDetailPanel({ item, onClose }: Props) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-xl bg-bg1 border-l border-border1 overflow-y-auto p-6 space-y-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
              {item.procedure_label} · {item.stage_label}
            </div>
            <h2 className="text-lg font-bold text-text1 leading-snug">{item.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg3 transition shrink-0">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.ue_origin && <span className="badge badge-cyan flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> UE</span>}
          {item.is_government && <span className="badge badge-blue flex items-center gap-1"><Flag className="w-2.5 h-2.5" /> Gobierno</span>}
          {item.tags.slice(0, 5).map(t => (
            <span key={t} className="badge badge-blue">#{t}</span>
          ))}
        </div>

        {item.summary && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted mb-2">Resumen</h3>
            <p className="text-sm text-text2 leading-relaxed">{item.summary}</p>
          </div>
        )}

        {item.objetivos.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted mb-2">Objetivos</h3>
            <ul className="space-y-1">
              {item.objetivos.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text2">
                  <span className="text-cyan1 mt-0.5">•</span>{o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.analyst_note && (
          <div className="p-3 rounded-lg bg-bg3 border border-border1">
            <div className="text-[10px] uppercase tracking-wider text-cyan1 mb-1">Nota analítica</div>
            <p className="text-sm text-text1 leading-relaxed">{item.analyst_note}</p>
          </div>
        )}

        {item.timeline.length > 0 && <LegislativeTimeline events={item.timeline} />}
        {item.sector_impacts.length > 0 && <LegislativeSectorImpact impacts={item.sector_impacts} />}
        {item.actor_positions.length > 0 && <LegislativeActorPosition positions={item.actor_positions} />}

        {item.boe_url && (
          <a href={item.boe_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-cyan1 hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> Ver en el BOE
          </a>
        )}
      </div>
    </div>
  );
}
