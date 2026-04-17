/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Nunito'", "sans-serif"],
      },
      colors: {
        // Brand — Solar Pop DA.
        // Modern vibrant orange + magenta + sun. Legacy names kept for
        // backward compat with existing class references.
        brand: {
          grape: "#FB6538",         // solar (primary)
          "grape-light": "#FFAF85", // apricot
          bubblegum: "#FF3C7A",     // magenta (secondary accent)
          magenta: "#FF3C7A",
          peach: "#FF8B5F",
          apricot: "#FFAF85",
          ember: "#FB6538",
          solar: "#FB6538",
          honey: "#FFC83D",
          sun: "#FFC83D",
          lemon: "#FFC83D",
          cocoa: "#FF3C7A",          // was cocoa, now magenta (kills brown)
          "cocoa-deep": "#1A0B18",   // night plum (banner bg)
          "cocoa-soft": "#FFC83D",   // sun yellow label
          plum: "#3C1329",
          mint: "#34D399",
          sky: "#38BDF8",
        },
        text: {
          primary: "#14131A",
          secondary: "#5C5963",
          tertiary: "#8F8B94",
          muted: "#C4C1CA",
        },
        surface: {
          white: "#FFFFFF",
          light: "#FAF7F4",
          subtle: "#FFF1EC",
          input: "#FBEDE4",
        },
        border: {
          DEFAULT: "#ECE9EE",
          strong: "#E0DCE5",
        },
        status: {
          success: "#FB6538",
          "success-bg": "#FFF1EC",
          warning: "#FFC83D",
          "warning-bg": "#FFFBEB",
          error: "#F87171",
          "error-bg": "#FEF2F2",
          info: "#FB6538",
          "info-bg": "#FFF1EC",
        },
      },
      borderRadius: {
        pill: "100px",
        card: "20px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(251, 101, 56, 0.10)",
        float: "0 8px 30px rgba(251, 101, 56, 0.15)",
        dropdown: "0 4px 16px rgba(251, 101, 56, 0.18)",
        hero: "0 12px 36px rgba(251, 101, 56, 0.30)",
        glow: "0 0 20px rgba(251, 101, 56, 0.25)",
      },
    },
  },
  plugins: [],
};
