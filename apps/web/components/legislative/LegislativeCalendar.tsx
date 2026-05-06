import type { CalendarItem } from "@/lib/types/legislative";
import { Calendar, Vote, Users, BookOpen } from "lucide-react";

const EVENT_ICONS: Record<string, React.ElementType> = {
  pleno: Vote,
  votacion: Vote,
  comision: Users,
  ponencia: BookOpen,
  otro: Calendar,
};

const EVENT_COLOR: Record<string, string> = {
  pleno: "text-red1",
  votacion: "text-red1",
  comision: "text-cyan1",
  ponencia: "text-amber1",
  otro: "text-text2",
};

interface Props {
  items: CalendarItem[];
  isLoading?: boolean;
}

export function LegislativeCalendar({ items, isLoading }: Props) {
  return (
    <section className="premium-card">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-cyan1" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Agenda Parlamentaria</h2>
      </div>
      {isLoading ? (
        <div className="text-sm text-text2 text-center py-6">Cargando agenda…</div>
      ) : (
        <ul className="space-y-2">
          {items.map((c, i) => {
            const Icon = EVENT_ICONS[c.event_type] ?? Calendar;
            const colorClass = EVENT_COLOR[c.event_type] ?? "text-text2";
            return (
              <li key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg3 transition cursor-pointer">
                <div className="text-xs font-mono text-cyan1 w-10 shrink-0 pt-0.5">{c.day_label}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text1 leading-snug">{c.title}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Icon className={`w-3 h-3 ${colorClass}`} />
                    <span className={`text-[10px] uppercase tracking-wider ${colorClass}`}>{c.event_type_label}</span>
                    {c.time && <span className="text-[10px] text-muted ml-1">{c.time}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
