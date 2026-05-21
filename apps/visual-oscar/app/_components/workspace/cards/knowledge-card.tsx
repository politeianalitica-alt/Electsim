import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceCard, WsBadge } from "./workspace-card";
import type { WorkspaceKnowledgeItem } from "@/types/workspace";

const TYPE_LABEL: Record<string, string> = {
  actor: "Actor",
  law: "Ley",
  event: "Evento",
  narrative: "Narrativa",
  project: "Proyecto",
};

const TYPE_COLOR: Record<string, string> = {
  actor: WS.accent,
  law: WS.success,
  event: WS.warn,
  narrative: WS.danger,
  project: "#a78bfa",
};

interface KnowledgeCardProps {
  item: WorkspaceKnowledgeItem;
  onClick?: () => void;
}

export function KnowledgeCard({ item, onClick }: KnowledgeCardProps) {
  const typeColor = TYPE_COLOR[item.entityType] ?? WS.ink3;

  return (
 <WorkspaceCard onClick={onClick} hoverable={!!onClick}>
 <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: WS.ink, lineHeight: 1.3, marginBottom: 6 }}>
            {item.title}
 </div>
 <div style={{ fontSize: 11.5, color: WS.ink3, lineHeight: 1.45, marginBottom: 8 }}>
            {item.summary}
 </div>
 </div>
 </div>

 <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
 <WsBadge label={TYPE_LABEL[item.entityType]} color={typeColor} />
        {item.tags.slice(0, 3).map(tag => (
 <span key={tag} style={{ fontSize: 10.5, color: WS.ink3, background: WS.surface2, padding: "2px 8px", borderRadius: 99 }}>
            {tag}
 </span>
        ))}
 <div style={{ flex: 1 }} />
 <span style={{ fontSize: 10, color: WS.ink3 }}>
          {Math.round(item.confidence * 100)}% conf.
 </span>
 </div>
 </WorkspaceCard>
  );
}
