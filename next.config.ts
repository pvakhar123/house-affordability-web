import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const apiVersionHeaders = [
  { key: "X-API-Version", value: "1.0" },
  { key: "X-API-Deprecation", value: "false" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/api/:path*", headers: apiVersionHeaders },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Only upload source maps if SENTRY_AUTH_TOKEN is set
  silent: !process.env.SENTRY_AUTH_TOKEN,
});
