/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.sonicstudio.ai",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    const cleanBackend = backendUrl.replace(/\/+$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${cleanBackend}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
