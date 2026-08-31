---
id: lesson-13
slug: test-driven-development
title: "Test-Driven Development"
level: intermediate
order: 13
duration: 20
tags:
  - tdd
  - red-green-refactor
  - kent-beck
  - design
  - incremental
summary: "Writing the test first — the red-green-refactor cycle of test-driven development, how it drives design in small steps, a worked example of building a function test-first, and an honest account of what TDD does and doesn't give you."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Run the **red → green → refactor** cycle of TDD.
- Explain how writing tests **first** shapes design and keeps steps small.
- Apply techniques like **fake-it** and **triangulation** to grow code.
- State honestly what TDD **does not** guarantee.

# Why It Matters

Most people write code first and tests later (if at all). **Test-driven development (TDD)**, introduced
by Kent Beck in *Test-Driven Development: By Example*, flips that: you write a small failing test, make
it pass with the simplest code, then clean up — repeatedly. The payoff isn't just tests; it's a tight
feedback loop that keeps you focused on one behavior at a time, guarantees every line is covered by a
test that *once failed*, and gives you a safety net for fearless refactoring. It's a discipline worth
practicing even if you don't adopt it everywhere.

# Concept Explanation

### The cycle: red, green, refactor

```text
   ┌─────────────────────────────────────────────┐
   │  RED     write a small failing test          │
   │            (it fails — the feature isn't done)│
   │  GREEN   write the simplest code to pass it   │
   │            (make it work, however crudely)    │
   │  REFACTOR clean up code AND tests             │
   │            (improve design, tests stay green) │
   └───────────────── repeat ─────────────────────┘
```

- **Red** — write a test for the next tiny bit of behavior and watch it fail. A failing test proves the
  test actually checks something (a test that passes before you write code is suspect).
- **Green** — do the *simplest* thing that makes it pass, even if it's ugly or hard-coded. Speed to
  green matters more than elegance here.
- **Refactor** — with the safety of a passing test, improve the design (remove duplication, rename,
  extract) — the tests must stay green.

Robert C. Martin summarized the discipline as **three laws**: write no production code until you have a
failing test; write only enough of a test to fail; write only enough production code to pass. The point
is *small steps*.

### Techniques for growing code

- **Fake it till you make it** — return a hard-coded constant to get green, then generalize as later
  tests force it.
- **Triangulation** — add a *second* example that the constant can't satisfy, forcing you to write the
  real logic.
- **Obvious implementation** — when the code is trivial, just write it; don't fake it artificially.

### What TDD gives you

- Every behavior has a test that **once failed**, so you know it's meaningful.
- Code is written in **small, verified steps**, reducing debugging.
- A **regression net** that makes refactoring safe.
- Pressure toward **testable design** (small units, clear seams).

### What TDD does *not* give you

TDD is a **design and feedback** practice, not a correctness proof. It does **not** guarantee good
architecture (you can TDD your way into a mess), does **not** replace integration, end-to-end, or
exploratory testing, and does **not** remove the need to think about edge cases — you still choose the
tests. It's a discipline, not magic.

# Key Terminology

- **TDD** — writing a failing test before the code that makes it pass.
- **Red / Green / Refactor** — fail, make-pass, clean-up; the core loop.
- **Three laws of TDD** — small-step rules: no code without a failing test, minimal test, minimal code.
- **Fake it** — hard-code a result to reach green, then generalize.
- **Triangulation** — add another case to force real (general) logic.
- **Regression net** — the accumulated tests that catch future breakage.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| When to write tests | After the code | Before (TDD) | TDD for tight feedback and guaranteed-meaningful tests; test-after is fine when design is clear. |
| First green | Real implementation | Fake it (constant) | Fake it when the real logic isn't obvious yet; triangulate to generalize. |
| Step size | Big leaps | Small steps | Small steps localize mistakes and keep the loop fast. |
| Scope of TDD | Everything | Core logic | TDD shines for logic with clear inputs/outputs; pair with other test levels for the rest. |

# Worked Example

Building `fizzbuzz(n)` test-first, one step at a time:

```python
# RED 1: the simplest case.
def test_returns_the_number_as_text():
    assert fizzbuzz(1) == "1"
```

```python
# GREEN 1: fake it — the simplest thing that passes.
def fizzbuzz(n):
    return "1"
```

```python
# RED 2: triangulate — a second case the constant can't satisfy.
def test_returns_two_as_text():
    assert fizzbuzz(2) == "2"
# forces GREEN 2:
def fizzbuzz(n):
    return str(n)
```

```python
# RED 3: multiples of three.
def test_three_is_fizz():
    assert fizzbuzz(3) == "Fizz"
# GREEN 3:
def fizzbuzz(n):
    if n % 3 == 0:
        return "Fizz"
    return str(n)
```

Continue: add a test for `5 → "Buzz"`, then `15 → "FizzBuzz"`, each time watching it go red, writing
the least code to pass, and refactoring the conditionals once they're covered. The function emerges,
fully tested, in small verified steps.

# Real World Analogy

TDD is like **climbing with belay protection you place as you go**. Before each move up (new code), you
clip in a piece of protection (a failing test) so that if you slip, you fall only to the last clip, not
the ground. **Red** is placing the clip; **green** is making the move; **refactor** is tidying your
stance now that you're safely anchored. You climb faster *because* you're protected — but the gear
doesn't choose your route or guarantee you summit gracefully. That's still on you.

# Examples

## Example 1 — Basic: one red-green step

```python
# RED
def test_slugify_lowercases():
    assert slugify("Hi") == "hi"

# GREEN (simplest)
def slugify(text):
    return text.lower()
```

**Why this works:** the test failed first (no `slugify` existed), then the minimal implementation makes
it pass — proving the test is meaningful.

## Example 2 — Real-world: triangulation forces real logic

```python
def test_area_of_unit_square():   # RED → GREEN by returning 1
    assert area(1) == 1

def test_area_of_side_three():    # RED again → forces real formula
    assert area(3) == 9
# now area(s) must be s * s, not a constant
```

**Why this works:** the second example makes a hard-coded `return 1` impossible, driving out the actual
formula — that's triangulation.

## Example 3 — Pitfall: a test that never went red

```python
def add(a, b):        # written FIRST
    return a + b

def test_add():       # written after; passes immediately
    assert add(2, 2) == 4
```

**Why this bites:** because the code already existed, the test passed on its first run — you never saw
it fail, so you can't be sure it would *catch* a bug (a broken assertion could pass too). TDD's "watch
it fail first" step is what proves a test has teeth. (Test-after is fine — but deliberately break the
code once to confirm the test fails.)

# Common Mistakes

- **Skipping red** — never seeing the test fail, so you don't know it can catch anything.
- **Writing too much at once** — big steps reintroduce the debugging TDD was meant to avoid.
- **Never refactoring** — leaving the crude "green" code, so design rots even though tests pass.
- **Believing TDD guarantees correctness or good design** — you still choose the tests and shape the
  architecture.

# Best Practices

- Always watch a new test **fail first**, then write the **simplest** code to pass it.
- Take **small steps**; use **fake-it** and **triangulation** when the logic isn't obvious.
- **Refactor** on green — improve names, remove duplication, keep tests passing.
- Combine TDD with other levels (integration, E2E) and deliberate **edge-case** thinking.

# Summary

- TDD is the **red → green → refactor** loop: failing test, simplest pass, then clean up.
- Writing tests first keeps steps **small** and guarantees each test **once failed**.
- **Fake it** and **triangulate** to grow code from examples.
- TDD aids **design and feedback** but does **not** guarantee correctness, architecture, or replace
  other testing.

# Flash Cards

Q: What are the three phases of the TDD cycle?
A: Red (write a small failing test), Green (write the simplest code to make it pass), Refactor (clean up code and tests while they stay green).

Q: Why must you see the test fail (go red) first?
A: A failing test proves the test actually checks the new behavior; a test that passes before the code exists might not catch anything.

Q: What is triangulation in TDD?
A: Adding a second example that a hard-coded answer can't satisfy, forcing you to write the real, general implementation.

Q: What does "fake it till you make it" mean in TDD?
A: Return a hard-coded value to reach green quickly, then generalize the code as further tests (triangulation) demand it.

Q: Does TDD guarantee good architecture or correct code?
A: No — it's a design-and-feedback discipline. You still choose the tests and shape the design, and you still need integration, E2E, and edge-case testing.

Q: What are the three laws of TDD (Robert C. Martin)?
A: Write no production code until a test fails; write only enough of a test to fail; write only enough production code to pass — all to enforce small steps.

# Exercises

### Easy
TDD a `double(n)` function: write a failing test for `double(2) == 4`, make it pass with the simplest
code, then add `double(0) == 0` and confirm it still passes.

### Medium
Build `fizzbuzz(n)` test-first through the 3, 5, and 15 cases, committing to the red-green-refactor
rhythm. Note where you faked it and where triangulation forced real logic.

### Challenging
Take a small function you already wrote (code-first). Rebuild it with TDD from scratch, and compare:
did the test-first version end up with different (smaller, clearer) units? Reflect on what the "watch
it fail" step added.

# Further Reading

- Kent Beck — *Test-Driven Development: By Example* (the original text).
- Martin Fowler — *TestDrivenDevelopment* (bliki): <https://martinfowler.com/bliki/TestDrivenDevelopment.html>
- Robert C. Martin — *The Three Laws of TDD*: <http://blog.cleancoder.com/uncle-bob/2014/12/17/TheCyclesOfTDD.html>
- pytest — *Get Started* (to practice the cycle): <https://docs.pytest.org/en/stable/getting-started.html>
