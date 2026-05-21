import { WS, contextItemTypeColor } from "@/lib/workspace/workspace-utils";
import { useWorkspaceStore } from "@/context/WorkspaceContext";
import { demoAgentContext } from "@/lib/workspace/mock-data";

export function WorkspaceContextBar() {
  const { contextItems } = useWorkspaceStore();
  const items = contextItems.length > 0 ? contextItems : demoAgentContext;

  if (items.length === 0) return null;

  return (
 <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 6px 6px 0",
      marginBottom: 16,
      flexWrap: "wrap",
    }}>
 <span style={{ fontSize: 10, color: WS.ink3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>
        Contexto:
 </span>
      {items.map(item => (
 <span key={item.id} style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 9px", borderRadius: 99,
          background: WS.surface2, border: `1px solid ${WS.border}`,
          fontSize: 11, color: WS.ink2, cursor: "pointer",
        }}>
 <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: contextItemTypeColor(item.type), flexShrink: 0,
          }} />
          {item.title}
 </span>
      ))}
 </div>
  );
}
