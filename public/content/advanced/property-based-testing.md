---
id: lesson-20
slug: property-based-testing
title: "Property-Based Testing"
level: advanced
order: 20
duration: 20
tags:
  - property-based
  - hypothesis
  - invariants
  - shrinking
  - generative
summary: "Instead of hand-picking examples, state a property that must hold for all inputs and let Hypothesis generate hundreds of cases to try to break it — finding edge cases you'd never think of, and shrinking any failure to a minimal example."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain how **property-based testing** differs from example-based testing.
- Write a **property** and test it with **Hypothesis** (`@given` + strategies).
- Recognize common property patterns (**round-trip, idempotence, oracle, invariant**).
- Use **shrinking** and understand the honest limits.

# Why It Matters

Example-based tests check the inputs *you thought of* — and bugs love the inputs you didn't. **Property-
based testing** flips the approach: you describe a rule that should hold for **all** inputs, and a tool
generates many varied, often nasty inputs (empty, huge, unicode, negative, weird whitespace) trying to
find a counterexample. It routinely surfaces edge cases humans miss, and when it finds a failure it
**shrinks** it to the smallest reproducing case. It doesn't replace example tests — it complements them,
covering breadth you can't enumerate by hand.

# Concept Explanation

### From examples to properties

An example test says "for **this** input, expect **that** output." A property says "for **any** valid
input, **this relationship** holds." You give up naming exact outputs in exchange for covering a huge
space.

### Hypothesis basics

**Hypothesis** is the standard Python property-testing library. `@given` supplies generated inputs from
**strategies**:

```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sorting_is_idempotent(xs):
    assert sorted(sorted(xs)) == sorted(xs)     # sorting twice == sorting once
```

Hypothesis runs this dozens of times with different lists (empty, single, huge, negatives, duplicates),
trying to falsify the property.

### Common property patterns

- **Round-trip (inverse):** `decode(encode(x)) == x`. Great for serializers, parsers, compressors.
- **Idempotence:** `f(f(x)) == f(x)`. Sorting, normalizing, deduping.
- **Invariant:** something always true of the output — `len(dedupe(xs)) <= len(xs)`; result is sorted;
  a total is never negative.
- **Oracle / cross-check:** compare against a slower-but-obviously-correct implementation, or a library
  you trust — `my_sort(xs) == sorted(xs)`.
- **"Never crashes":** for any input, the function returns or raises a *documented* error — no
  unexpected exceptions.

### Shrinking: minimal counterexamples

When a property fails, Hypothesis **shrinks** the input to the simplest failing case. Instead of a
1,000-element list, it reports something like `[0, 0]` or `""` — the minimal example that still breaks
the property, which is far easier to debug. It also prints a `@reproduce_failure`/falsifying example so
you can pin it:

```python
from hypothesis import given, example, strategies as st

@given(st.text())
@example("")                     # always test this specific case too
def test_slug_is_lowercase(s):
    assert slugify(s) == slugify(s).lower()
```

### Honest limits

- Finding a good **property** is the hard part — some behaviors don't have obvious invariants.
- A property that finds **no** counterexample is **not a proof** — Hypothesis samples inputs; it can
  miss a rare failing case (though it tries hard, and remembers past failures).
- Generated tests can be **slower**; tune with settings, and keep targeted example tests for clarity and
  specific regressions.

# Key Terminology

- **Property-based testing** — asserting a rule holds across many generated inputs.
- **Hypothesis** — the Python property-testing library.
- **Strategy** — a generator of inputs (`st.integers()`, `st.text()`, `st.lists(...)`).
- **`@given`** — decorator that feeds generated inputs to a test.
- **Shrinking** — reducing a failing input to a minimal reproducing case.
- **Oracle** — a trusted reference implementation to compare against.

# Options and Trade-offs

| Aspect | Example-based | Property-based |
| ------ | ------------- | -------------- |
| Inputs | Hand-picked | Generated (many, varied) |
| You specify | Exact outputs | A relationship/invariant |
| Finds unknown edges | Rarely | Often |
| On failure | The one case | Shrunk minimal case |
| Effort | Low per case | Finding the property |
| Best for | Specific behaviors, regressions | Parsers, transforms, invariants |

# Worked Example

A parser and its serializer — the round-trip property finds cases you'd never list:

```python
from hypothesis import given, strategies as st

def to_query(params: dict) -> str: ...      # {"a": "1"} -> "a=1&..."
def from_query(text: str) -> dict: ...      # inverse

@given(st.dictionaries(st.text(min_size=1), st.text()))
def test_query_string_round_trips(params):
    assert from_query(to_query(params)) == params
```

Hypothesis will throw in keys/values with `=`, `&`, spaces, unicode, and empties — quickly exposing, say,
that unescaped `&` in a value breaks the round-trip. It then shrinks to a minimal `{"a": "&"}`-style
case that makes the bug obvious. An example-based test would only have found this if you'd *thought* to
include an `&`.

# Real World Analogy

Example-based testing is a **teacher grading the specific problems on the answer key**. Property-based
testing is a **fuzzing robot** told the *rule* ("the bridge must hold any car under 2 tons") that then
drives thousands of random vehicles across — light, heavy, lopsided, reversing — until one falls
through. When a car does, the robot doesn't hand you the wreck of a 40-truck convoy; it finds the
**single lightest car** that still breaks the bridge, so you can see exactly what's wrong.

# Examples

## Example 1 — Basic: an invariant

```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_dedupe_never_grows_and_keeps_membership(xs):
    result = dedupe(xs)
    assert len(result) <= len(xs)            # invariant: never larger
    assert set(result) == set(xs)            # invariant: same members
```

**Why this works:** you can't list every list, but these invariants must hold for *all* of them, so
Hypothesis probes many and tries to break them.

## Example 2 — Real-world: oracle cross-check

```python
@given(st.lists(st.integers()))
def test_my_sort_matches_builtin(xs):
    assert my_sort(xs) == sorted(xs)         # trusted oracle = Python's sorted
```

**Why this works:** you don't specify outputs — you compare your implementation against a trusted one
across generated inputs, catching any divergence.

## Example 3 — Pitfall: a property that just restates the code

```python
@given(st.integers())
def test_double(n):
    assert double(n) == n * 2                # if double IS `n*2`, this only re-checks the impl
```

**Why this bites:** the "property" duplicates the implementation, so a shared bug (or a copy-paste
error) passes. Prefer independent properties — a *relationship* (`double(n) == n + n`, or `double(n)`
is even, or `double(n)/2 == n`) or an oracle — rather than the exact formula the code uses.

# Common Mistakes

- **Restating the implementation** as the property — a shared mistake passes silently.
- **Treating "no counterexample found" as a proof** — it's sampling, not verification.
- **Over-broad strategies** that generate invalid inputs the code never promised to handle (constrain
  them with `assume`/tailored strategies).
- **Dropping example tests entirely** — keep targeted ones for clarity and specific regressions.

# Best Practices

- State **independent** properties: round-trip, idempotence, invariants, or an **oracle** comparison.
- Let Hypothesis **shrink**; debug the minimal case it reports, and pin it with `@example`.
- **Constrain** strategies to valid inputs; use `assume(...)` to skip inapplicable cases.
- **Combine** property-based and example-based tests — breadth plus specific, readable cases.

# Summary

- **Property-based testing** asserts a rule for **all** inputs; the tool generates many to break it.
- **Hypothesis** uses **strategies** with `@given`, and **shrinks** failures to minimal cases.
- Patterns: **round-trip, idempotence, invariant, oracle, never-crashes**.
- It **complements** example tests and is powerful — but "no counterexample" is **not a proof**.

# Flash Cards

Q: How does property-based testing differ from example-based testing?
A: Instead of hand-picking specific inputs and outputs, you state a rule that must hold for all inputs and let a tool generate many varied inputs to try to falsify it.

Q: What is shrinking in Hypothesis?
A: When a property fails, Hypothesis reduces the failing input to the smallest, simplest case that still breaks it, making the bug much easier to debug.

Q: Name three common property patterns.
A: Round-trip/inverse (decode(encode(x)) == x), idempotence (f(f(x)) == f(x)), and invariants (something always true of the output); also oracle cross-checks and "never crashes".

Q: Is a property test that finds no counterexample a proof of correctness?
A: No — Hypothesis samples inputs, so it can miss a rare failing case; it raises confidence and finds bugs but doesn't verify all inputs.

Q: Why is restating the implementation as your property a mistake?
A: If the property mirrors the code's formula, a shared bug passes; prefer an independent relationship or a trusted oracle so the test can actually catch errors.

Q: What is an oracle in property-based testing?
A: A trusted, obviously-correct reference (e.g., Python's sorted) that you compare your implementation against across generated inputs.

# Exercises

### Easy
Write a Hypothesis test that `sorted(sorted(xs)) == sorted(xs)` for `st.lists(st.integers())`, and run
it. Note how many cases Hypothesis tries.

### Medium
Implement `encode`/`decode` for a tiny format and write a round-trip property with Hypothesis. If it
fails, record the shrunk counterexample it reports and fix the bug.

### Challenging
Take a function you've example-tested and add a property test using an **oracle** (a trusted reference).
Explain a class of inputs the property covers that your examples didn't, and why "no counterexample
found" still isn't a proof.

# Further Reading

- Hypothesis — *documentation* (`@given`, strategies, shrinking): <https://hypothesis.readthedocs.io/>
- Hypothesis — *What you can generate and how* (strategies): <https://hypothesis.readthedocs.io/en/latest/data.html>
- Hypothesis — *Details and advanced features* (`assume`, `@example`): <https://hypothesis.readthedocs.io/en/latest/details.html>
- Fred Hebert — *Property-Based Testing* (concepts, language-agnostic): <https://propertesting.com/>