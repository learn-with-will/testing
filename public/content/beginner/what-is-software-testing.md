---
id: lesson-01
slug: what-is-software-testing
title: "What Is Software Testing?"
level: beginner
order: 1
duration: 15
tags:
  - foundations
  - verification
  - validation
  - bugs
  - why-test
summary: "What software testing actually is — running code to check it behaves as intended — why it matters, the difference between verification and validation, what a test can and cannot prove, and the vocabulary (bug, defect, failure, regression) the rest of the course builds on."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain **software testing** in plain language and what a test checks.
- Say why testing matters and where the **cost of a bug** comes from.
- Tell apart **verification** ("did we build it right?") and **validation** ("did we build the right thing?").
- State honestly what tests **can** and **cannot** prove.
- Use the core vocabulary: **bug/defect**, **failure**, **test case**, and **regression**.

# Why It Matters

Software runs the things we depend on — payments, messages, brakes, medical devices. But code is
written by humans, and humans make mistakes. **Testing** is how we find those mistakes *before* the
people relying on the software do. A bug caught by a test on your laptop costs a minute; the same bug
caught in production can cost money, trust, or safety. Before you learn any tool or technique, it
helps to see the whole idea: what a test is, what it buys you, and where its honest limits are.
Everything else in this course builds on this map.

# Concept Explanation

### What testing is

**Software testing** is the practice of running (or examining) a program to check whether it behaves
the way it is supposed to. The simplest test states an expectation — "for this input, I expect this
output" — runs the code, and compares reality to the expectation. If they match, the test **passes**;
if not, it **fails** and points you at a problem.

A test does not need to be fancy. Printing a value and eyeing it is a (weak) manual test. The rest of
this course is about writing tests that are **automated** (a machine runs them), **repeatable** (same
result every run), and **specific** (a failure tells you what broke).

### Verification vs validation

Two questions hide inside "is the software good?":

- **Verification** — *did we build the product right?* Does the code meet its specification and behave
  as designed? Unit and integration tests mostly answer this.
- **Validation** — *did we build the right product?* Does it actually solve the user's real problem?
  End-to-end tests, user feedback, and acceptance testing lean here.

You can pass every verification check and still fail validation (a perfectly built feature nobody
needs). Both matter.

### What a test can and cannot prove

The most important honesty in this whole course:

> "Program testing can be used to show the presence of bugs, but never to show their absence."
> — Edsger W. Dijkstra

A passing test tells you the code worked **for the cases you tried**. It does **not** prove the code
is correct for every possible input. Testing **raises confidence**; it does not deliver proof. Good
testers aim their limited tests at the inputs most likely to reveal bugs.

### The vocabulary

- A **bug** (or **defect**, or **fault**) is a flaw in the code.
- A **failure** is the observable wrong behavior the defect causes when the code runs.
- A **test case** is one specific check: inputs, the action, and the expected result.
- A **regression** is a bug that reappears (or a feature that breaks) after a change that used to
  work — the thing automated tests are especially good at catching.

# Key Terminology

- **Software testing** — running or examining code to check it behaves as intended.
- **Verification / validation** — "built it right" vs "built the right thing".
- **Bug / defect / fault** — a flaw in the code.
- **Failure** — the wrong behavior a defect produces at run time.
- **Test case** — one check: input, action, expected result.
- **Pass / fail** — expectation matched, or did not.
- **Regression** — previously-working behavior that breaks after a change.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| How to test | Manual (click and eyeball) | Automated (code runs the checks) | Automate anything you'll repeat; manual is fine for one-off exploratory checks. |
| When to test | After the code is "done" | Continuously, alongside coding | Earlier finds bugs cheaper; late testing lets defects pile up. |
| What to trust | "It ran without errors" | "It produced the expected result" | No error is not the same as correct — always assert the expected outcome. |

# Worked Example

Imagine a function that adds a discount to a price. What would a test say?

```text
Function under test: apply_discount(price, percent)
Test case:           price = 100, percent = 20
Expected result:     80
Run the function →   it returns 80  → PASS
Change percent = 0 → expected 100 → returns 100 → PASS
Change price = -5  → expected error? → returns -6 → FAIL (a bug: negative price allowed)
```

Notice the last case: the code "ran fine" but produced nonsense. A test that only checks "it didn't
crash" would have missed it. A good test checks the **expected value**, and probing an odd input
(a negative price) revealed a real defect.

# Real World Analogy

Testing is like **checks on a production line**. A factory doesn't ship every car and wait for
customers to report failures. It weighs parts, torques bolts to spec, and drives samples on a track —
catching faults where they're cheap to fix. A passing inspection doesn't *prove* the car will never
break; it means the car cleared the specific checks the line trusts. Tests are those checks for your
code, and — like the factory — you invest most in the checks that catch the costliest problems.

# Examples

## Example 1 — Basic: a check with an expectation

The heart of every test is comparing a result to an expectation.

```python
def add(a, b):
    return a + b

# The simplest possible test: state the expectation and assert it.
assert add(2, 3) == 5
```

**Why this works:** the test names a concrete case (`2 + 3`) and asserts the exact expected result
(`5`). If `add` ever returns something else, the assertion fails loudly.

## Example 2 — Real-world: catching a regression

A team ships a working `format_name` function. Months later, someone "optimizes" it and accidentally
drops the space between first and last name. Because a test pinned the expected output, the change is
caught immediately instead of by users.

```python
def format_name(first, last):
    return f"{first} {last}"

assert format_name("Ada", "Lovelace") == "Ada Lovelace"  # guards against regressions
```

**Why this works:** the test encodes the intended behavior once, then defends it forever against
future edits.

## Example 3 — Pitfall: "it ran, so it works"

```python
def average(numbers):
    return sum(numbers) / len(numbers)

average([2, 4, 6])   # runs fine, returns 4.0 — looks good
average([])          # crashes: ZeroDivisionError
```

**Why this bites:** the function *ran* on the first input, which feels like success — but an empty
list (a perfectly ordinary case) crashes it. "No error on my one example" is not the same as
"correct". Tests must probe the awkward inputs, not just the happy path.

# Common Mistakes

- **Confusing "no error" with "correct".** Code can run and still be wrong; always assert the result.
- **Only testing the happy path.** The interesting bugs hide in empty inputs, zeros, and edge cases.
- **Believing a passing suite proves correctness.** It shows the tested cases work — nothing more.
- **Testing manually forever.** Anything you check by hand repeatedly should become an automated test.

# Best Practices

- Write down the **expected result** for each case, not just the input.
- Test the **edges** (empty, zero, negative, very large) as well as the typical case.
- Automate checks you'll repeat, so a machine — not your memory — guards the behavior.
- Treat every fixed bug as a chance to add a **regression test** so it can't come back silently.

# Summary

- **Testing** runs or examines code to check it behaves as intended, comparing results to
  expectations.
- **Verification** asks "did we build it right?"; **validation** asks "did we build the right thing?".
- Tests **show the presence of bugs, never their absence** — they raise confidence, not proof.
- Learn the words: **bug/defect**, **failure**, **test case**, **regression**.
- "It ran" ≠ "it's correct" — always assert the expected outcome, especially on edge cases.

# Flash Cards

Q: In one sentence, what is software testing?
A: Running or examining a program to check whether it behaves the way it is supposed to, by comparing actual results against stated expectations.

Q: What is the difference between verification and validation?
A: Verification asks "did we build the product right?" (meets its spec); validation asks "did we build the right product?" (solves the user's real problem).

Q: What can a passing test prove, and what can it not?
A: It shows the code worked for the cases tried; it cannot prove the code is correct for all inputs — testing shows the presence of bugs, never their absence.

Q: What is the difference between a defect and a failure?
A: A defect (bug) is the flaw in the code; a failure is the observable wrong behavior that defect causes when the code runs.

Q: What is a regression?
A: Previously-working behavior that breaks (or a bug that reappears) after a later change — exactly what automated tests are good at catching.

Q: Why is "the code ran without errors" not enough?
A: Running without crashing does not mean the output is correct; a test must assert the expected result, and probe edge cases where bugs hide.

# Exercises

### Easy
Pick any small function you've written or can imagine (say, "convert Celsius to Fahrenheit"). Write
down three test cases as `input → expected output`, including at least one edge case.

### Medium
Take the `average([])` pitfall above. Describe in words what behavior you'd *want* for an empty list
(raise an error? return `None`? return `0`?), then write the expectation as a one-line assertion for
your chosen behavior.

### Challenging
Find a claim like "our tests pass, so the release is safe." Explain what that claim is really saying,
what it is *not* saying, and name two specific kinds of bug a green test suite could still miss.

# Further Reading

- pytest — *Get Started*: <https://docs.pytest.org/en/stable/getting-started.html>
- Martin Fowler — *UnitTest*: <https://martinfowler.com/bliki/UnitTest.html>
- Martin Fowler — *The Practical Test Pyramid* (intro sections): <https://martinfowler.com/articles/practical-test-pyramid.html>
- *Software Engineering at Google* — *Testing Overview*: <https://abseil.io/resources/swe-book/html/ch11.html>
