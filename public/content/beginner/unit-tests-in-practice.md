---
id: lesson-06
slug: unit-tests-in-practice
title: "Unit Tests in Practice"
level: beginner
order: 6
duration: 18
tags:
  - unit-tests
  - pure-functions
  - isolation
  - solitary-sociable
  - edge-cases
summary: "What actually makes a test a unit test — small scope, isolation, speed, and determinism — why pure functions are the easiest things to test, the difference between solitary and sociable unit tests, and how to hunt down edge cases."
---

# Learning Objectives

By the end of this lesson you will be able to:

- State the properties of a good **unit test**: small, isolated, fast, deterministic.
- Explain why **pure functions** are the easiest code to test.
- Distinguish **solitary** vs **sociable** unit tests (Fowler).
- Systematically find **edge cases** worth testing.

# Why It Matters

Unit tests are the wide base of the pyramid — the tests you'll write most. Written well, they run in
milliseconds, fail precisely, and give you the confidence to change code fearlessly. Written badly —
slow, order-dependent, reaching out to the network — they become the flaky, ignored suite everyone
dreads. The difference is a few habits about **scope**, **isolation**, and **determinism**, plus a
knack for spotting the inputs where bugs hide.

# Concept Explanation

### What makes a test a "unit" test

Regardless of exact definition, unit tests share properties:

- **Small scope** — they exercise one function, method, or class.
- **Isolated** — a failure points at that unit, not a tangle of collaborators.
- **Fast** — milliseconds, so you can run thousands on every save.
- **Deterministic** — same result every run; no dependence on time, randomness, network, or order.

If a test talks to a real database, sleeps, or fails intermittently, it may be useful, but it's not a
*unit* test — it's higher up the pyramid.

### Pure functions are a gift

A **pure function** returns the same output for the same inputs and has **no side effects** (it doesn't
mutate global state, write files, or call the network). Pure functions are trivially testable: give
inputs, assert the output — no setup, no cleanup, no doubles.

```python
def total_price(items, tax_rate):
    subtotal = sum(item.price for item in items)
    return round(subtotal * (1 + tax_rate), 2)   # pure: output depends only on inputs
```

A big part of testable design is **pushing logic into pure functions** and keeping the messy,
side-effecting parts (I/O, time, randomness) thin and at the edges.

### Solitary vs sociable

When the unit under test uses collaborators, you have a choice (Fowler's terms):

- **Sociable** unit test — let the unit use its **real** collaborators (as long as they're fast and
  deterministic). Simple, and tests real behavior.
- **Solitary** unit test — replace collaborators with **test doubles** (stubs/mocks — later lessons)
  so only the unit's own logic is exercised.

Neither is "the" right way. Prefer sociable when collaborators are cheap and pure; reach for solitary
(doubles) when a collaborator is slow, non-deterministic, or has side effects you can't allow in a
test.

### Finding edge cases

Bugs cluster at boundaries. For each input, ask:

- **Empty / none**: empty string, empty list, `None`, zero.
- **One vs many**: a single element vs several.
- **Boundaries**: min, max, just-below, just-above (off-by-one lives here).
- **Invalid**: negative where positive is expected, wrong type, malformed input.
- **Special values**: duplicates, unicode, very large numbers, `NaN`.

# Key Terminology

- **Unit test** — a small, isolated, fast, deterministic test of one piece of code.
- **Pure function** — same inputs → same output, no side effects; the easiest thing to test.
- **Side effect** — anything a function does beyond returning a value (I/O, mutation, network).
- **Solitary test** — collaborators replaced by doubles.
- **Sociable test** — collaborators are the real thing.
- **Edge case** — an input at a boundary or extreme where bugs cluster.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| Collaborators | Real (sociable) | Doubles (solitary) | Real when fast/pure; doubles when slow, non-deterministic, or side-effecting. |
| Where logic lives | Mixed with I/O | Extracted into pure functions | Extract — pure logic is far easier to test and reason about. |
| Cases to test | Happy path only | Happy path + edges | Always add edges; that's where the bugs are. |

# Worked Example

Making side-effecting code testable by extracting a pure core:

```python
# Hard to unit-test: logic tangled with I/O.
def report_overdue(today, db):
    rows = db.query("SELECT * FROM loans")           # side effect (network/DB)
    return [r for r in rows if r.due < today]

# Better: a pure function does the logic; the thin caller does the I/O.
def overdue_loans(loans, today):                     # pure
    return [loan for loan in loans if loan.due < today]

def test_overdue_excludes_loans_due_today():
    loans = [Loan(due=date(2026, 8, 31)), Loan(due=date(2026, 8, 30))]
    result = overdue_loans(loans, today=date(2026, 8, 31))
    assert result == [Loan(due=date(2026, 8, 30))]   # boundary: due == today is NOT overdue
```

The pure `overdue_loans` is tested with plain data — no database, no doubles — and the awkward
boundary (a loan due *today*) is pinned explicitly.

# Real World Analogy

A unit test is like **bench-testing a single component** on an isolated rig — a car's brake sensor
wired to a meter, not bolted into a moving vehicle. You control every input and read the output
directly, so if it misbehaves you know it's the sensor. A **pure function** is a component with no
hidden wires — no battery of its own, no radio to the outside — so the rig is trivial to build. Testing
it inside the whole car (sociable/E2E) is sometimes necessary, but you don't start there to check a
sensor.

# Examples

## Example 1 — Basic: testing a pure function

```python
def clamp(value, low, high):
    return max(low, min(value, high))

def test_clamp_limits_to_the_range():
    assert clamp(12, 0, 10) == 10
    assert clamp(-4, 0, 10) == 0
    assert clamp(5, 0, 10) == 5
```

**Why this works:** pure logic, so three cases (above, below, inside the range) fully describe the
behavior with zero setup.

## Example 2 — Real-world: sociable unit test with a cheap collaborator

```python
def test_greeter_uses_formatter():
    greeter = Greeter(formatter=TitleCaseFormatter())   # real, fast, deterministic collaborator
    assert greeter.greet("ada") == "Hello, Ada!"
```

**Why this works:** the collaborator is cheap and pure, so using the real thing (sociable) keeps the
test simple and tests real integration between the two.

## Example 3 — Pitfall: a "unit" test that isn't

```python
def test_prices():
    resp = requests.get("https://api.example.com/prices")   # real network call!
    assert resp.json()["usd"] > 0
```

**Why this bites:** it hits the live network, so it's slow, fails when offline or the API changes, and
isn't deterministic — three properties a unit test must not have. The fix (later lessons) is to test
the parsing logic in isolation and double the network.

# Common Mistakes

- **Calling real I/O** (network, database, filesystem) in a "unit" test — that's slow and flaky.
- **Leaving logic tangled with side effects**, so nothing can be tested without heavy setup.
- **Only testing the happy path** and skipping empty/boundary/invalid inputs.
- **Order-dependent tests** that share mutable global state and pass only in a certain sequence.

# Best Practices

- Push decision logic into **pure functions**; keep I/O thin and at the edges.
- Prefer **sociable** tests with real collaborators when they're fast and deterministic; use doubles
  only when needed.
- Deliberately test **edges**: empty, one, many, min, max, invalid, special values.
- Keep every unit test **independent and fast** so the whole suite runs constantly.

# Summary

- Unit tests are **small, isolated, fast, deterministic** — the base of the pyramid.
- **Pure functions** (same inputs → same output, no side effects) are the easiest code to test.
- Choose **sociable** (real collaborators) or **solitary** (doubles) per situation.
- Hunt **edge cases** — empty, boundaries, invalid, special values — where bugs cluster.

# Flash Cards

Q: What four properties should a good unit test have?
A: Small scope (one piece), isolation (precise failures), speed (milliseconds), and determinism (same result every run, no reliance on time/network/order).

Q: What is a pure function and why is it easy to test?
A: One whose output depends only on its inputs with no side effects; you just pass inputs and assert the output — no setup, doubles, or cleanup.

Q: What's the difference between solitary and sociable unit tests?
A: Solitary tests replace collaborators with test doubles; sociable tests use the real collaborators. Prefer sociable when collaborators are fast and deterministic.

Q: Why isn't a test that calls a live API a unit test?
A: It's slow, non-deterministic, and fails when offline or when the API changes — it violates the isolation, speed, and determinism a unit test requires.

Q: Where do bugs tend to cluster, so you should test there?
A: At boundaries and extremes — empty/none, one vs many, min/max and off-by-one, invalid inputs, and special values like duplicates or NaN.

Q: How does extracting a pure function improve testability?
A: It separates decision logic from I/O, so the logic can be tested with plain data and no database, network, or doubles.

# Exercises

### Easy
Write a pure function `is_leap_year(year)` and unit-test it for 2000 (leap), 1900 (not leap), 2024
(leap), and 2023 (not leap).

### Medium
Take a function that mixes logic with I/O (reads a file, then filters rows). Refactor the filtering
into a pure function and unit-test it with in-memory data, including an empty input.

### Challenging
List every edge case you can think of for a `parse_int(text)` function (empty, whitespace, "+5", "-3",
"0x10", "1.5", huge numbers, unicode digits). Decide the intended behavior for each and note which
ones would need a `pytest.raises` test.

# Further Reading

- Martin Fowler — *UnitTest* (solitary vs sociable): <https://martinfowler.com/bliki/UnitTest.html>
- Martin Fowler — *Refactoring* & testability (bliki index): <https://martinfowler.com/tags/testing.html>
- pytest — *How to write and report assertions*: <https://docs.pytest.org/en/stable/how-to/assert.html>
- *Software Engineering at Google* — *Unit Testing*: <https://abseil.io/resources/swe-book/html/ch12.html>
