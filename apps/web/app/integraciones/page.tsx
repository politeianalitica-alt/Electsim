"use client";

import { Cloud, GitBranch, MessageSquare, FileText, Mail, Calendar, Database, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

const INTEGRATIONS = [
  { id: "gdrive",   name: "Google Drive",   icon: Cloud,        category: "Almacenamiento", desc: "Importa documentos y mantén sincronización", connected: false },
  { id: "gmail",    name: "Gmail",          icon: Mail,         category: "Correo",         desc: "Workflows email-to-task y triage", connected: false },
  { id: "gcal",     name: "Google Calendar",icon: Calendar,     category: "Calendario",     desc: "Agenda del equipo y eventos clave", connected: false },
  { id: "gdocs",    name: "Google Docs",    icon: FileText,     category: "Documentos",     desc: "Crear briefings directamente en Docs", connected: false },
  { id: "github",   name: "GitHub",         icon: GitBranch,    category: "Código",         desc: "Repos vinculados al workspace", connected: true },
  { id: "slack",    name: "Slack",          icon: MessageSquare,category: "Comunicación",   desc: "Notificaciones y comandos", connected: false },
  { id: "outlook",  name: "Outlook 365",    icon: Mail,         category: "Correo",         desc: "Microsoft 365 / Exchange", connected: false },
  { id: "notion",   name: "Notion",         icon: FileText,     category: "Notas",          desc: "Wiki interna del equipo", connected: false },
  { id: "postgres", name: "PostgreSQL",     icon: Database,     category: "Datos",          desc: "Conexión a base externa propia", connected: true }
];

export default function IntegracionesPage() {
  const connected = INTEGRATIONS.filter(i => i.connected).length;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Connect & sync</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Integraciones</h1>
        <p className="text-text2 text-sm mt-1">{connected} conectadas de {INTEGRATIONS.length} disponibles. Sincroniza tus fuentes de datos personales y de equipo.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map(i => {
          const Icon = i.icon;
          return (
            <div key={i.id} className="premium-card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-bg3 border border-border1 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-cyan1" />
                </div>
                {i.connected ? (
                  <span className="badge badge-green flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Conectado
                  </span>
                ) : (
                  <span className="badge bg-bg3 text-text2 border border-border1">Sin conectar</span>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">{i.category}</div>
                <h3 className="text-base font-bold text-text1">{i.name}</h3>
                <p className="text-xs text-text2 mt-1 leading-relaxed">{i.desc}</p>
              </div>
              <button className={`mt-auto px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                i.connected
                  ? "bg-bg3 border border-border1 text-text2 hover:text-text1"
                  : "bg-cyan1/10 border border-cyan1/30 text-cyan1 hover:bg-cyan1/20"
              }`}>
                {i.connected ? "Configurar" : "Conectar"}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Subir documento</h2>
        <div className="border-2 border-dashed border-border1 rounded-lg p-8 text-center hover:border-cyan1/40 transition cursor-pointer">
          <FileText className="w-10 h-10 text-cyan1/40 mx-auto mb-3" />
          <p className="text-text1 text-sm font-medium mb-1">Arrastra un documento o haz click para seleccionar</p>
          <p className="text-muted text-xs">PDF, DOCX, XLSX, CSV, TXT — máx 25 MB</p>
        </div>
      </section>
    </div>
  );
}
