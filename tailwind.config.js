const colors = require('tailwindcss/colors')
const _ = require('lodash')

module.exports = {
  mode: 'jit',
  theme: {
    extend: {
      colors: {
        // Silence deprecation warning
        ..._.omit(colors, ['lightBlue']),
        sky: colors.lightBlue,
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
