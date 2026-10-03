/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f7f6f2',
        foreground: '#1c1c1c',
        primary: '#5F3F56',
        muted: '#8f8d88',
        ghost: '#B4B4B4',
        border: '#e5e4de',
        card: '#f7f6f2',
        hover: '#ffffff',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
