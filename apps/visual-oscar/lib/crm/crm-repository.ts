import type { PoliticalActor } from "@/types/crm";
import { actorsMockData, crmIssues } from "./crm-mock-data";

export const crmRepository = {
  listActors(workspaceId: string): PoliticalActor[] {
    return actorsMockData.filter(a => a.workspaceId === workspaceId);
  },
  getActorById(actorId: string): PoliticalActor | null {
    return actorsMockData.find(a => a.id === actorId) ?? null;
  },
  getIssues() {
    return crmIssues;
  },
};
