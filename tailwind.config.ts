import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f2", 100: "#d6ecdf", 200: "#aed9c0", 300: "#7fc09c",
          400: "#52a578", 500: "#358a5e", 600: "#276e4b", 700: "#20573d",
          800: "#1c4632", 900: "#183a2b",
        },
      },
    },
  },
  plugins: [],
};
export default config;
