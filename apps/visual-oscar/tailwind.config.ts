import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
  ],
  // El proyecto ya tiene un sistema de tokens CSS — Tailwind queda como capa
  // complementaria para el workspace (sprints 2+), sin sobreescribir lo existente.
  // Preflight desactivado para no resetear estilos del resto de la app.
  corePlugins: {
    preflight: false,
  },
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Mantenemos la paleta slate de los specs intacta (Tailwind ya la incluye)
        // y exponemos referencias a los tokens de Politeia para mezcla fluida.
        ink:        "var(--color-ink)",
        "ink-2":    "var(--color-ink-2)",
        "ink-3":    "var(--color-ink-3)",
        accent:     "var(--color-accent)",
        success:    "var(--color-success)",
        danger:     "var(--color-danger)",
        warn:       "var(--color-warn)",
        hairline:   "var(--color-hairline)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans:    ["var(--font-text)"],
        mono:    ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
