"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { askQuestion } from "./actions";
import type { AskFailure, AskState } from "@/lib/amaInbox";

/**
 * The ask box. A real `<form>` bound to a server action, so it still submits
 * with JavaScript off; `useActionState` only adds the pending flag and the
 * returned state, so the component never owns a `fetch`.
 *
 * The copy says a question goes to a private inbox, because it does. Every
 * outcome lands in an `aria-live` region, including the site's own failures: a
 * submit button that appears to do nothing is how a form like this usually
 * breaks.
 */

const initialState: AskState = { status: "idle" };

/** Every failure the action can return has copy. `Record<AskFailure, ...>` is
 *  what makes a missing one a compile error rather than a blank live region. */
function failureCopy(reason: AskFailure, retryAfterMinutes: number): string {
  const copy: Record<AskFailure, string> = {
    empty: "The box is empty. Type something first.",
    too_long: "That's too long for the box. Trim it a bit.",
    contact_too_long: "That's too long for the contact field.",
    rate_limited: `That's a lot of questions at once. Try again in ${retryAfterMinutes} minutes, or just email me.`,
    unavailable: "The box isn't working right now. Email still reaches me.",
    failed: "Something broke on my end and it didn't send. Email still works.",
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

  // No visible heading: the `h1` above already says "Ask me anything", and a
  // second one would just say it twice. The section is still named for anyone
  // navigating by landmark.
  return (
    <section aria-label="Ask a question" className="mt-8">
      <p
        id={hintId}
        className="max-w-measure text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400"
      >
        Goes to a private inbox. Nothing you write shows up here unless I write an answer
        for it. Questions are deleted after {retentionDays} days.
      </p>

      <form ref={formRef} action={formAction} className="max-w-measure mt-5">
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
          rows={3}
          maxLength={maxQuestion}
          aria-describedby={`${hintId} ${countId}`}
          className="field mt-1.5 resize-y"
        />
        <p
          id={countId}
          className="tabular mt-1 font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400"
        >
          Up to {maxQuestion} characters
        </p>

        <label
          htmlFor={contactId}
          className="mt-4 block text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400"
        >
          Name or email <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id={contactId}
          name="contact"
          type="text"
          maxLength={maxContact}
          className="field mt-1.5"
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

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
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
          className="mt-3 min-h-[1.75rem] text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400"
        >
          {pending
            ? "Sending…"
            : state.status === "sent"
              ? "Sent, thanks. If I write an answer it turns up on this page."
              : state.status === "error"
                ? failureCopy(state.reason, retryAfterMinutes)
                : ""}
        </p>
      </form>
    </section>
  );
}
