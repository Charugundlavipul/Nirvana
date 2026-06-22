/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
    qualities: [65, 75, 80],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      // --- Old .co domain → new domain ---
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'nirvanaluxe.co' }],
        destination: 'https://www.nirvanaluxevacations.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.nirvanaluxe.co' }],
        destination: 'https://www.nirvanaluxevacations.com/:path*',
        permanent: true,
      },
      // --- Old .com domain → new domain ---
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'nirvanaluxe.com' }],
        destination: 'https://www.nirvanaluxevacations.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.nirvanaluxe.com' }],
        destination: 'https://www.nirvanaluxevacations.com/:path*',
        permanent: true,
      },
      // --- Bare new domain → www new domain ---
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'nirvanaluxevacations.com' }],
        destination: 'https://www.nirvanaluxevacations.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
