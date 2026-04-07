/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Nunito'", "sans-serif"],
      },
      colors: {
        brand: {
          grape: "#8B5CF6",
          "grape-light": "#A78BFA",
          bubblegum: "#F472B6",
          mint: "#34D399",
          lemon: "#FBBF24",
          sky: "#38BDF8",
        },
        text: {
          primary: "#1E1B4B",
          secondary: "#6B7280",
          tertiary: "#9CA3AF",
          muted: "#9CA3AF",
        },
        surface: {
          white: "#FFFFFF",
          light: "#FEFBFF",
          subtle: "#F5F3FF",
          input: "#EDE9FE",
        },
        border: {
          DEFAULT: "#E5E7EB",
          strong: "#C4B5FD",
        },
        status: {
          success: "#34D399",
          "success-bg": "#ECFDF5",
          warning: "#FBBF24",
          "warning-bg": "#FFFBEB",
          error: "#F87171",
          "error-bg": "#FEF2F2",
          info: "#38BDF8",
          "info-bg": "#EFF6FF",
        },
      },
      borderRadius: {
        pill: "100px",
        card: "20px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(139, 92, 246, 0.08)",
        float: "0 8px 30px rgba(139, 92, 246, 0.12)",
        dropdown: "0 4px 16px rgba(139, 92, 246, 0.15)",
        hero: "0 8px 30px rgba(139, 92, 246, 0.25)",
        glow: "0 0 20px rgba(139, 92, 246, 0.20)",
      },
    },
  },
  plugins: [],
};
