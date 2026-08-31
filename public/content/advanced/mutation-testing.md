---
id: lesson-21
slug: mutation-testing
title: "Mutation Testing"
level: advanced
order: 21
duration: 18
tags:
  - mutation-testing
  - mutants
  - mutation-score
  - test-quality
  - mutmut
summary: "Measuring how good your tests actually are by deliberately introducing small bugs (mutants) into the code and checking whether the tests catch them — a stronger signal than coverage, with honest caveats about equivalent mutants and cost."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain **mutation testing** and the **mutation score**.
- Say why it's a **stronger** signal of test quality than coverage.
- Interpret **killed** vs **surviving** mutants and **equivalent mutants**.
- Judge when mutation testing is worth its **cost**.

# Why It Matters

Coverage tells you which code *ran*; it can't tell you whether your tests would **notice a bug**. That's
the gap **mutation testing** fills. It answers the question you actually care about — "if the code were
subtly wrong, would my tests fail?" — by making the code subtly wrong on purpose and watching. A test
suite with 100% coverage can still let mutants survive, revealing missing or weak assertions. It's the
most direct measure of test *effectiveness* we have, and understanding it sharpens how you write
assertions everywhere.

# Concept Explanation

### The idea: break the code and see if tests scream

A mutation-testing tool creates many **mutants** — copies of your code with one small change each — and
runs your test suite against each:

- Change `>` to `>=`, `+` to `-`, `and` to `or`.
- Replace a constant (`0` → `1`), a return value, or a boolean.
- Delete a statement.

For each mutant, either:

- **Killed** — at least one test **fails**. Good: your tests noticed the bug.
- **Survived** — all tests still **pass** despite the bug. Bad: a gap in your tests.

The **mutation score** = killed ÷ (total non-equivalent mutants). Higher means your tests catch more
injected faults.

### Why it beats coverage

Coverage rewards *executing* a line; mutation testing rewards *checking* it. Consider a line that runs
under 100% coverage but whose result is never asserted — mutate it, and the suite still passes: a
**survivor** that coverage happily ignored. Every surviving mutant is a concrete, actionable "you have
code whose behavior no test pins down" — often a **missing assertion** or an **untested case**.

### Reading survivors

A surviving mutant is a lead: look at *what* was changed and *why nothing failed*. Usually it's one of:

- No assertion touches that result (add one).
- The tested inputs don't distinguish the mutant (add a case that does — e.g., a boundary that
  separates `>` from `>=`).

### Equivalent mutants: the catch

Some mutants **can't be killed** because they don't actually change behavior — e.g., changing `x < 10`
to `x <= 10` where `x == 10` is impossible, or reordering independent operations. These are **equivalent
mutants**: they survive, but not because your tests are weak. Detecting equivalence is undecidable in
general, so you must **judge** survivors and discount the equivalent ones. This makes 100% mutation
score usually impractical.

### Cost

Mutation testing is **slow**: it reruns (a subset of) your suite once per mutant, so it can be orders of
magnitude slower than a normal run. Tools mitigate this (run only tests covering the mutated line, cache,
sample mutants, parallelize). In Python, **mutmut** and **cosmic-ray** are common. Use it where it pays:
**critical or intricate logic**, or periodically in CI on changed files — not on every commit across the
whole codebase.

# Key Terminology

- **Mutation testing** — injecting small code changes to see if tests catch them.
- **Mutant** — one version of the code with a single small change.
- **Killed / survived** — a test failed (caught it) / all passed (missed it).
- **Mutation score** — killed ÷ non-equivalent mutants.
- **Equivalent mutant** — a change that doesn't alter behavior, so it can't be killed.
- **mutmut / cosmic-ray** — Python mutation-testing tools.

# Options and Trade-offs

| Question | Coverage | Mutation testing |
| -------- | -------- | ---------------- |
| Measures | Which code ran | Whether tests catch injected bugs |
| Assertion quality | Ignored | Directly exercised |
| Speed | Fast | Slow (many reruns) |
| False signal | High % feels safe | Equivalent mutants inflate survivors |
| Use it | Everywhere, always | Critical code / periodically |

# Worked Example

Coverage says 100%; a mutant reveals a missing assertion:

```python
def apply_discount(price, pct):
    return price * (1 - pct / 100)

def test_apply_discount_runs():
    apply_discount(100, 20)          # 100% line coverage — but asserts NOTHING
```

Mutation testing changes `-` to `+` (making the function *add* the percentage). The suite **still
passes** → the mutant **survives**, flagging the un-asserted result. Fix by asserting the behavior, with
a case that distinguishes right from wrong:

```python
def test_apply_discount_subtracts_percentage():
    assert apply_discount(100, 20) == 80     # now the `+` mutant fails → killed
    assert apply_discount(50, 0) == 50
```

Coverage was blind to this; the surviving mutant pointed straight at the weakness.

# Real World Analogy

Mutation testing is a **fire drill for your smoke detectors**. Coverage just confirms a detector is
mounted in every room (the line "ran"). A fire drill releases a little test smoke in each room and checks
that an alarm actually **goes off** — a detector that stays silent (a *survivor*) is one you need to fix,
even though it was installed and "covered". And a "detector" in a sealed room that can never see smoke is
an **equivalent mutant**: silent, but not a real failing — you note it and move on.

# Examples

## Example 1 — Basic: a killed mutant

```python
def is_adult(age):
    return age >= 18

def test_is_adult_boundary():
    assert is_adult(18) is True
    assert is_adult(17) is False
```

**Why this works:** a mutant changing `>=` to `>` makes `is_adult(18)` return `False`; the boundary
test fails → the mutant is **killed**, confirming the tests pin that boundary.

## Example 2 — Real-world: survivor drives a new test

A run reports a surviving mutant: `total > 0` mutated to `total >= 0`, and no test uses `total == 0`.
You add `assert allow_purchase(total=0) is False`, which distinguishes the two → the mutant is now
killed and a real edge (zero total) is covered.

**Why this works:** the survivor named a specific missing case; adding the distinguishing input both
kills the mutant and improves the suite.

## Example 3 — Pitfall: chasing 100% mutation score

A team demands a perfect mutation score and burns days trying to kill a mutant that changes `x < len(xs)`
to `x <= len(xs)` in a loop that can never reach `x == len(xs)`.

**Why this bites:** that's an **equivalent mutant** — behavior is unchanged, so it's unkillable. Time
spent forcing it to 100% is wasted; the right move is to mark it equivalent and focus on *meaningful*
survivors. Mutation score is a guide, not a number to max out.

# Common Mistakes

- **Confusing coverage with test strength** — mutation testing exists precisely because they differ.
- **Ignoring survivors** — each is an actionable gap (usually a missing assertion or case).
- **Chasing 100% score** — equivalent mutants make that impractical; judge survivors.
- **Running it on everything, every commit** — too slow; target critical code or changed files.

# Best Practices

- Use mutation testing to **audit assertion quality**, especially on **critical logic**.
- Treat each **survivor** as a prompt: add the assertion or the distinguishing input case.
- **Discount equivalent mutants** rather than forcing a perfect score.
- Manage cost: run on **changed files**, only tests covering the mutant, in parallel, periodically.

# Summary

- **Mutation testing** injects small bugs (**mutants**) and checks whether tests **kill** them.
- The **mutation score** (killed ÷ non-equivalent) measures test *effectiveness*, unlike coverage.
- **Surviving** mutants reveal missing/weak assertions; **equivalent** mutants can't be killed.
- It's **powerful but slow** — target critical code and don't chase a perfect score.

# Flash Cards

Q: What does mutation testing measure that coverage cannot?
A: Whether your tests would actually catch a bug — it injects small code changes (mutants) and checks if any test fails, exercising assertion quality rather than mere execution.

Q: What are 'killed' and 'surviving' mutants?
A: A killed mutant makes at least one test fail (the tests caught the injected bug); a surviving mutant leaves all tests passing (a gap — usually a missing or weak assertion).

Q: What is the mutation score?
A: The fraction of non-equivalent mutants that your tests kill (killed ÷ total non-equivalent) — higher means your tests catch more injected faults.

Q: What is an equivalent mutant?
A: A code change that doesn't alter observable behavior, so no test can kill it; equivalents make a 100% mutation score generally impractical and must be judged out.

Q: Why is mutation testing usually run only on critical code or periodically?
A: It's slow — it reruns the suite (or a subset) once per mutant — so it's targeted at important logic or changed files rather than the whole codebase on every commit.

Q: A mutant changing `-` to `+` survives with 100% coverage. What does that tell you?
A: Your tests execute the line but don't assert its result meaningfully — add an assertion (and a distinguishing case) so the wrong behavior would fail.

# Exercises

### Easy
Explain, in your own words, why a test that calls a function but asserts nothing would let almost every
mutant survive, even at 100% coverage.

### Medium
Write `is_adult(age)` with a boundary test at 17/18, then describe two mutants (e.g., `>=`→`>`, `18`→`17`)
and whether your test kills each.

### Challenging
Take a small function, run a mutation tool (e.g., mutmut) if available or reason by hand, list any
survivors, and for each decide: missing assertion, missing case, or equivalent mutant. Add tests to kill
the real gaps and justify skipping the equivalents.

# Further Reading

- mutmut — *Python mutation testing*: <https://mutmut.readthedocs.io/>
- cosmic-ray — *mutation testing for Python*: <https://cosmic-ray.readthedocs.io/>
- Wikipedia — *Mutation testing* (concepts, equivalent mutants): <https://en.wikipedia.org/wiki/Mutation_testing>
- Martin Fowler — *TestCoverage* (why coverage isn't test quality): <https://martinfowler.com/bliki/TestCoverage.html>
