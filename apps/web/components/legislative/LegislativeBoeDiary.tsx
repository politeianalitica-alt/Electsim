import type { BoeItem } from "@/lib/types/legislative";
import { BookOpen, ChevronRight } from "lucide-react";

interface Props {
  items: BoeItem[];
  date?: string;
  isLoading?: boolean;
}

function relevanceBadge(r: string) {
  if (r === "alta") return "badge-red";
  if (r === "media") return "badge-amber";
  return "badge-blue";
}

export function LegislativeBoeDiary({ items, date, isLoading }: Props) {
  return (
    <section className="premium-card">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-cyan1" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
          BOE — {date ?? "hoy"}
        </h2>
      </div>
      {isLoading ? (
        <div className="text-sm text-text2 text-center py-6">Cargando BOE…</div>
      ) : (
        <ul className="space-y-2">
          {items.map((b, i) => (
            <li key={i} className="p-2.5 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted">{b.section}</span>
                <span className={`badge ${relevanceBadge(b.relevance)}`}>{b.relevance}</span>
              </div>
              <div className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug">{b.title}</div>
              {b.url ? (
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 flex items-center gap-1 text-[11px] text-cyan1 hover:underline">
                  Ver disposición <ChevronRight className="w-3 h-3" />
                </a>
              ) : (
                <div className="mt-1.5 text-[11px] text-muted">Sin enlace directo</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
