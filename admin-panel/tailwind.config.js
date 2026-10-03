/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0B192C",
          800: "#132943",
          700: "#1E3E62",
        },
        cream: "#F8F5EE",
        gold: {
          500: "#D4A72C",
          600: "#B08014",
          700: "#8C630C",
        },
        status: {
          success: "#2E7D5B",
          warning: "#C98A18",
          error: "#B54747",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Cinzel", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
