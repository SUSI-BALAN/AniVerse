import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        foreground: "var(--text-primary)",
        muted: "var(--text-secondary)",
        accent: "var(--accent)",
        "accent-secondary": "var(--accent-secondary)",
        outline: "var(--border)",
        danger: "var(--danger)",
        success: "var(--success)",
        aniverse: {
          void: "var(--background)",
          panel: "var(--surface)",
          glass: "var(--surface-glass)",
          violet: "var(--accent)",
          magenta: "var(--accent-warm)",
          cyan: "var(--accent-secondary)",
          text: "var(--text-primary)",
          muted: "var(--text-secondary)"
        }
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        card: "var(--shadow-card)"
      },
      maxWidth: {
        page: "90rem"
      }
    }
  },
  plugins: []
} satisfies Config;
