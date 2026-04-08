/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'p21-dark': '#152039',
        'p21-green': '#9abd33',
        'p21-white': '#f1fbfd',
        'p21-panel': '#1e293b',
      },
    },
  },
  plugins: [],
}
