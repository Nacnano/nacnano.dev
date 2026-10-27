/**
 * Turn a browser CSP report into the few fields worth alerting on.
 *
 * Browsers POST two shapes to the same URL. `report-uri` sends one
 * `{ "csp-report": { …kebab-case } }` object. The Reporting API sends a JSON
 * array of `{ type, body }` with a camelCase body. The description built here
 * is the same for the same violation, so Discord's de-dup collapses a browser
 * that delivers both.
 *
 * Extension schemes are dropped. A password manager injecting a script is not
 * a bug in this site, and forwarding it would page someone every day.
 */

export type CspViolation = {
  directive: string;
  blocked: string;
  /** Origin and path only. Query and fragment can carry tokens, so they go. */
  documentUrl: string;
  sample: string;
};

const MAX_DIRECTIVE = 80;
const MAX_BLOCKED = 200;
const MAX_SAMPLE = 80;

const EXTENSION_SCHEME =
  /^(?:chrome-extension|moz-extension|safari-web-extension|safari-extension|ms-browser-extension|chrome|edge):/i;

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function field(body: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in body) return body[key];
  }
  return undefined;
}

function isExtension(value: unknown): boolean {
  return typeof value === "string" && EXTENSION_SCHEME.test(value.trim());
}

/** `data:` URLs can be an entire script. Keep the scheme, drop the payload. */
function blockedOf(value: unknown): string {
  const raw = text(value, MAX_BLOCKED * 10);
  if (raw.startsWith("data:")) return "data:";
  return raw.length > MAX_BLOCKED ? raw.slice(0, MAX_BLOCKED) : raw;
}

function pageOf(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function violationFrom(body: unknown): CspViolation | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;

  // `report-only` policies ask the browser to report without blocking. This
  // site doesn't send one; a report-only body is not a broken page.
  if (text(field(record, "disposition"), 20) === "report") return null;

  const blockedRaw = field(record, "blockedURL", "blocked-uri");
  const sourceRaw = field(record, "sourceFile", "source-file");
  const documentRaw = field(record, "documentURL", "document-uri");
  if (isExtension(blockedRaw) || isExtension(sourceRaw) || isExtension(documentRaw)) {
    return null;
  }

  const directive = text(
    field(
      record,
      "effectiveDirective",
      "effective-directive",
      "violatedDirective",
      "violated-directive"
    ),
    MAX_DIRECTIVE
  );
  if (!directive) return null;

  return {
    directive,
    blocked: blockedOf(blockedRaw),
    documentUrl: pageOf(documentRaw),
    sample: text(field(record, "sample", "script-sample"), MAX_SAMPLE),
  };
}

/** Every violation in a report body, in order. Junk is an empty list. */
export function parseCspReports(payload: unknown): CspViolation[] {
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload)) {
    const violations: CspViolation[] = [];
    for (const entry of payload) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const record = entry as Record<string, unknown>;
      // A typed report that isn't a CSP violation (crash, deprecation) shares
      // this endpoint only by mistake. Untyped bodies are the legacy shape.
      if (typeof record.type === "string" && record.type !== "csp-violation") continue;
      const violation = violationFrom(record.body);
      if (violation) violations.push(violation);
    }
    return violations;
  }

  const violation = violationFrom((payload as Record<string, unknown>)["csp-report"]);
  return violation ? [violation] : [];
}

/** Stable across the two wire formats, so de-dup sees one incident. */
export function describeCspViolation(violation: CspViolation): string {
  const blocked = violation.blocked || "unknown source";
  const sample = violation.sample ? `: ${violation.sample}` : "";
  return `${violation.directive} blocked ${blocked}${sample}`;
}
