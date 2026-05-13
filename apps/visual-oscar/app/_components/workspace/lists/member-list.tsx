import { WS, memberStatusColor } from "@/lib/workspace/workspace-utils";
import type { WorkspaceMember } from "@/types/workspace";

const STATUS_LABEL: Record<string, string> = {
  online: "Activo",
  busy: "Ocupado",
  offline: "Desconectado",
};

interface MemberListProps {
  members: WorkspaceMember[];
  showFocus?: boolean;
}

export function MemberList({ members, showFocus = true }: MemberListProps) {
  if (members.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: WS.ink3, fontSize: 12 }}>
        Sin miembros en el equipo
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {members.map(member => (
        <div key={member.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "6px 8px", borderRadius: 9,
        }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: WS.surface3,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: WS.ink2,
            }}>
              {member.initials}
            </div>
            <span style={{
              position: "absolute", bottom: 0, right: 0,
              width: 8, height: 8, borderRadius: "50%",
              background: memberStatusColor(member.status),
              border: `1.5px solid ${WS.bg}`,
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: WS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {member.name}
            </div>
            {showFocus && member.currentFocus ? (
              <div style={{ fontSize: 10.5, color: WS.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: WS.accent, marginRight: 4 }}>▸</span>
                {member.currentFocus}
              </div>
            ) : (
              <div style={{ fontSize: 10.5, color: WS.ink3 }}>{member.role}</div>
            )}
          </div>
          <span style={{
            fontSize: 9.5, fontWeight: 600,
            color: memberStatusColor(member.status),
            background: `${memberStatusColor(member.status)}18`,
            padding: "2px 7px", borderRadius: 99,
          }}>
            {STATUS_LABEL[member.status ?? "offline"]}
          </span>
        </div>
      ))}
    </div>
  );
}
