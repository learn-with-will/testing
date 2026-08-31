---
id: lesson-22
slug: continuous-integration
title: "Continuous Integration and Testing"
level: advanced
order: 22
duration: 18
tags:
  - continuous-integration
  - ci
  - automation
  - pipelines
  - fast-feedback
summary: "Running the test suite automatically on every change so problems surface within minutes — the CI pipeline, gating merges on green tests, keeping the suite fast with parallelism and test selection, and handling flaky tests without eroding trust."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain **continuous integration (CI)** and why automated tests are its core.
- Describe a typical **CI pipeline** (install → lint → test → coverage).
- Keep CI **fast** with parallelism, caching, and test selection.
- **Gate merges** on green checks and handle flaky tests responsibly.

# Why It Matters

Tests you have to *remember* to run are tests that rot. **Continuous integration** removes the human
from the loop: every push runs the suite automatically, so a break is caught in minutes — by the
machine, on a clean environment, before it reaches teammates or production. CI is what turns a pile of
tests into a **safety net the whole team can trust**. It's also where testing's earlier themes pay off:
fast tests mean fast feedback, and deterministic tests mean CI stays believable.

# Concept Explanation

### What CI is

**Continuous integration** is the practice of merging everyone's work frequently and **verifying each
change automatically**. In practice: a CI service (GitHub Actions, GitLab CI, etc.) watches your
repository and, on every push or pull request, spins up a clean machine and runs your checks. Fowler's
original point: integrate often and verify with a **self-testing build** so integration problems are
small and caught early.

### A typical pipeline

A CI run is a sequence of steps; if any fails, the run is **red**:

```text
1. Checkout the code
2. Set up the language runtime (e.g., Python 3.x)
3. Install dependencies         (cached for speed)
4. Lint / type-check            (fast, fails early)
5. Run the tests                (pytest)
6. Report coverage              (optional gate/threshold)
```

Order matters: put **fast, cheap** checks (lint, type-check) before slow ones so obvious problems fail
in seconds, not minutes (**fail-fast**).

### A minimal workflow (illustrative)

```text
# .github/workflows/tests.yml (rendered as text — YAML)
name: tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12", cache: pip }
      - run: pip install -r requirements.txt
      - run: pytest --maxfail=1 --cov=myapp
```

Every push now runs `pytest` on a clean machine; the run's status (pass/fail) is reported back on the
commit and pull request.

### Keeping CI fast

Slow CI gets ignored or bypassed. Speed it up with:

- **Parallelism** — split tests across workers (e.g., `pytest -n auto` with `pytest-xdist`), and run
  independent jobs concurrently.
- **Caching** — cache dependencies so installs don't repeat every run.
- **Test selection** — run the **fast** tests (units) on every push and the **slow** ones (E2E, large)
  less often or in parallel stages. This is where the pyramid pays off, and Google's **small/medium/
  large** sizing helps decide what runs when.
- **Fail-fast** — `--maxfail` or ordering to surface the first failure quickly.

### Gating merges

Make the test job a **required status check** so a pull request can't merge while tests are red. This is
CI's teeth: green-to-merge keeps the main branch releasable. Pair it with reviews.

### Flaky tests in CI

Flaky tests (Lesson 18) are especially corrosive in CI — a red run people learn to ignore. Don't paper
over them with blanket reruns; **diagnose and fix**, and **quarantine** a stubborn one out of the
blocking set *temporarily* while you do, so CI stays trustworthy. Never `skip`/delete a real failing
test to force green.

# Key Terminology

- **Continuous integration (CI)** — automatically building and testing every change.
- **Pipeline / workflow** — the ordered steps a CI run executes.
- **Self-testing build** — a build that runs its own tests and fails if any fail.
- **Required status check** — a check that must pass before a merge is allowed.
- **Fail-fast** — stopping (or reporting) on the first failure to save time.
- **Parallelization / test selection** — running tests concurrently / choosing which to run.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| What runs per push | Everything | Fast tests now, slow tests staged | Stage slow/E2E tests so feedback stays quick. |
| Speed | One worker | Parallel workers + caching | Parallelize and cache once the suite grows. |
| Merge policy | Optional checks | Required green checks | Require green for shared branches. |
| Flaky test | Blanket reruns | Diagnose + quarantine temporarily | Fix the cause; quarantine only as a stopgap. |

# Worked Example

This very repository uses CI to test-and-deploy. Its workflow builds on every push to `main` and
publishes only if the build (which type-checks and validates) succeeds:

```text
# .github/workflows/deploy.yml (excerpt)
on:
  push:
    branches: [main]
jobs:
  build:
    steps:
      - run: npm ci
      - run: npm run build      # tsc type-check + bundle; fails the run on any error
```

The principle is identical for a test suite: replace `npm run build` with `pytest`, and the run turns
red if any test fails — blocking a broken change from shipping. Fast checks (type-check) run as part of
the same gate, failing early.

# Real World Analogy

CI is the **airport security line every bag goes through** — automatically, every time, no exceptions.
You don't rely on travelers to *remember* to get screened; the scanner runs on each bag and flags
problems before boarding. Fast scanners up front (lint/type-check) catch the obvious liquids in seconds;
the slower, thorough checks (E2E) run where needed. And a bag that fails **can't board** (required
check) — the whole system's trust depends on nobody waving flagged bags through.

# Examples

## Example 1 — Basic: run tests on every push

```text
on: [push, pull_request]
jobs:
  test:
    steps:
      - run: pytest
```

**Why this works:** the suite runs automatically on a clean machine for every change, so breakage is
caught immediately rather than days later.

## Example 2 — Real-world: fast feedback via staging + parallelism

```text
- run: pytest tests/unit -n auto            # every push: fast, parallel
- run: pytest tests/e2e                     # nightly or on release branches only
```

**Why this works:** developers get quick unit feedback on each push, while slow E2E tests run on a
schedule — keeping the common path fast without losing E2E coverage.

## Example 3 — Pitfall: masking flakiness with reruns in CI

```text
- run: pytest --reruns 5      # a flaky test now "passes" after retries
```

**Why this bites:** CI stays green while a real intermittent bug (and the flaky test) go unfixed; the
green check becomes meaningless, and trust erodes. Diagnose the flake (Lesson 18); quarantine it out of
the blocking set temporarily if a fix takes time — don't blanket-retry.

# Common Mistakes

- **Slow CI** that everyone learns to ignore or bypass — parallelize, cache, and stage slow tests.
- **Slow checks first** — put lint/type-check before the long test run (fail-fast).
- **Optional checks** on shared branches — make tests a **required** status check to gate merges.
- **Blanket reruns** to hide flakes — fix the cause; quarantine temporarily instead.

# Best Practices

- Run the suite **automatically** on every push/PR in a **clean** environment.
- Order steps **fast → slow**; cache dependencies; **parallelize** as the suite grows.
- **Stage** slow/E2E tests so per-push feedback stays quick (pyramid + test sizes).
- **Gate merges** on green required checks, and keep CI trustworthy by fixing (not hiding) flakes.

# Summary

- **CI** runs your tests automatically on every change, catching breakage in minutes on a clean machine.
- A pipeline runs **fast checks first** (lint/type-check) then tests, going red on any failure.
- Keep it fast with **parallelism, caching, and test selection**; stage slow/E2E tests.
- **Gate merges** on green required checks; **fix** flaky tests rather than masking them with reruns.

# Flash Cards

Q: What is continuous integration?
A: The practice of merging changes frequently and automatically verifying each one with a self-testing build, so integration problems are small and caught early.

Q: Why put lint and type-checks before the test run in a CI pipeline?
A: They're fast and cheap, so obvious problems fail in seconds (fail-fast) instead of after a long test run — quicker feedback and less wasted CI time.

Q: How do you keep CI fast as the suite grows?
A: Parallelize tests across workers, cache dependencies, and use test selection/staging — run fast unit tests every push and slow E2E tests less often.

Q: What is a required status check?
A: A CI check that must pass before a pull request can merge, so broken changes can't reach the shared branch — CI's enforcement mechanism.

Q: How should flaky tests be handled in CI?
A: Diagnose and fix the non-determinism; quarantine a stubborn one out of the blocking set only temporarily. Don't mask it with blanket reruns, which erode trust in green.

Q: How does the testing pyramid relate to CI speed?
A: Many fast unit tests give quick per-push feedback, while the few slow E2E tests are staged (e.g., nightly), keeping the common CI path fast.

# Exercises

### Easy
Write a minimal CI workflow (as text/pseudocode) that, on every push, checks out the code, installs
dependencies, and runs `pytest`.

### Medium
Extend it to run a fast lint/type-check step before the tests and to run unit tests in parallel
(`-n auto`), and explain why the ordering gives faster feedback.

### Challenging
Design a CI strategy for a suite with 2,000 unit, 200 integration, and 15 E2E tests: decide what runs on
every push vs on a schedule, how you'd gate merges, and how you'd handle a flaky E2E test without hiding
it.

# Further Reading

- Martin Fowler — *Continuous Integration*: <https://martinfowler.com/articles/continuousIntegration.html>
- GitHub Actions — *Building and testing Python*: <https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-python>
- pytest-xdist — *parallel test execution*: <https://pytest-xdist.readthedocs.io/>
- *Software Engineering at Google* — *Continuous Integration*: <https://abseil.io/resources/swe-book/html/ch23.html>
