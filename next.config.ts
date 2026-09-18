import type { NextConfig } from 'next';
const config: NextConfig = {
  // react-pdf liest Schriften und Bilder aus public/ zur Laufzeit — Vercel muss sie mitnehmen.
  outputFileTracingIncludes: { '/api/**': ['./public/fonts/**', './public/*.png', './public/*.jpg'] },
  serverExternalPackages: ['@react-pdf/renderer'],
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }];
  },
};
export default config;
