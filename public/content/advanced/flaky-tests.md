---
id: lesson-18
slug: flaky-tests
title: "Flaky Tests"
level: advanced
order: 18
duration: 20
tags:
  - flaky-tests
  - non-determinism
  - order-dependence
  - retries
  - isolation
summary: "Tests that pass and fail without any code change — why flakiness is a real defect that erodes trust and hides bugs, the usual causes (shared state, time, concurrency, network, randomness, order), how to diagnose them, and why you fix the cause instead of just retrying."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Define a **flaky test** and explain why it's a genuine defect.
- Identify the common **causes** of non-determinism.
- **Diagnose** flakiness (isolation, repetition, order randomization).
- Fix the **cause** rather than masking it with retries; know when to quarantine.

# Why It Matters

A **flaky test** passes on one run and fails on the next with **no change to the code**. It's uniquely
corrosive: developers learn to shrug off red ("just re-run it"), and once people ignore failures, the
suite stops protecting anything — a real regression hides among the noise. Martin Fowler calls
non-determinism the thing that can render a test suite worthless; Google reports a substantial fraction
of test transitions are flaky at scale. Taming flakiness is what keeps a large suite trustworthy.

# Concept Explanation

### Flakiness is a defect, not weather

A flaky test is **broken** — either the test or the code has a hidden dependency on something
uncontrolled. "It's just flaky" is not a root cause; it's a symptom you haven't diagnosed yet. Treat a
flaky test with the same seriousness as a failing one.

### Common causes

- **Shared mutable state / order dependence** — one test leaves data (a global, a file, a DB row, a
  wide-scope fixture) that another test reads. Passes in one order, fails in another.
- **Real time and dates** — `datetime.now()`, "today", timers, timeouts; tests break at midnight,
  month-end, or under a different **time zone**, or during daylight-saving shifts.
- **Concurrency / races** — threads, async, or parallel tests interleave differently each run.
- **Network / filesystem / external services** — a real API is slow, down, or rate-limited; a port is
  taken; a temp file collides.
- **Unseeded randomness** — `random`, shuffles, UUIDs, hash-order assumptions; a different draw fails.
- **Relying on execution order** — assuming tests run top-to-bottom, or that a dict/set iterates in a
  particular order.

### Diagnosing

Reproduce the non-determinism deliberately:

- **Run in isolation**: `pytest tests/test_x.py::test_flaky` — passes alone but fails in the suite? →
  order/shared-state dependence.
- **Repeat it**: run the test many times (e.g., with a loop or `pytest-repeat`) to catch an
  intermittent failure.
- **Randomize order**: `pytest-randomly` shuffles test order each run and prints the seed, surfacing
  hidden inter-test coupling; re-run with the printed seed to reproduce.
- **Bisect the state**: run the flaky test right after each suspect to find the leaker.

### Fix the cause — don't just retry

The tempting "fix" is an automatic **retry** ("re-run failed tests up to 3 times"). Retrying **hides**
the defect: the underlying non-determinism (and the real bug it may signal) is still there, and now
masked. Retries erode trust and can let genuine intermittent bugs ship. Instead:

- **Isolate state**: fresh fixtures per test (function scope), clean up, no shared globals.
- **Control time**: inject a clock or freeze it (e.g., `freezegun`, or `monkeypatch`); never assert on
  wall-clock `now()`.
- **Seed randomness**: set a fixed seed so draws are reproducible.
- **Remove real I/O**: use fakes/doubles for network; use `tmp_path` for files; avoid real sleeps.
- **Make async deterministic**: await/synchronize properly; avoid sleeps as synchronization.

**Quarantine** (moving a stubbornly flaky test out of the blocking suite while you fix it) is a
last-resort stopgap to keep CI trustworthy — not a fix, and not a place tests go to die. And you never
delete or `skip` a failing test just to get green.

# Key Terminology

- **Flaky test** — passes and fails without code changes; non-deterministic.
- **Non-determinism** — behavior depending on uncontrolled factors (time, order, randomness, races).
- **Order dependence** — a test relies on another running first (shared state).
- **Quarantine** — temporarily removing a flaky test from the blocking suite while fixing it.
- **Retry-until-green** — masking flakiness by re-running; a smell, not a fix.
- **`pytest-randomly` / `freezegun`** — tools to shuffle order and freeze time.

# Options and Trade-offs

| Cause | Symptom | Real fix |
| ----- | ------- | -------- |
| Shared/global state | Fails only in certain orders | Function-scoped fixtures, cleanup, no globals |
| Real time/date | Fails at midnight / other TZ | Inject or freeze the clock |
| Randomness | Fails on some seeds | Set a fixed seed |
| Network/external | Fails when slow/offline | Fake the dependency; no real calls |
| Concurrency | Fails intermittently | Proper synchronization; avoid sleeps |

# Worked Example

Turning a time-and-randomness flake deterministic:

```python
# Flaky: depends on the real clock and an unseeded random draw.
import random
from datetime import datetime

def make_token():
    return f"{datetime.now():%H%M%S}-{random.randint(0, 9999)}"

def test_token_flaky():
    assert make_token().endswith("-42")     # fails almost always; passes ~1/10000 runs
```

```python
# Fixed: control both sources of non-determinism.
def make_token(now, rng):
    return f"{now:%H%M%S}-{rng.randint(0, 9999)}"

def test_token_deterministic():
    now = datetime(2026, 1, 1, 12, 0, 0)
    rng = random.Random(0)                  # fixed seed
    token = make_token(now, rng)
    assert token == f"120000-{random.Random(0).randint(0, 9999)}"
```

By **injecting** the clock and a seeded RNG, the token is fully determined — the test is now stable and
still checks the real formatting behavior.

# Real World Analogy

A flaky test is a **smoke alarm that chirps at random**. The first few times you investigate; then you
start ignoring it — and the night it goes off for a *real* fire, you roll over and mute it. The fix
isn't a "snooze that retries in 10 minutes" (that just trains you to ignore it more); it's finding
*why* it chirps — a loose sensor, a low battery, steam from the shower (an uncontrolled input) — and
removing that cause so an alarm always means fire.

# Examples

## Example 1 — Basic: order dependence from shared state

```python
cache = {}                      # module-level shared state

def test_a():
    cache["x"] = 1
    assert cache["x"] == 1

def test_b():
    assert "x" not in cache     # passes alone; FAILS after test_a ran
```

**Why this works (as a lesson):** `test_b` depends on order because both tests share `cache`. Running
with a shuffled order exposes it; the fix is per-test state (a fixture), not a retry.

## Example 2 — Real-world: freezing time

```python
def is_expired(token, now):
    return token.expires_at < now

def test_is_expired_uses_injected_now():
    token = Token(expires_at=datetime(2026, 1, 1))
    assert is_expired(token, now=datetime(2026, 1, 2)) is True   # deterministic
```

**Why this works:** passing `now` in (instead of calling `datetime.now()` inside) makes the test
independent of when it runs — no midnight or time-zone surprises.

## Example 3 — Pitfall: retry-until-green hides a real bug

```text
# CI config
pytest --reruns 3          # a test that fails 1 run in 4 now "passes" after retries
```

**Why this bites:** the retry masks a genuine race condition in the code; users hit it in production
even though CI is green. The intermittent failure was a *signal*; retries silenced it. Diagnose and fix
the race instead (or quarantine while you do).

# Common Mistakes

- **"It's just flaky"** — treating non-determinism as noise instead of a defect to diagnose.
- **Blanket retries** — masking flakiness (and possibly real bugs) instead of fixing the cause.
- **Wall-clock and unseeded randomness** in tests — inject/freeze/seed them.
- **Shared mutable state** across tests — use fresh, function-scoped fixtures and clean up.

# Best Practices

- Treat every flaky test as a **bug**; reproduce it (isolation, repetition, order shuffling).
- Remove the uncontrolled input: **isolate state**, **inject/freeze time**, **seed randomness**, **fake
  I/O**.
- **Quarantine** only as a temporary measure to protect CI — never `skip`/delete to force green.
- Keep tests **independent and order-agnostic**; randomize order in CI to catch coupling early.

# Summary

- A **flaky test** passes/fails without code changes — a real defect that erodes trust and hides bugs.
- Causes: **shared state/order**, **time/date/TZ**, **concurrency**, **network/FS**, **randomness**.
- **Diagnose** by isolation, repetition, and order randomization; reproduce with the printed seed.
- **Fix the cause** — isolate, inject/freeze time, seed RNG, fake I/O; retries **mask**, they don't fix.

# Flash Cards

Q: What is a flaky test?
A: A test that passes on one run and fails on another with no change to the code — its result depends on some uncontrolled input, so it's non-deterministic.

Q: Why is "it's just flaky" not an acceptable diagnosis?
A: Flakiness is a defect (in the test or the code) with a real cause; ignoring it trains people to shrug off red, so genuine regressions hide in the noise.

Q: Name common causes of flaky tests.
A: Shared mutable state / order dependence, real time and time zones, concurrency/races, real network or filesystem, and unseeded randomness or hash/dict-order assumptions.

Q: How do you reproduce a flaky test to diagnose it?
A: Run it in isolation vs in the suite, repeat it many times, and randomize test order (e.g., pytest-randomly, re-running with the printed seed) to surface hidden coupling.

Q: Why is retry-until-green a bad fix?
A: It masks the non-determinism (and any real intermittent bug it signals) rather than removing the cause, so the problem still ships while CI looks green — and trust erodes.

Q: How do you make time- and randomness-dependent code testable?
A: Inject or freeze the clock (e.g., pass `now` in, or freezegun) and seed the RNG, so the result is fully determined and the test is stable.

# Exercises

### Easy
Write two tests that share a module-level dict and pass in one order but fail in another. Then fix them
with a function-scoped fixture so both pass in any order.

### Medium
Take a function that calls `datetime.now()` internally and a test that's sensitive to the current time.
Refactor to inject `now`, and rewrite the test to be deterministic.

### Challenging
Given a CI config using `--reruns 3` to hide a flaky test, describe how you'd diagnose the underlying
cause (isolation, repetition, order shuffling), what a fix might look like, and why quarantine — not
retries — is the acceptable temporary measure.

# Further Reading

- Martin Fowler — *Eradicating Non-Determinism in Tests*: <https://martinfowler.com/articles/nonDeterminism.html>
- Google Testing Blog — *Flaky Tests at Google and How We Mitigate Them*: <https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html>
- pytest-randomly — *randomizing test order*: <https://pypi.org/project/pytest-randomly/>
- pytest — *monkeypatch* (for controlling time/env): <https://docs.pytest.org/en/stable/how-to/monkeypatch.html>
