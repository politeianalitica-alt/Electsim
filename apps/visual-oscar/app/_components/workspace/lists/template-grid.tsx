import { WS } from "@/lib/workspace/workspace-utils";

export interface TemplateItem {
  id: string;
  icon: string;
  name: string;
  description: string;
  onSelect?: () => void;
}

interface TemplateGridProps {
  templates: TemplateItem[];
  columns?: number;
}

export function TemplateGrid({ templates, columns = 4 }: TemplateGridProps) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: 10,
    }}>
      {templates.map(t => (
        <div
          key={t.id}
          onClick={t.onSelect}
          style={{
            padding: "14px 14px",
            background: WS.surface,
            border: `1px solid ${WS.border}`,
            borderRadius: 12,
            cursor: t.onSelect ? "pointer" : "default",
            transition: "border-color 120ms, transform 120ms",
          }}
          onMouseEnter={e => {
            if (t.onSelect) {
              (e.currentTarget as HTMLElement).style.borderColor = WS.accent;
            }
          }}
          onMouseLeave={e => {
            if (t.onSelect) {
              (e.currentTarget as HTMLElement).style.borderColor = WS.border;
            }
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 8 }}>{t.icon}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: WS.ink, marginBottom: 3 }}>
            {t.name}
          </div>
          <div style={{ fontSize: 11, color: WS.ink3, lineHeight: 1.4 }}>
            {t.description}
          </div>
        </div>
      ))}
    </div>
  );
}
