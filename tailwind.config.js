/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5", // ayotka primary indigo
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        accent: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed", // ayotka violet accent
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        tka: {
          canvas: "#f8fafc",
          card: "#ffffff",
          subtle: "#f1f5f9",
          border: "#e2e8f0",
          borderSubtle: "#f1f5f9",
          textMain: "#0f172a",
          textMuted: "#475569",
          textDim: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        utilitarian: "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)",
        floating: "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};
