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
        gray: colors.coolGray,
        'status-red': '#CB2431',
        'status-green': '#28A745',
        'status-yellow': '#DBAB07'
      }
    }
  },
  purge: ['./src/renderer/**/*.{ts,tsx}'],
  variants: {},
  plugins: []
}
