import { createHash } from "node:crypto";

// React escapes `<` as `\u003c` inside the inline payloads it serializes, so a
// non-greedy scan for the closing tag cannot be fooled by script contents.
const INLINE_SCRIPT = /<script([^>]*)>([\s\S]*?)<\/script>/g;
const HAS_SRC = /(^|\s)src\s*=/;

export type InlineScript = { attributes: string; body: string };

/** Every inline (`src`-less) script in a document, in source order. */
export function extractInlineScriptTags(html: string): InlineScript[] {
  const scripts: InlineScript[] = [];
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const [, attributes = "", body = ""] = match;
    // `<script src=…>` is covered by `'self'`, and JSON-LD blocks still need a
    // hash — browsers apply script-src before they look at the MIME type.
    if (!HAS_SRC.test(attributes)) scripts.push({ attributes, body });
  }
  return scripts;
}

/** The bodies of {@link extractInlineScriptTags}, which is what CSP hashes. */
export function extractInlineScripts(html: string): string[] {
  return extractInlineScriptTags(html).map((script) => script.body);
}

/** The CSP source expression that allows exactly this inline script. */
export function hashInlineScript(body: string): string {
  return `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
}

/** Deduplicated, sorted hashes for every inline script across a set of pages. */
export function hashInlineScripts(documents: Iterable<string>): string[] {
  const hashes = new Set<string>();
  for (const html of documents) {
    for (const body of extractInlineScripts(html)) hashes.add(hashInlineScript(body));
  }
  return [...hashes].sort();
}
