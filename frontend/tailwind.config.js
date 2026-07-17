/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ── Industrial cockpit palette ────────────────────────────── */
        surface: {
          DEFAULT: "#0f172a", // deepest slate
          light: "#1e293b",
          card: "#1a2332",
          border: "#2d3a4e",
          hover: "#243044",
        },
        accent: {
          primary: "#0ea5e9",   // sky blue – navigation & primary UI
          secondary: "#14b8a6", // teal   – secondary accents
          warning: "#f59e0b",   // amber  – urgent indicators
          danger: "#ef4444",    // red    – critical alerts
          coral: "#fb7185",     // coral  – soft danger variant
        },
        text: {
          primary: "#f1f5f9",
          muted: "#94a3b8",
          dim: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
