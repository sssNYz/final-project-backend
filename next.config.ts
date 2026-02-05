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
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  },
};

export default nextConfig;