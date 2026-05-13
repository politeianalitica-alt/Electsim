import type { ResearchSource, ResearchThread, SourceType, RssFeed, RssItem, KnowledgeItem } from "@/types/research";
import { researchMockData, rssFeedsMockData, rssItemsMockData, knowledgeBaseMockData } from "./research-mock-data";
import { generateId } from "@/lib/workspace/agent-utils";

export const researchRepository = {
  getThreads(workspaceId: string): ResearchThread[] {
    return researchMockData.filter(t => t.workspaceId === workspaceId);
  },
  getThreadById(threadId: string, workspaceId: string): ResearchThread | null {
    return researchMockData.find(t => t.id === threadId && t.workspaceId === workspaceId) ?? null;
  },
  createThread(workspaceId: string, title: string, query: string): ResearchThread {
    const now = new Date().toISOString();
    const thread: ResearchThread = {
      id: generateId("thread"),
      workspaceId,
      title,
      query,
      sources: [],
      syntheses: [],
      status: "active",
      tags: [],
      relatedIssueIds: [],
      createdAt: now,
      updatedAt: now,
    };
    researchMockData.push(thread);
    return thread;
  },
  addManualSource(threadId: string, content: string, type: SourceType, title?: string): ResearchSource {
    const source: ResearchSource = {
      id: generateId("src"),
      type,
      title: title ?? `${type} — ${new Date().toLocaleTimeString("es-ES")}`,
      content,
      tags: [],
      addedAt: new Date().toISOString(),
    };
    const thread = researchMockData.find(t => t.id === threadId);
    if (thread) {
      thread.sources.push(source);
      thread.updatedAt = source.addedAt;
    }
    return source;
  },
  getFeeds(workspaceId: string): RssFeed[] {
    return rssFeedsMockData.filter(f => f.workspaceId === workspaceId);
  },
  getItems(): RssItem[] {
    return [...rssItemsMockData];
  },
  getKnowledge(workspaceId: string): KnowledgeItem[] {
    return knowledgeBaseMockData.filter(k => k.workspaceId === workspaceId);
  },
};
