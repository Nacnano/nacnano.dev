# tsconfig

Shared TypeScript configs for every app in this workspace.

- `base.json` — the defaults, `strict: true`.
- `nextjs.json` — Next.js apps. `strict` and `noUncheckedIndexedAccess` are on.
- `react-library.json` — for any shared UI package.

## Policy

**Strict is the contract, and it lives here — not per-app.** `nextjs.json` sets
`strict: true` and `noUncheckedIndexedAccess: true` for every consumer. Do not
relax them in this preset; if an app genuinely needs an escape hatch, opt out in
that app's own `tsconfig.json`, never here. A loosening here silently reopens
type holes across the whole workspace, which is exactly how `tsc --noEmit`
stopped meaning "strict."

`target` is `ES2022`, and `lib` includes `esnext`. Some code relies on that:
e.g. `.at(-1)` in `readActivityFeed` needs the `es2022` lib entry. `target` and
`lib` are coupled in spirit — lowering `target` and assuming `.at()` (and friends)
still type-checks will not hold.