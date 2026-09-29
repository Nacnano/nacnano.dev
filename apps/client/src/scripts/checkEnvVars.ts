/**
 * Guard the `globalEnv` contract that `eslint-config-turbo` used to enforce.
 *
 * Turbo's build cache and Vercel's runtime only forward env vars that are
 * declared in `turbo.json`'s `globalEnv`. Read one that is not listed and it
 * is `undefined` in a cached build — a silent misconfiguration, not a crash.
 * PR #45 removed `eslint-config-turbo` (which had a `no-undeclared-env-vars`
 * rule) and neither Biome nor oxlint replaces it, so this script does.
 *
 * The check: every `process.env.NAME` read anywhere in the client must appear
 * in `globalEnv`. Reads are collected from production code only — the test
 * files set arbitrary vars for mocking and are not the contract. A var in
 * `globalEnv` that nothing reads is fine (turbo/CI consume some of them, e.g.
 * `CI` and `VERCEL_GIT_COMMIT_SHA`), so this is deliberately one-directional.
 *
 * Coverage is `apps/client`'s top-level config files (`next.config.js`,
 * `playwright.config.ts`) plus everything under `src` — the two config files
 * are where an env read is most likely to be added and were the gap a
 * `src/**`-only glob would miss. `node_modules` and `.next` are never scanned.
 *
 * Reads are found by scanning tokens with the TypeScript lexer, not by regex
 * over the raw text. A regex needs to first strip comments, and stripping `//`
 * with a regex also eats the `//` inside every URL string (`"https://…"`),
 * which silently hides any real read that shares the line — a guard that
 * passes is worse than no guard. Lexing sidesteps the whole class: comments
 * and string/regex/template literals are single opaque tokens, never a `.`
 * member-access chain, so they are never mistaken for reads, and both the
 * dotted (`process.env.FOO`) and bracket (`process.env["FOO"]`) forms are
 * matched exactly. (This used to walk the AST via the `typescript` package's
 * JS API; TypeScript 7 removed that API from the npm package, so the guard
 * now uses the lexer exported by `typescript/unstable/ast`. A full parser is
 * not needed here — the pattern is five tokens wide and positionally exact.)
 *
 * Wired into the client `lint` task, so `bun run lint` (and therefore CI) fails
 * on an undeclared read without needing a linter plugin.
 */
import { readFileSync } from "node:fs";
import { Glob } from "bun";
import {
  createScanner,
  LanguageVariant,
  SyntaxKind as K,
  tokenIsIdentifierOrKeyword,
} from "typescript/unstable/ast";

// From apps/client/src/scripts, up four levels is the repo root.
const ROOT = new URL("../../../../", import.meta.url).pathname;
const CLIENT = `${ROOT}apps/client`;
const TURBO_MANIFEST = `${ROOT}turbo.json`;

// Top-level config (next.config.js, playwright.config.ts) and the source tree,
// scanned as two disjoint globs so node_modules/.next are never descended.
const PATTERN = "*.{ts,tsx,js,mjs}";
const SOURCES = [
  ...new Glob(PATTERN).scanSync({ cwd: CLIENT }),
  ...new Glob(`src/**/${PATTERN}`).scanSync({ cwd: CLIENT }),
];

const globalEnv: unknown = JSON.parse(readFileSync(TURBO_MANIFEST, "utf8")).globalEnv;
if (!Array.isArray(globalEnv)) {
  console.error(`turbo.json: "globalEnv" is missing or not an array (${TURBO_MANIFEST})`);
  process.exit(1);
}
const declared = new Set(globalEnv.filter((v): v is string => typeof v === "string"));

const used = new Map<string, string>();
function add(name: string, path: string) {
  if (!used.has(name)) used.set(name, path);
}

// Whitespace, comments and JSX text are trivia: emitted as whole tokens when
// the scanner runs with skipTrivia=false, and irrelevant to a pattern match,
// so the scan drops them and matches on the significant token stream only.
const isTrivia = (kind: number) =>
  kind >= K.FirstTriviaToken && kind <= K.LastTriviaToken;

// Tokens that can legally start a fresh member expression whose head is the
// global `process`. This is an allow-list: `process` only counts as the global
// when the previous significant token is one of these (or the file starts).
// Anything else — an identifier, a dot, a closing paren, a slash — would make
// the chain something else: a member of another object (`x.process.env`), text
// inside a regex literal or JSX children that lexed as words, and so on. The
// old AST walk had the same guarantee structurally (the node's expression had
// to be the bare `process` identifier); this reproduces it lexically.
// Semicolon-less `}`-then-statement starts are not in the list; prettier (CI-
// enforced) always emits the semicolon, so that shape does not exist here.
const BEFORE_PROCESS_NAMES = [
  // assignments (plain and compound) and object/array literal separators
  "EqualsToken",
  "PlusEqualsToken",
  "MinusEqualsToken",
  "AsteriskEqualsToken",
  "PercentEqualsToken",
  "OpenParenToken",
  "OpenBracketToken",
  "CommaToken",
  "ColonToken",
  // statement and expression boundaries, including JSX expression containers
  // (`{process.env.X}`) and block-leading reads
  "SemicolonToken",
  "CloseBraceToken",
  "OpenBraceToken",
  // conditional / logical / bitwise / comparison / arithmetic operands — a
  // regex body or JSX text mislexed as tokens can never put one of these
  // directly before `process` without the chain also being syntactically
  // `process . env`, which is a real read written in prose at worst.
  "QuestionToken",
  "QuestionQuestionToken",
  "AmpersandAmpersandToken",
  "BarBarToken",
  "BarToken",
  "AmpersandToken",
  "EqualsEqualsToken",
  "EqualsEqualsEqualsToken",
  "ExclamationEqualsToken",
  "ExclamationEqualsEqualsToken",
  "LessThanToken",
  "LessThanEqualsToken",
  "GreaterThanToken",
  "GreaterThanEqualsToken",
  "PlusToken",
  "MinusToken",
  "AsteriskToken",
  "SlashToken",
  "PercentToken",
  "ExclamationToken",
  // arrow bodies and prefix operators
  "EqualsGreaterThanToken",
  "PlusPlusToken",
  "MinusMinusToken",
  // positions only a keyword can occupy
  "ReturnKeyword",
  "AwaitKeyword",
  "YieldKeyword",
  "TypeOfKeyword",
  "InKeyword",
  "OfKeyword",
  "CaseKeyword",
  "DeleteKeyword",
  "DoKeyword",
  "ElseKeyword",
  // `${process.env.X}` inside a template literal (and a subsequent
  // substitution: the token before it is the TemplateMiddle that closed the
  // previous one)
  "TemplateHead",
  "TemplateMiddle",
] as const satisfies readonly string[];

// Fail closed: a typo in an enum name above would put `undefined` in the set
// and silently stop matching that position, which is exactly the class of bug
// this guard exists to catch. Verify every name resolves to a token kind.
const kindByName = K as unknown as Record<string, number | undefined>;
const missingNames = BEFORE_PROCESS_NAMES.filter(
  (n) => typeof kindByName[n] !== "number"
);
if (missingNames.length > 0) {
  console.error(
    `env-guard: unknown SyntaxKind names (fix the script): ${missingNames.join(", ")}`
  );
  process.exit(1);
}
const BEFORE_PROCESS = new Set<number>(
  BEFORE_PROCESS_NAMES.map((n) => kindByName[n]).filter(
    (n): n is number => typeof n === "number"
  )
);

// `.env` on the identifier `process`, accepting optional-chaining (`?.`) at
// either dot — the AST node for `process?.env?.X` is still a member access on
// the bare `process` identifier, which is what the old check matched.
function readAfterProcessEnv(tokens: { kind: number; value: string }[], i: number) {
  // tokens[i] is `process`; caller verified the position.
  const dot = (j: number) =>
    tokens[j]?.kind === K.DotToken || tokens[j]?.kind === K.QuestionDotToken;
  if (!dot(i + 1) || tokens[i + 2]?.value !== "env") return null;
  // process.env.NAME
  if (dot(i + 3)) {
    const name = tokens[i + 4];
    if (name && tokenIsIdentifierOrKeyword(name.kind)) {
      return { name: name.value, next: i + 4 };
    }
  }
  // process.env["NAME"]
  const lb = tokens[i + 3];
  const str = tokens[i + 4];
  const rb = tokens[i + 5];
  if (
    lb?.kind === K.OpenBracketToken &&
    str?.kind === K.StringLiteral &&
    rb?.kind === K.CloseBracketToken
  ) {
    return { name: str.value, next: i + 5 };
  }
  return null;
}

function collect(path: string) {
  const code = readFileSync(`${CLIENT}/${path}`, "utf8");
  const scanner = createScanner(
    /* skipTrivia */ false,
    path.endsWith(".tsx") ? LanguageVariant.JSX : LanguageVariant.Standard,
    code
  );

  // Materialize the significant token stream. The scanner is parser-assisted
  // for two ambiguous characters and needs the same cooperation a parser
  // gives it, or comment and code text bleeds across token boundaries:
  //   - `/` at an operand position (exactly the BEFORE_PROCESS set, plus the
  //     file start) starts a regex literal, not division — reScanSlashToken
  //     folds the whole literal into one opaque token. After a value token
  //     (`a / b`) division cannot be a regex, and the scanner already scans
  //     it as a plain slash.
  //   - a `}` closing a `${...}` template substitution must be rescanned as a
  //     template continuation (reScanTemplateToken); otherwise the backtick
  //     that ends the template starts a fresh token and everything between —
  //     including whole comments — is mis-lexed as code.
  // A `${` substitution is closed by the `}` seen at the same brace depth it
  // opened at, so `${ {a: 1} }` nests correctly.
  const tokens: { kind: number; value: string }[] = [];
  const substitutions: number[] = []; // brace depth at each open `${`
  let braceDepth = 0;
  for (;;) {
    let kind = scanner.scan();
    if (kind === K.EndOfFile) break;
    if (
      kind === K.CloseBraceToken &&
      substitutions.length > 0 &&
      substitutions[substitutions.length - 1] === braceDepth
    ) {
      substitutions.pop();
      kind = scanner.reScanTemplateToken(/* isTaggedTemplate */ false);
    } else if (kind === K.CloseBraceToken) {
      braceDepth--;
    } else if (kind === K.OpenBraceToken) {
      braceDepth++;
    } else if (kind === K.SlashToken) {
      const prevKind =
        tokens.length > 0 ? (tokens[tokens.length - 1]?.kind ?? null) : null;
      if (prevKind === null || BEFORE_PROCESS.has(prevKind)) {
        kind = scanner.reScanSlashToken();
      }
    }
    if (kind === K.TemplateHead || kind === K.TemplateMiddle) {
      substitutions.push(braceDepth);
    }
    if (isTrivia(kind)) continue;
    tokens.push({ kind, value: scanner.getTokenValue() });
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok || tok.kind !== K.Identifier || tok.value !== "process") continue;
    const prev = i === 0 ? null : (tokens[i - 1]?.kind ?? null);
    if (prev !== null && !BEFORE_PROCESS.has(prev)) continue;
    const read = readAfterProcessEnv(tokens, i);
    if (read) {
      add(read.name, path);
      i = read.next;
    }
  }
}

for (const path of SOURCES) {
  if (path.includes(".test.")) continue;
  collect(path);
}

const missing = [...used.keys()].filter((name) => !declared.has(name));
if (missing.length > 0) {
  console.error(
    "process.env reads missing from turbo.json globalEnv (add each, or stop reading it):"
  );
  for (const name of missing) {
    console.error(`  process.env.${name}  (first read in apps/client/${used.get(name)})`);
  }
  process.exit(1);
}

console.log(
  `env-guard: ${used.size} process.env reads, all declared in turbo.json globalEnv`
);
