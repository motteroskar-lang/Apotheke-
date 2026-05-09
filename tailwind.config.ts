import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // APEX OS Design Tokens
        apex: {
          bg:          "#0A0A0B",
          surface:     "#111113",
          "surface-2": "#18181B",
          "surface-3": "#1C1C1F",
          border:      "#27272A",
          "border-subtle": "#1C1C1E",
          // Text
          "text-primary":   "#FAFAFA",
          "text-secondary": "#A1A1AA",
          "text-muted":     "#52525B",
          "text-disabled":  "#3F3F46",
          // Accents
          blue:   "#3B82F6",
          green:  "#22C55E",
          amber:  "#F59E0B",
          red:    "#EF4444",
          purple: "#A855F7",
          // Domain colors
          physical:   "#3B82F6",
          mental:     "#A855F7",
          financial:  "#22C55E",
          skills:     "#F59E0B",
          discipline: "#EF4444",
          vision:     "#06B6D4",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      animation: {
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(4px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
