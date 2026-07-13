/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 12px 32px rgba(79, 70, 229, 0.08)",
      },
      colors: {
        study: {
          blue: "#60a5fa",
          indigo: "#818cf8",
          mint: "#34d399",
          orange: "#fb923c",
        },
      },
    },
  },
  plugins: [],
};
