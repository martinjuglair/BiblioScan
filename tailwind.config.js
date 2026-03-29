/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bd: {
          primary: "#6366f1",
          dark: "#0f172a",
          card: "#1e293b",
          text: "#e2e8f0",
          muted: "#94a3b8",
        },
      },
    },
  },
  plugins: [],
};
