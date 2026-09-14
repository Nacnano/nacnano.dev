import { describe, expect, it, mock } from "bun:test";
import { captureError } from "./observability";

describe("captureError", () => {
  it("writes a structured line and never throws (log-only when no endpoint)", () => {
    const original = console.error;
    const lines: string[] = [];
    console.error = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      expect(() => captureError(new Error("boom"), { route: "test" })).not.toThrow();
      expect(() => captureError("plain string", { route: "test" })).not.toThrow();
    } finally {
      console.error = original;
    }

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("[error]");
    expect(lines[0]).toContain("boom");
    // The non-Error path still serialises to a message.
    expect(lines[1]).toContain("plain string");
  });
});
