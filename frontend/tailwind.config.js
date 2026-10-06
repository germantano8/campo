/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          50: '#f2fbf4',
          100: '#e1f6e6',
          200: '#c5eccf',
          300: '#97dca9',
          400: '#62c27c',
          500: '#3ba758',
          600: '#2c8744',
          700: '#246b38',
          800: '#20552f',
          900: '#1c4629',
          950: '#0a2613',
        },
        campo: {
          gold: '#eab308',
          earth: '#78350f',
          sky: '#0284c7',
        }
      }
    },
  },
  plugins: [],
}

