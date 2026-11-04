import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f6ff",
          100: "#e7ebff",
          500: "#5b5bf6",
          600: "#4646d9",
          700: "#3737ad",
        },
      },
    },
  },
  plugins: [],
};

export default config;
