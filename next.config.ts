import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "sharri-unpatted-cythia.ngrok-free.dev",
    "82.26.104.199",
  ],
  async rewrites() {
    return [
      {
        // Rewrite /uploads/... to /api/uploads/uploads/... so API route handles it
        // This way URLs stay the same but files are served with no-cache headers
        source: "/uploads/:path*",
        destination: "/api/uploads/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;