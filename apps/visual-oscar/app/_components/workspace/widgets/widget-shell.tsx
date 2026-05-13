import Link from "next/link";
import type { ReactNode } from "react";

interface WidgetShellProps {
  title: string;
  badge?: number | string;
  badgeVariant?: "ok" | "warning" | "critical" | "info";
  action?: { label: string; href: string };
  children: ReactNode;
  className?: string;
}

const BADGE_STYLES: Record<string, { bg: string; fg: string }> = {
  ok:       { bg: "rgb(34 197 94 / 0.15)",   fg: "rgb(74 222 128)" },
  warning:  { bg: "rgb(245 158 11 / 0.15)",  fg: "rgb(251 191 36)" },
  critical: { bg: "rgb(239 68 68 / 0.15)",   fg: "rgb(248 113 113)" },
  info:     { bg: "rgb(99 102 241 / 0.15)",  fg: "rgb(129 140 248)" },
};

export function WidgetShell({
  title,
  badge,
  badgeVariant = "info",
  action,
  children,
  className = "",
}: WidgetShellProps) {
  const badgeStyle = BADGE_STYLES[badgeVariant];
  return (
    <div className={`flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          {badge !== undefined && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: badgeStyle.bg, color: badgeStyle.fg }}
            >
              {badge}
            </span>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            {action.label} →
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}
