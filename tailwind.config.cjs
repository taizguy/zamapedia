/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    { pattern: /^text-/ },
    { pattern: /^bg-/ },
    { pattern: /^border-/ },
    { pattern: /^hover:/ },
    { pattern: /^focus:/ },
    { pattern: /^font-/ },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}