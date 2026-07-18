import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0e1a",
          panel: "#0f1623",
          border: "#1e2d45",
          green: "#00d084",
          cyan: "#00c8ff",
          yellow: "#ffd93d",
          red: "#ff6b6b",
          purple: "#b48eff",
          text: "#c9d1d9",
          muted: "#6e7681",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
