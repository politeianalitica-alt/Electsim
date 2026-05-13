"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/context/WorkspaceContext";

export function useCommandPalette() {
  const { isCommandPaletteOpen, openCommandPalette, closeCommandPalette } = useWorkspaceStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isCommandPaletteOpen ? closeCommandPalette() : openCommandPalette();
      }
      if (e.key === "Escape" && isCommandPaletteOpen) {
        closeCommandPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCommandPaletteOpen, openCommandPalette, closeCommandPalette]);

  return {
    isOpen: isCommandPaletteOpen,
    open:   openCommandPalette,
    close:  closeCommandPalette,
  };
}
