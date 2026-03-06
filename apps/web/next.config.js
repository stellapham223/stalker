/** @type {import('next').NextConfig} */
// BACKEND_URL points to the Firebase Function (may or may not have /api suffix)
// Rewrite strips the /api prefix from source path to avoid duplication
const BACKEND_URL = process.env.NEXTAUTH_API_URL || "http://localhost:4000";

const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy /api/* (except /api/auth/*) → BACKEND_URL/*
        // e.g. /api/admin/users → …cloudfunctions.net/api/admin/users
        source: "/api/:path((?!auth(?:/|$)).*)",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
