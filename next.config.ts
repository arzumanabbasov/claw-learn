import type { NextConfig } from 'next';

// In production, lock CORS to your own origin.
// Set ALLOWED_ORIGIN in your deployment environment (e.g. https://thinkinmotion.vercel.app).
// Falls back to same-origin only when not set.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '';

const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    remotePatterns: [
      {
        // Google profile pictures (OAuth avatars)
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  async headers() {
    return [
      // ── Security headers on every response ──────────────────────────────
      {
        source: '/(.*)',
        headers: [
          // Prevent the page from being embedded in iframes on other origins
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Stop browsers from MIME-sniffing the response type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Only send the origin as referrer, never the full URL
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict powerful features to same-origin only
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=(self)',
          },
        ],
      },

      // ── CORS on API routes ───────────────────────────────────────────────
      // Wildcard (*) is intentionally removed — only the configured origin
      // (or same-origin when ALLOWED_ORIGIN is empty) may call the API.
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            // Empty string means no CORS header → same-origin only
            value: ALLOWED_ORIGIN,
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          // Don't cache preflight responses
          { key: 'Access-Control-Max-Age', value: '600' },
        ].filter((h) => h.value !== ''), // drop the header entirely when value is empty
      },
    ];
  },
};

export default nextConfig;
