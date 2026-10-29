import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  // The Freebuff preview panel serves the dev server through this host.
  // Without it Next.js blocks all dev resources (HMR websocket, dev overlay,
  // source maps) as cross-origin, which leaves the page un-hydrated: every
  // button — hamburger menu, theme toggle, calendar — renders but is dead.
  allowedDevOrigins: ["pv-f7f0f1098227-248d2dc5-d27e-4c11-b9ba-1ea9b9e00e0d.style.dev"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Cap build workers — the sandbox enforces a 2 GB memory limit and
    // spawning one worker per core (64) causes the build to be OOM-killed.
    // A single worker keeps peak memory under the cgroup limit.
    cpus: 1,
  },
  async rewrites() {
    return [
      {
        source: "/public/videos/:path*",
        destination: "/videos/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/rooms/presidential-suite",
        destination: "/rooms/luxury",
        permanent: true,
      },
      {
        source: "/rooms/signature-suite",
        destination: "/rooms/luxury-suite",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Range, Accept-Ranges, Content-Range, Content-Type, Origin, Accept" },
          { key: "Access-Control-Expose-Headers", value: "Content-Range, Content-Length, Accept-Ranges" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Accept-Ranges", value: "bytes" },
        ],
      },
      {
        source: "/public/videos/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Range, Accept-Ranges, Content-Range, Content-Type, Origin, Accept" },
          { key: "Access-Control-Expose-Headers", value: "Content-Range, Content-Length, Accept-Ranges" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Accept-Ranges", value: "bytes" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
