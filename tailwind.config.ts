import type { Config } from "tailwindcss";

// Airbnb design system (DESIGN-airbnb.md): white canvas, Rausch #ff385c accent,
// near-black ink, hairline borders, soft rounding, Inter as Cereal substitute.
// ponytail: existing semantic tokens (ink/muted/paper/teal) are repurposed to
// Airbnb values so the whole app re-themes with no per-component churn.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#222222",
        body: "#3f3f3f",
        muted: "#6a6a6a",
        "muted-soft": "#929292",
        paper: "#ffffff", // canvas
        surface: "#f7f7f7", // surface-soft
        "surface-strong": "#f2f2f2",
        hairline: "#dddddd",
        "hairline-soft": "#ebebeb",
        // teal = historic "primary" token, now Rausch so existing bg-teal CTAs re-theme.
        teal: "#ff385c",
        rausch: "#ff385c",
        "rausch-active": "#e00b41",
        ocean: "#2855a3",
        amber: "#cf8b21",
        coral: "#d85c46",
        mint: "#20875a"
      },
      boxShadow: {
        // Airbnb's single elevation tier.
        premium: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0",
        card: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0"
      }
    }
  },
  plugins: []
};

export default config;
