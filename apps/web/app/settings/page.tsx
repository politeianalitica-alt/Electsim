"use client";

import { useState } from "react";
import { User, Bell, Shield, Palette, Globe, Keyboard, Save, Check } from "lucide-react";

const TABS = [
  { id: "perfil",         label: "Perfil",           icon: User },
  { id: "notificaciones", label: "Notificaciones",   icon: Bell },
  { id: "apariencia",     label: "Apariencia",       icon: Palette },
  { id: "idioma",         label: "Idioma & región",  icon: Globe },
  { id: "atajos",         label: "Atajos de teclado",icon: Keyboard },
  { id: "seguridad",      label: "Seguridad",        icon: Shield }
];

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
        </div>
      </div>
    </div>
  );
}
