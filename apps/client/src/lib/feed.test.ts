import { describe, expect, it } from "bun:test";
import { amaUrl, postUrl, trimTrailingSlash } from "./feed";

describe("postUrl", () => {
  it("uses the /blogs/ prefix the route actually serves", () => {
    // The regression this guards: the feed used to emit /blog/<slug>.
    expect(postUrl("https://www.nacnano.dev", "teaching-failure")).toBe(
      "https://www.nacnano.dev/blogs/teaching-failure"
    );
  });

  it("never doubles the slash when the site URL has a trailing one", () => {
    expect(postUrl("https://www.nacnano.dev/", "x")).toBe(
      "https://www.nacnano.dev/blogs/x"
    );
  });
});

describe("amaUrl", () => {
  it("anchors at the answer on the /ama index", () => {
    expect(amaUrl("https://www.nacnano.dev", "over-engineered")).toBe(
      "https://www.nacnano.dev/ama#over-engineered"
    );
  });

  it("never doubles the slash when the site URL has a trailing one", () => {
    expect(amaUrl("https://www.nacnano.dev/", "x")).toBe("https://www.nacnano.dev/ama#x");
  });
});

describe("trimTrailingSlash", () => {
  it("leaves a clean URL alone", () => {
    expect(trimTrailingSlash("https://a.dev")).toBe("https://a.dev");
  });
  it("removes repeated trailing slashes", () => {
    expect(trimTrailingSlash("https://a.dev///")).toBe("https://a.dev");
  });
});
