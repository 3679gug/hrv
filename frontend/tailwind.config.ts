/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F9F9",
        foreground: "#1A1C20",
        primary: "#00666D",
        secondary: "#BCE9E4",
        accent: "#EBFDFA",
        card: "#FFFFFF",
      },
      borderRadius: {
        '3xl': '2rem',
      },
       fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
