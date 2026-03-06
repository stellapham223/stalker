/** @type {import('next').NextConfig} */
// BACKEND_URL is the Firebase Function root (without /api suffix)
// e.g. http://localhost:5001/marketing-stalker-tool/asia-southeast1/api
const BACKEND_URL = process.env.NEXTAUTH_API_URL || "http://localhost:4000";

const nextConfig = {
  transpilePackages: ["@competitor-stalker/shared"],
  async rewrites() {
    return [
      {
        // Proxy all /api/* except /api/auth/* (NextAuth routes)
        source: "/api/:path((?!auth(?:/|$)).*)",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
