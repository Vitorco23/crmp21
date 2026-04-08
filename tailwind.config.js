/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
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
