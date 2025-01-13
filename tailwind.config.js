/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "blue-800": "#1E3A8A",
        "blue-900": "#1E293B",
      },
    },
  },
  plugins: [],
};
