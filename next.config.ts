import type { NextConfig } from "next";

const s3Host = (() => {
  try {
    return process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const config: NextConfig = {
  // Lets the end-to-end suite build alongside a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // SVGs are never passed through the optimiser.
    dangerouslyAllowSVG: false,
    remotePatterns: s3Host ? [{ protocol: "https", hostname: s3Host }] : [],
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    const headers = [{ source: "/:path*", headers: securityHeaders }];
    const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };
    headers.push({ source: "/admin/:path*", headers: [noindex] }, { source: "/api/:path*", headers: [noindex] });
    if (process.env.ALLOW_INDEXING === "false") headers.push({ source: "/:path*", headers: [noindex] });
    return headers;
  },
};

export default config;
