# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — someone who already has a reason to be curious about Nac.** They met the author, worked with them, read something they wrote, or followed a link the author posted. They are not evaluating anyone; they want to know what this person is like. Their job is to come away with a sense of a person, not a summary of one. Usually on a phone, and willing to stay longer than a recruiter would if the site gives them a reason to.

**Secondary — a reader landing on a single essay from social.** Arrives mid-site with no context about the author. Their job is to finish the piece and then decide whether the person behind it is worth knowing.

**Tertiary — a returning reader** checking whether anything new has appeared.

Explicitly **not** a target: the recruiter doing a sixty-second screen. Confirmed by the author 2026-09-16 — this site is a reflection of himself, not a hiring document. `resume.nacnano.dev` exists and does that job; this site links to it once, from About, and owes it nothing further.

## Product Purpose

A personal website that publishes Chotpisit Adunsehawat's ("Nacnano") reflective personal essays and, around them, gives an honest and enjoyable picture of the person who wrote them.

Confirmed direction (2026-09-16): **personal and unguarded, for people who want to know the author.** The earlier brief — "the credible front door for a new graduate looking for work" — is retired. The name and the writing stay; the pressure to prove employability does not. Where an earlier decision optimised for a stranger's snap judgement, it should be re-examined rather than inherited.

Success = someone who already wanted to know Nac finds something here they didn't expect and stays past the first page; a first-time essay reader finishes the piece, knows whose it was, and wants to read another.

## Positioning

Personal essays as evidence of how the author thinks, not as a technical blog. The writing is reflective and non-technical — missing a scholarship, a dating app, a stranger's family dinner, failing at teaching — while the author's professional life is technical and dense. That tension is the site's actual character. It should be designed _for_, and neither side hidden: the CV is not the point, but pretending it doesn't exist would be its own kind of posturing.

The author writes infrequently and the site says so plainly rather than implying an abandoned feed. (Newest post is 2023-12-12, presented under a heading reading "Writing" with the line "I write rarely.")

## Operating Context

- Visitors arrive predominantly on mobile, in Thailand and internationally.
- Content is bilingual in practice: several published essays contain long Thai passages inside an English-declared document. This is authorial voice, not a defect to normalise.
- The site is linked from the author's public repo, and each post links visitors back to it — the codebase is part of the impression.
- `resume.nacnano.dev` is a separate, already-deployed property and is the canonical CV. It is linked once from About and is not a goal of this site.

## Capabilities and Constraints

- Next.js 16 App Router (Turbopack), React 19, TypeScript (strict), Tailwind CSS, MDX via `next-mdx-remote`, `next-themes`. Bun workspaces + Turborepo monorepo; this app is `apps/client`.
- Statically generated; no auth and no comments. Two optional Upstash-backed runtime data paths, both off unless `UPSTASH_REDIS_REST_*` is set: the activity feed (`/activity`) and the `/ama` ask box, which writes to a **private** inbox nothing renders (announced to the author over an optional webhook or Discord bot). Every page is still prerendered from files in the repo, and nothing a visitor submits reaches a page without the author writing it up by hand.
- Existing routes: `/`, `/blogs/[...slug]`, `/projects`, `/activity`, `/ama`, `/about`, `/link`, `/link/[link]`, plus the generated `/feed.xml`, `/ama/rss.xml` and `/sitemap.xml`. `/blogs`, `/tags`, `/tags/[tag]` and `/blog/:slug` are permanent redirects (see `next.config.js`). Whether `/link` still earns its place is open.
- Dark mode is complete and correct across every surface; `theme-provider` defaults to `system`. A working asset to preserve.
- MDX pipeline supports GFM, heading anchors/autolinks, and Prism syntax highlighting. Math (KaTeX) and citations were dropped with contentlayer — no published post used them.
- Sitemap and **two** RSS feeds are generated at postbuild: `/feed.xml` for essays and `/ama/rss.xml` for answered questions. Separate on purpose — following the writing is not the same subscription as being told when a question gets answered.

### Known gaps

- The document declares `lang="en-us"` for every page (`app/layout.tsx`) and the font stack carries no Thai face, so the Thai passages inside essays are rendered by whatever the OS picks and read aloud in an English voice.
- `seo.tsx` falls back to the same author photo for every URL; there is no per-post Open Graph image, so every essay ever shared has looked identical in a preview.
- `siteMetadata.status` is still defined, documented and required by the `SiteMetadata` type, but no component reads it — the Status Line it fed was removed from both the home and about pages. It is dead config.

## Brand Commitments

- Name: **Nacnano** (handle) / **Chotpisit Adunsehawat** (full name). Both are load-bearing; the site carries the real name, not only the handle.
- Voice: first-person, reflective, unguarded, frequently self-critical. Each essay closes on a single earned takeaway line — an authored convention the author invented and the design honours with its own type step. It is the best writing on the site and deserves to do more work than it currently does.
- Thai/English code-switching inside essays is authentic and must be preserved, not normalised away.
- **Standing visual preference (chosen 2026-09-13, unchanged):** the category standard, executed straight — no ironic framing and no smuggled quirk. The named craft bar is **brianlovin.com and rauchg.com**: app-like structural clarity, tight restrained typography, a neutral scale with a single accent. This was deliberately chosen over four derived visual worlds and is not re-opened as a concept exercise.
  - **Open tension, needs the author's call:** the new brief asks the site to be fun, and the standing preference forbids visual quirk. The working resolution is that _the content_ may be playful and the _system_ stays restrained — the delight comes from what's on the page, not from decoration. Anything that wants to break the visual system needs an explicit decision first.
- Theming stays **system-default**, with light and dark built to the same standard rather than one being an afterthought.
- Existing logo at `public/static/images/logo.png` (currently 3.5 MB at 1928×1928 — the asset is committed, its encoding is not).

## Evidence on Hand

**Real, in-repo:**

- 5 published essays in `src/data/blogs/`: `disappointed-moment`, `dating-app`, `random-dining`, `towrite-list`, `teaching-failure`. `towrite-list` is a post about the things the author hasn't written yet.
- Real shipped projects in `src/data/projectsData.ts` with live URLs and screenshots.
- Author photo `oong-oong-cropped.jpg`; profiles for GitHub, LinkedIn, Twitter/X, Facebook, YouTube, Instagram, LINE, Discord and MyAnimeList — the last three are the kind of detail this brief is for.
- `siteMetadata.now`: "Bangkok. Football, badminton, wandering, too many half-written drafts." Currently one line on About; it is the clearest statement of the site's voice anywhere in the repo.

**Real, external — `resume.nacnano.dev`, canonical for roles and dates.** B.Eng. Computer Engineering, Chulalongkorn University. Roles at SCB, QuanXAI, SCBX, JAIST, Ayasan, the People's Party, Agoda, Wang Data Market and MonkeyEveryday. Languages: Thai (native), English (professional), Chinese (elementary). The site is not obliged to present any of this prominently, but what it does present must match.

**Known-stale, must not be treated as truth:** `src/data/timelineData.ts` contradicts the résumé on multiple facts — GPA and semester count, omitted roles, a mislabelled title, and roles marked "Present" that have ended. Less commercially urgent under this brief, but a site about being honest should not contain wrong facts. Reconcile against `resume.nacnano.dev`, not the reverse.

**Must not be fabricated:** no testimonials, no invented metrics, no employers or dates not on the résumé.

## Product Principles

1. **Show the person, not the profile.** Every surface is judged on whether a stranger comes away with a sense of someone rather than a list of attributes.
2. **The essays are the product.** Everything else on the site exists to lead into them or out of them.
3. **Subtract before adding.** The site's historical problems are duplication and residue. Removal is still the primary tool; a new page must earn its place against deleting an old one.
4. **Be honest about cadence, and about the unfinished.** Infrequent writing is stated plainly. Half-written things are more revealing than polished ones and do not need an apology.
5. **The repo is part of the impression.** Visitors are sent to it from every post; stubs, dead config and template leftovers are user-facing.

## Accessibility & Inclusion

- Target WCAG 2.1 AA in both themes. The shipped palette measures 0 contrast failures across all routes in both themes; that is the floor, not the achievement.
- Thai-language runs inside English documents require correct `lang` attributes and a Thai-capable font in the stack. **Neither exists today** — this is the single largest accessibility gap and it sits directly on the site's most personal content.
- Keyboard operability is a hard requirement: one global `:focus-visible` treatment, no per-component focus styles, and no focusable element hidden behind a closed panel.
- Mobile-first: the primary visitor is on a phone, and the About timeline is the densest surface on a 375px screen.
