import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcd9ff",
          300: "#8ec1ff",
          400: "#599dff",
          500: "#3377f6",
          600: "#1f57e0",
          700: "#1a44b4",
          800: "#1b3b90",
          900: "#1c3672",
        },
      },
    },
  },
  plugins: [],
};

export default config;
