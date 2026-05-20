"use client";

import { memo, useMemo, useState } from "react";
import type { Project, GanttViewMode } from "@/types/project";
import { GANTT_VIEW_CONFIG } from "@/lib/projects/project-config";

const VIEW_MODES: GanttViewMode[] = ["day", "week", "month", "quarter"];
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function dayDiff(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function buildColumns(start: Date, end: Date, mode: GanttViewMode): { date: Date; label: string; isToday: boolean; isWeekend: boolean }[] {
  const today = startOfDay(new Date());
  const cols: { date: Date; label: string; isToday: boolean; isWeekend: boolean }[] = [];
  const cur = new Date(start);

  if (mode === "day") {
    while (cur <= end) {
      cols.push({
        date: new Date(cur),
        label: String(cur.getDate()).padStart(2, "0"),
        isToday: cur.toDateString() === today.toDateString(),
        isWeekend: [0, 6].includes(cur.getDay()),
      });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (mode === "week") {
    while (cur <= end) {
      const week = Math.ceil(cur.getDate() / 7);
      cols.push({
        date: new Date(cur),
        label: `S${week} ${cur.getDate()} ${MONTHS_ES[cur.getMonth()]}`,
        isToday: Math.abs(dayDiff(today, cur)) < 7,
        isWeekend: false,
      });
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    while (cur <= end) {
      cols.push({
        date: new Date(cur),
        label: `${MONTHS_ES[cur.getMonth()]} ${cur.getFullYear()}`,
        isToday: cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear(),
        isWeekend: false,
      });
      if (mode === "quarter") cur.setMonth(cur.getMonth() + 3);
      else cur.setMonth(cur.getMonth() + 1);
    }
  }
  return cols;
}

export function GanttView({ project }: { project: Project }) {
  const [mode, setMode] = useState<GanttViewMode>("month");
  const columnWidth = GANTT_VIEW_CONFIG[mode].columnWidth;
  const rowHeight = 44;

  const start = useMemo(() => startOfDay(new Date(project.startDate)), [project.startDate]);
  const end = useMemo(() => startOfDay(new Date(project.endDate)), [project.endDate]);
  const columns = useMemo(() => buildColumns(start, end, mode), [start, end, mode]);
  const totalDays = Math.max(1, dayDiff(end, start));
  const totalWidth = columns.length * columnWidth;

  const dateToX = (d: Date) => {
    const days = dayDiff(d, start);
    return Math.max(0, (days / totalDays) * totalWidth);
  };

  const todayX = dateToX(startOfDay(new Date()));

  return (
 <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Controls */}
 <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
 <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {VIEW_MODES.map(m => (
 <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-[11px] transition-colors ${
                mode === m ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {GANTT_VIEW_CONFIG[m].label}
 </button>
          ))}
 </div>
 <div className="ml-auto flex gap-3">
          {project.phases.map(phase => (
 <div key={phase.id} className="flex items-center gap-1.5">
 <div className="h-2.5 w-2.5 rounded-sm" style={{ background: phase.color }} />
 <span className="text-[11px] text-slate-400">{phase.title}</span>
 </div>
          ))}
 </div>
 </div>

 <div className="flex flex-1 overflow-hidden">
        {/* Task labels */}
 <div className="w-56 flex-none border-r border-slate-800 overflow-y-auto">
 <div className="h-10 border-b border-slate-800 bg-slate-900 px-3 flex items-center">
 <span className="text-[11px] font-medium text-slate-400">Tarea</span>
 </div>
          {project.tasks.map(task => (
 <div
              key={task.id}
              style={{ height: rowHeight }}
              className="flex items-center border-b border-slate-800/50 px-3 hover:bg-slate-900/40 transition-colors"
            >
 <p className="truncate text-xs text-slate-300">{task.title}</p>
 </div>
          ))}
 </div>

        {/* Scrollable Gantt */}
 <div className="flex-1 overflow-auto">
 <div style={{ width: Math.max(totalWidth, 600), minWidth: "100%" }}>
            {/* Timeline header */}
 <div className="sticky top-0 z-10 flex h-10 border-b border-slate-800 bg-slate-950">
              {columns.map((c, i) => (
 <div
                  key={i}
                  style={{ width: columnWidth, flexShrink: 0 }}
                  className={`flex items-center justify-center border-r border-slate-800 text-[11px] ${
                    c.isToday ? "bg-indigo-500/10 text-indigo-400 font-semibold" : "text-slate-500"
                  } ${c.isWeekend ? "bg-slate-900/50" : ""}`}
                >
                  {c.label}
 </div>
              ))}
 </div>

 <div
              className="relative"
              style={{ height: project.tasks.length * rowHeight }}
            >
              {/* Today line */}
 <div
                className="absolute top-0 w-0.5 bg-indigo-500/60 z-10"
                style={{ left: todayX, height: "100%" }}
              />

              {/* Phase bands */}
              {project.phases.map(phase => {
                const left = dateToX(new Date(phase.startDate));
                const width = dateToX(new Date(phase.endDate)) - left;
                return (
 <div
                    key={phase.id}
                    className="absolute z-0"
                    style={{
                      left,
                      top: 0,
                      width: Math.max(width, 0),
                      height: "100%",
                      background: `${phase.color}10`,
                      borderLeft: `2px solid ${phase.color}30`,
                    }}
                  />
                );
              })}

              {/* Task bars */}
              {project.tasks.map((task, idx) => {
                const phase = project.phases.find(p => p.taskIds.includes(task.id));
                const phaseColor = phase?.color ?? "#6366f1";
                const left = dateToX(new Date(task.startDate));
                const width = Math.max(dateToX(new Date(task.endDate)) - left, 12);
                return (
 <TaskBar
                    key={task.id}
                    title={task.title}
                    status={task.status}
                    progress={task.progress}
                    blocked={task.status === "blocked"}
                    blockerReason={task.blockerReason}
                    left={left}
                    top={idx * rowHeight + 8}
                    width={width}
                    height={rowHeight - 16}
                    color={phaseColor}
                  />
                );
              })}

              {/* Milestone markers */}
              {project.milestones.map(m => {
                const left = dateToX(new Date(m.date));
                return <MilestoneMarker key={m.id} title={m.title} date={m.date} left={left} totalHeight={project.tasks.length * rowHeight} />;
              })}
 </div>
 </div>
 </div>
 </div>
 </div>
  );
}

const TaskBar = memo(function TaskBar({
  title,
  progress,
  blocked,
  blockerReason,
  left,
  top,
  width,
  height,
  color,
}: {
  title: string;
  status: string;
  progress: number;
  blocked: boolean;
  blockerReason?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
}) {
  return (
 <div
      className="absolute rounded cursor-pointer group z-[2]"
      style={{ left, top, width, height }}
      title={blocked && blockerReason ? `${title}\nBloqueado: ${blockerReason}` : title}
    >
 <div
        className="absolute inset-0 rounded"
        style={{ background: `${color}25`, border: `1px solid ${color}50` }}
      />
 <div
        className="absolute left-0 top-0 h-full rounded"
        style={{ width: `${progress}%`, background: `${color}50` }}
      />
      {width > 60 && (
 <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
 <span className="truncate text-[10px] font-medium" style={{ color }}>
            {title}
 </span>
 </div>
      )}
      {blocked && (
 <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-slate-950" />
      )}
 </div>
  );
});

const MilestoneMarker = memo(function MilestoneMarker({
  title,
  date,
  left,
  totalHeight,
}: {
  title: string;
  date: string;
  left: number;
  totalHeight: number;
}) {
  return (
 <div className="absolute z-[3]" style={{ left: left - 8, top: 0 }} title={`${title} · ${date}`}>
 <div
        className="absolute"
        style={{ left: 8, top: 0, width: 1, height: totalHeight, background: "#f5733066" }}
      />
 <div
        className="cursor-pointer shadow-lg"
        style={{
          width: 14,
          height: 14,
          background: "#f57330",
          transform: "rotate(45deg)",
          borderRadius: 2,
        }}
      />
 </div>
  );
});
