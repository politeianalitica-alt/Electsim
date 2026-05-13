/**
 * Drizzle schema para la base de datos del Workspace.
 *
 * Esta definición es la fuente de verdad cuando provisionas Neon/Postgres:
 *   1. `npm i drizzle-orm postgres drizzle-kit`
 *   2. `npx drizzle-kit generate --schema=./lib/db/schema.ts --out=./drizzle`
 *   3. `npx drizzle-kit migrate` (apunta a tu DATABASE_URL)
 *
 * Mientras tanto, lib/db/client.ts hace un import lazy y la app sigue
 * funcionando con el repositorio mock cuando no hay DATABASE_URL.
 *
 * NOTA: Las imports de `drizzle-orm/pg-core` no fallan en runtime mientras
 * este archivo no se cargue (el cliente sólo lo importa dinámicamente).
 * En `tsconfig` está `ignoreBuildErrors:true` así que el build pasa.
 */

import { pgTable, text, timestamp, integer, jsonb, boolean, primaryKey, index } from "drizzle-orm/pg-core";

// ─── Tenancy ──────────────────────────────────────────────────────────
export const tenants = pgTable("tenants", {
  id:        text("id").primaryKey(),
  name:      text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Users (Clerk-managed) ─────────────────────────────────────────────
export const users = pgTable("users", {
  id:          text("id").primaryKey(),             // Clerk user_id
  email:       text("email").notNull().unique(),
  name:        text("name").notNull(),
  avatarUrl:   text("avatar_url"),
  tenantId:    text("tenant_id").references(() => tenants.id),
  createdAt:   timestamp("created_at",  { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
}, t => ({
  tenantIdx: index("users_tenant_idx").on(t.tenantId),
}));

// ─── Workspaces ────────────────────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id:          text("id").primaryKey(),
  tenantId:    text("tenant_id").notNull().references(() => tenants.id),
  name:        text("name").notNull(),
  description: text("description").default(""),
  mode:        text("mode").$type<"real" | "demo">().notNull().default("real"),
  sector:      text("sector"),
  tags:        jsonb("tags").$type<string[]>().default([]),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  tenantIdx: index("workspaces_tenant_idx").on(t.tenantId),
}));

// ─── Workspace membership + RBAC ───────────────────────────────────────
export const workspaceMembers = pgTable("workspace_members", {
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:        text("role").$type<"owner" | "admin" | "analyst" | "viewer">().notNull().default("analyst"),
  joinedAt:    timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  pk:       primaryKey({ columns: [t.workspaceId, t.userId] }),
  userIdx:  index("wm_user_idx").on(t.userId),
}));

// ─── Entidades operativas ─────────────────────────────────────────────
export const issues = pgTable("issues", {
  id:          text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title:       text("title").notNull(),
  summary:     text("summary").default(""),
  status:      text("status").$type<"open" | "monitoring" | "closed">().notNull().default("open"),
  severity:    text("severity").$type<"low" | "normal" | "high" | "critical">().notNull().default("normal"),
  ownerId:     text("owner_id").references(() => users.id),
  dueDate:     timestamp("due_date", { withTimezone: true }),
  metadata:    jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  wsIdx:       index("issues_ws_idx").on(t.workspaceId),
  statusIdx:   index("issues_status_idx").on(t.workspaceId, t.status),
}));

export const actions = pgTable("actions", {
  id:            text("id").primaryKey(),
  workspaceId:   text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  issueId:       text("issue_id").references(() => issues.id, { onDelete: "set null" }),
  title:         text("title").notNull(),
  priority:      text("priority").$type<"low" | "normal" | "high" | "critical">().notNull().default("normal"),
  status:        text("status").$type<"pending" | "in_progress" | "done">().notNull().default("pending"),
  responsibleId: text("responsible_id").references(() => users.id),
  dueDate:       timestamp("due_date", { withTimezone: true }).notNull(),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  wsIdx:     index("actions_ws_idx").on(t.workspaceId),
  dueIdx:    index("actions_due_idx").on(t.workspaceId, t.dueDate),
}));

export const documents = pgTable("documents", {
  id:          text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title:       text("title").notNull(),
  kind:        text("kind").notNull(),
  status:      text("status").$type<"draft" | "review" | "published" | "archived">().notNull().default("draft"),
  authorId:    text("author_id").references(() => users.id),
  blocks:      jsonb("blocks").$type<unknown[]>().default([]),
  summary:     text("summary").default(""),
  tags:        jsonb("tags").$type<string[]>().default([]),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  wsIdx: index("documents_ws_idx").on(t.workspaceId),
}));

export const projects = pgTable("projects", {
  id:          text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  client:      text("client").default(""),
  type:        text("type").notNull(),
  status:      text("status").$type<"active" | "paused" | "completed">().notNull().default("active"),
  progress:    integer("progress").notNull().default(0),
  riskLevel:   text("risk_level").$type<"low" | "normal" | "high" | "critical">().notNull().default("normal"),
  dueDate:     timestamp("due_date", { withTimezone: true }),
  metadata:    jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id:           text("id").primaryKey(),
  workspaceId:  text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title:        text("title").notNull(),
  score:        integer("score").notNull().default(0),
  impact:       text("impact").default("medio"),
  confidence:   integer("confidence").notNull().default(50),  // 0-100
  horizon:      text("horizon").default("week"),
  category:     text("category").default("General"),
  rationale:    text("rationale").default(""),
  actionsJson:  jsonb("actions").$type<unknown[]>().default([]),
  source:       text("source").$type<"ollama" | "mock" | "human">().notNull().default("mock"),
  archived:     boolean("archived").notNull().default(false),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Auditoría ────────────────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id:          text("id").primaryKey(),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  userId:      text("user_id").references(() => users.id),
  action:      text("action").notNull(),   // e.g. "doc.publish", "radar.regenerate"
  target:      text("target"),             // e.g. "doc_001"
  metadata:    jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  wsIdx: index("audit_ws_idx").on(t.workspaceId, t.createdAt),
}));
