/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1420",
        card: "#151b2b",
        stroke: "#24304a",
        text: "#e8ecf4",
        muted: "#9aa3b2",
        primary: "#6c79ff",
        primary2: "#505cff",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,.35)",
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [],
};