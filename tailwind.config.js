module.exports = {
  mode: 'jit',
  theme: {
    extend: {
      colors: {
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
