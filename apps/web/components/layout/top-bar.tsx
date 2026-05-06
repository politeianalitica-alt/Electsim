"use client";

import { Search, Bell, User, Sparkles } from "lucide-react";
import { useCommandPalette } from "@/components/command/command-palette";

export function TopBar() {
  const { open } = useCommandPalette();

  return (
    <header className="h-14 border-b border-border1 bg-bg2/60 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center gap-4">
      {/* Workspace selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="label-cap">Workspace</span>
        <select className="bg-bg3 border border-border1 rounded px-3 py-1.5 text-sm text-text1 focus:border-cyan1 focus:outline-none">
          <option>España 2026</option>
          <option>Madrid 2025</option>
          <option>Comunicación corporativa</option>
        </select>
      </div>

      {/* Search trigger */}
      <button
        onClick={open}
        className="flex-1 max-w-md bg-bg3 border border-border1 rounded-md px-3 py-1.5 text-sm text-text2 hover:border-cyan1/40 transition flex items-center gap-2"
      >
        <Search className="w-4 h-4" />
        <span>Buscar comandos, páginas, actores...</span>
        <span className="ml-auto text-[10px] font-mono bg-bg2 border border-border1 px-1.5 py-0.5 rounded">⌘K</span>
      </button>

      <div className="flex-1" />

      {/* Brain shortcut */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-cyan1/10 text-cyan1 border border-cyan1/20 hover:bg-cyan1/20 transition">
        <Sparkles className="w-4 h-4" />
        <span className="hidden md:inline">Preguntar al Brain</span>
      </button>

      {/* Notifications */}
      <button className="relative p-1.5 rounded-md hover:bg-bg3 transition" aria-label="Notificaciones">
        <Bell className="w-4 h-4 text-text2" />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red1 animate-pulse-cyan" />
      </button>

      {/* User */}
      <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-bg3 transition">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan1 to-blue1 flex items-center justify-center text-xs font-bold text-bg">
          AL
        </div>
        <span className="hidden md:inline text-sm text-text2">Analista</span>
      </button>
    </header>
  );
}
