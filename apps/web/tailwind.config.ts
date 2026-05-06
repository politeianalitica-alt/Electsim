import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#080C14",
        bg2: "#0D1320",
        bg3: "#111827",
        border1: "#1E293B",
        cyan1: "#00D4FF",
        cyan2: "#22D3EE",
        blue1: "#3B82F6",
        purple1: "#8B5CF6",
        text1: "#E2E8F0",
        text2: "#94A3B8",
        muted: "#475569",
        green1: "#10B981",
        amber1: "#F59E0B",
        red1: "#EF4444",
        party: {
          pp: "#009FDB",
          psoe: "#E30613",
          vox: "#63BE21",
          sumar: "#E4007C",
          podemos: "#6A2E74",
          junts: "#00AEEF",
          pnv: "#007A3D",
          erc: "#F4B20A",
          bildu: "#A9C55A",
          bng: "#73C6E0"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"]
      },
      animation: {
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "pulse-cyan": "pulseCyan 2s ease-in-out infinite",
        "ticker": "tickerScroll 60s linear infinite",
        "shimmer": "shimmer 2s linear infinite",
        "count-up": "countUp 0.8s ease-out"
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseCyan: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(0,212,255,0.6)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0,212,255,0)" }
        },
        tickerScroll: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        countUp: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        }
      },
      boxShadow: {
        "premium": "0 4px 24px rgba(0,0,0,.4), 0 1px 0 rgba(255,255,255,.04) inset",
        "cyan-glow": "0 0 0 1px rgba(0,212,255,.3), 0 0 20px rgba(0,212,255,.2)"
      }
    }
  },
  plugins: []
};

export default config;
