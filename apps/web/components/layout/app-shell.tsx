"use client";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { CommandPaletteProvider } from "@/components/command/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 px-6 py-6 max-w-[1800px] w-full mx-auto animate-in">
            {children}
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
