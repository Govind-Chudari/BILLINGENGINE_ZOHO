/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#1a56db",
          700: "#1e429f",
          800: "#1e3a5f",
          900: "#1e2d4a",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"]
      }
    }
  },
  plugins: []
};