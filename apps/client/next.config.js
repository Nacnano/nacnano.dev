// Outside Vercel (CI, a local build) the commit has to come from git. A
// checkout without history still builds; it just gets a constant ID.
function headCommit() {
  try {
    return require("child_process").execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "no-git";
  }
}

const securityHeaders = [
  // Content-Security-Policy is deliberately absent here: it carries a
  // per-request nonce, so `src/proxy.ts` sets it instead.
  //
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
  // The natural companion to COOP: `images.remotePatterns` is empty and no third
  // party embeds our assets, so same-origin costs nothing here. Scope it before
  // debugging an image that "won't load" elsewhere six months from now: CORP is
  // enforced only by *browsers*, so OG/Twitter card fetchers, RSS readers and
  // unfurlers (all server-side) are unaffected — what it blocks is another site
  // hotlinking our `/static/` assets in an `<img>`, and any future CDN/image
  // proxy in front of them. Both are intended.
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
    // The build ID is embedded in the RSC payload of every prerendered page, so
    // a random one would change that payload — and with it the sha256 the CSP
    // pins — on every build. Pinning the ID to the commit makes the build
    // reproducible, which is what lets `src/scripts/cspScriptHashes.ts` hash
    // one build's HTML and have the next build serve the same bytes.
    generateBuildId: () => process.env.VERCEL_GIT_COMMIT_SHA || headCommit(),
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
