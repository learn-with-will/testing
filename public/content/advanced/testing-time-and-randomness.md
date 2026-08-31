---
id: lesson-19
slug: testing-time-and-randomness
title: "Testing Time and Randomness"
level: advanced
order: 19
duration: 18
tags:
  - time
  - randomness
  - freezegun
  - determinism
  - monkeypatch
summary: "Concrete techniques for making time- and randomness-dependent code testable — injecting or freezing the clock, seeding or injecting a random source, avoiding real sleeps, and testing timeouts and retries deterministically."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Make code that reads the **clock** testable by injection or freezing.
- Make **random** behavior reproducible by seeding or injecting the RNG.
- Test **timeouts, retries, and delays** without real waiting.
- Patch time/randomness at the **right lookup site** (recalling Lesson 12).

# Why It Matters

Time and randomness are the two most common sources of the flakiness we just studied — and they show up
everywhere: tokens, timestamps, retries, backoff, sampling, shuffles, IDs. The good news is that both
are tameable with the same core move: **stop reaching for the global source inside your logic, and pass
it in (or replace it) so the test controls it.** These techniques turn "sometimes fails" code into
rock-solid tests, and they're prerequisites for testing anything schedule- or probability-related.

# Concept Explanation

### Controlling time

Three approaches, best first:

1. **Inject a clock.** Pass `now` (or a `clock` callable) into the function instead of calling
   `datetime.now()` inside it. The test supplies a fixed value. This is the cleanest — the dependency is
   explicit.

   ```python
   def greeting(now):
       return "Good morning" if now.hour < 12 else "Good afternoon"

   def test_morning():
       assert greeting(datetime(2026, 1, 1, 9)) == "Good morning"
   ```

2. **Freeze the clock** with a library like **freezegun** when injection isn't practical:

   ```python
   from freezegun import freeze_time

   @freeze_time("2026-01-01 09:00:00")
   def test_uses_frozen_now():
       assert greeting_using_now() == "Good morning"   # internal datetime.now() is frozen
   ```

3. **Patch the `now` reference** (Lesson 12): patch it **where it's looked up** — the module under test,
   with `autospec` — not where it's defined.

Always be explicit about **time zones**: prefer timezone-aware datetimes, and test around DST and
midnight boundaries.

### Controlling randomness

Same idea — remove the uncontrolled draw:

1. **Inject the RNG.** Pass a `random.Random` instance in; the test constructs one with a fixed seed.

   ```python
   def pick(items, rng):
       return items[rng.randrange(len(items))]

   def test_pick_is_deterministic():
       rng = random.Random(0)          # fixed seed → reproducible
       assert pick(["a", "b", "c"], rng) in {"a", "b", "c"}
   ```

2. **Seed the global** (`random.seed(0)`) in a fixture when injection isn't available — but a shared
   global is easy to leak, so injection is safer.

3. For libraries, use their seed knob (e.g., scikit-learn's `random_state=0`, NumPy's
   `default_rng(0)`).

A subtlety: a seeded test pins *this* draw, but a passing seeded test doesn't prove the code is correct
for **all** draws — for that, see property-based testing (next lesson).

### Testing timeouts, retries, and delays

Real waiting makes tests slow and flaky. Instead:

- **Inject the delay/sleep** or a fake clock so "advance 5 seconds" is instant.
- For backoff/retry logic, replace `time.sleep` with a spy (assert it was *asked* to wait the right
  amount) rather than actually sleeping.

```python
def retry(action, sleep, attempts=3):
    for i in range(attempts):
        try:
            return action()
        except Exception:
            sleep(2 ** i)               # exponential backoff
    raise RuntimeError("gave up")

def test_backoff_waits_1_then_2(monkeypatch):
    waits = []
    calls = iter([ValueError(), ValueError(), "ok"])
    result = retry(lambda: (_ for _ in ()).throw(next(calls)) if ... else None,  # illustrative
                   sleep=waits.append)
```

The point: pass `sleep` in (here it just records durations), so the test verifies the backoff schedule
**instantly** instead of actually waiting seconds.

### Avoid real sleeps as synchronization

In async or concurrent tests, never `time.sleep()` to "wait for" something — await/synchronize on the
actual condition (or use your framework's waiting). Sleeps are both slow and flaky (Lesson 18).

# Key Terminology

- **Clock injection** — passing `now`/a clock into code so tests control the time.
- **freezegun / `freeze_time`** — freezes `datetime.now()` to a fixed value for a test.
- **Seeded RNG** — a random source with a fixed seed, giving reproducible draws.
- **`random_state` / `default_rng`** — library seed knobs (scikit-learn, NumPy).
- **Fake clock / injected sleep** — advancing or recording time without real waiting.
- **Timezone-aware datetime** — a datetime carrying its zone, avoiding ambiguity.

# Options and Trade-offs

| Need | Best option | Fallback |
| ---- | ----------- | -------- |
| Fixed "now" | Inject `now` | `freeze_time` / patch the lookup site |
| Reproducible randomness | Inject a seeded `Random` | Seed the global in a fixture |
| Test backoff/timeout | Inject/record `sleep`; fake clock | Patch `time.sleep` where looked up |
| Async waiting | Await the real condition | Framework waiter — never a fixed sleep |

# Worked Example

Making an expiring-token check fully deterministic via injection:

```python
def make_token(now, rng, ttl_seconds=60):
    return Token(value=f"{rng.randint(1000, 9999)}",
                 expires_at=now + timedelta(seconds=ttl_seconds))

def test_token_expiry_and_value_are_deterministic():
    now = datetime(2026, 1, 1, 12, 0, 0)
    rng = random.Random(0)
    token = make_token(now, rng, ttl_seconds=60)

    assert token.expires_at == datetime(2026, 1, 1, 12, 1, 0)   # time is fixed
    assert token.value == f"{random.Random(0).randint(1000, 9999)}"  # RNG is seeded
```

Both the clock and the random draw are supplied by the test, so every run produces the same token — and
the test still checks the real TTL and value-generation behavior.

# Real World Analogy

Testing time and randomness is like filming a scene that involves a **sunset and a dice roll**. You
don't wait for the real sunset (inject/freeze the clock — use controlled stage lighting set to
"6 p.m."), and you don't use fair dice you can't predict (seed the RNG — use a prop die weighted to show
a four on cue). Now the scene plays identically every take, so you can verify the choreography. The
real world's sun and dice are for *release*, not rehearsal.

# Examples

## Example 1 — Basic: inject the clock

```python
def is_overdue(due, now):
    return now > due

def test_is_overdue():
    assert is_overdue(datetime(2026, 1, 1), now=datetime(2026, 1, 2)) is True
```

**Why this works:** passing `now` makes the result independent of when the test runs — no midnight or
time-zone flakiness.

## Example 2 — Real-world: seed a library's randomness

```python
from sklearn.model_selection import train_test_split

def test_split_is_reproducible():
    X = list(range(10))
    a1, b1 = train_test_split(X, test_size=0.3, random_state=0)
    a2, b2 = train_test_split(X, test_size=0.3, random_state=0)
    assert a1 == a2 and b1 == b2          # same seed → identical split
```

**Why this works:** `random_state=0` fixes the shuffle, so the split is reproducible and the test is
stable.

## Example 3 — Pitfall: patching time at the wrong place

```python
# app/report.py:  from datetime import datetime  →  datetime.now() used here
@patch("datetime.datetime")                 # patches the stdlib, not app.report's usage — fragile/ineffective
def test_bad(mock_dt): ...
```

**Why this bites:** patching the global `datetime` is both fragile (it's a C type) and usually the wrong
lookup site. Prefer **injecting** `now`, or use `freeze_time`, or patch the name **as used in
`app.report`** (Lesson 12). Reaching for the wrong target leaves the real clock running.

# Common Mistakes

- **Calling `datetime.now()` / `random()` deep inside logic** — inject them instead.
- **Real `time.sleep`** in tests for backoff/timeouts — inject/record the sleep, or fake the clock.
- **Seeding the global RNG and leaking it** across tests — prefer an injected seeded instance.
- **Patching time at the wrong site** — patch where it's looked up, or better, inject.

# Best Practices

- **Inject** the clock and the RNG; the test supplies fixed values.
- Use **`freeze_time`** or a **lookup-site patch** when you can't inject.
- Make backoff/timeout tests **instant** by recording or faking waits — never sleep for real.
- Use **timezone-aware** datetimes and test **boundaries** (midnight, DST, month-end).

# Summary

- Tame time by **injecting** `now`, or **freezing** it (freezegun / lookup-site patch).
- Tame randomness by **injecting a seeded RNG** or using library **seed knobs**.
- Test timeouts/retries by **recording or faking** waits — never real sleeps.
- A seeded test pins one draw; proving behavior for *all* inputs is property-based testing (next).

# Flash Cards

Q: What's the cleanest way to make code that reads the clock testable?
A: Inject the time — pass `now` (or a clock callable) into the function so the test supplies a fixed value, instead of calling datetime.now() internally.

Q: When injection isn't practical, how else can you fix the time in a test?
A: Freeze it with a library like freezegun (`@freeze_time(...)`), or patch the `now` reference at the site where the module under test looks it up.

Q: How do you make randomness reproducible in a test?
A: Inject a seeded random source (e.g., random.Random(0)) or use the library's seed knob (scikit-learn random_state, NumPy default_rng), so draws are deterministic.

Q: Does a passing seeded test prove the code is correct for all random inputs?
A: No — it only pins that one seed's draw; verifying behavior across many inputs is what property-based testing is for.

Q: How should you test exponential backoff without slowing the suite?
A: Inject the sleep function (or fake the clock) and assert the requested wait durations, so the schedule is verified instantly instead of actually waiting.

Q: Why prefer injecting `now` over patching `datetime`?
A: Patching the stdlib datetime is fragile and often the wrong lookup site; injection makes the dependency explicit and the test unambiguous.

# Exercises

### Easy
Refactor a `greeting()` that calls `datetime.now()` internally so it accepts `now` as a parameter, then
write deterministic tests for morning and afternoon.

### Medium
Write a `shuffle_deck(cards, rng)` that takes an injected RNG, and test that two calls with
`random.Random(0)` produce identical orders while the deck still contains all cards.

### Challenging
Write a `retry_with_backoff(action, sleep)` and a test that injects a `sleep` which records durations.
Assert the backoff schedule (e.g., 1, 2, 4 seconds) is correct without the test actually sleeping, and
explain why real sleeps would make it slow and flaky.

# Further Reading

- freezegun — *freezing time in tests*: <https://github.com/spulec/freezegun>
- Python — *random* (seeding, `Random`): <https://docs.python.org/3/library/random.html>
- Python — *unittest.mock* `patch` (where to patch time): <https://docs.python.org/3/library/unittest.mock.html#where-to-patch>
- NumPy — *random generator* (`default_rng`, seeds): <https://numpy.org/doc/stable/reference/random/generator.html>
