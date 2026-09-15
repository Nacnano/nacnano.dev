/**
 * The private inbox behind the /ama ask box.
 *
 * Submitted != published. A question written here is never read back by any
 * page: it lands in a capped Redis stream that only the author reads (see
 * `bun run ama:inbox`), and it reaches the site only if it is judged worth a
 * public answer and written into `data/amaData.ts` by hand. That keeps /ama
 * statically prerendered, keeps the read path free, and means an anonymous
 * public write can never render attacker-chosen text on the site — the same
 * threat `isInternalPath` was written to close on the visit beacon.
 *
 * Like the activity store, the whole module is behind an env gate: with no
 * Upstash credentials configured there is nowhere to write, and the caller is
 * told so honestly rather than being shown a success it did not get.
 */

import "server-only";

import type { Redis } from "@upstash/redis";
import {
  getActivityClient,
  getActivityClientOrNull,
  parseStreamEntries,
} from "./activityRedis";
import { namespacedKey } from "./runtimeConfig";

// Logical key; the configured namespace (see `runtimeConfig.namespacedKey`) is
// applied at each use so an opted-in prefix isolates test workspaces without
// changing production keys when no prefix is set — the same contract the
// activity stream and the rate-limit buckets already honour.
const STREAM_KEY = "ama:inbox";

// Questions are read by a human, not paged through by a UI, so the cap is a
// backstop against a flood filling the instance rather than a feed length.
const STREAM_MAXLEN = 500;

/**
 * How long a submission is kept. A question carries whatever the asker chose to
 * type, including a contact detail they volunteered, so it gets a stated ceiling
 * rather than living forever: entries older than this are pruned on every write
 * (XTRIM MINID), and if nobody asks anything for a whole window the idle EXPIRE
 * clears the key entirely. Answered questions survive because they were copied
 * into `amaData.ts`, not because the inbox kept them.
 */
export const RETENTION_SECONDS = 90 * 24 * 60 * 60;
const RETENTION_MS = RETENTION_SECONDS * 1000;
/** Stated on the page, so the UI can never advertise a window the store isn't keeping. */
export const RETENTION_DAYS = RETENTION_SECONDS / (24 * 60 * 60);

export const MAX_QUESTION = 1000;
export const MAX_CONTACT = 200;

export type AskInput = {
  question: string;
  /** Optional name or contact detail. Blank is the normal case. */
  contact?: string;
};

export type AskRejection = "empty" | "too_long" | "contact_too_long";

/**
 * Read a text field off a submitted form, refusing anything that is not a
 * string.
 *
 * `FormData.get` is typed `FormDataEntryValue | null`, and a `FormDataEntryValue`
 * is `string | File`. A browser submits a file part as a `File`, so the naive
 * `String(form.get(name) ?? "")` collapses a multipart POST that sends a file
 * for `question` into the literal `"[object File]"` — thirteen characters that
 * then sail past `normaliseAsk` (which only bounds length) and get stored and
 * notified as a real question. Treating any non-string as absent is what the
 * text fields actually mean.
 */
export function textField(form: Pick<FormData, "get">, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export type NormalisedAsk =
  { ok: true; value: AskInput } | { ok: false; reason: AskRejection };

/**
 * Validate and trim a submission. Pure — no store, no headers — so the bounds
 * are testable on their own and identical whichever caller enforces them.
 *
 * Length is checked on the TRIMMED value: a 1000-char question padded with
 * whitespace is a question, and whitespace alone is not.
 */
export function normaliseAsk(input: AskInput): NormalisedAsk {
  const question = input.question?.trim() ?? "";
  const contact = input.contact?.trim() ?? "";

  if (question.length === 0) return { ok: false, reason: "empty" };
  if (question.length > MAX_QUESTION) return { ok: false, reason: "too_long" };
  if (contact.length > MAX_CONTACT) return { ok: false, reason: "contact_too_long" };

  return { ok: true, value: { question, contact: contact || undefined } };
}

export type AskRecord = {
  id: string;
  ts: string;
  question: string;
  contact?: string;
};

export function askRecord(input: AskInput): AskRecord {
  return {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    question: input.question,
    contact: input.contact,
  };
}

/**
 * True when a store is configured and a question can actually be delivered.
 *
 * `undefined` (the no-argument call from `actions.ts`) resolves the configured
 * client *without* throwing: this is the gate `submitAsk` reads to decide
 * between "sent" and "unavailable", so a misconfiguration has to read as
 * unavailable — reported to the operator, and honest to the asker — rather than
 * rejecting the action. An explicit `null` still means static mode, which is how
 * the tests drive it.
 */
export function isInboxLive(client?: Redis | null): boolean {
  const resolved = client === undefined ? getActivityClientOrNull("ama/is-live") : client;
  return resolved !== null;
}

/**
 * Append a question to the inbox. Returns the stored record, or null in static
 * mode, where there is nowhere to put it. The record comes back rather than a
 * bare boolean so the caller can hand the same values to the notifier without
 * rebuilding (and re-timestamping) them.
 *
 * One pipeline, one round trip, mirroring `recordVisit`: append with a count
 * trim, apply the age trim, refresh the idle expiry.
 *
 * The store arrives as a parameter, defaulted to the configured one, for the
 * same reason `AskDeps` does: a test can hand it a fake instead of reaching for
 * `mock.module("@upstash/redis")`, which is process-global in bun and would
 * fight the fake `activityRedis-io.test.ts` already installs. Callers pass
 * nothing.
 */
export async function askAma(
  input: AskInput,
  client = getActivityClient()
): Promise<AskRecord | null> {
  if (!client) return null;

  const record = askRecord(input);
  const oldestAllowed = `${Date.now() - RETENTION_MS}-0`;
  // Resolved once, above the pipeline. `namespacedKey` reads the runtime
  // configuration, which can throw — but we are past the `!client` gate, so the
  // configuration is known valid here.
  const streamKey = namespacedKey(STREAM_KEY);

  const pipeline = client.pipeline();
  pipeline.xadd(
    streamKey,
    "*",
    { data: JSON.stringify(record) },
    { trim: { type: "MAXLEN", comparison: "~", threshold: STREAM_MAXLEN } }
  );
  pipeline.xtrim(streamKey, {
    strategy: "MINID",
    exactness: "~",
    threshold: oldestAllowed,
  });
  pipeline.expire(streamKey, RETENTION_SECONDS);
  await pipeline.exec();

  return record;
}

export type AskFailure = AskRejection | "rate_limited" | "unavailable" | "failed";

export type AskState =
  { status: "idle" } | { status: "sent" } | { status: "error"; reason: AskFailure };

/**
 * Collaborators the submit path needs, injected rather than imported.
 *
 * The interesting part of a submission is its ORDER — throttle before reading
 * the body, drop a honeypot hit without storing it, bound the text, and report
 * a store failure to the asker rather than swallowing it. Taking those four as
 * parameters means that order is exercised by a plain unit test, instead of by
 * `mock.module` calls that leak across every other test file in the process.
 */
export type AskDeps = {
  isLive: () => boolean;
  allow: () => Promise<boolean>;
  store: (input: AskInput) => Promise<AskRecord | null>;
  /** Fire-and-forget. Called only after the question is durably stored. */
  notify: (record: AskRecord) => void;
  onError: (error: unknown) => void;
};

export type AskFields = {
  question: string;
  contact?: string;
  /** The honeypot's value. Any content at all means a form filler, not a person. */
  honeypot?: string;
};

/**
 * Turn a submission into the state the form should render. Pure with respect to
 * the store: everything that touches the network arrives through `deps`.
 */
export async function submitAsk(fields: AskFields, deps: AskDeps): Promise<AskState> {
  // Static mode has nowhere to put a question. Unlike the visit beacon — which
  // is fire-and-forget and can honestly be dropped — someone is waiting on an
  // answer here, so say so and let the UI point them at email instead of
  // showing a success that never happened.
  if (!deps.isLive()) return { status: "error", reason: "unavailable" };

  // Throttle BEFORE looking at the body, so the ceiling holds against malformed
  // and well-formed floods alike. Same order as `api/activity/visit`.
  if (!(await deps.allow())) return { status: "error", reason: "rate_limited" };

  // Honeypot: a field no sighted or assistive user ever reaches. Answered with a
  // success so a bot learns nothing, and nothing is stored. Chosen over a
  // third-party captcha deliberately — `script-src` is `'self'`, and loading
  // Turnstile/reCAPTCHA would mean loosening it for a problem the rate limiter
  // and the capped stream already bound.
  if ((fields.honeypot ?? "").trim().length > 0) return { status: "sent" };

  const normalised = normaliseAsk({ question: fields.question, contact: fields.contact });
  if (!normalised.ok) return { status: "error", reason: normalised.reason };

  let record: AskRecord | null;
  try {
    record = await deps.store(normalised.value);
  } catch (error) {
    // A store failure is the operator's problem, not the asker's — but they
    // still need to know the question did not land, or they will wait forever.
    deps.onError(error);
    return { status: "error", reason: "failed" };
  }
  if (!record) return { status: "error", reason: "unavailable" };

  // Past this line the question is durably stored, so the asker is told it
  // sent no matter what happens next. A notification is for the author's
  // benefit; failing to deliver one must never retract a delivered question.
  try {
    deps.notify(record);
  } catch (error) {
    deps.onError(error);
  }
  return { status: "sent" };
}

/**
 * Read the inbox, newest first. For the author's CLI only — no route and no
 * page reads this, which is what keeps an anonymous write off the site.
 *
 * Normalising through `parseStreamEntries` rather than walking the reply here:
 * Upstash hands back three different shapes depending on client and runtime,
 * and that function is where the codebase already knows about all of them.
 */
export async function readInbox(
  limit = 50,
  client = getActivityClient()
): Promise<AskRecord[]> {
  if (!client) return [];

  const entries = await client.xrevrange(namespacedKey(STREAM_KEY), "+", "-", limit);
  const records: AskRecord[] = [];
  for (const entry of parseStreamEntries(entries)) {
    const raw = entry.fields.data;
    const parsed = typeof raw === "string" ? safeParse(raw) : raw;
    if (isAskRecord(parsed)) records.push(parsed);
  }
  return records;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isAskRecord(value: unknown): value is AskRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.ts === "string" &&
    typeof record.question === "string"
  );
}
