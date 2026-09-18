import type { NextConfig } from 'next';
const config: NextConfig = {
  // react-pdf liest Schriften und Bilder aus public/ zur Laufzeit — Vercel muss sie mitnehmen.
  outputFileTracingIncludes: { '/api/**': ['./public/fonts/**', './public/*.png', './public/*.jpg'] },
  serverExternalPackages: ['@react-pdf/renderer'],
};
export default config;
