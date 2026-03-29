/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Manrope'", "sans-serif"],
      },
      colors: {
        brand: {
          amber: "#FFB800",
          orange: "#F66236",
          coral: "#F45C5A",
          teal: "#51B0B0",
          purple: "#6E69AC",
        },
        text: {
          primary: "#292935",
          secondary: "#54545D",
          tertiary: "#8E8E93",
          muted: "#999999",
        },
        surface: {
          white: "#FFFFFF",
          light: "#F9F9F9",
          subtle: "#F5F5F7",
          input: "#EEEEF0",
        },
        border: {
          DEFAULT: "#EAEAEB",
          strong: "#D4D4D7",
        },
        status: {
          success: "#4CAF50",
          "success-bg": "#E8F5E9",
          warning: "#FF9800",
          "warning-bg": "#FFF3E0",
          error: "#F45C5A",
          "error-bg": "#FFEBEE",
          info: "#2196F3",
          "info-bg": "#E3F2FD",
        },
      },
      borderRadius: {
        pill: "100px",
        card: "12px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0, 0, 0, 0.10)",
        float: "0 4px 12px rgba(0, 0, 0, 0.08)",
        dropdown: "0 4px 16px rgba(0, 0, 0, 0.18)",
        hero: "0 8px 30px rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
