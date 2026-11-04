import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f8fe",
          100: "#cde2fb",
          200: "#9ec5f4",
          500: "#2a78d6",
          600: "#256abf",
          700: "#184f95",
        },
        // Status tokens are reserved for state, never reused as a chart series colour.
        status: {
          good: "#0ca30c",
          warning: "#fab219",
          serious: "#ec835a",
          critical: "#d03b3b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
