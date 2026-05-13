/**
 * Sentry inicialización lazy.
 *
 * Si SENTRY_DSN no está configurado, todas las funciones son no-op.
 * Cuando configures SENTRY_DSN + instales `@sentry/nextjs`, las llamadas
 * a captureException / captureMessage empezarán a llegar a Sentry.
 */

let _sentry: any | null = null;
let _initialised = false;
let _loadFailed = false;

async function ensureLoaded(): Promise<any | null> {
  if (_initialised) return _sentry;
  _initialised = true;
  if (!process.env.SENTRY_DSN) return null;
  if (_loadFailed) return null;
  try {
    const sentryMod = "@sentry/nextjs";
    const mod: any = await import(/* webpackIgnore: true */ sentryMod);
    mod.init({
      dsn:                process.env.SENTRY_DSN,
      tracesSampleRate:   Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0),
      environment:        process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      enabled:            true,
    });
    _sentry = mod;
    return _sentry;
  } catch {
    _loadFailed = true;
    return null;
  }
}

export async function captureException(err: unknown, context?: Record<string, unknown>) {
  const sentry = await ensureLoaded();
  if (!sentry) return;
  sentry.captureException(err, context ? { extra: context } : undefined);
}

export async function captureMessage(msg: string, context?: Record<string, unknown>) {
  const sentry = await ensureLoaded();
  if (!sentry) return;
  sentry.captureMessage(msg, { extra: context });
}

export async function setUserContext(user: { id: string; email?: string; tenantId?: string } | null) {
  const sentry = await ensureLoaded();
  if (!sentry) return;
  sentry.setUser(user);
}
