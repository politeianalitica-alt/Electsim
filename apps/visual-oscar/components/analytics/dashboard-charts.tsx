"use client";

import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { WS } from "@/lib/workspace/workspace-utils";
import type {
  BarPoint, PiePoint, SeriesPoint,
} from "@/lib/workspace/analytics-builder";

const tooltipStyle: React.CSSProperties = {
  background: "#0f0f15",
  border: `1px solid ${WS.border}`,
  borderRadius: 8,
  fontSize: 11,
  color: WS.ink,
  padding: "6px 9px",
};

function ChartShell({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: WS.surface,
        border: `1px solid ${WS.border}`,
        borderRadius: 14,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 260,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: WS.ink2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {title}
        </div>
        {hint && <div style={{ fontSize: 10.5, color: WS.ink3 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1, minHeight: 200 }}>{children}</div>
    </div>
  );
}

export function BarBlock({ title, hint, data }: { title: string; hint?: string; data: BarPoint[] }) {
  return (
    <ChartShell title={title} hint={hint}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: WS.ink2 }} axisLine={{ stroke: WS.border }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: WS.ink3 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? WS.accent} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function PieBlock({ title, hint, data }: { title: string; hint?: string; data: PiePoint[] }) {
  return (
    <ChartShell title={title} hint={hint}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.color} stroke="transparent" />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 4 }}>
        {data.map(d => (
          <span key={d.name} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: WS.ink2 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
            {d.name} · {d.value}
          </span>
        ))}
      </div>
    </ChartShell>
  );
}

export function ActivityArea({ data }: { data: SeriesPoint[] }) {
  return (
    <ChartShell title="Actividad 14 días" hint="issues · acciones · alertas">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff453a" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ff453a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAct" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f7df2" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#4f7df2" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAlt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd60a" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ffd60a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: WS.ink3 }} axisLine={{ stroke: WS.border }} tickLine={false}
            tickFormatter={(d: string) => d.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: WS.ink3 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="issues"  stroke="#ff453a" fill="url(#gradIss)" strokeWidth={2} />
          <Area type="monotone" dataKey="actions" stroke="#4f7df2" fill="url(#gradAct)" strokeWidth={2} />
          <Area type="monotone" dataKey="alerts"  stroke="#ffd60a" fill="url(#gradAlt)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
