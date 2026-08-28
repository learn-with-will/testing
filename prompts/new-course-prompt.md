# Build a New Learning-Portal Course

## TOPIC: Software Testing

> **This repo is `learn-with-will/testing`** — so `SLUG` = `testing`, and the finished course goes live at
> `https://learn-with-will.github.io/testing/`.

Testing software well — the testing pyramid, unit / integration / end-to-end tests, test-driven development (TDD), test doubles (mocks, stubs, fakes, spies), assertions & fixtures, coverage and its limits, flaky tests, and a pragmatic testing strategy. Teach language-agnostic principles with concrete, runnable examples in one mainstream stack.

**Notes for this topic**
- **PRISM_LANGS**: one primary example language + its test runner, plus `bash` and `text`. State the principles as tool-agnostic; use the chosen stack only to make them concrete.
- Category: a new **Quality** (or reuse **Software Design**).

This session is connected to the (empty) GitHub repo I chose for this course. From just the
TOPIC above, **decide every other detail yourself** and build a complete course micro-app that
matches my existing family (Angular, Redis, Data Science…), push it, and publish it to GitHub
Pages. Owner is the org **learn-with-will**; it goes live at `https://learn-with-will.github.io/<SLUG>/`.

## Derive everything from TOPIC (don't ask me — pick sensible defaults)
- **SLUG** — the topic's common lowercase name, kebab-case (`mongodb`, `aws`, `golang`, `kotlin`); repo + Pages path.
- **THEME_HEX / ACCENT_HEX** — the topic's official brand color as the 500 anchor, plus a related lighter accent for the gradient.
- **BRAND_ICON** — a 1–3 char monogram. **DIFFICULTY** — the course's entry level (usually Beginner).
- **CATEGORY** — reuse an existing one (Frontend, Backend, Language, Database, DevOps, Architecture, Version Control, Cloud, Data Science) or invent a fitting new string (it auto-appears in the portal filter).
- **TECHNOLOGIES** (3–4 chips) / **CARD_TAGS** (5–7) / **TAGLINE** — from the topic's ecosystem.
- **SCOPE** — default to *fundamentals + hands-on for a newcomer*, define every term, one analogy per lesson.
- **PRISM_LANGS** — the languages the topic's code actually uses (+ always `text`).
- **SOURCES** — the official/primary docs and canonical books/specs for the topic; cite these, invent nothing.
- **CURRICULUM** — design 24 lesson slugs, 8 beginner / 8 intermediate / 8 advanced, fundamentals → core hands-on → advanced/production + a capstone, each building on the last.

**Briefly list these derived choices and the 24-lesson outline, then build the whole course end-to-end
(steps below) without waiting for my approval.**

## The shell (reuse it, don't redesign)
Standalone static app: React 19 + Vite 6 + TS + React Router 7 + Tailwind v4 + marked + PrismJS.
Lessons = Markdown in `public/content/{beginner,intermediate,advanced}/`, quizzes = JSON in
`public/quizzes/`, progress in `localStorage`, manifest-driven (adding a lesson needs no code
change). Ships via `.github/workflows/deploy.yml` (`BASE_PATH=/<repo>/`, `404.html` SPA fallback).

## Steps
1. **Get the shell** — clone my newest course and reuse it as the template:
   `git clone --depth 1 https://github.com/learn-with-will/data-science _shell`
   Copy all of `_shell` into this repo **except** `.git`, `node_modules`, `dist`, `public/content/*`,
   `public/quizzes/*`, `prompts/*`. Delete `_shell`, then `npm install`.
   *(If TOPIC is a frontend framework better built in itself, clone `vue` or `angular` instead.)*
2. **Unique storage keys** ⚠ — every course shares one origin, so `localStorage` is shared; collisions
   bleed progress between courses. Rename:
   - progress key in `src/core/models/progress.ts` → `<SLUG>-learning-progress`
   - theme key in `src/core/context/ThemeContext.tsx` → `<SLUG>-learning-theme`
   - `package.json` `name` → `<SLUG>-learning-portal`
3. **Reskin** — in `src/index.css` retune the `brand-*` ramp so `brand-500 = THEME_HEX` (deepen 600+
   for legible white text) and shift the accent toward `ACCENT_HEX`; rename the logo component +
   `public/favicon.svg` to the official brand mark (monochrome `currentColor`, from simple-icons.org);
   update the wordmark in Navbar/Footer, `index.html` `<title>` + `theme-color`; make `src/core/prism.ts`
   import exactly `PRISM_LANGS`.
4. **Authoring contract** — write `prompts/<SLUG>-authoring-prompt.md`: voice (beginner-friendly, define
   every term, one analogy per lesson, minimal runnable code), the `SOURCES` to cite, a **high-risk-facts
   checklist** for this topic (the things it's easy to get wrong), and the lesson/quiz rules below.
5. **24 lessons (8/8/8)** → `public/content/<tier>/<slug>.md`. Front-matter: `id` (lesson-NN), `slug`,
   `title`, `level`, `order` (1–24), `duration`, `tags` (exactly 5), `summary` (one sentence). Then these
   H1 sections in order: Learning Objectives · Why It Matters · Concept Explanation (### subsections) ·
   Key Terminology · Options and Trade-offs (table) · Worked Example · Real World Analogy · Examples
   (## Example 1/2/3 = basic, real-world, pitfall) · Common Mistakes · Best Practices · Summary ·
   Flash Cards (6 Q:/A:) · Exercises (### Easy/Medium/Challenging) · Further Reading. Fences: only
   `PRISM_LANGS` + `text`.
6. **24 quizzes** → `public/quizzes/lesson-NN.json`: `id` quiz-lesson-NN, `lessonId` lesson-NN,
   `passingScore` 60, 5–6 questions across all five types (single-choice, multiple-choice, fill-blank,
   ordering, match-pair), each with an `explanation`, every answer traceable to the lesson.
7. **Manifest** — generate `public/content/course-manifest.json` from the front-matter `summary`, 24
   entries ordered 8/8/8.
8. **Validate + build** — check 24↔24↔manifest, front-matter↔file/order, all H1 sections present, 5 tags,
   ≥5 flash cards, fences ∈ `PRISM_LANGS ∪ {text}`, quiz schema per type. Then
   `BASE_PATH=/<SLUG>/ npm run build` (`tsc -b` must be clean). `npm run preview` and smoke: index,
   manifest (24), a lesson `.md`, a quiz `.json`, favicon, and a deep link via `404.html` — all 200.
9. **Ship** — commit + push to `main`; the Actions workflow builds and deploys. Enable Pages on the
   Actions source once: `gh api -X POST repos/learn-with-will/<SLUG>/pages -f build_type=workflow`
   (or tell me to flip Settings → Pages → Source: GitHub Actions). When the run is green, smoke the
   **live** URL the same way.
10. **Portal card** — the landing page lives in a **separate** repo (`ThachThanhThien/LearningPortal`,
    `index.html`), so **output a ready-to-paste snippet** for me to add there: one `COURSES` entry plus a
    `LOGOS['<SLUG>']` inline monochrome SVG.
    ```js
    { id:'<SLUG>', title:'<TOPIC>', description:'<TAGLINE + what the 24 lessons cover>',
      url:'https://learn-with-will.github.io/<SLUG>/', difficulty:'<DIFFICULTY>', category:'<CATEGORY>',
      tags:[<CARD_TAGS>], technologies:[<TECHNOLOGIES>], themeColor:'<THEME_HEX>', icon:'<BRAND_ICON>',
      estimatedHours:40, topics:24, isNew:true, isFeatured:true }
    ```

## Rules that make it trustworthy
- **Cite primary sources** (official docs first). If a claim isn't backed by one, don't write it —
  qualify or omit. No invented versions, benchmarks, or "fastest/best" claims; say "as of writing."
- **Brand marks:** simple-icons removed Microsoft/Azure marks — for those, pin `simple-icons@11.14.0`
  (jsDelivr) or draw a custom mark.

## Done when
Pushed to `learn-with-will/<SLUG>`; workflow green; live at `.../<SLUG>/`; live smoke passes (index,
manifest 8/8/8, a lesson, a quiz, favicon, deep-link→404) all 200; 24 lessons + 24 quizzes + manifest;
validator clean; `tsc -b` clean; reskinned with unique storage keys; authoring contract in `prompts/`;
portal `COURSES` + `LOGOS` snippet produced.
