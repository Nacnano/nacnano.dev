/**
 * Fast content-graph gate, run from the client `lint` task.
 *
 * `postbuild.ts` already fails the deploy on a broken content graph, but it sits
 * behind two full Next builds and a CSP-hash pass, so a typo'd author slug or a
 * deleted image costs several minutes before it reports. The same check belongs
 * where the other cheap validators live (`checkEnvVars.ts`): in `lint`, for
 * seconds-fast feedback locally and in CI. `postbuild` is kept as the deploy
 * backstop — this script only front-loads the identical assertion.
 *
 * `runContentGraphCheck()` reads the MDX corpus off disk and resolves local
 * assets under `public/`; it returns the list of problems (empty = sound).
 */
import { runContentGraphCheck } from "../lib/content";

const problems = runContentGraphCheck();
if (problems.length > 0) {
  console.error("content-graph validation failed:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log("content-graph: all cross-references and assets resolve");
