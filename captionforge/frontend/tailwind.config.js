/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#09090b", // Deep Vercel Zinc
        surface: {
          DEFAULT: "#121214",
          subtle: "#18181b",
          hover: "#222226",
          border: "#27272a",
        },
        brand: {
          DEFAULT: "#EDEDED",
          accent: "#0070F3",
          yellow: "#FFD700",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["GeistMono", "JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(255, 255, 255, 0.12)",
        "glow-accent": "0 0 25px -5px rgba(0, 112, 243, 0.35)",
        "glow-yellow": "0 0 25px -5px rgba(255, 215, 0, 0.3)",
      }
    },
  },
  plugins: [],
}
