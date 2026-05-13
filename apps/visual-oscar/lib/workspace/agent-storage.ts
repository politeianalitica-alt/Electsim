import type { AgentConversation } from "@/types/agent";

const KEY = (id: string) => `politeia_agent_conv_${id}`;

export const agentStorage = {
  save(conversation: AgentConversation) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY(conversation.workspaceId), JSON.stringify(conversation));
    } catch {
      // ignore quota / private mode
    }
  },
  load(workspaceId: string): AgentConversation | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY(workspaceId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear(workspaceId: string) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY(workspaceId));
  },
};
