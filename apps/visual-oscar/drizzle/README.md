# Drizzle ORM — Workspace DB

Este directorio contiene la definición del schema y configuración para Drizzle ORM.
**Está fuera del path bundleado por Next.js** — sólo lo lee la CLI `drizzle-kit`.

## Activar persistencia real

1. **Provisiona la base de datos (Neon o cualquier Postgres):**
   ```bash
   export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
   ```

2. **Instala dependencias:**
   ```bash
   npm i drizzle-orm postgres
   npm i -D drizzle-kit
   ```

3. **Genera y aplica migraciones:**
   ```bash
   npx drizzle-kit generate --schema=./drizzle/schema.ts --out=./drizzle/migrations
   npx drizzle-kit migrate
   ```

4. **Configura Vercel** (Project Settings → Environment Variables):
   - `DATABASE_URL` — connection string
   - `DATABASE_POOL_SIZE` — opcional, default 10

5. **El cliente runtime** (`lib/db/client.ts`) detectará automáticamente la presencia
   de `DATABASE_URL` y empezará a usar Postgres. Si falta, todo cae al
   repositorio in-memory existente — la app sigue funcionando.

## Tablas

| Tabla              | Propósito                                              |
|--------------------|--------------------------------------------------------|
| tenants            | Cuentas/organizaciones cliente                         |
| users              | Usuarios sincronizados desde Clerk                     |
| workspaces         | Workspaces por tenant                                  |
| workspace_members  | Pertenencia + rol (owner/admin/analyst/viewer)         |
| issues             | Dossieres operativos                                   |
| actions            | Tareas accionables                                     |
| documents          | Briefings, notas, informes                             |
| projects           | Proyectos con timeline + riesgo                        |
| opportunities      | Salidas del Radar (Ollama o humanas)                   |
| audit_log          | Auditoría de acciones sensibles                        |
