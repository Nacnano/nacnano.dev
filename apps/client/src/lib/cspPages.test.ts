import { describe, expect, it } from "bun:test";

import { isDeploymentAuthWall, routesFromSitemap, routesToCheck } from "./cspPages";

const BASE = "https://www.nacnano.dev";

describe("routesFromSitemap", () => {
  it("reads same-origin locs and normalises the homepage", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset>
        <url><loc>${BASE}/</loc></url>
        <url><loc>${BASE}/about</loc></url>
        <url><loc>${BASE}/blogs/dating-app/</loc></url>
        <url><loc>https://map.nacnano.dev/</loc></url>
      </urlset>`;

    expect(routesFromSitemap(xml, BASE)).toEqual(["/", "/about", "/blogs/dating-app"]);
  });

  it("drops a loc that is not a URL, including a broken percent-escape", () => {
    const xml = `<urlset>
      <url><loc>https://%</loc></url>
      <url><loc>${BASE}/%E0%A4%A</loc></url>
      <url><loc>${BASE}/about</loc></url>
    </urlset>`;

    expect(routesFromSitemap(xml, BASE)).toEqual(["/about"]);
  });
});

describe("routesToCheck", () => {
  it("appends the pages the sitemap and the build both miss, once", () => {
    expect(routesToCheck(["/", "/activity", "/about"])).toEqual([
      "/",
      "/activity",
      "/about",
      "/this-page-does-not-exist",
    ]);
  });

  it("ignores a relative path", () => {
    expect(routesToCheck(["about"])).toEqual(["/activity", "/this-page-does-not-exist"]);
  });
});

describe("isDeploymentAuthWall", () => {
  it("recognises Vercel's login redirect and ignores an off-site link", () => {
    expect(
      isDeploymentAuthWall(
        "https://vercel.com/sso-api?url=https%3A%2F%2Fnacnano-dev.vercel.app%2Fama"
      )
    ).toBe(true);
    expect(isDeploymentAuthWall("https://drive.google.com/drive/folders/abc")).toBe(
      false
    );
    expect(isDeploymentAuthWall("not a url")).toBe(false);
  });
});
