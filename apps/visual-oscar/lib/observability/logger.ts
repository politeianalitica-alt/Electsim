/**
 * Logger estructurado mínimo, sin dependencias externas.
 *
 * Emite JSON cuando `LOG_FORMAT=json` (Vercel/producción) o texto plano
 * en desarrollo. Cada log incluye timestamp, nivel, mensaje y campos
 * extra.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const CURRENT = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;

function enabled(level: Level): boolean {
  return (LEVEL_RANK[level] ?? 20) >= (LEVEL_RANK[CURRENT] ?? 20);
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (!enabled(level)) return;
  const ts = new Date().toISOString();
  if (process.env.LOG_FORMAT === "json" || process.env.NODE_ENV === "production") {
    const payload = JSON.stringify({ ts, level, msg, ...fields });
    if (level === "error" || level === "warn") {
      // eslint-disable-next-line no-console
      console.error(payload);
    } else {
      // eslint-disable-next-line no-console
      console.log(payload);
    }
    return;
  }
  const parts = [ts, level.toUpperCase(), msg];
  if (fields) parts.push(JSON.stringify(fields));
  // eslint-disable-next-line no-console
  console.log(parts.join(" · "));
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit("debug", msg, fields),
  info:  (msg: string, fields?: Record<string, unknown>) => emit("info",  msg, fields),
  warn:  (msg: string, fields?: Record<string, unknown>) => emit("warn",  msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};

export function getLogger(scope: string) {
  return {
    debug: (msg: string, fields?: Record<string, unknown>) => logger.debug(`[${scope}] ${msg}`, fields),
    info:  (msg: string, fields?: Record<string, unknown>) => logger.info (`[${scope}] ${msg}`, fields),
    warn:  (msg: string, fields?: Record<string, unknown>) => logger.warn (`[${scope}] ${msg}`, fields),
    error: (msg: string, fields?: Record<string, unknown>) => logger.error(`[${scope}] ${msg}`, fields),
  };
}
