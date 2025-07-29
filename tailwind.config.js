// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // brand: '#165bba', // Uncomment and set to use a custom color
      },
      // fontFamily: {
      //   display: ['Inter', 'sans-serif'], // Example
      // },
    },
  },
  plugins: [
    // require('@tailwindcss/forms'),      // Uncomment if using forms
    // require('@tailwindcss/typography'), // Uncomment if using typography
  ],
}