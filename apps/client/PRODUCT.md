# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — the recruiter or hiring contact arriving from a link.** Reaches the site from `resume.nacnano.dev`, a GitHub profile, or a LinkedIn message. Usually on a phone, usually inside a minute. Their job is to decide whether this person is worth a conversation. They need a name, a current status, and evidence, fast.

**Secondary — a reader landing on a single essay from social.** Arrives mid-site with no context about the author. Their job is to finish the piece and decide whether the author is worth following.

**Tertiary — a returning reader** checking whether anything new has been published.

The site currently serves none of these well: the author's name is hidden below the `sm` breakpoint, and no link to the résumé exists anywhere in the codebase.

## Product Purpose

A personal website that does two jobs at once: publish Chotpisit Adunsehawat's ("Nacnano") reflective personal essays, and act as the credible front door for someone who has just graduated and is looking for work.

Confirmed direction (2026-09-13): **personal, but named.** The essays remain the point of the site and the reflective voice is preserved — but the anonymity is a defect, not a style. The author's name, current status, and a findable CV are required. The site should not be restructured into a recruiter-shaped portfolio.

Success = a recruiter who opens the site on a phone learns who this is and reaches the résumé without hunting; a first-time reader finishes an essay knowing whose it was.

## Positioning

Personal essays as evidence of how the author thinks, rather than as a technical blog. The writing is reflective and non-technical (missing a scholarship, a dating app, a stranger's family dinner, failing at teaching) while the CV is technical and dense. That tension is the site's actual character and should be designed _for_, not resolved by hiding one side.

The author writes infrequently and the site should say so plainly rather than implying an abandoned feed. (Confirmed 2026-09-13: newest post is 2023-12-12, presented under a heading reading "Latest".)

## Operating Context

- Visitors arrive predominantly on mobile, in Thailand and internationally.
- Content is bilingual in practice: several published essays contain long Thai passages inside an English-declared document.
- The site is linked from the author's public repo, and each post currently links visitors back to that repo — the codebase is part of the impression.
- `resume.nacnano.dev` is a separate, already-deployed property and is the canonical CV.

## Capabilities and Constraints

- Next.js 16 App Router (Turbopack), React 19, TypeScript (strict), Tailwind CSS 3, MDX via `next-mdx-remote`, `next-themes`. Bun workspaces + Turborepo monorepo; this app is `apps/client`.
- Statically generated; no auth and no comments. Two optional Upstash-backed runtime data paths, both off unless `UPSTASH_REDIS_REST_*` is set: the activity feed (`/activity`) and the `/ama` ask box, which writes to a **private** inbox nothing renders (announced to the author over an optional `AMA_NOTIFY_URL` webhook). Every page is still prerendered from files in the repo, and nothing a visitor submits reaches a page without the author writing it up by hand.
- Existing routes: `/`, `/blogs/[...slug]`, `/projects`, `/activity`, `/ama`, `/about`, `/link`, `/link/[link]`. `/blogs`, `/tags`, `/tags/[tag]` and `/blog/:slug` are permanent redirects (see `next.config.js`).
- Dark mode is complete and correct across every surface; `theme-provider` defaults to `system`. This is a working asset to preserve.
- MDX pipeline supports GFM, heading anchors/autolinks, and Prism syntax highlighting. Math (KaTeX) and citations were dropped with contentlayer — no published post used them.
- RSS and sitemap are generated at postbuild. Both currently emit the wrong route prefix (`/blog/` for a `/blogs/` route).
- **Undecided:** whether `/tags` and `/blogs` survive as routes. Nothing is off-limits (confirmed 2026-09-13).

## Brand Commitments

- Name: **Nacnano** (handle) / **Chotpisit Adunsehawat** (full name). Both are load-bearing; the site should carry the real name, not only the handle.
- Existing logo at `public/static/images/logo.png` (currently 3.5 MB at 1928×1928 — the asset is committed, its encoding is not).
- `resume.nacnano.dev` is the canonical CV and the destination for any résumé affordance on this site.
- Voice: first-person, reflective, unguarded, frequently self-critical. Each essay closes on a single earned takeaway line — an authored convention the author invented and the design should honor.
- Thai/English code-switching inside essays is authentic and must be preserved, not normalized away.
- **Standing visual preference (chosen 2026-09-13):** the category standard, executed straight — no ironic framing and no smuggled quirk. The author was offered four derived visual worlds across four rounds and deliberately took the standing exit. The named craft bar is **brianlovin.com and rauchg.com**: app-like structural clarity, tight restrained typography, a neutral scale with a single accent, everything exactly where a visitor expects it, reading as a working engineer's site. Future work inherits this preference; do not re-open it as a concept exercise.
- Theming stays **system-default**, with light and dark built to the same standard rather than one being an afterthought.

## Evidence on Hand

**Real, in-repo:**

- 5 published essays in `src/data/blogs/`: `disappointed-moment`, `dating-app`, `random-dining`, `towrite-list`, `teaching-failure`.
- 5 real shipped projects in `src/data/projectsData.ts` with live URLs: CU Get Rekt, CU Get Reg, CU Intania Open House 2024 (used by 9,000+ students), MWIT29 Archive, and a CS research project.
- Author photo `oong-oong-cropped.jpg`; social profiles for GitHub, LinkedIn, Twitter/X, Facebook, YouTube, Instagram.

**Real, external — `resume.nacnano.dev` (fetched 2026-09-13), canonical:**

- B.Eng. Computer Engineering, Chulalongkorn University. GPA 3.93/4.00 over 7 semesters.
- Data Scientist Intern, SCB (Jan–Apr 2026) — NLP research on FOMC market sentiment.
- AI Engineer, Part Time, QuanXAI (Jan–Mar 2026) — LangChain chatbot, ML fraud detection POC.
- AI Researcher and Technology Risk Intern, SCBX (Aug–Dec 2025).
- AI Researcher Intern, JAIST (Jun–Aug 2025) — LLM mechanistic interpretability, AI safety.
- Software Engineer, Ayasan Holding (May–Jul 2025); Data Engineer, People's Party (Nov 2024–Jun 2025); Software Engineer Intern, Agoda (Jun–Nov 2024); Full Stack Intern, Wang Data Market (Jun–Aug 2023); SWE/Data Analyst, MonkeyEveryday (Mar 2022–Dec 2025).
- Languages: Thai (native), English (professional, IELTS 7.5), Chinese (elementary).

**Status:** graduated; currently seeking work (confirmed by the author 2026-09-13). Most recent role ended April 2026.

**Known-stale, must not be treated as truth:** `src/data/timelineData.ts` contradicts the résumé on multiple facts — it reports GPA 3.98 over 5 semesters (résumé: 3.93 over 7), omits the SCB and QuanXAI roles entirely, mislabels the SCBX title, and marks Ayasan and MonkeyEveryday as "Present" when both have ended. It must be reconciled against `resume.nacnano.dev`, not the reverse.

**Must not be fabricated:** no testimonials, no metrics beyond those above, no employers or dates not on the résumé, no claimed availability terms.

## Product Principles

1. **Name the person before anything else.** Anonymity is the site's central defect; every surface decision is judged first on whether a stranger learns whose site this is.
2. **The essays are the product; the CV is the proof.** Lead with the writing, but never make the credentials hard to reach.
3. **Subtract before adding.** The site's problems are duplication and residue (a blog index identical to the homepage, a tag system of dead ends, 10 template posts). Removal is the primary tool.
4. **Be honest about cadence.** Infrequent writing is stated plainly, never disguised as a live feed.
5. **The repo is part of the impression.** Visitors are sent to it from every post; unfinished stubs and template leftovers are user-facing.

## Accessibility & Inclusion

- Target WCAG 2.1 AA. The current accent (`purple-500`, 3.96:1 on white) and metadata color (`gray-400`, ~2.5:1) both fail it.
- Thai-language runs inside English documents require correct `lang` attributes and a Thai-capable font in the stack; neither exists today.
- Keyboard operability is a hard requirement: there is currently no `:focus-visible` style anywhere in the codebase, the tag toggle is a non-focusable `<div onClick>`, and the closed mobile nav leaves its links in the tab order.
- Mobile-first: the primary user is on a phone, and the About timeline — the densest credential surface — is currently the least legible thing on a 375px screen.
