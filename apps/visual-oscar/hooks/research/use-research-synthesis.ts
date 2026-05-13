"use client";

import { useState, useCallback } from "react";
import type { ResearchSource, SynthesisType, ResearchSynthesis } from "@/types/research";

interface SynthesizeInput {
  sources: ResearchSource[];
  type: SynthesisType;
  query: string;
  workspaceContext: { workspaceName: string; activeIssues: string[] };
}

export function useResearchSynthesis() {
  const [isLoading, setIsLoading] = useState(false);
  const [completion, setCompletion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syntheses, setSyntheses] = useState<ResearchSynthesis[]>([]);

  const synthesize = useCallback(async (input: SynthesizeInput) => {
    setIsLoading(true);
    setCompletion("");
    setError(null);
    try {
      const res = await fetch("/api/research/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: input.sources.map(s => ({ title: s.title, content: s.content })),
          synthesisType: input.type,
          workspaceContext: input.workspaceContext,
          query: input.query,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        setError(text || `HTTP ${res.status}`);
        setIsLoading(false);
        return null;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setCompletion(full);
      }

      const synthesis: ResearchSynthesis = {
        id: `syn_${Date.now()}`,
        sourceIds: input.sources.map(s => s.id),
        type: input.type,
        content: full,
        entities: [],
        generatedAt: new Date().toISOString(),
        model: process.env.NEXT_PUBLIC_AI_MODEL ?? "ollama:llama3.2",
      };
      setSyntheses(prev => [synthesis, ...prev]);
      setIsLoading(false);
      return synthesis;
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
      return null;
    }
  }, []);

  return { synthesize, syntheses, completion, isLoading, error };
}
