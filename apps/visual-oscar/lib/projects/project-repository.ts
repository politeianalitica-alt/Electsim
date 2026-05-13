import type { Project, TaskStatus } from "@/types/project";
import { projectsMockData } from "./projects-mock-data";

export const projectRepository = {
  list(workspaceId: string): Project[] {
    return projectsMockData.filter(p => p.workspaceId === workspaceId);
  },
  getProjectById(projectId: string, workspaceId: string): Project | null {
    return projectsMockData.find(p => p.id === projectId && p.workspaceId === workspaceId) ?? null;
  },
  updateTaskStatus(projectId: string, taskId: string, status: TaskStatus) {
    const proj = projectsMockData.find(p => p.id === projectId);
    if (!proj) return;
    const task = proj.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.status = status;
    task.updatedAt = new Date().toISOString();
  },
};
