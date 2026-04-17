/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Nunito'", "sans-serif"],
      },
      colors: {
        // Brand — Peach × Cocoa DA.
        // Legacy names (grape / bubblegum / lemon) retained so existing class
        // references still compile, but values now live in the warm peach family.
        brand: {
          grape: "#EA580C",         // ember (primary) — ex-purple
          "grape-light": "#FDBA74", // apricot (ex grape-light)
          bubblegum: "#FB923C",     // peach (secondary)
          peach: "#FB923C",
          apricot: "#FDBA74",
          ember: "#EA580C",
          honey: "#FCD34D",
          lemon: "#FCD34D",
          cocoa: "#3F2817",
          "cocoa-deep": "#1A0D06",
          "cocoa-soft": "#D4B896",
          mint: "#34D399",
          sky: "#38BDF8",
        },
        text: {
          primary: "#1F1612",
          secondary: "#6B5E57",
          tertiary: "#9B8B81",
          muted: "#B8A89C",
        },
        surface: {
          white: "#FFFFFF",
          light: "#FFF8F1",
          subtle: "#FEF3E7",
          input: "#FBF1E5",
        },
        border: {
          DEFAULT: "#F3E4D4",
          strong: "#EADAC4",
        },
        status: {
          success: "#34D399",
          "success-bg": "#ECFDF5",
          warning: "#FCD34D",
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
        card: "0 2px 12px rgba(234, 88, 12, 0.08)",
        float: "0 8px 30px rgba(234, 88, 12, 0.12)",
        dropdown: "0 4px 16px rgba(234, 88, 12, 0.15)",
        hero: "0 8px 30px rgba(234, 88, 12, 0.25)",
        glow: "0 0 20px rgba(234, 88, 12, 0.20)",
      },
    },
  },
  plugins: [],
};
