import rss from "./rss";
import { runContentGraphCheck } from "../lib/content";

// Fail the build on a broken content graph (unknown author reference, duplicate
// slug, missing local image/avatar, published post without a summary) before the
// feeds are even written — a typo'd byline or a deleted image should stop the
// deploy, not reach production as a broken reference.
const problems = runContentGraphCheck();
if (problems.length > 0) {
  console.error("content-graph validation failed:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

rss();
