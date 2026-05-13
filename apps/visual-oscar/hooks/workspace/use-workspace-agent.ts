"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentMessage,
  AgentMode,
  AgentConversation,
  AgentContextSnapshot,
} from "@/types/agent";
import { agentOrchestrator } from "@/lib/workspace/agent-orchestrator";
import { agentStorage } from "@/lib/workspace/agent-storage";
import { generateId } from "@/lib/workspace/agent-utils";

interface UseWorkspaceAgentOptions {
  workspaceId: string;
  context: AgentContextSnapshot;
}

function makeEmptyConversation(workspaceId: string): AgentConversation {
  const now = new Date().toISOString();
  return {
    id: generateId("conv"),
    workspaceId,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function useWorkspaceAgent({ workspaceId, context }: UseWorkspaceAgentOptions) {
  const [conversation, setConversation] = useState<AgentConversation>(() =>
    makeEmptyConversation(workspaceId)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<AgentMode>("ask");
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted conversation on mount.
  useEffect(() => {
    const persisted = agentStorage.load(workspaceId);
    if (persisted && persisted.messages.length > 0) {
      setConversation(persisted);
    }
  }, [workspaceId]);

  // Persist on conversation changes.
  useEffect(() => {
    if (conversation.messages.length > 0) {
      agentStorage.save(conversation);
    }
  }, [conversation]);

  const sendMessage = useCallback(
    async (content: string, forcedMode?: AgentMode) => {
      if (!content.trim() || isLoading) return;
      const mode = forcedMode ?? activeMode;
      const userMessage: AgentMessage = {
        id: generateId("msg"),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        mode,
      };
      const placeholder: AgentMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        mode,
        isStreaming: true,
      };

      setConversation(prev => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        messages: [...prev.messages, userMessage, placeholder],
      }));
      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const response = await agentOrchestrator.handle({
          message: content,
          mode,
          context,
          history: conversation.messages,
          workspaceId,
          signal: abortRef.current.signal,
        });

        setConversation(prev => ({
          ...prev,
          updatedAt: new Date().toISOString(),
          messages: prev.messages.map(m =>
            m.id === placeholder.id ? { ...response, id: m.id, isStreaming: false } : m
          ),
        }));
      } catch (err) {
        setConversation(prev => ({
          ...prev,
          messages: prev.messages.map(m =>
            m.id === placeholder.id
              ? { ...m, content: "Error al procesar la solicitud.", isStreaming: false }
              : m
          ),
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [activeMode, context, conversation.messages, isLoading, workspaceId]
  );

  const clearConversation = useCallback(() => {
    agentStorage.clear(workspaceId);
    setConversation(makeEmptyConversation(workspaceId));
  }, [workspaceId]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    conversation,
    isLoading,
    activeMode,
    setActiveMode,
    sendMessage,
    clearConversation,
    stopStreaming,
  };
}
