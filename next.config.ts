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
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "www.getskwad.com" }],
        destination: "https://getskwad.com/",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.getskwad.com" }],
        destination: "https://getskwad.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
