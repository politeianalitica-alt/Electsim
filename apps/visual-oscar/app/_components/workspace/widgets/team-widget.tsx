import type { WorkspaceMember } from "@/types/workspace";
import { WidgetShell } from "./widget-shell";

interface TeamWidgetProps {
  members: WorkspaceMember[];
}

const STATUS_DOT: Record<string, string> = {
  online:  "rgb(74 222 128)",
  busy:    "rgb(251 191 36)",
  offline: "rgb(100 116 139)",
};

export function TeamWidget({ members }: TeamWidgetProps) {
  const online = members.filter(m => m.status === "online").length;
  return (
    <WidgetShell title="Equipo y foco" badge={`${online}/${members.length}`} badgeVariant="ok">
      <ul className="space-y-2">
        {members.map(m => (
          <li key={m.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-[#f5f5f7]/40 transition-colors">
            <div className="relative flex-none">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8e8ed] text-[10px] font-bold text-[#1d1d1f]"
              >
                {m.initials}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#d2d2d7]"
                style={{ background: STATUS_DOT[m.status ?? "offline"] }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#1d1d1f] truncate">{m.name}</p>
              <p className="text-[10px] text-[#6e6e73] truncate">
                {m.currentFocus ? `▸ ${m.currentFocus}` : m.role}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
