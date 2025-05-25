// Deployment trigger: Updated on 2025-05-25 to fix Cloudflare error

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'supabase.co'],
    // unoptimized: true, // Default is false, enabling Next.js Image Optimization. Re-add if truly needed.
  },
  // Ensure environment variables are properly exposed
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  eslint: {
    // Recommended: false for production builds to catch errors.
    ignoreDuringBuilds: false, // Changed from true to catch errors
  },
  typescript: {
    // Recommended: false for production builds to catch errors.
    ignoreBuildErrors: false, // Changed from true to catch errors
  },
};

export default nextConfig;
