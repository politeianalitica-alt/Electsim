"use client";

import type { AgentMessage as AgentMessageType } from "@/types/agent";
import { AgentCard } from "./agent-card";
import { AgentThinkingIndicator } from "./agent-thinking-indicator";

export function AgentMessage({ message }: { message: AgentMessageType }) {
  const isUser = message.role === "user";

  if (message.isStreaming && !message.content) {
    return <AgentThinkingIndicator />;
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`${isUser ? "max-w-[85%]" : "max-w-full"} space-y-2`}>
        {message.content && (
          <div
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
              isUser
                ? "bg-indigo-600 text-white"
                : "bg-[#f5f5f7] text-[#1d1d1f]"
            }`}
          >
            {message.content}
          </div>
        )}
        {message.cards && message.cards.length > 0 && (
          <div className="space-y-2">
            {message.cards.map((card, idx) => (
              <AgentCard key={card.id ?? idx} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
