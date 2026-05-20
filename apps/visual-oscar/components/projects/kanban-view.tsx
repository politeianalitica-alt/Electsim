"use client";

import { memo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Project, ProjectTask, TaskStatus } from "@/types/project";
import {
  KANBAN_COLUMNS,
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
} from "@/lib/projects/project-config";
import { projectRepository } from "@/lib/projects/project-repository";

export function KanbanView({ project }: { project: Project }) {
  const [active, setActive] = useState<ProjectTask | null>(null);
  const [_, forceUpdate] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const byStatus = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = project.tasks.filter(t => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, ProjectTask[]>
  );

  const handleDragStart = (e: DragStartEvent) => {
    const task = project.tasks.find(t => t.id === e.active.id);
    setActive(task ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e;
    setActive(null);
    if (!over) return;
    const targetStatus = over.id as TaskStatus;
    if (KANBAN_COLUMNS.includes(targetStatus)) {
      projectRepository.updateTaskStatus(project.id, a.id as string, targetStatus);
      forceUpdate(x => x + 1);
    }
  };

  return (
 <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
 <div className="flex h-full gap-3 overflow-x-auto p-4">
        {KANBAN_COLUMNS.map(status => (
 <KanbanColumn key={status} status={status} tasks={byStatus[status]} />
        ))}
 </div>
 <DragOverlay>{active && <KanbanCardInner task={active} isDragging />}</DragOverlay>
 </DndContext>
  );
}

function KanbanColumn({ status, tasks }: { status: TaskStatus; tasks: ProjectTask[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = TASK_STATUS_CONFIG[status];

  return (
 <div
      ref={setNodeRef}
      className={`flex w-64 flex-none flex-col rounded-xl border bg-slate-900 transition-colors ${
        isOver ? "border-indigo-500/50 bg-slate-800" : "border-slate-800"
      }`}
    >
 <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
 <div className="flex items-center gap-2">
 <div className="h-2 w-2 rounded-full" style={{ background: config.color }} />
 <span className="text-xs font-semibold text-slate-200">{config.label}</span>
 </div>
 <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{tasks.length}</span>
 </div>
 <div className="flex-1 overflow-y-auto p-2 space-y-2">
 <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
 <KanbanCard key={task.id} task={task} />
          ))}
 </SortableContext>
 </div>
 </div>
  );
}

function KanbanCard({ task }: { task: ProjectTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
 <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
 <KanbanCardInner task={task} />
 </div>
  );
}

const KanbanCardInner = memo(function KanbanCardInner({
  task,
  isDragging,
}: {
  task: ProjectTask;
  isDragging?: boolean;
}) {
  const priority = TASK_PRIORITY_CONFIG[task.priority];
  const overdue = new Date(task.endDate) < new Date() && task.status !== "done";
  return (
 <div
      className={`rounded-lg border bg-slate-950 p-2.5 cursor-grab active:cursor-grabbing select-none hover:border-slate-700 transition-colors ${
        isDragging ? "shadow-xl border-indigo-500/50" : "border-slate-800"
      }`}
    >
 <div className="flex items-start justify-between gap-2">
 <p className="text-xs font-medium text-slate-200 leading-snug flex-1">{task.title}</p>
 <span
          className="text-[9px] font-bold tracking-wider rounded px-1.5 py-0.5"
          style={{ background: `${priority.color}25`, color: priority.color }}
          title={priority.label}
        >
          {priority.label.slice(0, 3).toUpperCase()}
 </span>
 </div>
      {task.description && (
 <p className="mt-1 text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
      )}
 <div className="mt-2 flex items-center justify-between">
 <span className={`text-[10px] ${overdue ? "text-red-400 font-semibold" : "text-slate-500"}`}>
          {overdue ? "vencida " : ""}
          {new Date(task.endDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
 </span>
        {task.progress > 0 && (
 <div className="flex items-center gap-1.5">
 <div className="h-1 w-12 rounded-full bg-slate-800 overflow-hidden">
 <div className="h-full rounded-full bg-indigo-500" style={{ width: `${task.progress}%` }} />
 </div>
 <span className="text-[10px] text-slate-500">{task.progress}%</span>
 </div>
        )}
 </div>
      {task.status === "blocked" && task.blockerReason && (
 <p className="mt-1.5 text-[10px] text-red-400 leading-tight">Bloqueada: {task.blockerReason}</p>
      )}
 </div>
  );
});
