const isDev = process.env.NODE_ENV !== "production";

// Scoped to what this site actually loads: its own assets, inline styles from
// Tailwind's runtime theme switch, and nothing third-party. The previous
// policy allowlisted giscus.app and analytics.umami.is, neither of which is
// used, and opened connect-src/img-src/media-src to the whole internet.
//
// 'unsafe-inline' in script-src is still required: the App Router and
// next-themes both emit inline bootstrap scripts, and Next does not wire a
// nonce through a statically exported page. 'unsafe-eval' is dev-only, where
// React Refresh needs it.
const ContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/**
 * @type {import('next/dist/next-server/server/config').NextConfig}
 **/
module.exports = () => {
  return {
    reactStrictMode: true,
    pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
    images: {
      // All imagery is local; no remote patterns are permitted.
      remotePatterns: [],
    },
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: securityHeaders,
        },
      ];
    },
    // The blog index duplicated the home page and the tag index led to
    // single-post dead ends. Both are gone; their URLs are kept alive.
    async redirects() {
      return [
        { source: "/blogs", destination: "/", permanent: true },
        { source: "/blogs/page/:page", destination: "/", permanent: true },
        { source: "/tags", destination: "/", permanent: true },
        { source: "/tags/:tag", destination: "/", permanent: true },
        { source: "/tags/:tag/feed.xml", destination: "/feed.xml", permanent: true },
        { source: "/blog/:slug", destination: "/blogs/:slug", permanent: true },
      ];
    },
  };
};
