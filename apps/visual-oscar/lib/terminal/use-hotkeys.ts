"use client";

import { useEffect, useRef } from "react";

type Handler = (e: KeyboardEvent) => void;

interface KeyBinding {
  /** Combo simple ("?", "/", "esc") o secuencia "g 1". */
  combo: string;
  /** Si true, no se dispara mientras el foco esté en input/textarea. */
  ignoreInInputs?: boolean;
  handler: Handler;
}

const SEQ_TIMEOUT_MS = 800;

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function normKey(e: KeyboardEvent): string {
  const k = e.key.toLowerCase();
  if (k === "escape") return "esc";
  return k;
}

/**
 * Hook minimal de hotkeys con soporte para secuencias tipo "g 1".
 * Reemplaza la necesidad de una librería externa.
 */
export function useHotkeys(bindings: KeyBinding[]) {
  const bufferRef = useRef<string>("");
  const timerRef  = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = normKey(e);

      // Reset buffer on timeout
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => { bufferRef.current = ""; }, SEQ_TIMEOUT_MS);

      bufferRef.current = (bufferRef.current ? bufferRef.current + " " : "") + key;

      for (const b of bindings) {
        if (b.ignoreInInputs && isEditable(document.activeElement)) continue;
        if (b.combo === key || b.combo === bufferRef.current) {
          e.preventDefault();
          b.handler(e);
          bufferRef.current = "";
          return;
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindings]);
}
