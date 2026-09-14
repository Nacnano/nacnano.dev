"use server";

import { headers } from "next/headers";
import { askAma, isInboxLive, submitAsk, type AskState } from "@/lib/amaInbox";
import { allowAsk, clientIp } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";

/**
 * The one write path on /ama, and a deliberately thin one.
 *
 * A server action rather than a `fetch` to a route handler, so the form is a
 * real `<form>` that still submits with JavaScript off — the page is statically
 * prerendered and this action is the only dynamic thing on it. It is a
 * same-origin POST, so the shipped `form-action 'self'` / `connect-src 'self'`
 * policy covers it with no change.
 *
 * All of the ordering and validation lives in `submitAsk`; everything here is
 * adapter — pull the fields off the FormData, bind the real collaborators.
 */

export async function askQuestion(
  _previous: AskState,
  formData: FormData
): Promise<AskState> {
  const requestHeaders = await headers();

  return submitAsk(
    {
      question: String(formData.get("question") ?? ""),
      contact: String(formData.get("contact") ?? ""),
      honeypot: String(formData.get("website") ?? ""),
    },
    {
      isLive: isInboxLive,
      allow: () => allowAsk(clientIp(requestHeaders)),
      store: askAma,
      onError: (error) => captureError(error, { route: "ama/ask" }),
    }
  );
}
