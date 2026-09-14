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
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
  // Isolates this origin's browsing context; a one-line, cost-free hardening.
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
  // The natural companion to COOP: no third party embeds our assets, and
  // `images.remotePatterns` is empty, so same-origin costs nothing here.
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

/**
 * @type {import('next/dist/next-server/server/config').NextConfig}
 **/
module.exports = () => {
  return {
    reactStrictMode: true,
    // We ship a careful CSP; don't then advertise the framework via
    // `X-Powered-By: Next.js`.
    poweredByHeader: false,
    // MDX is compiled through `next-mdx-remote`, not treated as page files, so
    // `md`/`mdx` never need to be page extensions.
    pageExtensions: ["ts", "tsx", "js", "jsx"],
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
