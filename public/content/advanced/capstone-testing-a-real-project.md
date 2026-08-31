---
id: lesson-24
slug: capstone-testing-a-real-project
title: "Capstone: Testing a Real Project"
level: advanced
order: 24
duration: 24
tags:
  - capstone
  - workflow
  - end-to-end
  - project
  - synthesis
summary: "Putting the whole course to work on one small project — a URL shortener — by assessing risk, TDD-ing the core logic, unit- and integration-testing each layer, adding one end-to-end test for the critical journey, checking coverage, killing a mutant, fixing a flaky test, and wiring it all into CI."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Plan a project's tests using **risk** and the **pyramid**.
- Build core logic **test-first** and cover each layer at the right level.
- Add **coverage**, a **mutation** spot-check, an **E2E** test, and **CI**.
- Diagnose and fix a **flaky** test in a realistic setting.

# Why It Matters

Every previous lesson taught one tool. Real projects need them **together**, in proportion, guided by
judgment. This capstone walks a small but complete example — a **URL shortener** — through the full
workflow, so you see how unit tests, doubles, TDD, integration, E2E, coverage, mutation testing,
flakiness, and CI fit into one coherent suite. Treat it as a template you can adapt to your own work.

# Concept Explanation

### The project

A **URL shortener** has three layers, each testable at the right level:

```text
  Layer            Responsibility                    Test level
  ---------------  --------------------------------  --------------------------
  encode()         id (int) → short code (str)       unit (pure logic)
  LinkRepository   store & fetch code ↔ url          integration (real/fake DB)
  Web app          POST /shorten, GET /<code>        E2E (critical journey)
```

### Step 1 — Assess risk

The **redirect** is the critical journey (if it breaks, every link dies) → deserves an E2E test. The
**encoder** is pure and central → thorough unit + a property test. The **repository** is a seam →
integration tests. Trivial glue (config, a health check) → little or nothing. (Lesson 23.)

### Step 2 — TDD the core (encoder)

Build `encode` red-green-refactor (Lesson 13). It maps an integer id to a base-62 code:

```python
# RED: the simplest case
def test_encode_zero_is_a():
    assert encode(0) == "a"

# GREEN → then triangulate with encode(1), encode(62), refactor to the real base-62 loop.
def test_encode_is_reversible():          # a property-style round-trip
    for n in [0, 1, 61, 62, 12345]:
        assert decode(encode(n)) == n
```

### Step 3 — Unit-test pure logic and edges

Cover boundaries (0, 61→"9"/"Z", 62→two chars) with **parametrize** (Lesson 8), and the error path
(negative id → `ValueError`) with **`pytest.raises`** (Lesson 4). Add a **Hypothesis** round-trip
(Lesson 20):

```python
from hypothesis import given, strategies as st

@given(st.integers(min_value=0, max_value=10_000_000))
def test_encode_decode_round_trips(n):
    assert decode(encode(n)) == n
```

### Step 4 — Integration-test the repository

Use a **disposable database** (Lesson 14) so the seam is real but hermetic:

```python
import sqlite3, pytest

@pytest.fixture
def repo(tmp_path):
    conn = sqlite3.connect(tmp_path / "links.db")
    conn.execute("CREATE TABLE links (code TEXT PRIMARY KEY, url TEXT)")
    yield LinkRepository(conn)
    conn.close()

def test_save_then_resolve(repo):
    repo.save("abc", "https://example.com")
    assert repo.resolve("abc") == "https://example.com"

def test_unknown_code_resolves_to_none(repo):     # fresh DB → hermetic
    assert repo.resolve("nope") is None
```

For the service that *uses* the repo, a **fake** in-memory repo (Lesson 10) keeps unit tests fast.

### Step 5 — One E2E for the critical journey

Drive the running app through create-then-redirect with **Playwright/HTTP** (Lesson 17): `POST /shorten`
returns a code; `GET /<code>` redirects to the original URL. One test, the journey that matters.

### Step 6 — Coverage, then a mutation spot-check

Run coverage with branches (Lesson 15) and read **Missing**, not just the percent:

```bash
pytest --cov=shortener --cov-branch --cov-report=term-missing
```

Then a **mutation** spot-check on `encode` (Lesson 21): if a mutant survives (say `+`→`-` in the digit
math), add the assertion/case that kills it — proving the tests actually check the logic.

### Step 7 — Fix a flaky test

Suppose a test asserts the code contains part of a timestamp and occasionally fails. That's
non-determinism (Lesson 18/19): the code depends on `time`/randomness. **Inject** the id source so the
code is deterministic, and assert the exact mapping — flake gone, behavior still checked.

### Step 8 — Wire up CI

Add a workflow (Lesson 22) that runs fast unit/integration tests on every push (parallel, cached) and
the E2E on a schedule, and make the test job a **required check** so nothing red merges.

# Key Terminology

- **Layered testing** — unit for logic, integration for seams, E2E for journeys.
- **Critical journey** — the flow whose failure hurts most (here, the redirect).
- **Round-trip property** — `decode(encode(n)) == n`, checked over many inputs.
- **Hermetic integration test** — a disposable, self-contained database per test.
- **Mutation spot-check** — auditing key logic's tests by injecting a fault.
- **Required check** — CI gate that blocks merges on red tests.

# Options and Trade-offs

| Layer | Level | Double / setup | Why |
| ----- | ----- | -------------- | --- |
| `encode`/`decode` | Unit + property | None (pure) | Fast, exhaustive on logic and edges |
| Service | Unit | Fake repo | Test logic without a real DB |
| `LinkRepository` | Integration | Disposable SQLite | Verify the real SQL/seam, hermetically |
| Web redirect | E2E | Running app | Prove the whole critical journey |

# Worked Example

A slice of the finished suite, showing the levels cooperating:

```python
# Unit — pure logic + error path
import pytest

@pytest.mark.parametrize("n, code", [(0, "a"), (1, "b"), (61, "9")])
def test_encode_examples(n, code):
    assert encode(n) == code

def test_encode_rejects_negative():
    with pytest.raises(ValueError):
        encode(-1)

# Unit with a fake — the service that assigns codes
def test_shorten_stores_and_returns_code():
    repo = InMemoryLinkRepo()                 # fake (Lesson 10)
    svc = Shortener(repo, next_id=lambda: 0)  # inject id source → deterministic (Lesson 19)
    code = svc.shorten("https://example.com")
    assert code == "a"
    assert repo.resolve("a") == "https://example.com"

# Integration — the real repository against a disposable DB (fixture from Step 4)
def test_repo_roundtrips(repo):
    repo.save("abc", "https://example.com")
    assert repo.resolve("abc") == "https://example.com"
```

Each bug has a natural home: encoder bugs fail the unit tests; a schema/SQL bug fails integration; a
broken redirect fails E2E. Fast tests run constantly; the slow E2E runs in CI. That's the whole course
in one suite.

# Real World Analogy

This capstone is the **final driving test after all the lessons**. You've practiced steering (units),
parking (fixtures), merging (integration), and emergency stops (flaky-test fixes) separately; now you
drive a **real route** that strings them together under realistic conditions. Passing isn't about any
one maneuver — it's about combining them with **judgment**: fast checks constantly, the big risky moves
rehearsed, and a licensed examiner (CI) signing off before you're allowed on the road.

# Examples

## Example 1 — Basic: the encoder's round-trip property

```python
from hypothesis import given, strategies as st

@given(st.integers(min_value=0, max_value=10_000_000))
def test_round_trip(n):
    assert decode(encode(n)) == n
```

**Why this works:** one property covers a huge input space that hand-picked examples never could,
catching edge cases in the base-62 math.

## Example 2 — Real-world: killing a survivor on `encode`

A mutation run shows a survivor: the digit alphabet index `% 62` mutated to `% 61`, yet all tests pass.
You add `assert encode(62) == "ba"` (a two-char boundary), which the mutant gets wrong → killed.

**Why this works:** the survivor pinpointed a boundary no assertion distinguished; adding it both kills
the mutant and hardens a real edge.

## Example 3 — Pitfall: an all-E2E capstone

A learner tests the whole shortener only through the browser: 30 Playwright tests, no unit tests. The
suite takes 8 minutes, flakes weekly, and a base-62 off-by-one takes an hour to localize.

**Why this bites:** it's an ice-cream cone (Lesson 5). The same behavior belongs mostly in fast unit
tests, with **one** E2E for the redirect journey. Strategy — not enthusiasm for realism — decides the
mix.

# Common Mistakes

- **One level for everything** — all-unit (misses seams) or all-E2E (slow, brittle).
- **Skipping the critical-journey E2E** — the one test that proves links actually redirect.
- **Reading only the coverage %** — check Missing and spot-check with mutation on key logic.
- **Leaving time/randomness uncontrolled** — inject them so the suite is deterministic.

# Best Practices

- **Assess risk first**, then test each layer at its **right level** (pyramid + judgment).
- **TDD** the core logic; add a **property** test for round-trips and invariants.
- Keep integration tests **hermetic**; reserve **one E2E** for the critical journey.
- Add **coverage + a mutation spot-check**, fix any **flake** at the source, and **gate CI** on green.

# Summary

- Real testing combines every tool **in proportion**, guided by **risk**.
- Layer it: **unit/property** for logic, **integration** for seams, **one E2E** for the journey.
- Verify quality with **coverage + mutation**, and keep tests **deterministic**.
- **CI** ties it together — fast checks per push, staged E2E, green required to merge.

# Flash Cards

Q: In the URL-shortener capstone, which layer gets an end-to-end test and why?
A: The redirect journey (POST /shorten then GET /<code>) — it's the critical flow whose failure breaks every link, so it earns the one E2E test.

Q: Which testing level suits the pure `encode`/`decode` logic?
A: Unit tests (with parametrized boundaries and an error-path pytest.raises) plus a property-based round-trip test — fast and exhaustive on the logic.

Q: How do you test the repository layer hermetically?
A: With an integration test against a disposable database (e.g., a tmp_path SQLite file per test), seeding and tearing down so tests are isolated and order-independent.

Q: After coverage looks good, what extra check audits the key logic's tests?
A: A mutation spot-check — inject a fault into encode(); if a mutant survives, add the assertion or boundary case that kills it, proving the tests really check the logic.

Q: A capstone test flakes because the code embeds a timestamp. What's the fix?
A: Remove the non-determinism — inject the id/time source so the code is deterministic — then assert the exact mapping; don't retry to hide it.

Q: Why is testing the whole shortener only through 30 browser tests a mistake?
A: It's an ice-cream cone: slow, flaky, and poor at localizing failures. Most behavior belongs in fast unit tests, with a single E2E for the redirect journey.

# Exercises

### Easy
Sketch the test plan for the URL shortener: list which layers get unit, integration, and E2E tests, and
name one thing you'd deliberately not test.

### Medium
Implement `encode`/`decode` test-first (start with `encode(0)`), add a parametrized boundary test and a
Hypothesis round-trip property, and get them green.

### Challenging
Build the three layers (encoder, an in-memory + SQLite repository, a tiny web handler). Write a unit
test with a fake repo, an integration test with a disposable DB, and one E2E for the redirect. Then add
coverage, reason about one mutant on `encode`, and outline the CI workflow that runs it all.

# Further Reading

- Martin Fowler — *The Practical Test Pyramid* (a worked, layered example): <https://martinfowler.com/articles/practical-test-pyramid.html>
- pytest — *Good Integration Practices* (project & test layout): <https://docs.pytest.org/en/stable/explanation/goodpractices.html>
- Hypothesis — *documentation* (round-trip properties): <https://hypothesis.readthedocs.io/>
- *Software Engineering at Google* — *Testing Overview* (bringing it together): <https://abseil.io/resources/swe-book/html/ch11.html>
