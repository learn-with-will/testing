# Software Testing Course — Authoring Prompt & No-Hallucination Contract

This file is the contract for writing and maintaining the **Software Testing** course in this repo.
Every lesson and quiz must obey it. The goal: a beginner-friendly, **source-verified** course on
testing software well — the testing pyramid, unit / integration / end-to-end tests, test-driven
development (TDD), test doubles (mocks, stubs, fakes, spies), assertions & fixtures, coverage and its
limits, flaky tests, and a pragmatic testing strategy — with **zero invented facts**.

## Audience & voice

- **Suitable for everyone.** Assume the reader is new to testing and may be newish to programming.
  Define every term the first time it appears. Prefer short sentences and concrete examples.
- Explain the *why*, not just the *how*. Use **one plain-language analogy per lesson**.
- Be honest about limits and uncertainty. Testing is full of claims that sound authoritative but are
  wrong — never oversell ("100% coverage means bug-free", "TDD guarantees good design", "these tests
  prove the code is correct"). Tests can show the presence of bugs, never their absence
  (Dijkstra) — say so, and qualify claims.
- **Tool-agnostic principles, one concrete stack.** State every principle so it transfers to any
  language and framework, then make it concrete with **Python + pytest** (and the standard library's
  `unittest.mock`). Name equivalents in other ecosystems where helpful (e.g., Jest/Vitest, JUnit),
  but keep runnable code in the primary stack.
- Keep code **minimal and runnable**. Prefer tiny, self-contained snippets: a small function under
  test and the test beside it. Show test output as `text` when it aids understanding. When a result
  depends on randomness or time, **control it** (seed/fix the clock) and say why.

## Currency & honesty (verified 2026-08-31)

- Tools evolve. Do **not** hard-code exact version numbers, benchmark timings, or "fastest/best"
  claims as fixed facts. Say "as of writing" and link the current docs. When you show an API
  (a pytest fixture, `unittest.mock.patch`, `pytest.raises`, `approx`), it must match the **current**
  documented signature.
- Keep examples framework-honest: `assert` is a plain Python statement that pytest rewrites for rich
  output; `unittest` uses `self.assert*` methods. Don't mix the two in one snippet without saying so.
- Never present a specific coverage percentage, test count, or ratio (e.g., "70/20/10") as a
  universal rule. They are heuristics; attribute them and qualify them.

## Authoritative sources (cite these; do not invent)

- **pytest** — https://docs.pytest.org/ (assertions, fixtures, `parametrize`, `pytest.raises`,
  `approx`, markers, `monkeypatch`, `tmp_path`, config)
- **Python `unittest`** — https://docs.python.org/3/library/unittest.html
- **Python `unittest.mock`** — https://docs.python.org/3/library/unittest.mock.html (`Mock`,
  `MagicMock`, `patch`, `autospec`, `assert_called_with`, "where to patch")
- **Coverage.py** — https://coverage.readthedocs.io/ (statement vs branch coverage, reports)
- **Playwright (Python)** — https://playwright.dev/python/ (end-to-end browser testing)
- **Hypothesis** — https://hypothesis.readthedocs.io/ (property-based testing, shrinking, `@given`)
- **Martin Fowler** — https://martinfowler.com/ — especially *TestPyramid*
  (https://martinfowler.com/bliki/TestPyramid.html), *The Practical Test Pyramid*
  (https://martinfowler.com/articles/practical-test-pyramid.html), *TestDouble*
  (https://martinfowler.com/bliki/TestDouble.html), *Mocks Aren't Stubs*
  (https://martinfowler.com/articles/mocksArentStubs.html), *UnitTest*
  (https://martinfowler.com/bliki/UnitTest.html), and *Eradicating Non-Determinism in Tests*
  (https://martinfowler.com/articles/nonDeterminism.html)
- **Gerard Meszaros — _xUnit Test Patterns_** — http://xunitpatterns.com/ (the canonical test-double
  taxonomy: dummy, stub, spy, mock, fake; Four-Phase Test)
- **Kent Beck — _Test-Driven Development: By Example_** (2002) — the source for red-green-refactor
- **_Software Engineering at Google_** (Winters, Manshreck, Wright) — https://abseil.io/resources/swe-book
  — test sizes (small/medium/large), flaky tests, testing culture (free to read online)
- **Kent C. Dodds — The Testing Trophy** — https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications
  (present as a well-known *alternative* emphasis, not the single truth)

If a claim isn't backed by one of these (or another primary source), don't write it. If unsure,
qualify it or leave it out.

## High-risk facts to get right (anti-hallucination checklist)

These are the classic places testing material goes wrong. Getting them right is the point of the
course.

1. **Test double taxonomy (Meszaros/Fowler).** Be precise; "mock" is *not* a synonym for all doubles.
   - **Dummy** — passed to fill a parameter list but never actually used.
   - **Stub** — provides canned answers to calls made during the test (state used as input).
   - **Spy** — a stub that also records how it was called, for later inspection.
   - **Mock** — pre-programmed with expectations and **verifies the interactions** it receives
     (behavior verification); a test fails if the expected calls don't happen.
   - **Fake** — a working but simplified implementation not suitable for production (e.g., an
     in-memory database).
   Stubs/fakes support **state verification**; mocks support **behavior verification** (*Mocks Aren't
   Stubs*). `unittest.mock.Mock`/`MagicMock` are flexible objects that can act as any of these; the
   *role* in the test is what names the double.
2. **"Tests can't prove correctness."** "Program testing can be used to show the presence of bugs,
   but never to show their absence" (Dijkstra). Passing tests raise confidence; they do not prove the
   code is bug-free.
3. **Coverage ≠ correctness.** Code coverage measures which lines/branches **ran**, not whether they
   were **meaningfully asserted** or whether missing cases exist. 100% coverage can still miss bugs
   (wrong logic, unconsidered inputs, missing assertions). Coverage finds *untested* code; it is a
   floor, not a target. Treating a coverage number as the goal invites gaming (Goodhart's law).
4. **Coverage kinds.** *Statement/line* coverage < *branch* (decision) coverage < *path* coverage in
   rigor. Coverage.py reports statement coverage by default and branch coverage with `--branch`.
   Don't claim a specific percentage is "enough".
5. **The testing pyramid is a heuristic.** More fast, isolated **unit** tests at the base; fewer
   **integration** tests; fewest slow **end-to-end** tests at the top (Cohn; Fowler). It is a rule of
   thumb about *proportions and cost*, not a law or an exact ratio. Name the **ice-cream-cone**
   anti-pattern (mostly manual/e2e) and the **testing trophy** alternative (Dodds, weighting
   integration). Don't state fixed percentages as fact.
6. **"Unit" is a contested term.** A unit is a small, isolated piece of behavior; Fowler distinguishes
   **solitary** (collaborators replaced by doubles) from **sociable** (real collaborators) unit tests.
   The size of a "unit" varies by team. Google instead classifies by **size** (small/medium/large =
   process/machine/network isolation), which is often clearer than "unit vs integration". Present
   these as views, not a single decree.
7. **TDD = red → green → refactor.** Write a *failing* test first (red), write the simplest code to
   pass (green), then refactor with the tests as a safety net (Beck). TDD is primarily a **design and
   feedback** practice; it does **not** guarantee good architecture, remove the need for integration/
   e2e tests, or by itself make code correct.
8. **Test behavior, not implementation.** Assert on observable behavior / public API, not private
   internals. Over-specified tests (e.g., over-mocking, asserting incidental details) become
   **brittle** and break on safe refactors — defeating a key benefit of tests (confidence to
   refactor).
9. **`unittest.mock.patch` — patch where it is *looked up*, not where it is defined.** If module
   `app` does `from services import fetch`, you patch `app.fetch`, **not** `services.fetch`. This is
   the single most common mocking mistake in Python. Prefer `autospec=True` so the mock's signature
   matches the real object.
10. **Don't mock what you don't own.** Prefer to wrap third-party/external systems behind your own
    thin adapter and fake *that*, rather than mocking a library's internals (Fowler; *Growing
    Object-Oriented Software*). Over-mocking couples tests to details you don't control.
11. **Flaky tests are a defect, not noise.** A flaky test passes and fails without any code change.
    Common causes: order dependence / shared mutable state, real time & dates, time zones,
    concurrency/races, real network or filesystem, unseeded randomness, reliance on test execution
    order. The fix is to remove the non-determinism — **not** to blindly retry until green (retries
    hide the bug and erode trust) (Fowler, *Eradicating Non-Determinism*; Google).
12. **Determinism & isolation.** Tests should be independent and order-independent, and produce the
    same result every run. Control time (inject a clock / freeze it), seed randomness
    (`random.seed`/`random_state`), and replace external systems with doubles. Reproducible is not
    the same as generally correct.
13. **False positive vs false negative — state which you mean.** In CI usage a **false positive** is
    usually a test that fails without a real bug (flaky/over-strict) and a **false negative** is a
    test that passes while the code is broken (missing assertions, over-mocking). The terms are
    ambiguous across sources — define them where used.
14. **Fixtures & shared state.** Setup/teardown (pytest fixtures via `yield`, or `setUp`/`tearDown`)
    must leave no state leaking between tests. Know pytest fixture **scopes** (`function` default,
    then `class`/`module`/`package`/`session`); wider scope = more sharing = more risk of coupling.
15. **`assert` vs production `assert`.** In tests, `assert` checks expectations. In *application*
    code, Python's `assert` can be stripped by running with `-O`, so it must not enforce runtime
    behavior. Don't conflate the two.
16. **Property-based testing** (Hypothesis) checks that a **property/invariant** holds across many
    generated inputs and **shrinks** failures to a minimal case; it complements, not replaces,
    example-based tests. A found counterexample is real; *no* counterexample found is not a proof.
17. **Mutation testing** measures test *quality* by introducing small faults (mutants) and checking
    whether tests catch (kill) them; the **mutation score** is stronger evidence than coverage but is
    **slow** and can produce *equivalent mutants* (unkillable, harmless changes). Present cost and
    limits honestly.
18. **E2E tests: few, for critical journeys.** End-to-end tests exercise the whole system like a
    user; they give high confidence but are **slow, brittle, and expensive** to maintain. Keep them
    few and focused on the most important flows.

## Lesson structure (match the shell + the other courses)

Front-matter (YAML): `id` (`lesson-NN`), `slug`, `title`, `level` (`beginner|intermediate|advanced`),
`order` (1–24), `duration` (minutes), `tags` (exactly 5), `summary` (one sentence — used to generate
the manifest). Then these H1 sections, in order:

`Learning Objectives` · `Why It Matters` · `Concept Explanation` (use `###` subsections) ·
`Key Terminology` · `Options and Trade-offs` (a table) · `Worked Example` · `Real World Analogy` ·
`Examples` (`## Example 1/2/3`: basic, real-world, pitfall) · `Common Mistakes` · `Best Practices` ·
`Summary` · `Flash Cards` (≥5 `Q:`/`A:` pairs; put 6) · `Exercises` (`### Easy/Medium/Challenging`) ·
`Further Reading` (links to the sources above).

## Code fences (only these languages — enforced by the validator)

`python` (pytest + the standard library, `unittest.mock`, Hypothesis — **primary**), `bash` (running
tests and tools: `pytest`, `coverage`, `pip install`, `playwright`), `text` (test output/failure
tracebacks, pyramids and diagrams, and small config such as `pytest.ini`/`pyproject.toml` snippets).
**No other fence languages** — render YAML/TOML/INI config as `text`.

## Curriculum (24 lessons, 8/8/8)

Beginner: 01 what-is-software-testing · 02 your-first-test-with-pytest · 03 anatomy-of-a-test · 04
assertions-in-depth · 05 the-testing-pyramid · 06 unit-tests-in-practice · 07 fixtures-and-test-setup
· 08 parametrized-tests.

Intermediate: 09 test-doubles-overview · 10 stubs-and-fakes · 11 mocks-and-spies · 12
patching-and-mock-pitfalls · 13 test-driven-development · 14 integration-testing · 15
coverage-and-its-limits · 16 testing-behavior-not-implementation.

Advanced: 17 end-to-end-testing · 18 flaky-tests · 19 testing-time-and-randomness · 20
property-based-testing · 21 mutation-testing · 22 continuous-integration · 23
a-pragmatic-testing-strategy · 24 capstone-testing-a-real-project.

## Quizzes

One per lesson: `public/quizzes/lesson-NN.json`, `id` `quiz-lesson-NN`, `lessonId` `lesson-NN`,
`passingScore` 60, 5–6 questions spanning the five types (`single-choice`, `multiple-choice`,
`fill-blank`, `ordering`, `match-pair`). Every answer must be traceable to the lesson text; add an
`explanation` to each. Keep `fill-blank` answers short and provide case/synonym variants. Use quizzes
to reinforce the anti-hallucination points above — especially the double taxonomy, coverage ≠
correctness, red-green-refactor order, "patch where it's looked up", flaky-test causes, and testing
behavior over implementation.
