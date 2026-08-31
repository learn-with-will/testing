# Software Testing Learning Portal

A **frontend-only** Software Testing course: read Markdown lessons, take quizzes, and track
your progress — all in the browser. No sign-up, no backend.

## What this is

The portal shell is built with React 19, Vite, TypeScript, React Router, Tailwind CSS v4,
`marked`, and PrismJS. It renders a **24-lesson curriculum** that takes you from "what is software
testing?" through writing and running your first tests, the testing pyramid, unit tests, fixtures
and parametrization, test doubles (mocks, stubs, fakes, spies), test-driven development, integration
and end-to-end testing, coverage and its limits, flaky tests, property-based and mutation testing,
continuous integration, and a pragmatic testing strategy — ending in an end-to-end capstone. The
principles are stated in a **tool-agnostic** way and made concrete with runnable **pytest** examples.
Every lesson is written in plain, welcoming English and verified against primary sources (see
**Sources** below).

Progress, bookmarks, and quiz scores live in `localStorage` under `testing-learning-*` keys, so
nothing leaves your machine.

## Run it locally

```bash
npm install
npm run dev       # start the dev server
npm run validate  # check lessons, quizzes, and the manifest are consistent
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

## How the content works

The app is **data-driven** — adding a lesson needs no code changes:

1. Write the lesson Markdown in `public/content/<level>/<slug>.md` with YAML front-matter
   (including a `summary`).
2. Add a quiz at `public/quizzes/lesson-NN.json`.
3. Regenerate `public/content/course-manifest.json` from the front-matter (the manifest is
   generated, so it can't drift).

> **Code fences** must declare one of the highlighted languages: `python` (the primary language —
> pytest and the standard library), `bash` (running tests, coverage, and installing tools), or
> `text` (test output, tracebacks, diagrams, small config); see `src/core/prism.ts`.

## Curriculum

**Beginner — foundations & your first tests:** what is software testing? · your first test with
pytest · anatomy of a test · assertions in depth · the testing pyramid · unit tests in practice ·
fixtures & test setup · parametrized tests.

**Intermediate — test doubles, TDD & integration:** test doubles overview · stubs & fakes · mocks &
spies · patching & mock pitfalls · test-driven development · integration testing · coverage & its
limits · testing behavior, not implementation.

**Advanced — production testing & strategy:** end-to-end testing · flaky tests · testing time &
randomness · property-based testing · mutation testing · continuous integration · a pragmatic
testing strategy · capstone: testing a real project.

## Accuracy: no hallucination

Every definition, default, and claim is verified against primary sources. The per-lesson authoring
contract lives in `prompts/testing-authoring-prompt.md`.

**Sources:**

- **pytest** — <https://docs.pytest.org/> — the primary test runner (assertions, fixtures,
  parametrization, `pytest.raises`, `approx`).
- **Python `unittest` & `unittest.mock`** — <https://docs.python.org/3/library/unittest.html> ·
  <https://docs.python.org/3/library/unittest.mock.html> — the standard-library test tools and
  test doubles.
- **Coverage.py** — <https://coverage.readthedocs.io/> — line and branch coverage.
- **Playwright (Python)** — <https://playwright.dev/python/> — end-to-end browser testing.
- **Hypothesis** — <https://hypothesis.readthedocs.io/> — property-based testing.
- **Martin Fowler** — <https://martinfowler.com/> — the Test Pyramid, "Test Double", "Mocks Aren't
  Stubs", and "Eradicating Non-Determinism in Tests" (flaky tests).
- **Gerard Meszaros, _xUnit Test Patterns_** — <http://xunitpatterns.com/> — the canonical test
  double taxonomy (dummy, stub, spy, mock, fake).
- **Kent Beck, _Test-Driven Development: By Example_** — the source for red-green-refactor.
- **_Software Engineering at Google_** — <https://abseil.io/resources/swe-book> — test sizes
  (small/medium/large) and testing at scale (free to read online).

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with
`BASE_PATH=/<repo>/` and publishes `dist/` to GitHub Pages.

---

React 19 · Vite · TypeScript · React Router · Tailwind CSS v4 · marked · PrismJS ·
localStorage.
