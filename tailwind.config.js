const colors = require('tailwindcss/colors')

// Silence deprecation warning
delete colors['lightBlue']

module.exports = {
  mode: 'jit',
  theme: {
    extend: {
      colors: {
        ...colors,
        gray: {
          ...colors.coolGray,
          150: '#ECEDEF'
        },
        'status-red': '#CB2431',
        'status-green': '#28A745',
        'status-yellow': '#DBAB07'
      },
      animation: {
        pulse: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  purge: ['./src/renderer/**/*.{ts,tsx}'],
  variants: {},
  plugins: []
}
