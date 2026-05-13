"use client";

import { useMemo } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { useWorkspaceAgent } from "@/hooks/workspace/use-workspace-agent";
import { useWorkspaceStore } from "@/context/WorkspaceContext";
import { AgentHeader } from "./agent/agent-header";
import { AgentContextBar } from "./agent/agent-context-bar";
import { AgentConversation } from "./agent/agent-conversation";
import { AgentQuickActions } from "./agent/agent-quick-actions";
import { AgentInput } from "./agent/agent-input";
import type { AgentContextSnapshot } from "@/types/agent";

interface WorkspaceAgentPanelProps {
  workspaceId: string;
}

export function WorkspaceAgentPanel({ workspaceId }: WorkspaceAgentPanelProps) {
  const { contextItems } = useWorkspaceStore();

  const context = useMemo<AgentContextSnapshot>(
    () => ({
      workspaceId,
      activeView: "overview",
      recentItems: contextItems,
    }),
    [workspaceId, contextItems]
  );

  const {
    conversation,
    isLoading,
    activeMode,
    setActiveMode,
    sendMessage,
    clearConversation,
    stopStreaming,
  } = useWorkspaceAgent({ workspaceId, context });

  return (
    <aside
      style={{
        width: WS.agentW,
        flexShrink: 0,
        borderLeft: `1px solid ${WS.border}`,
        background: "rgb(15 23 42)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: WS.ink,
      }}
    >
      <AgentHeader
        mode={activeMode}
        onModeChange={setActiveMode}
        onClear={clearConversation}
      />
      <AgentContextBar items={contextItems} />
      <AgentConversation messages={conversation.messages} isLoading={isLoading} />
      <AgentQuickActions
        onAction={(message, mode) => sendMessage(message, mode)}
        isLoading={isLoading}
      />
      <AgentInput
        onSend={msg => sendMessage(msg)}
        onStop={stopStreaming}
        isLoading={isLoading}
        mode={activeMode}
      />
    </aside>
  );
}
