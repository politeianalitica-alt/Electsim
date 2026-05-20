"use client";

import { useEffect, useRef } from "react";
import type { AgentMessage as AgentMessageType } from "@/types/agent";
import { AgentMessage } from "./agent-message";

interface AgentConversationProps {
  messages: AgentMessageType[];
  isLoading: boolean;
}

export function AgentConversation({ messages, isLoading }: AgentConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isLoading]);

  if (messages.length === 0) {
    return (
 <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
 <p className="text-xs text-[#6e6e73] mb-2">Pregúntame sobre el workspace</p>
 <p className="text-[10px] text-[#8e8e93]">
          Usa modo Ejecutar para crear elementos · Analizar para resúmenes
 </p>
 </div>
    );
  }

  return (
 <div className="flex-1 overflow-y-auto px-3 py-2">
      {messages.map(msg => (
 <AgentMessage key={msg.id} message={msg} />
      ))}
 <div ref={bottomRef} />
 </div>
  );
}
