import { BACKEND_URL } from "@/shared/lib/configs/backend.config";
import type { NextConfig } from "next";
import path from "node:path";

const devOrigin =
  process.env.ALLOWED_DEV_ORIGINS ?? process.env.ALLOWE_DEV_ORIGINS;

const devConfig: Partial<NextConfig> =
  process.env.NODE_ENV === "development" && devOrigin
    ? { allowedDevOrigins: [devOrigin] }
    : {};

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  reactCompiler: true,
  ...devConfig,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
