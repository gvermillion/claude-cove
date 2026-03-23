import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Respect the OS/browser dark mode preference — no class toggle needed.
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // CSS-variable-backed tokens so Tailwind classes stay in sync with
        // the light/dark CSS custom properties defined in index.css.
        surface: {
          DEFAULT: "var(--color-bg)",
          elevated: "var(--color-bg-elevated)",
          card: "var(--color-bg-card)",
        },
        "on-surface": "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
        border: "var(--color-border)",
        accent: {
          DEFAULT: "var(--color-accent)",
          fg: "var(--color-accent-fg)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
