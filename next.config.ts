import type { NextConfig } from "next";

const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  async headers() {
    return [
      { source: "/m/:path*", headers: noIndex },
      { source: "/board", headers: noIndex },
      { source: "/board/:path*", headers: noIndex },
    ];
  },
};

export default nextConfig;
