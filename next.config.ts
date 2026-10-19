import type { NextConfig } from "next";

const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // Browser bundles only inline env declared here. Same variable the capture helper reads.
  ...(process.env.VERCEL_ENV
    ? { env: { VERCEL_ENV: process.env.VERCEL_ENV } }
    : {}),
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
