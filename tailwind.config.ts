import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { o: '#ED7A02', od: '#9F3C07', blue: '#0F1B23', ink: '#0A1118', paper: '#EEEEEE', surf: '#16212A', line: '#2A353D', muted: '#AFB3B5' },
    fontFamily: { sans: ['Montserrat', 'Arial', 'sans-serif'] }, borderRadius: { jr: '12px' } } },
  plugins: [],
} satisfies Config;
