import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        muted: "#687188",
        paper: "#f6f7f2",
        teal: "#087f7a",
        ocean: "#2855a3",
        amber: "#cf8b21",
        coral: "#d85c46",
        mint: "#20875a"
      },
      boxShadow: {
        premium: "0 24px 70px rgba(20, 33, 61, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
