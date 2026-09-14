import { describe, expect, it } from "bun:test";

import { contentSecurityPolicy, createNonce } from "./csp";
import { extractInlineScripts, hashInlineScript, hashInlineScripts } from "./cspHashes";
import { INLINE_SCRIPT_HASHES } from "@/generated/cspScriptHashes";

const scriptSrc = (policy: string) =>
  policy.split("; ").find((directive) => directive.startsWith("script-src "))!;

describe("contentSecurityPolicy", () => {
  it("allows inline scripts by nonce and hash, never by 'unsafe-inline'", () => {
    const directive = scriptSrc(contentSecurityPolicy({ nonce: "n0nce", isDev: false }));

    expect(directive).toContain("'nonce-n0nce'");
    expect(directive).toContain(INLINE_SCRIPT_HASHES[0]);
    expect(directive).not.toContain("'unsafe-inline'");
    expect(directive).not.toContain("'unsafe-eval'");
  });

  it("falls back to 'unsafe-inline' in dev, where the hashes do not apply", () => {
    const directive = scriptSrc(contentSecurityPolicy({ nonce: "n0nce", isDev: true }));

    expect(directive).toContain("'unsafe-inline'");
    expect(directive).toContain("'unsafe-eval'");
  });

  it("keeps the rest of the policy locked to this origin", () => {
    const policy = contentSecurityPolicy({ nonce: "n0nce", isDev: false });

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });
});

describe("createNonce", () => {
  it("mints a fresh base64 value per call", () => {
    const nonce = createNonce();

    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(atob(nonce)).toHaveLength(16);
    expect(createNonce()).not.toBe(nonce);
  });
});

describe("extractInlineScripts", () => {
  it("takes inline bodies and skips sourced scripts", () => {
    const html = `<script src="/a.js"></script><script>one()</script>
      <script type="application/ld+json">{"a":1}</script><script defer src="/b.js"></script>`;

    expect(extractInlineScripts(html)).toEqual(["one()", '{"a":1}']);
  });

  it("is not confused by a closing tag React escaped inside a payload", () => {
    const html = String.raw`<script>push("\u003c/script>rest")</script>`;

    expect(extractInlineScripts(html)).toEqual([String.raw`push("\u003c/script>rest")`]);
  });
});

describe("hashInlineScripts", () => {
  it("hashes the exact body, as a quoted CSP source expression", () => {
    // echo -n 'one()' | openssl dgst -sha256 -binary | base64
    expect(hashInlineScript("one()")).toBe(
      "'sha256-HR7iaask9daLMRRskMI++QeJtjWDOjyPA6lGzYGzKW4='"
    );
  });

  it("deduplicates the bootstrap script shared by every page", () => {
    const page = "<script>shared()</script>";

    expect(hashInlineScripts([page, `${page}<script>only-here()</script>`])).toHaveLength(
      2
    );
  });
});
