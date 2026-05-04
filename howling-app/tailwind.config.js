/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e14",
        "bg-elevated": "#131820",
        "bg-card": "#1a2030",
        "bg-hover": "#232a3d",
        border: "#2a3245",
        "border-soft": "#1f2638",
        text: "#e8ecf2",
        "text-soft": "#8b95a8",
        "text-dim": "#5a6478",
        accent: "#00e5b4",
        "accent-deep": "#00b890",
        warning: "#ffb84d",
        danger: "#ff4d6d",
        gold: "#ffd700",
        "rank-iron": "#5a4a3f",
        "rank-bronze": "#cd7f32",
        "rank-silver": "#b8c5d0",
        "rank-gold": "#ffd700",
        "rank-plat": "#5fc9c9",
        "rank-diamond": "#5b8def",
        "rank-master": "#c264f5",
        "rank-gm": "#ff5c8a",
        "rank-chal": "#ffeb3b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
