import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        apex: {
          50: "#f2f6ff",
          100: "#e1e9ff",
          200: "#c3d3ff",
          300: "#9bb3ff",
          400: "#6d8bff",
          500: "#3d5bfa",
          600: "#2740d6",
          700: "#1f31ac",
          800: "#1c2b86",
          900: "#1a266b",
          950: "#0f1640"
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5d9e2",
          300: "#b1b8c6",
          400: "#8690a4",
          500: "#667089",
          600: "#525a70",
          700: "#43495b",
          800: "#393e4c",
          900: "#1f2129"
        }
      }
    }
  },
  plugins: []
};

export default config;
