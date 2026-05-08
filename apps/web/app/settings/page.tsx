"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Bell, Shield, Palette, Globe, Keyboard, Save, Check, Cpu, GitMerge, Activity, Database, Zap, RefreshCw } from "lucide-react";

const TABS = [
  { id: "perfil",         label: "Perfil",           icon: User },
  { id: "notificaciones", label: "Notificaciones",   icon: Bell },
  { id: "apariencia",     label: "Apariencia",       icon: Palette },
  { id: "idioma",         label: "Idioma & región",  icon: Globe },
  { id: "atajos",         label: "Atajos de teclado",icon: Keyboard },
  { id: "seguridad",      label: "Seguridad",        icon: Shield },
  { id: "sistema",        label: "Estado del sistema", icon: Cpu },
  { id: "pipelines",      label: "Pipelines ETL",     icon: GitMerge },
  { id: "analytics",      label: "Analytics",         icon: Activity },
];

const INTEL_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";

interface SystemStatus {
  database?: { ok: boolean };
  modules?: Record<string, unknown>;
  llm?: { available: boolean; model: string; mode?: string };
  pipelines?: { healthy: number; degraded: number; failed: number };
  sources?: { total: number; active: number; degraded: number; down: number };
  overall_ok?: boolean;
  mode?: string;
}
interface BrainStatus { available: boolean; model: string; mode: string }
interface Pipeline { nombre: string; estado: string; inicio: string; duracion_s: number | null; error?: string }
interface NowcastRow { fecha_estimacion?: string; partido_id?: number; estimacion_pct?: number; partido?: string }
interface PedersenRow { eleccion_actual?: string; volatilidad_total?: number; volatilidad_bloques?: number; volatilidad_interna?: number }

type SavedState = Record<string, boolean>;

export default function SettingsPage() {
  const [tab, setTab] = useState("perfil");
  const [saved, setSaved] = useState<SavedState>({});

  // Perfil
  const [nombre, setNombre] = useState("Ana López");
  const [cargo, setCargo] = useState("Analista Senior");
  const [org, setOrg] = useState("Politeia Analytics");
  const [email, setEmail] = useState("a.lopez@politeia.es");

  // Notificaciones
  const [notifs, setNotifs] = useState({
    alertasCriticas: true, alertasAltas: true, alertasMedias: false,
    briefingDiario: true, resumenSemanal: true, mencionesActores: false,
    sonido: false, desktop: true
  });

  // Apariencia
  const [densidad, setDensidad] = useState("normal");
  const [animaciones, setAnimaciones] = useState(true);
  const [ticker, setTicker] = useState(true);

  const saveSection = (section: string) => {
    setSaved(p => ({ ...p, [section]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [section]: false })), 2000);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-cyan1" : "bg-bg3 border border-border1"}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Configuración</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Preferencias</h1>
        <p className="text-text2 text-sm mt-1">Personaliza tu experiencia en la plataforma.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar de tabs */}
        <nav className="space-y-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                  active ? "bg-cyan1/10 text-cyan1 border border-cyan1/20" : "text-text2 hover:text-text1 hover:bg-bg3"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Contenido */}
        <div>
          {/* Perfil */}
          {tab === "perfil" && (
            <section className="premium-card space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Información de perfil</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-cyan1/10 border-2 border-cyan1/30 flex items-center justify-center text-xl font-bold text-cyan1">
                  AL
                </div>
                <div>
                  <p className="text-sm text-text1 font-medium">{nombre}</p>
                  <p className="text-xs text-text2 mt-0.5">{cargo} · {org}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Nombre completo", value: nombre, onChange: setNombre },
                  { label: "Cargo", value: cargo, onChange: setCargo },
                  { label: "Organización", value: org, onChange: setOrg },
                  { label: "Email", value: email, onChange: setEmail }
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs text-text2 mb-1.5 block">{f.label}</label>
                    <input
                      type="text"
                      value={f.value}
                      onChange={e => f.onChange(e.target.value)}
                      className="w-full px-3 py-2 bg-bg3 border border-border1 rounded-md text-sm text-text1 focus:border-cyan1 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => saveSection("perfil")}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan1 text-bg text-sm font-semibold hover:bg-cyan2 transition"
                >
                  {saved.perfil ? <><Check className="w-4 h-4" /> Guardado</> : <><Save className="w-4 h-4" /> Guardar cambios</>}
                </button>
              </div>
            </section>
          )}

          {/* Notificaciones */}
          {tab === "notificaciones" && (
            <section className="premium-card space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Notificaciones</h2>

              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Alertas</h3>
                  <div className="space-y-3">
                    {[
                      { key: "alertasCriticas", label: "Alertas críticas",         desc: "Siempre visible en tiempo real" },
                      { key: "alertasAltas",    label: "Alertas altas",            desc: "Notificación inmediata" },
                      { key: "alertasMedias",   label: "Alertas medias",           desc: "Resumen cada hora" },
                      { key: "mencionesActores",label: "Menciones de actores seguidos", desc: "Cuando aparecen en noticias o alertas" }
                    ].map(n => (
                      <div key={n.key} className="flex items-center justify-between py-2 border-b border-border1/50">
                        <div>
                          <div className="text-sm text-text1">{n.label}</div>
                          <div className="text-xs text-muted mt-0.5">{n.desc}</div>
                        </div>
                        <Toggle
                          value={notifs[n.key as keyof typeof notifs] as boolean}
                          onChange={v => setNotifs(p => ({ ...p, [n.key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Resúmenes</h3>
                  <div className="space-y-3">
                    {[
                      { key: "briefingDiario",  label: "Briefing matinal",     desc: "Cada día a las 07:30" },
                      { key: "resumenSemanal",  label: "Resumen semanal",      desc: "Viernes a las 17:00" }
                    ].map(n => (
                      <div key={n.key} className="flex items-center justify-between py-2 border-b border-border1/50">
                        <div>
                          <div className="text-sm text-text1">{n.label}</div>
                          <div className="text-xs text-muted mt-0.5">{n.desc}</div>
                        </div>
                        <Toggle
                          value={notifs[n.key as keyof typeof notifs] as boolean}
                          onChange={v => setNotifs(p => ({ ...p, [n.key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Canal</h3>
                  <div className="space-y-3">
                    {[
                      { key: "desktop", label: "Notificaciones escritorio", desc: "Requiere permiso del navegador" },
                      { key: "sonido",  label: "Sonido",                    desc: "Para alertas críticas" }
                    ].map(n => (
                      <div key={n.key} className="flex items-center justify-between py-2 border-b border-border1/50">
                        <div>
                          <div className="text-sm text-text1">{n.label}</div>
                          <div className="text-xs text-muted mt-0.5">{n.desc}</div>
                        </div>
                        <Toggle
                          value={notifs[n.key as keyof typeof notifs] as boolean}
                          onChange={v => setNotifs(p => ({ ...p, [n.key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => saveSection("notificaciones")}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan1 text-bg text-sm font-semibold hover:bg-cyan2 transition"
              >
                {saved.notificaciones ? <><Check className="w-4 h-4" /> Guardado</> : <><Save className="w-4 h-4" /> Guardar</>}
              </button>
            </section>
          )}

          {/* Apariencia */}
          {tab === "apariencia" && (
            <section className="premium-card space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Apariencia</h2>

              <div>
                <label className="text-xs text-text2 mb-2 block">Tema</label>
                <div className="flex gap-3">
                  {["Oscuro (por defecto)", "Oscuro intenso", "Alto contraste"].map(t => (
                    <button
                      key={t}
                      className={`px-4 py-2 rounded-md text-xs border transition ${
                        t === "Oscuro (por defecto)"
                          ? "bg-cyan1/10 border-cyan1/40 text-cyan1"
                          : "bg-bg3 border-border1 text-text2 hover:text-text1"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-2">La plataforma opera siempre en modo oscuro para máxima legibilidad analítica.</p>
              </div>

              <div>
                <label className="text-xs text-text2 mb-2 block">Densidad de la interfaz</label>
                <div className="flex gap-3">
                  {["compacta", "normal", "espaciada"].map(d => (
                    <button
                      key={d}
                      onClick={() => setDensidad(d)}
                      className={`px-4 py-2 rounded-md text-xs border transition capitalize ${
                        densidad === d
                          ? "bg-cyan1/10 border-cyan1/40 text-cyan1"
                          : "bg-bg3 border-border1 text-text2 hover:text-text1"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border1/50">
                  <div>
                    <div className="text-sm text-text1">Animaciones</div>
                    <div className="text-xs text-muted mt-0.5">Transiciones y efectos de entrada</div>
                  </div>
                  <Toggle value={animaciones} onChange={setAnimaciones} />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border1/50">
                  <div>
                    <div className="text-sm text-text1">Ticker de noticias</div>
                    <div className="text-xs text-muted mt-0.5">Banda de noticias en tiempo real en la Home</div>
                  </div>
                  <Toggle value={ticker} onChange={setTicker} />
                </div>
              </div>

              <button
                onClick={() => saveSection("apariencia")}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan1 text-bg text-sm font-semibold hover:bg-cyan2 transition"
              >
                {saved.apariencia ? <><Check className="w-4 h-4" /> Guardado</> : <><Save className="w-4 h-4" /> Guardar</>}
              </button>
            </section>
          )}

          {/* Atajos */}
          {tab === "atajos" && (
            <section className="premium-card space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Atajos de teclado</h2>
              <div className="space-y-2">
                {[
                  { action: "Abrir Command Palette",    keys: ["⌘", "K"] },
                  { action: "Ir al Home",               keys: ["G", "H"] },
                  { action: "Ir a Briefings",           keys: ["G", "B"] },
                  { action: "Ir a Alertas",             keys: ["G", "A"] },
                  { action: "Ir al Brain",              keys: ["G", "N"] },
                  { action: "Ir al Workspace",          keys: ["G", "W"] },
                  { action: "Nueva búsqueda",           keys: ["⌘", "/"] },
                  { action: "Cerrar modal / palette",   keys: ["Esc"] },
                  { action: "Navegar resultados",       keys: ["↑", "↓"] },
                  { action: "Seleccionar resultado",    keys: ["↵"] }
                ].map(s => (
                  <div key={s.action} className="flex items-center justify-between py-2.5 border-b border-border1/40">
                    <span className="text-sm text-text2">{s.action}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span key={i} className="px-2 py-0.5 bg-bg3 border border-border1 rounded text-xs font-mono text-text1">{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Idioma */}
          {tab === "idioma" && (
            <section className="premium-card space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Idioma & región</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-text2 mb-1.5 block">Idioma de la interfaz</label>
                  <select className="w-full bg-bg3 border border-border1 rounded-md px-3 py-2 text-sm text-text1 focus:border-cyan1 focus:outline-none">
                    <option>Español (España)</option>
                    <option>English (US)</option>
                    <option>Català</option>
                    <option>Euskara</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text2 mb-1.5 block">Zona horaria</label>
                  <select className="w-full bg-bg3 border border-border1 rounded-md px-3 py-2 text-sm text-text1 focus:border-cyan1 focus:outline-none">
                    <option>Europe/Madrid (CET/CEST)</option>
                    <option>UTC</option>
                    <option>America/New_York</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text2 mb-1.5 block">Formato de fecha</label>
                  <div className="flex gap-3">
                    {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map(f => (
                      <button key={f} className={`px-3 py-2 rounded-md text-xs border transition font-mono ${f === "DD/MM/YYYY" ? "bg-cyan1/10 border-cyan1/40 text-cyan1" : "bg-bg3 border-border1 text-text2"}`}>{f}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => saveSection("idioma")}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan1 text-bg text-sm font-semibold hover:bg-cyan2 transition"
              >
                {saved.idioma ? <><Check className="w-4 h-4" /> Guardado</> : <><Save className="w-4 h-4" /> Guardar</>}
              </button>
            </section>
          )}

          {/* Seguridad */}
          {tab === "seguridad" && (
            <section className="premium-card space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Seguridad</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green1/5 border border-green1/20 rounded-lg">
                  <div>
                    <div className="text-sm font-semibold text-text1">Sesión activa</div>
                    <div className="text-xs text-muted mt-0.5">Madrid · Chrome · Hace 2 horas</div>
                  </div>
                  <span className="badge badge-green">Activa</span>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Autenticación</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border1/50">
                      <div>
                        <div className="text-sm text-text1">Autenticación de dos factores (2FA)</div>
                        <div className="text-xs text-muted mt-0.5">App de autenticación configurada</div>
                      </div>
                      <span className="badge badge-green">Activo</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border1/50">
                      <div>
                        <div className="text-sm text-text1">Alertas de inicio de sesión</div>
                        <div className="text-xs text-muted mt-0.5">Email al detectar nuevo dispositivo</div>
                      </div>
                      <span className="badge badge-green">Activo</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Contraseña</h3>
                  <button className="px-4 py-2 rounded-md bg-bg3 border border-border1 text-sm text-text2 hover:text-text1 transition">
                    Cambiar contraseña
                  </button>
                </div>
              </div>
            </section>
          )}

          {tab === "sistema"   && <SistemaTab/>}
          {tab === "pipelines" && <PipelinesTab/>}
          {tab === "analytics" && <AnalyticsTab/>}

        </div>
      </div>
    </div>
  );
}

// ── Tab: Sistema ─────────────────────────────────────────────────────────────
function SistemaTab() {
  const { data: sys, refetch: refetchSys, isFetching: sysFetching } = useQuery<SystemStatus>({
    queryKey: ["system", "status"],
    queryFn: () => fetch(`${INTEL_BASE}/api/system/status`).then(r => r.json())
      .catch(() => ({ database: { ok: false }, modules: {}, llm: { available: false, model: "demo" },
        sources: { total: 0, active: 0, degraded: 0, down: 0 },
        pipelines: { healthy: 0, degraded: 0, failed: 0 }, overall_ok: false, mode: "fallback" })),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const { data: brain } = useQuery<BrainStatus>({
    queryKey: ["brain", "status"],
    queryFn: () => fetch(`${INTEL_BASE}/api/brain/status`).then(r => r.json())
      .catch(() => ({ available: false, model: "demo", mode: "fallback" })),
    staleTime: 30_000,
  });

  const ok = sys?.overall_ok ?? false;
  const mode = sys?.mode ?? "fallback";
  const modeBadge = mode === "real" ? "badge-green" : mode === "demo" ? "badge-amber" : "badge-red";
  const modeLabel = mode === "real" ? "Tiempo real" : mode === "demo" ? "Modo demo" : "Fallback";
  const modules = sys?.modules ?? {};
  const sources = sys?.sources ?? { total: 0, active: 0, degraded: 0, down: 0 };
  const pipelines = sys?.pipelines ?? { healthy: 0, degraded: 0, failed: 0 };
  const totalSrc = Math.max(1, sources.total);

  return (
    <div className="space-y-6">
      <section className="premium-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Estado general</h2>
          <button
            onClick={() => refetchSys()}
            className="px-3 py-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sysFetching ? "animate-spin" : ""}`}/> Actualizar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${ok ? "bg-green1" : "bg-red1"} ${sysFetching ? "animate-pulse" : ""}`}/>
          <span className="text-base font-bold text-text1">{ok ? "Sistemas operativos" : "Atención requerida"}</span>
          <span className={`badge ${modeBadge}`}>{modeLabel}</span>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text2">Componentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="premium-card">
            <div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-cyan1"/><h4 className="text-sm font-bold text-text1">Base de datos</h4></div>
            <span className={`badge ${sys?.database?.ok ? "badge-green" : "badge-red"}`}>
              {sys?.database?.ok ? "OK" : "Error"}
            </span>
          </div>
          <div className="premium-card">
            <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-amber1"/><h4 className="text-sm font-bold text-text1">LLM / Brain</h4></div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge ${brain?.available ? "badge-green" : "badge-red"}`}>
                {brain?.available ? "Activo" : "Inactivo"}
              </span>
              <span className="text-xs text-text2 font-mono">{brain?.model ?? "—"}</span>
              <span className="text-[10px] text-muted">· {brain?.mode ?? "—"}</span>
            </div>
          </div>
          <div className="premium-card">
            <div className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-blue1"/><h4 className="text-sm font-bold text-text1">Fuentes de medios</h4></div>
            <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
              <span className="text-text1 font-mono">{sources.total}</span>
              <span className="text-green1">{sources.active} activas</span>
              <span className="text-amber1">{sources.degraded} degradadas</span>
              <span className="text-red1">{sources.down} caídas</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-bg3">
              <div className="bg-green1" style={{ width: `${(sources.active / totalSrc) * 100}%` }}/>
              <div className="bg-amber1" style={{ width: `${(sources.degraded / totalSrc) * 100}%` }}/>
              <div className="bg-red1" style={{ width: `${(sources.down / totalSrc) * 100}%` }}/>
            </div>
          </div>
          <div className="premium-card">
            <div className="flex items-center gap-2 mb-2"><GitMerge className="w-4 h-4 text-green1"/><h4 className="text-sm font-bold text-text1">Pipelines</h4></div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="badge badge-green">{pipelines.healthy} saludables</span>
              <span className="badge badge-amber">{pipelines.degraded} degradados</span>
              <span className="badge badge-red">{pipelines.failed} fallidos</span>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">Módulos activos</h3>
        {Object.keys(modules).length === 0 ? (
          <p className="text-xs text-muted">No se detectaron módulos registrados.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.keys(modules).map(m => (
              <span key={m} className="badge badge-green">{m}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Tab: Pipelines ───────────────────────────────────────────────────────────
function PipelinesTab() {
  const { data: pipelines = [], isFetching, refetch } = useQuery<Pipeline[]>({
    queryKey: ["pipelines", "status"],
    queryFn: () => fetch(`${INTEL_BASE}/pipelines/status?limit=20`).then(r => r.json())
      .catch(() => ([
        { nombre: "media-ingestion",   estado: "COMPLETED", inicio: new Date(Date.now() - 2 * 60 * 60_000).toISOString(), duracion_s: 45 },
        { nombre: "narrative-pipeline",estado: "RUNNING",   inicio: new Date(Date.now() - 12 * 60_000).toISOString(),    duracion_s: null },
        { nombre: "nowcast-updater",   estado: "FAILED",    inicio: new Date(Date.now() - 60 * 60_000).toISOString(),     duracion_s: 12, error: "DB connection timeout" },
        { nombre: "persona-scorer",    estado: "COMPLETED", inicio: new Date(Date.now() - 4 * 60 * 60_000).toISOString(), duracion_s: 122 },
      ])),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const stateBadge = (s: string) => {
    if (s === "RUNNING")            return "badge-cyan";
    if (s === "COMPLETED")          return "badge-green";
    if (s === "FAILED" || s === "CRASHED") return "badge-red";
    return "badge-amber";
  };
  const stateDot = (s: string) => {
    if (s === "RUNNING")  return "bg-cyan1 animate-pulse";
    if (s === "COMPLETED") return "bg-green1";
    if (s === "FAILED" || s === "CRASHED") return "bg-red1";
    return "bg-amber1";
  };

  const timeAgo = (iso: string): string => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (diff < 60) return `hace ${diff} min`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`;
    return `hace ${Math.floor(diff / 1440)} d`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Monitor de pipelines</h2>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}/> Actualizar
        </button>
      </div>
      <div className="space-y-2">
        {pipelines.map((p, i) => (
          <div key={i} className="premium-card flex items-center gap-4 flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full ${stateDot(p.estado)} shrink-0`}/>
            <span className="text-sm font-mono text-text1 flex-1 min-w-0 truncate">{p.nombre}</span>
            <span className={`badge ${stateBadge(p.estado)}`}>{p.estado}</span>
            <span className="text-[11px] text-muted">{timeAgo(p.inicio)}</span>
            <span className="text-[11px] text-text2 font-mono">
              {p.duracion_s != null ? `${p.duracion_s}s` : "en ejecución"}
            </span>
            {p.error && (
              <div className="w-full mt-2 text-xs text-red1 truncate" title={p.error}>
                {p.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Party colors for nowcast bars ────────────────────────────────────────────
const PARTY_COLORS: Record<string, string> = {
  PP:      "#1F77FF",
  PSOE:    "#E03A3E",
  VOX:     "#5BC035",
  Sumar:   "#D81E5B",
  Junts:   "#00C2A8",
  ERC:     "#F4B400",
  PNV:     "#1D8042",
  Bildu:   "#A4D65E",
  Podemos: "#6E2A78",
  Cs:      "#EB6109",
  "Más País": "#2D9D4E",
};

function partyColor(name: string | undefined): string {
  if (!name) return "#00D4FF";
  const key = Object.keys(PARTY_COLORS).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? PARTY_COLORS[key] : "#00D4FF";
}

// ── Tab: Analytics ───────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { data: nowcast = [] } = useQuery<NowcastRow[]>({
    queryKey: ["analytics", "nowcast"],
    queryFn: () => fetch(`${INTEL_BASE}/analytics/nowcast`).then(r => r.json()).catch(() => []),
    staleTime: 5 * 60_000,
  });
  const { data: pedersen = [] } = useQuery<PedersenRow[]>({
    queryKey: ["analytics", "pedersen"],
    queryFn: () => fetch(`${INTEL_BASE}/analytics/pedersen`).then(r => r.json()).catch(() => []),
    staleTime: 5 * 60_000,
  });

  // Group nowcast by partido_id (or partido), pick latest fecha_estimacion per party
  const latestByParty: Record<string, NowcastRow> = {};
  for (const row of nowcast) {
    const key = String(row.partido_id ?? row.partido ?? "");
    if (!key) continue;
    if (!latestByParty[key] || (row.fecha_estimacion ?? "") > (latestByParty[key].fecha_estimacion ?? "")) {
      latestByParty[key] = row;
    }
  }
  const partiesSorted = Object.values(latestByParty)
    .sort((a, b) => (b.estimacion_pct ?? 0) - (a.estimacion_pct ?? 0))
    .slice(0, 12);

  const pedersenSorted = [...pedersen]
    .sort((a, b) => (b.eleccion_actual ?? "").localeCompare(a.eleccion_actual ?? ""))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Nowcasting electoral</h2>
        {partiesSorted.length === 0 ? (
          <div className="space-y-2">
            <span className="badge badge-amber">Sin datos disponibles</span>
            <p className="text-xs text-muted mt-2">Endpoint <code className="font-mono">/analytics/nowcast</code> sin datos calculados aún.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {partiesSorted.map((p, i) => {
              const pct = Math.max(0, Math.min(100, Number(p.estimacion_pct ?? 0)));
              const name = p.partido ?? `P${p.partido_id}`;
              const color = partyColor(name);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-24 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}/>
                    <span className="text-xs text-text1 font-mono truncate">{name}</span>
                  </div>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: `${color}22` }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }}/>
                  </div>
                  <span className="text-xs font-mono w-14 text-right" style={{ color }}>{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">
          Volatilidad electoral · Índice de Pedersen
        </h2>
        {pedersenSorted.length === 0 ? (
          <span className="badge badge-amber">Sin datos disponibles</span>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-text2">
              <tr>
                <th className="text-left py-2 font-medium">Elección</th>
                <th className="text-right py-2 font-medium">Volatilidad total</th>
                <th className="text-right py-2 font-medium">Entre bloques</th>
                <th className="text-right py-2 font-medium">Interna</th>
              </tr>
            </thead>
            <tbody>
              {pedersenSorted.map((p, i) => {
                const v = Number(p.volatilidad_total ?? 0);
                const cls = v > 15 ? "text-red1" : v > 8 ? "text-amber1" : "text-green1";
                return (
                  <tr key={i} className="border-t border-border1">
                    <td className="py-2 text-text1">{p.eleccion_actual ?? "—"}</td>
                    <td className={`py-2 text-right font-mono ${cls}`}>{v.toFixed(1)}</td>
                    <td className="py-2 text-right font-mono text-text2">{Number(p.volatilidad_bloques ?? 0).toFixed(1)}</td>
                    <td className="py-2 text-right font-mono text-text2">{Number(p.volatilidad_interna ?? 0).toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
