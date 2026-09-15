---
name: nacnano.dev
description: A working engineer's personal site — neutral zinc ground, one blue accent, hairline rules instead of cards.
colors:
  accent: "#2556da"
  accent-dark: "#96baf9"
  accent-press: "#1e45b0"
  accent-press-dark: "#c1d5fc"
  ground: "#ffffff"
  ground-dark: "#09090b"
  ink: "#18181b"
  ink-dark: "#f4f4f5"
  ink-body: "#3f3f46"
  ink-body-dark: "#d4d4d8"
  ink-muted: "#52525b"
  ink-muted-dark: "#a1a1aa"
  ink-meta: "#71717a"
  hairline: "#e4e4e7"
  hairline-dark: "#27272a"
  marker: "#d4d4d8"
  marker-dark: "#3f3f46"
  inset: "#fafafa"
  inset-dark: "#18181b"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.022em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.011em"
  item-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.011em"
  lead:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.75rem"
    letterSpacing: "normal"
  meta:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.08em"
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.08em"
  takeaway:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: "2rem"
    letterSpacing: "-0.011em"
rounded:
  DEFAULT: "4px"
  full: "9999px"
spacing:
  gutter: "20px"
  gutter-wide: "32px"
  entry: "20px"
  row: "28px"
  block: "40px"
  page-top: "48px"
  section: "56px"
  hero: "56px"
  page-top-wide: "64px"
  hero-wide: "80px"
  footer: "80px"
components:
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.body}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 14px"
  button-solid-hover:
    backgroundColor: "{colors.ink-body}"
    textColor: "{colors.ground}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-body}"
    typography: "{typography.body}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 14px"
  button-outline-hover:
    textColor: "{colors.ink}"
  button-compact:
    backgroundColor: "transparent"
    textColor: "{colors.ink-body}"
    typography: "{typography.body}"
    rounded: "{rounded.DEFAULT}"
    padding: "6px 12px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.DEFAULT}"
    height: "44px"
    width: "44px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-meta}"
    typography: "{typography.body}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 10px"
  nav-link-active:
    textColor: "{colors.accent}"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "28px 0"
  list-row-hover:
    textColor: "{colors.accent}"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.ink-meta}"
    typography: "{typography.label}"
  status-dot:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    height: "6px"
    width: "6px"
---

# Design System: nacnano.dev

## Overview

**Creative North Star: "The Standing Exit"**

This is the category standard executed straight: a working engineer's personal site where the name, the current status and the writing are all legible in one viewport. Four derived visual worlds were dealt and all four were declined in favour of the convention done properly — no ironic framing, no smuggled quirk. The craft bar is brianlovin.com and rauchg.com: app-like structural clarity, tight restrained typography, a neutral scale with a single accent, and everything exactly where a visitor expects it. The system's ambition is in its precision, not in its invention.

The material is thin. A neutral zinc ground — pure white or near-black, never tinted — carries a single blue accent used sparingly enough that a reader notices it. Structure comes from 1px hairline rules, not from cards: list rows are separated by a divider and nothing else, with no border, no fill, no shadow and no corner around them. There is exactly one elevation step in the whole system and only one floating control uses it. Depth is conveyed by rule, rhythm and ink weight.

Type does the hierarchy. Inter carries everything readable; the platform mono stack carries every date, reading time, count and period, always at 12px uppercase with tabular numerals so metadata rails line up in columns. Optical tracking tightens twice — hard at headline sizes, lightly at the 15–17px semibold step — and opens out to +0.08em for micro-labels. Running prose never exceeds a 68ch measure. Light and dark are the same build, not a palette and its afterthought; every color decision in this file is a pair.

**Key Characteristics:**

- Neutral zinc ground with exactly one accent hue, in one light value and one dark value
- Hairline rules and dividers instead of cards, panels or tinted surfaces
- One elevation step, reserved for a single floating overlay control
- Inter for everything read; platform mono with tabular numerals for every date, duration and count
- A 48rem single column with a 68ch measure for running prose
- One 4px radius everywhere; full-round reserved for genuinely circular objects
- 44px minimum target on every icon control; one keyboard-only focus ring for the whole site

## Colors

A neutral zinc scale carrying one blue accent, paired light-and-dark at every role.

### Primary

- **Signal Blue** (`{colors.accent}` light / `{colors.accent-dark}` dark): The only chromatic voice in the system. It appears on the active navigation item, on an item title while its row is hovered, on link hover in prose and in the footer, and as the 6px status dot beside the availability line on the home and about pages. It never fills a surface larger than that dot and it never appears as a background behind text.
- **Signal Blue Pressed** (`{colors.accent-press}` light / `{colors.accent-press-dark}` dark): The hover value for links inside long-form prose, one step further from the ground than the resting link color so hover reads as commitment rather than as a second color.

### Neutral

- **Paper** (`{colors.ground}`) / **Graphite Ground** (`{colors.ground-dark}`): The page. Pure white and near-black; both are also the browser theme-color, so the address bar belongs to the system rather than to the UA.
- **Full Ink** (`{colors.ink}` / `{colors.ink-dark}`): Headings, item titles, wordmark, and the fill of the solid button. The strongest ink on the page and the one that survives a squint test.
- **Reading Ink** (`{colors.ink-body}` / `{colors.ink-body-dark}`): Long-form prose body, timeline organisation lines, and the resting color of icon controls.
- **Quiet Ink** (`{colors.ink-muted}` / `{colors.ink-muted-dark}`): Summaries, descriptions, positioning paragraphs — anything supporting rather than leading.
- **Metadata Ink** (`{colors.ink-meta}`): Dates, reading times, counts, tags and stack labels. Sits one step below Quiet Ink in light; in dark it collapses into Quiet Ink rather than going dimmer, because the dark ground has less headroom.
- **Hairline** (`{colors.hairline}` / `{colors.hairline-dark}`): Every rule, divider and outline-button border in the system. This one value carries nearly all of the structure.
- **Marker** (`{colors.marker}` / `{colors.marker-dark}`): Timeline dots, link underline decoration, scrollbar thumb, and the separator glyph between tags. Non-structural furniture that should be present but never counted.
- **Inset** (`{colors.inset}` / `{colors.inset-dark}`): The letterbox behind a contained project thumbnail. The only tinted surface in the system, and only ever behind an image.

### Named Rules

**The One Accent Rule.** There is one accent hue and two values of it: `{colors.accent}` on light surfaces, `{colors.accent-dark}` on dark. It is allowed on active nav, hovered item titles, link hover, and the status dot — nothing else. A second hue is a defect, not a variation. Test: if you can point at two distinct chromatic colors on a screen (syntax-highlighted code excepted), the rule is broken.

**The Paired-Theme Rule.** No color is declared without its counterpart. Light and dark are both first-class; the theme is class-based and defaults to the system preference, so either one is the visitor's real first impression. Every surface must pass 4.5:1 for body text and 3:1 for large text in both themes — the shipped build measures 0 failures across all five routes in both themes, and that is the floor, not the achievement.

**The Untinted Ground Rule.** Backgrounds are `{colors.ground}` or `{colors.ground-dark}`. A tinted surface is permitted only as a letterbox behind a contained image. Do not introduce grey panels, cards or callout fills to create hierarchy — that is the hairline's job.

## Typography

**Display / Body Font:** Inter (with `ui-sans-serif`, `system-ui`, `sans-serif`), self-hosted via `next/font` with `display: swap`
**Label/Mono Font:** the platform mono stack — `ui-monospace`, `SFMono-Regular`, `SF Mono`, `Menlo`, `Consolas`

**Character:** One neutral grotesque doing all the reading, with the machine's own monospace reserved for anything countable. The pairing is deliberately unremarkable at a glance; its quality lives in the tracking and in the fact that every number in the site lines up vertically.

### Hierarchy

- **Headline** (600, 1.75rem → 2.125rem at ≥640px, 1.2, -0.022em): The `h1` of every route, home included — the greeting, essay titles, Projects, About, 404. One per page, never repeated inside a page. There is deliberately no larger display step: the home page greets rather than announces, and the author's photo, not the type size, does the introducing.
- **Title** (600, 1rem, -0.011em): Section headings — Writing, Work, Education. Deliberately close to body size; a section heading earns its rank from the hairline above it and the space around it, not from scale.
- **Item Title** (600, 1.0625rem, 1.75rem line, -0.011em): The clickable title in a list row — essay, project, adjacent-essay link. The only text in a row that changes color on hover.
- **Lead** (400, 1.0625rem, 1.75): The positioning paragraph under a display or headline. One per page, capped at the measure.
- **Body** (400, 0.9375rem, 1.75rem line): Summaries, descriptions, secondary prose. Long-form MDX prose runs at the typographic plugin's own scale with the same ink and measure.
- **Meta** (mono, 0.75rem, uppercase, +0.08em, tabular numerals): Dates, reading times, essay counts, timeline periods, status line. Always mono, always uppercase, always tabular.
- **Label** (0.75rem, uppercase, +0.08em, sans): Tags, tech-stack entries, and the Older/Newer row labels. Same size and tracking as Meta but in Inter, because these are words rather than figures.
- **Takeaway** (500, 1.125rem, 2rem line, -0.011em): The single earned closing line of an essay, authored as an `h4` in MDX. Separated from the essay by space and a weight step alone — no rule above it and no label.

### Named Rules

**The Tabular Metadata Rule.** Every date, duration, count and period renders in the mono stack at 0.75rem, uppercase, +0.08em, with `font-variant-numeric: tabular-nums` applied globally to `time` and `.tabular`. Metadata rails are columns, and columns only work if the digits are the same width. Test: two stacked rows with different dates must have their month, day and year at the same x-position.

**The Two-Step Tightening Rule.** Letter-spacing tightens to -0.022em at headline and display sizes and to -0.011em at the 15–17px semibold step; everything else sits at normal. Micro-labels are the only text that opens out, to +0.08em. There is no third tightening value — pick the step that matches the size, don't interpolate.

**The Measure Rule.** Running prose is capped at 68ch (`max-w-measure`). The 48rem column is wider than the measure on purpose: metadata rails and list rows use the full column, paragraphs do not.

**The No-Eyebrow Rule.** A heading stands on its own. Do not place a small uppercase kicker, eyebrow or category label above a heading to introduce it — not above an essay's closing line, not above an error page's title, not above a section. If a label seems necessary, the heading is not doing its job. Uppercase micro-type is for metadata rails and tags only.

## Layout

A single centred column at `max-w-3xl` (48rem) with a 20px gutter that opens to 32px at ≥640px. There is no grid and no sidebar; the page is one column from the header rule to the footer rule, and the body is a flex column at `min-h-screen` so the footer sits at the bottom of short pages.

Horizontal structure inside that column is always the same shape: a fixed-width metadata rail beside a fluid content block, stacking to a single column below 640px. The essay row uses a 9rem rail for the date; the adjacent-essay row uses a 3.5rem rail for its label; the project row uses an 11rem rail for the thumbnail; the timeline uses a 1.75rem indent for its dot and vertical rail. Below `sm` every one of these collapses to stacked blocks with a 8–16px gap rather than shrinking.

The vertical rhythm is coarse and consistent: 20px for the header band and a timeline entry, 28px for a list row, 40px between blocks inside a page, 48px → 64px for the top of an interior page, 56px → 80px for the home hero, 56px between major about-page sections, 80px above the footer. Responsive change is a step, not a fluid interpolation — sizes and paddings jump once at 640px and hold.

Motion is minimal and honest: `transition-colors` on interactive text and borders, smooth scroll on the root element, and a global `prefers-reduced-motion` block that reduces every animation, transition and scroll behaviour to effectively instant.

### Named Rules

**The One Column Rule.** Every route is one 48rem column. Do not introduce a multi-column grid, a sidebar, or a masonry of cards. Lateral structure is a metadata rail against content, and it collapses to stacked blocks on mobile.

**The Step-Not-Slide Rule.** Responsive change happens at the 640px breakpoint as a discrete step. No `clamp()` type, no fluid padding. A layout should be one of two known states, not an infinite family of them.

## Elevation & Depth

This system is flat. Depth comes from hairline rules, vertical rhythm and ink weight — there is no layered surface language, no tonal card ramp, and no resting shadow anywhere on any page. Exactly one shadow token is declared, and it is used by exactly one component: the scroll-to-top control, which genuinely floats over scrolling content and needs to read as detached from it.

### Shadow Vocabulary

- **Raise** (`box-shadow: 0 1px 2px 0 rgb(9 9 11 / 0.06), 0 4px 12px -2px rgb(9 9 11 / 0.08)`): A real contact shadow plus a soft ambient one, tinted with the dark ground rather than pure black. For overlay controls that float above the document. Nothing that sits in the document flow gets it.

### Named Rules

**The One Step Rule.** There is a single elevation token and it belongs to floating overlay controls. If a new surface wants a shadow, the correct answer is almost always a hairline rule and more space. A second shadow value is a new system, not a variation on this one.

**The Flat Document Rule.** Anything in normal flow — list rows, sections, headers, footers, images, buttons — is flat at rest and flat on hover. Hover feedback is a color change, never a lift, never a shadow, never a transform.

## Shapes

One radius: 4px, applied to buttons, nav items, focusable link targets, image frames and code-title bars. Full-round (`{rounded.full}`) is reserved for objects that are genuinely circular — the status dot, timeline markers, the avatar, the scroll-to-top button and the scrollbar thumb. There is no soft-UI middle ground; a rectangle gets 4px and a circle gets a circle.

Borders are always 1px and always Hairline. They appear as: the rule under the header and above the footer, the divider between sibling list rows, the rule that opens a section, the outline of the secondary button, and the frame around a project thumbnail. The vertical rail behind the timeline is the same idea rotated — a 1px line spanning only the entries, never the disclosure button below them.

Icons are drawn SVG on a 24px viewBox at `stroke-width: 1.5` with round caps and `currentColor`, sized 16–20px inside a 44px target. Social marks are the one exception, rendering as filled brand paths at 20px.

### Named Rules

**The Hairline-Not-Card Rule.** Separation between sibling items is a 1px `{colors.hairline}` divider and nothing else. Do not wrap a list item in a border, a background, a corner radius or a shadow to make it feel like an object. The essay list, the project list, the timeline and the adjacent-essay navigation all share this one grammar; a new list must join it.

**The Drawn Icon Rule.** Every icon is inline SVG at stroke-width 1.5 in `currentColor`. Never a Unicode glyph, never an emoji, never an icon font, never a raster image standing in for an icon.

## Components

### Buttons

- **Shape:** A soft rectangle (4px radius) at every size. Never pill-shaped.
- **Solid (primary):** Full Ink fill with Paper text, 8px/14px padding, 0.875rem at weight 500. Inverted in dark — near-white fill, near-black text. One per view, on the single most likely next action: Résumé in the home hero, Full résumé on About, All essays on the 404.
- **Outline (secondary):** Transparent with a Hairline border and Reading Ink text, same 8px/14px padding. Used for every other action in the same cluster.
- **Compact outline:** Same treatment at 6px/12px, for actions that sit under content rather than beside a headline — the post-footer links and the timeline disclosure.
- **Hover:** Solid darkens/lightens one ink step; outline brightens its text to Full Ink and its border to Marker. Both animate `colors` only.
- **Icon:** A 44×44px transparent hit area with a 16–20px stroked glyph at Reading Ink, brightening to Full Ink on hover. Theme switch, menu open/close, scroll-to-top and the social row all use it.

### Chips / Tags

- **Style:** Not chips. Tags render as bare uppercase micro-labels in Metadata Ink at 0.75rem / +0.08em, separated by a `·` generated on the pseudo-element of every item but the first. No background, no border, no radius, and no link.
- **State:** There is no selected state — tags on this site are descriptive metadata, deliberately not navigation.

### Cards / Containers

- **There are no cards.** The list row is the container primitive: 28px of vertical padding, a top divider from its sibling, and no other boundary. A project thumbnail is the only framed object — a 4px-radius Hairline frame with an Inset letterbox, `object-contain` so the crop lives on the image rather than on the anchor.

### Inputs / Fields

There is exactly one form on the site — the ask box on `/ama` — and one field material, the `.field` class. It is the outline button's material: Hairline 1px border, 4px radius, transparent ground, Reading Ink text, `caret-color` bound to the focus ring variable, and the global focus ring as its only focus treatment. Border brightens to Marker on focus, the same one-step move the outline button makes on hover.

`@tailwindcss/forms` ships a blue ring of its own on fields and blanks the outline to make room for it. `.field` undoes both, so a focused field is indistinguishable from any other focused control on the site. A second focus treatment is a defect, not a variation.

Every field carries a visible `<label>` above it — a placeholder is never the label. The result of a submission is announced in an `aria-live="polite"` region that is in the DOM before the submit, including the pending state; a submit that appears to do nothing is how a form like this usually breaks.

### Navigation

- **Header:** A 20px band closed by a hairline rule. Left is the 36px logo plus the short name at 0.9375rem/600; right is the nav, theme switch and mobile trigger. Nav items are 0.875rem in Metadata Ink, brightening to Full Ink on hover; the active route goes weight 500 and Signal Blue and carries `aria-current="page"`.
- **Mobile:** Below 640px the nav is replaced by a 44px menu button opening a full-screen dialog on the opaque ground, with items at 1.125rem/500 separated by dividers. The closed panel is removed from the DOM entirely rather than hidden, so its links never sit in the tab order behind the page; focus is trapped and Escape returns focus to the trigger.
- **Footer:** Mirror of the header — a hairline rule above, an 80px gap before it, a copyright line with underlined links, and the social icon row.

### The Status Line

The signature component. A 6px Signal Blue dot followed by one line of mono uppercase micro-type stating current availability, sitting directly under the name on both the home and about pages. It is the system's only use of the accent as a fill, and the reason is that it is the one fact the site exists to make unmissable.

### The Metadata Rail

The second signature. Every list row leads with a fixed-width rail of mono, uppercase, tabular metadata — a date, a label, a period — against a fluid content block. It is what makes five unlike lists (essays, projects, work history, education, adjacent essays) read as one system.

### Named Rules

**The Stretched Row Rule.** A list row is one link. The anchor wraps the title and contains an absolutely positioned `inset-0` overlay so the entire row is the target, with one accessible name and no nested anchors. Hover feedback is the item title turning Signal Blue, driven from the row's `group`.

**The 44px Target Rule.** Every icon-only control is 44×44px regardless of the glyph inside it, negative-margined to keep its optical alignment. A 20px icon is not a 20px button.

**The One Focus Ring Rule.** A single `:focus-visible` treatment — 2px solid in the accent (600 light / 300 dark), 2px offset, 2px radius — applies to every focusable element on the site. It is keyboard-only by construction. Do not add a per-component focus style, and do not remove it.

## Do's and Don'ts

### Do:

- **Do** separate sibling items with a 1px Hairline divider and 28px of padding — the Hairline-Not-Card Rule. A new list joins the existing grammar.
- **Do** lead every list row with a fixed-width mono metadata rail, uppercase at +0.08em with tabular numerals, collapsing to a stacked block below 640px.
- **Do** spend the accent on exactly four things: active nav, hovered item title, link hover, status dot.
- **Do** ship every color as a light/dark pair and verify 4.5:1 body / 3:1 large in both themes before calling a surface done.
- **Do** cap running prose at the 68ch measure even though the column is 48rem wide.
- **Do** give every icon-only control a 44×44px hit area and draw its glyph as inline SVG at stroke-width 1.5 in `currentColor`.
- **Do** make one action per view the Solid button and everything beside it an Outline button.
- **Do** step layout once at 640px and hold; use discrete breakpoint values rather than `clamp()`.

### Don't:

- **Don't** put a kicker, eyebrow or uppercase category label above a heading. Uppercase micro-type belongs in metadata rails and tags, never as a heading's introduction.
- **Don't** wrap a list item in a card — no border, no fill, no radius, no shadow around a row.
- **Don't** add a second shadow value. There is one elevation token and it belongs to floating overlay controls; in-flow surfaces are flat at rest and flat on hover.
- **Don't** introduce a second accent hue, or use the accent as a background behind text.
- **Don't** tint a background. Grounds are pure white or near-black; the one permitted tint is a letterbox behind a contained image.
- **Don't** use a Unicode glyph, emoji or icon font in place of a drawn SVG icon.
- **Don't** set a date, duration, count or period in the sans face, or without tabular numerals.
- **Don't** add a per-component focus style or suppress the global focus ring.
- **Don't** express hover as a lift, scale or transform. Hover is a color transition.
- **Don't** invent a third letter-spacing step between -0.022em and -0.011em.
