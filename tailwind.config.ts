import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1a1f3a",
        gold: "#d4a04a",
      },
      fontFamily: {
        sans: ['Heebo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
