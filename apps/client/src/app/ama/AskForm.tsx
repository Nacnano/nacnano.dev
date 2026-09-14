"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { askQuestion } from "./actions";
import type { AskFailure, AskState } from "@/lib/amaInbox";

/**
 * The ask box: a real `<form>` bound to a server action, so it still submits
 * with JavaScript off. `useActionState` is the whole of the enhancement — it
 * gives the pending flag and the returned state without the component ever
 * owning a `fetch`.
 *
 * Two things this deliberately does NOT do. It does not imply publication: a
 * question goes to a private inbox and only a written answer ever reaches the
 * page, and the copy says so rather than letting the asker infer otherwise. And
 * it does not fail silently — every outcome, including the ones that are the
 * site's fault, is announced in an `aria-live` region, because a submit button
 * that appears to do nothing is the usual way a form like this breaks.
 */

const initialState: AskState = { status: "idle" };

/** Every failure the action can return has copy. `Record<AskFailure, ...>` is
 *  what makes that a compile error rather than a blank live region. */
function failureCopy(reason: AskFailure, retryAfterMinutes: number): string {
  const copy: Record<AskFailure, string> = {
    empty: "Type a question first — the box is empty.",
    too_long: "That's longer than the box accepts. Trim it and try again.",
    contact_too_long: "That contact detail is too long. Shorten it and try again.",
    rate_limited: `That's a few questions in a short window. Try again in ${retryAfterMinutes} minutes, or send it over email.`,
    unavailable:
      "The question box isn't reachable right now. Email works and reaches the same person.",
    failed:
      "Something broke on my side and the question didn't send. Email is the fallback.",
  };
  return copy[reason];
}

export default function AskForm({
  maxQuestion,
  maxContact,
  retentionDays,
  retryAfterMinutes,
  email,
}: {
  maxQuestion: number;
  maxContact: number;
  retentionDays: number;
  retryAfterMinutes: number;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(askQuestion, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<AskState>(initialState);
  const questionId = useId();
  const contactId = useId();
  const hintId = useId();
  const countId = useId();
  const honeypotId = useId();

  // Clear the box once a question is actually stored, so asking a second one
  // starts from empty. Keyed on the state OBJECT, not on `status`: the action
  // returns a fresh object per submission, so two successes in a row are still
  // two resets — which `status === "sent"` alone would collapse into one.
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.status === "sent") formRef.current?.reset();
  }, [state]);

  return (
    <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <h2 className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
        Ask a question
      </h2>
      <p
        id={hintId}
        className="max-w-measure mt-2 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400"
      >
        This goes to a private inbox, not to the page. Most questions get a short reply;
        the ones worth reading get written up here. Questions are kept for {retentionDays}{" "}
        days and then deleted.
      </p>

      <form ref={formRef} action={formAction} className="max-w-measure mt-6">
        <label
          htmlFor={questionId}
          className="block text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400"
        >
          Your question
        </label>
        <textarea
          id={questionId}
          name="question"
          required
          rows={4}
          maxLength={maxQuestion}
          aria-describedby={`${hintId} ${countId}`}
          className="field mt-2 resize-y"
        />
        <p
          id={countId}
          className="tabular mt-1.5 font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400"
        >
          Up to {maxQuestion} characters
        </p>

        <label
          htmlFor={contactId}
          className="mt-5 block text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400"
        >
          Name or email <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id={contactId}
          name="contact"
          type="text"
          maxLength={maxContact}
          className="field mt-2"
        />

        {/*
          The honeypot's field. Off-screen, out of the accessibility tree and out
          of the tab order, so no real asker can reach it — `tabIndex={-1}` is
          what keeps `aria-hidden` over a focusable control from being a defect.
          `submitAsk` decides what a filled one means.
        */}
        <div
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
        >
          <label htmlFor={honeypotId}>Website</label>
          <input
            id={honeypotId}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-default disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
          >
            {pending ? "Sending…" : "Send question"}
          </button>
          <p className="text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
            Or email{" "}
            <a
              href={`mailto:${email}`}
              className="hover:text-accent-600 hover:decoration-accent-600 dark:hover:text-accent-300 dark:hover:decoration-accent-300 rounded text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors dark:text-zinc-100 dark:decoration-zinc-700"
            >
              {email}
            </a>
            .
          </p>
        </div>

        {/*
          One live region, always present in the DOM so a screen reader is
          already watching it when the result arrives. `pending` is announced
          too: on a slow connection the gap between press and answer is exactly
          where a sighted user sees the button change and a non-sighted one
          hears nothing.
        */}
        <p
          aria-live="polite"
          className="mt-4 min-h-[1.75rem] text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400"
        >
          {pending
            ? "Sending your question…"
            : state.status === "sent"
              ? "Sent. Answered questions get published on this page; most get a private reply instead."
              : state.status === "error"
                ? failureCopy(state.reason, retryAfterMinutes)
                : ""}
        </p>
      </form>
    </section>
  );
}
