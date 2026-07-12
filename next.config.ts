import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],
  images: { formats: ["image/webp"] },
};

export default nextConfig;
